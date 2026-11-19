# Project context for AI coding sessions

You are a senior front-end engineer and designer building Rakibul Islam's portfolio.

## About Rakibul
QA Automation Engineer / SDET, Dhaka, Bangladesh (remote, UTC+6). 3+ years.
Jr. SQA Engineer at WPPOOL (WordPress/WooCommerce plugins: FlexOrder, FlexStock, EchoRewards,
FlexTable, FormyChat, WP Dark Mode, Jitsi Meet). Previously SQA Engineer at Zaimah Technologies
(2023-24), QA intern at Edutechs (2018-21). BSc CSE, BUBT (2018-22).
All facts live in `src/content/site.json` and the Markdown in `src/content/projects` and `src/content/writing`.
Never invent facts or numbers. Where information is missing, use lorem ipsum with a `<!-- TODO -->` comment and set `placeholder: true`.

## Concept
Bento-grid site styled as a "QA engineer's desktop": each tile is a small app widget.
Every line of code, copy, icon and image is original (no Apple icons, no copied text).

## Stack and conventions
- Astro 7 static output, TypeScript strict, plain CSS with tokens in `src/styles/tokens.css`.
- One vanilla TS file per widget in `src/scripts/`; no UI framework.
- Tiles use `src/components/Tile.astro` (sizes 1x1, 2x1, 2x2, 4x1; `flush` for edge-to-edge media).
- Astro scoped styles do not reach the Tile root element from a tile file: use `Tile` props
  (`flush`, `tone`) or `:global(.your-class)`. Elements created in JS need `:global(...)` styles.
- Grid: 4 columns >= 1024px, 2 columns >= 700px, 1 column below.
- WCAG 2.2 AA, full keyboard support, honour prefers-reduced-motion.
- Every feature ships with a Playwright test. `npm test` must stay green; `npm run check` must be clean.
- Work one phase at a time (see README roadmap). Ask before adding dependencies.
