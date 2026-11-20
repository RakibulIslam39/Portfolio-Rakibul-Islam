import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

for (const theme of ['dark', 'light'] as const) {
  test(`home page looks right (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    // A full-page capture doesn't scroll, so lazy images below the fold would stay blank (or
    // load on some runs and not others). Load them all and wait, so every run sees the same page.
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      imgs.forEach((img) => (img.loading = 'eager'));
      await Promise.all(imgs.map((img) => (img.complete ? null : new Promise((r) => img.addEventListener('load', r, { once: true }) || img.addEventListener('error', r, { once: true })))));
    });
    await expect(page).toHaveScreenshot(`home-${theme}.png`, {
      fullPage: true,
      // The clock changes every minute.
      mask: [page.locator('[data-local-time]'), page.locator('.footer')],
    });
  });
}
