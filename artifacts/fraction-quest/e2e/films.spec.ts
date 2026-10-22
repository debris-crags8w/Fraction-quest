import { expect, test, type Page } from '@playwright/test';

/** Open chapter 2 in the Storybook with the given lessons finished. */
async function openChapterTwo(page: Page, done: string[], reducedMotion = false) {
  const progress = { completedMissionIds: done, starsByMission: {}, reviewQueue: [], assessments: [],
    learning: Object.fromEntries(done.map((id) => [id, { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, completedAt: 1 }])) };
  const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    story: { prologueSeen: true, choices: { '1': 0, '2': 0 } },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion, seasonalThemes: false, storyMode: true } };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByRole('button', { name: /Chapter 2, Pond/ }).click();
}

const unitOne = ['equal-parts', 'fraction-names', 'unit-fractions', 'fraction-of-area'];

test('chapter 2 film shows more equal parts making smaller parts, not equal groups', async ({ page }) => {
  await openChapterTwo(page, unitOne);
  await page.getByRole('button', { name: /Chapter start · More parts, smaller parts/ }).click();
  await page.getByTestId('button-story-skip').click();
  const stage = page.getByTestId('story-stage');
  await expect(stage.getByRole('img', { name: /One half and one fourth side by side: the half is bigger/ })).toBeAttached();
  await expect(stage.locator('.fq-cine-cutbar.is-halves i')).toHaveCount(2);
  await expect(stage.locator('.fq-cine-cutbar.is-fourths i')).toHaveCount(4);
  await expect(stage.locator('.fq-cine-plate, .fq-cine-snack')).toHaveCount(0);
  // Equal parts look equal: both bars are the same length, and the half is twice the fourth.
  const [halves, fourths] = await Promise.all([stage.locator('.fq-cine-cutbar.is-halves').boundingBox(), stage.locator('.fq-cine-cutbar.is-fourths').boundingBox()]);
  expect(Math.abs(halves!.width - fourths!.width)).toBeLessThan(1);
  const half = await stage.locator('.fq-cine-cutbar.is-halves i').first().boundingBox();
  const fourth = await stage.locator('.fq-cine-cutbar.is-fourths i').first().boundingBox();
  expect(half!.width / fourth!.width).toBeGreaterThan(1.9);
});

test('the grown-ups\' Reduce motion setting keeps the film camera still and hides flashes and drifting motes', async ({ page }) => {
  await openChapterTwo(page, unitOne, true);
  await expect(page.locator('html')).toHaveClass(/fq-reduced-motion/);
  await page.getByRole('button', { name: /Chapter start · More parts, smaller parts/ }).click();
  const film = page.getByTestId('story-panels');
  const camera = film.locator('.fq-cine-cam').first();
  await expect(camera).toBeAttached();
  // Through several shots, the camera never pushes in or pans (each shot sets a transform on it otherwise).
  for (let shot = 0; shot < 3; shot++) {
    await page.waitForTimeout(900);
    expect(await camera.evaluate((el) => getComputedStyle(el).transform)).toBe('none');
  }
  for (const still of await film.locator('.fq-cine-ambient, .fq-cine-flash').all()) {
    expect(await still.evaluate((el) => getComputedStyle(el).display)).toBe('none');
  }
});

test('lesson 2 plays in the chapter\'s place with the speakers, and no story props', async ({ page }) => {
  await openChapterTwo(page, [...unitOne, 'unit-size']);
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('story-panels')).toHaveClass(/is-pond/);
  await expect(page.getByTestId('story-set-speaker')).toBeVisible();
  await expect(page.getByTestId('story-stage').locator('.fq-cine-pond')).toBeAttached();
  await expect(page.getByTestId('story-stage').locator('.fq-cine-cutbar, .fq-cine-bowl')).toHaveCount(0);
  await page.getByTestId('button-story-skip').click();
  await expect(page.getByTestId('button-story-go')).toBeVisible();
});

test('the Voice button decides whether the film is heard, right away, and is remembered', async ({ page }) => {
  // The device voice (the natural voice is off here) is recorded instead of spoken: each sentence takes 0.4 s.
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-natural-voice', 'off');
    const spoken: string[] = [];
    (window as unknown as { spoken: string[] }).spoken = spoken;
    let queue: { text: string; onstart?: () => void; onend?: () => void }[] = [];
    const next = () => { const item = queue[0]; if (!item) return; setTimeout(() => { item.onstart?.(); spoken.push(item.text); setTimeout(() => { if (queue[0] === item) { queue.shift(); item.onend?.(); next(); } }, 400); }, 10); };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'Test', lang: 'en-US', voiceURI: 'Test', default: true }],
      speak(utterance: { text: string }) { queue.push(utterance); if (queue.length === 1) next(); },
      cancel() { queue = []; }, addEventListener() {}, removeEventListener() {}, pause() {}, resume() {},
    } });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = function (this: { text: string }, text: string) { this.text = text; };
  });
  await openChapterTwo(page, [...unitOne, 'unit-size']);
  // Words only: a blank utterance unlocks audio on a tap (iPhone) and is not part of the film.
  const spoken = () => page.evaluate(() => (window as unknown as { spoken: string[] }).spoken.filter((text) => text.trim()).length);
  // Sounds are off for this learner, so the film starts quiet.
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  const voice = page.getByTestId('button-story-voice');
  await expect(voice).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('story-panel-0')).toBeVisible();
  expect(await spoken()).toBe(0);
  // Voice on: the line on screen is read at once.
  await voice.click();
  await expect(voice).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(spoken).toBeGreaterThan(0);
  // Voice off: nothing more is read.
  await voice.click();
  const heard = await spoken();
  await page.waitForTimeout(1500);
  expect(await spoken()).toBe(heard);
  // The choice is kept for the next film.
  expect(await page.evaluate(() => localStorage.getItem('fraction-quest-film-voice'))).toBe('off');
});

