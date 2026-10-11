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
const model = (n: number, d: number, kind: LearningModel['kind'] = 'bar', total?: number): LearningModel =>
  ({ n, d, kind, total, wholes: Math.max(1, Math.ceil(n / d)) });
const f = (n: number, d: number) => `${n}/${d}`;

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
  'equal-parts': [1, 3, 'bar', 'Partition a whole into thirds and shade one third.', 'Every piece must be the same size; three equal pieces make the whole.'],
  'fraction-names': [3, 5, 'bar', 'Build three fifths. Tell what each number counts.', 'The denominator counts all equal pieces; the numerator counts selected pieces.'],
  'unit-fractions': [1, 6, 'bar', 'Make one sixth, not six wholes.', 'A unit fraction selects exactly one equal piece.'],
  'unit-size': [1, 4, 'bar', 'Build the larger unit fraction: 1/4 or 1/8. The wholes match.', 'Fewer equal pieces in the same whole make each piece larger.'],
  'sets-unit-fractions': [1, 3, 'set', 'Group 12 objects equally and select one third.', 'Share the total into denominator-many equal groups, then select one group.', 12],
  'sets-nonunit': [2, 3, 'set', 'Group 12 objects equally and select two thirds.', 'Find one equal group first, then count numerator-many groups.', 12],
  'benchmark-half': [3, 8, 'bar', 'Build a fraction one eighth below half.', 'Half of eight pieces is four; three eighths is one piece below halfway.'],
  'benchmarks-zero-one': [7, 8, 'bar', 'Build an amount one eighth short of a whole.', 'Eight eighths make one; seven eighths leaves one piece missing.'],
  'fraction-magnitude': [5, 12, 'bar', 'Build an amount one twelfth below half.', 'Half of twelve pieces is six; five twelfths is one piece below halfway.'],
  'number-line-basics': [2, 5, 'line', 'Split each whole into fifths and mark two jumps from zero.', 'Count equal spaces, not tick marks; each whole has five equal spaces.'],
  'number-line-points': [4, 7, 'line', 'Mark four seventh-size jumps from zero.', 'The numerator counts jumps from zero; the denominator counts spaces in one whole.'],
  'number-line-beyond-one': [7, 5, 'line', 'Mark one whole and two fifths.', 'Five fifths make one whole; two more fifths make seven fifths.'],
  'compare-same-denominator': [5, 8, 'bar', 'Build the larger amount: 3/8 or 5/8.', 'With matching piece sizes, more pieces give a greater amount.'],
  'compare-same-numerator': [3, 5, 'bar', 'Build the larger amount: 3/5 or 3/8. The wholes match.', 'Both count three pieces, but fifth-size pieces are larger than eighth-size pieces.'],
  'order-fractions': [3, 4, 'bar', 'Build the greatest of 1/4, 1/2 and 3/4.', 'One quarter is below half; three quarters is above half.'],
  'equivalent-models': [2, 4, 'bar', 'Rename one half using fourths. Split every part, including the unshaded part.', 'Splitting both halves into two equal pieces preserves the amount: 1/2 = 2/4.'],
  'build-equivalents': [4, 6, 'bar', 'Rename two thirds using sixths.', 'Multiply both numerator and denominator by two; the amount does not change.'],
  'missing-equivalent': [6, 8, 'bar', 'Fill 3/4 = ?/8 by building the equivalent amount.', 'Each fourth becomes two eighths, so three fourths becomes six eighths.'],
  'compose-to-one': [5, 8, 'bar', 'Three eighths is already used. Build the amount needed to make one.', 'Eight eighths make one; subtract the three already used to find five eighths.'],
  'decompose-fractions': [4, 6, 'bar', 'Build 4/6 as four unit-fraction pieces.', 'Four copies of one sixth compose four sixths.'],
  'improper-fractions': [7, 4, 'bar', 'Build seven fourths, using matching wholes.', 'Four fourths make one whole, with three fourths left over.'],
  'mixed-improper': [8, 5, 'bar', 'Build 1 and 3/5 as fifth-size pieces.', 'One whole has five fifths; three more fifths makes eight fifths.'],
  'add-like-denominators': [5, 8, 'bar', 'Build the result of 2/8 + 3/8.', 'Add piece counts, not piece sizes; two eighths plus three eighths is five eighths.'],
  'subtract-like-denominators': [3, 7, 'bar', 'Build what remains after 5/7 − 2/7.', 'Remove two of the five seventh-size pieces; three sevenths remain.'],
  'add-related-fractions': [5, 6, 'bar', 'Build 1/2 + 1/3 using sixth-size pieces.', 'Rename half as three sixths and one third as two sixths before combining.'],
  'tenths-decimals': [4, 10, 'bar', 'Build the fraction named by 0.4.', 'The first decimal place counts tenths; 0.4 means four tenths.'],
  'hundredths-decimals': [25, 100, 'bar', 'Build the fraction named by 0.25.', 'Two decimal places count hundredths; 0.25 means twenty-five hundredths.'],
};
export function getBuildChecks(id: string): BuildCheck[] {
  const seed = CHECKS[id]; if (!seed) throw new Error(`Missing learning checks: ${id}`);
  const [n, d, kind, prompt, explanation, total] = seed;
  const transfer = transferTarget(id, n, d, kind);
  return [
    { id: 'build', prompt, target: model(n, d, kind, total), explanation, transfer: false,
      correctReason: 1, reasons: ['The digits alone tell the size, regardless of the whole.', explanation, 'Only the shaded pieces need equal sizes.'] },
    { id: 'transfer', prompt: transfer.prompt, target: transfer.target, explanation: transfer.reason, transfer: true,
      correctReason: 2, reasons: ['Changing only the denominator keeps the amount unchanged.', 'Count tick marks instead of equal spaces.', transfer.reason] },
  ];
}
function transferTarget(id: string, n: number, d: number, kind: LearningModel['kind']) {
  if (id.startsWith('sets-')) return { prompt: 'A new collection has 20 beads. Group them and select 3/5 of the collection.', target: model(3, 5, 'set', 20), reason: 'Twenty shared into five equal groups is four each; three groups contain twelve beads.' };
  if (id.includes('equivalent')) return { prompt: 'A ribbon is 3/5 colored. Rename that amount using tenths.', target: model(6, 10), reason: 'Every fifth is split into two tenths, including the uncolored fifths; three fifths becomes six tenths.' };
  if (id === 'add-related-fractions') return { prompt: 'Combine 1/4 of a ribbon with another 1/2. Build the total using fourths.', target: model(3, 4), reason: 'One half is two fourths; one fourth plus two fourths makes three fourths.' };
  if (id === 'tenths-decimals' || id === 'hundredths-decimals') return { prompt: 'A new whole has 0.7 colored. Show it using tenths.', target: model(7, 10), reason: 'Seven tenths and seventy hundredths name the same amount, 0.7.' };
  if (id === 'compose-to-one') return { prompt: 'A recipe uses 2/5 of a bag. Build the fraction remaining in a full bag.', target: model(3, 5), reason: 'Five fifths make a full bag; removing two fifths leaves three fifths.' };
  if (id === 'subtract-like-denominators') return { prompt: 'A ribbon has 7/10 remaining; 3/10 is cut off. Build the remainder.', target: model(4, 10), reason: 'Subtract the counts of tenth-size pieces: seven minus three is four.' };
  if (id === 'add-like-denominators') return { prompt: 'Join 1/5 of a ribbon to 2/5 of another same-size ribbon. Build the total.', target: model(3, 5), reason: 'The fifth-size pieces match; one plus two gives three fifths.' };
  if (id === 'unit-size' || id === 'compare-same-numerator') return { prompt: 'Same-size pizzas: which covers more, 1/3 or 1/6? Build the larger amount.', target: model(1, 3), reason: 'A third is a larger piece than a sixth because fewer pieces share the same whole.' };
  if (id === 'benchmark-half' || id === 'fraction-magnitude') return { prompt: 'A new bar is divided into tenths. Build one tenth less than halfway.', target: model(4, 10), reason: 'Halfway is five tenths; one tenth less is four tenths.' };
  if (id === 'benchmarks-zero-one') return { prompt: 'Build a jug one sixth short of being full.', target: model(5, 6), reason: 'A full jug is six sixths; one piece missing leaves five sixths.' };
  if (id === 'compare-same-denominator' || id === 'order-fractions') return { prompt: 'Build the larger distance: 2/5 or 4/5 of a meter.', target: model(4, 5), reason: 'Four equal fifth-size pieces cover more distance than two of the same pieces.' };
  const nextD = d === 5 ? 4 : 5; const nextN = n > d ? nextD + 2 : id === 'unit-fractions' || id === 'equal-parts' ? 1 : 3;
  return { prompt: `New context: a ribbon measures ${f(nextN, nextD)} of a meter. Build that distance using equal ${nextD}-part wholes.`, target: model(nextN, nextD, kind),
    reason: `Each whole has ${nextD} equal parts; count ${nextN} of those parts without changing the whole's size.` };
}

