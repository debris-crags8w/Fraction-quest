/* Every e2e test uses this `test`: it taps through a lesson's one-time Teach first screen, and skips the Watch and
   Try screens that follow it in a child's first lesson, whenever they appear, so tests about a lesson's later steps
   start where they did before. teach-first.spec.ts tests those screens themselves. */
import { test as base } from '@playwright/test';

export * from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    // An animated Teach first has a Next on every step: tap through them, then its last Next. A card reopened from
    // "How it works" has no last Next and is left for the test to read.
    const step = page.locator('[data-teach-first] [data-testid="button-teach-step-next"]');
    const teach = page.getByTestId('button-teach-next').or(step);
    await page.addLocatorHandler(teach, async () => {
      for (let i = 0; i < 16 && await step.isVisible(); i++) await step.click();
      await page.getByTestId('button-teach-next').click();
    });
    // A child's first lesson: Watch and Try come between Teach first and the first question.
    await page.addLocatorHandler(page.locator('[data-testid="intro-steps"] [data-testid="button-intro-skip"]'), async () => {
      await page.locator('[data-testid="intro-steps"] [data-testid="button-intro-skip"]').click();
    });
    // Every later lesson: the short Watch before Build it (tests about that Watch keep it).
    if (!testInfo.title.includes('short Watch')) {
      await page.addLocatorHandler(page.locator('[data-testid="quick-watch"] [data-testid="button-intro-skip"]'), async () => {
        await page.locator('[data-testid="quick-watch"] [data-testid="button-intro-skip"]').click();
      });
    }
    await use(page);
  },
});

/** In the grown-ups' area: the Settings tab, with one settings row (by its title) opened. */
export async function openSettings(page: import('@playwright/test').Page, row: string) {
  await page.getByTestId('tab-parent-settings').click();
  const details = page.getByTestId(`settings-${row.toLowerCase().replace(/[^a-z]+/g, '-')}`);
  if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open))) await details.locator('summary').click();
}
