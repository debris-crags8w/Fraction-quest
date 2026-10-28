import AxeBuilder from '@axe-core/playwright';
// The plain Playwright test, not ./fixtures: the fixtures' handler skips the first lesson's Watch, Words and Try
// screens whenever they show, and these tests check those screens themselves.
import { expect, test } from '@playwright/test';
import { MISSIONS } from '../src/game';
import { getBuildChecks, getWorksheet, isYesNoProblem } from '../src/learning-content';
import { seasonOn } from '../src/seasons';
import { completeIdeas, finishPutTogether } from './lesson-walk';

type Page = import('@playwright/test').Page;

/** WCAG 2.0 and 2.1, levels A and AA: what axe can check on a rendered screen (it is not a full audit). */
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/** Known failures, each a screen and an axe rule, that wait for a decision (a colour change, say, needs a mockup and
    approval first). The test fails on any violation that is not listed here, and also when a listed one stops
    happening, so this list can only get shorter. It is empty now: add an entry here, with a note saying why, rather
    than loosening the check. */
const KNOWN: string[] = [];

/** The default day, 10 March: every month has a theme now (March is "Windy kites"), so the tests run under it unless a
    test turns seasonal themes off. Then Halloween and Christmas, the two holidays with their own full dressing. */
const PLAIN_DAY = new Date(2026, 2, 10, 10, 0, 0);
const HALLOWEEN_DAY = new Date(2026, 9, 20, 10, 0, 0);
const CHRISTMAS_DAY = new Date(2026, 11, 15, 10, 0, 0);

const dayKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/** Collects what axe finds on each screen a test visits. `finish` fails on a new violation, and on a KNOWN one that
    stopped happening on a screen this test checked. */
/** For a colour contrast failure: the colours axe measured. */
function contrast(node: { any: { data?: { fgColor?: string; bgColor?: string; contrastRatio?: number; expectedContrastRatio?: string } }[] }) {
  const data = node.any[0]?.data;
  return data?.contrastRatio ? ` [${data.fgColor} on ${data.bgColor}: ${data.contrastRatio}, needs ${data.expectedContrastRatio}]` : '';
}

class Audit {
  found: { key: string; detail: string }[] = [];
  screens = new Set<string>();
  constructor(readonly page: Page, private readonly suffix = '') {}

  async scan(screen: string) {
    const name = `${screen}${this.suffix}`;
    this.screens.add(name);
    // Let animations end first: a half-faded line would be judged at its half-faded colour. A Watch demo that is still
    // playing has its Replay button disabled.
    await this.page.waitForFunction(() => !(document.querySelector('[data-testid="button-intro-replay"]') as HTMLButtonElement | null)?.disabled, null, { timeout: 30_000 });
    await this.page.waitForTimeout(400);
    await this.page.waitForFunction(() => document.getAnimations().every((animation) => animation.playState !== 'running' || animation.effect?.getComputedTiming().iterations === Infinity), null, { timeout: 30_000 });
    await this.page.waitForTimeout(150);
    const { violations } = await new AxeBuilder({ page: this.page }).withTags(WCAG).analyze();
    for (const violation of violations) {
      this.found.push({
        key: `${name}: ${violation.id}`,
        detail: `${name}: ${violation.id} (${violation.impact}) on ${violation.nodes.length} element(s), e.g. ${violation.nodes.slice(0, 3).map((node) => `${node.target.join(' ')} ${node.html.slice(0, 140)}${contrast(node)}`).join(' | ')}`,
      });
    }
  }

  finish() {
    const keys = new Set(this.found.map((item) => item.key));
    expect(this.found.filter((item) => !KNOWN.includes(item.key)).map((item) => item.detail), 'new accessibility violations').toEqual([]);
    expect(KNOWN.filter((key) => this.screens.has(key.slice(0, key.lastIndexOf(': '))) && !keys.has(key)), 'violations that no longer happen: remove them from KNOWN').toEqual([]);
  }
}

