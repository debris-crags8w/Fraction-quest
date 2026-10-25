/* Hand-checked answers for the idea questions of lessons 72–81 that no proof rule covers (see proof-key.ts for
   how entries work). Each answer was worked out by hand from the question and its picture. */
export const KEYS: Record<string, string> = {
  // Chance: each equal part (or marble) is one outcome. 6 equal parts: 6 outcomes, whatever is colored.
  'This spinner has 6 equal parts. How many equally likely outcomes does it have?': '6',
  // The circle-unequal spinner's parts are 0.4, 0.2, 0.2 and 0.2 of the circle: one part is bigger.
  'Are the outcomes on this spinner equally likely?': 'No, one part is bigger',
  // 7 marbles, any one can be picked: 7 outcomes (the 3 green are some of them).
  'A bag has 7 marbles. 3 are green. You pick 1 without looking. How many outcomes are there?': '7',
  // Area of whole-unit rectangles: rows × columns of unit squares. 2 × 3 = 6, 3 × 4 = 12, 2 × 5 = 10.
  'Each small square is 1 square unit. Color a rectangle 3 units long and 2 units wide. What is its area?': '6 square units',
  'A rectangle is 4 units long and 3 units wide. What is its area?': '12 square units',
  'A rectangle is 5 units long and 2 units wide. What is its area?': '10 square units',
  // 2 1/3 = 2 + 1/3 and 1 1/4 = 1 + 1/4: the biggest of the 4 parts is whole × whole, 2 m by 1 m.
  'A garden is 2 1/3 meters by 1 1/4 meters. Split it at the whole meters. How big is its biggest part?': '2 meters by 1 meter',
  // 1/4 × 1/2 = (1 × 1)/(4 × 2) = 1/8.
  'A garden is 2 1/4 meters by 1 1/2 meters. What is the area of the part that is 1/4 meter by 1/2 meter?': '1/8 square meter',
  // 3 × 1/4 = 3/4.
  'A garden is 3 1/2 meters by 1 1/4 meters. What is the area of the part that is 3 meters by 1/4 meter?': '3/4 square meter',
  // A percent is that many out of 100: 45% of 100 squares is 45; 70% is 70 out of 100; 85% is 85 points of 100.
  'A big square has 100 small squares. 45% of them are blue. How many small squares are blue?': '45',
  'What does 70% mean?': '70 out of 100',
  'A test score is 85%. How many points out of 100 is that?': '85',
  // Only the first step of each story: 5/6 − 1/6 = 4/6; 2/8 + 3/8 = 5/8; 4/6 − 1/6 = 3/6.
  'A ribbon is 5/6 meter long. Cut off 1/6 meter, then 2/6 meter. How much is left? First, how long is it after the first cut?': '4/6 meter',
  'Mia reads 2/8 of a book on Monday and 3/8 on Tuesday. How much is left to read? First, how much does she read in all?': '5/8',
  'A jug has 4/6 liter. Sam drinks 1/6 liter, then adds 2/6 liter. How much is in the jug now? First, how much is left after Sam drinks?': '3/6 liter',
  // 2 × 3/8 = 6/8, not 6/16: the claim is wrong because the parts stay eighths.
  'Tim says 2 × 3/8 = 6/16. Is that right?': 'No, the parts stay eighths',
  // Step 1: 1/5 + 2/5 = 3/5 is right. Step 2: 3/5 + 1/5 = 4/5, not 4/10, so step 2 is the first wrong one.
  'Lee works out 1/5 + 2/5 + 1/5. Step 1: 1/5 + 2/5 = 3/5. Step 2: 3/5 + 1/5 = 4/10. Which is the first wrong step?': 'Step 2',
  // Step 1: 2/8 + 3/8 = 5/8, not 6/8, so step 1 is already wrong.
  'Mo works out 2/8 + 3/8 + 1/8. Step 1: 2/8 + 3/8 = 6/8. Step 2: 6/8 + 1/8 = 7/8. Which is the first wrong step?': 'Step 1',
  // 4/6 − 1/6 = 3/6 and 3/6 + 2/6 = 5/6: both steps are right.
  'Ivy works out 4/6 − 1/6 + 2/6. Step 1: 4/6 − 1/6 = 3/6. Step 2: 3/6 + 2/6 = 5/6. Which is the first wrong step?': 'No step is wrong',
  // What is left after the first part: 30 − 30/3 = 20; 1 − 1/4 = 3/4; 20 − (20/5) × 2 = 12.
  'Ana has 30 stickers. She gives 1/3 of them to Ben. How many stickers does Ana have left?': '20',
  'Max eats 1/4 of a pizza. What fraction of the pizza is left?': '3/4',
  'Ana has 20 stickers. She gives 2/5 of them to Ben. How many stickers does Ana have left?': '12',
};
