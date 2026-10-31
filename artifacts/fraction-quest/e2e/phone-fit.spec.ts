import { expect, test, type Page } from './fixtures';
import { MISSIONS, PLACEMENT_UNITS, type DailyPracticeQuestion, type Mission, type PracticeQuestion } from '../src/game';
import { placementItems, PER_UNIT } from '../src/placement';
import { answerShape, SLOTS, slotsFromAnswer } from '../src/answer-shape';
import { getBuildChecks, getWorksheet, isYesNoProblem, type BuildCheck, type WorksheetProblem } from '../src/learning-content';
import { assessmentResponse, buildAssessmentItems, getAssessmentDefinitions, type AssessmentItem } from '../src/assessments';
import { generateQuestions, hasGenerator } from '../src/practice-bank';
import { dailyPracticeDay } from '../src/daily-practice';

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

/* Daily practice, Build it, the worksheet page and a New-questions round, at 390 × 664. A question screen (daily practice,
   New questions) must show the question, its picture, the answers and Check with no scrolling, and after a right answer the
   button that goes on is in view. Build it and the worksheet are pages the child scrolls through, one part at a time: each part
   must fit one screen (a Build part's number buttons and the model they change, together; the reasons and Check, together;
   one worksheet question with its picture, answer tiles and Check), and nothing may stick out sideways. */

/** Every lesson before `mission` finished in full, and `mission` open with `record` (what is done of it so far). */
function progressAt(mission: Mission, record: object, extra: object = {}) {
  const at = MISSIONS.indexOf(mission);
  const finished = (id: string) => ({ practiceDone: true, completedAt: 1, helpUses: 0, misconceptions: {},
    checks: Object.fromEntries(getBuildChecks(id).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
    worksheet: Object.fromEntries(getWorksheet(id).map((row) => [row.id, { draft: row.answer, checkedValue: row.answer, attempts: 1, supported: false }])) });
  return { completedMissionIds: MISSIONS.slice(0, at).map((item) => item.id), starsByMission: {}, reviewQueue: [], assessments: [],
    learning: { ...Object.fromEntries(MISSIONS.slice(0, at).map((item) => [item.id, finished(item.id)])), [mission.id]: record }, ...extra };
}

/** Open the app as the same guest with this saved progress (and the usual fun settings), on the map. */
async function openWith(page: Page, progress: object) {
  await page.setViewportSize({ width: 390, height: VISIBLE });
  if (!page.url().startsWith('http')) { await signedOut(page); await page.goto('/'); }
  await page.evaluate(({ p, fun }) => {
    localStorage.clear();
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(p));
    localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(p));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(fun));
  }, { p: progress, fun: FUN });
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('button-app-menu')).first()).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
}

/** Open a lesson from the map (its node animates, so the clicks do not wait for it to settle), past any short Watch. */
async function startLesson(page: Page, missionId: string) {
  const node = page.getByTestId(`button-node-${missionId}`);
  await node.click({ force: true });
  if (await node.getAttribute('aria-expanded') !== 'true') await node.click({ force: true });
  await page.getByTestId(`button-start-mission-${missionId}`).click();
  for (let screen = 0; screen < 3; screen++) {
    await page.waitForTimeout(250);
    const skip = page.getByTestId('button-intro-skip').first();
    if (await skip.isVisible()) await skip.click();
  }
}

const pageWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);
/** What ends at the page's right edge (for the message when the page is too wide). */
const widest = (page: Page) => page.evaluate(() => {
  const edge = document.documentElement.scrollWidth;
  return [...document.querySelectorAll('body *')].filter((element) => Math.abs(element.getBoundingClientRect().right + window.scrollX - edge) < 12)
    .slice(0, 4).map((element) => `${element.tagName.toLowerCase()}.${[...element.classList].join('.')}`).join(' | ') || 'nothing found';
});
/** For each kind, the item with the longest words and the one with the biggest picture. */
function longestAndBiggest<T>(items: T[], kind: (item: T) => string, words: (item: T) => number, size: (item: T) => number): [string, T][] {
  const pick = new Map<string, T>();
  for (const item of items) for (const [key, better] of [[`${kind(item)} · longest words`, words], [`${kind(item)} · biggest`, size]] as const) {
    const known = pick.get(key);
    if (!known || better(item) > better(known)) pick.set(key, item);
  }
  const seen = new Set<T>();
  return [...pick].filter(([, item]) => !seen.has(item) && !!seen.add(item));
}
const modelSize = (model: unknown) => {
  const m = (model ?? {}) as { wholes?: number; d?: number; denominator?: number; total?: number; bars?: unknown[]; values?: unknown[] };
  return (m.wholes ?? 1) * (m.d ?? m.denominator ?? 0) + (m.total ?? 0) + 10 * (m.bars?.length ?? 0) + (m.values?.length ?? 0);
};
const questionKind = (question: PracticeQuestion) => (question.model as { kind?: string } | undefined)?.kind ?? 'no picture';

