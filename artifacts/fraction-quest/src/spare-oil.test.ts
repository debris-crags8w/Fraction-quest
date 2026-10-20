import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { applySpareOil, recordCorrect, shownStreak, today, SPARE_OIL_EVERY, SPARE_OIL_MAX, type FunState } from './lib/fun';
import { EMPTY_PROGRESS } from './game';
import { buildParentReport } from './parent-report';
import { lanternWeek, oilNoticeWords, oilWordsText } from './riddles';

const base: FunState = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 9, lastActiveDay: '2026-10-18', sound: true };
const at = (day: string) => new Date(`${day}T09:00:00`);

describe('spare oil keeps a streak through a missed day', () => {
  it('uses one drop for one missed day, keeps the streak number, and leaves lastActiveDay as the real last day', () => {
    // Last right answer on the 18th, nothing on the 19th, opened on the 20th.
    const opened = applySpareOil({ ...base, spareOil: 1 }, at('2026-10-20'));
    assert.equal(opened.spareOil, 0);
    assert.deepEqual(opened.savedDays, ['2026-10-19']);
    assert.equal(opened.streakKeptUntil, '2026-10-19');
    assert.equal(opened.lastActiveDay, '2026-10-18', 'a saved day is not activity');
    assert.deepEqual(opened.oilNotice, { kind: 'used', days: ['2026-10-19'] });
    assert.equal(shownStreak(opened, at('2026-10-20')), 9, 'the saved day keeps the streak but does not add to it');
  });

  it('uses two drops for two missed days, and none when there are not enough', () => {
    const twoMissed = { ...base, lastActiveDay: '2026-10-17', spareOil: 2 };
    const opened = applySpareOil(twoMissed, at('2026-10-20'));
    assert.equal(opened.spareOil, 0);
    assert.deepEqual(opened.savedDays, ['2026-10-18', '2026-10-19']);
    const short = { ...twoMissed, spareOil: 1 };
    assert.equal(applySpareOil(short, at('2026-10-20')), short, 'one drop cannot cover two days: nothing is used');
    assert.equal(shownStreak(short, at('2026-10-20')), 0, 'and the streak ends as before');
  });

  it('does nothing when no day was missed, the jar is empty, or there is no streak', () => {
    for (const state of [{ ...base, lastActiveDay: '2026-10-19', spareOil: 1 }, { ...base, spareOil: 0 }, { ...base, dayStreak: 0, spareOil: 2 }]) {
      assert.equal(applySpareOil(state, at('2026-10-20')), state);
    }
  });

  it('runs once: opening again the same day changes nothing more', () => {
    const opened = applySpareOil({ ...base, spareOil: 2 }, at('2026-10-20'));
    assert.equal(applySpareOil(opened, at('2026-10-20')), opened);
    assert.equal(opened.spareOil, 1);
  });

  it('earns a drop on the 7th day in a row, not again the same day, and never past a full jar', () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const sixDays = { ...base, day: today(), dayStreak: SPARE_OIL_EVERY - 1, lastActiveDay: today(yesterday), spareOil: 0 };
    const seventh = recordCorrect(sixDays);
    assert.equal(seventh.dayStreak, 7);
    assert.equal(seventh.spareOil, 1);
    assert.deepEqual(seventh.oilNotice, { kind: 'earned', streak: 7 });
    assert.equal(recordCorrect(seventh).spareOil, 1, 'more right answers today do not earn more');
    assert.equal(recordCorrect({ ...sixDays, spareOil: SPARE_OIL_MAX }).spareOil, SPARE_OIL_MAX);
    assert.equal(recordCorrect({ ...sixDays, spareOil: SPARE_OIL_MAX }).oilNotice, undefined, 'a full jar: no notice');
    assert.equal(recordCorrect({ ...sixDays, dayStreak: 3 }).spareOil, 0, 'day 4: nothing yet');
  });

  it('counts the next right answer after a saved day as one more day', () => {
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const twoAgo = new Date(); twoAgo.setDate(twoAgo.getDate() - 2);
    const kept = { ...base, day: today(), dayStreak: 9, lastActiveDay: today(twoAgo), streakKeptUntil: today(yesterday), spareOil: 0 };
    assert.equal(recordCorrect(kept).dayStreak, 10);
  });
});

describe('what the child and the grown-up see', () => {
  it('names the missed days, underlines the key words, and has a plain version with story mode off', () => {
    const one = oilNoticeWords({ kind: 'used', days: ['2026-10-20'] }, true, 9);
    assert.equal(oilWordsText(one), 'Welcome back! You missed Tuesday, so I used a drop of spare oil. Your 9 nights are safe.');
    assert.deepEqual(one.parts.filter((part) => typeof part !== 'string'), [{ key: 'Tuesday' }, { key: 'spare oil' }]);
    assert.equal(oilWordsText(oilNoticeWords({ kind: 'used', days: ['2026-10-19', '2026-10-20'] }, true, 9)),
      'Welcome back! You missed Monday and Tuesday, so I used 2 drops of spare oil. Your 9 nights are safe.');
    assert.equal(oilWordsText(oilNoticeWords({ kind: 'used', days: ['2026-10-20'] }, false, 9)), 'You missed Tuesday, so a streak saver kept your 9-day streak going.');
    assert.equal(oilNoticeWords({ kind: 'earned', streak: 7 }, true, 7).title, 'A whole week of light!');
    assert.equal(oilWordsText(oilNoticeWords({ kind: 'earned', streak: 14 }, false, 14)), 'You earned a streak saver. It keeps your streak going if you miss a day.');
  });

  it('draws a saved night as kept lit, but never a night that had practice', () => {
    const nights = lanternWeek({ '2026-10-18': { minutes: 4, answered: 2 } }, at('2026-10-20'), ['2026-10-18', '2026-10-19']);
    assert.deepEqual(nights.slice(4).map(({ lit, saved }) => ({ lit, saved })), [{ lit: true, saved: false }, { lit: false, saved: true }, { lit: false, saved: false }]);
  });

  it('shows the grown-up which days were saved, apart from real practice', () => {
    const report = buildParentReport(EMPTY_PROGRESS, { ...base, spareOil: 1, savedDays: ['2026-10-19'], streakKeptUntil: '2026-10-19',
      activity: { '2026-10-18': { minutes: 4, answered: 2 } } }, [], at('2026-10-20'));
    assert.equal(report.savedDays, 1);
    assert.equal(report.streak, 9);
    assert.deepEqual(report.week.filter((day) => day.saved).map((day) => day.day), ['2026-10-19']);
    assert.equal(report.answeredWeek, 2, 'a saved day adds no practice');
  });
});
