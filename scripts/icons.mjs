#!/usr/bin/env node
/**
 * Renders the PNG app icons and favicon-32 from the logo (public/brand/logo-light-320.png):
 * the logo centred on white, with extra room for the maskable icon.
 * Run once after changing the logo: node scripts/icons.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const logo = `data:image/png;base64,${readFileSync('public/brand/logo-light-320.png').toString('base64')}`;
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, frac, radius] of [
  ['apple-touch-icon.png', 180, 0.74, 0],
  ['icon-192.png', 192, 0.74, 0],
  ['icon-512.png', 512, 0.74, 0],
  ['icon-maskable-512.png', 512, 0.56, 0],
  ['favicon-32.png', 32, 0.86, 7],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:transparent">
    <div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:#fff;display:grid;place-items:center">
    <img src="${logo}" style="width:${Math.round(size * frac)}px"></div></body></html>`);
  writeFileSync(`public/${name}`, await page.screenshot({ type: 'png', omitBackground: true }));
}
await browser.close();
console.log('Wrote apple-touch-icon.png, icon-192.png, icon-512.png, icon-maskable-512.png, favicon-32.png');
