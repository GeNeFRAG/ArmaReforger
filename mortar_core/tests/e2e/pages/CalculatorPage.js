/**
 * Page Object Model for the Mortar Calculator
 * Handles all interactions with the calculator UI
 */
export class CalculatorPage {
  /**
   * Creates a new instance of CalculatorPage
   * @param {Page} page - Playwright page object
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to the calculator and wait for app to load
   */
  async goto() {
    await this.page.goto('/');
    // Wait for app to be visible and loading to be hidden
    await this.page.locator('#app').waitFor({ state: 'visible' });
    await this.page.locator('#loading').waitFor({ state: 'hidden' });
  }

  /**
   * Select a weapon from the weapon type dropdown
   * @param {string} weaponId - The weapon ID to select
   */
  async selectWeapon(weaponId) {
    await this.page.locator('#mortarType').selectOption(weaponId);
  }

  /**
   * Select a shell from the shell type dropdown
   * @param {string} shellId - The shell ID to select
   */
  async selectShell(shellId) {
    await this.page.locator('#shellType').selectOption(shellId);
  }

  /**
   * Toggle to meters mode from grid mode
   */
  async toggleToMetersMode() {
    await this.page.locator('#toggleMeters').click();
  }

  /**
   * Toggle to grid mode from meters mode
   */
  async toggleToGridMode() {
    await this.page.locator('#toggleGrid').click();
  }

  /**
   * Enter grid coordinates for gun and target
   * @param {Object} gun - Gun grid coords {gridX, gridY, z} or {x, y, z}
   * @param {Object} target - Target grid coords {gridX, gridY, z} or {x, y, z}
   */
  async enterGridCoords(gun, target) {
    if (gun) {
      const gunX = gun.gridX !== undefined ? gun.gridX : gun.x;
      const gunY = gun.gridY !== undefined ? gun.gridY : gun.y;
      if (gunX !== undefined) {
        await this.page.locator('#mortarGridX').fill(String(gunX));
      }
      if (gunY !== undefined) {
        await this.page.locator('#mortarGridY').fill(String(gunY));
      }
      if (gun.z !== undefined) {
        await this.page.locator('#mortarZ').fill(String(gun.z));
      }
    }

    if (target) {
      const targetX = target.gridX !== undefined ? target.gridX : target.x;
      const targetY = target.gridY !== undefined ? target.gridY : target.y;
      if (targetX !== undefined) {
        await this.page.locator('#targetGridX').fill(String(targetX));
      }
      if (targetY !== undefined) {
        await this.page.locator('#targetGridY').fill(String(targetY));
      }
      if (target.z !== undefined) {
        await this.page.locator('#targetZ').fill(String(target.z));
      }
    }
  }

  /**
   * Enter meters coordinates for gun and target
   * @param {Object} gun - Gun meters coords {x, y, z}
   * @param {Object} target - Target meters coords {x, y, z}
   */
  async enterMetersCoords(gun, target) {
    if (gun) {
      if (gun.x !== undefined) {
        await this.page.locator('#mortarX').fill(String(gun.x));
      }
      if (gun.y !== undefined) {
        await this.page.locator('#mortarY').fill(String(gun.y));
      }
      if (gun.z !== undefined) {
        await this.page.locator('#mortarZ').fill(String(gun.z));
      }
    }

    if (target) {
      if (target.x !== undefined) {
        await this.page.locator('#targetX').fill(String(target.x));
      }
      if (target.y !== undefined) {
        await this.page.locator('#targetY').fill(String(target.y));
      }
      if (target.z !== undefined) {
        await this.page.locator('#targetZ').fill(String(target.z));
      }
    }
  }

  /**
   * Click the calculate button and wait for result
   */
  async calculate() {
    await this.page.locator('#calculate').click();
    // Wait for output to be visible
    await this.page.locator('#output').waitFor({ state: 'visible' });
  }

  /**
   * Click the reset button to clear all inputs
   */
  async clear() {
    await this.page.locator('#reset').click();
  }

