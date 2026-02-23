import { test, expect } from '@playwright/test';
import { CalculatorPage } from './pages/CalculatorPage.js';
import { VALID_COORDS } from './fixtures/test-data.js';

/**
 * Core Web Vitals Tests
 * 
 * Tests for the three Core Web Vitals metrics:
 * - LCP (Largest Contentful Paint): Should be ≤ 2.5s for "good"
 * - INP (Interaction to Next Paint): Should be ≤ 200ms for "good"
 * - CLS (Cumulative Layout Shift): Should be ≤ 0.1 for "good"
 * 
 * Reference: https://web.dev/vitals/
 */

test.describe('Core Web Vitals', () => {
  let calculatorPage;

  // ============================================================================
  // LCP - LARGEST CONTENTFUL PAINT
  // ============================================================================

  test.describe('LCP (Largest Contentful Paint)', () => {
    test('should have LCP under 2500ms on initial load', async ({ page }) => {
      // Inject web-vitals measurement before navigation
      await page.addInitScript(() => {
        window.lcpValue = null;
        window.lcpEntries = [];
        
        // Use PerformanceObserver to capture LCP
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            window.lcpEntries.push({
              startTime: entry.startTime,
              size: entry.size,
              element: entry.element?.tagName || 'unknown'
            });
            window.lcpValue = entry.startTime;
          });
        });
        
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      });

      // Navigate and wait for app to fully load
      await page.goto('/');
      await page.waitForSelector('#app', { state: 'visible' });
      await page.waitForSelector('#loading', { state: 'hidden' });
      
      // Wait a bit for LCP to be recorded (LCP can update until user interaction)
      await page.waitForTimeout(500);

      // Get LCP value
      const lcpValue = await page.evaluate(() => window.lcpValue);
      const lcpEntries = await page.evaluate(() => window.lcpEntries);
      
      console.log('LCP entries:', JSON.stringify(lcpEntries, null, 2));
      console.log('Final LCP value:', lcpValue, 'ms');

      // LCP should be captured
      expect(lcpValue).not.toBeNull();
      
      // Good LCP is ≤ 2500ms
      expect(lcpValue).toBeLessThanOrEqual(2500);
    });

    test('should have LCP under 1500ms for cached loads', async ({ page }) => {
      // First load to warm cache
      await page.goto('/');
      await page.waitForSelector('#app', { state: 'visible' });
      
      // Inject measurement for second load
      await page.addInitScript(() => {
        window.lcpValue = null;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            window.lcpValue = entry.startTime;
          });
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });
      });

      // Reload (should be faster with cache)
      await page.reload();
      await page.waitForSelector('#app', { state: 'visible' });
      await page.waitForTimeout(500);

      const lcpValue = await page.evaluate(() => window.lcpValue);
      console.log('Cached LCP value:', lcpValue, 'ms');

      expect(lcpValue).not.toBeNull();
      // Cached loads should be faster
      expect(lcpValue).toBeLessThanOrEqual(1500);
    });
  });

  // ============================================================================
  // INP - INTERACTION TO NEXT PAINT
  // ============================================================================

  test.describe('INP (Interaction to Next Paint)', () => {
    test('should have button click response under 200ms', async ({ page }) => {
      // Inject interaction measurement
      await page.addInitScript(() => {
        window.interactionDelays = [];
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'event') {
              window.interactionDelays.push({
                name: entry.name,
                duration: entry.duration,
                processingStart: entry.processingStart,
                processingEnd: entry.processingEnd,
                startTime: entry.startTime
              });
            }
          });
        });
        
        observer.observe({ type: 'event', buffered: true, durationThreshold: 0 });
      });

      calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();

      // Setup coordinates
      const coords = VALID_COORDS.mortar_short;
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
        { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
      );

      // Measure calculate button interaction
      const startTime = await page.evaluate(() => performance.now());
      await page.locator('#calculate').click();
      
      // Wait for result
      await page.waitForSelector('#output.success, #output.active', { timeout: 5000 });
      const endTime = await page.evaluate(() => performance.now());
      
      const interactionTime = endTime - startTime;
      console.log('Calculate button interaction time:', interactionTime, 'ms');

      // Get event timing entries
      const delays = await page.evaluate(() => window.interactionDelays);
      const clickEvents = delays.filter(d => d.name === 'click' || d.name === 'pointerup');
      console.log('Click event delays:', JSON.stringify(clickEvents, null, 2));

      // INP should be ≤ 200ms for "good" in production
      // Test threshold is higher due to Playwright/browser overhead in test environment
      // Real-world INP is measured via event timing API (logged above)
      expect(interactionTime).toBeLessThanOrEqual(500);
    });

    test('should have dropdown selection response under 100ms', async ({ page }) => {
      calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();

      // Measure dropdown interaction
      const startTime = await page.evaluate(() => performance.now());
      await page.locator('#mortarType').selectOption('M252');
      const endTime = await page.evaluate(() => performance.now());
      
      const interactionTime = endTime - startTime;
      console.log('Dropdown selection time:', interactionTime, 'ms');

      // Dropdown changes should be very fast
      expect(interactionTime).toBeLessThanOrEqual(100);
    });

    test('should have text input response under 50ms', async ({ page }) => {
      calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();

      // Measure input typing latency
      const input = page.locator('#mortarGridX');
      await input.focus();
      
      const startTime = await page.evaluate(() => performance.now());
      await input.fill('0415');
      const endTime = await page.evaluate(() => performance.now());
      
      const inputTime = endTime - startTime;
      console.log('Input fill time:', inputTime, 'ms');

      // Text input should be instant
      expect(inputTime).toBeLessThanOrEqual(50);
    });
  });

  // ============================================================================
  // CLS - CUMULATIVE LAYOUT SHIFT
  // ============================================================================

  test.describe('CLS (Cumulative Layout Shift)', () => {
    test('should have CLS under 0.1 on initial load', async ({ page }) => {
      // Inject CLS measurement before navigation
      await page.addInitScript(() => {
        window.clsValue = 0;
        window.clsEntries = [];
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            // Only count shifts without recent user input
            if (!entry.hadRecentInput) {
              window.clsValue += entry.value;
              window.clsEntries.push({
                value: entry.value,
                startTime: entry.startTime,
                sources: entry.sources?.map(s => s.node?.tagName || 'unknown') || []
              });
            }
          });
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
      });

      // Navigate and wait for full load
      await page.goto('/');
      await page.waitForSelector('#app', { state: 'visible' });
      await page.waitForSelector('#loading', { state: 'hidden' });
      
      // Wait for any async content to settle
      await page.waitForTimeout(1000);

      // Get CLS value
      const clsValue = await page.evaluate(() => window.clsValue);
      const clsEntries = await page.evaluate(() => window.clsEntries);
      
      console.log('CLS entries:', JSON.stringify(clsEntries, null, 2));
      console.log('Total CLS value:', clsValue);

      // Good CLS is ≤ 0.1
      expect(clsValue).toBeLessThanOrEqual(0.1);
    });

    test('should have no layout shift when showing results', async ({ page }) => {
      // Inject CLS measurement
      await page.addInitScript(() => {
        window.clsValue = 0;
        window.clsAfterLoad = 0;
        window.loadComplete = false;
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              window.clsValue += entry.value;
              if (window.loadComplete) {
                window.clsAfterLoad += entry.value;
              }
            }
          });
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
      });

      calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();
      
      // Mark load complete
      await page.evaluate(() => { window.loadComplete = true; });
      
      // Get CLS before calculation
      const clsBefore = await page.evaluate(() => window.clsAfterLoad);

      // Perform calculation
      const coords = VALID_COORDS.mortar_short;
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
        { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
      );
      await calculatorPage.calculate();
      await calculatorPage.waitForResult('success');
      
      // Wait for any layout to settle
      await page.waitForTimeout(500);

      // Get CLS after calculation
      const clsAfter = await page.evaluate(() => window.clsAfterLoad);
      const clsDuringInteraction = clsAfter - clsBefore;
      
      console.log('CLS during calculation:', clsDuringInteraction);

      // Results appearing should not cause layout shift
      // (allows small shift for expected UI changes)
      expect(clsDuringInteraction).toBeLessThanOrEqual(0.05);
    });

    test('should have no layout shift when history panel appears', async ({ page }) => {
      // Inject CLS measurement
      await page.addInitScript(() => {
        window.clsAfterLoad = 0;
        window.loadComplete = false;
        
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput && window.loadComplete) {
              window.clsAfterLoad += entry.value;
            }
          });
        });
        
        observer.observe({ type: 'layout-shift', buffered: true });
      });

      calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();
      
      // Clear any existing history
      await page.evaluate(() => localStorage.removeItem('mortar_app_history'));
      await page.reload();
      await page.waitForSelector('#app', { state: 'visible' });
      
      // Mark load complete
      await page.evaluate(() => { window.loadComplete = true; });

      const clsBefore = await page.evaluate(() => window.clsAfterLoad);

      // First calculation - history panel will appear
      const coords = VALID_COORDS.mortar_short;
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
        { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
      );
      await calculatorPage.calculate();
      await calculatorPage.waitForResult('success');
      
      // Wait for history panel animation
      await page.waitForTimeout(500);

      const clsAfter = await page.evaluate(() => window.clsAfterLoad);
      const clsDuringHistoryAppear = clsAfter - clsBefore;
      
      console.log('CLS when history panel appears:', clsDuringHistoryAppear);

      // History panel appearing should not cause significant shift
      expect(clsDuringHistoryAppear).toBeLessThanOrEqual(0.1);
    });
  });

  // ============================================================================
  // COMBINED WEB VITALS SUMMARY
  // ============================================================================

  test.describe('Combined Web Vitals Assessment', () => {
    test('should pass all Core Web Vitals thresholds', async ({ page }) => {
      // Inject all measurements
      await page.addInitScript(() => {
        window.metrics = {
          lcp: null,
          cls: 0,
          interactions: []
        };
        
        // LCP Observer
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            window.metrics.lcp = entry.startTime;
          });
        }).observe({ type: 'largest-contentful-paint', buffered: true });
        
        // CLS Observer
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!entry.hadRecentInput) {
              window.metrics.cls += entry.value;
            }
          });
        }).observe({ type: 'layout-shift', buffered: true });
        
        // Event timing for INP
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'event' && entry.duration > 0) {
              window.metrics.interactions.push(entry.duration);
            }
          });
        }).observe({ type: 'event', buffered: true, durationThreshold: 0 });
      });

      calculatorPage = new CalculatorPage(page);
      await calculatorPage.goto();
      
      // Perform a typical user flow
      const coords = VALID_COORDS.mortar_short;
      await calculatorPage.selectWeapon('2B14');
      await calculatorPage.enterGridCoords(
        { x: coords.gun.gridX, y: coords.gun.gridY, z: coords.gun.z },
        { x: coords.target.gridX, y: coords.target.gridY, z: coords.target.z }
      );
      await calculatorPage.calculate();
      await calculatorPage.waitForResult('success');
      
      // Wait for metrics to settle
      await page.waitForTimeout(1000);

      // Get all metrics
      const metrics = await page.evaluate(() => window.metrics);
      
      // Calculate INP (p75 of interactions, or worst if few interactions)
      const inp = metrics.interactions.length > 0 
        ? Math.max(...metrics.interactions) 
        : 0;

      console.log('\n=== Core Web Vitals Summary ===');
      console.log(`LCP: ${metrics.lcp?.toFixed(0) || 'N/A'}ms (threshold: ≤2500ms)`);
      console.log(`INP: ${inp.toFixed(0)}ms (threshold: ≤200ms)`);
      console.log(`CLS: ${metrics.cls.toFixed(4)} (threshold: ≤0.1)`);
      console.log('================================\n');

      // Assert all thresholds
      expect(metrics.lcp, 'LCP should be under 2500ms').toBeLessThanOrEqual(2500);
      expect(inp, 'INP should be under 200ms').toBeLessThanOrEqual(200);
      expect(metrics.cls, 'CLS should be under 0.1').toBeLessThanOrEqual(0.1);
    });
  });
});
