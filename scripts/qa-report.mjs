#!/usr/bin/env node
/**
 * Builds src/data/qa-report.json for the /qa page from:
 *   1. Playwright's JSON report (reports/results.json), and
 *   2. Lighthouse runs against the built site (skip with --no-lighthouse).
 *
 * Usage: node scripts/qa-report.mjs [--no-lighthouse] [--results reports/results.json]
 * Run `npm run build` first so dist/ exists for Lighthouse.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, extname, normalize, resolve } from 'node:path';

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
const run = promisify(execFile);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.pdf': 'application/pdf', '.txt': 'text/plain',
  '.vcf': 'text/vcard',
};

/**
 * Serves dist/ with a tiny static server. Self-contained on purpose: `astro preview`
 * behaves differently in CI containers (background mode, lock files).
 */
function serveDist(port) {
  const root = resolve('dist');
  if (!existsSync(root)) throw new Error('dist/ not found: run `npm run build` first');
  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = normalize(join(root, urlPath));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      const notFound = join(root, '404.html');
      res.writeHead(404, { 'content-type': TYPES['.html'] }).end(existsSync(notFound) ? readFileSync(notFound) : 'Not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  });
  return new Promise((ok, fail) => {
    server.once('error', fail);
    server.listen(port, '127.0.0.1', () => ok(server));
  });
}

async function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const { chromium } = await import('@playwright/test');
  return chromium.executablePath();
}

async function runLighthouse() {
  const server = await serveDist(PORT);
  const out = join(tmpdir(), `lh-${process.pid}.json`);
  const env = { ...process.env, CHROME_PATH: await chromePath() };
  const scores = [];
  try {
    for (const path of PAGES) {
      // Async on purpose: a sync call would block the event loop and the in-process server.
      await run(
        'npx',
        [
          '-y',
          'lighthouse@12',
          `http://127.0.0.1:${PORT}${path}`,
          '--quiet',
          '--output=json',
          `--output-path=${out}`,
          '--only-categories=performance,accessibility,best-practices,seo',
          '--chrome-flags=--headless=new --no-sandbox',
        ],
        { env, maxBuffer: 64 * 1024 * 1024 },
      );
      const c = JSON.parse(readFileSync(out, 'utf8')).categories;
      const pct = (k) => Math.round((c[k]?.score ?? 0) * 100);
      scores.push({ path, performance: pct('performance'), accessibility: pct('accessibility'), bestPractices: pct('best-practices'), seo: pct('seo') });
      console.log(`lighthouse ${path}`, scores.at(-1));
    }
  } finally {
    server.close();
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
