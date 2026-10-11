import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHALLENGES, challengeMaxPoints } from './challenges';
import { splitStory } from './fun-ui';
import { buildParentReport } from './parent-report';
import { applyPlacement, placementItems, PLACEMENT_UNITS } from './placement';
import { applyAnswer, newRacer, RACE_GOAL, ROBOT_LEVELS } from './FractionRace';
import { describe as describeRun, getCodeLevels, matchesTarget, runProgram, solution, toText, usesLoop } from './code-quest';
import { loadFun, recordCorrect, recordMinute } from './lib/fun';
import { generateQuestions, getExtraPractice, hasGenerator, makeRng } from './practice-bank';
import type { PracticeQuestion } from './game';
import { answerMatches, asChoicePrompt, getBuildCheckStage, getBuildChecks, getModelFeedback, getReasonFeedback, getReviewCheck, getWorksheet, parseAnswer } from './learning-content';
import { FractionEntry, fractionDraftFromParts, fractionParts, updateFractionPart, usesFractionEntry } from './FractionEntry';
import { LearningText } from './LearningText';
import { BarSvg } from './models';
import { canEnterWorksheetAnswer, WorksheetBarCopy, worksheetBarMatches } from './WorksheetBarCopy';
import { checkWorksheet, editWorksheet, emptyLearningRecord, getLearningRecord, hasLearningGate, updateLearning, worksheetCount } from './learning';
import QuickReviewEntry from './QuickReviewEntry';
import {
  completeMission,
  completeSkillReview,
  deferSkillReview,
  EMPTY_PROGRESS,
  getMission,
  getDelayedReviewQuestions,
  getDueSkillReviewCount,
  getDueSkillReviewQuestions,
  getNextMission,
  isCorrectAnswer,
  isMissionUnlocked,
  loadProgress,
  MISSIONS,
  numberLineWholeCount,
  recordMissedSkill,
  resetProgress,
  saveProgress,
  SKILL_REVIEW_DELAY_MS,
  type ModelSpec,
  type Progress,
} from './game';
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
  'simplify-fractions', 'equivalent-missing-both', 'compare-unlike-fractions', 'order-unlike-fractions',
  'subtract-unlike-fractions', 'add-mixed-numbers', 'subtract-mixed-numbers', 'fraction-of-quantity',
  'multiply-whole-by-fraction', 'multiply-fractions', 'fraction-of-collection', 'divide-whole-by-unit-fraction',
  'fraction-of-length', 'fractional-measure-addition', 'fractional-sharing', 'fraction-as-division',
  'fraction-probability', 'fraction-of-area', 'equivalent-number-line', 'fraction-recipes',
  'fractions-to-percent', 'percent-to-fraction', 'decimal-fraction-equivalence', 'multi-step-fraction-stories',
];

const memory = new Map<string, string>();

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
    default: {
      const unreachable: never = model;
      assert.fail(`${location} has an unsupported visual model: ${JSON.stringify(unreachable)}`);
    }
  }
}

