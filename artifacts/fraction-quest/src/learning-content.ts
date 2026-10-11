export type Rational = { n: number; d: number };
export type LearningModel = { kind: 'bar' | 'set' | 'line'; n: number; d: number; wholes: number; total?: number };
export type WorksheetProblem = {
  id: string; prompt: string; answer: string; hint: string; model?: LearningModel; modelRequired?: boolean;
  form?: 'decimal' | 'mixed' | 'ordered' | 'symbol'; denominator?: number;
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
  'simplify-fractions': [6, 8, 'bar', 'Build 6/8, then regroup its pieces to show the simplest equivalent fraction.', 'Divide the numerator and denominator by the same factor. Six eighths simplifies to three fourths.'],
  'equivalent-missing-both': [4, 10, 'bar', 'Build 2/5 using tenths and explain how both counts change.', 'Multiply numerator and denominator by the same factor; 2/5 is 4/10.'],
  'compare-unlike-fractions': [2, 3, 'bar', 'Compare 2/3 and 3/5 on matching whole bars.', 'Rename the fractions as tenths or fifteenths before comparing their amounts.'],
  'order-unlike-fractions': [3, 4, 'bar', 'Build the greatest of 1/2, 2/3 and 3/4.', 'Use a common denominator or benchmark half to compare the three amounts.'],
  'subtract-unlike-fractions': [1, 4, 'bar', 'Build 3/4 − 1/2 by renaming halves as fourths.', 'One half is two fourths; three fourths minus two fourths leaves one fourth.'],
  'add-mixed-numbers': [5, 4, 'bar', 'Build 1 1/4 + 2 1/2, regrouping fractional pieces.', 'Rename one half as two fourths, then combine whole units and fourths.'],
  'subtract-mixed-numbers': [2, 3, 'bar', 'Build 2 1/3 − 1 2/3 by regrouping one whole.', 'Trade one whole for three thirds: 2 1/3 becomes 1 4/3, and subtracting 1 2/3 leaves 2/3.'],
  'fraction-of-quantity': [3, 5, 'set', 'Group 20 objects equally and select three fifths.', 'Share 20 into five equal groups, then count three groups.', 20],
  'multiply-whole-by-fraction': [3, 2, 'bar', 'Build 3 groups of 1/2 and combine the fractional amounts.', 'Three halves make 3/2, or one and one half.'],
  'multiply-fractions': [3, 8, 'bar', 'Show one half of 3/4 using a fraction model.', 'A part of a part is one half times three fourths: three eighths.'],
  'fraction-of-collection': [3, 4, 'set', 'Group 16 cards equally and select three fourths.', 'Split the collection into four equal groups and select three.', 16],
  'divide-whole-by-unit-fraction': [4, 4, 'bar', 'Build four one-fourth measures that fill one whole cup.', 'Four one-fourth pieces exactly fill one whole.'],
  'fraction-of-length': [3, 8, 'line', 'Mark three eighths of a meter on a measuring line.', 'Each interval is one eighth of a meter; count three intervals from zero.'],
  'fractional-measure-addition': [3, 4, 'bar', 'Build 1/2 meter plus 1/4 meter.', 'Rename one half as two fourths, then combine the matching lengths.'],
  'fractional-sharing': [3, 4, 'bar', 'Share three identical loaves equally among four people. Build one person’s share.', 'Each person receives three fourths of a loaf.'],
  'fraction-as-division': [5, 4, 'bar', 'Show five objects shared equally into four groups.', 'Five divided by four is five fourths, or one and one fourth per group.'],
  'fraction-probability': [2, 8, 'bar', 'A spinner has eight equal sections; build the chance of landing on either blue section.', 'Two favorable outcomes out of eight equally likely outcomes make a probability of 2/8.'],
  'fraction-of-area': [3, 8, 'bar', 'Partition a mosaic into eight equal-area regions and shade three.', 'The denominator counts equal areas and the numerator counts selected regions.'],
  'equivalent-number-line': [2, 3, 'line', 'Mark 2/3 and 4/6 on a number line to show the same location.', 'Both fractions land at the same point because each third is two sixths.'],
  'fraction-recipes': [3, 4, 'bar', 'Double a recipe that uses 3/8 cup of milk.', 'Two groups of three eighths make six eighths, or three fourths of a cup.'],
  'fractions-to-percent': [75, 100, 'bar', 'Build 75/100 and name how many parts out of one hundred that is.', 'Seventy-five hundredths is 75 percent.'],
  'percent-to-fraction': [60, 100, 'bar', 'Build 60 percent as a fraction out of 100.', 'Percent means per hundred, so 60 percent is 60/100.'],
  'decimal-fraction-equivalence': [7, 10, 'bar', 'Build 0.7 as both tenths and hundredths.', 'Seven tenths is seventy hundredths: 7/10 = 70/100.'],
  'multi-step-fraction-stories': [2, 5, 'bar', 'A garden is 2/5 planted; add another 1/5, then show what remains.', 'Three fifths are planted after the addition, so two fifths remain.'],
};

