import { expect, test } from '@playwright/test';

/* A lesson teaches before it asks. A child's first lesson starts with Watch, Words and Try; then every lesson teaches each
   idea on its Learn pages right before that idea's 3 practices. Once the practice is done, the lesson's pictures and
   worked example stay a tap away under "How it works" on the lesson page. (Every Learn page of every lesson is checked
   to fit a phone by the all-lesson smoke and the iPhone screen test in course-smoke.spec.ts.) */

const quietFun = (extra: Record<string, unknown> = {}) => JSON.stringify({ xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
  story: { prologueSeen: true, choices: {} }, displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: false }, ...extra });

/** After a load: the login page's Play button, or the map for a guest who already chose to play. It waits for one of
    them, so a page still loading is not taken for the map. */
async function playAsGuest(page: import('@playwright/test').Page) {
  const guest = page.getByTestId('button-play-guest');
  const map = page.getByRole('heading', { name: /your learning map/i });
  await expect(guest.or(map)).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  await expect(map).toBeVisible();
}

test('a child’s first lesson: Watch, Words and Try, then idea 1 is taught before its first practice', async ({ page }) => {
  test.setTimeout(90_000);
  await page.addInitScript((fun) => {
    if (!localStorage.getItem('fraction-quest-fun-v1')) localStorage.setItem('fraction-quest-fun-v1', fun);
  }, quietFun());
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByTestId('button-start-mission-fraction-names').click();

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
  // Words, page 2: each part name with a small bar of equal parts and one part shaded. No written fraction and no top or
  // bottom number yet.
  const words = intro.getByTestId('fraction-words');
  await expect(words.locator('.fq-mi-kicker')).toHaveText('Step 2 of 3 · Words · page 2 of 2');
  await expect(words.getByTestId('fraction-word-3')).toContainText('one third');
  await expect(words.getByTestId('fraction-word-3').locator('.fq-mi-mini i')).toHaveCount(3);
  await expect(words.getByTestId('fraction-word-3').locator('.fq-mi-mini i.is-on')).toHaveCount(1);
  await expect(words.locator('.fq-mi-frac')).toHaveCount(0);
  await expect(words.getByTestId('fraction-word-4')).toContainText('one quarter');
  await expect(words).toContainText('Equal parts have names. 2 are halves, 3 are thirds, 4 are fourths.');
  await expect(words).not.toContainText(/numerator|denominator|top number|bottom number/i);
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
  await playAsGuest(page);
  await page.getByTestId('button-start-mission-fraction-names').click();
  await expect(page.getByTestId('idea-learn-screen')).toBeVisible();
  await expect(page.getByTestId('intro-steps')).toHaveCount(0);

  // An idea's practice shows only the question: no friend's line and no Helper button. The hint links to the fraction
  // names instead.
  for (let i = 0; i < 3 && await page.getByTestId('button-teach-step-next').isVisible(); i++) await page.getByTestId('button-teach-step-next').click();
  await page.getByTestId('button-idea-practise').click();
  await expect(page.getByTestId('button-lesson-helper')).toHaveCount(0);
  await expect(page.locator('.fq-segments .fq-segment')).toHaveCount(3);
  await page.getByTestId('button-show-hint').click();
  await page.getByTestId('button-hint-words').click();
  await page.getByTestId('lesson-helper').getByTestId('button-what-next').click();
  await expect(page.getByTestId('lesson-helper').getByTestId('fraction-word-2')).toContainText('one half');
});

