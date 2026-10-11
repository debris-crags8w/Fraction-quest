import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, sessionsTable, usersTable, type User } from "@workspace/db";

const scrypt = promisify(scryptCb) as (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number }) => Promise<Buffer>;

const SCRYPT = { N: 16384, r: 8, p: 1 };
const KEY_LENGTH = 64;

export const SESSION_COOKIE = "fq_session";
const SESSION_DAYS = 30;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

/** Hash a password with scrypt and a random salt: `scrypt$N$r$p$salt$hash`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH, SCRYPT);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64"), key.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, saltB64, keyB64] = stored.split("$");
  if (algo !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Used when the username does not exist, so a wrong username takes as long as a wrong password.
let dummyHash: Promise<string> | null = null;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(randomBytes(16).toString("hex"));
  return dummyHash;
}

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

export function publicUser(user: User) {
  return { id: user.id, username: user.username, displayName: user.displayName };
}

/** Start a session for the user and set the httpOnly session cookie. */
export async function startSession(res: Response, userId: number): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await db.delete(sessionsTable).where(and(eq(sessionsTable.userId, userId), lt(sessionsTable.expiresAt, new Date())));
  await db.insert(sessionsTable).values({ tokenHash: hashToken(token), userId, expiresAt });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS,
  });
}

export async function endSession(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token === "string" && token) {
    await db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, hashToken(token)));
  }
  res.clearCookie(SESSION_COOKIE, { path: "/" });
}

/** The signed-in user for this request, or null. */
export async function getSessionUser(req: Request): Promise<User | null> {
  const token = req.cookies?.[SESSION_COOKIE];
  if (typeof token !== "string" || !token || token.length > 100) return null;
  const rows = await db
    .select({ user: usersTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(and(eq(sessionsTable.tokenHash, hashToken(token)), gt(sessionsTable.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}
