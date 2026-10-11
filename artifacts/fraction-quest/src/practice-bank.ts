import type { ModelSpec, PracticeQuestion } from './game';

/* Extra practice: 12 more questions per lesson, made from short templates with varied numbers.
   They're fixed (the same every time), because repeating practice helps it stick.
   Pictures here never show number labels, so the picture doesn't give the answer away. */

const NAMES: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'fourths', 5: 'fifths', 6: 'sixths', 7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 12: 'twelfths' };
const name = (d: number) => NAMES[d] ?? `${d}ths`;
const f = (n: number, d: number) => `${n}/${d}`;
const bar = (n: number, d: number): ModelSpec => ({ kind: 'bars', bars: [{ numerator: n, denominator: d }], hideLabels: true });
const bars2 = (a: [number, number], b: [number, number]): ModelSpec => ({ kind: 'bars', bars: [{ numerator: a[0], denominator: a[1] }, { numerator: b[0], denominator: b[1] }], hideLabels: true });
const line = (n: number, d: number, wholes = Math.max(1, Math.ceil(n / d))): ModelSpec => ({ kind: 'line', numerator: n, denominator: d, wholes, hideLabels: true });
const set = (selected: number, total: number): ModelSpec => ({ kind: 'set', selected, total });
const eq = (text: string): ModelSpec => ({ kind: 'equation', text });
const half = bar(1, 2);

type Item = { prompt: string; right: string; wrong: [string, string]; hint: string; retry: string; model: ModelSpec; simpler?: ModelSpec };

/** Put the right answer at position i % 3 so answers don't always sit in the same spot. */
/** Nudge a wrong choice to the next number if it repeats another choice (e.g. "5" → "6", "3/8" → "4/8"). */
function nudge(choice: string): string {
  const fraction = /^(\d+)\/(\d+)$/.exec(choice);
  if (fraction) return `${Number(fraction[1]) + 1}/${fraction[2]}`;
  if (/^\d+$/.test(choice)) return String(Number(choice) + 1);
  return `${choice} `;
}

