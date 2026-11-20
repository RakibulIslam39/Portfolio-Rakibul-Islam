import { test, expect } from '@playwright/test';

const MEDIUM = /^https:\/\/medium\.com\/@rakib\.cse\.bubt\//;

test.beforeEach(async ({ page }) => {
  await page.goto('/writing/');
});

test('features the latest post and links out to Medium in a new tab', async ({ page }) => {
  const post = page.getByRole('link', { name: /Automating bulk stock sync in WooCommerce/ });
  await expect(post).toHaveAttribute('href', MEDIUM);
  await expect(post).toHaveAttribute('target', '_blank');
  await expect(post).toHaveAttribute('rel', /noopener/);
  await expect(post).toContainText('on Medium');
  await expect(post).toContainText('3 min read');
  await expect(post.locator('time')).toHaveText('22 Nov 2025');
});

test('lists posts newest first', async ({ page }) => {
  const dates = await page.locator('[data-post] time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')!));
  expect(dates.length).toBeGreaterThan(0);
  expect([...dates].sort().reverse()).toEqual(dates);
});

test('category filter only appears once there is more than one category', async ({ page }) => {
  const cats = new Set(await page.locator('[data-post]').evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.cat)));
  await expect(page.getByRole('group', { name: 'Filter by category' })).toHaveCount(cats.size > 1 ? 1 : 0);
});

test('no lorem ipsum drafts are published', async ({ page }) => {
  await expect(page.locator('body')).not.toContainText(/lorem ipsum/i);
  await expect(page.locator('.draft-badge')).toHaveCount(0);
});
