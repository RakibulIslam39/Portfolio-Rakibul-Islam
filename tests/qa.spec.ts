import { test, expect, type Page } from '@playwright/test';
import qa from '../src/data/qa-report.json' with { type: 'json' };

const ciRun = (status: string) => ({
  status,
  title: 'Phase 6',
  commit: 'abc1234',
  url: 'https://github.com/RakibulIslam39/Portfolio-Rakibul-Islam/actions/runs/1',
  startedAt: new Date(Date.now() - 2 * 3600e3).toISOString(),
  durationSeconds: 191,
  runNumber: 7,
});

const mockApis = async (page: Page, ci: object | null, stats: object | null) => {
  await page.route('**/api/ci', (r) => (ci ? r.fulfill({ json: ci }) : r.fulfill({ status: 404, body: 'Not found' })));
  await page.route('**/api/stats', (r) => (stats ? r.fulfill({ json: stats }) : r.fulfill({ status: 503, json: { error: 'off' } })));
};

test('shows the test summary from the report', async ({ page }) => {
  await page.goto('/qa/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText("This site's QA report");
  await expect(page.locator('[data-qa-passed]')).toHaveText(String(qa.tests.passed));
  const table = page.getByRole('table', { name: 'Results per test file' });
  await expect(table.getByRole('row')).toHaveCount(qa.tests.files.length + 1);
  if (qa.sample) await expect(page.locator('[data-qa-source]')).toContainText('Sample data');
});

test('shows Lighthouse scores per page', async ({ page }) => {
  test.skip(qa.lighthouse.length === 0, 'Report has no Lighthouse data');
  await page.goto('/qa/');
  const table = page.getByRole('table', { name: 'Lighthouse scores per page' });
  await expect(table.getByRole('row')).toHaveCount(qa.lighthouse.length + 1);
  await expect(table.getByRole('link', { name: '/cv/' })).toBeVisible();
});

test('live CI card shows a passing run with a link to it', async ({ page }) => {
  await mockApis(page, ciRun('passing'), null);
  await page.goto('/qa/');
  const card = page.locator('[data-live-ci]');
  await expect(card.locator('[data-ci-state]')).toHaveAttribute('data-ci-state', 'passing');
  await expect(card).toContainText('Passing');
  await expect(card).toContainText('2 h ago');
  await expect(card).toContainText('3m 11s');
  await expect(card.getByRole('link', { name: 'Run #7' })).toHaveAttribute('href', /actions\/runs\/1$/);
});

test('live CI card shows a failing run', async ({ page }) => {
  await mockApis(page, ciRun('failing'), null);
  await page.goto('/qa/');
  await expect(page.locator('[data-ci-state]')).toHaveAttribute('data-ci-state', 'failing');
  await expect(page.locator('[data-live-ci]')).toContainText('Failing');
});

test('falls back gracefully when the APIs are unavailable', async ({ page }) => {
  await mockApis(page, null, null);
  await page.goto('/qa/');
  await expect(page.locator('[data-live-ci]')).toContainText('Unavailable');
  await expect(page.locator('[data-stats-fallback]')).toBeVisible();
  await expect(page.locator('[data-stats]')).toBeHidden();
  await expect(page.locator('[data-visitors]')).toBeHidden();
});

test('visitor numbers appear on /qa and in the footer', async ({ page }) => {
  await mockApis(page, null, { today: 38, week: 1417, countries: 12, updatedAt: new Date().toISOString() });
  await page.goto('/qa/');
  await expect(page.locator('[data-stat="today"]')).toHaveText('38');
  await expect(page.locator('[data-stat="week"]')).toHaveText('1,417');
  await expect(page.locator('[data-stats-fallback]')).toBeHidden();
  await expect(page.locator('[data-visitors]')).toContainText('38 visitors today · 12 countries this week');
});

test('home shows the "tests passing" pill only for real CI reports', async ({ page }) => {
  await page.goto('/');
  const pill = page.getByRole('link', { name: /This site: \d+\/\d+ tests passing/ });
  if (qa.sample) await expect(pill).toHaveCount(0);
  else await expect(pill).toHaveAttribute('href', '/qa/');
});