type Seed = {
  progress?: Record<string, unknown>;
  fun?: Record<string, unknown>;
  date?: Date;
  /** Pretend to be the app on a phone, with this subscription. */
  shell?: Record<string, unknown>;
  /** The published website's limit (lesson 2 onward points to the app). */
  webLimit?: boolean;
};

const record = (extra: Record<string, unknown> = {}) => ({ practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, ...extra });
const masteredRecord = (missionId: string, extra: Record<string, unknown> = {}) => record({
  checks: Object.fromEntries(getBuildChecks(missionId).map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])),
  worksheet: Object.fromEntries(getWorksheet(missionId).map((problem) => [problem.id, { draft: problem.answer, checkedValue: problem.answer, attempts: 1, supported: false }])),
  ...extra,
});
const progressOf = (learning: Record<string, unknown>, completed: string[] = []) => ({
  completedMissionIds: completed, starsByMission: {}, reviewQueue: [], assessments: [], learning,
});
const finishedProgress = (ids: string[], completedAt = 1) => progressOf(
  Object.fromEntries(ids.map((id) => [id, masteredRecord(id, { completedAt })])), ids);

/** Open the app as a guest (the API says nobody is signed in), on a fixed day, with saved progress and settings. */
async function openApp(page: Page, seed: Seed = {}) {
  const date = seed.date ?? PLAIN_DAY;
  await page.clock.setFixedTime(date);
  await page.addInitScript(({ progress, fun, day, shell, webLimit }) => {
    if (webLimit) (window as Window & { __fqWebLimit?: boolean }).__fqWebLimit = true;
    if (shell) {
      const scope = window as Window & { fractionQuestShell?: unknown; ReactNativeWebView?: unknown };
      scope.fractionQuestShell = { platform: 'ios', wifi: true, subscription: shell };
      scope.ReactNativeWebView = { postMessage: () => undefined };
    }
    if (localStorage.getItem('fraction-quest-fun-v1:guest')) return;
    if (progress) localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(progress));
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({
      xp: 0, day, answeredToday: 0, sound: false, story: { prologueSeen: true }, breakPreferences: { intervalMinutes: 0, quietMode: false }, ...fun,
    }));
  }, { progress: seed.progress, fun: seed.fun, day: dayKey(date), shell: seed.shell, webLimit: seed.webLimit });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  const map = page.getByRole('heading', { name: /your learning map/i });
  await expect(guest.or(map)).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  await expect(map).toBeVisible();
}

async function openMenuItem(page: Page, testId: string) {
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId(testId).click();
}

async function passGate(page: Page) {
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
}

/** A lesson card on the map: open it (the current one is open already) and press Start. */
async function startLesson(page: Page, id: string) {
  const start = page.getByTestId(`button-start-mission-${id}`);
  if (!(await start.isVisible())) await page.getByTestId(`button-node-${id}`).click({ force: true });
  await start.click();
}

/** A new lesson opens with story screens (the setup and prologue once, then the chapter comic, which may ask for a
    choice). `audit` checks each. */
async function passStory(page: Page, audit?: Audit) {
  for (let screen = 0; screen < 3; screen++) {
    await page.waitForTimeout(50);
    const introGo = page.getByTestId('button-story-intro-go');
    if (await introGo.isVisible()) {
      await audit?.scan('the story intro');
      await introGo.click();
      continue;
    }
    const skip = page.getByTestId('button-story-skip');
    if (await skip.isVisible()) await skip.click();
    const go = page.getByTestId('button-story-go');
    if (!(await go.isVisible())) return;
    await audit?.scan('a story chapter comic');
    const choice = page.getByTestId('button-story-choice-0');
    if (await choice.isVisible()) {
      await choice.click();
      await audit?.scan('a story chapter comic with a choice made');
    }
    await go.click();
  }
}

/** The short Watch before Build it (every lesson after the first). */
async function skipQuickWatch(page: Page, audit?: Audit) {
  for (let step = 0; step < 2; step++) {
    const skip = page.getByTestId('button-intro-skip');
    if (!(await skip.isVisible())) return;
    await audit?.scan(step === 0 ? 'the short Watch before Build it' : 'the short Try before Build it');
    await skip.click();
  }
}

