import { expect, test } from '@playwright/test';
import { MISSIONS } from '../src/game';
import { getBuildChecks, getWorksheet, answerMatches, isYesNoProblem } from '../src/learning-content';
import { answerShape, canBuild, SLOTS, slotsFromAnswer } from '../src/answer-shape';
import { AREA_CUTS, areaTaskDone } from '../src/area-shapes';
import { getExtraPractice, hasGenerator } from '../src/practice-bank';
import { PART_FINDER_LESSONS } from '../src/part-finder';
import type { Mission } from '../src/game';
import type { WorksheetProblem } from '../src/learning-content';

/** Practice, games, check-ins and grown-ups live in the top bar's "More" menu. */
async function openMenuItem(page: import('@playwright/test').Page, testId: string) {
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId(testId).click();
}

async function openAsGuest(page: import('@playwright/test').Page) {
  await page.route('**/api/**', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ error: 'Not signed in.' }),
  }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
}

async function retryLessonQuestion(
  page: import('@playwright/test').Page,
  question: Mission['questions'][number],
) {
  const wrongChoice = (question.correctChoice + 1) % question.choices.length;
  await page.getByTestId(`button-answer-${question.id}-${wrongChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toContainText('Not quite!');

  await page.getByTestId('button-try-again').click();
  await expect(page.getByTestId('button-check-answer')).toBeDisabled();
  const correctAnswer = page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`);
  await expect(correctAnswer).toHaveAttribute('aria-pressed', 'false');
  await correctAnswer.click();
  await expect(page.getByTestId('button-check-answer')).toBeEnabled();
  await expect(correctAnswer).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).not.toContainText('Not quite!');
  await expect(page.getByTestId('button-next-question')).toBeVisible();
}

function masteredRecord(missionId: string) {
  const checks = Object.fromEntries(getBuildChecks(missionId).map((check) => [
    check.id,
    { passed: true, supported: false, attempts: 1 },
  ]));
  const worksheet = Object.fromEntries(getWorksheet(missionId).map((problem) => [
    problem.id,
    { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false },
  ]));
  return { practiceDone: true, checks, worksheet, helpUses: 0, misconceptions: {} };
}

function progressBefore(mission: Mission) {
  const missionIndex = MISSIONS.findIndex((item) => item.id === mission.id);
  return {
    completedMissionIds: [],
    starsByMission: {},
    reviewQueue: [],
    learning: {
      ...Object.fromEntries(MISSIONS.slice(0, missionIndex).map((item) => [item.id, masteredRecord(item.id)])),
      [mission.id]: { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} },
    },
    assessments: [],
  };
}

async function expectMissionStart(page: import('@playwright/test').Page, missionId: string, unlocked: boolean) {
  // Current/next lesson nodes animate continuously, so wait-for-stability clicks can hang.
  const node = page.getByTestId(`button-node-${missionId}`);
  await node.click({ force: true });
  if (await node.getAttribute('aria-expanded') !== 'true') await node.click({ force: true });
  await expect(node).toHaveAttribute('aria-expanded', 'true');
  const start = page.getByTestId(`button-start-mission-${missionId}`);
  if (unlocked) await expect(start).toBeEnabled();
  else await expect(start).toBeDisabled();
}

/** Steppers have no typing: press +10/−10 and +/− until the value matches. */
async function setStepper(page: import('@playwright/test').Page, id: string, target: number) {
  const read = async () => { const text = (await page.getByTestId(`value-${id}`).textContent())?.trim() ?? ''; return /^\d+$/.test(text) ? Number(text) : 0; };
  for (let guard = 0; guard < 60; guard++) {
    const value = await read();
    if (value === target) return;
    const diff = target - value;
    const big = Math.abs(diff) >= 10 && await page.getByTestId(`button-${id}-${diff > 0 ? 'plus10' : 'minus10'}`).count();
    await page.getByTestId(`button-${id}-${diff > 0 ? 'plus' : 'minus'}${big ? '10' : ''}`).click();
  }
  throw new Error(`Could not set ${id} to ${target}`);
}

