import { test, expect } from '@playwright/test';

test.describe('gallery', () => {
  test('has highlights and a section per trip, with every photo described', async ({ page }) => {
    await page.goto('/gallery/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Gallery');
    const highlights = page.getByRole('button', { name: /play the .* highlight/ });
    await expect(highlights).toHaveCount(3);
    for (const h of ["Cox's Bazar", 'Team trip', 'Pabna']) await expect(page.getByRole('heading', { level: 2, name: h })).toBeVisible();
    const photos = page.locator('.grid img');
    await expect(photos).toHaveCount(12);
    for (const alt of await photos.evaluateAll((els) => els.map((e) => e.getAttribute('alt')))) expect(alt?.length).toBeGreaterThan(15);
  });

  test('a highlight plays like a story, can be paused, and moves on by itself', async ({ page }) => {
    await page.clock.install();
    await page.goto('/gallery/');
    await page.getByRole('button', { name: /play the Pabna highlight/ }).click();
    const viewer = page.getByRole('dialog', { name: 'Photo viewer' });
    await expect(viewer).toBeVisible();
    await expect(viewer.locator('figcaption')).toHaveText('Hardinge Bridge over the Padma');
    await expect(viewer.locator('[data-bars] i')).toHaveCount(2);
    await viewer.getByRole('button', { name: 'Pause' }).click();
    await page.clock.runFor(6000);
    await expect(viewer.locator('figcaption')).toHaveText('Hardinge Bridge over the Padma');
    await viewer.getByRole('button', { name: 'Play' }).click();
    await page.clock.runFor(5500);
    await expect(viewer.locator('figcaption')).toHaveText('Rooppur power plant, from the road');
    await page.clock.runFor(5500);
    await expect(viewer).toBeHidden();
  });

  test('a grid photo opens the viewer at that photo, and arrow keys and Escape work', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard test');
    await page.goto('/gallery/');
    await page.getByRole('button', { name: /Casuarina trees on a wide sandy beach/ }).click();
    const viewer = page.getByRole('dialog', { name: 'Photo viewer' });
    await expect(viewer.locator('figcaption')).toHaveText('Casuarina trees by the sea');
    await expect(viewer.getByRole('button', { name: 'Pause' })).toBeHidden();
    await page.keyboard.press('ArrowRight');
    await expect(viewer.locator('figcaption')).toHaveText('Flags on the beach');
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    await expect(viewer.locator('figcaption')).toHaveText('Sunset over the Bay of Bengal');
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
  });
});