/** A break offer can cover a screen (a child sees one after each part of a lesson): check it, then skip it. It is
    clicked in the page itself, so nothing waits on a button that the offer might cover. */
async function skipBreak(page: Page, audit?: Audit) {
  if (await page.evaluate(() => !!document.querySelector('[data-testid="brain-break-overlay"]'))) {
    await audit?.scan('the break offer');
    await page.evaluate(() => (document.querySelector('[data-testid="button-break-skip-top"]') as HTMLElement | null)?.click());
  }
}

async function setStepper(page: Page, id: string, target: number) {
  for (let guard = 0; guard < 60; guard++) {
    const text = (await page.getByTestId(`value-${id}`).textContent())?.trim() ?? '';
    const value = /^\d+$/.test(text) ? Number(text) : 0;
    if (value === target) return;
    await page.getByTestId(`button-${id}-${target > value ? 'plus' : 'minus'}`).click();
  }
  throw new Error(`Could not set ${id} to ${target}`);
}

/** Build a Build it check's model, the way a child does: how many parts, then which ones. */
async function buildModel(page: Page, checkId: string, builder: 'a' | 'b', target: ReturnType<typeof getBuildChecks>[number]['target']) {
  const id = `${checkId}-${builder}`;
  await setStepper(page, `${id}-d`, target.d);
  if (target.kind === 'bar') {
    if (target.wholes > 1) await setStepper(page, `${id}-wholes`, target.wholes);
    for (let part = 0; part < target.n; part++) await page.getByTestId(`piece-${id}-${part}`).click();
  } else if (target.kind === 'set') {
    for (let group = 0; group < target.n; group++) await page.getByTestId(`group-${id}-${group}`).click();
  } else {
    await page.getByTestId(`tick-${id}-${target.n}`).click();
  }
}

/** A child's first lesson: Watch (bar, then number line), Words (two pages), Try (bar, then number line). */
async function walkFirstLessonIntro(page: Page, audit: Audit) {
  const intro = page.getByTestId('intro-steps');
  await expect(intro).toBeVisible();
  await audit.scan('the first lesson Watch (bar)');
  await intro.getByTestId('button-intro-watched').click();
  await expect(intro.getByTestId('intro-line')).toHaveAttribute('data-step', 'watch');
  await audit.scan('the first lesson Watch (number line)');
  await intro.getByTestId('button-intro-watched').click();
  await expect(intro.getByTestId('what-is-a-fraction')).toBeVisible();
  await audit.scan('the first lesson Words, page 1');
  await intro.getByTestId('button-what-next').click();
  await expect(intro.getByTestId('fraction-words')).toBeVisible();
  await audit.scan('the first lesson Words, page 2');
  await intro.getByTestId('button-words-next').click();
  await expect(intro.locator('[data-step="try"]')).toBeVisible();
  await audit.scan('the first lesson Try (bar)');
  const tryOne = async (plus: number, tap: string) => {
    for (let i = 0; i < plus; i++) await intro.getByTestId('button-intro-plus').click();
    await intro.getByTestId(tap).click();
    await intro.getByTestId('button-intro-next').click();
  };
  await tryOne(1, 'intro-piece-0');
  await tryOne(2, 'intro-piece-1');
  await expect(intro.getByTestId('intro-line')).toHaveAttribute('data-step', 'try');
  await audit.scan('the first lesson Try (number line)');
  await tryOne(2, 'intro-tick-2');
  for (let i = 0; i < 3; i++) await intro.getByTestId('button-intro-plus').click();
  await intro.getByTestId('intro-tick-3').click();
  await intro.getByTestId('button-intro-next').click();
  await expect(page.getByTestId('idea-learn-screen')).toBeVisible();
}

