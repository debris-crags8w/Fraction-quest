import { expect, test } from '@playwright/test';

/* A lesson's Teach first screen: it opens the first time the lesson starts, fits a phone, leads to the lesson, then
   stays a tap away under "How it works" and does not open by itself again. (The other specs tap through it.) */

test('a lesson teaches first the first time, then keeps it under How it works', async ({ page }) => {
  test.setTimeout(90_000);
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
  // After Why it works: the extra worked examples, each its own page, before any question.
  await teach.getByTestId('button-teach-step-next').click();
  await expect(teach.getByTestId('teach-step-label')).toHaveText('Example 1 of 3');
  await expect(teach.getByTestId('teach-step-text')).toHaveText('Share fairly');
  await teach.getByTestId('button-teach-step-next').click();
  await expect(teach.getByTestId('teach-step-label')).toHaveText('Example 2 of 3');
  await teach.getByTestId('button-teach-step-next').click();
  await expect(teach.getByTestId('teach-step-label')).toHaveText('Example 3 of 3');
  await expect(teach).toContainText('We name the parts, not the cuts');

  await page.getByTestId('button-teach-next').click();

  // A child's first lesson: how the models work and their names come before any question. Watch (the bar, then the
  // number line), Words (the fraction names), then Try, each its own screen.
  const intro = page.getByTestId('intro-steps');
  await expect(intro).toBeVisible();
  await expect(page.getByTestId('part-finder-lesson-example')).toHaveCount(0);
  await expect(intro.locator('[data-step="watch"] .fq-mi-kicker')).toHaveText('Step 1 of 3 · Watch');
  await expect(intro.getByTestId('intro-builder')).toBeVisible();
  // Each screen fits a phone, Next included.
  const fits = async (label: string) => {
    expect(await page.evaluate(() => document.documentElement.scrollHeight), label).toBeLessThanOrEqual(844);
  };
  await fits('Watch');
  await intro.getByTestId('button-intro-watched').click();
  await expect(intro.getByTestId('intro-line')).toHaveAttribute('data-step', 'watch');
  await expect(intro.getByTestId('button-intro-watched')).toHaveText(/Next: Words/);
  await intro.getByTestId('button-intro-watched').click();
  // Words, page 1: what a fraction is, before any fraction name: 1/4 is 1 of 4 equal parts, and what each number means.
  const what = intro.getByTestId('what-is-a-fraction');
  await expect(what.locator('.fq-mi-kicker')).toHaveText('Step 2 of 3 · Words · page 1 of 2');
  await expect(what).toContainText('A fraction names part of a whole.');
  await expect(what).toContainText('how many equal parts make the whole');
  await expect(what.getByRole('img', { name: 'A bar cut into 4 equal parts, 1 shaded' })).toBeVisible();
  await expect(what).not.toContainText('1/4');
  await expect(what).not.toContainText('numerator');
  await fits('What is a fraction?');
  await what.getByTestId('button-what-next').click();
  // Words, page 2: 1/3 is one third, stacked, with a small bar; the bottom number names the part.
  const words = intro.getByTestId('fraction-words');
  await expect(words.locator('.fq-mi-kicker')).toHaveText('Step 2 of 3 · Words · page 2 of 2');
  await expect(words.getByTestId('fraction-word-3')).toContainText('one third');
  await expect(words.getByTestId('fraction-word-3').getByLabel('1 over 3')).toBeVisible();
  await expect(words.getByTestId('fraction-word-4')).toContainText('one quarter');
  await expect(words).toContainText('The bottom number names the part.');
  await expect(words).not.toContainText('1/3');
  await fits('Words');
  await words.getByTestId('button-words-next').click();
  await expect(intro.locator('[data-step="try"] .fq-mi-kicker')).toHaveText('Step 3 of 3 · Try');
  await fits('Try');
  // Try 1 and 2 with the bar, then the number line's two; the last one starts the lesson.
  const tryOne = async (plus: number, tap: string) => {
    for (let i = 0; i < plus; i++) await intro.getByTestId('button-intro-plus').click();
    await intro.getByTestId(tap).click();
    await intro.getByTestId('button-intro-next').click();
  };
  await tryOne(1, 'intro-piece-0');
  await tryOne(2, 'intro-piece-1');
  await expect(intro.getByTestId('intro-line')).toHaveAttribute('data-step', 'try');
  await fits('Try the number line');
  await tryOne(2, 'intro-tick-2');
  await expect(intro.getByTestId('button-intro-next')).toBeDisabled();
  await intro.getByTestId('button-intro-plus').click();
  await intro.getByTestId('button-intro-plus').click();
  await intro.getByTestId('button-intro-plus').click();
  await intro.getByTestId('intro-tick-3').click();
  await expect(intro.getByTestId('button-intro-next')).toHaveText(/Start the lesson/);
  await intro.getByTestId('button-intro-next').click();

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
  await expect(page.getByTestId('intro-steps')).toHaveCount(0);

  // The Helper keeps the fraction names.
  await page.getByTestId('button-lesson-helper').first().click();
  await page.getByTestId('button-helper-words').click();
  await page.getByTestId('lesson-helper').getByTestId('button-what-next').click();
  await expect(page.getByTestId('lesson-helper').getByTestId('fraction-word-2')).toContainText('one half');
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
  const { TEACH_EXTRAS } = await import('../src/teach-extras');
  // It walks every step of every animated lesson (with its Words to know and extra examples), so it gets time for each.
  test.setTimeout(20_000 + Object.keys(LESSON_SCENES).length * 1_500);
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
    const extras = TEACH_EXTRAS[id] ?? {};
    const pages = (extras.words?.length ? 1 : 0) + scene.steps.length + 1 + (extras.examples?.length ?? 0);
    for (let step = 0; step < pages; step++) {
      await expect(page.getByTestId('teach-scene').or(page.getByTestId('teach-words')).first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollHeight), `${id} page ${step + 1}`).toBeLessThanOrEqual(844 + banner);
      if (step < pages - 1) await page.getByTestId('button-teach-step-next').click();
    }
    await page.getByTestId('button-exit-developer-test').click();
  }
});

test('a lesson with new words opens its Teach first on Words to know, before any step uses them', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: true, seasonalThemes: false, storyMode: false } })));
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lessons');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('lesson-tester'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  await page.getByTestId('button-tester-start-compare-same-numerator').click();
  const teach = page.getByTestId('lesson-introduction');
  // Lesson 6: >, < and = are explained, with a picture for =, before step 1 compares anything.
  await expect(teach.getByTestId('teach-step-label')).toHaveText('Words to know');
  const words = teach.getByTestId('teach-words');
  await expect(words.getByTestId('teach-word-=')).toContainText('the same amount as');
  await expect(words.getByTestId('teach-word->')).toContainText('is more than');
  await expect(words.getByTestId('teach-word-<')).toContainText('is less than');
  await expect(words.getByTestId('teach-word-=').getByTestId('teach-scene')).toBeVisible();
  await teach.getByTestId('button-teach-step-next').click();
  await expect(teach.getByTestId('teach-step-label')).toHaveText('Step 1 of 3');
});
