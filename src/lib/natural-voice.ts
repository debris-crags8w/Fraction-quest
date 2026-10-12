/* A natural read-aloud voice: Kokoro, an open-source neural voice that runs inside the browser.
   Free, no account, and no text leaves the device. The model (about 90 MB) downloads once, the first
   time a child presses Listen, and the browser keeps it. Until it is ready, or on a device that can't
   run it, the app keeps using the device's own voice, so Listen always works. */

export type NaturalVoiceId = 'af_heart' | 'af_bella' | 'af_nicole' | 'bf_emma';
export const NATURAL_VOICES: { id: NaturalVoiceId; name: string; note: string }[] = [
  { id: 'af_heart', name: 'Heart', note: 'warm and gentle' },
  { id: 'af_bella', name: 'Bella', note: 'bright and friendly' },
  { id: 'af_nicole', name: 'Nicole', note: 'soft and calm' },
  { id: 'bf_emma', name: 'Emma', note: 'British, clear' },
];
export const NATURAL_VOICE_SPEED = 0.92;
const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const STORAGE_KEY = 'fraction-quest-natural-voice';

export type NaturalVoiceState = 'off' | 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';
export type NaturalVoiceStatus = { state: NaturalVoiceState; progress?: number };
type Clip = { toBlob(): Blob };
export type NaturalEngine = { generate(text: string, options: { voice: string; speed: number }): Promise<Clip> };

export function isIOSVoiceDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /\b(?:iPhone|iPad|iPod)\b/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function naturalVoiceDisabledOnIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return isIOSVoiceDevice(navigator.userAgent ?? '', navigator.platform ?? '', navigator.maxTouchPoints ?? 0);
}

/** The chosen natural voice, or 'off'. On by default (Heart): grown-ups can turn it off. */
export function naturalVoicePreference(): NaturalVoiceId | 'off' {
  try {
    const saved = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (saved === 'off' || NATURAL_VOICES.some((voice) => voice.id === saved)) return saved as NaturalVoiceId | 'off';
  } catch { /* storage blocked: use the default */ }
  return 'af_heart';
}
export function setNaturalVoicePreference(choice: NaturalVoiceId | 'off'): void {
  try { globalThis.localStorage?.setItem(STORAGE_KEY, choice); } catch { /* not saved; still used this session */ }
  sessionChoice = choice;
  publish();
}
let sessionChoice: NaturalVoiceId | 'off' | null = null;
const currentChoice = () => sessionChoice ?? naturalVoicePreference();

/** Can this browser run the model? (WebAssembly and audio playback.) */
function naturalVoiceRuntimeSupported(): boolean {
  return typeof window !== 'undefined' && typeof WebAssembly === 'object' && typeof Audio !== 'undefined'
    && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
}
export function naturalVoiceSupported(): boolean {
  return !naturalVoiceDisabledOnIOS() && naturalVoiceRuntimeSupported();
}

let engine: NaturalEngine | null = null;
let loading: Promise<NaturalEngine | null> | null = null;
let failed = false;
let progress = 0;
const listeners = new Set<(status: NaturalVoiceStatus) => void>();

export function naturalVoiceStatus(): NaturalVoiceStatus {
  if (currentChoice() === 'off') return { state: 'off' };
  if (naturalVoiceDisabledOnIOS()) return { state: 'unsupported' };
  if (!engine && !naturalVoiceSupported()) return { state: 'unsupported' };
  if (engine) return { state: 'ready' };
  if (failed) return { state: 'error' };
  if (loading) return { state: 'loading', progress };
  return { state: 'idle' };
}
function publish() { const status = naturalVoiceStatus(); listeners.forEach((listener) => listener(status)); }
export function onNaturalVoiceStatus(listener: (status: NaturalVoiceStatus) => void): () => void {
  listeners.add(listener); listener(naturalVoiceStatus());
  return () => { listeners.delete(listener); };
}

export type NaturalVoiceLoadOptions = {
  /** Explicit adult diagnostic only; normal iOS lessons still use the device voice. */
  diagnostic?: boolean;
  onProgress?: (progress: number) => void;
  onError?: (error: unknown) => void;
};

/** Start the one-time download. The diagnostic flag is only for the explicit Kokoro test. */
export function warmUpNaturalVoice(options: NaturalVoiceLoadOptions = {}): Promise<NaturalEngine | null> {
  const canRun = options.diagnostic ? naturalVoiceRuntimeSupported() : naturalVoiceSupported();
  if ((!options.diagnostic && currentChoice() === 'off') || !canRun) return Promise.resolve(null);
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  failed = false; progress = 0;
  loading = (async () => {
    try {
      // Plain-WASM ONNX Runtime from the app's own files (not the WebGPU build that crashes iOS Safari 26).
      const { configureOnnxRuntime } = await import('./onnx-runtime');
      configureOnnxRuntime();
      const { KokoroTTS } = await import('kokoro-js');
      const tts = await KokoroTTS.from_pretrained(MODEL_ID, {
        dtype: 'q8', device: 'wasm',
        progress_callback: (event: { status?: string; progress?: number }) => {
          if (event.status === 'progress' && typeof event.progress === 'number') {
            progress = Math.max(0, Math.min(100, Math.round(event.progress)));
            try { options.onProgress?.(progress); } catch { /* diagnostics must not interrupt model loading */ }
            publish();
          }
        },
      });
      engine = tts as unknown as NaturalEngine;
      return engine;
    } catch (error) {
      failed = true;
      try { options.onError?.(error); } catch { /* diagnostics must not interrupt the fallback voice */ }
      return null;
    } finally {
      loading = null;
      publish();
    }
  })();
  publish();
  return loading;
}

