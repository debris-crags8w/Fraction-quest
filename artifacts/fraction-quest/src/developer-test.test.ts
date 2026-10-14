import assert from 'node:assert/strict';
import test from 'node:test';
import { EMPTY_PROGRESS, isMissionUnlocked, MISSIONS } from './game';
import { createDeveloperLessonProgress } from './developer-test';
import { hasLearningGate } from './learning';

test('developer lesson preview opens a later lesson without changing saved progress', () => {
  const saved = {
    ...EMPTY_PROGRESS,
    completedMissionIds: ['equal-parts'],
    starsByMission: { 'equal-parts': 2 },
  };
  const target = MISSIONS.at(-1)!;

  const preview = createDeveloperLessonProgress(saved, target.id, 1234);

  assert.ok(preview);
  assert.equal(isMissionUnlocked(saved, target.id), false, 'the saved learner remains behind the unit gates');
  assert.equal(isMissionUnlocked(preview, target.id), true, 'the test snapshot satisfies earlier prerequisites');
  assert.equal(hasLearningGate(preview, target.id), false, 'the selected lesson itself starts unfinished');
  assert.deepEqual(saved, {
    ...EMPTY_PROGRESS,
    completedMissionIds: ['equal-parts'],
    starsByMission: { 'equal-parts': 2 },
  }, 'the original progress snapshot is unchanged');
  assert.equal(createDeveloperLessonProgress(saved, 'not-a-lesson'), null);
});