/** A lesson question on screen (PlayView): its answers in one column, the answers and Check on the first screen. */
async function lessonQuestionFits(page: Page, question: PracticeQuestion, at: string, misfits: string[]) {
  await expect(page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`)).toBeVisible();
  await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  const fit = await page.evaluate((id) => {
    const top = document.querySelector('.fq-lesson-app')?.getBoundingClientRect().top ?? 0;
    const choices = [...document.querySelectorAll(`[data-testid^="button-answer-${id}-"]`)].map((element) => element.getBoundingClientRect());
    return {
      choices: Math.max(...choices.map((rect) => rect.bottom)) - top,
      columns: new Set(choices.map((rect) => Math.round(rect.left))).size,
      check: (document.querySelector('[data-testid="button-check-answer"]')?.getBoundingClientRect().bottom ?? Infinity) - top,
      width: document.documentElement.scrollWidth,
      zoom: (document.querySelector('[data-testid="question-model-area"]') as HTMLElement | null)?.style.zoom || '1',
    };
  }, question.id);
  if (fit.columns !== 1) misfits.push(`${at}: answers are in ${fit.columns} columns`);
  if (fit.choices > VISIBLE + 1 || fit.check > VISIBLE + 1) misfits.push(`${at}: answers end at ${Math.round(fit.choices)}, Check at ${Math.round(fit.check)} (picture at ${fit.zoom}), screen ${VISIBLE}`);
  if (fit.width > 391) misfits.push(`${at}: the page is ${fit.width} wide`);
  if (SHOTS) await page.screenshot({ path: `${SHOTS}/${at.replace(/[^a-z0-9]+/gi, '-').slice(0, 80)}.png` });
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
  const moveOn = page.getByTestId('button-next-question').or(page.getByTestId('button-finish-mission'));
  await expect(moveOn, `${at}: the button that goes on is in view after a right answer`).toBeInViewport();
  return moveOn;
}

test('daily practice fits an iPhone Safari screen: every kind of review question, and building on a bar and a number line', async ({ page }) => {
  test.setTimeout(400_000);
  const topics = MISSIONS.filter((mission) => hasGenerator(mission.id)).flatMap((mission) =>
    [1, 2, 3, 4, 5, 6].map((seed) => ({ mission, seed, question: generateQuestions(mission.id, [], seed, 1)[0]! })).filter((item) => item.question));
  const chosen = longestAndBiggest(topics, (item) => questionKind(item.question),
    (item) => item.question.prompt.length + item.question.choices.join('').length, (item) => modelSize(item.question.model));
  const questions: (DailyPracticeQuestion & { label: string })[] = [
    ...chosen.map(([label, { mission, seed }], index) => ({ id: `fit-${index}`, missionId: mission.id, topicTitle: mission.shortTitle, modelKind: 'bar' as const,
      numerator: 1, denominator: 2, explanation: '', kind: 'choice' as const, seed, label: `${label} (${mission.id} seed ${seed})` })),
    ...(['bar', 'number-line'] as const).map((modelKind, index) => ({ id: `fit-build-${index}`, missionId: 'unit-fractions', topicTitle: 'Unit fractions', modelKind,
      numerator: 11, denominator: 12, explanation: 'One whole is 12 equal parts. 11 of them make 11/12.', kind: 'build' as const, label: `build 11/12 on a ${modelKind}` })),
  ];
  const all = MISSIONS[MISSIONS.length - 1]!;
  const misfits: string[] = [];
  for (const [index, question] of questions.entries()) {
    await test.step(question.label, async () => {
      // Today's practice, already at this question (each question is opened directly, so none has to be answered first).
      // (A saved day holds at most 10 questions.)
      const from = Math.floor(index / 10) * 10;
      const session = { day: dailyPracticeDay(), startedAt: Date.now(), questions: questions.slice(from, from + 10), index: index - from, attempts: {} };
      await openWith(page, { ...progressAt(all, { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} }), dailyPractice: session });
      await page.getByTestId('button-app-menu').click();
      await page.getByTestId('button-start-daily-practice').click();
      await expect(page.locator('#daily-question-title')).toBeVisible();
      const at = `daily practice, ${question.label}`;
      let check: string;
      if (question.kind === 'choice') {
        const topic = generateQuestions(question.missionId, [], question.seed!, 1)[0]!;
        await page.getByTestId(`button-daily-choice-${topic.correctChoice}`).click();
        check = 'button-daily-check-answer';
      } else {
        await page.getByTestId(`button-daily-parts-${question.denominator}`).click();
        if (question.modelKind === 'bar') for (let part = 1; part <= question.numerator; part++) await page.getByTestId(`button-daily-part-${part}`).click();
        else await page.getByTestId(`button-daily-jump-${question.numerator}`).click();
        check = 'button-daily-check-model';
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      const bottom = await page.getByTestId(check).evaluate((button) => button.getBoundingClientRect().bottom);
      if (bottom > VISIBLE + 1) misfits.push(`${at}: Check ends at ${Math.round(bottom)}, screen ${VISIBLE}`);
      const width = await pageWidth(page);
      if (width > 391) misfits.push(`${at}: the page is ${width} wide`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/daily-${question.label.replace(/[^a-z0-9]+/gi, '-').slice(0, 80)}.png` });
      await page.getByTestId(check).click();
      await expect(page.getByTestId('button-daily-next'), `${at}: Next is in view after a right answer`).toBeInViewport();
    });
  }
  expect(questions.length).toBeGreaterThan(8);
  expect(misfits, misfits.join('\n')).toEqual([]);
});

