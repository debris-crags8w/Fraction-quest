/* Every e2e test uses this `test`: it taps through a lesson's one-time Teach first screen whenever it appears, so
   tests about a lesson's later steps start where they did before. teach-first.spec.ts tests the screen itself. */
import { test as base } from '@playwright/test';

export * from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addLocatorHandler(page.getByTestId('button-teach-next'), async (next) => { await next.click(); });
    await use(page);
  },
});
