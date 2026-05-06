# Adding a New E2E Test

All tests are Playwright e2e tests in `tests/e2e/`. There are no unit tests — the engine is validated through integration.

## Infrastructure at a glance

| File | Role |
|------|------|
| `tests/e2e/pages/CalculatorPage.js` | Page Object Model — all page interactions |
| `tests/e2e/fixtures/test-data.js` | `WEAPONS`, `VALID_COORDS`, `INVALID_COORDS`, `EXPECTED_RESULTS`, `CORRECTION_VALUES`, `FFE_PATTERNS` |
| `tests/e2e/utils/helpers.js` | `waitForSolution()`, `waitForCalculation()`, `parseSolutionValues()`, `assertInRange()`, `formatGridCoord()`, `waitForAppReady()` |
| `tests/e2e/*.spec.js` | One spec file per feature area |

## Pattern: add a test to an existing spec

1. **Import what you need** (already done at the top of each spec):
   ```js
   import { test, expect } from '@playwright/test';
   import { CalculatorPage } from './pages/CalculatorPage.js';
   import { VALID_COORDS, EXPECTED_RESULTS } from './fixtures/test-data.js';
   import { waitForSolution, parseSolutionValues, assertInRange } from './utils/helpers.js';
   ```

2. **Add test data** to `test-data.js` if needed (new weapon, new coordinate pair, new expected result).

3. **Write the test** following the existing style:
   ```js
   test('should calculate correct solution for M252', async ({ page }) => {
     const calc = new CalculatorPage(page);
     await calc.goto();

     const coords = VALID_COORDS.mortar_short;
     await calc.setCoordinates(coords.gun, coords.target);
     await calc.selectWeapon('M252');
     await calc.calculate();

     await waitForSolution(page);
     const solution = await parseSolutionValues(page);

     const expected = EXPECTED_RESULTS.M252_short;
     assertInRange(solution.elevation, expected.elevation.min, expected.elevation.max, 'elevation');
     assertInRange(solution.azimuth, expected.azimuth.min, expected.azimuth.max, 'azimuth');
   });
   ```

## Pattern: add a new spec file

Create `tests/e2e/my-feature.spec.js`. Follow the same header, `test.describe`, `test.beforeEach` setup as existing specs. Re-use fixtures and helpers; don't duplicate assertion logic.

## Running tests

```bash
# Fast: single browser
npm run test:e2e:chromium

# Single spec, single browser
npx playwright test tests/e2e/my-feature.spec.js --project=chromium

# By name pattern
npx playwright test -g "my test name" --project=chromium

# Full matrix (Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari)
npm run test:e2e

# Interactive UI
npm run test:e2e:ui
```

Docker must be running (`npm run docker:up`) before tests execute — `test:e2e` starts and stops it automatically, but the individual commands do not.

## Adding expected results

When adding a calculation test, derive expected values by running the engine directly:

```bash
npm run engine:demo
```

Then edit `examples/node-example.js` with your weapon/coordinates and capture the output. Use `assertInRange` with a ±5 tolerance to account for floating-point and grid-center rounding.
