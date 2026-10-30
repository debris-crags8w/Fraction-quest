import { expect, test, type Page } from './fixtures';
import { coveredShare, fakeVoice, countMusicNotes, snaps, visibleShare, watchFilm } from './film-probe';

/* Every film (the prologue, each chapter's opening and ending, and the finale) on a phone: it opens with Skip in reach,
   fits without scrolling, nothing jumps while it plays, and Skip lands on a Next that is also in reach. With Reduce
   motion, nothing moves at all. Everything is checked on the 390 x 664 phone screen (an iPhone in Safari). A second test plays
   a lesson film from every chapter with the sound, the music and a (fake) voice clip on, and checks that no speaker's face is
   under the caption; a third checks that the characters and written fractions of every chapter opening stay in the picture. */

async function openStorybook(page: Page, reducedMotion: boolean, sound = false) {
  const { MISSIONS } = await import('../src/game');
  const { getBuildChecks, getWorksheet } = await import('../src/learning-content');
  // Every lesson finished, so every chapter ending and the finale can be watched.
  const learning = Object.fromEntries(MISSIONS.map((mission) => [mission.id, { practiceDone: true, helpUses: 0, misconceptions: {}, completedAt: 1,
    checks: Object.fromEntries(getBuildChecks(mission.id).map((check) => [check.id, { passed: true }])),
    worksheet: Object.fromEntries(getWorksheet(mission.id).map((row) => [row.id, { draft: row.answer, checkedValue: row.answer }])) }]));
  const progress = { completedMissionIds: MISSIONS.map((mission) => mission.id), starsByMission: {}, reviewQueue: [], assessments: [], learning };
  const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound, story: { prologueSeen: true, choices: {} },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion, seasonalThemes: false, storyMode: true } };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 664 });
  return MISSIONS;
}

for (const reducedMotion of [false, true]) {
  test(`every film fits a phone, keeps Skip and Next in reach and never jumps${reducedMotion ? ', and stays still with Reduce motion' : ''}`, async ({ page }) => {
    test.setTimeout(6 * 60_000);
    const MISSIONS = await openStorybook(page, reducedMotion);
    const { CHAPTERS } = await import('../src/story');
    const book = async () => {
      await page.goto('/');
      const guest = page.getByTestId('button-play-guest');
      await expect(guest.or(page.getByTestId('button-open-storybook'))).toBeVisible({ timeout: 20_000 });
      if (await guest.isVisible()) await guest.click();
      await page.getByTestId('button-open-storybook').click();
    };
    const chapterButton = async (unit: number, testId: string) => {
      await page.getByTestId(`storybook-chapter-${unit}`).evaluate((details) => { (details as HTMLDetailsElement).open = true; });
      await page.getByTestId(testId).click();
    };
    const films: [string, () => Promise<void>][] = [['prologue', () => page.getByTestId('button-storybook-prologue').click()]];
    for (const chapter of CHAPTERS) {
      const first = MISSIONS.find((mission) => mission.unit === chapter.unit)!;
      films.push([`chapter ${chapter.unit} opening`, () => chapterButton(chapter.unit, `button-storybook-part-${first.id}`)]);
      films.push([`chapter ${chapter.unit} ending`, () => chapterButton(chapter.unit, `button-storybook-end-${chapter.unit}`)]);
    }
    films.push(['finale', () => page.getByTestId('storybook-finale').click()]);

    const inReach = async (testId: string) => {
      const box = await page.getByTestId(testId).boundingBox();
      return !!box && box.y >= 0 && box.y + box.height <= 664;
    };
    const overflow = () => page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
    for (const [name, open] of films) {
      await book();
      await open();
      await expect(page.getByTestId('story-comic'), name).toBeVisible();
      await page.evaluate(() => {
        const watch = window as unknown as { shift: number };
        watch.shift = 0;
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!entry.hadRecentInput) watch.shift += entry.value;
        }).observe({ type: 'layout-shift' });
      });
      await expect.poll(() => inReach('button-story-skip'), { message: `${name}: Skip is on screen` }).toBe(true);
      if (reducedMotion) {
        // Motion means anything changing but opacity: Reduce motion swaps the film's movement for short fades, which
        // are fine. Reduce motion also cuts every other animation to 0.01 ms (it can't be seen), so one caught in that
        // instant (a button's hover under the pointer) doesn't count.
        const running = await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === 'running')
          .filter((animation) => Number(animation.effect?.getComputedTiming().duration ?? 0) > 1)
          .filter((animation) => ((animation.effect as KeyframeEffect | null)?.getKeyframes() ?? [])
            .some((frame) => Object.keys(frame).some((property) => !['offset', 'computedOffset', 'easing', 'composite', 'opacity'].includes(property))))
          .map((animation) => `${(animation as CSSAnimation).animationName ?? (animation as CSSTransition).transitionProperty} on ${((animation.effect as KeyframeEffect).target as Element)?.className}`));
        expect(running, `${name}: nothing moves with Reduce motion`).toEqual([]);
      }
      await page.waitForTimeout(1500);
      expect(await overflow(), `${name}: fits while it plays`).toBeLessThanOrEqual(0);
      await page.getByTestId('button-story-skip').click();
      await expect(page.getByTestId('button-story-go')).toBeVisible();
      await expect.poll(() => inReach('button-story-go'), { message: `${name}: Next is on screen at the end` }).toBe(true);
      expect(await overflow(), `${name}: fits at the end`).toBeLessThanOrEqual(0);
      // A finished film stands still: no loop is still running in it (the ambient loops pause once it is done).
      const looping = await page.evaluate(() => document.getAnimations()
        .filter((animation) => animation.playState === 'running' && animation.effect?.getComputedTiming().iterations === Infinity)
        .filter((animation) => !!((animation.effect as KeyframeEffect | null)?.target as Element | null)?.closest('[data-testid=story-comic]'))
        .map((animation) => `${(animation as CSSAnimation).animationName} on ${((animation.effect as KeyframeEffect).target as Element).className}`));
      expect(looping, `${name}: nothing loops at the end`).toEqual([]);
      expect(await page.evaluate(() => (window as unknown as { shift: number }).shift), `${name}: nothing jumps`).toBeLessThan(0.02);
    }
  });
}

