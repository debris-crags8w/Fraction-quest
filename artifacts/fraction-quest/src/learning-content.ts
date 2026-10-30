import { circleCut, gridCut, type AreaFigure, type AreaTask } from './area-shapes';
import { wrongReasons } from './reason-slips';
import { standardsForMission } from './standard-catalog';
import { autoPicture } from './auto-picture';
import { execAll } from './lib/regexp';
import type { ModelSpec } from './game';
import { gardenModel } from './garden';
export type Rational = { n: number; d: number };
/** `sizes` (bars only) draws pieces of different widths, for "Is this cut into equal parts?" pictures. */
export type LearningModel = { kind: 'bar' | 'set' | 'line'; n: number; d: number; wholes: number; total?: number; sizes?: number[];
  /** Any fraction equal to n/d is right (6/12 for 1/2), where the lesson isn't about naming it one way. */ anyName?: boolean };
/** What the child does on the bar before typing: copy the shaded bar, tap each part to count it, or shade `n` parts. */
/** `say`: the instruction to show instead of "Shade n parts", when n itself would be the answer. */
export type BarTask = { kind: 'copy' | 'count' | 'shade'; n: number; say?: string;
  /** Which picture a copy task copies, when it is not "the bar above" (a picture of two bars: "top bar"). */ of?: string };
export type WorksheetProblem = {
  id: string; prompt: string; answer: string; hint: string; model?: LearningModel; modelRequired?: boolean; task?: BarTask;
  /** Shown after a right answer, so a child who guessed still hears the reason. */
  why?: string;
  /** The whole explanation read after a tap question, for a row whose hint is a question (so the hint is not repeated). */
  explain?: string;
  standards?: string[];
  form?: 'decimal' | 'mixed' | 'ordered' | 'symbol' | 'word'; denominator?: number;
  /** A square cut into pieces that may have different shapes; with `areaTask` the child colors it before answering. */
  area?: AreaFigure; areaTask?: AreaTask;
  /** Interactive measurement model: move to the unlabelled endpoint, then name the length. */
  rulerTask?: { denominator: number; wholes: number; end: number };
  /** Interactive line plot: place one X for each observation before answering. Values are tick indices. */
  linePlotTask?: { denominator: number; wholes: number; values: number[] };
  scaleTask?: { whole: number; numerator: number; denominator: number };
  /** A picture of the amounts in the prompt, for rows with no model of their own (every row shows a model). With a copy task it
      replaces the lone bar: it draws every amount compared (both decimals), and the child builds the first. */
  picture?: ModelSpec;
};
export type BuildCheck = {
  id: string; prompt: string; target: LearningModel; reasons: string[];
  correctReason: number; explanation: string; transfer: boolean;
  /** Short stage name shown above the question and in the lesson progress list. */
  stepLabel?: string;
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
  if (selected === null) return { message: 'Pick the sentence that matches your model.', correct: false };
  if (selected !== check.correctReason) return { message: 'Good try. Look at the models and choose again.', correct: false };
  if (!modelsCorrect) return { message: 'Your reason is right! Now fix the model above.', correct: true };
  return null;
}

const model = (n: number, d: number, kind: LearningModel['kind'] = 'bar', total?: number): LearningModel =>
  ({ n, d, kind, total, wholes: Math.max(1, Math.ceil(n / d)) });
const f = (n: number, d: number) => `${n}/${d}`;
const UNIT_NAMES: Record<number, string> = { 2: 'halves', 3: 'thirds', 4: 'fourths', 5: 'fifths', 6: 'sixths', 7: 'sevenths', 8: 'eighths', 9: 'ninths', 10: 'tenths', 12: 'twelfths', 15: 'fifteenths', 16: 'sixteenths' };
/** Plural name for pieces of size 1/d, e.g. 3 → "thirds". */
const unitName = (d: number) => UNIT_NAMES[d] ?? `${d}ths`;
/** One piece's name: "half", "third", "eighth". */
const unitPiece = (d: number) => (d === 2 ? 'half' : unitName(d).replace(/s$/, ''));
const dimeWord = (n: number) => `${n} ${n === 1 ? 'dime' : 'dimes'}`;
const pennyWord = (n: number) => `${n} ${n === 1 ? 'penny' : 'pennies'}`;
const tenthWord = (n: number) => `${n} ${n === 1 ? 'tenth' : 'tenths'}`;

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
    .replace(/\s*(Type it|Type a number|Use commas)\.$/, '')
    // Tap questions show the finished plot and the factor as pictures: there is no slider to move or plot to make.
    .replace(/^Move the (?:scale )?slider to \d+\/\d+\. /, '')
    .replace(/^Plot these ([a-z ]+?) lengths/, 'The line plot shows these $1 lengths')
    .replace(/\. Plot them, then share the total equally\./, '. Share the total equally.');
}

/** Believable wrong answers for a number answer (slips a child really makes), smallest-first order not implied. */
export function distractorCandidates(answer: string): string[] {
  const unit = /^(.*?\d)( [a-z]+)$/i.exec(answer);
  if (unit) return distractorCandidates(unit[1]).map((wrong) => wrong + unit[2]);
  const worded = /^(\d+) and (\d+\/\d+)$/.exec(answer); // "1 and 3/4"
  if (worded) return distractorCandidates(`${worded[1]} ${worded[2]}`).map((wrong) => wrong.replace(' ', ' and '));
  const percent = /^(\d+)%$/.exec(answer);
  if (percent) { const p = Number(percent[1]); return [`${p + 10}%`, `${p - 10}%`, `${p + 20}%`, `${p - 20}%`, `${p + 5}%`, `${p - 5}%`].filter((c) => Number(c.slice(0, -1)) > 0 && Number(c.slice(0, -1)) <= 100); }
  const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(answer);
  if (mixed) {
    const [, w, t, b] = mixed.map(Number);
    // Slips with the same-size parts (a ruler in fourths never offers eighths).
    return [`${w + 1} ${t}/${b}`, `${w - 1} ${t}/${b}`, ...(t + 1 < b ? [`${w} ${t + 1}/${b}`] : []), ...(t > 1 ? [`${w} ${t - 1}/${b}`] : []), `${w + 2} ${t}/${b}`].filter((c) => !c.startsWith('0 '));
  }
  const frac = /^(\d+)\/(\d+)$/.exec(answer);
  if (frac) {
    const [, t, b] = frac.map(Number);
    // Doubling the denominator is a real slip, but not past twelfths: no lesson teaches sixteenths.
    return [f(t, b + t), f(t + 1, b), f(b, t), ...(b * 2 <= 12 ? [f(t, b * 2)] : []), f(t + 2, b), ...(t > 1 ? [f(t - 1, b)] : []), ...(t > 2 ? [f(t - 2, b)] : []), f(t, Math.max(1, b - 1))];
  }
  if (/^\d+\.\d+$/.test(answer)) {
    // Common slips: the point in the wrong place (0.5 → 0.05 or 5.0), or one tenth or hundredth off.
    const places = answer.split('.')[1].length; const v = Number(answer); const step = 10 ** -places;
    return [(v / 10).toFixed(places + 1), (v * 10).toFixed(Math.max(1, places - 1)), (v + step).toFixed(places), (v - step).toFixed(places), (v + 2 * step).toFixed(places), (v - 2 * step).toFixed(places)];
  }
  if (/^\d+$/.test(answer)) { const whole = Number(answer); return [whole + 1, whole - 1, whole + 2, whole - 2, whole * 2, whole + 3].map(String); }
  return [];
}
/** The value of an answer like "3/4", "1 1/2", "0.25", "75%" or "6 m" (NaN when it isn't a number). */
export function answerValue(text: string): number {
  const v = parseAnswer(text.replace(/%$/, '').replace(/ and /, ' ').replace(/ [a-z]+$/i, ''));
  return v ? (v.n / v.d) * (text.trim().endsWith('%') ? 0.01 : 1) : NaN;
}

/** Two believable wrong answers that are never equal in value to the right one. The right answer lands
    smallest, middle or largest about equally often (picked from the answer itself), so "pick the middle one"
    never works. */
export function choiceDistractors(answer: string): [string, string] {
  if (/^[<=>]$/.test(answer)) return ['<', '=', '>'].filter((c) => c !== answer) as [string, string];
  if (answer.includes(',')) {
    const items = answer.split(',').map((x) => x.trim());
    return [[...items].reverse().join(', '), [items[1], items[0], ...items.slice(2)].join(', ')];
  }
  const target = answerValue(answer);
  const mode = Math.round(Math.abs(target) * 1000 + answer.length) % 3; // 0: answer smallest, 1: middle, 2: largest
  const seen = new Set<string>();
  const ok = distractorCandidates(answer).filter((c) => { const v = answerValue(c); const fresh = !seen.has(c) && Number.isFinite(v) && v >= 0 && Math.abs(v - target) > 1e-9; seen.add(c); return fresh; });
  const above = ok.filter((c) => answerValue(c) > target); const below = ok.filter((c) => answerValue(c) < target);
  const out = (mode === 0 ? [above[0], above[1]] : mode === 2 ? [below[0], below[1]] : [below[0], above[0]]).filter((c): c is string => !!c);
  for (const c of ok) if (out.length < 2 && !out.includes(c)) out.push(c);
  return [out[0], out[1]];
}

// Each skill has its own reasoning and model target; transfer uses new numbers.
const CHECKS: Record<string, [number, number, LearningModel['kind'], string, string, number?]> = {
  'equal-parts': [1, 3, 'bar', 'Cut a bar into 3 equal parts. Shade 1.', 'Each whole has 3 equal parts. Shade 1 part in the bar and mark 1 of 3 equal jumps on the number line.'],
  'fraction-names': [3, 4, 'bar', 'Make 3/4.', 'The denominator is 4. That means 4 equal parts in all. The numerator is 3. That means 3 parts are shaded.'],
  'unit-fractions': [1, 6, 'bar', 'Make 1/6. Just one part!', 'A unit fraction is just 1 equal part.'],
  'unit-size': [1, 4, 'bar', 'Which is bigger, 1/4 or 1/8? Make the bigger one.', 'Eight equal parts make smaller parts than four, so 1/8 is smaller than 1/4.'],
  'sets-unit-fractions': [1, 3, 'set', 'Put 12 dots in 3 equal groups. Pick 1 group.', 'Make 3 equal groups. 1 group is 1/3.', 12],
  'sets-nonunit': [2, 3, 'set', 'Put 12 dots in 3 equal groups. Pick 2 groups.', 'Make 3 equal groups. 2 groups is 2/3.', 12],
  'benchmark-half': [3, 8, 'bar', 'Which is less than 1/2: 5/8 or 3/8? Make it.', 'Half of 8 is 4. 3 is less than 4, so 3/8 is less than half.'],
  'benchmarks-zero-one': [7, 8, 'bar', 'Make a fraction 1/8 less than one whole.', '8/8 is one whole. One less is 7/8.'],
  'fraction-magnitude': [2, 6, 'bar', 'Which is closer to 1/2: 2/6 or 1/6? Make it.', 'Half of 6 is 3. 2 is 1 part away from 3, but 1 is 2 parts away. So 2/6 is closer.'],
  'number-line-basics': [2, 6, 'line', 'Cut 0 to 1 into 6 equal spaces. Make 2 jumps.', 'Count the spaces, not the tick marks.'],
  'number-line-points': [4, 6, 'line', 'Mark 4/6 on the number line.', 'The denominator is 6 equal spaces in one whole. The numerator is 4 jumps from zero.'],
  'number-line-beyond-one': [7, 4, 'line', 'Mark 1 and 3/4 on the number line.', '4/4 is one whole. 3 more fourths makes 7/4.'],
  'compare-same-denominator': [5, 8, 'bar', 'Which is bigger, 3/8 or 5/8? Make it.', 'Same size parts. 5 is more than 3.'],
  'compare-same-numerator': [3, 4, 'bar', 'Which is bigger, 3/4 or 3/8? Make it.', 'Both same-size wholes count 3 parts. Eighths are smaller because the whole is cut into more parts. So 3/8 is smaller than 3/4, and 3/4 > 3/8.'],
  'order-fractions': [3, 4, 'bar', 'Which is biggest: 1/4, 1/2 or 3/4? Make it.', '3/4 is more than half.'],
  'equivalent-models': [2, 4, 'bar', 'Show 1/2 using fourths. Split every part.', 'Split each half in 2. So 1/2 = 2/4.'],
  'build-equivalents': [4, 6, 'bar', 'Show 2/3 using sixths.', 'Split each third in 2. So 2/3 = 4/6.'],
  'missing-equivalent': [6, 8, 'bar', '3/4 = ?/8. Make it.', 'Each fourth is 2 eighths. So 3/4 = 6/8.'],
  'compose-to-one': [5, 8, 'bar', '3/8 is used. Make what is left of one whole.', '8/8 is one whole. 8 take away 3 is 5, so 5/8.'],
  'decompose-fractions': [4, 6, 'bar', 'Make 4/6 with four 1/6 parts.', 'Four 1/6 parts make 4/6.'],
  'improper-fractions': [7, 4, 'bar', 'Make 7/4.', '4/4 fills 1 bar. 3/4 more is left over.'],
  'mixed-improper': [9, 6, 'bar', 'Make 1 and 3/6 using sixths.', 'One whole is 6/6. Add 3 more to get 9/6.'],
  'whole-numbers-as-fractions': [6, 3, 'bar', 'Build 6/3 using thirds.', 'Three thirds make one whole. Six thirds make 2 wholes.'],
  'add-like-denominators': [5, 8, 'bar', 'Make 2/8 + 3/8.', 'Add the parts: 2 + 3 = 5. So 5/8.'],
  'subtract-like-denominators': [3, 6, 'bar', 'Make 5/6 − 2/6.', 'Take away 2 parts: 5 − 2 = 3. So 3/6.'],
  'add-related-fractions': [5, 8, 'bar', 'Make 1/4 + 3/8 using eighths.', '1/4 = 2/8. 2 + 3 = 5, so 5/8.'],
  'add-unlike-fractions': [7, 12, 'bar', 'Build 1/3 + 1/4 using twelfths.', '1/3 is 4/12 and 1/4 is 3/12. Together they are 7/12.'],
  'mixed-unlike-operations': [25, 12, 'bar', 'Build 1 1/3 + 3/4 using twelfths.', '1 1/3 is 16/12 and 3/4 is 9/12. Together they are 25/12, or 2 1/12.'],
  'estimate-fraction-operations': [9, 10, 'line', 'Build 2/5 + 1/2. Is the sum less than 1?', '2/5 is a little less than 1/2. Two halves make 1, so the sum is a little less than 1.'],
  'tenths-decimals': [4, 10, 'bar', 'Make 0.4 as a fraction.', '0.4 means 4 tenths.'],
  'hundredths-decimals': [25, 100, 'bar', 'Make 0.25 as a fraction.', '0.25 means 25 hundredths.'],
  'add-tenths-hundredths': [34, 100, 'bar', 'Make 3/10 + 4/100 using hundredths.', '3/10 = 30/100. 30 + 4 = 34, so 34/100.'],
  'compare-decimals': [3, 10, 'bar', 'Build 0.3 with tenths. Then compare it to 0.25.', '0.30 is 30 hundredths. 30 hundredths are more than 25 hundredths.'],
  'compare-decimals-grid': [70, 100, 'bar', 'Build 0.7 with hundredths. Then compare it to 0.07.', '0.7 is 70 hundredths and 0.07 is 7 hundredths. 70 hundredths are more.'],
  'simplify-fractions': [3, 4, 'bar', 'Make 6/8 in simplest form.', 'Divide the numerator and denominator by 2. 6/8 = 3/4.'],
  'equivalent-missing-both': [4, 10, 'bar', 'Show 2/5 using tenths.', 'Multiply the numerator and denominator by 2. 2/5 = 4/10.'],
  'compare-unlike-fractions': [5, 6, 'bar', 'Which is bigger, 3/4 or 5/6? Make it.', 'Use twelfths: 3/4 = 9/12 and 5/6 = 10/12.'],
  'order-unlike-fractions': [3, 4, 'bar', 'Which is biggest: 1/2, 2/3 or 3/4? Make it.', 'Use 1/2 as a benchmark, then rename the fractions in twelfths. 6/12, 8/12, and 9/12 show that 3/4 is biggest.'],
  'subtract-unlike-fractions': [1, 4, 'bar', 'Make 3/4 − 1/2.', '1/2 = 2/4. 3/4 − 2/4 = 1/4.'],
  'add-mixed-numbers': [11, 4, 'bar', 'Make 1 1/4 + 1 2/4.', '1 + 1 = 2. 1/4 + 2/4 = 3/4. So 2 3/4, or 11/4.'],
  'subtract-mixed-numbers': [2, 3, 'bar', 'Make 2 1/3 − 1 2/3.', '2 1/3 = 7/3 and 1 2/3 = 5/3. 7 − 5 = 2, so 2/3.'],
  'fraction-of-quantity': [3, 5, 'set', 'Put 20 dots in 5 equal groups. Pick 3 groups.', '20 in 5 groups is 4 each. 3 groups is 12.', 20],
  'multiply-whole-by-fraction': [3, 2, 'bar', 'Make 3 × 1/2.', '3 groups of 1/2 is 3/2, or 1 1/2.'],
  'unit-fraction-multiples': [5, 4, 'bar', 'Put 5 parts of 1/4 together. Build the total.', 'Five copies of 1/4 are 5/4, or 1 1/4.'],
  'multiply-fractions': [3, 8, 'bar', 'Make 1/2 of 3/4.', 'Cut each fourth in half. Half of 3/4 is 3/8.'],
  'fraction-times-fraction': [8, 15, 'bar', 'Make 2/3 × 4/5.', '2 of 3 rows and 4 of 5 columns overlap on 8 of 15 parts. So 2/3 × 4/5 = 8/15.'],
  'fractional-side-area': [1, 2, 'bar', 'Build the area of a rectangle that is 2/3 unit by 3/4 unit.', 'Two columns by three rows cover 6 of 12 equal squares. 6/12 is 1/2 square unit.'],
  'multiplication-scaling': [3, 4, 'set', 'Build 3/4 of 12. Is the answer less or more than 12?', 'Three of four equal groups is 9. Multiplying 12 by 3/4 makes a smaller amount. ', 12],
  'bigger-or-smaller': [10, 4, 'bar', 'Make 5/4 × 2. Is it more or less than 2?', '5/4 is more than 1, so 5/4 × 2 is more than 2. It is 10/4.'],
  'multiply-mixed-numbers': [12, 6, 'bar', 'A rectangle is 1 1/2 units by 1 1/3 units. Build its area.', 'The rectangle has 3 half-unit rows and 4 third-unit columns: 12 sixths, or 2 square units.'],
  'fraction-of-collection': [3, 4, 'set', 'Put 16 cards in 4 equal groups. Pick 3 groups.', '16 in 4 groups is 4 each. 3 groups is 12.', 16],
  'divide-whole-by-unit-fraction': [4, 4, 'bar', 'How many 1/4-cup scoops fill 1 cup? Make it.', '4 fourths make one whole. So 4 scoops of 1/4 cup fill 1 cup.'],
  'unit-fraction-divided-whole': [1, 12, 'bar', 'Share 1/3 of a pan equally among 4 children. Build one share.', 'Split each third into 4 equal parts. One share is 1/12 of the whole pan.'],
  'dimes-and-pennies': [46, 100, 'bar', 'Make 4 dimes and 6 pennies as hundredths of a dollar.', '4 dimes are 40/100. 6 pennies are 6/100. 40 + 6 = 46, so 46/100.'],
  'plot-in-eighths': [5, 8, 'line', 'A leaf is 5/8 inch long. Show it on a line marked in eighths.', 'Split 1 inch into 8 equal spaces. Count 5 spaces from 0.'],
  'party-portions': [15, 8, 'bar', 'Each guest eats 3/8 pound. 5 guests come. Build the total.', '5 groups of 3 eighths is 15 eighths: 15/8 pounds. That is between 1 and 2.'],
  'two-step-conversions': [18, 12, 'bar', 'A ribbon is 1 1/2 feet long. Show it in inches: each bar is 1 foot of 12 inches.', '1 foot is 12 inches. 1 1/2 feet is 12 + 6 = 18 inches.'],
  'line-plot-totals': [7, 4, 'line', 'Beakers hold 1/4, 1/4, 2/4 and 3/4 liter. Show the total on a line.', '1 + 1 + 2 + 3 = 7 fourths: 7/4 liters.'],
  'share-or-fit': [1, 6, 'bar', 'Share 1/2 of a pan among 3 children. Build one share.', 'Sharing: split the half into 3 equal shares. Each share is 1/6 of the pan. Check: 3 × 1/6 = 1/2.'],
  'fraction-of-length': [3, 4, 'set', 'A ribbon is 12 meters long. Cut it into 4 equal parts. Pick 3 parts.', '12 ÷ 4 = 3 meters in each part. 3 parts is 9 meters.', 12],
  'ruler-measurement': [5, 4, 'line', 'Mark a length of 1 1/4 inches on a ruler.', 'Each small space is 1/4 inch. Five quarter-inch spaces make 1 1/4 inches.'],
  'build-line-plots': [3, 4, 'line', 'Ribbons are 1/4, 3/4 and 3/4 inch long. Mark where 2 Xs go.', 'Put one X above the tick for each measurement. Two ribbons are 3/4 inch, so 3/4 gets 2 Xs.'],
  'read-line-plots': [5, 8, 'line', 'The shortest pencil is 1/8 inch and the longest is 6/8 inch. Find their difference.', 'Read the two endpoints on the plot and subtract their lengths: 6/8 − 1/8 = 5/8.'],
  'line-plot-leveling': [1, 2, 'line', 'Share 1 1/2 liters equally among 3 cups. Show one cup.', '1 1/2 liters is 3 halves. Each cup gets 1/2 liter. Equal shares keep the total the same.'],
  'measurement-word-problems': [3, 4, 'bar', 'Model 1/2 liter plus 1/4 liter.', '1/2 liter is 2/4 liter. Add 1/4 liter to get 3/4 liter.'],
  'fractional-measure-addition': [3, 4, 'bar', 'Make 1/2 meter + 1/4 meter.', '1/2 = 2/4. 2/4 + 1/4 = 3/4.'],
  'fractional-unit-conversions': [3, 4, 'line', 'Show why 3/4 hour is 45 minutes.', 'One hour is 60 minutes. Three of four equal parts is 45 minutes.'],
  'fractional-sharing': [3, 4, 'bar', '3 loaves are shared fairly by 4 friends. Build how much one friend gets.', 'Each friend gets 3/4 of a loaf.'],
  'fraction-as-division': [5, 4, 'bar', 'Make 5 ÷ 4 as a fraction.', '5 ÷ 4 = 5/4. That is 1 1/4.'],
  'fraction-probability': [2, 8, 'bar', 'A spinner has 8 equal parts. 2 are blue. Make the chance of blue.', '2 blue parts out of 8 is 2/8.'],
  'fraction-of-area': [3, 8, 'bar', 'A tile has 8 equal parts. Shade 3.', '8 equal parts. 3 shaded is 3/8.'],
  'equivalent-number-line': [2, 3, 'line', 'Mark 2/3 on the line. 4/6 lands on the same spot.', 'Each third is 2 sixths. So 2/3 = 4/6.'],
  'fraction-recipes': [6, 8, 'bar', 'A recipe uses 3/8 cup of milk. Double it. Make it in eighths.', '3/8 + 3/8 = 6/8 cup.'],
  'fractions-to-percent': [75, 100, 'bar', 'Write 3/4 in hundredths to find its percent. Make it.', '4 × 25 = 100, so 3 × 25 = 75. 3/4 = 75/100 = 75%.'],
  'percent-to-fraction': [60, 100, 'bar', 'Make 60% as a fraction.', '60% means 60 out of 100: 60/100.'],
  'decimal-fraction-equivalence': [25, 100, 'bar', 'Write 1/4 in hundredths. Make it.', 'Multiply top and bottom by 25: 1/4 = 25/100. 25 hundredths is 0.25.'],
  'multi-step-fraction-stories': [2, 5, 'bar', 'A garden is 2/5 planted. Plant 1/5 more. Make the part still empty.', '2/5 + 1/5 = 3/5 planted. 5/5 − 3/5 = 2/5 empty.'],
  'find-the-whole': [4, 4, 'set', '3 stickers are 1/4 of a pack. Build the whole pack.', '1/4 is 1 of 4 equal groups, so each group has 3. 4 groups of 3 is 12 stickers.', 12],
  'spot-the-mistake': [3, 4, 'bar', 'Sam says 1/4 + 2/4 = 3/8. Make the right answer.', 'Fourths plus fourths make fourths. 1/4 + 2/4 = 3/4.'],
  'fraction-of-remainder': [1, 3, 'bar', 'Spend 1/3 of your money. Then spend 1/2 of the rest. Make what is left.', '2/3 is left after step 1. Half of 2/3 is 1/3.'],
  'divide-fractions': [6, 8, 'bar', 'How many 1/8s fit in 3/4? Make 3/4 in eighths.', '3/4 = 6/8. So 6 parts of 1/8 fit.'],
};

const EXTENSION_TRANSFERS: Record<string, { n: number; d: number; prompt: string; reason: string; kind?: LearningModel['kind']; total?: number }> = {
  'decompose-fractions': { n: 5, d: 8, prompt: 'Make 5/8 as 2/8 + 3/8.', reason: '2 eighths and 3 eighths make 5 eighths: 5/8.' },
  'improper-fractions': { n: 7, d: 3, prompt: 'Pip pours 7 one-third cups of water. Build how much that is.', reason: '7 thirds is 7/3. 3/3 is one cup, so it is 2 cups and 1 third more.' },
  'mixed-improper': { n: 11, d: 4, prompt: 'Make 2 and 3/4 using fourths.', reason: 'Each whole is 4/4. 2 wholes are 8/4. 3 more fourths make 11/4.' },
  'dimes-and-pennies': { n: 23, d: 100, prompt: 'Make 2 dimes and 3 pennies as hundredths of a dollar.', reason: '2 dimes are 20/100. 3 pennies are 3/100. Together: 23/100.' },
  'plot-in-eighths': { n: 3, d: 8, kind: 'line', prompt: 'A bug crawls 3/8 inch. Show it on a line marked in eighths.', reason: 'Split 1 inch into 8 equal spaces. Count 3 spaces from 0.' },
  'party-portions': { n: 9, d: 4, prompt: 'Each child eats 3/4 of a sandwich. 3 children come. Build the total.', reason: '3 groups of 3 fourths is 9 fourths: 9/4 sandwiches, between 2 and 3.' },
  'line-plot-totals': { n: 5, d: 4, kind: 'line', prompt: 'Snails crawl 1/4, 2/4 and 2/4 inch. Show the total on a line.', reason: '1 + 2 + 2 = 5 fourths: 5/4 inches.' },
  'two-step-conversions': { n: 9, d: 12, prompt: 'A pencil is 3/4 foot long. Show it in inches, 12 to a foot.', reason: '1/4 foot is 3 inches. 3/4 foot is 9 inches, so 9/12 of a foot.' },
  'whole-numbers-as-fractions': { n: 8, d: 4, prompt: 'Build 8/4. How many whole bars does it fill?', reason: 'Four fourths fill each whole. Eight fourths fill 2 wholes.' },
  'compare-decimals': { n: 25, d: 100, prompt: 'Build 0.25 with hundredths. Compare it to 0.3.', reason: '0.25 is 25 hundredths. 0.3 is 30 hundredths, so 0.25 is smaller.' },
  'compare-decimals-grid': { n: 45, d: 100, prompt: 'Build 0.45 with hundredths. Then compare it to 0.5.', reason: '0.45 is 45 hundredths. 0.5 is 50 hundredths, so 0.45 is less.' },
  'fraction-times-fraction': { n: 3, d: 8, prompt: 'Make 3/4 × 1/2.', reason: '3 of 4 rows and 1 of 2 columns overlap on 3 of 8 parts: 3/8.' },
  'bigger-or-smaller': { n: 3, d: 4, prompt: 'Make 1/2 × 3/2. Is it more or less than 3/2?', reason: '1/2 is less than 1, so the answer is less than 3/2. It is 3/4.' },
  'share-or-fit': { n: 12, d: 4, prompt: 'How many 1/4-cup scoops fill 3 cups? Make it in fourths.', reason: 'Fitting: each cup holds 4 scoops. 3 ÷ 1/4 = 12. Check: 12 × 1/4 = 3.' },
  'unit-fraction-multiples': { n: 7, d: 5, prompt: 'Put 7 parts of 1/5 together. Build the total.', reason: 'Seven fifths are 7/5, or 1 and 2/5.' },
  'ruler-measurement': { n: 7, d: 4, kind: 'line', prompt: 'A craft stick is 1 3/4 inches long. Mark it on the ruler.', reason: 'Seven quarter-inch spaces make 1 and 3/4 inches.' },
  'build-line-plots': { n: 2, d: 4, kind: 'line', prompt: 'Plot the measurements 1/4, 2/4, 2/4 and 3/4 inch.', reason: 'Each X is one measured object. Stack Xs when measurements match.' },
  'read-line-plots': { n: 6, d: 8, kind: 'line', prompt: 'The shortest mark is 1/8 inch and the longest is 7/8 inch. Find their difference.', reason: '7/8 − 1/8 = 6/8 inch.' },
  'line-plot-leveling': { n: 1, d: 4, kind: 'line', prompt: 'Three beakers hold 1/2, 1/4 and 0 liters. Share the total equally.', reason: 'The total is 3/4 liter. Split it among 3 beakers: 1/4 liter each.' },
  'measurement-word-problems': { n: 4, d: 6, prompt: 'A bottle holds 3/6 liter of water. Add 1/6 liter. How much is there now?', reason: 'Same-size parts: 3/6 + 1/6 = 4/6 liter.' },
  'add-unlike-fractions': { n: 5, d: 6, prompt: 'Build 1/2 + 1/3 using sixths.', reason: '1/2 is 3/6 and 1/3 is 2/6. The sum is 5/6.' },
  'mixed-unlike-operations': { n: 11, d: 6, prompt: 'Build 2 1/2 − 2/3 using sixths.', reason: '2 1/2 is 15/6 and 2/3 is 4/6. The difference is 11/6, or 1 5/6.' },
  'estimate-fraction-operations': { n: 7, d: 12, kind: 'line', prompt: 'Estimate 1/4 + 1/3. Is it more or less than 1?', reason: 'Both parts are less than 1/2, and two halves make 1. So the sum is less than 1.' },
  'fractional-side-area': { n: 3, d: 8, prompt: 'A rectangle is 3/4 unit by 1/2 unit. Find its area.', reason: 'Three fourths times one half is 3/8 square unit.' },
  'multiplication-scaling': { n: 2, d: 3, kind: 'set', total: 18, prompt: 'Build 2/3 of 18. Is it less than or more than 18?', reason: 'Two of three equal groups is 12, less than 18.' },
  'multiply-mixed-numbers': { n: 15, d: 6, prompt: 'A rectangle is 1 1/2 units by 1 2/3 units. Build its area.', reason: '3/2 × 5/3 = 15/6, or 2 1/2 square units.' },
  'unit-fraction-divided-whole': { n: 1, d: 15, prompt: 'Share 1/5 of a tray among 3 children. Build one share.', reason: 'Split each fifth into 3 equal parts. One share is 1/15 of the tray.' },
  'fractional-unit-conversions': { n: 1, d: 2, kind: 'line', prompt: 'Show why 1/2 foot is 6 inches.', reason: 'One foot is 12 inches. Half of 12 inches is 6 inches.' },
  'simplify-fractions': { n: 2, d: 3, prompt: 'A strip is 8/12 colored. Make it in simplest form.', reason: 'Divide the numerator and denominator by 4. 8/12 = 2/3.' },
  'equivalent-missing-both': { n: 9, d: 12, prompt: 'Show 3/4 using twelfths.', reason: 'Each fourth is 3 twelfths. 3/4 = 9/12.' },
  'compare-unlike-fractions': { n: 3, d: 5, prompt: 'Which is longer, 3/5 or 1/2 of a race? Make it.', reason: 'Use tenths: 3/5 = 6/10 and 1/2 = 5/10.' },
  'order-unlike-fractions': { n: 5, d: 6, prompt: 'Which is biggest: 1/3, 3/4 or 5/6? Make it.', reason: 'Use twelfths: 4/12, 9/12, 10/12. So 5/6 is biggest.' },
  'subtract-unlike-fractions': { n: 2, d: 6, prompt: 'A jug is 5/6 full. Pour out 1/2. Make what is left.', reason: '1/2 = 3/6. 5/6 − 3/6 = 2/6.' },
  'add-mixed-numbers': { n: 7, d: 3, prompt: 'Walk 1 2/3 miles, then 2/3 mile more. Make the total.', reason: '2/3 + 2/3 = 4/3 = 1 1/3. 1 + 1 1/3 = 2 1/3, or 7/3.' },
  'subtract-mixed-numbers': { n: 3, d: 4, prompt: 'A roll is 2 1/4 meters long. Cut off 1 2/4 meters. Make what is left.', reason: 'Trade 1 whole for 4/4: 2 1/4 = 1 5/4. 1 5/4 − 1 2/4 = 3/4.' },
  'fraction-of-quantity': { n: 2, d: 3, total: 18, kind: 'set', prompt: 'Put 18 markers in 3 equal groups. Pick 2 groups.', reason: '18 in 3 groups is 6 each. 2 groups is 12.' },
  'multiply-whole-by-fraction': { n: 4, d: 3, prompt: '4 cups each hold 1/3 cup of juice. Make the total.', reason: '4 groups of 1/3 is 4/3, or 1 1/3.' },
  'multiply-fractions': { n: 6, d: 20, prompt: 'Make 2/5 of 3/4.', reason: 'The numerator is 2 times 3, which is 6. The denominator is 5 times 4, which is 20. So the answer is 6/20.' },
  'fraction-of-collection': { n: 2, d: 5, total: 20, kind: 'set', prompt: 'Put 20 cards in 5 equal groups. Pick 2 groups.', reason: '20 in 5 groups is 4 each. 2 groups is 8.' },
  'divide-whole-by-unit-fraction': { n: 10, d: 5, prompt: 'How many 1/5 cups fill 2 cups? Make it in fifths.', reason: 'Each cup is 5 fifths. 2 cups is 10 fifths.' },
  'fraction-of-length': { n: 2, d: 3, kind: 'set', total: 9, prompt: 'A rope is 9 meters long. Show 2/3 of it.', reason: '9 ÷ 3 = 3 meters in each part. 2 parts is 6 meters.' },
  'fractional-measure-addition': { n: 3, d: 6, prompt: 'Make 1/3 meter + 1/6 meter.', reason: '1/3 = 2/6. 2/6 + 1/6 = 3/6.' },
  'fractional-sharing': { n: 5, d: 4, prompt: '5 loaves are shared fairly by 4 friends. Build how much one friend gets.', reason: 'Each friend gets 5/4, or 1 1/4 loaves.' },
  'fraction-as-division': { n: 7, d: 3, prompt: 'Make 7 ÷ 3 as a fraction.', reason: '7 ÷ 3 = 7/3. That is 2 1/3.' },
  'fraction-probability': { n: 3, d: 10, prompt: 'A spinner has 10 equal parts. 3 are blue. Make the chance of blue.', reason: '3 blue parts out of 10 is 3/10.' },
  'fraction-of-area': { n: 4, d: 6, prompt: 'A tile has 6 equal parts. Shade 4.', reason: '6 equal parts. 4 shaded is 4/6.' },
  'equivalent-number-line': { n: 4, d: 6, kind: 'line', prompt: 'Mark 4/6 on the line. Does it land on 2/3?', reason: 'Yes, 4/6 and 2/3 are the same spot.' },
  'fraction-recipes': { n: 4, d: 3, prompt: 'A recipe uses 2/3 cup of oats. Double it. Make it in thirds.', reason: '2/3 + 2/3 = 4/3, or 1 1/3 cups.' },
  'fractions-to-percent': { n: 35, d: 100, prompt: '35 out of 100 kids said yes. Make it.', reason: '35 out of 100 is 35%.' },
  'percent-to-fraction': { n: 45, d: 100, prompt: 'A score is 45%. Make it as a fraction.', reason: '45% means 45 out of 100: 45/100.' },
  'decimal-fraction-equivalence': { n: 45, d: 100, prompt: 'A battery shows 0.45. Make it in hundredths.', reason: '0.45 means 45 hundredths.' },
  'multi-step-fraction-stories': { n: 3, d: 8, prompt: 'A garden is 3/8 planted. Plant 2/8 more. Make the empty part.', reason: '3/8 + 2/8 = 5/8 planted. 3/8 is empty.' },
  'find-the-whole': { n: 3, d: 3, kind: 'set', total: 12, prompt: '4 shells are 1/3 of a bag. Build the whole bag.', reason: '1 third is 4 shells. 3 thirds is 12 shells.' },
  'spot-the-mistake': { n: 5, d: 6, prompt: 'Lee says 3/6 + 2/6 = 5/12. Make the right answer.', reason: '3 sixths and 2 sixths make 5 sixths.' },
  'fraction-of-remainder': { n: 2, d: 4, prompt: 'Eat 1/4 of a pizza. Then eat 1/3 of the rest. Make what is left.', reason: '3/4 is left. 1/3 of 3/4 is 1/4. 3/4 − 1/4 = 2/4.' },
  'divide-fractions': { n: 4, d: 6, prompt: 'How many 1/6s fit in 2/3? Make 2/3 in sixths.', reason: '2/3 = 4/6. So 4 parts of 1/6 fit.' },
};

