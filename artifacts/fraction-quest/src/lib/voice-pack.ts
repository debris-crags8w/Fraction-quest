/* The pre-made voice pack: every sentence the app can read from its lessons and story, made once by Kokoro for
   each pack voice and shipped as small MP3 files next to the app. Listen plays the file straight away, with no
   server work. A sentence that isn't in the pack (a practice question with new numbers, a child's name) still
   goes to the voice server, and the device voice remains the last fallback. */

/** The voices the pack is made for. */
export const PACK_VOICES = ['af_heart', 'am_michael', 'bf_emma'] as const;
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

export type VoicePackIndex = { version: 1; voices: string[]; keys: string[] };

const base = () => {
  try { return (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/'; } catch { return '/'; }
};
export const voicePackPath = (path: string) => `${base().replace(/\/?$/, '/')}voice/${path}`;

let index: Promise<{ voices: Set<string>; keys: Set<string> } | null> | null = null;

/** Load the pack's index once. No pack yet (or offline): null, and Listen uses the voice server as before. */
export function loadVoicePack(fetchFn: typeof fetch = fetch): Promise<{ voices: Set<string>; keys: Set<string> } | null> {
  index ??= (async () => {
    try {
      const response = await fetchFn(voicePackPath('index.json'));
      if (!response.ok) return null;
      const data = await response.json() as Partial<VoicePackIndex>;
      if (data.version !== 1 || !Array.isArray(data.voices) || !Array.isArray(data.keys)) return null;
      return { voices: new Set(data.voices), keys: new Set(data.keys) };
    } catch {
      return null;
    }
  })();
  return index;
}

/** Does the pack cover this voice at all? (Then the server isn't needed to start reading.) */
export async function voicePackHasVoice(voice: string, fetchFn?: typeof fetch): Promise<boolean> {
  return !!(await loadVoicePack(fetchFn))?.voices.has(voice);
}

/** The pack file for one sentence in one voice, or null when the pack doesn't have it. */
export async function voicePackUrl(voice: string, sentence: string, fetchFn?: typeof fetch): Promise<string | null> {
  const pack = await loadVoicePack(fetchFn);
  const key = voiceKey(sentence);
  return pack?.voices.has(voice) && pack.keys.has(key) ? voicePackPath(`${voice}/${key}.mp3`) : null;
}

/** Tests only: forget the loaded index. */
export function resetVoicePackForTests() { index = null; }
