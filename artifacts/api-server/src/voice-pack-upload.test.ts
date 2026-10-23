import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, beforeEach, describe, it } from "node:test";
import type { Server } from "node:http";
import express from "express";
import { createStorageRouter } from "./routes/storage";
import { createVoicePackUploadRouter } from "./routes/voice-pack-upload";
import { VOICE_CACHE_CONTROL, type VoiceFile, type VoicePackStore } from "./lib/voice-pack-store";
import { voicePackSentenceKey } from "./lib/voice-pack-sync";

const TOKEN = "voice-upload-test-token-0123456789abcdef";
const KEY_A = "0123456789abcdef";
const KEY_B = "fedcba9876543210";

/** App Storage stand-in: a map of "voice/key.format" to bytes. */
const stored = new Map<string, Buffer>();
const name = ({ voice, key, format }: VoiceFile) => `${voice}/${key}.${format}`;
const fakeStore: VoicePackStore = {
  read(file) {
    const audio = stored.get(name(file));
    if (audio) return Readable.from([audio]);
    const missing = new Readable({ read() {} });
    queueMicrotask(() => missing.destroy(Object.assign(new Error("No such object"), { code: 404 })));
    return missing;
  },
  async put(file, audio) { stored.set(name(file), audio); },
  async list() {
    return [...stored.keys()].map((stored): VoiceFile => {
      const [, voice, key, format] = /^([^/]+)\/([0-9a-f]+)\.(mp3|caf)$/.exec(stored)!;
      return { voice: voice!, key: key!, format: format as VoiceFile["format"] };
    });
  },
  async remove(file) { stored.delete(name(file)); },
};

