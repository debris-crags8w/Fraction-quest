/* A child never sees a part name (fifths, ninths, twelfths …) written before a card has taught it: Listen reads "1/9"
   as "one ninth", and the Words screen, a word card on an idea's Learn page or a lesson page's New word card each teach
   a name once (new-words.ts). Generic wrong choices (a part count one more, or doubled: 1/5, 1/9, 7/15) used to write
   names far earlier than their cards. `keepTaughtParts` swaps such a wrong choice for a real mistake, or the same one
   at the nearest part the child has met, and never touches the question itself or its right answer.
   teach-extras.test.ts is the independent check that reads every screen. */
import type { ModelSpec } from './game';
import { fractionMistakes } from './fraction-slips';
import { FRACTION_WORDS, PART_NAMES } from './intro-copy';
import { LESSON_IDEAS } from './lesson-ideas';
import { NEW_WORD_LESSON } from './new-words';
import { answerValue, distractorCandidates } from './learning-content';
import { misconceptionWrongs } from './misconceptions';

/** Where a screen is inside its lesson: an idea (its Learn pages, then its practice) or the rest of the lesson page. */
export const REST_OF_LESSON = 99;
/** The lesson page's New word card sits at the top of the lesson page, after the ideas. */
const LAB_CARD = 98;

const OVER_ONE = /^\d+\/1(?!\d)/;
const WRITTEN = /\/(\d+)\b/g;
/** Denominators a text writes, as numbers. */
export const writtenDenominators = (text: string): number[] => [...text.matchAll(WRITTEN)].map((match) => Number(match[1]));

/** Part names a card teaches. A denominator with no part name ("7 over 30") is not one Listen names with a card. */
const hasCard = (d: number) => d >= 2 && !!PART_NAMES[d];

/** Is the part name for denominator `d` taught by the time of this screen? `order` is the course's lesson ids. */
export function partTaught(d: number, order: readonly string[], missionId: string, idea: number = REST_OF_LESSON): boolean {
  if (!hasCard(d)) return true;
  if (FRACTION_WORDS.rows.some((row) => row.d === d)) return true;
  const lesson = order.indexOf(missionId);
  const name = PART_NAMES[d]!.one;
  return order.slice(0, lesson + 1).some((id, at) => {
    const ideas = LESSON_IDEAS[id] ?? [];
    // A word card on an Learn page: taught for that idea's practice and everything after it.
    const onLearnPage = ideas.some((entry, k) => (at < lesson || k <= idea) && entry.learn.some((page) => 'words' in page && page.words.some((word) => word.term === `one ${name}`)));
    // The lesson page's New word card: taught for the lesson page of its lesson, and everything after.
    const onLessonPage = NEW_WORD_LESSON[d] === id && (at < lesson || idea >= LAB_CARD);
    return onLearnPage || onLessonPage;
  });
}