test('a lesson teaches each idea before its practice, then keeps its pictures under How it works on the lesson page', async ({ page }) => {
  test.setTimeout(120_000);
  const { MISSIONS } = await import('../src/game');
  const { LESSON_SCENES } = await import('../src/teach-scenes');
  const { ideaSteps, isRound, lessonIdeas } = await import('../src/lesson-ideas');
  const { LESSON_INTROS } = await import('../src/lesson-intros');
  const { completeIdeas, finishPutTogether } = await import('./lesson-walk');
  // A lesson past the first two (they have tests of their own), with animated pictures and only questions to practise.
  const lesson = MISSIONS.find((mission, index) => index >= 2 && LESSON_SCENES[mission.id] && LESSON_INTROS[mission.id]
    && !ideaSteps(mission.id).some(({ item }) => isRound(item)))!;
  const ideas = lessonIdeas(lesson.id)!;
  const earlier = MISSIONS.slice(0, MISSIONS.indexOf(lesson)).map((mission) => mission.id);
  // Every earlier lesson finished (so this one is open); the model intros seen; no break offers. Seeded once: a reload
  // keeps what the app saved.
  await page.addInitScript(({ fun, ids }) => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('fraction-quest-fun-v1', fun);
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: ids, starsByMission: {}, reviewQueue: [],
      learning: Object.fromEntries(ids.map((id) => [id, { completedAt: 1 }])), assessments: [] }));
  }, { fun: quietFun({ introsSeen: { builder: true, line: true }, fractionWordsSeen: true, breakPreferences: { intervalMinutes: 0, quietMode: false } }), ids: earlier });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await playAsGuest(page);
  const openNode = async () => {
    const node = page.getByTestId(`button-node-${lesson.id}`);
    await node.click({ force: true });
    if (await node.getAttribute('aria-expanded') !== 'true') await node.click({ force: true });
    await page.getByTestId(`button-start-mission-${lesson.id}`).click();
  };
  await openNode();

  // The first time, idea 1's Learn pages come before any question, with the lesson's goal and a Listen button. There
  // is no Teach first screen and no worked example before question 1.
  const learn = page.getByTestId('idea-learn-screen');
  await expect(learn).toBeVisible();
  await expect(page.getByTestId('teach-first')).toHaveCount(0);
  await expect(page.getByTestId('lesson-example')).toHaveCount(0);
  await expect(learn.getByRole('heading', { name: ideas[0]!.title })).toBeVisible();
  await expect(learn.locator('.fq-ts-goal')).toBeVisible();
  await expect(learn.getByTestId('idea-learn').getByTestId('button-listen-learning-text')).toBeVisible();
  // Each idea: its Learn pages (each fits the phone), then its 3 practices. Then the lesson page.
  await completeIdeas(page, lesson);
  expect(await finishPutTogether(page, lesson), 'no review is due and story mode is off').toBe(0);

  // On the lesson page, How it works starts folded and opens the Learn pictures and the worked example.
  const how = page.getByTestId('lesson-how-it-works');
  await expect(how.getByTestId('button-how-it-works')).toHaveAttribute('aria-expanded', 'false');
  await how.getByTestId('button-how-it-works').click();
  await how.getByTestId('how-learn-pictures').locator('summary').click();
  await expect(how.getByTestId('lesson-introduction')).toBeVisible();
  await how.getByTestId('button-worked-example').click();
  await expect(how.getByTestId('lesson-example')).toBeVisible();

  // Starting the lesson again opens the lesson page: the Learn pages do not open by themselves again.
  await page.reload();
  await playAsGuest(page);
  await openNode();
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await expect(learn).toHaveCount(0);
});

test('with reduced motion, every Learn page picture opens on its last frame', async ({ page }) => {
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
  const { lessonIdeas } = await import('../src/lesson-ideas');
  // Lesson 5's first idea: each of its pictures opens complete, and at least one of them is animated.
  const pages = lessonIdeas('unit-size')![0]!.learn;
  await page.getByTestId('button-tester-start-unit-size').click();
  const learn = page.getByTestId('idea-learn');
  let animated = 0;
  for (const [index, learnPage] of pages.entries()) {
    if ('scene' in learnPage) {
      const scene = learn.getByTestId('teach-scene');
      await expect(scene).toBeVisible();
      const frames = Number(await scene.getAttribute('data-frames'));
      if (frames > 1) animated++;
      expect(await scene.getAttribute('data-frame'), `Learn page ${index + 1}`).toBe(String(frames - 1));
    }
    if (index < pages.length - 1) await learn.getByTestId('button-teach-step-next').click();
  }
  expect(animated).toBeGreaterThan(0);
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
  // Words to know first: what each sign means (with a picture for =). Then > and < read aloud on bars.
  const words = learn.getByTestId('teach-words');
  await expect(words.getByTestId('teach-word->')).toContainText('is more than');
  await expect(words.getByTestId('teach-word-<')).toContainText('is less than');
  await expect(words.getByTestId('teach-word-=')).toContainText('the same amount as');
  await expect(words.getByTestId('teach-word-=').getByTestId('teach-scene')).toBeVisible();
  await learn.getByTestId('button-teach-step-next').click();
  await expect(learn).toContainText('The open side faces the bigger amount.');
  await learn.getByTestId('button-teach-step-next').click();
  await expect(learn).toContainText('The point faces the smaller amount.');
  await learn.getByTestId('button-idea-practise').click();
  await expect(page.locator('.fq-play-kicker')).toContainText(`Idea ${signs + 1} of ${ideas.length}`);
});