let server: Server; let base = "";
let syncCalls: { key: string; text: string }[][] = [];
const previousToken = process.env.VOICE_PACK_UPLOAD_TOKEN;
before(async () => {
  const app = express();
  app.use(express.json({ limit: "256kb" })); // as in app.ts: the routes must not depend on it
  const sync = async (_store: VoicePackStore, sentences: { key: string; text: string }[], options: { apply?: boolean; maxMissingSentences?: number }) => {
    assert.equal(options.apply, true);
    assert.equal(options.maxMissingSentences, 10);
    syncCalls.push(sentences);
    return {
      checkedSentences: sentences.length,
      checkedFiles: sentences.length * 4,
      missingFiles: 4,
      missingSentences: 2,
      generatedFiles: 4,
      generatedSentences: 2,
      remainingFiles: 0,
      dryRun: false,
    };
  };
  app.use("/api", createStorageRouter(() => fakeStore), createVoicePackUploadRouter(() => fakeStore, sync));
  server = await new Promise<Server>((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const address = server.address(); base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});
after(() => {
  server.close();
  if (previousToken === undefined) delete process.env.VOICE_PACK_UPLOAD_TOKEN; else process.env.VOICE_PACK_UPLOAD_TOKEN = previousToken;
});
beforeEach(() => { stored.clear(); syncCalls = []; process.env.VOICE_PACK_UPLOAD_TOKEN = TOKEN; });

const TYPES = { mp3: "audio/mpeg", caf: "audio/x-caf" } as const;
const put = (voice: string, key: string, format: "mp3" | "caf" = "mp3", token = TOKEN, type: string = TYPES[format]) =>
  fetch(`${base}/api/voice-pack/files/${voice}/${key}.${format}`, { method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": type }, body: Buffer.from([0xff, 0xfb, 1, 2]) });
const putBoth = async (voice: string, key: string) => [(await put(voice, key, "mp3")).status, (await put(voice, key, "caf")).status];
const check = (keys: string[], prune = false, list = false) =>
  fetch(`${base}/api/voice-pack/check${prune ? "?prune=1" : list ? "?list=1" : ""}`, { method: "POST", headers: { authorization: `Bearer ${TOKEN}`, "content-type": "text/plain" }, body: JSON.stringify({ version: 1, voices: [], keys }) });

describe("voice pack files from App Storage", () => {
  it("streams a stored file in either format with a cache header browsers keep for good", async () => {
    stored.set(`af_heart/${KEY_A}.mp3`, Buffer.from("mp3 bytes"));
    stored.set(`af_heart/${KEY_A}.caf`, Buffer.from("opus bytes"));
    const response = await fetch(`${base}/api/storage/public-objects/voice/af_heart/${KEY_A}.mp3`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/mpeg");
    assert.equal(response.headers.get("cache-control"), VOICE_CACHE_CONTROL);
    assert.equal(await response.text(), "mp3 bytes");
    const opus = await fetch(`${base}/api/storage/public-objects/voice/af_heart/${KEY_A}.caf`);
    assert.equal(opus.headers.get("content-type"), "audio/x-caf");
    assert.equal(await opus.text(), "opus bytes");
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
    assert.equal((await put("af_heart", KEY_A, "mp3", "short")).status, 404);
    assert.equal(stored.size, 0);
  });
  it("refuses a wrong token and file names outside the pack", async () => {
    assert.equal((await put("af_heart", KEY_A, "mp3", "x".repeat(TOKEN.length))).status, 401);
    assert.equal((await put("af_heart", KEY_A, "caf", TOKEN, "audio/mpeg")).status, 400); // type must match the format
    assert.equal((await put("af_bella", KEY_A)).status, 400);
    assert.equal((await put("af_sky", KEY_A)).status, 400); // not a pack or story voice
    assert.equal((await put("am_michael", KEY_A)).status, 400); // retired
    assert.equal((await put("af_heart", "not-a-key")).status, 400);
    assert.equal(stored.size, 0);
  });
  it("stores uploads, reports what the index still lacks, and prunes only a complete pack", async () => {
    assert.deepEqual(await putBoth("af_heart", KEY_A), [204, 204]);
    stored.set(`bf_lily/${KEY_A}.mp3`, Buffer.from("retired voice"));
    stored.set(`am_michael/${KEY_A}.mp3`, Buffer.from("retired voice"));

    // KEY_B has only its MP3 so far: its Opus file is missing, and nothing is pruned.
    assert.equal((await put("af_heart", KEY_B, "mp3")).status, 204);
    let result = await (await check([KEY_A, KEY_B], true)).json() as { sentences: number; missing: number; firstMissing: string[]; removed: number };
    assert.deepEqual(result, { sentences: 2, missing: 1, firstMissing: [`af_heart/${KEY_B}.caf`], removed: 0 });
    assert.equal(stored.size, 5);
    assert.equal((await put("af_heart", KEY_B, "caf")).status, 204);

    // Without prune, files the index dropped stay (the live app may still list them).
    result = await (await check([KEY_A])).json() as typeof result;
    assert.equal(result.missing, 0);
    assert.equal(result.removed, 0);
    assert.equal(stored.size, 6);

    // Prune removes the dropped sentence (both formats) and the retired voices' files.
    result = await (await check([KEY_A], true)).json() as typeof result;
    assert.equal(result.removed, 4);
    assert.deepEqual([...stored.keys()].sort(), [`af_heart/${KEY_A}.caf`, `af_heart/${KEY_A}.mp3`]);
  });
  it("accepts an index larger than the server's JSON limit", async () => {
    const keys = Array.from({ length: 20_000 }, (_, i) => i.toString(16).padStart(16, "0"));
    const response = await check(keys);
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { missing: number }).missing, 40_000); // one voice, two formats
  });
  it("lists every sentence that lacks a file, so the workflow makes exactly those", async () => {
    assert.deepEqual(await putBoth("af_heart", KEY_A), [204, 204]);
    assert.equal((await put("af_heart", KEY_B, "mp3")).status, 204); // its Opus file is missing
    const result = await (await check([KEY_A, KEY_B, "1111111111111111"], false, true)).json() as { missingKeys: string[] };
    assert.deepEqual(result.missingKeys.sort(), ["1111111111111111", KEY_B]);
  });
  it("lets Actions ask Replit to render a small, validated missing-sentence set", async () => {
    const sentences = [{ key: voicePackSentenceKey("One half."), text: "One half." }];
    assert.equal(sentences[0]!.key, "520c72924f268916");
    const response = await fetch(`${base}/api/voice-pack/sync`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "text/plain" },
      body: JSON.stringify({ sentences }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { sentences: 1, generatedFiles: 4, generatedSentences: 2, remainingFiles: 0 });
    assert.deepEqual(syncCalls, [sentences]);
  });
  it("rejects mismatched sentence keys before requesting generation", async () => {
    const response = await fetch(`${base}/api/voice-pack/sync`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "text/plain" },
      body: JSON.stringify({ sentences: [{ key: KEY_A, text: "One half." }] }),
    });
    assert.equal(response.status, 400);
    assert.equal(syncCalls.length, 0);
  });
  it("takes a story friend's film lines in their own voice, serves them, and refuses a voice outside the cast", async () => {
    const key = voicePackSentenceKey("One half.");
    const send = (sentences: unknown[]) => fetch(`${base}/api/voice-pack/sync`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "text/plain" },
      body: JSON.stringify({ sentences }),
    });
    const both = [{ key, text: "One half." }, { key, text: "One half.", voice: "bm_george" }];
    assert.equal((await send(both)).status, 200);
    assert.deepEqual(syncCalls, [both]);
    assert.equal((await send([{ key, text: "One half.", voice: "af_sky" }])).status, 400);
    assert.deepEqual(await putBoth("bm_george", KEY_A), [204, 204]);
    assert.equal((await fetch(`${base}/api/storage/public-objects/voice/bm_george/${KEY_A}.mp3`)).status, 200);
    const checked = await fetch(`${base}/api/voice-pack/check`, {
      method: "POST",
      headers: { authorization: `Bearer ${TOKEN}`, "content-type": "text/plain" },
      body: JSON.stringify({ version: 1, voices: ["af_heart"], keys: [], cast: { bm_george: [KEY_A], af_nova: [KEY_A] } }),
    });
    const result = await checked.json() as { missing: number; firstMissing: string[] };
    assert.deepEqual(result.firstMissing.sort(), [`af_nova/${KEY_A}.caf`, `af_nova/${KEY_A}.mp3`]);
  });
});
