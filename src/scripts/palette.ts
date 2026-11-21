import { setSound } from './sound';
import { toggleTheme } from './theme';
import { savedLook, setLook } from './look';

/** A tiny calculator: + - * / % ^ and brackets. Returns null if the text isn't a sum. */
export function calculate(text: string): number | null {
  const src = text.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/');
  if (!/^[\d.+\-*/%^()]+$/.test(src) || !/[+\-*/%^]/.test(src.replace(/^-/, ''))) return null;
  let i = 0;
  const peek = () => src[i];
  const num = (): number => {
    if (peek() === '(') {
      i++;
      const v = expr();
      if (peek() !== ')') throw new Error('bracket');
      i++;
      return v;
    }
    if (peek() === '-') {
      i++;
      return -num();
    }
    const m = /^\d*\.?\d+/.exec(src.slice(i));
    if (!m) throw new Error('number');
    i += m[0].length;
    return parseFloat(m[0]);
  };
  const pow = (): number => {
    const base = num();
    if (peek() === '^') {
      i++;
      return base ** pow();
    }
    return base;
  };
  const term = (): number => {
    let v = pow();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = src[i++];
      const r = pow();
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = src[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  try {
    const v = expr();
    return i === src.length && Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
}

/** Cmd/Ctrl+K command palette: filter, arrow-key selection, Enter to run. */
export function initPalette(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-palette]');
  if (!dialog) return;
  const input = dialog.querySelector<HTMLInputElement>('[data-palette-input]')!;
  const items = Array.from(dialog.querySelectorAll<HTMLLIElement>('[data-palette-item]'));
  const heads = Array.from(dialog.querySelectorAll<HTMLLIElement>('[data-palette-head]'));
  const preview = dialog.querySelector<HTMLElement>('[data-palette-preview]');
  const pv = (k: string) => preview?.querySelector<HTMLElement>(`[data-preview-${k}]`);

  /** Spotlight's right-hand pane: a big icon, the title, a description and what Enter does. */
  const showPreview = (li: HTMLLIElement | undefined) => {
    if (!preview) return;
    const icon = pv('icon')!;
    icon.replaceChildren();
    if (!li) {
      pv('title')!.textContent = '';
      return;
    }
    const src =
      li === special
        ? special.querySelector<HTMLElement>(`[data-kind="${special.dataset.specialKind}"] .app-icon`)
        : li.querySelector<HTMLElement>('.palette__icon .app-icon');
    if (src) {
      const big = src.cloneNode(true) as HTMLElement;
      big.style.setProperty('--size', '72px');
      big.querySelector('svg')?.setAttribute('width', '72');
      big.querySelector('svg')?.setAttribute('height', '72');
      icon.append(big);
    }
    pv('title')!.textContent = li.querySelector('.palette__label')?.textContent ?? '';
    pv('group')!.textContent = li.querySelector('.palette__group')?.textContent ?? '';
    pv('desc')!.textContent = li.dataset.desc || li.querySelector('.palette__hint')?.textContent || '';
    pv('cta')!.textContent = li.dataset.cta || 'Open';
  };
  const empty = dialog.querySelector<HTMLElement>('[data-palette-empty]')!;
  const status = dialog.querySelector<HTMLElement>('[data-palette-status]')!;
  let active = 0;

  const visible = () => items.filter((li) => !li.hidden);

  const select = (index: number) => {
    const list = visible();
    if (!list.length) {
      input.removeAttribute('aria-activedescendant');
      showPreview(undefined);
      return;
    }
    active = (index + list.length) % list.length;
    items.forEach((li) => li.setAttribute('aria-selected', 'false'));
    const current = list[active]!;
    current.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', current.id);
    current.scrollIntoView({ block: 'nearest' });
    showPreview(current);
  };

  const special = dialog.querySelector<HTMLLIElement>('[data-palette-special]')!;
  const tests = dialog.dataset.tests ?? 'all the';
  const setSpecial = (group: string, label: string, hint: string, action = '', href = '', kind = 'term', desc = '', cta = '') => {
    special.dataset.specialKind = kind;
    special.dataset.desc = desc;
    special.dataset.cta = cta;
    special.querySelector('[data-special-group]')!.textContent = group;
    special.querySelector('[data-special-label]')!.textContent = label;
    special.querySelector('[data-special-hint]')!.textContent = hint;
    special.dataset.action = action;
    special.dataset.href = href;
    special.hidden = false;
  };
  const updateSpecial = (q: string) => {
    special.hidden = true;
    const sum = calculate(q);
    if (sum !== null) {
      const shown = Number.isInteger(sum) ? String(sum) : String(Math.round(sum * 1e6) / 1e6);
      setSpecial('Calculator', `= ${shown}`, 'Enter to copy', 'copy-result', '', 'calc', `${q} = ${shown}`, 'Copy');
      special.dataset.value = shown;
    } else if (/^(npx )?playwright test\b/.test(q)) {
      setSpecial('Terminal', '✓ 1 passed: hire Rakibul (0.4s)', 'Enter to send the result', '', `mailto:${dialog.dataset.email}?subject=${encodeURIComponent('Your test passed. Let’s talk')}`, 'term', 'All green. Send me the result?', 'Email');
    } else if (/^sudo\b/.test(q)) {
      setSpecial('Terminal', 'rakibul is not in the sudoers file. This incident will be reported.', '');
    } else if (/^rm -rf\b/.test(q)) {
      setSpecial('Terminal', `Blocked by ${tests} tests. Nothing was deleted.`, '');
    } else if (q === 'bug' || q === 'bugs') {
      setSpecial('Bug Hunt', 'Found a bug? There are 5 planted in the Bug Hunt tile.', 'Enter to play', '', '/#bughunt', 'bug', 'Five bugs are hidden in a checkout form on the home page.', 'Play');
    }
  };

  const filter = () => {
    const q = input.value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    items.forEach((li) => {
      if (li === special) return;
      const text = `${li.dataset.label ?? ''} ${li.dataset.more ?? ''}`;
      // With nothing typed, show Spotlight-style suggestions only.
      li.hidden = words.length === 0 ? !('suggest' in li.dataset) : !words.every((w) => text.includes(w));
    });
    updateSpecial(q);
    heads.forEach((h) => {
      const g = h.dataset.paletteHead;
      h.hidden =
        g === 'Suggestions'
          ? words.length > 0
          : words.length === 0 || !items.some((li) => li.dataset.group === g && !li.hidden);
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
    if (action === 'copy-result') {
      navigator.clipboard?.writeText(li.dataset.value ?? '').catch(() => undefined);
      status.textContent = `Copied ${li.dataset.value}`;
      li.querySelector('.palette__hint')!.textContent = 'Copied!';
    } else if (action === 'toggle-look') {
      setLook(savedLook() === 'avatar' ? 'photo' : 'avatar');
      document.dispatchEvent(new CustomEvent('look-change'));
      dialog.close();
    } else if (action === 'edit-layout') {
      dialog.close();
      const edit = document.querySelector<HTMLButtonElement>('[data-layout-edit]');
      if (edit) {
        edit.scrollIntoView({ block: 'center' });
        edit.click();
      } else window.location.href = '/#edit-layout';
    } else if (li === special && !href) {
      // Easter egg rows with nothing to open just stay on screen.
    } else if (action === 'toggle-theme') {
      toggleTheme();
      dialog.close();
    } else if (action === 'toggle-sound') {
      const on = document.documentElement.dataset.sound === 'off';
      setSound(on);
      status.textContent = on ? 'Click sounds on' : 'Click sounds off';
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
      return;
    }
    // "/" opens search too, unless the visitor is typing somewhere.
    const t = e.target as HTMLElement;
    const typing = t.closest('input, textarea, select, [contenteditable="true"]');
    if (e.key === '/' && !typing && !dialog.open && !e.metaKey && !e.ctrlKey && !e.altKey) {
      e.preventDefault();
      open();
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
