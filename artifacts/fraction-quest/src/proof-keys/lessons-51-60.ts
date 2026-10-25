/* Hand-checked answers for the idea questions of lessons 51–60 that no proof rule covers (see proof-key.ts for
   how entries work). Each answer was worked out by hand from the question and its picture. */
export const KEYS: Record<string, string> = {
  // Lesson 51, renaming the fraction part only: 1/2 = 2/4, 2/3 = 4/6, 3/4 = 9/12; the wholes stay.
  'Use fourths. Which mixed number is the same as 2 1/2?': '2 2/4',
  'Use sixths. Which mixed number is the same as 1 2/3?': '1 4/6',
  'Use twelfths. Which mixed number is the same as 3 3/4?': '3 9/12',
  // Lesson 53: 1/4 has denominator 4, so 4 groups; 10 ÷ 2 = 5; 18 ÷ 6 = 3.
  'To find 1/4 of 12 toy cars, how many equal groups do you make?': '4 groups',
  '10 shells are shared into 2 equal groups. How many shells are in each group?': '5',
  '18 buttons are shared into 6 equal groups. How many buttons are in each group?': '3',
  // Lesson 54, one group: 9 ÷ 3 = 3; 20 ÷ 4 = 5; 10 ÷ 5 = 2.
  'To find 2/3 of 9, you make 3 equal groups. How many are in one group?': '3',
  'To find 3/4 of 20, you make 4 equal groups. How many are in one group?': '5',
  'To find 3/5 of 10, you make 5 equal groups. How many are in one group?': '2',
  // Lesson 56, cutting every part again: 4 × 2 = 8, 3 × 3 = 9, 6 × 2 = 12 small parts in the whole bar.
  'Each fourth of a bar is cut in half. What fraction of the whole bar is one small part?': '1/8',
  'Each third of a bar is cut into 3 equal parts. What fraction of the whole bar is one small part?': '1/9',
  'Each sixth of a bar is cut in half. What fraction of the whole bar is one small part?': '1/12',
  // Lesson 57: the first fraction's denominator gives the rows, the second's the columns (as the lesson's hints do).
  'To show 1/3 × 3/4 on a square, how many rows and columns do you cut?': '3 rows and 4 columns',
  'To show 2/5 × 1/2 on a square, how many rows and columns do you cut?': '5 rows and 2 columns',
  'To show 3/4 × 2/3 on a square, how many rows and columns do you cut?': '4 rows and 3 columns',
  // Lesson 57, the overlap is shaded rows × shaded columns: 3 × 2 = 6, 1 × 5 = 5, 4 × 2 = 8.
  'A square has 4 rows and 5 columns. Shade 3 rows and 2 columns. How many boxes are in the overlap?': '6',
  'A square has 2 rows and 6 columns. Shade 1 row and 5 columns. How many boxes are in the overlap?': '5',
  'A square has 6 rows and 3 columns. Shade 4 rows and 2 columns. How many boxes are in the overlap?': '8',
  // Lesson 58, one group: 12 ÷ 3 = 4; 20 ÷ 5 = 4; 18 ÷ 6 = 3.
  'To find 2/3 of 12 cards, you make 3 equal groups. How many cards are in one group?': '4',
  'To find 3/5 of 20 cards, you make 5 equal groups. How many cards are in one group?': '4',
  'To find 5/6 of 18 cards, you make 6 equal groups. How many cards are in one group?': '3',
  // Lesson 59: 2/3 < 1; 3/2, 4/3 > 1 and 3/3 = 1.
  'Which of these fractions is less than 1 whole?': '2/3',
  // Lesson 60, the factor against 1: 4/3 > 3/3; 3/5 < 5/5; 6/6 = 1.
  'In 4/3 × 6, is the factor 4/3 more or less than 1?': 'More than 1',
  'In 3/5 × 10, is the factor 3/5 more or less than 1?': 'Less than 1',
  'In 6/6 × 7, is the factor 6/6 more or less than 1?': 'Equal to 1',
};