/** Build an answer with tiles (tap a box, then tap tiles), clearing anything already there. */
async function buildTileAnswer(scope: import('@playwright/test').Locator, prefix: string, problem: WorksheetProblem, answer: string) {
  const shape = answerShape(problem);
  const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();
  if (shape.kind === 'pick') {
    await scope.getByTestId(`tile-${prefix}-option-${shape.options.findIndex((option) => same(option, answer))}`).click();
  } else if (shape.kind === 'symbol') {
    await scope.getByTestId(`tile-${prefix}-symbol-${({ '<': 'lt', '=': 'eq', '>': 'gt' } as Record<string, string>)[answer.trim()]}`).click();
  } else if (shape.kind === 'ordered') {
    for (let slot = 0; slot < shape.items.length; slot++) {
      const box = scope.getByTestId(`slot-${prefix}-${slot}`);
      if (((await box.getAttribute('class')) ?? '').includes('filled')) await box.click();
    }
    for (const item of answer.split(',').map((value) => value.trim())) await scope.getByTestId(`tile-${prefix}-card-${shape.items.indexOf(item)}`).click();
  } else if (shape.kind !== 'yesno') {
    const slots = slotsFromAnswer(shape, answer);
    for (const name of SLOTS[shape.kind]) {
      const box = scope.getByTestId(`slot-${prefix}-${name}`);
      await box.click();
      for (let k = 0; k < 4 && ((await box.textContent()) ?? '').trim(); k++) await scope.getByTestId(`button-${prefix}-erase`).click();
      for (const digit of slots[name] ?? '') await scope.getByTestId(`tile-${prefix}-digit-${digit}`).click();
    }
  }
}

/** A wrong answer that can still be built with the question's tiles. */
function wrongTileAnswer(problem: WorksheetProblem): string {
  const shape = answerShape(problem);
  const candidates = shape.kind === 'yesno' ? ['yes', 'no']
    : shape.kind === 'pick' ? shape.options
    : shape.kind === 'symbol' ? ['<', '=', '>']
    : shape.kind === 'ordered' ? [[...shape.items].reverse().join(', '), shape.items.join(', ')]
    : ['99', '98', '9/99', '99/1', '1 1/99', '9.9', '99%', '0'];
  return candidates.find((candidate) => canBuild(shape, candidate) && !answerMatches(problem, candidate))!;
}

async function enterModel(
  page: import('@playwright/test').Page,
  checkId: string,
  builder: 'a' | 'b',
  target: ReturnType<typeof getBuildChecks>[number]['target'],
) {
  const builderId = `${checkId}-${builder}`;
  await setStepper(page, `${builderId}-d`, target.d);

  if (target.kind === 'bar') {
    if (target.wholes > 1) await setStepper(page, `${builderId}-wholes`, target.wholes);
    for (let part = 0; part < target.n; part++) {
      await page.getByTestId(`piece-${builderId}-${part}`).click();
    }
  } else if (target.kind === 'set') {
    for (let group = 0; group < target.n; group++) {
      await page.getByTestId(`group-${builderId}-${group}`).click();
    }
  } else {
    await page.getByTestId(`tick-${builderId}-${target.n}`).click();
  }
}

async function completeBuilds(page: import('@playwright/test').Page, missionId: string) {
  for (const check of getBuildChecks(missionId)) {
    await enterModel(page, check.id, 'a', check.target);
    await expect(page.getByTestId(`status-primary-${check.id}`)).toBeVisible();
    await enterModel(page, check.id, 'b', {
      ...check.target,
      kind: check.target.kind === 'line' ? 'bar' : 'line',
      wholes: Math.max(1, Math.ceil(check.target.n / check.target.d)),
    });
    await expect(page.getByTestId(`status-secondary-${check.id}`)).toBeVisible();
    await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
    await page.getByTestId(`button-check-${check.id}`).click();
    // The passed check stays with its explanation until Next is pressed (no automatic jump).
    await expect(page.getByTestId(`status-pass-${check.id}`)).toBeVisible();
    await expect(page.getByTestId(`check-${check.id}`)).toBeVisible();
    await page.getByTestId(`button-next-${check.id}`).click();
    if (check.id === 'build') await expect(page.getByTestId('check-transfer')).toBeVisible();
    else await expect(page.getByTestId('section-worksheet')).toBeVisible();
  }
}