describe('lesson catalog', () => {
  it('covers 52 sequenced lessons in the expected sequence and unit groups', () => {
    assert.equal(MISSIONS.length, 52);
    assert.deepEqual(MISSIONS.slice(0, 28).map((mission) => mission.id), EXPECTED_MISSION_IDS);
    assert.deepEqual(MISSIONS.slice(28).map((mission) => mission.id), EXPECTED_EXTENSION_IDS);
    assert.deepEqual(
      Object.fromEntries(
        [...new Set(MISSIONS.map((mission) => mission.unit))]
          .map((unit) => [unit, MISSIONS.filter((mission) => mission.unit === unit).length]),
      ),
      { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 4, 8: 6, 9: 4, 10: 4, 11: 4, 12: 4, 13: 4, 14: 4 },
    );
  });

  it('has unique question IDs, valid answer bounds, and required visual and support content', () => {
    const missionIds = new Set(MISSIONS.map((mission) => mission.id));
    const questionIds = new Set<string>();

    MISSIONS.forEach((mission, missionIndex) => {
      assert.ok(mission.title.trim() && mission.shortTitle.trim() && mission.description.trim() && mission.skill.trim());
      assert.ok(mission.questions.length >= 4, `${mission.id} needs enough practice and a mastery check`);
      assert.ok(mission.example.prompt.trim() && mission.example.answer.trim() && mission.example.explanation.trim());
      assertModel(mission.example.model, `${mission.id} worked example`);

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
    const expected = ['1/3', '3/9', '<', '3/4, 1/2, 1/3', '2/6', '3', '1 5/6', '6', '3/3', '1/9', '6', '6', '3', '3/6', '2/3', '2/3', '2/6', '1/3', '2/6', '3/3', '25%', '25/100', '0.25', '2/5'];
    MISSIONS.slice(28).forEach((mission, index) => {
      const question = mission.questions[0];
      assert.equal(question.choices[question.correctChoice], expected[index], mission.id);
      assert.equal(new Set(question.choices).size, question.choices.length, `${mission.id} has duplicate answer choices`);
    });
  });
  it('checks the first worksheet answer for every added mission independently', () => {
    const expected = ['1/2', '2', '>', '1/4, 1/2, 2/3', '1/4', '2', '3/4', '2', '2/2', '1/4', '2', '2', '2', '3/4', '1/2', '1/2', '1/4', '1/2', '2/4', '2/2', '50%', '50/100', '0.5', '2/4'];
    MISSIONS.slice(28).forEach((mission, index) => {
      assert.equal(getWorksheet(mission.id)[0].answer, expected[index], mission.id);
    });
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
    const legacyLessonsMastered = MISSIONS.slice(0, 28).reduce(
      (progress, mission) => withLearning(progress, mission.id),
      EMPTY_PROGRESS,
    );
    const firstExtension = MISSIONS[28];
    const thirdExtension = MISSIONS[30];
    assert.equal(getNextMission(legacyLessonsMastered)?.id, firstExtension.id);
    assert.equal(isMissionUnlocked(legacyLessonsMastered, firstExtension.id), true);
    assert.equal(isMissionUnlocked(legacyLessonsMastered, thirdExtension.id), true, 'new same-level missions are available together');
    assert.equal(isMissionUnlocked(legacyLessonsMastered, MISSIONS[32].id), false, 'the next level remains locked');

    const weakEvidence = {
      ...emptyLearningRecord(),
      practiceDone: true,
      misconceptions: { 'Compare using a common denominator.': 2 },
      checks: { build: { passed: false, supported: true, attempts: 2 } },
    };
    const adapted = updateLearning(legacyLessonsMastered, thirdExtension.id, weakEvidence);
    assert.equal(getNextMission(adapted)?.id, thirdExtension.id, 'evidence of difficulty reorders the recommendation within the unlocked unit');

    const completedUnit = MISSIONS.slice(28, 32).reduce(
      (progress, mission) => withLearning(progress, mission.id),
      legacyLessonsMastered,
    );
    assert.equal(isMissionUnlocked(completedUnit, MISSIONS[32].id), true);
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

function withLearning(progress: Progress, id: string): Progress {
  let record = { ...emptyLearningRecord(), practiceDone: true };
  for (const check of getBuildChecks(id)) record.checks[check.id] = { passed: true, supported: false, attempts: 1 };
  for (const problem of getWorksheet(id)) {
    record = checkWorksheet(editWorksheet(record, problem.id, problem.answer), problem);
  }
  return updateLearning(progress, id, record);
}

describe('entered-answer worksheets and evidence gates', () => {
  it('highlights fraction vocabulary, explains terms, keeps fractions stacked, and offers audio', () => {
    const markup = renderToStaticMarkup(createElement(LearningText, {
      text: 'Each equal share is 1/4 of a whole.',
      speak: true,
    }));
    assert.match(markup, /class="fq-vocab-trigger" role="term" tabindex="0" aria-describedby=/);
    assert.match(markup, /role="tooltip"/);
    assert.match(markup, /A whole is the full shape or amount/);
    assert.match(markup, /class="fq-mfrac" role="math" aria-label="1 over 4"/);
    assert.match(markup, /class="fq-learning-listen"/);
  });

  it('labels the whole and a part inside the bar model rather than showing a fraction hint beside it', () => {
    const markup = renderToStaticMarkup(createElement(BarSvg, { n: 2, d: 5 }));
    assert.match(markup, />WHOLE 1</);
    assert.match(markup, />PART<\/text>/);
    assert.match(markup, /each whole is split into 5 equal parts/);
    assert.match(markup, /2 parts are shaded/);
  });

  it('provides a labeled stacked fraction field and keeps slash entry available', () => {
    const markup = renderToStaticMarkup(createElement(FractionEntry, {
      id: 'ws-w1',
      value: '1/3',
      onChange: () => undefined,
      describedBy: 'ws-fb-w1',
    }));
    assert.match(markup, /aria-label="Numerator \(top number\)"/);
    assert.match(markup, /aria-label="Denominator \(bottom number\)"/);
    assert.match(markup, /class="fq-ll-fraction-bar" aria-hidden="true"/);
    assert.match(markup, /inputmode="numeric"/i);
    assert.match(markup, /Type a fraction with \//);
    assert.match(markup, /aria-label="Insert fraction slash"/);
    assert.match(markup, /value="1"/);
    assert.match(markup, /value="3"/);
  });

  it('keeps fraction drafts editable, including partially entered answers', () => {
    assert.deepEqual(fractionParts('1/3'), { numerator: '1', denominator: '3' });
    assert.deepEqual(fractionParts('2/'), { numerator: '2', denominator: '' });
    assert.deepEqual(fractionParts('/4'), { numerator: '', denominator: '4' });
    assert.equal(fractionDraftFromParts('', ''), '');
    assert.equal(fractionDraftFromParts('2', '5'), '2/5');
    assert.equal(updateFractionPart('1/3', 'numerator', '2'), '2/3');
    assert.equal(updateFractionPart('1/3', 'denominator', '4'), '1/4');
    assert.equal(updateFractionPart('1/3', 'numerator', '1/5'), '1/5');
    assert.equal(updateFractionPart('1/3', 'numerator', ''), '/3');
  });

  it('uses the fraction control only for single-fraction worksheet answers', () => {
    const problems = getWorksheet(MISSIONS[0].id);
    assert.equal(usesFractionEntry(problems[0]), true);
    assert.equal(usesFractionEntry(problems[1]), false);
    assert.equal(usesFractionEntry({ ...problems[0], form: 'mixed' }), false);
    assert.equal(usesFractionEntry({ ...problems[0], form: 'ordered' }), false);
    assert.equal(usesFractionEntry({ ...problems[0], form: 'decimal' }), false);
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
    const expected = ['1/3', '1', '3', '1/2', '2', '4', '1/4', '1/3', '3/4', '3', '1/3', '4/3', '2/3', '2/3', '1/3, 2/3, 3/3', '2', '2/6', '2', '2/3', '2', '>', '4/3', '2/3', '1/3', '3/4', '0.1', '0.08', '34/100'];
    MISSIONS.slice(0, expected.length).forEach((mission, index) => assert.equal(getWorksheet(mission.id)[0].answer, expected[index], mission.id));
  });
  it('authors twelve valid problems and two skill checks for every topic', () => {
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
      assert.equal(checks.length, 2);
      assert.equal(checks[1].transfer, true);
      assert.notDeepEqual(checks[0].target, checks[1].target, `${mission.id}: transfer must use new numbers`);
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
    const equalParts = getWorksheet('equal-parts');
    assert.ok(equalParts.every(problem => problem.modelRequired && problem.model?.kind === 'bar'));
    assert.ok(equalParts.every(problem => !/jump|number line|shares make the whole/i.test(problem.prompt)));
    assert.ok(equalParts.every(problem => (problem.model?.d ?? 99) <= 6));

    const unitFractions = getWorksheet('unit-fractions');
    assert.ok(unitFractions.every(problem => problem.modelRequired && problem.model?.kind === 'bar'));
    assert.ok(unitFractions.every(problem => !/jump|number line/i.test(problem.prompt)));

    const fractionNames = getWorksheet('fraction-names');
    assert.ok(fractionNames.every(problem => problem.modelRequired && problem.model?.kind === 'bar'));
    assert.ok(fractionNames.some(problem => problem.prompt.includes('bar model')));
    assert.ok(fractionNames.every(problem => !/garden bed|paper strip/i.test(problem.prompt)));
  });
  it('requires a student to copy the bar model before worksheet answers unlock', () => {
    const problem = getWorksheet('equal-parts')[0];
    const markup = renderToStaticMarkup(createElement(WorksheetBarCopy, {
      target: problem.model!,
      disabled: false,
      statusId: 'worksheet-model-status',
      onMatchChange: () => {},
    }));
    assert.match(markup, /class="fq-ll-copy-part/);
    assert.match(markup, /aria-pressed="false"/);
    assert.match(markup, /WHOLE 1/);
    assert.match(markup, /PART · one equal piece/);

    const target = problem.model!;
    assert.equal(worksheetBarMatches(target, Array(target.d).fill(false)), false);
    assert.equal(worksheetBarMatches(target, [true, ...Array(target.d - 1).fill(false)]), true);
    assert.equal(worksheetBarMatches(target, [true, true, ...Array(target.d - 2).fill(false)]), false);
    assert.equal(canEnterWorksheetAnswer(true, false), false);
    assert.equal(canEnterWorksheetAnswer(true, true), true);
    assert.equal(canEnterWorksheetAnswer(false, false), true);
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
  };

  it('has a picture puzzle plus five questions worth 3, 3, 3, 4, 4 and 5 points in every unit', () => {
    for (let unit = 1; unit <= 14; unit++) {
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

describe('long problems', () => {
  it('splits stories without breaking decimals or fractions', () => {
    assert.deepEqual(
      splitStory('A ribbon is 9/10 m long. You cut off 4/10 m. Then you cut off 3/10 m. How much is left?'),
      { lines: ['A ribbon is 9/10 m long.', 'You cut off 4/10 m.', 'Then you cut off 3/10 m.'], question: 'How much is left?' },
    );
    assert.deepEqual(splitStory('Which is bigger, 0.4 or 0.35?'), { lines: [], question: 'Which is bigger, 0.4 or 0.35?' });
    assert.equal(splitStory('3/5 = 12/?. What is the missing number?').lines.length, 0);
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
    else if ((m = /^(\d+) (?:loaf is|loaves are|pizzas are) shared fairly by (\d+) friends/.exec(p)) || (m = /^(\d+) ÷ (\d+) = \?$/.exec(p))) expected = N(m[1]) / N(m[2]);
    else if ((m = /^A bag has (\d+) marbles\. (\d+) (?:is|are) green/.exec(p))) expected = N(m[2]) / N(m[1]);
    else if (p === 'What fraction of the tile is shaded?' && question.model.kind === 'bars') expected = question.model.bars[0].numerator / question.model.bars[0].denominator;
    else if ((m = /^(\d+)\/(\d+) is marked on a line\. Which fraction with (\d+) on the bottom/.exec(p))) {
      assert.equal(N(answer.split('/')[1]), N(m[3]), p); expected = N(m[1]) / N(m[2]);
    } else if ((m = /^A recipe uses (\d+)\/(\d+) cup of flour\. How much flour do (\d+) batches need\?$/.exec(p))) expected = (N(m[1]) * N(m[3])) / N(m[2]);
    else if ((m = /^Write (\d+)\/(\d+) as a percent\.$/.exec(p))) { assert.ok(answer.endsWith('%'), p); expected = N(m[1]) / N(m[2]); }
    else if ((m = /^Write (\d+)% as a fraction\.$/.exec(p))) expected = N(m[1]) / 100;
    else if ((m = /^Write (\d+)\/(\d+) as a decimal\.$/.exec(p))) { assert.match(answer, /^\d+\.\d+$/, p); expected = N(m[1]) / N(m[2]); }
    else if ((m = /^(\d+)\/(\d+) of a garden is planted\. Then (\d+)\/(\d+) more/.exec(p)) || (m = /^Mia reads (\d+)\/(\d+) of a book on Monday and (\d+)\/(\d+) on Tuesday/.exec(p))) expected = 1 - N(m[1]) / N(m[2]) - N(m[3]) / N(m[4]);
    if (expected === null) return false;
    if (typeof expected === 'string') assert.equal(answer.replace(/\s/g, ''), expected.replace(/\s/g, ''), p);
    else assert.ok(near(num(answer), expected), `${p} → ${answer}, expected ${expected}`);
    // Wrong choices must really be wrong.
    question.choices.forEach((c, i) => { if (i !== question.correctChoice && typeof expected === 'number' && !Number.isNaN(num(c))) assert.ok(!near(num(c), expected), `${p}: "${c}" is also right`); });
    return true;
  };
  const verify = (question: PracticeQuestion): boolean => {
    const answer = question.choices[question.correctChoice];
    assert.equal(question.choices.length, 3, question.id);
    assert.equal(new Set(question.choices.map((choice) => choice.trim())).size, 3, question.id);
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
      assert.equal(answer, (match[1] === 'bigger') === (first > second) ? match[2] : match[3], question.prompt);
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
    assert.deepEqual([...positions].sort(), [0, 1, 2]);
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
    for (const mission of MISSIONS) for (const check of getBuildChecks(mission.id)) assert.equal(check.reasons[check.correctReason], check.explanation);
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
      const mentioned = p.prompt.includes(shown) || sameValue || /this|dot|shaded|of \d+/i.test(p.prompt) || p.model.kind === 'set';
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
  const titles = Array.from({ length: 14 }, (_, i) => `Unit ${i + 1}`);
  const fun0 = { xp: 0, day: '2026-10-11', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true };
  it('starts empty and points to lesson 1', () => {
    const report = buildParentReport(EMPTY_PROGRESS, fun0, titles, new Date(2026, 9, 11));
    assert.equal(report.lessonsDone, 0); assert.equal(report.lessonsTotal, MISSIONS.length);
    assert.equal(report.firstTryRate, null); assert.equal(report.onOwnRate, null);
    assert.equal(report.nextLesson, `Lesson 1: ${MISSIONS[0].title}`);
    assert.equal(report.week.length, 7); assert.equal(report.minutesWeek, 0);
    assert.equal(report.units.length, 14);
    assert.equal(report.units[0].lessons[0].status, 'open'); assert.equal(report.units[0].lessons[1].status, 'locked');
  });
  it('counts first-try answers, independent builds, tricky ideas and this week\'s activity', () => {
    const id = MISSIONS[0].id; const sheet = getWorksheet(id);
    let record = emptyLearningRecord();
    // 12 answers: 10 right first time, 2 needed a second try.
    sheet.forEach((p, i) => { record = editWorksheet(record, p.id, i < 10 ? p.answer : 'oops'); record = checkWorksheet(record, p); });
    sheet.slice(10).forEach((p) => { record = editWorksheet(record, p.id, p.answer); record = checkWorksheet(record, p); });
    record = { ...record, practiceDone: true, checks: { build: { passed: true, supported: false, attempts: 1 }, transfer: { passed: true, supported: true, attempts: 2 } }, misconceptions: { ...record.misconceptions, 'Counting pieces, groups or jumps': 3 } };
    const progress = updateLearning({ ...EMPTY_PROGRESS, completedMissionIds: [id], starsByMission: { [id]: 2 } }, id, record);
    const now = new Date(2026, 9, 11);
    const fun = { ...fun0, xp: 120, dayStreak: 3, activity: { '2026-10-11': { minutes: 12, answered: 9 }, '2026-10-09': { minutes: 5, answered: 2 }, '2026-09-01': { minutes: 99, answered: 99 } } };
    const report = buildParentReport(progress, fun, titles, now);
    assert.equal(report.lessonsDone, 1); assert.equal(report.stars, 2);
    assert.equal(report.firstTryRate, Math.round((10 / 12) * 100));
    assert.equal(report.onOwnRate, 50);
    assert.equal(report.units[0].lessons[0].builds, 'With help');
    assert.equal(report.minutesWeek, 17, 'only the last 7 days count'); assert.equal(report.answeredWeek, 11);
    assert.equal(report.toPractice[0].idea, 'Counting pieces, groups or jumps'); assert.equal(report.toPractice[0].count, 3);
    assert.deepEqual(report.toPractice[0].lessons, [MISSIONS[0].title]);
    assert.equal(report.nextLesson, `Lesson 2: ${MISSIONS[1].title}`);
  });
  it('tracks minutes and correct answers per day without touching lessons', () => {
    let fun = recordMinute(recordMinute(loadFun()));
    fun = recordCorrect(fun);
    const day = Object.keys(fun.activity ?? {})[0];
    assert.deepEqual(fun.activity?.[day], { minutes: 2, answered: 1 });
  });
});

describe('code challenge', () => {
  it('every lesson has 3 solvable levels: blanks fail, the right numbers pass, and the bug really is a bug', () => {
    for (const mission of MISSIONS) {
      const levels = getCodeLevels(mission.id);
      assert.equal(levels.length, 3, mission.id);
      for (const level of levels) {
        const answer = runProgram(solution(level.target), level.target);
        assert.ok(matchesTarget(answer, level.target), `${mission.id} L${level.level}: the model answer fails (${answer.error ?? describeRun(answer)})`);
        assert.ok(answer.steps.length < 400, `${mission.id} L${level.level} is too long to animate`);
      }
      assert.equal(runProgram(levels[0].start, levels[0].target).error, 'A block is missing a number.');
      assert.equal(levels[1].start.length, 0);
      assert.ok(!matchesTarget(runProgram(levels[2].start, levels[2].target), levels[2].target), `${mission.id}: the bug program already works`);
    }
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
  it('random guessing (1 in 3) almost never beats even the slow robot, even with very fast taps', () => {
    const wins = Array.from({ length: 1000 }, (_, i) => simulate(1 / 3, 300, i + 1)).filter((s) => s <= ROBOT_LEVELS[0].seconds).length;
    assert.ok(wins < 10, `guessing won ${wins} of 1000 races`);
    // Against the robots a guesser could otherwise beat, it never wins at all.
    for (let seed = 1; seed <= 200; seed++) assert.ok(simulate(1 / 3, 300, seed) > ROBOT_LEVELS[2].seconds, `turbo, seed ${seed}`);
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
    let record = { ...emptyLearningRecord(), practiceDone: true, checks: { build: { passed: true, supported: false, attempts: 1 }, transfer: { passed: true, supported: false, attempts: 1 } } };
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
  it('spreads the right answer across A, B and C', () => {
    const pos = [0, 0, 0]; for (const m of MISSIONS) for (const q of m.questions) pos[q.correctChoice]++;
    const total = pos.reduce((a, b) => a + b, 0);
    for (const n of pos) assert.ok(n / total > 0.25 && n / total < 0.42, `positions ${pos}`);
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
    for (let seed = 1; seed <= 60; seed++) for (const q of generateQuestions('equal-parts', ['x'], seed, 6)) {
      assert.equal(q.model.kind, 'partition');
      if (q.model.kind !== 'partition') continue;
      const d = Number(/fair (\w+)/.exec(q.prompt) && { halves: 2, thirds: 3, fourths: 4, fifths: 5, sixths: 6, eighths: 8 }[/fair (\w+)\?/.exec(q.prompt)![1] as 'halves']);
      const parts = q.model.parts; const equal = parts.every((p) => Math.abs(p - parts[0]) < 1e-6);
      const truth = parts.length !== d ? `No: there are ${d + 1} pieces` : equal ? `Yes: ${d} equal pieces` : 'No: the pieces are not equal';
      assert.equal(q.choices[q.correctChoice], truth, `${q.prompt} with ${parts.length} parts, equal=${equal}`);
    }
  });
});
