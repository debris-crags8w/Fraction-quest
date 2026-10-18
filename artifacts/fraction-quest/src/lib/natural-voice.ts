/* A natural read-aloud voice: Kokoro, an open-source neural voice. Lesson and story sentences come from the
   pre-made voice pack (small MP3 files shipped with the app, see voice-pack.ts), so Listen starts at once. A
   sentence the pack doesn't have is made by the app's server, and the device only plays the audio. (Running the
   model in the browser crashed iPhone Safari.) Only the lesson sentence is sent, never a child's answers. When
   neither can play, Listen uses the device's own voice. */
import { loadVoicePack, preferredPackFormat, voicePackHasVoice, voicePackPath, voicePackUrl } from './voice-pack';

/** Two pack voices. A saved choice of a retired voice falls back to Heart. */
export type NaturalVoiceId = 'af_heart' | 'am_michael';
export const NATURAL_VOICES: { id: NaturalVoiceId; name: string; note: string }[] = [
  { id: 'af_heart', name: 'Heart', note: 'warm and gentle' },
  { id: 'am_michael', name: 'Michael', note: 'clear and calm' },
];
export const NATURAL_VOICE_SPEED = 0.92; // the server reads at this speed
const STORAGE_KEY = 'fraction-quest-natural-voice';
const STATUS_URL = '/api/voice/status';
const HEALTH_URL = '/api/healthz';
export const speechUrl = (voice: NaturalVoiceId, text: string) =>
  `/api/voice/speech?voice=${encodeURIComponent(voice)}&text=${encodeURIComponent(text)}`;
const SPEECH_BLOB_CACHE_LIMIT = 48;
const speechBlobCache = new Map<string, Blob>();
const speechBlobRequests = new Map<string, Promise<Blob>>();
const speechBlobKey = (voice: NaturalVoiceId, text: string) => `${voice}\u0000${text}`;

export type NaturalVoiceState = 'off' | 'idle' | 'loading' | 'ready' | 'unsupported' | 'error';
export type NaturalVoiceStatus = { state: NaturalVoiceState; progress?: number };
type Clip = { toBlob(): Blob };
export type NaturalEngine = { generate(text: string, options: { voice: string; speed: number }): Promise<Clip> };

export function isIOSVoiceDevice(userAgent: string, platform: string, maxTouchPoints: number): boolean {
  return /\b(?:iPhone|iPad|iPod)\b/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1);
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

/** Can this browser fetch and play the server's audio? (Every current browser, iPhone Safari included.) */
export function naturalVoiceSupported(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined' && typeof fetch === 'function'
    && typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function';
}

let engine: NaturalEngine | null = null;
let loading: Promise<NaturalEngine | null> | null = null;
let failed = false;
const listeners = new Set<(status: NaturalVoiceStatus) => void>();

export function naturalVoiceStatus(): NaturalVoiceStatus {
  if (currentChoice() === 'off') return { state: 'off' };
  if (engine) return { state: 'ready' };
  if (!naturalVoiceSupported()) return { state: 'unsupported' };
  if (failed) return { state: 'error' };
  if (loading) return { state: 'loading' };
  return { state: 'idle' };
}
function publish() { const status = naturalVoiceStatus(); listeners.forEach((listener) => listener(status)); }
export function onNaturalVoiceStatus(listener: (status: NaturalVoiceStatus) => void): () => void {
  listeners.add(listener); listener(naturalVoiceStatus());
  return () => { listeners.delete(listener); };
}

function rememberSpeechBlob(key: string, blob: Blob) {
  speechBlobCache.delete(key);
  speechBlobCache.set(key, blob);
  while (speechBlobCache.size > SPEECH_BLOB_CACHE_LIMIT) {
    speechBlobCache.delete(speechBlobCache.keys().next().value as string);
  }
}

/* Pack files never change (each one is named by its sentence), so once fetched they are kept on the device and the
   next visit reads them without the network. Browsers without Cache Storage just fetch them each time. */
const PACK_CACHE = 'fraction-quest-voice-pack-v1';
let packCache: Promise<Cache | null> | null = null;
const openPackCache = () => packCache ??= (typeof caches === 'undefined'
  ? Promise.resolve(null)
  : caches.open(PACK_CACHE).catch(() => null));

async function fetchPackFile(url: string): Promise<Blob | null> {
  const store = await openPackCache();
  const saved = await store?.match(url).catch(() => undefined);
  if (saved) return saved.blob();
  const response = await fetch(url);
  if (!response.ok) return null;
  if (store) {
    try { await store.put(url, response.clone()); } catch { /* storage full or blocked: still play it */ }
  }
  return response.blob();
}

const WHOLE_PACK_MARKER = 'fraction-quest-voice-pack-downloaded';
const WHOLE_PACK_PARALLEL = 3;

