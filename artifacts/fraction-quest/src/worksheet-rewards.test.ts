import assert from 'node:assert/strict';
import test from 'node:test';
import { recordWorksheetCorrect, resetMissionGameProgress, replaceFun, today, type FunState } from './lib/fun';

const learner = (): FunState => ({
  xp: 0,
  day: today(),
  answeredToday: 0,
  dayStreak: 0,
  lastActiveDay: null,
  sound: true,
  worksheetRewards: {},
});

test('awards worksheet XP and daily activity once per distinct question', () => {
  const first = recordWorksheetCorrect(learner(), 'equal-parts', 'w1');
  assert.equal(first.xp, 10);
  assert.equal(first.answeredToday, 1);
  assert.deepEqual(first.worksheetRewards?.['equal-parts'], ['w1']);

  const retry = recordWorksheetCorrect(first, 'equal-parts', 'w1');
  assert.equal(retry, first, 'retrying a saved question does not issue another reward');
  const optional = recordWorksheetCorrect(retry, 'equal-parts', 'w2');
  assert.equal(optional.xp, 20);
  assert.equal(optional.answeredToday, 2);
  assert.deepEqual(optional.worksheetRewards?.['equal-parts'], ['w1', 'w2']);
});

test('keeps reward history through account replacement and unit-specific progress resets', () => {
  const rewarded = recordWorksheetCorrect(learner(), 'equal-parts', 'w1');
  const accountReload = replaceFun(rewarded);
  assert.deepEqual(accountReload.worksheetRewards?.['equal-parts'], ['w1']);
  assert.equal(recordWorksheetCorrect(accountReload, 'equal-parts', 'w1').xp, 10);

  const resetUnit = resetMissionGameProgress(accountReload, new Set(['equal-parts']));
  assert.deepEqual(resetUnit.worksheetRewards?.['equal-parts'], ['w1']);
  assert.equal(recordWorksheetCorrect(resetUnit, 'equal-parts', 'w1').xp, 10);
});

test('drops malformed or oversized saved reward identifiers', () => {
  const restored = replaceFun({
    ...learner(),
    worksheetRewards: {
      'equal-parts': ['w1', 'invalid id', 4, 'w1'],
      'bad id': ['w2'],
    } as unknown as Record<string, string[]>,
  });
  assert.deepEqual(restored.worksheetRewards, { 'equal-parts': ['w1'] });
});
