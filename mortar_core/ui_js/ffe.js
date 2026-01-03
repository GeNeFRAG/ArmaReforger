/**
 * Fire for Effect (FFE) Module
 * Handles FFE widget, patterns, and sheaf configurations
 * Version: 2.0.0
 * 
 * Architecture: FFE is a post-calculation enhancement widget
 * - Shows after base solution is calculated
 * - Generates multi-round patterns on demand
 * - Can toggle between base solution and FFE pattern
 * - Not persisted in history (live calculation mode only)
 */

import { setDisplay } from './utils.js';
import { getElement, getValue, setValue } from './dom-cache.js';
import * as State from './state.js';
import * as CoordManager from './coord-manager.js';

// Injected dependencies (set via init)
let dependencies = {
    calculateSolution: null,
    parsePositionFromUI: null
};

// Cached solutions for toggle functionality
let cachedBaseSolutionHTML = null;
let cachedFFESolutionHTML = null;
let currentDisplayMode = 'base'; // 'base' or 'ffe'

/**
 * Initialize FFE module with dependencies
 * @param {Object} deps - Dependency injection container
 */
export function init(deps) {
    dependencies = { ...dependencies, ...deps };
}

/**
 * Get FFE widget DOM elements
 * @returns {Object} Object containing references to FFE widget elements
 */
export function getFFEControls() {
    return {
        widget: getElement('ffeWidget', false),
        pattern: getElement('ffePattern', false),
        rounds: getElement('ffeRounds', false),
        spacingGroup: getElement('ffeSpacingGroup', false),
        radiusGroup: getElement('ffeRadiusGroup', false),
        spacing: getElement('ffeSpacing', false),
        radius: getElement('ffeRadius', false),
        generateBtn: getElement('generateFFE', false, true),
        showBaseBtn: getElement('showBaseSolution', false, true)
    };
}

/**
 * Reset Fire for Effect widget to defaults
 */
export function resetFFEWidget() {
    const ffe = getFFEControls();
    const ffeContainer = getElement('ffeContainer', false);
    const ffeEnabledEl = getElement('ffeEnabled', false);
    
    if (ffeContainer) setDisplay(ffeContainer, false);
    if (!ffe.widget) return;
    
    setDisplay(ffe.widget, false);
    if (ffeEnabledEl) ffeEnabledEl.checked = false;
    if (ffe.pattern) ffe.pattern.value = 'perpendicular';
    if (ffe.rounds) ffe.rounds.value = '5';
    setValue('ffeSpacing', '50');
    setValue('ffeRadius', '100');
    setDisplay(ffe.spacingGroup, true);
    setDisplay(ffe.radiusGroup, false);
    setDisplay(ffe.showBaseBtn, false);
    
    // Clear cached solutions
    cachedBaseSolutionHTML = null;
    cachedFFESolutionHTML = null;
    currentDisplayMode = 'base';
}

/**
 * Show FFE container after successful calculation
 */
export function showFFEWidget() {
    const ffeContainer = getElement('ffeContainer', false);
    if (ffeContainer) {
        setDisplay(ffeContainer, true);
    }
}

/**
 * Hide FFE container and widget
 */
export function hideFFEWidget() {
    const ffeContainer = getElement('ffeContainer', false);
    const ffeWidget = getElement('ffeWidget', false);
    const ffeEnabledEl = getElement('ffeEnabled', false);
    
    if (ffeContainer) setDisplay(ffeContainer, false);
    if (ffeWidget) setDisplay(ffeWidget, false);
    if (ffeEnabledEl) ffeEnabledEl.checked = false;
}

/**
 * Handle FFE pattern change - show appropriate spacing/radius controls
 */
export function handleFFEPatternChange() {
    const ffe = getFFEControls();
    const pattern = ffe.pattern ? ffe.pattern.value : 'perpendicular';
    const isCircular = pattern === 'circular';
    
    setDisplay(ffe.spacingGroup, !isCircular);
    setDisplay(ffe.radiusGroup, isCircular);
}

/**
 * Generate FFE pattern from base solution
 */
