import { expect, test, type Page } from './fixtures';

const dayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Pretend to be the app (iPhone and Android): the shell reports the subscription and records what the page asks. */
async function openInApp(page: Page, subscription: Record<string, unknown> | null, finished: string[] = []) {
  const record = { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, completedAt: Date.now() };
  const learning = Object.fromEntries(finished.map((id) => [id, record]));
  await page.addInitScript(({ savedSubscription, day, done, learned }) => {
    if (!localStorage.getItem('fraction-quest-fun-v1:guest')) {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: done, starsByMission: {}, reviewQueue: [], assessments: [], learning: learned }));
      localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day, answeredToday: 0, sound: false, story: { prologueSeen: true } }));
    }
    const scope = window as Window & { fractionQuestShell?: unknown; ReactNativeWebView?: unknown; __asked?: string[] };
    scope.__asked = [];
    if (savedSubscription) {
      scope.fractionQuestShell = { platform: 'ios', wifi: true, subscription: savedSubscription };
      scope.ReactNativeWebView = { postMessage: (message: string) => scope.__asked!.push(message) };
    }
  }, { savedSubscription: subscription, day: dayKey(), done: finished, learned: learning });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  const map = page.getByTestId('button-app-menu');
  await expect(guest.or(map)).toBeVisible();
  if (await guest.isVisible()) await guest.click();
}

const asked = (page: Page) => page.evaluate(() => ((window as Window & { __asked?: string[] }).__asked ?? []).map((message) => JSON.parse(message)));

test('in the app the first lesson is free', async ({ page }) => {
  await openInApp(page, { state: 'none', price: '$4.99' });
  await page.getByTestId('button-start-mission-equal-parts').click();
  await expect(page.getByTestId('subscribe-ask')).toHaveCount(0);
  await expect(page.getByTestId('paywall')).toHaveCount(0);
  expect(await asked(page)).toEqual([]);
});

test('in the app without a subscription, lesson 2 asks for a grown-up and opens once the trial starts', async ({ page }) => {
  await openInApp(page, { state: 'none', price: '$4.99' }, ['equal-parts']);
  await page.getByTestId('button-start-mission-fraction-names').click();

  const ask = page.getByTestId('subscribe-ask');
  await expect(ask).toBeVisible();
  await expect(ask).toContainText('ask a grown-up to unlock Fraction Quest');
  // Back goes to the map, which stays open.
  await page.getByTestId('button-subscribe-back').click();
  await expect(page.getByTestId('button-start-mission-fraction-names')).toBeVisible();
  await page.getByTestId('button-start-mission-fraction-names').click();

  await page.getByTestId('button-get-grown-up').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();

  await expect(page.getByTestId('paywall')).toBeVisible();
  await expect(page.getByTestId('paywall-price')).toHaveText('7 days free, then $4.99 a month');
  await page.getByTestId('button-start-trial').click();
  expect(await asked(page)).toContainEqual({ type: 'subscription', action: 'buy' });

  // The store's sheet is open: the button waits.
  await page.evaluate(() => {
    const scope = window as Window & { fractionQuestShell?: { subscription?: unknown } };
    scope.fractionQuestShell!.subscription = { state: 'none', price: '$4.99', busy: true };
    window.dispatchEvent(new Event('fraction-quest-shell'));
  });
  await expect(page.getByTestId('button-start-trial')).toBeDisabled();

  // The purchase goes through: the lesson that was asked for opens by itself.
  await page.evaluate(() => {
    const scope = window as Window & { fractionQuestShell?: { subscription?: unknown } };
    scope.fractionQuestShell!.subscription = { state: 'active', renewsAt: Date.now() + 7 * 86_400_000 };
    window.dispatchEvent(new Event('fraction-quest-shell'));
  });
  await expect(page.getByTestId('paywall')).toHaveCount(0);
  await expect(page.getByTestId('subscribe-ask')).toHaveCount(0);
});

test('the paywall offers the yearly plan first, and buys the plan the grown-up picks', async ({ page }) => {
  const plans = [{ plan: 'yearly', price: '$39.99', amount: 39.99, currency: 'USD' }, { plan: 'monthly', price: '$4.99', amount: 4.99, currency: 'USD' }];
  await page.setViewportSize({ width: 390, height: 844 });
  await openInApp(page, { state: 'none', price: '$4.99', plans }, ['equal-parts']);
  await page.getByTestId('button-start-mission-fraction-names').click();
  await page.getByTestId('button-get-grown-up').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();

  const paywall = page.getByTestId('paywall');
  await expect(paywall).toContainText('81 lessons');
  await expect(page.getByTestId('plan-yearly')).toContainText('$39.99 a year, about $3.33 a month');
  await expect(page.getByTestId('plan-yearly')).toContainText('Save 33%');
  await expect(page.getByTestId('plan-yearly').getByRole('radio')).toBeChecked();
  await expect(page.getByTestId('paywall-price')).toHaveText('7 days free, then $39.99 a year');
  // The whole paywall fits a phone screen.
  await page.screenshot({ path: test.info().outputPath('paywall.png') });
  expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(0);
  await page.getByTestId('button-start-trial').click();

  await page.getByTestId('plan-monthly').click();
  await expect(page.getByTestId('paywall-price')).toHaveText('7 days free, then $4.99 a month');
  await page.getByTestId('button-start-trial').click();
  expect(await asked(page)).toEqual([{ type: 'subscription', action: 'buy', plan: 'yearly' }, { type: 'subscription', action: 'buy', plan: 'monthly' }]);
});

test('after a subscription ends, the child is told their progress is saved and can open the Storybook', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fraction-quest-subscribed-once', '1'));
  await openInApp(page, { state: 'none' }, ['equal-parts']);
  await page.getByTestId('button-start-mission-fraction-names').click();
  const ask = page.getByTestId('subscribe-ask');
  await expect(ask).toHaveAttribute('data-lapsed', 'true');
  await expect(ask.getByRole('heading')).toHaveText('Hoot’s lantern is waiting');
  await expect(ask).toContainText('Everything you learned is saved: 0 stone pieces and 1 lesson.');
  await page.getByTestId('button-subscribe-storybook').click();
  await expect(page.getByTestId('subscribe-ask')).toHaveCount(0);
});

test('the grown-ups page shows the subscription and opens the store to manage it', async ({ page }) => {
  await openInApp(page, { state: 'active', renewsAt: new Date(2026, 10, 3).getTime() });
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await expect(page.getByTestId('subscription-status')).toContainText('Fraction Quest is on. It renews on November 3, 2026.');
  await page.getByTestId('button-manage-subscription').click();
  await page.getByTestId('button-parent-restore').click();
  expect(await asked(page)).toEqual([{ type: 'subscription', action: 'manage' }, { type: 'subscription', action: 'restore' }]);
});

test('in a browser there is no subscription: with the website limit off, lessons open and the grown-ups page has no subscription section', async ({ page }) => {
  await openInApp(page, null);
  await page.getByTestId('button-start-mission-equal-parts').click();
  await expect(page.getByTestId('subscribe-ask')).toHaveCount(0);
  await expect(page.getByTestId('paywall')).toHaveCount(0);
  await page.goto('/');
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await expect(page.getByTestId('parent-glance')).toBeVisible();
  await expect(page.getByTestId('section-subscription')).toHaveCount(0);
});
