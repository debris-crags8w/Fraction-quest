import { noBeforeYes, orderedWithSigns, withFourthChoice } from './fourth-choice';
import { hasLearningGate, targetedPracticePlans, type LearningRecord } from './learning';
import type { AreaCut } from './area-shapes';
import { amountsIn, autoPicture } from './auto-picture';
import { asChoicePrompt, choiceDistractors, getBuildChecks, getWorksheet, type WorksheetProblem } from './learning-content';
import { FRACTION_STANDARDS, standardsForMission, type StandardId } from './standard-catalog';
import { scopedStorageKey } from './storage-scope';

/** `named`: the question states this fraction, so the bar shows its label (other bars are labelled once answered). */
export type FractionValue = { numerator: number; denominator: number; named?: boolean };

/** Compare fraction values exactly without converting them to rounded decimals or percentages. */
export function sameFractionValue(
  left: Pick<FractionValue, 'numerator' | 'denominator'>,
  right: Pick<FractionValue, 'numerator' | 'denominator'>,
): boolean {
  if (
    !Number.isSafeInteger(left.numerator) || !Number.isSafeInteger(right.numerator)
    || !Number.isSafeInteger(left.denominator) || left.denominator <= 0
    || !Number.isSafeInteger(right.denominator) || right.denominator <= 0
  ) return false;
  return BigInt(left.numerator) * BigInt(right.denominator)
    === BigInt(right.numerator) * BigInt(left.denominator);
}

export type FractionOrderDirection = 'ascending' | 'descending';
export type FractionOrderRound = {
  id: string;
  direction: FractionOrderDirection;
  title: string;
  cards: FractionValue[];
  strategyHint: string;
  explanation: string;
};

/** The ordering lesson's unscored, in-memory card sort. */
export const FRACTION_ORDER_ROUNDS: FractionOrderRound[] = [
  {
    id: 'smallest-first',
    direction: 'ascending',
    title: 'Smallest to biggest',
    cards: [{ numerator: 8, denominator: 10 }, { numerator: 3, denominator: 10 }, { numerator: 1, denominator: 2 }],
    strategyHint: 'Use 1/2 as a landmark. 3/10 is below half and 8/10 is above half. Also, 1/2 is 5/10.',
    explanation: '1/2 is 5/10, so the order is 3/10, 1/2, 8/10.',
  },
  {
    id: 'biggest-first',
    direction: 'descending',
    title: 'Biggest to smallest',
    cards: [{ numerator: 1, denominator: 8 }, { numerator: 5, denominator: 8 }, { numerator: 3, denominator: 8 }],
    strategyHint: 'All three fractions are eighths. Compare the numerators: more eighths means a bigger fraction.',
    explanation: 'They are all eighths, so compare the numerators: 5/8, 3/8, 1/8.',
  },
];

/** Check the left-to-right (or top-to-bottom) order without converting to rounded decimals. */
export function fractionOrderMatches(cards: readonly FractionValue[], direction: FractionOrderDirection): boolean {
  if (cards.length < 2 || cards.some(({ denominator }) => denominator <= 0)) return false;
  return cards.slice(1).every((card, index) => {
    const previous = cards[index];
    const difference = previous.numerator * card.denominator - card.numerator * previous.denominator;
    return direction === 'ascending' ? difference <= 0 : difference >= 0;
  });
}

export type ModelSpec =
  | { kind: 'bars'; bars: FractionValue[]; caption?: string; hideLabels?: boolean }
  | { kind: 'set'; selected: number; total: number; groupCount?: number; caption?: string }
  | { kind: 'line'; numerator: number; denominator: number; wholes?: number; caption?: string; hideLabels?: boolean }
  | { kind: 'partition'; parts: number[]; caption?: string }
  | { kind: 'equation'; text: string; caption?: string }
  | { kind: 'decimal'; tenths: number; caption?: string; hideLabels?: boolean }
  /** A square, circle or hexagon cut into pieces (see area-shapes.ts); `shaded` lists piece numbers. */
  | { kind: 'area'; cut: AreaCut; shaded: number[]; caption?: string };

export type SetModelLayout = { groupCount: number; selectedGroups: number; objectsPerGroup: number };

/** Return an equal-group layout only when every displayed object belongs to a whole, equal group. */
export function setModelLayout(model: Extract<ModelSpec, { kind: 'set' }>): SetModelLayout | null {
  const { groupCount, selected, total } = model;
  if (!groupCount || !Number.isInteger(groupCount) || groupCount < 1 || !Number.isInteger(total) || total < 1 || total % groupCount !== 0) return null;
  if (!Number.isInteger(selected) || selected < 0 || selected > total) return null;
  const objectsPerGroup = total / groupCount;
  if (selected % objectsPerGroup !== 0) return null;
  return { groupCount, selectedGroups: selected / objectsPerGroup, objectsPerGroup };
}

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
  standards?: string[];
  /** Set on a lesson's story problem (story mode): the chapter friend's line before it. */
  storySetup?: string;
};

export type WorkedExample = {
  prompt: string;
  answer: string;
  explanation: string;
  model: ModelSpec;
  numberLine?: {
    points: FractionValue[];
    benchmark: FractionValue;
    equivalentNames?: { fraction: FractionValue; equivalentTo: FractionValue }[];
  };
};

export type Mission = {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  skill: string;
  explainPrompt?: string;
  learningIntro?: { goal: string; process: string; why: string };
  unit: number;
  gradeBand?: 3 | 4 | 5;
  standards?: string[];
  enrichment?: boolean;
  example: WorkedExample;
  questions: PracticeQuestion[];
};

export type Progress = {
  completedMissionIds: string[];
  starsByMission: Record<string, number>;
  reviewQueue: SkillReview[];
  learning?: Record<string, LearningRecord>;
  challengeBest?: Record<string, number>;
  dailyPractice?: DailyPracticeSession;
  adaptiveStandards?: Record<string, AdaptiveStandardState>;
  adaptationLog?: AdaptationEvent[];
  /** Placement quiz result: lessons in units before `unit` are open (not marked done). */
  placement?: { unit: number; at: number };
  /** Completed checks are saved with the rest of progress and never change lesson unlocks. */
  assessments?: AssessmentAttempt[];
};

export type AdaptiveStatus = 'not-yet' | 'developing' | 'mastered';
export type DifficultyBand = 'scaffolded' | 'grade-level' | 'transfer';
export type AdaptiveStandardState = {
  status: AdaptiveStatus;
  recent: boolean[];
  accuracy: number;
  streakCorrect: number;
  streakMisses: number;
  lastUpdatedAt: number;
};
export type AdaptationEvent = {
  at: number;
  missionId: string;
  standard: StandardId;
  band: DifficultyBand;
  reason: string;
};

export type AssessmentResponse = {
  itemId: string;
  standards: string[];
  modelBuilt: boolean;
  correct: boolean;
};

export type AssessmentAttempt = {
  assessmentId: string;
  seed: number;
  startedAt: number;
  completedAt: number;
  responses: AssessmentResponse[];
};

export type DailyPracticeQuestion = {
  id: string;
  missionId: string;
  topicTitle: string;
  standards?: StandardId[];
  difficultyBand?: DifficultyBand;
  adaptationReason?: string;
  reteachLoop?: boolean;
  modelKind: 'bar' | 'number-line';
  numerator: number;
  denominator: number;
  explanation: string;
  /** 'build': make numerator/denominator, choosing the equal parts yourself (older saves have no kind).
      'choice': a question from the lesson's own practice set (`seed` picks it), so every topic is reviewed its own way. */
  kind?: 'build' | 'choice';
  seed?: number;
};
export type DailyPracticeAttempt = {
  shaded: number[];
  draft: string;
  modelChecked: boolean;
  modelCorrect: boolean;
  answerChecked: boolean;
  answerCorrect: boolean;
  /** Build items: how many equal parts the child chose (none until they choose). */
  parts?: number;
  /** Choice items: the choice picked. */
  choice?: number;
};
export type DailyPracticeSession = {
  day: string;
  startedAt: number;
  questions: DailyPracticeQuestion[];
  index: number;
  attempts: Record<string, DailyPracticeAttempt>;
  completedAt?: number;
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

/** Extra practice-bank questions can appear in a lesson round, but only authored lesson questions earn lesson stars. */
export function countsTowardLessonStars(
  question: Pick<PracticeQuestion, 'id' | 'isOptionalReview'>,
  eligibleQuestionIds: ReadonlySet<string>,
): boolean {
  return !question.isOptionalReview && eligibleQuestionIds.has(question.id);
}

export function starsFromFirstTryAnswers(firstTryAnswers: number, requiredQuestionCount: number): 1 | 2 | 3 {
  const total = Number.isFinite(requiredQuestionCount) ? Math.floor(requiredQuestionCount) : 0;
  if (total <= 0) return 1;
  const correct = Number.isFinite(firstTryAnswers)
    ? Math.max(0, Math.min(total, Math.floor(firstTryAnswers)))
    : 0;
  if (correct === total) return 3;
  return correct >= total - 1 ? 2 : 1;
}

const bars = (...fractions: FractionValue[]): ModelSpec => ({ kind: 'bars', bars: fractions });
const setModel = (selected: number, total: number, groupCount: number, caption?: string): ModelSpec => ({ kind: 'set', selected, total, groupCount, caption });
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
  // Every question shows a model: a typed-out equation ("1/6 + 4/6 = ?") also gets bars for its amounts.
  if (model.kind === 'equation') model = autoPicture(model.text, model.text) ?? model;
  const named = nameBars(model, prompt);
  let simpler = nameBars(simplerModel, prompt);
  // "Let's make it simpler" must stay about this question: if the question's own picture shows the fractions it names
  // and the authored help picture doesn't (a generic 1/2 bar), the help shows the question's bars, labelled.
  const aboutQuestion = (m: ModelSpec) => m.kind === 'bars' && m.bars.some((bar) => bar.named);
  if (aboutQuestion(named) && !aboutQuestion(simpler)) simpler = named;
  // Four choices (A–D): lessons list three, a fourth believable wrong answer is added (sign questions keep three).
  const withFourth = withFourthChoice({ prompt, choices, correctChoice, model: named, hint, retryFeedback, simplerModel: simpler });
  return { ...withFourth, choices: orderedWithSigns(prompt, withFourth.choices) };
}

/** Authored questions mostly listed the right answer first. Put it at a spot picked from the question id
    instead, so A, B and C are each right about as often, and it is the same spot on every visit and on paper. */
function spreadAnswer<T extends { choices: string[]; correctChoice: number }>(question: T, id: string): T {
  const spot = [...id].reduce((h, c) => (h * 33 + c.charCodeAt(0)) >>> 0, 5381) % question.choices.length;
  const right = question.choices[question.correctChoice];
  const others = question.choices.filter((_, i) => i !== question.correctChoice);
  others.splice(spot, 0, right);
  return { ...question, choices: others, correctChoice: spot };
}

function mission(seed: MissionSeed): Mission {
  const standards = standardsForMission(seed.id);
  const questions = seed.questions.map((question, index) => noBeforeYes(spreadAnswer({
    ...question,
    id: `${seed.id}-q${index + 1}`,
    isMastery: index === seed.questions.length - 1,
    standards: [...standards],
  }, `${seed.id}-q${index + 1}`)));
  return {
    ...seed,
    ...(standards.length && !seed.gradeBand ? { gradeBand: Number(standards[0][0]) as 3 | 4 | 5 } : {}),
    standards,
    questions,
  };
}

