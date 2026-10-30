import { expect, test, type Page } from './fixtures';

const dayKey = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const record = (extra: Record<string, unknown> = {}) => ({ practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, ...extra });

test('the grown-ups report shows the week, skills by standard, what to practice, the last 4 weeks, and a summary to share', async ({ page }) => {
  const finished = ['equal-parts', 'fraction-names', 'unit-fractions', 'unit-size'];
  const progress = {
    completedMissionIds: finished, starsByMission: {}, reviewQueue: [], assessments: [],
    learning: {
      'equal-parts': record({ completedAt: Date.now() - 20 * 86_400_000 }),
      'fraction-names': record({ completedAt: Date.now() - 20 * 86_400_000 }),
      'unit-fractions': record({ completedAt: Date.now() - 2 * 86_400_000 }),
      'unit-size': record({ completedAt: Date.now() - 86_400_000, misconceptions: { 'More parts, smaller parts': 3 } }),
    },
  };
  const fun = {
    xp: 200, day: dayKey(0), answeredToday: 3, dayStreak: 2, lastActiveDay: dayKey(0), sound: false, story: { prologueSeen: true },
    activity: { [dayKey(0)]: { minutes: 9, answered: 3 }, [dayKey(1)]: { minutes: 14, answered: 7 }, [dayKey(3)]: { minutes: 15, answered: 8 } },
  };
  await page.addInitScript(({ savedProgress, savedFun }) => {
    if (!localStorage.getItem('fraction-quest-fun-v1:guest')) {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
      localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
    }
    // Record what would go to the phone's share sheet.
    Object.defineProperty(navigator, 'share', { configurable: true, value: async (data: { text: string }) => { (window as Window & { __shared?: string }).__shared = data.text; } });
  }, { savedProgress: progress, savedFun: fun });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  // The check is a two-digit number (13 to 19) times 6 to 9, not a times-table fact a child knows.
  expect(Number(factors[1])).toBeGreaterThanOrEqual(13);
  expect(Number(factors[1])).toBeLessThanOrEqual(19);
  expect(Number(factors[2])).toBeGreaterThanOrEqual(6);
  expect(Number(factors[2])).toBeLessThanOrEqual(9);
  // A wrong answer shows a new question, and the right answer opens the report.
  await page.getByTestId('input-parent-gate').fill('1');
  await page.getByTestId('button-parent-gate').click();
  await expect(page.getByTestId('text-parent-gate-wrong')).toBeVisible();
  const again = (await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent())!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(again[1]) * Number(again[2])));
  await page.getByTestId('button-parent-gate').click();

  const glance = page.getByTestId('parent-glance');
  await expect(glance).toBeVisible();
  await expect(page.getByTestId('glance-summary')).toContainText('practiced on 3 of the last 7 days (38 minutes) and finished 2 lessons.');
  await expect(glance.getByRole('heading', { name: 'Learned this week' })).toBeVisible();
  await expect(glance.getByRole('listitem')).toHaveCount(2);
  // Skills by standard for the grade the child is in, with the lesson steps.
  const skills = page.getByTestId('parent-skills');
  await expect(skills.getByRole('heading', { name: 'Grade 3 skills' })).toBeVisible();
  await expect(page.getByTestId('parent-skill-3.NF.1')).toHaveAttribute('data-step', '1');
  await expect(page.getByTestId('parent-skill-3.NF.1')).toContainText('Splits a whole into equal parts and names them');
  await page.getByTestId('parent-skill-3.NF.1').getByRole('button').click();
  await expect(page.getByTestId('parent-skill-3.NF.1')).toContainText('1. ');
  await expect(page.getByTestId('parent-skills-grade-4')).toContainText('Not started · 14 skills');
  // What to practice, with an idea for home.
  // The heading is the idea (not the hint of one question), with one thing to try at home.
  await expect(page.getByTestId('parent-tip-0')).toContainText('Comparing fractions with the same top or bottom');
  await expect(page.getByTestId('parent-tip-0')).toContainText('3 wrong tries');
  await expect(page.getByTestId('parent-tip-0')).toContainText('Try this at home');
  await expect(page.getByTestId('parent-tip-0')).not.toContainText('More parts, smaller parts');
  // Nobody finished a worksheet this week, so no first-try rate is claimed for the week.
  await expect(glance).toContainText('—right the first time');
  await expect(glance).toContainText('without the Hint, this week’s lessons');
  // The last 4 weeks.
  await expect(page.getByTestId('parent-month')).toContainText('4lessons finished');
  await expect(page.getByTestId('parent-month-first-try')).toContainText('shown after two weeks');
  await expect(page.getByTestId('glance-share-text')).toContainText('Practiced 3 of 7 days (38 min). Finished 2 lessons.');

  await page.getByTestId('button-share-week').click();
  await expect(page.getByRole('status').filter({ hasText: 'Shared.' })).toBeVisible();
  const shared = await page.evaluate(() => (window as Window & { __shared?: string }).__shared);
  expect(shared).toContain('Working on: More parts, smaller parts (Grade 3, 3.NF.3d).');
  // The full report is still there below; settings are in their own tab.
  await expect(page.getByRole('heading', { name: 'Full report' })).toBeVisible();
  await expect(page.getByTestId('stat-lessons')).toBeVisible();
  await expect(page.getByTestId('section-break-settings')).toHaveCount(0);
  await page.getByTestId('tab-parent-settings').click();
  await expect(page.getByTestId('parent-report')).toHaveCount(0);
  await expect(page.getByTestId('settings-breaks')).toContainText('Every 15 min');
  await expect(page.getByTestId('settings-reminders')).toHaveCount(0);
});

