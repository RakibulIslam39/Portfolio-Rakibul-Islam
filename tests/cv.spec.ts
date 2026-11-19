import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/cv/');
});

test('CV has every section from the PDF', async ({ page }) => {
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Rakibul Islam');
  for (const h of ['Summary', 'Experience', 'Key achievements', 'Projects', 'Skills', 'Education', 'Languages']) {
    await expect(page.getByRole('heading', { level: 2, name: h })).toBeVisible();
  }
  for (const company of ['WPPOOL', 'Zaimah Technologies', 'Edutechs']) {
    await expect(page.getByRole('heading', { level: 3, name: new RegExp(company) })).toBeVisible();
  }
});

test('offers the PDF download', async ({ page, request }) => {
  const pdf = page.getByRole('link', { name: 'Download PDF' });
  await expect(pdf).toHaveAttribute('href', '/Rakibul-Islam-CV.pdf');
  const res = await request.get('/Rakibul-Islam-CV.pdf');
  expect(res.ok()).toBe(true);
});

test('print layout hides the site chrome', async ({ page }) => {
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.topbar')).toBeHidden();
  await expect(page.locator('.footer')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Print this page' })).toBeHidden();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
