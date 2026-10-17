import { createHash, randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import { performance } from "node:perf_hooks";
import { inArray, sql } from "drizzle-orm";
import {
  db,
  learnerProfilesTable,
  pool,
  sessionsTable,
  usersTable,
} from "@workspace/db";

const BASE_URL = process.env.API_BASE_URL ?? "http://127.0.0.1:8080/api";
const CONCURRENCY_LEVELS = [500, 1_000, 2_000];
const SAMPLE_INTERVAL_MS = 500;
const REQUEST_TIMEOUT_MS = 45_000;
const API_CORES = os.availableParallelism();

if (process.env.NODE_ENV !== "development") {
  throw new Error("Refusing to run unless NODE_ENV=development.");
}

const apiUrl = new URL(BASE_URL);
if (
  apiUrl.protocol !== "http:" ||
  !["127.0.0.1", "localhost"].includes(apiUrl.hostname) ||
  apiUrl.pathname.replace(/\/+$/, "") !== "/api"
) {
  throw new Error("API_BASE_URL must be the local development API at /api.");
}

const runId = randomBytes(4).toString("hex");
const usernamePrefix = `fqperf${runId}`;
const now = new Date();
const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
const latencies = new Map<string, number[]>();
const statusCounts = new Map<string, number>();
const errors: Array<{ concurrency: number; learner: number; message: string }> = [];
let apiPid: number | null = null;

function recordLatency(route: string, ms: number) {
  const samples = latencies.get(route) ?? [];
  samples.push(ms);
  latencies.set(route, samples);
}

function countStatus(route: string, status: number) {
  const key = `${route} ${status}`;
  statusCounts.set(key, (statusCounts.get(key) ?? 0) + 1);
}

function routeLabel(method: string, path: string) {
  const normalizedPath = path.split("?")[0].replace(/\/family\/profiles\/\d+/g, "/family/profiles/:profileId");
  return `${method} ${normalizedPath}`;
}

function percentile(values: number[], quantile: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil(quantile * sorted.length) - 1);
  return Number(sorted[index].toFixed(2));
}

function summarizeLatencies(values: number[]) {
  if (!values.length) return { count: 0, p50Ms: null, p95Ms: null, p99Ms: null, maxMs: null };
  return {
    count: values.length,
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
    p99Ms: percentile(values, 0.99),
    maxMs: Number(Math.max(...values).toFixed(2)),
  };
}

async function findApiPid(): Promise<number> {
  const entries = await readdir("/proc");
  for (const entry of entries) {
    if (!/^\d+$/.test(entry)) continue;
    try {
      const [command, comm] = await Promise.all([
        readFile(`/proc/${entry}/cmdline`, "utf8"),
        readFile(`/proc/${entry}/comm`, "utf8"),
      ]);
      if (
        comm.trim() === "MainThread" &&
        command.includes("--enable-source-maps") &&
        command.includes("dist/index.mjs")
      ) return Number(entry);
    } catch {
      // The process may exit while /proc is being scanned.
    }
  }
  throw new Error("Could not identify the running API server process.");
}

async function readCpuAndMemory(pid: number) {
  const [stat, status, systemStat] = await Promise.all([
    readFile(`/proc/${pid}/stat`, "utf8"),
    readFile(`/proc/${pid}/status`, "utf8"),
    readFile("/proc/stat", "utf8"),
  ]);
  const processFields = stat.slice(stat.lastIndexOf(")") + 2).trim().split(/\s+/);
  const processTicks = Number(processFields[11]) + Number(processFields[12]);
  const residentKb = Number(status.match(/^VmRSS:\s+(\d+)\s+kB$/m)?.[1] ?? 0);
  const systemCpuLine = systemStat.split("\n", 1)[0].trim().split(/\s+/).slice(1);
  const systemTicks = systemCpuLine.reduce((sum, value) => sum + Number(value), 0);
  return {
    processTicks,
    systemTicks,
    rssMb: Number((residentKb / 1024).toFixed(2)),
  };
}

type DbSnapshot = {
  numbackends: number;
  xact_commit: number;
  xact_rollback: number;
  blks_read: number;
  blks_hit: number;
  tup_inserted: number;
  tup_updated: number;
  tup_deleted: number;
  connections: number;
  active_connections: number;
  lock_waiters: number;
};

