export type Rational = { n: number; d: number };
export type LearningModel = { kind: 'bar' | 'set' | 'line'; n: number; d: number; wholes: number; total?: number };
export type WorksheetProblem = {
  id: string; prompt: string; answer: string; hint: string; model?: LearningModel;
  form?: 'decimal' | 'mixed' | 'ordered' | 'symbol'; denominator?: number;
};
export type BuildCheck = {
  id: string; prompt: string; target: LearningModel; reasons: string[];
  correctReason: number; explanation: string; transfer: boolean;
};
export type ReasonFeedback = { message: string; correct: boolean };

/** Keep reasoning feedback separate from model errors so a correct explanation is not blamed for a bad build. */
export function getReasonFeedback(check: BuildCheck, selected: number | null, modelsCorrect: boolean): ReasonFeedback | null {
  if (selected === null) return { message: 'Reason: pick one.', correct: false };
  if (selected !== check.correctReason) return { message: `Reason: not quite. ${check.explanation}`, correct: false };
  if (!modelsCorrect) return { message: 'Reason: ✓ Your reason is right! Now fix the model.', correct: true };
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
export function answerMatches(problem: WorksheetProblem, raw: string): boolean {
  if (problem.form === 'symbol') return raw.trim() === problem.answer;
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

// Each skill has its own reasoning and model target; transfer uses new numbers.
const CHECKS: Record<string, [number, number, LearningModel['kind'], string, string, number?]> = {
  'equal-parts': [1, 3, 'bar', 'Cut a bar into 3 equal pieces. Shade 1.', 'All 3 pieces are the same size.'],
  'fraction-names': [3, 5, 'bar', 'Make 3/5.', 'Bottom: 5 equal pieces. Top: 3 are shaded.'],
  'unit-fractions': [1, 6, 'bar', 'Make 1/6. Just one piece!', 'A unit fraction is just 1 equal piece.'],
  'unit-size': [1, 4, 'bar', 'Which is bigger, 1/4 or 1/8? Make the bigger one.', 'Fewer pieces means bigger pieces.'],
  'sets-unit-fractions': [1, 3, 'set', 'Put 12 dots in 3 equal groups. Pick 1 group.', 'Make 3 equal groups. 1 group is 1/3.', 12],
  'sets-nonunit': [2, 3, 'set', 'Put 12 dots in 3 equal groups. Pick 2 groups.', 'Make 3 equal groups. 2 groups is 2/3.', 12],
  'benchmark-half': [3, 8, 'bar', 'Make a fraction 1/8 less than half.', 'Half of 8 is 4. One less is 3/8.'],
  'benchmarks-zero-one': [7, 8, 'bar', 'Make a fraction 1/8 less than 1 whole.', '8/8 is 1 whole. One less is 7/8.'],
  'fraction-magnitude': [5, 12, 'bar', 'Make a fraction 1/12 less than half.', 'Half of 12 is 6. One less is 5/12.'],
  'number-line-basics': [2, 5, 'line', 'Cut 0 to 1 into 5 equal spaces. Make 2 jumps.', 'Count the spaces, not the tick marks.'],
  'number-line-points': [4, 7, 'line', 'Mark 4/7 on the number line.', 'Bottom: 7 spaces in 1 whole. Top: 4 jumps.'],
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
  'add-like-denominators': [5, 8, 'bar', 'Make 2/8 + 3/8.', 'Add the pieces: 2 + 3 = 5. So 5/8.'],
  'subtract-like-denominators': [3, 7, 'bar', 'Make 5/7 − 2/7.', 'Take away 2 pieces: 5 − 2 = 3. So 3/7.'],
  'add-related-fractions': [5, 6, 'bar', 'Make 1/2 + 1/3 using sixths.', '1/2 = 3/6 and 1/3 = 2/6. 3 + 2 = 5, so 5/6.'],
  'tenths-decimals': [4, 10, 'bar', 'Make 0.4 as a fraction.', '0.4 means 4 tenths.'],
  'hundredths-decimals': [25, 100, 'bar', 'Make 0.25 as a fraction.', '0.25 means 25 hundredths.'],
};
export function getBuildChecks(id: string): BuildCheck[] {
  const seed = CHECKS[id]; if (!seed) throw new Error(`Missing learning checks: ${id}`);
  const [n, d, kind, prompt, explanation, total] = seed;
  const transfer = transferTarget(id, n, d, kind);
  return [
    { id: 'build', prompt, target: model(n, d, kind, total), explanation, transfer: false,
      correctReason: 1, reasons: ['Bigger numbers always mean a bigger fraction.', explanation, 'Only the shaded pieces need to be equal.'] },
    { id: 'transfer', prompt: transfer.prompt, target: transfer.target, explanation: transfer.reason, transfer: true,
      correctReason: 2, reasons: ['Change only the bottom number. The amount stays the same.', 'Count the tick marks, not the spaces.', transfer.reason] },
  ];
}
function transferTarget(id: string, n: number, d: number, kind: LearningModel['kind']) {
  if (id.startsWith('sets-')) return { prompt: 'Put 20 beads in 5 equal groups. Pick 3 groups.', target: model(3, 5, 'set', 20), reason: '20 in 5 groups is 4 each. 3 groups is 3/5.' };
  if (id.includes('equivalent')) return { prompt: 'A ribbon is 3/5 colored. Show it in tenths.', target: model(6, 10), reason: '1 fifth is 2 tenths. So 3/5 = 6/10.' };
  if (id === 'add-related-fractions') return { prompt: 'Make 1/4 + 1/2 using fourths.', target: model(3, 4), reason: '1/2 = 2/4. 1 + 2 = 3, so 3/4.' };
  if (id === 'tenths-decimals' || id === 'hundredths-decimals') return { prompt: 'Show 0.7 using tenths.', target: model(7, 10), reason: '0.7 means 7 tenths.' };
  if (id === 'compose-to-one') return { prompt: 'A recipe uses 2/5 of a bag. Make what is left.', target: model(3, 5), reason: '5/5 is a full bag. 5 − 2 = 3, so 3/5.' };
  if (id === 'subtract-like-denominators') return { prompt: 'A ribbon is 7/10 long. Cut off 3/10. Make what is left.', target: model(4, 10), reason: '7 − 3 = 4, so 4/10.' };
  if (id === 'add-like-denominators') return { prompt: 'Make 1/5 + 2/5.', target: model(3, 5), reason: '1 + 2 = 3, so 3/5.' };
  if (id === 'unit-size' || id === 'compare-same-numerator') return { prompt: 'Which is bigger, 1/3 or 1/6? Make it.', target: model(1, 3), reason: 'Fewer pieces means bigger pieces.' };
  if (id === 'benchmark-half' || id === 'fraction-magnitude') return { prompt: 'Use tenths. Make 1/10 less than half.', target: model(4, 10), reason: 'Half is 5/10. One less is 4/10.' };
  if (id === 'benchmarks-zero-one') return { prompt: 'A jug is 1/6 away from full. Make it.', target: model(5, 6), reason: '6/6 is full. One less is 5/6.' };
  if (id === 'compare-same-denominator' || id === 'order-fractions') return { prompt: 'Which is longer, 2/5 or 4/5 of a meter? Make it.', target: model(4, 5), reason: 'Same size pieces. 4 is more than 2.' };
  const nextD = d === 5 ? 4 : 5; const nextN = n > d ? nextD + 2 : id === 'unit-fractions' || id === 'equal-parts' ? 1 : 3;
  return { prompt: kind === 'line' ? `Mark ${f(nextN, nextD)} on the number line.` : `A ribbon is ${f(nextN, nextD)} of a meter. Make ${f(nextN, nextD)}.`, target: model(nextN, nextD, kind),
    reason: `1 whole is ${nextD} equal parts. Count ${nextN} of them.` };
}

/** Skill-specific authored templates and varied numbers, not recycled answer choices. */
export function getWorksheet(id: string): WorksheetProblem[] {
  if (!CHECKS[id]) throw new Error(`Missing worksheet: ${id}`);
  return Array.from({ length: 12 }, (_, i) => {
    const d = [3, 4, 5, 6, 8, 10, 7, 9, 12, 4, 6, 8][i]; const n = 1 + i % (d - 1);
    const value = f(n, d);
    let prompt = ''; let answer = value; let hint = 'Top: the parts you count. Bottom: equal parts in 1 whole.';
    let visual: LearningModel | undefined; let form: WorksheetProblem['form']; let denominator: number | undefined;
    const context = ['ribbon', 'garden bed', 'paper strip', 'tile row'][i % 4];
    switch (id) {
      case 'equal-parts':
      case 'unit-fractions':
        prompt = i % 3 === 0 ? `A ${context} is split into ${d} equal shares. Name one share as a fraction.` :
          i % 3 === 1 ? `Each equal share is 1/${d} of a whole. How many shares make the whole?` :
          `One whole needs ${d} equal jumps from 0 to 1. Enter the fraction for one jump.`;
        answer = i % 3 === 1 ? String(d) : f(1, d); hint = 'The bottom number is how many equal parts. One part has 1 on top.'; break;
      case 'fraction-names':
        prompt = i % 3 === 0 ? `In ${value}, how many pieces are counted? Enter a whole number.` :
          i % 3 === 1 ? `In ${value}, how many equal pieces form one whole? Enter a whole number.` :
          `Name the shaded fraction of this ${context}.`;
        answer = i % 3 === 0 ? String(n) : i % 3 === 1 ? String(d) : value;
        if (i % 3 === 2) visual = model(n, d); break;
      case 'unit-size':
      case 'compare-same-numerator': {
        const top = id === 'unit-size' ? 1 : Math.min(2, d - 1);
        prompt = `The wholes match. Enter the ${i % 2 ? 'smaller' : 'larger'} fraction: ${f(top, d)} or ${f(top, d + 2)}.`;
        answer = f(top, i % 2 ? d + 2 : d); hint = 'More pieces in the same whole means smaller pieces.';
        if (i < 4) visual = model(top, d); break;
      }
      case 'sets-unit-fractions':
      case 'sets-nonunit': {
        const count = id === 'sets-unit-fractions' ? 1 : Math.min(2 + i % 2, d - 1); const total = d * (2 + i % 3);
        prompt = i % 3 === 1 ? `${total} beads are shared into ${d} equal groups. How many beads are in one group?` :
          `A box has ${total} buttons. How many buttons are ${f(count, d)} of the collection?`;
        answer = String(total / d * (i % 3 === 1 ? 1 : count)); hint = `Split ${total} into ${d} equal groups first.`;
        if (i % 3 === 2) visual = model(count, d, 'set', total); break;
      }
      case 'benchmark-half':
      case 'fraction-magnitude': {
        const even = 4 + 2 * (i % 5); const top = even / 2 + (i % 2 ? 1 : -1);
        prompt = i % 3 === 0 ? `Enter the fraction one ${f(1, even)} below half.` :
          i % 3 === 1 ? `Type <, = or >: ${f(top, even)} __ 1/2.` : `How much is missing from ${f(even / 2 - 1, even)} to reach half?`;
        answer = i % 3 === 0 ? f(even / 2 - 1, even) : i % 3 === 1 ? (top > even / 2 ? '>' : '<') : f(1, even);
        form = i % 3 === 1 ? 'symbol' : undefined; hint = 'Half is half of the bottom number of pieces.';
        if (i < 4) visual = model(top, even); break;
      }
      case 'benchmarks-zero-one':
        prompt = i % 3 === 0 ? `How much is missing from ${f(d - 1, d)} to make one whole?` :
          i % 3 === 1 ? `Enter the closest benchmark (0, 1/2 or 1) for ${f(1, d + 3)}.` :
          `Enter the closest benchmark (0, 1/2 or 1) for ${f(d + 2, d + 3)}.`;
        answer = i % 3 === 0 ? f(1, d) : i % 3 === 1 ? '0' : '1'; hint = 'Compare it to 0, 1/2 and 1. Pick the closest.'; break;
      case 'number-line-basics':
      case 'number-line-points':
      case 'number-line-beyond-one': {
        const top = id === 'number-line-beyond-one' ? d + n : n;
        prompt = i % 3 === 0 && id === 'number-line-basics' ? `How many equal spaces make ${unitName(d)} between 0 and 1?` :
          i % 3 === 1 ? `A walk takes ${top} ${top === 1 ? 'jump' : 'jumps'}, each 1/${d} meter. Enter the total distance.` : `This line uses ${d} equal spaces per whole. Name the marked point as a fraction of one whole.`;
        answer = i % 3 === 0 && id === 'number-line-basics' ? String(d) : f(top, d);
        if (!(i % 3 === 0 && id === 'number-line-basics') && i % 3 !== 1) visual = model(top, d, 'line');
        hint = 'Bottom: spaces in 1 whole. Top: jumps from 0.'; break;
      }
      case 'compare-same-denominator':
        prompt = i % 2 ? `Type <, = or >: ${f(n, d)} __ ${f(n + 1, d)}.` : `Which covers more of a matching whole: ${f(n, d)} or ${f(n + 1, d)}? Enter that fraction.`;
        answer = i % 2 ? '<' : f(n + 1, d); form = i % 2 ? 'symbol' : undefined; hint = 'Same bottom number means same size pieces. Compare the tops.'; break;
      case 'order-fractions':
        prompt = `Order ${f(3, d)}, ${f(1, d)}, ${f(2, d)} from ${i % 2 ? 'greatest to least' : 'least to greatest'}. Separate answers with commas.`;
        answer = (i % 2 ? [3, 2, 1] : [1, 2, 3]).map(top => f(top, d)).join(', '); form = 'ordered'; hint = 'Same size pieces. Compare the top numbers.'; break;
      case 'equivalent-models':
      case 'build-equivalents':
      case 'missing-equivalent': {
        const factor = 2 + i % 3;
        prompt = i % 3 === 0 ? `Fill the missing numerator: ${value} = ?/${d * factor}.` :
          i % 3 === 1 ? `Rename ${value} using denominator ${d * factor}. Enter a fraction.` :
          `This model shows ${value}. Every piece is split into ${factor} equal pieces. Enter the new fraction with denominator ${d * factor}.`;
        answer = i % 3 === 0 ? String(n * factor) : f(n * factor, d * factor);
        denominator = i % 3 === 0 ? undefined : d * factor;
        if (i % 3 === 2) visual = model(n, d);
        hint = `Multiply the top and bottom by ${factor}.`; break;
      }
      case 'compose-to-one':
        prompt = i % 2 ? `A ${context} uses ${value} of a whole. What fraction remains?` : `Complete ${value} + ? = 1.`;
        answer = f(d - n, d); hint = `1 whole is ${d}/${d}. Count the pieces left.`; break;
      case 'decompose-fractions':
        prompt = i % 3 === 0 ? `How many copies of 1/${d} make ${value}?` :
          i % 3 === 1 ? `Complete 1/${d} + ? = ${value}.` : `${n} jumps of size 1/${d} make what fraction?`;
        answer = i % 3 === 0 ? String(n) : i % 3 === 1 ? f(n - 1, d) : value; hint = 'Count how many small pieces make it.'; break;
      case 'improper-fractions':
      case 'mixed-improper':
        prompt = i % 2 ? `Write ${f(d + n, d)} as a mixed number (for example, 1 2/3).` :
          `Write 1 ${value} as a single fraction.`;
        answer = i % 2 ? `1 ${value}` : f(d + n, d); form = i % 2 ? 'mixed' : undefined;
        hint = `${d} pieces make 1 whole. Count what is left over.`; if (i < 4) visual = model(d + n, d); break;
      case 'add-like-denominators':
      case 'subtract-like-denominators': {
        const add = id.startsWith('add'); const a = add ? n : n + 1; const b = 1;
        prompt = i % 3 === 2 ? `A ${context} has ${f(a, d)} of a meter. ${add ? 'Join' : 'Remove'} another ${f(b, d)} meter. Enter the ${add ? 'total' : 'remainder'}.` :
          `Calculate ${f(a, d)} ${add ? '+' : '−'} ${f(b, d)}.`;
        answer = f(add ? a + b : a - b, d); hint = 'Same size pieces. Add or take away the tops. The bottom stays.';
        if (i % 3 === 1) visual = model(a, d); break;
      }
      case 'add-related-fractions': {
        const small = [2, 3, 4][i % 3]; const large = small * (2 + Math.floor(i / 3));
        prompt = `A recipe uses 1/${small} cup and another 1/${large} cup. Enter the total.`;
        answer = f(large / small + 1, large); hint = `Change both to ${unitName(large)} first.`; break;
      }
      case 'tenths-decimals':
      case 'hundredths-decimals': {
        const base = id.startsWith('tenths') ? 10 : 100; const top = id.startsWith('tenths') ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 6, 8][i] : [8, 12, 25, 40, 63, 75, 9, 30, 50, 81, 90, 99][i];
        const dec = (top / base).toFixed(base === 10 ? 1 : 2);
        prompt = i % 3 === 0 ? `Write ${f(top, base)} as a decimal.` : i % 3 === 1 ? `Write ${dec} as a fraction.` :
          `A meter strip has ${top} of ${base} equal parts colored. Enter the colored length as a decimal.`;
        answer = i % 3 === 1 ? f(top, base) : dec; form = i % 3 === 1 ? undefined : 'decimal';
        hint = base === 10 ? 'One decimal place means tenths.' : 'Two decimal places means hundredths, like 0.08.';
        if (i % 3 === 2) visual = model(top, base); break;
      }
      default: throw new Error(`No authored worksheet for ${id}`);
    }
    return { id: `w${i + 1}`, prompt, answer, hint, model: visual, form, denominator };
  });
}

export function getReviewCheck(id: string, round: number): BuildCheck {
  if (id === 'order-fractions') {
    const d = [6, 8, 10][round % 3];
    const reason = 'Same size pieces. The most pieces is the biggest.';
    return { id: 'retention', transfer: true, prompt: `Which is longest: 2/${d}, 4/${d} or 3/${d}? Make it.`,
      target: model(4, d), reasons: ['The smallest top number is the biggest.', reason, 'Shade the bottom number of pieces.'],
      correctReason: 1, explanation: reason };
  }
  if (id.includes('equivalent')) {
    const d = [3, 4, 5][round % 3]; const n = d - 1; const factor = 2 + round % 2;
    const reason = `Split every piece into ${factor}. Multiply the top and bottom by ${factor}.`;
    return { id: 'retention', transfer: true, prompt: `A ribbon is ${n}/${d} colored. Show it with ${d * factor} on the bottom.`,
      target: model(n * factor, d * factor), reasons: ['Change only the bottom number.', reason, 'A bigger bottom number always means more.'],
      correctReason: 1, explanation: reason };
  }
  if (id.startsWith('sets-')) {
    const d = [4, 5, 6][round % 3]; const n = id === 'sets-unit-fractions' ? 1 : 2; const total = d * 5;
    const reason = `Put ${total} in ${d} equal groups. Pick ${n}.`;
    return { id: 'retention', transfer: true, prompt: `Put ${total} shells in ${d} equal groups. Pick ${n}/${d}.`, target: model(n, d, 'set', total),
      reasons: [reason, 'The top number is how many groups to make.', 'Pick the bottom number of shells.'], correctReason: 0, explanation: reason };
  }
  const variants = getWorksheet(id).filter(p => {
    const value = parseAnswer(p.answer);
    return value && value.d > 1 && value.n > 0 && value.n <= value.d * 3 && !p.denominator && p.form !== 'ordered';
  });
  const problem = variants[round % variants.length];
  if (!problem) throw new Error(`No numeric review variant for ${id}`);
  const value = parseAnswer(problem.answer)!;
  const reason = problem.hint;
  return { id: 'retention', transfer: true, prompt: `${problem.prompt} Show your answer two ways.`,
    target: model(value.n, value.d, id.startsWith('number-line') ? 'line' : 'bar'),
    reasons: ['Count the tick marks, not the spaces.', reason, 'Only the shaded parts need to be equal.'],
    correctReason: 1, explanation: reason };
}
