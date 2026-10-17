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
    assert.deepEqual(await renderVoicePack(engine, "am_michael", sentences, dir), { made: 2, skipped: 0 });
    const files = (await readdir(path.join(dir, "am_michael"))).sort();
    assert.deepEqual(files, ["aaaa.mp3", "bbbb.mp3"]);
    const head = await readFile(path.join(dir, "am_michael", "aaaa.mp3"));
    assert.ok(head.subarray(0, 3).toString() === "ID3" || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0), "an MP3 file");
    assert.ok((await stat(path.join(dir, "am_michael", "aaaa.mp3"))).size > 100);
    assert.deepEqual(await renderVoicePack(engine, "am_michael", sentences, dir), { made: 0, skipped: 2 });
    assert.deepEqual(calls, ["am_michael:One half.", "am_michael:Two thirds."]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