test('a child’s first lesson, from the story to the lesson page, passes an automated WCAG A/AA check', async ({ page }) => {
  test.setTimeout(300_000);
  const audit = new Audit(page);
  // Not seeded as having seen the story: its setup and prologue show too.
  await openApp(page, { fun: { story: {}, breakPreferences: { intervalMinutes: 15, quietMode: false } } });
  await audit.scan('the map');

  const lesson = MISSIONS[0]!;
  await startLesson(page, lesson.id);
  await passStory(page, audit);
  await walkFirstLessonIntro(page, audit);

  let learnPages = 0;
  let questions = 0;
  let stories = 0;
  await completeIdeas(page, lesson, {
    // One Learn page and one question are enough: every page and question shares the same layout.
    onLearnPage: async () => { if (learnPages++ === 0) await audit.scan('a Learn page'); },
    onQuestion: async (question) => {
      if (questions++ > 0) return;
      await audit.scan('a question');
      // A wrong answer first, to see the helper's reply, then the right one.
      const wrong = (question.correctChoice + 1) % question.choices.length;
      await page.getByTestId(`button-answer-${question.id}-${wrong}`).click();
      await page.getByTestId('button-check-answer').click();
      await expect(page.getByTestId('status-feedback')).toHaveAttribute('data-result', 'retry');
      await audit.scan('a question answered wrong');
      await page.getByTestId('button-try-again').click();
      await page.getByTestId(`button-answer-${question.id}-${question.correctChoice}`).click();
    },
    afterCheck: async () => { if (questions === 1) { questions++; await audit.scan('a question answered right'); } },
  });
  await finishPutTogether(page, lesson, {
    onQuestion: async (question) => { if (question.id.endsWith('-story') && stories++ === 0) await audit.scan('a Put it together story problem'); },
  });
  // The lesson page may open under a break offer. Waited for in the page itself: a Playwright action would set off the
  // Watch screen's handlers behind the offer.
  await page.waitForFunction(() => !!document.querySelector('[data-testid="learning-lab"]'));
  await skipBreak(page, audit);
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await skipQuickWatch(page, audit);
  await audit.scan('the lesson page');
  audit.finish();
});

test('the lesson page: Build it checks, More build practice, the worksheet and the finish screen pass the check', async ({ page }) => {
  test.setTimeout(240_000);
  const audit = new Audit(page);
  const first = MISSIONS[0]!;
  const lesson = MISSIONS[1]!;
  const checks = getBuildChecks(lesson.id);
  const worksheet = getWorksheet(lesson.id);
  const learning = (second: Record<string, unknown>) => progressOf({ [first.id]: masteredRecord(first.id, { completedAt: 1 }), [lesson.id]: second }, [first.id]);
  await openApp(page, { progress: learning(record()) });
  await startLesson(page, lesson.id);
  await passStory(page);
  await expect(page.getByTestId('learning-lab')).toBeVisible();
  await skipQuickWatch(page, audit);
  await expect(page.getByTestId(`check-${checks[0]!.id}`)).toBeVisible();
  await audit.scan('a Build it check');
  // Build both models, then give a wrong reason: Check lists what to fix.
  const [check] = checks;
  await buildModel(page, check!.id, 'a', check!.target);
  await expect(page.getByTestId(`status-primary-${check!.id}`)).toBeVisible();
  await audit.scan('a Build it check with the first model built');
  await buildModel(page, check!.id, 'b', { ...check!.target, kind: check!.target.kind === 'line' ? 'bar' : 'line', wholes: Math.max(1, Math.ceil(check!.target.n / check!.target.d)) });
  const wrongReason = check!.reasons.findIndex((_, reason) => reason !== check!.correctReason);
  await page.getByTestId(`radio-reason-${check!.id}-${wrongReason}`).check({ force: true });
  await audit.scan('a Build it check with both models built');
  await page.getByTestId(`button-check-${check!.id}`).click();
  await expect(page.getByTestId(`status-errors-${check!.id}`)).toBeVisible();
  await audit.scan('a Build it check with its mistakes listed');

  // Every build check passed: More build practice and the worksheet.
  const reopen = async (second: Record<string, unknown>) => {
    await page.evaluate((progress) => localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(progress)), learning(second));
    await page.reload();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await startLesson(page, lesson.id);
    await passStory(page);
    await skipQuickWatch(page);
  };
  await reopen(record({ checks: Object.fromEntries(checks.map((check) => [check.id, { passed: true, supported: false, attempts: 1 }])) }));
  await expect(page.getByTestId('section-build-practice')).toBeVisible();
  await audit.scan('the lesson page with More build practice and the worksheet');
  await page.getByTestId('button-start-build-practice').click();
  await expect(page.getByTestId('progress-build-practice')).toBeVisible();
  await audit.scan('More build practice, a question');

  // A worksheet question answered wrong.
  const yesNo = worksheet.find((problem) => isYesNoProblem(problem) && !problem.modelRequired && !problem.areaTask);
  if (yesNo) {
    const wrong = yesNo.answer.trim().toLowerCase() === 'yes' ? 'no' : 'yes';
    const row = page.getByTestId(`row-worksheet-${yesNo.id}`);
    await row.getByTestId(`button-worksheet-${yesNo.id}-${wrong}`).click();
    await row.getByTestId(`button-check-worksheet-${yesNo.id}`).click();
    await expect(page.getByTestId(`status-worksheet-${yesNo.id}`)).toContainText('Not yet.');
    await audit.scan('a worksheet question answered wrong');
  }

  // Everything done but the finish: the finish button, the finish screen and its stars.
  await reopen(masteredRecord(lesson.id));
  await expect(page.getByTestId('callout-lab-finish')).toBeVisible();
  await audit.scan('the lesson page, ready to finish');
  await page.getByTestId('button-lab-finish').click();
  await skipBreak(page, audit);
  await expect(page.getByTestId('status-mission-complete')).toBeVisible();
  await audit.scan('the lesson finish screen with its stars');
  audit.finish();
});

