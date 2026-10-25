import { expect, openSettings, test } from './fixtures';
import { CHALLENGES } from '../src/challenges';
import { FRACTION_ORDER_ROUNDS, fractionOrderMatches, getDueSkillReviewQuestions, MISSIONS } from '../src/game';
import { compareFractions, WAR_ROUNDS, warHint } from '../src/concept-games';
import { getCodeLevels } from '../src/code-quest';
import { getBuildChecks, getReviewCheck, getWorksheet, answerMatches, isYesNoProblem } from '../src/learning-content';
import { BUILD_ERROR_HEADINGS } from '../src/lab-copy';
import { answerShape, canBuild, SLOTS, slotsFromAnswer } from '../src/answer-shape';
import { AREA_CUTS, areaTaskDone } from '../src/area-shapes';
import { generateQuestions, getExtraPractice, hasGenerator } from '../src/practice-bank';
import { PART_FINDER_LESSONS, partFinderRoundsFor } from '../src/part-finder';
import { ideaQuestion, ideaSteps, lessonIdeas } from '../src/lesson-ideas';
import { completeIdeas, hasStoryAfterIdeas, solvePartFinderRound, solveSortRound } from './lesson-walk';
import { makeSprint } from '../src/CodeSprint';
import type { Mission } from '../src/game';
import type { WorksheetProblem } from '../src/learning-content';

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


/** The animated comics play like a cartoon; "Skip to the end" jumps to the last picture; the panels stay readable to screen readers. */
async function showWholeComic(page: import('@playwright/test').Page) {
  await page.getByTestId('story-comic').waitFor();
  const skip = page.getByTestId('button-story-skip');
  if (await skip.isVisible()) await skip.click();
}

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

async function localStorageSnapshot(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const entries: Array<[string, string | null]> = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key !== null) entries.push([key, localStorage.getItem(key)]);
    }
    entries.sort(([a], [b]) => a.localeCompare(b));
    return JSON.stringify(Object.fromEntries(entries));
  });
}

test('a "what fraction is colored" question shows the colored parts, so the child counts them before answering', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'fraction-of-area');
  if (!mission) throw new Error('Equal-area lesson is missing');
  // The lesson's first "what fraction is colored" question opens its second idea, after that idea's Learn pages.
  const steps = ideaSteps(mission.id);
  const at = steps.findIndex(({ item }) => 'question' in item && /What fraction of the \w+ is colored\?/.test(ideaQuestion(mission, item.question)!.prompt));
  const { idea, item } = steps[at]!;
  const question = ideaQuestion(mission, (item as { question: string }).question)!;
  expect(steps[at]!.practice).toBe(0);
  // The words never say how many parts to color: that would give the answer away.
  expect(question.prompt).not.toMatch(/\bColor \d/);
  expect(question.model.kind).toBe('area');
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);
  await completeIdeas(page, mission, { until: at });
  for (let p = 1; p < lessonIdeas(mission.id)![idea]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();

  const picture = page.getByTestId('question-model-area');
  await expect(picture).toBeVisible();
  await expect(picture.getByTestId('area-shade')).toHaveCount(0);
  await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
});

test('the garden lesson draws each garden to scale: side lengths outside, no part areas in a question', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'multiply-mixed-numbers');
  if (!mission) throw new Error('Garden lesson is missing');
  await page.setViewportSize({ width: 390, height: 664 });
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);
  await skipIntros(page);

  // Idea 1's Learn pages, then its first practice: a garden question.
  for (let p = 1; p < lessonIdeas(mission.id)![0]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  expect(ideaQuestion(mission, 'multiply-mixed-numbers-p1')!.model.kind).toBe('garden');
  const question = page.getByTestId('question-model-area').getByTestId('garden-plan');
  await expect(question).toBeVisible();
  await expect(question.locator('.fq-garden-part-label')).toHaveCount(0);
  // 2 1/3 m by 1 1/4 m: the longer side runs across, drawn to scale.
  await expect(question.getByTestId('garden-width')).toContainText('m');
  const box = await question.locator('svg').boundingBox();
  expect(box && box.width / box.height).toBeGreaterThan(1.5);
});

test('a question that says to plot lets the child tap the Xs on, then shows the finished plot once answered', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'plot-in-eighths');
  if (!mission) throw new Error('Plot in eighths lesson is missing');
  const question = mission.questions[0];
  expect(question.prompt).toContain('Plot them');
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);
  // The lesson teaches stacking (idea 2) before this question, its third practice.
  await completeIdeas(page, mission, { until: ideaSteps(mission.id).findIndex(({ item }) => 'question' in item && item.question === question.id) });
  await page.setViewportSize({ width: 390, height: 664 });
  await skipIntros(page);

  const plot = page.getByTestId('question-model-area').getByTestId('line-plot-model');
  await expect(plot).toBeVisible();
  const ticks = plot.locator('.fq-lineplot-tick');
  await expect(ticks).toHaveCount(9);
  // 1/8 once, 3/8 twice, 5/8 three times.
  for (const [tick, times] of [[1, 1], [3, 2], [5, 3]] as const) for (let k = 0; k < times; k++) await ticks.nth(tick).click();
  await expect(plot.getByRole('status')).toHaveText('6 X marks placed.');
  await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
  await expect(page.getByTestId('question-model-area').getByTestId('line-plot-picture')).toHaveAttribute('aria-label', 'Line plot: 1 at 1/8, 2 at 3/8, 3 at 5/8');
});

test('the dimes and pennies lesson teaches on a hundredths grid, then asks about coins', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'dimes-and-pennies');
  if (!mission) throw new Error('Dimes and pennies lesson is missing');
  await page.setViewportSize({ width: 390, height: 664 });
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);
  await skipIntros(page);

  // Idea 1 teaches pennies on a hundredths grid (100 pennies make a dollar), then asks about pennies as coins.
  const lesson = String(MISSIONS.indexOf(mission) + 1).padStart(2, '0');
  await expect(page.getByTestId('idea-kicker')).toHaveText(`Lesson ${lesson} · Idea 1 of 3 · Learn`);
  await expect(page.getByTestId('teach-scene').locator('.fq-ts-area')).toHaveCount(1);
  await expect(page.getByTestId('idea-learn')).toContainText('100 pennies');
  for (let p = 1; p < lessonIdeas(mission.id)![0]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  const pennies = page.getByTestId('question-model-area').getByTestId('coins-picture');
  await expect(pennies).toHaveAttribute('aria-label', '7 pennies');
  await expect(pennies.locator('.fq-coin.is-penny')).toHaveCount(7);
  await expect(pennies.locator('.fq-coin.is-dime')).toHaveCount(0);
  // Dimes come in idea 2, after their own Learn page: its first practice shows 6 dimes.
  for (const { item } of ideaSteps(mission.id).slice(0, 3)) {
    const question = ideaQuestion(mission, (item as { question: string }).question)!;
    await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
    await page.getByTestId('button-check-answer').click();
    await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
    await page.getByTestId('button-next-question').click();
  }
  await expect(page.getByTestId('idea-kicker')).toHaveText(`Lesson ${lesson} · Idea 2 of 3 · Learn`);
  await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  const dimes = page.getByTestId('question-model-area').getByTestId('coins-picture');
  await expect(dimes).toHaveAttribute('aria-label', '6 dimes');
  await expect(dimes.locator('.fq-coin.is-dime')).toHaveCount(6);
});

/** A lesson with ideas keeps its worked example under "How it works" on the lesson page: open the page as a returning
    child (earlier lessons done, the model intros seen, practice done) and unfold it. */
async function openLessonPageWorkedExample(page: import('@playwright/test').Page, mission: Mission) {
  await page.addInitScript((progress) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ introsSeen: { builder: true, line: true }, fractionWordsSeen: true }));
  }, progressBefore(mission));
  await openAsGuest(page);
  await expectMissionStart(page, mission.id, true);
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await page.getByTestId('button-how-it-works').click();
  await page.getByTestId('button-worked-example').click();
  await expect(page.getByTestId('lesson-example').locator('.fq-model-area')).toBeVisible();
}

test('the lesson page fits phones down to 280 px wide, with nothing scrolling sideways', async ({ page }) => {
  const mission = MISSIONS[0];
  await page.addInitScript((progress) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ introsSeen: { builder: true, line: true }, fractionWordsSeen: true }));
  }, progressBefore(mission));
  await openAsGuest(page);
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  // 280 px is a small phone with large text. The Build it stepper wraps there: −, the number and + stay together.
  for (const width of [390, 320, 280]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), { message: `${width} px` }).toBeLessThanOrEqual(width);
  }
});

test('a lesson with ideas keeps its Learn pictures and worked example under "How it works" on the lesson page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mission = MISSIONS[0];
  expect(lessonIdeas(mission.id)).toBeTruthy();
  await openLessonPageWorkedExample(page, mission);
  const pageWidth = () => page.evaluate(() => document.documentElement.scrollWidth);
  const how = page.getByTestId('lesson-how-it-works');
  await expect(how.getByTestId('button-how-it-works')).toHaveAttribute('aria-expanded', 'true');
  const example = how.getByTestId('lesson-example');
  await expect(example).toContainText('When are they fourths?');
  await expect(example.locator('.fq-example-answer').getByRole('button', { name: 'Listen to the whole example' })).toBeVisible();
  // The Learn pictures are folded beside it, and play the lesson's steps.
  const learn = how.getByTestId('how-learn-pictures');
  await learn.locator('summary').click();
  await expect(learn.getByTestId('lesson-introduction')).toBeVisible();
  // Opened, it makes the page no wider on a phone. Folding it again leaves the lesson page as it was.
  const openWidth = await pageWidth();
  await how.getByTestId('button-how-it-works').click();
  await expect(how.getByTestId('lesson-example')).toHaveCount(0);
  expect(openWidth).toBeLessThanOrEqual(await pageWidth());
});

test('the ordering lesson teaches each strategy right before its practice: same denominators, then 1/2, then renaming', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  const lesson = `Lesson ${String(MISSIONS.indexOf(mission) + 1).padStart(2, '0')}`;
  const ideas = lessonIdeas(mission.id)!;
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);

  // Idea 1: same denominators, ordered both ways (its first practice is the biggest-first card sort).
  await expect(page.getByTestId('idea-kicker')).toHaveText(`${lesson} · Idea 1 of 3 · Learn`);
  await expect(page.getByRole('heading', { name: ideas[0]!.title })).toBeVisible();
  await expect(page.getByTestId('teach-scene')).toContainText('Smallest first');
  await expect(page.getByTestId('teach-scene')).not.toContainText(/half|rename/i);
  await page.getByTestId('button-teach-step-next').click();
  await expect(page.getByTestId('teach-scene')).toContainText('Biggest first');
  await page.getByTestId('button-teach-step-back').click();
  await completeIdeas(page, mission, { until: 3 });

  // Idea 2: compare each fraction to 1/2, before the smallest-first card sort.
  await expect(page.getByTestId('idea-kicker')).toHaveText(`${lesson} · Idea 2 of 3 · Learn`);
  await expect(page.getByRole('heading', { name: ideas[1]!.title })).toBeVisible();
  await expect(page.getByTestId('teach-step-text')).toContainText('less than half');
  await expect(page.getByTestId('teach-scene')).not.toContainText(/rename/i);
  for (let p = 1; p < ideas[1]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  await solveSortRound(page, FRACTION_ORDER_ROUNDS.find((round) => round.id === 'smallest-first')!);
  for (const step of ideaSteps(mission.id).filter(({ idea, item }) => idea === 1 && 'question' in item)) {
    const question = ideaQuestion(mission, (step.item as { question: string }).question)!;
    await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
    await page.getByTestId('button-check-answer').click();
    await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
    await page.getByTestId('button-next-question').click();
  }

  // Idea 3: two fractions on the same side of 1/2 are renamed with the same denominator.
  await expect(page.getByTestId('idea-kicker')).toHaveText(`${lesson} · Idea 3 of 3 · Learn`);
  await expect(page.getByRole('heading', { name: ideas[2]!.title })).toBeVisible();
  await expect(page.getByTestId('teach-step-text')).toContainText('same denominator');
  await expect(page.getByTestId('teach-scene')).toContainText('Rename');
});

test('the ordering lesson\'s worked example on the lesson page shows its number line, renamed fractions and all', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openLessonPageWorkedExample(page, mission);
  const workedExample = page.getByTestId('lesson-example');
  const thinkItThrough = workedExample.locator('.fq-example-answer');
  await expect(thinkItThrough.getByRole('button', { name: /Listen/ })).toHaveCount(1);
  await expect(thinkItThrough.getByRole('button', { name: 'Listen to the whole example' })).toBeVisible();
  // Fraction bars render numerator and denominator separately, so the combined text omits slashes.
  await expect(workedExample).toContainText('Order 14, 38 and 58 from smallest to biggest');
  await expect(workedExample).toContainText('14 < 38 < 58');
  const numberLine = page.getByTestId('fraction-order-numberline');
  await expect(numberLine).toBeVisible();
  await expect(numberLine).toContainText('one whole');
  await expect(numberLine).toContainText('one-half benchmark is halfway');
  await expect(numberLine).toContainText('14 = 28');
  await expect(numberLine).toContainText('one fourth and two eighths are equivalent fractions');
  await expect(numberLine).toContainText('12 = 24');
  await expect(numberLine.getByRole('button', { name: 'Listen to the fraction number line' })).toBeVisible();
  const benchmark = page.getByTestId('fraction-order-benchmark');
  await expect(benchmark).toHaveAttribute('style', /left: 50%/);
  await expect(benchmark).toHaveAttribute('data-equivalent-names', '2/4');
  await expect(page.getByTestId('fraction-order-point-1-4')).toHaveAttribute('data-position', '25');
  await expect(page.getByTestId('fraction-order-point-1-4')).toHaveAttribute('data-equivalent-names', '2/8');
  await expect(page.getByTestId('fraction-order-point-3-8')).toHaveAttribute('data-position', '37.5');
  await expect(page.getByTestId('fraction-order-point-5-8')).toHaveAttribute('data-position', '62.5');
});

test('number-line labels, axis, markers, and halfway guide stay distinct in both themes', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openLessonPageWorkedExample(page, mission);

  const figure = page.getByTestId('fraction-order-numberline');
  await expect(figure).toBeVisible();

  for (const dark of [false, true]) {
    await page.evaluate((useDarkTheme) => {
      document.documentElement.classList.toggle('dark', useDarkTheme);
    }, dark);
    const colors = await figure.evaluate((element) => {
      const firstPoint = element.querySelector<HTMLElement>('.fq-order-line-point');
      const firstLabel = firstPoint?.querySelector<HTMLElement>('span');
      const benchmarkLabel = element.querySelector<HTMLElement>('.fq-order-line-benchmark > span');
      const axis = element.querySelector<HTMLElement>('.fq-order-line-axis');
      const marker = firstPoint ? getComputedStyle(firstPoint, '::after') : null;
      const guide = element.querySelector<HTMLElement>('.fq-order-line-benchmark');
      const guideLine = guide ? getComputedStyle(guide, '::before') : null;
      if (!firstLabel || !benchmarkLabel || !axis || !marker || !guideLine) {
        throw new Error('Expected all number-line color targets to render');
      }
      const readColor = (value: string) => {
        const match = value.match(/rgba?\(([^)]+)\)/);
        if (!match) throw new Error(`Could not read rendered color: ${value}`);
        const channels = match[1].split(/[\s,\/]+/).filter(Boolean).slice(0, 3).map(Number);
        if (channels.length !== 3 || channels.some(Number.isNaN)) {
          throw new Error(`Could not read rendered color channels: ${value}`);
        }
        return channels;
      };
      const markerRing = marker.boxShadow.match(/rgba?\(([^)]+)\)/)?.[0];
      if (!markerRing) throw new Error(`Could not read marker outline: ${marker.boxShadow}`);
      return {
        label: readColor(getComputedStyle(firstLabel).color),
        labelSurface: readColor(getComputedStyle(firstLabel).backgroundColor),
        benchmark: readColor(getComputedStyle(benchmarkLabel).color),
        axis: readColor(getComputedStyle(axis).backgroundColor),
        marker: readColor(marker.backgroundColor),
        markerRing: readColor(markerRing),
        guide: readColor(guideLine.borderLeftColor),
      };
    });
    const luminance = (channels: number[]) => {
      const linear = channels.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    };
    const contrast = (first: number[], second: number[]) => {
      const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
      return (lighter + 0.05) / (darker + 0.05);
    };
    const context = dark ? 'dark theme' : 'light theme';

    expect(contrast(colors.label, colors.labelSurface), `${context}: fraction labels should remain readable`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.benchmark, colors.labelSurface), `${context}: the halfway label should remain readable`).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.axis, colors.labelSurface), `${context}: the number-line axis should stand out`).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.marker, colors.axis), `${context}: fraction dots should stand out from the axis`).toBeGreaterThanOrEqual(3);
    expect(contrast(colors.markerRing, colors.marker), `${context}: marker outlines should separate dots from the line`).toBeGreaterThanOrEqual(1.5);
    expect(contrast(colors.guide, colors.labelSurface), `${context}: the dashed halfway guide should stand out`).toBeGreaterThanOrEqual(3);
  }
});

test('the ordering number line stays legible in grayscale print media', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openLessonPageWorkedExample(page, mission);
  await page.getByTestId('fraction-order-numberline').evaluate((element) => {
    // The app prints only .fq-print content; mount a copy there to exercise the
    // number-line print rules without bypassing the normal print-only page filter.
    const printRoot = document.createElement('section');
    printRoot.className = 'fq-print';
    printRoot.dataset.testid = 'fraction-order-print-preview';
    printRoot.append(element.cloneNode(true));
    document.querySelector('#root')?.append(printRoot);
  });
  await page.emulateMedia({ media: 'print' });

  const figure = page.getByTestId('fraction-order-print-preview').getByTestId('fraction-order-numberline');
  await expect(figure).toBeVisible();
  await expect(figure.locator('.fq-order-line-caption')).toContainText('0');
  await expect(figure.locator('.fq-order-line-caption')).toContainText('one whole');
  await expect(figure.locator('.fq-order-line-point > span')).toHaveCount(3);
  await expect(figure.locator('.fq-order-line-point > span').nth(0)).toContainText('14 = 28');
  await expect(figure.locator('.fq-order-line-point > span').nth(1)).toContainText('38');
  await expect(figure.locator('.fq-order-line-point > span').nth(2)).toContainText('58');
  await expect(figure.locator('.fq-order-line-benchmark > span')).toContainText('12 = 24');

  const printStyles = await figure.evaluate((element) => {
    const axis = element.querySelector<HTMLElement>('.fq-order-line-axis');
    const endpoints = [...element.querySelectorAll<HTMLElement>('.fq-order-line-end')];
    const points = [...element.querySelectorAll<HTMLElement>('.fq-order-line-point')];
    const benchmark = element.querySelector<HTMLElement>('.fq-order-line-benchmark');
    const labels = [...element.querySelectorAll<HTMLElement>('.fq-order-line-point > span, .fq-order-line-benchmark > span')];
    const guide = benchmark ? getComputedStyle(benchmark, '::before') : null;
    if (!axis || endpoints.length !== 2 || points.length !== 3 || !benchmark || !guide || labels.length !== 4) {
      throw new Error('Expected all number-line print targets to render');
    }
    return {
      figureBackground: getComputedStyle(element).backgroundColor,
      figureBorder: getComputedStyle(element).borderTopColor,
      axis: getComputedStyle(axis).backgroundColor,
      endpoints: endpoints.map((end) => getComputedStyle(end).backgroundColor),
      markerStyles: points.map((point) => {
        const marker = getComputedStyle(point, '::after');
        return {
          fill: marker.backgroundColor,
          border: marker.borderTopColor,
          borderWidth: marker.borderTopWidth,
          borderStyle: marker.borderTopStyle,
          boxShadow: marker.boxShadow,
          shape: marker.borderRadius,
        };
      }),
      labels: labels.map((label) => {
        const style = getComputedStyle(label);
        return {
          text: style.color,
          background: style.backgroundColor,
          border: style.borderTopColor,
          borderWidth: style.borderTopWidth,
        };
      }),
      guide: {
        color: guide.borderLeftColor,
        style: guide.borderLeftStyle,
        width: guide.borderLeftWidth,
      },
      caption: getComputedStyle(element.querySelector<HTMLElement>('.fq-order-line-caption')!).color,
    };
  });

  expect(printStyles.figureBackground).toBe('rgb(255, 255, 255)');
  expect(printStyles.figureBorder).toBe('rgb(0, 0, 0)');
  expect(printStyles.axis).toBe('rgb(0, 0, 0)');
  expect(printStyles.endpoints).toEqual(['rgb(0, 0, 0)', 'rgb(0, 0, 0)']);
  for (const marker of printStyles.markerStyles) {
    expect(marker.fill).toBe('rgb(255, 255, 255)');
    expect(marker.border).toBe('rgb(0, 0, 0)');
    expect(marker.borderWidth).toBe('3px');
    expect(marker.borderStyle).toBe('solid');
    expect(marker.boxShadow).toBe('none');
    expect(marker.shape).toBe('50%');
  }
  for (const label of printStyles.labels) {
    expect(label.text).toBe('rgb(0, 0, 0)');
    expect(label.background).toBe('rgb(255, 255, 255)');
    expect(label.border).toBe('rgb(0, 0, 0)');
    expect(label.borderWidth).toBe('1px');
  }
  expect(printStyles.guide).toEqual({
    color: 'rgb(0, 0, 0)',
    style: 'dashed',
    width: '2px',
  });
  expect(printStyles.caption).toBe('rgb(0, 0, 0)');
});

