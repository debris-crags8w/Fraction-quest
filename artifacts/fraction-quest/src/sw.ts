/* The service worker: Fraction Quest opens and plays without a connection. Built by the offline plugin in
   vite.config.ts, which fills in the files to save (__PRECACHE__) and this build's name (__VERSION__). */
import { offlineRoute, precacheUrls } from './lib/offline-routes';

// The worker's own events, typed here: the app's TypeScript setup has the page's types, not the worker's.
type WaitEvent = Event & { waitUntil(work: Promise<unknown>): void };
type FetchEvent = Event & { request: Request; respondWith(response: Promise<Response>): void };
const worker = self as unknown as {
  location: Location; skipWaiting(): Promise<void>; clients: { claim(): Promise<void> };
  addEventListener(type: 'install' | 'activate', listener: (event: WaitEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
};
declare const __PRECACHE__: string[];
declare const __VERSION__: string;
declare const __BASE__: string;

const SHELL = `fq-shell-${__VERSION__}`;
const VOICE = 'fq-voice';
const PAGE = __BASE__;

worker.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL).then((cache) => cache.addAll(precacheUrls(__BASE__, __PRECACHE__))).then(() => worker.skipWaiting()));
});

// Keep this build and the one before it: a page that is still open may load a part it has not loaded yet.
worker.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const shells = (await caches.keys()).filter((name) => name.startsWith('fq-shell-') && name !== SHELL);
    for (const old of shells.slice(0, -1)) await caches.delete(old);
    await worker.clients.claim();
  })());
});

async function fromCacheFirst(request: Request, cacheName: string): Promise<Response> {
  const saved = await caches.match(request);
  if (saved) return saved;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
}

async function page(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    if (response.ok) (await caches.open(SHELL)).put(PAGE, response.clone());
    return response;
  } catch {
    return (await caches.match(PAGE)) ?? (await caches.match(request)) ?? Response.error();
  }
}

worker.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const route = offlineRoute(new URL(request.url), worker.location.origin, __BASE__, request.mode);
  if (route === 'page') event.respondWith(page(request));
  else if (route === 'asset') event.respondWith(fromCacheFirst(request, SHELL));
  else if (route === 'voice') event.respondWith(fromCacheFirst(request, VOICE));
});
