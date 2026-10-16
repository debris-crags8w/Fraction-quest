import { retryOpener, wrongChoiceReason } from './wrong-answer';
import { fourthChoice, isSignQuestion } from './fourth-choice';
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
import { FunContext, splitStory, StoryPrompt } from './fun-ui';
import CodeQuest from './CodeQuest';
import { buildParentReport } from './parent-report';
import { createNaturalSpeaker, isIOSVoiceDevice, naturalVoicePreference, naturalVoiceStatus, setNaturalEngineForTests, setNaturalVoicePreference } from './lib/natural-voice';
import { applyPlacement, placementItems, PLACEMENT_UNITS } from './placement';
import { applyAnswer, newRacer, RACE_GOAL, raceStars, ROBOT_LEVELS } from './FractionRace';
import { makeSprint, SPRINT_ROUNDS } from './CodeSprint';
import { CODE_LEVEL_COUNT, describe as describeRun, getCodeLevels, getRunHint, makeMultiBug, matchesTarget, passesCodeLevel, predictionMatchesTarget, runProgram, solution, toText, usesEffectiveLoop, usesLoop, type Block } from './code-quest';
import { CODE_EXAMPLES, exampleStepInstruction, summarizeCodeProgress } from './code-progress';
import { loadFun, recordCodeLevel, recordCorrect, recordMinute, recordPartFinder, resetMissionGameProgress, shownStreak } from './lib/fun';
import { isPartFinderAnswer, PART_FINDER_LESSONS, PART_FINDER_ROUNDS, partFinderRoundsFor, partFinderFeedback, partFinderSelectionArea, scorePartFinderRound } from './part-finder';
import { generateQuestions, getExtraPractice, hasGenerator, makeRng } from './practice-bank';
import { createDailyPractice, dailyBuildCorrect, dailyChoiceQuestion, dailyPracticeDay, DAILY_PRACTICE_LENGTH } from './daily-practice';
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
const EXPECTED_MISSION_IDS = [
  'equal-parts',
  'fraction-names',
  'unit-fractions',
  'unit-size',
  'sets-unit-fractions',
  'sets-nonunit',
  'benchmark-half',
  'benchmarks-zero-one',
  'fraction-magnitude',
  'number-line-basics',
  'number-line-points',
  'number-line-beyond-one',
  'compare-same-denominator',
  'compare-same-numerator',
  'order-fractions',
  'equivalent-models',
  'build-equivalents',
  'missing-equivalent',
  'compose-to-one',
  'decompose-fractions',
  'improper-fractions',
  'mixed-improper',
  'add-like-denominators',
  'subtract-like-denominators',
  'add-related-fractions',
  'tenths-decimals',
  'hundredths-decimals',
  'add-tenths-hundredths',
];
const EXPECTED_EXTENSION_IDS = [
  'unit-fraction-multiples', 'multiply-whole-by-fraction',
  'simplify-fractions', 'equivalent-missing-both', 'whole-numbers-as-fractions', 'compare-unlike-fractions', 'order-unlike-fractions',
  'subtract-unlike-fractions', 'add-unlike-fractions', 'add-mixed-numbers', 'subtract-mixed-numbers', 'fraction-of-quantity',
  'mixed-unlike-operations', 'estimate-fraction-operations',
  'multiply-fractions', 'fraction-of-collection', 'divide-whole-by-unit-fraction',
  'multiplication-scaling', 'multiply-mixed-numbers', 'unit-fraction-divided-whole',
  'fraction-of-length', 'fractional-measure-addition', 'ruler-measurement', 'build-line-plots', 'read-line-plots',
  'line-plot-leveling', 'measurement-word-problems', 'fractional-unit-conversions', 'fractional-sharing', 'fraction-as-division',
  'fraction-probability', 'fraction-of-area', 'fractional-side-area', 'equivalent-number-line', 'fraction-recipes',
  'fractions-to-percent', 'percent-to-fraction', 'decimal-fraction-equivalence', 'compare-decimals', 'multi-step-fraction-stories',
  'find-the-whole', 'spot-the-mistake', 'fraction-of-remainder', 'divide-fractions',
];

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
    case 'area':
      assert.ok(model.cut in AREA_CUTS, `${location} has an unknown area cut`);
      assert.ok(model.shaded.every((piece) => Number.isInteger(piece) && piece >= 0 && piece < AREA_CUTS[model.cut].length), `${location} shades a missing piece`);
      return;
    default: {
      const unreachable: never = model;
      assert.fail(`${location} has an unsupported visual model: ${JSON.stringify(unreachable)}`);
    }
  }
}

