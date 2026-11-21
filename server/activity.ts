import { fetchWithTimeout, type Fetch } from './http';
import { fetchStats, type StatsEnv } from './stats';

/**
 * Everything the Activity page shows that comes from Cloudflare Web Analytics (cookie-free RUM).
 * Each part is its own GraphQL request: if Cloudflare renames a field, only that part turns into
 * null (and its message lands in `errors`), and the rest of the page keeps working.
 */
export interface Activity {
  now: string;
  totals: { today: number; yesterday: number; week: number; prevWeek: number; countries: number } | null;
  /** Visits in the last 30 minutes. */
  recent: number | null;
  /** The latest page views: when, which country (ISO 3166 alpha-2) and which section of the site. */
  latest: Array<{ at: string; country: string; section: string }> | null;
  /** Visits per country this week, most first. */
  places: Array<{ country: string; visits: number }> | null;
  /** Core Web Vitals this week: 75th percentile and the share of visits Google rates "good". */
  vitals: {
    loads: number;
    lcp: { seconds: number | null; good: number | null };
    inp: { ms: number | null; good: number | null };
    cls: { score: number | null; good: number | null };
  } | null;
  /** Typical page load time by country this week. */
  world: Array<{ country: string; seconds: number; loads: number }> | null;
  errors: Record<string, string>;
}

const GQL = 'https://api.cloudflare.com/client/v4/graphql';

