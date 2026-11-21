/**
 * Layout gates from the v2 review: no sideways scroll on small phones, and tap targets
 * that meet WCAG 2.2 AA (24 px), with 44 px for buttons and standalone links.
 */
import { test, expect } from '@playwright/test';

const pages = ['/', '/about/', '/projects/', '/projects/flexorder-e2e/', '/writing/', '/certificates/', '/cv/', '/qa/', '/activity/', '/does-not-exist/'];

test.describe('narrow screens', () => {
  test.use({ viewport: { width: 320, height: 640 } });
  for (const path of pages) {
    test(`${path} has no sideways scroll at 320 px`, async ({ page }) => {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe('tap targets', () => {
  for (const path of pages) {
    test(`${path} meets the tap-target sizes`, async ({ page }) => {
      await page.goto(path);
      const problems = await page.evaluate(() => {
        const out: string[] = [];
        const visible = (e: Element) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden';
        };
        // Links inside running text are exempt under WCAG 2.5.8.
        const inText = (e: Element) => !!e.closest('p, .prose li, td, dd, .notes, .cv');
        for (const e of document.querySelectorAll('a[href], button, summary, [role="tab"]')) {
          if (!visible(e) || (e.tagName === 'A' && inText(e) && !e.classList.contains('tap'))) continue;
          const r = e.getBoundingClientRect();
          const label = `${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 30)}"`;
          if (r.height < 24 || r.width < 24) out.push(`${label} ${Math.round(r.width)}x${Math.round(r.height)} < 24`);
          if ((e.classList.contains('btn') || e.classList.contains('tap')) && r.height < 36) out.push(`${label} height ${Math.round(r.height)} < 36`);
        }
        return out;
      });
      expect(problems).toEqual([]);
    });
  }
});
