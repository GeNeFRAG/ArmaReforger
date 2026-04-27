/**
 * E2E Tests for dead-click feedback improvements
 * Covers: toggle button accessibility, data preservation on mode switch,
 * and disabled-button status hints.
 */

import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { VALID_COORDS } from './fixtures/test-data.js';

/**
 * Append a single character to a field that already has a valid value.
 * This mirrors how a user edits an existing coord — caret at end, then type.
 */
async function appendChar(page, fieldId, char) {
    await page.locator(`#${fieldId}`).focus();
    await page.keyboard.press('End');
    await page.keyboard.type(char);
}

test.describe('Stale-result hint', () => {
  let page;
  let calculator;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    calculator = new CalculatorPage(page);
    await calculator.goto();
  });

  test('hint is hidden before first compute', async () => {
    await page.locator('#mortarGridX').fill(VALID_COORDS.mortar_short.gun.gridX);
    await expect(page.locator('#resultStaleNotice')).toHaveClass(/cls-hidden/);
  });

  // Parametrized: test the real-world append-char flow on each of the 4 grid fields.
  // Previously the test only covered #mortarGridX with a select-all-replace that
  // never produced transient intermediate lengths the real bug path goes through.
  for (const fieldId of ['mortarGridX', 'mortarGridY', 'targetGridX', 'targetGridY']) {
    test(`hint appears when ${fieldId} is appended-to after a successful result`, async () => {
      await calculator.enterGridCoords(
        VALID_COORDS.mortar_short.gun,
        VALID_COORDS.mortar_short.target
      );
      await calculator.calculate();
      await expect(page.locator('#output')).toHaveClass(/success/);
      await expect(page.locator('#resultStaleNotice')).toHaveClass(/cls-hidden/);

      // Append one char — the field transitions from a valid 3-digit value to
      // 4 digits. Mixed 3/4-digit grids are valid (each parsed independently).
      await appendChar(page, fieldId, '0');

      // Wait past the 500ms validation debounce.
      await page.waitForTimeout(650);

      // Card must stay visible and show the stale hint.
      await expect(page.locator('#output')).toHaveClass(/active/);
      await expect(page.locator('#output')).toHaveClass(/success/);
      await expect(page.locator('#output')).toHaveClass(/stale/);
      await expect(page.locator('#resultStaleNotice')).not.toHaveClass(/cls-hidden/);

      // Button must reflect stale state.
      await expect(page.locator('#calculate')).toHaveClass(/stale-btn/);
      await expect(page.locator('#calculate')).toHaveText('Recalculate Fire Mission');
    });
  }

  test('hint clears after recompute', async () => {
    await calculator.enterGridCoords(
      VALID_COORDS.mortar_short.gun,
      VALID_COORDS.mortar_short.target
    );
    await calculator.calculate();

    await appendChar(page, 'mortarGridX', '0');
    await page.waitForTimeout(650);
    await expect(page.locator('#output')).toHaveClass(/active/);
    await expect(page.locator('#resultStaleNotice')).not.toHaveClass(/cls-hidden/);

    // Restore the original valid coords and recompute.
    await calculator.enterGridCoords(
      VALID_COORDS.mortar_short.gun,
      VALID_COORDS.mortar_short.target
    );
    await calculator.calculate();

    await expect(page.locator('#resultStaleNotice')).toHaveClass(/cls-hidden/);
    await expect(page.locator('#output')).not.toHaveClass(/stale/);
    await expect(page.locator('#output')).toHaveClass(/active/);

    // Button must revert to normal state.
    await expect(page.locator('#calculate')).not.toHaveClass(/stale-btn/);
    await expect(page.locator('#calculate')).toHaveText('Compute Fire Mission');
  });

  test('stale state shows red styling on button and card border', async () => {
    await calculator.enterGridCoords(
      VALID_COORDS.mortar_short.gun,
      VALID_COORDS.mortar_short.target
    );
    await calculator.calculate();
    await expect(page.locator('#output')).toHaveClass(/success/);

    // Trigger stale with a valid coord change (replace, not append, to keep 3-digit format)
    await page.locator('#targetGridX').fill('070');
    await page.waitForTimeout(650);

    // Button turns red with recalculate text
    await expect(page.locator('#calculate')).toHaveClass(/stale-btn/);
    await expect(page.locator('#calculate')).toHaveText('Recalculate Fire Mission');

    // Card border turns red (stale class present)
    await expect(page.locator('#output')).toHaveClass(/stale/);

    // Stale notice is visible
    await expect(page.locator('#resultStaleNotice')).toBeVisible();
    await expect(page.locator('#resultStaleNotice')).not.toHaveClass(/cls-hidden/);
  });

  test('observer field edits do NOT mark the result stale', async () => {
    await calculator.enterGridCoords(
      VALID_COORDS.mortar_short.gun,
      VALID_COORDS.mortar_short.target
    );
    await calculator.calculate();
    await expect(page.locator('#output')).toHaveClass(/success/);

    // Enable FO mode so observer fields are visible.
    await page.locator('#foEnabled').check();
    await page.locator('#observerGridX').fill('060');

    await expect(page.locator('#resultStaleNotice')).toHaveClass(/cls-hidden/);
    await expect(page.locator('#output')).not.toHaveClass(/stale/);
  });

  test('weapon change clears output and hides stale notice', async () => {
    await calculator.enterGridCoords(
      VALID_COORDS.mortar_short.gun,
      VALID_COORDS.mortar_short.target
    );
    await calculator.calculate();
    await expect(page.locator('#output')).toHaveClass(/success/);

    await calculator.selectWeapon('2B14');

    await expect(page.locator('#resultStaleNotice')).toHaveClass(/cls-hidden/);
    await expect(page.locator('#output')).not.toHaveClass(/success/);
  });

  test('stale + out of range shows disabled recalculate button with stale card', async () => {
    // Calculate with valid coords first
    await calculator.enterGridCoords(
      VALID_COORDS.mortar_short.gun,
      VALID_COORDS.mortar_short.target
    );
    await calculator.calculate();
    await expect(page.locator('#output')).toHaveClass(/success/);

    // Move target out of range to trigger stale + invalid
    await page.locator('#targetGridX').fill('999');
    await page.locator('#targetGridY').fill('999');
    await page.waitForTimeout(650);

    // Card stays visible with stale class
    await expect(page.locator('#output')).toHaveClass(/active/);
    await expect(page.locator('#output')).toHaveClass(/stale/);

    // Stale notice visible
    await expect(page.locator('#resultStaleNotice')).not.toHaveClass(/cls-hidden/);

    // Button is disabled with recalculate text but no red styling
    await expect(page.locator('#calculate')).toBeDisabled();
    await expect(page.locator('#calculate')).toHaveText('Recalculate Fire Mission');
    await expect(page.locator('#calculate')).not.toHaveClass(/stale-btn/);
  });

  test('complete UI state lifecycle from fresh to recalculate', async () => {
    // State 1: Fresh — no calc yet
    await expect(page.locator('#calculate')).toBeDisabled();
    await expect(page.locator('#calculate')).toHaveText('Compute Fire Mission');
    await expect(page.locator('#calculate')).not.toHaveClass(/stale-btn/);
    await expect(page.locator('#output')).not.toHaveClass(/active/);

    // State 2: Valid coords, ready
    await calculator.enterGridCoords(
      VALID_COORDS.mortar_short.gun,
      VALID_COORDS.mortar_short.target
    );
    await page.waitForTimeout(650);
    await expect(page.locator('#calculate')).toBeEnabled();
    await expect(page.locator('#calculate')).toHaveText('Compute Fire Mission');
    await expect(page.locator('#calculate')).not.toHaveClass(/stale-btn/);
    await expect(page.locator('#output')).not.toHaveClass(/active/);

    // State 3: After calculation
    await calculator.calculate();
    await expect(page.locator('#calculate')).toBeEnabled();
    await expect(page.locator('#calculate')).toHaveText('Compute Fire Mission');
    await expect(page.locator('#calculate')).not.toHaveClass(/stale-btn/);
    await expect(page.locator('#output')).toHaveClass(/active/);
    await expect(page.locator('#output')).toHaveClass(/success/);
    await expect(page.locator('#output')).not.toHaveClass(/stale/);
    await expect(page.locator('#resultStaleNotice')).toHaveClass(/cls-hidden/);

    // State 4: Stale + in range (replace with valid 3-digit coord)
    await page.locator('#targetGridX').fill('070');
    await page.waitForTimeout(650);
    await expect(page.locator('#calculate')).toBeEnabled();
    await expect(page.locator('#calculate')).toHaveText('Recalculate Fire Mission');
    await expect(page.locator('#calculate')).toHaveClass(/stale-btn/);
    await expect(page.locator('#output')).toHaveClass(/active/);
    await expect(page.locator('#output')).toHaveClass(/success/);
    await expect(page.locator('#output')).toHaveClass(/stale/);
    await expect(page.locator('#resultStaleNotice')).not.toHaveClass(/cls-hidden/);

    // State 6: After recalculation
    await calculator.calculate();
    await expect(page.locator('#calculate')).toBeEnabled();
    await expect(page.locator('#calculate')).toHaveText('Compute Fire Mission');
    await expect(page.locator('#calculate')).not.toHaveClass(/stale-btn/);
    await expect(page.locator('#output')).toHaveClass(/active/);
    await expect(page.locator('#output')).toHaveClass(/success/);
    await expect(page.locator('#output')).not.toHaveClass(/stale/);
    await expect(page.locator('#resultStaleNotice')).toHaveClass(/cls-hidden/);
  });
});

