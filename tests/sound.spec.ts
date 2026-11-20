import { test, expect } from '@playwright/test';

// Count the ticks: replace the Web Audio oscillator with a counter before the page loads.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { ticks: number }).ticks = 0;
    const Real = window.AudioContext;
    if (!Real) return;
    const orig = Real.prototype.createOscillator;
    Real.prototype.createOscillator = function (this: AudioContext) {
      (window as unknown as { ticks: number }).ticks++;
      return orig.call(this);
    };
  });
  await page.goto('/');
});

const ticks = (page: import('@playwright/test').Page) => page.evaluate(() => (window as unknown as { ticks: number }).ticks);

test('clicking a link or button plays a tick by default', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Click sounds' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Run again' }).click();
  await expect.poll(() => ticks(page)).toBeGreaterThan(0);
});

test('the mute button silences clicks and is remembered', async ({ page }) => {
  const toggle = page.getByRole('button', { name: 'Click sounds' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'off');

  const before = await ticks(page);
  await page.getByRole('button', { name: 'Run again' }).click();
  expect(await ticks(page)).toBe(before);

  await page.reload();
  await expect(page.getByRole('button', { name: 'Click sounds' })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Click sounds' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'on');
});

test('sound can be toggled from the ⌘K menu', async ({ page, isMobile }) => {
  test.skip(isMobile, 'Keyboard shortcut');
  await page.keyboard.press('ControlOrMeta+k');
  await page.getByRole('combobox').fill('sound');
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('data-sound', 'off');
});
