import { noBeforeYes, orderedWithSigns, withFourthChoice, withSignComparisons } from './fourth-choice';
import { preferMisconceptions, withoutOverOne } from './misconceptions';
import { withUnits } from './measure-units';
import { hasLearningGate, targetedPracticePlans, type LearningRecord } from './learning';
import { gridCut, gridOverlap, type AreaCut, type AreaTask } from './area-shapes';
import { amountsIn, autoPicture } from './auto-picture';
import { gardenModel, type GardenSide } from './garden';
import { answerMatches, asChoicePrompt, choiceDistractors, getBuildChecks, getWorksheet, type WorksheetProblem } from './learning-content';
import { FRACTION_STANDARDS, standardsForMission, type StandardId } from './standard-catalog';
import { scopedStorageKey } from './storage-scope';
import { ideaOfQuestion, partTaught, withTaughtParts } from './taught-parts';
import { afterRevisit, byOverdue, REVISIT_DAYS, type LessonSeen, type RevisitCandidate } from './review-schedule';
const REVISIT_STEPS = REVISIT_DAYS.length;
const startOfDay = (now: number) => Math.floor(now / (24 * 60 * 60 * 1000)) * 24 * 60 * 60 * 1000;

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
  | { kind: 'line'; numerator: number; denominator: number; wholes?: number; caption?: string; hideLabels?: boolean; /** Show the dot with no hop arcs, so counting the arcs does not give the answer. */ hideHops?: boolean }
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
  /** A ruler marked in inches with a blue strip from 0 to tick `end` (ticks counted in steps of 1/denominator). */
  | { kind: 'ruler'; denominator: number; wholes: number; end: number; caption?: string }
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
  /** One of the lesson's 3 checkpoint questions (new numbers, after the ideas): counted for stars like any question. */
  isCheckpoint?: boolean;
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
  /** Questions written for one idea of the lesson (lesson-ideas.ts lists each idea's three practices). */
  ideaQuestions?: PracticeQuestion[];
};

