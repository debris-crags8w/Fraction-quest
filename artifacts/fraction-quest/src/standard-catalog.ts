export type StandardId = `${3 | 4 | 5}.${'NF' | 'G' | 'MD'}.${string}`;

export type FractionStandard = {
  id: StandardId;
  grade: 3 | 4 | 5;
  title: string;
  summary: string;
};

/** The standards this curriculum actually teaches or assesses. Bonus topics are intentionally excluded. */
export const FRACTION_STANDARDS: FractionStandard[] = [
  { id: '3.NF.1', grade: 3, title: 'Understand fractions as equal parts', summary: 'Name equal parts of one whole and build unit fractions.' },
  { id: '3.NF.2a', grade: 3, title: 'Fractions on number lines', summary: 'Show a fraction as a distance from zero.' },
  { id: '3.NF.2b', grade: 3, title: 'Fractions beyond one', summary: 'Use equal jumps to locate fractions, including amounts over one.' },
  { id: '3.NF.3a', grade: 3, title: 'Recognize equivalent fractions', summary: 'See when two fractions name the same amount.' },
  { id: '3.NF.3b', grade: 3, title: 'Explain fraction equivalence', summary: 'Use a model to show why equivalent fractions match.' },
  { id: '3.NF.3c', grade: 3, title: 'Whole numbers as fractions', summary: 'Write a whole number as a fraction.' },
  { id: '3.NF.3d', grade: 3, title: 'Compare fractions', summary: 'Compare fractions using equal-sized pieces and benchmarks.' },
  { id: '3.G.2', grade: 3, title: 'Partition shapes into equal areas', summary: 'Name equal-area parts even when the pieces have different shapes.' },
  { id: '3.MD.4', grade: 3, title: 'Measure and show data', summary: 'Measure fractional lengths and represent the measurements.' },
  { id: '4.NF.1', grade: 4, title: 'Generate equivalent fractions', summary: 'Multiply or divide the numerator and denominator by the same number.' },
  { id: '4.NF.2', grade: 4, title: 'Compare fractions with unlike denominators', summary: 'Use equivalent fractions or benchmarks to compare.' },
  { id: '4.NF.3a', grade: 4, title: 'Add and subtract like fractions', summary: 'Combine or take away equal-sized fractional parts.' },
  { id: '4.NF.3b', grade: 4, title: 'Compose and decompose fractions', summary: 'Break a fraction into sums of fractions with the same denominator.' },
  { id: '4.NF.3c', grade: 4, title: 'Add and subtract mixed numbers', summary: 'Combine wholes and fractional parts, regrouping when needed.' },
  { id: '4.NF.3d', grade: 4, title: 'Solve fraction word problems', summary: 'Use addition and subtraction with like-denominator fractions in context.' },
  { id: '4.NF.4a', grade: 4, title: 'Build multiples of unit fractions', summary: 'Understand a/b as a groups of 1/b.' },
  { id: '4.NF.4b', grade: 4, title: 'Multiply a fraction by a whole number', summary: 'Use repeated addition to find a whole-number multiple of a fraction.' },
  { id: '4.NF.4c', grade: 4, title: 'Find a fraction of a quantity', summary: 'Solve word problems that multiply a fraction by a whole number.' },
  { id: '4.NF.5', grade: 4, title: 'Write tenths as hundredths', summary: 'Use equivalent fractions to add tenths and hundredths.' },
  { id: '4.NF.6', grade: 4, title: 'Connect fractions and decimals', summary: 'Write fractions with denominators 10 or 100 as decimals.' },
  { id: '4.NF.7', grade: 4, title: 'Compare decimals', summary: 'Compare decimals to hundredths using place value.' },
  { id: '4.MD.2', grade: 4, title: 'Solve measurement problems', summary: 'Use fractions and unit conversions in measurement stories.' },
  { id: '4.MD.4', grade: 4, title: 'Read fraction line plots', summary: 'Interpret measurement data shown on a fraction line plot.' },
  { id: '5.NF.1', grade: 5, title: 'Add and subtract unlike fractions', summary: 'Rename fractions with common denominators before calculating.' },
  { id: '5.NF.2', grade: 5, title: 'Solve multi-step fraction problems', summary: 'Use estimation and fraction operations to solve stories.' },
  { id: '5.NF.3', grade: 5, title: 'Fractions as division', summary: 'Interpret a fraction as a division expression and solve sharing problems.' },
  { id: '5.NF.4a', grade: 5, title: 'Multiply fractions', summary: 'Interpret and calculate a fraction multiplied by a fraction.' },
  { id: '5.NF.4b', grade: 5, title: 'Find area with fractional sides', summary: 'Use fraction multiplication to find the area of a rectangle.' },
  { id: '5.NF.5', grade: 5, title: 'Understand fraction scaling', summary: 'Explain how multiplying by a fraction changes an amount.' },
  { id: '5.NF.6', grade: 5, title: 'Solve fraction multiplication stories', summary: 'Use visual models and equations for real-world multiplication.' },
  { id: '5.NF.7a', grade: 5, title: 'Divide a unit fraction', summary: 'Share a unit fraction equally among whole-number groups.' },
  { id: '5.NF.7b', grade: 5, title: 'Count unit fractions in a whole', summary: 'Find how many unit fractions fit into a whole number.' },
  { id: '5.NF.7c', grade: 5, title: 'Solve fraction division stories', summary: 'Use fraction division to solve real-world problems.' },
  { id: '5.MD.1', grade: 5, title: 'Convert measurement units', summary: 'Convert within a measurement system and use fraction amounts.' },
  { id: '5.MD.2', grade: 5, title: 'Reason with fraction line plots', summary: 'Solve problems using fractional measurement data.' },
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
  'benchmark-half': ['3.NF.3d'],
  'benchmarks-zero-one': ['3.NF.3d'],
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
  'mixed-improper': ['3.NF.2b', '3.NF.3c'],
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
  'multiply-whole-by-fraction': ['4.NF.4b'],
  'multiply-fractions': ['5.NF.4a'],
  'fraction-of-collection': ['5.NF.4a'],
  'divide-whole-by-unit-fraction': ['5.NF.7b', '5.NF.7c'],
  'unit-fraction-multiples': ['4.NF.4a'],
  'multiplication-scaling': ['5.NF.5'],
  'multiply-mixed-numbers': ['5.NF.6'],
  'unit-fraction-divided-whole': ['5.NF.7a'],
  'fraction-of-length': ['5.NF.4a'],
  'fractional-measure-addition': ['4.NF.3d', '4.MD.2'],
  'ruler-measurement': ['3.MD.4'],
  'build-line-plots': ['3.MD.4'],
  'read-line-plots': ['4.MD.4'],
  'line-plot-leveling': ['5.MD.2'],
  'measurement-word-problems': ['4.MD.2'],
  'fractional-unit-conversions': ['5.MD.1'],
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
  'multi-step-fraction-stories': ['5.NF.2'],
  'find-the-whole': ['4.NF.4c'],
  'spot-the-mistake': ['4.NF.3a', '4.NF.2'],
  'fraction-of-remainder': ['5.NF.6', '5.NF.2'],
  'divide-fractions': [],
};

