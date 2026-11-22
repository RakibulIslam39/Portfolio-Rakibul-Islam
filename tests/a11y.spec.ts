import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFileSync } from 'node:fs';

const pages = ['/', '/about/', '/projects/', '/projects/flexorder-e2e/', '/writing/', '/certificates/', '/cv/', '/qa/', '/activity/', '/gallery/', '/404/'];

for (const theme of ['dark', 'light'] as const) {
  for (const path of pages) {
    test(`${path} has no axe violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(path);
      // axe-core/playwright pins an older Page type; the runtime object is compatible.
      const results = await new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0])
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        // The Bug Hunt mock contains deliberate bugs (one is low contrast).
        .exclude('.bh__ui')
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });
  }
}

// Live tiles only render some text (trend chips, vitals) once the APIs answer, so check them with mocked data too.
const live = {
  stats: { today: 13, week: 13, countries: 2, yesterday: 0, prevWeek: 0, updatedAt: new Date().toISOString() },
  activity: JSON.parse(readFileSync('tests/fixtures/activity.json', 'utf8')),
  ci: { status: 'passing', title: 'x', commit: 'abc1234', url: 'https://github.com', startedAt: new Date().toISOString(), durationSeconds: 200, runNumber: 40 },
};

for (const theme of ['dark', 'light'] as const) {
  for (const path of ['/', '/qa/', '/activity/']) {
    test(`${path} with live data has no axe violations (${theme})`, async ({ page }) => {
      await page.route('**/api/stats', (r) => r.fulfill({ json: live.stats }));
      await page.route('**/api/ci', (r) => r.fulfill({ json: live.ci }));
      await page.route('**/api/activity', (r) => r.fulfill({ json: live.activity }));
      await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      const results = await new AxeBuilder({ page } as unknown as ConstructorParameters<typeof AxeBuilder>[0])
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`)).toEqual([]);
    });
  }
}
