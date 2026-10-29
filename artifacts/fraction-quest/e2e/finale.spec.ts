/* The ending is part of the normal flow: finishing the last lesson, answering the last stone question and the finale plays
   by itself, once. Every chapter's reward also shows how the math won its piece, and offers the chapter's ending film. */
import { expect, test, type Page } from './fixtures';
import { MISSIONS } from '../src/game';
import { getBuildChecks, getWorksheet } from '../src/learning-content';

const last = MISSIONS[MISSIONS.length - 1]!;

/** Everything mastered, the course one lesson short of done: lesson 81's builds and worksheet are finished, "Finish lesson" is not pressed. */
async function seedLastLesson(page: Page, { reducedMotion = false, seen = false, upTo = MISSIONS.length - 1 }: { reducedMotion?: boolean; seen?: boolean; upTo?: number } = {}) {
  const record = (id: string, completed: boolean) => ({
    practiceDone: true, helpUses: 0, misconceptions: {},
    checks: Object.fromEntries(getBuildChecks(id).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
    worksheet: Object.fromEntries(getWorksheet(id).map((problem) => [problem.id, { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false }])),
    ...(completed ? { completedAt: 1 } : {}),
  });
  const done = MISSIONS.slice(0, upTo);
  const progress = {
    completedMissionIds: done.map((mission) => mission.id), starsByMission: {}, reviewQueue: [], assessments: [],
    learning: Object.fromEntries(MISSIONS.slice(0, upTo + 1).map((mission) => [mission.id, record(mission.id, done.includes(mission))])),
  };
  const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    story: { prologueSeen: true, choices: {}, ...(seen ? { epilogueSeen: true } : {}) },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion, seasonalThemes: false, storyMode: true } };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 664 });
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
}

/** Open a lesson whose practice is done, finish it, and answer its chapter's stone question (the fraction for `found` pieces). */
async function finishLessonAndStone(page: Page, missionId: string, correctChoice: number) {
  // Its builds and worksheet are done, so the map shows it finished: open the lesson page from its node ("Redo a part").
  await page.getByTestId(`button-node-${missionId}`).click({ force: true });
  await page.getByTestId(`button-redo-${missionId}`).click();
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await page.getByTestId('button-lab-finish').click();
  const breakOverlay = page.getByTestId('brain-break-overlay');
  if (await breakOverlay.isVisible()) await page.getByTestId('button-break-skip').click();
  const payoff = page.getByTestId('story-payoff');
  await expect(payoff.getByTestId('stone-question')).toBeVisible();
  await payoff.getByTestId(`button-stone-choice-${correctChoice}`).click();
  await payoff.getByTestId('button-stone-check').click();
}

const fits = async (page: Page) => expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);

test('finishing the last lesson plays the finale by itself, once, and the finale can be watched again', async ({ page }) => {
  await seedLastLesson(page);
  await finishLessonAndStone(page, last.id, 15 % 4);
  // No tap needed: the finale film starts as soon as the last stone question is answered.
  await expect(page.getByTestId('story-comic')).toBeVisible();
  await expect(page.getByTestId('story-stage')).toBeVisible();
  await fits(page);
  await page.screenshot({ path: test.info().outputPath('finale-film-390.png') });
  // It can be skipped to its last picture, and every beat is there for a screen reader.
  await page.getByTestId('button-story-skip').click();
  await expect(page.getByTestId('story-panel-1')).toContainText('I am sorry I cracked it');
  await expect(page.getByTestId('story-panel-2')).toContainText('That makes him brave');
  await expect(page.getByTestId('story-panel-3')).toContainText('Keeper of the Whole Stone');
  await expect(page.getByTestId('story-panel-4')).toContainText('A new mystery every week');
  await expect(page.getByTestId('story-panel-5')).toContainText('a new riddle waits by the stone');
  await fits(page);
  await page.screenshot({ path: test.info().outputPath('finale-end-390.png') });
  await expect(page.getByTestId('button-story-go')).toContainText('See my Keeper card');
  await page.getByTestId('button-story-go').click();
  // Back on the reward: the stone is whole, the Keeper card shows, and the math that won it is told.
  const payoff = page.getByTestId('story-payoff');
  await expect(payoff.getByTestId('stone-found')).toContainText('15 of 15');
  await expect(payoff.getByTestId('keeper-card')).toBeVisible();
  await expect(payoff.getByTestId('story-won')).toContainText('How the math won it: Fifteen fifteenths make 1 whole');
  await expect(page.getByTestId('stone-question')).toHaveCount(0);
  await fits(page);
  await page.screenshot({ path: test.info().outputPath('finale-reward-390.png'), fullPage: true });
  // Seen once: saved, so it never takes over again, but a button watches it again.
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-quest-fun-v1:guest') ?? localStorage.getItem('fraction-quest-fun-v1') ?? '{}').story?.epilogueSeen)).toBe(true);
  await payoff.getByTestId('button-watch-finale').click();
  await expect(page.getByTestId('story-comic')).toBeVisible();
  await page.getByTestId('button-story-skip').click();
  await expect(page.getByTestId('story-panel-3')).toContainText('Keeper of the Whole Stone');
  await page.getByTestId('button-story-go').click();
  await expect(page.getByTestId('keeper-card')).toBeVisible();
  // And from the Storybook, as before.
  await page.getByTestId('button-return-map').click();
  await page.getByTestId('button-open-storybook').click();
  await expect(page.getByTestId('storybook-finale')).toBeEnabled();
});

