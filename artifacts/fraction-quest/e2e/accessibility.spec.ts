import AxeBuilder from '@axe-core/playwright';
import { expect, test } from './fixtures';
import { MISSIONS } from '../src/game';
import { completeIdeas, finishPutTogether } from './lesson-walk';

type Page = import('@playwright/test').Page;

/** WCAG 2.0 and 2.1, levels A and AA: what axe can check on a rendered screen (it is not a full audit). */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Known failures, each a screen and an axe rule, that wait for a decision (a colour change, say, needs a mockup and
    approval first). The test fails on any violation that is not listed here, and also when a listed one stops
    happening, so this list can only get shorter. It is empty now: add an entry here, with a note saying why, rather
    than loosening the check. */
const KNOWN: string[] = [];

async function axeViolations(page: Page, screen: string) {
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  return violations.map((violation) => ({
    key: `${screen}: ${violation.id}`,
    detail: `${screen}: ${violation.id} (${violation.impact}) on ${violation.nodes.length} element(s), e.g. ${violation.nodes[0]?.target.join(' ')}`,
  }));
}

/** A new lesson opens with story screens (the setup and prologue once, then the chapter comic, which may ask for a choice). */
async function passStory(page: Page) {
  for (let screen = 0; screen < 3; screen++) {
    await page.waitForTimeout(50);
    const introGo = page.getByTestId('button-story-intro-go');
    if (await introGo.isVisible()) { await introGo.click(); continue; }
    const skip = page.getByTestId('button-story-skip');
    if (await skip.isVisible()) await skip.click();
    const go = page.getByTestId('button-story-go');
    if (!(await go.isVisible())) return;
    const choice = page.getByTestId('button-story-choice-0');
    if (await choice.isVisible()) await choice.click();
    await go.click();
  }
}

test('a child’s first screens pass an automated WCAG A/AA check: the map, a Learn page, a question and the lesson page', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  // Every month has a seasonal theme; A11Y_DATE (like 2026-03-15) runs the whole walk under that day's theme.
  if (process.env.A11Y_DATE) await page.clock.setFixedTime(new Date(`${process.env.A11Y_DATE}T10:00:00`));
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();

  const found: { key: string; detail: string }[] = [];
  found.push(...await axeViolations(page, 'the map'));

  const lesson = MISSIONS[0]!;
  await page.getByTestId(`button-start-mission-${lesson.id}`).click();
  await passStory(page);
  let learnPages = 0;
  let questions = 0;
  await completeIdeas(page, lesson, {
    // One Learn page and one question are enough: every page and question shares the same layout.
    onLearnPage: async () => { if (learnPages++ === 0) found.push(...await axeViolations(page, 'a Learn page')); },
    onQuestion: async () => { if (questions++ === 0) found.push(...await axeViolations(page, 'a question')); },
  });
  await finishPutTogether(page, lesson);
  // The lesson page may open under a break offer (a child sees it after each part of a lesson): check it, then skip it.
  // Waited for and clicked in the page itself: a Playwright action or assertion would set off the tests' Watch-skipping
  // handler for the Watch screen behind the offer, which the offer covers.
  await page.waitForFunction(() => !!document.querySelector('[data-testid="learning-lab"]'));
  if (await page.evaluate(() => !!document.querySelector('[data-testid="brain-break-overlay"]'))) {
    found.push(...await axeViolations(page, 'the break offer'));
    await page.evaluate(() => (document.querySelector('[data-testid="button-break-skip-top"]') as HTMLElement | null)?.click());
  }
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  found.push(...await axeViolations(page, 'the lesson page'));

  const keys = new Set(found.map((item) => item.key));
  expect(found.filter((item) => !KNOWN.includes(item.key)).map((item) => item.detail), 'new accessibility violations').toEqual([]);
  expect(KNOWN.filter((key) => !keys.has(key)), 'violations that no longer happen: remove them from KNOWN').toEqual([]);
});

test('the learning map passes the same check under every month’s theme, with the banner showing and nothing sticking out', async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 664 });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  const found: string[] = [];
  for (let month = 0; month < 12; month++) {
    await page.clock.setFixedTime(new Date(2026, month, 15, 10, 0, 0));
    await page.goto('/');
    const guest = page.getByTestId('button-play-guest');
    if (await guest.isVisible().catch(() => false)) await guest.click();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await expect(page.getByTestId('season-banner')).toBeVisible();
    found.push(...(await axeViolations(page, `the map in ${new Date(2026, month, 15).toLocaleString('en', { month: 'long' })}`)).map((item) => item.detail));
    // The banner's text must be readable on the colour behind it, and the page must not scroll sideways.
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `month ${month + 1} fits 390`).toBeLessThanOrEqual(391);
    // The banner fades to its second colour only in the last 44px (season.css), so its text must end above that.
    const clearance = await page.evaluate(() => {
      const banner = document.querySelector('[data-testid="season-banner"]')!;
      const bottoms = [...banner.querySelectorAll('.fq-season-kicker, h2, p')].map((element) => element.getBoundingClientRect().bottom);
      return banner.getBoundingClientRect().bottom - 44 - Math.max(...bottoms);
    });
    if (![9, 11].includes(month)) expect(clearance, `month ${month + 1}: banner text ends above the fade`).toBeGreaterThanOrEqual(0);
  }
  expect(found, 'accessibility violations on the themed map').toEqual([]);
});
