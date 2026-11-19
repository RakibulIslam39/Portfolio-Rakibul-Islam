import { test, expect } from '@playwright/test';

test.use({ reducedMotion: 'reduce' });

for (const theme of ['dark', 'light'] as const) {
  test(`home page looks right (${theme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(`home-${theme}.png`, {
      fullPage: true,
      // The clock changes every minute.
      mask: [page.locator('[data-local-time]'), page.locator('.footer')],
    });
  });
}
