// @ts-check
import { defineConfig } from 'astro/config';

// TODO: replace with your real domain once it is connected on Cloudflare Pages.
export default defineConfig({
  site: 'https://rakibulislam.dev',
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    // High-contrast theme so code comments pass WCAG AA on the dark code background.
    shikiConfig: { theme: 'github-dark-high-contrast' },
  },
});
