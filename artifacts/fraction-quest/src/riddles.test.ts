import assert from 'node:assert/strict';
import test from 'node:test';
import { SECRETS, dailySecret, lanternWeek, riddleSetup } from './riddles';

test('Chomp’s set-up lines use words only, and the last question always gets the last riddle line', () => {
  for (let index = 0; index < 5; index++) assert.doesNotMatch(riddleSetup(index, 5), /\d/);
  assert.match(riddleSetup(4, 5), /Last riddle/);
  assert.match(riddleSetup(2, 3), /Last riddle/);
  assert.match(riddleSetup(0, 5), /Riddle one/);
  assert.doesNotMatch(riddleSetup(3, 5), /Last riddle/);
});

test('one secret all day, a different one on other days', () => {
  assert.equal(dailySecret('2026-10-17'), dailySecret('2026-10-17'));
  const week = new Set(['2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21'].map(dailySecret));
  assert.ok(week.size >= 3);
  for (const secret of SECRETS) assert.ok(secret.length <= 90, secret);
});

test('Hoot’s lantern shows the last 7 nights, ending tonight, lit on days with a right answer', () => {
  const now = new Date(2026, 9, 17, 10);
  const nights = lanternWeek({ '2026-10-17': { minutes: 3, answered: 2 }, '2026-10-15': { minutes: 5, answered: 0 }, '2026-10-12': { minutes: 4, answered: 1 } }, now);
  assert.equal(nights.length, 7);
  assert.deepEqual(nights.map((night) => night.day), ['2026-10-11', '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17']);
  assert.deepEqual(nights.map((night) => night.lit), [false, true, false, false, false, false, true]);
  assert.equal(nights[6].label, 'Today');
  assert.equal(nights[0].label, 'Sun');
  assert.equal(nights.filter((night) => night.today).length, 1);
});
