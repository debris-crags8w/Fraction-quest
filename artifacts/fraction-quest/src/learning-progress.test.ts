import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EMPTY_PROGRESS } from './game';
import { getBuildChecks, getWorksheet } from './learning-content';
import {
  checkLessonWorksheet,
  checkWorksheet,
  hasLearningGate,
  editWorksheet,
  emptyLearningRecord,
  worksheetProblemProgress,
  type LearningRecord,
} from './learning';

describe('worksheet problem progress', () => {
  const problems = getWorksheet('equal-parts');

  it('shows the first unfinished problem as current and the rest as upcoming', () => {
    const progress = worksheetProblemProgress(emptyLearningRecord(), problems);

    assert.equal(progress.length, 12);
    assert.deepEqual(progress.map(problem => problem.status), [
      'current',
      ...Array.from({ length: 11 }, () => 'upcoming' as const),
    ]);
    assert.ok(progress.every(problem => problem.required), 'every lesson worksheet question is required');
    assert.equal(progress[0].current, true);
  });

  it('marks incorrect attempts for retry without counting them complete', () => {
    const attempted = checkWorksheet(
      editWorksheet(emptyLearningRecord(), problems[2].id, 'not the answer'),
      problems[2],
    );
    const progress = worksheetProblemProgress(attempted, problems);

    assert.equal(progress[0].status, 'current');
    assert.equal(progress[0].current, true);
    assert.equal(progress[2].status, 'retry');
    assert.equal(progress[2].current, false);
    assert.equal(progress.filter(problem => problem.status === 'complete').length, 0);
  });

  it('advances the current marker after a correct check and keeps later errors visible', () => {
    let record = checkWorksheet(
      editWorksheet(emptyLearningRecord(), problems[0].id, String(problems[0].answer)),
      problems[0],
    );
    record = checkWorksheet(editWorksheet(record, problems[2].id, 'not the answer'), problems[2]);
    const progress = worksheetProblemProgress(record, problems);

    assert.equal(progress[0].status, 'complete');
    assert.equal(progress[0].current, false);
    assert.equal(progress[1].status, 'current');
    assert.equal(progress[1].current, true);
    assert.equal(progress[2].status, 'retry');
  });

  it('restores the same statuses from a saved worksheet record', () => {
    let record = checkWorksheet(
      editWorksheet(emptyLearningRecord(), problems[0].id, String(problems[0].answer)),
      problems[0],
    );
    record = checkWorksheet(editWorksheet(record, problems[1].id, 'not the answer'), problems[1]);
    const restored = JSON.parse(JSON.stringify(record)) as LearningRecord;

    assert.deepEqual(
      worksheetProblemProgress(restored, problems),
      worksheetProblemProgress(record, problems),
    );
  });

  it('shows all questions complete only after every answer is checked correctly', () => {
    let record = emptyLearningRecord();
    for (const problem of problems) {
      record = checkWorksheet(
        editWorksheet(record, problem.id, String(problem.answer)),
        problem,
      );
    }

    const progress = worksheetProblemProgress(record, problems);
    assert.ok(progress.every(problem => problem.status === 'complete'));
    assert.ok(progress.every(problem => !problem.current));
  });
});

describe('the lesson worksheet is handed in whole', () => {
  const lessonId = 'fraction-names';
  const withBuilds = (): LearningRecord => ({ ...emptyLearningRecord(), practiceDone: true,
    checks: Object.fromEntries(getBuildChecks(lessonId).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])) });
  const answerAll = (record: LearningRecord, skip?: number) => getWorksheet(lessonId).reduce((next, problem, index) =>
    index === skip ? next : checkLessonWorksheet(editWorksheet(next, problem.id, problem.answer), problem, lessonId), record);

  it('cannot finish while any worksheet question is unanswered', () => {
    for (const skip of [0, 5, 11]) {
      const record = answerAll(withBuilds(), skip);
      assert.equal(hasLearningGate({ ...EMPTY_PROGRESS, learning: { [lessonId]: record } }, lessonId), false, `question ${skip + 1} missing`);
    }
    assert.equal(hasLearningGate({ ...EMPTY_PROGRESS, learning: { [lessonId]: answerAll(withBuilds()) } }, lessonId), true);
  });

  it('keeps a finished lesson finished even if reteach practice is offered later', () => {
    const required = getWorksheet(lessonId)[3];
    let record: LearningRecord = { ...answerAll(withBuilds()), completedAt: 1 };
    // Two later misses on a worksheet question, then right again.
    for (let i = 0; i < 2; i++) record = checkWorksheet(editWorksheet(record, required.id, '99/100'), required);
    record = checkWorksheet(editWorksheet(record, required.id, required.answer), required);
    const progress = { ...EMPTY_PROGRESS, completedMissionIds: [lessonId], learning: { [lessonId]: record } };
    assert.equal(hasLearningGate(progress, lessonId), true);
    assert.equal(hasLearningGate({ ...progress, completedMissionIds: [] }, lessonId), false, 'an unfinished lesson still needs its reteach');
  });
});
