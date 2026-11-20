/**
 * Which picture of Rakibul the site shows: the photo (default) or the 3D avatar.
 * The portrait tile on the home page switches it; the choice is remembered in this
 * browser and every picture marked [data-me] across the site follows it.
 */
export type Look = 'photo' | 'avatar';
const KEY = 'look';

export function savedLook(): Look {
  try {
    return localStorage.getItem(KEY) === 'avatar' ? 'avatar' : 'photo';
  } catch {
    return 'photo';
  }
}

export function applyLook(look: Look): void {
  document.documentElement.dataset.look = look;
  document.querySelectorAll<HTMLImageElement>('img[data-me]').forEach((img) => {
    const src = img.dataset[look];
    if (src && img.getAttribute('src') !== src) img.src = src;
  });
}

export function setLook(look: Look): void {
  try {
    if (look === 'avatar') localStorage.setItem(KEY, 'avatar');
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: still changes on this page */
  }
  applyLook(look);
}
