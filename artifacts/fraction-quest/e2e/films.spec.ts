import { expect, test, type Page } from './fixtures';

/** Open chapter 2 in the Storybook with the given lessons finished. */
async function openChapterTwo(page: Page, done: string[], reducedMotion = false, funChanges: Record<string, unknown> = {}) {
  const progress = { completedMissionIds: done, starsByMission: {}, reviewQueue: [], assessments: [],
    learning: Object.fromEntries(done.map((id) => [id, { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, completedAt: 1 }])) };
  const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false,
    story: { prologueSeen: true, choices: { '1': 0, '2': 0 } },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion, seasonalThemes: false, storyMode: true }, ...funChanges };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByRole('button', { name: /Chapter 2, Pond/ }).click();
}

const unitOne = ['fraction-names', 'equal-parts', 'unit-fractions', 'fraction-of-area'];

test('chapter 2 film shows thirds and eighths, as Numi says, with more equal parts making smaller parts', async ({ page }) => {
  await openChapterTwo(page, unitOne);
  await page.getByRole('button', { name: /Chapter start · More parts, smaller parts/ }).click();
  const stage = page.getByTestId('story-stage');
  // Numi's line: the bars and their labels sit clear of the caption once the camera has moved (a tap finishes Pip's line and moves on).
  await expect(page.getByTestId('story-panel-0')).toBeVisible();
  await page.getByTestId('story-panels').click();
  await expect(page.getByTestId('story-next-hint')).toBeVisible();
  await page.getByTestId('story-panels').click();
  await expect(page.getByTestId('story-panel-1')).toContainText('thirds');
  await page.waitForTimeout(3000);
  const caption = await page.getByTestId('story-panel-1').boundingBox();
  for (const label of await stage.locator('.fq-cine-cutbar-label').all()) {
    const box = (await label.boundingBox())!;
    expect(box.y + box.height, 'a bar label is above the caption').toBeLessThanOrEqual(caption!.y);
  }
  await page.getByTestId('button-story-skip').click();
  await expect(stage.getByRole('img', { name: /One third and one eighth side by side: the third is bigger/ })).toBeAttached();
  await expect(stage.locator('.fq-cine-cutbar.is-thirds i')).toHaveCount(3);
  await expect(stage.locator('.fq-cine-cutbar.is-eighths i')).toHaveCount(8);
  await expect(stage.locator('.fq-cine-cutbar.is-thirds .fq-cine-frac')).toHaveAttribute('aria-label', '1 over 3');
  await expect(stage.locator('.fq-cine-cutbar.is-eighths .fq-cine-frac')).toHaveAttribute('aria-label', '1 over 8');
  await expect(stage.locator('.fq-cine-plate, .fq-cine-snack')).toHaveCount(0);
  // Equal parts look equal: both bars are the same length, and a third is about 8/3 of an eighth.
  const [thirds, eighths] = await Promise.all([stage.locator('.fq-cine-cutbar.is-thirds').boundingBox(), stage.locator('.fq-cine-cutbar.is-eighths').boundingBox()]);
  expect(Math.abs(thirds!.width - eighths!.width)).toBeLessThan(1);
  const third = await stage.locator('.fq-cine-cutbar.is-thirds i').first().boundingBox();
  const eighth = await stage.locator('.fq-cine-cutbar.is-eighths i').first().boundingBox();
  expect(third!.width / eighth!.width).toBeGreaterThan(2.4);
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

test('with the voice off, a finished caption waits long enough to read, and a tap on the picture moves on', async ({ page }) => {
  await openChapterTwo(page, [...unitOne, 'unit-size']);
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('button-story-voice')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('story-panel-0')).toBeVisible();
  // A tap while the words type finishes the line; the line then holds (about 12 characters a second plus 2 seconds).
  await page.getByTestId('story-panels').click();
  await expect(page.getByTestId('story-next-hint')).toBeVisible();
  await page.waitForTimeout(2500);
  await expect(page.getByTestId('story-panel-1')).toHaveCount(0);
  await expect(page.getByTestId('story-panel-0')).toBeVisible();
  // A tap on the finished caption goes straight to the next line.
  await page.getByTestId('story-panel-0').click();
  await expect(page.getByTestId('story-panel-1')).toBeVisible();
  await expect(page.getByTestId('story-next-hint')).toHaveCount(0);
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

test('in Safari, a paused or refused clip does not silence the rest of the film', async ({ page }) => {
  test.setTimeout(120_000);
  // Safari can pause the voice partway through a clip (when other audio starts), and can refuse to start a clip.
  // Here the second clip is paused once, and the fourth refuses to play once. Every clip the film plays is counted.
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-film-voice', 'on');
    const scope = window as unknown as { clipsPlayed: string[] };
    scope.clipsPlayed = [];
    const play = HTMLMediaElement.prototype.play;
    let blobPlays = 0;
    HTMLMediaElement.prototype.play = function (this: HTMLMediaElement) {
      if (!this.src.startsWith('blob:')) return play.call(this);
      blobPlays += 1;
      if (blobPlays === 4) return Promise.reject(new DOMException('Refused', 'NotAllowedError'));
      if (!scope.clipsPlayed.includes(this.src)) scope.clipsPlayed.push(this.src);
      const started = play.call(this);
      if (blobPlays === 2) setTimeout(() => this.pause(), 60);
      return started;
    };
  });
  await openChapterTwo(page, [...unitOne, 'unit-size']);
  const clip = (route: import('@playwright/test').Route) => route.fulfill({ status: 200, contentType: 'audio/wav', body: silentWav(0.4) });
  await page.route('**/api/storage/public-objects/voice/**', clip);
  await page.route('**/api/voice/speech**', clip);
  await page.route('**/api/voice/status', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"state":"ready"}' }));

  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('button-story-go')).toBeVisible({ timeout: 90_000 });
  const played = await page.evaluate(() => (window as unknown as { clipsPlayed: string[] }).clipsPlayed.length);
  expect(played, 'the voice carried on after Safari paused it and after a clip was refused').toBeGreaterThanOrEqual(5);
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

/** Open a chapter's opening film from the Storybook with every lesson finished, and skip to its last picture. */
async function openChapterStart(page: Page, unit: number, reducedMotion = false) {
  const { MISSIONS } = await import('../src/game');
  const ids = MISSIONS.map((mission) => mission.id);
  const progress = { completedMissionIds: ids, starsByMission: {}, reviewQueue: [], assessments: [],
    learning: Object.fromEntries(ids.map((id) => [id, { practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, completedAt: 1 }])) };
  const fun = { xp: 0, day: '2026-10-20', answeredToday: 0, dayStreak: 0, lastActiveDay: null, sound: false, story: { prologueSeen: true, choices: {} },
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion, seasonalThemes: false, storyMode: true } };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByRole('button', { name: new RegExp(`^Chapter ${unit},`) }).first().click();
  await page.getByRole('button', { name: /Chapter start/ }).first().click();
  await page.getByTestId('button-story-skip').click();
  return page.getByTestId('story-stage');
}

const CHAPTER_FILM_CHECKS: Record<number, (stage: ReturnType<Page['getByTestId']>) => Promise<void>> = {
  7: async (stage) => { await expect(stage.getByRole('img', { name: 'Three thirds join to make one whole wheel' })).toBeAttached(); await expect(stage.locator('.fq-cine-wheel i')).toHaveCount(3); },
  8: async (stage) => { await expect(stage.locator('.fq-cine-boot-shadow')).toHaveClass(/is-tall/); },
  9: async (stage) => { await expect(stage.getByRole('img', { name: /one half: the same spot as two fourths/ })).toHaveClass(/is-flipped/); },
  10: async (stage) => {
    // The half is cut into two fourths beside the other fourth; the sum stays the child's to find (no "three fourths").
    await expect(stage.getByRole('img', { name: /cut into two fourths, the same size as the other fourth/ })).toBeAttached();
    await expect(stage.getByRole('img', { name: /three fourths/ })).toHaveCount(0);
    // Three same-size fourths side by side: each is half the half sandwich it was cut from.
    const widths = await stage.locator('.fq-cine-sandwiches i').evaluateAll((pieces) => pieces.map((piece) => piece.getBoundingClientRect().width));
    expect(new Set(widths.map((width) => Math.round(width))).size).toBe(1);
  },
  11: async (stage) => {
    await expect(stage.getByRole('img', { name: /came out 2 times as long/ })).toBeAttached();
    const [short, long] = await Promise.all([stage.locator('.fq-cine-machine-in').boundingBox(), stage.locator('.fq-cine-machine-plank').boundingBox()]);
    expect(long!.width / short!.width).toBeCloseTo(2, 1);
  },
  12: async (stage) => {
    await expect(stage.getByRole('img', { name: 'The board is split into 4 equal pieces' })).toBeAttached();
    const widths = await stage.locator('.fq-cine-measure-board i').evaluateAll((parts) => parts.map((part) => Math.round(part.getBoundingClientRect().width)));
    expect(widths).toHaveLength(4);
    expect(new Set(widths).size).toBe(1);
  },
  13: async (stage) => {
    await expect(stage.getByRole('img', { name: /One sunflower seed out of 4 seeds/ })).toBeAttached();
    await expect(stage.locator('.fq-cine-seed-bag i')).toHaveCount(4);
    await expect(stage.locator('.fq-cine-chance [aria-label="1 over 4"]')).toBeAttached();
    await expect(stage.locator('.fq-cine-garden-plot.is-grown')).toHaveCount(4);
  },
  14: async (stage) => { await expect(stage.getByRole('img', { name: 'The dials show one half, 50 hundredths and 50 percent' })).toContainText('50%'); },
  15: async (stage) => {
    await expect(stage.getByRole('img', { name: /14 of the 15 pieces/ })).toBeAttached();
    await expect(stage.locator('.fq-cine-festival-stone i')).toHaveCount(15);
    await expect(stage.locator('.fq-cine-festival-stone i.is-empty')).toHaveCount(1);
  },
};
for (const [unit, check] of Object.entries(CHAPTER_FILM_CHECKS)) {
  test(`chapter ${unit} opens on a film that shows the chapter’s fraction idea`, async ({ page }) => {
    const stage = await openChapterStart(page, Number(unit));
    await page.waitForTimeout(3500); // the last picture's movements settle
    await check(stage);
  });
}

test('with Reduce motion, the new chapter films show where things end up without moving them', async ({ page }) => {
  const stage = await openChapterStart(page, 11, true);
  const plank = stage.locator('.fq-cine-machine-plank');
  await expect(plank).toHaveClass(/is-built/);
  expect(await plank.evaluate((el) => [getComputedStyle(el).animationName, getComputedStyle(el).opacity])).toEqual(['none', '1']);
});

test('while the voice is on its way, the caption says so, then the line types with the voice', async ({ page }) => {
  // The device voice (the natural voice is off) takes 2.5 seconds to start its first sentence.
  await page.addInitScript(() => {
    localStorage.setItem('fraction-quest-natural-voice', 'off');
    localStorage.setItem('fraction-quest-film-voice', 'on');
    // Sentences are spoken one after another; the first one with words starts late.
    let queue: { text: string; onstart?: () => void; onend?: () => void }[] = [];
    let first = true;
    const next = () => {
      const item = queue[0]; if (!item) return;
      const wait = item.text.trim() && first ? 2500 : 10;
      if (item.text.trim()) first = false;
      setTimeout(() => { item.onstart?.(); setTimeout(() => { if (queue[0] === item) { queue.shift(); item.onend?.(); next(); } }, 600); }, wait);
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {
      getVoices: () => [{ name: 'Test', lang: 'en-US', voiceURI: 'Test', default: true }],
      speak(utterance: { text: string }) { queue.push(utterance); if (queue.length === 1) next(); },
      cancel() { queue = []; }, addEventListener() {}, removeEventListener() {}, pause() {}, resume() {},
    } });
    (window as unknown as { SpeechSynthesisUtterance: unknown }).SpeechSynthesisUtterance = function (this: { text: string }, text: string) { this.text = text; };
  });
  await openChapterTwo(page, [...unitOne, 'unit-size']);
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  const waiting = page.getByTestId('story-voice-waiting');
  await expect(waiting).toBeVisible();
  await expect(waiting).toHaveText(/^Getting .+’s voice ready…$/);
  await expect(waiting).toHaveCount(0, { timeout: 8000 });
  await expect(page.getByTestId('story-panel-0').locator('.fq-cine-line')).not.toBeEmpty();
});

