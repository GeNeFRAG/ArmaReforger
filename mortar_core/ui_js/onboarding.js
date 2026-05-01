import { getElement } from './dom-cache.js';

const STORAGE_KEY = 'mortar_app_onboarding_seen';

function hasSeenOnboarding() {
    try {
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
        return true; // fail-open: don't show banner if storage is unavailable
    }
}

function markSeen() {
    try {
        localStorage.setItem(STORAGE_KEY, '1');
    } catch (e) {
        if (e.name !== 'QuotaExceededError' && e.name !== 'SecurityError') {
            console.error('Failed to save onboarding state:', e);
        }
    }
}

export function init() {
    const intro = getElement('onboardingIntro', false);
    const dismissBtn = getElement('dismissOnboarding', false);
    if (!intro || !dismissBtn) return;

    if (!hasSeenOnboarding()) {
        intro.classList.remove('cls-hidden');
    }

    dismissBtn.addEventListener('click', () => {
        markSeen();
        intro.classList.add('cls-hidden');
    });
}
