// Recent server log entries kept in memory so the admin dashboard can show them. The logger (stdout) stays the
// permanent record. Only a safe whitelist of fields is stored: never headers, cookies, bodies or stack traces.

export type LogEntry = {
  at: number;
  level: "info" | "warn" | "error" | "fatal";
  msg: string;
  ip?: string;
  method?: string;
  path?: string;
  status?: number;
  ms?: number;
  error?: string;
};

const MAX_ENTRIES = 500;
const SLOW_MS = 1000;
const entries: LogEntry[] = [];
const totals = { requests: 0, status5xx: 0, status4xx: 0 };

const LEVELS: Record<number, LogEntry["level"]> = { 30: "info", 40: "warn", 50: "error", 60: "fatal" };
const short = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined);
const scrub = (text: string | undefined) => text?.replace(/(token|password|code|secret|key)=[^&\s]+/gi, "$1=[hidden]");

/** Called for every log line. Request logs are only kept when they failed (4xx/5xx) or were slow. */
export function captureLog(levelNumber: number, data: Record<string, any> | undefined, msg: string | undefined, now = Date.now()): void {
  const level = LEVELS[levelNumber];
  if (!level) return;
  const res = data?.res, req = data?.req;
  const status = typeof res?.statusCode === "number" ? res.statusCode : undefined;
  const ms = typeof data?.responseTime === "number" ? Math.round(data.responseTime) : undefined;
  if (status !== undefined) {
    totals.requests++;
    if (status >= 500) totals.status5xx++; else if (status >= 400) totals.status4xx++;
    if (status < 400 && level === "info" && (ms ?? 0) < SLOW_MS) return;
  }
  const err = data?.err;
  const entry: LogEntry = {
    at: now, level, msg: scrub(short(msg)) ?? "",
    ip: short(data?.ip, 64),
    method: short(req?.method ?? data?.method, 10),
    path: scrub(short((req?.url ?? data?.path)?.toString().split("?")[0])),
    status, ms,
    error: scrub(short(err?.message ?? (typeof err === "string" ? err : undefined))),
  };
  for (const key of Object.keys(entry) as (keyof LogEntry)[]) if (entry[key] === undefined) delete entry[key];
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) entries.shift();
}

export function recentLogs({ level, limit = 100, now = Date.now(), sinceMs }: { level?: string; limit?: number; now?: number; sinceMs?: number } = {}) {
  const order = ["info", "warn", "error", "fatal"];
  const min = Math.max(0, order.indexOf(level ?? "info"));
  const cutoff = sinceMs ? now - sinceMs : 0;
  return entries.filter((e) => order.indexOf(e.level) >= min && e.at >= cutoff).slice(-limit).reverse();
}

export function logSummary(now = Date.now()) {
  const dayAgo = now - 864e5;
  const recent = entries.filter((e) => e.at > dayAgo);
  return {
    errors24h: recent.filter((e) => e.level === "error" || e.level === "fatal").length,
    warnings24h: recent.filter((e) => e.level === "warn").length,
    requestsSinceStart: totals.requests, status5xxSinceStart: totals.status5xx, status4xxSinceStart: totals.status4xx,
  };
}

export function resetLogsForTests(): void {
  entries.length = 0;
  totals.requests = totals.status5xx = totals.status4xx = 0;
}
