# Design system: "The QA engineer's desktop"

## Overview
A bento of small app windows, each showing a tool a tester lives in (terminal, test report, CI run).
Calm, precise, quietly technical. Dark and light are equal citizens; the visitor's system decides.
One accent, green, means one thing: **passing**. It also marks the main action.

## Colors (tokens in `src/styles/tokens.css`)
| Role | Dark | Light | Use |
| --- | --- | --- | --- |
| `--bg` | #0e0e10 | #f2f2f5 | Page |
| `--tile` | #1a1a1d | #ffffff | Tiles, windows |
| `--card` | #26262b | #f5f5f7 | Rows and controls inside a tile (never a second card) |
| `--text` | #f2f2f4 | #111113 | Headings, key text |
| `--body-text` | #c6c6ce | #45454d | Paragraphs |
| `--muted` | #9d9da6 | #6b6b73 | Meta, labels (≥ 4.5:1 on tile) |
| `--pass` | #2fd08a | #0a7a4b | Passing states, main action accents, focus caret |
| `--fail` | #ff453a | #e5342a | Failing states only |
| `--link` | #0a84ff | #0066d6 | Links, focus ring |
No violet. No gradient text. Browser surfaces (selection, scrollbar, caret) use these tokens.

## Typography
- **Mona Sans Variable** for everything; headings at `font-stretch: 108%`, weight 600, `text-wrap: balance`.
- **JetBrains Mono** only for real code, commands and file names.
- Scale: hero 36–60 px · page h1 36–56 px · h2 22–32 px · body 16–17 px · meta 13–14 px · **floor 12 px**.
- Tracking: headings -0.02 to -0.035em; never tighter than -0.04em.

## Layout
- Container 1040 px; 4-column bento ≥ 1024 px, 2 columns ≥ 700 px, 1 below. Gap 16 px.
- Home uses named grid areas so rows always close; tiles size to content (min 248 px rows).
- Tile padding 28 px; radius 28 px; inner rows radius 12 px.

## Elevation
- Tiles: 1 px inset edge, no shadow. Floating UI (nav, palette, menus): soft offset shadow + glass.

## Components and rules
- **Tile header:** app icon + app name (sentence case, muted). Not a kicker.
- **One container level.** Inside a tile use dividers and spacing, never a nested card.
- **No kickers** (small uppercase label above a heading), no section numbers, no progress rings or
  hero-metric blocks standing in for content: show the real artefact (report rows, run log, prose result).
- **Buttons:** pill; primary = solid text colour; secondary = card + outline. Labels are verb + object.
- **Tap targets ≥ 44 px** for every standalone control or link (`.tap` utility).

## Motion
- One authored moment per page: the terminal test run on Home. Everything else stays still
  except hover/press feedback (lift 2 px, scale 0.97 press).
- Ease: arrive `cubic-bezier(.2,.9,.3,1)`, travel `cubic-bezier(.45,0,.2,1)`.
- `prefers-reduced-motion`: the run shows its final state; nothing is hidden.

## Do / Don't
- Do show real work: screenshots, report output, code excerpts.
- Do keep copy plain and specific; numbers only from real sources.
- Don't add a card, label or animation that carries no information.
