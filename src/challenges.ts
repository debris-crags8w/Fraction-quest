/* Kangaroo-style Unit challenges: short puzzles with five choices (A–E), worth 3, 4 or 5 points.
   Points count only on the first try. Each unit's challenge unlocks when all its lessons are done. */

export type ChallengeQuestion = {
  id: string;
  points: 3 | 4 | 5;
  prompt: string;
  choices: [string, string, string, string, string];
  correct: number;
  explanation: string;
};

const q = (id: string, points: 3 | 4 | 5, prompt: string, choices: ChallengeQuestion['choices'], correct: number, explanation: string): ChallengeQuestion =>
  ({ id, points, prompt, choices, correct, explanation });

export const CHALLENGES: Record<number, ChallengeQuestion[]> = {
  1: [
    q('u1-c1', 3, 'A chocolate bar has 12 equal squares. Ana eats 1/4 of it. How many squares does she eat?', ['2', '3', '4', '6', '8'], 1, '12 in 4 equal groups is 3 each.'),
    q('u1-c2', 3, 'A pizza has 8 equal slices. Tom eats 1 slice. Mia eats 2 slices. What fraction is left?', ['3/8', '4/8', '5/8', '6/8', '7/8'], 2, '8 − 1 − 2 = 5 slices left. So 5/8.'),
    q('u1-c3', 4, 'Sam folds a paper strip in half. Then he folds it in half again. He opens it. What fraction is each piece?', ['1/2', '1/3', '1/4', '1/6', '1/8'], 2, 'Half, then half again, makes 4 equal pieces.'),
    q('u1-c4', 4, '1/5 of a ribbon is 2 cm long. How long is the whole ribbon?', ['5 cm', '7 cm', '8 cm', '10 cm', '12 cm'], 3, '5 pieces of 2 cm make 10 cm.'),
    q('u1-c5', 5, 'A bar is cut into equal parts. 3 parts are shaded. That is 1/4 of the bar. How many parts are there in all?', ['4', '7', '9', '12', '15'], 3, '3 parts is 1/4. So 4 groups of 3 makes 12.'),
  ],
  2: [
    q('u2-c1', 3, 'The cakes are all the same size. Which piece is the biggest?', ['1/2', '1/3', '1/5', '1/8', '1/10'], 0, 'Fewer pieces means bigger pieces. Halves are biggest.'),
    q('u2-c2', 3, 'There are 20 apples. 1/4 of them are red. How many apples are red?', ['4', '5', '8', '10', '16'], 1, '20 in 4 equal groups is 5 each.'),
    q('u2-c3', 4, 'There are 18 marbles. 2/3 of them are blue. How many marbles are NOT blue?', ['3', '6', '9', '12', '15'], 1, '1/3 of 18 is 6. The other 1/3 is not blue: 6.'),
    q('u2-c4', 4, '1/3 of a class is 8 kids. How many kids are in the class?', ['11', '16', '20', '24', '32'], 3, '3 groups of 8 makes 24.'),
    q('u2-c5', 5, 'Lily has 24 stickers. She gives 1/2 to Ben. Then she gives 1/3 of what is left to Ana. How many stickers does Lily keep?', ['4', '6', '8', '10', '12'], 2, 'Half of 24 is 12. 1/3 of 12 is 4. 12 − 4 = 8.'),
  ],
  3: [
    q('u3-c1', 3, 'Which fraction is more than 1/2?', ['2/5', '3/7', '4/9', '5/8', '1/3'], 3, 'Half of 8 is 4. 5 is more than 4.'),
    q('u3-c2', 3, 'Which fraction is closest to 1?', ['1/2', '2/3', '3/4', '4/5', '5/6'], 4, 'Each is 1 piece short of 1. Sixths are the smallest pieces, so 5/6 is closest.'),
    q('u3-c3', 4, 'Which fraction is closest to 0?', ['1/3', '1/5', '2/9', '1/4', '3/10'], 1, '1/5 is the smallest. 2/9 and 1/4 are a little bigger.'),
    q('u3-c4', 4, 'A glass is 3/8 full. How much more water makes it exactly half full?', ['1/8', '2/8', '3/8', '4/8', '5/8'], 0, 'Half is 4/8. 4/8 − 3/8 = 1/8.'),
    q('u3-c5', 5, 'Which fraction is exactly 1/2?', ['4/9', '9/18', '5/9', '3/8', '4/10'], 1, 'Half of 18 is 9. So 9/18 is exactly half.'),
  ],
  4: [
    q('u4-c1', 3, 'The line from 0 to 1 has 4 equal jumps. You make 3 jumps from 0. Where do you land?', ['1/4', '1/3', '3/4', '4/3', '3'], 2, 'Each jump is 1/4. 3 jumps is 3/4.'),
    q('u4-c2', 3, 'A frog jumps 1/3 each time. How many jumps to get from 0 to 2?', ['2', '3', '5', '6', '9'], 3, '3 jumps reach 1. 3 more reach 2. That is 6.'),
    q('u4-c3', 4, 'Which fraction is between 1 and 2 on the number line?', ['3/4', '4/4', '5/4', '8/4', '9/4'], 2, '4/4 is 1 and 8/4 is 2. 5/4 is in between.'),
    q('u4-c4', 4, 'Point A is at 2/5. Point B is at 4/5. How far apart are they?', ['1/5', '2/5', '3/5', '4/5', '6/5'], 1, 'From 2/5 to 4/5 is 2 jumps of 1/5.'),
    q('u4-c5', 5, 'A snail climbs 3/8 m each day. After how many days has it climbed more than 1 m?', ['2', '3', '4', '5', '8'], 1, 'Day 2: 6/8. Day 3: 9/8. 9/8 is more than 1.'),
  ],
  5: [
    q('u5-c1', 3, 'Which fraction is the biggest?', ['3/10', '5/10', '7/10', '2/10', '6/10'], 2, 'Same size pieces. 7 is the most.'),
    q('u5-c2', 3, 'Which fraction is the smallest?', ['2/9', '2/3', '2/7', '2/4', '2/5'], 0, 'All have 2 pieces. Ninths are the smallest pieces.'),
    q('u5-c3', 4, 'Which fraction is bigger than 3/4?', ['1/2', '3/5', '2/3', '5/8', '7/8'], 4, '3/4 = 6/8. 7/8 is more than 6/8.'),
    q('u5-c4', 4, 'Ana ran 3/4 km. Ben ran 2/3 km. Cara ran 5/6 km. Dev ran 1/2 km. Who ran the farthest?', ['Ana', 'Ben', 'Cara', 'Dev', 'They all ran the same'], 2, 'Each is 1 piece short of 1 km. Sixths are smallest, so Cara is closest to 1.'),
    q('u5-c5', 5, 'How many fractions with 6 on the bottom are more than 1/2 but less than 1?', ['0', '1', '2', '3', '4'], 2, '3/6 is exactly half. 4/6 and 5/6 fit. That is 2.'),
  ],
  6: [
    q('u6-c1', 3, 'Which fraction is the same as 1/2?', ['2/3', '3/6', '2/5', '4/6', '3/5'], 1, 'Half of 6 is 3. So 3/6 = 1/2.'),
    q('u6-c2', 3, '2/3 = ?/12. What is the missing number?', ['4', '6', '8', '9', '10'], 2, '3 × 4 = 12. So 2 × 4 = 8.'),
    q('u6-c3', 4, 'Which fraction is NOT the same as 1/3?', ['2/6', '3/9', '4/12', '5/14', '6/18'], 3, '5 × 3 = 15, not 14. So 5/14 is not 1/3.'),
    q('u6-c4', 4, 'Two pizzas are the same size. One is cut into 4 slices. One is cut into 8 slices. Mia eats 1 slice of the first pizza. How many slices of the second pizza is the same amount?', ['1', '2', '3', '4', '8'], 1, '1/4 = 2/8. So 2 slices.'),
    q('u6-c5', 5, '3/5 = 12/?. What is the missing number?', ['15', '16', '18', '20', '25'], 3, '3 × 4 = 12. So 5 × 4 = 20.'),
  ],
  7: [
    q('u7-c1', 3, '1/5 + 1/5 + 1/5 + 1/5 + 1/5 = ?', ['1/25', '5/25', '1/5', '1', '5'], 3, '5 fifths make 1 whole.'),
    q('u7-c2', 3, 'Which is the same as 9/4?', ['1 and 1/4', '2', '2 and 1/4', '2 and 1/2', '9 and 1/4'], 2, '8/4 is 2 wholes. 1/4 is left.'),
    q('u7-c3', 4, 'How many 1/6 pieces make 2 wholes?', ['2', '6', '8', '12', '18'], 3, '6 pieces make 1 whole. 12 make 2.'),
    q('u7-c4', 4, 'Which sum does NOT make 1 whole?', ['1/4 + 3/4', '2/5 + 3/5', '3/8 + 4/8', '1/2 + 1/2', '5/6 + 1/6'], 2, '3/8 + 4/8 = 7/8. That is not a whole.'),
    q('u7-c5', 5, 'Jo has 7/3 cups of flour. Each cake needs 2/3 cup. How many whole cakes can Jo make?', ['2', '3', '4', '5', '7'], 1, '3 cakes use 6/3. 4 cakes need 8/3, which is too much.'),
  ],
  8: [
    q('u8-c1', 3, '3/8 + 4/8 = ?', ['7/16', '7/8', '1/8', '12/8', '7'], 1, '3 + 4 = 7. The bottom stays 8.'),
    q('u8-c2', 3, 'Which decimal is the same as 3/10?', ['3.0', '0.03', '0.13', '0.3', '3.10'], 3, '3 tenths is 0.3.'),
    q('u8-c3', 4, 'Which number is the biggest?', ['0.5', '0.45', '0.09', '0.4', '0.38'], 0, '0.5 is 0.50. 50 hundredths is the most.'),
    q('u8-c4', 4, 'A ribbon is 9/10 m long. You cut off 4/10 m. Then you cut off 3/10 m. How much is left?', ['1/10 m', '2/10 m', '3/10 m', '5/10 m', '6/10 m'], 1, '9 − 4 − 3 = 2. So 2/10 m.'),
    q('u8-c5', 5, '1/2 + 1/4 + 1/8 = ?', ['3/14', '3/8', '5/8', '6/8', '7/8'], 4, '4/8 + 2/8 + 1/8 = 7/8.'),
  ],
};

export const challengeMaxPoints = (unit: number) => (CHALLENGES[unit] ?? []).reduce((sum, item) => sum + item.points, 0);

/** Trophy for a score: gold for a perfect run, silver for most points, bronze for finishing. */
export function challengeTrophy(score: number, unit: number): 'gold' | 'silver' | 'bronze' {
  const max = challengeMaxPoints(unit);
  return score >= max ? 'gold' : score >= Math.ceil(max * 0.6) ? 'silver' : 'bronze';
}