export const naturalVoiceReady = () => !!engine && currentChoice() !== 'off' && naturalVoiceSupported();
export const naturalVoiceId = (): NaturalVoiceId | null => { const choice = currentChoice(); return choice === 'off' ? null : choice; };
export type NaturalVoicePhase = 'preparing' | 'generating' | 'playing';
export type NaturalVoiceFailureStage = 'generating' | 'playing';
type SpeakerFailure = { naturalVoiceFailure: true; stage: NaturalVoiceFailureStage; error: unknown };
const speakerFailure = (stage: NaturalVoiceFailureStage, error: unknown): SpeakerFailure => ({
  naturalVoiceFailure: true, stage, error,
});
function isSpeakerFailure(value: unknown): value is SpeakerFailure {
  return typeof value === 'object' && value !== null && 'naturalVoiceFailure' in value
    && (value as SpeakerFailure).naturalVoiceFailure === true;
}

function withTimeout<T>(operation: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    operation.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** Reads sentences one after another: the next sentence is made while the current one plays. */
export function createNaturalSpeaker(
  makeAudio: (url: string) => HTMLAudioElement = (url) => new Audio(url),
  voiceOverride?: NaturalVoiceId,
) {
  let playback = 0;
  let current: HTMLAudioElement | null = null;
  const urls: string[] = [];
  const cleanUp = () => {
    const audio = current;
    current = null;
    try { if (typeof audio?.pause === 'function') audio.pause(); } catch { /* partial mobile audio implementations */ }
    while (urls.length) {
      const url = urls.pop()!;
      try { if (typeof URL?.revokeObjectURL === 'function') URL.revokeObjectURL(url); } catch { /* cleanup must not mask playback errors */ }
    }
  };
  const GENERATION_TIMEOUT_MS = 30_000;
  const PLAYBACK_TIMEOUT_MS = 45_000;
  const waitForPlayback = (audio: HTMLAudioElement, onPlaying?: () => void) => new Promise<void>((resolve, reject) => {
    let settled = false;
    let started = false;
    let timer: ReturnType<typeof setTimeout>;
    const markStarted = () => {
      if (started) return;
      started = true;
      onPlaying?.();
    };
    const finish = (error?: unknown) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      audio.onended = null;
      audio.onerror = null;
      audio.onabort = null;
      audio.onplaying = null;
      audio.onloadedmetadata = null;
      if (error) reject(error);
      else resolve();
    };
    const setWatchdog = () => {
      clearTimeout(timer);
      const duration = audio.duration;
      const timeout = Number.isFinite(duration) && duration > 0
        ? Math.min(Math.max(duration * 1000 + 10_000, 15_000), 120_000)
        : PLAYBACK_TIMEOUT_MS;
      timer = setTimeout(() => finish(new Error('Audio playback did not finish')), timeout);
    };
    audio.onended = () => finish();
    audio.onerror = () => finish(new Error('Audio playback failed'));
    audio.onabort = () => finish(new Error('Audio playback was interrupted'));
    audio.onplaying = markStarted;
    audio.onloadedmetadata = setWatchdog;
    setWatchdog();
    try {
      // Some embedded and older mobile browsers start playback but return no
      // promise from play(). Only attach a rejection handler when one exists.
      const result = audio.play() as unknown;
      if (result && (typeof result === 'object' || typeof result === 'function')
        && typeof (result as { then?: unknown }).then === 'function') {
        (result as Promise<void>).then(undefined, finish);
      }
    } catch (error) {
      finish(error);
    }
  });
  return {
    /** Speak `parts`; `onDone` runs once at the end (or on failure: then the caller can fall back). */
    speak(
      parts: string[],
      onDone: (ok: boolean) => void,
      onPhase?: (phase: NaturalVoicePhase) => void,
      onFailure?: (stage: NaturalVoiceFailureStage, error: unknown) => void,
    ) {
      const mine = ++playback; cleanUp();
      const voice = voiceOverride ?? naturalVoiceId();
      if (!engine || !voice || !parts.length) { onDone(!parts.length); return; }
      onPhase?.('preparing');
      const ready = engine;
      const make = (text: string) => {
        onPhase?.('generating');
        return withTimeout(ready.generate(text, { voice, speed: NATURAL_VOICE_SPEED }),
          GENERATION_TIMEOUT_MS, 'Voice generation timed out')
          .catch((error) => { throw speakerFailure('generating', error); });
      };
      (async () => {
        try {
          let next = make(parts[0]);
          for (let i = 0; i < parts.length; i++) {
            const clip = await next;
            if (mine !== playback) return;
            if (i + 1 < parts.length) next = make(parts[i + 1]);
            const url = URL.createObjectURL(clip.toBlob()); urls.push(url);
            const audio = makeAudio(url); current = audio;
            try {
              await waitForPlayback(audio, () => onPhase?.('playing'));
            } catch (error) {
              throw speakerFailure('playing', error);
            }
            if (mine !== playback) return;
          }
          if (mine === playback) { cleanUp(); onDone(true); }
        } catch (error) {
          if (mine === playback) {
            cleanUp();
            const failure = isSpeakerFailure(error) ? error : speakerFailure('generating', error);
            try { onFailure?.(failure.stage, failure.error); } catch { /* reporting must not block device-voice fallback */ }
            onDone(false);
          }
        }
      })();
    },
    stop() { playback += 1; cleanUp(); },
  };
}

/** Tests only: pretend the model is loaded (or unload it). */
export function setNaturalEngineForTests(next: NaturalEngine | null) { engine = next; failed = false; loading = null; }
