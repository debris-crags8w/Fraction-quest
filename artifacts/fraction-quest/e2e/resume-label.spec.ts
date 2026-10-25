import { expect, test } from './fixtures';
import { MISSIONS } from '../src/game';
import { practicePlan } from '../src/lesson-ideas';

const lesson1 = MISSIONS[0]!;

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
  await openMap(page, { 'fraction-names': { checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, practiceAt: { index: 2, firstTry: 2, plan: practicePlan(lesson1) } } });
  const button = page.getByTestId('button-start-mission-fraction-names');
  if (!(await button.isVisible())) await page.getByTestId('button-node-fraction-names').click();
  await expect(button).toContainText('Resume lesson');
  await expect(button).not.toContainText('Start');
});

test('a lesson not started yet still says Start lesson', async ({ page }) => {
  await openMap(page, {});
  const button = page.getByTestId('button-start-mission-fraction-names');
  if (!(await button.isVisible())) await page.getByTestId('button-node-fraction-names').click();
  await expect(button).toContainText('Start lesson');
});

for (const [name, plan] of [['no plan', undefined], ["another version's plan", 'old-plan']] as const) {
  test(`a place saved before the lesson changed (${name}) starts the lesson over, at its first idea`, async ({ page }) => {
    // Its question number counted an older practice list, so it would land in the wrong place.
    await openMap(page, { 'fraction-names': { checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, practiceAt: { index: 4, firstTry: 3, ...(plan ? { plan } : {}) } } });
    const button = page.getByTestId('button-start-mission-fraction-names');
    if (!(await button.isVisible())) await page.getByTestId('button-node-fraction-names').click();
    await expect(button).toContainText('Start lesson');
    await button.click();
    const kicker = page.getByTestId('idea-kicker');
    for (let screen = 0; screen < 4 && !(await kicker.isVisible()); screen++) {
      for (const id of ['button-story-intro-go', 'button-story-skip', 'button-story-choice-0', 'button-story-go']) {
        const step = page.getByTestId(id);
        if (await step.isVisible()) await step.click();
      }
      await page.waitForTimeout(100);
    }
    await expect(kicker).toContainText('Idea 1 of 4 · Learn');
  });
}
