import { expect, test, type Page } from './fixtures';
import { MISSIONS } from '../src/game';
import { getBuildChecks, getWorksheet } from '../src/learning-content';
import { END_SCENES, LESSON_PROPS } from '../src/film-props';

/* Lesson-film props and chapter-ending pictures (src/film-props.tsx), on a phone-sized screen (390 x 664):
   every sample film shows its prop, the prop and the speakers stay clear of the caption and of each other, and with
   Reduce motion the prop stands still but complete. */

test.use({ viewport: { width: 390, height: 664 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });

type Sample = { name: string; unit: number; lesson?: string; prop: string };
const SAMPLE_SET: Sample[] = [
  { name: 'chapter 3 lesson 2', unit: 3, lesson: 'benchmarks-zero-one', prop: 'flag' },
  { name: 'chapter 8 lesson 2', unit: 8, lesson: 'subtract-like-denominators', prop: 'jar' },
  { name: 'chapter 8 lesson 6', unit: 8, lesson: 'hundredths-decimals', prop: 'note' },
  { name: 'chapter 9 lesson 5', unit: 9, lesson: 'plot-in-eighths', prop: 'pebbles' },
  { name: 'chapter 12 lesson 4', unit: 12, lesson: 'line-plot-totals', prop: 'beakers' },
  { name: 'chapter 12 lesson 7', unit: 12, lesson: 'fractional-sharing', prop: 'loaves' },
  { name: 'chapter 3 ending', unit: 3, prop: 'end-3' },
  { name: 'chapter 8 ending', unit: 8, prop: 'end-8' },
  { name: 'chapter 12 ending', unit: 12, prop: 'end-12' },
];
/** Every lesson film and chapter ending that has a picture, in course order. */
const EVERY_FILM: Sample[] = [
  ...MISSIONS.filter((m) => LESSON_PROPS[m.id]).map((m) => ({ name: `chapter ${m.unit} ${m.id}`, unit: m.unit, lesson: m.id, prop: LESSON_PROPS[m.id]! })),
  ...Object.keys(END_SCENES).map(Number).sort((a, b) => a - b).map((unit) => ({ name: `chapter ${unit} ending`, unit, prop: `end-${unit}` })),
];
// By default the nine approved samples run (CI); FILM_PROPS_ONLY=<lesson id or end-N>,... runs those; FILM_PROPS_ALL=1 runs every film.
const only = (process.env.FILM_PROPS_ONLY ?? '').split(',').filter(Boolean);
const SAMPLES: Sample[] = process.env.FILM_PROPS_ALL ? EVERY_FILM
  : only.length ? EVERY_FILM.filter((s) => only.includes(s.lesson ?? s.prop)) : SAMPLE_SET;

async function openFilm(page: Page, sample: Sample, reducedMotion: boolean) {
  const completedAt = Date.now();
  const learning = Object.fromEntries(MISSIONS.map((m) => [m.id, { practiceDone: true, helpUses: 0, misconceptions: {}, completedAt,
    checks: Object.fromEntries(getBuildChecks(m.id).map((c) => [c.id, { passed: true, supported: false, attempts: 1 }])),
    worksheet: Object.fromEntries(getWorksheet(m.id).map((p) => [p.id, { draft: p.answer, checkedValue: p.answer, attempts: 1, supported: false }])) }]));
  await page.addInitScript(({ progress, fun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(fun));
  }, {
    progress: { completedMissionIds: MISSIONS.map((m) => m.id), starsByMission: {}, reviewQueue: [], assessments: [], learning },
    fun: { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false, story: { prologueSeen: true, choices: {} },
      displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion, seasonalThemes: false, storyMode: true } },
  });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByTestId('button-open-storybook').click();
  await page.getByTestId(`storybook-chapter-${sample.unit}`).evaluate((details: HTMLDetailsElement) => { details.open = true; });
  await page.getByTestId(sample.lesson ? `button-storybook-part-${sample.lesson}` : `button-storybook-end-${sample.unit}`).click();
  await page.getByTestId('story-comic').waitFor();
}

type Box = { x: number; y: number; width: number; height: number };
const overlap = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

