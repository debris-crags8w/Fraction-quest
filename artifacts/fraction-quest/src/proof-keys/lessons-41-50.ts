/* Hand-checked answers for the idea questions of lessons 41–50 that no proof rule covers (see proof-key.ts for
   how entries work). Each answer was worked out by hand from the question and its picture. */
export const KEYS: Record<string, string> = {
  // Plot in eighths, idea 1: one X for each of the 3 pins; 5/8 is 5 eighths from 0; 6/8 is the most eighths, so farthest.
  'Pins: 2/8, 5/8, 7/8 inch. Plot them. How many Xs did you put on the plot?': '3',
  'A twig is 5/8 inch. Plot it. How many eighths from 0 is its X?': '5',
  'Beads: 1/8, 4/8, 6/8 inch. Plot them. Which bead’s X is farthest from 0?': '6/8 inch',
  // Idea 2: three shells are 3/8 inch, so 3 Xs stack there. Idea 3: 1/8 and 2/8 are left of 4/8 (6/8, 6/8 are right of it).
  'Shells: 3/8, 3/8, 3/8, 6/8 inch. Plot them. How many Xs stack at 3/8?': '3',
  'Leaves: 1/8, 2/8, 6/8, 6/8 inch. Plot them. How many leaves are shorter than 4/8 inch?': '2',
  // Read line plots: the plot [2, 2, 3, 5, 5, 5] has 6 Xs; the plot [3, 4, 4, 7]: 7/8 − 3/8 = 4/8.
  'The line plot shows bead lengths in eighths of an inch. How many beads are there in all?': '6',
  'The line plot shows pencil lengths in eighths of an inch. How much longer is the longest pencil than the shortest?': '4/8 inch',
  // Measurement stories, idea 3: 1/2 hour = 30 minutes, 30 + 5 = 35; 1/4 dollar = 25 cents, 25 + 5 = 30;
  // 1/2 liter = 500 milliliters, 500 + 100 = 600.
  'A race takes 1/2 hour. The cool-down takes 5 more minutes. How many minutes in all?': '35 minutes',
  'You have 1/4 dollar and 5 cents. How many cents is that?': '30 cents',
  'A jug has 1/2 liter of water. You add 100 milliliters. How many milliliters are in the jug now?': '600 milliliters',
  // Recipe fractions, idea 1: 1/4 + 1/4 = 2/4; 2/5 + 2/5 = 4/5; 1/6 + 1/6 + 1/6 = 3/6.
  'A recipe uses 1/4 cup of milk. You make 2 batches. How much milk do you need?': '2/4 cup',
  'A recipe uses 2/5 cup of sugar. You make 2 batches. How much sugar do you need?': '4/5 cup',
  'A recipe uses 1/6 cup of oil. You make 3 batches. How much oil do you need?': '3/6 cup',
  // Rename, then add, idea 1: each half is 3 sixths; fourths are the bigger parts (1/4 = 2/8); each third is 2 sixths.
  'Halves and sixths are different sizes. Rename 1/2 as sixths.': '3/6',
  'Fourths and eighths are different sizes. To make them match, which fraction do you rename?': '1/4, as eighths',
  'Thirds and sixths are different sizes. Rename 2/3 as sixths.': '4/6',
  // Take away different parts, idea 1: each half is 4 eighths; thirds are bigger than sixths (1/3 = 2/6); 3/4 = 6/8.
  'To take 1/2 away from 7/8, the parts must match. What is 1/2 in eighths?': '4/8',
  'For 5/6 − 1/3, which fraction do you rename?': '1/3, as sixths',
  'To find 3/4 − 3/8, the parts must match. What is 3/4 in eighths?': '6/8',
};
