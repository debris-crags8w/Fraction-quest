import { expect, test } from './fixtures';

const dayKey = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const record = (extra: Record<string, unknown> = {}) => ({ practiceDone: true, checks: {}, worksheet: {}, helpUses: 0, misconceptions: {}, ...extra });

test('the grown-ups report opens with the week at a glance, a lesson to help with at home, and a summary to share', async ({ page }) => {
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
  const challenge = await page.getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();

  const glance = page.getByTestId('parent-glance');
  await expect(glance).toBeVisible();
  await expect(page.getByTestId('glance-summary')).toContainText('practiced on 3 of the last 7 days (38 minutes) and finished 2 lessons.');
  await expect(glance.getByRole('heading', { name: 'Learned this week' })).toBeVisible();
  await expect(glance.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByTestId('glance-grade-3')).toContainText('Not started yet');
  await expect(page.getByTestId('glance-focus')).toContainText('3 wrong tries');
  await expect(page.getByTestId('glance-focus')).toContainText('Try at home');
  await expect(page.getByTestId('glance-share-text')).toContainText('Practiced 3 of 7 days (38 min). Finished 2 lessons.');

  await page.getByTestId('button-share-week').click();
  await expect(page.getByRole('status').filter({ hasText: 'Shared.' })).toBeVisible();
  const shared = await page.evaluate(() => (window as Window & { __shared?: string }).__shared);
  expect(shared).toContain('Working on: More parts, smaller parts (Grade 3, 3.NF.3d).');
  // The full report is still there below.
  await expect(page.getByRole('heading', { name: 'Full report' })).toBeVisible();
  await expect(page.getByTestId('stat-lessons')).toBeVisible();
});