/** The idea whose practice asks this question (REST_OF_LESSON when none does: the lesson page's own questions). */
export function ideaOfQuestion(missionId: string, questionId: string): number {
  const at = (LESSON_IDEAS[missionId] ?? []).findIndex((idea) => idea.practice.some((item) => 'question' in item && item.question === questionId));
  return at < 0 ? REST_OF_LESSON : at;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
/** "6/15 pound" → "2/5 pound" (null when it is already in lowest terms, or is no fraction). */
const inLowestTerms = (choice: string): string | null => {
  const m = /^(\d+)\/(\d+)(?!\d)(.*)$/.exec(choice.trim());
  if (!m) return null;
  const g = gcd(Number(m[1]), Number(m[2]));
  // Only a form a child would write: 2/5, not 1/25.
  return g > 1 && Number(m[2]) / g <= 12 ? `${Number(m[1]) / g}/${Number(m[2]) / g}${m[3]}` : null;
};

type Asked = { prompt: string; choices: string[]; correctChoice: number };
const sameValue = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const plain = (choice: string) => /^(\d+)\/(\d+)$/.exec(choice.trim());

/** `texts` write only part names taught by now. */
export const onlyTaught = (texts: readonly string[], taught: (d: number) => boolean) => texts.every((text) => writtenDenominators(text).every(taught));

/** Wrong choices that write a part name not taught yet are swapped, one by one, for:
    1. a real mistake for this question (fraction-slips.ts, misconceptions.ts) written with taught parts only, the one
       whose part is nearest to the one it replaces; when no rule knows the question, instead
    2. the same choice at the nearest taught part (1/5 → 1/6); else
    3. another believable wrong answer (learning-content.ts).
    Always a value different from the right answer and from every other choice. Null when the prompt or the right
    answer itself writes a part not taught yet (the question is about it: nothing to swap), or no swap is found. */
export function keepTaughtParts<Q extends Asked>(question: Q, taught: (d: number) => boolean): Q | null {
  const { prompt, choices, correctChoice } = question;
  const right = choices[correctChoice];
  if (choices.every((choice) => writtenDenominators(choice).every(taught))) return onlyTaught([prompt], taught) ? question : null;
  if (!onlyTaught([prompt, right], taught)) return null;
  const target = answerValue(right);
  const out = [...choices];
  const taughtParts = Object.keys(PART_NAMES).map(Number).filter((d) => taught(d));
  for (let i = 0; i < out.length; i++) {
    if (i === correctChoice || onlyTaught([out[i]], taught)) continue;
    const old = writtenDenominators(out[i])[0]!;
    const used = new Set(out.map((choice) => choice.trim()));
    // Never "6/1": a wrong choice that reads as a joke (misconceptions.ts withoutOverOne).
    const fresh = (candidate: string) => !used.has(candidate.trim()) && !OVER_ONE.test(candidate.trim()) && onlyTaught([candidate], taught)
      && Number.isFinite(answerValue(candidate)) && answerValue(candidate) >= 0 && !sameValue(answerValue(candidate), target)
      && out.every((choice, j) => j === i || !sameValue(answerValue(choice), answerValue(candidate)) || !Number.isFinite(answerValue(choice)));
    const near = (candidate: string) => Math.min(...writtenDenominators(candidate).map((d) => Math.abs(d - old)), 99);
    const slips = [...fractionMistakes(prompt, right), ...misconceptionWrongs(prompt, right)];
    // A slip written with a part not taught yet (3/9 for 3 × 1/3, 6/15) is the same mistake, and the same number, in
    // lowest terms (1/3, 2/5): the child forgot the multiplying and kept the fraction.
    const known = [...slips, ...slips.flatMap((slip) => { const lowest = inLowestTerms(slip); return lowest ? [lowest] : []; })];
    const original = new Set(slips);
    // Slips as written first, then the same mistakes in lowest terms; each nearest part first.
    const real = known.filter(fresh).sort((a, b) => Number(!original.has(a)) - Number(!original.has(b)) || near(a) - near(b));
    // Same choice, nearest taught part; a proper fraction stays proper (1/5 → 1/6, not 6/5).
    const properBefore = (() => { const m = plain(out[i]); return !m || Number(m[1]) <= Number(m[2]); })();
    const nearest = [...taughtParts].sort((a, b) => Math.abs(a - old) - Math.abs(b - old) || a - b)
      .map((d) => out[i].replace(WRITTEN, `/${d}`))
      .filter((candidate) => fresh(candidate) && (!properBefore || (() => { const m = plain(candidate); return !m || Number(m[1]) <= Number(m[2]); })()));
    const generic = distractorCandidates(right).filter(fresh).sort((a, b) => near(a) - near(b));
    // A question whose real mistakes are known gets only those: a nearby part (3/8 for 3/9) would not be a mistake anyone makes.
    const swap = known.length ? real[0] : nearest[0] ?? generic[0];
    if (!swap) return null;
    out[i] = swap;
  }
  return { ...question, choices: out };
}

/** A bar the picture draws for a wrong choice follows the swap: 1/5 becomes 1/6, or goes when the new choice is no fraction. */
function mendBars(model: ModelSpec, swaps: Array<[string, string]>): ModelSpec {
  if (model.kind !== 'bars') return model;
  const bars = model.bars.flatMap((bar) => {
    const swap = swaps.find(([old]) => old.trim() === `${bar.numerator}/${bar.denominator}`);
    if (!swap) return [bar];
    const now = plain(swap[1]);
    return now ? [{ ...bar, numerator: Number(now[1]), denominator: Number(now[2]) }] : [];
  });
  return { ...model, bars };
}

/** `keepTaughtParts` for a whole question: its pictures follow the swapped choices. */
export function withTaughtParts<Q extends Asked & { model: ModelSpec; simplerModel: ModelSpec }>(question: Q, taught: (d: number) => boolean): Q | null {
  const fixed = keepTaughtParts(question, taught);
  if (!fixed || fixed === question) return fixed;
  const swaps = question.choices.flatMap((choice, i): Array<[string, string]> => (choice === fixed.choices[i] ? [] : [[choice, fixed.choices[i]]]));
  return { ...fixed, model: mendBars(fixed.model, swaps), simplerModel: mendBars(fixed.simplerModel, swaps) };
}
