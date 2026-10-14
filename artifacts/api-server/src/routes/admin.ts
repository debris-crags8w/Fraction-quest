import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { count, eq, gt, isNotNull } from "drizzle-orm";
import { db, progressTable, sessionsTable, usersTable } from "@workspace/db";
import { endAllSessions, hashPassword, normalizeUsername } from "../lib/auth";
import { createRateLimiter } from "../lib/rate-limit";
import { logger } from "../lib/logger";
import { buildDashboard } from "../lib/dashboard";
import { logSummary, recentLogs } from "../lib/log-buffer";

// Admin tools for managing accounts. Disabled unless the server has ADMIN_TOKEN (32+ characters) and ADMIN_TOTP_SECRET set.
// Nothing in the learner app links here; every data route needs the token in an Authorization header.
const router: IRouter = Router();
const failures = createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
// Also cap failures across all IPs, so rotating or spoofed addresses can't brute-force the token.
const globalFailures = createRateLimiter({ max: 30, windowMs: 60 * 60 * 1000 });
// Optional: ADMIN_ALLOWED_IPS="1.2.3.4,5.6.7.8" hides the admin from every other address (404).
const allowedIps = () => (process.env.ADMIN_ALLOWED_IPS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ipAllowed = (ip: string) => !allowedIps().length || allowedIps().includes(ip);

// Recent admin events kept in memory (cleared on restart) for the dashboard; the logger keeps the permanent record.
const audit: { at: number; kind: "login" | "failed" | "action" | "view"; detail: string }[] = [];
const record = (kind: "login" | "failed" | "action" | "view", detail: string) => {
  audit.push({ at: Date.now(), kind, detail });
  if (audit.length > 200) audit.shift();
};

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
function hasValidTotpSecret(secret = process.env.ADMIN_TOTP_SECRET): boolean {
  return Boolean(secret && base32Decode(secret).length >= 10);
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
  if (!expected || expected.length < 32 || !totpSecret || !hasValidTotpSecret(totpSecret)) {
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
    record("failed", ip);
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && !isLogin) {
    logger.info({ ip, method: req.method, path: req.path }, "admin action");
    record("action", `${req.method} ${req.path.replace(/\/\d+/g, "/:id")}`);
  }
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
  const configReady = (process.env.ADMIN_TOKEN?.length ?? 0) >= 32 && hasValidTotpSecret();
  const status = configReady
    ? '<p id="setup-status" class="setup-ready" role="status">Setup is complete. Sign in with your admin token and a fresh six-digit authenticator code.</p>'
    : '<p id="setup-status" class="setup-needed" role="status">Setup is incomplete. Add both required secrets below, then restart the API Server before signing in.</p>';
  res.type("html").send(ADMIN_PAGE.replace("<!-- admin-setup-status -->", status));
});

