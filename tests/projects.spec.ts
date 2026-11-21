import { test, expect } from '@playwright/test';

const slugs = ['flexorder-e2e', 'traffic-flow-prediction', 'ai-face-analyzer'];

test('projects index lists every case study', async ({ page }) => {
  await page.goto('/projects/');
  await expect(page.getByRole('heading', { level: 1, name: 'Projects' })).toBeVisible();
  // App Store "Today" cards: one per case study, each with a View link to it.
  const cards = page.locator('.plist > li.today:not(.today--work)');
  await expect(cards).toHaveCount(slugs.length);
  for (const slug of slugs) await expect(cards.locator(`a[href="/projects/${slug}/"]`)).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'View the FlexOrder E2E Automation case study' })).toHaveAttribute('href', '/projects/flexorder-e2e/');
  await expect(page.getByRole('heading', { name: "Where I've tested" })).toBeVisible();
});

test('a case study has its sections, metrics and stack', async ({ page }) => {
  await page.goto('/projects/flexorder-e2e/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('FlexOrder E2E Automation');
  for (const h of ['The problem', 'What I built', 'The result']) {
    await expect(page.getByRole('heading', { level: 2, name: h })).toBeVisible();
  }
  const results = page.getByRole('list', { name: 'Results' });
  await expect(results).toContainText('38');
  await expect(results).toContainText('100%');
  await expect(page.getByRole('complementary', { name: 'Tech stack' })).toContainText('Playwright');
});

test('"next project" links cycle through all case studies', async ({ page }) => {
  await page.goto(`/projects/${slugs[0]}/`);
  for (let i = 1; i <= slugs.length; i++) {
    await page.getByRole('navigation', { name: 'Next project' }).getByRole('link').click();
    await expect(page).toHaveURL(new RegExp(`/projects/${slugs[i % slugs.length]}/$`));
  }
});

test('external project links open in a new tab safely', async ({ page }) => {
  await page.goto('/projects/traffic-flow-prediction/');
  const link = page.getByRole('link', { name: /Source code/ });
  await expect(link).toHaveAttribute('href', /github\.com\/RakibulIslam39\/traffic-flow-prediction-Python/);
  await expect(link).toHaveAttribute('target', '_blank');
  await expect(link).toHaveAttribute('rel', /noopener/);
});

test('home tiles link to the case studies', async ({ page }) => {
  await page.goto('/');
  await page.locator('#projects').getByRole('link', { name: /Traffic Flow Prediction/ }).click();
  await expect(page).toHaveURL(/\/projects\/traffic-flow-prediction\/$/);
  await page.goto('/');
  await page.getByRole('link', { name: 'Read the FlexOrder E2E Automation case study' }).click();
  await expect(page).toHaveURL(/\/projects\/flexorder-e2e\/$/);
});

test('lists every public GitHub repository with a link', async ({ page }) => {
  await page.goto('/projects/');
  const section = page.getByRole('region', { name: 'All GitHub repositories' });
  const repos = section.locator('[data-repo]');
  await expect(repos).toHaveCount(12);
  for (const name of ['FlexOrder-e2e-Automation-with-CI-CD', 'connector-platform-e2e-automation', 'traffic-flow-prediction-Python', 'ai-face-analyzer']) {
    await expect(section.getByRole('link', { name: `${name} on GitHub` })).toHaveAttribute('href', `https://github.com/RakibulIslam39/${name}`);
  }
  await expect(section.getByRole('link', { name: /^Case study ?: FlexOrder-e2e-Automation-with-CI-CD$/ })).toHaveAttribute('href', '/projects/flexorder-e2e/');
});
