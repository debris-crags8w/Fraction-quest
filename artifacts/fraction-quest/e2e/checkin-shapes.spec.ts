import { expect, test, type Page } from './fixtures';
import { MISSIONS } from '../src/game';
import { assessmentItemCount, assessmentResponse, buildAssessmentItems, getAssessmentDefinitions } from '../src/assessments';

/* Check-ins ask the equal-area shapes lesson and the decimal-grid lesson: the shape or the grids are drawn read-only, then the child answers. */

const SHOTS = process.env.CHECKIN_SHOTS ?? '';
const signedOut = (page: Page) => page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
const FUN = { xp: 0, day: '2026-01-01', answeredToday: 0, sound: false, story: { prologueSeen: true }, breakPreferences: { intervalMinutes: 0, quietMode: false } };

function find(lesson: string, ids: string[]) {
  for (const id of ids) {
    const definition = getAssessmentDefinitions().find((d) => d.id === id)!;
    for (let seed = 1; seed < 200; seed++) {
      const items = buildAssessmentItems(definition, seed);
      const at = items.findIndex((item) => item.missionId === lesson && !item.visualFractions && !item.problem.model);
      if (at >= 0) return { definition, seed, at, items };
    }
  }
  throw new Error(`no Check-in asks ${lesson}`);
}

async function resumeAt(page: Page, found: ReturnType<typeof find>) {
  await page.setViewportSize({ width: 390, height: 664 });
  const responses = found.items.slice(0, found.at).map((item) => assessmentResponse(item, true, item.answer));
  const progress = { completedMissionIds: MISSIONS.slice(0, 90).map((m) => m.id), starsByMission: {}, reviewQueue: [], learning: {}, assessments: [],
    assessmentDraft: { assessmentId: found.definition.id, seed: found.seed, startedAt: 1, responses } };
  await page.addInitScript(({ p, fun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(p));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(fun));
  }, { p: progress, fun: FUN });
  await signedOut(page);
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-assessments').click();
  await page.getByTestId(`button-resume-${found.definition.id}`).click();
  await expect(page.getByTestId('assessment-runner')).toBeVisible();
  await expect(page.locator(`#assessment-prompt-${found.at + 1}`)).toBeVisible();
}

test('a Check-in shape question draws the shape, read-only, and opens the answer tiles', async ({ page }) => {
  test.setTimeout(90_000);
  const found = find('fraction-of-area', ['unit-1-end', 'unit-1-mid', 'grade-3-end', 'grade-3-middle']);
  await resumeAt(page, found);
  await expect(page.locator('.fq-assessment-picture svg').first()).toBeVisible();
  await expect(page.locator('.fq-assessment-strips')).toHaveCount(0);
  await expect(page.locator('.fq-assessment-model-gate')).toHaveText('Now build your answer with the tiles.');
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/checkin-shape.png` });
});

test('a Check-in decimal-grid question draws the grids, read-only, and opens the answer tiles', async ({ page }) => {
  test.setTimeout(90_000);
  const found = find('compare-decimals-grid', ['unit-8-end', 'unit-8-mid', 'grade-4-end', 'grade-4-middle', 'unit-8-pre']);
  await resumeAt(page, found);
  await expect(page.getByTestId('assessment-picture')).toBeVisible();
  await expect(page.locator('.fq-assessment-strips')).toHaveCount(0);
  await expect(page.getByTestId('assessment-picture').locator('svg, .fq-print-bar-row, .fq-print-area').first()).toBeVisible();
  await expect(page.locator('.fq-assessment-model-gate')).toHaveText('Now build your answer with the tiles.');
  const box = await page.getByTestId('assessment-picture').boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/checkin-decimal-grid.png` });
});

test('the check-in list says how many questions a form asks (14 for Grade 4 End)', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 664 });
  await page.addInitScript((fun) => { localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(fun)); }, FUN);
  await signedOut(page);
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-assessments').click();
  const definition = getAssessmentDefinitions().find((d) => d.id === 'grade-4-end')!;
  await expect(page.getByTestId('assessment-card-grade-4-end')).toContainText(`${assessmentItemCount(definition)} model-and-answer questions`);
  expect(assessmentItemCount(definition)).toBe(14);
});