test('number-line labels, axis, markers, and halfway guide stay clear in forced-colors mode', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openLessonPageWorkedExample(page, mission);
  await page.emulateMedia({ forcedColors: 'active' });

  const figure = page.getByTestId('fraction-order-numberline');
  await expect(figure).toBeVisible();
  const colors = await figure.evaluate((element) => {
    const point = element.querySelector<HTMLElement>('.fq-order-line-point');
    const pointLabels = [...element.querySelectorAll<HTMLElement>('.fq-order-line-point > span')];
    const benchmark = element.querySelector<HTMLElement>('.fq-order-line-benchmark');
    const benchmarkLabel = benchmark?.querySelector<HTMLElement>('span');
    const axis = element.querySelector<HTMLElement>('.fq-order-line-axis');
    const points = [...element.querySelectorAll<HTMLElement>('.fq-order-line-point')];
    const guide = benchmark ? getComputedStyle(benchmark, '::before') : null;
    if (!points.length || !pointLabels.length || !benchmarkLabel || !axis || !guide) {
      throw new Error('Expected all number-line forced-color targets to render');
    }

    const probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;color:CanvasText;background-color:Canvas;border-color:Highlight';
    element.append(probe);
    const systemColors = getComputedStyle(probe);
    const resolved = {
      text: systemColors.color,
      canvas: systemColors.backgroundColor,
      highlight: systemColors.borderTopColor,
    };
    probe.remove();

    const style = (target: Element) => getComputedStyle(target);
    const halfwayLabel = style(benchmarkLabel);
    return {
      forcedColorAdjust: style(element.querySelector<HTMLElement>('.fq-order-line')!).forcedColorAdjust,
      fractionLabels: pointLabels.map((label) => {
        const computed = style(label);
        return {
          text: computed.color,
          surface: computed.backgroundColor,
          border: computed.borderTopColor,
          borderWidth: computed.borderTopWidth,
          borderStyle: computed.borderTopStyle,
        };
      }),
      markers: points.map((markerPoint) => {
        const marker = getComputedStyle(markerPoint, '::after');
        return { fill: marker.backgroundColor, ring: marker.boxShadow };
      }),
      halfwayLabelText: halfwayLabel.color,
      halfwayLabelSurface: halfwayLabel.backgroundColor,
      halfwayLabelBorder: halfwayLabel.borderTopColor,
      axis: style(axis).backgroundColor,
      guide: guide.borderLeftColor,
      guideStyle: guide.borderLeftStyle,
      guideWidth: guide.borderLeftWidth,
      ...resolved,
    };
  });

  expect(colors.forcedColorAdjust).toBe('none');
  for (const [label, text, surface, border] of [
    ...colors.fractionLabels.map((label, index) => [`fraction label ${index + 1}`, label.text, label.surface, label.border] as const),
    ['halfway label', colors.halfwayLabelText, colors.halfwayLabelSurface, colors.halfwayLabelBorder] as const,
  ]) {
    expect(text, `${label} should use the system text color`).toBe(colors.text);
    expect(surface, `${label} should use the system canvas`).toBe(colors.canvas);
    expect(border, `${label} should have a visible system-color border`).toBe(colors.text);
  }
  for (const label of colors.fractionLabels) {
    expect(label.borderWidth).toBe('2px');
    expect(label.borderStyle).toBe('solid');
  }
  expect(colors.axis).toBe(colors.text);
  for (const marker of colors.markers) {
    expect(marker.fill).toBe(colors.highlight);
    expect(marker.ring).toContain(colors.text);
  }
  expect(colors.guide).toBe(colors.highlight);
  expect(colors.guideStyle).toBe('dashed');
  expect(colors.guideWidth).toBe('2px');
});

test('the ordering number line keeps fraction labels clear on narrow screens and with enlarged text', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await page.setViewportSize({ width: 320, height: 900 });
  await openLessonPageWorkedExample(page, mission);

  const figure = page.getByTestId('fraction-order-numberline');
  await expect(figure).toBeVisible();

  for (const width of [280, 300, 320, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const enlargedText of [false, true]) {
      await page.evaluate((enlarge) => {
        document.getElementById('large-text-test-style')?.remove();
        if (enlarge) {
          const style = document.createElement('style');
          style.id = 'large-text-test-style';
          style.textContent = 'html { font-size: 200% !important; }';
          document.head.append(style);
        }
      }, enlargedText);

      const layout = await figure.evaluate((element) => {
        const figureBounds = element.getBoundingClientRect();
        const labels = Array.from(element.querySelectorAll<HTMLElement>(
          '.fq-order-line-point > span, .fq-order-line-benchmark > span',
        )).map((label) => {
          const bounds = label.getBoundingClientRect();
          return {
            text: label.textContent?.trim() ?? '',
            left: bounds.left,
            right: bounds.right,
            top: bounds.top,
            bottom: bounds.bottom,
          };
        });
        const guide = element.querySelector<HTMLElement>('.fq-order-line-benchmark');
        const guideStyle = guide ? getComputedStyle(guide, '::before') : null;
        return {
          figure: {
            left: figureBounds.left,
            right: figureBounds.right,
            top: figureBounds.top,
            bottom: figureBounds.bottom,
          },
          labels,
          guide: {
            left: guide ? Number.parseFloat(guide.style.left) : Number.NaN,
            borderStyle: guideStyle?.borderLeftStyle ?? '',
            height: Number.parseFloat(guideStyle?.height ?? '0'),
          },
        };
      });

      const context = `${width}px viewport, ${enlargedText ? 'enlarged' : 'normal'} text`;
      const description = page.getByTestId('text-fraction-order-line-description-copy');
      const listenButton = figure.getByRole('button', { name: 'Listen to the fraction number line' });
      await expect(description).toBeVisible();
      await expect(listenButton).toBeVisible();
      await expect(listenButton).toBeEnabled();
      const descriptionLayout = await figure.evaluate((element) => {
        const copy = element.querySelector<HTMLElement>('[data-testid="text-fraction-order-line-description-copy"]');
        const button = element.querySelector<HTMLElement>('.fq-order-line-description .fq-learning-listen');
        const figureBounds = element.getBoundingClientRect();
        const copyBounds = copy?.getBoundingClientRect();
        const buttonBounds = button?.getBoundingClientRect();
        return {
          // The worked example sits on the lesson page; it (not the Build it area below it) is what must fit.
          exampleRight: document.querySelector('[data-testid="lesson-example"]')!.getBoundingClientRect().right,
          viewportWidth: window.innerWidth,
          copyText: copy?.textContent?.trim() ?? '',
          lineHeight: Number.parseFloat(copy ? getComputedStyle(copy).lineHeight : '0'),
          copy: copyBounds ? {
            left: copyBounds.left,
            right: copyBounds.right,
            top: copyBounds.top,
            bottom: copyBounds.bottom,
            scrollWidth: copy?.scrollWidth ?? 0,
            clientWidth: copy?.clientWidth ?? 0,
            scrollHeight: copy?.scrollHeight ?? 0,
            clientHeight: copy?.clientHeight ?? 0,
          } : null,
          button: buttonBounds ? {
            left: buttonBounds.left,
            right: buttonBounds.right,
            top: buttonBounds.top,
            bottom: buttonBounds.bottom,
            width: buttonBounds.width,
            height: buttonBounds.height,
          } : null,
          figure: { left: figureBounds.left, right: figureBounds.right },
          accessibleDescription: element.querySelector<HTMLElement>('.fq-order-line')?.getAttribute('aria-label') ?? '',
        };
      });
      expect(descriptionLayout.exampleRight, `${context}: the worked example should not overflow horizontally`).toBeLessThanOrEqual(descriptionLayout.viewportWidth);
      expect(descriptionLayout.copyText, `${context}: all spoken description text should remain visible`).toBe(descriptionLayout.accessibleDescription);
      expect(descriptionLayout.copy, `${context}: the description should have a measurable layout`).not.toBeNull();
      expect(descriptionLayout.copy!.scrollWidth, `${context}: the description should not overflow its width`).toBeLessThanOrEqual(descriptionLayout.copy!.clientWidth + 1);
      expect(descriptionLayout.copy!.scrollHeight, `${context}: the description should not be vertically clipped`).toBeLessThanOrEqual(descriptionLayout.copy!.clientHeight + 1);
      expect(descriptionLayout.copy!.bottom - descriptionLayout.copy!.top, `${context}: the full description should wrap across lines`).toBeGreaterThan(descriptionLayout.lineHeight);
      expect(descriptionLayout.button, `${context}: the Listen control should have a measurable layout`).not.toBeNull();
      expect(descriptionLayout.button!.left, `${context}: Listen should stay inside the number-line card`).toBeGreaterThanOrEqual(descriptionLayout.figure.left);
      expect(descriptionLayout.button!.right, `${context}: Listen should not clip past the number-line card`).toBeLessThanOrEqual(descriptionLayout.figure.right);
      expect(descriptionLayout.button!.top, `${context}: Listen should appear below the wrapped description`).toBeGreaterThanOrEqual(descriptionLayout.copy!.bottom - 1);
      expect(descriptionLayout.button!.height, `${context}: Listen should retain a usable touch target`).toBeGreaterThanOrEqual(34);
      await listenButton.focus();
      await expect(listenButton, `${context}: Listen should remain keyboard reachable`).toBeFocused();

      expect(layout.labels, `${context}: all four fraction and halfway labels should render`).toHaveLength(4);
      for (const label of layout.labels) {
        expect(label.left, `${context}: ${label.text} should not clip past the left edge`).toBeGreaterThanOrEqual(layout.figure.left);
        expect(label.right, `${context}: ${label.text} should not clip past the right edge`).toBeLessThanOrEqual(layout.figure.right);
        expect(label.top, `${context}: ${label.text} should not clip above the number line`).toBeGreaterThanOrEqual(layout.figure.top);
        expect(label.bottom, `${context}: ${label.text} should not clip below the number line`).toBeLessThanOrEqual(layout.figure.bottom);
      }
      for (let first = 0; first < layout.labels.length; first += 1) {
        for (let second = first + 1; second < layout.labels.length; second += 1) {
          const a = layout.labels[first];
          const b = layout.labels[second];
          const overlaps = a.left < b.right - 1 && a.right > b.left + 1
            && a.top < b.bottom - 1 && a.bottom > b.top + 1;
          expect(overlaps, `${context}: ${a.text} and ${b.text} must not overlap`).toBe(false);
        }
      }
      expect(layout.guide.left, `${context}: halfway guide should stay at the midpoint`).toBeCloseTo(50);
      expect(layout.guide.borderStyle, `${context}: halfway guide should remain visibly dashed`).toBe('dashed');
      expect(layout.guide.height, `${context}: halfway guide should reach the line from its label`).toBeGreaterThan(0);
    }
  }
});

test('the ordering number-line explanation and Listen control stay usable at 400% text size', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await page.setViewportSize({ width: 280, height: 900 });
  await openLessonPageWorkedExample(page, mission);

  await page.addStyleTag({
    content: 'html { font-size: 400% !important; }',
  });

  const figure = page.getByTestId('fraction-order-numberline');
  const description = page.getByTestId('text-fraction-order-line-description-copy');
  const listenButton = figure.getByRole('button', { name: 'Listen to the fraction number line' });
  await expect(description).toBeVisible();
  await expect(listenButton).toBeVisible();
  await expect(listenButton).toBeEnabled();

  const layout = await figure.evaluate((element) => {
    const copy = element.querySelector<HTMLElement>('[data-testid="text-fraction-order-line-description-copy"]');
    const button = element.querySelector<HTMLElement>('.fq-order-line-description .fq-learning-listen');
    const visualDescription = element.querySelector<HTMLElement>('.fq-order-line');
    const figureBounds = element.getBoundingClientRect();
    const copyBounds = copy?.getBoundingClientRect();
    const buttonBounds = button?.getBoundingClientRect();
    return {
      exampleRight: document.querySelector('[data-testid="lesson-example"]')!.getBoundingClientRect().right,
      viewportWidth: window.innerWidth,
      copyText: copy?.textContent?.trim() ?? '',
      accessibleDescription: visualDescription?.getAttribute('aria-label') ?? '',
      copy: copy && copyBounds ? {
        scrollWidth: copy.scrollWidth,
        clientWidth: copy.clientWidth,
        scrollHeight: copy.scrollHeight,
        clientHeight: copy.clientHeight,
        top: copyBounds.top,
        bottom: copyBounds.bottom,
      } : null,
      button: buttonBounds ? {
        left: buttonBounds.left,
        right: buttonBounds.right,
        top: buttonBounds.top,
        height: buttonBounds.height,
      } : null,
      figure: { left: figureBounds.left, right: figureBounds.right },
    };
  });

  expect(layout.exampleRight, 'the worked example should not overflow horizontally').toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.copyText, 'all spoken description text should remain visible').toBe(layout.accessibleDescription);
  expect(layout.copy, 'the description should have a measurable layout').not.toBeNull();
  expect(layout.copy!.scrollWidth, 'the description should not overflow its width').toBeLessThanOrEqual(layout.copy!.clientWidth + 1);
  expect(layout.copy!.scrollHeight, 'the description should not be vertically clipped').toBeLessThanOrEqual(layout.copy!.clientHeight + 1);
  expect(layout.button, 'Listen should have a measurable layout').not.toBeNull();
  expect(layout.button!.left, 'Listen should stay inside the number-line card').toBeGreaterThanOrEqual(layout.figure.left);
  expect(layout.button!.right, 'Listen should not clip past the number-line card').toBeLessThanOrEqual(layout.figure.right);
  expect(layout.button!.top, 'Listen should appear below the complete description').toBeGreaterThanOrEqual(layout.copy!.bottom - 1);
  let reachedWithTab = false;
  for (let tabPress = 0; tabPress < 40; tabPress += 1) {
    await page.keyboard.press('Tab');
    if (await listenButton.evaluate((button) => document.activeElement === button)) {
      reachedWithTab = true;
      break;
    }
  }
  expect(reachedWithTab, 'Listen should remain reachable in the keyboard tab order').toBe(true);
});