test('the map, the More menu, Practice more, daily practice and the check-ins pass the check', async ({ page }) => {
  test.setTimeout(240_000);
  const audit = new Audit(page);
  const all = MISSIONS.slice(0, 6).map((mission) => mission.id);
  await openApp(page, { progress: finishedProgress(all) });
  await audit.scan('the map with lessons finished');
  await page.getByTestId(`button-node-${all[1]}`).click({ force: true });
  await audit.scan('the map with a lesson card open');
  await page.getByTestId('button-app-menu').click();
  await expect(page.getByTestId('app-menu')).toBeVisible();
  await audit.scan('the More menu');
  await page.keyboard.press('Escape');

  // Practice more on a finished lesson.
  const withPractice = page.locator('[data-testid^="button-practice-more-"]').first();
  for (const id of all) {
    if (await withPractice.isVisible()) break;
    await page.getByTestId(`button-node-${id}`).click({ force: true });
  }
  await withPractice.click();
  await expect(page.getByTestId('button-check-answer')).toBeVisible();
  await audit.scan('a Practice more question');
  await page.locator('[data-testid^="button-answer-"]').first().click();
  await page.getByTestId('button-check-answer').click();
  await expect(page.getByTestId('status-feedback')).toBeVisible();
  await audit.scan('a Practice more question, answered');
  await page.getByTestId('button-back-map').click();

  await openMenuItem(page, 'button-start-daily-practice');
  await expect(page.locator('#daily-question-title')).toBeVisible();
  await audit.scan('daily practice');
  await page.getByTestId('button-daily-hint').click();
  await audit.scan('daily practice with its hint open');
  await page.getByTestId('button-daily-back').click();

  await openMenuItem(page, 'button-open-assessments');
  await expect(page.locator('[data-testid^="assessment-card-"]').first()).toBeVisible();
  await audit.scan('the check-ins list');
  await page.locator('[data-testid^="button-start-"]').first().click();
  await expect(page.getByTestId('assessment-runner')).toBeVisible();
  await audit.scan('a check-in question');
  audit.finish();
});

