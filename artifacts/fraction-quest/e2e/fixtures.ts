/* Every e2e test uses this `test`: it skips the Watch and Try screens of a child's first lesson, and the short Watch
   before Build it in later lessons, whenever they appear, so tests about a lesson's later steps start where they did
   before. teach-first.spec.ts and course-smoke.spec.ts test those screens themselves. */
import { test as base } from '@playwright/test';

export * from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    // A child's first lesson: Watch and Try come before idea 1.
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
