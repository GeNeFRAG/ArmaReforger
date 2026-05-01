/**
 * E2E Tests for first-visit onboarding intro
 * Covers: shown on first visit, dismissed on click, persisted across reload
 */

import { test, expect } from '@playwright/test';

async function startFresh(page) {
    await page.goto('/');
    await page.locator('#app').waitFor({ state: 'visible' });
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.locator('#app').waitFor({ state: 'visible' });
    await page.locator('#loading').waitFor({ state: 'hidden' });
}

test.describe('Onboarding intro', () => {
    test('visible on first visit (no localStorage flag)', async ({ page }) => {
        await startFresh(page);
        await expect(page.locator('#onboardingIntro')).not.toHaveClass(/cls-hidden/);
    });

    test('hidden after clicking dismiss', async ({ page }) => {
        await startFresh(page);
        await page.locator('#dismissOnboarding').click();
        await expect(page.locator('#onboardingIntro')).toHaveClass(/cls-hidden/);
    });

    test('stays hidden after reload once dismissed', async ({ page }) => {
        await startFresh(page);
        await page.locator('#dismissOnboarding').click();

        await page.reload();
        await page.locator('#app').waitFor({ state: 'visible' });
        await page.locator('#loading').waitFor({ state: 'hidden' });

        await expect(page.locator('#onboardingIntro')).toHaveClass(/cls-hidden/);
        const flag = await page.evaluate(() => localStorage.getItem('mortar_app_onboarding_seen'));
        expect(flag).toBe('1');
    });
});
