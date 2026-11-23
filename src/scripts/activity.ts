/**
 * The Activity page: live numbers from /api/activity, this build's facts from /activity/build.json,
 * your own visit timing from the browser, and a dotted globe drawn on a canvas.
 * Every part fills in on its own; anything missing stays as "–".
 */
import { getJSON, relativeTime } from './live';
import { showVisit } from './visit';

interface Activity {
  now: string;
  totals: { today: number; yesterday: number; week: number; prevWeek: number; countries: number } | null;
  recent: number | null;
  latest: Array<{ at: string; country: string; section: string }> | null;
  places: Array<{ country: string; visits: number }> | null;
  vitals: {
    loads: number;
    lcp: { seconds: number | null; good: number | null };
    inp: { ms: number | null; good: number | null };
    cls: { score: number | null; good: number | null };
  } | null;
  world: Array<{ country: string; seconds: number; loads: number }> | null;
}
interface Build {
  commit: string | null;
  at: string | null;
  message: string | null;
  homepage: { bytes: number; files: number } | null;
  repo: { commits: number; days: number; firstCommit: string | null; linesAdded: number; linesRemoved: number; files: number; commitsPerDay: Record<string, number> } | null;
}
interface Geo {
  dots: [number, number][];
  places: Record<string, { c: [number, number]; k: string | null }>;
}

const fmt = new Intl.NumberFormat('en');
const regionName = (() => {
  try {
    const d = new Intl.DisplayNames(['en'], { type: 'region' });
    return (code: string) => {
      try {
        return d.of(code) ?? code;
      } catch {
        return code;
      }
    };
  } catch {
    return (code: string) => code;
  }
})();
const flag = (code: string) => (/^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1a5 + c.charCodeAt(0))) : '🌐');
const $ = <T extends Element = HTMLElement>(root: ParentNode, sel: string) => root.querySelector<T>(sel);

function renderLive(root: HTMLElement, a: Activity) {
  if (a.recent != null) $(root, '[data-recent]')!.textContent = fmt.format(a.recent);
  if (a.totals) {
    const t = a.totals;
    $(root, '[data-total="today"]')!.textContent = fmt.format(t.today);
    $(root, '[data-total="week"]')!.textContent = fmt.format(t.week);
    $(root, '[data-total="countries"]')!.textContent = fmt.format(t.countries);
    const change = (key: string, now: number, before: number) => {
      const el = $(root, `[data-change="${key}"]`)!;
      if (!before) {
        el.textContent = now ? 'New' : '';
        el.dataset.trend = now ? 'up' : 'flat';
        return;
      }
      const pct = Math.round(((now - before) / before) * 100);
      el.textContent = `${pct > 0 ? '+' : ''}${pct}%`;
      el.dataset.trend = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
    };
    change('today', t.today, t.yesterday);
    change('week', t.week, t.prevWeek);
  }
  const feed = $(root, '[data-feed]')!;
  feed.replaceChildren(
    ...(a.latest ?? []).slice(0, 4).map((v) => {
      const li = document.createElement('li');
      const name = document.createElement('strong');
      name.textContent = regionName(v.country);
      li.append(`${flag(v.country)} `, name, ` opened ${v.section} · ${relativeTime(v.at)}`);
      return li;
    }),
  );
}

function renderVitals(root: HTMLElement, v: NonNullable<Activity['vitals']>) {
  const set = (key: string, text: string | null, good: number | null) => {
    if (text) $(root, `[data-vital="${key}"]`)!.textContent = text;
    const ring = $<SVGCircleElement>(root, `[data-ring="${key}"]`);
    if (ring && good != null) {
      const c = Number(ring.dataset.c);
      ring.setAttribute('stroke-dasharray', `${(Math.max(0, Math.min(1, good)) * c).toFixed(1)} ${c}`);
    }
  };
  set('lcp', v.lcp.seconds != null ? `${v.lcp.seconds.toFixed(1)} s` : null, v.lcp.good);
  set('inp', v.inp.ms != null ? `${v.inp.ms} ms` : null, v.inp.good);
  set('cls', v.cls.score != null ? v.cls.score.toFixed(2) : null, v.cls.good);
  const shares = [v.lcp.good, v.inp.good, v.cls.good].map((g) => (g == null ? '?' : `${Math.round(g * 100)}%`));
  $(root, '[data-rings]')!.setAttribute('aria-label', `Visits rated good this week: loading ${shares[0]}, responding ${shares[1]}, staying put ${shares[2]}`);
}

