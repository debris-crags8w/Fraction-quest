/* Walking a lesson in the browser tests: solving a cake round or a card-ordering round, and walking a lesson's ideas
   (each idea's Learn pages, then its 3 practices, answered right). Shared by the specs. */
import { expect, type Page } from '@playwright/test';
import { AREA_CUTS, pieceArea } from '../src/area-shapes';
import { FRACTION_ORDER_ROUNDS, fractionOrderMatches, MISSIONS, type Mission } from '../src/game';
import { ideaQuestion, ideaSteps, lessonIdeas } from '../src/lesson-ideas';
import { isPartFinderAnswer, PART_FINDER_ROUNDS, type PartFinderRound } from '../src/part-finder';
import { STORY_PROBLEMS, chapterFor } from '../src/story';

export function partFinderSolution(round: PartFinderRound): { assignment?: number[]; selected: number[]; tileCount?: number } {
  const pieces = AREA_CUTS[round.cut];
  if (round.mode === 'sort') {
    const shareCount = round.shares ?? 0;
    const target = 1 / shareCount;
    const assignment = Array<number>(pieces.length).fill(-1);
    const areas = Array.from(pieces, pieceArea);
    const totals = Array<number>(shareCount).fill(0);
    const assign = (index: number): boolean => {
      if (index === pieces.length) return totals.every((area) => Math.abs(area - target) < 1e-9);
      for (let share = 0; share < shareCount; share++) {
        if (totals[share] + areas[index] > target + 1e-9) continue;
        assignment[index] = share;
        totals[share] += areas[index];
        if (assign(index + 1)) return true;
        totals[share] -= areas[index];
        assignment[index] = -1;
      }
      return false;
    };
    if (shareCount > 0 && assign(0)) return { assignment, selected: [] };
    throw new Error(`No fair share assignment found for Part Finder round ${round.id}`);
  }

  for (let mask = 1; mask < 2 ** pieces.length; mask++) {
    const selected = pieces.map((_, index) => index).filter((index) => mask & (1 << index));
    if (round.mode === 'tile') {
      if (selected.length !== 1) continue;
      const tileCount = Math.round(1 / pieceArea(pieces[selected[0]]));
      if (isPartFinderAnswer(round, selected, tileCount)) return { selected, tileCount };
    } else if (isPartFinderAnswer(round, selected)) {
      return { selected };
    }
  }
  throw new Error(`No valid piece selection found for Part Finder round ${round.id}`);
}

export async function solvePartFinderRound(page: Page, round: PartFinderRound) {
  const solution = partFinderSolution(round);
  if (solution.assignment) {
    for (const [index, share] of solution.assignment.entries()) {
      if (share > 0) await page.getByTestId(`button-part-finder-share-${share + 1}`).click();
      const piece = page.getByTestId(`button-part-finder-piece-${index + 1}`);
      await piece.focus();
      await piece.press('Enter');
    }
  } else {
    for (const index of solution.selected) {
      const piece = page.getByTestId(`button-part-finder-piece-${index + 1}`);
      await piece.focus();
      await piece.press('Enter');
    }
    if (solution.tileCount !== undefined) {
      await page.getByTestId('slot-part-finder-tile-count-n').click();
      for (const digit of String(solution.tileCount)) {
        await page.getByTestId(`tile-part-finder-tile-count-digit-${digit}`).click();
      }
    }
  }
  await page.getByTestId('button-part-finder-check').click();
  await expect(page.getByTestId('part-finder-feedback')).toContainText('That fits!');
  await page.getByTestId('button-part-finder-next').click();
}

/** A lesson with ideas: each idea's Learn pages, then its 3 practices (questions answered right, cake rounds solved). */
export async function completeIdeas(page: Page, mission: Mission, { beforeRound, until }: { beforeRound?: () => Promise<void>; until?: number } = {}) {
  const steps = ideaSteps(mission.id);
  const ideas = lessonIdeas(mission.id)!;
  for (const [index, { idea, practice, item }] of steps.entries()) {
    if (index === until) return;
    if (practice === 0) {
      await expect(page.getByTestId('idea-kicker')).toHaveText(`Lesson ${String(MISSIONS.indexOf(mission) + 1).padStart(2, '0')} · Idea ${idea + 1} of ${ideas.length} · Learn`);
      for (let p = 0; p < ideas[idea]!.learn.length; p++) {
        await expectLearnPageFits(page, `${mission.id} idea ${idea + 1} Learn page ${p + 1}`);
        if (p < ideas[idea]!.learn.length - 1) await page.getByTestId('button-teach-step-next').click();
      }
      await page.getByTestId('button-idea-practise').click();
    }
    if (!('sortRound' in item)) await expect(page.getByTestId('idea-kicker').or(page.locator('.fq-play-kicker')).first()).toContainText(`Idea ${idea + 1} of ${ideas.length}`);
    if ('handsOn' in item) {
      await beforeRound?.();
      await solvePartFinderRound(page, PART_FINDER_ROUNDS.find((round) => round.id === item.handsOn)!);
      continue;
    }
    if ('sortRound' in item) {
      await solveSortRound(page, FRACTION_ORDER_ROUNDS.find((round) => round.id === item.sortRound)!);
      continue;
    }
    const question = ideaQuestion(mission, item.question)!;
    await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
    await page.getByTestId('button-check-answer').click();
    await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'correct');
    await page.getByTestId(index === steps.length - 1 && !hasStoryAfterIdeas(mission) ? 'button-finish-mission' : 'button-next-question').click();
  }
}

/** Story mode tells a lesson's last question as its story problem; a lesson with ideas asks it after them. */
export const hasStoryAfterIdeas = (mission: Mission) => !!STORY_PROBLEMS[mission.id] && !!chapterFor(mission.unit);


/** On a phone (390 points wide or less), a Learn page fits the screen: its line, picture and buttons, no scrolling.
    The developer test banner above the lesson is allowed for. */
export async function expectLearnPageFits(page: Page, label: string) {
  const size = page.viewportSize();
  if (!size || size.width > 430) return;
  await expect(page.getByTestId('teach-scene').or(page.getByTestId('teach-words')).first()).toBeVisible();
  const { scroll, banner } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollHeight,
    banner: document.querySelector('[data-testid="developer-test-banner"]')?.getBoundingClientRect().height ?? 0,
  }));
  expect(scroll, `${label} fits a phone`).toBeLessThanOrEqual(size.height + banner + 1);
}

/** A card-ordering round: move cards up or down until the order is right, then check and go on. */
export async function solveSortRound(page: Page, round: (typeof FRACTION_ORDER_ROUNDS)[number]) {
  const value = (label: string) => { const [n, d] = label.split('/').map(Number); return n! / d!; };
  for (let moves = 0; moves < 20; moves++) {
    const labels = await page.locator('[data-testid^="sort-card-"]').evaluateAll((items) => items.map((item) => item.getAttribute('data-fraction') ?? ''));
    const cards = labels.map((label) => { const [numerator, denominator] = label.split('/').map(Number); return { numerator: numerator!, denominator: denominator! }; });
    if (fractionOrderMatches(cards, round.direction)) break;
    const at = labels.findIndex((label, i) => i < labels.length - 1
      && (round.direction === 'ascending' ? value(label) > value(labels[i + 1]!) : value(label) < value(labels[i + 1]!)));
    await page.getByTestId(`button-sort-${labels[at]!.replace('/', '-')}-down`).click();
  }
  await page.getByTestId('button-sort-check').click();
  await expect(page.getByTestId('fraction-sort-feedback')).toContainText('That order is right!');
  await page.getByTestId('button-sort-next').click();
}
