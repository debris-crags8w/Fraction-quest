export type StandardId = `${3 | 4 | 5}.${'NF' | 'G' | 'MD'}.${string}`;

export type FractionStandard = {
  id: StandardId;
  grade: 3 | 4 | 5;
  title: string;
  summary: string;
  /** What a child who has this skill can do, for the grown-ups' report. */
  canDo: string;
};

/** The standards this curriculum actually teaches or assesses. Bonus topics are intentionally excluded. */
export const FRACTION_STANDARDS: FractionStandard[] = [
  { id: '3.NF.1', grade: 3, title: 'Understand fractions as equal parts', summary: 'Name equal parts of one whole and build unit fractions.', canDo: 'Splits a whole into equal parts and names them' },
  { id: '3.NF.2a', grade: 3, title: 'Fractions on number lines', summary: 'Show a fraction as a distance from zero.', canDo: 'Puts a fraction like 1/4 on a number line' },
  { id: '3.NF.2b', grade: 3, title: 'Fractions beyond one', summary: 'Use equal jumps to locate fractions, including amounts over one.', canDo: 'Finds fractions like 3/4 and 5/4 on a number line by counting equal jumps' },
  { id: '3.NF.3a', grade: 3, title: 'Recognize equivalent fractions', summary: 'See when two fractions name the same amount.', canDo: 'Finds fractions that name the same amount' },
  { id: '3.NF.3b', grade: 3, title: 'Explain fraction equivalence', summary: 'Use a model to show why equivalent fractions match.', canDo: 'Shows with a picture why two fractions are the same amount' },
  { id: '3.NF.3c', grade: 3, title: 'Whole numbers as fractions', summary: 'Write a whole number as a fraction.', canDo: 'Writes a whole number as a fraction, like 3/1 or 4/4' },
  { id: '3.NF.3d', grade: 3, title: 'Compare fractions', summary: 'Compare two fractions with the same numerator or the same denominator.', canDo: 'Compares two fractions with the same top or bottom number' },
  { id: '3.G.2', grade: 3, title: 'Partition shapes into equal areas', summary: 'Name equal-area parts even when the pieces have different shapes.', canDo: 'Splits a shape into equal areas and names each part' },
  { id: '3.MD.4', grade: 3, title: 'Measure and show data', summary: 'Measure fractional lengths and represent the measurements.', canDo: 'Measures lengths to the nearest half or fourth inch and shows them on a line plot' },
  { id: '4.NF.1', grade: 4, title: 'Generate equivalent fractions', summary: 'Multiply or divide the numerator and denominator by the same number.', canDo: 'Makes equal fractions by multiplying or dividing the top and bottom by the same number' },
  { id: '4.NF.2', grade: 4, title: 'Compare fractions with unlike denominators', summary: 'Use equivalent fractions or benchmarks to compare.', canDo: 'Compares fractions with different bottom numbers, using 1/2 or equal fractions' },
  { id: '4.NF.3a', grade: 4, title: 'Add and subtract like fractions', summary: 'Combine or take away equal-sized fractional parts.', canDo: 'Adds and subtracts fractions with the same bottom number' },
  { id: '4.NF.3b', grade: 4, title: 'Compose and decompose fractions', summary: 'Break a fraction into sums of fractions with the same denominator.', canDo: 'Breaks a fraction into smaller fractions that add up to it' },
  { id: '4.NF.3c', grade: 4, title: 'Add and subtract mixed numbers', summary: 'Combine wholes and fractional parts, regrouping when needed.', canDo: 'Adds and subtracts mixed numbers' },
  { id: '4.NF.3d', grade: 4, title: 'Solve fraction word problems', summary: 'Use addition and subtraction with like-denominator fractions in context.', canDo: 'Solves word problems that add or take away same-size parts' },
  { id: '4.NF.4a', grade: 4, title: 'Build multiples of unit fractions', summary: 'Understand a/b as a groups of 1/b.', canDo: 'Sees 3/4 as three groups of 1/4' },
  { id: '4.NF.4b', grade: 4, title: 'Multiply a fraction by a whole number', summary: 'Use repeated addition to find a whole-number multiple of a fraction.', canDo: 'Multiplies a fraction by a whole number' },
  { id: '4.NF.4c', grade: 4, title: 'Fraction times whole number stories', summary: 'Solve word problems that multiply a fraction by a whole number.', canDo: 'Solves word problems that multiply a fraction by a whole number' },
  { id: '4.NF.5', grade: 4, title: 'Write tenths as hundredths', summary: 'Use equivalent fractions to add tenths and hundredths.', canDo: 'Writes tenths as hundredths to add them' },
  { id: '4.NF.6', grade: 4, title: 'Connect fractions and decimals', summary: 'Write fractions with denominators 10 or 100 as decimals.', canDo: 'Writes tenths and hundredths as decimals' },
  { id: '4.NF.7', grade: 4, title: 'Compare decimals', summary: 'Compare decimals to hundredths using place value.', canDo: 'Compares decimals to hundredths' },
  { id: '4.MD.2', grade: 4, title: 'Solve measurement problems', summary: 'Use fractions and unit conversions in measurement stories.', canDo: 'Solves measurement word problems with fractions' },
  { id: '4.MD.4', grade: 4, title: 'Read fraction line plots', summary: 'Interpret measurement data shown on a fraction line plot.', canDo: 'Reads a line plot of fraction measurements and answers questions about it' },
  { id: '5.NF.1', grade: 5, title: 'Add and subtract unlike fractions', summary: 'Rename fractions with common denominators before calculating.', canDo: 'Adds and subtracts fractions with different bottom numbers' },
  { id: '5.NF.2', grade: 5, title: 'Solve multi-step fraction problems', summary: 'Use estimation and fraction operations to solve stories.', canDo: 'Solves fraction word problems and checks if the answer makes sense' },
  { id: '5.NF.3', grade: 5, title: 'Fractions as division', summary: 'Interpret a fraction as a division expression and solve sharing problems.', canDo: 'Sees a fraction as a division, like sharing 3 pizzas among 4 people' },
  { id: '5.NF.4a', grade: 5, title: 'Multiply fractions', summary: 'Interpret and calculate a fraction multiplied by a fraction.', canDo: 'Multiplies a fraction by a fraction' },
  { id: '5.NF.4b', grade: 5, title: 'Find area with fractional sides', summary: 'Use fraction multiplication to find the area of a rectangle.', canDo: 'Finds the area of a rectangle with fraction side lengths' },
  { id: '5.NF.5', grade: 5, title: 'Understand fraction scaling', summary: 'Explain how multiplying by a fraction changes an amount.', canDo: 'Knows when multiplying by a fraction makes a number bigger or smaller' },
  { id: '5.NF.6', grade: 5, title: 'Solve fraction multiplication stories', summary: 'Use visual models and equations for real-world multiplication.', canDo: 'Solves word problems that multiply fractions' },
  { id: '5.NF.7a', grade: 5, title: 'Divide a unit fraction', summary: 'Share a unit fraction equally among whole-number groups.', canDo: 'Shares a unit fraction equally, like 1/2 split among 3' },
  { id: '5.NF.7b', grade: 5, title: 'Count unit fractions in a whole', summary: 'Find how many unit fractions fit into a whole number.', canDo: 'Finds how many unit fractions fit in a whole number' },
  { id: '5.NF.7c', grade: 5, title: 'Solve fraction division stories', summary: 'Use fraction division to solve real-world problems.', canDo: 'Solves word problems that divide with unit fractions' },
  { id: '5.MD.1', grade: 5, title: 'Convert measurement units', summary: 'Convert within a measurement system and use fraction amounts.', canDo: 'Converts measurement units, including fraction amounts' },
  { id: '5.MD.2', grade: 5, title: 'Reason with fraction line plots', summary: 'Solve problems using fractional measurement data.', canDo: 'Solves problems with data from a fraction line plot' },
];

