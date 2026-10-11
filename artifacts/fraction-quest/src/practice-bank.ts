import { getMission, MISSIONS, type ModelSpec, type PracticeQuestion } from './game';
import { getWorksheet } from './learning-content';

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
const bars2 = (a: [number, number], b: [number, number]): ModelSpec => ({ kind: 'bars', bars: [{ numerator: a[0], denominator: a[1] }, { numerator: b[0], denominator: b[1] }], hideLabels: true });
const line = (n: number, d: number, wholes = Math.max(1, Math.ceil(n / d))): ModelSpec => ({ kind: 'line', numerator: n, denominator: d, wholes, hideLabels: true });
const set = (selected: number, total: number): ModelSpec => ({ kind: 'set', selected, total });
const eq = (text: string): ModelSpec => ({ kind: 'equation', text });
const half = bar(1, 2);

type Item = { prompt: string; right: string; wrong: [string, string]; hint: string; retry: string; model: ModelSpec; simpler?: ModelSpec };

/** Nudge a wrong choice to the next number if it repeats another choice (e.g. "5" → "6", "3/8" → "4/8"). */
function nudge(choice: string): string {
  const fraction = /^(\d+)\/(\d+)$/.exec(choice);
  if (fraction) return `${Number(fraction[1]) + 1}/${fraction[2]}`;
  if (/^\d+$/.test(choice)) return String(Number(choice) + 1);
  // Text with a number in it ("1 and 1/2"): bump the first number so the choice really changes.
  return /\d+/.test(choice) ? choice.replace(/\d+/, (m) => String(Number(m) + 1)) : `${choice} (other)`;
}