describe('lesson catalog', () => {
  it('covers 72 sequenced lessons in the expected sequence and unit groups', () => {
    assert.equal(MISSIONS.length, 72);
    assert.deepEqual(MISSIONS.slice(0, 28).map((mission) => mission.id), EXPECTED_MISSION_IDS);
    assert.deepEqual(MISSIONS.slice(28).map((mission) => mission.id), EXPECTED_EXTENSION_IDS);
    assert.deepEqual(
      Object.fromEntries(
        [...new Set(MISSIONS.map((mission) => mission.unit))]
          .map((unit) => [unit, MISSIONS.filter((mission) => mission.unit === unit).length]),
      ),
      { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 4, 8: 8, 9: 5, 10: 7, 11: 6, 12: 10, 13: 5, 14: 5, 15: 4 },
    );
  });

  it('gives every lesson a brief, complete explanation of its main idea', () => {
    for (const mission of MISSIONS) {
      const idea = mission.skill.trim();
      assert.ok(idea.length >= 30 && idea.length <= 240, `${mission.id} lesson idea should be brief and explain a concept`);
      assert.match(idea, /[.!?]$/, `${mission.id} lesson idea should read as a complete thought`);
    }

    const sameNumerator = MISSIONS.find((mission) => mission.id === 'compare-same-numerator')!;
    assert.match(sameNumerator.skill, /same top number.*count the same number.*larger bottom number.*more equal parts.*smaller/i);
    assert.match(sameNumerator.example.explanation, /both fractions count 3 pieces.*more equal parts.*each eighth is smaller.*3\/8 less than 3\/5/i);

    const unlikeOrdering = MISSIONS.find((mission) => mission.id === 'order-unlike-fractions')!;
    assert.ok(unlikeOrdering.learningIntro, 'fraction ordering explains the goal, steps, and why the method works');
    assert.match(unlikeOrdering.learningIntro.goal, /smallest to biggest.*biggest to smallest/);
    assert.match(unlikeOrdering.learningIntro.process, /1\/2.*same denominator.*compare the top numbers/);
    assert.match(unlikeOrdering.learningIntro.why, /same denominator.*equal-size pieces.*greater amount/);
  });

  it('keeps the same-numerator explanation clear in the build, worksheet, and generated practice', () => {
    const checks = getBuildChecks('compare-same-numerator');
    assert.match(checks[0].explanation, /Both count 3 pieces.*Eight equal parts make smaller pieces than five/i);
    assert.match(checks[1].explanation, /Five equal parts make smaller pieces than three/i);

    const worksheet = getWorksheet('compare-same-numerator');
    assert.ok(worksheet.every((problem) => /Both fractions count .*larger denominator.*more equal parts.*smaller/i.test(problem.hint)));

    const generated = generateQuestions('compare-same-numerator', ['unused'], 21, 12);
    assert.ok(generated.every((question) => /Both fractions count .*larger denominator.*more equal parts.*smaller/i.test(question.hint)));
    assert.match(REASON_IDEAS['compare-same-numerator'], /larger denominator.*smaller pieces/i);
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
        assert.ok(mission.learningIntro);
        assert.match(mission.learningIntro.goal, /smallest to biggest.*biggest to smallest/);
        assert.match(mission.learningIntro.process, /(?:one half|1\/2).*same denominator.*(?:numerators|top numbers)/i);
        assert.match(mission.learningIntro.why, /(?:same|equal)-size pieces/i);
        assert.match(mission.example.prompt, /1\/4, 3\/8 and 5\/8/);
        assert.notEqual(mission.example.prompt, mission.questions[0].prompt);
        assert.doesNotMatch(mission.example.prompt, /1\/2|2\/3|3\/4/);
        assert.match(mission.example.explanation, /rename 1\/4 as 2\/8.*same-size pieces/i);
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
        assert.deepEqual(review.choices, [...priorQuestion.choices.slice(1), priorQuestion.choices[0]]);
        assert.equal(review.correctChoice, (priorQuestion.correctChoice - 1 + priorQuestion.choices.length) % priorQuestion.choices.length);
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
      ['equal-parts-q2', '1/4'],
      ['sets-nonunit-q1', '8'],
      ['number-line-beyond-one-q3', '8/6'],
      ['missing-equivalent-q2', '8'],
      ['add-related-fractions-q1', '4/6'],
      ['hundredths-decimals-q1', '0.08'],
      ['hundredths-decimals-q3', '0.4'],
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
    MISSIONS.slice(28).forEach((mission, index) => {
      const question = mission.questions[0];
      const worksheetQuestion = getWorksheet(mission.id)[1];
      assert.equal(question.choices[question.correctChoice], worksheetQuestion.answer, `${mission.id} answer key must match its source worksheet`);
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
        problem.modelRequired || problem.areaTask || problem.rulerTask || problem.linePlotTask || problem.scaleTask,
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

    const completed = completeSkillReview(progress, firstMissionId);
    assert.ok(!completed.reviewQueue.some((item) => item.missionId === firstMissionId));

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
      afterSession = completeSkillReview(afterSession, question.reviewMissionId!);
    }
    saveProgress(afterSession);

    const reloaded = loadProgress();
    assert.equal(getDueSkillReviewCount(reloaded, now), 1);
    assert.ok(sessionQuestions.every((question) =>
      !reloaded.reviewQueue.some((item) => item.missionId === question.reviewMissionId),
    ));
    const mapEntry = renderToStaticMarkup(
      createElement(QuickReviewEntry, { progress: reloaded, onStart: () => undefined }),
    );
    assert.match(mapEntry, /1 due skill ready/);
  });

  it('defers a skipped skill and keeps other due skills reachable after reload', () => {
    const progress = queuedProgress();
    const [skippedQuestion, answeredQuestion] = getDueSkillReviewQuestions(progress, now);
    assert.ok(skippedQuestion && answeredQuestion);

    const afterSkip = deferSkillReview(progress, skippedQuestion.reviewMissionId!, now);
    assert.equal(isCorrectAnswer(answeredQuestion, answeredQuestion.correctChoice), true);
    const afterSession = completeSkillReview(afterSkip, answeredQuestion.reviewMissionId!);
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
    assert.equal(reset.dailyPractice?.index, 1, 'keeps the cursor after previously completed other-unit topics');
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
  it('builds lesson models and math text without String.matchAll in older webviews', () => {
    const original = Object.getOwnPropertyDescriptor(String.prototype, 'matchAll');
    try {
      Object.defineProperty(String.prototype, 'matchAll', { configurable: true, writable: true, value: undefined });
      assert.deepEqual(amountsIn('Compare 3/4 or 1/2.'), [
        { numerator: 3, denominator: 4 },
        { numerator: 1, denominator: 2 },
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

  it('keeps explicit read-aloud support for screens that still request it', () => {
    const markup = renderToStaticMarkup(createElement(LearningText, {
      text: 'Each equal share is 1/4 of a whole.',
      speak: true,
    }));
    assert.match(markup, /class="fq-learning-listen"/);
    assert.match(markup, /aria-label="Audio unavailable for the explanation"/);
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
    assert.match(markup, />1 whole<\/text>/);
    assert.match(markup, /each whole is split into 5 equal parts/);
    assert.match(markup, /2 parts are shaded/);
  });

  it('builds a fraction answer from number tiles, with no box to type in', () => {
    const markup = renderToStaticMarkup(createElement(AnswerTiles, {
      shape: { kind: 'fraction', allowWhole: false }, value: '1/3', onChange: () => undefined, testIdPrefix: 'ws-w1',
    }));
    assert.match(markup, /aria-label="numerator is the number of parts selected: 1[,"]/);
    assert.match(markup, /aria-label="denominator is the total number of equal parts in 1 whole: 3"/);
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
        assert.match(missing?.message ?? '', /^Reason:/);

        const incorrectIndex = (check.correctReason + 1) % check.reasons.length;
        const incorrect = getReasonFeedback(check, incorrectIndex, false);
        assert.equal(incorrect?.correct, false, `${mission.id}/${check.id} should reject a wrong reason`);
        assert.match(incorrect?.message ?? '', /Look at the models and choose again/);

        const correctButModelsWrong = getReasonFeedback(check, check.correctReason, false);
        assert.equal(correctButModelsWrong?.correct, true, `${mission.id}/${check.id} should preserve a correct reason`);
        assert.match(correctButModelsWrong?.message ?? '', /choice is right/);
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

  it('keeps proper-fraction number lines from 0 to 1 and extends only for improper fractions', () => {
    assert.equal(numberLineWholeCount(1, 3), 1);
    assert.equal(numberLineWholeCount(5, 5), 1);
    assert.equal(numberLineWholeCount(7, 5), 2);
    assert.equal(numberLineWholeCount(11, 5), 3);
    assert.throws(() => numberLineWholeCount(1, 0), RangeError);
  });
  it('checks independently calculated keys across every curriculum topic', () => {
    const expected = ['3', '1', '3', '1/2', '2', '4', '1/4', '1/3', '3/4', '3', '1/3', '4/3', '2/3', '2/3', '1/3, 2/3, 3/3', '2', '2/6', '2', '2/3', '2', '>', '4/3', '2/3', '1/3', '3/4', '0.1', '0.08', '34/100'];
    MISSIONS.slice(0, expected.length).forEach((mission, index) => assert.equal(getWorksheet(mission.id)[0].answer, expected[index], mission.id));
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
    assert.equal(completeSkillReview(progress, id).reviewQueue.length, 0);
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
    assert.match(fractionNameLesson.example.explanation, /The denominator is 5.* The numerator is 3/);

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
    // "Color 1/4 of the square": one small square or two triangles both count.
    const colorQuarter = unitFractions.find(problem => problem.areaTask && !problem.areaTask.avoid)!;
    assert.equal(areaTaskDone(colorQuarter.area!.cut, colorQuarter.areaTask!, [0]), true);
    assert.equal(areaTaskDone(colorQuarter.area!.cut, colorQuarter.areaTask!, [1, 2]), true);
    assert.equal(areaTaskDone(colorQuarter.area!.cut, colorQuarter.areaTask!, [1, 4]), true);
    assert.equal(areaTaskDone(colorQuarter.area!.cut, colorQuarter.areaTask!, [1]), false);
    assert.equal(areaTaskDone(colorQuarter.area!.cut, colorQuarter.areaTask!, [0, 1]), false);
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
    assert.match(markup, /<b>1 whole<\/b>/);

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
    assert.equal(sayFraction(1, 2), 'one half'); assert.equal(sayFraction(3, 4), 'three fourths'); assert.equal(sayFraction(7, 25), '7 over 25');
    assert.equal(spokenText('Color 1/4 of the square.'), 'Color one fourth of the square.');
    assert.equal(spokenText('Write 1 2/3 as a fraction.'), 'Write 1 and two thirds as a fraction.');
    assert.equal(spokenText('2/8 = ?/4'), 'two eighths equals how many fourths');
    assert.equal(spokenText('3/8 < 1/2'), 'three eighths is less than one half');
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
      .toPractice.find((t) => t.idea === row.hint)!;
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
    'u1-p1': '3/8', 'u2-p1': '1/3', 'u3-p1': 'D', 'u4-p1': '3/5', 'u5-p1': 'B', 'u6-p1': '4', 'u7-p1': '1 and 3/4', 'u8-p1': '0.35',
    'u1-c1': '3', 'u1-c2': '5/8', 'u1-c3': '1/4', 'u1-c4': '10 cm', 'u1-c5': '12',
    'u2-c1': '1/2', 'u2-c2': '5', 'u2-c3': '6', 'u2-c4': '24', 'u2-c5': '8',
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
    'u4-c1': '3/4', 'u4-c2': '6', 'u4-c3': '5/4', 'u4-c4': '2/5', 'u4-c5': '3',
    'u5-c1': '7/10', 'u5-c2': '2/9', 'u5-c3': '7/8', 'u5-c4': 'Cara', 'u5-c5': '2',
    'u6-c1': '3/6', 'u6-c2': '8', 'u6-c3': '5/14', 'u6-c4': '2', 'u6-c5': '20',
    'u7-c1': '1', 'u7-c2': '2 and 1/4', 'u7-c3': '12', 'u7-c4': '3/8 + 4/8', 'u7-c5': '3',
    'u8-c1': '7/8', 'u8-c2': '0.3', 'u8-c3': '0.5', 'u8-c4': '2/10 m', 'u8-c5': '7/8',
    // Units 9–14: worked out here, not copied from the challenge text.
    'u9-p1': '2/3', 'u9-c1': ['2/4', '3/6', '4/9', '5/10', '6/12'].find((f) => { const [t, b] = f.split('/').map(Number); return t * 2 !== b; })!,
    'u9-c2': String((3 * 20) / 4),
    'u9-c3': ['2/5', '3/7', '4/9', '5/8', '1/3'].find((f) => { const [t, b] = f.split('/').map(Number); return t / b > 0.5 && t / b < 1; })!,
    'u9-c4': ['Ana', 'Ben', 'Cal'][[2 / 3, 3 / 4, 5 / 6].indexOf(Math.max(2 / 3, 3 / 4, 5 / 6))],
    'u9-c5': ['7/8', '5/6', '9/10', '3/4', '11/12'].sort((a, b) => { const [an, ad] = a.split('/').map(Number); const [bn, bd] = b.split('/').map(Number); return (1 - an / ad) - (1 - bn / bd); })[0],
    'u10-p1': '1/4', 'u10-c1': String(1.5 + 2.5), 'u10-c2': String((15 / 3) * 2), 'u10-c3': '1 1/2', 'u10-c4': String(24 - (24 / 8) * 3), 'u10-c5': '1/4 liter',
    'u11-p1': '6/12', 'u11-c1': '8/5', 'u11-c2': String(4 * 3), 'u11-c3': '6/12', 'u11-c4': String(30 - 30 / 5 - 30 / 3), 'u11-c5': String(3 * 4 - 5),
    'u12-p1': `${(3 / 4) * 100} cm`, 'u12-c1': '3/4', 'u12-c2': `${(100 / 5) * 3} cm`, 'u12-c3': '1 1/8 m',
    'u12-c4': ['Team A', 'Team B', 'Team C', 'Team D', 'Team E'][[2 / 5, 3 / 8, 1 / 3, 3 / 10, 1 / 4].indexOf(Math.max(2 / 5, 3 / 8, 1 / 3, 3 / 10, 1 / 4))],
    'u12-c5': `${(200 / 8) * 5} cm`,
    'u13-p1': '3/10', 'u13-c1': '3/6', 'u13-c2': `${(3 * 2) / 3} cups`,
    'u13-c3': ['6/8', '9/12', '12/16', '15/20', '8/10'].find((f) => { const [t, b] = f.split('/').map(Number); return t * 4 !== b * 3; })!,
    'u13-c4': `${12 - 3 - 4}/12`, 'u13-c5': '1 1/8 cups',
    'u14-p1': '40%', 'u14-c1': `${(3 / 4) * 100}%`, 'u14-c2': '1/2, 55%, 0.6', 'u14-c3': `${(17 / 20) * 100}%`, 'u14-c4': `${100 - 40 - 30}%`, 'u14-c5': String(24 - 24 / 4 - (24 - 24 / 4) / 3),
    'u15-p1': String((6 / 2) * 6), 'u15-c1': String(6 * 4), 'u15-c2': `${2 + 3}/7`, 'u15-c3': String((12 / 3) * 5), 'u15-c4': String(36 - 36 / 4 - (36 - 36 / 4) / 3), 'u15-c5': String((3 / 4) / (1 / 8)),
  };

  it('has a picture puzzle plus five questions worth 3, 3, 3, 4, 4 and 5 points in every unit', () => {
    for (let unit = 1; unit <= 15; unit++) {
      assert.deepEqual(CHALLENGES[unit].map((item) => item.points), [3, 3, 3, 4, 4, 5]);
      assert.ok(CHALLENGES[unit][0].figure, `unit ${unit} starts with a picture puzzle`);
      assert.equal(challengeMaxPoints(unit), 22);
    }
  });

  it('marks independently computed answers as correct', () => {
    for (const items of Object.values(CHALLENGES)) {
      for (const item of items) {
        assert.equal(item.choices.length, 5, item.id);
        assert.equal(new Set(item.choices).size, 5, `${item.id} has duplicate choices`);
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
    assert.match(markup, /The strip opens into 4 equal pieces/);
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

  it('gives each walk-through step three distinct choices and the authored answer', () => {
    const expectedSteps: Record<string, string[]> = {
      'u1-c3': ['2', '4', '1/4'], 'u1-c5': ['4', '12'],
      'u2-c3': ['6', '1/3', '6'], 'u2-c4': ['3', '24'],
      'u2-c5': ['12', '4', '8'], 'u4-c5': ['6/8 m', '9/8 m', 'Yes'],
      'u5-c4': ['1/4', '1/6', '1/6'], 'u6-c4': ['1/4', '2'],
      'u7-c5': ['6/3', '8/3', '3'], 'u8-c4': ['5/10 m', '2/10 m'],
      'u9-c4': ['8/12', '9/12', '10/12'],
      'u10-c3': ['2 5/4', '1 2/4', '1 1/2'], 'u10-c4': ['3', '9', '15'], 'u10-c5': ['10/12', '4/12 and 3/12', '3/12'],
      'u11-c4': ['6', '10', '14'], 'u11-c5': ['4', '12', '7'],
      'u12-c3': ['4/8', '2/8', '9/8'], 'u12-c4': ['2/5', '3/8', '2/5'], 'u12-c5': ['200', '25 cm', '125 cm'],
      'u13-c4': ['7', '5', '5/12'], 'u13-c5': ['3/8 cup', '3/4 + 3/8', '9/8'],
      'u14-c3': ['85/100', '85%'], 'u14-c4': ['40%', '30%', '30%'], 'u14-c5': ['6', '18', '12'],
      'u15-c3': ['4', '20'], 'u15-c4': ['9', '27', '18'], 'u15-c5': ['6/8', '6'],
    };
    for (const items of Object.values(CHALLENGES)) {
      for (const item of items) {
        if (!item.steps) continue;
        assert.deepEqual(item.steps.map((step) => step.choices[step.correct]), expectedSteps[item.id], `${item.id} steps`);
        for (const step of item.steps) assert.equal(new Set(step.choices).size, 3, `${item.id}: ${step.prompt}`);
      }
    }
    assert.equal(Object.values(CHALLENGES).flat().filter((item) => item.steps).length, Object.keys(expectedSteps).length);
  });
});

describe('question generator', () => {
  const fractionValue = (text: string) => {
    const [n, d] = text.split('/').map(Number);
    return n / d;
  };
  const ids = (id: string) => getMission(id).questions.map((question) => question.id);
  // Units 9–14: every generated question type is re-solved here from its own numbers.
  const num = (text: string): number => {
    const t = text.replace(/ (m|cups?|liters?)$/, '');
    if (t.endsWith('%')) return Number(t.slice(0, -1)) / 100;
    const mixed = /^(\d+) (\d+)\/(\d+)$/.exec(t); if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
    const frac = /^(\d+)\/(\d+)$/.exec(t); if (frac) return Number(frac[1]) / Number(frac[2]);
    return Number(t);
  };
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
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
    else if ((m = /^A ribbon is (\d+) m long\. How long is (\d+)\/(\d+) of it\?$/.exec(p))) expected = (N(m[1]) / N(m[3])) * N(m[2]);
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
    if (expected === null) return false;
    if (typeof expected === 'string') assert.equal(answer.replace(/\s/g, ''), expected.replace(/\s/g, ''), p);
    else assert.ok(near(num(answer), expected), `${p} → ${answer}, expected ${expected}`);
    // Wrong choices must really be wrong.
    question.choices.forEach((c, i) => { if (i !== question.correctChoice && typeof expected === 'number' && !Number.isNaN(num(c))) assert.ok(!near(num(c), expected), `${p}: "${c}" is also right`); });
    return true;
  };
  const verify = (question: PracticeQuestion): boolean => {
    const answer = question.choices[question.correctChoice];
    // Four choices (A–D); sign questions have only <, = and >.
    const want = isSignQuestion(question.choices) ? 3 : 4;
    assert.equal(question.choices.length, want, `${question.id}: ${question.prompt} | ${question.choices.join(' / ')}`);
    assert.equal(new Set(question.choices.map((choice) => choice.trim())).size, want, question.id);
    for (const c of question.choices) assert.ok(c.trim().split(/\s+/).length <= 6, `${question.id}: "${c}" is too long for an answer choice`);
    let match = /^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = \?$/.exec(question.prompt);
    if (match) {
      const result = Number(match[1]) / Number(match[2]) + (match[3] === '+' ? 1 : -1) * Number(match[4]) / Number(match[5]);
      assert.ok(Math.abs(fractionValue(answer) - result) < 1e-9, question.prompt);
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
    const sourceProblem = sourceMission?.unit && sourceMission.unit >= 9
      ? getWorksheet(sourceMission.id).find((problem) => asChoicePrompt(problem.prompt) === question.prompt)
      : undefined;
    if (sourceProblem) {
      assert.equal(answer, sourceProblem.answer, `${question.id} should preserve its worksheet answer key`);
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
  it('keeps every "which idea explains why?" choice short, with the right one no longer than the others', () => {
    const words = (t: string) => t.trim().split(/\s+/).length;
    for (const mission of MISSIONS) {
      assert.ok(REASON_IDEAS[mission.id], `${mission.id} needs a short key idea`);
      const checks = [...getBuildChecks(mission.id), getReviewCheck(mission.id, 0), getReviewCheck(mission.id, 1)];
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
      const mentioned = p.prompt.includes(shown) || sameValue || mixedInPrompt || /this|dot|shaded|of \d+/i.test(p.prompt) || p.model.kind === 'set';
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
    assert.equal(report.toPractice[0].idea, 'Counting pieces, groups or jumps'); assert.equal(report.toPractice[0].count, 3);
    assert.deepEqual(report.toPractice[0].lessons, [MISSIONS[0].title]);
    assert.equal(report.nextLesson, `Lesson 2: ${MISSIONS[1].title}`);
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
    assert.deepEqual(CODE_EXAMPLES.map((example) => example.target.kind), ['bar', 'line', 'set']);
    for (const example of CODE_EXAMPLES) {
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

  it('gives every lesson question four different choices (sign questions three)', () => {
    for (const m of MISSIONS) for (const q of m.questions) {
      const want = isSignQuestion(q.choices) ? 3 : 4;
      assert.equal(q.choices.length, want, `${q.id}: ${q.prompt} | ${q.choices.join(' / ')}`);
      assert.equal(new Set(q.choices.map((c) => c.trim().toLowerCase())).size, want, q.id);
      for (const c of q.choices) assert.doesNotMatch(c, /^(?:Yes|No):/, 'yes and no are followed by a comma');
      for (const c of q.choices) assert.ok(c.trim().split(/\s+/).length <= 6, `${q.id}: "${c}" is too long for an answer choice`);
    }
  });
});

describe('placement quiz', () => {
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
  it('keeps unit 9–14 challenge bests after a reload', () => {
    saveProgress({ ...EMPTY_PROGRESS, challengeBest: { 1: 20, 12: 17, 14: 22 } });
    assert.deepEqual(loadProgress().challengeBest, { 1: 20, 12: 17, 14: 22 });
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
      const truth = parts.length !== d ? `No, there are ${d + 1} pieces` : equal ? `Yes, ${d} equal pieces` : 'No, the pieces are unequal';
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
    const q = MISSIONS.find((m) => m.id === 'compare-same-numerator')!.questions.find((item) => /2\/3 or 2\/7/.test(item.prompt))!;
    assert.equal(q.model.kind, 'bars');
    if (q.model.kind === 'bars') assert.deepEqual(q.model.bars.map((b) => `${b.numerator}/${b.denominator}`), ['2/3', '2/7']);
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
    assert.match(transfer.prompt, /2\/3 or 2\/5/);
    const unlike = getWorksheet('compare-unlike-fractions');
    assert.ok(unlike.some((p) => { const m = /(\d+)\/\d+ __ (\d+)\/\d+/.exec(p.prompt); return !!m && m[1] === m[2]; }));
  });
  it('clearly teaches that a larger denominator makes smaller pieces when the numerator stays the same', () => {
    const lesson = MISSIONS.find((m) => m.id === 'compare-same-numerator')!;
    const explainsPieceSize = (text: string) =>
      /(?:denominator|bottom number|equal parts|pieces|parts)/i.test(text)
      && /(?:smaller|larger|fewer|more)/i.test(text);
    assert.match(lesson.skill, /same (?:numerator|top number).*(?:larger denominator|larger bottom number).*more equal parts.*piece.*smaller/i);
    assert.match(lesson.example.explanation, /both (?:fractions )?count 3 pieces.*eighths.*smaller.*3\/8 (?:is )?(?:smaller|less) than 3\/5/i);
    assert.ok(lesson.questions.every((question) => explainsPieceSize(question.hint)), 'each authored hint compares the denominator or piece size');

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
    const compare = MISSIONS.find((m) => m.id === 'compare-same-numerator')!.questions.find((q) => /2\/3 or 2\/7/.test(q.prompt))!;
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
      for (const voice of ['af_aoede', 'af_sarah', 'bf_isabella', 'am_michael', 'am_puck', 'bm_george']) {
        assert.match(markup, new RegExp(`radio-natural-voice-${voice}`));
      }
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
  it('is on by default and remembers a grown-up turning it off', () => {
    const store = new Map<string, string>();
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); } };
    assert.equal(naturalVoicePreference(), 'af_heart');
    setNaturalVoicePreference('off');
    assert.equal(naturalVoicePreference(), 'off');
    assert.equal(naturalVoiceStatus().state, 'off');
    setNaturalVoicePreference('af_bella');
    assert.equal(naturalVoicePreference(), 'af_bella');
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
    const q = MISSIONS.find((m) => m.id === 'compare-same-numerator')!.questions.find((item) => /4\/5 or 4\/9/.test(item.prompt))!;
    assert.equal(q.simplerModel.kind, 'bars');
    if (q.simplerModel.kind === 'bars') assert.deepEqual(q.simplerModel.bars.map((b) => `${b.numerator}/${b.denominator}`), ['4/5', '4/9']);
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
  it('shows the self-test only in development or with ?voicetest', async () => {
    const { showVoiceSelfTest } = await import('./KokoroDiagnostic');
    assert.equal(showVoiceSelfTest(true, ''), true);
    assert.equal(showVoiceSelfTest(false, ''), false);
    assert.equal(showVoiceSelfTest(false, '?voicetest'), true);
    assert.equal(showVoiceSelfTest(false, '?a=1&voicetest=1'), true);
    assert.equal(showVoiceSelfTest(false, '?voicetester'), false);
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
      const clip = await serverEngine.generate('One half.', { voice: 'af_bella', speed: 1 });
      assert.equal(clip.toBlob().type, 'audio/wav');
      assert.ok(asked.includes('/api/voice/speech?voice=af_bella&text=One%20half.'));
    } finally {
      globalThis.fetch = originalFetch; (globalThis as { Audio?: unknown }).Audio = originalAudio;
      if (!hadWindow) Reflect.deleteProperty(globalThis, 'window');
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

describe('fourth answer choice', () => {
  it('adds a believable wrong answer that is never a second right one', () => {
    assert.equal(fourthChoice('Pick the sign: 6/9 __ 7/9', ['>', '<', '='], 1), null, 'only three signs exist');
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
    assert.match(wrongChoiceReason('What is 3/8 + 2/8?', ['5/8', '5/16', '6/8', '5/13'], 0, 1)!, /Add only the top numbers/);
    assert.match(wrongChoiceReason('Write 8/100 as a decimal.', ['0.08', '0.8', '8.00', '0.008'], 0, 1)!, /places/);
    assert.match(wrongChoiceReason('Which is bigger, 1/4 or 1/6?', ['1/4', '1/6', 'They are equal', "You can't tell"], 0, 1)!, /smaller/);
    assert.match(wrongChoiceReason('Which is bigger, 1/4 or 1/6?', ['1/4', '1/6', 'They are equal', "You can't tell"], 0, 3)!, /You can tell/);
    assert.match(wrongChoiceReason('Which is bigger, 1/4 or 1/6?', ['1/4', '1/6', 'They are equal', "You can't tell"], 0, 2)!, /not the same amount/);
    assert.equal(wrongChoiceReason('Is this strip cut into thirds?', ['Yes, 3 equal pieces', 'No, the pieces are unequal'], 1, 0), null, 'worded choices fall back to the lesson help');
    assert.equal(wrongChoiceReason(q, ['9/1', '1/9'], 1, 1), null, 'no help for a right answer');
    for (const m of MISSIONS) for (const question of m.questions) question.choices.forEach((_, i) => {
      const said = wrongChoiceReason(question.prompt, question.choices, question.correctChoice, i);
      if (said) assert.ok(!said.includes(question.choices[question.correctChoice]) || /^\d$/.test(question.choices[question.correctChoice]), `${question.id}: help gives the answer away`);
    });
  });
  it('opens kindly, with a few different openers', () => {
    const openers = new Set(MISSIONS.flatMap((m) => m.questions.map((q) => retryOpener(`${q.id}:1`))));
    assert.ok(openers.size >= 4);
    for (const o of openers) assert.doesNotMatch(o, /wrong|no!/i);
  });
});

describe('paper folding', () => {
  it('keeps each fold’s crease and names shaded amounts in earlier pieces', async () => {
    const { creaseLevel, shadedName } = await import('./PaperFold');
    // Halves, then fourths: the middle crease is from the first fold, the others from the second.
    assert.deepEqual([1, 2, 3].map((i) => creaseLevel(i, [2, 2])), [2, 1, 2]);
    assert.deepEqual([1, 2, 3, 4, 5, 6, 7].map((i) => creaseLevel(i, [2, 2, 2])), [3, 2, 3, 1, 3, 2, 3]);
    assert.deepEqual([1, 2, 3, 4, 5].map((i) => creaseLevel(i, [3, 2])), [2, 1, 2, 1, 2]);
    assert.equal(shadedName(2, [2, 2]), '2/4 = 1/2');
    assert.equal(shadedName(3, [2, 2]), '3/4');
    assert.equal(shadedName(4, [2, 2, 2]), '4/8 = 1/2');
    assert.equal(shadedName(6, [2, 2, 2]), '6/8 = 3/4');
    assert.equal(shadedName(0, [2]), '');
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
