import { expect, test } from '@playwright/test';
import { MISSIONS } from '../src/game';
import { getBuildChecks, getWorksheet } from '../src/learning-content';

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
    'The bottom number, 4, tells how many equal parts make the whole. Choose 4 below. The top number, 1, tells how many parts to shade.',
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