function renderWorld(root: HTMLElement, rows: NonNullable<Activity['world']>, geo: Geo | null) {
  if (!geo) return;
  const by: Record<string, { t: number; n: number }> = {};
  for (const r of rows) {
    const k = geo.places[r.country]?.k;
    if (!k) continue;
    by[k] ??= { t: 0, n: 0 };
    by[k].t += r.seconds * r.loads;
    by[k].n += r.loads;
  }
  const max = Math.max(1, ...Object.values(by).map((v) => v.t / v.n));
  root.querySelectorAll<HTMLElement>('[data-region]').forEach((li) => {
    const v = by[li.dataset.region!];
    if (!v) return;
    const s = v.t / v.n;
    li.querySelector('em')!.textContent = `${s.toFixed(1)} s`;
    li.querySelector<HTMLElement>('b')!.style.width = `${Math.max(4, (s / max) * 100)}%`;
  });
}

function renderBuild(root: HTMLElement, b: Build) {
  if (b.at) {
    const at = Date.parse(b.at);
    const ago = $(root, '[data-ago]')!;
    const tick = () => {
      let s = Math.max(0, Math.floor((Date.now() - at) / 1000));
      const d = Math.floor(s / 86400);
      s -= d * 86400;
      const h = Math.floor(s / 3600);
      s -= h * 3600;
      const m = Math.floor(s / 60);
      s -= m * 60;
      const p = (n: number) => String(n).padStart(2, '0');
      ago.textContent = `${d ? `${d}d ` : ''}${p(h)}h ${p(m)}m ${p(s)}s`;
    };
    tick();
    window.setInterval(tick, 1000);
  }
  if (b.message) $(root, '[data-commit]')!.textContent = `Latest change: “${b.message}”${b.commit ? ` (${b.commit})` : ''}`;
  if (b.homepage) $(root, '[data-weight]')!.textContent = `${Math.round(b.homepage.bytes / 1024)} KB`;
  const r = b.repo;
  if (!r) return;
  (['linesAdded', 'commits', 'days', 'linesRemoved', 'files'] as const).forEach((k) => {
    $(root, `[data-repo="${k}"]`)!.textContent = fmt.format(r[k]);
  });
  if (r.firstCommit) {
    const since = new Date(`${r.firstCommit}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    $(root, '[data-since]')!.textContent = `Counted from the site's git history, from the first commit on ${since} to this deploy.`;
  }
  // One bar per day from the first commit to today, empty days included.
  const days = $(root, '[data-days]')!;
  const first = r.firstCommit ? Date.parse(`${r.firstCommit}T00:00:00Z`) : null;
  if (first == null) return;
  const last = Math.max(Date.parse(`${Object.keys(r.commitsPerDay).sort().at(-1)}T00:00:00Z`), first);
  const max = Math.max(1, ...Object.values(r.commitsPerDay));
  const bars: HTMLElement[] = [];
  for (let t = first; t <= last && bars.length < 400; t += 864e5) {
    const key = new Date(t).toISOString().slice(0, 10);
    const n = r.commitsPerDay[key] ?? 0;
    const i = document.createElement('i');
    i.title = `${key}: ${n} commit${n === 1 ? '' : 's'}`;
    if (!n) i.dataset.zero = '';
    i.style.height = `${(n / max) * 100}%`;
    bars.push(i);
  }
  days.replaceChildren(...bars);
  days.setAttribute('aria-label', `Commits per day, ${bars.length} days, busiest day ${max} commits`);
}

/** A slowly turning dotted globe. Countries with visits this week glow; their size follows the visits. */
function globe(canvas: HTMLCanvasElement, geo: Geo, places: Activity['places']) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = canvas.clientWidth || 520;
  canvas.width = size * dpr;
  canvas.height = size * dpr;
  ctx.scale(dpr, dpr);
  const R = size / 2 - 4;
  const cx = size / 2;
  const cy = size / 2;
  const rad = Math.PI / 180;
  const tilt = 18 * rad;
  const hits = (places ?? [])
    .map((p) => ({ ...p, c: geo.places[p.country]?.c }))
    .filter((p): p is { country: string; visits: number; c: [number, number] } => !!p.c);
  const most = Math.max(1, ...hits.map((h) => h.visits));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Start facing the busiest country (Bangladesh until there is data).
  let spin = -((hits[0]?.c[0] ?? 90) * rad);

  const project = (lon: number, lat: number) => {
    const l = lon * rad + spin;
    const p = lat * rad;
    const x = Math.cos(p) * Math.sin(l);
    const y0 = Math.sin(p);
    const z0 = Math.cos(p) * Math.cos(l);
    const y = y0 * Math.cos(tilt) - z0 * Math.sin(tilt);
    const z = y0 * Math.sin(tilt) + z0 * Math.cos(tilt);
    return { x: cx + x * R, y: cy - y * R, z };
  };

  const draw = (t: number) => {
    const dark = document.documentElement.dataset.theme !== 'light';
    ctx.clearRect(0, 0, size, size);
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    g.addColorStop(0, dark ? 'rgba(80,110,160,0.16)' : 'rgba(60,90,140,0.10)');
    g.addColorStop(1, dark ? 'rgba(20,24,40,0.05)' : 'rgba(200,210,230,0.05)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = dark ? 'rgba(220,230,255,0.55)' : 'rgba(40,50,80,0.45)';
    for (const [lon, lat] of geo.dots) {
      const p = project(lon, lat);
      if (p.z <= 0) continue;
      ctx.globalAlpha = 0.25 + p.z * 0.75;
      ctx.fillRect(p.x - 1, p.y - 1, 2, 2);
    }
    ctx.globalAlpha = 1;
    for (const h of hits) {
      const p = project(h.c[0], h.c[1]);
      if (p.z <= 0.05) continue;
      const r = 3 + Math.sqrt(h.visits / most) * 7;
      const pulse = reduce ? 0 : (Math.sin(t / 600 + h.c[0]) + 1) / 2;
      ctx.fillStyle = `rgba(47,208,138,${0.18 + pulse * 0.15})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * (1.8 + pulse * 0.6), 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2fd08a';
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  let raf = 0;
  let last = 0;
  const loop = (t: number) => {
    if (last) spin += ((t - last) / 1000) * 0.08;
    last = t;
    draw(t);
    raf = requestAnimationFrame(loop);
  };
  if (reduce) {
    draw(0);
    return;
  }
  // Only animate while the globe is on screen.
  new IntersectionObserver(([e]) => {
    if (e?.isIntersecting) {
      last = 0;
      raf = requestAnimationFrame(loop);
    } else cancelAnimationFrame(raf);
  }).observe(canvas);
  draw(0);
}

export function initActivity(): void {
  const root = document.querySelector<HTMLElement>('[data-activity]');
  if (!root) return;
  showVisit($(root, '[data-visit]'), (city) => `to reach you, from Cloudflare in ${city}`);

  void getJSON<Build>('/activity/build.json').then((b) => {
    if (b) renderBuild(root, b);
    root.querySelectorAll<HTMLElement>('[data-build]').forEach((el) => {
      delete el.dataset.loading;
      el.removeAttribute('aria-busy');
    });
  });

  const geoP = getJSON<Geo>('/activity/geo.json', 8000);
  const load = async () => {
    const a = await getJSON<Activity>('/api/activity', 8000);
    root.dataset.state = a ? 'ready' : 'off';
    delete root.dataset.loading;
    root.removeAttribute('aria-busy');
    $(root, '[data-off]')!.hidden = !!a;
    if (!a) return null;
    renderLive(root, a);
    if (a.vitals) renderVitals(root, a.vitals);
    const geo = await geoP;
    if (a.world) renderWorld(root, a.world, geo);
    return { a, geo };
  };
  void load().then(async (res) => {
    const geo = res?.geo ?? (await geoP);
    const canvas = $<HTMLCanvasElement>(root, '[data-globe]');
    if (geo && canvas) globe(canvas, geo, res?.a.places ?? null);
  });
  // Refresh the live numbers every five minutes while the page is open.
  window.setInterval(() => {
    if (document.visibilityState === 'visible') void load();
  }, 300_000);
}