/**
 * Primary standards for each lesson. Kept separate from lesson content so worksheets,
 * generated practice, challenges, and assessments all use the same identifiers.
 */
export const MISSION_STANDARDS: Record<string, StandardId[]> = {
  'equal-parts': ['3.NF.1', '3.G.2'],
  'fraction-names': ['3.NF.1'],
  'unit-fractions': ['3.NF.1'],
  'unit-size': ['3.NF.3d'],
  // Fraction of a group (1/5 of 20, 3/6 of 18) is a/b × q: grade 5, taught in unit 11 with fraction multiplication.
  'sets-unit-fractions': ['5.NF.4a'],
  'sets-nonunit': ['5.NF.4a'],
  'benchmark-half': ['3.NF.3d', '4.NF.2'],
  'benchmarks-zero-one': ['3.NF.3d', '4.NF.2'],
  'fraction-magnitude': ['3.NF.3d'],
  'number-line-basics': ['3.NF.2a'],
  'number-line-points': ['3.NF.2a'],
  'number-line-beyond-one': ['3.NF.2b'],
  'compare-same-denominator': ['3.NF.3d'],
  'compare-same-numerator': ['3.NF.3d'],
  'order-fractions': ['3.NF.3d'],
  'equivalent-models': ['3.NF.3a', '3.NF.3b'],
  'build-equivalents': ['4.NF.1'],
  'missing-equivalent': ['4.NF.1'],
  'compose-to-one': ['4.NF.3b'],
  'decompose-fractions': ['4.NF.3b'],
  'improper-fractions': ['3.NF.2b', '3.NF.3c'],
  'mixed-improper': ['4.NF.3b', '4.NF.3c'],
  'add-like-denominators': ['4.NF.3a', '4.NF.3d'],
  'subtract-like-denominators': ['4.NF.3a', '4.NF.3d'],
  'add-related-fractions': ['5.NF.1'],
  'tenths-decimals': ['4.NF.6'],
  'hundredths-decimals': ['4.NF.6'],
  'add-tenths-hundredths': ['4.NF.5'],
  'simplify-fractions': ['4.NF.1'],
  'equivalent-missing-both': ['4.NF.1'],
  'whole-numbers-as-fractions': ['3.NF.3c'],
  'compare-unlike-fractions': ['4.NF.2'],
  'order-unlike-fractions': ['4.NF.2'],
  'subtract-unlike-fractions': ['5.NF.1'],
  'add-unlike-fractions': ['5.NF.1'],
  'add-mixed-numbers': ['4.NF.3c'],
  'subtract-mixed-numbers': ['4.NF.3c'],
  'fraction-of-quantity': ['5.NF.4a'],
  'mixed-unlike-operations': ['5.NF.1'],
  'estimate-fraction-operations': ['5.NF.2'],
  'dimes-and-pennies': ['4.NF.5'],
  'plot-in-eighths': ['4.MD.4'],
  'party-portions': ['4.NF.4c'],
  'two-step-conversions': ['5.MD.1'],
  'line-plot-totals': ['5.MD.2'],
  // Its first questions are groups of a unit fraction (3 × 1/3), then of any fraction.
  'multiply-whole-by-fraction': ['4.NF.4b', '4.NF.4a'],
  'multiply-fractions': ['5.NF.4a'],
  'fraction-times-fraction': ['5.NF.4a'],
  'fraction-of-collection': ['5.NF.4a'],
  'divide-whole-by-unit-fraction': ['5.NF.7b', '5.NF.7c'],
  'unit-fraction-multiples': ['4.NF.4a'],
  'multiplication-scaling': ['5.NF.5'],
  'bigger-or-smaller': ['5.NF.5'],
  'multiply-mixed-numbers': ['5.NF.4b', '5.NF.6'],
  'unit-fraction-divided-whole': ['5.NF.7a'],
  // Half its stories share a unit fraction (5.NF.7a), half fit unit fractions into wholes (5.NF.7b).
  'share-or-fit': ['5.NF.7c', '5.NF.7a', '5.NF.7b'],
  'fraction-of-length': ['5.NF.4a'],
  'fractional-measure-addition': ['5.NF.2', '5.NF.1'],
  'ruler-measurement': ['3.MD.4'],
  'build-line-plots': ['3.MD.4'],
  'read-line-plots': ['4.MD.4'],
  'line-plot-leveling': ['5.MD.2'],
  'measurement-word-problems': ['4.MD.2'],
  // A fraction of a unit in a smaller unit (1/2 liter = 500 milliliters) is also the grade 4 measurement skill.
  'fractional-unit-conversions': ['5.MD.1', '4.MD.2'],
  'fractional-sharing': ['5.NF.3'],
  'fraction-as-division': ['5.NF.3'],
  'fraction-probability': [],
  'fraction-of-area': ['3.G.2'],
  'fractional-side-area': ['5.NF.4b'],
  'equivalent-number-line': ['3.NF.3a', '3.NF.3b'],
  'fraction-recipes': ['4.NF.4c', '4.NF.4b'],
  'fractions-to-percent': [],
  'percent-to-fraction': [],
  'decimal-fraction-equivalence': ['4.NF.6'],
  'compare-decimals': ['4.NF.7'],
  'compare-decimals-grid': ['4.NF.7'],
  'multi-step-fraction-stories': ['4.NF.3d'],
  // Unit-fraction parts (3 is 1/4 of it) are 3 ÷ 1/4; the non-unit rows are stretch questions (6.NS.1).
  'find-the-whole': ['5.NF.7b'],
  'spot-the-mistake': ['4.NF.3a'], // no row compares fractions with unlike denominators, so no 4.NF.2
  'fraction-of-remainder': ['5.NF.6', '5.NF.2'],
  'divide-fractions': [],
};