/** Opens one lesson's film from the Storybook. */
async function openLessonFilm(page: Page, unit: number, missionId: string) {
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('button-open-storybook'))).toBeVisible({ timeout: 20_000 });
  if (await guest.isVisible()) await guest.click();
  await page.getByTestId('button-open-storybook').click();
  await page.getByTestId(`storybook-chapter-${unit}`).evaluate((details) => { (details as HTMLDetailsElement).open = true; });
  await page.getByTestId(`button-storybook-part-${missionId}`).click();
  await expect(page.getByTestId('story-comic')).toBeVisible();
}

/** How much of a face may sit under the caption (a hair of a shadow or an ear): none worth seeing. */
const COVER_TOLERANCE = 0.05;
/** A caption whose top edge is lower than this (page pixels, 390 x 664 phone) is five lines or fewer. */
const FRIEND_SAFE_CAPTION_TOP = 300;

test('a lesson film from every chapter plays on a phone with sound, music and a voice clip, and no speaker is hidden behind the caption', async ({ page }) => {
  // Every lesson of every chapter when asked (FILM_ALL_LESSONS=1: about 15 minutes); otherwise, from each chapter, the lesson with the
  // longest line (a long line makes the tallest caption, which reaches highest up the picture).
  const every = process.env.FILM_ALL_LESSONS === '1';
  test.setTimeout(every ? 30 * 60_000 : 8 * 60_000);
  const MISSIONS = await openStorybook(page, false, true);
  const { CHAPTERS, lessonComic } = await import('../src/story');
  await fakeVoice(page);
  await countMusicNotes(page);
  let clips = 0;
  page.on('request', (request) => { if (/\/voice\/(speech|[^/]+\/[0-9a-f]+\.mp3)/.test(request.url())) clips += 1; });
  for (const chapter of CHAPTERS) {
    const lessons = MISSIONS.filter((mission) => mission.unit === chapter.unit).slice(1);
    const longest = (mission: (typeof lessons)[number]) => Math.max(...lessonComic(chapter, mission, lessons.indexOf(mission) + 1).map((panel) => panel.text.length));
    const chosen = every ? lessons : [lessons.reduce((best, mission) => (longest(mission) > longest(best) ? mission : best))];
    for (const mission of chosen) {
      const name = `chapter ${chapter.unit}, ${mission.id}`;
      await openLessonFilm(page, chapter.unit, mission.id);
      await watchFilm(page);
      // The film plays to its end by itself, led by the voice clips.
      await expect(page.getByTestId('button-story-go'), `${name}: the film ends`).toBeVisible({ timeout: 60_000 });
      const shots = await snaps(page);
      expect(shots.length, `${name}: one caption per shot was measured`).toBeGreaterThanOrEqual(3);
      for (const shot of shots) {
        const where = `${name} ${shot.caption}`;
        if (!shot.speaker) continue;
        expect.soft(coveredShare(shot.speaker, shot.captionBox), `${where}: the speaker's face is under the caption`).toBeLessThanOrEqual(COVER_TOLERANCE);
        // The friend stands at the speaker's feet, clear of every caption up to five lines; a taller caption is flagged.
        if (shot.friend && shot.captionBox && shot.captionBox.t >= FRIEND_SAFE_CAPTION_TOP) expect.soft(coveredShare(shot.friend, shot.captionBox), `${where}: the chapter friend is under the caption`).toBeLessThanOrEqual(COVER_TOLERANCE);
        else if (shot.friend) expect.soft(shot.caption, `${where}: a caption this tall (${shot.captionBox?.t}) reaches over the chapter friend`).toBe('never');
        expect.soft(visibleShare(shot.speaker, shot.frame), `${where}: the speaker is inside the picture`).toBeGreaterThanOrEqual(0.9);
        if (shot.friend) expect.soft(coveredShare(shot.speaker, shot.friend), `${where}: the chapter friend sits on the speaker's face`).toBeLessThanOrEqual(COVER_TOLERANCE);
        if (shot.friend) expect.soft(visibleShare(shot.friend, shot.frame), `${where}: the friend is inside the picture`).toBeGreaterThanOrEqual(0.9);
      }
      expect(await page.evaluate(() => document.documentElement.scrollHeight - innerHeight), `${name}: fits at the end`).toBeLessThanOrEqual(0);
      const go = await page.getByTestId('button-story-go').boundingBox();
      expect(go && go.y + go.height <= 664, `${name}: Next is on screen`).toBe(true);
    }
  }
  expect(clips, 'the voice clips were asked for').toBeGreaterThan(5);
  expect(await page.evaluate(() => (window as unknown as { notes: number }).notes), 'the music played').toBeGreaterThan(10);
});

