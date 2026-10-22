import { expect, test, type Page } from './fixtures';

const dayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** A plain browser with the published website's limit on (the test server otherwise keeps every lesson open). */
async function openWebsite(page: Page, finished: string[]) {
  const record = { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, completedAt: Date.now() };
  await page.addInitScript(({ done, learned, day }) => {
    (window as Window & { __fqWebLimit?: boolean }).__fqWebLimit = true;
    if (!localStorage.getItem('fraction-quest-fun-v1:guest')) {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: done, starsByMission: {}, reviewQueue: [], assessments: [], learning: learned }));
      localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day, answeredToday: 0, sound: false, story: { prologueSeen: true } }));
    }
  }, { done: finished, learned: Object.fromEntries(finished.map((id) => [id, record])), day: dayKey() });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  const map = page.getByTestId('button-app-menu');
  await expect(guest.or(map)).toBeVisible();
  if (await guest.isVisible()) await guest.click();
}

test('on the website the first lesson is free', async ({ page }) => {
  await openWebsite(page, []);
  await page.getByTestId('button-start-mission-equal-parts').click();
  await expect(page.getByTestId('web-app-only')).toHaveCount(0);
});

test('on the website, lesson 2 sends the family to the app, with the store links behind the grown-up check', async ({ page }) => {
  await openWebsite(page, ['equal-parts']);
  await page.getByTestId('button-start-mission-fraction-names').click();
  const ask = page.getByTestId('web-app-only');
  await expect(ask).toBeVisible();
  await expect(ask.getByRole('heading')).toHaveText('You found the first clue!');
  await expect(ask).toContainText('The rest of the adventure is in the Fraction Quest app.');

  await page.getByTestId('button-subscribe-back').click();
  await page.getByTestId('button-start-mission-fraction-names').click();
  await page.getByTestId('button-get-grown-up').click();
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();

  const getApp = page.getByTestId('get-the-app');
  await expect(getApp.getByRole('heading')).toHaveText('Fraction Quest continues in the app');
  await expect(getApp).toContainText('7 days free, then $4.99 a month');
  // No store listing set in the test build yet.
  await expect(page.getByTestId('get-app-soon')).toBeVisible();
  await page.getByTestId('button-get-app-back').click();
  await expect(page.getByTestId('button-start-mission-fraction-names')).toBeVisible();
});

test('on the website the Storybook stays open after a later lesson points to the app', async ({ page }) => {
  await openWebsite(page, ['equal-parts']);
  await page.getByTestId('button-start-mission-fraction-names').click();
  await expect(page.getByTestId('web-app-only')).toBeVisible();
  await page.getByTestId('button-subscribe-back').click();
  await page.getByTestId('button-app-menu').click();
  const storybook = page.getByRole('button', { name: /Storybook/ }).first();
  await storybook.click();
  await expect(page.getByTestId('web-app-only')).toHaveCount(0);
});
