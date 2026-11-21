#!/usr/bin/env node
/**
 * Builds public/activity/geo.json for the Activity page globe: dots on land, and for each
 * country its centre and continent. Run once (the output is committed):
 *
 *   npm i --no-save world-atlas@2 topojson-client@3 d3-geo@3 i18n-iso-countries@7 countries-list@3
 *   node scripts/geo-data.mjs
 *
 * Data: Natural Earth via world-atlas (public domain), countries-list (MIT).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { feature } from 'topojson-client';
import { geoContains, geoCentroid } from 'd3-geo';
import countries from 'i18n-iso-countries';
import { countries as info } from 'countries-list';

const require = createRequire(import.meta.url);
const land = feature(JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8')), 'land');
const world = JSON.parse(readFileSync(require.resolve('world-atlas/countries-110m.json'), 'utf8'));

// Dots on an equal-area-ish grid: fewer dots towards the poles.
const dots = [];
const STEP = 2;
for (let lat = -58; lat <= 80; lat += STEP) {
  const step = STEP / Math.max(Math.cos((lat * Math.PI) / 180), 0.3);
  for (let lon = -180; lon < 180; lon += step) {
    if (geoContains(land, [lon, lat])) dots.push([Math.round(lon * 10) / 10, lat]);
  }
}

const places = {};
for (const f of feature(world, world.objects.countries).features) {
  const a2 = countries.numericToAlpha2(f.id);
  if (!a2) continue;
  const [lon, lat] = geoCentroid(f);
  places[a2] = { c: [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10], k: info[a2]?.continent ?? null };
}
// Small countries missing at 110m resolution: centre and continent from countries-list.
const extra = { SG: [103.8, 1.35], HK: [114.2, 22.3], BH: [50.6, 26.0], MT: [14.4, 35.9], MV: [73.2, 3.2], MU: [57.6, -20.3], LU: [6.1, 49.8], AD: [1.5, 42.5], MC: [7.4, 43.7], LI: [9.5, 47.1] };
for (const [a2, c] of Object.entries(extra)) places[a2] ??= { c, k: info[a2]?.continent ?? null };

mkdirSync('public/activity', { recursive: true });
writeFileSync('public/activity/geo.json', JSON.stringify({ dots, places }));
console.log(`geo.json: ${dots.length} dots, ${Object.keys(places).length} countries`);
