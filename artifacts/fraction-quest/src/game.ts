import { hasLearningGate, type LearningRecord } from './learning';
import { getBuildChecks, getWorksheet } from './learning-content';

export type FractionValue = { numerator: number; denominator: number };

export type ModelSpec =
  | { kind: 'bars'; bars: FractionValue[]; caption?: string; hideLabels?: boolean }
  | { kind: 'set'; selected: number; total: number; caption?: string }
  | { kind: 'line'; numerator: number; denominator: number; wholes?: number; caption?: string; hideLabels?: boolean }
  | { kind: 'partition'; parts: number[]; caption?: string }
  | { kind: 'equation'; text: string; caption?: string }
  | { kind: 'decimal'; tenths: number; caption?: string; hideLabels?: boolean };

export type PracticeQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  correctChoice: number;
  hint: string;
  retryFeedback: string;
  model: ModelSpec;
  simplerModel: ModelSpec;
  isMastery?: boolean;
  isReview?: boolean;
  isOptionalReview?: boolean;
  reviewMissionId?: string;
  reviewQuestionId?: string;
  reviewTopicTitle?: string;
};

export type WorkedExample = {
  prompt: string;
  answer: string;
  explanation: string;
  model: ModelSpec;
};

export type Mission = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  skill: string;
  unit: number;
  example: WorkedExample;
  questions: PracticeQuestion[];
};

export type Progress = {
  completedMissionIds: string[];
  starsByMission: Record<string, number>;
  reviewQueue: SkillReview[];
  learning?: Record<string, LearningRecord>;
  /** Best Unit challenge score, keyed by unit number. */
  challengeBest?: Record<string, number>;
};

export type SkillReview = {
  missionId: string;
  missedQuestionId: string;
  dueAt: number;
  reviewCount: number;
};

export type Answer = number;
type PracticeSeed = Omit<PracticeQuestion, 'id' | 'isMastery' | 'isReview'>;
type MissionSeed = Omit<Mission, 'questions'> & { questions: PracticeSeed[] };

export function numberLineWholeCount(numerator: number, denominator: number): number {
  if (!Number.isSafeInteger(numerator) || numerator < 0 || !Number.isSafeInteger(denominator) || denominator <= 0) {
    throw new RangeError('A number-line fraction needs a non-negative integer numerator and positive integer denominator.');
  }
  return Math.max(1, Math.ceil(numerator / denominator));
}

const bars = (...fractions: FractionValue[]): ModelSpec => ({ kind: 'bars', bars: fractions });
const setModel = (selected: number, total: number, caption?: string): ModelSpec => ({ kind: 'set', selected, total, caption });
const line = (numerator: number, denominator: number, wholes = numberLineWholeCount(numerator, denominator)): ModelSpec => ({ kind: 'line', numerator, denominator, wholes });
const equation = (text: string): ModelSpec => ({ kind: 'equation', text });
const decimal = (tenths: number): ModelSpec => ({ kind: 'decimal', tenths });

function practice(
  prompt: string,
  choices: string[],
  correctChoice: number,
  model: ModelSpec,
  hint: string,
  retryFeedback: string,
  simplerModel: ModelSpec,
): PracticeSeed {
  return { prompt, choices, correctChoice, model, hint, retryFeedback, simplerModel };
}

function mission(seed: MissionSeed): Mission {
  const questions = seed.questions.map((question, index) => ({
    ...question,
    id: `${seed.id}-q${index + 1}`,
    isMastery: index === seed.questions.length - 1,
  }));
  return { ...seed, questions };
}