async function readDbSnapshot(): Promise<DbSnapshot> {
  const result = await db.execute(sql`
    SELECT
      d.numbackends,
      d.xact_commit,
      d.xact_rollback,
      d.blks_read,
      d.blks_hit,
      d.tup_inserted,
      d.tup_updated,
      d.tup_deleted,
      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database()) AS connections,
      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND state = 'active') AS active_connections,
      (SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock') AS lock_waiters
    FROM pg_stat_database d
    WHERE d.datname = current_database()
  `);
  const row = (result as unknown as { rows: Record<string, string | number>[] }).rows[0];
  if (!row) throw new Error("PostgreSQL did not return development database activity statistics.");
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, Number(value)]),
  ) as DbSnapshot;
}

type MeterSnapshot = {
  timestamp: number;
  api?: Awaited<ReturnType<typeof readCpuAndMemory>>;
  db: DbSnapshot;
};

async function collectMeterSnapshot(): Promise<MeterSnapshot> {
  const [api, dbSnapshot] = await Promise.all([
    apiPid === null ? Promise.resolve(undefined) : readCpuAndMemory(apiPid).catch(() => undefined),
    readDbSnapshot(),
  ]);
  return { timestamp: performance.now(), api, db: dbSnapshot };
}

function summarizeMeter(samples: MeterSnapshot[]) {
  const rss = samples.flatMap((sample) => sample.api ? [sample.api.rssMb] : []);
  const cpuHostPercent: number[] = [];
  for (let i = 1; i < samples.length; i++) {
    const previous = samples[i - 1];
    const current = samples[i];
    if (!previous.api || !current.api) continue;
    const elapsedTicks = current.api.systemTicks - previous.api.systemTicks;
    const processTicks = current.api.processTicks - previous.api.processTicks;
    if (elapsedTicks > 0 && processTicks >= 0) {
      cpuHostPercent.push((processTicks / elapsedTicks) * 100);
    }
  }
  const activeDbConnections = samples.map((sample) => sample.db.active_connections);
  const totalDbConnections = samples.map((sample) => sample.db.connections);
  return {
    apiProcess: {
      pid: apiPid,
      sampledRssMb: rss.length,
      minRssMb: rss.length ? Number(Math.min(...rss).toFixed(2)) : null,
      maxRssMb: rss.length ? Number(Math.max(...rss).toFixed(2)) : null,
      meanRssMb: rss.length
        ? Number((rss.reduce((sum, value) => sum + value, 0) / rss.length).toFixed(2))
        : null,
      cpuPercentOfHost: cpuHostPercent.length
        ? {
            mean: Number((cpuHostPercent.reduce((sum, value) => sum + value, 0) / cpuHostPercent.length).toFixed(2)),
            peak: Number(Math.max(...cpuHostPercent).toFixed(2)),
          }
        : null,
      availableHostCores: API_CORES,
    },
    database: {
      samples: samples.length,
      peakConnections: totalDbConnections.length ? Math.max(...totalDbConnections) : 0,
      peakActiveConnections: activeDbConnections.length ? Math.max(...activeDbConnections) : 0,
      peakLockWaiters: samples.length ? Math.max(...samples.map((sample) => sample.db.lock_waiters)) : 0,
      counterDelta: samples.length > 1
        ? Object.fromEntries(
            (Object.keys(samples.at(-1)!.db) as Array<keyof DbSnapshot>)
              .filter((key) => !["numbackends", "connections", "active_connections", "lock_waiters"].includes(key))
              .map((key) => [key, samples.at(-1)!.db[key] - samples[0].db[key]]),
          )
        : {},
    },
  };
}

