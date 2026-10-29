import { expect, test, type Page } from './fixtures';
import { MISSIONS } from '../src/game';
import { assessmentResponse, buildAssessmentItems, getAssessmentDefinitions } from '../src/assessments';
import { getBuildChecks, getWorksheet } from '../src/learning-content';

/* "Compare: 0.15 __ 0.51." draws both decimals, in the worksheet and in the Check-in (it used to draw only the first). */

const signedOut = (page: Page) => page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
const mastered = (id: string) => ({
  practiceDone: true, helpUses: 0, misconceptions: {},
  checks: Object.fromEntries(getBuildChecks(id).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
  worksheet: Object.fromEntries(getWorksheet(id).map((p) => [p.id, { draft: p.answer, checkedValue: p.answer, attempts: 1, supported: false }])),
});
const FUN = { xp: 0, day: '2026-01-01', answeredToday: 0, sound: false, story: { prologueSeen: true }, breakPreferences: { intervalMinutes: 0, quietMode: false } };

async function openGuest(page: Page) {
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
}

test('the compare-decimals worksheet draws both decimals as two bars and asks to copy the top one', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const id = 'compare-decimals';
  const index = MISSIONS.findIndex((m) => m.id === id);
  const learning: Record<string, unknown> = Object.fromEntries(MISSIONS.slice(0, index).map((m) => [m.id, mastered(m.id)]));
  learning[id] = { ...mastered(id), worksheet: {} };
  const progress = { completedMissionIds: MISSIONS.slice(0, index).map((m) => m.id), starsByMission: {}, reviewQueue: [], learning, assessments: [] };
  await page.addInitScript((p) => { localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(p)); }, progress);
  await signedOut(page);
  await openGuest(page);
  const node = page.getByTestId(`button-node-${id}`);
  await node.click({ force: true });
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId(`button-start-mission-${id}`).click();
  for (let screen = 0; screen < 3; screen++) {
    const introGo = page.getByTestId('button-story-intro-go');
    if (await introGo.isVisible()) { await introGo.click(); continue; }
    const skip = page.getByTestId('button-story-skip');
    if (await skip.isVisible()) await skip.click();
    const go = page.getByTestId('button-story-go');
    if (!(await go.isVisible())) break;
    const choice = page.getByTestId('button-story-choice-0');
    if (await choice.isVisible()) await choice.click();
    await go.click();
  }
  await expect(page.getByTestId('section-worksheet')).toBeVisible();
  const first = getWorksheet(id)[0]!;
  const row = page.getByTestId(`row-worksheet-${first.id}`);
  await expect(row.locator('.fq-print-bar-row')).toHaveCount(2);
  // One picture of both bars; the lone bar of the first decimal is gone. The build step names the bar it copies.
  await expect(row.locator('.fq-ll-preview-wrap')).toHaveCount(1);
  await expect(row.locator('.fq-ll-copy-instruction')).toHaveText('Copy the top bar. Tap a part to color it. Tap again to clear it.');
  const box = await row.boundingBox();
  expect(box!.width).toBeLessThanOrEqual(390);
});

test('a Check-in question that compares two decimals shows both bars above the bar to copy', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const definition = getAssessmentDefinitions().find((d) => d.id === 'unit-8-end')!;
  let seed = 1; let at = -1;
  for (; seed < 60 && at < 0; seed++) at = buildAssessmentItems(definition, seed).findIndex((item) => item.missionId === 'compare-decimals');
  seed -= 1;
  const items = buildAssessmentItems(definition, seed);
  const responses = items.slice(0, at).map((item) => assessmentResponse(item, true, item.answer));
  const progress = { completedMissionIds: MISSIONS.slice(0, 60).map((m) => m.id), starsByMission: {}, reviewQueue: [], learning: {}, assessments: [],
    assessmentDraft: { assessmentId: definition.id, seed, startedAt: 1, responses } };
  await page.addInitScript(({ p, fun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(p));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(fun));
  }, { p: progress, fun: FUN });
  await signedOut(page);
  await openGuest(page);
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-assessments').click();
  await page.getByTestId(`button-resume-${definition.id}`).click();
  await expect(page.getByTestId('assessment-runner')).toBeVisible();
  await expect(page.locator(`#assessment-prompt-${at + 1}`)).toContainText('Compare:');
  const picture = page.getByTestId('assessment-picture');
  await expect(picture.locator('.fq-print-bar-row')).toHaveCount(2);
  await expect(page.locator('.fq-assessment-strips')).toHaveCount(0);
  await expect(page.locator('.fq-ll-copy-instruction')).toHaveText('Copy the top bar. Tap a part to color it. Tap again to clear it.');
  // The picture is above the bar to copy.
  const [pictureBox, copyBox] = [await picture.boundingBox(), await page.getByTestId('status-copy-model').boundingBox()];
  expect(pictureBox!.y).toBeLessThan(copyBox!.y);
});
