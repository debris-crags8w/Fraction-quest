import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { renderVoicePack, shardOf } from "./lib/voice-pack-render";

const hasFfmpeg = (() => { try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; } })();

test("shards split the sentences without overlap", () => {
  const items = [0, 1, 2, 3, 4, 5, 6];
  const parts = [0, 1, 2].map((shard) => shardOf(items, shard, 3));
  assert.deepEqual(parts, [[0, 3, 6], [1, 4], [2, 5]]);
});

test("the pack renderer makes one MP3 per sentence and skips ones already made", { skip: !hasFfmpeg && "ffmpeg is not installed" }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "voice-pack-"));
  const calls: string[] = [];
  const engine = {
    async generate(text: string, options: { voice: string; speed: number }) {
      calls.push(`${options.voice}:${text}`);
      return { audio: new Float32Array(2400).map((_, i) => Math.sin(i / 8) * 0.3), sampling_rate: 24000 };
    },
  };
  try {
    const sentences = [{ key: "aaaa", text: "One half." }, { key: "bbbb", text: "Two thirds." }];
    assert.deepEqual(await renderVoicePack(engine, "af_heart", sentences, dir), { made: 2, skipped: 0 });
    const files = (await readdir(path.join(dir, "af_heart"))).sort();
    assert.deepEqual(files, ["aaaa.caf", "aaaa.mp3", "bbbb.caf", "bbbb.mp3"]);
    const caf = await readFile(path.join(dir, "af_heart", "aaaa.caf"));
    assert.equal(caf.subarray(0, 4).toString(), "caff", "a Core Audio file");
    const codec = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name", "-of", "csv=p=0", path.join(dir, "af_heart", "aaaa.caf")]).toString().trim();
    assert.equal(codec, "opus");
    const head = await readFile(path.join(dir, "af_heart", "aaaa.mp3"));
    assert.ok(head.subarray(0, 3).toString() === "ID3" || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0), "an MP3 file");
    assert.ok((await stat(path.join(dir, "af_heart", "aaaa.mp3"))).size > 100);
    assert.deepEqual(await renderVoicePack(engine, "af_heart", sentences, dir), { made: 0, skipped: 2 });
    assert.deepEqual(calls, ["af_heart:One half.", "af_heart:Two thirds."]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a sentence missing only one format gets just that file made", { skip: !hasFfmpeg && "ffmpeg is not installed" }, async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "voice-pack-one-"));
  let calls = 0;
  const engine = { async generate() { calls++; return { audio: new Float32Array(2400).map((_, i) => Math.sin(i / 8) * 0.3), sampling_rate: 24000 }; } };
  try {
    const sentences = [{ key: "dddd", text: "Four fifths." }];
    await renderVoicePack(engine, "af_heart", sentences, dir);
    await rm(path.join(dir, "af_heart", "dddd.caf"));
    const mp3Before = await stat(path.join(dir, "af_heart", "dddd.mp3"));
    assert.deepEqual(await renderVoicePack(engine, "af_heart", sentences, dir), { made: 1, skipped: 0 });
    assert.equal(calls, 2);
    assert.equal((await stat(path.join(dir, "af_heart", "dddd.mp3"))).mtimeMs, mp3Before.mtimeMs, "the MP3 was left alone");
    assert.ok((await stat(path.join(dir, "af_heart", "dddd.caf"))).size > 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
