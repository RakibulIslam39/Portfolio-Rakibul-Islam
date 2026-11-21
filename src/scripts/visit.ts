/**
 * "Your visit": how long this page took to reach the visitor, from the browser's own Navigation Timing,
 * split into find (DNS), connect, wait and download, plus the Cloudflare data centre that served it.
 * Used on /qa and /activity. Expects [data-visit-total], [data-visit-where], [data-ms="…"] and [data-bar="…"].
 */
const CITIES: Record<string, string> = {
  DAC: 'Dhaka', CGP: 'Chattogram', CCU: 'Kolkata', DEL: 'Delhi', BOM: 'Mumbai', MAA: 'Chennai', SIN: 'Singapore', KUL: 'Kuala Lumpur',
  BKK: 'Bangkok', HKG: 'Hong Kong', NRT: 'Tokyo', ICN: 'Seoul', SYD: 'Sydney', DXB: 'Dubai', FRA: 'Frankfurt', AMS: 'Amsterdam',
  LHR: 'London', CDG: 'Paris', ARN: 'Stockholm', WAW: 'Warsaw', BUD: 'Budapest', VIE: 'Vienna', MAD: 'Madrid', MXP: 'Milan',
  IAD: 'Ashburn', EWR: 'Newark', ORD: 'Chicago', DFW: 'Dallas', LAX: 'Los Angeles', SJC: 'San Jose', SEA: 'Seattle', YYZ: 'Toronto', GRU: 'São Paulo',
};

export function showVisit(visit: HTMLElement | null, where: (city: string) => string): void {
  if (!visit) return;
  const run = () => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (!nav || !nav.responseEnd) return;
    const parts = {
      dns: nav.domainLookupEnd - nav.domainLookupStart,
      connect: nav.connectEnd - nav.connectStart,
      wait: nav.responseStart - nav.requestStart,
      download: nav.responseEnd - nav.responseStart,
    };
    visit.querySelector('[data-visit-total]')!.textContent = String(Math.round(nav.responseEnd - nav.startTime));
    const max = Math.max(...Object.values(parts), 1);
    (Object.keys(parts) as (keyof typeof parts)[]).forEach((k) => {
      const ms = Math.max(0, Math.round(parts[k]));
      visit.querySelector(`[data-ms="${k}"]`)!.textContent = `${ms} ms`;
      visit.querySelector<HTMLElement>(`[data-bar="${k}"]`)!.style.width = `${Math.max(2, (ms / max) * 100)}%`;
    });
  };
  if (document.readyState === 'complete') run();
  else window.addEventListener('load', run, { once: true });

  // Which Cloudflare data centre served the page (only answers on the live site).
  fetch('/cdn-cgi/trace')
    .then((r) => (r.ok ? r.text() : ''))
    .then((text) => {
      const colo = /^colo=(\w+)$/m.exec(text)?.[1];
      if (colo) visit.querySelector('[data-visit-where]')!.textContent = where(CITIES[colo] ?? colo);
    })
    .catch(() => undefined);
}