test('learners sort fractions in both directions, correct a try, and do not save progress before questions', async ({ page }) => {
  const mission = MISSIONS.find(({ id }) => id === 'order-unlike-fractions');
  if (!mission) throw new Error('Ordering lesson is missing');
  await openAsGuest(page);
  const savedStorage = await localStorageSnapshot(page);
  await openDeveloperLesson(page, mission);
  await expect.poll(() => localStorageSnapshot(page)).toBe(savedStorage);

  // Idea 1's first practice: biggest first, all eighths. A wrong order gets the strategy, then the child fixes it.
  for (let p = 1; p < lessonIdeas(mission.id)![0]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  const biggestFirst = FRACTION_ORDER_ROUNDS.find((round) => round.id === 'biggest-first')!;
  await expect(page.getByTestId('fraction-order-activity')).toBeVisible();
  // No worked example above the cards: the idea's Learn pages taught it just before.
  await expect(page.getByTestId('lesson-example')).toHaveCount(0);
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText(biggestFirst.strategyHint);
  await page.getByTestId('button-sort-5-8-up').click();
  await page.getByTestId('button-sort-3-8-up').click();
  const sortedCards = await page.locator('[data-testid^="sort-card-"]').evaluateAll((items) =>
    items.map((item) => {
      const [numerator, denominator] = (item.getAttribute('data-fraction') ?? '').split('/').map(Number);
      return { numerator, denominator };
    }),
  );
  expect(fractionOrderMatches(sortedCards, biggestFirst.direction)).toBe(true);
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText(biggestFirst.explanation);
  await page.getByTestId('button-sort-next').click();
  await expect(page.locator('.fq-play-kicker')).toContainText('Idea 1 of 3 · Practise 2 of 3');
  await expect.poll(() => localStorageSnapshot(page)).toBe(savedStorage);

  // Idea 2's first practice: smallest first, with 1/2 as the benchmark.
  for (const step of ideaSteps(mission.id).filter(({ idea, item }) => idea === 0 && 'question' in item)) {
    const question = ideaQuestion(mission, (step.item as { question: string }).question)!;
    await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
    await page.getByTestId('button-check-answer').click();
    await page.getByTestId('button-next-question').click();
  }
  await expect(page.getByTestId('idea-kicker')).toHaveText(/Idea 2 of 3 · Learn/);
  for (let p = 1; p < lessonIdeas(mission.id)![1]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  const smallestFirst = FRACTION_ORDER_ROUNDS.find((round) => round.id === 'smallest-first')!;
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText(/Good try!|Almost!|Let’s look together\.|Keep going!|Nice effort!/);
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText('1/2');
  await page.getByTestId('button-sort-5-6-down').click();
  await page.getByTestId('button-sort-5-6-down').click();
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText(smallestFirst.explanation);
  await page.getByTestId('button-sort-next').click();
  await expect(page.locator('.fq-play-kicker')).toContainText('Idea 2 of 3 · Practise 2 of 3');
  await expect.poll(() => localStorageSnapshot(page)).toBe(savedStorage);
});

async function expectLessonQuestionProgress(
  page: import('@playwright/test').Page,
  currentQuestion: number,
  completedQuestions: number,
) {
  const progress = page.getByTestId('status-lesson-progress');
  await expect(progress).toHaveAttribute(
    'aria-label',
    new RegExp(`^Lesson question progress: ${completedQuestions} of \\d+ completed$`),
  );
  await expect(progress.locator('.fq-sr')).toHaveText(
    new RegExp(`^Question ${currentQuestion} of \\d+; ${completedQuestions} completed\\.$`),
  );
}

async function completeQuestionSequence(
  page: import('@playwright/test').Page,
  questions: Mission['questions'],
) {
  await page.evaluate(async (items) => {
    const settleReactUpdate = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    const button = (testId: string) => {
      const element = document.querySelector(`[data-testid="${CSS.escape(testId)}"]`);
      if (!(element instanceof HTMLButtonElement) || element.disabled) {
        throw new Error(`Expected enabled button ${testId}`);
      }
      return element;
    };
    for (const [index, question] of items.entries()) {
      const progress = document.querySelector<HTMLElement>('[data-testid="status-lesson-progress"]');
      const activeQuestionText = progress?.querySelector<HTMLElement>('.fq-sr')?.textContent?.trim();
      if (!progress || activeQuestionText !== `Question ${index + 1} of ${items.length}; ${index} completed.`) {
        throw new Error(`Lesson question ${index + 1} is not the active question`);
      }
      if (progress.getAttribute('aria-label') !== `Lesson question progress: ${index} of ${items.length} completed`) {
        throw new Error(`Lesson question progress did not report ${index} completed`);
      }
      if (index === 0 && !document.querySelector('[data-testid="question-model-area"]')) {
        throw new Error('The lesson question model is missing');
      }

      button(`button-answer-${question.id}-${question.correctChoice}`).click();
      await settleReactUpdate();
      button('button-check-answer').click();
      await settleReactUpdate();

      const feedback = document.querySelector<HTMLElement>('[data-testid="status-feedback"]');
      if (feedback?.getAttribute('data-result') !== 'correct') {
        throw new Error(`Question ${question.id} did not accept its correct answer`);
      }
      if (progress.getAttribute('aria-label') !== `Lesson question progress: ${index + 1} of ${items.length} completed`) {
        throw new Error(`Question ${question.id} did not advance lesson progress`);
      }

      button(index === items.length - 1 ? 'button-finish-mission' : 'button-next-question').click();
      await settleReactUpdate();
      if (index === items.length - 1) {
        if (!document.querySelector('[data-testid="learning-lab"]')) {
          throw new Error('The learning lab did not open after the final question');
        }
      } else {
        const nextProgress = document.querySelector<HTMLElement>('[data-testid="status-lesson-progress"]');
        const nextQuestionText = nextProgress?.querySelector<HTMLElement>('.fq-sr')?.textContent?.trim();
        if (nextQuestionText !== `Question ${index + 2} of ${items.length}; ${index + 1} completed.`) {
          throw new Error(`Question ${index + 2} did not open`);
        }
        if (nextProgress?.getAttribute('aria-label') !== `Lesson question progress: ${index + 1} of ${items.length} completed`) {
          throw new Error(`Question ${index + 2} progress was not announced`);
        }
      }
    }
  }, questions.map(({ id, correctChoice }) => ({ id, correctChoice })));
}

/** Developer testing lives with the grown-ups' settings: open them through the grown-up check. */
async function openDeveloperTesting(page: import('@playwright/test').Page) {
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await openSettings(page, 'Developer');
  await page.getByTestId('section-developer-testing').waitFor();
}

async function openDeveloperLesson(page: import('@playwright/test').Page, mission: Mission) {
  await openDeveloperTesting(page);
  await page.evaluate(async ({ id, title, isPartFinder, isFractionOrder, isIdeas }) => {
    const settleReactUpdate = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    const selector = document.querySelector<HTMLSelectElement>('[data-testid="select-developer-lesson"]');
    if (!selector) throw new Error('The developer lesson selector is missing');
    selector.value = id;
    selector.dispatchEvent(new Event('change', { bubbles: true }));
    await settleReactUpdate();
    if (selector.value !== id) throw new Error(`The developer selector did not choose ${id}`);

    const open = document.querySelector<HTMLButtonElement>('[data-testid="button-open-developer-lesson"]');
    if (!open || open.disabled) throw new Error('The developer lesson could not be opened');
    open.click();
    await settleReactUpdate();
    if (!document.querySelector('[data-testid="developer-test-banner"]')) {
      throw new Error('The isolated developer test did not start');
    }
    // A lesson's one-time Teach first screen comes before its worked example.
    for (let i = 0; i < 16; i++) {
      const stepNext = document.querySelector<HTMLButtonElement>('[data-testid="button-teach-step-next"]');
      if (!stepNext) break;
      stepNext.click(); await settleReactUpdate();
    }
    const teachNext = document.querySelector<HTMLButtonElement>('[data-testid="button-teach-next"]');
    if (teachNext) { teachNext.click(); await settleReactUpdate(); }
    // In a child's first lesson, Watch and Try come next.
    const introSkip = document.querySelector<HTMLButtonElement>('[data-testid="intro-steps"] [data-testid="button-intro-skip"]');
    if (introSkip) { introSkip.click(); await settleReactUpdate(); }

    // A lesson with ideas opens on its first idea's Learn page (the lesson's name is in the bar).
    if (isIdeas) {
      if (!document.querySelector('[data-testid="idea-learn-screen"]')) throw new Error(`${title} did not open on its first idea`);
      if (document.querySelector<HTMLElement>('.fq-taskbar-title')?.textContent?.trim() !== title) throw new Error(`Expected to open ${title}`);
      return;
    }
    const titleSelector = isPartFinder
      ? '.fq-pf-lesson-example .fq-example-heading'
      : isFractionOrder
        ? '.fq-order-sort-example .fq-example-heading'
        : '#lesson-title';
    const lessonTitle = document.querySelector<HTMLElement>(titleSelector);
    if (lessonTitle?.textContent?.trim() !== title) {
      throw new Error(`Expected to open ${title}, but the lesson title did not match`);
    }
    const exampleSelector = isPartFinder ? '[data-testid="part-finder-lesson-example"]' : '[data-testid="lesson-example"]';
    if (!document.querySelector(exampleSelector)) throw new Error(`The example for ${title} is missing`);
    if (!isPartFinder && !document.querySelector('.fq-example .fq-model-area')) {
      throw new Error(`The worked model for ${title} is missing`);
    }
  }, {
    id: mission.id,
    title: mission.title,
    isPartFinder: PART_FINDER_LESSONS.has(mission.id),
    isFractionOrder: mission.id === 'order-unlike-fractions',
    isIdeas: !!lessonIdeas(mission.id),
  });
}

async function finishDeveloperLesson(page: import('@playwright/test').Page, savedStorage: string) {
  await page.evaluate(async (expectedStorage) => {
    const settleReactUpdate = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
    const snapshot = () => {
      const entries: Array<[string, string | null]> = [];
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (key !== null) entries.push([key, localStorage.getItem(key)]);
      }
      entries.sort(([a], [b]) => a.localeCompare(b));
      return JSON.stringify(Object.fromEntries(entries));
    };
    const lab = document.querySelector('[data-testid="learning-lab"]');
    if (!lab) throw new Error('Finishing the questions did not open the learning lab');
    // The lab opens only once the practice is saved; Finish appears only when every step is done.
    if (document.querySelector('[data-testid="button-lab-finish"]')) throw new Error('The lesson unlocked before its other required work was complete');

    const breakOverlay = document.querySelector<HTMLElement>('[data-testid="brain-break-overlay"]');
    const visible = !!breakOverlay
      && breakOverlay.getClientRects().length > 0
      && getComputedStyle(breakOverlay).visibility !== 'hidden'
      && getComputedStyle(breakOverlay).display !== 'none';
    if (visible) {
      const skip = document.querySelector<HTMLButtonElement>('[data-testid="button-break-skip"]');
      if (!skip || skip.disabled) throw new Error('The lesson break could not be dismissed');
      skip.click();
      await settleReactUpdate();
    }
    if (snapshot() !== expectedStorage) throw new Error('The developer test wrote learner progress to browser storage');

    const exit = document.querySelector<HTMLButtonElement>('[data-testid="button-exit-developer-test"]');
    if (!exit || exit.disabled) throw new Error('The developer test could not be exited');
    exit.click();
    await settleReactUpdate();
    const mapVisible = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3'))
      .some((heading) => /your learning map/i.test(heading.textContent ?? ''));
    if (!mapVisible) throw new Error('Exiting the developer test did not return to the learning map');
    if (snapshot() !== expectedStorage) throw new Error('Exiting the developer test changed browser storage');
  }, savedStorage);
}

async function completePartFinderLesson(page: import('@playwright/test').Page, missionId: string) {
  await expect(page.getByTestId('first-fraction-introduction')).toHaveCount(0);
  for (const round of partFinderRoundsFor(missionId)) await solvePartFinderRound(page, round);
}

async function completeFractionOrderLesson(page: import('@playwright/test').Page) {
  const firstRound = FRACTION_ORDER_ROUNDS[0];
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText(/Good try!|Almost!|Let’s look together\.|Keep going!|Nice effort!/);
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText('1/2');
  await page.getByTestId('button-sort-5-6-down').click();
  await page.getByTestId('button-sort-5-6-down').click();
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText(firstRound.explanation);
  await page.getByTestId('button-sort-next').click();

  const secondRound = FRACTION_ORDER_ROUNDS[1];
  await page.getByTestId('button-sort-5-8-up').click();
  await page.getByTestId('button-sort-3-8-up').click();
  const sortedCards = await page.locator('[data-testid^="sort-card-"]').evaluateAll((items) =>
    items.map((item) => {
      const [numerator, denominator] = (item.getAttribute('data-fraction') ?? '').split('/').map(Number);
      return { numerator, denominator };
    }),
  );
  expect(fractionOrderMatches(sortedCards, secondRound.direction)).toBe(true);
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText('That order is right!');
  await page.getByTestId('button-sort-next').click();
}

async function retryLessonQuestion(
  page: import('@playwright/test').Page,
  question: Mission['questions'][number],
) {
  const wrongChoice = (question.correctChoice + 1) % question.choices.length;
  await page.getByTestId(`button-answer-${question.id}-${wrongChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'retry');
  await expect(page.locator('[data-testid="status-feedback"] .fq-hoot')).toBeVisible();

  await page.getByTestId('button-try-again').click();
  await expect(page.getByTestId('button-check-answer')).toBeDisabled();
  // The choice already tried is greyed out, so the next try is a real choice.
  await expect(page.getByTestId(`button-answer-${question.id}-${wrongChoice}`)).toBeDisabled();
  const correctAnswer = page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`);
  await expect(correctAnswer).toHaveAttribute('aria-pressed', 'false');
  await correctAnswer.click();
  await expect(page.getByTestId('button-check-answer')).toBeEnabled();
  await expect(correctAnswer).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
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

async function setNumberSlot(page: import('@playwright/test').Page, label: string, value: number) {
  const editor = page.locator('.fq-code-editor');
  const output = editor.getByTestId(`code-input-${label.replace(/\W+/g, '-')}`);
  let current = Number(await output.textContent()) || 0;
  while (current < value) {
    await editor.getByRole('button', { name: `More: ${label}` }).click();
    current += 1;
  }
  while (current > value) {
    await editor.getByRole('button', { name: `Less: ${label}` }).click();
    current -= 1;
  }
}

async function fillProgramNumbers(page: import('@playwright/test').Page, target: { kind: 'bar' | 'line' | 'set'; n: number; d: number }) {
  const splitLabel = target.kind === 'line' ? 'split each whole into' : target.kind === 'set' ? 'make equal groups:' : 'split each bar into';
  await setNumberSlot(page, `${splitLabel} 0`, target.d);
  await setNumberSlot(page, 'repeat 1', target.n);
}

async function enterTileNumber(page: import('@playwright/test').Page, prefix: string, slot: 'num' | 'den', value: number) {
  await page.getByTestId(`slot-${prefix}-${slot}`).click();
  for (const digit of String(value)) await page.getByTestId(`tile-${prefix}-digit-${digit}`).click();
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

/** A first build opens the model intros (how to build, how a number line works): a child who knows can skip them. */
async function skipIntros(page: import('@playwright/test').Page) {
  for (let intro = 0; intro < 2; intro++) {
    const skip = page.getByTestId('button-intro-skip');
    if (!(await skip.isVisible())) return;
    await skip.click();
  }
}

async function enterModel(
  page: import('@playwright/test').Page,
  checkId: string,
  builder: 'a' | 'b',
  target: ReturnType<typeof getBuildChecks>[number]['target'],
) {
  const builderId = `${checkId}-${builder}`;
  await skipIntros(page);
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
  const checks = getBuildChecks(missionId);
  for (const [index, check] of checks.entries()) {
    await skipIntros(page);
    const checkCard = page.getByTestId(`check-${check.id}`);
    await expect(checkCard.locator('.fq-ll-check-heading').getByTestId('button-listen-learning-text')).toHaveCount(1);
    await enterModel(page, check.id, 'a', check.target);
    const primaryStatus = page.getByTestId(`status-primary-${check.id}`);
    await expect(primaryStatus).toBeVisible();
    await expect(primaryStatus.getByTestId('button-listen-learning-text')).toHaveCount(1);
    await enterModel(page, check.id, 'b', {
      ...check.target,
      kind: check.target.kind === 'line' ? 'bar' : 'line',
      wholes: Math.max(1, Math.ceil(check.target.n / check.target.d)),
    });
    const secondaryStatus = page.getByTestId(`status-secondary-${check.id}`);
    await expect(secondaryStatus).toBeVisible();
    await expect(secondaryStatus.getByTestId('button-listen-learning-text')).toHaveCount(1);
    if (index === 0) {
      const wrongReason = check.reasons.findIndex((_, reason) => reason !== check.correctReason);
      if (wrongReason >= 0) {
        await page.getByTestId(`radio-reason-${check.id}-${wrongReason}`).check({ force: true });
        await page.getByTestId(`button-check-${check.id}`).click();
        const errors = page.getByTestId(`status-errors-${check.id}`);
        await expect(errors).toBeVisible();
        await expect(errors.getByTestId('button-listen-learning-text')).toHaveCount(1);
        await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
      }
    }
    await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
    await page.getByTestId(`button-check-${check.id}`).click();
    // The passed check stays with its explanation until Next is pressed (no automatic jump).
    const passedStatus = page.getByTestId(`status-pass-${check.id}`);
    await expect(passedStatus).toBeVisible();
    await expect(passedStatus.locator('.fq-ll-full-explanation').getByTestId('button-listen-learning-text')).toHaveCount(1);
    await expect(checkCard).toBeVisible();
    await expect(page.getByTestId(`button-check-${check.id}`)).toHaveCount(0);
    await expect(page.getByTestId(`check-${check.id}`).locator('.fq-ll-check-passed')).toHaveText('Passed');
    const next = page.getByTestId(`button-next-${check.id}`);
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();
    await next.click();
    const nextCheck = checks[index + 1];
    if (nextCheck) await expect(page.getByTestId(`check-${nextCheck.id}`)).toBeVisible();
    else {
      await expect(page.getByTestId('section-build-practice')).toBeVisible();
      await expect(page.getByTestId('section-worksheet')).toBeVisible();
    }
  }
}

for (const viewport of [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
]) {
  test(`a passed Build check clearly offers the next step on ${viewport.name}`, async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    const mission = MISSIONS.find(({ id }) => id === 'equal-parts');
    if (!mission) throw new Error('The first lesson is missing');

    await openAsGuest(page);
    await page.evaluate((progress) => {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    }, progressBefore(mission));
    await page.reload();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await passStory(page);
    await expect(page.getByTestId('learning-lab')).toBeVisible();

    const check = getBuildChecks(mission.id)[0];
    if (!check) throw new Error('The first lesson has no Build check');
    await enterModel(page, check.id, 'a', check.target);
    await enterModel(page, check.id, 'b', {
      ...check.target,
      kind: check.target.kind === 'line' ? 'bar' : 'line',
      wholes: Math.max(1, Math.ceil(check.target.n / check.target.d)),
    });

    const checkButton = page.getByTestId(`button-check-${check.id}`);
    await expect(checkButton).toBeDisabled();
    await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
    await expect(checkButton).toBeEnabled();
    await checkButton.click();

    await expect(page.getByTestId(`status-pass-${check.id}`)).toContainText('Correct!');
    await expect(checkButton).toHaveCount(0);
    await expect(page.getByTestId(`check-${check.id}`).locator('.fq-ll-check-passed')).toHaveText('Passed');
    const next = page.getByTestId(`button-next-${check.id}`);
    await expect(next).toBeVisible();
    await expect(next).toBeEnabled();
    const bounds = await next.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
    });
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
    if (viewport.width <= 560) expect(bounds.width).toBeGreaterThan(viewport.width * 0.7);

    await page.getByTestId('button-lab-back').click();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await passStory(page);

    const reopenedCheck = page.getByTestId(`check-${check.id}`);
    await expect(reopenedCheck.locator('.fq-ll-check-passed')).toHaveText('Passed');
    await expect(page.getByTestId(`status-pass-${check.id}`)).toContainText('Correct!');
    await expect(page.getByTestId(`button-check-${check.id}`)).toHaveCount(0);
    const reopenedNext = page.getByTestId(`button-next-${check.id}`);
    await expect(reopenedNext).toBeVisible();
    await expect(reopenedNext).toBeEnabled();
    const explanation = reopenedCheck.locator('.fq-ll-full-explanation');
    await explanation.locator('summary').click();
    await expect(explanation).toContainText(/Shade 1 part in the bar and mark 1 of 3 equal jumps on the number line/);
    await reopenedNext.click();

    const nextCheck = getBuildChecks(mission.id)[1];
    if (nextCheck) await expect(page.getByTestId(`check-${nextCheck.id}`)).toBeVisible();
    else await expect(page.getByTestId('section-build-practice')).toBeVisible();

    await page.getByTestId('button-lab-back').click();
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await passStory(page);
    if (nextCheck) {
      const resumedCheck = page.getByTestId(`check-${nextCheck.id}`);
      await expect(resumedCheck).toBeVisible();
      await expect(resumedCheck.locator('.fq-ll-check-passed')).toHaveCount(0);
      await expect(page.getByTestId(`check-${check.id}`)).toHaveCount(0);
    } else {
      await expect(page.getByTestId('section-build-practice')).toBeVisible();
    }
  });
}