/** Inside the iPhone app, on Wi-Fi: fetch every pack clip once into the device's voice cache, so every sentence
    plays at once (lessons still load from the website). Clips already saved are skipped, so a stopped download
    picks up where it left off; once a whole index is saved, later launches skip the check entirely. Returns how
    many clips are saved, or null when there is nothing to download into (no pack, no Cache Storage). */
export async function downloadWholeVoicePack(
  voice: NaturalVoiceId,
  shouldContinue: () => boolean,
  onProgress?: (saved: number, total: number) => void,
): Promise<number | null> {
  const [pack, store] = await Promise.all([loadVoicePack(), openPackCache()]);
  if (!pack?.voices.has(voice) || !store) return null;
  const format = preferredPackFormat();
  const keys = [...pack.keys].sort();
  const marker = `${voice}:${format}:${keys.length}:${keys[0] ?? ''}:${keys[keys.length - 1] ?? ''}`;
  try { if (globalThis.localStorage?.getItem(WHOLE_PACK_MARKER) === marker) return keys.length; } catch { /* check the cache instead */ }
  let next = 0;
  let saved = 0;
  let failed = false;
  let absent = 0; // not in App Storage yet (a brand-new sentence): skipped, tried again next launch
  await Promise.all(Array.from({ length: WHOLE_PACK_PARALLEL }, async () => {
    while (next < keys.length && shouldContinue()) {
      const url = voicePackPath(`${voice}/${keys[next++]}.${format}`);
      try {
        if (!(await store.match(url))) {
          const response = await fetch(url);
          if (response.status === 404) { absent++; continue; }
          if (!response.ok) throw new Error(`The voice pack answered ${response.status}`);
          await store.put(url, response);
        }
        saved++;
        onProgress?.(saved, keys.length);
      } catch {
        failed = true; // full storage or a lost connection: try again next launch
        return;
      }
    }
  }));
  if (saved === keys.length && !failed) {
    try { globalThis.localStorage?.setItem(WHOLE_PACK_MARKER, marker); } catch { /* checked again next time */ }
  }
  return saved;
}

async function fetchSpeechBlob(voice: NaturalVoiceId, text: string): Promise<Blob> {
  const key = speechBlobKey(voice, text);
  const cached = speechBlobCache.get(key);
  if (cached) {
    rememberSpeechBlob(key, cached);
    return cached;
  }
  const pending = speechBlobRequests.get(key);
  if (pending) return pending;

  const request = (async () => {
    // The pre-made pack first: instant, and no work for the server.
    const packUrl = await voicePackUrl(voice, text);
    if (packUrl) {
      try {
        const blob = await fetchPackFile(packUrl);
        if (blob?.size) {
          rememberSpeechBlob(key, blob);
          return blob;
        }
      } catch { /* the server can still make it */ }
    }
    const response = await fetch(speechUrl(voice, text));
    if (!response.ok) throw new Error(`The voice server answered ${response.status}`);
    const blob = await response.blob();
    if (!blob.size) throw new Error('The voice server returned an empty audio clip');
    rememberSpeechBlob(key, blob);
    return blob;
  })();
  speechBlobRequests.set(key, request);
  try {
    return await request;
  } finally {
    if (speechBlobRequests.get(key) === request) speechBlobRequests.delete(key);
  }
}

/** Fetches one sentence's audio from the server. */
export const serverEngine: NaturalEngine = {
  async generate(text, { voice }) {
    const blob = await fetchSpeechBlob(voice as NaturalVoiceId, text);
    return { toBlob: () => blob };
  },
};

/** Prepare the selected voice's section audio before Listen is tapped. Failures stay silent; Listen can retry. */
export async function prefetchNaturalVoice(
  voice: NaturalVoiceId,
  parts: readonly string[],
  shouldContinue: () => boolean = () => true,
): Promise<void> {
  for (const text of parts) {
    if (!text.trim() || currentChoice() !== voice || !shouldContinue()) return;
    try {
      await fetchSpeechBlob(voice, text);
    } catch {
      return;
    }
  }
}

export type NaturalVoiceLoadOptions = {
  /** The grown-ups' self-test: check the server even when the voice is switched off. */
  diagnostic?: boolean;
  onProgress?: (progress: number) => void;
  onError?: (error: unknown) => void;
};

