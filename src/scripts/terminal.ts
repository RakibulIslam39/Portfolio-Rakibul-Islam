type Line = { kind: 'cmd' | 'dim' | 'pass' | 'sum'; text: string };

const prefix = (kind: Line['kind']) => (kind === 'cmd' ? '$ ' : '  ');
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Replays a Playwright run in the terminal tile when it scrolls into view. */
export function initTerminal(): void {
  document.querySelectorAll<HTMLElement>('[data-terminal]').forEach((root) => {
    const out = root.querySelector<HTMLElement>('[data-term-out]')!;
    const replay = root.querySelector<HTMLButtonElement>('[data-term-replay]')!;
    const lines = JSON.parse(root.dataset.lines ?? '[]') as Line[];
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let run = 0;

    // Keep the window the same height while it types, so nothing below it jumps. The finished
    // run is the static text plus the final "$" prompt line.
    const lineHeight = parseFloat(getComputedStyle(out).lineHeight) || 24;
    out.style.minHeight = `${out.scrollHeight + lineHeight}px`;

    const span = (kind: Line['kind']) => {
      const s = document.createElement('span');
      s.className = `t-${kind}`;
      out.append(s);
      return s;
    };

    const play = async () => {
      const id = ++run;
      root.dataset.state = 'running';
      replay.disabled = true;
      out.textContent = '';
      const caret = document.createElement('span');
      caret.className = 'caret';

      for (const line of lines) {
        if (id !== run) return;
        const s = span(line.kind);
        if (line.kind === 'cmd') {
          s.textContent = prefix('cmd');
          s.append(caret);
          for (const ch of line.text) {
            caret.before(ch);
            await sleep(45);
          }
          caret.remove();
          s.append('\n');
          await sleep(350);
        } else {
          s.textContent = prefix(line.kind);
          if (line.kind === 'pass') {
            const check = document.createElement('span');
            check.className = 't-check';
            check.textContent = '✓ ';
            s.append(check);
          }
          s.append(`${line.text}\n`);
          await sleep(line.kind === 'pass' ? 420 : 260);
        }
      }
      const prompt = span('cmd');
      prompt.textContent = '$ ';
      prompt.append(caret);
      root.dataset.state = 'done';
      replay.disabled = false;
    };

    replay.addEventListener('click', () => void play());

    if (reduce) {
      root.dataset.state = 'done';
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void play();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(root);
  });
}
