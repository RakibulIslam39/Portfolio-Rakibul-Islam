import { test, expect } from '@playwright/test';

test.describe('about page (Notes layout)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about/');
  });

  test('shows one note at a time, starting with "About me"', async ({ page }) => {
    const tabs = page.getByRole('tablist', { name: 'Notes' }).getByRole('tab');
    await expect(tabs).toHaveCount(6);
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.getByRole('tabpanel')).toContainText('About me');
  });

  test('clicking a note shows it and updates the URL hash', async ({ page }) => {
    await page.getByRole('tab', { name: /Experience/ }).click();
    const panel = page.getByRole('tabpanel');
    await expect(panel).toContainText('Jr. SQA Engineer');
    await expect(panel).toContainText('WPPOOL');
    await expect(page).toHaveURL(/#experience$/);
  });

  test('arrow keys, Home and End move between notes', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard test');
    const first = page.getByRole('tab', { name: /About me/ });
    await first.focus();
    await page.keyboard.press('ArrowDown');
    await expect(page.getByRole('tab', { name: /Experience/ })).toBeFocused();
    await expect(page.getByRole('tab', { name: /Experience/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(page.getByRole('tab', { name: /Now/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(first).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(page.getByRole('tab', { name: /Now/ })).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(first).toHaveAttribute('aria-selected', 'true');
  });

  test('a hash link opens that note directly', async ({ page }) => {
    await page.goto('/about/#education');
    await expect(page.getByRole('tab', { name: /Education/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel')).toContainText('Bangladesh University of Business and Technology');
    await expect(page.getByRole('tabpanel')).toContainText('Bengali');
  });

  test('all notes are readable without JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/about/');
    await expect(page.locator('[data-note]:visible')).toHaveCount(6);
    await ctx.close();
  });
});