test('a passed Build check in later review clearly offers Finish review', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const mission = MISSIONS.find(({ id }) => id === 'equal-parts');
  if (!mission) throw new Error('The first lesson is missing');
  const progress = {
    completedMissionIds: [mission.id],
    starsByMission: { [mission.id]: 1 },
    reviewQueue: [{
      missionId: mission.id,
      missedQuestionId: mission.questions[0].id,
      dueAt: 0,
      reviewCount: 0,
    }],
    learning: {
      [mission.id]: {
        practiceDone: true,
        completedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
        checks: {},
        worksheet: {},
        helpUses: 0,
        misconceptions: {},
      },
    },
    assessments: [],
  };
  const reviewQuestion = getDueSkillReviewQuestions(progress)[0];
  if (!reviewQuestion) throw new Error('The saved skill review has no question');

  await page.addInitScript((savedProgress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
  }, progress);
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-due-review');
  await page.getByTestId(`button-answer-${reviewQuestion.id}-${reviewQuestion.correctChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
  await page.getByTestId('button-finish-mission').click();
  await expect(page.getByTestId('learning-lab-review')).toBeVisible();

  const check = getReviewCheck(mission.id, 0);
  await enterModel(page, check.id, 'a', check.target);
  await enterModel(page, check.id, 'b', {
    ...check.target,
    kind: check.target.kind === 'line' ? 'bar' : 'line',
    wholes: Math.max(1, Math.ceil(check.target.n / check.target.d)),
  });
  await page.getByTestId(`radio-reason-${check.id}-${check.correctReason}`).check({ force: true });
  await page.getByTestId(`button-check-${check.id}`).click();

  const reviewCheck = page.getByTestId(`check-${check.id}`);
  await expect(reviewCheck.getByTestId(`status-pass-${check.id}`)).toContainText('Correct!');
  const explanation = reviewCheck.locator('.fq-ll-full-explanation');
  await explanation.locator('summary').click();
  await expect(explanation).toContainText('The top number is the 1 shaded part.');
  await expect(reviewCheck.locator('.fq-ll-check-passed')).toHaveText('Passed');
  await expect(page.getByTestId(`button-check-${check.id}`)).toHaveCount(0);

  const finishReview = page.getByTestId('button-review-finish');
  await expect(finishReview).toBeVisible();
  await expect(finishReview).toBeEnabled();
  const bounds = await finishReview.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { width: rect.width, height: rect.height, left: rect.left, right: rect.right, viewportWidth: window.innerWidth };
  });
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewportWidth);
  expect(bounds.width).toBeGreaterThan(bounds.viewportWidth * 0.7);

  await finishReview.click();
  await expect(page.getByTestId('status-review-complete')).toBeVisible();
});

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
  'compare-same-numerator',
  'fraction-magnitude',
  'number-line-beyond-one',
  'order-fractions',
  'missing-equivalent',
  'mixed-improper',
  'multiply-whole-by-fraction',
  'fraction-recipes',
  'subtract-unlike-fractions',
  'fraction-of-collection',
  'divide-whole-by-unit-fraction',
  'fraction-probability',
  'multi-step-fraction-stories',
  'spot-the-mistake',
];

for (const missionId of unitRepresentativeIds) {
  const mission = MISSIONS.find((item) => item.id === missionId)!;
  test(`unit ${mission.unit} model builds and worksheet evidence unlock lessons in order`, async ({ page }) => {
    test.setTimeout(90_000);
    if (mission.id !== 'equal-parts') {
      await page.addInitScript((progress) => {
        localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
      }, progressBefore(mission));
    }
    if (mission.id === 'equal-parts') await page.setViewportSize({ width: 390, height: 844 });
    await openAsGuest(page);
    if (mission.id === 'equal-parts') {
      await page.evaluate((progress) => {
        localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
      }, progressBefore(mission));
      await page.reload();
      await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    }

    // In units 9–14, same-unit lessons are selectable together; the next unit stays gated.
    const nextMission = MISSIONS[MISSIONS.indexOf(mission) + 1];
    const gateBoundaryMission = mission.unit < 9
      ? nextMission
      : MISSIONS.find((item) => item.unit === mission.unit + 1);
    if (gateBoundaryMission) await expectMissionStart(page, gateBoundaryMission.id, false);
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await passStory(page);
    await expect(page.getByTestId('learning-lab')).toBeVisible();

    await completeBuilds(page, mission.id);
    await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '0');
    await expect(page.getByTestId('button-lab-finish')).toHaveCount(0);
    // No progress box at the bottom: after the questions, one button goes to the first open question.
    await expect(page.getByTestId('section-learning-summary')).toHaveCount(0);
    await expect(page.getByTestId('button-lab-continue')).toHaveText(/Continue: Worksheet question 1/);
    await page.getByTestId('button-lab-continue').click();
    await expect(page.getByTestId(`row-worksheet-${getWorksheet(mission.id)[0].id}`)).toBeInViewport();

    // Passing the two model checks alone is not enough to open the next lesson.
    await page.getByTestId('button-lab-back').click();
    if (gateBoundaryMission) await expectMissionStart(page, gateBoundaryMission.id, false);
    await expectMissionStart(page, mission.id, true);
    await page.getByTestId(`button-start-mission-${mission.id}`).click();
    await passStory(page);
    await expect(page.getByTestId('section-worksheet')).toBeVisible();

    const worksheet = getWorksheet(mission.id);
    const problemProgress = page.getByTestId('worksheet-problem-progress');
    await expect(problemProgress.locator(':scope > li')).toHaveCount(12);
    const firstWorksheetRow = page.getByTestId(`row-worksheet-${worksheet[0].id}`);
    await expect(firstWorksheetRow.locator('.fq-ll-row-prompt-header').getByTestId('button-listen-learning-text')).toHaveCount(1);
    await expect(page.getByTestId(`worksheet-progress-${worksheet[0].id}`)).toHaveAttribute('aria-current', 'step');
    await expect(page.getByTestId(`row-worksheet-${worksheet[0].id}`)).toContainText('Question 1 of 12');
    await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuetext', /0 of 12 worksheet questions complete/);
    if (mission.id === 'equal-parts') {
      const problem = worksheet.find((row) => !row.modelRequired && !row.areaTask)!;
      const wrongAnswer = wrongTileAnswer(problem);
      await enterWorksheetAnswer(page, problem, wrongAnswer);
      await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Not yet.');
      await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '0');
      const retryMarker = page.getByTestId(`worksheet-progress-${problem.id}`);
      await expect(retryMarker).toHaveClass(/retry/);
      await expect(retryMarker).toContainText('Needs another try');
      await expect(page.getByTestId('button-lab-finish')).toHaveCount(0);

      // A wrong attempt remains marked for retry after the learner leaves and reopens the lesson.
      await page.reload();
      await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
      await expectMissionStart(page, mission.id, true);
      await page.getByTestId(`button-start-mission-${mission.id}`).click();
      await passStory(page);
      await expect(page.getByTestId('section-worksheet')).toBeVisible();
      await expect(page.getByTestId(`worksheet-progress-${problem.id}`)).toHaveClass(/retry/);
    }

    // The whole worksheet is handed in: the lesson cannot finish until every question is right.
    for (const [index, problem] of worksheet.entries()) {
      await buildWorksheetModel(page, problem);
      await enterWorksheetAnswer(page, problem, problem.answer);
      await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Correct!');
      if (index < worksheet.length - 1) {
        await expect(page.getByTestId('button-lab-finish')).toHaveCount(0);
        await expect(page.getByTestId('callout-lab-finish')).toHaveCount(0);
      }
    }
    await expect(page.getByTestId('progress-worksheet')).toHaveAttribute('aria-valuenow', '12');
    await expect(problemProgress.locator(':scope > li.complete')).toHaveCount(12);
    await expect(page.getByTestId('callout-lab-finish')).toContainText('You did it!');
    await expect(page.getByTestId('button-lab-finish')).toBeEnabled();
    await expect(page.getByTestId('button-lab-continue')).toHaveCount(0);

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

  await page.getByTestId(`button-start-mission-${MISSIONS[0].id}`).click();
  await passStory(page);
  // Learn one idea, practise it three times: lesson 1 opens on its first idea's Learn page.
  await expect(page.locator('.fq-taskbar-title')).toHaveText(MISSIONS[0].title);
  await expect(page.getByTestId('idea-kicker')).toHaveText('Lesson 01 · Idea 1 of 4 · Learn');
  await expect(page.getByRole('heading', { name: 'Equal parts are the same size' })).toBeVisible();
  await expect(page.locator('.fq-ts-goal')).toContainText('Tell when the parts of a whole');
  await expect(page.getByTestId('teach-step-text')).toContainText('Look at one whole');
  await expect(page.getByTestId('idea-learn').getByTestId('button-listen-learning-text')).toBeVisible();
  await expect(page.getByTestId('teach-scene')).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeLessThan(100);
});

test('an idea’s Learn picture opens complete when reduced motion is enabled', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openAsGuest(page);
  await page.getByTestId(`button-start-mission-${MISSIONS[0].id}`).click();
  await passStory(page);
  await page.getByTestId('button-teach-step-next').click();
  const scene = page.getByTestId('teach-scene');
  await expect.poll(async () => Number(await scene.getAttribute('data-frame')) + 1).toBe(Number(await scene.getAttribute('data-frames')));
  // The unfair bar is crossed out; the fair one has its tick.
  await expect(scene.getByTestId('teach-scene-cross')).toHaveCount(1);
  await expect(scene.locator('.fq-ts-label.is-fair .fq-ts-tone-mark')).toHaveAttribute('data-mark', 'tick');
  await expect(scene.locator('.fq-ts-label.is-unfair .fq-ts-tone-mark')).toHaveAttribute('data-mark', 'cross');
});

test('replaying the first lesson and leaving it preserves saved progress', async ({ page }) => {
  const savedProgress = {
    completedMissionIds: ['equal-parts'],
    starsByMission: { 'equal-parts': 2 },
    reviewQueue: [],
    learning: { 'equal-parts': { completedAt: 1 } },
    assessments: [],
  };
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, savedProgress);
  await openAsGuest(page);
  await page.getByTestId('button-node-equal-parts').click();
  await page.getByTestId('button-start-mission-equal-parts').click();
  await passStory(page);

  await expect(page.getByTestId('idea-kicker')).toHaveText('Lesson 01 · Idea 1 of 4 · Learn');
  for (let p = 1; p < lessonIdeas('equal-parts')![0]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  await expectLessonQuestionProgress(page, 1, 0);
  await page.getByTestId('button-back-map').click();

  const progress = await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}'));
  expect(progress.completedMissionIds).toEqual(savedProgress.completedMissionIds);
  expect(progress.starsByMission).toEqual(savedProgress.starsByMission);
  expect(progress.learning).toEqual(savedProgress.learning);
});

test('a lesson ends with its story problem, told with the season’s props (pumpkin pies at Halloween)', async ({ page }) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date(2026, 9, 20, 10, 0, 0));
  await openAsGuest(page);
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  await openDeveloperLesson(page, mission);
  await expect(page.locator('html')).toHaveAttribute('data-fq-season', 'halloween');
  // The lesson itself follows the season too: its cake rounds (idea 3 and 4 practices) are pumpkin cakes.
  await completeIdeas(page, mission, { beforeRound: () => expect(page.locator('.fq-pf-card')).toContainText('pumpkin') });
  await expect(page.locator('.fq-play-kicker')).toContainText('Put it together');
  const last = mission.questions.at(-1)!;
  await expect(page.getByTestId('story-problem-tag')).toHaveText('Story problem');
  await expect(page.getByTestId('story-line')).toContainText('The baker gave me a pumpkin pie to share.');
  await expect(page.locator('#lesson-title')).toContainText('Chomp cut a pumpkin pie into 3 equal pieces. What is 1 piece?');
  await page.getByTestId(`button-answer-${last.id}-story-${last.correctChoice}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
});

test('an idea is taught right before its practice, and the practice says which idea it is', async ({ page }) => {
  await openAsGuest(page);
  const firstLesson = MISSIONS.find((mission) => mission.id === 'equal-parts')!;
  await openDeveloperLesson(page, firstLesson);
  await completeIdeas(page, firstLesson, { until: 3 });
  // Idea 2's Learn page comes right after idea 1's third practice.
  await expect(page.getByTestId('idea-kicker')).toHaveText('Lesson 01 · Idea 2 of 4 · Learn');
  await expect(page.getByRole('heading', { name: 'Count the equal parts to name one part' })).toBeVisible();
  await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  await expect(page.locator('.fq-play-kicker')).toContainText('Idea 2 of 4');
  await expect(page.locator('.fq-play-kicker')).toContainText('Practise 1 of 3');
});

test.describe('all-lesson required-question smoke', () => {
  test.describe.configure({ timeout: 900_000 });

  test('every lesson completes its required questions in an isolated developer test', async ({ page }) => {
    // On a phone, so every Learn page of every idea is checked to fit. SMOKE_LESSONS=id,id runs only those lessons.
    await page.setViewportSize({ width: 390, height: 844 });
    await openAsGuest(page);
    const savedStorage = await localStorageSnapshot(page);
    const only = process.env.SMOKE_LESSONS?.split(',').map((id) => id.trim()).filter(Boolean);
    for (const mission of MISSIONS.filter((item) => !only?.length || only.includes(item.id))) {
      await test.step(`${mission.id}: ${mission.title}`, async () => {
        await openDeveloperLesson(page, mission);

        if (lessonIdeas(mission.id)) {
          await completeIdeas(page, mission);
          if (hasStoryAfterIdeas(mission)) {
            const last = mission.questions.at(-1)!;
            await page.getByTestId(`button-answer-${last.id}-story-${last.correctChoice}`).click();
            await page.getByTestId('button-check-answer').click();
            await page.getByTestId('button-finish-mission').click();
          }
          await finishDeveloperLesson(page, savedStorage);
          return;
        }
        if (PART_FINDER_LESSONS.has(mission.id)) {
          await completePartFinderLesson(page, mission.id);
        } else if (mission.id === 'order-unlike-fractions') {
          await completeFractionOrderLesson(page);
        }

        const lessonQuestions = [
          ...mission.questions.slice(0, -1),
          ...(hasGenerator(mission.id)
            ? getExtraPractice(mission.id, mission.questions.map((question) => question.id)).slice(0, 4)
            : []),
          mission.questions.at(-1)!,
        ];
        await completeQuestionSequence(page, lessonQuestions);
        await finishDeveloperLesson(page, savedStorage);
      });
    }
  });
});

test('learners can correct a wrong answer across every lesson model type', async ({ page }) => {
  test.setTimeout(60_000);
  const modelKinds = ['area', 'bars', 'decimal', 'line', 'partition', 'set'] as const;
  const representativeMissions = modelKinds.map((kind) =>
    MISSIONS.find((mission) => mission.questions[0]?.model.kind === kind && !lessonIdeas(mission.id)) ?? MISSIONS.find((mission) => mission.questions[0]?.model.kind === kind),
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
    await passStory(page);
    // A lesson with ideas opens on idea 1's Learn page; its first practice is the first question of that idea.
    const ideas = lessonIdeas(mission.id);
    if (ideas) {
      for (let p = 1; p < ideas[0]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
      await page.getByTestId('button-idea-practise').click();
    } else if (PART_FINDER_LESSONS.has(mission.id)) await page.getByTestId('button-hands-on-skip').click();
    else await expect(page.getByTestId('lesson-example')).toBeVisible();

    const first = ideaSteps(mission.id)[0]?.item;
    const question = first && 'question' in first ? ideaQuestion(mission, first.question)! : mission.questions[0];
    await expect(page.getByTestId('question-model-area')).toBeVisible();
    await retryLessonQuestion(page, question);
    await page.getByTestId('button-next-question').click();
    await expectLessonQuestionProgress(page, 2, 1);
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

  await expectLessonQuestionProgress(page, 1, 0);
  await expect(page.getByTestId(`button-answer-${generatedQuestion.id}-0`)).toBeVisible();
  await retryLessonQuestion(page, generatedQuestion);
  await page.getByTestId('button-next-question').click();
  await expectLessonQuestionProgress(page, 2, 1);
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

test('daily practice resumes its checked scaffold and parent report after reload without duplicating adaptation history', async ({ page }) => {
  const mission = MISSIONS[0];
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, {
    completedMissionIds: [],
    starsByMission: {},
    reviewQueue: [],
    learning: {
      [mission.id]: { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} },
    },
    adaptiveStandards: {
      '3.NF.1': {
        status: 'developing',
        recent: [false, false, false],
        accuracy: 0,
        streakCorrect: 0,
        streakMisses: 3,
        lastUpdatedAt: Date.now(),
      },
    },
    assessments: [],
  });
  await openAsGuest(page);
  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.locator('#daily-question-title')).toBeVisible();

  const started = await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}');
    const session = progress.dailyPractice;
    const question = session.questions[session.index];
    return {
      index: session.index,
      question,
      adaptationLog: progress.adaptationLog ?? [],
    };
  });
  expect(started.question.difficultyBand).toBe('scaffolded');
  expect(started.question.kind).toBe('build');
  expect(started.question.adaptationReason).toMatch(/moved to scaffolded/i);
  expect(started.adaptationLog.length).toBeGreaterThan(0);
  expect(started.adaptationLog.some((event: { missionId: string; band: string; reason: string }) =>
    event.missionId === started.question.missionId
    && event.band === 'scaffolded'
    && event.reason === started.question.adaptationReason,
  )).toBe(true);

  await page.getByTestId(`button-daily-parts-${started.question.denominator}`).click();
  for (let part = 1; part <= started.question.numerator; part++) {
    await page.getByTestId(`button-daily-part-${part}`).click();
  }
  await page.getByTestId('button-daily-check-model').click();
  await expect(page.getByRole('status')).toContainText('That’s it!');
  await expect(page.getByTestId('button-daily-next')).toBeVisible();

  const afterCheck = await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}');
    const session = progress.dailyPractice;
    return {
      index: session.index,
      questionId: session.questions[session.index].id,
      answer: session.attempts[session.questions[session.index].id],
      adaptationLog: progress.adaptationLog ?? [],
    };
  });
  expect(afterCheck.index).toBe(started.index);
  expect(afterCheck.questionId).toBe(started.question.id);
  expect(afterCheck.answer.answerCorrect).toBe(true);
  expect(afterCheck.adaptationLog).toHaveLength(started.adaptationLog.length);

  await page.reload();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.locator('#daily-question-title')).toBeVisible();
  await expect(page.getByTestId('button-daily-next')).toBeVisible();
  // The grown-up reason stays in the parent report; the child never sees it.
  await expect(page.locator('.fq-daily-card')).not.toContainText(started.question.adaptationReason);

  const resumed = await page.evaluate(() => {
    const progress = JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}');
    const session = progress.dailyPractice;
    const question = session.questions[session.index];
    return {
      index: session.index,
      questionId: question.id,
      answer: session.attempts[question.id],
      adaptationLog: progress.adaptationLog ?? [],
    };
  });
  expect(resumed.index).toBe(started.index);
  expect(resumed.questionId).toBe(started.question.id);
  expect(resumed.answer.answerCorrect).toBe(true);
  expect(resumed.adaptationLog).toHaveLength(started.adaptationLog.length);

  await page.getByTestId('button-daily-back').click();
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge?.match(/(\d+)\s×\s(\d+)/);
  expect(factors).not.toBeNull();
  await page.getByTestId('input-parent-gate').fill(String(Number(factors![1]) * Number(factors![2])));
  await page.getByTestId('button-parent-gate').click();
  const adaptations = page.getByTestId('parent-adaptation-reasons');
  await expect(adaptations).toBeVisible();
  await expect(adaptations).toContainText(started.question.adaptationReason);
  await expect(adaptations).not.toContainText('transfer');
  await expect(adaptations.getByRole('listitem')).toHaveCount(started.adaptationLog.length);
});

test('lesson 1 shares cakes in its last idea: equal pieces, then mixed shapes', async ({ page }) => {
  // Outside a seasonal theme, so the cake is a plain cake (in October it is a pumpkin cake).
  await page.clock.setFixedTime(new Date(2026, 2, 10, 10, 0, 0));
  await page.addInitScript(() => {
    const sent: string[] = [];
    (window as unknown as { __shell: string[] }).__shell = sent;
    (window as unknown as { ReactNativeWebView: unknown }).ReactNativeWebView = { postMessage: (message: string) => sent.push(message) };
  });
  await openAsGuest(page);
  await page.getByTestId(`button-start-mission-${MISSIONS[0].id}`).click();
  await passStory(page);
  // Idea 4, "Share fairly": its Learn page, then the two cake rounds are its first two practices.
  const sortAt = ideaSteps('equal-parts').findIndex(({ item }) => 'handsOn' in item && item.handsOn === 'sort');
  await completeIdeas(page, MISSIONS[0], { until: sortAt });
  await expect(page.getByTestId('idea-kicker')).toHaveText('Lesson 01 · Idea 4 of 4 · Learn');
  await page.getByTestId('button-idea-practise').click();
  // A cake round in an idea: the bar says where the child is, with no "1/3 done" count, no Helper and no friend's line.
  await expect(page.locator('.fq-taskbar-title')).toHaveText('Idea 4 of 4 · Practise 1 of 3');
  await expect(page.getByTestId('taskbar-progress')).toHaveCount(0);
  await expect(page.getByTestId('button-lesson-helper')).toHaveCount(0);
  await expect(page.getByTestId('story-line')).toHaveCount(0);
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
  // Earlier practices tapped too: count this round's selection taps from here.
  const tapsBefore = await page.evaluate(() => (window as unknown as { __shell: string[] }).__shell
    .map((message) => JSON.parse(message) as { type: string; cue?: string })
    .filter((message) => message.type === 'haptic' && message.cue === 'selection').length);
  await assignPiece(1);
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shell: string[] }).__shell
    .map((message) => JSON.parse(message) as { type: string; cue?: string })
    .filter((message) => message.type === 'haptic' && message.cue === 'selection').length)).toBe(tapsBefore + 1);
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
  const selectedPieceCues = await page.evaluate(() => (window as unknown as { __shell: string[] }).__shell
    .map((message) => JSON.parse(message) as { type: string; cue?: string })
    .filter((message) => message.type === 'haptic' && message.cue === 'selection').length);
  await page.getByTestId('button-part-finder-piece-1').dispatchEvent('click');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __shell: string[] }).__shell
    .map((message) => JSON.parse(message) as { type: string; cue?: string })
    .filter((message) => message.type === 'haptic' && message.cue === 'selection').length)).toBe(selectedPieceCues);

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
  await expect(page.getByTestId('part-finder-feedback')).toContainText('Every friend gets 14 of the cake.');
  await page.getByTestId('button-part-finder-next').click();
  await expect(page.locator('.fq-play-kicker')).toContainText('Practise 3 of 3');
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
  await expect(page.locator('.fq-whole-bracket')).toHaveText('one whole: 4 equal parts');
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
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge?.match(/(\d+)\s×\s(\d+)/);
  expect(factors).not.toBeNull();
  await page.getByRole('textbox').fill(String(Number(factors![1]) * Number(factors![2])));
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByTestId('parent-report')).toBeVisible();
  await page.getByTestId('button-parent-print').click();
  await expect.poll(() => page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(1);
});