const EXTENSION_TRANSFERS: Record<string, { n: number; d: number; prompt: string; reason: string; kind?: LearningModel['kind']; total?: number }> = {
  'simplify-fractions': { n: 3, d: 4, prompt: 'A new map strip shows 9/12 covered. Build the same amount in simplest form.', reason: 'Divide numerator and denominator by three: 9/12 is 3/4.' },
  'equivalent-missing-both': { n: 9, d: 15, prompt: 'A trail marker shows 3/5 of a route. Rename it using fifteenths and build it.', reason: 'Each fifth is three fifteenths, so 3/5 equals 9/15.' },
  'compare-unlike-fractions': { n: 3, d: 5, prompt: 'Compare 3/5 and 1/2 of a new race. Build the greater distance.', reason: 'Three fifths is greater than one half because 3/5 is 0.6 and 1/2 is 0.5.' },
  'order-unlike-fractions': { n: 5, d: 6, prompt: 'Build the greatest of 1/3, 3/4 and 5/6 on a fresh trail.', reason: 'Five sixths is greater than three fourths and one third.' },
  'subtract-unlike-fractions': { n: 2, d: 6, prompt: 'A fresh jug is 5/6 full. Pour out 1/2. Build what remains.', reason: 'One half is three sixths; five sixths minus three sixths leaves two sixths.' },
  'add-mixed-numbers': { n: 13, d: 6, prompt: 'A walk is 1 1/2 km, then another 2/3 km. Build the combined distance.', reason: 'Three halves are nine sixths and two thirds are four sixths; thirteen sixths is 2 1/6.' },
  'subtract-mixed-numbers': { n: 3, d: 4, prompt: 'A fabric roll is 2 1/4 m long. Cut away 1 1/2 m. Build the remainder.', reason: 'Regroup one whole as four fourths: 2 1/4 minus 1 1/2 is 3/4.' },
  'fraction-of-quantity': { n: 2, d: 3, total: 18, kind: 'set', prompt: 'There are 18 new classroom markers. Group them and select 2/3.', reason: 'Share 18 into three groups of six and select two groups: twelve markers.' },
  'multiply-whole-by-fraction': { n: 4, d: 3, prompt: 'Build four servings that each contain 1/3 cup of juice.', reason: 'Four groups of one third make four thirds, or one and one third cups.' },
  'multiply-fractions': { n: 6, d: 20, prompt: 'A garden uses 3/4 of a plot; vegetables fill 2/5 of that area. Build the vegetable area.', reason: 'Two fifths of three fourths is six twentieths of the whole plot.' },
  'fraction-of-collection': { n: 2, d: 5, total: 20, kind: 'set', prompt: 'A new collection has 20 cards. Group them and select 2/5.', reason: 'Twenty split into five groups gives four per group; two groups contain eight cards.' },
  'divide-whole-by-unit-fraction': { n: 10, d: 5, prompt: 'How many one-fifth cup measures fit into two cups? Build the total count in fifths.', reason: 'Each cup has five fifths, so two cups contain ten one-fifth measures.' },
  'fraction-of-length': { n: 5, d: 8, prompt: 'Mark five eighths of a new kilometer on a number line.', reason: 'Each interval is one eighth of a kilometer; five equal jumps reach 5/8.' },
  'fractional-measure-addition': { n: 3, d: 6, prompt: 'Join 1/3 meter and 1/6 meter of a new board. Build the total.', reason: 'One third is two sixths; together with one sixth that is three sixths.' },
  'fractional-sharing': { n: 5, d: 4, prompt: 'Share five identical loaves equally among four people. Build one person’s share.', reason: 'Each person receives five fourths of a loaf, or one and one fourth.' },
  'fraction-as-division': { n: 7, d: 3, prompt: 'Share seven pizzas equally among three tables. Build the amount at each table.', reason: 'Seven divided into three equal shares is seven thirds per table.' },
  'fraction-probability': { n: 3, d: 10, prompt: 'A different spinner has ten equal sections, three blue. Build the chance of blue.', reason: 'Three of the ten equally likely outcomes are blue, so the chance is 3/10.' },
  'fraction-of-area': { n: 4, d: 6, prompt: 'Shade four sixths of a new equal-area tile design.', reason: 'Four of the six equal-area regions are selected, so the shaded area is 4/6.' },
  'equivalent-number-line': { n: 4, d: 6, prompt: 'Mark 4/6 on a new number line and show that it lands with 2/3.', reason: 'Four sixths and two thirds name the same location on the line.' },
  'fraction-recipes': { n: 4, d: 3, prompt: 'A recipe uses 2/3 cup of oats. Double it and build the total in thirds.', reason: 'Two groups of two thirds make four thirds, or one and one third cups.' },
  'fractions-to-percent': { n: 35, d: 100, prompt: 'A new class survey has 35/100 responses marked yes. Build the percent.', reason: 'Thirty-five out of one hundred is 35 percent.' },
  'percent-to-fraction': { n: 45, d: 100, prompt: 'A game score is 45%. Build it as a fraction out of 100.', reason: 'Percent means parts per hundred, so 45% is 45/100.' },
  'decimal-fraction-equivalence': { n: 45, d: 100, prompt: 'A battery reads 0.45. Build the same amount as hundredths.', reason: 'Forty-five hundredths is 0.45.' },
  'multi-step-fraction-stories': { n: 3, d: 8, prompt: 'A garden has 3/8 planted. Plant 2/8 more, then build the part still empty.', reason: 'Five eighths are planted after adding; three eighths remain empty.' },
};

