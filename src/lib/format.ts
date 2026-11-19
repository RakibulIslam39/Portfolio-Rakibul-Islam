/** Human date like "10 Nov 2026" (UTC, so build machines agree). */
export const formatDate = (d: Date): string =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

/** Minutes to read at ~220 words per minute, at least 1. */
export const readingTime = (text: string): number =>
  Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));

export const slugify = (s: string): string => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