router.post("/admin/login", requireAdmin, (req, res) => {
  const session = randomBytes(32).toString("base64url");
  sessions.set(session, Date.now() + SESSION_MS);
  logger.info({ ip: req.ip }, "admin login");
  record("login", req.ip ?? "unknown");
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

// Progress summary for one account, looked up by username. Summary numbers only, not answers or worksheet drafts.
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
router.get("/admin/progress/:username", requireAdmin, async (req, res) => {
  const username = normalizeUsername(String(req.params.username)).slice(0, 40);
  const [row] = await db.select({
    username: usersTable.username, displayName: usersTable.displayName, progress: progressTable.progress,
    fun: progressTable.fun, updatedAt: progressTable.updatedAt,
  }).from(usersTable).leftJoin(progressTable, eq(progressTable.userId, usersTable.id))
    .where(eq(usersTable.username, username)).limit(1);
  if (!row) {
    res.status(404).json({ error: "No such account." });
    return;
  }
  const p = (row.progress ?? {}) as Record<string, any>;
  const f = (row.fun ?? {}) as Record<string, any>;
  const stars = Object.values(p.starsByMission ?? {}).reduce((sum: number, v) => sum + num(v), 0);
  const days = Object.entries((f.activity ?? {}) as Record<string, { minutes?: number; answered?: number }>)
    .sort(([a], [b]) => (a < b ? -1 : 1)).slice(-14)
    .map(([day, a]) => ({ day, minutes: num(a?.minutes), answered: num(a?.answered) }));
  logger.info({ ip: req.ip, username }, "admin viewed progress");
  record("view", "progress lookup");
  res.json({
    username: row.username, displayName: row.displayName, hasProgress: !!row.progress, updatedAt: row.updatedAt,
    lessonsCompleted: Array.isArray(p.completedMissionIds) ? p.completedMissionIds.length : 0,
    stars, xp: num(f.xp), dayStreak: num(f.dayStreak), lastActiveDay: f.lastActiveDay ?? null,
    assessments: Array.isArray(p.assessments) ? p.assessments.length : 0, recentDays: days,
  });
});

// Dashboard: aggregates only, cached for a minute per range (?fresh=1 skips the cache for the refresh button).
const dashboardCache = new Map<number, { at: number; body: unknown }>();
router.get("/admin/dashboard", requireAdmin, async (req, res) => {
  const requested = Number(req.query.days);
  const days = [7, 30, 90].includes(requested) ? requested : 30;
  const hit = dashboardCache.get(days);
  let body = hit && Date.now() - hit.at < 60_000 && req.query.fresh !== "1" ? (hit.body as Record<string, unknown>) : null;
  if (!body) {
    const rows = await db.select({
      username: usersTable.username, createdAt: usersTable.createdAt, consent: usersTable.parentConsentAt,
      recovery: usersTable.recoveryCodeHash, progress: progressTable.progress, fun: progressTable.fun,
    }).from(usersTable).leftJoin(progressTable, eq(progressTable.userId, usersTable.id));
    body = buildDashboard(rows.map((r) => ({
      username: r.username, createdAt: r.createdAt, hasConsent: !!r.consent, hasRecoveryCode: !!r.recovery,
      progress: r.progress, fun: r.fun,
    })), days) as Record<string, unknown>;
    dashboardCache.set(days, { at: Date.now(), body });
  }
  const dayAgo = Date.now() - 864e5;
  const [session] = await db.select({ n: count() }).from(sessionsTable).where(gt(sessionsTable.expiresAt, new Date()));
  res.json({
    ...body,
    operations: {
      activeSessions: session?.n ?? 0,
      failedAdminLogins24h: audit.filter((e) => e.kind === "failed" && e.at > dayAgo).length,
      recentAdminEvents: audit.slice(-10).reverse().map((e) => ({ at: new Date(e.at).toISOString(), kind: e.kind, detail: e.detail })),
    },
  });
});

// Recent server log entries (warnings, errors, failed and slow requests) from the in-memory buffer.
router.get("/admin/logs", requireAdmin, (req, res) => {
  const level = ["info", "warn", "error"].includes(String(req.query.level)) ? String(req.query.level) : "warn";
  res.json({
    summary: logSummary(),
    entries: recentLogs({ level, limit: 100 }).map((e) => ({ ...e, at: new Date(e.at).toISOString() })),
  });
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

const ADMIN_PAGE = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin</title><style>
body{font:14px system-ui;margin:0;background:#f4f6fb;color:#1b2233}header{background:#1f2a44;color:#fff;padding:14px 24px}main{padding:20px 24px}
section{margin-bottom:22px}h2{font-size:15px;margin:0 0 8px}.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.c{background:#fff;border-radius:10px;padding:12px;box-shadow:0 1px 3px #0002;cursor:default}.c b{display:block;font-size:26px}.c small{color:#667}.up{color:#18794e}.down{color:#b42318}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}.box{background:#fff;border-radius:10px;padding:14px;box-shadow:0 1px 3px #0002}
table{border-collapse:collapse;width:100%}td,th{padding:5px 8px;text-align:left;border-bottom:1px solid #eee}tr.go{cursor:pointer}tr.go:hover{background:#f0f4ff}
.bar{display:flex;align-items:center;gap:6px;margin:3px 0}.bar i{display:block;height:12px;background:#4a6fdc;border-radius:3px}.bar span{min-width:90px}
.muted{color:#667085}button{margin-right:4px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f6fb;padding:10px;border-radius:8px}#login{margin:16px 0}
.setup{max-width:900px;margin-bottom:16px}.setup ol{padding-left:22px}.setup li{margin:8px 0}.setup-ready{color:#18794e}.setup-needed{color:#9a6700}
.login-field{display:inline-grid;gap:4px;margin:8px 12px 8px 0}.login-field input{font:inherit;padding:8px;max-width:100%}
</style>
<header><b>Fraction Quest Admin</b></header><main>
<!-- admin-setup-status -->
<details class="box setup" open>
<summary><strong>First-time setup: connect your authenticator</strong></summary>
<ol>
<li>Generate two separate random values in a private shell. Keep the output private; do not commit it or paste it into chat. The first is the admin token. The second is the authenticator secret.</li>
<li>In Replit Secrets, save the values under the exact names <code>ADMIN_TOKEN</code> and <code>ADMIN_TOTP_SECRET</code>.</li>
<li>In your authenticator app, add an account using the <code>ADMIN_TOTP_SECRET</code> value as a manual setup key. Choose time-based codes, SHA1, 6 digits, and a 30-second period. The code in the app changes every 30 seconds.</li>
<li>Restart the API Server workflow. Return here and sign in with <code>ADMIN_TOKEN</code> and the current six-digit code. The page never displays either saved secret.</li>
</ol>
<p>Generate the values with Node.js:</p>
<pre><code>node -e 'const c=require("node:crypto"),a="ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";let n=0,v=0,s="";for(const b of c.randomBytes(20)){v=v*256+b;n+=8;while(n&gt;=5){const p=2**(n-5);s+=a[Math.floor(v/p)%32];v%=p;n-=5}}if(n)s+=a[v*2**(5-n)];console.log("ADMIN_TOKEN="+c.randomBytes(32).toString("base64url"));console.log("ADMIN_TOTP_SECRET="+s)'</code></pre>
<p class="muted">The admin token must be at least 32 characters. If this page is hidden, check that <code>ADMIN_TOKEN</code> exists and that any <code>ADMIN_ALLOWED_IPS</code> restriction includes your current IP.</p>
</details>
<div id="login" class="box">
<label class="login-field" for="t"><strong>Admin token</strong><input id="t" name="admin-token" type="password" autocomplete="off" required></label>
<label class="login-field" for="c"><strong>Current authenticator code</strong><input id="c" name="authenticator-code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" required></label>
<button id="go" type="button">Sign in</button> <span id="m" role="alert" aria-live="polite"></span></div>
<div id="app" hidden>
<p>Range: <select id="rng"><option value="7">7 days</option><option value="30" selected>30 days</option><option value="90">90 days</option></select>
<button id="rf">Refresh</button> <span class="muted" id="ts"></span></p>
<section><h2>Key numbers</h2><div class="cards" id="cards"></div></section>
<section class="grid">
<div class="box"><h2>Active learners per day</h2><div id="trend"></div><div class="muted" id="trendnote"></div></div>
<div class="box"><h2>Unit funnel (started / passed one / finished)</h2><div id="funnel"></div></div>
<div class="box"><h2>Where learners get stuck</h2><div id="struggles"></div></div>
</section>
<section class="grid">
<div class="box"><h2>Engagement</h2><div id="eng"></div></div>
<div class="box"><h2>Learning outcomes</h2><div id="out"></div></div>
<div class="box"><h2>Modes used (learners)</h2><div id="modes"></div></div>
<div class="box"><h2>Needs attention</h2><div id="att"></div></div>
<div class="box"><h2>System and trust</h2><div id="ops"></div></div>
</section>
<section class="box"><h2>Server logs</h2><div id="logsum" class="muted"></div>
<p>Show: <select id="lvl"><option value="warn">Warnings and errors</option><option value="error">Errors only</option><option value="info">All kept entries</option></select> <button id="lr">Refresh logs</button></p>
<table id="logs"></table></section>
<section class="box"><h2>Progress by username</h2><input id="u" placeholder="Username" autocomplete="off"> <button id="pg">Show progress</button><pre id="pr"></pre></section>
<section class="box"><h2>Accounts</h2><table id="tb"></table></section>
</div>
<script>
const $=id=>document.getElementById(id);let tok="";
const msg=s=>$("m").textContent=s;
async function api(path,method,body){
  const r=await fetch("/api/admin"+path,{method:method||"GET",headers:{Authorization:"Bearer "+tok,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);return j;
}
function el(tag,text,cls){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e}
function cell(tr,text){const td=document.createElement("td");td.textContent=text;tr.appendChild(td);return td}
function btn(td,label,fn){const b=el("button",label);b.onclick=async()=>{try{await fn();msg("Done.")}catch(e){msg(e.message)}};td.appendChild(b)}
const dash=v=>v===null||v===undefined?"-":v;
function line(box,text,cls){box.appendChild(el("div",text,cls))}
function bars(box,items,max){const m=max||Math.max(1,...items.map(i=>i[1]||0));
  for(const [label,val,extra] of items){const d=el("div","","bar");d.appendChild(el("span",label));const b=document.createElement("i");b.style.width=Math.round(((val||0)/m)*160)+"px";d.appendChild(b);d.appendChild(el("span",dash(val)+(extra||"")));box.appendChild(d)}}
function hidden(box){line(box,"Too few learners to show (needs 5+).","muted")}
function card(host,label,value,delta){const c=el("div","","c");c.appendChild(el("b",dash(value)));c.appendChild(el("small",label));
  if(delta!==undefined&&delta!==null){const d=el("div",(delta>0?"+":"")+delta+" vs previous",delta>=0?"up":"down");d.style.fontSize="12px";c.appendChild(d)}host.appendChild(c)}
function trend(box,pts){box.textContent="";const W=320,H=90,ns="http://www.w3.org/2000/svg",svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox","0 0 "+W+" "+H);svg.setAttribute("width","100%");const max=Math.max(1,...pts.map(p=>p.active));
  const g=document.createElementNS(ns,"polyline");g.setAttribute("fill","none");g.setAttribute("stroke","#4a6fdc");g.setAttribute("stroke-width","2");
  g.setAttribute("points",pts.map((p,i)=>(pts.length<2?0:i*(W/(pts.length-1)))+","+(H-4-(p.active/max)*(H-12))).join(" "));svg.appendChild(g);box.appendChild(svg);
  line(box,"Peak "+max+" learners/day; "+pts.length+" days","muted")}
async function dashboard(fresh){
  const D=await api("/dashboard?days="+$("rng").value+(fresh?"&fresh=1":""));const C=D.cards,cur=C.current,prev=C.previous;
  const dl=k=>prev?cur[k]-prev[k]:null;
  const cards=$("cards");cards.textContent="";
  card(cards,"Accounts",C.accounts);card(cards,"New accounts",cur.newAccounts,dl("newAccounts"));card(cards,"Active learners",cur.activeLearners,dl("activeLearners"));
  card(cards,"Active last 7 days",C.weeklyActive);card(cards,"Minutes learned",cur.minutes,dl("minutes"));card(cards,"Answers",cur.answers,dl("answers"));
  card(cards,"Never saved progress",C.noProgressYet);card(cards,"Needs attention",D.needsAttention.count);
  trend($("trend"),D.trend.points);$("trendnote").textContent=D.trend.note||"";
  const f=$("funnel");f.textContent="";if(!D.funnel)hidden(f);else for(const u of D.funnel){const d=el("div","","bar");d.appendChild(el("span","Unit "+u.unit));
    if(u.started===null)d.appendChild(el("span","fewer than 5","muted"));else{const b=document.createElement("i");b.style.width=Math.round(u.started/Math.max(1,C.learnersWithProgress)*160)+"px";d.appendChild(b);d.appendChild(el("span",u.started+" / "+u.passedOne+" / "+u.finished))}f.appendChild(d)}
  const s=$("struggles");s.textContent="";if(!D.struggles)hidden(s);else{
    const t=document.createElement("table");const h=t.insertRow();for(const x of["Lesson","Unit","Started","Pass %","Avg tries"]){const th=document.createElement("th");th.textContent=x;h.appendChild(th)}
    for(const r of D.struggles.lowestPassRate){const tr=t.insertRow();cell(tr,r.id);cell(tr,r.unit);cell(tr,r.started);cell(tr,dash(r.passRate));cell(tr,dash(r.avgCheckAttempts))}
    s.appendChild(t);if(!D.struggles.lowestPassRate.length)line(s,"No lesson has 5+ learners yet.","muted");
    if(D.struggles.reviewQueueByLesson.length){line(s,"Most re-queued lessons:","muted");for(const r of D.struggles.reviewQueueByLesson)line(s,r.id+" ("+r.count+")")}
    if(D.struggles.commonMisconceptions.length){line(s,"Common misconceptions:","muted");for(const r of D.struggles.commonMisconceptions)line(s,r.key+" ("+r.count+")")}}
  const e=$("eng");e.textContent="";line(e,"Retention day 7: "+dash(D.retention.day7.percent)+"% of "+D.retention.day7.eligible+" accounts");line(e,"Retention day 30: "+dash(D.retention.day30.percent)+"% of "+D.retention.day30.eligible+" accounts");
  line(e,"Avg minutes per active day: "+dash(C.avgMinutesPerActiveDay));line(e,"Avg answers per active day: "+dash(C.avgAnswersPerActiveDay));
  if(D.streaks)bars(e,[["No streak",D.streaks.none],["1-2 days",D.streaks.short],["3-6 days",D.streaks.medium],["7+ days",D.streaks.long]]);else hidden(e);
  const o=$("out");o.textContent="";if(!D.outcomes)hidden(o);else{line(o,"Avg stars per lesson: "+dash(D.outcomes.avgStars));line(o,"Passed on first try: "+dash(D.outcomes.firstTryShare)+"%");line(o,"Level quiz taken: "+D.outcomes.placementTaken);
    line(o,"Check scores:","muted");const a=D.outcomes.assessmentScores;bars(o,[["Under 50%",a.under50],["50-74%",a.from50],["75-99%",a.from75],["100%",a.perfect]])}
  const m=$("modes");m.textContent="";if(!D.modes)hidden(m);else bars(m,[["Fraction Race",D.modes.race],["Code Quest",D.modes.codeQuest],["Code Sprint",D.modes.codeSprint],["Part Finder",D.modes.partFinder],["Daily practice",D.modes.dailyPractice],["Checks",D.modes.assessment]]);
  const n=$("att");n.textContent="";line(n,D.needsAttention.count+" learners");for(const x of D.needsAttention.list){const d=el("div",x.username+" - "+x.reason);d.style.cursor="pointer";d.onclick=()=>{$("u").value=x.username;$("pg").onclick()};n.appendChild(d)}
  const p=$("ops");p.textContent="";const O=D.operations;line(p,"Signed-in sessions: "+O.activeSessions);line(p,"Failed admin logins (24h): "+O.failedAdminLogins24h);
  line(p,"Parent consent: "+dash(D.health.consentPercent)+"%");line(p,"No recovery code: "+D.health.noRecoveryCode);line(p,"Recent admin events:","muted");
  for(const v of O.recentAdminEvents)line(p,v.at.slice(11,19)+" "+v.kind+" "+v.detail);
  $("ts").textContent="Updated "+D.generatedAt.slice(11,19)+" UTC";
}
async function logs(){
  const L=await api("/logs?level="+$("lvl").value),S=L.summary;
  $("logsum").textContent="Errors (24h): "+S.errors24h+" | Warnings (24h): "+S.warnings24h+" | Requests since start: "+S.requestsSinceStart+" | 4xx: "+S.status4xxSinceStart+" | 5xx: "+S.status5xxSinceStart+" (in memory, cleared on restart)";
  const t=$("logs");t.textContent="";const h=t.insertRow();for(const x of["Time (UTC)","Level","Message","Request","Status","ms","Detail"]){const th=document.createElement("th");th.textContent=x;h.appendChild(th)}
  for(const e of L.entries){const tr=t.insertRow();cell(tr,e.at.slice(5,19).replace("T"," "));const lv=cell(tr,e.level);if(e.level==="error"||e.level==="fatal")lv.className="down";
    cell(tr,e.msg);cell(tr,((e.method||"")+" "+(e.path||"")).trim());cell(tr,dash(e.status));cell(tr,dash(e.ms));cell(tr,(e.error||"")+(e.ip?" ["+e.ip+"]":""))}
  if(!L.entries.length){const tr=t.insertRow();cell(tr,"Nothing to show.")}
}
async function load(){
  try{
    if(!tok){const r=await fetch("/api/admin/login",{method:"POST",headers:{Authorization:"Bearer "+$("t").value,"X-Admin-Code":$("c").value}});
      $("t").value="";$("c").value="";const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||r.status);tok=j.session}
    $("app").hidden=false;msg("");await dashboard(false);await logs();
    const {users}=await api("/users");const tb=$("tb");tb.textContent="";
    for(const u of users){const tr=tb.insertRow();tr.className="go";cell(tr,u.id);cell(tr,u.username);cell(tr,u.displayName);cell(tr,(u.createdAt||"").slice(0,10));
      tr.onclick=ev=>{if(ev.target.tagName!=="BUTTON"){$("u").value=u.username;$("pg").onclick()}};
      const a=cell(tr,"");
      btn(a,"Reset password",async()=>{const p=prompt("New password (8+ chars) for "+u.username);if(p)await api("/users/"+u.id+"/password","POST",{password:p})});
      btn(a,"Sign out",()=>api("/users/"+u.id+"/sign-out","POST"));
      btn(a,"Delete",async()=>{if(confirm("Delete "+u.username+" and all progress?")){await api("/users/"+u.id,"DELETE");load()}});}
  }catch(e){tok="";$("app").hidden=true;msg(e.message)}
}
$("go").onclick=load;
$("rng").onchange=()=>dashboard(false).catch(e=>msg(e.message));
$("rf").onclick=()=>dashboard(true).catch(e=>msg(e.message));
$("lr").onclick=()=>logs().catch(e=>msg(e.message));
$("lvl").onchange=$("lr").onclick;
$("pg").onclick=async()=>{try{const d=await api("/progress/"+encodeURIComponent($("u").value.trim()));
  $("pr").textContent=d.username+" ("+d.displayName+")\\n"+(d.hasProgress?"Lessons done: "+d.lessonsCompleted+" | Stars: "+d.stars+" | XP: "+d.xp+" | Day streak: "+d.dayStreak+" | Checks: "+d.assessments+"\\nLast saved: "+d.updatedAt+" | Last active: "+d.lastActiveDay+"\\nLast 14 days (minutes / answers):\\n"+d.recentDays.map(x=>x.day+"  "+x.minutes+" / "+x.answered).join("\\n"):"No saved progress yet.");msg("")}catch(e){msg(e.message)}};
</script>`;

export default router;