async function buildWorksheetModel(page: import('@playwright/test').Page, problem: WorksheetProblem) {
  const row = page.getByTestId(`row-worksheet-${problem.id}`);
  if (problem.modelRequired && problem.model?.kind === 'bar') {
    const total = problem.model.d * problem.model.wholes;
    const count = problem.task?.kind === 'count'
      ? total
      : problem.task?.kind === 'shade'
        ? problem.task.n
        : problem.model.n;
    for (let part = 0; part < count; part++) {
      await row.getByTestId(`button-copy-part-${part + 1}`).click();
    }
  }
  if (problem.area && problem.areaTask) {
    const pieceCount = AREA_CUTS[problem.area.cut].length;
    let answer: number[] | undefined;
    for (let mask = 1; mask < 2 ** pieceCount && !answer; mask++) {
      const pieces = Array.from({ length: pieceCount }, (_, index) => index).filter((index) => mask & (1 << index));
      if (areaTaskDone(problem.area.cut, problem.areaTask, pieces)) answer = pieces;
    }
    if (!answer) throw new Error(`No valid area model found for ${problem.id}`);
    for (const piece of answer) {
      await row.getByTestId(`button-area-piece-${piece + 1}`).click();
    }
  }
}

async function enterWorksheetAnswer(page: import('@playwright/test').Page, problem: WorksheetProblem, answer: string) {
  const row = page.getByTestId(`row-worksheet-${problem.id}`);
  if (isYesNoProblem(problem)) {
    const choice = answer.trim().toLowerCase();
    if (choice !== 'yes' && choice !== 'no') throw new Error(`Expected a Yes/No answer for ${problem.id}`);
    await row.getByTestId(`button-worksheet-${problem.id}-${choice}`).click();
  } else {
    await buildTileAnswer(row, `ws-${problem.id}`, problem, answer);
  }
  await row.getByTestId(`button-check-worksheet-${problem.id}`).click();
}

const unitRepresentativeIds = [
  'equal-parts',
  'sets-nonunit',
  'fraction-magnitude',
  'number-line-beyond-one',
  'order-fractions',
  'missing-equivalent',
  'mixed-improper',
  'multiply-whole-by-fraction',
  'order-unlike-fractions',
  'fraction-of-quantity',
  'divide-whole-by-unit-fraction',
  'fraction-as-division',
  'fraction-recipes',
  'multi-step-fraction-stories',
];

for (const missionId of unitRepresentativeIds) {
  const mission = MISSIONS.find((item) => item.id === missionId)!;
  test(`unit ${mission.unit} model builds and worksheet evidence unlock lessons in order`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.addInitScript((progress) => {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    }, progressBefore(mission));
    await openAsGuest(page);

    // In units 9–14, same-unit lessons are selectable together; the next unit stays gated.
    const nextMission = MISSIONS[MISSIONS.indexOf(mission) + 1];
    const gateBoundaryMission = mission.unit < 9
      ? nextMission
      : MISSIONS.find((item) => item.unit === mission.unit + 1);
    if (gateBoundaryMission) await expectMissionStart(page, gateBoundaryMission.id, false);
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await expect(page.getByTestId('learning-lab')).toBeVisible();

    await completeBuilds(page, mission.id);
    await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByTestId('button-lab-finish')).toBeDisabled();

    // Passing the two model checks alone is not enough to open the next lesson.
    await page.getByTestId('button-lab-back').click();
    if (gateBoundaryMission) await expectMissionStart(page, gateBoundaryMission.id, false);
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await expect(page.getByTestId('section-worksheet')).toBeVisible();

    const worksheet = getWorksheet(mission.id);
    if (mission.id === 'equal-parts') {
      const problem = worksheet.find((row) => !row.modelRequired && !row.areaTask)!;
      const wrongAnswer = wrongTileAnswer(problem);
      await enterWorksheetAnswer(page, problem, wrongAnswer);
      await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Not yet.');
      await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '0');
      await expect(page.getByTestId('button-lab-finish')).toBeDisabled();
    }

    for (const problem of worksheet) {
      await buildWorksheetModel(page, problem);
      await enterWorksheetAnswer(page, problem, problem.answer);
      await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Correct!');
    }
    await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '12');
    await expect(page.getByTestId('text-next-level')).toHaveText('All done! The next lesson is open.');
    await expect(page.getByTestId('button-lab-finish')).toBeEnabled();

    await page.getByTestId('button-lab-finish').click();
    const breakOverlay = page.getByTestId('brain-break-overlay');
    if (await breakOverlay.isVisible()) await page.getByTestId('button-break-skip').click();
    await expect(page.getByTestId('status-mission-complete')).toBeVisible();
    await page.getByTestId('button-return-map').click();
    if (mission.unit < 8) {
      const expected = MISSIONS[MISSIONS.indexOf(mission) + 1];
      const later = MISSIONS[MISSIONS.indexOf(mission) + 2];
      await expectMissionStart(page, expected.id, true);
      if (later) await expectMissionStart(page, later.id, false);
    } else if (mission.unit < 14) {
      const expected = MISSIONS.find((item) => item.unit === mission.unit + 1)!;
      const laterUnit = MISSIONS.find((item) => item.unit === mission.unit + 2);
      await expectMissionStart(page, expected.id, true);
      if (laterUnit) await expectMissionStart(page, laterUnit.id, false);
    } else {
      await expectMissionStart(page, mission.id, true);
    }
  });
}

