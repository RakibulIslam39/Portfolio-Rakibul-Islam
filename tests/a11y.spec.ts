import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/about/', '/projects/', '/projects/flexorder-e2e/', '/writing/', '/writing/page-objects-that-age-well/', '/cv/', '/qa/', '/404/'];

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
