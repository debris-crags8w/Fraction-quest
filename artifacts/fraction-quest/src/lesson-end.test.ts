import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_PROGRESS, getNextMission, isMissionUnlocked, MISSIONS, type Progress } from './game';
import { emptyLearningRecord } from './learning';
import { LESSON_END_NOTE, lessonEnd } from './lesson-end';

/** The course finished up to and including lesson `count` (as the app saves it once a lesson is passed). */
function passed(count: number): Progress {
  const ids = MISSIONS.slice(0, count).map((mission) => mission.id);
  return {
    ...EMPTY_PROGRESS,
    completedMissionIds: ids,
    learning: Object.fromEntries(ids.map((id) => [id, { ...emptyLearningRecord(), practiceDone: true, completedAt: 1 }])),
  };
}

test('the last lesson of the course never says a next lesson is open', () => {
  const last = MISSIONS.at(-1)!;
  const progress = passed(MISSIONS.length);
  assert.equal(getNextMission(progress), null, 'there is nothing left to open');
  const end = lessonEnd(progress, last.id);
  assert.equal(end, 'course-done');
  assert.doesNotMatch(LESSON_END_NOTE[end], /next lesson/i);
  assert.match(LESSON_END_NOTE[end], /finished the whole course/);
});

test('with the last lesson passed but earlier lessons still waiting, it says so and the Next lesson button has somewhere to go', () => {
  const last = MISSIONS.at(-1)!;
  const progress = { ...passed(MISSIONS.length - 1) };
  const early = MISSIONS[4];
  progress.completedMissionIds = [...progress.completedMissionIds.filter((id) => id !== early.id), last.id];
  progress.learning = { ...progress.learning, [last.id]: { ...emptyLearningRecord(), practiceDone: true, completedAt: 1 } };
  delete progress.learning![early.id];
  // Lesson 5 is open but not done; the last lesson was passed (as after a placement or a lesson added later).
  assert.ok(getNextMission(progress), 'a lesson is still waiting');
  assert.equal(lessonEnd(progress, last.id), 'more-waiting');
  assert.doesNotMatch(LESSON_END_NOTE['more-waiting'], /next lesson is open/i);
});

test('every lesson of the course, passed in order: the note is true, and an open next lesson is really open', () => {
  for (let index = 0; index < MISSIONS.length; index++) {
    const progress = passed(index + 1);
    const mission = MISSIONS[index];
    const following = MISSIONS[index + 1];
    const end = lessonEnd(progress, mission.id);
    if (!following) { assert.equal(end, 'course-done', 'the last lesson'); continue; }
    assert.equal(end, 'next-open', `${mission.id}: the lesson after it is open`);
    assert.ok(isMissionUnlocked(progress, following.id), `${mission.id} -> ${following.id}`);
    assert.equal(getNextMission(progress)?.id, following.id, `${mission.id}: the Next lesson button goes to the next lesson`);
  }
});

test('the last lesson of a unit from 9 on, with other lessons of the unit undone, says the next unit is closed', () => {
  for (let unit = 9; unit < Math.max(...MISSIONS.map((m) => m.unit)); unit++) {
    const inUnit = MISSIONS.filter((m) => m.unit === unit);
    if (inUnit.length < 2) continue;
    const lastOfUnit = inUnit.at(-1)!;
    const before = MISSIONS.filter((m) => m.unit < unit).map((m) => m.id);
    const ids = [...before, lastOfUnit.id];
    const progress: Progress = {
      ...EMPTY_PROGRESS, completedMissionIds: ids,
      learning: Object.fromEntries(ids.map((id) => [id, { ...emptyLearningRecord(), practiceDone: true, completedAt: 1 }])),
    };
    assert.equal(lessonEnd(progress, lastOfUnit.id), 'unit-closed', `unit ${unit}`);
    assert.equal(getNextMission(progress)?.unit, unit, `unit ${unit}: the button leads to a lesson in the same unit`);
  }
});

test('when the lessons after the first need the app, the first lesson does not claim the next one is open', () => {
  const progress = passed(1);
  const end = lessonEnd(progress, MISSIONS[0].id, true);
  assert.equal(end, 'needs-grown-up');
  assert.doesNotMatch(LESSON_END_NOTE[end], /is open/);
});

test('the notes are short and kind', () => {
  for (const note of Object.values(LESSON_END_NOTE)) assert.ok(note.split(/\s+/).length <= 16, note);
});
