/* Every e2e test uses this `test`: it taps through a lesson's one-time Teach first screen whenever it appears, so
   tests about a lesson's later steps start where they did before. teach-first.spec.ts tests the screen itself. */
import { test as base } from '@playwright/test';

export * from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // An animated Teach first has a Next on every step: tap through them, then its last Next.
    const teach = page.getByTestId('button-teach-next').or(page.getByTestId('button-teach-step-next'));
    await page.addLocatorHandler(teach, async () => {
      const step = page.getByTestId('button-teach-step-next');
      for (let i = 0; i < 8 && await step.isVisible(); i++) await step.click();
      await page.getByTestId('button-teach-next').click();
    });
    await use(page);
  },
});
