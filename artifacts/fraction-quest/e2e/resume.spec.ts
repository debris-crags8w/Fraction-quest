import { expect, test, type Page } from './fixtures';
import { buildAssessmentItems, getAssessmentDefinitions } from '../src/assessments';

async function open(page: Page, progress: Record<string, unknown>) {
  await page.addInitScript((saved) => {
    if (!localStorage.getItem('fraction-quest-fun-v1:guest')) {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(saved));
      localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-01-01', answeredToday: 0, dayStreak: 0, lastActiveDay: '2026-01-01', sound: false, story: { prologueSeen: true } }));
    }
  }, progress);
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
}

const base = { completedMissionIds: ['equal-parts', 'fraction-names'], starsByMission: {}, reviewQueue: [], assessments: [],
  learning: Object.fromEntries(['equal-parts', 'fraction-names'].map((id) => [id, { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, completedAt: 1 }])) };

test('a Check-in left partway picks up at the next question with the same questions, or starts over', async ({ page }) => {
  const definition = getAssessmentDefinitions().find((item) => item.id === 'unit-1-end')!;
  const items = buildAssessmentItems(definition, 4242);
  const responses = items.slice(0, 2).map((item) => ({ itemId: item.id, standards: item.standards, modelBuilt: true, correct: true }));
  await open(page, { ...base, assessmentDraft: { assessmentId: 'unit-1-end', seed: 4242, startedAt: Date.now() - 60_000, responses } });
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-assessments').click();

  const resume = page.getByTestId('button-resume-unit-1-end');
  await expect(resume).toHaveText(/Resume · question 3 of 12/);
  await resume.click();
  await expect(page.getByTestId('taskbar-progress')).toHaveAttribute('title', 'Question 3 of 12');
  await expect(page.locator('.fq-question-text').first()).toContainText(items[2].prompt.replace(/\s*\d+\/\d+.*$/, '').slice(0, 15));

  // Start over: a fresh Check-in from question 1, and no "Resume" left behind.
  await page.getByTestId('button-assessment-exit').click();
  await page.getByTestId('button-restart-unit-1-end').click();
  await expect(page.getByTestId('taskbar-progress')).toHaveAttribute('title', 'Question 1 of 12');
  await page.getByTestId('button-assessment-exit').click();
  await expect(page.getByTestId('button-resume-unit-1-end')).toHaveCount(0);
  await expect(page.getByTestId('button-start-unit-1-end')).toBeVisible();
});

test('picked practice left partway picks up at the same question', async ({ page }) => {
  await open(page, { ...base, grownUpPicks: [{ kind: 'practice', id: 'fraction-names', at: Date.now(), seed: 777, index: 2, firstTry: 1 }] });
  const button = page.getByTestId('button-picked-practice-fraction-names');
  await expect(button).toContainText('Question 3 of 5');
  await button.click();
  await expect(page.locator('.fq-play-kicker')).toContainText('Question 3 of 5');
});
