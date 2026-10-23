import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { CAST_VOICE_SPEEDS } from "./lib/cast-voices";
import { checkVoicePack, type VoiceFile, type VoicePackStore } from "./lib/voice-pack-store";
import { generateMissingVoicePack, RENDER_VOICES, sentencesFor } from "./lib/voice-pack-sync";
import { speedFor, VOICE_SPEED } from "./lib/voice";

function memoryStore(initial: string[] = []) {
  const files = new Set(initial);
  const store: VoicePackStore = {
    read() { throw new Error("not used"); },
    async put(file) { files.add(`${file.voice}/${file.key}.${file.format}`); },
    async list() { return [...files].map((name): VoiceFile => {
      const [, voice, key, format] = /^([^/]+)\/([0-9a-f]{16})\.(mp3|caf)$/.exec(name)!;
      return { voice: voice!, key: key!, format: format as VoiceFile["format"] };
    }); },
    async remove(file) { files.delete(`${file.voice}/${file.key}.${file.format}`); },
  };
  return { store, files };
}
const both = (name: string) => [`${name}.mp3`, `${name}.caf`];
const A = "aaaaaaaaaaaaaaaa"; const B = "bbbbbbbbbbbbbbbb";

test("the cast's voices and speeds match the app's table", () => {
  const app = readFileSync(new URL("../../fraction-quest/src/lib/cast-voices.ts", import.meta.url), "utf8");
  const listed = [...app.matchAll(/voice: '([a-z_]+)', speed: ([\d.]+)/g)].map(([, voice, speed]) => [voice, Number(speed)]);
  assert.deepEqual(Object.fromEntries(listed), CAST_VOICE_SPEEDS);
  assert.equal(speedFor("bf_emma"), 0.8);
  assert.equal(speedFor("af_heart"), VOICE_SPEED);
});

test("Heart reads every sentence; a friend only their own film lines", () => {
  const sentences = [{ key: A, text: "Hoo." }, { key: A, text: "Hoo.", voice: "bm_george" }, { key: B, text: "Snap." }];
  assert.deepEqual(sentencesFor(sentences, "af_heart").map((s) => s.key), [A, B]);
  assert.deepEqual(sentencesFor(sentences, "bm_george").map((s) => s.key), [A]);
  assert.deepEqual(sentencesFor(sentences, "am_onyx"), []);
  assert.ok(RENDER_VOICES.includes("af_nova"));
});

test("a missing friend's clip is counted, made at the friend's speed, and stored under the friend's voice", async () => {
  const { store, files } = memoryStore([...both(`af_heart/${A}`)]);
  const speeds: [string, number][] = [];
  const engine = { generate: async (_text: string, options: { voice: string; speed: number }) => {
    speeds.push([options.voice, options.speed]);
    return { audio: new Float32Array(2400), sampling_rate: 24000 };
  } };
  const sentences = [{ key: A, text: "Hoo hoo." }, { key: A, text: "Hoo hoo.", voice: "bm_george" }];
  const dry = await generateMissingVoicePack(store, sentences, { apply: false });
  assert.equal(dry.checkedSentences, 2);
  assert.equal(dry.missingSentences, 1);
  const hasFfmpeg = await import("node:child_process").then(({ execFileSync }) => {
    try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; }
  });
  if (!hasFfmpeg) return;
  await generateMissingVoicePack(store, sentences, { apply: true, engine });
  assert.deepEqual(speeds, [["bm_george", 0.85]]);
  assert.ok(files.has(`bm_george/${A}.mp3`) && files.has(`bm_george/${A}.caf`));
});

test("the check counts a friend's listed lines, and pruning keeps them", async () => {
  const { store, files } = memoryStore([...both(`af_heart/${A}`), ...both(`bm_george/${A}`), ...both(`bm_george/${B}`), ...both(`am_onyx/${A}`)]);
  const missing = await checkVoicePack(store, [A], false, { bm_george: [A], af_nova: [A] });
  assert.deepEqual(missing.missing, both(`af_nova/${A}`));
  const pruned = await checkVoicePack(store, [A], true, { bm_george: [A] });
  assert.equal(pruned.missing.length, 0);
  assert.equal(pruned.removed, 4, "lines no longer listed go");
  assert.deepEqual([...files].sort(), [...both(`af_heart/${A}`), ...both(`bm_george/${A}`)].sort());
});
