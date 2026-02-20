/**
 * E2E Test Helper Functions
 * Provides utility functions for E2E testing with Playwright
 */

/**
 * Wait for solution to be displayed (output element has active class)
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds (default 5000)
 * @returns {Promise<boolean>} - True if solution displayed, false if timeout
 */
export async function waitForSolution(page, timeout = 5000) {
  try {
    await page.waitForSelector('#output.active', { timeout });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for calculation to complete (debounce + async processing)
 * Waits for debounce period (500ms) plus async state changes
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Timeout in milliseconds (default 2000)
 * @returns {Promise<void>}
 */
export async function waitForCalculation(page, timeout = 2000) {
  // Wait for debounce period
  await page.waitForTimeout(500);
  
  // Wait for solution to be displayed or timeout
  try {
    await page.waitForSelector('#output.active', { timeout: timeout - 500 });
  } catch (error) {
    // If timeout occurs, continue anyway
  }
}

/**
 * Parse solution values from #output container
 * @param {Page} page - Playwright page object
 * @returns {Promise<Object>} - Object with elevation, azimuth, distance, charge, timeOfFlight
 */
export async function parseSolutionValues(page) {
  const outputText = await page.locator('#output').innerText();
  
  const result = {
    elevation: null,
    azimuth: null,
    distance: null,
    charge: null,
    timeOfFlight: null
  };

  // Parse elevation (look for "Elevation" with value, handle both mils and degrees)
  const elevationMatch = outputText.match(/Elevation[:\s]+([0-9.]+)\s*(mils|°)?/i);
  if (elevationMatch) {
    result.elevation = {
      value: parseFloat(elevationMatch[1]),
      unit: elevationMatch[2] || 'mils'
    };
  }

  // Parse azimuth (look for "Azimuth" with value, handle both mils and degrees)
  const azimuthMatch = outputText.match(/Azimuth[:\s]+([0-9.]+)\s*(mils|°)?/i);
  if (azimuthMatch) {
    result.azimuth = {
      value: parseFloat(azimuthMatch[1]),
      unit: azimuthMatch[2] || 'mils'
    };
  }

  // Parse distance (look for "Distance" with value)
  const distanceMatch = outputText.match(/Distance[:\s]+([0-9.]+)\s*(m|meters)?/i);
  if (distanceMatch) {
    result.distance = {
      value: parseFloat(distanceMatch[1]),
      unit: distanceMatch[2] || 'm'
    };
  }

  // Parse charge (look for "Charge" with value)
  const chargeMatch = outputText.match(/Charge[:\s]+([0-9]+)/i);
  if (chargeMatch) {
    result.charge = parseInt(chargeMatch[1], 10);
  }

  // Parse time of flight (look for "Time" or "ToF" with value)
  const tofMatch = outputText.match(/(?:Time[:\s]+|ToF[:\s]+)([0-9.]+)\s*(s|sec)?/i);
  if (tofMatch) {
    result.timeOfFlight = {
      value: parseFloat(tofMatch[1]),
      unit: tofMatch[2] || 's'
    };
  }

  return result;
}

/**
 * Assert that a value is within a range
 * @param {number} actual - Actual value
 * @param {number} min - Minimum value (inclusive)
 * @param {number} max - Maximum value (inclusive)
 * @param {string} message - Error message if assertion fails
 * @throws {Error} - If value is not in range
 */
export function assertInRange(actual, min, max, message) {
  if (actual < min || actual > max) {
    throw new Error(
      `${message}: Expected value between ${min} and ${max}, but got ${actual}`
    );
  }
}

/**
 * Format grid coordinate to proper format (3 or 4 digits)
 * Pads with zeros if needed
 * @param {string|number} value - Grid coordinate value
 * @returns {string} - Formatted coordinate
 */
export function formatGridCoord(value) {
  const str = String(value).trim();
  
  // If it's already 3 or 4 digits, return as is
  if (str.length === 3 || str.length === 4) {
    return str;
  }
  
  // Pad with leading zeros to make it 4 digits
  return str.padStart(4, '0');
}

/**
 * Wait for app to fully initialize
 * Checks that loading is hidden, app is visible, and weapon select is populated
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function waitForAppReady(page) {
  // Wait for loading to be hidden
  try {
    await page.waitForSelector('#loading.hidden', { timeout: 5000 });
  } catch (error) {
    // If loading element not found or doesn't get hidden, continue
  }

  // Wait for app to be visible
  await page.waitForSelector('#app:visible', { timeout: 5000 });

  // Wait for weapon select to have options
  try {
    await page.waitForSelector('#weapon-select option:not([disabled])', { timeout: 5000 });
  } catch (error) {
    // If weapon select not found, continue
  }
}

/**
 * Get trimmed text content from selector
 * Returns empty string if element not found or is hidden
 * @param {Page} page - Playwright page object
 * @param {selector} selector - CSS selector
 * @returns {Promise<string>} - Trimmed text content
 */
export async function getVisibleText(page, selector) {
  try {
    const element = page.locator(selector);
    const isVisible = await element.isVisible();
    
    if (!isVisible) {
      return '';
    }
    
    const text = await element.innerText();
    return text.trim();
  } catch (error) {
    return '';
  }
}

/**
 * Check if element is visible (not hidden)
 * @param {Page} page - Playwright page object
 * @param {string} selector - CSS selector
 * @returns {Promise<boolean>} - True if element is visible, false otherwise
 */
export async function isElementVisible(page, selector) {
  try {
    const element = page.locator(selector);
    
    // Check if element is visible using Playwright's visibility check
    const isVisible = await element.isVisible();
    
    // Also check for cls-hidden class
    const hasHiddenClass = await element.evaluate(el => 
      el.classList.contains('cls-hidden')
    ).catch(() => false);
    
    return isVisible && !hasHiddenClass;
  } catch (error) {
    return false;
  }
}
