/* How the service worker (src/sw.ts) answers each request, so the app opens and plays without a connection. Kept
   pure so it can be tested here: the worker only wires these answers to the Cache API. */

export type OfflineRoute =
  /** The page itself: the network first (so a new version arrives), the saved page when offline. */
  | 'page'
  /** Built files (scripts, styles, fonts, pictures): saved ones first; their names change when their content does. */
  | 'asset'
  /** A recorded voice clip: saved the first time it is heard, then played from the device. */
  | 'voice'
  /** Everything else (accounts, saving, the live voice): always the network, never saved. */
  | 'network';

/** The route for a GET request. `base` is the app's path ("/" or "/fraction-quest/"). */
export function offlineRoute(url: URL, appOrigin: string, base: string, mode: string): OfflineRoute {
  if (url.origin !== appOrigin) return 'network'; // other sites are left alone (the fonts are the app's own files)
  if (url.pathname.startsWith('/api/storage/public-objects/voice/')) return 'voice';
  if (url.pathname.startsWith('/api/')) return 'network';
  if (mode === 'navigate') return 'page';
  return url.pathname.startsWith(base) ? 'asset' : 'network';
}

/** The files to save when the worker installs: the page and every built file, under the app's path. */
export function precacheUrls(base: string, files: string[]): string[] {
  const root = base.endsWith('/') ? base : `${base}/`;
  return [root, ...files.filter((file) => file !== 'sw.js' && !file.endsWith('.map')).map((file) => `${root}${file}`)];
}
