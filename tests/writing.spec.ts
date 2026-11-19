import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/writing/');
});

test('lists posts newest first', async ({ page }) => {
  const dates = await page.locator('[data-post] time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')!));
  expect(dates.length).toBeGreaterThan(1);
  expect([...dates].sort().reverse()).toEqual(dates);
});

test('category chips filter the list and show counts', async ({ page }) => {
  const filter = page.getByRole('group', { name: 'Filter by category' });
  const all = filter.getByRole('button', { name: /^All/ });
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  const total = await page.locator('[data-post]').count();
  await expect(all).toContainText(String(total));

  const career = filter.getByRole('button', { name: /^Career/ });
  await career.click();
  await expect(career).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('[data-post]:visible')).toHaveCount(1);
  await expect(page.locator('[data-post]:visible')).toContainText('From manual tester to SDET');

  await all.click();
  await expect(page.locator('[data-post]:visible')).toHaveCount(total);
});

test('opening a post shows its title, date and reading time', async ({ page }) => {
  await page.getByRole('link', { name: /Page objects that age well/ }).click();
  await expect(page).toHaveURL(/\/writing\/page-objects-that-age-well\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Page objects that age well');
  await expect(page.locator('time')).toHaveText('22 Oct 2026');
  await expect(page.getByText(/\d+ min read/)).toBeVisible();
  await page.getByRole('link', { name: '← All writing' }).click();
  await expect(page).toHaveURL(/\/writing\/$/);
});