export async function generateFFEPattern() {
    const output = getElement('output', false);
    if (!output) return;
    
    // Cache base solution if not already cached
    if (!cachedBaseSolutionHTML) {
        cachedBaseSolutionHTML = output.innerHTML;
    }
    
    const lastInput = State.getLastInput();
    if (!lastInput) {
        console.warn('No base solution available for FFE generation');
        return;
    }
    
    try {
        const ffePattern = getValue('ffePattern');
        const ffeRounds = parseInt(getValue('ffeRounds'));
        
        // Parse positions from UI using dependency
        if (!dependencies.parsePositionFromUI) {
            throw new Error('Position parser not available');
        }
        
        const mortarPos = dependencies.parsePositionFromUI('mortar');
        const targetPos = dependencies.parsePositionFromUI('target');
        
        const mortarParsed = MortarCalculator.parsePosition(mortarPos);
        const targetParsed = MortarCalculator.parsePosition(targetPos);
        
        let targetPositions;
        let patternParam;
        
        if (ffePattern === 'circular') {
            const ffeRadius = parseFloat(getValue('ffeRadius')) || 100;
            targetPositions = MortarCalculator.generateCircularPattern(targetParsed, ffeRadius, ffeRounds);
            patternParam = ffeRadius;
        } else {
            const ffeSpacing = parseFloat(getValue('ffeSpacing')) || 50;
            targetPositions = MortarCalculator.generateFireForEffectPattern(mortarParsed, targetParsed, ffePattern, ffeRounds, ffeSpacing);
            patternParam = ffeSpacing;
        }
        
        const ffeSolutions = [];
        const centerInput = MortarCalculator.prepareInput(mortarPos, targetParsed, lastInput.mortarType, lastInput.shellType);
        const centerSolutions = MortarCalculator.calculateAllTrajectories(centerInput);
        
        if (centerSolutions.length === 0 || !centerSolutions[0].inRange) {
            throw new Error('Center target out of range - cannot calculate FFE pattern');
        }
        
        const ffeCharge = centerSolutions[0].charge;
        
        targetPositions.forEach((pos, index) => {
            const input = MortarCalculator.prepareInput(mortarPos, pos, lastInput.mortarType, lastInput.shellType);
            input.chargeLevel = ffeCharge;
            const solutions = MortarCalculator.calculateAllTrajectories(input);
            if (solutions.length > 0 && solutions[0].inRange) {
                ffeSolutions.push({
                    roundNumber: index + 1,
                    targetPos: pos,
                    input: input,
                    solution: solutions[0]
                });
            }
        });
        
        const sortedFFE = MortarCalculator.sortFFESolutionsByAzimuth(ffeSolutions);
        
        if (sortedFFE.length > 0) {
            // Generate FFE HTML (import from calculator module)
            const { generateFFEDisplayHTML } = await import('./calculator.js');
            const ffeHTML = generateFFEDisplayHTML(sortedFFE, ffePattern, patternParam, ffeRounds);
            
            // Cache FFE solution
            cachedFFESolutionHTML = ffeHTML;
            currentDisplayMode = 'ffe';
            
            // Preserve FFE container and Fire Correction Widget when replacing output
            const ffeContainer = getElement('ffeContainer', false);
            const widget = getElement('fireCorrectionWidget', false);
            
            // Display FFE pattern
            output.innerHTML = ffeHTML;
            output.className = 'result active success';
            
            // Hide fire correction widget during FFE display (doesn't make sense)
            if (widget) {
                setDisplay(widget, false);
            }
            
            // Re-insert FFE container
            if (ffeContainer) {
                output.appendChild(ffeContainer);
            }
            
            // Show "Back to Base" button
            const ffe = getFFEControls();
            setDisplay(ffe.showBaseBtn, true);
        } else {
            throw new Error('No rounds in range for Fire for Effect pattern');
        }
    } catch (error) {
        console.error('FFE generation error:', error);
        // Show error in output instead of alert
        const output = getElement('output', false);
        if (output) {
            output.className = 'result active error';
            output.innerHTML = `
                <h2>❌ FFE Generation Error</h2>
                <p><strong>Error:</strong> ${error.message}</p>
                <p style="margin-top: 15px;">
                    <strong>Suggestions:</strong>
                </p>
                <ul>
                    <li>Ensure base calculation was successful</li>
                    <li>Try smaller pattern spacing or radius</li>
                    <li>Reduce number of rounds</li>
                </ul>
            `;
        }
    }
}