export const standardsForMission = (missionId: string): StandardId[] => MISSION_STANDARDS[missionId] ?? [];
export const gradeForStandard = (standard: string): 3 | 4 | 5 | null => {
  const grade = Number(standard[0]);
  return grade === 3 || grade === 4 || grade === 5 ? grade : null;
};

/** What each Unit challenge puzzle asks about, puzzle by puzzle, from what the course has taught by the end of its unit.
    The chance puzzles (u13) go past the grade 3–5 fraction standards, so they carry none. A puzzle alone does not establish mastery. */
export const CHALLENGE_STANDARDS: Record<string, StandardId[]> = {
  'u1-p1': ['3.NF.1', '3.G.2'], 'u1-c1': ['3.NF.1'], 'u1-c2': ['3.NF.1'], 'u1-c3': ['3.NF.1'], 'u1-c4': ['3.NF.1'], 'u1-c5': ['3.NF.1'], 'u1-c6': ['3.G.2'],
  'u2-p1': ['3.NF.1'], 'u2-c1': ['3.NF.3d'], 'u2-c2': ['3.NF.3d'], 'u2-c3': ['3.NF.3d'], 'u2-c4': ['3.NF.3d'], 'u2-c5': ['3.NF.3d'],
  'u3-p1': ['3.NF.3d', '4.NF.2'], 'u3-c1': ['4.NF.2'], 'u3-c2': ['4.NF.2'], 'u3-c3': ['4.NF.2'], 'u3-c4': ['4.NF.2'], 'u3-c5': ['4.NF.2'],
  'u4-p1': ['3.NF.2a'], 'u4-c1': ['3.NF.2a'], 'u4-c2': ['3.NF.2b'], 'u4-c3': ['3.MD.4'], 'u4-c4': ['3.NF.2a'], 'u4-c5': ['3.NF.2b'], 'u4-c6': ['3.MD.4'],
  'u5-p1': ['3.NF.3d'], 'u5-c1': ['3.NF.3d'], 'u5-c2': ['3.NF.3d'], 'u5-c3': ['4.NF.2'], 'u5-c4': ['4.NF.2'], 'u5-c5': ['3.NF.3d', '4.NF.2'],
  'u6-p1': ['3.NF.3b'], 'u6-c1': ['3.NF.3a'], 'u6-c2': ['4.NF.1'], 'u6-c3': ['3.NF.3a', '4.NF.1'], 'u6-c4': ['3.NF.3b'], 'u6-c5': ['4.NF.1'],
  'u7-p1': ['4.NF.3b'], 'u7-c1': ['4.NF.3b'], 'u7-c2': ['4.NF.3b'], 'u7-c3': ['3.NF.3c'], 'u7-c4': ['4.NF.3b'], 'u7-c5': ['4.NF.3b'], 'u7-c6': ['3.NF.3c'],
  'u8-p1': ['4.NF.6'], 'u8-c1': ['4.NF.5'], 'u8-c2': ['4.NF.6'], 'u8-c3': ['4.NF.7'], 'u8-c4': ['4.NF.3d'], 'u8-c5': ['4.NF.3c'], 'u8-c6': ['4.NF.3a'], 'u8-c7': ['4.NF.4a'], 'u8-c8': ['4.NF.5'],
  'u9-p1': ['4.NF.1'], 'u9-c1': ['4.NF.4a'], 'u9-c2': ['4.NF.1'], 'u9-c3': ['4.NF.2'], 'u9-c4': ['4.NF.2'], 'u9-c5': ['4.MD.4'], 'u9-c6': ['4.NF.4b'], 'u9-c7': ['4.NF.4c'], 'u9-c8': ['4.MD.4'],
  'u10-p1': ['5.NF.1'], 'u10-c1': ['4.NF.3c'], 'u10-c2': ['5.NF.1'], 'u10-c3': ['4.NF.3c'], 'u10-c4': ['5.NF.2'], 'u10-c5': ['5.NF.2', '4.MD.2'],
  'u11-p1': ['5.NF.4a'], 'u11-c1': ['5.NF.4a'], 'u11-c2': ['5.NF.5'], 'u11-c3': ['5.NF.4a'], 'u11-c4': ['5.NF.4a'], 'u11-c5': ['5.NF.4a'], 'u11-c6': ['5.NF.5'],
  'u12-p1': ['5.MD.1'], 'u12-c1': ['5.NF.7a'], 'u12-c2': ['5.NF.7b', '5.NF.7c'], 'u12-c3': ['5.NF.1', '4.MD.2'], 'u12-c4': ['5.NF.3'], 'u12-c5': ['5.MD.2'], 'u12-c6': ['5.NF.3'], 'u12-c7': ['5.NF.7a'], 'u12-c8': ['5.MD.1'], 'u12-c9': ['5.MD.2'],
  'u13-p1': [], 'u13-c1': [], 'u13-c2': ['4.NF.4b', '4.NF.4c'], 'u13-c3': ['5.NF.4b'], 'u13-c4': [], 'u13-c5': ['5.NF.6'], 'u13-c6': ['5.NF.4b'],
  'u14-p1': ['4.NF.6'], 'u14-c1': ['4.NF.1'], 'u14-c2': ['4.NF.7'], 'u14-c3': ['4.NF.1'], 'u14-c4': ['4.NF.3d', '4.NF.6'], 'u14-c5': ['4.NF.3d'],
  // Find the whole from one unit-fraction part (u15-c1: 6 marbles are 1/4 of a bag) is 5.NF.7b, as the catalog gives lesson 78. From a
  // non-unit part (u15-p1: 2/6 of the bar is 6 stickers; u15-c3: 3/5 of a pile is 12 cards) it divides by no unit fraction: it is a
  // real-world fraction-times-amount story worked backwards, 5.NF.6. u15-c5 renames 3/4 as eighths (4.NF.1) and then
  // counts how many 1/8-liter cups fit (a story that divides by a unit fraction, 5.NF.7c); it is not 4.NF.4a, which is groups of a unit fraction.
  'u15-p1': ['5.NF.6'], 'u15-c1': ['5.NF.7b'], 'u15-c2': ['4.NF.3a'], 'u15-c3': ['5.NF.6'], 'u15-c4': ['5.NF.6', '5.NF.2'], 'u15-c5': ['4.NF.1', '5.NF.7c'],
};

export const standardsForChallenge = (challengeId: string): StandardId[] => {
  const standards = CHALLENGE_STANDARDS[challengeId];
  if (!standards) throw new Error(`Missing challenge standards: ${challengeId}`);
  return standards;
};
