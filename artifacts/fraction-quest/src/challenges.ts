/* Kangaroo-style Unit challenges: short puzzles with four choices (A–D), worth 3, 4 or 5 points.
   Points count only on the first try. Each unit's challenge unlocks when all its lessons are done. All 15 units have one: six puzzles worth 22 points. Some slots have a second version that
   takes turns with the first, attempt by attempt (CHALLENGE_ALTERNATES). */
import { standardsForChallenge } from './standard-catalog';
import type { AreaCut } from './area-shapes';
import { wrongChoiceReason } from './wrong-answer';

/** Pictures for puzzles. None of them print the answer: the picture is the puzzle. */
export type ChallengeFigure =
  | { kind: 'grid'; rows: number; cols: number; shaded: number[] }
  | { kind: 'dots'; rows: number; cols: number; shaded: number[] }
  | { kind: 'bars'; bars: { n: number; d: number; label?: string }[] }
  | { kind: 'line'; n: number; d: number; wholes?: number }
  | { kind: 'fold'; folds: number[] }
  | { kind: 'lineplot'; denominator: number; wholes: number; values: number[] }
  /** Squares (or one square) cut into pieces, side by side: equal areas that may have different shapes. */
  | { kind: 'areas'; areas: { cut: AreaCut; shaded: number[]; label?: string }[] }
  /** A ruler with a blue strip from 0 to `end` ticks. */
  | { kind: 'ruler'; denominator: number; wholes: number; end: number };

/** One small step of a guided walk-through for a long word problem. */
export type ChallengeStep = { prompt: string; choices: [string, string, string, string]; correct: number; standards?: string[] };

export type ChallengeQuestion = {
  id: string;
  points: 3 | 4 | 5;
  prompt: string;
  choices: [string, string, string, string];
  correct: number;
  explanation: string;
  figure?: ChallengeFigure;
  steps?: ChallengeStep[];
  standards?: string[];
  /** Why each wrong choice is wrong, by choice number, when the general slip reasons cannot tell. */
  reasons?: Partial<Record<number, string>>;
};

const q = (id: string, points: 3 | 4 | 5, prompt: string, choices: ChallengeQuestion['choices'], correct: number, explanation: string, figure?: ChallengeFigure, steps?: ChallengeStep[]): ChallengeQuestion =>
  ({ id, points, prompt, choices, correct, explanation, figure, steps });
/** A puzzle with a picture and its own reason for each wrong choice. */
const puzzle = (id: string, points: 3 | 4 | 5, prompt: string, choices: ChallengeQuestion['choices'], correct: number, explanation: string, figure: ChallengeFigure, reasons: Partial<Record<number, string>>): ChallengeQuestion =>
  ({ id, points, prompt, choices, correct, explanation, figure, reasons });
const step = (prompt: string, choices: ChallengeStep['choices'], correct: number): ChallengeStep => ({ prompt, choices, correct });

