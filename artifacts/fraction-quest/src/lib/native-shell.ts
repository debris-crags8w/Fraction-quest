/* Inside the Expo iPhone app, the web app runs in a native web view that exposes `window.ReactNativeWebView`.
   These helpers send it small messages (print this page, tap a haptic), and do nothing in a normal browser. */
type NativeShell = { postMessage(message: string): void };
const shell = (): NativeShell | undefined => (globalThis as { ReactNativeWebView?: NativeShell }).ReactNativeWebView;

export type HapticCue = 'selection' | 'correct' | 'retry' | 'star' | 'complete' | 'impact';

export const inExpoShell = (): boolean => !!shell();

export function postToShell(message: { type: string; [key: string]: unknown }): boolean {
  const target = shell();
  if (!target) return false;
  try { target.postMessage(JSON.stringify(message)); return true; } catch { return false; }
}

/** Selection/result feedback is a no-op in a browser and a native cue inside Expo. */
export function postHaptic(cue: HapticCue): boolean {
  return postToShell({ type: 'haptic', cue });
}

/** The page as printable HTML for the iPhone print sheet: styles resolve against this site, print CSS applies. */
export function printableHtml(doc: Document = document): string {
  const clone = doc.documentElement.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('script').forEach((script) => script.remove());
  const head = clone.querySelector('head');
  if (head && !head.querySelector('base')) {
    const base = doc.createElement('base');
    base.href = doc.baseURI;
    head.prepend(base);
  }
  return `<!doctype html>${clone.outerHTML}`;
}
