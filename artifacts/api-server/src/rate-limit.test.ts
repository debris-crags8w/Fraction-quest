import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import test, { after, before } from "node:test";
import { sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { createRateLimiter, sweepExpiredRateLimits, type RateLimitStore } from "./lib/rate-limit";

// The table normally arrives with the schema (Replit Publish); a clean test database has none.
before(async () => {
  await db.execute(sql`CREATE TABLE IF NOT EXISTS rate_limits (
    bucket text NOT NULL, key_hash text NOT NULL, count integer NOT NULL, reset_at timestamptz NOT NULL,
    PRIMARY KEY (bucket, key_hash))`);
});

const names: string[] = [];
/** A bucket name no other test (or run) shares. */
const bucket = (label: string) => {
  const name = `test-${label}-${randomBytes(4).toString("hex")}`;
  names.push(name);
  return name;
};
after(async () => {
  for (const name of names) await db.execute(sql`DELETE FROM rate_limits WHERE bucket = ${name}`);
});

const t0 = 1_700_000_000_000;

test("a limit is shared by every limiter of the same name: a restart or a second server does not reset it", async () => {
  const name = bucket("shared");
  const first = createRateLimiter({ name, max: 3, windowMs: 60_000 });
  for (let i = 0; i < 3; i++) await first.hit("kid|ip", t0);
  assert.equal(await first.isLimited("kid|ip", t0), true);
  const second = createRateLimiter({ name, max: 3, windowMs: 60_000 });
  assert.equal(await second.isLimited("kid|ip", t0), true, "a new instance still sees the three failures");
  assert.equal(await second.isLimited("other|ip", t0), false, "another key is not limited");
  assert.equal(await createRateLimiter({ name: bucket("elsewhere"), max: 3, windowMs: 60_000 }).isLimited("kid|ip", t0), false, "another bucket is not limited");
});

test("a limit lifts when its window ends, and the next failure starts a fresh count", async () => {
  const limiter = createRateLimiter({ name: bucket("window"), max: 2, windowMs: 1_000 });
  await limiter.hit("k", t0);
  await limiter.hit("k", t0 + 10);
  assert.equal(await limiter.isLimited("k", t0 + 999), true);
  assert.equal(await limiter.isLimited("k", t0 + 1_000), false, "the window has ended");
  await limiter.hit("k", t0 + 1_500);
  assert.equal(await limiter.isLimited("k", t0 + 1_501), false, "one failure after the window is one failure, not three");
  await limiter.hit("k", t0 + 1_502);
  assert.equal(await limiter.isLimited("k", t0 + 1_503), true);
});

test("reset clears a key's count", async () => {
  const limiter = createRateLimiter({ name: bucket("reset"), max: 1, windowMs: 60_000 });
  await limiter.hit("k", t0);
  assert.equal(await limiter.isLimited("k", t0), true);
  await limiter.reset("k");
  assert.equal(await limiter.isLimited("k", t0), false);
});

test("simultaneous failures are all counted (no lost updates between servers)", async () => {
  const name = bucket("race");
  const limiter = createRateLimiter({ name, max: 100, windowMs: 60_000 });
  await Promise.all(Array.from({ length: 12 }, () => limiter.hit("k", t0)));
  const [row] = (await db.execute(sql`SELECT count FROM rate_limits WHERE bucket = ${name}`)).rows as { count: number }[];
  assert.equal(row?.count, 12);
});

test("usernames and IP addresses are never stored as written", async () => {
  const name = bucket("hashed");
  await createRateLimiter({ name, max: 5, windowMs: 60_000 }).hit("203.0.113.9|sunny_kid", t0);
  const rows = (await db.execute(sql`SELECT bucket, key_hash FROM rate_limits WHERE bucket = ${name}`)).rows as { bucket: string; key_hash: string }[];
  assert.equal(rows.length, 1);
  assert.match(rows[0]!.key_hash, /^[0-9a-f]{64}$/);
  assert.ok(!/203\.0\.113|sunny/.test(JSON.stringify(rows)), "no IP or username in the row");
});

test("expired rows are swept, and live ones stay", async () => {
  const name = bucket("sweep");
  const limiter = createRateLimiter({ name, max: 5, windowMs: 1_000 });
  await limiter.hit("old", t0);
  await limiter.hit("live", t0 + 5_000);
  await sweepExpiredRateLimits(t0 + 2_000);
  const rows = (await db.execute(sql`SELECT count(*)::int AS n FROM rate_limits WHERE bucket = ${name}`)).rows as { n: number }[];
  assert.equal(rows[0]!.n, 1, "only the live key is left");
  assert.equal(await limiter.isLimited("live", t0 + 5_001), false);
});

test("if the shared store fails (a missing table before Publish, a database blip), limits still work in this process", async () => {
  const broken: RateLimitStore = {
    async count() { throw new Error("relation \"rate_limits\" does not exist"); },
    async hit() { throw new Error("relation \"rate_limits\" does not exist"); },
    async reset() { throw new Error("relation \"rate_limits\" does not exist"); },
  };
  const limiter = createRateLimiter({ name: "broken", max: 2, windowMs: 60_000, store: broken });
  assert.equal(await limiter.isLimited("k", t0), false);
  await limiter.hit("k", t0);
  await limiter.hit("k", t0);
  assert.equal(await limiter.isLimited("k", t0), true, "the in-memory limit still applies");
  await limiter.reset("k");
  assert.equal(await limiter.isLimited("k", t0), false);
});
