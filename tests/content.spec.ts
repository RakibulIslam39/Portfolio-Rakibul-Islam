import { test, expect } from '@playwright/test';

test('LinkedIn points at the real profile everywhere', async ({ page }) => {
  for (const p of ['/', '/cv/']) {
    await page.goto(p);
    const hrefs = await page.locator('a[href*="linkedin.com"]').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    expect(hrefs.length, p).toBeGreaterThan(0);
    for (const h of hrefs) expect(h, p).toBe('https://www.linkedin.com/in/rakibul-islam08/');
  }
});

test('vCard includes LinkedIn and the site', async ({ request }) => {
  const vcf = await (await request.get('/rakibul-islam.vcf')).text();
  expect(vcf).toContain('linkedin.com/in/rakibul-islam08');
  expect(vcf).toContain('URL:https://rakibul-portfolio.pages.dev/');
});


test('Edutechs dates match the experience letter', async ({ page }) => {
  await page.goto('/cv/');
  const item = page.locator('.cv__item', { hasText: 'Edutechs' });
  await expect(item).toContainText('Software QA Engineer');
  await expect(item).toContainText('Mar 2023 – Aug 2023 · Dhaka');
  await expect(page.getByRole('heading', { name: 'Certificates' })).toBeVisible();
});

test('case studies with real write-ups carry no lorem ipsum', async ({ page }) => {
  for (const slug of ['flexorder-e2e', 'traffic-flow-prediction']) {
    await page.goto(`/projects/${slug}/`);
    await expect(page.locator('main')).not.toContainText(/lorem ipsum/i);
    await expect(page.locator('.draft-badge')).toHaveCount(0);
  }
});

test('AI Face Analyzer is described as the FastAPI + DeepFace app it is', async ({ page }) => {
  await page.goto('/projects/ai-face-analyzer/');
  await expect(page.locator('main')).toContainText('FastAPI');
  await expect(page.locator('main')).toContainText('DeepFace');
  await expect(page.locator('main')).not.toContainText(/lorem ipsum|runs entirely in the browser/i);
});

test('WordPress.org profile and contributions are linked', async ({ page, request }) => {
  const profile = 'https://profiles.wordpress.org/rakib03029/';
  for (const p of ['/', '/about/', '/cv/']) {
    await page.goto(p);
    await expect(page.locator(`a[href="${profile}"]`).first(), p).toBeAttached();
  }
  await page.goto('/about/');
  const note = page.locator('#community');
  await expect(note).toContainText('Translation Contributor');
  await expect(note).toContainText('Bengali');
  await expect(note).toContainText('Test team');
  const vcf = await (await request.get('/rakibul-islam.vcf')).text();
  expect(vcf).toContain('profiles.wordpress.org/rakib03029');
});

test('phone number is on the contact card, the CV and the saved contact', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('#contact a[href="tel:+8801701026708"]')).toContainText('+880 1701-026708');
  await page.goto('/cv/');
  await expect(page.locator('a[href="tel:+8801701026708"]')).toHaveText('+880 1701-026708');
  const vcf = await (await request.get('/rakibul-islam.vcf')).text();
  expect(vcf).toContain('TEL;TYPE=CELL,VOICE:+8801701026708');
});
