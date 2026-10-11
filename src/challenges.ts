/* Kangaroo-style Unit challenges: short puzzles with five choices (A–E), worth 3, 4 or 5 points.
   Points count only on the first try. Each unit's challenge unlocks when all its lessons are done. All 14 units have one. */
import { standardsForChallenge } from './standard-catalog';

/** Pictures for puzzles. None of them print the answer: the picture is the puzzle. */
export type ChallengeFigure =
  | { kind: 'grid'; rows: number; cols: number; shaded: number[] }
  | { kind: 'dots'; rows: number; cols: number; shaded: number[] }
  | { kind: 'bars'; bars: { n: number; d: number; label?: string }[] }
  | { kind: 'line'; n: number; d: number }
  | { kind: 'fold'; folds: number[] };

/** One small step of a guided walk-through for a long word problem. */
export type ChallengeStep = { prompt: string; choices: [string, string, string]; correct: number; standards?: string[] };

export type ChallengeQuestion = {
  id: string;
  points: 3 | 4 | 5;
  prompt: string;
  choices: [string, string, string, string, string];
  correct: number;
  explanation: string;
  figure?: ChallengeFigure;
  steps?: ChallengeStep[];
  standards?: string[];
};

const q = (id: string, points: 3 | 4 | 5, prompt: string, choices: ChallengeQuestion['choices'], correct: number, explanation: string, figure?: ChallengeFigure, steps?: ChallengeStep[]): ChallengeQuestion =>
  ({ id, points, prompt, choices, correct, explanation, figure, steps });
const step = (prompt: string, choices: ChallengeStep['choices'], correct: number): ChallengeStep => ({ prompt, choices, correct });

