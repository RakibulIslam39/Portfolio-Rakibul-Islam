type Theme = 'light' | 'dark';

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark';
}

function setTheme(theme: Theme): void {
  const apply = () => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f2f2f5' : '#0e0e10');
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* storage can be unavailable (private mode); the theme still applies */
    }
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  type Transition = { ready: Promise<void>; finished: Promise<void> };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => Transition };
  if (!doc.startViewTransition || reduce) return apply();

  // The new theme grows as a circle from the point that was clicked (or the top-right corner,
  // where the toggle lives, when it came from the keyboard or ⌘K).
  const x = origin?.x ?? window.innerWidth - 40;
  const y = origin?.y ?? 40;
  const r = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;
  root.dataset.themeSwitch = '';
  const t = doc.startViewTransition(apply);
  t.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
        { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.3, 1)', pseudoElement: '::view-transition-new(root)' },
      );
    })
    .catch(() => undefined);
  void t.finished.finally(() => delete root.dataset.themeSwitch);
}

let origin: { x: number; y: number } | null = null;

export function toggleTheme(): void {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
  origin = null;
}

export function initTheme(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      // A real click starts the circle under the pointer; a keyboard press starts it at the button.
      const box = btn.getBoundingClientRect();
      origin = e.detail > 0 ? { x: e.clientX, y: e.clientY } : { x: box.left + box.width / 2, y: box.top + box.height / 2 };
      toggleTheme();
    });
  });
}
