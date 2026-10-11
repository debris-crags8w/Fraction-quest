import { expect, test } from '@playwright/test';
import { getBuildChecks, getWorksheet } from '../src/learning-content';

async function openAsGuest(page: import('@playwright/test').Page) {
  await page.route('**/api/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not signed in.' }),
  }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByTestId('button-continue-course')).toBeVisible();
}

test('a new learner can start a lesson from the top of the course', async ({ page }) => {
  await openAsGuest(page);
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);

  await page.getByTestId('button-continue-course').click();
  await expect(page.locator('#lesson-title')).toBeVisible();
  await expect(page.getByTestId('button-listen-learning-text').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);
});

test('a completed learner can open a redo section without changing the lesson route', async ({ page }) => {
  const buildChecks = getBuildChecks('equal-parts');
  const worksheet = getWorksheet('equal-parts');
  const completedRecord = {
    practiceDone: true,
    checks: Object.fromEntries(buildChecks.map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
    worksheet: Object.fromEntries(worksheet.map((problem) => [problem.id, {
      draft: problem.answer,
      checkedValue: problem.answer,
      attempts: 1,
      supported: false,
    }])),
    helpUses: 0,
    misconceptions: {},
  };
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, {
    completedMissionIds: ['equal-parts'],
    starsByMission: { 'equal-parts': 1 },
    reviewQueue: [],
    learning: { 'equal-parts': completedRecord },
    assessments: [],
  });
  await openAsGuest(page);
  await page.getByTestId('button-node-equal-parts').click();
  const redo = page.getByTestId('button-redo-equal-parts');
  await expect(redo).toBeVisible();
  await redo.click();
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await expect(page.getByTestId('button-redo-builds')).toBeVisible();
  await expect(page.getByTestId('button-redo-worksheet')).toBeVisible();
});

test('daily practice opens as a separate short session', async ({ page }) => {
  await openAsGuest(page);
  await page.getByTestId('button-start-daily-practice').click();
  await expect(page.getByRole('heading', { name: /build it\. name it\. remember it\./i })).toBeVisible();
  await expect(page.getByTestId('button-daily-hint')).toBeVisible();
});

test('an adult progress report can invoke browser printing', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => { (window as Window & { __printCalls?: number }).__printCalls! += 1; };
  });
  await openAsGuest(page);
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge?.match(/(\d+)\s×\s(\d+)/);
  expect(factors).not.toBeNull();
  await page.getByRole('textbox').fill(String(Number(factors![1]) * Number(factors![2])));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('parent-report')).toBeVisible();
  await page.getByTestId('button-parent-print').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(1);
});