async function gql<T>(env: StatsEnv, f: Fetch, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetchWithTimeout(f, GQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` },
    body: JSON.stringify({ query, variables: { account: env.CF_ACCOUNT_ID, site: env.CF_SITE_TAG, ...variables } }),
  });
  if (!res.ok) throw new Error(`Cloudflare API ${res.status}`);
  const body = (await res.json()) as { data?: { viewer?: { accounts?: T[] } }; errors?: Array<{ message: string }> | null };
  if (body.errors?.length) throw new Error(body.errors[0]!.message);
  const account = body.data?.viewer?.accounts?.[0];
  if (!account) throw new Error('no account data');
  return account;
}

const wrap = (inner: string) => `query Activity($account: String!, $site: String!, $from: Time!, $to: Time!) {
  viewer { accounts(filter: { accountTag: $account }) { ${inner} } }
}`;

export const QUERIES = {
  recent: wrap(`rows: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { siteTag: $site, datetime_geq: $from, datetime_leq: $to }) { sum { visits } }`),
  latest: wrap(`rows: rumPageloadEventsAdaptiveGroups(limit: 6, orderBy: [datetimeMinute_DESC], filter: { siteTag: $site, datetime_geq: $from, datetime_leq: $to }) {
    count
    dimensions { datetimeMinute countryName requestPath }
  }`),
  places: wrap(`rows: rumPageloadEventsAdaptiveGroups(limit: 250, orderBy: [sum_visits_DESC], filter: { siteTag: $site, datetime_geq: $from, datetime_leq: $to }) {
    sum { visits }
    dimensions { countryName }
  }`),
  vitals: wrap(`rows: rumWebVitalsEventsAdaptiveGroups(limit: 1, filter: { siteTag: $site, datetime_geq: $from, datetime_leq: $to }) {
    count
    quantiles { largestContentfulPaintP75 interactionToNextPaintP75 cumulativeLayoutShiftP75 }
  }`),
  shares: wrap(`rows: rumWebVitalsEventsAdaptiveGroups(limit: 1, filter: { siteTag: $site, datetime_geq: $from, datetime_leq: $to }) {
    sum { lcpTotal lcpGood inpTotal inpGood clsTotal clsGood }
  }`),
  world: wrap(`rows: rumPerformanceEventsAdaptiveGroups(limit: 250, filter: { siteTag: $site, datetime_geq: $from, datetime_leq: $to }) {
    count
    dimensions { countryName }
    quantiles { pageLoadTimeP50 }
  }`),
};

/** Cloudflare reports RUM timings in microseconds; this keeps working if a field ever comes back in milliseconds. */
export const toMs = (v: number | null | undefined): number | null => (typeof v === 'number' && v >= 0 ? (v > 20_000 ? v / 1000 : v) : null);

/** Which part of this site a path belongs to. */
export function section(path: string): string {
  const first = path.split('/').filter(Boolean)[0] ?? '';
  const names: Record<string, string> = { '': 'Home', about: 'About', projects: 'Projects', writing: 'Blog', certificates: 'Certificates', cv: 'CV', qa: 'QA report', activity: 'Activity' };
  return names[first] ?? 'a page';
}

type Rows<T> = { rows?: T[] };

export async function fetchActivity(env: StatsEnv, now = new Date(), f: Fetch = fetch): Promise<Activity> {
  const iso = (d: Date) => d.toISOString();
  const to = iso(now);
  const week = iso(new Date(now.getTime() - 7 * 864e5));
  const errors: Record<string, string> = {};
  const safe = async <T>(name: string, run: () => Promise<T>): Promise<T | null> => {
    try {
      return await run();
    } catch (e) {
      errors[name] = (e as Error).message;
      return null;
    }
  };

  const [totals, recent, latest, places, vitals, shares, world] = await Promise.all([
    safe('totals', async () => {
      const s = await fetchStats(env, now, f);
      return { today: s.today, yesterday: s.yesterday, week: s.week, prevWeek: s.prevWeek, countries: s.countries };
    }),
    safe('recent', async () => {
      const a = await gql<Rows<{ sum?: { visits?: number } }>>(env, f, QUERIES.recent, { from: iso(new Date(now.getTime() - 30 * 6e4)), to });
      return (a.rows ?? []).reduce((n, r) => n + (r.sum?.visits ?? 0), 0);
    }),
    safe('latest', async () => {
      const a = await gql<Rows<{ dimensions?: { datetimeMinute?: string; countryName?: string; requestPath?: string } }>>(env, f, QUERIES.latest, {
        from: iso(new Date(now.getTime() - 864e5)),
        to,
      });
      return (a.rows ?? []).map((r) => ({ at: r.dimensions?.datetimeMinute ?? '', country: r.dimensions?.countryName ?? '', section: section(r.dimensions?.requestPath ?? '/') }));
    }),
    safe('places', async () => {
      const a = await gql<Rows<{ sum?: { visits?: number }; dimensions?: { countryName?: string } }>>(env, f, QUERIES.places, { from: week, to });
      return (a.rows ?? []).map((r) => ({ country: r.dimensions?.countryName ?? '', visits: r.sum?.visits ?? 0 })).filter((r) => r.country && r.visits);
    }),
    safe('vitals', async () => {
      const a = await gql<Rows<{ count?: number; quantiles?: Record<string, number> }>>(env, f, QUERIES.vitals, { from: week, to });
      return a.rows?.[0] ?? null;
    }),
    safe('shares', async () => {
      const a = await gql<Rows<{ sum?: Record<string, number> }>>(env, f, QUERIES.shares, { from: week, to });
      return a.rows?.[0]?.sum ?? null;
    }),
    safe('world', async () => {
      const a = await gql<Rows<{ count?: number; dimensions?: { countryName?: string }; quantiles?: { pageLoadTimeP50?: number } }>>(env, f, QUERIES.world, { from: week, to });
      return (a.rows ?? [])
        .map((r) => ({ country: r.dimensions?.countryName ?? '', seconds: (toMs(r.quantiles?.pageLoadTimeP50) ?? 0) / 1000, loads: r.count ?? 0 }))
        .filter((r) => r.country && r.loads && r.seconds);
    }),
  ]);

  const share = (good?: number, total?: number) => (good != null && total ? good / total : null);
  const q = vitals?.quantiles ?? {};
  const lcp = toMs(q.largestContentfulPaintP75);
  const inp = toMs(q.interactionToNextPaintP75);
  const cls = typeof q.cumulativeLayoutShiftP75 === 'number' ? q.cumulativeLayoutShiftP75 : null;

  return {
    now: to,
    totals,
    recent,
    latest,
    places,
    vitals:
      vitals || shares
        ? {
            loads: vitals?.count ?? shares?.lcpTotal ?? 0,
            lcp: { seconds: lcp == null ? null : Math.round(lcp / 10) / 100, good: share(shares?.lcpGood, shares?.lcpTotal) },
            inp: { ms: inp == null ? null : Math.round(inp), good: share(shares?.inpGood, shares?.inpTotal) },
            cls: { score: cls == null ? null : Math.round(cls * 100) / 100, good: share(shares?.clsGood, shares?.clsTotal) },
          }
        : null,
    world,
    errors,
  };
}
