/* The practice reminder, set by a grown-up and kept on the phone by the app (iPhone and Android): the app reports the
   time, the days and whether the phone lets it notify on `window.fractionQuestShell.reminder`. This page sets it,
   says when the child has practised today (no reminder that day), and opens today's practice after a reminder tap. */
import { useSyncExternalStore } from 'react';
import { onAppShellChange } from './app-shell';
import { postToShell } from './native-shell';

export type Reminder = { time: string | null; days: number[]; permission: 'granted' | 'denied' | 'undetermined' };
/** The times a grown-up can pick (24-hour, as the app stores them). */
export const REMINDER_TIMES = ['15:00', '16:00', '17:00', '18:00', '19:00'] as const;

export function readReminder(): Reminder | null {
  const raw = (globalThis as { fractionQuestShell?: { reminder?: Partial<Reminder> } }).fractionQuestShell?.reminder;
  if (!raw || typeof raw !== 'object') return null;
  return {
    time: typeof raw.time === 'string' && /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : null,
    days: Array.isArray(raw.days) ? raw.days.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6) : [],
    permission: raw.permission === 'granted' || raw.permission === 'denied' ? raw.permission : 'undetermined',
  };
}

/** "4:00 pm" for "16:00". */
export function timeLabel(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  return `${((hours + 11) % 12) + 1}:${String(minutes).padStart(2, '0')} ${hours < 12 ? 'am' : 'pm'}`;
}

export const setReminder = (time: string | null, days: number[]): boolean => postToShell({ type: 'reminder', action: 'set', time, days });
export const tellPractised = (day: string): boolean => postToShell({ type: 'reminder', action: 'practised', day });

/** When a reminder was last tapped (the app's time), or null. */
export function readOpenPractice(): number | null {
  const at = (globalThis as { fractionQuestShell?: { openPractice?: unknown } }).fractionQuestShell?.openPractice;
  return typeof at === 'number' && Number.isFinite(at) ? at : null;
}

const TAP_KEY = 'fraction-quest-reminder-tap';
/** A reminder tap not yet acted on (each tap opens practice once, even if the page reloads). */
export function takeReminderTap(): boolean {
  const at = readOpenPractice();
  if (!at) return false;
  try {
    if (localStorage.getItem(TAP_KEY) === String(at)) return false;
    localStorage.setItem(TAP_KEY, String(at));
  } catch { /* storage off: act on it this once */ }
  return true;
}

let cached: Reminder | null = null;
let cachedKey = '';
function snapshot(): Reminder | null {
  const next = readReminder();
  const key = JSON.stringify(next);
  if (key !== cachedKey) { cached = next; cachedKey = key; }
  return cached;
}

/** The reminder as the app reports it, or null in a browser (or an older app without reminders). */
export function useReminder(): Reminder | null {
  return useSyncExternalStore(onAppShellChange, snapshot, () => null);
}
