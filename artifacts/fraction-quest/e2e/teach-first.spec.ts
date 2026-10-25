import { expect, test } from '@playwright/test';

/* A lesson's Teach first screen: it opens the first time the lesson starts, fits a phone, leads to the lesson, then
   stays a tap away under "How it works" and does not open by itself again. (The other specs tap through it.) */

const quietFun = (extra: Record<string, unknown> = {}) => JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
  story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: false }, ...extra });

test('a child’s first lesson: Watch, Words and Try, then idea 1 is taught before its first practice', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript((fun) => {
    if (!localStorage.getItem('fraction-quest-fun-v1')) localStorage.setItem('fraction-quest-fun-v1', fun);
  }, quietFun());
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByTestId('button-start-mission-equal-parts').click();

  // A child's first lesson: how the models work and their names come before any idea. Watch (the bar, then the
  // number line), Words (the fraction names), then Try, each its own screen. Lesson 1 teaches one idea at a time, so it
  // has no Teach first screen of its own.
  const intro = page.getByTestId('intro-steps');
  await expect(intro).toBeVisible();
  await expect(page.getByTestId('teach-first')).toHaveCount(0);
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

  // Idea 1's Learn pages: each picture plays to its last frame and the page fits a phone.
  const learn = page.getByTestId('idea-learn-screen');
  await expect(learn.getByTestId('idea-kicker')).toHaveText('Lesson 01 · Idea 1 of 4 · Learn');
  await expect(learn.getByRole('heading', { name: 'Equal parts are the same size' })).toBeVisible();
  const pages = ['Look at one whole.', 'Check that every part is the same size.', 'If one part is bigger, the parts are not fair shares.'];
  for (const [index, text] of pages.entries()) {
    // Words like "whole" carry a glossary note, so match the start of the line.
    await expect(learn.getByTestId('teach-step-text')).toHaveText(new RegExp(`^${text.split(' ').slice(0, 3).join(' ')}`));
    const scene = learn.getByTestId('teach-scene');
    await expect.poll(async () => Number(await scene.getAttribute('data-frame')) + 1, { timeout: 9_000 })
      .toBe(Number(await scene.getAttribute('data-frames')));
    await fits(text);
    await page.waitForTimeout(900); // the last frame's slide settles
    await page.screenshot({ path: test.info().outputPath(`idea-1-learn-${index + 1}.png`) });
    if (index === 0) await expect(learn.getByTestId('button-teach-step-back')).toBeDisabled();
    if (index < pages.length - 1) await learn.getByTestId('button-teach-step-next').click();
  }
  // The fair bar has a green tick and the unfair one is crossed out (page 2), so the right one stands out.
  await learn.getByTestId('button-teach-step-back').click();
  await expect(learn.getByTestId('teach-scene-cross')).toHaveCount(1);
  await learn.getByTestId('button-teach-step-next').click();
  await learn.getByTestId('button-idea-practise').click();
  await expect(page.locator('.fq-play-kicker')).toContainText('Idea 1 of 4');
  await expect(page.locator('.fq-play-kicker')).toContainText('Practise 1 of 3');
  await expect(page.getByTestId('button-check-answer')).toBeVisible();

  // Starting the lesson again opens idea 1 again, without Watch and Try.
  await page.reload();
  const guest = page.getByTestId('button-play-guest');
  if (await guest.isVisible()) await guest.click();
  await page.getByTestId('button-start-mission-equal-parts').click();
  await expect(page.getByTestId('idea-learn-screen')).toBeVisible();
  await expect(page.getByTestId('intro-steps')).toHaveCount(0);

  // The Helper keeps the fraction names.
  for (let i = 0; i < 3 && await page.getByTestId('button-teach-step-next').isVisible(); i++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  await page.getByTestId('button-lesson-helper').first().click();
  await page.getByTestId('button-helper-words').click();
  await page.getByTestId('lesson-helper').getByTestId('button-what-next').click();
  await expect(page.getByTestId('lesson-helper').getByTestId('fraction-word-2')).toContainText('one half');
});

