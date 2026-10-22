/* Where the shell loads Fraction Quest from. The web app is the single source of truth: every screen, lesson
   and fix comes from it, so the iPhone app stays in sync with the web app without rebuilding.
   - EXPO_PUBLIC_WEB_APP_URL: set this to point at a specific deployment (for example the published site).
   - Otherwise: the Replit domain this app is served from (the web app lives at "/" on the same domain). */
export function webAppUrl(): string | null {
  const explicit = process.env.EXPO_PUBLIC_WEB_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/?$/, '/');
  const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  return domain ? `https://${domain}/` : null;
}

/** Same site as the web app (stays inside the app), or somewhere else (opens in Safari). */
export function isAppPage(url: string, appUrl: string): boolean {
  // about:blank, data: and similar internal pages stay in the web view.
  if (!/^https?:/i.test(url)) return true;
  try {
    return new URL(url).host === new URL(appUrl).host;
  } catch {
    return false;
  }
}

import { parseReminderMessage, type ReminderMessage, type ReminderSettings } from './reminders';

export type SubscriptionAction = 'status' | 'buy' | 'restore' | 'manage';
export type ShellMessage =
  | { type: 'haptic'; cue: 'selection' | 'correct' | 'retry' | 'star' | 'complete' | 'impact' }
  | { type: 'print'; jobName?: string; html: string }
  | { type: 'subscription'; action: SubscriptionAction }
  | ReminderMessage;

/** What the page is told about the monthly subscription. `unavailable`: the store could not be reached or the
    subscription is not set up yet, so the page cannot know (it then leaves lessons open). */
export type SubscriptionStatus = {
  state: 'active' | 'none' | 'unavailable';
  /** When the current period (or the free trial) ends, in milliseconds, when the store says. */
  renewsAt?: number | null;
  /** The store's price text, such as "$4.99". */
  price?: string | null;
  /** A purchase or restore is in progress. */
  busy?: boolean;
  /** A short message for the grown-up when something went wrong (never for a cancelled purchase). */
  error?: string | null;
};

/** What the page is told about the practice reminder on this phone, and whether the phone lets it notify. */
export type ReminderStatus = ReminderSettings & { permission: 'granted' | 'denied' | 'undetermined' };
/** More for the page: the reminder settings, and when a reminder was tapped (the page then opens today's practice). */
export type ShellExtras = { reminder?: ReminderStatus | null; openPractice?: number | null };

export function parseShellMessage(data: string): ShellMessage | null {
  try {
    const message = JSON.parse(data) as { type?: unknown; cue?: unknown; html?: unknown; jobName?: unknown };
    if (message?.type === 'haptic' && ['selection', 'correct', 'retry', 'star', 'complete', 'impact'].includes(String(message.cue))) {
      return message as ShellMessage;
    }
    if (message?.type === 'print' && typeof (message as { html?: unknown }).html === 'string') return message as ShellMessage;
    if (message?.type === 'subscription' && ['status', 'buy', 'restore', 'manage'].includes(String((message as { action?: unknown }).action))) {
      return message as ShellMessage;
    }
    const reminder = parseReminderMessage(message as Parameters<typeof parseReminderMessage>[0]);
    if (reminder) return reminder;
  } catch { /* not ours */ }
  return null;
}

/** Script that tells the page it runs inside the app, whether the phone is on Wi-Fi, the subscription status, the
    practice reminder and a reminder tap
    (`window.fractionQuestShell`, plus a 'fraction-quest-shell' event so the page can react to changes). */
export function shellInfoScript(platform: string, wifi: boolean, subscription?: SubscriptionStatus | null, extras: ShellExtras = {}): string {
  const info = JSON.stringify({
    platform, wifi,
    ...(subscription ? { subscription } : {}),
    ...(extras.reminder ? { reminder: extras.reminder } : {}),
    ...(extras.openPractice ? { openPractice: extras.openPractice } : {}),
  });
  return `window.fractionQuestShell = ${info}; window.dispatchEvent(new Event('fraction-quest-shell')); true;`;
}
