/**
 * Apple Notes window on /about.
 * - One long note; the list on the left jumps to each section and highlights
 *   the section being read (scroll-spy).
 * - On wider screens the note scrolls inside the window; on phones it scrolls with the page.
 * - "Hide sidebars" and a temporary note that only lives in this tab.
 * Without JS the list is plain anchor links and everything is readable.
 */
export function initNotes(): void {
  const root = document.querySelector<HTMLElement>('[data-notes]');
  if (!root) return;
  const editor = root.querySelector<HTMLElement>('[data-notes-editor]')!;
  const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-note-link]'));
  const sections = Array.from(editor.querySelectorAll<HTMLElement>('[data-note]'));
  const toggle = root.querySelector<HTMLButtonElement>('[data-notes-toggle]');
  const newBtn = root.querySelector<HTMLButtonElement>('[data-notes-new]');
  const draft = root.querySelector<HTMLButtonElement>('[data-notes-draft]');
  const temp = root.querySelector<HTMLElement>('[data-notes-temp]');
  const back = root.querySelector<HTMLButtonElement>('[data-notes-back]');
  const tTitle = root.querySelector<HTMLInputElement>('[data-temp-title]');
  const tBody = root.querySelector<HTMLTextAreaElement>('[data-temp-body]');
  const quick = root.querySelector<HTMLElement>('[data-notes-quick]');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /** True when the note scrolls inside the window rather than with the page. */
  const inner = () => /(auto|scroll)/.test(getComputedStyle(editor).overflowY);

  const setActive = (id: string) => {
    links.forEach((a) => {
      const on = a.dataset.noteLink === id;
      a.classList.toggle('is-on', on);
      if (on) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    draft?.classList.remove('is-on');
  };

  let lockUntil = 0;
  const spy = () => {
    if (editor.hidden || performance.now() < lockUntil) return;
    const top = inner() ? editor.getBoundingClientRect().top : 0;
    const atEnd = inner()
      ? editor.scrollTop + editor.clientHeight >= editor.scrollHeight - 4
      : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
    let current = sections[0]!;
    if (atEnd) current = sections[sections.length - 1]!;
    else for (const s of sections) if (s.getBoundingClientRect().top - top <= 120) current = s;
    setActive(current.dataset.note!);
  };
  let raf = 0;
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(spy);
  };
  editor.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  const go = (id: string, smooth = true) => {
    const s = sections.find((x) => x.dataset.note === id);
    if (!s) return;
    closeTemp();
    setActive(id);
    lockUntil = performance.now() + (smooth && !reduce ? 800 : 50);
    const behavior: ScrollBehavior = smooth && !reduce ? 'smooth' : 'instant';
    if (inner()) {
      const y = s.getBoundingClientRect().top - editor.getBoundingClientRect().top + editor.scrollTop - 16;
      editor.scrollTo({ top: y, behavior });
    } else {
      s.scrollIntoView({ behavior, block: 'start' });
    }
  };

  links.forEach((a) =>
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const id = a.dataset.noteLink!;
      go(id);
      history.replaceState(null, '', `#${id}`);
    }),
  );

  // Sidebars
  toggle?.addEventListener('click', () => {
    const hidden = root.classList.toggle('is-sidebar-hidden');
    toggle.setAttribute('aria-label', hidden ? 'Show Notes sidebars' : 'Hide Notes sidebars');
    toggle.setAttribute('aria-expanded', String(!hidden));
  });

  // Temporary note
  const hasText = () => Boolean(tTitle?.value.trim() || tBody?.value.trim());
  const syncDraft = () => {
    if (!draft) return;
    draft.querySelector('[data-draft-title]')!.textContent = tTitle?.value.trim() || 'New Note';
    draft.querySelector('[data-draft-preview]')!.textContent = tBody?.value.trim().split('\n')[0] || 'Start typing…';
  };
  function openTemp() {
    if (!temp) return;
    temp.hidden = false;
    editor.hidden = true;
    if (draft) {
      draft.hidden = false;
      links.forEach((a) => {
        a.classList.remove('is-on');
        a.removeAttribute('aria-current');
      });
      draft.classList.add('is-on');
    }
    if (quick) quick.textContent = '1';
    tTitle?.focus();
  }
  function closeTemp() {
    if (!temp || temp.hidden) return;
    temp.hidden = true;
    editor.hidden = false;
    if (draft && !hasText()) {
      draft.hidden = true;
      if (quick) quick.textContent = '0';
    }
  }
  newBtn?.addEventListener('click', openTemp);
  draft?.addEventListener('click', openTemp);
  back?.addEventListener('click', () => {
    closeTemp();
    spy();
    editor.focus({ preventScroll: true });
  });
  tTitle?.addEventListener('input', syncDraft);
  tBody?.addEventListener('input', syncDraft);
  tTitle?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tBody?.focus();
    }
  });

  root.setAttribute('data-notes-ready', '');
  const fromHash = () => location.hash.slice(1);
  if (sections.some((s) => s.dataset.note === fromHash())) {
    // Wait a frame so layout (and the window height) is final before jumping.
    requestAnimationFrame(() => {
      if (inner()) window.scrollTo(0, 0);
      go(fromHash(), false);
    });
  }
  window.addEventListener('hashchange', () => go(fromHash()));
}
