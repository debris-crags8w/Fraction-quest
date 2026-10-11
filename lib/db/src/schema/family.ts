import { createInsertSchema } from "drizzle-zod";
import { integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { z } from "zod/v4";
import { usersTable } from "./users";

/** A teacher-owned classroom. Its join code contains no learner identity. */
export const classroomsTable = pgTable("classrooms", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  joinCode: text("join_code").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A family-controlled learner profile. Teachers see only memberCode and learning progress. */
export const learnerProfilesTable = pgTable("learner_profiles", {
  id: serial("id").primaryKey(),
  ownerUserId: integer("owner_user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull(),
  classroomId: integer("classroom_id").references(() => classroomsTable.id, { onDelete: "set null" }),
  memberCode: text("member_code"),
  assignedUnitIds: jsonb("assigned_unit_ids").$type<string[]>().notNull().default([]),
  progress: jsonb("progress").$type<Record<string, unknown>>().notNull().default({}),
  fun: jsonb("fun").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("learner_profiles_class_member_code").on(table.classroomId, table.memberCode),
]);

export const insertClassroomSchema = createInsertSchema(classroomsTable).omit({ id: true, createdAt: true });
export const insertLearnerProfileSchema = createInsertSchema(learnerProfilesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClassroom = z.infer<typeof insertClassroomSchema>;
export type InsertLearnerProfile = z.infer<typeof insertLearnerProfileSchema>;
export type Classroom = typeof classroomsTable.$inferSelect;
export type LearnerProfile = typeof learnerProfilesTable.$inferSelect;
