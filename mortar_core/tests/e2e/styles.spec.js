import { test, expect } from '@playwright/test';

/**
 * Stylesheet Loading Tests
 * 
 * Verifies that the external stylesheet is properly loaded and applied.
 */

test.describe('Stylesheet Loading', () => {

  test('should load styles.css successfully', async ({ page }) => {
    // Track network requests
    const stylesheetRequests = [];
    page.on('response', response => {
      if (response.url().includes('styles.css')) {
        stylesheetRequests.push({
          url: response.url(),
          status: response.status(),
          contentType: response.headers()['content-type']
        });
      }
    });

    await page.goto('/');
    await page.waitForSelector('#app', { state: 'visible' });

    // Verify stylesheet was requested and returned successfully
    expect(stylesheetRequests.length).toBeGreaterThan(0);
    expect(stylesheetRequests[0].status).toBe(200);
    expect(stylesheetRequests[0].contentType).toContain('text/css');
  });

  test('should have stylesheet link in document head', async ({ page }) => {
    await page.goto('/');
    
    // Check for stylesheet link element
    const stylesheetLink = await page.locator('link[rel="stylesheet"][href="styles.css"]');
    await expect(stylesheetLink).toHaveCount(1);
  });

  test('should apply basic styles from stylesheet', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#app', { state: 'visible' });

    // Verify body styles are applied (from styles.css)
    const bodyStyles = await page.evaluate(() => {
      const body = document.body;
      const computed = window.getComputedStyle(body);
      return {
        maxWidth: computed.maxWidth,
        color: computed.color,
        fontFamily: computed.fontFamily
      };
    });

    // Body should have max-width: 900px from stylesheet
    expect(bodyStyles.maxWidth).toBe('900px');
    
    // Body should have the text color from stylesheet (#e8e8e8 = rgb(232, 232, 232))
    expect(bodyStyles.color).toBe('rgb(232, 232, 232)');
    
    // Font family should be set
    expect(bodyStyles.fontFamily).toContain('Segoe UI');
  });

  test('should apply header styles', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.header', { state: 'visible' });

    const headerStyles = await page.evaluate(() => {
      const header = document.querySelector('.header');
      const computed = window.getComputedStyle(header);
      return {
        display: computed.display,
        borderBottom: computed.borderBottomStyle
      };
    });

    // Header should use flexbox
    expect(headerStyles.display).toBe('flex');
    
    // Header should have bottom border
    expect(headerStyles.borderBottom).toBe('solid');
  });

  test('should apply button styles', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('#reset', { state: 'visible' });

    // Use reset button which is always enabled
    const buttonStyles = await page.evaluate(() => {
      const button = document.querySelector('#reset');
      const computed = window.getComputedStyle(button);
      return {
        cursor: computed.cursor,
        fontWeight: computed.fontWeight,
        textTransform: computed.textTransform
      };
    });

    // Button should have pointer cursor
    expect(buttonStyles.cursor).toBe('pointer');
    
    // Button should have bold text (600)
    expect(buttonStyles.fontWeight).toBe('600');
    
    // Button text should be uppercase
    expect(buttonStyles.textTransform).toBe('uppercase');
  });

  test('should apply container styles', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.container', { state: 'visible' });

    const containerStyles = await page.evaluate(() => {
      const container = document.querySelector('.container');
      const computed = window.getComputedStyle(container);
      return {
        padding: computed.padding,
        borderRadius: computed.borderRadius,
        width: computed.width
      };
    });

    // Container should have padding (25px from stylesheet)
    expect(containerStyles.padding).toBe('25px');
    
    // Container should have border-radius
    expect(containerStyles.borderRadius).toBe('4px');
  });

  test('should apply responsive styles on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForSelector('.row', { state: 'visible' });

    const rowStyles = await page.evaluate(() => {
      const row = document.querySelector('.row');
      const computed = window.getComputedStyle(row);
      return {
        gridTemplateColumns: computed.gridTemplateColumns
      };
    });

    // On mobile (< 600px), rows should be single column
    // gridTemplateColumns should be a single value (not "1fr 1fr")
    const columnCount = rowStyles.gridTemplateColumns.split(' ').filter(v => v !== '').length;
    expect(columnCount).toBe(1);
  });

  test('should not have any inline styles in head', async ({ page }) => {
    await page.goto('/');

    // Check that there are no <style> tags in the head (all CSS should be external)
    const inlineStyleCount = await page.evaluate(() => {
      return document.querySelectorAll('head style').length;
    });

    expect(inlineStyleCount).toBe(0);
  });
});