export const standardsForMission = (missionId: string): StandardId[] => MISSION_STANDARDS[missionId] ?? [];
export const gradeForStandard = (standard: string): 3 | 4 | 5 | null => {
  const grade = Number(standard[0]);
  return grade === 3 || grade === 4 || grade === 5 ? grade : null;
};

/** Challenge questions are tagged with the unit's taught standards; they do not alone establish mastery. */
export const UNIT_CHALLENGE_STANDARDS: Record<number, StandardId[]> = {
  1: ['3.NF.1', '3.G.2'],
  2: ['3.NF.3d'],
  3: ['3.NF.3d'],
  4: ['3.NF.2a', '3.NF.2b'],
  5: ['3.NF.3d', '4.NF.2'],
  6: ['3.NF.3a', '3.NF.3b', '4.NF.1'],
  7: ['3.NF.3c', '4.NF.3b', '4.NF.3c'],
  8: ['4.NF.3a', '4.NF.5', '4.NF.6', '5.NF.1'],
  9: ['3.NF.3c', '4.NF.1', '4.NF.2'],
  10: ['4.NF.3c', '4.NF.4c', '5.NF.1'],
  11: ['4.NF.4a', '4.NF.4b', '4.NF.4c', '5.NF.4a', '5.NF.5', '5.NF.6', '5.NF.7a', '5.NF.7b'],
  12: ['3.MD.4', '4.MD.2', '4.MD.4', '5.MD.1', '5.MD.2', '5.NF.3'],
  13: ['3.G.2', '3.NF.3a', '4.NF.4c', '5.NF.6'],
  14: ['4.NF.6', '4.NF.7', '5.NF.2'],
  15: ['4.NF.2', '4.NF.3a', '4.NF.4c', '5.NF.2', '5.NF.6'],
};

export const standardsForChallenge = (challengeId: string): StandardId[] => {
  const unit = Number(/^u(\d+)-/.exec(challengeId)?.[1]);
  return UNIT_CHALLENGE_STANDARDS[unit] ?? [];
};
