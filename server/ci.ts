import { fetchWithTimeout, type Fetch } from './http';

export interface CiEnv {
  /** "owner/repo". Defaults to the portfolio repo. */
  GITHUB_REPO?: string;
  /** Optional; raises the GitHub API rate limit from 60 to 5,000 requests/hour. */
  GITHUB_TOKEN?: string;
}

export interface CiSummary {
  status: 'passing' | 'failing' | 'running' | 'unknown';
  conclusion: string | null;
  title: string;
  commit: string;
  url: string;
  startedAt: string;
  durationSeconds: number | null;
  runNumber: number;
}

interface GhRun {
  status: string;
  conclusion: string | null;
  display_title: string;
  head_sha: string;
  html_url: string;
  run_started_at: string;
  updated_at: string;
  run_number: number;
}

export const DEFAULT_REPO = 'RakibulIslam39/Portfolio-Rakibul-Islam';

export function toSummary(run: GhRun): CiSummary {
  const running = run.status !== 'completed';
  const status: CiSummary['status'] = running
    ? 'running'
    : run.conclusion === 'success'
      ? 'passing'
      : run.conclusion === 'failure' || run.conclusion === 'timed_out'
        ? 'failing'
        : 'unknown';
  const started = Date.parse(run.run_started_at);
  const ended = Date.parse(run.updated_at);
  return {
    status,
    conclusion: run.conclusion,
    title: run.display_title,
    commit: run.head_sha.slice(0, 7),
    url: run.html_url,
    startedAt: run.run_started_at,
    durationSeconds: running || Number.isNaN(started) || Number.isNaN(ended) ? null : Math.round((ended - started) / 1000),
    runNumber: run.run_number,
  };
}

/** Latest run of the CI workflow on main. Throws on upstream errors. */
export async function latestCiRun(env: CiEnv, f: Fetch = fetch): Promise<CiSummary | null> {
  const repo = env.GITHUB_REPO || DEFAULT_REPO;
  const url = `https://api.github.com/repos/${repo}/actions/workflows/ci.yml/runs?branch=main&per_page=1`;
  const headers: Record<string, string> = {
    accept: 'application/vnd.github+json',
    'user-agent': 'rakibul-portfolio',
    'x-github-api-version': '2022-11-28',
  };
  if (env.GITHUB_TOKEN) headers.authorization = `Bearer ${env.GITHUB_TOKEN}`;
  const res = await fetchWithTimeout(f, url, { headers });
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  const data = (await res.json()) as { workflow_runs?: GhRun[] };
  const run = data.workflow_runs?.[0];
  return run ? toSummary(run) : null;
}
