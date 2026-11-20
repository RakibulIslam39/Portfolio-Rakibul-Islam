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
  - { label: Source code, url: 'https://github.com/RakibulIslam39/FlexOrder-e2e-Automation-with-CI-CD' }
---

## The problem

FlexOrder keeps WooCommerce orders and stock in sync with a Google Sheet, in both directions. A bug here is quiet and expensive: an order marked "completed" in the sheet that never changes in the store looks fine on screen until a customer complains.

Before this project, every release was checked by hand. That meant clicking through the setup wizard, changing order statuses and comparing the sheet with the store row by row.

## What I built

- **A reusable Playwright framework in TypeScript** using the Page Object Model. UI work lives in page objects; the Google Sheets and WooCommerce integrations live in separate service classes, shared through fixtures.
- **API-level checks alongside the UI tests.** The suite talks to the WooCommerce REST API and the Google Sheets API to verify that orders match on both sides, not just that the screen looks right.
- **A disposable test environment.** Each run starts a fresh WordPress + WooCommerce stack in Docker, installs the plugins with WP-CLI and generates its own API keys, so results never depend on leftover data.
- **A zero-touch pipeline.** Every push to the plugin repos sends a `repository_dispatch` event. GitHub Actions provisions the environment, installs the exact pushed build and runs the suite before release.

## How it's structured

The run order is enforced with Playwright project dependencies rather than file-name tricks:

1. **auth-setup** logs in once and saves the session, so later tests skip the login screen.
2. **plugin-setup** completes the FlexOrder setup wizard: credentials and the Google Sheet connection.
3. **e2e** covers fetching, updating and bulk-updating order statuses through the sheet, plus the Ultimate (Pro) display, sorting and filtering settings.

Tests run in sequence on purpose. They share one database and one Google Sheet, and the status-sync spec chains state from one test to the next.

## The result

- 38 end-to-end scenarios across setup, WooCommerce order management and Google Sheets synchronization.
- 100% pass rate on the release build, and no more manual regression passes.
- Every plugin commit is tested automatically. HTML, JUnit and JSON reports, screenshots and videos are kept with each run, and a custom reporter flags flaky tests.