  /**
   * Get the result values from the output element
   * @returns {Object} Parsed result values
   */
  async getResult() {
    const outputElement = this.page.locator('#output');
    const text = await outputElement.textContent();
    
    // Parse common result patterns (direction, elevation, fuse)
    const result = {};
    
    // Look for direction value
    const directionMatch = text.match(/[Dd]irection[:\s]+([0-9.]+)/);
    if (directionMatch) {
      result.direction = parseFloat(directionMatch[1]);
    }
    
    // Look for elevation value
    const elevationMatch = text.match(/[Ee]levation[:\s]+([0-9.]+)/);
    if (elevationMatch) {
      result.elevation = parseFloat(elevationMatch[1]);
    }
    
    // Look for fuse value
    const fuseMatch = text.match(/[Ff]use[:\s]+([0-9.]+)/);
    if (fuseMatch) {
      result.fuse = parseFloat(fuseMatch[1]);
    }
    
    result.raw = text;
    return result;
  }

  /**
   * Check if the result is successful
   * @returns {boolean} True if result has success class
   */
  async isInRange() {
    const outputElement = this.page.locator('#output');
    const classes = await outputElement.getAttribute('class');
    return classes && classes.includes('success');
  }

  /**
   * Get error message if result shows error
   * @returns {string|null} Error message or null if no error
   */
  async getErrorMessage() {
    const outputElement = this.page.locator('#output');
    const classes = await outputElement.getAttribute('class');
    
    if (!classes || !classes.includes('error')) {
      return null;
    }
    
    const text = await outputElement.textContent();
    return text;
  }

  /**
   * Open the share modal
   */
  async openShareModal() {
    await this.page.locator('#shareBtn').click();
  }

  /**
   * Close the share modal (assumes escape key or close button)
   */
  async closeShareModal() {
    await this.page.keyboard.press('Escape');
  }

  /**
   * Get all history items as an array
   * @returns {Array<string>} Array of history item texts
   */
  async getHistoryItems() {
    const historyList = this.page.locator('#historyList');
    const items = await historyList.locator('.history-item').allTextContents();
    return items;
  }

  /**
   * Select a history item by index
   * @param {number} index - The index of the history item to select
   */
  async selectHistoryItem(index) {
    const historyItems = this.page.locator('#historyList .history-item');
    await historyItems.nth(index).click();
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    await this.page.locator('#clearHistoryBtn').click();
  }

  /**
   * Enable FFE (Fire For Effect)
   */
  async enableFFE() {
    const ffeEnabledCheckbox = this.page.locator('#ffeEnabled');
    const isChecked = await ffeEnabledCheckbox.isChecked();
    if (!isChecked) {
      await ffeEnabledCheckbox.click();
    }
  }

  /**
   * Generate FFE with specified parameters
   * @param {string} pattern - FFE pattern (e.g., 'linear', 'circular')
   * @param {number} rounds - Number of rounds
   * @param {number} spacing - Spacing between rounds
   */
  async generateFFE(pattern, rounds, spacing) {
    // Ensure FFE is enabled first
    await this.enableFFE();

    // Fill FFE parameters
    await this.page.locator('#ffePattern').selectOption(pattern);
    await this.page.locator('#ffeRounds').fill(String(rounds));
    await this.page.locator('#ffeSpacing').fill(String(spacing));

    // Click generate button
    await this.page.locator('#generateFFE').click();
    
    // Wait for FFE widget to update
    await this.page.locator('#ffeWidget').waitFor({ state: 'visible' });
  }

