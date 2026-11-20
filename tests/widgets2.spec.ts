import { test, expect } from '@playwright/test';

test.describe('home widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('app switcher shows each app’s links', async ({ page }) => {
    const sw = page.getByRole('region', { name: 'Where to find me' });
    const linkedin = sw.getByRole('tab', { name: 'LinkedIn' });
    await linkedin.click();
    await expect(linkedin).toHaveAttribute('aria-selected', 'true');
    const panel = sw.getByRole('tabpanel');
    await expect(panel).toHaveCount(1);
    await expect(panel.getByRole('link').first()).toHaveAttribute('href', 'https://www.linkedin.com/in/rakibul-islam08/');
    await linkedin.press('ArrowRight');
    await expect(sw.getByRole('tab', { name: 'Medium' })).toBeFocused();
    await expect(sw.getByRole('tabpanel').getByRole('link').first()).toHaveAttribute('href', /medium\.com/);
  });

  test('blog tile reads like a Mail inbox with the newest post first', async ({ page }) => {
    const mail = page.getByRole('region', { name: 'Blog' });
    await mail.scrollIntoViewIfNeeded();
    await expect(mail.getByRole('link', { name: /Automating bulk stock sync/ })).toBeVisible();
    await expect(mail.getByRole('link', { name: 'Follow' })).toHaveAttribute('href', /medium\.com/);
  });

  test('Book a QA chat offers the next three working days in Dhaka', async ({ page }) => {
    const slots = page.locator('#book .cal__slot');
    await expect(slots).toHaveCount(3);
    for (const href of await slots.evaluateAll((els) => els.map((e) => e.getAttribute('href')!))) {
      const subject = decodeURIComponent(new URL(href).searchParams.get('subject')!);
      expect(subject).toMatch(/^QA chat: (Sunday|Monday|Tuesday|Wednesday|Thursday) \d+ \w+ \(via your portfolio\)$/);
    }
  });

  test('Find My credits OpenStreetMap and names the street', async ({ page }) => {
    const map = page.locator('#map');
    await expect(map.getByRole('link', { name: '© OpenStreetMap' })).toHaveAttribute('href', 'https://www.openstreetmap.org/copyright');
    await expect(map.locator('[data-street]')).toHaveText(/Road No\. 5|Rupnagar Road|Road 9|Road 4/);
  });

  test('career board: drag a note, it stays after reload, Reset puts it back', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Mouse drag');
    const note = page.locator('[data-ff-note="now"]');
    await note.scrollIntoViewIfNeeded();
    const before = await note.boundingBox();
    await note.hover();
    await page.mouse.down();
    await page.mouse.move(before!.x + 20, before!.y + 60, { steps: 5 });
    await page.mouse.up();
    const moved = await note.evaluate((n) => (n as HTMLElement).style.top);
    expect(moved).not.toBe('30px');
    await page.reload();
    await expect(page.locator('[data-ff-note="now"]')).toHaveCSS('top', moved);
    await page.getByRole('button', { name: 'Reset' }).click();
    await expect(page.locator('[data-ff-note="now"]')).toHaveCSS('top', '30px');
  });
});

test.describe('live stats', () => {
  test('shows the numbers with the change since last time', async ({ page }) => {
    await page.route('**/api/stats', (r) =>
      r.fulfill({ json: { today: 62, week: 511, countries: 37, yesterday: 113, prevWeek: 400, updatedAt: new Date().toISOString() } }),
    );
    await page.goto('/');
    const stats = page.locator('#stats');
    await stats.scrollIntoViewIfNeeded();
    await expect(stats.locator('[data-stat="today"] [data-value]')).toHaveText('62');
    await expect(stats.locator('[data-stat="today"] [data-change]')).toHaveText('-45.1%');
    await expect(stats.locator('[data-stat="week"] [data-change]')).toHaveText('+27.8%');
    await expect(stats.locator('[data-stat="countries"] [data-value]')).toHaveText('37');
  });

  test('says so when the numbers are unavailable', async ({ page }) => {
    await page.route('**/api/stats', (r) => r.fulfill({ status: 204 }));
    await page.goto('/');
    await page.locator('#stats').scrollIntoViewIfNeeded();
    await expect(page.locator('[data-stats-off]')).toBeVisible();
  });
});

test.describe('iMessage pop-up', () => {
  test('arrives 10 s after the first scroll, once per visit, and can be closed', async ({ page }) => {
    await page.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
    await page.clock.install();
    await page.goto('/');
    const note = page.getByRole('complementary', { name: 'Rakibul Islam' });
    await expect(note).toBeHidden();
    await page.mouse.wheel(0, 400);
    await page.clock.runFor(11_000);
    await expect(note).toBeVisible();
    await note.getByRole('button', { name: 'Reply' }).click();
    await expect(note.getByRole('textbox', { name: /Your reply/ })).toBeFocused();
    await page.keyboard.press('Escape');
    await page.clock.runFor(1_000);
    await expect(note).toBeHidden();

    await page.reload();
    await page.mouse.wheel(0, 400);
    await page.clock.runFor(11_000);
    await expect(page.getByRole('complementary', { name: 'Rakibul Islam' })).toBeHidden();
  });
});

test('contact card copies the email address', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Clipboard permission is Chromium-only in Playwright');
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  const btn = page.locator('[data-copy-email]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(page.locator('[data-copy-status]')).toHaveText('Email address copied');
  await expect(btn).toHaveText('Copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('rakibul.cse.bubt@gmail.com');
});