type ExtensionWorksheetMode = 'simplify' | 'equivalent' | 'compare' | 'order' | 'subtract-unlike' | 'mixed-add' | 'mixed-subtract'
  | 'quantity' | 'multiply-whole' | 'multiply' | 'sets' | 'divide' | 'measure' | 'measure-add' | 'share'
  | 'quotient' | 'probability' | 'area' | 'line' | 'recipe' | 'percent' | 'percent-inverse' | 'decimal-equivalent' | 'story'
  | 'whole-fraction' | 'decimal-compare' | 'unit-multiples' | 'ruler' | 'line-plot' | 'line-plot-read' | 'line-plot-level'
  | 'measure-context' | 'add-unlike' | 'mixed-unlike' | 'estimate' | 'fractional-area' | 'scaling' | 'mixed-multiply'
  | 'unit-divided-whole' | 'unit-conversion' | 'whole-from-part' | 'mistake' | 'remainder' | 'divide-fractions'
  | 'decimal-grid' | 'bigger-smaller' | 'times-grid' | 'share-or-fit' | 'coins' | 'plot-eighths' | 'portions' | 'two-step-convert' | 'plot-totals';
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
  'compare-decimals-grid': { mode: 'decimal-grid', context: 'hundredths grids', n: 45, d: 100 },
  'fraction-times-fraction': { mode: 'times-grid', context: 'square grid', n: 8, d: 15 },
  'bigger-or-smaller': { mode: 'bigger-smaller', context: 'scaling machine', n: 5, d: 4 },
  'share-or-fit': { mode: 'share-or-fit', context: 'clay and cups', n: 1, d: 6 },
  'dimes-and-pennies': { mode: 'coins', context: 'coins', n: 34, d: 100 },
  'plot-in-eighths': { mode: 'plot-eighths', context: 'pebbles', n: 5, d: 8 },
  'party-portions': { mode: 'portions', context: 'party food', n: 15, d: 8 },
  'two-step-conversions': { mode: 'two-step-convert', context: 'stage ribbon', n: 30, d: 12 },
  'line-plot-totals': { mode: 'plot-totals', context: 'beakers', n: 7, d: 4 },
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
  'find-the-whole': { mode: 'whole-from-part', context: 'sticker packs', n: 1, d: 4 },
  'spot-the-mistake': { mode: 'mistake', context: 'homework check', n: 3, d: 4 },
  'fraction-of-remainder': { mode: 'remainder', context: 'pocket money', n: 1, d: 3 },
  'divide-fractions': { mode: 'divide-fractions', context: 'measuring scoops', n: 3, d: 4 },
};
/** The right answer to "Both models match. Which idea explains why?": the lesson's key idea in a few words, as short as
    the wrong choices so length gives nothing away. The full explanation shows after the build passes. */
export const REASON_IDEAS: Record<string, string> = {
  'equal-parts': 'Equal parts first, then shade',
  'fraction-names': 'Denominator: all parts. Numerator: counted',
  'unit-fractions': 'A unit fraction is 1 part',
  'unit-size': 'Larger denominator: smaller parts',
  'sets-unit-fractions': 'Make equal groups and count them',
  'sets-nonunit': 'Make equal groups and count them',
  'benchmark-half': 'Find half first, then count parts',
  'benchmarks-zero-one': 'One whole is all the parts',
  'fraction-magnitude': 'Find half first, then count parts',
  'number-line-basics': 'Count the spaces between ticks',
  'number-line-points': 'Count jumps from 0',
  'number-line-beyond-one': 'Keep jumping past one whole',
  'compare-same-denominator': 'Same-size parts: more is bigger',
  'compare-same-numerator': 'Larger denominator: smaller parts',
  'order-fractions': 'Use half or same-size parts',
  'equivalent-models': 'Split parts for a new name',
  'build-equivalents': 'Split parts for a new name',
  'missing-equivalent': 'Numerator and denominator grow together',
  'compose-to-one': 'All the parts make one whole',
  'decompose-fractions': 'Small parts add up to it',
  'improper-fractions': 'Extra parts go past one whole',
  'mixed-improper': 'A full bar is one whole',
  'add-like-denominators': 'Add numerators and keep the denominator',
  'subtract-like-denominators': 'Subtract numerators and keep the denominator',
  'add-related-fractions': 'Make the parts match first',
  'tenths-decimals': 'Decimals can name tenths',
  'hundredths-decimals': 'Decimals name tenths or hundredths',
  'add-tenths-hundredths': 'Change tenths into hundredths first',
  'unit-fraction-multiples': 'Copies of one part add up',
  'multiply-whole-by-fraction': 'Equal groups of the same part',
  'simplify-fractions': 'Divide numerator and denominator alike',
  'equivalent-missing-both': 'Change numerator and denominator alike',
  'whole-numbers-as-fractions': 'A full set makes one whole',
  'compare-unlike-fractions': 'Use same-size parts to compare',
  'order-unlike-fractions': 'Use a benchmark or same-size parts',
  'subtract-unlike-fractions': 'Make the parts match first',
  'add-unlike-fractions': 'Make the parts match first',
  'add-mixed-numbers': 'Add wholes, then parts',
  'subtract-mixed-numbers': 'Turn wholes into parts first',
  'fraction-of-quantity': 'Make equal groups and count them',
  'mixed-unlike-operations': 'Make the parts match first',
  'estimate-fraction-operations': 'Compare each part to 1/2',
  'multiply-fractions': 'Cut each part into smaller parts',
  'fraction-of-collection': 'Make equal groups and count them',
  'divide-whole-by-unit-fraction': 'Count the parts in each whole',
  'multiplication-scaling': 'Part of a group is less',
  'multiply-mixed-numbers': 'Count the small squares inside',
  'unit-fraction-divided-whole': 'Split each part into equal shares',
  'fraction-of-length': 'Count equal spaces on the line',
  'fractional-measure-addition': 'Make the parts match first',
  'ruler-measurement': 'Count the small ruler spaces',
  'build-line-plots': 'One X for each measurement',
  'read-line-plots': 'Longest minus shortest',
  'line-plot-leveling': 'Share the total equally',
  'measurement-word-problems': 'Make the parts match first',
  'fractional-unit-conversions': 'Change the whole unit first',
  'fractional-sharing': 'Take 1 part of every whole',
  'fraction-as-division': 'The fraction bar means divide',
  'fraction-probability': 'Wanted ones out of all',
  'fraction-of-area': 'Shaded parts out of equal parts',
  'fractional-side-area': 'Multiply the two side lengths',
  'equivalent-number-line': 'Same spot means same amount',
  'fraction-recipes': 'Doubling adds the amount again',
  'fractions-to-percent': 'Percent means out of 100',
  'percent-to-fraction': 'Percent means out of 100',
  'decimal-fraction-equivalence': 'Decimals name tenths or hundredths',
  'compare-decimals': 'Compare using hundredths',
  'compare-decimals-grid': 'Count hundredths of the same whole',
  'fraction-times-fraction': 'Overlap of rows and columns',
  'bigger-or-smaller': 'Compare the factor with 1',
  'share-or-fit': 'Share splits, fit counts pieces',
  'dimes-and-pennies': 'A dime is 10 hundredths',
  'plot-in-eighths': 'Same length, same spot',
  'party-portions': 'Count the parts, keep the size',
  'two-step-conversions': 'Change to the small unit first',
  'line-plot-totals': 'Add the amount of every X',
  'multi-step-fraction-stories': 'One step at a time',
  'find-the-whole': 'All the parts make the whole',
  'spot-the-mistake': 'Same-size parts keep their name',
  'fraction-of-remainder': 'Find the rest first',
  'divide-fractions': 'Count how many parts fit',
};
/** Two more ways to say each lesson's key idea, as short as REASON_IDEAS. Build it, On your own and Apply it (and each
    review round) say it a different way, so a child can't just pick the line that was right last time. */
