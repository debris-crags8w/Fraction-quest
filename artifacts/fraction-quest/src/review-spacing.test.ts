import assert from 'node:assert/strict';
import test from 'node:test';
import {
  completeMission, EMPTY_PROGRESS, finishLessonReview, getDelayedReviewQuestions, loadProgress, MISSIONS, recordMissedSkill, saveProgress,
  type DailyPracticeAttempt, type Progress,
} from './game';
import { applyAdaptiveDailyPracticeUpdate, createDailyPractice, dailyPracticeDay, recordDailyPracticeStart } from './daily-practice';
import { checkWorksheet, editWorksheet, emptyLearningRecord, resetUnitLearningProgress, updateLearning } from './learning';
import { getBuildChecks, getWorksheet } from './learning-content';

/* A child who answers every question right, finishes one lesson a day and does Daily Practice (5 questions) every day.
   Which lessons does the app bring back, and how long does a finished lesson wait before it does? */

const DAY = 24 * 60 * 60 * 1000;
const START = new Date(2026, 10, 2, 12, 0, 0).getTime();

/** A lesson with all its builds and its worksheet done, so completeMission accepts it. */
function withLearning(progress: Progress, id: string, completedAt: number): Progress {
  let record = { ...emptyLearningRecord(), practiceDone: true, completedAt };
  for (const check of getBuildChecks(id)) record.checks[check.id] = { passed: true, supported: false, attempts: 1 };
  for (const problem of getWorksheet(id)) record = checkWorksheet(editWorksheet(record, problem.id, problem.answer), problem);
  return updateLearning(progress, id, record);
}

const attempt = (): DailyPracticeAttempt => ({ shaded: [], draft: '', modelChecked: true, modelCorrect: true, answerChecked: true, answerCorrect: true, parts: 2, choice: 0 });

/** What the app does when a due review inside a lesson is answered right first time. */
const answerLessonReview = finishLessonReview;

/** Runs the child's days. `lessonsPerDay` lessons are finished each day until `lessons` are done, then only Daily Practice. */
function simulate({ lessons, lessonsPerDay = 1, days, dailyPractice = true }: { lessons: number; lessonsPerDay?: number; days: number; dailyPractice?: boolean }) {
  let progress: Progress = { ...EMPTY_PROGRESS, learning: {} };
  const touches = new Map<string, number[]>();
  const touch = (id: string, day: number) => touches.set(id, [...(touches.get(id) ?? []), day]);
  let next = 0;
  let lessonsWithReview = 0;
  let lessonsAfterFirst = 0;
  for (let day = 0; day < days; day++) {
    const now = START + day * DAY;
    for (let k = 0; k < lessonsPerDay && next < lessons; k++, next++) {
      const mission = MISSIONS[next];
      const reviews = getDelayedReviewQuestions(progress, mission.id, now);
      if (next > 0) { lessonsAfterFirst++; if (reviews.length) lessonsWithReview++; }
      for (const review of reviews) { progress = answerLessonReview(progress, review.reviewMissionId!, now); touch(review.reviewMissionId!, day); }
      progress = completeMission(withLearning(progress, mission.id, now), mission.id, 3);
      touch(mission.id, day);
    }
    if (!dailyPractice || !progress.completedMissionIds.length) continue;
    const at = now + 3 * 60 * 60 * 1000;
    const saved = progress.dailyPractice;
    const session = saved?.day === dailyPracticeDay(at) ? saved : createDailyPractice(progress, at);
    progress = recordDailyPracticeStart(progress, session, at);
    for (let guard = 0; guard < 20; guard++) {
      const current = progress.dailyPractice!;
      const question = current.questions.find((item) => !current.attempts[item.id]?.answerChecked);
      if (!question) break;
      const attempts = { ...current.attempts, [question.id]: attempt() };
      progress = applyAdaptiveDailyPracticeUpdate(progress, { ...current, attempts, index: Math.min(current.questions.length - 1, current.index + 1) }, at);
      touch(question.missionId, day);
    }
  }
  const last = days - 1;
  const waits = MISSIONS.slice(0, Math.min(lessons, next)).map((mission) => {
    const seen = [...new Set(touches.get(mission.id) ?? [])].sort((a, b) => a - b);
    let longest = 0;
    for (let i = 1; i < seen.length; i++) longest = Math.max(longest, seen[i] - seen[i - 1]);
    return { id: mission.id, longest: Math.max(longest, last - seen[seen.length - 1]), visits: seen.length - 1 };
  });
  return { progress, waits, maxWait: Math.max(...waits.map((w) => w.longest)), worst: waits.reduce((a, b) => (b.longest > a.longest ? b : a)), lessonsWithReview, lessonsAfterFirst };
}

test('a child who answers everything right meets an earlier lesson in each new lesson (current behaviour, for the record)', () => {
  const run = simulate({ lessons: 20, days: 20, dailyPractice: false });
  assert.equal(run.lessonsWithReview, run.lessonsAfterFirst, 'every lesson after the first carries an earlier-lesson item');
});