test('the model intros are their own lesson steps: Watch, then Try, each saved; the Helper keeps both', async ({ page }) => {
  test.setTimeout(90_000);
  const first = MISSIONS[0];
  const [check] = getBuildChecks(first.id);
  await page.addInitScript((id) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [], assessments: [],
      learning: { [id]: { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} } } }));
  }, first.id);
  await openAsGuest(page);
  await page.getByTestId(`button-start-mission-${first.id}`).click();
  await passStory(page);

  // The step row starts with Watch and Try, before Build it. There is no second row of steps inside the intro.
  const steps = page.getByTestId('list-lab-steps');
  await expect(steps.getByTestId('step-intro-watch')).toHaveClass(/now/);
  await expect(steps.getByTestId('step-intro-watch')).toContainText('1Watch');
  await expect(steps.getByTestId('step-intro-try')).toContainText('2Try');
  await expect(steps.getByTestId(`step-${check.id}`)).toContainText('3');
  await expect(page.locator('.fq-mi-phases')).toHaveCount(0);

  // Watch: the bar demo plays by itself in place of the build, then the number line demo.
  const intro = page.getByTestId('intro-builder');
  await expect(intro).toHaveAttribute('data-step', 'watch');
  await expect(intro.locator('.fq-mi-kicker')).toHaveText('Step 1 · Watch');
  await expect(page.getByTestId(`model-${check.id}-a`)).toHaveCount(0);
  await expect(intro.locator('.fq-mi-caption')).toContainText('This bar is one whole.');
  await expect(page.getByTestId('button-intro-watched')).toContainText('Next: number line');
  await page.getByTestId('button-intro-watched').click();
  const line = page.getByTestId('intro-line');
  await expect(line).toHaveAttribute('data-step', 'watch');
  await expect(line.locator('.fq-mi-caption')).toContainText('This line goes from 0 to 1.');
  // Every mark on the line is labeled: the demo names its jumps (1/4, 2/4…) as it cuts the line.
  await expect(page.getByTestId('intro-demo-line').locator('.fq-nl-frac').first()).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId('button-intro-watched')).toContainText('Next: Try');
  await page.getByTestId('button-intro-watched').click();

  // Try: Watch is ticked; the bar tries come first.
  await expect(steps.getByTestId('step-intro-watch')).toHaveClass(/done/);
  await expect(steps.getByTestId('step-intro-try')).toHaveClass(/now/);
  await expect(intro).toHaveAttribute('data-step', 'try');
  await expect(intro.locator('.fq-mi-kicker')).toHaveText('Step 2 · Try');
  // Try 1: one half. The nudge says what to do next, never the answer's picture.
  await expect(page.getByTestId('status-intro-hint')).toContainText('First cut the whole into 2 equal parts.');
  await expect(page.getByTestId('button-intro-next')).toBeDisabled();
  await page.getByTestId('button-intro-plus').click();
  await expect(page.getByTestId('status-intro-hint')).toContainText('Now shade 1 part.');
  await page.getByTestId('intro-piece-0').click();
  await expect(page.getByTestId('status-intro-hint')).toContainText('Yes! 1 of 2 equal parts is one half.');
  await page.getByTestId('button-intro-next').click();
  // Try 2: two thirds, then on to the number line tries.
  await page.getByTestId('button-intro-plus').click();
  await page.getByTestId('button-intro-plus').click();
  await page.getByTestId('intro-piece-1').click();
  await expect(page.getByTestId('button-intro-next')).toContainText('Next: number line');
  await page.getByTestId('button-intro-next').click();
  await expect(line).toHaveAttribute('data-step', 'try');

  // A finished step is saved: after a reload the lesson opens on the number line tries, not on Watch or the bar tries.
  await page.reload();
  await page.getByTestId(`button-start-mission-${first.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('intro-builder')).toHaveCount(0);
  await expect(line).toHaveAttribute('data-step', 'try');
  await expect(steps.getByTestId('step-intro-watch')).toHaveClass(/done/);

  // In a number line try, the marks are named for the spaces the child chose: 3 spaces read 1/3 and 2/3.
  await page.getByTestId('button-intro-plus').click();
  await page.getByTestId('button-intro-plus').click();
  await expect(page.getByTestId('value-intro-parts')).toHaveText('3');
  await expect(page.getByTestId('intro-tick-1').getByLabel('1 over 3')).toBeVisible();
  await expect(page.getByTestId('intro-tick-2').getByLabel('2 over 3')).toBeVisible();
  await expect(page.getByTestId('intro-tick-3')).toContainText('1');
  // Each label sits under its mark and stays small (a stacked fraction, not a block that covers the line).
  for (const tick of [1, 2]) {
    const mark = (await page.getByTestId(`intro-tick-${tick}`).locator('> i').boundingBox())!;
    const label = (await page.getByTestId(`intro-tick-${tick}`).locator('.fq-nl-label').boundingBox())!;
    expect(label.y, `label ${tick} is under its mark`).toBeGreaterThanOrEqual(mark.y + mark.height - 1);
    expect(label.height, `label ${tick} is a small stacked fraction`).toBeLessThan(40);
  }
  await page.getByTestId('intro-tick-2').click();
  await page.getByTestId('button-intro-next').click();
  await page.getByTestId('button-intro-plus').click();
  await page.getByTestId('button-intro-plus').click();
  await page.getByTestId('button-intro-plus').click();
  await page.getByTestId('intro-tick-3').click();
  await expect(page.getByTestId('button-intro-next')).toContainText('Next: Build it');
  await page.getByTestId('button-intro-next').click();

  // Build it: both intro steps ticked; the build and its number line open with no intro in between.
  await expect(steps.getByTestId('step-intro-try')).toHaveClass(/done/);
  await expect(steps.getByTestId(`step-${check.id}`)).toHaveClass(/now/);
  await expect(page.getByTestId(`model-${check.id}-a`)).toBeVisible();
  await enterModel(page, check.id, 'a', check.target);
  await expect(page.getByTestId('intro-line')).toHaveCount(0);
  await expect(page.getByTestId(`model-${check.id}-b`)).toBeVisible();

  // Done once, neither step comes back by itself.
  await page.reload();
  await page.getByTestId(`button-start-mission-${first.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await expect(steps.getByTestId('step-intro-watch')).toHaveCount(0);
  await expect(page.locator('[data-step]')).toHaveCount(0);
  await expect(page.getByTestId(`model-${check.id}-a`)).toBeVisible();

  // The Helper keeps both, with Watch and Try as separate buttons (no skip there, and it changes nothing).
  await page.getByTestId('button-lesson-helper').click();
  const helper = page.getByTestId('lesson-helper');
  await expect(helper).toBeVisible();
  await helper.getByTestId('button-helper-line-try').click();
  await expect(helper.getByTestId('intro-line')).toHaveAttribute('data-step', 'try');
  await expect(helper.getByTestId('button-intro-skip')).toHaveCount(0);
  await page.getByTestId('button-lesson-helper-close').click();
  await page.getByTestId('button-lesson-helper').click();
  await helper.getByTestId('button-helper-line').click();
  await expect(helper.getByTestId('intro-line')).toHaveAttribute('data-step', 'watch');
  await page.getByTestId('button-lesson-helper-close').click();
  await expect(helper).toHaveCount(0);
});

test('every later lesson opens Build it with a short Watch, each visit, but never repeats Try', async ({ page }) => {
  test.setTimeout(90_000);
  const mission = MISSIONS.find((item) => item.id === 'fraction-names')!;
  const [check] = getBuildChecks(mission.id);
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    const fun = JSON.parse(localStorage.getItem('fraction-quest-fun-v1') ?? '{}');
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ ...fun, introsSeen: { builder: true, line: true }, fractionWordsSeen: true }));
  }, progressBefore(mission));
  await openAsGuest(page);
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('learning-lab')).toBeVisible();

  // Watch is step 1, before Build it; the build waits until it is watched or skipped.
  const steps = page.getByTestId('list-lab-steps');
  await expect(steps.getByTestId('step-quick-watch')).toHaveClass(/now/);
  await expect(steps.getByTestId(`step-${check.id}`)).toContainText('2');
  const watch = page.getByTestId('quick-watch');
  await expect(watch.locator('[data-step="watch"] .fq-mi-kicker')).toHaveText('Step 1 · Watch');
  await expect(page.getByTestId(`model-${check.id}-a`)).toHaveCount(0);
  await expect(watch.getByTestId('button-intro-watched')).toContainText('Next: Build it');
  await watch.getByTestId('button-intro-watched').click();
  await expect(steps.getByTestId('step-quick-watch')).toHaveClass(/done/);
  await expect(page.getByTestId(`model-${check.id}-a`)).toBeVisible();
  // Try is never repeated.
  await expect(page.locator('[data-step="try"]')).toHaveCount(0);

  // The next visit shows the short Watch again (until Build it is done); skip goes straight to the build.
  await page.getByTestId('button-lab-back').click();
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('quick-watch')).toBeVisible();
  await page.getByTestId('quick-watch').getByTestId('button-intro-skip').click();
  await expect(page.getByTestId(`model-${check.id}-a`)).toBeVisible();
});

test('"I know how: skip" on Watch skips both intro steps and goes to Build it', async ({ page }) => {
  const first = MISSIONS[0];
  const [check] = getBuildChecks(first.id);
  await page.addInitScript((id) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [], assessments: [],
      learning: { [id]: { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {} } } }));
  }, first.id);
  await openAsGuest(page);
  await page.getByTestId(`button-start-mission-${first.id}`).click();
  await passStory(page);
  await page.getByTestId('button-intro-skip').click();
  await expect(page.locator('[data-step]')).toHaveCount(0);
  await expect(page.getByTestId('step-intro-watch')).toHaveClass(/done/);
  await expect(page.getByTestId('step-intro-try')).toHaveClass(/done/);
  await expect(page.getByTestId(`model-${check.id}-a`)).toBeVisible();
});

test('the map shows only lessons; extras live in the More menu; start becomes jump after the first lesson', async ({ page }) => {
  await openAsGuest(page);
  // In story mode the map reads in story order: the prologue card, then chapter 1's banner (its hook and "Read
  // chapter 1", no start button), then lesson 1, whose card has the one Start button.
  await expect(page.getByTestId('prologue-card')).toContainText('The night the stone cracked');
  await expect(page.getByTestId('button-map-prologue')).toContainText('Watch the prologue');
  const prologueBox = await page.getByTestId('prologue-card').boundingBox();
  const chapterBox = await page.getByTestId('chapter-banner-1').boundingBox();
  expect(prologueBox!.y).toBeLessThan(chapterBox!.y);
  await expect(page.getByTestId('chapter-banner-1').getByRole('button', { name: /start/i })).toHaveCount(0);
  await expect(page.getByTestId('button-continue-course')).toHaveCount(0);
  await expect(page.getByTestId(`button-start-mission-${MISSIONS[0].id}`)).toContainText('Start lesson');
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
  await expect(page.getByTestId('button-tip-xp-tip')).toContainText(/10 (points|candy) for every right answer/);
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

test('racing the robot reads each new question aloud as it appears', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-natural-voice', 'off'); // device voice, so the stub below hears it
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class FakeUtterance { text: string; voice = null; lang = ''; rate = 1; pitch = 1; volume = 1; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    const synth = {
      speaking: false, pending: false, paused: false,
      getVoices: () => [{ name: 'Test voice', lang: 'en-US', default: true, localService: true, voiceURI: 'test' }],
      speak: (u: FakeUtterance) => { if (u.text.trim()) spoken.push(u.text); setTimeout(() => u.onend?.(), 10); },
      cancel: () => {}, pause: () => {}, resume: () => {},
      addEventListener: () => {}, removeEventListener: () => {},
    };
    Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
  });
  await openAsGuest(page);
  const node = page.getByTestId('button-node-equal-parts');
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId('button-race-equal-parts').click();
  await page.getByTestId('button-race-robot-1').click();
  const firstPrompt = page.locator('.fq-race-q').first();
  await expect(firstPrompt).toBeVisible({ timeout: 5000 });
  const spokenCount = () => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.length);
  await expect.poll(spokenCount).toBeGreaterThan(0);
  const before = await spokenCount();
  // Answer (right or wrong); the next question is read when it shows.
  await page.locator('[data-testid^="race-you-choice-"]').first().click();
  await expect.poll(spokenCount, { timeout: 6000 }).toBeGreaterThan(before);
});

test('a wrong answer brings Hoot, reads the help aloud, and greys out the tried choice', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-natural-voice', 'off');
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class FakeUtterance { text: string; voice = null; lang = ''; rate = 1; pitch = 1; volume = 1; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speaking: false, pending: false, paused: false,
      getVoices: () => [{ name: 'Test voice', lang: 'en-US', default: true, localService: true, voiceURI: 'test' }],
      speak: (u: FakeUtterance) => { if (u.text.trim()) spoken.push(u.text); setTimeout(() => u.onend?.(), 10); },
      cancel: () => {}, pause: () => {}, resume: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
  });
  // Lesson 2 (no cake rounds): its first question is a tap question.
  await page.addInitScript(() => localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: ['equal-parts'], starsByMission: {}, reviewQueue: [], learning: { 'equal-parts': { completedAt: Date.now() } }, assessments: [] })));
  await openAsGuest(page);
  // Sound starts on; turn it on only if this device saved it as off.
  const soundToggle = page.getByTestId('button-toggle-sound');
  if (await soundToggle.getAttribute('aria-label') === 'Turn sound on') await soundToggle.click();
  await expect(soundToggle).toHaveAttribute('aria-label', 'Turn sound off');
  const mission = MISSIONS[1];
  // Lesson 2 teaches its first idea on Learn pages; its first question is that idea's first practice.
  const firstStep = ideaSteps(mission.id)[0]?.item;
  const question = firstStep && 'question' in firstStep ? ideaQuestion(mission, firstStep.question)! : mission.questions[0];
  await page.getByTestId('button-continue-course').or(page.getByTestId('button-jump-current')).first().click();
  await passStory(page);
  if (await page.getByTestId(`button-start-mission-${mission.id}`).count()) await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  if (lessonIdeas(mission.id)) {
    await expect(page.getByTestId('idea-learn-screen')).toBeVisible();
    for (let p = 1; p < lessonIdeas(mission.id)![0]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
    await page.getByTestId('button-idea-practise').click();
  } else await expect(page.getByTestId('lesson-example')).toBeVisible();
  const wrong = (question.correctChoice + 1) % question.choices.length;
  await page.getByTestId(`button-answer-${question.id}-${wrong}`).click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.locator('[data-testid="status-feedback"] .fq-hoot')).toBeVisible();
  // "Count with me": numbers pop onto the parts of the picture.
  await expect(page.getByTestId('question-model-area').locator('.fq-count-badge').first()).toBeAttached();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(' | '))).toMatch(/Good try|Almost|look together|Keep going|Nice effort/);
  await page.getByTestId('button-try-again').click();
  await expect(page.getByTestId(`button-answer-${question.id}-${wrong}`)).toBeDisabled();
});

test('in a lesson, a wrong build or worksheet answer reads its reason aloud', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-natural-voice', 'off');
    const spoken: string[] = [];
    (window as unknown as { __spoken: string[] }).__spoken = spoken;
    class FakeUtterance { text: string; voice = null; lang = ''; rate = 1; pitch = 1; volume = 1; onend: (() => void) | null = null; onerror: (() => void) | null = null; constructor(text: string) { this.text = text; } }
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      speaking: false, pending: false, paused: false,
      getVoices: () => [{ name: 'Test voice', lang: 'en-US', default: true, localService: true, voiceURI: 'test' }],
      speak: (u: FakeUtterance) => { if (u.text.trim()) spoken.push(u.text); setTimeout(() => u.onend?.(), 10); },
      cancel: () => {}, pause: () => {}, resume: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    } });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { value: FakeUtterance, configurable: true });
  });
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  await page.addInitScript((progress) => localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress)), progressBefore(mission));
  await openAsGuest(page);
  const soundToggle = page.getByTestId('button-toggle-sound');
  if (await soundToggle.getAttribute('aria-label') === 'Turn sound on') await soundToggle.click();
  await expect(soundToggle).toHaveAttribute('aria-label', 'Turn sound off');
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  // Read sentence by sentence: join them back into one string.
  const spoken = () => page.evaluate(() => (window as unknown as { __spoken: string[] }).__spoken.join(' '));
  // completeBuilds checks a wrong reason first on the first build.
  await completeBuilds(page, mission.id);
  await expect.poll(spoken).toContain(BUILD_ERROR_HEADINGS[0]);
  const problem = getWorksheet(mission.id).find((row) => !row.modelRequired && !row.areaTask)!;
  await enterWorksheetAnswer(page, problem, wrongTileAnswer(problem));
  await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Not yet.');
  await expect.poll(spoken).toContain(`Not yet. ${problem.hint}`);
});

test('inside the Expo iPhone app, answer and result haptics work with sound off, and printing uses the native print sheet', async ({ page }) => {
  await page.addInitScript(() => {
    const sent: string[] = [];
    (window as unknown as { __shell: string[] }).__shell = sent;
    (window as unknown as { ReactNativeWebView: unknown }).ReactNativeWebView = { postMessage: (m: string) => sent.push(m) };
    (window as Window & { __printCalls?: number }).__printCalls = 0;
    window.print = () => { (window as Window & { __printCalls?: number }).__printCalls! += 1; };
  });
  const messages = () => page.evaluate(() => (window as unknown as { __shell: string[] }).__shell.map((m) => JSON.parse(m) as { type: string; cue?: string; html?: string }));
  // A right answer in lesson 2's first question: a haptic tap.
  await page.addInitScript(() => localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: ['equal-parts'], starsByMission: {}, reviewQueue: [], learning: { 'equal-parts': { completedAt: Date.now() } }, assessments: [] })));
  await openAsGuest(page);
  const mission = MISSIONS[1];
  // Lesson 2 teaches its first idea on Learn pages; its first question is that idea's first practice.
  const firstStep = ideaSteps(mission.id)[0]?.item;
  const question = firstStep && 'question' in firstStep ? ideaQuestion(mission, firstStep.question)! : mission.questions[0];
  await page.getByTestId('button-continue-course').or(page.getByTestId('button-jump-current')).first().click();
  await passStory(page);
  if (await page.getByTestId(`button-start-mission-${mission.id}`).count()) await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  if (lessonIdeas(mission.id)) {
    await expect(page.getByTestId('idea-learn-screen')).toBeVisible();
    for (let p = 1; p < lessonIdeas(mission.id)![0]!.learn.length; p++) await page.getByTestId('button-teach-step-next').click();
    await page.getByTestId('button-idea-practise').click();
  } else if (await page.getByTestId('button-start-practice').count()) await page.getByTestId('button-start-practice').click();
  await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
  await expect.poll(async () => (await messages()).some((m) => m.type === 'haptic' && m.cue === 'selection')).toBe(true);
  const selectionCues = (await messages()).filter((message) => message.type === 'haptic' && message.cue === 'selection').length;
  await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
  await expect.poll(async () => (await messages()).filter((message) => message.type === 'haptic' && message.cue === 'selection').length).toBe(selectionCues);
  await page.getByTestId('button-check-answer').click();
  await expect.poll(async () => (await messages()).some((m) => m.type === 'haptic' && m.cue === 'correct')).toBe(true);
  // Printing the progress report hands the page to the native print sheet (not the web view's print, which does nothing).
  await page.getByTestId('button-back-map').click();
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByRole('textbox').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByTestId('button-parent-print').click();
  await expect.poll(async () => (await messages()).find((m) => m.type === 'print')?.html ?? '').toMatch(/<base href=.*parent-report|<base href=[\s\S]*data-testid="parent-report"/);
  expect(await page.evaluate(() => (window as Window & { __printCalls?: number }).__printCalls)).toBe(0);
});

