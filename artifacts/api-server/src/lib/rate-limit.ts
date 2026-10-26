// Rate limiter for sign-in, recovery, sign-up, class-code and admin attempts.
//
// Counts live in Postgres (the `rate_limits` table), so they are shared by every server instance and survive
// restarts and scale-to-zero. Keys are stored only as hashes: no username or IP address is written down, and an
// expired row is deleted soon after its window ends.
//
// If the table can't be reached (before Replit Publish has created it, or a database blip) each call falls back to
// counting in this process alone, which is how the limiter always worked: never worse than before, and never a
// reason for sign-in to fail.
import { createHash } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { db, rateLimitsTable } from "@workspace/db";
import { logger } from "./logger";

/** Where counts are kept. `count` is how many failures `key` has in a window that has not ended (0 if none). */
export type RateLimitStore = {
  count(bucket: string, key: string, now: number): Promise<number>;
  hit(bucket: string, key: string, windowMs: number, now: number): Promise<void>;
  reset(bucket: string, key: string): Promise<void>;
};

const hashKey = (key: string) => createHash("sha256").update(key).digest("hex");

/** The shared store: one row per (limiter, hashed key), counted with a single atomic upsert. */
export const postgresStore: RateLimitStore = {
  async count(bucket, key, now) {
    const [row] = await db.select({ count: rateLimitsTable.count, resetAt: rateLimitsTable.resetAt }).from(rateLimitsTable)
      .where(and(eq(rateLimitsTable.bucket, bucket), eq(rateLimitsTable.keyHash, hashKey(key)))).limit(1);
    return row && row.resetAt.getTime() > now ? row.count : 0;
  },
  async hit(bucket, key, windowMs, now) {
    const at = new Date(now).toISOString();
    const resetAt = new Date(now + windowMs);
    await db.insert(rateLimitsTable).values({ bucket, keyHash: hashKey(key), count: 1, resetAt }).onConflictDoUpdate({
      target: [rateLimitsTable.bucket, rateLimitsTable.keyHash],
      set: {
        // A window that has ended starts over; otherwise add one. (Both read the row as it was before this update.)
        count: sql`CASE WHEN ${rateLimitsTable.resetAt} <= ${at}::timestamptz THEN 1 ELSE ${rateLimitsTable.count} + 1 END`,
        resetAt: sql`CASE WHEN ${rateLimitsTable.resetAt} <= ${at}::timestamptz THEN ${resetAt.toISOString()}::timestamptz ELSE ${rateLimitsTable.resetAt} END`,
      },
    });
    // A little housekeeping on the way: about one failure in fifty clears every row whose window has ended.
    if (Math.random() < 0.02) await sweepExpiredRateLimits(now);
  },
  async reset(bucket, key) {
    await db.delete(rateLimitsTable).where(and(eq(rateLimitsTable.bucket, bucket), eq(rateLimitsTable.keyHash, hashKey(key))));
  },
};

/** Delete every counter whose window has ended. */
export async function sweepExpiredRateLimits(now = Date.now()): Promise<void> {
  await db.delete(rateLimitsTable).where(lt(rateLimitsTable.resetAt, new Date(now)));
}

type Bucket = { count: number; resetAt: number };

/** Counting in this process alone: the fallback when the shared store can't be used, and the choice for limits that
    guard cost rather than security (so they need no database write per request). */
export function memoryRateLimitStore(): RateLimitStore {
  const buckets = new Map<string, Bucket>();
  const id = (bucket: string, key: string) => `${bucket}\u0000${key}`;
  return {
    async count(bucket, key, now) {
      const found = buckets.get(id(bucket, key));
      return found && found.resetAt > now ? found.count : 0;
    },
    async hit(bucket, key, windowMs, now) {
      const found = buckets.get(id(bucket, key));
      if (!found || found.resetAt <= now) buckets.set(id(bucket, key), { count: 1, resetAt: now + windowMs });
      else found.count += 1;
      if (buckets.size > 10_000) {
        for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
      }
    },
    async reset(bucket, key) {
      buckets.delete(id(bucket, key));
    },
  };
}

/** A limiter named `name` (its counts are shared by every limiter with that name): `max` failures per `windowMs`. */
export function createRateLimiter({ name, max, windowMs, store = postgresStore }: { name: string; max: number; windowMs: number; store?: RateLimitStore }) {
  const local = memoryRateLimitStore();
  let warned = false;
  /** Use the shared store; if it fails, say so once and use this process's own count instead. */
  async function run<T>(use: (from: RateLimitStore) => Promise<T>): Promise<T> {
    try {
      return await use(store);
    } catch (err) {
      if (!warned) {
        warned = true;
        logger.warn({ err, limiter: name }, "rate limit store unavailable; counting in this process only");
      }
      return use(local);
    }
  }
  return {
    /** True when `key` has used up its attempts in the current window. */
    isLimited: async (key: string, now = Date.now()): Promise<boolean> => (await run((from) => from.count(name, key, now))) >= max,
    hit: (key: string, now = Date.now()): Promise<void> => run((from) => from.hit(name, key, windowMs, now)),
    reset: (key: string): Promise<void> => run((from) => from.reset(name, key)),
  };
}