function requestJson(
  agent: http.Agent,
  cookie: string,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: any }> {
  const route = routeLabel(method, path);
  const payload = body === undefined ? undefined : JSON.stringify(body);
  const startedAt = performance.now();

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: apiUrl.hostname,
        port: Number(apiUrl.port || 80),
        path: `${apiUrl.pathname.replace(/\/+$/, "")}${path}`,
        method,
        agent,
        headers: {
          Cookie: cookie,
          ...(payload ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let response = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => { response += chunk; });
        res.on("end", () => {
          const ms = performance.now() - startedAt;
          recordLatency(route, ms);
          const status = res.statusCode ?? 0;
          countStatus(route, status);
          try {
            resolve({ status, body: response ? JSON.parse(response) : null });
          } catch {
            reject(new Error(`${route} returned invalid JSON (HTTP ${status}).`));
          }
        });
      },
    );
    req.setTimeout(REQUEST_TIMEOUT_MS, () => req.destroy(new Error(`${route} timed out after ${REQUEST_TIMEOUT_MS} ms.`)));
    req.on("error", (error) => {
      recordLatency(route, performance.now() - startedAt);
      countStatus(route, 0);
      reject(new Error(`${route}: ${error.message}`));
    });
    if (payload) req.write(payload);
    req.end();
  });
}

async function expect(
  agent: http.Agent,
  cookie: string,
  method: string,
  path: string,
  body: unknown,
  expectedStatus: number,
) {
  const response = await requestJson(agent, cookie, method, path, body);
  if (response.status !== expectedStatus) {
    throw new Error(`${method} ${path.split("?")[0]} expected HTTP ${expectedStatus}, got ${response.status}.`);
  }
  return response.body;
}

function sameJson(actual: unknown, expected: unknown): boolean {
  const canonicalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
          .map(([key, nested]) => [key, canonicalize(nested)]),
      );
    }
    return value;
  };
  return JSON.stringify(canonicalize(actual)) === JSON.stringify(canonicalize(expected));
}

async function runLearner(
  fixture: { id: number; username: string; sessionToken: string; profileId: number; learnerIndex: number },
  agent: http.Agent,
): Promise<number> {
  const startedAt = performance.now();
  const cookie = `fq_session=${fixture.sessionToken}`;
  const profileName = `Peak ${fixture.learnerIndex}`;
  const progress = { runId, learner: fixture.learnerIndex, saved: 3, source: "load-test" };
  const fun = { xp: fixture.learnerIndex, streak: 1, runId };
  const profileProgress = { runId, learner: fixture.learnerIndex, saved: 4, source: "profile-load-test" };
  const profileFun = { xp: fixture.learnerIndex + 1, streak: 2, runId };

  const account = await expect(agent, cookie, "GET", "/auth/me", undefined, 200);
  if (account.username !== fixture.username || account.id !== fixture.id) {
    throw new Error("GET /auth/me returned the wrong synthetic account.");
  }

  const initialProgress = await expect(agent, cookie, "GET", "/progress", undefined, 200);
  if (initialProgress.progress !== null || initialProgress.fun !== null) {
    throw new Error("GET /progress returned unexpected pre-test data.");
  }
  const savedProgress = await expect(agent, cookie, "PUT", "/progress", { progress, fun }, 200);
  if (!sameJson(savedProgress.progress, progress) || !sameJson(savedProgress.fun, fun)) {
    throw new Error("PUT /progress did not return the saved test payload.");
  }
  const readProgress = await expect(agent, cookie, "GET", "/progress", undefined, 200);
  if (!sameJson(readProgress.progress, progress) || !sameJson(readProgress.fun, fun)) {
    throw new Error("GET /progress did not return the saved test payload.");
  }

  const profiles = await expect(agent, cookie, "GET", "/family/profiles", undefined, 200);
  if (!Array.isArray(profiles) || profiles.length !== 1 || profiles[0].id !== fixture.profileId) {
    throw new Error("GET /family/profiles did not return the expected synthetic profile.");
  }
  const profilePath = `/family/profiles/${fixture.profileId}`;
  const updatedProfile = await expect(
    agent,
    cookie,
    "PATCH",
    profilePath,
    { displayName: profileName },
    200,
  );
  if (updatedProfile.id !== fixture.profileId || updatedProfile.displayName !== profileName) {
    throw new Error("PATCH /family/profiles did not return the updated synthetic profile.");
  }
  const profileProgressPath = `${profilePath}/progress`;
  const initialProfileProgress = await expect(agent, cookie, "GET", profileProgressPath, undefined, 200);
  if (!sameJson(initialProfileProgress.progress, {}) || !sameJson(initialProfileProgress.fun, {})) {
    throw new Error("GET learner profile progress returned unexpected pre-test data.");
  }
  const savedProfileProgress = await expect(
    agent,
    cookie,
    "PUT",
    profileProgressPath,
    { progress: profileProgress, fun: profileFun },
    200,
  );
  if (
    !sameJson(savedProfileProgress.progress, profileProgress) ||
    !sameJson(savedProfileProgress.fun, profileFun)
  ) {
    throw new Error("PUT learner profile progress did not return the saved test payload.");
  }
  const readProfileProgress = await expect(agent, cookie, "GET", profileProgressPath, undefined, 200);
  if (
    !sameJson(readProfileProgress.progress, profileProgress) ||
    !sameJson(readProfileProgress.fun, profileFun)
  ) {
    throw new Error("GET learner profile progress did not return the saved test payload.");
  }
  return performance.now() - startedAt;
}

