# Rakibul Islam · Portfolio

A bento-grid personal site styled as a QA engineer's desktop: every tile is a small app
(terminal, Playwright report, GitHub Actions run, career timeline, map, Bug Hunt game).
The site is tested like a product: E2E, accessibility and visual tests run on every push.

## Stack

- [Astro](https://astro.build) (static output) + TypeScript (strict)
- Plain CSS with design tokens (`src/styles/tokens.css`), dark/light theme
- One small vanilla TypeScript file per interactive widget (`src/scripts/`)
- Playwright + axe-core for tests, GitHub Actions for CI
- Hosting: Cloudflare Pages (Phase 7)

## Run it

```bash
npm install
npx playwright install      # first time only
npm run dev                 # http://localhost:4321
npm test                    # build + all Playwright tests
npm run check               # TypeScript / Astro typecheck
```

`npm test` builds the site and serves it on port 4329 for the tests.

## Edit content

All text lives in `src/content/site.json`: intro, status, skills, experience,
projects, plugins, test report and pipeline steps. Change it there; the tiles update.

Things still marked TODO:

- `links.linkedin` in `site.json`: your real LinkedIn URL
- `site` in `astro.config.mjs`: your domain
- AI Face Analyzer project summary
- Portrait placeholders in `src/components/tiles/Portrait.astro`: swap for your photo/avatar

## Tests

| File | What it covers |
| --- | --- |
| `tests/smoke.spec.ts` | Every page returns 200, one h1, 404 page, downloads, SEO meta, no console errors |
| `tests/shell.spec.ts` | Theme toggle + persistence, nav state, skip link, ⌘K palette (filter, arrows, Enter, Esc) |
| `tests/widgets.spec.ts` | Terminal replay, Bug Hunt game, portrait switcher, map zoom limits, CI tile, clock, contact links |
| `tests/a11y.spec.ts` | axe WCAG 2.2 AA scan of every page in both themes |
| `tests/visual.spec.ts` | Full-page screenshots, dark + light, desktop + mobile |

Visual baselines are Linux renders (they match CI). On macOS the pixel comparison is
skipped automatically. To refresh baselines after an intentional design change, run
`npm run test:update` in CI or a Linux container.

## Project structure

```
src/
  components/      Nav, CommandPalette, Footer, Tile, AppIcon
  components/tiles/ one component per bento tile
  content/site.json all copy and data
  layouts/         BaseLayout (SEO, theme script)
  pages/           routes (inner pages are placeholders until Phase 5)
  scripts/         widget logic (theme, palette, terminal, bughunt)
  styles/          tokens.css, global.css
tests/             Playwright specs
```

## Roadmap

- [x] Phase 1: foundation (Astro, tokens, theme, CI)
- [x] Phase 2: shell (nav, ⌘K palette, footer)
- [x] Phase 3: bento home with static tiles
- [x] Phase 4: interactive tiles with tests
- [ ] Phase 5: About, Projects, Writing, CV pages
- [ ] Phase 6: Cloudflare Pages Functions (`/api/stats`, `/api/ci`) and live `/qa` dashboard
- [ ] Phase 7: polish, OG images, Lighthouse CI, custom domain
