import { MISSIONS, nameBars, problemPicture, type ModelSpec, type PracticeQuestion } from './game';
import { answerValue, asChoicePrompt, choiceDistractors, distractorCandidates, getWorksheet, parseAnswer } from './learning-content';
import { standardsForMission } from './standard-catalog';
import { circleCut, type AreaCut } from './area-shapes';

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
const set = (selected: number, total: number): ModelSpec => ({ kind: 'set', selected, total });
const half = bar(1, 2);
/** Compare pictures: both amounts as same-size wholes, so the child sees why 3/4 is more than 3/8. */
const compareBars = (a: [number, number], b: [number, number]): Pick<Item, 'model' | 'simpler'> =>
  ({ model: bars2(a, b), simpler: withLabels(bars2(a, b)) });
/** Name two fractions in either order, so "the first one" is not always the answer. */
const either = (r: Rng, x: string, y: string) => (r.chance() ? `${x} or ${y}` : `${y} or ${x}`);
const area = (cut: AreaCut, shaded: number[] = []): ModelSpec => ({ kind: 'area', cut, shaded });
const shadedFirst = (n: number) => Array.from({ length: n }, (_, k) => k);
/** Grade 3–4 denominators (no elevenths, thirteenths, fifteenths…). */
const DENS = [3, 4, 5, 6, 8, 10, 12] as const;
const withLabels = (model: ModelSpec): ModelSpec => ('hideLabels' in model ? { ...model, hideLabels: false } : model);

