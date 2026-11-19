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

Long-form content is Markdown:

- `src/content/projects/*.md`: case studies (frontmatter: hook, metrics, stack, links)
- `src/content/writing/*.md`: blog posts (frontmatter: title, excerpt, date, category)

Set `placeholder: false` in a file's frontmatter once its lorem ipsum is replaced; that removes the "Draft" label.

Things still marked TODO (search the repo for `TODO` and `Lorem`):

- `links.linkedin` in `site.json`: your real LinkedIn URL
- `site` in `astro.config.mjs`: your domain
- Lorem ipsum in the three case studies, the About page ("About me" and "Now" notes) and all four writing posts
- Portrait placeholders in `src/components/tiles/Portrait.astro`: swap for your photo/avatar

## Tests

| File | What it covers |
| --- | --- |
| `tests/smoke.spec.ts` | Every page returns 200, one h1, 404 page, downloads, SEO meta, no console errors |
| `tests/shell.spec.ts` | Theme toggle + persistence, nav state, skip link, ⌘K palette (filter, arrows, Enter, Esc) |
| `tests/widgets.spec.ts` | Terminal replay, Bug Hunt game, portrait switcher, map zoom limits, CI tile, clock, contact links |
| `tests/a11y.spec.ts` | axe WCAG 2.2 AA scan of every page in both themes |
| `tests/about.spec.ts` | Notes tabs: click, arrow keys, Home/End, hash deep links, readable without JS |
| `tests/projects.spec.ts` | Projects index, case-study sections and metrics, next-project cycle, home tile links |
| `tests/writing.spec.ts` | Newest-first order, category filter chips, post page |
| `tests/cv.spec.ts` | All CV sections, PDF download, print layout |
| `tests/visual.spec.ts` | Full-page screenshots, dark + light, desktop + mobile |

Visual baselines are rendered in Playwright's official Docker image, the same one CI uses,
so they match pixel for pixel. On macOS the pixel comparison is skipped automatically.
After an intentional design change, go to **Actions → Update visual snapshots → Run workflow**:
it regenerates the baselines in that image and commits them.

## Project structure

```
src/
  components/      Nav, CommandPalette, Footer, Tile, AppIcon
  components/tiles/ one component per bento tile
  content/site.json all copy and data
  layouts/         BaseLayout (SEO, theme script)
  content/projects/ case studies (Markdown)
  content/writing/ blog posts (Markdown)
  pages/           routes (/qa is a placeholder until Phase 6)
  scripts/         widget logic (theme, palette, terminal, bughunt)
  styles/          tokens.css, global.css
tests/             Playwright specs
```

## Roadmap

- [x] Phase 1: foundation (Astro, tokens, theme, CI)
- [x] Phase 2: shell (nav, ⌘K palette, footer)
- [x] Phase 3: bento home with static tiles
- [x] Phase 4: interactive tiles with tests
- [x] Phase 5: About, Projects, Writing, CV pages
- [ ] Phase 6: Cloudflare Pages Functions (`/api/stats`, `/api/ci`) and live `/qa` dashboard
- [ ] Phase 7: polish, OG images, Lighthouse CI, custom domain
