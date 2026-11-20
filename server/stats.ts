import { fetchWithTimeout, type Fetch } from './http';

export interface StatsEnv {
  /** API token with "Account Analytics: Read". */
  CF_ANALYTICS_TOKEN?: string;
  /** Cloudflare account ID. */
  CF_ACCOUNT_ID?: string;
  /** Web Analytics site tag (Web Analytics → your site → "Manage site"). */
  CF_SITE_TAG?: string;
}

export interface Stats {
  today: number;
  week: number;
  countries: number;
  /** Visits yesterday up to the same time of day, to compare with `today`. */
  yesterday: number;
  /** Visits in the 7 days before this week, to compare with `week`. */
  prevWeek: number;
  updatedAt: string;
}

export const isConfigured = (env: StatsEnv): boolean => !!(env.CF_ANALYTICS_TOKEN && env.CF_ACCOUNT_ID && env.CF_SITE_TAG);

/*
 * Cloudflare Web Analytics data lives in the `rumPageloadEventsAdaptiveGroups` dataset of the
 * GraphQL Analytics API. If Cloudflare renames fields, test the query in the GraphiQL explorer
 * (https://graphql.cloudflare.com) and adjust it here; the endpoint returns 502 until it works.
 */
export const QUERY = `query Stats($account: String!, $site: String!, $dayStart: Time!, $weekStart: Time!, $now: Time!, $yStart: Time!, $yNow: Time!, $pwStart: Time!) {
  viewer {
    accounts(filter: { accountTag: $account }) {
      today: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { siteTag: $site, datetime_geq: $dayStart, datetime_leq: $now }) {
        sum { visits }
      }
      week: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { siteTag: $site, datetime_geq: $weekStart, datetime_leq: $now }) {
        sum { visits }
      }
      yesterday: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { siteTag: $site, datetime_geq: $yStart, datetime_leq: $yNow }) {
        sum { visits }
      }
      prevWeek: rumPageloadEventsAdaptiveGroups(limit: 1, filter: { siteTag: $site, datetime_geq: $pwStart, datetime_lt: $weekStart }) {
        sum { visits }
      }
      countries: rumPageloadEventsAdaptiveGroups(limit: 250, filter: { siteTag: $site, datetime_geq: $weekStart, datetime_leq: $now }) {
        dimensions { countryName }
      }
    }
  }
}`;

interface GqlResponse {
  data?: {
    viewer?: {
      accounts?: Array<{
        today?: Array<{ sum?: { visits?: number } }>;
        week?: Array<{ sum?: { visits?: number } }>;
        yesterday?: Array<{ sum?: { visits?: number } }>;
        prevWeek?: Array<{ sum?: { visits?: number } }>;
        countries?: Array<{ dimensions?: { countryName?: string } }>;
      }>;
    };
  };
  errors?: Array<{ message: string }> | null;
}

const sumVisits = (rows?: Array<{ sum?: { visits?: number } }>) => (rows ?? []).reduce((n, r) => n + (r.sum?.visits ?? 0), 0);

/** Visits today (UTC), in the last 7 days, and distinct countries this week. */
export async function fetchStats(env: StatsEnv, now = new Date(), f: Fetch = fetch): Promise<Stats> {
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const weekStart = new Date(now.getTime() - 7 * 864e5);
  const res = await fetchWithTimeout(f, 'https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.CF_ANALYTICS_TOKEN}` },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        account: env.CF_ACCOUNT_ID,
        site: env.CF_SITE_TAG,
        dayStart: dayStart.toISOString(),
        weekStart: weekStart.toISOString(),
        now: now.toISOString(),
        yStart: new Date(dayStart.getTime() - 864e5).toISOString(),
        yNow: new Date(now.getTime() - 864e5).toISOString(),
        pwStart: new Date(weekStart.getTime() - 7 * 864e5).toISOString(),
      },
    }),
  });
  if (!res.ok) throw new Error(`Cloudflare API ${res.status}`);
  const body = (await res.json()) as GqlResponse;
  if (body.errors?.length) throw new Error(`Cloudflare GraphQL: ${body.errors[0]!.message}`);
  const account = body.data?.viewer?.accounts?.[0];
  if (!account) throw new Error('Cloudflare GraphQL: no account data');
  const countries = new Set((account.countries ?? []).map((r) => r.dimensions?.countryName).filter(Boolean));
  return {
    today: sumVisits(account.today),
    week: sumVisits(account.week),
    countries: countries.size,
    yesterday: sumVisits(account.yesterday),
    prevWeek: sumVisits(account.prevWeek),
    updatedAt: now.toISOString(),
  };
}
