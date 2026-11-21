/**
 * Unit tests for the Pages Functions logic in server/. They need no browser, so they run
 * once (the other projects ignore this file) with a fake fetch instead of real network calls.
 */
import { test, expect } from '@playwright/test';
import { latestCiRun, toSummary, DEFAULT_REPO } from '../server/ci';
import { fetchStats, isConfigured, QUERY } from '../server/stats';
import { onRequestGet as statsHandler } from '../functions/api/stats';
import { onRequestGet as ciHandler } from '../functions/api/ci';
import { fetchActivity, section, toMs } from '../server/activity';
import { onRequestGet as activityHandler } from '../functions/api/activity';

const run = {
  status: 'completed',
  conclusion: 'success',
  display_title: 'Phase 6',
  head_sha: 'abc1234def5678',
  html_url: 'https://github.com/x/y/actions/runs/1',
  run_started_at: '2026-11-19T10:00:00Z',
  updated_at: '2026-11-19T10:03:11Z',
  run_number: 7,
};

const fakeFetch = (body: unknown, status = 200) => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const f = (async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  }) as unknown as typeof fetch;
  return { f, calls };
};

test.describe('CI summary', () => {
  test('maps a successful run', () => {
    expect(toSummary(run)).toEqual({
      status: 'passing',
      conclusion: 'success',
      title: 'Phase 6',
      commit: 'abc1234',
      url: run.html_url,
      startedAt: run.run_started_at,
      durationSeconds: 191,
      runNumber: 7,
    });
  });

  test('maps failing, running and other conclusions', () => {
    expect(toSummary({ ...run, conclusion: 'failure' }).status).toBe('failing');
    expect(toSummary({ ...run, conclusion: 'timed_out' }).status).toBe('failing');
    expect(toSummary({ ...run, conclusion: 'cancelled' }).status).toBe('unknown');
    const running = toSummary({ ...run, status: 'in_progress', conclusion: null });
    expect(running.status).toBe('running');
    expect(running.durationSeconds).toBeNull();
  });

  test('calls the GitHub API for the CI workflow on main', async () => {
    const { f, calls } = fakeFetch({ workflow_runs: [run] });
    const summary = await latestCiRun({}, f);
    expect(summary?.status).toBe('passing');
    expect(calls[0]!.url).toBe(`https://api.github.com/repos/${DEFAULT_REPO}/actions/workflows/ci.yml/runs?branch=main&per_page=1`);
    const headers = calls[0]!.init!.headers as Record<string, string>;
    expect(headers['user-agent']).toBeTruthy();
    expect(headers.authorization).toBeUndefined();
  });

  test('sends the token when one is configured', async () => {
    const { f, calls } = fakeFetch({ workflow_runs: [run] });
    await latestCiRun({ GITHUB_TOKEN: 'secret', GITHUB_REPO: 'a/b' }, f);
    expect(calls[0]!.url).toContain('/repos/a/b/');
    expect((calls[0]!.init!.headers as Record<string, string>).authorization).toBe('Bearer secret');
  });

  test('returns null with no runs and throws on API errors', async () => {
    expect(await latestCiRun({}, fakeFetch({ workflow_runs: [] }).f)).toBeNull();
    await expect(latestCiRun({}, fakeFetch({ message: 'rate limited' }, 403).f)).rejects.toThrow('GitHub API 403');
  });
});

test.describe('visitor stats', () => {
  const env = { CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'acc', CF_SITE_TAG: 'site' };
  const now = new Date('2026-11-19T15:30:00Z');

  test('needs all three settings', () => {
    expect(isConfigured(env)).toBe(true);
    expect(isConfigured({ ...env, CF_SITE_TAG: '' })).toBe(false);
  });

  test('sums visits and counts distinct countries', async () => {
    const { f, calls } = fakeFetch({
      data: {
        viewer: {
          accounts: [
            {
              today: [{ sum: { visits: 38 } }],
              week: [{ sum: { visits: 417 } }],
              yesterday: [{ sum: { visits: 30 } }],
              prevWeek: [{ sum: { visits: 380 } }],
              countries: [
                { dimensions: { countryName: 'BD' } },
                { dimensions: { countryName: 'DE' } },
                { dimensions: { countryName: 'BD' } },
              ],
            },
          ],
        },
      },
    });
    expect(await fetchStats(env, now, f)).toEqual({ today: 38, week: 417, countries: 2, yesterday: 30, prevWeek: 380, updatedAt: now.toISOString() });

    const req = calls[0]!;
    expect(req.url).toBe('https://api.cloudflare.com/client/v4/graphql');
    const body = JSON.parse(req.init!.body as string);
    expect(body.query).toBe(QUERY);
    expect(body.variables).toMatchObject({ account: 'acc', site: 'site', dayStart: '2026-11-19T00:00:00.000Z', yStart: '2026-11-18T00:00:00.000Z', yNow: '2026-11-18T15:30:00.000Z' });
    expect((req.init!.headers as Record<string, string>).authorization).toBe('Bearer t');
  });

  test('surfaces GraphQL errors', async () => {
    await expect(fetchStats(env, now, fakeFetch({ errors: [{ message: 'unknown field' }] }).f)).rejects.toThrow('unknown field');
    await expect(fetchStats(env, now, fakeFetch({}, 500).f)).rejects.toThrow('Cloudflare API 500');
  });
});

