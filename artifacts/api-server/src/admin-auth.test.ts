import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";
import express from "express";
import adminRouter from "./routes/admin";
import { clearRateLimits } from "./test-rate-limits";

const TEST_TOKEN = "admin-test-token-0123456789-abcdefgh";
const TEST_SECRET = "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP";
const ENV_KEYS = ["ADMIN_TOKEN", "ADMIN_TOTP_SECRET", "ADMIN_ALLOWED_IPS"] as const;
// Failed sign-ins are counted in the database now: start from none.
before(() => clearRateLimits("admin-"));

const previousEnv = new Map(ENV_KEYS.map((key) => [key, process.env[key]]));

function base32Decode(input: string): Buffer {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of input) {
    const digit = alphabet.indexOf(char);
    assert.notEqual(digit, -1, "test TOTP secret must be valid base32");
    value = (value << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

function totpAt(secret: string, timeMs: number): string {
  const step = Math.floor(timeMs / 30_000);
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const digest = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = digest[digest.length - 1]! & 15;
  const number = ((digest[offset]! & 127) << 24)
    | (digest[offset + 1]! << 16)
    | (digest[offset + 2]! << 8)
    | digest[offset + 3]!;
  return String(number % 1_000_000).padStart(6, "0");
}

function restoreEnv(): void {
  for (const [key, value] of previousEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

let server: Server;
let base = "";

before(async () => {
  process.env.ADMIN_TOKEN = TEST_TOKEN;
  process.env.ADMIN_TOTP_SECRET = TEST_SECRET;
  delete process.env.ADMIN_ALLOWED_IPS;
  const app = express();
  app.use("/api", adminRouter);
  server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, () => resolve(listening));
  });
  const address = server.address();
  base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  restoreEnv();
});

describe("admin authenticator setup", () => {
  it("serves a private login shell without setup instructions or readiness details", async () => {
    const response = await fetch(`${base}/api/admin`);
    assert.equal(response.status, 200);
    const html = await response.text();
    assert.equal(response.headers.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.match(response.headers.get("content-security-policy") ?? "", /default-src 'none'/);
    assert.match(html, /<form id="login-form"/);
    assert.match(html, /name="admin-token"/);
    assert.match(html, /name="authenticator-code"/);
    assert.match(html, /type="submit">Sign in/);
    assert.match(html, /<aside id="admin-sidebar" aria-label="Admin sections" hidden>/);
    assert.doesNotMatch(html, /First-time setup|Setup is complete|Setup is incomplete/i);
    assert.doesNotMatch(html, /ADMIN_TOKEN|ADMIN_TOTP_SECRET|ADMIN_ALLOWED_IPS/);
    assert.doesNotMatch(html, /node -e|Generate the values|Replit Secrets/);
    assert.doesNotMatch(html, new RegExp(TEST_TOKEN));
    assert.doesNotMatch(html, new RegExp(TEST_SECRET));
  });

  it("does not reveal readiness while the existing login gate still rejects missing factors", async () => {
    process.env.ADMIN_TOTP_SECRET = "";
    const page = await fetch(`${base}/api/admin`);
    assert.equal(page.status, 200);
    const html = await page.text();
    assert.match(html, /<form id="login-form"/);
    assert.doesNotMatch(html, /Setup is (?:complete|incomplete)/i);

    const login = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}`, "X-Admin-Code": "123456" },
    });
    assert.equal(login.status, 404);
    process.env.ADMIN_TOTP_SECRET = TEST_SECRET;
  });

  it("keeps the page hidden when the admin token is absent or the IP is not allowed", async () => {
    process.env.ADMIN_TOKEN = "";
    assert.equal((await fetch(`${base}/api/admin`)).status, 404);

    process.env.ADMIN_TOKEN = TEST_TOKEN;
    process.env.ADMIN_ALLOWED_IPS = "203.0.113.7";
    assert.equal((await fetch(`${base}/api/admin`)).status, 404);

    delete process.env.ADMIN_ALLOWED_IPS;
  });

  it("rejects an incorrect authenticator code", async () => {
    const validCode = totpAt(TEST_SECRET, Date.now());
    const incorrectCode = validCode === "000000" ? "000001" : "000000";
    const response = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}`, "X-Admin-Code": incorrectCode },
    });
    assert.equal(response.status, 401);
  });

  it("accepts a current code, grants a short session, and rejects reuse of that code", async () => {
    const code = totpAt(TEST_SECRET, Date.now());
    const login = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}`, "X-Admin-Code": code },
    });
    assert.equal(login.status, 200);
    const { session } = await login.json() as { session: string };
    assert.ok(session.length > 20);

    const logs = await fetch(`${base}/api/admin/logs?level=warn`, {
      headers: { Authorization: `Bearer ${session}` },
    });
    assert.equal(logs.status, 200);

    const replay = await fetch(`${base}/api/admin/login`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TEST_TOKEN}`, "X-Admin-Code": code },
    });
    assert.equal(replay.status, 401);
  });
});
