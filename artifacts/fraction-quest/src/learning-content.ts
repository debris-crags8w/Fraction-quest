import { circleCut, type AreaFigure, type AreaTask } from './area-shapes';
import { standardsForMission } from './standard-catalog';
import { autoPicture } from './auto-picture';
import type { ModelSpec } from './game';
export type Rational = { n: number; d: number };
/** `sizes` (bars only) draws pieces of different widths, for "Is this cut into equal parts?" pictures. */
export type LearningModel = { kind: 'bar' | 'set' | 'line'; n: number; d: number; wholes: number; total?: number; sizes?: number[] };
/** What the child does on the bar before typing: copy the shaded bar, tap each part to count it, or shade `n` parts. */
export type BarTask = { kind: 'copy' | 'count' | 'shade'; n: number };
export type WorksheetProblem = {
  id: string; prompt: string; answer: string; hint: string; model?: LearningModel; modelRequired?: boolean; task?: BarTask;
  standards?: string[];
  form?: 'decimal' | 'mixed' | 'ordered' | 'symbol' | 'word'; denominator?: number;
  /** A square cut into pieces that may have different shapes; with `areaTask` the child colors it before answering. */
  area?: AreaFigure; areaTask?: AreaTask;
  /** Interactive measurement model: move to the unlabelled endpoint, then name the length. */
  rulerTask?: { denominator: number; wholes: number; end: number };
  /** Interactive line plot: place one X for each observation before answering. Values are tick indices. */
  linePlotTask?: { denominator: number; wholes: number; values: number[] };
  scaleTask?: { whole: number; numerator: number; denominator: number };
  /** A picture of the amounts in the prompt, for rows with no model of their own (every row shows a model). */
  picture?: ModelSpec;
};
export type BuildCheck = {
  id: string; prompt: string; target: LearningModel; reasons: string[];
  correctReason: number; explanation: string; transfer: boolean;
};
export type ReasonFeedback = { message: string; correct: boolean };

export type BuildCheckStage = 'primary' | 'secondary' | 'reason';

/** Reveal each learning step only after the learner has built the prior model. */
export function getBuildCheckStage(primaryCorrect: boolean, secondaryCorrect: boolean): BuildCheckStage {
  if (!primaryCorrect) return 'primary';
  return secondaryCorrect ? 'reason' : 'secondary';
}

/** A short, concrete explanation that describes what the visible model represents. */
export function getModelFeedback(target: LearningModel, kind: LearningModel['kind'] = target.kind): string {
  const count = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;
  if (kind === 'set') {
    return `${target.total ?? target.d} objects are split into ${target.d} equal groups. ${count(target.n, 'group is', 'groups are')} selected.`;
  }
  if (kind === 'line') {
    return `Each whole has ${target.d} equal spaces. ${count(target.n, 'jump shows', 'jumps show')} the amount.`;
  }
  return `Each whole is split into ${target.d} equal parts. ${count(target.n, 'part is', 'parts are')} shaded.`;
}

/** Keep reasoning feedback separate from model errors so a correct explanation is not blamed for a bad build. */
export function getReasonFeedback(check: BuildCheck, selected: number | null, modelsCorrect: boolean): ReasonFeedback | null {
  if (selected === null) return { message: 'Reason: Pick the statement that matches your model.', correct: false };
  if (selected !== check.correctReason) return { message: 'Reason: Not quite. Look at the models and choose again.', correct: false };
  if (!modelsCorrect) return { message: 'Reason: Your choice is right; fix the model above.', correct: true };
  return null;
}

const model = (n: number, d: number, kind: LearningModel['kind'] = 'bar', total?: number): LearningModel =>
  ({ n, d, kind, total, wholes: Math.max(1, Math.ceil(n / d)) });
const f = (n: number, d: number) => `${n}/${d}`;
const UNIT_NAMES: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'fourths', 5: 'fifths', 6: 'sixths', 7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 12: 'twelfths', 15: 'fifteenths', 16: 'sixteenths' };
/** Plural name for pieces of size 1/d, e.g. 3 → "thirds". */
const unitName = (d: number) => UNIT_NAMES[d] ?? `${d}ths`;

