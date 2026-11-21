# Rakibul Islam · Portfolio

A bento-grid personal site styled as a QA engineer's desktop: every tile is a small app
(terminal, Playwright report, GitHub Actions run, career timeline, map, Bug Hunt game).
The site is tested like a product: E2E, accessibility and visual tests run on every push.

## Stack

- [Astro](https://astro.build) (static output) + TypeScript (strict)
- Plain CSS with design tokens (`src/styles/tokens.css`), dark/light theme; rules in `DESIGN.md`, audience in `PRODUCT.md`
- Mona Sans (variable, weight + width) for text, JetBrains Mono for code only
- One small vanilla TypeScript file per interactive widget (`src/scripts/`)
- Playwright + axe-core for tests, GitHub Actions for CI
- Hosting: Cloudflare Pages, deployed by CI only when every test passes

## Run it

```bash
npm install
npx playwright install      # first time only
npm run dev                 # http://localhost:4321
npm test                    # build + all Playwright tests
npm run check               # TypeScript / Astro typecheck
npm run og                  # share images (after npm run build)
```

`npm test` builds the site and serves it on port 4329 for the tests.

## Edit content

All text lives in `src/content/site.json`: intro, status, skills, experience,
projects, plugins, test report and pipeline steps. Change it there; the tiles update.

Long-form content is Markdown:

- `src/content/projects/*.md`: case studies (frontmatter: hook, metrics, stack, links)
- `src/content/writing/*.md`: blog posts (frontmatter: title, excerpt, date, category)

Set `placeholder: false` in a file's frontmatter once its lorem ipsum is replaced; that removes the "Draft" label.

Other data files:

- `src/content/gallery.json`: travel highlights and photos (images in `public/gallery/`, `name.webp` + `name-sm.webp`)
- `src/lib/projects.ts`: each case study's card tone, mock-up and icon (icons in `public/projects/`)
- Plugin icons in `public/plugins/`, company logos in `public/companies/`, the RI logo in `public/brand/`

Regenerate the app icons after changing the logo with `npm run icons`.

## Tests

| File | What it covers |
| --- | --- |
| `tests/smoke.spec.ts` | Every page returns 200, one h1, 404 page, downloads, SEO meta, no console errors |
| `tests/shell.spec.ts` | Theme toggle + persistence, nav state, skip link, ⌘K palette (filter, arrows, Enter, Esc) |
| `tests/widgets.spec.ts` | Terminal replay, Bug Hunt game, portrait switcher, map zoom limits, CI tile, clock, contact links |
| `tests/a11y.spec.ts` | axe WCAG 2.2 AA scan of every page in both themes |
| `tests/about.spec.ts` | Notes window: inner scroll, scroll-spy, hash links, hide sidebars, temporary note, courses, readable without JS |
| `tests/projects.spec.ts` | Projects index, App Store-style case studies, "You might also like", live and code links, company logos |
| `tests/activity.spec.ts` | /activity live cards with mocked `/api/activity`, build stats, unavailable state |
| `tests/gallery.spec.ts` | Highlights play as stories (pause, autoplay), grid opens the viewer, keyboard |
| `tests/content.spec.ts`, `widgets2.spec.ts`, `interactions.spec.ts`, `certificates.spec.ts`, `sound.spec.ts`, `phase4.spec.ts` | Real content, home widgets, ⌘K search, certificates, click sounds, QA/blog/404 pages |
| `tests/writing.spec.ts` | Newest-first order, category filter chips, post page |
| `tests/cv.spec.ts` | All CV sections, PDF download, print layout |
| `tests/qa.spec.ts` | /qa report, live CI and visitor cards (APIs mocked), fallbacks, footer and hero widgets |
| `tests/api.spec.ts` | Unit tests for `/api/ci`, `/api/stats` and `/api/activity` logic with a fake fetch |
| `tests/layout.spec.ts` | No sideways scroll at 320 px on any page; tap targets ≥ 24 px (WCAG 2.2 AA), buttons/standalone links ≥ 36–44 px |
| `tests/seo.spec.ts` | Sitemap, robots.txt, canonical URLs, a 1200×630 share image per page, noindex drafts, headers |
| `tests/visual.spec.ts` | Full-page screenshots, dark + light, desktop + mobile |

Visual baselines are rendered in Playwright's official Docker image, the same one CI uses,
so they match pixel for pixel. On macOS the pixel comparison is skipped automatically.
After an intentional design change, go to **Actions → Update visual snapshots → Run workflow**:
it regenerates the baselines in that image and commits them.

## Deploy and live data (Cloudflare Pages)

CI deploys `main` to Cloudflare Pages, but only after every test passes. The deploy job
rebuilds the site with the fresh QA report, so `/qa` and the home page show the real results of
that run. Until the secrets below exist, the deploy job just prints a notice and skips.

**One-time setup**

1. Create a free Cloudflare account, then create the Pages project from your Mac:
   ```bash
   npx wrangler login
   npx wrangler pages project create rakibul-portfolio --production-branch=main
   ```
2. Create an API token (Cloudflare dashboard → My Profile → API Tokens → Create Token → Custom)
   with **Account · Cloudflare Pages · Edit**. In GitHub → Settings → Secrets and variables → Actions,
   add the secrets `CLOUDFLARE_API_TOKEN` (the token) and `CLOUDFLARE_ACCOUNT_ID` (shown on the
   dashboard's Account home and in its URL).
3. Push to `main`. The site goes live at `https://rakibul-portfolio.pages.dev`.

**Live visitor numbers (optional)**

4. In the Pages project → Metrics, enable **Web Analytics** (cookie-free; Cloudflare adds the script).
5. Create a second API token with **Account · Account Analytics · Read**.
6. In the Pages project → Settings → Variables and Secrets (Production), add:
   - `CF_ANALYTICS_TOKEN` (secret): the token from step 5
   - `CF_ACCOUNT_ID`: your account ID
   - `CF_SITE_TAG`: the Web Analytics site tag (Web Analytics → your site)
   - `GITHUB_TOKEN` (optional secret): a read-only token, raises GitHub's rate limit for `/api/ci`
7. Redeploy. `/api/stats` returns `204` until all three `CF_*` values exist, and the widgets stay hidden.

The analytics query is in `server/stats.ts`. If `/api/stats` returns 502, test the query in
Cloudflare's GraphQL explorer (https://graphql.cloudflare.com) and adjust the field names.

**Endpoints** (`functions/api/`, logic in `server/`, unit-tested in `tests/api.spec.ts`)

| Endpoint | Returns | Cached |
| --- | --- | --- |
| `/api/ci` | Latest CI run on `main`: status, run number, duration, commit, link | 2 min |
| `/api/stats` | Visits today, visits in the last 7 days, countries this week | 5 min |
| `/api/activity` | Everything on /activity: recent visits, latest visitors, countries, Web Vitals, load time by country | 5 min |

To try the functions locally: `npm run build && npx wrangler pages dev dist`.

## SEO and sharing

- **Site address** lives in one place: `SITE` in `astro.config.mjs` (plus the `Sitemap:` line in
  `public/robots.txt`; `tests/seo.spec.ts` fails if they disagree). Canonical URLs, Open Graph
  links and `/sitemap.xml` are built from it.
- **Share images**: `npm run build && npm run og` renders a 1200×630 PNG per page into `public/og/`
  from each page's title and description. CI regenerates them on every push, so deployed images
  always match the text; run it locally after changing titles if you want the committed copies fresh.
- **Drafts**: writing posts with `placeholder: true` get `noindex` and stay out of the sitemap.
- **Headers**: `public/_headers` sets security headers and long caching for hashed assets on Cloudflare.

To preview how a link looks when shared, paste the URL into
LinkedIn's Post Inspector (https://www.linkedin.com/post-inspector/).

## Custom domain

1. Buy a domain (any registrar; Cloudflare Registrar sells at cost).
2. Cloudflare dashboard → Workers & Pages → `rakibul-portfolio` → Custom domains → Set up a domain.
   Follow its DNS steps; HTTPS is automatic.
3. Change `SITE` in `astro.config.mjs` and the `Sitemap:` line in `public/robots.txt` to the new
   address, then push. The `.pages.dev` address keeps working.

## QA report

`npm run qa:report` turns `reports/results.json` (written by every `npm test`) plus Lighthouse
runs against `dist/` into `src/data/qa-report.json`, which `/qa` renders. The committed file is
sample data from a local run (`"sample": true`); CI replaces it before deploying.

**Lighthouse budgets** (mobile, set in `scripts/qa-report.mjs`): Performance ≥ 90, Accessibility ≥ 95,
Best practices ≥ 95, SEO ≥ 95. A measured page below budget fails CI, so nothing slower ships.
If Lighthouse itself crashes on a page, that's a warning, not a failure.

## Project structure

```
src/
  components/      Nav, CommandPalette, Footer, Tile, AppIcon, TechIcon, ProjectIcon, CompanyLogo, IMessage
  components/tiles/ one component per bento tile
  components/mockups/ drawn project previews
  content/site.json all copy and data
  content/gallery.json travel photos and highlights
  lib/             brands + tech logos, project looks, Find My map, formatting
  layouts/         BaseLayout (SEO, theme script)
  content/projects/ case studies (Markdown)
  content/writing/ blog posts (Markdown)
  pages/           routes
  scripts/         page and widget logic (theme, sound, palette, notes, rearrange, activity, gallery, visit…)
  styles/          tokens.css, global.css, prose.css
  data/qa-report.json  data for /qa (sample until CI regenerates it)
functions/api/     Cloudflare Pages Functions (thin wrappers)
server/            endpoint logic, unit-testable without Cloudflare
scripts/qa-report.mjs  builds the QA report and checks Lighthouse budgets
scripts/og-images.mjs  renders share images into public/og/
scripts/build-info.mjs writes dist/activity/build.json after every build
scripts/icons.mjs      app icons from the logo (npm run icons)
scripts/geo-data.mjs   globe dots for /activity (npm run geo, one-off)
tests/             Playwright specs
```

## Roadmap

- [x] Phase 1: foundation (Astro, tokens, theme, CI)
- [x] Phase 2: shell (nav, ⌘K palette, footer)
- [x] Phase 3: bento home with static tiles
- [x] Phase 4: interactive tiles with tests
- [x] Phase 5: About, Projects, Writing, CV pages
- [x] Phase 6: Cloudflare Pages Functions (`/api/stats`, `/api/ci`), live `/qa` dashboard, deploy only when green
- [x] Phase 7: correct site URL, sitemap, share images, Lighthouse budgets, security headers, custom-domain guide
- [x] v2 design pass: Mona Sans, PRODUCT.md + DESIGN.md, hero with live terminal, named-area bento,
      no kickers/rings/nested cards, 44 px tap targets, 320 px layout test, app icons + manifest
- [x] v2 content: real photo, LinkedIn, case-study write-ups, Medium post, certificates, WordPress.org
- [x] v2.5 extras: drag-to-rearrange tiles, click sounds, Notes About page, App Store project pages,
      Spotlight search, Activity page, Gallery with story highlights, Europass CV
- [ ] Next: project screenshots, more posts, custom domain
