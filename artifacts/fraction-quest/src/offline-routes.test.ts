import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { offlineRoute, PAGE_NETWORK_TIMEOUT_MS, pageFromNetworkOrSaved, precacheUrls } from './lib/offline-routes';

describe('offline service worker routes', () => {
  const route = (url: string, mode = 'cors', base = '/') => offlineRoute(new URL(url), 'https://fq.example', base, mode);

  it('saves the app, plays heard voice clips from the device, and never saves accounts or progress', () => {
    assert.equal(route('https://fq.example/', 'navigate'), 'page');
    assert.equal(route('https://fq.example/lesson/3', 'navigate'), 'page');
    assert.equal(route('https://fq.example/assets/index-abc123.js'), 'asset');
    assert.equal(route('https://fq.example/voice/index.json'), 'asset');
    assert.equal(route('https://fq.example/assets/baloo-2-latin-700-normal-abc.woff2'), 'asset', 'fonts are built files, saved with the app');
    assert.equal(route('https://fq.example/api/storage/public-objects/voice/numi/ab12.mp3'), 'voice');
    for (const api of ['/api/auth/me', '/api/family/profiles/3/progress', '/api/voice/speech?voice=a&text=b', '/api/healthz']) {
      assert.equal(route(`https://fq.example${api}`), 'network', api);
    }
    assert.equal(route('https://cdn.example.com/lib.js'), 'network', 'other sites are left alone');
  });

  it('keeps to the app’s own path when it is served under one', () => {
    assert.equal(route('https://fq.example/fraction-quest/assets/a.js', 'cors', '/fraction-quest/'), 'asset');
    assert.equal(route('https://fq.example/other/a.js', 'cors', '/fraction-quest/'), 'network');
  });

  it('saves the page and every built file, but not the worker itself or source maps', () => {
    assert.deepEqual(precacheUrls('/', ['assets/a.js', 'assets/a.js.map', 'sw.js', 'voice/index.json']), ['/', '/assets/a.js', '/voice/index.json']);
    assert.deepEqual(precacheUrls('/fq', ['index.html']), ['/fq/', '/fq/index.html']);
  });
  it('opens the saved page when the network is slow, but waits for the network when nothing is saved yet', async () => {
    const never = () => new Promise<string>(() => { /* a connection that hangs */ });
    const later = (value: string, ms: number) => () => new Promise<string>((resolve) => setTimeout(() => resolve(value), ms));
    const saved = (value?: string) => async () => value;
    assert.equal(PAGE_NETWORK_TIMEOUT_MS, 3000, 'the open gives the network three seconds');
    assert.equal(await pageFromNetworkOrSaved(later('fresh', 5), saved('old'), 50), 'fresh', 'a fast network wins, so a new version arrives');
    assert.equal(await pageFromNetworkOrSaved(never, saved('old'), 20), 'old', 'a hanging connection falls back to the saved page');
    assert.equal(await pageFromNetworkOrSaved(later('fresh', 80), saved('old'), 20), 'old', 'a slow connection falls back to the saved page');
    assert.equal(await pageFromNetworkOrSaved(async () => { throw new Error('offline'); }, saved('old'), 50), 'old', 'offline at once uses the saved page');
    assert.equal(await pageFromNetworkOrSaved(later('fresh', 60), saved(), 20), 'fresh', 'nothing saved yet (first visit): keep waiting for the network');
    await assert.rejects(pageFromNetworkOrSaved(async () => { throw new Error('offline'); }, saved(), 20), /offline/, 'offline with nothing saved is an error');
  });
});