export const MORE_REASON_IDEAS: Record<string, [string, string]> = {
  'equal-parts': ['Fair parts are all one size', 'Cut same-size parts, then shade'],
  'fraction-names': ['Bottom: all parts. Top: counted', 'Count all parts, then taken ones'],
  'unit-fractions': ['One equal part of the whole', 'Numerator 1 means one part'],
  'unit-size': ['More parts: smaller parts', 'Fewer parts: bigger parts'],
  'sets-unit-fractions': ['Split them into equal groups', 'One group of the equal groups'],
  'sets-nonunit': ['Split them into equal groups', 'The numerator says how many groups'],
  'benchmark-half': ['Compare the parts with half', 'Half of the parts is 1/2'],
  'benchmarks-zero-one': ['All the parts make one whole', 'Count the parts still missing'],
  'fraction-magnitude': ['Compare with 0, 1/2 and 1', 'Count the parts between them'],
  'number-line-basics': ['Equal spaces from 0 to 1', 'Count spaces, not tick marks'],
  'number-line-points': ['Each jump is one equal space', 'Start at 0, then count jumps'],
  'number-line-beyond-one': ['The jumps go on past 1', 'Count every jump from 0'],
  'compare-same-denominator': ['Same denominator: compare the numerators', 'Same parts, so count them'],
  'compare-same-numerator': ['Same count: bigger parts win', 'Smaller denominator: bigger parts'],
  'order-fractions': ['Compare with half, then order', 'Same-size parts: count them'],
  'equivalent-models': ['Splitting parts keeps the amount', 'Same amount, smaller parts'],
  'build-equivalents': ['Splitting parts keeps the amount', 'Same amount, smaller parts'],
  'missing-equivalent': ['Top and bottom change together', 'Split each part the same way'],
  'compose-to-one': ['A whole is all its parts', 'Fill up to one whole'],
  'decompose-fractions': ['The parts add up to it', 'Same-size parts make the total'],
  'improper-fractions': ['More parts than one whole', 'Fill one whole, then keep going'],
  'mixed-improper': ['Each full bar is one whole', 'Wholes plus the leftover parts'],
  'add-like-denominators': ['Same parts: add the numerators', 'The part size stays the same'],
  'subtract-like-denominators': ['Same parts: take away numerators', 'The part size stays the same'],
  'add-related-fractions': ['Rename so the parts match', 'Add same-size parts only'],
  'tenths-decimals': ['Tenths take one decimal place', 'Tenths can be written as decimals'],
  'hundredths-decimals': ['Two places after the point: hundredths', 'Count the tenths or hundredths'],
  'add-tenths-hundredths': ['One tenth is ten hundredths', 'Make both hundredths, then add'],
  'unit-fraction-multiples': ['Count the copies of one part', 'The part size stays the same'],
  'multiply-whole-by-fraction': ['Count the parts in every group', 'The part size stays the same'],
  'simplify-fractions': ['Bigger parts, same amount', 'Divide both by the same number'],
  'equivalent-missing-both': ['Same amount, new denominator', 'Multiply top and bottom alike'],
  'whole-numbers-as-fractions': ['All the parts make one whole', 'Count the parts in each whole'],
  'compare-unlike-fractions': ['Rename to match, then compare', 'Make the parts the same size'],
  'order-unlike-fractions': ['Compare with half or rename', 'Match the parts, then order'],
  'subtract-unlike-fractions': ['Rename, then take away', 'Take away same-size parts only'],
  'add-unlike-fractions': ['Rename, then add the numerators', 'Add same-size parts only'],
  'add-mixed-numbers': ['Add parts and wholes', 'Wholes together, parts together'],
  'subtract-mixed-numbers': ['Trade a whole for parts', 'Break a whole into parts'],
  'fraction-of-quantity': ['Equal groups, then count some', 'The denominator says how many groups'],
  'mixed-unlike-operations': ['Rename the parts to match', 'Same-size parts, then solve'],
  'estimate-fraction-operations': ['Use 1/2 to judge the size', 'Two halves make one whole'],
  'multiply-fractions': ['Find a part of a part', 'Split the parts again'],
  'fraction-of-collection': ['Equal groups, then count some', 'The denominator says how many groups'],
  'divide-whole-by-unit-fraction': ['Count the small parts that fit', 'Each whole holds equal parts'],
  'multiplication-scaling': ['Compare the factor with 1', 'Less than 1 makes it less'],
  'multiply-mixed-numbers': ['Split at wholes, then add', 'Area is the squares inside'],
  'unit-fraction-divided-whole': ['Sharing cuts the part smaller', 'Each share is a smaller part'],
  'fraction-of-length': ['Split the length into equal parts', 'Equal spaces, then count some'],
  'fractional-measure-addition': ['Rename so the parts match', 'Add same-size parts only'],
  'ruler-measurement': ['Each inch has equal small spaces', 'Count the spaces from zero'],
  'build-line-plots': ['Stack Xs when lengths match', 'Each X is one measurement'],
  'read-line-plots': ['Find both ends, then subtract', 'Subtract the shortest from the longest'],
  'line-plot-leveling': ['Add it all, then split equally', 'Each gets an equal share'],
  'measurement-word-problems': ['Rename so the parts match', 'Add same-size parts only'],
  'fractional-unit-conversions': ['Split the big unit equally', 'Find the small units first'],
  'fractional-sharing': ['Share each whole equally', 'Split every whole fairly'],
  'fraction-as-division': ['Top divided by bottom', 'The divided number goes on top'],
  'fraction-probability': ['Count all, then count wanted', 'Wanted on top, all below'],
  'fraction-of-area': ['Count equal parts, then shaded ones', 'Equal parts on the bottom'],
  'fractional-side-area': ['Count the overlap squares', 'Side times side is the area'],
  'equivalent-number-line': ['Same spot, new name', 'Smaller spaces, same spot'],
  'fraction-recipes': ['Add the amount to itself', 'Two batches: twice as much'],
  'fractions-to-percent': ['Rename it in hundredths', 'Hundredths give the percent'],
  'percent-to-fraction': ['Write it over 100', 'The percent is the hundredths'],
  'decimal-fraction-equivalence': ['Tenths and hundredths name decimals', 'Read the decimal as a fraction'],
  'compare-decimals': ['Make both hundredths, then compare', 'Count hundredths, not digits'],
  'compare-decimals-grid': ['Compare the shaded squares', 'Count hundredths, not digits'],
  'fraction-times-fraction': ['Count where rows and columns meet', 'Multiply tops and multiply bottoms'],
  'bigger-or-smaller': ['Less than 1 makes it less', 'Times 1 keeps it the same'],
  'share-or-fit': ['Sharing makes smaller shares', 'Fitting counts how many pieces'],
  'dimes-and-pennies': ['Each penny is 1 hundredth', 'Ten hundredths in each dime'],
  'plot-in-eighths': ['Find the length on the line', 'Count eighths from zero'],
  'party-portions': ['Add one portion for each guest', 'The part size stays the same'],
  'two-step-conversions': ['Turn the big units into small', 'Count inches in each foot'],
  'line-plot-totals': ['Every X adds its length', 'Add all the Xs together'],
  'multi-step-fraction-stories': ['Solve the first step first', 'Use the first answer next'],
  'find-the-whole': ['Find one part, then all parts', 'The whole is every part'],
  'spot-the-mistake': ['Keep the denominator the same', 'Only the numerators change'],
  'fraction-of-remainder': ['Use the rest for step two', 'First find what is left'],
  'divide-fractions': ['Rename, then count the parts', 'Same-size parts make counting easy'],
};
/** The right reason for a build: the lesson's key idea, said one of three ways (by step or round). */
const idea = (id: string, fallback: string, step = 0) => {
  const ways = REASON_IDEAS[id] ? [REASON_IDEAS[id], ...(MORE_REASON_IDEAS[id] ?? [])] : [fallback];
  return ways[((step % ways.length) + ways.length) % ways.length];
};
/** Put the right reason at a spot that changes from lesson to lesson (but is the same every visit). */
function arrangeReasons(key: string, right: string, wrong: [string, string]): { reasons: string[]; correctReason: number } {
  const correctReason = [...key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 3;
  const reasons = [...wrong];
  reasons.splice(correctReason, 0, right);
  return { reasons, correctReason };
}
/** The check's reasons with its wrong ones swapped for `wrong` (and its right one for `right`); the right reason keeps its spot. */
function withWrong(check: BuildCheck, wrong: [string, string], right = check.reasons[check.correctReason]): string[] {
  let next = 0;
  return check.reasons.map((reason, i) => (i === check.correctReason ? right : wrong[next++]));
}
/** Step 3 ("Apply it") for lessons whose worksheet rows can't become a Build: the lesson's own idea with new numbers. */
const APPLY_CHECKS: Record<string, { n: number; d: number; prompt: string; reason: string; kind?: LearningModel['kind']; total?: number }> = {
  'equal-parts': { n: 1, d: 4, prompt: 'Cut a pizza into 4 equal slices. Shade 1.', reason: '4 equal slices. 1 of them is 1/4.' },
  'fraction-names': { n: 2, d: 6, prompt: 'A pan has 6 equal parts. 2 are eaten. Make 2/6.', reason: 'The denominator, 6, is all the parts. The numerator, 2, is the parts you count.' },
  'unit-fractions': { n: 1, d: 8, prompt: 'A pizza has 8 equal slices. Make one slice.', reason: '1 of 8 equal slices is 1/8.' },
  'sets-unit-fractions': { n: 1, d: 4, kind: 'set', total: 16, prompt: 'Share 16 stickers among 4 friends. Pick 1 share.', reason: '16 in 4 equal groups is 4 each. 1 group is 1/4.' },
  'sets-nonunit': { n: 3, d: 4, kind: 'set', total: 16, prompt: 'Put 16 stickers in 4 equal groups. Pick 3 groups.', reason: '16 in 4 equal groups is 4 each. 3 groups is 3/4.' },
  'order-fractions': { n: 5, d: 8, prompt: 'Which is biggest: 3/8, 5/8 or 1/8? Make it.', reason: 'All are eighths, so the parts are the same size. 5 parts is the most.' },
  'equivalent-models': { n: 3, d: 6, prompt: 'Show 1/2 using sixths. Split every part.', reason: 'Split each half into 3. So 1/2 = 3/6.' },
  'build-equivalents': { n: 6, d: 8, prompt: 'Show 3/4 using eighths.', reason: 'Split each fourth into 2. So 3/4 = 6/8.' },
  'missing-equivalent': { n: 4, d: 6, prompt: '2/3 = ?/6. Make it.', reason: 'Thirds to sixths is times 2. 2 × 2 = 4, so 4/6.' },
  'improper-fractions': { n: 5, d: 3, prompt: 'Make 5/3. It is more than one whole.', reason: '3/3 is one whole. 2 more thirds go past it.' },
  'unit-fraction-multiples': { n: 4, d: 3, prompt: 'Put 4 parts of 1/3 together. Build the total.', reason: '4 copies of 1/3 make 4/3.' },
  'simplify-fractions': { n: 1, d: 2, prompt: 'Make 4/8 in simplest form.', reason: 'Divide both by 4. So 4/8 = 1/2.' },
  'equivalent-missing-both': { n: 6, d: 8, prompt: 'Show 3/4 using eighths.', reason: 'Multiply both by 2. So 3/4 = 6/8.' },
  'whole-numbers-as-fractions': { n: 12, d: 6, prompt: 'Build 2 wholes using sixths.', reason: 'Each whole is 6/6. 2 wholes is 12/6.' },
  'compare-unlike-fractions': { n: 3, d: 4, prompt: 'Which is bigger, 3/4 or 5/8? Make it.', reason: '3/4 = 6/8. 6 eighths are more than 5 eighths.' },
  'order-unlike-fractions': { n: 4, d: 5, prompt: 'Which is biggest: 1/2, 2/5 or 4/5? Make it.', reason: 'Use 1/2. 4/5 is more than 1/2, and 2/5 is less.' },
  'add-unlike-fractions': { n: 3, d: 4, prompt: 'Build 1/2 + 1/4 using fourths.', reason: '1/2 = 2/4. 2/4 + 1/4 = 3/4.' },
  'add-mixed-numbers': { n: 8, d: 3, prompt: 'Make 1 1/3 + 1 1/3.', reason: '1 + 1 = 2. 1/3 + 1/3 = 2/3. So 2 2/3, or 8/3.' },
  'fraction-of-quantity': { n: 3, d: 4, kind: 'set', total: 12, prompt: 'Find 3/4 of 12 apples. Make 4 equal groups.', reason: '12 in 4 equal groups is 3 each. 3 groups is 9.' },
  'mixed-unlike-operations': { n: 7, d: 4, prompt: 'Build 2 1/4 − 1/2 using fourths.', reason: '1/2 = 2/4. 2 1/4 − 2/4 = 1 3/4, or 7/4.' },
  'estimate-fraction-operations': { n: 7, d: 8, kind: 'line', prompt: 'Build 1/2 + 3/8. Is the sum less than 1?', reason: '3/8 is less than 1/2, so the sum is less than 1. It is 7/8.' },
  'multiply-fractions': { n: 2, d: 9, prompt: 'Make 1/3 of 2/3.', reason: 'Cut each third into 3. 1/3 of 2/3 is 2/9.' },
  'fraction-of-collection': { n: 2, d: 3, kind: 'set', total: 15, prompt: 'Put 15 cards in 3 equal groups. Pick 2 groups.', reason: '15 in 3 equal groups is 5 each. 2 groups is 10 cards.' },
  'divide-whole-by-unit-fraction': { n: 6, d: 3, prompt: 'How many 1/3-cup scoops fill 2 cups? Make it in thirds.', reason: 'Each cup holds 3 thirds. 2 cups hold 6.' },
  'multiplication-scaling': { n: 3, d: 5, kind: 'set', total: 20, prompt: 'Build 3/5 of 20. Is it less than or more than 20?', reason: '3/5 is less than one whole, so 3/5 of 20 is less than 20. It is 12.' },
  'multiply-mixed-numbers': { n: 9, d: 4, prompt: 'A rectangle is 1 1/2 units by 1 1/2 units. Build its area.', reason: 'Cut each side into halves. 9 small squares are 9/4, or 2 1/4.' },
  'unit-fraction-divided-whole': { n: 1, d: 8, prompt: 'Share 1/4 of a cake equally among 2 children. Build one share.', reason: 'Split the fourth into 2 equal shares. Each share is 1/8.' },
  'fraction-of-length': { n: 2, d: 3, kind: 'line', prompt: 'Mark 2/3 of a mile on the line.', reason: 'Split the line into 3 equal spaces. Count 2.' },
  'ruler-measurement': { n: 3, d: 4, kind: 'line', prompt: 'A crayon is 3/4 inch long. Mark it on the ruler.', reason: 'Each inch has 4 small spaces. 3 of them make 3/4 inch.' },
  'build-line-plots': { n: 1, d: 4, kind: 'line', prompt: 'Leaves are 1/4, 3/4 and 1/4 inch long. Mark where 2 Xs go.', reason: 'Two leaves are 1/4 inch, so 2 Xs stack at 1/4.' },
  'read-line-plots': { n: 2, d: 4, kind: 'line', prompt: 'The shortest bug is 1/4 inch and the longest is 3/4 inch. Find their difference.', reason: 'Longest minus shortest: 3/4 − 1/4 = 2/4.' },
  'line-plot-leveling': { n: 1, d: 3, kind: 'line', prompt: 'Share 1 liter equally among 3 cups. Show one cup.', reason: 'Split 1 liter into 3 equal parts. Each cup gets 1/3 liter.' },
  'measurement-word-problems': { n: 5, d: 8, prompt: 'A jug has 1/4 liter. Add 3/8 liter. How much is there now?', reason: '1/4 = 2/8. 2/8 + 3/8 = 5/8 liter.' },
  'fractional-unit-conversions': { n: 1, d: 4, kind: 'line', prompt: 'Show why 1/4 hour is 15 minutes.', reason: '1 hour is 60 minutes. 4 equal parts are 15 minutes each.' },
  'fractional-sharing': { n: 2, d: 3, prompt: '2 pizzas are shared fairly by 3 friends. Build how much one friend gets.', reason: '2 ÷ 3 is 2/3. Each friend gets 2/3 of a pizza.' },
  'fraction-probability': { n: 3, d: 5, prompt: 'A bag has 5 marbles. 3 are green. Make the chance of green.', reason: '3 green marbles out of 5 is 3/5.' },
  'fraction-of-area': { n: 5, d: 6, prompt: 'A garden has 6 equal beds. Plant 5.', reason: '5 planted beds out of 6 is 5/6.' },
  'fractional-side-area': { n: 1, d: 6, prompt: 'A rectangle is 1/2 unit by 1/3 unit. Find its area.', reason: '1/2 × 1/3 = 1/6 square unit.' },
  'equivalent-number-line': { n: 6, d: 8, kind: 'line', prompt: 'Mark 6/8 on the line. Does it land on 3/4?', reason: 'Each fourth is 2 eighths. So 6/8 and 3/4 share a spot.' },
  'fractions-to-percent': { n: 40, d: 100, prompt: 'Write 2/5 in hundredths to find its percent. Make it.', reason: '100 ÷ 5 = 20, and 2 × 20 = 40: 2/5 = 40/100 = 40%.' },
  'decimal-fraction-equivalence': { n: 3, d: 10, prompt: 'A jar is 0.3 full. Make it in tenths.', reason: '0.3 means 3 tenths: 3/10.' },
  'compare-decimals': { n: 5, d: 10, prompt: 'Build 0.5 with tenths. Then compare it to 0.45.', reason: '0.5 = 0.50. 50 hundredths are more than 45 hundredths.' },
  'compare-decimals-grid': { n: 9, d: 100, prompt: 'Build 0.09 with hundredths. Then compare it to 0.9.', reason: '0.09 is 9 hundredths. 0.9 is 90 hundredths, so 0.09 is much less.' },
  'fraction-times-fraction': { n: 2, d: 6, prompt: 'Make 1/2 × 2/3.', reason: '1 × 2 = 2 and 2 × 3 = 6, so 2/6.' },
  'bigger-or-smaller': { n: 12, d: 20, prompt: 'Make 4/4 × 3/5. Is it more or less than 3/5?', reason: '4/4 is 1, so the amount stays the same: 12/20 is 3/5.' },
  'dimes-and-pennies': { n: 70, d: 100, prompt: 'Make 7 dimes as hundredths of a dollar.', reason: 'Each dime is 10 hundredths. 7 dimes are 70/100.' },
  'plot-in-eighths': { n: 7, d: 8, kind: 'line', prompt: 'Two pins are 3/8 and 4/8 inch. Show how long they are together.', reason: '3/8 + 4/8 = 7/8 inch.' },
  'two-step-conversions': { n: 30, d: 12, prompt: 'A ribbon is 2 1/2 feet long. Show it in inches, 12 to a foot.', reason: '2 feet is 24 inches. Half a foot is 6 more: 30 inches.' },
  'line-plot-totals': { n: 13, d: 8, kind: 'line', prompt: 'Cups hold 1/8, 3/8, 4/8 and 5/8 liter. Show the total on a line.', reason: '1 + 3 + 4 + 5 = 13 eighths: 13/8 liters.' },
  'party-portions': { n: 8, d: 3, prompt: 'Each racer drinks 2/3 cup. 4 racers. Build the total.', reason: '4 groups of 2 thirds is 8 thirds: 8/3 cups, between 2 and 3.' },
  'share-or-fit': { n: 1, d: 12, prompt: 'Share 1/4 of a cake among 3 children. Build one share.', reason: 'Sharing: 1/4 ÷ 3 = 1/12. Check: 3 × 1/12 = 1/4.' },
  'find-the-whole': { n: 5, d: 5, total: 10, kind: 'set', prompt: '2 beads are 1/5 of a string. Build the whole string.', reason: 'Each fifth is 2 beads. 5 groups of 2 is 10 beads.' },
  'fraction-of-remainder': { n: 3, d: 8, prompt: 'Pour out 1/2 of a jug. Then pour out 1/4 of the rest. Make what is left.', reason: '1/2 is left. 1/4 of that is 1/8. 1/2 − 1/8 = 3/8.' },
  'divide-fractions': { n: 4, d: 10, prompt: 'How many 1/10s fit in 2/5? Make 2/5 in tenths.', reason: '2/5 = 4/10. So 4 tenths fit.' },
};
/** A row whose answer is a number of wholes ("How many wholes are 24/8?", "Write 8/8 as a whole number."): its bars
    carry no "one whole" marks until it is answered, or counting the marks would give the answer. */
export const answerIsWholes = (problem: { prompt: string }) => /^How many wholes are \d+\/\d+\?$|^Write \d+\/\d+ as a whole number\.$/.test(problem.prompt);
/** Lessons whose builds accept any equal fraction: an area or what's left can be named in more than one way. */
const ANY_NAME_LESSONS = new Set(['fractional-side-area', 'multiply-mixed-numbers', 'fraction-of-remainder']);
const acceptAnyName = (id: string, check: BuildCheck, avoid: string[] = []): BuildCheck =>
  fitReasons(id, ANY_NAME_LESSONS.has(id) ? { ...check, target: { ...check.target, anyName: true } } : check, avoid);

/* Some lessons mix kinds of item, and a key idea true for one kind is false for another: "Part of a group is less" is
   false for 6/4 of a bar, "Sharing makes smaller shares" is false for "How many 1/4-cup scoops fill 3 cups?", a doubling
   reason is false for 3 batches, "Rename so the parts match" for 3/6 + 1/6. Each such lesson says how to tell its item's
   kind and which reasons are true for which kinds; the right reason is then always true for its item and no wrong reason
   is. A reason with no entry is true for every item (as a right reason) or false for every item (as a wrong one). */
type ReasonFit = { kind: (check: BuildCheck) => string | null; trueFor: Record<string, string[]>; right: Record<string, string>; wrong: Record<string, string[]> };
const factorKind = (n: number, d: number) => (n < d ? 'less' : n > d ? 'more' : 'same');
const SCALING_FIT: Omit<ReasonFit, 'kind'> = {
  trueFor: {
    'Part of a group is less': ['less'], 'Less than 1 makes it less': ['less'], 'Times 1 keeps it the same': ['same'], 'More than 1 makes it more': ['more'],
    'Multiplying always makes it bigger': ['more'], 'A fraction of it is more': ['more'], 'Bigger numbers always win': ['more'],
    'The size stays the same': ['same'], 'Multiplying always makes it smaller': ['less'],
  },
  right: { less: 'Less than 1 makes it less', same: 'Times 1 keeps it the same', more: 'More than 1 makes it more' },
  wrong: {
    less: ['Multiplying always makes it bigger', 'The size stays the same'],
    same: ['Multiplying always makes it bigger', 'Multiplying always makes it smaller'],
    more: ['Multiplying always makes it smaller', 'The size stays the same'],
  },
};
const REASON_FITS: Record<string, ReasonFit> = {
  // The build is the factor itself ("Build 3/4 of 12", "Build 6/4 of 1 bar").
  'multiplication-scaling': { ...SCALING_FIT, kind: (check) => factorKind(check.target.n, check.target.d) },
  // The factor is said first ("Make 5/4 × 2. Is it more or less than 2?").
  'bigger-or-smaller': { ...SCALING_FIT, kind: (check) => {
    const factor = check.prompt.match(/^Make (\d+)\/(\d+) ×/);
    return factor ? factorKind(Number(factor[1]), Number(factor[2])) : null;
  } },
  'share-or-fit': {
    kind: (check) => (/^Share\b/.test(check.prompt) ? 'share' : /^How many .+ fill\b/.test(check.prompt) ? 'fit' : null),
    trueFor: { 'Sharing makes smaller shares': ['share'], 'Fitting counts how many pieces': ['fit'], 'Dividing always makes it smaller': ['share'] },
    right: { share: 'Sharing makes smaller shares', fit: 'Fitting counts how many pieces' },
    wrong: { share: ['Sharing makes each share bigger', 'Sharing and fitting are the same', 'Fit splits, share counts'] },
  },
  'fraction-recipes': {
    kind: (check) => (/\bDouble it\b|\b2 batches\b/.test(check.prompt) ? 'double' : /\b\d+ batches\b/.test(check.prompt) ? 'batches' : null),
    trueFor: { 'Doubling adds the amount again': ['double'], 'Add the amount to itself': ['double'], 'Two batches: twice as much': ['double'] },
    right: { double: 'Add the amount to itself', batches: 'Add one amount per batch' },
    wrong: {},
  },
  // Two amounts with the same denominator need no renaming.
  'measurement-word-problems': {
    kind: (check) => {
      const dens = [...check.prompt.matchAll(/\d+\/(\d+)/g)].map((m) => m[1]);
      return dens.length < 2 ? null : new Set(dens).size === 1 ? 'like' : 'unlike';
    },
    trueFor: { 'Make the parts match first': ['unlike'], 'Rename so the parts match': ['unlike'] },
    right: { like: 'Add same-size parts only', unlike: 'Make the parts match first' },
    wrong: {},
  },
};
/** Every reason an item may be given in place of the lesson's own lists (the tests allow these too). */
export const FITTED_REASONS = {
  right: [...new Set(Object.values(REASON_FITS).flatMap((fit) => Object.values(fit.right)))],
  wrong: [...new Set(Object.values(REASON_FITS).flatMap((fit) => Object.values(fit.wrong).flat()))],
};
/** The check with a right reason true for its item, and not one in `avoid` (the earlier steps' right reasons) when the
    lesson has another, and wrong reasons false for it. */
function fitReasons(id: string, check: BuildCheck, avoid: string[] = []): BuildCheck {
  const fit = REASON_FITS[id];
  const kind = fit?.kind(check);
  if (!fit || !kind) return check;
  const trueHere = (reason: string) => !fit.trueFor[reason] || fit.trueFor[reason].includes(kind);
  const ways = [fit.right[kind], ...(REASON_IDEAS[id] ? [REASON_IDEAS[id], ...(MORE_REASON_IDEAS[id] ?? [])] : [])].filter((r): r is string => !!r && trueHere(r));
  const spare = (fit.wrong[kind] ?? []).filter((reason) => !check.reasons.includes(reason));
  const reasons = check.reasons.map((reason, i) => {
    if (i === check.correctReason) return trueHere(reason) && !avoid.includes(reason) ? reason : ways.find((r) => !avoid.includes(r)) ?? ways[0] ?? reason;
    return fit.trueFor[reason]?.includes(kind) ? spare.shift() ?? reason : reason;
  });
  return { ...check, reasons };
}

export function getBuildChecks(id: string): BuildCheck[] {
  // Build it, On your own and Apply it keep three different right reasons.
  const used: string[] = [];
  return buildChecksFor(id).map((check) => {
    const done = acceptAnyName(id, check, used);
    used.push(done.reasons[done.correctReason]!);
    return done;
  });
}
function buildChecksFor(id: string): BuildCheck[] {
  const seed = CHECKS[id]; if (!seed) throw new Error(`Missing learning checks: ${id}`);
  const [n, d, kind, prompt, explanation, total] = seed;
  const transfer = transferTarget(id, n, d, kind);
  const primary: BuildCheck = { id: 'build', prompt, target: model(n, d, kind, total), explanation, transfer: false, stepLabel: 'Step 1 · Build it',
    ...arrangeReasons(`${id}:build`, idea(id, explanation, 0), wrongReasons(id, 0)) };
  const independent: BuildCheck = { id: 'transfer', prompt: transfer.prompt, target: transfer.target, explanation: transfer.reason, transfer: true, stepLabel: 'Step 2 · On your own',
    ...arrangeReasons(`${id}:transfer`, idea(id, transfer.reason, 1), wrongReasons(id, 1)) };
  const used = new Set([primary, independent].map(check => JSON.stringify(check.target)));
  const authored = APPLY_CHECKS[id];
  let apply: BuildCheck | null = authored ? {
    id: 'apply', prompt: authored.prompt, target: model(authored.n, authored.d, authored.kind ?? 'bar', authored.total), explanation: authored.reason, transfer: true,
    ...arrangeReasons(`${id}:apply`, idea(id, authored.reason, 2), wrongReasons(id, 2)),
  } : null;
  for (let serial = 0; serial < 12 * 12 && !apply; serial++) {
    const candidate = worksheetBuildCheck(id, serial, 'apply');
    if (candidate && !used.has(JSON.stringify(candidate.target))) apply = candidate;
  }
  for (let serial = 0; serial < 12 * 12 && !apply; serial++) {
    const candidate = seededBuildCheck(id, serial, 'apply');
    if (!used.has(JSON.stringify(candidate.target))) apply = candidate;
  }
  if (!apply) throw new Error(`No fresh required Build check for ${id}`);
  return [
    primary,
    independent,
    // Apply it always shows the lesson's third pair of wrong reasons, wherever its question came from.
    { ...apply, id: 'apply', transfer: true, stepLabel: 'Step 3 · Apply it', reasons: withWrong(apply, wrongReasons(id, 2), idea(id, apply.reasons[apply.correctReason], 2)) },
  ];
}

const BUILD_PRACTICE_CACHE = new Map<string, BuildCheck[]>();
const targetKey = (check: BuildCheck) => JSON.stringify(check.target);

/** A new Build question made from a varied, lesson-aligned worksheet row. */
function worksheetBuildCheck(id: string, serial: number, checkId: string): BuildCheck | null {
  const sheet = getWorksheet(id, 1 + Math.floor(serial / 12));
  const problem = sheet[serial % 12];
  if (!problem || problem.form) return null;
  const value = parseAnswer(problem.answer);
  if (!value || value.d <= 1 || value.n <= 0 || value.n > value.d * 3) return null;

  // A line plot to read is only in the picture, which a build doesn't show.
  const visualNeeds = !!(problem.model || problem.area || problem.rulerTask || problem.linePlotTask || problem.scaleTask || problem.picture?.kind === 'lineplot');
  const shown = execAll(problem.prompt, /(\d+)\/(\d+)/g).map(match => Number(match[1]) / Number(match[2]));
  const canUsePrompt = !visualNeeds && (problem.prompt.startsWith('Which is') || !shown.includes(value.n / value.d));
  // "Make 5/5 two ways." would drop the real task (adding, comparing…) and name the answer: skip such rows.
  if (!canUsePrompt) return null;
  const ask = problem.prompt.replace(/\s*(Type it|Type a number|Use commas)\.$/, '');
  const prompt = /^Make .+\.$/.test(ask) ? ask.replace(/\.$/, ' two ways.') : `${ask} Build the answer two ways.`;
  const kind: LearningModel['kind'] = id.startsWith('number-line') ? 'line'
    : id.startsWith('sets-') && value.d <= 12 && value.n <= value.d ? 'set' : 'bar';
  const total = kind === 'set' ? value.d * 4 : undefined;
  const explanation = problem.hint;
  return {
    id: checkId, prompt, target: model(value.n, value.d, kind, total), explanation, transfer: true,
    ...arrangeReasons(`${id}:${checkId}:${serial}`, idea(id, problem.hint, serial), wrongReasons(id, serial)),
  };
}

/** Halves cut two different ways: squares on one side, triangles on the other (equal size, different shape). */
const MIXED_FOURTHS_WHY = 'The shapes are different, but the sizes match. The square is cut into 2 equal halves. One half is cut into 2 squares. The other half is cut into 2 triangles. Each part is half of a half, so all 4 parts are fourths.';

/** Equal parts, last four rows: is each square cut into fourths? Set 0 is the lesson's own sheet; redo sheets take
    sets 1 and 2 in turn, so a redo never repeats the sheet before it. Every answer stays within fourths. */
const SQUARE_ROWS: { prompt: string; answer: string; cut: AreaFigure['cut']; shaded?: number[]; hint: string; why?: string }[][] = [[
  { prompt: 'Are all 4 parts of this square the same size? Answer yes or no.', answer: 'yes', cut: 'fourths-mixed', hint: 'Look at the left half and the right half. How is each half cut?', why: MIXED_FOURTHS_WHY },
  { prompt: 'This square is cut into 4 parts. Are they fourths? Answer yes or no.', answer: 'no', cut: 'fourths-unequal', hint: 'Fourths must all be the same size. Compare the biggest part and the smallest part.', why: 'One part is bigger than another. 4 parts that are not the same size are not fourths.' },
  { prompt: 'These parts are triangles, not squares. Are they still fourths? Answer yes or no.', answer: 'yes', cut: 'fourths-triangles', hint: 'Compare the 4 triangles. Do they all fill the same space?', why: 'All 4 triangles cover the same space. 4 equal parts are fourths, whatever their shape.' },
  { prompt: 'How many small triangles cover the same space as the small square?', answer: '2', cut: 'quarter-and-triangles', hint: 'Picture the small square cut corner to corner. What shapes do you get?', why: 'Two of these triangles fit together to fill the small square.' },
], [
  { prompt: 'Is this square cut into fourths? Answer yes or no.', answer: 'yes', cut: 'fourths-squares', hint: 'Fourths are 4 equal parts. Compare all 4 parts.', why: 'All 4 small squares are the same size, so each one is a fourth.' },
  { prompt: 'Is this square cut into 4 equal strips? Answer yes or no.', answer: 'no', cut: 'strips-unequal', hint: 'Look at the first strip. Compare it with the strips next to it.', why: 'The strips are not all the same width, so they are not equal strips.' },
  { prompt: 'These strips are long and thin. Are they still fourths? Answer yes or no.', answer: 'yes', cut: 'fourths-strips', hint: 'Shape does not matter. Compare how much space each strip covers.', why: 'All 4 strips cover the same space, so they are fourths, even long and thin.' },
  { prompt: 'One triangle is colored. What fraction of the square is it?', answer: '1/4', cut: 'fourths-triangles', shaded: [0], hint: 'How many triangles of this size fill the whole square?', why: '4 same-size triangles fill the square. 1 of them is 1/4.' },
], [
  { prompt: 'One triangle is colored. What fraction of the whole square is it?', answer: '1/4', cut: 'fourths-mixed', shaded: [2], hint: 'Look at the left half and the right half. How is each half cut?', why: MIXED_FOURTHS_WHY },
  { prompt: 'Is each part of this square one fourth of it? Answer yes or no.', answer: 'no', cut: 'fourths-unequal', hint: 'One fourth means 4 of them fill the square exactly. Compare the parts.', why: 'The parts are different sizes, so not every part is one fourth.' },
  { prompt: 'One strip is colored. What fraction of the square is it?', answer: '1/4', cut: 'fourths-strips', shaded: [1], hint: 'Count all the strips. Are they the same size?', why: '4 same-size strips fill the square. 1 strip is 1/4.' },
  { prompt: 'How many small squares make one half of the whole square?', answer: '2', cut: 'fourths-squares', hint: 'How many small squares fill the whole square? Half of that is how many?', why: '4 small squares fill the whole square. Half of 4 is 2.' },
]];

/* Extra builds that practise the lesson's own skill, with new numbers each time (never "Build 2/15" in a lesson about
   something else). Each is [prompt, numerator, denominator, explanation, kind?, total?]; every prompt is a wording the
   accuracy proof engine already solves. Denominators stay in the lesson's grade: 2, 3, 4, 6, 8 for grade 3. */
type LessonBuild = [string, number, number, string, LearningModel['kind']?, number?];
const GRADE3_DENS = [2, 3, 4, 6, 8];
const GRADE4_DENS = [2, 3, 4, 5, 6, 8, 10, 12];
/** Grade 5 keeps bars readable: 24 parts at most (and hundredths). */
const GRADE5_DENS = [2, 3, 4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24];
/** The lesson's grade, from its first standard (lessons with no standard count as grade 5). */
export function lessonGrade(id: string): 3 | 4 | 5 {
  const grade = Number(standardsForMission(id)[0]?.[0]);
  return grade === 3 || grade === 4 ? grade : 5;
}
/** Denominators a lesson may use (Common Core): grade 3 halves, thirds, fourths, sixths and eighths; grade 4 adds
    fifths, tenths, twelfths and hundredths; grade 5 anything a bar can show clearly. Whole numbers (n/1) always fit. */
export function gradeFits(id: string, d: number): boolean {
  const grade = lessonGrade(id);
  return d === 1 || (grade === 3 ? GRADE3_DENS : grade === 4 ? GRADE4_DENS : GRADE5_DENS).includes(d) || (grade > 3 && d === 100);
}
/** Equivalent fractions [n, d, k] (n/d = nk/dk, n/d in simplest form) whose denominators both fit the grade,
    in a mixed order so neighbouring rows differ. */
const EQUIVALENTS: Record<3 | 4, [number, number, number][]> = {
  3: [[1, 2, 2], [1, 3, 2], [1, 2, 3], [3, 4, 2], [1, 4, 2], [2, 3, 2], [1, 2, 4]],
  4: [[1, 3, 2], [2, 3, 2], [5, 6, 2], [2, 5, 2], [1, 3, 4], [3, 4, 2], [1, 4, 3], [3, 5, 2], [1, 2, 5], [2, 3, 4], [1, 6, 2], [3, 4, 3],
    [1, 2, 3], [4, 5, 2], [1, 2, 2], [1, 4, 2], [1, 2, 6], [1, 5, 2], [1, 2, 4]],
};
/** Grade 3 equivalence also renames a fraction that is not in simplest form (2/4 = 4/8). */
const EQUIVALENTS_G3_ALL: [number, number, number][] = [...EQUIVALENTS[3], [2, 4, 2]];
/** Equivalent fractions [n, d, k] whose denominators both fit the lesson's grade (simplest form only after grade 3). */
export const equivalentsFor = (id: string): readonly [number, number, number][] => (lessonGrade(id) === 3 ? EQUIVALENTS_G3_ALL : EQUIVALENTS[4]);
const at = <T,>(list: readonly T[], s: number, salt = 0): T => list[(s + salt) % list.length];
const gcdOf = (a: number, b: number): number => (b ? gcdOf(b, a % b) : a);
/** a/b + c/d, written with the smallest shared denominator. */
const sumIn = (a: number, b: number, c: number, d: number, sign = 1): [number, number] => {
  const common = (b * d) / gcdOf(b, d);
  return [a * (common / b) + sign * c * (common / d), common];
};
const EQUIV_PAIRS: Record<3 | 4, [number, number, number][]> = {
  3: [[1, 2, 4], [1, 2, 6], [1, 2, 8], [1, 3, 6], [2, 3, 6], [1, 4, 8], [3, 4, 8], [2, 4, 8]],
  4: [[2, 5, 10], [3, 5, 10], [1, 6, 12], [5, 6, 12], [3, 4, 12], [2, 3, 12], [1, 2, 10], [4, 5, 10], [1, 3, 12], [3, 4, 8]],
};
const UNLIKE_PAIRS: [number, number, number, number][] = [[1, 2, 1, 3], [2, 3, 3, 4], [3, 5, 1, 2], [5, 6, 3, 4], [2, 5, 1, 3], [3, 8, 1, 2], [5, 8, 2, 3], [3, 4, 4, 5], [1, 4, 1, 3], [7, 10, 3, 4]];
const unitWord = (d: number) => unitName(d);
const LESSON_BUILDS: Record<string, (s: number) => LessonBuild> = {
  'equal-parts': (s) => { const d = at(GRADE3_DENS, s); const n = 1 + (Math.floor(s / 5) % (d - 1)); const pizza = Math.floor(s / 5) % 2 === 1;
    return [`Cut ${pizza ? 'a pizza' : 'a bar'} into ${d} equal ${pizza ? 'slices' : 'parts'}. Shade ${n}.`, n, d, `${d} equal ${pizza ? 'slices' : 'parts'}, all the same size. ${n} of them is ${n}/${d}.`]; },
  'fraction-names': (s) => { const d = at([3, 4, 6, 8], s); const n = 1 + (s % (d - 1)); return [`Cut a bar into ${d} equal parts. Shade ${n}.`, n, d, `The denominator, ${d}, is all the parts. The numerator, ${n}, is the parts you shade.`]; },
  'unit-fractions': (s) => { const d = at(GRADE3_DENS, s); const way = Math.floor(s / 5) % 3;
    if (way === 0) return [`A pizza has ${d} equal slices. Make one slice.`, 1, d, `1 of ${d} equal slices is 1/${d}.`];
    if (way === 1) return [`Cut 0 to 1 into ${d} equal spaces. Make 1 jump.`, 1, d, `A unit fraction is 1 part: 1 of ${d} equal spaces is 1/${d}.`, 'line'];
    const total = d * (2 + (Math.floor(s / 15) % 3)); return [`Put ${total} shells in ${d} equal groups. Pick 1 of the groups.`, 1, d, `1 of ${d} equal groups is 1/${d}.`, 'set', total]; },
  'number-line-basics': (s) => { const d = at(GRADE3_DENS, s); const n = 1 + (Math.floor(s / 5) % d);
    return [`Cut 0 to 1 into ${d} equal spaces. Make ${n} ${n === 1 ? 'jump' : 'jumps'}.`, n, d, `Each space is 1/${d}. ${n} ${n === 1 ? 'jump is' : 'jumps make'} ${n}/${d}.`, 'line']; },
  'fraction-of-area': (s) => { const d = at([4, 6, 8], s); const n = 1 + (s % (d - 1)); return [`A garden has ${d} equal beds. Plant ${n}.`, n, d, `${n} of ${d} equal beds is ${n}/${d}.`]; },
  'unit-size': (s) => { const [a, b] = at([[2, 4], [3, 6], [4, 8], [2, 3], [3, 4], [6, 8], [2, 6], [3, 8]] as const, s); const big = s % 2 === 0;
    // Grade 3 has few unit fractions, so some builds share a set: more friends sharing means a smaller share.
    if (Math.floor(s / 8) % 3 === 2) { const d = big ? a : b; const total = d * (2 + (s % 3));
      return [`Share ${total} stickers among ${d} friends. Pick 1 share.`, 1, d, `${d} equal shares: 1 share is 1/${d}. More friends means each share is smaller.`, 'set', total]; }
    const cap = (w: string) => w[0].toUpperCase() + w.slice(1);
    return [`Which is ${big ? 'bigger' : 'smaller'}, 1/${a} or 1/${b}?`, 1, big ? a : b, big
      ? `${cap(unitWord(a))} cut the same whole into fewer parts, so 1/${a} is bigger than 1/${b}.`
      : `${cap(unitWord(b))} cut the same whole into more parts, so 1/${b} is smaller than 1/${a}.`]; },
  'order-fractions': (s) => { const d = at([4, 6, 8], s); const a = 1 + (Math.floor(s / 3) % (d - 2)); const b = a + 1 + (s % 2 && a + 2 < d ? 1 : 0); const big = s % 2 === 0;
    return [`Which is ${big ? 'bigger' : 'smaller'}, ${a}/${d} or ${b}/${d}?`, big ? b : a, d, big ? `Same-size parts: ${b} parts are more than ${a}.` : `Same-size parts: ${a} ${a === 1 ? 'part is' : 'parts are'} less than ${b}.`]; },
  'compare-unlike-fractions': (s) => { const [a, b, c, d] = at(UNLIKE_PAIRS, s); const big = a * d > c * b ? [a, b] : [c, d];
    return [`Which is bigger, ${a}/${b} or ${c}/${d}?`, big[0], big[1], `Rename both with the same denominator, then compare the numerators.`]; },
  'order-unlike-fractions': (s) => LESSON_BUILDS['compare-unlike-fractions'](s + 3),
  // Grade 3 compares with half (taking parts away from half is grade 5).
  'benchmark-half': (s) => { const d = at([4, 6, 8], s); const k = 1 + (Math.floor(s / 3) % (d / 2 - 1)); const more = s % 2 === 1;
    const [low, high] = [d / 2 - k, d / 2 + k]; const [first, second] = s % 4 < 2 ? [low, high] : [high, low]; const n = more ? high : low;
    return [`Which is ${more ? 'more' : 'less'} than 1/2: ${first}/${d} or ${second}/${d}? Make it.`, n, d, `Half of ${d} is ${d / 2}. ${n} is ${more ? 'more' : 'less'} than ${d / 2}, so ${n}/${d} is ${more ? 'more' : 'less'} than half.`]; },
  'compare-same-numerator': (s) => { const [t, a, b] = at([[1, 2, 4], [2, 3, 6], [3, 4, 8], [2, 4, 6], [1, 3, 8], [2, 3, 4], [1, 4, 6], [3, 6, 8], [2, 4, 8], [1, 2, 6], [2, 6, 8], [1, 3, 4]] as const, s);
    const [first, second] = s % 2 ? [b, a] : [a, b];
    return [`Which is bigger, ${t}/${first} or ${t}/${second}? Make it.`, t, a, `Both count ${t} ${t === 1 ? 'part' : 'parts'}. ${unitWord(a)[0].toUpperCase()}${unitWord(a).slice(1)} are bigger than ${unitWord(b)}, so ${t}/${a} is bigger.`]; },
  'benchmarks-zero-one': (s) => { const k = s % 10; const d = [3, 4, 6, 8, 3, 4, 6, 8, 6, 8][k]; const near = k < 4 ? 1 : 0;
    const n = k >= 8 ? d / 2 : near ? d - 1 : 1; const mark = k >= 8 ? '1/2' : String(near);
    return [`Make ${n}/${d}. Is it near 0, 1/2 or 1?`, n, d, mark === '1/2' ? `${n} is half of ${d}, so ${n}/${d} is exactly 1/2.` : near ? `${n} is just 1 part less than ${d}, so ${n}/${d} is near 1.` : `1 part out of ${d} is tiny, so 1/${d} is near 0.`]; },
  'fraction-magnitude': (s) => { const [d, near, far] = at([[8, 3, 1], [8, 5, 7], [6, 2, 1], [6, 4, 5], [8, 3, 7], [8, 6, 1], [8, 5, 1], [6, 4, 1], [8, 4, 7], [6, 2, 5]] as const, s);
    const [first, second] = s % 2 ? [far, near] : [near, far];
    return [`Which is closer to 1/2: ${first}/${d} or ${second}/${d}? Make it.`, near, d, `Half of ${d} is ${d / 2}. ${near} is ${Math.abs(near - d / 2)} ${Math.abs(near - d / 2) === 1 ? 'part' : 'parts'} away and ${far} is ${Math.abs(far - d / 2)} away, so ${near}/${d} is closer.`]; },
  'equivalent-models': (s) => { const [a, b, c] = at(EQUIV_PAIRS[3], s); return [`${a}/${b} = ?/${c}. Make it.`, (a * c) / b, c, `Cut each ${unitPiece(b)} into ${c / b} equal parts: ${a}/${b} = ${(a * c) / b}/${c}.`]; },
  'build-equivalents': (s) => LESSON_BUILDS['equivalent-models'](s + 2),
  'missing-equivalent': (s) => { const [a, b, c] = at(EQUIV_PAIRS[4], s); return [`${a}/${b} = ?/${c}. Make it.`, (a * c) / b, c, `Multiply the numerator and denominator by ${c / b}: ${a}/${b} = ${(a * c) / b}/${c}.`]; },
  'equivalent-missing-both': (s) => LESSON_BUILDS['missing-equivalent'](s + 3),
  'equivalent-number-line': (s) => { const [a, b, c] = at([...EQUIV_PAIRS[3], [2, 4, 2], [4, 8, 2], [2, 6, 3], [4, 6, 3], [6, 8, 4], [2, 8, 4], [3, 6, 2], [4, 8, 4]] as const, s); return [`${a}/${b} = ?/${c}. Make it.`, (a * c) / b, c, `The same spot on the line: ${a}/${b} = ${(a * c) / b}/${c}.`, 'line']; },
  'simplify-fractions': (s) => { const [a, b, c] = at(EQUIV_PAIRS[4], s); return [`${(a * c) / b}/${c} = ?/${b}. Make it.`, a, b, `Divide the numerator and denominator by ${c / b}: ${(a * c) / b}/${c} = ${a}/${b}.`]; },
  'improper-fractions': (s) => { const d = at([2, 3, 4, 6], s); const n = d + 1 + (s % (d - 1 || 1)); return [`Make ${n}/${d}.`, n, d, `${d}/${d} is one whole. ${n - d} more ${n - d === 1 ? `${unitPiece(d)} goes` : `${unitWord(d)} go`} past it.`]; },
  'whole-numbers-as-fractions': (s) => { const d = at([2, 3, 4, 6, 8], s); const w = 1 + (Math.floor(s / 5) % 3); return [`Make ${w * d}/${d}.`, w * d, d, `${d}/${d} is one whole, so ${w * d}/${d} is ${w} ${w === 1 ? 'whole' : 'wholes'}.`]; },
  'mixed-improper': (s) => { const d = at([2, 3, 4, 6, 8], s); const r = 1 + (s % (d - 1)); return [`Walk 1 ${r}/${d} miles, then 0/${d} mile more. Make the total.`, d + r, d, `1 whole is ${d}/${d}. Add ${r}/${d}: ${d + r}/${d}.`]; },
  'add-mixed-numbers': (s) => { const d = at([3, 4, 5, 6, 8], s); const a = 1 + (s % (d - 1)); const b = 1 + ((s + 1) % (d - 1));
    return [`Walk 1 ${a}/${d} miles, then ${b}/${d} mile more. Make the total.`, d + a + b, d, `Add the parts: ${a} + ${b} = ${a + b}. Then add the whole: ${d + a + b}/${d}.`]; },
  'subtract-mixed-numbers': (s) => { const d = at([3, 4, 5, 6, 8], s); const b = 2 + (Math.floor(s / 5) % (d - 2 || 1)); const a = 1 + (Math.floor(s / 25) % (b - 1));
    return [`A roll is 2 ${a}/${d} meters long. Cut off 1 ${b}/${d} meters. Make what is left.`, d + a - b, d, `Trade one whole for ${d}/${d}, then take away: ${d + a - b}/${d}.`]; },
  // Mixed numbers with unlike parts, adding and cutting off (regrouping a whole), all within 3 wholes.
  'mixed-unlike-operations': (s) => {
    const [w, a, b, c, d, add] = at([[1, 1, 2, 2, 3, 1], [2, 1, 4, 1, 2, 0], [1, 1, 4, 2, 3, 1], [1, 3, 4, 1, 2, 1], [2, 1, 3, 1, 2, 0], [2, 1, 2, 1, 3, 1],
      [1, 1, 6, 1, 2, 1], [2, 1, 6, 1, 3, 0], [1, 2, 5, 1, 2, 1], [1, 3, 8, 1, 4, 1], [2, 1, 8, 1, 2, 0], [1, 1, 3, 1, 4, 1]] as const, s);
    const den = (b * d) / gcdOf(b, d); const first = (w * b + a) * (den / b); const n = first + (add ? 1 : -1) * c * (den / d);
    const regroup = !add && a * (den / b) < c * (den / d) ? ' Trade 1 whole first.' : '';
    return [`A rope is ${w} ${a}/${b} meters long. ${add ? 'Add' : 'Cut off'} ${c}/${d} meter${add ? ' more' : ''}. How ${add ? 'long is it now' : 'much is left'}?`, n, den,
      `Rename both in ${unitWord(den)}: ${w} ${a}/${b} = ${first}/${den} and ${c}/${d} = ${c * (den / d)}/${den}.${regroup} ${add ? 'Add' : 'Take away'}: ${n}/${den} meters.`]; },
  'add-like-denominators': (s) => { const d = at([4, 5, 6, 8, 10], s); const a = 1 + (s % (d - 2)); const b = 1 + ((s + 1) % (d - a - 1 || 1));
    return [`A ribbon is ${a}/${d} meter long. Add ${b}/${d} meter more. How long is it now?`, a + b, d, `Same-size parts: ${a} + ${b} = ${a + b}, so ${a + b}/${d}.`]; },
  'subtract-like-denominators': (s) => { const d = at([4, 5, 6, 8, 10], s); const a = 2 + (s % (d - 2)); const b = 1 + (s % (a - 1));
    return [`A ribbon is ${a}/${d} meter long. Cut off ${b}/${d} meter. Make what is left.`, a - b, d, `Same-size parts: ${a} − ${b} = ${a - b}, so ${a - b}/${d}.`]; },
  'add-related-fractions': (s) => { const [a, b, c, d] = at([[1, 2, 1, 4], [1, 4, 3, 8], [1, 3, 1, 6], [1, 2, 1, 8], [1, 5, 3, 10], [1, 6, 5, 12], [1, 2, 2, 6], [3, 4, 1, 8]] as const, s); const [n, den] = sumIn(a, b, c, d);
    return [`A jug has ${a}/${b} liter. Add ${c}/${d} liter. How much is there now?`, n, den, `Rename ${a}/${b} in ${unitWord(den)}, then add: ${n}/${den}.`]; },
  'add-unlike-fractions': (s) => { const [a, b, c, d] = at(UNLIKE_PAIRS, s + 1); const [n, den] = sumIn(a, b, c, d);
    return [`A jug has ${a}/${b} liter. Add ${c}/${d} liter. How much is there now?`, n, den, `Rename both in ${unitWord(den)}, then add: ${n}/${den}.`]; },
  'fractional-measure-addition': (s) => LESSON_BUILDS['add-related-fractions'](s + 1),
  'measurement-word-problems': (s) => LESSON_BUILDS['add-related-fractions'](s + 4),
  'subtract-unlike-fractions': (s) => { const [a, b, c, d] = at(UNLIKE_PAIRS, s); const [big, small] = a * d > c * b ? [[a, b], [c, d]] : [[c, d], [a, b]]; const [n, den] = sumIn(big[0], big[1], small[0], small[1], -1);
    return [`A jug is ${big[0]}/${big[1]} full. Pour out ${small[0]}/${small[1]}. Make what is left.`, n, den, `Rename both in ${unitWord(den)}, then take away: ${n}/${den}.`]; },
  'tenths-decimals': (s) => { const t = 1 + (s % 9); return [`A jar is 0.${t} full. Make it in tenths.`, t, 10, `0.${t} means ${t} ${t === 1 ? 'tenth' : 'tenths'}.`]; },
  'hundredths-decimals': (s) => { const h = at([5, 12, 25, 40, 63, 75, 9, 30, 50, 81], s); const dec = (h / 100).toFixed(2);
    return [`A battery shows ${dec}. Make it in hundredths.`, h, 100, `${dec} means ${h} hundredths.`]; },
  'decimal-fraction-equivalence': (s) => LESSON_BUILDS['hundredths-decimals'](s + 3),
  'compare-decimals': (s) => { const h = at([40, 35, 7, 70, 23, 32, 50, 5], s); const dec = String(h / 100);
    return [`A battery shows ${dec}. Make it in hundredths.`, h, 100, `${dec} is ${h} hundredths. Compare decimals as hundredths.`]; },
  'compare-decimals-grid': (s) => { const [a, b] = at([[40, 4], [25, 30], [6, 60], [75, 8], [50, 45], [9, 90], [33, 3], [80, 79], [12, 2], [64, 6], [5, 50], [99, 90]] as const, s);
    return [`Build ${a / 100} with hundredths. Then compare it to ${b / 100}.`, a, 100, `${a / 100} is ${a} hundredths and ${b / 100} is ${b} hundredths. Compare the hundredths.`]; },
  'add-tenths-hundredths': (s) => { const a = 1 + (s % 8); const b = at([4, 12, 25, 7, 31, 15, 9, 20], s);
    return [`A ribbon is ${a}/10 meter long. Add ${b}/100 meter more. How long is it now?`, 10 * a + b, 100, `${a}/10 = ${10 * a}/100. Add ${b}/100: ${10 * a + b}/100.`]; },
  'unit-fraction-multiples': (s) => { const d = at([3, 4, 5, 6, 8], s); const k = 2 + (s % (d + 1)); return [`${k} cups each hold 1/${d} cup of juice. Make the total.`, k, d, `${k} copies of 1/${d} is ${k}/${d}.`]; },
  'multiply-whole-by-fraction': (s) => { const d = at([3, 4, 5, 6, 8], s); const a = 2 + (s % (d - 2 || 1)); const k = 2 + (s % 2);
    return [`${k} cups each hold ${a}/${d} cup of juice. Make the total.`, k * a, d, `${k} groups of ${a}/${d} is ${k * a}/${d}. The parts stay ${unitWord(d)}.`]; },
  'fraction-recipes': (s) => { const [a, b] = at([[2, 3], [3, 4], [1, 2], [3, 8], [2, 5], [5, 6]] as const, s); return [`A recipe uses ${a}/${b} cup of flour. Double it. Make it in ${unitWord(b)}.`, 2 * a, b, `Double ${a}/${b}: ${a}/${b} + ${a}/${b} = ${2 * a}/${b}.`]; },
  'fraction-of-quantity': (s) => { const d = at([3, 4, 5, 6], s); const n = 1 + (s % (d - 1)); const total = d * (2 + (s % 3));
    return [`Put ${total} shells in ${d} equal groups. Pick ${n} of the groups.`, n, d, `${total} in ${d} groups is ${total / d} each. ${n} ${n === 1 ? 'group' : 'groups'} is ${n}/${d}.`, 'set', total]; },
  'sets-unit-fractions': (s) => { const d = at([2, 3, 4, 6, 8], s); const total = d * (2 + (Math.floor(s / 5) % 5));
    return [`Put ${total} shells in ${d} equal groups. Pick 1 of the groups.`, 1, d, `${total} in ${d} groups is ${total / d} each. 1 group is 1/${d}.`, 'set', total]; },
  'sets-nonunit': (s) => LESSON_BUILDS['fraction-of-quantity'](s + 1),
  'fraction-of-collection': (s) => LESSON_BUILDS['fraction-of-quantity'](s + 2),
  'multiplication-scaling': (s) => { const d = at([3, 4, 5, 6], s); const n = 1 + (Math.floor(s / 4) % (d - 1)); const total = d * (2 + (Math.floor(s / 12) % 3));
    // Factors below 1 shrink, a factor of 1 keeps and a factor above 1 grows: every third build is one of the last two.
    if (s % 3 === 2 && Math.floor(s / 3) % 2 === 0) return [`Build ${d}/${d} of ${total} counters. Is it less, the same or more?`, d, d, `${d}/${d} is 1 whole, so ${d}/${d} of ${total} is ${total}: the same.`, 'set', total];
    if (s % 3 === 2) return [`Build ${d + n}/${d} of 1 bar. Is it more or less than 1 bar?`, d + n, d, `${d + n}/${d} is more than ${d}/${d}, so it is more than 1 bar: a factor above 1 makes it bigger.`];
    return [`Build ${n}/${d} of ${total} counters. Make ${d} equal groups.`, n, d, `${n}/${d} of ${total} is less than ${total}: part of a group is less.`, 'set', total]; },
  'multiply-fractions': (s) => { const [a, b, c, d] = at([[1, 2, 3, 4], [2, 3, 1, 2], [1, 3, 3, 4], [2, 3, 3, 4], [1, 2, 1, 3], [3, 4, 1, 3], [1, 2, 1, 4], [2, 3, 2, 3], [1, 4, 3, 4], [1, 2, 2, 3], [3, 4, 3, 4], [1, 3, 1, 2]] as const, s);
    // A part of a part, before the area grid (next lesson): split each part again.
    return [`Make ${a}/${b} of ${c}/${d}.`, a * c, b * d, `Split each of the ${d} parts into ${b}: ${b * d} small parts in all. ${a}/${b} of ${c} ${c === 1 ? 'part' : 'parts'} is ${a * c} small ${a * c === 1 ? 'part' : 'parts'}: ${a * c}/${b * d}.`]; },
  'fraction-times-fraction': (s) => { const [a, b, c, d] = at([[2, 3, 4, 5], [3, 4, 1, 2], [1, 2, 2, 3], [3, 5, 2, 3], [2, 5, 3, 4], [1, 3, 3, 5], [5, 6, 1, 2], [3, 4, 3, 5], [1, 4, 2, 3], [2, 3, 5, 6], [4, 5, 1, 2], [1, 6, 3, 4], [1, 2, 3, 5], [1, 3, 1, 4], [2, 5, 1, 2], [3, 8, 2, 3]] as const, s);
    return [`Make ${a}/${b} × ${c}/${d}.`, a * c, b * d, `${a} of ${b} rows and ${c} of ${d} columns overlap on ${a * c} of ${b * d} parts: ${a * c}/${b * d}.`]; },
  'bigger-or-smaller': (s) => { const [a, b, c, d] = at([[3, 4, 2, 1], [5, 4, 2, 1], [2, 3, 3, 1], [4, 3, 1, 2], [1, 2, 3, 4], [3, 2, 2, 3], [3, 3, 3, 4], [5, 6, 2, 1], [7, 6, 1, 2], [2, 2, 5, 6], [4, 5, 2, 1], [6, 5, 1, 2]] as const, s);
    const amount = d === 1 ? String(c) : `${c}/${d}`; const way = a < b ? 'less than' : a > b ? 'more than' : 'the same as';
    return [`Make ${a}/${b} × ${amount}. Is it more or less than ${amount}?`, a * c, b * d, `${a}/${b} is ${a < b ? 'less than 1' : a > b ? 'more than 1' : '1'}, so the answer is ${way} ${amount}: ${a * c}/${b * d}.`]; },
  'share-or-fit': (s) => { const [b, n] = at([[2, 3], [3, 2], [4, 2], [2, 4], [3, 3], [2, 5]] as const, s); const [d, w] = at([[4, 3], [3, 2], [2, 3], [6, 1], [5, 2], [4, 2]] as const, s, 1);
    return s % 2 === 0
      ? [`Share 1/${b} of a pan among ${n} children. Build one share.`, 1, b * n, `Sharing: 1/${b} ÷ ${n} = 1/${b * n}. Check: ${n} × 1/${b * n} = 1/${b}.`]
      : [`How many 1/${d}-cup scoops fill ${w} ${w === 1 ? 'cup' : 'cups'}? Make it in ${unitWord(d)}.`, w * d, d, `Fitting: ${w} ÷ 1/${d} = ${w * d}. Check: ${w * d} × 1/${d} = ${w}.`]; },
  'dimes-and-pennies': (s) => { const [dimes, pennies] = at([[2, 3], [5, 1], [1, 7], [6, 4], [3, 9], [8, 2], [4, 5], [7, 6], [2, 8], [9, 1]] as const, s);
    return [`Make ${dimeWord(dimes)} and ${pennyWord(pennies)} as hundredths of a dollar.`, 10 * dimes + pennies, 100, `${dimeWord(dimes)} ${dimes === 1 ? 'is' : 'are'} ${10 * dimes}/100. ${pennyWord(pennies)} ${pennies === 1 ? 'is' : 'are'} ${pennies}/100. Together: ${10 * dimes + pennies}/100.`]; },
  'plot-in-eighths': (s) => { const [a, b] = at([[1, 1], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4], [3, 5], [4, 5], [4, 6], [5, 6], [5, 7], [6, 7]] as const, s);
    return [`Two pebbles are ${a}/8 and ${b}/8 inch. Show how long they are together.`, a + b, 8, `${a}/8 + ${b}/8 = ${a + b}/8 inch. Same-size parts: add the numerators.`, 'line']; },
  'party-portions': (s) => { const [n, a, b] = at([[3, 3, 4], [4, 2, 3], [5, 3, 8], [2, 5, 6], [2, 3, 4], [3, 2, 5], [2, 5, 8], [3, 4, 5], [4, 3, 8], [2, 4, 5], [3, 5, 6], [2, 7, 8]] as const, s);
    return [`Each guest eats ${a}/${b} pound. ${n} guests come. Build the total.`, n * a, b, `${n} groups of ${a} ${unitWord(b)} is ${n * a} ${unitWord(b)}: ${n * a}/${b}.`]; },
  'two-step-conversions': (s) => { const [w, part, word] = at([[1, 6, '1/2'], [1, 3, '1/4'], [2, 4, '1/3'], [1, 9, '3/4'], [2, 6, '1/2'], [1, 8, '2/3'], [2, 3, '1/4'], [1, 4, '1/3'], [2, 9, '3/4'], [1, 10, '5/6'], [2, 8, '2/3'], [1, 2, '1/6']] as const, s);
    const inches = `${w} ${w === 1 ? 'foot is' : 'feet are'} ${12 * w} inches. ${word} foot is ${part} more: ${12 * w + part} inches.`;
    // Every other build has a second step: change to inches, then take some away.
    const cut = s % 2 ? 1 + (s % part) : 0;
    return cut
      ? [`A rope is ${w} ${word} feet long. Pip cuts off ${cut} ${cut === 1 ? 'inch' : 'inches'}. Show what is left in inches, 12 to a foot.`, 12 * w + part - cut, 12, `${inches} Take away ${cut}: ${12 * w + part - cut} inches.`]
      : [`A rope is ${w} ${word} feet long. Show it in inches, 12 to a foot.`, 12 * w + part, 12, inches]; },
  'line-plot-totals': (s) => { const values = at([[1, 1, 2], [1, 2, 2], [1, 1, 4], [2, 2, 3], [1, 3, 4], [2, 3, 4], [2, 3, 5], [2, 4, 5], [3, 4, 5], [3, 4, 6], [3, 5, 6], [4, 5, 6]] as const, s);
    const total = values.reduce((sum, v) => sum + v, 0);
    return [`Cups hold ${values.map((v) => `${v}/8`).join(', ')} liter. Show the total on a line.`, total, 8, `${values.join(' + ')} = ${total} eighths: ${total}/8 liters.`, 'line']; },
  'fractional-side-area': (s) => { const [a, b, c, d] = at([[1, 3, 1, 4], [1, 2, 1, 3], [2, 3, 3, 4], [1, 2, 3, 4], [2, 3, 1, 2], [3, 4, 3, 4], [1, 3, 2, 3], [1, 2, 1, 4], [2, 3, 2, 3], [1, 4, 3, 4], [2, 5, 1, 2], [3, 5, 1, 2]] as const, s);
    return [`A rectangle is ${a}/${b} unit by ${c}/${d} unit. Find its area.`, a * c, b * d, `${a} of ${b} columns by ${c} of ${d} rows cover ${a * c} of ${b * d} equal squares.`]; },
  'multiply-mixed-numbers': (s) => { const [a, b, c, d] = at([[3, 2, 4, 3], [3, 2, 3, 2], [5, 4, 4, 3], [5, 4, 3, 2], [7, 4, 4, 3], [5, 3, 3, 2], [4, 3, 4, 3], [5, 4, 5, 4], [7, 6, 3, 2], [5, 4, 6, 5], [7, 4, 5, 4], [4, 3, 5, 3], [7, 4, 3, 2], [5, 3, 5, 4], [7, 6, 4, 3]] as const, s);
    return [`A rectangle is ${a}/${b} unit by ${c}/${d} unit. Find its area.`, a * c, b * d, `Multiply the sides: ${a}/${b} × ${c}/${d} = ${a * c}/${b * d}.`]; },
  'divide-whole-by-unit-fraction': (s) => { const d = at([2, 3, 4, 6], s); const w = 1 + (s % 3);
    return [`How many 1/${d}-cup scoops fill ${w} ${w === 1 ? 'cup' : 'cups'}? Make it.`, w * d, d, `Each cup holds ${d} scoops of 1/${d}. ${w} ${w === 1 ? 'cup holds' : 'cups hold'} ${w * d}.`]; },
  'unit-fraction-divided-whole': (s) => { const [b, n] = at([[2, 2], [2, 3], [3, 2], [2, 4], [4, 2], [3, 3], [2, 5], [2, 6]] as const, s);
    return [`Share 1/${b} of a pizza among ${n} children. Build one share.`, 1, b * n, `Cut 1/${b} into ${n} equal shares. Each is 1/${b * n} of the pizza.`]; },
  'divide-fractions': (s) => { const [a, b, d] = at([[3, 4, 8], [2, 3, 6], [1, 2, 8], [3, 5, 10], [5, 6, 12], [1, 2, 6], [1, 2, 4], [3, 4, 12], [2, 5, 10], [1, 3, 6], [2, 3, 12], [1, 4, 8]] as const, s);
    return [`How many 1/${d}s fit in ${a}/${b}? Make ${a}/${b} in ${unitWord(d)}.`, (a * d) / b, d, `${a}/${b} = ${(a * d) / b}/${d}. So ${(a * d) / b} pieces of 1/${d} fit.`]; },
  'fractional-sharing': (s) => { const [a, b] = at([[3, 4], [2, 3], [3, 5], [4, 3], [5, 4], [2, 5], [5, 6], [3, 2]] as const, s);
    return [`${a} pizzas are shared fairly by ${b} tables. Build how much one table gets.`, a, b, `${a} ÷ ${b} = ${a}/${b}. Each table gets ${a}/${b} of a pizza.`]; },
  'fraction-as-division': (s) => { const [a, b] = at([[5, 4], [7, 3], [3, 8], [9, 4], [2, 5], [7, 4], [5, 6], [5, 3], [4, 3], [3, 5], [8, 3], [5, 2]] as const, s);
    return [`Make ${a} ÷ ${b} as a fraction.`, a, b, `${a} ÷ ${b} = ${a}/${b}. The fraction bar means divide.`]; },
  'fraction-of-length': (s) => { const d = at([4, 8, 3, 6], s); const n = 1 + (s % (d - 1)); return [`Cut 0 to 1 into ${d} equal spaces. Make ${n} ${n === 1 ? 'jump' : 'jumps'}.`, n, d, `Each space is 1/${d}. ${n} ${n === 1 ? 'jump is' : 'jumps make'} ${n}/${d}.`, 'line']; },
  // Grade 3 measures to the nearest half or fourth inch (3.MD.4).
  'ruler-measurement': (s) => { const k = s % 14; const d = k < 11 ? 4 : 2; const n = k < 11 ? k + 1 : k - 10; return [`Mark ${mixedName(n, d)} ${n > d ? 'inches' : 'inch'} on the ruler.`, n, d, `Each small ruler space is 1/${d} inch. ${n} ${n === 1 ? 'space is' : 'spaces are'} ${mixedName(n, d)} ${n > d ? 'inches' : 'inch'}.`, 'line']; },
  // Grade 3 line plots use halves and fourths of an inch, up to 3 inches (3.MD.4): 11 fourths, then 3 halves.
  'build-line-plots': (s) => { const k = s % 14; const d = k < 11 ? 4 : 2; const twice = k < 11 ? 1 + k : k - 10; const other = twice === 3 * d - 1 ? 1 : twice + 1;
    const vals = (s % 3 ? [twice, other, twice] : [other, twice, twice]).map((v) => mixedName(v, d));
    const unit = (v: number) => (v > d ? 'inches' : 'inch');
    const thing = at(['Ribbons', 'Leaves', 'Pencils', 'Shells', 'Twigs'], s);
    return [`${thing} are ${vals.slice(0, -1).join(', ')} and ${vals[vals.length - 1]} ${unit(Math.max(twice, other))} long. Mark where 2 Xs go.`, twice, d, `${mixedName(twice, d)} ${unit(twice)} comes up twice, so 2 Xs stack there.`, 'line']; },
  'read-line-plots': (s) => { const lo = 1 + (s % 3); const hi = Math.min(8, lo + 1 + (Math.floor(s / 3) % 6)); return [`The shortest mark is ${lo}/8 inch and the longest is ${hi}/8 inch. Find their difference.`, hi - lo, 8, `Longest minus shortest: ${hi}/8 − ${lo}/8 = ${hi - lo}/8.`]; },
  // Totals that split into 3 equal shares of whole fourths: dividing a fourth into thirds is not taught here.
  'line-plot-leveling': (s) => { const a = 1 + (s % 10); const [b, c] = [a + 1, a + 2]; const total = a + b + c;
    return [`Three beakers hold ${a}/4, ${b}/4 and ${c}/4 liters. Share the total equally.`, total / 3, 4, `The total is ${total}/4. Split ${total} fourths into 3 equal shares: ${total / 3}/4 liter each.`]; },
  'fractional-unit-conversions': (s) => { const [frac, unit, val, small, per] = at([['1/4', 'hour', 15, 'minutes', 60], ['1/2', 'hour', 30, 'minutes', 60], ['3/4', 'hour', 45, 'minutes', 60], ['1/3', 'hour', 20, 'minutes', 60],
      ['2/3', 'hour', 40, 'minutes', 60], ['1/6', 'hour', 10, 'minutes', 60], ['1/8', 'pound', 2, 'ounces', 16], ['3/8', 'pound', 6, 'ounces', 16], ['1/10', 'meter', 10, 'centimeters', 100], ['3/10', 'meter', 30, 'centimeters', 100], ['1/12', 'foot', 1, 'inches', 12], ['5/12', 'foot', 5, 'inches', 12],
      ['1/2', 'foot', 6, 'inches', 12], ['3/4', 'foot', 9, 'inches', 12], ['1/4', 'dollar', 25, 'cents', 100], ['3/4', 'dollar', 75, 'cents', 100], ['1/2', 'day', 12, 'hours', 24], ['1/4', 'day', 6, 'hours', 24], ['1/2', 'liter', 500, 'milliliters', 1000], ['1/4', 'kilogram', 250, 'grams', 1000]] as const, s);
    const [n, d] = frac.split('/').map(Number); return [`Show why ${frac} ${unit} is ${val} ${small}.`, n, d, `${/^(a|e|i|o|u|hour)/i.test(unit) ? 'An' : 'A'} ${unit} is ${per} ${small}. ${frac} of ${per} is ${val}.`]; },
  'fraction-probability': (s) => { const total = at([4, 5, 6, 8, 10], s); const g = 1 + (s % (total - 1)); return [`A bag has ${total} marbles. ${g} ${g === 1 ? 'is' : 'are'} green. Make the chance of green.`, g, total, `${g} green out of ${total} marbles is ${g}/${total}.`]; },
  // Lesson 75 goes from a fraction to a percent (lesson 76 goes back), so its extra builds do too.
  'fractions-to-percent': (s) => { const [n, d] = at([[1, 4], [1, 2], [3, 4], [1, 5], [2, 5], [3, 5], [1, 10], [3, 10], [7, 10], [4, 5]] as const, s); const k = 100 / d;
    return [`Write ${n}/${d} in hundredths to find its percent. Make it.`, n * k, 100, `100 ÷ ${d} = ${k}, and ${n} × ${k} = ${n * k}: ${n}/${d} = ${n * k}/100 = ${n * k}%.`]; },
  'percent-to-fraction': (s) => LESSON_BUILDS['fractions-to-percent'](s + 3),
  'estimate-fraction-operations': (s) => { const [a, b, c, d] = at([[1, 2, 1, 3], [3, 4, 1, 2], [1, 4, 1, 3], [2, 3, 1, 2], [1, 5, 1, 4], [1, 6, 1, 3], [3, 8, 1, 2], [2, 3, 3, 4], [1, 2, 1, 4], [4, 5, 1, 2], [1, 3, 1, 6], [5, 8, 3, 4]] as const, s); const [n, den] = sumIn(a, b, c, d);
    // Both parts on the same side of 1/2 (or one is 1/2), so the benchmarks decide.
    const side = a * 2 + c * 2 === b + d ? '' : (a * 2 < b || c * 2 < d) && !(a * 2 > b || c * 2 > d) ? 'Both parts are 1/2 or less, so the sum is less than 1.' : 'Both parts are 1/2 or more, so the sum is more than 1.';
    return [`Estimate ${a}/${b} + ${c}/${d}. Is it more or less than 1?`, n, den, `Compare each part to 1/2. ${side} It is ${n}/${den}.`]; },
  'multi-step-fraction-stories': (s) => { const d = at([5, 6, 8, 10], s); const a = 1 + (s % (d - 3)); const b = 1 + ((s + 1) % (d - a - 1));
    // Every other build takes away first, then adds.
    if (s % 2) return [`A jug has ${d - 1}/${d} liter. Sam drinks ${a}/${d} liter, then adds ${b}/${d} liter. Make what is in the jug now.`, d - 1 - a + b, d, `First ${d - 1} − ${a} = ${d - 1 - a}. Then ${d - 1 - a} + ${b} = ${d - 1 - a + b}. So ${d - 1 - a + b}/${d} liter.`];
    return [`A garden is ${a}/${d} planted. Plant ${b}/${d} more. Make the part still empty.`, d - a - b, d, `First ${a} + ${b} = ${a + b} parts are planted. Then ${d} − ${a + b} = ${d - a - b} ${d - a - b === 1 ? 'part is' : 'parts are'} empty.`]; },
  'find-the-whole': (s) => { const [n, d] = at([[3, 4], [2, 5], [4, 3], [3, 6], [5, 2], [2, 8], [4, 4], [3, 3], [2, 6], [5, 3], [6, 2], [3, 5], [2, 4], [4, 2], [2, 3], [5, 4]] as const, s);
    return [`${n} stickers are 1/${d} of a pack. Build the whole pack.`, d, d, `Each part is ${n}. ${d} parts make the whole pack: ${n * d} stickers.`, 'set', n * d]; },
  // The wrong sum's denominator (2d) stays a grade 4 one.
  'spot-the-mistake': (s) => { const d = at([4, 5, 6], s); const a = 1 + (s % (d - 2)); const b = 1 + ((s + 2) % (d - a - 1 || 1));
    return [`Sam says ${a}/${d} + ${b}/${d} = ${a + b}/${2 * d}. Make the right answer.`, a + b, d, `Same-size parts keep their name: ${a}/${d} + ${b}/${d} = ${a + b}/${d}.`]; },
  'fraction-of-remainder': (s) => { const [a, b, c, e] = at([[1, 3, 1, 2], [1, 4, 1, 3], [1, 2, 1, 2], [2, 5, 1, 3], [1, 4, 2, 3], [1, 3, 1, 4], [1, 2, 1, 3], [1, 2, 1, 4], [3, 4, 1, 3], [1, 5, 1, 2], [2, 3, 1, 2], [1, 6, 1, 4]] as const, s);
    const left = (b - a) * (e - c); const den = b * e;
    return [`Eat ${a}/${b} of a pizza. Then eat ${c}/${e} of the rest. Make what is left.`, left, den, `First ${b - a}/${b} is left. Then ${e - c}/${e} of that is left: ${left}/${den}.`]; },
};