test('the games, Find my level and the Storybook pass the check', async ({ page }) => {
  test.setTimeout(240_000);
  const audit = new Audit(page);
  const all = MISSIONS.slice(0, 8).map((mission) => mission.id);
  await openApp(page, { progress: finishedProgress(all) });
  await openMenuItem(page, 'button-open-concept-games');
  await expect(page.getByTestId('games-menu')).toBeVisible();
  await audit.scan('the concept game hub');
  const games = page.locator('[data-testid^="link-game-"]');
  const ids = await games.evaluateAll((items) => items.map((item) => item.getAttribute('data-testid')!));
  for (const id of ids) {
    if (!(await page.getByTestId('games-menu').isVisible())) await openMenuItem(page, 'button-open-concept-games');
    await page.getByTestId(id).click();
    await audit.scan(`the game ${id.replace('link-game-', '')}`);
    if (id === 'link-game-match') {
      // Two cards turned over: a face-up fraction card and a face-up bar card.
      await page.getByTestId('button-match-card-0').click();
      await page.getByTestId('button-match-card-3').click();
      await audit.scan('the game match with two cards turned');
    }
    const back = page.getByTestId('button-concept-games-menu');
    if (await back.isVisible()) await back.click();
    else await page.goto('/').then(() => page.getByRole('heading', { name: /your learning map/i }).waitFor());
  }
  if (await page.getByTestId('games-menu').isVisible()) await page.getByTestId('button-concept-games-exit').click();

  await openMenuItem(page, 'button-find-level');
  await expect(page.getByTestId('placement-intro')).toBeVisible();
  await audit.scan('Find my level, the start');
  await page.getByTestId('button-placement-start').click();
  await expect(page.getByTestId('placement-quiz')).toBeVisible();
  await audit.scan('Find my level, a question');

  await page.goto('/');
  await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
  await openMenuItem(page, 'button-open-story-cards');
  await expect(page.getByTestId('storybook-story')).toBeVisible();
  await audit.scan('the Storybook');
  audit.finish();
});

test('the grown-ups area: the gate, the report and every settings row pass the check', async ({ page }) => {
  test.setTimeout(240_000);
  const audit = new Audit(page);
  const done = MISSIONS.slice(0, 5).map((mission) => mission.id);
  const day = dayKey(PLAIN_DAY);
  await openApp(page, {
    progress: finishedProgress(done, PLAIN_DAY.getTime() - 86_400_000),
    fun: { dayStreak: 2, lastActiveDay: day, activity: { [day]: { minutes: 9, answered: 3 } } },
  });
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  await expect(page.getByTestId('parent-gate')).toBeVisible();
  await audit.scan('the grown-ups gate');
  await passGate(page);
  await expect(page.getByTestId('parent-glance')).toBeVisible();
  await audit.scan('the grown-ups progress report');
  await page.getByTestId('tab-parent-settings').click();
  await expect(page.getByTestId('parent-settings')).toBeVisible();
  await audit.scan('the grown-ups settings, rows closed');
  const rows = page.locator('[data-testid="parent-settings"] > details');
  const total = await rows.count();
  for (let index = 0; index < total; index++) {
    const summary = rows.nth(index).locator('summary').first();
    const title = (await summary.innerText()).split('\n')[0]!.trim();
    await summary.click();
    await audit.scan(`the grown-ups settings row "${title}" open`);
    await summary.click();
  }
  audit.finish();
});