test('Frog Hop: a splash hops back, the best route lands with 3 flies, and Next moves through all six ponds', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-frog').click();
  const pond = page.getByTestId('frog-pond');
  // Reads the pond, then finds the fewest hops with the same rule as the game (hops always go toward the goal).
  const bestRoute = async () => {
    const goal = Number(await pond.getAttribute('data-goal'));
    const d = Number(await pond.getAttribute('data-denominator'));
    const end = d * Number(await pond.getAttribute('data-wholes'));
    const cards = await page.locator('[data-testid^="button-frog-card-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-card')!));
    const steps = cards.map((card) => { const [n, den] = card.split('/').map(Number); return (n * d) / den; });
    const queue: { at: number; path: number[] }[] = [{ at: 0, path: [] }];
    const seen = new Set([0]);
    while (queue.length) {
      const { at, path } = queue.shift()!;
      for (const [index, size] of steps.entries()) {
        const to = Math.max(0, Math.min(end, at + (at <= goal ? size : -size)));
        if (to === goal) return [...path, index];
        if (!seen.has(to)) { seen.add(to); queue.push({ at: to, path: [...path, index] }); }
      }
    }
    throw new Error('no route');
  };
  for (let round = 0; round < 6; round++) {
    if (round === 0) {
      // Too big a jump first: the largest card always overshoots a goal that is not one hop away... unless it lands short.
      await page.getByTestId('button-frog-card-0').click();
      await page.getByTestId('button-frog-hop').click();
      await expect(page.getByTestId('status-frog-feedback')).toContainText(/Splash|The frog is at|You landed/);
      if (await page.getByTestId('button-frog-next').count()) { await page.getByTestId('button-frog-next').click(); continue; }
      // Start this pond over with the planned route so it scores 3 flies.
      await page.getByTestId('button-frog-replay').click();
    }
    for (const index of await bestRoute()) {
      await page.getByTestId(`button-frog-card-${index}`).click();
      await page.getByTestId('button-frog-hop').click();
    }
    await expect(page.getByTestId('status-frog-feedback')).toContainText('You landed');
    await expect(page.getByTestId('status-frog-round-flies')).toHaveAttribute('aria-label', /^3 (fire)?flies$/);
    await page.getByTestId('button-frog-next').click();
  }
  await expect(page.getByTestId('status-frog-done')).toContainText(/You caught 18 of 18 (fire)?flies/);
});

test('Fraction War gives a clear retry hint after a wrong comparison', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-war').click();

  const [left, right] = WAR_ROUNDS[0];
  for (const [side, fraction] of [left, right].entries()) {
    await page.getByTestId(`select-war-denominator-${side}`).selectOption(String(fraction.d));
    const bar = side === 0 ? 'whole-a' : 'whole-b';
    for (let part = 1; part <= fraction.n; part += 1) {
      await page.getByTestId(`${bar}-part-${part}`).click();
    }
  }

  const comparison = compareFractions(left, right);
  const incorrectChoice = comparison > 0 ? 'right' : comparison < 0 ? 'left' : 'left';
  await page.getByTestId(`button-war-choice-${incorrectChoice}`).click();
  await page.getByTestId('button-war-check').click();

  const feedback = page.getByTestId('status-war-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toHaveClass(/retry/);
  await expect(feedback).toContainText(warHint(left, right));
  await expect(page.getByTestId('status-war-score')).toContainText('0');
});

test('Fraction Line-Up: order same-numerator fractions, miss once with a hint, then finish with Next', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-lineup').click();
  await page.getByTestId('button-lineup-mode-same-numerator').click();
  const value = (text: string) => { const [n, d] = text.split('/').map(Number); return n / d; };
  for (let round = 0; round < 6; round++) {
    const heading = await page.locator('#lineup-title').innerText();
    const smallestFirst = /smallest first/i.test(heading);
    if (round === 0) {
      // A first check of the shuffled cards is never right: the hint explains the rule without naming an answer.
      await page.getByTestId('button-lineup-check').click();
      await expect(page.getByTestId('status-lineup-feedback')).toContainText('Same numerator');
    }
    // Sort with the arrow buttons (bubble sort: always a valid, explicit move).
    for (let pass = 0; pass < 4; pass++) {
      for (let i = 0; i < 3; i++) {
        const a = value((await page.getByTestId(`lineup-card-${i}`).getAttribute('data-fraction'))!);
        const b = value((await page.getByTestId(`lineup-card-${i + 1}`).getAttribute('data-fraction'))!);
        if (smallestFirst ? a > b : a < b) await page.getByTestId(`button-lineup-down-${i}`).click();
      }
    }
    await page.getByTestId('button-lineup-check').click();
    await expect(page.getByTestId('status-lineup-feedback')).toContainText('Yes!');
    await page.getByTestId('button-lineup-next').click();
  }
  await expect(page.getByTestId('status-lineup-done')).toContainText('5 were right on the first try');
});

test('Fraction Line-Up: a card follows the drag and drops into the slot where it is let go', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-lineup').click();
  await page.getByTestId('button-lineup-mode-same-denominator').click();
  const order = () => page.locator('[data-testid^="lineup-card-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-fraction')));
  const before = await order();
  const from = (await page.getByTestId('lineup-card-0').boundingBox())!;
  const to = (await page.getByTestId('lineup-card-2').boundingBox())!;
  // Grab the card on its fraction (not the arrow buttons) and drag it down slowly.
  const x = from.x + 60;
  await page.mouse.move(x, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, to.y + to.height / 2, { steps: 12 });
  // Mid-drag the card follows the pointer, but the order has not changed yet.
  expect(await order()).toEqual(before);
  const moving = (await page.getByTestId('lineup-card-0').boundingBox())!;
  expect(moving.y).toBeGreaterThan(to.y - 10);
  await page.mouse.up();
  await expect.poll(order).toEqual([before[1], before[2], before[0], before[3]]);
  // A tap without moving changes nothing.
  const after = await order();
  await page.getByTestId('lineup-card-1').click({ position: { x: 60, y: 20 } });
  expect(await order()).toEqual(after);
});

test('a wrong unit-challenge answer gives a hint, allows a retry, and earns no points', async ({ page }) => {
  const unitMissions = MISSIONS.filter((mission) => mission.unit === 1);
  const completedAt = Date.now();
  const progress = {
    completedMissionIds: unitMissions.map((mission) => mission.id),
    starsByMission: {},
    reviewQueue: [],
    learning: Object.fromEntries(unitMissions.map((mission) => [
      mission.id,
      { ...masteredRecord(mission.id), completedAt },
    ])),
    assessments: [],
  };
  await page.addInitScript((value) => localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(value)), progress);
  await openAsGuest(page);
  await page.getByTestId('button-challenge-unit-1').click();

  const question = CHALLENGES[1][0];
  const wrong = question.correct === 0 ? 1 : 0;
  const savedProgress = await localStorageSnapshot(page);
  await page.getByTestId(`button-challenge-${question.id}-${String.fromCharCode(65 + wrong)}`).click();
  await page.getByTestId('button-challenge-check').click();

  const feedback = page.getByTestId('status-challenge-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toContainText('Compare the amounts in the choices, then try again.');
  await expect(page.getByTestId('status-challenge-points')).toHaveText('0 pts');
  await expect(page.getByRole('progressbar', { name: 'Challenge question 1 of 6' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByTestId(`button-challenge-${question.id}-${String.fromCharCode(65 + wrong)}`)).toBeDisabled();
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await page.getByTestId('button-challenge-retry').click();
  const secondWrong = (question.correct + 2) % question.choices.length;
  await page.getByTestId(`button-challenge-${question.id}-${String.fromCharCode(65 + secondWrong)}`).click();
  await page.getByTestId('button-challenge-check').click();
  await expect(page.getByTestId('status-challenge-feedback')).toContainText(`The answer is ${String.fromCharCode(65 + question.correct)}.`);
  await expect(page.getByTestId('status-challenge-points')).toHaveText('0 pts');
  await page.getByTestId('button-challenge-next').click();

  for (const item of CHALLENGES[1].slice(1, 3)) {
    await page.getByTestId(`button-challenge-${item.id}-${String.fromCharCode(65 + item.correct)}`).click();
    await page.getByTestId('button-challenge-check').click();
    await expect(page.getByTestId('status-challenge-feedback')).toContainText(item.explanation.replaceAll('/', ''));
    await page.getByTestId('button-challenge-next').click();
  }

  const guidedQuestion = CHALLENGES[1][3];
  await expect(page.getByTestId('button-walkthrough')).toBeVisible();
  await page.getByTestId('button-walkthrough').click();
  const step = guidedQuestion.steps![0];
  const wrongStepChoice = (step.correct + 1) % step.choices.length;
  const scoreBeforeStepMiss = await page.getByTestId('status-challenge-points').textContent();
  await page.getByTestId(`button-step-1-${wrongStepChoice}`).click();
  await expect(page.locator('.fq-walk-retry')).toHaveAttribute('role', 'status');
  await expect(page.locator('.fq-walk-retry')).toContainText('Read the step again and count carefully.');
  await expect(page.getByTestId('status-challenge-points')).toHaveText(scoreBeforeStepMiss!);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
  await page.getByTestId(`button-step-1-${step.correct}`).click();
  await page.getByTestId('button-step-next').click();
  await expect(page.getByTestId('section-walkthrough')).toContainText('step 2 of');
  await expect(page.getByTestId('status-challenge-points')).toHaveText(scoreBeforeStepMiss!);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('a wrong Fraction Race answer explains the miss, stalls without scoring, then moves to the next question', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.123; });
  await openAsGuest(page);
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  const firstQuestion = generateQuestions(mission.id, mission.questions.map((question) => question.id), 123000001, 40)[0];
  const savedProgress = await localStorageSnapshot(page);
  const node = page.getByTestId(`button-node-${mission.id}`);
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId(`button-race-${mission.id}`).click();
  await page.getByTestId('button-race-robot-1').click();
  await expect(page.getByTestId('race-live')).toBeVisible();
  await expect(page.locator('.fq-race-q')).toContainText(firstQuestion.prompt);

  const wrong = (firstQuestion.correctChoice + 1) % firstQuestion.choices.length;
  await page.getByTestId(`race-you-choice-${wrong}`).click();
  const feedback = page.getByTestId('race-you-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toContainText(firstQuestion.retryFeedback);
  await expect(feedback).toContainText('The answer is');
  await expect(feedback).toContainText('Back one space');
  await expect(page.getByRole('progressbar', { name: 'You progress' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.locator('.fq-race-lane').first()).toContainText('0 of 10');
  await expect(page.getByTestId(`race-you-choice-${wrong}`)).toBeDisabled();
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await expect(page.locator('.fq-race-q')).not.toContainText(firstQuestion.prompt, { timeout: 4000 });
  await expect(page.locator('.fq-response-sequence').first()).toContainText('Question 2 of 10');
  await expect(page.getByRole('progressbar', { name: 'You progress' })).toHaveAttribute('aria-valuenow', '0');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('a wrong number-line placement explains how to retry without changing the target', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-number-line').click();
  const savedProgress = await localStorageSnapshot(page);

  await page.getByTestId('select-line-spaces').selectOption('4');
  await page.getByTestId('button-line-tick-2').click();
  const feedback = page.getByTestId('status-line-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toHaveClass(/retry/);
  await expect(feedback).toContainText('Count equal jumps from 0, then try again.');
  await expect(page.getByTestId('status-line-round')).toHaveText('Target 1');
  await expect(page.getByTestId('button-line-tick-2')).toHaveAttribute('aria-pressed', 'true');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await page.getByTestId('button-line-tick-3').click();
  await expect(page.getByTestId('status-line-feedback')).toHaveClass(/success/);
  await expect(page.getByTestId('status-line-feedback')).toContainText('You found it');
  await expect(page.getByTestId('status-line-round')).toHaveText('Target 1');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('a wrong equivalence match explains what to compare and does not count as a pair', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-match').click();
  const savedProgress = await localStorageSnapshot(page);

  await page.getByTestId('button-match-card-0').click();
  await page.getByTestId('button-match-card-1').click();
  const feedback = page.getByTestId('status-match-feedback');
  await expect(feedback).toBeVisible();
  await expect(feedback).toHaveAttribute('role', 'status');
  await expect(feedback).toHaveClass(/retry/);
  await expect(feedback).toContainText('Compare the shaded lengths, then try another pair.');
  await expect(page.getByTestId('status-match-score')).toHaveText('Pairs found · 0/3');
  await expect(page.getByTestId('button-match-card-0')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('button-match-card-1')).toHaveAttribute('aria-pressed', 'true');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await expect(page.getByTestId('button-match-card-0')).toBeEnabled({ timeout: 2500 });
  await page.getByTestId('button-match-card-0').click();
  await page.getByTestId('button-match-card-3').click();
  await expect(page.getByTestId('status-match-score')).toHaveText('Pairs found · 1/3');
  await expect(page.getByTestId('status-match-feedback')).toHaveClass(/success/);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('a wrong Code Quest run gives a next step and does not pass the level until corrected', async ({ page }) => {
  await openAsGuest(page);
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  const target = getCodeLevels(mission.id)[0].target;
  const savedProgress = await localStorageSnapshot(page);
  const node = page.getByTestId(`button-node-${mission.id}`);
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId(`button-code-${mission.id}`).click();
  await page.getByTestId('button-code-run').click();

  const result = page.getByTestId('code-result');
  await expect(result).toHaveClass(/miss/);
  await expect(result).toContainText('One number block is blank. Fill it in, then run the robot again.');
  await expect(page.getByTestId('text-code-hint')).toContainText('One number block is blank');
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('0 of 6');
  await expect(page.getByTestId('button-code-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await fillProgramNumbers(page, target);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/win/, { timeout: 10_000 });
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('1 of 6');
  await expect(page.getByTestId('button-code-next')).toBeVisible();

  const levels = getCodeLevels(mission.id);
  await page.getByTestId('button-code-next').click();
  await page.getByTestId('button-code-add-split').click();
  await page.getByTestId('button-code-add-repeat').click();
  await fillProgramNumbers(page, levels[1].target);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/win/, { timeout: 10_000 });
  await expect(page.getByTestId('button-code-next')).toBeVisible();
  await page.getByTestId('button-code-next').click();
  const beforeDebugMiss = await localStorageSnapshot(page);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/miss/, { timeout: 10_000 });
  await expect(page.getByTestId('text-code-hint')).toContainText(/Hint: .*(Check|Move|Change|Add)/i);
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('2 of 6');
  await expect(page.getByTestId('button-code-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(beforeDebugMiss);
  await fillProgramNumbers(page, levels[2].target);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/win/, { timeout: 10_000 });
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('3 of 6');
  await page.getByTestId('button-code-next').click();

  const beforePredictionMiss = await localStorageSnapshot(page);
  const predictionTarget = levels[3].target;
  await enterTileNumber(page, 'code-prediction', 'num', predictionTarget.n);
  await enterTileNumber(page, 'code-prediction', 'den', predictionTarget.d + 1);
  await page.getByTestId('button-code-run').click();
  await expect(result).toHaveClass(/miss/);
  await expect(result).toContainText('Not yet. Read the split number and count how many times the loop runs, then try again.');
  await expect(page.getByTestId('status-code-mission-progress')).toContainText('3 of 6');
  await expect(page.getByTestId('button-code-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(beforePredictionMiss);
});

test('a wrong Code Sprint run explains the fix, adds its penalty, and can be retried', async ({ page }) => {
  await page.addInitScript(() => { Math.random = () => 0.123; });
  await openAsGuest(page);
  const mission = MISSIONS.find((item) => item.id === 'equal-parts')!;
  const rounds = makeSprint(mission.id, () => 0.123);
  const target = rounds[0].target;
  const node = page.getByTestId(`button-node-${mission.id}`);
  if ((await node.getAttribute('aria-expanded')) !== 'true') await node.click({ force: true });
  await page.getByTestId(`button-race-${mission.id}`).click();
  await page.getByTestId('button-race-sprint').click();
  await page.getByTestId('button-sprint-start').click();
  const savedProgress = await localStorageSnapshot(page);

  await page.getByTestId('button-sprint-run').click();
  const message = page.getByTestId('text-sprint-message');
  await expect(message).toBeVisible();
  await expect(message).toHaveAttribute('role', 'status');
  await expect(message).toContainText('A block is missing a number.');
  await expect(message).toContainText('+5 s. Fix it and run again.');
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+5)');
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 1 of 5');
  await expect(page.getByTestId('button-sprint-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);

  await fillProgramNumbers(page, target);
  await page.getByTestId('button-sprint-run').click();
  await expect(message).toContainText('It works!', { timeout: 10_000 });
  await expect(page.getByTestId('button-sprint-next')).toBeVisible();
  await page.getByTestId('button-sprint-next').click();
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 2 of 5');
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+5)');

  await fillProgramNumbers(page, rounds[1].target);
  await page.getByTestId('button-sprint-run').click();
  await expect(message).toContainText('It works!', { timeout: 10_000 });
  await page.getByTestId('button-sprint-next').click();
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 3 of 5');

  await page.getByTestId('button-sprint-run').click();
  await expect(message).toContainText('+5 s. Fix it and run again.', { timeout: 10_000 });
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+10)');
  await fillProgramNumbers(page, rounds[2].target);
  await page.getByTestId('button-sprint-run').click();
  await expect(message).toContainText('It works!', { timeout: 10_000 });
  await page.getByTestId('button-sprint-next').click();
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 4 of 5');

  await page.getByTestId('button-sprint-read-wrong-0').click();
  await expect(message).toContainText('That one makes the robot');
  await expect(message).toContainText('+5 s.');
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+15)');
  await expect(page.getByTestId('button-sprint-next')).toHaveCount(0);
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
  await page.getByTestId('button-sprint-read-right').click();
  await expect(message).toContainText('Yes! That program works.');
  await expect(page.getByTestId('button-sprint-next')).toBeVisible();
  await expect(page.getByTestId('text-sprint-clock')).toContainText('(+15)');
  await page.getByTestId('button-sprint-next').click();
  await expect(page.locator('.fq-code-level-title').last()).toContainText('Program 5 of 5');
  expect(await localStorageSnapshot(page)).toBe(savedProgress);
});

test('Stack the Tower: a wrong gap wobbles with a hint, three wobbles topple it, and Next builds all six towers', async ({ page }) => {
  await openAsGuest(page);
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-tower').click();
  const value = (text: string) => { const [n, d] = text.split('/').map(Number); return n / d; };
  const correctGap = async () => {
    const incoming = value((await page.getByTestId('tower-incoming').getAttribute('data-fraction'))!);
    const placed = await page.locator('[data-testid^="tower-block-"]').evaluateAll((els) => els.map((el) => el.getAttribute('data-fraction')!));
    return { gap: placed.filter((fraction) => value(fraction) > incoming).length, gaps: placed.length + 1 };
  };
  const placeAt = async (gap: number) => {
    await page.getByTestId(`button-tower-gap-${gap}`).click();
    await page.getByTestId('button-tower-place').click();
  };
  for (let round = 0; round < 6; round++) {
    await expect(page.getByTestId('tower-block-0')).toBeVisible();
    if (round === 0) {
      // Place is disabled until a gap is chosen; a wrong gap wobbles and the hint never names the gap.
      await expect(page.getByTestId('button-tower-place')).toBeDisabled();
      const { gap, gaps } = await correctGap();
      await placeAt(gap === 0 ? gaps - 1 : 0);
      await expect(page.getByTestId('status-tower-feedback')).toContainText('Wobble!');
      await expect(page.getByTestId('status-tower-feedback')).not.toContainText(/bottom|top|between|gap/i);
    }
    if (round === 1) {
      for (let wobble = 0; wobble < 3; wobble++) {
        const { gap, gaps } = await correctGap();
        await placeAt(gap === 0 ? gaps - 1 : 0);
      }
      await expect(page.getByTestId('status-tower-feedback')).toContainText('toppled');
      await expect(page.getByTestId('button-tower-place')).toHaveCount(0);
      await page.getByTestId('button-tower-retry').click();
      await expect(page.getByText('Wobbles 0 of 3')).toBeVisible();
    }
    while (await page.getByTestId('tower-incoming').count()) {
      await placeAt((await correctGap()).gap);
    }
    await expect(page.getByTestId('status-tower-feedback')).toContainText('Tower built!');
    await expect(page.getByTestId('status-tower-round-stars')).toHaveAttribute('aria-label', round === 0 ? '2 stars' : '3 stars');
    await page.getByTestId('button-tower-next').click();
  }
  await expect(page.getByTestId('status-tower-done')).toContainText('You earned 17 of 18 stars');
});

test('Halloween: the night map, costumes earned by finishing lessons, candy points, a swamp Frog Hop, and a grown-up off switch', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date(2026, 9, 20, 10, 0, 0));
  const mission = MISSIONS.find((item) => item.id === 'sets-nonunit')!;
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 40, sound: false, breakPreferences: { intervalMinutes: 0, quietMode: false }, seasonLessons: { 'halloween-2026': ['equal-parts', 'unit-fractions'] } }));
  }, progressBefore(mission));
  await openAsGuest(page);

  // The map: banner with progress to the first costume, and Numi in a witch hat.
  const banner = page.getByTestId('season-banner');
  await expect(banner).toContainText('Spooky fraction night');
  await expect(banner).toContainText("Finish 1 more lesson to unlock Numi's bat wings.");
  await expect(banner.locator('svg.fq-mascot')).toHaveAttribute('data-costume', 'witch-hat');
  await expect(page.getByTestId('status-xp')).toContainText('40');
  await expect(page.locator('html')).toHaveAttribute('data-fq-season', 'halloween');

  // Finishing a lesson earns the bat wings.
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await completeBuilds(page, mission.id);
  for (const problem of getWorksheet(mission.id)) {
    await buildWorksheetModel(page, problem);
    await enterWorksheetAnswer(page, problem, problem.answer);
    await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Correct!');
  }
  await page.getByTestId('button-lab-finish').click();
  await expect(page.getByTestId('status-mission-complete')).toContainText('Spooky good!');
  const reward = page.getByTestId('season-reward');
  await expect(reward).toContainText('Costume unlocked');
  await expect(reward).toContainText("Numi's bat wings");
  await expect(reward).toContainText('2 more lessons for the glow-in-the-dark hat.');
  await expect(page.locator('.fq-reward-mascot svg.fq-mascot')).toHaveAttribute('data-costume', 'witch-hat bat-wings');
  await page.getByTestId('button-return-map').click();
  await expect(page.getByTestId('season-banner')).toContainText('Finish 2 more lessons to unlock the glow-in-the-dark hat.');

  // Frog Hop is a moonlit swamp with fireflies.
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-frog').click();
  await expect(page.getByTestId('frog-pond')).toHaveClass(/is-halloween/);
  await expect(page.getByTestId('status-frog-flies')).toContainText('Fireflies');

  // A grown-up can turn seasonal themes off; lessons and points stay the same.
  await page.goto('/');
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await openSettings(page, 'Reading and display');
  await page.getByTestId('checkbox-seasonal-themes').uncheck();
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await expect(page.getByTestId('season-banner')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-fq-season', 'halloween');
  await expect(page.getByTestId('status-xp')).toContainText('XP');
});

test('Christmas: a snowy map, a Santa hat and scarf, candy canes, story props, a frozen Frog Hop, and the same lessons', async ({ page }) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date(2026, 11, 10, 10, 0, 0));
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 25, sound: false, breakPreferences: { intervalMinutes: 0, quietMode: false }, seasonLessons: { 'christmas-2026': ['equal-parts', 'unit-fractions', 'unit-size'] } }));
  });
  await openAsGuest(page);

  // The map: a snowy night, Numi in a Santa hat and the scarf earned after 3 lessons, candy cane points.
  await expect(page.locator('html')).toHaveAttribute('data-fq-season', 'christmas');
  const banner = page.getByTestId('season-banner');
  await expect(banner).toContainText('Christmas');
  await expect(banner).toContainText('Snowy fraction nights');
  await expect(banner).toContainText('Finish 2 more lessons to unlock the twinkling Santa hat.');
  await expect(banner.locator('svg.fq-mascot')).toHaveAttribute('data-costume', 'santa-hat scarf');
  await expect(page.locator('.fq-stat-xp .fq-candy-cane')).toBeVisible();

  // Story text uses the Christmas props.
  await page.getByTestId(`button-start-mission-${MISSIONS[0].id}`).click();
  await showWholeComic(page);
  await expect(page.getByTestId('story-panel-0')).toContainText('The Fraction Festival is one week away!');
  await page.getByTestId('button-story-go').click();
  await showWholeComic(page);
  await expect(page.getByTestId('story-panel-0')).toContainText('I cut the festival Christmas cake for all 4 of us.');
  await page.getByTestId('button-story-back').click();

  // Frog Hop is a frozen pond with snowflakes.
  await openMenuItem(page, 'button-open-concept-games');
  await page.getByTestId('link-game-frog').click();
  await expect(page.getByTestId('frog-pond')).toHaveClass(/is-christmas/);
  await expect(page.getByTestId('status-frog-flies')).toContainText('Snowflakes');
});

