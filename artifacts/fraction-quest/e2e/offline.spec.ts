import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import path from 'node:path';
import { expect, test } from '@playwright/test';

/* Offline: the published app saves itself (src/sw.ts) and opens and plays with no connection; a signed-in family
   opens their own account when the server can't be reached. */

const appDir = path.resolve(import.meta.dirname, '..');
const PORT = 4196;
const ORIGIN = `http://127.0.0.1:${PORT}`;
const freshFun = JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
  story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: false } });

test.describe('the published app', () => {
  let server: ChildProcess | undefined;
  test.beforeAll(async () => {
    test.setTimeout(240_000);
    const env = { ...process.env, PORT: String(PORT), BASE_PATH: '/', NODE_ENV: 'production' };
    execFileSync('npx', ['vite', 'build', '--config', 'vite.config.ts', '--logLevel', 'error'], { cwd: appDir, env, stdio: 'inherit' });
    server = spawn('npx', ['vite', 'preview', '--config', 'vite.config.ts', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], { cwd: appDir, env, stdio: 'ignore', detached: true });
    for (let tries = 0; tries < 60; tries++) {
      try { if ((await fetch(ORIGIN)).ok) return; } catch { /* starting */ }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error('The preview server did not start');
  });
  // npx starts vite as its own child: stop the whole group, or a leftover preview keeps the port with an old build.
  test.afterAll(() => { if (server?.pid) { try { process.kill(-server.pid); } catch { server.kill(); } } });

  test('opens and plays a lesson with no connection after one visit', async ({ context, page }) => {
    await context.addInitScript((fun) => { if (!localStorage.getItem('fraction-quest-fun-v1')) localStorage.setItem('fraction-quest-fun-v1', fun); }, freshFun);
    await context.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.goto(ORIGIN);
    await page.getByTestId('button-play-guest').click();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    // The worker saves the app, then looks after the page from the next load.
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await page.getByTestId('button-start-mission-fraction-names').click();
    // Watch and Try work offline too (a child's first lesson); skip them to reach the lesson.
    await expect(page.getByTestId('intro-steps')).toBeVisible();
    await page.getByTestId('button-intro-skip').click();
    // Idea 1's Learn pages, then its first practice.
    await expect(page.getByTestId('idea-learn-screen')).toBeVisible();
    while (await page.getByTestId('button-teach-step-next').isVisible()) await page.getByTestId('button-teach-step-next').click();
    await page.getByTestId('button-idea-practise').click();
    await expect(page.getByTestId('button-check-answer')).toBeVisible();
  });

  test('opens the saved page when the connection hangs instead of waiting on it', async ({ context, page }) => {
    await context.addInitScript((fun) => { if (!localStorage.getItem('fraction-quest-fun-v1')) localStorage.setItem('fraction-quest-fun-v1', fun); }, freshFun);
    await context.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.goto(ORIGIN);
    await page.getByTestId('button-play-guest').click();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

    // The connection is up but the page request never answers (weak "lie-fi"): after 3 seconds the saved page opens.
    await context.route(`${ORIGIN}/`, () => { /* never answered */ });
    const started = Date.now();
    await page.reload();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible({ timeout: 15_000 });
    expect(Date.now() - started).toBeGreaterThan(2_500);
  });
});

test('a signed-in family opens their own account when the server cannot be reached', async ({ page }) => {
  const user = { id: 31, username: 'mia_home', displayName: 'Mia’s family', parentConsentAt: '2026-10-13T00:00:00.000Z', privacyNoticeVersion: '2026-10-13', hasRecoveryCode: true };
  const profile = { id: 5, displayName: 'Mia', classroomId: null, memberCode: null, assignedUnitIds: [] };
  await page.addInitScript((fun) => { if (!localStorage.getItem('fraction-quest-fun-v1')) localStorage.setItem('fraction-quest-fun-v1', fun); }, freshFun);
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const body = pathname === '/api/auth/me' ? user : pathname === '/api/family/profiles' ? [profile]
      : pathname === '/api/family/profiles/5/progress' ? { progress: null, fun: null } : null;
    await route.fulfill({ status: body ? 200 : 404, contentType: 'application/json', body: JSON.stringify(body ?? {}) });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();

  // The server is unreachable now (offline, or down): the family is not sent to the sign-in screen.
  await page.unroute('**/api/**');
  await page.route('**/api/**', (route) => route.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await expect(page.getByTestId('tab-sign-in')).toHaveCount(0);

  // Signed out on the server (401): the saved account is forgotten and the sign-in screen shows.
  await page.unroute('**/api/**');
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.reload();
  await expect(page.getByTestId('tab-sign-in')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('fraction-quest-offline-account'))).toBeNull();
});