// Builds whose words name the ruler or the plot always start on the line. Builds that say "Shade 3" or "Plant 4" are
// worded for the number line when they start on it.
const LINE_ONLY_BUILDS = new Set(['build-line-plots', 'ruler-measurement']);
const BAR_WORDED_BUILDS = new Set(['equal-parts', 'fraction-of-area']);
/** One extra build for lesson `id` from its own family, or null when the lesson has none. */
function lessonBuildCheck(id: string, serial: number, checkId: string): BuildCheck | null {
  const make = LESSON_BUILDS[id];
  if (!make) return null;
  const [prompt, n, d, explanation, made = 'bar', total] = make(serial);
  if (!(d > 1 && n > 0 && n <= d * 3)) return null;
  // Every other run of builds starts on the other model (each build asks for a bar and a number line), so a story can
  // come back as a new build.
  // Line plots stay on the line: a bar is not a line plot.
  // So does a build whose words name its model ("on a line", "jumps", an area or a product).
  const named = /\bline\b|\bjumps?\b|\bspaces\b/i.test(prompt) || /\barea\b|\brectangle\b|\bbars?\b|×/i.test(prompt);
  const flip = Math.floor(serial / 10) % 2 === 1 && !LINE_ONLY_BUILDS.has(id) && !named;
  const kind = flip && made === 'bar' ? 'line' : flip && made === 'line' ? 'bar' : made;
  const words = kind === 'line' && BAR_WORDED_BUILDS.has(id) ? `Cut 0 to 1 into ${d} equal spaces. Make ${n} ${n === 1 ? 'jump' : 'jumps'}.` : prompt;
  return {
    id: checkId, prompt: words, target: model(n, d, kind, total), explanation, transfer: true,
    ...arrangeReasons(`${id}:${checkId}:lesson:${serial}`, idea(id, explanation, serial), wrongReasons(id, serial)),
  };
}

const PRACTICE_DENOMINATORS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 16, 20];
function seededBuildCheck(id: string, serial: number, checkId: string): BuildCheck {
  const [baseN, baseD, baseKind] = CHECKS[id];
  const dens = PRACTICE_DENOMINATORS.filter((den) => gradeFits(id, den));
  const d = dens[serial % dens.length];
  const nudge = Math.floor(serial / dens.length) % 5 - 2;
  const n = Math.max(1, Math.min(d * 3, Math.round((baseN / baseD) * d) + nudge));
  const kind: LearningModel['kind'] = id.startsWith('number-line') ? 'line'
    : baseKind === 'set' && d <= 12 && n <= d ? 'set' : 'bar';
  const target = model(n, d, kind, kind === 'set' ? d * 4 : undefined);
  const explanation = `Split one whole into ${d} equal parts. Show ${n} of those parts.`;
  return {
    id: checkId, prompt: kind === 'set'
      ? `Build ${n}/${d} of ${d * 4} counters. Make ${d} equal groups.`
      : `Build ${n}/${d}. Show the same amount with a bar and a number line.`,
    target, explanation, transfer: true,
    ...arrangeReasons(`${id}:${checkId}:seed:${serial}`, idea(id, explanation, serial), wrongReasons(id, serial)),
  };
}

/** Ten optional, interactive Build questions, with a fresh deterministic set available on demand. */
export function getBuildPracticeChecks(id: string, batch = 0, count = 10): BuildCheck[] {
  if (!Number.isInteger(batch) || batch < 0 || !Number.isInteger(count) || count < 1 || count > 50) {
    throw new Error('Build practice batch and question count must be non-negative whole numbers.');
  }
  const cacheKey = `${id}:${batch}:${count}`;
  const cached = BUILD_PRACTICE_CACHE.get(cacheKey);
  if (cached) return cached;

  const required = buildChecksFor(id);
  const excludedTargets = new Set(required.map(targetKey));
  const all: BuildCheck[] = [];
  const seenTargets = new Set<string>([...excludedTargets, ...required.map((check) => check.prompt)]);
  // Worksheet variants provide new, curriculum-aligned numbers. Twelve variants × twelve rows
  // is a generous unique pool; later sets can still be generated without breaking the lesson.
  for (let serial = 0; serial < 12 * 12 && all.length < (batch + 1) * count; serial++) {
    const check = worksheetBuildCheck(id, serial, `practice-${serial}`);
    if (!check) continue;
    const key = targetKey(check);
    if (seenTargets.has(key)) continue;
    seenTargets.add(key);
    all.push(check);
  }
  // Then the lesson's own family, with new numbers; the generic builder only for a lesson with no family.
  for (let serial = 0; all.length < (batch + 1) * count && serial < (batch + 1) * count * 100; serial++) {
    const check = lessonBuildCheck(id, serial, `lesson-${serial}`);
    if (!check) break;
    // Never the lesson's own builds again, and never the same build twice.
    const key = targetKey(check);
    if (seenTargets.has(key)) continue;
    seenTargets.add(key);
    all.push(check);
  }
  // A lesson with its own family repeats its own builds rather than borrow unrelated ones.
  for (let serial = 0; !(id in LESSON_BUILDS) && all.length < (batch + 1) * count && serial < (batch + 1) * count * 100; serial++) {
    const check = seededBuildCheck(id, serial, `generated-${serial}`);
    const key = targetKey(check);
    if (seenTargets.has(key)) continue;
    seenTargets.add(key);
    all.push(check);
  }
  if (!all.length) throw new Error(`No optional Build practice questions available for ${id}`);
  while (all.length < (batch + 1) * count) all.push(all[all.length % Math.max(1, all.length)]);
  const selected = all.slice(batch * count, (batch + 1) * count).map((check, index) => acceptAnyName(id, {
    ...check, id: `practice-${batch + 1}-${index + 1}`, stepLabel: `Extra build ${index + 1} of ${count}`,
  }));
  BUILD_PRACTICE_CACHE.set(cacheKey, selected);
  return selected;
}
function transferTarget(id: string, n: number, d: number, kind: LearningModel['kind']) {
  const authored = EXTENSION_TRANSFERS[id];
  if (authored) return {
    prompt: authored.prompt, target: model(authored.n, authored.d, authored.kind ?? 'bar', authored.total), reason: authored.reason,
  };
  // Lesson 53 takes one group (a unit fraction); taking more than one group is lesson 54.
  if (id === 'sets-unit-fractions') return { prompt: 'Put 20 beads in 5 equal groups. Pick 1 of the groups.', target: model(1, 5, 'set', 20), reason: '20 in 5 groups is 4 each. 1 group is 1/5.' };
  if (id.startsWith('sets-')) return { prompt: 'Put 20 beads in 5 equal groups. Pick 3 groups.', target: model(3, 5, 'set', 20), reason: '20 in 5 groups is 4 each. 3 groups is 3/5.' };
  if (id.includes('equivalent')) return lessonGrade(id) === 3
    ? { prompt: 'A ribbon is 3/4 colored. Show it in eighths.', target: model(6, 8), reason: '1 fourth is 2 eighths. So 3/4 = 6/8.' }
    : { prompt: 'A ribbon is 3/5 colored. Show it in tenths.', target: model(6, 10), reason: '1 fifth is 2 tenths. So 3/5 = 6/10.' };
  if (id === 'add-related-fractions') return { prompt: 'Make 1/4 + 1/2 using fourths.', target: model(3, 4), reason: '1/2 = 2/4. 1 + 2 = 3, so 3/4.' };
  if (id === 'add-tenths-hundredths') return { prompt: 'Make 5/10 + 20/100 using hundredths.', target: model(70, 100), reason: '5/10 = 50/100. 50 + 20 = 70, so 70/100.' };
  if (id === 'tenths-decimals' || id === 'hundredths-decimals') return { prompt: 'Show 0.7 using tenths.', target: model(7, 10), reason: '0.7 means 7 tenths.' };
  if (id === 'compose-to-one') return { prompt: 'A recipe uses 2/5 of a bag. Make what is left.', target: model(3, 5), reason: '5/5 is a full bag. 5 take away 2 is 3, so 3/5.' };
  if (id === 'subtract-like-denominators') return { prompt: 'A ribbon is 7/10 meter long. Cut off 3/10 meter. Make what is left.', target: model(4, 10), reason: '7 − 3 = 4, so 4/10.' };
  if (id === 'add-like-denominators') return { prompt: 'Make 1/5 + 2/5.', target: model(3, 5), reason: '1 + 2 = 3, so 3/5.' };
  if (id === 'unit-size') return { prompt: 'Which is bigger, 1/3 or 1/6? Make it.', target: model(1, 3), reason: 'Six equal parts make smaller parts than three on the same-size whole, so 1/6 is smaller than 1/3.' };
  if (id === 'compare-same-numerator') return { prompt: 'Which is bigger, 2/3 or 2/6? Make it.', target: model(2, 3), reason: 'Both same-size wholes count 2 parts. Six equal parts make smaller parts than three, so 2/6 is smaller than 2/3.' };
  if (id === 'benchmark-half') return { prompt: 'Use sixths. Make a fraction that is 1 part less than half.', target: model(2, 6), reason: 'Half is 3/6. One part less is 2/6.' };
  if (id === 'fraction-magnitude') return { prompt: 'Use eighths. Make a fraction 1 part less than half (half is 4/8).', target: model(3, 8), reason: 'Half is 4/8. One part less is 3/8.' };
  if (id === 'benchmarks-zero-one') return { prompt: 'A jug is 1/6 away from full. Show how full it is.', target: model(5, 6), reason: '6/6 is full. One less is 5/6.' };
  if (id === 'compare-same-denominator' || id === 'order-fractions') return { prompt: 'Which is longer, 2/6 or 4/6 of a meter? Make it.', target: model(4, 6), reason: 'Both use sixths, so the parts are the same size. Four sixths is longer because 4 parts are more than 2.' };
  // New parts for the last step: sixths or fourths in grade 3, fifths or fourths later.
  const nextD = lessonGrade(id) === 3 ? (d === 6 ? 4 : 6) : d === 5 ? 4 : 5; const nextN = n > d ? nextD + 2 : id === 'unit-fractions' || id === 'equal-parts' ? 1 : 3;
  return { prompt: kind === 'line' ? `Mark ${f(nextN, nextD)} on the number line.` : `A ribbon is ${f(nextN, nextD)} colored. Make ${f(nextN, nextD)}.`, target: model(nextN, nextD, kind),
    reason: `One whole is ${nextD} equal parts. Count ${nextN} of them.` };
}

/** Skill-specific authored templates and varied numbers, not recycled answer choices.
    Lessons that share a skill family still get their own sheet (different question types). */
/** The standards one worksheet row really tests: the lesson's list, less the ones a row of this kind does not reach, so a Check-in
    credits a standard only for a question that asks it. A row left with none (a stretch question) is not asked in a Check-in. */
function rowStandards(id: string, row: WorksheetProblem): string[] {
  const all = [...standardsForMission(id)];
  const keep = (standard: string, test: boolean) => all.filter(item => item !== standard || test);
  switch (id) {
    // 3.G.2 is about shapes: only the rows that show one.
    case 'equal-parts': return keep('3.G.2', !!row.area);
    // 3.NF.3c is a whole number written as a fraction: the rows that set n/n beside 1.
    case 'improper-fractions': {
      const same = /^Put <, = or > in the gap: (\d+)\/(\d+) __ 1\.$/.exec(row.prompt);
      const whole = (!!same && same[1] === same[2]) || /^Write \d+ as a fraction with a denominator of 1\.$|^How many wholes are \d+\/\d+\?$/.test(row.prompt);
      return keep('3.NF.3c', whole);
    }
    // 4.NF.4a is n groups of one unit fraction: the n × 1/b rows.
    case 'multiply-whole-by-fraction': return keep('4.NF.4a', /^\d+ × 1\/\d+ = \?$/.test(row.prompt));
    // 5.NF.7b counts unit fractions in a whole: the part must be 1/b of it (2/3 or 3/5 of it are stretch questions).
    case 'find-the-whole': return keep('5.NF.7b', /(?:^|\D)1\/\d+/.test(row.prompt));
    default: return all;
  }
}

/** The lesson's 12 worksheet problems. `variant` 0 is the lesson's own sheet; 1, 2, … give the same kinds of
    questions with new numbers (used when a child redoes a finished worksheet). */
export function getWorksheet(id: string, variant = 0): WorksheetProblem[] {
  const tag = (rows: WorksheetProblem[]) => rows.map(row => {
    const bare = !row.model && !row.area && !row.rulerTask && !row.linePlotTask && !row.scaleTask && !row.picture;
    const picture = bare ? autoPicture(row.prompt) : null;
    return { ...row, standards: rowStandards(id, row), ...(picture ? { picture } : {}) };
  });
  if (!variant) return tag(buildWorksheet(id, 0));
  // Each redo sheet is built from the one before it, so map any variant onto a cycle of REDO_CYCLE sheets. Check-ins
  // ask for variants in the millions, which would otherwise build (and recurse through) every sheet before them.
  if (variant < 0 || variant > REDO_CYCLE) return getWorksheet(id, 1 + (Math.abs(variant) - 1) % REDO_CYCLE);
  const key = `${id}:${variant}`;
  const cached = VARIANT_CACHE.get(key);
  if (cached) return tag(cached);
  // Keep each new row inside the lesson's own number range, and make it differ from the lesson's row when possible.
  const base = buildWorksheet(id, 0);
  const limit = Math.max(...base.map(largestBottom));
  const same = (a: WorksheetProblem, b: WorksheetProblem) => a.prompt === b.prompt && a.answer === b.answer && JSON.stringify(a.model) === JSON.stringify(b.model);
  const used = new Set<string>(); // no question twice on one sheet (same words and same picture)
  const rowKey = (row: WorksheetProblem) => `${row.prompt}|${row.answer}|${JSON.stringify(row.model ?? row.area ?? null)}`;
  // The sheet just before this one (the lesson's own sheet for the first redo): a redo repeats none of its questions.
  if (variant > 1 && !VARIANT_CACHE.has(`${id}:${variant - 1}`)) getWorksheet(id, variant - 1);
  const previous = new Set((variant > 1 ? VARIANT_CACHE.get(`${id}:${variant - 1}`)! : base).map(rowKey));
  // Candidates for each row: this redo's own row, then the same row from later redos. Take the first one from the
  // best group, always in range: new (differs from the lesson's row and the sheet before); else not on the sheet
  // before; else at least not already on this sheet; else the lesson's own row.
  const candidates = Array.from({ length: 24 }, (_, k) => buildWorksheet(id, variant + k));
  const tiers: ((row: WorksheetProblem, i: number) => boolean)[] = [
    (row, i) => largestBottom(row) <= limit && !same(row, base[i]) && !used.has(rowKey(row)) && !previous.has(rowKey(row)),
    (row) => largestBottom(row) <= limit && !used.has(rowKey(row)) && !previous.has(rowKey(row)),
    (row) => largestBottom(row) <= limit && !used.has(rowKey(row)),
  ];
  const sheet = base.map((_, i) => {
    let chosen: WorksheetProblem | undefined;
    for (const fits of tiers) { chosen = candidates.map((alt) => alt[i]).find((row) => row && fits(row, i)); if (chosen) break; }
    chosen ??= base[i];
    used.add(rowKey(chosen));
    return chosen;
  });
  VARIANT_CACHE.set(key, sheet);
  return tag(sheet);
}
const VARIANT_CACHE = new Map<string, WorksheetProblem[]>();
/** [pieces in one whole, pieces from half] for the halfway lessons: fourths, sixths and eighths. */
const HALF_STEPS: [number, number][] = [[4, 1], [6, 1], [8, 1], [6, 2], [8, 2], [8, 3]];
/** [numerator, denominator, nearest of 0, 1/2 and 1] in grade 3 parts, mixing the three answers. */
const NEAREST_BENCHMARK: [number, number, string][] = [[1, 6, '0'], [3, 8, '1/2'], [7, 8, '1'], [2, 6, '1/2'], [5, 6, '1'], [1, 8, '0'],
  [5, 8, '1/2'], [2, 3, '1/2'], [4, 6, '1/2'], [1, 3, '1/2'], [2, 4, '1/2'], [3, 6, '1/2'], [4, 8, '1/2']];
/** "4", or "1 and a half" for an odd count. */
const halfOf = (n: number) => (n % 2 ? `${(n - 1) / 2} and a half` : String(n / 2));
const REDO_CYCLE = 24;
const largestBottom = (p: WorksheetProblem) => Math.max(0, ...execAll(`${p.prompt} ${p.answer}`, /\d+\/(\d+)/g).map((m) => Number(m[1])));

