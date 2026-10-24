import { expect, test, type Page } from './fixtures';

/* Tonight's lantern: today's one task on the map, under the Whole Stone, once the first lesson is done. */

const dayBefore = (n: number) => {
  const date = new Date();
  date.setDate(date.getDate() - n);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

async function openMap(page: Page, { lessons = 1, streakDays = 5, answeredToday = 0, storyMode = true } = {}) {
  const { MISSIONS } = await import('../src/game');
  const done = MISSIONS.slice(0, lessons).map((mission) => mission.id);
  const progress = { completedMissionIds: done, starsByMission: {}, reviewQueue: [], assessments: [],
    learning: Object.fromEntries(done.map((id) => [id, { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, completedAt: 1 }])) };
  // A streak that reached yesterday (or today, when today already has right answers).
  const activity = Object.fromEntries([...Array.from({ length: streakDays }, (_, i) => [dayBefore(i + 1), { minutes: 10, answered: 12 }]),
    ...(answeredToday ? [[dayBefore(0), { minutes: 5, answered: answeredToday }]] : [])]);
  const fun = { xp: 300, day: answeredToday ? dayBefore(0) : dayBefore(1), answeredToday, sound: false,
    dayStreak: streakDays + (answeredToday ? 1 : 0), lastActiveDay: streakDays || answeredToday ? (answeredToday ? dayBefore(0) : dayBefore(1)) : null, spareOil: 1, activity,
    story: { prologueSeen: true, choices: { '1': 0 } },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: true, seasonalThemes: false, storyMode } };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
}

test('a returning child sees tonight’s lantern under the Whole Stone, and its button opens Chomp’s riddles', async ({ page }) => {
  await openMap(page);
  const card = page.getByTestId('tonights-lantern');
  await expect(card).toHaveAttribute('data-state', 'waiting');
  await expect(card).toContainText('Tonight’s lantern');
  await expect(card).toContainText('5 nights in a row');
  await expect(card).toContainText('1 spare drop of oil');
  await expect(card.locator('li')).toHaveCount(7);
  // It comes before "Jump to current section", and both fit the first screen.
  const [cardBox, jumpBox] = await Promise.all([card.boundingBox(), page.getByTestId('button-jump-current').boundingBox()]);
  expect(cardBox!.y).toBeLessThan(jumpBox!.y);
  await page.getByTestId('button-tonights-lantern').click();
  await expect(page.getByText('Daily practice').first()).toBeVisible();
  await expect(page.getByTestId('tonights-lantern')).toHaveCount(0);
});

test('a lantern lit by a lesson today shows as lit, and keeps the riddles one tap away', async ({ page }) => {
  await openMap(page, { answeredToday: 3 });
  const card = page.getByTestId('tonights-lantern');
  await expect(card).toHaveAttribute('data-state', 'lit');
  await expect(card).toContainText('Tonight’s lantern is lit!');
  await expect(card).toContainText('6 nights in a row');
  await expect(page.getByTestId('tonights-lantern-notes')).toContainText('1 more night to earn a spare drop of oil.');
  await expect(page.getByTestId('button-tonights-lantern')).toHaveText(/Chomp’s 5 riddles/);
});

test('with the story off the card is plain, and a brand-new child sees their first lesson instead', async ({ page, browser }) => {
  await openMap(page, { storyMode: false });
  const card = page.getByTestId('tonights-lantern');
  await expect(card).toContainText('Today’s practice');
  await expect(card).toContainText('5 days in a row');
  await expect(card).not.toContainText('Hoot');
  await expect(page.getByTestId('button-tonights-lantern')).toHaveText(/Start: 5 review questions/);

  const fresh = await browser.newPage();
  await openMap(fresh, { lessons: 0, streakDays: 0 });
  await expect(fresh.getByTestId('button-continue-course').or(fresh.getByTestId('chapter-banner-1')).first()).toBeVisible();
  await expect(fresh.getByTestId('tonights-lantern')).toHaveCount(0);
  await fresh.close();
});
