/**
 * A soft "tick" when a link or button is pressed, like a Mac trackpad click.
 * Made in code with the Web Audio API, so there's no audio file to download.
 * On by default; the speaker button in the nav (or the palette action) mutes it,
 * and the choice is remembered in this browser.
 */

const KEY = 'sound';
const CLICKABLE = 'a, button, [role="tab"], [role="option"], summary';
const VOLUME = 0.25;

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setSound(on: boolean): void {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    /* storage blocked: the choice still applies to this page */
  }
  document.documentElement.dataset.sound = on ? 'on' : 'off';
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((b) => b.setAttribute('aria-pressed', String(on)));
  if (on) playClick(true);
}

function audio(): AudioContext | null {
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

/** 20 ms of white noise that fades out fast: the body of the tick. */
function noiseBuffer(c: AudioContext): AudioBuffer {
  const length = Math.floor(c.sampleRate * 0.02);
  const buf = c.createBuffer(1, length, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 4);
  return buf;
}

function playClick(force = false): void {
  if (!force && document.documentElement.dataset.sound === 'off') return;
  const c = audio();
  if (!c) return;
  noise ??= noiseBuffer(c);
  const now = c.currentTime;

  const src = c.createBufferSource();
  src.buffer = noise;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3200;
  band.Q.value = 1.2;

  const blip = c.createOscillator();
  blip.frequency.setValueAtTime(1800, now);
  blip.frequency.exponentialRampToValueAtTime(900, now + 0.03);
  const blipGain = c.createGain();
  blipGain.gain.setValueAtTime(0.35, now);
  blipGain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

  const volume = c.createGain();
  volume.gain.value = VOLUME;
  src.connect(band).connect(volume);
  blip.connect(blipGain).connect(volume);
  volume.connect(c.destination);
  src.start(now);
  blip.start(now);
  blip.stop(now + 0.04);
}

export function initSound(): void {
  document.documentElement.dataset.sound = soundOn() ? 'on' : 'off';
  document.querySelectorAll<HTMLButtonElement>('[data-sound-toggle]').forEach((b) => {
    b.setAttribute('aria-pressed', String(soundOn()));
    b.addEventListener('click', () => setSound(document.documentElement.dataset.sound === 'off'));
  });

  const target = (e: Event) => (e.target as Element | null)?.closest?.(CLICKABLE) && !(e.target as Element).closest('[data-sound-toggle]');
  // Mouse: tick as the button goes down, which feels more physical.
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button === 0 && target(e)) playClick();
  });
  // Touch: tick when the finger lifts (phones only allow sound then; a scroll never fires it).
  document.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse' && target(e)) playClick();
  });
  // Keyboard: Enter or Space on a focused control.
  document.addEventListener('click', (e) => {
    if (e.detail === 0 && target(e)) playClick();
  });
}
