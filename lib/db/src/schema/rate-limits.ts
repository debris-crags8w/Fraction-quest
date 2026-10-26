import { integer, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// Failed-attempt counters for the API's rate limits, shared by every server instance and kept across restarts.
// The key is stored only as a SHA-256 hash, so no username or IP address is written to the database, and a row
// is deleted soon after its window ends (the longest window is one hour).
export const rateLimitsTable = pgTable("rate_limits", {
  bucket: text("bucket").notNull(),
  keyHash: text("key_hash").notNull(),
  count: integer("count").notNull(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
}, (table) => [
  primaryKey({ columns: [table.bucket, table.keyHash] }),
]);
