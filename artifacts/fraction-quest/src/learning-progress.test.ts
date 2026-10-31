import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { EMPTY_PROGRESS, MISSIONS, type Progress } from './game';
import { CHAPTERS } from './story';
import { getBuildChecks, getWorksheet } from './learning-content';
import {
  checkLessonWorksheet,
  checkWorksheet,
  hasLearningGate,
  editWorksheet,
  emptyLearningRecord,
  worksheetCount,
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

/* Rescore 5: #322 changed the percent-to-fraction worksheet answers, and children who had finished every lesson
   saw ch 14 lose its piece (and the finale lock). A finished lesson must stay finished whatever its content becomes. */
describe('finished lessons survive content changes', () => {
  const finishedRecord = (id: string): LearningRecord => {
    let record: LearningRecord = { ...emptyLearningRecord(), practiceDone: true };
    for (const check of getBuildChecks(id)) record.checks[check.id] = { passed: true, supported: false, attempts: 1 };
    for (const problem of getWorksheet(id)) record = checkLessonWorksheet(editWorksheet(record, problem.id, problem.answer), problem, id);
    return { ...record, completedAt: 1_700_000_000_000 };
  };
  const allFinished = () => ({ ...EMPTY_PROGRESS, reviewQueue: [], completedMissionIds: MISSIONS.map((m) => m.id),
    starsByMission: Object.fromEntries(MISSIONS.map((m) => [m.id, 3])),
    learning: Object.fromEntries(MISSIONS.map((m) => [m.id, finishedRecord(m.id)])) });
  const piece = (progress: Progress, unit: number) => MISSIONS.filter((m) => m.unit === unit).every((m) => hasLearningGate(progress, m.id));
  const finale = (progress: Progress) => CHAPTERS.every((c) => piece(progress, c.unit));
  /** Saved answers as the old worksheet had them: right then, wrong for today's questions. */
  const withSavedAnswers = (record: LearningRecord, drafts: Record<string, string>): LearningRecord => ({ ...record,
    worksheet: Object.fromEntries(Object.entries(record.worksheet).map(([rowId, entry]) => [rowId,
      drafts[rowId] === undefined ? entry : { ...entry, draft: drafts[rowId], checkedValue: drafts[rowId], for: drafts[rowId] }])) });

  it('keeps the lesson, its chapter piece and the finale when a finished lesson\'s worksheet answers change', () => {
    const id = 'percent-to-fraction';
    const unit = MISSIONS.find((m) => m.id === id)!.unit;
    const done = allFinished();
    assert.equal(hasLearningGate(done, id), true);
    // The answers saved before #322 (w1 was 50/100, now 15/100), as a real saved progress file had them.
    const old = ['50/100', '25/100', '75/100', '20/100', '40/100', '30/100', '70/100', '60/100', '80/100', '10/100', '90/100', '5/100'];
    const drafts = Object.fromEntries(getWorksheet(id).map((p, i) => [p.id, old[i]]));
    const saved = { ...done, learning: { ...done.learning, [id]: withSavedAnswers(done.learning[id], drafts) } };
    assert.equal(worksheetCount(saved.learning[id], id), 0, 'no saved answer matches the changed worksheet');
    assert.equal(hasLearningGate(saved, id), true, 'the finished lesson stays finished');
    assert.equal(piece(saved, unit), true, `chapter ${unit} keeps its piece`);
    assert.equal(finale(saved), true, 'the finale stays open');
    // A lesson that was never finished still needs today's answers.
    const unfinished = { ...saved, completedMissionIds: saved.completedMissionIds.filter((m) => m !== id) };
    assert.equal(hasLearningGate(unfinished, id), false);
  });

  it('a fully finished progress keeps every lesson, piece and the finale with every worksheet answer perturbed', () => {
    const done = allFinished();
    for (const m of MISSIONS) assert.equal(hasLearningGate(done, m.id), true, `${m.id} passes with today's content`);
    const perturbed = { ...done, learning: Object.fromEntries(MISSIONS.map((m) => {
      const drafts = Object.fromEntries(getWorksheet(m.id).map((p) => [p.id, `${p.answer}9`]));
      return [m.id, withSavedAnswers(done.learning[m.id], drafts)];
    })) };
    for (const m of MISSIONS) {
      assert.equal(worksheetCount(perturbed.learning[m.id], m.id), 0, `${m.id}: every saved answer is now off`);
      assert.equal(hasLearningGate(perturbed, m.id), true, `${m.id} re-locked after a worksheet change`);
    }
    for (const c of CHAPTERS) assert.equal(piece(perturbed, c.unit), true, `chapter ${c.unit} lost its piece`);
    assert.equal(finale(perturbed), true);
  });
});
