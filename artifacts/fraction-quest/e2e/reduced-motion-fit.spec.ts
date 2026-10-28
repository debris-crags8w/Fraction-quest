/* With Reduce motion on, a phone screen (390 × 664, an iPhone in Safari) still shows the button that goes on (Next, or
   Finish) in full after Check, on every question of a few representative lessons. */
import { expect, test } from './fixtures';
import { MISSIONS } from '../src/game';
import { getBuildChecks, getWorksheet } from '../src/learning-content';
import { completeIdeas, finishPutTogether } from './lesson-walk';

type Page = import('@playwright/test').Page;

const DAY = new Date(2026, 2, 10, 10, 0, 0);
const dayKey = `${DAY.getFullYear()}-${String(DAY.getMonth() + 1).padStart(2, '0')}-${String(DAY.getDate()).padStart(2, '0')}`;

const mastered = (missionId: string) => ({
  practiceDone: true, helpUses: 0, misconceptions: {}, completedAt: 1,
  checks: Object.fromEntries(getBuildChecks(missionId).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
  worksheet: Object.fromEntries(getWorksheet(missionId).map((problem) => [problem.id, { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false }])),
});

/** A new lesson opens with story screens (the setup and prologue once, then the chapter comic, which may ask for a choice). */
async function passStory(page: Page) {
  for (let screen = 0; screen < 3; screen++) {
    await page.waitForTimeout(50);
    const introGo = page.getByTestId('button-story-intro-go');
    if (await introGo.isVisible()) { await introGo.click(); continue; }
    const skip = page.getByTestId('button-story-skip');
    if (await skip.isVisible()) await skip.click();
    const go = page.getByTestId('button-story-go');
    if (!(await go.isVisible())) return;
    const choice = page.getByTestId('button-story-choice-0');
    if (await choice.isVisible()) await choice.click();
    await go.click();
  }
}

/** The lessons: the first (its first-lesson screens, bars, areas), one with number lines, one with the longest question
    and one with long story problems, which also end in "Put it together". */
const LESSONS = ['fraction-names', 'number-line-basics', 'line-plot-totals', 'multi-step-fraction-stories'];

for (const reducedMotion of [true, false]) {
  for (const id of LESSONS) {
    test(`${reducedMotion ? 'with reduced motion' : 'with motion'}, after Check the button that goes on is fully on an iPhone screen: ${id}`, async ({ page }) => {
      test.setTimeout(300_000);
      const index = MISSIONS.findIndex((mission) => mission.id === id);
      const lesson = MISSIONS[index]!;
      const learning = Object.fromEntries(MISSIONS.slice(0, index).map((mission) => [mission.id, mastered(mission.id)]));
      if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.clock.setFixedTime(DAY);
      await page.addInitScript(({ progress, fun }) => {
        if (localStorage.getItem('fraction-quest-fun-v1:guest')) return;
        localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
        localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(fun));
      }, {
        progress: { completedMissionIds: MISSIONS.slice(0, index).map((mission) => mission.id), starsByMission: {}, reviewQueue: [], assessments: [], learning },
        fun: { xp: 0, day: dayKey, answeredToday: 0, sound: false, story: { prologueSeen: true }, breakPreferences: { intervalMinutes: 0, quietMode: false },
          displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion, seasonalThemes: false, storyMode: true } },
      });
      await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
      await page.setViewportSize({ width: 390, height: 664 });
      await page.goto('/');
      await page.getByTestId('button-play-guest').click();
      await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
      if (reducedMotion) await expect(page.locator('html')).toHaveClass(/fq-reduced-motion/);
      const start = page.getByTestId(`button-start-mission-${id}`);
      if (!(await start.isVisible())) await page.getByTestId(`button-node-${id}`).click({ force: true });
      await start.click();
      await passStory(page);

      const hidden: string[] = [];
      const inView = async (button: import('@playwright/test').Locator, where: string) => {
        await page.waitForTimeout(700); // the feedback sheet has settled
        const box = await button.boundingBox();
        const screen = page.viewportSize()!;
        if (!box || box.y < 0 || box.y + box.height > screen.height) hidden.push(`${where}: ${box ? `the button ends at ${Math.round(box.y + box.height)}` : 'no button'}, screen ${screen.height}`);
      };
      let asked = 0;
      const hooks = {
        // A wrong answer first (on the first questions): its Try again button is in view too.
        onQuestion: async (question: { id: string; correctChoice: number; choices: unknown[] }, where: string) => {
          if (asked++ > 1) return;
          await page.getByTestId(`button-answer-${question.id}-${(question.correctChoice + 1) % question.choices.length}`).click();
          await page.getByTestId('button-check-answer').click();
          await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'retry');
          await inView(page.getByTestId('button-try-again'), `${where} (a wrong answer)`);
          await page.getByTestId('button-try-again').click();
          await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
        },
        // After Check the whole button is in view: no scrolling to reach it.
        afterCheck: (moveOn: import('@playwright/test').Locator, where: string) => inView(moveOn, where),
      };
      await completeIdeas(page, lesson, hooks);
      await finishPutTogether(page, lesson, hooks);
      expect(hidden, 'questions whose Next or Finish button is not fully on screen after Check').toEqual([]);
    });
  }
}