test('story music plays under the film when sounds are on; the Music button goes soft, then off, then back, and is remembered', async ({ page }) => {
  // Count the notes the music schedules.
  await page.addInitScript(() => {
    const scope = window as unknown as { notes: number; AudioContext: typeof AudioContext };
    scope.notes = 0;
    const Real = scope.AudioContext;
    scope.AudioContext = class extends Real {
      createOscillator() { scope.notes += 1; return super.createOscillator(); }
    } as typeof AudioContext;
  });
  await openChapterTwo(page, [...unitOne, 'unit-size'], false, { sound: true });
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  const music = page.getByTestId('button-story-music');
  await expect(music).toHaveAttribute('aria-pressed', 'true');
  await expect(music).toHaveText(/Music on/);
  await expect.poll(() => page.evaluate(() => (window as unknown as { notes: number }).notes)).toBeGreaterThan(3);
  // One tap: softer. The music keeps playing, and the choice is saved.
  await music.click();
  await expect(music).toHaveText(/Music soft/);
  await expect(music).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => localStorage.getItem('fraction-quest-film-music'))).toBe('soft');
  const softNotes = await page.evaluate(() => (window as unknown as { notes: number }).notes);
  await expect.poll(() => page.evaluate(() => (window as unknown as { notes: number }).notes)).toBeGreaterThan(softNotes);
  // Another tap: off. No more notes.
  await music.click();
  await expect(music).toHaveText(/Music off/);
  await expect(music).toHaveAttribute('aria-pressed', 'false');
  const notes = await page.evaluate(() => (window as unknown as { notes: number }).notes);
  await page.waitForTimeout(1500);
  expect(await page.evaluate(() => (window as unknown as { notes: number }).notes)).toBe(notes);
  expect(await page.evaluate(() => localStorage.getItem('fraction-quest-film-music'))).toBe('off');
  // Another: back to normal, and the music starts again.
  await music.click();
  await expect(music).toHaveText(/Music on/);
  await expect.poll(() => page.evaluate(() => (window as unknown as { notes: number }).notes)).toBeGreaterThan(notes);
  expect(await page.evaluate(() => localStorage.getItem('fraction-quest-film-music'))).toBe('on');
});

