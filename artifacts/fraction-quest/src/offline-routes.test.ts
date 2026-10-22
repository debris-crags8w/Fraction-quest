import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { offlineRoute, precacheUrls } from './lib/offline-routes';

describe('offline service worker routes', () => {
  const route = (url: string, mode = 'cors', base = '/') => offlineRoute(new URL(url), 'https://fq.example', base, mode);

  it('saves the app, plays heard voice clips from the device, and never saves accounts or progress', () => {
    assert.equal(route('https://fq.example/', 'navigate'), 'page');
    assert.equal(route('https://fq.example/lesson/3', 'navigate'), 'page');
    assert.equal(route('https://fq.example/assets/index-abc123.js'), 'asset');
    assert.equal(route('https://fq.example/voice/index.json'), 'asset');
    assert.equal(route('https://fonts.gstatic.com/s/nunito/v1/a.woff2'), 'asset');
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
});
