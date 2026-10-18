import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { DAILY_VOICE_BACKFILL_LIMIT, generateMissingVoicePack, runDailyVoiceBackfill, voicePackSentenceKey, VoicePackSyncLimitError } from "./lib/voice-pack-sync";
import { VoicePackSyncInProgressError, type VoiceFile, type VoicePackStore } from "./lib/voice-pack-store";

const hasFfmpeg = await import("node:child_process").then(({ execFileSync }) => {
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; }
});

function memoryStore(initial: VoiceFile[] = []) {
  const files = new Map<string, Buffer<ArrayBufferLike>>(
    initial.map((file) => [`${file.voice}/${file.key}.${file.format}`, Buffer.from("existing")]),
  );
  let syncLocked = false;
  const store: VoicePackStore = {
    read() { throw new Error("not used"); },
    async put(file, audio) { files.set(`${file.voice}/${file.key}.${file.format}`, audio); },
    async list() { return [...files.keys()].map((name) => {
      const [voice, filename] = name.split("/");
      const match = /^([a-f0-9]{16})\.(mp3|caf)$/.exec(filename!);
      return { voice: voice!, key: match![1]!, format: match![2]! as VoiceFile["format"] };
    }); },
    async remove(file) { files.delete(`${file.voice}/${file.key}.${file.format}`); },
    async acquireSyncLock() {
      if (syncLocked) throw new VoicePackSyncInProgressError();
      syncLocked = true;
      let released = false;
      return {
        async renew() { if (released) throw new VoicePackSyncInProgressError(); },
        async release() { if (!released) { syncLocked = false; released = true; } },
      };
    },
  };
  return { store, files, isSyncLocked: () => syncLocked };
}

const sentence = { key: "aaaaaaaaaaaaaaaa", text: "One half." };
const engine = { async generate() { return { audio: new Float32Array(2400).fill(0.1), sampling_rate: 24000 }; } };

test("the batch command's dry run reports gaps without loading Kokoro or writing storage", async () => {
  const { store, files } = memoryStore([{ voice: "af_heart", key: sentence.key, format: "mp3" }]);
  const result = await generateMissingVoicePack(store, [sentence]);
  assert.deepEqual(result, {
    checkedSentences: 1, checkedFiles: 2, missingFiles: 1, missingSentences: 1,
    generatedFiles: 0, generatedSentences: 0, remainingFiles: 1, dryRun: true,
  });
  assert.equal(files.size, 1);
});

test("a voice-specific dry run counts only that voice's gaps", async () => {
  const { store, files } = memoryStore([{ voice: "af_heart", key: sentence.key, format: "mp3" }]);
  const result = await generateMissingVoicePack(store, [sentence], { voices: ["af_heart"] });
  assert.deepEqual(result, {
    checkedSentences: 1, checkedFiles: 2, missingFiles: 1, missingSentences: 1,
    generatedFiles: 0, generatedSentences: 0, remainingFiles: 1, dryRun: true,
  });
  assert.equal(files.size, 1);
});

test("the sync limit stops an unexpectedly large backfill before rendering and reports the checked counts", async () => {
  const { store, files } = memoryStore();
  const sentences = [
    { key: "aaaaaaaaaaaaaaaa", text: "One half." },
    { key: "bbbbbbbbbbbbbbbb", text: "Two thirds." },
  ];
  await assert.rejects(
    generateMissingVoicePack(store, sentences, { apply: true, engine, maxMissingSentences: 1 }),
    (error: unknown) =>
      error instanceof VoicePackSyncLimitError &&
      error.checkedSentences === 2 &&
      error.checkedFiles === 4 &&
      error.missingSentences === 2 &&
      error.missingFiles === 4,
  );
  assert.equal(files.size, 0);
});

test("the daily job reports an oversized gap and leaves it for a manual batch", async () => {
  const { store, files } = memoryStore();
  const sentences = Array.from({ length: DAILY_VOICE_BACKFILL_LIMIT + 1 }, (_, index) => ({
    key: index.toString(16).padStart(16, "0"),
    text: `Fraction question ${index}.`,
  }));
  const messages: string[] = [];
  await assert.rejects(
    runDailyVoiceBackfill(store, sentences, { log: (message) => messages.push(message) }),
    VoicePackSyncLimitError,
  );
  assert.equal(files.size, 0);
  assert.match(messages.join("\n"), /checked 102 files across 51 sentences/i);
  assert.match(messages.join("\n"), /generated 0 files/i);
  assert.match(messages.join("\n"), /daily limit was exceeded/i);
});

test("a shared sync lock prevents overlapping generation and is released after the run", async () => {
  const { store, isSyncLocked } = memoryStore([
    { voice: "af_heart", key: sentence.key, format: "mp3" },
    { voice: "af_heart", key: sentence.key, format: "caf" },
  ]);
  const originalList = store.list.bind(store);
  let unblockList!: () => void;
  let startedList!: () => void;
  const listBlocked = new Promise<void>((resolve) => { unblockList = resolve; });
  const listStarted = new Promise<void>((resolve) => { startedList = resolve; });
  store.list = async () => {
    startedList();
    await listBlocked;
    return originalList();
  };

  const first = generateMissingVoicePack(store, [sentence], { apply: true, engine });
  await listStarted;
  assert.equal(isSyncLocked(), true);
  await assert.rejects(
    generateMissingVoicePack(store, [sentence], { apply: true, engine }),
    VoicePackSyncInProgressError,
  );
  unblockList();
  await first;
  assert.equal(isSyncLocked(), false);
});

test("the batch fills only missing formats for the configured voice and preserves existing files", { skip: !hasFfmpeg && "ffmpeg is not installed" }, async () => {
  const { store, files } = memoryStore([{ voice: "af_heart", key: sentence.key, format: "mp3" }]);
  const previous = files.get(`af_heart/${sentence.key}.mp3`);
  const result = await generateMissingVoicePack(store, [sentence], { apply: true, engine });
  assert.deepEqual(result, {
    checkedSentences: 1, checkedFiles: 2, missingFiles: 1, missingSentences: 1,
    generatedFiles: 1, generatedSentences: 1, remainingFiles: 0, dryRun: false,
  });
  assert.equal(files.size, 2);
  assert.equal(files.get(`af_heart/${sentence.key}.mp3`), previous);
  assert.equal(files.get(`af_heart/${sentence.key}.caf`)?.subarray(0, 4).toString(), "caff");
});

test("daily backfill stores a new sentence once, then reports a no-op", { skip: !hasFfmpeg && "ffmpeg is not installed" }, async () => {
  const { store, files } = memoryStore();
  const firstMessages: string[] = [];
  const first = await runDailyVoiceBackfill(store, [sentence], { engine, log: (message) => firstMessages.push(message) });
  assert.equal(first.checkedFiles, 2);
  assert.equal(first.missingFiles, 2);
  assert.equal(first.generatedFiles, 2);
  assert.equal(first.remainingFiles, 0);
  assert.equal(files.size, 2);

  const secondMessages: string[] = [];
  const second = await runDailyVoiceBackfill(store, [sentence], { engine, log: (message) => secondMessages.push(message) });
  assert.equal(second.missingFiles, 0);
  assert.equal(second.generatedFiles, 0);
  assert.equal(files.size, 2);
  assert.match(secondMessages.join("\n"), /generated 0 files/i);
});