/** In a chapter opening, how much of a character may sit under the caption: a foot or a tail, never the face. */
const OPENING_CAPTION_TOLERANCE = 0.2;

test('every chapter opening keeps its characters and written fractions inside the picture and clear of the caption, and the set never shows a gap at the edge', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const MISSIONS = await openStorybook(page, false, true);
  const { CHAPTERS } = await import('../src/story');
  await fakeVoice(page);
  for (const chapter of CHAPTERS) {
    const first = MISSIONS.find((mission) => mission.unit === chapter.unit)!;
    const name = `chapter ${chapter.unit} opening`;
    await openLessonFilm(page, chapter.unit, first.id);
    await watchFilm(page);
    await expect(page.getByTestId('button-story-go'), `${name}: the film ends`).toBeVisible({ timeout: 60_000 });
    const shots = await snaps(page);
    expect(shots.length, `${name}: one caption per shot was measured`).toBeGreaterThanOrEqual(3);
    for (const shot of shots) {
      const where = `${name} ${shot.caption}`;
      // The camera never uncovers the edge of the set (a dark sliver or a line of the next object).
      expect.soft(shot.set.l, `${where}: set's left edge`).toBeLessThanOrEqual(shot.screen.l + 0.5);
      expect.soft(shot.set.t, `${where}: set's top edge`).toBeLessThanOrEqual(shot.screen.t + 0.5);
      expect.soft(shot.set.r, `${where}: set's right edge`).toBeGreaterThanOrEqual(shot.screen.r - 0.5);
      expect.soft(shot.set.b, `${where}: set's bottom edge`).toBeGreaterThanOrEqual(shot.screen.b - 0.5);
      // Every character, on every line, is inside the picture and not behind the caption (the camera pushes in on
      // some lines, so each line is checked where its camera ends up).
      for (const actor of shot.actors) {
        // A character's box has about 8 px of empty margin round the drawing: the drawing itself is what must show.
        const body = { l: actor.box.l + 8, t: actor.box.t + 8, r: actor.box.r - 8, b: actor.box.b - 8 };
        expect.soft(visibleShare(body, shot.frame), `${where}: ${actor.who} is inside the picture`).toBeGreaterThanOrEqual(0.92);
        expect.soft(coveredShare(body, shot.captionBox), `${where}: ${actor.who} is behind the caption`).toBeLessThanOrEqual(OPENING_CAPTION_TOLERANCE);
      }
      for (const fraction of shot.fractions) {
        expect.soft(visibleShare(fraction.box, shot.frame), `${where}: ${fraction.text} is inside the picture`).toBeGreaterThanOrEqual(0.85);
        expect.soft(coveredShare(fraction.box, shot.captionBox), `${where}: ${fraction.text} is behind the caption`).toBeLessThanOrEqual(COVER_TOLERANCE);
      }
      // The bunting is cut by the top bar or fully there, never a thin line under it.
      if (shot.bunting) {
        const shown = Math.min(shot.bunting.b, shot.frame.b) - Math.max(shot.bunting.t, shot.frame.t);
        expect.soft(shown <= 0 || shown >= 12, `${where}: the bunting shows ${shown.toFixed(1)}px under the top bar`).toBe(true);
      }
    }
  }
});

