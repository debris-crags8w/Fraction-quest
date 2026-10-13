import { expect, test } from '@playwright/test';

test('duplicate sign-up can switch to sign-in and a missing session explains how to recover', async ({ page }) => {
  await page.route('**/api/**', async (route) => {
    const { pathname } = new URL(route.request().url());
    const responses: Record<string, { status: number; body: unknown }> = {
      '/api/auth/me': { status: 401, body: { error: 'Not signed in.' } },
      '/api/auth/signup': { status: 409, body: { error: 'That username is taken. Try adding a number.' } },
      '/api/auth/login': {
        status: 200,
        body: {
          id: 21,
          username: 'star_fox',
          displayName: 'Star Fox',
          parentConsentAt: '2026-10-13T00:00:00.000Z',
          privacyNoticeVersion: '2026-10-13',
          hasRecoveryCode: true,
        },
      },
      '/api/family/profiles': { status: 401, body: { error: 'Not signed in.' } },
    };
    const response = responses[pathname];
    await route.fulfill({
      status: response?.status ?? 404,
      contentType: 'application/json',
      body: JSON.stringify(response?.body ?? { error: 'Unexpected API request.' }),
    });
  });

  await page.goto('/');
  await expect(page.getByTestId('tab-sign-in')).toBeVisible();
  await page.getByTestId('tab-create-account').click();
  await page.getByTestId('input-username').fill('star_fox');
  await page.getByTestId('input-password').fill('safe-test-password');
  await page.getByRole('checkbox', { name: /I am a parent or caregiver/i }).check();
  await page.getByTestId('button-login-submit').click();

  await expect(page.getByTestId('text-login-error')).toContainText('That username is taken');
  const signInLink = page.getByTestId('button-sign-in-existing-account');
  await expect(signInLink).toBeVisible();
  await signInLink.click();
  await expect(page.getByTestId('tab-sign-in')).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('input-username')).toHaveValue('star_fox');
  await expect(page.getByTestId('input-password')).toHaveValue('safe-test-password');

  await page.getByTestId('button-login-submit').click();
  await expect(page.getByTestId('text-login-notice')).toContainText("couldn't keep the session");
  await expect(page.getByRole('heading', { name: 'Welcome back, explorer!' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your account is signed in' })).toHaveCount(0);
});
