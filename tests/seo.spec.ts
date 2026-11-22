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

test('sitemap lists the public pages and leaves out external posts', async ({ request }) => {
  const paths = await sitemapPaths(request);
  for (const p of ['/', '/about/', '/projects/', '/projects/flexorder-e2e/', '/writing/', '/certificates/', '/cv/', '/qa/', '/activity/', '/gallery/']) {
    expect(paths).toContain(p);
  }
  // Posts published elsewhere (Medium) have no local page.
  expect(paths.filter((p) => p.startsWith('/writing/') && p !== '/writing/')).toEqual([]);
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
  const paths = [...(await sitemapPaths(request)), '/404/'];
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

test('finished pages are indexable', async ({ page }) => {
  await page.goto('/projects/flexorder-e2e/');
  await expect(page.locator('meta[name="robots"]')).not.toHaveAttribute('content', /noindex/);
});

test('Cloudflare security and cache headers are configured', () => {
  const headers = readFileSync('public/_headers', 'utf8');
  for (const h of ['X-Content-Type-Options: nosniff', 'X-Frame-Options: DENY', 'Referrer-Policy:', 'Permissions-Policy:']) {
    expect(headers).toContain(h);
  }
  expect(headers).toMatch(/\/_astro\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
});

test('titles and descriptions are unique, the right length, and name Rakibul Islam', async ({ page, request }) => {
  const seen = new Map<string, string>();
  for (const p of await sitemapPaths(request)) {
    await page.goto(p);
    const title = await page.title();
    const desc = (await page.locator('meta[name="description"]').getAttribute('content')) ?? '';
    expect(title, p).toContain('Rakibul Islam');
    expect(title.length, `${p}: "${title}"`).toBeLessThanOrEqual(65);
    expect(desc.length, `${p}: description`).toBeGreaterThanOrEqual(70);
    expect(desc.length, `${p}: description`).toBeLessThanOrEqual(175);
    expect(seen.get(title), `${p} reuses the title of ${seen.get(title)}`).toBeUndefined();
    seen.set(title, p);
  }
});

test('structured data describes Rakibul, the site and each page', async ({ page }) => {
  const ld = async () => JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
  await page.goto('/');
  const home = (await ld())['@graph'] as Array<Record<string, unknown>>;
  const person = home.find((n) => n['@type'] === 'Person')!;
  expect(person.name).toBe('Rakibul Islam');
  expect(person.jobTitle).toBe('QA Automation Engineer & SDET');
  expect(person.sameAs).toEqual(expect.arrayContaining(['https://www.linkedin.com/in/rakibul-islam08/', 'https://github.com/RakibulIslam39']));
  expect((person.knowsAbout as string[])).toContain('Playwright');
  expect(home.some((n) => n['@type'] === 'ProfilePage')).toBe(true);
  expect(home.some((n) => n['@type'] === 'WebSite')).toBe(true);

  await page.goto('/projects/flexorder-e2e/');
  const proj = (await ld())['@graph'] as Array<Record<string, unknown>>;
  const crumbs = proj.find((n) => n['@type'] === 'BreadcrumbList') as { itemListElement: Array<{ name: string }> };
  expect(crumbs.itemListElement.map((i) => i.name)).toEqual(['Home', 'Projects', 'FlexOrder E2E Automation Case Study']);
  expect(proj.find((n) => n['@type'] === 'SoftwareSourceCode')).toMatchObject({ codeRepository: expect.stringContaining('github.com') });

  await page.goto('/gallery/');
  const gal = (await ld())['@graph'] as Array<Record<string, unknown>>;
  expect((gal.find((n) => n['@type'] === 'ImageGallery') as { image: unknown[] }).image).toHaveLength(12);
});

test('sitemap lists the gallery and portrait images', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  expect(xml).toContain('xmlns:image=');
  expect(xml).toContain('/gallery/hardinge-bridge.webp');
  expect(xml).toContain('/portrait/photo.webp');
});
