import { expect, test } from '@playwright/test';
import { MISSIONS } from '../src/game';
import { PART_FINDER_LESSONS } from '../src/part-finder';

test('developer can open a locked lesson and discard all test progress on exit', async ({ page }) => {
  const mission = [...MISSIONS].reverse().find((item) => !PART_FINDER_LESSONS.has(item.id))!;
  const question = mission.questions[0];
  const wrongChoice = (question.correctChoice + 1) % question.choices.length;

  await page.route('**/api/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not signed in.' }),
  }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();

  const savedBeforeTest = await page.evaluate(() => ({
    progress: localStorage.getItem('fraction-quest-progress-v1:guest'),
    fun: localStorage.getItem('fraction-quest-fun-v1:guest'),
  }));

  const developerPanel = page.getByTestId('developer-module-test');
  await developerPanel.locator('summary').click();
  await page.getByTestId('select-developer-lesson').selectOption(mission.id);
  await page.getByTestId('button-open-developer-lesson').click();

  await expect(page.getByTestId('developer-test-banner')).toBeVisible();
  await expect(page.getByRole('heading', { name: mission.title })).toBeVisible();
  await page.getByTestId(`button-answer-${question.id}-${wrongChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'retry');

  await page.getByTestId('button-exit-developer-test').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();

  const savedAfterTest = await page.evaluate(() => ({
    progress: localStorage.getItem('fraction-quest-progress-v1:guest'),
    fun: localStorage.getItem('fraction-quest-fun-v1:guest'),
  }));
  expect(savedAfterTest).toEqual(savedBeforeTest);
});
