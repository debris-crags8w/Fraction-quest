import { expect, test } from '@playwright/test';
import { MISSIONS } from '../src/game';
import { getBuildChecks, getWorksheet, answerMatches, isYesNoProblem } from '../src/learning-content';
import { usesFractionEntry } from '../src/FractionEntry';
import { AREA_CUTS, areaTaskDone } from '../src/area-shapes';
import { getExtraPractice, hasGenerator } from '../src/practice-bank';
import type { Mission } from '../src/game';
import type { WorksheetProblem } from '../src/learning-content';

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

async function enterModel(
  page: import('@playwright/test').Page,
  checkId: string,
  builder: 'a' | 'b',
  target: ReturnType<typeof getBuildChecks>[number]['target'],
) {
  const builderId = `${checkId}-${builder}`;
  const denominator = page.getByTestId(`input-${builderId}-d`);
  await denominator.fill(String(target.d));
  await denominator.press('Enter');

  if (target.kind === 'bar') {
    if (target.wholes > 1) {
      const wholes = page.getByTestId(`input-${builderId}-wholes`);
      await wholes.fill(String(target.wholes));
      await wholes.press('Enter');
    }
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
  } else if (usesFractionEntry(problem)) {
    const [numerator, denominator] = answer.trim().split('/');
    if (denominator === undefined) throw new Error(`Expected a fraction answer for ${problem.id}`);
    await row.getByTestId(`input-ws-${problem.id}-numerator`).fill(numerator.trim());
    await row.getByTestId(`input-ws-${problem.id}-denominator`).fill(denominator.trim());
  } else {
    await row.getByTestId(`input-worksheet-${problem.id}`).fill(answer);
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
      const wrongAnswer = isYesNoProblem(problem)
        ? problem.answer === 'yes' ? 'no' : 'yes'
        : (usesFractionEntry(problem) ? ['0/0'] : ['not an answer', '999999', 'no', 'yes'])
          .find((candidate) => !answerMatches(problem, candidate))!;
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
  await page.getByTestId('button-start-daily-practice').click();
  await expect(page.getByRole('heading', { name: /build it\. name it\. remember it\./i })).toBeVisible();
  await expect(page.getByTestId('button-daily-hint')).toBeVisible();
});

test('Part Finder shows and sorts eight equal pieces into four fair shares', async ({ page }) => {
  await openAsGuest(page);
  await page.getByTestId('button-part-finder-equal-parts').click();

  await expect(page.getByRole('heading', { name: 'Make 4 fair shares' })).toBeVisible();
  await expect(page.getByText('Put all 8 equal pieces into 4 shares. Each share gets 2 pieces.')).toBeVisible();
  await expect(page.locator('.fq-pf-interactive .fq-pf-piece')).toHaveCount(8);
  await expect(page.getByTestId('part-finder-selection')).toHaveText('0 of 8 equal pieces are in a share.');

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
  await expect(page.getByTestId('part-finder-selection')).toHaveText('8 of 8 equal pieces are in a share.');
  await page.getByTestId('button-part-finder-check').click();
  await expect(page.getByTestId('part-finder-feedback')).toContainText('Each share has 2 equal pieces.');
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
  await page.getByTestId('button-start-daily-practice').click();

  await expect(page.getByTestId('text-daily-parts-instruction')).toHaveText(
    'The bottom number, 4, tells how many equal parts make the whole. Choose 4 below. The top number, 1, tells you to shade 1 part.',
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
  await page.getByTestId('button-start-daily-practice').click();
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
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge?.match(/(\d+)\s×\s(\d+)/);
  expect(factors).not.toBeNull();
  await page.getByRole('textbox').fill(String(Number(factors![1]) * Number(factors![2])));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('parent-report')).toBeVisible();
  await page.getByTestId('button-parent-print').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(1);
});