type ExtensionWorksheetMode = 'simplify' | 'equivalent' | 'compare' | 'order' | 'subtract-unlike' | 'mixed-add' | 'mixed-subtract'
  | 'quantity' | 'multiply-whole' | 'multiply' | 'sets' | 'divide' | 'measure' | 'measure-add' | 'share'
  | 'quotient' | 'probability' | 'area' | 'line' | 'recipe' | 'percent' | 'percent-inverse' | 'decimal-equivalent' | 'story';
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
  const authored = EXTENSION_TRANSFERS[id];
  if (authored) return {
    prompt: authored.prompt, target: model(authored.n, authored.d, authored.kind ?? 'bar', authored.total), reason: authored.reason,
  };
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
  const extension = EXTENSION_WORKSHEETS[id];
  if (extension) return getExtensionWorksheet(extension);
  return Array.from({ length: 12 }, (_, i) => {
    const introDenominators = [3, 4, 5, 6, 2, 3, 4, 5, 6, 2, 3, 4];
    const isIntroTopic = ['equal-parts', 'fraction-names', 'unit-fractions'].includes(id);
    const d = isIntroTopic ? introDenominators[i] : [3, 4, 5, 6, 8, 10, 7, 9, 12, 4, 6, 8][i];
    const n = 1 + i % (d - 1);
    const value = f(n, d);
    let prompt = ''; let answer = value; let hint = 'Count selected parts on top and all equal parts in one whole on the bottom.';
    let visual: LearningModel | undefined; let form: WorksheetProblem['form']; let denominator: number | undefined;
    let modelRequired = false;
    const context = ['ribbon', 'strip', 'tile row'][i % 3];
    switch (id) {
      case 'equal-parts':
        prompt = i % 3 === 0 ? `The bar shows one whole split into ${d} equal parts. What fraction is one part?` :
          i % 3 === 1 ? `A whole bar has ${d} equal parts. How many parts are in the whole?` :
          `One part is shaded in a bar split into ${d} equal parts. What fraction is shaded?`;
        answer = i % 3 === 1 ? String(d) : f(1, d);
        visual = model(1, d); modelRequired = true;
        hint = i % 3 === 1
          ? 'The number of equal parts in the whole is the total number of pieces.'
          : 'A single equal part is one selected piece out of all the equal pieces.';
        break;
      case 'unit-fractions':
        prompt = i % 3 === 0 ? `A whole is split into ${d} equal parts. Write the fraction for one part.` :
          i % 3 === 1 ? `One share is 1/${d} of a whole. How many equal shares make the whole?` :
          `The bar has ${d} equal parts and one is shaded. What fraction is shaded?`;
        answer = i % 3 === 1 ? String(d) : f(1, d);
        visual = model(1, d); modelRequired = true;
        hint = 'A unit fraction names one equal part; the denominator tells how many equal parts make the whole.';
        break;
      case 'fraction-names':
        prompt = i % 3 === 0 ? `In ${value}, how many pieces are counted? Enter a whole number.` :
          i % 3 === 1 ? `In ${value}, how many equal pieces form one whole? Enter a whole number.` :
          'Name the shaded fraction in the bar model.';
        answer = i % 3 === 0 ? String(n) : i % 3 === 1 ? String(d) : value;
        visual = model(n, d); modelRequired = true;
        break;
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
        prompt = i % 3 === 0 && id === 'number-line-basics' ? `How many equal spaces make ${unitName(d)} between 0 and 1?` :
          i % 3 === 1 ? `A walk takes ${top} ${top === 1 ? 'jump' : 'jumps'}, each 1/${d} meter. Enter the total distance.` : `This line uses ${d} equal spaces per whole. Name the marked point as a fraction of one whole.`;
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
        answer = f(large / small + 1, large); hint = `Rename both amounts using ${unitName(large)} before combining counts.`; break;
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
    return { id: `w${i + 1}`, prompt, answer, hint, model: visual, modelRequired, form, denominator };
  });
}

