import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHALLENGES, challengeMaxPoints } from './challenges';
import { splitStory } from './fun-ui';
import { generateQuestions, getExtraPractice, hasGenerator } from './practice-bank';
import type { PracticeQuestion } from './game';
import { answerMatches, getBuildChecks, getReasonFeedback, getReviewCheck, getWorksheet, parseAnswer } from './learning-content';
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
    const expected = ['1/4', '6/10', '>', '1/6, 1/2, 4/5', '2/8', '3', '1 2/3', '16', '2/3', '1/6', '4', '4', '8', '2/2', '1/4', '3/4', '3/8', '4/8', '2/6', '2/4', '25%', '80/100', '8/10', '1/5'];
    MISSIONS.slice(27).forEach((mission, index) => {
      const question = mission.questions[0];
      assert.equal(question.choices[question.correctChoice], expected[index], mission.id);
      assert.equal(new Set(question.choices).size, question.choices.length, `${mission.id} has duplicate answer choices`);
    });
  });
  it('checks the first worksheet answer for every added mission independently', () => {
    const expected = ['1/4', '2/8', '<', '1/5, 1/4, 2/6', '1/4', '1 2/4', '1', '2', '2/4', '1/8', '2', '4', '2', '2/4', '1/4', '1/4', '1/4', '1/4', '2/8', '2/4', '25', '25/100', '0.3', '2/4'];
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
    assert.match(markup, /A whole is the complete shape or amount/);
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
  };

  it('has a picture puzzle plus five questions worth 3, 3, 3, 4, 4 and 5 points in every unit', () => {
    for (let unit = 1; unit <= 8; unit++) {
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
          const source = getWorksheet(mission.id).find((problem) => problem.prompt === question.prompt);
          assert.ok(source, `${question.id} should use an authored worksheet problem`);
          assert.equal(question.choices[question.correctChoice], source.answer, `${question.id} answer should match its worksheet`);
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
            const source = getWorksheet(mission.id).find((problem) => problem.prompt === question.prompt);
            assert.ok(source, `${question.id} should use an authored worksheet problem`);
            assert.equal(question.choices[question.correctChoice], source.answer, `${question.id} answer should match its worksheet`);
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
