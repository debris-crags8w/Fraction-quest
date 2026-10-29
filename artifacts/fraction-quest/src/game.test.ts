import { withoutUnit } from './measure-units';
import { retryOpener, wrongChoiceReason } from './wrong-answer';
import { WHY } from './slip-reasons';
import { LESSON_INTROS } from './lesson-intros';
import { REASON_SLIPS } from './reason-slips';
import { misconceptionWrongs } from './misconceptions';
import { fractionMistakes } from './fraction-slips';
import { ideaQuestion, ideaSteps, isRound, lessonIdeas } from './lesson-ideas';
import { storyProblemFor } from './story';
import { fourthChoice, noBeforeYes, withSignComparisons } from './fourth-choice';
import { answerValue } from './learning-content';
import { readFileSync } from 'node:fs';
import { pickVoice, sayFraction, sentences, spokenText } from './lib/voice';
import { AREA_CUTS, allEqual, areaFeedback, areaTaskDone, areaWhole, circleCut, cutTotal, pieceArea, shadedArea } from './area-shapes';
import { amountsIn } from './auto-picture';
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import * as React from 'react';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHALLENGES, challengeMaxPoints } from './challenges';
import { FunContext, promptListenText, splitStory, StoryPrompt } from './fun-ui';
import CodeQuest from './CodeQuest';
import { buildParentReport } from './parent-report';
import { ideaForMission } from './parent-ideas';
import { createNaturalSpeaker, isIOSVoiceDevice, naturalVoicePreference, naturalVoiceStatus, setNaturalEngineForTests, setNaturalVoicePreference } from './lib/natural-voice';
import { applyPlacement, placementItems, PLACEMENT_UNITS, startUnit } from './placement';
import { buildAssessmentItems, getAssessmentDefinitions } from './assessments';
import { applyAnswer, newRacer, RACE_GOAL, raceStars, ROBOT_LEVELS } from './FractionRace';
import { makeSprint, SPRINT_ROUNDS } from './CodeSprint';
import { CODE_LEVEL_COUNT, describe as describeRun, getCodeLevels, getRunHint, makeMultiBug, matchesTarget, passesCodeLevel, predictionMatchesTarget, runProgram, solution, toText, usesEffectiveLoop, usesLoop, type Block } from './code-quest';
import { codeExamples, exampleStepInstruction, summarizeCodeProgress } from './code-progress';
import { loadFun, recordCodeLevel, recordCorrect, recordMinute, recordPartFinder, resetMissionGameProgress, shownStreak } from './lib/fun';
import { isPartFinderAnswer, PART_FINDER_LESSONS, PART_FINDER_ROUNDS, partFinderRoundsFor, partFinderFeedback, partFinderSelectionArea, scorePartFinderRound } from './part-finder';
import { generateQuestions, getExtraPractice, hasGenerator, makeRng } from './practice-bank';
import { applyAdaptiveDailyPracticeUpdate, createDailyPractice, dailyBuildCorrect, dailyChoiceQuestion, dailyPracticeDay, DAILY_PRACTICE_LENGTH, recordDailyPracticeStart } from './daily-practice';
import { FRACTION_STANDARDS } from './standard-catalog';
import { DailyPracticeQuestionHeading } from './DailyPracticeQuestionHeading';
import type { PracticeQuestion } from './game';
import { REASON_IDEAS, answerMatches, asChoicePrompt, getBuildCheckStage, getBuildChecks, getBuildPracticeChecks, getModelFeedback, getReasonFeedback, getReviewCheck, getWorksheet, isYesNoProblem, paperPrompt, parseAnswer, yesNoPrompt } from './learning-content';
import { AnswerTiles } from './AnswerTiles';
import {
  createLearningSpeechController,
  LearningVoicePicker,
  LearningTextSection,
  LearningText,
  selectLearningVoice,
  subscribeToSpeechVoices,
  spokenLearningText,
} from './LearningText';
import { BarSvg } from './models';
import Printable, { AnswerKey, PrintMenu, STUDENT_PRINT_OPTIONS } from './Printables';
import { barTaskDone, canEnterWorksheetAnswer, WorksheetBarCopy, worksheetBarMatches } from './WorksheetBarCopy';
import { checkRedoRow, checkWorksheet, editWorksheet, emptyLearningRecord, finishRedo, getLearningRecord, hasLearningGate, lessonSteps, redoChecks, redoDone, redoWorksheet, redoWorksheetCount, resetUnitLearningProgress, startRedo, targetedPracticePlans, updateLearning, worksheetCount, type LearningRecord } from './learning';
import QuickReviewEntry from './QuickReviewEntry';
import {
  completeMission,
  completeSkillReview,
  countsTowardLessonStars,
  deferSkillReview,
  EMPTY_PROGRESS,
  FRACTION_ORDER_ROUNDS,
  fractionOrderMatches,
  getMission,
  getDelayedReviewQuestions,
  getDueSkillReviewCount,
  getDueSkillReviewQuestions,
  getNextMission,
  isCorrectAnswer,
  isMissionUnlocked,
  LATE_ADDED_LESSONS,
  areaFigures,
  LESSON_PLAN,
  EXTENSION_LESSON_IDS,
  staleDraft,
  loadProgress,
  nameBars,
  courseCounts,
  MISSIONS,
  numberLineWholeCount,
  recordMissedSkill,
  resetProgress,
  sameFractionValue,
  saveProgress,
  setModelLayout,
  SKILL_REVIEW_DELAY_MS,
  starsFromFirstTryAnswers,
  type ModelSpec,
  type Progress,
} from './game';

describe('lesson star scoring', () => {
  it('counts authored lesson questions but excludes extra-bank and optional-review questions', () => {
    const eligibleIds = new Set(['lesson-q1', 'lesson-q2', 'lesson-q3']);
    const answered = [
      { id: 'lesson-q1', isOptionalReview: false },
      { id: 'bank-q1', isOptionalReview: false },
      { id: 'review-q1', isOptionalReview: true },
      { id: 'lesson-q2', isOptionalReview: false },
      { id: 'lesson-q3', isOptionalReview: false },
    ];
    const firstTryCount = answered.filter((question) => countsTowardLessonStars(question, eligibleIds)).length;

    assert.equal(firstTryCount, 3);
    assert.equal(starsFromFirstTryAnswers(firstTryCount, eligibleIds.size), 3);
  });

  it('keeps the 1/2/3-star cutoffs tied to the required lesson questions', () => {
    assert.equal(starsFromFirstTryAnswers(2, 5), 1);
    assert.equal(starsFromFirstTryAnswers(4, 5), 2);
    assert.equal(starsFromFirstTryAnswers(5, 5), 3);
    assert.equal(starsFromFirstTryAnswers(9, 5), 3);
  });
});

describe('fraction ordering activity', () => {
  it('compares equivalent fractions exactly rather than by rounded percent', () => {
    assert.equal(sameFractionValue({ numerator: 1, denominator: 4 }, { numerator: 2, denominator: 8 }), true);
    assert.equal(sameFractionValue({ numerator: 1, denominator: 2 }, { numerator: 2, denominator: 4 }), true);
    assert.equal(sameFractionValue({ numerator: 1, denominator: 3 }, { numerator: 33, denominator: 100 }), false);
    assert.equal(sameFractionValue({ numerator: 1, denominator: 0 }, { numerator: 1, denominator: 1 }), false);
  });

  it('checks smallest-to-biggest and biggest-to-smallest sorts exactly', () => {
    assert.equal(fractionOrderMatches(FRACTION_ORDER_ROUNDS[0].cards.slice(1).concat(FRACTION_ORDER_ROUNDS[0].cards[0]), 'ascending'), true);
    assert.equal(fractionOrderMatches(FRACTION_ORDER_ROUNDS[0].cards, 'ascending'), false);
    assert.equal(fractionOrderMatches([
      { numerator: 5, denominator: 8 },
      { numerator: 3, denominator: 8 },
      { numerator: 1, denominator: 8 },
    ], 'descending'), true);
    assert.equal(fractionOrderMatches(FRACTION_ORDER_ROUNDS[1].cards, 'descending'), false);
  });

  it('accepts a corrected card order after a missed attempt and gives a useful strategy for each round', () => {
    const halfRound = FRACTION_ORDER_ROUNDS[0];
    let attempt = [...halfRound.cards];
    assert.equal(fractionOrderMatches(attempt, halfRound.direction), false);
    attempt = [attempt[1], attempt[2], attempt[0]];
    assert.equal(fractionOrderMatches(attempt, halfRound.direction), true);
    assert.match(halfRound.strategyHint, /1\/2|half/i);
    assert.match(FRACTION_ORDER_ROUNDS[1].strategyHint, /eighths|numerators/i);
  });
});
/** Units 1–8 (grades 3–4), in order. The fraction-of-a-group lessons moved to unit 11 (5.NF.4a). */
/** The approved course order, unit by unit (written out here on purpose, so a change to LESSON_PLAN has to be meant). */
const EXPECTED_COURSE: Record<number, string[]> = {
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
  12: ['fraction-of-length', 'fractional-measure-addition', 'line-plot-leveling', 'line-plot-totals', 'fractional-unit-conversions', 'two-step-conversions',
    'fractional-sharing', 'fraction-as-division', 'unit-fraction-divided-whole', 'divide-whole-by-unit-fraction', 'share-or-fit'],
  13: ['fraction-probability', 'fractional-side-area', 'multiply-mixed-numbers'],
  14: ['fractions-to-percent', 'percent-to-fraction', 'multi-step-fraction-stories'],
  15: ['find-the-whole', 'spot-the-mistake', 'fraction-of-remainder', 'divide-fractions'],
};

const memory = new Map<string, string>();

function makeTestSpeechUtterance(text: string): SpeechSynthesisUtterance {
  return Object.assign(new EventTarget(), {
    text,
    voice: null,
    lang: '',
    rate: 1,
    pitch: 1,
    onend: null,
    onerror: null,
  }) as unknown as SpeechSynthesisUtterance;
}

beforeEach(() => {
  memory.clear();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => memory.get(key) ?? null,
        setItem: (key: string, value: string) => memory.set(key, value),
        removeItem: (key: string) => memory.delete(key),
        clear: () => memory.clear(),
      },
    },
  });
});

function assertModel(model: ModelSpec, location: string): void {
  switch (model.kind) {
    case 'bars':
      assert.ok(model.bars.length > 0, `${location} needs at least one fraction bar`);
      for (const fraction of model.bars) {
        assert.ok(Number.isInteger(fraction.numerator) && fraction.numerator >= 0, `${location} has an invalid bar numerator`);
        assert.ok(Number.isInteger(fraction.denominator) && fraction.denominator > 0, `${location} has an invalid bar denominator`);
      }
      return;
    case 'set':
      assert.ok(Number.isInteger(model.total) && model.total > 0, `${location} needs a positive set size`);
      assert.ok(Number.isInteger(model.selected) && model.selected >= 0 && model.selected <= model.total, `${location} has an invalid selected set size`);
      return;
    case 'line':
      assert.ok(Number.isInteger(model.numerator) && model.numerator >= 0, `${location} has an invalid number-line numerator`);
      assert.ok(Number.isInteger(model.denominator) && model.denominator > 0, `${location} has an invalid number-line denominator`);
      return;
    case 'partition':
      assert.ok(model.parts.length > 1, `${location} needs multiple partition pieces`);
      assert.ok(model.parts.every((part) => Number.isFinite(part) && part > 0), `${location} has an invalid partition piece`);
      assert.ok(Math.abs(model.parts.reduce((sum, part) => sum + part, 0) - 100) < 1e-9, `${location} partition should fill one whole`);
      return;
    case 'equation':
      assert.ok(model.text.trim().length > 0, `${location} equation cannot be blank`);
      return;
    case 'decimal':
      assert.ok(Number.isInteger(model.tenths) && model.tenths >= 0 && model.tenths <= 9, `${location} has an invalid tenths value`);
      return;
    case 'lineplot':
      assert.ok(Number.isInteger(model.denominator) && model.denominator > 1 && model.wholes >= 1, `${location} has an invalid line plot`);
      assert.ok(model.values.every((value) => Number.isInteger(value) && value >= 0 && value <= model.denominator * model.wholes), `${location} plots off the line`);
      return;
    case 'area':
      assert.ok(model.cut in AREA_CUTS, `${location} has an unknown area cut`);
      assert.ok(model.shaded.every((piece) => Number.isInteger(piece) && piece >= 0 && piece < AREA_CUTS[model.cut].length), `${location} shades a missing piece`);
      return;
    case 'coins':
      assert.ok([model.dimes, model.pennies].every((count) => Number.isInteger(count) && count >= 0 && count <= 9), `${location} needs 0 to 9 of each coin`);
      assert.ok(model.dimes + model.pennies > 0, `${location} shows no coins`);
      return;
    case 'ruler':
      assert.ok(Number.isInteger(model.denominator) && model.denominator > 1 && model.wholes >= 1, `${location} has an invalid ruler`);
      assert.ok(Number.isInteger(model.end) && model.end > 0 && model.end <= model.denominator * model.wholes, `${location} has a strip off the ruler`);
      return;
    case 'garden':
      for (const side of [model.width, model.height]) {
        assert.ok(Number.isInteger(side.whole) && side.whole >= 1, `${location} needs a whole meter on each side`);
        assert.ok(Number.isInteger(side.numerator) && side.numerator > 0 && side.numerator < side.denominator, `${location} needs a proper fraction part on each side`);
      }
      return;
    default: {
      const unreachable: never = model;
      assert.fail(`${location} has an unsupported visual model: ${JSON.stringify(unreachable)}`);
    }
  }
}

describe('lesson catalog', () => {
  it('never draws the answer in a question picture before the child answers', () => {
    const question = (prompt: string) => MISSIONS.flatMap((mission) => mission.questions).find((item) => item.prompt === prompt)!;
    const shown = (prompt: string) => {
      const model = question(prompt).model;
      return model.kind === 'bars' ? model.bars.filter((bar) => !bar.untilAnswered).map((bar) => `${bar.numerator}/${bar.denominator}`) : [];
    };
    assert.deepEqual(shown('Fill the blank: 3/4 = 6/?'), ['3/4'], 'the 6/8 bar would show the missing 8');
    assert.deepEqual(shown('Which is the same as 2/3?'), ['2/3']);
    assert.deepEqual(shown('2/8 + 3/8 makes 5/8. Which is another way to make 5/8?'), ['5/8'], 'only the total shows, not the parts of the answer');
    assert.deepEqual(shown('7/10 = 5/10 + what?'), ['7/10', '5/10']);
    // Pictures that draw every choice, or the fractions being put in order, stay as they are; a picture of every
    // choice also draws the added fourth choice (6/8 here), so the child can check that one too.
    assert.deepEqual(shown('Which is closest to 1/2?'), ['1/2', '5/8', '1/6', '7/8', '6/8']);
    assert.deepEqual(shown('Put 1/2, 3/8, 7/8 in order, smallest first.'), ['3/8', '1/2', '7/8']);
    // The fractions being put in order are all labelled, not only 1/2.
    const ordered = question('Put 1/2, 3/8, 7/8 in order, smallest first.').model;
    assert.ok(ordered.kind === 'bars' && ordered.bars.every((bar) => bar.named), 'every bar to put in order has its label');
    // After answering, the hidden bar comes back to confirm the answer.
    const model = question('Which is the same as 2/3?').model;
    assert.ok(model.kind === 'bars' && model.bars.some((bar) => bar.untilAnswered && bar.numerator === 4 && bar.denominator === 6));
  });

  it('gives the later lessons worked examples that answer their own question', () => {
    // These lessons used to borrow their first build as the example, which showed the build target as the answer
    // (for example "share 3/4 liter among 3 cups" answered 3/4).
    const expected: Record<string, string> = {
      'line-plot-leveling': '1/4 liter each', 'read-line-plots': '4/8 inch', 'build-line-plots': '2 Xs',
      'divide-whole-by-unit-fraction': '8 scoops', 'divide-fractions': '6 eighths', 'estimate-fraction-operations': 'Less than 1',
      'compare-decimals': '0.4', 'multiply-mixed-numbers': '2 square meters', 'fractional-unit-conversions': '45 minutes',
      'multiplication-scaling': '9, less than 12',
    };
    for (const [id, answer] of Object.entries(expected)) {
      const mission = MISSIONS.find((item) => item.id === id);
      assert.ok(mission, id);
      assert.equal(mission.example.answer, answer, id);
      assert.notEqual(mission.example.prompt, getBuildChecks(id)[0].prompt, `${id} has its own example`);
    }
  });

  it('covers 81 sequenced lessons in the expected sequence and unit groups', () => {
    assert.equal(MISSIONS.length, 81);
    assert.deepEqual(MISSIONS.map((mission) => mission.id), Object.values(EXPECTED_COURSE).flat());
    for (const [unit, ids] of Object.entries(EXPECTED_COURSE)) {
      assert.deepEqual(MISSIONS.filter((mission) => mission.unit === Number(unit)).map((mission) => mission.id), ids, `unit ${unit}`);
    }
    assert.deepEqual(
      Object.fromEntries(
        [...new Set(MISSIONS.map((mission) => mission.unit))]
          .map((unit) => [unit, MISSIONS.filter((mission) => mission.unit === unit).length]),
      ),
      { 1: 4, 2: 2, 3: 3, 4: 5, 5: 2, 6: 4, 7: 5, 8: 13, 9: 9, 10: 5, 11: 8, 12: 11, 13: 3, 14: 3, 15: 4 },
    );
  });

  it('sets every lesson\'s unit and place from LESSON_PLAN, which lists every lesson exactly once', () => {
    const planned = Object.values(LESSON_PLAN).flat();
    assert.equal(new Set(planned).size, planned.length, 'no lesson is listed twice');
    assert.deepEqual([...planned].sort(), MISSIONS.map((mission) => mission.id).sort(), 'every lesson is listed, and nothing else');
    assert.deepEqual(MISSIONS.map((mission) => mission.id), planned, 'lessons run in plan order');
    for (const mission of MISSIONS) assert.ok(LESSON_PLAN[mission.unit].includes(mission.id), `${mission.id} sits in unit ${mission.unit}`);
    assert.deepEqual(Object.keys(LESSON_PLAN).map(Number), Array.from({ length: 15 }, (_, i) => i + 1));
  });

  it('gives every lesson a brief, complete explanation of its main idea', () => {
    for (const mission of MISSIONS) {
      const idea = mission.skill.trim();
      assert.ok(idea.length >= 30 && idea.length <= 240, `${mission.id} lesson idea should be brief and explain a concept`);
      assert.match(idea, /[.!?]$/, `${mission.id} lesson idea should read as a complete thought`);
    }

    const sameNumerator = MISSIONS.find((mission) => mission.id === 'compare-same-numerator')!;
    assert.match(sameNumerator.skill, /same (?:top number|numerator).*count the same number.*larger (?:bottom number|denominator).*more equal parts.*smaller/i);
    assert.match(sameNumerator.example.explanation, /both (?:same-size (?:bars|wholes)|fractions) count 3 parts/i);
    assert.match(sameNumerator.example.explanation, /(?:8 equal parts|eighths).*smaller/i);
    assert.match(sameNumerator.example.explanation, /3\/8 (?:is )?(?:less|smaller) than 3\/4/i);

    const unlikeOrdering = LESSON_INTROS['order-unlike-fractions'];
    assert.ok(unlikeOrdering, 'fraction ordering explains the goal, steps, and why the method works');
    assert.match(unlikeOrdering.goal, /smallest to biggest.*biggest to smallest/);
    assert.match(unlikeOrdering.steps.join(' '), /1\/2.*same denominator.*compare the (?:top numbers|numerators)/);
    assert.match(unlikeOrdering.why, /same denominator.*equal-size parts.*greater amount/);
  });

  it('keeps the same-numerator explanation clear in the build, worksheet, and generated practice', () => {
    const checks = getBuildChecks('compare-same-numerator');
    assert.match(checks[0].explanation, /both (?:same-size (?:whole|bar)s?|fractions).*count 3 parts/i);
    assert.match(checks[0].explanation, /(?:eighths|eight equal parts|8 equal parts).*smaller/i);
    assert.match(checks[0].explanation, /3\/8 (?:is )?(?:smaller|less) than 3\/4/i);
    assert.match(checks[1].explanation, /Six equal parts make smaller parts than three/i);

    const worksheet = getWorksheet('compare-same-numerator');
    // The worksheet hint nudges (which parts are bigger?) without saying which fraction wins.
    assert.ok(worksheet.every((problem) => /^Both count \d+ parts\. Which parts are bigger: \w+ or \w+\?$/.test(problem.hint)));

    const generated = generateQuestions('compare-same-numerator', ['unused'], 21, 12);
    assert.ok(generated.every((question) => /Both fractions count .*larger denominator.*more equal parts.*smaller/i.test(question.hint)));
    assert.match(REASON_IDEAS['compare-same-numerator'], /larger denominator.*smaller parts/i);
  });

  it('gives every lesson its own third Build, with new numbers and a reason that fits', () => {
    for (const mission of MISSIONS) {
      const checks = getBuildChecks(mission.id);
      const targets = checks.map((check) => JSON.stringify(check.target));
      assert.equal(new Set(targets).size, 3, `${mission.id}: the three Builds use different amounts`);
      assert.doesNotMatch(checks[2].prompt, /Show the same amount with a bar and a number line|^Build \d+\/\d+ of \d+ counters/, `${mission.id}: step 3 is not a generic build`);
    }
  });

  it('explains why squares and triangles can both be fourths, after the answer and not in the hint', () => {
    const rows = ['equal-parts', 'unit-fractions'].flatMap((id) => getWorksheet(id)).filter((p) => p.area?.cut === 'fourths-mixed');
    assert.equal(rows.length, 2);
    for (const row of rows) {
      assert.match(row.why ?? '', /half of a half, so all 4 parts are fourths/);
      assert.doesNotMatch(row.hint, /1\/4|fourths|same size/, 'the hint gives a first step, not the answer');
    }
  });

  it('words every Equal parts question differently, and a redo never repeats the last four squares', () => {
    for (let variant = 0; variant < 6; variant++) {
      const sheet = getWorksheet('equal-parts', variant);
      assert.equal(new Set(sheet.map((p) => p.prompt)).size, sheet.length, `variant ${variant}: no two questions read the same`);
      const squares = (v: number) => getWorksheet('equal-parts', v).slice(8).map((p) => `${p.prompt}|${JSON.stringify(p.area)}`);
      if (variant > 0) assert.equal(squares(variant).filter((row) => squares(variant - 1).includes(row)).length, 0, `variant ${variant} repeats a square question`);
    }
  });

  it('builds any redo sheet quickly, even the huge variants a Check-in asks for', () => {
    const started = Date.now();
    for (const variant of [25, 1_000_000, 999_999_999, -7]) {
      const sheet = getWorksheet('add-unlike-fractions', variant);
      assert.equal(sheet.length, 12, `variant ${variant}`);
    }
    for (const definition of getAssessmentDefinitions()) assert.ok(buildAssessmentItems(definition, 999_999_999).length >= 10, definition.id);
    assert.ok(Date.now() - started < 20_000, `took ${Date.now() - started} ms`);
  });

  it('never asks the same question twice on a sheet, and a redo sheet is new (at most 3 rows from the sheet before)', () => {
    const key = (p: ReturnType<typeof getWorksheet>[number]) => `${p.prompt}|${p.answer}|${JSON.stringify(p.model ?? p.area ?? p.rulerTask ?? p.linePlotTask ?? p.scaleTask ?? null)}`;
    for (const mission of MISSIONS) {
      let previous: string[] = [];
      for (let variant = 0; variant < 6; variant++) {
        const keys = getWorksheet(mission.id, variant).map(key);
        assert.equal(new Set(keys).size, keys.length, `${mission.id} sheet ${variant} asks a question twice`);
        if (variant) assert.ok(keys.filter((k) => previous.includes(k)).length <= 3, `${mission.id} sheet ${variant} repeats the sheet before`);
        previous = keys;
      }
    }
  });

  it('never repeats a question in Find my level, or a lesson question in Practice more', () => {
    for (let unit = 1; unit <= PLACEMENT_UNITS; unit++) for (let seed = 1; seed <= 10; seed++) {
      const asked = placementItems(unit, seed).map((item) => `${item.problem.prompt}|${item.problem.answer}`);
      assert.equal(new Set(asked).size, asked.length, `unit ${unit} seed ${seed}`);
    }
    for (const mission of MISSIONS) {
      const lesson = new Set(mission.questions.map((q) => `${q.prompt}|${q.choices[q.correctChoice]}`));
      for (let seed = 1; seed <= 5; seed++) {
        const set = generateQuestions(mission.id, mission.questions.map((q) => q.id), seed, 12);
        const keys = set.map((q) => `${q.prompt}|${q.choices[q.correctChoice]}|${JSON.stringify(q.model)}`);
        assert.equal(new Set(keys).size, keys.length, `${mission.id} seed ${seed}: a question twice in one set`);
        assert.ok(!set.some((q) => lesson.has(`${q.prompt}|${q.choices[q.correctChoice]}`)), `${mission.id} seed ${seed}: repeats a lesson question`);
      }
    }
  });

  it('never offers the same fraction twice or adds 0/100 on a redo sheet', () => {
    for (let variant = 0; variant < 12; variant++) {
      for (const problem of getWorksheet('fraction-magnitude', variant)) {
        const closer = /closer to 1\/2: (\S+) or (\S+)\?/.exec(problem.prompt);
        if (closer) assert.notEqual(closer[1], closer[2], problem.prompt);
      }
      for (const problem of getWorksheet('add-tenths-hundredths', variant)) assert.doesNotMatch(problem.prompt, /\b0\/100/, problem.prompt);
    }
    const feedback = generateQuestions('compare-unlike-fractions', ['unused'], 40, 40).map((question) => question.retryFeedback).join(' ');
    assert.doesNotMatch(feedback, /\d+ths/);
  });

  it('has unique question IDs, valid answer bounds, and required visual and support content', () => {
    const missionIds = new Set(MISSIONS.map((mission) => mission.id));
    const questionIds = new Set<string>();

    MISSIONS.forEach((mission, missionIndex) => {
      assert.ok(mission.title.trim() && mission.shortTitle.trim() && mission.description.trim() && mission.skill.trim());
      assert.ok(mission.questions.length >= 4, `${mission.id} needs enough practice and a mastery check`);
      assert.ok(mission.example.prompt.trim() && mission.example.answer.trim() && mission.example.explanation.trim());
      assertModel(mission.example.model, `${mission.id} worked example`);
      if (mission.id === 'order-unlike-fractions') {
        assert.match(mission.example.prompt, /1\/4, 3\/8 and 5\/8/);
        assert.notEqual(mission.example.prompt, mission.questions[0].prompt);
        assert.doesNotMatch(mission.example.prompt, /1\/2|2\/3|3\/4/);
        assert.match(mission.example.explanation, /rename 1\/4 as 2\/8.*same-size parts/i);
        assert.equal(mission.example.model.kind, 'bars');
        if (mission.example.model.kind === 'bars') {
          assert.deepEqual(
            mission.example.model.bars.map(({ numerator, denominator }) => `${numerator}/${denominator}`),
            ['1/4', '2/8', '3/8', '1/2', '2/4', '5/8'],
          );
          const line = mission.example.numberLine;
          assert.ok(line, 'the worked example includes a matching number line');
          assert.deepEqual(
            line.points.map(({ numerator, denominator }) => `${numerator}/${denominator}`),
            ['1/4', '3/8', '5/8'],
            'number-line points match the bar-model fractions in the authored answer order',
          );
          const equivalentName = line.equivalentNames?.find(({ fraction, equivalentTo }) =>
            fraction.numerator === 2 && fraction.denominator === 8
            && equivalentTo.numerator === 1 && equivalentTo.denominator === 4,
          );
          assert.ok(equivalentName, 'the number line shows 2/8 as another name for 1/4');
          assert.deepEqual(line.benchmark, { numerator: 1, denominator: 2 });
          const halfEquivalentName = line.equivalentNames?.find(({ fraction, equivalentTo }) =>
            fraction.numerator === 2 && fraction.denominator === 4
            && equivalentTo.numerator === 1 && equivalentTo.denominator === 2,
          );
          assert.ok(halfEquivalentName, 'the number-line benchmark shows 2/4 as another name for 1/2');
          const equivalentNames = line.equivalentNames ?? [];
          assert.ok(equivalentNames.length >= 2, 'the number line checks more than one equivalent-name pair');
          assert.ok(line.points.slice(1).every((point, index) => {
            const previous = line.points[index];
            return BigInt(previous.numerator) * BigInt(point.denominator)
              < BigInt(point.numerator) * BigInt(previous.denominator);
          }), 'number-line points are ordered by their exact fraction values');
          assert.equal(mission.example.answer, line.points.map(({ numerator, denominator }) => `${numerator}/${denominator}`).join(' < '));
        }
      }

      const numberLine = mission.example.numberLine;
      if (numberLine?.equivalentNames?.length) {
        assert.equal(mission.example.model.kind, 'bars', `${mission.id} equivalent names have a bar model`);
        if (mission.example.model.kind === 'bars') {
          for (const { fraction, equivalentTo } of numberLine.equivalentNames) {
            assert.ok(sameFractionValue(fraction, equivalentTo), `${mission.id}: ${fraction.numerator}/${fraction.denominator} must equal ${equivalentTo.numerator}/${equivalentTo.denominator} exactly`);
            for (const namedFraction of [fraction, equivalentTo]) {
              assert.ok(
                mission.example.model.bars.some((bar) => sameFractionValue(bar, namedFraction)),
                `${mission.id}: ${namedFraction.numerator}/${namedFraction.denominator} has a matching bar amount`,
              );
            }
            assert.ok(
              [...numberLine.points, numberLine.benchmark].some((point) => sameFractionValue(point, equivalentTo)),
              `${mission.id}: ${equivalentTo.numerator}/${equivalentTo.denominator} is a number-line point or benchmark`,
            );
          }
        }
      }

      const mastery = mission.questions.filter((question) => question.isMastery);
      assert.equal(mastery.length, 1, `${mission.id} must have exactly one mastery question`);
      assert.equal(mission.questions.at(-1)?.isMastery, true, `${mission.id} mastery question must be last`);

      const reviews = mission.questions.filter((question) => question.isReview);
      if (missionIndex === 0) {
        assert.equal(reviews.length, 0, 'the first lesson has no earlier lesson to review');
      } else {
        assert.equal(reviews.length, 1, `${mission.id} should interleave one review`);
        const review = mission.questions.at(-2)!;
        const priorQuestion = MISSIONS[missionIndex - 1].questions[0];
        assert.equal(review.isReview, true, `${mission.id} review should appear immediately before mastery`);
        assert.equal(review.reviewMissionId, MISSIONS[missionIndex - 1].id);
        assert.equal(review.reviewQuestionId, priorQuestion.id);
        assert.ok(missionIds.has(review.reviewMissionId!));
        assert.equal(review.isMastery, false);
        // The review moves the right answer by one place (yes-or-no reviews then put "No" first again).
        const shifted = noBeforeYes({ choices: [...priorQuestion.choices.slice(1), priorQuestion.choices[0]], correctChoice: (priorQuestion.correctChoice - 1 + priorQuestion.choices.length) % priorQuestion.choices.length });
        assert.deepEqual(review.choices, shifted.choices);
        assert.equal(review.correctChoice, shifted.correctChoice);
      }

      mission.questions.forEach((question) => {
        assert.ok(!questionIds.has(question.id), `duplicate question ID: ${question.id}`);
        questionIds.add(question.id);
        assert.ok(question.prompt.trim(), `${question.id} needs a prompt`);
        assert.ok(question.choices.length >= 2, `${question.id} needs at least two answer choices`);
        assert.ok(Number.isInteger(question.correctChoice), `${question.id} answer key must be an integer index`);
        assert.ok(question.correctChoice >= 0 && question.correctChoice < question.choices.length, `${question.id} answer key is outside its choices`);
        assert.ok(question.choices.every((choice) => choice.trim()), `${question.id} has a blank answer choice`);
        assert.ok(question.hint.trim(), `${question.id} needs a hint`);
        assert.ok(question.retryFeedback.trim(), `${question.id} needs retry/remediation feedback`);
        assertModel(question.model, `${question.id} visual`);
        assertModel(question.simplerModel, `${question.id} simpler remediation visual`);
      });
    });
  });

  it('keeps a curated set of fraction and decimal answer keys mathematically correct', () => {
    const answerKeyChecks = [
      ['equal-parts-q2', 'No, the parts are different sizes'],
      ['sets-nonunit-q1', '8'],
      ['number-line-beyond-one-q3', '8/6'],
      ['missing-equivalent-q2', '8'],
      ['add-related-fractions-q1', '4/6'],
      ['hundredths-decimals-q1', '0.08'],
      ['hundredths-decimals-q3', '6/100'],
      // Lessons whose questions are written one by one (not made from worksheet rows).
      ['compare-decimals-grid-q1', '0.45 < 0.5 < 0.6'],
      ['compare-decimals-grid-q2', "You can't tell"],
      ['compare-decimals-grid-q3', '0.3 > 0.25'],
      ['compare-decimals-grid-q4', '0.8 > 0.75 > 0.09'],
      ['fraction-times-fraction-q1', '3/8'],
      ['fraction-times-fraction-q2', '6/12'],
      ['fraction-times-fraction-q3', '4/10'],
      ['fraction-times-fraction-q4', '6/15'],
      ['bigger-or-smaller-q1', '5/4 × 8'],
      ['bigger-or-smaller-q2', 'Less than 6'],
      ['bigger-or-smaller-q3', 'Yes, 3/3 is 1'],
      ['bigger-or-smaller-q4', 'No, 1/2 × 4 is 2'],
      ['share-or-fit-q1', 'Sharing'],
      ['share-or-fit-q2', '1/6 pound'],
      ['share-or-fit-q3', 'Fitting'],
      ['share-or-fit-q4', '12 bags'],
      ['fraction-as-division-q1', '5/4'],
      ['fraction-as-division-q2', '2 and 3'],
      ['fraction-as-division-q3', '3/8'],
      ['fraction-as-division-q4', '3 and 4'],
    ] as const;

    for (const [questionId, expectedAnswer] of answerKeyChecks) {
      const question = MISSIONS.flatMap((mission) => mission.questions).find((item) => item.id === questionId);
      assert.ok(question, `missing authored question ${questionId}`);
      assert.equal(question.choices[question.correctChoice], expectedAnswer, questionId);
      assert.equal(new Set(question.choices).size, question.choices.length, `${questionId} has duplicate answer choices`);
      assert.equal(isCorrectAnswer(question, question.correctChoice), true);
      assert.equal(isCorrectAnswer(question, (question.correctChoice + 1) % question.choices.length), false);
    }
  });
  it('checks the first answer key for every added mission independently', () => {
    MISSIONS.filter((mission) => EXTENSION_LESSON_IDS.has(mission.id)).forEach((mission) => {
      const question = mission.questions[0];
      const worksheetQuestion = getWorksheet(mission.id)[1];
      // Ordering answers show < or > instead of commas on tap questions; the worksheet keeps its typed form.
      const sameOrder = (text: string) => text.split(/\s*[,<>]\s*/).join(',');
      assert.equal(sameOrder(signOnly(withoutUnit(question.choices[question.correctChoice]), worksheetQuestion.answer)), sameOrder(worksheetQuestion.answer), `${mission.id} answer key must match its source worksheet`);
      assert.equal(new Set(question.choices).size, question.choices.length, `${mission.id} has duplicate answer choices`);
    });
  });
  it('checks the first worksheet answer for every added mission independently', () => {
    MISSIONS.slice(28).forEach((mission, index) => {
      const worksheet = getWorksheet(mission.id);
      assert.equal(worksheet.length, 12, `${mission.id} should have 12 entered-answer problems`);
      assert.ok(worksheet[0].answer.trim(), `${mission.id} should have an answer key`);
    });
  });
  it('maps the added lessons to the missing grade 3–5 standards and gates each worksheet on a model', () => {
    const requirements = [
      ['whole-numbers-as-fractions', 3, '3.NF.3c'],
      ['add-unlike-fractions', 5, '5.NF.1'],
      ['mixed-unlike-operations', 5, '5.NF.1'],
      ['estimate-fraction-operations', 5, '5.NF.2'],
      ['unit-fraction-multiples', 4, '4.NF.4a'],
      ['multiplication-scaling', 5, '5.NF.5'],
      ['multiply-mixed-numbers', 5, '5.NF.6'],
      ['unit-fraction-divided-whole', 5, '5.NF.7a'],
      ['ruler-measurement', 3, '3.MD.4'],
      ['build-line-plots', 3, '3.MD.4'],
      ['read-line-plots', 4, '4.MD.4'],
      ['line-plot-leveling', 5, '5.MD.2'],
      ['measurement-word-problems', 4, '4.MD.2'],
      ['fractional-unit-conversions', 5, '5.MD.1'],
      ['fractional-side-area', 5, '5.NF.4b'],
      ['compare-decimals', 4, '4.NF.7'],
    ] as const;
    for (const [id, gradeBand, standard] of requirements) {
      const mission = MISSIONS.find((item) => item.id === id);
      assert.ok(mission, `missing ${id}`);
      assert.equal(mission.gradeBand, gradeBand, `${id} grade label`);
      assert.ok(mission.standards?.includes(standard), `${id} should identify ${standard}`);
      const worksheet = getWorksheet(id);
      assert.equal(worksheet.length, 12, `${id} worksheet length`);
      assert.ok(worksheet.every((problem) =>
        problem.modelRequired || problem.areaTask || problem.rulerTask || problem.linePlotTask || problem.scaleTask
        // Reading a line plot: the values are only in the plot, so the answer has to be read off it.
        || problem.picture?.kind === 'lineplot',
      ), `${id} must require a model interaction before each answer`);
    }
    const shapePartitions = MISSIONS.find((item) => item.id === 'fraction-of-area');
    assert.ok(shapePartitions?.standards?.includes('3.G.2'), 'equal-area shape partitions should be identified as 3.G.2');
  });
});

describe('lesson progression', () => {
  it('starts with only the first lesson available, unlocks the next after mastery, and keeps mastered lessons open for practice', () => {
    const first = MISSIONS[0];
    const second = MISSIONS[1];
    const third = MISSIONS[2];
    const newLearner = { ...EMPTY_PROGRESS, completedMissionIds: [], starsByMission: {}, reviewQueue: [] };

    assert.equal(getNextMission(newLearner)?.id, first.id);
    assert.equal(isMissionUnlocked(newLearner, first.id), true);
    assert.equal(isMissionUnlocked(newLearner, second.id), false);
    assert.equal(isMissionUnlocked(newLearner, third.id), false);

    const lockedWork = updateLearning(newLearner, second.id, { ...emptyLearningRecord(), practiceDone: true });
    assert.equal(isMissionUnlocked(lockedWork, second.id), false);
    assert.equal(getNextMission(lockedWork)?.id, first.id, 'recommendations cannot jump to a locked lesson with partial evidence');

    assert.equal(completeMission(newLearner, first.id, 2), newLearner, 'multiple-choice practice cannot complete a lesson');
    const afterMastery = completeMission(withLearning(newLearner, first.id), first.id, 2);
    assert.equal(getNextMission(afterMastery)?.id, second.id);
    assert.equal(isMissionUnlocked(afterMastery, first.id), true, 'completed lessons remain available for practice');
    assert.equal(isMissionUnlocked(afterMastery, second.id), true, 'mastering a lesson opens the next lesson');
    assert.equal(isMissionUnlocked(afterMastery, third.id), false, 'later lessons remain locked');
  });

  it('opens the next unit only after every model and worksheet gate, then adapts within that unit', () => {
    const legacyLessonsMastered = MISSIONS.filter((mission) => mission.unit <= 8).reduce(
      (progress, mission) => withLearning(progress, mission.id),
      EMPTY_PROGRESS,
    );
    const firstExtension = MISSIONS.find((mission) => mission.unit === 9)!;
    const thirdExtension = MISSIONS.filter((mission) => mission.unit === 9)[2];
    const firstNextUnit = MISSIONS.find((mission) => mission.unit === 10)!;
    assert.equal(getNextMission(legacyLessonsMastered)?.id, firstExtension.id);
    assert.equal(isMissionUnlocked(legacyLessonsMastered, firstExtension.id), true);
    assert.equal(isMissionUnlocked(legacyLessonsMastered, thirdExtension.id), true, 'new same-level missions are available together');
    assert.equal(isMissionUnlocked(legacyLessonsMastered, firstNextUnit.id), false, 'the next level remains locked');

    const weakEvidence = {
      ...emptyLearningRecord(),
      practiceDone: true,
      misconceptions: { 'Compare using a common denominator.': 2 },
      checks: { build: { passed: false, supported: true, attempts: 2 } },
    };
    const adapted = updateLearning(legacyLessonsMastered, thirdExtension.id, weakEvidence);
    assert.equal(getNextMission(adapted)?.id, thirdExtension.id, 'evidence of difficulty reorders the recommendation within the unlocked unit');

    const completedUnit = MISSIONS.filter((mission) => mission.unit === 9).reduce(
      (progress, mission) => withLearning(progress, mission.id),
      legacyLessonsMastered,
    );
    assert.equal(isMissionUnlocked(completedUnit, firstNextUnit.id), true);
  });
});

describe('due skill reviews', () => {
  const now = Date.now();

  function queuedProgress(): Progress {
    return {
      ...EMPTY_PROGRESS,
      reviewQueue: MISSIONS.slice(0, 3).map((mission, index) => ({
        missionId: mission.id,
        missedQuestionId: mission.questions[0].id,
        dueAt: now - index,
        reviewCount: 0,
      })).concat([{
        missionId: MISSIONS[3].id,
        missedQuestionId: MISSIONS[3].questions[0].id,
        dueAt: now + SKILL_REVIEW_DELAY_MS,
        reviewCount: 0,
      }]),
    };
  }

  it('offers only due skills in a short round with a visual question for each', () => {
    const progress = queuedProgress();
    const questions = getDueSkillReviewQuestions(progress, now);

    assert.equal(getDueSkillReviewCount(progress, now), 3);
    assert.equal(questions.length, 2, 'a quick round stays limited to two questions');
    assert.ok(questions.every((question) => question.isOptionalReview && question.isReview));
    assert.ok(questions.every((question) => question.reviewMissionId && question.reviewTopicTitle));
    assert.ok(questions.every((question) => question.model && question.simplerModel));
    assert.ok(questions.every((question) => question.reviewQuestionId !== question.id));
  });

  it('keeps lesson-embedded reviews distinct and lets standalone reviews complete or defer', () => {
    const progress = queuedProgress();
    const firstMissionId = MISSIONS[0].id;
    const lessonReviews = getDelayedReviewQuestions(progress, firstMissionId, now);
    assert.ok(lessonReviews.every((question) => question.reviewMissionId !== firstMissionId));

    // A passed review is not due again for 3 days (spaced review: 1, 3 and 7 days).
    const completed = completeSkillReview(progress, firstMissionId, now);
    const later = completed.reviewQueue.find((item) => item.missionId === firstMissionId);
    assert.equal(later?.stage, 1);
    assert.equal(later?.dueAt, now + 3 * SKILL_REVIEW_DELAY_MS);

    const deferred = deferSkillReview(progress, firstMissionId, now);
    const deferredSkill = deferred.reviewQueue.find((item) => item.missionId === firstMissionId);
    assert.equal(deferredSkill?.dueAt, now + SKILL_REVIEW_DELAY_MS);
    assert.equal(deferredSkill?.reviewCount, 1);
  });

  it('shows the map entry for due reviews before and after the course is complete', () => {
    const dueReview = {
      missionId: MISSIONS[0].id,
      missedQuestionId: MISSIONS[0].questions[0].id,
      dueAt: now - 1,
      reviewCount: 0,
    };
    const renderEntry = (progress: Progress) => renderToStaticMarkup(
      createElement(QuickReviewEntry, { progress, onStart: () => undefined }),
    );

    const inProgressMarkup = renderEntry({ ...EMPTY_PROGRESS, reviewQueue: [dueReview] });
    assert.match(inProgressMarkup, /data-testid="button-start-due-review"/);
    assert.match(inProgressMarkup, /Quick skill review/);
    assert.match(inProgressMarkup, /1 due skill ready/);

    const completedCourse = MISSIONS.reduce(
      (progress, mission) => withLearning(progress, mission.id),
      EMPTY_PROGRESS,
    );
    const completedMarkup = renderEntry({
      ...completedCourse,
      completedMissionIds: MISSIONS.map((mission) => mission.id),
      reviewQueue: [dueReview],
    });
    assert.ok(!getNextMission(completedCourse), 'the fixture represents a fully completed course');
    assert.match(completedMarkup, /data-testid="button-start-due-review"/);
  });

  it('clears a correctly answered due skill while preserving and showing remaining skills after reload', () => {
    const progress = queuedProgress();
    const sessionQuestions = getDueSkillReviewQuestions(progress, now);
    assert.equal(sessionQuestions.length, 2);

    let afterSession = progress;
    for (const question of sessionQuestions) {
      assert.equal(isCorrectAnswer(question, question.correctChoice), true);
      afterSession = completeSkillReview(afterSession, question.reviewMissionId!, now);
    }
    saveProgress(afterSession);

    const reloaded = loadProgress();
    assert.equal(getDueSkillReviewCount(reloaded, now), 1);
    // Answered skills come back in 3 days (and keep their step after a reload), so they are not due now.
    assert.ok(sessionQuestions.every((question) =>
      reloaded.reviewQueue.some((item) => item.missionId === question.reviewMissionId && item.stage === 1 && item.dueAt > now),
    ));
    const mapEntry = renderToStaticMarkup(
      createElement(QuickReviewEntry, { progress: reloaded, onStart: () => undefined }),
    );
    assert.match(mapEntry, /1 due skill ready/);
  });

  it('a missed idea question (lesson 1 "-p" questions) queues its skill review instead of crashing, and survives a reload', () => {
    const empty = { completedMissionIds: [], starsByMission: {}, reviewQueue: [] };
    const missed = recordMissedSkill(empty, 'equal-parts', 'equal-parts-p1', now);
    assert.deepEqual(missed.reviewQueue.map((item) => [item.missionId, item.missedQuestionId]), [['equal-parts', 'equal-parts-p1']]);
    saveProgress(missed);
    assert.deepEqual(loadProgress().reviewQueue.map((item) => item.missedQuestionId), ['equal-parts-p1']);
    assert.ok(getDueSkillReviewQuestions(missed, now + SKILL_REVIEW_DELAY_MS).length > 0, 'the review asks another question of the lesson');
    assert.throws(() => recordMissedSkill(empty, 'equal-parts', 'equal-parts-p99', now), /Unknown question/);
  });

  it('defers a skipped skill and keeps other due skills reachable after reload', () => {
    const progress = queuedProgress();
    const [skippedQuestion, answeredQuestion] = getDueSkillReviewQuestions(progress, now);
    assert.ok(skippedQuestion && answeredQuestion);

    const afterSkip = deferSkillReview(progress, skippedQuestion.reviewMissionId!, now);
    assert.equal(isCorrectAnswer(answeredQuestion, answeredQuestion.correctChoice), true);
    const afterSession = completeSkillReview(afterSkip, answeredQuestion.reviewMissionId!, now);
    saveProgress(afterSession);

    const reloaded = loadProgress();
    const skippedSkill = reloaded.reviewQueue.find((item) => item.missionId === skippedQuestion.reviewMissionId);
    assert.equal(skippedSkill?.dueAt, now + SKILL_REVIEW_DELAY_MS);
    assert.equal(skippedSkill?.reviewCount, 1);
    assert.equal(getDueSkillReviewCount(reloaded, now), 1);
    assert.equal(getDueSkillReviewCount(reloaded, now + SKILL_REVIEW_DELAY_MS), 3);
    const mapEntry = renderToStaticMarkup(
      createElement(QuickReviewEntry, { progress: reloaded, onStart: () => undefined }),
    );
    assert.match(mapEntry, /1 due skill ready/);
  });
});

describe('saved progress', () => {
  it('saves and reloads completed lessons, best stars, and scheduled skill reviews', () => {
    const lesson = MISSIONS[0];
    let progress = withLearning(loadProgress(), lesson.id);
    progress = updateLearning(progress, lesson.id, {
      ...getLearningRecord(progress, lesson.id),
      completedAt: 1_000,
    });
    progress = completeMission(progress, lesson.id, 2);

    saveProgress(progress);

    const loaded = loadProgress();
    assert.deepEqual({ completedMissionIds: loaded.completedMissionIds, starsByMission: loaded.starsByMission, reviewQueue: loaded.reviewQueue }, {
      completedMissionIds: [lesson.id],
      starsByMission: { [lesson.id]: 2 },
      reviewQueue: [{
        missionId: lesson.id,
        missedQuestionId: lesson.questions[0].id,
        dueAt: 86_401_000,
        reviewCount: 0,
      }],
    });
    assert.equal(getDueSkillReviewCount(loaded, 86_401_000), 1);
    assert.equal(hasLearningGate(loaded, lesson.id), true);
  });

  it('clears saved progress when reset is confirmed', () => {
    const lesson = MISSIONS[0];
    const ready = withLearning(EMPTY_PROGRESS, lesson.id);
    saveProgress(completeMission(ready, lesson.id, 3));

    assert.deepEqual(resetProgress(), EMPTY_PROGRESS);
    assert.deepEqual(loadProgress(), EMPTY_PROGRESS);
  });

  it('resets only one unit and removes just its topics from saved daily practice', () => {
    const inUnit = MISSIONS.find((mission) => mission.unit === 1)!;
    const otherUnit = MISSIONS.find((mission) => mission.unit === 2)!;
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      completedMissionIds: [inUnit.id, otherUnit.id],
      starsByMission: { [inUnit.id]: 3, [otherUnit.id]: 2 },
      learning: {
        [inUnit.id]: { ...emptyLearningRecord(), practiceDone: true, worksheet: { w1: { draft: '1/2', attempts: 1, supported: false } } },
        [otherUnit.id]: { ...emptyLearningRecord(), practiceDone: true },
      },
      reviewQueue: [
        { missionId: inUnit.id, missedQuestionId: inUnit.questions[0].id, dueAt: 100, reviewCount: 1 },
        { missionId: otherUnit.id, missedQuestionId: otherUnit.questions[0].id, dueAt: 200, reviewCount: 0 },
      ],
      challengeBest: { '1': 18, '2': 14 },
      dailyPractice: {
        day: '2026-10-13', startedAt: 10,
        questions: [
          { id: 'daily-in-1', missionId: inUnit.id, topicTitle: inUnit.title, modelKind: 'bar', numerator: 1, denominator: 2, explanation: 'in-unit' },
          { id: 'daily-out', missionId: otherUnit.id, topicTitle: otherUnit.title, modelKind: 'bar', numerator: 1, denominator: 3, explanation: 'other-unit' },
          { id: 'daily-in-2', missionId: inUnit.id, topicTitle: inUnit.title, modelKind: 'bar', numerator: 2, denominator: 3, explanation: 'in-unit' },
        ],
        index: 2,
        attempts: { 'daily-in-1': { shaded: [], draft: '1/2', modelChecked: true, modelCorrect: true, answerChecked: true, answerCorrect: true },
          'daily-out': { shaded: [], draft: '', modelChecked: false, modelCorrect: false, answerChecked: false, answerCorrect: false } },
      },
      assessments: [{ assessmentId: 'grade-middle', seed: 4, startedAt: 10, completedAt: 20, responses: [] }],
    };

    const reset = resetUnitLearningProgress(progress, new Set([inUnit.id]), 1);

    assert.deepEqual(reset.completedMissionIds, [otherUnit.id]);
    assert.deepEqual(reset.starsByMission, { [otherUnit.id]: 2 });
    assert.equal(reset.learning?.[inUnit.id], undefined);
    assert.deepEqual(reset.learning?.[otherUnit.id], progress.learning?.[otherUnit.id]);
    assert.deepEqual(reset.reviewQueue.map((item) => item.missionId), [otherUnit.id]);
    assert.deepEqual(reset.challengeBest, { '2': 14 });
    assert.deepEqual(reset.dailyPractice?.questions.map((question) => question.id), ['daily-out']);
    // The cursor was past every kept topic, so the session is finished (not a blank "done" screen with no end).
    assert.equal(reset.dailyPractice?.index, 0);
    assert.equal(typeof reset.dailyPractice?.completedAt, 'number');
    assert.deepEqual(Object.keys(reset.dailyPractice?.attempts ?? {}), ['daily-out']);
    assert.deepEqual(reset.assessments, progress.assessments, 'unit reset does not clear broader check-ins');
    assert.deepEqual(progress.completedMissionIds, [inUnit.id, otherUnit.id], 'the source snapshot is unchanged');
  });

  it('migrates completion and stars from the three original trails', () => {
    memory.set('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: ['share', 'number-line', 'equivalent', 'share', 'removed-lesson'],
      starsByMission: {
        share: 3,
        'number-line': 2,
        equivalent: 1,
        'fraction-names': 2,
        'removed-lesson': 3,
      },
    }));

    const migrated = loadProgress();
    assert.deepEqual(migrated.completedMissionIds, ['equal-parts', 'number-line-basics', 'equivalent-models']);
    assert.deepEqual(migrated.starsByMission, {
      'equal-parts': 3,
      'number-line-basics': 2,
      'equivalent-models': 1,
      'fraction-names': 2,
    });
    assert.deepEqual(migrated.reviewQueue, []);
  });
});

describe('daily fraction practice', () => {
  const now = new Date(2026, 9, 11, 12).getTime();

  it('creates a short deterministic session and prioritizes due and struggling skills', () => {
    const dueMission = MISSIONS[8];
    const trickyMission = MISSIONS[12];
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      placement: { unit: 4, at: now }, // units 1–3 open, so five different lessons are available
      reviewQueue: [{
        missionId: dueMission.id,
        missedQuestionId: dueMission.questions[0].id,
        dueAt: now - 1,
        reviewCount: 0,
        missed: true,
      }],
      learning: {
        [trickyMission.id]: {
          ...emptyLearningRecord(),
          misconceptions: { 'compare fractions': 3 },
        },
      },
    };
    const session = createDailyPractice(progress, now);

    assert.equal(session.questions.length, DAILY_PRACTICE_LENGTH);
    assert.equal(session.day, dailyPracticeDay(now));
    assert.equal(session.questions[0].missionId, dueMission.id);
    assert.equal(session.questions[1].missionId, trickyMission.id);
    assert.equal(new Set(session.questions.map((question) => question.missionId)).size, DAILY_PRACTICE_LENGTH);
    assert.deepEqual(new Set(session.questions.map((question) => question.modelKind)), new Set(['bar', 'number-line']));
    assert.ok(session.questions.every((question) =>
      question.denominator >= question.numerator && question.numerator >= 1 && question.denominator <= 12,
    ));
    assert.deepEqual(createDailyPractice(progress, now), session, 'returning on the same day gets the same question set');
    assert.equal(progress.reviewQueue.length, 1, 'starting daily practice does not clear a due review');
  });

  it('never picks a locked lesson: a new learner practices their open lesson with different fractions', () => {
    const session = createDailyPractice(EMPTY_PROGRESS, now);
    assert.equal(session.questions.length, DAILY_PRACTICE_LENGTH);
    assert.ok(session.questions.every((question) => question.missionId === MISSIONS[0].id));
    assert.equal(new Set(session.questions.map((question) => question.id)).size, DAILY_PRACTICE_LENGTH);
    assert.equal(new Set(session.questions.map((question) => `${question.numerator}/${question.denominator}`)).size, DAILY_PRACTICE_LENGTH);
    const opened = { ...EMPTY_PROGRESS, placement: { unit: 2, at: now } };
    assert.ok(createDailyPractice(opened, now).questions.every((question) => isMissionUnlocked(opened, question.missionId)));
    assert.ok(session.questions.every((question) => !/1 parts? are shaded/.test(question.explanation)));
  });

  it('tags build evidence only to the fraction idea the selected model can show, and builds only in lessons about building', () => {
    const first = MISSIONS.find((mission) => mission.id === 'compare-same-denominator')!;
    const target = MISSIONS.find((mission) => mission.id === 'number-line-basics')!;
    const other = MISSIONS.find((mission) => mission.id === 'compare-unlike-fractions')!;
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      placement: { unit: 12, at: now },
      reviewQueue: [
        { missionId: first.id, missedQuestionId: first.questions[0].id, dueAt: now - 2, reviewCount: 0, missed: true },
        { missionId: target.id, missedQuestionId: target.questions[0].id, dueAt: now - 1, reviewCount: 0, missed: true },
        { missionId: other.id, missedQuestionId: other.questions[0].id, dueAt: now, reviewCount: 0, missed: true },
      ],
    };
    const session = createDailyPractice(progress, now);
    const build = session.questions.find((question) => question.missionId === target.id && question.kind === 'build');
    assert.ok(build, 'a lesson about building a fraction on a number line keeps its build question');
    assert.deepEqual(build.standards, [build.modelKind === 'bar' ? '3.NF.1' : '3.NF.2a']);
    // A lesson about something else is asked its own question, tagged with its own standards, never a generic grade 3 build.
    assert.ok(session.questions.filter((question) => question.missionId === other.id).every((question) => question.kind === 'choice' && question.standards?.includes('4.NF.2')));
    assert.ok(session.questions.filter((question) => question.missionId === first.id).every((question) => question.kind === 'choice'));
  });

  it('keeps each build explanation synchronized with its final, de-duplicated fraction', () => {
    for (let offset = 0; offset < 80; offset++) {
      const day = new Date(2026, 9, 1 + offset, 12).getTime();
      for (const question of createDailyPractice(EMPTY_PROGRESS, day).questions) {
        assert.ok(question.explanation.includes(`${question.numerator}/${question.denominator}`), question.id);
      }
    }
  });

  it('assigns question IDs after transfer routing when several sources land on one lesson', () => {
    const adaptiveStandards = Object.fromEntries(FRACTION_STANDARDS.map(({ id }) => [id, {
      status: 'mastered' as const,
      recent: [true, true, true, true, true],
      accuracy: 1,
      streakCorrect: 5,
      streakMisses: 0,
      lastUpdatedAt: now - 1,
    }]));
    // Three finished lessons for five questions: some lesson has to be asked twice in a session.
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      completedMissionIds: MISSIONS.slice(0, 3).map((mission) => mission.id),
      adaptiveStandards,
    };
    const session = Array.from({ length: 60 }, (_, offset) => createDailyPractice(progress, new Date(2026, 9, 1 + offset, 12).getTime()))
      .find((candidate) => new Set(candidate.questions.map((question) => question.missionId)).size < candidate.questions.length);
    assert.ok(session, 'some day asks one lesson more than once');
    assert.equal(new Set(session.questions.map((question) => question.id)).size, session.questions.length);
  });

  it('saves model work and typed drafts so the routine can resume after reload', () => {
    const session = createDailyPractice(EMPTY_PROGRESS, now);
    const question = session.questions[0];
    const inProgress: Progress = {
      ...EMPTY_PROGRESS,
      dailyPractice: {
        ...session,
        index: 2,
        attempts: {
          [question.id]: {
            shaded: [0, 2],
            draft: '2/4',
            modelChecked: true,
            modelCorrect: false,
            answerChecked: true,
            answerCorrect: false,
          },
        },
      },
    };

    saveProgress(inProgress);

    const resumed = loadProgress();
    assert.equal(resumed.dailyPractice?.day, session.day);
    assert.equal(resumed.dailyPractice?.index, 2);
    assert.deepEqual(resumed.dailyPractice?.attempts[question.id], inProgress.dailyPractice?.attempts[question.id]);
    assert.deepEqual(resumed.completedMissionIds, []);
    assert.deepEqual(resumed.starsByMission, {});
  });

  it('records completion separately without changing lesson gates, mastery, stars, or review queues', () => {
    const mission = MISSIONS[0];
    const dueReview = {
      missionId: mission.id,
      missedQuestionId: mission.questions[0].id,
      dueAt: now - 1,
      reviewCount: 0,
    };
    const session = createDailyPractice({ ...EMPTY_PROGRESS, reviewQueue: [dueReview] }, now);
    const completed: Progress = {
      ...EMPTY_PROGRESS,
      reviewQueue: [dueReview],
      dailyPractice: { ...session, completedAt: now },
    };

    saveProgress(completed);
    const loaded = loadProgress();

    assert.equal(loaded.dailyPractice?.completedAt, now);
    assert.deepEqual(loaded.reviewQueue, [dueReview]);
    assert.deepEqual(loaded.completedMissionIds, []);
    assert.deepEqual(loaded.starsByMission, {});
    assert.equal(hasLearningGate(loaded, mission.id), false);
  });

  it('assigns scaffolded and transfer bands from misconception and accuracy trends', () => {
    const now = new Date(2026, 9, 11, 12).getTime();
    const struggling = MISSIONS.find((mission) => mission.id === 'compare-unlike-fractions')!;
    const strong = MISSIONS.find((mission) => mission.id === 'compare-same-denominator')!;
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      placement: { unit: 11, at: now },
      reviewQueue: [
        { missionId: struggling.id, missedQuestionId: struggling.questions[0].id, dueAt: now - 3, reviewCount: 0, missed: true },
        { missionId: strong.id, missedQuestionId: strong.questions[0].id, dueAt: now - 2, reviewCount: 0, missed: true },
      ],
      learning: {
        [struggling.id]: { ...emptyLearningRecord(), misconceptions: { 'Compare unlike parts': 4 } },
      },
      adaptiveStandards: {
        '3.NF.3d': { status: 'mastered', recent: [true, true, true, true, true], accuracy: 1, streakCorrect: 6, streakMisses: 0, lastUpdatedAt: now - 1_000 },
      },
    };

    const session = createDailyPractice(progress, now);
    assert.ok(session.questions.some((question) => question.difficultyBand === 'scaffolded' && /recent misses|misconception trend/i.test(question.adaptationReason ?? '')));
    assert.ok(session.questions.some((question) => question.difficultyBand === 'transfer' && /high recent accuracy/i.test(question.adaptationReason ?? '')));
  });

  it('persists the initial scaffold and transfer decisions for the family report', () => {
    const struggling = MISSIONS.find((mission) => mission.id === 'compare-unlike-fractions')!;
    const strong = MISSIONS.find((mission) => mission.id === 'compare-same-denominator')!;
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      placement: { unit: 12, at: now },
      reviewQueue: [
        { missionId: struggling.id, missedQuestionId: struggling.questions[0].id, dueAt: now - 3, reviewCount: 0, missed: true },
        { missionId: strong.id, missedQuestionId: strong.questions[0].id, dueAt: now - 2, reviewCount: 0, missed: true },
      ],
      learning: {
        [struggling.id]: { ...emptyLearningRecord(), misconceptions: { 'Compare unlike parts': 4 } },
      },
      adaptiveStandards: {
        '3.NF.3d': { status: 'mastered', recent: [true, true, true, true, true], accuracy: 1, streakCorrect: 6, streakMisses: 0, lastUpdatedAt: now - 1_000 },
      },
    };
    const session = createDailyPractice(progress, now);
    const adapted = session.questions.filter((question) => question.difficultyBand !== 'grade-level');
    assert.ok(adapted.some((question) => question.difficultyBand === 'scaffolded'));
    assert.ok(adapted.some((question) => question.difficultyBand === 'transfer'));

    const started = recordDailyPracticeStart(progress, session, now);
    for (const question of adapted) {
      assert.ok(started.adaptationLog?.some((event) =>
        event.missionId === question.missionId
        && event.band === question.difficultyBand
        && event.reason === question.adaptationReason
        && event.standard === question.standards?.[0],
      ), `${question.id} should appear in the saved adaptation history`);
    }
    const logCount = started.adaptationLog?.length ?? 0;
    assert.equal(recordDailyPracticeStart(started, session, now).adaptationLog?.length, logCount, 'reopening the same session should not duplicate history');
  });

  it('lets recent demonstrated mastery recover from old misconception counts', () => {
    const mission = MISSIONS.find((item) => item.id === 'compare-unlike-fractions')!;
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      placement: { unit: 12, at: now },
      reviewQueue: [{ missionId: mission.id, missedQuestionId: mission.questions[0].id, dueAt: now - 1, reviewCount: 0 }],
      learning: {
        [mission.id]: { ...emptyLearningRecord(), misconceptions: { 'Compare unlike parts': 8 } },
      },
      adaptiveStandards: {
        '4.NF.2': { status: 'mastered', recent: [true, true, true, true, true], accuracy: 1, streakCorrect: 5, streakMisses: 0, lastUpdatedAt: now - 1_000 },
      },
    };
    const first = createDailyPractice(progress, now).questions[0];
    assert.equal(first.difficultyBand, 'transfer');
    assert.match(first.adaptationReason ?? '', /high recent accuracy/i);
  });

  it('detects failed build checks and adds a scaffold step after the missed question', () => {
    const now = new Date(2026, 9, 11, 12).getTime();
    const mission = MISSIONS[0];
    const startingProgress: Progress = {
      ...EMPTY_PROGRESS,
      learning: {
        [mission.id]: { ...emptyLearningRecord(), misconceptions: { 'Equal parts': 3 } },
      },
      adaptiveStandards: {
        '3.NF.1': { status: 'developing', recent: [false, false], accuracy: 0, streakCorrect: 0, streakMisses: 2, lastUpdatedAt: now - 500 },
      },
    };
    const session = createDailyPractice(startingProgress, now);
    const question = session.questions[0];
    assert.equal(question.kind, 'build', 'scaffolded review uses a model-build question');
    const progress: Progress = {
      ...startingProgress,
      dailyPractice: session,
    };
    const nextSession = {
      ...session,
      attempts: {
        ...session.attempts,
        [question.id]: {
          shaded: [],
          draft: '',
          modelChecked: true,
          modelCorrect: false,
          answerChecked: false,
          answerCorrect: false,
        },
      },
    };

    const updated = applyAdaptiveDailyPracticeUpdate(progress, nextSession, now + 1);
    assert.equal((updated.adaptiveStandards?.['3.NF.1']?.streakMisses ?? 0) >= 3, true);
    assert.equal(updated.dailyPractice!.questions.length, session.questions.length + 1);
    assert.equal(updated.dailyPractice!.index, 0, 'the child stays on the missed question and its feedback');
    assert.equal(updated.dailyPractice!.questions[0].id, question.id, 'the missed question is not swapped out');
    const reteach = updated.dailyPractice!.questions[1];
    assert.equal(reteach.reteachLoop, true);
    assert.equal(reteach.missionId, question.missionId);
    assert.equal(reteach.difficultyBand, 'scaffolded');
    // A second miss on the same question adds no second extra step.
    const again = applyAdaptiveDailyPracticeUpdate(updated, { ...updated.dailyPractice!, attempts: { ...updated.dailyPractice!.attempts, [question.id]: { ...updated.dailyPractice!.attempts[question.id], modelChecked: false } } }, now + 2);
    const twice = applyAdaptiveDailyPracticeUpdate(again, { ...again.dailyPractice!, attempts: { ...again.dailyPractice!.attempts, [question.id]: { ...again.dailyPractice!.attempts[question.id], modelChecked: true } } }, now + 3);
    assert.equal(twice.dailyPractice!.questions.length, session.questions.length + 1);
    assert.equal(updated.dailyPractice!.attempts[question.id].modelChecked, true, 'preserve the learner’s original attempt');
    assert.ok(updated.adaptationLog?.some((event) => event.band === 'scaffolded' && event.missionId === question.missionId));
  });

  it('treats five of the last six answers as mastered, but not four of five', () => {
    const now = new Date(2026, 9, 12, 12).getTime();
    const mission = MISSIONS.find((item) => item.id === 'fraction-names')!;
    const draft = createDailyPractice(EMPTY_PROGRESS, now);
    const question = {
      ...draft.questions[0],
      id: 'daily-mastery-window',
      missionId: mission.id,
      standards: ['3.NF.1'] as const,
      kind: 'choice' as const,
    };
    const session = { ...draft, questions: [question, ...draft.questions.slice(1)] };
    const attempt = { shaded: [], draft: '', modelChecked: false, modelCorrect: false, answerChecked: true, answerCorrect: true };
    const afterFourOfFive = applyAdaptiveDailyPracticeUpdate({
      ...EMPTY_PROGRESS,
      dailyPractice: session,
      adaptiveStandards: {
        '3.NF.1': { status: 'developing', recent: [false, true, true, true], accuracy: 0.75, streakCorrect: 3, streakMisses: 0, lastUpdatedAt: now - 500 },
      },
    }, { ...session, attempts: { ...session.attempts, [question.id]: attempt } }, now + 1);
    assert.equal(afterFourOfFive.adaptiveStandards?.['3.NF.1']?.status, 'developing', '4/5 is 80%, below the mastery bar');
    assert.equal(afterFourOfFive.adaptiveStandards?.['3.NF.1']?.recent.length, 5);

    const afterFiveOfSix = applyAdaptiveDailyPracticeUpdate({
      ...EMPTY_PROGRESS,
      dailyPractice: session,
      adaptiveStandards: {
        '3.NF.1': { status: 'developing', recent: [false, true, true, true, true], accuracy: 0.8, streakCorrect: 4, streakMisses: 0, lastUpdatedAt: now - 500 },
      },
    }, { ...session, attempts: { ...session.attempts, [question.id]: attempt } }, now + 2);
    const mastered = afterFiveOfSix.adaptiveStandards?.['3.NF.1'];
    assert.equal(mastered?.status, 'mastered', '5/6 must clear the mastery bar; 0.84 used to require a perfect window');
    assert.equal(mastered?.recent.filter(Boolean).length, 5);
    assert.equal(mastered?.recent.length, 6);
    assert.ok((mastered?.accuracy ?? 0) >= 5 / 6);
  });

  it('upgrades the next question to transfer after a high-accuracy correct answer', () => {
    const now = new Date(2026, 9, 11, 12).getTime();
    const mission = MISSIONS.find((item) => item.id === 'fraction-names')!;
    const session = createDailyPractice({
      ...EMPTY_PROGRESS,
      completedMissionIds: [MISSIONS[0].id],
      reviewQueue: [{ missionId: mission.id, missedQuestionId: mission.questions[0].id, dueAt: now - 1, reviewCount: 0 }],
    }, now);
    const question = session.questions[0];
    assert.equal(question.missionId, mission.id);
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      completedMissionIds: [MISSIONS[0].id],
      dailyPractice: session,
      reviewQueue: [{ missionId: mission.id, missedQuestionId: mission.questions[0].id, dueAt: now - 1, reviewCount: 0 }],
      adaptiveStandards: {
        '3.NF.1': { status: 'mastered', recent: [true, true, true, true, true], accuracy: 1, streakCorrect: 2, streakMisses: 0, lastUpdatedAt: now - 500 },
      },
    };
    const nextSession = {
      ...session,
      attempts: {
        ...session.attempts,
        [question.id]: {
          shaded: [0],
          draft: '',
          modelChecked: true,
          modelCorrect: true,
          answerChecked: true,
          answerCorrect: true,
        },
      },
    };

    const updated = applyAdaptiveDailyPracticeUpdate(progress, nextSession, now + 1);
    const upgraded = updated.dailyPractice!.questions[1];
    assert.equal(upgraded.difficultyBand, 'transfer');
    assert.match(upgraded.adaptationReason ?? '', /high recent accuracy/i);
    assert.ok(updated.adaptationLog?.some((event) => event.band === 'transfer' && event.missionId === question.missionId));
  });

  it('does not log a transfer threshold when no next question can be changed', () => {
    const now = new Date(2026, 9, 11, 12).getTime();
    const mission = MISSIONS.find((item) => item.id === 'fraction-names')!;
    const draft = createDailyPractice(EMPTY_PROGRESS, now);
    const lastQuestion = {
      ...draft.questions[0],
      id: 'daily-last-transfer-check',
      missionId: mission.id,
      topicTitle: mission.shortTitle,
      standards: ['3.NF.1'] as const,
      difficultyBand: 'grade-level' as const,
      adaptationReason: undefined,
    };
    const session = { ...draft, questions: [...draft.questions.slice(0, -1), lastQuestion], index: DAILY_PRACTICE_LENGTH - 1 };
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      dailyPractice: session,
      adaptiveStandards: {
        '3.NF.1': { status: 'mastered', recent: [true, true, true, true, true], accuracy: 1, streakCorrect: 2, streakMisses: 0, lastUpdatedAt: now - 500 },
      },
    };
    const attempt = { shaded: [0], draft: '', modelChecked: true, modelCorrect: true, answerChecked: true, answerCorrect: true };
    const updated = applyAdaptiveDailyPracticeUpdate(progress, {
      ...session,
      attempts: { ...session.attempts, [lastQuestion.id]: attempt },
    }, now + 1);
    assert.equal(updated.dailyPractice?.questions[DAILY_PRACTICE_LENGTH - 1].difficultyBand, 'grade-level');
    assert.ok(!updated.adaptationLog?.some((event) => event.band === 'transfer'));
  });
});

function withLearning(progress: Progress, id: string): Progress {
  let record = { ...emptyLearningRecord(), practiceDone: true };
  for (const check of getBuildChecks(id)) record.checks[check.id] = { passed: true, supported: false, attempts: 1 };
  for (const problem of getWorksheet(id)) {
    record = checkWorksheet(editWorksheet(record, problem.id, problem.answer), problem);
  }
  return updateLearning(progress, id, record);
}

describe('entered-answer worksheets and evidence gates', () => {
  it('counts a wrong worksheet answer once, however many times Check is pressed', () => {
    const lesson = MISSIONS[0];
    const problem = getWorksheet(lesson.id)[0];
    const wrong = problem.answer === 'No' ? 'Yes' : problem.answer === 'Yes' ? 'No' : '999';
    let record = editWorksheet(emptyLearningRecord(), problem.id, wrong);
    record = checkWorksheet(record, problem);
    record = checkWorksheet(record, problem);
    assert.equal(record.worksheet[problem.id].attempts, 1, 'a second Check of the same answer is not another attempt');
    assert.equal(record.misconceptions[problem.hint], 1, 'and not another mistake (two would add reteach questions)');
    record = checkWorksheet(editWorksheet(record, problem.id, wrong + ' '), problem);
    assert.equal(record.worksheet[problem.id].attempts, 2, 'a changed answer counts again');
  });

  it('remembers the place in a lesson\'s practice questions across a reload', () => {
    const lesson = MISSIONS[1];
    saveProgress(updateLearning(EMPTY_PROGRESS, lesson.id, { ...emptyLearningRecord(), practiceAt: { index: 3, firstTry: 2 } }));
    assert.deepEqual(getLearningRecord(loadProgress(), lesson.id).practiceAt, { index: 3, firstTry: 2 });
    saveProgress(updateLearning(EMPTY_PROGRESS, lesson.id, { ...emptyLearningRecord(), practiceDone: true, practiceAt: { index: 3, firstTry: 2 } }));
    assert.equal(getLearningRecord(loadProgress(), lesson.id).practiceAt, undefined, 'finished practice has no place to resume');
    // The name of the practice list the place was saved in comes back too, so an older version's place can start over.
    saveProgress(updateLearning(EMPTY_PROGRESS, lesson.id, { ...emptyLearningRecord(), practiceAt: { index: 3, firstTry: 2, plan: '15-abc' } }));
    assert.deepEqual(getLearningRecord(loadProgress(), lesson.id).practiceAt, { index: 3, firstTry: 2, plan: '15-abc' });
  });

  it('builds lesson models and math text without String.matchAll in older webviews', () => {
    const original = Object.getOwnPropertyDescriptor(String.prototype, 'matchAll');
    try {
      Object.defineProperty(String.prototype, 'matchAll', { configurable: true, writable: true, value: undefined });
      assert.deepEqual(amountsIn('Compare 3/4 or 1/2.'), [
        { numerator: 3, denominator: 4, written: true },
        { numerator: 1, denominator: 2, written: true },
      ]);
      const markup = renderToStaticMarkup(createElement(LearningText, {
        text: 'Each equal share is 1/4 of a whole.',
      }));
      assert.match(markup, /class="fq-mfrac" role="math" aria-label="1 over 4"/);
      assert.match(markup, /class="fq-vocab-trigger"/);
    } finally {
      if (original) Object.defineProperty(String.prototype, 'matchAll', original);
      else delete (String.prototype as { matchAll?: unknown }).matchAll;
    }
  });

  it('highlights fraction vocabulary, keeps fractions stacked, and does not add inline audio controls', () => {
    const markup = renderToStaticMarkup(createElement(LearningText, {
      text: 'Each equal share is 1/4 of a whole.',
    }));
    assert.match(markup, /class="fq-vocab-trigger" role="term" tabindex="0" aria-describedby=/);
    assert.match(markup, /role="tooltip"/);
    assert.match(markup, /A whole is the full shape or amount/);
    assert.match(markup, /class="fq-mfrac" role="math" aria-label="1 over 4"/);
    assert.doesNotMatch(markup, /fq-learning-listen|button-listen-learning-text/);
  });

  it('offers one accessible Listen control for a complete question, including story lines in order', () => {
    const prompt = 'A kite fell. Mia found it. Where did Mia find it?';
    const markup = renderToStaticMarkup(createElement(StoryPrompt, { prompt, id: 'lesson-question' }));

    assert.equal((markup.match(/data-testid="button-listen-learning-text"/g) ?? []).length, 1);
    assert.match(markup, /aria-label="Audio unavailable for the question"/);
    assert.ok(markup.indexOf('A kite fell.') < markup.indexOf('Mia found it.'));
    assert.ok(markup.indexOf('Mia found it.') < markup.indexOf('Where did Mia find it?'));
    assert.match(markup, /class="fq-story-question-heading"/);
    assert.match(markup, /id="lesson-question"/);
  });

  it('gives question, worked answer, and explanation their own section-level Listen controls', () => {
    const sections = [
      { heading: 'Question', id: 'example-question', text: 'How many parts are shaded?' },
      { heading: 'Worked answer', id: 'example-answer', text: '3/4' },
      { heading: 'Explanation', id: 'example-explanation', text: 'Three of four equal parts are shaded.' },
    ];
    const markup = renderToStaticMarkup(createElement(
      'div',
      null,
      ...sections.map((section) => createElement(LearningTextSection, { ...section, key: section.id })),
    ));

    assert.equal((markup.match(/data-testid="button-listen-learning-text"/g) ?? []).length, sections.length);
    for (const section of sections) {
      assert.match(markup, new RegExp(`aria-labelledby="${section.id}"`));
      assert.match(markup, new RegExp(`id="${section.id}">${section.heading}</h3>`));
      assert.match(markup, new RegExp(`aria-label="Audio unavailable for the ${section.heading.toLowerCase()}"`));
      assert.ok(markup.indexOf(`id="${section.id}">${section.heading}</h3>`) < markup.indexOf(`aria-label="Audio unavailable for the ${section.heading.toLowerCase()}"`));
    }
  });

  it('shows the family voice-selection section and explains when local speech is unsupported', () => {
    const markup = renderToStaticMarkup(createElement(LearningVoicePicker));
    assert.match(markup, /Read-aloud voice/);
    assert.match(markup, /Natural voice/);
    assert.doesNotMatch(markup, /Kokoro self-test/, 'the self-test is for development only');
    assert.match(markup, /Device voices/);
    assert.match(markup, /can’t play the natural voice/, 'without browser support the natural voice explains the fallback');
    assert.match(markup, /Read-aloud voices are not available in this browser/);
  });

  it('prefers a feminine-sounding voice in the requested language unless a saved choice is available', () => {
    const voices = [
      { name: 'Alex', lang: 'en-US', default: true },
      { name: 'Daniel', lang: 'en-GB', default: false },
      { name: 'Samantha', lang: 'en-AU', default: false },
      { name: 'Samantha', lang: 'fr-FR', default: true },
    ];
    assert.equal(selectLearningVoice(voices, 'en-US')?.name, 'Samantha');
    assert.equal(selectLearningVoice(voices, 'en-US', 'Alex|en-US')?.name, 'Alex', 'an available saved choice is reused');
    assert.equal(selectLearningVoice(voices.slice(0, 2), 'en-US')?.name, 'Alex', 'without a feminine-sounding voice, use the best language match');
    assert.equal(selectLearningVoice([], 'en-US'), null);
    assert.equal(selectLearningVoice([voices[3], { name: 'Luca', lang: 'it-IT', default: false }], 'en-US')?.lang, 'fr-FR', 'when no requested-language voice exists, use the browser default');
    assert.equal(selectLearningVoice(voices, 'en-US', 'missing|en-US')?.name, 'Samantha', 'an unavailable saved choice falls back to a suitable local voice');
    assert.equal(spokenLearningText('Compare 1/2 with 3/4.'), 'Compare one half with three fourths.');
  });

  it('reuses the saved language-matched voice for lesson explanations', () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    const voiceList = [
      { name: 'Alex', lang: 'en-US', default: true },
      { name: 'Samantha', lang: 'en-US', default: false },
      { name: 'Samantha', lang: 'fr-FR', default: false },
    ] as SpeechSynthesisVoice[];
    const fakeSynthesis = {
      getVoices: () => voiceList,
      speak(utterance: SpeechSynthesisUtterance) { utterances.push(utterance); },
      cancel() {},
      addEventListener() {},
      removeEventListener() {},
    } as unknown as SpeechSynthesis;
    const controller = createLearningSpeechController(
      fakeSynthesis,
      () => undefined,
      makeTestSpeechUtterance,
      undefined,
      () => 'Alex|en-US',
    );
    controller.speak('An explanation.', 'en-US');

    assert.equal(utterances[0].voice?.name, 'Alex');
    assert.equal(utterances[0].lang, 'en-US');
    controller.dispose();
  });

  it('waits for delayed voices and applies calm speech settings and fraction pronunciation', () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    const listeners = new Set<() => void>();
    const fakeSynthesis = {
      voices: [] as SpeechSynthesisVoice[],
      getVoices() { return this.voices; },
      speak(utterance: SpeechSynthesisUtterance) { utterances.push(utterance); },
      cancel() {},
      addEventListener(_event: string, listener: () => void) { listeners.add(listener); },
      removeEventListener(_event: string, listener: () => void) { listeners.delete(listener); },
    } as unknown as SpeechSynthesis;
    const controller = createLearningSpeechController(fakeSynthesis, () => undefined, makeTestSpeechUtterance);
    controller.speak('1/2 is a unit fraction.', 'en-US');
    assert.equal(utterances.length, 0, 'do not speak with the browser default before asynchronous voices load');

    fakeSynthesis.voices = [
      { name: 'Alex', lang: 'en-US', default: true },
      { name: 'Samantha', lang: 'en-US', default: false },
    ] as SpeechSynthesisVoice[];
    for (const listener of listeners) listener();

    assert.equal(utterances.length, 1);
    assert.equal(utterances[0].voice?.name, 'Samantha');
    assert.equal(utterances[0].text, 'one half is a unit fraction.');
    assert.equal(utterances[0].lang, 'en-US');
    assert.equal(utterances[0].rate, 0.88);
    assert.equal(utterances[0].pitch, 1.1);
    controller.dispose();
  });

  it('cancels before restart and prevents stale speech callbacks from changing current playback state', () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    let cancelCount = 0;
    const fakeSynthesis = {
      getVoices: () => [{ name: 'Samantha', lang: 'en-US', default: true }] as SpeechSynthesisVoice[],
      speak(utterance: SpeechSynthesisUtterance) { utterances.push(utterance); },
      cancel() { cancelCount += 1; },
      addEventListener() {},
      removeEventListener() {},
    } as unknown as SpeechSynthesis;
    const states: boolean[] = [];
    const controller = createLearningSpeechController(fakeSynthesis, (value) => states.push(value), makeTestSpeechUtterance);
    controller.speak('First explanation.', 'en-US');
    const firstFinish = utterances[0].onend!;
    controller.speak('Second explanation.', 'en-US');

    assert.equal(cancelCount, 2, 'each playback starts by canceling anything already queued');
    assert.equal(utterances.length, 2);
    firstFinish(new Event('end') as SpeechSynthesisEvent);
    assert.equal(states.at(-1), true, 'an old utterance cannot mark the newer one stopped');

    controller.stop();
    assert.equal(cancelCount, 3);
    assert.equal(states.at(-1), false);
    controller.dispose();
    assert.equal(cancelCount, 4, 'component cleanup cancels browser speech');
  });

  it('cancels a pending voice lookup and falls back to the browser default after the wait expires', async () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    const listeners = new Set<() => void>();
    const fakeSynthesis = {
      voices: [] as SpeechSynthesisVoice[],
      getVoices() { return this.voices; },
      speak(utterance: SpeechSynthesisUtterance) { utterances.push(utterance); },
      cancel() {},
      addEventListener(_event: string, listener: () => void) { listeners.add(listener); },
      removeEventListener(_event: string, listener: () => void) { listeners.delete(listener); },
    } as unknown as SpeechSynthesis;
    const states: boolean[] = [];
    const controller = createLearningSpeechController(fakeSynthesis, (value) => states.push(value), makeTestSpeechUtterance, 5);
    controller.speak('This should not start.', 'en-US');
    assert.equal(states.at(-1), true, 'the stop control is available while waiting for voices');
    controller.stop();
    assert.equal(states.at(-1), false);
    for (const listener of listeners) listener();
    assert.equal(utterances.length, 0, 'stop cancels the waiting voice lookup');

    controller.speak('Use the browser default.', 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 15));
    assert.equal(utterances.length, 1);
    assert.equal(utterances[0].voice, null);
    assert.equal(utterances[0].lang, 'en-US');
    controller.dispose();
  });

  it('uses the device default when mobile speech synthesis has no voice-change event methods', async () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    const fakeSynthesis = {
      getVoices: () => [] as SpeechSynthesisVoice[],
      speak(utterance: SpeechSynthesisUtterance) { utterances.push(utterance); },
    } as unknown as SpeechSynthesis;
    const states: boolean[] = [];
    const natural = { ready: () => false, speak() {}, stop() {}, warmUp() {} };
    const controller = createLearningSpeechController(fakeSynthesis, (value) => states.push(value), makeTestSpeechUtterance, 0, () => null, natural);

    assert.doesNotThrow(() => controller.speak('Use the device voice.', 'en-US'));
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(utterances.length, 1);
    assert.equal(utterances[0].voice, null);
    assert.equal(utterances[0].lang, 'en-US');
    controller.stop();
    assert.equal(states.at(-1), false);
    controller.dispose();
  });

  it('keeps answer keys out of every student printable and student print choices', () => {
    assert.equal(STUDENT_PRINT_OPTIONS.some((option) => option.label.toLowerCase().includes('answer key')), false);
    assert.equal(STUDENT_PRINT_OPTIONS.some((option) => option.mode === 'blank' && option.label === 'Worksheet'), true);
    assert.equal(STUDENT_PRINT_OPTIONS.some((option) => option.label.toLowerCase() === 'my answers'), false);
    const record = emptyLearningRecord();
    const menu = renderToStaticMarkup(createElement(PrintMenu, { missionId: 'number-line-basics' }));
    assert.doesNotMatch(menu, /answer key|my answers/i);

    for (const { mode } of STUDENT_PRINT_OPTIONS) {
      const markup = renderToStaticMarkup(createElement(Printable, {
        missionId: 'number-line-basics',
        mode,
        seed: 1,
      }));
      assert.doesNotMatch(markup, /fq-print-key-list|data-testid="print-answer-key"/, `${mode} must not render an answer key`);
    }

    const generated = renderToStaticMarkup(createElement(Printable, {
      missionId: 'number-line-basics',
      mode: 'generated',
      seed: 1,
    }));
    assert.match(generated, /data-testid="print-generated"/);
    assert.doesNotMatch(generated, /Cut this part off/i);
  });

  it('prints no bar that the screen hides until the question is answered (every lesson, practice sheet and new sheets)', () => {
    /** One printed bar row per bar the screen shows before answering (a decimal picture is one bar). */
    const barRows = (questions: { model: ModelSpec }[]) => questions.reduce((sum, { model }) => sum
      + (model.kind === 'bars' ? model.bars.filter((bar) => !bar.untilAnswered).length : model.kind === 'decimal' ? 1 : 0), 0);
    const printed = (markup: string) => (markup.match(/class="fq-print-bar-row"/g) ?? []).length;
    let hidden = 0;
    // AreaModel.tsx uses the classic JSX runtime, which needs React on the global object while rendering.
    const globalWithReact = globalThis as typeof globalThis & { React?: typeof React };
    const previousReact = globalWithReact.React;
    globalWithReact.React = React;
    try {
    for (const mission of MISSIONS) {
      hidden += mission.questions.filter(({ model }) => model.kind === 'bars' && model.bars.some((bar) => bar.untilAnswered)).length;
      assert.equal(printed(renderToStaticMarkup(createElement(Printable, { missionId: mission.id, mode: 'practice' }))), barRows(mission.questions),
        `${mission.id}: the practice sheet draws a bar that shows the answer`);
      if (!hasGenerator(mission.id)) continue;
      for (const seed of [1, 2, 3]) {
        const questions = generateQuestions(mission.id, mission.questions.map((q) => q.id), seed, 12).filter(({ model }) => model.kind !== 'equation');
        assert.equal(printed(renderToStaticMarkup(createElement(Printable, { missionId: mission.id, mode: 'generated', seed }))), barRows(questions),
          `${mission.id}: new practice sheet ${seed} draws a bar that shows the answer`);
      }
    }
    } finally {
      if (previousReact) globalWithReact.React = previousReact;
      else delete globalWithReact.React;
    }
    assert.ok(hidden >= 23, `${hidden} lesson questions hide a bar until answered`);
  });

  it('prints a blank worksheet without exposing or changing saved lesson answers', () => {
    const problem = getWorksheet('number-line-basics')[0];
    const record = checkWorksheet(editWorksheet(emptyLearningRecord(), problem.id, problem.answer), problem);
    const markup = renderToStaticMarkup(createElement(Printable, {
      missionId: 'number-line-basics',
      mode: 'blank',
    }));

    assert.match(markup, /data-testid="print-worksheet-blank"/);
    assert.doesNotMatch(markup, /My answers|✓ Correct|Worksheet: 1 of 12 correct/);
    const answerFields = [...markup.matchAll(/<div class="fq-print-answer">([\s\S]*?)<\/div>/g)];
    assert.equal(answerFields.length, 12);
    assert.ok(answerFields.every(([, field]) => /<span>Answer:<\/span><b><\/b>/.test(field)));
    assert.equal(record.worksheet[problem.id]?.checkedValue, problem.answer);
  });

  it('keeps the grown-up answer key printable with practice, worksheet, and model solutions', () => {
    const mission = getMission('equal-parts');
    const markup = renderToStaticMarkup(createElement(AnswerKey, { mission }));
    const firstWorksheetAnswer = getWorksheet(mission.id)[0].answer;
    const firstPracticeAnswer = mission.questions[0].choices[mission.questions[0].correctChoice];

    assert.match(markup, /Answer key for grown-ups/);
    assert.match(markup, /data-testid="print-answer-key"/);
    assert.ok(markup.includes(firstPracticeAnswer), 'includes the authored practice answer');
    assert.ok(markup.includes(firstWorksheetAnswer), 'includes the worksheet answer');
    assert.match(markup, /Show it both ways/);
  });

  it('labels the whole with a bracket under the bar rather than showing a fraction hint beside it', () => {
    const markup = renderToStaticMarkup(createElement(BarSvg, { n: 2, d: 5 }));
    assert.match(markup, /fq-svg-whole-bracket/);
    assert.match(markup, />one whole<\/text>/);
    assert.match(markup, /each whole is split into 5 equal parts/);
    assert.match(markup, /2 parts are shaded/);
  });

  it('builds a fraction answer from number tiles, with no box to type in', () => {
    const markup = renderToStaticMarkup(createElement(AnswerTiles, {
      shape: { kind: 'fraction', allowWhole: false }, value: '1/3', onChange: () => undefined, testIdPrefix: 'ws-w1',
    }));
    assert.match(markup, /aria-label="numerator is the number of parts selected: 1[,"]/);
    assert.match(markup, /aria-label="denominator is the total number of equal parts in one whole: 3"/);
    assert.match(markup, /data-testid="tile-ws-w1-digit-9"/);
    assert.doesNotMatch(markup, /<input|<textarea/);
  });

  it('puts ordering answers in boxes instead of typing commas', () => {
    const markup = renderToStaticMarkup(createElement(AnswerTiles, {
      shape: { kind: 'ordered', items: ['3/4', '1/4', '2/4'], first: 'smallest' }, value: '', onChange: () => undefined, testIdPrefix: 'ws-w2',
    }));
    assert.match(markup, /data-testid="slot-ws-w2-2"/);
    assert.match(markup, /data-testid="tile-ws-w2-card-0"/);
    assert.doesNotMatch(markup, /<input|<textarea/);
  });

  it('separates reasoning feedback from model errors across every lesson', () => {
    for (const mission of MISSIONS) {
      for (const check of getBuildChecks(mission.id)) {
        const missing = getReasonFeedback(check, null, false);
        assert.equal(missing?.correct, false, `${mission.id}/${check.id} should ask for a reason`);
        assert.match(missing?.message ?? '', /^Pick the sentence that matches your model/);

        const incorrectIndex = (check.correctReason + 1) % check.reasons.length;
        const incorrect = getReasonFeedback(check, incorrectIndex, false);
        assert.equal(incorrect?.correct, false, `${mission.id}/${check.id} should reject a wrong reason`);
        assert.match(incorrect?.message ?? '', /Look at the models and choose again/);

        const correctButModelsWrong = getReasonFeedback(check, check.correctReason, false);
        assert.equal(correctButModelsWrong?.correct, true, `${mission.id}/${check.id} should preserve a correct reason`);
        assert.match(correctButModelsWrong?.message ?? '', /reason is right/);
        assert.equal(getReasonFeedback(check, check.correctReason, true), null);
      }
    }
  });

  it('reveals the model-building steps in order and keeps model explanations concrete', () => {
    assert.equal(getBuildCheckStage(false, false), 'primary');
    assert.equal(getBuildCheckStage(false, true), 'primary');
    assert.equal(getBuildCheckStage(true, false), 'secondary');
    assert.equal(getBuildCheckStage(true, true), 'reason');
    assert.equal(getModelFeedback({ kind: 'bar', n: 2, d: 5, wholes: 1 }), 'Each whole is split into 5 equal parts. 2 parts are shaded.');
    assert.equal(getModelFeedback({ kind: 'line', n: 1, d: 4, wholes: 1 }), 'Each whole has 4 equal spaces. 1 jump shows the amount.');
    assert.equal(getModelFeedback({ kind: 'set', n: 1, d: 3, wholes: 1, total: 12 }), '12 objects are split into 3 equal groups. 1 group is selected.');
  });

  it('groups set-model counters by the denominator and only highlights whole groups', () => {
    assert.deepEqual(setModelLayout({ kind: 'set', selected: 4, total: 12, groupCount: 3 }), {
      groupCount: 3, selectedGroups: 1, objectsPerGroup: 4,
    });
    assert.deepEqual(setModelLayout({ kind: 'set', selected: 6, total: 12, groupCount: 4 }), {
      groupCount: 4, selectedGroups: 2, objectsPerGroup: 3,
    });
    assert.equal(setModelLayout({ kind: 'set', selected: 4, total: 12, groupCount: 5 }), null);
    assert.equal(setModelLayout({ kind: 'set', selected: 3, total: 12, groupCount: 3 }), null);
  });

  it('keeps proper-fraction number lines from 0 to 1 and extends only for improper fractions', () => {
    assert.equal(numberLineWholeCount(1, 3), 1);
    assert.equal(numberLineWholeCount(5, 5), 1);
    assert.equal(numberLineWholeCount(7, 5), 2);
    assert.equal(numberLineWholeCount(11, 5), 3);
    assert.throws(() => numberLineWholeCount(1, 0), RangeError);
  });
  it('checks independently calculated keys across every curriculum topic', () => {
    const expected: Record<string, string> = {
      'equal-parts': '3', 'fraction-names': '1', 'unit-fractions': '3', 'unit-size': '1/2', 'sets-unit-fractions': '2', 'sets-nonunit': '4',
      'benchmark-half': '1/4', 'benchmarks-zero-one': '1/3', 'fraction-magnitude': '5/6', 'number-line-basics': '3', 'number-line-points': '1/3',
      'number-line-beyond-one': '4/3', 'compare-same-denominator': '2/3', 'compare-same-numerator': '2/3', 'order-fractions': '1/3, 2/3, 3/3',
      'equivalent-models': '2', 'build-equivalents': '2/6', 'missing-equivalent': '2', 'compose-to-one': '2/3', 'decompose-fractions': '2',
      'improper-fractions': '>', 'mixed-improper': '4/3', 'add-like-denominators': '2/3', 'subtract-like-denominators': '1/3',
      'add-related-fractions': '3/4', 'tenths-decimals': '0.1', 'hundredths-decimals': '0.08', 'add-tenths-hundredths': '34/100',
    };
    for (const [id, answer] of Object.entries(expected)) assert.equal(getWorksheet(id)[0].answer, answer, id);
  });
  it('authors twelve valid problems and three required Build checks for every topic', () => {
    for (const mission of MISSIONS) {
      const problems = getWorksheet(mission.id); const checks = getBuildChecks(mission.id);
      assert.equal(problems.length, 12, mission.id);
      assert.equal(new Set(problems.map(p => p.id)).size, 12);
      assert.ok(new Set(problems.map(p => p.prompt)).size >= 6, `${mission.id} needs varied prompts`);
      problems.forEach(p => {
        assert.ok(answerMatches(p, p.answer), `${mission.id}/${p.id}: invalid authored key ${p.answer}`);
        assert.equal(answerMatches(p, ''), false); assert.equal(answerMatches(p, '1/0'), false);
        assert.ok(p.hint.length > 10);
      });
      assert.equal(checks.length, 3);
      assert.equal(checks[1].transfer, true);
      assert.notDeepEqual(checks[0].target, checks[1].target, `${mission.id}: transfer must use new numbers`);
      assert.equal(checks[0].stepLabel, 'Step 1 · Build it');
      assert.equal(checks[2].stepLabel, 'Step 3 · Apply it');
      assert.ok(checks.every((check, i) => checks.slice(i + 1).every(next => JSON.stringify(next.target) !== JSON.stringify(check.target))), `${mission.id}: each required Build target must differ`);
      checks.forEach(c => {
        assert.ok(c.correctReason >= 0 && c.correctReason < c.reasons.length);
        assert.ok(c.target.n > 0 && c.target.d > 0 && c.target.n <= c.target.d * c.target.wholes);
        if (c.target.total) assert.equal(c.target.total % c.target.d, 0);
      });
      for (let round = 0; round < 4; round++) {
        const review = getReviewCheck(mission.id, round);
        assert.ok(review.target.n > 0 && review.target.d > 1, `${mission.id} review ${round}`);
        assert.ok(review.target.n <= review.target.d * review.target.wholes);
        assert.ok(review.reasons[review.correctReason]);
      }
    }
  });
  it('provides ten optional Build questions per lesson and a fresh next set', () => {
    for (const mission of MISSIONS) {
      const first = getBuildPracticeChecks(mission.id);
      assert.equal(first.length, 10, mission.id);
      assert.equal(new Set(first.map(check => JSON.stringify(check.target))).size, 10, `${mission.id}: duplicate target in the first set`);
      first.forEach(check => {
        assert.ok(check.target.n > 0 && check.target.d > 1 && check.target.n <= check.target.d * check.target.wholes, `${mission.id}: invalid optional target`);
      });
    }
    for (const id of ['equal-parts', 'sets-unit-fractions', 'number-line-basics', 'whole-numbers-as-fractions']) {
      const first = getBuildPracticeChecks(id);
      const second = getBuildPracticeChecks(id, 1);
      assert.equal(second.length, 10, `${id}: second set`);
      assert.ok(first.every(check => !second.some(next => JSON.stringify(next.target) === JSON.stringify(check.target))), `${id}: the next set repeats a question`);
    }
  });
  it('accepts equivalent values without rounding and respects requested forms', () => {
    const base = { id: 'test', prompt: '', hint: '', answer: '1/2' };
    for (const answer of ['2/4', '0.5', '5/10']) assert.equal(answerMatches(base, answer), true);
    for (const answer of ['.5oops', '1/0', '1/-2', '', ' ', '0.500001', '1/2/3']) assert.equal(answerMatches(base, answer), false);
    assert.equal(answerMatches({ ...base, denominator: 4 }, '1/2'), false);
    assert.equal(answerMatches({ ...base, denominator: 4 }, '2/4'), true);
    assert.equal(answerMatches({ ...base, form: 'decimal' }, '2/4'), false);
    assert.equal(answerMatches({ ...base, answer: '7/4' }, '1 and 3/4'), true);
    assert.equal(answerMatches({ ...base, form: 'ordered', answer: '1/4,1/2,3/4' }, '2/8, 0.5, 6/8'), true);
    assert.equal(parseAnswer('1 4/3'), null);
    assert.equal(answerMatches({ ...base, answer: '0.08' }, '0.8'), false);
  });
  it('keeps levels locked for blanks, unchecked answers, absent model/reasoning checks and edits', () => {
    const id = MISSIONS[0].id;
    const problems = getWorksheet(id);
    const checks = getBuildChecks(id);
    const firstProblem = problems[0];
    let record = emptyLearningRecord();
    for (const check of checks) {
      record.checks[check.id] = { passed: true, supported: false, attempts: 1 };
    }
    for (const problem of problems.slice(1)) {
      record = checkWorksheet(editWorksheet(record, problem.id, problem.answer), problem);
    }
    record = { ...record, practiceDone: true };

    let progress = updateLearning(EMPTY_PROGRESS, id, record);
    assert.equal(worksheetCount(record, id), 11);
    assert.equal(hasLearningGate(progress, id), false, 'a blank response cannot pass the worksheet gate');
    assert.equal(isMissionUnlocked(progress, MISSIONS[1].id), false);
    assert.equal(completeMission(progress, id, 3), progress, 'a partial record cannot complete a mission');

    record = editWorksheet(record, firstProblem.id, firstProblem.answer);
    progress = updateLearning(progress, id, record);
    assert.equal(worksheetCount(record, id), 11, 'a correct but unchecked response does not count');
    assert.equal(hasLearningGate(progress, id), false);

    record = checkWorksheet(record, firstProblem);
    progress = updateLearning(progress, id, record);
    assert.equal(hasLearningGate(progress, id), true);
    const completed = completeMission(progress, id, 3);
    assert.equal(isMissionUnlocked(completed, MISSIONS[1].id), true);

    const missingModelCheck = updateLearning(progress, id, { ...record, checks: {} });
    assert.equal(hasLearningGate(missingModelCheck, id), false);
    assert.equal(isMissionUnlocked(missingModelCheck, MISSIONS[1].id), false);

    const editedAnswer = updateLearning(progress, id, editWorksheet(record, firstProblem.id, firstProblem.answer));
    assert.equal(hasLearningGate(editedAnswer, id), false, 'editing invalidates the checked evidence');
    assert.equal(isMissionUnlocked(editedAnswer, MISSIONS[1].id), false);
    assert.equal(isMissionUnlocked({ ...EMPTY_PROGRESS, completedMissionIds: MISSIONS.map((mission) => mission.id) }, MISSIONS[1].id), false);
    assert.equal(getNextMission({ ...EMPTY_PROGRESS, completedMissionIds: MISSIONS.map((mission) => mission.id) })?.id, id);
    assert.equal(isMissionUnlocked(progress, 'unknown'), false);
  });
  it('requires every worksheet answer before the lesson can finish', () => {
    const id = MISSIONS[0].id;
    const problems = getWorksheet(id);
    const checks = getBuildChecks(id);
    let record: LearningRecord = { ...emptyLearningRecord(), practiceDone: true };
    for (const check of checks) record.checks[check.id] = { passed: true, supported: false, attempts: 1 };
    // Every question but the last: not done yet.
    for (const problem of problems.slice(0, -1)) record = checkWorksheet(editWorksheet(record, problem.id, problem.answer), problem);
    let progress = updateLearning(EMPTY_PROGRESS, id, record);
    assert.equal(worksheetCount(record, id), problems.length - 1);
    assert.equal(hasLearningGate(progress, id), false, 'one unanswered worksheet question blocks the lesson');
    assert.equal(lessonSteps(progress, id).done, checks.length);
    assert.equal(isMissionUnlocked(progress, MISSIONS[1].id), false);

    const last = problems[problems.length - 1];
    record = checkWorksheet(editWorksheet(record, last.id, last.answer), last);
    progress = updateLearning(progress, id, record);
    assert.equal(worksheetCount(record, id), problems.length);
    assert.equal(hasLearningGate(progress, id), true);
    assert.equal(lessonSteps(progress, id).done, checks.length + 1);
    assert.equal(isMissionUnlocked(completeMission(progress, id, 2), MISSIONS[1].id), true);
  });
  it('preserves drafts, correction history and learning evidence over reload, then resets them', () => {
    const id = MISSIONS[0].id;
    const problem = getWorksheet(id)[0];
    let record = checkWorksheet(editWorksheet(emptyLearningRecord(), problem.id, '1/0'), problem);
    assert.equal(record.worksheet[problem.id].supported, true);
    record = checkWorksheet(editWorksheet(record, problem.id, problem.answer), problem);
    assert.equal(record.worksheet[problem.id].supported, true);
    assert.equal(record.worksheet[problem.id].attempts, 2);
    record = { ...editWorksheet(record, 'w2', 'unfinished'), reviewSupportedUntil: 123456 };
    saveProgress(updateLearning(EMPTY_PROGRESS, id, record));
    const loaded = getLearningRecord(loadProgress(), id);
    assert.equal(loaded.worksheet.w2.draft, 'unfinished');
    assert.equal(loaded.worksheet.w1.checkedValue, problem.answer);
    assert.equal(loaded.misconceptions[problem.hint], 1);
    assert.equal(loaded.reviewSupportedUntil, 123456, 'reloading must not erase review support');
    assert.equal(hasLearningGate(loadProgress(), id), false);
    resetProgress(); assert.deepEqual(loadProgress(), EMPTY_PROGRESS);
  });
  it('persists targeted reteach answers and keeps the lesson gate closed until all three are correct', () => {
    const id = MISSIONS[0].id;
    const trigger = 'Counting pieces, groups or jumps';
    let progress = withLearning(EMPTY_PROGRESS, id);
    let record = { ...getLearningRecord(progress, id), misconceptions: { [trigger]: 2 } };
    const plan = targetedPracticePlans(id, record)[0];
    assert.equal(plan.problems.length, 3);
    progress = updateLearning(progress, id, record);
    saveProgress(progress);
    let loaded = loadProgress();
    record = getLearningRecord(loaded, id);
    assert.equal(targetedPracticePlans(id, record)[0].problems.length, 3, 'the same fresh examples return after reload');
    assert.equal(hasLearningGate(loaded, id), false);

    for (const problem of plan.problems) {
      record = checkWorksheet(editWorksheet(record, problem.id, problem.answer), problem, false);
    }
    saveProgress(updateLearning(loaded, id, record));
    loaded = loadProgress();
    assert.equal(hasLearningGate(loaded, id), true);
    resetProgress();
  });
  it('does not clear delayed evidence reviews with a same-day or assisted success', () => {
    const id = MISSIONS[0].id;
    let progress = withLearning(loadProgress(), id);
    progress = updateLearning(progress, id, { ...getLearningRecord(progress, id), completedAt: 1_000 });
    progress = completeMission(progress, id, 2);
    assert.equal(progress.reviewQueue[0].dueAt, 1_000 + SKILL_REVIEW_DELAY_MS);
    assert.equal(completeSkillReview(progress, id).reviewQueue.length, 1);
    progress = updateLearning(progress, id, { ...getLearningRecord(progress, id), confirmedAt: 2_000 });
    assert.equal(completeSkillReview(progress, id).reviewQueue.length, 1);
    progress = updateLearning(progress, id, { ...getLearningRecord(progress, id), confirmedAt: 1_000 + SKILL_REVIEW_DELAY_MS });
    // Passed a day later: the skill is scheduled again in 3 days, then 7, then it is done.
    const day = SKILL_REVIEW_DELAY_MS; const start = 1_000 + day;
    progress = completeSkillReview(progress, id, start);
    assert.deepEqual([progress.reviewQueue[0].stage, progress.reviewQueue[0].dueAt], [1, start + 3 * day]);
    progress = completeSkillReview(progress, id, start + 3 * day);
    assert.deepEqual([progress.reviewQueue[0].stage, progress.reviewQueue[0].dueAt], [2, start + 10 * day]);
    assert.equal(completeSkillReview(progress, id, start + 10 * day).reviewQueue.length, 0);
  });
  it('migrates legacy history without inventing understanding and rejects malformed evidence', () => {
    memory.set('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: [MISSIONS[0].id], starsByMission: { [MISSIONS[0].id]: 3 }, reviewQueue: [],
      learning: { [MISSIONS[0].id]: { practiceDone: true, checks: { build: { passed: true, supported: 'bad', attempts: -4 } }, worksheet: { w1: { draft: '1/0', checkedValue: '1/0' } }, helpUses: -2 } },
    }));
    const progress = loadProgress();
    assert.deepEqual(progress.completedMissionIds, [MISSIONS[0].id]);
    assert.equal(hasLearningGate(progress, MISSIONS[0].id), false);
    assert.equal(isMissionUnlocked(progress, MISSIONS[1].id), false);
    assert.equal(getLearningRecord(progress, MISSIONS[0].id).helpUses, 0);
  });
});
  it('keeps the first fraction lesson focused on equal parts, then layers in unit fractions', () => {
    const fractionNameLesson = getMission('fraction-names');
    assert.match(fractionNameLesson.skill, /The denominator, or bottom number, tells how many equal parts make one whole\. The numerator, or top number, tells how many parts we count\./);
    assert.match(spokenLearningText(fractionNameLesson.skill), /The denominator.*The numerator/);
    assert.match(fractionNameLesson.example.explanation, /The denominator is 4.* The numerator is 3/);

    const equalParts = getWorksheet('equal-parts');
    assert.ok(equalParts.every(problem => problem.model?.kind === 'bar' || problem.area));
    const bars = equalParts.filter(problem => problem.model);
    // Shading is shown only when it marks the part being named; otherwise the child counts, shades, or judges fairness.
    assert.ok(bars.every(problem => (problem.model!.n > 0) === (problem.task?.kind === 'copy')));
    // Equal parts are the same size, not always the same shape: squares whose fourths look different.
    const squares = equalParts.filter(problem => problem.area);
    assert.ok(squares.length >= 3);
    squares.filter(problem => problem.form === 'word').forEach(problem => assert.equal(problem.answer === 'yes', allEqual(problem.area!.cut), problem.id));
    assert.ok(squares.some(problem => problem.answer === 'yes' && new Set(AREA_CUTS[problem.area!.cut].map(piece => piece.shape)).size > 1));
    assert.ok(equalParts.filter(problem => problem.task?.kind === 'count').every(problem => problem.task!.n === problem.model!.d && problem.answer === String(problem.model!.d)));
    const fairness = bars.filter(problem => problem.form === 'word');
    assert.ok(fairness.length >= 2 && fairness.some(problem => problem.answer === 'no') && fairness.some(problem => problem.answer === 'yes'));
    fairness.forEach(problem => {
      const sizes = problem.model!.sizes;
      assert.equal(problem.answer === 'no', !!sizes && new Set(sizes).size > 1, problem.id);
      assert.ok(!problem.modelRequired);
      assert.ok(answerMatches(problem, problem.answer.toUpperCase()) && answerMatches(problem, problem.answer[0]));
      assert.equal(answerMatches(problem, problem.answer === 'yes' ? 'no' : 'yes'), false);
    });
    assert.ok(equalParts.every(problem => problem.modelRequired === !!problem.task));
    assert.ok(equalParts.every(problem => !/jump|number line|shares make the whole/i.test(problem.prompt)));
    assert.ok(bars.every(problem => problem.model!.d <= 6));

    const unitFractions = getWorksheet('unit-fractions');
    assert.ok(unitFractions.every(problem => (problem.modelRequired && problem.model?.kind === 'bar') || problem.area));
    // Coloring 1/4 of this square: one small square or two triangles both count.
    const quarter = { n: 1, d: 4 };
    assert.equal(areaTaskDone('quarter-and-triangles', quarter, [0]), true);
    assert.equal(areaTaskDone('quarter-and-triangles', quarter, [1, 2]), true);
    assert.equal(areaTaskDone('quarter-and-triangles', quarter, [1, 4]), true);
    assert.equal(areaTaskDone('quarter-and-triangles', quarter, [1]), false);
    assert.equal(areaTaskDone('quarter-and-triangles', quarter, [0, 1]), false);
    const onlyTriangles = unitFractions.find(problem => problem.areaTask?.avoid)!;
    assert.equal(areaTaskDone(onlyTriangles.area!.cut, onlyTriangles.areaTask!, [0]), false);
    assert.equal(areaTaskDone(onlyTriangles.area!.cut, onlyTriangles.areaTask!, [5, 6]), true);
    assert.equal(onlyTriangles.answer, '2');
    assert.ok(unitFractions.every(problem => !/jump|number line/i.test(problem.prompt)));

    const fractionNames = getWorksheet('fraction-names');
    assert.ok(fractionNames.every(problem => (problem.modelRequired && problem.model?.kind === 'bar') || problem.area?.cut.startsWith('circle-')));
    // Circles show up too: a pizza that is not fair, a unit fraction slice, and a shaded circle to name.
    assert.ok(equalParts.some(problem => problem.area?.cut === 'circle-unequal' && problem.answer === 'no'));
    const slice = unitFractions.find(problem => problem.area?.cut.startsWith('circle-'))!;
    assert.equal(slice.answer, `1/${AREA_CUTS[slice.area!.cut].length}`);
    const circle = fractionNames.find(problem => problem.area)!;
    assert.equal(circle.answer, `${circle.area!.shaded!.length}/${AREA_CUTS[circle.area!.cut].length}`);
    assert.ok(fractionNames.some(problem => problem.prompt.includes('bar model')));
    assert.ok(fractionNames.every(problem => !/garden bed|paper strip/i.test(problem.prompt)));
  });

  it('offers Yes/No as choices in learning screens while keeping paper prompts writable', () => {
    const yesNoProblems = MISSIONS.flatMap((mission) => getWorksheet(mission.id))
      .filter((problem) => problem.form === 'word');
    assert.ok(yesNoProblems.length > 0);
    for (const problem of yesNoProblems) {
      assert.ok(isYesNoProblem(problem), `${problem.id} should be a Yes/No question`);
      assert.match(yesNoPrompt(problem), /Choose yes or no\.$/);
      assert.match(paperPrompt(problem), /(?:Write|Answer) yes or no\.$/);
      assert.equal(answerMatches(problem, 'Yes'), problem.answer === 'yes');
      assert.equal(answerMatches(problem, 'No'), problem.answer === 'no');
    }
    assert.equal(isYesNoProblem({ form: 'word', answer: 'three' }), false);
  });
  it('requires a student to copy the bar model before worksheet answers unlock', () => {
    const problem = getWorksheet('equal-parts').find(item => item.task?.kind === 'copy')!;
    const markup = renderToStaticMarkup(createElement(WorksheetBarCopy, {
      target: problem.model!,
      disabled: false,
      statusId: 'worksheet-model-status',
      onMatchChange: () => {},
    }));
    assert.match(markup, /class="fq-ll-copy-part/);
    assert.match(markup, /aria-pressed="false"/);
    assert.match(markup, /fq-whole-bracket/);
    assert.match(markup, /<b>one whole<\/b>/);

    const target = problem.model!;
    assert.equal(worksheetBarMatches(target, Array(target.d).fill(false)), false);
    assert.equal(worksheetBarMatches(target, [true, ...Array(target.d - 1).fill(false)]), true);
    assert.equal(worksheetBarMatches(target, [true, true, ...Array(target.d - 2).fill(false)]), false);
    // Counting needs every part tapped; shading needs exactly n parts, anywhere.
    const blank = { ...target, n: 0 };
    assert.equal(barTaskDone({ kind: 'count', n: target.d }, blank, Array(target.d).fill(true)), true);
    assert.equal(barTaskDone({ kind: 'count', n: target.d }, blank, [true, ...Array(target.d - 1).fill(false)]), false);
    assert.equal(barTaskDone({ kind: 'shade', n: 1 }, blank, [...Array(target.d - 1).fill(false), true]), true);
    assert.equal(barTaskDone({ kind: 'shade', n: 1 }, blank, [true, true, ...Array(target.d - 2).fill(false)]), false);
    assert.match(renderToStaticMarkup(createElement(WorksheetBarCopy, { target: blank, task: { kind: 'count', n: target.d }, disabled: false, statusId: 's', onMatchChange: () => {} })), /Tap each part as you count it/);
    assert.equal(paperPrompt(getWorksheet('equal-parts')[0]).startsWith('Count each part.'), true);
    assert.equal(canEnterWorksheetAnswer(true, false), false);
    assert.equal(canEnterWorksheetAnswer(true, true), true);
    assert.equal(canEnterWorksheetAnswer(false, false), true);
  });

describe('revised lessons', () => {
  it('a lesson finished before its questions changed does not re-lock later lessons', () => {
    const id = MISSIONS[0].id;
    const old = { ...EMPTY_PROGRESS, reviewQueue: [], completedMissionIds: [id], starsByMission: { [id]: 3 },
      learning: { [id]: { ...emptyLearningRecord(), practiceDone: true, completedAt: 1_700_000_000_000, worksheet: { w1: { draft: '1/3', checkedValue: '1/3', attempts: 1, supported: false } } } } };
    assert.equal(hasLearningGate(old, id), false);
    assert.equal(isMissionUnlocked(old, MISSIONS[1].id), true);
    // Without a real completion it stays locked.
    assert.equal(isMissionUnlocked({ ...old, learning: { [id]: { ...old.learning![id], completedAt: undefined } } }, MISSIONS[1].id), false);
  });
});

describe('stale answers', () => {
  it('drops a saved answer that cannot fit the revised question', () => {
    const sheet = getWorksheet('equal-parts');
    const word = sheet.find(p => p.form === 'word')!; const count = sheet.find(p => p.answer === '3')!;
    assert.equal(staleDraft(word, '1/3'), true); assert.equal(staleDraft(word, 'No'), false);
    assert.equal(staleDraft(count, '1/3'), true); assert.equal(staleDraft(count, '4'), false);
    assert.equal(staleDraft(sheet.find(p => p.answer.includes('/'))!, '2'), false);
  });
});

describe('read-aloud voice', () => {
  const v = (name: string, lang = 'en-US', localService = true) => ({ name, lang, localService });
  it('picks a gentle natural woman\'s voice over men\'s, novelty and non-English voices', () => {
    assert.equal(pickVoice([v('Alex'), v('Fred'), v('Samantha'), v('Thomas', 'fr-FR')])?.name, 'Samantha');
    assert.equal(pickVoice([v('Microsoft David - English (United States)'), v('Microsoft Zira - English (United States)'), v('Microsoft Jenny Online (Natural) - English (United States)')])?.name, 'Microsoft Jenny Online (Natural) - English (United States)');
    assert.equal(pickVoice([v('Google UK English Male', 'en-GB'), v('Google US English')])?.name, 'Google US English');
    assert.equal(pickVoice([v('Zarvox'), v('Bad News'), v('Kathy')]), null);
    assert.equal(pickVoice([v('Daniel', 'en-GB'), v('Some Voice', 'en-AU')])?.name, 'Some Voice');
    assert.equal(pickVoice([v('Google français', 'fr-FR')]), null);
  });
  it('says fractions the way a teacher would', () => {
    assert.equal(sayFraction(1, 2), 'one half'); assert.equal(sayFraction(3, 4), 'three fourths'); assert.equal(sayFraction(7, 25), 'seven twenty-fifths');
    assert.equal(spokenText('Color 1/4 of the square.'), 'Color one fourth of the square.');
    assert.equal(spokenText('Write 1 2/3 as a fraction.'), 'Write 1 and two thirds as a fraction.');
    assert.equal(spokenText('2/8 = ?/4'), 'two eighths equals how many fourths');
    assert.equal(spokenText('3/8 < 1/2'), 'three eighths is less than one half');
    assert.equal(spokenText('Put <, = or > in the gap: 4/6 __ 1/2.'), 'Put less than, equals or greater than in the gap: four sixths blank one half.');
    assert.equal(spokenText('1/6 + 2/6 = ?'), 'one sixth plus two sixths equals what?');
    assert.equal(spokenText('Fill the blank: 3/4 + ? = 1'), 'Fill the blank: three fourths plus blank equals 1');
    assert.equal(spokenText('5 − 2 = 3. 2 × 3 ÷ 6'), '5 minus 2 equals 3. 2 times 3 divided by 6');
    assert.equal(spokenText('1/7 = ?/14 and 12/24'), 'one seventh equals how many fourteenths and twelve twenty-fourths');
    assert.equal(
      spokenText('The equivalent fractions 1/4 and 2/8 share the same 25 percent spot.'),
      'The equivalent fractions one fourth and two eighths share the same 25 percent spot.',
    );
    assert.equal(spokenText('25% of 8'), '25 percent of 8');
    assert.deepEqual(sentences('One part. Two parts! Ready?'), ['One part.', 'Two parts!', 'Ready?']);
  });
});

describe('redo a finished part', () => {
  it('remembers redo mistakes for the grown-ups, without touching first-try results', () => {
    const id = MISSIONS[0].id;
    const done = completeMission(updateLearning(EMPTY_PROGRESS, id, finished(id)), id, 3);
    let record = startRedo(getLearningRecord(done, id), 'worksheet', 5);
    const row = redoWorksheet(id, record.redo!)[0];
    record = { ...record, redo: { ...record.redo!, worksheet: editWorksheet({ ...emptyLearningRecord(), worksheet: record.redo!.worksheet }, row.id, 'nope').worksheet } };
    record = checkRedoRow(record, row);
    assert.deepEqual(record.redoMisconceptions, { [row.hint]: 1 });
    assert.deepEqual(record.misconceptions, getLearningRecord(done, id).misconceptions, 'lesson mistakes stay as they were');
    const progress = updateLearning(done, id, record);
    const tip = buildParentReport(progress, { xp: 0, day: '2026-10-11', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true }, Array.from({ length: 14 }, (_, i) => `Unit ${i + 1}`), new Date(2026, 9, 11))
      .toPractice.find((t) => t.key === ideaForMission(MISSIONS[0]).key)!;
    assert.equal(tip.inRedos, 1);
    saveProgress(progress);
    assert.deepEqual(getLearningRecord(loadProgress(), id).redoMisconceptions, { [row.hint]: 1 }, 'kept after reload');
  });

  const finished = (id: string): LearningRecord => {
    let record: LearningRecord = { ...emptyLearningRecord(), practiceDone: true, completedAt: 1_700_000_000_000 };
    for (const check of getBuildChecks(id)) record.checks[check.id] = { passed: true, supported: false, attempts: 1 };
    for (const problem of getWorksheet(id)) record = checkWorksheet(editWorksheet(record, problem.id, problem.answer), problem);
    return record;
  };
  const largest = (text: string) => Math.max(0, ...[...text.matchAll(/\d+\/(\d+)/g)].map((m) => Number(m[1])));

  it('gives every lesson valid new numbers that stay in the lesson\'s range', () => {
    for (const mission of MISSIONS) {
      const base = getWorksheet(mission.id);
      const limit = Math.max(...base.map((p) => largest(`${p.prompt} ${p.answer}`)));
      for (let variant = 1; variant <= 4; variant++) {
        const sheet = getWorksheet(mission.id, variant);
        assert.equal(sheet.length, 12);
        assert.deepEqual(sheet.map((p) => p.id), base.map((p) => p.id));
        sheet.forEach((p) => {
          assert.ok(answerMatches(p, p.answer), `${mission.id} v${variant} ${p.id}: ${p.answer}`);
          assert.doesNotMatch(p.prompt + p.answer, /undefined|NaN|Infinity/);
          assert.ok(largest(`${p.prompt} ${p.answer}`) <= limit, `${mission.id} v${variant} ${p.id} goes past the lesson's numbers: ${p.prompt}`);
        });
        const changed = sheet.filter((p, i) => p.prompt !== base[i].prompt || p.answer !== base[i].answer || JSON.stringify(p.model) !== JSON.stringify(base[i].model) || JSON.stringify(p.area) !== JSON.stringify(base[i].area)).length;
        assert.ok(changed >= 8, `${mission.id} v${variant}: only ${changed} new questions`);
      }
    }
    assert.deepEqual(getWorksheet('equal-parts', 0), getWorksheet('equal-parts'), 'variant 0 is the lesson\'s own sheet');
    const sig = (id: string, v: number) => getWorksheet(id, v).map((p) => p.prompt + p.answer + JSON.stringify(p.model));
    for (const mission of MISSIONS) for (let v = 1; v <= 6; v++) {
      const a = sig(mission.id, v), b = sig(mission.id, v + 1);
      assert.ok(a.filter((x, i) => x !== b[i]).length >= 3, `${mission.id}: redo ${v} and ${v + 1} are nearly the same`);
    }
  });

  it('keeps a redo apart from the lesson: completion, unlocks and first-try answers never change', () => {
    const id = MISSIONS[0].id;
    const done = completeMission(updateLearning(EMPTY_PROGRESS, id, finished(id)), id, 3);
    assert.equal(hasLearningGate(done, id), true);
    let record = startRedo(getLearningRecord(done, id), 'worksheet', 5);
    assert.equal(record.redo?.round, 1);
    const sheet = redoWorksheet(id, record.redo!);
    const first = sheet.find((p) => p.answer !== '2')!;
    record = { ...record, redo: { ...record.redo!, worksheet: { [first.id]: { draft: 'wrong', attempts: 3, supported: true } } } };
    const progress = updateLearning(done, id, record);
    assert.equal(hasLearningGate(progress, id), true, 'a wrong redo answer does not undo the lesson');
    assert.equal(worksheetCount(getLearningRecord(progress, id), id), 12);
    assert.equal(isMissionUnlocked(progress, MISSIONS[1].id), true);
    assert.deepEqual(getLearningRecord(progress, id).worksheet, getLearningRecord(done, id).worksheet, 'first-try answers are untouched');

    // Finishing every redo row counts once; a new round has new numbers.
    let worksheet = {};
    for (const p of sheet) worksheet = checkWorksheet(editWorksheet({ ...emptyLearningRecord(), worksheet }, p.id, p.answer), p).worksheet;
    record = { ...record, redo: { ...record.redo!, worksheet } };
    assert.equal(redoWorksheetCount(id, record.redo!), 12);
    assert.equal(redoDone(id, record.redo!), true);
    record = finishRedo(finishRedo(record, 9));
    assert.equal(record.redosFinished, 1);
    const next = startRedo(record, 'worksheet');
    assert.equal(next.redo?.round, 2);
    assert.notDeepEqual(redoWorksheet(id, next.redo!).map((p) => p.answer + p.prompt + JSON.stringify(p.model)), sheet.map((p) => p.answer + p.prompt + JSON.stringify(p.model)));

    // "New question" swaps one row for a different one.
    const swapped = redoWorksheet(id, { ...next.redo!, rowRounds: { w1: 1 } });
    const plain = redoWorksheet(id, next.redo!);
    assert.notDeepEqual(swapped[0], plain[0]);
    assert.deepEqual(swapped.slice(1), plain.slice(1));
  });

  it('redo builds are new targets, not the builds already done', () => {
    for (const id of ['equal-parts', 'equivalent-models', 'compare-same-denominator', 'add-tenths-hundredths', 'simplify-fractions']) {
      const own = getBuildChecks(id).map((c) => JSON.stringify(c.target));
      const redo = redoChecks(id, 1);
      assert.deepEqual(redo.map((c) => c.id), ['redo-1', 'redo-2']);
      assert.notEqual(JSON.stringify(redo[0].target), JSON.stringify(redo[1].target), id);
      if (!['add-tenths-hundredths', 'simplify-fractions'].includes(id)) assert.ok(redo.every((c) => !own.includes(JSON.stringify(c.target))), id);
    }
  });

  it('saves a redo across reloads and drops malformed redo data', () => {
    const id = MISSIONS[0].id;
    let record = startRedo(finished(id), 'builds', 7);
    record = { ...record, redo: { ...record.redo!, checks: { 'redo-1': { passed: true, supported: false, attempts: 1 } } } };
    saveProgress(completeMission(updateLearning(EMPTY_PROGRESS, id, record), id, 3));
    const loaded = getLearningRecord(loadProgress(), id);
    assert.equal(loaded.redo?.part, 'builds');
    assert.equal(loaded.redo?.checks['redo-1']?.passed, true);
    assert.equal(loaded.redoRounds, 1);

    memory.set('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [],
      learning: { [id]: { ...emptyLearningRecord(), redo: { part: 'everything', round: 1, worksheet: {}, checks: {}, rowRounds: {} } } } }));
    assert.equal(getLearningRecord(loadProgress(), id).redo, undefined);
  });
});

describe('square (area) models', () => {
  it('every cut fills the square exactly, and fourths really are fourths', () => {
    for (const cut of Object.keys(AREA_CUTS) as (keyof typeof AREA_CUTS)[]) assert.ok(Math.abs(cutTotal(cut) - 1) < 1e-9, cut);
    for (const cut of ['fourths-squares', 'fourths-strips', 'fourths-triangles', 'fourths-mixed'] as const) {
      assert.equal(AREA_CUTS[cut].length, 4); assert.ok(allEqual(cut), cut);
    }
    assert.equal(allEqual('fourths-unequal'), false); assert.equal(allEqual('strips-unequal'), false);
    for (const cut of ['circle-halves', 'circle-thirds', 'circle-fourths', 'circle-sixths', 'circle-eighths'] as const) assert.ok(allEqual(cut), cut);
    assert.equal(allEqual('circle-unequal'), false);
    assert.equal(areaWhole('circle-sixths'), 'circle'); assert.equal(circleCut(8), 'circle-eighths'); assert.equal(circleCut(5), undefined);
    assert.equal(areaFeedback('circle-fourths', { n: 1, d: 4 }, []), 'Color pieces that make 1/4 of the circle.');
    assert.ok(Math.abs(pieceArea(AREA_CUTS['quarter-and-triangles'][1]) - 1 / 8) < 1e-9);
    assert.ok(Math.abs(shadedArea('eighths-triangles', [0, 1, 2, 3]) - 1 / 2) < 1e-9);
  });
  it('keeps coloring tasks out of the typed level quiz and review', () => {
    for (let seed = 1; seed <= 40; seed++) assert.ok(placementItems(1, seed).every(item => !item.problem.areaTask));
    for (let round = 0; round < 6; round++) for (const id of ['equal-parts', 'unit-fractions', 'equivalent-models']) assert.ok(!/square|triangle/i.test(getReviewCheck(id, round).prompt));
  });
});

describe('Part Finder rounds', () => {
  const sort = PART_FINDER_ROUNDS.find((round) => round.id === 'sort')!;
  const cakeSort = PART_FINDER_ROUNDS.find((round) => round.id === 'sort-cake')!;
  const tile = PART_FINDER_ROUNDS.find((round) => round.id === 'tile')!;
  const match = PART_FINDER_ROUNDS.find((round) => round.id === 'match')!;

  it('sorts 8 equal pieces into 4 fair shares', () => {
    // All 8 triangles are equal eighths, so 2 pieces make each fourth.
    assert.equal(AREA_CUTS[sort.cut].length, 8);
    assert.ok(AREA_CUTS[sort.cut].every((piece) => Math.abs(pieceArea(piece) - 1 / 8) < 1e-9));
    assert.match(sort.prompt, /4 friends share this square cake\. It is cut into 8 equal pieces\./);
    assert.doesNotMatch(sort.prompt, /each share gets|2 pieces each/i, 'the prompt must not give the answer');
    assert.equal(isPartFinderAnswer(sort, [0, 0, 1, 1, 2, 2, 3, 3]), true);
    assert.equal(isPartFinderAnswer(sort, [3, 0, 1, 2, 0, 1, 2, 3]), true, 'any pairing of two equal pieces works');
    assert.equal(isPartFinderAnswer(sort, [0, 0, 0, 1, 1, 2, 2, 3]), false, 'a share with 3 pieces is too big');
    assert.equal(isPartFinderAnswer(sort, [0, 0, 1, 1, 2, 2, 3, -1]), false, 'every piece needs a share');
    assert.equal(isPartFinderAnswer(sort, [0, 0, 1, 1, 2, 2, 3]), false);
    assert.equal(isPartFinderAnswer(sort, [0, 0, 1, 1, 2, 2, 3, 4]), false);
    assert.match(partFinderFeedback(sort, [0, 0, 1, 1, 2, 2, 3, -1]), /1 piece has no friend yet/);
    assert.match(partFinderFeedback(sort, [0, 0, 0, 1, 1, 2, 2, 3]), /Ava gets too much cake/);
    assert.match(partFinderFeedback(sort, [0, 0, 1, 1, 2, 2, 3, 3]), /2\/8 of the cake is the same amount as 1\/4/);
  });

  it('sorts the cake pieces into 4 fair shares even when their shapes differ', () => {
    // quarter-and-triangles: piece 0 is the small square, pieces 1–6 are triangles (1/8 each).
    assert.equal(AREA_CUTS[cakeSort.cut].length, 7);
    assert.equal(isPartFinderAnswer(cakeSort, [0, 1, 1, 2, 2, 3, 3]), true);
    assert.equal(isPartFinderAnswer(cakeSort, [3, 0, 1, 2, 0, 1, 2]), true, 'any pairing of triangles works');
    assert.equal(isPartFinderAnswer(cakeSort, [0, 0, 1, 2, 2, 3, 3]), false, 'square + triangle is too big');
    assert.equal(isPartFinderAnswer(cakeSort, [0, 1, 1, 2, 2, 3, -1]), false, 'every piece needs a share');
    assert.equal(isPartFinderAnswer(cakeSort, [0, 1, 1, 2, 2, 3]), false);
    assert.equal(isPartFinderAnswer(cakeSort, [0, 1, 1, 2, 2, 3, 4]), false);
    assert.match(partFinderFeedback(cakeSort, [0, 1, 1, 2, 2, 3, -1]), /1 piece has no friend yet/);
    assert.match(partFinderFeedback(cakeSort, [0, 0, 1, 2, 2, 3, 3]), /Ava gets too much cake/);
    assert.match(partFinderFeedback(cakeSort, [0, 1, 1, 2, 2, 3, 3]), /Fair! Every friend gets 1\/4/);
  });

  it('gives a hint instead of a bare "try again" when a match is off', () => {
    assert.equal(partFinderSelectionArea(match, [0, 1]), 1 / 4);
    assert.equal(isPartFinderAnswer(match, [1, 1]), false);
    assert.equal(isPartFinderAnswer(match, [99]), false);
    assert.match(partFinderFeedback(match, [0]), /1 more triangle needed/);
    assert.match(partFinderFeedback(match, [0, 1, 2, 3]), /2 triangles too big/);
  });

  it('counts copies of a square or a triangle in a mixed whole, and matches any two eighths to a fourth', () => {
    assert.equal(isPartFinderAnswer(tile, [0]), false, 'a tile needs a copy-count answer');
    assert.equal(isPartFinderAnswer(tile, [0], 4), true, 'the small square: 4 copies');
    assert.equal(isPartFinderAnswer(tile, [1], 8), true, 'a triangle: 8 copies');
    assert.equal(isPartFinderAnswer(tile, [1], 4), false);
    assert.match(partFinderFeedback(tile, [1], 4), /More copies.*2 triangles fit in the small square/);
    assert.equal(isPartFinderAnswer(tile, [0, 1], 4), false, 'the tiling round asks for one piece');
    assert.equal(isPartFinderAnswer(match, [0, 1]), true);
    assert.equal(isPartFinderAnswer(match, [4, 7]), true);
    assert.equal(isPartFinderAnswer(match, [0]), false);
    assert.equal(PART_FINDER_ROUNDS.length, 4);
    assert.deepEqual([...PART_FINDER_LESSONS], ['equal-parts', 'unit-fractions', 'equivalent-models']);
  });

  it('puts every round inside the lesson it teaches, each exactly once', () => {
    assert.deepEqual(partFinderRoundsFor('equal-parts').map((round) => round.id), ['sort', 'sort-cake']);
    assert.deepEqual(partFinderRoundsFor('unit-fractions').map((round) => round.id), ['tile']);
    assert.deepEqual(partFinderRoundsFor('equivalent-models').map((round) => round.id), ['match']);
    assert.deepEqual(partFinderRoundsFor('add-like-denominators'), []);
    const placed = [...PART_FINDER_LESSONS].flatMap((id) => partFinderRoundsFor(id).map((round) => round.id)).sort();
    assert.deepEqual(placed, PART_FINDER_ROUNDS.map((round) => round.id).sort());
    for (const id of PART_FINDER_LESSONS) assert.ok(MISSIONS.some((mission) => mission.id === id), `${id} is a real lesson`);
  });

  it('awards points only for a correct first check and caps the score at four', () => {
    assert.equal(scorePartFinderRound(0, true), 1);
    assert.equal(scorePartFinderRound(0, false), 0);
    assert.equal(scorePartFinderRound(2, true), 3);
    assert.equal(scorePartFinderRound(3, true), 4);
    assert.equal(scorePartFinderRound(4, true), 4);
  });
});

describe('unit-scoped game reset', () => {
  it('removes the selected lessons’ game results while preserving rewards, settings, and other lesson scores', () => {
    const selected = MISSIONS.find((mission) => mission.unit === 1)!;
    const other = MISSIONS.find((mission) => mission.unit === 2)!;
    const state = {
      xp: 140, day: '2026-10-13', answeredToday: 4, dayStreak: 3, lastActiveDay: '2026-10-13', sound: false,
      activity: { '2026-10-13': { minutes: 8, answered: 4 } },
      raceBest: { [selected.id]: 12.3, [other.id]: 19.4 },
      robotBeaten: { [selected.id]: 2, [other.id]: 1 },
      codeLevels: { [selected.id]: 4, [other.id]: 2 },
      sprintBest: { [selected.id]: 34.5, [other.id]: 45.6 },
      partFinderBest: 3,
      preferredLearningVoiceId: 'family-voice',
      breakPreferences: { intervalMinutes: 20 as const, quietMode: true },
      displayPreferences: { textSize: 'large' as const, highContrast: true, reducedMotion: true },
    };

    const reset = resetMissionGameProgress(state, new Set([selected.id]));

    assert.deepEqual(reset.raceBest, { [other.id]: 19.4 });
    assert.deepEqual(reset.robotBeaten, { [other.id]: 1 });
    assert.deepEqual(reset.codeLevels, { [other.id]: 2 });
    assert.deepEqual(reset.sprintBest, { [other.id]: 45.6 });
    assert.equal(reset.xp, state.xp);
    assert.equal(reset.dayStreak, state.dayStreak);
    assert.deepEqual(reset.activity, state.activity);
    assert.equal(reset.partFinderBest, state.partFinderBest);
    assert.equal(reset.preferredLearningVoiceId, state.preferredLearningVoiceId);
    assert.deepEqual(reset.breakPreferences, state.breakPreferences);
    assert.deepEqual(reset.displayPreferences, state.displayPreferences);
    assert.deepEqual(loadFun().codeLevels, reset.codeLevels, 'the scoped game reset is saved on this device');
  });
});

describe('day streak shown in the top bar', () => {
  it('keeps the streak through yesterday and shows 0 once a whole day is missed', () => {
    const base = { ...loadFun(), dayStreak: 4 };
    const now = new Date(2026, 9, 13, 12);
    assert.equal(shownStreak({ ...base, lastActiveDay: '2026-10-13' }, now), 4);
    assert.equal(shownStreak({ ...base, lastActiveDay: '2026-10-12' }, now), 4, 'today is still open to keep it going');
    assert.equal(shownStreak({ ...base, lastActiveDay: '2026-10-11' }, now), 0);
    assert.equal(shownStreak({ ...base, lastActiveDay: null }, now), 0);
  });
});

describe('Part Finder saved game result', () => {
  it('saves the best score, keeps it on replay, and clamps saved values', () => {
    const zeroScore = recordPartFinder(loadFun(), 0);
    assert.equal(loadFun().partFinderBest, 0, 'a completed zero-point game still has a saved result');
    const firstRun = recordPartFinder(zeroScore, 2);
    assert.equal(loadFun().partFinderBest, 2);
    const replay = recordPartFinder(loadFun(), 1);
    assert.equal(replay.partFinderBest, 2, 'a lower replay does not replace the best score');
    assert.equal(recordPartFinder(replay, 99).partFinderBest, 4, 'scores cannot exceed four rounds');
    window.localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ partFinderBest: 99 }));
    assert.equal(loadFun().partFinderBest, 4);
    window.localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: '100', dayStreak: -3, answeredToday: 'x', sound: 'yes', day: 7 }));
    const fixed = loadFun();
    assert.equal(fixed.xp, 0, 'points saved as text are not trusted (they used to show "10010")');
    assert.equal(fixed.dayStreak, 0);
    assert.equal(fixed.answeredToday, 0);
    assert.equal(fixed.sound, true);
    assert.match(fixed.day, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(firstRun.partFinderBest, 2);
  });

  it('keeps game score separate from worksheet and lesson progress', () => {
    const before = loadProgress();
    recordPartFinder(loadFun(), 3);
    const after = loadProgress();
    assert.deepEqual(after, before);
    assert.equal(hasLearningGate(after, MISSIONS[0].id), false);
  });
});

describe('unit challenges', () => {
  const value = (n: number, d: number) => n / d;
  const expected: Record<string, string> = {
    'u1-p1': '3/8', 'u2-p1': `${[0, 2, 3, 5, 7].length}/8`, 'u3-p1': 'D', 'u4-p1': '3/5', 'u5-p1': 'B', 'u6-p1': '4', 'u7-p1': '1 and 3/4', 'u8-p1': '0.35',
    'u1-c1': `${4}/6`, 'u1-c2': '5/8', 'u1-c3': '1/4', 'u1-c4': `${3}/4`, 'u1-c5': String(6 - 2 - 3),
    'u2-c1': '1/2', 'u2-c2': '3/6', 'u2-c3': 'Mia', 'u2-c4': '2/6, 2/4, 2/3', 'u2-c5': 'Kim',
    'u3-c1': '5/8',
    'u3-c2': ['1/2', '2/3', '3/4', '4/5', '5/6'].sort((a, b) => {
      const [an, ad] = a.split('/').map(Number); const [bn, bd] = b.split('/').map(Number);
      return (1 - value(an, ad)) - (1 - value(bn, bd));
    })[0],
    'u3-c3': ['1/3', '1/5', '2/9', '1/4', '3/10'].sort((a, b) => {
      const [an, ad] = a.split('/').map(Number); const [bn, bd] = b.split('/').map(Number);
      return value(an, ad) - value(bn, bd);
    })[0],
    'u3-c4': '1/8', 'u3-c5': '9/18',
    'u4-c1': '3/4', 'u4-c2': '6', 'u4-c3': String([5, 6, 6, 7, 7, 8].filter((q) => q / 4 > 1.5).length), 'u4-c4': '2/5', 'u4-c5': '3',
    'u5-c1': '7/8', 'u5-c2': '2/11', 'u5-c3': '7/8', 'u5-c4': 'Cara', 'u5-c5': '2',
    'u6-c1': '3/6', 'u6-c2': '8', 'u6-c3': '5/14', 'u6-c4': '2', 'u6-c5': '20',
    'u7-c1': '1', 'u7-c2': '2 and 1/4', 'u7-c3': '12', 'u7-c4': '3/8 + 4/8', 'u7-c5': String(Math.floor(7 / 3)),
    'u8-c1': `${30 + 25}/100`, 'u8-c2': '0.3', 'u8-c3': '0.5', 'u8-c4': '2/10 meter', 'u8-c5': `${2 + 1 + 1} ${3 + 2 - 4}/4`,
    // Units 9–14: worked out here, not copied from the challenge text.
    'u9-p1': '2/3', 'u9-c1': `${5 * 1}/6 meter`,
    'u9-c2': String((3 * 20) / 4),
    'u9-c3': ['2/5', '3/7', '4/9', '5/8', '1/3'].find((f) => { const [t, b] = f.split('/').map(Number); return t / b > 0.5 && t / b < 1; })!,
    'u9-c4': ['Ana', 'Ben', 'Cal'][[2 / 3, 3 / 4, 5 / 6].indexOf(Math.max(2 / 3, 3 / 4, 5 / 6))],
    'u9-c5': `${7 - 1}/8`,
    'u10-p1': '1/4', 'u10-c1': String(1.5 + 2.5), 'u10-c2': `${3 + 2}/6`, 'u10-c3': '1 1/2',
    'u10-c4': ['1/3 + 1/4', '2/5 + 1/2', '3/8 + 1/2', '5/6 + 1/2'].find((sum) => sum.split(' + ').reduce((total, f) => { const [t, b] = f.split('/').map(Number); return total + t / b; }, 0) > 1)!, 'u10-c5': '1/4 liter',
    'u11-p1': '6/12', 'u11-c1': String(20 / 4), 'u11-c2': '2/3 × 12', 'u11-c3': '6/12', 'u11-c4': String(30 - 30 / 5 - 30 / 3), 'u11-c5': String(((24 / 4) * 3) / 2),
    'u12-p1': `${(3 / 4) * 100} centimeters`, 'u12-c1': `1/${2 * 4}`, 'u12-c2': String(4 * 3), 'u12-c3': '1 1/8 meters',
    'u12-c4': ['Team A', 'Team B', 'Team C', 'Team D', 'Team E'][[2 / 5, 3 / 8, 1 / 3, 3 / 10, 1 / 4].indexOf(Math.max(2 / 5, 3 / 8, 1 / 3, 3 / 10, 1 / 4))],
    'u12-c5': `${(1 + 1 + 2 + 4 + 4 + 6) / 6}/8`,
    'u13-p1': '3/10', 'u13-c1': '3/6', 'u13-c2': `${(3 * 2) / 3} cups`,
    'u13-c3': `${3 * 2}/${4 * 3} square meter`,
    'u13-c4': `${12 - 3 - 4}/12`, 'u13-c5': '1 1/8 cups',
    'u14-p1': '40%', 'u14-c1': `${(3 / 4) * 100}%`, 'u14-c2': '1/2, 55%, 0.6', 'u14-c3': `${(17 / 20) * 100}%`, 'u14-c4': `${100 - 40 - 30}%`, 'u14-c5': `${10 - 3 - 4}0%`,
    'u15-p1': String((6 / 2) * 6), 'u15-c1': String(6 * 4), 'u15-c2': `${2 + 3}/7`, 'u15-c3': String((12 / 3) * 5), 'u15-c4': String(36 - 36 / 4 - (36 - 36 / 4) / 3), 'u15-c5': String((3 / 4) / (1 / 8)),
  };

  it('has a picture puzzle plus five questions worth 3, 3, 3, 4, 4 and 5 points in every unit', () => {
    for (let unit = 1; unit <= 15; unit++) {
      assert.deepEqual(CHALLENGES[unit].map((item) => item.points), [3, 3, 3, 4, 4, 5]);
      assert.ok(CHALLENGES[unit][0].figure, `unit ${unit} starts with a picture puzzle`);
      assert.equal(challengeMaxPoints(unit), 22);
    }
  });

  it('says why each wrong choice is wrong in the line plot, tenths and hundredths, and sharing puzzles', () => {
    const why = (id: string, choice: string) => {
      const item = Object.values(CHALLENGES).flat().find((puzzle) => puzzle.id === id)!;
      return wrongChoiceReason(item.prompt, item.choices, item.correct, item.choices.indexOf(choice));
    };
    assert.equal(why('u4-c3', '1'), WHY.otherSide);
    assert.equal(why('u4-c3', '5'), WHY.onTheLength);
    assert.equal(why('u4-c3', '6'), WHY.allXs);
    assert.equal(why('u8-c1', '28/110'), WHY.acrossAdd);
    assert.equal(why('u8-c1', '28/100'), WHY.tenthsAsHundredths);
    assert.equal(why('u8-c1', '25/100'), WHY.oneAmount);
    assert.equal(why('u9-c5', '8/8'), WHY.addedLengths);
    assert.equal(why('u9-c5', '7/8'), WHY.oneLength);
    assert.equal(why('u9-c5', '4/8'), WHY.wrongMark);
    assert.equal(why('u12-c1', '1/6'), WHY.addedForShare);
    assert.equal(why('u12-c1', '1/2'), WHY.notSplit);
    assert.equal(why('u12-c1', '4/2'), WHY.timesNotShare);
    assert.equal(why('u12-c5', '18/8'), WHY.total);
    assert.equal(why('u12-c5', '6/8'), WHY.oneCup);
    assert.equal(why('u12-c5', '1/8'), WHY.oneCup);
  });

  it('marks independently computed answers as correct', () => {
    for (const items of Object.values(CHALLENGES)) {
      for (const item of items) {
        assert.equal(item.choices.length, 4, item.id);
        assert.equal(new Set(item.choices).size, 4, `${item.id} has duplicate choices`);
        assert.equal(item.choices[item.correct], expected[item.id], item.id);
      }
    }
  });
});

describe('printed challenge answer keys', () => {
  it('includes the guided steps and their answers', () => {
    const markup = renderToStaticMarkup(createElement(AnswerKey, { mission: getMission('equal-parts') }));

    assert.match(markup, /Sam folds the strip in half once/);
    assert.match(markup, /He folds it in half again/);
    assert.match(markup, /The strip opens into 4 equal parts/);
  });
});

describe('long problems', () => {
  it('splits stories without breaking decimals or fractions', () => {
    assert.deepEqual(
      splitStory('A ribbon is 9/10 m long. You cut off 4/10 m. Then you cut off 3/10 m. How much is left?'),
      { lines: ['A ribbon is 9/10 m long.', 'You cut off 4/10 m.', 'Then you cut off 3/10 m.'], question: 'How much is left?' },
    );
    assert.deepEqual(splitStory('Which is bigger, 0.4 or 0.35?'), { lines: [], question: 'Which is bigger, 0.4 or 0.35?' });
    assert.equal(splitStory('3/5 = 12/?. What is the missing number?').lines.length, 0);
  });

  it('the question Listen reads the story lines and the question, never the quick review tag', () => {
    // Reported: "Quick review · Equal-area partitions" was read aloud before "This circle is on a classroom poster."
    const prompt = 'Quick review · Equal-area partitions: This circle is on a classroom poster. Color 2 parts. What fraction of the circle is colored?';
    assert.equal(promptListenText(prompt), 'This circle is on a classroom poster. Color 2 parts. What fraction of the circle is colored?');
    assert.equal(promptListenText('Color 2 parts. What fraction is colored?'), 'Color 2 parts. What fraction is colored?');
  });

  it('places one question Listen control beside the heading for the whole story', () => {
    const markup = renderToStaticMarkup(createElement(StoryPrompt, {
      prompt: 'A ribbon is 9/10 m long. You cut off 4/10 m. Then you cut off 3/10 m. How much is left?',
      id: 'question-title',
    }));
    assert.equal((markup.match(/class="fq-learning-listen"/g) ?? []).length, 1);
    assert.match(markup, /aria-label="Audio unavailable for the question"/);
    assert.match(markup, /class="fq-story-question-heading"[^>]*>.*<h1 id="question-title".*<button[^>]*class="fq-learning-listen"/);
    const storyList = markup.match(/<ol class="fq-story"[\s\S]*?<\/ol>/)?.[0] ?? '';
    assert.doesNotMatch(storyList, /fq-learning-listen/, 'story sentences do not each get their own inline control');
  });

  it('gives each walk-through step four distinct choices and the authored answer', () => {
    const expectedSteps: Record<string, string[]> = {
      'u1-c3': ['2', '4', '1/4'], 'u1-c5': ['6', '5', '1'],
      'u2-c3': ['1/4', 'Mia'], 'u2-c4': ['Cut in 6', 'Cut in 3'],
      'u2-c5': ['3/6', '3/4', '3/4'], 'u4-c5': ['6/8 meter', '9/8 meters', 'Yes'],
      'u5-c4': ['1/4', '1/6', '1/6'], 'u6-c4': ['1/4', '2'],
      'u7-c5': ['3', '2', '2 and 1/3'], 'u8-c4': ['5/10 meter', '2/10 meter'], 'u8-c5': ['3', '5/4', '4 1/4'],
      'u9-c4': ['8/12', '9/12', '10/12'], 'u9-c5': ['7/8', '1/8', '6/8'],
      'u10-c3': ['2 5/4', '1 2/4', '1 1/2'], 'u10-c4': ['More than 1/2', 'More than 1'], 'u10-c5': ['10/12', '4/12 and 3/12', '3/12'],
      'u11-c4': ['6', '10', '14'], 'u11-c5': ['6', '18', '9'],
      'u12-c3': ['4/8', '2/8', '9/8'], 'u12-c4': ['2/5', '3/8', '2/5'], 'u12-c5': ['18/8', '3/8'],
      'u13-c4': ['7', '5', '5/12'], 'u13-c5': ['3/8 cup', '3/4 + 3/8', '9/8'],
      'u14-c3': ['85/100', '85%'], 'u14-c4': ['40%', '30%', '30%'], 'u14-c5': ['7/10', '3/10', '30%'],
      'u15-c3': ['4', '20'], 'u15-c4': ['9', '27', '18'], 'u15-c5': ['6/8', '6'],
    };
    for (const items of Object.values(CHALLENGES)) {
      for (const item of items) {
        if (!item.steps) continue;
        assert.deepEqual(item.steps.map((step) => step.choices[step.correct]), expectedSteps[item.id], `${item.id} steps`);
        for (const step of item.steps) assert.equal(new Set(step.choices).size, 4, `${item.id}: ${step.prompt}`);
      }
    }
    assert.equal(Object.values(CHALLENGES).flat().filter((item) => item.steps).length, Object.keys(expectedSteps).length);
  });
});

describe('question generator', () => {
  const fractionValue = (raw: string) => {
    // "3/4" or a mixed number, "1 1/4", maybe with its unit ("3/4 liter").
    const text = withoutUnit(raw);
    const [whole, part] = text.includes(' ') ? text.split(' ') : ['0', text];
    const [n, d] = part.split('/').map(Number);
    return Number(whole) + n / d;
  };
  const ids = (id: string) => getMission(id).questions.map((question) => question.id);
  // Units 9–14: every generated question type is re-solved here from its own numbers.
  const num = (text: string): number => {
    const t = withoutUnit(text).replace(/ (m|cups?|liters?)$/, '');
    if (t.endsWith('%')) return Number(t.slice(0, -1)) / 100;
    const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(t); if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
    const frac = /^(\d+)\/(\d+)$/.exec(t); if (frac) return Number(frac[1]) / Number(frac[2]);
    return Number(t);
  };
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const PER: Record<string, number> = { 'inches/foot': 12, 'minutes/hour': 60, 'seconds/minute': 60, 'hours/day': 24, 'milliliters/liter': 1000,
    'grams/kilogram': 1000, 'centimeters/meter': 100, 'ounces/pound': 16, 'cents/dollar': 100 };
  const verifyLater = (question: PracticeQuestion): boolean => {
    const answer = question.choices[question.correctChoice]; const p = question.prompt; const N = (x: string) => Number(x);
    let expected: number | string | null = null; let m: RegExpExecArray | null;
    if ((m = /^Write (\d+)\/(\d+) in simplest form\.$/.exec(p))) {
      const [t, b] = answer.split('/').map(Number); const g = (x: number, y: number): number => (y ? g(y, x % y) : x);
      assert.equal(g(t, b), 1, `${p} → ${answer} is not simplest`); expected = N(m[1]) / N(m[2]);
    } else if ((m = /^Fill the blank: (\d+)\/(\d+) = (\d+)\/\?$/.exec(p))) expected = (N(m[2]) * N(m[3])) / N(m[1]);
    else if ((m = /^Put (.+) in order, (smallest|biggest) first\.$/.exec(p))) {
      const items = m[1].split(', ').sort((x, y) => (num(x) - num(y)) * (m![2] === 'smallest' ? 1 : -1));
      expected = items.join(', ');
    } else if ((m = /^(\d+) (\d+)\/(\d+) \+ (\d+)\/(\d+) = \?$/.exec(p))) expected = N(m[1]) + N(m[2]) / N(m[3]) + N(m[4]) / N(m[5]);
    else if ((m = /^(\d+) (\d+)\/(\d+) − 1 (\d+)\/(\d+) = \?$/.exec(p))) expected = N(m[1]) + N(m[2]) / N(m[3]) - 1 - N(m[4]) / N(m[5]);
    else if ((m = /^What is (\d+)\/(\d+) of (\d+) cards\?$/.exec(p))) expected = (N(m[3]) / N(m[2])) * N(m[1]);
    else if ((m = /^(\d+) × (\d+)\/(\d+) = \?$/.exec(p))) expected = (N(m[1]) * N(m[2])) / N(m[3]);
    else if ((m = /^What is (\d+)\/(\d+) of (\d+)\/(\d+)\?$/.exec(p))) expected = (N(m[1]) / N(m[2])) * (N(m[3]) / N(m[4]));
    else if ((m = /^How many 1\/(\d+) cup scoops fill (\d+) cups?\?$/.exec(p))) expected = N(m[1]) * N(m[2]);
    else if ((m = /^A ribbon is (\d+) (?:m|meters) long\. How long is (\d+)\/(\d+) of it\?$/.exec(p))) expected = (N(m[1]) / N(m[3])) * N(m[2]);
    else if ((m = /^A board is (\d+)\/(\d+) m\. Another is (\d+)\/(\d+) m\./.exec(p))) expected = N(m[1]) / N(m[2]) + N(m[3]) / N(m[4]);
    else if ((m = /^(\d+) (?:loaf is|loaves are|pizza is|pizzas are) shared fairly by (\d+) friends/.exec(p)) || (m = /^(\d+) ÷ (\d+) = \?$/.exec(p))) expected = N(m[1]) / N(m[2]);
    else if ((m = /^A bag has (\d+) marbles\. (\d+) (?:is|are) green/.exec(p))) expected = N(m[2]) / N(m[1]);
    else if (p === 'What fraction of the tile is shaded?' && question.model.kind === 'bars') expected = question.model.bars[0].numerator / question.model.bars[0].denominator;
    else if (/^What fraction of the (circle|grid) is shaded\?$/.test(p) && question.model.kind === 'area') expected = shadedArea(question.model.cut, question.model.shaded);
    else if ((m = /^(\d+)\/(\d+) is marked on a line\. Which fraction with a denominator of (\d+)/.exec(p))) {
      assert.equal(N(answer.split('/')[1]), N(m[3]), p); expected = N(m[1]) / N(m[2]);
    } else if ((m = /^A recipe uses (\d+)\/(\d+) cup of flour\. How much flour do (\d+) batches need\?$/.exec(p))) expected = (N(m[1]) * N(m[3])) / N(m[2]);
    else if ((m = /^Write (\d+)\/(\d+) as a percent\.$/.exec(p))) { assert.ok(answer.endsWith('%'), p); expected = N(m[1]) / N(m[2]); }
    else if ((m = /^Write (\d+)% as a fraction\.$/.exec(p))) expected = N(m[1]) / 100;
    else if ((m = /^Write (\d+)\/(\d+) as a decimal\.$/.exec(p))) { assert.match(answer, /^\d+\.\d+$/, p); expected = N(m[1]) / N(m[2]); }
    else if ((m = /^(\d+)\/(\d+) of a garden is planted\. Then (\d+)\/(\d+) more/.exec(p)) || (m = /^Mia reads (\d+)\/(\d+) of a book on Monday and (\d+)\/(\d+) on Tuesday/.exec(p))) expected = 1 - N(m[1]) / N(m[2]) - N(m[3]) / N(m[4]);
    // Unit 15: find the whole, fix a mistake, fraction of the rest, and fraction ÷ fraction.
    else if ((m = /^(\d+) stickers are (\d+)\/(\d+) of a pack\. How many stickers are in the pack\?$/.exec(p))) expected = (N(m[1]) / N(m[2])) * N(m[3]);
    else if ((m = /^(?:Sam|Kim) says (\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = \d+\/\d+\. What is the right answer\?$/.exec(p))) expected = N(m[1]) / N(m[2]) + (m[3] === '+' ? 1 : -1) * N(m[4]) / N(m[5]);
    else if ((m = /^Ana has (\d+) stickers\. She gives away (\d+)\/(\d+) of them\. Then she gives away (\d+)\/(\d+) of the rest\. How many are left\?$/.exec(p))) expected = N(m[1]) * (1 - N(m[2]) / N(m[3])) * (1 - N(m[4]) / N(m[5]));
    else if ((m = /^How many 1\/(\d+) cup scoops fill (\d+)\/(\d+) cup\?$/.exec(p))) expected = (N(m[2]) / N(m[3])) * N(m[1]);
    else if ((m = /^How many wholes are (\d+)\/(\d+)\?$/.exec(p)) || (m = /^Write (\d+)\/(\d+) as a whole number\.$/.exec(p))) expected = N(m[1]) / N(m[2]);
    else if ((m = /^Write (\d+) whole bars as a fraction with a denominator of 1\.$/.exec(p))) expected = N(m[1]);
    // Later lessons' redo numbers: adding and taking away unlike fractions and mixed numbers, quick compares, measures.
    else if ((m = /^(?:Rename: .+\. Then )?(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = \?$/.exec(p))) expected = N(m[1]) / N(m[2]) + (m[3] === '+' ? 1 : -1) * N(m[4]) / N(m[5]);
    else if ((m = /^(?:Rename: .+\. Then )?(\d+) (\d+)\/(\d+) ([+−]) (?:(\d+) )?(\d+)\/(\d+) = \?$/.exec(p))) expected = N(m[1]) + N(m[2]) / N(m[3]) + (m[4] === '+' ? 1 : -1) * (N(m[5] ?? '0') + N(m[6]) / N(m[7]));
    else if ((m = /^A rectangular garden is (\d+) (\d+)\/(\d+) meters by (\d+) (\d+)\/(\d+) meters\. What is its area\?$/.exec(p))) expected = (N(m[1]) + N(m[2]) / N(m[3])) * (N(m[4]) + N(m[5]) / N(m[6]));
    else if ((m = /^How many (\w+) are in (\d+)\/(\d+) (\w+)\?$/.exec(p)) && PER[`${m[1]}/${m[4]}`]) expected = PER[`${m[1]}/${m[4]}`] * N(m[2]) / N(m[3]);
    else if ((m = /^A (?:bottle has|bag weighs) (\d+)\/(\d+) (?:liter|kilogram)\. How many (?:milliliters|grams)/.exec(p))) expected = 1000 * N(m[1]) / N(m[2]);
    else if ((m = /^A (\d+)-(?:kilogram bag|liter jug) is (\d+)\/(\d+) full\. How many (?:grams|milliliters)/.exec(p))) expected = 1000 * N(m[1]) * N(m[2]) / N(m[3]);
    else if ((m = /^A (?:ribbon is|jug has|board is) (\d+)\/(\d+) (?:meter|liter)\.? (?:and another is|You add|Another is) (\d+)\/(\d+) (?:meter|liter)/.exec(p))) expected = N(m[1]) / N(m[2]) + N(m[3]) / N(m[4]);
    else if ((m = /^Without finding the exact (?:sum|difference), compare (\d+)\/(\d+) ([+−]) (\d+)\/(\d+) with 1: __ 1\.$/.exec(p))) {
      const total = N(m[1]) / N(m[2]) + (m[3] === '+' ? 1 : -1) * N(m[4]) / N(m[5]);
      assert.equal(answer, `${m[1]}/${m[2]} ${m[3]} ${m[4]}/${m[5]} ${total < 1 ? '<' : '>'} 1`, p); return true;
    } else if ((m = /^Move the (?:scale )?slider to (\d+)\/(\d+)\. Without multiplying, compare \d+\/\d+ × (\d+) with \d+: __ \d+\.$/.exec(p))) {
      const sign = N(m[1]) < N(m[2]) ? '<' : N(m[1]) === N(m[2]) ? '=' : '>';
      assert.equal(answer, `${m[1]}/${m[2]} × ${m[3]} ${sign} ${m[3]}`, p); return true;
    } else if ((m = /^Compare: ([\d.]+) __ ([\d.]+)\.$/.exec(p))) {
      assert.equal(answer, `${m[1]} ${N(m[1]) < N(m[2]) ? '<' : N(m[1]) > N(m[2]) ? '>' : '='} ${m[2]}`, p); return true;
    }
    // Unit 11 grids, scaling, sharing and fitting, and fractions as division.
    const amountOf = (text: string) => num(text.replace(/ (?:pounds?|bags|scoops|bottles|cups?|liters?)$/, ''));
    const factorWords = (k: number, amount: string) => `${near(k, 1) ? 'Equal to' : k < 1 ? 'Less than' : 'More than'} ${amount}`;
    const product = (text: string) => { const [f, w] = text.split(' × '); return num(f) * num(w); };
    if ((m = /^(\d+)\/(\d+) × (\d+)\/(\d+) = \?$/.exec(p))) expected = (N(m[1]) * N(m[3])) / (N(m[2]) * N(m[4]));
    else if ((m = /^How many 1\/(\d+)-cup scoops fill (\d+) cups?\? (\d+) ÷ 1\/(\d+) = \?$/.exec(p))) { assert.equal(m[3], m[2], p); assert.equal(m[4], m[1], p); expected = N(m[1]) * N(m[2]); }
    else if ((m = /^Between which two whole numbers is (\d+)\/(\d+)\?$/.exec(p))) { const low = Math.floor(N(m[1]) / N(m[2])); assert.equal(answer, `${low} and ${low + 1}`, p); return true; }
    else if ((m = /^Which one is (more|less) than (\d+)\?$/.exec(p))) {
      const fits = question.choices.filter((c) => (m![1] === 'more' ? product(c) > N(m![2]) + 1e-9 : product(c) < N(m![2]) - 1e-9));
      assert.deepEqual(fits, [answer], p); return true;
    } else if ((m = /^Is (\d+)\/(\d+) × (.+) more or less than \3\?$/.exec(p))) { assert.equal(answer, factorWords(N(m[1]) / N(m[2]), m[3]), p); return true; }
    else if ((m = /^Without multiplying, compare (\d+)\/(\d+) × (.+) with \3: __ \3\.$/.exec(p))) {
      const k = N(m[1]) / N(m[2]); assert.equal(answer, `${m[1]}/${m[2]} × ${m[3]} ${near(k, 1) ? '=' : k < 1 ? '<' : '>'} ${m[3]}`, p); return true;
    } else if ((m = /^Pip has 1\/(\d+) \w+ of \w+ for (\d+) friends\. Each friend gets the same amount\. Is this sharing or fitting\?$/.exec(p))) { assert.equal(answer, 'Sharing', p); return true; }
    else if ((m = /^Pip has \d+ \w+ of \w+\. Each \w+ holds 1\/\d+ \w+\. Is this sharing or fitting\?$/.exec(p))) { assert.equal(answer, 'Fitting', p); return true; }
    else if ((m = /^1\/(\d+) \w+ of \w+ is shared by (\d+) friends\. How much does each get\?$/.exec(p))) { assert.ok(near(amountOf(answer), 1 / N(m[1]) / N(m[2])), p); return true; }
    else if ((m = /^How many 1\/(\d+)-\w+ \w+ can be filled from (\d+) \w+ of \w+\?$/.exec(p))) { assert.ok(near(amountOf(answer), N(m[1]) * N(m[2])), p); return true; }
    if (expected === null) return false;
    if (typeof expected === 'string') assert.equal(answer.replace(/[\s,<>]/g, ''), expected.replace(/[\s,<>]/g, ''), p);
    else assert.ok(near(num(answer), expected), `${p} → ${answer}, expected ${expected}`);
    // Wrong choices must really be wrong.
    question.choices.forEach((c, i) => { if (i !== question.correctChoice && typeof expected === 'number' && !Number.isNaN(num(c))) assert.ok(!near(num(c), expected), `${p}: "${c}" is also right`); });
    return true;
  };
  const verify = (question: PracticeQuestion): boolean => {
    const answer = question.choices[question.correctChoice];
    // Four choices (A–D); sign questions add a worded slip.
    const want = 4;
    assert.equal(question.choices.length, want, `${question.id}: ${question.prompt} | ${question.choices.join(' / ')}`);
    assert.equal(new Set(question.choices.map((choice) => choice.trim())).size, want, question.id);
    for (const c of question.choices) assert.ok(c.trim().split(/\s+/).length <= 6, `${question.id}: "${c}" is too long for an answer choice`);
    let match = /^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = \?$/.exec(question.prompt);
    if (match) {
      const result = Number(match[1]) / Number(match[2]) + (match[3] === '+' ? 1 : -1) * Number(match[4]) / Number(match[5]);
      assert.ok(Math.abs(fractionValue(answer) - result) < 1e-9, question.prompt);
      return true;
    }
    // Two-step stories: take away then add, and add then compare.
    match = /^A jug has (\d+)\/(\d+) liter\. Sam drinks (\d+)\/\2 liter, then adds (\d+)\/\2 liter\. How much is in the jug now\?$/.exec(question.prompt);
    if (match) {
      assert.equal(fractionValue(answer), (Number(match[1]) - Number(match[3]) + Number(match[4])) / Number(match[2]), question.prompt);
      return true;
    }
    match = /^Ana ran (\d+)\/(\d+) mile and then (\d+)\/\2 mile\. Ben ran (\d+)\/\2 mile\. How much farther did Ana run\?$/.exec(question.prompt);
    if (match) {
      assert.equal(fractionValue(answer), (Number(match[1]) + Number(match[3]) - Number(match[4])) / Number(match[2]), question.prompt);
      return true;
    }
    // A fraction of a number written with × ("3/4 × 12 = ?", or the story with "Solve 3/4 × 12").
    match = /^(\d+)\/(\d+) × (\d+) = \?$/.exec(question.prompt) ?? /Solve (\d+)\/(\d+) × (\d+) to find/.exec(question.prompt);
    if (match) {
      assert.equal(Number(answer), (Number(match[3]) / Number(match[2])) * Number(match[1]), question.prompt);
      return true;
    }
    match = /^What is (\d+)\/(\d+) of (\d+)\?$/.exec(question.prompt);
    if (match) {
      assert.equal(Number(answer), (Number(match[3]) / Number(match[2])) * Number(match[1]), question.prompt);
      return true;
    }
    match = /^Is (\d+)\/(\d+) more or less than 1\/2\?$/.exec(question.prompt);
    if (match) {
      assert.equal(answer, Number(match[1]) / Number(match[2]) > 0.5 ? 'More than 1/2' : 'Less than 1/2', question.prompt);
      return true;
    }
    match = /^Is (\d+)\/(\d+) closest to 0, 1\/2 or 1\?$/.exec(question.prompt);
    if (match) {
      const value = Number(match[1]) / Number(match[2]);
      const nearest = ['0', '1/2', '1'].sort((a, b) =>
        Math.abs((a === '1/2' ? 0.5 : Number(a)) - value) - Math.abs((b === '1/2' ? 0.5 : Number(b)) - value),
      )[0];
      assert.equal(answer, nearest, question.prompt);
      return true;
    }
    match = /^Fill the blank: (\d+)\/(\d+) = \?\/(\d+)$/.exec(question.prompt);
    if (match) {
      assert.equal(Number(answer), (Number(match[1]) * Number(match[3])) / Number(match[2]), question.prompt);
      return true;
    }
    match = /^Fill the blank: (\d+)\/(\d+) \+ \? = 1$/.exec(question.prompt);
    if (match) {
      assert.ok(Math.abs(fractionValue(answer) + Number(match[1]) / Number(match[2]) - 1) < 1e-9, question.prompt);
      return true;
    }
    if (question.prompt === 'Which is closest to 1/2?') {
      const nearest = [...question.choices].sort((a, b) => Math.abs(fractionValue(a) - 0.5) - Math.abs(fractionValue(b) - 0.5))[0];
      assert.equal(answer, nearest, question.prompt);
      return true;
    }
    match = /^Which is (bigger|smaller), (\d+\/\d+) or (\d+\/\d+)\?$/.exec(question.prompt);
    if (match) {
      const [first, second] = [fractionValue(match[2]), fractionValue(match[3])];
      if (Math.abs(first - second) < 1e-9) assert.equal(answer, 'They are equal', question.prompt);
      else assert.equal(answer, (match[1] === 'bigger') === (first > second) ? match[2] : match[3], question.prompt);
      return true;
    }
    match = /^Which is the same as (\d+\/\d+)\?$/.exec(question.prompt);
    if (match) {
      assert.ok(Math.abs(fractionValue(answer) - fractionValue(match[1])) < 1e-9, question.prompt);
      return true;
    }
    match = /^Write (\d+)\/(10|100) as a decimal\.$/.exec(question.prompt);
    if (match) {
      assert.equal(Number(answer), Number(match[1]) / Number(match[2]), question.prompt);
      return true;
    }
    match = /^What fraction is (0\.\d+)\?$/.exec(question.prompt);
    if (match) {
      assert.ok(Math.abs(fractionValue(answer) - Number(match[1])) < 1e-9, question.prompt);
      return true;
    }
    match = /^Each jump is 1\/(\d+)\. What is (\d+) jumps from 0\?$/.exec(question.prompt);
    if (match) {
      assert.equal(answer, `${match[2]}/${match[1]}`, question.prompt);
      return true;
    }
    match = /^What is (\d+)\/(\d+) as wholes and a fraction\?$/.exec(question.prompt);
    if (match) {
      const [n, d] = [Number(match[1]), Number(match[2])];
      assert.equal(answer, `${Math.floor(n / d)} and ${n % d}/${d}`, question.prompt);
      return true;
    }
    match = /^Which adds up to (\d+)\/(\d+)\?$/.exec(question.prompt);
    if (match) {
      const sum = answer.split(' + ').reduce((total, part) => total + fractionValue(part), 0);
      assert.ok(Math.abs(sum - fractionValue(`${match[1]}/${match[2]}`)) < 1e-9, question.prompt);
      return true;
    }
    const sourceId = /^(.*?)-(?:x\d+|g\d+-\d+)$/.exec(question.id)?.[1];
    const sourceMission = sourceId ? MISSIONS.find((mission) => mission.id === sourceId) : undefined;
    // Practice more draws on redo sheets 1-4. Some rows share words and differ only in the picture (a ruler), so any
    // row with these words may be the source.
    const sources = sourceMission?.unit && sourceMission.unit >= 9
      ? [0, 1, 2, 3, 4].flatMap((variant) => getWorksheet(sourceMission.id, variant)).filter((problem) => asChoicePrompt(problem.prompt) === question.prompt)
      : [];
    if (sources.length) {
      const key = (text: string) => withoutUnit(text).split(/\s*[,<>]\s*/).join(',');
      assert.ok(sources.some((problem) => key(signOnly(answer, problem.answer)) === key(problem.answer)), `${question.id} should preserve its worksheet answer key: ${answer}`);
      return true;
    }
    return false;
  };

  it('keeps the 12 "Practice more" questions fixed for every lesson', () => {
    const positions = new Set<number>();
    for (const mission of MISSIONS) {
      const bank = getExtraPractice(mission.id, ids(mission.id));
      assert.equal(bank.length, 12, mission.id);
      assert.deepEqual(
        getExtraPractice(mission.id, ids(mission.id)).map((question) => question.prompt),
        bank.map((question) => question.prompt),
        `${mission.id} is stable across visits`,
      );
      for (const question of bank) {
        const independentlyVerified = verify(question);
        if (mission.unit >= 9 && !independentlyVerified) {
          assert.ok(verifyLater(question), `${question.id}: no independent check for "${question.prompt}"`);
        }
        positions.add(question.correctChoice);
        assert.ok(mission.questions.some((base) => base.id === question.reviewQuestionId), question.id);
      }
    }
    assert.deepEqual([...positions].sort(), [0, 1, 2, 3]);
  });

  it('generates thousands of fresh questions with valid answers and no duplicate choices', () => {
    let total = 0;
    let checked = 0;
    for (const mission of MISSIONS) {
      assert.ok(hasGenerator(mission.id), mission.id);
      for (let seed = 1; seed <= 150; seed++) {
        const round = generateQuestions(mission.id, ids(mission.id), seed, 10);
        assert.equal(round.length, 10, `${mission.id} seed ${seed}`);
        for (const question of round) {
          total++;
          const independentlyVerified = verify(question);
          if (independentlyVerified) {
            checked++;
          } else if (mission.unit >= 9) {
            assert.ok(verifyLater(question), `${question.id}: no independent check for "${question.prompt}"`);
            checked++;
          }
        }
      }
    }
    assert.ok(total >= 40_000, `generated ${total}`);
    assert.ok(checked / total > 0.7, `independently checked ${checked} of ${total}`);
  });

  it('varies generated questions for different seeds', () => {
    const first = generateQuestions('add-like-denominators', ids('add-like-denominators'), 11, 10).map((question) => question.prompt).join();
    const second = generateQuestions('add-like-denominators', ids('add-like-denominators'), 12, 10).map((question) => question.prompt).join();
    assert.notEqual(first, second);
  });
});

describe('quality audit fixes', () => {
  const GRADE_DENOMINATORS = new Set([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 100]);
  it('every build and review target can be built (lines grow to fit hundredths, at most 3 wholes)', () => {
    for (const mission of MISSIONS) {
      const targets = [...getBuildChecks(mission.id), ...[0, 1, 2, 3, 4, 5].map((r) => getReviewCheck(mission.id, r))];
      for (const check of targets) {
        assert.ok(check.target.wholes <= 3, `${mission.id}: ${check.prompt} needs ${check.target.wholes} bars`);
        assert.ok(check.target.d <= 100, `${mission.id}: ${check.prompt}`);
        if (check.target.total) assert.ok(check.target.d <= 24 && check.target.total % check.target.d === 0);
      }
    }
  });
  it('review prompts ask to build, never to type, and never need a missing picture', () => {
    for (const mission of MISSIONS) for (let round = 0; round < 6; round++) {
      const { prompt } = getReviewCheck(mission.id, round);
      assert.doesNotMatch(prompt, /Type|Enter|Show your answer|this bar|this line|at the dot|is shaded/i, `${mission.id} review ${round}: ${prompt}`);
    }
  });
  it('puts the right reason in different spots, not always the same one', () => {
    const spots = new Set(MISSIONS.flatMap((mission) => getBuildChecks(mission.id).map((check) => check.correctReason)));
    assert.equal(spots.size, 3);
    for (const mission of MISSIONS) for (const check of getBuildChecks(mission.id)) assert.equal(check.reasons[check.correctReason], REASON_IDEAS[mission.id], mission.id);
  });
  it('offers each lesson’s own wrong reasons, a different pair at each step', () => {
    for (const mission of MISSIONS) {
      const slips = REASON_SLIPS[mission.id];
      assert.ok(slips, `${mission.id} needs its own wrong reasons`);
      assert.equal(new Set(slips).size, 3, `${mission.id}: three different wrong reasons`);
      assert.ok(!slips.includes(REASON_IDEAS[mission.id]), `${mission.id}: a wrong reason is the right one`);
      for (const r of slips) assert.ok(r.split(/\s+/).length <= 6, `${mission.id}: "${r}" is too long`);
      const checks = [...getBuildChecks(mission.id), ...[0, 1, 2].map((round) => getReviewCheck(mission.id, round))];
      for (const check of checks) {
        const wrong = check.reasons.filter((_, i) => i !== check.correctReason);
        for (const r of wrong) assert.ok(slips.includes(r), `${mission.id}: "${r}" is not one of the lesson's own mistakes`);
      }
      // Build it, On your own and Apply it each show a different pair.
      const pairs = getBuildChecks(mission.id).map((check) => check.reasons.filter((_, i) => i !== check.correctReason).sort().join(' | '));
      assert.equal(new Set(pairs).size, 3, `${mission.id}: the same wrong reasons at every step`);
    }
    // The old stock reasons are gone.
    const all = Object.values(REASON_SLIPS).flat();
    for (const stock of ['Bigger numbers mean a bigger fraction', 'Only shaded parts must be equal', 'Count the tick marks only']) assert.ok(!all.includes(stock));
  });
  it('keeps every "which idea explains why?" choice short, with the right one no longer than the others', () => {
    const words = (t: string) => t.trim().split(/\s+/).length;
    for (const mission of MISSIONS) {
      assert.ok(REASON_IDEAS[mission.id], `${mission.id} needs a short key idea`);
      const checks = [...getBuildChecks(mission.id), ...[0, 1, 2].map((round) => getReviewCheck(mission.id, round))];
      for (const check of checks) {
        for (const r of check.reasons) assert.ok(words(r) <= 6, `${mission.id}: "${r}" is too long`);
        const right = words(check.reasons[check.correctReason]);
        assert.ok(check.reasons.some((r, i) => i !== check.correctReason && words(r) >= right - 1), `${mission.id}: the right reason stands out by length`);
      }
    }
  });
  it('worksheets use grade-friendly denominators, real hints, and no zero, trivial or repeated questions', () => {
    for (const mission of MISSIONS) {
      const problems = getWorksheet(mission.id);
      assert.equal(new Set(problems.map((p) => p.prompt + JSON.stringify(p.model ?? null))).size, 12, `${mission.id} repeats a question`);
      for (const p of problems) {
        for (const m of p.prompt.matchAll(/(\d+)\/(\d+)/g)) {
          const bottom = Number(m[2]);
          assert.ok(GRADE_DENOMINATORS.has(bottom) || (bottom % 2 === 0 && bottom <= 48) || bottom % 5 === 0, `${mission.id}/${p.id}: odd denominator ${m[0]}`);
        }
        const value = parseAnswer(p.answer.replace(/%$/, ''));
        if (value && p.answer !== '0') assert.ok(value.n > 0, `${mission.id}/${p.id}: zero answer ${p.answer}`);
        assert.doesNotMatch(p.answer, /^0 /, `${mission.id}/${p.id}: "0 and a fraction"`);
        assert.doesNotMatch(p.hint, /idea and|Use the [a-z -]+ idea/, `${mission.id}/${p.id}: template hint`);
        assert.doesNotMatch(p.prompt, /How many (copies|1\/\d+ pieces) of (\d+\/\d+) make \2/);
      }
    }
  });
  it('lessons in the same family print different worksheets', () => {
    const families = [['equal-parts', 'unit-fractions'], ['benchmark-half', 'fraction-magnitude'], ['equivalent-models', 'build-equivalents', 'missing-equivalent'], ['improper-fractions', 'mixed-improper'], ['unit-size', 'compare-same-numerator']];
    for (const family of families) {
      const sheets = family.map((id) => getWorksheet(id).map((p) => p.prompt).join('|'));
      assert.equal(new Set(sheets).size, family.length, family.join(' / '));
    }
  });
  it('ordering questions never show the fractions already in the asked order', () => {
    for (const id of ['order-fractions', 'order-unlike-fractions']) for (const p of getWorksheet(id)) {
      const shown = /Put (.+) in order/.exec(p.prompt)![1];
      assert.notEqual(shown.replace(/\s/g, ''), p.answer.replace(/\s/g, ''), p.prompt);
    }
  });
  it('a worksheet picture always matches its question', () => {
    for (const mission of MISSIONS) for (const p of getWorksheet(mission.id)) {
      if (!p.model || p.model.n === 0) continue; // empty helper picture (wholes cut up, nothing shaded)
      const shown = `${p.model.n}/${p.model.d}`;
      const answer = parseAnswer(p.answer);
      const sameValue = !!answer && answer.n * p.model.d === p.model.n * answer.d;
      // A mixed number in the question drawn in its pieces (1 1/2 shown as 9/6) also matches.
      const mixedInPrompt = [...p.prompt.matchAll(/(\d+) (\d+)\/(\d+)/g)].some(([, w, t, b]) => (Number(w) * Number(b) + Number(t)) * p.model!.d === p.model!.n * Number(b));
      // A decimal in the question drawn as hundredths (0.3 shown as 30/100) also matches.
      const decimalInPrompt = [...p.prompt.matchAll(/\d*\.\d+/g)].some(([text]) => Math.abs(Number(text) - p.model!.n / p.model!.d) < 1e-9);
      // A fraction in the question drawn in the shared parts (2/5 shown as 6/15 to add to 1/3) also matches.
      const renamedInPrompt = [...p.prompt.matchAll(/(?<![\d ])(\d+)\/(\d+)/g)].some(([, t, b]) => Number(t) * p.model!.d === p.model!.n * Number(b));
      const mentioned = p.prompt.includes(shown) || sameValue || renamedInPrompt || mixedInPrompt || decimalInPrompt || /this|dot|shaded|of \d+/i.test(p.prompt) || p.model.kind === 'set';
      assert.ok(mentioned, `${mission.id}/${p.id}: picture ${shown} does not match "${p.prompt}"`);
    }
  });
  it('percent and decimal answers are exact (no rounding)', () => {
    for (const id of ['fractions-to-percent', 'percent-to-fraction', 'decimal-fraction-equivalence']) for (const p of getWorksheet(id)) {
      const [, t, b] = /(\d+)\/(\d+)|(\d+)%/.exec(p.prompt) ?? [];
      if (t && b && p.answer.endsWith('%')) assert.equal(Number(p.answer.slice(0, -1)), (Number(t) * 100) / Number(b), p.prompt);
      if (t && b && p.form === 'decimal') assert.equal(Number(p.answer), Number(t) / Number(b), p.prompt);
    }
  });
  it('generated help pictures belong to the question (not a stock 1/2 bar)', () => {
    for (const mission of MISSIONS.slice(0, 28)) for (const q of getExtraPractice(mission.id, mission.questions.map((item) => item.id))) {
      assert.equal(q.simplerModel.kind, q.model.kind, `${mission.id}/${q.id}`);
    }
  });
  it('tap questions never say "Type" and wrong choices never equal the answer in value', () => {
    for (const mission of MISSIONS) for (const q of [...mission.questions, ...getExtraPractice(mission.id, mission.questions.map((item) => item.id))]) {
      assert.doesNotMatch(q.prompt, /\bType\b|\bEnter\b/, `${q.id}: ${q.prompt}`);
      const right = parseAnswer(q.choices[q.correctChoice].replace(/%$/, '').replace(/ and /, ' '));
      if (!right) continue;
      q.choices.forEach((c, i) => {
        if (i === q.correctChoice) return;
        const v = parseAnswer(c.replace(/%$/, '').replace(/ and /, ' '));
        if (v) assert.notEqual(v.n * right.d, right.n * v.d, `${q.id}: "${c}" equals the answer`);
      });
    }
  });
  it('generator keeps to grade-friendly denominators', () => {
    for (const mission of MISSIONS.slice(0, 28)) for (let seed = 1; seed <= 40; seed++) {
      for (const q of generateQuestions(mission.id, mission.questions.map((item) => item.id), seed, 10)) {
        // Wrong choices may show a deliberate mistake (1/3 + 1/12 → 2/15), so check the question, answer and hint.
        for (const m of `${q.prompt} ${q.choices[q.correctChoice]} ${q.hint}`.matchAll(/(\d+)\/(\d+)/g)) {
          const bottom = Number(m[2]);
          assert.ok(bottom <= 12 || bottom === 100 || bottom === 24 || bottom === 16 || bottom === 18 || bottom === 20, `${q.id}: ${m[0]} in "${q.prompt}"`);
        }
        assert.doesNotMatch(q.hint, /\d\.5/, `${q.id}: decimal hint for 3rd graders`);
      }
    }
  });
});

describe('grown-ups report', () => {
  const titles = Array.from({ length: 15 }, (_, i) => `Unit ${i + 1}`);
  const fun0 = { xp: 0, day: '2026-10-11', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true };
  it('starts empty and points to lesson 1', () => {
    const report = buildParentReport(EMPTY_PROGRESS, fun0, titles, new Date(2026, 9, 11));
    assert.equal(report.lessonsDone, 0); assert.equal(report.lessonsTotal, MISSIONS.length);
    assert.equal(report.codeLevelsPassed, 0); assert.equal(report.codeLevelsTotal, MISSIONS.length * CODE_LEVEL_COUNT);
    assert.equal(report.codeMissionsStarted, 0); assert.deepEqual(report.codeMissionRows, []);
    assert.equal(report.firstTryRate, null); assert.equal(report.onOwnRate, null);
    assert.equal(report.nextLesson, `Lesson 1: ${MISSIONS[0].title}`);
    assert.equal(report.week.length, 7); assert.equal(report.minutesWeek, 0);
    assert.equal(report.units.length, 15);
    assert.equal(report.units[0].lessons[0].status, 'open'); assert.equal(report.units[0].lessons[1].status, 'locked');
  });
  it('counts first-try answers, independent builds, tricky ideas and this week\'s activity', () => {
    const id = MISSIONS[0].id; const sheet = getWorksheet(id);
    let record = emptyLearningRecord();
    // 12 answers: 10 right first time, 2 needed a second try.
    sheet.forEach((p, i) => { record = editWorksheet(record, p.id, i < 10 ? p.answer : 'oops'); record = checkWorksheet(record, p); });
    sheet.slice(10).forEach((p) => { record = editWorksheet(record, p.id, p.answer); record = checkWorksheet(record, p); });
    record = { ...record, practiceDone: true, checks: { build: { passed: true, supported: false, attempts: 1 }, transfer: { passed: true, supported: true, attempts: 2 }, apply: { passed: true, supported: true, attempts: 2 } }, misconceptions: { ...record.misconceptions, 'Counting pieces, groups or jumps': 3 } };
    for (const plan of targetedPracticePlans(id, record)) for (const problem of plan.problems) {
      record = editWorksheet(record, problem.id, problem.answer);
      record = checkWorksheet(record, problem, false);
    }
    const progress = updateLearning({ ...EMPTY_PROGRESS, completedMissionIds: [id], starsByMission: { [id]: 2 } }, id, record);
    const now = new Date(2026, 9, 11);
    const fun = { ...fun0, xp: 120, dayStreak: 3, activity: { '2026-10-11': { minutes: 12, answered: 9 }, '2026-10-09': { minutes: 5, answered: 2 }, '2026-09-01': { minutes: 99, answered: 99 } } };
    const report = buildParentReport(progress, fun, titles, now);
    assert.equal(report.lessonsDone, 1); assert.equal(report.stars, 2);
    assert.equal(report.firstTryRate, Math.round((10 / 12) * 100));
    assert.equal(report.onOwnRate, 33);
    assert.equal(report.units[0].lessons[0].builds, 'With help');
    assert.equal(report.minutesWeek, 17, 'only the last 7 days count'); assert.equal(report.answeredWeek, 11);
    // Wrong tries are grouped by the lesson's idea (not by each question's hint): all of this lesson's wrong tries are one line.
    assert.equal(report.toPractice[0].idea, ideaForMission(MISSIONS[0]).heading);
    assert.equal(report.toPractice[0].count, Object.values(record.misconceptions).reduce((sum, count) => sum + count, 0));
    assert.ok(report.toPractice[0].count >= 3);
    assert.deepEqual(report.toPractice[0].lessons, [MISSIONS[0].title]);
    assert.equal(report.nextLesson, `Lesson 2: ${MISSIONS[1].title}`);
  });
  it('shows adaptation reasons for parents and teachers', () => {
    const mission = MISSIONS.find((item) => item.id === 'compare-unlike-fractions')!;
    const progress: Progress = {
      ...EMPTY_PROGRESS,
      adaptationLog: [{
        at: new Date(2026, 9, 11, 9).getTime(),
        missionId: mission.id,
        standard: '4.NF.2',
        band: 'scaffolded',
        reason: 'moved to scaffolded compare-unlike set due to 3 recent misses',
      }],
    };
    const report = buildParentReport(progress, fun0, titles, new Date(2026, 9, 11));
    assert.equal(report.adaptationReasons.length, 1);
    assert.equal(report.adaptationReasons[0].reason, 'moved to scaffolded compare-unlike set due to 3 recent misses');
    assert.equal(report.adaptationReasons[0].lesson, mission.shortTitle);
  });
  it('reports only saved coding levels and keeps them separate from lesson completion', () => {
    const fun = { ...fun0, codeLevels: { [MISSIONS[0].id]: 2, [MISSIONS[1].id]: 3 } };
    const report = buildParentReport(EMPTY_PROGRESS, fun, titles, new Date(2026, 9, 11));
    assert.equal(report.lessonsDone, 0);
    assert.equal(report.codeLevelsPassed, 5);
    assert.equal(report.codeMissionsStarted, 2);
    assert.equal(report.codeMissionsComplete, 0);
    assert.deepEqual(report.codeMissionRows.map((row) => [row.id, row.levelsPassed]), [[MISSIONS[0].id, 2], [MISSIONS[1].id, 3]]);
    const sixLevelReport = buildParentReport(EMPTY_PROGRESS, { ...fun0, codeLevels: { [MISSIONS[0].id]: CODE_LEVEL_COUNT, [MISSIONS[1].id]: 5 } }, titles, new Date(2026, 9, 11));
    assert.equal(sixLevelReport.codeMissionsComplete, 1);
    assert.equal(sixLevelReport.codeLevelsPassed, 11);
    assert.deepEqual(sixLevelReport.codeMissionRows.map((row) => row.levelsPassed), [6, 5]);
  });
  it('tracks minutes and correct answers per day without touching lessons', () => {
    let fun = recordMinute(recordMinute(loadFun()));
    fun = recordCorrect(fun);
    const day = Object.keys(fun.activity ?? {})[0];
    assert.deepEqual(fun.activity?.[day], { minutes: 2, answered: 1 });
  });
});

describe('code challenge', () => {
  it('shows correct bar, number-line, and grouped-set examples with real repeat blocks', () => {
    assert.deepEqual(codeExamples().map((example) => example.target.kind), ['bar', 'line', 'set']);
    for (const example of codeExamples()) {
      const result = runProgram(example.program, example.target);
      assert.equal(matchesTarget(result, example.target), true, example.title);
      const repeatIndex = example.program.findIndex((block) => block.op === 'repeat');
      assert.ok(repeatIndex >= 0, `${example.title} demonstrates repeat`);
      assert.ok(result.steps.length > 1, `${example.title} can be stepped through`);
      assert.match(exampleStepInstruction(example, 0, result.steps), /First, split|First, build/);
      const loopActions = result.steps.map((step, index) => ({ step, index })).filter(({ step }) => step.path[0] === repeatIndex);
      const loopStep = loopActions[0]?.index ?? -1;
      assert.ok(loopStep > 0, `${example.title} has a visible loop-body step`);
      assert.match(exampleStepInstruction(example, loopStep, result.steps), /Loop pass 1 of/);
      const repeat = example.program[repeatIndex];
      if (repeat.op === 'repeat' && (repeat.n ?? 0) > 1) {
        const secondPass = loopActions[repeat.body.length]?.index;
        assert.notEqual(secondPass, undefined);
        assert.match(exampleStepInstruction(example, secondPass!, result.steps), /Loop pass 2 of/);
      }
    }
  });
  it('summarizes passed coding levels independently and only from saved mission values', () => {
    assert.deepEqual(summarizeCodeProgress(undefined, ['equal-parts', 'fraction-names']), {
      levelsPassed: 0, levelsTotal: 2 * CODE_LEVEL_COUNT, missionsStarted: 0, missionsComplete: 0,
    });
    assert.deepEqual(summarizeCodeProgress({ 'equal-parts': 1, 'fraction-names': 3, ignored: 2 }, ['equal-parts', 'fraction-names']), {
      levelsPassed: 4, levelsTotal: 2 * CODE_LEVEL_COUNT, missionsStarted: 2, missionsComplete: 0,
    });
    assert.equal(summarizeCodeProgress({ 'equal-parts': 6 }, ['equal-parts']).missionsComplete, 1);
  });
  it('every lesson has six solvable levels, including prediction, two-bug debugging, and model transfer', () => {
    for (const mission of MISSIONS) {
      const levels = getCodeLevels(mission.id);
      assert.equal(levels.length, CODE_LEVEL_COUNT, mission.id);
      for (const level of levels) {
        const answer = runProgram(solution(level.target), level.target);
        assert.ok(matchesTarget(answer, level.target), `${mission.id} L${level.level}: the model answer fails (${answer.error ?? describeRun(answer)})`);
        assert.ok(answer.steps.length < 400, `${mission.id} L${level.level} is too long to animate`);
      }
      assert.equal(runProgram(levels[0].start, levels[0].target).error, 'A block is missing a number.');
      assert.equal(levels[1].start.length, 0);
      assert.ok(!matchesTarget(runProgram(levels[2].start, levels[2].target), levels[2].target), `${mission.id}: the bug program already works`);
      assert.equal(levels[3].mode, 'predict');
      assert.equal(predictionMatchesTarget(levels[3].target, String(levels[3].target.n), String(levels[3].target.d)), true);
      assert.equal(predictionMatchesTarget(levels[3].target, String(levels[3].target.n + 1), String(levels[3].target.d)), false);
      assert.equal(levels[4].mode, 'debug');
      const twoBugs = makeMultiBug(levels[4].target);
      const correctProgram = solution(levels[4].target);
      const badSplit = twoBugs.find((block) => block.op === 'split');
      const goodSplit = correctProgram.find((block) => block.op === 'split');
      const badRepeat = twoBugs.find((block) => block.op === 'repeat');
      const goodRepeat = correctProgram.find((block) => block.op === 'repeat');
      assert.ok(badSplit?.op === 'split' && goodSplit?.op === 'split');
      assert.ok(badRepeat?.op === 'repeat' && goodRepeat?.op === 'repeat');
      assert.notEqual(badSplit.n, goodSplit.n, `${mission.id}: the partition is wrong`);
      assert.notEqual(badRepeat.n, goodRepeat.n, `${mission.id}: the repeat count is wrong`);
      assert.ok(!matchesTarget(runProgram(twoBugs, levels[4].target), levels[4].target), `${mission.id}: the two-bug program already works`);
      const transfer = levels[5];
      assert.equal(transfer.mode, 'build');
      assert.ok(transfer.transferFrom, `${mission.id}: transfer has a source fraction`);
      assert.notEqual(transfer.target.kind, transfer.transferFrom?.kind, `${mission.id}: transfer changes model`);
      assert.equal(transfer.target.n * (transfer.transferFrom?.d ?? 0), (transfer.transferFrom?.n ?? 0) * transfer.target.d, `${mission.id}: transfer keeps the same value`);
      assert.equal(transfer.requiresLoop, true, `${mission.id}: transfer requires a real repeat loop`);
      const loopSolution = solution(transfer.target);
      const manualProgram: Block[] = loopSolution.flatMap((block): Block[] => block.op === 'repeat'
        ? Array.from({ length: block.n ?? 0 }, () => block.body).flat()
        : [block]);
      const manualResult = runProgram(manualProgram, transfer.target);
      assert.ok(matchesTarget(manualResult, transfer.target), `${mission.id}: longhand model answer should still be correct`);
      assert.equal(usesEffectiveLoop(manualProgram), false);
      assert.equal(passesCodeLevel(transfer, manualResult, manualProgram), false, `${mission.id}: level 6 requires a loop`);
      assert.equal(passesCodeLevel(transfer, runProgram(loopSolution, transfer.target), loopSolution), true);
    }
  });
  it('puts the loop walkthrough before the challenge and keeps it available on later levels', () => {
    const globalWithReact = globalThis as typeof globalThis & { React?: typeof React };
    const previousReact = globalWithReact.React;
    globalWithReact.React = React;
    try {
      const render = (solved: number) => renderToStaticMarkup(createElement(
        FunContext.Provider,
        { value: { fun: { xp: 0, day: '2026-10-11', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true }, setFun: () => {} } },
        createElement(CodeQuest, { mission: MISSIONS[0], solved, onExit: () => {}, onSolved: () => {} }),
      ));
      for (const solved of [0, 1]) {
        const html = render(solved);
        assert.ok(html.includes('data-testid="code-walkthrough"'));
        assert.ok(html.indexOf('data-testid="code-walkthrough"') < html.indexOf('class="fq-code-goal"'));
        assert.ok(html.includes('Watch a loop work: one instruction, one model change'));
      }
    } finally {
      if (previousReact) globalWithReact.React = previousReact;
      else delete globalWithReact.React;
    }
  });
  it('saves all six coding levels while leaving older progress values unchanged', () => {
    const [first, second] = MISSIONS;
    let fun = recordCodeLevel(loadFun(), first.id, 3);
    fun = recordCodeLevel(fun, second.id, CODE_LEVEL_COUNT);
    const loaded = loadFun();
    assert.equal(loaded.codeLevels?.[first.id], 3, 'old three-level progress stays at three, not marked complete');
    assert.equal(loaded.codeLevels?.[second.id], CODE_LEVEL_COUNT);
    window.localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ codeLevels: { [first.id]: 99 } }));
    assert.equal(loadFun().codeLevels?.[first.id], CODE_LEVEL_COUNT, 'saved values are bounded to the six available levels');
  });
  it('catches common robot mistakes with friendly messages', () => {
    const t = { kind: 'bar' as const, n: 3, d: 4, wholes: 1 };
    assert.equal(runProgram([{ op: 'shade' }], t).error, 'Split the bar first!');
    assert.match(runProgram([{ op: 'split', n: 2 }, { op: 'repeat', n: 3, body: [{ op: 'shade' }, { op: 'move' }] }], t).error ?? '', /ran off the end/);
    // Forgetting to move shades the same piece again and again: 1 piece, not 3.
    const noMove = runProgram([{ op: 'split', n: 4 }, { op: 'repeat', n: 3, body: [{ op: 'shade' }] }], t);
    assert.equal(noMove.final.marked.length, 1); assert.equal(matchesTarget(noMove, t), false);
    // Writing it out without a loop still works.
    const longhand = runProgram([{ op: 'split', n: 4 }, { op: 'shade' }, { op: 'move' }, { op: 'shade' }, { op: 'move' }, { op: 'shade' }], t);
    assert.equal(matchesTarget(longhand, t), true); assert.equal(usesLoop([{ op: 'shade' }]), false);
    assert.match(runProgram([{ op: 'split', n: 5 }], { kind: 'set', n: 1, d: 3, wholes: 1, total: 12 }).error ?? '', /12 dots can't make 5 equal groups/);
    assert.equal(toText(solution(t), 'bar'), 'bar.split(4)\nfor i in range(3):\n    robot.shade()\n    robot.move()');
  });
  it('gives one model-specific next-step hint for bar, number-line, and set mistakes without passing them', () => {
    const barTarget = { kind: 'bar' as const, n: 3, d: 4, wholes: 1 };
    const wrongBarSplit: Block[] = [{ op: 'split', n: 3 }, { op: 'repeat', n: 3, body: [{ op: 'shade' }, { op: 'move' }] }];
    const wrongBar = runProgram(wrongBarSplit, barTarget);
    const splitHint = getRunHint(wrongBar, barTarget, wrongBarSplit);
    assert.match(splitHint, /bar is split into 3 equal parts/);
    const debugLevel = { ...getCodeLevels(MISSIONS[0].id)[2], target: barTarget };
    assert.equal(passesCodeLevel(debugLevel, wrongBar, wrongBarSplit), false, 'a hint does not turn an incorrect run into evidence');

    const stuckBarProgram: Block[] = [{ op: 'split', n: 4 }, { op: 'repeat', n: 3, body: [{ op: 'shade' }] }];
    const stuckBar = runProgram(stuckBarProgram, barTarget);
    assert.equal(stuckBar.final.marked.length, 1);
    assert.match(getRunHint(stuckBar, barTarget, stuckBarProgram), /same piece.*move block inside the loop/);

    const lineTarget = { kind: 'line' as const, n: 2, d: 5, wholes: 1 };
    const shortLineProgram: Block[] = [{ op: 'split', n: 5 }, { op: 'repeat', n: 1, body: [{ op: 'jump' }] }];
    const shortLine = runProgram(shortLineProgram, lineTarget);
    assert.match(getRunHint(shortLine, lineTarget, shortLineProgram), /lands after 1 jump.*repeat count or jump blocks/);

    const setTarget = { kind: 'set' as const, n: 3, d: 3, wholes: 1, total: 12 };
    const shortSetProgram: Block[] = [{ op: 'split', n: 3 }, { op: 'repeat', n: 2, body: [{ op: 'pick' }] }];
    const shortSet = runProgram(shortSetProgram, setTarget);
    assert.match(getRunHint(shortSet, setTarget, shortSetProgram), /2 picked groups.*repeat count or pick blocks/);
    assert.notEqual(getRunHint(shortSet, setTarget, shortSetProgram), getRunHint(runProgram([{ op: 'split', n: 4 }], setTarget), setTarget, [{ op: 'split', n: 4 }]), 'editing the model changes its hint');

    const manualLineProgram: Block[] = [{ op: 'split', n: 5 }, { op: 'jump' }, { op: 'jump' }];
    const manualLine = runProgram(manualLineProgram, lineTarget);
    const loopLevel = { ...getCodeLevels(MISSIONS[0].id)[5], target: lineTarget, requiresLoop: true };
    assert.equal(passesCodeLevel(loopLevel, manualLine, manualLineProgram), false, 'matching the model without a required loop is not independent success');
    assert.match(getRunHint(manualLine, lineTarget, manualLineProgram, true), /model matches.*repeat block/);
  });
});

describe('Fraction Race rules', () => {
  // Simulate a racer: `accuracy` chance to be right, `think` ms per answer. Returns seconds to finish (or Infinity).
  const simulate = (accuracy: number, think: number, seed: number, limit = 600) => {
    const rng = makeRng(seed); let racer = newRacer(); let t = 0;
    while (t < limit * 1000) {
      t = Math.max(t + think, racer.stallUntil);
      racer = applyAnswer(racer, rng.int(1, 1000) <= accuracy * 1000, t);
      if (racer.score >= RACE_GOAL) return t / 1000;
    }
    return Infinity;
  };
  it('random guessing (1 in 3) rarely wins, even with impossibly fast taps, while a trying child usually does', () => {
    // Even tapping every 0.3 s for 2 minutes (faster than any child), guessing wins under 5% of slow-robot races.
    // (The turbo shield adds a little here, but it lifts a 70%-right child from ~51% to ~65% wins: worth it.)
    const wins = Array.from({ length: 1000 }, (_, i) => simulate(1 / 3, 300, i + 1)).filter((s) => s <= ROBOT_LEVELS[0].seconds).length;
    assert.ok(wins < 50, `guessing won ${wins} of 1000 races`);
    const careful = Array.from({ length: 200 }, (_, i) => simulate(0.7, 6000, i + 1)).filter((s) => s <= ROBOT_LEVELS[0].seconds).length;
    assert.ok(careful > 100, `a 70%-right child won only ${careful} of 200`);
    // Against the turbo robot, a guesser wins only by rare luck (about 1 in 100).
    const turboWins = Array.from({ length: 2000 }, (_, i) => simulate(1 / 3, 300, i + 1)).filter((s) => s <= ROBOT_LEVELS[2].seconds).length;
    assert.ok(turboWins < 40, `guessing beat the turbo robot ${turboWins} of 2000 times`);
  });
  it('a careful child (85% right, 5 s per question) beats the slow robot; a quick accurate one beats turbo', () => {
    const careful = Array.from({ length: 50 }, (_, i) => simulate(0.85, 5000, i + 1)).sort((a, b) => a - b)[25];
    assert.ok(careful < ROBOT_LEVELS[0].seconds, `median ${careful}s`);
    const quick = Array.from({ length: 50 }, (_, i) => simulate(0.95, 3500, i + 1)).sort((a, b) => a - b)[25];
    assert.ok(quick < ROBOT_LEVELS[2].seconds, `median ${quick}s`);
  });
});

describe('new tenths + hundredths lesson', () => {
  const core = MISSIONS.filter((m) => m.unit <= 8 && m.id !== 'add-tenths-hundredths');
  const withAll = (ids: string[]) => ids.reduce((progress, id) => {
    let record = { ...emptyLearningRecord(), practiceDone: true, checks: Object.fromEntries(getBuildChecks(id).map(check => [check.id, { passed: true, supported: false, attempts: 1 }])) };
    for (const p of getWorksheet(id)) { record = editWorksheet(record, p.id, p.answer); record = checkWorksheet(record, p); }
    return updateLearning({ ...progress, completedMissionIds: [...progress.completedMissionIds, id] }, id, record);
  }, EMPTY_PROGRESS);
  it('is required to open unit 9 for new learners', () => {
    const progress = withAll(core.map((m) => m.id));
    assert.equal(isMissionUnlocked(progress, 'add-tenths-hundredths'), true);
    assert.equal(isMissionUnlocked(progress, 'simplify-fractions'), false);
    assert.equal(isMissionUnlocked(withAll([...core.map((m) => m.id), 'add-tenths-hundredths']), 'simplify-fractions'), true);
  });
  it('does not re-lock units 9–14 for a learner who had already started them', () => {
    const before = withAll(core.map((m) => m.id));
    const started = updateLearning(before, 'simplify-fractions', { ...emptyLearningRecord(), practiceDone: true });
    assert.equal(isMissionUnlocked(started, 'simplify-fractions'), true);
  });
  it('lessons added to units 9-14 never re-lock lessons a learner had already finished', () => {
    const added = MISSIONS.filter((m) => LATE_ADDED_LESSONS.has(m.id)).map((m) => m.id);
    assert.equal(added.length, LATE_ADDED_LESSONS.size, 'every late-added id is a real lesson');
    // A learner who finished every original lesson before the new ones existed.
    const original = MISSIONS.filter((m) => !LATE_ADDED_LESSONS.has(m.id)).map((m) => m.id);
    const veteran = withAll(original);
    const relocked = original.filter((id) => !isMissionUnlocked(veteran, id));
    assert.deepEqual(relocked, [], `finished lessons locked again: ${relocked.join(', ')}`);
    assert.ok(added.every((id) => isMissionUnlocked(veteran, id)), 'the new lessons are open to do any time');
    assert.ok(added.includes(getNextMission(veteran)?.id ?? ''), 'Continue suggests a new lesson');
    // A brand-new learner still meets each new lesson in order before the next unit opens.
    const newcomer = withAll(MISSIONS.filter((m) => m.unit <= 8).map((m) => m.id));
    const nextUnitTen = MISSIONS.find((m) => m.unit === 10 && !LATE_ADDED_LESSONS.has(m.id))!;
    assert.equal(isMissionUnlocked(newcomer, nextUnitTen.id), false);
  });
  it('spreads the right answer across A, B, C and D', () => {
    const pos = [0, 0, 0, 0]; for (const m of MISSIONS) for (const q of m.questions) pos[q.correctChoice]++;
    const total = pos.reduce((a, b) => a + b, 0);
    for (const n of pos) assert.ok(n / total > 0.17 && n / total < 0.34, `positions ${pos}`);
  });

  it('gives every lesson question four different choices', () => {
    for (const m of MISSIONS) for (const q of m.questions) {
      assertSignChoicesAgree(q, q.id);
      const want = 4;
      assert.equal(q.choices.length, want, `${q.id}: ${q.prompt} | ${q.choices.join(' / ')}`);
      assert.equal(new Set(q.choices.map((c) => c.trim().toLowerCase())).size, want, q.id);
      for (const c of q.choices) assert.doesNotMatch(c, /^(?:Yes|No):/, 'yes and no are followed by a comma');
      for (const c of q.choices) assert.ok(c.trim().split(/\s+/).length <= 6, `${q.id}: "${c}" is too long for an answer choice`);
    }
  });
});

describe('grid, scaling and share-or-fit lessons', () => {
  const lesson = (id: string) => MISSIONS.find((m) => m.id === id)!;
  const answer = (q: PracticeQuestion) => q.choices[q.correctChoice];
  it('teach first with the approved idea and worked example, then ask the approved first question', () => {
    const grid = lesson('compare-decimals-grid');
    assert.equal(grid.unit, 8);
    assert.equal(MISSIONS[MISSIONS.indexOf(grid) - 1].id, 'compare-decimals');
    assert.match(grid.skill, /hundredths.*same whole/);
    assert.equal(grid.example.prompt, 'Which is more: 0.7 or 0.07?');
    assert.ok(grid.example.model.kind === 'area' && areaFigures(grid.example.model).map((f) => f.shaded.length).join() === '70,7', 'two hundredths grids: 70 and 7');
    assert.equal(grid.questions[0].prompt, 'Put 0.5, 0.45 and 0.6 in order, smallest first.');
    assert.equal(answer(grid.questions[0]), '0.45 < 0.5 < 0.6');
    assert.ok(grid.questions.some((q) => answer(q) === "You can't tell"), 'a same-whole question');

    const scale = lesson('bigger-or-smaller');
    assert.equal(MISSIONS[MISSIONS.indexOf(scale) - 1].id, 'multiplication-scaling');
    assert.deepEqual(scale.questions[0].choices.slice().sort(), ['1/2 × 8', '3/4 × 8', '5/4 × 8', '8/8 × 8']);
    assert.equal(answer(scale.questions[0]), '5/4 × 8');
    const ana = scale.questions.find((q) => /^Ana says/.test(q.prompt))!;
    assert.match(ana.choices[0], /^No\b/, 'No comes before Yes');

    const times = lesson('fraction-times-fraction');
    assert.equal(MISSIONS[MISSIONS.indexOf(times) - 1].id, 'multiply-fractions');
    assert.equal(times.example.prompt, '2/3 × 4/5 = ?');
    assert.equal(times.example.answer, '8/15');
    assert.deepEqual(times.questions[0].choices.slice().sort(), ['3/6', '3/8', '4/6', '4/8']);
    // Every question shows the square to cut, and never shades the overlap that is the answer.
    for (const q of times.questions.filter((item) => !item.isReview)) assert.ok(q.model.kind === 'area' && q.model.shaded.length === 0, q.prompt);

    const fit = lesson('share-or-fit');
    // Dividing with unit fractions closes unit 12, after a fraction is a division (5.NF.3).
    assert.deepEqual(MISSIONS.filter((m) => m.unit === 12).slice(-4).map((m) => m.id), ['fraction-as-division', 'unit-fraction-divided-whole', 'divide-whole-by-unit-fraction', 'share-or-fit']);
    assert.equal(fit.example.prompt, 'How many 1/3-cup servings are in 2 cups?');
    assert.match(fit.example.explanation, /2 ÷ 1\/3 = 6.*Check: 6 × 1\/3 = 2/);
    const clay = fit.questions.find((q) => /How much does each get\?$/.test(q.prompt))!;
    assert.deepEqual(clay.choices.slice().sort(), ['1/5 pound', '1/6 pound', '3/2 pounds', '6 pounds']);
    assert.equal(answer(clay), '1/6 pound');
    // The child names the kind of story before solving it, for both kinds.
    assert.deepEqual(fit.questions.filter((q) => /sharing or fitting\?$/.test(q.prompt)).map(answer), ['Sharing', 'Fitting']);
  });
  it('write the division and check it with × in the division lessons', () => {
    for (const id of ['divide-whole-by-unit-fraction', 'unit-fraction-divided-whole']) {
      for (const q of lesson(id).questions.filter((item) => !item.isReview)) {
        assert.match(q.prompt, / ÷ /, q.prompt);
        assert.match(q.retryFeedback, /Check: \d+ × 1\/\d+ = /, q.prompt);
      }
    }
    const quotient = lesson('fraction-as-division');
    assert.ok(quotient.questions.every((q) => q.isReview || !/shared fairly/.test(q.prompt)), 'no more sharing stories');
    assert.ok(quotient.questions.some((q) => /^Between which two whole numbers is \d+\/\d+\?$/.test(q.prompt)));
    assert.ok(getWorksheet('fraction-as-division').every((p) => !/shared fairly/.test(p.prompt)));
  });
});

describe('placement quiz', () => {
  it('reaches the grade 5 units: a child who knows units 1–12 starts at unit 13, and every question can be answered with what the quiz shows', () => {
    assert.equal(PLACEMENT_UNITS, 12, 'Find my level covers the grade 5 units 10–12');
    assert.equal(startUnit(12), 13);
    for (let unit = 1; unit <= PLACEMENT_UNITS; unit++) for (let seed = 1; seed <= 12; seed++) {
      for (const item of placementItems(unit, seed)) {
        const p = item.problem;
        // The quiz shows bars, number lines, sets and read-only areas: never a ruler, line plot, slider or colouring task.
        assert.ok(!p.rulerTask && !p.linePlotTask && !p.scaleTask && !p.areaTask, `unit ${unit}: ${p.prompt}`);
        assert.ok(!/use the ruler|line plot|slider|colou?r the/i.test(p.prompt), `unit ${unit} needs a tool the quiz doesn't show: ${p.prompt}`);
      }
    }
  });

  it('asks 3 answerable typed questions for each of units 1–8', () => {
    for (let unit = 1; unit <= PLACEMENT_UNITS; unit++) for (const seed of [1, 2, 3]) {
      const items = placementItems(unit, seed);
      assert.equal(items.length, 3);
      for (const item of items) {
        assert.equal(getMission(item.missionId).unit, unit);
        assert.ok(answerMatches(item.problem, item.problem.answer), `${item.missionId}: ${item.problem.prompt}`);
      }
    }
  });
  it('opens the start unit without marking anything done, and a retake never locks things again', () => {
    const placed = applyPlacement(EMPTY_PROGRESS, 3, 1000); // passed units 1–3 → start at unit 4
    assert.deepEqual(placed.placement, { unit: 4, at: 1000 });
    assert.equal(placed.completedMissionIds.length, 0);
    const firstOfUnit4 = MISSIONS.find((m) => m.unit === 4)!; const secondOfUnit4 = MISSIONS.filter((m) => m.unit === 4)[1];
    assert.equal(isMissionUnlocked(placed, firstOfUnit4.id), true);
    assert.equal(isMissionUnlocked(placed, secondOfUnit4.id), false, 'inside the unit, lessons still go in order');
    assert.equal(isMissionUnlocked(placed, MISSIONS[0].id), true, 'skipped lessons stay open');
    assert.equal(getNextMission(placed)?.id, firstOfUnit4.id, 'suggests the first lesson of the start unit');
    assert.equal(hasLearningGate(placed, MISSIONS[0].id), false);
    assert.equal(applyPlacement(placed, 1).placement?.unit, 4, 'a lower retake keeps the later start');
    assert.equal(applyPlacement(EMPTY_PROGRESS, 0), EMPTY_PROGRESS, 'starting at unit 1 changes nothing');
    assert.equal(applyPlacement(EMPTY_PROGRESS, 8).placement?.unit, 9);
    assert.equal(isMissionUnlocked(applyPlacement(EMPTY_PROGRESS, 8), 'simplify-fractions'), true);
  });
  it('survives a reload from every possible start unit, grade 5 included', () => {
    for (let start = 2; start <= startUnit(PLACEMENT_UNITS); start++) {
      const placed = applyPlacement(EMPTY_PROGRESS, start - 1, 7000 + start);
      assert.equal(placed.placement?.unit, start);
      saveProgress(placed);
      assert.deepEqual(loadProgress().placement, { unit: start, at: 7000 + start }, `start unit ${start} was forgotten on reload`);
    }
    saveProgress({ ...EMPTY_PROGRESS, placement: { unit: startUnit(PLACEMENT_UNITS) + 1, at: 1 } });
    assert.equal(loadProgress().placement, undefined, 'there is no start unit past the quiz');
    saveProgress({ ...EMPTY_PROGRESS, placement: { unit: 1, at: 1 } });
    assert.equal(loadProgress().placement, undefined, 'starting at unit 1 is not a placement');
  });
  it('survives a reload and shows as "skipped" in the grown-ups report', () => {
    const placed = applyPlacement(EMPTY_PROGRESS, 2, 5000);
    saveProgress(placed); // the test window's memory storage
    assert.deepEqual(loadProgress().placement, { unit: 3, at: 5000 });
    const report = buildParentReport(placed, { xp: 0, day: '2026-10-11', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true }, Array.from({ length: 14 }, (_, i) => `U${i + 1}`));
    assert.equal(report.units[0].lessons[0].status, 'skipped');
    assert.equal(report.placement?.unit, 3);
  });
});
describe('saved challenge scores', () => {
  it('keeps unit 9–15 challenge bests after a reload', () => {
    saveProgress({ ...EMPTY_PROGRESS, challengeBest: { 1: 20, 12: 17, 14: 22, 15: 19 } });
    assert.deepEqual(loadProgress().challengeBest, { 1: 20, 12: 17, 14: 22, 15: 19 });
    saveProgress({ ...EMPTY_PROGRESS, challengeBest: { 16: 10 } });
    assert.equal(loadProgress().challengeBest?.['16'], undefined, 'there is no unit 16');
  });
});

describe('pictures never give the answer away', () => {
  const partsShown = (m: ModelSpec): number[] => {
    if (m.kind === 'set') return [m.selected];
    if (m.kind === 'partition') return [m.parts.length];
    if (m.kind === 'line') return [m.denominator * (m.wholes ?? 1)];
    if (m.kind === 'bars') return m.bars.flatMap((b) => [b.denominator, b.numerator]);
    return [];
  };
  it('no "which picture" prompts with word answers, and no picture that shows a whole-number answer the question does not', () => {
    for (const mission of MISSIONS) {
      const ids = mission.questions.map((q) => q.id);
      const questions = [...mission.questions, ...getExtraPractice(mission.id, ids), ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((seed) => generateQuestions(mission.id, ids, seed, 10))];
      for (const q of questions) {
        assert.doesNotMatch(q.prompt, /^Which (strip|ribbon|one|picture|bar) (shows|is cut)/, `${q.id}: "${q.prompt}" asks to pick a picture but the choices are words`);
        const answer = q.choices[q.correctChoice];
        if (!/^\d+$/.test(answer)) continue;
        const inPrompt = (q.prompt.match(/\d+/g) ?? []).includes(answer);
        if (!inPrompt && /How many|What is \d+\/\d+ of/.test(q.prompt)) {
          assert.ok(!(q.model.kind === 'set' && q.model.selected === Number(answer)), `${q.id}: the picture highlights the answer (${answer}) for "${q.prompt}"`);
          assert.ok(!(/equal spaces/.test(q.prompt) && partsShown(q.model).includes(Number(answer))), `${q.id}: the line already shows ${answer} spaces for "${q.prompt}"`);
        }
      }
    }
  });
  it('the equal-parts strip question matches its picture', () => {
    let shapes = 0;
    for (let seed = 1; seed <= 60; seed++) for (const q of generateQuestions('equal-parts', ['x'], seed, 6)) {
      if (q.model.kind === 'area') {
        // Squares, pizzas and hexagons: the answer follows the piece sizes, never the shapes.
        shapes++;
        assert.equal(q.choices[q.correctChoice], allEqual(q.model.cut) ? 'Yes, same-size parts' : 'No, some parts are bigger', q.model.cut);
        continue;
      }
      assert.equal(q.model.kind, 'partition');
      if (q.model.kind !== 'partition') continue;
      const d = Number(/equal (\w+)/.exec(q.prompt) && { halves: 2, thirds: 3, fourths: 4, fifths: 5, sixths: 6, eighths: 8 }[/equal (\w+)\?/.exec(q.prompt)![1] as 'halves']);
      const parts = q.model.parts; const equal = parts.every((p) => Math.abs(p - parts[0]) < 1e-6);
      // A wrong count is whatever the strip really shows (a taught number of parts, never fifths or sevenths).
      const truth = parts.length !== d ? `No, there are ${parts.length} parts` : equal ? `Yes, ${d} equal parts` : 'No, the parts are unequal';
      assert.equal(q.choices[q.correctChoice], truth, `${q.prompt} with ${parts.length} parts, equal=${equal}`);
    }
    assert.ok(shapes > 20, 'some practice questions use squares and circles');
  });

  it('unit fraction practice can show a pizza slice, or 2 triangles that make 1/4 (not 2/7)', () => {
    const qs = Array.from({ length: 60 }, (_, seed) => generateQuestions('unit-fractions', ['x'], seed + 1, 6)).flat().filter((q) => q.model.kind === 'area');
    assert.ok(qs.length > 20);
    for (const q of qs) if (q.model.kind === 'area') {
      const [n, d] = q.choices[q.correctChoice].split('/').map(Number);
      assert.ok(Math.abs(shadedArea(q.model.cut, q.model.shaded) - n / d) < 1e-9, q.prompt);
    }
    assert.ok(qs.some((q) => q.choices.includes('2/7')));
  });
});

describe('game improvements', () => {
  it('3 right in a row earns a shield that stops one roll-back; misses are remembered for review', () => {
    let r = newRacer();
    r = applyAnswer(r, true, 0); r = applyAnswer(r, true, 1); r = applyAnswer(r, true, 2);
    assert.equal(r.score, 3); assert.equal(r.shield, true);
    r = applyAnswer(r, false, 3); assert.equal(r.score, 3, 'the shield stops the roll-back'); assert.equal(r.shield, false); assert.deepEqual(r.missed, [3]);
    r = applyAnswer(r, false, 5000); assert.equal(r.score, 2, 'no shield: back one space'); assert.equal(r.streak, 0);
    assert.equal(raceStars(9, 1), 3); assert.equal(raceStars(7, 3), 2); assert.equal(raceStars(5, 5), 1);
  });
  it('every lesson can make a Code Sprint: 5 solvable rounds, real bugs, and code-reading choices with one right answer', () => {
    for (const mission of MISSIONS) {
      let x = 7; const random = () => ((x = (x * 9301 + 49297) % 233280) / 233280);
      const rounds = makeSprint(mission.id, random);
      assert.deepEqual(rounds.map((r) => r.kind), [...SPRINT_ROUNDS]);
      for (const round of rounds) {
        assert.ok(matchesTarget(runProgram(solution(round.target), round.target), round.target), `${mission.id}: unsolvable`);
        if (round.kind === 'debug') assert.ok(!matchesTarget(runProgram(round.start, round.target), round.target), `${mission.id}: bug already works`);
        if (round.kind === 'fill') assert.ok(runProgram(round.start, round.target).error, `${mission.id}: fill round starts solved`);
        if (round.kind === 'read') {
          assert.equal(round.choices!.length, 3, `${mission.id}: needs 3 programs`);
          const works = round.choices!.map((prog) => matchesTarget(runProgram(prog, round.target), round.target));
          assert.deepEqual(works, [true, false, false], `${mission.id}: exactly the first program works`);
          assert.equal(new Set(round.choices!.map((prog) => toText(prog, round.target.kind))).size, 3);
        }
      }
    }
  });
});

describe('course counts', () => {
  it('counts lessons and units from the course, leaving out free units', () => {
    const all = courseCounts();
    assert.equal(all.lessons, MISSIONS.length); assert.equal(all.units, 15);
    const trial = courseCounts([1]);
    assert.equal(trial.lockedUnits, 14);
    assert.equal(trial.lockedLessons, MISSIONS.filter((mission) => mission.unit !== 1).length);
  });
});

describe('every question has a picture', () => {
  it('compare questions show both amounts as models, so the child can see why', () => {
    const q = MISSIONS.find((m) => m.id === 'compare-same-numerator')!.questions.find((item) => /2\/3 or 2\/8/.test(item.prompt))!;
    assert.equal(q.model.kind, 'bars');
    if (q.model.kind === 'bars') assert.deepEqual(q.model.bars.map((b) => `${b.numerator}/${b.denominator}`), ['2/3', '2/8']);
    for (const id of ['unit-size', 'compare-same-denominator', 'compare-same-numerator', 'compare-unlike-fractions']) {
      const qs = Array.from({ length: 40 }, (_, seed) => generateQuestions(id, ['x'], seed + 1, 6)).flat().filter((item) => /^Which is (bigger|smaller), /.test(item.prompt));
      assert.ok(qs.length > 30, id);
      const firstIsAnswer = qs.filter((item) => item.prompt.replace(/^Which is \w+, /, '').startsWith(item.choices[item.correctChoice] + ' ')).length;
      assert.ok(firstIsAnswer > qs.length * 0.2 && firstIsAnswer < qs.length * 0.8, `${id}: first-named is the answer ${firstIsAnswer}/${qs.length}`);
      assert.ok(qs.every((item) => item.model.kind === 'bars' && item.model.bars.length === 2 && item.model.bars.some((b) => b.numerator > 0)), id);
    }
    const unlike = Array.from({ length: 60 }, (_, seed) => generateQuestions('compare-unlike-fractions', ['x'], seed + 1, 6)).flat();
    assert.ok(unlike.some((item) => { const m = /(\d+)\/(\d+) or (\d+)\/(\d+)/.exec(item.prompt); return !!m && m[1] === m[3]; }), 'some same-numerator pairs');
  });
  it('every lesson, practice and worksheet question shows a model', () => {
    for (const mission of MISSIONS) {
      for (const q of mission.questions) assert.notEqual(q.model.kind, 'equation', `${mission.id}: ${q.prompt}`);
      for (const q of generateQuestions(mission.id, ['x'], 5, 12)) assert.notEqual(q.model.kind, 'equation', `${mission.id}: ${q.prompt}`);
      for (const p of getWorksheet(mission.id)) {
        const hasVisual = !!(p.model || p.area || p.rulerTask || p.linePlotTask || p.scaleTask || p.picture);
        assert.ok(hasVisual, `${mission.id}: ${p.prompt}`);
      }
    }
    const row = getWorksheet('unit-size').find((p) => p.picture)!;
    assert.equal(row.picture!.kind, 'bars');
  });
});

describe('daily practice is a real review', () => {
  it('mixes topic questions with builds, and a build never comes pre-split', () => {
    const progress = { ...EMPTY_PROGRESS, completedMissionIds: MISSIONS.slice(0, 20).map((m) => m.id) };
    const session = createDailyPractice(progress, new Date(2026, 9, 11).getTime());
    const kinds = session.questions.map((q) => q.kind);
    assert.ok(kinds.includes('choice') && kinds.includes('build'));
    for (const q of session.questions.filter((item) => item.kind === 'choice')) {
      const topic = dailyChoiceQuestion(q)!;
      assert.ok(topic && topic.choices.length >= 2, q.missionId);
      assert.deepEqual(dailyChoiceQuestion(q), topic, 'same question every time it is drawn');
    }
    const build = session.questions.find((q) => q.kind === 'build')!;
    assert.equal(dailyBuildCorrect(build, undefined, build.numerator), false, 'the parts must be chosen');
    assert.equal(dailyBuildCorrect(build, build.denominator, build.numerator), true);
    assert.equal(dailyBuildCorrect(build, build.denominator * 2, build.numerator * 2), true, 'an equivalent build counts');
    assert.equal(dailyBuildCorrect(build, build.denominator + 1, build.numerator), false);
  });

  it('puts one Listen control in the daily model question header', () => {
    const markup = renderToStaticMarkup(createElement(DailyPracticeQuestionHeading, {
      title: 'Build 1/9 on a number line.',
      speechText: 'Build one ninth on a number line. Choose equal spaces from 0 to 1, then make one jump.',
      label: 'Listen to the question and directions',
    }));
    const heading = /<header class="fq-example-section-header fq-daily-question-heading" data-testid="daily-practice-question-header">([\s\S]*?)<\/header>/.exec(markup)?.[1];
    assert.ok(heading, 'the question should have a clear header section');
    assert.match(heading, /id="daily-question-title"/);
    assert.match(heading, /data-testid="button-listen-learning-text"/);
    assert.equal((markup.match(/data-testid="button-listen-learning-text"/g) ?? []).length, 1);
  });
});

describe('same numerator, different denominators', () => {
  it('the lesson uses several numerators, both question forms, and its own transfer pair', () => {
    const sheet = getWorksheet('compare-same-numerator');
    const tops = new Set(sheet.map((p) => Number(/(\d+)\/\d+/.exec(p.prompt)![1])));
    assert.ok(tops.size >= 3, `numerators used: ${[...tops]}`);
    assert.ok(sheet.some((p) => p.form === 'symbol') && sheet.some((p) => p.form !== 'symbol'));
    for (const p of sheet) {
      const [, n1, d1, n2, d2] = /(\d+)\/(\d+)\D+(\d+)\/(\d+)/.exec(p.prompt)!.map(Number);
      assert.equal(n1, n2, p.prompt); assert.notEqual(d1, d2, p.prompt);
      if (p.form === 'symbol') assert.equal(p.answer, d1 < d2 ? '>' : '<', p.prompt);
    }
    const transfer = getBuildChecks('compare-same-numerator').find((c) => c.transfer)!;
    assert.match(transfer.prompt, /2\/3 or 2\/6/);
    assert.match(transfer.explanation, /same-size wholes count 2 parts.*Six equal parts make smaller parts/i);
    const mission = MISSIONS.find((item) => item.id === 'compare-same-numerator')!;
    assert.match(mission.skill, /wholes are the same size.*same (?:top number|numerator).*larger (?:bottom number|denominator).*more equal parts.*smaller/i);
    assert.match(mission.explainPrompt ?? '', /3\/4 and 3\/8.*denominator.*same-size whole.*2\/3 and 2\/4/i);
    assert.match(mission.example.explanation, /same-size bars count 3 parts.*8 equal parts.*smaller parts.*3\/8 is less than 3\/4/i);
    const unlike = getWorksheet('compare-unlike-fractions');
    assert.ok(unlike.some((p) => { const m = /(\d+)\/\d+ __ (\d+)\/\d+/.exec(p.prompt); return !!m && m[1] === m[2]; }));
  });
  it('clearly teaches that a larger denominator makes smaller pieces when the numerator stays the same', () => {
    const lesson = MISSIONS.find((m) => m.id === 'compare-same-numerator')!;
    const explainsPieceSize = (text: string) =>
      /(?:denominator|bottom number|equal parts|pieces|parts)/i.test(text)
      && /(?:smaller|larger|fewer|more)/i.test(text);
    assert.match(lesson.skill, /same (?:numerator|top number).*(?:larger denominator|larger bottom number).*more equal parts.*part.*smaller/i);
    assert.match(lesson.example.explanation, /both (?:same-size (?:whole|bar)s?|fractions).*count 3 parts/i);
    assert.match(lesson.example.explanation, /(?:eighths|eight equal parts|8 equal parts).*smaller/i);
    assert.match(lesson.example.explanation, /3\/8 (?:is )?(?:smaller|less) than 3\/4/i);
    assert.ok(lesson.questions.filter((question) => !question.isReview).every((question) => explainsPieceSize(question.hint)), 'each authored hint compares the denominator or piece size');

    const generated = generateQuestions('compare-same-numerator', ['x'], 3, 8);
    assert.ok(generated.every((question) => explainsPieceSize(question.hint)), 'generated same-numerator practice keeps the explanation');

    const extensionRows = getWorksheet('compare-unlike-fractions').filter((row) => {
      const match = /(\d+)\/\d+ __ (\d+)\/\d+/.exec(row.prompt);
      return !!match && match[1] === match[2];
    });
    assert.ok(extensionRows.length > 0, 'the extension worksheet includes a same-numerator comparison');
    assert.ok(extensionRows.every((row) => explainsPieceSize(row.hint)), 'extension worksheet hints make the larger-denominator rule explicit');

    const generatedUnlike = Array.from({ length: 40 }, (_, seed) => generateQuestions('compare-unlike-fractions', ['x'], seed + 1, 12)).flat().filter((question) => {
      const match = /(\d+)\/\d+ or (\d+)\/\d+/.exec(question.prompt);
      return !!match && match[1] === match[2];
    });
    assert.ok(generatedUnlike.length > 0, 'generated unlike-fraction practice includes same-numerator comparisons');
    assert.ok(generatedUnlike.every((question) =>
      explainsPieceSize(question.hint) || /same denominator.*compare (?:the )?numerators/i.test(question.hint),
    ), 'same-numerator extension practice explains piece size or gives the valid same-denominator strategy');
  });
});

describe('whole number × fraction is in the grade-4 path', () => {
  it('ends unit 8 (4.NF.4a, then 4.NF.4b), so the level quiz reaches it', () => {
    const unit8 = MISSIONS.filter((m) => m.unit === 8).map((m) => m.id);
    assert.deepEqual(unit8.slice(-2), ['unit-fraction-multiples', 'multiply-whole-by-fraction']);
    assert.ok(placementItems(8, 3).some((item) => item.missionId === 'multiply-whole-by-fraction'));
    // Moving lessons into unit 8 doesn't let a newcomer skip unit 8.
    const ahead = updateLearning(EMPTY_PROGRESS, 'simplify-fractions', { ...emptyLearningRecord(), practiceDone: true });
    assert.equal(isMissionUnlocked(ahead, 'simplify-fractions'), false, 'without unit 8 a newcomer is still locked');
  });
});

describe('fraction labels on bar models', () => {
  it('labels the fractions a question names, never the one that is the answer', () => {
    const bars = (...f: [number, number][]) => ({ kind: 'bars' as const, bars: f.map(([numerator, denominator]) => ({ numerator, denominator })) });
    const labels = (m: ReturnType<typeof nameBars>) => (m.kind === 'bars' ? m.bars.map((b) => !!b.named) : []);
    assert.deepEqual(labels(nameBars(bars([3, 4], [3, 8]), 'Which is bigger, 3/4 or 3/8?')), [true, true]);
    assert.deepEqual(labels(nameBars(bars([2, 3], [4, 6]), 'Which is the same as 2/3?')), [true, false]);
    assert.deepEqual(labels(nameBars(bars([3, 5]), 'What fraction is shaded?')), [false]);
    assert.deepEqual(labels(nameBars(bars([4, 10], [35, 100]), 'Which is bigger, 0.4 or 0.35?')), [true, true]);
    // "What fraction is 0.35?": the 35/100 label would be the answer, so it waits until the child answers.
    const decimal = MISSIONS.find((m) => m.id === 'hundredths-decimals')!.questions.find((q) => /What fraction is 0\.35\?/.test(q.prompt));
    if (decimal?.model.kind === 'bars') assert.ok(decimal.model.bars.every((bar) => !bar.named || bar.untilAnswered), 'no label gives 35/100 away');
    const compare = MISSIONS.find((m) => m.id === 'compare-same-numerator')!.questions.find((q) => /2\/3 or 2\/8/.test(q.prompt))!;
    assert.deepEqual(labels(compare.model), [true, true]);
    const practice = generateQuestions('compare-same-numerator', ['x'], 2, 6);
    assert.ok(practice.every((q) => labels(q.model).every(Boolean)));
  });
});

describe('natural read-aloud voice', () => {
  it('recognizes iPhone and touch-enabled iPad devices for the safe device-voice fallback', () => {
    assert.equal(isIOSVoiceDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)', 'iPhone', 5), true);
    assert.equal(isIOSVoiceDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)', 'iPad', 5), true);
    assert.equal(isIOSVoiceDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 5), true);
    assert.equal(isIOSVoiceDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X)', 'MacIntel', 1), false);
    assert.equal(isIOSVoiceDevice('Mozilla/5.0 (Linux; Android 15)', 'Linux armv8l', 5), false);
  });
  it('offers the natural voice on iPhone and iPad too (the server makes the audio)', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        platform: 'iPhone',
        maxTouchPoints: 5,
      },
    });
    try {
      const markup = renderToStaticMarkup(createElement(LearningVoicePicker));
      assert.match(markup, /works on every device, iPhone and iPad included/);
      assert.match(markup, /radio-natural-voice-af_heart/);
      assert.match(markup, /radio-natural-voice-off/);
      // Only the pack voice, Heart, is offered (Michael and Emma were retired).
      for (const voice of ['am_michael', 'bf_emma', 'af_bella', 'bm_george']) assert.doesNotMatch(markup, new RegExp(`radio-natural-voice-${voice}`));
      assert.doesNotMatch(markup, /paused on iPhone/);
    } finally {
      if (original) Object.defineProperty(globalThis, 'navigator', original);
      else Reflect.deleteProperty(globalThis, 'navigator');
    }
  });
  const device = () => {
    const utterances: SpeechSynthesisUtterance[] = [];
    const synthesis = {
      getVoices: () => [{ name: 'Samantha', lang: 'en-US', default: true }] as SpeechSynthesisVoice[],
      speak(utterance: SpeechSynthesisUtterance) { utterances.push(utterance); },
      cancel() {}, addEventListener() {}, removeEventListener() {},
    } as unknown as SpeechSynthesis;
    return { utterances, synthesis };
  };
  const reader = (ready: boolean, ok = true) => {
    const calls = { spoken: [] as string[][], warmUps: 0, stops: 0 };
    return { calls, natural: {
      ready: () => ready,
      speak(parts: string[], done: (ok: boolean) => void) { calls.spoken.push(parts); done(ok); },
      stop() { calls.stops++; },
      warmUp() { calls.warmUps++; },
    } };
  };
  it('reads with the natural voice once it is ready, in sentences, with fractions said aloud', () => {
    const { utterances, synthesis } = device(); const { calls, natural } = reader(true);
    const states: boolean[] = [];
    const controller = createLearningSpeechController(synthesis, (s) => states.push(s), makeTestSpeechUtterance, 0, () => null, natural);
    controller.speak('Compare 3/4 with 3/8. Fourths are bigger.', 'en-US');
    assert.deepEqual(calls.spoken, [['Compare three fourths with three eighths.', 'Fourths are bigger.']]);
    assert.equal(utterances.length, 0, 'the device voice is not used');
    assert.deepEqual(states, [true, false]);
    controller.dispose();
  });
  it('uses the device voice while the natural voice downloads, and falls back if it fails', () => {
    const first = device(); const loading = reader(false);
    const c1 = createLearningSpeechController(first.synthesis, () => undefined, makeTestSpeechUtterance, 0, () => null, loading.natural);
    c1.speak('One half.', 'en-US');
    assert.equal(loading.calls.warmUps, 1, 'starts the one-time download');
    assert.equal(first.utterances.length, 1);
    c1.dispose();
    const second = device(); const broken = reader(true, false);
    const c2 = createLearningSpeechController(second.synthesis, () => undefined, makeTestSpeechUtterance, 0, () => null, broken.natural);
    c2.speak('One half.', 'en-US');
    assert.equal(second.utterances.length, 1, 'a failed natural reading falls back to the device voice');
    c2.dispose();
  });
  it('picks up where a failed natural reading stopped, never from the start again', () => {
    const { utterances, synthesis } = device();
    const natural = {
      ready: () => true,
      // Plays the first two sentences, then a clip fails on the third.
      speak(parts: string[], done: (ok: boolean) => void, _phase?: unknown, _failure?: unknown, onPart?: (index: number) => void) {
        onPart?.(0); onPart?.(1); onPart?.(2); done(false);
      },
      stop() {}, warmUp() {},
    };
    const controller = createLearningSpeechController(synthesis, () => undefined, makeTestSpeechUtterance, 0, () => null, natural);
    controller.speak('One. Two. Three. Four.', 'en-US');
    // Each sentence is handed over when the one before ends.
    assert.deepEqual(utterances.map((utterance) => utterance.text), ['Three.']);
    utterances[0].onend?.(new Event('end') as SpeechSynthesisEvent);
    assert.deepEqual(utterances.map((utterance) => utterance.text), ['Three.', 'Four.']);
    controller.dispose();
  });
  it('keeps a story comic in the natural voice: no device voice when it fails, and a short wait while it connects', async () => {
    const failing = device();
    const ends: string[] = [];
    const broken = { ready: () => true, chosen: () => true, speak(_parts: string[], done: (ok: boolean) => void) { done(false); }, stop() {}, warmUp() {} };
    const c1 = createLearningSpeechController(failing.synthesis, () => undefined, makeTestSpeechUtterance, 0, () => null, broken);
    c1.speak('Chomp cut the pie. The pieces are not fair.', 'en-US', { onEnd: () => ends.push('ended') });
    assert.equal(failing.utterances.length, 0, 'the comic carries on with captions, not the device voice');
    assert.deepEqual(ends, ['ended']);
    c1.dispose();

    const waiting = device();
    let ready = false; const spoken: string[][] = [];
    const connecting = {
      ready: () => ready, chosen: () => true,
      whenReady: async () => { ready = true; return true; },
      speak(parts: string[], done: (ok: boolean) => void) { spoken.push(parts); done(true); },
      stop() {}, warmUp() {},
    };
    const c2 = createLearningSpeechController(waiting.synthesis, () => undefined, makeTestSpeechUtterance, 0, () => null, connecting);
    c2.speak('Chomp cut the pie.', 'en-US', {});
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(waiting.utterances.length, 0, 'the comic did not start in the device voice');
    assert.deepEqual(spoken, [['Chomp cut the pie.']]);
    c2.dispose();
  });
  it('a Listen tap waits a moment for the natural voice while it connects, and only then falls back to the device voice', async () => {
    // Reported: the Teach first Listen button read in the device voice although the natural voice was on.
    const waiting = device();
    let ready = false; const spoken: string[][] = [];
    const connecting = {
      ready: () => ready, chosen: () => true,
      whenReady: async () => { ready = true; return true; },
      speak(parts: string[], done: (ok: boolean) => void) { spoken.push(parts); done(true); },
      stop() {}, warmUp() {},
    };
    const c1 = createLearningSpeechController(waiting.synthesis, () => undefined, makeTestSpeechUtterance, 0, () => null, connecting);
    c1.speak('Look at the denominators.', 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(waiting.utterances.length, 0, 'the device voice did not start while the natural voice connected');
    assert.deepEqual(spoken, [['Look at the denominators.']]);
    c1.dispose();

    const slow = device();
    const neverReady = { ready: () => false, chosen: () => true, whenReady: async () => false, speak() {}, stop() {}, warmUp() {} };
    const c2 = createLearningSpeechController(slow.synthesis, () => undefined, makeTestSpeechUtterance, 0, () => null, neverReady);
    c2.speak('Look at the denominators.', 'en-US');
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(slow.utterances.length, 1, 'still read aloud, in the device voice, when the natural voice cannot connect');
    c2.dispose();
  });
  it('plays natural audio when a mobile browser returns no promise from audio.play()', async () => {
    setNaturalVoicePreference('af_heart');
    setNaturalEngineForTests({
      async generate() { return { toBlob: () => new Blob(['sample audio'], { type: 'audio/wav' }) }; },
    });
    let audio!: HTMLAudioElement;
    audio = {
      duration: Number.NaN,
      pause() {},
      play() {
        queueMicrotask(() => {
          audio.onplaying?.(new Event('playing'));
          audio.onended?.(new Event('ended'));
        });
        return undefined;
      },
    } as unknown as HTMLAudioElement;
    const speaker = createNaturalSpeaker(() => audio);
    try {
      const phases: string[] = [];
      const result = new Promise<boolean>((resolve) => speaker.speak(['Hello there.'], resolve, (phase) => phases.push(phase)));
      assert.equal(await result, true);
      assert.deepEqual(phases, ['preparing', 'generating', 'playing']);
    } finally {
      speaker.stop();
      setNaturalEngineForTests(null);
    }
  });
  it('makes every sentence before playing and reports each one as it starts', async () => {
    setNaturalVoicePreference('af_heart');
    const made: string[] = [];
    setNaturalEngineForTests({
      async generate(text: string) { made.push(text); return { toBlob: () => new Blob([text], { type: 'audio/wav' }) }; },
    });
    let audio!: HTMLAudioElement;
    let playsBeforeAllMade = 0;
    audio = {
      duration: Number.NaN,
      pause() {},
      play() {
        if (made.length < 3) playsBeforeAllMade++;
        queueMicrotask(() => { audio.onplaying?.(new Event('playing')); audio.onended?.(new Event('ended')); });
        return Promise.resolve();
      },
    } as unknown as HTMLAudioElement;
    const speaker = createNaturalSpeaker(() => audio);
    try {
      const parts: number[] = [];
      const ok = await new Promise<boolean>((resolve) => speaker.speak(['One.', 'Two.', 'Three.'], resolve, undefined, undefined, (i) => parts.push(i)));
      assert.equal(ok, true);
      assert.equal(playsBeforeAllMade, 0, 'nothing plays until every sentence is ready');
      assert.deepEqual(parts, [0, 1, 2]);
    } finally {
      speaker.stop();
      setNaturalEngineForTests(null);
    }
  });
  it('gives up cleanly when the voice is too slow, without playing part of the story', async () => {
    setNaturalVoicePreference('af_heart');
    setNaturalEngineForTests({
      async generate(text: string) {
        if (text === 'Slow.') await new Promise((resolve) => setTimeout(resolve, 200));
        return { toBlob: () => new Blob([text], { type: 'audio/wav' }) };
      },
    });
    let plays = 0;
    const audio = { duration: Number.NaN, pause() {}, play() { plays++; return Promise.resolve(); } } as unknown as HTMLAudioElement;
    const speaker = createNaturalSpeaker(() => audio, undefined, 30);
    try {
      let failed = false;
      const ok = await new Promise<boolean>((resolve) => speaker.speak(['Fast.', 'Slow.'], resolve, undefined, () => { failed = true; }));
      assert.equal(ok, false);
      assert.equal(failed, true);
      assert.equal(plays, 0);
    } finally {
      speaker.stop();
      setNaturalEngineForTests(null);
    }
  });
  it('is on by default and remembers a grown-up turning it off', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    assert.equal(naturalVoicePreference(), 'af_heart');
    setNaturalVoicePreference('off');
    assert.equal(naturalVoicePreference(), 'off');
    assert.equal(naturalVoiceStatus().state, 'off');
    setNaturalVoicePreference('af_heart');
    assert.equal(naturalVoicePreference(), 'af_heart');
    // A voice that is no longer offered (Michael and Emma were retired) falls back to Heart.
    for (const retired of ['am_michael', 'bf_emma', 'af_bella']) {
      store.set('fraction-quest-natural-voice', retired);
      assert.equal(naturalVoicePreference(), 'af_heart');
    }
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });
});

describe('mobile device voice previews', () => {
  it('reads the available device voices when speechSynthesis has no event-listener methods', () => {
    const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'samantha', default: true } as SpeechSynthesisVoice;
    let received: SpeechSynthesisVoice[] = [];
    const synthesis = { getVoices: () => [voice] } as unknown as SpeechSynthesis;
    const unsubscribe = subscribeToSpeechVoices(synthesis, (voices) => { received = voices; });
    assert.deepEqual(received, [voice]);
    assert.doesNotThrow(unsubscribe);
  });
  it('polls briefly for device voices when the browser cannot notify that they loaded', async () => {
    const voice = { name: 'Samantha', lang: 'en-US', voiceURI: 'samantha', default: true } as SpeechSynthesisVoice;
    let voices: SpeechSynthesisVoice[] = [];
    let received: SpeechSynthesisVoice[] = [];
    const synthesis = { getVoices: () => voices } as unknown as SpeechSynthesis;
    const unsubscribe = subscribeToSpeechVoices(synthesis, (next) => { received = next; });
    voices = [voice];
    try {
      await new Promise((resolve) => setTimeout(resolve, 550));
      assert.deepEqual(received, [voice]);
    } finally {
      unsubscribe();
    }
  });
});

describe('the simpler help stays about the question', () => {
  it('shows the fractions the question names, not an unrelated 1/2 bar', () => {
    const q = MISSIONS.find((m) => m.id === 'compare-same-numerator')!.questions.find((item) => /4\/6 or 4\/8/.test(item.prompt))!;
    assert.equal(q.simplerModel.kind, 'bars');
    if (q.simplerModel.kind === 'bars') assert.deepEqual(q.simplerModel.bars.map((b) => `${b.numerator}/${b.denominator}`), ['4/6', '4/8']);
    let unrelated = 0;
    for (const m of MISSIONS) for (const item of m.questions) {
      const namesOwn = item.model.kind === 'bars' && item.model.bars.some((b) => b.named);
      const helpNames = item.simplerModel.kind === 'bars' && item.simplerModel.bars.some((b) => b.named);
      if (namesOwn && !helpNames) unrelated++;
    }
    assert.equal(unrelated, 0);
  });
});

describe('lesson steps for the map pies', () => {
  it('counts each build check and the finished worksheet as equal slices', () => {
    const id = 'equal-parts';
    const checks = getBuildChecks(id);
    assert.deepEqual(lessonSteps(EMPTY_PROGRESS, id), { done: 0, total: checks.length + 1 });
    const record = emptyLearningRecord();
    record.checks[checks[0].id] = { passed: true, supported: false, attempts: 1 };
    assert.deepEqual(lessonSteps(updateLearning(EMPTY_PROGRESS, id, record), id), { done: 1, total: checks.length + 1 });
  });
});

describe('Kokoro from the server, and the self-test crash breadcrumbs', () => {
  it('shows the step-by-step self-test only with ?voicetest (the Preview voice button is the everyday test)', async () => {
    const { showVoiceSelfTest } = await import('./KokoroDiagnostic');
    assert.equal(showVoiceSelfTest(''), false);
    assert.equal(showVoiceSelfTest('?voicetest'), true);
    assert.equal(showVoiceSelfTest('?a=1&voicetest=1'), true);
    assert.equal(showVoiceSelfTest('?voicetester'), false);
    const learningText = readFileSync(new URL('./LearningText.tsx', import.meta.url), 'utf8');
    assert.match(learningText, /showVoiceSelfTest\(\)\s*&&\s*<KokoroDiagnostic\s*\/>/);
  });

  it('bundles one copy of react-query, so the grown-ups page finds its QueryClientProvider', () => {
    const config = readFileSync(new URL('../vite.config.ts', import.meta.url), 'utf8');
    assert.match(config, /dedupe:\s*\[[^\]]*'@tanstack\/react-query'/);
  });

  it('no longer ships the voice model to the browser', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { dependencies?: Record<string, string> };
    assert.equal(pkg.dependencies?.['kokoro-js'], undefined);
    assert.equal(pkg.dependencies?.['onnxruntime-web'], undefined);
    assert.doesNotMatch(readFileSync(new URL('./lib/natural-voice.ts', import.meta.url), 'utf8'), /import\('kokoro-js'\)/);
  });

  it('asks the server for each sentence and waits while the server loads the voice', async () => {
    const { serverEngine, speechUrl, warmUpNaturalVoice, setNaturalEngineForTests, setNaturalVoicePreference } = await import('./lib/natural-voice');
    assert.equal(speechUrl('af_heart', '3/4 & more'), '/api/voice/speech?voice=af_heart&text=3%2F4%20%26%20more');
    const originalFetch = globalThis.fetch; const hadWindow = typeof (globalThis as { window?: unknown }).window !== 'undefined';
    const originalAudio = (globalThis as { Audio?: unknown }).Audio;
    const asked: string[] = []; let statusCalls = 0;
    globalThis.fetch = (async (url: string) => {
      asked.push(url);
      if (url.startsWith('/api/voice/status')) { statusCalls++; return new Response(JSON.stringify({ state: statusCalls < 2 ? 'loading' : 'ready' })); }
      return new Response(new Blob([new Uint8Array([82, 73, 70, 70])], { type: 'audio/wav' }));
    }) as typeof fetch;
    if (!hadWindow) Object.defineProperty(globalThis, 'window', { configurable: true, value: globalThis });
    (globalThis as { Audio?: unknown }).Audio = class {};
    try {
      setNaturalEngineForTests(null); setNaturalVoicePreference('af_heart');
      const engine = await warmUpNaturalVoice();
      assert.equal(engine, serverEngine);
      assert.equal(statusCalls, 2, 'it kept asking until the server said ready');
      const clip = await serverEngine.generate('One half.', { voice: 'af_heart', speed: 1 });
      assert.equal(clip.toBlob().type, 'audio/wav');
      assert.ok(asked.includes('/api/voice/speech?voice=af_heart&text=One%20half.'));
    } finally {
      globalThis.fetch = originalFetch; (globalThis as { Audio?: unknown }).Audio = originalAudio;
      if (!hadWindow) Reflect.deleteProperty(globalThis, 'window');
      setNaturalEngineForTests(null);
    }
  });

  it('prefetches visible-section audio and shares it with Listen without prefetching when voice is off', async () => {
    const {
      naturalVoicePreference,
      prefetchNaturalVoice,
      serverEngine,
      setNaturalEngineForTests,
      setNaturalVoicePreference,
    } = await import('./lib/natural-voice');
    const originalFetch = globalThis.fetch;
    const previousChoice = naturalVoicePreference();
    const asked: string[] = [];
    let releaseFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => { releaseFirst = resolve; });
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      if (url.endsWith('/voice/index.json')) return new Response('', { status: 404 }); // no voice pack in this test
      asked.push(url);
      if (asked.length === 1) return firstResponse;
      return new Response(new Uint8Array([82, 73, 70, 70]), { headers: { 'Content-Type': 'audio/wav' } });
    }) as typeof fetch;
    try {
      setNaturalEngineForTests(null);
      setNaturalVoicePreference('af_heart');
      const prefetch = prefetchNaturalVoice('af_heart', ['First sentence.', 'Second sentence.']);
      const listen = serverEngine.generate('First sentence.', { voice: 'af_heart', speed: 0.92 });
      await new Promise((resolve) => setTimeout(resolve, 0)); // the voice pack lookup comes first
      assert.equal(asked.filter((url) => /First%20sentence/.test(url)).length, 1, 'Listen shares the in-flight prefetch request');
      assert.ok(asked.some((url) => /Second%20sentence/.test(url)), 'the second sentence loads alongside the first, not after it');
      releaseFirst(new Response(new Uint8Array([82, 73, 70, 70]), { headers: { 'Content-Type': 'audio/wav' } }));
      await Promise.all([prefetch, listen]);
      await serverEngine.generate('First sentence.', { voice: 'af_heart', speed: 0.92 });
      assert.equal(asked.length, 2, 'the first sentence is cached and only the second sentence needed a request');
      assert.match(asked[0], /text=First%20sentence\./);
      assert.match(asked[1], /text=Second%20sentence\./);

      // A sentence the server can't make is skipped; the ones after it still load.
      asked.length = 0;
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.endsWith('/voice/index.json')) return new Response('', { status: 404 });
        asked.push(url);
        if (/Broken/.test(url)) return new Response('busy', { status: 503 });
        return new Response(new Uint8Array([82, 73, 70, 70]), { headers: { 'Content-Type': 'audio/wav' } });
      }) as typeof fetch;
      await prefetchNaturalVoice('af_heart', ['Broken one.', 'After one.', 'After two.', 'After three.', 'After four.']);
      assert.equal(asked.length, 5, 'every sentence was asked for, even after a failure');

      setNaturalVoicePreference('off');
      await prefetchNaturalVoice('af_heart', ['Do not prefetch this sentence.']);
      assert.equal(asked.length, 5, 'disabled natural voice does not start prefetch requests');
    } finally {
      globalThis.fetch = originalFetch;
      setNaturalVoicePreference(previousChoice);
      setNaturalEngineForTests(null);
    }
  });

  it('remembers the step a crashed test reached and reports it after the reload', async () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); },
    };
    try {
      const { KokoroDiagnostic, readBreadcrumb, saveBreadcrumb, clearBreadcrumb } = await import('./KokoroDiagnostic');
      saveBreadcrumb('load', 'connected to the voice server');
      assert.equal(readBreadcrumb()?.step, 'load');
      const markup = renderToStaticMarkup(createElement(KokoroDiagnostic));
      assert.match(markup, /The last test stopped the page during: Reach the Kokoro voice server \(connected to the voice server\)/);
      assert.match(markup, /Safari ran out of memory/);
      clearBreadcrumb();
      assert.equal(readBreadcrumb(), null);
      assert.doesNotMatch(renderToStaticMarkup(createElement(KokoroDiagnostic)), /The last test stopped the page/);
    } finally {
      delete (globalThis as { localStorage?: unknown }).localStorage;
    }
  });
});

/** A tap question shows a sign as a full comparison ("6/9 < 7/9"); the worksheet answer is just the sign. */
const signOnly = (answer: string, key: string) => /^[<=>]$/.test(key) ? /^.+ ([<=>]) .+$/.exec(answer)?.[1] ?? answer : answer;

describe('fourth answer choice', () => {
  it('adds a believable wrong answer that is never a second right one', () => {
    assert.equal(fourthChoice('Pick the sign: 6/9 __ 7/9', ['>', '<', '='], 1), null, 'sign questions are made by withSignComparisons');
    const signs = withSignComparisons('Pick the sign: 6/9 __ 7/9', ['>', '<', '='], 1);
    assert.deepEqual(signs, { choices: ['6/9 > 7/9', '6/9 < 7/9', '6/9 = 7/9', "You can't tell"], correctChoice: 1 });
    assert.deepEqual(withSignComparisons('Pick the sign: 6/9 __ 7/9', ['>', '<', '='], 0, 1), { choices: ['6/9 > 7/9', "You can't tell", '6/9 < 7/9', '6/9 = 7/9'], correctChoice: 0 });
    // Yes-or-no answers list "No, …" first, then "Yes, …"; the right answer moves with its choice.
    const yn = noBeforeYes({ choices: ['Yes, same-size parts', 'No, some parts are bigger', 'Yes, it is cut into pieces', 'No, the shapes are different'], correctChoice: 0 });
    assert.deepEqual(yn.choices, ['No, some parts are bigger', 'No, the shapes are different', 'Yes, same-size parts', 'Yes, it is cut into pieces']);
    assert.equal(yn.correctChoice, 2);
    const mixed = noBeforeYes({ choices: ['Yes, 3 equal pieces', "You can't tell", 'No, the pieces are unequal'], correctChoice: 1 });
    assert.deepEqual(mixed.choices, ['No, the pieces are unequal', 'Yes, 3 equal pieces', "You can't tell"], 'other answers come after the yes and no ones');
    assert.equal(mixed.correctChoice, 2);
    const plain = { choices: ['1/2', '1/3', '1/4'], correctChoice: 0 };
    assert.equal(noBeforeYes(plain), plain, 'questions without yes and no answers keep their order');
    for (const mission of MISSIONS) for (const question of mission.questions) {
      const kinds = question.choices.map((choice) => /^yes\b/i.test(choice) ? 'y' : /^no\b/i.test(choice) ? 'n' : '-').join('');
      if (kinds.includes('y') && kinds.includes('n')) assert.ok(/^n*y*-*$/.test(kinds), `${question.id}: no before yes (${question.choices.join(' | ')})`);
    }
    assert.equal(fourthChoice('Which is bigger, 4/7 or 2/7?', ['4/7', '2/7', 'They are equal'], 0), "You can't tell");
    const order = fourthChoice('Put 1/2, 3/10 and 8/10 in order, smallest first.', ['8/10, 1/2, 3/10', '3/10, 1/2, 8/10', '1/2, 3/10, 8/10'], 1)!;
    assert.ok(order && !['8/10, 1/2, 3/10', '3/10, 1/2, 8/10', '1/2, 3/10, 8/10'].includes(order));
    assert.deepEqual(order.split(', ').sort(), ['1/2', '3/10', '8/10']);
    const more = fourthChoice('Which is more than 1/2?', ['5/8', '2/6', '3/10'], 0)!;
    assert.ok(answerValue(more) < 0.5, more);
    const closest = fourthChoice('Which is closest to 1/2?', ['1/5', '4/9', '7/8'], 1)!;
    assert.ok(Math.abs(answerValue(closest) - 0.5) > Math.abs(4 / 9 - 0.5), closest);
    const unit = fourthChoice('Which is a unit fraction?', ['3/8', '1/8', '8/1'], 1)!;
    assert.doesNotMatch(unit, /^1\//);
    const sum = fourthChoice('Which adds up to 3/5?', ['1/5 + 1/5', '1/5 + 2/5', '3/5 + 2/5'], 1)!;
    assert.match(sum, /^\d+\/5 \+ \d+\/5$/);
    assert.notEqual(sum.split(' + ').reduce((t, x) => t + Number(x.split('/')[0]), 0), 3);
    const amountQ = fourthChoice('What is 1/6 + 4/6?', ['5/12', '5/6', '1/6'], 1)!;
    assert.match(amountQ, /\/6$/, 'keeps the denominator the question uses');
    assert.notEqual(answerValue(amountQ), 5 / 6);
    assert.equal(fourthChoice('Is it equal?', ['Yes, 3 equal pieces', 'No, 2 pieces', 'No, not equal'], 0), null, 'worded reasons are written by hand');
  });
});

describe('number-line tick labels', () => {
  it('reads 0, 1/5, 2/5 … 1 along the line', async () => {
    const { TickLabel } = await import('./fraction-ui');
    const html = (i: number, d: number) => renderToStaticMarkup(createElement(TickLabel, { i, d }));
    assert.match(html(0, 5), />0</);
    assert.match(html(2, 5), /aria-label="2 over 5"/);
    assert.match(html(2, 5), /<b>2<\/b>.*<b>5<\/b>/);
    assert.match(html(5, 5), />1</);
    assert.match(html(7, 5), /aria-label="7 over 5"/, 'past 1 the labels keep counting fifths');
    assert.match(html(10, 5), />2</);
  });
});

describe('wrong-answer help', () => {
  it('names the slip behind the picked choice, without giving the answer', () => {
    const q = 'A shape has 9 equal parts. 1 is colored. What fraction is colored?';
    assert.match(wrongChoiceReason(q, ['9/1', '1/9', '1/8', '1/10'], 1, 0)!, /flipped/);
    assert.match(wrongChoiceReason(q, ['9/1', '1/9', '1/8', '1/10'], 1, 2)!, /Count all the equal parts again/);
    assert.match(wrongChoiceReason('What is 3/8 + 2/8?', ['5/8', '5/16', '6/8', '5/13'], 0, 1)!, /Add only the (?:top numbers|numerators)/);
    assert.match(wrongChoiceReason('Write 8/100 as a decimal.', ['0.08', '0.8', '8.00', '0.008'], 0, 1)!, /places/);
    assert.match(wrongChoiceReason('Which is bigger, 1/4 or 1/6?', ['1/4', '1/6', 'They are equal', "You can't tell"], 0, 1)!, /More equal parts make each part smaller/);
    assert.match(wrongChoiceReason('Which is bigger, 1/4 or 1/6?', ['1/4', '1/6', 'They are equal', "You can't tell"], 0, 3)!, /You can tell/);
    assert.match(wrongChoiceReason('Which is bigger, 1/4 or 1/6?', ['1/4', '1/6', 'They are equal', "You can't tell"], 0, 2)!, /same number of parts, but the parts are different sizes/);
    assert.match(wrongChoiceReason('Which is bigger, 5/8 or 1/2?', ['5/8', '1/2', 'They are equal', "You can't tell"], 0, 2)!, /not the same size/);
    assert.equal(wrongChoiceReason('Is this strip cut into thirds?', ['Yes, 3 equal pieces', 'No, the pieces are unequal'], 1, 0), null, 'worded choices fall back to the lesson help');
    assert.equal(wrongChoiceReason(q, ['9/1', '1/9'], 1, 1), null, 'no help for a right answer');
    for (const m of MISSIONS) for (const question of m.questions) question.choices.forEach((_, i) => {
      const said = wrongChoiceReason(question.prompt, question.choices, question.correctChoice, i);
      if (said) assert.ok(!said.includes(question.choices[question.correctChoice]) || /^\d$/.test(question.choices[question.correctChoice]), `${question.id}: help gives the answer away`);
    });
  });
  it('says why a slip is wrong, for the slip behind the picked choice', () => {
    const why = (prompt: string, right: string, pick: string) => wrongChoiceReason(prompt, [right, pick], 0, 1);
    // Adding and taking away.
    assert.equal(why('What is 1/3 + 1/6?', '3/6', '2/6'), WHY.keptOne);
    assert.equal(why('What is 1/6 + 4/6?', '5/6', '4/6'), WHY.oneAmount);
    assert.equal(why('What is 5/6 − 2/6?', '3/6', '7/6'), WHY.otherOpTake);
    assert.equal(why('What is 5/6 − 2/6?', '3/6', '5/6'), WHY.startAmount);
    assert.equal(why('3 2/6 − 1 3/6 = ?', '1 5/6', '2 1/6'), WHY.smallerFromBigger, 'like denominators: the smaller part from the bigger');
    assert.equal(why('3 2/6 − 1 3/6 = ?', '1 5/6', '2 5/6'), WHY.trade);
    assert.equal(why('2 2/6 + 4/6 = ?', '3', '2'), WHY.carry);
    assert.equal(why('11/12 − 1/4 = ?', '8/12', '10/8'), WHY.acrossTake);
    // Multiplying, sharing and fitting.
    assert.equal(why('Write 4 × 1/3 as one fraction.', '4/3', '4/12'), WHY.onlyTop);
    assert.equal(why('2 loaves are shared fairly by 3 friends. How much does each friend get?', '2/3', '1/3'), WHY.shareOne);
    assert.equal(why('How many 1/4-pound bags can be filled from 3 pounds of clay?', '12 bags', '7 bags'), WHY.addedForFit);
    assert.equal(why('How many 1/3-cup scoops fill 2 cups? 2 ÷ 1/3 = ?', '6', '3'), WHY.oneWhole);
    // Groups of whole things and units.
    assert.equal(why('What is 2/3 of 12?', '8', '4'), WHY.oneGroup);
    assert.equal(why('How many minutes are in 1/4 hour?', '15', '45'), WHY.leftPart);
    assert.equal(why('A 2-liter jug is 1/4 full. How many milliliters are inside?', '500', '250'), WHY.oneOfMany);
    assert.equal(why('Tom read 6 pages. That is 3/4 of his book. How many pages are in the book?', '8', '6'), WHY.knownPart);
    // Naming, renaming, decimals and percents.
    assert.equal(why('A bag has 8 marbles. 5 are green. What is the chance of picking green?', '5/8', '3/8'), WHY.otherParts);
    assert.equal(why('Which is the same as 3/4?', '6/8', '3/8'), WHY.keptTop);
    assert.equal(why('What is 5/3 as wholes and a fraction?', '1 and 2/3', '2 and 1/3'), WHY.andSwap);
    assert.equal(why('Write 9/20 as a percent.', '45%', '18%'), WHY.percentRename);
    assert.equal(why('Max eats 1/3 of a pizza. Then he eats 1/2 of what is left. What fraction of the pizza is left now?', '1/3', '1/6'), WHY.ofRest);
  });
  it('matches a slip only as written: the same amount written another way came from somewhere else', () => {
    // 3/6 is worth 2/4, the "green to the rest" slip, but it is not that slip.
    assert.notEqual(wrongChoiceReason('A bag has 6 marbles. 2 are green. What is the chance of picking green?', ['2/6', '3/6'], 0, 1), WHY.partToPart);
    assert.notEqual(wrongChoiceReason('What is 2/8 + 6/8?', ['8/8', '4/8'], 0, 1), WHY.acrossAdd);
  });
  it('says why a sign, an order or a benchmark choice is wrong', () => {
    const why = (prompt: string, right: string, pick: string) => wrongChoiceReason(prompt, [right, pick], 0, 1);
    assert.equal(why('Pick the sign: 1/6 __ 1/4', '1/6 < 1/4', '1/4 < 1/6'), WHY.bigBottom);
    assert.equal(why('Compare: 0.4 __ 0.35.', '0.4 > 0.35', '0.4 < 0.35'), WHY.moreDigits);
    assert.equal(why('Compare: 0.23 __ 0.32.', '0.23 < 0.32', '0.32 < 0.23'), WHY.signWay);
    assert.match(why('Compare: 0.23 __ 0.32.', '0.23 < 0.32', '0.23 = 0.32')!, /not the same amount/);
    assert.equal(why('Without multiplying, compare 3/2 × 12 with 12: __ 12.', '3/2 × 12 > 12', '3/2 × 12 < 12'), WHY.scaleCompare);
    assert.equal(why('Without finding the exact sum, compare 3/4 + 1/2 with 1: __ 1.', '3/4 + 1/2 > 1', '3/4 + 1/2 < 1'), WHY.benchmarkSum);
    assert.equal(why('Which order goes smallest to biggest?', '1/3 < 2/3 < 3/3', '3/3 < 2/3 < 1/3'), WHY.backwards);
    assert.equal(why('Which order goes biggest to smallest?', '1/2 > 1/4 > 1/8', '1/2 > 1/8 > 1/4'), WHY.orderPair);
    assert.equal(why('Which is closest to 1/2?', '5/8', '7/8'), WHY.farther);
    assert.equal(why('Which is more than one whole?', '9/8', '7/8'), WHY.notMore);
    assert.equal(why('Which is just a little less than 1/2?', '3/8', '5/8'), WHY.notLess);
    assert.equal(why('Which is just a little less than 1/2?', '3/8', '1/8'), WHY.farther);
    assert.equal(why('Which fits between 2/8 and 6/8?', '4/8', '1/8'), WHY.outside);
  });
  it('says why for nearly every wrong choice in the course, and for every real-mistake choice', () => {
    let wrong = 0; let said = 0;
    for (const m of MISSIONS) for (const q of m.questions) q.choices.forEach((choice, i) => {
      if (i === q.correctChoice) return;
      wrong++;
      const reason = wrongChoiceReason(q.prompt, q.choices, q.correctChoice, i);
      if (reason) said++;
      const slips = [...misconceptionWrongs(q.prompt, q.choices[q.correctChoice]), ...fractionMistakes(q.prompt, q.choices[q.correctChoice])];
      if (slips.includes(choice)) assert.ok(reason, `${q.id}: no reason for the slip ${choice}`);
    });
    // The rest are worded choices ("No, the parts are unequal") that say their own reason, and ruler readings.
    assert.ok(said / wrong >= 0.85, `only ${said} of ${wrong} wrong choices say why`);
  });
  it('never puts an amount in a reason, so none can give an answer away', () => {
    for (const [key, sentence] of Object.entries(WHY)) {
      if (key === 'places') continue; // "Tenths are 1 place…" names places, not amounts
      assert.doesNotMatch(sentence, /\d/, key);
    }
  });
  it('opens kindly, with a few different openers', () => {
    const openers = new Set(MISSIONS.flatMap((m) => m.questions.map((q) => retryOpener(`${q.id}:1`))));
    assert.ok(openers.size >= 4);
    for (const o of openers) assert.doesNotMatch(o, /wrong|no!/i);
  });
});

describe('Expo iPhone shell', () => {
  it('loads the web app from its own domain, keeps app pages inside, and reads its messages', async () => {
    const { webAppUrl, isAppPage, parseShellMessage } = await import('../../fraction-quest-ios/lib/web-app');
    const saved = { url: process.env.EXPO_PUBLIC_WEB_APP_URL, domain: process.env.EXPO_PUBLIC_DOMAIN };
    try {
      delete process.env.EXPO_PUBLIC_WEB_APP_URL;
      process.env.EXPO_PUBLIC_DOMAIN = 'fraction-quest.example.replit.app';
      assert.equal(webAppUrl(), 'https://fraction-quest.example.replit.app/');
      process.env.EXPO_PUBLIC_WEB_APP_URL = 'https://fractionquest.app';
      assert.equal(webAppUrl(), 'https://fractionquest.app/', 'an explicit address wins');
      delete process.env.EXPO_PUBLIC_WEB_APP_URL; delete process.env.EXPO_PUBLIC_DOMAIN;
      assert.equal(webAppUrl(), null);
    } finally {
      if (saved.url === undefined) delete process.env.EXPO_PUBLIC_WEB_APP_URL; else process.env.EXPO_PUBLIC_WEB_APP_URL = saved.url;
      if (saved.domain === undefined) delete process.env.EXPO_PUBLIC_DOMAIN; else process.env.EXPO_PUBLIC_DOMAIN = saved.domain;
    }
    assert.equal(isAppPage('https://a.replit.app/lesson', 'https://a.replit.app/'), true);
    assert.equal(isAppPage('https://webassets.zearn.org/guide.pdf', 'https://a.replit.app/'), false, 'other sites open in Safari');
    assert.equal(isAppPage('about:blank', 'https://a.replit.app/'), true);
    assert.deepEqual(parseShellMessage('{"type":"haptic","cue":"correct"}'), { type: 'haptic', cue: 'correct' });
    assert.deepEqual(parseShellMessage('{"type":"haptic","cue":"selection"}'), { type: 'haptic', cue: 'selection' });
    assert.equal(parseShellMessage('{"type":"haptic","cue":"unknown"}'), null);
    assert.equal(parseShellMessage('{"type":"print","html":"<html></html>"}')?.type, 'print');
    assert.equal(parseShellMessage('{"type":"other"}'), null);
    assert.equal(parseShellMessage('not json'), null);
  });

  it('the web app talks to the shell only when it is inside it', async () => {
    const { inExpoShell, postToShell } = await import('./lib/native-shell');
    assert.equal(inExpoShell(), false);
    assert.equal(postToShell({ type: 'haptic', cue: 'correct' }), false);
    const sent: string[] = [];
    (globalThis as { ReactNativeWebView?: unknown }).ReactNativeWebView = { postMessage: (m: string) => sent.push(m) };
    try {
      assert.equal(inExpoShell(), true);
      assert.equal(postToShell({ type: 'haptic', cue: 'retry' }), true);
      assert.deepEqual(JSON.parse(sent[0]), { type: 'haptic', cue: 'retry' });
    } finally { delete (globalThis as { ReactNativeWebView?: unknown }).ReactNativeWebView; }
  });
});

describe('hints shown before answering', () => {
  it('never state the answer (lesson and generated questions)', () => {
    const leaks: string[] = [];
    for (const mission of MISSIONS) {
      const questions = [...mission.questions, ...(hasGenerator(mission.id) ? [1, 2, 3].flatMap((seed) => generateQuestions(mission.id, [], seed, 12)) : [])];
      for (const question of questions) {
        const answer = question.choices[question.correctChoice];
        if (answer.length < 3 || /^Each [a-z ]*space is/.test(question.hint)) continue; // a ruler hint has to name its unit
        const exact = new RegExp(`(^|[^\\d/])${answer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\d/])`);
        if (exact.test(question.hint) && !exact.test(question.prompt)) leaks.push(`${question.id}: ${question.hint}`);
      }
    }
    assert.deepEqual(leaks, []);
  });
});

describe('worksheet hints shown before answering', () => {
  /** A hint may repeat the numbers in the question, but a number that the child has to work out must not be in it.
      Equal in value counts: 4 and 4/1 and 8/2 are the same answer. Answers of 0, 1 and 2 are skipped (the existing guard skips short answers too). */
  const numbersIn = (text: string) => [...text.matchAll(/\d+\s+(?:and\s+)?\d+\/\d+|\d+\/\d+|\d*\.\d+|\d+/g)].map((m) => m[0]);
  const sameValue = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  it('never state the answer, on any lesson, for sheets 0 to 40 and every row', () => {
    const leaks = new Map<string, string>();
    for (const mission of MISSIONS) {
      for (let sheet = 0; sheet <= 40; sheet++) {
        for (const problem of getWorksheet(mission.id, sheet)) {
          const answer = answerValue(problem.answer);
          if (!Number.isFinite(answer) || answer === 0 || answer === 1 || answer === 2) continue;
          const given = [...numbersIn(problem.prompt).map(answerValue), ...(problem.prompt.match(/\d*\.\d+|\d+/g) ?? []).map(Number)];
          if (given.some((value) => sameValue(value, answer))) continue; // the question already says it
          if (numbersIn(problem.hint).some((text) => sameValue(answerValue(text), answer))) {
            const template = `${mission.id} | ${problem.hint.replace(/\d+/g, '#')}`;
            if (!leaks.has(template)) leaks.set(template, `${problem.prompt} => ${problem.answer} | ${problem.hint}`);
          }
        }
      }
    }
    assert.deepEqual([...leaks.entries()].map(([template, example]) => `${template}\n      e.g. ${example}`), []);
  });
});

describe('daily practice support levels', () => {
  const now = new Date(2026, 9, 11, 12).getTime();
  const first12 = MISSIONS.slice(0, 12).map((mission) => mission.id);

  it('lets a lesson leave the "more help" set once its daily answers are right again', () => {
    const lesson = MISSIONS.find((mission) => mission.id === 'compare-same-denominator')!;
    const base: Progress = {
      ...EMPTY_PROGRESS,
      completedMissionIds: MISSIONS.slice(0, MISSIONS.indexOf(lesson) + 1).map((mission) => mission.id),
      learning: { [lesson.id]: { ...emptyLearningRecord(), completedAt: now - 1, misconceptions: { 'Compare the numerators': 3 } } },
      reviewQueue: [{ missionId: lesson.id, missedQuestionId: lesson.questions[0].id, dueAt: now - 1, reviewCount: 0 }],
    };
    const bandOf = (progress: Progress) => createDailyPractice(progress, now).questions.find((question) => question.missionId === lesson.id)?.difficultyBand;
    assert.equal(bandOf(base), 'scaffolded');
    const recovered: Progress = { ...base, adaptiveStandards: Object.fromEntries((lesson.standards ?? []).map((standard) => [standard, {
      status: 'developing' as const, recent: [false, true, true], accuracy: 2 / 3, streakCorrect: 2, streakMisses: 0, lastUpdatedAt: now - 1,
    }])) };
    assert.notEqual(bandOf(recovered), 'scaffolded');
  });

  it('takes stretch questions only from finished lessons', () => {
    const adaptiveStandards = Object.fromEntries(FRACTION_STANDARDS.map(({ id }) => [id, {
      status: 'mastered' as const, recent: [true, true, true, true, true], accuracy: 1, streakCorrect: 5, streakMisses: 0, lastUpdatedAt: now - 1,
    }]));
    const progress: Progress = { ...EMPTY_PROGRESS, placement: { unit: 12, at: now }, completedMissionIds: first12, adaptiveStandards };
    for (let day = 0; day < 10; day++) {
      for (const question of createDailyPractice(progress, now + day * 86_400_000).questions) {
        assert.ok(first12.includes(question.missionId), `${question.missionId} was not taught yet`);
      }
    }
  });

  it('rotates topics across days when many lessons have mistakes', () => {
    const learning = Object.fromEntries(first12.map((id) => [id, { ...emptyLearningRecord(), completedAt: now - 1, misconceptions: { 'Count the parts': 2 } }]));
    const progress: Progress = { ...EMPTY_PROGRESS, completedMissionIds: first12, learning };
    const topics = new Set(Array.from({ length: 7 }, (_, day) => createDailyPractice(progress, now + day * 86_400_000).questions.map((question) => question.missionId)).flat());
    assert.ok(topics.size > DAILY_PRACTICE_LENGTH, `only ${topics.size} topics in a week`);
  });
});

/** Sign questions list three full comparisons ("6/9 < 7/9") and a fourth choice ("You can't tell", or a hand-written
    wrong comparison): no two choices may mean the same, so a child can never drop a pair, and the right one is the only true one. */
function assertSignChoicesAgree(q: { choices: string[]; correctChoice: number }, where: string) {
  const parts = q.choices.map((choice) => /^(.+) ([<=>]) (.+)$/.exec(choice));
  if (parts.filter(Boolean).length < 3) return;
  q.choices.forEach((choice, i) => assert.ok(parts[i] || choice === "You can't tell", `${where}: a sign question's only other choice is "You can't tell" | ${q.choices.join(' / ')}`));
  const meaning = (m: RegExpExecArray) => m[2] === '<' ? `${m[1]}<${m[3]}` : m[2] === '>' ? `${m[3]}<${m[1]}` : [m[1], m[3]].sort().join('=');
  const keys = q.choices.map((choice, i) => (parts[i] ? meaning(parts[i]!) : choice));
  assert.equal(new Set(keys).size, keys.length, `${where}: two choices mean the same | ${q.choices.join(' / ')}`);
}

describe('generated practice has exactly one right choice', () => {
  const asFraction = (text: string) => { const m = /^(\d+)\/(\d+)$/.exec(text.trim()); return m ? { numerator: Number(m[1]), denominator: Number(m[2]) } : null; };
  it('always has four different choices, and a decimal never has two matching fractions', () => {
    for (const mission of MISSIONS) {
      if (!hasGenerator(mission.id)) continue;
      const baseIds = mission.questions.map((q) => q.id);
      for (let seed = 1; seed <= 60; seed++) for (const q of generateQuestions(mission.id, baseIds, seed, 12)) {
        const where = `${mission.id} seed ${seed}: ${q.prompt}`;
        assert.equal(q.choices.length, 4, where);
        assert.equal(new Set(q.choices).size, 4, where);
        assertSignChoicesAgree(q, where);
        const right = asFraction(q.choices[q.correctChoice]);
        if (!right || !/^What fraction is \d*\.\d+\?$/.test(q.prompt)) continue;
        q.choices.forEach((choice, i) => {
          const other = asFraction(choice);
          if (i !== q.correctChoice && other) assert.ok(!sameFractionValue(other, right), `${where}: "${choice}" equals the right answer`);
        });
      }
    }
  });
});

describe('question pictures match the question', () => {
  it('a "Rename: … Then …" question pictures the amounts it adds or subtracts, not the renamed parts', () => {
    const seen: string[] = [];
    for (const lesson of MISSIONS) for (const question of lesson.questions) {
      const sum = /Rename: .+?\. Then (.+)$/.exec(question.prompt);
      if (!sum || question.model.kind !== 'bars') continue;
      seen.push(question.prompt);
      const asked = amountsIn(sum[1]).map(({ numerator, denominator }) => `${numerator}/${denominator}`);
      assert.deepEqual(question.model.bars.map(({ numerator, denominator }) => `${numerator}/${denominator}`), asked, question.prompt);
    }
    assert.ok(seen.some((prompt) => /Then \d+ \d+\/\d+ [+−]/.test(prompt)), 'a mixed-number renaming question is checked');
  });

  it('a question that says to color pieces gives the child pieces to tap', () => {
    const seen: string[] = [];
    for (const lesson of MISSIONS) for (const question of lesson.questions) {
      if (!/\bColor\b/.test(question.prompt) || question.model.kind !== 'area') continue;
      seen.push(question.prompt);
      assert.ok(question.model.colorTask, `${lesson.id}: ${question.prompt}`);
    }
  });
});

describe('garden questions show the garden', () => {
  const side = (s: { whole: number; numerator: number; denominator: number }) => `${s.whole} ${s.numerator}/${s.denominator}`;
  const gardenIn = (prompt: string) => /garden is (\d+ \d+\/\d+) meters by (\d+ \d+\/\d+) meters/.exec(prompt);

  it('every garden question, extra practice question and the worked example draw the garden to scale with its own sides', () => {
    const lesson = MISSIONS.find(({ id }) => id === 'multiply-mixed-numbers')!;
    const asked = [
      ...lesson.questions.filter((question) => !question.isReview),
      ...getExtraPractice(lesson.id, lesson.questions.map(({ id }) => id)),
      { prompt: lesson.example.prompt, model: lesson.example.model },
    ];
    assert.ok(asked.length > 6);
    for (const question of asked) {
      const sides = gardenIn(question.prompt);
      assert.ok(sides, question.prompt);
      assert.equal(question.model.kind, 'garden', question.prompt);
      if (question.model.kind !== 'garden') continue;
      // The longer side runs across, so a tall garden still fits a phone screen.
      assert.deepEqual([side(question.model.width), side(question.model.height)].sort(), [sides[1], sides[2]].sort(), question.prompt);
      assert.ok(valueOf(question.model.width) >= valueOf(question.model.height), question.prompt);
    }
  });
});
const valueOf = (s: { whole: number; numerator: number; denominator: number }) => s.whole + s.numerator / s.denominator;

/** The seeds the real-mistake guards read: 0 to 25 (they used to read 0 to 2, so a wrong choice that only some seeds make went unseen). */
const GUARD_SEEDS = Array.from({ length: 26 }, (_, seed) => seed);
/** A lesson's practice questions for every guard seed, made once and shared by the guards below. */
const guardCache = new Map<string, ReturnType<typeof generateQuestions>>();
const guardPractice = (lesson: (typeof MISSIONS)[number]) => {
  if (!guardCache.has(lesson.id)) guardCache.set(lesson.id, hasGenerator(lesson.id) ? GUARD_SEEDS.flatMap((seed) => generateQuestions(lesson.id, lesson.questions.map(({ id }) => id), seed, 12)) : []);
  return guardCache.get(lesson.id)!;
};

describe('Extra practice in the new lessons offers real mistakes, not near-miss numbers', () => {
  const N = Number;
  /** The mistakes a child really makes on each kind of question, worked out here from the question's numbers. */
  const realMistakes = (prompt: string): number[] | null => {
    let m = /^(\d+)\/(\d+) × (\d+)\/(\d+) = \?$/.exec(prompt);
    if (m) {
      const [a, b, c, d] = m.slice(1).map(N);
      // Add across; keep one denominator; add tops and multiply bottoms; multiply tops and add bottoms; cross-multiply.
      return [(a + c) / (b + d), (a * c) / d, (a * c) / b, (a + c) / (b * d), (a * c) / (b + d), (a * d) / (b * c)];
    }
    m = /^How many 1\/(\d+)-\w+ \w+ can be filled from (\d+) \w+ of \w+\?$/.exec(prompt);
    if (m) { const [d, w] = m.slice(1).map(N); return [w + d, d, w / d, w]; } // add; just the unit; multiply; just the wholes
    m = /^1\/(\d+) \w+ of \w+ is shared by (\d+) friends\. How much does each get\?$/.exec(prompt);
    if (m) { const [b, n] = m.slice(1).map(N); return [n / b, b * n, 1 / (b + n), 1 / b]; } // multiply; flip; add; not split
    m = /^How many hundredths is 0\.(\d+)\?$/.exec(prompt);
    if (m) { const h = N(m[1].padEnd(2, '0')); return [h / 10, h * 10, Math.floor(h / 10), h % 10, 100 - h]; } // tenths; ×10; digits; the white squares
    return null;
  };

  for (const id of ['compare-decimals-grid', 'fraction-times-fraction', 'share-or-fit']) {
    it(`${id}: every wrong number is a real mistake`, () => {
      const lesson = MISSIONS.find((mission) => mission.id === id)!;
      let checked = 0;
      for (const seed of GUARD_SEEDS) {
        for (const question of generateQuestions(id, lesson.questions.map(({ id }) => id), seed, 12)) {
          const mistakes = realMistakes(question.prompt);
          if (!mistakes) continue;
          question.choices.forEach((choice, at) => {
            if (at === question.correctChoice) return;
            const value = answerValue(choice);
            assert.ok(mistakes.some((mistake) => Math.abs(mistake - value) < 1e-9), `${question.prompt} offers ${choice}, which is not a real mistake`);
            checked++;
          });
        }
      }
      assert.ok(checked > 30, `${id}: only ${checked} wrong choices checked`);
    });
  }
});

describe('adding and subtracting questions offer real mistakes, not near-miss numbers', () => {
  // Worked out here again, apart from the app: the mistakes a child really makes adding or subtracting fractions.
  const N = Number;
  const amount = (text: string): [number, number] | null => {
    const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(text.trim()) ?? /^(\d+)()()$/.exec(text.trim());
    if (!m) return null;
    const [w, a, b] = [N(m[1] ?? 0), N(m[2] || 0), N(m[3] || 1)];
    return m[3] ? [w * b + a, b] : [N(m[1]), 1];
  };
  const lcm = (x: number, y: number) => { let a = x, b = y; while (b) [a, b] = [b, a % b]; return (x * y) / a; };
  function mistakes(prompt: string): { right: number; slips: number[] } | null {
    let p = prompt.replace(/^Quick review · [^:]+: /, '').replace(/^Rename: .+?\. Then /, '');
    const said = /^\w+ says (.+) = ([\d /]+)\. What is the right answer\?$/.exec(p);
    if (said) p = `${said[1]} = ?`;
    const length = /^(?:A|One) (?:board|ribbon) is ([\d /]+?)(?: m| meters?)?(?:\.| and) [Aa]nother is ([\d /]+?)(?: m| meters?)?\. How (?:many meters )?long (?:are they )?together\?$/.exec(p);
    if (length) p = `${length[1]} + ${length[2]} = ?`;
    const left = /(\d+)\/(\d+) (?:of a book on \w+ and|of a garden is planted\. Then) (\d+)\/\2 (?:on \w+\. How much is left to read|more is planted\. How much is still empty)\?$/.exec(p);
    if (left) { const [a, b, c] = left.slice(1).map(N); return { right: (b - a - c) / b, slips: [(a + c) / b, (b - a) / b, (b - c) / b, (b - a - c) / (2 * b), (b - a + c) / b] }; }
    const blank = /^Fill the blank: (\d+)\/(\d+) \+ \? = 1$/.exec(p);
    if (blank) { const [a, b] = blank.slice(1).map(N); return { right: (b - a) / b, slips: [a / b, (a + b) / b, b / (b - a), (b - a) / (2 * b), 1 / b] }; }
    const m = /^(?:What is )?((?:\d+ )?\d+\/\d+) ([+−]) ((?:\d+ )?\d+\/\d+)(?: = \?|\?)$/.exec(p);
    if (!m) return null;
    const x = amount(m[1])!, y = amount(m[3])!; const add = m[2] === '+';
    const L = lcm(x[1], y[1]); const xs = x[0] * (L / x[1]), ys = y[0] * (L / y[1]);
    const right = (add ? xs + ys : xs - ys) / L;
    const [a, b] = [x[0] % x[1], x[1]], [c, d] = [y[0] % y[1], y[1]];
    const [w1, w2] = [Math.floor(x[0] / x[1]), Math.floor(y[0] / y[1])];
    const slips = [
      add ? (xs - ys) / L : (xs + ys) / L, // the other operation
      w1 + w2 * (add ? 1 : -1) + (add ? (a + c) / (b + d) : Math.abs(a - c) / Math.max(1, Math.abs(b - d) || b)), // across
      w1 + (add ? 1 : -1) * w2 + (add ? a + c : Math.abs(a - c)) / Math.max(b, d), // keep one denominator
      w1 + (add ? 1 : -1) * w2 + (add ? a * (L / b) + c : Math.abs(a * (L / b) - c)) / L, // rename only the first
      w1 + (add ? 1 : -1) * w2 + (add ? a + c * (L / d) : Math.abs(a - c * (L / d))) / L, // rename only the second
      x[0] / x[1], y[0] / y[1], // left one out
      add ? right - 1 : right + 1, // forgot to carry, or to take the traded whole away
      add ? w1 + (a * (L / b) + c * (L / d)) / L : w1 - w2 + Math.abs(a * (L / b) - c * (L / d)) / L, // dropped a whole; or took the smaller part from the bigger
      w1 + (add ? 1 : -1) * w2 + (add && b === d ? (a * c) / b : (a + c) / (2 * b)), // multiplied the tops; or added the bottoms
      add ? (a + c) / (2 * b) : (b - (a - c)) / b, // added the bottoms; or found what's left of the whole
      w1 + (add ? 1 : -1) * w2 + (add ? a + c : Math.abs(a - c)) / (b * d), // multiplied the bottoms
      1 / right, // upside down
      w1 + (add ? 1 : -1) * w2 + a / b, w1 + (add ? 1 : -1) * w2 + c / d, // kept only one fraction part
    ];
    if (said) slips.push(amount(said[2])![0] / amount(said[2])![1]);
    return { right, slips };
  }

  it('every wrong choice in a lesson, its review and Extra practice is a real mistake', () => {
    const bad: string[] = []; let checked = 0;
    const questions = MISSIONS.flatMap((lesson) => [
      ...lesson.questions,
      ...(lesson.ideaQuestions ?? []),
      ...guardPractice(lesson),
    ]);
    for (const question of questions) {
      const found = mistakes(question.prompt);
      if (!found || Math.abs(found.right - answerValue(question.choices[question.correctChoice])) > 1e-9) continue;
      question.choices.forEach((choice, at) => {
        if (at === question.correctChoice) return;
        checked++;
        if (!found.slips.some((slip) => Math.abs(slip - answerValue(choice)) < 1e-9)) bad.push(`${question.prompt} → ${choice}`);
      });
    }
    assert.ok(checked > 300, `only ${checked} choices checked`);
    assert.deepEqual([...new Set(bad)].slice(0, 15), [], `${bad.length} near-miss choices`);
  });
});

describe('multiplying and dividing questions offer real mistakes, not near-miss numbers', () => {
  // Worked out here again, apart from the app: the mistakes a child really makes multiplying or dividing.
  const N = Number;
  const mixed = (t: string) => { const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(t)!; return N(m[1] ?? 0) + N(m[2]) / N(m[3]); };
  // nearOnly: whole-number answers keep wrong choices more than 2 away (misconceptions.ts); only near misses must go.
  function mistakes(prompt: string): { right: number; slips: number[]; nearOnly?: boolean } | null {
    let p = prompt.replace(/^Quick review · [^:]+: /, ''); let m: RegExpExecArray | null;
    let said: number | null = null;
    if ((m = /^\w+ says (.+) = ([\d /]+)\. What is the right answer\?$/.exec(p))) { p = `${m[1]} = ?`; said = mixed(m[2]); }
    const extra = (r: { right: number; slips: number[] }) => (said === null ? r : { ...r, slips: [said, ...r.slips] });
    // A whole number times a fraction, and recipes made several times.
    if ((m = /^(?:Write )?(\d+) × (\d+)\/(\d+)(?: = \?| as one fraction\.)$|^A recipe uses (\d+)\/(\d+) cup of \w+\. (?:You make (\d+) batches\. How much \w+ do you need|How much \w+ do (\d+) batches need)\?$/.exec(p))) {
      const [n, a, b] = m[1] ? [N(m[1]), N(m[2]), N(m[3])] : [N(m[6] ?? m[7]), N(m[4]), N(m[5])];
      return extra({ right: (n * a) / b, slips: [(n * a) / (n * b), (n + a) / b, a / (n * b), a / b, b / (n * a), (n * a) / (b + n)] });
    }
    // A fraction of a fraction.
    if ((m = /^(?:What is )?(\d+)\/(\d+) (?:×|of) (\d+)\/(\d+)(?: = \?|\?)$/.exec(p))) {
      const [a, b, c, d] = m.slice(1).map(N);
      return extra({ right: (a * c) / (b * d), slips: [(a + c) / (b + d), (a * c) / d, (a * c) / b, (a + c) / (b * d), (a * c) / (b + d), (a * d) / (b * c), (b * d) / (a * c)] });
    }
    // A unit fraction shared: 1/3 ÷ 3.
    if ((m = /^(\d+) children share 1\/(\d+) of a pan\. 1\/\2 ÷ \1 = \?$/.exec(p))) {
      const [n, b] = [N(m[1]), N(m[2])];
      return { right: 1 / (b * n), slips: [n / b, b * n, 1 / (b + n), 1 / b, 2 / (b * n)] };
    }
    // Wholes shared, and a ÷ b written as a fraction.
    if ((m = /^(\d+) loa(?:f is|ves are) shared fairly by (\d+) friends\. How much does each friend get\?$|^(?:Write )?(\d+) ÷ (\d+)(?: = \?| as a fraction\.)$/.exec(p))) {
      const [n, q] = m[1] ? [N(m[1]), N(m[2])] : [N(m[3]), N(m[4])];
      return { right: n / q, slips: [q / n, 1 / q, n / (n + q), (n + q) / q, 1 / n] };
    }
    // A mixed-number garden: whole × whole plus part × part, the wholes only, the sides added, one side's whole only.
    if ((m = /^A rectangular garden is (\d+ \d+\/\d+) meters by (\d+ \d+\/\d+) meters\. What is its area\?$/.exec(p))) {
      const [x, y] = [mixed(m[1]), mixed(m[2])]; const [wx, wy] = [Math.floor(x), Math.floor(y)];
      return { right: x * y, slips: [wx * wy + (x - wx) * (y - wy), wx * wy, x + y, wx * y, x * wy] };
    }
    // The overlap on the 3-by-4 grid: the sides added, one side only, the whole grid, the part not colored, upside down.
    if ((m = /is (\d+(?:\/\d+)?) units? by (\d+(?:\/\d+)?) units?\. Color the overlapping area/.exec(p))) {
      const [x, y] = [m[1], m[2]].map((t) => (t.includes('/') ? mixed(t) : N(t)));
      return { right: x * y, slips: [x + y, x, y, 1, 1 - x * y, 1 / (x * y)] };
    }
    // Leveling: the total, the biggest or smallest cup, split 2 ways, the tops shared over the cups.
    if ((m = /^Three \w+(?: \w+)? hold (\d+)\/(\d+), (\d+)\/\2, (\d+)\/\2 liter\. Share the total equally\./.exec(p))) {
      const [a, b, c, e] = m.slice(1).map(N); const t = a + c + e;
      return { right: t / (3 * b), slips: [t / b, Math.max(a, c, e) / b, Math.min(a, c, e) / b, t / (2 * b), t / 3, (t / 3) / (b + 3)] };
    }
    // A fraction of a group: one group, the rest, the whole, multiplied, the denominator taken away, the denominator.
    if ((m = /^What is (\d+)\/(\d+) of (\d+)(?: [a-z]+(?: [a-z]+)?)?\?$/.exec(p))) {
      const [a, b, n] = m.slice(1).map(N); const right = (n / b) * a;
      return { right, slips: [n / b, n - right, n, n * a, n * b, n - b, n + b, n - n / b, b], nearOnly: true };
    }
    // How many 2/3s… 2/3 ÷ 1/6 = 4: the tops multiplied, how many in one whole, the top or the bottom.
    if ((m = /^(\d+)\/(\d+) ÷ (\d+)\/(\d+) = \?$/.exec(p))) {
      const [a, b, c, d] = m.slice(1).map(N);
      return { right: (a / b) / (c / d), slips: [a * d, d, b, a, (a * c) / (b * d)] };
    }
    return null;
  }

  it('every wrong choice in a lesson, its review and Extra practice is a real mistake', () => {
    const bad: string[] = []; let checked = 0;
    const questions = MISSIONS.flatMap((lesson) => [
      ...lesson.questions,
      ...(lesson.ideaQuestions ?? []),
      ...guardPractice(lesson),
    ]);
    for (const question of questions) {
      const found = mistakes(question.prompt);
      if (!found || Math.abs(found.right - answerValue(question.choices[question.correctChoice])) > 1e-9) continue;
      question.choices.forEach((choice, at) => {
        if (at === question.correctChoice) return;
        checked++;
        if (found.nearOnly && Math.abs(answerValue(choice) - found.right) > 2) return;
        if (!found.slips.some((slip) => Math.abs(slip - answerValue(choice)) < 1e-9)) bad.push(`${question.prompt} → ${choice}`);
      });
    }
    assert.ok(checked > 300, `only ${checked} choices checked`);
    assert.deepEqual([...new Set(bad)].slice(0, 15), [], `${bad.length} near-miss choices`);
  });
});

describe('equivalence, decimal, percent and picture questions offer real mistakes, not near-miss numbers', () => {
  // Worked out here again, apart from the app. `right` is the app's answer as numerator and denominator.
  const N = Number;
  const gcdOf = (a: number, b: number): number => (b ? gcdOf(b, a % b) : a);
  function mistakes(prompt: string, answer: string): number[] | null {
    const p = prompt.replace(/^Quick review · [^:]+: /, ''); let m: RegExpExecArray | null;
    const frac = /^(\d+)\/(\d+)$/.exec(answer.trim()); const [x, y] = frac ? [N(frac[1]), N(frac[2])] : [NaN, NaN];
    // One part of a whole, what's colored, a dot, a chance: upside down, part to part, the rest (and counted ticks on a line),
    // and calling any one part "a half" (lesson 1 asks about one part before 3/4-style answers are taught).
    if (frac && (/^(?:A|The) \w+ (?:is cut into|has) \d+ equal parts\.(?: \d+ is colored\.)? What (?:is 1 part|fraction is colored)\?$|^What fraction (?:is 1 of \d+ equal tiles|is shaded|of the (?!square)\w+ is shaded)\?$|shaded slice\?$/.test(p))) return [y / x, x / (y - x), (y - x) / y, 1 / y, x / (y + x), ...(x === 1 ? [1 / 2] : [])];
    if (frac && (m = /^A bag has (\d+) marbles\. (\d+) (?:is|are) green\./.exec(p))) { const [t, g] = [N(m[1]), N(m[2])]; return [g / (t - g), (t - g) / t, t / g, g / (t + g), 1 / t]; }
    if (frac && /^What fraction is at the dot\?$|jumps? from 0\?$|^Each jump is 1\/\d+\. What is \d+ jumps? from 0\?$|^0 to 1 has \d+ equal spaces\. What is \d+ jumps?\?$/.test(p)) return [x / (y + 1), y / x, 1 / y, (x + 1) / y, (y - x) / y];
    // The same amount with another denominator: kept the top, added the same number, only the top, upside down.
    if (frac && ((m = /^(\d+)\/(\d+) is marked on a line\. Which fraction with a denominator of \d+ is at the same spot\?$|^Write (\d+)\/(\d+) with a denominator of \d+\.$|^Which is the same as (\d+)\/(\d+)\?$/.exec(p)))) {
      const [a, b] = m.slice(1).filter(Boolean).map(N);
      return [a / y, (a + y - b) / y, x / b, y / x, 1 / y];
    }
    if (frac && (m = /^(Multiply|Divide|Double) the numerator and denominator of (\d+)\/(\d+)(?: by (\d+))?\. What do you get\?$/.exec(p))) {
      const [a, b, k] = [N(m[2]), N(m[3]), m[1] === 'Double' ? 2 : N(m[4])]; const times = m[1] !== 'Divide';
      return times ? [(a * k) / b, a / (b * k), (a + k) / (b + k), y / x, a / (b + k)] : [a / k / b, a / (b / k), (a - k) / (b - k), y / x, a / (b - k)];
    }
    if (frac && (m = /^Write (\d+)\/(\d+) in simplest form\.$/.exec(p))) {
      const [n, d] = [N(m[1]), N(m[2])]; const g = gcdOf(n, d);
      const part = [2, 3, 4].filter((f) => f < g && g % f === 0).map((f) => n / f / (d / f));
      return [n / g / d, n / (d / g), d / n, ...part, (n - 1) / (d - 1)];
    }
    if (frac && (m = /^What (?:is|fraction is the same as) (\d+) and (\d+)\/(\d+)(?: as \w+)?\?$/.exec(p))) {
      const [w, a, b] = m.slice(1).map(N); return [(w + a) / b, a / b, (w * b) / b, (w * b * a) / b, (w * b + a + b) / b];
    }
    // A line plot's longest minus shortest: the longest, the shortest, added, the bottoms added, the wrong mark read.
    if (frac && (m = /^The line plot shows these [\w ]+ lengths in eighths: ([\d/, ]+) inch\. What is the difference between the longest and shortest\?$/.exec(p))) {
      const tops = m[1].split(', ').map((t) => N(t.split('/')[0])).sort((u, v) => u - v);
      const [lo, lo2, hi2, hi] = [tops[0], tops[1], tops[tops.length - 2], tops[tops.length - 1]];
      return [hi / 8, lo / 8, (hi + lo) / 8, (hi - lo) / 16, (hi2 - lo) / 8, (hi - lo2) / 8];
    }
    // Decimals: the point in the wrong place, the digits written out.
    if ((m = /^(?:Write (\d+)\/(10|100) as a decimal\.|Which decimal equals (\d+)\/(10|100)\?)$/.exec(p))) {
      const [n, d] = m.slice(1).filter(Boolean).map(N); return [n / (d * 10), n / (d / 10), n, N(`${n}.${d}`), n / 10, n / 100, ...(d === 10 ? [(10 - n) / 10, N(`10.${n}`), 0.1] : [])];
    }
    if ((m = /^Write (\d+)\/10 \+ (\d+)\/100 as a decimal\.$/.exec(p))) { const [a, b] = m.slice(1).map(N); return [(a + b) / 100, (a + b) / 10, (10 * a + b) / 1000]; }
    // (and for tenths, the part not colored: 0.4 for 0.6)
    if (frac && (m = /^What fraction is 0\.(\d+)\?$/.exec(p))) { const n = N(m[1]); return [n / (y * 10), n, 1 / n, n / (y / 10), y / n, ...(y === 10 ? [(10 - n) / 10] : [])]; }
    // Percents: the numerator or denominator as the percent, both written side by side, the rest; and back again.
    if ((m = /^Write (\d+)\/(\d+) as a percent\.$/.exec(p))) { const [a, b] = m.slice(1).map(N); const pct = (a / b) * 100; return [a, b, a * 2, 100 - pct, a * 10].map((v) => v / 100); }
    if (frac && (m = /^Write (\d+)% as a fraction(?: with a denominator of 100)?\.$/.exec(p))) { const v = N(m[1]); return [v / 10, 100 / v, (100 - v) / 100, v]; }
    return null;
  }

  it('every wrong choice in a lesson, its review and Extra practice is a real mistake', () => {
    const bad: string[] = []; let checked = 0;
    const questions = MISSIONS.flatMap((lesson) => [
      ...lesson.questions,
      ...(lesson.ideaQuestions ?? []),
      ...guardPractice(lesson),
    ]);
    for (const question of questions) {
      const answer = question.choices[question.correctChoice];
      const slips = mistakes(question.prompt, answer);
      if (!slips) continue;
      question.choices.forEach((choice, at) => {
        if (at === question.correctChoice) return;
        checked++;
        if (!slips.some((slip) => Math.abs(slip - answerValue(choice)) < 1e-9)) bad.push(`${question.prompt} → ${choice} (✓ ${answer})`);
      });
    }
    assert.ok(checked > 300, `only ${checked} choices checked`);
    assert.deepEqual([...new Set(bad)].slice(0, 15), [], `${bad.length} near-miss choices`);
  });
});

describe('lesson 30 (tenths as decimals) shows only tenths slips, never the hundredths lesson 31 teaches', () => {
  // Hundredths forms: n/100, a decimal with two places after the point (0.03), or a trailing zero (3.10).
  const HUNDREDTHS = /\d+\/100|0\.\d\d|\d\.\d0/;

  it('slips for a tenth are written as tenths: the digit in the wrong place, the rest of the strip, the numbers swapped', () => {
    const decimal = (n: number) => fractionMistakes(`Write ${n}/10 as a decimal.`, `0.${n}`);
    assert.ok(decimal(3).includes('0.7'), 'the rest of the strip (7 tenths for 3 tenths)');
    assert.ok(decimal(7).includes('0.3'), 'the rest of the strip (3 tenths for 7 tenths)');
    assert.ok(decimal(3).includes('3.0'), 'the digit in the wrong place');
    assert.ok(decimal(3).includes('10.3'), 'the denominator and numerator swapped');
    for (let n = 1; n < 10; n++) {
      assert.ok(decimal(n).length >= 3, `0.${n}: three slips are needed for four choices`);
      for (const slip of decimal(n)) assert.doesNotMatch(slip, HUNDREDTHS, `0.${n}: ${slip}`);
      const fractions = fractionMistakes(`What fraction is 0.${n}?`, `${n}/10`);
      assert.ok(fractions.length >= 3, `${n}/10: three slips are needed for four choices`);
      for (const slip of fractions) assert.doesNotMatch(slip, HUNDREDTHS, `${n}/10: ${slip}`);
    }
    assert.ok(fractionMistakes('What fraction is 0.3?', '3/10').includes('7/10'), 'the rest of the strip');
    // Hundredths questions keep the place-value slips.
    assert.ok(fractionMistakes('Write 8/100 as a decimal.', '0.08').includes('0.8'));
  });

  it('no wrong choice in the lesson, its ideas, its story problem or Practice more uses a hundredths form', () => {
    const lesson = MISSIONS.find((mission) => mission.id === 'tenths-decimals')!;
    const reachable: PracticeQuestion[] = [
      ...lesson.questions, ...(lesson.ideaQuestions ?? []),
      ...ideaSteps(lesson.id).filter(({ item }) => !isRound(item)).map(({ item }) => ideaQuestion(lesson, (item as { question: string }).question)!),
      ...[0, 1, 2, 3, 4, 5].flatMap((seed) => generateQuestions(lesson.id, lesson.questions.map(({ id }) => id), seed, 12)),
      ...getExtraPractice(lesson.id, lesson.questions.map(({ id }) => id)),
    ];
    const story = storyProblemFor(lesson.id);
    if (story?.choices) reachable.push({ ...lesson.questions[lesson.questions.length - 1], prompt: story.prompt, choices: story.choices });
    const bad: string[] = []; let checked = 0;
    for (const question of reachable) {
      if (question.id.endsWith('-review')) continue; // "Quick review" of lesson 29
      question.choices.forEach((choice, at) => {
        if (at === question.correctChoice) return;
        checked++;
        if (HUNDREDTHS.test(choice)) bad.push(`${question.id}: ${question.prompt} → ${choice}`);
      });
    }
    assert.ok(checked > 150, `only ${checked} wrong choices checked`);
    assert.deepEqual([...new Set(bad)], []);
  });
});

describe('every question in a lesson’s ideas offers real mistakes', () => {
  /* Each idea's practices (and the lesson's story problem, with its own choices when it has them) are checked against
     the app's slip lists (fraction-slips.ts and misconceptions.ts): a wrong choice must be a mistake a child makes.
     A question neither list knows is left out (worded choices, pictures to read); ANY question one of them knows must
     pass. A wrong choice that fails is a near miss, or a mistake the lists do not have yet: swap it for a real one, or
     add the slip (with its sentence in slip-reasons.ts). */
  const same = (a: string, b: string) => a === b || (Number.isFinite(answerValue(a)) && Number.isFinite(answerValue(b)) && !/ and /.test(a + b) && Math.abs(answerValue(a) - answerValue(b)) < 1e-9);
  const reachable = () => MISSIONS.flatMap((lesson) => {
    if (!lessonIdeas(lesson.id)) return [];
    const own = ideaSteps(lesson.id).filter(({ item }) => !isRound(item)).map(({ item }) => ideaQuestion(lesson, (item as { question: string }).question)!);
    const last = lesson.questions[lesson.questions.length - 1];
    const story = storyProblemFor(lesson.id);
    return story ? [...own, { ...last, id: `${last.id}-story`, prompt: story.prompt, choices: story.choices ?? last.choices }] : own;
  });

  it('every wrong choice is a slip from the lists, apart from the named questions', () => {
    const bad: Record<string, string[]> = {}; let checked = 0; let questions = 0;
    for (const question of reachable()) {
      const answer = question.choices[question.correctChoice];
      const slips = [...fractionMistakes(question.prompt, answer), ...misconceptionWrongs(question.prompt, answer)];
      if (!slips.length) continue;
      questions++;
      question.choices.forEach((choice, at) => {
        if (at === question.correctChoice) return;
        checked++;
        if (!slips.some((slip) => same(slip, choice))) (bad[question.id] ??= []).push(choice);
      });
    }
    assert.ok(questions > 250 && checked > 700, `only ${checked} wrong choices in ${questions} questions checked`);
    assert.deepEqual(bad, {});
  });
});

describe('the rarer question types offer real mistakes too', () => {
  // Worked out here again, apart from the app.
  const N = Number;
  const v = (t: string) => { const m = /^(?:(\d+) )?(\d+)\/(\d+)$/.exec(t.trim()); return m ? N(m[1] ?? 0) + N(m[2]) / N(m[3]) : N(t); };
  // A slip is a value, or (for "1 and 2/3" answers) the choice exactly as written.
  function mistakes(prompt: string, answer: string): (number | string)[] | null {
    const p = prompt.replace(/^Quick review · [^:]+: /, ''); let m: RegExpExecArray | null;
    const frac = /^(\d+)\/(\d+)(?: [a-z]+)?$/.exec(answer.trim()); const [x, y] = frac ? [N(frac[1]), N(frac[2])] : [NaN, NaN];
    // Sums and differences in other words: the other operation, across, one part left out, the bottoms added.
    if ((m = /^A (?:board|jug) (?:is|has) (\d+\/\d+) (?:meter|liter)\. (?:Another is|You add) (\d+\/\d+) (?:meter|liter)\. How many (?:meters in all|liters now)\?$|^\w+ walked (\d+\/\d+) mile, then (\d+\/\d+) mile\. How far in all\?$|^A recipe uses (\d+\/\d+) cup, then (\d+\/\d+) cup more\. How much in all\?$/.exec(p))) {
      const [a, b] = m.slice(1).filter(Boolean); const [[p1, q1], [p2, q2]] = [a, b].map((t) => t.split('/').map(N));
      const sum = v(a) + v(b);
      return [(p1 + p2) / (q1 + q2), v(a), v(b), Math.abs(v(a) - v(b)), (p1 + p2) / Math.max(q1, q2), (p1 * p2) / q1, (p1 + p2) / (q1 * q2), sum - 1, 1 / sum];
    }
    if ((m = /^A jug is (\d+)\/(\d+) full\. You pour out (\d+)\/\2\. How much is left\?$|^(\d+)\/(\d+) = (\d+)\/\5 \+ what\?$/.exec(p))) {
      const [a, b, c] = m.slice(1).filter(Boolean).map(N);
      return [(a + c) / b, a / b, c / b, (a + c) / (2 * b), (a - c) / (b * b), (b - a + c) / b];
    }
    // Wholes and a fraction: swapped, the two numbers, the remainder over the top, just the wholes.
    if ((m = /^What is (\d+)\/(\d+) as wholes and a fraction\?$/.exec(p))) {
      const [n, d] = m.slice(1).map(N); const [w, r] = [Math.floor(n / d), n % d];
      return [`${r} and ${w}/${d}`, `${n} and ${d}`, `${w} and ${r}/${n}`, String(w), `${d} and ${r}/${d}`];
    }
    // A fraction as a decimal: the digits side by side, the bottom or top as tenths.
    if ((m = /^Write (\d+)\/(\d+) as a decimal\.$/.exec(p)) && !['10', '100'].includes(m[2])) {
      const [a, b] = m.slice(1).map(N); return [N(`${a}.${b}`), N(`0.${a}${b}`), N(`0.${b}`), N(`0.${a}`), b / a];
    }
    // Another denominator in other words.
    if (frac && (m = /^Change (\d+)\/(\d+) into hundredths\.$|^Which fraction covers the same amount as (\d+)\/(\d+)\?$/.exec(p))) {
      const [a, b] = m.slice(1).filter(Boolean).map(N); return [a / y, (a + y - b) / y, x / b, y / x, 1 / y];
    }
    if (frac && (m = /^A strip is 0\.(\d+) colored\. What fraction is that\?$/.exec(p))) { const n = N(m[1]); return [n / (y * 10), n, 1 / n, n / (y / 10), y / n, ...(y === 10 ? [(10 - n) / 10] : [])]; }
    // Parts named in other words.
    if (frac && /^A line has \d+ spaces\. The point is \d+ jumps from 0\. What is it\?$/.test(p)) return [x / (y + 1), y / x, 1 / y, (x + 1) / y, (y - x) / y];
    if (frac && /^A tray has \d+ spaces\. \d+ have a \w+\. What fraction have a \w+\?$|this \w+ is split into \d+ equal-area [\w ]+\. Color \d+\. What fraction of the whole is colored\?$/.test(p)) return [y / x, x / (y - x), (y - x) / y, 1 / y, x / (y + x)];
    // Part of what is left: what is left after the first part, the second part, both taken from the whole, both eaten.
    if ((m = /eats (\d+)\/(\d+) of a pizza\. Then (?:he|she) eats (\d+)\/(\d+) of what is left\. What fraction of the pizza is left(?: now)?\?$/.exec(p))) {
      const [a, b, c, d] = m.slice(1).map(N); const rest = 1 - a / b;
      return [rest, rest * (c / d), 1 - a / b - c / d, a / b + c / d, (c / d) * (a / b)];
    }
    // Sharing in Share or fit lessons: multiplied, flipped, added, not split.
    if ((m = /^1\/(\d+) \w+ of \w+ is shared by (\d+) friends\. How much does each get\?$/.exec(p))) { const [b, n] = m.slice(1).map(N); return [n / b, b * n, 1 / (b + n), 1 / b]; }
    if ((m = /^How many 1\/(\d+)-\w+ \w+ can be filled from (\d+) \w+ of \w+\?$/.exec(p))) { const [d, w] = m.slice(1).map(N); return [w + d, d, w / d, w]; }
    // Units: one whole unit, double it, the rest, one and a half, split one part too many.
    if ((m = /^How many (\w+) are in 1\/(\d+) (\w+)\?$/.exec(p))) {
      const PER: Record<string, number> = { 'minutes/hour': 60, 'seconds/minute': 60, 'hours/day': 24, 'inches/foot': 12, 'centimeters/meter': 100, 'milliliters/liter': 1000, 'grams/kilogram': 1000, 'ounces/pound': 16, 'cents/dollar': 100 };
      const per = PER[`${m[1]}/${m[3]}`]; const b = N(m[2]); if (!per) return null;
      return [per, per * b, per - per / b, per + per / b, per / (b + 1)];
    }
    return null;
  }

  it('every wrong choice in a lesson, its review and Extra practice is a real mistake', () => {
    const bad: string[] = []; let checked = 0;
    const questions = MISSIONS.flatMap((lesson) => [
      ...lesson.questions,
      ...(lesson.ideaQuestions ?? []),
      ...guardPractice(lesson),
    ]);
    for (const question of questions) {
      const answer = question.choices[question.correctChoice];
      const slips = mistakes(question.prompt, answer);
      if (!slips) continue;
      question.choices.forEach((choice, at) => {
        if (at === question.correctChoice) return;
        checked++;
        const value = answerValue(choice);
        if (!slips.some((slip) => (typeof slip === 'string' ? slip === choice : Math.abs(slip - value) < 1e-9))) bad.push(`${question.prompt} → ${choice} (✓ ${answer})`);
      });
    }
    assert.ok(checked > 150, `only ${checked} choices checked`);
    assert.deepEqual([...new Set(bad)].slice(0, 15), [], `${bad.length} near-miss choices`);
  });
});

describe('the November 2026 move (a fraction is division before dividing; recipe stories in grade 4)', () => {
  const ids = (from: string, to: string) => {
    const all = MISSIONS.map((m) => m.id);
    return all.slice(all.indexOf(from), all.indexOf(to) + 1);
  };
  const passed = (list: string[]): Progress => ({
    ...EMPTY_PROGRESS, completedMissionIds: list,
    learning: Object.fromEntries(list.map((id) => [id, { ...emptyLearningRecord(), completedAt: 1 }])),
  });
  const division = ['unit-fraction-divided-whole', 'divide-whole-by-unit-fraction', 'share-or-fit'];
  const firstTo = (id: string) => ids(MISSIONS[0]!.id, id).filter((lesson) => lesson !== 'fraction-recipes');

  it('keeps every lesson open for a learner part way through unit 12 on the old order', () => {
    // Old order: units 1–11 with the division lessons, then the first lesson of unit 12; recipes were still in unit 13.
    const progress = passed([...firstTo('bigger-or-smaller'), ...division, 'fraction-of-length']);
    assert.equal(isMissionUnlocked(progress, 'fractional-measure-addition'), true);
    for (const id of division) assert.equal(isMissionUnlocked(progress, id), true, id);
    assert.equal(isMissionUnlocked(progress, 'fraction-recipes'), true, 'the moved lesson is open to do any time');
  });
  it('keeps unit 13 open for a learner who finished the old unit 12', () => {
    const progress = passed([...firstTo('bigger-or-smaller'), ...division, ...ids('fraction-of-length', 'fraction-as-division')]);
    assert.equal(isMissionUnlocked(progress, 'fraction-probability'), true);
  });
  it('keeps unit 11 going for a learner who already did a division lesson there', () => {
    const progress = passed([...firstTo('fraction-of-collection'), 'divide-whole-by-unit-fraction']);
    assert.equal(isMissionUnlocked(progress, 'multiplication-scaling'), true);
    assert.equal(isMissionUnlocked(progress, 'divide-whole-by-unit-fraction'), true);
  });
  it('takes a new learner through recipe stories at the end of grade 4, before unit 10', () => {
    const progress = passed(ids(MISSIONS[0]!.id, 'measurement-word-problems'));
    assert.equal(isMissionUnlocked(progress, 'fraction-recipes'), true);
    assert.equal(isMissionUnlocked(progress, 'add-related-fractions'), false);
    assert.equal(isMissionUnlocked(passed(ids(MISSIONS[0]!.id, 'fraction-recipes')), 'add-related-fractions'), true);
  });
});

describe('second lessons (grade 4): dimes and pennies, plot in eighths, party portions', () => {
  const lesson = (id: string) => MISSIONS.find((m) => m.id === id)!;
  const before = (id: string) => MISSIONS[MISSIONS.indexOf(lesson(id)) - 1].id;
  it('sit next to the lesson they build on', () => {
    assert.equal(before('dimes-and-pennies'), 'add-tenths-hundredths');
    assert.equal(before('read-line-plots'), 'plot-in-eighths');
    assert.equal(before('party-portions'), 'fraction-recipes');
    for (const id of ['dimes-and-pennies', 'plot-in-eighths', 'party-portions']) assert.equal(lesson(id).gradeBand, 4, id);
  });
  it('ask the approved first questions with pictures that set up the problem without the answer', () => {
    const [coins] = lesson('dimes-and-pennies').questions;
    assert.equal(coins.prompt, 'Chomp has 6 dimes. What part of a dollar is that, in hundredths?');
    assert.deepEqual(coins.model, { kind: 'coins', dimes: 6, pennies: 0 });
    assert.equal(coins.choices[coins.correctChoice], '60/100');
    const [plot] = lesson('plot-in-eighths').questions;
    assert.match(plot.prompt, /Plot them\. How many more Xs are at 5\/8 than at 1\/8\?$/);
    assert.ok(plot.model.kind === 'lineplot' && plot.model.plotTask, 'the child plots the Xs');
    assert.equal(plot.choices[plot.correctChoice], '2');
    const [portions] = lesson('party-portions').questions;
    assert.equal(portions.prompt, 'Each racer drinks 2/3 cup. 4 racers. Between which two whole numbers is the total?');
    assert.equal(portions.choices[portions.correctChoice], '2 and 3');
    assert.ok(portions.model.kind === 'bars' && portions.model.bars.length === 4, 'four racers, four bars');
  });
  it('say why each coin and portion mistake is wrong', () => {
    const why = (prompt: string, right: string, pick: string) => wrongChoiceReason(prompt, [right, pick], 0, 1);
    assert.equal(why('Chomp has 6 dimes. What part of a dollar is that, in hundredths?', '60/100', '6/100'), WHY.dimeOne);
    assert.equal(why('2 dimes and 5 pennies. What part of a dollar is that?', '25/100', '52/100'), WHY.coinSwap);
    assert.equal(why('Each runner drinks 5/6 liter. 3 runners. How much in all?', '15/6 liters', '15/18 liter'), WHY.onlyTop);
    assert.equal(why('Twigs: 3/8, 4/8, 4/8, 8/8 inch. Plot them. How long are the two shortest together?', '7/8 inch', '12/8 inches'), WHY.twoLongest);
    assert.equal(why('Each racer drinks 2/3 cup. 4 racers. Between which two whole numbers is the total?', '2 and 3', '8 and 9'), WHY.betweenWholes);
  });
});

describe('second lessons (grade 5): line plot totals, two-step conversions', () => {
  const lesson = (id: string) => MISSIONS.find((m) => m.id === id)!;
  const before = (id: string) => MISSIONS[MISSIONS.indexOf(lesson(id)) - 1].id;
  it('sit next to the lesson they build on, in unit 12', () => {
    assert.equal(before('line-plot-totals'), 'line-plot-leveling');
    assert.equal(before('two-step-conversions'), 'fractional-unit-conversions');
    for (const id of ['line-plot-totals', 'two-step-conversions']) assert.equal(lesson(id).unit, 12, id);
  });
  it('ask the approved first questions', () => {
    const [totals] = lesson('line-plot-totals').questions;
    assert.match(totals.prompt, /water in 6 beakers: 1\/8, 3\/8, 3\/8, 4\/8, 4\/8, 6\/8 liter\. How much water in all\?$/);
    assert.equal(totals.choices[totals.correctChoice], '2 5/8 liters');
    assert.ok(totals.model.kind === 'lineplot' && !totals.model.plotTask, 'a finished plot to read');
    const [ribbon] = lesson('two-step-conversions').questions;
    assert.equal(ribbon.prompt, 'A ribbon is 2 1/2 feet long. Pip cuts off 8 inches. How many inches are left?');
    assert.equal(ribbon.choices[ribbon.correctChoice], '22 inches');
    assert.deepEqual(ribbon.model, { kind: 'line', numerator: 30, denominator: 12, wholes: 3, hideLabels: true }, 'the ribbon on a line marked in inches, 12 to a foot');
  });
  it('say why each conversion and line-plot mistake is wrong', () => {
    const why = (prompt: string, right: string, pick: string) => wrongChoiceReason(prompt, [right, pick], 0, 1);
    assert.equal(why('A ribbon is 2 1/2 feet long. Pip cuts off 8 inches. How many inches are left?', '22 inches', '17 inches'), WHY.wrongPer);
    assert.equal(why('A ribbon is 2 1/2 feet long. Pip cuts off 8 inches. How many inches are left?', '22 inches', '30 inches'), WHY.startAmount);
    assert.equal(why('A bag holds 2 1/4 pounds of sand. Pip adds 6 ounces. How many ounces are in the bag now?', '42 ounces', '36 ounces'), WHY.oneAmount);
    assert.equal(why('The line plot shows water in 6 beakers: 1/8, 3/8, 3/8, 4/8, 4/8, 6/8 liter. How much water in all?', '2 5/8 liters', '1 6/8 liters'), WHY.eachSpotOnce);
    assert.equal(why('The line plot shows water in 6 beakers: 2/8, 2/8, 5/8, 5/8, 5/8, 8/8 liter. How much more do the 5/8 beakers hold than the 2/8 beakers?', '1 3/8 liters', '3/8 liter'), WHY.oneEach);
  });
});
