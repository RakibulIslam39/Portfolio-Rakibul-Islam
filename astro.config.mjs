// @ts-check
import { defineConfig } from 'astro/config';

// TODO: replace with your real domain once it is connected on Cloudflare Pages.
export default defineConfig({
  site: 'https://rakibulislam.dev',
  output: 'static',
  trailingSlash: 'always',
});
