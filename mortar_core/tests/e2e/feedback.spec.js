/**
 * E2E Tests for dead-click feedback improvements
 * Covers: toggle button accessibility, data preservation on mode switch,
 * and disabled-button status hints.
 */

import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { VALID_COORDS } from './fixtures/test-data.js';

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
