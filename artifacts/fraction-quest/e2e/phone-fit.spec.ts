import { expect, test, type Page } from './fixtures';
import { MISSIONS, PLACEMENT_UNITS } from '../src/game';
import { placementItems, PER_UNIT } from '../src/placement';
import { answerShape, SLOTS, slotsFromAnswer } from '../src/answer-shape';
import { isYesNoProblem, type WorksheetProblem } from '../src/learning-content';
import { assessmentResponse, buildAssessmentItems, getAssessmentDefinitions, type AssessmentItem } from '../src/assessments';

/* An iPhone in Safari shows about 664 points of page (390 wide). Find my level and every kind of Check-in question
   (a garden, a shape to color, a number line, decimal grids, a bar to copy, a ruler, a line plot, a slider) must show the
   question, its picture, the answer and the Next button without scrolling. PHONE_FIT_SHOTS=<dir> saves a screenshot of each. */

const VISIBLE = 664;
const SHOTS = process.env.PHONE_FIT_SHOTS ?? '';
const signedOut = (page: Page) => page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
const FUN = { xp: 0, day: '2026-01-01', answeredToday: 0, sound: false, story: { prologueSeen: true }, breakPreferences: { intervalMinutes: 0, quietMode: false } };

/** Build an answer with the tiles (or tap Yes or No). */
async function answerWithTiles(page: Page, prefix: string, problem: WorksheetProblem, answer: string) {
  if (isYesNoProblem(problem)) { await page.getByTestId(`button-${prefix}-${/^y/i.test(answer) ? 'yes' : 'no'}`).click(); return; }
  const shape = answerShape(problem);
  const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
  if (shape.kind === 'pick') await page.getByTestId(`tile-${prefix}-option-${shape.options.findIndex((option) => same(option, answer))}`).click();
  else if (shape.kind === 'symbol') await page.getByTestId(`tile-${prefix}-symbol-${({ '<': 'lt', '=': 'eq', '>': 'gt' } as Record<string, string>)[answer.trim()]}`).click();
  else if (shape.kind === 'ordered') for (const item of answer.split(',').map((value) => value.trim())) await page.getByTestId(`tile-${prefix}-card-${shape.items.indexOf(item)}`).click();
  else if (shape.kind !== 'yesno') {
    const slots = slotsFromAnswer(shape, answer);
    for (const name of SLOTS[shape.kind]) {
      await page.getByTestId(`slot-${prefix}-${name}`).click();
      for (const digit of slots[name] ?? '') await page.getByTestId(`tile-${prefix}-digit-${digit}`).click();
    }
  }
}

