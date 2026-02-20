/**
 * E2E Tests for Coordinate Input Functionality
 * Tests grid mode, meters mode, and height input validation
 */

import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { VALID_COORDS, INVALID_COORDS } from './fixtures/test-data.js';

test.describe('Coordinate Input', () => {
  let page;
  let calculator;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    calculator = new CalculatorPage(page);
    await calculator.goto();
  });

  test.describe('Grid Mode', () => {
    test('should accept 3-digit grid coordinates', async () => {
      // Enter 3-digit grid coordinates
      await page.locator('#mortarGridX').fill(VALID_COORDS.mortar_short.gun.gridX);
      await page.locator('#mortarGridY').fill(VALID_COORDS.mortar_short.gun.gridY);
      await page.locator('#targetGridX').fill(VALID_COORDS.mortar_short.target.gridX);
      await page.locator('#targetGridY').fill(VALID_COORDS.mortar_short.target.gridY);

      // Verify the values were filled
      await expect(page.locator('#mortarGridX')).toHaveValue(VALID_COORDS.mortar_short.gun.gridX);
      await expect(page.locator('#mortarGridY')).toHaveValue(VALID_COORDS.mortar_short.gun.gridY);
      await expect(page.locator('#targetGridX')).toHaveValue(VALID_COORDS.mortar_short.target.gridX);
      await expect(page.locator('#targetGridY')).toHaveValue(VALID_COORDS.mortar_short.target.gridY);
    });

    test('should accept 4-digit grid coordinates', async () => {
      // Enter 4-digit grid coordinates
      await page.locator('#mortarGridX').fill(VALID_COORDS.mortar_4digit.gun.gridX);
      await page.locator('#mortarGridY').fill(VALID_COORDS.mortar_4digit.gun.gridY);
      await page.locator('#targetGridX').fill(VALID_COORDS.mortar_4digit.target.gridX);
      await page.locator('#targetGridY').fill(VALID_COORDS.mortar_4digit.target.gridY);

      // Verify the values were filled
      await expect(page.locator('#mortarGridX')).toHaveValue(VALID_COORDS.mortar_4digit.gun.gridX);
      await expect(page.locator('#mortarGridY')).toHaveValue(VALID_COORDS.mortar_4digit.gun.gridY);
      await expect(page.locator('#targetGridX')).toHaveValue(VALID_COORDS.mortar_4digit.target.gridX);
      await expect(page.locator('#targetGridY')).toHaveValue(VALID_COORDS.mortar_4digit.target.gridY);
    });

    test('should show error for invalid grid format (letters)', async () => {
      // Enter invalid grid coordinates with letters
      await page.locator('#mortarGridX').fill(INVALID_COORDS.letters.gridX);
      await page.locator('#mortarGridY').fill(INVALID_COORDS.letters.gridY);

      // Verify that the calculate button is disabled due to invalid input
      await expect(page.locator('#calculate')).toBeDisabled();
    });

    test('should validate empty inputs when calculating', async () => {
      // Leave grid coordinate fields empty and verify the calculate button is disabled
      await expect(page.locator('#calculate')).toBeDisabled();
    });
  });

  test.describe('Meters Mode', () => {
    test('should toggle from grid to meters mode', async () => {
      // Verify grid inputs are visible initially
      const gridX = page.locator('#mortarGridX');
      const gridY = page.locator('#mortarGridY');
      const metersX = page.locator('#mortarX');
      const metersY = page.locator('#mortarY');

      await expect(gridX).toBeVisible();
      await expect(gridY).toBeVisible();

      // Toggle to meters mode
      await calculator.toggleToMetersMode();

      // Verify meters inputs are now visible and grid inputs are hidden
      await expect(metersX).toBeVisible();
      await expect(metersY).toBeVisible();
      await expect(gridX).toBeHidden();
      await expect(gridY).toBeHidden();
    });

    test('should accept decimal meter values', async () => {
      // Toggle to meters mode
      await calculator.toggleToMetersMode();

      // Enter decimal meter values
      await page.locator('#mortarX').fill('4800.5');
      await page.locator('#mortarY').fill('7049.0');
      await page.locator('#targetX').fill('5000.25');
      await page.locator('#targetY').fill('7100.75');

      // Verify the values were filled
      await expect(page.locator('#mortarX')).toHaveValue('4800.5');
      await expect(page.locator('#mortarY')).toHaveValue('7049.0');
      await expect(page.locator('#targetX')).toHaveValue('5000.25');
      await expect(page.locator('#targetY')).toHaveValue('7100.75');
    });

    test('should toggle back to grid mode', async () => {
      // Start in meters mode
      await calculator.toggleToMetersMode();
      const metersX = page.locator('#mortarX');
      await expect(metersX).toBeVisible();

      // Toggle back to grid mode
      await calculator.toggleToGridMode();

      // Verify grid inputs are visible again
      const gridX = page.locator('#mortarGridX');
      const gridY = page.locator('#mortarGridY');
      await expect(gridX).toBeVisible();
      await expect(gridY).toBeVisible();
      await expect(metersX).toBeHidden();
    });
  });

  test.describe('Height Input', () => {
    test('should accept positive height values', async () => {
      // Enter positive height values
      await page.locator('#mortarZ').fill('168');
      await page.locator('#targetZ').fill('150');

      // Verify the values were filled
      await expect(page.locator('#mortarZ')).toHaveValue('168');
      await expect(page.locator('#targetZ')).toHaveValue('150');
    });

    test('should accept negative height values', async () => {
      // Enter negative height values (below sea level)
      await page.locator('#mortarZ').fill('-50');
      await page.locator('#targetZ').fill('-25');

      // Verify the values were filled
      await expect(page.locator('#mortarZ')).toHaveValue('-50');
      await expect(page.locator('#targetZ')).toHaveValue('-25');
    });
  });
});
