#!/usr/bin/env node
/**
 * Renders a 1200x630 Open Graph image for every built page into public/og/<slug>.png,
 * using the page's own <title> and meta description. Run after `npm run build`:
 *
 *   npm run build && npm run og
 *
 * CI runs this on every push, so deployed share images always match the page text.
 */
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { chromium } from '@playwright/test';

const DIST = resolve('dist');
const OUT = resolve('public/og');
const SITE_HOST = 'rakibul-portfolio.pages.dev';

/** Same rule as src/lib/og.ts. */
const ogSlug = (pathname) => pathname.replace(/^\/+|\/+$/g, '').replace(/\.html$/, '').replace(/\//g, '-') || 'home';

function htmlFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === '_astro' || name === 'og' ? [] : htmlFiles(p);
    return name.endsWith('.html') ? [p] : [];
  });
}

const decode = (s) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'");
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function pageInfo(file) {
  const html = readFileSync(file, 'utf8');
  const rel = '/' + relative(DIST, file).replace(/\\/g, '/');
  const pathname = rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel.replace(/\.html$/, '');
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1] ?? 'Rakibul Islam').replace(/\s*\|\s*Rakibul Islam\s*$/, '');
  const description = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  const section = pathname.startsWith('/projects/') && pathname !== '/projects/' ? 'Case study'
    : pathname.startsWith('/writing/') && pathname !== '/writing/' ? 'Writing'
    : pathname === '/' ? 'Portfolio'
    : title;
  return { pathname, slug: ogSlug(pathname), title: pathname === '/' ? 'Rakibul Islam' : title, description, section };
}

const font = readFileSync(resolve('node_modules/@fontsource-variable/mona-sans/files/mona-sans-latin-wdth-normal.woff2')).toString('base64');

const template = ({ title, description, section }) => `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family: Mona; src: url(data:font/woff2;base64,${font}) format('woff2'); font-weight: 200 900; font-stretch: 75% 125%; }
* { box-sizing: border-box; margin: 0; }
body { width: 1200px; height: 630px; background: #0e0e10; font-family: Mona, sans-serif; padding: 48px; }
.card { height: 100%; border-radius: 40px; background: #1a1a1d; box-shadow: inset 0 0 0 2px rgba(255,255,255,.07);
  padding: 56px 64px; display: flex; flex-direction: column; position: relative; overflow: hidden; }
.glow { position: absolute; right: -120px; top: -120px; width: 420px; height: 420px; border-radius: 50%;
  background: radial-gradient(circle, rgba(47,208,138,.22), transparent 65%); }
.eyebrow { color: #2fd08a; font-size: 24px; font-weight: 600; letter-spacing: .06em; text-transform: uppercase; }
h1 { font-stretch: 108%; color: #f2f2f4; font-size: ${title.length > 42 ? 58 : 72}px; font-weight: 700; letter-spacing: -0.035em; line-height: 1.05; margin-top: 20px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
p { color: #b8b8c2; font-size: 28px; line-height: 1.4; margin-top: 22px; max-width: 900px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.foot { margin-top: auto; display: flex; align-items: center; gap: 18px; color: #c6c6ce; font-size: 24px; }
.logo { width: 56px; height: 56px; border-radius: 50%; background: #26262b; color: #f2f2f4; display: grid; place-items: center; font-weight: 700; }
.foot b { color: #f2f2f4; font-weight: 600; }
.foot > div { white-space: nowrap; }
.url { margin-left: auto; color: #9d9da6; }
.dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: #2fd08a; margin-right: 10px; box-shadow: 0 0 0 6px rgba(47,208,138,.18); }
</style></head><body><div class="card"><div class="glow"></div>
<div class="eyebrow">${esc(section)}</div>
<h1>${esc(title)}</h1>
${description ? `<p>${esc(description)}</p>` : ''}
<div class="foot"><div class="logo">RI</div><div><b>Rakibul Islam</b><br>QA Automation Engineer &amp; SDET</div>
<div class="url"><span class="dot"></span>${SITE_HOST}</div></div>
</div></body></html>`;

const pages = htmlFiles(DIST).map(pageInfo);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
for (const info of pages) {
  await page.setContent(template(info), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  writeFileSync(join(OUT, `${info.slug}.png`), await page.screenshot({ type: 'png' }));
}
await browser.close();
console.log(`Wrote ${pages.length} Open Graph images to public/og/`);
