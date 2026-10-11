import assert from 'node:assert/strict';
import type { PracticeQuestion } from './game';
import { beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHALLENGES, challengeMaxPoints } from './challenges';
import { splitStory } from './fun-ui';
import { generateQuestions, getExtraPractice, hasGenerator } from './practice-bank';
import { answerMatches, getBuildChecks, getReasonFeedback, getReviewCheck, getWorksheet, parseAnswer } from './learning-content';
import { checkWorksheet, editWorksheet, emptyLearningRecord, getLearningRecord, hasLearningGate, updateLearning, worksheetCount } from './learning';
import QuickReviewEntry from './QuickReviewEntry';
import {
  completeMission,
  completeSkillReview,
  deferSkillReview,
  EMPTY_PROGRESS,
  getDelayedReviewQuestions,
  getDueSkillReviewCount,
  getDueSkillReviewQuestions,
  getNextMission,
  isCorrectAnswer,
  isMissionUnlocked,
  loadProgress,
  getMission,
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
  it('covers 51 sequenced lessons in the expected sequence and unit groups', () => {
    assert.equal(MISSIONS.length, 51);
    assert.deepEqual(MISSIONS.slice(0, 27).map((mission) => mission.id), EXPECTED_MISSION_IDS);
    assert.deepEqual(MISSIONS.slice(27).map((mission) => mission.id), EXPECTED_EXTENSION_IDS);
    assert.deepEqual(
      Object.fromEntries(
        [...new Set(MISSIONS.map((mission) => mission.unit))]
          .map((unit) => [unit, MISSIONS.filter((mission) => mission.unit === unit).length]),
      ),
      { 1: 3, 2: 3, 3: 3, 4: 3, 5: 3, 6: 3, 7: 4, 8: 5, 9: 4, 10: 4, 11: 4, 12: 4, 13: 4, 14: 4 },
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
        const review = reviews[0];
        assert.equal(mission.questions.at(-2), review, `${mission.id} review should appear immediately before mastery`);
        assert.equal(review.reviewMissionId, MISSIONS[missionIndex - 1].id);
        assert.ok(review.reviewQuestionId);
        assert.ok(missionIds.has(review.reviewMissionId));
        assert.equal(review.isMastery, false);
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
      assert.ok(question, `expected curated question ${questionId} to exist`);
      assert.equal(question.choices[question.correctChoice], expectedAnswer, `${questionId} answer key`);
      assert.equal(isCorrectAnswer(question, question.correctChoice), true);
      assert.equal(isCorrectAnswer(question, (question.correctChoice + 1) % question.choices.length), false);
    }
  });

  it('keeps the added missions’ first practice answer keys and choices distinct', () => {
    const expected = [
      '1/4', '6/10', '>', '1/6, 1/2, 4/5', '2/8', '3', '1 2/3', '16',
      '2/3', '1/6', '4', '4', '8', '2/2', '1/4', '3/4', '3/8', '4/8',
      '2/6', '2/4', '25%', '80/100', '8/10', '1/5',
    ];
    MISSIONS.slice(27).forEach((mission, index) => {
      const question = mission.questions[0];
      assert.equal(question.choices[question.correctChoice], expected[index], mission.id);
      assert.equal(new Set(question.choices).size, question.choices.length, `${mission.id} has duplicate answer choices`);
    });
  });

  it('checks the first entered-answer key for every added mission independently', () => {
    const expected = [
      '1/4', '2/8', '<', '1/5, 1/4, 2/6', '1/4', '1 2/4', '1', '2',
      '2/4', '1/8', '2', '4', '2', '2/4', '1/4', '1/4', '1/4', '1/4',
      '2/8', '2/4', '25', '25/100', '0.3', '2/4',
    ];
    MISSIONS.slice(27).forEach((mission, index) => {
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
    const legacyLessonsMastered = MISSIONS.slice(0, 27).reduce(
      (progress, mission) => withLearning(progress, mission.id),
      EMPTY_PROGRESS,
    );
    const firstExtension = MISSIONS[27];
    const thirdExtension = MISSIONS[29];
    assert.equal(getNextMission(legacyLessonsMastered)?.id, firstExtension.id);
    assert.equal(isMissionUnlocked(legacyLessonsMastered, firstExtension.id), true);
    assert.equal(isMissionUnlocked(legacyLessonsMastered, thirdExtension.id), true, 'new same-level missions are available together');
    assert.equal(isMissionUnlocked(legacyLessonsMastered, MISSIONS[31].id), false, 'the next level remains locked');

    const weakEvidence = {
      ...emptyLearningRecord(),
      practiceDone: true,
      misconceptions: { 'Compare using a common denominator.': 2 },
      checks: { build: { passed: false, supported: true, attempts: 2 } },
    };
    const adapted = updateLearning(legacyLessonsMastered, thirdExtension.id, weakEvidence);
    assert.equal(getNextMission(adapted)?.id, thirdExtension.id, 'evidence of difficulty reorders the recommendation within the unlocked unit');

    const completedUnit = MISSIONS.slice(27, 31).reduce(
      (progress, mission) => withLearning(progress, mission.id),
      legacyLessonsMastered,
    );
    assert.equal(isMissionUnlocked(completedUnit, MISSIONS[31].id), true);
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

    const afterSession = sessionQuestions.reduce((current, question) => {
      assert.equal(isCorrectAnswer(question, question.correctChoice), true);
      return completeSkillReview(current, question.reviewMissionId!);
    }, progress);
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
    let progress: Progress = completeMission(withLearning(recordMissedSkill(EMPTY_PROGRESS, lesson.id, lesson.questions[0].id, 1_000), lesson.id), lesson.id, 2);
    progress = completeMission(progress, lesson.id, 1);
    progress = recordMissedSkill(progress, lesson.id, lesson.questions[0].id, 1_000);

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
    assert.equal(getDueSkillReviewCount(loadProgress()), 1);
    assert.equal(hasLearningGate(loaded, lesson.id), true);
  });

  it('clears saved progress when reset is confirmed', () => {
    const lesson = MISSIONS[0];
    saveProgress(recordMissedSkill(completeMission(EMPTY_PROGRESS, lesson.id, 3), lesson.id, lesson.questions[0].id, 0));

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
  it('separates reasoning feedback from model errors across every lesson', () => {
    for (const mission of MISSIONS) {
      for (const check of getBuildChecks(mission.id)) {
        const missing = getReasonFeedback(check, null, false);
        assert.equal(missing?.correct, false, `${mission.id}/${check.id} should ask for a reason`);
        assert.match(missing?.message ?? '', /^Reason:/);

        const incorrectIndex = (check.correctReason + 1) % check.reasons.length;
        const incorrect = getReasonFeedback(check, incorrectIndex, false);
        assert.equal(incorrect?.correct, false, `${mission.id}/${check.id} should reject a wrong reason`);
        assert.ok(incorrect?.message.includes(check.explanation), `${mission.id}/${check.id} should explain the correct idea`);

        const correctButModelsWrong = getReasonFeedback(check, check.correctReason, false);
        assert.equal(correctButModelsWrong?.correct, true, `${mission.id}/${check.id} should preserve a correct reason`);
        assert.match(correctButModelsWrong?.message ?? '', /explanation is correct/);
        assert.equal(getReasonFeedback(check, check.correctReason, true), null);
      }
    }
  });

  it('keeps proper-fraction number lines from 0 to 1 and extends only for improper fractions', () => {
    assert.equal(numberLineWholeCount(1, 3), 1);
    assert.equal(numberLineWholeCount(5, 5), 1);
    assert.equal(numberLineWholeCount(7, 5), 2);
    assert.equal(numberLineWholeCount(11, 5), 3);
    assert.throws(() => numberLineWholeCount(1, 0), RangeError);
  });
  it('checks independently calculated keys across every curriculum topic', () => {
    const expected = ['1/3', '1', '1/3', '1/3', '2', '4', '1/4', '1/3', '1/4', '3', '1/3', '4/3', '2/3', '2/3', '1/3, 2/3, 3/3', '2', '2', '2', '2/3', '1', '4/3', '4/3', '2/3', '1/3', '3/4', '0.1', '0.08'];
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
    let progress = withLearning(EMPTY_PROGRESS, id);
    assert.equal(hasLearningGate(progress, id), true);
    assert.equal(isMissionUnlocked(progress, MISSIONS[1].id), true);
    const record = getLearningRecord(progress, id); const problem = getWorksheet(id)[0];
    progress = updateLearning(progress, id, editWorksheet(record, problem.id, problem.answer));
    assert.equal(worksheetCount(getLearningRecord(progress, id), id), 11);
    assert.equal(isMissionUnlocked(progress, MISSIONS[1].id), false, 'even mathematically correct edits require checking');
    assert.equal(completeMission(progress, id, 3), progress);
    progress = updateLearning(progress, id, checkWorksheet(getLearningRecord(progress, id), problem));
    assert.equal(hasLearningGate(progress, id), true);
    progress = updateLearning(progress, id, { ...getLearningRecord(progress, id), checks: {} });
    assert.equal(hasLearningGate(progress, id), false);
    assert.equal(isMissionUnlocked({ ...EMPTY_PROGRESS, completedMissionIds: MISSIONS.map(m => m.id) }, MISSIONS[1].id), false);
    assert.equal(getNextMission({ ...EMPTY_PROGRESS, completedMissionIds: MISSIONS.map(m => m.id) })?.id, id);
    assert.equal(isMissionUnlocked(progress, 'unknown'), false);
  });
  it('preserves drafts, correction history and learning evidence over reload, then resets them', () => {
    const id = MISSIONS[0].id; const problem = getWorksheet(id)[0];
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
    let progress = withLearning(EMPTY_PROGRESS, id);
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
describe('unit challenges', () => {
  // Each answer worked out independently of the authored explanation.
  const v = (n: number, d: number) => n / d;
  const expected: Record<string, string> = {
    'u1-p1': `${[0, 3, 5].length}/${2 * 4}`, 'u2-p1': '1/3', 'u3-p1': 'D', 'u4-p1': '3/5', 'u5-p1': 'B', 'u6-p1': String(8 / 2), 'u7-p1': '1 and 3/4', 'u8-p1': (35 / 100).toFixed(2),
    'u1-c1': String(12 / 4), 'u1-c2': `${8 - 1 - 2}/8`, 'u1-c3': `1/${2 * 2}`, 'u1-c4': `${2 * 5} cm`, 'u1-c5': String(3 * 4),
    'u2-c1': '1/2', 'u2-c2': String(20 / 4), 'u2-c3': String(18 - (18 / 3) * 2), 'u2-c4': String(8 * 3), 'u2-c5': String(24 / 2 - 24 / 2 / 3),
    'u3-c1': ['2/5', '3/7', '4/9', '5/8', '1/3'].find((f) => { const [n, d] = f.split('/').map(Number); return v(n, d) > 0.5; })!,
    'u3-c2': ['1/2', '2/3', '3/4', '4/5', '5/6'].sort((a, b) => { const [an, ad] = a.split('/').map(Number); const [bn, bd] = b.split('/').map(Number); return (1 - v(an, ad)) - (1 - v(bn, bd)); })[0],
    'u3-c3': ['1/3', '1/5', '2/9', '1/4', '3/10'].sort((a, b) => { const [an, ad] = a.split('/').map(Number); const [bn, bd] = b.split('/').map(Number); return v(an, ad) - v(bn, bd); })[0],
    'u3-c4': `${4 - 3}/8`, 'u3-c5': ['4/9', '9/18', '5/9', '3/8', '4/10'].find((f) => { const [n, d] = f.split('/').map(Number); return n * 2 === d; })!,
    'u4-c1': '3/4', 'u4-c2': String(2 * 3), 'u4-c3': ['3/4', '4/4', '5/4', '8/4', '9/4'].find((f) => { const x = v(Number(f.split('/')[0]), 4); return x > 1 && x < 2; })!,
    'u4-c4': `${4 - 2}/5`, 'u4-c5': String([1, 2, 3, 4, 5, 8].find((days) => days * 3 > 8)),
    'u5-c1': '7/10', 'u5-c2': '2/9', 'u5-c3': ['1/2', '3/5', '2/3', '5/8', '7/8'].find((f) => { const [n, d] = f.split('/').map(Number); return v(n, d) > 0.75; })!,
    'u5-c4': ['Ana', 'Ben', 'Cara', 'Dev'][[v(3, 4), v(2, 3), v(5, 6), v(1, 2)].indexOf(Math.max(v(3, 4), v(2, 3), v(5, 6), v(1, 2)))],
    'u5-c5': String([1, 2, 3, 4, 5].filter((n) => v(n, 6) > 0.5 && v(n, 6) < 1).length),
    'u6-c1': ['2/3', '3/6', '2/5', '4/6', '3/5'].find((f) => { const [n, d] = f.split('/').map(Number); return n * 2 === d; })!,
    'u6-c2': String((2 * 12) / 3), 'u6-c3': ['2/6', '3/9', '4/12', '5/14', '6/18'].find((f) => { const [n, d] = f.split('/').map(Number); return n * 3 !== d; })!,
    'u6-c4': String((1 / 4) * 8), 'u6-c5': String((5 * 12) / 3),
    'u7-c1': '1', 'u7-c2': `${Math.floor(9 / 4)} and ${9 % 4}/4`, 'u7-c3': String(2 * 6),
    'u7-c4': ['1/4 + 3/4', '2/5 + 3/5', '3/8 + 4/8', '1/2 + 1/2', '5/6 + 1/6'].find((sum) => { const [a, b] = sum.split(' + ').map((f) => { const [n, d] = f.split('/').map(Number); return v(n, d); }); return Math.abs(a + b - 1) > 1e-9; })!,
    'u7-c5': String(Math.floor(7 / 2)),
    'u8-c1': `${3 + 4}/8`, 'u8-c2': (3 / 10).toFixed(1), 'u8-c3': ['0.5', '0.45', '0.09', '0.4', '0.38'].sort((a, b) => Number(b) - Number(a))[0],
    'u8-c4': `${9 - 4 - 3}/10 m`, 'u8-c5': `${4 + 2 + 1}/8`,
  };
  it('has a picture puzzle plus five questions worth 3, 3, 3, 4, 4 and 5 points in every unit', () => {
    for (let unit = 1; unit <= 8; unit++) {
      assert.deepEqual(CHALLENGES[unit].map((item) => item.points), [3, 3, 3, 4, 4, 5]);
      assert.ok(CHALLENGES[unit][0].figure, `unit ${unit} starts with a picture puzzle`);
      assert.equal(challengeMaxPoints(unit), 22);
    }
  });
  it('marks the independently computed answer as correct', () => {
    for (const items of Object.values(CHALLENGES)) {
      for (const item of items) {
        assert.equal(item.choices.length, 5, item.id);
        assert.equal(new Set(item.choices).size, 5, `${item.id} has duplicate choices`);
        assert.equal(item.choices[item.correct], expected[item.id], item.id);
        if (item.figure?.kind === 'bars' && item.choices[0] === 'A') {
          // "Which bar..." puzzles: recompute the winning bar from the picture itself.
          const values = item.figure.bars.map((bar) => bar.n / bar.d);
          const pick = item.prompt.includes('more than half') ? values.findIndex((x) => x > 0.5) : values.indexOf(Math.max(...values));
          assert.equal(item.correct, pick, `${item.id} picture`);
          if (item.prompt.includes('more than half')) assert.equal(values.filter((x) => x > 0.5).length, 1, `${item.id} has exactly one answer`);
        }
      }
    }
  });
});

describe('long problems', () => {
  it('splits a story into lines without breaking decimals or fractions', () => {
    assert.deepEqual(splitStory('A ribbon is 9/10 m long. You cut off 4/10 m. Then you cut off 3/10 m. How much is left?'),
      { lines: ['A ribbon is 9/10 m long.', 'You cut off 4/10 m.', 'Then you cut off 3/10 m.'], question: 'How much is left?' });
    assert.deepEqual(splitStory('Which is bigger, 0.4 or 0.35?'), { lines: [], question: 'Which is bigger, 0.4 or 0.35?' });
    assert.equal(splitStory('3/5 = 12/?. What is the missing number?').lines.length, 0);
  });
  it('gives every walk-through step three different choices and a valid answer', () => {
    const steps: Record<string, string[]> = {
      'u1-c3': ['2', '4', '1/4'], 'u1-c5': ['4', '12'], 'u2-c3': [String(18 / 3), '1/3', String(18 / 3)], 'u2-c4': ['3', String(3 * 8)],
      'u2-c5': [String(24 / 2), String(12 / 3), String(12 - 4)], 'u4-c5': ['6/8 m', '9/8 m', 'Yes'], 'u5-c4': ['1/4', '1/6', '1/6'],
      'u6-c4': ['1/4', '2'], 'u7-c5': [`${3 * 2}/3`, `${4 * 2}/3`, String(Math.floor(7 / 2))], 'u8-c4': [`${9 - 4}/10 m`, `${9 - 4 - 3}/10 m`],
    };
    for (const items of Object.values(CHALLENGES)) {
      for (const item of items) {
        if (!item.steps) continue;
        assert.deepEqual(item.steps.map((st) => st.choices[st.correct]), steps[item.id], `${item.id} steps`);
        for (const st of item.steps) assert.equal(new Set(st.choices).size, 3, `${item.id}: ${st.prompt}`);
      }
    }
    assert.equal(Object.values(CHALLENGES).flat().filter((item) => item.steps).length, Object.keys(steps).length);
  });
});

describe('question generator', () => {
  const frac = (t: string) => { const [n, d] = t.split('/').map(Number); return n / d; };
  const ids = (id: string) => getMission(id).questions.map((q) => q.id);
  /** Independently re-checks a generated question. Returns true if a math check applied. */
  const verify = (q: PracticeQuestion): boolean => {
    const right = q.choices[q.correctChoice];
    assert.equal(q.choices.length, 3, q.id);
    assert.equal(new Set(q.choices.map((c) => c.trim())).size, 3, `${q.id} has duplicate choices: ${q.choices.join(' | ')} (${q.prompt})`);
    let m = /^(\d+)\/(\d+) ([+−]) (\d+)\/(\d+) = \?$/.exec(q.prompt);
    if (m) { const v = Number(m[1]) / Number(m[2]) + (m[3] === '+' ? 1 : -1) * Number(m[4]) / Number(m[5]); assert.ok(Math.abs(frac(right) - v) < 1e-9, `${q.prompt} → ${right}`); return true; }
    m = /^What is (\d+)\/(\d+) of (\d+)\?$/.exec(q.prompt);
    if (m) { assert.equal(Number(right), (Number(m[3]) / Number(m[2])) * Number(m[1]), q.prompt); return true; }
    m = /^Is (\d+)\/(\d+) more or less than 1\/2\?$/.exec(q.prompt);
    if (m) { assert.equal(right, Number(m[1]) / Number(m[2]) > 0.5 ? 'More than 1/2' : 'Less than 1/2', q.prompt); return true; }
    m = /^Is (\d+)\/(\d+) closest to 0, 1\/2 or 1\?$/.exec(q.prompt);
    if (m) { const v = Number(m[1]) / Number(m[2]); const best = ['0', '1/2', '1'].sort((a, b) => Math.abs((a === '1/2' ? 0.5 : Number(a)) - v) - Math.abs((b === '1/2' ? 0.5 : Number(b)) - v))[0]; assert.equal(right, best, q.prompt); return true; }
    m = /^Fill the blank: (\d+)\/(\d+) = \?\/(\d+)$/.exec(q.prompt);
    if (m) { assert.equal(Number(right), (Number(m[1]) * Number(m[3])) / Number(m[2]), q.prompt); return true; }
    m = /^Fill the blank: (\d+)\/(\d+) \+ \? = 1$/.exec(q.prompt);
    if (m) { assert.ok(Math.abs(frac(right) + Number(m[1]) / Number(m[2]) - 1) < 1e-9, q.prompt); return true; }
    if (q.prompt === 'Which is closest to 1/2?') { const best = [...q.choices].sort((x, y) => Math.abs(frac(x) - 0.5) - Math.abs(frac(y) - 0.5))[0]; assert.equal(right, best, q.prompt); return true; }
    m = /^Which is (bigger|smaller), (\d+\/\d+) or (\d+\/\d+)\?$/.exec(q.prompt);
    if (m) { const [x, y] = [frac(m[2]), frac(m[3])]; assert.equal(right, (m[1] === 'bigger') === (x > y) ? m[2] : m[3], q.prompt); return true; }
    m = /^Which is the same as (\d+\/\d+)\?$/.exec(q.prompt);
    if (m) { assert.ok(Math.abs(frac(right) - frac(m[1])) < 1e-9, q.prompt); assert.ok(q.choices.filter((c) => c.includes('/') && Math.abs(frac(c) - frac(m![1])) < 1e-9).length === 1, `${q.prompt}: one equal choice`); return true; }
    m = /^Write (\d+)\/(10|100) as a decimal\.$/.exec(q.prompt);
    if (m) { assert.equal(Number(right), Number(m[1]) / Number(m[2]), q.prompt); return true; }
    m = /^What fraction is (0\.\d+)\?$/.exec(q.prompt);
    if (m) { assert.ok(Math.abs(frac(right) - Number(m[1])) < 1e-9, q.prompt); return true; }
    m = /^Each jump is 1\/(\d+)\. What is (\d+) jumps from 0\?$/.exec(q.prompt);
    if (m) { assert.equal(right, `${m[2]}/${m[1]}`, q.prompt); return true; }
    m = /^What is (\d+)\/(\d+) as wholes and a fraction\?$/.exec(q.prompt);
    if (m) { const [n, d] = [Number(m[1]), Number(m[2])]; assert.equal(right, `${Math.floor(n / d)} and ${n % d}/${d}`, q.prompt); return true; }
    m = /^Which adds up to (\d+)\/(\d+)\?$/.exec(q.prompt);
    if (m) { const sum = right.split(' + ').reduce((acc, part) => acc + frac(part), 0); assert.ok(Math.abs(sum - frac(`${m[1]}/${m[2]}`)) < 1e-9, q.prompt); return true; }
    return false;
  };

  it('keeps the 12 "Practice more" questions fixed for every lesson, with the answer spread across A, B and C', () => {
    const positions = new Set<number>();
    for (const mission of MISSIONS) {
      const bank = getExtraPractice(mission.id, ids(mission.id));
      assert.equal(bank.length, 12, mission.id);
      assert.deepEqual(getExtraPractice(mission.id, ids(mission.id)).map((q) => q.prompt), bank.map((q) => q.prompt), `${mission.id} is the same every time`);
      for (const q of bank) {
        const independentlyVerified = verify(q);
        if (mission.unit >= 9 && !independentlyVerified) {
          const source = getWorksheet(mission.id).find((problem) => problem.prompt === q.prompt);
          assert.ok(source, `${q.id} should use an authored worksheet problem`);
          assert.equal(q.choices[q.correctChoice], source.answer, `${q.id} answer should match its worksheet`);
        }
        positions.add(q.correctChoice);
        assert.ok(mission.questions.some((b) => b.id === q.reviewQuestionId), q.id);
      }
    }
    assert.deepEqual([...positions].sort(), [0, 1, 2]);
  });

  it('generates thousands of fresh questions with correct answers and no duplicate choices', () => {
    let total = 0; let checked = 0;
    for (const mission of MISSIONS) {
      assert.ok(hasGenerator(mission.id), mission.id);
      for (let seed = 1; seed <= 150; seed++) {
        const round = generateQuestions(mission.id, ids(mission.id), seed, 10);
        assert.equal(round.length, 10, `${mission.id} seed ${seed}`);
        for (const q of round) {
          total++;
          const independentlyVerified = verify(q);
          if (independentlyVerified) {
            checked++;
          } else if (mission.unit >= 9) {
            const source = getWorksheet(mission.id).find((problem) => problem.prompt === q.prompt);
            assert.ok(source, `${q.id} should use an authored worksheet problem`);
            assert.equal(q.choices[q.correctChoice], source.answer, `${q.id} answer should match its worksheet`);
            checked++;
          }
        }
      }
    }
    assert.ok(total >= 40000, `generated ${total}`);
    assert.ok(checked / total > 0.7, `independently checked ${checked} of ${total}`);
  });

  it('gives different questions for different seeds', () => {
    const a = generateQuestions('add-like-denominators', ids('add-like-denominators'), 11, 10).map((q) => q.prompt).join();
    const b = generateQuestions('add-like-denominators', ids('add-like-denominators'), 12, 10).map((q) => q.prompt).join();
    assert.notEqual(a, b);
  });
});