const curriculum: MissionSeed[] = [
  {
    id: 'equal-parts', unit: 1, title: 'Same whole, fair pieces', shortTitle: 'Equal parts', skill: 'A fraction is made of equal parts of 1 whole.',
    description: 'Spot fair, equal pieces.', example: {
      prompt: 'A strip is cut into 4 pieces. When are they fourths?',
      answer: 'When all 4 pieces are the same size.',
      explanation: 'Fourths must be equal. 4 unequal pieces are not fourths.',
      model: { kind: 'partition', parts: [25, 25, 25, 25], caption: '1 whole cut into equal pieces' },
    },
    questions: [
      practice('Which strip shows thirds?', ['3 equal pieces', '3 pieces, one much bigger', '2 equal pieces'], 0, { kind: 'partition', parts: [100 / 3, 100 / 3, 100 / 3] }, 'Thirds are 3 equal pieces.', 'Thirds need 3 pieces, and they must be the same size.', { kind: 'partition', parts: [50, 50] }),
      practice('A sandwich is cut into 4 equal pieces. What is 1 piece?', ['1/3', '1/4', '4/1'], 1, bars({ numerator: 1, denominator: 4 }), '1 piece out of 4 equal pieces is 1/4.', 'The bottom number is all 4 pieces. You have 1.', bars({ numerator: 1, denominator: 2 })),
      practice('Which ribbon is cut into fair halves?', ['Both pieces are the same size', 'One piece is twice as long', 'The ribbon with 3 pieces'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 2 }), 'Halves are 2 equal pieces.', '2 pieces are only halves if they are the same size.', bars({ numerator: 1, denominator: 2 })),
      practice('A pizza has 5 equal slices. What is 1 slice?', ['one fifth', 'one fourth', 'five wholes'], 0, bars({ numerator: 1, denominator: 5 }), '1 slice out of 5 equal slices.', '1 of 5 equal pieces is one fifth, or 1/5.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'fraction-names', unit: 1, title: 'Read a fraction', shortTitle: 'Fraction names', skill: 'Bottom number: equal parts. Top number: parts you count.',
    description: 'Learn what the top and bottom numbers mean.', example: {
      prompt: 'In 3/5, what does each number tell you?',
      answer: '5 equal parts in all. 3 are counted.',
      explanation: 'Bottom (5): equal pieces in all. Top (3): pieces you count.',
      model: bars({ numerator: 3, denominator: 5 }),
    },
    questions: [
      practice('In 2/7, what does the 7 mean?', ['7 equal parts in the whole', '7 parts are shaded', '7 wholes'], 0, bars({ numerator: 2, denominator: 7 }), 'Look at the bottom number.', 'The bottom number is how many equal parts in all.', bars({ numerator: 1, denominator: 3 })),
      practice('A tray has 6 spaces. 4 have a snack. What fraction have a snack?', ['6/4', '4/6', '4/4'], 1, bars({ numerator: 4, denominator: 6 }), 'Top: spaces with a snack. Bottom: all the spaces.', 'Top: 4 with a snack. Bottom: 6 in all.', bars({ numerator: 1, denominator: 2 })),
      practice('In 5/8, how many pieces are counted?', ['8', '5', '13'], 1, bars({ numerator: 5, denominator: 8 }), 'Look at the top number.', 'The top number is 5. So 5 pieces are counted.', bars({ numerator: 2, denominator: 4 })),
      practice('A shape has 9 equal parts. 1 is colored. What fraction is colored?', ['1/9', '9/1', '1/8'], 0, bars({ numerator: 1, denominator: 9 }), '1 colored part out of 9.', 'Put all 9 parts on the bottom. Put the 1 colored part on top.', bars({ numerator: 1, denominator: 4 })),
    ],
  },
  {
    id: 'unit-fractions', unit: 1, title: 'One piece at a time', shortTitle: 'Unit fractions', skill: 'A unit fraction has 1 on top.',
    description: 'Find just 1 equal piece.', example: {
      prompt: 'What fraction is 1 of 6 equal pieces?',
      answer: '1/6',
      explanation: 'A unit fraction is just 1 piece. 1/6 is 1 of 6 pieces.',
      model: bars({ numerator: 1, denominator: 6 }),
    },
    questions: [
      practice('Which is a unit fraction?', ['3/8', '1/8', '8/1'], 1, bars({ numerator: 1, denominator: 8 }), 'A unit fraction has 1 on top.', 'Look for the one with 1 on top.', bars({ numerator: 1, denominator: 4 })),
      practice('A whole is cut into 10 equal pieces. What is 1 piece?', ['1/10', '10/1', '1/9'], 0, bars({ numerator: 1, denominator: 10 }), '10 pieces in all. You have 1.', '1 of 10 equal pieces is 1/10.', bars({ numerator: 1, denominator: 5 })),
      practice('Which one shows 1/3?', ['1 of 3 equal parts', '3 of 3 equal parts', '1 of 4 unequal parts'], 0, bars({ numerator: 1, denominator: 3 }), '1/3 is 1 of 3 equal parts.', 'You need 3 equal pieces. Count 1.', bars({ numerator: 1, denominator: 2 })),
      practice('What fraction is 1 of 12 equal tiles?', ['12/1', '1/12', '1/11'], 1, bars({ numerator: 1, denominator: 12 }), '1 tile out of 12.', '1 out of 12 equal parts is 1/12.', bars({ numerator: 1, denominator: 6 })),
    ],
  },
  {
    id: 'unit-size', unit: 2, title: 'More pieces, smaller pieces', shortTitle: 'Unit fraction size', skill: 'Cut a whole into more pieces, and each piece gets smaller.',
    description: 'Compare 1 piece from same-size wholes.', example: {
      prompt: 'Which is bigger, 1/3 or 1/8?',
      answer: '1/3 is bigger.',
      explanation: '3 pieces are bigger than 8 pieces of the same whole.',
      model: bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 8 }),
    },
    questions: [
      practice('Which piece is bigger, 1/4 or 1/6?', ['1/6', '1/4', 'They are equal'], 1, bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 6 }), 'Cut a whole into 4. Cut another into 6. Which pieces are bigger?', 'More cuts make smaller pieces. Fourths are bigger.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is bigger, 1/9 or 1/5?', ['1/9', '1/5', 'They match'], 1, bars({ numerator: 1, denominator: 9 }, { numerator: 1, denominator: 5 }), 'Both are 1 piece. Which whole has fewer pieces?', 'Fifths are bigger. 5 pieces is fewer than 9.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is closer to one whole: 1/2 or 1/10?', ['1/10', '1/2', 'They are equally close'], 1, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 10 }), 'The bigger piece is closer to 1 whole.', '1/2 is much bigger than 1/10.', bars({ numerator: 1, denominator: 4 })),
      practice('Which is smaller: 1/3 or 1/7?', ['1/3', '1/7', 'They are the same'], 1, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 7 }), 'Which whole has more pieces?', '7 pieces are smaller than 3 pieces.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'sets-unit-fractions', unit: 2, title: 'Fractions in a group', shortTitle: 'Fractions of sets', skill: 'A fraction of a group uses equal groups.',
    description: 'Share things into equal groups.', example: {
      prompt: 'There are 12 buttons. What is 1/3 of the buttons?',
      answer: '4 buttons.',
      explanation: 'Make 3 equal groups. Each has 4. So 1/3 is 4.',
      model: setModel(4, 12, '1 of 3 equal groups'),
    },
    questions: [
      practice('What is 1/4 of 12 toy cars?', ['3 cars', '4 cars', '8 cars'], 0, setModel(3, 12), 'Make 4 equal groups. Count 1 group.', '12 in 4 groups is 3 each. 1 group is 3.', setModel(2, 8)),
      practice('What is 1/3 of 15 beads?', ['3 beads', '5 beads', '12 beads'], 1, setModel(5, 15), 'Make 3 equal groups.', '15 in 3 groups is 5 each.', setModel(3, 9)),
      practice('What is 1/2 of 10 shells?', ['5 shells', '2 shells', '8 shells'], 0, setModel(5, 10), 'Make 2 equal groups.', '10 in 2 groups is 5 each.', setModel(4, 8)),
      practice('A class has 20 pencils. What is 1/5 of the pencils?', ['4', '5', '15'], 0, setModel(4, 20), 'Make 5 equal groups. Count 1 group.', '20 in 5 groups is 4 each.', setModel(2, 10)),
    ],
  },
  {
    id: 'sets-nonunit', unit: 2, title: 'More than one group', shortTitle: 'Count groups in a set', skill: 'Make the equal groups first. Then count the groups you need.',
    description: 'Count 2 or 3 equal groups.', example: {
      prompt: 'What is 2/5 of 15 counters?',
      answer: '6 counters.',
      explanation: 'Make 5 groups of 3. Count 2 groups: 3 + 3 = 6.',
      model: setModel(6, 15, '2 of 5 equal groups'),
    },
    questions: [
      practice('What is 2/3 of 12?', ['8', '4', '9'], 0, setModel(8, 12), 'Make 3 equal groups. Count 2.', '12 in 3 groups is 4 each. 2 groups is 8.', setModel(4, 12)),
      practice('What is 3/4 of 8 stickers?', ['2 stickers', '6 stickers', '7 stickers'], 1, setModel(6, 8), 'Make 4 equal groups. Count 3.', '8 in 4 groups is 2 each. 3 groups is 6.', setModel(4, 8)),
      practice('What is 2/5 of 20 cubes?', ['8 cubes', '5 cubes', '10 cubes'], 0, setModel(8, 20), 'Make 5 equal groups. Count 2.', '20 in 5 groups is 4 each. 2 groups is 8.', setModel(4, 20)),
      practice('What is 3/6 of 18 buttons?', ['9 buttons', '6 buttons', '15 buttons'], 0, setModel(9, 18), 'Make 6 equal groups. Count 3.', '18 in 6 groups is 3 each. 3 groups is 9.', setModel(6, 18)),
    ],
  },
  {
    id: 'benchmark-half', unit: 3, title: 'Is it less or more than half?', shortTitle: 'Near one half', skill: 'Use 1/2 to tell if a fraction is big or small.',
    description: 'Is it more or less than half?', example: {
      prompt: 'Is 3/8 more or less than 1/2?',
      answer: 'Less than 1/2.',
      explanation: 'Half of 8 is 4. 3 is less than 4.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 1, denominator: 2 }),
    },
    questions: [
      practice('Which is more than 1/2?', ['2/6', '5/8', '3/10'], 1, bars({ numerator: 5, denominator: 8 }), 'Half of 8 is 4. Is 5 more than 4?', '5/8 is more than half. The others are less.', bars({ numerator: 1, denominator: 2 })),
      practice('Is 2/5 more or less than 1/2?', ['Less than 1/2', 'Equal to 1/2', 'More than 1/2'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 1, denominator: 2 }), 'Half of 5 is 2 and a half.', '2 is less than 2 and a half. So 2/5 is less than half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is closest to 1/2?', ['4/9', '1/5', '7/8'], 0, bars({ numerator: 4, denominator: 9 }, { numerator: 1, denominator: 5 }, { numerator: 7, denominator: 8 }), 'Which one is nearest to half?', '4/9 is just under half. The others are far away.', bars({ numerator: 1, denominator: 2 })),
      practice('A jug is 6/10 full. Is that more or less than half?', ['More than half', 'Less than half', 'Exactly half'], 0, bars({ numerator: 6, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Half of 10 is 5.', '6 is more than 5. So 6/10 is more than half.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'benchmarks-zero-one', unit: 3, title: 'Near zero, half, or one?', shortTitle: 'Near 0, 1/2 or 1', skill: 'Is it near 0, 1/2 or 1?',
    description: 'Guess the size using 0, 1/2 and 1.', example: {
      prompt: 'Is 7/8 near 0, 1/2 or 1?',
      answer: 'Near 1.',
      explanation: '7 of 8 pieces are counted. Just 1 piece is missing.',
      model: bars({ numerator: 7, denominator: 8 }),
    },
    questions: [
      practice('Which amount is closest to 0?', ['1/8', '4/5', '7/8'], 0, bars({ numerator: 1, denominator: 8 }, { numerator: 4, denominator: 5 }, { numerator: 7, denominator: 8 }), 'The smallest shaded part is closest to 0.', '1/8 is tiny. The others are almost full.', bars({ numerator: 1, denominator: 4 })),
      practice('Which fraction is closest to 1 whole?', ['2/9', '8/9', '4/9'], 1, bars({ numerator: 2, denominator: 9 }, { numerator: 8, denominator: 9 }, { numerator: 4, denominator: 9 }), 'Which one is missing just 1 piece?', '8/9 is just 1 piece away from 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is between 1/2 and 1?', ['3/8', '3/4', '1/4'], 1, bars({ numerator: 3, denominator: 4 }), 'Find one past half but not full.', '3/4 is more than half but less than 1.', bars({ numerator: 1, denominator: 2 })),
      practice('A plant grew 9/10 of a meter. Is that near 0 or 1 meter?', ['0 meters', '1 meter', 'Exactly halfway'], 1, bars({ numerator: 9, denominator: 10 }), 'Just 1 tenth is missing.', '9/10 is almost 1 whole meter.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'fraction-magnitude', unit: 3, title: 'Fractions can be close together', shortTitle: 'Estimate size', skill: 'Guess how big a fraction is.',
    description: 'Guess first, then check.', example: {
      prompt: 'Is 5/12 more or less than 1/2?',
      answer: 'A little less than 1/2.',
      explanation: 'Half of 12 is 6. 5 is just 1 less.',
      model: bars({ numerator: 5, denominator: 12 }, { numerator: 1, denominator: 2 }),
    },
    questions: [
      practice('Which is just a little less than 1/2?', ['4/9', '1/8', '8/9'], 0, bars({ numerator: 4, denominator: 9 }, { numerator: 1, denominator: 2 }), 'Half of 9 is 4 and a half. 4 is close.', '4/9 is just under half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is a little more than 1/2?', ['3/8', '5/9', '1/6'], 1, bars({ numerator: 5, denominator: 9 }, { numerator: 1, denominator: 2 }), 'Half of 9 is 4 and a half. Which is a bit more?', '5/9 is just over half. The others are under.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is closest to 1?', ['6/7', '2/7', '3/7'], 0, bars({ numerator: 6, denominator: 7 }, { numerator: 2, denominator: 7 }, { numerator: 3, denominator: 7 }), 'Which top number is closest to 7?', '6/7 is just 1 piece away from 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('About how much is 1/10 + 1/10 + 1/10 + 1/10 + 1/10?', ['About 1/2', 'About 1/5', 'About 1 whole'], 0, bars({ numerator: 5, denominator: 10 }), '5 tenths is halfway.', '5/10 is the same as 1/2.', bars({ numerator: 2, denominator: 4 })),
    ],
  },
  {
    id: 'number-line-basics', unit: 4, title: 'Build a fraction number line', shortTitle: 'Split the line', skill: 'Cut 0 to 1 into equal spaces.',
    description: 'Every jump is the same size.', example: {
      prompt: 'How many spaces do you need for thirds?',
      answer: '3 equal spaces.',
      explanation: 'The bottom number is how many spaces from 0 to 1.',
      model: line(1, 3),
    },
    questions: [
      practice('0 to 1 has 5 equal spaces. What is 1 jump?', ['1/5', '1/4', '5/1'], 0, line(1, 5), 'Count the spaces from 0 to 1.', '5 jumps make 1 whole. So 1 jump is 1/5.', line(1, 2)),
      practice('How many spaces do you need for fourths?', ['4 spaces', '3 spaces', '5 spaces'], 0, line(2, 4), 'Fourths means 4 equal pieces.', 'Fourths need 4 spaces from 0 to 1.', line(1, 2)),
      practice('A line has 8 equal spaces. Where is 3/8?', ['3 jumps from 0', '8 jumps from 0', '3 jumps past 1'], 0, line(3, 8), 'Start at 0. Count 3 jumps.', 'The top number 3 means 3 jumps.', line(1, 4)),
      practice('0 to 1 has 6 equal spaces. What is 5 jumps?', ['5/6', '6/5', '1/5'], 0, line(5, 6), 'Count 5 jumps from 0.', '5 jumps of 1/6 is 5/6.', line(2, 4)),
    ],
  },
  {
    id: 'number-line-points', unit: 4, title: 'Find the marked fraction', shortTitle: 'Read the line', skill: 'Count jumps from 0 to name a point.',
    description: 'Count jumps from 0.', example: {
      prompt: 'A line has 7 spaces. The point is 4 jumps from 0. What is it?',
      answer: '4/7',
      explanation: 'Each jump is 1/7. 4 jumps is 4/7.',
      model: line(4, 7),
    },
    questions: [
      practice('A line has 3 spaces. The point is 2 jumps from 0. What is it?', ['2/3', '3/2', '1/3'], 0, line(2, 3), '3 spaces in all. 2 jumps.', '2 jumps of 1/3 is 2/3.', line(1, 2)),
      practice('The point is halfway from 0 to 1. What is it?', ['1/2', '1/4', '2/1'], 0, line(1, 2), 'Halfway is 1 of 2 jumps.', 'Halfway is 1/2.', line(1, 2)),
      practice('A line has 10 spaces. What is 7 jumps from 0?', ['7/10', '10/7', '3/10'], 0, line(7, 10), 'Each jump is 1/10. Count 7.', '7 jumps of 1/10 is 7/10.', line(3, 5)),
      practice('A line has 8 spaces. The point is 5 jumps from 0. What is it?', ['5/8', '8/5', '5/3'], 0, line(5, 8), 'Each jump is 1/8. Count 5.', '5 jumps of 1/8 is 5/8.', line(1, 2)),
    ],
  },
  {
    id: 'number-line-beyond-one', unit: 4, title: 'Keep going past one', shortTitle: 'Past one whole', skill: 'Fractions can go past 1.',
    description: 'Keep counting jumps past 1.', example: {
      prompt: 'Each jump is 1/5. What is 7 jumps from 0?',
      answer: '7/5, or 1 and 2/5.',
      explanation: '5 jumps make 1 whole. 2 more jumps is 7/5.',
      model: line(7, 5, 2),
    },
    questions: [
      practice('Each jump is 1/4. What is 5 jumps from 0?', ['5/4', '4/5', '1/4'], 0, line(5, 4, 2), '4 jumps reach 1. Then 1 more.', '5 jumps is 5/4. That is 1 and 1/4.', line(3, 4)),
      practice('Each jump is 1/3. Which point is just past 1?', ['2/3', '4/3', '1/3'], 1, line(4, 3, 2), '3 jumps reach 1. 1 more is 4/3.', '4/3 is 1 and 1/3, just past 1.', line(2, 3)),
      practice('How many sixths make 1 and 2/6?', ['8/6', '6/8', '2/6'], 0, line(8, 6, 2), '1 whole is 6/6. Add 2 more.', '6/6 + 2/6 = 8/6.', line(6, 6)),
      practice('A runner takes 9 steps of 1/5. How far is that?', ['1 and 3/5', '9/5 = 1 and 4/5', '4/5'], 1, line(9, 5, 2), '5 steps make 1 whole. How many are left?', '9/5 is 5/5 and 4/5. That is 1 and 4/5.', line(5, 5)),
    ],
  },
  {
    id: 'compare-same-denominator', unit: 5, title: 'Same pieces, different counts', shortTitle: 'Compare like pieces', skill: 'Same bottom number? The bigger top number wins.',
    description: 'Compare fractions with same-size pieces.', example: {
      prompt: 'Which is bigger, 3/8 or 5/8?',
      answer: '5/8.',
      explanation: 'Both use eighths. 5 pieces is more than 3.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 5, denominator: 8 }),
    },
    questions: [
      practice('Which is bigger, 4/7 or 2/7?', ['2/7', '4/7', 'They are equal'], 1, bars({ numerator: 4, denominator: 7 }, { numerator: 2, denominator: 7 }), 'Same size pieces. Which has more?', '4 pieces is more than 2 pieces.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is smaller, 3/10 or 8/10?', ['3/10', '8/10', 'They match'], 0, bars({ numerator: 3, denominator: 10 }, { numerator: 8, denominator: 10 }), 'Both are tenths. Which has fewer?', '3 tenths is less than 8 tenths.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 6/9 __ 7/9', ['>', '<', '='], 1, bars({ numerator: 6, denominator: 9 }, { numerator: 7, denominator: 9 }), 'Same bottom number. Compare 6 and 7.', '6 is less than 7. So 6/9 < 7/9.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is bigger, 5/12 or 9/12?', ['5/12', '9/12', 'They are equal'], 1, bars({ numerator: 5, denominator: 12 }, { numerator: 9, denominator: 12 }), 'Same size pieces. Count them.', '9 pieces is more than 5.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'compare-same-numerator', unit: 5, title: 'Same count, different sizes', shortTitle: 'Compare same tops', skill: 'Same top number? The smaller bottom number wins.',
    description: 'Compare fractions with the same top number.', example: {
      prompt: 'Which is bigger, 3/5 or 3/8?',
      answer: '3/5.',
      explanation: 'Both have 3 pieces. Fifths are bigger than eighths.',
      model: bars({ numerator: 3, denominator: 5 }, { numerator: 3, denominator: 8 }),
    },
    questions: [
      practice('Which is bigger, 2/3 or 2/7?', ['2/7', '2/3', 'They are equal'], 1, bars({ numerator: 2, denominator: 3 }, { numerator: 2, denominator: 7 }), 'Both have 2 pieces. Which pieces are bigger?', 'Thirds are bigger than sevenths. So 2/3 wins.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is smaller, 4/5 or 4/9?', ['4/5', '4/9', 'They are equal'], 1, bars({ numerator: 4, denominator: 5 }, { numerator: 4, denominator: 9 }), 'Both have 4 pieces. Ninths are smaller.', '4/9 is less than 4/5.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 1/6 __ 1/4', ['>', '<', '='], 1, bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 4 }), 'More pieces means smaller pieces.', '1/6 is smaller than 1/4.', bars({ numerator: 1, denominator: 2 })),
      practice('Which covers more: 3/10 or 3/8?', ['3/10', '3/8', 'They cover the same'], 1, bars({ numerator: 3, denominator: 10 }, { numerator: 3, denominator: 8 }), 'Both have 3 pieces. Which pieces are bigger?', 'Eighths are bigger than tenths. So 3/8 covers more.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'order-fractions', unit: 5, title: 'Put fractions in order', shortTitle: 'Order fractions', skill: 'Put fractions in order from small to big.',
    description: 'Compare amounts, not just numbers.', example: {
      prompt: 'Put 1/4, 3/4 and 1/2 in order, smallest first.',
      answer: '1/4, 1/2, 3/4',
      explanation: '1/4 is less than half. 3/4 is more than half.',
      model: bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 2 }, { numerator: 3, denominator: 4 }),
    },
    questions: [
      practice('Which order goes smallest to biggest?', ['1/3, 2/3, 3/3', '3/3, 2/3, 1/3', '2/3, 1/3, 3/3'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }, { numerator: 3, denominator: 3 }), 'All thirds. Count the pieces.', '1/3 is smallest. 3/3 is 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('Which order goes biggest to smallest?', ['1/2, 1/4, 1/5', '1/5, 1/4, 1/2', '1/4, 1/2, 1/5'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 4 }, { numerator: 1, denominator: 5 }), 'Fewer pieces means bigger pieces.', '1/2 is biggest, then 1/4, then 1/5.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fits between 2/8 and 6/8?', ['1/8', '4/8', '7/8'], 1, bars({ numerator: 2, denominator: 8 }, { numerator: 4, denominator: 8 }, { numerator: 6, denominator: 8 }), 'All eighths. Which top number is between 2 and 6?', '4 is between 2 and 6.', bars({ numerator: 1, denominator: 2 })),
      practice('Put 1/2, 3/10 and 8/10 in order, smallest first.', ['3/10, 1/2, 8/10', '8/10, 1/2, 3/10', '1/2, 3/10, 8/10'], 0, bars({ numerator: 3, denominator: 10 }, { numerator: 1, denominator: 2 }, { numerator: 8, denominator: 10 }), '1/2 is the same as 5/10. Compare to that.', '3/10 is less than half. 8/10 is more.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'equivalent-models', unit: 6, title: 'Same amount, new name', shortTitle: 'See equivalence', skill: 'Different fractions can be the same amount.',
    description: 'Find fractions that match.', example: {
      prompt: 'How can 1/2 and 2/4 be the same?',
      answer: 'Cut each half into 2 pieces.',
      explanation: 'Now there are 4 pieces. 2 are shaded.',
      model: bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }),
    },
    questions: [
      practice('Which fraction covers the same amount as 1/2?', ['2/4', '1/4', '3/4'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }), 'Which bar is shaded just as far?', '2/4 covers the same as 1/2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 2/3?', ['4/6', '3/6', '2/6'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }), 'Cut each third into 2 pieces.', 'Double the top and bottom: 2/3 = 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 3/4?', ['6/8', '3/8', '4/8'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 }), 'Cut each fourth into 2 pieces.', '3/4 and 6/8 are the same amount.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 2/5?', ['4/10', '2/10', '5/2'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 10 }), 'Multiply the top and bottom by the same number.', 'Double both: 2/5 = 4/10.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'build-equivalents', unit: 6, title: 'Make a matching fraction', shortTitle: 'Make a match', skill: 'Multiply the top and bottom by the same number.',
    description: 'New name, same amount.', example: {
      prompt: 'Double the top and bottom of 2/3. What do you get?',
      answer: '4/6',
      explanation: 'Cut each third in half. 2/3 becomes 4/6.',
      model: bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }),
    },
    questions: [
      practice('Times the top and bottom of 1/4 by 3. What do you get?', ['3/12', '1/12', '4/3'], 0, bars({ numerator: 1, denominator: 4 }, { numerator: 3, denominator: 12 }), 'Do the same thing to the top and bottom.', '1 × 3 = 3 and 4 × 3 = 12. So 3/12.', bars({ numerator: 1, denominator: 2 })),
      practice('Double the top and bottom of 3/5. What do you get?', ['6/10', '3/10', '5/6'], 0, bars({ numerator: 3, denominator: 5 }, { numerator: 6, denominator: 10 }), 'Double the top and the bottom.', '3 × 2 = 6 and 5 × 2 = 10. So 6/10.', bars({ numerator: 1, denominator: 2 })),
      practice('Divide the top and bottom of 4/8 by 4. What do you get?', ['1/2', '1/8', '4/4'], 0, bars({ numerator: 4, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Divide both by 4.', '4 ÷ 4 = 1 and 8 ÷ 4 = 2. So 1/2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 5/10?', ['1/2', '1/5', '5/5'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 1, denominator: 2 }), 'Can you divide both by the same number?', 'Divide both by 5. You get 1/2.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'missing-equivalent', unit: 6, title: 'Find the missing number', shortTitle: 'Missing parts', skill: 'Find the pattern. Top and bottom change by the same number.',
    description: 'Fill the blank. Keep it the same amount.', example: {
      prompt: 'Fill the blank: 2/3 = ?/6',
      answer: '4/6',
      explanation: 'The bottom doubled, 3 to 6. Double the top too: 2 to 4.',
      model: bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }),
    },
    questions: [
      practice('Fill the blank: 1/2 = ?/8', ['4/8', '2/8', '1/8'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 4, denominator: 8 }), 'What times 2 makes 8?', 'The bottom was times 4. Do the same to the top.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: 3/4 = 6/?', ['8', '12', '10'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 }), 'The top was doubled.', 'Double the bottom too: 4 × 2 = 8.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: ?/10 = 2/5', ['4', '2', '5'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 10 }), 'The bottom doubled, 5 to 10.', 'Double the top too: 2 to 4.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: 4/6 = 2/?', ['3', '6', '4'], 0, bars({ numerator: 4, denominator: 6 }, { numerator: 2, denominator: 3 }), 'The top was cut in half.', 'Halve the bottom too: 6 ÷ 2 = 3.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'compose-to-one', unit: 7, title: 'Put pieces together', shortTitle: 'Make 1 whole', skill: 'Put same-size pieces together to make 1 whole.',
    description: 'Add pieces until you have 1 whole.', example: {
      prompt: 'How many 1/4 pieces make 1 whole?',
      answer: '4 pieces: 4/4 = 1.',
      explanation: '4 fourths make 1 whole.',
      model: bars({ numerator: 4, denominator: 4 }),
    },
    questions: [
      practice('How many 1/5 pieces make 1 whole?', ['5 pieces', '4 pieces', '10 pieces'], 0, bars({ numerator: 5, denominator: 5 }), 'The bottom number is how many pieces make 1 whole.', '5 fifths make 1 whole: 5/5 = 1.', bars({ numerator: 2, denominator: 4 })),
      practice('Which sum makes 1 whole?', ['1/3 + 2/3', '1/4 + 1/4', '2/5 + 1/5'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }), 'Look for top numbers that add up to the bottom number.', '1/3 + 2/3 = 3/3. That is 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('What is 2/8 + 6/8?', ['8/8 = 1', '8/16', '4/8'], 0, bars({ numerator: 2, denominator: 8 }, { numerator: 6, denominator: 8 }), 'Add the top numbers. Keep eighths.', '2 + 6 = 8. 8/8 is 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('A recipe uses 3/6 cup, then 3/6 cup more. How much in all?', ['6/6 = 1 cup', '6/12 cup', '3/6 cup'], 0, bars({ numerator: 3, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Add the tops. How many sixths fill 1 cup?', '3 + 3 = 6. 6/6 is 1 cup.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'decompose-fractions', unit: 7, title: 'Break a fraction apart', shortTitle: 'Break apart', skill: 'Split a fraction into smaller parts.',
    description: 'Show one amount in different ways.', example: {
      prompt: 'Split 5/6 into two parts. Keep sixths.',
      answer: '2/6 + 3/6 = 5/6.',
      explanation: 'Keep the sixths. Split 5 pieces into 2 and 3.',
      model: bars({ numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }, { numerator: 5, denominator: 6 }),
    },
    questions: [
      practice('Which sum equals 4/7?', ['1/7 + 3/7', '1/7 + 2/7', '4/7 + 4/7'], 0, bars({ numerator: 1, denominator: 7 }, { numerator: 3, denominator: 7 }), 'Add the tops. Keep sevenths.', '1 + 3 = 4. So 4/7.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: 6/8 = 2/8 + ?/8', ['4/8', '3/8', '8/8'], 0, bars({ numerator: 2, denominator: 8 }, { numerator: 4, denominator: 8 }, { numerator: 6, denominator: 8 }), '6 take away 2 is what?', '6 − 2 = 4. So 4/8.', bars({ numerator: 1, denominator: 2 })),
      practice('Which adds up to 3/5?', ['1/5 + 2/5', '1/5 + 1/5', '3/5 + 2/5'], 0, bars({ numerator: 1, denominator: 5 }, { numerator: 2, denominator: 5 }), 'Add the top numbers.', '1 + 2 = 3. So 3/5.', bars({ numerator: 1, denominator: 2 })),
      practice('7/10 = 5/10 + what?', ['2/10', '3/10', '5/10'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 2, denominator: 10 }), '7 take away 5 is what?', '7 − 5 = 2. So 2/10.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'improper-fractions', unit: 7, title: 'More than one whole', shortTitle: 'Past a whole', skill: 'A fraction can be more than 1 whole.',
    description: 'Keep counting pieces past 1 whole.', example: {
      prompt: 'What is 7/4 as wholes and a fraction?',
      answer: '1 and 3/4.',
      explanation: '4/4 is 1 whole. 3/4 is left over.',
      model: { kind: 'bars', bars: [{ numerator: 4, denominator: 4 }, { numerator: 3, denominator: 4 }], caption: '7/4 is 1 whole and 3/4' },
    },
    questions: [
      practice('What is 5/3 as wholes and a fraction?', ['1 and 2/3', '2 and 1/3', '5 and 3'], 0, line(5, 3, 2), '3/3 is 1 whole. How many are left?', '5/3 is 3/3 and 2/3. That is 1 and 2/3.', line(3, 3, 2)),
      practice('What is 2 and 1/5 as fifths?', ['11/5', '7/5', '2/5'], 0, line(11, 5, 3), '2 wholes is 10/5. Add 1 more.', '10/5 + 1/5 = 11/5.', line(5, 5, 2)),
      practice('What is 1 and 2/4 as fourths?', ['6/4', '3/4', '4/6'], 0, line(6, 4, 2), '1 whole is 4/4. Add 2 more.', '4 + 2 = 6. So 6/4.', line(4, 4, 2)),
      practice('Which is more than 1 whole?', ['9/8', '7/8', '1/8'], 0, line(9, 8, 2), '8/8 is exactly 1 whole.', '9/8 is 1 piece more than a whole.', line(8, 8, 2)),
    ],
  },
  {
    id: 'mixed-improper', unit: 7, title: 'Two ways to write it', shortTitle: 'Two ways to name it', skill: '7/4 and 1 and 3/4 are the same amount.',
    description: 'Swap pieces for wholes, and back again.', example: {
      prompt: 'What is 1 and 3/8 as eighths?',
      answer: '11/8.',
      explanation: '1 whole is 8/8. Add 3 more: 11/8.',
      model: { kind: 'bars', bars: [{ numerator: 8, denominator: 8 }, { numerator: 3, denominator: 8 }], caption: '1 whole and 3/8' },
    },
    questions: [
      practice('What is 1 and 2/3 as thirds?', ['5/3', '3/5', '4/3'], 0, line(5, 3, 2), '1 whole is 3/3. Add 2 more.', '3/3 + 2/3 = 5/3.', line(3, 3, 2)),
      practice('What is 9/4 as wholes and a fraction?', ['2 and 1/4', '1 and 5/4', '2 and 2/4'], 0, line(9, 4, 3), 'Every 4/4 is 1 whole. What is left?', '8/4 is 2 wholes. 1/4 is left.', line(8, 4, 2)),
      practice('What is 2 and 3/5 as fifths?', ['13/5', '10/5', '5/13'], 0, line(13, 5, 3), '2 wholes is 10/5. Add 3 more.', '10/5 + 3/5 = 13/5.', line(10, 5, 2)),
      practice('What is 10/6 as wholes and a fraction?', ['1 and 4/6', '1 and 2/6', '2 and 4/6'], 0, line(10, 6, 2), '6/6 is 1 whole. What is left?', '10/6 is 6/6 and 4/6. That is 1 and 4/6.', line(6, 6, 2)),
    ],
  },
  {
    id: 'add-like-denominators', unit: 8, title: 'Add same-size pieces', shortTitle: 'Add fractions', skill: 'Add the top numbers. The bottom number stays the same.',
    description: 'Add pieces that are the same size.', example: {
      prompt: 'What is 2/7 + 3/7?',
      answer: '5/7.',
      explanation: '2 sevenths + 3 sevenths = 5 sevenths.',
      model: bars({ numerator: 2, denominator: 7 }, { numerator: 3, denominator: 7 }, { numerator: 5, denominator: 7 }),
    },
    questions: [
      practice('What is 1/6 + 4/6?', ['5/6', '5/12', '1/6'], 0, equation('1/6 + 4/6 = ?'), 'Add the top numbers. Keep sixths.', '1 + 4 = 5. The bottom stays 6.', bars({ numerator: 1, denominator: 6 })),
      practice('What is 3/8 + 2/8?', ['5/8', '5/16', '6/8'], 0, equation('3/8 + 2/8 = ?'), 'Add the top numbers. Keep eighths.', '3 + 2 = 5. The bottom stays 8.', bars({ numerator: 2, denominator: 8 })),
      practice('Maya walked 2/10 mile, then 5/10 mile. How far in all?', ['7/10 mile', '7/20 mile', '3/10 mile'], 0, bars({ numerator: 2, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Add the top numbers. Keep tenths.', '2 + 5 = 7. So 7/10 mile.', bars({ numerator: 2, denominator: 10 })),
      practice('What is 4/9 + 3/9?', ['7/9', '7/18', '1/9'], 0, equation('4/9 + 3/9 = ?'), 'Add the top numbers. Keep ninths.', '4 + 3 = 7. So 7/9.', bars({ numerator: 3, denominator: 9 })),
    ],
  },
  {
    id: 'subtract-like-denominators', unit: 8, title: 'Take pieces away', shortTitle: 'Subtract fractions', skill: 'Take away the top numbers. The bottom stays the same.',
    description: 'Take away same-size pieces.', example: {
      prompt: 'What is 6/8 − 2/8?',
      answer: '4/8.',
      explanation: 'Start with 6 eighths. Take away 2. 4 eighths are left.',
      model: bars({ numerator: 6, denominator: 8 }, { numerator: 4, denominator: 8 }),
    },
    questions: [
      practice('What is 5/7 − 2/7?', ['3/7', '3/14', '7/7'], 0, equation('5/7 − 2/7 = ?'), 'Take away 2 pieces. Keep sevenths.', '5 − 2 = 3. The bottom stays 7.', bars({ numerator: 5, denominator: 7 })),
      practice('A jug is 9/10 full. You pour out 4/10. How much is left?', ['5/10', '5/20', '13/10'], 0, bars({ numerator: 9, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Take away the top numbers. Keep tenths.', '9 − 4 = 5. So 5/10.', bars({ numerator: 4, denominator: 10 })),
      practice('What is 7/8 − 3/8?', ['4/8', '4/16', '10/8'], 0, equation('7/8 − 3/8 = ?'), 'Take away the top numbers. Keep eighths.', '7 − 3 = 4. So 4/8.', bars({ numerator: 6, denominator: 8 })),
      practice('What is 6/9 − 1/9?', ['5/9', '5/18', '7/9'], 0, equation('6/9 − 1/9 = ?'), 'Take away 1 piece. Keep ninths.', '6 − 1 = 5. So 5/9.', bars({ numerator: 6, denominator: 9 })),
    ],
  },
  {
    id: 'add-related-fractions', unit: 8, title: 'Rename, then add', shortTitle: 'Add different names', skill: 'Make the pieces match, then add.',
    description: 'Change one fraction so the pieces match.', example: {
      prompt: 'What is 1/2 + 1/4?',
      answer: '3/4.',
      explanation: '1/2 is 2/4. 2/4 + 1/4 = 3/4.',
      model: bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }, { numerator: 1, denominator: 4 }),
    },
    questions: [
      practice('What is 1/2 + 1/6?', ['4/6', '2/8', '2/6'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 3, denominator: 6 }, { numerator: 1, denominator: 6 }), 'Change 1/2 into sixths first.', '1/2 is 3/6. 3/6 + 1/6 = 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('What is 1/3 + 1/6?', ['3/6', '2/9', '2/6'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 6 }, { numerator: 1, denominator: 6 }), 'Change 1/3 into sixths first.', '1/3 is 2/6. 2/6 + 1/6 = 3/6.', bars({ numerator: 1, denominator: 2 })),
      practice('One ribbon is 1/4 meter. Another is 1/2 meter. How long together?', ['3/4 meter', '2/6 meter', '2/4 meter'], 0, bars({ numerator: 1, denominator: 4 }, { numerator: 2, denominator: 4 }, { numerator: 1, denominator: 4 }), 'Change 1/2 into fourths first.', '1/2 is 2/4. 2/4 + 1/4 = 3/4.', bars({ numerator: 1, denominator: 2 })),
      practice('What is 2/3 + 1/6?', ['5/6', '3/9', '3/6'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }, { numerator: 1, denominator: 6 }), 'Change 2/3 into sixths first.', '2/3 is 4/6. 4/6 + 1/6 = 5/6.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'tenths-decimals', unit: 8, title: 'Tenths as decimals', shortTitle: 'Fractions and decimals', skill: 'Tenths can be written as decimals, like 0.7.',
    description: 'Match tenths to decimals.', example: {
      prompt: 'How do you write 7/10 as a decimal?',
      answer: '0.7',
      explanation: '7 tenths is 0.7. It is less than 1 whole.',
      model: decimal(7),
    },
    questions: [
      practice('Write 3/10 as a decimal.', ['0.3', '3.0', '0.03'], 0, decimal(3), 'Tenths go right after the dot.', '3 tenths is 0.3.', decimal(1)),
      practice('What fraction is 0.6?', ['6/10', '6/100', '1/6'], 0, decimal(6), 'The 6 is right after the dot. That means tenths.', '0.6 means 6 tenths, or 6/10.', decimal(5)),
      practice('A strip is 0.4 colored. What fraction is that?', ['4/10', '4/100', '10/4'], 0, decimal(4), 'The number right after the dot is tenths.', '0.4 means 4 tenths, or 4/10.', decimal(2)),
      practice('Which is bigger, 0.8 or 5/10?', ['0.8', '5/10', 'They are equal'], 0, bars({ numerator: 8, denominator: 10 }, { numerator: 5, denominator: 10 }), '0.8 is 8 tenths. Compare it to 5 tenths.', '8 tenths is more than 5 tenths.', decimal(5)),
    ],
  },
  {
    id: 'hundredths-decimals', unit: 8, title: 'Hundredths and place value', shortTitle: 'Hundredths', skill: 'Hundredths use 2 places after the dot, like 0.25.',
    description: 'Two numbers after the dot means hundredths.', example: {
      prompt: 'How do you write 25/100 as a decimal?',
      answer: '0.25',
      explanation: '25 hundredths is 0.25. Two places after the dot.',
      model: { kind: 'bars', bars: [{ numerator: 25, denominator: 100 }], caption: '25 hundredths of 1 whole' },
    },
    questions: [
      practice('Write 8/100 as a decimal.', ['0.08', '0.8', '8.00'], 0, { kind: 'bars', bars: [{ numerator: 8, denominator: 100 }] }, 'Hundredths need 2 places after the dot.', '8 hundredths is 0.08. The 0 holds the tenths place.', decimal(1)),
      practice('What fraction is 0.35?', ['35/100', '3/5', '35/10'], 0, { kind: 'bars', bars: [{ numerator: 35, denominator: 100 }] }, '2 places after the dot means hundredths.', '0.35 means 35 hundredths, or 35/100.', decimal(4)),
      practice('Which is bigger, 0.4 or 0.35?', ['0.4', '0.35', 'They are equal'], 0, bars({ numerator: 4, denominator: 10 }, { numerator: 35, denominator: 100 }), '0.4 is the same as 0.40. Compare 40 and 35.', '0.40 is 40 hundredths. 40 is more than 35.', decimal(4)),
      practice('Which decimal equals 9/10?', ['0.9', '0.09', '9.10'], 0, decimal(9), 'Tenths have 1 place after the dot.', '9 tenths is 0.9. 0.09 is 9 hundredths.', decimal(5)),
    ],
  },
];

type ExtensionMode =
  | 'simplify' | 'equivalent' | 'compare' | 'order' | 'subtract-unlike'
  | 'mixed-add' | 'mixed-subtract' | 'quantity' | 'multiply-whole' | 'multiply'
  | 'sets' | 'divide' | 'measure' | 'measure-add' | 'share' | 'quotient'
  | 'probability' | 'area' | 'line' | 'recipe' | 'percent' | 'percent-inverse'
  | 'decimal-equivalent' | 'story';
export const MISSIONS: Mission[] = curriculum.map((seed, index) => {
  const current = mission(seed);
  if (index === 0) return current;

  // Revisit a question from the previous lesson between new practice and mastery.
  const priorLesson = curriculum[index - 1];
  const priorQuestion = mission(priorLesson).questions[0];
  const reviewChoices = [...priorQuestion.choices.slice(1), priorQuestion.choices[0]];
  const shiftedCorrect = (priorQuestion.correctChoice - 1 + priorQuestion.choices.length) % priorQuestion.choices.length;
  const review: PracticeQuestion = {
    ...priorQuestion,
    id: `${current.id}-review`,
    prompt: `Quick review · ${priorLesson.shortTitle}: ${priorQuestion.prompt}`,
    choices: reviewChoices,
    correctChoice: shiftedCorrect,
    isMastery: false,
    isReview: true,
    reviewMissionId: priorLesson.id,
    reviewQuestionId: priorQuestion.id,
    reviewTopicTitle: priorLesson.shortTitle,
  };
  const mastery = current.questions[current.questions.length - 1];
  return { ...current, questions: [...current.questions.slice(0, -1), review, mastery] };
});

export const EMPTY_PROGRESS: Progress = { completedMissionIds: [], starsByMission: {}, reviewQueue: [] };
const STORAGE_KEY = 'fraction-quest-progress-v1';
export const SKILL_REVIEW_DELAY_MS = 24 * 60 * 60 * 1000;
const MAX_DELAYED_REVIEW_QUESTIONS = 2;
const LEGACY_MISSION_IDS: Record<string, string> = {
  share: 'equal-parts',
  'number-line': 'number-line-basics',
  equivalent: 'equivalent-models',
};

export function getMission(id: string): Mission {
  const found = MISSIONS.find((item) => item.id === id);
  if (!found) throw new Error(`Unknown mission: ${id}`);
  return found;
}

export function recordMissedSkill(
  progress: Progress,
  missionId: string,
  questionId: string,
  now = Date.now(),
): Progress {
  if (progress.reviewQueue.some((item) => item.missionId === missionId)) return progress;
  const sourceMission = getMission(missionId);
  if (!sourceMission.questions.some((question) => question.id === questionId)) {
    throw new Error(`Unknown question for skill review: ${questionId}`);
  }
  return {
    ...progress,
    reviewQueue: [
      ...progress.reviewQueue,
      { missionId, missedQuestionId: questionId, dueAt: now + SKILL_REVIEW_DELAY_MS, reviewCount: 0 },
    ],
  };
}

export function completeSkillReview(progress: Progress, missionId: string): Progress {
  const evidence = progress.learning?.[missionId];
  if (evidence && (!evidence.completedAt || !evidence.confirmedAt || evidence.confirmedAt < evidence.completedAt + SKILL_REVIEW_DELAY_MS)) return progress;
  const reviewQueue = progress.reviewQueue.filter((item) => item.missionId !== missionId);
  return reviewQueue.length === progress.reviewQueue.length ? progress : { ...progress, reviewQueue };
}

export function deferSkillReview(progress: Progress, missionId: string, now = Date.now()): Progress {
  const reviewQueue = progress.reviewQueue.map((item) => item.missionId === missionId
    ? { ...item, dueAt: now + SKILL_REVIEW_DELAY_MS, reviewCount: item.reviewCount + 1 }
    : item);
  return { ...progress, reviewQueue };
}

function toReviewQuestion(item: SkillReview): PracticeQuestion[] {
  const topic = getMission(item.missionId);
  const alternatives = topic.questions.filter((question) =>
    !question.isMastery && !question.isReview && question.id !== item.missedQuestionId,
  );
  if (alternatives.length === 0) return [];

  const variant = alternatives[item.reviewCount % alternatives.length];
  const choiceOffset = variant.choices.length > 1 ? (item.reviewCount + 1) % variant.choices.length : 0;
  const choices = variant.choices.map((_, index) => variant.choices[(index + choiceOffset) % variant.choices.length]);
  const correctChoice = (variant.correctChoice - choiceOffset + variant.choices.length) % variant.choices.length;
  return [{
    ...variant,
    id: `delayed-${item.missionId}-${item.reviewCount}-${variant.id}`,
    choices,
    correctChoice,
    isMastery: false,
    isReview: true,
    isOptionalReview: true,
    reviewMissionId: item.missionId,
    reviewQuestionId: item.missedQuestionId,
    reviewTopicTitle: topic.shortTitle,
  }];
}

function getDueSkillReviews(progress: Progress, now: number): SkillReview[] {
  return progress.reviewQueue
    .filter((item) => item.dueAt <= now)
    .sort((first, second) => first.dueAt - second.dueAt);
}

export function getDueSkillReviewCount(progress: Progress, now = Date.now()): number {
  return getDueSkillReviews(progress, now).length;
}

export function getDueSkillReviewQuestions(progress: Progress, now = Date.now()): PracticeQuestion[] {
  return getDueSkillReviews(progress, now)
    .slice(0, MAX_DELAYED_REVIEW_QUESTIONS)
    .flatMap(toReviewQuestion);
}

export function getDelayedReviewQuestions(
  progress: Progress,
  currentMissionId: string,
  now = Date.now(),
): PracticeQuestion[] {
  return getDueSkillReviews(progress, now)
    .filter((item) => item.missionId !== currentMissionId)
    .slice(0, MAX_DELAYED_REVIEW_QUESTIONS)
    .flatMap(toReviewQuestion);
}

export function getNextMission(progress: Progress): Mission | null {
  const unfinished = MISSIONS.filter((item) =>
    !hasLearningGate(progress, item.id) && isMissionUnlocked(progress, item.id),
  );
  if (!unfinished.length) return null;
  const activeUnit = unfinished[0].unit;
  const candidates = unfinished.filter((item) => item.unit === activeUnit);
  const ranked = candidates.map((item, index) => {
    const record = progress.learning?.[item.id];
    const worksheetAnswers = Object.values(record?.worksheet ?? {}).filter((entry) => entry.checkedValue !== undefined).length;
    const checkEvidence = Object.values(record?.checks ?? {});
    const passedChecks = checkEvidence.filter((check) => check.passed).length;
    const misses = Object.values(record?.misconceptions ?? {}).reduce((sum, count) => sum + count, 0);
    const supportedWork = Object.values(record?.worksheet ?? {}).filter((entry) => entry.supported).length
      + checkEvidence.filter((check) => check.supported).length;
    const started = !!record && (!!record.practiceDone || worksheetAnswers > 0 || checkEvidence.length > 0);
    const evidenceScore = (worksheetAnswers + passedChecks * 6) / 24;
    return { item, index, started, misses, supportedWork, evidenceScore };
  });
  const activeWork = ranked.filter((entry) => entry.started);
  if (!activeWork.length) return candidates[0];
  activeWork.sort((a, b) =>
    b.misses + b.supportedWork - (a.misses + a.supportedWork)
    || a.evidenceScore - b.evidenceScore
    || a.index - b.index,
  );
  return activeWork[0].item;
}

export function isCorrectAnswer(question: PracticeQuestion, answer: Answer): boolean {
  return Number.isInteger(answer) && answer === question.correctChoice;
}

export function isMissionUnlocked(progress: Progress, missionId: string): boolean {
  const targetIndex = MISSIONS.findIndex((item) => item.id === missionId);
  if (targetIndex < 0) return false;
  const target = MISSIONS[targetIndex];
  if (target.unit < 9) return MISSIONS.slice(0, targetIndex).every(item => hasLearningGate(progress, item.id));
  return MISSIONS.filter(item => item.unit < target.unit).every(item => hasLearningGate(progress, item.id));
}

export function completeMission(progress: Progress, missionId: string, stars: number): Progress {
  if (!isMissionUnlocked(progress, missionId) || !hasLearningGate(progress, missionId)) return progress;
  const safeStars = Math.max(1, Math.min(3, Math.floor(stars)));
  const record = progress.learning![missionId];
  const completedAt = record.completedAt ?? Date.now();
  return {
    ...progress,
    completedMissionIds: progress.completedMissionIds.includes(missionId)
      ? progress.completedMissionIds
      : [...progress.completedMissionIds, missionId],
    starsByMission: {
      ...progress.starsByMission,
      [missionId]: Math.max(progress.starsByMission[missionId] ?? 0, safeStars),
    },
    learning: { ...progress.learning, [missionId]: { ...record, completedAt } },
    reviewQueue: progress.reviewQueue.some(item => item.missionId === missionId) ? progress.reviewQueue : [
      ...progress.reviewQueue, { missionId, missedQuestionId: getMission(missionId).questions[0].id, dueAt: completedAt + SKILL_REVIEW_DELAY_MS, reviewCount: 0 },
    ],
  };
}

export function loadProgress(): Progress {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return EMPTY_PROGRESS;
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return EMPTY_PROGRESS;
    const value = parsed as Partial<Progress>;
    const validIds = new Set(MISSIONS.map((item) => item.id));
    const completed = new Set<string>();
    if (Array.isArray(value.completedMissionIds)) {
      for (const id of value.completedMissionIds) {
        if (typeof id !== 'string') continue;
        if (validIds.has(id)) completed.add(id);
        else if (LEGACY_MISSION_IDS[id]) completed.add(LEGACY_MISSION_IDS[id]);
      }
    }
    const starsByMission: Record<string, number> = {};
    if (value.starsByMission && typeof value.starsByMission === 'object') {
      for (const [rawId, rawStars] of Object.entries(value.starsByMission)) {
        const id = validIds.has(rawId) ? rawId : LEGACY_MISSION_IDS[rawId];
        if (!id || typeof rawStars !== 'number' || !Number.isFinite(rawStars)) continue;
        starsByMission[id] = Math.max(0, Math.min(3, Math.floor(rawStars)));
      }
    }
    const reviewQueue: SkillReview[] = [];
    const queuedMissionIds = new Set<string>();
    if (Array.isArray(value.reviewQueue)) {
      for (const rawReview of value.reviewQueue) {
        if (!rawReview || typeof rawReview !== 'object') continue;
        const item = rawReview as Partial<SkillReview>;
        if (
          typeof item.missionId !== 'string'
          || !validIds.has(item.missionId)
          || queuedMissionIds.has(item.missionId)
          || typeof item.missedQuestionId !== 'string'
          || !getMission(item.missionId).questions.some((question) => question.id === item.missedQuestionId)
          || typeof item.dueAt !== 'number'
          || !Number.isFinite(item.dueAt)
        ) continue;
        queuedMissionIds.add(item.missionId);
        reviewQueue.push({
          missionId: item.missionId,
          missedQuestionId: item.missedQuestionId,
          dueAt: item.dueAt,
          reviewCount: typeof item.reviewCount === 'number' && Number.isFinite(item.reviewCount)
            ? Math.max(0, Math.floor(item.reviewCount))
            : 0,
        });
      }
    }
    const learning: Record<string, LearningRecord> = {};
    if (value.learning && typeof value.learning === 'object') {
      for (const id of validIds) {
        const raw = value.learning[id];
        if (!raw || typeof raw !== 'object') continue;
        const checks: LearningRecord['checks'] = {};
        for (const spec of getBuildChecks(id)) {
          const c = raw.checks?.[spec.id];
          if (c && typeof c.passed === 'boolean') checks[spec.id] = {
            passed: c.passed, supported: c.supported !== false, attempts: safeCount(c.attempts),
          };
        }
        const worksheet: LearningRecord['worksheet'] = {};
        for (const problem of getWorksheet(id)) {
          const entry = raw.worksheet?.[problem.id];
          if (entry && typeof entry.draft === 'string') worksheet[problem.id] = {
            draft: entry.draft.slice(0, 200), checkedValue: typeof entry.checkedValue === 'string' ? entry.checkedValue.slice(0, 200) : undefined,
            attempts: safeCount(entry.attempts), supported: entry.supported !== false,
          };
        }
        const misconceptions: Record<string, number> = {};
        if (raw.misconceptions && typeof raw.misconceptions === 'object') for (const [key, count] of Object.entries(raw.misconceptions)) {
          if (key.length <= 300 && safeCount(count) > 0) misconceptions[key] = safeCount(count);
        }
        learning[id] = {
          practiceDone: raw.practiceDone === true, checks, worksheet, misconceptions,
          helpUses: safeCount(raw.helpUses),
          completedAt: typeof raw.completedAt === 'number' && Number.isFinite(raw.completedAt) ? raw.completedAt : undefined,
          confirmedAt: typeof raw.confirmedAt === 'number' && Number.isFinite(raw.confirmedAt) ? raw.confirmedAt : undefined,
          reviewSupportedUntil: typeof raw.reviewSupportedUntil === 'number' && Number.isFinite(raw.reviewSupportedUntil) ? raw.reviewSupportedUntil : undefined,
          practiceStars: typeof raw.practiceStars === 'number' && raw.practiceStars >= 1 && raw.practiceStars <= 3 ? Math.floor(raw.practiceStars) : undefined,
        };
      }
    }
    const challengeBest: Record<string, number> = {};
    if (value.challengeBest && typeof value.challengeBest === 'object') {
      for (const [unit, score] of Object.entries(value.challengeBest)) {
        if (/^[1-8]$/.test(unit) && typeof score === 'number' && Number.isFinite(score)) challengeBest[unit] = Math.max(0, Math.min(100, Math.floor(score)));
      }
    }
    return {
      completedMissionIds: [...completed], starsByMission, reviewQueue,
      ...(Object.keys(learning).length ? { learning } : {}),
      ...(Object.keys(challengeBest).length ? { challengeBest } : {}),
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(10000, Math.floor(value))) : 0;
}

export function saveProgress(progress: Progress): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function resetProgress(): Progress {
  saveProgress(EMPTY_PROGRESS);
  return EMPTY_PROGRESS;
}

type ExtensionTopic = {
  id: string; unit: number; title: string; shortTitle: string; description: string; skill: string;
  mode: ExtensionMode; n: number; d: number; context: string;
};

const extensionTopics: ExtensionTopic[] = [
  { id: 'simplify-fractions', unit: 9, title: 'Find a fraction’s simplest name', shortTitle: 'Simplest form', description: 'Group equal-sized pieces without changing the amount.', skill: 'Divide the numerator and denominator by the same common factor to simplify a fraction.', mode: 'simplify', n: 3, d: 4, context: 'paper strip' },
  { id: 'equivalent-missing-both', unit: 9, title: 'Complete an equivalent fraction', shortTitle: 'Equivalent fractions', description: 'Find a missing numerator or denominator by keeping the amount fixed.', skill: 'Equivalent fractions preserve the same ratio between numerator and denominator.', mode: 'equivalent', n: 2, d: 5, context: 'recipe card' },
  { id: 'compare-unlike-fractions', unit: 9, title: 'Compare fractions with different pieces', shortTitle: 'Compare unlike parts', description: 'Rename fractions or use a shared whole to compare their sizes.', skill: 'Compare unlike denominators by reasoning about equal-sized parts of the same whole.', mode: 'compare', n: 2, d: 3, context: 'race track' },
  { id: 'order-unlike-fractions', unit: 9, title: 'Put unlike fractions in order', shortTitle: 'Order unlike parts', description: 'Order amounts with different denominators from least to greatest.', skill: 'Use benchmarks and equivalent fractions to order unlike fractions.', mode: 'order', n: 1, d: 5, context: 'hiking trail' },
  { id: 'subtract-unlike-fractions', unit: 10, title: 'Subtract fractions with different names', shortTitle: 'Subtract unlike parts', description: 'Rename fractions so their piece sizes match before subtracting.', skill: 'Subtract unlike fractions by making equivalent fractions with a common denominator.', mode: 'subtract-unlike', n: 3, d: 4, context: 'water bottle' },
  { id: 'add-mixed-numbers', unit: 10, title: 'Add mixed numbers', shortTitle: 'Add mixed numbers', description: 'Combine whole units and fractional parts without losing track of the whole.', skill: 'Add mixed numbers by combining whole units and compatible fractional parts.', mode: 'mixed-add', n: 1, d: 4, context: 'walking route' },
  { id: 'subtract-mixed-numbers', unit: 10, title: 'Subtract mixed numbers', shortTitle: 'Subtract mixed numbers', description: 'Find the difference between measurements written with whole and fractional parts.', skill: 'Subtract mixed numbers by regrouping one whole when the fractional part is too small.', mode: 'mixed-subtract', n: 1, d: 3, context: 'fabric roll' },
  { id: 'fraction-of-quantity', unit: 10, title: 'Find a fraction of a quantity', shortTitle: 'Fractions of amounts', description: 'Share a count into equal groups, then count the requested groups.', skill: 'Find a fraction of a whole-number quantity by dividing and then multiplying.', mode: 'quantity', n: 3, d: 5, context: 'classroom supplies' },
  { id: 'multiply-whole-by-fraction', unit: 11, title: 'Multiply a whole number by a fraction', shortTitle: 'Whole × fraction', description: 'Use repeated equal fractional groups to find a total amount.', skill: 'Interpret a whole-number times a fraction as repeated fractional groups.', mode: 'multiply-whole', n: 2, d: 3, context: 'juice bottles' },
  { id: 'multiply-fractions', unit: 11, title: 'Multiply two fractions', shortTitle: 'Fraction × fraction', description: 'Find a part of a part by multiplying numerators and denominators.', skill: 'Multiply fractions by finding the fractional part of another fractional amount.', mode: 'multiply', n: 2, d: 3, context: 'garden plot' },
  { id: 'fraction-of-collection', unit: 11, title: 'Find a fraction of a collection', shortTitle: 'Groups of objects', description: 'Make equal groups in a collection and select the fraction requested.', skill: 'Represent fractions of collections as equal groups of objects.', mode: 'sets', n: 3, d: 4, context: 'sports cards' },
  { id: 'divide-whole-by-unit-fraction', unit: 11, title: 'How many unit fractions fit?', shortTitle: 'Divide by a fraction', description: 'Count how many fractional-size measures fit inside a whole amount.', skill: 'Interpret division by a unit fraction as the number of equal-size parts in a whole.', mode: 'divide', n: 1, d: 4, context: 'measuring cup' },
  { id: 'fraction-of-length', unit: 12, title: 'Measure a fraction of a length', shortTitle: 'Fractional lengths', description: 'Use a unit fraction as a ruler step to measure a distance.', skill: 'Use repeated unit-fraction lengths to describe and find distances.', mode: 'measure', n: 3, d: 8, context: 'ribbon' },
  { id: 'fractional-measure-addition', unit: 12, title: 'Add fractional measurements', shortTitle: 'Measure together', description: 'Combine fractional lengths that use different units of measurement.', skill: 'Add fractional measurements by converting to a shared unit and denominator.', mode: 'measure-add', n: 1, d: 2, context: 'wooden boards' },
  { id: 'fractional-sharing', unit: 12, title: 'Share a quantity fractionally', shortTitle: 'Fair sharing', description: 'Split a measured amount equally, including when each share is fractional.', skill: 'Model fair sharing with fractions and explain the size of each share.', mode: 'share', n: 3, d: 4, context: 'loaf of bread' },
  { id: 'fraction-as-division', unit: 12, title: 'Write division as a fraction', shortTitle: 'Fraction quotient', description: 'Connect a numerator divided by a denominator to a fraction amount.', skill: 'Represent a division quotient as a fraction and interpret its value.', mode: 'quotient', n: 5, d: 4, context: 'pizzas' },
  { id: 'fraction-probability', unit: 13, title: 'Describe chance with a fraction', shortTitle: 'Fraction probability', description: 'Compare favorable outcomes with all equally likely outcomes.', skill: 'Express the probability of an event as favorable outcomes over possible outcomes.', mode: 'probability', n: 2, d: 8, context: 'color spinner' },
  { id: 'fraction-of-area', unit: 13, title: 'Find a fraction of an area', shortTitle: 'Fractional area', description: 'Partition a shape into equal areas and count selected regions.', skill: 'Use equal-area partitions to model fractions of a shape.', mode: 'area', n: 3, d: 8, context: 'mosaic' },
  { id: 'equivalent-number-line', unit: 13, title: 'Show equivalent fractions on a number line', shortTitle: 'Line equivalence', description: 'Mark the same location using different equal interval sizes.', skill: 'Use a shared number-line location to explain fraction equivalence.', mode: 'line', n: 2, d: 3, context: 'number line' },
  { id: 'fraction-recipes', unit: 13, title: 'Scale a recipe with fractions', shortTitle: 'Recipe fractions', description: 'Scale ingredient amounts while keeping every ingredient in proportion.', skill: 'Scale fractional ingredient amounts using multiplication and equivalent fractions.', mode: 'recipe', n: 3, d: 4, context: 'pancake recipe' },
  { id: 'fractions-to-percent', unit: 14, title: 'Connect fractions to percent', shortTitle: 'Fractions to percent', description: 'Rename fractions as hundredths and describe them out of one hundred.', skill: 'Convert fractions with denominator 100 to percentages.', mode: 'percent', n: 3, d: 4, context: 'school survey' },
  { id: 'percent-to-fraction', unit: 14, title: 'Write percent as a fraction', shortTitle: 'Percent as a fraction', description: 'Interpret percent as a number of parts out of one hundred.', skill: 'Represent a percent as a fraction over 100 and simplify when useful.', mode: 'percent-inverse', n: 3, d: 5, context: 'game score' },
  { id: 'decimal-fraction-equivalence', unit: 14, title: 'Connect fractions, decimals, and percent', shortTitle: 'Three forms', description: 'Translate a familiar amount between fraction, decimal, and percent forms.', skill: 'Use place value to connect tenths and hundredths to decimals and percentages.', mode: 'decimal-equivalent', n: 7, d: 10, context: 'battery meter' },
  { id: 'multi-step-fraction-stories', unit: 14, title: 'Solve a fraction story in steps', shortTitle: 'Fraction stories', description: 'Choose useful fraction operations to solve a multi-step situation.', skill: 'Use models and operations to solve a multi-step fraction problem.', mode: 'story', n: 2, d: 5, context: 'community garden' },
];

function extensionMission(topic: ExtensionTopic): MissionSeed {
  const { n, d, context, mode } = topic;
  const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
  const modelFor = (top: number, bottom: number): ModelSpec => mode === 'sets'
    ? setModel(top * 4, bottom * 4, `Equal groups in a ${context}`)
    : mode === 'line' || mode === 'measure' ? line(top, bottom) : bars({ numerator: top, denominator: bottom });
  const values = [1, 2, 3, 4].map((offset) => ({ n: Math.min(d - 1, Math.max(1, (n + offset - 1) % (d - 1) + 1)), d }));
  const questions: PracticeSeed[] = values.map(({ n: top, d: bottom }, index) => {
    const denominator2 = bottom === 2 ? 4 : bottom + 2;
    let prompt = `A ${context} is divided into ${bottom} equal parts. What fraction names ${top} parts?`;
    let answer = `${top}/${bottom}`;
    let choices = [answer, `${Math.min(bottom, top + 1)}/${bottom}`, `${top}/${denominator2}`];
    if (mode === 'simplify') {
      const factor = 2 + index % 2;
      const common = gcd(top, bottom);
      prompt = `A ${context} shows ${top * factor}/${bottom * factor}. Enter the same amount in simplest form.`;
      answer = `${top / common}/${bottom / common}`; choices = [answer, `${top * factor}/${bottom}`, `${top}/${bottom * factor}`];
    } else if (mode === 'equivalent') {
      const factor = 2 + index % 2;
      prompt = `A ${context} shows ${top}/${bottom}. Rename it with denominator ${bottom * factor}.`;
      answer = `${top * factor}/${bottom * factor}`; choices = [answer, `${top}/${bottom * factor}`, `${top * factor}/${bottom}`];
    } else if (mode === 'compare') {
      prompt = `Type <, = or >: ${top}/${bottom} __ ${top}/${denominator2}. The ${context} wholes match.`;
      answer = '>'; choices = ['<', '=', '>'];
    } else if (mode === 'order') {
      prompt = `Order ${(bottom - 1)}/${bottom}, 1/2, and 1/${bottom + 1} from least to greatest on the ${context}.`;
      const fractions = [{ n: 1, d: bottom + 1 }, { n: 1, d: 2 }, { n: bottom - 1, d: bottom }];
      const order = fractions.slice().sort((a, b) => a.n * b.d - b.n * a.d).map(value => `${value.n}/${value.d}`);
      answer = order.join(', '); choices = [answer, order.slice().reverse().join(', '), `${order[1]}, ${order[0]}, ${order[2]}`];
    } else if (mode === 'quantity' || mode === 'sets') {
      const total = bottom * (4 + index);
      prompt = `${total} ${context} are shared into ${bottom} equal groups. How many are ${top}/${bottom} of the whole collection?`;
      answer = String(total / bottom * top); choices = [answer, String(total / bottom), String(total - total / bottom * top)];
    } else if (mode === 'share') {
      prompt = `Share ${top} ${top === 1 ? 'loaf' : 'loaves'} equally among ${bottom} friends. How much of a loaf does each friend receive?`;
      answer = `${top}/${bottom}`; choices = [answer, `${bottom}/${top}`, `${top}/${bottom + 1}`];
    } else if (mode === 'percent' || mode === 'percent-inverse') {
      const percent = Math.round(top * (100 / bottom));
      prompt = mode === 'percent' ? `A ${context} result is ${top}/${bottom}. What percent is that?` : `${percent}% of the ${context} is complete. Enter it as a fraction out of 100.`;
      answer = mode === 'percent' ? `${percent}%` : `${percent}/100`; choices = [answer, `${percent - 10}%`, `${percent + 5}/100`];
    } else if (mode === 'multiply' || mode === 'multiply-whole') {
      prompt = mode === 'multiply' ? `A ${context} is ${top}/${bottom} shaded. What is 1/2 of the shaded amount?` : `Two bottles each hold ${top}/${bottom} of a liter of juice. How much juice is there altogether?`;
      answer = mode === 'multiply' ? `${top}/${bottom * 2}` : `${top * 2}/${bottom}`;
      choices = [answer, `${top * 2}/${bottom}`, `${top}/${bottom}`];
    } else if (mode === 'divide') {
      prompt = `How many 1/${bottom}-cup measures fill ${index + 1} ${context}?`;
      answer = String((index + 1) * bottom); choices = [answer, String((index + 1) * top), String((index + 1) * bottom + 1)];
    } else if (mode === 'subtract-unlike') {
      const start = bottom - 1;
      prompt = `A ${context} is ${start}/${bottom} full. You use 1/2. What fraction remains?`;
      answer = `${2 * start - bottom}/${2 * bottom}`;
      choices = [answer, `${start - 1}/${bottom}`, `${2 * start + bottom}/${2 * bottom}`];
    } else if (mode === 'mixed-add') {
      const whole = 1 + index % 2;
      prompt = `Add ${whole} ${top}/${bottom} and 1 ${top}/${bottom} in the ${context}.`;
      const addedParts = 2 * top;
      const mixedWhole = whole + 1 + Math.floor(addedParts / bottom);
      const mixedRemainder = addedParts % bottom;
      answer = mixedRemainder ? `${mixedWhole} ${mixedRemainder}/${bottom}` : String(mixedWhole);
      choices = [answer, `${whole + 1} ${top}/${bottom * 2}`, `${whole} ${addedParts}/${bottom}`];
    } else if (mode === 'mixed-subtract') {
      prompt = `Calculate 3 1/${bottom} − 1 ${bottom - 1}/${bottom} for the ${context}.`;
      answer = `1 2/${bottom}`;
      choices = [answer, `1 1/${bottom}`, `2 2/${bottom}`];
    } else if (mode === 'measure-add') {
      prompt = `Join ${top}/${bottom} meter and 1/${bottom} meter of ${context}. How long is the combined length?`;
      answer = `${top + 1}/${bottom}`;
      choices = [answer, `${top + 1}/${bottom * 2}`, `${top}/${bottom}`];
    } else if (mode === 'probability') {
      prompt = `A ${context} has ${bottom} equal sections and ${top} are blue. What is the chance of blue?`;
      answer = `${top}/${bottom}`;
      choices = [answer, `${bottom}/${top}`, `${top}/${bottom + 1}`];
    } else if (mode === 'area') {
      prompt = `A ${context} is split into ${bottom} equal-area tiles. ${top} tiles are shaded. What fraction is shaded?`;
      answer = `${top}/${bottom}`;
      choices = [answer, `${top}/${bottom + 1}`, `${bottom - top}/${bottom}`];
    } else if (mode === 'line') {
      prompt = `The ${context} marks ${top}/${bottom}. Which fraction lands at the same point with twice as many intervals?`;
      answer = `${top * 2}/${bottom * 2}`;
      choices = [answer, `${top}/${bottom * 2}`, `${top * 2}/${bottom}`];
    } else if (mode === 'recipe') {
      prompt = `Double ${top}/${bottom} cup of flour in a ${context}. How much flour is needed?`;
      answer = `${top * 2}/${bottom}`;
      choices = [answer, `${top}/${bottom * 2}`, `${top + 1}/${bottom}`];
    } else if (mode === 'quotient') {
      prompt = `${top} ${context} are shared equally among ${bottom} people. What fraction of a pizza does each person get?`;
      answer = `${top}/${bottom}`; choices = [answer, `${bottom}/${top}`, `${top}/${bottom + 1}`];
    } else if (mode === 'decimal-equivalent') {
      const decimalValue = (top / bottom).toFixed(1);
      prompt = `The ${context} reads ${decimalValue}. Enter its fraction in tenths.`;
      answer = `${Math.round(top / bottom * 10)}/10`; choices = [answer, `${Math.round(top / bottom * 100)}/100`, `${Math.round(top / bottom * 10 - 1)}/10`];
    } else if (mode === 'story') {
      prompt = `A ${context} has ${top}/${bottom} of its beds planted. Then 1/${bottom} more is planted. What fraction is still empty?`;
      answer = `${bottom - top - 1}/${bottom}`; choices = [answer, `${top + 1}/${bottom}`, `${bottom - top}/${bottom}`];
    } else if (mode === 'measure') {
      const length = bottom * 2;
      prompt = `A ${context} is ${length} meters long. What is ${top}/${bottom} of its length?`;
      answer = String(top * 2); choices = [answer, String(top), String(length - top * 2)];
    } else {
      prompt = `A ${context} shows ${top}/${bottom}. What amount does that represent?`;
      answer = `${top}/${bottom}`; choices = [answer, `${bottom}/${top}`, `${top + 1}/${bottom}`];
    }
    if (new Set(choices).size < 3) {
      const alternatives = mode === 'quantity' || mode === 'sets'
        ? [String((bottom * (4 + index)) / bottom), String(Number(answer) + 1), String(Math.max(0, Number(answer) - 1)), String(bottom * (4 + index) - Number(answer))]
        : [`${top + 1}/${bottom}`, `${top}/${bottom + 1}`, `${top + 2}/${bottom + 3}`, `${top + 1}/${bottom + 2}`, `${top}/${bottom + 2}`, '0', '1/2', '1'];
      choices = [answer, ...Array.from(new Set(alternatives)).filter(value => value !== answer)].slice(0, 3);
    }
    return practice(prompt, choices, choices.indexOf(answer), modelFor(top, bottom),
      `Use the ${topic.skill.toLowerCase()} idea and keep the whole fixed.`, `Check how ${topic.skill.toLowerCase()} applies to this new ${context} situation.`,
      modelFor(1, Math.max(2, bottom - 1)));
  });
  return {
    id: topic.id, unit: topic.unit, title: topic.title, shortTitle: topic.shortTitle, description: topic.description, skill: topic.skill,
    example: { prompt: `How can a ${context} show ${n}/${d}?`, answer: `${n}/${d} of the same whole.`, explanation: topic.skill, model: modelFor(n, d) },
    questions,
  };
}

const extensionSeeds = extensionTopics.map(extensionMission);
curriculum.push(...extensionSeeds);

for (const seed of extensionSeeds) {
  const current = mission(seed);
  const priorLesson = MISSIONS[MISSIONS.length - 1];
  const priorQuestion = priorLesson.questions.find((question) => !question.isMastery && !question.isReview)!;
  const reviewChoices = [...priorQuestion.choices.slice(1), priorQuestion.choices[0]];
  const shiftedCorrect = (priorQuestion.correctChoice - 1 + priorQuestion.choices.length) % priorQuestion.choices.length;
  const review: PracticeQuestion = {
    ...priorQuestion,
    id: `${current.id}-review`,
    prompt: `Quick review · ${priorLesson.shortTitle}: ${priorQuestion.prompt}`,
    choices: reviewChoices,
    correctChoice: shiftedCorrect,
    isMastery: false,
    isReview: true,
    reviewMissionId: priorLesson.id,
    reviewQuestionId: priorQuestion.id,
    reviewTopicTitle: priorLesson.shortTitle,
  };
  const mastery = current.questions[current.questions.length - 1];
  MISSIONS.push({ ...current, questions: [...current.questions.slice(0, -1), review, mastery] });
}
