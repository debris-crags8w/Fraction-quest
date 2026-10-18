import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateMissingVoicePack, voicePackSentenceKey, VoicePackSyncLimitError } from "./lib/voice-pack-sync";
import type { VoiceFile, VoicePackStore } from "./lib/voice-pack-store";

const hasFfmpeg = await import("node:child_process").then(({ execFileSync }) => {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; }
});

function memoryStore(initial: VoiceFile[] = []) {
  const files = new Map<string, Buffer<ArrayBufferLike>>(
    initial.map((file) => [`${file.voice}/${file.key}.${file.format}`, Buffer.from("existing")]),
  );
  const store: VoicePackStore = {
    read() { throw new Error("not used"); },
    async put(file, audio) { files.set(`${file.voice}/${file.key}.${file.format}`, audio); },
    async list() { return [...files.keys()].map((name) => {
      const [voice, filename] = name.split("/");
      const match = /^([a-f0-9]{16})\.(mp3|caf)$/.exec(filename!);
      return { voice: voice!, key: match![1]!, format: match![2]! as VoiceFile["format"] };
    }); },
    async remove(file) { files.delete(`${file.voice}/${file.key}.${file.format}`); },
  };
  return { store, files };
}

const sentence = { key: "aaaaaaaaaaaaaaaa", text: "One half." };
const engine = { async generate() { return { audio: new Float32Array(2400).fill(0.1), sampling_rate: 24000 }; } };

test("the batch command's dry run reports gaps without loading Kokoro or writing storage", async () => {
  const { store, files } = memoryStore([{ voice: "af_heart", key: sentence.key, format: "mp3" }]);
  const result = await generateMissingVoicePack(store, [sentence]);
  assert.deepEqual(result, { missingFiles: 3, generatedSentences: 0, remainingFiles: 3, dryRun: true });
  assert.equal(files.size, 1);
});

test("the PR sync limit stops an unexpectedly large backfill before rendering", async () => {
  const { store, files } = memoryStore();
  const sentences = [
    { key: "aaaaaaaaaaaaaaaa", text: "One half." },
    { key: "bbbbbbbbbbbbbbbb", text: "Two thirds." },
  ];
  await assert.rejects(
    generateMissingVoicePack(store, sentences, { apply: true, engine, maxMissingSentences: 1 }),
    (error: unknown) => error instanceof VoicePackSyncLimitError && error.missingSentences === 2,
  );
  assert.equal(files.size, 0);
});

test("the batch fills only missing formats for the two configured voices and preserves existing files", { skip: !hasFfmpeg && "ffmpeg is not installed" }, async () => {
  const { store, files } = memoryStore([{ voice: "af_heart", key: sentence.key, format: "mp3" }]);
  const previous = files.get(`af_heart/${sentence.key}.mp3`);
  const result = await generateMissingVoicePack(store, [sentence], { apply: true, engine });
  assert.deepEqual(result, { missingFiles: 3, generatedSentences: 2, remainingFiles: 0, dryRun: false });
  assert.equal(files.size, 4);
  assert.equal(files.get(`af_heart/${sentence.key}.mp3`), previous);
  assert.equal(files.get(`af_heart/${sentence.key}.caf`)?.subarray(0, 4).toString(), "caff");
  assert.ok(files.get(`am_michael/${sentence.key}.mp3`)!.length > 0);
});
