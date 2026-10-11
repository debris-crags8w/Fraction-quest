import { and, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { AcceptPrivacyConsentBody, DeleteAccountBody } from "@workspace/api-zod";
import { db, classroomsTable, learnerProfilesTable, usersTable } from "@workspace/db";
import { requireParentConsent, requireUser, type AuthedRequest } from "../middlewares/require-user";
import { ensureDefaultLearnerProfile } from "../lib/family";
import { endSession, PRIVACY_NOTICE_VERSION, publicUser, verifyPassword } from "../lib/auth";

const router: IRouter = Router();

router.patch("/privacy/consent", requireUser, async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const parsed = AcceptPrivacyConsentBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.accepted) {
    res.status(400).json({ error: "A parent or caregiver must actively accept the privacy notice." });
    return;
  }
  const [updated] = await db.update(usersTable)
    .set({ parentConsentAt: new Date(), privacyNoticeVersion: PRIVACY_NOTICE_VERSION })
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json(publicUser(updated));
});

router.get("/privacy/export", requireUser, requireParentConsent, async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  await ensureDefaultLearnerProfile(user.id, user.displayName);
  const learners = await db.select({
    id: learnerProfilesTable.id,
    displayName: learnerProfilesTable.displayName,
    classroomLabel: classroomsTable.label,
    memberCode: learnerProfilesTable.memberCode,
    assignedUnitIds: learnerProfilesTable.assignedUnitIds,
    progress: learnerProfilesTable.progress,
    fun: learnerProfilesTable.fun,
    updatedAt: learnerProfilesTable.updatedAt,
  }).from(learnerProfilesTable)
    .leftJoin(classroomsTable, eq(classroomsTable.id, learnerProfilesTable.classroomId))
    .where(eq(learnerProfilesTable.ownerUserId, user.id));
  const classrooms = await db.select({
    id: classroomsTable.id,
    label: classroomsTable.label,
    joinCode: classroomsTable.joinCode,
    createdAt: classroomsTable.createdAt,
  }).from(classroomsTable).where(eq(classroomsTable.ownerUserId, user.id));
  res.json({
    exportedAt: new Date(),
    account: {
      username: user.username,
      displayName: user.displayName,
      createdAt: user.createdAt,
      parentConsentAt: user.parentConsentAt?.toISOString() ?? null,
      privacyNoticeVersion: user.privacyNoticeVersion ?? null,
    },
    learners,
    classrooms,
  });
});

/**
 * Permanently delete the account. Every learner profile, classroom, saved progress document and session
 * references the user with ON DELETE CASCADE, so removing the user row removes all of it.
 * The password is asked again so a child who finds a signed-in device can't delete the family's data.
 */
router.delete("/privacy/account", requireUser, async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const parsed = DeleteAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the account password to delete the account." });
    return;
  }
  if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
    res.status(403).json({ error: "That password is not right, so nothing was deleted." });
    return;
  }
  await endSession(req, res);
  await db.delete(usersTable).where(eq(usersTable.id, user.id));
  res.status(204).end();
});

export default router;
