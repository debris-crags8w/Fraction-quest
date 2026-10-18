import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Server } from "node:http";
import express from "express";
import { createStorageRouter } from "./routes/storage";
import { createVoicePackUploadRouter } from "./routes/voice-pack-upload";
import { PACK_VOICES, VOICE_CACHE_CONTROL, type VoiceFile, type VoicePackStore } from "./lib/voice-pack-store";

const TOKEN = "voice-upload-test-token-0123456789abcdef";
const KEY_A = "0123456789abcdef";
const KEY_B = "fedcba9876543210";

/** App Storage stand-in: a map of "voice/key" to bytes. */
const stored = new Map<string, Buffer>();
const fakeStore: VoicePackStore = {
  read(voice, key) {
    const audio = stored.get(`${voice}/${key}`);
    if (audio) return Readable.from([audio]);
    const missing = new Readable({ read() {} });
    queueMicrotask(() => missing.destroy(Object.assign(new Error("No such object"), { code: 404 })));
    return missing;
  },
  async put(voice, key, audio) { stored.set(`${voice}/${key}`, audio); },
  async list() { return [...stored.keys()].map((name): VoiceFile => { const [voice, key] = name.split("/"); return { voice: voice!, key: key! }; }); },
  async remove({ voice, key }) { stored.delete(`${voice}/${key}`); },
};

let server: Server; let base = "";
const previousToken = process.env.VOICE_PACK_UPLOAD_TOKEN;
before(async () => {
  const app = express();
  app.use(express.json({ limit: "256kb" })); // as in app.ts: the routes must not depend on it
  app.use("/api", createStorageRouter(() => fakeStore), createVoicePackUploadRouter(() => fakeStore));
  server = await new Promise<Server>((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const address = server.address(); base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});
after(() => {
  server.close();
  if (previousToken === undefined) delete process.env.VOICE_PACK_UPLOAD_TOKEN; else process.env.VOICE_PACK_UPLOAD_TOKEN = previousToken;
});
beforeEach(() => { stored.clear(); process.env.VOICE_PACK_UPLOAD_TOKEN = TOKEN; });

const put = (voice: string, key: string, token = TOKEN, body: Buffer = Buffer.from([0xff, 0xfb, 1, 2])) =>
  fetch(`${base}/api/voice-pack/files/${voice}/${key}.mp3`, { method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": "audio/mpeg" }, body });
const check = (keys: string[], prune = false) =>
  fetch(`${base}/api/voice-pack/check${prune ? "?prune=1" : ""}`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "text/plain" }, body: JSON.stringify({ version: 1, voices: [], keys }) });

describe("voice pack files from App Storage", () => {
  it("streams a stored file with a cache header browsers keep for good", async () => {
    stored.set(`af_heart/${KEY_A}`, Buffer.from("mp3 bytes"));
    const response = await fetch(`${base}/api/storage/public-objects/voice/af_heart/${KEY_A}.mp3`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/mpeg");
    assert.equal(response.headers.get("cache-control"), VOICE_CACHE_CONTROL);
    assert.equal(await response.text(), "mp3 bytes");
  });
  it("answers 404 for a file that is not stored, and for names outside the pack", async () => {
    assert.equal((await fetch(`${base}/api/storage/public-objects/voice/af_heart/${KEY_B}.mp3`)).status, 404);
    assert.equal((await fetch(`${base}/api/storage/public-objects/voice/af_bella/${KEY_A}.mp3`)).status, 404);
    assert.equal((await fetch(`${base}/api/storage/public-objects/voice/af_heart/secret.json`)).status, 404);
  });
});

describe("voice pack uploads from the workflow", () => {
  it("is switched off until a long upload token is configured", async () => {
    delete process.env.VOICE_PACK_UPLOAD_TOKEN;
    assert.equal((await put("af_heart", KEY_A)).status, 404);
    process.env.VOICE_PACK_UPLOAD_TOKEN = "short";
    assert.equal((await put("af_heart", KEY_A, "short")).status, 404);
    assert.equal(stored.size, 0);
  });
  it("refuses a wrong token and file names outside the pack", async () => {
    assert.equal((await put("af_heart", KEY_A, "x".repeat(TOKEN.length))).status, 401);
    assert.equal((await put("af_bella", KEY_A)).status, 400);
    assert.equal((await put("bf_emma", KEY_A)).status, 400); // retired
    assert.equal((await put("af_heart", "not-a-key")).status, 400);
    assert.equal(stored.size, 0);
  });
  it("stores uploads, reports what the index still lacks, and prunes only a complete pack", async () => {
    for (const voice of PACK_VOICES) assert.equal((await put(voice, KEY_A)).status, 204);
    stored.set(`bf_emma/${KEY_A}`, Buffer.from("retired voice"));

    // KEY_B isn't stored yet in either voice, and nothing is pruned.
    let result = await (await check([KEY_A, KEY_B], true)).json() as { sentences: number; missing: number; firstMissing: string[]; removed: number };
    assert.deepEqual(result, { sentences: 2, missing: 2, firstMissing: PACK_VOICES.map((voice) => `${voice}/${KEY_B}.mp3`), removed: 0 });
    assert.equal(stored.size, 3);
    for (const voice of PACK_VOICES) assert.equal((await put(voice, KEY_B)).status, 204);

    // Without prune, files the index dropped stay (the live app may still list them).
    result = await (await check([KEY_A])).json() as typeof result;
    assert.equal(result.missing, 0);
    assert.equal(result.removed, 0);
    assert.equal(stored.size, 5);

    // Prune removes the dropped sentence and the retired voice's files.
    result = await (await check([KEY_A], true)).json() as typeof result;
    assert.equal(result.removed, 3);
    assert.deepEqual([...stored.keys()], PACK_VOICES.map((voice) => `${voice}/${KEY_A}`));
  });
  it("accepts an index larger than the server's JSON limit", async () => {
    const keys = Array.from({ length: 20_000 }, (_, i) => i.toString(16).padStart(16, "0"));
    const response = await check(keys);
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { missing: number }).missing, 20_000 * PACK_VOICES.length);
  });
});
