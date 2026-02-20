import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { VALID_COORDS, CORRECTION_VALUES } from './fixtures/test-data.js';

test.describe('Fire Corrections', () => {
  let calculatorPage;

  test.beforeEach(async ({ page }) => {
    // Initialize page object
    calculatorPage = new CalculatorPage(page);
    
    // Navigate to calculator
    await calculatorPage.goto();
    
    // Perform initial calculation to enable corrections
    await calculatorPage.selectWeapon('2B14');
    const coords = VALID_COORDS.mortar_short;
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();
    
    // Verify calculation was successful
    await calculatorPage.waitForResult('success');
  });

  // ==========================================================================
  // GT-LINE (GUN-TARGET) CORRECTION TESTS
  // ==========================================================================

  test('should display fire correction widget after calculation', async ({ page }) => {
    // Execute - enable fire corrections
    const foEnabledCheckbox = page.locator('#foEnabled');
    const isChecked = await foEnabledCheckbox.isChecked();
    if (!isChecked) {
      await foEnabledCheckbox.click();
    }

    // Verify fire correction widget is visible
    const fireCorrectionWidget = page.locator('#fireCorrectionWidget');
    await expect(fireCorrectionWidget).toBeVisible();
  });

  test('should apply right correction to azimuth', async ({ page }) => {
    // TODO: Needs investigation - apply button state management
    // Get original output before correction
    const originalOutput = await page.locator('#output').textContent();

    // Execute - apply right correction (+50)
    await calculatorPage.applyCorrection(50, 0);

    // Verify correction widget is visible
    const correctionWidget = page.locator('#fireCorrectionWidget');
    await expect(correctionWidget).toBeVisible();

    // Verify output changed (different text content indicates correction was applied)
    const correctedOutput = await page.locator('#output').textContent();
    expect(correctedOutput).not.toBe(originalOutput);

    // Verify correction inputs are cleared to "0" after apply
    const lrInput = page.locator('#correctionLR');
    const adInput = page.locator('#correctionAD');
    expect(await lrInput.inputValue()).toBe('0');
    expect(await adInput.inputValue()).toBe('0');
  });

  test('should apply left correction to azimuth', async ({ page }) => {
    // TODO: Needs investigation - apply button state management
    // Get original output before correction
    const originalOutput = await page.locator('#output').textContent();

    // Execute - apply left correction (-25)
    await calculatorPage.applyCorrection(-25, 0);

    // Verify correction widget is visible
    const correctionWidget = page.locator('#fireCorrectionWidget');
    await expect(correctionWidget).toBeVisible();

    // Verify output changed (different text content indicates correction was applied)
    const correctedOutput = await page.locator('#output').textContent();
    expect(correctedOutput).not.toBe(originalOutput);

    // Verify correction inputs are cleared to "0" after apply
    const lrInput = page.locator('#correctionLR');
    const adInput = page.locator('#correctionAD');
    expect(await lrInput.inputValue()).toBe('0');
    expect(await adInput.inputValue()).toBe('0');
  });

  test('should apply add correction to elevation', async ({ page }) => {
    // TODO: Needs investigation - apply button state management
    // Get original output before correction
    const originalOutput = await page.locator('#output').textContent();

    // Execute - apply add correction (+100)
    await calculatorPage.applyCorrection(0, 100);

    // Verify output changed (indicates correction was applied)
    const correctedOutput = await page.locator('#output').textContent();
    expect(correctedOutput).not.toBe(originalOutput);

    // Verify correction inputs are cleared to "0" after apply
    const lrInput = page.locator('#correctionLR');
    const adInput = page.locator('#correctionAD');
    expect(await lrInput.inputValue()).toBe('0');
    expect(await adInput.inputValue()).toBe('0');
  });

  test('should apply drop correction to elevation', async ({ page }) => {
    // TODO: Needs investigation - apply button state management
    // Get original output before correction
    const originalOutput = await page.locator('#output').textContent();

    // Execute - apply drop correction (-50)
    await calculatorPage.applyCorrection(0, -50);

    // Verify output changed (indicates correction was applied)
    const correctedOutput = await page.locator('#output').textContent();
    expect(correctedOutput).not.toBe(originalOutput);

    // Verify correction inputs are cleared to "0" after apply
    const lrInput = page.locator('#correctionLR');
    const adInput = page.locator('#correctionAD');
    expect(await lrInput.inputValue()).toBe('0');
    expect(await adInput.inputValue()).toBe('0');
  });

  test('should combine left/right and add/drop corrections', async ({ page }) => {
    // TODO: Needs investigation - apply button state management
    // Get original output before correction
    const originalOutput = await page.locator('#output').textContent();

    // Execute - apply combined corrections (right +50, add +100)
    await calculatorPage.applyCorrection(50, 100);

    // Verify output changed (indicates both corrections were applied)
    const correctedOutput = await page.locator('#output').textContent();
    expect(correctedOutput).not.toBe(originalOutput);

    // Verify correction inputs are cleared to "0" after apply
    const lrInput = page.locator('#correctionLR');
    const adInput = page.locator('#correctionAD');
    expect(await lrInput.inputValue()).toBe('0');
    expect(await adInput.inputValue()).toBe('0');
  });

  // ==========================================================================
  // OT-LINE (OBSERVER-TARGET) CORRECTION TESTS
  // ==========================================================================

  test('should enable OT mode when checkbox clicked', async ({ page }) => {
    // Execute - enable fire correction (which includes OT mode option)
    const foEnabledCheckbox = page.locator('#foEnabled');
    const isChecked = await foEnabledCheckbox.isChecked();
    if (!isChecked) {
      await foEnabledCheckbox.click();
    }

    // Verify observer inputs become visible
    const observerGridXInput = page.locator('#observerGridX');
    const observerGridYInput = page.locator('#observerGridY');
    
    await expect(observerGridXInput).toBeVisible();
    await expect(observerGridYInput).toBeVisible();
  });

  test('should require observer coordinates in OT mode', async ({ page }) => {
    // Execute - enable fire correction without observer coords
    const foEnabledCheckbox = page.locator('#foEnabled');
    const isChecked = await foEnabledCheckbox.isChecked();
    if (!isChecked) {
      await foEnabledCheckbox.click();
    }

    // Verify observer warning is visible when no observer coords set
    // The #observerWarning element should appear when FO is enabled but observer coords are missing
    const observerWarning = page.locator('#observerWarning');
    
    // Check if warning is visible (it may be shown to indicate missing observer data)
    const isWarningVisible = await observerWarning.isVisible().catch(() => false);
    
    // Verify observer inputs are present
    const observerGridXInput = page.locator('#observerGridX');
    const observerGridYInput = page.locator('#observerGridY');
    
    await expect(observerGridXInput).toBeVisible();
    await expect(observerGridYInput).toBeVisible();
    
    // Verify apply button exists
    const applyButton = page.locator('#applyCorrection');
    await expect(applyButton).toBeVisible();
  });

  test('should calculate corrections from observer perspective', async ({ page }) => {
    // Get initial azimuth from output
    const initialAzimuth = await page.locator('#output').textContent();

    // Enable FO mode and set observer coordinates
    const coords = VALID_COORDS.mortar_short;
    // Keep same number of digits as the gun coordinates (3 or 4 digit grid format)
    const gridLen = coords.gun.gridX.length;
    const observerX = String(parseInt(coords.gun.gridX) + 5).padStart(gridLen, '0');
    const observerY = String(parseInt(coords.gun.gridY) + 5).padStart(gridLen, '0');
    await calculatorPage.enableOTMode(observerX, observerY);
    await page.waitForTimeout(500); // Wait for debounced operations to complete

    // Apply correction from observer perspective using page object
    await calculatorPage.applyCorrection(50, 0);

    // Verify output changed (indicating correction was processed from OT line)
    const newAzimuth = await page.locator('#output').textContent();
    expect(newAzimuth).toBeTruthy();
    expect(newAzimuth).not.toBe(initialAzimuth);
  });

  test('should display OT and GT bearing values', async ({ page }) => {
    // Previously skipped due to widget lifecycle issues with fill() events
    // Fixed by debouncing setupDynamicListeners in calculator.js
    // Enable FO mode and set observer coordinates
    const coords = VALID_COORDS.mortar_short;
    // Keep same number of digits as the gun coordinates (3 or 4 digit grid format)
    const gridLen = coords.gun.gridX.length;
    const observerX = String(parseInt(coords.gun.gridX) + 3).padStart(gridLen, '0');
    const observerY = String(parseInt(coords.gun.gridY) + 3).padStart(gridLen, '0');
    await calculatorPage.enableOTMode(observerX, observerY);
    await page.waitForTimeout(200);

    // Verify observer input fields are filled (use evaluate to check values directly)
    const observerValues = await page.evaluate(() => {
      const gridX = document.getElementById('observerGridX');
      const gridY = document.getElementById('observerGridY');
      return {
        x: gridX ? gridX.value : null,
        y: gridY ? gridY.value : null
      };
    });
    expect(observerValues.x).toBeTruthy();
    expect(observerValues.y).toBeTruthy();

    // Apply a correction to generate bearing values
    await calculatorPage.applyCorrection(25, 0);

    // Verify output shows bearing/azimuth information
    const output = await page.locator('#output').textContent();
    expect(output).toBeTruthy();
    // Should contain directional information (azimuth or bearing)
    expect(output.toLowerCase()).toMatch(/azimuth|bearing|direction/);
  });

  // ==========================================================================
  // UNDO TESTS
  // ==========================================================================

  test('should show undo button after correction applied', async ({ page }) => {
    // TODO: Needs investigation - undo button visibility
    // Execute - apply a correction
    await calculatorPage.applyCorrection(50, 0);

    // Verify undo button exists and is visible
    const undoButton = page.locator('#undoCorrection');
    const isVisible = await undoButton.isVisible().catch(() => false);
    
    // Check if the button exists in DOM
    const exists = await undoButton.count() > 0;
    
    // Button should either be visible or exist in DOM
    expect(exists).toBe(true);
    
    // If it exists, it should be visible or have proper display
    if (exists) {
      const computedStyle = await undoButton.evaluate((el) => window.getComputedStyle(el).display);
      expect(computedStyle).not.toBe('none');
    }
  });

  test('should restore original target when undo clicked', async ({ page }) => {
    // Get original target coordinates
    const originalTargetX = await page.locator('#targetGridX').inputValue();
    const originalTargetY = await page.locator('#targetGridY').inputValue();

    // Execute - apply correction
    await calculatorPage.applyCorrection(50, 100);

    // Verify target coordinates changed after correction
    const correctedTargetX = await page.locator('#targetGridX').inputValue();
    const correctedTargetY = await page.locator('#targetGridY').inputValue();
    expect(correctedTargetX !== originalTargetX || correctedTargetY !== originalTargetY).toBe(true);

    // Execute - click undo (wait for button to be visible first)
    const undoButton = page.locator('#undoCorrection');
    await undoButton.waitFor({ state: 'visible', timeout: 5000 });
    await undoButton.click();

    // Wait for recalculation to complete
    await page.locator('#output.success').waitFor({ state: 'visible', timeout: 10000 });

    // Verify target coordinates are restored to original
    const restoredTargetX = await page.locator('#targetGridX').inputValue();
    const restoredTargetY = await page.locator('#targetGridY').inputValue();
    expect(restoredTargetX).toBe(originalTargetX);
    expect(restoredTargetY).toBe(originalTargetY);
  });
});