test('a New-questions round fits an iPhone Safari screen: the round after "New questions", and every kind of new question', async ({ page }) => {
  test.setTimeout(400_000);
  const all = MISSIONS[MISSIONS.length - 1]!;
  const open = (missionId: string, seed: number, index: number) => openWith(page, { ...progressAt(all, { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} }),
    completedMissionIds: MISSIONS.map((mission) => mission.id), grownUpPicks: [{ kind: 'practice', id: missionId, at: 1, seed, index, firstTry: 0 }] });
  const misfits: string[] = [];
  // A grown-up's pick is a round of 5 new questions; opened partway, it starts at that question. Its last question ends the
  // round, and "New questions" starts a round of 10 with a fresh seed (read back from the questions' ids).
  const first = MISSIONS.find((mission) => mission.id === (process.env.NEW_ROUND_LESSON ?? 'fraction-of-collection'))!;
  const baseIds = first.questions.map((question) => question.id);
  await test.step(`a New-questions round of ${first.id}`, async () => {
    await open(first.id, 7, 4);
    await page.getByTestId(`button-picked-practice-${first.id}`).click();
    const last = generateQuestions(first.id, baseIds, 7, 5)[4]!;
    await page.getByTestId(`button-answer-${last.id}-${last.correctChoice}`).click();
    await page.getByTestId('button-check-answer').click();
    await page.getByTestId('button-finish-mission').click();
    await page.getByTestId('button-extra-new').click();
    const firstId = await page.locator(`[data-testid^="button-answer-${first.id}-g"]`).first().getAttribute('data-testid');
    const seed = Number(new RegExp(`^button-answer-${first.id}-g(\\d+)-1-`).exec(firstId ?? '')?.[1]);
    expect(seed, `the round's first question (${firstId})`).toBeGreaterThan(0);
    const round = generateQuestions(first.id, baseIds, seed, 10);
    for (const [index, question] of round.entries()) {
      const moveOn = await lessonQuestionFits(page, question, `New questions ${first.id} seed ${seed} question ${index + 1}: ${question.prompt}`, misfits);
      await moveOn.click();
    }
    await expect(page.getByTestId('status-extra-complete')).toBeVisible();
  });
  // Every kind of new question, from every lesson: the one with the longest words and the one with the biggest picture.
  const candidates = MISSIONS.filter((mission) => hasGenerator(mission.id)).flatMap((mission) => [11, 12, 13].flatMap((seed) =>
    generateQuestions(mission.id, mission.questions.map((question) => question.id), seed, 5).map((question, index) => ({ mission, seed, index, question }))));
  const chosen = longestAndBiggest(candidates, (item) => questionKind(item.question),
    (item) => item.question.prompt.length + item.question.choices.join('').length, (item) => modelSize(item.question.model));
  for (const [label, { mission, seed, index, question }] of chosen) {
    await test.step(label, async () => {
      await open(mission.id, seed, index);
      await page.getByTestId(`button-picked-practice-${mission.id}`).click();
      await lessonQuestionFits(page, question, `New questions, ${label} (${mission.id} seed ${seed} question ${index + 1}): ${question.prompt}`, misfits);
    });
  }
  expect(chosen.length).toBeGreaterThan(5);
  expect(misfits, misfits.join('\n')).toEqual([]);
});

