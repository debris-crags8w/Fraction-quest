// Usage: pnpm --filter @workspace/api-server run voice-samples [-- <out dir, default voice-samples>]
// Makes one short sample per story voice, each at its set speed and 0.1 slower and faster, so the speeds can be
// chosen by ear before the voice backfill makes every clip. Files are named <friend>-<voice>-<speed>.wav. Nothing
// is uploaded. Change a speed in both cast-voices.ts files, then run the voice backfill.
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CAST_VOICES, HEART_SPEED, HEART_VOICE } from "../../fraction-quest/src/lib/cast-voices";
import { CHAPTERS, PROLOGUE, withName, type Panel } from "../../fraction-quest/src/story";
import { encodeWav, loadVoiceEngine } from "../src/lib/voice";

const args = process.argv.slice(2).filter((arg) => arg !== "--");
const outDir = path.resolve(process.env.INIT_CWD ?? process.cwd(), args[0] ?? "voice-samples");
const panels: Panel[] = [...PROLOGUE, ...CHAPTERS.flatMap((chapter) => chapter.intro)];
const lineFor = (speaker: string) => withName(panels.find((panel) => panel.speaker === speaker)?.text ?? "Hello, friend! Let's find the missing piece.", null, "everyday");

const engine = await loadVoiceEngine();
if (!engine) { console.error("The Kokoro model could not load."); process.exit(1); }
await mkdir(outDir, { recursive: true });
const cast = [["numi", { voice: HEART_VOICE, speed: HEART_SPEED }], ...Object.entries(CAST_VOICES)] as const;
for (const [friend, { voice, speed }] of cast) {
  const text = lineFor(friend);
  for (const step of [-0.1, 0, 0.1]) {
    const at = Math.round((speed + step) * 100) / 100;
    const clip = await engine.generate(text, { voice, speed: at });
    const file = path.join(outDir, `${friend}-${voice}-${at.toFixed(2)}${step === 0 ? "-set" : ""}.wav`);
    await writeFile(file, encodeWav(clip.audio, clip.sampling_rate));
    console.log(`${path.basename(file)}  "${text}"`);
  }
}
console.log(`Samples are in ${outDir}. The "-set" file is each friend's current speed.`);
