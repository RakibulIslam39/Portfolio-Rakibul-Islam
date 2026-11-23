import { test, expect } from '@playwright/test';

const slugs = ['flexorder-e2e', 'traffic-flow-prediction', 'ai-face-analyzer', 'old-portfolio'];

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

test('a case study reads like an App Store page', async ({ page }) => {
  await page.goto('/projects/flexorder-e2e/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('FlexOrder E2E Automation');
  for (const h of ['Preview', 'About', 'Information', 'You might also like', 'The problem', 'What I built', 'The result']) {
    await expect(page.getByRole('heading', { level: 2, name: h, exact: true })).toBeVisible();
  }
  const facts = page.getByRole('definition').locator('xpath=ancestor::dl[1]').first();
  await expect(facts).toHaveAttribute('aria-label', 'Key facts');
  await expect(facts).toContainText('38');
  await expect(facts).toContainText('100%');
  await expect(page.locator('.app__stack')).toContainText('Playwright');
  const crumbs = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(crumbs.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/');
  await expect(crumbs.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects/');
  await expect(crumbs.locator('[aria-current="page"]')).not.toBeEmpty();
});

test('"You might also like" links to every other case study', async ({ page }) => {
  for (const slug of slugs) {
    await page.goto(`/projects/${slug}/`);
    const more = page.locator('.app__more');
    await expect(more.getByRole('link')).toHaveCount(slugs.length - 1);
    for (const other of slugs.filter((s) => s !== slug)) {
      await expect(more.locator(`a[href="/projects/${other}/"]`)).toHaveCount(1);
    }
  }
  await page.locator('.app__more').getByRole('link').first().click();
  await expect(page).toHaveURL(/\/projects\/(flexorder-e2e|traffic-flow-prediction)\/$/);
});

test('external project links open in a new tab safely', async ({ page }) => {
  await page.goto('/projects/traffic-flow-prediction/');
  const link = page.getByRole('link', { name: /View code/ });
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

test('experience shows each company’s own logo', async ({ page }) => {
  for (const path of ['/projects/', '/about/']) {
    await page.goto(path);
    const logos = page.locator('.co-logo img');
    await expect(logos, path).toHaveCount(3);
    const srcs = await logos.evaluateAll((imgs) => imgs.map((i) => i.getAttribute('src')));
    expect(srcs.sort()).toEqual(['/companies/edutechs.webp', '/companies/wppool.svg', '/companies/zaimah.webp']);
    const loaded = await logos.evaluateAll((imgs) =>
      Promise.all((imgs as HTMLImageElement[]).map((i) => (i.loading = 'eager', i.decode().then(() => i.naturalWidth > 0, () => false)))),
    );
    expect(loaded, path).toEqual([true, true, true]);
  }
});

test('the previous portfolio is a project that links to the old site', async ({ page }) => {
  await page.goto('/projects/old-portfolio/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('My previous portfolio');
  const visit = page.getByRole('link', { name: /Visit the old site/ }).first();
  await expect(visit).toHaveAttribute('href', 'https://rakib-protfolio.vercel.app/');
  await expect(visit).toHaveAttribute('target', '_blank');
  await expect(page.locator('main')).toContainText('three.js');
});

test('AI Face Analyzer links to the live app on Hugging Face and to its code', async ({ page }) => {
  await page.goto('/projects/ai-face-analyzer/');
  const live = page.locator('.app__actions').getByRole('link', { name: /View live project/ });
  await expect(live).toHaveAttribute('href', 'https://huggingface.co/spaces/rakibul008/ai-face-analyzer');
  await expect(live).toHaveAttribute('target', '_blank');
  await expect(live).toHaveClass(/app__btn--primary/);
  await expect(page.locator('.app__actions').getByRole('link', { name: /View code/ })).toHaveAttribute('href', /github\.com\/RakibulIslam39\/ai-face-analyzer/);
});
