import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { count, eq, gt, isNotNull } from "drizzle-orm";
import { db, progressTable, sessionsTable, usersTable } from "@workspace/db";
import { endAllSessions, hashPassword } from "../lib/auth";
import { createRateLimiter } from "../lib/rate-limit";
import { logger } from "../lib/logger";

// Admin tools for managing accounts. Disabled unless the server has ADMIN_TOKEN (32+ characters) and ADMIN_TOTP_SECRET set.
// Nothing in the learner app links here; every data route needs the token in an Authorization header.
const router: IRouter = Router();
const failures = createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
// Also cap failures across all IPs, so rotating or spoofed addresses can't brute-force the token.
const globalFailures = createRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 });
// Optional: ADMIN_ALLOWED_IPS="1.2.3.4,5.6.7.8" hides the admin from every other address (404).
const allowedIps = () => (process.env.ADMIN_ALLOWED_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ipAllowed = (ip: string) => !allowedIps().length || allowedIps().includes(ip);

const digest = (s: string) => createHash("sha256").update(s).digest();

// Second factor: a 6-digit authenticator-app code (TOTP, RFC 6238). ADMIN_TOTP_SECRET is a base32 secret;
// create one with:  node -e "const a='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';console.log([...require('crypto').randomBytes(20)].map(b=>a[b%32]).join(''))"
// then add it to the authenticator app as a manual-entry key (SHA1, 6 digits, 30 seconds).
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Decode(input: string): Buffer {
  let bits = 0, value = 0;
  const out: number[] = [];
  for (const ch of input.replace(/[\s=]/g, "").toUpperCase()) {
    const idx = B32.indexOf(ch);
    if (idx < 0) return Buffer.alloc(0);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; }
  }
  return Buffer.from(out);
}
function totpAt(key: Buffer, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1]! & 15;
  const n = ((h[o]! & 127) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, "0");
}
// After one successful login (token + code) the page gets a 15-minute in-memory session token for later calls.
const SESSION_MS = 15 * 60 * 1000;
const sessions = new Map<string, number>();
let lastUsedStep = 0;
/** Accepts the current code or one step either side (clock drift); each step can be used only once. */
function checkTotp(secret: string, code: string): boolean {
  const key = base32Decode(secret);
  if (key.length < 10 || !/^\d{6}$/.test(code)) return false;
  const now = Math.floor(Date.now() / 30000);
  for (const step of [now - 1, now, now + 1]) {
    if (step > lastUsedStep && timingSafeEqual(Buffer.from(totpAt(key, step)), Buffer.from(code))) {
      lastUsedStep = step;
      return true;
    }
  }
  return false;
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_TOKEN;
  const totpSecret = process.env.ADMIN_TOTP_SECRET;
  if (!expected || expected.length < 32 || !totpSecret || base32Decode(totpSecret).length < 10) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  const ip = req.ip ?? "unknown";
  if (!ipAllowed(ip)) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  // Mutations must come from this server's own page, not another site.
  const origin = req.get("origin");
  if (req.method !== "GET" && origin && origin !== `${req.protocol}://${req.get("host")}`) {
    res.status(403).json({ error: "Forbidden." });
    return;
  }
  if (failures.isLimited(ip) || globalFailures.isLimited("all")) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }
  const header = req.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  // Check both factors without revealing which one was wrong.
  const isLogin = req.path === "/admin/login";
  for (const [k, exp] of sessions) if (exp <= Date.now()) sessions.delete(k);
  const sessionOk = !isLogin && sessions.has(given);
  const tokenOk = timingSafeEqual(digest(given), digest(expected));
  const codeOk = isLogin ? checkTotp(totpSecret, (req.get("x-admin-code") ?? "").trim()) : false;
  if (!sessionOk && !(isLogin && tokenOk && codeOk)) {
    failures.hit(ip);
    globalFailures.hit("all");
    logger.warn({ ip }, "admin auth failed");
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") logger.info({ ip, method: req.method, path: req.path }, "admin action");
  next();
}

// The page itself holds no data and is not indexed; it only collects the token and calls the API below.
router.get("/admin", (req, res) => {
  if (!process.env.ADMIN_TOKEN || !ipAllowed(req.ip ?? "unknown")) {
    res.status(404).end();
    return;
  }
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'");
  res.type("html").send(ADMIN_PAGE);
});

router.post("/admin/login", requireAdmin, (req, res) => {
  const session = randomBytes(32).toString("base64url");
  sessions.set(session, Date.now() + SESSION_MS);
  logger.info({ ip: req.ip }, "admin login");
  res.json({ session });
});