  /**
   * Apply fire corrections
   * @param {number} lr - Left/Right correction
   * @param {number} ad - Add/Drop correction
   */
  async applyCorrection(lr, ad) {
    // Wait for widget to be visible and stable
    await this.page.locator('#fireCorrectionWidget').waitFor({ state: 'visible', timeout: 5000 });
    
    // Fill correction values using evaluate to avoid fill() event issues
    await this.page.evaluate(({lr, ad}) => {
      const lrInput = document.getElementById('correctionLR');
      const adInput = document.getElementById('correctionAD');
      if (lrInput) {
        lrInput.value = lr;
        lrInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (adInput) {
        adInput.value = ad;
        adInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }, { lr: String(lr), ad: String(ad) });

    // Wait for button to become enabled (values need to trigger input event)
    await this.page.locator('#correctionLR').press('Tab');
    await this.page.waitForTimeout(200);

    // Wait for apply button to be enabled
    const applyButton = this.page.locator('#applyCorrection');
    await applyButton.waitFor({ state: 'visible' });
    
    // Wait until button is not disabled
    await this.page.waitForFunction(() => {
      const btn = document.querySelector('#applyCorrection');
      return btn && !btn.disabled;
    }, { timeout: 5000 });

    // Apply corrections
    await applyButton.click();
    
    // Wait for recalculation to complete - output should have success class
    await this.page.locator('#output.success').waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Enable observer/target mode with observer coordinates
   * @param {number} observerX - Observer grid X coordinate
   * @param {number} observerY - Observer grid Y coordinate
   */
  async enableOTMode(observerX, observerY) {
    // Enable FO mode via checkbox click
    const foEnabledCheckbox = this.page.locator('#foEnabled');
    const isChecked = await foEnabledCheckbox.isChecked();
    if (!isChecked) {
      await foEnabledCheckbox.click();
      await this.page.waitForTimeout(200);
    }

    // Wait for foControls to become visible
    await this.page.locator('#foControls').waitFor({ state: 'visible', timeout: 5000 });
    
    // Wait for observer grid mode to have active class
    await this.page.waitForFunction(() => {
      const observerGridMode = document.querySelector('#observerGridMode');
      return observerGridMode && observerGridMode.classList.contains('active');
    }, { timeout: 5000 });
    
    // Fill observer coordinates using evaluate to avoid triggering fill events
    // that might cause widget destruction
    await this.page.evaluate(({x, y}) => {
      const gridX = document.getElementById('observerGridX');
      const gridY = document.getElementById('observerGridY');
      if (gridX) gridX.value = x;
      if (gridY) gridY.value = y;
      // Dispatch input event to trigger bearing calculation
      if (gridX) gridX.dispatchEvent(new Event('input', { bubbles: true }));
      if (gridY) gridY.dispatchEvent(new Event('input', { bubbles: true }));
    }, { x: String(observerX), y: String(observerY) });
    
    await this.page.waitForTimeout(100);
  }

  /**
   * Get the current state of the calculator
   * @returns {Object} State object with current values
   */
  async getState() {
    const state = {
      weapon: await this.page.locator('#mortarType').inputValue(),
      shell: await this.page.locator('#shellType').inputValue(),
    };
    return state;
  }

  /**
   * Wait for the output element to be visible with a specific class
   * @param {string} className - Class name to wait for ('success' or 'error')
   * @param {number} timeout - Timeout in milliseconds
   */
  async waitForResult(className = 'success', timeout = 5000) {
    const outputElement = this.page.locator(`#output.${className}`);
    await outputElement.waitFor({ state: 'visible', timeout });
  }

  /**
   * Fill and submit a complete calculation in one call
   * @param {Object} config - Configuration object
   * @param {string} config.weapon - Weapon ID
   * @param {string} config.shell - Shell ID
   * @param {Object} config.gun - Gun coordinates {x, y, z}
   * @param {Object} config.target - Target coordinates {x, y, z}
   * @param {boolean} config.useMeters - Use meters mode instead of grid
   */
  async calculate_complete(config) {
    if (config.weapon) {
      await this.selectWeapon(config.weapon);
    }
    if (config.shell) {
      await this.selectShell(config.shell);
    }

    if (config.useMeters) {
      await this.toggleToMetersMode();
      await this.enterMetersCoords(config.gun, config.target);
    } else {
      await this.enterGridCoords(config.gun, config.target);
    }

    await this.calculate();
  }
}
