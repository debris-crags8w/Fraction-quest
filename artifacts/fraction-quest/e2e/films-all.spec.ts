import { expect, test, type Page } from './fixtures';

/* Every film (the prologue, each chapter's opening and ending, and the finale) on a phone: it opens with Skip in reach,
   fits without scrolling, nothing jumps while it plays, and Skip lands on a Next that is also in reach. With Reduce
   motion, nothing moves at all. */

async function openStorybook(page: Page, reducedMotion: boolean) {
  const { MISSIONS } = await import('../src/game');
  const { getBuildChecks, getWorksheet } = await import('../src/learning-content');
  // Every lesson finished, so every chapter ending and the finale can be watched.
  const learning = Object.fromEntries(MISSIONS.map((mission) => [mission.id, { practiceDone: true, helpUses: 0, misconceptions: {}, completedAt: 1,
    checks: Object.fromEntries(getBuildChecks(mission.id).map((check) => [check.id, { passed: true }])),
    worksheet: Object.fromEntries(getWorksheet(mission.id).map((row) => [row.id, { draft: row.answer, checkedValue: row.answer }])) }]));
  const progress = { completedMissionIds: MISSIONS.map((mission) => mission.id), starsByMission: {}, reviewQueue: [], assessments: [], learning };
  const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false, story: { prologueSeen: true, choices: {} },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion, seasonalThemes: false, storyMode: true } };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  return MISSIONS;
}

for (const reducedMotion of [false, true]) {
  test(`every film fits a phone, keeps Skip and Next in reach and never jumps${reducedMotion ? ', and stays still with Reduce motion' : ''}`, async ({ page }) => {
    test.setTimeout(6 * 60_000);
    const MISSIONS = await openStorybook(page, reducedMotion);
    const { CHAPTERS } = await import('../src/story');
    const book = async () => {
      await page.goto('/');
      const guest = page.getByTestId('button-play-guest');
      await expect(guest.or(page.getByTestId('button-open-storybook'))).toBeVisible({ timeout: 20_000 });
      if (await guest.isVisible()) await guest.click();
      await page.getByTestId('button-open-storybook').click();
    };
    const chapterButton = async (unit: number, testId: string) => {
      await page.getByTestId(`storybook-chapter-${unit}`).evaluate((details) => { (details as HTMLDetailsElement).open = true; });
      await page.getByTestId(testId).click();
    };
    const films: [string, () => Promise<void>][] = [['prologue', () => page.getByTestId('button-storybook-prologue').click()]];
    for (const chapter of CHAPTERS) {
      const first = MISSIONS.find((mission) => mission.unit === chapter.unit)!;
      films.push([`chapter ${chapter.unit} opening`, () => chapterButton(chapter.unit, `button-storybook-part-${first.id}`)]);
      films.push([`chapter ${chapter.unit} ending`, () => chapterButton(chapter.unit, `button-storybook-end-${chapter.unit}`)]);
    }
    films.push(['finale', () => page.getByTestId('storybook-finale').click()]);

    const inReach = async (testId: string) => {
      const box = await page.getByTestId(testId).boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= 844;
    };
    const overflow = () => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (const [name, open] of films) {
      await book();
      await open();
      await expect(page.getByTestId('story-comic'), name).toBeVisible();
      await page.evaluate(() => {
        const watch = window as unknown as { shift: number };
        watch.shift = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!entry.hadRecentInput) watch.shift += entry.value;
        }).observe({ type: 'layout-shift' });
      });
      await expect.poll(() => inReach('button-story-skip'), { message: `${name}: Skip is on screen` }).toBe(true);
      if (reducedMotion) {
        // Motion means something moving or growing: any keyframe animation, or a transition of place or size. A short
        // fade is fine.
        const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running')
          .filter((animation) => 'animationName' in animation || /transform|left|top|right|bottom|width|height|translate|scale|rotate/.test((animation as CSSTransition).transitionProperty))
          .map((animation) => `${(animation as CSSAnimation).animationName ?? (animation as CSSTransition).transitionProperty} on ${((animation.effect as KeyframeEffect).target as Element)?.className}`));
        expect(running, `${name}: nothing moves with Reduce motion`).toEqual([]);
      }
      await page.waitForTimeout(1500);
      expect(await overflow(), `${name}: fits while it plays`).toBeLessThanOrEqual(0);
      await page.getByTestId('button-story-skip').click();
      await expect(page.getByTestId('button-story-go')).toBeVisible();
      await expect.poll(() => inReach('button-story-go'), { message: `${name}: Next is on screen at the end` }).toBe(true);
      expect(await overflow(), `${name}: fits at the end`).toBeLessThanOrEqual(0);
      expect(await page.evaluate(() => (window as unknown as { shift: number }).shift), `${name}: nothing jumps`).toBeLessThan(0.02);
    }
  });
}
