import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/certificates/');
});

test('shows all six certificates, newest first, with their images', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Certificates');
  const cards = page.locator('[data-cert]');
  await expect(cards).toHaveCount(6);
  const dates = await cards.locator('time').evaluateAll((els) => els.map((e) => e.getAttribute('datetime')!));
  expect([...dates].sort().reverse()).toEqual(dates);

  for (const img of await cards.locator('img').all()) {
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute('alt', /certificate from (Test Automation University|Udemy), awarded to Rakibul Islam/);
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
  }
});

test('Udemy certificates link to Udemy verification; the rest open the full image', async ({ page, request }) => {
  const verify = page.getByRole('link', { name: /Verify on Udemy/ });
  await expect(verify).toHaveCount(3);
  for (const h of await verify.evaluateAll((els) => els.map((e) => e.getAttribute('href')!))) {
    expect(h).toMatch(/^https:\/\/www\.udemy\.com\/certificate\/UC-[0-9a-f-]{36}\/$/);
  }
  const full = page.getByRole('link', { name: /Open full size/ });
  await expect(full).toHaveCount(6);
  for (const h of await full.evaluateAll((els) => els.map((e) => e.getAttribute('href')!))) {
    const res = await request.get(h);
    expect(res.status(), h).toBe(200);
    expect(res.headers()['content-type'], h).toContain('image/webp');
  }
});

test('home has Certificates and Blog tiles that lead to their pages', async ({ page }) => {
  await page.goto('/');
  const certs = page.getByRole('region', { name: 'Certificates' });
  await expect(certs).toContainText('6');
  await certs.getByRole('link', { name: 'See all certificates →' }).click();
  await expect(page).toHaveURL(/\/certificates\/$/);

  await page.goto('/');
  const blog = page.getByRole('region', { name: 'Blog' });
  await expect(blog.getByRole('link', { name: /Automating bulk stock sync/ })).toHaveAttribute('href', /^https:\/\/medium\.com\//);
  await expect(blog.getByRole('link', { name: 'See all blog posts' })).toHaveAttribute('href', '/writing/');
});

test('Blog and Certificates are in the main navigation', async ({ page }) => {
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Certificates' })).toHaveAttribute('aria-current', 'page');
  await nav.getByRole('link', { name: 'Blog' }).click();
  await expect(page).toHaveURL(/\/writing\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Blog');
});
