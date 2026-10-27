import assert from 'node:assert/strict';
import test from 'node:test';
import { replaceFun } from './lib/fun';

test('a saved "lessons started" list from an older version is dropped, and the rest of the saved data still loads', () => {
  const old = { xp: 120, dayStreak: 4, fractionWordsSeen: true as const, lessonIntrosSeen: ['equal-parts', 'fraction-names'] };
  const loaded = replaceFun(old as never);
  assert.equal(loaded.xp, 120);
  assert.equal(loaded.dayStreak, 4);
  assert.equal(loaded.fractionWordsSeen, true);
  assert.equal('lessonIntrosSeen' in loaded, false, 'nothing reads it any more, so it is not kept or synced');
});
