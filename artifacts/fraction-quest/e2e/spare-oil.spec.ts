import { expect, test } from './fixtures';

const dayKey = (daysAgo: number) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

test('after a missed night, Hoot uses a drop of spare oil, the streak stays, and the notice shows once', async ({ page }) => {
  // Last right answer two days ago, nothing yesterday, one drop in the jar.
  const fun = {
    xp: 90, day: dayKey(2), answeredToday: 0, dayStreak: 9, lastActiveDay: dayKey(2), sound: false, spareOil: 1,
    story: { prologueSeen: true }, activity: { [dayKey(2)]: { minutes: 6, answered: 4 } },
  };
  await page.addInitScript((savedFun) => {
    if (!localStorage.getItem('fraction-quest-fun-v1:guest')) localStorage.setItem('fraction-quest-fun-v1', JSON.stringify(savedFun));
  }, fun);
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();

  const notice = page.getByTestId('oil-notice');
  await expect(notice).toBeVisible();
  await expect(notice).toHaveAttribute('data-kind', 'used');
  await expect(notice.getByRole('heading', { name: 'Your lantern is still lit!' })).toBeVisible();
  await expect(notice).toContainText('so I used a drop of spare oil. Your 9 nights are safe.');
  await expect(notice.getByRole('button', { name: /listen/i })).toBeVisible();
  const next = page.getByTestId('button-oil-next');
  await expect(next).toBeInViewport();
  await next.click();
  await expect(notice).toHaveCount(0);
  await expect(page.getByTestId('status-day-streak')).toContainText('9');

  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('fraction-quest-fun-v1:guest') ?? 'null'));
  expect(saved.spareOil).toBe(0);
  expect(saved.savedDays).toEqual([dayKey(1)]);
  expect(saved.lastActiveDay).toBe(dayKey(2));
  expect(saved.oilNotice).toBeUndefined();

  await page.reload();
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('status-day-streak')).first()).toBeVisible();
  if (await guest.isVisible()) await guest.click();
  await expect(page.getByTestId('status-day-streak')).toContainText('9');
  await expect(page.getByTestId('oil-notice')).toHaveCount(0);
});
