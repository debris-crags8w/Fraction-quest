import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, progressTable } from "@workspace/db";
import { SaveProgressBody } from "@workspace/api-zod";
import { requireParentConsent, requireUser, type AuthedRequest } from "../middlewares/require-user";

const router: IRouter = Router();

// Generous for 27 lessons of worksheet drafts, small enough to stop abuse.
const MAX_PROGRESS_BYTES = 200_000;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

router.get("/progress", requireUser, requireParentConsent, async (req, res) => {
  const { user } = req as AuthedRequest;
  const [row] = await db.select().from(progressTable).where(eq(progressTable.userId, user.id)).limit(1);
  res.json({ progress: row?.progress ?? null, fun: row?.fun ?? null, updatedAt: row?.updatedAt ?? null });
});

router.put("/progress", requireUser, requireParentConsent, async (req, res) => {
  const { user } = req as AuthedRequest;
  const parsed = SaveProgressBody.safeParse(req.body);
  if (!parsed.success || !isPlainObject(parsed.data.progress) || !isPlainObject(parsed.data.fun)) {
    res.status(400).json({ error: "Progress data is not in the expected format." });
    return;
  }
  if (JSON.stringify(parsed.data).length > MAX_PROGRESS_BYTES) {
    res.status(400).json({ error: "Progress data is too large." });
    return;
  }
  const updatedAt = new Date();
  await db
    .insert(progressTable)
    .values({ userId: user.id, progress: parsed.data.progress, fun: parsed.data.fun, updatedAt })
    .onConflictDoUpdate({ target: progressTable.userId, set: { progress: parsed.data.progress, fun: parsed.data.fun, updatedAt } });
  res.json({ progress: parsed.data.progress, fun: parsed.data.fun, updatedAt });
});

export default router;
