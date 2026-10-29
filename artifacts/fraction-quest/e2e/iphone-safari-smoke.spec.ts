import { expect, test } from './fixtures';
import { MISSIONS } from '../src/game';
import { answerShape, slotsFromAnswer, SLOTS } from '../src/answer-shape';
import { getBuildChecks, getWorksheet } from '../src/learning-content';
import { ideaQuestion, ideaSteps, lessonIdeas } from '../src/lesson-ideas';
import { completeIdeas, finishPutTogether, hasStoryAfterIdeas } from './lesson-walk';

/** A new lesson opens with story screens (the setup and prologue once, then the chapter comic, which may ask for a choice). */
async function passStory(page: import('@playwright/test').Page) {
  for (let screen = 0; screen < 3; screen++) {
    await page.waitForTimeout(50);
    const introGo = page.getByTestId('button-story-intro-go');
    if (await introGo.isVisible()) {
      await introGo.click();
      continue;
    }
    const skip = page.getByTestId('button-story-skip');
    if (await skip.isVisible()) await skip.click();
    const go = page.getByTestId('button-story-go');
    if (!(await go.isVisible())) return;
    const choice = page.getByTestId('button-story-choice-0');
    if (await choice.isVisible()) await choice.click();
    await go.click();
  }
}


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

/** Open a lesson as a child who finished every lesson before it: past its story, on its first screen. */
async function startLesson(page: import('@playwright/test').Page, resumeWorksheet: boolean, target: (typeof MISSIONS)[number]) {
  const missionIndex = MISSIONS.indexOf(target);
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
  learning[target.id] = {
    practiceDone: resumeWorksheet,
    checks: Object.fromEntries(getBuildChecks(target.id).map((check) => [
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
  const node = page.getByTestId(`button-node-${target.id}`);
  await node.click({ force: true });
  if (await node.getAttribute('aria-expanded') !== 'true') await node.click({ force: true });
  await expect(node).toHaveAttribute('aria-expanded', 'true');
  await page.getByTestId(`button-start-mission-${target.id}`).click();
  await passStory(page);
}

async function openLesson(page: import('@playwright/test').Page, resumeWorksheet = false, target = lesson!) {
  await startLesson(page, resumeWorksheet, target);
  if (resumeWorksheet) {
    await expect(page.getByTestId('learning-lab')).toBeVisible();
    await expect(page.getByTestId('section-worksheet')).toBeVisible();
  } else {
    // A lesson opens on its first idea's Learn pages, then its first practice question.
    await expect(page.getByTestId('idea-learn-screen')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    for (let p = 1; p < lessonIdeas(target.id)![0]!.learn.length; p++) await page.getByTestId('button-teach-step-next').tap();
    await page.getByTestId('button-idea-practise').tap();
    await expect(page.getByTestId('question-model-area')).toBeVisible();
  }
}

/** The lesson's first question: its first idea's first practice. */
function firstQuestionOf(target: (typeof MISSIONS)[number]) {
  return ideaQuestion(target, (ideaSteps(target.id)[0]!.item as { question: string }).question)!;
}

async function expectNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const measureLayout = () => page.evaluate(() => {
    const width = window.innerWidth;
    const offenders = Array.from(document.querySelectorAll<HTMLElement>('#root, #root *'))
      .filter((element) => {
        let ancestor = element.parentElement;
        while (ancestor && ancestor !== document.documentElement) {
          const overflowX = getComputedStyle(ancestor).overflowX;
          if (overflowX === 'auto' || overflowX === 'scroll') return false;
          ancestor = ancestor.parentElement;
        }
        const rect = element.getBoundingClientRect();
        return rect.left < -1 || rect.right > width + 1;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          testId: element.dataset.testid ?? null,
          className: typeof element.className === 'string' ? element.className : '',
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      })
      .slice(0, 12);
    return {
      // The phone's own width: on a too-wide page, mobile Safari widens innerWidth to match, hiding the problem.
      viewportWidth: Math.min(width, window.screen.width),
      documentWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      containers: ['.fq-ll', '.fq-ll-sheet', '.fq-ll-sheet-head', '.fq-ll-problem-progress']
        .map((selector) => {
          const element = document.querySelector<HTMLElement>(selector);
          if (!element) return { selector, missing: true };
          const rect = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            selector,
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
            scrollWidth: element.scrollWidth,
            clientWidth: element.clientWidth,
            gridTemplateColumns: style.gridTemplateColumns,
            overflowX: style.overflowX,
          };
        }),
      offenders,
    };
  });
  try {
    // Nothing sticks out, and the page itself is no wider than the phone (a wider page makes iOS shrink everything).
    await expect.poll(async () => { const layout = await measureLayout(); return layout.offenders.length + Math.max(0, layout.documentWidth - layout.viewportWidth); }).toBe(0);
  } catch {
    const layout = await measureLayout();
    throw new Error(`Horizontal overflow in phone layout: ${JSON.stringify(layout)}`);
  }
}

test('phone Safari opens a lesson, accepts its first tap answer, and advances', async ({ page }) => {
  await openLesson(page);

  const firstQuestion = firstQuestionOf(lesson);
  const answer = page.getByTestId(`button-answer-${firstQuestion.id}-${firstQuestion.correctChoice}`);
  await expect(answer).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await answer.tap();
  await page.getByTestId('button-check-answer').tap();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');

  await page.getByTestId('button-next-question').tap();
  await expect(page.getByTestId('status-lesson-progress')).toHaveAttribute(
    'aria-label',
    /^Lesson question progress: 1 of \d+ completed$/,
  );
  await expect(page.getByTestId('status-lesson-progress').locator('.fq-sr')).toHaveText(
    /^Question 2 of \d+; 1 completed\.$/,
  );
  await expect(page.getByTestId('question-model-area')).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test('phone Safari can enter a lesson worksheet number with the keyboard-operable digit tiles', async ({ page }) => {
  // The first lesson from the representative one on whose worksheet a number is typed with the digit tiles (a
  // lesson whose worksheet only compares or picks has none).
  const typed = (problem: ReturnType<typeof getWorksheet>[number]) => {
    const shape = answerShape(problem);
    return shape.kind === 'number' || shape.kind === 'fraction' || shape.kind === 'mixed' || shape.kind === 'decimal';
  };
  const target = MISSIONS.slice(MISSIONS.indexOf(lesson!)).find((mission) => getWorksheet(mission.id).some(typed));
  const worksheetProblem = target && getWorksheet(target.id).find(typed);
  if (!target || !worksheetProblem) throw new Error('No lesson has a numeric worksheet answer');

  await openLesson(page, true, target);
  await expectNoHorizontalOverflow(page);
  // The steps are shortcuts: the Worksheet step jumps to the worksheet, which reads itself aloud on request.
  await page.getByTestId('button-go-worksheet').tap();
  await expect(page.locator('#ws-title')).toBeFocused();
  await expect(page.getByTestId('section-worksheet').getByRole('button', { name: 'Listen to the worksheet steps' })).toBeVisible();
  // Finished builds stay on the page, folded to one line; a green step goes back up and opens one in place, with a
  // practice-only "Build it again". The steps scroll sideways on a phone.
  const firstBuild = getBuildChecks(target.id)[0];
  const card = page.getByTestId(`section-done-${firstBuild.id}`);
  await expect(card).toBeVisible();
  await expect(card).not.toHaveAttribute('open', '');
  await expect.poll(() => page.getByTestId('list-lab-steps').evaluate((list) => getComputedStyle(list).flexWrap)).toBe('nowrap');
  await page.getByTestId(`button-see-step-${firstBuild.id}`).tap();
  await expect(card).toHaveAttribute('open', '');
  await expect(card).toBeInViewport();
  await expect(card).toContainText('done');
  await card.getByTestId(`button-build-again-${firstBuild.id}`).tap();
  await expect(card.locator('.fq-ll-builder').first()).toBeVisible();
  await card.getByTestId(`button-done-${firstBuild.id}`).tap();
  await expect(card).not.toHaveAttribute('open', '');

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

// The representative lesson, plus the lessons whose practices include cake rounds and card-ordering rounds. (Every screen
// of all 81 lessons is measured at iPhone Safari's size in course-smoke.spec.ts; that walk is too long for this job.)
for (const id of [lesson.id, 'equal-parts', 'order-unlike-fractions']) {
  test(`phone Safari walks ${id} as a child does: every Learn page fits, and no screen sticks out sideways`, async ({ page }) => {
    test.setTimeout(120_000);
    const target = MISSIONS.find((mission) => mission.id === id)!;
    const fits = async () => { await expectNoHorizontalOverflow(page); };
    const hooks = {
      // A Learn page: its line, picture and buttons are on the first screen. (A phone's page is taller by design: on a
      // touch screen it keeps a clear band at the bottom for Safari's toolbar, so the page height is not the measure.)
      onLearnPage: async (where: string) => {
        await expect(page.getByTestId('teach-scene').or(page.getByTestId('teach-words')).first()).toBeVisible();
        await page.evaluate(() => window.scrollTo(0, 0));
        const card = await page.getByTestId('idea-learn').evaluate((section) => ({ bottom: section.getBoundingClientRect().bottom, screen: window.innerHeight }));
        expect(card.bottom, `${where}: the Learn card fits the screen`).toBeLessThanOrEqual(card.screen + 1);
        await fits();
      },
      beforeRound: fits,
      beforeSortRound: fits,
      onQuestion: fits,
      // After Check, Next (or Finish) is on the screen.
      afterCheck: async (moveOn: import('@playwright/test').Locator) => { await expect(moveOn).toBeInViewport(); },
    };
    await startLesson(page, false, target);
    await completeIdeas(page, target, hooks);
    // "Put it together": the story problem (story mode is on). Its Finish opens the lesson page.
    expect(await finishPutTogether(page, target, hooks)).toBeGreaterThanOrEqual(hasStoryAfterIdeas(target) ? 1 : 0); // plus an earlier-lesson warm-up when one is due
  });
}
