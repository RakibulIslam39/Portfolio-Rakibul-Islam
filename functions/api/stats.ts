// Cloudflare Pages Function: GET /api/stats → visitor counts from Cloudflare Web Analytics.
import { cached, json } from '../../server/http';
import { fetchStats, isConfigured, type StatsEnv } from '../../server/stats';

export const onRequestGet = async ({ request, env }: { request: Request; env: StatsEnv }): Promise<Response> => {
  // 204 rather than an error status, so visitors' consoles stay clean before analytics is set up.
  if (!isConfigured(env)) return new Response(null, { status: 204, headers: { 'cache-control': 'public, max-age=300' } });
  return cached(request, 300, async () => {
    try {
      return json(await fetchStats(env), { maxAge: 300 });
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 502, maxAge: 30 });
    }
  });
};
