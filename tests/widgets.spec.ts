import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

test('terminal replays the Playwright run and ends green', async ({ page }) => {
  const term = page.locator('[data-terminal]');
  await term.scrollIntoViewIfNeeded();
  await expect(term).toHaveAttribute('data-state', 'done', { timeout: 10_000 });
  await expect(term.locator('[data-term-out]')).toContainText('38 passed');

  await term.getByRole('button', { name: 'Run again' }).click();
  await expect(term).toHaveAttribute('data-state', 'running');
  await expect(term).toHaveAttribute('data-state', 'done', { timeout: 10_000 });
  await expect(term.locator('[data-term-out]')).toContainText('38 passed');
});

test('terminal shows the final output immediately with reduced motion', async ({ browser }) => {
  const ctx = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto('/');
  await expect(page.locator('[data-term-out]')).toContainText('38 passed');
  await expect(page.locator('[data-terminal]')).toHaveAttribute('data-state', 'done');
  await ctx.close();
});

test('bug hunt: finding all five bugs passes QA, reset clears it', async ({ page }) => {
  const game = page.locator('[data-bughunt]');
  const bugs = game.locator('[data-bug]');
  await expect(bugs).toHaveCount(5);
  await expect(game.getByRole('button', { name: 'Reset' })).toBeHidden();

  for (let i = 0; i < 5; i++) await bugs.nth(i).click();
  // Clicking a found bug twice must not double count.
  await bugs.first().click();

  await expect(game.locator('[data-bh-found]')).toHaveText('5');
  await expect(game.locator('[data-bh-log] li')).toHaveCount(5);
  await expect(game.getByText('QA passed')).toBeVisible();
  await expect(game).toHaveAttribute('data-complete', 'true');

  await game.getByRole('button', { name: 'Reset' }).click();
  await expect(game.locator('[data-bh-found]')).toHaveText('0');
  await expect(game.getByText('QA passed')).toBeHidden();
});

test('portrait switches between photo and 3D avatar and remembers it', async ({ page }) => {
  const btn = page.getByRole('button', { name: '3D avatar' });
  await expect(btn).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.portrait__img--photo')).toHaveCSS('opacity', '1');
  await btn.click();
  await expect(btn).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('html')).toHaveAttribute('data-look', 'avatar');
  await page.reload();
  await expect(page.getByRole('button', { name: '3D avatar' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: '3D avatar' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-look', 'photo');
});

test('map zoom is clamped between 1x and 2.5x', async ({ page }) => {
  const svg = page.locator('[data-map-svg]');
  const zoomIn = page.getByRole('button', { name: 'Zoom in' });
  for (let i = 0; i < 5; i++) await zoomIn.click();
  await expect(svg).toHaveAttribute('data-zoom', '2.5');
  const zoomOut = page.getByRole('button', { name: 'Zoom out' });
  for (let i = 0; i < 5; i++) await zoomOut.click();
  await expect(svg).toHaveAttribute('data-zoom', '1');
});

test('CI tile finishes with a success badge', async ({ page }) => {
  const ci = page.locator('#ci');
  await ci.scrollIntoViewIfNeeded();
  await expect(ci.locator('[data-ci-step].is-done')).toHaveCount(5, { timeout: 10_000 });
  await expect(ci.locator('[data-ci-status]')).toHaveText('Success');
});

test('status card shows the current time in Dhaka', async ({ page }) => {
  await expect(page.locator('[data-local-time]')).toHaveText(/^\d{2}:\d{2}$/);
});

test('contact links are correct', async ({ page }) => {
  const contact = page.locator('#contact');
  await expect(contact.getByRole('link', { name: 'Email' })).toHaveAttribute('href', /^mailto:/);
  await expect(contact.getByRole('link', { name: 'Save contact' })).toHaveAttribute('href', '/rakibul-islam.vcf');
});

test('the Test report tile holds the live terminal run', async ({ page }) => {
  const report = page.locator('#report');
  await expect(report.locator('[data-terminal]')).toHaveCount(1);
  await expect(page.locator('#term')).toHaveCount(0);
});

test('tiles rise in on the first visit of a session only', async ({ page }) => {
  // beforeEach already made the first visit (tiles animated); a second load skips it.
  await page.evaluate(() => sessionStorage.removeItem('arrived'));
  await page.reload();
  await expect(page.locator('html')).not.toHaveAttribute('data-arrived');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-arrived', '');
});

test('the pointer glow is on for mouse users only', async ({ page, isMobile }) => {
  const bento = page.locator('[data-bento]');
  if (isMobile) await expect(bento).not.toHaveAttribute('data-glow');
  else await expect(bento).toHaveAttribute('data-glow', '');
});
