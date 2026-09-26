import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests: a real browser plays the prologue with key presses.
 * They need the dev server (debug hooks), which Playwright starts itself.
 *   npm run e2e
 * Set CHROMIUM_PATH to use a preinstalled Chromium instead of
 * `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 8 * 60 * 1000,
  expect: { timeout: 10000 },
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:5180/',
    viewport: { width: 960, height: 672 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || undefined,
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--autoplay-policy=no-user-gesture-required'],
    },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx vite --port 5180 --strictPort',
    url: 'http://localhost:5180/',
    reuseExistingServer: true,
    timeout: 60000,
  },
});
