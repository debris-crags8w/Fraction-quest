import type { WorksheetProblem } from './learning-content';

/* Find my level draws its questions from each lesson's worksheet rows, but three lessons' rows all need a tool the
   quiz does not show (a ruler to move along, a line plot to fill in). Their standards (3.MD.4, 4.MD.4, 5.MD.2) were never
   asked. These rows ask the same skill with what the quiz can show: a number line for a ruler, and the measurements
   written in the question for a line plot. */
const row = (id: string, prompt: string, answer: string, hint: string, standard: string, extra: Partial<WorksheetProblem> = {}): WorksheetProblem =>
  ({ id: `placement-${id}`, prompt, answer, hint, standards: [standard], ...extra });

export const PLACEMENT_EXTRAS: Record<string, WorksheetProblem[]> = {
  'ruler-measurement': [
    row('ruler-1', 'A ruler is marked in fourths of an inch. The pencil ends at the dot. How long is the pencil in inches?', '1 1/4', 'Count the fourths from 0 to the dot.', '3.MD.4',
      { form: 'mixed', model: { kind: 'line', n: 5, d: 4, wholes: 2 } }),
    row('ruler-2', 'A ruler is marked in halves of an inch. The crayon ends at the dot. How long is the crayon in inches?', '1 1/2', 'Count the halves from 0 to the dot.', '3.MD.4',
      { form: 'mixed', model: { kind: 'line', n: 3, d: 2, wholes: 2 } }),
    row('ruler-3', 'A ruler is marked in fourths of an inch. The paper strip ends at the dot. How long is the strip in inches?', '3/4', 'Count the fourths from 0 to the dot.', '3.MD.4',
      { model: { kind: 'line', n: 3, d: 4, wholes: 2 } }),
  ],
  'read-line-plots': [
    row('plots-1', 'These pencil lengths are 1/8, 2/8, 2/8, 5/8 and 7/8 inch. What is the difference between the longest and shortest?', '6/8', 'Take the shortest length away from the longest.', '4.MD.4'),
    row('plots-2', 'These seed lengths are 2/4, 3/4, 3/4 and 1/4 inch. What is the difference between the longest and shortest?', '2/4', 'Take the shortest length away from the longest.', '4.MD.4'),
    row('plots-3', 'These twig lengths are 1/8, 3/8, 3/8, 6/8 inch. How many twigs are 3/8 inch long?', '2', 'Count the lengths that are 3/8.', '4.MD.4'),
  ],
  'line-plot-totals': [
    row('totals-1', 'Cups hold: 2/8, 2/8, 5/8, 5/8 liter. How much water in all?', '14/8', 'Add all the eighths together.', '5.MD.2'),
    row('totals-2', 'Beakers hold: 1/8, 1/8, 2/8, 6/8 liter. How much water in all?', '10/8', 'Add all the eighths together.', '5.MD.2'),
    row('totals-3', 'Cups hold: 3/8, 3/8, 4/8, 6/8, 6/8 liter. How much water in all?', '22/8', 'Add all the eighths together.', '5.MD.2'),
  ],
};

/* Units 8 and 12 have many lessons and standards but three questions each, so a quiz used to ask only about 3.6 and 4.4 of
   their standards. These rows each ask two (or three) of the unit's standards at once, the lesson's own and one taught
   earlier in the unit, so the same three questions cover more of it. Every row really needs each skill it is tagged with. */
const blend = (id: string, prompt: string, answer: string, hint: string, standards: string[], form?: WorksheetProblem['form']): WorksheetProblem =>
  ({ id: `placement-${id}`, prompt, answer, hint, standards, ...(form ? { form } : {}) });