test('a new learner can start a lesson from the top of the course', async ({ page }) => {
  await openAsGuest(page);
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);

  await page.getByTestId('button-continue-course').click();
  await expect(page.locator('#lesson-title')).toBeVisible();
  await expect(page.getByTestId('button-listen-learning-text').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);
});

test('all 68 lessons render their worked model and first interactive question', async ({ page }) => {
  test.setTimeout(300_000);
  const lessonIds = MISSIONS.map((mission) => mission.id);
  await page.addInitScript((ids) => {
    const completedAt = Date.now();
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: ids,
      starsByMission: {},
      reviewQueue: [],
      learning: Object.fromEntries(ids.map((id) => [id, { completedAt }])),
      assessments: [],
    }));
  }, lessonIds);
  await openAsGuest(page);

  for (const mission of MISSIONS) {
    await page.getByTestId(`button-node-${mission.id}`).click();
    const startLesson = page.getByTestId(`button-start-mission-${mission.id}`);
    await expect(startLesson).toBeEnabled();
    await startLesson.click();

    await expect(page.locator('#lesson-title')).toHaveText(mission.title);
    await expect(page.locator('.fq-example .fq-model-area')).toBeVisible();
    await page.getByTestId('button-start-practice').click();
    if (PART_FINDER_LESSONS.has(mission.id)) await page.getByTestId('button-hands-on-skip').click();

    const question = mission.questions[0];
    await expect(page.getByTestId('status-lesson-progress')).toHaveAttribute('aria-label', /^Question 1 of \d+$/);
    await expect(page.locator('.fq-model-area')).toBeVisible();
    await expect(page.locator('.fq-answer-choices button')).toHaveCount(question.choices.length);
    await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
    await page.getByTestId('button-check-answer').click();
    await expect(page.getByTestId('status-feedback')).toBeVisible();

    await page.getByTestId('button-back-map').click();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  }
});

test('learners can correct a wrong answer across every lesson model type', async ({ page }) => {
  test.setTimeout(60_000);
  const modelKinds = ['area', 'bars', 'decimal', 'line', 'partition', 'set'] as const;
  const representativeMissions = modelKinds.map((kind) =>
    MISSIONS.find((mission) => mission.questions[0]?.model.kind === kind),
  );
  expect(representativeMissions.every(Boolean)).toBe(true);

  await page.addInitScript((ids) => {
    const completedAt = Date.now();
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: ids,
      starsByMission: {},
      reviewQueue: [],
      learning: Object.fromEntries(ids.map((id) => [id, { completedAt }])),
      assessments: [],
    }));
  }, MISSIONS.map((item) => item.id));
  await openAsGuest(page);

  for (const mission of representativeMissions) {
    if (!mission) throw new Error('Missing lesson for a question model type');
    await page.getByTestId(`button-node-${mission.id}`).click();
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await page.getByTestId('button-start-practice').click();
    if (PART_FINDER_LESSONS.has(mission.id)) await page.getByTestId('button-hands-on-skip').click();

    const question = mission.questions[0];
    await expect(page.locator('.fq-model-area')).toBeVisible();
    await retryLessonQuestion(page, question);
    await page.getByTestId('button-next-question').click();
    await expect(page.getByTestId('status-lesson-progress')).toHaveAttribute('aria-label', /^Question 2 of \d+$/);
    await page.getByTestId('button-back-map').click();
  }
});

