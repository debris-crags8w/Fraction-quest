import { expect, test, type Page } from './fixtures';
import { MISSIONS } from '../src/game';
import { assessmentResponse, buildAssessmentItems, getAssessmentDefinitions } from '../src/assessments';

/* A Check-in question whose bar the child copies ("Copy the bar above") shows that bar above the one to color: the
   copy step used to be offered with nothing to copy (12 percent of Check-in questions). */

const signedOut = (page: Page) => page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
const FUN = { xp: 0, day: '2026-01-01', answeredToday: 0, sound: false, story: { prologueSeen: true }, breakPreferences: { intervalMinutes: 0, quietMode: false } };
const LESSONS = ['fraction-names', 'equal-parts', 'whole-numbers-as-fractions', 'estimate-fraction-operations', 'mixed-unlike-operations', 'fractional-unit-conversions'];

for (const lesson of LESSONS) {
  test(`a Check-in question from ${lesson} that copies a bar shows the bar above the one to color`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 390, height: 844 });
    const found = getAssessmentDefinitions().flatMap((definition) => Array.from({ length: 60 }, (_, k) => ({ definition, seed: k + 1 })))
      .map(({ definition, seed }) => ({ definition, seed, at: buildAssessmentItems(definition, seed).findIndex((item) => item.missionId === lesson && item.problem.model?.kind === 'bar' && item.problem.task?.kind === 'copy' && !item.problem.picture) }))
      .find((candidate) => candidate.at >= 0)!;
    expect(found, `a ${lesson} copy question exists in some Check-in`).toBeTruthy();
    const { definition, seed, at } = found;
    const items = buildAssessmentItems(definition, seed);
    const responses = items.slice(0, at).map((item) => assessmentResponse(item, true, item.answer));
    const progress = { completedMissionIds: MISSIONS.slice(0, 80).map((m) => m.id), starsByMission: {}, reviewQueue: [], learning: {}, assessments: [],
      assessmentDraft: { assessmentId: definition.id, seed, startedAt: 1, responses } };
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
    await page.getByTestId(`button-resume-${definition.id}`).click();
    await expect(page.getByTestId('assessment-runner')).toBeVisible();
    await expect(page.locator(`#assessment-prompt-${at + 1}`)).toBeVisible(); // (fractions in the prompt are drawn stacked, so its text is not compared)
    const reference = page.getByTestId('assessment-picture');
    await expect(reference).toBeVisible();
    const copy = page.locator('.fq-ll-copy-instruction');
    await expect(copy).toHaveText(/^Copy the bar above\./);
    const above = await reference.boundingBox();
    const below = await copy.boundingBox();
    expect(above!.y + above!.height, 'the bar to copy is above the bar to color').toBeLessThanOrEqual(below!.y + 1);
    expect(above!.width).toBeLessThanOrEqual(390);
  });
}