test('every chapter ending keeps its speaker, friend and "pieces" label inside the picture, the label off the prop, and nobody sits on anybody', async ({ page }) => {
  test.setTimeout(8 * 60_000);
  await openStorybook(page, false, true);
  const { CHAPTERS } = await import('../src/story');
  await fakeVoice(page);
  for (const chapter of CHAPTERS) {
    const name = `chapter ${chapter.unit} ending`;
    await page.goto('/');
    const guest = page.getByTestId('button-play-guest');
    await expect(guest.or(page.getByTestId('button-open-storybook'))).toBeVisible({ timeout: 20_000 });
    if (await guest.isVisible()) await guest.click();
    await page.getByTestId('button-open-storybook').click();
    await page.getByTestId(`storybook-chapter-${chapter.unit}`).evaluate((details) => { (details as HTMLDetailsElement).open = true; });
    await page.getByTestId(`button-storybook-end-${chapter.unit}`).click();
    await expect(page.getByTestId('story-comic')).toBeVisible();
    await watchFilm(page);
    await expect(page.getByTestId('button-story-go'), `${name}: the film ends`).toBeVisible({ timeout: 60_000 });
    const shots = await snaps(page);
    expect(shots.length, `${name}: one caption per shot was measured`).toBeGreaterThanOrEqual(3);
    for (const shot of shots) {
      const where = `${name} ${shot.caption}`;
      for (const actor of shot.actors) expect.soft(visibleShare(actor.box, shot.frame), `${where}: ${actor.who} is inside the picture`).toBeGreaterThanOrEqual(0.95);
      for (let i = 0; i < shot.actors.length; i += 1) for (let j = i + 1; j < shot.actors.length; j += 1) {
        expect.soft(coveredShare(shot.actors[i]!.box, shot.actors[j]!.box), `${where}: ${shot.actors[i]!.who} sits on ${shot.actors[j]!.who}`).toBeLessThanOrEqual(COVER_TOLERANCE);
      }
      // The label is cut by neither the top letterbox bar nor the sides, and it never crosses the chapter's prop.
      if (shot.ribbon) {
        expect.soft(shot.ribbon.t, `${where}: the pieces label is under the top bar`).toBeGreaterThanOrEqual(shot.frame.t);
        expect.soft(visibleShare(shot.ribbon, shot.frame), `${where}: the pieces label is inside the picture`).toBe(1);
        expect.soft(coveredShare(shot.ribbon, shot.prop), `${where}: the pieces label crosses the prop`).toBe(0);
      }
    }
  }
});