test('a generated practice question can be corrected and continued', async ({ page }) => {
  const mission = MISSIONS.find((item) => hasGenerator(item.id))!;
  const generatedQuestion = getExtraPractice(mission.id, mission.questions.map((question) => question.id))[0];
  expect(generatedQuestion).toBeDefined();
  expect(generatedQuestion.id).not.toBe(mission.questions[0].id);

  await page.addInitScript((ids) => {
    const completedAt = Date.now();
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: ids,
      starsByMission: {},
      reviewQueue: [],
      learning: Object.fromEntries(ids.map((id) => [id, { completedAt }])),
      assessments: [],
    }));
  }, MISSIONS.map((item) => item.id));
  await openAsGuest(page);
  await page.getByTestId(`button-node-${mission.id}`).click();
  await page.getByTestId(`button-practice-more-${mission.id}`).click();

  await expect(page.getByTestId('status-lesson-progress')).toHaveAttribute('aria-label', /^Question 1 of \d+$/);
  await expect(page.getByTestId(`button-answer-${generatedQuestion.id}-0`)).toBeVisible();
  await retryLessonQuestion(page, generatedQuestion);
  await page.getByTestId('button-next-question').click();
  await expect(page.getByTestId('status-lesson-progress')).toHaveAttribute('aria-label', /^Question 2 of \d+$/);
});

test('a completed learner can open a redo section without changing the lesson route', async ({ page }) => {
  const buildChecks = getBuildChecks('equal-parts');
  const worksheet = getWorksheet('equal-parts');
  const completedRecord = {
    practiceDone: true,
    checks: Object.fromEntries(buildChecks.map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
    worksheet: Object.fromEntries(worksheet.map((problem) => [problem.id, {
      draft: problem.answer,
      checkedValue: problem.answer,
      attempts: 1,
      supported: false,
    }])),
    helpUses: 0,
    misconceptions: {},
  };
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, {
    completedMissionIds: ['equal-parts'],
    starsByMission: { 'equal-parts': 1 },
    reviewQueue: [],
    learning: { 'equal-parts': completedRecord },
    assessments: [],
  });
  await openAsGuest(page);
  await page.getByTestId('button-node-equal-parts').click();
  const redo = page.getByTestId('button-redo-equal-parts');
  await expect(redo).toBeVisible();
  await redo.click();
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await expect(page.getByTestId('button-redo-builds')).toBeVisible();
  await expect(page.getByTestId('button-redo-worksheet')).toBeVisible();
  await page.getByTestId('button-redo-worksheet').click();
  await expect(page.getByTestId('section-redo-worksheet')).toBeVisible();
  const yesNoCards = page.getByRole('group', { name: 'Choose yes or no' }).first();
  const yes = yesNoCards.getByRole('button', { name: 'Yes' });
  const no = yesNoCards.getByRole('button', { name: 'No' });
  await expect(yes).toBeVisible();
  await expect(no).toBeVisible();
  await yes.click();
  await expect(yes).toHaveAttribute('aria-pressed', 'true');
  await no.click();
  await expect(no).toHaveAttribute('aria-pressed', 'true');
  await expect(yes).toHaveAttribute('aria-pressed', 'false');
});

test('daily practice opens as a separate short session', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.locator('.fq-taskbar-title')).toContainText('Daily practice');
  await expect(page.locator('#daily-question-title')).toBeVisible();
  await expect(page.getByTestId('button-daily-hint')).toBeVisible();
});

