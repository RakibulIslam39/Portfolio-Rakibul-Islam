// Cloudflare Pages Function: GET /api/activity → everything the Activity page shows from Cloudflare Web Analytics.
import { cached, json } from '../../server/http';
import { isConfigured, type StatsEnv } from '../../server/stats';
import { fetchActivity } from '../../server/activity';

export const onRequestGet = async ({ request, env }: { request: Request; env: StatsEnv }): Promise<Response> => {
  if (!isConfigured(env)) return new Response(null, { status: 204, headers: { 'cache-control': 'public, max-age=300' } });
  return cached(request, 300, async () => {
    try {
      return json(await fetchActivity(env), { maxAge: 300 });
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 502, maxAge: 30 });
    }
  });
};