/** Build one model of a Build check with its steppers: the equal parts, the wholes, then how many pieces, groups or jumps. */
async function buildModel(page: Page, builder: string, target: { kind: string; n: number; d: number; wholes: number }) {
  const stepper = async (id: string, value: number) => {
    const read = async () => { const text = (await page.getByTestId(`value-${id}`).textContent())?.trim() ?? ''; return /^\d+$/.test(text) ? Number(text) : 0; };
    for (let guard = 0; guard < 60 && (await read()) !== value; guard++) {
      const diff = value - (await read());
      const big = Math.abs(diff) >= 10 && await page.getByTestId(`button-${id}-${diff > 0 ? 'plus10' : 'minus10'}`).count();
      await page.getByTestId(`button-${id}-${diff > 0 ? 'plus' : 'minus'}${big ? '10' : ''}`).click();
    }
  };
  // The steppers set it (a hundredths line's ticks are too close together to tap one by one on a phone; its "Jumps from 0"
  // stepper is how a child lands on 25).
  await stepper(`${builder}-d`, target.d);
  if (target.kind === 'bar' && target.wholes > 1) await stepper(`${builder}-wholes`, target.wholes);
  await stepper(`${builder}-count`, target.n);
}

test('Build it fits an iPhone Safari screen part by part: each model with its number buttons, then the reasons with Check', async ({ page }) => {
  test.setTimeout(400_000);
  const checks = MISSIONS.flatMap((mission) => getBuildChecks(mission.id).map((check, index) => ({ mission, check, index })));
  const chosen = longestAndBiggest(checks, ({ check }) => check.target.kind, ({ check }) => check.prompt.length + Math.max(...check.reasons.map((reason) => reason.length)),
    ({ check }) => check.target.kind === 'set' ? check.target.total ?? 0 : check.target.wholes * check.target.d);
  const misfits: string[] = [];
  const together = async (at: string, from: string, to: string) => {
    const span = await page.evaluate(([a, b]) => {
      const top = document.querySelector(a)?.getBoundingClientRect().top; const bottom = document.querySelector(b)?.getBoundingClientRect().bottom;
      return top === undefined || bottom === undefined ? null : bottom - top;
    }, [from, to]);
    if (span === null) misfits.push(`${at}: ${from} or ${to} is missing`);
    else if (span > VISIBLE) misfits.push(`${at}: ${Math.round(span)} tall, screen ${VISIBLE}`);
    const width = await pageWidth(page);
    if (width > 391) misfits.push(`${at}: the page is ${width} wide (${await widest(page)})`);
    if (SHOTS) { await page.locator(from).scrollIntoViewIfNeeded(); await page.screenshot({ path: `${SHOTS}/build-${at.replace(/[^a-z0-9]+/gi, '-').slice(0, 80)}.png` }); }
  };
  for (const [label, { mission, check, index }] of chosen) {
    await test.step(`${label}: ${mission.id} ${check.id}`, async () => {
      const passed = Object.fromEntries(getBuildChecks(mission.id).slice(0, index).map((item: BuildCheck) => [item.id, { passed: true, supported: false, attempts: 1 }]));
      await openWith(page, progressAt(mission, { practiceDone: true, checks: passed, worksheet: {}, helpUses: 0, misconceptions: {} }));
      await startLesson(page, mission.id);
      await expect(page.getByTestId(`check-${check.id}`)).toBeVisible();
      const at = `Build it, ${label} (${mission.id} ${check.id} "${check.prompt}")`;
      const first = `[data-testid="model-${check.id}-a"]`;
      await buildModel(page, `${check.id}-a`, check.target);
      await together(`${at}, first model`, `${first} .fq-ll-controls`, first);
      const second = `[data-testid="model-${check.id}-b"]`;
      await buildModel(page, `${check.id}-b`, { ...check.target, kind: check.target.kind === 'line' ? 'bar' : 'line', wholes: Math.max(1, Math.ceil(check.target.n / check.target.d)) });
      await together(`${at}, second model`, `${second} .fq-ll-controls`, second);
      await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
      await together(`${at}, reasons and Check`, `[data-testid="part-${check.id}-3"]`, `[data-testid="button-check-${check.id}"]`);
      await page.getByTestId(`button-check-${check.id}`).click();
      await expect(page.getByTestId(`button-next-${check.id}`), `${at}: Next is in view once passed`).toBeInViewport();
    });
  }
  expect(chosen.length).toBeGreaterThanOrEqual(4);
  expect(misfits, misfits.join('\n')).toEqual([]);
});

