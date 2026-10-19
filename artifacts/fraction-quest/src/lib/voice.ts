/* Read-aloud helpers: choose a gentle, natural-sounding woman's voice when the device has one, kid-friendly wording
   ("three fourths", not "3 over 4"), a calm pace, and sentence splitting for pauses. LearningText does the speaking. */

type VoiceLike = Pick<SpeechSynthesisVoice, 'name' | 'lang'> & { default?: boolean };

// Warm female voices found on common devices (Apple, Microsoft Edge "Natural", Google, Android network voices).
const GENTLE = [
  /\bAva\b/i, /\bSamantha\b/i, /\bAllison\b/i, /\bSusan\b/i, /\bZoe\b/i, /\bNicky\b/i, /\bSerena\b/i, /\bKaren\b/i, /\bMoira\b/i, /\bTessa\b/i, /\bKate\b/i,
  /\b(Jenny|Aria|Ana|Michelle|Emma|Sonia|Libby|Natasha|Clara)\b/i, /Google US English/i, /Google UK English Female/i, /\bZira\b/i,
  /en-(us|gb|au)-x-(sfg|tpf|iob|iog|tpc|gba|aua)/i, /\bfemale\b/i,
];
// Voices to avoid: men's voices and the novelty/old robotic ones.
const AVOID = /\b(Alex|Daniel|David|Mark|Fred|Guy|Ryan|Christopher|Eric|Roger|Steffan|Thomas|Aaron|Arthur|Gordon|Oliver|Reed|Rocko|Grandpa|Grandma|Eddy|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Kathy|Princess|Deranged|Hysterical|male)\b|x-(tpd|iol|iom|gbd|gbb|auc|aud)/i;
const NATURAL = /natural|neural|enhanced|premium|online|network/i;

const norm = (lang: string) => lang.toLowerCase().replace(/_/g, '-');
/** Score a voice: the wanted language first, then gentle female names, then natural-sounding quality. Lower than 0 = avoid. */
export function voiceScore(voice: VoiceLike, language = 'en-US'): number {
  if (norm(voice.lang).split('-')[0] !== norm(language).split('-')[0]) return -100;
  if (AVOID.test(voice.name)) return -10;
  let score = norm(voice.lang) === norm(language) ? 3 : 2;
  const gentle = GENTLE.findIndex((pattern) => pattern.test(voice.name) || pattern.test(voice.lang));
  if (gentle >= 0) score += 30 - gentle; // earlier in the list = warmer
  if (NATURAL.test(voice.name)) score += 12;
  return score;
}

/** The best gentle voice in the language, or null if every voice there is a man's or novelty voice. */
export function pickVoice<V extends VoiceLike>(voices: readonly V[], language = 'en-US'): V | null {
  let best: V | null = null; let bestScore = -1;
  for (const voice of voices) { const s = voiceScore(voice, language); if (s > bestScore) { best = voice; bestScore = s; } }
  return best;
}

/** The voice to read with: the gentlest one in the language; otherwise any voice in that language (exact match, then the
    device default), so the reading still matches the page's language. */
export function selectLearningVoice<V extends VoiceLike>(voices: readonly V[], language: string): V | null {
  const gentle = pickVoice(voices, language);
  if (gentle) return gentle;
  const primary = norm(language).split('-')[0];
  const same = voices.filter((v) => norm(v.lang).split('-')[0] === primary);
  const pool = same.length ? same : voices;
  return [...pool].sort((a, b) => Number(norm(b.lang) === norm(language)) - Number(norm(a.lang) === norm(language))
    || Number(!!b.default) - Number(!!a.default) || a.name.localeCompare(b.name))[0] ?? null;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const PARTS: Record<number, [string, string]> = {
  2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'], 8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'], 10: ['tenth', 'tenths'], 12: ['twelfth', 'twelfths'],
  11: ['eleventh', 'elevenths'], 15: ['fifteenth', 'fifteenths'], 16: ['sixteenth', 'sixteenths'], 20: ['twentieth', 'twentieths'],
  25: ['twenty-fifth', 'twenty-fifths'], 50: ['fiftieth', 'fiftieths'], 100: ['hundredth', 'hundredths'],
};
const count = (n: number) => (n <= 12 ? ONES[n] : String(n));
/** "3/4" → "three fourths", "1/2" → "one half", "2/1" → "2", "7/30" → "7 over 30". */
export function sayFraction(top: number, bottom: number): string {
  if (bottom === 1) return String(top);
  const part = PARTS[bottom];
  if (!part) return `${top} over ${bottom}`;
  return `${count(top)} ${top === 1 ? part[0] : part[1]}`;
}

/** Text as a teacher would read it to a child. */
export function spokenText(text: string): string {
  return text
    .replace(/(\d+)\s+(\d+)\s*\/\s*(\d+)/g, (_, w, t, b) => `${w} and ${sayFraction(Number(t), Number(b))}`) // mixed numbers
    .replace(/\?\s*\/\s*(\d+)/g, (_, b) => `how many ${PARTS[Number(b)]?.[1] ?? `over ${b}`}`)               // ?/4
    .replace(/(\d+)\s*\/\s*\?/g, '$1 over what number')
    .replace(/(\d+)\/(\d+)s\b/g, (_, t, b) => (PARTS[Number(b)] ? `${count(Number(t))} ${PARTS[Number(b)][1]}` : `${t} over ${b}s`)) // "3/4s"
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, t, b) => sayFraction(Number(t), Number(b)))
    .replace(/\$(\d+)\.(\d{2})\b/g, (_, d, c) => `${d} ${d === '1' ? 'dollar' : 'dollars'}${c === '00' ? '' : ` and ${Number(c)} cents`}`)
    .replace(/(\d)\.(\d+)/g, (_, whole, dec) => `${count(Number(whole))} point ${dec.split('').map((d: string) => ONES[Number(d)]).join(' ')}`)
    .replace(/\s<\s/g, ' is less than ').replace(/\s>\s/g, ' is greater than ').replace(/\s*=\s*/g, ' equals ')
    .replace(/(\d)%/g, '$1 percent')
    .replace(/\s+/g, ' ').trim();
}

/** Split into sentences so the voice pauses between them (long single utterances also get cut off in Chrome). */
export function sentences(text: string): string[] {
  return (text.match(/(?:[^.!?]|[.!?](?!\s|$))+(?:[.!?]+|$)/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

/** Calm, easy to follow, a little brighter and friendlier than the default. */
export const VOICE_RATE = 0.88;
export const VOICE_PITCH = 1.1;
