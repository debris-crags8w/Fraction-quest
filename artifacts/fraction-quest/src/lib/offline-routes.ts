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

/** How long a page open waits for the network before it uses the saved page (a weak or "lie-fi" connection). */
export const PAGE_NETWORK_TIMEOUT_MS = 3000;

/** The answer for a page open: the network's page when it comes in time (so a new version arrives); otherwise the saved
    page, after a failure at once or after `timeoutMs` of waiting. With no saved page (the first visit) there is nothing
    to fall back to, so it keeps waiting for the network. The network request is not cancelled: when it lands late, the
    caller's `fromNetwork` can still save it for next time. */
export async function pageFromNetworkOrSaved<R>(
  fromNetwork: () => Promise<R>,
  savedPage: () => Promise<R | undefined>,
  timeoutMs: number = PAGE_NETWORK_TIMEOUT_MS,
): Promise<R> {
  const network = fromNetwork();
  network.catch(() => undefined); // a late failure is not an unhandled rejection
  let timer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<'slow'>((resolve) => { timer = setTimeout(() => resolve('slow'), timeoutMs); });
  try {
    const first = await Promise.race([network.then((response) => ({ response }), () => 'failed' as const), slow]);
    if (typeof first === 'object') return first.response;
    const saved = await savedPage();
    if (saved !== undefined) return saved;
    return await network; // nothing saved: wait for the network (or fail with its error)
  } finally {
    clearTimeout(timer);
  }
}