test('lesson 1 has hands-on cake rounds after the worked example: equal pieces, then mixed shapes', async ({ page }) => {
  await openAsGuest(page);
  await page.getByTestId('button-continue-course').click();
  await page.getByTestId('button-start-practice').click();
  await expect(page.getByTestId('button-hands-on-skip')).toHaveCount(0);

  await expect(page.getByRole('heading', { name: 'Share a cake cut into equal pieces' })).toBeVisible();
  await expect(page.getByText(/4 friends share this square cake\. It is cut into 8 equal pieces\./)).toBeVisible();
  await expect(page.getByText(/each share gets 2/i)).toHaveCount(0);
  await expect(page.locator('.fq-pf-interactive .fq-pf-piece')).toHaveCount(8);
  await expect(page.getByTestId('part-finder-selection')).toHaveText('0 of 8 pieces given out.');

  const assignPiece = async (pieceNumber: number) => {
    const piece = page.getByTestId(`button-part-finder-piece-${pieceNumber}`);
    await piece.focus();
    await piece.press('Enter');
  };
  await assignPiece(1);
  await assignPiece(2);
  await page.getByTestId('button-part-finder-share-2').click();
  await assignPiece(3);
  await assignPiece(4);
  await page.getByTestId('button-part-finder-share-3').click();
  await assignPiece(5);
  await assignPiece(6);
  await page.getByTestId('button-part-finder-share-4').click();
  await assignPiece(7);
  await assignPiece(8);
  await expect(page.getByTestId('part-finder-selection')).toHaveText('8 of 8 pieces given out.');
  await page.getByTestId('button-part-finder-check').click();
  await expect(page.getByTestId('part-finder-feedback')).toContainText('Each friend gets 2 of the 8 equal pieces.');

  await page.getByTestId('button-part-finder-next').click();
  await expect(page.getByRole('heading', { name: 'Now the pieces are different shapes' })).toBeVisible();
  await expect(page.locator('.fq-pf-interactive .fq-pf-piece')).toHaveCount(7);
  await expect(page.getByTestId('part-finder-selection')).toHaveText('0 of 7 pieces given out.');
  await assignPiece(1);
  await page.getByTestId('button-part-finder-share-2').click();
  await assignPiece(2);
  await assignPiece(3);
  await page.getByTestId('button-part-finder-share-3').click();
  await assignPiece(4);
  await assignPiece(5);
  await page.getByTestId('button-part-finder-share-4').click();
  await assignPiece(6);
  await assignPiece(7);
  await page.getByTestId('button-part-finder-check').click();
  await expect(page.getByTestId('part-finder-feedback')).toContainText('Every friend gets 1/4 of the cake.');
  await page.getByTestId('button-part-finder-next').click();
  await expect(page.getByTestId('status-lesson-progress')).toHaveAttribute('aria-label', /^Question 1 of \d+$/);
});

test('daily bar builder explains the denominator as total equal parts in one whole', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: [],
      starsByMission: {},
      reviewQueue: [],
      dailyPractice: {
        day,
        startedAt: now.getTime(),
        questions: [{
          id: 'daily-bar-one-fourth',
          missionId: 'equal-parts',
          topicTitle: 'Equal parts',
          modelKind: 'bar',
          numerator: 1,
          denominator: 4,
          explanation: 'One of four equal parts is one fourth.',
          kind: 'build',
        }],
        index: 0,
        attempts: {},
      },
    }));
  });
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-daily-practice');

  await expect(page.getByTestId('text-daily-parts-instruction')).toHaveText(
    'The denominator (bottom number) tells how many equal parts make one whole: choose that below. The numerator (top number) tells how many of those parts to shade.',
  );
  await expect(page.getByText('Total equal parts in one whole', { exact: true })).toBeVisible();
  const fourParts = page.getByRole('radio', { name: '4 equal parts in one whole' });
  await expect(fourParts).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('button-daily-parts-4').click();
  await expect(fourParts).toHaveAttribute('aria-checked', 'true');
  await expect(page.locator('.fq-whole-bracket')).toHaveText('1 whole: 4 equal parts');
});