/** Exact decimal/fraction arithmetic: never silently round a student's answer. */
export function parseAnswer(raw: string): Rational | null {
  const s = raw.trim().replace(/\s+and\s+/i, ' ');
  const mixed = /^(\d+)\s+(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (mixed) {
    const [, w, n, d] = mixed.map(Number);
    if (!d || n >= d) return null;
    return { n: w * d + n, d };
  }
  const fraction = /^(\d+)\s*\/\s*(\d+)$/.exec(s);
  if (fraction) return Number(fraction[2]) > 0 ? { n: Number(fraction[1]), d: Number(fraction[2]) } : null;
  if (!/^\d+(?:\.\d{1,6})?$/.test(s)) return null;
  const places = s.split('.')[1]?.length ?? 0;
  const d = 10 ** places;
  const n = Number(s.replace('.', ''));
  return Number.isSafeInteger(n) ? { n, d } : null;
}
/** The prompt where there is no tappable bar (paper, or the typed level quiz with `typed`): "Tap each part to count it." becomes "Count each part.", "Type" becomes "Write". */
export function paperPrompt(problem: WorksheetProblem, typed = false): string {
  const counted = problem.prompt.replace(/^Tap each (.+?) to count it\. /, 'Count each $1. ');
  return typed ? counted : counted.replace(/\bType\b/g, 'Write');
}

export function isYesNoProblem(problem: Pick<WorksheetProblem, 'form' | 'answer'>): boolean {
  return problem.form === 'word' && /^(?:yes|no)$/i.test(problem.answer.trim());
}

export function yesNoPrompt(problem: Pick<WorksheetProblem, 'form' | 'answer' | 'prompt'>): string {
  if (!isYesNoProblem(problem)) return problem.prompt;
  return problem.prompt.replace(/\b(?:Type|Answer)\s+yes\s+or\s+no\.?$/i, 'Choose yes or no.');
}

export function answerMatches(problem: WorksheetProblem, rawInput: string): boolean {
  // "25%" and "25" both match a percent answer.
  const raw = rawInput.replace(/\s*%\s*$/, '');
  if (/%$/.test(problem.answer)) return answerMatches({ ...problem, answer: problem.answer.slice(0, -1) }, raw);
  if (problem.form === 'symbol') return raw.trim() === problem.answer;
  if (problem.form === 'word') { const said = raw.trim().toLowerCase(); return said === problem.answer || said === problem.answer[0]; }
  if (problem.form === 'ordered') {
    const answers = raw.split(','); const expected = problem.answer.split(',');
    return answers.length === expected.length && expected.every((value, i) => answerMatches({ ...problem, form: undefined, answer: value }, answers[i]));
  }
  if (problem.form === 'decimal' && !/^\d+\.\d+$/.test(raw.trim())) return false;
  if (problem.form === 'mixed' && !/^\d+\s+(?:and\s+)?\d+\s*\/\s*\d+$/.test(raw.trim())) return false;
  if (problem.denominator && Number(raw.trim().split('/')[1]) !== problem.denominator) return false;
  const actual = parseAnswer(raw); const expected = parseAnswer(problem.answer);
  return !!actual && !!expected && Number.isSafeInteger(actual.n * expected.d) &&
    actual.n * expected.d === expected.n * actual.d;
}

/* ---------- worksheet problem → multiple-choice question (later lessons and their extra practice) ---------- */

/** A tap question names its own choices, so it drops worksheet instructions like "Put <, = or > in the gap". */
export function asChoicePrompt(prompt: string): string {
  return prompt
    .replace(/^(?:Type <, = or >|Put <, = or > in the gap): /, 'Pick the sign: ')
    .replace(/\s*(Type it|Type a number|Use commas)\.$/, '');
}

/** Two believable wrong answers that are never equal in value to the right one. */
export function choiceDistractors(answer: string): [string, string] {
  if (/^[<=>]$/.test(answer)) return ['<', '=', '>'].filter((c) => c !== answer) as [string, string];
  const percent = /^(\d+)%$/.exec(answer);
  if (percent) { const p = Number(percent[1]); return [`${p + 10}%`, `${p > 10 ? p - 10 : p + 5}%`]; }
  if (answer.includes(',')) {
    const items = answer.split(',').map((x) => x.trim());
    return [[...items].reverse().join(', '), [items[1], items[0], items[2]].join(', ')];
  }
  const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(answer);
  if (mixed) { const [, w, t, b] = mixed.map(Number); return [`${w + 1} ${t}/${b}`, `${w} ${t}/${b * 2}`]; }
  const frac = /^(\d+)\/(\d+)$/.exec(answer);
  if (frac) {
    const [, t, b] = frac.map(Number);
    const value = t / b; const out: string[] = [];
    for (const c of [f(t, b + t), f(t + 1, b), f(b, t), f(t, b * 2), f(t + 2, b)]) {
      const [ct, cb] = c.split('/').map(Number);
      if (cb > 0 && ct / cb !== value && !out.includes(c)) out.push(c);
      if (out.length === 2) break;
    }
    return [out[0], out[1]];
  }
  if (/^\d+\.\d+$/.test(answer)) {
    // Common slips: the point moved one place left (0.5 → 0.05) or right (0.5 → 5.0).
    const places = answer.split('.')[1].length; const value = Number(answer);
    return [(value / 10).toFixed(places + 1), (value * 10).toFixed(Math.max(1, places - 1))];
  }
  const whole = Number(answer);
  return [String(whole + 1), String(whole > 1 ? whole - 1 : whole + 2)];
}

// Each skill has its own reasoning and model target; transfer uses new numbers.
const CHECKS: Record<string, [number, number, LearningModel['kind'], string, string, number?]> = {
  'equal-parts': [1, 3, 'bar', 'Cut a bar into 3 equal pieces. Shade 1.', 'All 3 pieces are the same size.'],
  'fraction-names': [3, 5, 'bar', 'Make 3/5.', 'Denominator: 5 equal pieces. Numerator: 3 are shaded.'],
  'unit-fractions': [1, 6, 'bar', 'Make 1/6. Just one piece!', 'A unit fraction is just 1 equal piece.'],
  'unit-size': [1, 4, 'bar', 'Which is bigger, 1/4 or 1/8? Make the bigger one.', 'Fewer pieces means bigger pieces.'],
  'sets-unit-fractions': [1, 3, 'set', 'Put 12 dots in 3 equal groups. Pick 1 group.', 'Make 3 equal groups. 1 group is 1/3.', 12],
  'sets-nonunit': [2, 3, 'set', 'Put 12 dots in 3 equal groups. Pick 2 groups.', 'Make 3 equal groups. 2 groups is 2/3.', 12],
  'benchmark-half': [3, 8, 'bar', 'Make a fraction 1/8 less than half.', 'Half of 8 is 4. One less is 3/8.'],
  'benchmarks-zero-one': [7, 8, 'bar', 'Make a fraction 1/8 less than 1 whole.', '8/8 is 1 whole. One less is 7/8.'],
  'fraction-magnitude': [5, 12, 'bar', 'Make a fraction 1/12 less than half.', 'Half of 12 is 6. One less is 5/12.'],
  'number-line-basics': [2, 5, 'line', 'Cut 0 to 1 into 5 equal spaces. Make 2 jumps.', 'Count the spaces, not the tick marks.'],
  'number-line-points': [4, 7, 'line', 'Mark 4/7 on the number line.', 'Denominator: 7 spaces in 1 whole. Numerator: 4 jumps.'],
  'number-line-beyond-one': [7, 5, 'line', 'Mark 1 and 2/5 on the number line.', '5/5 is 1 whole. 2 more fifths makes 7/5.'],
  'compare-same-denominator': [5, 8, 'bar', 'Which is bigger, 3/8 or 5/8? Make it.', 'Same size pieces. 5 is more than 3.'],
  'compare-same-numerator': [3, 5, 'bar', 'Which is bigger, 3/5 or 3/8? Make it.', 'Fifths are bigger pieces than eighths.'],
  'order-fractions': [3, 4, 'bar', 'Which is biggest: 1/4, 1/2 or 3/4? Make it.', '3/4 is more than half.'],
  'equivalent-models': [2, 4, 'bar', 'Show 1/2 using fourths. Split every piece.', 'Split each half in 2. So 1/2 = 2/4.'],
  'build-equivalents': [4, 6, 'bar', 'Show 2/3 using sixths.', 'Split each third in 2. So 2/3 = 4/6.'],
  'missing-equivalent': [6, 8, 'bar', '3/4 = ?/8. Make it.', 'Each fourth is 2 eighths. So 3/4 = 6/8.'],
  'compose-to-one': [5, 8, 'bar', '3/8 is used. Make what is left of 1 whole.', '8/8 is 1 whole. 8 − 3 = 5, so 5/8.'],
  'decompose-fractions': [4, 6, 'bar', 'Make 4/6 with four 1/6 pieces.', 'Four 1/6 pieces make 4/6.'],
  'improper-fractions': [7, 4, 'bar', 'Make 7/4.', '4/4 fills 1 bar. 3/4 more is left over.'],
  'mixed-improper': [8, 5, 'bar', 'Make 1 and 3/5 using fifths.', '1 whole is 5/5. Add 3 more to get 8/5.'],
  'whole-numbers-as-fractions': [6, 3, 'bar', 'Build 6/3 using thirds.', 'Three thirds make 1 whole. Six thirds make 2 wholes.'],
  'add-like-denominators': [5, 8, 'bar', 'Make 2/8 + 3/8.', 'Add the pieces: 2 + 3 = 5. So 5/8.'],
  'subtract-like-denominators': [3, 7, 'bar', 'Make 5/7 − 2/7.', 'Take away 2 pieces: 5 − 2 = 3. So 3/7.'],
  'add-related-fractions': [5, 6, 'bar', 'Make 1/2 + 1/3 using sixths.', '1/2 = 3/6 and 1/3 = 2/6. 3 + 2 = 5, so 5/6.'],
  'add-unlike-fractions': [7, 12, 'bar', 'Build 1/3 + 1/4 using twelfths.', '1/3 is 4/12 and 1/4 is 3/12. Together they are 7/12.'],
  'mixed-unlike-operations': [25, 12, 'bar', 'Build 1 1/3 + 3/4 using twelfths.', '1 1/3 is 16/12 and 3/4 is 9/12. Together they are 25/12, or 2 1/12.'],
  'estimate-fraction-operations': [9, 10, 'line', 'Build 2/5 + 1/2. Is the sum less than 1?', '2/5 is a little less than 1/2. Two halves make 1, so the sum is a little less than 1.'],
  'tenths-decimals': [4, 10, 'bar', 'Make 0.4 as a fraction.', '0.4 means 4 tenths.'],
  'hundredths-decimals': [25, 100, 'bar', 'Make 0.25 as a fraction.', '0.25 means 25 hundredths.'],
  'add-tenths-hundredths': [34, 100, 'bar', 'Make 3/10 + 4/100 using hundredths.', '3/10 = 30/100. 30 + 4 = 34, so 34/100.'],
  'compare-decimals': [3, 10, 'bar', 'Build 0.3 with tenths. Then compare it to 0.25.', '0.30 is 30 hundredths. 30 hundredths is more than 25 hundredths.'],
  'simplify-fractions': [3, 4, 'bar', 'Make 6/8 in simplest form.', 'Divide the numerator and denominator by 2. 6/8 = 3/4.'],
  'equivalent-missing-both': [4, 10, 'bar', 'Show 2/5 using tenths.', 'Times the numerator and denominator by 2. 2/5 = 4/10.'],
  'compare-unlike-fractions': [2, 3, 'bar', 'Which is bigger, 2/3 or 3/5? Make it.', 'Use fifteenths: 2/3 = 10/15 and 3/5 = 9/15.'],
  'order-unlike-fractions': [3, 4, 'bar', 'Which is biggest: 1/2, 2/3 or 3/4? Make it.', 'Use twelfths: 6/12, 8/12, 9/12. So 3/4 is biggest.'],
  'subtract-unlike-fractions': [1, 4, 'bar', 'Make 3/4 − 1/2.', '1/2 = 2/4. 3/4 − 2/4 = 1/4.'],
  'add-mixed-numbers': [7, 4, 'bar', 'Make 1/4 + 1 1/2.', '1 1/2 = 6/4. 6/4 + 1/4 = 7/4, or 1 3/4.'],
  'subtract-mixed-numbers': [2, 3, 'bar', 'Make 2 1/3 − 1 2/3.', '2 1/3 = 7/3 and 1 2/3 = 5/3. 7 − 5 = 2, so 2/3.'],
  'fraction-of-quantity': [3, 5, 'set', 'Put 20 dots in 5 equal groups. Pick 3 groups.', '20 in 5 groups is 4 each. 3 groups is 12.', 20],
  'multiply-whole-by-fraction': [3, 2, 'bar', 'Make 3 × 1/2.', '3 groups of 1/2 is 3/2, or 1 1/2.'],
  'unit-fraction-multiples': [5, 4, 'bar', 'Put 5 pieces of 1/4 together. Build the total.', 'Five copies of 1/4 are 5/4, or 1 1/4.'],
  'multiply-fractions': [3, 8, 'bar', 'Make 1/2 of 3/4.', 'Cut each fourth in half. Half of 3/4 is 3/8.'],
  'fractional-side-area': [1, 2, 'bar', 'Build the area of a rectangle that is 2/3 unit by 3/4 unit.', 'Two columns by three rows cover 6 of 12 equal squares. 6/12 is 1/2 square unit.'],
  'multiplication-scaling': [3, 4, 'set', 'Build 3/4 of 12. Is the answer less or more than 12?', 'Three of four equal groups is 9. Multiplying 12 by 3/4 makes a smaller amount. ', 12],
  'multiply-mixed-numbers': [12, 6, 'bar', 'Build 1 1/2 × 1 1/3 square units.', 'The rectangle has 3 half-unit rows and 4 third-unit columns: 12 sixths, or 2 square units.'],
  'fraction-of-collection': [3, 4, 'set', 'Put 16 cards in 4 equal groups. Pick 3 groups.', '16 in 4 groups is 4 each. 3 groups is 12.', 16],
  'divide-whole-by-unit-fraction': [4, 4, 'bar', 'How many 1/4 cups fill 1 cup? Make it.', '4 fourths make 1 whole. So 4 cups of 1/4.'],
  'unit-fraction-divided-whole': [1, 12, 'bar', 'Share 1/3 of a pan equally among 4 children. Build one share.', 'Split each third into 4 equal parts. One share is 1/12 of the whole pan.'],
  'fraction-of-length': [3, 8, 'line', 'Mark 3/8 of a meter on the line.', 'Each space is 1/8 meter. Count 3 spaces.'],
  'ruler-measurement': [5, 4, 'line', 'Mark a length of 1 1/4 inches on a ruler.', 'Each small space is 1/4 inch. Five quarter-inch spaces make 1 1/4 inches.'],
  'build-line-plots': [3, 4, 'line', 'Build a line plot for measurements in fourths.', 'Put one X above the tick for each measurement. The marks show how many measurements share a length.'],
  'read-line-plots': [5, 8, 'line', 'Use eighth-inch measurements to find the difference between the longest and shortest.', 'Read the two endpoints on the plot and subtract their lengths.'],
  'line-plot-leveling': [3, 4, 'line', 'Show how to share 3/4 liter equally among 3 cups.', 'Each cup gets 1/4 liter. Equal groups keep the total amount the same.'],
  'measurement-word-problems': [3, 4, 'bar', 'Model 1/2 liter plus 1/4 liter.', '1/2 liter is 2/4 liter. Add 1/4 liter to get 3/4 liter.'],
  'fractional-measure-addition': [3, 4, 'bar', 'Make 1/2 meter + 1/4 meter.', '1/2 = 2/4. 2/4 + 1/4 = 3/4.'],
  'fractional-unit-conversions': [3, 4, 'line', 'Show why 3/4 hour is 45 minutes.', 'One hour is 60 minutes. Three of four equal parts is 45 minutes.'],
  'fractional-sharing': [3, 4, 'bar', '3 loaves are shared fairly by 4 friends. Build how much one friend gets.', 'Each friend gets 3/4 of a loaf.'],
  'fraction-as-division': [5, 4, 'bar', '5 pizzas are shared fairly by 4 friends. Build how much one friend gets.', '5 ÷ 4 = 5/4. That is 1 1/4 each.'],
  'fraction-probability': [2, 8, 'bar', 'A spinner has 8 equal parts. 2 are blue. Make the chance of blue.', '2 blue parts out of 8 is 2/8.'],
  'fraction-of-area': [3, 8, 'bar', 'A tile has 8 equal parts. Shade 3.', '8 equal parts. 3 shaded is 3/8.'],
  'equivalent-number-line': [2, 3, 'line', 'Mark 2/3 on the line. 4/6 lands on the same spot.', 'Each third is 2 sixths. So 2/3 = 4/6.'],
  'fraction-recipes': [6, 8, 'bar', 'A recipe uses 3/8 cup of milk. Double it. Make it in eighths.', '3/8 + 3/8 = 6/8 cup.'],
  'fractions-to-percent': [75, 100, 'bar', 'Make 75%.', 'Percent means out of 100. 75% = 75/100.'],
  'percent-to-fraction': [60, 100, 'bar', 'Make 60% as a fraction.', '60% means 60 out of 100: 60/100.'],
  'decimal-fraction-equivalence': [7, 10, 'bar', 'Make 0.7 using tenths.', '0.7 means 7 tenths. That is also 70/100.'],
  'multi-step-fraction-stories': [2, 5, 'bar', 'A garden is 2/5 planted. Plant 1/5 more. Make the part still empty.', '2/5 + 1/5 = 3/5 planted. 5/5 − 3/5 = 2/5 empty.'],
};

const EXTENSION_TRANSFERS: Record<string, { n: number; d: number; prompt: string; reason: string; kind?: LearningModel['kind']; total?: number }> = {
  'whole-numbers-as-fractions': { n: 8, d: 4, prompt: 'Build 8/4. How many whole bars does it fill?', reason: 'Four fourths fill each whole. Eight fourths fill 2 wholes.' },
  'compare-decimals': { n: 25, d: 100, prompt: 'Build 0.25 with hundredths. Compare it to 0.3.', reason: '0.25 is 25 hundredths. 0.3 is 30 hundredths, so 0.25 is smaller.' },
  'unit-fraction-multiples': { n: 7, d: 5, prompt: 'Put 7 pieces of 1/5 together. Build the total.', reason: 'Seven fifths are 7/5, or 1 and 2/5.' },
  'ruler-measurement': { n: 7, d: 4, kind: 'line', prompt: 'A craft stick is 1 3/4 inches long. Mark it on the ruler.', reason: 'Seven quarter-inch spaces make 1 and 3/4 inches.' },
  'build-line-plots': { n: 4, d: 8, kind: 'line', prompt: 'Plot the measurements 1/8, 4/8, 4/8 and 7/8 inch.', reason: 'Each X is one measured object. Stack Xs when measurements match.' },
  'read-line-plots': { n: 6, d: 8, kind: 'line', prompt: 'The shortest mark is 1/8 inch and the longest is 7/8 inch. Find their difference.', reason: '7/8 − 1/8 = 6/8 inch.' },
  'line-plot-leveling': { n: 1, d: 4, kind: 'line', prompt: 'Three beakers hold 1/2, 1/4 and 0 liters. Share the total equally.', reason: 'The total is 3/4 liter. Split it among 3 beakers: 1/4 liter each.' },
  'measurement-word-problems': { n: 5, d: 6, prompt: 'A bottle holds 1/2 liter of water. Add 1/3 liter. How much is there now?', reason: 'Rename 1/2 as 3/6 and 1/3 as 2/6. Together they make 5/6 liter.' },
  'add-unlike-fractions': { n: 5, d: 6, prompt: 'Build 1/2 + 1/3 using sixths.', reason: '1/2 is 3/6 and 1/3 is 2/6. The sum is 5/6.' },
  'mixed-unlike-operations': { n: 11, d: 6, prompt: 'Build 2 1/2 − 2/3 using sixths.', reason: '2 1/2 is 15/6 and 2/3 is 4/6. The difference is 11/6, or 1 5/6.' },
  'estimate-fraction-operations': { n: 11, d: 12, kind: 'line', prompt: 'Estimate 3/4 + 1/6. Is it more or less than 1?', reason: '3/4 is 9/12 and 1/6 is 2/12. The sum is 11/12, just less than 1.' },
  'fractional-side-area': { n: 3, d: 8, prompt: 'A rectangle is 3/4 unit by 1/2 unit. Find its area.', reason: 'Three fourths times one half is 3/8 square unit.' },
  'multiplication-scaling': { n: 2, d: 3, kind: 'set', total: 18, prompt: 'Build 2/3 of 18. Is it less than or more than 18?', reason: 'Two of three equal groups is 12, less than 18.' },
  'multiply-mixed-numbers': { n: 15, d: 6, prompt: 'Build 1 1/2 × 1 2/3 square units.', reason: '3/2 × 5/3 = 15/6, or 2 1/2 square units.' },
  'unit-fraction-divided-whole': { n: 1, d: 15, prompt: 'Share 1/5 of a tray among 3 children. Build one share.', reason: 'Split each fifth into 3 equal pieces. One share is 1/15 of the tray.' },
  'fractional-unit-conversions': { n: 1, d: 2, kind: 'line', prompt: 'Show why 1/2 foot is 6 inches.', reason: 'One foot is 12 inches. Half of 12 inches is 6 inches.' },
  'simplify-fractions': { n: 2, d: 3, prompt: 'A strip is 10/15 colored. Make it in simplest form.', reason: 'Divide the numerator and denominator by 5. 10/15 = 2/3.' },
  'equivalent-missing-both': { n: 9, d: 15, prompt: 'Show 3/5 using fifteenths.', reason: 'Each fifth is 3 fifteenths. 3/5 = 9/15.' },
  'compare-unlike-fractions': { n: 3, d: 5, prompt: 'Which is longer, 3/5 or 1/2 of a race? Make it.', reason: 'Use tenths: 3/5 = 6/10 and 1/2 = 5/10.' },
  'order-unlike-fractions': { n: 5, d: 6, prompt: 'Which is biggest: 1/3, 3/4 or 5/6? Make it.', reason: 'Use twelfths: 4/12, 9/12, 10/12. So 5/6 is biggest.' },
  'subtract-unlike-fractions': { n: 2, d: 6, prompt: 'A jug is 5/6 full. Pour out 1/2. Make what is left.', reason: '1/2 = 3/6. 5/6 − 3/6 = 2/6.' },
  'add-mixed-numbers': { n: 13, d: 6, prompt: 'Walk 1 1/2 km, then 2/3 km more. Make the total.', reason: '1 1/2 = 9/6 and 2/3 = 4/6. 9 + 4 = 13, so 13/6.' },
  'subtract-mixed-numbers': { n: 3, d: 4, prompt: 'A roll is 2 1/4 m. Cut off 1 1/2 m. Make what is left.', reason: '2 1/4 = 9/4 and 1 1/2 = 6/4. 9 − 6 = 3, so 3/4.' },
  'fraction-of-quantity': { n: 2, d: 3, total: 18, kind: 'set', prompt: 'Put 18 markers in 3 equal groups. Pick 2 groups.', reason: '18 in 3 groups is 6 each. 2 groups is 12.' },
  'multiply-whole-by-fraction': { n: 4, d: 3, prompt: '4 cups each hold 1/3 cup of juice. Make the total.', reason: '4 groups of 1/3 is 4/3, or 1 1/3.' },
  'multiply-fractions': { n: 6, d: 20, prompt: 'Make 2/5 of 3/4.', reason: 'Numerator: 2 × 3 = 6. Denominator: 5 × 4 = 20. So 6/20.' },
  'fraction-of-collection': { n: 2, d: 5, total: 20, kind: 'set', prompt: 'Put 20 cards in 5 equal groups. Pick 2 groups.', reason: '20 in 5 groups is 4 each. 2 groups is 8.' },
  'divide-whole-by-unit-fraction': { n: 10, d: 5, prompt: 'How many 1/5 cups fill 2 cups? Make it in fifths.', reason: 'Each cup is 5 fifths. 2 cups is 10 fifths.' },
  'fraction-of-length': { n: 5, d: 8, kind: 'line', prompt: 'Mark 5/8 of a kilometer on the line.', reason: 'Each space is 1/8. Count 5 spaces.' },
  'fractional-measure-addition': { n: 3, d: 6, prompt: 'Make 1/3 meter + 1/6 meter.', reason: '1/3 = 2/6. 2/6 + 1/6 = 3/6.' },
  'fractional-sharing': { n: 5, d: 4, prompt: '5 loaves are shared fairly by 4 friends. Build how much one friend gets.', reason: 'Each friend gets 5/4, or 1 1/4 loaves.' },
  'fraction-as-division': { n: 7, d: 3, prompt: '7 pizzas are shared fairly by 3 tables. Build how much one table gets.', reason: '7 ÷ 3 = 7/3. That is 2 1/3 each.' },
  'fraction-probability': { n: 3, d: 10, prompt: 'A spinner has 10 equal parts. 3 are blue. Make the chance of blue.', reason: '3 blue parts out of 10 is 3/10.' },
  'fraction-of-area': { n: 4, d: 6, prompt: 'A tile has 6 equal parts. Shade 4.', reason: '6 equal parts. 4 shaded is 4/6.' },
  'equivalent-number-line': { n: 4, d: 6, kind: 'line', prompt: 'Mark 4/6 on the line. Does it land on 2/3?', reason: 'Yes. 4/6 and 2/3 are the same spot.' },
  'fraction-recipes': { n: 4, d: 3, prompt: 'A recipe uses 2/3 cup of oats. Double it. Make it in thirds.', reason: '2/3 + 2/3 = 4/3, or 1 1/3 cups.' },
  'fractions-to-percent': { n: 35, d: 100, prompt: '35 out of 100 kids said yes. Make it.', reason: '35 out of 100 is 35%.' },
  'percent-to-fraction': { n: 45, d: 100, prompt: 'A score is 45%. Make it as a fraction.', reason: '45% means 45 out of 100: 45/100.' },
  'decimal-fraction-equivalence': { n: 45, d: 100, prompt: 'A battery shows 0.45. Make it in hundredths.', reason: '0.45 means 45 hundredths.' },
  'multi-step-fraction-stories': { n: 3, d: 8, prompt: 'A garden is 3/8 planted. Plant 2/8 more. Make the empty part.', reason: '3/8 + 2/8 = 5/8 planted. 3/8 is empty.' },
};

type ExtensionWorksheetMode = 'simplify' | 'equivalent' | 'compare' | 'order' | 'subtract-unlike' | 'mixed-add' | 'mixed-subtract'
  | 'quantity' | 'multiply-whole' | 'multiply' | 'sets' | 'divide' | 'measure' | 'measure-add' | 'share'
  | 'quotient' | 'probability' | 'area' | 'line' | 'recipe' | 'percent' | 'percent-inverse' | 'decimal-equivalent' | 'story'
  | 'whole-fraction' | 'decimal-compare' | 'unit-multiples' | 'ruler' | 'line-plot' | 'line-plot-read' | 'line-plot-level'
  | 'measure-context' | 'add-unlike' | 'mixed-unlike' | 'estimate' | 'fractional-area' | 'scaling' | 'mixed-multiply'
  | 'unit-divided-whole' | 'unit-conversion';
const EXTENSION_WORKSHEETS: Record<string, { mode: ExtensionWorksheetMode; context: string; n: number; d: number }> = {
  'simplify-fractions': { mode: 'simplify', context: 'paper strip', n: 3, d: 4 },
  'equivalent-missing-both': { mode: 'equivalent', context: 'recipe card', n: 2, d: 5 },
  'compare-unlike-fractions': { mode: 'compare', context: 'race track', n: 2, d: 3 },
  'order-unlike-fractions': { mode: 'order', context: 'hiking trail', n: 1, d: 2 },
  'subtract-unlike-fractions': { mode: 'subtract-unlike', context: 'water bottle', n: 3, d: 4 },
  'add-mixed-numbers': { mode: 'mixed-add', context: 'walking route', n: 1, d: 4 },
  'subtract-mixed-numbers': { mode: 'mixed-subtract', context: 'fabric roll', n: 1, d: 3 },
  'fraction-of-quantity': { mode: 'quantity', context: 'classroom supplies', n: 3, d: 5 },
  'multiply-whole-by-fraction': { mode: 'multiply-whole', context: 'juice bottles', n: 2, d: 3 },
  'multiply-fractions': { mode: 'multiply', context: 'garden plot', n: 2, d: 3 },
  'fraction-of-collection': { mode: 'sets', context: 'sports cards', n: 3, d: 4 },
  'divide-whole-by-unit-fraction': { mode: 'divide', context: 'measuring cup', n: 1, d: 4 },
  'fraction-of-length': { mode: 'measure', context: 'ribbon', n: 3, d: 8 },
  'fractional-measure-addition': { mode: 'measure-add', context: 'wooden boards', n: 1, d: 2 },
  'fractional-sharing': { mode: 'share', context: 'loaf of bread', n: 3, d: 4 },
  'fraction-as-division': { mode: 'quotient', context: 'pizza slices', n: 5, d: 4 },
  'fraction-probability': { mode: 'probability', context: 'color spinner', n: 2, d: 8 },
  'fraction-of-area': { mode: 'area', context: 'mosaic', n: 3, d: 8 },
  'equivalent-number-line': { mode: 'line', context: 'number line', n: 2, d: 3 },
  'fraction-recipes': { mode: 'recipe', context: 'pancake recipe', n: 3, d: 4 },
  'fractions-to-percent': { mode: 'percent', context: 'school survey', n: 3, d: 4 },
  'percent-to-fraction': { mode: 'percent-inverse', context: 'game score', n: 3, d: 5 },
  'decimal-fraction-equivalence': { mode: 'decimal-equivalent', context: 'battery meter', n: 7, d: 10 },
  'multi-step-fraction-stories': { mode: 'story', context: 'community garden', n: 2, d: 5 },
  'whole-numbers-as-fractions': { mode: 'whole-fraction', context: 'fraction bars', n: 6, d: 3 },
  'compare-decimals': { mode: 'decimal-compare', context: 'hundredths grid', n: 3, d: 10 },
  'unit-fraction-multiples': { mode: 'unit-multiples', context: 'paper strips', n: 5, d: 4 },
  'ruler-measurement': { mode: 'ruler', context: 'ruler', n: 5, d: 4 },
  'build-line-plots': { mode: 'line-plot', context: 'ribbon lengths', n: 3, d: 4 },
  'read-line-plots': { mode: 'line-plot-read', context: 'pencil lengths', n: 5, d: 8 },
  'line-plot-leveling': { mode: 'line-plot-level', context: 'beaker amounts', n: 3, d: 4 },
  'measurement-word-problems': { mode: 'measure-context', context: 'measurement stories', n: 3, d: 4 },
  'add-unlike-fractions': { mode: 'add-unlike', context: 'ribbons', n: 7, d: 12 },
  'mixed-unlike-operations': { mode: 'mixed-unlike', context: 'walking route', n: 25, d: 12 },
  'estimate-fraction-operations': { mode: 'estimate', context: 'trail lengths', n: 9, d: 10 },
  'fractional-side-area': { mode: 'fractional-area', context: 'rectangle grid', n: 1, d: 2 },
  'multiplication-scaling': { mode: 'scaling', context: 'collections', n: 3, d: 4 },
  'multiply-mixed-numbers': { mode: 'mixed-multiply', context: 'garden plot', n: 2, d: 1 },
  'unit-fraction-divided-whole': { mode: 'unit-divided-whole', context: 'pan of brownies', n: 1, d: 12 },
  'fractional-unit-conversions': { mode: 'unit-conversion', context: 'measuring tools', n: 3, d: 4 },
};
/** Put the right reason at a spot that changes from lesson to lesson (but is the same every visit). */
function arrangeReasons(key: string, right: string, wrong: [string, string]): { reasons: string[]; correctReason: number } {
  const correctReason = [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 3;
  const reasons = [...wrong];
  reasons.splice(correctReason, 0, right);
  return { reasons, correctReason };
}
export function getBuildChecks(id: string): BuildCheck[] {
  const seed = CHECKS[id]; if (!seed) throw new Error(`Missing learning checks: ${id}`);
  const [n, d, kind, prompt, explanation, total] = seed;
  const transfer = transferTarget(id, n, d, kind);
  return [
    { id: 'build', prompt, target: model(n, d, kind, total), explanation, transfer: false,
      ...arrangeReasons(`${id}:build`, explanation, ['Bigger numbers always mean a bigger fraction.', 'Only the shaded pieces need to be equal.']) },
    { id: 'transfer', prompt: transfer.prompt, target: transfer.target, explanation: transfer.reason, transfer: true,
      ...arrangeReasons(`${id}:transfer`, transfer.reason, ['Change only the denominator. The amount stays the same.', 'Count the tick marks, not the spaces.']) },
  ];
}
function transferTarget(id: string, n: number, d: number, kind: LearningModel['kind']) {
  const authored = EXTENSION_TRANSFERS[id];
  if (authored) return {
    prompt: authored.prompt, target: model(authored.n, authored.d, authored.kind ?? 'bar', authored.total), reason: authored.reason,
  };
  if (id.startsWith('sets-')) return { prompt: 'Put 20 beads in 5 equal groups. Pick 3 groups.', target: model(3, 5, 'set', 20), reason: '20 in 5 groups is 4 each. 3 groups is 3/5.' };
  if (id.includes('equivalent')) return { prompt: 'A ribbon is 3/5 colored. Show it in tenths.', target: model(6, 10), reason: '1 fifth is 2 tenths. So 3/5 = 6/10.' };
  if (id === 'add-related-fractions') return { prompt: 'Make 1/4 + 1/2 using fourths.', target: model(3, 4), reason: '1/2 = 2/4. 1 + 2 = 3, so 3/4.' };
  if (id === 'add-tenths-hundredths') return { prompt: 'Make 5/10 + 20/100 using hundredths.', target: model(70, 100), reason: '5/10 = 50/100. 50 + 20 = 70, so 70/100.' };
  if (id === 'tenths-decimals' || id === 'hundredths-decimals') return { prompt: 'Show 0.7 using tenths.', target: model(7, 10), reason: '0.7 means 7 tenths.' };
  if (id === 'compose-to-one') return { prompt: 'A recipe uses 2/5 of a bag. Make what is left.', target: model(3, 5), reason: '5/5 is a full bag. 5 − 2 = 3, so 3/5.' };
  if (id === 'subtract-like-denominators') return { prompt: 'A ribbon is 7/10 long. Cut off 3/10. Make what is left.', target: model(4, 10), reason: '7 − 3 = 4, so 4/10.' };
  if (id === 'add-like-denominators') return { prompt: 'Make 1/5 + 2/5.', target: model(3, 5), reason: '1 + 2 = 3, so 3/5.' };
  if (id === 'unit-size') return { prompt: 'Which is bigger, 1/3 or 1/6? Make it.', target: model(1, 3), reason: 'Fewer pieces means bigger pieces.' };
  if (id === 'compare-same-numerator') return { prompt: 'Which is bigger, 2/3 or 2/5? Make it.', target: model(2, 3), reason: 'Both have 2 parts. Thirds are bigger than fifths, so 2/3 is bigger.' };
  if (id === 'benchmark-half' || id === 'fraction-magnitude') return { prompt: 'Use tenths. Make 1/10 less than half.', target: model(4, 10), reason: 'Half is 5/10. One less is 4/10.' };
  if (id === 'benchmarks-zero-one') return { prompt: 'A jug is 1/6 away from full. Make it.', target: model(5, 6), reason: '6/6 is full. One less is 5/6.' };
  if (id === 'compare-same-denominator' || id === 'order-fractions') return { prompt: 'Which is longer, 2/5 or 4/5 of a meter? Make it.', target: model(4, 5), reason: 'Same size pieces. 4 is more than 2.' };
  const nextD = d === 5 ? 4 : 5; const nextN = n > d ? nextD + 2 : id === 'unit-fractions' || id === 'equal-parts' ? 1 : 3;
  return { prompt: kind === 'line' ? `Mark ${f(nextN, nextD)} on the number line.` : `A ribbon is ${f(nextN, nextD)} of a meter. Make ${f(nextN, nextD)}.`, target: model(nextN, nextD, kind),
    reason: `1 whole is ${nextD} equal parts. Count ${nextN} of them.` };
}

/** Skill-specific authored templates and varied numbers, not recycled answer choices.
    Lessons that share a skill family still get their own sheet (different question types). */
/** The lesson's 12 worksheet problems. `variant` 0 is the lesson's own sheet; 1, 2, … give the same kinds of
    questions with new numbers (used when a child redoes a finished worksheet). */
export function getWorksheet(id: string, variant = 0): WorksheetProblem[] {
  const tag = (rows: WorksheetProblem[]) => rows.map(row => {
    const bare = !row.model && !row.area && !row.rulerTask && !row.linePlotTask && !row.scaleTask;
    const picture = bare ? autoPicture(row.prompt) : null;
    return { ...row, standards: [...standardsForMission(id)], ...(picture ? { picture } : {}) };
  });
  if (!variant) return tag(buildWorksheet(id, 0));
  const key = `${id}:${variant}`;
  const cached = VARIANT_CACHE.get(key);
  if (cached) return tag(cached);
  // Keep each new row inside the lesson's own number range, and make it differ from the lesson's row when possible.
  const base = buildWorksheet(id, 0);
  const limit = Math.max(...base.map(largestBottom));
  const same = (a: WorksheetProblem, b: WorksheetProblem) => a.prompt === b.prompt && a.answer === b.answer && JSON.stringify(a.model) === JSON.stringify(b.model);
  const fits = (row: WorksheetProblem, i: number) => largestBottom(row) <= limit && !same(row, base[i]);
  const first = buildWorksheet(id, variant);
  const sheet = first.map((row, i) => {
    if (fits(row, i)) return row;
    for (let k = 1; k < 12; k++) { const alt = buildWorksheet(id, variant + k)[i]; if (fits(alt, i)) return alt; }
    return base[i];
  });
  VARIANT_CACHE.set(key, sheet);
  return tag(sheet);
}
const VARIANT_CACHE = new Map<string, WorksheetProblem[]>();
const largestBottom = (p: WorksheetProblem) => Math.max(0, ...[...`${p.prompt} ${p.answer}`.matchAll(/\d+\/(\d+)/g)].map((m) => Number(m[1])));

function buildWorksheet(id: string, variant: number): WorksheetProblem[] {
  if (!CHECKS[id]) throw new Error(`Missing worksheet: ${id}`);
  const extension = EXTENSION_WORKSHEETS[id];
  if (extension) return getExtensionWorksheet(extension, variant);
  const shift = variant % 12; // one step per redo round, so back-to-back redos never repeat a row's numbers
  // The first lessons use small denominators and an interactive bar the child copies before answering.
  const isIntroTopic = ['equal-parts', 'fraction-names', 'unit-fractions'].includes(id);
  return Array.from({ length: 12 }, (_, i) => {
    const t = (i + shift) % 12; // row in the number tables (the question type still follows i)
    // The intro list repeats every 5, so its shift cycles 1–4 (never a multiple of 5) and back-to-back redos differ.
    const d = isIntroTopic ? [3, 4, 5, 6, 2, 3, 4, 5, 6, 2, 3, 4][(i + (variant ? (variant - 1) % 4 + 1 : 0)) % 12] : [3, 4, 5, 6, 8, 10, 7, 9, 12, 4, 6, 8][t];
    const n = 1 + (i + variant) % (d - 1);
    const value = f(n, d);
    let prompt = ''; let answer = value; let hint = 'Numerator: parts you count. Denominator: equal parts in 1 whole.';
    let visual: LearningModel | undefined; let form: WorksheetProblem['form']; let denominator: number | undefined;
    let modelRequired = false; let task: BarTask | undefined; let area: AreaFigure | undefined; let areaTask: AreaTask | undefined;
    const context = ['ribbon', 'paper strip', 'rope', 'piece of tape'][i % 4];
    switch (id) {
      case 'equal-parts': {
        // Shading only appears when it means something (the part being named, or parts the child marks).
        const kind = i % 4; const later = i >= 6; // second half: same ideas, new words
        if (kind === 0) {
          prompt = later ? 'Tap each part to count it. How many equal parts make the whole bar?' : 'Tap each part to count it. How many equal parts is this bar cut into?';
          answer = String(d); visual = model(0, d); task = { kind: 'count', n: d };
          hint = 'Count every part, one at a time.';
        } else if (kind === 1) {
          // Sometimes fair, sometimes one piece is clearly bigger.
          const fair = i % 8 === 5;
          prompt = later ? 'Are all the parts of this bar the same size? Answer yes or no.' : 'Is this bar cut into equal parts? Answer yes or no.';
          answer = fair ? 'yes' : 'no'; form = 'word';
          visual = { ...model(0, d), sizes: fair ? undefined : Array.from({ length: d }, (_, k) => (k === (i % d) ? 2 : 1)) };
          hint = 'Equal parts are all the same size. Compare the pieces.';
        } else if (kind === 2) {
          prompt = later ? 'The shaded part is 1 of the equal parts. What fraction of the bar is shaded?' : 'One part is shaded. What fraction of the whole bar is it?';
          answer = f(1, d); visual = model(1, d); task = { kind: 'copy', n: 1 };
          hint = 'The denominator is how many equal parts. The shaded part is 1 of them.';
        } else {
          prompt = later ? 'Color 1 equal part of this bar. What fraction did you color?' : 'Shade 1 part of this bar. What fraction of the bar did you shade?';
          answer = f(1, d); visual = model(0, d); task = { kind: 'shade', n: 1 };
          hint = `The bar has ${d} equal parts. You shaded 1 of them.`;
        }
        // A pizza whose slices are not fair: 4 slices, but not fourths.
        if (i === 7) {
          // Redos sometimes show a fair pizza, so "no" is not always the answer.
          const fair = variant % 2 === 1 ? circleCut(d) : undefined;
          prompt = `Is this pizza cut into ${fair ? d : 4} equal slices? Answer yes or no.`; answer = fair ? 'yes' : 'no'; form = 'word'; visual = undefined; task = undefined;
          area = { cut: fair ?? 'circle-unequal' }; hint = 'Equal slices are all the same size. Is one slice bigger than the others?';
        }
        // Last four: a square whose equal parts have different shapes (same size, not always same shape).
        if (i === 8) {
          prompt = 'Are all 4 parts of this square the same size? Answer yes or no.'; answer = 'yes'; form = 'word'; visual = undefined; task = undefined;
          area = { cut: 'fourths-mixed' }; hint = 'The line cuts the right half into 2 equal triangles. Each triangle is 1/4, just like each small square.';
        } else if (i === 9) {
          prompt = 'This square is cut into 4 parts. Are they fourths? Answer yes or no.'; answer = 'no'; form = 'word'; visual = undefined; task = undefined;
          area = { cut: 'fourths-unequal' }; hint = 'Fourths must all be the same size. Compare the biggest part and the smallest part.';
        } else if (i === 10) {
          prompt = 'These parts are triangles, not squares. Are they still fourths? Answer yes or no.'; answer = 'yes'; form = 'word'; visual = undefined; task = undefined;
          area = { cut: 'fourths-triangles' }; hint = '4 triangles of the same size fill the square. Same size means fourths, whatever the shape.';
        } else if (i === 11) {
          prompt = 'How many small triangles cover the same space as the small square?'; answer = '2'; form = undefined; visual = undefined; task = undefined;
          area = { cut: 'quarter-and-triangles' }; hint = 'Each triangle is half of a small square.';
        }
        modelRequired = !!task; break;
      }
      case 'unit-fractions':
        prompt = i % 3 === 0 ? `Tap each 1/${d} piece to count it. How many 1/${d} pieces make 1 whole?` :
          i % 3 === 1 ? (i < 6 ? `${d} friends share this bar fairly. Shade one friend's share. What fraction is it?` : `Shade 1 piece. ${d} pieces make the whole bar. What fraction did you shade?`) :
          i < 6 ? 'One piece of this bar is shaded. What fraction is it?' : 'What unit fraction of this bar is shaded?';
        answer = i % 3 === 0 ? String(d) : f(1, d);
        visual = model(i % 3 === 2 ? 1 : 0, d); task = i % 3 === 0 ? { kind: 'count', n: d } : i % 3 === 1 ? { kind: 'shade', n: 1 } : { kind: 'copy', n: 1 };
        modelRequired = true;
        hint = 'A unit fraction is 1 equal piece. The denominator is how many pieces make 1 whole.';
        // A circle too: one slice of a fairly cut pizza is a unit fraction.
        if (i === 8 && circleCut(d)) {
          prompt = 'One slice of this pizza is shaded. All the slices are the same size. What unit fraction is it?'; answer = f(1, d);
          area = { cut: circleCut(d)!, shaded: [0] }; visual = undefined; task = undefined; modelRequired = false;
          hint = `Count all the slices. ${d} same-size slices make the whole pizza.`;
        }
        // Last three: one fourth of a square can look different (1 small square, or 2 triangles).
        if (i === 9) {
          prompt = 'Color 1/4 of the square. Any way that works is fine. What fraction did you color?'; answer = '1/4';
          area = { cut: 'quarter-and-triangles' }; areaTask = { n: 1, d: 4 }; visual = undefined; task = undefined; modelRequired = false;
          hint = 'The small square is 1/4. Two triangles together are also 1/4.';
        } else if (i === 10) {
          prompt = 'Color 1/4 of the square using only triangles. How many triangles did you color?'; answer = '2';
          area = { cut: 'quarter-and-triangles' }; areaTask = { n: 1, d: 4, avoid: [0] }; visual = undefined; task = undefined; modelRequired = false;
          hint = 'Each triangle is half of a small square. How many halves make the same space?';
        } else if (i === 11) {
          prompt = 'What fraction of the square is the shaded triangle?'; answer = '1/4';
          area = { cut: 'fourths-mixed', shaded: [2] }; visual = undefined; task = undefined; modelRequired = false;
          hint = 'The 4 parts are the same size, even though 2 are squares and 2 are triangles.';
        }
        break;
      case 'fraction-names':
        prompt = i % 3 === 0 ? `In ${value}, how many pieces are shaded?` :
          i % 3 === 1 ? `In ${value}, how many equal pieces make 1 whole?` :
          'What fraction of this bar model is shaded?';
        answer = i % 3 === 0 ? String(n) : i % 3 === 1 ? String(d) : value;
        visual = model(n, d); modelRequired = true;
        // The last one uses a circle: fractions name parts of any whole, not only bars.
        if (i === 11 && circleCut(d) && n < d) {
          prompt = 'What fraction of this circle is shaded?'; visual = undefined; modelRequired = false;
          area = { cut: circleCut(d)!, shaded: Array.from({ length: n }, (_, k) => k) };
          hint = 'Denominator: all the same-size slices. Numerator: the shaded slices.';
        }
        break;
      case 'unit-size':
      case 'compare-same-numerator': {
        // Pairs use the usual grade 3–4 denominators (2, 3, 4, 5, 6, 8, 10, 12).
        const pairs: [number, number][] = id === 'unit-size'
          ? [[2, 4], [3, 6], [4, 8], [2, 3], [3, 4], [6, 8], [5, 10], [4, 6], [2, 8], [6, 12], [3, 8], [5, 6]]
          : [[3, 6], [4, 8], [3, 4], [4, 6], [6, 8], [5, 10], [3, 8], [4, 10], [6, 12], [3, 5], [5, 8], [4, 5]];
        // Same numerator: numerators from 2 up to one less than the smaller denominator (2/3 … 5/6), not just 2 and 3.
        const [small, big] = pairs[t]; const top = id === 'unit-size' ? 1 : 2 + (i % Math.max(1, small - 2));
        const [first, second] = i % 4 < 2 ? [small, big] : [big, small];
        if (id === 'compare-same-numerator' && i % 3 === 1) {
          prompt = `Put <, = or > in the gap: ${f(top, first)} __ ${f(top, second)}.`; form = 'symbol';
          answer = first < second ? '>' : '<';
        } else {
          prompt = `Which is ${i % 2 ? 'smaller' : 'bigger'}, ${f(top, first)} or ${f(top, second)}?`;
          answer = f(top, i % 2 ? big : small);
        }
        hint = id === 'unit-size' ? 'More pieces in the same whole means smaller pieces.'
          : `Same numerator: ${top} parts each. More parts in the whole means smaller parts, so fewer parts means bigger parts.`; break;
      }
      case 'sets-unit-fractions':
      case 'sets-nonunit': {
        const count = id === 'sets-unit-fractions' ? 1 : Math.min(2 + i % 2, d - 1); const total = d * (2 + i % 3);
        prompt = i % 3 === 1 ? `${total} beads are shared into ${d} equal groups. How many beads are in one group?` :
          `A box has ${total} buttons. How many buttons are in ${f(count, d)} of the box?`;
        answer = String(total / d * (i % 3 === 1 ? 1 : count)); hint = `Split ${total} into ${d} equal groups first.`;
        if (i % 3 === 2) visual = model(count, d, 'set', total); break;
      }
      case 'benchmark-half': {
        const even = 4 + 2 * ((i + variant) % 5); const top = even / 2 + ((i + variant) % 2 ? 1 : -1);
        prompt = i % 3 === 0 ? `What fraction is 1/${even} less than half?` :
          i % 3 === 1 ? `Put <, = or > in the gap: ${f(top, even)} __ 1/2.` : `How much more does ${f(even / 2 - 1, even)} need to reach half?`;
        answer = i % 3 === 0 ? f(even / 2 - 1, even) : i % 3 === 1 ? (top > even / 2 ? '>' : '<') : f(1, even);
        form = i % 3 === 1 ? 'symbol' : undefined; hint = `Half of ${even} pieces is ${even / 2} pieces.`;
        if (i % 3 === 1) visual = model(top, even); break;
      }
      case 'fraction-magnitude': {
        const even = [4, 6, 8, 10, 12, 6, 8, 10, 12, 6, 10, 10][t]; const h = even / 2;
        const top = [h + 1, h, h - 1, h][i % 4];
        prompt = i % 3 === 0 ? `What fraction is 1/${even} more than half?` :
          i % 3 === 1 ? `Put <, = or > in the gap: ${f(top, even)} __ 1/2.` : `Which is closer to 1/2: ${f(h - 1, even)} or ${f(1, even)}?`;
        answer = i % 3 === 0 ? f(h + 1, even) : i % 3 === 1 ? (top > h ? '>' : top < h ? '<' : '=') : f(h - 1, even);
        form = i % 3 === 1 ? 'symbol' : undefined; hint = `Half of ${even} pieces is ${h}/${even}. Compare to that.`;
        if (i % 3 === 1) visual = model(top, even); break;
      }
      case 'benchmarks-zero-one': {
        const e = [6, 8, 10, 12][(i + variant) % 4];
        prompt = i % 3 === 0 ? `How much is missing from ${f(d - 1, d)} to make 1 whole?` :
          i % 3 === 1 ? `Is ${f(1, e)} closest to 0, 1/2 or 1?` :
          `Is ${f(e - 1, e)} closest to 0, 1/2 or 1?`;
        answer = i % 3 === 0 ? f(1, d) : i % 3 === 1 ? '0' : '1'; hint = 'Compare it to 0, 1/2 and 1. Pick the closest.'; break;
      }
      case 'number-line-basics':
      case 'number-line-points':
      case 'number-line-beyond-one': {
        const top = id === 'number-line-beyond-one' ? d + n : n;
        const basicsCount = i % 3 === 0 && id === 'number-line-basics';
        prompt = basicsCount ? `How many equal spaces from 0 to 1 make ${unitName(d)}?` :
          i % 3 === 1 ? `A frog makes ${top} ${top === 1 ? 'jump' : 'jumps'}. Each jump is 1/${d} meter. How far did it go?` : `Each whole has ${d} equal spaces. What fraction is at the dot?`;
        answer = basicsCount ? String(d) : f(top, d);
        if (!basicsCount && i % 3 !== 1) visual = model(top, d, 'line');
        hint = 'Denominator: spaces in 1 whole. Numerator: jumps from 0.'; break;
      }
      case 'compare-same-denominator':
        prompt = i % 2 ? `Put <, = or > in the gap: ${f(n, d)} __ ${f(n + 1, d)}.` : `Which is bigger, ${f(n + 1, d)} or ${f(n, d)}?`;
        if (i % 4 === 3) prompt = `Put <, = or > in the gap: ${f(n + 1, d)} __ ${f(n, d)}.`;
        answer = i % 4 === 3 ? '>' : i % 2 ? '<' : f(n + 1, d); form = i % 2 ? 'symbol' : undefined; hint = 'Same denominator means same size pieces. Compare the numerators.'; break;
      case 'order-fractions': {
        const tops = d >= 5 ? [1, Math.floor(d / 2), d - 1] : [1, 2, 3];
        // Never shown already in the asked order; later rows shift so no question repeats.
        const shown = [[2, 0, 1], [1, 2, 0], [0, 2, 1], [1, 0, 2]][(i + (i >= 8 ? 2 : 0)) % 4].map(k => f(tops[k], d));
        prompt = `Put ${shown.join(', ')} in order, ${i % 2 ? 'biggest' : 'smallest'} first.`;
        answer = (i % 2 ? [...tops].reverse() : tops).map(top => f(top, d)).join(', '); form = 'ordered'; hint = 'Same size pieces. Compare the numerators.'; break;
      }
      case 'equivalent-models':
      case 'build-equivalents':
      case 'missing-equivalent': {
        const factor = d >= 9 ? 2 : 2 + i % 3; const big = f(n * factor, d * factor);
        if (id === 'equivalent-models') {
          prompt = i % 2 ? `This bar shows ${value}. Cut every piece into ${factor}. What is the new fraction?` :
            `This bar shows ${value}. Fill the missing numerator: ${value} = ?/${d * factor}.`;
          answer = i % 2 ? big : String(n * factor); denominator = i % 2 ? d * factor : undefined;
          visual = model(n, d); hint = `Each piece becomes ${factor} pieces. Multiply the numerator and denominator by ${factor}.`;
          // The same amount, cut a different way, in a square.
          if (i === 10) {
            prompt = 'Each triangle is 1/8 of the square. Two are shaded. Fill the missing numerator: 2/8 = ?/4.'; answer = '1'; denominator = undefined;
            visual = undefined; area = { cut: 'quarter-and-triangles', shaded: [1, 2] }; hint = 'The 2 shaded triangles fill the same space as 1 small square. The small square is 1/4.';
          } else if (i === 11) {
            prompt = 'Color 1/2 of the square. How many eighths did you color?'; answer = '4'; denominator = undefined;
            visual = undefined; area = { cut: 'eighths-triangles' }; areaTask = { n: 1, d: 2 }; hint = '8 equal triangles make the square. Half of 8 is 4.';
          }
        } else if (id === 'build-equivalents') {
          prompt = i % 3 === 0 ? `Multiply the numerator and denominator of ${value} by ${factor}. What do you get?` :
            i % 3 === 1 ? `Write ${value} with a denominator of ${d * factor}.` : `Divide the numerator and denominator of ${big} by ${factor}. What do you get?`;
          answer = i % 3 === 2 ? value : big; denominator = i % 3 === 2 ? d : d * factor;
          hint = i % 3 === 2 ? `Divide the numerator and denominator by ${factor}.` : `Multiply the numerator and denominator by ${factor}.`;
        } else {
          prompt = i % 3 === 0 ? `Fill the missing numerator: ${value} = ?/${d * factor}.` :
            i % 3 === 1 ? `Fill the missing denominator: ${value} = ${n * factor}/?.` : `Fill the missing numerator: ?/${d} = ${big}.`;
          answer = String(i % 3 === 0 ? n * factor : i % 3 === 1 ? d * factor : n);
          hint = i % 3 === 2 ? `The denominator was divided by ${factor}. Divide the numerator too.` : `Do the same thing to the numerator and denominator: times ${factor}.`;
        }
        break;
      }
      case 'compose-to-one': {
        const thing = ['fence', 'wall', 'board', 'box'][i % 4];
        prompt = i % 2 ? `${value} of a ${thing} is painted. What fraction is not painted yet?` : `Complete ${value} + ? = 1.`;
        answer = f(d - n, d); hint = `1 whole is ${d}/${d}. Count the pieces left.`; break;
      }
      case 'decompose-fractions': {
        const top = Math.max(2, n); const whole = f(top, d); const first = top > 2 && i % 2 ? 2 : 1;
        prompt = i % 3 === 0 ? `How many 1/${d} pieces make ${whole}?` :
          i % 3 === 1 ? `Complete ${f(first, d)} + ? = ${whole}.` : `${top} jumps of 1/${d} make what fraction?`;
        answer = i % 3 === 0 ? String(top) : i % 3 === 1 ? f(top - first, d) : whole; hint = 'Count how many small pieces make it.'; break;
      }
      case 'improper-fractions':
        if (i % 3 === 0) {
          const top = [d + 1, d - 1, d, d + 2][i / 3];
          prompt = `Put <, = or > in the gap: ${f(top, d)} __ 1.`; answer = top > d ? '>' : top < d ? '<' : '='; form = 'symbol';
          hint = `${d}/${d} is exactly 1 whole.`;
        } else {
          prompt = i % 3 === 1 ? `Write ${f(d + n, d)} as wholes and a fraction, like 1 2/3.` : 'What fraction is shaded? Each bar is 1 whole.';
          answer = i % 3 === 1 ? `1 ${value}` : f(d + n, d); form = i % 3 === 1 ? 'mixed' : undefined;
          hint = `${d} pieces make 1 whole. Count what is left over.`;
          if (i % 3 === 2 || i < 6) visual = model(d + n, d);
        }
        break;
      case 'mixed-improper': {
        const w = i % 3 === 2 ? 2 : 1; const top = w * d + n;
        prompt = i % 2 ? `Write ${f(top, d)} as wholes and a fraction, like 1 2/3.` : `Write ${w} ${value} as a single fraction.`;
        answer = i % 2 ? `${w} ${value}` : f(top, d); form = i % 2 ? 'mixed' : undefined;
        hint = `${d} pieces make 1 whole. ${w === 2 ? `2 wholes is ${2 * d}/${d}.` : 'Count what is left over.'}`; if (i < 4) visual = model(top, d); break;
      }
      case 'add-like-denominators':
      case 'subtract-like-denominators': {
        const add = id.startsWith('add'); const b = n > 2 && i % 2 ? 2 : 1; const a = add ? Math.max(1, Math.min(n, d - b)) : Math.min(n + b, d);
        const result = add ? a + b : a - b;
        prompt = i % 3 === 2 ? (add ? `A ${context} is ${f(a, d)} meter long. Add ${f(b, d)} meter more. How long is it now?` :
          `A ${context} is ${f(a, d)} meter long. Cut off ${f(b, d)} meter. How much is left?`) :
          `${f(a, d)} ${add ? '+' : '−'} ${f(b, d)} = ?`;
        answer = f(result, d); hint = 'Same size pieces. Add or take away the numerators. The denominator stays.';
        if (i % 3 === 1) visual = model(a, d); break;
      }
      case 'add-related-fractions': {
        const [small, large] = ([[2, 4], [3, 6], [4, 8], [2, 6], [2, 8], [3, 12], [2, 10], [4, 12], [5, 10], [2, 12], [6, 12], [3, 9]] as const)[t];
        prompt = i % 2 ? `Sam walks 1/${small} mile, then 1/${large} mile more. How far in all?` : `A recipe uses 1/${small} cup and another 1/${large} cup. How much in all?`;
        answer = f(large / small + 1, large); hint = `Change 1/${small} into ${unitName(large)} first.`; break;
      }
      case 'add-tenths-hundredths': {
        const a = [3, 6, 2, 5, 4, 7, 1, 8, 4, 2, 3, 5][t]; const b = [4, 0, 15, 7, 0, 25, 6, 0, 35, 9, 0, 45][t];
        prompt = i % 3 === 0 ? `${f(a, 10)} + ${f(b, 100)} = ?` : i % 3 === 1 ? `Change ${f(a, 10)} into hundredths.` : `Write ${f(a, 10)} + ${f(b, 100)} as a decimal.`;
        answer = i % 3 === 0 ? f(10 * a + b, 100) : i % 3 === 1 ? f(10 * a, 100) : ((10 * a + b) / 100).toFixed(2);
        denominator = i % 3 === 1 ? 100 : undefined; form = i % 3 === 2 ? 'decimal' : undefined;
        hint = `Each tenth is 10 hundredths, so ${f(a, 10)} = ${f(10 * a, 100)}.`; break;
      }
      case 'tenths-decimals':
      case 'hundredths-decimals': {
        const base = id.startsWith('tenths') ? 10 : 100; const top = id.startsWith('tenths') ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 6, 8][t] : [8, 12, 25, 40, 63, 75, 9, 30, 50, 81, 90, 99][t];
        const dec = (top / base).toFixed(base === 10 ? 1 : 2);
        prompt = i % 3 === 0 ? `Write ${f(top, base)} as a decimal.` : i % 3 === 1 ? `Write ${dec} as a fraction.` :
          `A meter strip has ${base} equal parts. ${top} are colored. Write the colored part as a decimal.`;
        answer = i % 3 === 1 ? f(top, base) : dec; form = i % 3 === 1 ? undefined : 'decimal';
        hint = base === 10 ? 'One decimal place means tenths.' : 'Two decimal places means hundredths, like 0.08.';
        if (i % 3 === 2) visual = model(top, base); break;
      }
      default: throw new Error(`No authored worksheet for ${id}`);
    }
    // Older bar worksheets: "copy the shaded bar".
    if (modelRequired && !task && visual?.kind === 'bar') task = { kind: 'copy', n: visual.n };
    return { id: `w${i + 1}`, prompt, answer, hint, model: visual, modelRequired, task, form, denominator, ...(area ? { area } : {}), ...(areaTask ? { areaTask } : {}) };
  });
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
/** "2 1/4", "3" or "3/4": a mixed number only when there is a whole part. */
const mixedName = (top: number, bottom: number) => {
  const whole = Math.floor(top / bottom); const part = top % bottom;
  return whole && part ? `${whole} ${part}/${bottom}` : whole ? String(whole) : `${part}/${bottom}`;
};
// Fractions whose decimal and percent are exact (no rounding for kids).
const EXACT: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 10], [7, 10], [3, 5], [4, 5], [1, 10], [9, 10], [1, 20]];
const SIMPLE: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 6], [5, 6], [3, 8], [3, 10], [5, 12], [7, 10]];

