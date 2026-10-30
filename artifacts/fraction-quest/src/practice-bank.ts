import { fourthChoice, noBeforeYes, orderedWithSigns, withSignComparisons } from './fourth-choice';
import { withUnits } from './measure-units';
import { preferMisconceptions, withoutOverOne } from './misconceptions';
import { MISSIONS, nameBars, problemPicture, withChoiceBars, type ModelSpec, type PracticeQuestion } from './game';
import { G3_EQUIVALENTS_WIDE, answerValue, asChoicePrompt, choiceDistractors, distractorCandidates, equivalentsFor, getWorksheet, gradeFits, parseAnswer } from './learning-content';
import { standardsForMission } from './standard-catalog';
import { onlyTaught, partTaught, withTaughtParts } from './taught-parts';
import { allEqual, circleCut, gridCut, type AreaCut } from './area-shapes';
import { gardenModel } from './garden';
import type { WorksheetProblem } from './learning-content';

/* Question generator: every lesson has a recipe that picks numbers within safe limits.
   - "Practice more" uses 12 questions from fixed seeds, so practice repeats.
   - "New questions" and the printable "New practice sheet" use fresh seeds for endless variety.
   Pictures never show number labels, so the picture doesn't give the answer away. */

/* ---------- seeded random numbers ---------- */

export type Rng = { int: (lo: number, hi: number) => number; pick: <T>(list: readonly T[]) => T; chance: () => boolean };

/** Small deterministic generator (mulberry32): the same seed always gives the same questions. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1));
  return { int, pick: (list) => list[int(0, list.length - 1)], chance: () => next() < 0.5 };
}

const hash = (text: string) => [...text].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);

/* ---------- helpers ---------- */

const NAMES: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'fourths', 5: 'fifths', 6: 'sixths', 7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 11: 'elevenths', 12: 'twelfths' };
const name = (d: number) => NAMES[d] ?? `${d}ths`;
const Name = (d: number) => name(d)[0].toUpperCase() + name(d).slice(1);
const f = (n: number, d: number) => `${n}/${d}`;
const bar = (n: number, d: number): ModelSpec => ({ kind: 'bars', bars: [{ numerator: n, denominator: d }], hideLabels: true });
/** `count` whole bars, not cut yet: the child decides the cuts (sharing stories). */
const wholes = (count: number): ModelSpec => ({ kind: 'bars', bars: Array.from({ length: count }, () => ({ numerator: 0, denominator: 1 })), hideLabels: true });
const bars2 = (a: [number, number], b: [number, number]): ModelSpec => ({ kind: 'bars', bars: [{ numerator: a[0], denominator: a[1] }, { numerator: b[0], denominator: b[1] }], hideLabels: true });
const line = (n: number, d: number, wholes = Math.max(1, Math.ceil(n / d))): ModelSpec => ({ kind: 'line', numerator: n, denominator: d, wholes, hideLabels: true });
const set = (selected: number, total: number, groupCount: number): ModelSpec => ({ kind: 'set', selected, total, groupCount });
const half = bar(1, 2);
/** Compare pictures: both amounts as same-size wholes, so the child sees why 3/4 is more than 3/8. */
const compareBars = (a: [number, number], b: [number, number]): Pick<Item, 'model' | 'simpler'> =>
  ({ model: bars2(a, b), simpler: withLabels(bars2(a, b)) });
/** Name two fractions in either order, so "the first one" is not always the answer. */
const either = (r: Rng, x: string, y: string) => (r.chance() ? `${x} or ${y}` : `${y} or ${x}`);
const area = (cut: AreaCut, shaded: number[] = []): ModelSpec => ({ kind: 'area', cut, shaded });
const shadedFirst = (n: number) => Array.from({ length: n }, (_, k) => k);
/** Grade 4 denominators (no elevenths, thirteenths, fifteenths…). */
const DENS = [3, 4, 5, 6, 8, 10, 12] as const;
/** Grade 3 denominators: thirds, fourths, sixths and eighths (halves where a question allows them). */
const G3_DENS = [3, 4, 6, 8] as const;
/** The part names taught before lesson 1's practice: halves, thirds, fourths, sixths and eighths (the Words screen). */
const TAUGHT_PARTS = [2, 3, 4, 6, 8] as const;
/** Same-size wholes with two grade 3 denominators, smaller one first. */
const G3_PAIRS = [[2, 4], [2, 3], [3, 6], [4, 8], [3, 4], [2, 6], [4, 6], [2, 8], [3, 8], [6, 8]] as const;
const withLabels = (model: ModelSpec): ModelSpec => ('hideLabels' in model ? { ...model, hideLabels: false } : model);

type Item = { prompt: string; right: string; wrong: [string, string]; hint: string; retry: string; model: ModelSpec; simpler?: ModelSpec;
  /** A fourth wrong choice written for this kind of question (otherwise one is made from the question). */
  extra?: string;
  /** More real mistakes for this question. With them, moving the right answer's place swaps in one of these,
      never a near-miss number (11 or 13 scoops for 12) that no child would pick. */
  slips?: string[] };

/** Nudge a wrong choice to the next number if it repeats another choice (e.g. "5" → "6", "3/8" → "4/8"). */
function nudge(choice: string): string {
  const fraction = /^(\d+)\/(\d+)$/.exec(choice);
  if (fraction) return `${Number(fraction[1]) + 1}/${fraction[2]}`;
  if (/^\d+$/.test(choice)) return String(Number(choice) + 1);
  // Text with a number in it ("1 and 1/2"): bump the first number so the choice really changes.
  return /\d+/.test(choice) ? choice.replace(/\d+/, (m) => String(Number(m) + 1)) : `${choice} (other)`;
}

function place(item: Item, pos: number): Pick<PracticeQuestion, 'choices' | 'correctChoice'> {
  const used = new Set([item.right]);
  const choices = item.wrong.map((wrong) => {
    let choice = wrong;
    while (used.has(choice)) choice = nudge(choice);
    used.add(choice);
    return choice;
  });
  choices.splice(pos, 0, item.right);
  return { choices, correctChoice: pos };
}

/* ---------- one recipe per lesson ---------- */

/** Real slips when nk/dk is renamed with denominator d: kept the top, kept the bottom, upside down, one part, or the
    gap between the denominators taken off the top too. */
const joinSlips = (n: number, d: number, k: number) => [f(n * k, d), f(n, d * k), f(d, n), f(1, d), ...(n * k + d - d * k > 0 ? [f(n * k + d - d * k, d)] : [])];
/** The pairs with at least three different real slips (4/8 as halves has only two: 4/2 and 1/8). */
const JOINABLE = G3_EQUIVALENTS_WIDE.filter(([n, d, k]) => new Set(joinSlips(n, d, k).map((slip) => { const [t, b] = slip.split('/').map(Number); return t / b; }).filter((v) => Math.abs(v - n / d) > 1e-9)).size >= 3);