test('the next film starts at the music volume chosen last time, and an older saved "on" still means normal', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('fraction-quest-film-music', 'soft'));
  await openChapterTwo(page, [...unitOne, 'unit-size'], false, { sound: true });
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('button-story-music')).toHaveText(/Music soft/);
  await page.getByTestId('button-story-back').click();
  await page.evaluate(() => localStorage.setItem('fraction-quest-film-music', 'on'));
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('button-story-music')).toHaveText(/Music on/);
});

test('the music fades away and stops when the film ends, and starts again on Replay', async ({ page }) => {
  await page.addInitScript(() => {
    const scope = window as unknown as { notes: number; AudioContext: typeof AudioContext };
    scope.notes = 0;
    const Real = scope.AudioContext;
    scope.AudioContext = class extends Real {
      createOscillator() { scope.notes += 1; return super.createOscillator(); }
    } as typeof AudioContext;
  });
  await openChapterTwo(page, [...unitOne, 'unit-size'], false, { sound: true });
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  const notes = () => page.evaluate(() => (window as unknown as { notes: number }).notes);
  await expect.poll(notes).toBeGreaterThan(3);
  await page.getByTestId('button-story-skip').click();
  await expect(page.getByTestId('button-story-go')).toBeVisible();
  // On the end screen no new notes are scheduled (the fade lets the last ones die away).
  await page.waitForTimeout(600);
  const atEnd = await notes();
  await page.waitForTimeout(2500);
  expect(await notes()).toBe(atEnd);
  // The Music button is still there, still showing the choice, and Replay brings the music back.
  await expect(page.getByTestId('button-story-music')).toHaveText(/Music on/);
  await page.getByTestId('button-story-replay').click();
  await expect.poll(notes).toBeGreaterThan(atEnd);
});

test('with sounds off, or story music turned off by a grown-up, the film has no music and no Music button', async ({ page }) => {
  await openChapterTwo(page, [...unitOne, 'unit-size'], false, { sound: true,
    displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: true, storyMusic: false } });
  await page.getByRole('button', { name: /Lesson 2 · Same count, different sizes/ }).click();
  await expect(page.getByTestId('story-panel-0')).toBeVisible();
  await expect(page.getByTestId('button-story-music')).toHaveCount(0);
});
