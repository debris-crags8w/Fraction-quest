import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { offlineRoute, precacheUrls } from './lib/offline-routes';

/* A child's device must never ask Google for a font: each request sends the child's address to Google, and the privacy page
   says a guest sends nothing. The two fonts the app uses are bundled (src/fonts.css) and saved offline by the service worker. */

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file: string) => readFileSync(path.join(appDir, file), 'utf8');
const filesUnder = (dir: string): string[] => readdirSync(path.join(appDir, dir)).flatMap((name) => {
  const relative = `${dir}/${name}`;
  return statSync(path.join(appDir, relative)).isDirectory() ? filesUnder(relative) : [relative];
});
const GOOGLE_FONTS = /fonts\.googleapis\.com|fonts\.gstatic\.com/;

describe('fonts are served from the app, not from Google', () => {
  it('no page, stylesheet or script names a Google font host', () => {
    const files = ['index.html', ...filesUnder('public'), ...filesUnder('src')]
      .filter((file) => /\.(html|css|tsx?|js)$/.test(file) && !/\.test\.ts$/.test(file));
    assert.ok(files.length > 100, 'the scan covers the whole app');
    for (const file of files) assert.doesNotMatch(read(file), GOOGLE_FONTS, `${file} loads a font from Google`);
    assert.doesNotMatch(read('index.html'), /rel="(preconnect|dns-prefetch)"/, 'no connection is opened to another site before the app loads');
  });

  it('every font family the theme names first has its faces bundled as woff2, with files that exist', () => {
    const css = read('src/fonts.css');
    const faces = [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((match) => {
      const body = match[1];
      return {
        family: /font-family:\s*'([^']+)'/.exec(body)?.[1], style: /font-style:\s*(\w+)/.exec(body)?.[1], weight: Number(/font-weight:\s*(\d+)/.exec(body)?.[1]),
        urls: [...body.matchAll(/url\(([^)]+)\)/g)].map((url) => url[1]),
      };
    });
    const have = faces.map((face) => `${face.family} ${face.style} ${face.weight}`).sort();
    assert.deepEqual(have, [
      'Atkinson Hyperlegible italic 400', 'Atkinson Hyperlegible normal 400', 'Atkinson Hyperlegible normal 700',
      'Baloo 2 normal 600', 'Baloo 2 normal 700', 'Baloo 2 normal 800',
    ]);
    for (const face of faces) {
      assert.equal(face.urls.length, 1, `${face.family} ${face.weight} has one source (woff2 only)`);
      assert.match(face.urls[0], /^@fontsource\/[a-z0-9-]+\/files\/[a-z0-9-]+\.woff2$/);
      assert.ok(existsSync(path.join(appDir, 'node_modules', face.urls[0])), `${face.urls[0]} is installed`);
    }
    // The theme's own families are the ones bundled.
    const theme = read('src/theme-pop.css');
    assert.match(theme, /--app-font-sans:\s*"Atkinson Hyperlegible"/);
    assert.match(theme, /--app-font-display:\s*"Baloo 2"/);
    assert.match(read('src/main.tsx'), /import '\.\/fonts\.css';/);
  });

  it('the service worker saves the font files, and leaves any Google font host alone', () => {
    const built = ['assets/index-abc.css', 'assets/atkinson-hyperlegible-latin-400-normal-abc.woff2', 'assets/baloo-2-latin-800-normal-abc.woff2'];
    assert.ok(precacheUrls('/', built).includes('/assets/baloo-2-latin-800-normal-abc.woff2'));
    const route = (url: string) => offlineRoute(new URL(url), 'https://fq.example', '/', 'cors');
    assert.equal(route('https://fq.example/assets/baloo-2-latin-800-normal-abc.woff2'), 'asset');
    assert.equal(route('https://fonts.gstatic.com/s/baloo2/v23/a.woff2'), 'network');
    assert.equal(route('https://fonts.googleapis.com/css2?family=Baloo+2'), 'network');
  });
});
