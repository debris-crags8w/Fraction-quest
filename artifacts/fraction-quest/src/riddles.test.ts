import assert from 'node:assert/strict';
import test from 'node:test';
import { LANTERN_CARD_SPOKEN, SECRETS, dailySecret, lanternCard, lanternWeek, riddleReaction, riddleSetup } from './riddles';

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

test('Chomp reacts to a checked riddle with words only', () => {
  for (let index = 0; index < 5; index++) for (const result of ['correct', 'retry'] as const) {
    assert.doesNotMatch(riddleReaction(result, index), /\d/);
    assert.ok(riddleReaction(result, index).length <= 40);
  }
  assert.notEqual(riddleReaction('correct', 0), riddleReaction('retry', 0));
});

test('Tonight’s lantern on the map: light it, lit, or a first lantern, in Hoot’s words or plain', () => {
  const waiting = lanternCard({ streak: 5, oil: 1, litToday: false, dailyDone: false, storyOn: true });
  assert.equal(waiting.state, 'waiting');
  assert.equal(waiting.title, 'Tonight’s lantern');
  assert.equal(waiting.button, 'Light it: Chomp’s 5 riddles');
  assert.deepEqual(waiting.facts, ['5 nights in a row', '1 spare drop of oil']);

  const first = lanternCard({ streak: 0, oil: 0, litToday: false, dailyDone: false, storyOn: true });
  assert.equal(first.state, 'first');
  assert.equal(first.title, 'Light your first lantern');
  assert.deepEqual(first.facts, []);

  // Lit by today's riddles: no button, tomorrow's riddle, and how far the next drop of oil is (7 nights earn one).
  const lit = lanternCard({ streak: 6, oil: 1, litToday: true, dailyDone: true, storyOn: true });
  assert.equal(lit.state, 'lit');
  assert.equal(lit.button, undefined);
  assert.deepEqual(lit.notes, ['Chomp has a new riddle tomorrow.', '1 more night to earn a spare drop of oil.']);
  assert.deepEqual(lanternCard({ streak: 7, oil: 0, litToday: true, dailyDone: true, storyOn: true }).notes.slice(1), ['7 more nights to earn a spare drop of oil.']);
  // A full jar: nothing more to earn, so no oil line.
  assert.deepEqual(lanternCard({ streak: 9, oil: 2, litToday: true, dailyDone: true, storyOn: true }).notes, ['Chomp has a new riddle tomorrow.']);
  // Lit by a lesson, riddles not done yet: the riddles stay one tap away.
  assert.equal(lanternCard({ streak: 3, oil: 0, litToday: true, dailyDone: false, storyOn: true }).button, 'Chomp’s 5 riddles');

  // Story mode off: plain words, days not nights, no Hoot.
  const plain = lanternCard({ streak: 5, oil: 1, litToday: false, dailyDone: false, storyOn: false });
  assert.equal(plain.title, 'Today’s practice');
  assert.equal(plain.speaker, null);
  assert.equal(plain.button, 'Start: 5 review questions');
  assert.deepEqual(plain.facts, ['5 days in a row']);
});

test('Listen on Tonight’s lantern reads only fixed lines, so every one can come from the voice pack', () => {
  for (const storyOn of [true, false]) for (const litToday of [true, false]) for (const dailyDone of [true, false])
    for (let streak = 0; streak <= 30; streak++) for (let oil = 0; oil <= 2; oil++) {
      const card = lanternCard({ streak, oil, litToday, dailyDone, storyOn });
      assert.ok(LANTERN_CARD_SPOKEN.includes(card.spoken), card.spoken);
    }
  assert.ok(LANTERN_CARD_SPOKEN.length < 80);
});

test('a Keeper hears how last week\'s mystery ended only after seeing it, and only on the first visit of the new week', async () => {
  const { mysteryRecap, noteMystery, mysteryAnswer } = await import('./riddles');
  const monday = '2026-11-02'; const tuesday = '2026-11-03'; const lastThursday = '2026-10-29';
  assert.equal(mysteryRecap({}, monday), null, 'a brand-new Keeper never saw last week\'s mystery');
  const sawIt = noteMystery({}, lastThursday, false);
  assert.equal(mysteryRecap(sawIt, monday), mysteryAnswer(monday), 'seen last week: the answer comes on Monday');
  const heardMonday = noteMystery(sawIt, monday, true);
  assert.equal(mysteryRecap(heardMonday, monday), mysteryAnswer(monday), 'the same day, it is still there');
  assert.equal(mysteryRecap(heardMonday, tuesday), null, 'once heard, it is not repeated all week');
  assert.equal(mysteryRecap(sawIt, '2026-11-05'), mysteryAnswer('2026-11-05'), 'a Keeper who first comes back on Thursday still hears it');
  assert.equal(mysteryRecap(sawIt, '2026-11-09'), null, 'two weeks later it is not "last week" any more');
  const kept = [0, 1, 2, 3, 4, 5, 6].reduce((log, week) => noteMystery(log, new Date(Date.UTC(2026, 10, 2) + week * 7 * 86_400_000).toISOString().slice(0, 10), false), {});
  assert.ok((kept as { seen?: number[] }).seen!.length <= 4, 'the log stays small');
});
