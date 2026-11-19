/** Small helpers shared by the Pages Functions. No Cloudflare-only APIs at import time. */

export type Fetch = typeof fetch;

export const json = (body: unknown, init: { status?: number; maxAge?: number } = {}): Response =>
  new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${init.maxAge ?? 60}`,
      'access-control-allow-origin': '*',
    },
  });

/** fetch with a timeout, so a slow upstream never hangs the function. */
export async function fetchWithTimeout(f: Fetch, url: string, init: RequestInit = {}, ms = 5000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await f(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

type EdgeCache = { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> };

/**
 * Serve from Cloudflare's edge cache when available (in production), otherwise just compute.
 * Only successful responses are cached.
 */
export async function cached(request: Request, ttlSeconds: number, produce: () => Promise<Response>): Promise<Response> {
  const store = (globalThis as { caches?: { default?: EdgeCache } }).caches?.default;
  const key = new Request(new URL(request.url).toString(), { method: 'GET' });
  if (store) {
    const hit = await store.match(key);
    if (hit) return hit;
  }
  const res = await produce();
  if (store && res.ok) {
    const copy = new Response(res.clone().body, res);
    copy.headers.set('cache-control', `public, max-age=${ttlSeconds}`);
    await store.put(key, copy);
  }
  return res;
}
