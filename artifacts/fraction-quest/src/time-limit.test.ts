import assert from 'node:assert/strict';
import test from 'node:test';
import { addMinutesToday, replaceFun, setTimeLimit, timeToday, today, type FunState } from './lib/fun';

const day = today();
const learner = (minutes: number, extra?: FunState['timeLimit']): FunState => ({
  xp: 0, day, answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: true,
  activity: { [day]: { minutes, answered: 5 } }, ...(extra ? { timeLimit: extra } : {}),
});

test('with no limit set, time is never up', () => {
  assert.equal(timeToday(learner(500)), null);
  assert.equal(timeToday(learner(500, { minutes: 0 })), null);
});

test('time is up once today’s active minutes reach the grown-up’s limit', () => {
  const state = setTimeLimit(learner(19), 20);
  assert.deepEqual(timeToday(state), { used: 19, allowed: 20, up: false });
  assert.deepEqual(timeToday({ ...state, activity: { [day]: { minutes: 20, answered: 5 } } }), { used: 20, allowed: 20, up: true });
  // Yesterday's minutes do not count today.
  assert.deepEqual(timeToday({ ...state, activity: { '2000-01-01': { minutes: 90, answered: 1 } } })?.up, false);
});

test('a grown-up can add ten minutes for today only, more than once', () => {
  const state = addMinutesToday(addMinutesToday(setTimeLimit(learner(20), 20)));
  assert.deepEqual(timeToday(state), { used: 20, allowed: 40, up: false });
  // Changing the limit keeps today's added minutes.
  assert.deepEqual(timeToday(setTimeLimit(state, 15)), { used: 20, allowed: 35, up: false });
  // Added minutes from another day are gone.
  assert.deepEqual(timeToday(learner(20, { minutes: 20, extra: { day: '2000-01-01', minutes: 30 } })), { used: 20, allowed: 20, up: true });
});

test('a limit loaded from the account keeps only the choices a grown-up can pick', () => {
  assert.deepEqual(replaceFun({ timeLimit: { minutes: 30 } }).timeLimit, { minutes: 30 });
  assert.deepEqual(replaceFun({ timeLimit: { minutes: 7 as never } }).timeLimit, { minutes: 0 });
  assert.deepEqual(replaceFun({ timeLimit: { minutes: 20, extra: { day, minutes: 1e9 } } }).timeLimit, { minutes: 20, extra: { day, minutes: 240 } });
  assert.deepEqual(replaceFun({}).timeLimit, { minutes: 0 });
});