// Aggregate counts only: no learner names or progress contents.
router.get("/admin/stats", requireAdmin, async (_req, res) => {
  const now = Date.now();
  const n = async (q: Promise<{ n: number }[]>) => (await q)[0]?.n ?? 0;
  const [accounts, newDay, newWeek, withConsent, withProgress, activeSessions, progressWeek] = await Promise.all([
    n(db.select({ n: count() }).from(usersTable)),
    n(db.select({ n: count() }).from(usersTable).where(gt(usersTable.createdAt, new Date(now - 864e5)))),
    n(db.select({ n: count() }).from(usersTable).where(gt(usersTable.createdAt, new Date(now - 7 * 864e5)))),
    n(db.select({ n: count() }).from(usersTable).where(isNotNull(usersTable.parentConsentAt))),
    n(db.select({ n: count() }).from(progressTable)),
    n(db.select({ n: count() }).from(sessionsTable).where(gt(sessionsTable.expiresAt, new Date(now)))),
    n(db.select({ n: count() }).from(progressTable).where(gt(progressTable.updatedAt, new Date(now - 7 * 864e5)))),
  ]);
  res.json({ accounts, newDay, newWeek, withConsent, withProgress, activeSessions, progressWeek });
});

router.get("/admin/users", requireAdmin, async (_req, res) => {
  const rows = await db.select({
    id: usersTable.id, username: usersTable.username, displayName: usersTable.displayName,
    parentConsentAt: usersTable.parentConsentAt, createdAt: usersTable.createdAt,
  }).from(usersTable).orderBy(usersTable.id);
  res.json({ users: rows });
});

router.post("/admin/users/:id/password", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const password = req.body?.password;
  if (!Number.isInteger(id) || typeof password !== "string" || password.length < 8 || password.length > 200) {
    res.status(400).json({ error: "Password must be 8–200 characters." });
    return;
  }
  const updated = await db.update(usersTable).set({ passwordHash: await hashPassword(password) })
    .where(eq(usersTable.id, id)).returning({ id: usersTable.id });
  if (!updated.length) {
    res.status(404).json({ error: "No such account." });
    return;
  }
  await endAllSessions(id);
  res.json({ ok: true });
});

router.post("/admin/users/:id/sign-out", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Bad id." });
    return;
  }
  await endAllSessions(id);
  res.json({ ok: true });
});

router.delete("/admin/users/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ error: "Bad id." });
    return;
  }
  const deleted = await db.delete(usersTable).where(eq(usersTable.id, id)).returning({ id: usersTable.id });
  if (!deleted.length) {
    res.status(404).json({ error: "No such account." });
    return;
  }
  res.json({ ok: true });
});

const ADMIN_PAGE = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow">
<title>Admin</title><style>body{font:14px system-ui;margin:2rem}td,th{padding:4px 10px;text-align:left}button{margin-right:4px}</style>
<h1>Account admin</h1>
<p><input id="t" type="password" placeholder="Admin token" autocomplete="off"> <input id="c" placeholder="6-digit code" inputmode="numeric" maxlength="6" autocomplete="one-time-code" size="8"> <button id="go">Load</button> <span id="m"></span></p>
<p id="st"></p>
<table id="tb"></table>
<script>
const $=id=>document.getElementById(id);let tok="";
const msg=s=>$("m").textContent=s;
async function api(path,method,body){
  const r=await fetch("/api/admin"+path,{method:method||"GET",headers:{Authorization:"Bearer "+tok,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);return j;
}
function cell(tr,text){const td=document.createElement("td");td.textContent=text;tr.appendChild(td);return td}
function btn(td,label,fn){const b=document.createElement("button");b.textContent=label;b.onclick=async()=>{try{await fn();msg("Done.")}catch(e){msg(e.message)}};td.appendChild(b)}
async function load(){
  try{
    if(!tok){const r=await fetch("/api/admin/login",{method:"POST",headers:{Authorization:"Bearer "+$("t").value,"X-Admin-Code":$("c").value}});
      $("t").value="";$("c").value="";const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);tok=j.session}
    const S=await api("/stats");$("st").textContent="Accounts: "+S.accounts+" | New 24h: "+S.newDay+" | New 7d: "+S.newWeek+" | Parent consent: "+S.withConsent+" | Saved progress: "+S.withProgress+" | Active learners 7d: "+S.progressWeek+" | Signed-in sessions: "+S.activeSessions;
    const {users}=await api("/users");const tb=$("tb");tb.textContent="";
    for(const u of users){const tr=tb.insertRow();cell(tr,u.id);cell(tr,u.username);cell(tr,u.displayName);cell(tr,(u.createdAt||"").slice(0,10));
      const a=cell(tr,"");
      btn(a,"Reset password",async()=>{const p=prompt("New password (8+ chars) for "+u.username);if(p)await api("/users/"+u.id+"/password","POST",{password:p})});
      btn(a,"Sign out",()=>api("/users/"+u.id+"/sign-out","POST"));
      btn(a,"Delete",async()=>{if(confirm("Delete "+u.username+" and all progress?")){await api("/users/"+u.id,"DELETE");load2()}});}
    msg(users.length+" accounts");
  }catch(e){tok="";msg(e.message)}
}
const load2=load;
$("go").onclick=load;
</script>`;

export default router;
