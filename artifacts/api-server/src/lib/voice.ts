// Natural read-aloud voice, made on the server: Kokoro (an open-source neural voice) runs here, and every
// device just plays a short WAV file. Running the model on phones crashed iPhone Safari, so it no longer runs
// in the browser. Only lesson text arrives here (never a child's name or answers). Each sentence is made once
// and cached on disk and in memory, so repeats are instant.
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/** The app's voice, Heart (the one the pre-made voice pack is made for). */
export const VOICES = ["af_heart"] as const;
export type VoiceId = (typeof VOICES)[number];
export const DEFAULT_VOICE: VoiceId = "af_heart";
export const VOICE_SPEED = 0.92;
export const MAX_TEXT_LENGTH = 400;
const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";

/** What the route needs from Kokoro (swappable in tests). */
export type VoiceEngine = {
  generate(text: string, options: { voice: string; speed: number }): Promise<{ audio: Float32Array; sampling_rate: number }>;
};
export type VoiceState = "idle" | "loading" | "ready" | "error";

let engine: VoiceEngine | null = null;
let loading: Promise<VoiceEngine | null> | null = null;
let state: VoiceState = "idle";
let lastError = "";

export function voiceState(): { state: VoiceState; error?: string } {
  return state === "error" ? { state, error: lastError } : { state };
}

/** Load the model once (the first call starts it; later calls share it). Never throws. */
export function loadVoiceEngine(): Promise<VoiceEngine | null> {
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  state = "loading";
  loading = (async () => {
    try {
      const { KokoroTTS } = await import("kokoro-js");
      const tts = await KokoroTTS.from_pretrained(MODEL_ID, { dtype: "q8", device: "cpu" });
      engine = tts as unknown as VoiceEngine;
      state = "ready";
      return engine;
    } catch (error) {
      state = "error";
      lastError = error instanceof Error ? error.message.slice(0, 300) : "The voice model could not load.";
      return null;
    } finally {
      loading = null;
    }
  })();
  return loading;
}

/** Tests only: use a fake engine (or none). */
export function setVoiceEngineForTests(next: VoiceEngine | null) {
  engine = next; loading = null; state = next ? "ready" : "idle"; lastError = "";
  memory.clear(); inFlight.clear();
}

/** Plain text the voice can read: no control characters, single spaces, a sane length. */
export function cleanVoiceText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const text = raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  return text && text.length <= MAX_TEXT_LENGTH ? text : null;
}
export const isVoiceId = (value: unknown): value is VoiceId => VOICES.includes(value as VoiceId);

/** 16-bit PCM mono WAV: plays everywhere, including iPhone Safari. */
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer {
  const data = Buffer.alloc(samples.length * 2);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0));
    data.writeInt16LE(Math.round(s < 0 ? s * 0x8000 : s * 0x7fff), i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0); header.writeUInt32LE(36 + data.length, 4); header.write("WAVE", 8);
  header.write("fmt ", 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24); header.writeUInt32LE(sampleRate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
  header.write("data", 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const CACHE_DIR = process.env.VOICE_CACHE_DIR || path.join(os.tmpdir(), "fraction-quest-voice");
const MEMORY_LIMIT = 300;
const memory = new Map<string, Buffer>(); // insertion order = least recently used first
const inFlight = new Map<string, Promise<Buffer>>();
let queue: Promise<unknown> = Promise.resolve(); // one sentence at a time: the model is CPU-heavy

export const voiceCacheKey = (voice: VoiceId, text: string) =>
  createHash("sha256").update(`${MODEL_ID}|${voice}|${VOICE_SPEED}|${text}`).digest("hex");

function remember(key: string, wav: Buffer) {
  memory.delete(key); memory.set(key, wav);
  while (memory.size > MEMORY_LIMIT) memory.delete(memory.keys().next().value as string);
}

/** True when this sentence is already made (cache hits don't count against rate limits). */
export async function isVoiceCached(voice: VoiceId, text: string): Promise<boolean> {
  const key = voiceCacheKey(voice, text);
  if (memory.has(key)) return true;
  try { await readFile(path.join(CACHE_DIR, `${key}.wav`)); return true; } catch { return false; }
}

/** The WAV for `text` in `voice`: from memory, then disk, else made by Kokoro (queued) and cached. */
export async function speechWav(voice: VoiceId, text: string): Promise<Buffer> {
  const key = voiceCacheKey(voice, text);
  const hit = memory.get(key);
  if (hit) { remember(key, hit); return hit; }
  const pending = inFlight.get(key);
  if (pending) return pending;
  const job = (async () => {
    try {
      const wav = await readFile(path.join(CACHE_DIR, `${key}.wav`));
      remember(key, wav);
      return wav;
    } catch { /* not cached yet */ }
    const ready = await loadVoiceEngine();
    if (!ready) throw new Error("The voice model is not available.");
    const run = queue.then(() => ready.generate(text, { voice, speed: VOICE_SPEED }));
    queue = run.catch(() => undefined);
    const clip = await run;
    const wav = encodeWav(clip.audio, clip.sampling_rate);
    remember(key, wav);
    try {
      await mkdir(CACHE_DIR, { recursive: true });
      await writeFile(path.join(CACHE_DIR, `${key}.wav`), wav);
    } catch { /* a read-only disk only costs speed */ }
    return wav;
  })();
  inFlight.set(key, job);
  try { return await job; } finally { inFlight.delete(key); }
}
