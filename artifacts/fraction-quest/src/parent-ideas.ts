/* The ideas the grown-ups' report groups wrong tries by. A lesson's idea is its first standard (so lessons that
   teach the same skill, like the four "equal fractions" lessons, are one line), with a few lessons named on their
   own. Each idea has a short heading a grown-up can read, and one thing to try at home. Nothing here changes lessons. */
export type Idea = { key: string; heading: string; home: string };
type Entry = Omit<Idea, 'key'>;

const IDEAS: Record<string, Entry> = {
  '3.NF.1': { heading: 'Splitting a whole into equal parts', home: 'Fold a paper strip into 4 equal parts. Ask your child to name one part, and to say how they know the parts are equal.' },
  '3.G.2': { heading: 'Equal-size parts in a shape', home: 'Draw a square and ask your child to split it into 4 equal parts in two different ways, then say how they know the parts match.' },
  '3.NF.2a': { heading: 'Fractions on a number line', home: 'Draw a line from 0 to 1 and mark equal jumps of 1/4. Ask your child to point to 3/4 and say what each jump is worth.' },
  '3.NF.2b': { heading: 'Fractions bigger than one on a number line', home: 'Draw a line from 0 to 2 with jumps of 1/4. Ask your child to point to 5/4 and count the jumps out loud.' },
  '3.NF.3a': { heading: 'Fractions that name the same amount', home: 'Fold a strip in half, then in half again. Ask what 1/2 is called now (2/4) and why the amount did not change.' },
  '3.NF.3c': { heading: 'Whole numbers written as fractions', home: 'Ask how many fourths make 1 whole pizza, then how many make 2 whole pizzas (4/4 and 8/4).' },
  '3.NF.3d': { heading: 'Comparing fractions with the same top or bottom', home: 'Cut two same-size strips, one into 3 parts and one into 4. Ask which one-part piece is bigger, 1/3 or 1/4, and why.' },
  '3.MD.4': { heading: 'Measuring to the nearest half or quarter inch', home: 'Measure three small objects to the nearest 1/4 inch and mark each length with an X on a line you draw.' },
  '4.NF.1': { heading: 'Making equal fractions', home: 'Ask your child to prove 2/3 = 4/6 with a drawing, then to find one more name for the same amount (6/9).' },
  '4.NF.2': { heading: 'Comparing fractions with different bottoms', home: 'Ask which is more, 3/8 or 1/2, and have your child say how they know (1/2 is 4/8).' },
  '4.NF.3a': { heading: 'Adding and subtracting same-size parts', home: 'While cooking, add 2/4 cup and 1/4 cup. Ask how many fourths that is and why the bottom number stays 4.' },
  '4.NF.3b': { heading: 'Breaking a fraction into smaller fractions', home: 'Ask your child to show 5/6 as a sum of fractions in two different ways, like 3/6 + 2/6.' },
  '4.NF.3c': { heading: 'Adding and subtracting mixed numbers', home: 'Ask how much 1 and 1/2 cups plus 1 and 1/2 cups makes, and how your child worked it out.' },
  '4.NF.3d': { heading: 'Word problems with fractions', home: 'Make up a story like "we ate 3/8 of a pizza, then 2/8 more". Ask your child what to find first, then to solve it.' },
  '4.NF.4a': { heading: 'Seeing a fraction as copies of one part', home: 'Use a 1/4-cup scoop three times and ask your child to say why that is 3/4 of a cup.' },
  '4.NF.4b': { heading: 'Multiplying a fraction by a whole number', home: 'Ask how much milk 3 glasses need if each takes 2/3 cup, and have your child add it up (6/3, which is 2 cups).' },
  '4.NF.4c': { heading: 'Word problems with a fraction times a whole number', home: 'Ask: a recipe uses 3/4 cup of flour and we make it 4 times. How much flour is that (3 cups)?' },
  '4.NF.5': { heading: 'Tenths and hundredths', home: 'Use dimes and pennies. Ask how many pennies equal 3 dimes, and why 3/10 is the same as 30/100.' },
  '4.NF.6': { heading: 'Fractions and decimals', home: 'Ask your child to write 7/10 and 7/100 as decimals (0.7 and 0.07) and say which one is bigger.' },
  '4.NF.7': { heading: 'Comparing decimals', home: 'Ask which is more, 0.4 or 0.35. Have your child explain with dimes and pennies or a 10 by 10 grid.' },
  '4.MD.2': { heading: 'Measurement word problems', home: 'Give a real measuring job, like a ribbon that is 2 feet long and needs 6 inches more. Ask for the total in inches, with the unit.' },
  '4.MD.4': { heading: 'Reading a line plot', home: 'Measure 6 pencils to the nearest 1/4 inch and make a line plot with Xs. Ask which length shows up most.' },
  '5.NF.1': { heading: 'Adding and subtracting different-size parts', home: 'Ask whether 1/2 + 1/3 is more or less than 1. Then have your child rename both as sixths to check (3/6 + 2/6).' },
  '5.NF.2': { heading: 'Checking that an answer makes sense', home: 'Before solving 3/4 + 5/8, ask your child to guess: about 1, about 1 and 1/2, or about 2? Then solve it and compare.' },
  '5.NF.3': { heading: 'A fraction is a division', home: 'Share 3 sandwiches among 4 people. Ask how much each person gets and why that is 3/4.' },
  '5.NF.4a': { heading: 'Multiplying fractions', home: 'Draw a square and cut it into 3 equal columns, then cut each column in half. Ask what fraction of the square is 1/2 of 1/3.' },
  '5.NF.4b': { heading: 'Area with fraction sides', home: 'Draw a rectangle that is 1/2 foot by 1/3 foot on grid paper and ask your child to find its area with the drawing.' },
  '5.NF.5': { heading: 'Does multiplying make it bigger or smaller?', home: 'Ask: is 5 × 1/2 more or less than 5? What about 5 × 3/2? Have your child explain without working it out.' },
  '5.NF.6': { heading: 'Word problems that multiply fractions', home: 'Ask: you drink 1/2 of a glass that is 3/4 full. How much of a whole glass did you drink (3/8)?' },
  '5.NF.7a': { heading: 'Sharing a unit fraction', home: 'Share half a candy bar between 2 people. Ask what fraction of the whole bar each person gets (1/4).' },
  '5.NF.7b': { heading: 'How many unit fractions fit in a whole number', home: 'Ask how many 1/4-cup scoops fill 3 cups (12), and how your child knows.' },
  '5.NF.7c': { heading: 'Word problems that divide with unit fractions', home: 'Ask: 4 cups of rice and each serving is 1/3 cup. How many servings is that (12)?' },
  '5.MD.1': { heading: 'Changing between measurement units', home: 'Ask how many inches are in 3/4 of a foot (9), and how your child worked it out.' },
  '5.MD.2': { heading: 'Line plots with fractions', home: 'Make a line plot of five amounts like 1/4, 1/2, 1/2, 3/4 and 1/2 cup. Ask your child to find the total and share it equally.' },
  'benchmarks': { heading: 'Comparing to zero, one half and one', home: 'Ask whether 3/8 is more or less than 1/2, and whether 7/8 is nearer to 0 or to 1. Have your child say how they know.' },
  'mixed-improper': { heading: 'Mixed numbers and fractions bigger than one', home: 'Ask how many fourths are in 1 and 3/4 pizzas (7/4), and how your child counted them.' },
  'find-the-whole': { heading: 'Finding the whole from a part', home: 'Ask: 3 stickers are 1/4 of a pack. How many stickers are in the whole pack (12), and how do you know?' },
  'check-the-work': { heading: 'Checking someone else’s work', home: 'Write a fraction sum with a mistake in it. Ask your child to be the teacher: find the first wrong step and fix it.' },
  'bonus-chance': { heading: 'Chance as a fraction', home: 'Put 3 red and 1 blue counter in a bag. Ask what fraction of the draws should be red, and why (3/4).' },
  'bonus-percent': { heading: 'Fractions and percent', home: 'Ask your child to say 1/4, 1/2 and 3/4 as percents (25%, 50% and 75%).' },
  'bonus-divide': { heading: 'Dividing by a fraction', home: 'Ask how many 1/2-cup scoops are in 3 cups (6), and how your child knows.' },
};

/** Lessons named on their own instead of by their first standard. */
const OWN_IDEA: Record<string, string> = {
  'benchmark-half': 'benchmarks', 'benchmarks-zero-one': 'benchmarks', 'mixed-improper': 'mixed-improper',
  'fractional-measure-addition': '5.NF.1', 'multiply-mixed-numbers': '5.NF.6', 'find-the-whole': 'find-the-whole',
  'spot-the-mistake': 'check-the-work', 'fraction-probability': 'bonus-chance',
  'fractions-to-percent': 'bonus-percent', 'percent-to-fraction': 'bonus-percent', 'divide-fractions': 'bonus-divide',
};

export const IDEA_KEYS: readonly string[] = Object.keys(IDEAS);

export function ideaForMission(mission: { id: string; standards?: readonly string[] }): Idea {
  const key = OWN_IDEA[mission.id] ?? mission.standards?.[0] ?? mission.id;
  const entry = IDEAS[key];
  if (!entry) throw new Error(`No report idea for lesson ${mission.id} (${key})`);
  return { key, ...entry };
}
