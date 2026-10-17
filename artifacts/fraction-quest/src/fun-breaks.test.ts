import assert from 'node:assert/strict';
import test from 'node:test';
import { setBreakPreferences, setDisplayPreferences, type FunState } from './lib/fun';

test('break settings update preferences without changing rewards or activity', () => {
  const state: FunState = {
    xp: 80,
    day: '2026-10-11',
    answeredToday: 8,
    dayStreak: 3,
    lastActiveDay: '2026-10-11',
    sound: true,
    activity: { '2026-10-11': { minutes: 12, answered: 8 } },
  };
  const updated = setBreakPreferences(state, { intervalMinutes: 10, quietMode: true });
  assert.deepEqual(updated.breakPreferences, { intervalMinutes: 10, quietMode: true });
  assert.equal(updated.xp, state.xp);
  assert.equal(updated.answeredToday, state.answeredToday);
  assert.equal(updated.dayStreak, state.dayStreak);
  assert.deepEqual(updated.activity, state.activity);
  assert.equal(state.breakPreferences, undefined);
});

test('reading preferences are stored without changing learner rewards', () => {
  const state: FunState = {
    xp: 80,
    day: '2026-10-11',
    answeredToday: 8,
    dayStreak: 3,
    lastActiveDay: '2026-10-11',
    sound: true,
    activity: { '2026-10-11': { minutes: 12, answered: 8 } },
  };
  const updated = setDisplayPreferences(state, { textSize: 'large', highContrast: true, reducedMotion: true });
  assert.deepEqual(updated.displayPreferences, { textSize: 'large', highContrast: true, reducedMotion: true, storyMode: true });
  assert.equal(updated.xp, state.xp);
  assert.equal(updated.answeredToday, state.answeredToday);
  assert.equal(updated.dayStreak, state.dayStreak);
});