async function runStage(concurrency: number, fixtures: Parameters<typeof runLearner>[0][]) {
  const agent = new http.Agent({
    keepAlive: true,
    maxSockets: concurrency,
    maxTotalSockets: concurrency,
  });
  const initialRouteCounts = new Map([...latencies].map(([route, samples]) => [route, samples.length]));
  const initialStatusCounts = new Map(statusCounts);
  const baseline = await collectMeterSnapshot();
  const meterSamples: MeterSnapshot[] = [baseline];
  let sampling = true;
  const sampleLoop = (async () => {
    while (sampling) {
      await new Promise((resolve) => setTimeout(resolve, SAMPLE_INTERVAL_MS));
      if (!sampling) break;
      try {
        meterSamples.push(await collectMeterSnapshot());
      } catch {
        // Keep the request run going if a database metric sample is temporarily unavailable.
      }
    }
  })();

  const startedAt = performance.now();
  const outcomes = await Promise.allSettled(fixtures.map((fixture) => runLearner(fixture, agent)));
  const durationMs = performance.now() - startedAt;
  sampling = false;
  await sampleLoop;
  // Let PostgreSQL flush per-backend statistics before taking the ending counter snapshot.
  await new Promise((resolve) => setTimeout(resolve, 750));
  try {
    meterSamples.push(await collectMeterSnapshot());
  } catch {
    // A final missing metric sample must not discard the HTTP results.
  }
  agent.destroy();

  outcomes.forEach((outcome, index) => {
    if (outcome.status === "rejected") {
      errors.push({
        concurrency,
        learner: fixtures[index].learnerIndex,
        message: outcome.reason instanceof Error ? outcome.reason.message : "Unexpected test failure.",
      });
    }
  });

  const finalDbSnapshot = meterSamples.at(-1)!.db;
  const initialDbSnapshot = meterSamples[0].db;
  const metric = summarizeMeter(meterSamples);
  const stageRequestCount = [...latencies.entries()].reduce(
    (total, [route, samples]) => total + samples.length - (initialRouteCounts.get(route) ?? 0),
    0,
  );
  metric.database.counterDelta = Object.fromEntries(
    (Object.keys(initialDbSnapshot) as Array<keyof DbSnapshot>)
      .filter((key) => !["numbackends", "connections", "active_connections", "lock_waiters"].includes(key))
      .map((key) => [key, finalDbSnapshot[key] - initialDbSnapshot[key]]),
  );

  return {
    concurrentSessions: concurrency,
    accountsCompletedCorrectly: outcomes.filter((outcome) => outcome.status === "fulfilled").length,
    accountErrors: outcomes.filter((outcome) => outcome.status === "rejected").length,
    requests: stageRequestCount,
    durationSeconds: Number((durationMs / 1000).toFixed(2)),
    endToEndSessionLatencyMs: summarizeLatencies(
      outcomes.flatMap((outcome) => outcome.status === "fulfilled" ? [outcome.value] : []),
    ),
    httpByRoute: Object.fromEntries(
      [...latencies.entries()].flatMap(([route, samples]) => {
        const stageSamples = samples.slice(initialRouteCounts.get(route) ?? 0);
        return stageSamples.length ? [[route, summarizeLatencies(stageSamples)]] : [];
      }),
    ),
    statusCounts: Object.fromEntries(
      [...statusCounts.entries()].map(([key, value]) => [key, value - (initialStatusCounts.get(key) ?? 0)]),
    ),
    errors: errors.filter((error) => error.concurrency === concurrency).length,
    apiAndDatabase: metric,
  };
}