function place(item: Item, i: number): Pick<PracticeQuestion, 'choices' | 'correctChoice'> {
  const pos = i % 3;
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

const D = [3, 4, 5, 6, 8, 10, 4, 6, 8, 5, 3, 12];

const TEMPLATES: Record<string, (i: number) => Item> = {
  'equal-parts': (i) => {
    const d = D[i];
    return { prompt: `Which strip shows fair ${name(d)}?`, right: `${d} equal pieces`, wrong: [`${d} pieces, not equal`, `${d + 1} equal pieces`],
      hint: `${name(d)[0].toUpperCase() + name(d).slice(1)} are ${d} equal pieces.`, retry: `You need ${d} pieces, and they must be the same size.`,
      model: { kind: 'partition', parts: Array.from({ length: d }, () => 100 / d) }, simpler: { kind: 'partition', parts: [50, 50] } };
  },
  'fraction-names': (i) => {
    const d = D[i]; const n = 1 + (i % (d - 1));
    return i % 2
      ? { prompt: `In ${f(n, d)}, what does the ${d} mean?`, right: `${d} equal parts in the whole`, wrong: [`${d} parts are shaded`, `${d} wholes`], hint: 'Look at the bottom number.', retry: 'The bottom number is how many equal parts in all.', model: bar(n, d) }
      : { prompt: 'What fraction is shaded?', right: f(n, d), wrong: [f(d, n), f(n, d + 1)], hint: 'Top: shaded parts. Bottom: all the parts.', retry: `Count all ${d} parts for the bottom. Count the ${n} shaded for the top.`, model: bar(n, d) };
  },
  'unit-fractions': (i) => {
    const d = D[i];
    return { prompt: `A whole is cut into ${d} equal pieces. What is 1 piece?`, right: f(1, d), wrong: [f(d, 1), f(1, d - 1 || 2)], hint: 'A unit fraction has 1 on top.', retry: `1 of ${d} equal pieces is 1/${d}.`, model: bar(1, d) };
  },
  'unit-size': (i) => {
    const a = [2, 3, 4, 5, 3, 6, 2, 4, 5, 8, 3, 10][i]; const b = a + [2, 3, 4, 3, 5, 2, 6, 4, 5, 2, 9, 2][i];
    const bigger = i % 2 === 0;
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${f(1, a)} or ${f(1, b)}?`, right: bigger ? f(1, a) : f(1, b), wrong: [bigger ? f(1, b) : f(1, a), 'They are the same'],
      hint: 'More pieces means smaller pieces.', retry: `${name(a)[0].toUpperCase() + name(a).slice(1)} are bigger than ${name(b)}.`, model: bars2([1, a], [1, b]) };
  },
  'sets-unit-fractions': (i) => {
    const d = [2, 3, 4, 5, 3, 4, 2, 6, 5, 3, 4, 2][i]; const per = [3, 4, 2, 3, 5, 3, 6, 2, 4, 6, 5, 7][i]; const t = d * per;
    return { prompt: `What is ${f(1, d)} of ${t}?`, right: String(per), wrong: [String(d === per ? per + 1 : d), String(t)], hint: `Make ${d} equal groups. Count 1 group.`, retry: `${t} in ${d} groups is ${per} each.`, model: set(per, t) };
  },
  'sets-nonunit': (i) => {
    const d = [3, 4, 5, 3, 4, 6, 5, 3, 4, 5, 6, 3][i]; const n = [2, 3, 2, 2, 3, 5, 3, 2, 3, 4, 2, 2][i]; const per = [3, 2, 3, 5, 4, 2, 2, 6, 3, 2, 3, 4][i]; const t = d * per;
    return { prompt: `What is ${f(n, d)} of ${t}?`, right: String(n * per), wrong: [String(per), String(t)], hint: `Make ${d} equal groups. Count ${n} of them.`, retry: `${t} in ${d} groups is ${per} each. ${n} groups is ${n * per}.`, model: set(n * per, t) };
  },
  'benchmark-half': (i) => {
    const d = [8, 6, 10, 5, 7, 9, 4, 12, 8, 6, 10, 9][i]; const n = [5, 2, 3, 3, 2, 6, 1, 7, 3, 4, 7, 4][i];
    const more = n * 2 > d;
    return { prompt: `Is ${f(n, d)} more or less than 1/2?`, right: more ? 'More than 1/2' : 'Less than 1/2', wrong: [more ? 'Less than 1/2' : 'More than 1/2', 'Exactly 1/2'],
      hint: `Half of ${d} is ${d / 2}.`, retry: `Compare ${n} with ${d / 2}.`, model: bars2([n, d], [1, 2]) };
  },
  'benchmarks-zero-one': (i) => {
    const d = [8, 10, 6, 9, 12, 7, 8, 10, 6, 9, 5, 12][i]; const n = [1, 9, 3, 8, 1, 6, 4, 1, 5, 1, 3, 11][i];
    const right = n / d < 0.25 ? '0' : n / d > 0.75 ? '1' : '1/2';
    return { prompt: `Is ${f(n, d)} closest to 0, 1/2 or 1?`, right, wrong: ['0', '1/2', '1'].filter((x) => x !== right) as [string, string],
      hint: 'Is it tiny, about half, or almost full?', retry: `${f(n, d)} is closest to ${right}.`, model: bar(n, d) };
  },
  'fraction-magnitude': (i) => {
    const sets: [string, string, string][] = [['4/9', '1/8', '7/8'], ['5/11', '1/6', '9/10'], ['3/7', '6/7', '1/9'], ['5/9', '1/5', '8/9'], ['6/13', '1/7', '11/12'], ['4/7', '1/10', '7/8'], ['7/15', '2/15', '14/15'], ['5/12', '1/12', '11/12'], ['3/5', '1/8', '9/10'], ['6/11', '1/9', '10/11'], ['2/5', '7/8', '1/10'], ['7/13', '12/13', '1/13']];
    const [right, a, b] = sets[i];
    return { prompt: 'Which is closest to 1/2?', right, wrong: [a, b], hint: 'Find the one about halfway.', retry: `${right} is just around half.`, model: half };
  },
  'number-line-basics': (i) => {
    const d = D[i];
    return i % 2
      ? { prompt: `How many equal spaces do you need for ${name(d)}?`, right: String(d), wrong: [String(d - 1), String(d + 1)], hint: `${name(d)[0].toUpperCase() + name(d).slice(1)} means ${d} equal spaces from 0 to 1.`, retry: `${d} spaces from 0 to 1.`, model: line(0, d) }
      : { prompt: `0 to 1 has ${d} equal spaces. What is 1 jump?`, right: f(1, d), wrong: [f(d, 1), f(1, d + 1)], hint: 'Count the spaces from 0 to 1.', retry: `${d} jumps make 1 whole. So 1 jump is 1/${d}.`, model: line(1, d) };
  },
  'number-line-points': (i) => {
    const d = D[i]; const n = 1 + ((i * 2) % (d - 1));
    return { prompt: 'What fraction is at the dot?', right: f(n, d), wrong: [f(d, n), f(Math.min(n + 1, d), d) === f(n, d) ? f(n, d + 1) : f(Math.min(n + 1, d), d)], hint: 'Count the spaces from 0 to 1. Then count jumps to the dot.', retry: `Each jump is 1/${d}. The dot is ${n} jumps from 0.`, model: line(n, d) };
  },
  'number-line-beyond-one': (i) => {
    const d = [3, 4, 5, 2, 6, 3, 4, 5, 2, 8, 3, 4][i]; const k = d + [1, 3, 2, 1, 1, 2, 1, 4, 3, 5, 4, 2][i];
    return { prompt: `Each jump is ${f(1, d)}. What is ${k} jumps from 0?`, right: f(k, d), wrong: [f(d, k), f(k - d, d)], hint: `${d} jumps reach 1. Keep counting.`, retry: `${k} jumps of 1/${d} is ${f(k, d)}.`, model: line(k, d) };
  },
  'compare-same-denominator': (i) => {
    const d = D[i] + 2; const a = 1 + (i % (d - 2)); const b = a + 1 + (i % 2);
    const bigger = i % 2 === 0;
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${f(a, d)} or ${f(b, d)}?`, right: bigger ? f(b, d) : f(a, d), wrong: [bigger ? f(a, d) : f(b, d), 'They are equal'],
      hint: 'Same size pieces. Compare the top numbers.', retry: `${b} pieces is more than ${a}.`, model: bars2([a, d], [b, d]) };
  },
  'compare-same-numerator': (i) => {
    const n = [1, 2, 3, 2, 1, 3, 2, 4, 1, 3, 2, 5][i]; const a = n + [1, 1, 2, 2, 3, 1, 3, 1, 4, 3, 4, 1][i]; const b = a + [2, 3, 2, 4, 3, 5, 2, 3, 4, 2, 5, 3][i];
    const bigger = i % 2 === 0;
    return { prompt: `Which is ${bigger ? 'bigger' : 'smaller'}, ${f(n, a)} or ${f(n, b)}?`, right: bigger ? f(n, a) : f(n, b), wrong: [bigger ? f(n, b) : f(n, a), 'They are equal'],
      hint: 'Same top number. Which pieces are bigger?', retry: `${name(a)[0].toUpperCase() + name(a).slice(1)} are bigger pieces than ${name(b)}.`, model: bars2([n, a], [n, b]) };
  },
  'order-fractions': (i) => {
    const d = D[i] + 3;
    const small = `1/${d}, 2/${d}, 3/${d}`; const big = `3/${d}, 2/${d}, 1/${d}`; const mixed = `2/${d}, 1/${d}, 3/${d}`;
    const up = i % 2 === 0;
    return { prompt: `Put ${mixed} in order, ${up ? 'smallest' : 'biggest'} first.`, right: up ? small : big, wrong: [up ? big : small, mixed],
      hint: 'Same size pieces. Order the top numbers.', retry: up ? '1 piece, then 2, then 3.' : '3 pieces, then 2, then 1.', model: bars2([1, d], [3, d]) };
  },
  'equivalent-models': (i) => {
    const d = [2, 3, 4, 2, 5, 3, 2, 4, 3, 5, 2, 3][i]; const n = d === 2 ? 1 : 1 + (i % (d - 1)); const k = 2 + (i % 3);
    return { prompt: `Which is the same as ${f(n, d)}?`, right: f(n * k, d * k), wrong: [f(n, d * k), f(n * k, d)], hint: `Split every piece into ${k}.`, retry: `Multiply the top and bottom by ${k}: ${f(n * k, d * k)}.`, model: bars2([n, d], [n * k, d * k]) };
  },
  'build-equivalents': (i) => {
    const d = [3, 4, 5, 2, 6, 3, 4, 5, 2, 3, 4, 5][i]; const n = d === 2 ? 1 : 1 + (i % (d - 1)); const k = [2, 3, 2, 4, 2, 3, 2, 2, 5, 4, 3, 3][i];
    return { prompt: `Times the top and bottom of ${f(n, d)} by ${k}. What do you get?`, right: f(n * k, d * k), wrong: [f(n + k, d + k), f(n * k, d)], hint: 'Do the same thing to the top and bottom.', retry: `${n} × ${k} = ${n * k} and ${d} × ${k} = ${d * k}.`, model: eq(`${f(n, d)} = ?`) };
  },
  'missing-equivalent': (i) => {
    const d = [2, 3, 4, 5, 3, 4, 2, 5, 3, 6, 4, 2][i]; const n = d === 2 ? 1 : 1 + (i % (d - 1)); const k = [4, 2, 2, 2, 3, 3, 5, 3, 4, 2, 4, 3][i];
    return { prompt: `Fill the blank: ${f(n, d)} = ?/${d * k}`, right: String(n * k), wrong: [String(n + k === n * k ? n * k - 1 : n + k), String(n * k + 1)], hint: `What times ${d} makes ${d * k}?`, retry: `The bottom was times ${k}. So the top is ${n} × ${k} = ${n * k}.`, model: eq(`${f(n, d)} = ?/${d * k}`) };
  },
  'compose-to-one': (i) => {
    const d = D[i] + 1; const n = 1 + (i % (d - 2));
    return { prompt: `Fill the blank: ${f(n, d)} + ? = 1`, right: f(d - n, d), wrong: [f(n, d) === f(d - n, d) ? f(n + 1, d) : f(n, d), f(d - n, d * 2)], hint: `1 whole is ${f(d, d)}.`, retry: `${d} − ${n} = ${d - n}. So ${f(d - n, d)}.`, model: bar(n, d) };
  },
  'decompose-fractions': (i) => {
    const d = D[i] + 2; const n = 3 + (i % (d - 3));
    return { prompt: `Which adds up to ${f(n, d)}?`, right: `${f(1, d)} + ${f(n - 1, d)}`, wrong: [`${f(1, d)} + ${f(n - 2, d)}`, `${f(n, d)} + ${f(n, d)}`], hint: 'Add the top numbers. The bottom stays.', retry: `1 + ${n - 1} = ${n}. So ${f(n, d)}.`, model: bar(n, d) };
  },
  'improper-fractions': (i) => {
    const d = [3, 4, 5, 2, 6, 3, 4, 5, 8, 3, 4, 6][i]; const r = 1 + (i % (d - 1));
    return { prompt: `What is ${f(d + r, d)} as wholes and a fraction?`, right: `1 and ${f(r, d)}`, wrong: [`2 and ${f(r, d)}`, `${r} and ${f(1, d)}`], hint: `${f(d, d)} is 1 whole.`, retry: `${f(d + r, d)} is ${f(d, d)} and ${f(r, d)}.`, model: line(d + r, d) };
  },
  'mixed-improper': (i) => {
    const d = [4, 3, 5, 6, 2, 8, 3, 4, 5, 6, 3, 4][i]; const r = 1 + (i % (d - 1));
    return { prompt: `What is 1 and ${f(r, d)} as ${name(d)}?`, right: f(d + r, d), wrong: [f(r, d), f(1 + r, d)], hint: `1 whole is ${f(d, d)}.`, retry: `${f(d, d)} + ${f(r, d)} = ${f(d + r, d)}.`, model: line(d + r, d) };
  },
  'add-like-denominators': (i) => {
    const d = D[i] + 3; const a = 1 + (i % 3); const b = 1 + ((i + 1) % (d - a - 1));
    return { prompt: `${f(a, d)} + ${f(b, d)} = ?`, right: f(a + b, d), wrong: [f(a + b, d * 2), f(a * b === a + b ? a + b + 1 : a * b, d)], hint: 'Add the top numbers. The bottom stays.', retry: `${a} + ${b} = ${a + b}. So ${f(a + b, d)}.`, model: eq(`${f(a, d)} + ${f(b, d)} = ?`) };
  },
  'subtract-like-denominators': (i) => {
    const d = D[i] + 3; const a = Math.min(d - 1, 3 + (i % 4)); const b = 1 + (i % (a - 1));
    return { prompt: `${f(a, d)} − ${f(b, d)} = ?`, right: f(a - b, d), wrong: [f(a + b, d), f(a - b, d * 2)], hint: 'Take away the top numbers. The bottom stays.', retry: `${a} − ${b} = ${a - b}. So ${f(a - b, d)}.`, model: eq(`${f(a, d)} − ${f(b, d)} = ?`) };
  },
  'add-related-fractions': (i) => {
    const a = [2, 3, 2, 4, 2, 3, 5, 2, 4, 3, 2, 5][i]; const k = [2, 2, 3, 2, 4, 3, 2, 5, 3, 4, 6, 3][i]; const big = a * k;
    return { prompt: `${f(1, a)} + ${f(1, big)} = ?`, right: f(k + 1, big), wrong: [f(2, a + big), f(2, big)], hint: `Change ${f(1, a)} into ${name(big)} first.`, retry: `${f(1, a)} = ${f(k, big)}. ${k} + 1 = ${k + 1}, so ${f(k + 1, big)}.`, model: eq(`${f(1, a)} + ${f(1, big)} = ?`) };
  },
  'tenths-decimals': (i) => {
    const n = [3, 7, 1, 9, 4, 6, 2, 8, 5, 3, 6, 9][i];
    return i % 2
      ? { prompt: `What fraction is 0.${n}?`, right: f(n, 10), wrong: [f(n, 100), f(1, n)], hint: 'The number right after the dot is tenths.', retry: `0.${n} means ${n} tenths.`, model: { kind: 'decimal', tenths: n, hideLabels: true } }
      : { prompt: `Write ${f(n, 10)} as a decimal.`, right: `0.${n}`, wrong: [`${n}.0`, `0.0${n}`], hint: 'Tenths go right after the dot.', retry: `${n} tenths is 0.${n}.`, model: { kind: 'decimal', tenths: n, hideLabels: true } };
  },
  'hundredths-decimals': (i) => {
    const n = [25, 8, 40, 63, 5, 90, 17, 50, 3, 75, 36, 99][i];
    const dec = (n / 100).toFixed(2);
    return i % 2
      ? { prompt: `What fraction is ${dec}?`, right: f(n, 100), wrong: [f(n, 10), f(1, n)], hint: '2 places after the dot means hundredths.', retry: `${dec} means ${n} hundredths.`, model: eq(dec) }
      : { prompt: `Write ${f(n, 100)} as a decimal.`, right: dec, wrong: [n < 10 ? `0.${n}` : (n / 10).toFixed(1).replace(/\.0$/, '.0'), `${n}.0`], hint: 'Hundredths need 2 places after the dot.', retry: `${n} hundredths is ${dec}.`, model: eq(`${f(n, 100)} = ?`) };
  },
};

export const EXTRA_PER_LESSON = 12;

/** The 12 extra practice questions for a lesson. Missed ones are linked to the lesson's own questions for later review. */
export function getExtraPractice(missionId: string, baseQuestionIds: string[]): PracticeQuestion[] {
  const template = TEMPLATES[missionId];
  if (!template) throw new Error(`No extra practice for ${missionId}`);
  return Array.from({ length: EXTRA_PER_LESSON }, (_, i) => {
    const item = template(i);
    return {
      id: `${missionId}-x${i + 1}`,
      prompt: item.prompt,
      ...place(item, i),
      hint: item.hint,
      retryFeedback: item.retry,
      model: item.model,
      simplerModel: item.simpler ?? half,
      reviewQuestionId: baseQuestionIds[i % baseQuestionIds.length],
    };
  });
}
