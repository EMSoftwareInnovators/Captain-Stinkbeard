import { defineConfig } from '@playwright/test';

/**
 * End-to-end tests: a real browser plays the game with key presses and
 * stubbed gamepads. They need the dev server (debug hooks), which
 * Playwright starts itself. Every test is tagged (see docs/ARCHITECTURE.md,
 * "End-to-end tests"):
 *   npm run e2e           everything (about 40 minutes)
 *   npm run e2e:smoke     @smoke: a few minutes, run after any change
 *   npm run e2e:quick     everything but the long @story playthroughs
 *   npm run e2e:story     the @story playthroughs (prologue, Phases 2 to 5)
 *   npm run e2e -- --grep @phase3     one area (@phase2 to @phase5 @prologue
 *                                     @input @saves @world @scenes @ui)
 *   npm run e2e -- --shard=1/3        split across machines
 * E2E_WORKERS=2 runs tests side by side (each gets its own browser and
 * saves); keep 1 on small machines, where the timing tests get tight.
 * Set CHROMIUM_PATH to use a preinstalled Chromium instead of
 * `npx playwright install chromium`.
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 8 * 60 * 1000,
  expect: { timeout: 10000 },
  workers: Number(process.env.E2E_WORKERS) || 1,
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
