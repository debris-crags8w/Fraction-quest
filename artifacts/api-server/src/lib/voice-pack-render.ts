// Makes the pre-made voice pack: each listed sentence, read once by Kokoro in one voice, saved as a small MP3
// (mono, 24 kHz, 24 kbps) named by the sentence's key. Files already there are skipped, so a run only makes new
// sentences. Used by scripts/render-voice-pack.ts in the "voice pack" GitHub workflow.
import { spawn } from "node:child_process";
import { access, mkdir, rename } from "node:fs/promises";
import path from "node:path";
import { encodeWav, VOICE_SPEED, type VoiceEngine } from "./voice";

export type PackSentence = { key: string; text: string };

/** WAV in, MP3 out, through ffmpeg. */
export function encodeMp3(wav: Buffer, file: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const ffmpeg = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "wav", "-i", "pipe:0", "-ac", "1", "-ar", "24000", "-b:a", "24k", "-f", "mp3", file]);
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

/** Make the missing MP3s for `voice` in `outDir/<voice>/`. Returns how many were made and skipped. */
export async function renderVoicePack(engine: VoiceEngine, voice: string, sentences: PackSentence[], outDir: string,
  log: (line: string) => void = () => undefined): Promise<{ made: number; skipped: number }> {
  const dir = path.join(outDir, voice);
  await mkdir(dir, { recursive: true });
  let made = 0, skipped = 0;
  for (const sentence of sentences) {
    const file = path.join(dir, `${sentence.key}.mp3`);
    if (await exists(file)) { skipped++; continue; }
    const clip = await engine.generate(sentence.text, { voice, speed: VOICE_SPEED });
    // Write beside it, then move into place, so a stopped run never leaves half a file that later runs would skip.
    await encodeMp3(encodeWav(clip.audio, clip.sampling_rate), `${file}.part`);
    await rename(`${file}.part`, file);
    made++;
    if (made % 100 === 0) log(`${voice}: ${made} made, ${skipped} skipped`);
  }
  return { made, skipped };
}