function extensionDistractors(answer: string): [string, string] {
  let candidates: string[] = [];
  if (/^[<=>]$/.test(answer)) {
    candidates = ['<', '=', '>'].filter((choice) => choice !== answer);
  } else if (answer.includes(',')) {
    const items = answer.split(',').map((item) => item.trim());
    candidates = [
      [...items].reverse().join(', '),
      [...items.slice(1), items[0]].join(', '),
    ];
  } else {
    const mixed = /^(\d+)\s+(\d+)\/(\d+)$/.exec(answer);
    const fraction = /^(\d+)\/(\d+)$/.exec(answer);
    const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(answer);
    const numberAndUnit = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(answer);
    if (mixed) {
      const [, whole, numerator, denominator] = mixed;
      candidates = [`${whole} ${Number(numerator) + 1}/${denominator}`, `${Number(whole) + 1} ${numerator}/${denominator}`];
    } else if (fraction) {
      const [, numerator, denominator] = fraction;
      candidates = [`${Number(numerator) + 1}/${denominator}`, `${numerator}/${Number(denominator) + 1}`];
    } else if (percent) {
      const value = Number(percent[1]);
      candidates = [`${value + 5}%`, `${Math.max(0, value - 5)}%`];
    } else if (numberAndUnit) {
      const value = Number(numberAndUnit[1]);
      const precision = numberAndUnit[1].split('.')[1]?.length ?? 0;
      const step = precision ? 1 / 10 ** precision : 1;
      candidates = [
        `${(value + step).toFixed(precision)}${numberAndUnit[2]}`,
        `${(value - step).toFixed(precision)}${numberAndUnit[2]}`,
      ];
    }
  }

  const unique = [...new Set(candidates.filter((choice) => choice !== answer))];
  while (unique.length < 2) {
    const next = nudge(unique.at(-1) ?? answer);
    if (next === answer || unique.includes(next)) break;
    unique.push(next);
  }
  if (unique.length < 2) unique.push(nudge(nudge(answer)));
  return [unique[0], unique[1]];
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
    const d = r.pick([2, 3, 4, 5, 6, 8, 10, 12]);
    return { prompt: `Which strip shows fair ${name(d)}?`, right: `${d} equal pieces`, wrong: [`${d} pieces, not equal`, `${d + 1} equal pieces`],
      hint: `${Name(d)} are ${d} equal pieces.`, retry: `You need ${d} pieces, and they must be the same size.`,
      model: { kind: 'partition', parts: Array.from({ length: d }, () => 100 / d) }, simpler: { kind: 'partition', parts: [50, 50] } };
  },
  'fraction-names': (r) => {
    const d = r.int(3, 10); const n = r.int(1, d - 1);
    return r.chance()
      ? { prompt: `In ${f(n, d)}, what does the ${d} mean?`, right: `${d} equal parts in the whole`, wrong: [`${d} parts are shaded`, `${d} wholes`], hint: 'Look at the bottom number.', retry: 'The bottom number is how many equal parts in all.', model: bar(n, d) }
      : { prompt: 'What fraction is shaded?', right: f(n, d), wrong: [f(d, n), f(n, d + 1)], hint: 'Top: shaded parts. Bottom: all the parts.', retry: `Count all ${d} parts for the bottom. Count the ${n} shaded for the top.`, model: bar(n, d) };
  },
  'unit-fractions': (r) => {
    const d = r.int(3, 12);
    return { prompt: `A whole is cut into ${d} equal pieces. What is 1 piece?`, right: f(1, d), wrong: [f(d, 1), f(1, d - 1)], hint: 'A unit fraction has 1 on top.', retry: `1 of ${d} equal pieces is 1/${d}.`, model: bar(1, d) };
  },
  'unit-size': (r) => {
    const a = r.int(2, 8); const b = a + r.int(2, 5); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${f(1, a)} or ${f(1, b)}?`, right: bigger ? f(1, a) : f(1, b), wrong: [bigger ? f(1, b) : f(1, a), 'They are the same'],
      hint: 'More pieces means smaller pieces.', retry: `${Name(a)} are bigger than ${name(b)}.`, model: bars2([1, a], [1, b]) };
  },
  'sets-unit-fractions': (r) => {
    const d = r.int(2, 6); let per = r.int(2, 7); if (per === d) per += 1; const t = d * per;
    return { prompt: `What is ${f(1, d)} of ${t}?`, right: String(per), wrong: [String(d), String(t)], hint: `Make ${d} equal groups. Count 1 group.`, retry: `${t} in ${d} groups is ${per} each.`, model: set(per, t) };
  },
  'sets-nonunit': (r) => {
    const d = r.int(3, 6); const n = r.int(2, d - 1); const per = r.int(2, 6); const t = d * per;
    return { prompt: `What is ${f(n, d)} of ${t}?`, right: String(n * per), wrong: [String(per), String(t)], hint: `Make ${d} equal groups. Count ${n} of them.`, retry: `${t} in ${d} groups is ${per} each. ${n} groups is ${n * per}.`, model: set(n * per, t) };
  },
  'benchmark-half': (r) => {
    const d = r.int(4, 12); let n = r.int(1, d - 1); if (n * 2 === d) n += n > 1 && r.chance() ? -1 : 1;
    const more = n * 2 > d;
    return { prompt: `Is ${f(n, d)} more or less than 1/2?`, right: more ? 'More than 1/2' : 'Less than 1/2', wrong: [more ? 'Less than 1/2' : 'More than 1/2', 'Exactly 1/2'],
      hint: `Half of ${d} is ${d / 2}.`, retry: `Compare ${n} with ${d / 2}.`, model: bars2([n, d], [1, 2]) };
  },
  'benchmarks-zero-one': (r) => {
    const d = r.int(5, 12); const kind = r.int(0, 2);
    const n = kind === 0 ? 1 : kind === 2 ? d - 1 : Math.round(d / 2);
    const right = ['0', '1/2', '1'][kind];
    return { prompt: `Is ${f(n, d)} closest to 0, 1/2 or 1?`, right, wrong: ['0', '1/2', '1'].filter((x) => x !== right) as [string, string],
      hint: 'Is it tiny, about half, or almost full?', retry: `${f(n, d)} is closest to ${right}.`, model: bar(n, d) };
  },
  'fraction-magnitude': (r) => {
    const d = r.int(5, 13); const n = d % 2 ? (d - 1) / 2 + r.int(0, 1) : d / 2 - 1;
    const small = f(1, r.int(6, 10)); const e = r.int(6, 12); const big = f(e - 1, e);
    return { prompt: 'Which is closest to 1/2?', right: f(n, d), wrong: r.chance() ? [small, big] : [big, small], hint: 'Find the one about halfway.', retry: `${f(n, d)} is just around half.`, model: half };
  },
  'number-line-basics': (r) => {
    const d = r.int(3, 10);
    return r.chance()
      ? { prompt: `How many equal spaces do you need for ${name(d)}?`, right: String(d), wrong: [String(d - 1), String(d + 1)], hint: `${Name(d)} means ${d} equal spaces from 0 to 1.`, retry: `${d} spaces from 0 to 1.`, model: line(0, d) }
      : { prompt: `0 to 1 has ${d} equal spaces. What is 1 jump?`, right: f(1, d), wrong: [f(d, 1), f(1, d + 1)], hint: 'Count the spaces from 0 to 1.', retry: `${d} jumps make 1 whole. So 1 jump is 1/${d}.`, model: line(1, d) };
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
    const d = r.int(5, 12); const a = r.int(1, d - 2); const b = r.int(a + 1, d - 1); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${f(a, d)} or ${f(b, d)}?`, right: bigger ? f(b, d) : f(a, d), wrong: [bigger ? f(a, d) : f(b, d), 'They are equal'],
      hint: 'Same size pieces. Compare the top numbers.', retry: `${b} pieces is more than ${a}.`, model: bars2([a, d], [b, d]) };
  },
  'compare-same-numerator': (r) => {
    const n = r.int(1, 4); const a = n + r.int(1, 4); const b = a + r.int(2, 4); const bigger = r.chance();
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${f(n, a)} or ${f(n, b)}?`, right: bigger ? f(n, a) : f(n, b), wrong: [bigger ? f(n, b) : f(n, a), 'They are equal'],
      hint: 'Same top number. Which pieces are bigger?', retry: `${Name(a)} are bigger pieces than ${name(b)}.`, model: bars2([n, a], [n, b]) };
  },
  'order-fractions': (r) => {
    const d = r.int(5, 12); const a = r.int(1, d - 3); const b = r.int(a + 1, d - 2); const c = r.int(b + 1, d - 1);
    const up = r.chance();
    const small = `${f(a, d)}, ${f(b, d)}, ${f(c, d)}`; const big = `${f(c, d)}, ${f(b, d)}, ${f(a, d)}`; const mixed = `${f(b, d)}, ${f(a, d)}, ${f(c, d)}`;
    return { prompt: `Put ${mixed} in order, ${up ? 'smallest' : 'biggest'} first.`, right: up ? small : big, wrong: [up ? big : small, mixed],
      hint: 'Same size pieces. Order the top numbers.', retry: up ? `${a}, then ${b}, then ${c}.` : `${c}, then ${b}, then ${a}.`, model: bars2([a, d], [c, d]) };
  },
  'equivalent-models': (r) => {
    const d = r.int(2, 6); const n = r.int(1, d - 1); const k = r.int(2, 4);
    return { prompt: `Which is the same as ${f(n, d)}?`, right: f(n * k, d * k), wrong: [f(n, d * k), f(n * k, d)], hint: `Split every piece into ${k}.`, retry: `Multiply the top and bottom by ${k}: ${f(n * k, d * k)}.`, model: bars2([n, d], [n * k, d * k]) };
  },
  'build-equivalents': (r) => {
    const d = r.int(2, 6); const n = r.int(1, d - 1); const k = r.int(2, 5);
    return { prompt: `Times the top and bottom of ${f(n, d)} by ${k}. What do you get?`, right: f(n * k, d * k), wrong: [f(n + k, d + k), f(n * k, d)], hint: 'Do the same thing to the top and bottom.', retry: `${n} × ${k} = ${n * k} and ${d} × ${k} = ${d * k}.`, model: eq(`${f(n, d)} = ?`) };
  },
  'missing-equivalent': (r) => {
    const d = r.int(2, 6); const n = r.int(1, d - 1); const k = r.int(2, 5);
    return { prompt: `Fill the blank: ${f(n, d)} = ?/${d * k}`, right: String(n * k), wrong: [String(n + k), String(n * k + 1)], hint: `What times ${d} makes ${d * k}?`, retry: `The bottom was times ${k}. So the top is ${n} × ${k} = ${n * k}.`, model: eq(`${f(n, d)} = ?/${d * k}`) };
  },
  'compose-to-one': (r) => {
    const d = r.int(3, 12); const n = r.int(1, d - 1);
    return { prompt: `Fill the blank: ${f(n, d)} + ? = 1`, right: f(d - n, d), wrong: [f(n, d), f(d - n, d * 2)], hint: `1 whole is ${f(d, d)}.`, retry: `${d} − ${n} = ${d - n}. So ${f(d - n, d)}.`, model: bar(n, d) };
  },
  'decompose-fractions': (r) => {
    const d = r.int(5, 12); const n = r.int(3, d - 1); const first = r.int(1, n - 2);
    return { prompt: `Which adds up to ${f(n, d)}?`, right: `${f(first, d)} + ${f(n - first, d)}`, wrong: [`${f(first, d)} + ${f(n - first - 1, d)}`, `${f(n, d)} + ${f(n, d)}`], hint: 'Add the top numbers. The bottom stays.', retry: `${first} + ${n - first} = ${n}. So ${f(n, d)}.`, model: bar(n, d) };
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
    const d = r.int(5, 12); const a = r.int(1, d - 2); const b = r.int(1, d - 1 - a);
    return { prompt: `${f(a, d)} + ${f(b, d)} = ?`, right: f(a + b, d), wrong: [f(a + b, d * 2), f(a + b + 1, d)], hint: 'Add the top numbers. The bottom stays.', retry: `${a} + ${b} = ${a + b}. So ${f(a + b, d)}.`, model: eq(`${f(a, d)} + ${f(b, d)} = ?`) };
  },
  'subtract-like-denominators': (r) => {
    const d = r.int(5, 12); const a = r.int(2, d - 1); const b = r.int(1, a - 1);
    return { prompt: `${f(a, d)} − ${f(b, d)} = ?`, right: f(a - b, d), wrong: [f(a + b, d), f(a - b, d * 2)], hint: 'Take away the top numbers. The bottom stays.', retry: `${a} − ${b} = ${a - b}. So ${f(a - b, d)}.`, model: eq(`${f(a, d)} − ${f(b, d)} = ?`) };
  },
  'add-related-fractions': (r) => {
    const a = r.int(2, 5); const k = r.int(2, 4); const big = a * k;
    return { prompt: `${f(1, a)} + ${f(1, big)} = ?`, right: f(k + 1, big), wrong: [f(2, a + big), f(2, big)], hint: `Change ${f(1, a)} into ${name(big)} first.`, retry: `${f(1, a)} = ${f(k, big)}. ${k} + 1 = ${k + 1}, so ${f(k + 1, big)}.`, model: eq(`${f(1, a)} + ${f(1, big)} = ?`) };
  },
  'tenths-decimals': (r) => {
    const n = r.int(1, 9);
    return r.chance()
      ? { prompt: `What fraction is 0.${n}?`, right: f(n, 10), wrong: [f(n, 100), f(1, n === 1 ? 2 : n)], hint: 'The number right after the dot is tenths.', retry: `0.${n} means ${n} tenths.`, model: { kind: 'decimal', tenths: n, hideLabels: true } }
      : { prompt: `Write ${f(n, 10)} as a decimal.`, right: `0.${n}`, wrong: [`${n}.0`, `0.0${n}`], hint: 'Tenths go right after the dot.', retry: `${n} tenths is 0.${n}.`, model: { kind: 'decimal', tenths: n, hideLabels: true } };
  },
  'hundredths-decimals': (r) => {
    const n = r.int(1, 99); const dec = (n / 100).toFixed(2);
    return r.chance()
      ? { prompt: `What fraction is ${dec}?`, right: f(n, 100), wrong: [f(n, 10), f(1, n === 1 ? 2 : n)], hint: '2 places after the dot means hundredths.', retry: `${dec} means ${n} hundredths.`, model: eq(dec) }
      : { prompt: `Write ${f(n, 100)} as a decimal.`, right: dec, wrong: [(n / 10).toFixed(1), `${n}.0`], hint: 'Hundredths need 2 places after the dot.', retry: `${n} hundredths is ${dec}.`, model: eq(`${f(n, 100)} = ?`) };
  },
};

for (const topic of MISSIONS.filter((item) => !(item.id in RECIPES))) {
  const sourceQuestions = getMission(topic.id).questions.filter((question) => !question.isReview && !question.isMastery);
  const worksheet = getWorksheet(topic.id);
  RECIPES[topic.id] = (r) => {
    const problem = r.pick(worksheet);
    const source = sourceQuestions[worksheet.indexOf(problem) % sourceQuestions.length];
    return {
      prompt: problem.prompt,
      right: problem.answer,
      wrong: extensionDistractors(problem.answer),
      hint: problem.hint,
      retry: source.retryFeedback,
      model: source.model,
      simpler: source.simplerModel,
    };
  };
}

export const EXTRA_PER_LESSON = 12;
export const hasGenerator = (missionId: string) => missionId in RECIPES;

/** Make `count` questions for a lesson from a seed. The same seed always gives the same questions. */
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
      ...place(item, rng.int(0, 2)),
      hint: item.hint,
      retryFeedback: item.retry,
      model: item.model,
      simplerModel: item.simpler ?? half,
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
