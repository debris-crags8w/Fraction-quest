import { expect, test, type Page } from '@playwright/test';

/** Open chapter 2 in the Storybook with the given lessons finished. */
async function openChapterTwo(page: Page, done: string[]) {
  const progress = { completedMissionIds: done, starsByMission: {}, reviewQueue: [], assessments: [],
    learning: Object.fromEntries(done.map((id) => [id, { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, completedAt: 1 }])) };
  const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    story: { prologueSeen: true, choices: { '1': 0, '2': 0 } },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: true } };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByRole('button', { name: /Chapter 2, Pond/ }).click();
}

const unitOne = ['equal-parts', 'fraction-names', 'unit-fractions'];

test('chapter 2 film shows more equal parts making smaller parts, not equal groups', async ({ page }) => {
  await openChapterTwo(page, unitOne);
  await page.getByRole('button', { name: /Chapter start · More parts, smaller parts/ }).click();
  await page.getByTestId('button-story-skip').click();
  const stage = page.getByTestId('story-stage');
  await expect(stage.getByRole('img', { name: /One half and one fourth side by side: the half is bigger/ })).toBeAttached();
  await expect(stage.locator('.fq-cine-cutbar.is-halves i')).toHaveCount(2);
  await expect(stage.locator('.fq-cine-cutbar.is-fourths i')).toHaveCount(4);
  await expect(stage.locator('.fq-cine-plate, .fq-cine-snack')).toHaveCount(0);
  // Equal parts look equal: both bars are the same length, and the half is twice the fourth.
  const [halves, fourths] = await Promise.all([stage.locator('.fq-cine-cutbar.is-halves').boundingBox(), stage.locator('.fq-cine-cutbar.is-fourths').boundingBox()]);
  expect(Math.abs(halves!.width - fourths!.width)).toBeLessThan(1);
  const half = await stage.locator('.fq-cine-cutbar.is-halves i').first().boundingBox();
  const fourth = await stage.locator('.fq-cine-cutbar.is-fourths i').first().boundingBox();
  expect(half!.width / fourth!.width).toBeGreaterThan(1.9);
});

test('lesson 2 plays in the chapter\'s place with the speakers, and no story props', async ({ page }) => {
  await openChapterTwo(page, [...unitOne, 'unit-size']);
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('story-panels')).toHaveClass(/is-pond/);
  await expect(page.getByTestId('story-set-speaker')).toBeVisible();
  await expect(page.getByTestId('story-stage').locator('.fq-cine-pond')).toBeAttached();
  await expect(page.getByTestId('story-stage').locator('.fq-cine-cutbar, .fq-cine-bowl')).toHaveCount(0);
  await page.getByTestId('button-story-skip').click();
  await expect(page.getByTestId('button-story-go')).toBeVisible();
});