test('a film starts with the voice the learner chose last time, even when sounds are off', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fraction-quest-film-voice', 'on'));
  await openChapterTwo(page, [...unitOne, 'unit-size']);
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('button-story-voice')).toHaveAttribute('aria-pressed', 'true');
});

/** A short silent WAV clip: what the natural voice "plays" in these tests. */
function silentWav(seconds = 0.3) {
  const rate = 8000; const samples = Math.round(rate * seconds); const data = Buffer.alloc(samples * 2);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8); header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22); header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

test('when the natural voice fails during a film, the device voice never takes over or replays the dialogue', async ({ page }) => {
  test.setTimeout(90_000);
  // The device voice is recorded instead of spoken. The natural voice is on (the default) and the film's voice is on.
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-film-voice', 'on');
    const spoken: string[] = [];
    (window as unknown as { spoken: string[] }).spoken = spoken;
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'Device', lang: 'en-US', voiceURI: 'Device', default: true }],
      speak(utterance: { text: string; onend?: () => void }) { spoken.push(utterance.text); setTimeout(() => utterance.onend?.(), 50); },
      cancel() {}, addEventListener() {}, removeEventListener() {}, pause() {}, resume() {},
    } });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = function (this: { text: string }, text: string) { this.text = text; };
  });
  await openChapterTwo(page, [...unitOne, 'unit-size']);
  // Natural-voice clips play, except one sentence that fails every time it is asked for, from the pack and from the
  // voice server alike (a broken connection for that clip).
  let clips = 0;
  let broken: string | null = null;
  const clip = (route: import('@playwright/test').Route) => {
    clips += 1;
    const url = route.request().url();
    const sentence = /text=([^&]+)/.exec(url)?.[1] ?? url.split('/').pop()!;
    if (broken === null && clips === 3) broken = sentence;
    return clips >= 3 && (sentence === broken || /\/voice\/speech/.test(url))
      ? route.fulfill({ status: 500, body: 'voice failed' })
      : route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav() });
  };
  await page.route('**/api/storage/public-objects/voice/**', clip);
  await page.route('**/api/voice/speech**', clip);
  await page.route('**/api/voice/status', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"state":"ready"}' }));

  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('button-story-voice')).toHaveAttribute('aria-pressed', 'true');
  // The film still plays to its end, with its captions.
  await expect(page.getByTestId('button-story-go')).toBeVisible({ timeout: 60_000 });
  expect(clips, 'the natural voice was asked for its clips').toBeGreaterThanOrEqual(3);
  const words = await page.evaluate(() => (window as unknown as { spoken: string[] }).spoken.filter((text) => text.trim()));
  expect(words, 'the device voice must not read the film').toEqual([]);
});

test('the finale ends with Hoot pointing to the daily riddle', async ({ page }) => {
  const { MISSIONS } = await import('../src/game');
  const { getBuildChecks, getWorksheet } = await import('../src/learning-content');
  // Every lesson finished: practice, each build and the whole worksheet, so all 15 pieces are found.
  const learning = Object.fromEntries(MISSIONS.map((mission) => [mission.id, {
    practiceDone: true, helpUses: 0, misconceptions: {}, completedAt: 1,
    checks: Object.fromEntries(getBuildChecks(mission.id).map((check) => [check.id, { passed: true }])),
    worksheet: Object.fromEntries(getWorksheet(mission.id).map((row) => [row.id, { draft: row.answer, checkedValue: row.answer }])),
  }]));
  const progress = { completedMissionIds: MISSIONS.map((mission) => mission.id), starsByMission: {}, reviewQueue: [], assessments: [], learning };
  const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false, story: { prologueSeen: true, choices: {} },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: true } };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByRole('button', { name: /Chapter 2, Pond/ }).click();
  await page.getByTestId('storybook-finale').click();
  await page.getByTestId('button-story-skip').click();
  await expect(page.getByText('Every day, a new riddle waits by the stone. Keep your lantern lit, Keeper!').first()).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('finale.png') });
});