function buildWorksheet(id: string, variant: number): WorksheetProblem[] {
  if (!CHECKS[id]) throw new Error(`Missing worksheet: ${id}`);
  const extension = EXTENSION_WORKSHEETS[id];
  if (extension) return getExtensionWorksheet(extension, variant, id);
  const shift = variant % 12; // one step per redo round, so back-to-back redos never repeat a row's numbers
  // The first lessons use small denominators and an interactive bar the child copies before answering.
  const isIntroTopic = ['equal-parts', 'fraction-names', 'unit-fractions'].includes(id);
  // Denominators fit the lesson's grade: grade 3 uses halves to eighths (no fifths, tenths or twelfths).
  const grade3 = lessonGrade(id) === 3;
  // Grade 3 has only four denominators: this order keeps every question on the lesson's own sheet different.
  const table = grade3 ? [3, 6, 4, 8, 4, 3, 6, 3, 8, 4, 6, 8] : [3, 4, 5, 6, 8, 10, 2, 5, 12, 4, 6, 8];
  return Array.from({ length: 12 }, (_, i) => {
    const t = (i + shift) % 12; // row in the number tables (the question type still follows i)
    // The intro list repeats every 5, so its shift cycles 1–4 (never a multiple of 5) and back-to-back redos differ.
    // Equal parts keeps to 6 parts or fewer (its four-number list still moves on with every redo).
    const introShift = variant ? (variant - 1) % 4 + 1 : 0;
    // Equal parts: the denominator moves on a step every 4 rows, so no two rows ask the same thing.
    const d = id === 'equal-parts' ? [3, 4, 6, 2][(i + introShift) % 4] : isIntroTopic ? [3, 4, 8, 6, 2, 3, 4, 8, 6, 2, 3, 4][(i + introShift) % 12] : table[t];
    const n = 1 + (i + variant) % (d - 1);
    const value = f(n, d);
    let prompt = ''; let answer = value; let hint = 'The numerator is the number of parts you count. The denominator is the number of equal parts in one whole.';
    let visual: LearningModel | undefined; let form: WorksheetProblem['form']; let denominator: number | undefined;
    let modelRequired = false; let task: BarTask | undefined; let area: AreaFigure | undefined; let areaTask: AreaTask | undefined; let why: string | undefined;
    let picture: ModelSpec | undefined;
    const context = ['ribbon', 'paper strip', 'rope', 'piece of tape'][i % 4];
    switch (id) {
      case 'equal-parts': {
        // Shading only appears when it means something (the part being named, or parts the child marks).
        const kind = i % 4; const later = i >= 4; // second half (rows 5 to 8): same ideas, new words
        // ...and new numbers: row 5 would otherwise count the same parts as row 1, and row 7 name the same part as row 3.
        const dd = later ? ({ 3: 6, 4: 8, 6: 3, 2: 4 } as Record<number, number>)[d] ?? d : d;
        if (kind === 0) {
          prompt = later ? 'Tap each part to count it. How many equal parts make the whole bar?' : 'Tap each part to count it. How many equal parts is this bar cut into?';
          answer = String(dd); visual = model(0, dd); task = { kind: 'count', n: dd };
          hint = 'Count every part, one at a time.';
          why = `The bar has ${dd} parts, and they are all the same size.`;
        } else if (kind === 1) {
          // Sometimes fair, sometimes one piece is clearly bigger.
          const fair = i % 8 === 5;
          prompt = later ? 'Are all the parts of this bar the same size? Answer yes or no.' : 'Is this bar cut into equal parts? Answer yes or no.';
          answer = fair ? 'yes' : 'no'; form = 'word';
          visual = { ...model(0, d), sizes: fair ? undefined : Array.from({ length: d }, (_, k) => (k === (i % d) ? 2 : 1)) };
          hint = 'Equal parts are all the same size. Compare the parts.';
          why = fair ? `All ${d} parts match in size, so they are equal parts.` : 'One part is bigger than the others, so the parts are not equal.';
        } else if (kind === 2) {
          prompt = later ? 'The shaded part is 1 of the equal parts. What fraction of the bar is shaded?' : 'One part is shaded. What fraction of the whole bar is it?';
          answer = f(1, dd); visual = model(1, dd); task = { kind: 'copy', n: 1 };
          hint = 'The bottom number is how many equal parts make the whole. The top number is the 1 shaded part.';
          why = `${dd} equal parts make the whole bar, and 1 of them is shaded: 1/${dd}.`;
        } else {
          prompt = later ? 'Color 1 equal part of this bar. What fraction did you color?' : 'Shade 1 part of this bar. What fraction of the bar did you shade?';
          answer = f(1, d); visual = model(0, d); task = { kind: 'shade', n: 1 };
          hint = 'Count all the equal parts in the bar. Then think about the part you shaded.';
          why = `The bar has ${d} equal parts. You shaded 1 of them, so it is 1/${d}.`;
        }
        // A pizza whose slices are not fair: 4 slices, but not fourths.
        if (i === 7) {
          // Redos sometimes show a fair pizza, so "no" is not always the answer.
          const fair = variant % 2 === 1 ? circleCut(d) : undefined;
          prompt = `Is this pizza cut into ${fair ? d : 4} equal slices? Answer yes or no.`; answer = fair ? 'yes' : 'no'; form = 'word'; visual = undefined; task = undefined;
          area = { cut: fair ?? 'circle-unequal' }; hint = 'Equal slices are all the same size. Is one slice bigger than the others?';
          why = fair ? `All ${d} slices are the same size, so they are equal slices.` : 'One slice is bigger than the others, so the slices are not equal.';
        }
        // Last four: squares whose equal parts may have different shapes (same size, not always same shape). The first
        // sheet keeps its four; redo sheets swap to a second set, so a redo never repeats the sheet before it.
        if (i >= 8) {
          const row = SQUARE_ROWS[variant === 0 ? 0 : 2 - (variant % 2)][i - 8];
          prompt = row.prompt; answer = row.answer; form = row.answer === 'yes' || row.answer === 'no' ? 'word' : undefined;
          visual = undefined; task = undefined; area = row.shaded ? { cut: row.cut, shaded: row.shaded } : { cut: row.cut }; hint = row.hint; why = row.why;
        }
        modelRequired = !!task; break;
      }
      case 'unit-fractions':
        prompt = i % 3 === 0 ? `Tap each 1/${d} part to count it. How many 1/${d} parts make one whole?` :
          i % 3 === 1 ? (i < 6 ? `${d} friends share this bar fairly. Shade one friend's share. What fraction is it?` : `Shade 1 part. ${d} parts make the whole bar. What fraction did you shade?`) :
          i < 6 ? 'One part of this bar is shaded. What fraction is it?' : 'What unit fraction of this bar is shaded?';
        answer = i % 3 === 0 ? String(d) : f(1, d);
        visual = model(i % 3 === 2 ? 1 : 0, d); task = i % 3 === 0 ? { kind: 'count', n: d } : i % 3 === 1 ? { kind: 'shade', n: 1 } : { kind: 'copy', n: 1 };
        modelRequired = true;
        hint = 'A unit fraction is 1 equal part. The denominator is how many parts make one whole.';
        why = i % 3 === 0 ? `${d} parts of 1/${d} fill the bar, so ${d} of them make one whole.`
          : i % 3 === 1 ? (i < 6 ? `${d} friends need ${d} equal parts. One friend's share is 1 of them: 1/${d}.` : `1 of the ${d} equal parts is shaded, so it is 1/${d}.`)
            : `The bar has ${d} equal parts and 1 is shaded, so it is 1/${d}.`;
        // A circle too: one slice of a fairly cut pizza is a unit fraction.
        if (i === 8 && circleCut(d)) {
          prompt = 'One slice of this pizza is shaded. All the slices are the same size. What unit fraction is it?'; answer = f(1, d);
          area = { cut: circleCut(d)!, shaded: [0] }; visual = undefined; task = undefined; modelRequired = false;
          hint = `Count all the slices. ${d} same-size slices make the whole pizza.`;
          why = `1 slice out of ${d} same-size slices is 1/${d} of the pizza.`;
        }
        // Last three: one fourth of a square can look different (1 small square, or 2 triangles). Odd redo sheets ask
        // about the same shapes in new ways, so a redo never repeats the sheet before it.
        if (i >= 9 && variant % 2 === 1) {
          visual = undefined; task = undefined; modelRequired = false;
          if (i === 9) {
            prompt = 'What fraction of the square is shaded?'; answer = '2/4';
            area = { cut: 'fourths-triangles', shaded: [0, 1] };
            hint = 'The 4 triangles are the same size. Count all of them, then the shaded ones.';
            why = '2 of the 4 same-size triangles are shaded, so it is 2/4.';
          } else if (i === 10) {
            prompt = 'What fraction of the square do the 2 shaded triangles cover?'; answer = '1/4';
            area = { cut: 'quarter-and-triangles', shaded: [1, 2] };
            hint = 'Each triangle is half of a small square. How many small squares would fill the whole square?';
            why = 'The 2 triangles fill one small square, and 4 small squares fill the whole square. So they cover 1/4.';
          } else {
            prompt = 'What fraction of the square is the shaded small square?'; answer = '1/4';
            area = { cut: 'fourths-mixed', shaded: [0] };
            hint = 'Look at the left half and the right half. How is each half cut?'; why = MIXED_FOURTHS_WHY;
          }
        } else if (i === 9) {
          // The picture is shaded already: telling the child what to color and then asking what they colored gives it away.
          prompt = 'What fraction of the square is the shaded small square?'; answer = '1/4';
          area = { cut: 'quarter-and-triangles', shaded: [0] }; visual = undefined; task = undefined; modelRequired = false;
          hint = 'How many small squares this size would fill the whole square? Two triangles fill one of them.';
          why = '4 small squares this size fill the whole square, so 1 small square is 1/4.';
        } else if (i === 10) {
          prompt = 'Color 1/4 of the square using only triangles. How many triangles did you color?'; answer = '2';
          area = { cut: 'quarter-and-triangles' }; areaTask = { n: 1, d: 4, avoid: [0] }; visual = undefined; task = undefined; modelRequired = false;
          hint = 'Each triangle is half of a small square. How many halves make the same space?';
          why = 'One small square is 1/4 of the square, and 2 triangles cover the same space.';
        } else if (i === 11) {
          prompt = 'What fraction of the square is the shaded triangle?'; answer = '1/4';
          area = { cut: 'fourths-mixed', shaded: [2] }; visual = undefined; task = undefined; modelRequired = false;
          hint = 'Look at the left half and the right half. How is each half cut?'; why = MIXED_FOURTHS_WHY;
        }
        break;
      case 'fraction-names':
        prompt = i % 3 === 0 ? `In ${value}, how many parts are shaded?` :
          i % 3 === 1 ? `In ${value}, how many equal parts make one whole?` :
          'What fraction of this bar model is shaded?';
        answer = i % 3 === 0 ? String(n) : i % 3 === 1 ? String(d) : value;
        why = i % 3 === 0 ? `In ${value}, the numerator ${n} counts the shaded parts.` : i % 3 === 1 ? `In ${value}, the denominator ${d} counts all the equal parts in one whole.`
          : `${n} of the ${d} equal parts ${n === 1 ? 'is' : 'are'} shaded, so it is ${value}.`;
        visual = model(n, d); modelRequired = true;
        // "How many equal parts make one whole?" counts every part (copying the shading would answer a different question).
        if (i % 3 === 1) task = { kind: 'count', n: d };
        // The last one uses a circle: fractions name parts of any whole, not only bars.
        if (i === 11 && circleCut(d) && n < d) {
          prompt = 'What fraction of this circle is shaded?'; visual = undefined; modelRequired = false;
          area = { cut: circleCut(d)!, shaded: Array.from({ length: n }, (_, k) => k) };
          hint = 'The denominator is the total number of equal-size slices. The numerator is the number of shaded slices.';
          why = `${n} of the ${d} equal slices ${n === 1 ? 'is' : 'are'} shaded, so it is ${value}.`;
        }
        break;
      case 'unit-size':
      case 'compare-same-numerator': {
        // Pairs use grade 3 denominators (2, 3, 4, 6, 8). A pair that comes back is 5 or 7 rows later, so it is asked
        // the other way (bigger, not smaller).
        const pairs: [number, number][] = id === 'unit-size'
          ? [[2, 4], [3, 6], [4, 8], [2, 3], [3, 4], [2, 4], [6, 8], [2, 6], [4, 6], [2, 8], [3, 8], [3, 4]]
          : [[3, 6], [4, 8], [3, 4], [4, 6], [3, 8], [6, 8], [4, 6], [3, 6], [4, 8], [3, 4], [6, 8], [3, 8]];
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
        hint = id === 'unit-size'
          ? 'Picture both on the same-size bar. Which bar is cut into more parts? Its parts are smaller.'
          : `Both count ${top} parts. Which parts are bigger: ${unitPiece(small)}s or ${unitPiece(big)}s?`;
        const bigger = `${cap(unitName(small))} are bigger than ${unitName(big)}`;
        why = id === 'unit-size'
          ? (i % 2 ? `A whole cut into ${big} parts has smaller parts than one cut into ${small}.` : `A whole cut into ${small} parts has bigger parts than one cut into ${big}.`)
          : form === 'symbol' ? `${bigger}, so ${f(top, first)} ${answer} ${f(top, second)}.` : `${bigger}, so ${answer} is the ${i % 2 ? 'smaller' : 'bigger'} one.`; break;
      }
      case 'sets-unit-fractions':
      case 'sets-nonunit': {
        const count = id === 'sets-unit-fractions' ? 1 : Math.min(2 + i % 2, d - 1); const total = d * (2 + i % 3);
        prompt = i % 3 === 1 ? `${total} beads are shared into ${d} equal groups. How many beads are in ${count === 1 ? 'one group' : `${count} groups`}?` :
          `A box has ${total} buttons. How many buttons are in ${f(count, d)} of the box?`;
        answer = String(total / d * count); hint = `Split ${total} into ${d} equal groups first.`;
        why = `${total} in ${d} equal groups is ${total / d} in each group.${count > 1 ? ` ${count} groups make ${answer}.` : ''}`;
        // The loose set to group: drawing the groups already made would show the answer.
        if (i % 3 === 2) visual = model(0, 1, 'set', total); break;
      }
      case 'benchmark-half': {
        // Fourths, sixths and eighths, 1 to 3 pieces from half. Each kind of question takes 4 different ones per sheet;
        // each redo moves every row on and flips its side of half, so back-to-back sheets differ.
        const [even, step] = HALF_STEPS[(Math.floor(i / 3) + 2 * variant + i % 3) % HALF_STEPS.length]; const h = even / 2;
        const above = (i + variant) % 2 === 1; const top = h + (above ? step : -step);
        // Grade 3 compares with half (3.NF.3d); adding to or taking from half is grade 5, so every row compares.
        const other = h + (above ? -step : step);
        const [first, second] = (i + variant) % 4 < 2 ? [top, other] : [other, top];
        prompt = i % 3 === 0 ? `Which is ${above ? 'more' : 'less'} than 1/2: ${f(first, even)} or ${f(second, even)}?` :
          i % 3 === 1 ? `Put <, = or > in the gap: ${f(top, even)} __ 1/2.` : `Put <, = or > in the gap: 1/2 __ ${f(top, even)}.`;
        answer = i % 3 === 0 ? f(top, even) : i % 3 === 1 ? (above ? '>' : '<') : (above ? '<' : '>');
        form = i % 3 === 0 ? undefined : 'symbol';
        hint = `Half of ${even} parts is ${h} parts. Is ${i % 3 === 0 ? 'each numerator' : `${top}`} more or less than ${h}?`;
        why = i % 3 === 0 ? `${f(top, even)} is ${top} of ${even} parts. ${top} is ${above ? 'more' : 'less'} than ${h}, which is half of ${even}.`
          : `${f(h, even)} is one half. ${f(top, even)} has ${above ? 'more' : 'fewer'} parts, so it is ${above ? 'more' : 'less'} than 1/2.`;
        if (i % 3 !== 0) visual = model(top, even); break;
      }
      case 'fraction-magnitude': {
        // As in benchmark-half. The "closer" rows need h − step above 1 (or they would offer the same fraction twice).
        const steps = i % 3 !== 1 ? HALF_STEPS.filter(([e, s]) => e / 2 - s > 1) : HALF_STEPS;
        const [even, step] = steps[(Math.floor(i / 3) + 2 * variant + i % 3) % steps.length]; const h = even / 2;
        const above = (i + variant) % 2 === 0;
        // Sign rows: just above or below half, and the last one exactly half.
        const top = Math.floor(i / 3) === 3 ? h : above ? h + step : h - step;
        // "Closer" rows: just below half against a tiny amount, or just above half against nearly one whole.
        const near = above ? h + step : h - step; const far = above ? even - 1 : 1;
        // Row 0 estimates against 0 or 1 (adding to half is grade 5): a fraction near half against one near the end it asks about.
        const end = above ? 1 : 0; const edge = above ? even - 1 : 1;
        prompt = i % 3 === 0 ? ((t + i) % 2 ? `Which is closer to ${end}: ${f(edge, even)} or ${f(near, even)}?` : `Which is closer to ${end}: ${f(near, even)} or ${f(edge, even)}?`) :
          i % 3 === 1 ? `Put <, = or > in the gap: ${f(top, even)} __ 1/2.` : (t + i) % 2 ? `Which is closer to 1/2: ${f(far, even)} or ${f(near, even)}?` : `Which is closer to 1/2: ${f(near, even)} or ${f(far, even)}?`;
        answer = i % 3 === 0 ? f(edge, even) : i % 3 === 1 ? (top > h ? '>' : top < h ? '<' : '=') : f(near, even);
        form = i % 3 === 1 ? 'symbol' : undefined;
        hint = i % 3 === 0 ? `${end === 1 ? `One whole is ${even}/${even}` : 'Zero is 0 parts'}. Which fraction is fewer parts away from it?` : `Half of ${even} parts is ${h}/${even}. Compare to that.`;
        why = i % 3 === 0 ? (end === 1 ? `${f(edge, even)} is 1 part from ${f(even, even)}. ${f(near, even)} is ${even - near} parts away.` : `${f(edge, even)} is 1 part from 0. ${f(near, even)} is ${near} parts away.`)
          : i % 3 === 1 ? (top === h ? `${f(top, even)} is ${h} of ${even} parts: exactly one half.` : `${f(h, even)} is one half. ${f(top, even)} has ${top > h ? 'more' : 'fewer'} parts, so it is ${top > h ? 'more' : 'less'} than 1/2.`)
            : `${f(near, even)} is ${some(step, 'part', 'parts')} from ${f(h, even)}. ${f(far, even)} is ${h - 1} parts away.`;
        if (i % 3 === 1) visual = model(top, even); break;
      }
      case 'benchmarks-zero-one': {
        // Odd redo sheets step 2 pieces from one whole.
        const step = variant % 2 === 1 ? 2 : 1;
        // Grade 3 fractions with one clear nearest benchmark (1/4 and 2/8 sit halfway between 0 and 1/2, so they are left out).
        const [top, e, near] = NEAREST_BENCHMARK[(i - Math.floor(i / 3) + 12 + 5 * variant) % NEAREST_BENCHMARK.length];
        prompt = i % 3 === 0 ? `How much is missing from ${f(d - step, d)} to make one whole?` :
          `Is ${f(top, e)} closest to 0, 1/2 or 1?`;
        answer = i % 3 === 0 ? f(step, d) : near;
        hint = i % 3 === 0 ? `One whole is ${f(d, d)}. How many parts are missing?` : `Half of ${e} is ${halfOf(e)}. Is ${top} near 0, near ${halfOf(e)}, or near ${e}?`;
        why = i % 3 === 0 ? `${f(d - step, d)} is ${d - step} of ${d} parts. ${some(step, 'more part makes', 'more parts make')} one whole.`
          : near === '0' ? `${f(top, e)} is only ${some(top, 'part', 'parts')} of ${e}. That is much nearer 0 than half.`
            : near === '1' ? `${f(top, e)} is just ${some(e - top, 'part', 'parts')} short of ${f(e, e)}, so it is closest to 1.`
              : `${top} is closest to ${halfOf(e)}, which is half of ${e}. So ${f(top, e)} is closest to 1/2.`; break;
      }
      case 'number-line-basics':
      case 'number-line-points':
      case 'number-line-beyond-one': {
        const top = id === 'number-line-beyond-one' ? d + n : n;
        const basicsCount = i % 3 === 0 && id === 'number-line-basics';
        prompt = basicsCount ? `How many equal spaces ${variant % 2 ? 'do you need for' : 'from 0 to 1 make'} ${unitName(d)}?` :
          i % 3 === 1 ? `A frog makes ${top} ${top === 1 ? 'jump' : 'jumps'}. Each jump is 1/${d} meter. How far did it go?` : `Each whole has ${d} equal spaces. What fraction is at the dot?`;
        answer = basicsCount ? String(d) : f(top, d);
        if (!basicsCount && i % 3 !== 1) visual = model(top, d, 'line');
        hint = 'The denominator is the number of equal spaces in one whole. The numerator is the number of jumps from zero.';
        why = basicsCount ? `${cap(unitName(d))} cut the line from 0 to 1 into ${d} equal spaces.`
          : i % 3 === 1 ? `${top === 1 ? '1 jump' : `${top} jumps`} of 1/${d} ${top === 1 ? 'is' : 'make'} ${f(top, d)}.`
            : `The dot is ${some(top, 'jump', 'jumps')} from 0, and each whole has ${d} spaces. So it is ${f(top, d)}.`; break;
      }
      case 'compare-same-denominator':
        {
          const bigger = Math.floor(i / 2) % 2 === 0; const [first, second] = (n + i / 2) % 2 ? [f(n, d), f(n + 1, d)] : [f(n + 1, d), f(n, d)];
          prompt = i % 2 ? `Put <, = or > in the gap: ${f(n, d)} __ ${f(n + 1, d)}.` : `Which is ${bigger ? 'bigger' : 'smaller'}, ${first} or ${second}?`;
          if (i % 4 === 3) prompt = `Put <, = or > in the gap: ${f(n + 1, d)} __ ${f(n, d)}.`;
          answer = i % 4 === 3 ? '>' : i % 2 ? '<' : bigger ? f(n + 1, d) : f(n, d);
        } form = i % 2 ? 'symbol' : undefined; hint = 'Same denominator means same size parts. Compare the numerators.';
        why = i % 4 === 3 ? `Both are ${unitName(d)}. ${n + 1} parts are more than ${some(n, 'part', 'parts')}.`
          : i % 2 ? `Both are ${unitName(d)}. ${some(n, 'part is', 'parts are')} fewer than ${n + 1} parts.`
            : `Both are ${unitName(d)}, and ${answer === f(n + 1, d) ? `${n + 1} is more than ${n}` : `${n} is less than ${n + 1}`}.`; break;
      case 'order-fractions': {
        const tops = d >= 5 ? [1, Math.floor(d / 2), d - 1] : [1, 2, 3];
        // Never shown already in the asked order; later rows shift so no question repeats.
        const shown = [[2, 0, 1], [1, 2, 0], [0, 2, 1], [1, 0, 2]][(i + (i >= 8 ? 2 : 0)) % 4].map(k => f(tops[k], d));
        // Each redo flips the order asked for, so back-to-back sheets differ.
        prompt = `Put ${shown.join(', ')} in order, ${(i + variant) % 2 ? 'biggest' : 'smallest'} first.`;
        answer = ((i + variant) % 2 ? [...tops].reverse() : tops).map(top => f(top, d)).join(', '); form = 'ordered'; hint = 'Same size parts. Compare the numerators.';
        why = `All are ${unitName(d)}, so they go in the order of the numerators: ${((i + variant) % 2 ? [...tops].reverse() : tops).join(', ')}.`; break;
      }
      case 'equivalent-models':
      case 'build-equivalents':
      case 'missing-equivalent': {
        // Both denominators fit the grade (grade 3: 1/2 = 2/4 = 3/6 = 4/8, 1/3 = 2/6, 3/4 = 6/8, and past one whole,
        // 3/2 = 6/4, so redo sheets have new rows). Each list is stepped through so rows on a sheet never repeat.
        const pairs = lessonGrade(id) === 3 ? G3_EQUIVALENTS_WIDE : equivalentsFor(id);
        const [top, bottom, factor] = pairs[lessonGrade(id) === 3 ? (i + 5 * variant) % pairs.length : (i * 5 + variant * 7) % pairs.length];
        const small = f(top, bottom); const big = f(top * factor, bottom * factor);
        if (id === 'equivalent-models') {
          prompt = i % 2 ? `This bar shows ${small}. Cut every part into ${factor}. What is the new fraction?` :
            `This bar shows ${small}. Fill the missing numerator: ${small} = ?/${bottom * factor}.`;
          answer = i % 2 ? big : String(top * factor); denominator = i % 2 ? bottom * factor : undefined;
          visual = model(top, bottom);
          // "Cut every part into 4" names the answer when the numerator is 1, so the blank-numerator rows give the new part count instead.
          hint = i % 2 ? `Cut each part into ${factor} equal parts. Now count the shaded parts and all the parts.` : `Cut each part into smaller equal parts until the bar has ${bottom * factor} parts. Now count the shaded parts and all the parts.`;
          why = i % 2 ? `Cutting every part into ${factor} makes ${bottom * factor} parts in each whole, and ${top * factor} ${top * factor === 1 ? 'is' : 'are'} shaded.`
            : `Each part becomes ${factor} smaller parts. ${top === 1 ? '1 shaded part becomes' : `${top} shaded parts become`} ${top * factor}.`;
          // The same amount, cut a different way, in a square.
          if (i === 10) {
            prompt = 'Each triangle is 1/8 of the square. Two are shaded. Fill the missing numerator: 2/8 = ?/4.'; answer = '1'; denominator = undefined;
            visual = undefined; area = { cut: 'quarter-and-triangles', shaded: [1, 2] }; hint = 'Slide the 2 shaded triangles together. How many small squares do they cover?';
            why = 'The 2 triangles fill 1 small square, and 4 small squares fill the square. So 2/8 = 1/4.';
          } else if (i === 11) {
            prompt = 'Color 1/2 of the square. How many eighths did you color?'; answer = '4'; denominator = undefined;
            visual = undefined; area = { cut: 'eighths-triangles' }; areaTask = { n: 1, d: 2 }; hint = '8 equal triangles make the square. Share them into 2 equal groups. How many are in 1 group?';
            why = 'Half of 8 triangles is 4 triangles, so 4/8 = 1/2.';
          }
        } else if (id === 'build-equivalents') {
          prompt = i % 3 === 0 ? `Multiply the numerator and denominator of ${small} by ${factor}. What do you get?` :
            i % 3 === 1 ? `Write ${small} with a denominator of ${bottom * factor}.` : `Divide the numerator and denominator of ${big} by ${factor}. What do you get?`;
          answer = i % 3 === 2 ? small : big; denominator = i % 3 === 2 ? bottom : bottom * factor;
          hint = i % 3 === 2 ? `Divide the numerator and denominator by ${factor}.` : `Multiply the numerator and denominator by ${factor}.`;
          why = i % 3 === 2 ? `${top * factor} ÷ ${factor} = ${top} and ${bottom * factor} ÷ ${factor} = ${bottom}. The amount stays the same.`
            : `${top} × ${factor} = ${top * factor} and ${bottom} × ${factor} = ${bottom * factor}. The amount stays the same.`;
        } else {
          prompt = i % 3 === 0 ? `Fill the missing numerator: ${small} = ?/${bottom * factor}.` :
            i % 3 === 1 ? `Fill the missing denominator: ${small} = ${top * factor}/?.` : `Fill the missing numerator: ?/${bottom} = ${big}.`;
          answer = String(i % 3 === 0 ? top * factor : i % 3 === 1 ? bottom * factor : top);
          // The hint asks for the factor instead of naming it: finding it is the task.
          // A blank denominator is found from the numerators (naming the two denominators would name the answer).
          hint = i % 3 === 2 ? `What number divides ${bottom * factor} to make ${bottom}? Divide the numerator by it too.`
            : i % 3 === 1 ? `What times ${top} makes ${top * factor}? Do the same to the denominator.` : `What times ${bottom} makes ${bottom * factor}? Do the same to the numerator.`;
          why = i % 3 === 2 ? `${bottom * factor} ÷ ${factor} = ${bottom}, so the numerator is ${top * factor} ÷ ${factor} = ${top}.`
            : i % 3 === 1 ? `${top} × ${factor} = ${top * factor}, so the denominator is ${bottom} × ${factor} = ${bottom * factor}.`
              : `${bottom} × ${factor} = ${bottom * factor}, so the numerator is ${top} × ${factor} = ${top * factor}.`;
        }
        break;
      }
      case 'compose-to-one': {
        const thing = ['fence', 'wall', 'board', 'box'][i % 4];
        prompt = i % 2 ? `${value} of a ${thing} is painted. What fraction is not painted yet?` : `Complete ${value} + ? = 1.`;
        answer = f(d - n, d); hint = `One whole is ${d}/${d}. Count the parts left.`;
        why = i % 2 ? `The whole ${thing} is ${f(d, d)}. ${some(n, 'part is', 'parts are')} painted, and ${some(d - n, 'more part makes', 'more parts make')} the whole.` : `${value} + ${f(d - n, d)} = ${f(d, d)}, which is one whole.`; break;
      }
      case 'decompose-fractions': {
        const top = Math.max(2, n); const whole = f(top, d); const first = top > 2 && i % 2 ? 2 : 1;
        // Every third row: is a three-part sum another way to make it (4.NF.3b)? Every other one is, every other one isn't.
        if (i % 3 === 2 && top >= 3) {
          const same = i % 6 === 2; const last = top - 2 + (same ? 0 : 1);
          prompt = `Is ${f(1, d)} + ${f(1, d)} + ${f(last, d)} another way to make ${whole}? Answer yes or no.`;
          answer = same ? 'yes' : 'no'; form = 'word';
          hint = `Add the numerators: 1 + 1 + ${last}. Is that ${top}?`;
          why = same ? `1 + 1 + ${last} = ${top}, so the three parts make ${whole}.` : `1 + 1 + ${last} = ${2 + last}, not ${top}. The parts make ${f(2 + last, d)}.`; break;
        }
        prompt = i % 3 === 0 ? `How many 1/${d} parts make ${whole}?` :
          i % 3 === 1 ? `Complete ${f(first, d)} + ? = ${whole}.` : `${top} jumps of 1/${d} make what fraction?`;
        answer = i % 3 === 0 ? String(top) : i % 3 === 1 ? f(top - first, d) : whole;
        hint = i % 3 === 1 ? `${top} parts in all. ${first} ${first === 1 ? 'is' : 'are'} used. How many more?` : 'Count how many small parts make it.';
        why = i % 3 === 0 ? `${whole} is ${top} parts, and each part is 1/${d}.` : i % 3 === 1 ? `${first} + ${top - first} = ${top}, so ${f(first, d)} + ${f(top - first, d)} = ${whole}.`
          : `Each jump is 1/${d}, so ${top} jumps make ${top} parts of 1/${d}: ${whole}.`; break;
      }
      case 'improper-fractions':
        // 3.NF.3c: row 10 writes a whole number as a fraction (3 = 3/1), row 12 a fraction that is a whole number (8/4 = 2),
        // and row 7 sets n/n beside 1 (4/4 = 1). Lesson 23 taught all three.
        if (i === 9) {
          const w = 2 + (i + variant) % 3; // 2 to 4 whole bars: more would crowd a phone row
          prompt = `Write ${w} as a fraction with a denominator of 1.`; answer = f(w, 1); visual = model(w, 1); modelRequired = true;
          hint = 'The denominator 1 means each part is one whole.';
          why = `With a denominator of 1, each whole bar is 1 part. ${w} bars are ${w} parts: ${w}/1.`;
        } else if (i === 11) {
          const w = 2 + (i + variant) % 2;
          // One spare whole to copy onto, so counting the bars (each marked one whole) does not give the answer.
          prompt = `How many wholes are ${f(w * d, d)}?`; answer = String(w); visual = { ...model(w * d, d), wholes: w + 1 }; modelRequired = true;
          hint = `${d}/${d} makes one whole. Count groups of ${d}/${d}.`;
          why = `${f(w * d, d)} is ${w} groups of ${f(d, d)}, and each group is 1 whole.`;
        } else if (i % 3 === 0) {
          const top = [d + 1, d - 1, d, d + 2][i / 3];
          prompt = `Put <, = or > in the gap: ${f(top, d)} __ 1.`; answer = top > d ? '>' : top < d ? '<' : '='; form = 'symbol';
          hint = `${d}/${d} is exactly one whole.`;
          why = `${f(top, d)} is ${top} parts, and one whole is ${d} parts. So ${f(top, d)} ${answer} 1.`;
        } else {
          // Grade 3 counts the parts past one whole; writing them as a mixed number is the next lesson (4.NF.3).
          prompt = i % 3 === 1 ? `How many ${unitName(d)} past one whole is ${f(d + n, d)}?` : 'What fraction is shaded? Each bar is one whole.';
          answer = i % 3 === 1 ? String(n) : f(d + n, d);
          hint = i % 3 === 1 ? `${f(d, d)} is one whole. Count the ${unitName(d)} after it.` : `${d} parts make one whole. Count what is left over.`;
          why = i % 3 === 1 ? `${f(d + n, d)} is ${d} ${unitName(d)} for one whole, and ${n} more.` : `The first bar is ${f(d, d)}. ${some(n, 'more part is', 'more parts are')} shaded, so it is ${f(d + n, d)}.`;
          if (i % 3 === 2 || i < 6) visual = model(d + n, d);
        }
        break;
      case 'mixed-improper': {
        const w = i % 3 === 2 ? 2 : 1; const top = w * d + n;
        prompt = i % 2 ? `Write ${f(top, d)} as wholes and a fraction.` : `Write ${w} ${value} as a single fraction.`;
        answer = i % 2 ? `${w} ${value}` : f(top, d); form = i % 2 ? 'mixed' : undefined;
        hint = i % 2
          ? `${d} parts make one whole. Count the wholes, then what is left over. Write it like 1 2/3.`
          : `One whole is ${f(d, d)}.${w === 2 ? ` 2 wholes is ${f(2 * d, d)}.` : ''} Then add ${f(n, d)} more.`; if (i < 4) visual = model(top, d);
        why = i % 2 ? `${f(top, d)} is ${f(w * d, d)} and ${value} more. ${f(w * d, d)} is ${some(w, 'whole', 'wholes')}, so it is ${w} ${value}.`
          : `${some(w, 'whole is', 'wholes are')} ${f(w * d, d)}. ${f(w * d, d)} + ${value} = ${f(top, d)}.`; break;
      }
      case 'add-like-denominators':
      case 'subtract-like-denominators': {
        const add = id.startsWith('add'); const b = n > 2 && i % 2 ? 2 : 1; const a = add ? Math.max(1, Math.min(n, d - b)) : Math.min(n + b, d);
        const result = add ? a + b : a - b;
        prompt = i % 3 === 2 ? (add ? `A ${context} is ${f(a, d)} meter long. Add ${f(b, d)} meter more. How long is it now?` :
          `A ${context} is ${f(a, d)} meter long. Cut off ${f(b, d)} meter. How much is left?`) :
          `${f(a, d)} ${add ? '+' : '−'} ${f(b, d)} = ?`;
        answer = f(result, d); hint = add ? 'Same size parts. Add the numerators. The denominator stays.' : 'Same size parts. Take away the numerators. The denominator stays.';
        why = `${a} ${add ? '+' : '−'} ${b} = ${result}. Each part is still 1/${d}, so it is ${f(result, d)}.`;
        if (i % 3 === 1) visual = model(a, d); break;
      }
      case 'add-related-fractions': {
        const [small, large] = ([[2, 4], [3, 6], [4, 8], [2, 6], [2, 8], [3, 12], [2, 10], [4, 12], [5, 10], [2, 12], [6, 12], [3, 9]] as const)[t];
        prompt = i % 2 ? `Sam walks 1/${small} mile, then 1/${large} mile more. How far in all?` : `A recipe uses 1/${small} cup and another 1/${large} cup. How much in all?`;
        answer = f(large / small + 1, large); hint = `Change 1/${small} into ${unitName(large)} first.`;
        why = `1/${small} = ${f(large / small, large)}. Then ${f(large / small, large)} + 1/${large} = ${answer}.`; break;
      }
      case 'add-tenths-hundredths': {
        const a = [3, 6, 2, 5, 4, 7, 1, 8, 4, 2, 3, 5][t]; const b = [4, 12, 15, 7, 8, 25, 6, 11, 35, 9, 30, 45][t];
        prompt = i % 3 === 0 ? `${f(a, 10)} + ${f(b, 100)} = ?` : i % 3 === 1 ? `Change ${f(a, 10)} into hundredths.` : `Write ${f(a, 10)} + ${f(b, 100)} as a decimal.`;
        answer = i % 3 === 0 ? f(10 * a + b, 100) : i % 3 === 1 ? f(10 * a, 100) : ((10 * a + b) / 100).toFixed(2);
        denominator = i % 3 === 1 ? 100 : undefined; form = i % 3 === 2 ? 'decimal' : undefined;
        hint = i % 3 === 1 ? `Each tenth is 10 hundredths. How many hundredths are in ${tenthWord(a)}?` : `Each tenth is 10 hundredths, so ${f(a, 10)} = ${f(10 * a, 100)}.`;
        why = i % 3 === 0 ? `${f(a, 10)} = ${f(10 * a, 100)}. Then ${f(10 * a, 100)} + ${f(b, 100)} = ${answer}.` : i % 3 === 1 ? `${a} × 10 = ${10 * a}, so ${f(a, 10)} = ${answer}.`
          : `${f(a, 10)} + ${f(b, 100)} = ${f(10 * a + b, 100)}, and ${10 * a + b} hundredths is ${answer}.`; break;
      }
      case 'tenths-decimals':
      case 'hundredths-decimals': {
        const base = id.startsWith('tenths') ? 10 : 100; const top = id.startsWith('tenths') ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 6, 8][t] : [8, 12, 25, 40, 63, 75, 9, 30, 50, 81, 90, 99][t];
        const dec = (top / base).toFixed(base === 10 ? 1 : 2);
        if (base === 100 && i === 11) {
          // 4.NF.6: a hundredths decimal on a number line, between one tenth and the next (0.62 is between 0.6 and 0.7).
          const at = [62, 37, 85, 14, 56, 93, 28, 71, 49, 66, 15, 84][t]; const from = Math.floor(at / 10);
          const start = String(from / 10); answer = (at / 100).toFixed(2); form = 'decimal';
          prompt = 'What decimal is at the dot?';
          hint = `Each small space is one hundredth. Count the spaces from ${start} to the dot.`;
          why = `${start} is ${from * 10} hundredths. ${at % 10} more ${at % 10 === 1 ? 'is' : 'makes'} ${at} hundredths: ${answer}.`;
          picture = { kind: 'line', numerator: at % 10, denominator: 10, wholes: 1, hideLabels: true, hideHops: true, ends: [start, String((from + 1) / 10)] };
          break;
        }
        prompt = i % 3 === 0 ? `Write ${f(top, base)} as a decimal.` : i % 3 === 1 ? `Write ${dec} as a fraction.` :
          `A meter strip has ${base} equal parts. ${top} ${top === 1 ? 'is' : 'are'} colored. Write the colored part as a decimal.`;
        answer = i % 3 === 1 ? f(top, base) : dec; form = i % 3 === 1 ? undefined : 'decimal';
        hint = base === 10 ? 'One decimal place means tenths.' : 'Two decimal places means hundredths. The tenths digit comes first after the point, then the hundredths digit.';
        why = i % 3 === 1 ? `${dec} has ${base === 10 ? '1 place' : '2 places'} after the point, so it is ${top} ${base === 10 ? (top === 1 ? 'tenth' : 'tenths') : (top === 1 ? 'hundredth' : 'hundredths')}: ${answer}.`
          : base === 10 ? `${top} ${top === 1 ? 'tenth' : 'tenths'} is ${dec}: the ${top} goes in the first place after the point.`
            : `${dec} has ${Math.floor(top / 10)} in the tenths place and ${top % 10} in the hundredths place. That is ${top} hundredths.`;
        if (i % 3 === 2) visual = model(top, base); break;
      }
      default: throw new Error(`No authored worksheet for ${id}`);
    }
    // Older bar worksheets: "copy the shaded bar".
    if (modelRequired && !task && visual?.kind === 'bar') task = { kind: 'copy', n: visual.n };
    return { id: `w${i + 1}`, prompt, answer, hint, model: visual, modelRequired, task, form, denominator, ...(area ? { area } : {}), ...(areaTask ? { areaTask } : {}), ...(why ? { why } : {}), ...(picture ? { picture } : {}) };
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
const EXACT: [number, number][] = [[1, 2], [1, 4], [3, 4], [1, 5], [2, 5], [3, 10], [7, 10], [3, 5], [4, 5], [1, 10], [9, 10], [1, 20],
  // Extra rows for redo sheets, still twentieths at most: new amounts, then fractions not yet in simplest form.
  [3, 20], [7, 20], [9, 20], [11, 20], [13, 20], [17, 20], [19, 20], [2, 10], [4, 10], [6, 10], [8, 10], [2, 4]];
/** Percent to fraction: the first sheet's percents (from EXACT), then new ones; its answers are hundredths anyway. */
const PERCENTS = [...EXACT.slice(0, 12).map(([t, b]) => (t * 100) / b), 15, 35, 45, 55, 65, 85, 95, 12, 24, 36, 48, 64];
/** [n, d, k]: n/d = nk/dk with grade 3 parts only, including amounts past one whole. */
export const G3_EQUIVALENTS_WIDE: readonly [number, number, number][] = [[1, 2, 2], [1, 3, 2], [1, 2, 4], [1, 2, 3], [2, 3, 2], [1, 4, 2], [3, 2, 2], [2, 4, 2], [4, 3, 2], [5, 4, 2], [3, 4, 2], [3, 2, 3],
  [3, 2, 4], [5, 3, 2], [7, 4, 2], [2, 2, 2], [3, 3, 2], [4, 4, 2], [5, 2, 2], [2, 2, 3], [2, 2, 4], [6, 4, 2], [4, 2, 2], [9, 4, 2]];
/** Grade 4 fractions to simplify: [answer numerator, answer denominator, factor]. */
const SIMPLIFY_POOL: [number, number, number][] = [...EQUIVALENTS[4], [3, 2, 2], [4, 3, 2], [5, 4, 2], [3, 2, 3], [5, 2, 2], [5, 3, 2], [3, 2, 4], [7, 4, 2]];
/** [part of a pan, children sharing it], 24 small parts at most (grade 5 bars stay readable). */
const PAN_SHARES: [number, number][] = [[2, 2], [3, 3], [4, 4], [5, 3], [6, 2], [8, 3], [3, 4], [4, 5], [5, 2], [6, 3], [8, 2], [2, 5],
  [3, 2], [4, 2], [2, 3], [2, 4], [3, 5], [4, 3], [5, 4], [6, 4], [2, 6], [3, 6], [4, 6], [10, 2], [12, 2]];
const SIMPLE: [number, number][] = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [2, 5], [1, 6], [5, 6], [3, 8], [3, 10], [5, 12], [7, 10]];

/** "Sixths" from "sixths". */
const cap = (text: string) => `${text[0].toUpperCase()}${text.slice(1)}`;
/** "1 part" or "3 parts". */
const some = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
/** "1 sixth" or "4 sixths". */
const pieces = (k: number, d: number) => `${k} ${k === 1 ? unitPiece(d) : unitName(d)}`;
/** "1/2 = 3/6 and 1/3 = 2/6." for the fractions whose denominator is not `common` (empty when none needs renaming). */
const renamesTo = (common: number, ...amounts: [number, number][]) => {
  const renames = amounts.filter(([, bottom]) => bottom !== common).map(([top, bottom]) => `${f(top, bottom)} = ${f(top * (common / bottom), common)}`);
  return renames.length ? `${renames.join(' and ')}. ` : '';
};

/** Worksheets for the later (extension) lessons: exact math, grade-friendly numbers, a hint for each skill. Rows a lesson
    asks as tap questions also say why after a right answer (`why`), worked from the row's own numbers. */
function getExtensionWorksheet(spec: { mode: ExtensionWorksheetMode; context: string; n: number; d: number }, variant = 0, id = ''): WorksheetProblem[] {
  const shift = variant % 12;
  // Equivalent pairs whose denominators both fit the grade, stepping through all of them (each redo moves on).
  const pairs = equivalentsFor(id);
  return Array.from({ length: 12 }, (_, i) => {
    const tr = (i + shift) % 12; // row in the number tables (the question type still follows i)
    const [n, d] = SIMPLE[tr];
    // Tables with a second set of 12 rows: the first sheet uses rows 1-12, and redo sheets reach the new numbers.
    const pick = <T,>(table: readonly T[]): T => table[(i + variant) % table.length];
    let prompt = ''; let answer = f(n, d); let hint = '';
    let form: WorksheetProblem['form']; let visual: LearningModel | undefined; let denominator: number | undefined;
    let area: AreaFigure | undefined; let areaTask: AreaTask | undefined;
    let rulerTask: WorksheetProblem['rulerTask']; let linePlotTask: WorksheetProblem['linePlotTask'];
    let scaleTask: WorksheetProblem['scaleTask']; let modelRequired = false; let task: BarTask | undefined;
    let why: string | undefined; let explain: string | undefined; let picture: ModelSpec | undefined;
    switch (spec.mode) {
      case 'simplify': {
        // One kind of question, so it needs more than 21 different fractions: amounts past one whole too (6/4 = 3/2).
        // Each redo takes the other half of the list.
        const [top, bottom, times] = SIMPLIFY_POOL[(i + 13 * variant) % SIMPLIFY_POOL.length];
        prompt = `Write ${f(top * times, bottom * times)} in simplest form.`; answer = f(top, bottom); denominator = bottom; visual = model(top * times, bottom * times);
        hint = 'Divide the numerator and denominator by the same number. Keep going until no number but 1 divides both.';
        why = `${top * times} ÷ ${times} = ${top}. ${bottom * times} ÷ ${times} = ${bottom}. Now only 1 divides both.`; break;
      }
      case 'equivalent': {
        const [top, bottom, times] = pairs[(i * 5 + variant * 7) % pairs.length];
        // A blank on top or on the bottom, by multiplying or dividing. Rows 1, 4, 7 and 10 keep their kinds (story checkpoints).
        const kind = (['top', 'write', 'bottom', 'divide', 'top', 'bottom', 'divide', 'write', 'bottom', 'divide', 'top', 'divide'] as const)[i % 12];
        // The hints ask for the factor instead of naming it: finding it is the task.
        if (kind === 'write') {
          prompt = `Write ${f(top, bottom)} with a denominator of ${bottom * times}.`; answer = f(top * times, bottom * times); denominator = bottom * times;
          hint = `What was ${bottom} multiplied by to make ${bottom * times}? Multiply the numerator by the same number.`;
        } else if (kind === 'top') {
          prompt = `Fill the missing numerator: ${f(top, bottom)} = ?/${bottom * times}.`; answer = String(top * times);
          hint = `What was ${bottom} multiplied by to make ${bottom * times}? Multiply the numerator by the same number.`;
        } else if (kind === 'bottom') {
          prompt = `Fill the missing denominator: ${f(top, bottom)} = ${top * times}/?.`; answer = String(bottom * times);
          hint = `What was ${top} multiplied by to make ${top * times}? Multiply the denominator by the same number.`;
        } else {
          prompt = `Fill the missing numerator: ${f(top * times, bottom * times)} = ?/${bottom}.`; answer = String(top);
          hint = `What was ${bottom * times} divided by to make ${bottom}? Divide the numerator by the same number.`;
        }
        why = `${kind === 'bottom' ? `${top} × ${times} = ${top * times}, so ${bottom} × ${times} = ${bottom * times}`
          : kind === 'divide' ? `${bottom * times} ÷ ${times} = ${bottom}, so ${top * times} ÷ ${times} = ${top}`
            : `${bottom} × ${times} = ${bottom * times}, so ${top} × ${times} = ${top * times}`}. The amount stays the same.`;
        break;
      }
      case 'compare': {
        const [a, b, c, e] = pick([[1, 2, 2, 5], [4, 5, 3, 4], [3, 4, 2, 3], [1, 3, 2, 6], [3, 5, 3, 4], [5, 6, 5, 8], [2, 5, 1, 3], [1, 2, 3, 8], [4, 6, 2, 3], [7, 10, 3, 5], [2, 5, 2, 3], [5, 8, 3, 4],
          [2, 3, 3, 4], [5, 8, 1, 2], [3, 10, 1, 4], [2, 6, 1, 3], [4, 10, 1, 2], [4, 5, 7, 10], [1, 4, 2, 8], [3, 8, 2, 5], [5, 6, 3, 4], [2, 3, 7, 12], [7, 12, 2, 3], [2, 8, 2, 6]] as const);
        prompt = `Put <, = or > in the gap: ${f(a, b)} __ ${f(c, e)}.`;
        answer = a * e > c * b ? '>' : a * e < c * b ? '<' : '='; form = 'symbol';
        hint = a === c
          ? `Both fractions count ${a} parts. The larger denominator splits the whole into more equal parts, so each part is smaller, and so is that fraction.`
          : 'Rename both fractions with the same denominator so the parts match. Then compare the numerators.';
        if (a === c) why = `${unitName(b)[0].toUpperCase()}${unitName(b).slice(1)} are ${b > e ? 'smaller' : 'bigger'} than ${unitName(e)}.`;
        else if (lcm(b, e) <= 12) {
          // (Twentieths, fifteenths and fortieths are not named yet in this lesson: those rows keep just the hint.)
          const m = lcm(b, e); const x = a * (m / b); const y = c * (m / e);
          why = `${renamesTo(m, [a, b], [c, e])}${pieces(x, m)} ${x === 1 ? 'is' : 'are'} ${x > y ? 'more than' : x < y ? 'less than' : 'the same as'} ${pieces(y, m)}.`;
        } else {
          // Twentieths, fifteenths and fortieths are not named yet in this lesson: these four compare by the gap to a benchmark.
          why = ({
            '4/5 3/4': '4/5 is 1/5 away from 1 whole, and 3/4 is 1/4 away. 1/5 is the smaller gap, so 4/5 is bigger.',
            '2/5 1/3': '2/5 is 1/10 less than 1/2, and 1/3 is 1/6 less. 1/10 is the smaller gap, so 2/5 is bigger.',
            '3/10 1/4': '3/10 = 30/100 and 1/4 = 25/100. 30 hundredths are more than 25 hundredths.',
            '3/8 2/5': '3/8 is 1/8 less than 1/2, and 2/5 is 1/10 less. 1/10 is the smaller gap, so 2/5 is bigger.',
          } as Record<string, string>)[`${f(a, b)} ${f(c, e)}`];
        }
        break;
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
        hint = 'Compare each one to 1/2 first. If needed, rename them with the same denominator so their parts match, then compare.';
        const m = sorted.reduce((l, [, b]) => lcm(l, b), 1); const named = sorted.map(([t, b]) => f(t * (m / b), m));
        why = `In ${unitName(m)} they are ${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}.`; break;
      }
      case 'subtract-unlike': {
        const [a, b, c, e] = pick([[3, 4, 1, 2], [5, 6, 1, 2], [7, 8, 1, 2], [5, 8, 1, 4], [5, 6, 1, 3], [9, 10, 1, 2], [7, 12, 1, 3], [3, 4, 1, 8], [2, 3, 1, 6], [7, 10, 1, 5], [11, 12, 1, 4], [5, 6, 2, 3],
          [2, 3, 1, 4], [4, 5, 1, 2], [5, 8, 1, 2], [3, 4, 1, 6], [5, 6, 1, 4], [7, 8, 1, 4], [9, 10, 2, 5], [2, 3, 1, 2], [3, 5, 1, 10], [5, 12, 1, 6], [7, 10, 1, 2], [11, 12, 2, 3]] as const);
        const m = lcm(b, e);
        prompt = `${f(a, b)} − ${f(c, e)} = ?`; answer = f(a * (m / b) - c * (m / e), m);
        hint = `Change both to ${unitName(m)} first. Then take away the numerators.`;
        why = `${renamesTo(m, [a, b], [c, e])}${f(a * (m / b), m)} − ${f(c * (m / e), m)} = ${f(a * (m / b) - c * (m / e), m)}.`; break;
      }
      case 'mixed-add': {
        const bottom = [4, 6, 8, 3, 5, 10, 6, 8, 4, 5, 3, 10][tr]; const whole = 1 + i % 2;
        const a = 1 + i % (bottom - 1); const b = 1 + (i + 2) % (bottom - 1);
        // Every third row adds two mixed numbers (wholes and parts), not just a fraction to a mixed number.
        const more = i % 3 === 2 ? 1 : 0;
        prompt = `${whole} ${f(a, bottom)} + ${more ? `${more} ` : ''}${f(b, bottom)} = ?`;
        answer = mixedName((whole + more) * bottom + a + b, bottom); form = (a + b) % bottom ? 'mixed' : undefined;
        hint = `${more ? `Add the wholes: ${whole} + ${more}. ` : ''}Add the parts: ${a} + ${b}. If you get ${bottom} or more, make a new whole.`;
        why = a + b >= bottom
          ? `${f(a, bottom)} + ${f(b, bottom)} = ${f(a + b, bottom)}. ${f(bottom, bottom)} is 1 more whole, so there are ${whole + more + 1} wholes.`
          : `${f(a, bottom)} + ${f(b, bottom)} = ${f(a + b, bottom)}. That is less than 1 whole, so no new whole.`; break;
      }
      case 'mixed-subtract': {
        const bottom = [4, 6, 8, 3, 5, 10, 6, 8, 4, 5, 3, 10][tr]; const whole = 2 + i % 2;
        const a = 1 + i % (bottom - 1); const b = 1 + (i + 1) % (bottom - 1);
        const top = whole * bottom + a - (bottom + b);
        prompt = `${whole} ${f(a, bottom)} − 1 ${f(b, bottom)} = ?`;
        answer = mixedName(top, bottom); form = top > bottom && top % bottom ? 'mixed' : undefined;
        hint = a < b ? `${a} ${a === 1 ? 'piece is' : 'pieces are'} not enough to take away ${b}. Trade one whole for ${bottom}/${bottom} first.` : 'Take away the wholes. Then take away the parts.';
        why = a < b
          ? `After the trade the parts are ${f(a + bottom, bottom)}. ${f(a + bottom, bottom)} − ${f(b, bottom)} = ${f(a + bottom - b, bottom)}. ${whole - 2 ? `${some(whole - 2, 'whole is', 'wholes are')} left.` : 'No wholes are left.'}`
          : `${whole} − 1 = ${whole - 1}. ${a === b ? 'The parts take away to nothing.' : `${f(a, bottom)} − ${f(b, bottom)} = ${f(a - b, bottom)}.`}`; break;
      }
      case 'quantity':
      case 'sets': {
        const bottom = [2, 3, 4, 5, 6, 8, 3, 4, 5, 6, 10, 4][tr]; const sets = spec.mode === 'sets';
        const total = bottom * (sets ? 3 + (i + 1) % 4 : 2 + i % 4); const groups = 1 + (sets ? (i + 1) : i) % (bottom - 1 || 1);
        // Written as multiplication too (5.NF.4a): a/b × q is a parts of q split into b equal groups.
        const times = `${f(groups, bottom)} × ${total}`; const each = total / bottom;
        const things = ['cards', 'stickers', 'marbles', 'shells', 'buttons', 'beads'][i % 6];
        if (sets) prompt = `${f(groups, bottom)} of ${total} ${things} are blue. Solve ${times} to find how many are blue.`;
        else prompt = i % 2 === 0 ? `${times} = ?` : `What is ${f(groups, bottom)} of ${total} pencils?`;
        // The groups, none picked: picking them is the answer.
        answer = String(each * groups); visual = model(0, bottom, 'set', total);
        hint = i % 2 === 0 || sets
          ? `Two ways: split ${total} into ${bottom} equal groups, then take ${groups} ${groups === 1 ? 'group' : 'groups'}. Or ${groups} × ${total} first, then ÷ ${bottom}.`
          : `Make ${bottom} equal groups. Count ${groups} of them.`;
        why = `${total} in ${bottom} equal groups is ${each} in each group. ${some(groups, 'group is', 'groups are')} ${each * groups}.`; break;
      }
      case 'share': {
        const [loaves, people] = pick([[1, 2], [2, 3], [3, 4], [1, 3], [3, 5], [2, 4], [2, 5], [3, 8], [3, 2], [1, 6], [1, 4], [3, 6],
          [1, 5], [4, 5], [2, 6], [5, 6], [4, 3], [5, 8], [1, 8], [3, 10], [5, 4], [2, 8], [4, 6], [5, 2]] as const);
        prompt = `${loaves} ${loaves === 1 ? 'loaf is' : 'loaves are'} shared fairly by ${people} friends. How much does each friend get?`;
        // Picture: each loaf cut into one piece per friend, nothing shaded (it must not suggest 1/people).
        answer = f(loaves, people); visual = { kind: 'bar', n: 0, d: people, wholes: loaves };
        hint = `Cut each loaf into ${people} equal parts. Each friend gets 1 part of every loaf.`;
        why = `Each friend gets 1/${people} of every loaf. ${loaves === 1 ? '1 loaf gives' : `${loaves} loaves give`} ${some(loaves, 'part', 'parts')} of 1/${people}.`; break;
      }
      case 'multiply-whole': {
        const times = 2 + i % 4;
        prompt = `${times} × ${f(n, d)} = ?`; answer = f(times * n, d);
        hint = `${times} groups of ${f(n, d)}. Multiply the numerator by ${times}. The denominator stays.`;
        why = `${times} groups of ${some(n, 'part', 'parts')} make ${times * n} parts. The parts stay ${unitName(d)}.`; break;
      }
      case 'multiply': {
        const part = d * 3 > 24 ? 2 : 2 + i % 2; // 24 parts at most, so the bar stays readable
        prompt = `What is 1/${part} of ${f(n, d)}?`; answer = f(n, d * part); visual = model(n, d);
        hint = `Cut every part into ${part}. Multiply the numerators and multiply the denominators.`;
        why = `Cut each ${unitPiece(d)} into ${part}. Each small part is 1/${d * part}. ${n === 1 ? 'Take 1 small part.' : `Take 1 small part from each of the ${n} ${unitName(d)}.`}`; break;
      }
      case 'divide': {
        const cups = 1 + i % 4; const bottom = [2, 3, 4, 5, 6, 8, 3, 4, 5, 6, 8, 10][tr];
        // The story, then its division; the check after a right answer multiplies back.
        prompt = `How many 1/${bottom}-cup scoops fill ${cups} ${cups === 1 ? 'cup' : 'cups'}? ${cups} ÷ 1/${bottom} = ?`; answer = String(cups * bottom);
        why = `Check: ${cups * bottom} × 1/${bottom} = ${cups}.`;
        hint = `How many ${bottom === 2 ? 'halves' : `1/${bottom} parts`} make one whole cup?${cups > 1 ? ` Then think about ${cups} cups.` : ''}`; break;
      }
      case 'measure': {
        const length = d * (2 + i % 3);
        prompt = `A ribbon is ${length} meters long. How long is ${f(n, d)} of it?`; answer = String(length / d * n);
        visual = model(0, d, 'set', length); hint = `Cut ${length} meters into ${d} equal parts. Count ${n} ${n === 1 ? 'part' : 'parts'}.`;
        why = `${length} ÷ ${d} = ${length / d}, so each part is ${length / d} meters. ${some(n, 'part is', 'parts are')} ${(length / d) * n} meters.`; break;
      }
      case 'measure-add': {
        const [a, b, c, e] = pick([[1, 2, 1, 4], [1, 3, 1, 6], [1, 4, 1, 8], [1, 2, 1, 8], [2, 3, 1, 6], [1, 5, 1, 10], [1, 2, 1, 6], [3, 4, 1, 8], [1, 3, 1, 12], [2, 5, 1, 10], [1, 2, 3, 8], [1, 4, 1, 12],
          [1, 2, 1, 10], [3, 4, 1, 12], [1, 6, 1, 12], [3, 5, 1, 10], [1, 4, 3, 8], [2, 3, 1, 12], [1, 2, 1, 12], [1, 6, 5, 12], [1, 3, 5, 12], [2, 5, 3, 10], [1, 5, 3, 10], [1, 4, 5, 8]] as const);
        const m = lcm(b, e);
        prompt = `A board is ${f(a, b)} meter. Another is ${f(c, e)} meter. How long are they together?`; answer = f(a * (m / b) + c * (m / e), m);
        hint = `Change ${f(a, b)} into ${unitName(m)} first.`;
        why = `${renamesTo(m, [a, b], [c, e])}${f(a * (m / b), m)} + ${f(c * (m / e), m)} = ${f(a * (m / b) + c * (m / e), m)}.`; break;
      }
      case 'quotient': {
        // Division written as a fraction (5 ÷ 4 = 5/4), and where that fraction sits between whole numbers.
        // Sharing stories are the fair-shares lesson's job.
        if (i % 3 === 2) {
          const [top, bottom] = pick([[7, 3], [9, 4], [5, 2], [11, 3], [13, 4], [8, 3], [7, 2], [11, 4], [10, 3], [9, 2], [17, 4], [14, 3]] as const);
          prompt = `${top}/${bottom} is between two whole numbers. What is the bigger one?`; answer = String(Math.ceil(top / bottom));
          visual = { kind: 'line', n: 0, d: bottom, wholes: Math.ceil(top / bottom) };
          hint = `${bottom}/${bottom} is one whole. How many whole groups of ${bottom} fit in ${top}?`;
          why = `${top} is ${Math.floor(top / bottom)} groups of ${bottom}, with ${top % bottom} left over. So ${top}/${bottom} is between ${Math.floor(top / bottom)} and ${Math.ceil(top / bottom)}.`; break;
        }
        const [top, bottom] = pick([[1, 2], [2, 3], [3, 4], [5, 4], [4, 3], [7, 2], [2, 5], [3, 2], [5, 3], [3, 8], [1, 4], [5, 6],
          [1, 3], [3, 5], [4, 5], [5, 2], [7, 4], [1, 6], [7, 3], [2, 8], [5, 8], [1, 5], [9, 4], [4, 6]] as const);
        prompt = i % 3 === 0 ? `Write ${top} ÷ ${bottom} as a fraction.` : `${top} ÷ ${bottom} = ?`;
        answer = f(top, bottom); denominator = bottom;
        // The wholes to share, cut into equal parts and not shaded (more than 4 wholes: a number line to the next whole).
        if (top <= 4) visual = { kind: 'bar', n: 0, d: bottom, wholes: top };
        else picture = { kind: 'line', numerator: 0, denominator: bottom, wholes: Math.ceil(top / bottom), hideLabels: true };
        hint = 'The fraction bar means divide. The number you divide goes on top.';
        why = `Sharing ${some(top, 'whole', 'wholes')} into ${bottom} equal shares gives ${f(top, bottom)} in each share.`; break;
      }
      case 'probability': {
        const [green, total] = pick([[1, 4], [2, 6], [3, 8], [3, 10], [2, 5], [5, 12], [1, 6], [5, 8], [7, 10], [3, 4], [7, 12], [4, 5],
          [1, 3], [2, 3], [1, 5], [3, 5], [1, 8], [7, 8], [1, 10], [9, 10], [1, 12], [3, 6], [2, 8], [5, 6]] as const);
        prompt = `A bag has ${total} marbles. ${green} ${green === 1 ? 'is' : 'are'} green. What is the chance of picking green?`;
        answer = f(green, total); visual = model(green, total, 'set', total);
        hint = 'The numerator is the number of green marbles. The denominator is the total number of marbles.';
        why = `Each marble has the same chance. ${green} of the ${total} ${green === 1 ? 'is' : 'are'} green.`; break;
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
          // Equal parts with different shapes: the lesson's big idea (3.G.2).
          { cut: 'fourths-mixed' as const, whole: 'square', parts: 4 },
          { cut: 'eighths-triangles' as const, whole: 'square', parts: 8 },
        ]; // 9 shapes: a count that doesn't divide 12, so each redo round shows new shapes
        if (i % 6 === 5) {
          // One "different shapes, same size" yes and one "four pieces, not fourths" no per sheet; redo sheets swap them.
          const same = (i === 5) === (variant % 2 === 0);
          if (same) {
            prompt = 'Two small squares and two triangles fill this square. Are all 4 parts equal in area? Answer yes or no.';
            answer = 'yes'; form = 'word'; area = { cut: 'fourths-mixed' };
            hint = 'Picture one triangle next to one small square. Does each one cover the same space?';
            why = 'One half holds 2 squares and the other half holds 2 triangles. Each part is half of a half, so all 4 are equal.';
          } else {
            const pizza = i === 11;
            prompt = pizza ? 'This pizza is cut into 4 slices. Are the slices equal in area? Answer yes or no.' : 'On this tile pattern, are the 4 parts of the square equal in area? Answer yes or no.';
            answer = 'no'; form = 'word'; area = { cut: pizza ? 'circle-unequal' : 'fourths-unequal' };
            hint = 'Count the parts, then compare their areas. Four parts are not always fourths.';
            why = `One ${pizza ? 'slice' : 'part'} covers more space than the others, so the ${pizza ? 'slices' : 'parts'} are not equal in area.`;
          }
        } else {
          // Practice uses rows 1, 4, 7 and 10: these steps give them four different shapes and amounts.
          const shape = cuts[(tr * 2 + Math.floor(tr / 3)) % cuts.length]; const shaded = 1 + (Math.floor(i / 3) % (shape.parts - 1));
          const setting = ['paper design', 'classroom poster', 'garden map', 'window panel', 'quilt square', 'tile pattern', 'greeting card', 'floor plan', 'art print', 'flag design', 'mosaic panel', 'shape puzzle'][i];
          // The child counts the parts in the picture: the words never say how many there are, or how many are colored.
          prompt = `This ${shape.whole} is on a ${setting}. What fraction of the ${shape.whole} is colored?`;
          answer = f(shaded, shape.parts); area = { cut: shape.cut, shaded: Array.from({ length: shaded }, (_, k) => k) };
          hint = 'Count all the equal parts first. Then count the colored parts.';
          why = `${shape.parts} equal parts make the ${shape.whole}. ${shaded} of them ${shaded === 1 ? 'is' : 'are'} colored.`;
        }
        break;
      }
      case 'line': {
        // Grade 3: halves, thirds, fourths, sixths and eighths only (1/2 = 2/4 = 3/6 = 4/8, 1/3 = 2/6, 3/4 = 6/8), and past
        // one whole too (3/2 = 6/4).
        const [n, d, times] = pick(G3_EQUIVALENTS_WIDE);
        prompt = `${f(n, d)} is marked on a line. Which fraction with a denominator of ${d * times} is at the same spot?`;
        answer = f(n * times, d * times); denominator = d * times; visual = model(n, d, 'line');
        hint = times === 2 ? 'Cut every space in half. Now there are twice as many spaces and twice as many jumps.'
          : `Cut every space into ${times} equal spaces. Now there are ${times} times as many spaces and ${times} times as many jumps.`;
        why = `Each 1/${d} space becomes ${times} spaces of 1/${d * times}. So ${some(n, 'jump', 'jumps')} of 1/${d} ${n === 1 ? 'is' : 'are'} ${n * times} jumps of 1/${d * times}.`; break;
      }
      case 'recipe': {
        const batches = 2 + i % 2;
        prompt = `A recipe uses ${f(n, d)} cup of flour. You make ${batches} batches. How much flour do you need?`;
        answer = f(n * batches, d); hint = `${batches} batches: ${Array(batches).fill(f(n, d)).join(' + ')}. Or multiply the numerator by ${batches}.`;
        why = `${batches} batches of ${some(n, 'part', 'parts')} make ${n * batches} parts. The parts stay ${unitName(d)}.`; break;
      }
      case 'percent': {
        const [t, b] = pick(EXACT);
        prompt = `Write ${f(t, b)} as a percent.`; answer = `${(t * 100) / b}%`;
        hint = b === 100 ? 'It is already out of 100. The numerator is the percent.' : `Percent means out of 100. Change ${f(t, b)} to hundredths.`;
        if (b !== 100) why = `${f(t, b)} = ${f((t * 100) / b, 100)}, and ${(t * 100) / b} out of 100 is ${(t * 100) / b}%.`; break;
      }
      case 'percent-inverse': {
        const percent = pick(PERCENTS);
        prompt = `Write ${percent}% as a fraction with a denominator of 100.`; answer = f(percent, 100); denominator = 100;
        hint = 'Percent means out of 100. What goes on top?';
        why = `${percent} goes on top and 100 goes on the bottom.`; break;
      }
      case 'decimal-equivalent': {
        // Twentieths are not a grade 4 denominator: those rows ask about the same amount in hundredths.
        const [top, bottom] = pick(EXACT); const [t, b] = gradeFits(id, bottom) ? [top, bottom] : [top * (100 / bottom), 100];
        prompt = `Write ${f(t, b)} as a decimal.`; answer = String(t / b); form = 'decimal';
        const target = 10 % b === 0 ? 10 : 100;
        hint = b === target
          ? `${f(t, b)} is already in ${unitName(b)}. Write ${unitName(b)} with ${b === 10 ? 'one decimal place' : 'two decimal places'}.`
          : `Multiply top and bottom of ${f(t, b)} by ${target / b} to make ${target} on the bottom.`;
        why = b === target ? `${f(t, b)} is ${t} out of ${b}. ${b === 10 ? '1 place' : '2 places'} after the point show ${unitName(b)}: ${answer}.`
          : `${f(t, b)} = ${f(t * (target / b), target)}, and that is ${answer}.`; break;
      }
      case 'whole-fraction': {
        const examples: { kind: 'write' | 'count' | 'one'; numerator: number; denominator: number }[] = [
          { kind: 'write', numerator: 2, denominator: 1 }, { kind: 'count', numerator: 4, denominator: 2 }, { kind: 'one', numerator: 3, denominator: 3 },
          { kind: 'write', numerator: 3, denominator: 1 }, { kind: 'count', numerator: 9, denominator: 3 }, { kind: 'one', numerator: 4, denominator: 4 },
          { kind: 'write', numerator: 4, denominator: 1 }, { kind: 'count', numerator: 16, denominator: 4 }, { kind: 'one', numerator: 6, denominator: 6 },
          { kind: 'write', numerator: 5, denominator: 1 }, { kind: 'count', numerator: 24, denominator: 8 }, { kind: 'one', numerator: 8, denominator: 8 },
          { kind: 'write', numerator: 6, denominator: 1 }, { kind: 'count', numerator: 6, denominator: 2 }, { kind: 'one', numerator: 2, denominator: 2 },
          { kind: 'count', numerator: 10, denominator: 2 }, { kind: 'count', numerator: 12, denominator: 3 }, { kind: 'count', numerator: 16, denominator: 8 },
          { kind: 'count', numerator: 12, denominator: 4 }, { kind: 'count', numerator: 8, denominator: 4 }, { kind: 'count', numerator: 8, denominator: 2 },
          { kind: 'count', numerator: 12, denominator: 6 }, { kind: 'count', numerator: 18, denominator: 6 }, { kind: 'one', numerator: 1, denominator: 1 },
        ];
        const item = pick(examples);
        if (item.kind === 'write') {
          prompt = `Write ${item.numerator} whole bars as a fraction with a denominator of 1.`; answer = `${item.numerator}/1`; visual = model(item.numerator, 1);
          hint = 'The denominator 1 means each part is one whole.';
          why = `With a denominator of 1, each whole bar is 1 part. ${item.numerator} bars are ${item.numerator} parts: ${answer}.`;
        } else if (item.kind === 'count') {
          // One spare whole to copy onto, so counting the bars does not give the answer.
          prompt = `How many wholes are ${item.numerator}/${item.denominator}?`; answer = String(item.numerator / item.denominator);
          visual = { ...model(item.numerator, item.denominator), wholes: item.numerator / item.denominator + 1 };
          hint = `${item.denominator}/${item.denominator} makes one whole. Count groups of ${item.denominator}/${item.denominator}.`;
          why = `${item.numerator}/${item.denominator} is ${some(item.numerator / item.denominator, 'group', 'groups')} of ${item.denominator}/${item.denominator}, and each group is 1 whole.`;
        } else {
          prompt = `Write ${item.numerator}/${item.denominator} as a whole number.`; answer = '1'; visual = model(item.numerator, item.denominator);
          hint = 'The numerator and denominator match, so every equal part is included.';
          why = item.numerator === 1 ? 'A whole cut into just 1 part is still the whole, so 1/1 is 1.'
            : `${item.numerator}/${item.numerator} is all ${item.numerator} of the ${item.numerator} equal parts. That is 1 whole.`;
        }
        modelRequired = true; break;
      }
      case 'decimal-compare': {
        const hundredths: [number, number][] = [[30, 25], [40, 35], [8, 12], [55, 5], [23, 32], [70, 7], [45, 50], [3, 25], [99, 90], [60, 6], [11, 10], [35, 5],
          [50, 45], [20, 15], [9, 10], [65, 6], [42, 24], [80, 8], [15, 51], [4, 40], [88, 80], [30, 3], [21, 12], [75, 57]];
        const [a, b] = pick(hundredths);
        // Written the short way (0.4, not 0.40), with no fraction beside it: "0.4 or 0.35?" is the mistake to catch.
        const left = String(a / 100); const right = String(b / 100);
        prompt = `Compare: ${left} __ ${right}.`; answer = a > b ? '>' : a < b ? '<' : '='; form = 'symbol';
        // Both decimals are drawn, as bars of the same whole in the order of the question, each cut the way its decimal is
        // written (0.3 in tenths, 0.25 in hundredths, as Practice more draws them): nothing named, no winner marked.
        // The child builds the top one, the first decimal, before comparing.
        const bar = (h: number) => (h % 10 === 0 ? { numerator: h / 10, denominator: 10 } : { numerator: h, denominator: 100 });
        const top = bar(a);
        visual = model(top.numerator, top.denominator); modelRequired = true; task = { kind: 'copy', n: top.numerator, of: 'top bar' };
        picture = { kind: 'bars', bars: [top, bar(b)] };
        hint = `Write both in hundredths: ${left} is ${a} hundredths. How many hundredths is ${right}? Compare the counts, not how long the numbers look.`;
        why = `${right} is ${b} hundredths. ${a} hundredths are ${a > b ? 'more' : 'less'} than ${b} hundredths.`; break;
      }
      case 'unit-multiples': {
        const bottom = [2, 3, 4, 5, 6, 8, 4, 5, 6, 8, 5, 6][tr]; const groups = 3 + (i % 5);
        prompt = `Write ${groups} × 1/${bottom} as one fraction.`; answer = f(groups, bottom); visual = model(groups, bottom); modelRequired = true; task = { kind: 'shade', n: groups };
        hint = `Count ${groups} copies of 1/${bottom}. The denominator stays ${bottom}; add the numerators.`;
        why = `${groups} copies of 1/${bottom} make ${groups} parts. The parts stay ${unitName(bottom)}.`; break;
      }
      case 'ruler': {
        const end = 1 + ((tr * 3 + i) % 7);
        const object = ['ribbon', 'paper strip', 'craft stick', 'bookmark', 'leaf stem', 'paintbrush', 'shoelace', 'pencil', 'card strip', 'yarn part', 'straw', 'wooden slat'][i];
        rulerTask = { denominator: 4, wholes: 2, end };
        answer = mixedName(end, 4); form = answer.includes(' ') ? 'mixed' : undefined;
        prompt = `The blue ${object} starts at zero${end % 4 ? ' and ends at a tick with no number' : ''}. Use the ruler. How long is it in inches?`;
        hint = `Count how many short spaces make 1 inch. Then count the spaces to the end of the ${object}.`;
        why = end < 4 ? `It covers ${some(end, 'small space', 'small spaces')}, and each is 1/4 inch.`
          : end === 4 ? '4 small spaces make 1 inch.' : `4 small spaces make 1 inch, and ${end - 4} more ${end - 4 === 1 ? 'makes' : 'make'} ${f(end - 4, 4)} inch.`; break;
      }
      case 'line-plot': {
        const dataSets = [
          [1, 2, 2, 4], [1, 1, 3, 4, 4], [1, 1, 2, 3, 4], [2, 2, 2, 3, 4], [1, 2, 3, 3, 4], [1, 3, 3, 4],
          [1, 1, 3, 4], [2, 2, 4, 4], [2, 2, 3, 4], [1, 1, 2, 4, 4], [1, 3, 3, 3, 4], [1, 2, 4, 4],
        ];
        const values = dataSets[tr % dataSets.length]; const target = [1, 2, 3, 4][i % 4];
        linePlotTask = { denominator: 4, wholes: 1, values };
        const observations = values.map(value => f(value, 4)).join(', ');
        prompt = `Plot these ribbon lengths: ${observations} inch. How many ribbons are ${f(target, 4)} inch long?`;
        answer = String(values.filter(value => value === target).length);
        hint = 'Place one X for each measurement. Count the Xs above the length asked for.';
        const many = values.filter(value => value === target).length;
        why = many ? `${some(many, 'ribbon is', 'ribbons are')} ${f(target, 4)} inch long, so ${many === 1 ? '1 X goes' : `${many} Xs stack`} there.`
          : `No ribbon is ${f(target, 4)} inch long, so no X goes there.`; break;
      }
      case 'line-plot-read': {
        const dataSets = [
          // Each plot has one tallest stack, for the counting and adding rows.
          [1, 2, 2, 5, 7], [1, 3, 4, 4, 4, 6], [2, 2, 2, 5, 8], [1, 4, 6, 6, 7], [1, 2, 3, 3, 8], [2, 4, 5, 5, 5, 7],
          [1, 3, 5, 5, 8], [2, 4, 4, 7], [2, 3, 6, 6, 6, 8], [1, 2, 4, 4, 6], [3, 5, 5, 6, 8], [3, 4, 4, 4, 5, 7],
        ];
        const values = dataSets[tr % dataSets.length]; const difference = Math.max(...values) - Math.min(...values);
        const object = ['pencil', 'crayon', 'twig', 'ribbon', 'craft stick', 'seedling', 'shell', 'string', 'paper clip', 'feather', 'straw', 'tile'][i];
        // The values are only in the plot: the child reads them off it (count a stack, add a stack, find the ends).
        picture = { kind: 'lineplot', denominator: 8, wholes: 1, values };
        const plural = `${object}s`;
        // Practice uses rows 1, 4, 7 and 10: this gives them all three kinds of question.
        const kind = (i + Math.floor(i / 3)) % 3;
        const shown = `The line plot shows ${object} lengths in eighths of an inch.`;
        // The tallest stack (the first one when two tie) for the counting and adding rows.
        const stack = [...values].sort((a, b) => values.filter((v) => v === b).length - values.filter((v) => v === a).length)[0];
        const count = values.filter((v) => v === stack).length;
        if (kind === 1) {
          prompt = `${shown} How many ${plural} are ${f(stack, 8)} inch long?`; answer = String(count);
          hint = `Find ${f(stack, 8)} on the line. Count the Xs in its stack.`;
          why = `Each X is one ${object}, and ${some(count, 'X is', 'Xs are')} above ${f(stack, 8)}.`;
        } else if (kind === 2) {
          prompt = `${shown} How long are all the ${f(stack, 8)} inch ${plural} together?`; answer = f(stack * count, 8); denominator = 8;
          hint = `Count the Xs above ${f(stack, 8)}. Add ${f(stack, 8)} that many times.`;
          why = `${Array(count).fill(f(stack, 8)).join(' + ')} = ${f(stack * count, 8)}.`;
        } else {
          prompt = `${shown} What is the difference between the longest and shortest?`; answer = f(difference, 8); denominator = 8;
          hint = 'Find the farthest-right and farthest-left Xs. Subtract their lengths.';
          why = `The longest is ${f(Math.max(...values), 8)} inch and the shortest is ${f(Math.min(...values), 8)} inch. ${f(Math.max(...values), 8)} − ${f(Math.min(...values), 8)} = ${f(difference, 8)}.`;
        }
        break;
      }
      case 'line-plot-level': {
        const dataSets = [
          // Never three equal amounts: then "share equally" has nothing to do. Every total splits into whole fourths.
          [1, 2, 3], [2, 3, 4], [1, 2, 6], [1, 3, 5], [2, 4, 6], [2, 2, 5],
          [1, 1, 4], [1, 4, 4], [1, 3, 8], [1, 1, 7], [3, 4, 5], [1, 4, 7],
        ];
        const values = dataSets[tr % dataSets.length]; const total = values.reduce((sum, value) => sum + value, 0);
        const divisor = values.length; const factor = gcd(total, divisor * 4);
        const context = ['small cups', 'jars', 'beakers', 'bottles', 'pitchers', 'tubs', 'bowls', 'flasks', 'cans', 'pots', 'glasses', 'pails'][i];
        linePlotTask = { denominator: 4, wholes: 2, values };
        prompt = `Three ${context} hold ${values.map(value => f(value, 4)).join(', ')} liter. Plot them, then share the total equally. How many liters go in each?`;
        answer = (divisor * 4) / factor === 1 ? String(total / factor) : f(total / factor, (divisor * 4) / factor);
        hint = `Add the amounts in the ${context}, then split that total into 3 equal shares.`;
        why = `${values.map(value => f(value, 4)).join(' + ')} = ${f(total, 4)}. Each share is ${f(total / 3, 4)} liter${answer === f(total / 3, 4) ? '' : `, the same as ${answer} liter`}.`; break;
      }
      case 'measure-context': {
        const stories: { prompt: string; answer: string; hint: string; why: string; numerator: number; denominator: number; form?: WorksheetProblem['form'] }[] = [
          { prompt: 'A ribbon is 1/4 meter and another is 1/2 meter. How many meters long together?', answer: '3/4', hint: 'Rename 1/2 as 2/4, then add.', why: '1/2 = 2/4. 1/4 + 2/4 = 3/4.', numerator: 3, denominator: 4 },
          { prompt: 'How many minutes are in 1/4 hour?', answer: '15', hint: 'An hour is 60 minutes. Split 60 into 4 equal groups.', why: '4 groups of 15 make 60. So 1/4 hour is 15 minutes.', numerator: 1, denominator: 4 },
          { prompt: 'A jug has 1/2 liter. You add 1/4 liter. How many liters now?', answer: '3/4', hint: 'Rename 1/2 as 2/4, then add.', why: '1/2 = 2/4. 2/4 + 1/4 = 3/4.', numerator: 3, denominator: 4 },
          { prompt: 'A 1-kilogram bag is 3/4 full. How many grams are in it?', answer: '750', hint: '1 kilogram is 1000 grams. Find 3/4 of 1000.', why: '4 groups of 250 make 1000. So 3/4 is 3 groups of 250: 750 grams.', numerator: 3, denominator: 4 },
          { prompt: 'How many cents are in 1/4 dollar?', answer: '25', hint: 'A dollar is 100 cents. Split 100 into 4 equal groups.', why: '4 groups of 25 make 100. So 1/4 dollar is 25 cents.', numerator: 1, denominator: 4 },
          { prompt: 'How many minutes are in 3/4 hour?', answer: '45', hint: 'An hour is 60 minutes. Find 3 of 4 equal groups.', why: '4 groups of 15 make 60. So 3/4 hour is 3 groups of 15: 45 minutes.', numerator: 3, denominator: 4 },
          { prompt: 'A bottle has 1/2 liter. How many milliliters is that?', answer: '500', hint: 'A liter is 1000 milliliters. Find half of 1000.', why: '2 groups of 500 make 1000. So 1/2 liter is 500 milliliters.', numerator: 1, denominator: 2 },
          { prompt: 'A bag weighs 1/4 kilogram. How many grams is that?', answer: '250', hint: 'A kilogram is 1000 grams. Find one fourth of 1000.', why: '4 groups of 250 make 1000. So 1/4 kilogram is 250 grams.', numerator: 1, denominator: 4 },
          { prompt: 'A board is 3/4 meter. Another is 1/4 meter. How many meters in all?', answer: '1', hint: 'Both are fourths. Add the numerators. How many fourths make a whole?', why: '3/4 + 1/4 = 4/4, and 4 fourths make 1 whole meter.', numerator: 4, denominator: 4 },
          { prompt: 'How many cents are in 3/4 dollar?', answer: '75', hint: 'A dollar is 100 cents. Find 3 of 4 equal groups.', why: '4 groups of 25 make 100. So 3/4 dollar is 3 groups of 25: 75 cents.', numerator: 3, denominator: 4 },
          { prompt: 'A 2-liter jug is 1/4 full. How many milliliters are inside?', answer: '500', hint: '2 liters is 2000 milliliters. Find one fourth of 2000.', why: '4 groups of 500 make 2000. So 1/4 of 2 liters is 500 milliliters.', numerator: 1, denominator: 4 },
          { prompt: 'How many hours are in 1/2 day?', answer: '12', hint: 'A day is 24 hours. Split 24 into 2 equal groups.', why: '2 groups of 12 make 24. So 1/2 day is 12 hours.', numerator: 1, denominator: 2 },
          { prompt: 'How many minutes are in 1/2 hour?', answer: '30', hint: 'An hour is 60 minutes. Split 60 into 2 equal groups.', why: '2 groups of 30 make 60. So 1/2 hour is 30 minutes.', numerator: 1, denominator: 2 },
          { prompt: 'How many cents are in 1/2 dollar?', answer: '50', hint: 'A dollar is 100 cents. Split 100 into 2 equal groups.', why: '2 groups of 50 make 100. So 1/2 dollar is 50 cents.', numerator: 1, denominator: 2 },
          { prompt: 'A 1-kilogram bag is 1/2 full. How many grams are in it?', answer: '500', hint: '1 kilogram is 1000 grams. Find half of 1000.', why: '2 groups of 500 make 1000. So 1/2 kilogram is 500 grams.', numerator: 1, denominator: 2 },
          { prompt: 'A ribbon is 1/3 meter and another is 1/3 meter. How many meters long together?', answer: '2/3', hint: 'Thirds plus thirds make thirds. Add the numerators.', why: '1 third and 1 more third make 2 thirds.', numerator: 2, denominator: 3 },
          { prompt: 'How many hours are in 1/4 day?', answer: '6', hint: 'A day is 24 hours. Split 24 into 4 equal groups.', why: '4 groups of 6 make 24. So 1/4 day is 6 hours.', numerator: 1, denominator: 4 },
          { prompt: 'A bottle has 3/4 liter. How many milliliters is that?', answer: '750', hint: 'A liter is 1000 milliliters. Find 3 of 4 equal groups.', why: '4 groups of 250 make 1000. So 3/4 liter is 3 groups of 250: 750 milliliters.', numerator: 3, denominator: 4 },
          { prompt: 'A jug has 1/4 liter. You add 1/2 liter. How many liters now?', answer: '3/4', hint: 'Rename 1/2 as 2/4, then add.', why: '1/2 = 2/4. 1/4 + 2/4 = 3/4.', numerator: 3, denominator: 4 },
          { prompt: 'How many minutes are in 1/3 hour?', answer: '20', hint: 'An hour is 60 minutes. Split 60 into 3 equal groups.', why: '3 groups of 20 make 60. So 1/3 hour is 20 minutes.', numerator: 1, denominator: 3 },
          { prompt: 'A board is 2/3 meter. Another is 1/3 meter. How many meters in all?', answer: '1', hint: 'Three thirds make one whole meter.', why: '2/3 + 1/3 = 3/3, and 3 thirds make 1 whole meter.', numerator: 3, denominator: 3 },
          { prompt: 'How many hours are in 3/4 day?', answer: '18', hint: 'A day is 24 hours. Find 3 of 4 equal groups.', why: '4 groups of 6 make 24. So 3/4 day is 3 groups of 6: 18 hours.', numerator: 3, denominator: 4 },
          { prompt: 'How many hours are in 1/3 day?', answer: '8', hint: 'A day is 24 hours. Split 24 into 3 equal groups.', why: '3 groups of 8 make 24. So 1/3 day is 8 hours.', numerator: 1, denominator: 3 },
          { prompt: 'How many minutes are in 2/3 hour?', answer: '40', hint: 'An hour is 60 minutes. Find 2 of 3 equal groups.', why: '3 groups of 20 make 60. So 2/3 hour is 2 groups of 20: 40 minutes.', numerator: 2, denominator: 3 },
        ];
        const story = pick(stories); prompt = story.prompt; answer = story.answer; form = story.form; hint = story.hint; why = story.why;
        visual = model(story.numerator, story.denominator); modelRequired = true;
        // Adding stories: the child shades the total (a drawn total would be the answer).
        // The instruction doesn't say how many parts: that count is the answer.
        if (/together|now\?|in all/.test(story.prompt)) task = { kind: 'shade', n: story.numerator, say: 'Shade both amounts on the bar. Tap again to clear.' };
        break;
      }
      case 'add-unlike': {
        // Adding only: taking away unlike fractions is the next lesson.
        const examples: [number, number, number, number, '+' | '−'][] = [
          [1, 3, 1, 4, '+'], [1, 2, 1, 3, '+'], [3, 4, 1, 3, '+'], [2, 3, 1, 4, '+'],
          [1, 6, 1, 4, '+'], [1, 5, 1, 2, '+'], [7, 8, 1, 4, '+'], [2, 5, 1, 3, '+'],
          [3, 4, 1, 6, '+'], [1, 6, 1, 3, '+'], [1, 8, 1, 2, '+'], [1, 5, 1, 4, '+'],
          [1, 2, 1, 4, '+'], [1, 3, 1, 6, '+'], [2, 3, 1, 6, '+'], [3, 4, 1, 2, '+'],
          [1, 4, 1, 8, '+'], [3, 5, 1, 10, '+'], [1, 2, 1, 6, '+'], [1, 2, 2, 5, '+'],
          [2, 5, 1, 4, '+'], [3, 8, 1, 4, '+'], [1, 6, 3, 4, '+'], [1, 4, 2, 3, '+'],
        ];
        const [a, b, c, e, op] = pick(examples); const common = lcm(b, e);
        const top = a * (common / b) + (op === '+' ? 1 : -1) * c * (common / e);
        // The child always does the renaming. On the first 6 rows the hint names the shared part size; later rows find it alone.
        const scaffold = i < 6;
        prompt = `${f(a, b)} ${op} ${f(c, e)} = ?`;
        answer = mixedName(top, common); form = answer.includes(' ') ? 'mixed' : undefined;
        visual = model(a * (common / b), common); modelRequired = true;
        hint = scaffold
          ? `Make both fractions ${unitName(common)} first. Then ${op === '+' ? 'add' : 'subtract'} the numerators.`
          : `List multiples of ${b} and ${e}. Which number is in both lists? Rename both fractions with it, then ${op === '+' ? 'add' : 'subtract'}.`;
        why = `${renamesTo(common, [a, b], [c, e])}${f(a * (common / b), common)} ${op} ${f(c * (common / e), common)} = ${f(top, common)}${top >= common && top % common ? `, or ${answer}` : top === common ? ', or 1 whole' : ''}.`; break;
      }
      case 'mixed-unlike': {
        const examples: [number, number, number, number, number, number, '+' | '−'][] = [
          [1, 1, 2, 1, 1, 3, '+'], [2, 1, 3, 0, 3, 4, '+'], [1, 3, 4, 1, 1, 2, '+'],
          [2, 1, 2, 0, 1, 3, '−'], [3, 1, 4, 1, 1, 2, '−'], [2, 2, 3, 1, 1, 4, '−'],
          [1, 2, 5, 1, 1, 2, '+'], [2, 1, 6, 0, 1, 3, '+'], [3, 1, 3, 1, 3, 4, '−'],
          [1, 1, 4, 1, 1, 6, '+'], [2, 3, 5, 1, 1, 2, '−'], [1, 2, 3, 1, 1, 4, '+'],
          [1, 1, 3, 1, 1, 6, '+'], [2, 1, 4, 1, 1, 2, '+'], [1, 1, 2, 0, 1, 4, '+'],
          [3, 3, 4, 1, 1, 2, '−'], [2, 1, 3, 1, 1, 6, '−'], [2, 1, 2, 0, 3, 4, '−'],
          [1, 2, 3, 1, 1, 6, '+'], [3, 1, 2, 1, 2, 3, '−'], [1, 3, 8, 1, 1, 4, '+'],
          [2, 4, 5, 1, 1, 10, '−'], [1, 1, 6, 0, 1, 2, '+'], [3, 1, 3, 1, 1, 2, '−'],
        ];
        const [wholeA, topA, bottomA, wholeB, topB, bottomB, op] = pick(examples);
        const a = wholeA * bottomA + topA; const b = bottomA; const c = wholeB * bottomB + topB; const e = bottomB;
        const common = lcm(b, e); const result = a * (common / b) + (op === '+' ? 1 : -1) * c * (common / e);
        // The child always does the renaming. On the first 6 rows the hint names the shared part size; later rows find it alone.
        const scaffold = i < 6;
        prompt = `${wholeA} ${f(topA, bottomA)} ${op} ${wholeB ? `${wholeB} ` : ''}${f(topB, bottomB)} = ?`;
        answer = mixedName(result, common); form = answer.includes(' ') ? 'mixed' : undefined;
        visual = model(a * (common / b), common); modelRequired = true;
        hint = `${scaffold ? '' : `List multiples of ${bottomA} and ${bottomB} to find a denominator they share. `}${scaffold ? `Rename both fractional parts as ${unitName(common)}` : `${op === '+' ? 'Rename both fractional parts' : 'Rename both numbers'} with the same denominator`}, then ${op === '+' ? 'add' : 'subtract'}.${op === '−' && topA * (common / bottomA) < topB * (common / bottomB) ? ` The first part is too small to take away from: trade 1 whole for ${f(common, common)} first.` : ''}`;
        {
          const x = topA * (common / bottomA); const y = topB * (common / bottomB);
          const renamed = renamesTo(common, [topA, bottomA], [topB, bottomB]);
          if (op === '+') {
            const sum = x + y;
            why = sum < common
              ? `${renamed}${f(x, common)} + ${f(y, common)} = ${f(sum, common)}.${wholeB ? ` ${wholeA} + ${wholeB} = ${wholeA + wholeB} wholes.` : ''}`
              : `${renamed}${f(x, common)} + ${f(y, common)} = ${f(sum, common)}, which is 1 whole${sum > common ? ` and ${f(sum - common, common)}` : ''}. ${wholeA}${wholeB ? ` + ${wholeB}` : ''} + 1 = ${wholeA + wholeB + 1} wholes.`;
          } else {
            const left = (n: number) => some(n, 'whole', 'wholes');
            why = x >= y
              ? `${renamed}${f(x, common)} − ${f(y, common)} = ${f(x - y, common)}, and ${wholeA} − ${wholeB} = ${left(wholeA - wholeB)}.`
              : `${renamed}Trade 1 whole: ${f(x, common)} becomes ${f(x + common, common)}. ${f(x + common, common)} − ${f(y, common)} = ${f(x + common - y, common)}, and ${wholeA - 1} − ${wholeB} = ${left(wholeA - 1 - wholeB)}.`;
          }
        }
        break;
      }
      case 'estimate': {
        const examples: [number, number, number, number, '+' | '−'][] = [
          [2, 5, 1, 2, '+'], [3, 4, 1, 2, '+'], [1, 3, 1, 4, '+'], [5, 6, 1, 4, '+'],
          [3, 8, 1, 2, '+'], [4, 5, 1, 3, '−'], [2, 3, 1, 4, '+'], [3, 5, 1, 2, '+'],
          [5, 8, 1, 4, '+'], [7, 10, 1, 3, '−'], [1, 4, 1, 2, '+'], [3, 4, 1, 3, '+'],
          [1, 2, 1, 3, '+'], [2, 3, 1, 2, '+'], [3, 5, 1, 3, '+'], [5, 6, 1, 2, '+'],
          [1, 5, 1, 2, '+'], [7, 8, 1, 4, '+'], [4, 5, 1, 2, '+'], [3, 10, 1, 2, '+'],
          [1, 8, 1, 2, '+'], [1, 6, 1, 2, '+'], [2, 5, 1, 3, '+'], [7, 10, 1, 2, '+'],
        ];
        // Only sums the benchmarks can decide (5.NF.2): both parts on the same side of 1/2, or one of them exactly 1/2.
        // 3/5 + 1/3 is "about 1" by benchmarks, so it is never asked.
        const decidable = examples.filter(([a, b, c, e, op]) => op === '−' || (a / b - 0.5) * (c / e - 0.5) >= 0);
        const [a, b, c, e, op] = decidable[(i + variant) % decidable.length]; const common = lcm(b, e);
        const total = a * (common / b) + (op === '+' ? 1 : -1) * c * (common / e);
        const side = (x: number, y: number) => (x * 2 === y ? 'is 1/2' : x * 2 < y ? 'is less than 1/2' : 'is more than 1/2');
        if ((i === 3 || i === 8 || i === 11) && op === '+') {
          // Does a given answer make sense? Two are the add-the-tops-and-bottoms slip, one is right. (Not rows 1, 4, 7 and
          // 10: those become the lesson's tap questions.)
          const slip = i !== 8; const said = slip ? f(a + c, b + e) : mixedName(total, common);
          const big = a / b > c / e ? f(a, b) : f(c, e);
          prompt = `${i === 3 ? 'Sam' : i === 8 ? 'Ana' : 'Leo'} says ${f(a, b)} + ${f(c, e)} = ${said}. Does that make sense? Answer yes or no.`;
          // The child builds the claimed answer, then checks it against the bigger part.
          answer = slip ? 'no' : 'yes'; form = 'word'; visual = slip ? model(a + c, b + e) : model(total, common); modelRequired = true;
          hint = `A sum is more than each part. Build ${said}. Is it more than ${big}?`;
          why = slip ? `${said} is less than ${big}, but a sum is more than each part. So ${said} cannot be right.`
            : `${renamesTo(common, [a, b], [c, e])}Together they make ${f(total, common)}${total > common ? `, which is ${said}` : ''}.`; break;
        }
        const operation = op === '+' ? 'sum' : 'difference';
        prompt = `Without finding the exact ${operation}, compare ${f(a, b)} ${op} ${f(c, e)} with 1: __ 1.`;
        answer = total < common ? '<' : '>'; form = 'symbol'; visual = model(a, b); modelRequired = true;
        hint = op === '−' ? `${f(a, b)} is less than 1. Taking some away leaves even less.`
          : `${f(a, b)} ${side(a, b)} and ${f(c, e)} ${side(c, e)}. Two halves make 1. So is the sum more or less than 1?`;
        why = `Check: ${f(a, b)} ${op} ${f(c, e)} = ${mixedName(total, common)}, which is ${total < common ? 'less' : 'more'} than 1.`; break;
      }
      case 'fractional-area': {
        const examples: [number, number][] = [[1, 1], [1, 2], [2, 1], [2, 3], [3, 2], [1, 3], [2, 2], [3, 1], [1, 2], [2, 1], [3, 3], [2, 3]];
        const [a, c] = examples[tr]; const product = a * c;
        const surface = ['garden bed', 'quilt patch', 'poster', 'table top', 'rug', 'wall panel', 'mosaic', 'sandbox', 'floor tile', 'window panel', 'stage', 'notice board'][i];
        prompt = `A rectangular ${surface} is ${a === 3 ? '1' : `${a}/3`} unit by ${c}/4 unit. Color the overlapping area on the 3-by-4 grid. What is its area in square units?`;
        answer = f(product, 12); area = { cut: 'grid-3x4' }; areaTask = { n: product, d: 12 };
        hint = 'Shade the columns for one side and the rows for the other. Count the squares shaded both ways, then count all the squares.';
        why = `${a} × ${c} = ${some(product, 'small square is', 'small squares are')} shaded both ways. The grid has 12 small squares.`; break;
      }
      case 'scaling': {
        const examples: [number, number, number][] = [[3, 4, 12], [3, 2, 12], [5, 4, 8], [3, 2, 10], [4, 4, 20], [3, 4, 16], [5, 4, 12], [5, 4, 24], [3, 2, 8], [1, 4, 12], [3, 4, 20], [5, 4, 16],
          [1, 2, 12], [1, 2, 20], [2, 4, 16], [4, 4, 12], [2, 2, 10], [1, 4, 16], [1, 4, 20], [3, 4, 8], [1, 2, 16], [2, 2, 16], [5, 4, 20], [2, 4, 8]];
        const [top, bottom, whole] = pick(examples);
        scaleTask = { whole, numerator: top, denominator: bottom };
        prompt = `Move the slider to ${top}/${bottom}. Without multiplying, compare ${top}/${bottom} × ${whole} with ${whole}: __ ${whole}.`;
        answer = top < bottom ? '<' : top === bottom ? '=' : '>'; form = 'symbol';
        hint = 'A factor below 1 shrinks the amount. A factor of 1 keeps it the same. A factor above 1 grows it.';
        why = `${f(top, bottom)} is ${top < bottom ? 'less than' : top === bottom ? 'equal to' : 'more than'} 1, so ${f(top, bottom)} × ${whole} is ${top < bottom ? 'less than' : top === bottom ? 'the same as' : 'more than'} ${whole}.`; break;
      }
      case 'mixed-multiply': {
        const examples: [number, number, number, number, number, number][] = [
          [1, 1, 2, 1, 1, 3], [1, 1, 2, 2, 1, 2], [2, 1, 2, 1, 1, 3], [1, 1, 3, 1, 1, 2],
          [1, 1, 4, 2, 1, 2], [2, 1, 3, 1, 1, 2], [1, 1, 2, 1, 1, 4], [1, 1, 3, 2, 1, 2],
          [2, 1, 4, 1, 1, 2], [1, 1, 5, 1, 1, 2], [1, 1, 2, 2, 1, 3], [2, 1, 5, 1, 1, 2],
          [1, 1, 2, 1, 1, 2], [2, 1, 2, 2, 1, 2], [1, 1, 3, 1, 1, 3], [1, 1, 4, 1, 1, 2],
          [3, 1, 2, 1, 1, 2], [1, 2, 3, 1, 1, 2], [2, 1, 3, 2, 1, 2], [1, 1, 5, 2, 1, 2],
          [1, 3, 4, 1, 1, 2], [2, 1, 2, 1, 1, 4], [1, 1, 3, 3, 1, 2], [1, 2, 5, 1, 1, 2],
        ];
        const [wa, na, da, wb, nb, db] = pick(examples); const top = (wa * da + na) * (wb * db + nb); const bottom = da * db;
        prompt = `A rectangular garden is ${wa} ${f(na, da)} meters by ${wb} ${f(nb, db)} meters. What is its area?`;
        answer = mixedName(top, bottom); form = answer.includes(' ') ? 'mixed' : undefined;
        visual = model(wa * da + na, da); modelRequired = true;
        picture = gardenModel({ whole: wa, numerator: na, denominator: da }, { whole: wb, numerator: nb, denominator: db });
        hint = 'Split the rectangle at the whole units. Find the area of each part, then add them.';
        why = `The 4 parts are ${wa * wb}, ${f(wa * nb, db)}, ${f(na * wb, da)} and ${f(na * nb, da * db)} square meters. Added, they make ${answer}.`; break;
      }
      case 'unit-divided-whole': {
        // One kind of question: each redo takes the other half of the list, so back-to-back sheets share no row.
        const [unitDenominator, people] = PAN_SHARES[(i + 13 * variant) % PAN_SHARES.length]; const resultDenominator = unitDenominator * people;
        prompt = `${people} children share 1/${unitDenominator} of a pan. 1/${unitDenominator} ÷ ${people} = ?`;
        why = `Check: ${people} × 1/${resultDenominator} = 1/${unitDenominator}.`;
        explain = `Split the 1/${unitDenominator} part into ${people} equal parts. ${resultDenominator} of those small parts fill the whole pan, so the answer is ${f(1, resultDenominator)}. ${why}`;
        answer = f(1, resultDenominator); denominator = resultDenominator; visual = model(1, unitDenominator); modelRequired = true;
        hint = `Split the 1/${unitDenominator} part into ${people} equal parts. How many of those small parts fill the whole pan?`; break;
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
          { prompt: 'How many inches are in 3/4 foot?', answer: '9', numerator: 3, denominator: 4, hint: '1 foot is 12 inches. Find 3 of 4 equal groups.' },
          { prompt: 'How many minutes are in 1/4 hour?', answer: '15', numerator: 1, denominator: 4, hint: '1 hour is 60 minutes. Find one fourth of 60.' },
          { prompt: 'How many minutes are in 1/3 hour?', answer: '20', numerator: 1, denominator: 3, hint: '1 hour is 60 minutes. Find one third of 60.' },
          { prompt: 'How many milliliters are in 3/4 liter?', answer: '750', numerator: 3, denominator: 4, hint: '1 liter is 1000 milliliters. Find 3 of 4 equal groups.' },
          { prompt: 'How many grams are in 1/4 kilogram?', answer: '250', numerator: 1, denominator: 4, hint: '1 kilogram is 1000 grams. Find one fourth of 1000.' },
          { prompt: 'How many centimeters are in 3/4 meter?', answer: '75', numerator: 3, denominator: 4, hint: '1 meter is 100 centimeters. Find 3 of 4 equal groups.' },
          { prompt: 'How many ounces are in 1/4 pound?', answer: '4', numerator: 1, denominator: 4, hint: '1 pound is 16 ounces. Find one fourth of 16.' },
          { prompt: 'How many ounces are in 3/4 pound?', answer: '12', numerator: 3, denominator: 4, hint: '1 pound is 16 ounces. Find 3 of 4 equal groups.' },
          { prompt: 'How many hours are in 1/2 day?', answer: '12', numerator: 1, denominator: 2, hint: '1 day is 24 hours. Find half of 24.' },
          { prompt: 'How many hours are in 1/3 day?', answer: '8', numerator: 1, denominator: 3, hint: '1 day is 24 hours. Find one third of 24.' },
          { prompt: 'How many inches are in 1/3 foot?', answer: '4', numerator: 1, denominator: 3, hint: '1 foot is 12 inches. Find one third of 12.' },
          { prompt: 'How many seconds are in 1/2 minute?', answer: '30', numerator: 1, denominator: 2, hint: '1 minute is 60 seconds. Find half of 60.' },
        ];
        const item = pick(conversions); prompt = item.prompt; answer = item.answer; hint = item.hint;
        {
          // "How many inches are in 1/4 foot?": 4 groups of 3 make 12, so 1/4 foot is 3 inches.
          const [, small, amount, big] = /How many (\w+) are in (\d+\/\d+) (\w+)\?/.exec(item.prompt)!;
          const each = Number(item.answer) / item.numerator; const whole = each * item.denominator;
          why = `${item.denominator} groups of ${each} make ${whole}. So ${amount} ${big} is ${item.numerator > 1 ? `${item.numerator} groups of ${each}: ` : ''}${item.answer} ${small}.`;
        }
        visual = model(item.numerator, item.denominator); modelRequired = true; break;
      }
      case 'whole-from-part': {
        // "3 is 1/4 of it. What is the whole?" Find one part, then make all the parts. A unit fraction is grade 5
        // (5.NF.7b: 3 ÷ 1/4). A non-unit one is division by a fraction (6.NS.1), so those are stretch rows: every third
        // row only, never one the lesson's practice questions use (rows 1, 4, 7 and 10 of the first sheet).
        const [top, bottom, per] = ([[1, 4, 3], [1, 3, 5], [2, 3, 4], [1, 5, 2], [1, 6, 4], [3, 4, 2], [1, 2, 7], [1, 8, 2], [2, 5, 3], [1, 3, 6], [1, 4, 5], [3, 5, 4]] as const)[tr];
        const part = top * per;
        prompt = [
          `${part} stickers are ${f(top, bottom)} of Ana's stickers. How many stickers does Ana have?`,
          `A piece of ribbon is ${part} meters long. It is ${f(top, bottom)} of the whole ribbon. How many meters long is the whole ribbon?`,
          `Tom read ${part} pages. That is ${f(top, bottom)} of his book. How many pages are in the book?`,
        ][(i + Math.floor(i / 3)) % 3]; // practice uses rows 1, 4, 7 and 10, so they get different stories
        answer = String(bottom * per); visual = model(top, bottom);
        hint = top === 1 ? `1 part is ${part}. The whole has ${bottom} parts.` : `A stretch question! ${top} parts are ${part}. Find 1 part first. The whole has ${bottom} parts.`;
        why = `${top === 1 ? '' : `${top} parts are ${part}, so 1 part is ${per}. `}${bottom} groups of ${per} make ${bottom * per}.`; break;
      }
      case 'mistake': {
        // Error analysis: every third row asks "Is it right?"; the rest ask for the right answer. Grade 4 (4.NF.3a, 4.NF.4):
        // like denominators and whole × fraction only, no renaming to add and no fraction × fraction.
        // [claim, right answer, hint, why after a right answer]
        const checks: [string, 'yes' | 'no', string, string][] = [
          ['Sam says 2/5 + 1/5 = 3/10.', 'no', 'Fifths plus fifths make fifths. Add only the numerators.', '2 fifths + 1 fifth = 3 fifths, or 3/5. The parts do not turn into tenths.'],
          ['Lee says 3/4 is bigger than 3/8.', 'yes', 'Both have 3 parts. Fourths are bigger than eighths.', '3/4 is the same as 6/8, and 6/8 is more than 3/8.'],
          ['Mia says 1/8 is bigger than 1/4 because 8 is bigger than 4.', 'no', 'More parts in the whole means smaller parts.', '1/4 is the same as 2/8, so 1/4 is bigger than 1/8.'],
          ['Ana says 2/3 = 4/6.', 'yes', 'Cut each third into 2. Then 2 thirds is 4 sixths.', '2 × 2 = 4 and 3 × 2 = 6, so 2/3 and 4/6 are the same amount.'],
          ['Ray says 1/3 is bigger than 1/5.', 'yes', 'Thirds are bigger parts than fifths.', 'A whole cut into 3 parts has bigger parts than one cut into 5.'],
          ['Jen says 3/5 + 1/5 = 4/10.', 'no', 'Fifths plus fifths make fifths. Add only the numerators.', '3 fifths + 1 fifth = 4 fifths, or 4/5. The parts stay fifths.'],
          ['Pat says 4/8 = 1/2.', 'yes', '4 of 8 equal parts is half of them.', '4 is half of 8, so 4/8 is one half.'],
          ['Kai says 2/6 is bigger than 2/3 because 6 is bigger than 3.', 'no', 'Both have 2 parts. Sixths are smaller than thirds.', '2/3 is the same as 4/6, and 4/6 is more than 2/6. So 2/6 is smaller.'],
        ];
        const fixes: [string, string, string, number?, WorksheetProblem['form']?][] = [
          ['Sam says 1/4 + 2/4 = 3/8.', '3/4', 'Fourths plus fourths make fourths. Add only the numerators.'],
          ['Kim says 5/6 − 2/6 = 3/12.', '3/6', 'Sixths minus sixths leave sixths. Take away only the numerators.'],
          ['Jo says 2 × 2/5 = 4/10.', '4/5', 'Multiply only the numerator. The parts stay fifths.'],
          ['Ben says 7/8 − 3/8 = 4/16.', '4/8', 'Eighths minus eighths leave eighths. Take away only the numerators.'],
          ['Eva says 2/10 + 5/10 = 7/20.', '7/10', 'Tenths plus tenths make tenths. Add only the numerators.'],
          ['Max says 7/4 = 1 1/3.', '1 3/4', '4 fourths make one whole. Count the fourths left over.', undefined, 'mixed'],
          ['Zoe says 2/3 = 3/4 because she added 1 to the numerator and denominator. Which fraction in sixths is really equal to 2/3?', '4/6', 'Multiply the numerator and denominator by the same number.', 6],
          ['Tim says 2 × 3/8 = 6/16.', '6/8', 'Multiply only the numerator. The parts stay eighths.'],
          ['Liv says 1/6 + 4/6 = 5/12.', '5/6', 'Sixths plus sixths make sixths. Add only the numerators.'],
          ['Dan says 4/5 − 1/5 = 3.', '3/5', 'Fifths minus fifths leave fifths. Keep the denominator.'],
          ['Amy says 3 × 1/4 = 3/12.', '3/4', 'Multiply only the numerator. The parts stay fourths.'],
          ['Leo says 7/10 − 4/10 = 3/20.', '3/10', 'Tenths minus tenths leave tenths. Keep the denominator.'],
          ['Ivy says 3/4 + 2/4 = 5/8.', '5/4', 'Fourths plus fourths make fourths. 5 fourths are more than one whole.', 4],
          ['Gus says 9/4 = 2 1/2.', '2 1/4', '8 fourths make 2 wholes. Count the fourths left over.', undefined, 'mixed'],
          ['Nia says 3/5 = 4/6 because she added 1 to the numerator and denominator. Which fraction in tenths is really equal to 3/5?', '6/10', 'Multiply the numerator and denominator by the same number.', 10],
          ['Sid says 4 × 1/3 = 4/12.', '4/3', 'Multiply only the numerator. The parts stay thirds.'],
        ];
        // Why each fix is right, in the same order as `fixes` (shown after a right answer).
        const fixWhy = [
          '1 fourth + 2 fourths = 3 fourths. The denominator stays 4.',
          '5 sixths − 2 sixths = 3 sixths. The denominator stays 6.',
          '2 groups of 2 fifths make 4 fifths. The denominator stays 5.',
          '7 eighths − 3 eighths = 4 eighths. The denominator stays 8.',
          '2 tenths + 5 tenths = 7 tenths. The denominator stays 10.',
          '4/4 is 1 whole, and 3 fourths are left over.',
          '2 × 2 = 4 and 3 × 2 = 6, so 2/3 = 4/6. Adding 1 to both changes the amount.',
          '2 groups of 3 eighths make 6 eighths. The denominator stays 8.',
          '1 sixth + 4 sixths = 5 sixths. The denominator stays 6.',
          '4 fifths − 1 fifth = 3 fifths, not 3 wholes.',
          '3 groups of 1 fourth make 3 fourths. The denominator stays 4.',
          '7 tenths − 4 tenths = 3 tenths. The denominator stays 10.',
          '3 fourths + 2 fourths = 5 fourths. The denominator stays 4.',
          '8/4 is 2 wholes, and 1 fourth is left over.',
          '3 × 2 = 6 and 5 × 2 = 10, so 3/5 = 6/10. Adding 1 to both changes the amount.',
          '4 groups of 1 third make 4 thirds. The denominator stays 3.',
        ];
        if (i % 3 === 0) {
          const [claim, said, rule, reason] = checks[(i / 3 + variant) % checks.length];
          prompt = `${claim} Is that right? Answer yes or no.`; answer = said; form = 'word'; hint = rule; why = reason;
        } else {
          const at = (i - 1 - Math.floor(i / 3) + variant) % fixes.length;
          const [claim, right, rule, bottom, shape] = fixes[at];
          // A claim that ends in its own question is asked as it is.
          prompt = claim.endsWith('?') ? claim : `${claim} What is the right answer?${bottom ? ` Use ${unitName(bottom)}.` : ''}`; answer = right; hint = rule;
          form = shape; denominator = bottom; why = fixWhy[at];
        }
        break;
      }
      case 'remainder': {
        // Singapore-style bar model: take a part, then a part of what is left.
        const [total, a, b, c, e] = ([[24, 1, 4, 1, 3], [30, 1, 3, 1, 2], [20, 1, 5, 1, 4], [36, 1, 4, 2, 3], [40, 2, 5, 1, 2], [18, 1, 3, 1, 3],
          [60, 1, 6, 1, 5], [32, 1, 2, 1, 4], [45, 1, 3, 2, 5], [24, 3, 8, 1, 3], [50, 1, 5, 1, 2], [16, 1, 4, 1, 2]] as const)[tr];
        const rest = (total / b) * (b - a); const left = (rest / e) * (e - c);
        visual = model(a, b);
        if (i % 2 === 0) {
          prompt = `Ana has ${total} stickers. She gives ${f(a, b)} of them to Ben. Then she gives ${f(c, e)} of the rest to Cal. How many stickers does Ana have now?`;
          answer = String(left); hint = `Find ${f(a, b)} of ${total} and take it away. Then find ${f(c, e)} of what is left, and take that away too.`;
          why = `${f(a, b)} of ${total} is ${(total / b) * a}, so ${rest} are left. ${f(c, e)} of ${rest} is ${(rest / e) * c}, so ${left} are left.`;
        } else {
          const top = (b - a) * (e - c); const bottom = b * e; const g = gcd(top, bottom);
          prompt = `Max eats ${f(a, b)} of a pizza. Then he eats ${f(c, e)} of what is left. What fraction of the pizza is left now?`;
          answer = f(top / g, bottom / g); hint = `First ${f(b - a, b)} is left. Then ${f(e - c, e)} of that part is still left.`;
          why = `${f(e - c, e)} of ${f(b - a, b)} is ${f(top, bottom)}${g > 1 ? `, the same as ${answer}` : ''}.`;
        }
        break;
      }
      case 'divide-fractions': {
        // How many pieces of one size fit in an amount? Rename to the same pieces, then count.
        const [a, b, c, e] = ([[3, 4, 1, 8], [2, 3, 1, 6], [1, 2, 1, 8], [3, 5, 1, 10], [5, 6, 1, 12], [1, 3, 1, 9],
          [3, 4, 1, 12], [2, 5, 1, 10], [1, 2, 1, 6], [4, 5, 1, 10], [3, 4, 3, 8], [6, 10, 2, 10]] as const)[tr];
        prompt = i % 2 ? `${f(a, b)} ÷ ${f(c, e)} = ?` : `How many ${f(c, e)} cup scoops fill ${f(a, b)} cup?`;
        answer = String((a * e) / (b * c)); visual = model(a, b);
        hint = `Write ${f(a, b)} in ${unitName(e)}. Count how many ${f(c, e)} parts fit.`;
        {
          const small = a * (e / b); // a/b in the scoop's parts
          why = `${b === e ? '' : `${f(a, b)} = ${f(small, e)}. `}${c === 1 ? `${small} parts of ${f(1, e)} fit.` : `${pieces(small, e)} make ${small / c} groups of ${pieces(c, e)}.`}`;
        }
        break;
      }
      case 'decimal-grid': {
        // Order three decimals, pick the bigger of two, count hundredths, and ask whether two parts can be compared at all.
        const show = (h: number) => String(h / 100);
        const grid = (h: number) => ({ cut: 'grid-10x10' as const, shaded: Array.from({ length: h }, (_, k) => (k % 10) * 10 + Math.floor(k / 10)) });
        const grids = (...hs: number[]): ModelSpec => ({ kind: 'area', ...grid(hs[0]), more: hs.slice(1).map(grid) });
        if (i % 4 === 0) {
          const [a, b, same] = pick([[50, 40, false], [60, 45, true], [30, 25, true], [70, 7, false], [45, 5, true], [80, 75, false]] as const);
          const [who, other] = pick([['Mia', 'Leo'], ['Sam', 'Ana'], ['Kim', 'Ben']] as const);
          prompt = same
            ? `${who} eats ${show(a)} of a pizza. ${other} eats ${show(b)} of the same size pizza. Can you tell who eats more? Answer yes or no.`
            : `${who} eats ${show(a)} of a small pizza. ${other} eats ${show(b)} of a big pizza. Can you tell who eats more? Answer yes or no.`;
          answer = same ? 'yes' : 'no'; form = 'word';
          picture = { kind: 'area', cut: 'circle-tenths', shaded: [], ...(same ? {} : { scale: 0.6 }), more: [{ cut: 'circle-tenths', shaded: [] }] };
          hint = 'Look at the two wholes first. You can only compare parts of the same whole.';
          why = same ? `Both pizzas are the same size, so ${show(a)} and ${show(b)} of them can be compared.` : 'The pizzas are different sizes. A part of a big pizza and a part of a small one cannot be compared.'; break;
        }
        if (i % 4 === 1) {
          const trio = pick([[50, 45, 60], [30, 7, 25], [80, 75, 9], [4, 40, 35], [62, 6, 26], [10, 1, 9], [55, 5, 50], [70, 77, 7], [15, 51, 5], [20, 2, 22], [90, 9, 99], [33, 3, 30]] as const);
          const up = Math.floor(i / 4) % 2 === 0;
          prompt = `Put ${show(trio[0])}, ${show(trio[1])} and ${show(trio[2])} in order, ${up ? 'smallest' : 'biggest'} first.`;
          answer = [...trio].sort((x, y) => (up ? x - y : y - x)).map(show).join(', '); form = 'ordered';
          picture = grids(...trio); hint = `Write each one in hundredths: ${show(trio[0])} is ${trio[0]} hundredths. Then order the counts.`;
          { const counts = [...trio].sort((x, y) => (up ? x - y : y - x)); why = `In hundredths they are ${counts[0]}, ${counts[1]} and ${counts[2]}.`; } break;
        }
        if (i % 4 === 2) {
          const [a, b] = pick([[30, 25], [7, 70], [45, 5], [60, 59], [8, 80], [12, 2], [40, 4], [99, 9], [5, 50], [66, 6], [20, 19], [1, 10]] as const);
          prompt = `Which is more: ${show(a)} or ${show(b)}?`; answer = show(Math.max(a, b)); form = 'decimal';
          picture = grids(a, b); hint = 'Write both in hundredths. Then compare the counts, not how long the numbers look.';
          { const hundredths = (h: number) => `${h} ${h === 1 ? 'hundredth' : 'hundredths'}`;
            why = `${show(a)} is ${hundredths(a)} and ${show(b)} is ${hundredths(b)}. ${Math.max(a, b)} is more than ${Math.min(a, b)}.`; } break;
        }
        const h = pick([40, 7, 35, 90, 3, 60, 25, 8, 50, 75, 2, 30]);
        prompt = `How many hundredths is ${show(h)}?`; answer = String(h);
        picture = { kind: 'area', cut: 'grid-10x10', shaded: [] };
        hint = h % 10 === 0 ? `One tenth is 10 hundredths: one whole column of the grid.` : 'Two places after the decimal point name hundredths.';
        why = h % 10 === 0 ? `${show(h)} is ${h / 10} ${h === 10 ? 'tenth' : 'tenths'}, and ${h / 10} × 10 = ${h} hundredths.` : `${show(h)} has ${Math.floor(h / 10)} in the tenths place and ${h % 10} in the hundredths place. That is ${h} hundredths.`; break;
      }
      case 'bigger-smaller': {
        const [top, bottom] = pick([[3, 4], [5, 4], [2, 3], [4, 3], [1, 2], [3, 2], [3, 3], [5, 6], [7, 6], [2, 2], [4, 5], [6, 5],
          [9, 10], [11, 10], [4, 4], [2, 5], [7, 5], [5, 5], [1, 3], [5, 3], [6, 6], [3, 8], [9, 8], [8, 8]] as const);
        const amount = pick(['5/6', '2 1/2', '3/4', '1 1/3', '7/8', '4', '2/3', '3 1/2', '9/10', '5', '1 1/4', '6']);
        picture = { kind: 'bars', bars: [{ numerator: top, denominator: bottom, named: true }] };
        if (i % 3 === 0) {
          prompt = `Without multiplying, compare ${top}/${bottom} × ${amount} with ${amount}: __ ${amount}.`;
          answer = top < bottom ? '<' : top === bottom ? '=' : '>'; form = 'symbol';
        } else if (i % 3 === 1) {
          prompt = `Is ${top}/${bottom} × ${amount} more than ${amount}? Answer yes or no.`; answer = top > bottom ? 'yes' : 'no'; form = 'word';
        } else {
          prompt = `Is ${top}/${bottom} × ${amount} the same as ${amount}? Answer yes or no.`; answer = top === bottom ? 'yes' : 'no'; form = 'word';
        }
        hint = 'Compare the fraction with 1. Less than 1 makes less, more than 1 makes more, and 1 keeps it the same.';
        why = `${top}/${bottom} is ${top < bottom ? 'less than' : top === bottom ? 'equal to' : 'more than'} 1, so ${top}/${bottom} × ${amount} is ${top < bottom ? 'less than' : top === bottom ? 'the same as' : 'more than'} ${amount}.`; break;
      }
      case 'times-grid': {
        const [a, b, c, e] = pick([[3, 4, 1, 2], [2, 3, 3, 4], [1, 2, 4, 5], [3, 5, 2, 3], [2, 3, 4, 5], [1, 3, 1, 2], [3, 4, 2, 3], [2, 5, 1, 2],
          [5, 6, 1, 2], [1, 4, 2, 3], [4, 5, 3, 4], [1, 2, 5, 6], [2, 3, 1, 4], [3, 4, 3, 5], [1, 6, 2, 3], [4, 5, 1, 3], [1, 2, 3, 4], [5, 6, 2, 3],
          [2, 5, 2, 3], [3, 4, 1, 3], [1, 3, 3, 4], [3, 5, 1, 2], [2, 3, 5, 6], [4, 5, 5, 6]] as const);
        prompt = i % 2 ? `What is ${f(a, b)} of ${f(c, e)}?` : `${f(a, b)} × ${f(c, e)} = ?`; answer = f(a * c, b * e);
        // The square to cut: rows for the first fraction, columns for the second, nothing shaded (the overlap is the answer).
        area = { cut: gridCut(e, b) };
        hint = `Shade ${a} of ${b} rows, then ${c} of ${e} columns. Count where they overlap, then count all the squares.`;
        why = `The overlap is ${a} × ${c} = ${some(a * c, 'small square', 'small squares')}. The whole square has ${b} × ${e} = ${b * e}.`; break;
      }
      case 'share-or-fit': {
        const stuff = pick([['pound', 'pounds', 'clay', 'bags'], ['cup', 'cups', 'rice', 'scoops'], ['liter', 'liters', 'juice', 'bottles']] as const);
        const [unit, units, thing, holders] = stuff;
        if (i % 4 === 0 || i % 4 === 2) {
          const [b, people] = pick([[2, 3], [3, 2], [4, 2], [2, 4], [3, 3], [2, 5], [4, 3], [5, 2], [2, 6], [3, 4], [6, 2], [2, 2]] as const);
          prompt = i % 4 === 0
            ? `1/${b} ${unit} of ${thing} is shared by ${people} friends. What fraction of a ${unit} does each get?`
            : `1/${b} ÷ ${people} = ?`;
          answer = f(1, b * people); visual = model(1, b);
          why = `Check: ${people} × 1/${b * people} = 1/${b}.`;
          hint = `Sharing: cut the 1/${b} into ${people} equal shares. How many of those shares fill one whole?`; break;
        }
        const [d, w] = pick([[4, 3], [3, 2], [2, 4], [6, 1], [5, 2], [4, 2], [3, 4], [8, 1], [2, 3], [6, 2], [4, 1], [3, 3]] as const);
        prompt = i % 4 === 1
          ? `How many 1/${d}-${unit} ${holders} ${w === 1 ? 'does' : 'do'} ${w} ${w === 1 ? unit : units} of ${thing} fill?`
          : `${w} ÷ 1/${d} = ?`;
        answer = String(w * d); visual = { kind: 'bar', n: 0, d: 1, wholes: w };
        why = `Check: ${w * d} × 1/${d} = ${w}.`;
        hint = `Fitting: how many 1/${d} pieces fit in one whole? Then count them in ${w}.`; break;
      }
      case 'coins': {
        // Dimes are tenths of a dollar (10 hundredths each), pennies are hundredths: three ways of asking.
        const [dimes, pennies] = pick([[3, 4], [6, 2], [1, 8], [5, 5], [2, 9], [7, 3], [4, 1], [8, 6], [9, 7], [2, 4], [5, 8], [6, 9]] as const);
        if (i % 3 === 1) {
          prompt = `Write ${f(dimes, 10)} of a dollar in hundredths.`; answer = f(10 * dimes, 100); denominator = 100;
          picture = { kind: 'bars', bars: [{ numerator: dimes, denominator: 10 }], hideLabels: true };
          hint = `${f(dimes, 10)} is ${dimeWord(dimes)}. Each dime is 10 hundredths.`;
          why = `${dimes} × 10 = ${10 * dimes}, so ${f(dimes, 10)} = ${answer}.`; break;
        }
        const coins = `${dimeWord(dimes)} and ${pennyWord(pennies)}`;
        prompt = i % 3 === 0 ? `${coins}. What part of a dollar is that?` : `${f(dimes, 10)} + ${f(pennies, 100)} of a dollar. How much is that in hundredths?`;
        answer = f(10 * dimes + pennies, 100); denominator = 100;
        picture = { kind: 'coins', dimes, pennies };
        hint = `${dimeWord(dimes)} ${dimes === 1 ? 'is' : 'are'} ${10 * dimes} hundredths. Then add the ${pennyWord(pennies)}.`;
        why = `${10 * dimes} hundredths from the ${dimes === 1 ? 'dime' : 'dimes'} and ${pennies} from the ${pennies === 1 ? 'penny' : 'pennies'} make ${10 * dimes + pennies} hundredths.`; break;
      }
      case 'plot-eighths': {
        // The child plots the lengths (in eighths), then uses the plot: how many more, how many longer, two shortest together.
        const dataSets = [
          [1, 3, 3, 5, 5, 5], [2, 2, 4, 6, 7], [1, 2, 2, 2, 6], [3, 4, 4, 7, 7, 7], [1, 1, 5, 6, 6], [2, 3, 3, 3, 8],
          [1, 4, 4, 6, 6, 6], [2, 5, 5, 7], [3, 3, 6, 6, 6, 8], [1, 2, 6, 6, 7], [2, 2, 2, 5, 7], [1, 3, 5, 5, 5, 7],
        ];
        const values = dataSets[tr % dataSets.length];
        const object = ['pebble', 'shell', 'twig', 'pin', 'leaf', 'bead', 'seed', 'feather', 'straw', 'button', 'crayon', 'ribbon'][i];
        linePlotTask = { denominator: 8, wholes: 1, values };
        const list = `${values.map((value) => f(value, 8)).join(', ')} inch`;
        const count = (v: number) => values.filter((value) => value === v).length;
        const most = [...new Set(values)].sort((a, b) => count(b) - count(a) || a - b)[0];
        const least = Math.min(...values);
        if (i % 3 === 0 && count(most) !== count(least)) {
          prompt = `Plot these ${object} lengths in eighths: ${list}. How many more Xs are at ${f(most, 8)} than at ${f(least, 8)}?`;
          answer = String(count(most) - count(least));
          hint = `Count the Xs at ${f(most, 8)}. Count the Xs at ${f(least, 8)}. Take away.`;
          why = `${some(count(most), 'X is', 'Xs are')} at ${f(most, 8)} and ${count(least)} at ${f(least, 8)}. ${count(most)} − ${count(least)} = ${answer}.`; break;
        }
        if (i % 3 === 1) {
          prompt = `Plot these ${object} lengths in eighths: ${list}. How many are longer than 4/8 inch?`;
          answer = String(values.filter((value) => value > 4).length);
          hint = 'Find 4/8 on the plot. Count the Xs to its right.';
          { const longer = values.filter((value) => value > 4).map((value) => f(value, 8));
            why = `${longer.length === 1 ? `Only ${longer[0]} is` : `${longer.slice(0, -1).join(', ')} and ${longer[longer.length - 1]} are`} past 4/8. That is ${longer.length}.`; } break;
        }
        const [a, b] = [...values].sort((x, y) => x - y);
        prompt = `Plot these ${object} lengths in eighths: ${list}. How long are the two shortest together?`;
        answer = f(a + b, 8); denominator = 8;
        hint = 'Find the two Xs farthest left. Add their lengths.';
        why = `The two shortest are ${f(a, 8)} and ${f(b, 8)}. ${f(a, 8)} + ${f(b, 8)} = ${answer}.`; break;
      }
      case 'portions': {
        // Equal portions: a fraction times a whole number, and which whole numbers the total is between.
        const [n, a, b] = pick([[5, 3, 8], [4, 2, 3], [6, 3, 4], [3, 5, 6], [4, 3, 5], [5, 2, 3], [3, 3, 4], [7, 3, 8], [4, 5, 6], [6, 2, 5], [3, 4, 5], [5, 5, 8]] as const);
        const [who, food] = pick([['guest', 'pound of pasta'], ['racer', 'cup of juice'], ['friend', 'pound of grapes'], ['runner', 'liter of water']] as const);
        const unit = food.split(' ')[0];
        const each = `Each ${who} gets ${f(a, b)} ${unit}${food.slice(unit.length)}.`;
        visual = { kind: 'bar', n: 0, d: b, wholes: Math.ceil((n * a) / b) };
        if (i % 2 === 1 && (n * a) % b !== 0) {
          prompt = `${each} ${n} ${who}s. The total is between two whole numbers. What is the bigger one?`;
          answer = String(Math.ceil((n * a) / b));
          hint = `Count all the ${unitWord(b)}: ${n} × ${a}. Then see how many wholes of ${b} ${unitWord(b)} fit.`;
          why = `${n} × ${a} = ${n * a} ${unitWord(b)}. That is ${some(Math.floor((n * a) / b), 'whole', 'wholes')} and ${(n * a) % b} more, so the total is between ${Math.floor((n * a) / b)} and ${answer}.`; break;
        }
        prompt = `${each} ${n} ${who}s. How many ${unit}s in all?`;
        answer = f(n * a, b); denominator = b;
        hint = `${n} groups of ${a} ${unitWord(b)}. Multiply the numerator by ${n}. The part size stays ${unitWord(b)}.`;
        why = `${n} × ${a} = ${n * a}, so ${n} ${who}s get ${n * a} ${unitWord(b)}: ${answer}.`; break;
      }
      case 'two-step-convert': {
        // Change a mixed number of big units to small units, then take away or add.
        // Answers stay under 1000, so the tiles can build them (meters and centimeters, not liters and milliliters).
        const [w, a, b, big, per, n, take] = pick([
          [2, 1, 2, 'feet', 12, 8, true], [1, 1, 4, 'hours', 60, 20, true], [1, 1, 2, 'meters', 100, 40, true], [2, 1, 4, 'pounds', 16, 6, false],
          [1, 1, 3, 'feet', 12, 5, true], [2, 1, 2, 'hours', 60, 45, true], [2, 1, 4, 'meters', 100, 30, false], [1, 1, 2, 'pounds', 16, 10, true],
          [3, 1, 4, 'feet', 12, 9, false], [1, 3, 4, 'hours', 60, 25, false], [1, 3, 4, 'meters', 100, 60, true], [1, 3, 4, 'pounds', 16, 4, false],
          [1, 2, 3, 'feet', 12, 7, true], [2, 1, 3, 'hours', 60, 30, true], [3, 1, 2, 'meters', 100, 75, true], [3, 1, 2, 'pounds', 16, 9, true],
          [2, 3, 4, 'feet', 12, 10, false], [1, 1, 2, 'hours', 60, 35, true], [1, 1, 4, 'meters', 100, 50, false], [2, 3, 4, 'pounds', 16, 12, true],
          [1, 1, 6, 'feet', 12, 3, false], [2, 1, 4, 'hours', 60, 50, true], [2, 1, 2, 'meters', 100, 80, true], [1, 1, 4, 'pounds', 16, 7, false],
        ] as const);
        const small = ({ feet: 'inches', hours: 'minutes', meters: 'centimeters', pounds: 'ounces' } as const)[big];
        const total = w * per + (a * per) / b;
        prompt = big === 'feet' ? `A ribbon is ${w} ${a}/${b} feet long. Pip ${take ? 'cuts off' : 'adds'} ${n} inches. How many inches ${take ? 'are left' : 'long is it now'}?`
          : big === 'hours' ? `A race is ${w} ${a}/${b} hours long. The first part takes ${n} minutes. How many minutes are left?`
          : big === 'meters' ? `A rope is ${w} ${a}/${b} meters long. Pip ${take ? 'cuts off' : 'adds'} ${n} centimeters. How many centimeters ${take ? 'are left' : 'long is it now'}?`
          : `A bag holds ${w} ${a}/${b} pounds of sand. Pip ${take ? 'takes out' : 'adds'} ${n} ounces. How many ounces ${take ? 'are left' : 'are in the bag now'}?`;
        // "The first part takes 20 minutes" always takes away.
        answer = String(big === 'hours' || take ? total - n : total + n);
        picture = { kind: 'bars', bars: [...Array.from({ length: w }, () => ({ numerator: b, denominator: b })), { numerator: a, denominator: b }], hideLabels: true };
        hint = `Change ${w} ${a}/${b} ${big} to ${small} first: 1 ${big.replace(/s$/, '').replace('feet', 'foot')} is ${per} ${small}.`;
        why = `${w} ${a}/${b} ${big} is ${total} ${small}. ${total} ${big === 'hours' || take ? '−' : '+'} ${n} = ${answer}.`; break;
      }
      case 'plot-totals': {
        // Plot the amounts in eighths of a liter, then add every X, or find how much more one stack holds than another.
        const dataSets = [
          [1, 3, 3, 4, 4, 6], [2, 2, 5, 5, 5, 8], [1, 1, 2, 6, 6], [3, 3, 3, 5, 7], [2, 4, 4, 4, 6], [1, 2, 2, 7, 7, 7],
          [1, 5, 5, 6], [2, 3, 3, 3, 8], [4, 4, 6, 6, 6, 7], [1, 1, 1, 4, 5], [3, 5, 5, 6, 6], [2, 2, 4, 7, 7, 8],
        ];
        const values = dataSets[tr % dataSets.length];
        const context = ['beakers', 'cups', 'jars', 'bottles', 'flasks', 'glasses', 'mugs', 'vases', 'tubs', 'pails', 'bowls', 'cans'][i];
        linePlotTask = { denominator: 8, wholes: 1, values };
        const list = `${values.map((value) => f(value, 8)).join(', ')} liter`;
        const count = (v: number) => values.filter((value) => value === v).length;
        const tall = [...new Set(values)].sort((x, y) => count(y) - count(x) || y - x)[0];
        const low = Math.min(...values);
        if (i % 2 === 1 && tall !== low && count(tall) * tall > count(low) * low) {
          prompt = `Plot these ${context} in eighths of a liter: ${list}. How much more do all the ${f(tall, 8)} ${context} hold together than all the ${f(low, 8)} ${context} together?`;
          answer = f(count(tall) * tall - count(low) * low, 8); denominator = 8;
          hint = `Add up each stack first: ${count(tall)} × ${f(tall, 8)} and ${count(low)} × ${f(low, 8)}. Then take away.`;
          why = `The ${f(tall, 8)} stack holds ${f(count(tall) * tall, 8)} and the ${f(low, 8)} stack holds ${f(count(low) * low, 8)}. ${f(count(tall) * tall, 8)} − ${f(count(low) * low, 8)} = ${answer}.`; break;
        }
        prompt = `Plot these ${context} in eighths of a liter: ${list}. How much water in all?`;
        answer = f(values.reduce((sum, v) => sum + v, 0), 8); denominator = 8;
        hint = 'Add the eighths for every X. Two Xs at one spot count twice.';
        { const sum = values.reduce((total, v) => total + v, 0); why = `${values.join(' + ')} = ${sum} eighths, so they hold ${answer} ${sum > 8 ? 'liters' : 'liter'} in all.`; } break;
      }
      case 'story': {
        const [bottom, a, b] = ([[4, 1, 1], [5, 2, 1], [6, 3, 1], [8, 4, 2], [10, 5, 1], [5, 1, 2], [6, 1, 2], [8, 3, 2], [10, 2, 3], [4, 1, 2], [6, 2, 3], [12, 3, 2]] as const)[tr];
        // Three story shapes, so the child plans the steps instead of following one pattern: add then take from a whole,
        // take away then add, and add then compare. (Rows 1, 4, 7 and 10 are the lesson's questions: one of each, and
        // row 10, the checkpoint, stays a garden.)
        const shape = ({ 1: 1, 4: 2, 7: 0, 10: 0 } as Record<number, number>)[i] ?? (i % 3 === 2 ? (i % 2 ? 1 : 2) : 0);
        if (shape === 1) {
          const start = bottom - 1;
          prompt = `A jug has ${f(start, bottom)} liter. Sam drinks ${f(a, bottom)} liter, then adds ${f(b, bottom)} liter. How much is in the jug now?`;
          answer = f(start - a + b, bottom); hint = `First take away what Sam drinks: ${start} − ${a}. Then add ${b}.`;
          why = `${f(start, bottom)} − ${f(a, bottom)} = ${f(start - a, bottom)}. Then ${f(start - a, bottom)} + ${f(b, bottom)} = ${f(start - a + b, bottom)}.`;
        } else if (shape === 2) {
          const ben = Math.max(1, a + b - 1 - (i % 2));
          prompt = `Ana ran ${f(a, bottom)} mile and then ${f(b, bottom)} mile. Ben ran ${f(ben, bottom)} mile. How much farther did Ana run?`;
          answer = f(a + b - ben, bottom); hint = `First add Ana’s two runs. Then compare with Ben: take his away.`;
          why = `${f(a, bottom)} + ${f(b, bottom)} = ${f(a + b, bottom)}. Then ${f(a + b, bottom)} − ${f(ben, bottom)} = ${f(a + b - ben, bottom)}.`;
        } else {
          prompt = i % 2
            ? `Mia reads ${f(a, bottom)} of a book on Monday and ${f(b, bottom)} on Tuesday. How much is left to read?`
            : `${f(a, bottom)} of a garden is planted. Then ${f(b, bottom)} more is planted. How much is still empty?`;
          answer = f(bottom - a - b, bottom); hint = `First add the two parts. Then take that away from ${bottom}/${bottom}.`;
          why = `${f(a, bottom)} + ${f(b, bottom)} = ${f(a + b, bottom)}. Then ${f(bottom, bottom)} − ${f(a + b, bottom)} = ${f(bottom - a - b, bottom)}.`;
        }
        break;
      }
    }
    if (modelRequired && !task && visual?.kind === 'bar') task = { kind: 'copy', n: visual.n };
    return {
      id: `w${i + 1}`, prompt, answer, hint, model: visual, form, denominator, modelRequired, task,
      ...(area ? { area } : {}), ...(areaTask ? { areaTask } : {}),
      ...(rulerTask ? { rulerTask } : {}), ...(linePlotTask ? { linePlotTask } : {}),
      ...(scaleTask ? { scaleTask } : {}), ...(why ? { why } : {}), ...(explain ? { explain } : {}), ...(picture ? { picture } : {}),
    };
  });
}