test('daily number-line model lets a learner choose the 1/3 landing point after 2/3', async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date();
    const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: [],
      starsByMission: {},
      reviewQueue: [],
      dailyPractice: {
        day,
        startedAt: now.getTime(),
        questions: [{
          id: 'daily-line-one-third',
          missionId: 'equal-parts',
          topicTitle: 'Equal parts',
          modelKind: 'number-line',
          numerator: 1,
          denominator: 3,
          explanation: 'The line from 0 to 1 has 3 equal spaces. One jump lands at 1/3.',
          kind: 'build',
        }],
        index: 0,
        attempts: {},
      },
    }));
  });
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-daily-practice');
  await page.getByTestId('button-daily-parts-3').click();

  const twoThirds = page.getByTestId('button-daily-jump-2');
  const oneThird = page.getByTestId('button-daily-jump-1');
  await twoThirds.click();
  await expect(twoThirds).toHaveAttribute('aria-checked', 'true');
  await oneThird.click();
  await expect(oneThird).toHaveAttribute('aria-checked', 'true');
  await expect(twoThirds).toHaveAttribute('aria-checked', 'false');
  await page.getByTestId('button-daily-check-model').click();
  await expect(page.getByRole('status')).toContainText('That’s it!');
});

test('an adult progress report can invoke browser printing', async ({ page }) => {
  await page.addInitScript(() => {
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => { (window as Window & { __printCalls?: number }).__printCalls! += 1; };
  });
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge?.match(/(\d+)\s×\s(\d+)/);
  expect(factors).not.toBeNull();
  await page.getByRole('textbox').fill(String(Number(factors![1]) * Number(factors![2])));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('parent-report')).toBeVisible();
  await page.getByTestId('button-parent-print').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(1);
});

test('the map shows only lessons; extras live in the More menu; start becomes jump after the first lesson', async ({ page }) => {
  await openAsGuest(page);
  await expect(page.getByTestId('button-continue-course')).toContainText('Start your first lesson');
  await expect(page.getByTestId('button-jump-current')).toHaveCount(0);
  for (const id of ['button-start-daily-practice', 'button-open-concept-games', 'button-open-assessments', 'button-find-level', 'button-open-parent']) {
    await expect(page.getByTestId(id)).toHaveCount(0); // not on the map itself
  }
  await page.getByTestId('button-app-menu').click();
  await expect(page.getByTestId('app-menu')).toBeVisible();
  for (const id of ['button-start-daily-practice', 'button-open-concept-games', 'button-open-assessments', 'button-find-level', 'button-open-parent']) {
    await expect(page.getByTestId(id)).toBeVisible();
  }
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('app-menu')).toHaveCount(0);

  // After the first lesson is finished, the map offers "Jump to current section" instead.
  const first = MISSIONS[0];
  await page.evaluate((record) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [], learning: { [record.id]: record.value }, assessments: [] }));
  }, { id: first.id, value: masteredRecord(first.id) });
  await page.reload();
  await expect(page.getByTestId('button-continue-course')).toHaveCount(0);
  const jump = page.getByTestId('button-jump-current');
  await expect(jump).toContainText('Jump to current section');
  await jump.click();
  await expect(page.getByTestId(`button-node-${MISSIONS[1].id}`)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId(`button-start-mission-${MISSIONS[1].id}`)).toBeInViewport();
});

test('top-bar symbols explain themselves when tapped, one at a time', async ({ page }) => {
  await openAsGuest(page);
  await page.getByTestId('button-tip-streak').click();
  await expect(page.getByTestId('button-tip-streak-tip')).toContainText('streak');
  await page.getByTestId('button-tip-xp').click();
  await expect(page.getByTestId('button-tip-xp-tip')).toContainText('10 points for every right answer');
  await expect(page.getByTestId('button-tip-streak-tip')).toHaveCount(0);
  await page.getByTestId('button-tip-daily').click();
  await expect(page.getByTestId('button-tip-daily-tip')).toContainText("Today's goal");
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('button-tip-daily-tip')).toHaveCount(0);
  await page.getByTestId('button-tip-account').click();
  await expect(page.getByTestId('button-tip-account-tip')).toContainText('Playing as');
  await page.locator('h1').first().click();
  await expect(page.getByTestId('button-tip-account-tip')).toHaveCount(0);
});
