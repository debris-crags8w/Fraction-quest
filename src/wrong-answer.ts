import { answerValue } from './learning-content';

/* What to say after a wrong tap: a kind opener, then (when we can tell) the exact slip behind the choice the
   child picked ("You flipped it"), so the help is about their thinking. It never names the right answer. */

const OPENERS = ['Almost!', 'Good try!', 'Let’s look again.', 'Not quite.', 'So close!'];
/** A kind opener that changes from question to question (and try to try), but is the same on every visit. */
export function retryOpener(seed: string): string {
  const h = [...seed].reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) >>> 0, 7);
  return OPENERS[h % OPENERS.length];
}

const FRACTION = /^(\d+)\/(\d+)$/;
const DECIMAL = /^\d*\.\d+$/;
/** "1/6 + 4/6" in the question → the two fractions being added or taken away (same bottom number). */
const LIKE_SUM = /(\d+)\/(\d+)\s*([+−-])\s*(\d+)\/\2\b/;

/** The slip behind a wrong choice, in one short sentence, or null when it is not one we can name. */
export function wrongChoiceReason(prompt: string, choices: string[], correct: number, chosen: number): string | null {
  if (chosen === correct || !choices[chosen]) return null;
  const pick = choices[chosen].trim();
  const right = choices[correct].trim();
  const p = prompt.toLowerCase();

  if (/^you can'?t tell$/i.test(pick)) return 'You can tell! Look at the picture and compare.';
  if (/^they (?:are|match|cover)|^they are the same|equally/i.test(pick)) return 'They are not the same amount. Compare them again.';

  const f = FRACTION.exec(pick);
  const r = FRACTION.exec(right);
  if (f && r) {
    const [pt, pb] = [Number(f[1]), Number(f[2])];
    const [rt, rb] = [Number(r[1]), Number(r[2])];
    if (pt === rb && pb === rt && pt !== pb) return 'You flipped it. The parts you count go on top. All the equal parts go on the bottom.';
    const sum = LIKE_SUM.exec(prompt);
    if (sum && pb === Number(sum[2]) * 2 && pt === rt) return sum[3] === '+'
      ? 'Add only the top numbers. The pieces stay the same size, so the bottom stays the same.'
      : 'Take away only the top numbers. The pieces stay the same size, so the bottom stays the same.';
    if (pt === rt && pb === rt + rb) return 'The bottom number is all the equal parts, not parts plus shaded. Count all the parts.';
    if (pt === rt && Math.abs(pb - rb) === 1 && /\b(?:piece|part|space|slice|jump|tile|equal)\b/.test(p)) return 'Count all the equal parts again, one at a time.';
    if (pb === rb && Math.abs(pt - rt) === 1 && /\b(?:shaded|colored|jumps?|pieces?|parts?)\b/.test(p) && !LIKE_SUM.test(prompt)) return 'Count the parts again, one at a time.';
  }

  if (DECIMAL.test(pick) && DECIMAL.test(right)) {
    const [pv, rv] = [answerValue(pick), answerValue(right)];
    if (Number.isFinite(pv) && Number.isFinite(rv) && (Math.abs(pv * 10 - rv) < 1e-9 || Math.abs(pv - rv * 10) < 1e-9)) {
      return 'Check the places. Tenths are 1 place after the dot. Hundredths are 2 places.';
    }
  }

  // "Which is bigger…?" picking the smaller one (or the other way round).
  const [pv, rv] = [answerValue(pick), answerValue(right)];
  if (Number.isFinite(pv) && Number.isFinite(rv) && /\bwhich\b/.test(p) && !/(?:more|less) than/.test(p)) {
    if (/\b(?:bigger|biggest|greater|larger|more)\b/.test(p) && pv < rv) return 'That one is smaller. Look for the one that covers more.';
    if (/\b(?:smaller|smallest|less|fewer)\b/.test(p) && pv > rv) return 'That one is bigger. Look for the one that covers less.';
  }
  return null;
}