/** Worksheets for the later (extension) lessons: exact math, grade-friendly numbers, a hint for each skill. */
function getExtensionWorksheet(spec: { mode: ExtensionWorksheetMode; context: string; n: number; d: number }, variant = 0): WorksheetProblem[] {
  const shift = variant % 12;
  return Array.from({ length: 12 }, (_, i) => {
    const tr = (i + shift) % 12; // row in the number tables (the question type still follows i)
    const [n, d] = SIMPLE[tr]; const k = 2 + (i + variant) % 3;
    let prompt = ''; let answer = f(n, d); let hint = '';
    let form: WorksheetProblem['form']; let visual: LearningModel | undefined; let denominator: number | undefined;
    let area: AreaFigure | undefined; let areaTask: AreaTask | undefined;
    let rulerTask: WorksheetProblem['rulerTask']; let linePlotTask: WorksheetProblem['linePlotTask'];
    let scaleTask: WorksheetProblem['scaleTask']; let modelRequired = false; let task: BarTask | undefined;
    switch (spec.mode) {
      case 'simplify':
        prompt = `Write ${f(n * k, d * k)} in simplest form.`; denominator = d; visual = model(n * k, d * k);
        hint = 'Find a number that divides the numerator and denominator. Divide both by it.'; break;
      case 'equivalent':
        prompt = i % 2 ? `Write ${f(n, d)} with a denominator of ${d * k}.` : `Fill the missing numerator: ${f(n, d)} = ?/${d * k}.`;
        answer = i % 2 ? f(n * k, d * k) : String(n * k); denominator = i % 2 ? d * k : undefined;
        hint = `The bottom was multiplied by ${k}. Multiply the numerator by ${k} too.`; break;
      case 'compare': {
        const [a, b, c, e] = ([[1, 2, 2, 5], [2, 3, 3, 4], [3, 4, 2, 3], [1, 3, 2, 6], [3, 5, 3, 4], [5, 6, 5, 8], [2, 5, 1, 3], [3, 8, 1, 2], [4, 6, 2, 3], [7, 10, 3, 5], [2, 5, 2, 3], [5, 8, 3, 4]] as const)[tr];
        prompt = `Put <, = or > in the gap: ${f(a, b)} __ ${f(c, e)}.`;
        answer = a * e > c * b ? '>' : a * e < c * b ? '<' : '='; form = 'symbol';
        hint = a === c ? `Same numerator: ${a} parts each. Fewer parts in the whole means bigger parts.` : 'Give both fractions the same denominator. Then compare the numerators.'; break;
      }
      case 'order': {
        const triples: [number, number][][] = [
          [[1, 2], [1, 4], [2, 3]], [[3, 4], [1, 3], [1, 2]], [[2, 5], [1, 2], [1, 10]], [[5, 6], [2, 3], [1, 2]],
          [[3, 8], [3, 4], [1, 2]], [[1, 3], [5, 6], [1, 2]], [[7, 10], [2, 5], [1, 2]], [[1, 6], [1, 2], [1, 3]],
          [[3, 5], [3, 10], [9, 10]], [[1, 4], [5, 8], [3, 8]], [[2, 3], [1, 6], [5, 12]], [[4, 5], [1, 2], [3, 10]]];
        const up = i % 2 === 0;
        const sorted = triples[tr].slice().sort((x, y) => (x[0] * y[1] - y[0] * x[1]) * (up ? 1 : -1));
        // Never show them already in the asked order.
        const shown = triples[tr].every((x, j) => x === sorted[j]) ? [triples[tr][1], triples[tr][2], triples[tr][0]] : triples[tr];
        prompt = `Put ${shown.map(([t, b]) => f(t, b)).join(', ')} in order, ${up ? 'smallest' : 'biggest'} first.`;
        answer = sorted.map(([t, b]) => f(t, b)).join(', '); form = 'ordered';
        hint = 'Compare each one to 1/2 first. Or give them all the same denominator.'; break;
      }
      case 'subtract-unlike': {
        const [a, b, c, e] = ([[3, 4, 1, 2], [5, 6, 1, 2], [7, 8, 1, 2], [5, 8, 1, 4], [5, 6, 1, 3], [9, 10, 1, 2], [7, 12, 1, 3], [3, 4, 1, 8], [2, 3, 1, 6], [7, 10, 1, 5], [11, 12, 1, 4], [5, 6, 2, 3]] as const)[tr];
        const m = lcm(b, e);
        prompt = `${f(a, b)} − ${f(c, e)} = ?`; answer = f(a * (m / b) - c * (m / e), m);
        hint = `Change both to ${unitName(m)} first. Then take away the numerators.`; break;
      }
      case 'mixed-add': {
        const bottom = [4, 6, 8, 3, 5, 10, 6, 8, 4, 5, 3, 10][tr]; const whole = 1 + i % 2;
        const a = 1 + i % (bottom - 1); const b = 1 + (i + 2) % (bottom - 1);
        prompt = `${whole} ${f(a, bottom)} + ${f(b, bottom)} = ?`;
        answer = mixedName(whole * bottom + a + b, bottom); form = (a + b) % bottom ? 'mixed' : undefined;
        hint = `Add the pieces: ${a} + ${b}. If you get ${bottom} or more, make a new whole.`; break;
      }
      case 'mixed-subtract': {
        const bottom = [4, 6, 8, 3, 5, 10, 6, 8, 4, 5, 3, 10][tr]; const whole = 2 + i % 2;
        const a = 1 + i % (bottom - 1); const b = 1 + (i + 1) % (bottom - 1);
        const top = whole * bottom + a - (bottom + b);
        prompt = `${whole} ${f(a, bottom)} − 1 ${f(b, bottom)} = ?`;
        answer = mixedName(top, bottom); form = top > bottom && top % bottom ? 'mixed' : undefined;
        hint = a < b ? `${a} ${a === 1 ? 'piece is' : 'pieces are'} not enough to take away ${b}. Trade 1 whole for ${bottom}/${bottom} first.` : 'Take away the wholes. Then take away the pieces.'; break;
      }
      case 'quantity':
      case 'sets': {
        const bottom = [2, 3, 4, 5, 6, 8, 3, 4, 5, 6, 10, 4][tr]; const total = bottom * (2 + i % 4); const groups = 1 + i % (bottom - 1 || 1);
        prompt = `What is ${f(groups, bottom)} of ${total} ${spec.mode === 'sets' ? 'cards' : 'pencils'}?`;
        answer = String(total / bottom * groups); visual = i % 3 === 2 ? model(groups, bottom, 'set', total) : undefined;
        hint = `Make ${bottom} equal groups. Count ${groups} of them.`; break;
      }
      case 'share': {
        const [loaves, people] = ([[1, 2], [2, 3], [3, 4], [1, 3], [3, 5], [2, 4], [2, 5], [3, 8], [3, 2], [1, 6], [1, 4], [3, 6]] as const)[tr];
        prompt = `${loaves} ${loaves === 1 ? 'loaf is' : 'loaves are'} shared fairly by ${people} friends. How much does each friend get?`;
        // Picture: each loaf cut into one piece per friend, nothing shaded (it must not suggest 1/people).
        answer = f(loaves, people); visual = { kind: 'bar', n: 0, d: people, wholes: loaves };
        hint = `Cut each loaf into ${people} equal pieces. Each friend gets 1 piece of every loaf.`; break;
      }
      case 'multiply-whole': {
        const times = 2 + i % 4;
        prompt = `${times} × ${f(n, d)} = ?`; answer = f(times * n, d);
        hint = `${times} groups of ${f(n, d)}. Multiply the numerator by ${times}. The denominator stays.`; break;
      }
      case 'multiply': {
        const part = 2 + i % 2;
        prompt = `What is 1/${part} of ${f(n, d)}?`; answer = f(n, d * part); visual = model(n, d);
        hint = `Cut every piece into ${part}. Multiply the numerators and multiply the denominators.`; break;
      }
      case 'divide': {
        const cups = 1 + i % 4; const bottom = [2, 3, 4, 5, 6, 8, 3, 4, 5, 6, 8, 10][tr];
        prompt = `How many 1/${bottom} cup scoops fill ${cups} ${cups === 1 ? 'cup' : 'cups'}?`; answer = String(cups * bottom);
        hint = `${bottom} scoops of 1/${bottom} fill 1 cup.`; break;
      }
      case 'measure': {
        const length = d * (2 + i % 3);
        prompt = `A ribbon is ${length} meters long. How long is ${f(n, d)} of it?`; answer = String(length / d * n);
        visual = model(n, d, 'line'); hint = `Cut ${length} meters into ${d} equal parts. Count ${n} ${n === 1 ? 'part' : 'parts'}.`; break;
      }
      case 'measure-add': {
        const [a, b, c, e] = ([[1, 2, 1, 4], [1, 3, 1, 6], [1, 4, 1, 8], [1, 2, 1, 8], [2, 3, 1, 6], [1, 5, 1, 10], [1, 2, 1, 6], [3, 4, 1, 8], [1, 3, 1, 12], [2, 5, 1, 10], [1, 2, 3, 8], [1, 4, 1, 12]] as const)[tr];
        const m = lcm(b, e);
        prompt = `A board is ${f(a, b)} meter. Another is ${f(c, e)} meter. How long are they together?`; answer = f(a * (m / b) + c * (m / e), m);
        hint = `Change ${f(a, b)} into ${unitName(m)} first.`; break;
      }
      case 'quotient': {
        const pizzas = [1, 2, 3, 5, 4, 7, 2, 3, 5, 6, 1, 3][tr]; const friends = [2, 3, 4, 4, 3, 2, 5, 2, 3, 4, 4, 8][tr];
        prompt = `${pizzas} ${pizzas === 1 ? 'pizza is' : 'pizzas are'} shared fairly by ${friends} friends. How much pizza does each friend get?`;
        answer = f(pizzas, friends); visual = pizzas <= 3 ? { kind: 'bar', n: 0, d: friends, wholes: pizzas } : undefined;
        hint = `${pizzas} ÷ ${friends} is the fraction ${pizzas}/${friends}.`; break;
      }
      case 'probability': {
        const [green, total] = ([[1, 4], [2, 6], [3, 8], [3, 10], [2, 5], [5, 12], [1, 6], [5, 8], [7, 10], [3, 4], [7, 12], [4, 5]] as const)[tr];
        prompt = `A bag has ${total} marbles. ${green} ${green === 1 ? 'is' : 'are'} green. What is the chance of picking green?`;
        answer = f(green, total); visual = model(green, total, 'set', total);
        hint = 'Numerator: green marbles. Denominator: all the marbles.'; break;
      }
      case 'area': {
        const cuts = [
          { cut: 'fourths-squares' as const, whole: 'square', parts: 4 },
          { cut: 'circle-fourths' as const, whole: 'circle', parts: 4 },
          { cut: 'hexagon-sixths' as const, whole: 'hexagon', parts: 6 },
          { cut: 'rect-thirds' as const, whole: 'rectangle', parts: 3 },
          { cut: 'fourths-triangles' as const, whole: 'square', parts: 4 },
          { cut: 'circle-thirds' as const, whole: 'circle', parts: 3 },
          { cut: 'circle-halves' as const, whole: 'circle', parts: 2 },
        ]; // 7 shapes: a count that doesn't divide 12, so each redo round shows new shapes
        if (i % 6 === 5) {
          const pizza = i === 11;
          prompt = pizza ? 'This pizza is cut into 4 slices. Are the slices equal in area? Answer yes or no.' : 'On this tile pattern, are the 4 parts of the square equal in area? Answer yes or no.';
          answer = 'no'; form = 'word'; area = { cut: pizza ? 'circle-unequal' : 'fourths-unequal' };
          hint = 'Count the pieces, then compare their areas. Four pieces are not always fourths.';
        } else {
          const shape = cuts[tr % cuts.length]; const shaded = 1 + (i % (shape.parts - 1));
          const partition = shape.cut === 'fourths-squares' ? 'small squares' : shape.whole === 'circle' ? 'circle wedges' : shape.cut === 'hexagon-sixths' ? 'triangles' : shape.cut === 'rect-thirds' ? 'strips' : 'triangles';
          const setting = ['paper design', 'classroom poster', 'garden map', 'window panel', 'quilt square', 'tile pattern', 'greeting card', 'floor plan', 'art print', 'flag design', 'mosaic panel', 'shape puzzle'][i];
          prompt = `On the ${setting}, this ${shape.whole} is split into ${shape.parts} equal-area ${partition}. Color ${shaded}. What fraction of the whole is colored?`;
          answer = f(shaded, shape.parts); area = { cut: shape.cut }; areaTask = { n: shaded, d: shape.parts };
          hint = 'The denominator counts all equal-area parts. The top counts the parts you colored.';
        }
        break;
      }
      case 'line':
        prompt = `${f(n, d)} is marked on a line. Which fraction with a denominator of ${d * 2} is at the same spot?`;
        answer = f(n * 2, d * 2); denominator = d * 2; visual = model(n, d, 'line');
        hint = 'Cut every space in half. Now there are twice as many spaces and twice as many jumps.'; break;
      case 'recipe': {
        const batches = 2 + i % 2;
        prompt = `A recipe uses ${f(n, d)} cup of flour. You make ${batches} batches. How much flour do you need?`;
        answer = f(n * batches, d); hint = `${batches} batches: ${Array(batches).fill(f(n, d)).join(' + ')}. Or multiply the numerator by ${batches}.`; break;
      }
      case 'percent': {
        const [t, b] = EXACT[tr];
        prompt = `Write ${f(t, b)} as a percent.`; answer = `${(t * 100) / b}%`;
        hint = `Percent means out of 100. Change ${f(t, b)} to hundredths.`; break;
      }
      case 'percent-inverse': {
        const [t, b] = EXACT[tr]; const percent = (t * 100) / b;
        prompt = `Write ${percent}% as a fraction with a denominator of 100.`; answer = f(percent, 100); denominator = 100;
        hint = `${percent}% means ${percent} out of 100.`; break;
      }
      case 'decimal-equivalent': {
        const [t, b] = EXACT[tr];
        prompt = `Write ${f(t, b)} as a decimal.`; answer = String(t / b); form = 'decimal';
        hint = 'Change it to tenths or hundredths first. 1/2 = 5/10 = 0.5.'; break;
      }
      case 'whole-fraction': {
        const examples: { kind: 'write' | 'count' | 'one'; numerator: number; denominator: number }[] = [
          { kind: 'write', numerator: 2, denominator: 1 }, { kind: 'count', numerator: 4, denominator: 2 }, { kind: 'one', numerator: 3, denominator: 3 },
          { kind: 'write', numerator: 3, denominator: 1 }, { kind: 'count', numerator: 9, denominator: 3 }, { kind: 'one', numerator: 4, denominator: 4 },
          { kind: 'write', numerator: 4, denominator: 1 }, { kind: 'count', numerator: 16, denominator: 4 }, { kind: 'one', numerator: 6, denominator: 6 },
          { kind: 'write', numerator: 5, denominator: 1 }, { kind: 'count', numerator: 25, denominator: 5 }, { kind: 'one', numerator: 8, denominator: 8 },
        ];
        const item = examples[tr];
        if (item.kind === 'write') {
          prompt = `Write ${item.numerator} whole bars as a fraction with a denominator of 1.`; answer = `${item.numerator}/1`; visual = model(item.numerator, 1);
          hint = 'The bottom 1 means each piece is one whole.';
        } else if (item.kind === 'count') {
          prompt = `How many wholes are ${item.numerator}/${item.denominator}?`; answer = String(item.numerator / item.denominator); visual = model(item.numerator, item.denominator);
          hint = `${item.denominator}/${item.denominator} makes 1 whole. Count groups of ${item.denominator}/${item.denominator}.`;
        } else {
          prompt = `Write ${item.numerator}/${item.denominator} as a whole number.`; answer = '1'; visual = model(item.numerator, item.denominator);
          hint = 'The numerator and denominator match, so every equal part is included.';
        }
        modelRequired = true; break;
      }
      case 'decimal-compare': {
        const hundredths: [number, number][] = [[30, 25], [40, 35], [8, 12], [55, 5], [23, 32], [70, 7], [45, 50], [3, 25], [99, 90], [60, 6], [11, 10], [35, 5]];
        const [a, b] = hundredths[tr];
        const left = (a / 100).toFixed(2); const right = (b / 100).toFixed(2);
        prompt = `Compare hundredths: ${left} (${a}/100) __ ${right} (${b}/100).`; answer = a > b ? '>' : a < b ? '<' : '='; form = 'symbol';
        visual = model(a, 100); modelRequired = true;
        hint = 'Write each decimal in hundredths. Compare the hundredths digits, not how long the number looks.'; break;
      }
      case 'unit-multiples': {
        const bottom = [2, 3, 4, 5, 6, 8, 4, 5, 6, 8, 5, 6][tr]; const groups = 3 + (i % 5);
        prompt = `Write ${groups} × 1/${bottom} as one fraction.`; answer = f(groups, bottom); visual = model(groups, bottom); modelRequired = true;
        hint = `Count ${groups} copies of 1/${bottom}. The denominator stays ${bottom}; add the numerators.`; break;
      }
      case 'ruler': {
        const end = 1 + ((tr * 3 + i) % 7);
        const object = ['ribbon', 'paper strip', 'craft stick', 'bookmark', 'leaf stem', 'paintbrush', 'shoelace', 'pencil', 'card strip', 'yarn piece', 'straw', 'wooden slat'][i];
        rulerTask = { denominator: 4, wholes: 2, end };
        answer = mixedName(end, 4); form = answer.includes(' ') ? 'mixed' : undefined;
        prompt = `The blue ${object} starts at zero and ends at an unlabelled tick. Use the ruler. How long is it in inches?`;
        hint = 'Each short space is 1/4 inch. Count the spaces from zero to the strip end.'; break;
      }
      case 'line-plot': {
        const dataSets = [
          [1, 2, 2, 4], [0, 1, 3, 4, 4], [1, 1, 2, 3, 4], [0, 2, 2, 3, 4], [1, 2, 3, 3, 4], [0, 1, 1, 4],
          [1, 1, 3, 4], [0, 2, 4, 4], [2, 2, 3, 4], [0, 1, 2, 4, 4], [0, 0, 2, 3, 4], [1, 2, 4, 4],
        ];
        const values = dataSets[tr % dataSets.length]; const target = [1, 2, 3, 4][i % 4];
        linePlotTask = { denominator: 4, wholes: 1, values };
        const observations = values.map(value => f(value, 4)).join(', ');
        prompt = `Plot these ribbon lengths: ${observations} inch. How many ribbons are ${f(target, 4)} inch long?`;
        answer = String(values.filter(value => value === target).length);
        hint = 'Place one X for each measurement. Count the Xs above the length asked for.'; break;
      }
      case 'line-plot-read': {
        const dataSets = [
          [1, 2, 5, 7], [0, 3, 4, 6], [2, 2, 5, 8], [1, 4, 6, 7], [0, 2, 3, 8], [2, 4, 5, 7],
          [1, 3, 5, 8], [0, 4, 4, 7], [2, 3, 6, 8], [1, 2, 4, 6], [0, 5, 6, 8], [3, 4, 5, 7],
        ];
        const values = dataSets[tr % dataSets.length]; const difference = Math.max(...values) - Math.min(...values);
        const object = ['pencils', 'chalk pieces', 'twigs', 'ribbons', 'craft sticks', 'seedlings', 'shells', 'buttons', 'paper clips', 'leaves', 'beads', 'tiles'][i];
        linePlotTask = { denominator: 8, wholes: 1, values };
        prompt = `Plot these ${object} lengths in eighths: ${values.map(value => f(value, 8)).join(', ')} inch. What is the difference between the longest and shortest?`;
        answer = f(difference, 8); denominator = 8;
        hint = 'Find the farthest-right and farthest-left Xs. Subtract their lengths.'; break;
      }
      case 'line-plot-level': {
        const dataSets = [
          [1, 2, 3], [2, 2, 2], [0, 2, 4], [1, 3, 5], [2, 4, 6], [0, 3, 6],
          [1, 1, 4], [0, 4, 5], [3, 3, 3], [0, 1, 6], [2, 3, 5], [1, 4, 6],
        ];
        const values = dataSets[tr % dataSets.length]; const total = values.reduce((sum, value) => sum + value, 0);
        const divisor = values.length; const factor = gcd(total, divisor * 4);
        const context = ['small cups', 'jars', 'beakers', 'bottles', 'pitchers', 'tubs', 'bowls', 'flasks', 'cans', 'pots', 'glasses', 'pails'][i];
        linePlotTask = { denominator: 4, wholes: 2, values };
        prompt = `Three ${context} hold ${values.map(value => f(value, 4)).join(', ')} liter. Plot them, then share the total equally. How many liters go in each?`;
        answer = f(total / factor, (divisor * 4) / factor);
        hint = 'Add the beaker amounts, then split that total into 3 equal shares.'; break;
      }
      case 'measure-context': {
        const stories: { prompt: string; answer: string; hint: string; numerator: number; denominator: number; form?: WorksheetProblem['form'] }[] = [
          { prompt: 'A ribbon is 1/4 meter and another is 1/2 meter. How many meters long together?', answer: '3/4', hint: 'Rename 1/2 as 2/4, then add.', numerator: 3, denominator: 4 },
          { prompt: 'How many minutes are in 1/4 hour?', answer: '15', hint: 'An hour is 60 minutes. Split 60 into 4 equal groups.', numerator: 1, denominator: 4 },
          { prompt: 'A jug has 1/2 liter. You add 1/4 liter. How many liters now?', answer: '3/4', hint: 'Rename 1/2 as 2/4, then add.', numerator: 3, denominator: 4 },
          { prompt: 'A 1-kilogram bag is 3/4 full. How many grams are in it?', answer: '750', hint: '1 kilogram is 1000 grams. Find 3/4 of 1000.', numerator: 3, denominator: 4 },
          { prompt: 'How many cents are in 1/4 dollar?', answer: '25', hint: 'A dollar is 100 cents. Split 100 into 4 equal groups.', numerator: 1, denominator: 4 },
          { prompt: 'How many minutes are in 3/4 hour?', answer: '45', hint: 'An hour is 60 minutes. Find 3 of 4 equal groups.', numerator: 3, denominator: 4 },
          { prompt: 'A bottle has 1/2 liter. How many milliliters is that?', answer: '500', hint: 'A liter is 1000 milliliters. Half of 1000 is 500.', numerator: 1, denominator: 2 },
          { prompt: 'A bag weighs 1/4 kilogram. How many grams is that?', answer: '250', hint: 'A kilogram is 1000 grams. Find one fourth of 1000.', numerator: 1, denominator: 4 },
          { prompt: 'A board is 3/4 meter. Another is 1/4 meter. How many meters in all?', answer: '1', hint: 'Four fourths make one whole meter.', numerator: 4, denominator: 4 },
          { prompt: 'How many cents are in 3/4 dollar?', answer: '75', hint: 'A dollar is 100 cents. Find 3 of 4 equal groups.', numerator: 3, denominator: 4 },
          { prompt: 'A 2-liter jug is 1/4 full. How many milliliters are inside?', answer: '500', hint: 'One fourth of 2 liters is 1/2 liter. A half liter is 500 milliliters.', numerator: 1, denominator: 4 },
          { prompt: 'How many hours are in 1/2 day?', answer: '12', hint: 'A day is 24 hours. Half of 24 is 12.', numerator: 1, denominator: 2 },
        ];
        const story = stories[tr]; prompt = story.prompt; answer = story.answer; form = story.form; hint = story.hint;
        visual = model(story.numerator, story.denominator); modelRequired = true; break;
      }
      case 'add-unlike': {
        const examples: [number, number, number, number, '+' | '−'][] = [
          [1, 3, 1, 4, '+'], [1, 2, 1, 3, '+'], [3, 4, 1, 3, '−'], [2, 3, 1, 4, '+'],
          [5, 6, 1, 4, '−'], [1, 5, 1, 2, '+'], [7, 8, 1, 4, '−'], [2, 5, 1, 3, '+'],
          [3, 4, 1, 6, '+'], [5, 6, 1, 3, '−'], [1, 8, 1, 2, '+'], [4, 5, 1, 2, '−'],
        ];
        const [a, b, c, e, op] = examples[tr]; const common = lcm(b, e);
        const top = a * (common / b) + (op === '+' ? 1 : -1) * c * (common / e);
        prompt = `Rename ${f(a, b)} as ${f(a * (common / b), common)}. Then ${f(a * (common / b), common)} ${op} ${f(c, e)} = ?`;
        answer = mixedName(top, common); form = answer.includes(' ') ? 'mixed' : undefined;
        visual = model(a * (common / b), common); modelRequired = true;
        hint = `Make both fractions ${unitName(common)} first. Then ${op === '+' ? 'add' : 'subtract'} the numerators.`; break;
      }
      case 'mixed-unlike': {
        const examples: [number, number, number, number, number, number, '+' | '−'][] = [
          [1, 1, 2, 1, 1, 3, '+'], [2, 1, 3, 0, 3, 4, '+'], [1, 3, 4, 1, 1, 2, '+'],
          [2, 1, 2, 0, 1, 3, '−'], [3, 1, 4, 1, 1, 2, '−'], [2, 2, 3, 1, 1, 4, '−'],
          [1, 2, 5, 1, 1, 2, '+'], [2, 1, 6, 0, 1, 3, '+'], [3, 1, 3, 1, 3, 4, '−'],
          [1, 1, 4, 1, 1, 6, '+'], [2, 3, 5, 1, 1, 2, '−'], [1, 2, 3, 1, 1, 4, '+'],
        ];
        const [wholeA, topA, bottomA, wholeB, topB, bottomB, op] = examples[tr];
        const a = wholeA * bottomA + topA; const b = bottomA; const c = wholeB * bottomB + topB; const e = bottomB;
        const common = lcm(b, e); const result = a * (common / b) + (op === '+' ? 1 : -1) * c * (common / e);
        prompt = `Rename ${wholeA} ${f(topA, bottomA)} as ${f(a * (common / b), common)}. Then ${wholeA} ${f(topA, bottomA)} ${op} ${wholeB ? `${wholeB} ` : ''}${f(topB, bottomB)} = ?`;
        answer = mixedName(result, common); form = answer.includes(' ') ? 'mixed' : undefined;
        visual = model(a * (common / b), common); modelRequired = true;
        hint = `${op === '+' ? 'Rename both fractional parts' : 'Rename both numbers'} with the same denominator, then ${op === '+' ? 'add' : 'subtract'}.`; break;
      }
      case 'estimate': {
        const examples: [number, number, number, number, '+' | '−'][] = [
          [2, 5, 1, 2, '+'], [3, 4, 1, 2, '−'], [1, 3, 1, 4, '+'], [5, 6, 1, 4, '+'],
          [3, 8, 1, 2, '+'], [4, 5, 1, 3, '−'], [2, 3, 1, 4, '+'], [3, 5, 1, 2, '−'],
          [5, 8, 1, 4, '+'], [7, 10, 1, 3, '−'], [1, 4, 1, 2, '+'], [3, 4, 1, 3, '+'],
        ];
        const [a, b, c, e, op] = examples[tr]; const common = lcm(b, e);
        const total = a * (common / b) + (op === '+' ? 1 : -1) * c * (common / e);
        const operation = op === '+' ? 'sum' : 'difference';
        prompt = `Without finding the exact ${operation}, compare ${f(a, b)} ${op} ${f(c, e)} with 1: __ 1.`;
        answer = total < common ? '<' : '>'; form = 'symbol'; visual = model(a, b); modelRequired = true;
        hint = 'Estimate using familiar amounts such as one-half and one whole. Decide whether the result is below or above 1.'; break;
      }
      case 'fractional-area': {
        const examples: [number, number][] = [[1, 1], [1, 2], [2, 1], [2, 3], [3, 2], [1, 3], [2, 2], [3, 1], [1, 2], [2, 1], [3, 3], [2, 3]];
        const [a, c] = examples[tr]; const product = a * c;
        const surface = ['garden bed', 'quilt patch', 'poster', 'table top', 'rug', 'wall panel', 'mosaic', 'sandbox', 'floor tile', 'window panel', 'stage', 'notice board'][i];
        prompt = `A rectangular ${surface} is ${a}/3 unit by ${c}/4 unit. Color the overlapping area on the 3-by-4 grid. What is its area in square units?`;
        answer = f(product, 12); area = { cut: 'grid-3x4' }; areaTask = { n: product, d: 12 };
        hint = `The grid has 12 equal small rectangles. The overlap covers ${product} of them.`; break;
      }
      case 'scaling': {
        const examples: [number, number, number][] = [[3, 4, 12], [1, 2, 8], [5, 4, 8], [3, 2, 10], [1, 4, 20], [3, 4, 16], [5, 4, 12], [1, 2, 14], [3, 2, 8], [1, 4, 12], [3, 4, 20], [5, 4, 16]];
        const [top, bottom, whole] = examples[tr];
        scaleTask = { whole, numerator: top, denominator: bottom };
        prompt = `Move the scale slider to ${top}/${bottom}. Without multiplying, compare ${top}/${bottom} × ${whole} with ${whole}: __ ${whole}.`;
        answer = top < bottom ? '<' : top === bottom ? '=' : '>'; form = 'symbol';
        hint = 'A factor below 1 shrinks the amount. A factor of 1 keeps it the same. A factor above 1 grows it.'; break;
      }
      case 'mixed-multiply': {
        const examples: [number, number, number, number, number, number][] = [
          [1, 1, 2, 1, 1, 3], [1, 1, 2, 2, 1, 2], [2, 1, 2, 1, 1, 3], [1, 1, 3, 1, 1, 2],
          [1, 1, 4, 2, 1, 2], [2, 1, 3, 1, 1, 2], [1, 1, 2, 1, 1, 4], [1, 1, 3, 2, 1, 2],
          [2, 1, 4, 1, 1, 2], [1, 1, 5, 1, 1, 2], [1, 1, 2, 2, 1, 3], [2, 1, 5, 1, 1, 2],
        ];
        const [wa, na, da, wb, nb, db] = examples[tr]; const top = (wa * da + na) * (wb * db + nb); const bottom = da * db;
        prompt = `A rectangular garden is ${wa} ${f(na, da)} meters (${wa * da + na}/${da}) by ${wb} ${f(nb, db)} meters. What is its area?`;
        answer = mixedName(top, bottom); form = answer.includes(' ') ? 'mixed' : undefined;
        visual = model(wa * da + na, da); modelRequired = true;
        hint = 'Change each mixed number to an improper fraction. Multiply the numerators and multiply the denominators.'; break;
      }
      case 'unit-divided-whole': {
        const unitDenominator = [2, 3, 4, 5, 6, 8, 3, 4, 5, 6, 8, 2][tr]; const people = 2 + (i % 4); const resultDenominator = unitDenominator * people;
        prompt = `${people} children share 1/${unitDenominator} of a pan equally. What fraction of the whole pan does each child get?`;
        answer = f(1, resultDenominator); denominator = resultDenominator; visual = model(1, unitDenominator); modelRequired = true;
        hint = `Split the 1/${unitDenominator} piece into ${people} equal parts. Each new part is 1/${resultDenominator} of the whole.`; break;
      }
      case 'unit-conversion': {
        const conversions: { prompt: string; answer: string; numerator: number; denominator: number; hint: string }[] = [
          { prompt: 'How many inches are in 1/2 foot?', answer: '6', numerator: 1, denominator: 2, hint: '1 foot is 12 inches. Find half of 12.' },
          { prompt: 'How many inches are in 1/4 foot?', answer: '3', numerator: 1, denominator: 4, hint: '1 foot is 12 inches. Find one fourth of 12.' },
          { prompt: 'How many minutes are in 3/4 hour?', answer: '45', numerator: 3, denominator: 4, hint: '1 hour is 60 minutes. Find 3 of 4 equal groups.' },
          { prompt: 'How many minutes are in 1/2 hour?', answer: '30', numerator: 1, denominator: 2, hint: '1 hour is 60 minutes. Find half of 60.' },
          { prompt: 'How many milliliters are in 1/2 liter?', answer: '500', numerator: 1, denominator: 2, hint: '1 liter is 1000 milliliters. Find half of 1000.' },
          { prompt: 'How many milliliters are in 1/4 liter?', answer: '250', numerator: 1, denominator: 4, hint: '1 liter is 1000 milliliters. Find one fourth of 1000.' },
          { prompt: 'How many grams are in 3/4 kilogram?', answer: '750', numerator: 3, denominator: 4, hint: '1 kilogram is 1000 grams. Find 3 of 4 equal groups.' },
          { prompt: 'How many grams are in 1/2 kilogram?', answer: '500', numerator: 1, denominator: 2, hint: '1 kilogram is 1000 grams. Find half of 1000.' },
          { prompt: 'How many centimeters are in 1/2 meter?', answer: '50', numerator: 1, denominator: 2, hint: '1 meter is 100 centimeters. Find half of 100.' },
          { prompt: 'How many centimeters are in 1/4 meter?', answer: '25', numerator: 1, denominator: 4, hint: '1 meter is 100 centimeters. Find one fourth of 100.' },
          { prompt: 'How many ounces are in 1/2 pound?', answer: '8', numerator: 1, denominator: 2, hint: '1 pound is 16 ounces. Find half of 16.' },
          { prompt: 'How many hours are in 1/4 day?', answer: '6', numerator: 1, denominator: 4, hint: '1 day is 24 hours. Find one fourth of 24.' },
        ];
        const item = conversions[tr]; prompt = item.prompt; answer = item.answer; hint = item.hint;
        visual = model(item.numerator, item.denominator); modelRequired = true; break;
      }
      case 'story': {
        const [bottom, a, b] = ([[4, 1, 1], [5, 2, 1], [6, 3, 1], [8, 4, 2], [10, 5, 1], [5, 1, 2], [6, 1, 2], [8, 3, 2], [10, 2, 3], [4, 1, 2], [6, 2, 3], [12, 3, 2]] as const)[tr];
        prompt = i % 2
          ? `Mia reads ${f(a, bottom)} of a book on Monday and ${f(b, bottom)} on Tuesday. How much is left to read?`
          : `${f(a, bottom)} of a garden is planted. Then ${f(b, bottom)} more is planted. How much is still empty?`;
        answer = f(bottom - a - b, bottom); hint = `First add the two parts. Then take that away from ${bottom}/${bottom}.`; break;
      }
    }
    if (modelRequired && !task && visual?.kind === 'bar') task = { kind: 'copy', n: visual.n };
    return {
      id: `w${i + 1}`, prompt, answer, hint, model: visual, form, denominator, modelRequired, task,
      ...(area ? { area } : {}), ...(areaTask ? { areaTask } : {}),
      ...(rulerTask ? { rulerTask } : {}), ...(linePlotTask ? { linePlotTask } : {}),
      ...(scaleTask ? { scaleTask } : {}),
    };
  });
}

