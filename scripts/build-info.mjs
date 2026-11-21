#!/usr/bin/env node
/**
 * After `astro build`: writes dist/activity/build.json for the Activity page.
 * - the commit this build came from, and when
 * - how heavy the homepage is (HTML plus the CSS, JS, fonts and images it asks for)
 * - repository stats from git: commits, days worked on, lines added and removed, files, commits per day
 * Needs the full git history (CI checks out with fetch-depth: 0); on a shallow clone the repo stats are left out.
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const git = (args) => {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 }).trim();
  } catch {
    return '';
  }
};

const out = { commit: null, at: null, message: null, homepage: null, repo: null };

const head = git('log -1 --format=%h%x00%cI%x00%s');
if (head) {
  const [commit, at, message] = head.split('\0');
  Object.assign(out, { commit, at, message });
}

// Homepage weight: the HTML plus every local file it references.
const html = existsSync('dist/index.html') ? readFileSync('dist/index.html', 'utf8') : '';
if (html) {
  // Files the page loads by itself: scripts, styles, fonts, icons and images (not the pages and PDFs it links to).
  const tags = html.match(/<(?:img|script|link|source)\b[^>]*>/g) ?? [];
  const refs = new Set(tags.flatMap((t) => [...t.matchAll(/\s(?:src|href)="([^"]+)"/g)].map((m) => m[1])).filter((r) => !/\.(xml|webmanifest)$/.test(r)));
  let bytes = Buffer.byteLength(html);
  let files = 1;
  for (const ref of refs) {
    if (!ref.startsWith('/') || ref.startsWith('//')) continue;
    const file = join('dist', decodeURI(ref.split(/[?#]/)[0]));
    if (existsSync(file) && statSync(file).isFile()) {
      bytes += statSync(file).size;
      files++;
    }
  }
  out.homepage = { bytes, files };
}

if (git('rev-parse --is-shallow-repository') === 'false') {
  const log = git('log --format=%x01%cs --numstat');
  const perDay = {};
  let commits = 0;
  let added = 0;
  let removed = 0;
  for (const chunk of log.split('\x01').filter(Boolean)) {
    const [day, ...lines] = chunk.trim().split('\n');
    commits++;
    perDay[day] = (perDay[day] ?? 0) + 1;
    for (const l of lines) {
      const [a, r] = l.split('\t');
      if (/^\d+$/.test(a)) added += +a;
      if (/^\d+$/.test(r)) removed += +r;
    }
  }
  const days = Object.keys(perDay).sort();
  out.repo = {
    commits,
    days: days.length,
    firstCommit: days[0] ?? null,
    linesAdded: added,
    linesRemoved: removed,
    files: git('ls-files').split('\n').filter(Boolean).length,
    commitsPerDay: Object.fromEntries(days.map((d) => [d, perDay[d]])),
  };
}

mkdirSync('dist/activity', { recursive: true });
writeFileSync('dist/activity/build.json', JSON.stringify(out));
console.log(`build.json: ${out.commit ?? 'no commit'}, homepage ${out.homepage?.bytes ?? '?'} bytes, ${out.repo ? `${out.repo.commits} commits` : 'no repo stats (shallow clone)'}`);
