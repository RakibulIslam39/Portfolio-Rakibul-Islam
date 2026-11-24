import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const fixture = JSON.parse(readFileSync('tests/fixtures/activity.json', 'utf8'));

test.describe('Activity page', () => {
  test('shows live visits, the latest visitors and the change since last time', async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-21T16:00:00Z'));
    await page.route('**/api/activity', (r) => r.fulfill({ json: fixture }));
    await page.goto('/activity/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('How this site is doing');
    await expect(page.locator('[data-recent]')).toHaveText('4');
    await expect(page.locator('[data-total="today"]')).toHaveText('62');
    await expect(page.locator('[data-change="today"]')).toHaveText('+24%');
    await expect(page.locator('[data-change="week"]')).toHaveText('-15%');
    await expect(page.locator('[data-total="countries"]')).toHaveText('37');
    const feed = page.getByRole('list', { name: 'Latest visits' }).getByRole('listitem');
    await expect(feed).toHaveCount(4);
    await expect(feed.first()).toContainText('Bangladesh');
    await expect(feed.first()).toContainText('opened Home · 12 min ago');
  });

  test('turns real-visit Web Vitals into rings, and load times into regions', async ({ page }) => {
    await page.route('**/api/activity', (r) => r.fulfill({ json: fixture }));
    await page.goto('/activity/');
    await expect(page.locator('[data-vital="lcp"]')).toHaveText('1.2 s');
    await expect(page.locator('[data-vital="inp"]')).toHaveText('72 ms');
    await expect(page.locator('[data-vital="cls"]')).toHaveText('0.00');
    await expect(page.locator('[data-rings]')).toHaveAttribute('aria-label', /loading 95%, responding 93%, staying put 99%/);
    await expect(page.locator('[data-region="AS"] em')).toHaveText('0.8 s');
    await expect(page.locator('[data-region="NA"] em')).toHaveText('2.4 s');
    await expect(page.locator('[data-region="AF"] em')).toHaveText('–');
  });

  test('shows when the site was last published and how it was built', async ({ page }) => {
    await page.route('**/activity/build.json', (r) =>
      r.fulfill({
        json: {
          commit: 'abc1234',
          at: new Date(Date.now() - 90_000).toISOString(),
          message: 'Add the Activity page',
          homepage: { bytes: 400 * 1024, files: 30 },
          repo: { commits: 31, days: 3, firstCommit: '2026-11-19', linesAdded: 21637, linesRemoved: 2240, files: 185, commitsPerDay: { '2026-11-19': 6, '2026-11-21': 25 } },
        },
      }),
    );
    await page.goto('/activity/');
    await expect(page.locator('[data-ago]')).toHaveText(/^00h 01m \d\ds$/);
    await expect(page.locator('[data-commit]')).toContainText('Add the Activity page');
    await expect(page.locator('[data-weight]')).toHaveText('400 KB');
    await expect(page.locator('[data-repo="linesAdded"]')).toHaveText('21,637');
    await expect(page.locator('[data-repo="commits"]')).toHaveText('31');
    // One bar per day from the first commit, the empty day included.
    await expect(page.locator('[data-days] i')).toHaveCount(3);
    await expect(page.locator('[data-days] i[data-zero]')).toHaveCount(1);
  });

  test('says so when live numbers are unavailable, and the rest still works', async ({ page }) => {
    await page.route('**/api/activity', (r) => r.fulfill({ status: 204 }));
    await page.goto('/activity/');
    await expect(page.locator('[data-off]')).toBeVisible();
    await expect(page.locator('[data-recent]')).toHaveText('–');
    await expect(page.locator('.ac-gauges li')).toHaveCount(4);
  });

  test('the Live stats tile and the footer lead here', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#stats a[href="/activity/"]').first()).toBeAttached();
    await expect(page.locator('footer [data-visitors][href="/activity/"]')).toBeAttached();
    await expect(page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: 'Activity' })).toHaveAttribute('href', '/activity/');
  });
});

test('live numbers show skeletons while loading, then the values', async ({ page }) => {
  let answer: () => void = () => {};
  const ready = new Promise<void>((done) => (answer = done));
  await page.route('**/api/activity', async (r) => {
    await ready;
    await r.fulfill({ json: fixture });
  });
  await page.goto('/activity/');
  const root = page.locator('[data-activity]');
  await expect(root).toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('[data-recent]')).toHaveCSS('color', 'rgba(0, 0, 0, 0)');
  answer();
  await expect(root).not.toHaveAttribute('data-loading');
  await expect(root).not.toHaveAttribute('aria-busy');
  await expect(page.locator('[data-recent]')).not.toHaveText('–');
});