export type Progress = {
  completedMissionIds: string[];
  starsByMission: Record<string, number>;
  reviewQueue: SkillReview[];
  learning?: Record<string, LearningRecord>;
  challengeBest?: Record<string, number>;
  dailyPractice?: DailyPracticeSession;
  adaptiveStandards?: Record<string, AdaptiveStandardState>;
  /** When each finished lesson was last revisited, and how well (see review-schedule.ts). */
  lessonSeen?: Record<string, LessonSeen>;
  adaptationLog?: AdaptationEvent[];
  /** Placement quiz result: lessons in units before `unit` are open (not marked done). */
  placement?: { unit: number; at: number };
  /** Practice a grown-up chose in the report. Each shows as a card on the child's map until it is done. */
  grownUpPicks?: GrownUpPick[];
  /** A Check-in left partway (one at a time). */
  assessmentDraft?: AssessmentDraft;
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

/** A Check-in left partway: its questions (by seed) and the answers so far, so it picks up at the next question. */
export type AssessmentDraft = { assessmentId: string; seed: number; startedAt: number; responses: AssessmentResponse[] };

export function saveAssessmentDraft(progress: Progress, draft: AssessmentDraft): Progress {
  return { ...progress, assessmentDraft: draft };
}
export function clearAssessmentDraft(progress: Progress, assessmentId: string): Progress {
  if (progress.assessmentDraft?.assessmentId !== assessmentId) return progress;
  const { assessmentDraft: _done, ...rest } = progress;
  return rest;
}

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

/** `practice`: 5 new questions from a lesson (`id` is the lesson). `checkin`: a Check-in (`id` is the Check-in). */
export type GrownUpPick = {
  kind: 'practice' | 'checkin'; id: string; at: number;
  /** Practice left partway: its questions (by seed), the next question and right-first-time answers so far. */
  seed?: number; index?: number; firstTry?: number;
};
export const MAX_GROWN_UP_PICKS = 3;
export const GROWN_UP_PRACTICE_COUNT = 5;
/** What Listen reads on the map's "Picked for you" card. */
export const PICKED_FOR_YOU_SPOKEN = 'Picked for you. A grown-up picked this practice for you. Tap one to start.';

/** Add a pick, or move an existing one to the end. Only the newest few are kept. */
export function addGrownUpPick(progress: Progress, kind: GrownUpPick['kind'], id: string, now = Date.now()): Progress {
  const others = (progress.grownUpPicks ?? []).filter((pick) => !(pick.kind === kind && pick.id === id));
  return { ...progress, grownUpPicks: [...others, { kind, id, at: now }].slice(-MAX_GROWN_UP_PICKS) };
}

/** Remember how far a picked practice has got, so leaving it picks up at the same question. */
export function updateGrownUpPick(progress: Progress, kind: GrownUpPick['kind'], id: string, changes: Pick<GrownUpPick, 'seed' | 'index' | 'firstTry'>): Progress {
  const picks = progress.grownUpPicks ?? [];
  if (!picks.some((pick) => pick.kind === kind && pick.id === id)) return progress;
  return { ...progress, grownUpPicks: picks.map((pick) => pick.kind === kind && pick.id === id ? { ...pick, ...changes } : pick) };
}

export function clearGrownUpPick(progress: Progress, kind: GrownUpPick['kind'], id: string): Progress {
  const picks = progress.grownUpPicks ?? [];
  if (!picks.some((pick) => pick.kind === kind && pick.id === id)) return progress;
  const grownUpPicks = picks.filter((pick) => !(pick.kind === kind && pick.id === id));
  const { grownUpPicks: _old, ...rest } = progress;
  return grownUpPicks.length ? { ...rest, grownUpPicks } : rest;
}

export type SkillReview = {
  missionId: string;
  missedQuestionId: string;
  dueAt: number;
  reviewCount: number;
  /** Spaced review step: 0 is the review 1 day after the lesson, then 3 days, then 7 days (absent in older saves: 0). */
  stage?: number;
  /** A question of this lesson was answered wrong (set when it is queued for a miss; a lesson queued only for being
      finished has no mark). Older saves: told apart by `missedQuestionId` not being the lesson's first question. */
  missed?: boolean;
};

export type Answer = number;
type PracticeSeed = Omit<PracticeQuestion, 'id' | 'isMastery' | 'isReview'>;
type MissionSeed = Omit<Mission, 'questions' | 'unit' | 'ideaQuestions'> & { questions: PracticeSeed[]; ideaQuestions?: PracticeSeed[] };

/** A number-line picture marks a point only when its numerator is more than 0. A "count the spaces" picture (numerator 0)
    has no point to name: a dot at 0 would suggest the answer "0", or a point nobody asked about. */
export const lineHasPoint = (model: { numerator: number }): boolean => model.numerator > 0;

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
/** One hundredths grid with `h` squares shaded column by column (lessons written before the grid helpers below). */
const grid100 = (h: number): ModelSpec => ({ kind: 'area', cut: 'grid-10x10', shaded: Array.from({ length: h }, (_, k) => (k % 10) * 10 + Math.floor(k / 10)) });

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
export function withChoiceBars<T extends { choices: string[]; model: ModelSpec }>(question: T, authored: string[]): T {
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
  /** Keep the authored wrong choices (a lesson's early ideas: swapped-in slips like 3/4 use a step not taught yet).
      `signExtra`: the fourth choice of a sign question, when "You can't tell" is not taught yet. */
  { authoredChoices = false, signExtra }: { authoredChoices?: boolean; signExtra?: string } = {},
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
  const signs = withSignComparisons(prompt, choices, correctChoice, undefined, signExtra);
  const withFourth = withChoiceBars(withFourthChoice({ prompt, choices: signs?.choices ?? choices, correctChoice: signs?.correctChoice ?? correctChoice, model: named, hint, retryFeedback, simplerModel: simpler }), choices);
  // Whole-number answers: wrong choices come from real slips (one group, the rest, the whole), not answer ± 1.
  const slipped = authoredChoices ? withFourth : preferMisconceptions(withFourth);
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

/** A wrong choice never writes a part name (fifths, ninths …) before a card has taught it (taught-parts.ts). A question
    whose own prompt or right answer needs one stays as written: the teaching check in teach-extras.test.ts names it. */
const onlyTaughtParts = (question: PracticeQuestion, missionId: string): PracticeQuestion => {
  const idea = ideaOfQuestion(missionId, question.id);
  return withTaughtParts(question, (d) => partTaught(d, COURSE_IDS, missionId, idea)) ?? question;
};

function mission({ ideaQuestions: ideaSeeds, ...seed }: MissionSeed & { unit: number }): Mission {
  const standards = standardsForMission(seed.id);
  const questions = seed.questions.map((question, index) => onlyTaughtParts(noBeforeYes(spreadAnswer({
    ...question,
    choices: withUnits(question.prompt, withoutOverOne(question.prompt, question.choices, question.correctChoice)),
    id: `${seed.id}-q${index + 1}`,
    isMastery: index === seed.questions.length - 1,
    standards: [...standards],
  }, `${seed.id}-q${index + 1}`)), seed.id));
  const ideaQuestions = ideaSeeds?.map((question, index) => onlyTaughtParts(noBeforeYes(spreadAnswer({
    ...question,
    choices: withUnits(question.prompt, withoutOverOne(question.prompt, question.choices, question.correctChoice)),
    id: `${seed.id}-p${index + 1}`,
    isMastery: false,
    standards: [...standards],
  }, `${seed.id}-p${index + 1}`)), seed.id));
  return {
    ...seed,
    ...(ideaQuestions ? { ideaQuestions } : {}),
    ...(standards.length && !seed.gradeBand ? { gradeBand: Number(standards[0][0]) as 3 | 4 | 5 } : {}),
    standards,
    questions,
  };
}

const curriculum: MissionSeed[] = [
  {
    id: 'equal-parts', title: 'Fair parts in any shape', shortTitle: 'Equal parts', skill: 'Equal parts are the same size. They can be different shapes, and a fair share gives everyone the same amount.',
    description: 'Spot equal parts of any shape, and share fairly.', example: {
      prompt: 'A square cake is cut into 4 parts. When are they fourths?',
      answer: 'When all 4 parts are the same size.',
      explanation: 'Fourths must be equal. The parts can be different shapes, but 4 unequal parts are not fourths.',
      model: { kind: 'area', cut: 'fourths-squares', shaded: [], caption: 'A square cake cut into 4 equal parts' },
    },
    questions: [
      // Lesson 2's own questions (paper practice, Practice more, later reviews and the story problem): shapes and fair
      // sharing, its two ideas. Lesson 1 asks the strip, ribbon and sandwich questions.
      practice('Is this square cut into fourths?', ['Yes, same-size parts', 'No, fourths must be squares', 'Yes, because there are 4 parts', 'No, there are only 3 parts'], 0,
        { kind: 'area', cut: 'fourths-triangles', shaded: [] }, 'Fourths are 4 parts that cover the same space. They can be any shape. Compare the 4 triangles.',
        'All 4 triangles cover the same space, so they are fourths. Fourths do not have to be squares.', { kind: 'area', cut: 'fourths-squares', shaded: [] }, { authoredChoices: true }),
      practice('This square is cut into 4 parts. Are they fourths?', ['No, the parts are different sizes', 'Yes, there are 4 parts', 'Yes, all the parts are rectangles', 'No, fourths must be triangles'], 0,
        { kind: 'area', cut: 'fourths-unequal', shaded: [] }, 'Fourths must all be the same size. Compare the biggest part and the smallest part.',
        'The parts are different sizes, so they are not fourths. 4 parts are fourths only when they cover the same space.', { kind: 'area', cut: 'fourths-squares', shaded: [] }, { authoredChoices: true }),
      // Wrong choices: the friends counted, the whole pile, the pieces the others get.
      practice('3 friends share 6 equal pieces fairly. How many pieces does each friend get?', ['2', '3', '6', '4'], 0, { kind: 'set', selected: 0, total: 6 },
        'Give one piece to each friend, then go around again.', '6 pieces shared by 3 friends: each friend gets 2 pieces.', { kind: 'set', selected: 2, total: 6, groupCount: 3 }, { authoredChoices: true }),
      practice('4 friends share 12 equal pieces fairly. How many pieces does each friend get?', ['3', '4', '12', '9'], 0, { kind: 'set', selected: 0, total: 12 },
        'Give one piece to each friend, then go around again.', '12 pieces shared by 4 friends: each friend gets 3 pieces.', { kind: 'set', selected: 3, total: 12, groupCount: 4 }, { authoredChoices: true }),
    ],
    ideaQuestions: [
      practice('These 4 parts are 2 squares and 2 triangles. Are they fourths?', ['Yes, each part covers the same space', 'No, the parts are different shapes', 'No, fourths must be squares', 'Yes, because there are 4 parts'], 0, { kind: 'area', cut: 'fourths-mixed', shaded: [] }, 'Fourths must be the same size. They can be different shapes.', 'Each part covers the same space, 1/4 of the square. So they are fourths.', { kind: 'area', cut: 'fourths-squares', shaded: [] }),
      practice('How many small triangles cover the same space as the small square?', ['2', '1', '4'], 0, { kind: 'area', cut: 'quarter-and-triangles', shaded: [0] }, 'Look at another corner of the big square. It is the same size as the small square. Count its triangles.', '2 small triangles cover the same space as 1 small square.', { kind: 'area', cut: 'quarter-and-triangles', shaded: [0, 1, 2] }),
      practice('2 friends share 6 equal pieces fairly. How many pieces does each friend get?', ['3', '2', '6'], 0, { kind: 'set', selected: 0, total: 6 }, 'Give one piece to each friend, then go around again.', '6 pieces shared by 2 friends: each friend gets 3 pieces.', { kind: 'set', selected: 3, total: 6, groupCount: 2 }),
    ],
  },
  {
    id: 'fraction-names', title: 'Fair parts and fraction names', shortTitle: 'Fraction names', skill: 'A fraction names equal parts of one whole. The denominator, or bottom number, tells how many equal parts make one whole. The numerator, or top number, tells how many parts we count.',
    description: 'Spot equal parts, then read the top and bottom numbers.', example: {
      prompt: 'In 3/4, what does each number tell you?',
      answer: 'There are 4 equal parts in all. 3 parts are counted.',
      explanation: 'The denominator is 4, so the whole has 4 equal parts. The numerator is 3, so 3 parts are counted.',
      model: bars({ numerator: 3, denominator: 4 }),
    },
    questions: [
      practice('In 2/6, what does the 6 mean?', ['6 equal parts in all', '6 parts are shaded', '6 wholes', '6 parts not shaded'], 0, bars({ numerator: 2, denominator: 6 }), 'Look at the denominator.', 'The denominator is the number of equal parts in all.', bars({ numerator: 1, denominator: 3 })),
      practice('A tray has 6 spaces. 4 have a snack. What fraction have a snack?', ['6/4', '4/6', '4/4'], 1, bars({ numerator: 4, denominator: 6 }), 'The numerator is the number of spaces with a snack. The denominator is the number of spaces in all.', 'The numerator is 4 spaces with a snack. The denominator is 6 spaces in all.', bars({ numerator: 1, denominator: 2 })),
      practice('In 5/8, how many parts are counted?', ['8', '5', '13'], 1, bars({ numerator: 5, denominator: 8 }), 'Look at the numerator.', 'The numerator is 5. So 5 parts are counted.', bars({ numerator: 2, denominator: 4 })),
      // Thirds, so every wrong choice is a real slip in a part the fraction words screen names: the parts compared (1/2),
      // the other parts counted (2/3), one part too many counted (1/4).
      practice('A shape has 3 equal parts. 1 is colored. What fraction is colored?', ['1/3', '1/2', '2/3', '1/4'], 0, bars({ numerator: 1, denominator: 3 }), 'Count all the equal parts first.', 'The denominator is all 3 equal parts. The numerator is the 1 colored part.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
    ],
    ideaQuestions: [
      // Idea 2, the bottom number: the answers are counts (no fraction is written until idea 3 teaches the top number).
      // Wrong choices: the cuts counted instead of the parts, the edges and cuts counted, the whole strip as 1.
      practice('This strip is cut into equal parts. How many equal parts make the whole?', ['3', '2', '4', '1'], 0, { kind: 'partition', parts: [100 / 3, 100 / 3, 100 / 3] }, 'Count every part, one at a time. That number is the bottom number.', 'The strip has 3 equal parts, so the bottom number, the denominator, is 3.', { kind: 'partition', parts: [50, 50] }, { authoredChoices: true }),
      practice('This bar has 3 cuts. How many equal parts make the whole?', ['4', '3', '5', '2'], 0, { kind: 'partition', parts: [25, 25, 25, 25] }, 'Count the parts, not the cuts.', '3 cuts make 4 equal parts. Count the parts, not the cuts: the bottom number is 4.', { kind: 'partition', parts: [50, 50] }, { authoredChoices: true }),
      // A slice missed or counted twice, or the 4 cut lines counted instead of the 8 slices.
      practice('This pizza is cut into equal slices. What is the denominator?', ['8', '7', '4', '9'], 0, { kind: 'area', cut: 'circle-eighths', shaded: [] }, 'Count all the equal slices. That number is the denominator.', '8 equal slices make the whole pizza, so the denominator is 8.', { kind: 'area', cut: 'circle-fourths', shaded: [] }, { authoredChoices: true }),
      practice('In 3/4, what does the 3 mean?', ['3 parts are counted', '3 equal parts in all', '3 wholes', '3 parts not counted'], 0, bars({ numerator: 3, denominator: 4 }), 'The numerator is the top number. It counts the parts we take.', 'The top number, 3, is the numerator: 3 of the equal parts are counted.', bars({ numerator: 2, denominator: 3 }), { authoredChoices: true }),
      practice('3 out of 8 equal parts are shaded. What fraction is shaded?', ['3/8', '8/3', '5/8', '8/8'], 0, bars({ numerator: 3, denominator: 8 }), 'Count all the parts for the bottom number. Count the shaded parts for the top number.', '8 equal parts in all, so 8 goes on the bottom. 3 are shaded, so 3 goes on top: 3/8.', bars({ numerator: 1, denominator: 4 }), { authoredChoices: true }),
      // Idea 1, equal parts are the same size (yes or no, no fractions): from "Fair parts in any shape" when it was lesson 1.
      practice('This ribbon is cut into 2 parts. Are the parts the same size?', ['Yes, same-size parts', 'No, one part is bigger', 'No, there must be 3 parts', 'Yes, there are 3 parts'], 0, { kind: 'partition', parts: [50, 50] }, 'Compare the 2 parts. Is one bigger?', 'Both parts are the same size, so they are equal parts.', { kind: 'partition', parts: [50, 50] }),
      practice('Is this strip cut into 3 equal parts?', ['Yes, 3 equal parts', 'No, the parts are unequal', 'No, there are 2 parts', 'Yes, there are 3 parts'], 1, { kind: 'partition', parts: [50, 25, 25] }, 'Equal parts are all the same size. Compare the parts.', 'One part is twice as big as the others, so the parts are not equal.', { kind: 'partition', parts: [100 / 3, 100 / 3, 100 / 3] }),
      practice('Is this pizza cut into 4 equal slices?', ['No, the slices are different sizes', 'Yes, 4 equal slices', 'Yes, there are 4 slices', 'No, it needs 8 slices'], 0, { kind: 'area', cut: 'circle-unequal', shaded: [] }, 'Equal slices are all the same size. Compare the slices.', 'One slice is bigger than the others, so these are not 4 equal slices.', { kind: 'area', cut: 'circle-fourths', shaded: [] }),
      // Idea 3: the first fraction a child picks, right after its Learn page explains both numbers (one part only).
      // Wrong choices: the cuts counted (1/3), any part called a half (1/2), the other parts counted (3/4). No fifths:
      // the fraction words screen names halves, thirds, fourths, sixths and eighths.
      practice('A sandwich is cut into 4 equal parts. What is 1 part?', ['1/3', '1/4', '1/2', '3/4'], 1, bars({ numerator: 1, denominator: 4 }), 'Count all the equal parts. That is the bottom number.', 'The bottom number is all 4 parts. You have 1.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
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
      practice('Does this bar show 1/3?', ['Yes, 1 of 3 equal parts', 'No, 3 parts are shaded', 'Yes, it has 3 parts', 'No, 2 parts not shaded'], 0, bars({ numerator: 1, denominator: 3 }), '1/3 is 1 of 3 equal parts.', 'The bar has 3 equal parts and 1 is shaded. That is 1/3.', bars({ numerator: 1, denominator: 2 })),
      practice('What fraction is 1 of 6 equal tiles?', ['6/1', '1/6', '1/5'], 1, bars({ numerator: 1, denominator: 6 }), '1 tile out of 6.', '1 out of 6 equal parts is 1/6.', bars({ numerator: 1, denominator: 3 })),
    ],
    ideaQuestions: [
      practice('How many 1/4 parts fill the whole bar?', ['4', '1', '3', '5'], 0, bars({ numerator: 1, denominator: 4 }), 'Count the 1/4 parts until the whole bar is full.', '1/4, 2/4, 3/4, 4/4: 4 fourths make one whole.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('How many sixths make one whole?', ['6', '1', '5', '3'], 0, bars({ numerator: 1, denominator: 6 }), 'Count the sixths until the whole bar is full.', '6 sixths fill the bar: 6 sixths make one whole.', bars({ numerator: 1, denominator: 3 }), { authoredChoices: true }),
      practice('3 friends share a pizza fairly. What fraction does each friend get?', ['1/3', '3/3', '1/2', '1/4'], 0, { kind: 'area', cut: 'circle-thirds', shaded: [] }, 'Cut the pizza into one equal part for each friend.', '3 friends, so 3 equal slices. Each friend gets 1 slice: 1/3.', { kind: 'area', cut: 'circle-halves', shaded: [0] }, { authoredChoices: true }),
      practice('2 friends share a bar fairly. What fraction does each friend get?', ['1/2', '2/2', '1/3', '1/4'], 0, bars({ numerator: 0, denominator: 2 }), 'Cut the bar into one equal part for each friend.', '2 friends, so 2 equal parts. Each friend gets 1 part: 1/2.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('6 friends share a cake fairly. What fraction of the cake does each friend get?', ['1/6', '6/6', '1/5', '1/7'], 0, { kind: 'area', cut: 'circle-sixths', shaded: [] }, 'Cut the cake into one equal part for each friend.', '6 friends, so 6 equal pieces. Each friend gets 1 piece: 1/6.', { kind: 'area', cut: 'circle-thirds', shaded: [0] }, { authoredChoices: true }),
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
    ideaQuestions: [
      practice('Which is bigger, 1/6 or 1/3?', ['1/3', '1/6', 'They are equal', 'You can\'t tell'], 0, bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 3 }), 'Look at the denominators. The smaller denominator is the bigger part.', '3 is less than 6, so thirds are bigger parts. 1/3 is bigger.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Which is smaller, 1/8 or 1/2?', ['1/8', '1/2', 'They are equal', 'You can\'t tell'], 0, bars({ numerator: 1, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Look at the denominators. The bigger denominator is the smaller part.', '8 is more than 2, so eighths are smaller parts. 1/8 is smaller.', bars({ numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('Which is bigger, 1/6 or 1/8?', ['1/6', '1/8', 'They are equal', 'You can\'t tell'], 0, bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 8 }), 'Look at the denominators. Which one is smaller?', '6 is less than 8, so sixths are bigger parts. 1/6 is bigger.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Which is closer to the whole bar: 1/3 or 1/8?', ['1/3', '1/8', 'They are equally close', 'You can\'t tell'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 8 }), 'The bigger part fills more of the bar, so it is closer to the whole bar.', '1/3 is a bigger part than 1/8. It fills more of the bar, so it is closer to the whole bar.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Which is farther from one whole: 1/2 or 1/6?', ['1/6', '1/2', 'They are equally far', 'You can\'t tell'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 6 }), 'The smaller part leaves more of the whole bar empty.', '1/6 is smaller than 1/2, so it leaves more of the bar empty. 1/6 is farther from one whole.', bars({ numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('Which is smaller, 1/4 or 1/2?', ['1/4', '1/2', 'They are equal', 'You can\'t tell'], 0, bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 2 }), 'Cut one whole into 4. Cut the same whole into 2. Which parts are smaller?', 'More parts make smaller parts. Fourths are smaller than halves, so 1/4 is smaller.', bars({ numerator: 1, denominator: 3 }), { authoredChoices: true }),
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
    ideaQuestions: [
      practice('To find 1/4 of 12 toy cars, how many equal groups do you make?', ['4 groups', '12 groups', '3 groups', '2 groups'], 0, { kind: 'set', selected: 0, total: 12 }, 'The denominator of 1/4 says how many equal groups to make.', 'The denominator of 1/4 is 4, so make 4 equal groups.', { kind: 'set', selected: 0, total: 8 }, { authoredChoices: true }),
      practice('10 shells are shared into 2 equal groups. How many shells are in each group?', ['5', '2', '8', '10'], 0, setModel(0, 10, 2), 'Give one shell to each group, again and again, until none are left.', '10 shells shared into 2 equal groups: each group has 5 shells.', setModel(0, 6, 2), { authoredChoices: true }),
      practice('18 buttons are shared into 6 equal groups. How many buttons are in each group?', ['3', '6', '12', '18'], 0, setModel(0, 18, 6), 'Give one button to each group, again and again, until none are left.', '18 buttons shared into 6 equal groups: each group has 3 buttons.', setModel(0, 12, 6), { authoredChoices: true }),
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
    ideaQuestions: [
      practice('To find 2/3 of 9, you make 3 equal groups. How many are in one group?', ['3', '2', '6', '9'], 0, setModel(0, 9, 3), 'Share the 9 into 3 equal groups. Then count one group.', '9 shared into 3 equal groups is 3 in each group.', setModel(0, 6, 3), { authoredChoices: true }),
      practice('To find 3/4 of 20, you make 4 equal groups. How many are in one group?', ['5', '4', '15', '20'], 0, setModel(0, 20, 4), 'Share the 20 into 4 equal groups. Then count one group.', '20 shared into 4 equal groups is 5 in each group.', setModel(0, 8, 4), { authoredChoices: true }),
      practice('To find 3/5 of 10, you make 5 equal groups. How many are in one group?', ['2', '3', '6', '10'], 0, setModel(0, 10, 5), 'Share the 10 into 5 equal groups. Then count one group.', '10 shared into 5 equal groups is 2 in each group.', setModel(0, 15, 5), { authoredChoices: true }),
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
      practice('Which is more than 1/2?', ['2/6', '3/4', '1/4'], 1, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 2, denominator: 6, named: true }, { numerator: 3, denominator: 4, named: true }, { numerator: 1, denominator: 4, named: true }), 'Find half of each denominator. Which numerator is bigger than that?', '3/4 is more than half. The others are less.', bars({ numerator: 1, denominator: 2 })),
      practice('Is 1/3 more or less than 1/2?', ['Less than 1/2', 'Equal to 1/2', 'More than 1/2'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 2 }), 'Half of 3 is 1 and a half.', '1 is less than 1 and a half. So 1/3 is less than half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is closest to 1/2?', ['5/8', '1/6', '7/8'], 0, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 5, denominator: 8 }, { numerator: 1, denominator: 6 }, { numerator: 7, denominator: 8 }), 'Half of 8 is 4. Which is nearest to half?', '5/8 is just over half. The others are farther from half.', bars({ numerator: 1, denominator: 2 })),
      practice('A jug is 4/6 full. Is that more or less than half?', ['More than half', 'Less than half', 'Exactly half'], 0, bars({ numerator: 4, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Half of 6 is 3.', '4 is more than 3. So 4/6 is more than half.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      practice('A bar has 6 equal parts. How many parts make one half?', ['3', '2', '6', '1'], 0, bars({ numerator: 0, denominator: 6 }), 'Half of the parts make one half. What is half of 6?', 'Half of 6 is 3, so 3 parts make one half: 3/6.', bars({ numerator: 0, denominator: 4 }), { authoredChoices: true }),
      practice('Which fraction is exactly one half?', ['2/4', '1/4', '3/4', '4/4'], 0, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 1, denominator: 4, named: true }, { numerator: 2, denominator: 4, named: true }, { numerator: 3, denominator: 4, named: true }, { numerator: 4, denominator: 4, named: true }), 'Find half of the denominator. Half of 4 is 2.', 'Half of 4 is 2, so 2/4 is exactly one half.', bars({ numerator: 1, denominator: 2, named: true }), { authoredChoices: true }),
      practice('Half of a cake is 2 equal pieces. How many equal pieces make the whole cake?', ['4', '2', '3', '1'], 0, { kind: 'area', cut: 'circle-halves', shaded: [0] }, 'The other half has the same number of pieces.', '2 pieces in each half: 2 and 2 make 4 equal pieces in the whole cake.', { kind: 'area', cut: 'circle-fourths', shaded: [0, 1] }, { authoredChoices: true }),
      practice('Is 5/6 more or less than 1/2?', ['More than 1/2', 'Less than 1/2', 'Equal to 1/2', 'More than 1'], 0, bars({ numerator: 5, denominator: 6 }, { numerator: 1, denominator: 2 }), 'Half of 6 is 3. Is 5 more or less than 3?', '5 is more than 3, so 5/6 is more than half.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Is 4/7 more or less than 1/2?', ['More than 1/2', 'Less than 1/2', 'Equal to 1/2', 'More than 1'], 0, bars({ numerator: 4, denominator: 7 }, { numerator: 1, denominator: 2 }), 'Half of 7 is 3 and a half. Is 4 more or less than that?', '4 is more than 3 and a half, so 4/7 is more than half.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Is 3/7 more or less than 1/2?', ['Less than 1/2', 'More than 1/2', 'Equal to 1/2', 'More than 1'], 0, bars({ numerator: 3, denominator: 7 }, { numerator: 1, denominator: 2 }), 'Half of 7 is 3 and a half. Is 3 more or less than that?', '3 is less than 3 and a half, so 3/7 is less than half.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Which is closer to 1/2: 5/6 or 4/6?', ['4/6', '5/6', 'They are equally close', 'You can\'t tell'], 0, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 5, denominator: 6, named: true }, { numerator: 4, denominator: 6, named: true }), 'Half of 6 is 3. Count how many parts each one is from 3.', '4/6 is 1 part away from half. 5/6 is 2 parts away. So 4/6 is closer to half.', bars({ numerator: 1, denominator: 2, named: true }), { authoredChoices: true }),
      practice('Use eighths. Which fraction is 1 part less than half?', ['3/8', '5/8', '4/8', '1/8'], 0, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 0, denominator: 8 }), 'Half of 8 is 4, so half is 4/8. Take away 1 part.', 'Half is 4/8. 1 part less than half is 3/8.', bars({ numerator: 1, denominator: 2, named: true }), { authoredChoices: true }),
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
      practice('Which is between 1/2 and 1?', ['3/8', '3/4', '1/4', '1/8'], 1, bars({ numerator: 3, denominator: 4 }), 'Find one past half but not full.', '3/4 is more than half but less than 1.', bars({ numerator: 1, denominator: 2 })),
      practice('A plant grew 7/8 of a meter. Is that near 0, 1/2 or 1 meter?', ['0 meters', '1 meter', '1/2 meter', '7 meters'], 1, bars({ numerator: 7, denominator: 8 }), 'Just 1 eighth is missing.', '7/8 is almost one whole meter.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      practice('A worm is 1/6 of a meter long. Is that near 0, 1/2 or 1 meter?', ['0 meters', '1/2 meter', '1 meter', '6 meters'], 0, bars({ numerator: 1, denominator: 6 }), 'Half of 6 is 3. Is 1 far below 3, or close to it?', '1 is far below 3, so 1/6 of a meter is near 0 meters.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('A ribbon is 2/6 of a meter long. Is that near 0, 1/2 or 1 meter?', ['1/2 meter', '0 meters', '1 meter', '2 meters'], 0, bars({ numerator: 2, denominator: 6 }), 'Half of 6 is 3. Is 2 far below 3, or close to it?', '2 is just 1 part below 3, so 2/6 of a meter is near 1/2 meter.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('How much is missing from 3/4 to make one whole?', ['1/4', '3/4', '4/4', '1/3'], 0, bars({ numerator: 3, denominator: 4 }), 'One whole is 4/4. How many fourths are not shaded?', '3/4 is missing 1 part to make one whole. 1/4 is missing.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Is 5/8 nearer 1/2 or 1?', ['Nearer 1/2', 'Nearer 1', 'Nearer 0', 'Exactly 1/2'], 0, bars({ numerator: 5, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Half of 8 is 4. How many parts is 5 from 4? How many from 8?', '5/8 is 1 part from half and 3 parts from one whole. So 5/8 is nearer 1/2.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Is 5/6 nearer 1/2 or 1?', ['Nearer 1', 'Nearer 1/2', 'Nearer 0', 'Exactly 1/2'], 0, bars({ numerator: 5, denominator: 6 }, { numerator: 1, denominator: 2 }), 'Half of 6 is 3. How many parts is 5 from 3? How many from 6?', '5/6 is 2 parts from half and 1 part from one whole. So 5/6 is nearer 1.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('A snake is 4/5 of a meter long. Is that near 0, 1/2 or 1 meter?', ['1 meter', '1/2 meter', '0 meters', '4 meters'], 0, bars({ numerator: 4, denominator: 5 }), 'One whole is 5/5. How many fifths are missing?', '4/5 is missing just 1 part, so 4/5 of a meter is near 1 meter.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
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
      practice('Which is just a little less than 1/2?', ['3/8', '1/8', '7/8'], 0, bars({ numerator: 1, denominator: 2, named: true }, { numerator: 3, denominator: 8, named: true }, { numerator: 1, denominator: 8, named: true }, { numerator: 7, denominator: 8, named: true }), 'Half of 8 is 4. Which numerator is just under 4?', '3/8 is just under half.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is a little more than 1/2?', ['3/8', '5/8', '1/6'], 1, bars({ numerator: 5, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Half of 8 is 4. Which is a bit more?', '5/8 is just over half. The others are under.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is closest to 1?', ['7/8', '2/8', '3/8'], 0, bars({ numerator: 7, denominator: 8 }, { numerator: 2, denominator: 8 }, { numerator: 3, denominator: 8 }), 'Which numerator is closest to 8?', '7/8 is just 1 part away from one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('Four 1/8 parts make what?', ['Exactly 1/2', 'Exactly 1/4', 'One whole', '4 wholes'], 0, bars({ numerator: 4, denominator: 8 }), 'How many eighths make half of 8 eighths?', '4/8 is the same as 1/2.', bars({ numerator: 2, denominator: 4 })),
    ],
    ideaQuestions: [
      practice('A path is 5/8 of a mile. Is that closest to 0, 1/2 or 1 mile?', ['1/2 mile', '0 miles', '1 mile', '5 miles'], 0, bars({ numerator: 5, denominator: 8 }), 'Half of 8 is 4. Is 5 closest to 0, to 4 or to 8?', '5 is 1 part from 4, so 5/8 of a mile is closest to 1/2 mile.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Is 4/6 a little more or a little less than 1/2?', ['A little more than 1/2', 'A little less than 1/2', 'Exactly 1/2', 'Much less than 1/2'], 0, bars({ numerator: 4, denominator: 6 }, { numerator: 1, denominator: 2 }), 'Half of 6 is 3. Is 4 just over 3, or just under?', '4 is just 1 more than 3, so 4/6 is a little more than 1/2.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
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
      practice('0 to 1 has 6 equal spaces. What is 1 jump?', ['1/6', '1/7', '6/1'], 0, line(1, 6), 'Count the spaces from 0 to 1.', '6 jumps make one whole. So 1 jump is 1/6.', line(1, 2)),
      practice('How many spaces do you need for fourths?', ['4 spaces', '3 spaces', '5 spaces'], 0, { kind: 'line', numerator: 0, denominator: 1, wholes: 1, hideLabels: true }, 'The denominator tells how many equal spaces go from 0 to 1.', 'Fourths need 4 spaces from 0 to 1.', line(1, 2)),
      practice('A line has 8 equal spaces. Where is 3/8?', ['3 jumps from 0', '8 jumps from 0', '3 jumps back from 1', '5 jumps from 0'], 0, line(0, 8), 'The numerator tells how many jumps from 0.', 'The numerator 3 means 3 jumps.', line(1, 4)),
      practice('0 to 1 has 6 equal spaces. Where do 5 jumps land?', ['5/6', '6/5', '1/5'], 0, line(5, 6), 'Count 5 jumps from 0.', '5 jumps of 1/6 is 5/6.', line(2, 4)),
    ],
    ideaQuestions: [
      practice('How many equal spaces from 0 to 1 make eighths?', ['8 spaces', '7 spaces', '9 spaces', '4 spaces'], 0, { kind: 'line', numerator: 0, denominator: 1, wholes: 1, hideLabels: true }, 'The denominator tells how many equal spaces go from 0 to 1.', 'Eighths need 8 equal spaces from 0 to 1.', line(1, 2), { authoredChoices: true }),
      practice('Count the spaces between the tick marks. How many equal spaces go from 0 to 1?', ['6', '7', '5', '1'], 0, { kind: 'line', numerator: 0, denominator: 6, wholes: 1, hideLabels: true }, 'Count the spaces, not the tick marks.', '7 tick marks make 6 equal spaces from 0 to 1.', { kind: 'line', numerator: 0, denominator: 2, wholes: 1, hideLabels: true }, { authoredChoices: true }),
      practice('A line from 0 to 1 has 5 equal spaces. What fraction is 1 jump?', ['1/5', '1/6', '5/1', '1/4'], 0, { kind: 'line', numerator: 1, denominator: 5, wholes: 1, hideLabels: true }, 'Count the spaces from 0 to 1. That is the denominator.', '5 jumps make one whole. So 1 jump is 1/5.', line(1, 2), { authoredChoices: true }),
      practice('Each space from 0 to 1 is 1/3. How many equal spaces are there?', ['3', '1', '4', '2'], 0, { kind: 'line', numerator: 0, denominator: 3, wholes: 1, hideLabels: true }, 'The denominator of 1/3 tells how many equal spaces.', '1/3 is one of 3 equal spaces, so there are 3 spaces from 0 to 1.', line(1, 2), { authoredChoices: true }),
      practice('A frog makes 3 jumps. Each jump is 1/4 meter. How far did it go?', ['3/4 meter', '1/4 meter', '3 meters', '1/3 meter'], 0, { kind: 'line', numerator: 0, denominator: 4, wholes: 1, hideLabels: true }, 'Each jump is 1/4. Count 3 jumps from 0.', '3 jumps of 1/4 is 3/4. The frog went 3/4 of a meter.', line(1, 2), { authoredChoices: true }),
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
      practice('The point is halfway from 0 to 1. What is it?', ['1/2', '1/4', '2/1'], 0, line(1, 2), 'Halfway is the middle of the line. Count the equal jumps from 0 to 1.', 'Halfway is 1/2.', line(1, 2)),
      practice('A line has 4 spaces. What is 3 jumps from 0?', ['3/4', '4/3', '1/4'], 0, line(3, 4), 'Each jump is 1/4. Count 3.', '3 jumps of 1/4 is 3/4.', line(1, 2)),
      practice('A line has 8 spaces. The point is 5 jumps from 0. What is it?', ['5/8', '8/5', '5/3'], 0, line(5, 8), 'Each jump is 1/8. Count 5.', '5 jumps of 1/8 is 5/8.', line(1, 2)),
    ],
    ideaQuestions: [
      // Idea 1: count the spaces from 0 to 1 (the denominator). No point to name yet.
      practice('How many equal spaces are there from 0 to 1?', ['6 spaces', '7 spaces', '5 spaces', '1 space'], 0, { kind: 'line', numerator: 0, denominator: 6, wholes: 1, hideLabels: true }, 'Count the spaces between the tick marks, not the marks.', 'The 7 tick marks make 6 equal spaces from 0 to 1.', { kind: 'line', numerator: 0, denominator: 6, wholes: 1 }, { authoredChoices: true }),
      practice('This line has equal spaces from 0 to 1. What is the denominator?', ['8', '9', '7', '1'], 0, { kind: 'line', numerator: 0, denominator: 8, wholes: 1, hideLabels: true }, 'The denominator is the number of equal spaces from 0 to 1.', '8 equal spaces from 0 to 1: the denominator is 8.', { kind: 'line', numerator: 0, denominator: 8, wholes: 1 }, { authoredChoices: true }),
      practice('A line has 4 equal spaces from 0 to 1. What fraction is 1 space?', ['1/4', '1/5', '1/3', '4/4'], 0, { kind: 'line', numerator: 0, denominator: 4, wholes: 1, hideLabels: true }, 'Each space is 1 of the equal spaces from 0 to 1.', '4 equal spaces make one whole, so 1 space is 1/4.', { kind: 'line', numerator: 0, denominator: 4, wholes: 1 }, { authoredChoices: true }),
      // Idea 2: count the jumps from 0 to the point (the numerator).
      practice('How many jumps is it from 0 to the point?', ['3 jumps', '4 jumps', '2 jumps', '5 jumps'], 0, { kind: 'line', numerator: 3, denominator: 5, wholes: 1, hideLabels: true }, 'Start at 0. Count each jump until you reach the point.', 'Count from 0: 1, 2, 3 jumps to the point.', line(3, 5), { authoredChoices: true }),
      practice('Count the jumps from 0 to the point. What is the numerator?', ['4', '6', '5', '2'], 0, { kind: 'line', numerator: 4, denominator: 6, wholes: 1, hideLabels: true }, 'The numerator counts the jumps from 0 to the point.', '4 jumps from 0 to the point: the numerator is 4.', line(4, 6), { authoredChoices: true }),
      practice('Which tells you the numerator?', ['The jumps from 0 to the point', 'The spaces from 0 to 1', 'The tick marks', 'The numbers 0 and 1'], 0, { kind: 'line', numerator: 2, denominator: 3, wholes: 1, hideLabels: true }, 'The numerator counts. What do you count to reach the point?', 'The numerator counts the jumps from 0 to the point. The spaces from 0 to 1 give the denominator.', line(2, 3), { authoredChoices: true }),
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
      practice('Each jump is 1/4. What is 5 jumps from 0?', ['5/4', '4/5', '1/4'], 0, line(5, 4, 2), '4 jumps reach 1. Then 1 more.', '4 jumps reach 1. 1 more jump makes 5 jumps: 5/4.', line(3, 4)),
      practice('Each jump is 1/3. Which point is just past 1?', ['4/3', '5/3', '3/3', '2/3'], 0, line(4, 3, 2), '3 jumps of 1/3 reach 1. Take 1 more jump.', '3 jumps reach 1. 1 more jump is 4/3, just past 1.', line(2, 3)),
      practice('What fraction is the same as 1 and 2/6?', ['8/6', '6/8', '2/6'], 0, line(8, 6, 2), 'One whole is 6/6. Add 2 more.', 'One whole is 6/6. 2 more sixths make 8/6.', line(6, 6)),
      practice('A runner takes 10 steps. Each step is 1/6 mile. How far is that?', ['1 and 3/6 miles', '1 and 4/6 miles', '4/6 mile'], 1, line(10, 6, 2), '6 steps make one whole. How many are left?', '10/6 is 6/6 and 4/6. That is 1 and 4/6.', line(6, 6)),
    ],
    ideaQuestions: [
      // Idea 1: keep counting the same jumps past 1.
      practice('Each jump is 1/3. What is 5 jumps from 0?', ['5/3', '3/5', '5/4', '1/3'], 0, line(5, 3, 2), '3 jumps reach 1. Keep counting the same jumps.', 'Count every jump from 0: 5 jumps of 1/3 is 5/3.', line(3, 3), { authoredChoices: true }),
      // Idea 2: a whole and the jumps left over.
      practice('Each jump is 1/3. 5 jumps land at 5/3. Which is the same as 5/3?', ['1 and 2/3', '1 and 5/3', '2/3', '5 and 1/3'], 0, line(5, 3, 2), '3 jumps make 1 whole. How many jumps are left?', '3 of the 5 jumps make 1 whole. 2 jumps are left: 1 and 2/3.', line(3, 3), { authoredChoices: true }),
    ],
  },
  {
    id: 'compare-same-denominator', title: 'Same parts, different counts', shortTitle: 'Compare like parts', skill: 'The same denominator means the parts are the same size. More counted parts make the larger fraction.',
    description: 'Compare fractions with same-size parts.', example: {
      prompt: 'Which is bigger, 3/8 or 5/8?',
      answer: '5/8.',
      explanation: 'Both use eighths. 5 parts are more than 3.',
      model: bars({ numerator: 3, denominator: 8 }, { numerator: 5, denominator: 8 }),
    },
    questions: [
      practice('Which is bigger, 4/6 or 2/6?', ['2/6', '4/6', 'They are equal'], 1, bars({ numerator: 4, denominator: 6 }, { numerator: 2, denominator: 6 }), 'Same size parts. Which has more?', '4 parts are more than 2 parts.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is smaller, 1/3 or 2/3?', ['1/3', '2/3', 'They match'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 }), 'Both are thirds. Which has fewer?', '1 third is less than 2 thirds.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 6/8 __ 7/8', ['>', '<', '='], 1, bars({ numerator: 6, denominator: 8 }, { numerator: 7, denominator: 8 }), 'Same denominator. Compare 6 and 7.', '6 is less than 7. So 6/8 < 7/8.', bars({ numerator: 1, denominator: 4 })),
      practice('Which is bigger, 1/4 or 3/4?', ['1/4', '3/4', 'They are equal'], 1, bars({ numerator: 1, denominator: 4 }, { numerator: 3, denominator: 4 }), 'Same size parts. Count them.', '3 parts are more than 1.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      // Idea 1: the same denominator means same-size parts (nothing compared yet).
      practice('Are the parts of 2/5 the same size as the parts of 4/5?', ['No, 4/5 has bigger parts', 'No, 2/5 has bigger parts', 'Yes, both are fifths', 'Yes, both have 4 parts'], 2, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 5 }), 'Look at the denominators. The same denominator means the same size parts.', 'Both denominators are 5. Both are fifths, so the parts are the same size.', bars({ numerator: 1, denominator: 5 }), { authoredChoices: true }),
      practice('What size are the parts in 3/8 and in 5/8?', ['Both are eighths', 'Thirds and fifths', 'Both are fifths', 'They are different sizes'], 0, bars({ numerator: 3, denominator: 8 }, { numerator: 5, denominator: 8 }), 'The denominator tells the size of the parts.', 'Both denominators are 8, so both are eighths: the same size parts.', bars({ numerator: 1, denominator: 8 }), { authoredChoices: true }),
      practice('Which has bigger parts, 1/6 or 5/6?', ['5/6', '1/6', 'The parts are the same size', "You can't tell"], 2, bars({ numerator: 1, denominator: 6 }, { numerator: 5, denominator: 6 }), 'Look at the denominators. Are they the same?', 'Both are sixths, so the parts are the same size. 5/6 just has more of them.', bars({ numerator: 1, denominator: 6 }), { authoredChoices: true }),
      // Idea 3: write it with a sign.
      practice('Pick the sign: 5/6 __ 3/6', ['>', '<', '='], 0, bars({ numerator: 5, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Same denominator. Compare 5 and 3.', '5 is more than 3. So 5/6 > 3/6.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Pick the sign: 2/5 __ 4/5', ['>', '<', '='], 1, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 5 }), 'Same denominator. Compare 2 and 4.', '2 is less than 4. So 2/5 < 4/5.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
    ],
  },
  {
    id: 'compare-same-numerator', title: 'Same count, different sizes', shortTitle: 'Same numerators', skill: 'When the wholes are the same size, the same numerator means we count the same number of parts. A larger denominator splits that whole into more equal parts, so each part is smaller, and so is the fraction.',
    explainPrompt: 'Use the bars for 3/4 and 3/8. What does the denominator change in the same-size whole? Why is 3/8 smaller even though both fractions count 3 parts? Then draw same-length bars for 2/3 and 2/4 and explain why 2/3 is larger without repeating the example.',
    description: 'Compare fractions with the same numerator.', example: {
      prompt: 'Which is bigger, 3/4 or 3/8?',
      answer: '3/4.',
      explanation: 'Both same-size bars count 3 parts. Splitting the whole into 8 equal parts makes smaller parts than splitting it into 4, so 3/8 is less than 3/4. With a sign: 3/4 > 3/8.',
      model: bars({ numerator: 3, denominator: 4 }, { numerator: 3, denominator: 8 }),
    },
    questions: [
      practice('Which is bigger, 2/3 or 2/8?', ['2/8', '2/3', 'They are equal'], 1, bars({ numerator: 2, denominator: 3 }, { numerator: 2, denominator: 8 }), 'On the same-size whole, both count 2 parts. Which are larger parts: thirds or eighths?', 'Both count 2 parts from the same-size whole. Each third is bigger than each eighth, so 2/3 is bigger.', bars({ numerator: 1, denominator: 3 })),
      practice('Which is smaller, 4/6 or 4/8?', ['4/6', '4/8', 'They are equal'], 1, bars({ numerator: 4, denominator: 6 }, { numerator: 4, denominator: 8 }), 'Both count 4 parts from the same-size whole. The larger denominator, 8, makes smaller parts.', 'Both count 4 parts from the same-size whole. Eighths are smaller than sixths, so 4/8 is less than 4/6.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 1/6 __ 1/4', ['>', '<', '='], 1, bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 4 }), 'Which is larger: one of 6 equal parts or one of 4 equal parts?', 'One sixth is smaller than one fourth, so 1/6 < 1/4.', bars({ numerator: 1, denominator: 2 })),
      practice('Which covers more: 3/8 or 3/6?', ['3/8', '3/6', 'They cover the same'], 1, bars({ numerator: 3, denominator: 8 }, { numerator: 3, denominator: 6 }), 'On the same-size whole, both count 3 parts. Sixths are larger because 6 parts are fewer than 8.', 'Each sixth is larger than each eighth. With 3 parts counted from the same-size whole, 3/6 covers more than 3/8.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      practice('Pick the sign: 5/6 __ 5/8', ['>', '<', '='], 0, bars({ numerator: 5, denominator: 6 }, { numerator: 5, denominator: 8 }), 'Both count 5 parts. Which are bigger parts: sixths or eighths?', 'Sixths are bigger parts than eighths, so 5/6 is more. 5/6 > 5/8.', bars({ numerator: 1, denominator: 2 })),
      practice('Pick the sign: 2/8 __ 2/4', ['>', '<', '='], 1, bars({ numerator: 2, denominator: 8 }, { numerator: 2, denominator: 4 }), 'Both count 2 parts. Which are smaller parts: eighths or fourths?', 'Eighths are smaller parts than fourths, so 2/8 is less. 2/8 < 2/4.', bars({ numerator: 1, denominator: 2 })),
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
      // Commas, not "3/8 and 7/8" (read as the mixed number 8 and 7/8), so every bar in the picture gets its label.
      practice('Put 1/2, 3/8, 7/8 in order, smallest first.', ['3/8, 1/2, 7/8', '7/8, 1/2, 3/8', '1/2, 3/8, 7/8'], 0, bars({ numerator: 3, denominator: 8 }, { numerator: 1, denominator: 2 }, { numerator: 7, denominator: 8 }), '1/2 is the same as 4/8. Compare to that.', '3/8 is less than half. 7/8 is more.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      // Idea 1: compare two at a time (same denominators, same numerators, or with half).
      practice('Which is smaller, 2/6 or 5/6?', ['2/6', '5/6', 'They are equal', "You can't tell"], 0, bars({ numerator: 2, denominator: 6 }, { numerator: 5, denominator: 6 }), 'Same denominators: count the parts.', '2 parts are less than 5 parts, so 2/6 is smaller.', bars({ numerator: 1, denominator: 6 }), { authoredChoices: true }),
      practice('Which is bigger, 1/3 or 1/6?', ['1/3', '1/6', 'They are equal', "You can't tell"], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 6 }), 'Same numerators: bigger parts win. Which are bigger parts, thirds or sixths?', 'Both count 1 part. A third is bigger than a sixth, so 1/3 is bigger.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Which is bigger, 5/8 or 1/2?', ['5/8', '1/2', 'They are equal', "You can't tell"], 0, bars({ numerator: 5, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Half of 8 is 4, so half is 4/8. Compare 5/8 with 4/8.', '5/8 is 1 part more than half, so 5/8 is bigger than 1/2.', bars({ numerator: 4, denominator: 8 }), { authoredChoices: true }),
      // Idea 3: biggest first.
      practice('Which order goes biggest to smallest?', ['5/6, 4/6, 2/6', '2/6, 4/6, 5/6', '4/6, 5/6, 2/6', '5/6, 2/6, 4/6'], 0, bars({ numerator: 2, denominator: 6 }, { numerator: 5, denominator: 6 }, { numerator: 4, denominator: 6 }), 'All sixths. The one with the most parts goes first.', '5/6 has the most parts, then 4/6, then 2/6.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Put 1/3, 1/2, 1/6 in order, biggest first.', ['1/2, 1/3, 1/6', '1/6, 1/3, 1/2', '1/3, 1/2, 1/6', '1/2, 1/6, 1/3'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 2 }, { numerator: 1, denominator: 6 }), 'Each counts 1 part of the same-size whole. Fewer parts in the whole means bigger parts.', '1/2 is biggest, then 1/3, then 1/6.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
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
      practice('Fold a strip in half. Shade one half. Now fold it in half again. What fraction is shaded now?', ['2/4', '1/4', '1/3'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4, untilAnswered: true }), 'Folding again cuts each half into 2 equal parts. How many fourths are shaded?', 'The second fold cuts the shaded half into 2 fourths. 2 of the 4 parts are shaded: 2/4.', bars({ numerator: 1, denominator: 2 })),
      practice('Which is the same as 1/3?', ['2/6', '1/6', '3/1'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 6 }), 'Cut each third into 2 equal parts. Count the shaded parts now.', 'Each third became 2 sixths, so 1 third is 2 sixths: 1/3 = 2/6.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      // Idea 1: split every part the same way.
      practice('Cut each third into 2 equal parts. How many parts are there now?', ['6', '5', '3', '2'], 0, bars({ numerator: 0, denominator: 3 }), 'Each of the 3 parts becomes 2 parts.', '3 parts, each cut into 2: 6 parts.', bars({ numerator: 0, denominator: 6 }), { authoredChoices: true }),
      practice('Cut each fourth into 2 equal parts. What are the new parts called?', ['eighths', 'sixths', 'fourths', 'halves'], 0, bars({ numerator: 0, denominator: 4 }), 'Count all the new parts in the whole.', '4 parts, each cut into 2, make 8 equal parts: eighths.', bars({ numerator: 0, denominator: 8 }), { authoredChoices: true }),
      // Idea 3: join small parts into bigger parts.
      practice('Join every 2 eighths into 1 fourth. What is 2/8 in fourths?', ['1/4', '2/4', '1/8', '4/8'], 0, bars({ numerator: 2, denominator: 8 }), 'Every 2 eighths join into 1 fourth. How many fourths are shaded?', '2 eighths join into 1 fourth, so 2/8 = 1/4.', bars({ numerator: 2, denominator: 8 }), { authoredChoices: true }),
      practice('Join every 2 sixths into 1 third. What is 4/6 in thirds?', ['2/3', '4/3', '1/3', '2/6'], 0, bars({ numerator: 4, denominator: 6 }), 'Every 2 sixths join into 1 third. How many thirds are shaded?', '4 sixths join into 2 thirds, so 4/6 = 2/3.', bars({ numerator: 4, denominator: 6 }), { authoredChoices: true }),
      // Idea 4: the ? box.
      practice('1/3 = ?/6. What number goes in the ? box?', ['2', '1', '4', '6'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 0, denominator: 6 }), 'Cut each third into 2 equal parts. Count the sixths in 1/3.', 'Each third is 2 sixths, so 1/3 = 2/6. The ? is 2.', bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 6 }), { authoredChoices: true }),
      practice('2/4 = ?/8. What number goes in the ? box?', ['4', '2', '6', '8'], 0, bars({ numerator: 2, denominator: 4 }, { numerator: 0, denominator: 8 }), 'Cut each fourth into 2 equal parts. Count the eighths in 2/4.', 'Each fourth is 2 eighths, so 2 fourths are 4 eighths: 2/4 = 4/8. The ? is 4.', bars({ numerator: 2, denominator: 4 }, { numerator: 4, denominator: 8 }), { authoredChoices: true }),
      practice('3/2 = ?/4. What number goes in the ? box?', ['6', '3', '5', '4'], 0, bars({ numerator: 3, denominator: 2 }), 'Cut each half into 2 fourths. Count the fourths in 3 halves.', 'Each half is 2 fourths, so 3 halves are 6 fourths: 3/2 = 6/4. The ? is 6.', bars({ numerator: 6, denominator: 4 }), { authoredChoices: true }),
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
    ideaQuestions: [
      // Idea 1: multiply both.
      practice('Multiply the numerator and denominator of 2/4 by 2. What do you get?', ['4/8', '4/4', '2/8', '4/6'], 0, bars({ numerator: 2, denominator: 4 }), 'Do the same thing to the numerator and denominator.', '2 × 2 = 4 and 4 × 2 = 8. So 4/8.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      // Idea 2: divide both.
      practice('Divide the numerator and denominator of 6/8 by 2. What do you get?', ['3/4', '3/8', '6/4', '4/6'], 0, bars({ numerator: 6, denominator: 8 }), 'Divide both by 2.', '6 ÷ 2 = 3 and 8 ÷ 2 = 4. So 3/4.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      // Idea 3: find the number to multiply by.
      practice('Write 1/2 with a denominator of 6.', ['3/6', '1/6', '5/6', '3/2'], 0, bars({ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 6 }), 'Ask: 2 times what is 6? Multiply the top by that number too.', '2 × 3 = 6, so multiply the top by 3 too: 1 × 3 = 3. So 3/6.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Write 3/4 with a denominator of 8.', ['6/8', '3/8', '7/8', '6/4'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 0, denominator: 8 }), 'Ask: 4 times what is 8? Multiply the top by that number too.', '4 × 2 = 8, so multiply the top by 2 too: 3 × 2 = 6. So 6/8.', bars({ numerator: 3, denominator: 4 }), { authoredChoices: true }),
      practice('Write 2/3 with a denominator of 6.', ['4/6', '2/6', '5/6', '4/3'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 0, denominator: 6 }), 'Ask: 3 times what is 6? Multiply the top by that number too.', '3 × 2 = 6, so multiply the top by 2 too: 2 × 2 = 4. So 4/6.', bars({ numerator: 2, denominator: 3 }), { authoredChoices: true }),
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
      practice('Fill the blank: 3/4 = 6/?', ['8', '4', '10'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 6, denominator: 8 }), 'The numerator was doubled.', 'Double the denominator too: 4 × 2 = 8.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: ?/10 = 2/5', ['4', '2', '5'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 10 }), 'The denominator doubled, 5 to 10.', 'Double the numerator too: 2 to 4.', bars({ numerator: 1, denominator: 2 })),
      practice('Fill the blank: 4/6 = 2/?', ['3', '6', '4'], 0, bars({ numerator: 4, denominator: 6 }, { numerator: 2, denominator: 3 }), 'The numerator was cut in half.', 'Halve the denominator too: 6 ÷ 2 = 3.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      // Idea 1: find the factor on the bottom, use it on the top.
      practice('Fill the blank: 2/3 = ?/6', ['4', '2', '5', '6'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 0, denominator: 6 }), 'What times 3 makes 6?', '3 × 2 = 6, so the factor is 2. Do the same to the top: 2 × 2 = 4.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Fill the blank: 1/4 = ?/12', ['3', '1', '9', '12'], 0, bars({ numerator: 1, denominator: 4 }, { numerator: 0, denominator: 12 }), 'What times 4 makes 12?', '4 × 3 = 12, so the factor is 3. Do the same to the top: 1 × 3 = 3.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      // Idea 2: a missing bottom number.
      practice('Fill the blank: 1/3 = 2/?', ['6', '3', '4', '2'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 6 }), 'The top number was doubled, 1 to 2.', 'Double the bottom too: 3 × 2 = 6.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Fill the blank: 2/5 = 4/?', ['10', '5', '7', '4'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 4, denominator: 10 }), 'The top number was doubled, 2 to 4.', 'Double the bottom too: 5 × 2 = 10.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      // Idea 3: the blank on the left; dividing.
      practice('Fill the blank: ?/4 = 3/12', ['1', '3', '4', '12'], 0, bars({ numerator: 3, denominator: 12 }, { numerator: 0, denominator: 4 }), 'Start with 3/12, the pair with both numbers. 12 divided by what is 4?', '12 ÷ 3 = 4, so divide the top by 3 too: 3 ÷ 3 = 1.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
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
      practice('How many 1/5 parts make one whole?', ['5 parts', '4 parts', '10 parts'], 0, bars({ numerator: 5, denominator: 5 }), 'The denominator is how many parts make one whole.', '5 fifths make one whole: 5/5 = 1.', bars({ numerator: 1, denominator: 5 })),
      practice('Which sum makes one whole?', ['1/3 + 2/3', '1/4 + 1/4', '2/5 + 1/5'], 0, bars({ numerator: 0, denominator: 3 }), 'Look for numerators that add up to the denominator.', '1/3 + 2/3 = 3/3. That is one whole.', bars({ numerator: 1, denominator: 3 }, { numerator: 2, denominator: 3 })),
      practice('What is 2/8 + 6/8?', ['8/8', '8/16', '4/8', '6/8'], 0, bars({ numerator: 2, denominator: 8 }, { numerator: 6, denominator: 8 }), 'Add the numerators. Keep eighths.', '2 + 6 = 8. 8/8 is one whole.', bars({ numerator: 1, denominator: 2 })),
      practice('A recipe uses 3/6 cup, then 3/6 cup more. How much in all?', ['6/6 cup', '6/12 cup', '3/6 cup', '6/3 cup'], 0, bars({ numerator: 3, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Add the numerators. How many sixths fill 1 cup?', '3 + 3 = 6. 6/6 is 1 cup.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      practice('How many 1/8 parts make one whole?', ['8 parts', '7 parts', '1 part', '16 parts'], 0, bars({ numerator: 8, denominator: 8 }), 'The denominator is how many parts make one whole.', '8 eighths make one whole: 8/8 = 1.', bars({ numerator: 1, denominator: 8 }), { authoredChoices: true }),
      practice('A bar is cut into 6 equal parts. Which fraction names the whole bar?', ['6/6', '1/6', '5/6', '3/6'], 0, bars({ numerator: 0, denominator: 6 }), 'The whole bar is all of its equal parts. Count them.', 'All 6 sixths make the whole bar: 6/6 = 1.', bars({ numerator: 6, denominator: 6 }), { authoredChoices: true }),
      practice('What is 2/5 + 2/5?', ['4/5', '4/10', '2/5', '5/4'], 0, equation('2/5 + 2/5 = ?'), 'Add the numerators. Keep fifths.', '2 + 2 = 4. The parts are still fifths: 4/5.', bars({ numerator: 2, denominator: 5 }), { authoredChoices: true }),
      practice('1/4 + ? = 1. What is the missing part?', ['3/4', '1/4', '4/4', '2/4'], 0, bars({ numerator: 1, denominator: 4 }), 'One whole is 4/4. How many more fourths fill it?', 'You have 1 fourth. 3 more fourths fill the whole: 1/4 + 3/4 = 4/4.', bars({ numerator: 4, denominator: 4 }), { authoredChoices: true }),
      practice('5/8 of a wall is painted. What part is not painted yet?', ['3/8', '5/8', '8/8', '3/5'], 0, bars({ numerator: 5, denominator: 8 }), 'The whole wall is 8/8. How many eighths are missing?', '5/8 + 3/8 = 8/8, the whole wall. So 3/8 is not painted yet.', bars({ numerator: 8, denominator: 8 }), { authoredChoices: true }),
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
      // 4.NF.3b: one amount split more than one way, and into unit fractions.
      practice('2/8 + 3/8 makes 5/8. Which is another way to make 5/8?', ['1/8 + 1/8 + 3/8', '1/8 + 3/8', '2/8 + 5/8', '5/8 + 1/8'], 0, bars({ numerator: 5, denominator: 8 }), 'Add the numerators in each choice. Which ones make 5?', '1 + 1 + 3 = 5. So 1/8 + 1/8 + 3/8 = 5/8 too.', bars({ numerator: 5, denominator: 8 })),
      practice('Fill the blank: 6/8 = 2/8 + ?/8', ['4', '3', '8'], 0, bars({ numerator: 6, denominator: 8 }, { numerator: 2, denominator: 8 }), '6 take away 2 is what?', '6 take away 2 is 4. So 2/8 + 4/8 = 6/8.', bars({ numerator: 1, denominator: 2 })),
      practice('Which sum of unit fractions equals 3/6?', ['1/6 + 1/6 + 1/6', '1/6 + 1/6', '1/3 + 1/3 + 1/3', '3/6 + 3/6'], 0, bars({ numerator: 3, denominator: 6 }), 'A unit fraction is one part. How many 1/6 parts make 3/6?', 'Three 1/6 parts make 3/6: 1/6 + 1/6 + 1/6.', bars({ numerator: 3, denominator: 6 })),
      practice('7/10 = 5/10 + what?', ['2/10', '3/10', '5/10'], 0, bars({ numerator: 5, denominator: 10 }, { numerator: 2, denominator: 10 }), '7 take away 5 is what?', '7 take away 5 is 2. So 2/10.', bars({ numerator: 1, denominator: 2 })),
    ],
    ideaQuestions: [
      practice('Which sum makes 4/6?', ['1/6 + 3/6', '1/6 + 4/6', '2/6 + 4/6', '1/3 + 3/3'], 0, bars({ numerator: 4, denominator: 6 }), 'Keep sixths. Which numerators add up to 4?', '1 + 3 = 4, and both parts are sixths. So 1/6 + 3/6 = 4/6.', bars({ numerator: 4, denominator: 6 }), { authoredChoices: true }),
      practice('Is 3/10 + 4/10 a way to break apart 7/10?', ['No, you must split the 10 too', 'No, the two parts must be equal', 'Yes, 3 + 4 = 7 and both are tenths', 'Yes, 3 + 4 = 12 and both are tenths'], 2, bars({ numerator: 7, denominator: 10 }), 'Keep tenths. Do the numerators add back to 7?', '3 + 4 = 7, and both parts are tenths. So 3/10 + 4/10 = 7/10.', bars({ numerator: 7, denominator: 10 }), { authoredChoices: true }),
      practice('Which sum equals 3/5?', ['1/5 + 2/5', '1/5 + 3/5', '2/5 + 2/5', '1/2 + 2/3'], 0, bars({ numerator: 3, denominator: 5 }), 'Keep fifths. Which numerators add up to 3?', '1 + 2 = 3, and both parts are fifths. So 1/5 + 2/5 = 3/5.', bars({ numerator: 3, denominator: 5 }), { authoredChoices: true }),
      practice('1/6 + 4/6 makes 5/6. Which is another way to make 5/6?', ['2/6 + 3/6', '1/6 + 3/6', '2/6 + 4/6', '2/3 + 3/3'], 0, bars({ numerator: 5, denominator: 6 }), 'Add the numerators in each choice. Which ones make 5?', '2 + 3 = 5. So 2/6 + 3/6 = 5/6 too.', bars({ numerator: 5, denominator: 6 }), { authoredChoices: true }),
      practice('Fill the blank: 4/5 = 1/5 + ?/5', ['3', '4', '5', '1'], 0, bars({ numerator: 4, denominator: 5 }, { numerator: 1, denominator: 5 }), '4 take away 1 is what?', '4 take away 1 is 3. So 1/5 + 3/5 = 4/5.', bars({ numerator: 4, denominator: 5 }), { authoredChoices: true }),
    ],
  },
  {
    id: 'improper-fractions', title: 'More than one whole', shortTitle: 'Past a whole', skill: 'When the numerator is greater than the denominator, the fraction is at least one whole. It may have extra parts too.',
    description: 'Keep counting parts past one whole.', example: {
      prompt: 'How many fourths past one whole is 7/4?',
      answer: '3 fourths.',
      explanation: '4/4 is one whole. Keep counting: 5/4, 6/4, 7/4. That is 3 fourths past one whole.',
      model: { kind: 'bars', bars: [{ numerator: 4, denominator: 4 }, { numerator: 3, denominator: 4 }], caption: '7/4 is one whole and 3/4' },
    },
    questions: [
      // Grade 3 (3.NF.2b, 3.NF.3c): count parts past one whole on the line. Naming mixed numbers is the next lesson (4.NF.3).
      practice('How many thirds past one whole is 5/3?', ['2', '5', '3'], 0, line(5, 3, 2), '3/3 is one whole. Count the jumps after it.', '5/3 is 3/3 and 2 more thirds.', line(3, 3, 2)),
      practice('Where is 9/4 on the number line?', ['Between 2 and 3', 'Between 1 and 2', 'Between 0 and 1', 'Between 3 and 4'], 0, line(0, 4, 3), '4/4 is 1 and 8/4 is 2. Is 9/4 past 8/4?', '9/4 is 1 jump past 8/4, so it is between 2 and 3.', line(8, 4, 3)),
      practice('How many fourths make 2 wholes?', ['8', '4', '2'], 0, line(0, 4, 2), 'One whole is 4 fourths. Count the spaces to 2.', '4 + 4 = 8 fourths. So 8/4 = 2.', line(4, 4, 2)),
      practice('Which is more than one whole?', ['9/8', '7/8', '1/8'], 0, line(0, 8, 2), '8/8 is exactly one whole.', '9/8 is 1 part more than a whole.', line(8, 8, 2)),
    ],
    ideaQuestions: [
      practice('Is 5/4 more than one whole?', ['No, it is less than one whole', 'Yes, 4 parts are more than one whole', 'Yes, 5 parts, but only 4 fit in one whole', 'No, a fraction is always less than one whole'], 2, line(0, 4, 2), '4/4 is one whole. Is 5 more than 4?', '5/4 is 4/4 and 1 more fourth, so it is more than one whole.', line(4, 4, 2), { authoredChoices: true }),
      practice('Which is less than one whole?', ['5/6', '7/6', '6/6', '9/6'], 0, line(0, 6, 2), '6/6 is exactly one whole.', '5/6 is 1 part less than a whole.', line(6, 6, 2), { authoredChoices: true }),
      practice('How many sixths make 2 wholes?', ['12', '6', '2', '8'], 0, line(0, 6, 2), 'One whole is 6 sixths. Count the spaces to 2.', '6 + 6 = 12 sixths. So 12/6 = 2.', line(6, 6, 2), { authoredChoices: true }),
      practice('How many sixths past one whole is 8/6?', ['2', '8', '6', '1'], 0, line(8, 6, 2), '6/6 is one whole. Count the jumps after it.', '8/6 is 6/6 and 2 more sixths.', line(6, 6, 2), { authoredChoices: true }),
      practice('What fraction is shaded? Each bar is one whole.', ['5/4', '1/4', '5/8', '4/5'], 0, bars({ numerator: 5, denominator: 4 }), 'Count the shaded fourths in both bars.', '4/4 fill the first bar, and 1/4 is left over: 5 fourths, or 5/4.', bars({ numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 }), { authoredChoices: true }),
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
    ideaQuestions: [
      practice('Each bar is one whole. Which mixed number is shaded?', ['1 and 2/3', '2/3', '2 and 1/3', '1 and 1/3'], 0, bars({ numerator: 3, denominator: 3 }, { numerator: 2, denominator: 3 }), 'Count the full bars. Then count the thirds in the last bar.', '1 full bar and 2/3 of another: 1 and 2/3.', bars({ numerator: 3, denominator: 3 }, { numerator: 2, denominator: 3 }), { authoredChoices: true }),
      practice('How many wholes are in 2 and 3/4?', ['2', '3', '4', '5'], 0, bars({ numerator: 4, denominator: 4 }, { numerator: 4, denominator: 4 }, { numerator: 3, denominator: 4 }), 'The whole number comes first.', '2 and 3/4 is 2 wholes and 3/4 more.', bars({ numerator: 4, denominator: 4 }, { numerator: 4, denominator: 4 }, { numerator: 3, denominator: 4 }), { authoredChoices: true }),
      practice('Which is a mixed number?', ['2 and 1/4', '5/4', '1/4', '2'], 0, bars({ numerator: 4, denominator: 4 }, { numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 }), 'A mixed number has a whole number and a fraction.', '2 and 1/4 has a whole number, 2, and a fraction, 1/4.', bars({ numerator: 4, denominator: 4 }, { numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('What is 1 and 1/4 as fourths?', ['5/4', '2/4', '1/4', '4/4'], 0, line(5, 4, 2), 'One whole is 4/4. Add 1 more.', '4/4 + 1/4 = 5/4.', line(4, 4, 2), { authoredChoices: true }),
      practice('What is 7/5 as wholes and a fraction?', ['1 and 2/5', '2 and 1/5', '1 and 2/7', '1'], 0, line(7, 5, 2), 'Every 5/5 is one whole. What is left?', '5/5 is 1 whole, and 2/5 is left. That is 1 and 2/5.', line(5, 5, 2), { authoredChoices: true }),
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
    ideaQuestions: [
      practice('Do 2/6 and 3/6 have the same size parts?', ['No, 2 and 3 are different', 'No, 3/6 is bigger', 'Yes, both are sixths', 'Yes, because 2 + 3 = 5'], 2, bars({ numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Look at the denominators.', 'Both denominators are 6. Both are sixths, so the parts are the same size.', bars({ numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }), { authoredChoices: true }),
      practice('Which fraction has the same size parts as 3/8?', ['5/8', '3/4', '3/5', '1/3'], 0, bars({ numerator: 3, denominator: 8 }), 'Same size parts means the same denominator.', '5/8 is in eighths too, so its parts are the same size as in 3/8.', bars({ numerator: 3, denominator: 8 }), { authoredChoices: true }),
      practice('Can you add 1/3 + 1/4 by counting the parts?', ['No, thirds and fourths are different sizes', 'No, both numerators are 1', 'Yes, both have 1 part', 'Yes, any parts can be counted together'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 4 }), 'Look at the denominators. Are the parts the same size?', 'A third is bigger than a fourth. The parts are different sizes, so you cannot just count them.', bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('A cat eats 1/4 cup of food, then 2/4 cup more. How much in all?', ['3/4 cup', '3/8 cup', '2/4 cup', '1/4 cup'], 0, bars({ numerator: 1, denominator: 4 }, { numerator: 2, denominator: 4 }), 'Add the numerators. Keep fourths.', '1 + 2 = 3. So 3/4 cup.', bars({ numerator: 1, denominator: 4 }, { numerator: 2, denominator: 4 }), { authoredChoices: true }),
      practice('A ribbon is 2/6 meter long. Add 3/6 meter more. How long is it now?', ['5/6 meter', '5/12 meter', '3/6 meter', '1/6 meter'], 0, bars({ numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Add the numerators. Keep sixths.', '2 + 3 = 5. So 5/6 meter.', bars({ numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }), { authoredChoices: true }),
    ],
  },
  {
    id: 'subtract-like-denominators', title: 'Take parts away', shortTitle: 'Subtract fractions', skill: 'When the parts are the same size, take away the parts, then count how many parts remain. Keep the denominator because the part size stays the same.',
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
    ideaQuestions: [
      practice('Start with 5/8. Take away 2/8. How many eighths are left?', ['3', '7', '2', '5'], 0, bars({ numerator: 5, denominator: 8 }), 'Start with 5 eighths. Take away 2 of them.', '5 − 2 = 3. 3 eighths are left.', bars({ numerator: 5, denominator: 8 }), { authoredChoices: true }),
      practice('Start with 6/10. Take away 4/10. How many tenths are left?', ['2', '10', '4', '6'], 0, bars({ numerator: 6, denominator: 10 }), 'Start with 6 tenths. Take away 4 of them.', '6 − 4 = 2. 2 tenths are left.', bars({ numerator: 6, denominator: 10 }), { authoredChoices: true }),
      practice('Start with 4/6. Take away 1/6. How many sixths are left?', ['3', '5', '1', '4'], 0, bars({ numerator: 4, denominator: 6 }), 'Start with 4 sixths. Take away 1 of them.', '4 − 1 = 3. 3 sixths are left.', bars({ numerator: 4, denominator: 6 }), { authoredChoices: true }),
      practice('A rope is 7/8 meter long. Cut off 2/8 meter. How much is left?', ['5/8 meter', '9/8 meter', '2/8 meter', '7/8 meter'], 0, bars({ numerator: 7, denominator: 8 }, { numerator: 2, denominator: 8 }), 'Take away the numerators. Keep eighths.', '7 − 2 = 5. So 5/8 meter is left.', bars({ numerator: 7, denominator: 8 }), { authoredChoices: true }),
      practice('Mia has 5/6 of a pizza. She eats 3/6. How much is left?', ['2/6', '8/6', '3/6', '5/6'], 0, bars({ numerator: 5, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Take away the numerators. Keep sixths.', '5 − 3 = 2. So 2/6 of the pizza is left.', bars({ numerator: 5, denominator: 6 }), { authoredChoices: true }),
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
    // Idea questions (ideas/lessons-41-50.ts): rename the bigger parts into the smaller parts, before adding is taught.
    ideaQuestions: [
      practice('Halves and sixths are different sizes. Rename 1/2 as sixths.', ['3/6', '1/6', '5/6', '6/3'], 0,
        bars({ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 6 }), 'Cut each half into 3 equal parts. Those parts are sixths.', 'Each half is 3 sixths, so 1/2 = 3/6.',
        bars({ numerator: 1, denominator: 2 }, { numerator: 3, denominator: 6 }), { authoredChoices: true }),
      practice('Fourths and eighths are different sizes. To make them match, which fraction do you rename?', ['1/4, as eighths', '1/8, as fourths', 'Both, as twelfths', 'Neither one'], 0,
        bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 8 }), 'Rename the fraction with the bigger parts into the smaller parts.', 'Fourths are the bigger parts. Cut each fourth in two: 1/4 = 2/8.',
        bars({ numerator: 2, denominator: 8 }, { numerator: 1, denominator: 8 }), { authoredChoices: true }),
      practice('Thirds and sixths are different sizes. Rename 2/3 as sixths.', ['4/6', '2/6', '5/6', '6/4'], 0,
        bars({ numerator: 2, denominator: 3 }, { numerator: 0, denominator: 6 }), 'Cut each third into 2 equal parts. Those parts are sixths.', 'Each third is 2 sixths, so 2/3 = 4/6.',
        bars({ numerator: 2, denominator: 3 }, { numerator: 4, denominator: 6 }), { authoredChoices: true }),
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
      practice('Write 3/10 as a decimal.', ['0.3', '3.0', '0.7', '10.3'], 0, decimal(3), 'Tenths go right after the decimal point.', '3 tenths is 0.3.', decimal(3), { authoredChoices: true }),
      practice('What fraction is 0.6?', ['6/10', '4/10', '1/6', '10/6'], 0, decimal(6), 'The 6 is right after the decimal point. That means tenths.', '0.6 means 6 tenths, or 6/10.', decimal(6), { authoredChoices: true }),
      practice('A strip is 0.4 colored. What fraction is that?', ['4/10', '6/10', '1/4', '10/4'], 0, decimal(4), 'The number right after the decimal point is tenths.', '0.4 means 4 tenths, or 4/10.', decimal(4), { authoredChoices: true }),
      practice('Which is bigger, 0.8 or 5/10?', ['0.8', '5/10', 'They are equal'], 0, bars({ numerator: 8, denominator: 10 }, { numerator: 5, denominator: 10 }), 'Write both numbers as tenths.', '8 tenths are more than 5 tenths.', decimal(8)),
    ],
    ideaQuestions: [
      practice('A strip has 10 equal parts. 3 are colored. What fraction is colored?', ['3/10', '7/10', '3/7', '10/3'], 0, bars({ numerator: 3, denominator: 10 }), 'Count all the equal parts for the bottom number. Count the colored parts for the top.', '3 of the 10 equal parts are colored: 3/10, or 3 tenths.', bars({ numerator: 3, denominator: 10 }), { authoredChoices: true }),
      practice('How many tenths make one whole?', ['10', '1', '9', '5'], 0, bars({ numerator: 0, denominator: 10 }), 'The denominator is how many parts make one whole.', '10 tenths make one whole: 10/10 = 1.', bars({ numerator: 10, denominator: 10 }), { authoredChoices: true }),
      practice('A strip has 10 equal parts. 9 are colored. What fraction is not colored?', ['1/10', '9/10', '1/9', '2/10'], 0, bars({ numerator: 9, denominator: 10 }), 'Count the parts that are not colored. All the parts make the bottom number.', '1 of the 10 parts is not colored: 1/10.', bars({ numerator: 9, denominator: 10 }), { authoredChoices: true }),
      practice('Write 9/10 as a decimal.', ['0.9', '9.0', '0.1', '10.9'], 0, decimal(9), 'Write 0 and the decimal point. Then the tenths go right after the point.', '9 tenths is 0.9.', decimal(9), { authoredChoices: true }),
      practice('A strip has 10 equal parts. 6 are colored. Write the colored part as a decimal.', ['0.6', '6.0', '0.4', '6'], 0, decimal(6), 'How many tenths are colored? Write them right after the decimal point.', '6 tenths are colored: 0.6.', decimal(6), { authoredChoices: true }),
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
      // Idea 3 (a 0 holds the tenths place): no thousandths among the wrong choices, since they are never taught.
      practice('Write 8/100 as a decimal.', ['0.08', '0.8', '8.00', '8.1'], 0, { kind: 'bars', bars: [{ numerator: 8, denominator: 100 }] }, 'Hundredths need 2 places after the decimal point.', '8 hundredths is 0.08. The 0 holds the tenths place.', { kind: 'bars', bars: [{ numerator: 8, denominator: 100 }] }, { authoredChoices: true }),
      practice('What fraction is 0.35?', ['35/100', '35/10', '1/35', '100/35'], 0, { kind: 'bars', bars: [{ numerator: 35, denominator: 100 }] }, '2 places after the decimal point means hundredths.', '0.35 means 35 hundredths, or 35/100.', { kind: 'bars', bars: [{ numerator: 35, denominator: 100 }] }, { authoredChoices: true }),
      // Comparing 0.4 with 0.35 is taught in lesson 33; here, a 0 holding the tenths place.
      practice('What fraction is 0.06?', ['6/100', '6/10', '1/6', '100/6'], 0, { kind: 'bars', bars: [{ numerator: 6, denominator: 100 }] }, '2 places after the decimal point means hundredths. The 0 holds the tenths place.', '0.06 means 0 tenths and 6 hundredths, or 6/100.', { kind: 'bars', bars: [{ numerator: 6, denominator: 100 }] }, { authoredChoices: true }),
      practice('Write 9/100 as a decimal.', ['0.09', '0.9', '9.00', '9.1'], 0, { kind: 'bars', bars: [{ numerator: 9, denominator: 100 }] }, 'Hundredths need 2 places after the decimal point. A 0 holds the tenths place.', '9 hundredths is 0.09. 0.9 is 9 tenths.', { kind: 'bars', bars: [{ numerator: 9, denominator: 100 }] }, { authoredChoices: true }),
    ],
    ideaQuestions: [
      // Idea 1: count the small squares to name hundredths.
      practice('What fraction of the grid is shaded?', ['45/100', '55/100', '45/55', '100/45'], 0, grid100(45), 'The grid has 100 equal squares. Count the shaded ones.', '45 of the 100 squares are shaded: 45/100.', grid100(45), { authoredChoices: true }),
      practice('A grid has 100 equal squares. 7 are shaded. What fraction is shaded?', ['7/100', '7/10', '93/100', '1/7'], 0, grid100(7), 'Each square is 1/100 of the grid. Count the shaded squares.', '7 of 100 equal squares are shaded: 7/100.', grid100(7), { authoredChoices: true }),
      practice('Ana shades 60 of the 100 squares. What fraction did she shade?', ['60/100', '6/100', '60/10', '40/100'], 0, grid100(60), 'There are 100 equal squares in all. How many are shaded?', '60 of 100 squares: 60/100.', grid100(60), { authoredChoices: true }),
      // Idea 2: write hundredths with 0, the point and two places.
      practice('Write 47/100 as a decimal.', ['0.47', '4.7', '47', '47.100'], 0, grid100(47), 'Less than one whole: write 0 and the point. Hundredths use 2 places after the point.', '47 hundredths is 0.47: 2 places after the point.', grid100(47), { authoredChoices: true }),
      practice('The grid shows hundredths. Write the shaded part as a decimal.', ['0.56', '5.6', '56', '0.44'], 0, grid100(56), 'Count the shaded squares. Then write 0, the point and 2 places.', '56 of 100 squares are shaded: 56/100 = 0.56.', grid100(56), { authoredChoices: true }),
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
      practice('A ribbon is 4/10 meter. Another is 25/100 meter. How long are they together?', ['29/100 meter', '65/100 meter', '29/110 meter'], 1, bars({ numerator: 4, denominator: 10 }, { numerator: 25, denominator: 100 }), 'Change 4/10 into hundredths.', '4/10 = 40/100. 40 + 25 = 65. So 65/100 meter, or 0.65 meter.', bars({ numerator: 1, denominator: 10 })),
    ],
    ideaQuestions: [
      // Idea 1: one tenth is ten hundredths.
      practice('Change 4/10 into hundredths.', ['40/100', '4/100', '94/100', '40/10'], 0, bars({ numerator: 4, denominator: 10 }), 'Each tenth is 10 hundredths.', '4 tenths is 4 × 10 = 40 hundredths: 40/100.', bars({ numerator: 1, denominator: 10 }), { authoredChoices: true }),
      practice('A strip is 8/10 blue. How many hundredths of the strip is that?', ['80/100', '8/100', '98/100', '80/10'], 0, bars({ numerator: 8, denominator: 10 }), 'Each tenth is 10 hundredths. How many hundredths are 8 tenths?', '8 tenths is 8 × 10 = 80 hundredths: 80/100.', bars({ numerator: 1, denominator: 10 }), { authoredChoices: true }),
      // Idea 2: add hundredths to hundredths.
      practice('What is 40/100 + 7/100?', ['47/100', '47/200', '33/100', '100/47'], 0, bars({ numerator: 40, denominator: 100 }, { numerator: 7, denominator: 100 }), 'The parts match. Add the hundredths and keep 100 on the bottom.', '40 + 7 = 47, so 40/100 + 7/100 = 47/100.', bars({ numerator: 40, denominator: 100 }, { numerator: 7, denominator: 100 }), { authoredChoices: true }),
      practice('What is 20/100 + 35/100?', ['55/100', '55/200', '35/100', '700/100'], 0, bars({ numerator: 20, denominator: 100 }, { numerator: 35, denominator: 100 }), 'The parts match. Add the hundredths and keep 100 on the bottom.', '20 + 35 = 55, so 20/100 + 35/100 = 55/100.', bars({ numerator: 20, denominator: 100 }, { numerator: 35, denominator: 100 }), { authoredChoices: true }),
      practice('What is 60/100 + 12/100?', ['72/100', '72/200', '48/100', '100/72'], 0, bars({ numerator: 60, denominator: 100 }, { numerator: 12, denominator: 100 }), 'The parts match. Add the hundredths and keep 100 on the bottom.', '60 + 12 = 72, so 60/100 + 12/100 = 72/100.', bars({ numerator: 60, denominator: 100 }, { numerator: 12, denominator: 100 }), { authoredChoices: true }),
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
  /** Questions written for one idea of the lesson (lesson-ideas.ts lists each idea's three practices). */
  ideaQuestions?: PracticeSeed[];
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
  { id: 'unit-fraction-multiples', title: 'Make groups of a unit fraction', shortTitle: 'Unit fraction copies', description: 'Build several copies of one unit fraction.', skill: 'A multiple is several equal copies added together. Count how many unit-fraction parts you have.', mode: 'unit-multiples', n: 5, d: 4, context: 'paper strips', gradeBand: 4, standards: ['4.NF.4a'],
    ideaQuestions: [
      // Idea 1: × counts copies of one part.
      practice('This bar shows copies of 1/8. How do you write it with ×?', ['5 × 1/8', '8 × 1/5', '3 × 1/8', '5 × 1/5'], 0,
        { kind: 'bars', bars: [{ numerator: 5, denominator: 8 }], hideLabels: true }, 'Count the shaded parts. Each one is a copy of 1/8.',
        '5 shaded parts, each 1/8: 5 × 1/8.', { kind: 'bars', bars: [{ numerator: 5, denominator: 8 }] }, { authoredChoices: true }),
      practice('Which means 1/6 + 1/6 + 1/6 + 1/6?', ['4 × 1/6', '6 × 1/4', '4 × 1/24', '4 × 6'], 0,
        { kind: 'bars', bars: [{ numerator: 4, denominator: 6 }], hideLabels: true }, 'Count the copies of 1/6.',
        '4 copies of 1/6: 4 × 1/6.', { kind: 'bars', bars: [{ numerator: 4, denominator: 6 }] }, { authoredChoices: true }),
      practice('Mo takes 3 pieces. Each is 1/4 of a cake. Which shows this?', ['3 × 1/4', '4 × 1/3', '3 × 4', '1/4 + 3'], 0,
        { kind: 'area', cut: 'fourths-squares', shaded: [0, 1, 2] }, 'Each piece is a copy of 1/4. How many copies?',
        '3 copies of 1/4: 3 × 1/4.', { kind: 'area', cut: 'fourths-squares', shaded: [0, 1, 2] }, { authoredChoices: true }),
      // Idea 2: the count goes on top; the denominator stays.
      practice('Write 2 × 1/8 as one fraction.', ['2/8', '2/16', '3/8', '1/16'], 0,
        { kind: 'bars', bars: [{ numerator: 0, denominator: 8 }], hideLabels: true }, 'Count 2 copies of 1/8. The denominator stays 8.',
        '2 copies of 1/8 is 2/8: 2 on top, 8 stays on the bottom.', { kind: 'bars', bars: [{ numerator: 0, denominator: 8 }] }, { authoredChoices: true }),
      // Idea 3: copies can go past one whole.
      practice('Write 3 × 1/2 as one fraction.', ['3/2', '3/6', '4/2', '1/6'], 0,
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }, { numerator: 0, denominator: 2 }], hideLabels: true }, 'Count 3 copies of 1/2. Two halves fill one whole.',
        '3 copies of 1/2 is 3/2. That is past one whole: 1 whole and 1/2 more.', { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }, { numerator: 0, denominator: 2 }] }, { authoredChoices: true }),
    ] },
  { id: 'multiply-whole-by-fraction', title: 'Groups of a fraction', shortTitle: 'Whole × fraction', description: '3 groups of 1/2.', skill: 'To find several groups of a fraction, count that fraction once for each group. The part size stays the same.', mode: 'multiply-whole', n: 2, d: 3, context: 'juice bottles',
    ideaQuestions: [
      // Idea 1: count the parts in every group (no rule yet).
      practice('What is 3 groups of 2/3?', ['6/3', '6/9', '5/3', '2/9'], 0,
        bars(...Array.from({ length: 3 }, () => ({ numerator: 2, denominator: 3 }))), 'Count the thirds in all 3 groups. They stay thirds.',
        '2 + 2 + 2 = 6 thirds: 6/3.', bars(...Array.from({ length: 3 }, () => ({ numerator: 2, denominator: 3 }))), { authoredChoices: true }),
      practice('What is 2 groups of 3/8?', ['6/8', '6/16', '5/8', '3/16'], 0,
        bars(...Array.from({ length: 2 }, () => ({ numerator: 3, denominator: 8 }))), 'Count the eighths in both groups. They stay eighths.',
        '3 + 3 = 6 eighths: 6/8.', bars(...Array.from({ length: 2 }, () => ({ numerator: 3, denominator: 8 }))), { authoredChoices: true }),
      practice('What is 4 groups of 2/5?', ['8/5', '8/20', '6/5', '2/20'], 0,
        bars(...Array.from({ length: 4 }, () => ({ numerator: 2, denominator: 5 }))), 'Count the fifths in all 4 groups. They stay fifths.',
        '2 + 2 + 2 + 2 = 8 fifths: 8/5.', bars(...Array.from({ length: 4 }, () => ({ numerator: 2, denominator: 5 }))), { authoredChoices: true }),
      // Idea 3: the same as copies of the unit fraction, or jumps on a line.
      practice('Which is the same as 3 × 2/5?', ['6 × 1/5', '5 × 1/6', '3 × 1/5', '6 × 1/12'], 0,
        bars(...Array.from({ length: 3 }, () => ({ numerator: 2, denominator: 5 }))), '3 groups of 2 fifths is how many fifths?',
        '3 × 2/5 = 6/5, and 6/5 = 6 × 1/5: six fifths.', bars(...Array.from({ length: 3 }, () => ({ numerator: 2, denominator: 5 }))), { authoredChoices: true }),
      practice('A frog jumps 3/8 each time. Where is it after 2 jumps?', ['6/8', '6/16', '5/8', '3/16'], 0,
        { kind: 'line', numerator: 0, denominator: 8, wholes: 1 }, 'Each jump is 3 eighths. Count the eighths for 2 jumps.',
        '2 jumps of 3/8 land on 6/8: 2 × 3/8 = 6/8.', { kind: 'line', numerator: 3, denominator: 8, wholes: 1 }, { authoredChoices: true }),
    ] },
  { id: 'simplify-fractions', title: 'Simplest form', shortTitle: 'Simplest form', description: 'Use bigger parts. Same amount.', skill: 'Divide the numerator and denominator by the same factor. The parts get bigger, but the total amount stays the same.', mode: 'simplify', n: 3, d: 4, context: 'paper strip',
    ideaQuestions: [
      // Idea 1: find a number that divides both (count by it and land on both numbers).
      practice('Which number divides both 6 and 9?', ['3', '2', '6', '9'], 0, bars({ numerator: 6, denominator: 9 }),
        'Count by each number. Which count lands on 6 and on 9?', 'Count by 3s: 3, 6, 9. You land on 6 and on 9, so 3 divides both.', bars({ numerator: 6, denominator: 9 }), { authoredChoices: true }),
      practice('Which number divides both 4 and 10?', ['2', '4', '5', '10'], 0, bars({ numerator: 4, denominator: 10 }),
        'Count by each number. Which count lands on 4 and on 10?', 'Count by 2s: 2, 4, 6, 8, 10. You land on 4 and on 10, so 2 divides both.', bars({ numerator: 4, denominator: 10 }), { authoredChoices: true }),
      practice('Does 2 divide both 3 and 8?', ['No, 2 does not divide 3', 'No, 2 does not divide 8', 'Yes, 2 divides both', 'Yes, 2 divides 8'], 0, bars({ numerator: 3, denominator: 8 }),
        'Count by 2s: 2, 4, 6, 8. Do you land on 3? Do you land on 8?', 'Counting by 2s lands on 8 but skips 3. So 2 does not divide both.', bars({ numerator: 3, denominator: 8 }), { authoredChoices: true }),
      // Idea 2: divide both by it: fewer, bigger parts, the same amount.
      practice('Divide the numerator and denominator of 4/10 by 2. What do you get?', ['2/5', '2/10', '4/5', '2/8'], 0, bars({ numerator: 4, denominator: 10 }),
        'Divide the top by 2. Divide the bottom by 2.', '4 ÷ 2 = 2 and 10 ÷ 2 = 5: 4/10 = 2/5.', bars({ numerator: 4, denominator: 10 }), { authoredChoices: true }),
      practice('Divide the numerator and denominator of 9/12 by 3. What do you get?', ['3/4', '3/12', '9/4', '6/9'], 0, bars({ numerator: 9, denominator: 12 }),
        'Divide the top by 3. Divide the bottom by 3.', '9 ÷ 3 = 3 and 12 ÷ 3 = 4: 9/12 = 3/4.', bars({ numerator: 9, denominator: 12 }), { authoredChoices: true }),
      practice('Divide the numerator and denominator of 10/12 by 2. What do you get?', ['5/6', '5/12', '10/6', '8/10'], 0, bars({ numerator: 10, denominator: 12 }),
        'Divide the top by 2. Divide the bottom by 2.', '10 ÷ 2 = 5 and 12 ÷ 2 = 6: 10/12 = 5/6.', bars({ numerator: 10, denominator: 12 }), { authoredChoices: true }),
    ] },
  { id: 'equivalent-missing-both', title: 'Rename with a new denominator', shortTitle: 'Equivalent fractions', description: 'Fill a blank in the numerator or denominator.', skill: 'Equivalent fractions name the same amount. Multiply or divide the numerator and denominator by the same factor.', mode: 'equivalent', n: 2, d: 5, context: 'recipe card',
    ideaQuestions: [
      // Idea 1: find what the denominator was multiplied by.
      practice('3/4 = ?/12. What was 4 multiplied by to make 12?', ['3', '8', '4', '12'], 0, bars({ numerator: 3, denominator: 4 }),
        'Count by 4s up to 12. How many 4s?', '4, 8, 12: three 4s. 4 × 3 = 12, so 4 was multiplied by 3.', bars({ numerator: 3, denominator: 4 }), { authoredChoices: true }),
      practice('1/3 = ?/6. What was 3 multiplied by to make 6?', ['2', '4', '6', '1'], 0, bars({ numerator: 1, denominator: 3 }),
        'Count by 3s up to 6. How many 3s?', '3, 6: two 3s. 3 × 2 = 6, so 3 was multiplied by 2.', bars({ numerator: 1, denominator: 3 }), { authoredChoices: true }),
      practice('5/6 = ?/12. What was 6 multiplied by to make 12?', ['2', '6', '12', '72'], 0, bars({ numerator: 5, denominator: 6 }),
        'Count by 6s up to 12. How many 6s?', '6, 12: two 6s. 6 × 2 = 12, so 6 was multiplied by 2.', bars({ numerator: 5, denominator: 6 }), { authoredChoices: true }),
      // Idea 3: dividing works the same way.
      practice('Fill the missing numerator: 6/10 = ?/5.', ['3', '6', '1', '5'], 0, bars({ numerator: 6, denominator: 10 }),
        'What was 10 divided by to make 5? Divide the numerator by the same number.', '10 ÷ 2 = 5 and 6 ÷ 2 = 3: 6/10 = 3/5.', bars({ numerator: 6, denominator: 10 }), { authoredChoices: true }),
      practice('Fill the missing numerator: 9/12 = ?/4.', ['3', '9', '1', '4'], 0, bars({ numerator: 9, denominator: 12 }),
        'What was 12 divided by to make 4? Divide the numerator by the same number.', '12 ÷ 3 = 4 and 9 ÷ 3 = 3: 9/12 = 3/4.', bars({ numerator: 9, denominator: 12 }), { authoredChoices: true }),
      practice('Write 8/12 with a denominator of 3.', ['2/3', '8/3', '2/12', '3/2'], 0, bars({ numerator: 8, denominator: 12 }),
        'What was 12 divided by to make 3? Divide the numerator by the same number.', '12 ÷ 4 = 3 and 8 ÷ 4 = 2: 8/12 = 2/3.', bars({ numerator: 8, denominator: 12 }), { authoredChoices: true }),
    ] },
  { id: 'whole-numbers-as-fractions', title: 'Wholes as fractions', shortTitle: 'Whole numbers as fractions', description: 'Build one or more wholes from unit fractions.', skill: 'The denominator tells how many parts fill one whole. Count that many parts for each whole.', mode: 'whole-fraction', n: 6, d: 3, context: 'fraction bars', gradeBand: 3, standards: ['3.NF.3c'],
    ideaQuestions: [
      practice('How many sixths make one whole?', ['6', '1', '12', '5'], 0, emptyWholes(1, 6), 'Count the equal parts in one whole bar.', '6 sixths fill one whole: 6/6 = 1.', bars({ numerator: 6, denominator: 6 }), { authoredChoices: true }),
      practice('8/8 of a bar is shaded. How much of the bar is that?', ['The whole bar', 'Half of the bar', '1/8 of the bar', '8 bars'], 0, bars({ numerator: 8, denominator: 8 }), '8/8 means 8 of 8 equal parts.', 'All 8 of the 8 parts are shaded, so 8/8 is the whole bar.', bars({ numerator: 8, denominator: 8 }), { authoredChoices: true }),
      practice('Which fraction is one whole?', ['3/3', '1/3', '2/3', '3/6'], 0, emptyWholes(1, 3), 'One whole is all of its equal parts.', 'All 3 thirds fill the whole: 3/3 = 1.', bars({ numerator: 3, denominator: 3 }), { authoredChoices: true }),
      practice('Write 3 whole bars as a fraction with a denominator of 1.', ['3/1', '1/3', '3/3', '1/1'], 0, emptyWholes(3), 'Each uncut bar is 1/1. Count the bars for the top number.', '3 whole bars, each 1 part: 3/1.', bars({ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }), { authoredChoices: true }),
      practice('Which fraction equals the whole number 5?', ['5/1', '1/5', '5/5', '4/1'], 0, emptyWholes(5), 'Each uncut bar is 1/1. How many bars make 5?', '5 whole bars, each 1 part: 5/1 = 5.', bars({ numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }, { numerator: 1, denominator: 1 }), { authoredChoices: true }),
      practice('Write 6/6 as a whole number.', ['1', '6', '12', '0'], 0, bars({ numerator: 6, denominator: 6 }), '6/6 is all 6 parts of one whole.', '6 sixths fill one whole, so 6/6 = 1.', bars({ numerator: 6, denominator: 6 }), { authoredChoices: true }),
    ] },
  { id: 'compare-unlike-fractions', title: 'Compare different parts', shortTitle: 'Compare unlike parts', description: 'Which is bigger when the denominators differ?', skill: 'Make the parts the same size by using a common denominator. Then compare how many parts each fraction has.', mode: 'compare', n: 2, d: 3, context: 'race track',
    example: { prompt: 'Which is bigger, 3/4 or 5/6?', answer: '5/6', explanation: 'Use twelfths for both: 3/4 = 9/12 and 5/6 = 10/12. 10 twelfths are more than 9 twelfths, so 5/6 is bigger.', model: bars({ numerator: 3, denominator: 4, named: true }, { numerator: 5, denominator: 6, named: true }) },
    // Idea questions (ideas/lessons-41-50.ts): rename one fraction (p1–p2), a common denominator (p3–p5), same numerators (p6).
    ideaQuestions: [
      practice('Pick the sign: 2/3 __ 5/6.', ['<', '=', '>'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 5, denominator: 6 }),
        'Thirds fit into sixths. Rename 2/3 as sixths, then compare the numerators.', '2/3 = 4/6, and 4 sixths are less than 5 sixths. So 2/3 < 5/6.',
        bars({ numerator: 4, denominator: 6 }, { numerator: 5, denominator: 6 })),
      practice('Pick the sign: 7/10 __ 3/5.', ['>', '=', '<'], 0, bars({ numerator: 7, denominator: 10 }, { numerator: 3, denominator: 5 }),
        'Fifths fit into tenths. Rename 3/5 as tenths, then compare the numerators.', '3/5 = 6/10, and 7 tenths are more than 6 tenths. So 7/10 > 3/5.',
        bars({ numerator: 7, denominator: 10 }, { numerator: 6, denominator: 10 })),
      practice('Pick the sign: 2/3 __ 1/2.', ['>', '=', '<'], 0, bars({ numerator: 2, denominator: 3 }, { numerator: 1, denominator: 2 }),
        'Neither denominator fits into the other. Find a common denominator: 3 × 2 = 6. Rename both as sixths.', '2/3 = 4/6 and 1/2 = 3/6. 4 > 3, so 2/3 > 1/2.',
        bars({ numerator: 4, denominator: 6 }, { numerator: 3, denominator: 6 })),
      practice('Pick the sign: 2/5 __ 1/2.', ['<', '=', '>'], 0, bars({ numerator: 2, denominator: 5 }, { numerator: 1, denominator: 2 }),
        'Find a common denominator: 5 × 2 = 10. Rename both as tenths.', '2/5 = 4/10 and 1/2 = 5/10. 4 < 5, so 2/5 < 1/2.',
        bars({ numerator: 4, denominator: 10 }, { numerator: 5, denominator: 10 })),
      practice('Pick the sign: 1/3 __ 3/4.', ['<', '=', '>'], 0, bars({ numerator: 1, denominator: 3 }, { numerator: 3, denominator: 4 }),
        'Find a common denominator: 3 × 4 = 12. Rename both as twelfths.', '1/3 = 4/12 and 3/4 = 9/12. 4 < 9, so 1/3 < 3/4.',
        bars({ numerator: 4, denominator: 12 }, { numerator: 9, denominator: 12 })),
      practice('Pick the sign: 5/8 __ 5/6.', ['<', '=', '>'], 0, bars({ numerator: 5, denominator: 8 }, { numerator: 5, denominator: 6 }),
        'Same numerators: both count 5 parts. Which parts are bigger, eighths or sixths?', 'Eighths are smaller than sixths. 5 smaller parts make less, so 5/8 < 5/6.',
        bars({ numerator: 5, denominator: 8 }, { numerator: 5, denominator: 6 })),
    ],
  },
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
    mode: 'order', n: 1, d: 5, context: 'hiking trail',
    // Idea questions (ideas/lessons-41-50.ts): same denominators (p1–p2), 1/2 as a benchmark (p3–p4), rename (p5).
    ideaQuestions: [
      practice('Put 3/5, 1/5, 4/5 in order, smallest first.', ['1/5, 3/5, 4/5', '4/5, 3/5, 1/5', '3/5, 1/5, 4/5', '1/5, 4/5, 3/5'], 0,
        bars({ numerator: 3, denominator: 5 }, { numerator: 1, denominator: 5 }, { numerator: 4, denominator: 5 }),
        'All fifths: the parts are the same size. Fewer fifths is smaller.', '1 fifth, 3 fifths, 4 fifths: 1/5 < 3/5 < 4/5.',
        bars({ numerator: 1, denominator: 5 }, { numerator: 3, denominator: 5 }, { numerator: 4, denominator: 5 }), { authoredChoices: true }),
      practice('Put 2/6, 5/6, 3/6 in order, biggest first.', ['5/6, 3/6, 2/6', '2/6, 3/6, 5/6', '3/6, 5/6, 2/6', '5/6, 2/6, 3/6'], 0,
        bars({ numerator: 2, denominator: 6 }, { numerator: 5, denominator: 6 }, { numerator: 3, denominator: 6 }),
        'All sixths: the parts are the same size. More sixths is bigger.', '5 sixths, 3 sixths, 2 sixths: 5/6 > 3/6 > 2/6.',
        bars({ numerator: 5, denominator: 6 }, { numerator: 3, denominator: 6 }, { numerator: 2, denominator: 6 }), { authoredChoices: true }),
      practice('Put 4/5, 1/2, 1/3 in order, smallest first.', ['1/3, 1/2, 4/5', '4/5, 1/2, 1/3', '1/2, 1/3, 4/5', '1/3, 4/5, 1/2'], 0,
        bars({ numerator: 4, denominator: 5 }, { numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 }),
        'Compare each one to 1/2. Which is less than half? Which is more than half?', '1/3 is less than half and 4/5 is more than half: 1/3 < 1/2 < 4/5.',
        bars({ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 2 }, { numerator: 4, denominator: 5 }), { authoredChoices: true }),
      practice('Put 1/4, 7/8, 1/2 in order, biggest first.', ['7/8, 1/2, 1/4', '1/4, 1/2, 7/8', '1/2, 7/8, 1/4', '7/8, 1/4, 1/2'], 0,
        bars({ numerator: 1, denominator: 4 }, { numerator: 7, denominator: 8 }, { numerator: 1, denominator: 2 }),
        'Compare each one to 1/2. Which is more than half? Which is less than half?', '7/8 is more than half and 1/4 is less than half: 7/8 > 1/2 > 1/4.',
        bars({ numerator: 7, denominator: 8 }, { numerator: 1, denominator: 2 }, { numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('Put 2/3, 5/6, 1/4 in order, biggest first.', ['5/6, 2/3, 1/4', '2/3, 5/6, 1/4', '1/4, 2/3, 5/6', '5/6, 1/4, 2/3'], 0,
        bars({ numerator: 2, denominator: 3 }, { numerator: 5, denominator: 6 }, { numerator: 1, denominator: 4 }),
        '2/3 and 5/6 are both more than half. Rename 2/3 as sixths to compare them.', '2/3 = 4/6, and 4/6 < 5/6. 1/4 is less than half: 5/6 > 2/3 > 1/4.',
        bars({ numerator: 4, denominator: 6 }, { numerator: 5, denominator: 6 }, { numerator: 1, denominator: 4 }), { authoredChoices: true }),
    ],
  },
  { id: 'subtract-unlike-fractions', title: 'Take away different parts', shortTitle: 'Subtract unlike parts', description: 'Rename, then take away.', skill: 'First rename both fractions with the same denominator so the parts match. Then subtract the number of parts.', mode: 'subtract-unlike', n: 3, d: 4, context: 'water bottle',
    // Idea questions (ideas/lessons-41-50.ts): make the parts match before taking away (the numerators come in idea 2).
    ideaQuestions: [
      practice('To take 1/2 away from 7/8, the parts must match. What is 1/2 in eighths?', ['4/8', '1/8', '7/8', '2/8'], 0,
        bars({ numerator: 7, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Cut each half into 4 equal parts. Those parts are eighths.', 'Each half is 4 eighths, so 1/2 = 4/8. Now both are eighths.',
        bars({ numerator: 7, denominator: 8 }, { numerator: 4, denominator: 8 }), { authoredChoices: true }),
      practice('For 5/6 − 1/3, which fraction do you rename?', ['1/3, as sixths', '5/6, as thirds', 'Both, as twelfths', 'Neither one'], 0,
        bars({ numerator: 5, denominator: 6 }, { numerator: 1, denominator: 3 }), 'Rename the fraction with the bigger parts. Thirds are bigger than sixths.', 'Cut each third in two: 1/3 = 2/6. 5/6 stays as it is.',
        bars({ numerator: 5, denominator: 6 }, { numerator: 2, denominator: 6 }), { authoredChoices: true }),
      practice('To find 3/4 − 3/8, the parts must match. What is 3/4 in eighths?', ['6/8', '3/8', '7/8', '4/8'], 0,
        bars({ numerator: 3, denominator: 4 }, { numerator: 3, denominator: 8 }), 'Cut each fourth into 2 equal parts. Those parts are eighths.', 'Each fourth is 2 eighths, so 3/4 = 6/8. Now both are eighths.',
        bars({ numerator: 6, denominator: 8 }, { numerator: 3, denominator: 8 }), { authoredChoices: true }),
    ],
  },
  { id: 'add-unlike-fractions', title: 'Add unlike fractions', shortTitle: 'Add unlike parts', description: 'Make different-sized parts the same size before adding.', skill: 'Rename both fractions with the same denominator so the parts match. Then add the number of parts.', mode: 'add-unlike', n: 7, d: 12, context: 'ribbons', gradeBand: 5, standards: ['5.NF.1'],
    // Idea questions (ideas/lessons-41-50.ts). Idea 1: the child renames (p1, p3), then adds once told the parts to use (p4);
    // nothing hands the renamed fractions over. Idea 2: find the common denominator (p2).
    ideaQuestions: [
      practice('To add 1/2 + 1/3, the parts must match. What is 1/2 in sixths?', ['3/6', '1/6', '2/6', '5/6'], 0,
        bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 }), 'Cut each half into 3 equal parts. Those parts are sixths.', 'Each half is 3 sixths, so 1/2 = 3/6. The amount stays the same.',
        bars({ numerator: 1, denominator: 2 }, { numerator: 3, denominator: 6 }), { authoredChoices: true }),
      practice('3/4 + 1/6 = ?', ['11/12', '4/10', '4/6', '10/12'], 0,
        bars({ numerator: 3, denominator: 4 }, { numerator: 1, denominator: 6 }), 'List multiples of 6: 6, 12. 4 fits into 12 too. Rename both as twelfths, then add.',
        '3/4 = 9/12 and 1/6 = 2/12. 9/12 + 2/12 = 11/12.', bars({ numerator: 9, denominator: 12 }, { numerator: 2, denominator: 12 }), { authoredChoices: true }),
      practice('To add 1/6 + 1/4, rename both as twelfths. What is 1/4 in twelfths?', ['3/12', '1/12', '2/12', '5/12'], 0,
        bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 4 }), 'Cut each fourth into 3 equal parts. Those parts are twelfths.', 'Each fourth is 3 twelfths, so 1/4 = 3/12. The amount stays the same.',
        bars({ numerator: 1, denominator: 4 }, { numerator: 3, denominator: 12 }), { authoredChoices: true }),
      practice('Make both fractions tenths. Then 1/2 + 1/5 = ?', ['7/10', '2/7', '2/10', '6/10'], 0,
        bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 5 }), 'How many tenths make 1/2? How many make 1/5? Then add the numerators.', '1/2 = 5/10 and 1/5 = 2/10. 5/10 + 2/10 = 7/10.',
        bars({ numerator: 5, denominator: 10 }, { numerator: 2, denominator: 10 }), { authoredChoices: true }),
    ],
  },
  { id: 'add-mixed-numbers', title: 'Add mixed numbers', shortTitle: 'Add mixed numbers', description: 'Add wholes and parts.', skill: 'Add the whole numbers and the fraction parts. If the parts fill a whole, regroup them as one more whole.', mode: 'mixed-add', n: 1, d: 4, context: 'walking route',
    ideaQuestions: [
      practice('2 1/4 + 1 2/4. Add the wholes. How many wholes is that?', ['3', '2', '1', '6'], 0, bars({ numerator: 9, denominator: 4 }, { numerator: 6, denominator: 4 }), 'Add the whole numbers: 2 and 1.', '2 + 1 = 3 wholes.', bars({ numerator: 9, denominator: 4 }, { numerator: 6, denominator: 4 }), { authoredChoices: true }),
      practice('1 1/6 + 2 4/6. Add the wholes. How many wholes is that?', ['3', '1', '2', '8'], 0, bars({ numerator: 7, denominator: 6 }, { numerator: 16, denominator: 6 }), 'Add the whole numbers: 1 and 2.', '1 + 2 = 3 wholes.', bars({ numerator: 7, denominator: 6 }, { numerator: 16, denominator: 6 }), { authoredChoices: true }),
      practice('3 1/5 + 1 1/5. Add the wholes. How many wholes is that?', ['4', '3', '1', '6'], 0, bars({ numerator: 16, denominator: 5 }, { numerator: 6, denominator: 5 }), 'Add the whole numbers: 3 and 1.', '3 + 1 = 4 wholes.', bars({ numerator: 16, denominator: 5 }, { numerator: 6, denominator: 5 }), { authoredChoices: true }),
      practice('1 1/8 + 1 3/8 = ?', ['2 4/8', '2 4/16', '1 4/8', '2 3/8'], 0, bars({ numerator: 9, denominator: 8 }, { numerator: 11, denominator: 8 }), 'Add the wholes: 1 + 1. Then add the fraction parts: 1/8 + 3/8.', '1 + 1 = 2, and 1/8 + 3/8 = 4/8. So 2 4/8.', bars({ numerator: 9, denominator: 8 }, { numerator: 11, denominator: 8 }), { authoredChoices: true }),
      practice('2 1/5 + 1 2/5 = ?', ['3 3/5', '3 3/10', '2 3/5', '3 1/5'], 0, bars({ numerator: 11, denominator: 5 }, { numerator: 7, denominator: 5 }), 'Add the wholes: 2 + 1. Then add the fraction parts: 1/5 + 2/5.', '2 + 1 = 3, and 1/5 + 2/5 = 3/5. So 3 3/5.', bars({ numerator: 11, denominator: 5 }, { numerator: 7, denominator: 5 }), { authoredChoices: true }),
      practice('1 1/4 + 2/4 = ?', ['1 3/4', '1 3/8', '3/4', '1 1/4'], 0, bars({ numerator: 5, denominator: 4 }, { numerator: 2, denominator: 4 }), 'There is 1 whole. Add the fraction parts: 1/4 + 2/4.', '1/4 + 2/4 = 3/4, and the whole stays 1. So 1 3/4.', bars({ numerator: 5, denominator: 4 }, { numerator: 2, denominator: 4 }), { authoredChoices: true }),
      practice('1 3/4 + 2/4 = ?', ['2 1/4', '1 5/8', '1 1/4', '1 3/4'], 0, bars({ numerator: 7, denominator: 4 }, { numerator: 2, denominator: 4 }), 'Add the parts: 3/4 + 2/4 = 5/4. Do the parts make a new whole?', '5/4 is 4/4 and 1/4. 4/4 makes 1 more whole: 1 + 1 = 2, so 2 1/4.', bars({ numerator: 7, denominator: 4 }, { numerator: 2, denominator: 4 }), { authoredChoices: true }),
    ] },
  { id: 'subtract-mixed-numbers', title: 'Subtract mixed numbers', shortTitle: 'Subtract mixed numbers', description: 'Trade a whole when you need more parts.', skill: 'If there are not enough fraction parts to subtract, trade one whole for equal-size parts.', mode: 'mixed-subtract', n: 1, d: 3, context: 'fabric roll',
    ideaQuestions: [
      practice('2 3/4 − 1 1/4 = ?', ['1 2/4', '4', '2/4', '1 3/4'], 0, bars({ numerator: 11, denominator: 4 }, { numerator: 5, denominator: 4 }), 'Take away the parts: 3/4 − 1/4. Then the wholes: 2 − 1.', '3/4 − 1/4 = 2/4, and 2 − 1 = 1. So 1 2/4.', bars({ numerator: 11, denominator: 4 }, { numerator: 5, denominator: 4 }), { authoredChoices: true }),
      practice('3 5/6 − 1 2/6 = ?', ['2 3/6', '5 1/6', '3/6', '2 5/6'], 0, bars({ numerator: 23, denominator: 6 }, { numerator: 8, denominator: 6 }), 'Take away the parts: 5/6 − 2/6. Then the wholes: 3 − 1.', '5/6 − 2/6 = 3/6, and 3 − 1 = 2. So 2 3/6.', bars({ numerator: 23, denominator: 6 }, { numerator: 8, denominator: 6 }), { authoredChoices: true }),
      practice('2 7/8 − 2/8 = ?', ['2 5/8', '3 1/8', '2 7/8', '3/8'], 0, bars({ numerator: 23, denominator: 8 }, { numerator: 2, denominator: 8 }), 'Take away the parts: 7/8 − 2/8. No wholes are taken away.', '7/8 − 2/8 = 5/8, and the 2 wholes stay. So 2 5/8.', bars({ numerator: 23, denominator: 8 }, { numerator: 2, denominator: 8 }), { authoredChoices: true }),
      practice('2 1/6 − 1 4/6. Are there enough sixths to take away 4/6?', ['No, there is only 1 sixth', 'No, you can never take away sixths', 'Yes, there are 2 wholes', 'Yes, 1/6 is more than 4/6'], 0, bars({ numerator: 13, denominator: 6 }, { numerator: 10, denominator: 6 }), 'Compare the parts: 1/6 and 4/6.', 'There is only 1/6, and 4/6 is more than that. There are not enough sixths.', bars({ numerator: 13, denominator: 6 }, { numerator: 10, denominator: 6 }), { authoredChoices: true }),
      practice('3 5/8 − 1 2/8. Are there enough eighths to take away 2/8?', ['No, 2/8 is more than 5/8', 'No, there are only 3 wholes', 'Yes, 5 eighths are more than 2 eighths', 'Yes, 3 wholes is more than 1 whole'], 2, bars({ numerator: 29, denominator: 8 }, { numerator: 10, denominator: 8 }), 'Compare the parts: 5/8 and 2/8.', '5/8 is more than 2/8, so there are enough eighths to take away.', bars({ numerator: 29, denominator: 8 }, { numerator: 10, denominator: 8 }), { authoredChoices: true }),
      practice('3 2/3 − 1 1/3. Are there enough thirds to take away 1/3?', ['No, 1/3 is more than 2/3', 'No, there are 3 wholes', 'Yes, 2 thirds are more than 1 third', 'Yes, 3 wholes is more than 1 whole'], 2, bars({ numerator: 11, denominator: 3 }, { numerator: 4, denominator: 3 }), 'Compare the parts: 2/3 and 1/3.', '2/3 is more than 1/3, so there are enough thirds to take away.', bars({ numerator: 11, denominator: 3 }, { numerator: 4, denominator: 3 }), { authoredChoices: true }),
    ] },
  { id: 'fraction-of-quantity', title: 'A fraction of a number', shortTitle: 'Fractions of amounts', description: 'Find 3/5 of 20.', skill: 'Split the amount into equal groups using the denominator. Count the number of groups shown by the numerator.', mode: 'quantity', n: 3, d: 5, context: 'classroom supplies',
    ideaQuestions: [
      practice('What is 1/4 of 12?', ['3', '4', '8', '48'], 0, emptyWholes(1, 4), 'Split 12 into 4 equal parts. One part is 12 ÷ 4.', '12 ÷ 4 = 3, so 1/4 of 12 is 3.', bars({ numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('What is 1/6 of 30?', ['5', '6', '24', '180'], 0, emptyWholes(1, 6), 'Split 30 into 6 equal parts. One part is 30 ÷ 6.', '30 ÷ 6 = 5, so 1/6 of 30 is 5.', bars({ numerator: 1, denominator: 6 }), { authoredChoices: true }),
      practice('What is 1/8 of 16?', ['2', '8', '24', '128'], 0, emptyWholes(1, 8), 'Split 16 into 8 equal parts. One part is 16 ÷ 8.', '16 ÷ 8 = 2, so 1/8 of 16 is 2.', bars({ numerator: 1, denominator: 8 }), { authoredChoices: true }),
      practice('What is 2/5 of 15?', ['6', '3', '15', '30'], 0, emptyWholes(1, 5), 'One part is 15 ÷ 5. Then take 2 parts.', '15 ÷ 5 = 3 in one part, and 2 × 3 = 6. So 2/5 of 15 is 6.', bars({ numerator: 2, denominator: 5 }), { authoredChoices: true }),
      practice('3/4 × 16 = ?', ['12', '4', '48', '16'], 0, emptyWholes(1, 4), '3/4 × 16 means 3/4 of 16. One part is 16 ÷ 4. Then take 3 parts.', '16 ÷ 4 = 4 in one part, and 3 × 4 = 12. So 3/4 × 16 = 12.', bars({ numerator: 3, denominator: 4 }), { authoredChoices: true }),
    ] },
  { id: 'mixed-unlike-operations', title: 'Mixed numbers with unlike parts', shortTitle: 'Mixed number operations', description: 'Add or subtract mixed numbers with different denominators.', skill: 'Rename the fraction parts so they are the same size. Then add or subtract, regrouping a whole if needed.', mode: 'mixed-unlike', n: 25, d: 12, context: 'walking route', gradeBand: 5, standards: ['5.NF.1'],
    ideaQuestions: [
      practice('Use fourths. Which mixed number is the same as 2 1/2?', ['2 2/4', '2 1/4', '4 2/4', '2 4/4'], 0, bars({ numerator: 5, denominator: 2 }), 'Rename only the fraction part. How many fourths make 1/2?', '1/2 = 2/4, and the 2 wholes stay the same. So 2 1/2 = 2 2/4.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Use sixths. Which mixed number is the same as 1 2/3?', ['1 4/6', '1 2/6', '2 4/6', '1 3/6'], 0, bars({ numerator: 5, denominator: 3 }), 'Rename only the fraction part. How many sixths make 2/3?', '2/3 = 4/6, and the 1 whole stays the same. So 1 2/3 = 1 4/6.', bars({ numerator: 2, denominator: 3 }), { authoredChoices: true }),
      practice('Use twelfths. Which mixed number is the same as 3 3/4?', ['3 9/12', '3 3/12', '9 9/12', '3 6/12'], 0, bars({ numerator: 15, denominator: 4 }), 'Rename only the fraction part. How many twelfths make 3/4?', '3/4 = 9/12, and the 3 wholes stay the same. So 3 3/4 = 3 9/12.', bars({ numerator: 3, denominator: 4 }), { authoredChoices: true }),
      practice('Rename: 1/2 = 2/4. Then 1 3/4 + 1 1/2 = ?', ['3 1/4', '2 1/4', '2 1/2', '2 4/6'], 0, bars({ numerator: 7, denominator: 4 }, { numerator: 3, denominator: 2 }), 'Add the parts first: 3/4 + 2/4 = 5/4. That is 1 whole and 1/4. Then add the wholes.', '3/4 + 2/4 = 5/4, which is 1 whole and 1/4. Then 1 + 1 + 1 = 3 wholes. So 1 3/4 + 1 1/2 = 3 1/4.', bars({ numerator: 7, denominator: 4 }, { numerator: 3, denominator: 2 }), { authoredChoices: true }),
      practice('Rename: 1/3 = 2/6. Then 3 1/6 − 1 1/3 = ?', ['1 5/6', '2 1/6', '2 5/6', '2 1/3'], 0, bars({ numerator: 19, denominator: 6 }, { numerator: 4, denominator: 3 }), '1/6 is too few to take 2/6 away. Trade 1 whole for 6/6 first.', 'Trade 1 whole: 3 1/6 = 2 7/6. Then 7/6 − 2/6 = 5/6, and 2 − 1 = 1. So 3 1/6 − 1 1/3 = 1 5/6.', bars({ numerator: 19, denominator: 6 }, { numerator: 4, denominator: 3 }), { authoredChoices: true }),
    ] },
  { id: 'estimate-fraction-operations', title: 'Estimate to check', shortTitle: 'Estimate fraction sums', description: 'Use 0, 1/2 and 1 to check whether an answer makes sense.', skill: 'Compare each fraction with 0, 1/2, or 1. Use those benchmarks to check whether the answer is a sensible size.', example: { prompt: 'Is 2/5 + 1/2 more or less than 1?', answer: 'Less than 1', explanation: '2/5 is a little less than the benchmark 1/2. Two halves make one whole. So 2/5 + 1/2 is a little less than one whole.', model: bars({ numerator: 2, denominator: 5, named: true }, { numerator: 1, denominator: 2, named: true }) }, mode: 'estimate', n: 9, d: 10, context: 'trail lengths', gradeBand: 5, standards: ['5.NF.2'],
    ideaQuestions: [
      practice('Which fraction is closest to 1?', ['9/10', '3/10', '5/10', '1/10'], 0, bars({ numerator: 3, denominator: 10 }, { numerator: 9, denominator: 10 }, { numerator: 5, denominator: 10 }, { numerator: 1, denominator: 10 }), 'Which one is missing just 1 small part?', '9/10 is missing only 1/10, so it is closest to 1.', bars({ numerator: 9, denominator: 10 })),
      practice('Which is closest to 1/2?', ['4/9', '1/9', '8/9', '9/9'], 0, bars({ numerator: 1, denominator: 9 }, { numerator: 4, denominator: 9 }, { numerator: 8, denominator: 9 }, { numerator: 9, denominator: 9 }), 'Half of 9 is 4 and a half. Which numerator is closest to that?', '4/9 is just half a part away from half, so it is closest to 1/2.', bars({ numerator: 1, denominator: 2 })),
      practice('Which fraction is closest to 0?', ['1/12', '5/12', '7/12', '11/12'], 0, bars({ numerator: 5, denominator: 12 }, { numerator: 1, denominator: 12 }, { numerator: 11, denominator: 12 }, { numerator: 7, denominator: 12 }), 'Which one has the fewest parts shaded?', '1/12 is only 1 small part, so it is closest to 0.', bars({ numerator: 1, denominator: 12 })),
      practice('Sam says 3/8 + 1/2 = 4/10. Does that make sense?', ['No, the sum is more than 1/2', 'No, the sum is more than 1', 'Yes, 4/10 is close to 1/2', 'Yes, 3 + 1 = 4 and 8 + 2 = 10'], 0, bars({ numerator: 3, denominator: 8 }, { numerator: 1, denominator: 2 }), 'Adding 3/8 to 1/2 makes more than 1/2. Is 4/10 more than 1/2?', 'The sum must be more than 1/2, but 4/10 is less than 1/2. So it does not make sense.', bars({ numerator: 3, denominator: 8 }, { numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Ana says 1/2 + 1/3 = 5/6. Does that make sense?', ['No, the sum must be more than 1', 'No, 5/6 is less than 1/2', 'Yes, it is between 1/2 and 1', 'Yes, add the tops and the bottoms'], 2, bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 }), 'Is 1/2 + 1/3 more than 1/2? Is it more than 1?', '1/3 is less than 1/2, so 1/2 + 1/3 is between 1/2 and 1. 5/6 is between 1/2 and 1 too, so it makes sense.', bars({ numerator: 1, denominator: 2 }, { numerator: 1, denominator: 3 }), { authoredChoices: true }),
      practice('Leo says 7/8 + 1/2 = 8/10. Does that make sense?', ['No, the sum is more than 1', 'No, the sum is less than 1/2', 'Yes, 8/10 is close to 1', 'Yes, 7 + 1 = 8 and 8 + 2 = 10'], 0, bars({ numerator: 7, denominator: 8 }, { numerator: 1, denominator: 2 }), '7/8 is close to 1. Add 1/2 more. Is the sum more or less than 1?', '7/8 is close to 1, so 7/8 + 1/2 is more than 1. But 8/10 is less than 1, so it does not make sense.', bars({ numerator: 7, denominator: 8 }, { numerator: 1, denominator: 2 }), { authoredChoices: true }),
    ] },
  { id: 'multiply-fractions', title: 'A part of a part', shortTitle: 'Fraction × fraction', description: 'Find 1/2 of 3/4.', skill: 'To find a part of a part, split the parts again. Multiply the numerators and the denominators.', mode: 'multiply', n: 2, d: 3, context: 'garden plot',
    ideaQuestions: [
      practice('Each fourth of a bar is cut in half. What fraction of the whole bar is one small part?', ['1/8', '1/6', '1/4', '1/2'], 0, bars({ numerator: 1, denominator: 4 }), 'Each of the 4 parts becomes 2 small parts. How many small parts make the whole bar?', '4 × 2 = 8 small parts make the whole bar, so one small part is 1/8.', bars({ numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('Each third of a bar is cut into 3 equal parts. What fraction of the whole bar is one small part?', ['1/9', '1/6', '1/3', '1/12'], 0, bars({ numerator: 1, denominator: 3 }), 'Each of the 3 parts becomes 3 small parts. How many small parts make the whole bar?', '3 × 3 = 9 small parts make the whole bar, so one small part is 1/9.', bars({ numerator: 1, denominator: 3 }), { authoredChoices: true }),
      practice('Each sixth of a bar is cut in half. What fraction of the whole bar is one small part?', ['1/12', '1/8', '1/6', '1/3'], 0, bars({ numerator: 1, denominator: 6 }), 'Each of the 6 parts becomes 2 small parts. How many small parts make the whole bar?', '6 × 2 = 12 small parts make the whole bar, so one small part is 1/12.', bars({ numerator: 1, denominator: 6 }), { authoredChoices: true }),
    ] },
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
    ],
    ideaQuestions: [
      practice('To show 1/3 × 3/4 on a square, how many rows and columns do you cut?', ['3 rows and 4 columns', '1 row and 3 columns', '3 rows and 3 columns', '4 rows and 4 columns'], 0,
        bars({ numerator: 1, denominator: 3 }, { numerator: 3, denominator: 4 }),
        'The bottom number of the first fraction tells the rows. The bottom number of the second tells the columns.',
        '1/3 needs 3 rows, and 3/4 needs 4 columns. So cut 3 rows and 4 columns.', bars({ numerator: 1, denominator: 3 }, { numerator: 3, denominator: 4 }), { authoredChoices: true }),
      practice('To show 2/5 × 1/2 on a square, how many rows and columns do you cut?', ['5 rows and 2 columns', '2 rows and 1 column', '5 rows and 5 columns', '2 rows and 2 columns'], 0,
        bars({ numerator: 2, denominator: 5 }, { numerator: 1, denominator: 2 }),
        'The bottom number of the first fraction tells the rows. The bottom number of the second tells the columns.',
        '2/5 needs 5 rows, and 1/2 needs 2 columns. So cut 5 rows and 2 columns.', bars({ numerator: 2, denominator: 5 }, { numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('To show 3/4 × 2/3 on a square, how many rows and columns do you cut?', ['4 rows and 3 columns', '3 rows and 2 columns', '4 rows and 4 columns', '3 rows and 3 columns'], 0,
        bars({ numerator: 3, denominator: 4 }, { numerator: 2, denominator: 3 }),
        'The bottom number of the first fraction tells the rows. The bottom number of the second tells the columns.',
        '3/4 needs 4 rows, and 2/3 needs 3 columns. So cut 4 rows and 3 columns.', bars({ numerator: 3, denominator: 4 }, { numerator: 2, denominator: 3 }), { authoredChoices: true }),
      practice('A square has 4 rows and 5 columns. Shade 3 rows and 2 columns. How many boxes are in the overlap?', ['6', '5', '20', '14'], 0, timesGrid(4, 5),
        'The overlap is where the 3 shaded rows cross the 2 shaded columns. Count those boxes.',
        '3 rows and 2 columns overlap on 3 × 2 = 6 boxes.', timesGrid(4, 5, 3, 2), { authoredChoices: true }),
      practice('A square has 2 rows and 6 columns. Shade 1 row and 5 columns. How many boxes are in the overlap?', ['5', '6', '12', '7'], 0, timesGrid(2, 6),
        'The overlap is where the 1 shaded row crosses the 5 shaded columns. Count those boxes.',
        '1 row and 5 columns overlap on 1 × 5 = 5 boxes.', timesGrid(2, 6, 1, 5), { authoredChoices: true }),
      practice('A square has 6 rows and 3 columns. Shade 4 rows and 2 columns. How many boxes are in the overlap?', ['8', '6', '18', '10'], 0, timesGrid(6, 3),
        'The overlap is where the 4 shaded rows cross the 2 shaded columns. Count those boxes.',
        '4 rows and 2 columns overlap on 4 × 2 = 8 boxes.', timesGrid(6, 3, 4, 2), { authoredChoices: true }),
    ] },
  { id: 'fraction-of-collection', title: 'A fraction of a group', shortTitle: 'Groups of objects', description: 'Find 3/4 of 16 cards.', skill: 'Split the collection into equal groups using the denominator. Count the groups shown by the numerator.', mode: 'sets', n: 3, d: 4, context: 'sports cards',
    ideaQuestions: [
      practice('To find 2/3 of 12 cards, you make 3 equal groups. How many cards are in one group?', ['4', '3', '8', '12'], 0, setModel(0, 12, 3), 'Share the 12 cards into 3 equal groups. Then count one group.', '12 cards shared into 3 equal groups is 4 cards in each group.', setModel(0, 6, 3), { authoredChoices: true }),
      practice('To find 3/5 of 20 cards, you make 5 equal groups. How many cards are in one group?', ['4', '5', '12', '20'], 0, setModel(0, 20, 5), 'Share the 20 cards into 5 equal groups. Then count one group.', '20 cards shared into 5 equal groups is 4 cards in each group.', setModel(0, 10, 5), { authoredChoices: true }),
      practice('To find 5/6 of 18 cards, you make 6 equal groups. How many cards are in one group?', ['3', '6', '15', '18'], 0, setModel(0, 18, 6), 'Share the 18 cards into 6 equal groups. Then count one group.', '18 cards shared into 6 equal groups is 3 cards in each group.', setModel(0, 12, 6), { authoredChoices: true }),
      practice('What is 2/3 of 18 cards?', ['12', '6', '18', '36'], 0, setModel(0, 18, 3), 'Make 3 equal groups. Count the cards in 2 of them.', '18 cards in 3 equal groups is 6 in each group. 2 groups is 12 cards.', setModel(12, 18, 3), { authoredChoices: true }),
      practice('What is 3/4 of 20 cards?', ['15', '5', '16', '60'], 0, setModel(0, 20, 4), 'Make 4 equal groups. Count the cards in 3 of them.', '20 cards in 4 equal groups is 5 in each group. 3 groups is 15 cards.', setModel(15, 20, 4), { authoredChoices: true }),
      practice('What is 2/5 of 25 cards?', ['10', '5', '25', '50'], 0, setModel(0, 25, 5), 'Make 5 equal groups. Count the cards in 2 of them.', '25 cards in 5 equal groups is 5 in each group. 2 groups is 10 cards.', setModel(10, 25, 5), { authoredChoices: true }),
    ] },
  { id: 'divide-whole-by-unit-fraction', title: 'How many parts fit?', shortTitle: 'Divide by a fraction', description: 'How many 1/4 cups fill 2 cups?', skill: 'The denominator tells how many equal parts fit in one whole. Count those parts in the amount.', example: { prompt: 'How many 1/4-cup scoops fill 2 cups?', answer: '8 scoops', explanation: 'One whole cup holds 4 fourths. 2 cups hold 2 groups of 4 fourths. That is 8 scoops of 1/4 cup.', model: bars({ numerator: 8, denominator: 4 }) }, mode: 'divide', n: 1, d: 4, context: 'measuring cup',
    ideaQuestions: [
      // Idea 1: how many unit parts fit in one whole.
      practice('How many 1/3-cup scoops fill 1 cup? 1 ÷ 1/3 = ?', ['3', '4', '6', '1'], 0, bars({ numerator: 1, denominator: 3 }),
        'How many 1/3 parts make one whole cup?', 'Three 1/3s fill one whole cup, so 1 ÷ 1/3 = 3.', emptyWholes(1, 3), { authoredChoices: true }),
      practice('How many 1/5-cup scoops fill 1 cup? 1 ÷ 1/5 = ?', ['5', '6', '10', '1'], 0, bars({ numerator: 1, denominator: 5 }),
        'How many 1/5 parts make one whole cup?', 'Five 1/5s fill one whole cup, so 1 ÷ 1/5 = 5.', emptyWholes(1, 5), { authoredChoices: true }),
      // Idea 2: multiply by the number of wholes.
      practice('How many 1/2-cup scoops fill 3 cups? 3 ÷ 1/2 = ?', ['6', '5', '2', '3'], 0, bars({ numerator: 1, denominator: 2 }),
        'How many 1/2 parts make one whole cup? Then think about 3 cups.', 'Two 1/2s fill each cup. 3 cups: 3 × 2 = 6, so 3 ÷ 1/2 = 6.', emptyWholes(3, 2), { authoredChoices: true }),
    ] },
  { id: 'multiplication-scaling', title: 'Scaling with fractions', shortTitle: 'Scale an amount', description: 'See how a factor below or above one changes an amount.', skill: 'Multiplying by less than 1 takes part of an amount, so it gets smaller. Multiplying by more than 1 makes more than one copy, so it gets bigger.', example: { prompt: 'What is 3/4 of 12? Is the answer less or more than 12?', answer: '9, less than 12', explanation: 'Make 4 equal groups of 3. Three of the groups is 9. Multiplying 12 by 3/4, which is less than one whole, makes a smaller amount.', model: setModel(9, 12, 4) }, mode: 'scaling', n: 3, d: 4, context: 'collections', gradeBand: 5, standards: ['5.NF.5'],
    ideaQuestions: [
      practice('Which fraction is more than 1?', ['5/4', '3/4', '4/4', '1/2'], 0, bars({ numerator: 3, denominator: 4 }, { numerator: 5, denominator: 4 }, { numerator: 4, denominator: 4 }, { numerator: 1, denominator: 2 }), 'Compare the top number with the bottom number. Which top number is larger?', '5/4 has more parts than 4/4, which is 1. So 5/4 is more than 1.', bars({ numerator: 4, denominator: 4 }, { numerator: 5, denominator: 4 })),
      practice('Which fraction is the same as 1?', ['6/6', '5/6', '7/6', '1/6'], 0, bars({ numerator: 5, denominator: 6 }, { numerator: 6, denominator: 6 }, { numerator: 7, denominator: 6 }, { numerator: 1, denominator: 6 }), 'Which one has the same top number and bottom number?', '6/6 is all 6 parts of the whole, so 6/6 is the same as 1.', bars({ numerator: 6, denominator: 6 })),
      practice('Which of these fractions is less than 1 whole?', ['2/3', '3/2', '3/3', '4/3'], 0, bars({ numerator: 3, denominator: 2 }, { numerator: 2, denominator: 3 }, { numerator: 3, denominator: 3 }, { numerator: 4, denominator: 3 }), 'Which one has a top number smaller than its bottom number?', '2/3 is 2 of the 3 parts, not the whole. So 2/3 is less than 1.', bars({ numerator: 2, denominator: 3 }, { numerator: 3, denominator: 3 }), { authoredChoices: true }),
      practice('Is 3/4 × 12 more or less than 12?', ['Less than 12', 'More than 12', 'Equal to 12', "You can't tell"], 0, bars({ numerator: 3, denominator: 4 }), 'Is the factor 3/4 less than 1?', '3/4 is less than 1, so 3/4 × 12 takes only part of 12. It is less than 12.', bars({ numerator: 3, denominator: 4 }, { numerator: 4, denominator: 4 }), { authoredChoices: true }),
      practice('Is 1/2 × 10 more or less than 10?', ['Less than 10', 'More than 10', 'Equal to 10', "You can't tell"], 0, bars({ numerator: 1, denominator: 2 }), 'Is the factor 1/2 less than 1?', '1/2 is less than 1, so 1/2 × 10 takes only part of 10. It is less than 10.', bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 2 }), { authoredChoices: true }),
      practice('Without multiplying, compare 2/5 × 15 with 15: __ 15.', ['<', '=', '>'], 0, bars({ numerator: 2, denominator: 5 }), 'Is the factor 2/5 less than 1? Then you get only part of 15.', '2/5 is less than 1, so 2/5 × 15 is only part of 15: 2/5 × 15 < 15.', bars({ numerator: 2, denominator: 5 }, { numerator: 5, denominator: 5 })),
    ] },
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
    ],
    ideaQuestions: [
      practice('In 4/3 × 6, is the factor 4/3 more or less than 1?', ['More than 1', 'Less than 1', 'Equal to 1', "You can't tell"], 0,
        bars({ numerator: 4, denominator: 3 }), 'Compare 4/3 with 3/3, which is 1.', '4/3 has one more third than 3/3, which is 1. So the factor 4/3 is more than 1.',
        bars({ numerator: 3, denominator: 3 }, { numerator: 4, denominator: 3 }), { authoredChoices: true }),
      practice('In 3/5 × 10, is the factor 3/5 more or less than 1?', ['Less than 1', 'More than 1', 'Equal to 1', "You can't tell"], 0,
        bars({ numerator: 3, denominator: 5 }), 'Compare 3/5 with 5/5, which is 1.', '3/5 is only 3 of the 5 parts, not the whole. So the factor 3/5 is less than 1.',
        bars({ numerator: 3, denominator: 5 }, { numerator: 5, denominator: 5 }), { authoredChoices: true }),
      practice('In 6/6 × 7, is the factor 6/6 more or less than 1?', ['Equal to 1', 'More than 1', 'Less than 1', "You can't tell"], 0,
        bars({ numerator: 6, denominator: 6 }), 'How many sixths make 1 whole?', '6/6 is all 6 parts of the whole, so the factor 6/6 is equal to 1.',
        bars({ numerator: 6, denominator: 6 }), { authoredChoices: true }),
      practice('Is 5/4 × 2 1/2 more than 2 1/2?', ['No, it is less', 'No, it is the same', 'Yes, 5/4 is more than 1', 'Yes, 2 1/2 is more than 1'], 2,
        bars({ numerator: 5, denominator: 4 }, { numerator: 5, denominator: 2 }), 'Look at the factor 5/4. Is it more than 1?',
        '5/4 is more than 1, so 5/4 × 2 1/2 is more than one copy of 2 1/2. Yes, it is more.', bars({ numerator: 4, denominator: 4 }, { numerator: 5, denominator: 4 }), { authoredChoices: true }),
      practice('Is 1/2 × 7/8 more than 7/8?', ['No, 1/2 is less than 1', 'No, it is the same', 'Yes, it is more', 'Yes, multiplying makes more'], 0,
        bars({ numerator: 1, denominator: 2 }, { numerator: 7, denominator: 8 }), 'Look at the factor 1/2. Is it more than 1?',
        '1/2 is less than 1, so 1/2 × 7/8 is only part of 7/8. No, it is less.', bars({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 2 }), { authoredChoices: true }),
    ] },
  { id: 'multiply-mixed-numbers', title: 'Multiply mixed numbers', shortTitle: 'Mixed number multiplication', description: 'Use a rectangle to find the area of a mixed-number garden.', skill: 'Use the side lengths as rows and columns in a rectangle. The number of square units is the product of the side lengths.', example: { prompt: 'A garden is 1 1/2 meters by 1 1/3 meters. What is its area?', answer: '2 square meters', explanation: 'Split the garden at the whole meters into 4 parts. 1 × 1 = 1. 1/2 × 1 = 1/2. 1 × 1/3 = 1/3. 1/2 × 1/3 = 1/6. Add the parts: 6/6 + 3/6 + 2/6 + 1/6 = 12/6, or 2 square meters.', model: gardenModel({ whole: 1, numerator: 1, denominator: 2 }, { whole: 1, numerator: 1, denominator: 3 }, true) }, mode: 'mixed-multiply', n: 2, d: 1, context: 'garden plot', gradeBand: 5, standards: ['5.NF.4b', '5.NF.6'],
    // Idea 1: split at the whole meters and find one part's area (adding them all comes in idea 2).
    ideaQuestions: [
      practice('A garden is 2 1/3 meters by 1 1/4 meters. Split it at the whole meters. How big is its biggest part?', ['2 meters by 1 meter', '2 1/3 meters by 1 1/4 meters', '1/3 meter by 1/4 meter', '2 meters by 1/4 meter'], 0,
        gardenModel({ whole: 2, numerator: 1, denominator: 3 }, { whole: 1, numerator: 1, denominator: 4 }), 'Split each side into its whole meters and its part.',
        '2 1/3 = 2 + 1/3 and 1 1/4 = 1 + 1/4. The biggest part is the whole meters: 2 meters by 1 meter.', gardenModel({ whole: 2, numerator: 1, denominator: 3 }, { whole: 1, numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('A garden is 2 1/4 meters by 1 1/2 meters. What is the area of the part that is 1/4 meter by 1/2 meter?', ['1/8 square meter', '2/6 square meter', '2/8 square meter', '1/6 square meter'], 0,
        gardenModel({ whole: 2, numerator: 1, denominator: 4 }, { whole: 1, numerator: 1, denominator: 2 }), 'Multiply the two parts: 1/4 × 1/2. Multiply the tops, then the bottoms.',
        '1/4 × 1/2 = 1/8. The small corner part is 1/8 square meter.', gardenModel({ whole: 2, numerator: 1, denominator: 4 }, { whole: 1, numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('A garden is 3 1/2 meters by 1 1/4 meters. What is the area of the part that is 3 meters by 1/4 meter?', ['3/4 square meter', '3 1/4 square meters', '3/12 square meter', '1/12 square meter'], 0,
        gardenModel({ whole: 3, numerator: 1, denominator: 2 }, { whole: 1, numerator: 1, denominator: 4 }), 'Multiply the whole by the part: 3 × 1/4.',
        '3 × 1/4 = 3/4. That part is 3/4 square meter.', gardenModel({ whole: 3, numerator: 1, denominator: 2 }, { whole: 1, numerator: 1, denominator: 4 }), { authoredChoices: true }),
    ],
  },
  { id: 'unit-fraction-divided-whole', title: 'Share a unit fraction', shortTitle: 'Divide a unit fraction', description: 'Split one unit fraction into equal shares.', skill: 'Share the unit fraction equally. Each share is a smaller part of the original whole.', mode: 'unit-divided-whole', n: 1, d: 12, context: 'pan of brownies', gradeBand: 5, standards: ['5.NF.7a'],
    ideaQuestions: [
      // Idea 1: cut the part into equal shares and see how many fill the whole.
      practice('2 friends share 1/4 of a cake equally. What fraction of the whole cake does each friend get?', ['1/8', '2/4', '1/6', '1/4'], 0, bars({ numerator: 1, denominator: 4 }),
        'Cut the 1/4 into 2 equal pieces. How many pieces that size fill the whole cake?', 'Cut every fourth into 2 and the whole cake has 8 pieces. Each friend gets 1/8.', emptyWholes(1, 8), { authoredChoices: true }),
      practice('3 friends share 1/2 of a pan equally. What fraction of the whole pan does each friend get?', ['1/6', '3/2', '1/5', '1/2'], 0, bars({ numerator: 1, denominator: 2 }),
        'Cut the 1/2 into 3 equal pieces. How many pieces that size fill the whole pan?', 'Cut every half into 3 and the whole pan has 6 pieces. Each friend gets 1/6.', emptyWholes(1, 6), { authoredChoices: true }),
      practice('4 friends share 1/2 of a pizza equally. What fraction of the whole pizza does each friend get?', ['1/8', '4/2', '1/6', '1/2'], 0, bars({ numerator: 1, denominator: 2 }),
        'Cut the 1/2 into 4 equal pieces. How many pieces that size fill the whole pizza?', 'Cut every half into 4 and the whole pizza has 8 pieces. Each friend gets 1/8.', emptyWholes(1, 8), { authoredChoices: true }),
    ] },
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
    ],
    ideaQuestions: [
      // Idea 1: tell sharing from fitting.
      practice('Pip has 2 cups of rice. Each scoop holds 1/3 cup. Pip counts the scoops. Is this sharing or fitting?', SHARE_OR_FIT, 1, emptyWholes(2),
        'Is an amount split among friends, or do you count how many scoops fit?', 'You count how many 1/3-cup scoops fit in 2 cups, so this is fitting.', emptyWholes(2, 3), { authoredChoices: true }),
      // Idea 2: sharing splits the amount into equal shares.
      practice('1/3 pound of clay is shared by 2 friends. How much does each get?', ['1/6 pound', '2/3 pound', '6 pounds', '1/5 pound'], 0, bars({ numerator: 1, denominator: 3 }),
        'Cut the third of a pound into 2 equal shares. How big is one share of the whole pound?', '1/3 ÷ 2 = 1/6 pound. Each share is smaller than 1/3.', bars({ numerator: 1, denominator: 6 }), { authoredChoices: true }),
      practice('1/4 pound of clay is shared by 2 friends. How much does each get?', ['1/8 pound', '2/4 pound', '8 pounds', '1/6 pound'], 0, bars({ numerator: 1, denominator: 4 }),
        'Cut the fourth of a pound into 2 equal shares. How big is one share of the whole pound?', '1/4 ÷ 2 = 1/8 pound. Each share is smaller than 1/4.', bars({ numerator: 1, denominator: 8 }), { authoredChoices: true }),
      // Idea 3: fitting counts the pieces; check with ×.
      practice('How many 1/3-pound bags can be filled from 2 pounds of clay?', ['6 bags', '5 bags', '2/3 bag', '3 bags'], 0, emptyWholes(2),
        'How many 1/3 pounds make 1 pound? Then think about 2 pounds.', '2 ÷ 1/3 = 6 bags. Each pound fills 3 bags. Check: 6 × 1/3 = 2.', emptyWholes(2, 3), { authoredChoices: true }),
      practice('How many 1/4-pound bags can be filled from 2 pounds of clay?', ['8 bags', '6 bags', '2/4 bag', '4 bags'], 0, emptyWholes(2),
        'How many 1/4 pounds make 1 pound? Then think about 2 pounds.', '2 ÷ 1/4 = 8 bags. Each pound fills 4 bags. Check: 8 × 1/4 = 2.', emptyWholes(2, 4), { authoredChoices: true }),
      practice('Pip says 3 ÷ 1/2 = 6. To check, which multiplication gets back to 3?', ['6 × 1/2 = 3', '6 × 3 = 18', '3 × 1/2 = 3/2', '6 × 2 = 12'], 0, emptyWholes(3, 2),
        'Multiply the answer by the piece size. Do you get back the amount you started with?', '6 pieces of 1/2 make 3 wholes: 6 × 1/2 = 3. So 3 ÷ 1/2 = 6 is right.', emptyWholes(3, 2), { authoredChoices: true }),
    ] },
  { id: 'fraction-of-length', title: 'A fraction of a length', shortTitle: 'Fractional lengths', description: 'Find 3/8 of a ribbon.', skill: 'Split the whole length into equal parts using the denominator. Measure the number of parts shown by the numerator.', mode: 'measure', n: 3, d: 8, context: 'ribbon',
    ideaQuestions: [
      // Idea 1: one part of a length.
      practice('A rope is 10 meters long. How long is 1/5 of it?', ['2 meters', '5 meters', '50 meters', '8 meters'], 0, emptyWholes(1, 5),
        'Cut 10 meters into 5 equal parts. One part is 1/5.', '10 ÷ 5 = 2. One part is 2 meters, so 1/5 of the rope is 2 meters.', bars({ numerator: 1, denominator: 5 }), { authoredChoices: true }),
      practice('A fence is 20 meters long. How long is 1/4 of it?', ['5 meters', '4 meters', '80 meters', '15 meters'], 0, emptyWholes(1, 4),
        'Cut 20 meters into 4 equal parts. One part is 1/4.', '20 ÷ 4 = 5. One part is 5 meters, so 1/4 of the fence is 5 meters.', bars({ numerator: 1, denominator: 4 }), { authoredChoices: true }),
      // Idea 2: count the parts the numerator says.
      practice('A path is 15 meters long. How long is 2/3 of it?', ['10 meters', '5 meters', '30 meters', '15 meters'], 0, emptyWholes(1, 3),
        'Cut 15 meters into 3 equal parts. Count 2 parts.', '15 ÷ 3 = 5 meters in one part. 2 parts: 2 × 5 = 10 meters.', bars({ numerator: 2, denominator: 3 }), { authoredChoices: true }),
    ] },
  { id: 'fractional-measure-addition', title: 'Add lengths', shortTitle: 'Measure together', description: 'Add 1/2 meter and 1/4 meter.', skill: 'Rename the lengths as the same-size parts. Then add them and keep the unit.', mode: 'measure-add', n: 1, d: 2, context: 'wooden boards',
    ideaQuestions: [
      // Idea 1: rename a length in same-size parts.
      practice('A board is 1/3 meter long. How many sixths of a meter is that?', ['2/6 meter', '1/6 meter', '2/3 meter', '4/6 meter'], 0,
        bars({ numerator: 1, denominator: 3 }, { numerator: 0, denominator: 6 }),
        'Each third is cut into 2 sixths. Count the sixths in 1/3.', 'Each third is 2 sixths, so 1/3 meter = 2/6 meter.',
        bars({ numerator: 1, denominator: 3 }, { numerator: 0, denominator: 6 }), { authoredChoices: true }),
      practice('A board is 1/2 meter long. How many eighths of a meter is that?', ['4/8 meter', '1/8 meter', '2/8 meter', '7/8 meter'], 0,
        bars({ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 8 }),
        'Each half is cut into 4 eighths. Count the eighths in 1/2.', 'Each half is 4 eighths, so 1/2 meter = 4/8 meter.',
        bars({ numerator: 1, denominator: 2 }, { numerator: 0, denominator: 8 }), { authoredChoices: true }),
      practice('A board is 3/4 meter long. How many eighths of a meter is that?', ['6/8 meter', '3/8 meter', '7/8 meter', '6/4 meters'], 0,
        bars({ numerator: 3, denominator: 4 }, { numerator: 0, denominator: 8 }),
        'Each fourth is cut into 2 eighths. Count the eighths in 3 fourths.', 'Each fourth is 2 eighths. 3 fourths is 3 × 2 = 6 eighths, so 3/4 meter = 6/8 meter.',
        bars({ numerator: 3, denominator: 4 }, { numerator: 0, denominator: 8 }), { authoredChoices: true }),
    ] },
  { id: 'ruler-measurement', title: 'Measure with fractional inches', shortTitle: 'Read a ruler', description: 'Use equal ruler marks to name a length.', skill: 'The spaces between ruler marks are equal fractions of an inch. Count the spaces to measure.',
    // The answer the practice asks for (1 1/4), with the spaces counted (5/4) beside it.
    example: { prompt: 'Mark a length of 1 1/4 inches on a ruler.', answer: '1 1/4 inches', explanation: 'Each small space is 1/4 inch. 4 spaces make 1 inch, and 1 more space is 1/4 inch more. That is 5 quarter-inch spaces (5/4), written 1 1/4 inches.', model: { kind: 'ruler', denominator: 4, wholes: 2, end: 5 } },
    mode: 'ruler', n: 5, d: 4, context: 'ruler', gradeBand: 3, standards: ['3.MD.4'],
    ideaQuestions: [
      // Idea 1: lengths under 1 inch (count the quarter-inch spaces).
      practice('The blue craft stick starts at zero and ends at a tick with no number. Use the ruler. How long is it in inches?', ['2/4', '3/4', '1/4', '2'], 0, { kind: 'ruler', denominator: 4, wholes: 2, end: 2 }, 'Count how many short spaces make 1 inch. Then count the spaces to the end of the craft stick.', 'Count how many short spaces make 1 inch. Then count the spaces to the end of the craft stick. So the answer is 2/4. It covers 2 small spaces, and each is 1/4 inch.', { kind: 'ruler', denominator: 4, wholes: 2, end: 2 }, { authoredChoices: true }),
      // Idea 2: past 1 inch, the whole inches and the extra part.
      practice('The blue paintbrush starts at zero and ends at a tick with no number. Use the ruler. How long is it in inches?', ['1 3/4', '2', '1 2/4', '3/4'], 0, { kind: 'ruler', denominator: 4, wholes: 2, end: 7 }, 'Count how many short spaces make 1 inch. Then count the spaces to the end of the paintbrush.', 'Count how many short spaces make 1 inch. Then count the spaces to the end of the paintbrush. So the answer is 1 3/4. 4 small spaces make 1 inch, and 3 more make 3/4 inch.', { kind: 'ruler', denominator: 4, wholes: 2, end: 7 }, { authoredChoices: true }),
    ] },
  { id: 'build-line-plots', title: 'Build a fraction line plot', shortTitle: 'Build line plots', description: 'Place one X for each measurement.', skill: 'Place one X for each measurement above its matching value. Stack Xs when measurements match.', example: { prompt: 'Ribbons are 1/4, 3/4, 3/4 and 1 inch long. How many Xs go above 3/4?', answer: '2 Xs', explanation: 'Put one X above the matching tick for each ribbon. Two ribbons are 3/4 inch long, so 2 Xs stack above 3/4.', model: line(3, 4) }, mode: 'line-plot', n: 3, d: 4, context: 'ribbon lengths', gradeBand: 3, standards: ['3.MD.4'],
    ideaQuestions: [
      // Idea 1: find each length on the line (4/4 inch is the tick at 1).
      practice('Which length is the same as 1 inch?', ['4/4 inch', '1/4 inch', '4 inches', '3/4 inch'], 0, { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, 'Count the spaces from 0 to 1 inch. Each space is 1/4 inch.', '4 spaces of 1/4 inch reach the tick at 1. So 4/4 inch is 1 inch.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, { authoredChoices: true }),
      practice('A ribbon is 4/4 inch long. Which tick shows its length?', ['The tick at 1', 'The tick at 3/4', 'The tick at 1/4', 'No tick shows 4/4'], 0, { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, '4/4 inch is the same as 1 inch.', '4 spaces of 1/4 inch from 0 reach the tick at 1. So 4/4 inch is the tick at 1.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, { authoredChoices: true }),
      practice('A leaf is 3/4 inch long. Which tick shows its length?', ['The tick at 3/4', 'The tick at 2/4', 'The tick at 1/4', 'The tick at 1'], 0, { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, 'Start at 0. Count 3 spaces of 1/4 inch.', 'Count 3 spaces from 0: 1/4, 2/4, 3/4. The leaf goes at the tick at 3/4.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, { authoredChoices: true }),
      // Idea 2: one X above each measurement.
      practice('Ribbons are 1/4, 2/4, 3/4 and 4/4 inch long. How many Xs go on the line plot?', ['4', '3', '1', '5'], 0, { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, 'Put one X for each ribbon.', '4 ribbons, so 4 Xs: one above 1/4, 2/4, 3/4 and 1.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, { authoredChoices: true }),
      practice('A ribbon is 2/4 inch long. Where does its X go?', ['Above 2/4', 'Above 1/4', 'Above 1', 'Above 0'], 0, { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, 'Find 2/4 inch on the line. The X goes right above it.', 'The ribbon is 2/4 inch long, so its X goes above 2/4.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, { authoredChoices: true }),
      practice('Leaves are 1/4, 3/4 and 4/4 inch long. Which of these ticks gets no X?', ['2/4', '1/4', '3/4', '1'], 0, { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, 'Put one X above each leaf length. 4/4 inch is the tick at 1.', 'Xs go above 1/4, 3/4 and 1. The tick at 2/4 gets no X.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [] }, { authoredChoices: true }),
    ] },
  { id: 'read-line-plots', title: 'Read a fraction line plot', shortTitle: 'Read line plots', description: 'Use line-plot marks to compare measurements.', skill: 'Read the labels to find each measurement. Then compare them or find how far apart they are.', example: { prompt: 'The line plot shows pencil lengths in eighths of an inch. What is the difference between the longest and shortest?', answer: '4/8 inch', explanation: 'The X farthest right is at 7/8 and the X farthest left is at 3/8. 7/8 − 3/8 = 4/8. So the longest is 4/8 inch longer.', model: { kind: 'lineplot', denominator: 8, wholes: 1, values: [3, 5, 5, 7] } }, mode: 'line-plot-read', n: 5, d: 8, context: 'pencil lengths', gradeBand: 4, standards: ['4.MD.4'],
    // Idea questions (ideas/lessons-41-50.ts): count the Xs (p1), add one stack (p2–p3), longest minus shortest (p4–p5).
    ideaQuestions: [
      practice('The line plot shows bead lengths in eighths of an inch. How many beads are there in all?', ['6', '3', '5', '8'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 2, 3, 5, 5, 5] }, 'Each X is one bead. Count every X.', 'There are 6 Xs, so there are 6 beads.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 2, 3, 5, 5, 5] }, { authoredChoices: true }),
      practice('The line plot shows tile lengths in eighths of an inch. How long are all the 4/8 inch tiles together?', ['8/8 inch', '4/8 inch', '2/8 inch', '8/16 inch'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 4, 4, 6] }, 'Count the Xs above 4/8. Add 4/8 that many times.', '2 Xs at 4/8: 4/8 + 4/8 = 8/8 inch.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 4, 4, 6] }, { authoredChoices: true }),
      practice('The line plot shows shell lengths in eighths of an inch. How long are all the 3/8 inch shells together?', ['9/8 inches', '3/8 inch', '6/8 inch', '9/24 inch'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 3, 3, 3, 6] }, 'Count the Xs above 3/8. Add 3/8 that many times.', '3 Xs at 3/8: 3/8 + 3/8 + 3/8 = 9/8 inches.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 3, 3, 3, 6] }, { authoredChoices: true }),
      practice('The line plot shows ribbon lengths in eighths of an inch. What is the difference between the longest and shortest?', ['5/8 inch', '6/8 inch', '7/8 inch', '1/8 inch'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 3, 3, 6] }, 'Find the farthest-right and farthest-left Xs. Subtract their lengths.', 'The longest is 6/8 and the shortest is 1/8: 6/8 − 1/8 = 5/8 inch.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 3, 3, 6] }, { authoredChoices: true }),
      practice('The line plot shows pencil lengths in eighths of an inch. How much longer is the longest pencil than the shortest?', ['4/8 inch', '7/8 inch', '10/8 inches', '3/8 inch'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [3, 4, 4, 7] }, 'Find the farthest-right and farthest-left Xs. Subtract their lengths.', 'The longest is 7/8 and the shortest is 3/8: 7/8 − 3/8 = 4/8 inch.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [3, 4, 4, 7] }, { authoredChoices: true }),
    ],
  },
  { id: 'line-plot-leveling', title: 'Use line plots to share amounts', shortTitle: 'Reason with line plots', description: 'Use data to find a total and make equal shares.', skill: 'Add the measurements to find the total. Divide that total into equal shares.', example: { prompt: 'Three cups hold 1/2, 1/4 and 0 liter. Share it so each cup holds the same.', answer: '1/4 liter each', explanation: 'First add the amounts: 1/2 + 1/4 + 0 = 3/4 liter. Then split 3/4 into 3 equal shares. Each cup gets 1/4 liter.', model: bars({ numerator: 1, denominator: 4, named: true }, { numerator: 1, denominator: 4, named: true }, { numerator: 1, denominator: 4, named: true }) }, mode: 'line-plot-level', n: 3, d: 4, context: 'beaker amounts', gradeBand: 5, standards: ['5.MD.2'],
    ideaQuestions: [
      // Idea 1: add every amount on the line plot.
      practice('Three jars hold 1/4, 2/4, 3/4 liter. How much water is in all three?', ['6/4 liters', '6/12 liter', '3/4 liter', '6 liters'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 2, 3] },
        'Add the fourths for every X: 1 + 2 + 3.', '1 + 2 + 3 = 6 fourths. All three jars hold 6/4 liters.',
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 2, 3] }, { authoredChoices: true }),
      practice('Three cups hold 2/8, 3/8, 5/8 liter. How much juice is in all three?', ['10/8 liters', '10/24 liter', '5/8 liter', '10 liters'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 3, 5] },
        'Add the eighths for every X: 2 + 3 + 5.', '2 + 3 + 5 = 10 eighths. All three cups hold 10/8 liters.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 3, 5] }, { authoredChoices: true }),
      practice('Four bottles hold 1/4, 2/4, 2/4, 4/4 liter. How much water is in all four?', ['9/4 liters', '9/16 liter', '4/4 liter', '9 liters'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 2, 2, 4] },
        'Add the fourths for every X. Two Xs at one spot count twice.', '1 + 2 + 2 + 4 = 9 fourths. All four bottles hold 9/4 liters.',
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 2, 2, 4] }, { authoredChoices: true }),
      // Idea 2: share a total equally.
      practice('6/4 liters of water is shared equally by 3 cups. How much goes in each cup?', ['2/4 liter', '6/4 liters', '3/4 liter', '2 liters'], 0,
        bars({ numerator: 6, denominator: 4 }),
        'Give each cup the same number of fourths. 6 fourths shared by 3 cups.', '6 fourths ÷ 3 cups = 2 fourths each. Each cup gets 2/4 liter.',
        bars({ numerator: 6, denominator: 4 }), { authoredChoices: true }),
      practice('9/8 liters of juice is shared equally by 3 cups. How much goes in each cup?', ['3/8 liter', '9/8 liters', '3 liters', '3/11 liter'], 0,
        bars({ numerator: 9, denominator: 8 }),
        'Give each cup the same number of eighths. 9 eighths shared by 3 cups.', '9 eighths ÷ 3 cups = 3 eighths each. Each cup gets 3/8 liter.',
        bars({ numerator: 9, denominator: 8 }), { authoredChoices: true }),
      practice('12/8 liters of water is shared equally by 4 jars. How much goes in each jar?', ['3/8 liter', '12/8 liters', '3 liters', '6/8 liter'], 0,
        bars({ numerator: 12, denominator: 8 }),
        'Give each jar the same number of eighths. 12 eighths shared by 4 jars.', '12 eighths ÷ 4 jars = 3 eighths each. Each jar gets 3/8 liter.',
        bars({ numerator: 12, denominator: 8 }), { authoredChoices: true }),
    ] },
  { id: 'measurement-word-problems', title: 'Fractions in measurement stories', shortTitle: 'Measurement stories', description: 'Use fractions with length, time, money, mass and volume.', skill: 'Keep the measurement unit in your answer. Convert units before comparing or calculating.', mode: 'measure-context', n: 3, d: 4, context: 'measurement stories', gradeBand: 4, standards: ['4.MD.2'],
    // Idea questions (ideas/lessons-41-50.ts): split an hour (p1–p2), other units (p3), the same unit before adding (p4–p6).
    ideaQuestions: [
      practice('How many minutes are in 1/2 hour?', ['30 minutes', '60 minutes', '120 minutes', '20 minutes'], 0,
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }], hideLabels: true }, 'An hour is 60 minutes. Split 60 into 2 equal groups.', '60 ÷ 2 = 30, so 1/2 hour is 30 minutes.',
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }] }, { authoredChoices: true }),
      practice('How many minutes are in 1/3 hour?', ['20 minutes', '60 minutes', '180 minutes', '15 minutes'], 0,
        { kind: 'bars', bars: [{ numerator: 0, denominator: 3 }], hideLabels: true }, 'An hour is 60 minutes. Split 60 into 3 equal groups.', '60 ÷ 3 = 20, so 1/3 hour is 20 minutes.',
        { kind: 'bars', bars: [{ numerator: 0, denominator: 3 }] }, { authoredChoices: true }),
      practice('How many milliliters are in 1/2 liter?', ['500 milliliters', '1000 milliliters', '2000 milliliters', '1500 milliliters'], 0,
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }], hideLabels: true }, 'A liter is 1000 milliliters. Split 1000 into 2 equal groups.', '1000 ÷ 2 = 500, so 1/2 liter is 500 milliliters.',
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }] }, { authoredChoices: true }),
      practice('A race takes 1/2 hour. The cool-down takes 5 more minutes. How many minutes in all?', ['35 minutes', '6 minutes', '30 minutes', '25 minutes'], 0,
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }], hideLabels: true }, 'Change 1/2 hour to minutes first. Then add the 5 minutes.', '1/2 hour is 30 minutes. 30 + 5 = 35 minutes.',
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }] }, { authoredChoices: true }),
      practice('You have 1/4 dollar and 5 cents. How many cents is that?', ['30 cents', '6 cents', '25 cents', '20 cents'], 0,
        { kind: 'bars', bars: [{ numerator: 0, denominator: 4 }], hideLabels: true }, 'Change 1/4 dollar to cents first. Then add the 5 cents.', '1/4 dollar is 25 cents. 25 + 5 = 30 cents.',
        { kind: 'bars', bars: [{ numerator: 0, denominator: 4 }] }, { authoredChoices: true }),
      practice('A jug has 1/2 liter of water. You add 100 milliliters. How many milliliters are in the jug now?', ['600 milliliters', '101 milliliters', '500 milliliters', '400 milliliters'], 0,
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }], hideLabels: true }, 'Change 1/2 liter to milliliters first. Then add the 100 milliliters.', '1/2 liter is 500 milliliters. 500 + 100 = 600 milliliters.',
        { kind: 'bars', bars: [{ numerator: 0, denominator: 2 }] }, { authoredChoices: true }),
    ],
  },
  { id: 'fractional-unit-conversions', title: 'Convert fraction units', shortTitle: 'Fraction unit conversions', description: 'Find a fractional amount in a smaller unit.', skill: 'Convert the whole measurement to smaller units first. Then find the fraction of that amount.', example: { prompt: 'How many minutes are in 3/4 of an hour?', answer: '45 minutes', explanation: 'One hour is 60 minutes. Split it into 4 equal parts of 15 minutes each. 3 of those parts is 45 minutes.', model: bars({ numerator: 3, denominator: 4 }) }, mode: 'unit-conversion', n: 3, d: 4, context: 'measuring tools', gradeBand: 5, standards: ['5.MD.1', '4.MD.2'],
    ideaQuestions: [
      // Idea 1: how many small units make one big unit.
      practice('How many inches are in 1 foot?', ['12 inches', '10 inches', '100 inches', '16 inches'], 0, { ...emptyWholes(1), caption: '1 foot' },
        'Look at the unit facts. A ruler is 1 foot long.', '1 foot = 12 inches.', { ...emptyWholes(1), caption: '1 foot' }, { authoredChoices: true }),
      practice('How many minutes are in 1 hour?', ['60 minutes', '100 minutes', '12 minutes', '24 minutes'], 0, { ...emptyWholes(1), caption: '1 hour' },
        'Look at the unit facts. A clock goes all the way round in 1 hour.', '1 hour = 60 minutes.', { ...emptyWholes(1), caption: '1 hour' }, { authoredChoices: true }),
      practice('How many ounces are in 1 pound?', ['16 ounces', '12 ounces', '10 ounces', '100 ounces'], 0, { ...emptyWholes(1), caption: '1 pound' },
        'Look at the unit facts for pounds.', '1 pound = 16 ounces.', { ...emptyWholes(1), caption: '1 pound' }, { authoredChoices: true }),
      // Idea 3: multiply by the numerator.
      practice('How many minutes are in 2/3 of an hour?', ['40 minutes', '20 minutes', '60 minutes', '90 minutes'], 0, emptyWholes(1, 3),
        '1 hour is 60 minutes. Find one third, then take 2 of them.', '60 ÷ 3 = 20 minutes in one part. 2 × 20 = 40 minutes.', emptyWholes(1, 3), { authoredChoices: true }),
      practice('How many inches are in 3/4 foot?', ['9 inches', '3 inches', '12 inches', '36 inches'], 0, emptyWholes(1, 4),
        '1 foot is 12 inches. Find one fourth, then take 3 of them.', '12 ÷ 4 = 3 inches in one part. 3 × 3 = 9 inches.', emptyWholes(1, 4), { authoredChoices: true }),
      practice('How many hours are in 3/4 of a day?', ['18 hours', '6 hours', '24 hours', '32 hours'], 0, emptyWholes(1, 4),
        '1 day is 24 hours. Find one fourth, then take 3 of them.', '24 ÷ 4 = 6 hours in one part. 3 × 6 = 18 hours.', emptyWholes(1, 4), { authoredChoices: true }),
    ] },
  { id: 'fractional-sharing', title: 'Fair shares', shortTitle: 'Fair sharing', description: 'Share 3 loaves with 4 friends.', skill: 'Share the total equally. The amount each friend gets is the total divided by the number of friends.', mode: 'share', n: 3, d: 4, context: 'loaf of bread',
    ideaQuestions: [
      // Idea 1: cut each loaf into one part for each friend.
      practice('3 loaves are shared fairly by 4 friends. Each loaf is cut into one part for each friend. What fraction of a loaf is one part?', ['1/4 loaf', '1/3 loaf', '1/7 loaf', '1/12 loaf'], 0, emptyWholes(3),
        'How many friends are there? Cut each loaf into that many equal parts.', '4 friends, so each loaf is cut into 4 equal parts. One part is 1/4 of a loaf.', emptyWholes(3, 4), { authoredChoices: true }),
      practice('2 loaves are shared fairly by 5 friends. Into how many equal parts should each loaf be cut?', ['5 parts', '2 parts', '7 parts', '10 parts'], 0, emptyWholes(2),
        'Each friend gets one part of every loaf. How many friends are there?', '5 friends, so cut each loaf into 5 equal parts. Each friend gets one part of each loaf.', emptyWholes(2, 5), { authoredChoices: true }),
      practice('4 pizzas are shared fairly by 3 friends. Into how many equal parts should each pizza be cut?', ['3 parts', '4 parts', '7 parts', '12 parts'], 0, emptyWholes(4),
        'Each friend gets one part of every pizza. How many friends are there?', '3 friends, so cut each pizza into 3 equal parts. Each friend gets one part of each pizza.', emptyWholes(4, 3), { authoredChoices: true }),
    ] },
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
    ],
    ideaQuestions: [
      // Idea 1: a division written as a fraction.
      practice('Write 2 ÷ 3 as a fraction.', ['2/3', '3/2', '1/3', '2/5'], 0, emptyWholes(2, 3),
        'The number shared goes on top. The number of shares goes on the bottom.', '2 ÷ 3 = 2/3. Each share is 2/3 of a whole.', emptyWholes(2, 3), { authoredChoices: true }),
      // Idea 2: the whole numbers a fraction is between.
      practice('Between which two whole numbers is 9/4?', ['2 and 3', '1 and 2', '3 and 4', '9 and 10'], 0, line(0, 4, 3),
        'How many fourths make one whole? How many wholes fit in 9 fourths?', '9/4 = 9 ÷ 4 = 2 1/4. That is more than 2 and less than 3.', { kind: 'line', numerator: 9, denominator: 4, wholes: 3 }, { authoredChoices: true }),
      practice('Between which two whole numbers is 7/2?', ['3 and 4', '2 and 3', '4 and 5', '7 and 8'], 0, line(0, 2, 4),
        'How many halves make one whole? How many wholes fit in 7 halves?', '7/2 = 7 ÷ 2 = 3 1/2. That is more than 3 and less than 4.', { kind: 'line', numerator: 7, denominator: 2, wholes: 4 }, { authoredChoices: true }),
    ] },
  { id: 'fraction-probability', title: 'Bonus: Chance as a fraction', shortTitle: 'Bonus probability', description: 'What is the chance of blue?', skill: 'The numerator counts the outcomes you want. The denominator counts all equally likely outcomes.', mode: 'probability', n: 2, d: 8, context: 'color spinner', enrichment: true,
    // Idea 1: count every equally likely outcome (no chance or fraction yet).
    ideaQuestions: [
      practice('This spinner has 6 equal parts. How many equally likely outcomes does it have?', ['6', '2', '4', '1'], 0, { kind: 'area', cut: 'circle-sixths', shaded: [0, 1] },
        'Each equal part is one outcome. Count every part, not just the colored ones.',
        'The spinner can land on any of its 6 equal parts, so it has 6 equally likely outcomes.', { kind: 'area', cut: 'circle-sixths', shaded: [0, 1] }, { authoredChoices: true }),
      practice('Are the outcomes on this spinner equally likely?', ['No, one part is bigger', 'No, it needs 8 parts', 'Yes, it can land on any part', 'Yes, it has 4 parts'], 0, { kind: 'area', cut: 'circle-unequal', shaded: [] },
        'Equally likely outcomes need same-size parts. Compare the parts.',
        'One part is bigger, so the spinner lands there more often. The outcomes are not equally likely.', { kind: 'area', cut: 'circle-fourths', shaded: [] }, { authoredChoices: true }),
      practice('A bag has 7 marbles. 3 are green. You pick 1 without looking. How many outcomes are there?', ['7', '3', '4', '1'], 0, setModel(3, 7, 7),
        'Each marble is one outcome. Count every marble.',
        '7 marbles, so 7 equally likely outcomes. The 3 green ones are only some of them.', setModel(3, 7, 7), { authoredChoices: true }),
    ],
  },
  { id: 'fraction-of-area', title: 'Fractions in shapes', shortTitle: 'Equal-area partitions', description: 'Explore equal-area parts in squares, rectangles, circles and hexagons.', skill: 'Fraction parts must have equal areas. Their shapes may look different, but each part must cover the same amount of space.', mode: 'area', n: 3, d: 8, context: 'shape tiles', gradeBand: 3, standards: ['3.G.2'],
    example: { prompt: 'Two small squares and two triangles fill this square. What fraction is each part?', answer: '1/4.',
      explanation: 'The shapes are different, but each part covers the same space: half of one half. 4 equal parts, so each part is 1/4.',
      model: { kind: 'area', cut: 'fourths-mixed', shaded: [0, 2], caption: 'A square and a triangle: both are 1/4' } },
    ideaQuestions: [
      practice('This square is cut into 1 small square and 6 triangles. Are all the parts equal in area?', ['No, the small square covers more', 'Yes, they all fill the square', 'Yes, they are all small parts', 'No, the triangles cover more'], 0, { kind: 'area', cut: 'quarter-and-triangles', shaded: [] }, 'Picture moving a triangle on top of the small square. Does it cover the same space?', 'The small square covers the same space as 2 triangles, so the parts are not equal in area.', { kind: 'area', cut: 'fourths-squares', shaded: [] }, { authoredChoices: true }),
      practice('This square is cut into 4 parts. Are the parts equal in area?', ['No, some parts cover more space', 'Yes, there are 4 parts', 'Yes, they all have 4 sides', 'No, parts must be triangles'], 0, { kind: 'area', cut: 'fourths-unequal', shaded: [] }, 'Compare the parts. Does each one cover the same space?', 'Some parts cover more space than others, so the parts are not equal in area.', { kind: 'area', cut: 'fourths-squares', shaded: [] }, { authoredChoices: true }),
      practice('4 triangles fill this square. Are they equal in area?', ['No, triangles are not fair', 'Yes, each covers the same space', 'No, there should be squares', 'Yes, they are all triangles'], 1, { kind: 'area', cut: 'fourths-triangles', shaded: [] }, 'Picture moving one triangle on top of another. Do they cover the same space?', 'Each triangle covers the same space, so the 4 parts are equal in area.', { kind: 'area', cut: 'fourths-squares', shaded: [] }, { authoredChoices: true }),
      practice('This hexagon is on a game board. What fraction of the hexagon is colored?', ['4/6', '2/6', '1/6', '6/4'], 0, { kind: 'area', cut: 'hexagon-sixths', shaded: [0, 1, 2, 3] }, 'Count all the equal parts first. Then count the colored parts.', 'The hexagon has 6 equal parts, and 4 are colored: 4/6.', { kind: 'area', cut: 'hexagon-sixths', shaded: [0, 1, 2, 3] }, { authoredChoices: true }),
      practice('This hexagon is on a tile floor. What fraction of the hexagon is colored?', ['5/6', '1/6', '5/1', '6/5'], 0, { kind: 'area', cut: 'hexagon-sixths', shaded: [0, 1, 2, 3, 4] }, 'Count all the equal parts first. Then count the colored parts.', 'The hexagon has 6 equal parts, and 5 are colored: 5/6.', { kind: 'area', cut: 'hexagon-sixths', shaded: [0, 1, 2, 3, 4] }, { authoredChoices: true }),
    ] },
  { id: 'fractional-side-area', title: 'Area with fractional sides', shortTitle: 'Fractional side area', description: 'Use a grid to find the area when both side lengths are fractions.', skill: 'A rectangle’s area is its side lengths multiplied. Count the small squares to see the fractional area.', mode: 'fractional-area', n: 1, d: 2, context: 'rectangle grid', gradeBand: 5, standards: ['5.NF.4b'],
    example: { prompt: 'A rectangle is 2/3 unit by 3/4 unit. What is its area?', answer: '6/12 square unit', explanation: 'Cut one square unit into 3 columns and 4 rows: 12 equal small rectangles. 2 columns and 3 rows overlap on 6 of them, so the area is 6/12 square unit.', model: { kind: 'area', cut: 'grid-3x4', shaded: [0, 1, 3, 4, 6, 7] } },
    // Idea 1: area of whole-unit rectangles (rows times columns); idea 3: both sides are fractions.
    ideaQuestions: [
      practice('Each small square is 1 square unit. Color a rectangle 3 units long and 2 units wide. What is its area?', ['6 square units', '5 square units', '10 square units', '3 square units'], 0,
        { kind: 'area', cut: 'grid-4x4', shaded: [], colorTask: { n: 6, d: 16 } }, 'Color 2 rows of 3 squares. How many squares did you color?',
        '2 rows of 3 squares: 2 × 3 = 6 square units.', { kind: 'area', cut: 'grid-4x4', shaded: gridOverlap(4, 2, 3) }, { authoredChoices: true }),
      practice('A rectangle is 4 units long and 3 units wide. What is its area?', ['12 square units', '7 square units', '14 square units', '4 square units'], 0,
        { kind: 'area', cut: 'grid-4x4', shaded: [], colorTask: { n: 12, d: 16 } }, 'Color 3 rows of 4 squares. Rows times columns.',
        '3 rows of 4 squares: 3 × 4 = 12 square units.', { kind: 'area', cut: 'grid-4x4', shaded: gridOverlap(4, 3, 4) }, { authoredChoices: true }),
      practice('A rectangle is 5 units long and 2 units wide. What is its area?', ['10 square units', '7 square units', '14 square units', '5 square units'], 0,
        { kind: 'area', cut: 'grid-5x5', shaded: [], colorTask: { n: 10, d: 25 } }, 'Color 2 rows of 5 squares. Rows times columns.',
        '2 rows of 5 squares: 2 × 5 = 10 square units.', { kind: 'area', cut: 'grid-5x5', shaded: gridOverlap(5, 2, 5) }, { authoredChoices: true }),
      practice('A rectangular mosaic is 2/3 unit by 2/4 unit. Color the overlapping area on the 3-by-4 grid. What is its area in square units?', ['4/12', '14/12', '8/12', '12/4'], 0,
        { kind: 'area', cut: 'grid-3x4', shaded: [], colorTask: { n: 4, d: 12 } }, 'Multiply the tops: 2 × 2. Multiply the bottoms: 3 × 4.',
        '2 columns and 2 rows overlap on 4 of the 12 squares. 2 × 2 = 4 and 3 × 4 = 12, so the area is 4/12 square unit.', { kind: 'area', cut: 'grid-3x4', shaded: gridOverlap(3, 2, 2) }, { authoredChoices: true }),
      practice('A rectangular wall panel is 1/3 unit by 3/4 unit. Color the overlapping area on the 3-by-4 grid. What is its area in square units?', ['3/12', '13/12', '9/12', '12/3'], 0,
        { kind: 'area', cut: 'grid-3x4', shaded: [], colorTask: { n: 3, d: 12 } }, 'Multiply the tops: 1 × 3. Multiply the bottoms: 3 × 4.',
        '1 column and 3 rows overlap on 3 of the 12 squares. 1 × 3 = 3 and 3 × 4 = 12, so the area is 3/12 square unit.', { kind: 'area', cut: 'grid-3x4', shaded: gridOverlap(3, 3, 1) }, { authoredChoices: true }),
    ],
  },
  { id: 'equivalent-number-line', title: 'Same spot, new name', shortTitle: 'Line equivalence', description: '2/3 and 4/6 land on the same spot.', skill: 'Split every space into the same number of smaller spaces. The jumps change too, so the point stays in the same place.', mode: 'line', n: 2, d: 3, context: 'number line',
    ideaQuestions: [
      // Idea 1: split every space the same way.
      practice('Cut every third into 2 equal spaces. How many spaces are from 0 to 1 now?', ['6 spaces', '5 spaces', '3 spaces', '4 spaces'], 0, { kind: 'line', numerator: 0, denominator: 3, wholes: 1, hideLabels: true }, 'Each of the 3 spaces becomes 2 spaces.', '3 spaces, each cut into 2: 6 spaces from 0 to 1.', { kind: 'line', numerator: 0, denominator: 6, wholes: 1 }, { authoredChoices: true }),
      practice('Cut every fourth into 2 equal spaces. What is 1 new space?', ['1/8', '1/6', '1/4', '1/2'], 0, { kind: 'line', numerator: 0, denominator: 4, wholes: 1, hideLabels: true }, 'Count all the new spaces from 0 to 1.', '4 spaces, each cut into 2, make 8 spaces. 1 new space is 1/8.', { kind: 'line', numerator: 0, denominator: 8, wholes: 1 }, { authoredChoices: true }),
      practice('Cut every half into 2 equal spaces. What is 1 new space?', ['1/4', '1/3', '1/2', '1/8'], 0, { kind: 'line', numerator: 0, denominator: 2, wholes: 1, hideLabels: true }, 'Count all the new spaces from 0 to 1.', '2 spaces, each cut into 2, make 4 spaces. 1 new space is 1/4.', { kind: 'line', numerator: 0, denominator: 4, wholes: 1 }, { authoredChoices: true }),
      // Idea 2: the same spot gets a new name (cutting every space into 3).
      practice('1/2 is marked on a line. Which fraction with a denominator of 6 is at the same spot?', ['3/6', '1/6', '5/6', '3/2'], 0, { kind: 'line', numerator: 1, denominator: 2, wholes: 1, hideLabels: true }, 'Cut every space into 3. Now there are 3 times as many spaces and 3 times as many jumps.', 'Cut every space into 3. 1 jump becomes 3 jumps of 1/6. So the answer is 3/6.', line(1, 2), { authoredChoices: true }),
    ] },
  { id: 'fraction-recipes', title: 'Recipe fractions', shortTitle: 'Recipe fractions', description: 'Double a recipe.', skill: 'To double a recipe, use twice as much of every ingredient. Add each amount to itself.', mode: 'recipe', n: 3, d: 4, context: 'pancake recipe',
    // Idea questions (ideas/lessons-41-50.ts): add the amount once for each batch, before multiplying is taught.
    ideaQuestions: [
      practice('A recipe uses 1/4 cup of milk. You make 2 batches. How much milk do you need?', ['2/4 cup', '2/8 cup', '1/4 cup', '1/8 cup'], 0,
        bars({ numerator: 1, denominator: 4 }), '2 batches: 1/4 + 1/4. Add the numerators. The parts stay fourths.', '1/4 + 1/4 = 2/4 cup of milk.',
        bars({ numerator: 1, denominator: 4 }, { numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('A recipe uses 2/5 cup of sugar. You make 2 batches. How much sugar do you need?', ['4/5 cup', '4/10 cup', '2/5 cup', '2/10 cup'], 0,
        bars({ numerator: 2, denominator: 5 }), '2 batches: 2/5 + 2/5. Add the numerators. The parts stay fifths.', '2/5 + 2/5 = 4/5 cup of sugar.',
        bars({ numerator: 2, denominator: 5 }, { numerator: 2, denominator: 5 }), { authoredChoices: true }),
      practice('A recipe uses 1/6 cup of oil. You make 3 batches. How much oil do you need?', ['3/6 cup', '3/18 cup', '1/6 cup', '4/6 cup'], 0,
        bars({ numerator: 1, denominator: 6 }), '3 batches: 1/6 + 1/6 + 1/6. Add the numerators. The parts stay sixths.', '1/6 + 1/6 + 1/6 = 3/6 cup of oil.',
        bars({ numerator: 1, denominator: 6 }, { numerator: 1, denominator: 6 }, { numerator: 1, denominator: 6 }), { authoredChoices: true }),
    ],
  },
  { id: 'fractions-to-percent', title: 'Bonus: Fractions to percent', shortTitle: 'Bonus percent', description: 'Write 3/4 as 75%.', skill: 'Percent means out of 100. Rename the fraction in hundredths to find the percent.', mode: 'percent', n: 3, d: 4, context: 'school survey', enrichment: true,
    // Idea 1: rename in hundredths (the percent comes in idea 2).
    ideaQuestions: [
      practice('Write 1/2 with a denominator of 100.', ['50/100', '1/100', '99/100', '100/50'], 0, bars({ numerator: 1, denominator: 2 }),
        '100 ÷ 2 = 50. Multiply the top and the bottom by 50.', '1 × 50 = 50 and 2 × 50 = 100, so 1/2 = 50/100.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('Write 3/10 with a denominator of 100.', ['30/100', '3/100', '93/100', '100/30'], 0, bars({ numerator: 3, denominator: 10 }),
        '100 ÷ 10 = 10. Multiply the top and the bottom by 10.', '3 × 10 = 30 and 10 × 10 = 100, so 3/10 = 30/100.', bars({ numerator: 3, denominator: 10 }), { authoredChoices: true }),
      practice('Write 1/5 with a denominator of 100.', ['20/100', '1/100', '96/100', '100/20'], 0, bars({ numerator: 1, denominator: 5 }),
        '100 ÷ 5 = 20. Multiply the top and the bottom by 20.', '1 × 20 = 20 and 5 × 20 = 100, so 1/5 = 20/100.', bars({ numerator: 1, denominator: 5 }), { authoredChoices: true }),
    ],
  },
  { id: 'percent-to-fraction', title: 'Bonus: Percent to fractions', shortTitle: 'Bonus percent as fraction', description: 'Write 60% as 60/100.', skill: 'Percent means out of 100. Write the percent as that many parts out of 100.', mode: 'percent-inverse', n: 3, d: 5, context: 'game score', enrichment: true,
    // Idea 1: a percent is a number out of 100 (writing it as a fraction comes in idea 2).
    ideaQuestions: [
      practice('A big square has 100 small squares. 45% of them are blue. How many small squares are blue?', ['45', '55', '4', '5'], 0, { kind: 'area', cut: 'grid-10x10', shaded: [] },
        '45% means 45 out of 100.', '45% is 45 out of 100, so 45 of the 100 small squares are blue.', grids(hundredthsGrid(45)), { authoredChoices: true }),
      practice('What does 70% mean?', ['70 out of 100', '70 out of 10', '7 out of 100', '100 out of 70'], 0, { kind: 'area', cut: 'grid-10x10', shaded: [] },
        'Percent means out of 100.', '70% means 70 out of 100: 70 of 100 equal squares.', grids(hundredthsGrid(70)), { authoredChoices: true }),
      practice('A test score is 85%. How many points out of 100 is that?', ['85', '15', '8', '100'], 0, { kind: 'area', cut: 'grid-10x10', shaded: [] },
        '85% means 85 out of 100.', '85% is 85 out of 100: 85 points.', grids(hundredthsGrid(85)), { authoredChoices: true }),
    ],
  },
  { id: 'decimal-fraction-equivalence', title: 'Fractions to decimals', shortTitle: 'Three forms', description: 'Write 1/4 as 0.25.', skill: 'Rename a fraction in tenths or hundredths. Write tenths with one decimal place and hundredths with two.', mode: 'decimal-equivalent', n: 7, d: 10, context: 'battery meter',
    ideaQuestions: [
      // Idea 1: tenths and hundredths are ready to write as decimals.
      practice('Write 72/100 as a decimal.', ['0.72', '7.2', '72', '72.100'], 0, bars({ numerator: 72, denominator: 100 }),
        'Hundredths use 2 places after the decimal point.', '72 hundredths is 0.72.', bars({ numerator: 72, denominator: 100 }), { authoredChoices: true }),
      practice('Write the shaded part of the grid as a decimal.', ['0.36', '3.6', '36', '0.64'], 0, grids(hundredthsGrid(36)),
        'Count the shaded squares out of 100. Hundredths use 2 places after the point.', '36 of 100 squares: 36/100 = 0.36.', grids(hundredthsGrid(36)), { authoredChoices: true }),
      // Idea 2: rename fifths and halves in tenths first.
      practice('Write 1/2 as a decimal.', ['0.5', '1.2', '0.12', '0.2'], 0, bars({ numerator: 1, denominator: 2 }),
        'What times 2 makes 10? Multiply top and bottom by that number.', '2 × 5 = 10, so 1/2 = 5/10 = 0.5.', bars({ numerator: 1, denominator: 2 }), { authoredChoices: true }),
      // Idea 3: rename fourths in hundredths first.
      practice('Write 3/4 with a denominator of 100.', ['75/100', '3/100', '99/100', '100/75'], 0, bars({ numerator: 3, denominator: 4 }),
        'What times 4 makes 100? Multiply the top by the same number.', '4 × 25 = 100 and 3 × 25 = 75: 3/4 = 75/100.', bars({ numerator: 3, denominator: 4 }), { authoredChoices: true }),
      practice('Write 3/4 as a decimal.', ['0.75', '3.4', '0.34', '0.4'], 0, bars({ numerator: 3, denominator: 4 }),
        'Rename 3/4 in hundredths first: 4 × 25 = 100.', '3/4 = 75/100, and 75 hundredths is 0.75.', bars({ numerator: 3, denominator: 4 }), { authoredChoices: true }),
    ] },
  { id: 'compare-decimals', title: 'Compare decimals', shortTitle: 'Compare decimal sizes', description: 'Compare decimals using tenths and hundredths.', skill: 'Write both decimals with the same number of places. Then compare the digits by place value.', example: { prompt: 'Which is bigger, 0.4 or 0.35?', answer: '0.4', explanation: 'Write 0.4 as 0.40, so both have 2 places after the decimal point. 40 hundredths are more than 35 hundredths. So 0.4 is bigger, even though 35 looks bigger than 4.', model: bars({ numerator: 40, denominator: 100 }, { numerator: 35, denominator: 100 }) }, mode: 'decimal-compare', n: 3, d: 10, context: 'hundredths grid', gradeBand: 4, standards: ['4.NF.7'],
    ideaQuestions: [
      // Idea 1: give both decimals the same number of places (0.4 = 0.40).
      practice('Which decimal is the same amount as 0.4?', ['0.40', '0.04', '4.0', '40'], 0, decimal(4),
        'Put a 0 at the end: 4 tenths is 40 hundredths.', '0.4 is 4 tenths, the same amount as 40 hundredths: 0.40.', grids(hundredthsGrid(40)), { authoredChoices: true }),
      practice('How many hundredths is 0.7?', ['70', '7', '700', '30'], 0, decimal(7),
        'Each tenth is 10 hundredths.', '0.7 is 7 tenths. 7 tenths is 70 hundredths, so 0.7 = 0.70.', grids(hundredthsGrid(70)), { authoredChoices: true }),
      practice('Write 0.3 with two places after the point.', ['0.30', '0.03', '3.00', '30'], 0, decimal(3),
        'Put a 0 in the hundredths place. The amount stays the same.', '0.3 is 3 tenths, the same amount as 30 hundredths: 0.30.', grids(hundredthsGrid(30)), { authoredChoices: true }),
      // Idea 3: if the tenths match, compare the hundredths.
      practice('Compare: 0.56 __ 0.52.', ['<', '>', '='], 1, bars({ numerator: 56, denominator: 100 }, { numerator: 52, denominator: 100 }),
        'Both have 5 tenths. Compare the hundredths.', 'The tenths match. 6 hundredths are more than 2 hundredths, so 0.56 > 0.52.',
        bars({ numerator: 56, denominator: 100 }, { numerator: 52, denominator: 100 }), { authoredChoices: true }),
      practice('Compare: 0.7 __ 0.75.', ['<', '>', '='], 0, bars({ numerator: 7, denominator: 10 }, { numerator: 75, denominator: 100 }),
        'Write 0.7 as 0.70. Both have 7 tenths, so compare the hundredths.', 'The tenths match. 0 hundredths are less than 5 hundredths, so 0.7 < 0.75.',
        bars({ numerator: 70, denominator: 100 }, { numerator: 75, denominator: 100 }), { authoredChoices: true }),
    ] },
  { id: 'compare-decimals-grid', title: 'Compare decimals on a grid', shortTitle: 'Decimals on a grid', description: 'Use hundredths grids to compare and order decimals.',
    skill: 'Write both decimals in hundredths. Then compare how many hundredths. Only compare amounts of the same whole.',
    example: { prompt: 'Which is more: 0.7 or 0.07?', answer: '0.7', explanation: '0.7 = 70 hundredths. 0.07 = 7 hundredths. 0.7 is more. 70 hundredths are more than 7 hundredths.',
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
      // Idea 2 (more shaded squares is bigger): its wrong choices are comparison slips, not "You can't tell", which
      // idea 3 teaches (parts of different wholes). The fourth is a misread number (0.25 read as 0.52), never a
      // mirror of another choice.
      practice('Compare: 0.3 __ 0.25.', ['>', '<', '='], 0,
        grids(hundredthsGrid(30), hundredthsGrid(25)),
        'Write 0.3 in hundredths first. Then compare the counts.',
        '0.3 = 30 hundredths and 0.25 = 25 hundredths. 30 is more than 25, so 0.3 > 0.25.', grids(hundredthsGrid(30), hundredthsGrid(25)), { signExtra: '0.3 > 0.52' }),
      practice('Put 0.8, 0.75 and 0.09 in order, biggest first.', ['0.8, 0.75, 0.09', '0.75, 0.8, 0.09', '0.09, 0.75, 0.8', '0.8, 0.09, 0.75'], 0,
        grids(hundredthsGrid(80), hundredthsGrid(75), hundredthsGrid(9)),
        'Write each one in hundredths. Which grid has the most squares shaded?',
        '0.8 = 80 hundredths, 0.75 = 75 hundredths and 0.09 = 9 hundredths. 80 > 75 > 9, so 0.8 > 0.75 > 0.09.', grids(hundredthsGrid(80), hundredthsGrid(75), hundredthsGrid(9))),
    ],
    ideaQuestions: [
      // Idea 1: write each decimal in hundredths and shade it.
      practice('How many hundredths is 0.9?', ['90', '9', '900', '10'], 0, grids(hundredthsGrid(0)),
        'Each column is one tenth: 10 hundredths.', '0.9 is 9 tenths. 9 columns of 10 squares is 90 hundredths.', grids(hundredthsGrid(90)), { authoredChoices: true }),
      practice('How many hundredths is 0.08?', ['8', '80', '92', '0'], 0, grids(hundredthsGrid(0)),
        'The 0 right after the point means 0 tenths. The 8 counts hundredths.', '0.08 is 0 tenths and 8 hundredths: 8 single squares.', grids(hundredthsGrid(8)), { authoredChoices: true }),
      practice('Which decimal does this grid show?', ['0.45', '4.5', '0.55', '45'], 0, grids(hundredthsGrid(45)),
        'Count the full columns for tenths. Then count the single squares for hundredths.', '4 full columns and 5 single squares: 45 hundredths, or 0.45.', grids(hundredthsGrid(45)), { authoredChoices: true }),
      // Idea 3: only compare parts of the same whole.
      practice('Sam eats 0.45 of a pizza. Ana eats 0.05 of the same size pizza. Who eats more?', ['Sam', 'Ana', 'They eat the same', "You can't tell"], 0,
        grids(hundredthsGrid(45), hundredthsGrid(5)), 'The pizzas are the same size. Compare 45 hundredths and 5 hundredths.',
        'Same-size pizzas, so compare the hundredths: 45 is more than 5. Sam eats more.', grids(hundredthsGrid(45), hundredthsGrid(5)), { authoredChoices: true }),
      practice('Tom eats 0.6 of a small pie. Zoe eats 0.3 of a big pie. Who eats more?', ['Tom', 'Zoe', 'They eat the same', "You can't tell"], 3,
        { kind: 'area', cut: 'circle-tenths', shaded: [], scale: 0.6, more: [{ cut: 'circle-tenths', shaded: [] }] },
        'Look at the two wholes. Are the pies the same size?',
        'The pies are different sizes, so 0.6 and 0.3 are parts of different wholes. You can only compare parts of the same whole.',
        { kind: 'area', cut: 'circle-tenths', shaded: [0, 1, 2, 3, 4, 5], scale: 0.6, more: [{ cut: 'circle-tenths', shaded: [0, 1, 2] }] }, { authoredChoices: true }),
    ] },
  { id: 'multi-step-fraction-stories', title: 'Two-step stories', shortTitle: 'Fraction stories', description: 'Solve a story in 2 steps.', skill: 'Find what the story asks first. Solve that step, then use the answer in the next step.', mode: 'story', n: 2, d: 5, context: 'community garden',
    // Idea 1: find what the story asks, then solve only its first step.
    ideaQuestions: [
      practice('A ribbon is 5/6 meter long. Cut off 1/6 meter, then 2/6 meter. How much is left? First, how long is it after the first cut?', ['4/6', '2/6', '6/6', '3/6'], 0,
        bars({ numerator: 5, denominator: 6 }, { numerator: 1, denominator: 6 }, { numerator: 2, denominator: 6 }), 'Do only the first step: take away the first cut.',
        '5/6 − 1/6 = 4/6 meter after the first cut. That answer starts the next step.', bars({ numerator: 5, denominator: 6 }, { numerator: 1, denominator: 6 }), { authoredChoices: true }),
      practice('Mia reads 2/8 of a book on Monday and 3/8 on Tuesday. How much is left to read? First, how much does she read in all?', ['5/8', '3/8', '5/16', '1/8'], 0,
        bars({ numerator: 2, denominator: 8 }, { numerator: 3, denominator: 8 }), 'Do only the first step: add the two days.',
        '2/8 + 3/8 = 5/8 read in all. That answer starts the next step.', bars({ numerator: 2, denominator: 8 }, { numerator: 3, denominator: 8 }), { authoredChoices: true }),
      practice('A jug has 4/6 liter. Sam drinks 1/6 liter, then adds 2/6 liter. How much is in the jug now? First, how much is left after Sam drinks?', ['3/6', '5/6', '7/6', '1/6'], 0,
        bars({ numerator: 4, denominator: 6 }, { numerator: 1, denominator: 6 }, { numerator: 2, denominator: 6 }), 'Do only the first step: take away what Sam drinks.',
        '4/6 − 1/6 = 3/6 liter left after Sam drinks. That answer starts the next step.', bars({ numerator: 4, denominator: 6 }, { numerator: 1, denominator: 6 }), { authoredChoices: true }),
    ],
  },
  // Unit 15 · Problem solving: the reasoning that Singapore, Beast Academy and Eureka lean on and quizzes skip.
  { id: 'find-the-whole', title: 'Find the whole', shortTitle: 'Find the whole', description: '3 is 1/4 of it. What is the whole?', skill: 'The known amount is some of the equal parts. Divide it by the numerator to find 1 part. Then multiply by the denominator to make the whole.', mode: 'whole-from-part', n: 1, d: 4, context: 'sticker packs', gradeBand: 5, standards: ['5.NF.7b'],
    example: { prompt: '3 stickers are 1/4 of a pack. How many stickers are in the pack?', answer: '12 stickers', explanation: '1/4 is 1 of 4 equal parts. Each part is 3. 4 parts of 3 is 12.', model: setModel(3, 12, 4) },
    // Idea 2: more than one part is known, so find one part first.
    ideaQuestions: [
      practice("6 stickers are 3/4 of Ana's stickers. How many stickers does Ana have?", ['8', '2', '24', '6'], 0, { kind: 'bars', bars: [{ numerator: 3, denominator: 4 }], hideLabels: true },
        '3 parts are 6 stickers. Find 1 part first. The whole has 4 parts.', '6 ÷ 3 = 2 stickers in 1 part. 4 parts: 2 × 4 = 8 stickers.', { kind: 'bars', bars: [{ numerator: 3, denominator: 4 }], hideLabels: false }, { authoredChoices: true }),
      practice('Tom read 8 pages. That is 2/3 of his book. How many pages are in the book?', ['12', '4', '24', '8'], 0, { kind: 'bars', bars: [{ numerator: 2, denominator: 3 }], hideLabels: true },
        '2 parts are 8 pages. Find 1 part first. The whole has 3 parts.', '8 ÷ 2 = 4 pages in 1 part. 3 parts: 4 × 3 = 12 pages.', { kind: 'bars', bars: [{ numerator: 2, denominator: 3 }], hideLabels: false }, { authoredChoices: true }),
      practice('A piece of ribbon is 6 meters long. It is 2/5 of the whole ribbon. How many meters long is the whole ribbon?', ['15', '3', '30', '6'], 0, { kind: 'bars', bars: [{ numerator: 2, denominator: 5 }], hideLabels: true },
        '2 parts are 6 meters. Find 1 part first. The whole has 5 parts.', '6 ÷ 2 = 3 meters in 1 part. 5 parts: 3 × 5 = 15 meters.', { kind: 'bars', bars: [{ numerator: 2, denominator: 5 }], hideLabels: false }, { authoredChoices: true }),
    ],
  },
  { id: 'spot-the-mistake', title: 'Spot the mistake', shortTitle: 'Spot the mistake', description: 'Is Sam right? Fix it.', skill: 'Check whether each step uses the right fraction rule. Find the first wrong step and correct it.', mode: 'mistake', n: 3, d: 4, context: 'homework check', gradeBand: 4, standards: ['4.NF.3a', '4.NF.2'],
    // Idea 1: is it right? Check against the rule (sometimes it is). Idea 2: which step goes wrong first.
    ideaQuestions: [
      practice('Kim says 5/6 − 2/6 = 3/6. Is that right?', ['No, it should be twelfths', 'No, 5 − 2 is not 3', 'Yes, sixths take away sixths leave sixths', 'Yes, she took away the bottoms too'], 2,
        bars({ numerator: 5, denominator: 6 }, { numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }), 'Check the rule: take away the numerators, keep the denominator.',
        '5 − 2 = 3, and the parts stay sixths. Kim is right: 5/6 − 2/6 = 3/6.', bars({ numerator: 5, denominator: 6 }, { numerator: 2, denominator: 6 }, { numerator: 3, denominator: 6 }), { authoredChoices: true }),
      practice('Sam says 2/5 + 1/5 = 3/10. Is that right?', ['No, the parts stay fifths', 'No, 2 + 1 is not 3', 'Yes, 5 + 5 = 10', 'Yes, he added the tops'], 0,
        bars({ numerator: 2, denominator: 5 }, { numerator: 1, denominator: 5 }, { numerator: 3, denominator: 10 }), 'Check the rule: add the numerators, keep the denominator.',
        'Fifths plus fifths make fifths: 2/5 + 1/5 = 3/5. Sam is not right.', bars({ numerator: 2, denominator: 5 }, { numerator: 1, denominator: 5 }, { numerator: 3, denominator: 10 }), { authoredChoices: true }),
      practice('Tim says 2 × 3/8 = 6/16. Is that right?', ['No, the parts stay eighths', 'No, 2 × 3 is not 6', 'Yes, he multiplied both numbers', 'Yes, 16 is 2 × 8'], 0,
        bars({ numerator: 3, denominator: 8 }, { numerator: 6, denominator: 16 }), 'Check the rule: a whole number times a fraction multiplies only the numerator.',
        'The parts stay eighths: 2 × 3/8 = 6/8. Tim is not right.', bars({ numerator: 3, denominator: 8 }, { numerator: 6, denominator: 16 }), { authoredChoices: true }),
      practice('Lee works out 1/5 + 2/5 + 1/5. Step 1: 1/5 + 2/5 = 3/5. Step 2: 3/5 + 1/5 = 4/10. Which is the first wrong step?', ['Step 2', 'Step 1', 'Both steps', 'No step is wrong'], 0,
        bars({ numerator: 1, denominator: 5 }, { numerator: 2, denominator: 5 }, { numerator: 1, denominator: 5 }), 'Check each step with the rule: add the numerators, keep the denominator.',
        'Step 1 keeps fifths: right. Step 2 changes fifths to tenths: wrong. It should be 3/5 + 1/5 = 4/5.', bars({ numerator: 3, denominator: 5 }, { numerator: 1, denominator: 5 }), { authoredChoices: true }),
      practice('Mo works out 2/8 + 3/8 + 1/8. Step 1: 2/8 + 3/8 = 6/8. Step 2: 6/8 + 1/8 = 7/8. Which is the first wrong step?', ['Step 1', 'Step 2', 'Both steps', 'No step is wrong'], 0,
        bars({ numerator: 2, denominator: 8 }, { numerator: 3, denominator: 8 }, { numerator: 1, denominator: 8 }), 'Check each step. Count the eighths in step 1.',
        'Step 1 is wrong: 2 + 3 = 5, so 2/8 + 3/8 = 5/8. Step 2 starts from that wrong answer.', bars({ numerator: 2, denominator: 8 }, { numerator: 3, denominator: 8 }), { authoredChoices: true }),
      practice('Ivy works out 4/6 − 1/6 + 2/6. Step 1: 4/6 − 1/6 = 3/6. Step 2: 3/6 + 2/6 = 5/6. Which is the first wrong step?', ['No step is wrong', 'Step 1', 'Step 2', 'Both steps'], 0,
        bars({ numerator: 4, denominator: 6 }, { numerator: 1, denominator: 6 }, { numerator: 2, denominator: 6 }), 'Check each step with the rule. Sometimes the work is right.',
        'Step 1: 4 − 1 = 3 sixths. Step 2: 3 + 2 = 5 sixths. Both keep sixths, so no step is wrong.', bars({ numerator: 4, denominator: 6 }, { numerator: 1, denominator: 6 }, { numerator: 2, denominator: 6 }), { authoredChoices: true }),
    ],
  },
  { id: 'fraction-of-remainder', title: 'Fraction of the rest', shortTitle: 'Fraction of the rest', description: 'Spend 1/3. Then spend 1/2 of the rest.', skill: 'First find how much is left. Then split that remaining amount and find the fraction asked for.', mode: 'remainder', n: 1, d: 3, context: 'pocket money', gradeBand: 5, standards: ['5.NF.6', '5.NF.2'],
    // Idea 1: what is left after the first part (a part of the rest comes in idea 2).
    ideaQuestions: [
      practice('Ana has 30 stickers. She gives 1/3 of them to Ben. How many stickers does Ana have left?', ['20', '10', '27', '40'], 0, setModel(0, 30, 3),
        'Find 1/3 of 30 first. Then take it away from 30.', '30 ÷ 3 = 10 stickers go to Ben. 30 − 10 = 20 stickers are left.', setModel(10, 30, 3), { authoredChoices: true }),
      practice('Max eats 1/4 of a pizza. What fraction of the pizza is left?', ['3/4', '1/4', '4/4', '1/3'], 0, { kind: 'area', cut: 'circle-fourths', shaded: [] },
        'The whole pizza is 4/4. Take away the part he eats.', '4/4 − 1/4 = 3/4 of the pizza is left.', { kind: 'area', cut: 'circle-fourths', shaded: [0] }, { authoredChoices: true }),
      practice('Ana has 20 stickers. She gives 2/5 of them to Ben. How many stickers does Ana have left?', ['12', '8', '18', '15'], 0, setModel(0, 20, 5),
        'Find 2/5 of 20 first. Then take it away from 20.', '20 ÷ 5 = 4, so 2/5 of 20 is 8. 20 − 8 = 12 stickers are left.', setModel(8, 20, 5), { authoredChoices: true }),
    ],
  },
  { id: 'divide-fractions', title: 'Bonus: Divide by a fraction', shortTitle: 'Bonus fraction ÷ fraction', description: 'How many 1/8s fit in 3/4?', skill: 'Division asks how many groups fit. Count how many parts of the given fraction fit in the amount.', example: { prompt: 'How many eighths fit in 3/4?', answer: '6 eighths', explanation: '3/4 is the same amount as 6/8. Each eighth is one of those parts. So 6 eighths fit in 3/4.', model: bars({ numerator: 3, denominator: 4, named: true }, { numerator: 6, denominator: 8 }) }, mode: 'divide-fractions', n: 3, d: 4, context: 'measuring scoops', enrichment: true,
    // Idea 1: unit-fraction scoops (rename, count); idea 2: the same written with ÷; idea 3: bigger scoops, count groups.
    ideaQuestions: [
      practice('How many 1/8 cup scoops fill 1/2 cup?', ['4', '8', '2', '1'], 0, { kind: 'bars', bars: [{ numerator: 1, denominator: 2 }], hideLabels: true },
        'Write 1/2 in eighths. Count how many 1/8 parts fit.', '1/2 = 4/8. Four 1/8 cup scoops fill 1/2 cup.', { kind: 'bars', bars: [{ numerator: 1, denominator: 2 }], hideLabels: false }, { authoredChoices: true }),
      practice('How many 1/6 cup scoops fill 1/2 cup?', ['3', '6', '2', '1'], 0, { kind: 'bars', bars: [{ numerator: 1, denominator: 2 }], hideLabels: true },
        'Write 1/2 in sixths. Count how many 1/6 parts fit.', '1/2 = 3/6. Three 1/6 cup scoops fill 1/2 cup.', { kind: 'bars', bars: [{ numerator: 1, denominator: 2 }], hideLabels: false }, { authoredChoices: true }),
      practice('3/5 ÷ 1/10 = ?', ['6', '30', '10', '3'], 0, { kind: 'bars', bars: [{ numerator: 3, denominator: 5 }], hideLabels: true },
        'Write 3/5 in tenths. Count how many 1/10 parts fit.', '3/5 = 6/10. Six 1/10 parts fit, so 3/5 ÷ 1/10 = 6.', { kind: 'bars', bars: [{ numerator: 3, denominator: 5 }], hideLabels: false }, { authoredChoices: true }),
      practice('6/10 ÷ 2/10 = ?', ['3', '6', '60', '10'], 0, { kind: 'bars', bars: [{ numerator: 6, denominator: 10 }], hideLabels: true },
        'Count the tenths in 6/10. Then make groups of 2 tenths.', '6 tenths make 3 groups of 2 tenths, so 6/10 ÷ 2/10 = 3.', { kind: 'bars', bars: [{ numerator: 6, denominator: 10 }], hideLabels: false }, { authoredChoices: true }),
      practice('How many 2/6 cup scoops fill 2/3 cup?', ['2', '12', '3', '6'], 0, { kind: 'bars', bars: [{ numerator: 2, denominator: 3 }], hideLabels: true },
        'Write 2/3 in sixths. Then count groups of 2 sixths.', '2/3 = 4/6. 4 sixths make 2 groups of 2 sixths, so 2 scoops fill 2/3 cup.', { kind: 'bars', bars: [{ numerator: 2, denominator: 3 }], hideLabels: false }, { authoredChoices: true }),
    ],
  },
  // Second lessons for standards that had one (approved mockups, November 2026).
  { id: 'dimes-and-pennies', title: 'Dimes and pennies', shortTitle: 'Dimes and pennies', description: 'Write dimes and pennies as hundredths of a dollar.',
    skill: 'A dime is 1/10 of a dollar, which is 10 hundredths. A penny is 1/100. Write dimes as hundredths, then add the pennies.',
    example: { prompt: '3 dimes and 4 pennies. What part of a dollar is that?', answer: '34/100',
      explanation: '3 dimes fill 3 columns: 30/100. 4 pennies fill 4 more squares: 4/100. Together: 34/100 of a dollar.',
      model: grids(hundredthsGrid(34, '3 dimes and 4 pennies')) },
    mode: 'coins', n: 34, d: 100, context: 'coins', gradeBand: 4, standards: ['4.NF.5'],
    questions: [
      practice('Chomp has 6 dimes. What part of a dollar is that, in hundredths?', ['60/100', '6/100', '60/10', '600/100'], 0, coins(6, 0),
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
    ],
    ideaQuestions: [
      // Idea 1: a dollar is 100 pennies, so a penny is 1 hundredth (no dimes yet).
      practice('Pip has 7 pennies. What part of a dollar is that?', ['7/100', '7/10', '1/7', '93/100'], 0, coins(0, 7),
        'A dollar is 100 pennies. Each penny is 1/100 of a dollar.', '7 pennies are 7 hundredths of a dollar: 7/100.', grids(hundredthsGrid(7)), { authoredChoices: true }),
      practice('How many pennies make one dollar?', ['100', '10', '1', '50'], 0, coins(0, 1),
        'Each penny is 1/100 of a dollar.', '100 pennies make one dollar, so each penny is 1/100 of a dollar.', grids(hundredthsGrid(1)), { authoredChoices: true }),
      practice('Chomp has 9 pennies. What part of a dollar is that?', ['9/100', '9/10', '1/9', '91/100'], 0, coins(0, 9),
        'Each penny is 1/100 of a dollar. Count the pennies.', '9 pennies are 9 hundredths of a dollar: 9/100.', grids(hundredthsGrid(9)), { authoredChoices: true }),
      // Idea 2: a dime is 10 pennies, so 10 hundredths.
      practice('Pip has 3 dimes. What part of a dollar is that, in hundredths?', ['30/100', '3/100', '30/10', '300/100'], 0, coins(3, 0),
        'Each dime is 10 hundredths of a dollar.', '3 dimes are 3 × 10 = 30 hundredths: 30/100.', grids(hundredthsGrid(30)), { authoredChoices: true }),
      // Idea 3: add the dimes and the pennies.
      practice('4 dimes and 6 pennies. What part of a dollar is that?', ['46/100', '10/100', '406/100', '64/100'], 0, coins(4, 6),
        'Change the dimes to hundredths first. Then add the pennies.', '4 dimes are 40/100. 6 pennies are 6/100. Together: 46/100.', grids(hundredthsGrid(46)), { authoredChoices: true }),
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
    ],
    // Idea questions (ideas/lessons-41-50.ts): one X for each length (p1–p3), stacks (p4), reading the plot (p5).
    ideaQuestions: [
      practice('Pins: 2/8, 5/8, 7/8 inch. Plot them. How many Xs did you put on the plot?', ['3', '2', '7', '8'], 0,
        plotTask([2, 5, 7]), 'Put one X above each pin’s length. Then count the Xs.', '3 pins, so 3 Xs: one at 2/8, one at 5/8 and one at 7/8.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 5, 7] }, { authoredChoices: true }),
      practice('A twig is 5/8 inch. Plot it. How many eighths from 0 is its X?', ['5', '8', '3', '6'], 0,
        plotTask([5]), 'Count the eighths from 0 to the twig’s length.', 'The X goes above 5/8: 5 eighths from 0.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [5] }, { authoredChoices: true }),
      practice('Beads: 1/8, 4/8, 6/8 inch. Plot them. Which bead’s X is farthest from 0?', ['6/8 inch', '1/8 inch', '4/8 inch', '8/8 inch'], 0,
        plotTask([1, 4, 6]), 'A longer bead’s X is farther from 0. Which length is the most eighths?', '6/8 is the most eighths, so its X is farthest from 0.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 4, 6] }, { authoredChoices: true }),
      practice('Shells: 3/8, 3/8, 3/8, 6/8 inch. Plot them. How many Xs stack at 3/8?', ['3', '1', '4', '2'], 0,
        plotTask([3, 3, 3, 6]), 'One X for each shell. Shells with the same length stack on the same spot.', '3 shells are 3/8 inch, so 3 Xs stack at 3/8.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [3, 3, 3, 6] }, { authoredChoices: true }),
      practice('Leaves: 1/8, 2/8, 6/8, 6/8 inch. Plot them. How many leaves are shorter than 4/8 inch?', ['2', '4', '3', '1'], 0,
        plotTask([1, 2, 6, 6]), 'Find 4/8 on the plot. Count the Xs to its left.', '1/8 and 2/8 are left of 4/8. That is 2 leaves.',
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [1, 2, 6, 6] }, { authoredChoices: true }),
    ],
  },
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
    ],
    // Idea questions (ideas/lessons-41-50.ts): count the parts in every portion (p1), the two whole numbers (p2).
    ideaQuestions: [
      practice('Each guest eats 2/5 pound. 3 guests. How much in all?', ['6/5 pounds', '6/15 pound', '5/5 pound', '2/15 pound'], 0,
        bars(...Array.from({ length: 3 }, () => ({ numerator: 2, denominator: 5 }))), 'Count the fifths in all 3 groups. The part size stays fifths.',
        '3 groups of 2 fifths is 6 fifths: 6/5 pounds.', line(6, 5, 2), { authoredChoices: true }),
      practice('Each racer drinks 3/4 cup. 5 racers. Between which two whole numbers is the total?', ['3 and 4', '2 and 3', '4 and 5', '15 and 16'], 0,
        bars(...Array.from({ length: 5 }, () => ({ numerator: 3, denominator: 4 }))), 'Count all the fourths. How many fourths make one whole?',
        '5 groups of 3 fourths is 15 fourths. 12 fourths make 3 wholes, and 16 make 4. So 15/4 is between 3 and 4.', line(15, 4, 4), { authoredChoices: true }),
    ],
  },
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
    ],
    ideaQuestions: [
      // Idea 1: change a mixed number of big units into small units.
      practice('How many inches are in 1 1/2 feet?', ['18 inches', '12 inches', '6 inches', '24 inches'], 0,
        bars({ numerator: 2, denominator: 2 }, { numerator: 1, denominator: 2 }), 'Each foot is 12 inches. Half a foot is 6 inches.',
        '1 foot is 12 inches and 1/2 foot is 6 inches. 12 + 6 = 18 inches.', bars({ numerator: 2, denominator: 2 }, { numerator: 1, denominator: 2 }), { authoredChoices: true }),
      practice('How many minutes are in 1 1/4 hours?', ['75 minutes', '60 minutes', '15 minutes', '85 minutes'], 0,
        bars({ numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 }), 'An hour is 60 minutes. 1/4 hour is 60 ÷ 4 minutes.',
        '1 hour is 60 minutes and 1/4 hour is 15 minutes. 60 + 15 = 75 minutes.', bars({ numerator: 4, denominator: 4 }, { numerator: 1, denominator: 4 }), { authoredChoices: true }),
      practice('How many ounces are in 1 1/2 pounds?', ['24 ounces', '16 ounces', '8 ounces', '32 ounces'], 0,
        bars({ numerator: 2, denominator: 2 }, { numerator: 1, denominator: 2 }), 'A pound is 16 ounces. Half a pound is 8 ounces.',
        '1 pound is 16 ounces and 1/2 pound is 8 ounces. 16 + 8 = 24 ounces.', bars({ numerator: 2, denominator: 2 }, { numerator: 1, denominator: 2 }), { authoredChoices: true }),
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
    ],
    ideaQuestions: [
      // Idea 1: add the amount for every X.
      practice('The line plot shows juice in 4 cups: 1/4, 3/4, 3/4, 3/4 liter. How much juice in all?', ['2 2/4 liters', '1 liter', '10/16 liter', '4 liters'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 3, 3, 3] }, 'Add the amount for every X. Three Xs at 3/4 count three times.',
        '1 + 3 + 3 + 3 = 10 fourths: 10/4, or 2 2/4 liters.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 3, 3, 3] }, { authoredChoices: true }),
      // Idea 2: how much more one stack holds.
      practice('The line plot shows juice in 5 cups: 1/4, 1/4, 3/4, 3/4, 3/4 liter. How much more do all the 3/4 cups hold together than all the 1/4 cups together?', ['1 3/4 liters', '2/4 liter', '2 1/4 liters', '2 3/4 liters'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 1, 3, 3, 3] }, 'Add up each stack first. Then take away.',
        'The three 3/4 cups hold 9/4. The two 1/4 cups hold 2/4. 9/4 − 2/4 = 7/4, or 1 3/4 liters.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [1, 1, 3, 3, 3] }, { authoredChoices: true }),
      practice('The line plot shows water in 5 beakers: 2/8, 2/8, 2/8, 6/8, 6/8 liter. How much more do all the 6/8 beakers hold together than all the 2/8 beakers together?', ['6/8 liter', '4/8 liter', '1 4/8 liters', '2 2/8 liters'], 0,
        { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 2, 2, 6, 6] }, 'Add up each stack first. Then take away.',
        'The two 6/8 beakers hold 12/8. The three 2/8 beakers hold 6/8. 12/8 − 6/8 = 6/8 liter.', { kind: 'lineplot', denominator: 8, wholes: 1, values: [2, 2, 2, 6, 6] }, { authoredChoices: true }),
      // Idea 3: rename halves as fourths, then add.
      practice('The line plot shows rain on 3 days: 1/2, 1/4, 3/4 inch. How much rain in all?', ['1 2/4 inches', '5/10 inch', '1 1/4 inches', '3/4 inch'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [2, 1, 3] }, 'Change the half to fourths. Then add every X.',
        '1/2 = 2/4. 2 + 1 + 3 = 6 fourths: 6/4, or 1 2/4 inches.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [2, 1, 3] }, { authoredChoices: true }),
      practice('The line plot shows how far 3 snails crawled: 1/2, 1/2, 1/4 inch. How far did they crawl in all?', ['1 1/4 inches', '3/8 inch', '3/4 inch', '1/2 inch'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [2, 2, 1] }, 'Change the halves to fourths. Then add every X.',
        '1/2 = 2/4. 2 + 2 + 1 = 5 fourths: 5/4, or 1 1/4 inches.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [2, 2, 1] }, { authoredChoices: true }),
      practice('The line plot shows water in 4 cups: 1/2, 1/2, 1/2, 3/4 liter. How much water in all?', ['2 1/4 liters', '6/10 liter', '1 2/4 liters', '1 1/4 liters'], 0,
        { kind: 'lineplot', denominator: 4, wholes: 1, values: [2, 2, 2, 3] }, 'Change the halves to fourths. Then add every X.',
        '1/2 = 2/4. 2 + 2 + 2 + 3 = 9 fourths: 9/4, or 2 1/4 liters.', { kind: 'lineplot', denominator: 4, wholes: 1, values: [2, 2, 2, 3] }, { authoredChoices: true }),
    ] },
];

const picture = (top: number, bottom: number): ModelSpec => ({ kind: 'bars', bars: [{ numerator: top, denominator: bottom }], hideLabels: true });
/** A picture for a worksheet problem: its own model, else the first amount in the question. Never the answer. */
export function problemPicture(problem: WorksheetProblem): ModelSpec {
  const m = problem.model;
  // An empty picture: the wholes cut into equal pieces, nothing shaded yet (sharing questions).
  if (m && m.n === 0) return { kind: 'bars', bars: Array.from({ length: m.wholes }, () => ({ numerator: 0, denominator: m.d })), hideLabels: true };
  // The measuring tools the question talks about come first: the line plot, the ruler, the grid.
  // "Plot these…": the plot starts empty and the child taps on the Xs before answering.
  if (problem.linePlotTask) return { kind: 'lineplot', ...problem.linePlotTask, ...(/^Plot /.test(problem.prompt) ? { plotTask: true } : {}) };
  // A garden question: the garden drawn to scale (its bars would only show the two side lengths, not the area).
  // A line plot to read: its values are only in the plot.
  if (problem.picture?.kind === 'garden' || problem.picture?.kind === 'lineplot') return problem.picture;
  // Ruler questions: the ruler and the blue strip the question talks about.
  if (problem.rulerTask) return { kind: 'ruler', ...problem.rulerTask };
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
  const mixed = /(?<![\d/])(\d+) (?:and )?(\d+)\/(\d+)/.exec(problem.prompt);
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

/** Wrong lengths a child really reads off a ruler: one space short, or one long (counting the tick marks, not the
    spaces). In the ruler's own parts, never eighths or sixteenths on a fourths ruler. */
function rulerDistractors({ end, denominator: d }: { end: number; denominator: number }): string[] {
  const name = (ticks: number) => { const whole = Math.floor(ticks / d); const part = ticks % d;
    return whole && part ? `${whole} ${part}/${d}` : whole ? String(whole) : `${part}/${d}`; };
  return [end + 1, end > 1 ? end - 1 : end + 2].map(name);
}

/** A tap question made from a worksheet problem, with the right answer at `position`. */
export function problemQuestion(problem: WorksheetProblem, position: number): PracticeSeed {
  const choices = problem.rulerTask ? rulerDistractors(problem.rulerTask) : [...choiceDistractors(problem.answer)];
  choices.splice(position % 3, 0, problem.answer);
  const model = problemPicture(problem);
  const simpler = 'hideLabels' in model ? { ...model, hideLabels: false } : model;
  // The explanation shows after a right answer, so it adds the answer to the hint instead of repeating it.
  // A check ("Check: 20 × 1/5 = 4.") comes after the answer.
  return practice(asChoicePrompt(problem.prompt), choices, position % 3, model, problem.hint, problem.explain ?? `${problem.hint} So the answer is ${problem.answer}.${problem.why ? ` ${problem.why}` : ''}`, simpler);
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
    ...(topic.ideaQuestions ? { ideaQuestions: topic.ideaQuestions } : {}),
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
  1: ['fraction-names', 'equal-parts', 'unit-fractions', 'fraction-of-area'],
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
/** Units the "Find my level" quiz covers (placement.ts re-exports it). A child who passes them all starts at the next unit,
    so the last start unit that can be saved is PLACEMENT_UNITS + 1. */
export const PLACEMENT_UNITS = 12;
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
const COURSE_IDS = course.map((lesson) => lesson.id);
if (course.length !== Object.values(LESSON_PLAN).flat().length) throw new Error('LESSON_PLAN must list every lesson exactly once');

export const MISSIONS: Mission[] = course.map((seed) => mission(seed));

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

/** One of a lesson's questions: its own, or one written for one of its ideas. */
const isLessonQuestion = (missionId: string, questionId: string) => {
  const mission = getMission(missionId);
  return [...mission.questions, ...(mission.ideaQuestions ?? [])].some((question) => question.id === questionId);
};

export function recordMissedSkill(
  progress: Progress,
  missionId: string,
  questionId: string,
  now = Date.now(),
): Progress {
  const queued = progress.reviewQueue.find((item) => item.missionId === missionId);
  // A lesson already in the queue (finished, or missed before) keeps its place and step; it is only marked as missed.
  if (queued) {
    if (isMissedEntry(queued)) return progress;
    return { ...progress, reviewQueue: progress.reviewQueue.map((item) => (item === queued ? { ...item, missed: true } : item)) };
  }
  if (!isLessonQuestion(missionId, questionId)) throw new Error(`Unknown question for skill review: ${questionId}`);
  return {
    ...progress,
    reviewQueue: [
      ...progress.reviewQueue,
      { missionId, missedQuestionId: questionId, dueAt: now + SKILL_REVIEW_DELAY_MS, reviewCount: 0, missed: true },
    ],
  };
}

/** Is this queue entry a skill the child got wrong (not just a lesson that was finished and is due its 1, 3 and 7 day look)? */
export function isMissedEntry(item: SkillReview): boolean {
  return item.missed === true || item.missedQuestionId !== getMission(item.missionId).questions[0]?.id;
}

/** A finished lesson was revisited (a review item inside a new lesson, a Daily Practice question, a Quick skill review). */
export function recordLessonSeen(progress: Progress, missionId: string, correctFirstTime: boolean, now = Date.now()): Progress {
  if (!MISSIONS.some((item) => item.id === missionId)) return progress;
  return { ...progress, lessonSeen: { ...progress.lessonSeen, [missionId]: afterRevisit(progress.lessonSeen?.[missionId], correctFirstTime, now) } };
}

/** Everything the revisit rule needs to know about each finished lesson. */
export function revisitCandidates(progress: Progress): RevisitCandidate[] {
  return MISSIONS.flatMap((mission, order): RevisitCandidate[] => {
    if (!progress.completedMissionIds.includes(mission.id)) return [];
    const record = progress.learning?.[mission.id];
    const misses = Object.values(record?.misconceptions ?? {}).reduce((sum, count) => sum + count, 0);
    return [{ id: mission.id, order, completedAt: record?.completedAt, seen: progress.lessonSeen?.[mission.id],
      weak: (progress.starsByMission[mission.id] ?? 3) <= 1 || misses > 0 }];
  });
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
  return recordLessonSeen({ ...progress, reviewQueue }, missionId, true, now);
}

export function deferSkillReview(progress: Progress, missionId: string, now = Date.now()): Progress {
  const reviewQueue = progress.reviewQueue.map((item) => item.missionId === missionId
    ? { ...item, dueAt: now + SKILL_REVIEW_DELAY_MS, reviewCount: item.reviewCount + 1 }
    : item);
  return { ...progress, reviewQueue };
}

/** A review item inside a lesson was answered right first time: it is looked at again tomorrow, and the lesson moves up
    one revisit interval. (Skipped or missed ones only go through deferSkillReview, so they come back sooner.) */
export function finishLessonReview(progress: Progress, missionId: string, now = Date.now()): Progress {
  return recordLessonSeen(deferSkillReview(progress, missionId, now), missionId, true, now);
}

function toReviewQuestion(item: SkillReview): PracticeQuestion[] {
  const topic = getMission(item.missionId);
  const alternatives = topic.questions.filter((question) =>
    !question.isMastery && !question.isReview && question.id !== item.missedQuestionId,
  );
  if (alternatives.length === 0) return [];

  return [asReviewQuestion(item, alternatives[item.reviewCount % alternatives.length])];
}

function asReviewQuestion(item: SkillReview, variant: PracticeQuestion): PracticeQuestion {
  const topic = getMission(item.missionId);
  const choiceOffset = variant.choices.length > 1 ? (item.reviewCount + 1) % variant.choices.length : 0;
  const choices = variant.choices.map((_, index) => variant.choices[(index + choiceOffset) % variant.choices.length]);
  const correctChoice = (variant.correctChoice - choiceOffset + variant.choices.length) % variant.choices.length;
  return {
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
  };
}

/** The review question a "delayed-<lesson>-<count>-<question>" id names, rebuilt from the lesson data (the browser tests
    use it to answer whichever earlier-lesson item a lesson's "Put it together" asks). */
export function reviewQuestionFromId(id: string): PracticeQuestion | undefined {
  const mission = [...MISSIONS].sort((a, b) => b.id.length - a.id.length).find((item) => id.startsWith(`delayed-${item.id}-`));
  if (!mission) return undefined;
  const [, count, variantId] = id.slice(`delayed-${mission.id}-`.length).match(/^(\d+)-(.+)$/) ?? [];
  const variant = mission.questions.find((question) => question.id === variantId);
  return variant ? asReviewQuestion({ missionId: mission.id, missedQuestionId: mission.questions[0]!.id, dueAt: 0, reviewCount: Number(count) }, variant) : undefined;
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

/** What a new lesson brings back from earlier lessons, after its checkpoint: a skill the child got wrong that is due (at most
    one), then ONE item from the finished lesson that is most overdue for its own interval (1, 3, 7, 14 days; see
    review-schedule.ts). That second one is chosen from every finished lesson, so a child with no mistakes meets an
    earlier skill in each new lesson too. */
export function getDelayedReviewQuestions(
  progress: Progress,
  currentMissionId: string,
  now = Date.now(),
): PracticeQuestion[] {
  const missed = getDueSkillReviews(progress, now)
    .filter((item) => item.missionId !== currentMissionId && isMissedEntry(item))
    .slice(0, 1);
  const taken = new Set([currentMissionId, ...missed.map((item) => item.missionId)]);
  // The lesson most overdue, due or not (so every new lesson has one), but never one already seen today.
  const [warmUp] = byOverdue(revisitCandidates(progress).filter((candidate) => !taken.has(candidate.id)
    && (candidate.seen?.at ?? candidate.completedAt ?? 0) < startOfDay(now)), now);
  const seen = warmUp ? progress.lessonSeen?.[warmUp] : undefined;
  return [
    ...missed.flatMap(toReviewQuestion),
    // Each revisit asks a different question of the lesson (and the same one until the child has answered).
    ...(warmUp ? toReviewQuestion({ missionId: warmUp, missedQuestionId: getMission(warmUp).questions[0].id, dueAt: now,
      reviewCount: seen?.v ?? 0 }) : []),
  ];
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
/** The row's question changed since this answer was saved (a lesson update gave it new numbers): the answer was
    saved for a different answer, or (saved before answers remembered that) it was checked right but the question
    now marks it wrong. Such an answer is dropped, so the row starts blank. */
export function changedQuestion(problem: WorksheetProblem, entry: { draft: string; checkedValue?: unknown; for?: unknown }): boolean {
  if (typeof entry.for === 'string') return entry.for !== problem.answer;
  return typeof entry.checkedValue === 'string' && entry.checkedValue === entry.draft && !!entry.draft.trim() && !answerMatches(problem, entry.draft);
}
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
  'unit-fraction-divided-whole', 'divide-whole-by-unit-fraction', 'share-or-fit',
  // Lesson 1 until reading a fraction moved in front of it ("Fair parts and fraction names" is lesson 1 now).
  'equal-parts']);
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
          || !isLessonQuestion(item.missionId, item.missedQuestionId)
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
          ...(item.missed === true ? { missed: true } : {}),
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
          if (entry && typeof entry.draft === 'string' && !staleDraft(problem, entry.draft) && !changedQuestion(problem, entry)) worksheet[problem.id] = {
            draft: entry.draft.slice(0, 200), checkedValue: typeof entry.checkedValue === 'string' ? entry.checkedValue.slice(0, 200) : undefined,
            wrongValue: typeof entry.wrongValue === 'string' ? entry.wrongValue.slice(0, 200) : undefined,
            attempts: safeCount(entry.attempts), supported: entry.supported !== false,
            ...(typeof entry.for === 'string' ? { for: entry.for.slice(0, 200) } : {}),
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
          if (entry && typeof entry.draft === 'string' && !staleDraft(problem, entry.draft) && !changedQuestion(problem, entry)) worksheet[problem.id] = {
            draft: entry.draft.slice(0, 200), checkedValue: typeof entry.checkedValue === 'string' ? entry.checkedValue.slice(0, 200) : undefined,
            wrongValue: typeof entry.wrongValue === 'string' ? entry.wrongValue.slice(0, 200) : undefined,
            attempts: safeCount(entry.attempts), supported: entry.supported !== false,
            ...(typeof entry.for === 'string' ? { for: entry.for.slice(0, 200) } : {}),
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
            ? { index: Math.max(0, Math.min(50, (raw.practiceAt as { index: number }).index)), firstTry: Math.max(0, Math.min(50, (raw.practiceAt as { firstTry: number }).firstTry)),
              ...(typeof (raw.practiceAt as { plan?: unknown }).plan === 'string' ? { plan: (raw.practiceAt as { plan: string }).plan.slice(0, 40) } : {}) }
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
    const lessonSeen: Record<string, LessonSeen> = {};
    if (value.lessonSeen && typeof value.lessonSeen === 'object') {
      for (const [id, raw] of Object.entries(value.lessonSeen)) {
        const seen = raw as Partial<LessonSeen> | null;
        if (!validIds.has(id) || !seen || typeof seen !== 'object' || typeof seen.at !== 'number' || !Number.isFinite(seen.at)
          || typeof seen.n !== 'number' || !Number.isInteger(seen.n)) continue;
        lessonSeen[id] = { at: seen.at, n: Math.max(0, Math.min(REVISIT_STEPS - 1, seen.n)), ...(seen.shaky === true ? { shaky: true } : {}),
          ...(typeof seen.v === 'number' && Number.isInteger(seen.v) && seen.v > 0 ? { v: Math.min(seen.v, 1000) } : {}) };
      }
    }
    const knownStandards = new Set<string>(FRACTION_STANDARDS.map(item => item.id));
    const readResponses = (raw: unknown[]): AssessmentResponse[] => {
      const responses: AssessmentResponse[] = [];
      for (const rawResponse of raw) {
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
      return responses;
    };
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
      const responses = readResponses(attempt.responses);
      if (responses.length >= 10) assessments.push({
        assessmentId: attempt.assessmentId, seed: attempt.seed, startedAt: attempt.startedAt,
        completedAt: attempt.completedAt, responses,
      });
    }
    let assessmentDraft: AssessmentDraft | null = null;
    const draft = value.assessmentDraft as Partial<AssessmentDraft> | undefined;
    if (draft && typeof draft === 'object' && typeof draft.assessmentId === 'string' && knownAssessmentId(draft.assessmentId)
      && typeof draft.seed === 'number' && Number.isSafeInteger(draft.seed) && typeof draft.startedAt === 'number' && Number.isFinite(draft.startedAt)
      && Array.isArray(draft.responses) && draft.responses.length > 0 && draft.responses.length < 15) {
      const responses = readResponses(draft.responses);
      if (responses.length === draft.responses.length) assessmentDraft = { assessmentId: draft.assessmentId, seed: draft.seed, startedAt: draft.startedAt, responses };
    }
    const grownUpPicks: GrownUpPick[] = [];
    if (Array.isArray(value.grownUpPicks)) {
      for (const raw of value.grownUpPicks.slice(-MAX_GROWN_UP_PICKS)) {
        if (!raw || typeof raw !== 'object' || typeof raw.at !== 'number' || !Number.isFinite(raw.at)) continue;
        const valid = raw.kind === 'practice' ? validIds.has(raw.id) : raw.kind === 'checkin' && typeof raw.id === 'string' && knownAssessmentId(raw.id);
        if (!valid || grownUpPicks.some((pick) => pick.kind === raw.kind && pick.id === raw.id)) continue;
        const whole = (value: unknown, max: number) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= max;
        grownUpPicks.push({ kind: raw.kind, id: raw.id, at: raw.at,
          ...(whole(raw.seed, Number.MAX_SAFE_INTEGER) ? { seed: raw.seed } : {}),
          ...(whole(raw.index, GROWN_UP_PRACTICE_COUNT - 1) ? { index: raw.index } : {}),
          ...(whole(raw.firstTry, GROWN_UP_PRACTICE_COUNT) ? { firstTry: raw.firstTry } : {}) });
      }
    }
    return {
      completedMissionIds: [...completed],
      starsByMission,
      reviewQueue,
      ...(Object.keys(learning).length ? { learning } : {}),
      ...(Object.keys(challengeBest).length ? { challengeBest } : {}),
      ...(Object.keys(adaptiveStandards).length ? { adaptiveStandards } : {}),
      ...(adaptationLog.length ? { adaptationLog } : {}),
      ...(Object.keys(lessonSeen).length ? { lessonSeen } : {}),
      ...(dailyPractice ? { dailyPractice } : {}),
      assessments,
      ...(value.placement && typeof value.placement === 'object' && Number.isInteger(value.placement.unit) && value.placement.unit >= 2 && value.placement.unit <= PLACEMENT_UNITS + 1
        && typeof value.placement.at === 'number' && Number.isFinite(value.placement.at) ? { placement: { unit: value.placement.unit, at: value.placement.at } } : {}),
      ...(grownUpPicks.length ? { grownUpPicks } : {}),
      ...(assessmentDraft ? { assessmentDraft } : {}),
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
