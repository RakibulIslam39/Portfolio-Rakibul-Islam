import { test, expect } from '@playwright/test';

test.describe('edit layout', () => {
  test('keyboard: move a tile, keep it after reload, reset', async ({ page }) => {
    await page.goto('/');
    const edit = page.getByRole('button', { name: 'Edit layout' });
    await edit.click();
    await expect(page.locator('[data-bento]')).toHaveClass(/bento--editing/);
    const hero = page.locator('#hero');
    await expect(hero).toBeFocused();
    await expect(hero).toHaveAttribute('aria-roledescription', 'movable tile');
    // Links inside tiles stop responding while editing.
    expect(await page.locator('#hero a').first().evaluate((a) => a.closest('[inert]') !== null)).toBe(true);

    await page.keyboard.press('ArrowRight');
    await expect(hero).toHaveAttribute('data-slot', 'portrait');
    await expect(page.locator('#portrait')).toHaveAttribute('data-slot', 'hero');
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-bento]')).not.toHaveClass(/bento--editing/);
    await expect(edit).toBeFocused();

    await page.reload();
    await expect(page.locator('#hero')).toHaveAttribute('data-slot', 'portrait');
    await page.getByRole('button', { name: 'Edit layout' }).click();
    await page.getByRole('button', { name: 'Reset layout' }).click();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.locator('#hero')).toHaveAttribute('data-slot', 'hero');
    await page.reload();
    await expect(page.locator('#hero')).not.toHaveAttribute('data-slot', 'portrait');
  });

  test('mouse: drop one tile on another to swap them', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mouse drag');
    await page.goto('/');
    const book = page.locator('#book');
    const stats = page.locator('#stats');
    await book.scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Edit layout' }).click();
    // Editing focuses the first tile and may scroll; bring the pair back without waiting for the jiggle to stop.
    await book.evaluate((el) => el.scrollIntoView({ block: 'center' }));
    const from = (await book.boundingBox())!;
    const to = (await stats.boundingBox())!;
    await page.mouse.move(from.x + 40, from.y + 40);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
    await page.mouse.up();
    await expect(book).toHaveAttribute('data-slot', 'stats');
    await expect(stats).toHaveAttribute('data-slot', 'book');
    expect(await book.evaluate((t) => t.style.getPropertyValue('--area'))).toBe('stats');
  });
});

test.describe('spotlight', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  const open = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Search' }).click();
    return page.getByRole('dialog', { name: 'Search the site' });
  };

  test('does sums', async ({ page }) => {
    const d = await open(page);
    await d.getByRole('combobox').fill('12*(3+4) - 2^3');
    await expect(d.getByRole('option').first()).toContainText('= 76');
  });

  test('finds posts, certificates and repositories', async ({ page }) => {
    const d = await open(page);
    await d.getByRole('combobox').fill('advanced playwright');
    await expect(d.getByRole('option', { name: /Certificates Advanced Playwright/ })).toBeVisible();
    await d.getByRole('combobox').fill('traffic python');
    await expect(d.getByRole('option', { name: /Repositories traffic-flow-prediction-Python/ })).toBeVisible();
    await d.getByRole('combobox').fill('stock sync');
    await expect(d.getByRole('option', { name: /Blog Automating bulk stock sync/ })).toBeVisible();
  });

  test('has a QA Easter egg', async ({ page }) => {
    const d = await open(page);
    await d.getByRole('combobox').fill('npx playwright test');
    await expect(d.getByRole('option').first()).toContainText('1 passed: hire Rakibul');
    await d.getByRole('combobox').fill('rm -rf /');
    await expect(d.getByRole('option').first()).toContainText('Nothing was deleted');
  });

  test('switches the photo from the menu', async ({ page }) => {
    const d = await open(page);
    await d.getByRole('combobox').fill('avatar');
    await page.keyboard.press('Enter');
    await expect(page.locator('html')).toHaveAttribute('data-look', 'avatar');
    await expect(page.getByRole('button', { name: '3D avatar' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('"/" opens search when not typing', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard shortcut');
    await page.keyboard.press('/');
    await expect(page.getByRole('dialog', { name: 'Search the site' })).toBeVisible();
  });
});

test('Blog shows a new-post dot until the Blog page has been opened', async ({ page }) => {
  await page.goto('/');
  const dot = page.locator('.nav [data-new-badge]');
  await expect(dot).toBeVisible();
  await page.goto('/writing/');
  await expect(dot).toBeHidden();
  await page.goto('/');
  await expect(page.locator('.nav [data-new-badge]')).toBeHidden();
});
