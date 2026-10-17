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

test('set-model arrays are visibly grouped by the denominator', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not signed in.' }),
  }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await page.getByTestId('developer-module-test').locator('summary').click();
  await page.getByTestId('select-developer-lesson').selectOption('sets-unit-fractions');
  await page.getByTestId('button-open-developer-lesson').click();

  const groupedModel = page.getByRole('img', { name: /12 objects in 3 equal groups of 4, 1 group selected/i });
  await expect(groupedModel).toBeVisible();
  const groups = groupedModel.locator('[data-testid="set-model-group"]');
  await expect(groups).toHaveCount(3);
  await expect(groups.nth(0).locator('circle.dot')).toHaveCount(4);
  await expect(groups.nth(0).locator('rect.group')).toHaveClass('group on');
  await expect(groups.nth(1).locator('rect.group')).toHaveClass('group');
});

test('completed lesson questions can be reviewed without losing the current question', async ({ page }) => {
  const mission = MISSIONS.find((item) => item.id === 'sets-unit-fractions')!;
  const firstQuestion = mission.questions[0];

  await page.route('**/api/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not signed in.' }),
  }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await page.getByTestId('developer-module-test').locator('summary').click();
  await page.getByTestId('select-developer-lesson').selectOption(mission.id);
  await page.getByTestId('button-open-developer-lesson').click();

  await page.getByTestId(`button-answer-${firstQuestion.id}-${firstQuestion.correctChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
  await page.getByTestId('button-next-question').click();

  const currentQuestion = await page.locator('#lesson-title').textContent();
  await expect(page.getByTestId('button-review-question-2')).toHaveCount(0);
  await page.getByTestId('button-review-question-1').click();
  const review = page.getByTestId('panel-past-question-review');
  await expect(review).toBeVisible();
  await expect(review).toContainText(`Correct answer: ${firstQuestion.choices[firstQuestion.correctChoice]}`);
  await expect(review).toContainText('will not change your lesson progress');
  await page.getByTestId('button-return-to-current-question').click();

  await expect(page.locator('#lesson-title')).toHaveText(currentQuestion ?? '');
  await expect(page.getByTestId('button-review-question-1')).toBeVisible();
});

test('prepares visible lesson audio before the learner taps Listen', async ({ page }) => {
  const speechRequests: { voice: string | null; text: string | null }[] = [];
  await page.route('**/api/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/api/voice/status')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ state: 'ready' }) });
      return;
    }
    if (url.pathname.endsWith('/api/voice/speech')) {
      speechRequests.push({ voice: url.searchParams.get('voice'), text: url.searchParams.get('text') });
      await route.fulfill({ status: 200, contentType: 'audio/wav', body: Buffer.from([82, 73, 70, 70]) });
      return;
    }
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) });
  });

  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  expect(speechRequests).toHaveLength(0);

  await page.getByTestId('developer-module-test').locator('summary').click();
  await page.getByTestId('select-developer-lesson').selectOption('order-unlike-fractions');
  await page.getByTestId('button-open-developer-lesson').click();
  await expect(page.getByTestId('developer-test-banner')).toBeVisible();
  const storyGo = page.getByTestId('button-story-go');
  if (await storyGo.isVisible()) await storyGo.click();

  const section = page.locator('section.fq-example-section').first();
  await expect(section).toBeVisible();
  await section.scrollIntoViewIfNeeded();
  await expect.poll(() => speechRequests.length, { timeout: 10_000 }).toBeGreaterThan(0);
  expect(speechRequests[0].voice).toBe('af_heart');
  expect(speechRequests[0].text?.trim()).toBeTruthy();
  await expect(page.getByTestId('button-listen-learning-text').first()).toBeVisible();
});
