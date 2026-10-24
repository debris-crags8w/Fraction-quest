import { expect, openSettings, test, type Page } from './fixtures';

const dayKey = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

/** Pretend to be the app (iPhone and Android) with a reminder; records what the page asks the app. */
async function openInApp(page: Page, shell: Record<string, unknown> | null, answeredToday = 0) {
  await page.addInitScript(({ saved, day, answered }) => {
    if (!localStorage.getItem('fraction-quest-fun-v1:guest')) {
      localStorage.setItem('fraction-quest-progress-v1', JSON.stringify({ completedMissionIds: [], starsByMission: {}, reviewQueue: [], assessments: [], learning: {} }));
      localStorage.setItem('fraction-quest-fun-v1', JSON.stringify({ xp: 0, day, answeredToday: answered, sound: false, story: { prologueSeen: true },
        activity: { [day]: { minutes: 3, answered } } }));
    }
    const scope = window as Window & { fractionQuestShell?: unknown; ReactNativeWebView?: unknown; __asked?: string[] };
    scope.__asked = [];
    if (saved) {
      scope.fractionQuestShell = { platform: 'ios', wifi: true, ...saved };
      scope.ReactNativeWebView = { postMessage: (message: string) => scope.__asked!.push(message) };
    }
  }, { saved: shell, day: dayKey(), answered: answeredToday });
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'Not signed in.' }) }));
  await page.goto('/');
  const guest = page.getByTestId('button-play-guest');
  await expect(guest.or(page.getByTestId('button-app-menu'))).toBeVisible();
  if (await guest.isVisible()) await guest.click();
}

const asked = (page: Page) => page.evaluate(() => ((window as Window & { __asked?: string[] }).__asked ?? []).map((message) => JSON.parse(message)));

async function openGrownUps(page: Page) {
  await page.getByTestId('button-app-menu').click();
  await page.getByTestId('button-open-parent').click();
  const challenge = await page.getByTestId('parent-gate').getByText(/\d+\s×\s\d+\s=/).textContent();
  const factors = challenge!.match(/(\d+)\s×\s(\d+)/)!;
  await page.getByTestId('input-parent-gate').fill(String(Number(factors[1]) * Number(factors[2])));
  await page.getByTestId('button-parent-gate').click();
}

test('a grown-up sets the practice reminder on this phone', async ({ page }) => {
  await openInApp(page, { reminder: { time: null, days: [1, 2, 3, 4, 5], permission: 'undetermined' } });
  await openGrownUps(page);
  await openSettings(page, 'Reminders');
  const section = page.getByTestId('section-reminder');
  await expect(section).toContainText('Nothing is sent to us.');
  await expect(section.getByTestId('reminder-day-1')).toBeDisabled();
  await section.getByTestId('select-reminder-time').selectOption('16:00');
  expect(await asked(page)).toContainEqual({ type: 'reminder', action: 'set', time: '16:00', days: [1, 2, 3, 4, 5] });

  // The app saves it and reports back; Saturday is added.
  await page.evaluate(() => {
    const scope = window as Window & { fractionQuestShell?: { reminder?: unknown } };
    scope.fractionQuestShell!.reminder = { time: '16:00', days: [1, 2, 3, 4, 5], permission: 'granted' };
    window.dispatchEvent(new Event('fraction-quest-shell'));
  });
  await expect(section.getByTestId('select-reminder-time')).toHaveValue('16:00');
  await expect(section.getByTestId('reminder-day-6')).toHaveAttribute('aria-pressed', 'false');
  await section.screenshot({ path: test.info().outputPath('reminder.png') });
  await section.getByTestId('reminder-day-6').click();
  expect(await asked(page)).toContainEqual({ type: 'reminder', action: 'set', time: '16:00', days: [1, 2, 3, 4, 5, 6] });

  // Notifications turned off in the phone's Settings: the grown-up is told how to fix it.
  await page.evaluate(() => {
    const scope = window as Window & { fractionQuestShell?: { reminder?: unknown } };
    scope.fractionQuestShell!.reminder = { time: '16:00', days: [1, 2, 3, 4, 5], permission: 'denied' };
    window.dispatchEvent(new Event('fraction-quest-shell'));
  });
  await expect(page.getByTestId('reminder-permission')).toContainText('Turn them on in your phone’s Settings.');
});

test('once the child has practised today, the app is told (no reminder today)', async ({ page }) => {
  await openInApp(page, { reminder: { time: '16:00', days: [1, 2, 3, 4, 5], permission: 'granted' } }, 2);
  await expect.poll(() => asked(page)).toContainEqual({ type: 'reminder', action: 'practised', day: dayKey() });
});

test('tapping the reminder opens today’s practice, once', async ({ page }) => {
  await openInApp(page, { reminder: { time: '16:00', days: [1, 2, 3, 4, 5], permission: 'granted' }, openPractice: 1_800_000_000_000 });
  await expect(page.locator('.fq-daily-shell')).toBeVisible();
  await page.goto('/');
  await expect(page.getByTestId('button-app-menu')).toBeVisible();
  await expect(page.locator('.fq-daily-shell')).toHaveCount(0);
});

test('in a browser there is no reminder section', async ({ page }) => {
  await openInApp(page, null);
  await openGrownUps(page);
  await openSettings(page, 'Breaks');
  await expect(page.getByTestId('section-break-settings')).toBeVisible();
  await expect(page.getByTestId('section-reminder')).toHaveCount(0);
});