for (const sample of SAMPLES) {
  test(`${sample.name}: the film shows its prop, and nothing in the picture is covered by the caption or by another face`, async ({ page }) => {
    await openFilm(page, sample, false);
    const prop = page.getByTestId('film-prop');
    await expect(prop).toHaveAttribute('data-prop', sample.prop);
    await expect(prop.getByRole('img')).toBeVisible();
    for (const beat of [0, 1, 2]) {
      await page.getByTestId(`story-panel-${beat}`).waitFor({ timeout: 25_000 });
      await page.waitForTimeout(2900); // the camera finishes its move
      // One snapshot of every rectangle at the same instant (the speaker is replaced when a new friend talks).
      const { screen, caption, picture, ribbon, faces } = await page.evaluate(() => {
        const rect = (el: Element | null) => { const r = el!.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
        return {
          screen: rect(document.querySelector('[data-testid=story-panels]')),
          caption: rect(document.querySelector('.fq-cine-caption')),
          picture: rect(document.querySelector('[data-testid=film-prop] svg')),
          ribbon: document.querySelector('.fq-cine-end-ribbon.is-visible') ? rect(document.querySelector('.fq-cine-end-ribbon.is-visible')) : null,
          faces: [...document.querySelectorAll('[data-testid=story-stage] .fq-cine-actor')].map((el) => ({ who: el.getAttribute('data-testid') ?? 'friend', ...rect(el) })),
        };
      });
      // The prop is inside the picture, below the letterbox bar and above the caption.
      expect(picture.x, `beat ${beat}: prop inside on the left`).toBeGreaterThanOrEqual(screen.x);
      expect(picture.x + picture.width, `beat ${beat}: prop inside on the right`).toBeLessThanOrEqual(screen.x + screen.width);
      expect(picture.y, `beat ${beat}: prop below the top bar`).toBeGreaterThanOrEqual(screen.y + 30);
      expect(overlap(picture, caption), `beat ${beat}: caption covers the prop`).toBe(false);
      // Every face on the screen (the speaker, the chapter's friend) is clear of the caption and of the prop.
      expect(faces.length).toBeGreaterThan(0);
      for (const whole of faces) {
        // A character's box has about 8 px of empty margin (shadow, line gap) round the drawing.
        const face = { ...whole, x: whole.x + 8, y: whole.y + 8, width: whole.width - 16, height: whole.height - 16 };
        // The friend stands at the speaker's feet, clear of every caption up to five lines.
        expect(overlap(face, caption), `beat ${beat}: caption covers ${face.who} ${JSON.stringify([face, caption])}`).toBe(false);
        expect(overlap(face, picture), `beat ${beat}: ${face.who} covers the prop`).toBe(false);
        // Nobody is cut by the screen's edge or by the letterbox bars (a character's box has the same empty margin round it).
        expect(face.x, `beat ${beat}: ${face.who} is cut by the left edge`).toBeGreaterThanOrEqual(screen.x);
        expect(face.x + face.width, `beat ${beat}: ${face.who} is cut by the right edge`).toBeLessThanOrEqual(screen.x + screen.width);
        expect(face.y, `beat ${beat}: ${face.who} is under the top bar`).toBeGreaterThanOrEqual(screen.y + 30);
      }
      // No face sits on another face: the chapter's friend never covers whoever is speaking (Numi, Hoot or the friend's own).
      const shrunk = faces.map((whole) => ({ ...whole, x: whole.x + 8, y: whole.y + 8, width: whole.width - 16, height: whole.height - 16 }));
      for (let i = 0; i < shrunk.length; i += 1) for (let j = i + 1; j < shrunk.length; j += 1) {
        expect(overlap(shrunk[i]!, shrunk[j]!), `beat ${beat}: ${shrunk[i]!.who} and ${shrunk[j]!.who} sit on each other`).toBe(false);
      }
      // A chapter ending's "N of 15 pieces" label is under the letterbox bar's edge, never cut by it.
      if (ribbon) expect(ribbon.y, `beat ${beat}: the pieces label is under the top bar`).toBeGreaterThanOrEqual(screen.y + 30);
    }
  });

  test(`${sample.name}: with Reduce motion the prop is a complete still picture`, async ({ page }) => {
    await openFilm(page, sample, true);
    await expect(page.locator('html')).toHaveClass(/fq-reduced-motion/);
    await page.getByTestId('button-story-skip').click();
    const prop = page.getByTestId('film-prop');
    await expect(prop).toBeVisible();
    const state = await prop.evaluate((el) => ({
      running: el.getAnimations({ subtree: true }).filter((animation) => animation.playState === 'running').length,
      opacity: getComputedStyle(el).opacity,
      hidden: [...el.querySelectorAll<SVGElement>('svg *')].filter((part) => getComputedStyle(part).opacity === '0' || getComputedStyle(part).display === 'none').length,
      box: el.getBoundingClientRect().width,
    }));
    expect(state.running, 'nothing moves').toBe(0);
    expect(state.opacity).toBe('1');
    expect(state.box).toBeGreaterThan(120);
    // Only the beakers' drip is absent in the still (it has no resting place).
    expect(state.hidden).toBeLessThanOrEqual(sample.prop === 'beakers' ? 1 : 0);
  });
}
