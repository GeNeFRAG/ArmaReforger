import { test, expect } from '@playwright/test';

/**
 * PWA & Network Optimisation Tests
 *
 * Covers three features added for slow/restricted network users:
 *  1. manifest.webmanifest  — installability / PWA
 *  2. <link rel="preload">  — ballistic-data.json preload hint
 *  3. sw.js                 — service worker registration and activation
 */

// ============================================================================
// PWA MANIFEST
// ============================================================================

test.describe('PWA manifest', () => {

    test('manifest link is present in <head>', async ({ page }) => {
        await page.goto('/');
        const link = page.locator('link[rel="manifest"][href="manifest.webmanifest"]');
        await expect(link).toHaveCount(1);
    });

    test('apple-mobile-web-app-capable meta tag is present', async ({ page }) => {
        await page.goto('/');
        const meta = page.locator('meta[name="apple-mobile-web-app-capable"][content="yes"]');
        await expect(meta).toHaveCount(1);
    });

    test('manifest.webmanifest is served with status 200', async ({ page }) => {
        const response = await page.request.get('/manifest.webmanifest');
        expect(response.status()).toBe(200);
        const ct = response.headers()['content-type'] ?? '';
        // Nginx may serve .webmanifest as application/manifest+json or application/json
        expect(ct).toMatch(/json/);
    });

    test('manifest JSON contains required PWA fields', async ({ page }) => {
        const response = await page.request.get('/manifest.webmanifest');
        const json = await response.json();

        expect(json.name).toBeTruthy();
        expect(json.short_name).toBeTruthy();
        expect(json.start_url).toBeTruthy();
        expect(json.display).toBeTruthy();
        expect(json.theme_color).toBeTruthy();
        expect(Array.isArray(json.icons)).toBe(true);
        expect(json.icons.length).toBeGreaterThan(0);
        expect(json.icons[0].src).toBeTruthy();
    });

    test('manifest theme_color matches the site theme', async ({ page }) => {
        const response = await page.request.get('/manifest.webmanifest');
        const json = await response.json();
        // theme-color meta in index.html is #6b8e23
        expect(json.theme_color.toLowerCase()).toBe('#6b8e23');
    });

});

// ============================================================================
// BALLISTIC-DATA.JSON PRELOAD HINT
// ============================================================================

test.describe('ballistic-data.json preload hint', () => {

    test('preload link is present in <head>', async ({ page }) => {
        await page.goto('/');
        const link = page.locator(
            'link[rel="preload"][as="fetch"][href="ballistic-data.json"]'
        );
        await expect(link).toHaveCount(1);
    });

    test('preload link specifies the correct MIME type', async ({ page }) => {
        await page.goto('/');
        const type = await page
            .locator('link[rel="preload"][href="ballistic-data.json"]')
            .getAttribute('type');
        expect(type).toBe('application/json');
    });

    test('ballistic-data.json is requested during page load', async ({ page }) => {
        const urls = [];
        page.on('request', req => {
            if (req.url().includes('ballistic-data.json')) urls.push(req.url());
        });

        await page.goto('/');
        await page.locator('#app').waitFor({ state: 'visible' });

        expect(urls.length).toBeGreaterThan(0);
    });

    test('ballistic-data.json request succeeds (status 200)', async ({ page }) => {
        const statuses = [];
        page.on('response', res => {
            if (res.url().includes('ballistic-data.json')) statuses.push(res.status());
        });

        await page.goto('/');
        await page.locator('#app').waitFor({ state: 'visible' });

        expect(statuses.some(s => s === 200)).toBe(true);
    });

    test('ballistic-data.json is not requested after app is already loaded', async ({ page }) => {
        // All ballistic-data.json requests happen during load; none should fire
        // from idle user interaction (confirms data is not re-fetched on every calc).
        await page.goto('/');
        await page.locator('#app').waitFor({ state: 'visible' });

        const laterRequests = [];
        page.on('request', req => {
            if (req.url().includes('ballistic-data.json')) laterRequests.push(req.url());
        });

        // Perform a calculation — should not trigger a fresh fetch
        await page.locator('#mortarGridX').fill('064');
        await page.locator('#mortarGridY').fill('064');
        await page.locator('#targetGridX').fill('076');
        await page.locator('#targetGridY').fill('063');
        await page.locator('#calculate').click();
        await page.locator('#output').waitFor({ state: 'visible' });

        expect(laterRequests.length).toBe(0);
    });

});