test('no finished lesson waits more than about two weeks to be revisited (60 lessons over 60 days, then 30 days of Daily Practice)', () => {
  const run = simulate({ lessons: 60, days: 90 });
  assert.ok(run.maxWait <= 14, `longest wait ${run.maxWait} days (${run.worst.id}); every wait: ${run.waits.map((w) => w.longest).sort((a, b) => b - a).slice(0, 10).join(', ')}`);
});

test('the same holds while the child is still finishing lessons (no lesson waits more than 14 days in the first 60 days)', () => {
  const run = simulate({ lessons: 60, days: 60 });
  assert.ok(run.maxWait <= 14, `longest wait ${run.maxWait} days (${run.worst.id})`);
});

/** Lesson `index` finished at `at`, with everything it needs for the app to accept it. */
const finished = (progress: Progress, index: number, at: number) => completeMission(withLearning(progress, MISSIONS[index].id, at), MISSIONS[index].id, 3);

test('a lesson finished yesterday with no mistakes comes back as ONE item in the next lesson; the same day it does not', () => {
  const yesterday = finished({ ...EMPTY_PROGRESS, learning: {} }, 0, START);
  const today = getDelayedReviewQuestions(yesterday, MISSIONS[1].id, START + DAY);
  assert.equal(today.length, 1, 'one earlier-lesson item');
  assert.equal(today[0].reviewMissionId, MISSIONS[0].id);
  assert.ok(today[0].isReview && today[0].isOptionalReview && today[0].model && today[0].simplerModel);
  assert.equal(getDelayedReviewQuestions(yesterday, MISSIONS[1].id, START + 60_000).length, 0, 'no review within the same day');
  // Answered right first time: the lesson moves up one interval and its next item is a different question.
  const answered = finishLessonReview(yesterday, MISSIONS[0].id, START + DAY);
  assert.deepEqual([answered.lessonSeen?.[MISSIONS[0].id]?.n, answered.lessonSeen?.[MISSIONS[0].id]?.v], [1, 1]);
  const later = getDelayedReviewQuestions(answered, MISSIONS[2].id, START + 5 * DAY);
  assert.equal(later[0].reviewMissionId, MISSIONS[0].id);
  assert.notEqual(later[0].id, today[0].id, 'a different question of the lesson');
});

test('a skill the child got wrong still comes first, then one item chosen by the overdue rule (its 1, 3, 7 day stages are untouched)', () => {
  let progress = finished(finished({ ...EMPTY_PROGRESS, learning: {} }, 0, START), 1, START);
  progress = recordMissedSkill(progress, MISSIONS[1].id, MISSIONS[1].questions[0].id, START);
  const reviews = getDelayedReviewQuestions(progress, MISSIONS[2].id, START + 2 * DAY);
  assert.deepEqual(reviews.map((question) => question.reviewMissionId), [MISSIONS[1].id, MISSIONS[0].id]);
  assert.equal(progress.reviewQueue.find((item) => item.missionId === MISSIONS[1].id)?.missed, true);
  assert.equal(progress.reviewQueue.find((item) => item.missionId === MISSIONS[0].id)?.missed, undefined, 'a finished lesson is not a missed skill');
});

test('what was revisited is saved, survives a reload, and a unit reset forgets it', () => {
  let progress = finished({ ...EMPTY_PROGRESS, learning: {} }, 0, START);
  progress = finishLessonReview(progress, MISSIONS[0].id, START + DAY);
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: { localStorage: {
    getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key) } } });
  try {
    saveProgress(progress);
    assert.deepEqual(loadProgress().lessonSeen, progress.lessonSeen);
  } finally { delete (globalThis as { window?: unknown }).window; }
  const reset = resetUnitLearningProgress(progress, new Set([MISSIONS[0].id]), MISSIONS[0].unit);
  assert.equal(Object.keys(reset.lessonSeen ?? {}).length, 0);
});

test('Daily Practice builds a bar or number line only in lessons about building one; every other lesson is asked its own questions, tagged with its own standards', () => {
  // All 81 lessons finished, with no worksheet record (so every lesson is at grade level).
  const progress: Progress = { ...EMPTY_PROGRESS, completedMissionIds: MISSIONS.map((m) => m.id),
    learning: Object.fromEntries(MISSIONS.map((m, i) => [m.id, { ...emptyLearningRecord(), completedAt: START + i * DAY }])) };
  let builds = 0; let items = 0;
  for (let day = 0; day < 40; day++) {
    const session = createDailyPractice(progress, START + (90 + day) * DAY);
    for (const question of session.questions) {
      items++;
      const mission = MISSIONS.find((item) => item.id === question.missionId)!;
      if (question.kind === 'build') {
        builds++;
        assert.ok(mission.standards?.some((standard) => standard === '3.NF.1' || standard === '3.NF.2a'), `${mission.id}: a generic build in a lesson about something else`);
      } else {
        assert.equal(question.kind, 'choice');
        assert.deepEqual(question.standards, mission.standards, `${mission.id}: the standard tag is the lesson's own`);
      }
    }
  }
  assert.ok(items >= 200 && builds < items, 'some items are asked, and not all of them are builds');
});
