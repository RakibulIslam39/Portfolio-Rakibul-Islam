import { test, expect } from '@playwright/test';

test.describe('about page (Apple Notes window)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/about/');
  });

  test('is one long note with every section, starting at the intro', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toHaveText("Hey, I'm Rakibul.");
    for (const h of ['Experience', 'Key achievements', 'Skills', 'Education & languages', 'WordPress community', 'Now']) {
      await expect(page.getByRole('heading', { level: 2, name: h })).toBeAttached();
    }
    await expect(page.locator('[data-note]')).toHaveCount(7);
  });

  test('on desktop the note scrolls inside the window and the list follows along', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Desktop layout');
    const list = page.getByRole('navigation', { name: 'About page sections' });
    const editor = page.locator('[data-notes-editor]');
    await expect(list.getByRole('link', { name: /^About/ })).toHaveAttribute('aria-current', 'true');

    // The window fits the screen; the note itself scrolls.
    const fits = await page.locator('[data-notes]').evaluate((el) => el.getBoundingClientRect().bottom <= window.innerHeight + 1);
    expect(fits).toBe(true);
    const scrolls = await editor.evaluate((el) => el.scrollHeight > el.clientHeight);
    expect(scrolls).toBe(true);

    // Scroll-spy
    await editor.evaluate((el: HTMLElement) => {
      const s = el.querySelector<HTMLElement>('#skills')!;
      el.style.scrollBehavior = 'auto';
      el.scrollTop = s.offsetTop - el.offsetTop;
    });
    await expect(list.getByRole('link', { name: /^Skills/ })).toHaveAttribute('aria-current', 'true');
    await editor.evaluate((el) => (el.scrollTop = el.scrollHeight));
    await expect(list.getByRole('link', { name: /^Now/ })).toHaveAttribute('aria-current', 'true');
  });

  test('clicking a note jumps to that section and updates the URL hash', async ({ page, isMobile }) => {
    test.skip(isMobile, 'The list is hidden on phones');
    const list = page.getByRole('navigation', { name: 'About page sections' });
    await list.getByRole('link', { name: /^Experience/ }).click();
    await expect(page).toHaveURL(/#experience$/);
    await expect(list.getByRole('link', { name: /^Experience/ })).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('heading', { name: 'Experience', level: 2 })).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });

  test('a hash link opens at that section', async ({ page }) => {
    await page.goto('/about/#education');
    await expect(page.getByText('Bangladesh University of Business and Technology')).toBeInViewport();
  });

  test('the sidebars can be hidden and shown again', async ({ page, isMobile }) => {
    test.skip(isMobile, 'No sidebars on phones');
    const list = page.getByRole('navigation', { name: 'About page sections' });
    await page.getByRole('button', { name: 'Hide Notes sidebars' }).click();
    await expect(list).toBeHidden();
    await page.getByRole('button', { name: 'Show Notes sidebars' }).click();
    await expect(list).toBeVisible();
  });

  test('a temporary note can be written and is not saved', async ({ page, isMobile }) => {
    await page.getByRole('button', { name: 'Create a temporary note' }).click();
    const title = page.getByRole('textbox', { name: 'Note title' });
    await expect(title).toBeFocused();
    await title.fill('Bug ideas');
    await page.getByRole('textbox', { name: 'Note body' }).fill('Check the empty cart');
    if (!isMobile) {
      await expect(page.locator('[data-notes-draft]')).toContainText('Bug ideas');
    }
    await page.getByRole('button', { name: /About Rakibul/ }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-notes-draft]')).toBeHidden();
  });

  test('all notes are readable without JavaScript', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto('/about/');
    await expect(page.locator('[data-note]')).toHaveCount(7);
    await expect(page.locator('[data-notes-temp]')).toBeHidden();
    await ctx.close();
  });
});

test('education lists the main courses and the capstone project', async ({ page }) => {
  await page.goto('/about/#education');
  const note = page.locator('#education');
  await expect(note).toContainText('Jun 2018 – Dec 2022');
  for (const t of ['Computer science core', 'Mathematics and statistics', 'Software and applied computing', 'Theory of computation and automata', 'Software Testing and Quality Assurance was the course that influenced me most']) {
    await expect(note).toContainText(t);
  }
  await expect(note.getByRole('link', { name: 'Traffic Flow Prediction' })).toHaveAttribute('href', '/projects/traffic-flow-prediction/');
  await expect(note.getByRole('link', { name: /Code and documentation/ })).toHaveAttribute('href', 'https://github.com/RakibulIslam39/traffic-flow-prediction-Python');
  await expect(note).toContainText('R² of about 0.94');
});