test.describe('Pages Functions', () => {
  const request = new Request('https://example.com/api/x');

  test('/api/stats returns 204 (no content) until analytics is configured', async () => {
    const res = await statsHandler({ request, env: {} });
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
  });

  test('/api/ci returns 502 when GitHub fails, and JSON when it works', async () => {
    const original = globalThis.fetch;
    try {
      globalThis.fetch = fakeFetch({}, 500).f;
      expect((await ciHandler({ request, env: {} })).status).toBe(502);
      globalThis.fetch = fakeFetch({ workflow_runs: [run] }).f;
      const ok = await ciHandler({ request, env: {} });
      expect(ok.status).toBe(200);
      expect((await ok.json()).status).toBe('passing');
    } finally {
      globalThis.fetch = original;
    }
  });
});

test.describe('activity', () => {
  const env = { CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'acc', CF_SITE_TAG: 'site' };
  const now = new Date('2026-11-21T16:00:00Z');

  test('names the part of the site a path belongs to', () => {
    expect(section('/')).toBe('Home');
    expect(section('/projects/flexorder-e2e/')).toBe('Projects');
    expect(section('/writing/')).toBe('Blog');
    expect(section('/nope/')).toBe('a page');
  });

  test('reads Cloudflare timings in microseconds or milliseconds', () => {
    expect(toMs(1_200_000)).toBe(1200);
    expect(toMs(850)).toBe(850);
    expect(toMs(null)).toBeNull();
  });

  test('one failing part does not take the others down', async () => {
    // Answer each query by what it asks for; the Web Vitals "shares" query fails like an unknown field would.
    const f = (async (_url: string, init?: RequestInit) => {
      const q = JSON.parse(String(init?.body)).query as string;
      const reply = (accounts: unknown) => new Response(JSON.stringify({ data: { viewer: { accounts: [accounts] } } }), { headers: { 'content-type': 'application/json' } });
      if (q.includes('lcpGood')) return new Response(JSON.stringify({ errors: [{ message: 'unknown field lcpGood' }] }), { headers: { 'content-type': 'application/json' } });
      if (q.includes('today:')) return reply({ today: [{ sum: { visits: 9 } }], week: [{ sum: { visits: 90 } }], yesterday: [{ sum: { visits: 3 } }], prevWeek: [], countries: [{ dimensions: { countryName: 'BD' } }] });
      if (q.includes('datetimeMinute')) return reply({ rows: [{ count: 1, dimensions: { datetimeMinute: '2026-11-21T15:50:00Z', countryName: 'BD', requestPath: '/about/' } }] });
      if (q.includes('sum_visits_DESC')) return reply({ rows: [{ sum: { visits: 7 }, dimensions: { countryName: 'BD' } }] });
      if (q.includes('largestContentfulPaintP75')) return reply({ rows: [{ count: 40, quantiles: { largestContentfulPaintP75: 1_234_000, interactionToNextPaintP75: 72_000, cumulativeLayoutShiftP75: 0.013 } }] });
      if (q.includes('pageLoadTimeP50')) return reply({ rows: [{ count: 5, dimensions: { countryName: 'BD' }, quantiles: { pageLoadTimeP50: 800_000 } }] });
      return reply({ rows: [{ sum: { visits: 2 } }] });
    }) as unknown as typeof fetch;
    const a = await fetchActivity(env, now, f);
    expect(a.recent).toBe(2);
    expect(a.totals).toMatchObject({ today: 9, week: 90, countries: 1 });
    expect(a.latest).toEqual([{ at: '2026-11-21T15:50:00Z', country: 'BD', section: 'About' }]);
    expect(a.places).toEqual([{ country: 'BD', visits: 7 }]);
    expect(a.vitals).toEqual({ loads: 40, lcp: { seconds: 1.23, good: null }, inp: { ms: 72, good: null }, cls: { score: 0.01, good: null } });
    expect(a.world).toEqual([{ country: 'BD', seconds: 0.8, loads: 5 }]);
    expect(a.errors).toEqual({ shares: 'unknown field lcpGood' });
  });

  test('the endpoint answers 204 until analytics is set up', async () => {
    const res = await activityHandler({ request: new Request('https://x/api/activity'), env: {} });
    expect(res.status).toBe(204);
  });
});
