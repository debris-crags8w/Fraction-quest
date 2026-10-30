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

test('every Check-in decimal-grid question fits an iPhone Safari screen: the grids or pies, the answer tiles and Next', async ({ page }) => {
  test.setTimeout(300_000);
  // Each worksheet row the Check-ins ask (one, two or three grids; two pies), with its longest wording.
  const rows = new Map<string, ReturnType<typeof find>>();
  for (const definition of getAssessmentDefinitions()) {
    for (let seed = 1; seed < 60; seed++) {
      const items = buildAssessmentItems(definition, seed);
      items.forEach((item, at) => {
        if (item.missionId !== 'compare-decimals-grid') return;
        const known = rows.get(item.problem.id);
        if (!known || known.items[known.at]!.prompt.length < item.prompt.length) rows.set(item.problem.id, { definition, seed, at, items });
      });
    }
  }
  expect(rows.size).toBeGreaterThanOrEqual(5);
  const misfits: string[] = [];
  for (const [row, found] of rows) {
    // The next row starts afresh: a new guest with just this Check-in left partway.
    if (page.url().startsWith('http')) await page.evaluate(() => localStorage.clear());
    await resumeAt(page, found);
    await expect(page.getByTestId('assessment-picture')).toBeVisible();
    await page.evaluate(() => window.scrollTo(0, 0));
    const fit = await page.evaluate(() => {
      const bottom = (selector: string) => document.querySelector(selector)?.getBoundingClientRect().bottom ?? Infinity;
      return { picture: document.querySelector('[data-testid="assessment-picture"]')!.getBoundingClientRect().height,
        answers: bottom('.fq-assessment-question .fq-tiles, .fq-assessment-question .fq-yes-no-cards'), next: bottom('[data-testid="button-submit-assessment-answer"]'),
        width: document.documentElement.scrollWidth };
    });
    const at = `${row} "${found.items[found.at]!.prompt}"`;
    if (fit.answers > 665 || fit.next > 665) misfits.push(`${at}: answers end at ${Math.round(fit.answers)}, Next at ${Math.round(fit.next)}, screen 664`);
    if (fit.picture < 80) misfits.push(`${at}: the picture is only ${Math.round(fit.picture)} tall`);
    if (fit.width > 391) misfits.push(`${at}: the page is ${fit.width} wide`);
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/checkin-decimal-grid-${row}.png` });
  }
  expect(misfits).toEqual([]);
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