export function getReviewCheck(id: string, round: number): BuildCheck {
  return acceptAnyName(id, reviewCheckFor(id, round));
}
function reviewCheckFor(id: string, round: number): BuildCheck {
  if (EXTENSION_WORKSHEETS[id]) {
    // A later review is the lesson's own kind of build with new numbers; without one, it rotates through all three builds.
    const fresh = lessonBuildCheck(id, 40 + round, 'retention');
    if (fresh) return fresh;
    const builds = getBuildChecks(id);
    const check = builds[round % builds.length];
    return { ...check, id: 'retention', transfer: true,
      ...arrangeReasons(`${id}:review:${round % builds.length}`, idea(id, check.explanation, round), wrongReasons(id, round)) };
  }
  if (id === 'order-fractions') {
    // Grade 3 parts: sixths, eighths, then eighths again with other numerators.
    const [d, low, high] = ([[6, 2, 4], [8, 2, 4], [8, 3, 6]] as const)[round % 3];
    const reason = 'Same size parts. The most parts is the biggest.';
    return { id: 'retention', transfer: true, prompt: `Which is longest: ${low}/${d}, ${high}/${d} or ${low + 1}/${d}? Make it.`,
      target: model(high, d), ...arrangeReasons(`${id}:review:${round % 3}`, idea(id, reason, round), wrongReasons(id, round)), explanation: reason };
  }
  if (id.includes('equivalent')) {
    // Both denominators fit the grade (grade 3: 2/3 = 4/6, 3/4 = 6/8, 1/2 = 3/6).
    const [n, d, factor] = (lessonGrade(id) === 3 ? [[2, 3, 2], [3, 4, 2], [1, 2, 3]] : [[2, 3, 2], [3, 4, 3], [4, 5, 2]])[round % 3];
    // Grade 3 splits parts (3.NF.3); multiplying top and bottom is the grade 4 rule (4.NF.1).
    const reason = lessonGrade(id) === 3
      ? `Split every part into ${factor}. Now ${n * factor} of ${d * factor} parts are colored.`
      : `Split every part into ${factor}. Multiply the numerator and denominator by ${factor}.`;
    return { id: 'retention', transfer: true, prompt: `A ribbon is ${n}/${d} colored. Show it with a denominator of ${d * factor}.`,
      target: model(n * factor, d * factor), ...arrangeReasons(`${id}:review:${round % 3}`, idea(id, reason, round), wrongReasons(id, round)), explanation: reason };
  }
  if (id.startsWith('sets-')) {
    const d = [4, 5, 6][round % 3]; const n = id === 'sets-unit-fractions' ? 1 : 2; const total = d * 4;
    const reason = `Put ${total} in ${d} equal groups. Pick ${n}.`;
    return { id: 'retention', transfer: true, prompt: `Put ${total} shells in ${d} equal groups. Pick ${n} of the groups.`, target: model(n, d, 'set', total),
      ...arrangeReasons(`${id}:review:${round % 3}`, idea(id, reason, round), wrongReasons(id, round)), explanation: reason };
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
    const shown = execAll(p.prompt, /(\d+)\/(\d+)/g).map(m => Number(m[1]) / Number(m[2]));
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
    ...arrangeReasons(`${id}:review:${round % variants.length}`, idea(id, reason, round), wrongReasons(id, round)),
    explanation: reason };
}
