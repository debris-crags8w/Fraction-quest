import { randomBytes } from "node:crypto";
import { and, count, desc, eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  classroomsTable,
  db,
  learnerProfilesTable,
} from "@workspace/db";
import {
  AssignClassroomUnitsBody,
  CreateClassroomBody,
  CreateLearnerProfileBody,
  JoinClassroomBody,
  SaveLearnerProgressBody,
  UpdateLearnerProfileBody,
} from "@workspace/api-zod";
import { requireParentConsent, requireUser, type AuthedRequest } from "../middlewares/require-user";
import { createRateLimiter } from "../lib/rate-limit";
import { ensureDefaultLearnerProfile } from "../lib/family";

const router: IRouter = Router();
const MAX_PROGRESS_BYTES = 200_000;
const joinAttempts = createRateLimiter({ max: 20, windowMs: 15 * 60 * 1000 });
const UNIT_IDS = new Set(Array.from({ length: 14 }, (_, index) => String(index + 1)));
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
router.use(requireUser, requireParentConsent);

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

const parseId = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw || !/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
};

function makeCode(length: number) {
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

function profileResponse(profile: typeof learnerProfilesTable.$inferSelect) {
  return {
    id: profile.id,
    displayName: profile.displayName,
    classroomId: profile.classroomId,
    memberCode: profile.memberCode,
    assignedUnitIds: profile.assignedUnitIds,
  };
}

router.get("/family/profiles", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  await ensureDefaultLearnerProfile(user.id, user.displayName);
  const profiles = await db.select().from(learnerProfilesTable)
    .where(eq(learnerProfilesTable.ownerUserId, user.id))
    .orderBy(learnerProfilesTable.createdAt);
  res.json(profiles.map(profileResponse));
});

router.post("/family/profiles", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const parsed = CreateLearnerProfileBody.safeParse(req.body);
  const displayName = parsed.success ? parsed.data.displayName.trim() : "";
  if (!parsed.success || !displayName) {
    res.status(400).json({ error: "Enter a nickname between 1 and 30 characters." });
    return;
  }
  const [profile] = await db.insert(learnerProfilesTable).values({
    ownerUserId: user.id,
    displayName,
    progress: {},
    fun: {},
    assignedUnitIds: [],
  }).returning();
  res.status(201).json(profileResponse(profile));
});

router.patch("/family/profiles/:profileId", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const profileId = parseId(req.params.profileId);
  const parsed = UpdateLearnerProfileBody.safeParse(req.body);
  const displayName = parsed.success ? parsed.data.displayName.trim() : "";
  if (!profileId || !parsed.success || !displayName) {
    res.status(400).json({ error: "Enter a nickname between 1 and 30 characters." });
    return;
  }
  const [profile] = await db.update(learnerProfilesTable)
    .set({ displayName, updatedAt: new Date() })
    .where(and(eq(learnerProfilesTable.id, profileId), eq(learnerProfilesTable.ownerUserId, user.id)))
    .returning();
  if (!profile) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  res.json(profileResponse(profile));
});

router.delete("/family/profiles/:profileId", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const profileId = parseId(req.params.profileId);
  if (!profileId) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  const [owned] = await db.select({ id: learnerProfilesTable.id })
    .from(learnerProfilesTable)
    .where(and(eq(learnerProfilesTable.id, profileId), eq(learnerProfilesTable.ownerUserId, user.id)))
    .limit(1);
  if (!owned) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  const [total] = await db.select({ value: count() })
    .from(learnerProfilesTable)
    .where(eq(learnerProfilesTable.ownerUserId, user.id));
  if ((total?.value ?? 0) <= 1) {
    res.status(400).json({ error: "Keep one learner profile on the account. You can clear its saved progress instead." });
    return;
  }
  await db.delete(learnerProfilesTable).where(eq(learnerProfilesTable.id, profileId));
  res.status(204).end();
});

