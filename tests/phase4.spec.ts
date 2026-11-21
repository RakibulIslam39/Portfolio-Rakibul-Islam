import { test, expect } from '@playwright/test';

test.describe('QA page: at a glance', () => {
  test('shows activity rings for tests, performance and accessibility', async ({ page }) => {
    await page.goto('/qa/');
    const rings = page.getByRole('img', { name: /Tests passing \d+%, Performance \d+, Accessibility \d+/ });
    await expect(rings).toBeVisible();
    await expect(page.locator('.rings__legend li')).toHaveCount(3);
  });

  test('measures your visit and your Core Web Vitals in the browser', async ({ page }) => {
    await page.goto('/qa/');
    const visit = page.locator('[data-visit]');
    await expect(visit.locator('[data-visit-total]')).toHaveText(/^\d+$/);
    await expect(visit.locator('[data-ms="wait"]')).toHaveText(/^\d+ ms$/);
    await expect(page.locator('[data-vital="cls"] em')).toHaveText(/^\d\.\d\d$/);
  });
});

test.describe('blog page tiles', () => {
  test('has the newest post, a pull quote, a follow tile and topics', async ({ page }) => {
    await page.goto('/writing/');
    await expect(page.locator('.wr-grid .featured')).toContainText('Automating bulk stock sync');
    await expect(page.locator('.wr-quote blockquote')).toBeVisible();
    await expect(page.getByRole('link', { name: /Follow on Medium/ })).toHaveAttribute('href', /medium\.com/);
    await expect(page.getByRole('heading', { name: 'Topics' })).toBeVisible();
  });
});

test.describe('404 page', () => {
  test('searches like Find My, then offers real pages', async ({ page }) => {
    await page.clock.install();
    const res = await page.goto('/this-page-is-missing/');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    await expect(page.locator('[data-lost-text]')).toHaveText('Locating this page…');
    await page.clock.runFor(2000);
    await expect(page.locator('[data-lost-text]')).toHaveText('No location found');
    for (const [name, href] of [['Home', '/'], ['Projects', '/projects/'], ['Blog', '/writing/'], ['Certificates', '/certificates/']]) {
      await expect(page.locator('.lost__places').getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute('href', href);
    }
  });
});