test('every Find my level question fits an iPhone Safari screen: the question, its picture, the tiles, Next and "I haven\'t learned this yet"', async ({ page }) => {
  test.setTimeout(600_000);
  await page.setViewportSize({ width: 390, height: VISIBLE });
  await signedOut(page);
  await page.addInitScript((fun) => { if (!localStorage.getItem('fraction-quest-fun-v1')) localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(fun)); }, FUN);
  const misfits: string[] = [];
  let pictures = 0;
  // Each quiz is passed unit by unit (every answer right), so all 12 units are shown. Seeds chosen so the walks between them
  // ask the questions that carry a picture of their own: the number line with a dot (194), coins (243), two pizzas (180) and
  // hundredths grids (78), with bars, number lines, beads and shapes along the way.
  const seeds = (process.env.PLACEMENT_SEEDS ?? '16,194,243,180,78').split(',').map(Number);
  for (const seed of seeds) {
    await test.step(`quiz ${seed}`, async () => {
      await page.goto(`/?placementSeed=${seed}`);
      const guest = page.getByTestId('button-play-guest');
      await expect(guest.or(page.getByTestId('button-app-menu')).first()).toBeVisible();
      if (await guest.isVisible()) await guest.click();
      await page.getByTestId('button-app-menu').click();
      await page.getByTestId('button-find-level').click();
      await page.getByTestId('button-placement-start').click();
      for (let unit = 1; unit <= PLACEMENT_UNITS; unit++) {
        const items = placementItems(unit, seed);
        for (let index = 0; index < PER_UNIT; index++) {
          const { problem } = items[index]!;
          const at = `quiz ${seed}, unit ${unit} question ${index + 1} (${items[index]!.missionId}): ${problem.prompt}`;
          await expect(page.getByTestId('placement-quiz')).toContainText(`Unit ${unit} · question ${index + 1} of ${PER_UNIT}`);
          await page.evaluate(() => window.scrollTo(0, 0));
          const fit = await page.evaluate(() => {
            const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
            return {
              next: box('[data-testid="button-placement-next"]')?.bottom ?? Infinity,
              skip: box('[data-testid="button-placement-unknown"]')?.bottom ?? Infinity,
              picture: box('.fq-place-model')?.height ?? null,
              width: document.documentElement.scrollWidth,
            };
          });
          if (fit.next > VISIBLE + 1 || fit.skip > VISIBLE + 1) misfits.push(`${at}: Next ends at ${Math.round(fit.next)}, "I haven't learned this yet" at ${Math.round(fit.skip)}, screen ${VISIBLE}`);
          // (One bar is naturally short, about 34 points; a picture that collapsed is 0.)
          if (fit.picture !== null) { pictures++; if (fit.picture < 24) misfits.push(`${at}: the picture is only ${Math.round(fit.picture)} tall`); }
          if (fit.width > 391) misfits.push(`${at}: the page is ${fit.width} wide`);
          if (SHOTS) await page.screenshot({ path: `${SHOTS}/placement-${seed}-u${unit}-q${index + 1}.png` });
          await answerWithTiles(page, 'placement', problem, problem.answer);
          await page.getByTestId('button-placement-next').click();
        }
      }
      await expect(page.getByTestId('placement-result')).toBeVisible();
    });
  }
  expect(pictures, 'some questions draw a picture').toBeGreaterThan(5);
  expect(misfits, misfits.join('\n')).toEqual([]);
});

/** What a Check-in question shows: which picture, and what the child does with it. */
function kindOf(item: AssessmentItem): string {
  const p = item.problem;
  if (p.areaTask) return 'area task (color the shape)';
  if (p.rulerTask) return 'ruler';
  if (p.linePlotTask) return 'line plot to make';
  if (p.scaleTask) return 'slider';
  if (p.area) return 'shape to read';
  if (p.model) return `${p.model.kind} model${p.task ? ` to ${p.task.kind}` : ''}${p.picture ? ` with a ${p.picture.kind} picture` : ''}`;
  if (item.visualFractions) return 'fraction strips to build';
  return p.picture ? `${p.picture.kind} picture${p.picture.kind === 'area' ? ` (${(p.picture as { cut?: string }).cut})` : ''}` : 'no picture';
}