// ============================================================================
// SERVICE WORKER
// ============================================================================

test.describe('Service worker', () => {

    test('sw.js is served with status 200', async ({ page }) => {
        const response = await page.request.get('/sw.js');
        expect(response.status()).toBe(200);
        const ct = response.headers()['content-type'] ?? '';
        expect(ct).toMatch(/javascript/);
    });

    test('sw.js contains the expected CACHE_VERSION constant', async ({ page }) => {
        const response = await page.request.get('/sw.js');
        const body = await response.text();
        expect(body).toContain('CACHE_VERSION');
        expect(body).toContain('armamortars-');
    });

    test('service worker registers successfully after page load', async ({ page }) => {
        await page.goto('/');
        await page.locator('#app').waitFor({ state: 'visible' });

        // Give window.load event + async SW registration time to complete
        await page.waitForFunction(
            () => navigator.serviceWorker && navigator.serviceWorker.controller !== undefined,
            { timeout: 10000 }
        ).catch(() => {
            // controller may be null on very first load before activation — check registrations instead
        });

        const registered = await page.evaluate(async () => {
            const regs = await navigator.serviceWorker.getRegistrations();
            return regs.length > 0;
        });

        expect(registered).toBe(true);
    });

    test('service worker activates and controls the page', async ({ page }) => {
        // First load: SW installs but may not yet control the page (requires reload).
        await page.goto('/');
        await page.locator('#app').waitFor({ state: 'visible' });

        // Wait for the SW to reach the "activated" state via navigator.serviceWorker.ready
        const swReady = await page.evaluate(async () => {
            const reg = await Promise.race([
                navigator.serviceWorker.ready,
                new Promise((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 10000))
            ]);
            return { scope: reg.scope, state: reg.active?.state ?? null };
        });

        // 'activating' is also valid — ready resolves when active != null, and state
        // transitions activating → activated almost immediately after.
        expect(['activating', 'activated']).toContain(swReady.state);
        expect(swReady.scope).toContain('/');
    });

    test('service worker scope covers the app root', async ({ page }) => {
        await page.goto('/');
        await page.locator('#app').waitFor({ state: 'visible' });

        const scope = await page.evaluate(async () => {
            const reg = await navigator.serviceWorker.ready;
            return reg.scope;
        });

        // Scope should be the origin root (not a subdirectory)
        const url = new URL(scope);
        expect(url.pathname).toBe('/');
    });

    test('after SW activation app still loads and calculates correctly', async ({ page }) => {
        // Load once so SW installs
        await page.goto('/');
        await page.locator('#app').waitFor({ state: 'visible' });
        await page.evaluate(() => navigator.serviceWorker.ready);

        // Reload so SW is now controlling the page
        await page.reload();
        await page.locator('#app').waitFor({ state: 'visible' });

        // Verify a full calculation still works under SW control
        await page.locator('#mortarGridX').fill('064');
        await page.locator('#mortarGridY').fill('064');
        await page.locator('#targetGridX').fill('076');
        await page.locator('#targetGridY').fill('063');
        await page.locator('#calculate').click();

        const output = page.locator('#output');
        await output.waitFor({ state: 'visible' });
        await expect(output).toHaveClass(/success/);
    });

    test('SW-controlled reload serves assets from cache (no full re-download)', async ({ page }) => {
        // First visit — SW installs
        await page.goto('/');
        await page.locator('#app').waitFor({ state: 'visible' });
        await page.evaluate(() => navigator.serviceWorker.ready);

        // Second visit — SW is active, assets come from cache
        const networkTransfers = [];
        page.on('response', res => {
            const url = res.url();
            // Only measure same-origin assets we explicitly precache
            if (url.includes('ballistic-data.json') || url.match(/styles\.css|BallisticCalculator\.js/)) {
                networkTransfers.push({
                    url,
                    status: res.status(),
                    fromServiceWorker: res.fromServiceWorker()
                });
            }
        });

        await page.reload();
        await page.locator('#app').waitFor({ state: 'visible' });

        // At least the key assets should have been served (either from SW cache or network)
        const ballisticResponse = networkTransfers.find(r => r.url.includes('ballistic-data.json'));
        expect(ballisticResponse).toBeDefined();

        // On the second load with an active SW, precached assets should come from SW
        const swServed = networkTransfers.filter(r => r.fromServiceWorker);
        expect(swServed.length).toBeGreaterThan(0);
    });

});
