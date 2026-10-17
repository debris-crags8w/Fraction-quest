import { expect, test } from '@playwright/test';
import { MISSIONS } from '../src/game';

test('a family can review and reset one unit without losing progress elsewhere', async ({ page }) => {
  const firstUnitLesson = MISSIONS.find((mission) => mission.unit === 1)!;
  const secondUnitLesson = MISSIONS.find((mission) => mission.unit === 2)!;
  const progress = {
    completedMissionIds: [firstUnitLesson.id, secondUnitLesson.id],
    starsByMission: { [firstUnitLesson.id]: 3, [secondUnitLesson.id]: 2 },
    reviewQueue: [],
    learning: {
      [firstUnitLesson.id]: { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} },
      [secondUnitLesson.id]: { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} },
    },
    challengeBest: { '1': 18, '2': 14 },
    assessments: [],
  };
  const fun = {
    xp: 120,
    day: '2026-10-13',
    answeredToday: 3,
    dayStreak: 2,
    lastActiveDay: '2026-10-13',
    sound: false,
    raceBest: { [firstUnitLesson.id]: 12, [secondUnitLesson.id]: 15 },
    codeLevels: { [firstUnitLesson.id]: 4, [secondUnitLesson.id]: 2 },
    breakPreferences: { intervalMinutes: 20, quietMode: true },
    displayPreferences: { textSize: 'large', highContrast: true, reducedMotion: true },
    preferredLearningVoiceId: 'family-voice',
  };

  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not signed in.' }),
  }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();

  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-reset-progress').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByTestId('reset-unit-preview')).toContainText(firstUnitLesson.title);
  await expect(page.getByTestId('reset-unit-preview')).toContainText('3 stars');
  await page.getByTestId('select-reset-unit').selectOption('2');
  await expect(page.getByTestId('reset-unit-preview')).toContainText(secondUnitLesson.title);
  await expect(page.getByTestId('reset-unit-preview')).toContainText('2 stars');
  await expect(page.getByTestId('reset-unit-preview')).toContainText('All other units, account settings, and unrelated progress will remain unchanged.');
  await page.getByTestId('select-reset-unit').selectOption('1');
  await page.getByTestId('button-confirm-unit-reset').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();

  const saved = await page.evaluate(() => ({
    progress: JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? 'null'),
    fun: JSON.parse(localStorage.getItem('fraction-quest-fun-v1:guest') ?? 'null'),
  }));
  expect(saved.progress.completedMissionIds).toEqual([secondUnitLesson.id]);
  expect(saved.progress.starsByMission).toEqual({ [secondUnitLesson.id]: 2 });
  expect(saved.progress.learning).toEqual({ [secondUnitLesson.id]: progress.learning[secondUnitLesson.id] });
  expect(saved.progress.challengeBest).toEqual({ '2': 14 });
  expect(saved.fun.raceBest).toEqual({ [secondUnitLesson.id]: 15 });
  expect(saved.fun.codeLevels).toEqual({ [secondUnitLesson.id]: 2 });
  expect(saved.fun.xp).toBe(fun.xp);
  expect(saved.fun.dayStreak).toBe(fun.dayStreak);
  expect(saved.fun.breakPreferences).toEqual(fun.breakPreferences);
  expect(saved.fun.displayPreferences).toEqual({ ...fun.displayPreferences, seasonalThemes: true, storyMode: true });
  expect(saved.fun.preferredLearningVoiceId).toBe(fun.preferredLearningVoiceId);
});
