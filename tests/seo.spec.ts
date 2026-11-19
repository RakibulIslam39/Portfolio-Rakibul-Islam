/**
 * SEO and sharing checks. Page-independent, so they run once (chromium project only).
 */
import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SITE } from '../astro.config.mjs';

const ogSlug = (p: string) => p.replace(/^\/+|\/+$/g, '').replace(/\//g, '-') || 'home';
const local = (url: string) => new URL(url).pathname;

async function sitemapPaths(request: import('@playwright/test').APIRequestContext) {
  const res = await request.get('/sitemap.xml');
  expect(res.ok()).toBe(true);
  expect(res.headers()['content-type']).toContain('xml');
  const urls = [...(await res.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  for (const u of urls) expect(u.startsWith(`${SITE}/`), u).toBe(true);
  return urls.map(local);
}

test('sitemap lists the public pages and leaves out drafts', async ({ request }) => {
  const paths = await sitemapPaths(request);
  for (const p of ['/', '/about/', '/projects/', '/projects/flexorder-e2e/', '/writing/', '/cv/', '/qa/']) {
    expect(paths).toContain(p);
  }
  // Lorem-ipsum posts are `placeholder: true` and must not be indexed.
  expect(paths).not.toContain('/writing/page-objects-that-age-well/');
  expect(new Set(paths).size).toBe(paths.length);
});

test('every sitemap URL responds 200', async ({ request }) => {
  for (const p of await sitemapPaths(request)) expect((await request.get(p)).status(), p).toBe(200);
});

test('robots.txt points to the sitemap on the configured site', async ({ request }) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
});

test('every page has a canonical URL and a 1200x630 PNG share image', async ({ page, request }) => {
  const paths = [...(await sitemapPaths(request)), '/writing/page-objects-that-age-well/', '/404/'];
  for (const p of paths) {
    await page.goto(p);
    const expectedPath = p === '/404/' ? '/404' : p;
    if (p !== '/404/') await expect(page.locator('link[rel="canonical"]'), p).toHaveAttribute('href', `${SITE}${p}`);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    expect(og, p).toBe(`${SITE}/og/${ogSlug(expectedPath)}.png`);

    const img = await request.get(local(og!));
    expect(img.status(), `${og} exists (run "npm run build && npm run og")`).toBe(200);
    const png = await img.body();
    expect(png.subarray(1, 4).toString(), og!).toBe('PNG');
    expect([png.readUInt32BE(16), png.readUInt32BE(20)], og!).toEqual([1200, 630]);
  }
});

test('drafts are noindex, finished pages are indexable', async ({ page }) => {
  await page.goto('/writing/page-objects-that-age-well/');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  await page.goto('/projects/flexorder-e2e/');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('Cloudflare security and cache headers are configured', () => {
  const headers = readFileSync('public/_headers', 'utf8');
  for (const h of ['X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy:', 'Permissions-Policy:']) {
    expect(headers).toContain(h);
  }
  expect(headers).toMatch(/\/_astro\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
});
