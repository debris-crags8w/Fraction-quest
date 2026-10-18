import { expect, test } from '@playwright/test';

test('the map fetches the next story comic’s voice and keeps it on the device, so the comic starts without waiting', async ({ page }) => {
  await page.route('**/api/**', (route) => route.fulfill({ status: 401, contentType: 'application/json', body: '{}' }));
  const voiceFiles: string[] = [];
  page.on('request', (request) => { if (/\/voice\/[^/]+\/[0-9a-f]+\.mp3$/.test(request.url())) voiceFiles.push(request.url()); });
  await page.goto('/');
  await page.getByTestId('button-play-guest').click();

  // On the map, the prologue and chapter 1 comic audio is fetched in the background and saved.
  await expect.poll(() => page.evaluate(async () => (await (await caches.open('fraction-quest-voice-pack-v1')).keys()).length), { timeout: 15_000 })
    .toBeGreaterThan(10);

  // Next visit: the comic's voice comes from the device, not the network.
  await page.reload();
  const before = voiceFiles.length;
  await page.getByTestId('button-continue-course').click();
  await expect(page.getByTestId('story-comic')).toBeVisible();
  await page.waitForTimeout(2000);
  expect(voiceFiles.length - before).toBe(0);
});
