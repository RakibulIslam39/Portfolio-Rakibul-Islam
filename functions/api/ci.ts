// Cloudflare Pages Function: GET /api/ci → latest CI run of this site on main.
import { latestCiRun, type CiEnv } from '../../server/ci';
import { cached, json } from '../../server/http';

export const onRequestGet = async ({ request, env }: { request: Request; env: CiEnv }): Promise<Response> =>
  cached(request, 120, async () => {
    try {
      const run = await latestCiRun(env);
      return run ? json(run, { maxAge: 120 }) : json({ error: 'No runs yet' }, { status: 404, maxAge: 60 });
    } catch (e) {
      return json({ error: (e as Error).message }, { status: 502, maxAge: 30 });
    }
  });
