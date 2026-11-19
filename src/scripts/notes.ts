/**
 * Notes-app layout on /about: an accessible vertical tablist.
 * Without JS every note is visible; with JS one note shows at a time.
 * The selected note is kept in the URL hash so notes can be linked.
 */
export function initNotes(): void {
  const root = document.querySelector<HTMLElement>('[data-notes]');
  if (!root) return;
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-note-tab]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-note]'));

  const select = (id: string, { focus = false, updateHash = true } = {}) => {
    const tab = tabs.find((t) => t.dataset.noteTab === id);
    if (!tab) return;
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p) => {
      p.hidden = p.dataset.note !== id;
    });
    if (focus) tab.focus();
    if (updateHash) history.replaceState(null, '', `#${id}`);
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab.dataset.noteTab!));
    tab.addEventListener('keydown', (e) => {
      const keys: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
      let next: number | null = null;
      if (e.key in keys) next = (i + keys[e.key]! + tabs.length) % tabs.length;
      else if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = tabs.length - 1;
      if (next === null) return;
      e.preventDefault();
      select(tabs[next]!.dataset.noteTab!, { focus: true });
    });
  });

  root.setAttribute('data-notes-ready', '');
  const fromHash = location.hash.slice(1);
  select(tabs.some((t) => t.dataset.noteTab === fromHash) ? fromHash : tabs[0]!.dataset.noteTab!, { updateHash: false });
  window.addEventListener('hashchange', () => select(location.hash.slice(1), { updateHash: false }));
}