router.get("/family/profiles/:profileId/progress", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const profileId = parseId(req.params.profileId);
  if (!profileId) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  const [profile] = await db.select().from(learnerProfilesTable)
    .where(and(eq(learnerProfilesTable.id, profileId), eq(learnerProfilesTable.ownerUserId, user.id)))
    .limit(1);
  if (!profile) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  res.json({ progress: profile.progress, fun: profile.fun, updatedAt: profile.updatedAt });
});

router.put("/family/profiles/:profileId/progress", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const profileId = parseId(req.params.profileId);
  const parsed = SaveLearnerProgressBody.safeParse(req.body);
  if (!profileId || !parsed.success || !isPlainObject(parsed.data.progress) || !isPlainObject(parsed.data.fun)) {
    res.status(400).json({ error: "Progress data is not in the expected format." });
    return;
  }
  if (JSON.stringify(parsed.data).length > MAX_PROGRESS_BYTES) {
    res.status(400).json({ error: "Progress data is too large." });
    return;
  }
  const updatedAt = new Date();
  const [profile] = await db.update(learnerProfilesTable)
    .set({ progress: parsed.data.progress, fun: parsed.data.fun, updatedAt })
    .where(and(eq(learnerProfilesTable.id, profileId), eq(learnerProfilesTable.ownerUserId, user.id)))
    .returning();
  if (!profile) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  res.json({ progress: profile.progress, fun: profile.fun, updatedAt });
});

router.delete("/family/profiles/:profileId/progress", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const profileId = parseId(req.params.profileId);
  if (!profileId) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  const [profile] = await db.update(learnerProfilesTable)
    .set({ progress: {}, fun: {}, updatedAt: new Date() })
    .where(and(eq(learnerProfilesTable.id, profileId), eq(learnerProfilesTable.ownerUserId, user.id)))
    .returning({ id: learnerProfilesTable.id });
  if (!profile) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  res.status(204).end();
});

router.get("/classrooms", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const classrooms = await db.select().from(classroomsTable)
    .where(eq(classroomsTable.ownerUserId, user.id))
    .orderBy(desc(classroomsTable.createdAt));
  const result = await Promise.all(classrooms.map(async (classroom) => {
    const [row] = await db.select({ value: count() }).from(learnerProfilesTable)
      .where(eq(learnerProfilesTable.classroomId, classroom.id));
    return {
      id: classroom.id,
      label: classroom.label,
      joinCode: classroom.joinCode,
      learnerCount: row?.value ?? 0,
      createdAt: classroom.createdAt,
    };
  }));
  res.json(result);
});

router.post("/classrooms", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const parsed = CreateClassroomBody.safeParse(req.body);
  const label = parsed.success ? parsed.data.label.trim() : "";
  if (!parsed.success || !label) {
    res.status(400).json({ error: "Enter a class label between 1 and 60 characters." });
    return;
  }
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const joinCode = makeCode(8);
    const [classroom] = await db.insert(classroomsTable).values({
      ownerUserId: user.id,
      label,
      joinCode,
    }).onConflictDoNothing().returning();
    if (classroom) {
      res.status(201).json({ ...classroom, learnerCount: 0 });
      return;
    }
  }
  res.status(503).json({ error: "Could not create a class code just now. Please try again." });
});

