#!/usr/bin/env node
/**
 * Builds src/data/qa-report.json for the /qa page from:
 *   1. Playwright's JSON report (reports/results.json), and
 *   2. Lighthouse runs against the built site (skip with --no-lighthouse).
 *
 * Usage: node scripts/qa-report.mjs [--no-lighthouse] [--results reports/results.json]
 * Run `npm run build` first so dist/ exists for Lighthouse.
 */
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const args = process.argv.slice(2);
const resultsPath = args.includes('--results') ? args[args.indexOf('--results') + 1] : 'reports/results.json';
const withLighthouse = !args.includes('--no-lighthouse');
const PAGES = ['/', '/about/', '/projects/', '/projects/flexorder-e2e/', '/writing/', '/cv/'];
const PORT = 4330;

/* ---------- Playwright results ---------- */
function summarizeTests(report) {
  const files = new Map();
  const projects = new Set();
  const walk = (suite, file) => {
    const f = suite.file ?? file;
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        projects.add(t.projectName);
        const row = files.get(f) ?? { file: f, total: 0, passed: 0, failed: 0, flaky: 0, skipped: 0 };
        row.total++;
        if (t.status === 'expected') row.passed++;
        else if (t.status === 'unexpected') row.failed++;
        else if (t.status === 'flaky') row.flaky++;
        else row.skipped++;
        files.set(f, row);
      }
    }
    for (const child of suite.suites ?? []) walk(child, f);
  };
  for (const s of report.suites ?? []) walk(s, s.file);
  const st = report.stats ?? {};
  const passed = st.expected ?? 0;
  const failed = st.unexpected ?? 0;
  const flaky = st.flaky ?? 0;
  const skipped = st.skipped ?? 0;
  return {
    total: passed + failed + flaky + skipped,
    passed,
    failed,
    flaky,
    skipped,
    durationMs: Math.round(st.duration ?? 0),
    projects: [...projects].sort(),
    files: [...files.values()].sort((a, b) => a.file.localeCompare(b.file)),
  };
}

/* ---------- Lighthouse ---------- */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(url, ms = 30_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      if ((await fetch(url)).ok) return;
    } catch {
      /* not up yet */
    }
    await sleep(300);
  }
  throw new Error(`Server did not start at ${url}`);
}

async function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const { chromium } = await import('@playwright/test');
  return chromium.executablePath();
}

async function runLighthouse() {
  const server = spawn('npx', ['astro', 'preview', '--port', String(PORT), '--ignore-lock'], { stdio: 'ignore' });
  const out = join(tmpdir(), `lh-${process.pid}.json`);
  const env = { ...process.env, CHROME_PATH: await chromePath() };
  const scores = [];
  try {
    await waitFor(`http://localhost:${PORT}/`);
    for (const path of PAGES) {
      execFileSync(
        'npx',
        [
          '-y',
          'lighthouse@12',
          `http://localhost:${PORT}${path}`,
          '--quiet',
          '--output=json',
          `--output-path=${out}`,
          '--only-categories=performance,accessibility,best-practices,seo',
          '--chrome-flags=--headless=new --no-sandbox',
        ],
        { env, stdio: 'ignore' },
      );
      const c = JSON.parse(readFileSync(out, 'utf8')).categories;
      const pct = (k) => Math.round((c[k]?.score ?? 0) * 100);
      scores.push({ path, performance: pct('performance'), accessibility: pct('accessibility'), bestPractices: pct('best-practices'), seo: pct('seo') });
      console.log(`lighthouse ${path}`, scores.at(-1));
    }
  } finally {
    server.kill();
    rmSync(out, { force: true });
  }
  return scores;
}

/* ---------- Main ---------- */
const report = JSON.parse(readFileSync(resultsPath, 'utf8'));
const { GITHUB_SHA, GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID, CI } = process.env;
const qa = {
  sample: !CI,
  generatedAt: new Date().toISOString(),
  commit: GITHUB_SHA ? GITHUB_SHA.slice(0, 7) : null,
  runUrl: GITHUB_RUN_ID ? `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}` : null,
  tests: summarizeTests(report),
  lighthouse: withLighthouse ? await runLighthouse() : [],
};
mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/qa-report.json', JSON.stringify(qa, null, 2) + '\n');
console.log(`Wrote src/data/qa-report.json: ${qa.tests.passed}/${qa.tests.total} passed, ${qa.lighthouse.length} Lighthouse pages`);