export const CHALLENGES: Record<number, ChallengeQuestion[]> = {
  1: [
    q('u1-p1', 3, 'What fraction of the rectangle is shaded?', ['1/3', '3/8', '3/5', '5/8', '3/4'], 1, '8 equal squares. 3 are shaded. So 3/8.', { kind: 'grid', rows: 2, cols: 4, shaded: [0, 3, 5] }),
    q('u1-c1', 3, 'A chocolate bar has 12 equal squares. Ana eats 1/4 of it. How many squares does she eat?', ['2', '3', '4', '6', '8'], 1, '12 in 4 equal groups is 3 each.'),
    q('u1-c2', 3, 'A pizza has 8 equal slices. Tom eats 1 slice. Mia eats 2 slices. What fraction is left?', ['3/8', '4/8', '5/8', '6/8', '7/8'], 2, '8 − 1 − 2 = 5 slices left. So 5/8.'),
    q('u1-c3', 4, 'Sam folds a paper strip in half. Then he folds it in half again. He opens it. What fraction is each piece?', ['1/2', '1/3', '1/4', '1/6', '1/8'], 2, 'Half, then half again, makes 4 equal pieces.', { kind: 'fold', folds: [2, 2] }, [
      step('Sam folds the strip in half once. How many pieces will it open into?', ['2', '1', '4'], 0),
      step('He folds it in half again. Each half splits in 2. How many pieces now?', ['3', '4', '6'], 1),
      step('The strip opens into 4 equal pieces. What is 1 piece?', ['1/2', '1/8', '1/4'], 2),
    ]),
    q('u1-c4', 4, '1/5 of a ribbon is 2 cm long. How long is the whole ribbon?', ['5 cm', '7 cm', '8 cm', '10 cm', '12 cm'], 3, '5 pieces of 2 cm make 10 cm.'),
    q('u1-c5', 5, 'A bar is cut into equal parts. 3 parts are shaded. That is 1/4 of the bar. How many parts are there in all?', ['4', '7', '9', '12', '15'], 3, '3 parts is 1/4. So 4 groups of 3 makes 12.', undefined, [
      step('3 shaded parts are 1/4 of the bar. How many quarters make the whole bar?', ['2', '4', '3'], 1),
      step('Each quarter has 3 parts. How many parts do 4 quarters have?', ['12', '7', '9'], 0),
    ]),
  ],
  2: [
    q('u2-p1', 3, 'What fraction of the dots are shaded?', ['1/4', '1/3', '1/2', '2/3', '3/4'], 1, '4 of 12 dots are shaded. 12 in 3 groups of 4, so 1/3.', { kind: 'dots', rows: 3, cols: 4, shaded: [1, 4, 6, 11] }),
    q('u2-c1', 3, 'The cakes are all the same size. Which piece is the biggest?', ['1/2', '1/3', '1/5', '1/8', '1/10'], 0, 'Fewer pieces means bigger pieces. Halves are biggest.'),
    q('u2-c2', 3, 'There are 20 apples. 1/4 of them are red. How many apples are red?', ['4', '5', '8', '10', '16'], 1, '20 in 4 equal groups is 5 each.'),
    q('u2-c3', 4, 'There are 18 marbles. 2/3 of them are blue. How many marbles are NOT blue?', ['3', '6', '9', '12', '15'], 1, '1/3 of 18 is 6. The other 1/3 is not blue: 6.', undefined, [
      step('What is 1/3 of 18?', ['3', '6', '9'], 1),
      step('2/3 are blue. What fraction is NOT blue?', ['1/3', '2/3', '1/2'], 0),
      step('So how many marbles are not blue?', ['12', '9', '6'], 2),
    ]),
    q('u2-c4', 4, '1/3 of a class is 8 kids. How many kids are in the class?', ['11', '16', '20', '24', '32'], 3, '3 groups of 8 makes 24.', undefined, [
      step('8 kids are 1/3 of the class. How many thirds make the whole class?', ['2', '3', '8'], 1),
      step('3 groups of 8 kids is how many kids?', ['11', '16', '24'], 2),
    ]),
    q('u2-c5', 5, 'Lily has 24 stickers. She gives 1/2 to Ben. Then she gives 1/3 of what is left to Ana. How many stickers does Lily keep?', ['4', '6', '8', '10', '12'], 2, 'Half of 24 is 12. 1/3 of 12 is 4. 12 − 4 = 8.', undefined, [
      step('Lily gives 1/2 of her 24 stickers to Ben. How many are left?', ['12', '6', '8'], 0),
      step('She gives 1/3 of those 12 to Ana. How many is that?', ['3', '4', '6'], 1),
      step('12 − 4 = ?', ['9', '6', '8'], 2),
    ]),
  ],
  3: [
    q('u3-p1', 3, 'Which bar has more than half shaded?', ['A', 'B', 'C', 'D', 'E'], 3, 'Bar D is 5 of 8. Half of 8 is 4, and 5 is more.', { kind: 'bars', bars: [{ n: 2, d: 5, label: 'A' }, { n: 3, d: 7, label: 'B' }, { n: 4, d: 9, label: 'C' }, { n: 5, d: 8, label: 'D' }, { n: 1, d: 3, label: 'E' }] }),
    q('u3-c1', 3, 'Which fraction is more than 1/2?', ['2/5', '3/7', '4/9', '5/8', '1/3'], 3, 'Half of 8 is 4. 5 is more than 4.'),
    q('u3-c2', 3, 'Which fraction is closest to 1?', ['1/2', '2/3', '3/4', '4/5', '5/6'], 4, 'Each is 1 piece short of 1. Sixths are the smallest pieces, so 5/6 is closest.'),
    q('u3-c3', 4, 'Which fraction is closest to 0?', ['1/3', '1/5', '2/9', '1/4', '3/10'], 1, '1/5 is the smallest. 2/9 and 1/4 are a little bigger.'),
    q('u3-c4', 4, 'A glass is 3/8 full. How much more water makes it exactly half full?', ['1/8', '2/8', '3/8', '4/8', '5/8'], 0, 'Half is 4/8. 4/8 − 3/8 = 1/8.'),
    q('u3-c5', 5, 'Which fraction is exactly 1/2?', ['4/9', '9/18', '5/9', '3/8', '4/10'], 1, 'Half of 18 is 9. So 9/18 is exactly half.'),
  ],
  4: [
    q('u4-p1', 3, 'What fraction is at the dot?', ['1/5', '2/5', '3/5', '3/4', '4/5'], 2, '0 to 1 has 5 equal spaces. The dot is 3 spaces from 0.', { kind: 'line', n: 3, d: 5 }),
    q('u4-c1', 3, 'The line from 0 to 1 has 4 equal jumps. You make 3 jumps from 0. Where do you land?', ['1/4', '1/3', '3/4', '4/3', '3'], 2, 'Each jump is 1/4. 3 jumps is 3/4.'),
    q('u4-c2', 3, 'A frog jumps 1/3 each time. How many jumps to get from 0 to 2?', ['2', '3', '5', '6', '9'], 3, '3 jumps reach 1. 3 more reach 2. That is 6.'),
    q('u4-c3', 4, 'Which fraction is between 1 and 2 on the number line?', ['3/4', '4/4', '5/4', '8/4', '9/4'], 2, '4/4 is 1 and 8/4 is 2. 5/4 is in between.'),
    q('u4-c4', 4, 'Point A is at 2/5. Point B is at 4/5. How far apart are they?', ['1/5', '2/5', '3/5', '4/5', '6/5'], 1, 'From 2/5 to 4/5 is 2 jumps of 1/5.'),
    q('u4-c5', 5, 'A snail climbs 3/8 m each day. After how many days has it climbed more than 1 m?', ['2', '3', '4', '5', '8'], 1, 'Day 2: 6/8. Day 3: 9/8. 9/8 is more than 1.', undefined, [
      step('The snail climbs 3/8 m a day. How far after 2 days?', ['3/8 m', '6/8 m', '5/8 m'], 1),
      step('How far after 3 days?', ['9/8 m', '8/8 m', '7/8 m'], 0),
      step('1 m is 8/8. Is 9/8 more than 1 m?', ['No', 'Yes', 'They are equal'], 1),
    ]),
  ],
  5: [
    q('u5-p1', 3, 'The bars are the same size. Which bar has the most shaded?', ['A', 'B', 'C', 'D', 'E'], 1, 'B is 3/4. The others are 2/3, 4/6, 5/8 and 3/5. All are less than 3/4.', { kind: 'bars', bars: [{ n: 2, d: 3, label: 'A' }, { n: 3, d: 4, label: 'B' }, { n: 4, d: 6, label: 'C' }, { n: 5, d: 8, label: 'D' }, { n: 3, d: 5, label: 'E' }] }),
    q('u5-c1', 3, 'Which fraction is the biggest?', ['3/10', '5/10', '7/10', '2/10', '6/10'], 2, 'Same size pieces. 7 is the most.'),
    q('u5-c2', 3, 'Which fraction is the smallest?', ['2/9', '2/3', '2/7', '2/4', '2/5'], 0, 'All have 2 pieces. Ninths are the smallest pieces.'),
    q('u5-c3', 4, 'Which fraction is bigger than 3/4?', ['1/2', '3/5', '2/3', '5/8', '7/8'], 4, '3/4 = 6/8. 7/8 is more than 6/8.'),
    q('u5-c4', 4, 'Ana ran 3/4 km. Ben ran 2/3 km. Cara ran 5/6 km. Dev ran 1/2 km. Who ran the farthest?', ['Ana', 'Ben', 'Cara', 'Dev', 'They all ran the same'], 2, 'Each is 1 piece short of 1 km. Sixths are smallest, so Cara is closest to 1.', undefined, [
      step('Ana ran 3/4 km. How much is she short of 1 km?', ['1/4', '3/4', '1/2'], 0),
      step('Cara ran 5/6 km. How much is she short of 1 km?', ['5/6', '1/6', '1/2'], 1),
      step('Ben is 1/3 short and Dev is 1/2 short. Which is the smallest gap?', ['1/4', '1/2', '1/6'], 2),
    ]),
    q('u5-c5', 5, 'How many fractions with 6 on the bottom are more than 1/2 but less than 1?', ['0', '1', '2', '3', '4'], 2, '3/6 is exactly half. 4/6 and 5/6 fit. That is 2.'),
  ],
  6: [
    q('u6-p1', 3, 'The top bar shows 1/2. How many pieces of the bottom bar must you shade to show the same amount?', ['1', '2', '3', '4', '8'], 3, 'The bottom bar has 8 pieces. Half of 8 is 4.', { kind: 'bars', bars: [{ n: 1, d: 2 }, { n: 0, d: 8 }] }),
    q('u6-c1', 3, 'Which fraction is the same as 1/2?', ['2/3', '3/6', '2/5', '4/6', '3/5'], 1, 'Half of 6 is 3. So 3/6 = 1/2.'),
    q('u6-c2', 3, '2/3 = ?/12. What is the missing number?', ['4', '6', '8', '9', '10'], 2, '3 × 4 = 12. So 2 × 4 = 8.'),
    q('u6-c3', 4, 'Which fraction is NOT the same as 1/3?', ['2/6', '3/9', '4/12', '5/14', '6/18'], 3, '5 × 3 = 15, not 14. So 5/14 is not 1/3.'),
    q('u6-c4', 4, 'Two pizzas are the same size. One is cut into 4 slices. One is cut into 8 slices. Mia eats 1 slice of the first pizza. How many slices of the second pizza is the same amount?', ['1', '2', '3', '4', '8'], 1, '1/4 = 2/8. So 2 slices.', undefined, [
      step('The first pizza has 4 slices. Mia eats 1. What fraction did she eat?', ['1/4', '1/8', '4/1'], 0),
      step('Cut each of those 4 slices in half. How many slices of the second pizza fit in 1/4?', ['1', '2', '4'], 1),
    ]),
    q('u6-c5', 5, '3/5 = 12/?. What is the missing number?', ['15', '16', '18', '20', '25'], 3, '3 × 4 = 12. So 5 × 4 = 20.'),
  ],
  7: [
    q('u7-p1', 3, 'Each bar is 1 whole. How much is shaded in all?', ['3/4', '4/7', '7/8', '1 and 3/4', '2 and 3/4'], 3, 'One full bar is 1. The second has 3 of 4 shaded. So 1 and 3/4.', { kind: 'bars', bars: [{ n: 4, d: 4 }, { n: 3, d: 4 }] }),
    q('u7-c1', 3, '1/5 + 1/5 + 1/5 + 1/5 + 1/5 = ?', ['1/25', '5/25', '1/5', '1', '5'], 3, '5 fifths make 1 whole.'),
    q('u7-c2', 3, 'Which is the same as 9/4?', ['1 and 1/4', '2', '2 and 1/4', '2 and 1/2', '9 and 1/4'], 2, '8/4 is 2 wholes. 1/4 is left.'),
    q('u7-c3', 4, 'How many 1/6 pieces make 2 wholes?', ['2', '6', '8', '12', '18'], 3, '6 pieces make 1 whole. 12 make 2.'),
    q('u7-c4', 4, 'Which sum does NOT make 1 whole?', ['1/4 + 3/4', '2/5 + 3/5', '3/8 + 4/8', '1/2 + 1/2', '5/6 + 1/6'], 2, '3/8 + 4/8 = 7/8. That is not a whole.'),
    q('u7-c5', 5, 'Jo has 7/3 cups of flour. Each cake needs 2/3 cup. How many whole cakes can Jo make?', ['2', '3', '4', '5', '7'], 1, '3 cakes use 6/3. 4 cakes need 8/3, which is too much.', undefined, [
      step('1 cake needs 2/3 cup. How much do 3 cakes need?', ['5/3', '6/3', '8/3'], 1),
      step('How much do 4 cakes need?', ['8/3', '7/3', '6/3'], 0),
      step('Jo has 7/3. 6/3 fits but 8/3 does not. How many whole cakes?', ['4', '2', '3'], 2),
    ]),
  ],
  8: [
    q('u8-p1', 3, 'The big square is 1 whole. What decimal shows the shaded part?', ['0.035', '0.35', '3.5', '0.53', '35'], 1, '35 of 100 small squares are shaded. That is 0.35.', { kind: 'grid', rows: 10, cols: 10, shaded: Array.from({ length: 35 }, (_, i) => i) }),
    q('u8-c1', 3, '3/8 + 4/8 = ?', ['7/16', '7/8', '1/8', '12/8', '7'], 1, '3 + 4 = 7. The bottom stays 8.'),
    q('u8-c2', 3, 'Which decimal is the same as 3/10?', ['3.0', '0.03', '0.13', '0.3', '3.10'], 3, '3 tenths is 0.3.'),
    q('u8-c3', 4, 'Which number is the biggest?', ['0.5', '0.45', '0.09', '0.4', '0.38'], 0, '0.5 is 0.50. 50 hundredths is the most.'),
    q('u8-c4', 4, 'A ribbon is 9/10 m long. You cut off 4/10 m. Then you cut off 3/10 m. How much is left?', ['1/10 m', '2/10 m', '3/10 m', '5/10 m', '6/10 m'], 1, '9 − 4 − 3 = 2. So 2/10 m.', undefined, [
      step('Start with 9/10 m. Cut off 4/10 m. What is left?', ['5/10 m', '13/10 m', '4/10 m'], 0),
      step('Now cut 3/10 m from 5/10 m. What is left?', ['8/10 m', '2/10 m', '3/10 m'], 1),
    ]),
    q('u8-c5', 5, '1/2 + 1/4 + 1/8 = ?', ['3/14', '3/8', '5/8', '6/8', '7/8'], 4, '4/8 + 2/8 + 1/8 = 7/8.'),
  ],
  9: [
    q('u9-p1', 3, 'What fraction of the rectangle is shaded? Give it in simplest form.', ['1/2', '3/5', '2/3', '3/4', '4/5'], 2, '8 of 12 squares are shaded. Divide the top and bottom by 4: 8/12 = 2/3.', { kind: 'grid', rows: 3, cols: 4, shaded: [0, 1, 2, 4, 5, 6, 8, 9] }),
    q('u9-c1', 3, 'Which fraction is NOT the same as 1/2?', ['2/4', '3/6', '4/9', '5/10', '6/12'], 2, 'Double the top should give the bottom. Double 4 is 8, not 9.'),
    q('u9-c2', 3, '3/4 = ?/20. What is the missing number?', ['12', '15', '16', '17', '5'], 1, '4 × 5 = 20. So multiply the top by 5 too: 3 × 5 = 15.'),
    q('u9-c3', 4, 'Which fraction is between 1/2 and 1?', ['2/5', '3/7', '4/9', '5/8', '1/3'], 3, 'Half of 8 is 4. 5 is more than 4, so 5/8 is more than 1/2. The others are less than half.'),
    q('u9-c4', 4, 'Ana ate 2/3 of a pizza. Ben ate 3/4 of a pizza. Cal ate 5/6 of a pizza. The pizzas are the same size. Who ate the most?', ['Ana', 'Ben', 'Cal', 'Ana and Ben', 'They ate the same'], 2, 'Use twelfths: 2/3 = 8/12, 3/4 = 9/12, 5/6 = 10/12. Cal ate the most.', undefined, [
      step('Change 2/3 to twelfths.', ['8/12', '6/12', '2/12'], 0),
      step('Change 3/4 to twelfths.', ['3/12', '9/12', '7/12'], 1),
      step('Change 5/6 to twelfths.', ['5/12', '11/12', '10/12'], 2),
    ]),
    q('u9-c5', 5, 'Which fraction is closest to 1?', ['7/8', '5/6', '9/10', '3/4', '11/12'], 4, 'Each one is 1 piece short of 1 whole. The smallest piece is 1/12, so 11/12 is closest.'),
  ],
  10: [
    q('u10-p1', 3, 'Bar A shows 3/4. Bar B shows 1/2. How much more of bar A is shaded?', ['1/2', '1/4', '2/6', '1/8', '3/8'], 1, '1/2 = 2/4. 3/4 − 2/4 = 1/4.', { kind: 'bars', bars: [{ n: 3, d: 4, label: 'A' }, { n: 1, d: 2, label: 'B' }] }),
    q('u10-c1', 3, '1 1/2 + 2 1/2 = ?', ['3', '3 1/2', '4', '4 1/2', '5'], 2, '1 + 2 = 3 wholes. 1/2 + 1/2 = 1 more whole. So 4.'),
    q('u10-c2', 3, 'What is 2/3 of 15 stickers?', ['5', '6', '9', '10', '12'], 3, '15 in 3 equal groups is 5 each. 2 groups is 10.'),
    q('u10-c3', 4, '3 1/4 − 1 3/4 = ?', ['1 1/2', '2 1/2', '1 3/4', '2', '1 1/4'], 0, 'Trade 1 whole: 3 1/4 = 2 5/4. 2 5/4 − 1 3/4 = 1 2/4 = 1 1/2.', undefined, [
      step('1/4 is less than 3/4. Trade 1 whole for 4/4. 3 1/4 is the same as…', ['2 5/4', '2 4/4', '3 5/4'], 0),
      step('2 5/4 − 1 3/4 = ?', ['1 8/4', '1 2/4', '2 2/4'], 1),
      step('1 2/4 is the same as…', ['1 1/4', '2', '1 1/2'], 2),
    ]),
    q('u10-c4', 4, 'A class has 24 kids. 3/8 of them walk to school. How many kids do not walk?', ['9', '12', '15', '16', '21'], 2, '24 in 8 groups is 3 each. 3 groups walk: 9 kids. 24 − 9 = 15.', undefined, [
      step('24 kids in 8 equal groups. How many in each group?', ['3', '4', '8'], 0),
      step('3 groups walk. How many kids walk?', ['6', '9', '12'], 1),
      step('24 − 9 = ?', ['14', '16', '15'], 2),
    ]),
    q('u10-c5', 5, 'A jug has 5/6 liter of juice. Mia pours out 1/3 liter. Leo pours out 1/4 liter. How much juice is left?', ['1/6 liter', '3/13 liter', '1/4 liter', '5/12 liter', '1/12 liter'], 2, 'Use twelfths: 10/12 − 4/12 − 3/12 = 3/12 = 1/4 liter.', undefined, [
      step('Change 5/6 to twelfths.', ['10/12', '5/12', '6/12'], 0),
      step('Change 1/3 and 1/4 to twelfths.', ['3/12 and 4/12', '4/12 and 3/12', '1/12 and 1/12'], 1),
      step('10/12 − 4/12 − 3/12 = ?', ['7/12', '4/12', '3/12'], 2),
    ]),
  ],
  11: [
    q('u11-p1', 3, 'The square is 1 whole. The shaded part is 2/3 of 3/4 of it. What fraction of the whole square is shaded?', ['5/12', '6/12', '5/7', '2/7', '8/12'], 1, '12 equal parts. 6 are shaded: 2/3 × 3/4 = 6/12.', { kind: 'grid', rows: 3, cols: 4, shaded: [0, 1, 2, 4, 5, 6] }),
    q('u11-c1', 3, '4 × 2/5 = ?', ['8/20', '6/5', '8/5', '2/20', '4/5'], 2, '4 groups of 2/5: multiply the top. 4 × 2 = 8, so 8/5.'),
    q('u11-c2', 3, 'How many 1/3 cups of rice fill 4 cups?', ['3', '7', '4', '12', '16'], 3, '3 thirds fill 1 cup. 4 cups need 4 × 3 = 12.'),
    q('u11-c3', 4, 'What is 3/4 of 2/3?', ['5/7', '6/7', '6/12', '1/12', '5/12'], 2, 'Multiply the tops: 3 × 2 = 6. Multiply the bottoms: 4 × 3 = 12. So 6/12 (that is 1/2).'),
    q('u11-c4', 4, 'Leo has 30 cards. He gives 1/5 of them to Ana and 1/3 of them to Ben. How many cards does Leo keep?', ['14', '16', '8', '20', '24'], 0, '1/5 of 30 is 6. 1/3 of 30 is 10. 30 − 6 − 10 = 14.', undefined, [
      step('What is 1/5 of 30?', ['5', '6', '10'], 1),
      step('What is 1/3 of 30?', ['10', '3', '15'], 0),
      step('30 − 6 − 10 = ?', ['16', '24', '14'], 2),
    ]),
    q('u11-c5', 5, 'A ribbon is 3 meters long. Kim cuts it into pieces that are each 1/4 meter. She uses 5 pieces. How many pieces are left?', ['3', '12', '7', '8', '17'], 2, 'Each meter makes 4 pieces, so 3 meters make 12. 12 − 5 = 7.', undefined, [
      step('How many 1/4 meter pieces are in 1 meter?', ['4', '2', '3'], 0),
      step('How many are in 3 meters?', ['7', '12', '34'], 1),
      step('12 − 5 = ?', ['6', '17', '7'], 2),
    ]),
  ],
  12: [
    q('u12-p1', 3, 'The line is 1 meter long. A snail crawls from 0 to the dot. How far is that?', ['34 cm', '25 cm', '75 cm', '70 cm', '3 cm'], 2, 'The dot is at 3/4. 1 meter is 100 cm, and 3/4 of 100 is 75 cm.', { kind: 'line', n: 3, d: 4 }),
    q('u12-c1', 3, '3 pizzas are shared fairly by 4 kids. How much pizza does each kid get?', ['4/3', '1/4', '3/4', '1/3', '3/7'], 2, 'Cut each pizza into 4 pieces. Each kid gets 1 piece of each pizza: 3/4.'),
    q('u12-c2', 3, 'How many centimeters is 3/5 of a meter?', ['35 cm', '60 cm', '53 cm', '30 cm', '75 cm'], 1, '100 cm in 5 parts is 20 cm each. 3 parts is 60 cm.'),
    q('u12-c3', 4, 'Three boards are 1/2 m, 3/8 m and 1/4 m long. How long are they together?', ['5/14 m', '1 1/8 m', '1 m', '7/8 m', '1 1/4 m'], 1, 'Use eighths: 4/8 + 3/8 + 2/8 = 9/8 = 1 1/8 m.', undefined, [
      step('Change 1/2 to eighths.', ['4/8', '2/8', '1/8'], 0),
      step('Change 1/4 to eighths.', ['4/8', '2/8', '1/8'], 1),
      step('4/8 + 3/8 + 2/8 = ?', ['9/24', '8/8', '9/8'], 2),
    ]),
    q('u12-c4', 4, 'Each team shares its cakes fairly. On which team does each kid get the most cake? A: 2 cakes, 5 kids. B: 3 cakes, 8 kids. C: 1 cake, 3 kids. D: 3 cakes, 10 kids. E: 1 cake, 4 kids.', ['Team A', 'Team B', 'Team C', 'Team D', 'Team E'], 0, 'Team A gets 2/5 each and Team B gets 3/8 each. 2/5 = 16/40 and 3/8 = 15/40. C, D and E get even less.', undefined, [
      step('How much does each kid on Team A get?', ['2/5', '5/2', '1/5'], 0),
      step('How much does each kid on Team B get?', ['8/3', '3/8', '1/8'], 1),
      step('Use 40ths: 2/5 = 16/40 and 3/8 = 15/40. Which is bigger?', ['3/8', 'Same', '2/5'], 2),
    ]),
    q('u12-c5', 5, 'A 2 meter rope is cut into 8 equal pieces. 3 pieces are used. How long is the rope that is left?', ['100 cm', '150 cm', '75 cm', '125 cm', '160 cm'], 3, '2 m = 200 cm. 200 ÷ 8 = 25 cm each. 5 pieces are left: 5 × 25 = 125 cm.', undefined, [
      step('2 meters is how many centimeters?', ['200', '20', '2000'], 0),
      step('200 cm in 8 equal pieces. How long is each piece?', ['20 cm', '25 cm', '16 cm'], 1),
      step('8 − 3 = 5 pieces are left. 5 × 25 cm = ?', ['100 cm', '75 cm', '125 cm'], 2),
    ]),
  ],
  13: [
    q('u13-p1', 3, 'These marbles are in a bag. You pick one without looking. What is the chance it is dark?', ['3/7', '3/10', '7/10', '1/3', '10/3'], 1, '10 marbles. 3 are dark. The chance is 3/10.', { kind: 'dots', rows: 2, cols: 5, shaded: [0, 3, 7] }),
    q('u13-c1', 3, 'A cube has the numbers 1, 2, 3, 4, 5 and 6. You roll it once. What is the chance of an even number?', ['1/6', '2/6', '3/6', '4/6', '6/3'], 2, '2, 4 and 6 are even. That is 3 of 6.'),
    q('u13-c2', 3, 'A recipe uses 2/3 cup of milk. How much milk do 3 batches need?', ['6/9 cup', '2 cups', '5/3 cups', '2/9 cup', '3 cups'], 1, '3 × 2/3 = 6/3. That is 2 cups.'),
    q('u13-c3', 4, 'Which fraction is NOT at the same spot as 3/4 on a number line?', ['6/8', '9/12', '12/16', '15/20', '8/10'], 4, '6/8, 9/12, 12/16 and 15/20 all equal 3/4. 8/10 equals 4/5.'),
    q('u13-c4', 4, 'A spinner has 12 equal parts. 3 are red, 4 are blue, and the rest are green. What is the chance of green?', ['3/12', '7/12', '5/12', '4/12', '5/7'], 2, '3 + 4 = 7 are red or blue. 12 − 7 = 5 are green: 5/12.', undefined, [
      step('How many parts are red or blue?', ['7', '12', '1'], 0),
      step('How many parts are green?', ['7', '5', '4'], 1),
      step('What is the chance of green?', ['5/7', '7/12', '5/12'], 2),
    ]),
    q('u13-c5', 5, 'Pancakes for 4 people use 3/4 cup of flour. How much flour do pancakes for 6 people use?', ['1 1/4 cups', '9/4 cups', '1 1/8 cups', '1 1/2 cups', '3/8 cup'], 2, '2 people need half of 3/4, which is 3/8. 6 people need 3/4 + 3/8 = 6/8 + 3/8 = 9/8 = 1 1/8 cups.', undefined, [
      step('4 people need 3/4 cup. How much do 2 people need?', ['3/8 cup', '3/2 cups', '1/4 cup'], 0),
      step('6 people is 4 people plus 2 people. Which sum?', ['3/4 + 3/4', '3/4 + 3/8', '3/8 + 3/8'], 1),
      step('6/8 + 3/8 = ?', ['9/16', '3/8', '9/8'], 2),
    ]),
  ],
  14: [
    q('u14-p1', 3, 'The big square is 1 whole. What percent is shaded?', ['4%', '40%', '60%', '0.4%', '14%'], 1, '40 of 100 small squares are shaded. That is 40%.', { kind: 'grid', rows: 10, cols: 10, shaded: Array.from({ length: 40 }, (_, i) => i) }),
    q('u14-c1', 3, 'Which is the same as 3/4?', ['34%', '0.34', '75%', '0.43', '3.4'], 2, '3/4 = 75/100 = 75%.'),
    q('u14-c2', 3, 'Put these in order, smallest first: 0.6, 1/2, 55%', ['1/2, 55%, 0.6', '0.6, 55%, 1/2', '55%, 1/2, 0.6', '1/2, 0.6, 55%', '0.6, 1/2, 55%'], 0, 'Change them all to percent: 0.6 = 60%, 1/2 = 50%. So 50%, 55%, 60%.'),
    q('u14-c3', 4, 'A quiz has 20 questions. Zoe gets 17 right. What percent did she get right?', ['17%', '80%', '85%', '90%', '83%'], 2, '17/20 = 85/100 = 85%.', undefined, [
      step('Multiply the top and bottom by 5. 17/20 = ?', ['85/100', '17/100', '34/100'], 0),
      step('85/100 is what percent?', ['8.5%', '85%', '0.85%'], 1),
    ]),
    q('u14-c4', 4, 'A garden is 2/5 flowers and 0.3 vegetables. The rest is grass. What percent is grass?', ['70%', '20%', '30%', '35%', '3%'], 2, '2/5 = 40% and 0.3 = 30%. 100% − 40% − 30% = 30%.', undefined, [
      step('2/5 is what percent?', ['40%', '25%', '20%'], 0),
      step('0.3 is what percent?', ['3%', '30%', '0.3%'], 1),
      step('100% − 40% − 30% = ?', ['70%', '40%', '30%'], 2),
    ]),
    q('u14-c5', 5, 'Sam has 24 stickers. He gives 1/4 of them to Ana. Then he gives 1/3 of the stickers he has left to Ben. How many stickers does Sam have now?', ['10', '12', '14', '6', '8'], 1, '1/4 of 24 is 6, so 18 are left. 1/3 of 18 is 6, so 12 are left.', undefined, [
      step('What is 1/4 of 24?', ['6', '4', '8'], 0),
      step('24 − 6 = ?', ['20', '18', '16'], 1),
      step('1/3 of 18 is 6. 18 − 6 = ?', ['14', '6', '12'], 2),
    ]),
  ],
};

for (const questions of Object.values(CHALLENGES)) {
  for (const question of questions) {
    question.standards = standardsForChallenge(question.id);
    question.steps = question.steps?.map(step => ({ ...step, standards: [...question.standards!] }));
  }
}

export const challengeMaxPoints = (unit: number) => (CHALLENGES[unit] ?? []).reduce((sum, item) => sum + item.points, 0);

/** Trophy for a score: gold for a perfect run, silver for most points, bronze for finishing. */
export function challengeTrophy(score: number, unit: number): 'gold' | 'silver' | 'bronze' {
  const max = challengeMaxPoints(unit);
  return score >= max ? 'gold' : score >= Math.ceil(max * 0.6) ? 'silver' : 'bronze';
}
