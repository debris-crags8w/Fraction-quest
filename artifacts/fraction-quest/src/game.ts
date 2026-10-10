export type FractionValue = { numerator: number; denominator: number };

export type ModelSpec =
  | { kind: 'bars'; bars: FractionValue[]; caption?: string }
  | { kind: 'set'; selected: number; total: number; caption?: string }
  | { kind: 'line'; numerator: number; denominator: number; wholes?: number; caption?: string }
  | { kind: 'partition'; parts: number[]; caption?: string }
  | { kind: 'equation'; text: string; caption?: string }
  | { kind: 'decimal'; tenths: number; caption?: string };

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

const bars = (...fractions: FractionValue[]): ModelSpec => ({ kind: 'bars', bars: fractions });
const setModel = (selected: number, total: number, caption?: string): ModelSpec => ({ kind: 'set', selected, total, caption });
const line = (numerator: number, denominator: number, wholes = 1): ModelSpec => ({ kind: 'line', numerator, denominator, wholes });
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
    id: 'equal-parts', unit: 1, title: 'Same whole, fair pieces', shortTitle: 'Equal parts', skill: 'Fractions describe equal-sized parts of one whole.',
    description: 'Spot when a whole is split into fair, equal pieces.', example: {
      prompt: 'A paper strip is cut into 4 pieces. What makes those pieces fourths?',
      answer: 'All 4 pieces are the same size.',
      explanation: 'A fraction names equal parts. Four unequal pieces are not fourths, even if there are four of them.',
      model: { kind: 'partition', parts: [25, 25, 25, 25], caption: 'One whole divided into equal shares' },
    },
    questions: [
      practice('Which strip is split into thirds?', ['3 equal pieces', '3 pieces, one much larger', '2 equal pieces'], 0, { kind: 'partition', parts: [33, 34, 33] }, 'Thirds must be 3 equal shares of the same whole.', 'Count the pieces and compare their sizes. A different number of pieces, or unequal pieces, does not make thirds.', { kind: 'partition', parts: [50, 50] }),
      practice('A sandwich is cut into 4 equal pieces. What fraction is one piece?', ['1/3', '1/4', '4/1'], 1, bars({ numerator: 1, denominator: 4 }), 'The whole has 4 equal pieces. One piece is one of those four.', 'The bottom number counts all equal pieces; one piece is 1 out of 4.', bars({ numerator: 1, denominator: 2 })),
      practice('Two same-size ribbons are each split into halves. Which ribbon shows a fair split?', ['Both pieces match in size', 'One half is twice as long', 'The ribbon with 3 pieces'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 2 }), 'Halves are equal shares of one whole.', 'A half is not just one of two pieces; the two pieces must be equal.', bars({ numerator: 1, denominator: 2 })),
      practice('A circle has 5 equal slices. What is one slice called?', ['one fifth', 'one fourth', 'five wholes'], 0, bars({ numerator: 1, denominator: 5 }), 'The whole is split into 5 equal slices, and you have 1 slice.', 'One of 5 equal pieces is one fifth, written 1/5.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'fraction-names', unit: 1, title: 'Read a fraction', shortTitle: 'Fraction names', skill: 'The denominator names equal parts; the numerator counts selected parts.',
    description: 'Read the top and bottom numbers as a team.', example: {
      prompt: 'In 3/5, what does each number tell you?',
      answer: '5 equal parts altogether; 3 parts are counted.',
      explanation: 'The denominator (5) names the size of the pieces. The numerator (3) counts how many of those pieces.',
      model: bars({ numerator: 3, denominator: 5 }),
    },
    questions: [
      practice('In 2/7, what does 7 tell you?', ['7 equal parts in the whole', '7 parts are shaded', '7 wholes'], 0, bars({ numerator: 2, denominator: 7 }), 'Look at the bottom number.', 'The denominator is the total number of equal parts, not the number selected.', bars({ numerator: 1, denominator: 3 })),
      practice('A tray has 6 equal spaces. Four have a snack. Which fraction names the filled spaces?', ['6/4', '4/6', '4/4'], 1, bars({ numerator: 4, denominator: 6 }), 'Count selected spaces for the top and all equal spaces for the bottom.', 'The top counts the 4 filled spaces; the bottom counts all 6.', bars({ numerator: 1, denominator: 2 })),
      practice('In 5/8, how many eighth-size pieces are counted?', ['8', '5', '13'], 1, bars({ numerator: 5, denominator: 8 }), 'The top number tells how many pieces we are counting.', 'The numerator is 5, so five of the eight equal pieces are counted.', bars({ numerator: 2, denominator: 4 })),
      practice('A shape has 9 equal parts and 1 is colored. What fraction is colored?', ['1/9', '9/1', '1/8'], 0, bars({ numerator: 1, denominator: 9 }), 'One colored part out of nine equal parts.', 'Keep the whole count (9) on the bottom and the one colored part on top.', bars({ numerator: 1, denominator: 4 })),
    ],
  },
  {
    id: 'unit-fractions', unit: 1, title: 'One piece at a time', shortTitle: 'Unit fractions', skill: 'A unit fraction has 1 as its numerator.',
    description: 'Recognize one equal share, whatever its size.', example: {
      prompt: 'One of 6 equal pieces is a unit fraction. What is it?',
      answer: '1/6',
      explanation: 'A unit fraction counts exactly one equal piece. Its denominator still tells how many equal pieces form the whole.',
      model: bars({ numerator: 1, denominator: 6 }),
    },
    questions: [
      practice('Which is a unit fraction?', ['3/8', '1/8', '8/1'], 1, bars({ numerator: 1, denominator: 8 }), 'A unit fraction has exactly 1 on top.', 'The numerator must be 1. The denominator can be any whole number greater than 1.', bars({ numerator: 1, denominator: 4 })),
      practice('A whole is split into 10 equal pieces. Name one piece.', ['1/10', '10/1', '1/9'], 0, bars({ numerator: 1, denominator: 10 }), 'Count all 10 equal pieces for the denominator; just one is selected.', 'One of ten equal shares is one tenth: 1/10.', bars({ numerator: 1, denominator: 5 })),
      practice('Which picture description shows 1/3?', ['1 of 3 equal parts', '3 of 3 equal parts', '1 of 4 unequal parts'], 0, bars({ numerator: 1, denominator: 3 }), 'A unit fraction counts one equal part.', 'The whole needs exactly three equal pieces, and one is counted.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction names one out of 12 equal tiles?', ['12/1', '1/12', '1/11'], 1, bars({ numerator: 1, denominator: 12 }), 'One tile is selected from 12 equal tiles.', 'One selected from twelve equal parts is 1/12.', bars({ numerator: 1, denominator: 6 })),
    ],
  },
  {
    id: 'unit-size', unit: 2, title: 'Bigger denominator, smaller piece', shortTitle: 'Unit fraction size', skill: 'For unit fractions, more equal parts make each part smaller.',
    description: 'Compare one piece of different-sized wholes.', example: {
      prompt: 'Which is larger: 1/3 or 1/8, when the wholes match?',
      answer: '1/3 is larger.',
      explanation: 'Thirds split the same whole into fewer pieces than eighths, so each third is larger.',
      model: bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 8 }),
    },
    questions: [
      practice('Which is the larger piece of the same-size whole: 1/4 or 1/6?', ['1/6', '1/4', 'They are equal'], 1, bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 6 }), 'Imagine cutting the same whole into 4 pieces, then into 6 pieces.', 'More cuts make smaller pieces. Fourths are larger than sixths.', bars({ numerator: 1, denominator: 2 })),
      practice('Put the larger unit fraction first: 1/9 or 1/5?', ['1/9', '1/5', 'They match'], 1, bars({ numerator: 1, denominator: 9 }, { numerator: 1, denominator: 5 }), 'Both fractions count one piece. Compare how many pieces share the whole.', 'Fifths are bigger because the same whole is split into fewer equal parts.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is closer to one whole: 1/2 or 1/10?', ['1/10', '1/2', 'They are equally close'], 1, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 10 }), 'Each is one piece; a larger piece is closer to a whole.', 'Half of a whole is much more than one tenth.', bars({ numerator: 1, denominator: 4 })),
      practice('Which is smaller: 1/3 or 1/7?', ['1/3', '1/7', 'They are the same'], 1, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 7 }), 'Think about which whole was cut into more equal pieces.', 'Sevenths are smaller pieces because seven pieces share the whole.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'sets-unit-fractions', unit: 2, title: 'Fractions in a group', shortTitle: 'Fractions of sets', skill: 'A fraction of a set counts equal groups of objects.',
    description: 'Find a fraction of a collection by sharing it equally.', example: {
      prompt: 'There are 12 buttons. What is 1/3 of the buttons?',
      answer: '4 buttons.',
      explanation: 'Split 12 buttons into 3 equal groups. Each group has 4, so one third is 4.',
      model: setModel(4, 12, 'One of 3 equal groups of 12'),
    },
    questions: [
      practice('What is 1/4 of 12 toy cars?', ['3 cars', '4 cars', '8 cars'], 0, setModel(3, 12), 'Share 12 cars into 4 equal groups. Find one group.', 'One fourth means one of four equal groups: 12 shared into 4 groups is 3 each.', setModel(2, 8)),
      practice('What is 1/3 of 15 beads?', ['3 beads', '5 beads', '12 beads'], 1, setModel(5, 15), 'Make 3 equal groups from the 15 beads.', '15 shared into 3 equal groups gives 5 beads in each group.', setModel(3, 9)),
      practice('Which picture description shows 1/2 of 10 shells?', ['5 shells', '2 shells', '8 shells'], 0, setModel(5, 10), 'Split all 10 shells into 2 equal groups.', 'Half of 10 is 5 because each of the 2 equal groups has 5.', setModel(4, 8)),
      practice('A class has 20 pencils. What is 1/5 of the pencils?', ['4', '5', '15'], 0, setModel(4, 20), 'Make five equal groups. One group is the answer.', '20 pencils shared into 5 equal groups gives 4 in each group.', setModel(2, 10)),
    ],
  },
  {
    id: 'sets-nonunit', unit: 2, title: 'More than one group', shortTitle: 'Count groups in a set', skill: 'To find a non-unit fraction of a set, find one equal group and count that many groups.',
    description: 'Find two or three equal groups in a collection.', example: {
      prompt: 'What is 2/5 of 15 counters?',
      answer: '6 counters.',
      explanation: 'First share 15 into 5 equal groups (3 in each). Then count 2 groups: 3 + 3 = 6.',
      model: setModel(6, 15, 'Two of 5 equal groups'),
    },
    questions: [
      practice('What is 2/3 of 12? Share 12 into 3 groups first.', ['8', '4', '9'], 0, setModel(8, 12), 'Find one third first, then count 2 groups.', '12 shared into 3 groups is 4 each. Two groups hold 8.', setModel(4, 12)),
      practice('What is 3/4 of 8 stickers?', ['2 stickers', '6 stickers', '7 stickers'], 1, setModel(6, 8), 'Make 4 equal groups, then count 3 of those groups.', 'One fourth of 8 is 2. Three groups of 2 make 6.', setModel(4, 8)),
      practice('What is 2/5 of 20 cubes?', ['8 cubes', '5 cubes', '10 cubes'], 0, setModel(8, 20), 'Share 20 into 5 equal groups; take 2 groups.', 'Each fifth is 4 cubes. Two fifths are 8.', setModel(4, 20)),
      practice('What is 3/6 of 18 buttons?', ['9 buttons', '6 buttons', '15 buttons'], 0, setModel(9, 18), 'First share 18 into 6 equal groups.', 'Each group has 3 buttons. Three groups contain 9.', setModel(6, 18)),
    ],
  },
  {
    id: 'benchmark-half', unit: 3, title: 'Is it less or more than half?', shortTitle: 'Benchmark: one half', skill: 'Use 1/2 as a benchmark to estimate and compare fractions.',
    description: 'Use the halfway point to reason about size.', example: {
      prompt: 'Is 3/8 less than or greater than 1/2?',
      answer: 'Less than 1/2.',
      explanation: 'Half of 8 pieces is 4 pieces. Three eighths is one piece short of that halfway point.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 1, denominator: 2 }),
    },
    questions: [
      practice('Which fraction is greater than 1/2?', ['2/6', '5/8', '3/10'], 1, bars({ numerator: 5, denominator: 8 }), 'Half of 8 is 4. Compare the numerator 5 to 4.', '5/8 is past halfway. The other numerators are below half of their denominators.', bars({ numerator: 1, denominator: 2 })),
      practice('Is 2/5 less than, equal to, or greater than 1/2?', ['Less than 1/2', 'Equal to 1/2', 'Greater than 1/2'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 1, denominator: 2 }), 'Half of 5 is 2 and a half pieces.', 'Two fifths is less than two and a half fifths, which is one half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is closest to 1/2?', ['4/9', '1/5', '7/8'], 0, bars({ numerator: 4, denominator: 9 }, { numerator: 1, denominator: 5 }, { numerator: 7, denominator: 8 }), 'Compare how far each amount is from the halfway point.', 'Four ninths is just one ninth below half; the others are farther away.', bars({ numerator: 1, denominator: 2 })),
      practice('A jug is 6/10 full. Is that more or less than half?', ['More than half', 'Less than half', 'Exactly half'], 0, bars({ numerator: 6, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Half of 10 equal parts is 5 parts.', 'Six tenths is one tenth past 5/10, which is one half.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'benchmarks-zero-one', unit: 3, title: 'Near zero, half, or one?', shortTitle: 'Fraction benchmarks', skill: 'Compare fractions with 0, 1/2, and 1 to estimate their magnitude.',
    description: 'Use familiar landmarks before calculating.', example: {
      prompt: 'Where would 7/8 fit: near 0, near 1/2, or near 1?',
      answer: 'Near 1.',
      explanation: 'Seven of the eight equal pieces are counted. Only one small piece is missing from the whole.',
      model: bars({ numerator: 7, denominator: 8 }),
    },
    questions: [
      practice('Which amount is closest to 0?', ['1/8', '4/5', '7/8'], 0, bars({ numerator: 1, denominator: 8 }, { numerator: 4, denominator: 5 }, { numerator: 7, denominator: 8 }), 'The fraction with the smallest shaded part is closest to zero.', 'One eighth is a small part of a whole; the others cover most of the whole.', bars({ numerator: 1, denominator: 4 })),
      practice('Which fraction is closest to 1 whole?', ['2/9', '8/9', '4/9'], 1, bars({ numerator: 2, denominator: 9 }, { numerator: 8, denominator: 9 }, { numerator: 4, denominator: 9 }), 'Look for the fraction with only one piece missing.', 'Eight ninths is just one ninth away from the whole.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is between 1/2 and 1?', ['3/8', '3/4', '1/4'], 1, bars({ numerator: 3, denominator: 4 }), 'Three fourths is past the halfway point but does not reach the whole.', '3/4 is greater than 1/2 and less than 1.', bars({ numerator: 1, denominator: 2 })),
      practice('A plant grew 9/10 of a meter. Is that closer to 0 or 1 meter?', ['0 meter', '1 meter', 'Exactly halfway'], 1, bars({ numerator: 9, denominator: 10 }), 'Only one tenth is missing from 10/10.', 'Nine tenths is close to one whole meter.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'fraction-magnitude', unit: 3, title: 'Fractions can be close together', shortTitle: 'Estimate size', skill: 'Reason about fraction magnitude using the numerator, denominator, and benchmarks.',
    description: 'Estimate before you compare exact amounts.', example: {
      prompt: 'About where is 5/12 compared with one half?',
      answer: 'A little less than one half.',
      explanation: 'Half of 12 is 6. Five twelfths is one twelfth short of halfway.',
      model: bars({ numerator: 5, denominator: 12 }, { numerator: 1, denominator: 2 }),
    },
    questions: [
      practice('Which is just a little less than 1/2?', ['4/9', '1/8', '8/9'], 0, bars({ numerator: 4, denominator: 9 }, { numerator: 1, denominator: 2 }), 'Half of 9 is 4 and a half. Four ninths is close to that.', '4/9 is only half of one ninth below 1/2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is a little more than 1/2?', ['3/8', '5/9', '1/6'], 1, bars({ numerator: 5, denominator: 9 }, { numerator: 1, denominator: 2 }), 'Half of 9 is 4 and a half.', 'Five ninths is just above halfway; 3/8 and 1/6 are below it.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is closest to 1?', ['6/7', '2/7', '3/7'], 0, bars({ numerator: 6, denominator: 7 }, { numerator: 2, denominator: 7 }, { numerator: 3, denominator: 7 }), 'For sevenths, look for the numerator closest to 7.', '6/7 is one seventh away from the whole.', bars({ numerator: 1, denominator: 2 })),
      practice('About how much is 1/10 + 1/10 + 1/10 + 1/10 + 1/10?', ['About 1/2', 'About 1/5', 'About 1 whole'], 0, bars({ numerator: 5, denominator: 10 }), 'Five tenths is halfway between 0 and 1.', '5/10 equals 1/2, so the sum is about one half.', bars({ numerator: 2, denominator: 4 })),
    ],
  },
  {
    id: 'number-line-basics', unit: 4, title: 'Build a fraction number line', shortTitle: 'Split the line', skill: 'Divide the interval from 0 to 1 into equal lengths.',
    description: 'Each jump on the line must be the same size.', example: {
      prompt: 'To mark thirds from 0 to 1, how many equal spaces do you make?',
      answer: '3 equal spaces.',
      explanation: 'The denominator tells how many equal jumps fit between 0 and 1.',
      model: line(1, 3),
    },
    questions: [
      practice('A line from 0 to 1 is split into 5 equal spaces. What is one jump?', ['1/5', '1/4', '5/1'], 0, line(1, 5), 'Count the equal spaces between 0 and 1.', 'Five equal jumps make one whole, so each jump is 1/5.', line(1, 2)),
      practice('How many equal spaces are needed to show fourths between 0 and 1?', ['4 spaces', '3 spaces', '5 spaces'], 0, line(2, 4), 'The denominator names the number of jumps in one whole.', 'Fourth means four equal spaces from 0 to 1.', line(1, 2)),
      practice('On a line split into 8 equal jumps, which tick is 3/8?', ['The third tick after 0', 'The eighth tick after 0', 'The third tick after 1'], 0, line(3, 8), 'Start at 0 and count three jumps, not eight.', 'The numerator tells you to move three of the eighth-size jumps.', line(1, 4)),
      practice('The space from 0 to 1 has 6 equal jumps. What fraction is at the 5th jump?', ['5/6', '6/5', '1/5'], 0, line(5, 6), 'Count five jumps from 0; each is one sixth.', 'Five sixth-size jumps land at 5/6.', line(2, 4)),
    ],
  },
  {
    id: 'number-line-points', unit: 4, title: 'Find the marked fraction', shortTitle: 'Read the line', skill: 'A fraction on a number line is the distance from 0 in equal unit-fraction steps.',
    description: 'Count equal jumps from 0 to name a point.', example: {
      prompt: 'On a line split into 7 equal spaces, the point is 4 jumps from 0. What is it?',
      answer: '4/7',
      explanation: 'Each jump is one seventh. Four jumps from zero make four sevenths.',
      model: line(4, 7),
    },
    questions: [
      practice('A point is 2 equal jumps from 0 on a line split into thirds. Name it.', ['2/3', '3/2', '1/3'], 0, line(2, 3), 'There are 3 spaces in the whole; the point is 2 spaces from 0.', 'Two jumps of size 1/3 land at 2/3.', line(1, 2)),
      practice('The point is halfway between 0 and 1. Which fraction names it?', ['1/2', '1/4', '2/1'], 0, line(1, 2), 'Halfway means one of two equal jumps.', 'The halfway point is 1/2.', line(1, 2)),
      practice('On a line split into 10 equal parts, what is the 7th tick after 0?', ['7/10', '10/7', '3/10'], 0, line(7, 10), 'The line has tenths. Count seven tenths from zero.', 'Seven jumps, each 1/10 long, reach 7/10.', line(3, 5)),
      practice('A point is 5 jumps along a line divided into 8 equal spaces. Name it.', ['5/8', '8/5', '5/3'], 0, line(5, 8), 'The point is five jumps from 0; each jump is 1/8.', 'Five eighth-size steps land at 5/8.', line(1, 2)),
    ],
  },
  {
    id: 'number-line-beyond-one', unit: 4, title: 'Keep going past one', shortTitle: 'Past one whole', skill: 'Number lines can show fractions greater than one whole.',
    description: 'Count equal jumps past 1 without restarting the fraction.', example: {
      prompt: 'A line uses fifth-size jumps. What point is 7 jumps from zero?',
      answer: '7/5, or 1 and 2/5.',
      explanation: 'Five fifths make 1 whole. Two more fifths reach 7/5, which is 1 and 2/5.',
      model: line(7, 5, 2),
    },
    questions: [
      practice('On a line with fourth-size jumps, what is 5 jumps from 0?', ['5/4', '4/5', '1/4'], 0, line(5, 4, 2), 'Four fourths reach 1. Count one more fourth.', 'Five jumps are 5/4, or 1 and 1/4.', line(3, 4)),
      practice('Which point is just past 1 on a line marked in thirds?', ['2/3', '4/3', '1/3'], 1, line(4, 3, 2), 'Three thirds reach 1; one more third is 4/3.', '4/3 is 1 and 1/3, just past one.', line(2, 3)),
      practice('How many sixths make 1 and 2/6?', ['8/6', '6/8', '2/6'], 0, line(8, 6, 2), 'One whole is 6/6. Add 2/6 more.', '6/6 + 2/6 = 8/6.', line(6, 6)),
      practice('A runner goes 9 fifth-size steps. How far is that?', ['1 and 4/5', '9/5 = 1 and 4/5', '4/5'], 1, line(9, 5, 2), 'Five fifths make a whole. Group the 9 steps into a whole and leftovers.', '9/5 is 5/5 + 4/5, which is 1 and 4/5.', line(5, 5)),
    ],
  },
  {
    id: 'compare-same-denominator', unit: 5, title: 'Same-size pieces, different counts', shortTitle: 'Compare like pieces', skill: 'With equal denominators, the larger numerator names the larger fraction.',
    description: 'Compare fractions made from same-size pieces.', example: {
      prompt: 'Which is greater: 3/8 or 5/8?',
      answer: '5/8.',
      explanation: 'Both use eighth-size pieces. Five pieces cover more than three pieces.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 5, denominator: 8 }),
    },
    questions: [
      practice('Which is greater: 4/7 or 2/7?', ['2/7', '4/7', 'They are equal'], 1, bars({ numerator: 4, denominator: 7 }, { numerator: 2, denominator: 7 }), 'The pieces are the same size. Compare how many pieces.', 'Four sevenths is more than two sevenths because 4 pieces are more than 2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is smaller: 3/10 or 8/10?', ['3/10', '8/10', 'They match'], 0, bars({ numerator: 3, denominator: 10 }, { numerator: 8, denominator: 10 }), 'Both fractions count tenths. Which has fewer?', 'Three tenths is less than eight tenths.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the comparison: 6/9 __ 7/9.', ['>', '<', '='], 1, bars({ numerator: 6, denominator: 9 }, { numerator: 7, denominator: 9 }), 'The denominator matches. Compare 6 and 7.', 'Six ninths is less than seven ninths.', bars({ numerator: 1, denominator: 3 })),
      practice('Put the larger fraction first: 5/12 or 9/12?', ['5/12', '9/12', 'They are equal'], 1, bars({ numerator: 5, denominator: 12 }, { numerator: 9, denominator: 12 }), 'Each piece is one twelfth. Count the shaded pieces.', 'Nine twelfths covers more than five twelfths.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'compare-same-numerator', unit: 5, title: 'Same count, different piece size', shortTitle: 'Compare same tops', skill: 'With equal numerators, the smaller denominator gives larger pieces.',
    description: 'Compare fractions that count the same number of pieces.', example: {
      prompt: 'Which is greater: 3/5 or 3/8?',
      answer: '3/5.',
      explanation: 'Both count 3 pieces, but fifths are larger pieces than eighths when the wholes match.',
      model: bars({ numerator: 3, denominator: 5 }, { numerator: 3, denominator: 8 }),
    },
    questions: [
      practice('Which is greater: 2/3 or 2/7?', ['2/7', '2/3', 'They are equal'], 1, bars({ numerator: 2, denominator: 3 }, { numerator: 2, denominator: 7 }), 'Both count 2 pieces. Which whole is cut into fewer pieces?', 'Thirds are larger than sevenths, so 2/3 is larger.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is smaller: 4/5 or 4/9?', ['4/5', '4/9', 'They are equal'], 1, bars({ numerator: 4, denominator: 5 }, { numerator: 4, denominator: 9 }), 'Both count 4 pieces. Ninth-size pieces are smaller.', 'Four ninths is less than four fifths.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the comparison: 1/6 __ 1/4.', ['>', '<', '='], 1, bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 4 }), 'These are unit fractions. More pieces in the whole means smaller pieces.', 'One sixth is smaller than one fourth.', bars({ numerator: 1, denominator: 2 })),
      practice('Which covers more: 3/10 or 3/8?', ['3/10', '3/8', 'They cover the same'], 1, bars({ numerator: 3, denominator: 10 }, { numerator: 3, denominator: 8 }), 'Both count three pieces. Compare the size of each piece.', 'Eighths are larger pieces than tenths, so 3/8 covers more.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'order-fractions', unit: 5, title: 'Put fractions in order', shortTitle: 'Order fractions', skill: 'Use benchmarks and equal-sized parts to order fractions.',
    description: 'Compare the amounts, not just the digits.', example: {
      prompt: 'Order 1/4, 3/4, and 1/2 from least to greatest.',
      answer: '1/4, 1/2, 3/4',
      explanation: 'A quarter is less than half; three quarters is more than half.',
      model: bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 2 }, { numerator: 3, denominator: 4 }),
    },
    questions: [
      practice('Choose the order from least to greatest: 1/3, 2/3, 3/3.', ['1/3, 2/3, 3/3', '3/3, 2/3, 1/3', '2/3, 1/3, 3/3'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }, { numerator: 3, denominator: 3 }), 'These are thirds. Order them by how many thirds are counted.', 'One third is smallest; three thirds make one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('Which list goes from greatest to least: 1/5, 1/2, 1/4?', ['1/2, 1/4, 1/5', '1/5, 1/4, 1/2', '1/4, 1/2, 1/5'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 4 }, { numerator: 1, denominator: 5 }), 'For unit fractions, fewer pieces in the whole makes each piece larger.', 'Half is greatest, then one fourth, then one fifth.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is between 2/8 and 6/8?', ['1/8', '4/8', '7/8'], 1, bars({ numerator: 2, denominator: 8 }, { numerator: 4, denominator: 8 }, { numerator: 6, denominator: 8 }), 'All are eighths. Find a numerator between 2 and 6.', 'Four eighths is between two eighths and six eighths.', bars({ numerator: 1, denominator: 2 })),
      practice('Order 1/2, 3/10, and 8/10 from least to greatest.', ['3/10, 1/2, 8/10', '8/10, 1/2, 3/10', '1/2, 3/10, 8/10'], 0, bars({ numerator: 3, denominator: 10 }, { numerator: 1, denominator: 2 }, { numerator: 8, denominator: 10 }), 'Compare each amount with 5/10, which is one half.', '3/10 is below half; 8/10 is above half.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'equivalent-models', unit: 6, title: 'Same amount, new name', shortTitle: 'See equivalence', skill: 'Equivalent fractions name the same amount of a whole.',
    description: 'Match equal amounts even when the pieces differ.', example: {
      prompt: 'How can 1/2 and 2/4 cover the same amount?',
      answer: 'Each half can be split into 2 smaller equal parts.',
      explanation: 'Splitting both the shaded and unshaded half makes four equal pieces, two shaded.',
      model: bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }),
    },
    questions: [
      practice('Which fraction covers the same amount as 1/2?', ['2/4', '1/4', '3/4'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }), 'Compare the shaded length of each bar.', 'Two fourths cover the same half of the whole as one half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is equivalent to 2/3?', ['4/6', '3/6', '2/6'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }), 'Imagine splitting every third into 2 equal pieces.', 'Both numerator and denominator double: 2/3 becomes 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('Choose a fraction equal to 3/4.', ['6/8', '3/8', '4/8'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 }), 'Split every fourth into two equal pieces.', 'Three fourths and six eighths shade the same amount.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is another name for 2/5?', ['4/10', '2/10', '5/2'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 10 }), 'Multiply the number of pieces and total pieces by the same number.', 'Doubling both numbers gives 4/10, an equivalent fraction.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'build-equivalents', unit: 6, title: 'Build an equivalent fraction', shortTitle: 'Make equivalents', skill: 'Multiply or divide the numerator and denominator by the same number to find an equivalent fraction.',
    description: 'Rename a fraction without changing its size.', example: {
      prompt: 'Make an equivalent fraction for 2/3 by doubling both numbers.',
      answer: '4/6',
      explanation: 'Two thirds of the same whole is four sixths when each third is split in half.',
      model: bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }),
    },
    questions: [
      practice('Multiply top and bottom of 1/4 by 3. What do you get?', ['3/12', '1/12', '4/3'], 0, bars({ numerator: 1, denominator: 4 }, { numerator: 3, denominator: 12 }), 'Whatever you do to the top, do to the bottom too.', '1 × 3 is 3 and 4 × 3 is 12, so 3/12 is equivalent.', bars({ numerator: 1, denominator: 2 })),
      practice('Which equivalent fraction is made by doubling 3/5?', ['6/10', '3/10', '5/6'], 0, bars({ numerator: 3, denominator: 5 }, { numerator: 6, denominator: 10 }), 'Double both the numerator and denominator.', '3/5 becomes 6/10 when both numbers are multiplied by 2.', bars({ numerator: 1, denominator: 2 })),
      practice('Divide top and bottom of 4/8 by 4. What fraction do you get?', ['1/2', '1/8', '4/4'], 0, bars({ numerator: 4, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Use the same division for both numbers.', '4 ÷ 4 is 1 and 8 ÷ 4 is 2, so 4/8 = 1/2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction has the same value as 5/10?', ['1/2', '1/5', '5/5'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 1, denominator: 2 }), 'Can both numbers be divided by the same factor?', 'Dividing 5 and 10 by 5 gives 1/2.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'missing-equivalent', unit: 6, title: 'Find the missing number', shortTitle: 'Missing parts', skill: 'Use equivalent fraction patterns and visual models to find a missing numerator or denominator.',
    description: 'Keep the fraction’s value the same while filling a blank.', example: {
      prompt: 'Complete 2/3 = ?/6.',
      answer: '4/6',
      explanation: 'The denominator doubled from 3 to 6, so double the numerator too: 2 becomes 4.',
      model: bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }),
    },
    questions: [
      practice('Complete 1/2 = ?/8.', ['4/8', '2/8', '1/8'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 4, denominator: 8 }), 'Two halves make eighths. What factor changes 2 into 8?', 'The denominator is multiplied by 4, so multiply the numerator by 4 too.', bars({ numerator: 1, denominator: 2 })),
      practice('Complete 3/4 = 6/?.', ['8', '12', '10'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 }), 'The numerator was multiplied by 2.', 'Multiply the denominator by 2 as well: 4 × 2 = 8.', bars({ numerator: 1, denominator: 2 })),
      practice('Which number makes ?/10 = 2/5?', ['4', '2', '5'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 10 }), 'The denominator doubled from 5 to 10.', 'Double the numerator too: 2 becomes 4.', bars({ numerator: 1, denominator: 2 })),
      practice('Complete 4/6 = 2/?.', ['3', '6', '4'], 0, bars({ numerator: 4, denominator: 6 }, { numerator: 2, denominator: 3 }), 'The numerator was divided by 2.', 'Divide the denominator by 2 also: 6 ÷ 2 = 3.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'compose-to-one', unit: 7, title: 'Put pieces together', shortTitle: 'Compose a whole', skill: 'Compose a whole from unit fractions with the same denominator.',
    description: 'Collect equal-size pieces until they make a whole.', example: {
      prompt: 'How many one-fourth pieces make one whole?',
      answer: 'Four fourths: 4/4 = 1.',
      explanation: 'When the number of fourth-size pieces reaches four, you have all the pieces in one whole.',
      model: bars({ numerator: 4, denominator: 4 }),
    },
    questions: [
      practice('How many 1/5 pieces make one whole?', ['5 pieces', '4 pieces', '10 pieces'], 0, bars({ numerator: 5, denominator: 5 }), 'The denominator tells how many equal pieces fill one whole.', 'Five fifths make one whole: 5/5 = 1.', bars({ numerator: 2, denominator: 4 })),
      practice('Which sum makes 1 whole?', ['1/3 + 2/3', '1/4 + 1/4', '2/5 + 1/5'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }), 'Look for enough same-size pieces to make the denominator.', 'One third plus two thirds makes 3/3, or one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('What is 2/8 + 6/8?', ['8/8 = 1', '8/16', '4/8'], 0, bars({ numerator: 2, denominator: 8 }, { numerator: 6, denominator: 8 }), 'Count eighth-size pieces; keep the piece size the same.', '2 eighths + 6 eighths = 8 eighths, one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('A recipe uses 3/6 cup, then 3/6 cup. How much is that?', ['6/6 = 1 cup', '6/12 cup', '3/6 cup'], 0, bars({ numerator: 3, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Add the number of sixths. How many sixths fill one cup?', 'Six sixths make one cup.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'decompose-fractions', unit: 7, title: 'Break an amount apart', shortTitle: 'Decompose', skill: 'Decompose a fraction into sums of fractions with the same denominator.',
    description: 'Describe one amount in more than one way.', example: {
      prompt: 'Break 5/6 into two fractions with denominator 6.',
      answer: '2/6 + 3/6 = 5/6.',
      explanation: 'The sixth-size pieces stay the same. Split the five pieces into groups of two and three.',
      model: bars({ numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }, { numerator: 5, denominator: 6 }),
    },
    questions: [
      practice('Which sum equals 4/7?', ['1/7 + 3/7', '1/7 + 2/7', '4/7 + 4/7'], 0, bars({ numerator: 1, denominator: 7 }, { numerator: 3, denominator: 7 }), 'Add the numerators and keep sevenths as the piece size.', 'One seventh plus three sevenths is four sevenths.', bars({ numerator: 1, denominator: 2 })),
      practice('Complete: 6/8 = 2/8 + __/8.', ['4/8', '3/8', '8/8'], 0, bars({ numerator: 2, denominator: 8 }, { numerator: 4, denominator: 8 }, { numerator: 6, denominator: 8 }), 'How many eighths remain after taking away two?', 'Six eighths minus two eighths leaves four eighths.', bars({ numerator: 1, denominator: 2 })),
      practice('Which pair is another way to make 3/5?', ['1/5 + 2/5', '1/5 + 1/5', '3/5 + 2/5'], 0, bars({ numerator: 1, denominator: 5 }, { numerator: 2, denominator: 5 }), 'Count fifths in each part and combine them.', 'One fifth and two fifths make three fifths.', bars({ numerator: 1, denominator: 2 })),
      practice('Break 7/10 into 5/10 plus how many tenths?', ['2/10', '3/10', '5/10'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 2, denominator: 10 }), 'Subtract 5 tenths from 7 tenths.', 'Two tenths more makes seven tenths.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'improper-fractions', unit: 7, title: 'More than one whole', shortTitle: 'Past a whole', skill: 'An improper fraction can name one or more whole units plus fractional parts.',
    description: 'Count same-size pieces across whole-number boundaries.', example: {
      prompt: 'What is 7/4 as a mixed number?',
      answer: '1 and 3/4.',
      explanation: 'Four fourths make one whole. Three fourths are left over.',
      model: { kind: 'bars', bars: [{ numerator: 4, denominator: 4 }, { numerator: 3, denominator: 4 }], caption: '7 fourths is 1 whole and 3 fourths' },
    },
    questions: [
      practice('What is 5/3 as a mixed number?', ['1 and 2/3', '2 and 1/3', '5 and 3'], 0, line(5, 3, 2), 'Three thirds make one whole. How many thirds remain?', '5/3 is 3/3 and 2/3: one whole and two thirds.', line(3, 3, 2)),
      practice('Which improper fraction equals 2 and 1/5?', ['11/5', '7/5', '2/5'], 0, line(11, 5, 3), 'Two wholes are ten fifths. Add one fifth.', '10/5 + 1/5 = 11/5.', line(5, 5, 2)),
      practice('How many fourths are in 1 and 2/4?', ['6/4', '3/4', '4/6'], 0, line(6, 4, 2), 'One whole is four fourths. Add two more.', 'Four fourths plus two fourths is six fourths.', line(4, 4, 2)),
      practice('Which is greater than one whole?', ['9/8', '7/8', '1/8'], 0, line(9, 8, 2), 'Eight eighths make exactly one.', 'Nine eighths is one eighth more than a whole.', line(8, 8, 2)),
    ],
  },
  {
    id: 'mixed-improper', unit: 7, title: 'Switch between mixed and improper', shortTitle: 'Two ways to name it', skill: 'Represent an improper fraction and a mixed number as the same amount.',
    description: 'Trade groups of fractional parts for whole units.', example: {
      prompt: 'Write 1 and 3/8 as an improper fraction.',
      answer: '11/8.',
      explanation: 'One whole contains 8 eighths. Add 3 more eighths to get 11/8.',
      model: { kind: 'bars', bars: [{ numerator: 8, denominator: 8 }, { numerator: 3, denominator: 8 }], caption: '1 whole and 3 eighths' },
    },
    questions: [
      practice('Write 1 and 2/3 as an improper fraction.', ['5/3', '3/5', '4/3'], 0, line(5, 3, 2), 'One whole is 3/3. Add 2/3.', '3/3 + 2/3 = 5/3.', line(3, 3, 2)),
      practice('Which mixed number equals 9/4?', ['2 and 1/4', '1 and 5/4', '2 and 2/4'], 0, line(9, 4, 3), 'Group 4 fourths into one whole, then count what is left.', 'Eight fourths make 2 wholes; one fourth remains.', line(8, 4, 2)),
      practice('Change 2 and 3/5 into fifths.', ['13/5', '10/5', '5/13'], 0, line(13, 5, 3), 'Two wholes equal ten fifths. Add three fifths.', '10/5 + 3/5 = 13/5.', line(10, 5, 2)),
      practice('What mixed number is 10/6?', ['1 and 4/6', '1 and 2/6', '2 and 4/6'], 0, line(10, 6, 2), 'Six sixths make one whole. Count the leftover sixths.', '10/6 is 6/6 + 4/6: one and four sixths.', line(6, 6, 2)),
    ],
  },
  {
    id: 'add-like-denominators', unit: 8, title: 'Add same-size fraction pieces', shortTitle: 'Add fractions', skill: 'Add fractions with like denominators by combining numerators and keeping the same unit.',
    description: 'Combine same-size pieces without changing their size.', example: {
      prompt: 'What is 2/7 + 3/7?',
      answer: '5/7.',
      explanation: 'Two seventh-size pieces plus three seventh-size pieces make five seventh-size pieces.',
      model: bars({ numerator: 2, denominator: 7 }, { numerator: 3, denominator: 7 }, { numerator: 5, denominator: 7 }),
    },
    questions: [
      practice('What is 1/6 + 4/6?', ['5/6', '5/12', '1/6'], 0, equation('1/6 + 4/6 = ?'), 'The pieces are sixths. Add how many pieces, not the piece size.', 'Add the numerators: 1 + 4 = 5. Keep the denominator 6.', bars({ numerator: 1, denominator: 6 })),
      practice('What is 3/8 + 2/8?', ['5/8', '5/16', '6/8'], 0, equation('3/8 + 2/8 = ?'), 'Count eighth-size pieces together.', '3 + 2 = 5 eighths. The denominator stays 8.', bars({ numerator: 2, denominator: 8 })),
      practice('Maya walked 2/10 mile, then 5/10 mile. How far altogether?', ['7/10 mile', '7/20 mile', '3/10 mile'], 0, bars({ numerator: 2, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Both distances use tenths of a mile.', 'Two tenths plus five tenths is seven tenths.', bars({ numerator: 2, denominator: 10 })),
      practice('What is 4/9 + 3/9?', ['7/9', '7/18', '1/9'], 0, equation('4/9 + 3/9 = ?'), 'The ninths are the same-sized pieces.', 'Four ninths plus three ninths equals seven ninths.', bars({ numerator: 3, denominator: 9 })),
    ],
  },
  {
    id: 'subtract-like-denominators', unit: 8, title: 'Take same-size pieces away', shortTitle: 'Subtract fractions', skill: 'Subtract fractions with like denominators by removing equal-sized pieces.',
    description: 'Keep the denominator when the piece size stays the same.', example: {
      prompt: 'What is 6/8 − 2/8?',
      answer: '4/8.',
      explanation: 'Start with six eighths and take away two eighth-size pieces. Four eighths remain.',
      model: bars({ numerator: 6, denominator: 8 }, { numerator: 4, denominator: 8 }),
    },
    questions: [
      practice('What is 5/7 − 2/7?', ['3/7', '3/14', '7/7'], 0, equation('5/7 − 2/7 = ?'), 'Remove two of the seven-size pieces.', '5 seventh-pieces minus 2 leaves 3 seventh-pieces. Keep the denominator 7.', bars({ numerator: 5, denominator: 7 })),
      practice('There is 9/10 of a jug of water. You pour out 4/10. How much remains?', ['5/10', '5/20', '13/10'], 0, bars({ numerator: 9, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Both amounts are measured in tenths.', 'Nine tenths minus four tenths leaves five tenths.', bars({ numerator: 4, denominator: 10 })),
      practice('What is 7/8 − 3/8?', ['4/8', '4/16', '10/8'], 0, equation('7/8 − 3/8 = ?'), 'Subtract the number of eighths.', 'Seven eighths take away three eighths leaves four eighths.', bars({ numerator: 6, denominator: 8 })),
      practice('What is 6/9 − 1/9?', ['5/9', '5/18', '7/9'], 0, equation('6/9 − 1/9 = ?'), 'Take away one ninth-size piece.', 'Six ninths minus one ninth leaves five ninths.', bars({ numerator: 6, denominator: 9 })),
    ],
  },
  {
    id: 'add-related-fractions', unit: 8, title: 'Rename, then add', shortTitle: 'Add different names', skill: 'Use equivalent fractions to add simple fractions with different denominators.',
    description: 'Rename one fraction so the pieces match before adding.', example: {
      prompt: 'What is 1/2 + 1/4?',
      answer: '3/4.',
      explanation: 'One half is the same as two fourths. Two fourths plus one fourth is three fourths.',
      model: bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }, { numerator: 1, denominator: 4 }),
    },
    questions: [
      practice('What is 1/2 + 1/6?', ['4/6', '2/8', '2/6'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 3, denominator: 6 }, { numerator: 1, denominator: 6 }), 'Rename one half as sixths first.', '1/2 is 3/6. Then 3/6 + 1/6 = 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('What is 1/3 + 1/6?', ['3/6', '2/9', '2/6'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 6 }, { numerator: 1, denominator: 6 }), 'How many sixths equal one third?', 'One third is 2/6; add one more sixth to get 3/6.', bars({ numerator: 1, denominator: 2 })),
      practice('A ribbon is 1/4 meter and another is 1/2 meter. How long together?', ['3/4 meter', '2/6 meter', '2/4 meter'], 0, bars({ numerator: 1, denominator: 4 }, { numerator: 2, denominator: 4 }, { numerator: 1, denominator: 4 }), 'Rename one half as fourths.', 'One half is two fourths. Together with one fourth, that is three fourths.', bars({ numerator: 1, denominator: 2 })),
      practice('What is 2/3 + 1/6?', ['5/6', '3/9', '3/6'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }, { numerator: 1, denominator: 6 }), 'Rename two thirds using sixth-size pieces.', '2/3 is 4/6. Add 1/6 to get 5/6.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'tenths-decimals', unit: 8, title: 'Tenths as decimals', shortTitle: 'Fractions and decimals', skill: 'Fractions with denominator 10 can be written as decimals to tenths.',
    description: 'Connect tenths on a fraction bar to the first decimal place.', example: {
      prompt: 'How can you write 7/10 as a decimal?',
      answer: '0.7',
      explanation: 'Seven tenths means 7 in the tenths place: 0.7. The amount is still less than one whole.',
      model: decimal(7),
    },
    questions: [
      practice('Write 3/10 as a decimal.', ['0.3', '3.0', '0.03'], 0, decimal(3), 'Tenths are the first place to the right of the decimal point.', 'Three tenths is 0.3, not 3 wholes or three hundredths.', decimal(1)),
      practice('Which fraction is the same as 0.6?', ['6/10', '6/100', '1/6'], 0, decimal(6), 'The 6 is in the tenths place.', '0.6 means six tenths, or 6/10.', decimal(5)),
      practice('A meter is 0.4 full. Which fraction names that amount?', ['4/10', '4/100', '10/4'], 0, decimal(4), 'The first digit after the decimal point counts tenths.', '0.4 is four tenths: 4/10.', decimal(2)),
      practice('Which is greater: 0.8 or 5/10?', ['0.8', '5/10', 'They are equal'], 0, bars({ numerator: 8, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Rename 0.8 as eighth tenths and compare with five tenths.', 'Eight tenths is greater than five tenths.', decimal(5)),
    ],
  },
  {
    id: 'hundredths-decimals', unit: 8, title: 'Hundredths and place value', shortTitle: 'Hundredths', skill: 'Fractions over 100 connect to the hundredths place in a decimal.',
    description: 'Read two digits after the decimal point as hundredths.', example: {
      prompt: 'How can you write 25/100 as a decimal?',
      answer: '0.25',
      explanation: 'The 2 is two tenths and the 5 is five hundredths: 25 hundredths altogether.',
      model: { kind: 'bars', bars: [{ numerator: 25, denominator: 100 }], caption: '25 hundredths of one whole' },
    },
    questions: [
      practice('Write 8/100 as a decimal.', ['0.08', '0.8', '8.00'], 0, { kind: 'bars', bars: [{ numerator: 8, denominator: 100 }] }, 'Hundredths use two places after the decimal point.', 'Eight hundredths is 0.08. The zero keeps the 8 in the hundredths place.', decimal(1)),
      practice('Which fraction is the same as 0.35?', ['35/100', '3/5', '35/10'], 0, { kind: 'bars', bars: [{ numerator: 35, denominator: 100 }] }, 'Two digits after the decimal point mean hundredths.', '0.35 is thirty-five hundredths, or 35/100.', decimal(4)),
      practice('Which is greater: 0.4 or 0.35?', ['0.4', '0.35', 'They are equal'], 0, bars({ numerator: 4, denominator: 10 }, { numerator: 35, denominator: 100 }), 'Rename 0.4 as hundredths so the place values match.', '0.4 is 0.40, and 40 hundredths is more than 35 hundredths.', decimal(4)),
      practice('Which decimal equals 9/10?', ['0.9', '0.09', '9.10'], 0, decimal(9), 'Tenths have one digit after the decimal point.', 'Nine tenths is 0.9. 0.09 would mean nine hundredths.', decimal(5)),
    ],
  },
];

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
  return MISSIONS.find((item) => !progress.completedMissionIds.includes(item.id)) ?? null;
}

export function isCorrectAnswer(question: PracticeQuestion, answer: Answer): boolean {
  return Number.isInteger(answer) && answer === question.correctChoice;
}

export function isMissionUnlocked(progress: Progress, missionId: string): boolean {
  if (progress.completedMissionIds.includes(missionId)) return true;
  const targetIndex = MISSIONS.findIndex((item) => item.id === missionId);
  if (targetIndex < 0) return false;
  const nextIndex = MISSIONS.findIndex((item) => !progress.completedMissionIds.includes(item.id));
  return nextIndex < 0 || targetIndex <= nextIndex;
}

export function completeMission(progress: Progress, missionId: string, stars: number): Progress {
  const safeStars = Math.max(1, Math.min(3, Math.floor(stars)));
  return {
    completedMissionIds: progress.completedMissionIds.includes(missionId)
      ? progress.completedMissionIds
      : [...progress.completedMissionIds, missionId],
    starsByMission: {
      ...progress.starsByMission,
      [missionId]: Math.max(progress.starsByMission[missionId] ?? 0, safeStars),
    },
    reviewQueue: progress.reviewQueue,
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
    return { completedMissionIds: [...completed], starsByMission, reviewQueue };
  } catch {
    return EMPTY_PROGRESS;
  }
}

export function saveProgress(progress: Progress): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // The course still works when a browser blocks local storage.
  }
}

export function resetProgress(): Progress {
  saveProgress(EMPTY_PROGRESS);
  return EMPTY_PROGRESS;
}