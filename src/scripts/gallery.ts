/**
 * Gallery viewer. Highlights play like stories (one photo every 5 s with progress bars,
 * pause with the button, Space, or by holding the photo); grid photos open the same viewer
 * without autoplay. Arrow keys, the side buttons, taps on either side and swipes move between photos.
 */
interface Slide {
  src: string;
  w: number;
  h: number;
  caption: string;
  alt: string;
  place: string;
}

const DURATION = 5000;

export function initGallery(): void {
  const dlg = document.querySelector<HTMLDialogElement>('[data-viewer]');
  if (!dlg) return;
  const q = <T extends HTMLElement = HTMLElement>(s: string) => dlg.querySelector<T>(s)!;
  const img = q<HTMLImageElement>('[data-v-img]');
  const cap = q('[data-v-cap]');
  const title = q('[data-v-title]');
  const place = q('[data-v-place]');
  const bars = q('[data-bars]');
  const status = q('[data-v-status]');

  // A play/pause button, only shown while a highlight plays.
  const pauseBtn = document.createElement('button');
  pauseBtn.type = 'button';
  pauseBtn.className = 'story__close';
  pauseBtn.style.marginLeft = 'auto';
  q('[data-v-close]').style.marginLeft = '0';
  q('[data-v-close]').before(pauseBtn);

  let slides: Slide[] = [];
  let index = 0;
  let playing = false;
  let paused = false;
  let started = 0;
  let elapsed = 0;
  let raf = 0;
  let opener: HTMLElement | null = null;

  const setPause = (p: boolean) => {
    paused = p;
    pauseBtn.textContent = p ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', p ? 'Play' : 'Pause');
    if (!p) started = performance.now() - elapsed;
  };

  const show = (i: number) => {
    if (i < 0) i = 0;
    if (i >= slides.length) {
      dlg.close();
      return;
    }
    index = i;
    const s = slides[i]!;
    img.src = s.src;
    img.alt = s.alt;
    img.width = s.w;
    img.height = s.h;
    cap.textContent = s.caption;
    place.textContent = s.place;
    status.textContent = `Photo ${i + 1} of ${slides.length}: ${s.caption}`;
    [...bars.children].forEach((bar, n) => {
      bar.classList.toggle('is-done', n < i);
      (bar.firstElementChild as HTMLElement).style.width = n < i ? '100%' : '0';
    });
    q('[data-v-prev]').hidden = i === 0;
    q('[data-v-next]').hidden = !playing && i === slides.length - 1;
    elapsed = 0;
    started = performance.now();
    // Preload the next photo.
    const next = slides[i + 1];
    if (next) new Image().src = next.src;
  };

  const tick = (t: number) => {
    if (!dlg.open) return;
    if (playing && !paused) {
      elapsed = t - started;
      const bar = bars.children[index]?.firstElementChild as HTMLElement | undefined;
      if (bar) bar.style.width = `${Math.min(100, (elapsed / DURATION) * 100)}%`;
      if (elapsed >= DURATION) show(index + 1);
    }
    raf = requestAnimationFrame(tick);
  };

  const open = (button: HTMLElement) => {
    opener = button;
    slides = JSON.parse(button.dataset.story ?? '[]') as Slide[];
    playing = !('storyBrowse' in button.dataset);
    title.textContent = button.dataset.storyTitle ?? '';
    bars.replaceChildren(...slides.map(() => Object.assign(document.createElement('i'), { innerHTML: '<b></b>' })));
    pauseBtn.hidden = !playing;
    setPause(false);
    dlg.showModal();
    show(Number(button.dataset.storyStart ?? 0));
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };

  document.querySelectorAll<HTMLElement>('[data-story]').forEach((b) => b.addEventListener('click', () => open(b)));
  q('[data-v-close]').addEventListener('click', () => dlg.close());
  q('[data-v-prev]').addEventListener('click', () => show(index - 1));
  q('[data-v-next]').addEventListener('click', () => show(index + 1));
  pauseBtn.addEventListener('click', () => setPause(!paused));
  dlg.addEventListener('close', () => {
    cancelAnimationFrame(raf);
    img.removeAttribute('src');
    opener?.focus();
  });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === ' ' && playing) {
      e.preventDefault();
      setPause(!paused);
    } else return;
    e.preventDefault();
  });

  // Hold to pause, tap the left third to go back and the rest to go on, swipe sideways.
  let downX = 0;
  let downAt = 0;
  img.addEventListener('pointerdown', (e) => {
    downX = e.clientX;
    downAt = performance.now();
    if (playing) setPause(true);
  });
  img.addEventListener('pointerup', (e) => {
    const dx = e.clientX - downX;
    const held = performance.now() - downAt > 300;
    if (playing) setPause(false);
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    else if (!held) {
      const r = img.getBoundingClientRect();
      show(index + (e.clientX - r.left < r.width / 3 ? -1 : 1));
    }
  });
}
