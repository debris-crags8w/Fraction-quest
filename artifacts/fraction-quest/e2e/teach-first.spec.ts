import { expect, test } from '@playwright/test';

/* A lesson's Teach first screen: it opens the first time the lesson starts, fits a phone, leads to the lesson, then
   stays a tap away under "How it works" and does not open by itself again. (The other specs tap through it.) */

test('a lesson teaches first the first time, then keeps it under How it works', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('fraction-quest-fun-v1')) localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
      story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: false } }));
  });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByTestId('button-start-mission-equal-parts').click();

  const teach = page.getByTestId('teach-first');
  await expect(teach).toBeVisible();
  await expect(teach.getByRole('heading', { name: 'How fair parts work' })).toBeVisible();
  await expect(teach.locator('.fq-teach-steps li')).toHaveCount(3);
  await expect(teach.getByRole('heading', { name: 'Why it works' })).toBeVisible();
  // The whole screen fits a phone: no scrolling to reach Next.
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(844);
  await page.screenshot({ path: test.info().outputPath('teach-first.png') });

  await page.getByTestId('button-teach-next').click();
  await expect(page.getByTestId('part-finder-lesson-example')).toBeVisible();
  const how = page.getByTestId('button-how-it-works').first();
  await how.click();
  await expect(page.getByTestId('lesson-introduction').first()).toBeVisible();
  await expect(how).toHaveAttribute('aria-expanded', 'true');

  // Starting the lesson again goes straight to it.
  await page.reload();
  const guest = page.getByTestId('button-play-guest');
  if (await guest.isVisible()) await guest.click();
  await page.getByTestId('button-start-mission-equal-parts').click();
  await expect(page.getByTestId('part-finder-lesson-example')).toBeVisible();
  await expect(teach).toHaveCount(0);
});

test('the wordiest Teach first screens still fit a phone', async ({ page }) => {
  const { LESSON_INTROS } = await import('../src/lesson-intros');
  const size = (id: string) => { const intro = LESSON_INTROS[id]; return [intro.heading, intro.goal, ...intro.steps, intro.why].join(' ').length; };
  const wordiest = Object.keys(LESSON_INTROS).sort((a, b) => size(b) - size(a)).slice(0, 3);
  await page.addInitScript(() => localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: false } })));
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lessons');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('lesson-tester'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  for (const id of wordiest) {
    await page.getByTestId(`button-tester-start-${id}`).click();
    await expect(page.getByTestId('teach-first')).toBeVisible();
    // The developer banner sits above the lesson in the tester, so allow for it.
    const banner = await page.getByTestId('developer-test-banner').evaluate((element) => element.getBoundingClientRect().height);
    expect(await page.evaluate(() => document.documentElement.scrollHeight), id).toBeLessThanOrEqual(844 + banner);
    await page.getByTestId('button-exit-developer-test').click();
  }
});
