/* The practice reminder a grown-up sets on this phone: a time and the days of the week. It stays on the phone (nothing is
   sent anywhere). The shell schedules one reminder for each matching day in the next four weeks, skipping a day the
   child has already practised, and schedules again whenever the app opens. */
export type ReminderSettings = { time: string | null; days: number[] };
export type ReminderMessage =
  | { type: 'reminder'; action: 'set'; time: string | null; days: number[] }
  | { type: 'reminder'; action: 'practised'; day: string };

export const NO_REMINDER: ReminderSettings = { time: null, days: [1, 2, 3, 4, 5] };
export const REMINDER_TITLE = 'Hoot’s lantern is waiting';
export const REMINDER_BODY = 'Time for today’s fraction practice. Keep your streak glowing!';
/** How far ahead reminders are scheduled; the app tops them up each time it opens. */
export const REMINDER_DAYS_AHEAD = 28;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Settings from storage or the page, keeping only a real time and real weekdays (0 is Sunday). */
export function cleanReminderSettings(value: unknown): ReminderSettings {
  if (!value || typeof value !== 'object') return { ...NO_REMINDER };
  const { time, days } = value as { time?: unknown; days?: unknown };
  const cleanDays = Array.isArray(days) ? [...new Set(days.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6))].sort() : NO_REMINDER.days;
  return { time: typeof time === 'string' && TIME.test(time) ? time : null, days: cleanDays };
}

export function parseReminderMessage(message: { type?: unknown; action?: unknown; time?: unknown; days?: unknown; day?: unknown }): ReminderMessage | null {
  if (message?.type !== 'reminder') return null;
  if (message.action === 'set' && (message.time === null || (typeof message.time === 'string' && TIME.test(message.time))) && Array.isArray(message.days)) {
    const { time, days } = cleanReminderSettings(message);
    return { type: 'reminder', action: 'set', time, days };
  }
  if (message.action === 'practised' && typeof message.day === 'string' && DAY.test(message.day)) return { type: 'reminder', action: 'practised', day: message.day };
  return null;
}

/** When to remind over the next four weeks: each chosen weekday at the chosen time, still ahead of now, and not on a
    day the child already practised. */
export function reminderDates(settings: ReminderSettings, now: Date, practisedDay: string | null, daysAhead = REMINDER_DAYS_AHEAD): Date[] {
  const match = settings.time ? TIME.exec(settings.time) : null;
  if (!match) return [];
  const dates: Date[] = [];
  for (let offset = 0; offset < daysAhead; offset += 1) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, Number(match[1]), Number(match[2]), 0, 0);
    if (!settings.days.includes(at.getDay()) || at <= now || dayKey(at) === practisedDay) continue;
    dates.push(at);
  }
  return dates;
}
