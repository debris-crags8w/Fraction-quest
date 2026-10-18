/* The iPhone app is an Expo shell around this website (artifacts/fraction-quest-ios): the lessons, the voice and
   every screen come from here. The shell tells the page it is there, and whether the phone is on Wi-Fi, through
   `window.fractionQuestShell` and a 'fraction-quest-shell' event whenever that changes. */

export type AppShell = { platform: string; wifi: boolean };
export const APP_SHELL_EVENT = 'fraction-quest-shell';

/** The iPhone app's shell, or null in a plain browser. */
export function appShell(): AppShell | null {
  const shell = (globalThis as { fractionQuestShell?: Partial<AppShell> }).fractionQuestShell;
  return shell && typeof shell === 'object' ? { platform: String(shell.platform ?? ''), wifi: shell.wifi === true } : null;
}

/** Runs `listener` when the shell reports a change (for example, Wi-Fi on or off). */
export function onAppShellChange(listener: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(APP_SHELL_EVENT, listener);
  return () => window.removeEventListener(APP_SHELL_EVENT, listener);
}
