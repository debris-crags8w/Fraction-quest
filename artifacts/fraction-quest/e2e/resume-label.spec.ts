import { expect, test } from './fixtures';

/** Open the map as a guest with this saved progress. */
async function openMap(page: import('@playwright/test').Page, learning: Record<string, unknown>) {
  await page.addInitScript((saved) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [], assessments: [], learning: saved }));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
      story: { prologueSeen: true, choices: {} },
      displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: true, seasonalThemes: false, storyMode: true } }));
  }, learning);
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
}

test('a lesson the child has started says Resume on the map, not Start', async ({ page }) => {
  await openMap(page, { 'equal-parts': { checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, practiceAt: { index: 2, firstTry: 2 } } });
  const button = page.getByTestId('button-start-mission-equal-parts');
  if (!(await button.isVisible())) await page.getByTestId('button-node-equal-parts').click();
  await expect(button).toContainText('Resume lesson');
  await expect(button).not.toContainText('Start');
});

test('a lesson not started yet still says Start lesson', async ({ page }) => {
  await openMap(page, {});
  const button = page.getByTestId('button-start-mission-equal-parts');
  if (!(await button.isVisible())) await page.getByTestId('button-node-equal-parts').click();
  await expect(button).toContainText('Start lesson');
});
