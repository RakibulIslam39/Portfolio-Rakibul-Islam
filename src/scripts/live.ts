/** Client helpers for the live widgets. Every widget stays hidden or shows a fallback if data is missing. */

export interface CiSummary {
  status: 'passing' | 'failing' | 'running' | 'unknown';
  title: string;
  commit: string;
  url: string;
  startedAt: string;
  durationSeconds: number | null;
  runNumber: number;
}

export interface Stats {
  today: number;
  week: number;
  countries: number;
  updatedAt: string;
}

export async function getJSON<T>(url: string, ms = 4000): Promise<T | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { accept: 'application/json' } });
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

export function relativeTime(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? '' : 's'} ago`;
}

export const formatDuration = (sec: number | null): string =>
  sec === null ? '' : sec < 60 ? `${sec}s` : `${Math.floor(sec / 60)}m ${String(sec % 60).padStart(2, '0')}s`;

export const statusLabel: Record<CiSummary['status'], string> = {
  passing: 'Passing',
  failing: 'Failing',
  running: 'Running',
  unknown: 'Unknown',
};