test('a lesson without ideas teaches first the first time, then keeps it under How it works', async ({ page }) => {
  test.setTimeout(90_000);
  const { MISSIONS } = await import('../src/game');
  const { LESSON_SCENES } = await import('../src/teach-scenes');
  const { lessonIdeas } = await import('../src/lesson-ideas');
  const { PART_FINDER_LESSONS } = await import('../src/part-finder');
  const { LESSON_INTROS } = await import('../src/lesson-intros');
  const lesson = MISSIONS.find((mission) => LESSON_SCENES[mission.id] && !lessonIdeas(mission.id) && !PART_FINDER_LESSONS.has(mission.id))!;
  const ids = MISSIONS.map((mission) => mission.id);
  // Every lesson finished before (so this one is open), but none has shown its Teach first yet.
  await page.addInitScript(({ fun, ids }) => {
    if (localStorage.getItem('fraction-quest-fun-v1')) return;
    localStorage.setItem('fraction-quest-fun-v1', fun);
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: ids, starsByMission: {}, reviewQueue: [],
      learning: Object.fromEntries(ids.map((id) => [id, { completedAt: 1 }])), assessments: [] }));
  }, { fun: quietFun(), ids });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const play = page.getByTestId('button-play-guest');
  if (await play.isVisible()) await play.click();
  const openNode = async () => {
    const node = page.getByTestId(`button-node-${lesson.id}`);
    await node.click({ force: true });
    if (await node.getAttribute('aria-expanded') !== 'true') await node.click({ force: true });
    await page.getByTestId(`button-start-mission-${lesson.id}`).click();
  };
  await openNode();

  const teach = page.getByTestId('teach-first');
  await expect(teach).toBeVisible();
  await expect(teach.getByRole('heading', { name: LESSON_INTROS[lesson.id]!.heading })).toBeVisible();
  // One animated page at a time: each fits a phone, and Next moves on until the last page's Next.
  for (let i = 0; i < 16 && await teach.getByTestId('button-teach-step-next').isVisible(); i++) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(844);
    await teach.getByTestId('button-teach-step-next').click();
  }
  await page.getByTestId('button-teach-next').click();
  // Watch and Try (once per child) may come next; skip them.
  const skipIntro = page.locator('[data-testid="intro-steps"] [data-testid="button-intro-skip"]');
  await expect(page.getByTestId('lesson-example').or(skipIntro)).toBeVisible();
  if (await skipIntro.isVisible()) await skipIntro.click();
  await expect(page.getByTestId('lesson-example')).toBeVisible();
  const how = page.getByTestId('button-how-it-works').first();
  await how.click();
  await expect(page.getByTestId('lesson-introduction').first()).toBeVisible();
  await expect(how).toHaveAttribute('aria-expanded', 'true');

  // Starting the lesson again goes straight to it.
  await page.reload();
  await openNode();
  await expect(page.getByTestId('lesson-example')).toBeVisible();
  await expect(teach).toHaveCount(0);
});

test('the wordiest Teach first screens still fit a phone', async ({ page }) => {
  const { LESSON_INTROS } = await import('../src/lesson-intros');
  const size = (id: string) => { const intro = LESSON_INTROS[id]; return [intro.heading, intro.goal, ...intro.steps, intro.why].join(' ').length; };
  const { lessonIdeas } = await import('../src/lesson-ideas');
  const wordiest = Object.keys(LESSON_INTROS).filter((id) => !lessonIdeas(id)).sort((a, b) => size(b) - size(a)).slice(0, 3);
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
    introsSeen: { builder: true, line: true }, fractionWordsSeen: true,
    story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: true, seasonalThemes: false, storyMode: false } })));
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lessons');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('lesson-tester'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  // Lesson 5's first picture is animated: its Teach first step, or (a lesson with ideas) its first Learn page.
  await page.getByTestId('button-tester-start-unit-size').click();
  const scene = page.getByTestId('teach-first').or(page.getByTestId('idea-learn-screen')).getByTestId('teach-scene');
  await expect(scene).toBeVisible();
  expect(Number(await scene.getAttribute('data-frames'))).toBeGreaterThan(1);
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
  const { lessonIdeas } = await import('../src/lesson-ideas');
  for (const [id, scene] of Object.entries(LESSON_SCENES)) {
    // A lesson with ideas has no Teach first: its pictures are its ideas' Learn pages (checked in the first test).
    if (lessonIdeas(id)) continue;
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

test('a lesson with new signs teaches them on Learn pages before any practice uses them', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    introsSeen: { builder: true, line: true }, fractionWordsSeen: true,
    story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: true, seasonalThemes: false, storyMode: false } })));
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/?lessons');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('lesson-tester'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  const { MISSIONS } = await import('../src/game');
  const { ideaSteps, lessonIdeas } = await import('../src/lesson-ideas');
  const { completeIdeas } = await import('./lesson-walk');
  const mission = MISSIONS.find((item) => item.id === 'compare-same-numerator')!;
  const ideas = lessonIdeas(mission.id)!;
  // Lesson 6: idea 1 compares in words. The idea that brings in >, < and = explains each one (with a picture for =)
  // on its Learn pages, and only then do the practices use them.
  const signs = ideas.findIndex((idea) => idea.terms?.some((term) => term.pattern.test(' > ')));
  expect(signs).toBeGreaterThan(0);
  await page.getByTestId(`button-tester-start-${mission.id}`).click();
  await completeIdeas(page, mission, { until: ideaSteps(mission.id).findIndex(({ idea }) => idea === signs) });
  const learn = page.getByTestId('idea-learn-screen');
  await expect(page.getByTestId('idea-kicker')).toHaveText(`Lesson 06 · Idea ${signs + 1} of ${ideas.length} · Learn`);
  await expect(learn).toContainText('is more than');
  await learn.getByTestId('button-teach-step-next').click();
  await expect(learn).toContainText('is less than');
  await learn.getByTestId('button-teach-step-next').click();
  await expect(learn).toContainText('the same amount as');
  await expect(learn.getByTestId('teach-scene')).toBeVisible();
  await learn.getByTestId('button-idea-practise').click();
  await expect(page.locator('.fq-play-kicker')).toContainText(`Idea ${signs + 1} of ${ideas.length}`);
});
