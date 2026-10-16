import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getWorksheet } from './learning-content';
import {
  checkWorksheet,
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
    assert.deepEqual(progress.map(problem => problem.required), [true, ...Array.from({ length: 11 }, () => false)]);
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
