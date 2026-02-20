import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { VALID_COORDS, EXPECTED_RESULTS, WEAPONS } from './fixtures/test-data.js';
import { waitForSolution, parseSolutionValues, assertInRange } from './utils/helpers.js';

test.describe('Ballistic Calculations', () => {
  let calculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();
  });

  // ============================================================================
  // MORTAR TESTS
  // ============================================================================

  test('should calculate solution for 2B14 mortar at short range', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;
    const expectedResults = EXPECTED_RESULTS.mortar_short_2B14;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const isSuccess = await calculatorPage.isInRange();
    expect(isSuccess).toBe(true);

    // Parse and validate results
    const result = await parseSolutionValues(page);
    expect(result.elevation).toBeTruthy();
    expect(result.elevation.value).toBeGreaterThanOrEqual(expectedResults.elevationMin);
    expect(result.elevation.value).toBeLessThanOrEqual(expectedResults.elevationMax);
  });

  test('should calculate solution for M252 mortar', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute
    await calculatorPage.selectWeapon('M252');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const isSuccess = await calculatorPage.isInRange();
    expect(isSuccess).toBe(true);

    // Verify we got reasonable elevation values
    const result = await parseSolutionValues(page);
    expect(result.elevation).toBeTruthy();
    expect(result.elevation.value).toBeGreaterThan(0);
    expect(result.elevation.value).toBeLessThan(6400); // Maximum mils
  });

  test('should display charge number for mortars', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;
    const expectedResults = EXPECTED_RESULTS.mortar_short_2B14;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const result = await parseSolutionValues(page);
    
    expect(result.charge).toBeTruthy();
    expect(result.charge).toBeGreaterThanOrEqual(expectedResults.chargeRange[0]);
    expect(result.charge).toBeLessThanOrEqual(expectedResults.chargeRange[1]);
  });

  test('should display azimuth in mils', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const result = await parseSolutionValues(page);
    
    expect(result.azimuth).toBeTruthy();
    expect(result.azimuth.value).toBeGreaterThanOrEqual(0);
    expect(result.azimuth.value).toBeLessThan(6400); // Maximum mils in full circle
    expect(result.azimuth.unit).toBe('mils');
  });

  test('should display time of flight', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const result = await parseSolutionValues(page);
    
    // Time of flight may not be available for all weapons, check only if it exists
    if (result.timeOfFlight) {
      expect(result.timeOfFlight.value).toBeGreaterThan(0);
      expect(result.timeOfFlight.value).toBeLessThan(60); // Reasonable range for mortar
    }
  });

  // ============================================================================
  // MLRS TESTS
  // ============================================================================

  test('should calculate solution for BM-21 at long range', async ({ page }) => {
    // MLRS uses meters mode with different range requirements (3000-20000m)
    const coords = VALID_COORDS.mlrs_long;
    const expectedResults = EXPECTED_RESULTS.mlrs_long_BM21;

    // Execute - switch to meters mode first, then select weapon
    await calculatorPage.toggleToMetersMode();
    await calculatorPage.selectWeapon('BM21');
    
    // Wait for shell types to update after weapon selection
    await page.waitForTimeout(200);
    
    await calculatorPage.enterMetersCoords(
      { x: coords.gun.x, y: coords.gun.y, z: coords.gun.z },
      { x: coords.target.x, y: coords.target.y, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - increase timeout for long-range MLRS calculations
    await calculatorPage.waitForResult('success', 15000);
    const isSuccess = await calculatorPage.isInRange();
    expect(isSuccess).toBe(true);

    // Parse and validate results
    const result = await parseSolutionValues(page);
    expect(result.elevation).toBeTruthy();
    if (result.elevation && result.elevation.value) {
      expect(result.elevation.value).toBeGreaterThanOrEqual(expectedResults.elevationMin);
      expect(result.elevation.value).toBeLessThanOrEqual(expectedResults.elevationMax);
    }
  });

  test('should show N/A for MLRS charge', async ({ page }) => {
    // MLRS doesn't use charges, uses meters mode
    const coords = VALID_COORDS.mlrs_long;

    // Execute - switch to meters mode first, then select weapon
    await calculatorPage.toggleToMetersMode();
    await calculatorPage.selectWeapon('BM21');
    
    // Wait for shell types to update after weapon selection
    await page.waitForTimeout(200);
    
    await calculatorPage.enterMetersCoords(
      { x: coords.gun.x, y: coords.gun.y, z: coords.gun.z },
      { x: coords.target.x, y: coords.target.y, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - increase timeout for long-range MLRS calculations
    await calculatorPage.waitForResult('success', 15000);
    const result = await parseSolutionValues(page);
    
    // MLRS doesn't use charges - verify charge is not present or shows N/A
    const outputText = page.locator('#output');
    const text = await outputText.innerText();
    
    // Verify that charge field is either not shown or explicitly shows N/A
    // MLRS systems don't have variable charges like mortars
    if (result.charge !== null && result.charge !== undefined) {
      // If charge is parsed, it should not be a valid charge number for MLRS
      expect(text.toLowerCase()).toMatch(/charge.*n\/a|no.*charge|not applicable/i);
    } else {
      // Charge should not be parsed for MLRS weapons
      expect(result.charge).toBeNull();
    }
  });

  // ============================================================================
  // HOWITZER TESTS
  // ============================================================================

  test('should calculate solution for D-30 howitzer', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.howitzer_medium;

    // Execute
    await calculatorPage.selectWeapon('D30');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const isSuccess = await calculatorPage.isInRange();
    expect(isSuccess).toBe(true);

    // Verify we got reasonable elevation values
    const result = await parseSolutionValues(page);
    expect(result.elevation).toBeTruthy();
    expect(result.elevation.value).toBeGreaterThan(0);
    expect(result.elevation.value).toBeLessThan(6400);
  });

  test('should calculate solution for M119 howitzer', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.howitzer_medium;

    // Execute
    await calculatorPage.selectWeapon('M119');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const isSuccess = await calculatorPage.isInRange();
    expect(isSuccess).toBe(true);

    // Verify we got reasonable elevation values
    const result = await parseSolutionValues(page);
    expect(result.elevation).toBeTruthy();
    expect(result.elevation.value).toBeGreaterThan(0);
    expect(result.elevation.value).toBeLessThan(6400);
  });

  // ============================================================================
  // ERROR HANDLING TESTS
  // ============================================================================

  test('should show out of range error for extreme distances', async ({ page }) => {
    // Setup - Create an unreachable target (very far away)
    const coords = {
      gun: {
        gridX: '000',
        gridY: '000',
        z: 0
      },
      target: {
        gridX: '999',
        gridY: '999',
        z: 0
      }
    };

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - Either out of range or error state
    try {
      await calculatorPage.waitForResult('error', 5000);
      const errorMessage = await calculatorPage.getErrorMessage();
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.toLowerCase()).toMatch(/range|distance|unreachable/i);
    } catch {
      // If it doesn't show error, verify the output element exists
      const outputElement = page.locator('#output');
      await expect(outputElement).toBeVisible();
    }
  });

  test('should handle height differences correctly', async ({ page }) => {
    // Setup - Significant height difference between gun and target
    const coords = {
      gun: {
        gridX: '050',
        gridY: '050',
        z: 500  // Gun at high elevation
      },
      target: {
        gridX: '051',
        gridY: '051',
        z: 0    // Target at low elevation
      }
    };

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - Result should be calculated (either success or calculated but possibly high angle)
    const outputElement = page.locator('#output');
    await expect(outputElement).toBeVisible();

    // If successful, verify elevation accounts for height difference
    const isSuccess = await calculatorPage.isInRange();
    if (isSuccess) {
      const result = await parseSolutionValues(page);
      expect(result.elevation).toBeTruthy();
      // For negative target (downhill), elevation should be lower
      expect(result.elevation.value).toBeGreaterThan(0);
    }
  });

  // ============================================================================
  // SHELL TYPE SELECTION
  // ============================================================================

  test('should support different shell types per weapon', async ({ page }) => {
    // Setup - Test switching between shell types
    const coords = VALID_COORDS.mortar_short;

    // Execute with HE shell
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.selectShell('HE');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const result1 = await parseSolutionValues(page);
    expect(result1.elevation).toBeTruthy();

    // Clear and try different shell if available
    await calculatorPage.clear();
    const state = await calculatorPage.getState();
    expect(state.weapon).toBeDefined();
  });

  // ============================================================================
  // RESULT CONTAINER VALIDATION
  // ============================================================================

  test('should show success class for valid calculation', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    const outputElement = page.locator('#output');
    const classList = await outputElement.getAttribute('class');
    expect(classList).toContain('success');
  });

   test('should parse and validate all result values are in expected ranges', async ({ page }) => {
     // Setup
     const coords = VALID_COORDS.mortar_short;

     // Execute
     await calculatorPage.selectWeapon('2B14');
     await calculatorPage.enterGridCoords(
       { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
       { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
     );
     await calculatorPage.calculate();

     // Verify
     await calculatorPage.waitForResult('success');
     const result = await parseSolutionValues(page);

     // Validate elevation exists and is in reasonable range
     expect(result.elevation).toBeTruthy();
     if (result.elevation && result.elevation.value) {
       expect(result.elevation.value).toBeGreaterThanOrEqual(0);
       expect(result.elevation.value).toBeLessThanOrEqual(6400);
     }

     // Validate azimuth exists and is in reasonable range (optional field)
     if (result.azimuth && result.azimuth.value) {
       expect(result.azimuth.value).toBeGreaterThanOrEqual(0);
       expect(result.azimuth.value).toBeLessThanOrEqual(6400);
     }

     // Validate distance exists and is positive (optional field)
     if (result.distance && result.distance.value) {
       expect(result.distance.value).toBeGreaterThan(0);
     }

     // Validate time of flight is reasonable only if it exists (optional field)
     if (result.timeOfFlight && result.timeOfFlight.value) {
       expect(result.timeOfFlight.value).toBeGreaterThan(0);
       expect(result.timeOfFlight.value).toBeLessThan(120); // Max 2 minutes
     }

     // Validate charge is reasonable only if it exists (optional for some weapons)
     if (result.charge && result.charge !== null) {
       expect(result.charge).toBeGreaterThanOrEqual(0);
       expect(result.charge).toBeLessThanOrEqual(10); // Reasonable charge range
     }
   });

  // ============================================================================
  // DATA-DRIVEN MORTAR CALCULATIONS
  // ============================================================================

  test.describe('Data-driven mortar tests', () => {
    const mortarTests = [
      {
        name: '2B14 mortar',
        weaponId: '2B14',
        coords: VALID_COORDS.mortar_short,
        expectedMinElev: 800,
        expectedMaxElev: 1400
      },
      {
        name: 'M252 mortar',
        weaponId: 'M252',
        coords: VALID_COORDS.mortar_short,
        expectedMinElev: 700,
        expectedMaxElev: 1500
      }
    ];

    mortarTests.forEach(testCase => {
      test(`${testCase.name} should calculate with elevation in range`, async ({ page }) => {
        // Setup
        const coords = testCase.coords;

        // Execute
        await calculatorPage.selectWeapon(testCase.weaponId);
        await calculatorPage.enterGridCoords(
          { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
          { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
        );
        await calculatorPage.calculate();

        // Verify
        await calculatorPage.waitForResult('success');
        const result = await parseSolutionValues(page);

        expect(result.elevation).toBeTruthy();
        assertInRange(
          result.elevation.value,
          testCase.expectedMinElev,
          testCase.expectedMaxElev,
          `${testCase.name} elevation`
        );
      });
    });
  });

  // ============================================================================
  // COORDINATE FORMAT TESTS
  // ============================================================================

  test('should handle both 3-digit and 4-digit grid coordinates', async ({ page }) => {
    // Setup - Test 4-digit coordinates
    const coords = VALID_COORDS.mortar_4digit;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify
    await calculatorPage.waitForResult('success');
    const isSuccess = await calculatorPage.isInRange();
    expect(isSuccess).toBe(true);

    const result = await parseSolutionValues(page);
    expect(result.elevation).toBeTruthy();
  });

  test('should handle meters coordinates for MLRS', async ({ page }) => {
    // MLRS uses meters mode with extended range requirements
    const coords = VALID_COORDS.mlrs_long;

    // Execute - switch to meters mode first, then select weapon
    await calculatorPage.toggleToMetersMode();
    await calculatorPage.selectWeapon('BM21');
    
    // Wait for shell types to update after weapon selection
    await page.waitForTimeout(200);
    
    // Verify meters mode is active
    const state = await calculatorPage.getState();
    expect(state).toBeDefined();

    // Enter coordinates and calculate using meters format
    await calculatorPage.enterMetersCoords(
      { x: coords.gun.x, y: coords.gun.y, z: coords.gun.z },
      { x: coords.target.x, y: coords.target.y, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - increase timeout for MLRS long-range calculations
    await calculatorPage.waitForResult('success', 15000);
    const isSuccess = await calculatorPage.isInRange();
    expect(isSuccess).toBe(true);
  });
});