/**
 * Show base solution (toggle from FFE)
 */
export function showBaseSolution() {
    const output = getElement('output', false);
    if (!output || !cachedBaseSolutionHTML) return;
    
    // Get containers before replacing innerHTML
    const ffeContainer = getElement('ffeContainer', false);
    const widget = getElement('fireCorrectionWidget', false);
    
    // Physically remove from DOM to preserve (don't destroy with innerHTML)
    if (ffeContainer && ffeContainer.parentNode) {
        ffeContainer.parentNode.removeChild(ffeContainer);
    }
    if (widget && widget.parentNode) {
        widget.parentNode.removeChild(widget);
    }
    
    // Replace output content with base solution
    output.innerHTML = cachedBaseSolutionHTML;
    output.className = 'result active success';
    currentDisplayMode = 'base';
    
    // Re-insert widgets at their placeholder positions
    const widgetPlaceholder = getElement('widgetPlaceholder', false, true);
    const ffePlaceholder = getElement('ffePlaceholder', false, true);
    
    if (widget && widgetPlaceholder) {
        widgetPlaceholder.parentNode.insertBefore(widget, widgetPlaceholder);
        widgetPlaceholder.remove();
        widget.style.display = 'block';
    }
    
    if (ffeContainer && ffePlaceholder) {
        ffePlaceholder.parentNode.insertBefore(ffeContainer, ffePlaceholder);
        ffePlaceholder.remove();
    }
    
    // Hide "Back to Base" button
    const ffe = getFFEControls();
    setDisplay(ffe.showBaseBtn, false);
    
    // Untoggle FFE widget
    const ffeEnabledEl = getElement('ffeEnabled', false);
    if (ffeEnabledEl) {
        ffeEnabledEl.checked = false;
    }
    if (ffe.widget) {
        setDisplay(ffe.widget, false);
    }
}

/**
 * Toggle FFE mode on/off
 */
export function toggleFFEMode() {
    const ffeEnabledEl = getElement('ffeEnabled', false);
    if (!ffeEnabledEl) return;
    
    const ffeWidget = getElement('ffeWidget', false);
    const isEnabled = ffeEnabledEl.checked;
    
    if (isEnabled) {
        // Show FFE widget
        setDisplay(ffeWidget, true);
    } else {
        // Hide FFE widget and restore base solution if currently showing FFE
        setDisplay(ffeWidget, false);
        
        if (currentDisplayMode === 'ffe') {
            showBaseSolution();
        }
        
        // Clear cached FFE solution
        cachedFFESolutionHTML = null;
    }
}

/**
 * Cache base solution HTML for toggle functionality
 * @param {string} html - Base solution HTML to cache
 */
export function cacheBaseSolution(html) {
    cachedBaseSolutionHTML = html;
    cachedFFESolutionHTML = null; // Clear FFE cache when new base solution
    currentDisplayMode = 'base';
}

/**
 * Initialize FFE module - set up event listeners
 */
export function initFFE() {
    const ffePattern = getElement('ffePattern', false);
    const ffeEnabled = getElement('ffeEnabled', false);
    const generateFFEBtn = getElement('generateFFE', false);
    const showBaseBtn = getElement('showBaseSolution', false);
    
    if (ffePattern) {
        ffePattern.addEventListener('change', handleFFEPatternChange);
    }
    
    if (ffeEnabled) {
        ffeEnabled.addEventListener('change', toggleFFEMode);
    }
    
    if (generateFFEBtn) {
        generateFFEBtn.addEventListener('click', generateFFEPattern);
    }
    
    if (showBaseBtn) {
        showBaseBtn.addEventListener('click', showBaseSolution);
    }
}

/**
 * Removed: exposeToWindow() - Functions now use event listeners
 */