type Item = { prompt: string; right: string; wrong: [string, string]; hint: string; retry: string; model: ModelSpec; simpler?: ModelSpec };

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
      const yes = 'Yes: all the parts are the same size'; const bigger = 'No: some parts are bigger'; const shapes = 'No: the parts are different shapes';
      return { prompt: `Is this ${whole} cut into equal parts?`, right: fair ? yes : bigger, wrong: fair ? [bigger, shapes] : [yes, shapes],
        hint: 'Equal parts are the same size. They do not have to be the same shape.',
        retry: fair ? 'Every part takes up the same amount of space, so the parts are equal, even if their shapes are different.' : 'Compare the sizes: one part is bigger than another, so the parts are not equal.',
        model: area(cut) };
    }
    // The picture is the puzzle: the strip may be fair, have unequal pieces, or have the wrong number of pieces.
    const d = r.pick([2, 3, 4, 5, 6, 8]); const kind = r.int(0, 2);
    const count = kind === 2 ? d + 1 : d;
    const sizes = Array.from({ length: count }, () => 1);
    if (kind === 1) sizes[r.int(0, count - 1)] = 2.5; // one piece clearly bigger
    const total = sizes.reduce((a, b) => a + b, 0);
    const yes = `Yes: ${d} equal pieces`; const unequal = 'No: the pieces are not equal'; const tooMany = `No: there are ${d + 1} pieces`;
    return { prompt: `Is this strip cut into equal ${name(d)}?`, right: [yes, unequal, tooMany][kind], wrong: [yes, unequal, tooMany].filter((_, i) => i !== kind) as [string, string],
      hint: `Equal ${name(d)}: exactly ${d} pieces, all the same size. Count them, then compare them.`,
      retry: kind === 0 ? `There are ${d} pieces and they are all the same size, so they are equal ${name(d)}.` : kind === 1 ? 'One piece is bigger than the others, so the pieces are not equal.' : `Count again: there are ${d + 1} pieces, not ${d}.`,
      model: { kind: 'partition', parts: sizes.map((size) => (size / total) * 100) }, simpler: { kind: 'partition', parts: Array.from({ length: d }, () => 100 / d) } };
  },
  'fraction-names': (r) => {
    const d = r.pick(DENS); const n = r.int(1, d - 1);
    return r.chance()
      ? { prompt: `In ${f(n, d)}, what does the ${d} mean?`, right: `${d} equal parts in the whole`, wrong: [`${d} parts are shaded`, `${d} wholes`], hint: 'Look at the denominator.', retry: 'The denominator is how many equal parts in all.', model: bar(n, d) }
      : { prompt: 'What fraction is shaded?', right: f(n, d), wrong: [f(d, n), f(d - n, d)], hint: 'Numerator: parts shaded. Denominator: all the parts.', retry: `Count all ${d} parts for the denominator. Count the ${n} shaded for the numerator.`, model: bar(n, d) };
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
        hint: 'The pieces are not all the same size. Each triangle is half of the small square.', retry: 'The 2 shaded triangles cover the same space as the small square: 1/4 of the square.', model: area('quarter-and-triangles', [1, 2]) };
    }
    const d = r.pick(DENS);
    return { prompt: `A whole is cut into ${d} equal pieces. What is 1 piece?`, right: f(1, d), wrong: [f(d, 1), f(1, d - 1)], hint: 'A unit fraction has a numerator of 1.', retry: `1 of ${d} equal pieces is 1/${d}.`, model: bar(1, d) };
  },
  'unit-size': (r) => {
    const [a, b] = r.pick([[2, 4], [2, 3], [3, 6], [4, 8], [3, 4], [5, 10], [6, 12], [4, 6], [2, 8], [3, 8], [5, 8], [6, 10]] as const); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${either(r, f(1, a), f(1, b))}?`, right: bigger ? f(1, a) : f(1, b), wrong: [bigger ? f(1, b) : f(1, a), 'They are the same'],
      hint: 'More pieces means smaller pieces.', retry: `${Name(a)} are bigger than ${name(b)}.`, ...compareBars([1, a], [1, b]) };
  },
  'sets-unit-fractions': (r) => {
    const d = r.int(2, 6); let per = r.int(2, 7); if (per === d) per += 1; const t = d * per;
    return { prompt: `What is ${f(1, d)} of ${t}?`, right: String(per), wrong: [String(d), String(t)], hint: `Make ${d} equal groups. Count 1 group.`, retry: `${t} in ${d} groups is ${per} each.`, model: set(0, t) }; // plain dots: the child does the grouping
  },
  'sets-nonunit': (r) => {
    const d = r.int(3, 6); const n = r.int(2, d - 1); const per = r.int(2, 6); const t = d * per;
    return { prompt: `What is ${f(n, d)} of ${t}?`, right: String(n * per), wrong: [String(per), String(t)], hint: `Make ${d} equal groups. Count ${n} of them.`, retry: `${t} in ${d} groups is ${per} each. ${n} groups is ${n * per}.`, model: set(0, t) };
  },
  'benchmark-half': (r) => {
    const d = r.pick([4, 6, 8, 10, 12]); let n = r.int(1, d - 1); if (n * 2 === d) n += n > 1 && r.chance() ? -1 : 1;
    const more = n * 2 > d;
    return { prompt: `Is ${f(n, d)} more or less than 1/2?`, right: more ? 'More than 1/2' : 'Less than 1/2', wrong: [more ? 'Less than 1/2' : 'More than 1/2', 'Exactly 1/2'],
      hint: `Half of ${d} is ${d / 2}.`, retry: `Compare ${n} with ${d / 2}.`, model: bars2([n, d], [1, 2]) };
  },
  'benchmarks-zero-one': (r) => {
    const d = r.pick([6, 8, 10, 12]); const kind = r.int(0, 2);
    const n = kind === 0 ? 1 : kind === 2 ? d - 1 : Math.round(d / 2);
    const right = ['0', '1/2', '1'][kind];
    return { prompt: `Is ${f(n, d)} closest to 0, 1/2 or 1?`, right, wrong: ['0', '1/2', '1'].filter((x) => x !== right) as [string, string],
      hint: 'Is it tiny, about half, or almost full?', retry: `${f(n, d)} is closest to ${right}.`, model: bar(n, d) };
  },
  'fraction-magnitude': (r) => {
    const d = r.pick([5, 6, 7, 8, 9, 10, 12]); const n = d % 2 ? (d - 1) / 2 + r.int(0, 1) : d / 2 + (r.chance() ? 1 : -1);
    // Far from half: tiny amounts and nearly-whole amounts. Both wrong ones can be on the same side, so the
    // answer is not always the middle-sized choice.
    const smalls = [f(1, 8), f(1, 10), f(1, 12), f(2, 12)]; const bigs = [f(7, 8), f(9, 10), f(11, 12), f(10, 12)];
    const mode = r.int(0, 2); const lo = r.pick(smalls); const hi = r.pick(bigs);
    const pair: [string, string] = mode === 0 ? [lo, r.pick(smalls.filter((x) => x !== lo))] : mode === 1 ? [hi, r.pick(bigs.filter((x) => x !== hi))] : [lo, hi];
    return { prompt: 'Which is closest to 1/2?', right: f(n, d), wrong: pair, hint: 'Find the one about halfway.', retry: `${f(n, d)} is just around half.`, model: half };
  },
  'number-line-basics': (r) => {
    const d = r.int(3, 10);
    return r.chance()
      ? { prompt: `How many equal spaces do you need for ${name(d)}?`, right: String(d), wrong: [String(d - 1), String(d + 1)], hint: `${Name(d)} means ${d} equal spaces from 0 to 1.`, retry: `${d} spaces from 0 to 1.`, model: line(0, 1) } // a plain 0–1 line: the picture must not show the answer
      : { prompt: `0 to 1 has ${d} equal spaces. What is 1 jump?`, right: f(1, d), wrong: [f(d, 1), f(1, d - 1)], hint: 'Count the spaces from 0 to 1.', retry: `${d} jumps make 1 whole. So 1 jump is 1/${d}.`, model: line(1, d) };
  },
  'number-line-points': (r) => {
    const d = r.int(3, 10); const n = r.int(1, d - 1);
    return { prompt: 'What fraction is at the dot?', right: f(n, d), wrong: [f(d, n), f(n + 1, d)], hint: 'Count the spaces from 0 to 1. Then count jumps to the dot.', retry: `Each jump is 1/${d}. The dot is ${n} jumps from 0.`, model: line(n, d) };
  },
  'number-line-beyond-one': (r) => {
    const d = r.int(2, 6); const k = d + r.int(1, Math.max(1, d - 1));
    return { prompt: `Each jump is ${f(1, d)}. What is ${k} jumps from 0?`, right: f(k, d), wrong: [f(d, k), f(k - d, d)], hint: `${d} jumps reach 1. Keep counting.`, retry: `${k} jumps of 1/${d} is ${f(k, d)}.`, model: line(k, d) };
  },
  'compare-same-denominator': (r) => {
    const d = r.pick(DENS); const a = r.int(1, d - 2); const b = r.int(a + 1, d - 1); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${either(r, f(a, d), f(b, d))}?`, right: bigger ? f(b, d) : f(a, d), wrong: [bigger ? f(a, d) : f(b, d), 'They are equal'],
      hint: 'Same size pieces. Compare the numerators.', retry: `${b} pieces is more than ${a}.`, ...compareBars([a, d], [b, d]) };
  },
  'compare-same-numerator': (r) => {
    const [a, b] = r.pick([[3, 6], [4, 8], [3, 4], [4, 6], [5, 10], [6, 12], [3, 8], [4, 10], [5, 8], [3, 5], [6, 8], [4, 5]] as const); const n = r.int(1, Math.min(4, a - 1)); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${either(r, f(n, a), f(n, b))}?`, right: bigger ? f(n, a) : f(n, b), wrong: [bigger ? f(n, b) : f(n, a), 'They are equal'],
      hint: `Same numerator: ${n} part${n === 1 ? '' : 's'} each. Which parts are bigger?`, retry: `${Name(a)} are bigger pieces than ${name(b)}, so ${n} ${name(a)} is more than ${n} ${name(b)}.`, ...compareBars([n, a], [n, b]) };
  },
  'order-fractions': (r) => {
    const d = r.pick([5, 6, 8, 10, 12]); const a = r.int(1, d - 3); const b = r.int(a + 1, d - 2); const c = r.int(b + 1, d - 1);
    const up = r.chance();
    const small = `${f(a, d)}, ${f(b, d)}, ${f(c, d)}`; const big = `${f(c, d)}, ${f(b, d)}, ${f(a, d)}`; const mixed = `${f(b, d)}, ${f(a, d)}, ${f(c, d)}`;
    return { prompt: `Put ${mixed} in order, ${up ? 'smallest' : 'biggest'} first.`, right: up ? small : big, wrong: [up ? big : small, mixed],
      hint: 'Same size pieces. Order the numerators.', retry: up ? `${a}, then ${b}, then ${c}.` : `${c}, then ${b}, then ${a}.`, model: bars2([a, d], [c, d]) };
  },
  'equivalent-models': (r) => {
    const d = r.int(2, 6); const n = r.int(1, d - 1); const k = d === 5 ? r.pick([2, 4]) : r.int(2, 4); // no fifteenths
    return { prompt: `Which is the same as ${f(n, d)}?`, right: f(n * k, d * k), wrong: [f(n, d * k), f(n * k, d)], hint: `Split every piece into ${k}.`, retry: `Multiply the numerator and denominator by ${k}: ${f(n * k, d * k)}.`, model: bar(n, d) };
  },
  'build-equivalents': (r) => {
    const d = r.int(2, 6); const n = r.int(1, d - 1); const k = d === 5 ? r.pick([2, 4]) : r.int(2, 4); // no fifteenths
    return { prompt: `Multiply the numerator and denominator of ${f(n, d)} by ${k}. What do you get?`, right: f(n * k, d * k), wrong: [f(n + k, d + k), f(n * k, d)], hint: 'Do the same thing to the numerator and denominator.', retry: `${n} × ${k} = ${n * k} and ${d} × ${k} = ${d * k}.`, model: bar(n, d) };
  },
  'missing-equivalent': (r) => {
    const d = r.int(2, 6); const n = r.int(1, d - 1); const k = d === 5 ? r.pick([2, 4]) : r.int(2, 4); // no fifteenths
    return { prompt: `Fill the blank: ${f(n, d)} = ?/${d * k}`, right: String(n * k), wrong: [String(n + k), String(n * k + 1)], hint: `What times ${d} makes ${d * k}?`, retry: `The denominator was times ${k}. So the numerator is ${n} × ${k} = ${n * k}.`, model: bar(n, d) };
  },
  'compose-to-one': (r) => {
    const d = r.pick(DENS); const n = r.int(1, d - 1);
    return { prompt: `Fill the blank: ${f(n, d)} + ? = 1`, right: f(d - n, d), wrong: [f(n, d), f(d - n, d * 2)], hint: `1 whole is ${f(d, d)}.`, retry: `${d} − ${n} = ${d - n}. So ${f(d - n, d)}.`, model: bar(n, d) };
  },
  'decompose-fractions': (r) => {
    const d = r.pick([5, 6, 8, 10, 12]); const n = r.int(3, d - 1); const first = r.int(1, n - 2);
    return { prompt: `Which adds up to ${f(n, d)}?`, right: `${f(first, d)} + ${f(n - first, d)}`, wrong: [`${f(first, d)} + ${f(n - first - 1, d)}`, `${f(n, d)} + ${f(n, d)}`], hint: 'Add the numerators. The denominator stays.', retry: `${first} + ${n - first} = ${n}. So ${f(n, d)}.`, model: bar(n, d) };
  },
  'improper-fractions': (r) => {
    const d = r.int(2, 8); const left = r.int(1, d - 1);
    return { prompt: `What is ${f(d + left, d)} as wholes and a fraction?`, right: `1 and ${f(left, d)}`, wrong: [`2 and ${f(left, d)}`, f(left, d)], hint: `${f(d, d)} is 1 whole.`, retry: `${f(d + left, d)} is ${f(d, d)} and ${f(left, d)}.`, model: line(d + left, d) };
  },
  'mixed-improper': (r) => {
    const d = r.int(2, 8); const left = r.int(1, d - 1);
    return { prompt: `What is 1 and ${f(left, d)} as ${name(d)}?`, right: f(d + left, d), wrong: [f(left, d), f(1 + left, d)], hint: `1 whole is ${f(d, d)}.`, retry: `${f(d, d)} + ${f(left, d)} = ${f(d + left, d)}.`, model: line(d + left, d) };
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
      ? { prompt: `What fraction is 0.${n}?`, right: f(n, 10), wrong: [f(n, 100), f(1, n === 1 ? 2 : n)], hint: 'The number right after the dot is tenths.', retry: `0.${n} means ${n} tenths.`, model: { kind: 'decimal', tenths: n, hideLabels: true } }
      : { prompt: `Write ${f(n, 10)} as a decimal.`, right: `0.${n}`, wrong: [`${n}.0`, `0.0${n}`], hint: 'Tenths go right after the dot.', retry: `${n} tenths is 0.${n}.`, model: { kind: 'decimal', tenths: n, hideLabels: true } };
  },
  'add-tenths-hundredths': (r) => {
    const a = r.int(1, 8); const b = r.int(1, Math.min(49, 99 - 10 * a)); const sum = 10 * a + b;
    return r.chance()
      ? { prompt: `${f(a, 10)} + ${f(b, 100)} = ?`, right: f(sum, 100), wrong: [f(a + b, 110), f(a + b, 100)], hint: `Change ${f(a, 10)} into hundredths first.`, retry: `${f(a, 10)} = ${f(10 * a, 100)}. ${10 * a} + ${b} = ${sum}. So ${f(sum, 100)}.`, model: bars2([a, 10], [b, 100]) }
      : { prompt: `Write ${f(a, 10)} + ${f(b, 100)} as a decimal.`, right: (sum / 100).toFixed(2), wrong: [((a + b) / 100).toFixed(2), (sum / 10).toFixed(1)], hint: 'Change the tenths to hundredths, add, then write 2 places after the dot.', retry: `${f(10 * a, 100)} + ${f(b, 100)} = ${f(sum, 100)} = ${(sum / 100).toFixed(2)}.`, model: bars2([a, 10], [b, 100]) };
  },
  'hundredths-decimals': (r) => {
    const n = r.int(1, 99); const dec = (n / 100).toFixed(2);
    return r.chance()
      ? { prompt: `What fraction is ${dec}?`, right: f(n, 100), wrong: [f(n, 10), f(1, n === 1 ? 2 : n)], hint: '2 places after the dot means hundredths.', retry: `${dec} means ${n} hundredths.`, model: bar(n, 100) }
      : { prompt: `Write ${f(n, 100)} as a decimal.`, right: dec, wrong: [(n / 10).toFixed(1), `${n}.0`], hint: 'Hundredths need 2 places after the dot.', retry: `${n} hundredths is ${dec}.`, model: bar(n, 100) };
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
const EXACT_PERCENT: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [1, 10], [3, 10], [7, 10], [9, 10], [1, 20], [3, 20], [1, 25]];
const later = (prompt: string, right: string, wrong: string[], hint: string, retry: string, model: ModelSpec, simpler?: ModelSpec): Item =>
  ({ prompt, right, wrong: safeWrong(right, wrong), hint, retry, model, simpler });

const LATER_RECIPES: Record<string, (r: Rng) => Item> = {
  'simplify-fractions': (r) => {
    const [n, d] = r.pick(POOL); const k = r.int(2, d <= 6 ? 4 : 3);
    return later(`Write ${f(n * k, d * k)} in simplest form.`, f(n, d), [f(n, d * k), f(n * k, d), f(n + 1, d)],
      'Divide the numerator and denominator by the same number.', `Divide both by ${k}: ${f(n, d)}.`, bar(n * k, d * k));
  },
  'equivalent-missing-both': (r) => {
    const [n, d] = r.pick(SMALL_POOL); const k = r.int(2, 4);
    return r.chance()
      ? later(`Fill the blank: ${f(n, d)} = ?/${d * k}`, String(n * k), [String(n + k), String(n * k + 1), String(n * k - 1)],
        `The bottom was multiplied by ${k}.`, `${n} × ${k} = ${n * k}.`, bar(n, d))
      : later(`Fill the blank: ${f(n, d)} = ${n * k}/?`, String(d * k), [String(d + k), String(d * k + 1), String(d * k - 1)],
        `The top was multiplied by ${k}.`, `${d} × ${k} = ${d * k}.`, bar(n, d));
  },
  'compare-unlike-fractions': (r) => {
    // About 1 in 4 pairs share a numerator (3/4 vs 3/8), so that strategy keeps coming back.
    if (r.int(0, 3) === 0) {
      const [d1, d2] = r.pick([[3, 5], [4, 6], [4, 10], [5, 8], [3, 8], [6, 10], [5, 12], [8, 12]] as const); const n = r.int(2, d1 - 1);
      const big: [number, number] = [n, d1]; const small: [number, number] = [n, d2]; const [x, y] = r.chance() ? [big, small] : [small, big];
      return later(`Which is bigger, ${f(x[0], x[1])} or ${f(y[0], y[1])}?`, f(n, d1), [f(n, d2), 'They are equal'],
        `Same numerator: ${n} parts each. Fewer equal parts in the whole means bigger parts.`, `${Name(d1)} are bigger than ${name(d2)}, so ${f(n, d1)} is bigger.`, compareBars(x, y).model, compareBars(x, y).simpler);
    }
    if (r.int(0, 5) === 0) {
      const [n, d] = r.pick(POOL.filter(([, den]) => den <= 6)); const k = r.int(2, 3);
      const [x, y]: [number, number][] = r.chance() ? [[n, d], [n * k, d * k]] : [[n * k, d * k], [n, d]];
      return later(`Which is bigger, ${f(x[0], x[1])} or ${f(y[0], y[1])}?`, 'They are equal', [f(x[0], x[1]), f(y[0], y[1])],
        'Give both the same denominator. Then compare the numerators.', `${f(n, d)} = ${f(n * k, d * k)}: the same amount.`, compareBars(x, y).model, compareBars(x, y).simpler);
    }
    const a = r.pick(POOL); let b = r.pick(POOL);
    while (b[1] === a[1] || a[0] * b[1] === b[0] * a[1]) b = r.pick(POOL);
    const bigger = a[0] * b[1] > b[0] * a[1] ? a : b; const smaller = bigger === a ? b : a; const m = (a[1] * b[1]) / gcd(a[1], b[1]);
    return later(`Which is bigger, ${f(a[0], a[1])} or ${f(b[0], b[1])}?`, f(bigger[0], bigger[1]), [f(smaller[0], smaller[1]), 'They are equal'],
      'Give both the same denominator. Then compare the numerators.', `${f(a[0], a[1])} = ${f(a[0] * (m / a[1]), m)} and ${f(b[0], b[1])} = ${f(b[0] * (m / b[1]), m)}.`, compareBars(a, b).model, compareBars(a, b).simpler);
  },
  'order-unlike-fractions': (r) => {
    const picked: [number, number][] = [];
    while (picked.length < 3) { const c = r.pick(POOL); if (!picked.some(([t, b]) => t * c[1] === c[0] * b)) picked.push(c); }
    const up = r.chance(); const sorted = picked.slice().sort((x, y) => (x[0] * y[1] - y[0] * x[1]) * (up ? 1 : -1));
    const name = (list: [number, number][]) => list.map(([t, b]) => f(t, b)).join(', ');
    const shown = name(picked) === name(sorted) || name(picked) === name(sorted.slice().reverse()) ? [sorted[1], sorted[0], sorted[2]] : picked;
    return later(`Put ${name(shown)} in order, ${up ? 'smallest' : 'biggest'} first.`, name(sorted), [name(sorted.slice().reverse()), name(shown)],
      'Compare each one to 1/2, or give them all the same denominator.', `${up ? 'Smallest' : 'Biggest'} first: ${name(sorted)}.`, bar(sorted[0][0], sorted[0][1]));
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
      `Add the pieces: ${a} + ${b}. ${d} pieces make a new whole.`, `${a} + ${b} = ${a + b} pieces. So ${mixedName(w * d + a + b, d)}.`, bar(a, d));
  },
  'subtract-mixed-numbers': (r) => {
    const d = r.pick([3, 4, 5, 6, 8]); const w = r.int(2, 4); const b = r.int(2, d - 1); const a = r.int(1, b - 1);
    const top = w * d + a - (d + b);
    return later(`${w} ${f(a, d)} − 1 ${f(b, d)} = ?`, mixedName(top, d), [`${w - 1} ${b - a}/${d}`, mixedName(top + d, d), mixedName(top + 1, d)],
      `${a} pieces are not enough to take away ${b}. Trade 1 whole for ${f(d, d)}.`, `${w} ${f(a, d)} = ${w - 1} ${f(d + a, d)}. Take away 1 ${f(b, d)}: ${mixedName(top, d)}.`, bar(a, d));
  },
  'fraction-of-quantity': (r) => {
    const d = r.pick([2, 3, 4, 5, 6, 8, 10]); const n = r.int(1, d - 1); const per = r.int(2, 9); const t = d * per;
    return later(`What is ${f(n, d)} of ${t}?`, String(n * per), [String(per), String(t - n * per), String(n * per + per)],
      `Make ${d} equal groups. Count ${n} of them.`, `${t} in ${d} groups is ${per} each. ${n} groups is ${n * per}.`, bar(n, d));
  },
  'fraction-of-collection': (r) => {
    const d = r.pick([2, 3, 4, 5, 6]); const n = r.int(1, d - 1); const per = r.int(2, 5); const t = d * per;
    return later(`What is ${f(n, d)} of ${t} cards?`, String(n * per), [String(per), String(t - n * per), String(n * per + 1)],
      `Make ${d} equal groups. Count ${n} of them.`, `${t} in ${d} groups is ${per} each. ${n} groups is ${n * per}.`, set(0, t));
  },
  'multiply-whole-by-fraction': (r) => {
    const [n, d] = r.pick(POOL); const m = r.int(2, 6);
    return later(`${m} × ${f(n, d)} = ?`, f(m * n, d), [f(m * n, m * d), f(n, m * d), f(m + n, d)],
      'Multiply the numerator. The denominator stays.', `${m} groups of ${f(n, d)} is ${f(m * n, d)}.`, bar(n, d));
  },
  'multiply-fractions': (r) => {
    const [a, b] = r.pick(SMALL_POOL); const [n, d] = r.pick(SMALL_POOL);
    return later(`What is ${f(a, b)} of ${f(n, d)}?`, f(a * n, b * d), [f(a + n, b + d), f(a * n, b + d), f(a * d, b * n)],
      'Multiply the numerators. Multiply the denominators.', `${a} × ${n} = ${a * n} and ${b} × ${d} = ${b * d}.`, bar(n, d));
  },
  'divide-whole-by-unit-fraction': (r) => {
    const d = r.int(2, 10); const c = r.int(1, 5);
    return later(`How many 1/${d} cup scoops fill ${c} ${c === 1 ? 'cup' : 'cups'}?`, String(c * d), [String(c + d), String(d), String(c * d + d)],
      `${d} scoops of 1/${d} fill 1 cup.`, `${c} × ${d} = ${c * d} scoops.`, bar(1, d));
  },
  'fraction-of-length': (r) => {
    const d = r.pick([2, 3, 4, 5, 8, 10]); const n = r.int(1, d - 1); const m = r.int(2, 6); const len = d * m;
    return later(`A ribbon is ${len} m long. How long is ${f(n, d)} of it?`, `${n * m} m`, [`${m} m`, `${len - n * m} m`, `${n * m + m} m`],
      `Cut ${len} m into ${d} equal parts. Count ${n}.`, `Each part is ${m} m. ${n} parts is ${n * m} m.`, line(n, d));
  },
  'fractional-measure-addition': (r) => {
    const b = r.pick([2, 3, 4, 5, 6]); const k = r.pick([2, 3, 4].filter((x) => b * x <= 12)); const e = b * k;
    const a = r.int(1, b - 1); const c = r.int(1, e - 1);
    return later(`A board is ${f(a, b)} m. Another is ${f(c, e)} m. How long are they together?`, f(a * k + c, e), [f(a + c, b + e), f(a + c, e), f(a * k + c + 1, e)],
      `Change ${f(a, b)} into ${name(e)} first.`, `${f(a, b)} = ${f(a * k, e)}. ${a * k} + ${c} = ${a * k + c}.`, bars2([a, b], [c, e]));
  },
  'fractional-sharing': (r) => {
    const people = r.int(2, 8); let loaves = r.int(1, 5); if (loaves === people) loaves += 1;
    return later(`${loaves} ${loaves === 1 ? 'loaf is' : 'loaves are'} shared fairly by ${people} friends. How much does each friend get?`, f(loaves, people), [f(people, loaves), f(1, people), f(loaves, people + loaves)],
      `Cut each loaf into ${people} pieces. Each friend gets 1 piece of every loaf.`, `${loaves} ÷ ${people} = ${f(loaves, people)}.`, wholes(loaves));
  },
  'fraction-as-division': (r) => {
    const b = r.int(2, 8); let a = r.int(1, 9); if (a % b === 0) a += 1;
    return later(r.chance() ? `${a} ÷ ${b} = ?` : `${a} ${a === 1 ? 'pizza is' : 'pizzas are'} shared fairly by ${b} friends. How much does each friend get?`, f(a, b), [f(b, a), f(1, b), f(a, a + b)],
      `${a} ÷ ${b} is the fraction ${f(a, b)}.`, `Each friend gets ${f(a, b)}${a > b ? `, or ${mixedName(a, b)}` : ''}.`, wholes(a));
  },
  'fraction-probability': (r) => {
    const t = r.pick([4, 5, 6, 8, 10, 12]); const g = r.int(1, t - 1);
    return later(`A bag has ${t} marbles. ${g} ${g === 1 ? 'is' : 'are'} green. What is the chance of picking green?`, f(g, t), [f(g, t - g), f(t - g, t), f(t, g)],
      'Numerator: green marbles. Denominator: all the marbles.', `${g} green out of ${t}: ${f(g, t)}.`, set(g, t));
  },
  'fraction-of-area': (r) => {
    const d = r.pick([3, 4, 5, 6, 8, 10, 12]); const n = r.int(1, d - 1);
    // Circles and the 3-by-4 grid when there's one with that many parts; bars otherwise.
    const cut = circleCut(d) ?? (d === 12 ? 'grid-3x4' : undefined);
    const shape = !cut ? 'tile' : cut === 'grid-3x4' ? 'grid' : 'circle';
    return later(`What fraction of the ${shape} is shaded?`, f(n, d), [f(d - n, d), f(n, d + 1), f(d, n)],
      'Count all the equal parts for the denominator. Count the shaded parts for the numerator.', `${n} of ${d} equal parts: ${f(n, d)}.`, cut ? area(cut, shadedFirst(n)) : bar(n, d));
  },
  'equivalent-number-line': (r) => {
    const [n, d] = r.pick(SMALL_POOL); const k = r.int(2, 3);
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
      `Percent means out of 100. Change ${f(t, b)} to hundredths.`, `${f(t, b)} = ${f(p, 100)} = ${p}%.`, bar(t, b));
  },
  'percent-to-fraction': (r) => {
    const p = 5 * r.int(1, 19);
    return later(`Write ${p}% as a fraction.`, f(p, 100), [f(p, 10), f(100, p), f(p, 1000)],
      'Percent means out of 100.', `${p}% means ${p} out of 100: ${f(p, 100)}.`, bar(p, 100));
  },
  'decimal-fraction-equivalence': (r) => {
    const [t, b] = r.pick(EXACT_PERCENT); const dec = String(t / b);
    return later(`Write ${f(t, b)} as a decimal.`, dec, [...choiceDistractors(dec), `0.${t}${b}`],
      'Change it to tenths or hundredths first.', `${f(t, b)} = ${f((t * 100) / b, 100)} = ${dec}.`, bar(t, b));
  },
  'multi-step-fraction-stories': (r) => {
    const d = r.pick([4, 5, 6, 8, 10, 12]); const a = r.int(1, d - 2); const b = r.int(1, d - 1 - a);
    const story = r.chance()
      ? `${f(a, d)} of a garden is planted. Then ${f(b, d)} more is planted. How much is still empty?`
      : `Mia reads ${f(a, d)} of a book on Monday and ${f(b, d)} on Tuesday. How much is left to read?`;
    return later(story, f(d - a - b, d), [f(a + b, d), f(d - a, d), f(d - b, d)],
      `First add the two parts. Then take that away from ${f(d, d)}.`, `${f(a, d)} + ${f(b, d)} = ${f(a + b, d)}. ${f(d, d)} − ${f(a + b, d)} = ${f(d - a - b, d)}.`, bar(a + b, d));
  },
};
Object.assign(RECIPES, LATER_RECIPES);

// Any lesson still without its own recipe practices its worksheet problems as tap questions.
for (const topic of MISSIONS.filter((item) => !(item.id in RECIPES))) {
  const worksheet = getWorksheet(topic.id);
  RECIPES[topic.id] = (r) => {
    const problem = r.pick(worksheet);
    return {
      prompt: asChoicePrompt(problem.prompt), right: problem.answer, wrong: choiceDistractors(problem.answer),
      hint: problem.hint, retry: problem.hint, model: problemPicture(problem),
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
  const candidates = distractorCandidates(item.right).filter((c) => Number.isFinite(answerValue(c)) && answerValue(c) >= 0 && Math.abs(answerValue(c) - target) > 1e-9);
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

export function generateQuestions(missionId: string, baseQuestionIds: string[], seed: number, count: number): PracticeQuestion[] {
  const recipe = RECIPES[missionId];
  if (!recipe) throw new Error(`No question generator for ${missionId}`);
  const out: PracticeQuestion[] = [];
  const seen = new Set<string>();
  for (let i = 0; out.length < count && i < count * 30; i++) {
    const rng = makeRng(hash(`${missionId}:${seed}:${i}`));
    const item = recipe(rng);
    const key = `${item.prompt}|${item.right}`;
    if (seen.has(key) && i < count * 15) continue; // avoid repeats within one round
    seen.add(key);
    out.push({
      id: `${missionId}-g${seed}-${out.length + 1}`,
      prompt: item.prompt,
      ...place(balanceChoices(item, rng), rng.int(0, 2)),
      hint: item.hint,
      retryFeedback: item.retry,
      model: nameBars(item.model, item.prompt),
      // Help shows the same picture, now with its labels, so it is about this question.
      simplerModel: nameBars(item.simpler ?? withLabels(item.model), item.prompt),
      standards: [...standardsForMission(missionId)],
      reviewQuestionId: baseQuestionIds[out.length % baseQuestionIds.length],
    });
  }
  return out;
}

/** The fixed 12 "Practice more" questions for a lesson (always the same, so practice repeats). */
export function getExtraPractice(missionId: string, baseQuestionIds: string[]): PracticeQuestion[] {
  return generateQuestions(missionId, baseQuestionIds, 0, EXTRA_PER_LESSON).map((q, i) => ({ ...q, id: `${missionId}-x${i + 1}` }));
}

/** A fresh seed for "New questions" and new practice sheets. */
export const freshSeed = () => 1 + Math.floor(Math.random() * 1_000_000_000);