test('Story quest: the Whole Stone prologue, a chapter choice, scenes and cliffhangers, stone pieces and clues, cards, and a grown-up off switch', async ({ page }) => {
  test.setTimeout(150_000);
  // Outside a seasonal theme, so the story friend (not the holiday line) speaks on questions.
  await page.clock.setFixedTime(new Date(2026, 2, 10, 10, 0, 0));
  await openAsGuest(page);

  // The map shows the quest: the stone (0 of 15) and a Storybook button, then chapter 1 leads the first unit with
  // its friend, its hook and the one next step. There is no separate "Start your first lesson" card.
  const banner = page.getByTestId('stone-banner');
  await expect(banner).toContainText('0 of 15');
  await expect(banner.getByTestId('button-open-storybook')).toBeVisible();
  const chapterOne = page.getByTestId('chapter-banner-1');
  await expect(chapterOne).toContainText('Chapter 1 · with Chomp');
  await expect(chapterOne.getByRole('heading', { name: 'The bakery mix-up' })).toBeVisible();
  await expect(chapterOne).toContainText(`0 of ${MISSIONS.filter((mission) => mission.unit === 1).length} lessons`);
  await expect(page.getByTestId('stone-teaser')).toContainText('The Whole Stone just cracked.');
  await expect(page.getByTestId('button-map-prologue')).toContainText('Watch the prologue');
  await expect(page.getByTestId(`button-start-mission-${MISSIONS[0].id}`)).toContainText('Start lesson');
  await expect(page.getByTestId('chapter-banner-2')).toContainText('Finish chapter 1 to open this chapter');
  await expect(page.getByTestId(`badge-story-${MISSIONS[0].id}`)).toContainText('New story');
  await expect(page.getByTestId('developer-module-test')).toHaveCount(0);

  // The Storybook: the prologue can be watched any time, chapter 1's start is new, later chapters are locked, and
  // the clue notebook is empty.
  await banner.getByTestId('button-open-storybook').click();
  // Three sections: the beginning (the prologue on its own), the chapters from chapter 1, and the end.
  await expect(page.getByTestId('storybook-story').locator('h3')).toHaveText(['The beginning', 'Chapters', 'The end']);
  await expect(page.getByTestId('storybook-section-beginning').getByTestId('button-storybook-prologue')).toBeVisible();
  await expect(page.getByTestId('storybook-section-chapters').locator('[data-testid^="storybook-chapter-"]').first()).toHaveAttribute('data-testid', 'storybook-chapter-1');
  await expect(page.getByTestId('storybook-section-end').getByTestId('storybook-finale')).toBeVisible();
  const prologueRow = page.getByTestId('button-storybook-prologue');
  await expect(prologueRow).toBeEnabled();
  await expect(prologueRow).toContainText('Watch it now');
  // Watching it here returns to the Storybook and doesn't count as seen: the first lesson still plays it.
  await prologueRow.click();
  await showWholeComic(page);
  await expect(page.getByTestId('button-story-go')).toContainText('Back to the Storybook');
  await page.getByTestId('button-story-go').click();
  await expect(prologueRow).toContainText('Watch it now');
  await expect(page.getByTestId(`button-storybook-part-${MISSIONS[0].id}`)).toContainText('New');
  await expect(page.getByTestId('storybook-chapter-2')).toContainText('Pip’s pond party');
  await expect(page.getByTestId('storybook-finale')).toContainText('Find all 15 pieces');
  await page.getByTestId('tab-storybook-clues').click();
  await expect(page.getByTestId('clue-notebook')).toContainText('No clues yet');
  await page.getByTestId('button-storybook-back').click();

  // The first lesson opens straight into the one-time prologue comic (no extra setup screen).
  await page.getByTestId(`button-start-mission-${MISSIONS[0].id}`).click();
  await expect(page.getByTestId('story-panel-0')).toBeVisible();
  await page.getByTestId('button-story-voice').click();
  // Turning off the voice must not advance to the next panel while this panel is still typing.
  await page.waitForTimeout(1_200);
  await expect(page.getByTestId('story-panel-1')).toHaveCount(0);
  await expect(page.getByTestId('story-panel-0')).toContainText('I’m Numi, and this is Hoot. The Fraction Festival is one week away!');
  await expect(page.getByTestId('story-panel-1')).toHaveCount(0);
  await showWholeComic(page);
  await expect(page.getByTestId('story-panel-2')).toContainText('15 equal pieces');
  // Leaving before the end does not mark the prologue as seen; it appears again.
  await page.getByTestId('button-story-back').click();
  await expect(page.getByTestId('stone-banner')).toBeVisible();
  const introProgress = await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-quest-fun-v1:guest') ?? '{}').story?.prologueSeen ?? false);
  expect(introProgress).toBe(false);
  await expect(page.getByTestId('button-map-prologue')).toContainText('Watch the prologue');
  // The map's prologue card starts the same way as lesson 1 while the prologue is unseen.
  await page.getByTestId('button-map-prologue').click();
  await showWholeComic(page);
  await expect(page.getByTestId('story-panel-0')).toContainText('The Fraction Festival is one week away!');
  await expect(page.getByTestId('story-panel-0')).toContainText('I’m Numi, and this is Hoot');
  await expect(page.getByTestId('story-panel-2')).toContainText('The case snapped shut');
  await expect(page.getByTestId('story-panel-3')).toContainText('Friend, we need you!');
  await expect(page.getByTestId('button-story-go')).toContainText('I’ll help!');
  await page.getByTestId('button-story-go').click();
  await showWholeComic(page);
  await expect(page.getByTestId('story-panel-0')).toContainText('The big piece is mine!');
  await expect(page.getByTestId('story-panel-2')).toContainText('Fair shares are equal parts');
  await expect(page.getByTestId('button-story-go')).toBeDisabled();
  await page.getByTestId('button-story-choice-1').click();
  await expect(page.getByTestId('story-choice-reply')).toContainText('big muddy footprints');
  // Looking closely earns a bonus clue (helping would earn a thank-you sticker).
  await expect(page.getByTestId('story-choice-reward')).toContainText('Bonus clue added to your notebook!');
  await page.getByTestId('button-story-choice-0').click();
  await expect(page.getByTestId('story-choice-reward')).toContainText('thank-you sticker');
  await page.getByTestId('button-story-choice-1').click();
  await page.getByTestId('button-story-go').click();
  await expect(page.getByTestId('story-comic')).toHaveCount(0);
  // The lesson teaches first (idea 1's Learn page). Later, in idea 4, Chomp asks and the cast shares the cake.
  await expect(page.getByTestId('idea-learn-screen')).toBeVisible();
  const sortAt = ideaSteps('equal-parts').findIndex(({ item }) => 'handsOn' in item && item.handsOn === 'sort');
  await completeIdeas(page, MISSIONS[0], { until: sortAt });
  await page.getByTestId('button-idea-practise').click();
  // The cast shares the cake (their names are on the sharing buttons); the friend's line stays out of the practice.
  await expect(page.getByTestId('story-line')).toHaveCount(0);
  await expect(page.getByTestId('button-part-finder-share-1')).toContainText('Chomp');
  await expect(page.getByTestId('button-part-finder-share-4')).toContainText('Pip');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-quest-fun-v1:guest') ?? '{}').story);
  expect(saved).toEqual({ prologueSeen: true, choices: { '1': 1 } });

  // A later lesson: the friend's scene, the lesson and its idea. The prologue does not repeat.
  const second = MISSIONS[1];
  const seeded = progressBefore(second) as { learning: Record<string, unknown> };
  delete seeded.learning[second.id];
  await page.evaluate((progress) => localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(progress)), seeded);
  await page.goto('/');
  await expect(page.getByTestId('stone-teaser')).toContainText('Under the crumbs the stone piece glows');
  await page.getByTestId(`button-start-mission-${second.id}`).click();
  await expect(page.getByTestId('story-panel-0')).toContainText('The baker wrote fractions on the slices');
  await expect(page.getByTestId('story-panel-1')).toContainText(`Today’s lesson is ${second.title.charAt(0).toLowerCase()}`);
  await expect(page.getByTestId('story-panel-2')).toContainText(second.skill.split(' ').slice(-4).join(' '));
  await expect(page.getByTestId('story-choice')).toHaveCount(0);
  await page.getByTestId('button-story-back').click();
  // Once seen, the map's prologue card watches it again and comes back to the map.
  await expect(page.getByTestId('button-map-prologue')).toContainText('Watch again');
  await page.getByTestId('button-map-prologue').click();
  await showWholeComic(page);
  await expect(page.getByTestId('button-story-go')).toContainText('Back to map');
  await page.getByTestId('button-story-go').click();
  await expect(page.getByTestId('prologue-card')).toBeVisible();

  // Questions carry the chapter friend's short line.
  await page.getByTestId(`button-practice-more-${second.id}`).click();
  await expect(page.getByTestId('story-line')).toBeVisible();
  // After Check, the same bubble becomes the friend's reaction (words only), so the screen does not grow.
  const askLine = await page.getByTestId('story-line').textContent();
  await page.locator('[data-testid^="button-answer-"]').first().click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('story-line')).toHaveAttribute('data-result', /^(correct|retry)$/);
  await expect(page.getByTestId('story-line')).not.toHaveText(askLine!);
  await expect(page.getByTestId('story-line')).not.toContainText(/\d/);

  // Finishing chapter 2 (its last lesson is compare same numerator) returns a stone piece, adds a clue and unlocks Pip's card.
  const mission = MISSIONS.find((item) => item.id === 'compare-same-numerator')!;
  await page.evaluate((progress) => localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(progress)), progressBefore(mission));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await completeBuilds(page, mission.id);
  for (const problem of getWorksheet(mission.id)) {
    await buildWorksheetModel(page, problem);
    await enterWorksheetAnswer(page, problem, problem.answer);
    await expect(page.getByTestId(`status-worksheet-${problem.id}`)).toContainText('Correct!');
  }
  await page.getByTestId('button-lab-finish').click();
  const breakOverlay = page.getByTestId('brain-break-overlay');
  if (await breakOverlay.isVisible()) await page.getByTestId('button-break-skip').click();
  const payoff = page.getByTestId('story-payoff');
  await expect(payoff).toContainText('Best party ever! The bigger piece was hiding the stone piece!');
  // The story problem changed the story: its picture and what the answer did.
  await expect(payoff.getByTestId('story-problem-result')).toContainText('covers more, so the hungriest frog gets it. Ribbit!');
  // The stone question comes first: a miss gets a kind nudge, the right fraction shows the piece.
  await expect(payoff.getByTestId('stone-found')).toHaveCount(0);
  await expect(payoff.getByTestId('stone-question')).toContainText('How much of the Whole Stone is back?');
  await payoff.getByTestId('button-stone-choice-0').click();
  await payoff.getByTestId('button-stone-check').click();
  await expect(payoff.getByTestId('stone-question-feedback')).toContainText('Good try!');
  await payoff.getByTestId('button-stone-choice-2').click();
  await payoff.getByTestId('button-stone-check').click();
  await expect(payoff.getByTestId('stone-found')).toContainText('2 of 15');
  await expect(payoff.getByTestId('stone-new-clue')).toContainText('A big green tail by the pond');
  await expect(payoff.getByTestId('story-card-2')).toContainText('Pip the party host');
  await expect(payoff.getByTestId('story-cliff')).toContainText('Tilly calls from the hill');
  await expect(payoff.getByTestId('sticker-earned')).toContainText('New sticker!');
  await expect(payoff.getByTestId('button-open-suspects')).toHaveCount(0);
  await page.getByTestId('button-return-map').click();

  // Back on the map: 2 of 15 found, and chapter 3 leads with chapter 2's cliffhanger.
  await expect(page.getByTestId('stone-bar').first()).toHaveAttribute('data-found', '2');
  await expect(page.getByTestId('chapter-banner-3')).toContainText('Tilly’s halfway hill');
  await expect(page.getByTestId('stone-teaser')).toContainText('Tilly calls from the hill');

  // The Storybook (also in the menu) keeps the clues and the cards: finished chapters unlocked, later ones locked.
  await openMenuItem(page, 'button-open-story-cards');
  await expect(page.getByTestId('button-storybook-prologue')).toBeEnabled();
  await expect(page.getByTestId(`button-storybook-part-${MISSIONS[0].id}`)).toBeEnabled();
  await page.getByTestId('tab-storybook-clues').click();
  await expect(page.getByTestId('clue-notebook')).toContainText('A big green tail by the pond');
  await expect(page.getByTestId('clue-notebook')).toContainText('Finish chapter 3 to find the next clue.');
  await page.getByTestId('tab-storybook-cards').click();
  await expect(page.getByText('2 of 15')).toBeVisible();
  await expect(page.getByTestId('story-card-1')).toContainText('Chomp the sneaky sharer');
  await expect(page.getByTestId('story-card-3')).toContainText('Finish “Tilly’s halfway hill” to unlock this card.');
  await expect(page.getByTestId('button-read-chapter-3')).toHaveCount(0);

  // A finished chapter can be read again from its card, with the choice already made, and it goes back to the cards.
  await page.getByTestId('button-read-chapter-1').click();
  await showWholeComic(page);
  await expect(page.getByTestId('story-panel-0')).toContainText('The big piece is mine!');
  await expect(page.getByTestId('story-choice-reply')).toContainText('big muddy footprints');
  await expect(page.getByTestId('button-story-go')).toContainText('Back to the Storybook');
  await page.getByTestId('button-story-go').click();
  await expect(page.getByTestId('storybook-chapter-1')).toBeVisible();
  // The prologue can be read again too.
  await page.getByTestId('button-storybook-prologue').click();
  await showWholeComic(page);
  await expect(page.getByTestId('story-panel-0')).toContainText('The Fraction Festival is one week away!');
  await page.getByTestId('button-story-go').click();
  // A finished chapter's ending (thanks, clue, what happens next) can be read again; an unfinished one is locked.
  await page.getByTestId('storybook-chapter-2').locator('summary').click();
  await page.getByTestId('button-storybook-end-2').click();
  await expect(page.getByTestId('story-panel-0')).toContainText('Best party ever!');
  await expect(page.getByTestId('story-panel-1')).toContainText('A big green tail by the pond');
  await expect(page.getByTestId('story-panel-2')).toContainText('How the math won it: Thirds are bigger than eighths');
  await expect(page.getByTestId('story-panel-3')).toContainText('Tilly calls from the hill');
  await page.getByTestId('button-story-go').click();
  await expect(page.getByTestId('button-storybook-end-3')).toBeDisabled();
  await expect(page.getByTestId('storybook-finale')).toBeDisabled();
  await page.getByTestId('button-storybook-back').click();

  // A finished lesson's comic can be read again from the map; it returns to the map instead of starting the lesson.
  await page.getByTestId(`button-node-${mission.id}`).click();
  await page.getByTestId(`button-story-replay-${mission.id}`).click();
  await expect(page.getByTestId('story-comic')).toBeVisible();
  await showWholeComic(page);
  await expect(page.getByTestId('button-story-go')).toContainText('Back to map');
  await page.getByTestId('button-story-go').click();
  await expect(page.getByTestId('stone-banner')).toBeVisible();
  await expect(page.getByTestId(`button-story-replay-${MISSIONS.find((item) => item.unit === 3)!.id}`)).toHaveCount(0);

  // The next chapter opens with its own intro and choice.
  const next = MISSIONS.find((item) => item.unit === 3)!;
  await page.getByTestId(`button-start-mission-${next.id}`).click();
  await expect(page.getByTestId('story-introduction')).toHaveCount(0);
  // Chapter openings play as a short film; the choice comes after it.
  await showWholeComic(page);
  await expect(page.getByTestId('story-panel-0')).toContainText('I saw something shining at the top of the hill.');
  await expect(page.getByTestId('story-choice')).toBeVisible();
  await page.getByTestId('button-story-back').click();

  // A grown-up can turn story mode off: no quest banner or chapter banners, and no comics.
  await page.goto('/');
  await openMenuItem(page, 'button-open-parent');
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await openSettings(page, 'Reading and display');
  await page.getByTestId('checkbox-story-mode').uncheck();
  await page.goto('/');
  await expect(page.getByTestId('stone-banner')).toHaveCount(0);
  await expect(page.getByTestId('chapter-banner-1')).toHaveCount(0);
  await page.getByTestId(`button-start-mission-${next.id}`).click();
  await expect(page.getByTestId('story-introduction')).toHaveCount(0);
  await expect(page.getByTestId('story-comic')).toHaveCount(0);
});