test.describe('Feedback on dead clicks', () => {
  let page;
  let calculator;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    calculator = new CalculatorPage(page);
    await calculator.goto();
  });

  test.describe('Coordinate mode toggle accessibility', () => {
    test('toggle options are button elements', async () => {
      const gridToggle = page.locator('#toggleGrid');
      const metersToggle = page.locator('#toggleMeters');
      await expect(gridToggle).toHaveAttribute('type', 'button');
      await expect(metersToggle).toHaveAttribute('type', 'button');
    });

    test('grid toggle has aria-pressed=true initially', async () => {
      await expect(page.locator('#toggleGrid')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#toggleMeters')).toHaveAttribute('aria-pressed', 'false');
    });

    test('aria-pressed updates when switching to meters', async () => {
      await calculator.toggleToMetersMode();
      await expect(page.locator('#toggleGrid')).toHaveAttribute('aria-pressed', 'false');
      await expect(page.locator('#toggleMeters')).toHaveAttribute('aria-pressed', 'true');
    });

    test('aria-pressed updates when switching back to grid', async () => {
      await calculator.toggleToMetersMode();
      await calculator.toggleToGridMode();
      await expect(page.locator('#toggleGrid')).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#toggleMeters')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  test.describe('Data preservation on mode switch', () => {
    test('grid coordinates are preserved when switching to meters and back', async () => {
      const gridX = VALID_COORDS.mortar_short.gun.gridX;
      const gridY = VALID_COORDS.mortar_short.gun.gridY;
      await page.locator('#mortarGridX').fill(gridX);
      await page.locator('#mortarGridY').fill(gridY);

      await calculator.toggleToMetersMode();
      await calculator.toggleToGridMode();

      await expect(page.locator('#mortarGridX')).toHaveValue(gridX);
      await expect(page.locator('#mortarGridY')).toHaveValue(gridY);
    });

    test('meter coordinates are preserved when switching to grid and back', async () => {
      await calculator.toggleToMetersMode();
      await page.locator('#mortarX').fill('5000');
      await page.locator('#mortarY').fill('8000');

      await calculator.toggleToGridMode();
      await calculator.toggleToMetersMode();

      await expect(page.locator('#mortarX')).toHaveValue('5000');
      await expect(page.locator('#mortarY')).toHaveValue('8000');
    });
  });

  test.describe('Disabled-button status hints', () => {
    test('clicking disabled Calculate shows status message', async () => {
      // Calculate button starts disabled; click the wrapper
      await expect(page.locator('#calculate')).toBeDisabled();
      await page.locator('#calculateWrapper').click();
      const status = page.locator('#formStatus');
      await expect(status).not.toHaveClass(/form-status-hidden/);
      await expect(status).not.toBeEmpty();
    });

    test('status message mentions missing coordinates', async () => {
      await page.locator('#calculateWrapper').click();
      const statusText = await page.locator('#formStatus').textContent();
      expect(statusText.toLowerCase()).toMatch(/coordinates|fields/);
    });

    test('clicking disabled Apply Correction shows status message', async () => {
      // Widget is hidden until a fire mission is computed — reveal it first
      await calculator.enterGridCoords(
        VALID_COORDS.mortar_short.gun,
        VALID_COORDS.mortar_short.target
      );
      await calculator.calculate();
      await page.locator('#fireCorrectionWidget').waitFor({ state: 'visible' });

      // Button is still disabled (no correction values entered yet)
      await expect(page.locator('#applyCorrection')).toBeDisabled();
      await page.locator('#applyCorrectionWrapper').click();
      const status = page.locator('#formStatus');
      await expect(status).not.toHaveClass(/form-status-hidden/);
      const text = await status.textContent();
      expect(text.toLowerCase()).toMatch(/fire mission|compute/);
    });

    test('status message clears after 3 seconds', async () => {
      await page.locator('#calculateWrapper').click();
      await expect(page.locator('#formStatus')).not.toHaveClass(/form-status-hidden/);
      await page.waitForTimeout(3200);
      await expect(page.locator('#formStatus')).toHaveClass(/form-status-hidden/);
    });
  });
});
