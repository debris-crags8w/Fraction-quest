import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  outputDir: '/tmp/fraction-quest-playwright-results',
  use: {
    baseURL: 'http://127.0.0.1:4179',
    browserName: 'chromium',
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH ?? '/repl/tools/bin/chromium',
      args: ['--no-sandbox'],
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
