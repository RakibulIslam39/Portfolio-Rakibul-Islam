/**
 * Pointer glow: on desktop, a soft light follows the mouse along the tiles' edges, the way
 * Linear's cards do. Each tile gets the pointer position in its own coordinates (--gx, --gy);
 * the CSS on the home page draws the light. Off for touch screens and reduced motion.
 */
export function initGlow(grid: HTMLElement): void {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!fine || reduce) return;
  grid.dataset.glow = '';
  let raf = 0;
  let x = 0;
  let y = 0;
  grid.addEventListener('pointermove', (e) => {
    x = e.clientX;
    y = e.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      grid.querySelectorAll<HTMLElement>(':scope > .tile').forEach((t) => {
        const r = t.getBoundingClientRect();
        t.style.setProperty('--gx', `${Math.round(x - r.left)}px`);
        t.style.setProperty('--gy', `${Math.round(y - r.top)}px`);
      });
    });
  });
}
