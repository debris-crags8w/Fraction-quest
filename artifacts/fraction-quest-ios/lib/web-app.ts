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

export type ShellMessage =
  | { type: 'haptic'; cue: 'selection' | 'correct' | 'retry' | 'star' | 'complete' | 'impact' }
  | { type: 'print'; jobName?: string; html: string };

export function parseShellMessage(data: string): ShellMessage | null {
  try {
    const message = JSON.parse(data) as { type?: unknown; cue?: unknown; html?: unknown; jobName?: unknown };
    if (message?.type === 'haptic' && ['selection', 'correct', 'retry', 'star', 'complete', 'impact'].includes(String(message.cue))) {
      return message as ShellMessage;
    }
    if (message?.type === 'print' && typeof (message as { html?: unknown }).html === 'string') return message as ShellMessage;
  } catch { /* not ours */ }
  return null;
}