test('every kind of Check-in question fits an iPhone Safari screen: gardens, shapes, number lines, decimal grids, bars, rulers, line plots', async ({ page }) => {
  test.setTimeout(600_000);
  // For each kind, the question with the longest words, and the one with the biggest model (most bars or parts).
  const size = (item: AssessmentItem) => (item.problem.model ? item.problem.model.wholes * item.problem.model.d : 0) + (item.visualFractions?.length ?? 0) * 10;
  const pick = new Map<string, { definition: ReturnType<typeof getAssessmentDefinitions>[number]; seed: number; at: number; items: AssessmentItem[] }>();
  for (const definition of getAssessmentDefinitions()) for (let seed = 1; seed <= 30; seed++) {
    const items = buildAssessmentItems(definition, seed);
    items.forEach((item, at) => {
      if (at === 0) return; // a form with no answer yet has no Resume button; every kind is also asked later in some form
      for (const [key, better] of [[`${kindOf(item)} · longest words`, (old: AssessmentItem) => item.prompt.length > old.prompt.length], [`${kindOf(item)} · biggest`, (old: AssessmentItem) => size(item) > size(old)]] as const) {
        const known = pick.get(key);
        if (!known || better(known.items[known.at]!)) pick.set(key, { definition, seed, at, items });
      }
    });
  }
  const only = process.env.CHECKIN_KINDS?.split('|');
  const misfits: string[] = [];
  const seen = new Set<string>();
  for (const [kind, found] of pick) {
    const item = found.items[found.at]!;
    if (only?.length && !only.some((name) => kind.startsWith(name))) continue;
    if (seen.has(`${found.definition.id}:${found.seed}:${found.at}`)) continue; // the longest is often the biggest too
    seen.add(`${found.definition.id}:${found.seed}:${found.at}`);
    await test.step(kind, async () => {
      await page.setViewportSize({ width: 390, height: VISIBLE });
      const responses = found.items.slice(0, found.at).map((earlier) => assessmentResponse(earlier, true, earlier.answer));
      const progress = { completedMissionIds: MISSIONS.map((m) => m.id), starsByMission: {}, reviewQueue: [], learning: {}, assessments: [],
        assessmentDraft: { assessmentId: found.definition.id, seed: found.seed, startedAt: 1, responses } };
      // The same guest each time, with just this Check-in left partway (the guest's own copy of the progress too).
      if (!page.url().startsWith('http')) { await signedOut(page); await page.goto('/'); }
      await page.evaluate(({ p, fun }) => {
        localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(p));
        localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(p));
        localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(fun));
      }, { p: progress, fun: FUN });
      await page.goto('/');
      const guest = page.getByTestId('button-play-guest');
      await expect(guest.or(page.getByTestId('button-app-menu')).first()).toBeVisible();
      if (await guest.isVisible()) await guest.click();
      await page.getByTestId('button-app-menu').click();
      await page.getByTestId('button-open-assessments').click();
      await page.getByTestId(`button-resume-${found.definition.id}`).click();
      await expect(page.locator(`#assessment-prompt-${found.at + 1}`)).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);
      const fit = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
        const gate = document.querySelector('.fq-assessment-model-gate');
        // Everything above the gate note is the question and what the child reads or builds first.
        const above = [...document.querySelectorAll('.fq-assessment-question > *')].filter((element) => gate && (element.compareDocumentPosition(gate) & Node.DOCUMENT_POSITION_FOLLOWING));
        return {
          built: !!gate && /Now build your answer/.test(gate.textContent ?? ''),
          first: above.length ? Math.max(...above.map((element) => element.getBoundingClientRect().bottom)) : 0,
          answers: box('.fq-assessment-question .fq-tiles, .fq-assessment-question .fq-yes-no-cards')?.bottom ?? Infinity,
          next: box('[data-testid="button-submit-assessment-answer"]')?.bottom ?? Infinity,
          width: document.documentElement.scrollWidth,
        };
      });
      const at = `${kind}: ${found.definition.id} seed ${found.seed} question ${found.at + 1} "${item.prompt}"`;
      // A picture to read: the tiles and Next are open at once, and fit. A model to build: all of it is on the first screen
      // (after building, the tiles open below it and Next scrolls into view, as in a lesson).
      if (fit.built && (fit.answers > VISIBLE + 1 || fit.next > VISIBLE + 1)) misfits.push(`${at}: the tiles end at ${Math.round(fit.answers)}, Next at ${Math.round(fit.next)}, screen ${VISIBLE}`);
      if (!fit.built && fit.first > VISIBLE + 1) misfits.push(`${at}: the model to build ends at ${Math.round(fit.first)}, screen ${VISIBLE}`);
      if (fit.width > 391) misfits.push(`${at}: the page is ${fit.width} wide`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/checkin-${kind.replace(/[^a-z0-9]+/gi, '-')}.png` });
    });
  }
  expect(seen.size).toBeGreaterThanOrEqual(10);
  expect(misfits, misfits.join('\n')).toEqual([]);
});
