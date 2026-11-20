#!/usr/bin/env node
/** Renders PNG app icons from public/favicon.svg (run once after changing the favicon). */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const svg = readFileSync('public/favicon.svg', 'utf8');
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of [['apple-touch-icon.png', 180, 0], ['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.12]]) {
  await page.setViewportSize({ width: size, height: size });
  const inset = Math.round(size * pad);
  await page.setContent(`<html><body style="margin:0;background:#0e0e10;display:grid;place-items:center;width:${size}px;height:${size}px">
    <div style="width:${size - inset * 2}px;height:${size - inset * 2}px">${svg.replace('<svg ', '<svg width="100%" height="100%" ')}</div></body></html>`);
  writeFileSync(`public/${name}`, await page.screenshot({ type: 'png', omitBackground: false }));
}
await browser.close();
console.log('Wrote apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png');
