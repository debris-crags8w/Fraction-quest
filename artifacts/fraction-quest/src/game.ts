import { noBeforeYes, orderedWithSigns, withFourthChoice, withSignComparisons } from './fourth-choice';
import { preferMisconceptions } from './misconceptions';
import { hasLearningGate, targetedPracticePlans, type LearningRecord } from './learning';
import { gridCut, gridOverlap, type AreaCut, type AreaTask } from './area-shapes';
import { amountsIn, autoPicture } from './auto-picture';
import { gardenModel, type GardenSide } from './garden';
import { asChoicePrompt, choiceDistractors, getBuildChecks, getWorksheet, type WorksheetProblem } from './learning-content';
import { FRACTION_STANDARDS, standardsForMission, type StandardId } from './standard-catalog';
import { scopedStorageKey } from './storage-scope';

/** `named`: the question states this fraction, so the bar shows its label (other bars are labelled once answered). */
/** `untilAnswered`: this bar shows the answer, so it stays hidden until the child answers (then it confirms it). */
export type FractionValue = { numerator: number; denominator: number; named?: boolean; untilAnswered?: boolean };

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
    cards: [{ numerator: 5, denominator: 6 }, { numerator: 2, denominator: 6 }, { numerator: 1, denominator: 2 }],
    strategyHint: 'Use 1/2 as a benchmark. 2/6 is below half and 5/6 is above half. Also, 1/2 is 3/6.',
    explanation: '1/2 is 3/6, so the order is 2/6, 1/2, 5/6.',
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
  | { kind: 'area'; cut: AreaCut; shaded: number[]; caption?: string; label?: string; scale?: number;
      /** More wholes drawn beside the first (two hundredths grids to compare). `scale` < 1 draws a smaller whole. */
      more?: AreaFigureSpec[];
      /** "Color 2. What fraction is colored?": the child taps pieces to color them before answering. */
      colorTask?: AreaTask }
  /** A finished line plot to read: one X over each value (tick numbers, counted from 0 in steps of 1/denominator).
      With `plotTask` the plot starts empty and the child taps the Xs on before answering (the values are in the question). */
  | { kind: 'lineplot'; denominator: number; wholes: number; values: number[]; caption?: string; plotTask?: boolean }
  /** Coins: dimes (a tenth of a dollar) and pennies (a hundredth). */
  | { kind: 'coins'; dimes: number; pennies: number; caption?: string }
  /** A rectangular garden drawn to scale: thick lines at each whole meter, dashed lines at each small part, and the four
      parts (whole × whole, whole × part, part × whole, part × part) in four colors. `labelParts` writes each part's area
      on it (worked examples only: in a question that would be the answer). */
  | { kind: 'garden'; width: GardenSide; height: GardenSide; labelParts?: boolean; caption?: string };

/** One whole in an area picture: `label` is written under it (worked examples only), `scale` draws a smaller whole. */
export type AreaFigureSpec = { cut: AreaCut; shaded: number[]; label?: string; scale?: number };
/** Every whole an area picture draws, the first one included. */
export const areaFigures = (model: Extract<ModelSpec, { kind: 'area' }>): AreaFigureSpec[] =>
  [{ cut: model.cut, shaded: model.shaded, label: model.label, scale: model.scale }, ...(model.more ?? [])];

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
  /** Spaced review step: 0 is the review 1 day after the lesson, then 3 days, then 7 days (absent in older saves: 0). */
  stage?: number;
};

export type Answer = number;
type PracticeSeed = Omit<PracticeQuestion, 'id' | 'isMastery' | 'isReview'>;
type MissionSeed = Omit<Mission, 'questions' | 'unit'> & { questions: PracticeSeed[] };

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

const fractionValues = (text: string) => [...text.matchAll(/(\d+)\s*\/\s*(\d+)/g)].map((m) => Number(m[1]) / Number(m[2]));
const sameValue = (a: number, b: number) => Math.abs(a - b) < 1e-9;

/** No picture gives the answer away. When the question names fractions, a bar that shows the answer (or, in a
    "same amount" question, the matching fraction) waits until the child answers. Pictures that draw every choice,
    and pictures that are the question itself ("What fraction is shaded?"), stay as they are. If nothing would be
    left, the picture shows the fractions the question names instead. */
export function hideAnswerBars(model: ModelSpec, prompt: string, choices: string[], correctChoice: number): ModelSpec {
  if (model.kind !== 'bars') return model;
  const named = amountsIn(prompt);
  if (!named.length) return model;
  const namedValues = named.map((amount) => amount.numerator / amount.denominator);
  const answer = choices[correctChoice] ?? '';
  const answerValues = fractionValues(answer);
  // Putting named fractions in order: the bars are the fractions the child compares, not the answer.
  const namedFractionValues = fractionValues(prompt);
  if (answerValues.length > 1 && answerValues.every((value) => namedFractionValues.some((named) => sameValue(named, value)))) return model;
  const choiceValues = choices.map((choice) => fractionValues(choice));
  const drawnChoices = choiceValues.filter((values) => values.length === 1
    && model.bars.some((bar) => !bar.named && sameValue(bar.numerator / bar.denominator, values[0]))).length;
  if (drawnChoices > 1) return model;
  // "Same amount" questions: the answer is a renamed fraction, or a missing number ("3/4 = 6/?").
  const sameAmount = answerValues.length === 1 ? namedValues.some((value) => sameValue(value, answerValues[0])) : /\?/.test(prompt);
  const gives = (bar: FractionValue) => {
    if (bar.named) return false;
    const value = bar.numerator / bar.denominator;
    return answerValues.some((a) => sameValue(a, value)) || (sameAmount && namedValues.some((a) => sameValue(a, value)));
  };
  if (!model.bars.some(gives)) return model;
  const bars = model.bars.map((bar) => (gives(bar) ? { ...bar, untilAnswered: true } : bar));
  const shown = bars.filter((bar) => !bar.untilAnswered);
  const missing = named.filter((amount) => amount.numerator > 0 && amount.denominator <= 24
    && !shown.some((bar) => bar.numerator === amount.numerator && bar.denominator === amount.denominator));
  const extra = shown.length === 0 || /\bsum|adds? up|\+/i.test(prompt)
    ? missing.map((amount) => ({ numerator: amount.numerator, denominator: amount.denominator, ...(amount.written ? { named: true } : {}) }))
    : [];
  return { ...model, bars: [...extra, ...bars] };
}

/** A bar drawn for a decimal or percent ("What fraction is 0.35?") would be labelled 35/100, the answer: that label
    waits until the child answers. Fractions the question writes ("3/4 or 3/8?") keep their labels. */
function unlabelAnswer(model: ModelSpec, prompt: string, answer: string): ModelSpec {
  const spelled = amountsIn(prompt).some((amount) => !amount.written && `${amount.numerator}/${amount.denominator}` === answer.trim());
  if (model.kind !== 'bars' || !spelled) return model;
  return { ...model, bars: model.bars.map((bar) => (bar.named && `${bar.numerator}/${bar.denominator}` === answer.trim() ? { ...bar, untilAnswered: true } : bar)) };
}

/** A picture that draws every written choice ("Which is closest to 0? 1/8, 4/5, 7/8") also draws the added fourth
    choice, so the child can check it too. */
function withChoiceBars<T extends { choices: string[]; model: ModelSpec }>(question: T, authored: string[]): T {
  const { model } = question;
  if (model.kind !== 'bars') return question;
  const plain = (choice: string) => /^\d+\/\d+$/.test(choice.trim());
  const drawn = (choice: string) => model.bars.some((bar) => `${bar.numerator}/${bar.denominator}` === choice.trim());
  const written = authored.filter(plain);
  if (written.length < 2 || !written.every(drawn)) return question;
  // Labelled like the other choices' bars.
  const named = written.every((choice) => model.bars.some((bar) => bar.named && `${bar.numerator}/${bar.denominator}` === choice.trim()));
  const added = question.choices.filter((choice) => plain(choice) && !drawn(choice)).map((choice) => {
    const [numerator, denominator] = choice.trim().split('/').map(Number);
    return { numerator, denominator, ...(named ? { named: true } : {}) };
  });
  return added.length ? { ...question, model: { ...model, bars: [...model.bars, ...added] } } : question;
}

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
  const named = hideAnswerBars(unlabelAnswer(nameBars(model, prompt), prompt, choices[correctChoice] ?? ''), prompt, choices, correctChoice);
  let simpler = nameBars(simplerModel, prompt);
  // "Let's make it simpler" must stay about this question: if the question's own picture shows the fractions it names
  // and the authored help picture doesn't (a generic 1/2 bar), the help shows the question's bars, labelled.
  const aboutQuestion = (m: ModelSpec) => m.kind === 'bars' && m.bars.some((bar) => bar.named);
  if (aboutQuestion(named) && !aboutQuestion(simpler)) simpler = named;
  // Four choices (A–D): lessons list three, a fourth believable wrong answer is added (sign questions are written out as four comparisons).
  const signs = withSignComparisons(prompt, choices, correctChoice);
  const withFourth = withChoiceBars(withFourthChoice({ prompt, choices: signs?.choices ?? choices, correctChoice: signs?.correctChoice ?? correctChoice, model: named, hint, retryFeedback, simplerModel: simpler }), choices);
  // Whole-number answers: wrong choices come from real slips (one group, the rest, the whole), not answer ± 1.
  const slipped = preferMisconceptions(withFourth);
  return { ...slipped, choices: orderedWithSigns(prompt, slipped.choices) };
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

