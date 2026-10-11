import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, SignupBody } from "@workspace/api-zod";
import { endSession, getDummyHash, getSessionUser, hashPassword, normalizeUsername, PRIVACY_NOTICE_VERSION, publicUser, startSession, verifyPassword } from "../lib/auth";
import { createRateLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

const loginFailures = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });
const signupsPerIp = createRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 });

router.post("/auth/signup", async (req, res) => {
  const ip = req.ip ?? "unknown";
  if (signupsPerIp.isLimited(ip)) {
    res.status(429).json({ error: "Too many new accounts from here. Try again later." });
    return;
  }
  const parsed = SignupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Usernames are 3–20 letters, numbers or _. Passwords need at least 8 characters, and a parent or caregiver must accept the privacy notice." });
    return;
  }
  if (!parsed.data.parentConsent) {
    res.status(400).json({ error: "A parent or caregiver must review and accept the privacy notice before an account can save learning progress." });
    return;
  }
  const username = normalizeUsername(parsed.data.username);
  const displayName = parsed.data.displayName.trim();
  if (!displayName) {
    res.status(400).json({ error: "Please enter a name to show in the app." });
    return;
  }
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.username, username)).limit(1);
  if (existing.length) {
    res.status(409).json({ error: "That username is taken. Try adding a number." });
    return;
  }
  const passwordHash = await hashPassword(parsed.data.password);
  const inserted = await db.insert(usersTable).values({
    username,
    displayName,
    passwordHash,
    parentConsentAt: new Date(),
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
  }).onConflictDoNothing().returning();
  if (!inserted[0]) {
    res.status(409).json({ error: "That username is taken. Try adding a number." });
    return;
  }
  signupsPerIp.hit(ip);
  await startSession(res, inserted[0].id);
  res.status(201).json(publicUser(inserted[0]));
});

router.post("/auth/login", async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter your username and password." });
    return;
  }
  const username = normalizeUsername(parsed.data.username);
  const key = `${req.ip ?? "unknown"}|${username}`;
  if (loginFailures.isLimited(key)) {
    res.status(429).json({ error: "Too many tries. Wait 15 minutes, or ask a grown-up for help." });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) {
    loginFailures.hit(key);
    res.status(401).json({ error: "That username and password don't match." });
    return;
  }
  loginFailures.reset(key);
  await startSession(res, user.id);
  res.json(publicUser(user));
});

router.post("/auth/logout", async (req, res) => {
  await endSession(req, res);
  res.status(204).end();
});

router.get("/auth/me", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  res.json(publicUser(user));
});

export default router;
