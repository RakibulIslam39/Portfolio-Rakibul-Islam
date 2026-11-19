/** Bug Hunt mini-game: click each planted bug to log it. */
export function initBugHunt(): void {
  document.querySelectorAll<HTMLElement>('[data-bughunt]').forEach((root) => {
    const total = Number(root.dataset.total);
    const bugs = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-bug]'));
    const foundEl = root.querySelector<HTMLElement>('[data-bh-found]')!;
    const log = root.querySelector<HTMLOListElement>('[data-bh-log]')!;
    const done = root.querySelector<HTMLElement>('[data-bh-done]')!;
    const reset = root.querySelector<HTMLButtonElement>('[data-bh-reset]')!;
    const labels = JSON.parse(root.querySelector('template[data-bh-labels]')?.innerHTML ?? '{}') as Record<string, string>;
    const found = new Set<string>();

    const render = () => {
      foundEl.textContent = String(found.size);
      done.hidden = found.size < total;
      reset.hidden = found.size === 0;
      root.dataset.complete = String(found.size === total);
    };

    bugs.forEach((bug) =>
      bug.addEventListener('click', () => {
        const id = bug.dataset.bug!;
        if (found.has(id)) return;
        found.add(id);
        bug.classList.add('is-found');
        bug.setAttribute('aria-pressed', 'true');
        const li = document.createElement('li');
        li.textContent = labels[id] ?? id;
        log.append(li);
        render();
      }),
    );

    reset.addEventListener('click', () => {
      found.clear();
      log.textContent = '';
      bugs.forEach((b) => {
        b.classList.remove('is-found');
        b.removeAttribute('aria-pressed');
      });
      render();
      bugs[0]?.focus();
    });

    render();
  });
}