const READY_WAIT_MS = 120_000; // the server's first model load can take a minute
const POLL_MS = 2_000;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Ask the server whether the voice is ready, waiting while it loads the model the first time. */
export function warmUpNaturalVoice(options: NaturalVoiceLoadOptions = {}): Promise<NaturalEngine | null> {
  if ((!options.diagnostic && currentChoice() === 'off') || !naturalVoiceSupported()) return Promise.resolve(null);
  if (engine) return Promise.resolve(engine);
  if (loading) return loading;
  failed = false;
  loading = (async () => {
    try {
      // With the voice pack there is nothing to wait for: sentences play from files, and only the rare sentence
      // outside the pack asks the server. (The grown-ups' self-test still checks the server itself.)
      if (!options.diagnostic && await voicePackHasVoice(currentChoice())) {
        // The pack's audio comes through the API server: wake it now (it may be asleep) so the first clip is quick.
        try { void fetch(HEALTH_URL, { cache: 'no-store' }).catch(() => undefined); } catch { /* only a head start */ }
        try { options.onProgress?.(100); } catch { /* diagnostics only */ }
        engine = serverEngine;
        return engine;
      }
      const started = Date.now();
      for (;;) {
        const response = await fetch(STATUS_URL, { cache: 'no-store' });
        if (!response.ok) throw new Error(`The voice server answered ${response.status}`);
        const { state, error } = await response.json() as { state?: string; error?: string };
        if (state === 'ready') break;
        if (state === 'error') throw new Error(error || 'The voice model could not load on the server.');
        if (Date.now() - started > READY_WAIT_MS) throw new Error('The voice server is still loading. Try again in a minute.');
        try { options.onProgress?.(Math.min(95, Math.round(((Date.now() - started) / READY_WAIT_MS) * 100))); } catch { /* diagnostics only */ }
        await pause(POLL_MS);
      }
      try { options.onProgress?.(100); } catch { /* diagnostics only */ }
      engine = serverEngine;
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

/* iPhone Safari only lets audio start from a tap. One shared player is "unlocked" during the Listen tap (a tiny
   silent clip), and every sentence then plays through that same player, even after the network wait. */
const SILENT_WAV = 'data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YSADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='; // 50 ms of silence
let sharedPlayer: HTMLAudioElement | null = null;
export function unlockAudioPlayback(): void {
  if (typeof Audio === 'undefined') return;
  try {
    sharedPlayer ??= new Audio();
    if (sharedPlayer.src && !sharedPlayer.paused) return;
    sharedPlayer.src = SILENT_WAV;
    const result = sharedPlayer.play() as unknown;
    if (result && typeof (result as { catch?: unknown }).catch === 'function') (result as Promise<void>).catch(() => undefined);
  } catch { /* the device voice still works */ }
}
function sharedAudio(url: string): HTMLAudioElement {
  sharedPlayer ??= new Audio();
  sharedPlayer.src = url;
  return sharedPlayer;
}

export const naturalVoiceReady = () => !!engine && currentChoice() !== 'off';
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

/** Reads sentences one after another. All of them are made first, so playback never waits mid-reading. */
export function createNaturalSpeaker(
  makeAudio: (url: string) => HTMLAudioElement = sharedAudio,
  voiceOverride?: NaturalVoiceId,
  /** How long to wait for every sentence to be ready (tests use a short wait). */
  allReadyWaitMs = 12_000,
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
  const GENERATION_TIMEOUT_MS = 30_000; // a new sentence on a busy server; cached ones are instant
  const PLAYBACK_TIMEOUT_MS = 45_000;
  // Every sentence is made before the first one plays, so the reading never stalls mid-story. If they aren't all
  // ready by then (a slow server and no voice pack file), the caller reads it with the device voice instead.
  const ALL_READY_WAIT_MS = allReadyWaitMs;
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
    // One player is reused for every clip, so an "abort" for the clip before this one can still arrive. Only an
    // abort after this clip has started counts (a real stop goes through stop(), which ends the run anyway).
    audio.onabort = () => { if (started) finish(new Error('Audio playback was interrupted')); };
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
      /** Sentence `index` starts playing (a story comic follows along). */
      onPart?: (index: number) => void,
    ) {
      const mine = ++playback; cleanUp();
      if (makeAudio === sharedAudio) unlockAudioPlayback(); // still inside the tap that asked to listen
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
          const clips = await withTimeout(Promise.all(parts.map(make)), ALL_READY_WAIT_MS, 'The voice took too long to get ready')
            .catch((error) => { throw isSpeakerFailure(error) ? error : speakerFailure('generating', error); });
          for (let i = 0; i < parts.length; i++) {
            if (mine !== playback) return;
            const url = URL.createObjectURL(clips[i].toBlob()); urls.push(url);
            const audio = makeAudio(url); current = audio;
            try {
              await waitForPlayback(audio, () => { onPhase?.('playing'); try { onPart?.(i); } catch { /* a follower must not stop the reading */ } });
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
export function setNaturalEngineForTests(next: NaturalEngine | null) {
  engine = next;
  failed = false;
  loading = null;
  speechBlobCache.clear();
  speechBlobRequests.clear();
  packCache = null;
}
