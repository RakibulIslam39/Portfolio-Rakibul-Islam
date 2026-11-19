---
title: FlexOrder E2E Automation
hook: 38 scenarios. 100% pass rate.
summary: A Playwright + TypeScript framework with a Dockerized WordPress environment and a GitHub Actions pipeline that tests every plugin commit automatically.
order: 1
role: QA Automation Engineer
period: WPPOOL · 2024 – now
context: FlexOrder syncs WooCommerce orders and stock with Google Sheets, in both directions.
stack: [Playwright, TypeScript, Page Object Model, Docker, GitHub Actions, WooCommerce REST API, Google Sheets API]
metrics:
  - { value: '38', label: E2E scenarios automated }
  - { value: '100%', label: pass rate }
  - { value: '0', label: manual regression runs per release }
links:
  - { label: GitHub profile, url: 'https://github.com/RakibulIslam39' }
placeholder: true
---

## The problem

FlexOrder keeps WooCommerce orders and stock in sync with a Google Sheet, in both directions. Before automation, regression testing for each release was manual.

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. <!-- TODO: add a sentence on how long a manual regression pass used to take. -->

## What I built

- **A reusable Playwright framework in TypeScript** using the Page Object Model, so setup, order and sync flows share the same building blocks.
- **API-level checks alongside the UI tests.** The suite talks to the WooCommerce REST API and the Google Sheets API to verify that orders and stock match on both sides, not just that the screen looks right.
- **A Dockerized test environment.** Each run starts a fresh WordPress + WooCommerce install, so results never depend on leftover data.
- **A zero-touch pipeline.** Every plugin commit fires a `repository_dispatch` event; GitHub Actions provisions the environment, installs the exact pushed build and runs the suite before release.

## The result

- 38 end-to-end scenarios across setup, WooCommerce order management and Google Sheets synchronization.
- 100% pass rate on the release build, and no more manual regression passes.
- Every plugin commit is tested automatically before release.

Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. <!-- TODO: add a real bug the suite caught before release. -->

## What I'd do next

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. <!-- TODO -->
