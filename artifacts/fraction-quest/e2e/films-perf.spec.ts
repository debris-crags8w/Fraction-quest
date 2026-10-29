import { expect, test, type Page } from './fixtures';

/* How smooth a film is on a slow phone: Chromium runs with the CPU slowed 4 times (a mid-range phone is about that far
   behind a laptop), one chapter opening and one lesson film play for several seconds, and a probe in the page counts
   the long tasks (the main thread busy for more than 50 ms) and the frames that came late. The numbers are printed (and
   attached to the test) so they can be compared from one change to the next. */

const WATCH_MS = 9000;
/** A frame later than this many milliseconds after the one before it counts as dropped (a 60 Hz screen shows one every 16.7). */
const LATE_FRAME_MS = 34;

async function openFilm(page: Page, unit: number, missionId: string) {
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('button-open-storybook'))).toBeVisible({ timeout: 20_000 });
  if (await guest.isVisible()) await guest.click();
  await page.getByTestId('button-open-storybook').click();
  await page.getByTestId(`storybook-chapter-${unit}`).evaluate((details) => { (details as HTMLDetailsElement).open = true; });
  await page.getByTestId(`button-storybook-part-${missionId}`).click();
}

type Probe = { longTasks: number[]; frames: number[] };

for (const kind of ['chapter opening', 'lesson film'] as const) {
  test(`a ${kind} on a phone with the CPU slowed 4 times: long tasks and dropped frames`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    const { MISSIONS } = await import('../src/game');
    const { getBuildChecks, getWorksheet } = await import('../src/learning-content');
    // Every lesson finished, so every chapter and its films are open.
    const learning = Object.fromEntries(MISSIONS.map((mission) => [mission.id, { practiceDone: true, helpUses: 0, misconceptions: {}, completedAt: 1,
      checks: Object.fromEntries(getBuildChecks(mission.id).map((check) => [check.id, { passed: true }])),
      worksheet: Object.fromEntries(getWorksheet(mission.id).map((row) => [row.id, { draft: row.answer, checkedValue: row.answer }])) }]));
    const progress = { completedMissionIds: MISSIONS.map((mission) => mission.id), starsByMission: {}, reviewQueue: [], assessments: [], learning };
    const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false, story: { prologueSeen: true, choices: {} },
      displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: true } };
    await page.addInitScript(({ savedProgress, savedFun }) => {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
      localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
    }, { savedProgress: progress, savedFun: fun });
    await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
    await page.setViewportSize({ width: 390, height: 664 });

    // Chapter 9 (the race) is a busy opening (a long ruler, a flip card, a walking turtle); chapter 9's second lesson is the lesson film.
    const chapter = 9;
    const missions = MISSIONS.filter((mission) => mission.unit === chapter);
    await openFilm(page, chapter, missions[kind === 'chapter opening' ? 0 : 1].id);
    await expect(page.getByTestId('story-comic')).toBeVisible();

    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => {
      const probe = { longTasks: [] as number[], frames: [] as number[] };
      (window as unknown as { filmProbe: typeof probe }).filmProbe = probe;
      new PerformanceObserver((list) => { for (const entry of list.getEntries()) probe.longTasks.push(entry.duration); }).observe({ type: 'longtask', buffered: true });
      let last = performance.now();
      const frame = (now: number) => { probe.frames.push(now - last); last = now; requestAnimationFrame(frame); };
      requestAnimationFrame(frame);
    });
    await page.waitForTimeout(WATCH_MS);
    const { longTasks, frames } = await page.evaluate(() => (window as unknown as { filmProbe: Probe }).filmProbe);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    const late = frames.filter((gap) => gap > LATE_FRAME_MS);
    // Frames missed: a gap of 50 ms is three frames' time, so two were missed.
    const dropped = frames.reduce((sum, gap) => sum + Math.max(0, Math.round(gap / (1000 / 60)) - 1), 0);
    const report = {
      film: `${kind} (chapter ${chapter})`, seconds: WATCH_MS / 1000, longTasks: longTasks.length, maxLongTaskMs: Math.round(Math.max(0, ...longTasks)),
      frames: frames.length, lateFrames: late.length, droppedFrames: dropped, worstFrameMs: Math.round(Math.max(0, ...frames)),
      averageFps: Math.round((frames.length / WATCH_MS) * 1000),
    };
    console.log(`FILM PERF ${JSON.stringify(report)}`);
    testInfo.annotations.push({ type: 'film-perf', description: JSON.stringify(report) });
    expect(frames.length, 'the probe saw frames').toBeGreaterThan(10);
  });
}
