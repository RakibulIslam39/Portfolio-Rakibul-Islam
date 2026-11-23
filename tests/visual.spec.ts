import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

for (const theme of ['dark', 'light'] as const) {
  test(`home page looks right (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    // Fixed live numbers, loaded before the capture, so the Live stats tile never shows its skeleton.
    await page.route('**/api/stats', (r) =>
      r.fulfill({ json: { today: 42, yesterday: 40, week: 310, prevWeek: 280, countries: 12, updatedAt: '2026-01-01T00:00:00Z' } }),
    );
    await page.goto('/');
    await page.locator('[data-stats]').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-stats]')).not.toHaveAttribute('data-loading');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.evaluate(() => document.fonts.ready);
    // A full-page capture doesn't scroll, so lazy images below the fold would stay blank (or
    // load on some runs and not others). Load them all and wait, so every run sees the same page.
    await page.evaluate(async () => {
      const imgs = Array.from(document.images);
      imgs.forEach((img) => (img.loading = 'eager'));
      await Promise.all(
        imgs.map((img) =>
          img.complete
            ? null
            : new Promise<void>((done) => {
                img.addEventListener('load', () => done(), { once: true });
                img.addEventListener('error', () => done(), { once: true });
              }),
        ),
      );
    });
    await expect(page).toHaveScreenshot(`home-${theme}.png`, {
      fullPage: true,
      // The clock changes every minute.
      mask: [page.locator('[data-local-time]'), page.locator('.footer')],
    });
  });
}
