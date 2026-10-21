/* The Lesson tester is for the development server only. This builds the web app the way production does and checks
   that nothing of the tester page reached the shipped JavaScript. A full build takes a while, so it runs on its own:
   pnpm run test:dev-only. */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
/** Strings that only the tester page (and the buttons that open it) contain. */
const MARKERS = ['fq-lesson-tester-page', 'fraction-quest-dev-tested', 'Open the lesson tester', 'button-tester-start-'];

const filesIn = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const full = path.join(dir, name);
  return statSync(full).isDirectory() ? filesIn(full) : [full];
});

test('the development source has the Lesson tester page', () => {
  const page = readFileSync(path.join(root, 'src', 'LessonTester.tsx'), 'utf8');
  for (const marker of MARKERS.filter((m) => m !== 'Open the lesson tester')) assert.ok(page.includes(marker), `the page has "${marker}"`);
});

test('a production build of the web app leaves the Lesson tester out', { timeout: 600_000 }, () => {
  const outDir = mkdtempSync(path.join(tmpdir(), 'fq-prod-build-'));
  try {
    execFileSync('npx', ['vite', 'build', '--config', 'vite.config.ts', '--outDir', outDir, '--emptyOutDir', '--logLevel', 'error'], {
      cwd: root, stdio: 'pipe', env: { ...process.env, NODE_ENV: 'production', PORT: '4999', BASE_PATH: '/', VITE_DEVELOPER_CODE: 'test-code' },
    });
    const scripts = filesIn(outDir).filter((file) => file.endsWith('.js'));
    assert.ok(scripts.length > 0, 'the build made JavaScript');
    for (const file of scripts) {
      const code = readFileSync(file, 'utf8');
      for (const marker of MARKERS) assert.ok(!code.includes(marker), `${path.basename(file)} contains "${marker}"`);
    }
  } finally {
    rmSync(outDir, { recursive: true, force: true });
  }
});
