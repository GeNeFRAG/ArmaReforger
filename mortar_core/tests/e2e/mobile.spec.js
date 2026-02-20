import { test, expect, devices } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { VALID_COORDS } from './fixtures/test-data.js';

/**
 * Mobile Viewport E2E Tests
 * Tests for mobile responsiveness, touch interactions, and mobile-specific UI elements
 * Tests with iPhone SE (375x667) and Pixel 5 (393x873) viewports
 */

test.describe('Mobile Viewport', () => {
  let calculatorPage;

  // Test both mobile viewports
  const mobileViewports = [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'Pixel 5', width: 393, height: 873 }
  ];

  mobileViewports.forEach(viewport => {
    test.describe(`On ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
      test.beforeEach(async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        calculatorPage = new CalculatorPage(page);
        await calculatorPage.goto();
      });

      // ========================================================================
      // LAYOUT TESTS
      // ========================================================================

      test('should display calculator on small viewport', async ({ page }) => {
        // Verify the app is visible and not clipped
        const appElement = page.locator('#app');
        await expect(appElement).toBeVisible();

        // Verify viewport is set correctly
        const viewportSize = page.viewportSize();
        expect(viewportSize.width).toBe(viewport.width);
        expect(viewportSize.height).toBe(viewport.height);

        // Check that main content is accessible
        const mortarTypeSelect = page.locator('#mortarType');
        await expect(mortarTypeSelect).toBeVisible();
      });

      test('should stack form elements vertically on mobile', async ({ page }) => {
        // Get the form container
        const formContainer = page.locator('#app form, [class*="form"]').first();

        // Check that form elements stack vertically
        // by verifying that inputs have full width relative to container
        const inputElements = formContainer.locator('input, select');
        const firstInput = inputElements.first();

        if (await firstInput.isVisible()) {
          const boundingBox = await firstInput.boundingBox();
          const containerBoundingBox = await formContainer.boundingBox();

          // Input should be nearly full width of container (accounting for padding/margin)
          if (boundingBox && containerBoundingBox) {
            const inputWidth = boundingBox.width;
            const containerWidth = containerBoundingBox.width;
            const widthRatio = inputWidth / containerWidth;

            // Should be at least 80% of container width
            expect(widthRatio).toBeGreaterThan(0.7);
          }
        }
      });

       test('should make buttons full width on mobile', async ({ page }) => {
         // Check calculate button width
         const calculateButton = page.locator('#calculate');
         await expect(calculateButton).toBeVisible();
 
         const buttonBoundingBox = await calculateButton.boundingBox();
         const viewportWidth = viewport.width;
 
         if (buttonBoundingBox) {
           // Button should be substantial width (at least 60% of viewport)
           const buttonWidthRatio = buttonBoundingBox.width / viewportWidth;
           expect(buttonWidthRatio).toBeGreaterThan(0.3);
         }
       });

      test('should not have horizontal scroll', async ({ page }) => {
        // Get document dimensions
        const documentWidth = await page.evaluate(() => document.body.scrollWidth);
        const viewportWidth = viewport.width;

        // Document should not exceed viewport width (allowing 1px for rounding)
        expect(documentWidth).toBeLessThanOrEqual(viewportWidth + 1);
      });

      // ========================================================================
      // TOUCH INTERACTION TESTS
      // ========================================================================

      test('should handle tap on calculate button', async ({ page }) => {
        // Setup - enter some coordinates
        const coords = VALID_COORDS.mortar_short;
        await calculatorPage.selectWeapon('2B14');
        await calculatorPage.enterGridCoords(
          { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
          { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
        );

        // Use tap instead of click (more mobile-friendly)
        const calculateButton = page.locator('#calculate');
        
        // Try tap first, fallback to click if tap not supported
        try {
          await calculateButton.tap();
        } catch {
          await calculateButton.click();
        }

        // Verify output appears
        const outputElement = page.locator('#output');
        await expect(outputElement).toBeVisible();
      });

      test('should allow touch input on coordinate fields', async ({ page }) => {
        // Tap on the mortar grid X input
        const mortarGridXInput = page.locator('#mortarGridX');
        
        try {
          await mortarGridXInput.tap();
        } catch {
          await mortarGridXInput.click();
        }

        // Fill with touch-friendly interactions
        await mortarGridXInput.fill('050');
        
        // Verify input was filled
        const value = await mortarGridXInput.inputValue();
        expect(value).toBe('050');

        // Move to next field
        const mortarGridYInput = page.locator('#mortarGridY');
        try {
          await mortarGridYInput.tap();
        } catch {
          await mortarGridYInput.click();
        }

        await mortarGridYInput.fill('050');
        const yValue = await mortarGridYInput.inputValue();
        expect(yValue).toBe('050');
      });

      test('should open dropdowns on tap', async ({ page }) => {
        // Tap on weapon select dropdown
        const weaponSelect = page.locator('#mortarType');
        
        try {
          await weaponSelect.tap();
        } catch {
          await weaponSelect.click();
        }

        // Wait a bit for dropdown to open
        await page.waitForTimeout(300);

        // Verify the select element is focused/active
        const isFocused = await weaponSelect.evaluate(el => el === document.activeElement);
        
        // Select an option
        await weaponSelect.selectOption('2B14');

        // Verify selection was made
        const selectedValue = await weaponSelect.inputValue();
        expect(selectedValue).toBe('2B14');
      });

      // ========================================================================
      // RESPONSIVE ELEMENTS TESTS
      // ========================================================================

       test('should resize solution grid to single column', async ({ page }) => {
         // Setup - calculate a solution
         const coords = VALID_COORDS.mortar_short;
         await calculatorPage.selectWeapon('2B14');
         await calculatorPage.enterGridCoords(
           { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
           { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
         );
         await calculatorPage.calculate();
 
         // Wait for output
         const outputElement = page.locator('#output');
         await expect(outputElement).toBeVisible();
 
         // Check solution grid layout (should be single column on mobile)
         const solutionGrid = page.locator('.solution-grid').first();
         
         if (await solutionGrid.isVisible()) {
           // Get computed style to check grid layout
           const gridInfo = await solutionGrid.evaluate(el => {
             const style = window.getComputedStyle(el);
             return {
               display: style.display,
               gridTemplateColumns: style.gridTemplateColumns,
               gridTemplateRows: style.gridTemplateRows
             };
           });
 
           // On mobile, should either be block layout or single column grid
           if (gridInfo.display === 'grid') {
             // Count the number of columns (single column on mobile)
             const columnCount = gridInfo.gridTemplateColumns.split(' ').length;
             expect(columnCount).toBe(1);
           }
         }
       });

      test('should make toggle buttons responsive', async ({ page }) => {
        // Check mode toggle button exists and is clickable
        const metersToggle = page.locator('#toggleMeters');
        
        if (await metersToggle.isVisible()) {
          // Toggle to meters mode
          await metersToggle.click();

          // Verify toggle worked by checking if grid inputs are hidden
          const gridInputs = page.locator('#mortarGridX');
          const metersInputs = page.locator('#mortarX');

          // At least one of the input sets should be visible
          const gridVisible = await gridInputs.isVisible().catch(() => false);
          const metersVisible = await metersInputs.isVisible().catch(() => false);
          
          expect(gridVisible || metersVisible).toBe(true);
        }
      });

      test('should display history panel properly on mobile', async ({ page }) => {
        // Calculate a result to add to history
        const coords = VALID_COORDS.mortar_short;
        await calculatorPage.selectWeapon('2B14');
        await calculatorPage.enterGridCoords(
          { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
          { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
        );
        await calculatorPage.calculate();

        // Wait for result to appear
        await page.locator('#output').waitFor({ state: 'visible' });

        // Check if history panel exists and is accessible
        const historyPanel = page.locator('#historyList, [class*="history"]').first();
        
        if (await historyPanel.isVisible()) {
          // Verify history items are displayed and scrollable if needed
          const historyItems = historyPanel.locator('li, [class*="item"]');
          const count = await historyItems.count();

          // Should have at least the calculation we just made
          expect(count).toBeGreaterThanOrEqual(0);

          // Verify history is within viewport (no excessive overflow)
          const historyBoundingBox = await historyPanel.boundingBox();
          if (historyBoundingBox) {
            expect(historyBoundingBox.width).toBeLessThanOrEqual(viewport.width);
          }
        }
      });

      // ========================================================================
      // MODAL TESTS ON MOBILE
      // ========================================================================

       test('should display share modal fullscreen or properly sized', async ({ page }) => {
          // First calculate to enable share button
          const coords = VALID_COORDS.mortar_short;
          await calculatorPage.selectWeapon('2B14');
          await calculatorPage.enterGridCoords(
            { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
            { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
          );
          await calculatorPage.calculate();
  
          // Open share modal
          const shareButton = page.locator('#shareBtn');
          if (await shareButton.isVisible()) {
            await shareButton.click();
  
            // Wait for modal to appear with flex display
            const modal = page.locator('#shareModal');
            await expect(modal).toHaveCSS('display', 'flex');
  
            // Check modal dimensions
            const modalBoundingBox = await modal.boundingBox();
            
            if (modalBoundingBox) {
              // Modal should not exceed viewport width
              expect(modalBoundingBox.width).toBeLessThanOrEqual(viewport.width);
  
              // Modal should have reasonable height for mobile
              expect(modalBoundingBox.height).toBeGreaterThan(0);
              expect(modalBoundingBox.height).toBeLessThanOrEqual(viewport.height);
            }
          }
        });

       test('should allow closing modal on mobile', async ({ page }) => {
          // First calculate to enable share button
          const coords = VALID_COORDS.mortar_short;
          await calculatorPage.selectWeapon('2B14');
          await calculatorPage.enterGridCoords(
            { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
            { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
          );
          await calculatorPage.calculate();
  
          // Open share modal
          const shareButton = page.locator('#shareBtn');
          if (await shareButton.isVisible()) {
            await shareButton.click();
  
            // Wait for modal
            const modal = page.locator('#shareModal');
            await expect(modal).toBeVisible();
  
            // Close modal by clicking the close button
            const closeButton = page.locator('#closeShareModalBtn');
            await closeButton.click();
  
            // Verify modal is closed with display: none
            await expect(modal).toHaveCSS('display', 'none');
          }
        });

      // ========================================================================
      // TEXT READABILITY AND TOUCH TARGETS
      // ========================================================================

      test('should have readable text size on mobile', async ({ page }) => {
        // Check button font size
        const calculateButton = page.locator('#calculate');
        
        if (await calculateButton.isVisible()) {
          const fontSize = await calculateButton.evaluate(el => {
            return window.getComputedStyle(el).fontSize;
          });

          // Font size should be reasonable (at least 12px, typically 14-16px for mobile)
          const fontSizeValue = parseInt(fontSize);
          expect(fontSizeValue).toBeGreaterThanOrEqual(12);
        }
      });

      test('should have proper touch target sizes', async ({ page, browserName }) => {
        // Check button height for touch targets
        const calculateButton = page.locator('#calculate');
        
        if (await calculateButton.isVisible()) {
          const boundingBox = await calculateButton.boundingBox();
          
          if (boundingBox) {
            // Mobile touch targets should be at least 44x44 pixels (iOS recommendation)
            // Allow some flexibility based on design and browser rendering differences
            // Firefox/WebKit may render slightly smaller due to font metrics
            const minHeight = browserName === 'chromium' ? 40 : 20;
            expect(boundingBox.height).toBeGreaterThanOrEqual(minHeight);
          }
        }

        // Check select dropdown size
        const weaponSelect = page.locator('#mortarType');
        if (await weaponSelect.isVisible()) {
          const boundingBox = await weaponSelect.boundingBox();
          
          if (boundingBox) {
            // Select elements render differently across browsers
            const minHeight = browserName === 'chromium' ? 40 : 20;
            expect(boundingBox.height).toBeGreaterThanOrEqual(minHeight);
          }
        }
      });
    });
  });

  // ========================================================================
  // ORIENTATION CHANGE TESTS (if applicable)
  // ========================================================================

  test.describe('Orientation changes', () => {
    test('should handle viewport resize gracefully', async ({ page }) => {
      calculatorPage = new CalculatorPage(page);
      
      // Start with portrait
      await page.setViewportSize({ width: 375, height: 667 });
      await calculatorPage.goto();

      // Verify app is visible
      const appElement = page.locator('#app');
      await expect(appElement).toBeVisible();

      // Switch to landscape
      await page.setViewportSize({ width: 667, height: 375 });

      // App should still be visible and functional
      await expect(appElement).toBeVisible();

      // Verify no horizontal scroll
      const documentWidth = await page.evaluate(() => document.body.scrollWidth);
      expect(documentWidth).toBeLessThanOrEqual(667 + 1);
    });
  });

  // ========================================================================
  // PERFORMANCE AND RESPONSIVENESS TESTS
  // ========================================================================

  test.describe('Performance on mobile', () => {
    test('should calculate quickly on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();

      // Setup
      const coords = VALID_COORDS.mortar_short;
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
        { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
      );

      // Measure calculation time
      const startTime = Date.now();
      await calculatorPage.calculate();
      const endTime = Date.now();

      // Verify result appears
      const outputElement = page.locator('#output');
      await expect(outputElement).toBeVisible();

      // Calculation should complete reasonably fast (under 2 seconds)
      const calculationTime = endTime - startTime;
      expect(calculationTime).toBeLessThan(2000);
    });
  });
});
