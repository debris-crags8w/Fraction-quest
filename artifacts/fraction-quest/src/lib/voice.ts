/* Read-aloud voice: a gentle, natural-sounding woman's voice when the device has one, kid-friendly wording
   ("three fourths", not "3 over 4"), a calm pace, and a short pause between sentences. Pure helpers are tested. */

type VoiceLike = Pick<SpeechSynthesisVoice, 'name' | 'lang' | 'localService'>;

// Warm female voices found on common devices (Apple, Microsoft Edge "Natural", Google, Android network voices).
const GENTLE = [
  /\bAva\b/i, /\bSamantha\b/i, /\bAllison\b/i, /\bSusan\b/i, /\bZoe\b/i, /\bNicky\b/i, /\bSerena\b/i, /\bKaren\b/i, /\bMoira\b/i, /\bTessa\b/i, /\bKate\b/i,
  /\b(Jenny|Aria|Ana|Michelle|Emma|Sonia|Libby|Natasha|Clara)\b/i, /Google US English/i, /Google UK English Female/i, /\bZira\b/i,
  /en-(us|gb|au)-x-(sfg|tpf|iob|iog|tpc|gba|aua)/i, /\bfemale\b/i,
];
// Voices to avoid: men's voices and the novelty/old robotic ones.
const AVOID = /\b(Alex|Daniel|David|Mark|Fred|Guy|Ryan|Christopher|Eric|Roger|Steffan|Thomas|Aaron|Arthur|Gordon|Oliver|Reed|Rocko|Grandpa|Grandma|Eddy|Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Kathy|Princess|Deranged|Hysterical|male)\b|x-(tpd|iol|iom|gbd|gbb|auc|aud)/i;
const NATURAL = /natural|neural|enhanced|premium|online|network/i;

/** Score a voice: English first, then gentle female names, then natural-sounding quality. Lower than 0 = avoid. */
export function voiceScore(voice: VoiceLike): number {
  if (!/^en\b|^en[-_]/i.test(voice.lang)) return -100;
  if (AVOID.test(voice.name)) return -10;
  let score = /en[-_]US/i.test(voice.lang) ? 3 : 2;
  const gentle = GENTLE.findIndex((pattern) => pattern.test(voice.name) || pattern.test(voice.lang));
  if (gentle >= 0) score += 30 - gentle; // earlier in the list = warmer
  if (NATURAL.test(voice.name)) score += 12;
  return score;
}

export function pickVoice<V extends VoiceLike>(voices: V[]): V | null {
  let best: V | null = null; let bestScore = -1;
  for (const voice of voices) { const s = voiceScore(voice); if (s > bestScore) { best = voice; bestScore = s; } }
  return best;
}

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const PARTS: Record<number, [string, string]> = {
  2: ['half', 'halves'], 3: ['third', 'thirds'], 4: ['fourth', 'fourths'], 5: ['fifth', 'fifths'], 6: ['sixth', 'sixths'],
  7: ['seventh', 'sevenths'], 8: ['eighth', 'eighths'], 9: ['ninth', 'ninths'], 10: ['tenth', 'tenths'], 12: ['twelfth', 'twelfths'],
  100: ['hundredth', 'hundredths'],
};
const count = (n: number) => (n <= 12 ? ONES[n] : String(n));
/** "3/4" → "three fourths", "1/2" → "one half", "7/25" → "7 over 25". */
export function sayFraction(top: number, bottom: number): string {
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
    .replace(/(\d+)\s*\/\s*(\d+)/g, (_, t, b) => sayFraction(Number(t), Number(b)))
    .replace(/\s<\s/g, ' is less than ').replace(/\s>\s/g, ' is greater than ').replace(/\s=\s/g, ' equals ')
    .replace(/(\d)%/g, '$1 percent')
    .replace(/\s+/g, ' ').trim();
}

/** Split into sentences so the voice pauses between them (long single utterances also get cut off in Chrome). */
export function sentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]*/g) ?? [text]).map((s) => s.trim()).filter(Boolean);
}

let chosen: SpeechSynthesisVoice | null = null;
function currentVoice(): SpeechSynthesisVoice | null {
  if (chosen) return chosen;
  chosen = pickVoice(window.speechSynthesis.getVoices());
  return chosen;
}
// Voices load after the page in Chrome; pick again when they arrive.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => { chosen = null; });
}

/** Speak text in the gentle voice. Calls onDone when finished, stopped or failed. Returns false if speech is unavailable. */
export function speak(text: string, onDone: () => void): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || typeof SpeechSynthesisUtterance === 'undefined') return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const parts = sentences(spokenText(text));
  const voice = currentVoice();
  parts.forEach((part, i) => {
    const u = new SpeechSynthesisUtterance(part);
    if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = 'en-US';
    u.rate = 0.88;   // calm, easy to follow
    u.pitch = 1.1;   // a little brighter and friendlier
    if (i === parts.length - 1) { u.onend = onDone; }
    u.onerror = onDone;
    synth.speak(u);
  });
  return true;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
}