test('the hint bulb always shows its help: it scrolls the hint into view, and after two misses it points to the simpler help', async ({ page }) => {
  const mission = MISSIONS.find((item) => item.id === 'benchmark-half')!;
  // The lesson opens on its first idea's Learn pages; its first practice question comes after them.
  const first = ideaSteps(mission.id)[0]!.item;
  const question = 'question' in first ? ideaQuestion(mission, first.question)! : mission.questions[0];
  expect(question.choices.length).toBeGreaterThanOrEqual(3);
  await page.setViewportSize({ width: 390, height: 844 });
  await openAsGuest(page);
  await openDeveloperLesson(page, mission);
  for (let p = 1; p < (lessonIdeas(mission.id)?.[0]?.learn.length ?? 0); p++) await page.getByTestId('button-teach-step-next').click();
  if (lessonIdeas(mission.id)) await page.getByTestId('button-idea-practise').click();

  // The bulb sits at the top of the screen; the hint opens under the question, below it.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByTestId('button-show-hint').click();
  await expect(page.getByTestId('text-question-hint')).toBeInViewport();
  // Story mode is on, so the chapter's friend (Tilly, on her hill) gives the hint.
  await expect(page.getByTestId('text-question-hint')).toContainText('Tilly’s idea:');
  await expect(page.getByTestId('text-question-hint').locator('svg').first()).toBeVisible();

  // Two misses replace the hint with "Let's make it simpler"; the bulb now brings that into view.
  const wrong = [0, 1, 2].filter((index) => index !== question.correctChoice).slice(0, 2);
  for (const choice of wrong) {
    await page.getByTestId(`button-answer-${question.id}-${choice}`).click();
    await page.getByTestId('button-check-answer').click();
    await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'retry');
    await page.getByTestId('button-try-again').click();
  }
  await expect(page.getByTestId('status-remediation')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByTestId('button-show-hint').click();
  await expect(page.getByTestId('status-remediation')).toBeInViewport();
});

test('Story mode: daily practice is Chomp’s riddles with a secret of the day, and the streak is Hoot’s lantern', async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 2, 10, 10, 0, 0));
  const question = {
    id: 'daily-bar-one-fourth', missionId: 'equal-parts', topicTitle: 'Equal parts', modelKind: 'bar',
    numerator: 1, denominator: 4, explanation: 'One of four equal parts is one fourth.', kind: 'build',
  };
  await page.addInitScript((q) => {
    if (localStorage.getItem('riddle-test-seeded')) return;
    localStorage.setItem('riddle-test-seeded', '1');
    const start = new Date(2026, 2, 10, 9, 0, 0).getTime();
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [],
      dailyPractice: { day: '2026-03-10', startedAt: start, questions: [q], index: 0, attempts: {} } }));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 30, sound: false, day: '2026-03-10', answeredToday: 2, dayStreak: 2, lastActiveDay: '2026-03-10',
      breakPreferences: { intervalMinutes: 0, quietMode: false },
      activity: { '2026-03-10': { minutes: 4, answered: 2 }, '2026-03-09': { minutes: 6, answered: 3 } } }));
  }, question);
  await openAsGuest(page);

  // The streak is Hoot's lantern.
  await page.getByTestId('button-tip-streak').click();
  await expect(page.getByTestId('button-tip-streak-tip')).toContainText('Hoot’s lantern: 2 nights in a row.');
  await page.getByTestId('button-tip-streak').click();

  // Chomp sets up each question, with words only.
  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.locator('.fq-taskbar-title')).toContainText('Daily practice · Chomp’s riddles');
  await expect(page.getByTestId('riddle-setup')).toContainText('Last riddle!');

  // Finishing earns the secret of the day and shows the lantern week.
  await page.evaluate(() => {
    const key = 'fraction-quest-progress-v1:guest';
    const progress = JSON.parse(localStorage.getItem(key) ?? '{}');
    progress.dailyPractice.completedAt = Date.now();
    localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.reload();
  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.getByTestId('riddle-secret')).toContainText('Here’s today’s secret:');
  const week = page.getByTestId('lantern-week');
  await expect(week).toContainText('Hoot’s lantern · 2 nights in a row');
  await expect(week.locator('li[data-lit="true"]')).toHaveCount(2);
  await expect(week.locator('li').last()).toContainText('Today');
});

test('the mystery is playable: picture clues, a suspect board after chapter 4, stickers, and the story remembers the guess', async ({ page }) => {
  await openAsGuest(page);
  const afterFour = MISSIONS.find((item) => item.unit === 5)!;
  await page.evaluate(({ progress }) => {
    localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(progress));
    const fun = JSON.parse(localStorage.getItem('fraction-quest-fun-v1:guest') ?? '{}');
    fun.story = { prologueSeen: true, choices: { '1': 1, '2': 0, '3': 0, '4': 1 } };
    localStorage.setItem('fraction-quest-fun-v1:guest', JSON.stringify(fun));
  }, { progress: progressBefore(afterFour) });
  await page.goto('/');

  // The town map: four places lit, the story's place glowing, and a tap opens that chapter.
  await expect(page.getByTestId('town-place-4')).toHaveAttribute('aria-label', /stone piece found/);
  await expect(page.getByTestId('town-place-5')).toHaveAttribute('aria-label', /the story is here now/);
  await expect(page.getByTestId('town-place-9')).toBeDisabled();
  await page.getByTestId('town-place-2').click();
  await expect(page.getByTestId('storybook-chapter-2')).toHaveAttribute('open', '');

  // Clues are picture cards, with bonus clues for the chapters where the child looked closely.
  await page.getByTestId('tab-storybook-clues').click();
  await expect(page.getByTestId('clue-card-1')).toContainText('Big muddy footprints');
  await expect(page.getByTestId('clue-card-1-bonus')).toContainText('Bonus clue');
  await expect(page.getByTestId('clue-card-2-bonus')).toHaveCount(0);
  await expect(page.getByTestId('button-storybook-suspects-2')).toHaveCount(0);

  // Stickers: one per finished lesson, and a thank-you sticker for helping.
  await page.getByTestId('tab-storybook-stickers').click();
  await expect(page.getByTestId('sticker-lesson-1-1')).not.toHaveClass(/is-locked/);
  await expect(page.getByTestId('sticker-thanks-2')).toContainText('Pip says thank you');
  await expect(page.getByTestId('sticker-lesson-5-1')).toHaveClass(/is-locked/);

  // The suspect board: a kind nudge for a wrong guess, a cheer for following the clues; the guess is saved.
  await page.getByTestId('tab-storybook-clues').click();
  await page.getByTestId('button-storybook-suspects-1').click();
  await expect(page.getByTestId('suspect-clues')).toContainText('Matching teeth marks');
  await page.getByTestId('button-suspect-pip').click();
  await page.getByTestId('button-suspect-guess').click();
  await expect(page.getByTestId('suspect-reply')).toContainText('Look at your clues again');
  await page.getByTestId('button-suspect-chomp').click();
  await page.getByTestId('button-suspect-guess').click();
  await expect(page.getByTestId('suspect-reply')).toContainText('Good detective work!');
  const guesses = await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-quest-fun-v1:guest') ?? '{}').story?.guesses);
  expect(guesses).toEqual({ '1': 'chomp' });
  await page.getByTestId('button-suspects-done').click();
  await expect(page.getByTestId('button-storybook-suspects-1')).toContainText('you guessed Chomp');

  // When the truth comes out in chapter 8, the story remembers the guess.
  const chapterEight = MISSIONS.find((item) => item.unit === 8)!;
  await page.evaluate((progress) => localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(progress)), progressBefore(chapterEight));
  await page.evaluate(() => {
    const fun = JSON.parse(localStorage.getItem('fraction-quest-fun-v1:guest') ?? '{}');
    const progress = JSON.parse(localStorage.getItem('fraction-quest-progress-v1:guest') ?? '{}');
    delete progress.learning[Object.keys(progress.learning).at(-1)!];
    localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(progress));
    localStorage.setItem('fraction-quest-fun-v1:guest', JSON.stringify(fun));
  });
  await page.goto('/');
  await page.getByTestId(`button-start-mission-${chapterEight.id}`).click();
  await showWholeComic(page);
  await expect(page.getByTestId('story-detective-note')).toContainText('you suspected Chomp');
});

test('a reload or the back button keeps the child’s place in a lesson’s practice', async ({ page }) => {
  test.setTimeout(120_000);
  const [first, second] = MISSIONS;
  const learning = { [first.id]: { practiceDone: true, helpUses: 0, misconceptions: {}, completedAt: Date.now(),
    checks: Object.fromEntries(getBuildChecks(first.id).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
    worksheet: Object.fromEntries(getWorksheet(first.id).map((problem) => [problem.id, { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false }])) } };
  // Seed once: a reload must keep what the app saved, not this starting point.
  await page.addInitScript((progress) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, { completedMissionIds: [first.id], starsByMission: { [first.id]: 3 }, reviewQueue: [], assessments: [], learning });
  await openAsGuest(page);
  const startSecond = async () => {
    const start = page.getByTestId(`button-start-mission-${second.id}`);
    if (!(await start.isVisible())) await page.getByTestId(`button-node-${second.id}`).click();
    await start.click();
  };
  const skipBreak = async () => {
    const skip = page.getByTestId('button-break-skip-top');
    if (await skip.isVisible().catch(() => false)) await skip.click();
  };
  await startSecond();
  await passStory(page);
  await expectLessonQuestionProgress(page, 1, 0);
  for (let choice = 0; choice < 4; choice++) {
    await skipBreak();
    await page.locator('[data-testid^="button-answer-"]').nth(choice).click();
    await page.getByTestId('button-check-answer').click();
    await skipBreak();
    if (await page.getByTestId('button-next-question').isVisible()) break;
    await page.getByTestId('button-try-again').click();
  }
  await page.getByTestId('button-next-question').click();
  await skipBreak();
  await expectLessonQuestionProgress(page, 2, 1);

  // The browser's back button returns to the map, not out of Fraction Quest.
  await page.goBack();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();

  // After a reload the lesson opens on question 2 again, past its story.
  await page.reload();
  const guest = page.getByTestId('button-play-guest');
  if (await guest.isVisible().catch(() => false)) await guest.click();
  await startSecond();
  await expectLessonQuestionProgress(page, 2, 1);
});

test('every question in every lesson fits an iPhone Safari screen: one column of answers and Check, with no scrolling', async ({ page }) => {
  test.setTimeout(900_000);
  // An iPhone in Safari shows about 664 points of page between its address bar and toolbar. The phone layout uses no
  // height queries (Safari answers those for its taller, bars-hidden view), so a 390 × 664 window is a faithful iPhone.
  const visible = 664;
  await page.setViewportSize({ width: 390, height: visible });
  await openAsGuest(page);
  const savedStorage = await localStorageSnapshot(page);
  const misfits: string[] = [];
  for (const mission of MISSIONS) {
    await openDeveloperLesson(page, mission);
    if (PART_FINDER_LESSONS.has(mission.id)) await completePartFinderLesson(page, mission.id);
    else if (mission.id === 'order-unlike-fractions') await completeFractionOrderLesson(page);
    const questions = [
      ...mission.questions.slice(0, -1),
      ...(hasGenerator(mission.id) ? getExtraPractice(mission.id, mission.questions.map((question) => question.id)).slice(0, 4) : []),
      mission.questions.at(-1)!,
    ];
    for (const [index, question] of questions.entries()) {
      const right = page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`);
      await expect(right).toBeVisible();
      await page.evaluate(() => window.scrollTo(0, 0));
      await right.click();
      await page.evaluate(() => window.scrollTo(0, 0));
      const fit = await page.evaluate((id) => {
        const box = (element: Element | null) => element?.getBoundingClientRect();
        const choices = [...document.querySelectorAll(`[data-testid^="button-answer-${id}-"]`)].map((element) => element.getBoundingClientRect());
        // Measured from the top of the lesson screen (the developer test bar above it is not on a child's screen), or
        // from the question itself when the worked example sits above it on the lesson's first screen.
        const top = (box(document.getElementById('lesson-question-title')) ?? box(document.querySelector('.fq-lesson-app')))?.top ?? 0;
        return {
          picture: box(document.querySelector('[data-testid="question-model-area"]'))?.height ?? 0,
          shrunk: Number((document.querySelector('[data-testid="question-model-area"]') as HTMLElement | null)?.style.zoom || 1) < 1,
          choices: Math.max(...choices.map((rect) => rect.bottom)) - top,
          columns: new Set(choices.map((rect) => Math.round(rect.left))).size,
          check: (box(document.querySelector('[data-testid="button-check-answer"]'))?.bottom ?? Infinity) - top,
        };
      }, question.id);
      const where = `${mission.id} question ${index + 1} (${question.id})`;
      // One column of answers, and fitting must not come from shrinking the picture away
      if (fit.columns !== 1) misfits.push(`${where}: answers are in ${fit.columns} columns`);
      // (A naturally small picture, like a row of dots, may stay small; a picture shrunk to fit stays at least 80 tall.)
      if (fit.shrunk && fit.picture < 80) misfits.push(`${where}: the picture was shrunk to only ${Math.round(fit.picture)} points tall`);
      if (fit.choices > visible + 1 || fit.check > visible + 1) {
        misfits.push(`${where}: choices end at ${Math.round(fit.choices)}, Check at ${Math.round(fit.check)}, screen ${visible}`);
      }
      await page.getByTestId('button-check-answer').click();
      await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
      const moveOn = page.getByTestId(index === questions.length - 1 ? 'button-finish-mission' : 'button-next-question');
      // After Check, the feedback and its Continue button are in view too (the page may scroll to them).
      await expect(moveOn).toBeInViewport();
      await moveOn.click();
    }
    await finishDeveloperLesson(page, savedStorage);
  }
  expect(misfits, 'questions that do not fit the iPhone screen').toEqual([]);
});

test('a Build check shows its question as a task card that scrolls with the page, and says what to show in each part', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 664 });
  const mission = MISSIONS.find(({ id }) => id === 'equal-parts')!;
  await openAsGuest(page);
  await page.evaluate((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, progressBefore(mission));
  await page.reload();
  await expectMissionStart(page, mission.id, true);
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  const check = getBuildChecks(mission.id)[0];
  const card = page.getByTestId(`check-${check.id}`);
  await skipIntros(page);
  // The question is a "Your task" card.
  const task = card.getByTestId(`task-${check.id}`);
  await expect(task).toContainText('Your task');
  await expect(task).toContainText(check.prompt.replace(/\s*\d+\/\d+.*$/, '').slice(0, 20));
  await enterModel(page, check.id, 'a', check.target);

  // Each part is its own card: Part 1 is done (its number turns into a check, with "Your bar is right." inside it,
  // not a separate "First model check" box), Part 2 is open, Part 3 waits greyed.
  await expect(card.getByTestId(`part-${check.id}-1`)).toHaveAttribute('data-state', 'done');
  await expect(card.getByTestId(`part-${check.id}-1`).getByTestId(`status-primary-${check.id}`)).toContainText(/Your (bar|number line|model) is right\./);
  await expect(card).not.toContainText('model check');
  await expect(card.getByTestId(`part-${check.id}-3`)).toHaveAttribute('data-state', 'locked');
  await expect(card.getByTestId(`part-${check.id}-3`)).toContainText('Opens when both models are right.');
  // Part 2's title names the amount (stacked), not "it" or "the same amount"; its model sits inside its card.
  const amount = `${check.target.n} over ${check.target.d}`;
  const part2 = card.getByTestId(`part-${check.id}-2`);
  await expect(part2).toHaveAttribute('data-state', 'open');
  await expect(part2.locator('h4').getByRole('math', { name: amount })).toBeVisible();
  await expect(part2.locator('h4')).not.toContainText('show it');
  await expect(part2.getByTestId(`model-${check.id}-b`)).toBeVisible();

  // The task card scrolls with the page like everything else (it used to stick to the top of the screen).
  expect(await task.evaluate((node) => getComputedStyle(node).position)).not.toBe('sticky');
});

test('once a worksheet bar matches, the answer tiles stay open, and a bar that stops matching says why', async ({ page }) => {
  test.setTimeout(90_000);
  const mission = MISSIONS.find((item) => item.id === 'fraction-names')!;
  await page.addInitScript((progress) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
  }, progressBefore(mission));
  await openAsGuest(page);
  await page.getByTestId(`button-start-mission-${mission.id}`).click();
  await passStory(page);
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await completeBuilds(page, mission.id);
  const [first, second] = getWorksheet(mission.id);
  const row = page.getByTestId(`row-worksheet-${first.id}`);
  await buildWorksheetModel(page, first);
  await row.getByTestId(`tile-ws-${first.id}-digit-1`).click();
  // One part too many: the bar no longer matches, but the tiles and the answer stay usable.
  await row.getByTestId('button-copy-part-2').click();
  await expect(row.getByTestId('status-copy-model')).toContainText('Your bar has 2 colored parts. The bar above has 1.');
  await expect(row.getByTestId(`tile-ws-${first.id}-digit-2`)).toBeEnabled();
  await expect(row.getByTestId(`button-check-worksheet-${first.id}`)).toBeEnabled();

  // "How many equal parts make one whole?": counting every part opens the tiles.
  expect(second.task?.kind).toBe('count');
  const next = page.getByTestId(`row-worksheet-${second.id}`);
  await expect(next.getByTestId(`tile-ws-${second.id}-digit-4`)).toBeDisabled();
  await buildWorksheetModel(page, second);
  await expect(next.getByTestId(`tile-ws-${second.id}-digit-4`)).toBeEnabled();
});

test('on a tablet, a review question shows its topic as a small tag above the question, not run into it', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await openAsGuest(page);
  // The review heading, drawn the way a lesson question draws it.
  await page.evaluate(() => {
    const heading = document.createElement('h1');
    heading.className = 'fq-question-text';
    heading.innerHTML = '<span class="fq-review-prefix">Quick review · Equal-area partitions</span>What fraction of the hexagon is colored?';
    const app = document.createElement('div'); app.className = 'fq-app fq-lesson-app'; app.append(heading);
    document.body.append(app);
  });
  const prefix = page.locator('.fq-review-prefix').last();
  expect(await prefix.evaluate((node) => getComputedStyle(node).display)).toBe('block');
  const tag = await prefix.evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  const title = await page.locator('h1.fq-question-text').last().evaluate((node) => parseFloat(getComputedStyle(node).fontSize));
  expect(tag).toBeLessThan(title * 0.75);
});
