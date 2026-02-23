import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { VALID_COORDS } from './fixtures/test-data.js';

test.describe('Mission History', () => {
  let calculatorPage;

  test.beforeEach(async ({ page }) => {
    calculatorPage = new CalculatorPage(page);
    await calculatorPage.goto();
  });

  // ============================================================================
  // HISTORY CREATION TESTS
  // ============================================================================

  test('should display history panel after first calculation', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - history panel should be visible
    const historyPanel = page.locator('#historyPanel');
    await expect(historyPanel).toBeVisible();
  });

  test('should add history entry after calculation', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - history should contain entry
    const historyItems = page.locator('#historyList .history-item');
    await expect(historyItems).toHaveCount(1);
  });

  test('should display timestamp on history entry', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - history entry should have timestamp
    const historyTime = page.locator('#historyList .history-time');
    await expect(historyTime).toBeVisible();
    const timeText = await historyTime.first().textContent();
    expect(timeText).toBeTruthy();
    // Should contain time-like content (HH:MM or similar)
    expect(timeText).toMatch(/\d+[:\-\s]/);
  });

  test('should display mission details on history entry', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - history entry should display weapon and coordinates
    const historyItem = page.locator('#historyList .history-item').first();
    const itemText = await historyItem.textContent();
    
    // Should contain weapon info
    expect(itemText).toMatch(/2B14|weapon|mortar/i);
    // Should contain coordinate info
    expect(itemText).toMatch(/\d+/);
  });

  // ============================================================================
  // MULTIPLE MISSIONS TESTS
  // ============================================================================

  test('should add multiple history entries', async ({ page }) => {
    // Setup
    const coords1 = VALID_COORDS.mortar_short;
    const coords2 = VALID_COORDS.howitzer_medium;

    // Execute - First calculation
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords1.gun.gridX, y: coords1.gun.gridY, z: coords1.gun.z },
      { x: coords1.target.gridX, y: coords1.target.gridY, z: coords1.target.z }
    );
    await calculatorPage.calculate();

    // Clear and execute second calculation
    await calculatorPage.clear();
    await calculatorPage.selectWeapon('D30');
    await calculatorPage.enterGridCoords(
      { x: coords2.gun.gridX, y: coords2.gun.gridY, z: coords2.gun.z },
      { x: coords2.target.gridX, y: coords2.target.gridY, z: coords2.target.z }
    );
    await calculatorPage.calculate();

    // Verify - should have 2 history entries
    const historyItems = page.locator('#historyList .history-item');
    await expect(historyItems).toHaveCount(2);
  });

  test('should display newest entry first', async ({ page }) => {
    // Setup
    const coords1 = VALID_COORDS.mortar_short;
    const coords2 = VALID_COORDS.howitzer_medium;

    // Execute - First calculation with 2B14
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords1.gun.gridX, y: coords1.gun.gridY, z: coords1.gun.z },
      { x: coords1.target.gridX, y: coords1.target.gridY, z: coords1.target.z }
    );
    await calculatorPage.calculate();

    // Clear and execute second calculation with D30
    await calculatorPage.clear();
    await calculatorPage.selectWeapon('D30');
    await calculatorPage.enterGridCoords(
      { x: coords2.gun.gridX, y: coords2.gun.gridY, z: coords2.gun.z },
      { x: coords2.target.gridX, y: coords2.target.gridY, z: coords2.target.z }
    );
    await calculatorPage.calculate();

    // Verify - first item in list should be D30 (most recent)
    const firstHistoryItem = page.locator('#historyList .history-item').first();
    const firstItemText = await firstHistoryItem.textContent();
    expect(firstItemText).toMatch(/D30|D-30|howitzer/i);
  });

  // ============================================================================
  // RESTORE TESTS
  // ============================================================================

  test('should restore mission when history item clicked', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute - Calculate first mission
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Get first result state
    const firstResult = await calculatorPage.getResult();
    expect(firstResult.raw).toBeTruthy();

    // Clear and enter different values
    await calculatorPage.clear();
    await calculatorPage.selectWeapon('M252');
    const clearInputGunX = await page.locator('#mortarGridX').inputValue();
    expect(clearInputGunX).toBe('');

    // Click history item to restore
    await calculatorPage.selectHistoryItem(0);
    // Wait for inputs to be populated after restore
    await page.locator('#mortarGridX').waitFor({ state: 'visible' });
    await page.waitForTimeout(800); // Give time for form restoration and recalculation

    // Verify - inputs should be restored
    const restoredWeapon = await calculatorPage.getState();
    expect(restoredWeapon.weapon).toBe('2B14');
    
    const restoredGunX = await page.locator('#mortarGridX').inputValue();
    expect(restoredGunX).toBe(coords.gun.gridX);
    
    // Verify coordinates are also restored
    const restoredGunY = await page.locator('#mortarGridY').inputValue();
    expect(restoredGunY).toBe(coords.gun.gridY);
  });

  test('should recalculate solution when mission restored', async ({ page }) => {
    // Setup
    const coords1 = VALID_COORDS.mortar_short;
    const coords2 = VALID_COORDS.howitzer_medium;

    // Execute - First calculation
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords1.gun.gridX, y: coords1.gun.gridY, z: coords1.gun.z },
      { x: coords1.target.gridX, y: coords1.target.gridY, z: coords1.target.z }
    );
    await calculatorPage.calculate();
    await calculatorPage.waitForResult('success');
    const firstResult = await calculatorPage.getResult();

    // Second calculation with different weapon
    await calculatorPage.clear();
    await calculatorPage.selectWeapon('D30');
    await calculatorPage.enterGridCoords(
      { x: coords2.gun.gridX, y: coords2.gun.gridY, z: coords2.gun.z },
      { x: coords2.target.gridX, y: coords2.target.gridY, z: coords2.target.z }
    );
    await calculatorPage.calculate();
    await calculatorPage.waitForResult('success');
    const secondResult = await calculatorPage.getResult();

    // Verify results are different
    expect(firstResult.raw).not.toEqual(secondResult.raw);

    // Click history to restore first mission (oldest entry at index 1)
    await calculatorPage.selectHistoryItem(1);
    
    // Wait for inputs to be populated and recalculation to complete
    await page.locator('#mortarGridX').waitFor({ state: 'visible' });
    
    // Wait for the output to have content (either success or active class)
    await page.waitForFunction(() => {
      const output = document.querySelector('#output');
      return output && (output.classList.contains('success') || output.classList.contains('active')) && output.innerText.length > 0;
    }, { timeout: 15000 });

    // Verify - output should be a valid result
    const restoredResult = await calculatorPage.getResult();
    expect(restoredResult.raw).toBeTruthy();
    
    // Verify weapon was restored to first mission's weapon
    const restoredWeapon = await calculatorPage.getState();
    expect(restoredWeapon.weapon).toBe('2B14');
  });

  test('should highlight active history item', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute - Calculate
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Click history item to activate it
    await calculatorPage.selectHistoryItem(0);
    // Wait for restoration and highlight to be applied
    await page.locator('#mortarGridX').waitFor({ state: 'visible' });
    await page.waitForTimeout(800); // Give time for highlight and restoration

    // Verify - clicked item should have active class
    const historyItems = page.locator('#historyList .history-item');
    const activeItem = page.locator('#historyList .history-item.active');
    
    // Check that exactly one item has the active class
    await expect(activeItem).toHaveCount(1);
    
    // Verify it's the first item (the one we clicked)
    const firstItemText = await historyItems.first().textContent();
    const activeItemText = await activeItem.first().textContent();
    expect(firstItemText).toBe(activeItemText);
  });

  // ============================================================================
  // DELETE TESTS
  // ============================================================================

  test('should show delete button on history item', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;

    // Execute - Calculate
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - delete button should exist
    const deleteBtn = page.locator('#historyList .history-delete').first();
    await expect(deleteBtn).toBeVisible();
  });

  test('should remove entry when delete clicked', async ({ page }) => {
    // Setup
    const coords1 = VALID_COORDS.mortar_short;
    const coords2 = VALID_COORDS.howitzer_medium;

    // Execute - First calculation
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords1.gun.gridX, y: coords1.gun.gridY, z: coords1.gun.z },
      { x: coords1.target.gridX, y: coords1.target.gridY, z: coords1.target.z }
    );
    await calculatorPage.calculate();

    // Second calculation
    await calculatorPage.clear();
    await calculatorPage.selectWeapon('D30');
    await calculatorPage.enterGridCoords(
      { x: coords2.gun.gridX, y: coords2.gun.gridY, z: coords2.gun.z },
      { x: coords2.target.gridX, y: coords2.target.gridY, z: coords2.target.z }
    );
    await calculatorPage.calculate();

    // Verify - 2 items
    let historyItems = page.locator('#historyList .history-item');
    await expect(historyItems).toHaveCount(2);

    // Click delete on first item (most recent D30)
    const deleteBtn = page.locator('#historyList .history-delete').first();
    await deleteBtn.click();
    await page.waitForTimeout(500); // Give time for deletion to complete

    // Verify - should have 1 item left
    historyItems = page.locator('#historyList .history-item');
    await expect(historyItems).toHaveCount(1);

    // Remaining item should be 2B14
    const remainingText = await historyItems.first().textContent();
    expect(remainingText).toMatch(/2B14|mortar/i);
  });

  test('should clear all history when clear button clicked', async ({ page }) => {
    // Setup
    const coords1 = VALID_COORDS.mortar_short;
    const coords2 = VALID_COORDS.howitzer_medium;

    // Execute - First calculation
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords1.gun.gridX, y: coords1.gun.gridY, z: coords1.gun.z },
      { x: coords1.target.gridX, y: coords1.target.gridY, z: coords1.target.z }
    );
    await calculatorPage.calculate();
    await calculatorPage.waitForResult('success');

    // Second calculation
    await calculatorPage.clear();
    await calculatorPage.selectWeapon('D30');
    await calculatorPage.enterGridCoords(
      { x: coords2.gun.gridX, y: coords2.gun.gridY, z: coords2.gun.z },
      { x: coords2.target.gridX, y: coords2.target.gridY, z: coords2.target.z }
    );
    await calculatorPage.calculate();
    await calculatorPage.waitForResult('success');

    // Verify - 2 items in history
    let historyItems = page.locator('#historyList .history-item');
    await expect(historyItems).toHaveCount(2);

    // Click clear all button
    await calculatorPage.clearHistory();
    
    // Wait for DOM update - history panel should become hidden when empty
    await page.waitForTimeout(500);
    
    // The history panel hides when empty (has cls-hidden class)
    // So we check if either history is empty OR panel is hidden
    const historyPanel = page.locator('#historyPanel');
    const isHidden = await historyPanel.evaluate(el => el.classList.contains('cls-hidden'));
    
    if (isHidden) {
      // Panel is hidden = history was cleared
      expect(isHidden).toBe(true);
    } else {
      // Panel visible - verify no items
      historyItems = page.locator('#historyList .history-item');
      const count = await historyItems.count();
      expect(count).toBe(0);
    }
  });

  // ============================================================================
  // PERSISTENCE TESTS
  // ============================================================================

  test.describe('localStorage Persistence', () => {
    test.beforeEach(async ({ page }) => {
      // Clear localStorage before each persistence test to ensure isolation
      // Note: Parent beforeEach already navigated, so we clear and reload
      await page.evaluate(() => localStorage.removeItem('mortar_app_history'));
      await page.reload();
      await page.waitForSelector('#app', { state: 'visible' });
    });

    test('should persist history across page refresh', async ({ page }) => {
      // Setup
      const coords = VALID_COORDS.mortar_short;

      // Execute - Calculate
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
        { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
      );
      await calculatorPage.calculate();

      // Get history count before refresh
      const historyItemsBeforeRefresh = await page.locator('#historyList .history-item').count();
      expect(historyItemsBeforeRefresh).toBe(1);

      // Verify localStorage has the entry
      const storedBefore = await page.evaluate(() => localStorage.getItem('mortar_app_history'));
      expect(storedBefore).toBeTruthy();
      const parsedBefore = JSON.parse(storedBefore);
      expect(parsedBefore).toHaveLength(1);

      // Refresh page
      await page.reload();
      await page.waitForSelector('#app', { state: 'visible' });

      // Verify - history should still be there after refresh
      const historyItemsAfterRefresh = await page.locator('#historyList .history-item').count();
      expect(historyItemsAfterRefresh).toBe(1);
    });

    test('should persist deletion across page refresh', async ({ page }) => {
      // Setup
      const coords1 = VALID_COORDS.mortar_short;
      const coords2 = VALID_COORDS.howitzer_medium;

      // Add two entries
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords1.gun.gridX, y: coords1.gun.gridY, z: coords1.gun.z },
        { x: coords1.target.gridX, y: coords1.target.gridY, z: coords1.target.z }
      );
      await calculatorPage.calculate();

      await calculatorPage.clear();
      await calculatorPage.selectWeapon('D30');
      await calculatorPage.enterGridCoords(
        { x: coords2.gun.gridX, y: coords2.gun.gridY, z: coords2.gun.z },
        { x: coords2.target.gridX, y: coords2.target.gridY, z: coords2.target.z }
      );
      await calculatorPage.calculate();

      // Verify 2 items before deletion
      await expect(page.locator('#historyList .history-item')).toHaveCount(2);

      // Delete the first item (most recent D30)
      const deleteBtn = page.locator('#historyList .history-delete').first();
      await deleteBtn.click();
      await page.waitForTimeout(300);

      // Verify 1 item after deletion
      await expect(page.locator('#historyList .history-item')).toHaveCount(1);

      // Refresh page
      await page.reload();
      await page.waitForSelector('#app', { state: 'visible' });

      // Verify - deletion persisted (only 1 item, the 2B14)
      const historyItems = page.locator('#historyList .history-item');
      await expect(historyItems).toHaveCount(1);
      const remainingText = await historyItems.first().textContent();
      expect(remainingText).toMatch(/2B14|mortar/i);
    });

    test('should persist clear all across page refresh', async ({ page }) => {
      // Setup
      const coords = VALID_COORDS.mortar_short;

      // Add entry
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
        { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
      );
      await calculatorPage.calculate();
      await calculatorPage.waitForResult('success');

      // Clear all
      await calculatorPage.clearHistory();
      await page.waitForTimeout(300);

      // Verify localStorage is cleared
      const storedAfterClear = await page.evaluate(() => localStorage.getItem('mortar_app_history'));
      expect(storedAfterClear).toBeNull();

      // Refresh page
      await page.reload();
      await page.waitForSelector('#app', { state: 'visible' });

      // Verify - history panel should be hidden (no entries)
      const historyPanel = page.locator('#historyPanel');
      const isHidden = await historyPanel.evaluate(el => el.classList.contains('cls-hidden'));
      expect(isHidden).toBe(true);
    });

    test('should store correct JSON structure in localStorage', async ({ page }) => {
      // Setup
      const coords = VALID_COORDS.mortar_short;
      const customLabel = 'TEST_MISSION_STORAGE';

      // Add entry with custom label
      await page.locator('#missionLabel').fill(customLabel);
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
        { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
      );
      await calculatorPage.calculate();

      // Verify localStorage structure
      const stored = await page.evaluate(() => localStorage.getItem('mortar_app_history'));
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(1);
      
      const entry = parsed[0];
      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('timestamp');
      expect(entry).toHaveProperty('mortarType');
      expect(entry).toHaveProperty('mortarPos');
      expect(entry).toHaveProperty('targetPos');
      expect(entry.missionLabel).toBe(customLabel);
      
      // Timestamp should be ISO string
      expect(typeof entry.timestamp).toBe('string');
      expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
    });
  });

  // ============================================================================
  // MISSION LABELING TESTS
  // ============================================================================

  test('should display custom mission labels in history', async ({ page }) => {
    // Setup
    const coords = VALID_COORDS.mortar_short;
    const customLabel = 'TARGET_ALPHA_001';

    // Execute - Set custom label and calculate
    await page.locator('#missionLabel').fill(customLabel);
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
      { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
    );
    await calculatorPage.calculate();

    // Verify - history should show custom label
    const historyItem = page.locator('#historyList .history-item').first();
    const itemText = await historyItem.textContent();
    expect(itemText).toContain(customLabel);
  });

  test('should identify missions by custom labels when multiple exist', async ({ page }) => {
    // Setup
    const coords1 = VALID_COORDS.mortar_short;
    const coords2 = VALID_COORDS.howitzer_medium;
    const label1 = 'MISSION_ALPHA';
    const label2 = 'MISSION_BRAVO';

    // Execute - First mission with label
    await page.locator('#missionLabel').fill(label1);
    await calculatorPage.selectWeapon('2B14');
    await calculatorPage.enterGridCoords(
      { x: coords1.gun.gridX, y: coords1.gun.gridY, z: coords1.gun.z },
      { x: coords1.target.gridX, y: coords1.target.gridY, z: coords1.target.z }
    );
    await calculatorPage.calculate();

    // Second mission with different label
    await calculatorPage.clear();
    await page.locator('#missionLabel').fill(label2);
    await calculatorPage.selectWeapon('D30');
    await calculatorPage.enterGridCoords(
      { x: coords2.gun.gridX, y: coords2.gun.gridY, z: coords2.gun.z },
      { x: coords2.target.gridX, y: coords2.target.gridY, z: coords2.target.z }
    );
    await calculatorPage.calculate();

    // Verify - both labels are in history
    const historyItems = page.locator('#historyList .history-item');
    const firstItemText = await historyItems.first().textContent();
    const lastItemText = await historyItems.last().textContent();

    expect(firstItemText).toContain(label2);
    expect(lastItemText).toContain(label1);
  });
});
