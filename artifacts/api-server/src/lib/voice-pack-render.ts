// Makes the pre-made voice pack: each listed sentence, read once by Kokoro in one voice and saved twice, named by
// the sentence's key: Opus (mono, 16 kbps, in a .caf file) for Apple browsers, the Expo iPhone app included,
// and an MP3 (mono, 24 kHz, 24 kbps) for everyone else. Opus is about 60% of the MP3's size; Chrome can't play .caf.
// Sentences with both files are skipped, so a run only makes new ones. Used by scripts/render-voice-pack.ts in
// the "voice pack" GitHub workflow.
import { spawn } from "node:child_process";
import { access, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { encodeWav, speedFor, type VoiceEngine } from "./voice";

/** One sentence to read. `voice` is set for a story friend's film line (made in that voice); unset means Heart. */
export type PackSentence = { key: string; text: string; voice?: string };

/** The two encodings, by file extension: ffmpeg output options for each. */
export const PACK_FORMATS = {
  mp3: ["-ac", "1", "-ar", "24000", "-b:a", "24k", "-f", "mp3"],
  caf: ["-ac", "1", "-c:a", "libopus", "-b:a", "16k", "-application", "voip", "-f", "caf"],
} as const;
export type PackFormat = keyof typeof PACK_FORMATS;

/** WAV in, one pack format out, through ffmpeg. */
export function encodeClip(wav: Buffer, format: PackFormat, file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "wav", "-i", "pipe:0", ...PACK_FORMATS[format], file]);
    let errors = "";
    ffmpeg.stderr.on("data", (chunk) => { errors += chunk; });
    ffmpeg.on("error", reject);
    ffmpeg.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg failed: ${errors.trim()}`))));
    ffmpeg.stdin.end(wav);
  });
}

/** This shard's share of the sentences: every `shards`-th one, starting at `shard`. */
export const shardOf = <T>(items: T[], shard: number, shards: number) => items.filter((_, index) => index % shards === shard);

const exists = (file: string) => access(file).then(() => true, () => false);

/** Make the missing clips for `voice` in `outDir/<voice>/`. Returns how many sentences were made and skipped. */
export async function renderVoicePack(engine: VoiceEngine, voice: string, sentences: PackSentence[], outDir: string,
  log: (line: string) => void = () => undefined,
  requiredFormats?: ReadonlyMap<string, readonly PackFormat[]>): Promise<{ made: number; skipped: number }> {
  const dir = path.join(outDir, voice);
  await mkdir(dir, { recursive: true });
  let made = 0, skipped = 0;
  for (const sentence of sentences) {
    const formats = requiredFormats?.get(sentence.key) ?? (Object.keys(PACK_FORMATS) as PackFormat[]);
    const files = formats.map((format) => ({ format, file: path.join(dir, `${sentence.key}.${format}`) }));
    const missing = [];
    for (const entry of files) if (!(await exists(entry.file))) missing.push(entry);
    if (!missing.length) { skipped++; continue; }
    const clip = await engine.generate(sentence.text, { voice, speed: speedFor(voice) });
    const wav = encodeWav(clip.audio, clip.sampling_rate);
    // Write beside it, then move into place, so a stopped run never leaves half a file that later runs would skip.
    for (const { format, file } of missing) {
      await encodeClip(wav, format, `${file}.part`);
      await rename(`${file}.part`, file);
    }
    made++;
    if (made % 100 === 0) log(`${voice}: ${made} made, ${skipped} skipped`);
  }
  return { made, skipped };
}
