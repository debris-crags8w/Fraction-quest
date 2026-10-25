import { fourthChoice, noBeforeYes, orderedWithSigns, withSignComparisons } from './fourth-choice';
import { withUnits } from './measure-units';
import { preferMisconceptions, withoutOverOne } from './misconceptions';
import { MISSIONS, nameBars, problemPicture, type ModelSpec, type PracticeQuestion } from './game';
import { G3_EQUIVALENTS_WIDE, answerValue, asChoicePrompt, choiceDistractors, distractorCandidates, equivalentsFor, getWorksheet, gradeFits, parseAnswer } from './learning-content';
import { standardsForMission } from './standard-catalog';
import { circleCut, gridCut, type AreaCut } from './area-shapes';

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

const RECIPES: Record<string, (r: Rng) => Item> = {
  'equal-parts': (r) => {
    // Sometimes a square or circle: equal parts are the same size, not always the same shape.
    if (r.int(0, 2) === 0) {
      const [cut, fair, whole] = r.pick([
        ['fourths-mixed', true, 'square'], ['quarter-and-triangles', false, 'square'], ['fourths-triangles', true, 'square'],
        ['circle-sixths', true, 'pizza'], ['circle-unequal', false, 'pizza'], ['fourths-unequal', false, 'square'], ['hexagon-sixths', true, 'hexagon'],
      ] as const);
      const yes = 'Yes, same-size parts'; const bigger = 'No, some parts are bigger'; const shapes = 'No, the shapes are different';
      return { prompt: `Is this ${whole} cut into equal parts?`, right: fair ? yes : bigger, wrong: fair ? [bigger, shapes] : [yes, shapes], extra: 'Yes, it is cut into parts',
        hint: 'Equal parts are the same size. They do not have to be the same shape.',
        retry: !fair ? 'Compare the sizes: one part is bigger than another, so the parts are not equal.'
          : cut === 'fourths-mixed' ? 'Every part takes up the same amount of space, so the parts are equal, even if their shapes are different.'
          : 'Every part is the same size, so the parts are equal.',
        model: area(cut) };
    }
    // The picture is the puzzle: the strip may be fair, have unequal pieces, or have the wrong number of pieces.
    const d = r.pick([2, 3, 4, 6, 8]); const kind = r.int(0, 2);
    const count = kind === 2 ? d + 1 : d;
    const sizes = Array.from({ length: count }, () => 1);
    if (kind === 1) sizes[r.int(0, count - 1)] = 2.5; // one piece clearly bigger
    const total = sizes.reduce((a, b) => a + b, 0);
    const yes = `Yes, ${d} equal parts`; const unequal = 'No, the parts are unequal'; const tooMany = `No, there are ${d + 1} parts`;
    return { prompt: `Is this strip cut into equal ${name(d)}?`, right: [yes, unequal, tooMany][kind], wrong: [yes, unequal, tooMany].filter((_, i) => i !== kind) as [string, string],
      extra: d === 2 ? 'No, there is 1 part' : `No, there are ${d - 1} parts`,
      hint: `Equal ${name(d)}: exactly ${d} parts, all the same size. Count them, then compare them.`,
      retry: kind === 0 ? `There are ${d} parts and they are all the same size, so they are equal ${name(d)}.` : kind === 1 ? 'One part is bigger than the others, so the parts are not equal.' : `Count again: there are ${d + 1} parts, not ${d}.`,
      model: { kind: 'partition', parts: sizes.map((size) => (size / total) * 100) }, simpler: { kind: 'partition', parts: Array.from({ length: d }, () => 100 / d) } };
  },
  'fraction-names': (r) => {
    const d = r.pick(G3_DENS); const n = r.int(1, d - 1);
    return r.chance()
      ? { prompt: `In ${f(n, d)}, what does the ${d} mean?`, right: `${d} equal parts in all`, wrong: [`${d} parts are shaded`, `${d} wholes`], extra: `${d} parts not shaded`, hint: 'Look at the denominator.', retry: 'The denominator is the number of equal parts in all.', model: bar(n, d) }
      : { prompt: 'What fraction is shaded?', right: f(n, d), wrong: [f(d, n), f(d - n, d)], hint: 'The numerator is the number of parts shaded. The denominator is all the equal parts.', retry: `The denominator is all ${d} parts. The numerator is the ${n} shaded ${n === 1 ? 'part' : 'parts'}.`, model: bar(n, d) };
  },
  'unit-fractions': (r) => {
    if (r.int(0, 2) === 0) {
      if (r.chance()) {
        const d = r.pick([2, 3, 4, 6, 8] as const);
        return { prompt: 'All the slices are the same size. What fraction of the pizza is the shaded slice?', right: f(1, d), wrong: [f(d, 1), f(1, d + 1)],
          hint: 'Count every slice for the denominator.', retry: `${d} same-size slices make the pizza, so 1 slice is 1/${d}.`, model: area(circleCut(d)!, [0]) };
      }
      // Counting pieces is not enough: 2 small triangles make one fourth, not 2/7.
      return { prompt: 'What fraction of the square is shaded?', right: '1/4', wrong: ['2/7', '1/7'],
        hint: 'The parts are not all the same size. Each triangle is half of the small square.', retry: 'The 2 shaded triangles cover the same space as the small square: 1/4 of the square.', model: area('quarter-and-triangles', [1, 2]) };
    }
    const d = r.pick(G3_DENS);
    if (r.chance()) {
      const n = r.int(2, d - 1);
      return { prompt: 'Which is a unit fraction?', right: f(1, d), wrong: [f(n, d), f(d, 1)], hint: 'A unit fraction has a numerator of 1.', retry: `1/${d} counts just 1 equal part.`, model: bar(0, d) };
    }
    return { prompt: `A whole is cut into ${d} equal parts. What is 1 part?`, right: f(1, d), wrong: [f(d, 1), f(1, d - 1)], hint: 'Count all the equal parts. That is the denominator.', retry: `1 of ${d} equal parts is 1/${d}.`, model: bar(1, d) };
  },
  'unit-size': (r) => {
    const [a, b] = r.pick(G3_PAIRS); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${either(r, f(1, a), f(1, b))}?`, right: bigger ? f(1, a) : f(1, b), wrong: [bigger ? f(1, b) : f(1, a), 'They are the same'],
      hint: 'The denominator tells how many equal parts make one whole. More parts means each part is smaller.', retry: `${Name(a)} are bigger than ${name(b)}.`, ...compareBars([1, a], [1, b]) };
  },
  'sets-unit-fractions': (r) => {
    const d = r.int(2, 6); let per = r.int(2, 7); if (per === d) per += 1; const t = d * per;
    return { prompt: `What is ${f(1, d)} of ${t}?`, right: String(per), wrong: [String(d), String(t)], hint: `Make ${d} equal groups. Count 1 group.`, retry: `${t} in ${d} groups is ${per} each.`, model: set(0, t, d) }; // plain dots: the child does the grouping
  },
  'sets-nonunit': (r) => {
    const d = r.int(3, 6); const n = r.int(2, d - 1); const per = r.int(2, 6); const t = d * per;
    return { prompt: `What is ${f(n, d)} of ${t}?`, right: String(n * per), wrong: [String(per), String(t)], hint: `Make ${d} equal groups. Count ${n} of them.`, retry: `${t} in ${d} groups is ${per} each. ${n} groups is ${n * per}.`, model: set(0, t, d) };
  },
  'benchmark-half': (r) => {
    const d = r.pick([4, 6, 8]); let n = r.int(1, d - 1); if (n * 2 === d) n += n > 1 && r.chance() ? -1 : 1;
    const more = n * 2 > d;
    return { prompt: `Is ${f(n, d)} more or less than 1/2?`, right: more ? 'More than 1/2' : 'Less than 1/2', wrong: [more ? 'Less than 1/2' : 'More than 1/2', 'Exactly 1/2'],
      hint: `Half of ${d} is ${d / 2}.`, retry: `Compare ${n} with ${d / 2}.`, model: bars2([n, d], [1, 2]) };
  },
  'benchmarks-zero-one': (r) => {
    // Grade 3 parts with one clear nearest benchmark (1/4 sits halfway between 0 and 1/2).
    const [n, d, right] = r.pick([[1, 6, '0'], [1, 8, '0'], [1, 3, '1/2'], [2, 3, '1/2'], [2, 4, '1/2'], [2, 6, '1/2'], [3, 6, '1/2'], [4, 6, '1/2'],
      [3, 8, '1/2'], [4, 8, '1/2'], [5, 8, '1/2'], [5, 6, '1'], [7, 8, '1']] as const);
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
    return r.chance()
      ? { prompt: `How many equal spaces do you need for ${name(d)}?`, right: String(d), wrong: [String(d - 1), String(d + 1)], hint: 'The denominator tells how many equal spaces go from 0 to 1.', retry: `${d} spaces from 0 to 1.`, model: line(0, 1) } // a plain 0–1 line: the picture must not show the answer
      : d > 2 && r.chance()
        ? (() => { const n = r.int(2, d - 1); return { prompt: `Each jump is 1/${d}. What is ${n} jumps from 0?`, right: f(n, d), wrong: [f(d, n), f(n, d + n)] as [string, string], hint: 'Each jump is the same size. Count the jumps.', retry: `${n} jumps of 1/${d} is ${f(n, d)}.`, model: line(n, d) }; })()
        : { prompt: `0 to 1 has ${d} equal spaces. What is 1 jump?`, right: f(1, d), wrong: [f(d, 1), f(1, d - 1)], hint: 'Count the spaces from 0 to 1.', retry: `${d} jumps make one whole. So 1 jump is 1/${d}.`, model: line(1, d) };
  },
  'number-line-points': (r) => {
    const d = r.pick(G3_DENS); const n = r.int(1, d - 1);
    return { prompt: 'What fraction is at the dot?', right: f(n, d), wrong: [f(d, n), f(n + 1, d)], hint: 'Count the spaces from 0 to 1. Then count jumps to the dot.', retry: `Each jump is 1/${d}. The dot is ${n} jumps from 0.`, model: line(n, d) };
  },
  'number-line-beyond-one': (r) => {
    const d = r.pick([2, ...G3_DENS]); const k = d + r.int(1, Math.max(1, d - 1));
    return { prompt: `Each jump is ${f(1, d)}. What is ${k} jumps from 0?`, right: f(k, d), wrong: [f(d, k), f(k - d, d)], hint: `${d} jumps reach 1. Keep counting.`, retry: `${k} jumps of 1/${d} is ${f(k, d)}.`, model: line(k, d) };
  },
  'compare-same-denominator': (r) => {
    const d = r.pick(G3_DENS); const a = r.int(1, d - 2); const b = r.int(a + 1, d - 1); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${either(r, f(a, d), f(b, d))}?`, right: bigger ? f(b, d) : f(a, d), wrong: [bigger ? f(a, d) : f(b, d), 'They are equal'],
      hint: 'Same size parts. Compare the numerators.', retry: bigger ? `${b} parts is more than ${a}.` : `${a} parts is less than ${b}.`, ...compareBars([a, d], [b, d]) };
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
    return { prompt: `Which is the same as ${f(n, d)}?`, right: f(n * k, d * k), wrong: [f(n, d * k), f(n * k, d)], hint: `Split every part into ${k}.`, retry: `Split every part into ${k}. Now ${n * k} of ${d * k} parts are shaded: ${f(n * k, d * k)}.`, model: bar(n, d) };
  },
  'build-equivalents': (r) => {
    const [n, d, k] = r.pick(equivalentsFor('build-equivalents'));
    return { prompt: `Multiply the numerator and denominator of ${f(n, d)} by ${k}. What do you get?`, right: f(n * k, d * k), wrong: [f(n + k, d + k), f(n * k, d)], hint: 'Do the same thing to the numerator and denominator.', retry: `${n} × ${k} = ${n * k} and ${d} × ${k} = ${d * k}.`, model: bar(n, d) };
  },
  'missing-equivalent': (r) => {
    const [n, d, k] = r.pick(equivalentsFor('missing-equivalent'));
    return { prompt: `Fill the blank: ${f(n, d)} = ?/${d * k}`, right: String(n * k), wrong: [String(n + k), String(n * k + 1)], hint: `What times ${d} makes ${d * k}?`, retry: `The denominator was multiplied by ${k}. So the numerator is ${n} × ${k} = ${n * k}.`, model: bar(n, d) };
  },
  'compose-to-one': (r) => {
    const d = r.pick(DENS); const n = r.int(1, d - 1);
    return { prompt: `Fill the blank: ${f(n, d)} + ? = 1`, right: f(d - n, d), wrong: [f(n, d), f(d - n, d * 2)], hint: `One whole is ${f(d, d)}.`, retry: `${d} − ${n} = ${d - n}. So ${f(d - n, d)}.`, model: bar(n, d) };
  },
  'decompose-fractions': (r) => {
    const d = r.pick([5, 6, 8, 10, 12]); const n = r.int(3, d - 1); const first = r.int(1, n - 2);
    return { prompt: `Which adds up to ${f(n, d)}?`, right: `${f(first, d)} + ${f(n - first, d)}`, wrong: [`${f(first, d)} + ${f(n - first - 1, d)}`, `${f(n, d)} + ${f(n, d)}`], hint: 'Add the numerators. The denominator stays.', retry: `${first} + ${n - first} = ${n}. So ${f(n, d)}.`, model: bar(n, d) };
  },
  'improper-fractions': (r) => {
    const d = r.pick([2, ...G3_DENS]); const left = r.int(1, d - 1);
    return { prompt: `How many ${name(d)} past one whole is ${f(d + left, d)}?`, right: String(left), wrong: [String(d + left), String(d)], hint: `${f(d, d)} is one whole. Count the jumps after it.`, retry: `${f(d + left, d)} is ${f(d, d)} and ${left} more ${left === 1 ? name(d).replace(/s$/, '') : name(d)}.`, model: line(d + left, d) };
  },
  'mixed-improper': (r) => {
    const d = r.pick([2, ...G3_DENS]); const left = r.int(1, d - 1);
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
    return { prompt: `${f(1, a)} + ${f(1, big)} = ?`, right: f(k + 1, big), wrong: [f(2, a + big), f(2, big)], hint: `Change ${f(1, a)} into ${name(big)} first.`, retry: `${f(1, a)} = ${f(k, big)}. ${k} + 1 = ${k + 1}, so ${f(k + 1, big)}.`, model: bars2([1, a], [1, big]) };
  },
  'tenths-decimals': (r) => {
    const n = r.int(1, 9);
    return r.chance()
      ? { prompt: `What fraction is 0.${n}?`, right: f(n, 10), wrong: [f(n, 100), f(1, n === 1 ? 2 : n)], hint: 'The number right after the decimal point is tenths.', retry: `0.${n} means ${n} ${n === 1 ? 'tenth' : 'tenths'}.`, model: { kind: 'decimal', tenths: n, hideLabels: true } }
      : { prompt: `Write ${f(n, 10)} as a decimal.`, right: `0.${n}`, wrong: [`${n}.0`, `0.0${n}`], hint: 'Tenths go right after the decimal point.', retry: `${n} ${n === 1 ? 'tenth is' : 'tenths is'} 0.${n}.`, model: { kind: 'decimal', tenths: n, hideLabels: true } };
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
/** The same amounts with grade 4 denominators: twentieths become hundredths (3/20 → 15/100). */
const EXACT_DECIMAL: [number, number][] = EXACT_PERCENT.map(([t, b]) => (gradeFits('decimal-fraction-equivalence', b) ? [t, b] : [t * (100 / b), 100]));
const later = (prompt: string, right: string, wrong: string[], hint: string, retry: string, model: ModelSpec, simpler?: ModelSpec): Item =>
  ({ prompt, right, wrong: safeWrong(right, wrong), hint, retry, model, simpler });
/** A question whose wrong choices all come from `slips`, its real mistakes: two to start, a third as the fourth choice. */
function fromSlips(prompt: string, right: string, slips: string[], hint: string, retry: string, model: ModelSpec): Item {
  const target = answerValue(right);
  const real = slips.filter((slip, at) => Math.abs(answerValue(slip) - target) > 1e-9
    && slips.findIndex((other) => Math.abs(answerValue(other) - answerValue(slip)) < 1e-9) === at); // one choice per amount
  return { prompt, right, wrong: [real[0], real[1]], extra: real[2], slips: real, hint, retry, model };
}

const LATER_RECIPES: Record<string, (r: Rng) => Item> = {
  'simplify-fractions': (r) => {
    const [n, d, k] = r.pick(equivalentsFor('simplify-fractions'));
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
    const d = r.pick([3, 4, 5, 6, 8]); const w = r.int(2, 4); const b = r.int(2, d - 1); const a = r.int(1, b - 1);
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
    const people = r.pick([2, 3, 4, 5, 6, 8]); let loaves = r.int(1, 5); if (loaves === people) loaves += 1;
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
    const [a, b, c, d] = r.pick([[3, 4, 1, 2], [2, 3, 3, 4], [1, 2, 4, 5], [3, 5, 2, 3], [2, 3, 4, 5], [1, 3, 1, 2], [3, 4, 2, 3], [2, 5, 1, 2], [5, 6, 1, 2], [1, 4, 2, 3],
      [4, 5, 3, 4], [1, 2, 5, 6], [2, 3, 1, 4], [3, 4, 3, 5], [1, 6, 2, 3], [4, 5, 1, 3], [1, 2, 3, 4], [5, 6, 2, 3], [2, 5, 2, 3], [3, 4, 1, 3]] as const);
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
      return { prompt: `Which one is ${more ? 'more' : 'less'} than ${n}?`, right: say(target), wrong: [say(picked[0]), say(picked[1])], extra: say(picked[2]),
        hint: 'Compare each fraction with 1.', retry: `${target[0]}/${target[1]} is ${more ? 'more' : 'less'} than 1, so ${say(target)} is ${more ? 'more' : 'less'} than ${n}.`, model: bar(target[0], target[1]) };
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
    const d = r.pick(G3_DENS); const n = r.int(1, d - 1);
    // Fourths are often squares and triangles together (equal parts, different shapes); else circles when there's one
    // with that many parts, bars otherwise.
    const cut: AreaCut | undefined = d === 4 && r.int(0, 1) ? 'fourths-mixed' : circleCut(d);
    const shape = cut === 'fourths-mixed' ? 'square' : cut ? 'circle' : 'tile';
    // Real slips: shaded over unshaded, the unshaded parts, and the numbers flipped.
    return later(`What fraction of the ${shape} is shaded?`, f(n, d), [f(n, d - n), f(d - n, d), f(d, n)],
      'Count all the equal parts for the denominator. Count the shaded parts for the numerator.', `${n} of ${d} equal parts: ${f(n, d)}.`, cut ? area(cut, shadedFirst(n)) : bar(n, d));
  },
  'equivalent-number-line': (r) => {
    const [n, d, k] = r.pick(G3_EQUIVALENTS_WIDE);
    return later(`${f(n, d)} is marked on a line. Which fraction with a denominator of ${d * k} is at the same spot?`, f(n * k, d * k), [f(n, d * k), f(n + k, d * k), f(n * k + 1, d * k)],
      `Cut every space into ${k}. There are ${k} times as many spaces and jumps.`, `${n} × ${k} = ${n * k}. So ${f(n * k, d * k)}.`, line(n, d));
  },
  'fraction-recipes': (r) => {
    const [n, d] = r.pick(POOL); const batches = r.int(2, 4);
    return later(`A recipe uses ${f(n, d)} cup of flour. How much flour do ${batches} batches need?`, f(n * batches, d), [f(n * batches, d * batches), f(n + batches, d), f(n, d * batches)],
      `Multiply the numerator by ${batches}. The denominator stays.`, `${batches} × ${f(n, d)} = ${f(n * batches, d)}.`, bar(n, d));
  },
  'fractions-to-percent': (r) => {
    const [t, b] = r.pick(EXACT_PERCENT); const p = (t * 100) / b;
    return later(`Write ${f(t, b)} as a percent.`, `${p}%`, [`${t}%`, `${b}%`, `${p + 10}%`],
      b === 100 ? 'It is already out of 100. The numerator is the percent.' : `Percent means out of 100. Change ${f(t, b)} to hundredths.`, b === 100 ? `${f(t, b)} means ${t} out of 100: ${p}%.` : `${f(t, b)} = ${f(p, 100)} = ${p}%.`, bar(t, b));
  },
  'percent-to-fraction': (r) => {
    const p = 5 * r.int(1, 19);
    return later(`Write ${p}% as a fraction.`, f(p, 100), [f(p, 10), f(100, p), f(p, 1000)],
      'Percent means out of 100.', `${p}% means ${p} out of 100: ${f(p, 100)}.`, bar(p, 100));
  },
  'decimal-fraction-equivalence': (r) => {
    const [t, b] = r.pick(EXACT_DECIMAL); const dec = String(t / b);
    return later(`Write ${f(t, b)} as a decimal.`, dec, [...choiceDistractors(dec), `0.${t}${b}`],
      'Change it to tenths or hundredths first.', `${f(t, b)} = ${f((t * 100) / b, 100)} = ${dec}.`, bar(t, b));
  },
  'multi-step-fraction-stories': (r) => {
    const d = r.pick([4, 5, 6, 8, 10, 12]); const a = r.int(1, d - 2); const b = r.int(1, d - 1 - a);
    // A third of the stories take away first, then add (not every story is "add, then take from a whole").
    if (r.int(0, 2) === 0) {
      const start = d - 1;
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
    // The wrong answer's denominator (2d) stays a grade 4 one.
    const d = r.pick([3, 4, 5, 6]); const a = r.int(1, d - 2); const b = r.int(1, d - 1 - a);
    return r.chance()
      ? later(`Sam says ${f(a, d)} + ${f(b, d)} = ${f(a + b, d * 2)}. What is the right answer?`, f(a + b, d), [f(a + b, d * 2), f(a * b, d), f(a + b + 1, d)],
        'Same-size parts keep their name. Add only the numerators.', `${a} + ${b} = ${a + b}. So ${f(a + b, d)}.`, bar(a, d))
      : later(`Kim says ${f(a + b, d)} − ${f(b, d)} = ${f(a, d * 2)}. What is the right answer?`, f(a, d), [f(a, d * 2), f(a + 1, d), f(b, d)],
        'Same-size parts keep their name. Take away only the numerators.', `${a + b} − ${b} = ${a}. So ${f(a, d)}.`, bar(a + b, d));
  },
  'fraction-of-remainder': (r) => {
    const [a, b, c, e] = r.pick([[1, 4, 1, 3], [1, 3, 1, 2], [1, 5, 1, 4], [1, 4, 2, 3], [2, 5, 1, 2], [1, 3, 1, 3], [1, 2, 1, 4], [1, 6, 1, 5]] as const);
    const total = b * e * r.int(1, 3); const rest = (total / b) * (b - a); const left = (rest / e) * (e - c);
    return later(`Ana has ${total} stickers. She gives away ${f(a, b)} of them. Then she gives away ${f(c, e)} of the rest. How many are left?`,
      String(left), [String(rest), String(total - (total / b) * a - (total / e) * c), String((rest / e) * c)],
      'Find what is left after step 1. Then take a part of that.', `${rest} are left after step 1. ${f(c, e)} of ${rest} is ${(rest / e) * c}. ${rest} − ${(rest / e) * c} = ${left}.`, bar(a, b));
  },
  'divide-fractions': (r) => {
    const [a, b] = r.pick([[1, 2], [3, 4], [2, 3], [1, 3], [3, 5], [5, 6], [1, 4], [2, 5]] as const); const k = r.int(2, 3); const e = b * k;
    return later(`How many ${f(1, e)} cup scoops fill ${f(a, b)} cup?`, String(a * k), [String(e), String(a), String(a * k + 1)],
      `Write ${f(a, b)} in parts of ${f(1, e)}.`, `${f(a, b)} = ${f(a * k, e)}. So ${a * k} scoops fit.`, bar(a, b));
  },
};
Object.assign(RECIPES, LATER_RECIPES);

// Any lesson still without its own recipe practices worksheet problems as tap questions, taken from its redo sheets
// (new numbers, never the lesson's own sheet, which its lesson questions come from). Built on first use.
for (const topic of MISSIONS.filter((item) => !(item.id in RECIPES))) {
  let pool: ReturnType<typeof getWorksheet> | null = null;
  RECIPES[topic.id] = (r) => {
    // Yes/no rows stay on the worksheet: a tap question needs number answers to make wrong choices from.
    pool ??= [1, 2, 3, 4].flatMap((variant) => getWorksheet(topic.id, variant)).filter((problem) => problem.form !== 'word');
    const problem = r.pick(pool);
    return {
      prompt: asChoicePrompt(problem.prompt), right: problem.answer, wrong: choiceDistractors(problem.answer),
      hint: problem.hint, retry: problem.why ? `${problem.hint} ${problem.why}` : problem.hint, model: problemPicture(problem),
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
const signedOrder = (prompt: string, placed: Pick<PracticeQuestion, 'choices' | 'correctChoice'>) =>
  ({ ...placed, choices: orderedWithSigns(prompt, placed.choices) });
export function oneIsSingular(text: string): string {
  return text
    .replace(new RegExp(`(^|[^\\d/.])1 (${COUNT_NOUNS})s (are|were)\\b`, 'g'), (_m, lead, noun, verb) => `${lead}1 ${noun} ${verb === 'are' ? 'is' : 'was'}`)
    .replace(new RegExp(`(^|[^\\d/.])1 (${COUNT_NOUNS})s\\b`, 'g'), '$11 $2');
}

export function generateQuestions(missionId: string, baseQuestionIds: string[], seed: number, count: number): PracticeQuestion[] {
  const recipe = RECIPES[missionId];
  if (!recipe) throw new Error(`No question generator for ${missionId}`);
  // Prefer questions new to this set and to the lesson; then one of the lesson's own; a repeat in the set only if a
  // lesson has too few different questions to fill it.
  const lessonQuestions = new Set((MISSIONS.find((mission) => mission.id === missionId)?.questions ?? [])
    .map((question) => `${question.prompt}|${question.choices[question.correctChoice]}`));
  const fresh: Omit<PracticeQuestion, 'id' | 'reviewQuestionId'>[] = []; const fromLesson: typeof fresh = []; const repeats: typeof fresh = [];
  const seen = new Set<string>();
  for (let i = 0; fresh.length < count && i < count * 30; i++) {
    const rng = makeRng(hash(`${missionId}:${seed}:${i}`));
    const item = recipe(rng);
    const key = `${item.prompt}|${item.right}`;
    const placed = {
      prompt: oneIsSingular(item.prompt),
      ...noBeforeYes(signedOrder(item.prompt, slipChoices(item.prompt, withFourth(item, place(balanceChoices(item, rng), rng.int(0, 2)), rng.int(0, 3))))),
    };
    const question = {
      ...placed,
      choices: withUnits(placed.prompt, withoutOverOne(placed.prompt, placed.choices, placed.correctChoice)),
      hint: oneIsSingular(item.hint),
      retryFeedback: oneIsSingular(item.retry),
      model: nameBars(item.model, item.prompt),
      // Help shows the same picture, now with its labels, so it is about this question.
      simplerModel: nameBars(item.simpler ?? withLabels(item.model), item.prompt),
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
