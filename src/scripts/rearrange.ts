/**
 * Edit layout: visitors can rearrange the home tiles, like editing widgets on an iPhone.
 * "Edit layout" starts edit mode: tiles jiggle, what's inside them stops responding, and a tile
 * dropped on another swaps places with it. Arrow keys do the same for a focused tile.
 * "Done" (or Escape) finishes; "Reset" restores the original order.
 *
 * Each tile owns a "slot" (its home grid area on wide screens, its home position on phones).
 * Swapping two tiles swaps their slots. The map tile → slot is saved in this browser only.
 */

// v3: the home grid changed shape (Phase 2 and its follow-up), so layouts saved for the old grid start fresh.
const LAYOUT_KEY = 'home-layout-v3';

type Layout = Record<string, string>; // tile id → id of the tile whose home slot it now uses

function readLayout(): Layout {
  try {
    const raw = JSON.parse(localStorage.getItem(LAYOUT_KEY) ?? '{}');
    return raw && typeof raw === 'object' ? (raw as Layout) : {};
  } catch {
    return {};
  }
}

function writeLayout(layout: Layout): void {
  try {
    const moved = Object.entries(layout).filter(([tile, slot]) => tile !== slot);
    if (moved.length) localStorage.setItem(LAYOUT_KEY, JSON.stringify(Object.fromEntries(moved)));
    else localStorage.removeItem(LAYOUT_KEY);
  } catch {
    /* storage blocked: the new order lasts for this visit */
  }
}

/** Put every tile in its slot. Also used before first paint by the inline script on the page. */
function applyLayout(grid: HTMLElement, layout: Layout): void {
  const tiles = Array.from(grid.querySelectorAll<HTMLElement>(':scope > .tile'));
  const home = new Map(tiles.map((t, i) => [t.id, { area: t.dataset.area ?? '', order: i }]));
  tiles.forEach((t) => {
    const slot = home.get(layout[t.id] ?? t.id) ?? home.get(t.id)!;
    t.style.setProperty('--area', slot.area);
    t.style.order = String(slot.order);
    t.dataset.slot = layout[t.id] ?? t.id;
  });
}

export function initRearrange(grid: HTMLElement): void {
  const bar = document.querySelector<HTMLElement>('[data-layout-bar]');
  if (!bar) return;
  const editBtn = bar.querySelector<HTMLButtonElement>('[data-layout-edit]')!;
  const doneBtn = bar.querySelector<HTMLButtonElement>('[data-layout-done]')!;
  const resetBtn = bar.querySelector<HTMLButtonElement>('[data-layout-reset]')!;
  const status = bar.querySelector<HTMLElement>('[data-layout-status]')!;
  const tiles = () => Array.from(grid.querySelectorAll<HTMLElement>(':scope > .tile'));
  const name = (t: HTMLElement) => t.querySelector('.tile__app, h2, h1')?.textContent?.trim() || t.id;
  let layout = readLayout();
  let editing = false;

  const current = (): Layout => Object.fromEntries(tiles().map((t) => [t.id, t.dataset.slot ?? t.id]));

  const swap = (a: HTMLElement, b: HTMLElement) => {
    if (a === b) return;
    const next = current();
    [next[a.id], next[b.id]] = [next[b.id]!, next[a.id]!];
    layout = next;
    applyLayout(grid, layout);
    writeLayout(layout);
    status.textContent = `Moved ${name(a)}.`;
  };

  /** Tiles in the order you read them on screen: top to bottom, then left to right. */
  const reading = () =>
    tiles().sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return Math.abs(ra.top - rb.top) > 8 ? ra.top - rb.top : ra.left - rb.left;
    });

  const setEditing = (on: boolean) => {
    editing = on;
    grid.classList.toggle('bento--editing', on);
    editBtn.hidden = on;
    doneBtn.hidden = !on;
    resetBtn.hidden = !on;
    tiles().forEach((t) => {
      const body = Array.from(t.children) as HTMLElement[];
      body.forEach((c) => (c.inert = on));
      if (on) {
        t.tabIndex = 0;
        t.setAttribute('aria-roledescription', 'movable tile');
      } else {
        t.removeAttribute('tabindex');
        t.removeAttribute('aria-roledescription');
      }
    });
    status.textContent = on
      ? 'Editing the layout. Drag a tile onto another to swap them, or focus a tile and use the arrow keys. Press Escape when done.'
      : 'Layout saved.';
    if (on) reading()[0]?.focus({ preventScroll: true });
    else editBtn.focus();
  };

  editBtn.addEventListener('click', () => setEditing(true));
  doneBtn.addEventListener('click', () => setEditing(false));
  resetBtn.addEventListener('click', () => {
    layout = {};
    applyLayout(grid, layout);
    writeLayout(layout);
    status.textContent = 'Layout reset to the original order.';
  });
  document.addEventListener('keydown', (e) => {
    if (editing && e.key === 'Escape') setEditing(false);
  });

  // Keyboard: arrows swap the focused tile with its neighbour in reading order.
  grid.addEventListener('keydown', (e) => {
    if (!editing) return;
    const tile = (e.target as HTMLElement).closest<HTMLElement>('.tile');
    if (!tile || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const order = reading();
    const i = order.indexOf(tile);
    const j = e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? i - 1 : i + 1;
    const other = order[j];
    if (!other) return;
    swap(tile, other);
    tile.focus();
  });

  // Pointer: drag a tile, drop it on another.
  grid.addEventListener('pointerdown', (e) => {
    if (!editing || e.button !== 0) return;
    const tile = (e.target as HTMLElement).closest<HTMLElement>('.tile');
    if (!tile) return;
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let target: HTMLElement | null = null;
    tile.setPointerCapture(e.pointerId);
    tile.classList.add('is-dragging');
    const move = (ev: PointerEvent) => {
      tile.style.translate = `${ev.clientX - sx}px ${ev.clientY - sy}px`;
      tile.style.pointerEvents = 'none';
      const under = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('.bento > .tile') ?? null;
      tile.style.pointerEvents = '';
      if (under !== target) {
        target?.classList.remove('is-target');
        target = under && under !== tile ? under : null;
        target?.classList.add('is-target');
      }
    };
    const up = () => {
      tile.removeEventListener('pointermove', move);
      tile.removeEventListener('pointerup', up);
      tile.removeEventListener('pointercancel', up);
      tile.classList.remove('is-dragging');
      tile.style.translate = '';
      if (target) {
        target.classList.remove('is-target');
        swap(tile, target);
      }
    };
    tile.addEventListener('pointermove', move);
    tile.addEventListener('pointerup', up);
    tile.addEventListener('pointercancel', up);
  });
}
