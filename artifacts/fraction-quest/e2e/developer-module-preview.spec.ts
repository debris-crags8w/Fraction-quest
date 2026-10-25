import { expect, openSettings, test } from './fixtures';
import { MISSIONS } from '../src/game';
import { PART_FINDER_LESSONS } from '../src/part-finder';
import { ideaPracticeQuestions } from '../src/lesson-ideas';
import { completeIdeas } from './lesson-walk';

/** Developer testing lives with the grown-ups' settings, behind the grown-up check. */
async function openDeveloperTesting(page: import('@playwright/test').Page) {
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await openSettings(page, 'Developer');
  await expect(page.getByTestId('section-developer-testing')).toBeVisible();
}

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

  await openDeveloperTesting(page);
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
  await openDeveloperTesting(page);
  await page.getByTestId('select-developer-lesson').selectOption('sets-unit-fractions');
  await page.getByTestId('button-open-developer-lesson').click();
  // Idea 1's Learn pages and first practice, then its second practice: 10 shells shared into 2 equal groups.
  await completeIdeas(page, MISSIONS.find((item) => item.id === 'sets-unit-fractions')!, { until: 1 });

  const groupedModel = page.getByRole('img', { name: /10 objects in 2 equal groups of 5, 0 groups selected/i });
  await expect(groupedModel).toBeVisible();
  const groups = groupedModel.locator('[data-testid="set-model-group"]');
  await expect(groups).toHaveCount(2);
  await expect(groups.nth(0).locator('circle.dot')).toHaveCount(5);
  await expect(groups.nth(0).locator('rect.group')).toHaveClass('group');
  await expect(groups.nth(1).locator('rect.group')).toHaveClass('group');
});

test('completed lesson questions can be reviewed without losing the current question', async ({ page }) => {
  const mission = MISSIONS.find((item) => item.id === 'sets-unit-fractions')!;
  // A lesson with ideas asks its first idea's practice first.
  const firstQuestion = ideaPracticeQuestions(mission)[0]!;

  await page.route('**/api/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not signed in.' }),
  }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await openDeveloperTesting(page);
  await page.getByTestId('select-developer-lesson').selectOption(mission.id);
  await page.getByTestId('button-open-developer-lesson').click();

  await completeIdeas(page, mission, { until: 1 });

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

  await openDeveloperTesting(page);
  await page.getByTestId('select-developer-lesson').selectOption('order-unlike-fractions');
  await page.getByTestId('button-open-developer-lesson').click();
  await expect(page.getByTestId('developer-test-banner')).toBeVisible();
  const storyGo = page.getByTestId('button-story-go');
  if (await storyGo.isVisible()) await storyGo.click();

  // A lesson with ideas opens on its first Learn page, which gets its audio ready.
  const section = page.getByTestId('idea-learn-screen');
  await expect(section).toBeVisible();
  await expect.poll(() => speechRequests.length, { timeout: 10_000 }).toBeGreaterThan(0);
  expect(speechRequests[0].voice).toBe('af_heart');
  expect(speechRequests[0].text?.trim()).toBeTruthy();
  await expect(page.getByTestId('button-listen-learning-text').first()).toBeVisible();
});

test('developer testing is off the child map: a grown-up turns on developer mode, then the Dev button opens it', async ({ page }) => {
  const mission = MISSIONS.find((item) => item.id === 'sets-unit-fractions')!;
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await expect(page.getByTestId('developer-module-test')).toHaveCount(0);
  await expect(page.getByTestId('button-dev-chip')).toHaveCount(0);

  await openDeveloperTesting(page);
  await page.getByTestId('checkbox-developer-mode').check();
  await page.getByTestId('button-parent-back').click();

  await page.getByTestId('button-dev-chip').click();
  await expect(page.getByRole('dialog', { name: 'Developer testing' })).toBeVisible();
  await page.getByTestId('select-developer-lesson').selectOption(mission.id);
  await page.getByTestId('button-open-developer-lesson').click();
  await expect(page.getByTestId('developer-test-banner')).toBeVisible();
  await page.getByTestId('button-exit-developer-test').click();
  // Developer mode stays on for this device until a grown-up turns it off.
  await expect(page.getByTestId('button-dev-chip')).toBeVisible();
});
