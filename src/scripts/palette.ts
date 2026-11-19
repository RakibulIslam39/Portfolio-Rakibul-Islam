import { toggleTheme } from './theme';

/** Cmd/Ctrl+K command palette: filter, arrow-key selection, Enter to run. */
export function initPalette(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-palette]');
  if (!dialog) return;
  const input = dialog.querySelector<HTMLInputElement>('[data-palette-input]')!;
  const items = Array.from(dialog.querySelectorAll<HTMLLIElement>('[data-palette-item]'));
  const empty = dialog.querySelector<HTMLElement>('[data-palette-empty]')!;
  const status = dialog.querySelector<HTMLElement>('[data-palette-status]')!;
  let active = 0;

  const visible = () => items.filter((li) => !li.hidden);

  const select = (index: number) => {
    const list = visible();
    if (!list.length) {
      input.removeAttribute('aria-activedescendant');
      return;
    }
    active = (index + list.length) % list.length;
    items.forEach((li) => li.setAttribute('aria-selected', 'false'));
    const current = list[active]!;
    current.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', current.id);
    current.scrollIntoView({ block: 'nearest' });
  };

  const filter = () => {
    const q = input.value.trim().toLowerCase();
    items.forEach((li) => {
      li.hidden = q !== '' && !(li.dataset.label ?? '').includes(q);
    });
    const count = visible().length;
    empty.hidden = count > 0;
    status.textContent = `${count} result${count === 1 ? '' : 's'}`;
    select(0);
  };

  const open = () => {
    if (dialog.open) return;
    input.value = '';
    filter();
    dialog.showModal();
    input.focus();
  };

  const run = (li: HTMLLIElement | undefined) => {
    if (!li) return;
    const { href, action } = li.dataset;
    if (action === 'toggle-theme') {
      toggleTheme();
      dialog.close();
    } else if (action === 'copy-email') {
      const email = dialog.dataset.email ?? '';
      navigator.clipboard?.writeText(email).catch(() => undefined);
      status.textContent = `Copied ${email}`;
      li.querySelector('.palette__hint')!.textContent = 'Copied!';
    } else if (href) {
      dialog.close();
      if (/^https?:/.test(href)) window.open(href, '_blank', 'noopener');
      else window.location.href = href;
    }
  };

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) dialog.close();
      else open();
    }
  });
  document.querySelectorAll('[data-open-palette]').forEach((b) => b.addEventListener('click', open));

  input.addEventListener('input', filter);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      select(active + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      select(active - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(visible()[active]);
    }
  });
  items.forEach((li) => {
    li.addEventListener('click', () => run(li));
    li.addEventListener('mousemove', () => {
      const i = visible().indexOf(li);
      if (i !== active) select(i);
    });
  });
  // Click on the backdrop closes the dialog.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });
}