router.post("/classrooms/join", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const ip = req.ip ?? "unknown";
  if (joinAttempts.isLimited(ip)) {
    res.status(429).json({ error: "Too many code attempts. Wait a little, then try again." });
    return;
  }
  const parsed = JoinClassroomBody.safeParse(req.body);
  if (!parsed.success) {
    joinAttempts.hit(ip);
    res.status(400).json({ error: "Enter the class code and choose a learner profile." });
    return;
  }
  const code = parsed.data.joinCode.toUpperCase().replace(/[\s-]/g, "");
  const [classroom] = await db.select().from(classroomsTable).where(eq(classroomsTable.joinCode, code)).limit(1);
  const [profile] = await db.select().from(learnerProfilesTable)
    .where(and(eq(learnerProfilesTable.id, parsed.data.profileId), eq(learnerProfilesTable.ownerUserId, user.id)))
    .limit(1);
  if (!classroom) {
    joinAttempts.hit(ip);
    res.status(400).json({ error: "We couldn't find that class code. Check it with your teacher." });
    return;
  }
  if (!profile) {
    res.status(404).json({ error: "That learner profile was not found." });
    return;
  }
  if (profile.classroomId && profile.classroomId !== classroom.id) {
    res.status(409).json({ error: "This learner is already linked to a class. Unlink them before joining another." });
    return;
  }
  const memberCode = profile.memberCode ?? `Learner-${makeCode(4)}`;
  const [linked] = await db.update(learnerProfilesTable)
    .set({ classroomId: classroom.id, memberCode, updatedAt: new Date() })
    .where(and(eq(learnerProfilesTable.id, profile.id), eq(learnerProfilesTable.ownerUserId, user.id)))
    .returning();
  joinAttempts.reset(ip);
  res.json({
    classroomLabel: classroom.label,
    memberCode: linked.memberCode!,
    assignedUnitIds: linked.assignedUnitIds,
  });
});

router.get("/classrooms/:classroomId/roster", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const classroomId = parseId(req.params.classroomId);
  if (!classroomId) {
    res.status(404).json({ error: "That classroom was not found." });
    return;
  }
  const [classroom] = await db.select({ id: classroomsTable.id }).from(classroomsTable)
    .where(and(eq(classroomsTable.id, classroomId), eq(classroomsTable.ownerUserId, user.id)))
    .limit(1);
  if (!classroom) {
    res.status(404).json({ error: "That classroom was not found." });
    return;
  }
  const learners = await db.select({
    memberCode: learnerProfilesTable.memberCode,
    assignedUnitIds: learnerProfilesTable.assignedUnitIds,
    progress: learnerProfilesTable.progress,
    updatedAt: learnerProfilesTable.updatedAt,
  }).from(learnerProfilesTable).where(eq(learnerProfilesTable.classroomId, classroomId));
  res.json(learners.map((learner) => ({
    memberCode: learner.memberCode ?? "Learner",
    assignedUnitIds: learner.assignedUnitIds,
    completedMissionIds: Array.isArray(learner.progress.completedMissionIds)
      ? learner.progress.completedMissionIds.filter((id): id is string => typeof id === "string").slice(0, 500)
      : [],
    updatedAt: learner.updatedAt,
  })));
});

router.put("/classrooms/:classroomId/learners/:memberCode/assignment", async (req, res): Promise<void> => {
  const { user } = req as AuthedRequest;
  const classroomId = parseId(req.params.classroomId);
  const memberCode = Array.isArray(req.params.memberCode) ? req.params.memberCode[0] : req.params.memberCode;
  const parsed = AssignClassroomUnitsBody.safeParse(req.body);
  if (!classroomId || !memberCode || !parsed.success
    || parsed.data.unitIds.some((id) => !UNIT_IDS.has(id))) {
    res.status(400).json({ error: "Choose one or more valid units to assign." });
    return;
  }
  const [classroom] = await db.select({ id: classroomsTable.id }).from(classroomsTable)
    .where(and(eq(classroomsTable.id, classroomId), eq(classroomsTable.ownerUserId, user.id)))
    .limit(1);
  if (!classroom) {
    res.status(404).json({ error: "That classroom was not found." });
    return;
  }
  const unitIds = [...new Set(parsed.data.unitIds)];
  const [profile] = await db.update(learnerProfilesTable)
    .set({ assignedUnitIds: unitIds, updatedAt: new Date() })
    .where(and(
      eq(learnerProfilesTable.classroomId, classroomId),
      eq(learnerProfilesTable.memberCode, memberCode),
    ))
    .returning({ memberCode: learnerProfilesTable.memberCode, assignedUnitIds: learnerProfilesTable.assignedUnitIds });
  if (!profile) {
    res.status(404).json({ error: "That learner code is not in this class." });
    return;
  }
  res.json({ memberCode: profile.memberCode!, unitIds: profile.assignedUnitIds });
});

export default router;
