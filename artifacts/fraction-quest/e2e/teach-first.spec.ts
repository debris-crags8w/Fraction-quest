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
  // One animated step at a time: each picture plays to its last frame, the screen fits a phone, and Next moves on.
  const steps = ['Step 1 of 3', 'Step 2 of 3', 'Step 3 of 3', 'Why it works'];
  for (const [index, label] of steps.entries()) {
    await expect(teach.getByTestId('teach-step-label')).toHaveText(label);
    const scene = teach.getByTestId('teach-scene');
    await expect.poll(async () => Number(await scene.getAttribute('data-frame')) + 1, { timeout: 9_000 })
      .toBe(Number(await scene.getAttribute('data-frames')));
    expect(await page.evaluate(() => document.documentElement.scrollHeight), label).toBeLessThanOrEqual(844);
    await page.waitForTimeout(900); // the last frame's slide settles
    await page.screenshot({ path: test.info().outputPath(`teach-first-${index + 1}.png`) });
    if (index === 0) await expect(teach.getByTestId('button-teach-step-back')).toBeDisabled();
    if (index < steps.length - 1) await teach.getByTestId('button-teach-step-next').click();
  }
  // Back and Replay: the step before plays again from its first frame.
  await teach.getByTestId('button-teach-step-back').click();
  await expect(teach.getByTestId('teach-step-label')).toHaveText('Step 3 of 3');
  await teach.getByTestId('button-teach-step-next').click();

  await page.getByTestId('button-teach-next').click();
  await expect(page.getByTestId('part-finder-lesson-example')).toBeVisible();
  const how = page.getByTestId('button-how-it-works').first();
  await how.click();
  await expect(page.getByTestId('lesson-introduction').first()).toBeVisible();
  // Under How it works the steps play again, and the last one just rests (the lesson is already open).
  await expect(page.getByTestId('teach-step-label').first()).toHaveText('Step 1 of 3');
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

test('with reduced motion, each Teach first step opens on its last frame', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: true, seasonalThemes: false, storyMode: false } })));
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lessons');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('lesson-tester'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  await page.getByTestId('button-tester-start-fraction-of-area').click();
  const scene = page.getByTestId('teach-first').getByTestId('teach-scene');
  await expect(scene).toBeVisible();
  expect(await scene.getAttribute('data-frame')).toBe(String(Number(await scene.getAttribute('data-frames')) - 1));
});

test('every step of every animated Teach first fits a phone', async ({ page }) => {
  const { LESSON_SCENES } = await import('../src/teach-scenes');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: true, seasonalThemes: false, storyMode: false } })));
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lessons');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('lesson-tester'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  for (const [id, scene] of Object.entries(LESSON_SCENES)) {
    await page.getByTestId(`button-tester-start-${id}`).click();
    const banner = await page.getByTestId('developer-test-banner').evaluate((element) => element.getBoundingClientRect().height);
    for (let step = 0; step <= scene.steps.length; step++) {
      await expect(page.getByTestId('teach-scene')).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollHeight), `${id} step ${step + 1}`).toBeLessThanOrEqual(844 + banner);
      if (step < scene.steps.length) await page.getByTestId('button-teach-step-next').click();
    }
    await page.getByTestId('button-exit-developer-test').click();
  }
});
