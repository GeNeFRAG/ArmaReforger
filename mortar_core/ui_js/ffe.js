/**
 * Fire for Effect (FFE) Module
 * Handles FFE controls, patterns, and sheaf configurations
 * Version: 1.7.0
 */

import { setDisplay } from './utils.js';
import { getElement, setValue } from './dom-cache.js';

/**
 * Get FFE control DOM elements
 * @returns {Object} Object containing references to FFE control elements
 */
export function getFFEControls() {
    return {
        enabled: getElement('ffeEnabled', false),
        controls: getElement('ffeControls', false),
        pattern: getElement('ffePattern', false),
        spacingGroup: getElement('ffeSpacingGroup', false),
        radiusGroup: getElement('ffeRadiusGroup', false)
    };
}

/**
 * Reset Fire for Effect controls to defaults
 */
export function resetFFEControls() {
    const ffe = getFFEControls();
    if (!ffe.enabled) return;
    
    ffe.enabled.checked = false;
    setDisplay(ffe.controls, false);
    ffe.pattern.value = 'perpendicular';
    setValue('ffeRounds', '5');
    setValue('ffeSpacing', '50');
    setValue('ffeRadius', '100');
    setDisplay(ffe.spacingGroup, true);
    setDisplay(ffe.radiusGroup, false);
}

/**
 * Toggle FFE controls visibility based on checkbox state
 * @param {HTMLInputElement} checkbox - FFE enabled checkbox
 */
export function toggleFFEControls(checkbox) {
    const ffe = getFFEControls();
    if (ffe.controls) {
        setDisplay(ffe.controls, checkbox.checked);
    }
}

/**
 * Handle FFE pattern change - show appropriate spacing/radius controls
 */
export function handleFFEPatternChange() {
    const ffe = getFFEControls();
    const pattern = ffe.pattern.value;
    const isCircular = pattern === 'circular';
    
    setDisplay(ffe.spacingGroup, !isCircular);
    setDisplay(ffe.radiusGroup, isCircular);
}

/**
 * Initialize FFE module - set up event listeners
 */
export function initFFE() {
    const ffeEnabled = getElement('ffeEnabled', false);
    const ffePattern = getElement('ffePattern', false);
    
    if (ffeEnabled) {
        ffeEnabled.addEventListener('change', (e) => {
            toggleFFEControls(e.target);
        });
    }
    
    if (ffePattern) {
        ffePattern.addEventListener('change', handleFFEPatternChange);
    }
}

// Export for window object (backward compatibility with onclick handlers)
export function exposeToWindow() {
    window.resetFFEControls = resetFFEControls;
    window.toggleFFEControls = toggleFFEControls;
}
