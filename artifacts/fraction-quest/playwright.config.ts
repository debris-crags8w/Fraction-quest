import { defineConfig } from '@playwright/test';

const webkit = process.env.PLAYWRIGHT_BROWSER === 'webkit';
const phoneViewport = process.env.PLAYWRIGHT_PHONE === '1';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  outputDir: '/tmp/fraction-quest-playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:4179',
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
    command: 'PORT=4179 BASE_PATH=/ pnpm run dev',
    url: 'http://127.0.0.1:4179/',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