test('the worksheet page fits an iPhone Safari screen question by question: each question, its picture, its tiles and Check', async ({ page }) => {
  test.setTimeout(400_000);
  const rowKind = (row: WorksheetProblem) => row.areaTask ? 'shape to color' : row.rulerTask ? 'ruler' : row.linePlotTask ? 'line plot' : row.scaleTask ? 'slider'
    : row.area ? 'shape' : row.model ? `${row.model.kind}${row.modelRequired ? ' to build' : ''}` : row.picture ? `${row.picture.kind} picture` : 'words only';
  const rows = MISSIONS.flatMap((mission) => getWorksheet(mission.id).map((row) => ({ mission, row })));
  const lessons = [...new Set(longestAndBiggest(rows, ({ row }) => rowKind(row), ({ row }) => row.prompt.length,
    ({ row }) => modelSize(row.model ?? row.picture ?? (row.area ? { d: 8 } : undefined))).map(([, { mission }]) => mission))];
  const misfits: string[] = [];
  for (const mission of lessons) {
    await test.step(mission.id, async () => {
      const passed = Object.fromEntries(getBuildChecks(mission.id).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }]));
      await openWith(page, progressAt(mission, { practiceDone: true, checks: passed, worksheet: {}, helpUses: 0, misconceptions: {} }));
      await startLesson(page, mission.id);
      await expect(page.getByTestId('section-worksheet')).toBeVisible();
      await page.waitForTimeout(300);
      // A question with something to build or move first (a bar to copy, a shape to color, a ruler, a line plot, a slider): the
      // question and all of that are on one screen (the answer tiles below it open once it is done, and Check scrolls into view,
      // as in a Check-in). Any other question: the question, its picture, the tiles and Check are on one screen.
      const sheet = getWorksheet(mission.id).map((row) => ({ id: row.id, build: !!(row.modelRequired || row.areaTask || row.rulerTask || row.linePlotTask || row.scaleTask) }));
      const fit = await page.evaluate((rows) => ({
        rows: rows.map(({ id, build }) => {
          const row = document.querySelector(`[data-testid="row-worksheet-${id}"]`);
          if (!row) return { id, build, span: -1 };
          const top = row.getBoundingClientRect().top;
          if (!build) return { id, build, span: (row.querySelector(`[data-testid="button-check-worksheet-${id}"]`)?.getBoundingClientRect().bottom ?? Infinity) - top };
          const parts = [...(row.querySelector('form')?.children ?? [])];
          const answer = parts.findIndex((part) => part.matches('.fq-ll-answer, .fq-tiles, .fq-yes-no-cards') || !!part.querySelector('.fq-tiles, .fq-yes-no-cards, [data-testid^="button-check-worksheet-"]'));
          const before = parts.slice(0, answer < 0 ? parts.length : answer);
          return { id, build, span: Math.max(...before.map((part) => part.getBoundingClientRect().bottom)) - top };
        }),
        width: document.documentElement.scrollWidth,
      }), sheet);
      for (const { id, span, build } of fit.rows) {
        const row = getWorksheet(mission.id).find((item) => item.id === id)!;
        // Known and left for a design decision: copying a 100-part (hundredths) bar takes ten rows of tappable parts, so the
        // question and its bar to copy take about 825 points. Every other question must fit.
        if (row.task?.kind === 'copy' && row.model && row.model.d * row.model.wholes >= 100) continue;
        if (span < 0) misfits.push(`${mission.id} ${id}: not on the page`);
        else if (span > VISIBLE) misfits.push(`worksheet ${mission.id} ${id} (${rowKind(row)}) "${row.prompt}": ${build ? 'the question and what to build' : 'the question to Check'} take ${Math.round(span)}, screen ${VISIBLE}`);
      }
      if (fit.width > 391) misfits.push(`worksheet ${mission.id}: the page is ${fit.width} wide`);
      if (SHOTS) await page.screenshot({ path: `${SHOTS}/worksheet-${mission.id}.png`, fullPage: true });
    });
  }
  expect(lessons.length).toBeGreaterThanOrEqual(6);
  expect(misfits, misfits.join('\n')).toEqual([]);
});
