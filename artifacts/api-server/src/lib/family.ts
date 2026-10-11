import { eq } from "drizzle-orm";
import { db, learnerProfilesTable, progressTable } from "@workspace/db";

/** Move an older one-progress-per-account record into the new first learner profile. */
export async function ensureDefaultLearnerProfile(ownerUserId: number, displayName: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(learnerProfilesTable)
      .where(eq(learnerProfilesTable.ownerUserId, ownerUserId))
      .limit(1);
    if (existing) return existing;

    const [legacy] = await tx
      .select()
      .from(progressTable)
      .where(eq(progressTable.userId, ownerUserId))
      .limit(1);
    const [profile] = await tx
      .insert(learnerProfilesTable)
      .values({
        ownerUserId,
        displayName: displayName.trim().slice(0, 30) || "Learner",
        progress: (legacy?.progress && typeof legacy.progress === "object" && !Array.isArray(legacy.progress))
          ? legacy.progress as Record<string, unknown>
          : {},
        fun: (legacy?.fun && typeof legacy.fun === "object" && !Array.isArray(legacy.fun))
          ? legacy.fun as Record<string, unknown>
          : {},
      })
      .returning();
    if (legacy) await tx.delete(progressTable).where(eq(progressTable.userId, ownerUserId));
    return profile;
  });
}
