import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import type { Server } from "node:http";

process.env.VOICE_CACHE_DIR = mkdtempSync(path.join(os.tmpdir(), "fq-voice-test-"));
const express = (await import("express")).default;
const { default: apiRouter } = await import("./routes/index");
const { encodeWav, setVoiceEngineForTests, cleanVoiceText, VOICES } = await import("./lib/voice");

let calls: string[] = [];
const fakeEngine = {
  async generate(text: string, options: { voice: string; speed: number }) {
    calls.push(`${options.voice}:${text}`);
    return { audio: Float32Array.from([0, 0.5, -0.5, 1]), sampling_rate: 24000 };
  },
};

let server: Server; let base = "";
before(async () => {
  const app = express(); app.use("/api", apiRouter);
  server = await new Promise<Server>((resolve) => { const s = app.listen(0, () => resolve(s)); });
  const address = server.address(); base = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});
after(() => server.close());

describe("server natural voice", () => {
  it("makes a playable 16-bit WAV for a sentence", async () => {
    setVoiceEngineForTests(fakeEngine); calls = [];
    const res = await fetch(`${base}/api/voice/speech?voice=af_heart&text=${encodeURIComponent("Three fourths.")}`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("content-type"), "audio/wav");
    assert.match(res.headers.get("cache-control") ?? "", /immutable/);
    const wav = Buffer.from(await res.arrayBuffer());
    assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    assert.equal(wav.readUInt16LE(34), 16, "16-bit PCM");
    assert.equal(wav.readUInt32LE(24), 24000);
    assert.deepEqual(calls, ["af_heart:Three fourths."]);
  });

  it("makes each sentence once, then serves it from the cache", async () => {
    setVoiceEngineForTests(fakeEngine); calls = [];
    const url = `${base}/api/voice/speech?voice=af_heart&text=${encodeURIComponent("One half.")}`;
    await (await fetch(url)).arrayBuffer();
    await (await fetch(url)).arrayBuffer();
    const same = await Promise.all([fetch(`${base}/api/voice/speech?voice=af_heart&text=Two%20thirds.`), fetch(`${base}/api/voice/speech?voice=af_heart&text=Two%20thirds.`)]);
    await Promise.all(same.map((r) => r.arrayBuffer()));
    assert.deepEqual(calls, ["af_heart:One half.", "af_heart:Two thirds."]);
  });

  it("accepts every configured Kokoro voice and returns playable WAV audio", async () => {
    setVoiceEngineForTests(fakeEngine); calls = [];
    for (const voice of VOICES) {
      const text = `Sample for ${voice}.`;
      const res = await fetch(`${base}/api/voice/speech?voice=${voice}&text=${encodeURIComponent(text)}`);
      assert.equal(res.status, 200, `voice ${voice} should be accepted`);
      assert.equal(res.headers.get("content-type"), "audio/wav");
      const wav = Buffer.from(await res.arrayBuffer());
      assert.equal(wav.toString("ascii", 0, 4), "RIFF");
    }
    assert.deepEqual(calls, VOICES.map((voice) => `${voice}:Sample for ${voice}.`));
  });

  it("refuses unknown voices, empty text and very long text", async () => {
    setVoiceEngineForTests(fakeEngine);
    assert.equal((await fetch(`${base}/api/voice/speech?voice=evil&text=hi`)).status, 400);
    assert.equal((await fetch(`${base}/api/voice/speech?voice=af_heart&text=%20`)).status, 400);
    assert.equal((await fetch(`${base}/api/voice/speech?voice=af_heart&text=${"a".repeat(401)}`)).status, 400);
    assert.equal(cleanVoiceText("  Line\none\u0007  two "), "Line one two");
  });

  it("says when the model is ready and fails softly when it is not", async () => {
    setVoiceEngineForTests(fakeEngine);
    assert.deepEqual(await (await fetch(`${base}/api/voice/status`)).json(), { state: "ready" });
    setVoiceEngineForTests({ async generate() { throw new Error("boom"); } });
    assert.equal((await fetch(`${base}/api/voice/speech?voice=af_heart&text=Nope.`)).status, 503);
  });

  it("limits how many new sentences one visitor can make per minute", async () => {
    setVoiceEngineForTests(fakeEngine);
    const statuses: number[] = [];
    for (let i = 0; i < 62; i++) statuses.push((await fetch(`${base}/api/voice/speech?voice=af_heart&text=Sentence%20${i}.`)).status);
    assert.ok(statuses.includes(429), "the 61st new sentence is refused");
    assert.equal((await fetch(`${base}/api/voice/speech?voice=af_heart&text=Sentence%200.`)).status, 200, "cached sentences still play");
  });

  it("clamps samples into 16-bit range", () => {
    const wav = encodeWav(Float32Array.from([2, -2]), 8000);
    assert.equal(wav.readInt16LE(44), 32767);
    assert.equal(wav.readInt16LE(46), -32768);
  });
});