function getExtensionWorksheet(spec: { mode: ExtensionWorksheetMode; context: string; n: number; d: number }): WorksheetProblem[] {
  return Array.from({ length: 12 }, (_, i) => {
    const d = spec.mode === 'order' ? 4 + i : [4, 6, 8, 10, 12, 5, 8, 6, 10, 4, 12, 8][i];
    const n = 1 + (i % Math.min(4, d - 1));
    const factor = 2 + i % 2;
    const fraction = `${n}/${d}`;
    let prompt = ''; let answer = fraction; let form: WorksheetProblem['form']; let visual: LearningModel | undefined;
    switch (spec.mode) {
      case 'simplify':
        prompt = `Simplify ${n * factor}/${d * factor} to its simplest form.`; answer = fraction; visual = model(n * factor, d * factor); break;
      case 'equivalent':
        prompt = `Rename ${fraction} using denominator ${d * factor}. Enter an equivalent fraction.`; answer = `${n * factor}/${d * factor}`; visual = model(n, d); break;
      case 'compare': {
        const otherD = d + 2; const otherN = Math.min(otherD - 1, n + 1);
        prompt = `Type <, = or >: ${fraction} __ ${otherN}/${otherD}. The ${spec.context} wholes match.`;
        answer = n * otherD < otherN * d ? '<' : n * otherD > otherN * d ? '>' : '='; form = 'symbol';
        visual = model(n, d); break;
      }
      case 'order': {
        const fractions = [{ n: 1, d }, { n: 1, d: d + 1 }, { n: 2, d: d + 2 }];
        const ordered = fractions.slice().sort((a, b) => a.n * b.d - b.n * a.d);
        prompt = `Order ${fractions.map(value => `${value.n}/${value.d}`).join(', ')} from least to greatest on the ${spec.context}.`;
        answer = ordered.map(value => `${value.n}/${value.d}`).join(', '); form = 'ordered'; visual = model(ordered[1].n, ordered[1].d); break;
      }
      case 'subtract-unlike': {
        const even = 4 + 2 * (i % 4); const top = even - 1;
        const situation = ['water bottle', 'juice jug', 'thermos', 'sports flask', 'pitcher', 'canteen'][i % 6];
        prompt = `A ${situation} is ${top}/${even} full. You use 1/2. How much remains?`;
        answer = `${top - even / 2}/${even}`; visual = model(top, even); break;
      }
      case 'mixed-add': {
        const whole = 1 + i % 3; const sum = n + 1;
        prompt = `Add ${whole} ${fraction} and 1/${d}. Enter the total as a mixed number or whole number.`;
        const resultWhole = whole + Math.floor(sum / d); const resultPart = sum % d;
        answer = resultPart ? `${resultWhole} ${resultPart}/${d}` : String(resultWhole);
        form = resultPart ? 'mixed' : undefined; visual = model(whole * d + n, d); break;
      }
      case 'mixed-subtract': {
        const whole = 2 + i % 3; const smaller = 1 + i % (d - 1);
        prompt = `Calculate ${whole} 1/${d} − 1 ${smaller}/${d} for the ${spec.context}.`;
        const totalTop = whole * d + 1 - (d + smaller);
        const resultWhole = Math.floor(totalTop / d); const resultPart = totalTop % d;
        answer = resultPart ? `${resultWhole} ${resultPart}/${d}` : String(resultWhole);
        form = resultPart ? 'mixed' : undefined; visual = model(whole * d + 1, d); break;
      }
      case 'quantity':
      case 'sets': {
        const total = d * (2 + i % 4); const groups = Math.min(n, d);
        prompt = `${total} ${spec.context} are shared into ${d} equal groups. How many are in ${groups}/${d} of them?`;
        answer = String(total / d * groups); visual = model(groups, d, 'set', total); break;
      }
      case 'share': {
        const loaves = 1 + i % 5;
        prompt = `Share ${loaves} ${loaves === 1 ? 'loaf' : 'loaves'} equally among ${d} people. How much of a loaf does each person receive?`;
        answer = `${loaves}/${d}`; visual = model(1, d, 'bar'); break;
      }
      case 'multiply-whole': {
        const multiple = 2 + i % 4;
        prompt = `Find ${multiple} groups of ${fraction} ${spec.context}. Enter the total as a fraction.`;
        answer = `${n * multiple}/${d}`; visual = model(n * multiple, d); break;
      }
      case 'multiply':
        prompt = `A ${spec.context} has ${fraction} planted. What is one half of that area?`;
        answer = `${n}/${d * 2}`; visual = model(n, d); break;
      case 'divide': {
        const amount = 1 + i % 4;
        prompt = `How many 1/${d}-cup measures fit in ${amount} ${spec.context}?`;
        answer = String(amount * d); visual = model(1, d); break;
      }
      case 'measure': {
        const length = d * (2 + i % 3);
        prompt = `What is ${n}/${d} of a ${length}-meter ${spec.context}? Enter the length in meters.`;
        answer = String(length / d * n); visual = model(n, d, 'line'); break;
      }
      case 'measure-add':
        prompt = `Join ${n}/${d} meter and 1/${d} meter of ${spec.context}. Enter the total in meters.`;
        answer = `${n + 1}/${d}`; visual = model(n + 1, d); break;
      case 'quotient':
        prompt = `${n} ${spec.context} are shared equally by ${d} friends. Enter the amount each friend gets.`;
        answer = `${n}/${d}`; visual = model(n, d); break;
      case 'probability': {
        const total = d; const favorable = n;
        prompt = `A ${spec.context} has ${total} equal outcomes and ${favorable} are green. Enter the chance of green as a fraction.`;
        answer = `${favorable}/${total}`; visual = model(favorable, total, 'set', total); break;
      }
      case 'area':
        prompt = `A ${spec.context} has ${d} equal-area tiles and ${n} are shaded. What fraction is shaded?`;
        answer = fraction; visual = model(n, d); break;
      case 'line':
        prompt = `Mark the same point as ${n}/${d} using ${d * 2} equal jumps on a ${spec.context}. Enter the equivalent fraction.`;
        answer = `${n * 2}/${d * 2}`; visual = model(n, d, 'line'); break;
      case 'recipe':
        prompt = `Double a ${spec.context} that needs ${n}/${d} cup of flour. How much flour is needed?`;
        answer = `${n * 2}/${d}`; visual = model(n, d); break;
      case 'percent':
        prompt = `The ${spec.context} shows ${n * 10} out of ${d * 10} responses. Enter the percent as a whole number.`;
        answer = String(Math.round(n / d * 100)); visual = model(n, d); break;
      case 'percent-inverse': {
        const percent = Math.round(n / d * 100);
        prompt = `${percent}% of the ${spec.context} is complete. Write it as a fraction out of 100.`;
        answer = `${percent}/100`; visual = model(percent, 100); break;
      }
      case 'decimal-equivalent': {
        const tenths = Math.round(n / d * 10);
        prompt = `The ${spec.context} shows ${n}/${d}. Round its value to the nearest tenth and enter the decimal.`;
        answer = (n / d).toFixed(1); form = 'decimal'; visual = model(tenths, 10); break;
      }
      case 'story': {
        const planted = n;
        prompt = `A ${spec.context} has ${planted}/${d} of its beds planted. Then 1/${d} more is planted. What fraction is still empty?`;
        answer = `${d - n - 1}/${d}`; visual = model(d - n - 1, d); break;
      }
    }
    return { id: `w${i + 1}`, prompt, answer, hint: `Use the ${spec.mode.replaceAll('-', ' ')} idea and check that the whole or unit stays consistent.`, model: visual, form };
  });
}

export function getReviewCheck(id: string, round: number): BuildCheck {
  if (EXTENSION_WORKSHEETS[id]) {
    const transfer = getBuildChecks(id)[1];
    return {
      ...transfer,
      id: 'retention',
      prompt: `Fresh round ${round + 1}: ${transfer.prompt}`,
      correctReason: 1,
      reasons: ['The whole can change without changing the fraction.', transfer.explanation, 'Only the numerator tells the size.'],
    };
  }
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
