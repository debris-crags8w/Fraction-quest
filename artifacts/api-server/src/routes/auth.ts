import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { LoginBody, RecoverAccountBody, SetPasswordBody, SignupBody } from "@workspace/api-zod";
import {
  endAllSessions, endOtherSessions, endSession, getDummyHash, getSessionUser, hashPassword, makeRecoveryCode, normalizeRecoveryCode,
  normalizeUsername, PRIVACY_NOTICE_VERSION, publicUser, startSession, verifyPassword,
} from "../lib/auth";
import { createRateLimiter } from "../lib/rate-limit";

const router: IRouter = Router();

const loginFailures = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });
const signupsPerIp = createRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 });
const recoveryFailures = createRateLimiter({ max: 10, windowMs: 15 * 60 * 1000 });
const recoveryPerIp = createRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 });

/** A fresh recovery code: returns the code to show once, and the hash to store. */
async function freshRecoveryCode(): Promise<{ code: string; hash: string }> {
  const code = makeRecoveryCode();
  return { code, hash: await hashPassword(normalizeRecoveryCode(code)) };
}

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
  const recovery = await freshRecoveryCode();
  const inserted = await db.insert(usersTable).values({
    username,
    displayName,
    passwordHash,
    recoveryCodeHash: recovery.hash,
    parentConsentAt: new Date(),
    privacyNoticeVersion: PRIVACY_NOTICE_VERSION,
  }).onConflictDoNothing().returning();
  if (!inserted[0]) {
    res.status(409).json({ error: "That username is taken. Try adding a number." });
    return;
  }
  signupsPerIp.hit(ip);
  await startSession(res, inserted[0].id);
  res.status(201).json({ ...publicUser(inserted[0]), recoveryCode: recovery.code });
});

// Forgot the password: username + the recovery code from sign-up. No email needed.
router.post("/auth/recover", async (req, res) => {
  const parsed = RecoverAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Enter the username, the recovery code, and a new password of at least 8 characters." });
    return;
  }
  const ip = req.ip ?? "unknown";
  const username = normalizeUsername(parsed.data.username);
  const key = `${ip}|${username}`;
  if (recoveryFailures.isLimited(key) || recoveryPerIp.isLimited(ip)) {
    res.status(429).json({ error: "Too many tries. Wait 15 minutes, or ask a grown-up for help." });
    return;
  }
  recoveryPerIp.hit(ip);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.username, username)).limit(1);
  const ok = await verifyPassword(normalizeRecoveryCode(parsed.data.recoveryCode), user?.recoveryCodeHash ?? (await getDummyHash()));
  if (!user || !user.recoveryCodeHash || !ok) {
    recoveryFailures.hit(key);
    res.status(401).json({ error: "That username and recovery code don't match." });
    return;
  }
  recoveryFailures.reset(key);
  // The used code stops working: a new one replaces it, and every other device is signed out.
  const recovery = await freshRecoveryCode();
  const [updated] = await db.update(usersTable)
    .set({ passwordHash: await hashPassword(parsed.data.newPassword), recoveryCodeHash: recovery.hash })
    .where(eq(usersTable.id, user.id)).returning();
  await endAllSessions(user.id);
  await startSession(res, user.id);
  res.json({ ...publicUser(updated), recoveryCode: recovery.code });
});

// A new recovery code from a signed-in device (the old one stops working).
router.post("/auth/recovery-code", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const recovery = await freshRecoveryCode();
  await db.update(usersTable).set({ recoveryCodeHash: recovery.hash }).where(eq(usersTable.id, user.id));
  res.json({ recoveryCode: recovery.code });
});

// A grown-up's reset: set a new password from a device that is still signed in. Other devices are signed out.
router.post("/auth/password", async (req, res) => {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const parsed = SetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Passwords need 8 to 72 characters." });
    return;
  }
  await db.update(usersTable).set({ passwordHash: await hashPassword(parsed.data.newPassword) }).where(eq(usersTable.id, user.id));
  await endOtherSessions(req, user.id);
  res.status(204).end();
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