const MIXED_LENGTH = ['4.NF.3c', '4.NF.3d']; // a mixed number in a story about one length
const DECIMAL_SIGN = ['4.NF.7', '4.NF.6']; // hundredths written as a decimal, then compared
export const PLACEMENT_BLENDS: Record<string, WorksheetProblem[]> = {
  'add-mixed-numbers': [
    blend('mixed-add-1', 'A rope is 1 3/8 meters long. Add 2/8 meter more. How long is it now?', '1 5/8', 'Add the eighths. The whole meter stays.', MIXED_LENGTH, 'mixed'),
    blend('mixed-add-2', 'A rope is 1 3/4 meters long. Add 2/4 meter more. How long is it now?', '2 1/4', 'Add the fourths. 4 fourths make a new whole.', MIXED_LENGTH, 'mixed'),
  ],
  'subtract-mixed-numbers': [
    blend('mixed-cut-1', 'A ribbon is 2 1/4 meters long. Cut off 3/4 meter. How much is left?', '1 2/4', '1/4 is not enough to take 3/4 from. Trade 1 whole for 4/4 first.', MIXED_LENGTH, 'mixed'),
    blend('mixed-cut-2', 'A ribbon is 3 1/5 meters long. Cut off 3/5 meter. How much is left?', '2 3/5', '1/5 is not enough to take 3/5 from. Trade 1 whole for 5/5 first.', MIXED_LENGTH, 'mixed'),
  ],
  // Adding fractions with like denominators (4.NF.3a, earlier in unit 8), then writing the sum as a decimal (4.NF.6).
  'tenths-decimals': [
    blend('tenths-add-1', 'Write 3/10 + 4/10 as a decimal.', '0.7', 'Add the tenths first. Then write the tenths after the point.', ['4.NF.6', '4.NF.3a'], 'decimal'),
    blend('tenths-add-2', 'Write 2/10 + 5/10 as a decimal.', '0.7', 'Add the tenths first. Then write the tenths after the point.', ['4.NF.6', '4.NF.3a'], 'decimal'),
  ],
  'hundredths-decimals': [
    blend('hundredths-add-1', 'Write 25/100 + 30/100 as a decimal.', '0.55', 'Add the hundredths first. Then write 2 places after the point.', ['4.NF.6', '4.NF.3a'], 'decimal'),
  ],
  'decimal-fraction-equivalence': [
    blend('fourths-add-1', 'Write 1/4 + 2/4 as a decimal.', '0.75', 'Add the fourths first. Then change the fourths to hundredths.', ['4.NF.6', '4.NF.3a'], 'decimal'),
    blend('fifths-add-1', 'Write 1/5 + 2/5 as a decimal.', '0.6', 'Add the fifths first. Then change the fifths to tenths.', ['4.NF.6', '4.NF.3a'], 'decimal'),
  ],
  'compare-decimals': [
    blend('decimal-sign-1', 'Put <, = or > in the gap: 45/100 __ 0.5.', '<', 'Write 0.5 in hundredths first: 50 hundredths.', DECIMAL_SIGN, 'symbol'),
    blend('decimal-sign-2', 'Put <, = or > in the gap: 0.3 __ 25/100.', '>', 'Write 0.3 in hundredths first: 30 hundredths.', DECIMAL_SIGN, 'symbol'),
  ],
  'compare-decimals-grid': [
    blend('decimal-sign-3', 'Put <, = or > in the gap: 0.7 __ 68/100.', '>', 'Write 0.7 in hundredths first: 70 hundredths.', DECIMAL_SIGN, 'symbol'),
    blend('decimal-sign-4', 'Put <, = or > in the gap: 9/100 __ 0.1.', '<', 'Write 0.1 in hundredths first: 10 hundredths.', DECIMAL_SIGN, 'symbol'),
  ],
  'add-tenths-hundredths': [
    blend('tenths-sum-1', 'Write 4/10 + 25/100 as a decimal.', '0.65', 'Change 4/10 into hundredths first. Then write 2 places after the point.', ['4.NF.5', '4.NF.6'], 'decimal'),
    blend('tenths-sum-2', 'Write 7/10 + 8/100 as a decimal.', '0.78', 'Change 7/10 into hundredths first. Then write 2 places after the point.', ['4.NF.5', '4.NF.6'], 'decimal'),
  ],
  'line-plot-totals': [
    // Adding halves, fourths and eighths: unlike denominators in a story (5.NF.1, 5.NF.2) from measurements (5.MD.2).
    blend('totals-mixed-1', 'Cups hold: 1/2, 1/4, 3/4 liter. How much water in all?', '1 2/4', 'Change 1/2 into fourths. Then add all the fourths.', ['5.MD.2', '5.NF.1', '5.NF.2'], 'mixed'),
    blend('totals-mixed-2', 'Cups hold: 1/2, 3/8, 5/8 liter. How much water in all?', '1 4/8', 'Change 1/2 into eighths. Then add all the eighths.', ['5.MD.2', '5.NF.1', '5.NF.2'], 'mixed'),
  ],
  'fractional-unit-conversions': [
    // A fraction of 2 or 3 big units (5.NF.4a), changed to small units (5.MD.1), in a measurement story (4.MD.2).
    blend('convert-part-1', 'A 2-liter jug is 3/4 full. How many milliliters are inside?', '1500', '2 liters is 2000 milliliters. Find 3/4 of 2000.', ['5.MD.1', '4.MD.2', '5.NF.4a']),
    blend('convert-part-2', 'A 3-kilogram bag is 1/4 full. How many grams are in it?', '750', '3 kilograms is 3000 grams. Find 1/4 of 3000.', ['5.MD.1', '4.MD.2', '5.NF.4a']),
  ],
  'two-step-conversions': [
    blend('two-step-1', 'A ribbon is 2 1/4 feet long. Pip cuts off 8 inches. How many inches are left?', '19', 'Change 2 1/4 feet to inches first: 1 foot is 12 inches.', ['5.MD.1', '4.MD.2']),
    blend('two-step-2', 'A race is 1 1/4 hours long. The first part takes 30 minutes. How many minutes are left?', '45', 'Change 1 1/4 hours to minutes first: 1 hour is 60 minutes.', ['5.MD.1', '4.MD.2']),
  ],
};
