import { defineConfig, devices } from '@playwright/test';

const PORT = 4329;
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 1 : 0,
  reporter: [
    isCI ? ['github'] : ['list'],
    ['html', { open: 'never' }],
    // Feeds scripts/qa-report.mjs, which builds the data for the /qa page.
    ['json', { outputFile: 'reports/results.json' }],
  ],
  // Visual baselines are rendered on Linux (CI). On macOS/Windows we skip pixel comparison.
  ignoreSnapshots: process.platform !== 'linux',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.02, animations: 'disabled' },
  },
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // API unit tests and SEO checks don't depend on the browser, so they run once, in chromium.
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testIgnore: /(api|seo)\.spec/ },
    { name: 'webkit', use: { ...devices['Desktop Safari'] }, testIgnore: /(visual|api|seo)\.spec/ },
  ],
  webServer: {
    command: `npm run build && npx astro preview --port ${PORT} --ignore-lock`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
});
