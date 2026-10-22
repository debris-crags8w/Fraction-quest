import { expect, test, type Page } from './fixtures';

const dayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** A guest who has used `minutes` of a `limit`-minute day. */
async function openWithTime(page: Page, minutes: number, limit: number) {
  await page.addInitScript(({ day, used, allowed }) => {
    if (localStorage.getItem('fraction-quest-fun-v1:guest')) return;
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [], assessments: [], learning: {} }));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day, answeredToday: 4, sound: false, story: { prologueSeen: true }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, storyMode: false },
      activity: { [day]: { minutes: used, answered: 4 } }, timeLimit: { minutes: allowed } }));
  }, { day: dayKey(), used: minutes, allowed: limit });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('button-app-menu')).or(page.getByTestId('time-up'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
}

async function passGate(page: Page) {
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
}

test('when the daily time is used up, Hoot says see you tomorrow, the Storybook stays open, and a grown-up can add 10 minutes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openWithTime(page, 20, 20);
  const timeUp = page.getByTestId('time-up');
  await expect(timeUp).toBeVisible();
  await expect(timeUp.getByRole('heading')).toHaveText('That’s today’s time!');
  await expect(page.getByTestId('time-up-answered')).toHaveText('4 questions right today');
  await page.screenshot({ path: test.info().outputPath('time-up.png') });
  expect(await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)).toBeLessThanOrEqual(0);

  await page.getByTestId('button-time-up-storybook').click();
  await expect(page.getByTestId('time-up')).toHaveCount(0);
  await expect(page.getByTestId('storybook-story')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('time-up')).toBeVisible();

  await page.getByTestId('button-time-up-add').click();
  await passGate(page);
  await expect(page.getByTestId('time-up')).toHaveCount(0);
  await expect(page.getByTestId('button-app-menu')).toBeVisible();
});

test('time running out mid-lesson lets the child finish, then shows on leaving', async ({ page }) => {
  await page.clock.install();
  await openWithTime(page, 14, 15);
  await page.getByTestId('button-start-mission-equal-parts').click();
  const close = page.getByRole('button', { name: /^Back to the map/ });
  await expect(close).toBeVisible();
  await page.mouse.click(5, 5);
  await page.clock.runFor(61_000);
  // The minute is counted (15 of 15), but the lesson stays open.
  await expect.poll(() => page.evaluate((day) => {
    const saved = Object.keys(localStorage).filter((key) => key.startsWith('fraction-quest-fun-v1')).map((key) => JSON.parse(localStorage.getItem(key)!));
    return Math.max(...saved.map((fun) => fun.activity?.[day]?.minutes ?? 0));
  }, dayKey())).toBe(15);
  await expect(close).toBeVisible();
  await expect(page.getByTestId('time-up')).toHaveCount(0);
  await close.click();
  await expect(page.getByTestId('time-up')).toBeVisible();
});

test('the grown-ups page sets the daily limit and shows today’s minutes', async ({ page }) => {
  await openWithTime(page, 12, 0);
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  await passGate(page);
  const section = page.getByTestId('section-time-limit');
  await expect(section.getByTestId('time-limit-0')).toHaveAttribute('aria-pressed', 'true');
  await expect(section.getByTestId('time-limit-today')).toHaveText('Today: 12 minutes so far');
  await section.getByTestId('time-limit-20').click();
  await expect(section.getByTestId('time-limit-20')).toHaveAttribute('aria-pressed', 'true');
  await expect(section.getByTestId('time-limit-today')).toHaveText('Today: 12 of 20 minutes used');
});
