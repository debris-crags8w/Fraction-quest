import { createHash, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { endAllSessions, hashPassword } from "../lib/auth";
import { createRateLimiter } from "../lib/rate-limit";

// Admin tools for managing accounts. Disabled unless the server has ADMIN_TOKEN set (16+ characters).
// Nothing in the learner app links here; every data route needs the token in an Authorization header.
const router: IRouter = Router();
const failures = createRateLimiter({ max: 5, windowMs: 15 * 60 * 1000 });

const digest = (s: string) => createHash("sha256").update(s).digest();

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected || expected.length < 16) {
    res.status(404).json({ error: "Not found." });
    return;
  }
  const ip = req.ip ?? "unknown";
  if (failures.isLimited(ip)) {
    res.status(429).json({ error: "Too many attempts. Try again later." });
    return;
  }
  const header = req.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!timingSafeEqual(digest(given), digest(expected))) {
    failures.hit(ip);
    res.status(401).json({ error: "Unauthorized." });
    return;
  }
  res.setHeader("Cache-Control", "no-store");
  next();
}

// The page itself holds no data and is not indexed; it only collects the token and calls the API below.
router.get("/admin", (_req, res) => {
  if (!process.env.ADMIN_TOKEN) {
    res.status(404).end();
    return;
  }
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'");
  res.type("html").send(ADMIN_PAGE);
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
<p><input id="t" type="password" placeholder="Admin token" autocomplete="off"> <button id="go">Load</button> <span id="m"></span></p>
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
  tok=$("t").value;$("t").value="";
  try{const {users}=await api("/users");const tb=$("tb");tb.textContent="";
    for(const u of users){const tr=tb.insertRow();cell(tr,u.id);cell(tr,u.username);cell(tr,u.displayName);cell(tr,(u.createdAt||"").slice(0,10));
      const a=cell(tr,"");
      btn(a,"Reset password",async()=>{const p=prompt("New password (8+ chars) for "+u.username);if(p)await api("/users/"+u.id+"/password","POST",{password:p})});
      btn(a,"Sign out",()=>api("/users/"+u.id+"/sign-out","POST"));
      btn(a,"Delete",async()=>{if(confirm("Delete "+u.username+" and all progress?")){await api("/users/"+u.id,"DELETE");load2()}});}
    msg(users.length+" accounts");
  }catch(e){msg(e.message)}
}
const load2=()=>{$("t").value=tok;load()};
$("go").onclick=load;
</script>`;

export default router;