const curriculum: MissionSeed[] = [
  {
    id: 'equal-parts', unit: 1, title: 'Same whole, fair pieces', shortTitle: 'Equal parts', skill: 'A fraction names equal parts of one whole. The parts must be the same size.',
    description: 'Spot fair, equal pieces.', example: {
      prompt: 'A strip is cut into 4 pieces. When are they fourths?',
      answer: 'When all 4 pieces are the same size.',
      explanation: 'Fourths must be equal. 4 unequal pieces are not fourths.',
      model: { kind: 'partition', parts: [25, 25, 25, 25], caption: '1 whole cut into equal pieces' },
    },
    questions: [
      practice('Is this strip cut into thirds?', ['Yes, 3 equal pieces', 'No, the pieces are unequal', 'No, there are 2 pieces', 'Yes, there are 3 pieces'], 1, { kind: 'partition', parts: [50, 25, 25] }, 'Thirds are 3 pieces, all the same size. Compare the pieces.', 'One piece is twice as big as the others, so these are not thirds.', { kind: 'partition', parts: [100 / 3, 100 / 3, 100 / 3] }),
      practice('A sandwich is cut into 4 equal pieces. What is 1 piece?', ['1/3', '1/4', '4/1'], 1, bars({ numerator: 1, denominator: 4 }), 'Count all the equal pieces for the denominator.', 'The denominator is all 4 pieces. You have 1.', bars({ numerator: 1, denominator: 2 })),
      practice('This ribbon is cut into 2 pieces. Are the pieces equal halves?', ['Yes, same-size pieces', 'No, one piece is bigger', 'No, halves need 3 pieces', 'No, they are different colors'], 0, { kind: 'partition', parts: [50, 50] }, 'Halves are 2 pieces of the same size.', '2 pieces are halves only if they are the same size. These are.', { kind: 'partition', parts: [50, 50] }),
      practice('A strip has 5 equal pieces. What is 1 piece?', ['one fifth', 'one fourth', 'five wholes', 'one sixth'], 0, bars({ numerator: 1, denominator: 5 }), '1 piece out of 5 equal pieces.', '1 of 5 equal pieces is one fifth, or 1/5.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'fraction-names', unit: 1, title: 'Read a fraction', shortTitle: 'Fraction names', skill: 'The denominator, or bottom number, tells how many equal parts make one whole. The numerator, or top number, tells how many parts we count.',
    description: 'Learn what the numerator and denominator mean.', example: {
      prompt: 'In 3/5, what does each number tell you?',
      answer: 'There are 5 equal parts in all. 3 parts are counted.',
      explanation: 'The denominator is 5, so the whole has 5 equal parts. The numerator is 3, so 3 parts are counted.',
      model: bars({ numerator: 3, denominator: 5 }),
    },
    questions: [
      practice('In 2/7, what does the 7 mean?', ['7 equal parts in all', '7 parts are shaded', '7 wholes', '7 parts not shaded'], 0, bars({ numerator: 2, denominator: 7 }), 'Look at the denominator.', 'The denominator is the number of equal parts in all.', bars({ numerator: 1, denominator: 3 })),
      practice('A tray has 6 spaces. 4 have a snack. What fraction have a snack?', ['6/4', '4/6', '4/4'], 1, bars({ numerator: 4, denominator: 6 }), 'The numerator is the number of spaces with a snack. The denominator is the number of spaces in all.', 'The numerator is 4 spaces with a snack. The denominator is 6 spaces in all.', bars({ numerator: 1, denominator: 2 })),
      practice('In 5/8, how many pieces are counted?', ['8', '5', '13'], 1, bars({ numerator: 5, denominator: 8 }), 'Look at the numerator.', 'The numerator is 5. So 5 pieces are counted.', bars({ numerator: 2, denominator: 4 })),
      practice('A shape has 9 equal parts. 1 is colored. What fraction is colored?', ['1/9', '9/1', '1/8'], 0, bars({ numerator: 1, denominator: 9 }), '1 colored part out of 9.', 'The denominator is all 9 equal parts. The numerator is the 1 colored part.', bars({ numerator: 1, denominator: 4 })),
    ],
  },
  {
    id: 'unit-fractions', unit: 1, title: 'One piece at a time', shortTitle: 'Unit fractions', skill: 'A unit fraction counts one equal part. Its numerator is 1.',
    description: 'Find just 1 equal piece.', example: {
      prompt: 'What fraction is 1 of 6 equal pieces?',
      answer: '1/6',
      explanation: 'A unit fraction is just 1 piece. 1/6 is 1 of 6 pieces.',
      model: bars({ numerator: 1, denominator: 6 }),
    },
    questions: [
      practice('Which is a unit fraction?', ['3/8', '1/8', '8/1'], 1, bars({ numerator: 1, denominator: 8 }), 'A unit fraction has a numerator of 1.', 'Look for the one with a numerator of 1.', bars({ numerator: 1, denominator: 4 })),
      practice('A whole is cut into 10 equal pieces. What is 1 piece?', ['1/10', '10/1', '1/9'], 0, bars({ numerator: 1, denominator: 10 }), '10 pieces in all. You have 1.', '1 of 10 equal pieces is 1/10.', bars({ numerator: 1, denominator: 5 })),
      practice('Does this bar show 1/3?', ['Yes, 1 of 3 equal parts', 'No, 3 parts are shaded', 'No, the parts are unequal', 'No, 2 parts not shaded'], 0, bars({ numerator: 1, denominator: 3 }), '1/3 is 1 of 3 equal parts.', 'The bar has 3 equal parts and 1 is shaded. That is 1/3.', bars({ numerator: 1, denominator: 2 })),
      practice('What fraction is 1 of 12 equal tiles?', ['12/1', '1/12', '1/11'], 1, bars({ numerator: 1, denominator: 12 }), '1 tile out of 12.', '1 out of 12 equal parts is 1/12.', bars({ numerator: 1, denominator: 6 })),
    ],
  },
  {
    id: 'unit-size', unit: 2, title: 'More pieces, smaller pieces', shortTitle: 'Unit fraction size', skill: 'The denominator tells how many equal pieces make a whole. More pieces means each piece is smaller.',
    description: 'Compare 1 piece from same-size wholes.', example: {
      prompt: 'Which is bigger, 1/3 or 1/8?',
      answer: '1/3 is bigger.',
      explanation: 'A third is bigger than an eighth of the same whole.',
      model: bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 8 }),
    },
    questions: [
      practice('Which piece is bigger, 1/4 or 1/6?', ['1/6', '1/4', 'They are equal'], 1, bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 6 }), 'Cut a whole into 4. Cut another into 6. Which pieces are bigger?', 'More cuts make smaller pieces. Fourths are bigger.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is bigger, 1/9 or 1/5?', ['1/9', '1/5', 'They match'], 1, bars({ numerator: 1, denominator: 9 }, { numerator: 1, denominator: 5 }), 'Both are 1 piece. Which whole has fewer pieces?', 'Fifths are bigger. 5 pieces is fewer than 9.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is closer to one whole: 1/2 or 1/10?', ['1/10', '1/2', 'They are equally close'], 1, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 10 }), 'The bigger piece is closer to 1 whole.', '1/2 is much bigger than 1/10.', bars({ numerator: 1, denominator: 4 })),
      practice('Which is smaller: 1/3 or 1/7?', ['1/3', '1/7', 'They are the same'], 1, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 7 }), 'Which whole has more pieces?', 'Sevenths are smaller than thirds. So 1/7 is smaller.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'sets-unit-fractions', unit: 2, title: 'Fractions in a group', shortTitle: 'Fractions of sets', skill: 'Split a group into equal groups. One group is one part of the whole set.',
    description: 'Share things into equal groups.', example: {
      prompt: 'There are 12 buttons. What is 1/3 of the buttons?',
      answer: '4 buttons.',
      explanation: 'Make 3 equal groups. Each has 4. So 1/3 is 4.',
      model: setModel(4, 12, 3, '1 of 3 equal groups'),
    },
    questions: [
      practice('What is 1/4 of 12 toy cars?', ['3 cars', '4 cars', '8 cars'], 0, setModel(0, 12, 4), 'Make 4 equal groups. Count 1 group.', '12 in 4 groups is 3 each. 1 group is 3.', setModel(2, 8, 4)),
      practice('What is 1/3 of 15 beads?', ['3 beads', '5 beads', '12 beads'], 1, setModel(0, 15, 3), 'Make 3 equal groups.', '15 in 3 groups is 5 each.', setModel(3, 9, 3)),
      practice('What is 1/2 of 10 shells?', ['5 shells', '2 shells', '8 shells'], 0, setModel(0, 10, 2), 'Make 2 equal groups.', '10 in 2 groups is 5 each.', setModel(4, 8, 2)),
      practice('A class has 20 pencils. What is 1/5 of the pencils?', ['4', '5', '15'], 0, setModel(0, 20, 5), 'Make 5 equal groups. Count 1 group.', '20 in 5 groups is 4 each.', setModel(2, 10, 5)),
    ],
  },
  {
    id: 'sets-nonunit', unit: 2, title: 'More than one group', shortTitle: 'Count groups in a set', skill: 'The denominator tells how many equal groups to make. The numerator tells how many groups to count.',
    description: 'Count 2 or 3 equal groups.', example: {
      prompt: 'What is 2/5 of 15 counters?',
      answer: '6 counters.',
      explanation: 'Make 5 groups of 3. Count 2 groups: 3 + 3 = 6.',
      model: setModel(6, 15, 5, '2 of 5 equal groups'),
    },
    questions: [
      practice('What is 2/3 of 12?', ['8', '4', '9'], 0, setModel(0, 12, 3), 'Make 3 equal groups. Count 2.', '12 in 3 groups is 4 each. 2 groups is 8.', setModel(4, 12, 3)),
      practice('What is 3/4 of 8 stickers?', ['2 stickers', '6 stickers', '7 stickers'], 1, setModel(0, 8, 4), 'Make 4 equal groups. Count 3.', '8 in 4 groups is 2 each. 3 groups is 6.', setModel(4, 8, 4)),
      practice('What is 2/5 of 20 cubes?', ['8 cubes', '5 cubes', '10 cubes'], 0, setModel(0, 20, 5), 'Make 5 equal groups. Count 2.', '20 in 5 groups is 4 each. 2 groups is 8.', setModel(4, 20, 5)),
      practice('What is 3/6 of 18 buttons?', ['9 buttons', '6 buttons', '15 buttons'], 0, setModel(0, 18, 6), 'Make 6 equal groups. Count 3.', '18 in 6 groups is 3 each. 3 groups is 9.', setModel(6, 18, 6)),
    ],
  },
  {
    id: 'benchmark-half', unit: 3, title: 'Is it less or more than half?', shortTitle: 'Near one half', skill: 'Compare a fraction with 1/2. A bar or number line shows whether it is less or more than halfway.',
    description: 'Is it more or less than half?', example: {
      prompt: 'Is 3/8 more or less than 1/2?',
      answer: 'Less than 1/2.',
      explanation: 'Half of 8 is 4. 3 is less than 4.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 1, denominator: 2 }),
    },
    questions: [
      practice('Which is more than 1/2?', ['2/6', '5/8', '3/10'], 1, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 2, denominator: 6, named: true }, { numerator: 5, denominator: 8, named: true }, { numerator: 3, denominator: 10, named: true }), 'Half of 8 is 4. Is 5 more than 4?', '5/8 is more than half. The others are less.', bars({ numerator: 1, denominator: 2 })),
      practice('Is 2/5 more or less than 1/2?', ['Less than 1/2', 'Equal to 1/2', 'More than 1/2'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 1, denominator: 2 }), 'Half of 5 is 2 and a half.', '2 is less than 2 and a half. So 2/5 is less than half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is closest to 1/2?', ['4/9', '1/5', '7/8'], 0, bars({ numerator: 4, denominator: 9 }, { numerator: 1, denominator: 5 }, { numerator: 7, denominator: 8 }), 'Which one is nearest to half?', '4/9 is just under half. The others are far away.', bars({ numerator: 1, denominator: 2 })),
      practice('A jug is 6/10 full. Is that more or less than half?', ['More than half', 'Less than half', 'Exactly half'], 0, bars({ numerator: 6, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Half of 10 is 5.', '6 is more than 5. So 6/10 is more than half.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'benchmarks-zero-one', unit: 3, title: 'Near zero, half, or one?', shortTitle: 'Near 0, 1/2 or 1', skill: 'Compare a fraction with 0, 1/2, and 1. These landmarks show how much of the whole it is.',
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
      practice('A plant grew 9/10 of a meter. Is that near 0 or 1 meter?', ['0 meters', '1 meter', 'Exactly halfway', '9 meters'], 1, bars({ numerator: 9, denominator: 10 }), 'Just 1 tenth is missing.', '9/10 is almost 1 whole meter.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'fraction-magnitude', unit: 3, title: 'Fractions can be close together', shortTitle: 'Estimate size', skill: 'Use familiar landmarks like 0, 1/2, and 1 to estimate a fraction before comparing it.',
    description: 'Guess first, then check.', example: {
      prompt: 'Is 5/12 more or less than 1/2?',
      answer: 'A little less than 1/2.',
      explanation: 'Half of 12 is 6. 5 is just 1 less.',
      model: bars({ numerator: 5, denominator: 12 }, { numerator: 1, denominator: 2 }),
    },
    questions: [
      practice('Which is just a little less than 1/2?', ['4/9', '1/8', '8/9'], 0, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 4, denominator: 9, named: true }, { numerator: 1, denominator: 8, named: true }, { numerator: 8, denominator: 9, named: true }), 'Half of 9 is 4 and a half. 4 is close.', '4/9 is just under half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is a little more than 1/2?', ['3/8', '5/9', '1/6'], 1, bars({ numerator: 5, denominator: 9 }, { numerator: 1, denominator: 2 }), 'Half of 9 is 4 and a half. Which is a bit more?', '5/9 is just over half. The others are under.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is closest to 1?', ['6/7', '2/7', '3/7'], 0, bars({ numerator: 6, denominator: 7 }, { numerator: 2, denominator: 7 }, { numerator: 3, denominator: 7 }), 'Which numerator is closest to 7?', '6/7 is just 1 piece away from 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('About how much is 1/10 + 1/10 + 1/10 + 1/10 + 1/10?', ['About 1/2', 'About 1/5', 'About 1 whole', 'About 5 wholes'], 0, bars({ numerator: 5, denominator: 10 }), '5 tenths is halfway.', '5/10 is the same as 1/2.', bars({ numerator: 2, denominator: 4 })),
    ],
  },
  {
    id: 'number-line-basics', unit: 4, title: 'Build a fraction number line', shortTitle: 'Split the line', skill: 'Split the distance from 0 to 1 into equal spaces. The denominator tells the spaces in one whole.',
    description: 'Every jump is the same size.', example: {
      prompt: 'How many spaces do you need for thirds?',
      answer: '3 equal spaces.',
      explanation: 'The denominator is how many spaces from 0 to 1.',
      model: line(1, 3),
    },
    questions: [
      practice('0 to 1 has 5 equal spaces. What is 1 jump?', ['1/5', '1/4', '5/1'], 0, line(1, 5), 'Count the spaces from 0 to 1.', '5 jumps make 1 whole. So 1 jump is 1/5.', line(1, 2)),
      practice('How many spaces do you need for fourths?', ['4 spaces', '3 spaces', '5 spaces'], 0, line(2, 4), 'Fourths means 4 equal pieces.', 'Fourths need 4 spaces from 0 to 1.', line(1, 2)),
      practice('A line has 8 equal spaces. Where is 3/8?', ['3 jumps from 0', '8 jumps from 0', '3 jumps past 1', '5 jumps from 0'], 0, line(3, 8), 'Start at 0. Count 3 jumps.', 'The numerator 3 means 3 jumps.', line(1, 4)),
      practice('0 to 1 has 6 equal spaces. What is 5 jumps?', ['5/6', '6/5', '1/5'], 0, line(5, 6), 'Count 5 jumps from 0.', '5 jumps of 1/6 is 5/6.', line(2, 4)),
    ],
  },
  {
    id: 'number-line-points', unit: 4, title: 'Find the marked fraction', shortTitle: 'Read the line', skill: 'The denominator tells the equal spaces in one whole. The numerator tells the jumps from 0.',
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
    id: 'number-line-beyond-one', unit: 4, title: 'Keep going past one', shortTitle: 'Past one whole', skill: 'When the jumps pass 1 whole, keep counting the same-size spaces to show the extra part.',
    description: 'Keep counting jumps past 1.', example: {
      prompt: 'Each jump is 1/5. What is 7 jumps from 0?',
      answer: '7/5, or 1 and 2/5.',
      explanation: '5 jumps make 1 whole. 2 more jumps is 7/5.',
      model: line(7, 5, 2),
    },
    questions: [
      practice('Each jump is 1/4. What is 5 jumps from 0?', ['5/4', '4/5', '1/4'], 0, line(5, 4, 2), '4 jumps reach 1. Then 1 more.', '5 jumps is 5/4. That is 1 and 1/4.', line(3, 4)),
      practice('Each jump is 1/3. Which point is just past 1?', ['2/3', '4/3', '1/3', '3/3'], 1, line(4, 3, 2), '3 jumps of 1/3 reach 1. Take 1 more jump.', '4/3 is 1 and 1/3, just past 1.', line(2, 3)),
      practice('How many sixths make 1 and 2/6?', ['8/6', '6/8', '2/6'], 0, line(8, 6, 2), '1 whole is 6/6. Add 2 more.', '6/6 + 2/6 = 8/6.', line(6, 6)),
      practice('A runner takes 9 steps of 1/5. How far is that?', ['1 and 3/5', '9/5 = 1 and 4/5', '4/5', '9/10'], 1, line(9, 5, 2), '5 steps make 1 whole. How many are left?', '9/5 is 5/5 and 4/5. That is 1 and 4/5.', line(5, 5)),
    ],
  },
  {
    id: 'compare-same-denominator', unit: 5, title: 'Same pieces, different counts', shortTitle: 'Compare like pieces', skill: 'The same denominator means the pieces are the same size. More counted pieces make the larger fraction.',
    description: 'Compare fractions with same-size pieces.', example: {
      prompt: 'Which is bigger, 3/8 or 5/8?',
      answer: '5/8.',
      explanation: 'Both use eighths. 5 pieces is more than 3.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 5, denominator: 8 }),
    },
    questions: [
      practice('Which is bigger, 4/7 or 2/7?', ['2/7', '4/7', 'They are equal'], 1, bars({ numerator: 4, denominator: 7 }, { numerator: 2, denominator: 7 }), 'Same size pieces. Which has more?', '4 pieces is more than 2 pieces.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is smaller, 3/10 or 8/10?', ['3/10', '8/10', 'They match'], 0, bars({ numerator: 3, denominator: 10 }, { numerator: 8, denominator: 10 }), 'Both are tenths. Which has fewer?', '3 tenths is less than 8 tenths.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 6/9 __ 7/9', ['>', '<', '='], 1, bars({ numerator: 6, denominator: 9 }, { numerator: 7, denominator: 9 }), 'Same denominator. Compare 6 and 7.', '6 is less than 7. So 6/9 < 7/9.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is bigger, 5/12 or 9/12?', ['5/12', '9/12', 'They are equal'], 1, bars({ numerator: 5, denominator: 12 }, { numerator: 9, denominator: 12 }), 'Same size pieces. Count them.', '9 pieces is more than 5.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'compare-same-numerator', unit: 5, title: 'Same count, different sizes', shortTitle: 'Same numerators', skill: 'When the wholes are the same size, the same numerator means we count the same number of pieces. A larger denominator splits that whole into more equal parts, so each piece is smaller, and so is the fraction.',
    explainPrompt: 'Use the bars for 3/5 and 3/8. What does the denominator change in the same-size whole? Why is 3/8 smaller even though both fractions count 3 pieces? Then draw same-length bars for 2/3 and 2/5 and explain why 2/3 is larger without repeating the example.',
    description: 'Compare fractions with the same numerator.', example: {
      prompt: 'Which is bigger, 3/5 or 3/8?',
      answer: '3/5.',
      explanation: 'Both same-size bars count 3 pieces. Splitting the whole into 8 equal parts makes smaller pieces than splitting it into 5, so 3/8 is less than 3/5.',
      model: bars({ numerator: 3, denominator: 5 }, { numerator: 3, denominator: 8 }),
    },
    questions: [
      practice('Which is bigger, 2/3 or 2/7?', ['2/7', '2/3', 'They are equal'], 1, bars({ numerator: 2, denominator: 3 }, { numerator: 2, denominator: 7 }), 'On the same-size whole, both count 2 pieces. Seven equal parts make smaller pieces than three, so 2/7 is smaller.', 'Both count 2 pieces from the same-size whole. Each third is bigger than each seventh, so 2/3 is bigger.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is smaller, 4/5 or 4/9?', ['4/5', '4/9', 'They are equal'], 1, bars({ numerator: 4, denominator: 5 }, { numerator: 4, denominator: 9 }), 'Both count 4 pieces from the same-size whole. The larger denominator, 9, makes smaller pieces.', 'Both count 4 pieces from the same-size whole. Ninths are smaller than fifths, so 4/9 is less than 4/5.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 1/6 __ 1/4', ['>', '<', '='], 1, bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 4 }), 'On the same-size whole, six equal parts are smaller than four equal parts.', 'One sixth is smaller than one fourth, so 1/6 < 1/4.', bars({ numerator: 1, denominator: 2 })),
      practice('Which covers more: 3/10 or 3/8?', ['3/10', '3/8', 'They cover the same'], 1, bars({ numerator: 3, denominator: 10 }, { numerator: 3, denominator: 8 }), 'On the same-size whole, both count 3 pieces. Eighths are larger because 8 parts are fewer than 10.', 'Each eighth is larger than each tenth. With 3 pieces counted from the same-size whole, 3/8 covers more than 3/10.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'order-fractions', unit: 5, title: 'Put fractions in order', shortTitle: 'Order fractions', skill: 'Compare the amounts, then put them from smallest to largest or largest to smallest.',
    description: 'Compare amounts, not just numbers.', example: {
      prompt: 'Put 1/4, 3/4 and 1/2 in order, smallest first.',
      answer: '1/4, 1/2, 3/4',
      explanation: 'Use 1/2 as a halfway landmark. 1/4 is less than half and 3/4 is more, so the order is 1/4, 1/2, 3/4.',
      model: bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 2 }, { numerator: 3, denominator: 4 }),
    },
    questions: [
      practice('Which order goes smallest to biggest?', ['1/3, 2/3, 3/3', '3/3, 2/3, 1/3', '2/3, 1/3, 3/3'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }, { numerator: 3, denominator: 3 }), 'All thirds. Count the pieces.', '1/3 is smallest. 3/3 is 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('Which order goes biggest to smallest?', ['1/2, 1/4, 1/5', '1/5, 1/4, 1/2', '1/4, 1/2, 1/5'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 4 }, { numerator: 1, denominator: 5 }), 'Each fraction counts 1 piece. The larger denominator makes a smaller piece.', '1/2 is biggest, then 1/4, then 1/5.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fits between 2/8 and 6/8?', ['1/8', '4/8', '7/8'], 1, bars({ numerator: 2, denominator: 8 }, { numerator: 6, denominator: 8 }), 'All eighths. Which numerator is between 2 and 6?', '4 is between 2 and 6.', bars({ numerator: 1, denominator: 2 })),
      practice('Put 1/2, 3/10 and 8/10 in order, smallest first.', ['3/10, 1/2, 8/10', '8/10, 1/2, 3/10', '1/2, 3/10, 8/10'], 0, bars({ numerator: 3, denominator: 10 }, { numerator: 1, denominator: 2 }, { numerator: 8, denominator: 10 }), '1/2 is the same as 5/10. Compare to that.', '3/10 is less than half. 8/10 is more.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'equivalent-models', unit: 6, title: 'Same amount, new name', shortTitle: 'See equivalence', skill: 'Equivalent fractions can look different but name the same amount. Splitting every piece keeps the whole amount unchanged.',
    description: 'Find fractions that match.', example: {
      prompt: 'How can 1/2 and 2/4 be the same?',
      answer: 'Cut each half into 2 pieces.',
      explanation: 'Now there are 4 pieces. 2 are shaded.',
      model: bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }),
    },
    questions: [
      practice('Which fraction covers the same amount as 1/2?', ['2/4', '1/4', '3/4'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }), 'Which bar is shaded just as far?', '2/4 covers the same as 1/2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 2/3?', ['4/6', '3/6', '2/6'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }), 'Cut each third into 2 pieces.', 'Double the numerator and denominator: 2/3 = 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 3/4?', ['6/8', '3/8', '4/8'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 }), 'Cut each fourth into 2 pieces.', '3/4 and 6/8 are the same amount.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 2/5?', ['4/10', '2/10', '5/2'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 10 }), 'Multiply the numerator and denominator by the same number.', 'Double both: 2/5 = 4/10.', bars({ numerator: 1, denominator: 2 })),
      practice('You fold a paper strip in half, then fold it in half again. You shade 1 of the 2 halves. Which fraction names the same shaded amount?', ['2/4', '1/4', '1/3'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }), 'Folding again cuts each half into 2 equal pieces. How many fourths are shaded?', 'The second fold cuts the shaded half into 2 fourths: 1/2 = 2/4.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'build-equivalents', unit: 6, title: 'Make a matching fraction', shortTitle: 'Make a match', skill: 'Multiply the numerator and denominator by the same amount. That changes the piece size, not the fraction’s value.',
    description: 'New name, same amount.', example: {
      prompt: 'Double the numerator and denominator of 2/3. What do you get?',
      answer: '4/6',
      explanation: 'Cut each third in half. 2/3 becomes 4/6.',
      model: bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }),
    },
    questions: [
      practice('Multiply the numerator and denominator of 1/4 by 3. What do you get?', ['3/12', '1/12', '4/3'], 0, bars({ numerator: 1, denominator: 4 }), 'Do the same thing to the numerator and denominator.', '1 × 3 = 3 and 4 × 3 = 12. So 3/12.', bars({ numerator: 1, denominator: 2 })),
      practice('Double the numerator and denominator of 3/5. What do you get?', ['6/10', '3/10', '5/6'], 0, bars({ numerator: 3, denominator: 5 }, { numerator: 6, denominator: 10 }), 'Double the numerator and denominator.', '3 × 2 = 6 and 5 × 2 = 10. So 6/10.', bars({ numerator: 1, denominator: 2 })),
      practice('Divide the numerator and denominator of 4/8 by 4. What do you get?', ['1/2', '1/8', '4/4'], 0, bars({ numerator: 4, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Divide both by 4.', '4 ÷ 4 = 1 and 8 ÷ 4 = 2. So 1/2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 5/10?', ['1/2', '1/5', '5/5'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 1, denominator: 2 }), 'Can you divide both by the same number?', 'Divide both by 5. You get 1/2.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'missing-equivalent', unit: 6, title: 'Find the missing number', shortTitle: 'Missing parts', skill: 'Equivalent fractions keep the same amount. Whatever factor changes the denominator must also change the numerator.',
    description: 'Fill the blank. Keep it the same amount.', example: {
      prompt: 'Fill the blank: 2/3 = ?/6',
      answer: '4/6',
      explanation: 'The denominator doubled, 3 to 6. Double the numerator too: 2 to 4.',
      model: bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }),
    },
    questions: [
      practice('Fill the blank: 1/2 = ?/8', ['4', '2', '1'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 8 }), 'What times 2 makes 8?', 'The denominator was multiplied by 4. Do the same to the numerator.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: 3/4 = 6/?', ['8', '12', '10'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 }), 'The numerator was doubled.', 'Double the denominator too: 4 × 2 = 8.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: ?/10 = 2/5', ['4', '2', '5'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 10 }), 'The denominator doubled, 5 to 10.', 'Double the numerator too: 2 to 4.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: 4/6 = 2/?', ['3', '6', '4'], 0, bars({ numerator: 4, denominator: 6 }, { numerator: 2, denominator: 3 }), 'The numerator was cut in half.', 'Halve the denominator too: 6 ÷ 2 = 3.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'compose-to-one', unit: 7, title: 'Put pieces together', shortTitle: 'Make 1 whole', skill: 'Pieces with the same denominator are the same size. Put enough together to fill one whole.',
    description: 'Add pieces until you have 1 whole.', example: {
      prompt: 'How many 1/4 pieces make 1 whole?',
      answer: '4 pieces: 4/4 = 1.',
      explanation: '4 fourths make 1 whole.',
      model: bars({ numerator: 4, denominator: 4 }),
    },
    questions: [
      practice('How many 1/5 pieces make 1 whole?', ['5 pieces', '4 pieces', '10 pieces'], 0, bars({ numerator: 5, denominator: 5 }), 'The denominator is how many pieces make 1 whole.', '5 fifths make 1 whole: 5/5 = 1.', bars({ numerator: 2, denominator: 4 })),
      practice('Which sum makes 1 whole?', ['1/3 + 2/3', '1/4 + 1/4', '2/5 + 1/5'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }), 'Look for numerators that add up to the denominator.', '1/3 + 2/3 = 3/3. That is 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('What is 2/8 + 6/8?', ['8/8 = 1', '8/16', '4/8', '6/8'], 0, bars({ numerator: 2, denominator: 8 }, { numerator: 6, denominator: 8 }), 'Add the numerators. Keep eighths.', '2 + 6 = 8. 8/8 is 1 whole.', bars({ numerator: 1, denominator: 2 })),
      practice('A recipe uses 3/6 cup, then 3/6 cup more. How much in all?', ['6/6 = 1 cup', '6/12 cup', '3/6 cup', '6/3 cup'], 0, bars({ numerator: 3, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Add the numerators. How many sixths fill 1 cup?', '3 + 3 = 6. 6/6 is 1 cup.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'decompose-fractions', unit: 7, title: 'Break a fraction apart', shortTitle: 'Break apart', skill: 'Break the counted pieces into smaller groups. Keep the piece size the same.',
    description: 'Show one amount in different ways.', example: {
      prompt: 'Split 5/6 into two parts. Keep sixths.',
      answer: '2/6 + 3/6 = 5/6.',
      explanation: 'Keep the sixths. Split 5 pieces into 2 and 3.',
      model: bars({ numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }, { numerator: 5, denominator: 6 }),
    },
    questions: [
      practice('Which sum equals 4/7?', ['1/7 + 3/7', '1/7 + 2/7', '4/7 + 4/7'], 0, bars({ numerator: 1, denominator: 7 }, { numerator: 3, denominator: 7 }), 'Add the numerators. Keep sevenths.', '1 + 3 = 4. So 4/7.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: 6/8 = 2/8 + ?/8', ['4', '3', '8'], 0, bars({ numerator: 6, denominator: 8 }, { numerator: 2, denominator: 8 }), '6 take away 2 is what?', '6 − 2 = 4. So 2/8 + 4/8 = 6/8.', bars({ numerator: 1, denominator: 2 })),
      practice('Which adds up to 3/5?', ['1/5 + 2/5', '1/5 + 1/5', '3/5 + 2/5'], 0, bars({ numerator: 1, denominator: 5 }, { numerator: 2, denominator: 5 }), 'Add the numerators.', '1 + 2 = 3. So 3/5.', bars({ numerator: 1, denominator: 2 })),
      practice('7/10 = 5/10 + what?', ['2/10', '3/10', '5/10'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 2, denominator: 10 }), '7 take away 5 is what?', '7 − 5 = 2. So 2/10.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'improper-fractions', unit: 7, title: 'More than one whole', shortTitle: 'Past a whole', skill: 'When the numerator is greater than the denominator, the fraction is at least one whole. It may have extra pieces too.',
    description: 'Keep counting pieces past 1 whole.', example: {
      prompt: 'What is 7/4 as wholes and a fraction?',
      answer: '1 and 3/4.',
      explanation: '4/4 is 1 whole. 3/4 is left over.',
      model: { kind: 'bars', bars: [{ numerator: 4, denominator: 4 }, { numerator: 3, denominator: 4 }], caption: '7/4 is 1 whole and 3/4' },
    },
    questions: [
      practice('What is 5/3 as wholes and a fraction?', ['1 and 2/3', '2 and 1/3', '5 and 3', '2 and 2/3'], 0, line(5, 3, 2), '3/3 is 1 whole. How many are left?', '5/3 is 3/3 and 2/3. That is 1 and 2/3.', line(3, 3, 2)),
      practice('What is 2 and 1/5 as fifths?', ['11/5', '7/5', '2/5'], 0, line(11, 5, 3), '2 wholes is 10/5. Add 1 more.', '10/5 + 1/5 = 11/5.', line(5, 5, 2)),
      practice('What is 1 and 2/4 as fourths?', ['6/4', '3/4', '4/6'], 0, line(6, 4, 2), '1 whole is 4/4. Add 2 more.', '4 + 2 = 6. So 6/4.', line(4, 4, 2)),
      practice('Which is more than 1 whole?', ['9/8', '7/8', '1/8'], 0, line(9, 8, 2), '8/8 is exactly 1 whole.', '9/8 is 1 piece more than a whole.', line(8, 8, 2)),
    ],
  },
  {
    id: 'mixed-improper', unit: 7, title: 'Two ways to write it', shortTitle: 'Two ways to name it', skill: 'A whole number and leftover fraction can be written as one fraction. For example, 7/4 is 1 whole and 3/4.',
    description: 'Swap pieces for wholes, and back again.', example: {
      prompt: 'What is 1 and 3/8 as eighths?',
      answer: '11/8.',
      explanation: '1 whole is 8/8. Add 3 more: 11/8.',
      model: { kind: 'bars', bars: [{ numerator: 8, denominator: 8 }, { numerator: 3, denominator: 8 }], caption: '1 whole and 3/8' },
    },
    questions: [
      practice('What is 1 and 2/3 as thirds?', ['5/3', '3/5', '4/3'], 0, line(5, 3, 2), '1 whole is 3/3. Add 2 more.', '3/3 + 2/3 = 5/3.', line(3, 3, 2)),
      practice('What is 9/4 as wholes and a fraction?', ['2 and 1/4', '3 and 1/4', '2 and 2/4'], 0, line(9, 4, 3), 'Every 4/4 is 1 whole. What is left?', '8/4 is 2 wholes. 1/4 is left.', line(8, 4, 2)),
      practice('What is 2 and 3/5 as fifths?', ['13/5', '10/5', '5/13'], 0, line(13, 5, 3), '2 wholes is 10/5. Add 3 more.', '10/5 + 3/5 = 13/5.', line(10, 5, 2)),
      practice('What is 10/6 as wholes and a fraction?', ['1 and 4/6', '1 and 2/6', '2 and 4/6'], 0, line(10, 6, 2), '6/6 is 1 whole. What is left?', '10/6 is 6/6 and 4/6. That is 1 and 4/6.', line(6, 6, 2)),
    ],
  },
  {
    id: 'add-like-denominators', unit: 8, title: 'Add same-size pieces', shortTitle: 'Add fractions', skill: 'When the pieces are the same size, add how many pieces you have. Keep the denominator because the piece size stays the same.',
    description: 'Add pieces that are the same size.', example: {
      prompt: 'What is 2/7 + 3/7?',
      answer: '5/7.',
      explanation: '2 sevenths + 3 sevenths = 5 sevenths.',
      model: bars({ numerator: 2, denominator: 7 }, { numerator: 3, denominator: 7 }, { numerator: 5, denominator: 7 }),
    },
    questions: [
      practice('What is 1/6 + 4/6?', ['5/6', '5/12', '1/6'], 0, equation('1/6 + 4/6 = ?'), 'Add the numerators. Keep sixths.', '1 + 4 = 5. The denominator stays 6.', bars({ numerator: 1, denominator: 6 })),
      practice('What is 3/8 + 2/8?', ['5/8', '5/16', '6/8'], 0, equation('3/8 + 2/8 = ?'), 'Add the numerators. Keep eighths.', '3 + 2 = 5. The denominator stays 8.', bars({ numerator: 2, denominator: 8 })),
      practice('Maya walked 2/10 mile, then 5/10 mile. How far in all?', ['7/10 mile', '7/20 mile', '3/10 mile'], 0, bars({ numerator: 2, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Add the numerators. Keep tenths.', '2 + 5 = 7. So 7/10 mile.', bars({ numerator: 2, denominator: 10 })),
      practice('What is 4/9 + 3/9?', ['7/9', '7/18', '1/9'], 0, equation('4/9 + 3/9 = ?'), 'Add the numerators. Keep ninths.', '4 + 3 = 7. So 7/9.', bars({ numerator: 3, denominator: 9 })),
    ],
  },
  {
    id: 'subtract-like-denominators', unit: 8, title: 'Take pieces away', shortTitle: 'Subtract fractions', skill: 'When the pieces are the same size, subtract how many pieces remain. Keep the denominator because the piece size stays the same.',
    description: 'Take away same-size pieces.', example: {
      prompt: 'What is 6/8 − 2/8?',
      answer: '4/8.',
      explanation: 'Start with 6 eighths. Take away 2. 4 eighths are left.',
      model: bars({ numerator: 6, denominator: 8 }, { numerator: 4, denominator: 8 }),
    },
    questions: [
      practice('What is 5/7 − 2/7?', ['3/7', '3/14', '7/7'], 0, equation('5/7 − 2/7 = ?'), 'Take away 2 pieces. Keep sevenths.', '5 − 2 = 3. The denominator stays 7.', bars({ numerator: 5, denominator: 7 })),
      practice('A jug is 9/10 full. You pour out 4/10. How much is left?', ['5/10', '5/20', '13/10'], 0, bars({ numerator: 9, denominator: 10 }, { numerator: 4, denominator: 10 }), 'Take away the numerators. Keep tenths.', '9 − 4 = 5. So 5/10.', bars({ numerator: 4, denominator: 10 })),
      practice('What is 7/8 − 3/8?', ['4/8', '4/16', '10/8'], 0, equation('7/8 − 3/8 = ?'), 'Take away the numerators. Keep eighths.', '7 − 3 = 4. So 4/8.', bars({ numerator: 6, denominator: 8 })),
      practice('What is 6/9 − 1/9?', ['5/9', '5/18', '7/9'], 0, equation('6/9 − 1/9 = ?'), 'Take away 1 piece. Keep ninths.', '6 − 1 = 5. So 5/9.', bars({ numerator: 6, denominator: 9 })),
    ],
  },
  {
    id: 'add-related-fractions', unit: 8, title: 'Rename, then add', shortTitle: 'Add different names', skill: 'Rename the fractions as the same-size pieces. Then add the pieces you have.',
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
    id: 'tenths-decimals', unit: 8, title: 'Tenths as decimals', shortTitle: 'Fractions and decimals', skill: 'One tenth is 0.1. Write tenths as one digit to the right of the decimal point.',
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
    id: 'hundredths-decimals', unit: 8, title: 'Hundredths and place value', shortTitle: 'Hundredths', skill: 'One hundredth is 0.01. Write hundredths with two digits to the right of the decimal point.',
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
  {
    id: 'add-tenths-hundredths', unit: 8, title: 'Add tenths and hundredths', shortTitle: 'Tenths + hundredths', skill: 'Rename tenths as hundredths so the pieces match. Then add the hundredths.',
    description: 'Add 3/10 + 4/100.', example: {
      prompt: 'What is 3/10 + 4/100?',
      answer: '34/100, or 0.34.',
      explanation: 'Each tenth is 10 hundredths, so 3/10 = 30/100. 30/100 + 4/100 = 34/100.',
      model: bars({ numerator: 3, denominator: 10 }, { numerator: 4, denominator: 100 }),
    },
    questions: [
      practice('Change 6/10 into hundredths.', ['6/100', '60/100', '16/100'], 1, bars({ numerator: 6, denominator: 10 }), 'Each tenth is 10 hundredths.', '6 × 10 = 60. So 6/10 = 60/100.', bars({ numerator: 1, denominator: 10 })),
      practice('What is 3/10 + 4/100?', ['34/100', '7/110', '7/100'], 0, bars({ numerator: 3, denominator: 10 }, { numerator: 4, denominator: 100 }), 'Change 3/10 into hundredths first.', '3/10 = 30/100. 30 + 4 = 34. So 34/100.', bars({ numerator: 1, denominator: 10 })),
      practice('What is 2/10 + 15/100?', ['17/100', '35/100', '17/110'], 1, bars({ numerator: 2, denominator: 10 }, { numerator: 15, denominator: 100 }), 'Change 2/10 into hundredths first.', '2/10 = 20/100. 20 + 15 = 35. So 35/100.', bars({ numerator: 1, denominator: 10 })),
      practice('A ribbon is 4/10 m. Another is 25/100 m. How long are they together?', ['29/100 m', '65/100 m', '29/110 m'], 1, bars({ numerator: 4, denominator: 10 }, { numerator: 25, denominator: 100 }), 'Change 4/10 into hundredths.', '4/10 = 40/100. 40 + 25 = 65. So 65/100 m, or 0.65 m.', bars({ numerator: 1, denominator: 10 })),
    ],
  },
];

type ExtensionMode =
  | 'simplify' | 'equivalent' | 'compare' | 'order' | 'subtract-unlike'
  | 'mixed-add' | 'mixed-subtract' | 'quantity' | 'multiply-whole' | 'multiply'
  | 'sets' | 'divide' | 'measure' | 'measure-add' | 'share' | 'quotient'
  | 'probability' | 'area' | 'line' | 'recipe' | 'percent' | 'percent-inverse'
  | 'decimal-equivalent' | 'story' | 'whole-fraction' | 'decimal-compare' | 'unit-multiples' | 'ruler'
  | 'line-plot' | 'line-plot-read' | 'line-plot-level' | 'measure-context' | 'add-unlike' | 'mixed-unlike'
  | 'estimate' | 'fractional-area' | 'scaling' | 'mixed-multiply' | 'unit-divided-whole' | 'unit-conversion'
  | 'whole-from-part' | 'mistake' | 'remainder' | 'divide-fractions';
type ExtensionTopic = {
  id: string; unit: number; title: string; shortTitle: string; description: string; skill: string;
  mode: ExtensionMode; n: number; d: number; context: string;
  gradeBand?: 3 | 4 | 5; standards?: string[]; enrichment?: boolean;
  learningIntro?: Mission['learningIntro'];
  /** A worked example of its own, when the lesson's first build ("make the whole") would not show the answer. */
  example?: Mission['example'];
};

const extensionTopics: ExtensionTopic[] = [
  // Grade 4 (4.NF.4a, 4.NF.4b): ends unit 8, so grade-4 learners (and the level quiz) reach it before grade 5.
  { id: 'unit-fraction-multiples', unit: 8, title: 'Make groups of a unit fraction', shortTitle: 'Unit fraction multiples', description: 'Build several copies of one unit fraction.', skill: 'A multiple is several equal copies added together. Count how many unit-fraction pieces you have.', mode: 'unit-multiples', n: 5, d: 4, context: 'paper strips', gradeBand: 4, standards: ['4.NF.4a'] },
  { id: 'multiply-whole-by-fraction', unit: 8, title: 'Groups of a fraction', shortTitle: 'Whole × fraction', description: '3 groups of 1/2.', skill: 'To find several groups of a fraction, count that fraction once for each group. The piece size stays the same.', mode: 'multiply-whole', n: 2, d: 3, context: 'juice bottles' },
  { id: 'simplify-fractions', unit: 9, title: 'Simplest form', shortTitle: 'Simplest form', description: 'Use bigger pieces. Same amount.', skill: 'Divide the numerator and denominator by the same factor. The pieces get bigger, but the total amount stays the same.', mode: 'simplify', n: 3, d: 4, context: 'paper strip' },
  { id: 'equivalent-missing-both', unit: 9, title: 'Find the missing number', shortTitle: 'Equivalent fractions', description: 'Fill a blank in the numerator or denominator.', skill: 'Equivalent fractions name the same amount. Multiply or divide the numerator and denominator by the same factor.', mode: 'equivalent', n: 2, d: 5, context: 'recipe card' },
  { id: 'whole-numbers-as-fractions', unit: 9, title: 'Wholes as fractions', shortTitle: 'Whole numbers as fractions', description: 'Build one or more wholes from unit fractions.', skill: 'The denominator tells how many pieces fill one whole. Count that many pieces for each whole.', mode: 'whole-fraction', n: 6, d: 3, context: 'fraction bars', gradeBand: 3, standards: ['3.NF.3c'] },
  { id: 'compare-unlike-fractions', unit: 9, title: 'Compare different pieces', shortTitle: 'Compare unlike parts', description: 'Which is bigger when the denominators differ?', skill: 'Make the pieces the same size by using a common denominator. Then compare how many pieces each fraction has.', mode: 'compare', n: 2, d: 3, context: 'race track' },
  { id: 'order-unlike-fractions', unit: 9, title: 'Order different pieces', shortTitle: 'Order unlike parts', description: 'Put 3 fractions in order.', skill: 'Use 1/2 as a landmark or rename the fractions with the same denominator. Then order their amounts.', learningIntro: {
      goal: 'Put fractions from smallest to biggest or biggest to smallest.',
      process: 'First compare each fraction to 1/2. If that is not enough, rename them with the same denominator, then compare the numerators.',
      why: 'The same denominator means equal-size pieces. More of those pieces makes a greater amount.',
    },
    example: {
      prompt: 'Order 1/4, 3/8 and 5/8 from smallest to biggest.',
      answer: '1/4 < 3/8 < 5/8',
      explanation: 'First compare with 1/2: 1/4 and 3/8 are below it, and 5/8 is above it. To compare 1/4 and 3/8, rename 1/4 as 2/8. Eighths are the same-size pieces, and 2/8 is less than 3/8. So the order is 1/4, 3/8, 5/8.',
      model: { kind: 'bars', bars: [
        { numerator: 1, denominator: 4, named: true },
        { numerator: 2, denominator: 8, named: true },
        { numerator: 3, denominator: 8, named: true },
        { numerator: 1, denominator: 2, named: true },
        { numerator: 2, denominator: 4, named: true },
        { numerator: 5, denominator: 8, named: true },
      ] },
      numberLine: {
        points: [
          { numerator: 1, denominator: 4 },
          { numerator: 3, denominator: 8 },
          { numerator: 5, denominator: 8 },
        ],
        benchmark: { numerator: 1, denominator: 2 },
        equivalentNames: [
          { fraction: { numerator: 2, denominator: 8 }, equivalentTo: { numerator: 1, denominator: 4 } },
          { fraction: { numerator: 2, denominator: 4 }, equivalentTo: { numerator: 1, denominator: 2 } },
        ],
      },
    },
    mode: 'order', n: 1, d: 5, context: 'hiking trail' },
  { id: 'subtract-unlike-fractions', unit: 10, title: 'Take away different pieces', shortTitle: 'Subtract unlike parts', description: 'Rename, then take away.', skill: 'First rename both fractions with the same denominator so the pieces match. Then subtract the number of pieces.', mode: 'subtract-unlike', n: 3, d: 4, context: 'water bottle' },
  { id: 'add-unlike-fractions', unit: 10, title: 'Add unlike fractions', shortTitle: 'Add unlike parts', description: 'Make different-sized pieces the same size before adding.', skill: 'Rename both fractions with the same denominator so the pieces match. Then add the number of pieces.', mode: 'add-unlike', n: 7, d: 12, context: 'ribbons', gradeBand: 5, standards: ['5.NF.1'] },
  { id: 'add-mixed-numbers', unit: 10, title: 'Add mixed numbers', shortTitle: 'Add mixed numbers', description: 'Add wholes and pieces.', skill: 'Add the whole numbers and the fraction pieces. If the pieces fill a whole, regroup them as one more whole.', mode: 'mixed-add', n: 1, d: 4, context: 'walking route' },
  { id: 'subtract-mixed-numbers', unit: 10, title: 'Subtract mixed numbers', shortTitle: 'Subtract mixed numbers', description: 'Trade a whole when you need more pieces.', skill: 'If there are not enough fraction pieces to subtract, trade 1 whole for equal-size pieces.', mode: 'mixed-subtract', n: 1, d: 3, context: 'fabric roll' },
  { id: 'fraction-of-quantity', unit: 10, title: 'A fraction of a number', shortTitle: 'Fractions of amounts', description: 'Find 3/5 of 20.', skill: 'Split the amount into equal groups using the denominator. Count the number of groups shown by the numerator.', mode: 'quantity', n: 3, d: 5, context: 'classroom supplies' },
  { id: 'mixed-unlike-operations', unit: 10, title: 'Mixed numbers with unlike parts', shortTitle: 'Mixed number operations', description: 'Add or subtract mixed numbers with different denominators.', skill: 'Rename the fraction pieces so they are the same size. Then add or subtract, regrouping a whole if needed.', mode: 'mixed-unlike', n: 25, d: 12, context: 'walking route', gradeBand: 5, standards: ['5.NF.1'] },
  { id: 'estimate-fraction-operations', unit: 10, title: 'Estimate to check', shortTitle: 'Estimate fraction sums', description: 'Use 0, 1/2 and 1 to check whether an answer makes sense.', skill: 'Compare each fraction with 0, 1/2, or 1. Use those landmarks to check whether the answer is a sensible size.', mode: 'estimate', n: 9, d: 10, context: 'trail lengths', gradeBand: 5, standards: ['5.NF.2'] },
  { id: 'multiply-fractions', unit: 11, title: 'A part of a part', shortTitle: 'Fraction × fraction', description: 'Find 1/2 of 3/4.', skill: 'To find a part of a part, split the pieces again. Multiply the numerators and the denominators.', mode: 'multiply', n: 2, d: 3, context: 'garden plot' },
  { id: 'fraction-of-collection', unit: 11, title: 'A fraction of a group', shortTitle: 'Groups of objects', description: 'Find 3/4 of 16 cards.', skill: 'Split the collection into equal groups using the denominator. Count the groups shown by the numerator.', mode: 'sets', n: 3, d: 4, context: 'sports cards' },
  { id: 'divide-whole-by-unit-fraction', unit: 11, title: 'How many pieces fit?', shortTitle: 'Divide by a fraction', description: 'How many 1/4 cups fill 2 cups?', skill: 'The denominator tells how many equal pieces fit in one whole. Count those pieces in the amount.', mode: 'divide', n: 1, d: 4, context: 'measuring cup' },
  { id: 'multiplication-scaling', unit: 11, title: 'Scaling with fractions', shortTitle: 'Scale an amount', description: 'See how a factor below or above one changes an amount.', skill: 'Multiplying by less than 1 takes part of an amount, so it gets smaller. Multiplying by more than 1 makes more than one copy, so it gets bigger.', mode: 'scaling', n: 3, d: 4, context: 'collections', gradeBand: 5, standards: ['5.NF.5'] },
  { id: 'multiply-mixed-numbers', unit: 11, title: 'Multiply mixed numbers', shortTitle: 'Mixed number multiplication', description: 'Use a rectangle to find the area of a mixed-number garden.', skill: 'Use the side lengths as rows and columns in a rectangle. The number of square units is the product of the side lengths.', mode: 'mixed-multiply', n: 2, d: 1, context: 'garden plot', gradeBand: 5, standards: ['5.NF.6'] },
  { id: 'unit-fraction-divided-whole', unit: 11, title: 'Share a unit fraction', shortTitle: 'Divide a unit fraction', description: 'Split one unit fraction into equal shares.', skill: 'Share the unit fraction equally. Each share is a smaller piece of the original whole.', mode: 'unit-divided-whole', n: 1, d: 12, context: 'pan of brownies', gradeBand: 5, standards: ['5.NF.7a'] },
  { id: 'fraction-of-length', unit: 12, title: 'A fraction of a length', shortTitle: 'Fractional lengths', description: 'Find 3/8 of a ribbon.', skill: 'Split the whole length into equal parts using the denominator. Measure the number of parts shown by the numerator.', mode: 'measure', n: 3, d: 8, context: 'ribbon' },
  { id: 'fractional-measure-addition', unit: 12, title: 'Add lengths', shortTitle: 'Measure together', description: 'Add 1/2 meter and 1/4 meter.', skill: 'Rename the lengths as the same-size pieces. Then add them and keep the unit.', mode: 'measure-add', n: 1, d: 2, context: 'wooden boards' },
  { id: 'ruler-measurement', unit: 12, title: 'Measure with fractional inches', shortTitle: 'Read a ruler', description: 'Use equal ruler marks to name a length.', skill: 'The spaces between ruler marks are equal fractions of an inch. Count the spaces to measure.', mode: 'ruler', n: 5, d: 4, context: 'ruler', gradeBand: 3, standards: ['3.MD.4'] },
  { id: 'build-line-plots', unit: 12, title: 'Build a fraction line plot', shortTitle: 'Build line plots', description: 'Place one X for each measurement.', skill: 'Place one X for each measurement above its matching value. Stack Xs when measurements match.', mode: 'line-plot', n: 3, d: 4, context: 'ribbon lengths', gradeBand: 3, standards: ['3.MD.4'] },
  { id: 'read-line-plots', unit: 12, title: 'Read a fraction line plot', shortTitle: 'Read line plots', description: 'Use line-plot marks to compare measurements.', skill: 'Read the labels to find each measurement. Then compare them or find how far apart they are.', mode: 'line-plot-read', n: 5, d: 8, context: 'pencil lengths', gradeBand: 4, standards: ['4.MD.4'] },
  { id: 'line-plot-leveling', unit: 12, title: 'Use line plots to share amounts', shortTitle: 'Reason with line plots', description: 'Use data to find a total and make equal shares.', skill: 'Add the measurements to find the total. Divide that total into equal shares.', mode: 'line-plot-level', n: 3, d: 4, context: 'beaker amounts', gradeBand: 5, standards: ['5.MD.2'] },
  { id: 'measurement-word-problems', unit: 12, title: 'Fractions in measurement stories', shortTitle: 'Measurement stories', description: 'Use fractions with length, time, money, mass and volume.', skill: 'Keep the measurement unit in your answer. Convert units before comparing or calculating.', mode: 'measure-context', n: 3, d: 4, context: 'measurement stories', gradeBand: 4, standards: ['4.MD.2'] },
  { id: 'fractional-unit-conversions', unit: 12, title: 'Convert fraction units', shortTitle: 'Fraction unit conversions', description: 'Find a fractional amount in a smaller unit.', skill: 'Convert the whole measurement to smaller units first. Then find the fraction of that amount.', mode: 'unit-conversion', n: 3, d: 4, context: 'measuring tools', gradeBand: 5, standards: ['5.MD.1'] },
  { id: 'fractional-sharing', unit: 12, title: 'Fair shares', shortTitle: 'Fair sharing', description: 'Share 3 loaves with 4 friends.', skill: 'Share the total equally. The amount each friend gets is the total divided by the number of friends.', mode: 'share', n: 3, d: 4, context: 'loaf of bread' },
  { id: 'fraction-as-division', unit: 12, title: 'Division is a fraction', shortTitle: 'Fraction quotient', description: '5 ÷ 4 = 5/4.', skill: 'A fraction bar means division. The numerator is divided by the denominator.', mode: 'quotient', n: 5, d: 4, context: 'pizzas' },
  { id: 'fraction-probability', unit: 13, title: 'Bonus: Chance as a fraction', shortTitle: 'Bonus probability', description: 'What is the chance of blue?', skill: 'The numerator counts the outcomes you want. The denominator counts all equally likely outcomes.', mode: 'probability', n: 2, d: 8, context: 'color spinner', enrichment: true },
  { id: 'fraction-of-area', unit: 13, title: 'Fractions in shapes', shortTitle: 'Equal-area partitions', description: 'Explore equal-area parts in squares, rectangles, circles and hexagons.', skill: 'Fraction pieces must have equal areas. Their shapes may look different, but each piece must cover the same amount of space.', mode: 'area', n: 3, d: 8, context: 'shape tiles', gradeBand: 3, standards: ['3.G.2'] },
  { id: 'fractional-side-area', unit: 13, title: 'Area with fractional sides', shortTitle: 'Fractional side area', description: 'Use a grid to find the area when both side lengths are fractions.', skill: 'A rectangle’s area is its side lengths multiplied. Count the small squares to see the fractional area.', mode: 'fractional-area', n: 1, d: 2, context: 'rectangle grid', gradeBand: 5, standards: ['5.NF.4b'] },
  { id: 'equivalent-number-line', unit: 13, title: 'Same spot, new name', shortTitle: 'Line equivalence', description: '2/3 and 4/6 land on the same spot.', skill: 'Split every space into the same number of smaller spaces. The jumps change too, so the point stays in the same place.', mode: 'line', n: 2, d: 3, context: 'number line' },
  { id: 'fraction-recipes', unit: 13, title: 'Recipe fractions', shortTitle: 'Recipe fractions', description: 'Double a recipe.', skill: 'To double a recipe, use twice as much of every ingredient. Add each amount to itself.', mode: 'recipe', n: 3, d: 4, context: 'pancake recipe' },
  { id: 'fractions-to-percent', unit: 14, title: 'Bonus: Fractions to percent', shortTitle: 'Bonus percent', description: 'Write 3/4 as 75%.', skill: 'Percent means out of 100. Rename the fraction in hundredths to find the percent.', mode: 'percent', n: 3, d: 4, context: 'school survey', enrichment: true },
  { id: 'percent-to-fraction', unit: 14, title: 'Bonus: Percent to fractions', shortTitle: 'Bonus percent as fraction', description: 'Write 60% as 60/100.', skill: 'Percent means out of 100. Write the percent as that many parts out of 100.', mode: 'percent-inverse', n: 3, d: 5, context: 'game score', enrichment: true },
  { id: 'decimal-fraction-equivalence', unit: 14, title: 'Fractions to decimals', shortTitle: 'Three forms', description: 'Write 1/4 as 0.25.', skill: 'Rename a fraction in tenths or hundredths. Write tenths with one decimal place and hundredths with two.', mode: 'decimal-equivalent', n: 7, d: 10, context: 'battery meter' },
  { id: 'compare-decimals', unit: 14, title: 'Compare decimals', shortTitle: 'Compare decimal sizes', description: 'Compare decimals using tenths and hundredths.', skill: 'Write both decimals with the same number of places. Then compare the digits by place value.', mode: 'decimal-compare', n: 3, d: 10, context: 'hundredths grid', gradeBand: 4, standards: ['4.NF.7'] },
  { id: 'multi-step-fraction-stories', unit: 14, title: 'Two-step stories', shortTitle: 'Fraction stories', description: 'Solve a story in 2 steps.', skill: 'Find what the story asks first. Solve that step, then use the answer in the next step.', mode: 'story', n: 2, d: 5, context: 'community garden' },
  // Unit 15 · Problem solving: the reasoning that Singapore, Beast Academy and Eureka lean on and quizzes skip.
  { id: 'find-the-whole', unit: 15, title: 'Find the whole', shortTitle: 'Find the whole', description: '3 is 1/4 of it. What is the whole?', skill: 'The known amount is one of the equal parts. Find one part, then multiply by the denominator to make the whole.', mode: 'whole-from-part', n: 1, d: 4, context: 'sticker packs', gradeBand: 4, standards: ['3.NF.1', '4.NF.4c'],
    example: { prompt: '3 stickers are 1/4 of a pack. How many stickers are in the pack?', answer: '12 stickers', explanation: '1/4 is 1 of 4 equal parts. Each part is 3. 4 parts of 3 is 12.', model: setModel(3, 12, 4) } },
  { id: 'spot-the-mistake', unit: 15, title: 'Spot the mistake', shortTitle: 'Spot the mistake', description: 'Is Sam right? Fix it.', skill: 'Check whether each step uses the right fraction rule. Find the first wrong step and correct it.', mode: 'mistake', n: 3, d: 4, context: 'homework check', gradeBand: 4, standards: ['4.NF.3a', '4.NF.2'] },
  { id: 'fraction-of-remainder', unit: 15, title: 'Fraction of the rest', shortTitle: 'Fraction of the rest', description: 'Spend 1/3. Then spend 1/2 of the rest.', skill: 'First find how much is left. Then split that remaining amount and find the fraction asked for.', mode: 'remainder', n: 1, d: 3, context: 'pocket money', gradeBand: 5, standards: ['5.NF.6', '5.NF.2'] },
  { id: 'divide-fractions', unit: 15, title: 'Bonus: Divide by a fraction', shortTitle: 'Bonus fraction ÷ fraction', description: 'How many 1/8s fit in 3/4?', skill: 'Division asks how many groups fit. Count how many pieces of the given fraction fit in the amount.', mode: 'divide-fractions', n: 3, d: 4, context: 'measuring scoops', enrichment: true },
];

const picture = (top: number, bottom: number): ModelSpec => ({ kind: 'bars', bars: [{ numerator: top, denominator: bottom }], hideLabels: true });
/** A picture for a worksheet problem: its own model, else the first amount in the question. Never the answer. */
export function problemPicture(problem: WorksheetProblem): ModelSpec {
  const m = problem.model;
  // An empty picture: the wholes cut into equal pieces, nothing shaded yet (sharing questions).
  if (m && m.n === 0) return { kind: 'bars', bars: Array.from({ length: m.wholes }, () => ({ numerator: 0, denominator: m.d })), hideLabels: true };
  if (m?.kind === 'set' && m.total) return setModel((m.total / m.d) * m.n, m.total, m.d);
  if (m?.kind === 'line') return { kind: 'line', numerator: m.n, denominator: m.d, wholes: numberLineWholeCount(m.n, m.d), hideLabels: true };
  if (m) return picture(m.n, m.d);
  const fraction = /(\d+)\/(\d+)/.exec(problem.prompt);
  if (fraction && Number(fraction[1]) <= Number(fraction[2]) * 3) return picture(Number(fraction[1]), Number(fraction[2]));
  // Ruler questions: a number line marked like the ruler, with the end point (no labels).
  if (problem.rulerTask) return { kind: 'line', numerator: problem.rulerTask.end, denominator: problem.rulerTask.denominator, wholes: problem.rulerTask.wholes, hideLabels: true };
  if (problem.picture) return problem.picture;
  if (problem.area) return { kind: 'area', cut: problem.area.cut, shaded: problem.area.shaded ?? [] };
  return autoPicture(problem.prompt) ?? equation(problem.prompt.replace(/\?.*$/, '?'));
}

/** Mark the bars whose fraction the question names ("Which is bigger, 3/4 or 3/8?"), so they show their labels.
    A bar whose fraction is the answer stays unlabelled until the child answers. */
export function nameBars(model: ModelSpec, prompt: string): ModelSpec {
  if (model.kind !== 'bars') return model;
  // Exact match: "Which is the same as 2/3?" labels the 2/3 bar, never the 4/6 answer bar.
  const named = new Set(amountsIn(prompt).map((amount) => `${amount.numerator}/${amount.denominator}`));
  return { ...model, bars: model.bars.map((bar) => (named.has(`${bar.numerator}/${bar.denominator}`) && bar.numerator > 0 ? { ...bar, named: true } : bar)) };
}

/** A tap question made from a worksheet problem, with the right answer at `position`. */
export function problemQuestion(problem: WorksheetProblem, position: number): PracticeSeed {
  const choices = [...choiceDistractors(problem.answer)];
  choices.splice(position % 3, 0, problem.answer);
  const model = problemPicture(problem);
  const simpler = 'hideLabels' in model ? { ...model, hideLabels: false } : model;
  return practice(asChoicePrompt(problem.prompt), choices, position % 3, model, problem.hint, problem.hint, simpler);
}

function extensionMission(topic: ExtensionTopic): MissionSeed {
  const sheet = getWorksheet(topic.id);
  const [build] = getBuildChecks(topic.id);
  const t = build.target;
  return {
    id: topic.id, unit: topic.unit, title: topic.title, shortTitle: topic.shortTitle, description: topic.description, skill: topic.skill,
    learningIntro: topic.learningIntro,
    gradeBand: topic.gradeBand, standards: topic.standards, enrichment: topic.enrichment,
    example: topic.example ?? {
      prompt: build.prompt,
      answer: t.kind === 'set' && t.total ? `${(t.total / t.d) * t.n} of ${t.total}` : `${t.n}/${t.d}`,
      explanation: build.explanation,
      model: t.kind === 'set' && t.total ? setModel((t.total / t.d) * t.n, t.total, t.d) : t.kind === 'line' ? line(t.n, t.d) : bars({ numerator: t.n, denominator: t.d }),
    },
    // Practice uses different worksheet rows than the first ones, so the sheet still has fresh numbers.
    questions: [1, 4, 7, 10].map((row, i) => problemQuestion(sheet[row], i + row)),
  };
}

curriculum.push(...extensionTopics.map(extensionMission));

export const MISSIONS: Mission[] = curriculum.map((seed, index) => {
  const current = mission(seed);
  if (index === 0) return current;

  // Revisit a question from the previous lesson between new practice and mastery.
  const priorLesson = curriculum[index - 1];
  const priorQuestion = mission(priorLesson).questions[0];
  const reviewChoices = [...priorQuestion.choices.slice(1), priorQuestion.choices[0]];
  const shiftedCorrect = (priorQuestion.correctChoice - 1 + priorQuestion.choices.length) % priorQuestion.choices.length;
  // Yes-or-no reviews keep "No" first (the shuffle that moves the right answer doesn't apply to them).
  const review: PracticeQuestion = noBeforeYes({
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
  });
  const mastery = current.questions[current.questions.length - 1];
  return { ...current, questions: [...current.questions.slice(0, -1), review, mastery] };
});

export const EMPTY_PROGRESS: Progress = { completedMissionIds: [], starsByMission: {}, reviewQueue: [], assessments: [] };
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
  // Lessons skipped by the placement quiz stay open but aren't suggested (unless the child started one).
  const skipped = (item: Mission) => !!progress.placement && item.unit < progress.placement.unit && !progress.learning?.[item.id];
  const unfinished = MISSIONS.filter((item) =>
    !passedLesson(progress, item.id) && isMissionUnlocked(progress, item.id) && !skipped(item),
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

/** A redo of a finished part (practice only); anything malformed is dropped. */
function readRedo(raw: Partial<LearningRecord>): Pick<LearningRecord, 'redo' | 'redoRounds' | 'redosFinished' | 'redoMisconceptions'> {
  const out: Pick<LearningRecord, 'redo' | 'redoRounds' | 'redosFinished' | 'redoMisconceptions'> = {};
  if (raw.redoMisconceptions && typeof raw.redoMisconceptions === 'object') for (const [key, count] of Object.entries(raw.redoMisconceptions)) {
    if (key.length <= 300 && safeCount(count) > 0) (out.redoMisconceptions ??= {})[key] = safeCount(count);
  }
  if (safeCount(raw.redoRounds) > 0) out.redoRounds = safeCount(raw.redoRounds);
  if (safeCount(raw.redosFinished) > 0) out.redosFinished = safeCount(raw.redosFinished);
  const redo = raw.redo;
  if (!redo || typeof redo !== 'object' || (redo.part !== 'worksheet' && redo.part !== 'builds') || safeCount(redo.round) < 1) return out;
  const worksheet: Record<string, { draft: string; checkedValue?: string; attempts: number; supported: boolean }> = {};
  for (const [key, entry] of Object.entries(redo.worksheet ?? {})) {
    if (/^w([1-9]|1[0-2])$/.test(key) && entry && typeof entry.draft === 'string') worksheet[key] = {
      draft: entry.draft.slice(0, 200), checkedValue: typeof entry.checkedValue === 'string' ? entry.checkedValue.slice(0, 200) : undefined,
      attempts: safeCount(entry.attempts), supported: entry.supported !== false };
  }
  const checks: Record<string, { passed: boolean; supported: boolean; attempts: number }> = {};
  for (const [key, c] of Object.entries(redo.checks ?? {})) {
    if (/^redo-[12]$/.test(key) && c && typeof c.passed === 'boolean') checks[key] = { passed: c.passed, supported: c.supported !== false, attempts: safeCount(c.attempts) };
  }
  const rowRounds: Record<string, number> = {};
  for (const [key, n] of Object.entries(redo.rowRounds ?? {})) if (/^w([1-9]|1[0-2])$/.test(key) && safeCount(n) > 0) rowRounds[key] = Math.min(50, safeCount(n));
  out.redo = { part: redo.part, round: Math.min(10_000, safeCount(redo.round)), startedAt: typeof redo.startedAt === 'number' && Number.isFinite(redo.startedAt) ? redo.startedAt : 0,
    worksheet, checks, rowRounds, ...(typeof redo.finishedAt === 'number' && Number.isFinite(redo.finishedAt) ? { finishedAt: redo.finishedAt } : {}) };
  return out;
}

/** A saved answer left from an older version of the question: a fraction where the question now wants yes/no
    or a whole number. It is dropped so the child sees an empty box, not an old answer marked wrong. */
export function staleDraft(problem: WorksheetProblem, draft: string): boolean {
  const said = draft.trim().toLowerCase();
  if (!said) return false;
  if (problem.form === 'word') return /\d/.test(said);
  return /^\d+$/.test(problem.answer) && !problem.form && said.includes('/');
}
export function isMissionUnlocked(progress: Progress, missionId: string): boolean {
  const targetIndex = MISSIONS.findIndex((item) => item.id === missionId);
  if (targetIndex < 0) return false;
  const target = MISSIONS[targetIndex];
  // Units the placement quiz showed are already known don't block the ones after them.
  const placedOut = (item: Mission) => !!progress.placement && item.unit < progress.placement.unit;
  // A lesson added (or moved) later must not re-lock lessons a learner had already reached (they can still do it any time).
  const alreadyInLaterUnits = MISSIONS.some((item) => item.unit >= 9 && (!!progress.learning?.[item.id] || progress.completedMissionIds.includes(item.id)));
  if (target.unit < 9) return MISSIONS.slice(0, targetIndex).every(item => placedOut(item) || passedLesson(progress, item.id) || (alreadyInLaterUnits && LATE_ADDED_LESSONS.has(item.id)));
  return MISSIONS.filter(item => item.unit < target.unit && !placedOut(item) && !(alreadyInLaterUnits && LATE_ADDED_LESSONS.has(item.id)))
    .every(item => passedLesson(progress, item.id));
}
/** Passed the lesson's gate now, or passed it before its questions were revised (it then shows "a few new steps",
    but never re-locks the lessons after it). completedAt is only ever set by completeMission. */
export function passedLesson(progress: Progress, missionId: string): boolean {
  return hasLearningGate(progress, missionId)
    || (progress.completedMissionIds.includes(missionId) && typeof progress.learning?.[missionId]?.completedAt === 'number');
}
/**
 * Lessons added after learners could already be past them. For a learner who has started units 9–14 they never block
 * later units (they stay open to do any time, and "Continue" still suggests them). New learners take them in order.
 * Add every lesson inserted into an existing unit here.
 */
export const LATE_ADDED_LESSONS: ReadonlySet<string> = new Set([
  'add-tenths-hundredths',
  // Moved from unit 11 to the end of unit 8 (grade 4).
  'multiply-whole-by-fraction',
  // Standards-coverage lessons (grades 3–5), added to units 9–14.
  'whole-numbers-as-fractions',
  'add-unlike-fractions', 'mixed-unlike-operations', 'estimate-fraction-operations',
  'unit-fraction-multiples', 'multiplication-scaling', 'multiply-mixed-numbers', 'unit-fraction-divided-whole',
  'ruler-measurement', 'build-line-plots', 'read-line-plots', 'line-plot-leveling', 'measurement-word-problems', 'fractional-unit-conversions',
  'fractional-side-area',
  'compare-decimals',
]);

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
    const stored = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY));
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
    const challengeBest: Record<string, number> = {};
    if (value.challengeBest && typeof value.challengeBest === 'object') {
      for (const [rawUnit, rawScore] of Object.entries(value.challengeBest)) {
        const unit = Number(rawUnit);
        if (!Number.isInteger(unit) || unit < 1 || unit > 14 || typeof rawScore !== 'number' || !Number.isFinite(rawScore)) continue;
        challengeBest[String(unit)] = Math.max(0, Math.min(22, Math.floor(rawScore)));
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
          if (entry && typeof entry.draft === 'string' && !staleDraft(problem, entry.draft)) worksheet[problem.id] = {
            draft: entry.draft.slice(0, 200), checkedValue: typeof entry.checkedValue === 'string' ? entry.checkedValue.slice(0, 200) : undefined,
            attempts: safeCount(entry.attempts), supported: entry.supported !== false,
          };
        }
        const misconceptions: Record<string, number> = {};
        if (raw.misconceptions && typeof raw.misconceptions === 'object') for (const [key, count] of Object.entries(raw.misconceptions)) {
          if (key.length <= 300 && safeCount(count) > 0) misconceptions[key] = safeCount(count);
        }
        const baseRecord: LearningRecord = {
          practiceDone: raw.practiceDone === true, checks, worksheet, misconceptions, helpUses: safeCount(raw.helpUses),
        };
        for (const plan of targetedPracticePlans(id, baseRecord)) for (const problem of plan.problems) {
          const entry = raw.worksheet?.[problem.id];
          if (entry && typeof entry.draft === 'string' && !staleDraft(problem, entry.draft)) worksheet[problem.id] = {
            draft: entry.draft.slice(0, 200), checkedValue: typeof entry.checkedValue === 'string' ? entry.checkedValue.slice(0, 200) : undefined,
            attempts: safeCount(entry.attempts), supported: entry.supported !== false,
          };
        }
        learning[id] = {
          practiceDone: raw.practiceDone === true, checks, worksheet, misconceptions,
          helpUses: safeCount(raw.helpUses),
          practiceStars: typeof raw.practiceStars === 'number' && Number.isFinite(raw.practiceStars)
            ? Math.max(0, Math.min(3, Math.floor(raw.practiceStars)))
            : undefined,
          completedAt: typeof raw.completedAt === 'number' && Number.isFinite(raw.completedAt) ? raw.completedAt : undefined,
          confirmedAt: typeof raw.confirmedAt === 'number' && Number.isFinite(raw.confirmedAt) ? raw.confirmedAt : undefined,
          reviewSupportedUntil: typeof raw.reviewSupportedUntil === 'number' && Number.isFinite(raw.reviewSupportedUntil) ? raw.reviewSupportedUntil : undefined,
          // A passed Build check waiting for its Next button survives a reload (only if that check really passed).
          ...(typeof raw.pendingBuildCheckId === 'string' && checks[raw.pendingBuildCheckId]?.passed ? { pendingBuildCheckId: raw.pendingBuildCheckId } : {}),
          ...readRedo(raw),
        };
      }
    }
    const adaptiveStandards: Record<string, AdaptiveStandardState> = {};
    if (value.adaptiveStandards && typeof value.adaptiveStandards === 'object') {
      for (const [standard, rawState] of Object.entries(value.adaptiveStandards)) {
        if (!FRACTION_STANDARDS.some((item) => item.id === standard) || !rawState || typeof rawState !== 'object') continue;
        const state = rawState as Partial<AdaptiveStandardState>;
        const recent = Array.isArray(state.recent)
          ? state.recent.filter((entry): entry is boolean => typeof entry === 'boolean').slice(-6)
          : [];
        if (!recent.length) continue;
        const accuracy = typeof state.accuracy === 'number' && Number.isFinite(state.accuracy)
          ? Math.max(0, Math.min(1, state.accuracy))
          : recent.filter(Boolean).length / recent.length;
        const status = state.status === 'mastered' || state.status === 'developing' || state.status === 'not-yet'
          ? state.status
          : 'not-yet';
        adaptiveStandards[standard] = {
          status,
          recent,
          accuracy,
          streakCorrect: safeCount(state.streakCorrect),
          streakMisses: safeCount(state.streakMisses),
          lastUpdatedAt: typeof state.lastUpdatedAt === 'number' && Number.isFinite(state.lastUpdatedAt) ? state.lastUpdatedAt : 0,
        };
      }
    }
    const adaptationLog: AdaptationEvent[] = [];
    if (Array.isArray(value.adaptationLog)) {
      for (const rawEvent of value.adaptationLog.slice(-120)) {
        if (!rawEvent || typeof rawEvent !== 'object') continue;
        const event = rawEvent as Partial<AdaptationEvent>;
        if (
          typeof event.at !== 'number' || !Number.isFinite(event.at)
          || typeof event.missionId !== 'string' || !validIds.has(event.missionId)
          || typeof event.standard !== 'string' || !FRACTION_STANDARDS.some((item) => item.id === event.standard)
          || (event.band !== 'scaffolded' && event.band !== 'grade-level' && event.band !== 'transfer')
          || typeof event.reason !== 'string' || event.reason.length < 3 || event.reason.length > 240
        ) continue;
        adaptationLog.push({
          at: event.at,
          missionId: event.missionId,
          standard: event.standard as StandardId,
          band: event.band,
          reason: event.reason,
        });
      }
    }
    const dailyPractice = readDailyPractice(value.dailyPractice, validIds);
    const knownStandards = new Set<string>(FRACTION_STANDARDS.map(item => item.id));
    const assessments: AssessmentAttempt[] = [];
    if (Array.isArray(value.assessments)) for (const rawAttempt of value.assessments.slice(-90)) {
      if (!rawAttempt || typeof rawAttempt !== 'object') continue;
      const attempt = rawAttempt as Partial<AssessmentAttempt>;
      if (
        typeof attempt.assessmentId !== 'string'
        || !/^(unit-(?:[1-9]|1[0-4])-(?:pre|mid|end)|grade-[3-5]-(?:beginning|middle|end))$/.test(attempt.assessmentId)
        || typeof attempt.seed !== 'number' || !Number.isSafeInteger(attempt.seed)
        || typeof attempt.startedAt !== 'number' || !Number.isFinite(attempt.startedAt)
        || typeof attempt.completedAt !== 'number' || !Number.isFinite(attempt.completedAt)
        || !Array.isArray(attempt.responses) || attempt.responses.length < 10 || attempt.responses.length > 15
      ) continue;
      const responses: AssessmentResponse[] = [];
      for (const rawResponse of attempt.responses) {
        if (!rawResponse || typeof rawResponse !== 'object') continue;
        const response = rawResponse as Partial<AssessmentResponse>;
        if (typeof response.itemId !== 'string' || response.itemId.length > 180
          || typeof response.modelBuilt !== 'boolean' || typeof response.correct !== 'boolean'
          || !Array.isArray(response.standards)) continue;
        const standards = [...new Set(response.standards.filter((standard): standard is string =>
          typeof standard === 'string' && knownStandards.has(standard)))];
        if (!standards.length) continue;
        responses.push({ itemId: response.itemId, standards, modelBuilt: response.modelBuilt, correct: response.correct && response.modelBuilt });
      }
      if (responses.length >= 10) assessments.push({
        assessmentId: attempt.assessmentId, seed: attempt.seed, startedAt: attempt.startedAt,
        completedAt: attempt.completedAt, responses,
      });
    }
    return {
      completedMissionIds: [...completed],
      starsByMission,
      reviewQueue,
      ...(Object.keys(learning).length ? { learning } : {}),
      ...(Object.keys(challengeBest).length ? { challengeBest } : {}),
      ...(Object.keys(adaptiveStandards).length ? { adaptiveStandards } : {}),
      ...(adaptationLog.length ? { adaptationLog } : {}),
      ...(dailyPractice ? { dailyPractice } : {}),
      assessments,
      ...(value.placement && typeof value.placement === 'object' && Number.isInteger(value.placement.unit) && value.placement.unit >= 2 && value.placement.unit <= 9
        && typeof value.placement.at === 'number' && Number.isFinite(value.placement.at) ? { placement: { unit: value.placement.unit, at: value.placement.at } } : {}),
    };
  } catch {
    return EMPTY_PROGRESS;
  }
}

function safeCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(10000, Math.floor(value))) : 0;
}

function readDailyPractice(value: unknown, validMissionIds: Set<string>): DailyPracticeSession | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<DailyPracticeSession>;
  if (
    typeof raw.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.day)
    || typeof raw.startedAt !== 'number' || !Number.isFinite(raw.startedAt)
    || !Array.isArray(raw.questions) || raw.questions.length < 1 || raw.questions.length > 10
  ) return null;
  const questions: DailyPracticeQuestion[] = [];
  for (const item of raw.questions) {
    if (!item || typeof item !== 'object') return null;
    const question = item as Partial<DailyPracticeQuestion>;
    if (
      typeof question.id !== 'string' || question.id.length > 120
      || typeof question.missionId !== 'string' || !validMissionIds.has(question.missionId)
      || typeof question.topicTitle !== 'string' || question.topicTitle.length > 160
      || (question.difficultyBand !== undefined && question.difficultyBand !== 'scaffolded' && question.difficultyBand !== 'grade-level' && question.difficultyBand !== 'transfer')
      || (question.adaptationReason !== undefined && (typeof question.adaptationReason !== 'string' || question.adaptationReason.length > 220))
      || (question.reteachLoop !== undefined && question.reteachLoop !== true)
      || (question.modelKind !== 'bar' && question.modelKind !== 'number-line')
      || !Number.isInteger(question.numerator) || !Number.isInteger(question.denominator)
      || question.numerator! < 1 || question.denominator! < question.numerator!
      || question.denominator! > 12
      || typeof question.explanation !== 'string' || question.explanation.length > 300
    ) return null;
    questions.push({
      id: question.id,
      missionId: question.missionId,
      topicTitle: question.topicTitle,
      ...(Array.isArray(question.standards) && question.standards.length
        ? { standards: [...new Set(question.standards.filter((standard): standard is StandardId => FRACTION_STANDARDS.some((item) => item.id === standard))).values()] }
        : {}),
      ...(question.difficultyBand ? { difficultyBand: question.difficultyBand } : {}),
      ...(typeof question.adaptationReason === 'string' ? { adaptationReason: question.adaptationReason } : {}),
      ...(question.reteachLoop === true ? { reteachLoop: true } : {}),
      modelKind: question.modelKind,
      numerator: question.numerator!,
      denominator: question.denominator!,
      explanation: question.explanation,
      ...(question.kind === 'choice' && Number.isSafeInteger(question.seed) ? { kind: 'choice' as const, seed: question.seed } : { kind: 'build' as const }),
    });
  }
  const attempts: Record<string, DailyPracticeAttempt> = {};
  if (raw.attempts && typeof raw.attempts === 'object') {
    for (const question of questions) {
      const attempt = (raw.attempts as Record<string, unknown>)[question.id];
      if (!attempt || typeof attempt !== 'object') continue;
      const entry = attempt as Partial<DailyPracticeAttempt>;
      attempts[question.id] = {
        shaded: Array.isArray(entry.shaded)
          ? [...new Set(entry.shaded.filter((index): index is number => Number.isInteger(index) && index >= 0 && index < 12))].slice(0, 12)
          : [],
        ...(Number.isInteger(entry.parts) && entry.parts! >= 2 && entry.parts! <= 12 ? { parts: entry.parts } : {}),
        ...(Number.isInteger(entry.choice) && entry.choice! >= 0 && entry.choice! < 6 ? { choice: entry.choice } : {}),
        draft: typeof entry.draft === 'string' ? entry.draft.slice(0, 200) : '',
        modelChecked: entry.modelChecked === true,
        modelCorrect: entry.modelCorrect === true,
        answerChecked: entry.answerChecked === true,
        answerCorrect: entry.answerCorrect === true,
      };
    }
  }
  const maximumIndex = questions.length - 1;
  return {
    day: raw.day,
    startedAt: raw.startedAt,
    questions,
    index: typeof raw.index === 'number' && Number.isFinite(raw.index)
      ? Math.max(0, Math.min(maximumIndex, Math.floor(raw.index)))
      : 0,
    attempts,
    ...(typeof raw.completedAt === 'number' && Number.isFinite(raw.completedAt) ? { completedAt: raw.completedAt } : {}),
  };
}

export function saveProgress(progress: Progress): boolean {
  try {
    window.localStorage.setItem(scopedStorageKey(STORAGE_KEY), JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function resetProgress(): Progress {
  saveProgress(EMPTY_PROGRESS);
  return EMPTY_PROGRESS;
}

/** Course size counted from MISSIONS, so text like "13 more units: 65 more lessons" never goes stale.
    `freeUnits` are left out of the "locked" numbers (for a trial that opens unit 1). */
export function courseCounts(freeUnits: Iterable<number> = []) {
  const free = new Set(freeUnits);
  const locked = MISSIONS.filter((mission) => !free.has(mission.unit));
  return {
    lessons: MISSIONS.length, units: new Set(MISSIONS.map((mission) => mission.unit)).size,
    lockedLessons: locked.length, lockedUnits: new Set(locked.map((mission) => mission.unit)).size,
  };
}
