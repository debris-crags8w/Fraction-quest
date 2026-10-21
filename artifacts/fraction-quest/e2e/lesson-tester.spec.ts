import { expect, test, type Page } from '@playwright/test';
import { MISSIONS } from '../src/game';
import { CHALLENGES } from '../src/challenges';

/* The Lesson tester: a development-only page (?lessons) that lists every lesson by unit and opens each one, its
   builds and worksheet, or its unit challenge as an isolated test that is never saved. */

const saved = (page: Page) => page.evaluate(() => ({
  progress: localStorage.getItem('fraction-quest-progress-v1:guest'),
  fun: localStorage.getItem('fraction-quest-fun-v1:guest'),
}));

async function openTester(page: Page) {
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/?lessons');
  // A new visitor first picks "play as a guest"; the tester opens right after.
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('lesson-tester'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  await expect(page.getByTestId('lesson-tester')).toBeVisible();
}

const unitNine = MISSIONS.find((mission) => mission.unit === 9)!;

test('?lessons opens the tester with all 15 units and every lesson', async ({ page }) => {
  await openTester(page);
  await expect(page.getByRole('heading', { name: 'Lesson tester' })).toBeVisible();
  await expect(page.getByTestId('lesson-tester')).toContainText('never saved');
  await expect(page.locator('section[data-testid^="tester-unit-"]')).toHaveCount(15);
  await expect(page.locator('li[data-testid^="tester-lesson-"]')).toHaveCount(MISSIONS.length);
  await expect(page.getByTestId('tester-unit-9')).toContainText(/Unit 9 · /);
  await expect(page.getByTestId('tester-unit-9-count')).toHaveText(`0 of ${MISSIONS.filter((m) => m.unit === 9).length} tested`);
  const row = page.getByTestId(`tester-lesson-${unitNine.id}`);
  await expect(row).toContainText(unitNine.title);
  await expect(row).toContainText(`Grade ${unitNine.gradeBand}`);
  await expect(row).toContainText(unitNine.standards![0]);
  await page.getByTestId('button-tester-back').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
});

test('Start opens a later lesson as an isolated test from its beginning and comes back to the tester', async ({ page }) => {
  await openTester(page);
  const before = await saved(page);
  await page.getByTestId(`button-tester-start-${unitNine.id}`).click();
  await expect(page.getByTestId('developer-test-banner')).toBeVisible();
  // The lesson starts at its beginning: the chapter's story comes first.
  await expect(page.getByTestId('story-comic')).toBeVisible();
  await page.getByTestId('button-exit-developer-test').click();
  await expect(page.getByTestId('lesson-tester')).toBeVisible();
  await expect(page.getByTestId(`tester-unit-${unitNine.unit}`)).toBeInViewport();
  await expect(page.getByTestId('developer-test-banner')).toHaveCount(0);
  expect(await saved(page)).toEqual(before);
});

test('Builds & worksheet opens the lesson lab in an isolated test', async ({ page }) => {
  await openTester(page);
  const before = await saved(page);
  await page.getByTestId(`button-tester-lab-${unitNine.id}`).click();
  await expect(page.getByTestId('developer-test-banner')).toBeVisible();
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await page.getByTestId('button-exit-developer-test').click();
  await expect(page.getByTestId('lesson-tester')).toBeVisible();
  expect(await saved(page)).toEqual(before);
});

test('Unit challenge opens the challenge in an isolated test', async ({ page }) => {
  await openTester(page);
  await page.getByTestId('button-tester-challenge-12').click();
  await expect(page.getByTestId('developer-test-banner')).toBeVisible();
  await expect(page.getByTestId(`button-challenge-${CHALLENGES[12][0].id}-A`)).toBeVisible();
  await page.getByTestId('button-exit-developer-test').click();
  await expect(page.getByTestId('lesson-tester')).toBeVisible();
  await expect(page.getByTestId('tester-unit-12')).toBeInViewport();
});

test('a Tested tick stays after a reload and updates the unit count; Clear ticks resets them', async ({ page }) => {
  await openTester(page);
  const total = MISSIONS.filter((m) => m.unit === 9).length;
  await page.getByTestId(`checkbox-tester-tested-${unitNine.id}`).check();
  await expect(page.getByTestId('tester-unit-9-count')).toHaveText(`1 of ${total} tested`);
  await page.reload();
  await expect(page.getByTestId('lesson-tester')).toBeVisible();
  await expect(page.getByTestId(`checkbox-tester-tested-${unitNine.id}`)).toBeChecked();
  await expect(page.getByTestId('tester-unit-9-count')).toHaveText(`1 of ${total} tested`);
  await page.getByTestId('button-tester-clear').click();
  await expect(page.getByTestId(`checkbox-tester-tested-${unitNine.id}`)).not.toBeChecked();
  await expect(page.getByTestId('tester-unit-9-count')).toHaveText(`0 of ${total} tested`);
});

test('the grown-ups Developer testing section and the map Dev chip open the tester', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await page.getByTestId('checkbox-developer-mode').check();
  await page.getByTestId('button-open-lesson-tester').click();
  await expect(page.getByTestId('lesson-tester')).toBeVisible();
  await page.getByTestId('button-tester-back').click();
  await page.getByTestId('button-dev-chip').click();
  await page.getByTestId('button-dev-open-lesson-tester').click();
  await expect(page.getByTestId('lesson-tester')).toBeVisible();
});
