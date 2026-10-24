/* The pre-made voice pack is generated once by Kokoro and streamed from App Storage, as Opus where the browser
   plays it (iPhone, iPad and Mac, including the app on iPhone, which shows this website) and as MP3 elsewhere
   (Android included). Inside the app, on iPhone and Android, the whole pack is also downloaded once on Wi-Fi
   (natural-voice.ts). Sentences outside the pack still use the voice server, with the device voice as the last
   fallback. */

/** The voices the pack is made for. */
export const PACK_VOICES = ['af_heart'] as const;
/** Every sentence is made twice: Opus in a .caf file (about 60% of the MP3's size; Apple browsers play it) and MP3. */
export const PACK_FORMATS = ['mp3', 'caf'] as const;
export type PackFormat = (typeof PACK_FORMATS)[number];

let format: PackFormat | null = null;
/** Opus where this browser can play it (Safari and every iPhone and iPad web view), MP3 everywhere else. Only a
    browser that says it plays Opus inside CAF gets it: an older Safari plays CAF files but can't decode Opus. */
export function preferredPackFormat(): PackFormat {
  if (format) return format;
  try {
    const probe = typeof document === 'undefined' ? null : document.createElement('audio');
    format = probe && probe.canPlayType('audio/x-caf; codecs=opus') ? 'caf' : 'mp3';
  } catch {
    format = 'mp3';
  }
  return format;
}
export type PackVoice = (typeof PACK_VOICES)[number];

/** The sentence exactly as the voice server would read it (same cleaning as the server). */
export const cleanSentence = (text: string) => text.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

/** A short, stable name for a sentence's audio file: FNV-1a 64-bit of the cleaned sentence, in hex. */
export function voiceKey(sentence: string): string {
  let hash = 0xcbf29ce484222325n;
  const bytes = new TextEncoder().encode(cleanSentence(sentence));
  for (const byte of bytes) {
    hash ^= BigInt(byte);
    hash = (hash * 0x100000001b3n) & 0xffffffffffffffffn;
  }
  return hash.toString(16).padStart(16, '0');
}

/** `cast`: each story friend's film lines, by voice (made in that voice as well as in Heart). */
export type VoicePackIndex = { version: 1; voices: string[]; keys: string[]; cast?: Record<string, string[]> };
export type LoadedVoicePack = { voices: Set<string>; keys: Set<string>; cast: Map<string, Set<string>> };

const base = () => {
  try { return (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'; } catch { return '/'; }
};
/** The small index ships with the app; the clips stream from App Storage. */
export const voicePackIndexPath = () => `${base().replace(/\/?$/, '/')}voice/index.json`;
export const voicePackPath = (path: string) => `/api/storage/public-objects/voice/${path}`;

let index: Promise<LoadedVoicePack | null> | null = null;
/** When the last index fetch came back empty (null while the pack is loaded or still loading). */
let missedAt: number | null = null;

/** How long to wait for the index before reading without it, and how soon to try again after a miss. */
export const PACK_INDEX_TIMEOUT_MS = 4000;
const PACK_RETRY_MS = 30_000;

/** Load the pack's index once. No pack yet (or offline): null, and Listen uses the voice server as before.
    A miss (offline, a slow network, an error) is only remembered for a short while, so the pack is found once the
    connection comes back. */
export function loadVoicePack(fetchFn: typeof fetch = fetch): Promise<LoadedVoicePack | null> {
  if (index && !(missedAt !== null && Date.now() - missedAt > PACK_RETRY_MS)) return index;
  missedAt = null;
  const attempt: Promise<LoadedVoicePack | null> = (async () => {
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), PACK_INDEX_TIMEOUT_MS) : null;
    try {
      const response = await fetchFn(voicePackIndexPath(), controller ? { signal: controller.signal } : undefined);
      if (!response.ok) return null;
      const data = await response.json() as Partial<VoicePackIndex>;
      if (data.version !== 1 || !Array.isArray(data.voices) || !Array.isArray(data.keys)) return null;
      const cast = new Map<string, Set<string>>();
      if (data.cast && typeof data.cast === 'object') {
        for (const [voice, keys] of Object.entries(data.cast)) if (Array.isArray(keys)) cast.set(voice, new Set(keys));
      }
      return { voices: new Set(data.voices), keys: new Set(data.keys), cast };
    } catch {
      return null;
    } finally {
      if (timer) clearTimeout(timer);
    }
  })();
  index = attempt;
  void attempt.then((pack) => { if (!pack && index === attempt) missedAt = Date.now(); });
  return attempt;
}

/** Does the pack cover this voice at all? (Then the server isn't needed to start reading.) */
export async function voicePackHasVoice(voice: string, fetchFn?: typeof fetch): Promise<boolean> {
  return !!(await loadVoicePack(fetchFn))?.voices.has(voice);
}

/** The pack file for one sentence in one voice, or null when the pack doesn't have it. */
export async function voicePackUrl(voice: string, sentence: string, fetchFn?: typeof fetch, fileFormat: PackFormat = preferredPackFormat()): Promise<string | null> {
  const pack = await loadVoicePack(fetchFn);
  const key = voiceKey(sentence);
  const listed = PACK_VOICES.includes(voice as PackVoice) ? pack?.voices.has(voice) && pack.keys.has(key) : pack?.cast.get(voice)?.has(key);
  return listed ? voicePackPath(`${voice}/${key}.${fileFormat}`) : null;
}

/** Tests only: forget the loaded index (and the chosen format). */
export function resetVoicePackForTests() { index = null; missedAt = null; format = null; }
