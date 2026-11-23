import { test, expect } from '@playwright/test';

test.describe('theme', () => {
  test('toggle switches theme and persists across reloads', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Theme button is in the command palette on mobile');
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await page.getByRole('button', { name: 'Switch colour theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });

  test('follows the system preference on first visit', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test.describe('navigation', () => {
  test('marks the current page in the nav', async ({ page }) => {
    await page.goto('/projects/');
    const nav = page.getByRole('navigation', { name: 'Main' });
    await expect(nav.getByRole('link', { name: 'Projects' })).toHaveAttribute('aria-current', 'page');
    await expect(nav.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current', 'page');
  });

  test('skip link moves focus to main content', async ({ page, isMobile, browserName }) => {
    test.skip(isMobile, 'Keyboard test');
    await page.goto('/');
    // Safari on macOS only tabs to links with Option+Tab (its default "Tab highlights each item" is off).
    const tabKey = browserName === 'webkit' && process.platform === 'darwin' ? 'Alt+Tab' : 'Tab';
    await page.keyboard.press(tabKey);
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await skip.press('Enter');
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe('command palette', () => {
  test('opens with Ctrl/Cmd+K, filters, and navigates with the keyboard', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard shortcut test');
    await page.goto('/');
    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog', { name: 'Search the site' });
    await expect(dialog).toBeVisible();
    const input = dialog.getByRole('combobox');
    await expect(input).toBeFocused();

    await input.fill('about');
    await expect(dialog.getByRole('option').first()).toHaveAttribute('aria-selected', 'true');
    await expect(dialog.getByRole('option').first()).toContainText('About');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/about\/$/);
  });

  test('arrow keys move the selection and Escape closes', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Keyboard test');
    await page.goto('/');
    await page.getByRole('button', { name: /Search/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search the site' });
    const options = dialog.getByRole('option');
    await expect(options.nth(0)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowUp');
    await page.keyboard.press('ArrowUp');
    await expect(options.last()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('looks like Spotlight: suggestions first, then a preview of the selected result', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The preview pane is hidden on phones');
    await page.goto('/');
    await page.getByRole('button', { name: /Search/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search the site' });
    await expect(dialog.getByText('Suggestions', { exact: true })).toBeVisible();
    const preview = dialog.locator('[data-palette-preview]');
    await expect(preview).toContainText('About');
    await dialog.getByRole('combobox').fill('flexorder');
    await expect(dialog.getByText('Suggestions', { exact: true })).toBeHidden();
    await expect(preview).toContainText('FlexOrder E2E Automation');
    await expect(preview).toContainText('Playwright');
  });

  test('shows an empty state for no matches', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Search/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search the site' });
    await dialog.getByRole('combobox').fill('zzzz-no-match');
    await expect(dialog.getByText('No results')).toBeVisible();
  });

  test('theme action works from the palette', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await page.getByRole('button', { name: /Search/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Search the site' });
    await dialog.getByRole('combobox').fill('theme');
    await dialog.getByRole('option').first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });
});

test('the RI logo shows the right version for each theme and links home', async ({ page, isMobile }) => {
  test.skip(isMobile, 'The logo is hidden in the phone nav bar');
  for (const scheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto('/about/');
    const logo = page.getByRole('banner').getByRole('link', { name: 'Rakibul Islam, home' });
    await expect(logo).toHaveAttribute('href', '/');
    await expect(logo.locator(`.brand-logo--${scheme}`)).toBeVisible();
    await expect(logo.locator(`.brand-logo--${scheme === 'light' ? 'dark' : 'light'}`)).toBeHidden();
  }
  const icon = await page.request.get('/favicon.svg');
  expect(icon.headers()['content-type']).toContain('svg');
});

test('on phones, "More" opens a sheet with the pages that don\'t fit in the bar', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'The More sheet is for phones');
  await page.goto('/');
  const nav = page.getByRole('navigation', { name: 'Main' });
  await nav.getByRole('button', { name: 'More' }).click();
  for (const name of ['Certificates', 'Gallery', 'Activity', 'QA report', 'CV']) {
    await expect(nav.getByRole('link', { name })).toBeVisible();
  }
  await nav.getByRole('link', { name: 'Gallery' }).click();
  await expect(page).toHaveURL(/\/gallery\/$/);
});

test('switching theme still works with the circle reveal', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  const html = page.locator('html');
  const before = await html.getAttribute('data-theme');
  await page.locator('[data-theme-toggle]:visible').first().click();
  await expect(html).not.toHaveAttribute('data-theme', before ?? 'dark');
  await expect(html).not.toHaveAttribute('data-theme-switch');
});