test('Practice now and Add a Check-in put a card on the child\'s map, and it opens the practice', async ({ page }) => {
  const lessons = ['equal-parts', 'fraction-names', 'unit-fractions'];
  const progress = {
    completedMissionIds: lessons, starsByMission: {}, reviewQueue: [], assessments: [],
    grownUpPicks: [{ kind: 'checkin', id: 'unit-1-end', at: Date.now() }],
    learning: Object.fromEntries(lessons.map((id, i) => [id, record({ completedAt: Date.now() - (i + 1) * 86_400_000, misconceptions: i === 1 ? { 'Count all the equal parts first.': 2 } : {} })])),
  };
  await page.addInitScript((savedProgress) => {
    if (!localStorage.getItem('fraction-quest-fun-v1:guest')) {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify(savedProgress));
      localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-01-01', answeredToday: 0, dayStreak: 0, lastActiveDay: '2026-01-01', sound: false, story: { prologueSeen: true } }));
    }
  }, progress);
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  // A Check-in picked earlier is waiting on the map, and opens the Check-in.
  await page.getByTestId('button-picked-checkin-unit-1-end').click();
  await expect(page.getByTestId('assessment-runner')).toBeVisible();
  await page.goto('/');
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();

  await page.getByTestId('button-pick-practice-0').click();
  await expect(page.getByTestId('button-pick-practice-0')).toHaveText(/On your child’s map/);
  await expect(page.getByTestId('button-pick-practice-0')).toBeDisabled();
  await page.getByTestId('button-parent-back').click();

  const card = page.getByTestId('picked-for-you');
  await expect(card).toContainText('A grown-up picked this practice for you.');
  await expect(card.getByRole('button')).toHaveCount(3); // Listen, the Check-in, and the new practice
  await card.getByTestId('button-picked-practice-fraction-names').click();
  await expect(page.locator('.fq-play-kicker')).toContainText('Question 1 of 5');
});

async function openReport(page: Page, learning: Record<string, unknown>, inApp = false) {
  await page.addInitScript(({ saved, app }) => {
    if (!localStorage.getItem('fraction-quest-fun-v1:guest')) {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: Object.keys(saved), starsByMission: {}, reviewQueue: [], assessments: [], learning: saved }));
      localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day: '2026-01-01', answeredToday: 0, dayStreak: 0, lastActiveDay: '2026-01-01', sound: false, story: { prologueSeen: true } }));
    }
    const scope = window as Window & { __posted?: string[]; ReactNativeWebView?: unknown };
    scope.__posted = [];
    if (app) scope.ReactNativeWebView = { postMessage: (message: string) => scope.__posted!.push(message) };
  }, { saved: learning, app: inApp });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
  await expect(page.getByTestId('parent-report')).toBeVisible();
}

test('with no wrong tries the report still gives something to try at home, from the next lesson', async ({ page }) => {
  await openReport(page, { 'equal-parts': record({ completedAt: Date.now() - 2 * 86_400_000 }) });
  const card = page.getByTestId('parent-practice');
  await expect(card).not.toContainText('Nothing stands out yet');
  await expect(page.getByTestId('parent-home-idea')).toContainText('Try this at home');
  await expect(page.getByTestId('parent-home-idea')).toContainText('Next up: lesson 2, Fair parts in any shape');
  await expect(page.getByTestId('parent-home-idea')).toContainText('Fold a paper strip into 4 equal parts');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('printing from the app sends the report with every unit, other grade and skill open', async ({ page }) => {
  await openReport(page, Object.fromEntries(['equal-parts', 'fraction-names', 'unit-fractions'].map((id, i) => [id, record({ completedAt: Date.now() - (i + 1) * 86_400_000 })])), true);
  await expect(page.getByTestId('parent-skills-grade-4')).not.toHaveAttribute('open', '');
  await page.getByTestId('button-parent-print').click();
  const sent = await page.evaluate(() => ((window as Window & { __posted?: string[] }).__posted ?? []).map((message) => JSON.parse(message)));
  const print = sent.find((message) => message.type === 'print');
  expect(print).toBeTruthy();
  const opened = await page.evaluate((html) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return {
      otherGrades: [4, 5].map((grade) => (doc.querySelector(`[data-testid="parent-skills-grade-${grade}"]`) as HTMLDetailsElement | null)?.hasAttribute('open')),
      unitsClosed: [...doc.querySelectorAll('.fq-parent-report details.fq-parent-unit')].filter((item) => !item.hasAttribute('open')).length,
      unitCount: doc.querySelectorAll('.fq-parent-report details.fq-parent-unit').length,
      gradeSkills: doc.querySelectorAll('[data-testid="parent-skills"] .fq-skill').length,
    };
  }, print.html as string);
  expect(opened.otherGrades).toEqual([true, true]);
  expect(opened.unitCount).toBeGreaterThan(0);
  expect(opened.unitsClosed).toBe(0);
  expect(opened.gradeSkills).toBe(9); // every Grade 3 skill, not just the first 5
  // The screen goes back to how it was.
  await expect(page.getByTestId('parent-skills').locator('.fq-skill')).toHaveCount(5);
});