export function getReviewCheck(id: string, round: number): BuildCheck {
  if (EXTENSION_WORKSHEETS[id]) {
    // Alternate the lesson's two builds so a later review is not always the same one.
    const check = getBuildChecks(id)[round % 2];
    return { ...check, id: 'retention', transfer: true,
      ...arrangeReasons(`${id}:review:${round % 2}`, check.explanation, ['The whole can change. The fraction stays the same.', 'Only the numerator tells the size.']) };
  }
  if (id === 'order-fractions') {
    const d = [6, 8, 10][round % 3];
    const reason = 'Same size pieces. The most pieces is the biggest.';
    return { id: 'retention', transfer: true, prompt: `Which is longest: 2/${d}, 4/${d} or 3/${d}? Make it.`,
      target: model(4, d), ...arrangeReasons(`${id}:review:${round % 3}`, reason, ['The smallest numerator is the biggest.', 'Shade the denominator of pieces.']), explanation: reason };
  }
  if (id.includes('equivalent')) {
    const d = [3, 4, 5][round % 3]; const n = d - 1; const factor = 2 + round % 2;
    const reason = `Split every piece into ${factor}. Multiply the numerator and denominator by ${factor}.`;
    return { id: 'retention', transfer: true, prompt: `A ribbon is ${n}/${d} colored. Show it with a denominator of ${d * factor}.`,
      target: model(n * factor, d * factor), ...arrangeReasons(`${id}:review:${round % 3}`, reason, ['Change only the denominator.', 'A bigger denominator always means more.']), explanation: reason };
  }
  if (id.startsWith('sets-')) {
    const d = [4, 5, 6][round % 3]; const n = id === 'sets-unit-fractions' ? 1 : 2; const total = d * 4;
    const reason = `Put ${total} in ${d} equal groups. Pick ${n}.`;
    return { id: 'retention', transfer: true, prompt: `Put ${total} shells in ${d} equal groups. Pick ${n}/${d}.`, target: model(n, d, 'set', total),
      ...arrangeReasons(`${id}:review:${round % 3}`, reason, ['The numerator is how many groups to make.', 'Pick the denominator of shells.']), explanation: reason };
  }
  // Review is built from scratch with no picture, so skip questions that need one, already show
  // the answer (unless picking it is the skill: "Which is bigger…"), or ask for a symbol, decimal or order.
  const numeric = getWorksheet(id).filter(p => {
    const value = parseAnswer(p.answer);
    return !!value && value.d > 1 && value.n > 0 && value.n <= value.d * 3 && !p.form;
  });
  const asked = numeric.filter(p => {
    if (p.model || p.area) return false;
    const value = parseAnswer(p.answer)!;
    const shown = [...p.prompt.matchAll(/(\d+)\/(\d+)/g)].map(m => Number(m[1]) / Number(m[2]));
    return p.prompt.startsWith('Which is') || !shown.includes(value.n / value.d);
  });
  // Lessons whose questions all need a picture ("What fraction is shaded?") just ask to make the fraction.
  const variants = asked.length ? asked : numeric.map(p => ({ ...p, prompt: `Make ${p.answer}.` }));
  const problem = variants[round % variants.length];
  if (!problem) throw new Error(`No numeric review variant for ${id}`);
  const value = parseAnswer(problem.answer)!;
  const reason = problem.hint;
  const ask = problem.prompt.replace(/\s*(Type it|Type a number|Use commas)\.$/, '');
  const prompt = /^Make .+\.$/.test(ask) ? ask.replace(/\.$/, ' two ways.') : `${ask} Build the answer two ways.`;
  return { id: 'retention', transfer: true, prompt,
    target: model(value.n, value.d, id.startsWith('number-line') ? 'line' : 'bar'),
    ...arrangeReasons(`${id}:review:${round % variants.length}`, reason, ['Count the tick marks, not the spaces.', 'Only the shaded parts need to be equal.']),
    explanation: reason };
}