export const CHALLENGES: Record<number, ChallengeQuestion[]> = {
  1: [
    q('u1-p1', 3, 'What fraction of the rectangle is shaded?', ['1/3', '3/8', '3/4', '5/8'], 1, '8 equal squares. 3 are shaded. So 3/8.', { kind: 'grid', rows: 2, cols: 4, shaded: [0, 3, 5] }),
    q('u1-c1', 3, 'A chocolate bar has 6 equal squares. Ana eats 4 squares. What fraction of the bar does she eat?', ['2/6', '4/6', '4/2', '6/4'], 1, '6 equal squares. Ana eats 4. So 4/6.'),
    q('u1-c2', 3, 'A pizza has 8 equal slices. Tom eats 1 slice. Mia eats 2 slices. What fraction is left?', ['3/8', '4/8', '5/8', '6/8'], 2, '3 slices are eaten. 5 are left. So 5/8.'),
    q('u1-c3', 4, 'Sam folds a paper strip in half. Then he folds it in half again. He opens it. What fraction is each part?', ['1/2', '1/3', '1/4', '1/8'], 2, 'Half, then half again, makes 4 equal parts.', { kind: 'fold', folds: [2, 2] }, [
      step('Sam folds the strip in half once. How many parts will it open into?', ['2', '1', '3', '4'], 0),
      step('He folds it in half again. Each half splits in 2. How many parts now?', ['3', '8', '4', '6'], 2),
      step('The strip opens into 4 equal parts. What is 1 part?', ['1/3', '1/2', '1/8', '1/4'], 3),
    ]),
    q('u1-c4', 4, 'A ribbon is cut into 4 equal pieces. Each piece is 1/4 of the ribbon. Lia takes 3 pieces. What fraction of the ribbon does she take?', ['1/4', '3/4', '3/1', '4/3'], 1, 'Each piece is 1/4. 3 pieces make 3/4.'),
    q('u1-c5', 5, 'A bar is cut into equal parts. Each part is 1/6 of the bar. Ben shades 2 parts. Ana shades 3 parts. How many parts are not shaded?', ['5', '6', '2', '1'], 3, '1/6 means the bar has 6 equal parts. Ben and Ana shade 5 parts. So 1 part is not shaded.', undefined, [
      step('Each part is 1/6 of the bar. How many equal parts is the bar cut into?', ['6', '1', '5', '12'], 0),
      step('Ben shades 2 parts and Ana shades 3 parts. How many parts are shaded together?', ['6', '1', '5', '2'], 2),
      step('The bar has 6 parts. 5 are shaded. How many parts are not shaded?', ['5', '11', '6', '1'], 3),
    ]),
  ],
  2: [
    q('u2-p1', 3, 'What fraction of the dots are shaded?', ['3/8', '5/8', '5/3', '8/3'], 1, '5 of the 8 dots are shaded. So 5/8.', { kind: 'dots', rows: 2, cols: 4, shaded: [0, 2, 3, 5, 7] }),
    q('u2-c1', 3, 'The cakes are all the same size. Which part is the biggest?', ['1/2', '1/3', '1/4', '1/8'], 0, 'Fewer parts means bigger parts. Halves are biggest.'),
    q('u2-c2', 3, 'Which is bigger, 3/6 or 3/8?', ['3/6', '3/8', 'They are equal', "You can't tell"], 0, 'Both are 3 parts. Bigger parts come from cutting in 6, so 3/6 is bigger.'),
    q('u2-c3', 4, 'Mia eats 1/4 of a pizza. Leo eats 1/6 of a pizza the same size. Who eats more?', ['Leo', 'Mia', 'They eat the same', "You can't tell"], 1, 'Fourths are bigger than sixths. One fourth is more than one sixth, so Mia eats more.', undefined, [
      step('Which piece is bigger, 1/4 or 1/6?', ['1/6', '1/4', 'They are equal', "You can't tell"], 1),
      step('Mia has the 1/4 piece. So who eats more?', ['Leo', 'They eat the same', 'Mia', "You can't tell"], 2),
    ]),
    q('u2-c4', 4, 'Put 2/3, 2/6 and 2/4 in order, smallest first.', ['2/3, 2/4, 2/6', '2/6, 2/4, 2/3', '2/4, 2/6, 2/3', '2/6, 2/3, 2/4'], 1, 'All three are 2 parts. Cut in 6 is the smallest, cut in 3 the biggest: 2/6, 2/4, 2/3.', undefined, [
      step('All three have 2 parts. Which has the smallest parts?', ['Cut in 3', 'Cut in 4', 'Cut in 6', 'They are the same'], 2),
      step('Which has the biggest parts?', ['Cut in 3', 'Cut in 6', 'Cut in 4', 'They are the same'], 0),
    ]),
    q('u2-c5', 5, 'Two ribbons are the same length. One is cut into 6 equal pieces and one into 4. Sam takes 3 pieces of the first. Kim takes 3 pieces of the second. Who has more ribbon?', ['Sam', 'They have the same', 'Kim', "You can't tell"], 2, 'Sam has 3/6 and Kim has 3/4. Fourths are bigger than sixths, so Kim has more.', undefined, [
      step('What fraction of a ribbon does Sam have?', ['3/6', '6/3', '3/4', '1/6'], 0),
      step('What fraction of a ribbon does Kim have?', ['3/6', '4/3', '3/4', '1/4'], 2),
      step('Which is bigger, 3/6 or 3/4?', ['3/6', 'They are equal', '3/4', "You can't tell"], 2),
    ]),
  ],
  3: [
    q('u3-p1', 3, 'Which bar has more than half shaded?', ['A', 'B', 'C', 'D'], 3, 'Bar D is 5 of 8. Half of 8 is 4, and 5 is more.', { kind: 'bars', bars: [{ n: 2, d: 5, label: 'A' }, { n: 3, d: 7, label: 'B' }, { n: 4, d: 9, label: 'C' }, { n: 5, d: 8, label: 'D' }] }),
    q('u3-c1', 3, 'Which fraction is more than 1/2?', ['2/5', '3/7', '4/11', '5/8'], 3, 'Half of 8 is 4. 5 is more than 4.'),
    q('u3-c2', 3, 'Which fraction is closest to 1?', ['2/3', '3/4', '4/5', '5/6'], 3, 'Each is 1 part short of 1. Sixths are the smallest parts, so 5/6 is closest.'),
    q('u3-c3', 4, 'Which fraction is closest to 0?', ['1/5', '2/7', '1/4', '3/8'], 0, '1/5 is the smallest. 1/4 and 2/7 are a little bigger.'),
    q('u3-c4', 4, 'A glass is 3/8 full. How much more water makes it exactly half full?', ['1/8', '2/8', '3/8', '4/8'], 0, 'Half is 4/8. 3/8 needs 1 more eighth: 1/8.'),
    q('u3-c5', 5, 'Which fraction is exactly 1/2?', ['3/7', '9/18', '4/7', '5/11'], 1, 'Half of 18 is 9. So 9/18 is exactly half.'),
  ],
  4: [
    q('u4-p1', 3, 'What fraction is at the dot?', ['2/5', '3/5', '3/4', '4/5'], 1, '0 to 1 has 5 equal spaces. The dot is 3 spaces from 0.', { kind: 'line', n: 3, d: 5 }),
    q('u4-c1', 3, 'The line from 0 to 1 has 4 equal jumps. You make 3 jumps from 0. Where do you land?', ['1/4', '3/4', '4/3', '3'], 1, 'Each jump is 1/4. 3 jumps is 3/4.'),
    q('u4-c2', 3, 'A frog jumps 1/3 each time. How many jumps to get from 0 to 2?', ['2', '3', '5', '6'], 3, '3 jumps reach 1. 3 more reach 2. That is 6.'),
    q('u4-c3', 4, 'The line plot shows leaf lengths: 1 1/4, 1 2/4, 1 2/4, 1 3/4, 1 3/4, 2 inches. How many leaves are longer than 1 2/4 inches?', ['1', '3', '5', '6'], 1, '1 3/4, 1 3/4 and 2 are longer than 1 2/4. That is 3 leaves.', { kind: 'lineplot', denominator: 4, wholes: 2, values: [5, 6, 6, 7, 7, 8] }),
    q('u4-c4', 4, 'Point A is at 2/5. Point B is at 4/5. How far apart are they?', ['1/5', '2/5', '3/5', '4/5'], 1, 'From 2/5 to 4/5 is 2 jumps of 1/5.'),
    q('u4-c5', 5, 'A snail climbs 3/8 meter each day. After how many days has it climbed more than 1 meter?', ['2', '3', '4', '5'], 1, 'Day 2: 6/8. Day 3: 9/8. 9/8 is more than 1.', undefined, [
      step('The snail climbs 3/8 meter a day. How far after 2 days?', ['3/8 meter', '6/8 meter', '5/8 meter', '9/8 meters'], 1),
      step('How far after 3 days?', ['9/8 meters', '8/8 meter', '9/24 meter', '7/8 meter'], 0),
      step('1 meter is 8/8. Is 9/8 more than 1 meter?', ['No', 'Yes', 'They are equal', 'You can\'t tell'], 1),
    ]),
  ],
  5: [
    q('u5-p1', 3, 'The bars are the same size. Which bar has the most shaded?', ['A', 'B', 'C', 'D'], 1, 'B is 3/4. The others are 2/3, 4/6 and 5/8. All are less than 3/4.', { kind: 'bars', bars: [{ n: 2, d: 3, label: 'A' }, { n: 3, d: 4, label: 'B' }, { n: 4, d: 6, label: 'C' }, { n: 5, d: 8, label: 'D' }] }),
    q('u5-c1', 3, 'Which fraction is the biggest?', ['3/8', '5/8', '7/8', '6/8'], 2, 'Same size parts. 7 is the most.'),
    q('u5-c2', 3, 'Which fraction is the smallest?', ['2/11', '2/7', '2/4', '2/5'], 0, 'All have 2 parts. Cut in 11 makes the smallest parts.'),
    q('u5-c3', 4, 'Which fraction is bigger than 3/4?', ['3/5', '2/3', '5/8', '7/8'], 3, '3/4 is 1 part short of 1. 7/8 is 1 part short of 1 too, but eighths are smaller parts. So 7/8 is closer to 1.'),
    q('u5-c4', 4, 'Ana ran 3/4 mile. Ben ran 2/3 mile. Cara ran 5/6 mile. Dev ran 1/2 mile. Who ran the farthest?', ['Ana', 'Ben', 'Cara', 'Dev'], 2, 'Each is 1 part short of 1 mile. Sixths are smallest, so Cara is closest to 1.', undefined, [
      step('Ana ran 3/4 mile. How much is she short of 1 mile?', ['1/4', '3/4', '1/2', '1/3'], 0),
      step('Cara ran 5/6 mile. How much is she short of 1 mile?', ['5/6', '1/6', '1/2', '1/5'], 1),
      step('Ben is 1/3 short and Dev is 1/2 short. Which is the smallest gap?', ['1/4', '1/2', '1/3', '1/6'], 3),
    ]),
    q('u5-c5', 5, 'How many fractions with a denominator of 6 are more than 1/2 but less than 1?', ['0', '1', '2', '3'], 2, '3/6 is exactly half. 4/6 and 5/6 fit. That is 2.'),
  ],
  6: [
    q('u6-p1', 3, 'The top bar shows 1/2. How many parts of the bottom bar must you shade to show the same amount?', ['1', '2', '4', '8'], 2, 'The bottom bar has 8 parts. Half of 8 is 4.', { kind: 'bars', bars: [{ n: 1, d: 2 }, { n: 0, d: 8 }] }),
    q('u6-c1', 3, 'Which fraction is the same as 1/2?', ['2/3', '3/6', '2/5', '3/5'], 1, 'Half of 6 is 3. So 3/6 = 1/2.'),
    q('u6-c2', 3, '2/3 = ?/12. What is the missing number?', ['4', '6', '8', '9'], 2, '3 × 4 = 12. So 2 × 4 = 8.'),
    q('u6-c3', 4, 'Which fraction is NOT the same as 1/3?', ['2/6', '6/18', '4/12', '5/14'], 3, '5 × 3 = 15, not 14. So 5/14 is not 1/3.'),
    q('u6-c4', 4, 'Two pizzas are the same size. One is cut into 4 slices. One is cut into 8 slices. Mia eats 1 slice of the first pizza. How many slices of the second pizza is the same amount?', ['1', '2', '4', '8'], 1, '1/4 = 2/8. So 2 slices.', undefined, [
      step('The first pizza has 4 slices. Mia eats 1. What fraction did she eat?', ['1/3', '1/4', '1/8', '4/1'], 1),
      step('Cut each of those 4 slices in half. How many slices of the second pizza fit in 1/4?', ['1', '2', '8', '4'], 1),
    ]),
    q('u6-c5', 5, '3/5 = 12/?. What is the missing number?', ['15', '16', '18', '20'], 3, '3 × 4 = 12. So 5 × 4 = 20.'),
  ],
  7: [
    q('u7-p1', 3, 'Each bar is one whole. How much is shaded in all?', ['3/4', '4/7', '7/8', '1 and 3/4'], 3, 'One full bar is 1. The second has 3 of 4 shaded. So 1 and 3/4.', { kind: 'bars', bars: [{ n: 4, d: 4 }, { n: 3, d: 4 }] }),
    q('u7-c1', 3, '1/5 + 1/5 + 1/5 + 1/5 + 1/5 = ?', ['5/25', '1/5', '1', '5'], 2, '5 fifths make one whole.'),
    q('u7-c2', 3, 'Which is the same as 9/4?', ['1 and 1/4', '2', '2 and 1/4', '2 and 1/2'], 2, '8/4 is 2 wholes. 1/4 is left.'),
    q('u7-c3', 4, 'How many 1/6 parts make 2 wholes?', ['2', '6', '8', '12'], 3, '6 parts make one whole. 12 make 2.'),
    q('u7-c4', 4, 'Which sum does NOT make one whole?', ['1/4 + 3/4', '2/5 + 3/5', '3/8 + 4/8', '1/2 + 1/2'], 2, '3/8 + 4/8 = 7/8. That is not a whole.'),
    q('u7-c5', 5, 'Jo has 7/3 cups of flour. How many whole cups of flour does she have?', ['3', '2', '4', '7'], 1, '3/3 is 1 whole cup. 6/3 is 2 whole cups. 7/3 is 1/3 more than 6/3. So Jo has 2 whole cups, and 1/3 cup more.', undefined, [
      step('How many thirds make 1 whole cup?', ['6', '3', '7', '1'], 1),
      step('How many whole cups are 6/3?', ['3', '6', '2', '9'], 2),
      step('6/3 is 2 whole cups. 7/3 is 1/3 more. So 7/3 is the same as…', ['3 and 1/3', '2 and 1/3', '2 and 2/3', '1 and 1/3'], 1),
    ]),
  ],
  8: [
    q('u8-p1', 3, 'The big square is one whole. What decimal shows the shaded part?', ['0.035', '0.35', '3.5', '35'], 1, '35 of 100 small squares are shaded. That is 0.35.', { kind: 'grid', rows: 10, cols: 10, shaded: Array.from({ length: 35 }, (_, i) => i) }),
    q('u8-c1', 3, '3/10 + 25/100 = ?', ['28/110', '55/100', '28/100', '25/100'], 1, '3/10 is 30/100. 30/100 + 25/100 = 55/100.'),
    q('u8-c2', 3, 'Which decimal is the same as 3/10?', ['3.0', '0.03', '0.13', '0.3'], 3, '3 tenths is 0.3.'),
    q('u8-c3', 4, 'Which number is the biggest?', ['0.5', '0.45', '0.4', '0.38'], 0, '0.5 is 0.50. 50 hundredths is the most.'),
    q('u8-c4', 4, 'A ribbon is 9/10 meter long. You cut off 4/10 meter. Then you cut off 3/10 meter. How much is left?', ['1/10 meter', '2/10 meter', '3/10 meter', '5/10 meter'], 1, '9 − 4 − 3 = 2. So 2/10 meter.', undefined, [
      step('Start with 9/10 meter. Cut off 4/10 meter. What is left?', ['5/10 meter', '5/20 meter', '13/10 meters', '4/10 meter'], 0),
      step('Now cut 3/10 meter from 5/10 meter. What is left?', ['8/10 meter', '2/20 meter', '2/10 meter', '3/10 meter'], 2),
    ]),
    q('u8-c5', 5, '2 3/4 + 1 2/4 = ?', ['3 5/8', '4 1/4', '3 1/4', '4 3/4'], 1, '2 + 1 = 3 wholes. 3/4 + 2/4 = 5/4, which is 1 1/4. So 3 + 1 1/4 = 4 1/4.', undefined, [
      step('Add the wholes. 2 + 1 = ?', ['3', '2', '4', '1'], 0),
      step('Add the parts. 3/4 + 2/4 = ?', ['5/8', '5/4', '1/4', '6/4'], 1),
      step('5/4 is 1 1/4. 3 + 1 1/4 = ?', ['3 1/4', '4 3/4', '5 1/4', '4 1/4'], 3),
    ]),
  ],
  9: [
    q('u9-p1', 3, 'What fraction of the rectangle is shaded? Give it in simplest form.', ['3/5', '2/3', '3/4', '4/5'], 1, '8 of 12 squares are shaded. Divide the numerator and denominator by 4: 8/12 = 2/3.', { kind: 'grid', rows: 3, cols: 4, shaded: [0, 1, 2, 4, 5, 6, 8, 9] }),
    q('u9-c1', 3, 'Each piece of ribbon is 1/6 meter long. Lia puts 5 pieces end to end. How long is the line of ribbon?', ['5/30 meter', '5/11 meter', '5/6 meter', '6/5 meters'], 2, 'Each piece is 1/6. 5 pieces make 5 × 1/6, which is 5/6. So 5/6 meter.'),
    q('u9-c2', 3, '3/4 = ?/20. What is the missing number?', ['12', '15', '16', '5'], 1, '4 × 5 = 20. So multiply the numerator by 5 too: 3 × 5 = 15.'),
    q('u9-c3', 4, 'Which fraction is between 1/2 and 1?', ['2/5', '3/7', '5/12', '5/8'], 3, 'Half of 8 is 4. 5 is more than 4, so 5/8 is more than 1/2. The others are less than half.'),
    q('u9-c4', 4, 'Ana ate 2/3 of a pizza. Ben ate 3/4 of a pizza. Cal ate 5/6 of a pizza. The pizzas are the same size. Who ate the most?', ['Ana', 'Ben', 'Cal', 'Ana and Ben'], 2, 'Use twelfths: 2/3 = 8/12, 3/4 = 9/12, 5/6 = 10/12. Cal ate the most.', undefined, [
      step('Change 2/3 to twelfths.', ['4/12', '8/12', '6/12', '2/12'], 1),
      step('Change 3/4 to twelfths.', ['3/12', '4/12', '9/12', '7/12'], 2),
      step('Change 5/6 to twelfths.', ['5/12', '11/12', '6/12', '10/12'], 3),
    ]),
    q('u9-c5', 5, 'Rain fell on 6 days: 1/8, 3/8, 3/8, 5/8, 7/8, 7/8 inch. How much more rain fell on the wettest day than the driest?', ['8/8', '7/8', '6/8', '4/8'], 2, 'The wettest day had 7/8 inch and the driest had 1/8 inch. 7/8 − 1/8 = 6/8 inch.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 3, 3, 5, 7, 7] }, [
      step('What is the most rain on one day?', ['5/8', '1/8', '7/8', '6/8'], 2),
      step('What is the least rain on one day?', ['1/8', '3/8', '0', '7/8'], 0),
      step('7/8 − 1/8 = ?', ['8/8', '6/8', '6/16', '7/8'], 1),
    ]),
  ],
  10: [
    q('u10-p1', 3, 'Bar A shows 3/4. Bar B shows 1/2. How much more of bar A is shaded?', ['1/4', '2/6', '1/8', '3/8'], 0, '1/2 = 2/4. 3/4 − 2/4 = 1/4.', { kind: 'bars', bars: [{ n: 3, d: 4, label: 'A' }, { n: 1, d: 2, label: 'B' }] }),
    q('u10-c1', 3, '1 1/2 + 2 1/2 = ?', ['3', '3 1/2', '4', '4 1/2'], 2, '1 + 2 = 3 wholes. 1/2 + 1/2 = 1 more whole. So 4.'),
    q('u10-c2', 3, 'What is 1/2 + 1/3?', ['2/5', '5/6', '2/6', '1/6'], 1, 'Use sixths: 1/2 = 3/6 and 1/3 = 2/6. 3/6 + 2/6 = 5/6.'),
    q('u10-c3', 4, '3 1/4 − 1 3/4 = ?', ['1 1/2', '2 1/2', '1 3/4', '1 1/4'], 0, 'Trade one whole: 3 1/4 = 2 5/4. 2 5/4 − 1 3/4 = 1 2/4 = 1 1/2.', undefined, [
      step('1/4 is less than 3/4. Trade one whole for 4/4. 3 1/4 is the same as…', ['2 5/4', '2 4/4', '2 1/4', '3 5/4'], 0),
      step('2 5/4 − 1 3/4 = ?', ['1 8/4', '1 2/4', '1 1/4', '2 2/4'], 1),
      step('1 2/4 is the same as…', ['1 1/4', '2', '1 1/2', '1 1/3'], 2),
    ]),
    q('u10-c4', 4, 'Without adding exactly, which sum is more than 1?', ['1/3 + 1/4', '2/5 + 1/2', '3/8 + 1/2', '5/6 + 1/2'], 3, '5/6 is more than 1/2, and two halves make 1. So 5/6 + 1/2 is more than 1. In the other sums, the first fraction is less than 1/2.', undefined, [
      step('Is 5/6 more or less than 1/2?', ['Less than 1/2', 'More than 1/2', 'Equal to 1/2', "You can't tell"], 1),
      step('5/6 is more than 1/2. So is 5/6 + 1/2 more or less than 1?', ['Less than 1', 'Equal to 1', 'More than 1', "You can't tell"], 2),
    ]),
    q('u10-c5', 5, 'A jug has 5/6 liter of juice. Mia pours out 1/3 liter. Leo pours out 1/4 liter. How much juice is left?', ['1/6 liter', '3/13 liter', '1/4 liter', '5/12 liter'], 2, 'Use twelfths: 10/12 − 4/12 − 3/12 = 3/12 = 1/4 liter.', undefined, [
      step('Change 5/6 to twelfths.', ['10/12', '11/12', '5/12', '6/12'], 0),
      step('Change 1/3 and 1/4 to twelfths.', ['3/12 and 4/12', '4/12 and 3/12', '3/12 and 3/12', '1/12 and 1/12'], 1),
      step('10/12 − 4/12 − 3/12 = ?', ['7/12', '4/12', '3/12', '3/36'], 2),
    ]),
  ],
  11: [
    q('u11-p1', 3, 'The square is one whole. The shaded part is 2/3 of 3/4 of it. What fraction of the whole square is shaded?', ['5/12', '6/12', '5/7', '8/12'], 1, '12 equal parts. 6 are shaded: 2/3 × 3/4 = 6/12.', { kind: 'grid', rows: 3, cols: 4, shaded: [0, 1, 2, 4, 5, 6] }),
    q('u11-c1', 3, 'There are 20 apples. 1/4 of them are red. How many apples are red?', ['4', '5', '8', '10'], 1, '20 in 4 equal groups is 5 each.'),
    q('u11-c2', 3, 'Without multiplying, which is less than 12?', ['3/2 × 12', '2/3 × 12', '5/4 × 12', '4/4 × 12'], 1, '2/3 is less than 1, so 2/3 × 12 is less than 12.'),
    q('u11-c3', 4, 'What is 3/4 of 2/3?', ['5/7', '6/7', '6/12', '5/12'], 2, 'Multiply the numerators: 3 × 2 = 6. Multiply the denominators: 4 × 3 = 12. So 6/12 (that is 1/2).'),
    q('u11-c4', 4, 'Leo has 30 cards. He gives 1/5 of them to Ana and 1/3 of them to Ben. How many cards does Leo keep?', ['14', '16', '8', '20'], 0, '1/5 of 30 is 6. 1/3 of 30 is 10. 30 − 6 − 10 = 14.', undefined, [
      step('What is 1/5 of 30?', ['5', '25', '6', '10'], 2),
      step('What is 1/3 of 30?', ['10', '3', '20', '15'], 0),
      step('30 − 6 − 10 = ?', ['16', '24', '20', '14'], 3),
    ]),
    q('u11-c5', 5, 'A class has 24 students. 3/4 of them like pizza. 1/2 of those like extra cheese. How many like extra cheese?', ['9', '12', '18', '6'], 0, '3/4 of 24 is 18. 1/2 of 18 is 9.', undefined, [
      step('What is 1/4 of 24?', ['6', '4', '8', '20'], 0),
      step('What is 3/4 of 24?', ['21', '18', '12', '6'], 1),
      step('What is 1/2 of 18?', ['36', '8', '9', '16'], 2),
    ]),
  ],
  12: [
    q('u12-p1', 3, 'The line is 1 meter long. A snail crawls from 0 to the dot. How far is that?', ['34 centimeters', '25 centimeters', '75 centimeters', '70 centimeters'], 2, 'The dot is at 3/4. 1 meter is 100 centimeters, and 3/4 of 100 is 75 centimeters.', { kind: 'line', n: 3, d: 4 }),
    q('u12-c1', 3, '1/2 of a pizza is shared fairly by 4 friends. What part of the whole pizza does each friend get?', ['1/6', '1/8', '1/2', '4/2'], 1, 'Split the half into 4 equal shares. Each share is 1/8 of the whole pizza.'),
    q('u12-c2', 3, 'How many 1/3 cups of rice fill 4 cups?', ['3', '7', '4', '12'], 3, '3 thirds fill 1 cup. 4 cups need 4 × 3 = 12.'),
    q('u12-c3', 4, 'Three boards are 1/2 meter, 3/8 meter and 1/4 meter long. How long are they together?', ['1 1/8 meters', '1 meter', '7/8 meter', '1 1/4 meters'], 0, 'Use eighths: 4/8 + 3/8 + 2/8 = 9/8 = 1 1/8 meters.', undefined, [
      step('Change 1/2 to eighths.', ['4/8', '2/8', '1/8', '5/8'], 0),
      step('Change 1/4 to eighths.', ['3/8', '4/8', '2/8', '1/8'], 2),
      step('4/8 + 3/8 + 2/8 = ?', ['7/8', '9/24', '8/8', '9/8'], 3),
    ]),
    q('u12-c4', 4, 'Each team shares its cakes fairly. On which team does each kid get the most cake? A: 2 cakes, 5 kids. B: 3 cakes, 8 kids. C: 1 cake, 3 kids. D: 3 cakes, 10 kids.', ['Team A', 'Team B', 'Team C', 'Team D'], 0, 'Team A gets 2/5 each and Team B gets 3/8 each. 2/5 = 16/40 and 3/8 = 15/40. C and D get even less.', undefined, [
      step('How much does each kid on Team A get?', ['2/5', '5/2', '1/5', '3/5'], 0),
      step('How much does each kid on Team B get?', ['3/11', '8/3', '3/8', '1/8'], 2),
      step('Use 40ths: 2/5 = 16/40 and 3/8 = 15/40. Which is bigger?', ['3/8', 'Same', '2/5', 'You can\'t tell'], 2),
    ]),
    q('u12-c5', 5, 'Six beakers hold 1/8, 1/8, 2/8, 4/8, 4/8, 6/8 liter. Share the total equally. How many liters go in each?', ['18/8', '3/8', '6/8', '1/8'], 1, 'Together they hold 18/8 liter. 18/8 shared by 6 beakers is 3/8 liter in each.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 1, 2, 4, 4, 6] }, [
      step('Add all six amounts. What is the total?', ['12/8', '18/8', '6/8', '18/48'], 1),
      step('Share 18/8 liter among 6 beakers. How much goes in each?', ['3/8', '18/8', '12/8', '3/48'], 0),
    ]),
  ],
  13: [
    q('u13-p1', 3, 'These marbles are in a bag. You pick one without looking. What is the chance it is dark?', ['3/7', '3/10', '7/10', '1/3'], 1, '10 marbles. 3 are dark. The chance is 3/10.', { kind: 'dots', rows: 2, cols: 5, shaded: [0, 3, 7] }),
    q('u13-c1', 3, 'A cube has the numbers 1, 2, 3, 4, 5 and 6. You roll it once. What is the chance of an even number?', ['1/6', '2/6', '3/6', '4/6'], 2, '2, 4 and 6 are even. That is 3 of 6.'),
    q('u13-c2', 3, 'A recipe uses 2/3 cup of milk. How much milk do 3 batches need?', ['6/9 cup', '2 cups', '5/3 cups', '3 cups'], 1, '3 × 2/3 = 6/3. That is 2 cups.'),
    q('u13-c3', 4, 'A garden bed is 3/4 meter long and 2/3 meter wide. What is its area?', ['5/7 square meter', '6/12 square meter', '5/12 square meter', '9/8 square meter'], 1, 'Multiply the side lengths: 3/4 × 2/3 = 6/12 square meter. That is the same as 1/2 square meter.'),
    q('u13-c4', 4, 'A spinner has 12 equal parts. 3 are red, 4 are blue, and the rest are green. What is the chance of green?', ['3/12', '7/12', '5/12', '4/12'], 2, '3 + 4 = 7 are red or blue. 12 − 7 = 5 are green: 5/12.', undefined, [
      step('How many parts are red or blue?', ['7', '12', '1', '5'], 0),
      step('How many parts are green?', ['7', '5', '12', '4'], 1),
      step('What is the chance of green?', ['12/5', '5/7', '7/12', '5/12'], 3),
    ]),
    q('u13-c5', 5, 'Pancakes for 4 people use 3/4 cup of flour. How much flour do pancakes for 6 people use?', ['1 1/4 cups', '1 1/8 cups', '1 1/2 cups', '3/8 cup'], 1, '2 people need half of 3/4, which is 3/8. 6 people need 3/4 + 3/8 = 6/8 + 3/8 = 9/8 = 1 1/8 cups.', undefined, [
      step('4 people need 3/4 cup. How much do 2 people need?', ['3/4 cup', '3/8 cup', '3/2 cups', '1/4 cup'], 1),
      step('6 people is 4 people plus 2 people. Which sum?', ['3/4 + 1/4', '3/4 + 3/4', '3/4 + 3/8', '3/8 + 3/8'], 2),
      step('6/8 + 3/8 = ?', ['9/16', '3/8', '6/8', '9/8'], 3),
    ]),
  ],
  14: [
    q('u14-p1', 3, 'The big square is one whole. What percent is shaded?', ['4%', '40%', '60%', '14%'], 1, '40 of 100 small squares are shaded. That is 40%.', { kind: 'grid', rows: 10, cols: 10, shaded: Array.from({ length: 40 }, (_, i) => i) }),
    q('u14-c1', 3, 'Which is the same as 3/4?', ['34%', '0.34', '75%', '0.43'], 2, '3/4 = 75/100 = 75%.'),
    q('u14-c2', 3, 'Put these in order, smallest first: 0.6, 1/2, 55%', ['1/2, 55%, 0.6', '0.6, 55%, 1/2', '55%, 1/2, 0.6', '1/2, 0.6, 55%'], 0, 'Change them all to percent: 0.6 = 60%, 1/2 = 50%. So 50%, 55%, 60%.'),
    q('u14-c3', 4, 'A quiz has 20 questions. Zoe gets 17 right. What percent did she get right?', ['17%', '80%', '85%', '90%'], 2, '17/20 = 85/100 = 85%.', undefined, [
      step('Multiply the numerator and denominator by 5. 17/20 = ?', ['85/100', '17/100', '22/25', '34/100'], 0),
      step('85/100 is what percent?', ['8.5%', '85%', '15%', '0.85%'], 1),
    ]),
    q('u14-c4', 4, 'A garden is 2/5 flowers and 0.3 vegetables. The rest is grass. What percent is grass?', ['70%', '20%', '30%', '35%'], 2, '2/5 = 40% and 0.3 = 30%. 100% − 40% − 30% = 30%.', undefined, [
      step('2/5 is what percent?', ['40%', '25%', '2.5%', '20%'], 0),
      step('0.3 is what percent?', ['3%', '30%', '0.3%', '300%'], 1),
      step('100% − 40% − 30% = ?', ['10%', '70%', '40%', '30%'], 3),
    ]),
    q('u14-c5', 5, 'Leo paints 3/10 of a fence on Monday and 4/10 on Tuesday. What percent of the fence is still not painted?', ['70%', '30%', '3%', '37%'], 1, '3/10 + 4/10 = 7/10 is painted. 10/10 − 7/10 = 3/10 is left. 3/10 = 30/100 = 30%.', undefined, [
      step('How much of the fence does Leo paint in the two days?', ['7/20', '7/10', '1/10', '12/10'], 1),
      step('The whole fence is 10/10. How much is not painted?', ['3/10', '7/10', '10/7', '3/20'], 0),
      step('3/10 is what percent?', ['3%', '0.3%', '30%', '70%'], 2),
    ]),
  ],
  15: [
    q('u15-p1', 3, 'The shaded part is 6 stickers. How many stickers are in the whole bar?', ['6', '12', '18', '24'], 2, 'The shaded part is 2 of 6 equal parts, so each part is 3. 6 parts is 18.', { kind: 'bars', bars: [{ n: 2, d: 6 }] }),
    q('u15-c1', 3, '6 marbles are 1/4 of a bag. How many marbles are in the bag?', ['10', '24', '18', '30'], 1, '1 fourth is 6. 4 fourths is 4 × 6 = 24.'),
    q('u15-c2', 3, 'Sam says 2/7 + 3/7 = 5/14. What is the right answer?', ['5/14', '6/7', '5/7', '6/14'], 2, 'The parts stay the same size. 2 + 3 = 5, so 5/7.'),
    q('u15-c3', 4, '12 cards are 3/5 of a pile. How many cards are in the pile?', ['15', '20', '36', '60'], 1, '3 fifths is 12, so 1 fifth is 4. 5 fifths is 20.', undefined, [
      step('3 fifths is 12. What is 1 fifth?', ['60', '4', '3', '36'], 1),
      step('The whole is 5 fifths. 5 × 4 = ?', ['9', '54', '20', '15'], 2),
    ]),
    q('u15-c4', 4, 'Mia has 36 beads. She uses 1/4 of them. Then she uses 1/3 of the rest. How many beads are left?', ['9', '27', '18', '12'], 2, '1/4 of 36 is 9, so 27 are left. 1/3 of 27 is 9, so 18 are left.', undefined, [
      step('What is 1/4 of 36?', ['32', '9', '4', '27'], 1),
      step('36 − 9 = ?', ['18', '45', '27', '9'], 2),
      step('1/3 of 27 is 9. 27 − 9 = ?', ['9', '27', '36', '18'], 3),
    ]),
    q('u15-c5', 5, 'A jug holds 3/4 liter. A cup holds 1/8 liter. How many cups can you fill from the jug?', ['3', '4', '8', '6'], 3, '3/4 = 6/8. Six 1/8-liter cups fit.', undefined, [
      step('Write 3/4 in eighths.', ['7/8', '3/8', '6/8', '4/8'], 2),
      step('How many 1/8s are in 6/8?', ['6', '48', '8', '1'], 0),
    ]),
  ],
};

