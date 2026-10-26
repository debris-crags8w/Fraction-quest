import { sql } from "drizzle-orm";
import { db } from "@workspace/db";

/** Start a test from empty counters. Limits are kept in the database, so failures left by an earlier run would still count. */
export async function clearRateLimits(...bucketPrefixes: string[]): Promise<void> {
  try {
    for (const prefix of bucketPrefixes) await db.execute(sql`DELETE FROM rate_limits WHERE bucket LIKE ${`${prefix}%`}`);
  } catch {
    // The table arrives with Replit Publish; a clean test database has none, and the limits then count in memory.
  }
}