/** Skill-specific authored templates and varied numbers, not recycled answer choices. */
export function getWorksheet(id: string): WorksheetProblem[] {
  if (!CHECKS[id]) throw new Error(`Missing worksheet: ${id}`);
  return Array.from({ length: 12 }, (_, i) => {
    const d = [3, 4, 5, 6, 8, 10, 7, 9, 12, 4, 6, 8][i]; const n = 1 + i % (d - 1);
    const value = f(n, d);
    let prompt = ''; let answer = value; let hint = 'Count selected parts on top and all equal parts in one whole on the bottom.';
    let visual: LearningModel | undefined; let form: WorksheetProblem['form']; let denominator: number | undefined;
    const context = ['ribbon', 'garden bed', 'paper strip', 'tile row'][i % 4];
    switch (id) {
      case 'equal-parts':
      case 'unit-fractions':
        prompt = i % 3 === 0 ? `A ${context} is split into ${d} equal shares. Name one share as a fraction.` :
          i % 3 === 1 ? `Each equal share is 1/${d} of a whole. How many shares make the whole?` :
          `One whole needs ${d} equal jumps from 0 to 1. Enter the fraction for one jump.`;
        answer = i % 3 === 1 ? String(d) : f(1, d); hint = 'The denominator counts equal shares; a single share has numerator one.'; break;
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
        answer = f(top, i % 2 ? d + 2 : d); hint = 'For the same piece count, more equal parts per whole means smaller pieces.';
        if (i < 4) visual = model(top, d); break;
      }
      case 'sets-unit-fractions':
      case 'sets-nonunit': {
        const count = id === 'sets-unit-fractions' ? 1 : Math.min(2 + i % 2, d - 1); const total = d * (2 + i % 3);
        prompt = i % 3 === 1 ? `${total} beads are shared into ${d} equal groups. How many beads are in one group?` :
          `A box has ${total} buttons. How many buttons are ${f(count, d)} of the collection?`;
        answer = String(total / d * (i % 3 === 1 ? 1 : count)); hint = `Share ${total} into ${d} equal groups first, then count the requested groups.`;
        if (i % 3 === 2) visual = model(count, d, 'set', total); break;
      }
      case 'benchmark-half':
      case 'fraction-magnitude': {
        const even = 4 + 2 * (i % 5); const top = even / 2 + (i % 2 ? 1 : -1);
        prompt = i % 3 === 0 ? `Enter the fraction one ${f(1, even)} below half.` :
          i % 3 === 1 ? `Type <, = or >: ${f(top, even)} __ 1/2.` : `How much is missing from ${f(even / 2 - 1, even)} to reach half?`;
        answer = i % 3 === 0 ? f(even / 2 - 1, even) : i % 3 === 1 ? (top > even / 2 ? '>' : '<') : f(1, even);
        form = i % 3 === 1 ? 'symbol' : undefined; hint = 'Half means half of the denominator-many pieces, not half of the numerator.';
        if (i < 4) visual = model(top, even); break;
      }
      case 'benchmarks-zero-one':
        prompt = i % 3 === 0 ? `How much is missing from ${f(d - 1, d)} to make one whole?` :
          i % 3 === 1 ? `Enter the closest benchmark (0, 1/2 or 1) for ${f(1, d + 3)}.` :
          `Enter the closest benchmark (0, 1/2 or 1) for ${f(d + 2, d + 3)}.`;
        answer = i % 3 === 0 ? f(1, d) : i % 3 === 1 ? '0' : '1'; hint = 'Compare distances to zero, halfway and a full whole.'; break;
      case 'number-line-basics':
      case 'number-line-points':
      case 'number-line-beyond-one': {
        const top = id === 'number-line-beyond-one' ? d + n : n;
        prompt = i % 3 === 0 && id === 'number-line-basics' ? `How many equal spaces make ${d}ths between 0 and 1?` :
          i % 3 === 1 ? `A walk takes ${top} jumps, each 1/${d} meter. Enter the total distance.` : `This line uses ${d} equal spaces per whole. Name the marked point as a fraction of one whole.`;
        answer = i % 3 === 0 && id === 'number-line-basics' ? String(d) : f(top, d);
        if (!(i % 3 === 0 && id === 'number-line-basics') && i % 3 !== 1) visual = model(top, d, 'line');
        hint = 'Count equal spaces in each whole for the denominator, then jumps from zero for the numerator.'; break;
      }
      case 'compare-same-denominator':
        prompt = i % 2 ? `Type <, = or >: ${f(n, d)} __ ${f(n + 1, d)}.` : `Which covers more of a matching whole: ${f(n, d)} or ${f(n + 1, d)}? Enter that fraction.`;
        answer = i % 2 ? '<' : f(n + 1, d); form = i % 2 ? 'symbol' : undefined; hint = 'Matching denominators mean matching piece sizes; compare the counts.'; break;
      case 'order-fractions':
        prompt = `Order ${f(3, d)}, ${f(1, d)}, ${f(2, d)} from ${i % 2 ? 'greatest to least' : 'least to greatest'}. Separate answers with commas.`;
        answer = (i % 2 ? [3, 2, 1] : [1, 2, 3]).map(top => f(top, d)).join(', '); form = 'ordered'; hint = 'The pieces match in size. Order their counts in the requested direction.'; break;
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
        hint = `Both counts must change by the same factor (${factor}), including unshaded pieces.`; break;
      }
      case 'compose-to-one':
        prompt = i % 2 ? `A ${context} uses ${value} of a whole. What fraction remains?` : `Complete ${value} + ? = 1.`;
        answer = f(d - n, d); hint = `One whole is ${d}/${d}; find the remaining ${d}-size pieces.`; break;
      case 'decompose-fractions':
        prompt = i % 3 === 0 ? `How many copies of 1/${d} make ${value}?` :
          i % 3 === 1 ? `Complete 1/${d} + ? = ${value}.` : `${n} jumps of size 1/${d} make what fraction?`;
        answer = i % 3 === 0 ? String(n) : i % 3 === 1 ? f(n - 1, d) : value; hint = 'Keep the unit-piece size fixed and count how many pieces compose the amount.'; break;
      case 'improper-fractions':
      case 'mixed-improper':
        prompt = i % 2 ? `Write ${f(d + n, d)} as a mixed number (for example, 1 2/3).` :
          `Write 1 ${value} as a single fraction.`;
        answer = i % 2 ? `1 ${value}` : f(d + n, d); form = i % 2 ? 'mixed' : undefined;
        hint = `One whole contains ${d} of these pieces; regroup the whole and remaining pieces.`; if (i < 4) visual = model(d + n, d); break;
      case 'add-like-denominators':
      case 'subtract-like-denominators': {
        const add = id.startsWith('add'); const a = add ? n : n + 1; const b = 1;
        prompt = i % 3 === 2 ? `A ${context} has ${f(a, d)} of a meter. ${add ? 'Join' : 'Remove'} another ${f(b, d)} meter. Enter the ${add ? 'total' : 'remainder'}.` :
          `Calculate ${f(a, d)} ${add ? '+' : '−'} ${f(b, d)}.`;
        answer = f(add ? a + b : a - b, d); hint = 'The piece sizes match; change the piece count, not the denominator.';
        if (i % 3 === 1) visual = model(a, d); break;
      }
      case 'add-related-fractions': {
        const small = [2, 3, 4][i % 3]; const large = small * (2 + Math.floor(i / 3));
        prompt = `A recipe uses 1/${small} cup and another 1/${large} cup. Enter the total.`;
        answer = f(large / small + 1, large); hint = `Rename both amounts using ${large}ths before combining counts.`; break;
      }
      case 'tenths-decimals':
      case 'hundredths-decimals': {
        const base = id.startsWith('tenths') ? 10 : 100; const top = id.startsWith('tenths') ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 3, 6, 8][i] : [8, 12, 25, 40, 63, 75, 9, 30, 50, 81, 90, 99][i];
        const dec = (top / base).toFixed(base === 10 ? 1 : 2);
        prompt = i % 3 === 0 ? `Write ${f(top, base)} as a decimal.` : i % 3 === 1 ? `Write ${dec} as a fraction.` :
          `A meter strip has ${top} of ${base} equal parts colored. Enter the colored length as a decimal.`;
        answer = i % 3 === 1 ? f(top, base) : dec; form = i % 3 === 1 ? undefined : 'decimal';
        hint = base === 10 ? 'One decimal place counts tenths.' : 'Two decimal places count hundredths; keep leading zeros, such as 0.08.';
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
    const reason = 'The pieces have the same size; compare the number of pieces to find the greatest amount.';
    return { id: 'retention', transfer: true, prompt: `A new trail has distances 2/${d}, 4/${d} and 3/${d}. Build the greatest distance.`,
      target: model(4, d), reasons: ['The smallest numerator always gives the greatest fraction.', reason, 'Use the denominator as the count of shaded pieces.'],
      correctReason: 1, explanation: reason };
  }
  if (id.includes('equivalent')) {
    const d = [3, 4, 5][round % 3]; const n = d - 1; const factor = 2 + round % 2;
    const reason = `Split every original piece into ${factor} equal pieces, including unshaded pieces. Change both counts by the same factor.`;
    return { id: 'retention', transfer: true, prompt: `A new ribbon has ${n}/${d} colored. Rename the amount with denominator ${d * factor} and build it.`,
      target: model(n * factor, d * factor), reasons: ['Change only the denominator.', reason, 'A larger denominator always means a larger amount.'],
      correctReason: 1, explanation: reason };
  }
  if (id.startsWith('sets-')) {
    const d = [4, 5, 6][round % 3]; const n = id === 'sets-unit-fractions' ? 1 : 2; const total = d * 5;
    const reason = `Share all ${total} objects into ${d} equal groups, then select ${n} of those groups.`;
    return { id: 'retention', transfer: true, prompt: `Fresh collection: group ${total} shells and select ${n}/${d} of them.`, target: model(n, d, 'set', total),
      reasons: [reason, 'Use the numerator as the total number of groups.', 'Select only the denominator-many objects.'], correctReason: 0, explanation: reason };
  }
  const variants = getWorksheet(id).filter(p => {
    const value = parseAnswer(p.answer);
    return value && value.d > 1 && value.n > 0 && value.n <= value.d * 3 && !p.denominator && p.form !== 'ordered';
  });
  const problem = variants[round % variants.length];
  if (!problem) throw new Error(`No numeric review variant for ${id}`);
  const value = parseAnswer(problem.answer)!;
  const reason = `${problem.hint} Keep the whole size fixed when changing representations.`;
  return { id: 'retention', transfer: true, prompt: `Fresh review: ${problem.prompt} Build your answer and translate it to a second model.`,
    target: model(value.n, value.d, id.startsWith('number-line') ? 'line' : 'bar'),
    reasons: ['Count tick marks instead of equal spaces.', reason, 'Only the shaded parts need to be equal.'],
    correctReason: 1, explanation: reason };
}