test('the sign-in, new account and password recovery screens pass the check', async ({ page }) => {
  const audit = new Audit(page);
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const failing = pathname === '/api/auth/signup';
    await route.fulfill({
      status: failing ? 409 : 401, contentType: 'application/json',
      body: JSON.stringify({ error: failing ? 'That username is taken. Try adding a number.' : 'Not signed in.' }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('tab-sign-in')).toBeVisible();
  await audit.scan('the sign-in screen');
  await page.getByTestId('tab-create-account').click();
  await expect(page.getByTestId('input-display-name')).toBeVisible();
  await audit.scan('the new account screen');
  await page.getByTestId('input-username').fill('star_fox');
  await page.getByTestId('input-password').fill('safe-test-password');
  await page.getByRole('checkbox', { name: /I am a parent or caregiver/i }).check();
  await page.getByTestId('button-login-submit').click();
  await expect(page.getByTestId('text-login-error')).toBeVisible();
  await audit.scan('the new account screen with an error');
  await page.getByTestId('tab-sign-in').click();
  await page.getByTestId('button-forgot-password').click();
  await expect(page.getByTestId('input-recovery-code')).toBeVisible();
  await audit.scan('the password recovery screen');
  audit.finish();
});

test('the ask for a grown-up and the paywall pass the check', async ({ page }) => {
  test.setTimeout(240_000);
  const audit = new Audit(page);
  const plans = [{ plan: 'yearly', price: '$39.99', amount: 39.99, currency: 'USD' }, { plan: 'monthly', price: '$4.99', amount: 4.99, currency: 'USD' }];
  await openApp(page, { shell: { state: 'none', price: '$4.99', plans }, progress: finishedProgress([MISSIONS[0]!.id]) });
  await startLesson(page, MISSIONS[1]!.id);
  await expect(page.getByTestId('subscribe-ask')).toBeVisible();
  await audit.scan('the ask for a grown-up');
  await page.getByTestId('button-get-grown-up').click();
  await expect(page.getByTestId('parent-gate')).toBeVisible();
  await passGate(page);
  await expect(page.getByTestId('paywall')).toBeVisible();
  await audit.scan('the paywall');
  audit.finish();
});

test('the grown-ups Subscription row, in the app, passes the check', async ({ page }) => {
  test.setTimeout(240_000);
  const audit = new Audit(page);
  await openApp(page, { shell: { state: 'active', renewsAt: new Date(2026, 3, 3).getTime() } });
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  await passGate(page);
  await page.getByTestId('tab-parent-settings').click();
  await page.locator('[data-testid="settings-subscription"] summary').click();
  await expect(page.getByTestId('subscription-status')).toBeVisible();
  await audit.scan('the grown-ups settings row "Subscription" open');
  audit.finish();
});

test('the website’s page about the app passes the check', async ({ page }) => {
  test.setTimeout(240_000);
  const audit = new Audit(page);
  await openApp(page, { webLimit: true, progress: finishedProgress([MISSIONS[0]!.id]) });
  await startLesson(page, MISSIONS[1]!.id);
  await expect(page.getByTestId('web-app-only')).toBeVisible();
  await audit.scan('the website’s page about the app');
  await page.getByTestId('button-get-grown-up').click();
  await passGate(page);
  await expect(page.getByTestId('get-the-app')).toBeVisible();
  await audit.scan('the website’s get-the-app page');
  audit.finish();
});

test('the time-up screen passes the check', async ({ page }) => {
  const audit = new Audit(page);
  const day = dayKey(PLAIN_DAY);
  await page.clock.setFixedTime(PLAIN_DAY);
  await page.addInitScript((today) => {
    if (localStorage.getItem('fraction-quest-fun-v1:guest')) return;
    localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: today, answeredToday: 4, sound: false, story: { prologueSeen: true },
      activity: { [today]: { minutes: 20, answered: 4 } }, timeLimit: { minutes: 20 } }));
  }, day);
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('time-up'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  await expect(page.getByTestId('time-up')).toBeVisible();
  await audit.scan('the time-up screen');
  audit.finish();
});

/** The display modes the app offers. A seasonal theme comes from the date, not a switch. */
const preferences = (change: Record<string, unknown>) => ({ displayPreferences: { textSize: 'standard', highContrast: false, reducedMotion: false, seasonalThemes: false, storyMode: true, ...change } });
const MODES: { name: string; fun: Record<string, unknown>; date?: Date; reducedMotion?: boolean }[] = [
  { name: 'large text', fun: preferences({ textSize: 'large' }) },
  { name: 'high contrast', fun: preferences({ highContrast: true }) },
  { name: 'reduced motion', reducedMotion: true, fun: preferences({ reducedMotion: true }) },
  { name: 'Halloween theme', date: HALLOWEEN_DAY, fun: preferences({ seasonalThemes: true }) },
  { name: 'Christmas theme', date: CHRISTMAS_DAY, fun: preferences({ seasonalThemes: true }) },
];

