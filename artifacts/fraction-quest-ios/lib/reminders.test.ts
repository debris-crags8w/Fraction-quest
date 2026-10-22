import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanReminderSettings, parseReminderMessage, reminderDates } from './reminders';

// Tuesday 20 October 2026, 3pm.
const now = new Date(2026, 9, 20, 15, 0);

test('reminders fall on the chosen weekdays at the chosen time, over the next four weeks', () => {
  const dates = reminderDates({ time: '16:00', days: [1, 2, 3, 4, 5] }, now, null);
  assert.equal(dates.length, 20);
  assert.deepEqual(dates[0], new Date(2026, 9, 20, 16, 0));
  assert.deepEqual(dates[1], new Date(2026, 9, 21, 16, 0));
  assert.ok(dates.every((date) => date.getDay() >= 1 && date.getDay() <= 5 && date.getHours() === 16));
});

test('no reminder today once the child has practised, or once today’s time has passed', () => {
  assert.deepEqual(reminderDates({ time: '16:00', days: [2] }, now, '2026-10-20')[0], new Date(2026, 9, 27, 16, 0));
  assert.deepEqual(reminderDates({ time: '14:30', days: [2] }, now, null)[0], new Date(2026, 9, 27, 14, 30));
});

test('with the reminder off, or no days, nothing is scheduled', () => {
  assert.deepEqual(reminderDates({ time: null, days: [1, 2] }, now, null), []);
  assert.deepEqual(reminderDates({ time: '16:00', days: [] }, now, null), []);
});

test('the shell accepts only a real time, real weekdays and a real day', () => {
  assert.deepEqual(parseReminderMessage({ type: 'reminder', action: 'set', time: '16:00', days: [5, 1, 1, 9, 2.5] }), { type: 'reminder', action: 'set', time: '16:00', days: [1, 5] });
  assert.deepEqual(parseReminderMessage({ type: 'reminder', action: 'set', time: null, days: [] }), { type: 'reminder', action: 'set', time: null, days: [] });
  assert.equal(parseReminderMessage({ type: 'reminder', action: 'set', time: '25:00', days: [] }), null);
  assert.equal(parseReminderMessage({ type: 'reminder', action: 'set', time: '16:00' }), null);
  assert.deepEqual(parseReminderMessage({ type: 'reminder', action: 'practised', day: '2026-10-20' }), { type: 'reminder', action: 'practised', day: '2026-10-20' });
  assert.equal(parseReminderMessage({ type: 'reminder', action: 'practised', day: 'today' }), null);
  assert.deepEqual(cleanReminderSettings('junk'), { time: null, days: [1, 2, 3, 4, 5] });
});
