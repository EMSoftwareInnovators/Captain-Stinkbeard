import { defineConfig } from '@playwright/test';
import base from './playwright.config.js';

/**
 * Performance measurements (docs/gameplay-overhaul/06-regression-harness.md,
 * "Performance"): the same dev server and browser as the E2E suite, but its
 * own folder, so `npm run e2e` never runs them.
 *   npm run perf                       measure the heaviest scenes (about 3 minutes)
 *   PERF_RUNS=3 npm run perf           repeat each measurement and keep every run
 *   PERF_ONLY=p17_complete npm run perf   only that preset's scenes (comma-separated list)
 *   npm run perf:bundle                the production bundle's size (after npm run build)
 * Results go to tmp/perf/. The numbers are diagnostic: nothing here fails on
 * a slow frame, because the test machine renders in software.
 */
export default defineConfig({
  ...base,
  testDir: 'perf',
  timeout: 30 * 60 * 1000,
  workers: 1,
  use: {
    ...base.use,
    launchOptions: {
      ...base.use.launchOptions,
      // Unquantised performance.memory (the CDP heap metrics are used first).
      args: [...base.use.launchOptions.args, '--enable-precise-memory-info'],
    },
  },
});