test('a child who has seen the finale is not made to watch it again', async ({ page }) => {
  await seedLastLesson(page, { seen: true });
  await finishLessonAndStone(page, last.id, 15 % 4);
  const payoff = page.getByTestId('story-payoff');
  await expect(payoff.getByTestId('stone-found')).toContainText('15 of 15');
  await expect(page.getByTestId('story-comic')).toHaveCount(0);
  await expect(payoff.getByTestId('button-watch-finale')).toBeVisible();
});

test('with Reduce motion on, the finale still plays, the camera stays still, and it fits a phone', async ({ page }) => {
  await seedLastLesson(page, { reducedMotion: true });
  await expect(page.locator('html')).toHaveClass(/fq-reduced-motion/);
  await finishLessonAndStone(page, last.id, 15 % 4);
  await expect(page.getByTestId('story-comic')).toBeVisible();
  const camera = page.getByTestId('story-panels').locator('.fq-cine-cam').first();
  await expect(camera).toBeAttached();
  for (let shot = 0; shot < 3; shot++) {
    await page.waitForTimeout(700);
    expect(await camera.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  }
  await fits(page);
  await page.getByTestId('button-story-skip').click();
  await page.getByTestId('button-story-go').click();
  await expect(page.getByTestId('keeper-card')).toBeVisible();
});

test('every chapter reward tells how the math won the piece and offers the chapter ending, which comes back to the reward', async ({ page }) => {
  // Chapter 2's last lesson, with chapter 1 done and every other lesson before it mastered.
  const chapterTwo = MISSIONS.filter((mission) => mission.unit === 2);
  const lastOfTwo = chapterTwo[chapterTwo.length - 1]!;
  await seedLastLesson(page, { upTo: MISSIONS.indexOf(lastOfTwo) });
  await finishLessonAndStone(page, lastOfTwo.id, 2 % 4);
  const payoff = page.getByTestId('story-payoff');
  await expect(payoff.getByTestId('stone-found')).toContainText('2 of 15');
  await expect(payoff.getByTestId('story-won')).toContainText('How the math won it: Thirds are bigger than eighths');
  await expect(page.getByTestId('story-comic')).toHaveCount(0); // a chapter ending is offered, not forced
  await fits(page);
  await page.screenshot({ path: test.info().outputPath('chapter-reward-390.png'), fullPage: true });
  await payoff.getByTestId('button-watch-chapter-end').click();
  await page.getByTestId('button-story-skip').click();
  await expect(page.getByTestId('story-panel-2')).toContainText('How the math won it');
  await expect(page.getByTestId('button-story-go')).toContainText('Back to my stone piece');
  await page.getByTestId('button-story-go').click();
  await expect(page.getByTestId('story-payoff').getByTestId('stone-found')).toContainText('2 of 15');
  await expect(page.getByTestId('story-won')).toBeVisible();
});

test('after the ending, the lantern card and the riddle prize bring Chomp\'s mystery of the week', async ({ page }) => {
  await seedLastLesson(page, { seen: true, upTo: MISSIONS.length });
  await expect(page.getByTestId('tonights-lantern-notes')).toContainText('Chomp’s mystery of the week is waiting.');
});
