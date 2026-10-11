import { integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

// Student accounts. Keep personal data to a minimum: a username, a display
// name and a password hash. No email, birthday or real full name.
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  // Stored lowercased so sign-in is case-insensitive.
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  parentConsentAt: timestamp("parent_consent_at", { withTimezone: true }),
  privacyNoticeVersion: text("privacy_notice_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Sign-in sessions. Only a SHA-256 hash of the cookie token is stored, so a
// database leak does not expose usable session cookies.
export const sessionsTable = pgTable("sessions", {
  tokenHash: text("token_hash").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// One saved-progress document per student: the same shape the app keeps in
// localStorage (course progress + XP/streak state).
export const progressTable = pgTable("progress", {
  userId: integer("user_id").primaryKey().references(() => usersTable.id, { onDelete: "cascade" }),
  progress: jsonb("progress").notNull(),
  fun: jsonb("fun").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof usersTable.$inferSelect;