for (const mode of MODES) {
  test(`display mode "${mode.name}": the map, a first lesson, a question, the lesson page and the grown-ups settings pass the check`, async ({ page }) => {
    test.setTimeout(240_000);
    const audit = new Audit(page, ` (${mode.name})`);
    if (mode.reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
    await openApp(page, { date: mode.date, fun: mode.fun });
    await audit.scan('the map');
    const lesson = MISSIONS[0]!;
    await startLesson(page, lesson.id);
    await passStory(page, audit);
    await walkFirstLessonIntro(page, audit);
    let learnPages = 0;
    let questions = 0;
    // Idea 1 only (its Learn pages and first practice): every idea shares the same layout.
    await completeIdeas(page, lesson, {
      until: 1,
      onLearnPage: async () => { if (learnPages++ === 0) await audit.scan('a Learn page'); },
      onQuestion: async () => { if (questions++ === 0) await audit.scan('a question'); },
      afterCheck: async () => { if (questions === 1) { questions++; await audit.scan('a question answered right'); } },
    });
    // The lesson page, with the lesson's practice done (what a child sees after the questions).
    await page.evaluate((progress) => localStorage.setItem('fraction-quest-progress-v1:guest', JSON.stringify(progress)), progressOf({ [lesson.id]: record() }));
    await page.reload();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await startLesson(page, lesson.id);
    await passStory(page);
    await skipQuickWatch(page);
    await expect(page.getByTestId('learning-lab')).toBeVisible();
    await audit.scan('the lesson page');
    await page.getByTestId('button-lab-back').click();
    await expect(page.getByRole('heading', { name: /your learning map/i })).toBeVisible();
    await page.getByTestId('button-app-menu').click();
    await audit.scan('the More menu');
    await page.getByTestId('button-open-parent').click();
    await passGate(page);
    await audit.scan('the grown-ups report');
    await page.getByTestId('tab-parent-settings').click();
    await page.locator('[data-testid="settings-reading-and-display"] summary').click();
    await audit.scan('the grown-ups settings, Reading and display');
    audit.finish();
  });
}

test('the learning map passes the same check under every month’s theme, with the banner showing and nothing sticking out', async ({ context }) => {
  test.setTimeout(240_000);
  const audits: Audit[] = [];
  for (let month = 0; month < 12; month++) {
    const day = new Date(2026, month, 15, 10, 0, 0);
    const page = await context.newPage();
    // A11Y_SEASON_LESSONS (like 5): that many lessons already finished this month, so Numi wears the costumes earned by then.
    const finished = Number(process.env.A11Y_SEASON_LESSONS ?? 0);
    const fun = finished ? { seasonLessons: { [seasonOn(day)!.key]: Array.from({ length: finished }, (_, at) => `lesson-${at}`) } } : undefined;
    await openApp(page, { date: day, fun });
    const audit = new Audit(page, ` in ${day.toLocaleString('en', { month: 'long' })}`);
    audits.push(audit);
    await expect(page.getByTestId('season-banner')).toBeVisible();
    if (finished === 5) await expect(page.getByTestId('season-banner')).toContainText('You earned every costume.');
    await audit.scan('the map');
    // The page must not scroll sideways at 390.
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `month ${month + 1} fits 390`).toBeLessThanOrEqual(391);
    // The banner fades to its second colour only in the last 44px (season.css), so its text must end above that
    // (Halloween and Christmas are dressed differently).
    const clearance = await page.evaluate(() => {
      const banner = document.querySelector('[data-testid="season-banner"]')!;
      const bottoms = [...banner.querySelectorAll('.fq-season-kicker, h2, p')].map((element) => element.getBoundingClientRect().bottom);
      return banner.getBoundingClientRect().bottom - 44 - Math.max(...bottoms);
    });
    if (![9, 11].includes(month)) expect(clearance, `month ${month + 1}: banner text ends above the fade`).toBeGreaterThanOrEqual(0);
    await page.close();
  }
  for (const audit of audits) audit.finish();
});