function mission(seed: MissionSeed & { unit: number }): Mission {
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
    id: 'equal-parts', title: 'Same whole, fair parts', shortTitle: 'Equal parts', skill: 'A fraction names equal parts of one whole. The parts must be the same size.',
    description: 'Spot fair, equal parts.', example: {
      prompt: 'A square cake is cut into 4 parts. When are they fourths?',
      answer: 'When all 4 parts are the same size.',
      explanation: 'Fourths must be equal. The parts can be different shapes, but 4 unequal parts are not fourths.',
      model: { kind: 'area', cut: 'fourths-squares', shaded: [], caption: 'A square cake cut into 4 equal parts' },
    },
    questions: [
      practice('Is this strip cut into thirds?', ['Yes, 3 equal parts', 'No, the parts are unequal', 'No, there are 2 parts', 'Yes, there are 3 parts'], 1, { kind: 'partition', parts: [50, 25, 25] }, 'Thirds are 3 parts, all the same size. Compare the parts.', 'One part is twice as big as the others, so these are not thirds.', { kind: 'partition', parts: [100 / 3, 100 / 3, 100 / 3] }),
      practice('A sandwich is cut into 4 equal parts. What is 1 part?', ['1/3', '1/4', '4/1'], 1, bars({ numerator: 1, denominator: 4 }), 'Count all the equal parts for the denominator.', 'The denominator is all 4 parts. You have 1.', bars({ numerator: 1, denominator: 2 })),
      practice('This ribbon is cut into 2 parts. Are the parts equal halves?', ['Yes, same-size parts', 'No, one part is bigger', 'No, halves need 3 parts', 'No, they are different colors'], 0, { kind: 'partition', parts: [50, 50] }, 'Halves are 2 parts of the same size.', '2 parts are halves only if they are the same size. These are.', { kind: 'partition', parts: [50, 50] }),
      practice('A strip has 3 equal parts. What is 1 part?', ['one third', 'one half', 'three wholes', 'one fourth'], 0, bars({ numerator: 1, denominator: 3 }), '1 part out of 3 equal parts.', '1 of 3 equal parts is one third, or 1/3.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'fraction-names', title: 'Read a fraction', shortTitle: 'Fraction names', skill: 'The denominator, or bottom number, tells how many equal parts make one whole. The numerator, or top number, tells how many parts we count.',
    description: 'Learn what the numerator and denominator mean.', example: {
      prompt: 'In 3/4, what does each number tell you?',
      answer: 'There are 4 equal parts in all. 3 parts are counted.',
      explanation: 'The denominator is 4, so the whole has 4 equal parts. The numerator is 3, so 3 parts are counted.',
      model: bars({ numerator: 3, denominator: 4 }),
    },
    questions: [
      practice('In 2/6, what does the 6 mean?', ['6 equal parts in all', '6 parts are shaded', '6 wholes', '6 parts not shaded'], 0, bars({ numerator: 2, denominator: 6 }), 'Look at the denominator.', 'The denominator is the number of equal parts in all.', bars({ numerator: 1, denominator: 3 })),
      practice('A tray has 6 spaces. 4 have a snack. What fraction have a snack?', ['6/4', '4/6', '4/4'], 1, bars({ numerator: 4, denominator: 6 }), 'The numerator is the number of spaces with a snack. The denominator is the number of spaces in all.', 'The numerator is 4 spaces with a snack. The denominator is 6 spaces in all.', bars({ numerator: 1, denominator: 2 })),
      practice('In 5/8, how many parts are counted?', ['8', '5', '13'], 1, bars({ numerator: 5, denominator: 8 }), 'Look at the numerator.', 'The numerator is 5. So 5 parts are counted.', bars({ numerator: 2, denominator: 4 })),
      practice('A shape has 8 equal parts. 1 is colored. What fraction is colored?', ['1/8', '8/1', '1/7'], 0, bars({ numerator: 1, denominator: 8 }), '1 colored part out of 8.', 'The denominator is all 8 equal parts. The numerator is the 1 colored part.', bars({ numerator: 1, denominator: 4 })),
    ],
  },
  {
    id: 'unit-fractions', title: 'One part at a time', shortTitle: 'Unit fractions', skill: 'A unit fraction counts one equal part. Its numerator is 1.',
    description: 'Find just 1 equal part.', example: {
      prompt: 'What fraction is 1 of 6 equal parts?',
      answer: '1/6',
      explanation: 'A unit fraction is just 1 part. 1/6 is 1 of 6 parts.',
      model: bars({ numerator: 1, denominator: 6 }),
    },
    questions: [
      practice('Which is a unit fraction?', ['3/8', '1/8', '8/1'], 1, bars({ numerator: 0, denominator: 8 }), 'A unit fraction has a numerator of 1.', 'Look for the one with a numerator of 1.', bars({ numerator: 1, denominator: 4 })),
      practice('A whole is cut into 4 equal parts. What is 1 part?', ['1/4', '4/1', '1/3'], 0, bars({ numerator: 1, denominator: 4 }), '4 parts in all. You have 1.', '1 of 4 equal parts is 1/4.', bars({ numerator: 1, denominator: 2 })),
      practice('Does this bar show 1/3?', ['Yes, 1 of 3 equal parts', 'No, 3 parts are shaded', 'No, the parts are unequal', 'No, 2 parts not shaded'], 0, bars({ numerator: 1, denominator: 3 }), '1/3 is 1 of 3 equal parts.', 'The bar has 3 equal parts and 1 is shaded. That is 1/3.', bars({ numerator: 1, denominator: 2 })),
      practice('What fraction is 1 of 6 equal tiles?', ['6/1', '1/6', '1/5'], 1, bars({ numerator: 1, denominator: 6 }), '1 tile out of 6.', '1 out of 6 equal parts is 1/6.', bars({ numerator: 1, denominator: 3 })),
    ],
  },
  {
    id: 'unit-size', title: 'More parts, smaller parts', shortTitle: 'Unit fraction size', skill: 'The denominator tells how many equal parts make a whole. More parts means each part is smaller.',
    description: 'Compare 1 part from same-size wholes.', example: {
      prompt: 'Which is bigger, 1/3 or 1/8?',
      answer: '1/3 is bigger.',
      explanation: 'A third is bigger than an eighth of the same whole.',
      model: bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 8 }),
    },
    questions: [
      practice('Which part is bigger, 1/4 or 1/6?', ['1/6', '1/4', 'They are equal'], 1, bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 6 }), 'Cut a whole into 4. Cut another into 6. Which parts are bigger?', 'More cuts make smaller parts. Fourths are bigger.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is bigger, 1/8 or 1/4?', ['1/8', '1/4', 'They match'], 1, bars({ numerator: 1, denominator: 8 }, { numerator: 1, denominator: 4 }), 'Both are 1 part. Which whole has fewer parts?', 'Fourths are bigger. 4 parts is fewer than 8.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is closer to one whole: 1/2 or 1/6?', ['1/6', '1/2', 'They are equally close'], 1, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 6 }), 'The bigger part is closer to one whole.', '1/2 is much bigger than 1/6.', bars({ numerator: 1, denominator: 4 })),
      practice('Which is smaller: 1/3 or 1/6?', ['1/3', '1/6', 'They are the same'], 1, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 6 }), 'Which whole has more parts?', 'Sixths are smaller than thirds. So 1/6 is smaller.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'sets-unit-fractions', title: 'Fractions in a group', shortTitle: 'Fractions of sets', skill: 'Split a group into equal groups. One group is one part of the whole set.',
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
    id: 'sets-nonunit', title: 'More than one group', shortTitle: 'Count groups in a set', skill: 'The denominator tells how many equal groups to make. The numerator tells how many groups to count.',
    description: 'Count 2 or 3 equal groups.', example: {
      prompt: 'What is 2/5 of 15 counters?',
      answer: '6 counters.',
      explanation: 'Make 5 groups of 3. Count 2 groups: 3 + 3 = 6.',
      model: setModel(6, 15, 5, '2 of 5 equal groups'),
    },
    questions: [
      practice('What is 2/3 of 12?', ['8', '4', '9'], 0, setModel(0, 12, 3), 'Make 3 equal groups. Count 2.', '12 in 3 groups is 4 each. 2 groups is 8.', setModel(4, 12, 3)),
      practice('What is 3/4 of 8 stickers?', ['2 stickers', '6 stickers', '7 stickers'], 1, setModel(0, 8, 4), 'Make 4 equal groups. Count 3.', '8 in 4 groups is 2 each. 3 groups is 6.', setModel(2, 8, 4)),
      practice('What is 2/5 of 20 cubes?', ['8 cubes', '5 cubes', '10 cubes'], 0, setModel(0, 20, 5), 'Make 5 equal groups. Count 2.', '20 in 5 groups is 4 each. 2 groups is 8.', setModel(4, 20, 5)),
      practice('What is 3/6 of 18 buttons?', ['9 buttons', '6 buttons', '15 buttons'], 0, setModel(0, 18, 6), 'Make 6 equal groups. Count 3.', '18 in 6 groups is 3 each. 3 groups is 9.', setModel(3, 18, 6)),
    ],
  },
  {
    id: 'benchmark-half', title: 'Is it less or more than half?', shortTitle: 'Near one half', skill: 'Compare a fraction with 1/2. A bar or number line shows whether it is less or more than halfway.',
    description: 'Is it more or less than half?', example: {
      prompt: 'Is 3/8 more or less than 1/2?',
      answer: 'Less than 1/2.',
      explanation: 'Half of 8 is 4. 3 is less than 4.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 1, denominator: 2 }),
    },
    questions: [
      practice('Which is more than 1/2?', ['2/6', '3/4', '1/4'], 1, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 2, denominator: 6, named: true }, { numerator: 3, denominator: 4, named: true }, { numerator: 1, denominator: 4, named: true }), 'Half of 4 is 2. Is 3 more than 2?', '3/4 is more than half. The others are less.', bars({ numerator: 1, denominator: 2 })),
      practice('Is 1/3 more or less than 1/2?', ['Less than 1/2', 'Equal to 1/2', 'More than 1/2'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 2 }), 'Half of 3 is 1 and a half.', '1 is less than 1 and a half. So 1/3 is less than half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is closest to 1/2?', ['5/8', '1/6', '7/8'], 0, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 5, denominator: 8 }, { numerator: 1, denominator: 6 }, { numerator: 7, denominator: 8 }), 'Half of 8 is 4. Which is nearest to half?', '5/8 is just over half. The others are farther from half.', bars({ numerator: 1, denominator: 2 })),
      practice('A jug is 4/6 full. Is that more or less than half?', ['More than half', 'Less than half', 'Exactly half'], 0, bars({ numerator: 4, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Half of 6 is 3.', '4 is more than 3. So 4/6 is more than half.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'benchmarks-zero-one', title: 'Near zero, half, or one?', shortTitle: 'Near 0, 1/2 or 1', skill: 'Compare a fraction with 0, 1/2, and 1. These benchmarks show how much of the whole it is.',
    description: 'Guess the size using 0, 1/2 and 1.', example: {
      prompt: 'Is 7/8 near 0, 1/2 or 1?',
      answer: 'Near 1.',
      explanation: '7 of 8 parts are counted. Just 1 part is missing.',
      model: bars({ numerator: 7, denominator: 8 }),
    },
    questions: [
      practice('Which amount is closest to 0?', ['1/8', '3/4', '7/8'], 0, bars({ numerator: 1, denominator: 8 }, { numerator: 3, denominator: 4 }, { numerator: 7, denominator: 8 }), 'The smallest shaded part is closest to 0.', '1/8 is the smallest amount. It is closest to 0.', bars({ numerator: 1, denominator: 4 })),
      practice('Which fraction is closest to one whole?', ['2/6', '5/6', '3/6'], 1, bars({ numerator: 2, denominator: 6 }, { numerator: 5, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Which one is missing just 1 part?', '5/6 is just 1 part away from one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is between 1/2 and 1?', ['3/8', '3/4', '1/4'], 1, bars({ numerator: 3, denominator: 4 }), 'Find one past half but not full.', '3/4 is more than half but less than 1.', bars({ numerator: 1, denominator: 2 })),
      practice('A plant grew 7/8 of a meter. Is that near 0, 1/2 or 1 meter?', ['0 meters', '1 meter', 'Exactly halfway', '7 meters'], 1, bars({ numerator: 7, denominator: 8 }), 'Just 1 eighth is missing.', '7/8 is almost one whole meter.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'fraction-magnitude', title: 'Fractions can be close together', shortTitle: 'Estimate size', skill: 'Use familiar benchmarks like 0, 1/2, and 1 to estimate a fraction before comparing it.',
    description: 'Guess first, then check.', example: {
      prompt: 'Is 2/6 more or less than 1/2?',
      answer: 'A little less than 1/2.',
      explanation: 'Half of 6 is 3. 2 is just 1 less.',
      model: bars({ numerator: 2, denominator: 6 }, { numerator: 1, denominator: 2 }),
    },
    questions: [
      practice('Which is just a little less than 1/2?', ['3/8', '1/8', '7/8'], 0, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 3, denominator: 8, named: true }, { numerator: 1, denominator: 8, named: true }, { numerator: 7, denominator: 8, named: true }), 'Half of 8 is 4. 3 is close.', '3/8 is just under half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is a little more than 1/2?', ['3/8', '5/8', '1/6'], 1, bars({ numerator: 5, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Half of 8 is 4. Which is a bit more?', '5/8 is just over half. The others are under.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is closest to 1?', ['7/8', '2/8', '3/8'], 0, bars({ numerator: 7, denominator: 8 }, { numerator: 2, denominator: 8 }, { numerator: 3, denominator: 8 }), 'Which numerator is closest to 8?', '7/8 is just 1 part away from one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('About how much is 1/8 + 1/8 + 1/8 + 1/8?', ['About 1/2', 'About 1/4', 'About one whole', 'About 4 wholes'], 0, bars({ numerator: 4, denominator: 8 }), '4 eighths is halfway.', '4/8 is the same as 1/2.', bars({ numerator: 2, denominator: 4 })),
    ],
  },
  {
    id: 'number-line-basics', title: 'Build a fraction number line', shortTitle: 'Split the line', skill: 'Split the distance from 0 to 1 into equal spaces. The denominator tells the spaces in one whole.',
    description: 'Every jump is the same size.', example: {
      prompt: 'How many spaces do you need for thirds?',
      answer: '3 equal spaces.',
      explanation: 'The denominator is how many spaces from 0 to 1.',
      model: line(1, 3),
    },
    questions: [
      practice('0 to 1 has 8 equal spaces. What is 1 jump?', ['1/8', '1/7', '8/1'], 0, line(1, 8), 'Count the spaces from 0 to 1.', '8 jumps make one whole. So 1 jump is 1/8.', line(1, 2)),
      practice('How many spaces do you need for fourths?', ['4 spaces', '3 spaces', '5 spaces'], 0, { kind: 'line', numerator: 0, denominator: 1, wholes: 1, hideLabels: true }, 'The denominator tells how many equal spaces go from 0 to 1.', 'Fourths need 4 spaces from 0 to 1.', line(1, 2)),
      practice('A line has 8 equal spaces. Where is 3/8?', ['3 jumps from 0', '8 jumps from 0', '3 jumps past 1', '5 jumps from 0'], 0, line(0, 8), 'The numerator tells how many jumps from 0.', 'The numerator 3 means 3 jumps.', line(1, 4)),
      practice('0 to 1 has 6 equal spaces. What is 5 jumps?', ['5/6', '6/5', '1/5'], 0, line(5, 6), 'Count 5 jumps from 0.', '5 jumps of 1/6 is 5/6.', line(2, 4)),
    ],
  },
  {
    id: 'number-line-points', title: 'Find the marked fraction', shortTitle: 'Read the line', skill: 'The denominator tells the equal spaces in one whole. The numerator tells the jumps from 0.',
    description: 'Count jumps from 0.', example: {
      prompt: 'A line has 6 spaces. The point is 4 jumps from 0. What is it?',
      answer: '4/6',
      explanation: 'Each jump is 1/6. 4 jumps is 4/6.',
      model: line(4, 6),
    },
    questions: [
      practice('A line has 3 spaces. The point is 2 jumps from 0. What is it?', ['2/3', '3/2', '1/3'], 0, line(2, 3), '3 spaces in all. 2 jumps.', '2 jumps of 1/3 is 2/3.', line(1, 2)),
      practice('The point is halfway from 0 to 1. What is it?', ['1/2', '1/4', '2/1'], 0, line(1, 2), 'Halfway is 1 of 2 jumps.', 'Halfway is 1/2.', line(1, 2)),
      practice('A line has 4 spaces. What is 3 jumps from 0?', ['3/4', '4/3', '1/4'], 0, line(3, 4), 'Each jump is 1/4. Count 3.', '3 jumps of 1/4 is 3/4.', line(1, 2)),
      practice('A line has 8 spaces. The point is 5 jumps from 0. What is it?', ['5/8', '8/5', '5/3'], 0, line(5, 8), 'Each jump is 1/8. Count 5.', '5 jumps of 1/8 is 5/8.', line(1, 2)),
    ],
  },
  {
    id: 'number-line-beyond-one', title: 'Keep going past one', shortTitle: 'Past one whole', skill: 'When the jumps pass one whole, keep counting the same-size spaces to show the extra part.',
    description: 'Keep counting jumps past 1.', example: {
      prompt: 'Each jump is 1/4. What is 7 jumps from 0?',
      answer: '7/4, or 1 and 3/4.',
      explanation: '4 jumps make one whole. 3 more jumps is 7/4.',
      model: line(7, 4, 2),
    },
    questions: [
      practice('Each jump is 1/4. What is 5 jumps from 0?', ['5/4', '4/5', '1/4'], 0, line(5, 4, 2), '4 jumps reach 1. Then 1 more.', '5 jumps is 5/4. That is 1 and 1/4.', line(3, 4)),
      practice('Each jump is 1/3. Which point is just past 1?', ['2/3', '4/3', '1/3', '3/3'], 1, line(4, 3, 2), '3 jumps of 1/3 reach 1. Take 1 more jump.', '4/3 is 1 and 1/3, just past 1.', line(2, 3)),
      practice('What fraction is the same as 1 and 2/6?', ['8/6', '6/8', '2/6'], 0, line(8, 6, 2), 'One whole is 6/6. Add 2 more.', '6/6 + 2/6 = 8/6.', line(6, 6)),
      practice('A runner takes 10 steps of 1/6. How far is that?', ['1 and 3/6', '1 and 4/6', '4/6'], 1, line(10, 6, 2), '6 steps make one whole. How many are left?', '10/6 is 6/6 and 4/6. That is 1 and 4/6.', line(6, 6)),
    ],
  },
  {
    id: 'compare-same-denominator', title: 'Same parts, different counts', shortTitle: 'Compare like parts', skill: 'The same denominator means the parts are the same size. More counted parts make the larger fraction.',
    description: 'Compare fractions with same-size parts.', example: {
      prompt: 'Which is bigger, 3/8 or 5/8?',
      answer: '5/8.',
      explanation: 'Both use eighths. 5 parts is more than 3.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 5, denominator: 8 }),
    },
    questions: [
      practice('Which is bigger, 4/6 or 2/6?', ['2/6', '4/6', 'They are equal'], 1, bars({ numerator: 4, denominator: 6 }, { numerator: 2, denominator: 6 }), 'Same size parts. Which has more?', '4 parts is more than 2 parts.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is smaller, 1/3 or 2/3?', ['1/3', '2/3', 'They match'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }), 'Both are thirds. Which has fewer?', '1 third is less than 2 thirds.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 6/8 __ 7/8', ['>', '<', '='], 1, bars({ numerator: 6, denominator: 8 }, { numerator: 7, denominator: 8 }), 'Same denominator. Compare 6 and 7.', '6 is less than 7. So 6/8 < 7/8.', bars({ numerator: 1, denominator: 4 })),
      practice('Which is bigger, 1/4 or 3/4?', ['1/4', '3/4', 'They are equal'], 1, bars({ numerator: 1, denominator: 4 }, { numerator: 3, denominator: 4 }), 'Same size parts. Count them.', '3 parts is more than 1.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'compare-same-numerator', title: 'Same count, different sizes', shortTitle: 'Same numerators', skill: 'When the wholes are the same size, the same numerator means we count the same number of parts. A larger denominator splits that whole into more equal parts, so each part is smaller, and so is the fraction.',
    explainPrompt: 'Use the bars for 3/4 and 3/8. What does the denominator change in the same-size whole? Why is 3/8 smaller even though both fractions count 3 parts? Then draw same-length bars for 2/3 and 2/4 and explain why 2/3 is larger without repeating the example.',
    description: 'Compare fractions with the same numerator.', example: {
      prompt: 'Which is bigger, 3/4 or 3/8?',
      answer: '3/4.',
      explanation: 'Both same-size bars count 3 parts. Splitting the whole into 8 equal parts makes smaller parts than splitting it into 4, so 3/8 is less than 3/4.',
      model: bars({ numerator: 3, denominator: 4 }, { numerator: 3, denominator: 8 }),
    },
    questions: [
      practice('Which is bigger, 2/3 or 2/8?', ['2/8', '2/3', 'They are equal'], 1, bars({ numerator: 2, denominator: 3 }, { numerator: 2, denominator: 8 }), 'On the same-size whole, both count 2 parts. Which are larger parts: thirds or eighths?', 'Both count 2 parts from the same-size whole. Each third is bigger than each eighth, so 2/3 is bigger.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is smaller, 4/6 or 4/8?', ['4/6', '4/8', 'They are equal'], 1, bars({ numerator: 4, denominator: 6 }, { numerator: 4, denominator: 8 }), 'Both count 4 parts from the same-size whole. The larger denominator, 8, makes smaller parts.', 'Both count 4 parts from the same-size whole. Eighths are smaller than sixths, so 4/8 is less than 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 1/6 __ 1/4', ['>', '<', '='], 1, bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 4 }), 'Which is larger: one of 6 equal parts or one of 4 equal parts?', 'One sixth is smaller than one fourth, so 1/6 < 1/4.', bars({ numerator: 1, denominator: 2 })),
      practice('Which covers more: 3/8 or 3/6?', ['3/8', '3/6', 'They cover the same'], 1, bars({ numerator: 3, denominator: 8 }, { numerator: 3, denominator: 6 }), 'On the same-size whole, both count 3 parts. Sixths are larger because 6 parts are fewer than 8.', 'Each sixth is larger than each eighth. With 3 parts counted from the same-size whole, 3/6 covers more than 3/8.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'order-fractions', title: 'Put fractions in order', shortTitle: 'Order fractions', skill: 'Compare the amounts, then put them from smallest to largest or largest to smallest.',
    description: 'Compare amounts, not just numbers.', example: {
      prompt: 'Put 1/4, 3/4 and 1/2 in order, smallest first.',
      answer: '1/4, 1/2, 3/4',
      explanation: 'Use 1/2 as a halfway benchmark. 1/4 is less than half and 3/4 is more, so the order is 1/4, 1/2, 3/4.',
      model: bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 2 }, { numerator: 3, denominator: 4 }),
    },
    questions: [
      practice('Which order goes smallest to biggest?', ['1/3, 2/3, 3/3', '3/3, 2/3, 1/3', '2/3, 1/3, 3/3'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }, { numerator: 3, denominator: 3 }), 'All thirds. Count the parts.', '1/3 is smallest. 3/3 is one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('Which order goes biggest to smallest?', ['1/2, 1/4, 1/8', '1/8, 1/4, 1/2', '1/4, 1/2, 1/8'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 4 }, { numerator: 1, denominator: 8 }), 'Each counts 1 part of the same-size whole. More parts in the whole means each part is smaller.', '1/2 is biggest, then 1/4, then 1/8.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fits between 2/8 and 6/8?', ['1/8', '4/8', '7/8'], 1, bars({ numerator: 2, denominator: 8 }, { numerator: 6, denominator: 8 }), 'All eighths. Which numerator is between 2 and 6?', '4 is between 2 and 6.', bars({ numerator: 1, denominator: 2 })),
      practice('Put 1/2, 3/8 and 7/8 in order, smallest first.', ['3/8, 1/2, 7/8', '7/8, 1/2, 3/8', '1/2, 3/8, 7/8'], 0, bars({ numerator: 3, denominator: 8 }, { numerator: 1, denominator: 2 }, { numerator: 7, denominator: 8 }), '1/2 is the same as 4/8. Compare to that.', '3/8 is less than half. 7/8 is more.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'equivalent-models', title: 'Same amount, new name', shortTitle: 'See equivalence', skill: 'Equivalent fractions can look different but name the same amount. Splitting every part keeps the whole amount unchanged.',
    description: 'Find fractions that match.', example: {
      prompt: 'How can 1/2 and 2/4 be the same?',
      answer: 'Cut each half into 2 parts.',
      explanation: 'Now there are 4 parts. 2 are shaded.',
      model: bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }),
    },
    questions: [
      practice('Which fraction covers the same amount as 1/2?', ['2/4', '1/4', '3/4'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }), 'Cut the half into 2 equal parts. How many fourths is that?', '2/4 covers the same as 1/2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 2/3?', ['4/6', '3/6', '2/6'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }), 'Cut each third into 2 parts.', 'Each third became 2 sixths, so 2 thirds is 4 sixths: 2/3 = 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 3/4?', ['6/8', '3/8', '4/8'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 }), 'Cut each fourth into 2 parts.', '3/4 and 6/8 are the same amount.', bars({ numerator: 1, denominator: 2 })),
      practice('Fold a strip in half. Shade one half. Now fold it in half again. How many fourths are shaded?', ['2/4', '1/4', '1/3'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4, untilAnswered: true }), 'Folding again cuts each half into 2 equal parts. How many fourths are shaded?', 'The second fold cuts the shaded half into 2 fourths: 1/2 = 2/4.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 1/3?', ['2/6', '1/6', '3/1'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 6 }), 'Cut each third into 2 equal parts. Count the shaded parts now.', 'Each third became 2 sixths, so 1 third is 2 sixths: 1/3 = 2/6.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'build-equivalents', title: 'Make a matching fraction', shortTitle: 'Make a match', skill: 'Multiply the numerator and denominator by the same amount. That changes the part size, not the fraction’s value.',
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
    id: 'missing-equivalent', title: 'Find the missing number', shortTitle: 'Missing parts', skill: 'Equivalent fractions keep the same amount. Whatever factor changes the denominator must also change the numerator.',
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
    id: 'compose-to-one', title: 'Put parts together', shortTitle: 'Make one whole', skill: 'Parts with the same denominator are the same size. Put enough together to fill one whole.',
    description: 'Add parts until you have one whole.', example: {
      prompt: 'How many 1/4 parts make one whole?',
      answer: '4 parts: 4/4 = 1.',
      explanation: '4 fourths make one whole.',
      model: bars({ numerator: 4, denominator: 4 }),
    },
    questions: [
      practice('How many 1/5 parts make one whole?', ['5 parts', '4 parts', '10 parts'], 0, bars({ numerator: 5, denominator: 5 }), 'The denominator is how many parts make one whole.', '5 fifths make one whole: 5/5 = 1.', bars({ numerator: 2, denominator: 4 })),
      practice('Which sum makes one whole?', ['1/3 + 2/3', '1/4 + 1/4', '2/5 + 1/5'], 0, bars({ numerator: 0, denominator: 3 }), 'Look for numerators that add up to the denominator.', '1/3 + 2/3 = 3/3. That is one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('What is 2/8 + 6/8?', ['8/8', '8/16', '4/8', '6/8'], 0, bars({ numerator: 2, denominator: 8 }, { numerator: 6, denominator: 8 }), 'Add the numerators. Keep eighths.', '2 + 6 = 8. 8/8 is one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('A recipe uses 3/6 cup, then 3/6 cup more. How much in all?', ['6/6 cup', '6/12 cup', '3/6 cup', '6/3 cup'], 0, bars({ numerator: 3, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Add the numerators. How many sixths fill 1 cup?', '3 + 3 = 6. 6/6 is 1 cup.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'decompose-fractions', title: 'Break a fraction apart', shortTitle: 'Break apart', skill: 'Break the counted parts into smaller groups. Keep the part size the same.',
    description: 'Show one amount in different ways.', example: {
      prompt: 'Split 5/6 into two parts. Keep sixths.',
      answer: '2/6 + 3/6 = 5/6.',
      explanation: 'Keep the sixths. Split 5 parts into 2 and 3.',
      model: bars({ numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }, { numerator: 5, denominator: 6 }),
    },
    questions: [
      practice('Which sum equals 4/6?', ['1/6 + 3/6', '1/6 + 2/6', '4/6 + 4/6'], 0, bars({ numerator: 1, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Add the numerators. Keep sixths.', '1 + 3 = 4. So 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: 6/8 = 2/8 + ?/8', ['4', '3', '8'], 0, bars({ numerator: 6, denominator: 8 }, { numerator: 2, denominator: 8 }), '6 take away 2 is what?', '6 − 2 = 4. So 2/8 + 4/8 = 6/8.', bars({ numerator: 1, denominator: 2 })),
      practice('Which adds up to 3/5?', ['1/5 + 2/5', '1/5 + 1/5', '3/5 + 2/5'], 0, bars({ numerator: 1, denominator: 5 }, { numerator: 2, denominator: 5 }), 'Add the numerators.', '1 + 2 = 3. So 3/5.', bars({ numerator: 1, denominator: 2 })),
      practice('7/10 = 5/10 + what?', ['2/10', '3/10', '5/10'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 2, denominator: 10 }), '7 take away 5 is what?', '7 − 5 = 2. So 2/10.', bars({ numerator: 1, denominator: 2 })),
    ],
  },
  {
    id: 'improper-fractions', title: 'More than one whole', shortTitle: 'Past a whole', skill: 'When the numerator is greater than the denominator, the fraction is at least one whole. It may have extra parts too.',
    description: 'Keep counting parts past one whole.', example: {
      prompt: 'What is 7/4 as wholes and a fraction?',
      answer: '1 and 3/4.',
      explanation: '4/4 is one whole. 3/4 is left over.',
      model: { kind: 'bars', bars: [{ numerator: 4, denominator: 4 }, { numerator: 3, denominator: 4 }], caption: '7/4 is one whole and 3/4' },
    },
    questions: [
      practice('What is 5/3 as wholes and a fraction?', ['1 and 2/3', '2 and 1/3', '5 and 3', '2 and 2/3'], 0, line(5, 3, 2), '3/3 is one whole. How many are left?', '5/3 is 3/3 and 2/3. That is 1 and 2/3.', line(3, 3, 2)),
      practice('What is 2 and 1/4 as fourths?', ['9/4', '6/4', '2/4'], 0, line(9, 4, 3), '2 wholes is 8/4. Add 1 more.', '8/4 + 1/4 = 9/4.', line(4, 4, 2)),
      practice('What is 1 and 2/4 as fourths?', ['6/4', '3/4', '4/6'], 0, line(6, 4, 2), 'One whole is 4/4. Add 2 more.', '4 + 2 = 6. So 6/4.', line(4, 4, 2)),
      practice('Which is more than one whole?', ['9/8', '7/8', '1/8'], 0, line(0, 8, 2), '8/8 is exactly one whole.', '9/8 is 1 part more than a whole.', line(8, 8, 2)),
    ],
  },
  {
    id: 'mixed-improper', title: 'Two ways to write it', shortTitle: 'Two ways to name it', skill: 'A mixed number, like 1 and 3/4, has a whole number and a fraction. You can also write it as one fraction: 1 and 3/4 is 7/4.',
    description: 'Change a mixed number to one fraction, and back again.', example: {
      prompt: 'What is 1 and 3/8 as eighths?',
      answer: '11/8.',
      explanation: 'One whole is 8/8. Add 3 more: 11/8.',
      model: { kind: 'bars', bars: [{ numerator: 8, denominator: 8 }, { numerator: 3, denominator: 8 }], caption: 'One whole and 3/8' },
    },
    questions: [
      practice('What is 1 and 2/3 as thirds?', ['5/3', '3/5', '4/3'], 0, line(5, 3, 2), 'One whole is 3/3. Add 2 more.', '3/3 + 2/3 = 5/3.', line(3, 3, 2)),
      practice('What is 9/4 as wholes and a fraction?', ['2 and 1/4', '3 and 1/4', '2 and 2/4'], 0, line(9, 4, 3), 'Every 4/4 is one whole. What is left?', '8/4 is 2 wholes. 1/4 is left.', line(8, 4, 2)),
      practice('What is 2 and 3/4 as fourths?', ['11/4', '8/4', '4/11'], 0, line(11, 4, 3), '2 wholes is 8/4. Add 3 more.', '8/4 + 3/4 = 11/4.', line(8, 4, 2)),
      practice('What is 10/6 as wholes and a fraction?', ['1 and 4/6', '1 and 2/6', '2 and 4/6'], 0, line(10, 6, 2), '6/6 is one whole. What is left?', '10/6 is 6/6 and 4/6. That is 1 and 4/6.', line(6, 6, 2)),
    ],
  },
  {
    id: 'add-like-denominators', title: 'Add same-size parts', shortTitle: 'Add fractions', skill: 'When the parts are the same size, add how many parts you have. Keep the denominator because the part size stays the same.',
    description: 'Add parts that are the same size.', example: {
      prompt: 'What is 1/4 + 2/4?',
      answer: '3/4.',
      explanation: '1 fourth + 2 fourths = 3 fourths.',
      model: bars({ numerator: 1, denominator: 4 }, { numerator: 2, denominator: 4 }, { numerator: 3, denominator: 4 }),
    },
    questions: [
      practice('What is 1/6 + 4/6?', ['5/6', '5/12', '1/6'], 0, equation('1/6 + 4/6 = ?'), 'Add the numerators. Keep sixths.', '1 + 4 = 5. The denominator stays 6.', bars({ numerator: 1, denominator: 6 })),
      practice('What is 3/8 + 2/8?', ['5/8', '5/16', '6/8'], 0, equation('3/8 + 2/8 = ?'), 'Add the numerators. Keep eighths.', '3 + 2 = 5. The denominator stays 8.', bars({ numerator: 2, denominator: 8 })),
      practice('Maya walked 2/10 mile, then 5/10 mile. How far in all?', ['7/10 mile', '7/20 mile', '3/10 mile'], 0, bars({ numerator: 2, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Add the numerators. Keep tenths.', '2 + 5 = 7. So 7/10 mile.', bars({ numerator: 2, denominator: 10 })),
      practice('What is 3/5 + 1/5?', ['4/5', '4/10', '2/5'], 0, equation('3/5 + 1/5 = ?'), 'Add the numerators. Keep fifths.', '3 + 1 = 4. So 4/5.', bars({ numerator: 1, denominator: 5 })),
    ],
  },
  {
    id: 'subtract-like-denominators', title: 'Take parts away', shortTitle: 'Subtract fractions', skill: 'When the parts are the same size, subtract how many parts remain. Keep the denominator because the part size stays the same.',
    description: 'Take away same-size parts.', example: {
      prompt: 'What is 6/8 − 2/8?',
      answer: '4/8.',
      explanation: 'Start with 6 eighths. Take away 2. 4 eighths are left.',
      model: bars({ numerator: 6, denominator: 8 }, { numerator: 4, denominator: 8 }),
    },
    questions: [
      practice('What is 5/6 − 2/6?', ['3/6', '3/12', '7/6'], 0, equation('5/6 − 2/6 = ?'), 'Take away 2 parts. Keep sixths.', '5 − 2 = 3. The denominator stays 6.', bars({ numerator: 5, denominator: 6 })),
      practice('A jug is 9/10 full. You pour out 4/10. How much is left?', ['5/10', '5/20', '13/10'], 0, bars({ numerator: 9, denominator: 10 }, { numerator: 4, denominator: 10 }), 'Take away the numerators. Keep tenths.', '9 − 4 = 5. So 5/10.', bars({ numerator: 4, denominator: 10 })),
      practice('What is 7/8 − 3/8?', ['4/8', '4/16', '10/8'], 0, equation('7/8 − 3/8 = ?'), 'Take away the numerators. Keep eighths.', '7 − 3 = 4. So 4/8.', bars({ numerator: 6, denominator: 8 })),
      practice('What is 4/5 − 1/5?', ['3/5', '3/10', '5/5'], 0, equation('4/5 − 1/5 = ?'), 'Take away 1 part. Keep fifths.', '4 − 1 = 3. So 3/5.', bars({ numerator: 4, denominator: 5 })),
    ],
  },
  {
    id: 'add-related-fractions', title: 'Rename, then add', shortTitle: 'Add different names', skill: 'Rename the fractions as the same-size parts. Then add the parts you have.',
    description: 'Change one fraction so the parts match.', example: {
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
    id: 'tenths-decimals', title: 'Tenths as decimals', shortTitle: 'Fractions and decimals', skill: 'One tenth is 0.1. The dot in a decimal is called the decimal point. Write tenths as one digit to the right of the decimal point.',
    description: 'Match tenths to decimals.', example: {
      prompt: 'How do you write 7/10 as a decimal?',
      answer: '0.7',
      explanation: '7 tenths is 0.7. It is less than one whole.',
      model: decimal(7),
    },
    questions: [
      practice('Write 3/10 as a decimal.', ['0.3', '3.0', '0.03'], 0, decimal(3), 'Tenths go right after the decimal point.', '3 tenths is 0.3.', decimal(1)),
      practice('What fraction is 0.6?', ['6/10', '6/100', '1/6'], 0, decimal(6), 'The 6 is right after the decimal point. That means tenths.', '0.6 means 6 tenths, or 6/10.', decimal(5)),
      practice('A strip is 0.4 colored. What fraction is that?', ['4/10', '4/100', '10/4'], 0, decimal(4), 'The number right after the decimal point is tenths.', '0.4 means 4 tenths, or 4/10.', decimal(2)),
      practice('Which is bigger, 0.8 or 5/10?', ['0.8', '5/10', 'They are equal'], 0, bars({ numerator: 8, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Write both numbers as tenths.', '8 tenths is more than 5 tenths.', decimal(5)),
    ],
  },
  {
    id: 'hundredths-decimals', title: 'Hundredths and place value', shortTitle: 'Hundredths', skill: 'One hundredth is 0.01. Write hundredths with two digits to the right of the decimal point.',
    description: 'Two numbers after the decimal point means hundredths.', example: {
      prompt: 'How do you write 25/100 as a decimal?',
      answer: '0.25',
      explanation: '25 hundredths is 0.25. Two places after the decimal point.',
      model: { kind: 'bars', bars: [{ numerator: 25, denominator: 100 }], caption: '25 hundredths of one whole' },
    },
    questions: [
      practice('Write 8/100 as a decimal.', ['0.08', '0.8', '8.00'], 0, { kind: 'bars', bars: [{ numerator: 8, denominator: 100 }] }, 'Hundredths need 2 places after the decimal point.', '8 hundredths is 0.08. The 0 holds the tenths place.', decimal(1)),
      practice('What fraction is 0.35?', ['35/100', '3/5', '35/10'], 0, { kind: 'bars', bars: [{ numerator: 35, denominator: 100 }] }, '2 places after the decimal point means hundredths.', '0.35 means 35 hundredths, or 35/100.', decimal(4)),
      practice('Which is bigger, 0.4 or 0.35?', ['0.4', '0.35', 'They are equal'], 0, bars({ numerator: 4, denominator: 10 }, { numerator: 35, denominator: 100 }), 'Write both numbers as hundredths.', '0.40 is 40 hundredths. 40 is more than 35.', decimal(4)),
      practice('Which decimal equals 9/10?', ['0.9', '0.09', '9.10'], 0, decimal(9), 'Tenths have 1 place after the decimal point.', '9 tenths is 0.9. 0.09 is 9 hundredths.', decimal(5)),
    ],
  },
  {
    id: 'add-tenths-hundredths', title: 'Add tenths and hundredths', shortTitle: 'Tenths + hundredths', skill: 'Rename tenths as hundredths so the parts match. Then add the hundredths.',
    description: 'Add 3/10 + 4/100.', example: {
      prompt: 'What is 3/10 + 4/100?',
      answer: '34/100, or 0.34.',
      explanation: 'Each tenth is 10 hundredths, so 3/10 = 30/100. 30/100 + 4/100 = 34/100.',
      model: bars({ numerator: 3, denominator: 10 }, { numerator: 4, denominator: 100 }),
    },
    questions: [
      practice('Change 6/10 into hundredths.', ['6/100', '60/100', '16/100'], 1, bars({ numerator: 6, denominator: 10 }), 'Each tenth is 10 hundredths.', '6 × 10 = 60. So 6/10 = 60/100.', bars({ numerator: 1, denominator: 10 })),
      practice('What is 5/10 + 3/100?', ['53/100', '8/110', '8/100'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 3, denominator: 100 }), 'Change 5/10 into hundredths first.', '5/10 = 50/100. 50 + 3 = 53. So 53/100.', bars({ numerator: 1, denominator: 10 })),
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
  | 'whole-from-part' | 'mistake' | 'remainder' | 'divide-fractions'
  | 'decimal-grid' | 'bigger-smaller' | 'times-grid' | 'share-or-fit' | 'coins' | 'plot-eighths' | 'portions' | 'two-step-convert' | 'plot-totals';
type ExtensionTopic = {
  id: string; title: string; shortTitle: string; description: string; skill: string;
  mode: ExtensionMode; n: number; d: number; context: string;
  gradeBand?: 3 | 4 | 5; standards?: string[]; enrichment?: boolean;
  /** A worked example of its own, when the lesson's first build ("make the whole") would not show the answer. */
  example?: Mission['example'];
  /** Questions written for the lesson (its approved first question and its mix of kinds). Without them, practice is
      made from worksheet rows 2, 5, 8 and 11. */
  questions?: PracticeSeed[];
};

/** A hundredths grid with `h` squares shaded, column by column, so whole columns are tenths. */
const hundredthsGrid = (h: number, label?: string, scale?: number) => ({
  cut: 'grid-10x10' as const, shaded: Array.from({ length: h }, (_, k) => (k % 10) * 10 + Math.floor(k / 10)),
  ...(label ? { label } : {}), ...(scale ? { scale } : {}),
});
const grids = (...figures: ReturnType<typeof hundredthsGrid>[]): ModelSpec => ({ kind: 'area', ...figures[0], more: figures.slice(1) });
const coins = (dimes: number, pennies: number): ModelSpec => ({ kind: 'coins', dimes, pennies });
/** An empty eighths line plot the child fills in before answering (the measurements are in the question). */
const plotTask = (values: number[]): ModelSpec => ({ kind: 'lineplot', denominator: 8, wholes: 1, values, plotTask: true });
/** A length in feet on a line marked in inches (12 to a foot), nothing labelled but the feet: [12, 12, 6] is 2 1/2 feet. */
const inFeet = (inches: number[]): ModelSpec => {
  const total = inches.reduce((sum, part) => sum + part, 0);
  return { kind: 'line', numerator: total, denominator: 12, wholes: Math.ceil(total / 12), hideLabels: true };
};
/** The square to cut for a/rows × b/cols: `rows` rows by `cols` columns. Nothing is shaded, so the overlap stays the child's to find. */
const timesGrid = (rows: number, cols: number, shadeRows = 0, shadeCols = 0): ModelSpec =>
  ({ kind: 'area', cut: gridCut(cols, rows), shaded: shadeRows && shadeCols ? gridOverlap(cols, shadeRows, shadeCols) : [] });
/** Whole bars, cut into `d` parts and not shaded: amounts to share or fit. */
const emptyWholes = (count: number, d = 1): ModelSpec => ({ kind: 'bars', bars: Array.from({ length: count }, () => ({ numerator: 0, denominator: d })), hideLabels: true });
const SHARE_OR_FIT = ['Sharing', 'Fitting', 'Adding', 'Taking away'];

const extensionTopics: ExtensionTopic[] = [
  // Grade 4 (4.NF.4a, 4.NF.4b): ends unit 8, so grade-4 learners (and the level quiz) reach it before grade 5.
  { id: 'unit-fraction-multiples', title: 'Make groups of a unit fraction', shortTitle: 'Unit fraction multiples', description: 'Build several copies of one unit fraction.', skill: 'A multiple is several equal copies added together. Count how many unit-fraction parts you have.', mode: 'unit-multiples', n: 5, d: 4, context: 'paper strips', gradeBand: 4, standards: ['4.NF.4a'] },
  { id: 'multiply-whole-by-fraction', title: 'Groups of a fraction', shortTitle: 'Whole × fraction', description: '3 groups of 1/2.', skill: 'To find several groups of a fraction, count that fraction once for each group. The part size stays the same.', mode: 'multiply-whole', n: 2, d: 3, context: 'juice bottles' },
  { id: 'simplify-fractions', title: 'Simplest form', shortTitle: 'Simplest form', description: 'Use bigger parts. Same amount.', skill: 'Divide the numerator and denominator by the same factor. The parts get bigger, but the total amount stays the same.', mode: 'simplify', n: 3, d: 4, context: 'paper strip' },
  { id: 'equivalent-missing-both', title: 'Rename with a new denominator', shortTitle: 'Equivalent fractions', description: 'Fill a blank in the numerator or denominator.', skill: 'Equivalent fractions name the same amount. Multiply or divide the numerator and denominator by the same factor.', mode: 'equivalent', n: 2, d: 5, context: 'recipe card' },
  { id: 'whole-numbers-as-fractions', title: 'Wholes as fractions', shortTitle: 'Whole numbers as fractions', description: 'Build one or more wholes from unit fractions.', skill: 'The denominator tells how many parts fill one whole. Count that many parts for each whole.', mode: 'whole-fraction', n: 6, d: 3, context: 'fraction bars', gradeBand: 3, standards: ['3.NF.3c'] },
  { id: 'compare-unlike-fractions', title: 'Compare different parts', shortTitle: 'Compare unlike parts', description: 'Which is bigger when the denominators differ?', skill: 'Make the parts the same size by using a common denominator. Then compare how many parts each fraction has.', mode: 'compare', n: 2, d: 3, context: 'race track',
    example: { prompt: 'Which is bigger, 3/4 or 5/6?', answer: '5/6', explanation: 'Use twelfths for both: 3/4 = 9/12 and 5/6 = 10/12. 10 twelfths is more than 9 twelfths, so 5/6 is bigger.', model: bars({ numerator: 3, denominator: 4, named: true }, { numerator: 5, denominator: 6, named: true }) } },
  { id: 'order-unlike-fractions', title: 'Order different parts', shortTitle: 'Order unlike parts', description: 'Put 3 fractions in order.', skill: 'Use 1/2 as a benchmark or rename the fractions with the same denominator. Then order their amounts.',
    example: {
      prompt: 'Order 1/4, 3/8 and 5/8 from smallest to biggest.',
      answer: '1/4 < 3/8 < 5/8',
      explanation: 'First compare with 1/2: 1/4 and 3/8 are below it, and 5/8 is above it. To compare 1/4 and 3/8, rename 1/4 as 2/8. Eighths are the same-size parts, and 2/8 is less than 3/8. So the order is 1/4, 3/8, 5/8.',
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
  { id: 'subtract-unlike-fractions', title: 'Take away different parts', shortTitle: 'Subtract unlike parts', description: 'Rename, then take away.', skill: 'First rename both fractions with the same denominator so the parts match. Then subtract the number of parts.', mode: 'subtract-unlike', n: 3, d: 4, context: 'water bottle' },
  { id: 'add-unlike-fractions', title: 'Add unlike fractions', shortTitle: 'Add unlike parts', description: 'Make different-sized parts the same size before adding.', skill: 'Rename both fractions with the same denominator so the parts match. Then add the number of parts.', mode: 'add-unlike', n: 7, d: 12, context: 'ribbons', gradeBand: 5, standards: ['5.NF.1'] },
  { id: 'add-mixed-numbers', title: 'Add mixed numbers', shortTitle: 'Add mixed numbers', description: 'Add wholes and parts.', skill: 'Add the whole numbers and the fraction parts. If the parts fill a whole, regroup them as one more whole.', mode: 'mixed-add', n: 1, d: 4, context: 'walking route' },
  { id: 'subtract-mixed-numbers', title: 'Subtract mixed numbers', shortTitle: 'Subtract mixed numbers', description: 'Trade a whole when you need more parts.', skill: 'If there are not enough fraction parts to subtract, trade one whole for equal-size parts.', mode: 'mixed-subtract', n: 1, d: 3, context: 'fabric roll' },
  { id: 'fraction-of-quantity', title: 'A fraction of a number', shortTitle: 'Fractions of amounts', description: 'Find 3/5 of 20.', skill: 'Split the amount into equal groups using the denominator. Count the number of groups shown by the numerator.', mode: 'quantity', n: 3, d: 5, context: 'classroom supplies' },
  { id: 'mixed-unlike-operations', title: 'Mixed numbers with unlike parts', shortTitle: 'Mixed number operations', description: 'Add or subtract mixed numbers with different denominators.', skill: 'Rename the fraction parts so they are the same size. Then add or subtract, regrouping a whole if needed.', mode: 'mixed-unlike', n: 25, d: 12, context: 'walking route', gradeBand: 5, standards: ['5.NF.1'] },
  { id: 'estimate-fraction-operations', title: 'Estimate to check', shortTitle: 'Estimate fraction sums', description: 'Use 0, 1/2 and 1 to check whether an answer makes sense.', skill: 'Compare each fraction with 0, 1/2, or 1. Use those benchmarks to check whether the answer is a sensible size.', example: { prompt: 'Is 2/5 + 1/2 more or less than 1?', answer: 'Less than 1', explanation: '2/5 is a little less than the benchmark 1/2. Two halves make one whole. So 2/5 + 1/2 is a little less than one whole.', model: bars({ numerator: 2, denominator: 5, named: true }, { numerator: 1, denominator: 2, named: true }) }, mode: 'estimate', n: 9, d: 10, context: 'trail lengths', gradeBand: 5, standards: ['5.NF.2'] },
  { id: 'multiply-fractions', title: 'A part of a part', shortTitle: 'Fraction × fraction', description: 'Find 1/2 of 3/4.', skill: 'To find a part of a part, split the parts again. Multiply the numerators and the denominators.', mode: 'multiply', n: 2, d: 3, context: 'garden plot' },
  { id: 'fraction-times-fraction', title: 'Fraction times fraction', shortTitle: 'Multiply on a grid', description: 'Find a/b × c/d where rows and columns overlap.',
    skill: 'Cut one square into rows for one fraction and columns for the other. The overlap is the answer: multiply the tops, multiply the bottoms.',
    example: { prompt: '2/3 × 4/5 = ?', answer: '8/15', explanation: '2 of 3 rows and 4 of 5 columns overlap on 8 of 15 small squares. So 2/3 × 4/5 = 8/15 (2 × 4 = 8, and 3 × 5 = 15).',
      model: timesGrid(3, 5, 2, 4) },
    mode: 'times-grid', n: 8, d: 15, context: 'square grid', gradeBand: 5, standards: ['5.NF.4a'],
    questions: [
      practice('3/4 × 1/2 = ?', ['4/6', '3/8', '3/6', '4/8'], 1, timesGrid(4, 2),
        'Cut the square into 4 rows and 2 columns. Color 3 rows, then 1 column. Count where they overlap.',
        '3 of 4 rows and 1 of 2 columns overlap on 3 of 8 squares. 3 × 1 = 3 and 4 × 2 = 8, so 3/8.', timesGrid(4, 2, 3, 1)),
      practice('2/3 × 3/4 = ?', ['5/7', '6/12', '6/4', '5/12'], 1, timesGrid(3, 4),
        'Cut the square into 3 rows and 4 columns. Count the squares where 2 rows and 3 columns overlap.',
        '2 of 3 rows and 3 of 4 columns overlap on 6 of 12 squares. So 2/3 × 3/4 = 6/12.', timesGrid(3, 4, 2, 3)),
      practice('1/2 × 4/5 = ?', ['5/7', '4/10', '4/5', '5/10'], 1, timesGrid(2, 5),
        'Cut the square into 2 rows and 5 columns. Count the overlap of 1 row and 4 columns.',
        '1 of 2 rows and 4 of 5 columns overlap on 4 of 10 squares. So 1/2 × 4/5 = 4/10.', timesGrid(2, 5, 1, 4)),
      practice('3/5 × 2/3 = ?', ['5/8', '6/15', '6/5', '5/15'], 1, timesGrid(5, 3),
        'Cut the square into 5 rows and 3 columns. Multiply the tops, then multiply the bottoms.',
        '3 of 5 rows and 2 of 3 columns overlap on 6 of 15 squares. 3 × 2 = 6 and 5 × 3 = 15, so 6/15.', timesGrid(5, 3, 3, 2)),
    ] },
  { id: 'fraction-of-collection', title: 'A fraction of a group', shortTitle: 'Groups of objects', description: 'Find 3/4 of 16 cards.', skill: 'Split the collection into equal groups using the denominator. Count the groups shown by the numerator.', mode: 'sets', n: 3, d: 4, context: 'sports cards' },
  { id: 'divide-whole-by-unit-fraction', title: 'How many parts fit?', shortTitle: 'Divide by a fraction', description: 'How many 1/4 cups fill 2 cups?', skill: 'The denominator tells how many equal parts fit in one whole. Count those parts in the amount.', example: { prompt: 'How many 1/4-cup scoops fill 2 cups?', answer: '8 scoops', explanation: 'One whole cup holds 4 fourths. 2 cups hold 2 groups of 4 fourths. That is 8 scoops of 1/4 cup.', model: bars({ numerator: 8, denominator: 4 }) }, mode: 'divide', n: 1, d: 4, context: 'measuring cup' },
  { id: 'multiplication-scaling', title: 'Scaling with fractions', shortTitle: 'Scale an amount', description: 'See how a factor below or above one changes an amount.', skill: 'Multiplying by less than 1 takes part of an amount, so it gets smaller. Multiplying by more than 1 makes more than one copy, so it gets bigger.', example: { prompt: 'What is 3/4 of 12? Is the answer less or more than 12?', answer: '9, less than 12', explanation: 'Make 4 equal groups of 3. Three of the groups is 9. Multiplying 12 by 3/4, which is less than one whole, makes a smaller amount.', model: setModel(9, 12, 4) }, mode: 'scaling', n: 3, d: 4, context: 'collections', gradeBand: 5, standards: ['5.NF.5'] },
  { id: 'bigger-or-smaller', title: 'Bigger or smaller?', shortTitle: 'Bigger or smaller', description: 'Tell how a fraction factor changes an amount.',
    skill: 'Multiply by a fraction less than 1: you get less. More than 1: you get more. Equal to 1: it stays the same.',
    example: { prompt: 'Is 3/4 × 2 1/2 more or less than 2 1/2?', answer: 'Less than 2 1/2', explanation: 'Less. Three fourths of an amount is only part of it. The top bar is the whole amount; the bottom bar is three fourths of it.',
      model: bars({ numerator: 5, denominator: 2, named: true }, { numerator: 15, denominator: 8 }) },
    mode: 'bigger-smaller', n: 5, d: 4, context: 'scaling machine', gradeBand: 5, standards: ['5.NF.5'],
    questions: [
      practice('Which one is more than 8?', ['3/4 × 8', '5/4 × 8', '1/2 × 8', '8/8 × 8'], 1,
        bars({ numerator: 3, denominator: 4, named: true }, { numerator: 5, denominator: 4, named: true }, { numerator: 1, denominator: 2, named: true }, { numerator: 8, denominator: 8, named: true }),
        'Compare each fraction with 1. Which factor is more than one whole?',
        '5/4 is more than 1, so 5/4 × 8 is more than 8. It is 10. The others are 6, 4 and 8.', bars({ numerator: 4, denominator: 4 }, { numerator: 5, denominator: 4 })),
      practice('Is 2/3 × 6 more or less than 6?', ['Less than 6', 'More than 6', 'Equal to 6', "You can't tell"], 0,
        bars({ numerator: 2, denominator: 3, named: true }),
        'Is 2/3 less than 1, equal to 1, or more than 1?',
        '2/3 is less than 1, so 2/3 × 6 is less than 6. It is 4.', bars({ numerator: 2, denominator: 3, named: true }, { numerator: 3, denominator: 3 })),
      practice('Is 3/3 × 5/6 the same as 5/6?', ['No, it is less', 'No, it is more', 'Yes, 3/3 is 1', "You can't tell"], 2,
        bars({ numerator: 3, denominator: 3, named: true }, { numerator: 5, denominator: 6, named: true }),
        'What whole number is 3/3?',
        '3/3 is one whole. Multiplying by 1 keeps the amount the same, so 3/3 × 5/6 is still 5/6. It is just a new name.', bars({ numerator: 3, denominator: 3, named: true })),
      practice('Ana says multiplying always makes a number bigger. Is she right?', ['No, 1/2 × 4 is 2', 'No, it always gets smaller', 'Yes, it always gets bigger', 'Yes, with whole numbers'], 0,
        bars({ numerator: 4, denominator: 1 }, { numerator: 1, denominator: 2 }),
        'Try a factor less than 1, like 1/2. What is 1/2 × 4?',
        'Not always. 1/2 × 4 = 2, which is less than 4. A factor less than 1 makes it smaller, and 1 keeps it the same.', bars({ numerator: 4, denominator: 1 }, { numerator: 2, denominator: 1 })),
    ] },
  { id: 'multiply-mixed-numbers', title: 'Multiply mixed numbers', shortTitle: 'Mixed number multiplication', description: 'Use a rectangle to find the area of a mixed-number garden.', skill: 'Use the side lengths as rows and columns in a rectangle. The number of square units is the product of the side lengths.', example: { prompt: 'A garden is 1 1/2 meters by 1 1/3 meters. What is its area?', answer: '2 square meters', explanation: 'Split the garden at the whole meters into 4 parts. 1 × 1 = 1. 1/2 × 1 = 1/2. 1 × 1/3 = 1/3. 1/2 × 1/3 = 1/6. Add the parts: 6/6 + 3/6 + 2/6 + 1/6 = 12/6, or 2 square meters.', model: gardenModel({ whole: 1, numerator: 1, denominator: 2 }, { whole: 1, numerator: 1, denominator: 3 }, true) }, mode: 'mixed-multiply', n: 2, d: 1, context: 'garden plot', gradeBand: 5, standards: ['5.NF.4b', '5.NF.6'] },
  { id: 'unit-fraction-divided-whole', title: 'Share a unit fraction', shortTitle: 'Divide a unit fraction', description: 'Split one unit fraction into equal shares.', skill: 'Share the unit fraction equally. Each share is a smaller part of the original whole.', mode: 'unit-divided-whole', n: 1, d: 12, context: 'pan of brownies', gradeBand: 5, standards: ['5.NF.7a'] },
  { id: 'share-or-fit', title: 'Share or fit?', shortTitle: 'Share or fit', description: 'Tell sharing from fitting, then divide.',
    skill: 'Sharing splits an amount into equal shares. Fitting asks how many pieces fit. Both are division. Check with ×.',
    example: { prompt: 'How many 1/3-cup servings are in 2 cups?', answer: '6 servings', explanation: '2 ÷ 1/3 = 6. Each cup holds 3 servings. Check: 6 × 1/3 = 2 cups.',
      model: bars({ numerator: 3, denominator: 3 }, { numerator: 3, denominator: 3 }) },
    mode: 'share-or-fit', n: 1, d: 6, context: 'clay and cups', gradeBand: 5, standards: ['5.NF.7c', '5.NF.7a', '5.NF.7b'],
    questions: [
      practice('Pip has 1/2 pound of clay for 3 friends. Each friend gets the same amount. Is this sharing or fitting?', SHARE_OR_FIT, 0, bars({ numerator: 1, denominator: 2 }),
        'Is an amount split among friends, or do you count how many pieces fit?',
        'The clay is split into 3 equal shares, so this is sharing.', bars({ numerator: 1, denominator: 2 })),
      practice('1/2 pound of clay is shared by 3 friends. How much does each get?', ['3/2 pounds', '1/6 pound', '6 pounds', '1/5 pound'], 1, bars({ numerator: 1, denominator: 2 }),
        'Cut the half pound into 3 equal shares. How big is one share of the whole pound?',
        '1/2 ÷ 3 = 1/6 pound. Check: 3 × 1/6 = 1/2.', bars({ numerator: 1, denominator: 6 })),
      practice('Pip has 3 pounds of clay. Each bag holds 1/4 pound. Is this sharing or fitting?', SHARE_OR_FIT, 1, emptyWholes(3),
        'Are you splitting the clay among people, or counting how many bags fit?',
        'You count how many 1/4-pound bags fit in 3 pounds, so this is fitting.', emptyWholes(3)),
      practice('How many 1/4-pound bags can be filled from 3 pounds of clay?', ['12 bags', '3/4 bag', '7 bags', '4 bags'], 0, emptyWholes(3),
        'How many 1/4 pounds make 1 pound? Then think about 3 pounds.',
        '3 ÷ 1/4 = 12 bags. Each pound fills 4 bags. Check: 12 × 1/4 = 3.', emptyWholes(3, 4)),
    ] },
  { id: 'fraction-of-length', title: 'A fraction of a length', shortTitle: 'Fractional lengths', description: 'Find 3/8 of a ribbon.', skill: 'Split the whole length into equal parts using the denominator. Measure the number of parts shown by the numerator.', mode: 'measure', n: 3, d: 8, context: 'ribbon' },
  { id: 'fractional-measure-addition', title: 'Add lengths', shortTitle: 'Measure together', description: 'Add 1/2 meter and 1/4 meter.', skill: 'Rename the lengths as the same-size parts. Then add them and keep the unit.', mode: 'measure-add', n: 1, d: 2, context: 'wooden boards' },
  { id: 'ruler-measurement', title: 'Measure with fractional inches', shortTitle: 'Read a ruler', description: 'Use equal ruler marks to name a length.', skill: 'The spaces between ruler marks are equal fractions of an inch. Count the spaces to measure.', mode: 'ruler', n: 5, d: 4, context: 'ruler', gradeBand: 3, standards: ['3.MD.4'] },
  { id: 'build-line-plots', title: 'Build a fraction line plot', shortTitle: 'Build line plots', description: 'Place one X for each measurement.', skill: 'Place one X for each measurement above its matching value. Stack Xs when measurements match.', example: { prompt: 'Ribbons are 1/4, 3/4, 3/4 and 1 inch long. How many Xs go above 3/4?', answer: '2 Xs', explanation: 'Put one X above the matching tick for each ribbon. Two ribbons are 3/4 inch long, so 2 Xs stack above 3/4.', model: line(3, 4) }, mode: 'line-plot', n: 3, d: 4, context: 'ribbon lengths', gradeBand: 3, standards: ['3.MD.4'] },
  { id: 'read-line-plots', title: 'Read a fraction line plot', shortTitle: 'Read line plots', description: 'Use line-plot marks to compare measurements.', skill: 'Read the labels to find each measurement. Then compare them or find how far apart they are.', example: { prompt: 'A line plot shows pencils that are 3/8, 5/8 and 7/8 inch long. How much longer is the longest than the shortest?', answer: '4/8 inch', explanation: 'The longest is 7/8 inch and the shortest is 3/8 inch. 7/8 − 3/8 = 4/8. So the longest is 4/8 inch longer.', model: bars({ numerator: 7, denominator: 8, named: true }, { numerator: 3, denominator: 8, named: true }) }, mode: 'line-plot-read', n: 5, d: 8, context: 'pencil lengths', gradeBand: 4, standards: ['4.MD.4'] },
  { id: 'line-plot-leveling', title: 'Use line plots to share amounts', shortTitle: 'Reason with line plots', description: 'Use data to find a total and make equal shares.', skill: 'Add the measurements to find the total. Divide that total into equal shares.', example: { prompt: 'Three cups hold 1/2, 1/4 and 0 liter. Share it so each cup holds the same.', answer: '1/4 liter each', explanation: 'First add the amounts: 1/2 + 1/4 + 0 = 3/4 liter. Then split 3/4 into 3 equal shares. Each cup gets 1/4 liter.', model: bars({ numerator: 1, denominator: 4, named: true }, { numerator: 1, denominator: 4, named: true }, { numerator: 1, denominator: 4, named: true }) }, mode: 'line-plot-level', n: 3, d: 4, context: 'beaker amounts', gradeBand: 5, standards: ['5.MD.2'] },
  { id: 'measurement-word-problems', title: 'Fractions in measurement stories', shortTitle: 'Measurement stories', description: 'Use fractions with length, time, money, mass and volume.', skill: 'Keep the measurement unit in your answer. Convert units before comparing or calculating.', mode: 'measure-context', n: 3, d: 4, context: 'measurement stories', gradeBand: 4, standards: ['4.MD.2'] },
  { id: 'fractional-unit-conversions', title: 'Convert fraction units', shortTitle: 'Fraction unit conversions', description: 'Find a fractional amount in a smaller unit.', skill: 'Convert the whole measurement to smaller units first. Then find the fraction of that amount.', example: { prompt: 'How many minutes are in 3/4 of an hour?', answer: '45 minutes', explanation: 'One hour is 60 minutes. Split it into 4 equal parts of 15 minutes each. 3 of those parts is 45 minutes.', model: bars({ numerator: 3, denominator: 4 }) }, mode: 'unit-conversion', n: 3, d: 4, context: 'measuring tools', gradeBand: 5, standards: ['5.MD.1', '4.MD.2'] },
  { id: 'fractional-sharing', title: 'Fair shares', shortTitle: 'Fair sharing', description: 'Share 3 loaves with 4 friends.', skill: 'Share the total equally. The amount each friend gets is the total divided by the number of friends.', mode: 'share', n: 3, d: 4, context: 'loaf of bread' },
  { id: 'fraction-as-division', title: 'Division is a fraction', shortTitle: 'Fraction quotient', description: '5 ÷ 4 = 5/4.', skill: 'A fraction bar means division. The numerator is divided by the denominator.', mode: 'quotient', n: 5, d: 4, context: 'pizzas',
    example: { prompt: '5 ÷ 4 = ?', answer: '5/4', explanation: 'Share 5 wholes among 4: cut each whole into 4 parts, and each share gets 5 of them. So 5 ÷ 4 = 5/4, or 1 1/4. The fraction bar means divide.',
      model: bars({ numerator: 5, denominator: 4 }) },
    // Division written as a fraction, and where that fraction sits between whole numbers (not more sharing stories).
    questions: [
      practice('5 ÷ 4 = ?', ['5/4', '4/5', '1/4', '9/4'], 0, emptyWholes(5, 4),
        'The number you divide goes on top. The number you divide by goes on the bottom.',
        '5 ÷ 4 = 5/4. That is 1 1/4.', emptyWholes(5, 4)),
      practice('Between which two whole numbers is 7/3?', ['1 and 2', '2 and 3', '3 and 4', '7 and 8'], 1, line(0, 3, 3),
        'How many thirds make one whole? How many wholes fit in 7 thirds?',
        '7/3 = 7 ÷ 3 = 2 1/3. That is more than 2 and less than 3.', { kind: 'line', numerator: 7, denominator: 3, wholes: 3 }),
      practice('Write 3 ÷ 8 as a fraction.', ['3/8', '8/3', '1/8', '3/11'], 0, emptyWholes(3, 8),
        'The fraction bar means divide. Which number goes on top?',
        '3 ÷ 8 = 3/8. Each share is less than one whole.', emptyWholes(3, 8)),
      practice('Between which two whole numbers is 13/4?', ['2 and 3', '3 and 4', '4 and 5', '13 and 14'], 1, line(0, 4, 4),
        'How many fourths make one whole? Count whole groups of 4 in 13.',
        '13/4 = 13 ÷ 4 = 3 1/4. That is more than 3 and less than 4.', { kind: 'line', numerator: 13, denominator: 4, wholes: 4 }),
    ] },
  { id: 'fraction-probability', title: 'Bonus: Chance as a fraction', shortTitle: 'Bonus probability', description: 'What is the chance of blue?', skill: 'The numerator counts the outcomes you want. The denominator counts all equally likely outcomes.', mode: 'probability', n: 2, d: 8, context: 'color spinner', enrichment: true },
  { id: 'fraction-of-area', title: 'Fractions in shapes', shortTitle: 'Equal-area partitions', description: 'Explore equal-area parts in squares, rectangles, circles and hexagons.', skill: 'Fraction parts must have equal areas. Their shapes may look different, but each part must cover the same amount of space.', mode: 'area', n: 3, d: 8, context: 'shape tiles', gradeBand: 3, standards: ['3.G.2'] },
  { id: 'fractional-side-area', title: 'Area with fractional sides', shortTitle: 'Fractional side area', description: 'Use a grid to find the area when both side lengths are fractions.', skill: 'A rectangle’s area is its side lengths multiplied. Count the small squares to see the fractional area.', mode: 'fractional-area', n: 1, d: 2, context: 'rectangle grid', gradeBand: 5, standards: ['5.NF.4b'],
    example: { prompt: 'A rectangle is 2/3 unit by 3/4 unit. What is its area?', answer: '6/12 square unit', explanation: 'Cut one square unit into 3 columns and 4 rows: 12 equal small rectangles. 2 columns and 3 rows overlap on 6 of them, so the area is 6/12 square unit.', model: { kind: 'area', cut: 'grid-3x4', shaded: [0, 1, 3, 4, 6, 7] } } },
  { id: 'equivalent-number-line', title: 'Same spot, new name', shortTitle: 'Line equivalence', description: '2/3 and 4/6 land on the same spot.', skill: 'Split every space into the same number of smaller spaces. The jumps change too, so the point stays in the same place.', mode: 'line', n: 2, d: 3, context: 'number line' },
  { id: 'fraction-recipes', title: 'Recipe fractions', shortTitle: 'Recipe fractions', description: 'Double a recipe.', skill: 'To double a recipe, use twice as much of every ingredient. Add each amount to itself.', mode: 'recipe', n: 3, d: 4, context: 'pancake recipe' },
  { id: 'fractions-to-percent', title: 'Bonus: Fractions to percent', shortTitle: 'Bonus percent', description: 'Write 3/4 as 75%.', skill: 'Percent means out of 100. Rename the fraction in hundredths to find the percent.', mode: 'percent', n: 3, d: 4, context: 'school survey', enrichment: true },
  { id: 'percent-to-fraction', title: 'Bonus: Percent to fractions', shortTitle: 'Bonus percent as fraction', description: 'Write 60% as 60/100.', skill: 'Percent means out of 100. Write the percent as that many parts out of 100.', mode: 'percent-inverse', n: 3, d: 5, context: 'game score', enrichment: true },
  { id: 'decimal-fraction-equivalence', title: 'Fractions to decimals', shortTitle: 'Three forms', description: 'Write 1/4 as 0.25.', skill: 'Rename a fraction in tenths or hundredths. Write tenths with one decimal place and hundredths with two.', mode: 'decimal-equivalent', n: 7, d: 10, context: 'battery meter' },
  { id: 'compare-decimals', title: 'Compare decimals', shortTitle: 'Compare decimal sizes', description: 'Compare decimals using tenths and hundredths.', skill: 'Write both decimals with the same number of places. Then compare the digits by place value.', example: { prompt: 'Which is bigger, 0.4 or 0.35?', answer: '0.4', explanation: 'Write 0.4 as 0.40, so both have 2 places after the decimal point. 40 hundredths is more than 35 hundredths. So 0.4 is bigger, even though 35 looks bigger than 4.', model: bars({ numerator: 40, denominator: 100 }, { numerator: 35, denominator: 100 }) }, mode: 'decimal-compare', n: 3, d: 10, context: 'hundredths grid', gradeBand: 4, standards: ['4.NF.7'] },
  { id: 'compare-decimals-grid', title: 'Compare decimals on a grid', shortTitle: 'Decimals on a grid', description: 'Use hundredths grids to compare and order decimals.',
    skill: 'Write both decimals in hundredths. Then compare how many hundredths. Only compare amounts of the same whole.',
    example: { prompt: 'Which is more: 0.7 or 0.07?', answer: '0.7', explanation: '0.7 = 70 hundredths. 0.07 = 7 hundredths. 0.7 is more. 70 hundredths is more than 7 hundredths.',
      model: grids(hundredthsGrid(70, '0.7 = 70 hundredths'), hundredthsGrid(7, '0.07 = 7 hundredths')) },
    mode: 'decimal-grid', n: 45, d: 100, context: 'hundredths grids', gradeBand: 4, standards: ['4.NF.7'],
    questions: [
      practice('Put 0.5, 0.45 and 0.6 in order, smallest first.', ['0.5, 0.45, 0.6', '0.45, 0.5, 0.6', '0.6, 0.5, 0.45', '0.45, 0.6, 0.5'], 1,
        grids(hundredthsGrid(50), hundredthsGrid(45), hundredthsGrid(60)),
        'Write each one in hundredths: 0.5 is 50 hundredths. Count the shaded squares on each grid.',
        '0.5 = 50 hundredths, 0.45 = 45 hundredths and 0.6 = 60 hundredths. 45 < 50 < 60, so 0.45 < 0.5 < 0.6.', grids(hundredthsGrid(50), hundredthsGrid(45), hundredthsGrid(60))),
      practice('Mia eats 0.5 of a small pizza. Leo eats 0.4 of a big pizza. Who eats more?', ['Mia', 'Leo', 'They eat the same', "You can't tell"], 3,
        { kind: 'area', cut: 'circle-halves', shaded: [], scale: 0.6, more: [{ cut: 'circle-tenths', shaded: [] }] },
        'Look at the two wholes. Are the pizzas the same size?',
        'The pizzas are different sizes, so 0.5 and 0.4 are parts of different wholes. You can only compare parts of the same whole.',
        { kind: 'area', cut: 'circle-halves', shaded: [0], scale: 0.6, more: [{ cut: 'circle-tenths', shaded: [0, 1, 2, 3] }] }),
      practice('Which is more: 0.3 or 0.25?', ['0.3', '0.25', 'They are equal', "You can't tell"], 0,
        grids(hundredthsGrid(30), hundredthsGrid(25)),
        'Write 0.3 in hundredths first. Then compare the counts.',
        '0.3 = 30 hundredths and 0.25 = 25 hundredths. 30 is more than 25, so 0.3 is more.', grids(hundredthsGrid(30), hundredthsGrid(25))),
      practice('Put 0.8, 0.75 and 0.09 in order, biggest first.', ['0.8, 0.75, 0.09', '0.75, 0.8, 0.09', '0.09, 0.75, 0.8', '0.8, 0.09, 0.75'], 0,
        grids(hundredthsGrid(80), hundredthsGrid(75), hundredthsGrid(9)),
        'Write each one in hundredths. Which grid has the most squares shaded?',
        '0.8 = 80 hundredths, 0.75 = 75 hundredths and 0.09 = 9 hundredths. 80 > 75 > 9, so 0.8 > 0.75 > 0.09.', grids(hundredthsGrid(80), hundredthsGrid(75), hundredthsGrid(9))),
    ] },
  { id: 'multi-step-fraction-stories', title: 'Two-step stories', shortTitle: 'Fraction stories', description: 'Solve a story in 2 steps.', skill: 'Find what the story asks first. Solve that step, then use the answer in the next step.', mode: 'story', n: 2, d: 5, context: 'community garden' },
  // Unit 15 · Problem solving: the reasoning that Singapore, Beast Academy and Eureka lean on and quizzes skip.
  { id: 'find-the-whole', title: 'Find the whole', shortTitle: 'Find the whole', description: '3 is 1/4 of it. What is the whole?', skill: 'The known amount is some of the equal parts. Divide it by the numerator to find 1 part. Then multiply by the denominator to make the whole.', mode: 'whole-from-part', n: 1, d: 4, context: 'sticker packs', gradeBand: 5, standards: ['5.NF.6'],
    example: { prompt: '3 stickers are 1/4 of a pack. How many stickers are in the pack?', answer: '12 stickers', explanation: '1/4 is 1 of 4 equal parts. Each part is 3. 4 parts of 3 is 12.', model: setModel(3, 12, 4) } },
  { id: 'spot-the-mistake', title: 'Spot the mistake', shortTitle: 'Spot the mistake', description: 'Is Sam right? Fix it.', skill: 'Check whether each step uses the right fraction rule. Find the first wrong step and correct it.', mode: 'mistake', n: 3, d: 4, context: 'homework check', gradeBand: 4, standards: ['4.NF.3a', '4.NF.2'] },
  { id: 'fraction-of-remainder', title: 'Fraction of the rest', shortTitle: 'Fraction of the rest', description: 'Spend 1/3. Then spend 1/2 of the rest.', skill: 'First find how much is left. Then split that remaining amount and find the fraction asked for.', mode: 'remainder', n: 1, d: 3, context: 'pocket money', gradeBand: 5, standards: ['5.NF.6', '5.NF.2'] },
  { id: 'divide-fractions', title: 'Bonus: Divide by a fraction', shortTitle: 'Bonus fraction ÷ fraction', description: 'How many 1/8s fit in 3/4?', skill: 'Division asks how many groups fit. Count how many parts of the given fraction fit in the amount.', example: { prompt: 'How many eighths fit in 3/4?', answer: '6 eighths', explanation: '3/4 is the same amount as 6/8. Each eighth is one of those parts. So 6 eighths fit in 3/4.', model: bars({ numerator: 3, denominator: 4, named: true }, { numerator: 6, denominator: 8 }) }, mode: 'divide-fractions', n: 3, d: 4, context: 'measuring scoops', enrichment: true },
  // Second lessons for standards that had one (approved mockups, November 2026).
  { id: 'dimes-and-pennies', title: 'Dimes and pennies', shortTitle: 'Dimes and pennies', description: 'Write dimes and pennies as hundredths of a dollar.',
    skill: 'A dime is 1/10 of a dollar, which is 10 hundredths. A penny is 1/100. Write dimes as hundredths, then add the pennies.',
    example: { prompt: '3 dimes and 4 pennies. What part of a dollar is that?', answer: '34/100',
      explanation: '3 dimes fill 3 columns: 30/100. 4 pennies fill 4 more squares: 4/100. Together: 34/100 of a dollar.',
      model: grids(hundredthsGrid(34, '3 dimes and 4 pennies')) },
    mode: 'coins', n: 34, d: 100, context: 'coins', gradeBand: 4, standards: ['4.NF.5'],
    questions: [
      practice('Chomp has 6 dimes. What part of a dollar is that, in hundredths?', ['60/100', '6/100', '16/100', '600/100'], 0, coins(6, 0),
        'A dime is 10 pennies. How many pennies are 6 dimes?',
        'Each dime is 10 hundredths of a dollar. 6 dimes are 60 hundredths: 60/100.', grids(hundredthsGrid(60))),
      practice('2 dimes and 5 pennies. What part of a dollar is that?', ['25/100', '7/100', '205/100', '52/100'], 0, coins(2, 5),
        'Change the dimes to hundredths first. Then add the pennies.',
        '2 dimes are 20/100. 5 pennies are 5/100. Together: 25/100.', grids(hundredthsGrid(25))),
      practice('Write 4/10 of a dollar in hundredths.', ['40/100', '4/100', '14/100', '40/10'], 0, bars({ numerator: 4, denominator: 10 }),
        'Each tenth is 10 hundredths. How many hundredths are 4 tenths?',
        '4/10 is 4 dimes. Each dime is 10 hundredths, so 4/10 = 40/100.', grids(hundredthsGrid(40))),
      practice('3/10 + 8/100 of a dollar. How much is that in hundredths?', ['38/100', '11/100', '11/110', '8/100'], 0, coins(3, 8),
        'Change 3/10 to hundredths first. Then add 8/100.',
        '3/10 = 30/100. 30/100 + 8/100 = 38/100.', grids(hundredthsGrid(38))),
    ] },
  { id: 'plot-in-eighths', title: 'Plot in eighths', shortTitle: 'Plot in eighths', description: 'Make a line plot in eighths, then use it.',
    skill: 'Put one X above each measurement. Lengths that match stack on the same spot. Then read the plot to answer.',
    example: { prompt: 'Pins: 2/8, 4/8, 4/8 and 7/8 inch. Make a line plot.', answer: '2 Xs at 4/8',
      explanation: 'One X for each pin. Two pins are 4/8 inch, so 2 Xs stack there. One X goes at 2/8 and one at 7/8.',
      model: { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 4, 4, 7] } },
    mode: 'plot-eighths', n: 5, d: 8, context: 'pebbles', gradeBand: 4, standards: ['4.MD.4'],
    questions: [
      practice('Pebbles: 1/8, 3/8, 3/8, 5/8, 5/8, 5/8 inch. Plot them. How many more Xs are at 5/8 than at 1/8?', ['2', '1', '3', '4'], 0,
        plotTask([1, 3, 3, 5, 5, 5]), 'Count the Xs at 5/8. Count the Xs at 1/8. How many more?',
        'There are 3 Xs at 5/8 and 1 X at 1/8. 3 − 1 = 2 more.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 3, 3, 5, 5, 5] }),
      practice('Shells: 2/8, 2/8, 6/8, 7/8, 7/8 inch. Plot them. How many shells are longer than 4/8 inch?', ['3', '2', '4', '5'], 0,
        plotTask([2, 2, 6, 7, 7]), 'Find 4/8 on the plot. Count the Xs to its right.',
        '6/8, 7/8 and 7/8 are past 4/8. That is 3 shells.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 2, 6, 7, 7] }),
      practice('Twigs: 3/8, 4/8, 4/8, 8/8 inch. Plot them. How long are the two shortest together?', ['7/8 inch', '7/16 inch', '1/8 inch', '12/8 inches'], 0,
        plotTask([3, 4, 4, 8]), 'Find the two Xs farthest left. Add their lengths.',
        'The two shortest are 3/8 and 4/8 inch. 3/8 + 4/8 = 7/8 inch.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [3, 4, 4, 8] }),
      practice('Leaves: 1/8, 1/8, 4/8, 6/8, 6/8, 6/8 inch. Plot them. Which length has the most Xs?', ['6/8 inch', '1/8 inch', '4/8 inch', '3/8 inch'], 0,
        plotTask([1, 1, 4, 6, 6, 6]), 'Look for the tallest stack of Xs.',
        '3 Xs stack at 6/8. That is the most.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 1, 4, 6, 6, 6] }),
    ] },
  { id: 'party-portions', title: 'Party portions', shortTitle: 'Party portions', description: 'Equal portions for every guest: a fraction times a whole number.',
    skill: 'Equal groups of the same fraction: count the parts and keep the part size. Then find which two whole numbers the total is between.',
    example: { prompt: 'Each guest eats 3/8 pound. 5 guests come. How much in all?', answer: '15/8 pounds',
      explanation: '5 groups of 3 eighths is 15 eighths: 15/8 pounds. 15/8 is 1 and 7/8, so it is between 1 and 2 pounds.',
      model: line(15, 8, 2) },
    mode: 'portions', n: 15, d: 8, context: 'party food', gradeBand: 4, standards: ['4.NF.4c'],
    questions: [
      practice('Each racer drinks 2/3 cup. 4 racers. Between which two whole numbers is the total?', ['2 and 3', '1 and 2', '3 and 4', '8 and 9'], 0,
        bars(...Array.from({ length: 4 }, () => ({ numerator: 2, denominator: 3 }))), 'Count all the thirds. How many thirds make one whole?',
        '4 groups of 2 thirds is 8 thirds. 6 thirds make 2 wholes, and 9 thirds make 3. So 8/3 is between 2 and 3.', line(8, 3, 3)),
      practice('Each racer eats 3/8 pound. 5 racers. How much in all?', ['15/8 pounds', '15/40 pound', '8/8 pound', '3/40 pound'], 0,
        bars(...Array.from({ length: 5 }, () => ({ numerator: 3, denominator: 8 }))), 'Count the eighths in all 5 groups. The part size stays eighths.',
        '5 groups of 3 eighths is 15 eighths: 15/8 pounds.', line(15, 8, 2)),
      practice('Each friend gets 3/4 of a sandwich. 6 friends. Between which two whole numbers is the total?', ['4 and 5', '3 and 4', '5 and 6', '18 and 19'], 0,
        bars(...Array.from({ length: 6 }, () => ({ numerator: 3, denominator: 4 }))), 'Count all the fourths. How many fourths make one whole?',
        '6 groups of 3 fourths is 18 fourths. 16 fourths make 4 wholes, and 20 make 5. So 18/4 is between 4 and 5.', line(18, 4, 5)),
      practice('Each runner drinks 5/6 liter. 3 runners. How much in all?', ['15/6 liters', '15/18 liter', '8/6 liters', '5/18 liter'], 0,
        bars(...Array.from({ length: 3 }, () => ({ numerator: 5, denominator: 6 }))), 'Count the sixths in all 3 groups. The part size stays sixths.',
        '3 groups of 5 sixths is 15 sixths: 15/6 liters.', line(15, 6, 3)),
    ] },
  { id: 'two-step-conversions', title: 'Two-step conversions', shortTitle: 'Two-step conversions', description: 'Change units, then add or take away.',
    skill: 'Change to the smaller unit first. Then add or take away.',
    example: { prompt: 'A ribbon is 1 1/2 feet long. Pip cuts off 4 inches. How many inches are left?', answer: '14 inches',
      explanation: '1 foot is 12 inches, so 1 1/2 feet is 12 + 6 = 18 inches. 18 − 4 = 14 inches are left.',
      model: line(18, 12, 2) },
    mode: 'two-step-convert', n: 30, d: 12, context: 'stage ribbon', gradeBand: 5, standards: ['5.MD.1'],
    questions: [
      practice('A ribbon is 2 1/2 feet long. Pip cuts off 8 inches. How many inches are left?', ['22 inches', '17 inches', '30 inches', '38 inches'], 0,
        inFeet([12, 12, 6]), 'Change 2 1/2 feet to inches first: each foot is 12 inches.',
        '2 1/2 feet is 12 + 12 + 6 = 30 inches. 30 − 8 = 22 inches are left.', inFeet([12, 12, 6])),
      practice('A race is 1 1/4 hours long. The first part takes 20 minutes. How many minutes are left?', ['55 minutes', '95 minutes', '75 minutes', '105 minutes'], 0,
        bars({ numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 }), 'Change 1 1/4 hours to minutes first: an hour is 60 minutes.',
        '1 1/4 hours is 60 + 15 = 75 minutes. 75 − 20 = 55 minutes are left.', bars({ numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 })),
      practice('A jug holds 1 1/2 liters. Pip pours out 400 milliliters. How many milliliters are left?', ['1100 milliliters', '1900 milliliters', '1500 milliliters', '600 milliliters'], 0,
        bars({ numerator: 2, denominator: 2 }, { numerator: 1, denominator: 2 }), 'Change 1 1/2 liters to milliliters first: a liter is 1000 milliliters.',
        '1 1/2 liters is 1000 + 500 = 1500 milliliters. 1500 − 400 = 1100 milliliters are left.', bars({ numerator: 2, denominator: 2 }, { numerator: 1, denominator: 2 })),
      practice('A bag holds 2 1/4 pounds of sand. Pip adds 6 ounces. How many ounces are in the bag now?', ['42 ounces', '30 ounces', '36 ounces', '33 ounces'], 0,
        bars({ numerator: 4, denominator: 4 }, { numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 }), 'Change 2 1/4 pounds to ounces first: a pound is 16 ounces.',
        '2 1/4 pounds is 16 + 16 + 4 = 36 ounces. 36 + 6 = 42 ounces.', bars({ numerator: 4, denominator: 4 }, { numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 })),
    ] },
  { id: 'line-plot-totals', title: 'Line plot totals', shortTitle: 'Line plot totals', description: 'Add every X on a line plot to find a total or a difference.',
    skill: 'Add the amount for every X. The parts are the same size, so add the numerators.',
    example: { prompt: 'The line plot shows water in 4 beakers: 1/4, 1/4, 2/4, 3/4 liter. How much water in all?', answer: '7/4 liters',
      explanation: '1 + 1 + 2 + 3 = 7 fourths. That is 7/4 liters, or 1 3/4 liters.',
      model: { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 1, 2, 3] } },
    mode: 'plot-totals', n: 7, d: 4, context: 'beakers', gradeBand: 5, standards: ['5.MD.2'],
    questions: [
      practice('The line plot shows water in 6 beakers: 1/8, 3/8, 3/8, 4/8, 4/8, 6/8 liter. How much water in all?', ['2 5/8 liters', '1 6/8 liters', '6/8 liter', '21/48 liter'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 3, 3, 4, 4, 6] }, 'Add the amount for every X. Two Xs at one spot count twice.',
        '1 + 3 + 3 + 4 + 4 + 6 = 21 eighths: 21/8, or 2 5/8 liters.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 3, 3, 4, 4, 6] }),
      practice('The line plot shows juice in 5 cups: 1/4, 2/4, 2/4, 3/4, 4/4 liter. How much juice in all?', ['3 liters', '12/20 liter', '2 2/4 liters', '1 1/4 liters'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 2, 2, 3, 4] }, 'Add the fourths for every X. How many fourths make a liter?',
        '1 + 2 + 2 + 3 + 4 = 12 fourths. 12/4 is 3 liters.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 2, 2, 3, 4] }),
      practice('The line plot shows water in 6 beakers: 2/8, 2/8, 5/8, 5/8, 5/8, 8/8 liter. How much more do all the 5/8 beakers hold together than all the 2/8 beakers together?', ['1 3/8 liters', '3/8 liter', '1/8 liter', '2 3/8 liters'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 2, 5, 5, 5, 8] }, 'Add up each stack first. Then take away.',
        'The three 5/8 beakers hold 15/8. The two 2/8 beakers hold 4/8. 15/8 − 4/8 = 11/8, or 1 3/8 liters.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 2, 5, 5, 5, 8] }),
      practice('The line plot shows rain on 4 days: 1/2, 1/2, 3/4, 1/4 inch. How much rain in all?', ['2 inches', '6/12 inch', '1 2/4 inches', '1 inch'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [2, 2, 3, 1] }, 'Change the halves to fourths. Then add every X.',
        '1/2 = 2/4. 2 + 2 + 3 + 1 = 8 fourths. 8/4 is 2 inches.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [2, 2, 3, 1] }),
    ] },
];

const picture = (top: number, bottom: number): ModelSpec => ({ kind: 'bars', bars: [{ numerator: top, denominator: bottom }], hideLabels: true });
/** A picture for a worksheet problem: its own model, else the first amount in the question. Never the answer. */
export function problemPicture(problem: WorksheetProblem): ModelSpec {
  const m = problem.model;
  // An empty picture: the wholes cut into equal pieces, nothing shaded yet (sharing questions).
  if (m && m.n === 0) return { kind: 'bars', bars: Array.from({ length: m.wholes }, () => ({ numerator: 0, denominator: m.d })), hideLabels: true };
  // The measuring tools the question talks about come first: the line plot, the ruler, the grid.
  if (problem.linePlotTask) return { kind: 'lineplot', ...problem.linePlotTask };
  // A garden question: the garden drawn to scale (its bars would only show the two side lengths, not the area).
  if (problem.picture?.kind === 'garden') return problem.picture;
  // Ruler questions: a number line marked like the ruler, with the end point (no labels).
  if (problem.rulerTask) return { kind: 'line', numerator: problem.rulerTask.end, denominator: problem.rulerTask.denominator, wholes: problem.rulerTask.wholes, hideLabels: true };
  if (problem.area) return { kind: 'area', cut: problem.area.cut, shaded: problem.area.shaded ?? [], ...(problem.areaTask ? { colorTask: problem.areaTask } : {}) };
  // A chance question (one marble per group): the story says how many are green, so the picture shows them.
  if (m?.kind === 'set' && m.total && m.d === m.total) return setModel(m.n, m.total, m.d);
  // A set to share: the groups, none picked yet (picking them is the answer).
  if (m?.kind === 'set' && m.total) return setModel(0, m.total, m.d);
  // A row the child builds: its model is the answer. Show the amounts the question names ("Compare: 0.4 __ 0.35"
  // shows both), or else the empty bars to build on.
  const named = m && problem.task ? autoPicture(problem.prompt) : null;
  if (named?.kind === 'bars' && named.bars.length > 1) return named;
  // One spare bar past a whole number of wholes, so the count of bars never answers "how many wholes?".
  if (m && problem.task) return { kind: 'bars', bars: Array.from({ length: Math.max(1, Math.ceil(m.n / m.d)) + (m.n >= m.d ? 1 : 0) }, () => ({ numerator: 0, denominator: m.d })), hideLabels: true };
  if (m?.kind === 'line') return { kind: 'line', numerator: m.n, denominator: m.d, wholes: numberLineWholeCount(m.n, m.d), hideLabels: true };
  if (m) return picture(m.n, m.d);
  // Every amount the question names ("Pick the sign: 4/5 __ 3/4" shows both), not just the first.
  if (problem.picture) return problem.picture;
  const mixed = /(\d+) (?:and )?(\d+)\/(\d+)/.exec(problem.prompt);
  if (mixed && Number(mixed[2]) < Number(mixed[3])) return picture(Number(mixed[1]) * Number(mixed[3]) + Number(mixed[2]), Number(mixed[3]));
  const fraction = /(\d+)\/(\d+)/.exec(problem.prompt);
  if (fraction && Number(fraction[1]) <= Number(fraction[2]) * 3) return picture(Number(fraction[1]), Number(fraction[2]));
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
  // The explanation shows after a right answer, so it adds the answer to the hint instead of repeating it.
  // A check ("Check: 20 × 1/5 = 4.") comes after the answer.
  return practice(asChoicePrompt(problem.prompt), choices, position % 3, model, problem.hint, `${problem.hint} So the answer is ${problem.answer}.${problem.why ? ` ${problem.why}` : ''}`, simpler);
}

function extensionMission(topic: ExtensionTopic): MissionSeed {
  const sheet = getWorksheet(topic.id);
  const [build] = getBuildChecks(topic.id);
  const t = build.target;
  return {
    id: topic.id, title: topic.title, shortTitle: topic.shortTitle, description: topic.description, skill: topic.skill,
    gradeBand: topic.gradeBand, standards: topic.standards, enrichment: topic.enrichment,
    example: topic.example ?? {
      prompt: build.prompt,
      answer: t.kind === 'set' && t.total ? `${(t.total / t.d) * t.n} of ${t.total}` : `${t.n}/${t.d}`,
      explanation: build.explanation,
      model: t.kind === 'set' && t.total ? setModel((t.total / t.d) * t.n, t.total, t.d) : t.kind === 'line' ? line(t.n, t.d) : bars({ numerator: t.n, denominator: t.d }),
    },
    // Practice uses different worksheet rows than the first ones, so the sheet still has fresh numbers.
    questions: topic.questions ?? [1, 4, 7, 10].map((row, i) => problemQuestion(sheet[row], i + row)),
  };
}

/** Lessons added after the first 28 whose practice is made from their own worksheets (not written question by question). */
export const EXTENSION_LESSON_IDS: ReadonlySet<string> = new Set(extensionTopics.filter((topic) => !topic.questions).map((topic) => topic.id));
/**
 * The course order: every lesson's unit, and its place in that unit. This is the one place a lesson's unit is set.
 * Units 1–5 are grade 3; units 6–9 bring in grade 4 (unit 8 holds like-fraction sums, mixed numbers and decimals; unit 9
 * ends with fraction-times-whole recipe stories), and
 * grade 5 starts in unit 10 with adding and subtracting unlike fractions. Enrichment and problem solving close the course.
 */
export const LESSON_PLAN: Readonly<Record<number, readonly string[]>> = {
  1: ['equal-parts', 'fraction-names', 'unit-fractions', 'fraction-of-area'],
  2: ['unit-size', 'compare-same-numerator'],
  3: ['benchmark-half', 'benchmarks-zero-one', 'fraction-magnitude'],
  4: ['number-line-basics', 'number-line-points', 'number-line-beyond-one', 'ruler-measurement', 'build-line-plots'],
  5: ['compare-same-denominator', 'order-fractions'],
  6: ['equivalent-models', 'equivalent-number-line', 'build-equivalents', 'missing-equivalent'],
  7: ['compose-to-one', 'decompose-fractions', 'whole-numbers-as-fractions', 'improper-fractions', 'mixed-improper'],
  8: ['add-like-denominators', 'subtract-like-denominators', 'add-mixed-numbers', 'subtract-mixed-numbers', 'tenths-decimals',
    'hundredths-decimals', 'decimal-fraction-equivalence', 'compare-decimals', 'compare-decimals-grid', 'add-tenths-hundredths',
    'dimes-and-pennies', 'unit-fraction-multiples', 'multiply-whole-by-fraction'],
  9: ['simplify-fractions', 'equivalent-missing-both', 'compare-unlike-fractions', 'order-unlike-fractions', 'plot-in-eighths', 'read-line-plots',
    'measurement-word-problems', 'fraction-recipes', 'party-portions'],
  10: ['add-related-fractions', 'add-unlike-fractions', 'subtract-unlike-fractions', 'mixed-unlike-operations', 'estimate-fraction-operations'],
  11: ['sets-unit-fractions', 'sets-nonunit', 'fraction-of-quantity', 'multiply-fractions', 'fraction-times-fraction',
    'fraction-of-collection', 'multiplication-scaling', 'bigger-or-smaller'],
  // A fraction is a division (5.NF.3) before dividing with unit fractions (5.NF.7a, b, c).
  12: ['fraction-of-length', 'fractional-measure-addition', 'line-plot-leveling', 'line-plot-totals', 'fractional-unit-conversions', 'two-step-conversions',
    'fractional-sharing', 'fraction-as-division', 'unit-fraction-divided-whole', 'divide-whole-by-unit-fraction', 'share-or-fit'],
  13: ['fraction-probability', 'fractional-side-area', 'multiply-mixed-numbers'],
  14: ['fractions-to-percent', 'percent-to-fraction', 'multi-step-fraction-stories'],
  15: ['find-the-whole', 'spot-the-mistake', 'fraction-of-remainder', 'divide-fractions'],
};
/** How many units the course has (each one has a story chapter, a Unit challenge and Check-ins). */
export const UNIT_COUNT = Object.keys(LESSON_PLAN).length;
const planPlace = new Map(Object.entries(LESSON_PLAN).flatMap(([unit, ids]) => ids.map((id, at) => [id, { unit: Number(unit), at }] as const)));
function placeOf(id: string): { unit: number; at: number } {
  const place = planPlace.get(id);
  if (!place) throw new Error(`Lesson ${id} is not in LESSON_PLAN`);
  return place;
}
// Lessons run in LESSON_PLAN order: unit by unit, then by their place in the unit (not the order they are written in).
const course = [...curriculum, ...extensionTopics.map(extensionMission)]
  .map((seed) => ({ ...seed, unit: placeOf(seed.id).unit }))
  .sort((a, b) => a.unit - b.unit || placeOf(a.id).at - placeOf(b.id).at);
if (course.length !== Object.values(LESSON_PLAN).flat().length) throw new Error('LESSON_PLAN must list every lesson exactly once');

export const MISSIONS: Mission[] = course.map((seed, index) => {
  const current = mission(seed);
  if (index === 0) return current;

  // Revisit a question from the previous lesson between new practice and mastery.
  const priorLesson = course[index - 1];
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
/** After each passed review the next comes later: 1 day after the lesson, then 3 days, then 7 days, then it is done. */
export const SPACED_REVIEW_DAYS = [1, 3, 7] as const;
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

export function completeSkillReview(progress: Progress, missionId: string, now = Date.now()): Progress {
  const evidence = progress.learning?.[missionId];
  if (evidence && (!evidence.completedAt || !evidence.confirmedAt || evidence.confirmedAt < evidence.completedAt + SKILL_REVIEW_DELAY_MS)) return progress;
  const item = progress.reviewQueue.find((review) => review.missionId === missionId);
  if (!item) return progress;
  // A passed review comes back later (3 days, then 7) until the last step, so the skill is remembered, not just met once.
  const next = (item.stage ?? 0) + 1;
  const reviewQueue = next < SPACED_REVIEW_DAYS.length
    ? progress.reviewQueue.map((review) => review === item
      ? { ...review, stage: next, reviewCount: review.reviewCount + 1, dueAt: now + SPACED_REVIEW_DAYS[next] * SKILL_REVIEW_DELAY_MS }
      : review)
    : progress.reviewQueue.filter((review) => review !== item);
  return { ...progress, reviewQueue };
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
  const worksheet: Record<string, { draft: string; checkedValue?: string; wrongValue?: string; attempts: number; supported: boolean }> = {};
  for (const [key, entry] of Object.entries(redo.worksheet ?? {})) {
    if (/^w([1-9]|1[0-2])$/.test(key) && entry && typeof entry.draft === 'string') worksheet[key] = {
      draft: entry.draft.slice(0, 200), checkedValue: typeof entry.checkedValue === 'string' ? entry.checkedValue.slice(0, 200) : undefined,
            wrongValue: typeof entry.wrongValue === 'string' ? entry.wrongValue.slice(0, 200) : undefined,
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
  if (MOVED_LATER_LESSONS.has(target.id) && passedLesson(progress, target.id)) return true;
  // Units the placement quiz showed are already known don't block the ones after them.
  const placedOut = (item: Mission) => !!progress.placement && item.unit < progress.placement.unit;
  // A lesson added (or moved) later must not re-lock lessons a learner had already reached (they can still do it any time).
  const alreadyInLaterUnits = MISSIONS.some((item) => item.unit >= 9 && (!!progress.learning?.[item.id] || progress.completedMissionIds.includes(item.id)));
  // A lesson moved earlier in the course doesn't re-lock lessons the learner already passed after it (it stays open).
  const skippedByMove = (item: Mission, index: number) => MOVED_EARLIER_LESSONS.has(item.id)
    && MISSIONS.slice(index + 1).some((later) => passedLesson(progress, later.id));
  if (target.unit < 9) return MISSIONS.slice(0, targetIndex).every((item, index) => placedOut(item) || passedLesson(progress, item.id)
    || (alreadyInLaterUnits && LATE_ADDED_LESSONS.has(item.id)) || skippedByMove(item, index));
  return MISSIONS.filter((item, index) => item.unit < target.unit && !placedOut(item) && !(alreadyInLaterUnits && LATE_ADDED_LESSONS.has(item.id))
    && !skippedByMove(item, index))
    .every(item => passedLesson(progress, item.id));
}
/** Passed the lesson's gate now, or passed it before its questions were revised (it then shows "a few new steps",
    but never re-locks the lessons after it). completedAt is only ever set by completeMission. */
export function passedLesson(progress: Progress, missionId: string): boolean {
  return hasLearningGate(progress, missionId)
    || (progress.completedMissionIds.includes(missionId) && typeof progress.learning?.[missionId]?.completedAt === 'number');
}
/** Lessons moved to an earlier spot, which learners already past that spot never had. They never block a lesson the learner
    has already passed after them (they stay open, and "Continue" still suggests them). New learners take them in order. */
export const MOVED_EARLIER_LESSONS: ReadonlySet<string> = new Set([
  // Moved from unit 5 to unit 2 when the fraction-of-a-group lessons moved to unit 11.
  'compare-same-numerator',
  // The October 2026 reorder (LESSON_PLAN): moved to an earlier unit.
  'fraction-of-area', 'ruler-measurement', 'build-line-plots', 'equivalent-number-line', 'whole-numbers-as-fractions',
  'add-mixed-numbers', 'subtract-mixed-numbers', 'decimal-fraction-equivalence', 'compare-decimals', 'read-line-plots', 'measurement-word-problems',
  // New lessons put in front of lessons a learner may already have passed (unit 8 and unit 11).
  'compare-decimals-grid', 'fraction-times-fraction', 'bigger-or-smaller', 'share-or-fit',
  // Moved from unit 13 to the end of unit 9, so 4.NF.4c is in the grade 4 lessons.
  'fraction-recipes',
]);
/** Lessons the October 2026 reorder moved to a later unit. A learner who passed one before the move keeps it open, even
    though the lessons now in front of it may be new to them. */
export const MOVED_LATER_LESSONS: ReadonlySet<string> = new Set(['add-related-fractions', 'fraction-of-quantity', 'multiply-mixed-numbers',
  // Moved from unit 11 to the end of unit 12, after "Division is a fraction".
  'unit-fraction-divided-whole', 'divide-whole-by-unit-fraction', 'share-or-fit']);
/**
 * Lessons added after learners could already be past them. For a learner who has started units 9–14 they never block
 * later units (they stay open to do any time, and "Continue" still suggests them). New learners take them in order.
 * Add every lesson inserted into an existing unit here.
 */
export const LATE_ADDED_LESSONS: ReadonlySet<string> = new Set([
  'add-tenths-hundredths',
  // Moved from unit 11 to the end of unit 8 (grade 4).
  'multiply-whole-by-fraction',
  // Standards-coverage lessons (grades 3–5), first added to units 9–14 (LESSON_PLAN has moved some earlier since).
  'whole-numbers-as-fractions',
  'add-unlike-fractions', 'mixed-unlike-operations', 'estimate-fraction-operations',
  'unit-fraction-multiples', 'multiplication-scaling', 'multiply-mixed-numbers', 'unit-fraction-divided-whole',
  'ruler-measurement', 'build-line-plots', 'read-line-plots', 'line-plot-leveling', 'measurement-word-problems', 'fractional-unit-conversions',
  'fractional-side-area',
  'compare-decimals',
  // Grids, scaling and division lessons added to units 8 and 11.
  'compare-decimals-grid', 'fraction-times-fraction', 'bigger-or-smaller', 'share-or-fit',
  // Second lessons for standards that had one (units 8 and 9).
  'dimes-and-pennies', 'plot-in-eighths', 'party-portions',
  // And in unit 12.
  'line-plot-totals', 'two-step-conversions',
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

/** A Check-in id this course can have: unit-<1 to UNIT_COUNT>-pre/mid/end, or a grade check. */
function knownAssessmentId(id: string): boolean {
  const unit = /^unit-([1-9]\d?)-(?:pre|mid|end)$/.exec(id)?.[1];
  return unit ? Number(unit) <= UNIT_COUNT : /^grade-[3-5]-(?:beginning|middle|end)$/.test(id);
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
        if (!Number.isInteger(unit) || unit < 1 || unit > UNIT_COUNT || typeof rawScore !== 'number' || !Number.isFinite(rawScore)) continue;
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
          ...(typeof item.stage === 'number' && Number.isInteger(item.stage) && item.stage > 0 && item.stage < SPACED_REVIEW_DAYS.length ? { stage: item.stage } : {}),
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
            wrongValue: typeof entry.wrongValue === 'string' ? entry.wrongValue.slice(0, 200) : undefined,
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
            wrongValue: typeof entry.wrongValue === 'string' ? entry.wrongValue.slice(0, 200) : undefined,
            attempts: safeCount(entry.attempts), supported: entry.supported !== false,
          };
        }
        learning[id] = {
          practiceDone: raw.practiceDone === true, checks, worksheet, misconceptions,
          helpUses: safeCount(raw.helpUses),
          practiceStars: typeof raw.practiceStars === 'number' && Number.isFinite(raw.practiceStars)
            ? Math.max(0, Math.min(3, Math.floor(raw.practiceStars)))
            : undefined,
          practiceAt: raw.practiceDone !== true && raw.practiceAt && typeof raw.practiceAt === 'object'
            && Number.isInteger((raw.practiceAt as { index?: unknown }).index) && Number.isInteger((raw.practiceAt as { firstTry?: unknown }).firstTry)
            ? { index: Math.max(0, Math.min(50, (raw.practiceAt as { index: number }).index)), firstTry: Math.max(0, Math.min(50, (raw.practiceAt as { firstTry: number }).firstTry)) }
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
        || !knownAssessmentId(attempt.assessmentId)
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