/** Second versions of some puzzles, keyed by the puzzle they take turns with (same unit, same points; most ask the same
    standard). A unit keeps its puzzle count and top score: one attempt shows a slot's first version, the next its second
    (see challengeAttempt). Each one is the second puzzle for a standard that had only one. */
export const CHALLENGE_ALTERNATES: Record<string, ChallengeQuestion> = {
  // 3.G.2: two halves of the same square with different shapes. Equal area, not equal shape.
  'u1-p1': puzzle('u1-c6', 3, 'Both squares are the same size. Which shaded part covers more space?', ['A', 'B', 'They cover the same space', "You can't tell"], 2,
    'Each square is cut into 2 equal parts, so each shaded part is 1/2. A triangle and a rectangle can cover the same space.',
    { kind: 'areas', areas: [{ cut: 'halves-triangles', shaded: [0], label: 'A' }, { cut: 'rect-halves', shaded: [0], label: 'B' }] },
    { 0: 'A long triangle can look like more. Check how many equal parts each square has.', 1: 'A wide piece can look like more. Check how many equal parts each square has.',
      3: 'You can tell! Count the equal parts in each square.' }),
  // 3.MD.4: measure a length to the nearest fourth inch.
  'u4-c3': puzzle('u4-c6', 4, 'The blue ribbon starts at zero and ends at a tick with no number. Use the ruler. How long is it in inches?', ['2 inches', '2 1/4 inches', '2 2/4 inches', '9 inches'], 1,
    'Each inch has 4 equal spaces. The ribbon passes 2 inches, then 1 more space. So 2 1/4 inches.',
    { kind: 'ruler', denominator: 4, wholes: 3, end: 9 },
    { 0: 'Count every space up to the very end of the ribbon.', 3: '9 counts the small spaces. Each small space is 1/4 inch, not 1 inch.' }),
  // 3.NF.3c: a whole number as a fraction.
  'u7-c3': puzzle('u7-c6', 4, 'Each bar is one whole. Which fraction is the same as the 3 shaded wholes?', ['3/4', '4/3', '12/4', '3/12'], 2,
    'Each whole is 4 fourths. 3 wholes are 4 + 4 + 4 = 12 fourths. So 3 = 12/4.',
    { kind: 'bars', bars: [{ n: 4, d: 4 }, { n: 4, d: 4 }, { n: 4, d: 4 }] },
    { 0: '3/4 is less than 1 whole. Count the shaded fourths in all 3 bars.', 1: 'That is upside down. The parts in one whole go in the denominator.',
      3: '3/12 is less than 1 whole. The denominator is the parts in one whole, not in all 3 bars.' }),
  // 4.NF.3a: the missing part, by taking away like fractions.
  'u8-c2': puzzle('u8-c6', 3, 'Mia wants 7/8 of the bar shaded. She has shaded 3/8. How much more must she shade?', ['3/8', '4/8', '5/8', '10/8'], 1,
    '7/8 − 3/8 = 4/8. She must shade 4 more eighths.',
    { kind: 'bars', bars: [{ n: 3, d: 8 }] },
    { 0: '3/8 is what she has shaded already. Find the part still missing.', 2: '5/8 would fill the whole bar. She wants 7/8, not 8/8.',
      3: 'That adds 3/8 and 7/8. Find the gap between them instead.' }),
  // 4.NF.4a: a fraction as a number of unit fractions.
  'u8-c4': puzzle('u8-c7', 4, 'Each bar is one whole. Which is the same as the shaded part?', ['2 × 1/5', '5 × 1/7', '7 × 1/5', '7 × 1/10'], 2,
    'Each part is 1/5. 7 parts are shaded. So the shaded part is 7 × 1/5, which is 7/5.',
    { kind: 'bars', bars: [{ n: 5, d: 5 }, { n: 2, d: 5 }] },
    { 0: '2 counts the bars. Count the shaded parts instead.', 1: 'The numbers are swapped. Which number tells the size of one part?',
      3: 'Each bar is a whole by itself. Its parts are fifths, not tenths.' }),
  // 4.NF.7: compare two decimals by thinking of both as hundredths.
  'u8-c3': puzzle('u8-c9', 4, 'The big square is one whole. Which decimal is bigger than the shaded part?', ['0.06', '0.58', '0.65', '0.5'], 2,
    'The shaded part is 6 tenths. That is 0.60, or 60 hundredths. 0.65 is 65 hundredths, and 65 is more than 60.',
    { kind: 'grid', rows: 10, cols: 10, shaded: Array.from({ length: 100 }, (_, i) => i).filter((i) => i % 10 < 6) },
    { 0: '0.06 is only 6 small squares. The shaded part is 6 whole columns.', 1: '0.58 is 58 hundredths. The shaded part is 60 hundredths.',
      3: '0.5 is 5 columns. The shaded part has 6 columns.' }),
  // 4.NF.5: tenths as hundredths, to add them.
  'u8-c1': puzzle('u8-c8', 3, 'The big square is one whole. 7/10 of it is shaded. Which sum makes exactly 1 whole?', ['7/10 + 3/100', '7/100 + 3/10', '7/10 + 30/100', '70/10 + 30/100'], 2,
    '30/100 is the same as 3/10. 7/10 + 3/10 = 10/10, which is 1 whole.',
    { kind: 'grid', rows: 10, cols: 10, shaded: Array.from({ length: 100 }, (_, i) => i).filter((i) => i % 10 < 7) },
    { 0: '3/100 is only 3 small squares. The empty part is 3 whole columns.', 1: '7/100 is only 7 small squares. Start with the 7 shaded columns.',
      3: '70/10 is 7 wholes. That is far more than 1 whole.' }),
  // 4.NF.4b: a whole number times a fraction.
  'u9-c2': puzzle('u9-c6', 3, 'Each bar is one whole. What is 4 × 2/3?', ['8/12', '6/3', '8/3', '2/3'], 2,
    '4 × 2/3 = 2/3 + 2/3 + 2/3 + 2/3 = 8/3.',
    { kind: 'bars', bars: [{ n: 2, d: 3 }, { n: 2, d: 3 }, { n: 2, d: 3 }, { n: 2, d: 3 }] },
    { 0: 'The parts stay thirds. Multiply only the numerator.', 1: 'That adds 4 and 2. 4 × 2/3 means 4 groups of 2/3.',
      3: '2/3 is one group. Count the shaded parts in all 4 bars.' }),
  // 4.NF.4c: a story that multiplies a fraction by a whole number.
  'u9-c3': puzzle('u9-c7', 4, 'One lap of the track is 3/4 mile, like the shaded bar. Ben runs 6 laps. How far does he run?', ['3/4 mile', '18/24 mile', '4 2/4 miles', '6 3/4 miles'], 2,
    '6 × 3/4 = 18/4. 16/4 is 4 miles, and 2/4 is left. So 4 2/4 miles.',
    { kind: 'bars', bars: [{ n: 3, d: 4 }] },
    { 0: '3/4 mile is one lap. Ben runs 6 laps.', 1: 'The parts stay fourths. Multiply only the numerator.',
      3: 'That puts the 6 laps next to 3/4. Each lap is less than 1 mile.' }),
  // 4.MD.4: add fractions read from a line plot.
  'u9-c5': puzzle('u9-c8', 5, 'The line plot shows how much 8 seedlings grew: 2/8, 3/8, 3/8, 3/8, 5/8, 6/8, 6/8, 7/8 inch. How much did the 3/8-inch seedlings grow in all?', ['3/8 inch', '9/24 inch', '9/8 inches', '3 inches'], 2,
    '3 seedlings grew 3/8 inch each. 3/8 + 3/8 + 3/8 = 9/8 inches.',
    { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 3, 3, 3, 5, 6, 6, 7] },
    { 0: '3/8 inch is one seedling. Count the Xs at 3/8.', 1: 'The parts stay eighths. Add only the numerators.',
      3: '3 counts the Xs. Each of those Xs stands for 3/8 inch.' }),
  // 5.NF.5: the size of a product from the size of the factor, without multiplying.
  'u11-c2': puzzle('u11-c6', 3, 'The dot is at a fraction. You multiply 20 by that fraction. Is the answer more or less than 20?', ['Less than 20', 'Equal to 20', 'More than 20', "You can't tell"], 2,
    'The dot is at 5/4, which is more than 1. Multiplying by more than 1 makes 20 bigger: 20 × 5/4 = 25.',
    { kind: 'line', n: 5, d: 4, wholes: 2 },
    { 0: 'Not every fraction makes it smaller. Is the dot before or after 1?', 1: 'Only 20 × 1 is equal to 20. The dot is not at 1.',
      3: 'You can tell! Compare the dot with 1.' }),
  // 5.NF.3: a fraction as a sharing (division) story.
  'u12-c4': puzzle('u12-c6', 4, '5 friends share 3 pancakes fairly. How much does each friend get?', ['5/3 pancakes', '1/5 pancake', '3/5 pancake', '3/15 pancake'], 2,
    'Cut each pancake into 5 equal parts. Each friend gets 1 part of each pancake: 3/5 pancake. So 3 ÷ 5 = 3/5.',
    { kind: 'bars', bars: [{ n: 0, d: 5 }, { n: 0, d: 5 }, { n: 0, d: 5 }] },
    { 0: 'That is upside down. Each friend gets less than 1 pancake.', 1: '1/5 is one part of one pancake. Each friend gets a part of every pancake.',
      3: 'The denominator is the parts in one pancake, not in all 3.' }),
  // 5.NF.7a: a unit fraction shared by a whole number, two ways that come out the same.
  'u12-c1': puzzle('u12-c7', 3, '2 kids share 1/3 of a pizza fairly. 3 kids share 1/2 of a same-size pizza fairly. Who gets more each?', ['The 2 kids', 'The 3 kids', 'They get the same', "You can't tell"], 2,
    '1/3 shared by 2 is 1/6 each. 1/2 shared by 3 is 1/6 each. They get the same.',
    { kind: 'bars', bars: [{ n: 1, d: 3 }, { n: 1, d: 2 }] },
    { 0: 'Fewer kids, but a smaller part to share too. Find one share in each group.', 1: 'A bigger part, but more kids too. Find one share in each group.',
      3: 'You can tell! Find one share in each group, then compare.' }),
  // 5.MD.1: feet and a half foot in inches.
  'u12-p1': puzzle('u12-c8', 3, 'Each bar is 1 foot. A ribbon is as long as the shaded part. How many inches long is it?', ['24 inches', '25 inches', '30 inches', '6 inches'], 2,
    '1 foot is 12 inches. 2 feet is 24 inches. 1/2 foot is 6 inches. 24 + 6 = 30 inches.',
    { kind: 'bars', bars: [{ n: 2, d: 2 }, { n: 2, d: 2 }, { n: 1, d: 2 }] },
    { 0: 'That is the 2 full feet. Add the half foot too.', 1: 'A foot is 12 inches, not 10.', 3: 'That is only the half foot. Add the 2 full feet.' }),
  // 5.MD.2: add every length on a line plot.
  'u12-c5': puzzle('u12-c9', 5, 'The line plot shows six beetles: 1/4, 1/4, 2/4, 3/4, 3/4, 3/4 inch. They line up end to end. How long is the line?', ['3 1/4 inches', '13/24 inch', '6 inches', '3/4 inch'], 0,
    'Add all six: 1/4 + 1/4 + 2/4 + 3/4 + 3/4 + 3/4 = 13/4. That is 3 1/4 inches.',
    { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 1, 2, 3, 3, 3] },
    { 1: 'The parts stay fourths. Add only the numerators.', 2: '6 counts the beetles. Each beetle is less than 1 inch.', 3: '3/4 inch is one beetle. Add all six lengths.' }),
  // 5.NF.4b: the area of a rectangle with fraction sides, by tiling.
  'u13-c3': puzzle('u13-c6', 4, 'The big square is 1 meter on each side. The shaded part is 2/5 meter by 3/4 meter. What is its area?', ['5/9 square meter', '6/20 square meter', '5/20 square meter', '6/9 square meter'], 1,
    'The square has 4 rows of 5 equal tiles: 20 tiles. The shaded part covers 3 rows of 2 tiles: 6 tiles. 2/5 × 3/4 = 6/20 square meter.',
    { kind: 'areas', areas: [{ cut: 'grid-5x4', shaded: [0, 1, 5, 6, 10, 11] }] },
    { 0: 'That adds the numerators and the denominators. Count the tiles instead.', 2: 'That adds 2 and 3. Count the shaded tiles.',
      3: 'The denominator counts all the tiles in the big square.' }),
};

