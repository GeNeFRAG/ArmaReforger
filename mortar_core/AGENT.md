# mortar_core — Agent Guide

Ballistic calculator for Arma Reforger mortars, howitzers, and MLRS. Live at **armamortars.org**. Pure vanilla JavaScript (zero production dependencies), served by Nginx in Docker. For sibling projects (maps_core, server_tools) see `/workspace/AGENT.md`.

## Run & test

All commands run from `mortar_core/`:

```bash
# Start the app (Nginx on localhost:3000)
npm run docker:up

# Validate ballistic-data.json parses without errors
npm run validate:data

# Smoke-test the calculation engine without Docker
npm run engine:demo

# Run e2e tests (single browser, fast)
npm run test:e2e:chromium

# Run a single spec
npx playwright test tests/e2e/calculation.spec.js --project=chromium

# Run tests matching a name pattern
npx playwright test -g "2B14" --project=chromium

# Run against all five browsers
npm run test:e2e

# Stop the app
npm run docker:down
```

## Code map

| File | Role | Edit when… |
|------|------|-----------|
| `ballistic-data.json` | Weapon data — the only source of truth for weapons | adding / editing a weapon |
| `BallisticCalculator.js` | Framework-agnostic engine (~46KB, 6 sections) | changing ballistic math or engine API |
| `ui_js/main.js` | App bootstrap; wires all modules via `setDependencies()` | adding a new UI module or changing init order |
| `ui_js/calculator.js` | Calculation UI and mission card rendering | changing how fire solutions are displayed |
| `ui_js/ui.js` | DOM event wiring and validation | changing input handling, validation rules |
| `ui_js/corrections.js` | Add/Drop / Left-Right fire correction UI | changing correction logic |
| `ui_js/ffe.js` | Fire for Effect pattern widget | changing FFE patterns |
| `ui_js/history.js` | localStorage-backed mission history | changing history behavior |
| `ui_js/share.js` | Base64 URL session sharing | changing share-link format |
| `ui_js/coord-manager.js` | Grid/meters parse + validate | changing coordinate handling |
| `ui_js/state.js` | Centralized app state (replaces `window.*`) | adding cross-module state |
| `ui_js/dom-cache.js` | `getElementById` cache | (rarely edited) |
| `ui_js/constants.js` | INPUT_IDS, COLORS, BTN_STYLES, SHARE_CONSTANTS | adding new DOM IDs or shared constants |
| `ui_js/utils.js` | Pure helpers: debounce, setDisplay, formatPositionDisplay | adding generic utilities |
| `ui_js/onboarding.js` | First-visit overlay | changing onboarding UX |
| `sw.js` | Service worker — versioned cache-first PWA offline support | updating cache strategy or bumping `CACHE_VERSION` on release |
| `manifest.webmanifest` | PWA manifest for browser install prompts | changing app name, theme, or icons |
| `index.html` | App shell — static HTML + `<script type="module">` | adding DOM structure |
| `styles.css` | All styles (~27KB) | changing appearance |
| `tests/e2e/` | Playwright tests (13 specs) | adding tests |
| `examples/` | Node.js usage examples | updating engine usage examples |
| `BallisticCalculator-API.md` | Engine API reference | (auto-update if engine API changes) |
| `schemas/ballistic-data.schema.json` | JSON Schema for ballistic-data.json | adding new weapon fields |

## Module dependency contract

`main.js` is the **only** place that wires UI modules. Each module exports a `setDependencies(deps)` function that receives its required collaborators; this breaks circular imports and makes the dependency graph explicit.

```
main.js
  ├─ loads BallisticCalculator.loadBallisticData()
  ├─ calls setDependencies() on: calculator, corrections, ffe, history, share
  └─ calls updateWeaponSystems() to populate the dropdown from getAllWeaponSystems()
```

**The DOM is the source of truth for UI state. Do not introduce a state framework or virtual DOM.**

## Conventions

- Vanilla ES6 modules — no bundler, no transpiler, no framework
- No production dependencies (`devDependencies` has only `@playwright/test`)
- NATO weapons use **6400 mils/circle** (milsPerDegree ≈ 17.7778)
- Warsaw Pact weapons use **6000 mils/circle** (milsPerDegree ≈ 16.6667)
- Fire corrections (GT/OT line) and FFE patterns work for all weapon systems (mortars, howitzers, MLRS). Height correction is the only mortar-only feature.
- Grid coordinates: 3-digit = 100m precision, 4-digit = 10m precision — `coord-manager.js` is the single parse/validate source
- Weapon data is fully JSON-driven — **never hardcode a weapon ID or name in JS or HTML**
- The `systemType` field (`mortar` / `howitzer` / `mlrs`) in `ballistic-data.json` is what the engine and UI branch on
- On every release, bump `CACHE_VERSION` in `sw.js` (e.g. `'v2.14.0'`) alongside the version strings in `package.json` and `index.html` — this evicts the old SW cache and forces clients to re-download updated assets

## Common tasks

| Task | Doc |
|------|-----|
| Add a new weapon system | [docs/ADDING_A_WEAPON.md](docs/ADDING_A_WEAPON.md) |
| Add a new e2e test | [docs/ADDING_A_TEST.md](docs/ADDING_A_TEST.md) |
| Architecture & data flow | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Contribution checklist | [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) |

## Gotchas

- `android/`, `ios/`, `www/` are Capacitor mobile build outputs. They are **not** kept in sync with web changes — ignore them unless explicitly working on mobile.
- `legacy/Arma Reforger Mortar Calc.ods` is a reference spreadsheet only. It is not used by the app.
- `playwright-report/` and `test-results/` are gitignored test artifacts. Don't edit them.
- The Docker container serves files directly from the `mortar_core/` directory (see `docker-compose.yml`). There is no build step — changes to `.js` / `.css` / `.html` are live after a browser refresh.
- `BallisticCalculator.js` exports two surfaces: a `module.exports = { … }` object for Node.js and a `window.BallisticCalculator = { … }` assignment for browsers. They are populated at the bottom of the file.
