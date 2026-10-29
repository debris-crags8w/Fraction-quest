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