const unitOfPuzzle = (id: string) => Number(/^u(\d+)-/.exec(id)![1]);

/** The puzzles one attempt shows: even attempts (0, 2, …) the first version of each slot, odd attempts the second
    version where a slot has one. Same count, same points, same top score either way. */
export const challengeAttempt = (unit: number, attempt: number): ChallengeQuestion[] =>
  (CHALLENGES[unit] ?? []).map((item) => (attempt % 2 === 1 && CHALLENGE_ALTERNATES[item.id]) || item);

/** Every version of every puzzle in a unit (first versions, then second versions). */
export const challengePuzzlesOfUnit = (unit: number): ChallengeQuestion[] =>
  [...(CHALLENGES[unit] ?? []), ...(CHALLENGES[unit] ?? []).flatMap((item) => CHALLENGE_ALTERNATES[item.id] ?? [])];

/** Every puzzle version in every unit. */
export const ALL_CHALLENGE_PUZZLES: ChallengeQuestion[] = Object.keys(CHALLENGES).flatMap((unit) => challengePuzzlesOfUnit(Number(unit)));

for (const [primary, alternate] of Object.entries(CHALLENGE_ALTERNATES)) {
  const first = (CHALLENGES[unitOfPuzzle(primary)] ?? []).find((item) => item.id === primary);
  if (!first || first.points !== alternate.points || unitOfPuzzle(alternate.id) !== unitOfPuzzle(primary)) throw new Error(`${alternate.id} does not fit the ${primary} slot`);
}

for (const questions of [ALL_CHALLENGE_PUZZLES]) {
  for (const question of questions) {
    question.standards = standardsForChallenge(question.id);
    question.steps = question.steps?.map(step => ({ ...step, standards: [...question.standards!] }));
  }
}

/** Why a wrong choice is wrong: the puzzle's own reason, else the slip the choice shows; null when neither is known. */
export const challengeWrongReason = (question: ChallengeQuestion, chosen: number): string | null =>
  chosen === question.correct ? null : question.reasons?.[chosen] ?? wrongChoiceReason(question.prompt, question.choices, question.correct, chosen);

export const challengeMaxPoints = (unit: number) => (CHALLENGES[unit] ?? []).reduce((sum, item) => sum + item.points, 0);

/** Trophy for a score: gold for a perfect run, silver for most points, bronze for finishing. */
export function challengeTrophy(score: number, unit: number): 'gold' | 'silver' | 'bronze' {
  const max = challengeMaxPoints(unit);
  return score >= max ? 'gold' : score >= Math.ceil(max * 0.6) ? 'silver' : 'bronze';
}
