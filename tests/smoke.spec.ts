import { test, expect } from '@playwright/test';

const pages = ['/', '/about/', '/projects/', '/writing/', '/qa/'];

test('home page loads with the right title and heading', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

  await page.goto('/');
  await expect(page).toHaveTitle(/Rakibul Islam/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('QA Automation Engineer');
  expect(errors).toEqual([]);
});

for (const path of pages) {
  test(`${path} responds 200 and has one h1`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('unknown routes show the 404 page', async ({ page }) => {
  await page.goto('/does-not-exist/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
});

test('downloads are served', async ({ request }) => {
  for (const [path, type] of [
    ['/Rakibul-Islam-CV.pdf', 'application/pdf'],
    ['/rakibul-islam.vcf', 'vcard'],
  ] as const) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(200);
    if (type === 'application/pdf') expect(res.headers()['content-type']).toContain(type);
  }
});

test('SEO meta is present', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /QA Automation Engineer/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/$/);
  await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
  const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
  expect(ld['@type']).toBe('Person');
});
