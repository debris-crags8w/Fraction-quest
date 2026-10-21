import { defineConfig } from '@playwright/test';

const webkit = process.env.PLAYWRIGHT_BROWSER === 'webkit';
const phoneViewport = process.env.PLAYWRIGHT_PHONE === '1';
// Two checkouts can test side by side when each uses its own port (PLAYWRIGHT_PORT), so neither reuses the other's server.
const port = Number(process.env.PLAYWRIGHT_PORT ?? 4179);

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  outputDir: port === 4179 ? '/tmp/fraction-quest-playwright-results' : `/tmp/fraction-quest-playwright-results-${port}`,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: webkit ? 'webkit' : 'chromium',
    ...(phoneViewport
      ? {
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 3,
          hasTouch: true,
          isMobile: true,
        }
      : {}),
    launchOptions: {
      ...(!webkit
        ? {
            ...(process.env.CHROMIUM_PATH
              ? { executablePath: process.env.CHROMIUM_PATH }
              : process.env.CI
                ? {}
                : { executablePath: '/repl/tools/bin/chromium' }),
            args: ['--no-sandbox'],
          }
        : {}),
    },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `PORT=${port} BASE_PATH=/ VITE_WEB_LESSONS_OPEN=1 pnpm run dev`,
    url: `http://127.0.0.1:${port}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
