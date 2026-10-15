import { expect, test } from '@playwright/test';
import { MISSIONS } from '../src/game';
import { answerShape, slotsFromAnswer, SLOTS } from '../src/answer-shape';
import { getBuildChecks, getWorksheet } from '../src/learning-content';

const lesson = MISSIONS.find((mission) => mission.id === 'fraction-magnitude');
if (!lesson) throw new Error('The representative phone Safari lesson is missing');

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

async function openLesson(page: import('@playwright/test').Page, resumeWorksheet = false) {
  const missionIndex = MISSIONS.indexOf(lesson);
  const earlierLessons = MISSIONS.slice(0, missionIndex);
  const masteredRecord = (missionId: string) => ({
    practiceDone: true,
    checks: Object.fromEntries(getBuildChecks(missionId).map((check) => [
      check.id,
      { passed: true, supported: false, attempts: 1 },
    ])),
    worksheet: Object.fromEntries(getWorksheet(missionId).map((problem) => [
      problem.id,
      { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false },
    ])),
    helpUses: 0,
    misconceptions: {},
  });
  const learning = Object.fromEntries(earlierLessons.map((mission) => [mission.id, masteredRecord(mission.id)]));
  learning[lesson.id] = {
    practiceDone: resumeWorksheet,
    checks: Object.fromEntries(getBuildChecks(lesson.id).map((check) => [
      check.id,
      { passed: true, supported: false, attempts: 1 },
    ])),
    worksheet: {},
    helpUses: 0,
    misconceptions: {},
  };

  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({
      completedMissionIds: progress.completedMissionIds,
      starsByMission: {},
      reviewQueue: [],
      learning: progress.learning,
      assessments: [],
    }));
  }, { completedMissionIds: earlierLessons.map((mission) => mission.id), learning });

  await openAsGuest(page);
  const node = page.getByTestId(`button-node-${lesson.id}`);
  await node.click({ force: true });
  if (await node.getAttribute('aria-expanded') !== 'true') await node.click({ force: true });
  await expect(node).toHaveAttribute('aria-expanded', 'true');
  await page.getByTestId(`button-start-mission-${lesson.id}`).click();
  if (resumeWorksheet) {
    await expect(page.getByTestId('learning-lab')).toBeVisible();
    await expect(page.getByTestId('section-worksheet')).toBeVisible();
  } else {
    await expect(page.getByTestId('lesson-example')).toBeVisible();
    await expect(page.getByTestId('question-model-area')).toBeVisible();
  }
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}

test('phone Safari opens a lesson, accepts its first tap answer, and advances', async ({ page }) => {
  await openLesson(page);

  const firstQuestion = lesson.questions[0];
  const answer = page.getByTestId(`button-answer-${firstQuestion.id}-${firstQuestion.correctChoice}`);
  await expect(answer).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await answer.tap();
  await page.getByTestId('button-check-answer').tap();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');

  await page.getByTestId('button-next-question').tap();
  await expect(page.getByTestId('status-lesson-progress')).toHaveAttribute('aria-label', /^Question 2 of \d+$/);
  await expect(page.getByTestId('question-model-area')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('phone Safari can enter a lesson worksheet number with the keyboard-operable digit tiles', async ({ page }) => {
  const worksheetProblem = getWorksheet(lesson.id).find((problem) => {
    const shape = answerShape(problem);
    return shape.kind === 'number' || shape.kind === 'fraction' || shape.kind === 'mixed' || shape.kind === 'decimal';
  });
  if (!worksheetProblem) throw new Error(`Lesson ${lesson.id} has no numeric worksheet answer`);

  await openLesson(page, true);

  const row = page.getByTestId(`row-worksheet-${worksheetProblem.id}`);
  const shape = answerShape(worksheetProblem);
  const values = slotsFromAnswer(shape, worksheetProblem.answer);
  for (const slotName of SLOTS[shape.kind]) {
    const slot = row.getByTestId(`slot-ws-${worksheetProblem.id}-${slotName}`);
    await slot.focus();
    await slot.press('Enter');
    for (const digit of values[slotName] ?? '') {
      const tile = row.getByTestId(`tile-ws-${worksheetProblem.id}-digit-${digit}`);
      await tile.focus();
      await tile.press('Enter');
    }
  }

  await expect(row.getByTestId(`button-check-worksheet-${worksheetProblem.id}`)).toBeEnabled();
  await expectNoHorizontalOverflow(page);
  await row.getByTestId(`button-check-worksheet-${worksheetProblem.id}`).tap();
  await expect(row.getByTestId(`status-worksheet-${worksheetProblem.id}`)).toContainText('Correct!');
});