async function main() {
  if (process.env.DATABASE_URL === undefined) {
    throw new Error("The development database must be provisioned before running this benchmark.");
  }
  apiPid = await findApiPid();

  const maxUsers = CONCURRENCY_LEVELS.reduce((sum, level) => sum + level, 0);
  const tokens = Array.from({ length: maxUsers }, () => randomBytes(32).toString("base64url"));
  const passwordPlaceholder = "not-valid-for-login";
  let userIds: number[] = [];
  try {
    const userRows = Array.from({ length: maxUsers }, (_, index) => ({
      username: `${usernamePrefix}${String(index + 1).padStart(4, "0")}`,
      displayName: `Load test ${index + 1}`,
      passwordHash: passwordPlaceholder,
      recoveryCodeHash: null,
      parentConsentAt: now,
      privacyNoticeVersion: "privacy-v1",
    }));
    const insertedUsers = await db.insert(usersTable).values(userRows).returning({
      id: usersTable.id,
      username: usersTable.username,
    });
    userIds = insertedUsers.map((user) => user.id);

    const tokenByUsername = new Map(userRows.map((user, index) => [user.username, tokens[index]]));
    await db.insert(sessionsTable).values(insertedUsers.map((user) => ({
      tokenHash: createHash("sha256").update(tokenByUsername.get(user.username)!).digest("hex"),
      userId: user.id,
      expiresAt,
    })));

    const insertedProfiles = await db.insert(learnerProfilesTable).values(
      insertedUsers.map((user, index) => ({
        ownerUserId: user.id,
        displayName: `Learner ${index + 1}`,
        progress: {},
        fun: {},
        assignedUnitIds: [],
      })),
    ).returning({ id: learnerProfilesTable.id, ownerUserId: learnerProfilesTable.ownerUserId });
    const profileByUserId = new Map(insertedProfiles.map((profile) => [profile.ownerUserId, profile.id]));
    const fixtureByUsername = new Map(
      insertedUsers.map((user, index) => [
        user.username,
        {
          id: user.id,
          username: user.username,
          sessionToken: tokenByUsername.get(user.username)!,
          profileId: profileByUserId.get(user.id)!,
          learnerIndex: index + 1,
        },
      ]),
    );

    const warmupAgent = new http.Agent({ keepAlive: true, maxSockets: 20 });
    await Promise.all(insertedUsers.slice(0, 20).map((user) => {
      const fixture = fixtureByUsername.get(user.username)!;
      return expect(warmupAgent, `fq_session=${fixture.sessionToken}`, "GET", "/auth/me", undefined, 200);
    }));
    warmupAgent.destroy();
    // Keep fixture-creation and warm-up transactions out of the per-stage DB counter deltas.
    await new Promise((resolve) => setTimeout(resolve, 1_000));

    const stageResults = [];
    let fixtureOffset = 0;
    for (const concurrency of CONCURRENCY_LEVELS) {
      const fixtures = insertedUsers
        .slice(fixtureOffset, fixtureOffset + concurrency)
        .map((user) => fixtureByUsername.get(user.username)!);
      fixtureOffset += concurrency;
      stageResults.push(await runStage(concurrency, fixtures));
    }

    const report = {
      environment: "development",
      target: "local API at 127.0.0.1:8080",
      syntheticAccountsCreatedAndCleanedUp: maxUsers,
      warmupRequests: 20,
      requestsPerSession: 9,
      concurrentLevels: stageResults,
      measuredLoadRequests: stageResults.reduce((sum, stage) => sum + stage.requests, 0),
      totalRequests: [...latencies.values()].reduce((sum, samples) => sum + samples.length, 0),
      totalErrors: errors.length,
      errorSamples: errors.slice(0, 20),
    };
    console.log(JSON.stringify(report, null, 2));
    if (errors.length) process.exitCode = 1;
  } finally {
    if (userIds.length) await db.delete(usersTable).where(inArray(usersTable.id, userIds));
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Benchmark setup failed.");
  process.exitCode = 1;
});
