# AGENT.md

This file provides guidance to AI coding agents when working with code in this repository.

## Project Overview

This repository contains independent tools for Arma Reforger:

- **mortar_core/** - The armamortars.org web app (live at armamortars.org). Pure vanilla JavaScript ballistic mission planner (zero production dependencies) with a framework-agnostic calculation engine (`BallisticCalculator.js`) and an ES6 module-based UI (`ui_js/`). Served via Nginx in Docker.
- **maps_core/** - Map metadata (`all_arma_maps.json` for 23 maps) and elevation data (`height_data/`). Includes a Python tile generator and JS map viewer.
- **server_tools/** - Python scripts for Arma Reforger server management (mod extraction, server comparison, config cloning). Requires `requests` and `beautifulsoup4`.

These are separate, independent tools that happen to live in the same repo.

## Build & Test Commands

All commands run from `mortar_core/`:

```bash
# Start the Docker dev server (Nginx on port 3000)
npm run docker:up

# Stop the Docker dev server
npm run docker:down

# Run all e2e tests (starts Docker, runs tests, stops Docker)
npm run test:e2e

# Run tests with visible browser
npm run test:e2e:headed

# Run tests in Playwright interactive UI (does NOT auto-stop Docker)
npm run test:e2e:ui

# Run tests for a single browser only
npm run test:e2e:chromium

# Run a single test file
npx playwright test tests/e2e/calculation.spec.js --project=chromium

# Run tests matching a name pattern
npx playwright test -g "pattern" --project=chromium

# Alternative test runner with more options
./scripts/run-e2e-tests.sh [--headed] [--ui] [--project <name>] [--debug]
```

## Architecture

### mortar_core

**BallisticCalculator.js** is the core engine (~46KB). It is framework-agnostic (works in Node.js and browsers) and handles all ballistic math: distance/bearing calculation, charge selection, elevation/azimuth computation, fire corrections (Gun-Target and Observer-Target line), and FFE pattern generation. Weapon data is loaded from **ballistic-data.json** at runtime.

**Supported weapon systems:**
- Mortars: M252 (US 81mm, NATO 6400 mils), 2B14 (Soviet 82mm, Warsaw Pact 6000 mils)
- Howitzers: M119 (US 105mm), D-30 (Soviet 122mm) - each with High Angle and Low Angle
- MLRS: BM-21 Grad variants (SH, Integrity), Type-63 - range-based auto projectile selection

**UI modules** (`ui_js/`) follow single-responsibility separation:
- `main.js` - App init and module coordination
- `calculator.js` - Calculation UI and result display
- `corrections.js` - Fire correction system
- `ffe.js` - Fire for Effect patterns
- `history.js` - Mission history (localStorage persistence)
- `share.js` - URL-based session sharing (Base64-encoded compact JSON)
- `coord-manager.js` - Grid/meter coordinate handling (3-digit and 4-digit grids)
- `state.js` - Global calculation state
- `dom-cache.js` - DOM element caching
- `ui.js` - UI helpers and validation
- `constants.js` / `utils.js` - Shared constants and utilities

The DOM is the source of truth for UI state. No virtual DOM or framework abstractions.

### Test Infrastructure

Playwright e2e tests in `mortar_core/tests/e2e/` with 10 spec files covering calculations, corrections, FFE, history, sharing, coordinate input, weapon selection, mobile viewports, styles, and web vitals.

- **Page Object Model**: `pages/CalculatorPage.js` encapsulates all page interactions
- **Test data**: `fixtures/test-data.js` with coordinates and expected results
- **Test helpers**: `utils/helpers.js` for common assertions
- **Browser matrix**: Chromium, Firefox, WebKit, Mobile Chrome (Pixel 5), Mobile Safari (iPhone 12)
- **Docker required**: Tests run against the Nginx container on `localhost:3000`

## Key Conventions

- Pure vanilla JavaScript with ES6 modules - no frameworks, no bundler, no transpiler
- Weapon systems are data-driven via `ballistic-data.json`, not hardcoded
- Mil systems differ by faction: NATO uses 6400 mils, Warsaw Pact uses 6000 mils
- Grid coordinates support both 3-digit (100m precision) and 4-digit (10m precision) formats
- The `ballistic-data.json` structure distinguishes weapon categories (mortars vs howitzers vs MLRS) which affects available features (corrections and FFE are mortar-only)