const RECIPES: Record<string, (r: Rng) => Item> = {
  'equal-parts': (r) => {
    if (r.int(0, 3) === 0) {
      // The lesson's own question: "Is this square cut into fourths?" A shape with the named number of parts, the same
      // size or not. The parts' shapes never decide it.
      const [cut, d, whole] = r.pick([['halves-triangles', 2, 'square'], ['rect-halves', 2, 'square'], ['rect-thirds', 3, 'square'], ['fourths-squares', 4, 'square'],
        ['fourths-strips', 4, 'square'], ['fourths-triangles', 4, 'square'], ['fourths-mixed', 4, 'square'], ['fourths-unequal', 4, 'square'], ['strips-unequal', 4, 'square'],
        ['eighths-triangles', 8, 'square'], ['circle-halves', 2, 'pizza'], ['circle-thirds', 3, 'pizza'], ['circle-fourths', 4, 'pizza'], ['circle-sixths', 6, 'pizza'],
        ['circle-eighths', 8, 'pizza'], ['circle-unequal', 4, 'pizza'], ['hexagon-sixths', 6, 'hexagon']] as const);
      const fair = allEqual(cut); const yes = 'Yes, same-size parts'; const no = 'No, some parts are bigger';
      return { prompt: `Is this ${whole} cut into ${name(d)}?`, right: fair ? yes : no, wrong: fair ? [no, `No, ${name(d)} must be squares`] : [`Yes, there are ${d} parts`, yes],
        extra: fair ? `Yes, because there are ${d} parts` : `No, ${name(d)} must be squares`,
        hint: `${Name(d)} are ${d} equal parts. Equal means the same size, not the same shape.`,
        retry: fair ? `All ${d} parts are the same size, so they are ${name(d)}.` : `The parts are different sizes, so they are not ${name(d)}.`, model: area(cut) };
    }
    // Sometimes a square or circle: equal parts are the same size, not always the same shape.
    if (r.int(0, 2) === 0) {
      const [cut, fair, whole] = r.pick([
        ['fourths-mixed', true, 'square'], ['quarter-and-triangles', false, 'square'], ['fourths-triangles', true, 'square'],
        ['circle-sixths', true, 'pizza'], ['circle-unequal', false, 'pizza'], ['fourths-unequal', false, 'square'], ['hexagon-sixths', true, 'hexagon'],
      ] as const);
      const yes = 'Yes, same-size parts'; const bigger = 'No, some parts are bigger';
      // "The shapes are different" is a false reason only on a fair cut; on an unequal picture the shapes do differ.
      const shapes = fair ? 'No, the shapes are different' : 'No, it is not cut';
      return { prompt: `Is this ${whole} cut into equal parts?`, right: fair ? yes : bigger, wrong: fair ? [bigger, shapes] : [yes, shapes], extra: 'Yes, it is cut into parts',
        hint: 'Equal parts are the same size. They do not have to be the same shape.',
        retry: !fair ? 'Compare the sizes: one part is bigger than another, so the parts are not equal.'
          : cut === 'fourths-mixed' ? 'Every part takes up the same amount of space, so the parts are equal, even if their shapes are different.'
          : 'Every part is the same size, so the parts are equal.',
        model: area(cut) };
    }
    // The picture is the puzzle: the strip may be fair, have unequal pieces, or have the wrong number of pieces.
    // Only taught part counts (2, 3, 4, 6, 8): a strip of 5 or 7 equal parts is a fifths or sevenths picture.
    const d = r.pick(TAUGHT_PARTS); const kind = r.int(0, 2);
    const nearby = TAUGHT_PARTS.filter((x) => x !== d && Math.abs(x - d) <= 2); const wrongCount = r.pick(nearby);
    const count = kind === 2 ? wrongCount : d;
    const sizes = Array.from({ length: count }, () => 1);
    if (kind === 1) sizes[r.int(0, count - 1)] = 2.5; // one piece clearly bigger
    const total = sizes.reduce((a, b) => a + b, 0);
    const yes = `Yes, ${d} equal parts`; const unequal = 'No, the parts are unequal'; const tooMany = `No, there are ${wrongCount} parts`;
    return { prompt: `Is this strip cut into equal ${name(d)}?`, right: [yes, unequal, tooMany][kind], wrong: [yes, unequal, tooMany].filter((_, i) => i !== kind) as [string, string],
      // The fourth choice is a Yes that is wrong (or a No that is wrong for the other kinds), so the right choice is never the lone Yes.
      extra: [`Yes, ${r.pick(TAUGHT_PARTS.filter((x) => x !== d && x !== wrongCount))} equal parts`, `Yes, there are ${d} parts`, 'Yes, all the same size'][kind],
      hint: `Equal ${name(d)}: exactly ${d} parts, all the same size. Count them, then compare them.`,
      retry: kind === 0 ? `There are ${d} parts and they are all the same size, so they are equal ${name(d)}.` : kind === 1 ? 'One part is bigger than the others, so the parts are not equal.' : `Count again: there are ${wrongCount} parts, not ${d}.`,
      model: { kind: 'partition', parts: sizes.map((size) => (size / total) * 100) }, simpler: { kind: 'partition', parts: Array.from({ length: d }, () => 100 / d) } };
  },
  'fraction-names': (r) => {
    const d = r.pick(G3_DENS); const n = r.int(1, d - 1);
    // Wrong choices for "What fraction is shaded?" are the real slips (fraction-slips.ts), written only with parts the
    // child has been taught: upside down, shaded out of the parts not shaded, the parts not shaded, one part, one
    // too many counted, or calling one part "a half". The generic ones also write fifths, sevenths and ninths; when
    // fewer than 3 taught slips fit (1/8, 7/8), this question is not asked for that fraction.
    const taught = (x: number) => (TAUGHT_PARTS as readonly number[]).includes(x);
    const slips = [
      ...(2 * n !== d ? [f(d - n, d)] : []), // counted the parts that are not shaded
      ...(n > 1 && taught(n) ? [f(d, n)] : []), // upside down
      ...(taught(d - n) ? [f(n, d - n)] : []), // shaded out of the parts not shaded
      ...(n > 1 ? [f(1, d)] : []), // just one part
      ...(taught(d + n) ? [f(n, d + n)] : []), // counted the shaded parts again with all the parts
      ...(n === 1 ? [f(1, 2)] : []), // calls any one part "a half"
    ].filter((text, i, all) => text !== f(n, d) && all.indexOf(text) === i);
    for (let k = slips.length - 1; k > 0; k--) { const j = r.int(0, k); [slips[k], slips[j]] = [slips[j], slips[k]]; }
    if (r.int(0, 2) === 0) {
      // The numerator: how many parts are counted. Real slips: all the parts, both numbers added, the parts not counted.
      return { prompt: `In ${f(n, d)}, how many parts are counted?`, right: String(n), wrong: [String(d), String(n + d)], extra: String(d - n === n ? n + 1 : d - n),
        hint: 'Look at the numerator.', retry: `The numerator is ${n}, so ${n} ${n === 1 ? 'part is' : 'parts are'} counted.`, model: bar(n, d) };
    }
    return r.chance() || slips.length < 3
      ? { prompt: `In ${f(n, d)}, what does the ${d} mean?`, right: `${d} equal parts in all`, wrong: [`${d} parts are shaded`, `${d} wholes`], extra: `${d} parts not shaded`, hint: 'Look at the denominator.', retry: 'The denominator is the number of equal parts in all.', model: bar(n, d) }
      : { prompt: 'What fraction is shaded?', right: f(n, d), wrong: [slips[0], slips[1]], extra: slips[2], slips,
        hint: 'The numerator is the number of parts shaded. The denominator is all the equal parts.', retry: `The denominator is all ${d} parts. The numerator is the ${n} shaded ${n === 1 ? 'part' : 'parts'}.`, model: bar(n, d) };
  },
  'unit-fractions': (r) => {
    const form = r.int(0, 5);
    if (form === 0) {
      if (r.chance()) {
        const d = r.pick([2, 3, 4, 6, 8] as const);
        return { prompt: 'All the slices are the same size. What fraction of the pizza is the shaded slice?', right: f(1, d), wrong: [f(d, 1), f(1, d + 1)],
          hint: 'Count every slice for the denominator.', retry: `${d} same-size slices make the pizza, so 1 slice is 1/${d}.`, model: area(circleCut(d)!, [0]) };
      }
      // Counting pieces is not enough: 2 small triangles make one fourth, not 2/7.
      return { prompt: 'What fraction of the square is shaded?', right: '1/4', wrong: ['2/7', '1/7'],
        hint: 'The parts are not all the same size. Each triangle is half of the small square.', retry: 'The 2 shaded triangles cover the same space as the small square: 1/4 of the square.', model: area('quarter-and-triangles', [1, 2]) };
    }
    if (form === 1) {
      const d = r.pick(G3_DENS); const n = r.int(2, d - 1);
      return { prompt: 'Which is a unit fraction?', right: f(1, d), wrong: [f(n, d), f(d, 1)], hint: 'A unit fraction has a numerator of 1.', retry: `1/${d} counts just 1 equal part.`, model: bar(0, d) };
    }
    if (form === 2) {
      const d = r.pick(TAUGHT_PARTS);
      return { prompt: `A whole is cut into ${d} equal parts. What is 1 part?`, right: f(1, d), wrong: [f(d, 1), f(1, d === 2 ? 3 : d - 1)], hint: 'Count all the equal parts. That is the denominator.', retry: `1 of ${d} equal parts is 1/${d}.`, model: bar(1, d) };
    }
    if (form === 3) {
      const d = r.pick(G3_DENS);
      return { prompt: `What fraction is 1 of ${d} equal tiles?`, right: f(1, d), wrong: [f(d - 1, d), f(1, d + 1)], extra: f(1, 2), hint: 'Count all the equal tiles for the denominator.', retry: `1 of ${d} equal tiles is 1/${d}.`, model: bar(1, d) };
    }
    if (form === 4) {
      const d = r.pick(TAUGHT_PARTS);
      return { prompt: `How many ${name(d)} make one whole?`, right: String(d), wrong: ['1', String(d > 2 ? d - 1 : 3)], extra: d % 2 === 0 ? String(d / 2) : String(d + 1),
        hint: `Count the ${name(d)} until the whole bar is full.`, retry: `${d} ${name(d)} fill the bar: ${d} ${name(d)} make one whole.`, model: bar(1, d) };
    }
    // Friends share one thing fairly: each gets one equal part.
    const friends = r.pick(TAUGHT_PARTS);
    const [thing, piece, round] = r.pick([['pizza', 'slice', true], ['cake', 'piece', true], ['bar', 'part', false]] as const);
    return { prompt: `${friends} friends share a ${thing} fairly. What fraction ${round ? 'of the ' + thing + ' ' : ''}does each friend get?`, right: f(1, friends), wrong: [f(friends, friends), f(1, friends + 1)], extra: f(1, friends > 2 ? friends - 1 : 4),
      hint: `Cut the ${thing} into one equal part for each friend.`, retry: `${friends} friends, so ${friends} equal ${piece}s. Each friend gets 1 ${piece}: 1/${friends}.`,
      model: round ? area(circleCut(friends)!, []) : bar(0, friends) };
  },
  'unit-size': (r) => {
    const [a, b] = r.pick(G3_PAIRS); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${either(r, f(1, a), f(1, b))}?`, right: bigger ? f(1, a) : f(1, b), wrong: [bigger ? f(1, b) : f(1, a), 'They are the same'],
      hint: 'The denominator tells how many equal parts make one whole. More parts means each part is smaller.', retry: `${Name(a)} are bigger than ${name(b)}.`, ...compareBars([1, a], [1, b]) };
  },
  'sets-unit-fractions': (r) => {
    // Up to 40 dots; never as many in a group as there are groups (then both numbers in the answer choices match).
    const d = r.int(2, 6); let per = r.int(2, Math.min(10, Math.floor(40 / d))); while (per === d) per = r.int(2, Math.min(10, Math.floor(40 / d))); const t = d * per;
    return { prompt: `What is ${f(1, d)} of ${t}?`, right: String(per), wrong: [String(d), String(t)], hint: `Make ${d} equal groups. Count 1 group.`, retry: `${t} in ${d} groups is ${per} each.`, model: set(0, t, d) }; // plain dots: the child does the grouping
  },
  'sets-nonunit': (r) => {
    const d = r.int(3, 6); const n = r.int(2, d - 1); const per = r.int(2, 6); const t = d * per;
    return { prompt: `What is ${f(n, d)} of ${t}?`, right: String(n * per), wrong: [String(per), String(t)], hint: `Make ${d} equal groups. Count ${n} of them.`, retry: `${t} in ${d} groups is ${per} each. ${n} groups is ${n * per}.`, model: set(0, t, d) };
  },
  'benchmark-half': (r) => {
    const form = r.int(0, 3);
    // Taught parts only. An odd part count has no exact half: 3 of 7 is between 3 and 4 halves-of-7.
    const d = r.pick([3, 4, 6, 7, 8] as const);
    const lo = Math.floor(d / 2); const hi = Math.ceil(d / 2);
    const halfOf = d % 2 === 0 ? `Half of ${d} is ${d / 2}.` : `Half of ${d} is between ${lo} and ${hi}.`;
    const aboveHalf = (n: number) => n * 2 > d;
    if (form === 1) {
      // Which of two same-size parts is more (or less) than one half?
      const highs = Array.from({ length: d - 1 }, (_, k) => k + 1).filter((n) => aboveHalf(n));
      const lows = Array.from({ length: d - 1 }, (_, k) => k + 1).filter((n) => n * 2 < d);
      const high = r.pick(highs); const low = r.pick(lows); const more = r.chance();
      return { prompt: `Which is ${more ? 'more' : 'less'} than 1/2, ${either(r, f(high, d), f(low, d))}?`, right: f(more ? high : low, d), wrong: [f(more ? low : high, d), 'They are the same'],
        hint: halfOf, retry: `${f(more ? high : low, d)} is ${more ? 'more' : 'less'} than 1/2: compare ${more ? high : low} with half of ${d}.`,
        model: { kind: 'bars', bars: [{ numerator: high, denominator: d }, { numerator: low, denominator: d }, { numerator: 1, denominator: 2 }], hideLabels: true } };
    }
    let n = r.int(1, d - 1); if (n * 2 === d) n += n > 1 && r.chance() ? -1 : 1;
    const more = aboveHalf(n);
    if (form === 2) {
      const thing = r.pick(['jug', 'glass', 'bottle', 'bucket'] as const);
      return { prompt: `A ${thing} is ${f(n, d)} full. Is that more or less than half?`, right: more ? 'More than half' : 'Less than half', wrong: [more ? 'Less than half' : 'More than half', 'Exactly half'], extra: 'More than one whole',
        hint: halfOf, retry: `${f(n, d)} is ${more ? 'more' : 'less'} than half: compare ${n} with half of ${d}.`, model: bar(n, d) };
    }
    return { prompt: `Is ${f(n, d)} more or less than 1/2?`, right: more ? 'More than 1/2' : 'Less than 1/2', wrong: [more ? 'Less than 1/2' : 'More than 1/2', 'Exactly 1/2'],
      hint: halfOf, retry: d % 2 === 0 ? `Compare ${n} with ${d / 2}.` : `Compare ${n} with half of ${d}.`, model: bars2([n, d], [1, 2]) };
  },
  'benchmarks-zero-one': (r) => {
    // The benchmark nearest to n/d, for the part names this lesson has taught. Halfway ties (1/4, 3/4) have no nearest one, so they are never asked.
    const nearest = (n: number, d: number): '0' | '1/2' | '1' | null => {
      const x = n / d; const dist = [[x, '0'], [Math.abs(x - 0.5), '1/2'], [1 - x, '1']] as const;
      const [best, next] = [...dist].sort((a, b) => a[0] - b[0]);
      return next[0] - best[0] < 1e-9 ? null : best[1];
    };
    const d = r.pick([3, 4, 5, 6, 7, 8] as const);
    const near = Array.from({ length: d - 1 }, (_, k) => k + 1).filter((n) => nearest(n, d) !== null);
    const form = r.int(0, 3);
    if (form === 1) {
      // Which of three amounts is closest to 0 or to one whole? The other two are clearly farther away.
      const toOne = r.chance(); const e = r.pick([4, 5, 6, 7, 8] as const); // three different amounts need at least 4 parts
      const rightN = toOne ? e - r.int(1, e >= 7 ? 2 : 1) : r.int(1, e >= 7 ? 2 : 1);
      const mid = Math.round(e / 2); const far = toOne ? 1 : e - 1;
      return { prompt: `Which fraction is closest to ${toOne ? 'one whole' : '0'}?`, right: f(rightN, e), wrong: [f(mid, e), f(far, e)],
        hint: toOne ? 'Is it almost a full bar?' : 'Is it almost an empty bar?', retry: `${f(rightN, e)} is almost ${toOne ? 'a whole bar' : 'an empty bar'}, so it is closest to ${toOne ? '1' : '0'}.`,
        model: { kind: 'bars', bars: [rightN, mid, far].map((numerator) => ({ numerator, denominator: e })), hideLabels: true } };
    }
    if (form === 2) {
      // Between two benchmarks: which one is it nearer to?
      const upper = r.chance();
      const inside = near.filter((n) => (upper ? n * 2 > d : n * 2 < d));
      if (inside.length) {
        const n = r.pick(inside); const right = nearest(n, d) as string;
        const [low, high] = upper ? ['1/2', '1'] : ['0', '1/2'];
        const labels = { '0': 'Nearer 0', '1/2': 'Nearer 1/2', '1': 'Nearer 1' } as const;
        return { prompt: `Is ${f(n, d)} nearer ${low} or ${high}?`, right: labels[right as keyof typeof labels],
          wrong: [labels[(right === low ? high : low) as keyof typeof labels], upper ? 'Nearer 0' : 'Nearer 1'], extra: 'Exactly 1/2',
          hint: 'Is it tiny, about half, or almost full?', retry: `${f(n, d)} is nearer ${right}.`, model: bar(n, d) };
      }
    }
    // Grade 3 parts with one clear nearest benchmark (1/4 sits halfway between 0 and 1/2).
    const n = r.pick(near); const right = nearest(n, d) as string;
    // Only the taught benchmarks (0, 1/2 and 1), not a made-up "2"; the fourth choice is the "can't tell" slip.
    return { prompt: `Is ${f(n, d)} closest to 0, 1/2 or 1?`, right, wrong: ['0', '1/2', '1'].filter((x) => x !== right) as [string, string], extra: "You can't tell",
      hint: 'Is it tiny, about half, or almost full?', retry: `${f(n, d)} is closest to ${right}.`, model: bar(n, d) };
  },
  'fraction-magnitude': (r) => {
    const d = r.pick(G3_DENS); const n = d % 2 ? (d - 1) / 2 + r.int(0, 1) : d / 2 + (r.chance() ? 1 : -1);
    // Far from half: tiny amounts and nearly-whole amounts. Both wrong ones can be on the same side, so the
    // answer is not always the middle-sized choice.
    const smalls = [f(1, 8), f(1, 6)]; const bigs = [f(7, 8), f(5, 6)];
    const mode = r.int(0, 2); const lo = r.pick(smalls); const hi = r.pick(bigs);
    if (r.int(0, 2) === 0) {
      // Idea 1: the nearest benchmark. Idea 2: a little more or a little less than it. Halfway amounts (1/4, 3/4) and
      // exactly half have no single nearest one, so they are not asked.
      const [t, b, near] = r.pick([[1, 3, '1/2'], [2, 3, '1/2'], [2, 6, '1/2'], [4, 6, '1/2'], [3, 8, '1/2'], [5, 8, '1/2'], [1, 6, '0'], [1, 8, '0'], [5, 6, '1'], [7, 8, '1']] as const);
      const more = t / b > (near === '1/2' ? 0.5 : near === '1' ? 1 : 0);
      if (r.chance()) {
        return { prompt: `Is ${f(t, b)} closest to 0, 1/2 or 1?`, right: near, wrong: ['0', '1/2', '1'].filter((x) => x !== near) as [string, string], extra: "You can't tell",
          hint: 'Picture it on a line from 0 to 1. Is it tiny, about half, or almost full?', retry: `${f(t, b)} is closest to ${near}.`, model: bar(t, b) };
      }
      const say = (word: 'more' | 'less') => `A little ${word} than ${near}`;
      return { prompt: `${f(t, b)} is near ${near}. Is it a little more or a little less?`, right: say(more ? 'more' : 'less'), wrong: [say(more ? 'less' : 'more'), `Exactly ${near}`], extra: "You can't tell",
        hint: `Picture ${f(t, b)} and ${near} on the same bar. Which one is longer?`, retry: `${f(t, b)} is a little ${more ? 'more' : 'less'} than ${near}.`, model: near === '1/2' ? bars2([t, b], [1, 2]) : bar(t, b) };
    }
    const pair: [string, string] = mode === 0 ? [lo, r.pick(smalls.filter((x) => x !== lo))] : mode === 1 ? [hi, r.pick(bigs.filter((x) => x !== hi))] : [lo, hi];
    if (r.chance()) {
      // Two at a time: just off half against a tiny amount or nearly one whole.
      const [e, step] = r.pick([[6, 1], [8, 1], [8, 2]] as const); const above = r.chance();
      const near = f(e / 2 + (above ? step : -step), e); const far = f(above ? e - 1 : 1, e);
      return { prompt: `Which is closer to 1/2: ${either(r, near, far)}?`, right: near, wrong: [far, 'They are equally close'], hint: `Half of ${e} is ${e / 2}. Which numerator is nearer to ${e / 2}?`,
        retry: `${near} is just ${step === 1 ? 'one part' : 'two parts'} from half.`, ...compareBars([e / 2 + (above ? step : -step), e], [above ? e - 1 : 1, e]) };
    }
    return { prompt: 'Which is closest to 1/2?', right: f(n, d), wrong: pair, hint: 'Picture each one on the same bar. Which one ends nearest the middle?', retry: `${f(n, d)} is closer to 1/2 than the others.`, model: half };
  },
  'number-line-basics': (r) => {
    const d = r.pick([2, ...G3_DENS]);
    if (d > 2 && r.int(0, 2) === 0) {
      // Where a fraction sits: count jumps from 0. Never exactly halfway, where counting back from 1 lands there too.
      const n = r.pick(Array.from({ length: d - 1 }, (_, k) => k + 1).filter((x) => 2 * x !== d));
      const jumps = (count: number) => `${count} ${count === 1 ? 'jump' : 'jumps'}`;
      return { prompt: `A line has ${d} equal spaces. Where is ${f(n, d)}?`, right: `${jumps(n)} from 0`, wrong: [`${jumps(d)} from 0`, `${jumps(n)} back from 1`], extra: `${jumps(d - n)} from 0`,
        hint: 'The numerator tells how many jumps from 0.', retry: `Each jump is 1/${d}. ${f(n, d)} is ${n} ${n === 1 ? 'jump' : 'jumps'} from 0.`, model: line(0, d) };
    }
    return r.chance()
      ? { prompt: `How many equal spaces do you need for ${name(d)}?`, right: String(d), wrong: [String(d - 1), String(d + 1)], hint: 'The denominator tells how many equal spaces go from 0 to 1.', retry: `${d} spaces from 0 to 1.`, model: line(0, 1) } // a plain 0–1 line: the picture must not show the answer
      : d > 2 && r.chance()
        ? (() => { const n = r.int(2, d - 1); return { prompt: `Each jump is 1/${d}. What is ${n} jumps from 0?`, right: f(n, d), wrong: [f(d, n), f(n, d + n)] as [string, string], hint: 'Each jump is the same size. Count the jumps.', retry: `${n} jumps of 1/${d} is ${f(n, d)}.`, model: line(n, d) }; })()
        : { prompt: `0 to 1 has ${d} equal spaces. What is 1 jump?`, right: f(1, d), wrong: [f(d, 1), f(1, d - 1)], hint: 'Count the spaces from 0 to 1.', retry: `${d} jumps make one whole. So 1 jump is 1/${d}.`, model: line(1, d) };
  },
  'number-line-points': (r) => {
    if (r.chance()) {
      const d = r.pick([2, ...G3_DENS]); const n = r.int(1, d - 1);
      return { prompt: `A line has ${d} spaces. The point is ${n} ${n === 1 ? 'jump' : 'jumps'} from 0. What is it?`, right: f(n, d), wrong: [f(d, n), f(1, d === n + 1 ? d + 1 : d)], extra: f(n, d + 1),
        hint: 'The spaces from 0 to 1 are the denominator. The jumps are the numerator.', retry: `${d} spaces, so each jump is 1/${d}. ${n} ${n === 1 ? 'jump is' : 'jumps is'} ${f(n, d)}.`, model: line(n, d) };
    }
    const d = r.pick(G3_DENS); const n = r.int(1, d - 1);
    return { prompt: 'What fraction is at the dot?', right: f(n, d), wrong: [f(d, n), f(n + 1, d)], hint: 'Count the spaces from 0 to 1. Then count jumps to the dot.', retry: `Each jump is 1/${d}. The dot is ${n} jumps from 0.`, model: line(n, d) };
  },
  'number-line-beyond-one': (r) => {
    const d = r.pick([2, ...G3_DENS]); const k = d + r.int(1, Math.max(1, d - 1));
    const form = r.int(0, 3);
    if (form === 1) {
      return { prompt: `Each jump is ${f(1, d)}. Which point is just past 1?`, right: f(d + 1, d), wrong: [f(d + 2, d), f(d, d)], extra: f(d - 1, d),
        hint: `${d} jumps reach 1. Take one more jump.`, retry: `${f(d, d)} is 1. One more jump is ${f(d + 1, d)}.`, model: line(0, d, 2) };
    }
    if (form === 2) {
      // Said as 1 whole and the part left over (idea 2). Real slips: forgot the whole, one whole too many, one part off.
      const left = k - d; const part = (top: number) => f(top, d);
      return { prompt: `A runner takes ${k} steps. Each step is ${f(1, d)} mile. How far is that?`, right: `1 and ${part(left)} miles`, wrong: [`${part(left)} mile`, `2 and ${part(left)} miles`],
        extra: left > 1 ? `1 and ${part(left - 1)} miles` : `1 and ${part(left + 1)} miles`,
        hint: `${d} steps make 1 mile. Count the steps after that.`, retry: `${d} steps are 1 mile. ${left} more ${left === 1 ? 'step is' : 'steps are'} ${part(left)}, so 1 and ${part(left)} miles.`, model: line(k, d) };
    }
    return { prompt: `Each jump is ${f(1, d)}. What is ${k} jumps from 0?`, right: f(k, d), wrong: [f(d, k), f(k - d, d)], hint: `${d} jumps reach 1. Keep counting.`, retry: `${k} jumps of 1/${d} is ${f(k, d)}.`, model: line(k, d) };
  },
  'compare-same-denominator': (r) => {
    const d = r.pick(G3_DENS); const a = r.int(1, d - 2); const b = r.int(a + 1, d - 1); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${either(r, f(a, d), f(b, d))}?`, right: bigger ? f(b, d) : f(a, d), wrong: [bigger ? f(a, d) : f(b, d), 'They are equal'],
      hint: 'Same size parts. Compare the numerators.', retry: bigger ? `${b} parts are more than ${a}.` : `${a} ${a === 1 ? 'part is' : 'parts are'} less than ${b}.`, ...compareBars([a, d], [b, d]) };
  },
  'compare-same-numerator': (r) => {
    const [a, b] = r.pick(G3_PAIRS.filter(([small]) => small > 2)); const n = r.int(1, Math.min(4, a - 1)); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${either(r, f(n, a), f(n, b))}?`, right: bigger ? f(n, a) : f(n, b), wrong: [bigger ? f(n, b) : f(n, a), 'They are equal'],
      hint: `Both fractions count ${n} part${n === 1 ? '' : 's'} from the same-size whole. A larger denominator makes more equal parts, so each part is smaller.`, retry: `A denominator of ${b} splits the same-size whole into smaller parts than ${a}. With the same ${n} parts counted, ${f(n, a)} is bigger than ${f(n, b)}.`, ...compareBars([n, a], [n, b]) };
  },
  'order-fractions': (r) => {
    const d = r.pick([4, 6, 8]); const a = r.int(1, d - 3); const b = r.int(a + 1, d - 2); const c = r.int(b + 1, d - 1);
    const up = r.chance();
    const small = `${f(a, d)}, ${f(b, d)}, ${f(c, d)}`; const big = `${f(c, d)}, ${f(b, d)}, ${f(a, d)}`; const mixed = `${f(b, d)}, ${f(a, d)}, ${f(c, d)}`;
    return { prompt: `Put ${mixed} in order, ${up ? 'smallest' : 'biggest'} first.`, right: up ? small : big, wrong: [up ? big : small, mixed],
      hint: 'Same size parts. Order the numerators.', retry: up ? `${a}, then ${b}, then ${c}.` : `${c}, then ${b}, then ${a}.`,
      // All three, in the order the question lists them, so the picture doesn't put them in order for the child.
      model: { kind: 'bars', bars: [[b, d], [a, d], [c, d]].map(([numerator, denominator]) => ({ numerator, denominator })), hideLabels: true } };
  },
  // Equivalent pairs whose denominators both fit the lesson's grade (grade 3: 1/2 = 2/4 = 3/6 = 4/8, 1/3 = 2/6, 3/4 = 6/8).
  'equivalent-models': (r) => {
    const [n, d, k] = r.pick(G3_EQUIVALENTS_WIDE);
    if (r.chance()) {
      const [n, d, k] = r.pick(JOINABLE);
      // ("Bigger parts" would make it read as a which-is-bigger question.)
      return fromSlips(`Join the small parts. Which fraction with a denominator of ${d} is the same as ${f(n * k, d * k)}?`, f(n, d), joinSlips(n, d, k),
        `Join every ${k} small parts into 1 part.`, `Every ${k} small parts make 1 part. ${n * k} small parts make ${n}, so ${f(n * k, d * k)} = ${f(n, d)}.`, bar(n * k, d * k));
    }
    return { prompt: `Which is the same as ${f(n, d)}?`, right: f(n * k, d * k), wrong: [f(n, d * k), f(n * k, d)], hint: `Split every part into ${k}.`, retry: `Split every part into ${k}. Now ${n * k} of ${d * k} parts are shaded: ${f(n * k, d * k)}.`, model: bar(n, d) };
  },
  'build-equivalents': (r) => {
    const [n, d, k] = r.pick(equivalentsFor('build-equivalents'));
    if (r.chance()) {
      return later(`Divide the numerator and denominator of ${f(n * k, d * k)} by ${k}. What do you get?`, f(n, d), [f(n, d * k), f(n * k, d), f(n * k - k, d * k - k)],
        'Do the same thing to the numerator and denominator.', `${n * k} ÷ ${k} = ${n} and ${d * k} ÷ ${k} = ${d}.`, bar(n * k, d * k));
    }
    return { prompt: `Multiply the numerator and denominator of ${f(n, d)} by ${k}. What do you get?`, right: f(n * k, d * k), wrong: [f(n + k, d + k), f(n * k, d)], hint: 'Do the same thing to the numerator and denominator.', retry: `${n} × ${k} = ${n * k} and ${d} × ${k} = ${d * k}.`, model: bar(n, d) };
  },
  'missing-equivalent': (r) => {
    const [n, d, k] = r.pick(equivalentsFor('missing-equivalent'));
    const form = r.int(0, 2);
    if (form === 1) {
      return later(`Fill the blank: ${f(n, d)} = ${n * k}/?`, String(d * k), [String(d + k), String(d * k + 1), String(d)],
        `What times ${n} makes ${n * k}?`, `The numerator was multiplied by ${k}. So the denominator is ${d} × ${k} = ${d * k}.`, bar(n, d));
    }
    if (form === 2) {
      return later(`Fill the blank: ${f(n * k, d * k)} = ${n}/?`, String(d), [String(d * k), String(d * k - k), String(d + 1)],
        `What was ${n * k} divided by to make ${n}?`, `${n * k} ÷ ${k} = ${n}. So the denominator is ${d * k} ÷ ${k} = ${d}.`, bar(n * k, d * k));
    }
    return { prompt: `Fill the blank: ${f(n, d)} = ?/${d * k}`, right: String(n * k), wrong: [String(n + k), String(n * k + 1)], hint: `What times ${d} makes ${d * k}?`, retry: `The denominator was multiplied by ${k}. So the numerator is ${n} × ${k} = ${n * k}.`, model: bar(n, d) };
  },
  'compose-to-one': (r) => {
    // Never half and half: then the missing part is the fraction already written, the one fraction in the prompt.
    const d = r.pick(DENS); const n = r.pick(Array.from({ length: d - 1 }, (_, i) => i + 1).filter((x) => 2 * x !== d));
    return { prompt: `Fill the blank: ${f(n, d)} + ? = 1`, right: f(d - n, d), wrong: [f(n, d), f(d - n, d * 2)], hint: `One whole is ${f(d, d)}.`, retry: `${d} take away ${n} is ${d - n}. So ${f(d - n, d)}.`, model: bar(n, d) };
  },
  'decompose-fractions': (r) => {
    const d = r.pick([5, 6, 8, 10, 12]); const n = r.int(3, d - 1); const first = r.int(1, n - 2);
    return { prompt: `Which adds up to ${f(n, d)}?`, right: `${f(first, d)} + ${f(n - first, d)}`, wrong: [`${f(first, d)} + ${f(n - first - 1, d)}`, `${f(n, d)} + ${f(n, d)}`], hint: 'Add the numerators. The denominator stays.', retry: `${first} + ${n - first} = ${n}. So ${f(n, d)}.`, model: bar(n, d) };
  },
  'improper-fractions': (r) => {
    const d = r.pick([2, ...G3_DENS]); const left = r.int(1, d - 1);
    const form = r.int(0, 3);
    if (form === 1) {
      const wholes = r.int(1, 2); const top = wholes * d + left;
      const between = (lo: number) => `Between ${lo} and ${lo + 1}`;
      return { prompt: `Where is ${f(top, d)} on the number line?`, right: between(wholes), wrong: [between(wholes === 1 ? 2 : 1), between(0)], extra: between(3),
        hint: `${f(d, d)} is one whole. How many groups of ${d} fit in ${top}?`, retry: `${f(top, d)} is ${wholes} ${wholes === 1 ? 'whole' : 'wholes'} and ${left} more, so it is between ${wholes} and ${wholes + 1}.`, model: line(0, d, 3) };
    }
    if (form === 2) {
      const wholes = r.int(2, 3);
      return { prompt: `How many ${name(d)} make ${wholes} wholes?`, right: String(wholes * d), wrong: [String(d), String(wholes)], extra: String(wholes * d + 1),
        hint: `${d} ${name(d)} make one whole.`, retry: `${d} ${name(d)} in each whole. ${wholes} × ${d} = ${wholes * d}.`, model: bar(0, d) };
    }
    return { prompt: `How many ${name(d)} past one whole is ${f(d + left, d)}?`, right: String(left), wrong: [String(d + left), String(d)], hint: `${f(d, d)} is one whole. Count the jumps after it.`, retry: `${f(d + left, d)} is ${f(d, d)} and ${left} more ${left === 1 ? (d === 2 ? 'half' : name(d).replace(/s$/, '')) : name(d)}.`, model: line(d + left, d) };
  },
  'mixed-improper': (r) => {
    const d = r.pick([2, ...G3_DENS]); const left = r.int(1, d - 1);
    const form = r.int(0, 2);
    if (form === 1) {
      // Wholes and a fraction. Real slips: the two numbers swapped, the denominator as the wholes, the part dropped.
      const wholes = d === 3 || d === 4 ? r.int(1, 2) : 1; const top = wholes * d + left; const say = (w: number, t: number) => `${w} and ${f(t, d)}`;
      const slips = [
        ...(left !== wholes && wholes < d ? [say(left, wholes)] : []), // the two numbers swapped
        ...(d !== wholes ? [say(d, left)] : []), // the denominator as the wholes
        String(wholes), // the part left over dropped
        `${wholes} and ${f(left, top)}`, // the numerator as the denominator
      ];
      return { prompt: `What is ${f(top, d)} as wholes and a fraction?`, right: say(wholes, left), wrong: [slips[0], slips[1]], extra: slips[2], slips,
        hint: `${f(d, d)} is one whole. How many wholes fit in ${f(top, d)}?`, retry: `${f(top, d)} is ${wholes === 1 ? f(d, d) : `${wholes} groups of ${f(d, d)}`} and ${f(left, d)} more: ${say(wholes, left)}.`, model: line(top, d) };
    }
    if (form === 2 && d <= 4) {
      return { prompt: `What is 2 and ${f(left, d)} as ${name(d)}?`, right: f(2 * d + left, d), wrong: [f(d + left, d), f(2 + left, d)], extra: f(2 * d, d),
        hint: `Each whole is ${f(d, d)}.`, retry: `2 wholes are ${f(2 * d, d)}. ${f(2 * d, d)} + ${f(left, d)} = ${f(2 * d + left, d)}.`, model: line(2 * d + left, d) };
    }
    return { prompt: `What is 1 and ${f(left, d)} as ${name(d)}?`, right: f(d + left, d), wrong: [f(left, d), f(1 + left, d)], hint: `One whole is ${f(d, d)}.`, retry: `${f(d, d)} + ${f(left, d)} = ${f(d + left, d)}.`, model: line(d + left, d) };
  },
  'add-like-denominators': (r) => {
    const d = r.pick([5, 6, 8, 10, 12]); const a = r.int(1, d - 2); const b = r.int(1, d - 1 - a);
    return { prompt: `${f(a, d)} + ${f(b, d)} = ?`, right: f(a + b, d), wrong: [f(a + b, d * 2), f(a + b + 1, d)], hint: 'Add the numerators. The denominator stays.', retry: `${a} + ${b} = ${a + b}. So ${f(a + b, d)}.`, model: bars2([a, d], [b, d]) };
  },
  'subtract-like-denominators': (r) => {
    const d = r.pick([5, 6, 8, 10, 12]); const a = r.int(2, d - 1); const b = r.int(1, a - 1);
    return { prompt: `${f(a, d)} − ${f(b, d)} = ?`, right: f(a - b, d), wrong: [f(a + b, d), f(a - b, d * 2)], hint: 'Take away the numerators. The denominator stays.', retry: `${a} − ${b} = ${a - b}. So ${f(a - b, d)}.`, model: bar(a, d) };
  },
  'add-related-fractions': (r) => {
    const [a, big] = r.pick([[2, 4], [2, 6], [2, 8], [2, 10], [2, 12], [3, 6], [3, 9], [3, 12], [4, 8], [4, 12], [5, 10], [6, 12]] as const); const k = big / a;
    const form = r.int(0, 2);
    if (form === 2) {
      // Rename one fraction so both are the same size parts. Real slips: keep the top, add the gap to the top, flip it.
      const n = r.int(1, a - 1);
      return { prompt: `${Name(a)} and ${name(big)} are different sizes. Rename ${f(n, a)} as ${name(big)}.`, right: f(n * k, big), wrong: [f(n, big), f(big, n * k)], extra: f(n + big - a, big),
        hint: `Multiply the numerator and the denominator by ${k}.`, retry: `${a} × ${k} = ${big}, so multiply the numerator by ${k} too: ${f(n, a)} = ${f(n * k, big)}.`, model: bar(n, a) };
    }
    // The sum stays under 1. Either fraction may come first.
    const n = form === 0 ? 1 : r.int(1, a - 1);
    const m = form === 0 ? 1 : r.int(1, big - n * k - 1);
    const [first, second] = r.chance() ? [[n, a], [m, big]] : [[m, big], [n, a]];
    return { prompt: `${f(first[0], first[1])} + ${f(second[0], second[1])} = ?`, right: f(n * k + m, big), wrong: [f(n + m, a + big), f(n + m, big)],
      hint: `Change ${f(n, a)} into ${name(big)} first.`, retry: `${f(n, a)} = ${f(n * k, big)}. ${n * k} + ${m} = ${n * k + m}, so ${f(n * k + m, big)}.`, model: bars2([n, a], [m, big]) };
  },
  'tenths-decimals': (r) => {
    // Wrong choices are tenths slips only (the part not colored, the digit before the point, upside down): hundredths come in lesson 31.
    const n = r.int(1, 9);
    const form = r.int(0, 8); // 7 and 8 are the plain forms again, so the number line comes about once in a round
    const strip = { kind: 'decimal', tenths: n, hideLabels: true } as const;
    if (form === 6) {
      // 4.NF.6: read a decimal from a number line (10 spaces from 0 to 1). Slips: counted from the 1 end, forgot the point, one space off.
      return { prompt: 'What decimal is at the dot?', right: `0.${n}`, wrong: n === 5 ? ['5.0', '0.4'] : [`0.${10 - n}`, `${n}.0`], extra: String(n),
        slips: [`0.${10 - n}`, `${n}.0`, ...(n < 9 ? [`0.${n + 1}`] : []), ...(n > 1 ? [`0.${n - 1}`] : []), String(n)].filter((c) => c !== `0.${n}`),
        hint: 'Each space is one tenth. Count the spaces from 0 to the dot.', retry: `The dot is ${n} ${n === 1 ? 'space' : 'spaces'} from 0. ${n} ${n === 1 ? 'tenth is' : 'tenths is'} 0.${n}.`, model: { ...line(n, 10, 1), hideHops: true } };
    }
    if (form === 2) {
      return { prompt: `A strip has 10 equal parts. ${n} ${n === 1 ? 'is' : 'are'} colored. What fraction is colored?`, right: f(n, 10), wrong: n === 5 ? [f(10, 5), f(5, 5)] : [f(10 - n, 10), f(10, n)], extra: n === 5 ? f(5, 6) : f(n, 10 - n),
        slips: n === 5 ? [f(10, 5), f(5, 5), f(5, 6)] : [f(10 - n, 10), f(10, n), f(n, 10 - n)],
        hint: 'The denominator is all 10 equal parts. The numerator is the colored parts.', retry: `${n} of 10 equal parts are colored: ${f(n, 10)}.`, model: bar(n, 10) };
    }
    if (form === 3 && n !== 5) {
      return { prompt: `A strip has 10 equal parts. ${n} ${n === 1 ? 'is' : 'are'} colored. What fraction is not colored?`, right: f(10 - n, 10), wrong: [f(n, 10), f(10 - n, n)], extra: f(1, 10 - n === 1 ? 2 : 10 - n),
        slips: [f(n, 10), f(10 - n, n), f(1, 10 - n === 1 ? 2 : 10 - n)],
        hint: 'Count the parts that are not colored. The denominator is still 10.', retry: `${10 - n} of the 10 parts are not colored: ${f(10 - n, 10)}.`, model: bar(n, 10) };
    }
    if (form === 4) {
      return { prompt: `A strip has 10 equal parts. ${n} ${n === 1 ? 'is' : 'are'} colored. Write the colored part as a decimal.`, right: `0.${n}`, wrong: [`${n}.0`, n === 5 ? '10.5' : `0.${10 - n}`], extra: String(n),
        slips: [`${n}.0`, ...(n === 5 ? ['10.5'] : [`0.${10 - n}`]), String(n), `10.${n}`],
        hint: 'Tenths go right after the decimal point.', retry: `${n} ${n === 1 ? 'tenth is' : 'tenths is'} 0.${n}.`, model: bar(n, 10) };
    }
    if (form === 5) {
      // A decimal against a fraction of the same strip.
      let m = r.int(1, 9); if (m === n) m = m === 9 ? 8 : m + 1;
      const decimalFirst = r.chance();
      const dec = `0.${n}`; const frac = f(m, 10);
      const [x, y] = decimalFirst ? [dec, frac] : [frac, dec];
      return { prompt: `Which is bigger, ${x} or ${y}?`, right: n > m ? dec : frac, wrong: [n > m ? frac : dec, 'They are equal'], extra: "You can't tell",
        hint: '0.' + n + ' is ' + f(n, 10) + '. Compare the tenths.', retry: `${dec} is ${f(n, 10)}. ${Math.max(n, m)} tenths are more than ${Math.min(n, m)} ${Math.min(n, m) === 1 ? 'tenth' : 'tenths'}.`, model: bars2([n, 10], [m, 10]) };
    }
    return r.chance()
      ? { prompt: `What fraction is 0.${n}?`, right: f(n, 10), wrong: [n === 5 ? f(10, 5) : f(10 - n, 10), f(1, n === 1 ? 2 : n)], hint: 'The number right after the decimal point is tenths.', retry: `0.${n} means ${n} ${n === 1 ? 'tenth' : 'tenths'}.`, model: strip }
      : { prompt: `Write ${f(n, 10)} as a decimal.`, right: `0.${n}`, wrong: [`${n}.0`, n === 5 ? '10.5' : `0.${10 - n}`], hint: 'Tenths go right after the decimal point.', retry: `${n} ${n === 1 ? 'tenth is' : 'tenths is'} 0.${n}.`, model: strip };
  },
  'add-tenths-hundredths': (r) => {
    const a = r.int(1, 8); const b = r.int(1, Math.min(49, 99 - 10 * a)); const sum = 10 * a + b;
    return r.chance()
      ? { prompt: `${f(a, 10)} + ${f(b, 100)} = ?`, right: f(sum, 100), wrong: [f(a + b, 110), f(a + b, 100)], hint: `Change ${f(a, 10)} into hundredths first.`, retry: `${f(a, 10)} = ${f(10 * a, 100)}. ${10 * a} + ${b} = ${sum}. So ${f(sum, 100)}.`, model: bars2([a, 10], [b, 100]) }
      : { prompt: `Write ${f(a, 10)} + ${f(b, 100)} as a decimal.`, right: (sum / 100).toFixed(2), wrong: [((a + b) / 100).toFixed(2), (sum / 10).toFixed(1)], hint: 'Change the tenths to hundredths, add, then write 2 places after the decimal point.', retry: `${f(10 * a, 100)} + ${f(b, 100)} = ${f(sum, 100)} = ${(sum / 100).toFixed(2)}.`, model: bars2([a, 10], [b, 100]) };
  },
  'hundredths-decimals': (r) => {
    const n = r.int(1, 99); const dec = (n / 100).toFixed(2);
    return r.chance()
      ? { prompt: `What fraction is ${dec}?`, right: f(n, 100), wrong: [f(n, 10), n === 1 ? f(1, 2) : n === 10 ? f(10, 10) : f(1, n)], hint: '2 places after the decimal point means hundredths.', retry: `${dec} means ${n} hundredths.`, model: bar(n, 100) }
      : { prompt: `Write ${f(n, 100)} as a decimal.`, right: dec, wrong: [(n / 10).toFixed(1), `${n}.0`], hint: 'Hundredths need 2 places after the decimal point.', retry: `${n} hundredths is ${dec}.`, model: bar(n, 100) };
  },
};


/* ---------- later lessons (units 9–14): fresh numbers every round ---------- */

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const mixedName = (top: number, bottom: number) => {
  const whole = Math.floor(top / bottom); const part = top % bottom;
  return whole && part ? `${whole} ${part}/${bottom}` : whole ? String(whole) : f(part, bottom);
};
/** Value of a choice like "3/4", "1 1/2", "0.25", "75%" or "6 m" (null if it is not a number). */
const valueOf = (choice: string): number | null => {
  const v = parseAnswer(choice.replace(/%$/, '').replace(/ (m|cups?|liters?)$/, ''));
  return v ? (v.n / v.d) * (choice.endsWith('%') ? 0.01 : 1) : null;
};
/** Keep only wrong answers that really are wrong (never equal in value), topped up if needed. */
function safeWrong(right: string, candidates: string[]): [string, string] {
  const target = valueOf(right);
  const ok = candidates.filter((c, i) => c !== right && candidates.indexOf(c) === i && (target === null || valueOf(c) === null || Math.abs((valueOf(c) as number) - target) > 1e-9));
  for (const extra of choiceDistractors(right)) if (ok.length < 2 && !ok.includes(extra)) ok.push(extra);
  return [ok[0], ok[1]];
}
const POOL: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 6], [5, 6], [3, 8], [5, 8], [7, 8], [3, 10], [7, 10], [5, 12], [7, 12]];
const SMALL_POOL = POOL.filter(([, d]) => d <= 6);
const EXACT_PERCENT: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [4, 100],
  [7, 20], [9, 20], [11, 20], [13, 20], [17, 20], [19, 20], [8, 100], [12, 100], [24, 100]];
/** More amounts out of 100 (percent means out of 100, so the numerator is the percent). */
const HUNDREDTHS: [number, number][] = [[1, 100], [3, 100], [7, 100], [15, 100], [19, 100], [27, 100], [36, 100], [45, 100], [54, 100], [62, 100], [73, 100], [81, 100], [88, 100], [99, 100]];
/** The same amounts with grade 4 denominators: twentieths become hundredths (3/20 → 15/100). Tenths that are not in
    simplest form (2/10) are still tenths, written 0.2. */
const EXACT_DECIMAL: [number, number][] = ([...EXACT_PERCENT.map(([t, b]): [number, number] => (gradeFits('decimal-fraction-equivalence', b) ? [t, b] : [t * (100 / b), 100])),
  ...HUNDREDTHS, [2, 10], [6, 10], [8, 10]] as [number, number][]).filter(([t, b], at, all) => all.findIndex(([u, c]) => u === t && c === b) === at);
const later = (prompt: string, right: string, wrong: string[], hint: string, retry: string, model: ModelSpec, simpler?: ModelSpec): Item =>
  ({ prompt, right, wrong: safeWrong(right, wrong), hint, retry, model, simpler });
/** A question whose wrong choices all come from `slips`, its real mistakes: two to start, a third as the fourth choice. */
function fromSlips(prompt: string, right: string, slips: string[], hint: string, retry: string, model: ModelSpec): Item {
  const target = answerValue(right);
  const real = slips.filter((slip, at) => Math.abs(answerValue(slip) - target) > 1e-9
    && slips.findIndex((other) => Math.abs(answerValue(other) - answerValue(slip)) < 1e-9) === at); // one choice per amount
  return { prompt, right, wrong: [real[0], real[1]], extra: real[2], slips: real, hint, retry, model };
}

/** a/b × c/d on a grid of b rows and d columns: every pair of fractions with denominators 2 to 6, 24 squares at most
    so the grid stays readable. */
const TIMES_GRID: [number, number, number, number][] = [];
for (const b of [2, 3, 4, 5, 6]) for (const d of [2, 3, 4, 5, 6]) {
  if (b * d > 24) continue;
  for (let a = 1; a < b; a++) for (let c = 1; c < d; c++) {
    // Simplest form only, and at least three different real mistakes besides the answer (1/2 × 1/2 has only two).
    const right = (a * c) / (b * d);
    const slips = new Set([(a + c) / (b + d), (a * c) / d, (a * c) / b, (a + c) / (b * d), (a * c) / (b + d), (a * d) / (b * c)].filter((v) => Math.abs(v - right) > 1e-9));
    if (gcd(a, b) === 1 && gcd(c, d) === 1 && slips.size >= 3) TIMES_GRID.push([a, b, c, d]);
  }
}

const LATER_RECIPES: Record<string, (r: Rng) => Item> = {
  'simplify-fractions': (r) => {
    // Fractions in simplest form (n/d) renamed with a common factor k, up to twelfths.
    const forms: [number, number, number][] = [];
    for (let d = 2; d <= 6; d++) for (let n = 1; n < d; n++) if (gcd(n, d) === 1) for (let k = 2; k * d <= 12; k++) forms.push([n, d, k]);
    const form = r.int(0, 2);
    if (form === 2) {
      // A prime that divides both numbers, and no other number above 1 does.
      const pairs: [number, number, number][] = [];
      for (const g of [2, 3, 5]) for (let p = 2; p <= 5; p++) for (let q = p + 1; g * q <= 12; q++) if (gcd(p, q) === 1) pairs.push([g, g * p, g * q]);
      const [g, x, y] = r.pick(pairs);
      // Real slips: a number that divides only one of them, then either number itself.
      const onlyOne = (a: number, b: number) => [2, 3, 4, 5, 6, 8, 9, 10, 12].find((c) => a % c === 0 && b % c !== 0 && c !== a);
      const slips = [onlyOne(x, y), onlyOne(y, x), x, y].filter((c): c is number => c !== undefined).map(String);
      return fromSlips(`Which number divides both ${x} and ${y}?`, String(g), slips,
        `Try each choice. It must divide ${x} and ${y} with nothing left over.`, `${g} divides ${x} and ${y} with nothing left over.`, bar(x, y));
    }
    const [n, d, k] = r.pick(forms);
    if (form === 1) {
      return fromSlips(`Divide the numerator and denominator of ${f(n * k, d * k)} by ${k}. What do you get?`, f(n, d), [f(n, d * k), f(n * k, d), f(n * k - k, d * k - k)],
        'Divide the numerator and the denominator by the same number.', `${n * k} ÷ ${k} = ${n} and ${d * k} ÷ ${k} = ${d}, so ${f(n, d)}.`, bar(n * k, d * k));
    }
    return later(`Write ${f(n * k, d * k)} in simplest form.`, f(n, d), [f(n, d * k), f(n * k, d), f(n + 1, d)],
      'Divide the numerator and denominator by the same number.', `Divide both by ${k}: ${f(n, d)}.`, bar(n * k, d * k));
  },
  'equivalent-missing-both': (r) => {
    const [n, d, k] = r.pick(equivalentsFor('equivalent-missing-both'));
    // A blank on top or on the bottom, by multiplying or dividing. The hint asks for the factor instead of naming it.
    switch (r.int(0, 2)) {
      case 0: return later(`Fill the blank: ${f(n, d)} = ?/${d * k}`, String(n * k), [String(n + k), String(n * k + 1), String(n * k - 1)],
        `What was ${d} multiplied by to make ${d * k}?`, `${d} × ${k} = ${d * k}, so ${n} × ${k} = ${n * k}.`, bar(n, d));
      case 1: return later(`Fill the blank: ${f(n, d)} = ${n * k}/?`, String(d * k), [String(d + k), String(d * k + 1), String(d * k - 1)],
        `What was ${n} multiplied by to make ${n * k}?`, `${n} × ${k} = ${n * k}, so ${d} × ${k} = ${d * k}.`, bar(n, d));
      default: return later(`Fill the blank: ${f(n * k, d * k)} = ?/${d}`, String(n), [...new Set([n * k, n * k - k, n + 1, n * k + 1].filter((x) => x !== n && x > 0).map(String))].slice(0, 3),
        `What was ${d * k} divided by to make ${d}?`, `${d * k} ÷ ${k} = ${d}, so ${n * k} ÷ ${k} = ${n}.`, bar(n * k, d * k));
    }
  },
  'compare-unlike-fractions': (r) => {
    // About 1 in 4 pairs share a numerator (3/4 vs 3/8), so that strategy keeps coming back.
    if (r.int(0, 3) === 0) {
      const [d1, d2] = r.pick([[3, 5], [4, 6], [4, 10], [5, 8], [3, 8], [6, 10], [5, 12], [8, 12]] as const); const n = r.int(2, d1 - 1);
      const big: [number, number] = [n, d1]; const small: [number, number] = [n, d2]; const [x, y] = r.chance() ? [big, small] : [small, big];
      return later(`Which is bigger, ${f(x[0], x[1])} or ${f(y[0], y[1])}?`, f(n, d1), [f(n, d2), 'They are equal'],
        `Both fractions count ${n} parts. A larger denominator, ${d2}, makes more equal parts, so each part is smaller.`, `Both count ${n} parts. The ${name(d1)} are bigger than the ${name(d2)}, so ${f(n, d1)} is bigger.`, compareBars(x, y).model, compareBars(x, y).simpler);
    }
    if (r.int(0, 5) === 0) {
      const [n, d, k] = r.pick(equivalentsFor('compare-unlike-fractions'));
      const [x, y]: [number, number][] = r.chance() ? [[n, d], [n * k, d * k]] : [[n * k, d * k], [n, d]];
      return later(`Which is bigger, ${f(x[0], x[1])} or ${f(y[0], y[1])}?`, 'They are equal', [f(x[0], x[1]), f(y[0], y[1])],
        'Give both the same denominator. Then compare the numerators.', `${f(n, d)} = ${f(n * k, d * k)}: the same amount.`, compareBars(x, y).model, compareBars(x, y).simpler);
    }
    const a = r.pick(POOL); let b = r.pick(POOL);
    // The shared denominator stays a grade 4 one (twelfths at most), so the renaming in the feedback fits too.
    while (b[1] === a[1] || a[0] * b[1] === b[0] * a[1] || !gradeFits('compare-unlike-fractions', (a[1] * b[1]) / gcd(a[1], b[1]))) b = r.pick(POOL);
    const bigger = a[0] * b[1] > b[0] * a[1] ? a : b; const smaller = bigger === a ? b : a; const m = (a[1] * b[1]) / gcd(a[1], b[1]);
    return later(`Which is bigger, ${f(a[0], a[1])} or ${f(b[0], b[1])}?`, f(bigger[0], bigger[1]), [f(smaller[0], smaller[1]), 'They are equal'],
      'Give both the same denominator. Then compare the numerators.', [a, b].filter((x) => x[1] !== m).map((x) => `${f(x[0], x[1])} = ${f(x[0] * (m / x[1]), m)}.`).join(' ') + ` ${f(bigger[0], bigger[1])} is bigger.`, compareBars(a, b).model, compareBars(a, b).simpler);
  },
  'order-unlike-fractions': (r) => {
    const picked: [number, number][] = [];
    while (picked.length < 3) { const c = r.pick(POOL); if (!picked.some(([t, b]) => t * c[1] === c[0] * b)) picked.push(c); }
    const up = r.chance(); const sorted = picked.slice().sort((x, y) => (x[0] * y[1] - y[0] * x[1]) * (up ? 1 : -1));
    const name = (list: [number, number][]) => list.map(([t, b]) => f(t, b)).join(', ');
    const shown = name(picked) === name(sorted) || name(picked) === name(sorted.slice().reverse()) ? [sorted[1], sorted[0], sorted[2]] : picked;
    return later(`Put ${name(shown)} in order, ${up ? 'smallest' : 'biggest'} first.`, name(sorted), [name(sorted.slice().reverse()), name(shown)],
      'Compare each fraction to 1/2. If needed, rename them with the same denominator so their parts match, then compare.', `${up ? 'Smallest' : 'Biggest'} first: ${name(sorted)}.`,
      { kind: 'bars', bars: shown.map(([numerator, denominator]) => ({ numerator, denominator })), hideLabels: true });
  },
  'subtract-unlike-fractions': (r) => {
    const big = r.pick([4, 6, 8, 10, 12]); const small = r.pick([2, 3, 4, 5, 6].filter((e) => e < big && big % e === 0)); const k = big / small;
    const c = r.int(1, small - 1); const a = r.int(c * k + 1, big - 1);
    return later(`${f(a, big)} − ${f(c, small)} = ?`, f(a - c * k, big), [f(Math.max(1, a - c), big - small), f(a - c, big), f(a - c * k + 1, big)],
      `Change ${f(c, small)} into ${name(big)} first.`, `${f(c, small)} = ${f(c * k, big)}. ${a} − ${c * k} = ${a - c * k}.`, bar(a, big));
  },
  'add-mixed-numbers': (r) => {
    const d = r.pick([3, 4, 5, 6, 8]); const w = r.int(1, 3); const a = r.int(1, d - 1); const b = r.int(1, d - 1);
    return later(`${w} ${f(a, d)} + ${f(b, d)} = ?`, mixedName(w * d + a + b, d), [mixedName(w * d + a + b + d, d), `${w} ${a + b}/${d * 2}`, mixedName(w * d + a + b - 1, d)],
      `Add the parts: ${a} + ${b}. ${d} parts make a new whole.`, `${a} + ${b} = ${a + b} parts. So ${mixedName(w * d + a + b, d)}.`, bar(w * d + a, d));
  },
  'subtract-mixed-numbers': (r) => {
    // Not a difference whose fraction is the very one being taken away (3 1/5 − 1 3/5 = 1 3/5, or 2 4/6 − 1 5/6 = 5/6):
    // it would already be written in the prompt. That happens when d + a = 2b, which is the only choice for thirds, so
    // the practice uses fourths, fifths, sixths and eighths.
    const d = r.pick([4, 5, 6, 8]); const w = r.int(2, 4); const b = r.int(2, d - 1);
    const a = r.pick(Array.from({ length: b - 1 }, (_, i) => i + 1).filter((part) => d + part !== 2 * b));
    const top = w * d + a - (d + b);
    return later(`${w} ${f(a, d)} − 1 ${f(b, d)} = ?`, mixedName(top, d), [`${w - 1} ${b - a}/${d}`, mixedName(top + d, d), mixedName(top + 1, d)],
      `${a} parts are not enough to take away ${b}. Trade one whole for ${f(d, d)}.`, `${w} ${f(a, d)} = ${w - 1} ${f(d + a, d)}. Take away 1 ${f(b, d)}: ${mixedName(top, d)}.`, bar(w * d + a, d));
  },
  'fraction-of-quantity': (r) => {
    const d = r.pick([2, 3, 4, 5, 6, 8, 10]); const n = r.int(1, d - 1); const per = r.int(2, 9); const t = d * per;
    return later(`${f(n, d)} × ${t} = ?`, String(n * per), [String(per), String(t - n * per), String(n * per + per)],
      `${t} ÷ ${d} is one group. Then take ${n} groups.`, `${t} ÷ ${d} = ${per}. ${n} × ${per} = ${n * per}.`, set(0, t, d));
  },
  'fraction-of-collection': (r) => {
    const d = r.pick([2, 3, 4, 5, 6]); const n = r.int(1, d - 1); const per = r.int(2, 5); const t = d * per;
    return later(`${f(n, d)} of ${t} cards are blue. Solve ${f(n, d)} × ${t} to find how many are blue.`, String(n * per), [String(per), String(t - n * per), String(n * per + 1)],
      `Make ${d} equal groups. Count ${n} of them.`, `${t} in ${d} groups is ${per} each. ${n} groups is ${n * per}.`, set(0, t, d));
  },
  'multiply-whole-by-fraction': (r) => {
    const [n, d] = r.pick(POOL); const m = r.int(2, 6);
    return later(`${m} × ${f(n, d)} = ?`, f(m * n, d), [f(m * n, m * d), f(n, m * d), f(m + n, d)],
      'Multiply the numerator. The denominator stays.', `${m} groups of ${f(n, d)} is ${f(m * n, d)}.`, bar(n, d));
  },
  'multiply-fractions': (r) => {
    // 24 small parts at most, so the bar stays readable.
    const [a, b] = r.pick(SMALL_POOL); const [n, d] = r.pick(SMALL_POOL.filter(([, den]) => b * den <= 24));
    return later(`What is ${f(a, b)} of ${f(n, d)}?`, f(a * n, b * d), [f(a + n, b + d), f(a * n, b + d), f(a * d, b * n)],
      'Multiply the numerators. Multiply the denominators.', `${a} × ${n} = ${a * n} and ${b} × ${d} = ${b * d}.`, bar(n, d));
  },
  'divide-whole-by-unit-fraction': (r) => {
    const d = r.pick([2, 3, 4, 5, 6, 8, 9, 10]); const c = r.int(1, 5);
    return later(`How many 1/${d}-cup scoops fill ${c} ${c === 1 ? 'cup' : 'cups'}? ${c} ÷ 1/${d} = ?`, String(c * d), [String(c + d), String(d), String(c * d + d)],
      `How many 1/${d} parts make one whole cup?${c > 1 ? ` Then think about ${c} cups.` : ''}`, `${c} × ${d} = ${c * d} scoops. Check: ${c * d} × 1/${d} = ${c}.`, bar(1, d));
  },
  'fraction-of-length': (r) => {
    const d = r.pick([2, 3, 4, 5, 8, 10]); const n = r.int(1, d - 1); const m = r.int(2, 6); const len = d * m;
    return later(`A ribbon is ${len} meters long. How long is ${f(n, d)} of it?`, `${n * m} meters`, [`${m} meters`, `${len - n * m} meters`, `${n * m + m} meters`],
      `Cut ${len} meters into ${d} equal parts. Count ${n}.`, `Each part is ${m} meters. ${n} ${n === 1 ? 'part is' : 'parts is'} ${n * m} meters.`, line(n, d));
  },
  'fractional-measure-addition': (r) => {
    const b = r.pick([2, 3, 4, 5, 6]); const k = r.pick([2, 3, 4].filter((x) => gradeFits('fractional-measure-addition', b * x))); const e = b * k;
    const a = r.int(1, b - 1); const c = r.int(1, e - 1);
    return later(`A board is ${f(a, b)} meter. Another is ${f(c, e)} meter. How long are they together?`, f(a * k + c, e), [f(a + c, b + e), f(a + c, e), f(a * k + c + 1, e)],
      `Change ${f(a, b)} into ${name(e)} first.`, `${f(a, b)} = ${f(a * k, e)}. ${a * k} + ${c} = ${a * k + c}.`, bars2([a, b], [c, e]));
  },
  'fractional-sharing': (r) => {
    // Never as many loaves as friends (each would get 1 whole loaf).
    const people = r.pick([2, 3, 4, 5, 6, 8, 10]); let loaves = r.int(1, 6); while (loaves === people) loaves = r.int(1, 6);
    return later(`${loaves} ${loaves === 1 ? 'loaf is' : 'loaves are'} shared fairly by ${people} friends. How much does each friend get?`, f(loaves, people), [f(people, loaves), f(1, people), f(loaves, people + loaves)],
      `Cut each loaf into ${people} parts. Each friend gets 1 part of every loaf.`, `${loaves} ÷ ${people} = ${f(loaves, people)}.`, wholes(loaves));
  },
  'fraction-as-division': (r) => {
    const b = r.pick([2, 3, 4, 5, 6, 8]);
    if (r.chance()) {
      let a = r.int(1, 9); if (a % b === 0) a += 1;
      return later(`${a} ÷ ${b} = ?`, f(a, b), [f(b, a), f(1, b), f(a, a + b)],
        'The fraction bar means divide. The number you divide goes on top.', `${a} ÷ ${b} = ${f(a, b)}${a > b ? `, or ${mixedName(a, b)}` : ''}.`, wholes(a));
    }
    const lo = r.int(1, 3); const a = lo * b + r.int(1, b - 1);
    return { prompt: `Between which two whole numbers is ${f(a, b)}?`, right: `${lo} and ${lo + 1}`, wrong: [`${lo - 1} and ${lo}`, `${lo + 1} and ${lo + 2}`], extra: `${a} and ${a + 1}`,
      hint: `${b}/${b} is one whole. How many whole groups of ${b} fit in ${a}?`, retry: `${f(a, b)} = ${a} ÷ ${b} = ${mixedName(a, b)}, between ${lo} and ${lo + 1}.`, model: line(0, b, lo + 1) };
  },
  'compare-decimals-grid': (r) => {
    const show = (h: number) => String(h / 100);
    const grid = (h: number) => ({ cut: 'grid-10x10' as const, shaded: Array.from({ length: h }, (_, k) => (k % 10) * 10 + Math.floor(k / 10)) });
    const grids = (...hs: number[]): ModelSpec => ({ kind: 'area', ...grid(hs[0]), more: hs.slice(1).map(grid) });
    const pool = [5, 9, 25, 30, 40, 45, 50, 55, 60, 6, 75, 8, 80, 7, 70, 99, 90, 12, 2, 20];
    const kind = r.int(0, 3);
    if (kind === 0) {
      const picked: number[] = []; while (picked.length < 3) { const h = r.pick(pool); if (!picked.includes(h)) picked.push(h); }
      const up = r.chance(); const sorted = [...picked].sort((x, y) => (up ? x - y : y - x));
      const shown = picked.every((h, k) => h === sorted[k]) ? [sorted[1], sorted[2], sorted[0]] : picked;
      const order = (list: number[]) => list.map(show).join(', ');
      return { prompt: `Put ${show(shown[0])}, ${show(shown[1])} and ${show(shown[2])} in order, ${up ? 'smallest' : 'biggest'} first.`, right: order(sorted),
        wrong: [order([...sorted].reverse()), order([sorted[1], sorted[0], sorted[2]])], extra: order([sorted[0], sorted[2], sorted[1]]),
        hint: 'Write each one in hundredths. Then order the counts.', retry: `In hundredths: ${sorted.join(', ')}. So ${order(sorted)}.`, model: grids(...shown) };
    }
    if (kind === 1) {
      const a = r.pick(pool); let b = r.pick(pool); while (b === a) b = r.pick(pool);
      return { prompt: `Which is more: ${show(a)} or ${show(b)}?`, right: show(Math.max(a, b)), wrong: [show(Math.min(a, b)), 'They are equal'], extra: "You can't tell",
        hint: 'Write both in hundredths. Compare the counts, not how long the numbers look.', retry: `${show(a)} is ${a} hundredths and ${show(b)} is ${b} hundredths.`, model: grids(a, b) };
    }
    if (kind === 2) {
      const [who, other] = r.pick([['Mia', 'Leo'], ['Sam', 'Ana'], ['Kim', 'Ben']] as const); const [a, b] = r.pick([[50, 40], [60, 45], [30, 25], [70, 7], [35, 5]] as const);
      const same = r.chance(); const circles: ModelSpec = { kind: 'area', cut: 'circle-tenths', shaded: [], ...(same ? {} : { scale: 0.6 }), more: [{ cut: 'circle-tenths', shaded: [] }] };
      return same
        ? { prompt: `${who} eats ${show(a)} of a pizza. ${other} eats ${show(b)} of the same size pizza. Who eats more?`, right: a > b ? who : other, wrong: [a > b ? other : who, "You can't tell"], extra: 'They eat the same',
          hint: 'The pizzas are the same size. Compare the hundredths.', retry: `${show(a)} is ${a} hundredths and ${show(b)} is ${b} hundredths of the same whole.`, model: circles }
        : { prompt: `${who} eats ${show(a)} of a small pizza. ${other} eats ${show(b)} of a big pizza. Who eats more?`, right: "You can't tell", wrong: [who, other], extra: 'They eat the same',
          hint: 'Are the two pizzas the same size?', retry: 'The wholes are different sizes, so you can only compare parts of the same whole.', model: circles };
    }
    const h = r.pick([35, 45, 25, 75, 62, 48, 40, 60, 30, 90, 70, 20]);
    // Real mistakes: count tenths (6 for 0.6), ×10 (600), read the digits (3 or 5 for 0.35), or count the white squares.
    const slips = h % 10 === 0 ? [h / 10, h * 10, 100 - h] : [Math.floor(h / 10), h % 10, 100 - h, h * 10];
    return fromSlips(`How many hundredths is ${show(h)}?`, String(h), slips.map(String),
      'Two places after the decimal point name hundredths. One tenth is 10 hundredths.', `${show(h)} is ${h} hundredths: ${h} squares of the grid.`, { kind: 'area', cut: 'grid-10x10', shaded: [] });
  },
  'fraction-times-fraction': (r) => {
    const [a, b, c, d] = r.pick(TIMES_GRID);
    const right = f(a * c, b * d);
    // Real mistakes: add across, keep one denominator, add the tops, add the bottoms, or cross-multiply.
    return fromSlips(`${f(a, b)} × ${f(c, d)} = ?`, right, [f(a + c, b + d), f(a * c, d), f(a * c, b), f(a + c, b * d), f(a * c, b + d), f(a * d, b * c)],
      'Rows for one fraction, columns for the other. Count the overlap.',
      `${a} of ${b} rows and ${c} of ${d} columns overlap on ${a * c} of ${b * d} squares: ${right}.`, { kind: 'area', cut: gridCut(d, b), shaded: [] });
  },
  'bigger-or-smaller': (r) => {
    const factors = [[3, 4], [5, 4], [2, 3], [4, 3], [1, 2], [3, 2], [3, 3], [5, 6], [7, 6], [2, 2], [4, 5], [6, 5], [9, 10], [11, 10], [4, 4]] as const;
    const kind = r.int(0, 2);
    if (kind === 2) {
      const n = r.int(4, 12); const more = r.chance();
      const target = r.pick(factors.filter(([t, b]) => (more ? t > b : t < b)));
      const others = factors.filter(([t, b]) => (more ? t <= b : t >= b) && !(t === target[0] && b === target[1]));
      const picked: (readonly [number, number])[] = []; while (picked.length < 3) { const x = r.pick(others); if (!picked.includes(x)) picked.push(x); }
      const say = ([t, b]: readonly [number, number]) => `${t}/${b} × ${n}`;
      // The picture draws the factor of every choice (labelled, in an order that does not follow the answer), so it
      // shows each one against one whole instead of marking the right one alone.
      const shown = [target, ...picked]; const turn = r.int(0, 3);
      const drawn = [...shown.slice(turn), ...shown.slice(0, turn)].map(([t, b]) => ({ numerator: t, denominator: b, named: true }));
      return { prompt: `Which one is ${more ? 'more' : 'less'} than ${n}?`, right: say(target), wrong: [say(picked[0]), say(picked[1])], extra: say(picked[2]),
        hint: 'Compare each fraction with 1.', retry: `${target[0]}/${target[1]} is ${more ? 'more' : 'less'} than 1, so ${say(target)} is ${more ? 'more' : 'less'} than ${n}.`, model: { kind: 'bars', bars: drawn, hideLabels: true } };
    }
    // Sign choices write the whole comparison out, so their amounts stay short (no mixed numbers there).
    const [t, b] = r.pick(factors); const amount = r.pick(kind === 0 ? ['5/6', '3/4', '7/8', '4', '2/3', '9/10', '5', '6'] : ['5/6', '2 1/2', '3/4', '1 1/3', '7/8', '4', '2/3', '3 1/2', '9/10', '5', '1 1/4', '6']);
    const k = t < b ? 'less' : t > b ? 'more' : 'same';
    if (kind === 0) {
      const sign = k === 'less' ? '<' : k === 'more' ? '>' : '=';
      return { prompt: `Without multiplying, compare ${t}/${b} × ${amount} with ${amount}: __ ${amount}.`, right: sign, wrong: ['<', '=', '>'].filter((x) => x !== sign) as [string, string],
        hint: 'Is the fraction less than 1, equal to 1, or more than 1?', retry: `${t}/${b} is ${k === 'same' ? 'equal to' : `${k} than`} 1.`, model: bar(t, b) };
    }
    const words = { less: `Less than ${amount}`, more: `More than ${amount}`, same: `Equal to ${amount}` };
    return { prompt: `Is ${t}/${b} × ${amount} more or less than ${amount}?`, right: words[k], wrong: (['less', 'more', 'same'] as const).filter((x) => x !== k).map((x) => words[x]) as [string, string], extra: "You can't tell",
      hint: 'Is the fraction less than 1, equal to 1, or more than 1?', retry: `${t}/${b} is ${k === 'same' ? 'equal to' : `${k} than`} 1, so the answer is ${words[k].toLowerCase()}.`, model: bar(t, b) };
  },
  'share-or-fit': (r) => {
    const [unit, units, thing, holders, holder] = r.pick([['pound', 'pounds', 'clay', 'bags', 'bag'], ['cup', 'cups', 'rice', 'scoops', 'scoop'], ['liter', 'liters', 'juice', 'bottles', 'bottle']] as const);
    const [b, n] = r.pick([[2, 3], [3, 2], [4, 2], [2, 4], [3, 3], [2, 5], [4, 3], [5, 2]] as const);
    const [d, w] = r.pick([[4, 3], [3, 2], [2, 3], [5, 2], [4, 2], [3, 4], [6, 2], [8, 3]] as const);
    const share = `1/${b} ${unit} of ${thing} is shared by ${n} friends.`; const fit = `How many 1/${d}-${unit} ${holders} can be filled from ${w} ${units} of ${thing}?`;
    // The same frame for both kinds, so the words "shared" and "filled" don't give the answer.
    const shareStory = `Pip has 1/${b} ${unit} of ${thing} for ${n} friends. Each friend gets the same amount.`;
    const fitStory = `Pip has ${w} ${units} of ${thing}. Each ${holder} holds 1/${d} ${unit}.`;
    const kinds = ['Fitting', 'Adding', 'Taking away'];
    switch (r.int(0, 3)) {
      case 0: return { prompt: `${shareStory} Is this sharing or fitting?`, right: 'Sharing', wrong: [kinds[0], kinds[1]], extra: kinds[2], hint: 'Is an amount split into equal shares, or do you count pieces that fit?',
        retry: `The ${thing} is split into ${n} equal shares, so this is sharing.`, model: bar(1, b) };
      case 1: return { prompt: `${fitStory} Is this sharing or fitting?`, right: 'Fitting', wrong: ['Sharing', kinds[1]], extra: kinds[2], hint: 'Is an amount split into equal shares, or do you count pieces that fit?',
        retry: `You count how many 1/${d}-${unit} ${holders} fit, so this is fitting.`, model: wholes(w) };
      // Real mistakes: multiply, flip, add, or forget to split.
      case 2: return fromSlips(`${share} How much does each get?`, `1/${b * n} ${unit}`, [`${n}/${b} ${n > b ? units : unit}`, `${b * n} ${units}`, `1/${b + n} ${unit}`, `1/${b} ${unit}`],
        `Sharing: cut the 1/${b} ${unit} into ${n} equal shares.`, `1/${b} ÷ ${n} = 1/${b * n}. Check: ${n} × 1/${b * n} = 1/${b}.`, bar(1, b));
      // Real mistakes: add, count one whole's pieces, multiply, or count the wholes.
      default: return fromSlips(fit, `${w * d} ${holders}`, [`${w + d} ${holders}`, `${d} ${holders}`, `${w}/${d} ${w < d ? holders.replace(/s$/, '') : holders}`, `${w} ${holders}`],
        `Fitting: how many 1/${d} ${unit} pieces make 1 ${unit}?`, `${w} ÷ 1/${d} = ${w * d}. Check: ${w * d} × 1/${d} = ${w}.`, wholes(w));
    }
  },
  'fraction-probability': (r) => {
    const t = r.pick([4, 5, 6, 8, 10, 12]); const g = r.int(1, t - 1);
    return later(`A bag has ${t} marbles. ${g} ${g === 1 ? 'is' : 'are'} green. What is the chance of picking green?`, f(g, t), [f(g, t - g), f(t - g, t), f(t, g)],
      'The numerator is the number of green marbles. The denominator is the total number of marbles.', `${g} green out of ${t}: ${f(g, t)}.`, set(g, t, t));
  },
  'fraction-of-area': (r) => {
    const d = r.pick([2, ...G3_DENS]); const n = r.int(1, d - 1);
    // A circle, or the other shape the lesson shows with that many equal parts: a square (fourths are often squares and
    // triangles together: equal parts, different shapes) or a hexagon for sixths.
    const other: Record<number, AreaCut> = { 2: 'halves-triangles', 3: 'rect-thirds', 4: 'fourths-mixed', 6: 'hexagon-sixths', 8: 'eighths-triangles' };
    const cut: AreaCut | undefined = r.chance() ? other[d] : circleCut(d);
    const shape = cut === 'hexagon-sixths' ? 'hexagon' : cut?.startsWith('circle') ? 'circle' : cut ? 'square' : 'tile';
    // Real slips: shaded over unshaded, the unshaded parts, and the numbers flipped.
    return later(`What fraction of the ${shape} is shaded?`, f(n, d), [f(n, d - n), f(d - n, d), f(d, n)],
      'Count all the equal parts for the denominator. Count the shaded parts for the numerator.', `${n} of ${d} equal parts: ${f(n, d)}.`, cut ? area(cut, shadedFirst(n)) : bar(n, d));
  },
  'equivalent-number-line': (r) => {
    const [n, d, k] = r.pick(G3_EQUIVALENTS_WIDE);
    if (r.chance()) {
      const [n, d, k] = r.pick(JOINABLE);
      // The other way: join small spaces into bigger ones (equivalent-models taught joining parts).
      return fromSlips(`${f(n * k, d * k)} is marked on a line. Which fraction with a denominator of ${d} is at the same spot?`, f(n, d), joinSlips(n, d, k),
        `Join every ${k} small spaces into 1 space. Count the jumps again.`, `Every ${k} small jumps make 1 jump. ${n * k} small jumps make ${n}, so ${f(n, d)}.`, line(n * k, d * k));
    }
    return later(`${f(n, d)} is marked on a line. Which fraction with a denominator of ${d * k} is at the same spot?`, f(n * k, d * k), [f(n, d * k), f(n + k, d * k), f(n * k + 1, d * k)],
      `Cut every space into ${k}. There are ${k} times as many spaces and jumps.`, `${n} × ${k} = ${n * k}. So ${f(n * k, d * k)}.`, line(n, d));
  },
  'fraction-recipes': (r) => {
    const [n, d] = r.pick(POOL); const batches = r.int(2, 4);
    return later(`A recipe uses ${f(n, d)} cup of flour. How much flour do ${batches} batches need?`, f(n * batches, d), [f(n * batches, d * batches), f(n + batches, d), f(n, d * batches)],
      `Multiply the numerator by ${batches}. The denominator stays.`, `${batches} × ${f(n, d)} = ${f(n * batches, d)}.`, bar(n, d));
  },
  'fractions-to-percent': (r) => {
    const [t, b] = r.pick([...EXACT_PERCENT, ...HUNDREDTHS]); const p = (t * 100) / b;
    return later(`Write ${f(t, b)} as a percent.`, `${p}%`, b === 100 ? [`${100 - t}%`, `${t / 10}%`, `${b}%`] : [`${t}%`, `${b}%`, `${p + 10}%`],
      b === 100 ? 'It is already out of 100. The numerator is the percent.' : `Percent means out of 100. Change ${f(t, b)} to hundredths.`, b === 100 ? `${f(t, b)} means ${t} out of 100: ${p}%.` : `${f(t, b)} = ${f(p, 100)} = ${p}%.`, bar(t, b));
  },
  'percent-to-fraction': (r) => {
    // Every 5 from 5% to 95%, and some percents in between.
    const p = r.chance() ? 5 * r.int(1, 19) : r.pick([1, 2, 8, 12, 18, 24, 33, 37, 42, 48, 56, 64, 71, 81, 99]);
    return later(`Write ${p}% as a fraction.`, f(p, 100), [f(p, 10), f(100, p), f(p, 1000)],
      'Percent means out of 100.', `${p}% means ${p} out of 100: ${f(p, 100)}.`, bar(p, 100));
  },
  'decimal-fraction-equivalence': (r) => {
    const [t, b] = r.pick(EXACT_DECIMAL); const dec = String(t / b);
    return later(`Write ${f(t, b)} as a decimal.`, dec, [...choiceDistractors(dec), `0.${t}${b}`],
      'Change it to tenths or hundredths first.', b === 100 ? `${f(t, b)} = ${dec}.` : `${f(t, b)} = ${f((t * 100) / b, 100)} = ${dec}.`, bar(t, b));
  },
  'multi-step-fraction-stories': (r) => {
    const d = r.pick([4, 5, 6, 8, 10, 12]);
    // A third of the stories take away first, then add (not every story is "add, then take from a whole").
    const jug = r.int(0, 2) === 0; const start = d - 1;
    // The answer is never one of the amounts the story already names, so it is not the only fraction in the prompt.
    let a = r.int(1, d - 2); let b = r.int(1, d - 1 - a);
    for (let tries = 0; tries < 40 && (jug ? [start, a, b].includes(start - a + b) : [a, b].includes(d - a - b)); tries++) { a = r.int(1, d - 2); b = r.int(1, d - 1 - a); }
    if (jug) {
      return later(`A jug has ${f(start, d)} liter. Sam drinks ${f(a, d)} liter, then adds ${f(b, d)} liter. How much is in the jug now?`, f(start - a + b, d),
        [f(start - a, d), f(start + b, d), f(start - a - b, d)], `First take away what Sam drinks. Then add what he pours in.`,
        `${f(start, d)} − ${f(a, d)} = ${f(start - a, d)}. ${f(start - a, d)} + ${f(b, d)} = ${f(start - a + b, d)}.`, bar(start, d));
    }
    const story = r.chance()
      ? `${f(a, d)} of a garden is planted. Then ${f(b, d)} more is planted. How much is still empty?`
      : `Mia reads ${f(a, d)} of a book on Monday and ${f(b, d)} on Tuesday. How much is left to read?`;
    return later(story, f(d - a - b, d), [f(a + b, d), f(d - a, d), f(d - b, d)],
      `First add the two parts. Then take that away from ${f(d, d)}.`, `${f(a, d)} + ${f(b, d)} = ${f(a + b, d)}. ${f(d, d)} − ${f(a + b, d)} = ${f(d - a - b, d)}.`, bar(a + b, d));
  },
  'find-the-whole': (r) => {
    const [n, d] = r.pick(SMALL_POOL); const per = r.int(2, 6); const part = n * per;
    return later(`${part} stickers are ${f(n, d)} of a pack. How many stickers are in the pack?`, String(d * per), [String(part * d), String(part + d), String(per)],
      n === 1 ? `1 part is ${part}. The pack has ${d} parts.` : `${n} parts are ${part}. Find 1 part first.`, `1 part is ${per}. ${d} parts make ${d * per}.`, bar(n, d));
  },
  'spot-the-mistake': (r) => {
    // The wrong answer's denominator (2d) stays a grade 4 one. A difference never equals the amount taken away (that
    // fraction would be written in the prompt, and it is one of the slips).
    const adding = r.chance();
    const d = r.pick(adding ? [3, 4, 5, 6] : [4, 5, 6]); const a = r.int(1, d - 2); let b = r.int(1, d - 1 - a);
    if (!adding && b === a) b = a > 1 ? a - 1 : a + 1;
    return adding
      ? later(`Sam says ${f(a, d)} + ${f(b, d)} = ${f(a + b, d * 2)}. What is the right answer?`, f(a + b, d), [f(a + b, d * 2), f(a * b, d), f(a + b + 1, d)],
        'Same-size parts keep their name. Add only the numerators.', `${a} + ${b} = ${a + b}. So ${f(a + b, d)}.`, bar(a, d))
      : later(`Kim says ${f(a + b, d)} − ${f(b, d)} = ${f(a, d * 2)}. What is the right answer?`, f(a, d), [f(a, d * 2), f(a + 1, d), f(b, d)],
        'Same-size parts keep their name. Take away only the numerators.', `${a + b} − ${b} = ${a}. So ${f(a, d)}.`, bar(a + b, d));
  },
  'fraction-of-remainder': (r) => {
    // The two parts given away add up to less than the whole, so every wrong choice is a real count.
    const [a, b, c, e] = r.pick([[1, 4, 1, 3], [1, 3, 1, 2], [1, 5, 1, 4], [1, 4, 2, 3], [2, 5, 1, 2], [1, 3, 1, 3], [1, 2, 1, 4], [1, 6, 1, 5],
      [1, 2, 1, 3], [1, 3, 1, 4], [1, 4, 1, 2], [1, 5, 1, 3], [1, 6, 1, 2], [2, 5, 1, 3], [1, 3, 2, 5]] as const);
    const total = b * e * r.int(1, 3); const rest = (total / b) * (b - a); const left = (rest / e) * (e - c);
    return later(`Ana has ${total} stickers. She gives away ${f(a, b)} of them. Then she gives away ${f(c, e)} of the rest. How many are left?`,
      String(left), [String(rest), String(total - (total / b) * a - (total / e) * c), String((rest / e) * c)],
      'Find what is left after step 1. Then take a part of that.', `${rest} are left after step 1. ${f(c, e)} of ${rest} is ${(rest / e) * c}. ${rest} − ${(rest / e) * c} = ${left}.`, bar(a, b));
  },
  'estimate-fraction-operations': (r) => {
    const form = r.int(0, 3);
    if (form === 3) {
      // Which of three amounts is closest to 1, 1/2 or 0? The other two are clearly farther away.
      const target = r.pick(['1', '1/2', '0'] as const);
      const d = target === '1/2' ? r.pick([5, 7, 9, 11] as const) : r.pick([5, 6, 8, 9, 10, 12] as const);
      const rightN = target === '1' ? d - 1 : target === '0' ? 1 : (d - 1) / 2 + r.int(0, 1);
      const others = target === '1' ? [Math.floor(d / 2), 1] : target === '0' ? [Math.floor(d / 2), d - 1] : [1, d - 1];
      return { prompt: `Which fraction is closest to ${target}?`, right: f(rightN, d), wrong: [f(others[0], d), f(others[1], d)],
        hint: target === '1/2' ? 'Is it about half of the bar?' : target === '1' ? 'Is it almost a full bar?' : 'Is it almost an empty bar?',
        retry: `${f(rightN, d)} is the closest to ${target}.`, model: { kind: 'bars', bars: [rightN, ...others].map((numerator) => ({ numerator, denominator: d })), hideLabels: true } };
    }
    // Compare a sum (or a difference) with 1 without finding it: the exact answer is never within a tenth of 1.
    const sub = form === 2;
    for (let tries = 0; ; tries++) {
      const [b, e] = [r.pick([2, 3, 4, 5, 6, 8, 10] as const), r.pick([2, 3, 4, 5, 6, 8, 10] as const)];
      const a = r.int(1, b - 1); const c = r.int(1, e - 1);
      const value = sub ? a / b - c / e : a / b + c / e;
      if (sub ? value <= 0.05 : tries < 40 && Math.abs(value - 1) < 0.1) continue;
      const expr = `${f(a, b)} ${sub ? '−' : '+'} ${f(c, e)}`;
      const sign = value > 1 ? '>' : '<';
      // Bare signs: the four full comparisons ("2/3 − 1/2 < 1") are written from them (fourth-choice.ts).
      return { prompt: `Without finding the exact ${sub ? 'difference' : 'sum'}, compare ${expr} with 1: __ 1.`, right: sign, wrong: ['=', sign === '>' ? '<' : '>'],
        hint: `Compare each part with 1/2. Two halves make 1.`, retry: sub ? `Both parts are less than 1, so taking one away leaves less than 1.` : value > 1 ? `${expr} is more than 1.` : `${expr} is less than 1.`,
        model: bars2([a, b], [c, e]) };
    }
  },
  'divide-fractions': (r) => {
    const form = r.int(0, 2);
    if (form === 2) {
      // Same-size parts: how many of the small part fit in the big one? Real slips: the top number, the bottom number, the two multiplied.
      const d = r.pick([6, 8, 10, 12] as const); const p = r.int(2, 3); const m = r.int(2, 4);
      if (p * m < d) {
        return fromSlips(`${f(p * m, d)} ÷ ${f(p, d)} = ?`, String(m), [String(p * m), String(d), String(p * m * d)],
          `Both are ${name(d)}. How many ${f(p, d)} parts fit in ${f(p * m, d)}?`, `${p * m} ÷ ${p} = ${m}, so ${m} parts of ${f(p, d)} fit.`, bar(p * m, d));
      }
    }
    const [a, b] = r.pick([[1, 2], [3, 4], [2, 3], [1, 3], [3, 5], [5, 6], [1, 4], [2, 5], [1, 5], [4, 5], [1, 6], [2, 3]] as const);
    const k = r.pick([2, 3, 4].filter((x) => b * x <= 12)); const e = b * k;
    if (form === 1) {
      return later(`${f(a, b)} ÷ ${f(1, e)} = ?`, String(a * k), [String(e), String(a), String(a * k + 1)],
        `Write ${f(a, b)} in parts of ${f(1, e)}.`, `${f(a, b)} = ${f(a * k, e)}. So ${a * k} parts of ${f(1, e)} fit.`, bar(a, b));
    }
    return later(`How many ${f(1, e)} cup scoops fill ${f(a, b)} cup?`, String(a * k), [String(e), String(a), String(a * k + 1)],
      `Write ${f(a, b)} in parts of ${f(1, e)}.`, `${f(a, b)} = ${f(a * k, e)}. So ${a * k} scoops fit.`, bar(a, b));
  },
};
Object.assign(RECIPES, LATER_RECIPES);

/* ---------- more worksheet rows, with numbers the worksheet's own tables don't reach ---------- */

/** A bar model the way worksheet rows write it. */
const barRow = (n: number, d: number) => ({ kind: 'bar' as const, n, d, wholes: Math.max(1, Math.ceil(n / d)) });
const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, k) => lo + k);
type Unit = { big: string; small: string; per: number; parts: readonly number[]; say: string };
/** "How many minutes are in 3/4 hour?": a fraction of one big unit in small units. `parts` are the denominators that
    give a whole number of small units (and stay in the lesson's grade). */
function unitRow(r: Rng, units: readonly Unit[]): WorksheetProblem {
  const unit = r.pick(units); const d = r.pick(unit.parts); const n = r.int(1, d - 1); const each = unit.per / d;
  return { id: 'wider', prompt: `How many ${unit.small} are in ${f(n, d)} ${unit.big}?`, answer: String(n * each), model: barRow(n, d), modelRequired: true,
    hint: `${unit.say} Split ${unit.per} into ${d} equal groups${n > 1 ? `, then take ${n} of them` : ''}.`,
    explain: n > 1 ? `${unit.per} ÷ ${d} = ${each}. ${n} × ${each} = ${n * each} ${unit.small}.` : `${unit.per} ÷ ${d} = ${each} ${unit.small}.` };
}
const HOUR: Unit = { big: 'hour', small: 'minutes', per: 60, parts: [2, 3, 4, 5, 6, 10, 12], say: 'An hour is 60 minutes.' };
const DAY: Unit = { big: 'day', small: 'hours', per: 24, parts: [2, 3, 4, 6, 8, 12], say: 'A day is 24 hours.' };
const DOLLAR: Unit = { big: 'dollar', small: 'cents', per: 100, parts: [2, 4, 5, 10], say: 'A dollar is 100 cents.' };
const LITER: Unit = { big: 'liter', small: 'milliliters', per: 1000, parts: [2, 4, 5, 10], say: 'A liter is 1000 milliliters.' };
const KILOGRAM: Unit = { big: 'kilogram', small: 'grams', per: 1000, parts: [2, 4, 5, 10], say: 'A kilogram is 1000 grams.' };
const FOOT: Unit = { big: 'foot', small: 'inches', per: 12, parts: [2, 3, 4, 6, 12], say: 'A foot is 12 inches.' };
const POUND: Unit = { big: 'pound', small: 'ounces', per: 16, parts: [2, 4, 8], say: 'A pound is 16 ounces.' };
const METER: Unit = { big: 'meter', small: 'centimeters', per: 100, parts: [2, 4, 5, 10], say: 'A meter is 100 centimeters.' };

/** Lessons whose "New questions" come from worksheet rows: more rows in the same frames, with new numbers in the
    lesson's grade (the worksheet tables hold 24 rows each, which gave only about 20 different questions). */
const WIDER_ROWS: Record<string, (r: Rng) => WorksheetProblem> = {
  'measurement-word-problems': (r) => unitRow(r, [HOUR, DAY, DOLLAR, LITER, KILOGRAM]),
  'fractional-unit-conversions': (r) => unitRow(r, [HOUR, DAY, LITER, KILOGRAM, FOOT, POUND, METER]),
  'whole-numbers-as-fractions': (r) => {
    if (r.int(0, 3) === 0) {
      const wholes = r.int(2, 9);
      return { id: 'wider', prompt: `Write ${wholes} whole bars as a fraction with a denominator of 1.`, answer: f(wholes, 1), model: barRow(wholes, 1), modelRequired: true,
        hint: 'The denominator 1 means each part is one whole.' };
    }
    // A denominator of 1 too: 7/1 is 7 wholes.
    const d = r.pick([1, 2, 3, 4, 6, 8]); const wholes = r.int(2, d === 1 ? 9 : d >= 6 ? 4 : 5);
    return { id: 'wider', prompt: `How many wholes are ${f(wholes * d, d)}?`, answer: String(wholes), model: barRow(wholes * d, d), modelRequired: true,
      hint: d === 1 ? 'The denominator 1 means each part is one whole.' : `${f(d, d)} makes one whole. Count groups of ${f(d, d)}.` };
  },
  'compare-decimals': (r) => {
    // The comparisons that catch the "longer number is bigger" mistake: tenths against hundredths (0.4 or 0.38),
    // the same digits swapped (0.27 or 0.72), and the same tenths with different hundredths (0.34 or 0.38).
    const tenths = r.int(1, 9); const kind = r.int(0, 2);
    let a: number; let b: number;
    if (kind === 0) { a = 10 * tenths; b = 10 * Math.max(0, Math.min(9, tenths + r.pick([-1, 0, 1] as const))) + r.int(1, 9); }
    else if (kind === 1) { const ones = r.pick(range(1, 9).filter((x) => x !== tenths)); a = 10 * tenths + ones; b = 10 * ones + tenths; }
    else { a = 10 * tenths + r.int(1, 9); b = 10 * tenths + r.pick(range(1, 9).filter((x) => x !== a % 10)); }
    if (r.chance()) [a, b] = [b, a];
    const left = String(a / 100); const right = String(b / 100);
    const cut = (h: number) => (h % 10 === 0 ? { numerator: h / 10, denominator: 10 } : { numerator: h, denominator: 100 });
    const top = cut(a);
    return { id: 'wider', prompt: `Compare: ${left} __ ${right}.`, answer: a > b ? '>' : '<', form: 'symbol', model: barRow(top.numerator, top.denominator), modelRequired: true,
      task: { kind: 'copy', n: top.numerator, of: 'top bar' }, picture: { kind: 'bars', bars: [top, cut(b)] },
      hint: `Write both in hundredths: ${left} is ${a} hundredths. How many hundredths is ${right}? Compare the counts, not how long the numbers look.` };
  },
  'multiplication-scaling': (r) => {
    // A factor below 1, equal to 1 or above 1, with a whole it divides evenly.
    const b = r.pick([2, 3, 4, 5, 6] as const); const t = r.int(1, 2 * b - 1);
    const whole = r.pick([6, 8, 10, 12, 15, 16, 18, 20, 24, 30].filter((w) => w % b === 0));
    return { id: 'wider', prompt: `Without multiplying, compare ${f(t, b)} × ${whole} with ${whole}: __ ${whole}.`, answer: t < b ? '<' : t === b ? '=' : '>', form: 'symbol',
      hint: 'A factor below 1 shrinks the amount. A factor of 1 keeps it the same. A factor above 1 grows it.' };
  },
  'two-step-conversions': (r) => {
    // A mixed number of big units changed to small units, then some taken away or added. Answers stay under 1000.
    const [big, small, per, parts, step] = r.pick([['feet', 'inches', 12, [2, 3, 4, 6], 1], ['hours', 'minutes', 60, [2, 3, 4, 5, 6], 5], ['meters', 'centimeters', 100, [2, 4, 5, 10], 10], ['pounds', 'ounces', 16, [2, 4, 8], 1]] as const);
    const b = r.pick(parts); const w = r.int(1, 3); const a = r.int(1, b - 1); const total = w * per + (a * per) / b;
    const take = big === 'hours' || r.chance(); const n = step * r.int(2, Math.floor((per - 1) / step));
    const prompt = big === 'feet' ? `A ribbon is ${w} ${a}/${b} feet long. Pip ${take ? 'cuts off' : 'adds'} ${n} inches. How many inches ${take ? 'are left' : 'long is it now'}?`
      : big === 'hours' ? `A race is ${w} ${a}/${b} hours long. The first part takes ${n} minutes. How many minutes are left?`
      : big === 'meters' ? `A rope is ${w} ${a}/${b} meters long. Pip ${take ? 'cuts off' : 'adds'} ${n} centimeters. How many centimeters ${take ? 'are left' : 'long is it now'}?`
      : `A bag holds ${w} ${a}/${b} pounds of sand. Pip ${take ? 'takes out' : 'adds'} ${n} ounces. How many ounces ${take ? 'are left' : 'are in the bag now'}?`;
    const unit = big === 'feet' ? 'foot' : big.replace(/s$/, '');
    return { id: 'wider', prompt, answer: String(take ? total - n : total + n),
      picture: { kind: 'bars', bars: [...Array.from({ length: w }, () => ({ numerator: b, denominator: b })), { numerator: a, denominator: b }], hideLabels: true },
      hint: `Change ${w} ${a}/${b} ${big} to ${small} first: 1 ${unit} is ${per} ${small}.`,
      explain: `${w} ${a}/${b} ${big} is ${total} ${small}. ${total} ${take ? '−' : '+'} ${n} = ${take ? total - n : total + n}.` };
  },
  'multiply-mixed-numbers': (r) => {
    const da = r.pick([2, 3, 4, 5] as const); const na = da <= 4 ? r.int(1, da - 1) : 1; const wa = r.int(1, 3);
    const db = r.pick([2, 3, 4] as const); const wb = r.int(1, 2);
    const top = (wa * da + na) * (wb * db + 1); const bottom = da * db;
    return { id: 'wider', prompt: `A rectangular garden is ${wa} ${f(na, da)} meters by ${wb} ${f(1, db)} meters. What is its area?`, answer: mixedName(top, bottom),
      form: top % bottom ? 'mixed' : undefined, model: barRow(wa * da + na, da), modelRequired: true,
      picture: gardenModel({ whole: wa, numerator: na, denominator: da }, { whole: wb, numerator: 1, denominator: db }),
      hint: 'Split the rectangle at the whole units. Find the area of each part, then add them.' };
  },
  'unit-fraction-divided-whole': (r) => {
    // 24 small parts at most, so the bar stays readable.
    const part = r.pick([2, 3, 4, 5, 6, 8, 10, 12] as const); const people = r.pick(range(2, 12).filter((c) => c !== 11 && part * c <= 24)); const result = part * people;
    if (r.int(0, 2) === 0) {
      // The first step on its own: how many shares that size fill the whole pan?
      return { id: 'wider', prompt: `${people} children share 1/${part} of a pan. How many shares that size would fill the whole pan?`, answer: String(result), model: barRow(1, part), modelRequired: true,
        hint: `Each 1/${part} is cut into ${people} shares. How many 1/${part} parts fill the pan?`,
        explain: `${part} parts fill the pan, and each one is cut into ${people} shares: ${part} × ${people} = ${result}.` };
    }
    const why = `Check: ${people} × 1/${result} = 1/${part}.`;
    return { id: 'wider', prompt: `${people} children share 1/${part} of a pan. 1/${part} ÷ ${people} = ?`, answer: f(1, result), denominator: result, model: barRow(1, part), modelRequired: true, why,
      explain: `Split the 1/${part} part into ${people} equal parts. ${result} of those small parts fill the whole pan, so the answer is ${f(1, result)}. ${why}`,
      hint: `Split the 1/${part} part into ${people} equal parts. How many of those small parts fill the whole pan?` };
  },
  'unit-fraction-multiples': (r) => {
    const bottom = r.pick([2, 3, 4, 5, 6, 8, 10, 12] as const); const groups = r.int(2, 9);
    return { id: 'wider', prompt: `Write ${groups} × 1/${bottom} as one fraction.`, answer: f(groups, bottom), model: barRow(groups, bottom), modelRequired: true, task: { kind: 'shade', n: groups },
      hint: `Count ${groups} copies of 1/${bottom}. The denominator stays ${bottom}; add the numerators.` };
  },
  'party-portions': (r) => {
    const b = r.pick([3, 4, 5, 6, 8, 10] as const); const a = r.int(2, b - 1); const n = r.int(3, 8);
    const [who, food] = r.pick([['guest', 'pound of pasta'], ['racer', 'cup of juice'], ['friend', 'pound of grapes'], ['runner', 'liter of water']] as const);
    const unit = food.split(' ')[0];
    const each = `Each ${who} gets ${f(a, b)} ${unit}${food.slice(unit.length)}.`;
    const model = { kind: 'bar' as const, n: 0, d: b, wholes: Math.ceil((n * a) / b) };
    if (r.chance() && (n * a) % b !== 0 && n * a > b) {
      return { id: 'wider', prompt: `${each} ${n} ${who}s. The total is between two whole numbers. What is the bigger one?`, answer: String(Math.ceil((n * a) / b)), model,
        hint: `Count all the ${name(b)}: ${n} × ${a}. Then see how many wholes of ${b} ${name(b)} fit.` };
    }
    return { id: 'wider', prompt: `${each} ${n} ${who}s. How many ${unit}s in all?`, answer: f(n * a, b), denominator: b, model,
      hint: `${n} groups of ${a} ${name(b)}. Multiply the numerator by ${n}. The part size stays ${name(b)}.` };
  },
};

// Any lesson still without its own recipe practices worksheet problems as tap questions, taken from its redo sheets
// (new numbers, never the lesson's own sheet, which its lesson questions come from), and half the time from the more
// rows above. Built on first use. Lessons with one kind of sum per row use twelve redo sheets, so every row of their
// number tables comes round.
const SOURCE_SHEETS: Record<string, number> = { 'add-unlike-fractions': 12, 'mixed-unlike-operations': 12 };
for (const topic of MISSIONS.filter((item) => !(item.id in RECIPES))) {
  let pool: ReturnType<typeof getWorksheet> | null = null;
  RECIPES[topic.id] = (r) => {
    // Yes/no rows stay on the worksheet: a tap question needs number answers to make wrong choices from.
    // A row whose answer is a fraction already written in its prompt (a line plot's own marks) is left out: the child could just copy it.
    // A row the child copies onto bars whose amounts are too long to draw would show only empty bars here: the extra
    // sheets leave those out (none are left; row-pictures.test.ts keeps it so for sums and differences).
    const blankCopy = (problem: ReturnType<typeof getWorksheet>[number]) => {
      const picture = problem.task?.kind === 'copy' ? problemPicture(problem) : null;
      return picture?.kind === 'bars' && picture.bars.every((bar) => bar.numerator === 0);
    };
    const copied = (problem: ReturnType<typeof getWorksheet>[number]) => /^\d+\/\d+$/.test(problem.answer.trim()) && !/same as|equal|bigger|smaller|order/.test(problem.prompt)
      && new RegExp(`(?<![\\d/])${problem.answer.trim()}(?![\\d/])`).test(problem.prompt);
    pool ??= Array.from({ length: SOURCE_SHEETS[topic.id] ?? 4 }, (_, k) => k + 1).flatMap((variant) => getWorksheet(topic.id, variant)
      .filter((problem) => problem.form !== 'word' && !copied(problem) && (variant <= 4 || !blankCopy(problem))));
    const wider = WIDER_ROWS[topic.id] as ((r: Rng) => WorksheetProblem) | undefined;
    const problem = wider && r.chance() ? wider(r) : r.pick(pool);
    return {
      prompt: asChoicePrompt(problem.prompt), right: problem.answer, wrong: choiceDistractors(problem.answer),
      hint: problem.hint, retry: problem.explain ?? (problem.why ? `${problem.hint} ${problem.why}` : problem.hint), model: problemPicture(problem),
    };
  };
}

export const EXTRA_PER_LESSON = 12;
export const hasGenerator = (missionId: string) => missionId in RECIPES;

/** Make `count` questions for a lesson from a seed. The same seed always gives the same questions. */
/** Pick where the right answer sits among the three values (smallest, middle or largest) at random, and swap
    a wrong answer for another real slip when needed, so the position never hints at the answer. */
function balanceChoices(item: Item, rng: Rng): Item {
  if (!item.right || item.wrong.some((w) => !w)) return item;
  // Only for "work out the amount" questions: in "Which is closest / bigger…?" a swapped-in slip could also be right.
  if (!/same as/i.test(item.prompt) && /\bwhich\b|closest|closer|bigger|smaller|more than|less than|between/i.test(item.prompt)) return item;
  const target = answerValue(item.right);
  if (!Number.isFinite(target) || !item.wrong.every((w) => Number.isFinite(answerValue(w)))) return item;
  const wantBelow = rng.int(0, 2); // 0: answer smallest, 1: middle, 2: largest
  const wrong = [...item.wrong];
  const candidates = (item.slips ?? distractorCandidates(item.right)).filter((c) => Number.isFinite(answerValue(c)) && answerValue(c) >= 0 && Math.abs(answerValue(c) - target) > 1e-9 && c !== item.extra);
  for (let guard = 0; guard < 2; guard++) {
    const below = wrong.filter((w) => answerValue(w) < target).length;
    if (below === wantBelow) break;
    const needBelow = below < wantBelow;
    const out = wrong.findIndex((w) => (answerValue(w) < target) !== needBelow);
    const other = wrong[1 - out];
    const swap = candidates.find((c) => (answerValue(c) < target) === needBelow && Math.abs(answerValue(c) - answerValue(other)) > 1e-9 && !wrong.includes(c));
    if (!swap) return item;
    wrong[out] = swap;
  }
  return { ...item, wrong: [wrong[0], wrong[1]] };
}

/** Four choices (A–D): add the recipe's own fourth choice, or one made from the question, at `at`. */
function withFourth(item: Item, placed: Pick<PracticeQuestion, 'choices' | 'correctChoice'>, at: number): Pick<PracticeQuestion, 'choices' | 'correctChoice'> {
  const signs = withSignComparisons(item.prompt, placed.choices, placed.correctChoice, at);
  if (signs) return signs;
  const extra = item.extra && !placed.choices.includes(item.extra) ? item.extra : fourthChoice(item.prompt, placed.choices, placed.correctChoice);
  if (!extra) return placed;
  const choices = [...placed.choices];
  choices.splice(at, 0, extra);
  return { choices, correctChoice: placed.correctChoice + (at <= placed.correctChoice ? 1 : 0) };
}

/** Generated sentences use counts like "${n} pieces"; when n is 1 that reads "1 pieces are". Fix it to "1 piece is". */
const COUNT_NOUNS = 'piece|jump|group|part|space|share|slice|cup|step';
/** Whole-number answers: wrong choices from real slips instead of answer ± 1 (see misconceptions.ts). */
const slipChoices = (prompt: string, placed: Pick<PracticeQuestion, 'choices' | 'correctChoice'>): Pick<PracticeQuestion, 'choices' | 'correctChoice'> =>
  ({ choices: preferMisconceptions({ prompt, ...placed }).choices, correctChoice: placed.correctChoice });
/** Lessons that may use only some part names (the generic slips for "What fraction is shaded?" also write fifths,
    sevenths and ninths): a swap that would bring in another denominator is left out, and the recipe's own slips stay. */
const ONLY_PARTS: Record<string, readonly number[]> = { 'fraction-names': TAUGHT_PARTS, 'equal-parts': TAUGHT_PARTS };
const inTaughtParts = (missionId: string, choices: string[]) => {
  const allowed = ONLY_PARTS[missionId];
  return !allowed || choices.every((choice) => [...choice.matchAll(/\/(\d+)\b/g)].every((match) => allowed.includes(Number(match[1]))));
};
const slipChoicesFor = (missionId: string, prompt: string, placed: Pick<PracticeQuestion, 'choices' | 'correctChoice'>) => {
  const slipped = slipChoices(prompt, placed);
  return inTaughtParts(missionId, slipped.choices) ? slipped : placed;
};
const signedOrder = (prompt: string, placed: Pick<PracticeQuestion, 'choices' | 'correctChoice'>) =>
  ({ ...placed, choices: orderedWithSigns(prompt, placed.choices) });
export function oneIsSingular(text: string): string {
  return text
    .replace(new RegExp(`(^|[^\\d/.])1 (${COUNT_NOUNS})s (are|were)\\b`, 'g'), (_m, lead, noun, verb) => `${lead}1 ${noun} ${verb === 'are' ? 'is' : 'was'}`)
    .replace(new RegExp(`(^|[^\\d/.])1 (${COUNT_NOUNS})s\\b`, 'g'), '$11 $2');
}

/** The parts a picture is cut into, written as fractions ("1/5") so the taught-parts check reads them like a sentence. */
const pictureDenominators = (model: ModelSpec): string[] => [...JSON.stringify(model).matchAll(/"denominator":(\d+)/g)].map((match) => `1/${match[1]}`);

export function generateQuestions(missionId: string, baseQuestionIds: string[], seed: number, count: number): PracticeQuestion[] {
  const recipe = RECIPES[missionId];
  if (!recipe) throw new Error(`No question generator for ${missionId}`);
  // Prefer questions new to this set and to the lesson; then one of the lesson's own; a repeat in the set only if a
  // lesson has too few different questions to fill it.
  const lessonQuestions = new Set((MISSIONS.find((mission) => mission.id === missionId)?.questions ?? [])
    .map((question) => `${question.prompt}|${question.choices[question.correctChoice]}`));
  const fresh: Omit<PracticeQuestion, 'id' | 'reviewQuestionId'>[] = []; const fromLesson: typeof fresh = []; const repeats: typeof fresh = [];
  const seen = new Set<string>();
  const order = MISSIONS.map((mission) => mission.id);
  const taught = (d: number) => partTaught(d, order, missionId);
  for (let i = 0; fresh.length < count && i < count * 30; i++) {
    const rng = makeRng(hash(`${missionId}:${seed}:${i}`));
    const item = recipe(rng);
    const key = `${item.prompt}|${item.right}`;
    const placed = {
      prompt: oneIsSingular(item.prompt),
      ...noBeforeYes(signedOrder(item.prompt, slipChoicesFor(missionId, item.prompt, withFourth(item, place(balanceChoices(item, rng), rng.int(0, 2)), rng.int(0, 3))))),
    };
    const model = nameBars(item.model, item.prompt);
    const simplerModel = nameBars(item.simpler ?? withLabels(item.model), item.prompt);
    // No part name before its card (taught-parts.ts): a wrong choice that writes one is swapped for a real slip;
    // a question whose own prompt, right answer, help or picture needs one is left out for another.
    const choices = withoutOverOne(placed.prompt, placed.choices, placed.correctChoice);
    // A picture that draws every fraction the recipe wrote ("closest to 0: 2/7, 4/7, 6/7") also draws the added fourth
    // choice, so no choice is the one without a bar.
    const drawn = withChoiceBars({ choices, model }, [item.right, ...item.wrong]);
    const kept = withTaughtParts({ ...placed, choices, model: drawn.model, simplerModel }, taught);
    if (!kept || !onlyTaught([item.hint, item.retry, ...pictureDenominators(model)], taught)) continue;
    const question = {
      ...placed,
      choices: withUnits(placed.prompt, kept.choices),
      hint: oneIsSingular(item.hint),
      retryFeedback: oneIsSingular(item.retry),
      model: kept.model,
      // Help shows the same picture, now with its labels, so it is about this question.
      simplerModel: kept.simplerModel,
      standards: [...standardsForMission(missionId)],
    };
    (seen.has(key) ? repeats : lessonQuestions.has(`${question.prompt}|${question.choices[question.correctChoice]}`) ? fromLesson : fresh).push(question);
    seen.add(key);
  }
  const out: PracticeQuestion[] = [...fresh, ...fromLesson, ...repeats].slice(0, count).map((question, index) => ({
    ...question,
    id: `${missionId}-g${seed}-${index + 1}`,
    reviewQuestionId: baseQuestionIds[index % baseQuestionIds.length],
  }));
  return out;
}

/** The fixed 12 "Practice more" questions for a lesson (always the same, so practice repeats). */
export function getExtraPractice(missionId: string, baseQuestionIds: string[]): PracticeQuestion[] {
  return generateQuestions(missionId, baseQuestionIds, 0, EXTRA_PER_LESSON).map((q, i) => ({ ...q, id: `${missionId}-x${i + 1}` }));
}

/** A fresh seed for "New questions" and new practice sheets. */
export const freshSeed = () => 1 + Math.floor(Math.random() * 1_000_000_000);
