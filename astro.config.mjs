// @ts-check
import { defineConfig } from 'astro/config';

/**
 * The site's public address. Canonical URLs, Open Graph links and the sitemap are built from it.
 * When you add a custom domain, change it here AND in public/robots.txt (a test checks they match).
 */
export const SITE = 'https://rakibul-portfolio.pages.dev';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  // Inline the (small) CSS so it doesn't block the first paint.
  build: { inlineStylesheets: 'always' },
  markdown: {
    // High-contrast theme so code comments pass WCAG AA on the dark code background.
    shikiConfig: { theme: 'github-dark-high-contrast' },
  },
});
