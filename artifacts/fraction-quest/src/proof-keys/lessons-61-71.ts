/* Hand-checked answers for the idea questions of lessons 61–71 that no proof rule covers (see proof-key.ts for
   how entries work). Each answer was worked out by hand from the question and its picture. */
export const KEYS: Record<string, string> = {
  // Lesson 61, a fraction of a length: one part is the length ÷ the denominator; count the numerator's parts.
  // 10 ÷ 5 = 2. 20 ÷ 4 = 5. 15 ÷ 3 = 5, and 2 parts are 10.
  'A rope is 10 meters long. How long is 1/5 of it?': '2 meters',
  'A fence is 20 meters long. How long is 1/4 of it?': '5 meters',
  'A path is 15 meters long. How long is 2/3 of it?': '10 meters',
  // Lesson 62, renaming a length: each third is 2 sixths; each half is 4 eighths; each fourth is 2 eighths, so 3/4 = 6/8.
  'A board is 1/3 meter long. How many sixths of a meter is that?': '2/6 meter',
  'A board is 1/2 meter long. How many eighths of a meter is that?': '4/8 meter',
  'A board is 3/4 meter long. How many eighths of a meter is that?': '6/8 meter',
  // Lesson 63, totals on the plot: 1 + 2 + 3 = 6 fourths; 2 + 3 + 5 = 10 eighths; 1 + 2 + 2 + 4 = 9 fourths.
  'Three jars hold 1/4, 2/4, 3/4 liter. How much water is in all three?': '6/4 liters',
  'Three cups hold 2/8, 3/8, 5/8 liter. How much juice is in all three?': '10/8 liters',
  'Four bottles hold 1/4, 2/4, 2/4, 4/4 liter. How much water is in all four?': '9/4 liters',
  // Lesson 63, a total shared equally: 6 fourths ÷ 3 = 2 fourths; 9 eighths ÷ 3 = 3 eighths; 12 eighths ÷ 4 = 3 eighths.
  '6/4 liters of water is shared equally by 3 cups. How much goes in each cup?': '2/4 liter',
  '9/8 liters of juice is shared equally by 3 cups. How much goes in each cup?': '3/8 liter',
  '12/8 liters of water is shared equally by 4 jars. How much goes in each jar?': '3/8 liter',
  // Lesson 64: 1/2 = 2/4, so 2 + 2 + 1 = 5 fourths = 1 1/4 inches.
  'The line plot shows how far 3 snails crawled: 1/2, 1/2, 1/4 inch. How far did they crawl in all?': '1 1/4 inches',
  // Lesson 65, unit facts (the Unit facts card): 1 foot = 12 inches, 1 hour = 60 minutes, 1 pound = 16 ounces.
  'How many inches are in 1 foot?': '12 inches',
  'How many minutes are in 1 hour?': '60 minutes',
  'How many ounces are in 1 pound?': '16 ounces',
  // Lesson 65, more than one part: 60 ÷ 3 = 20, 2 × 20 = 40 minutes; 24 ÷ 4 = 6, 3 × 6 = 18 hours.
  'How many minutes are in 2/3 of an hour?': '40 minutes',
  'How many hours are in 3/4 of a day?': '18 hours',
  // Lesson 66, a whole and a part in the small unit: 12 + 6 = 18 inches; 60 + 15 = 75 minutes; 16 + 8 = 24 ounces.
  'How many inches are in 1 1/2 feet?': '18 inches',
  'How many minutes are in 1 1/4 hours?': '75 minutes',
  'How many ounces are in 1 1/2 pounds?': '24 ounces',
  // Lesson 67: each loaf is cut into one part per friend (4, 5, 3), so one part of a loaf cut in 4 is 1/4.
  '3 loaves are shared fairly by 4 friends. Each loaf is cut into one part for each friend. What fraction of a loaf is one part?': '1/4 loaf',
  '2 loaves are shared fairly by 5 friends. Into how many equal parts should each loaf be cut?': '5 parts',
  '4 pizzas are shared fairly by 3 friends. Into how many equal parts should each pizza be cut?': '3 parts',
  // Lesson 69, a unit fraction shared: 1/4 cut in 2 makes 8 such pieces in the whole (1/8); 1/2 in 3 makes 6 (1/6);
  // 1/2 in 4 makes 8 (1/8).
  '2 friends share 1/4 of a cake equally. What fraction of the whole cake does each friend get?': '1/8',
  '3 friends share 1/2 of a pan equally. What fraction of the whole pan does each friend get?': '1/6',
  '4 friends share 1/2 of a pizza equally. What fraction of the whole pizza does each friend get?': '1/8',
  // Lesson 71: multiply the answer by the piece size to get back the amount: 6 × 1/2 = 6/2 = 3.
  'Pip says 3 ÷ 1/2 = 6. Which multiplication checks the answer?': '6 × 1/2 = 3',
};
