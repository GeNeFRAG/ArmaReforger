/**
 * UI Management Module
 * Handles DOM interactions, event listeners, input validation
 * Version: 2.0.0
 * 
 * Architecture: Uses dependency injection for calculator functions
 */

import { INPUT_IDS, COLORS } from './constants.js';
import { debounce, setDisplay } from './utils.js';
import * as State from './state.js';
import * as CoordManager from './coord-manager.js';
import { getElement, getValue, setValue } from './dom-cache.js';

// Injected dependencies (set via init)
let dependencies = {
    calculateSolution: null,
    updateShellTypes: null,
    clearHistory: null,
    updateCorrectionPreview: null
};

// Debounced validation functions (created in initUI, accessible module-wide)
let debouncedValidateCoordinateRange = null;
let debouncedValidateGridFormat = null;

/**
 * Initialize UI with dependencies
 * @param {Object} deps - Dependency injection container
 */
export function init(deps) {
    dependencies = { ...dependencies, ...deps };
}

/**
 * Parse position from UI inputs (delegates to coord-manager)
 */
export function parsePositionFromUI(prefix, allowUndefined = false) {
    return CoordManager.parsePosition(prefix, allowUndefined);
}

/**
 * Validate numeric-only input (for grid coordinates)
 */
function validateNumericOnly(e) {
    if (!/[0-9]/.test(e.key)) {
        e.preventDefault();
    }
}

/**
 * Validate decimal number input (prevents scientific notation)
 */
function validateDecimalInput(e) {
    const char = e.key;
    const value = e.target.value;
    
    if (!/[0-9.]/.test(char)) {
        if (char === '-' || char === '+') {
            if (value.length > 0) {
                e.preventDefault();
            }
        } else if (char !== 'Enter' && char !== 'Tab') {
            e.preventDefault();
        }
    }
    
    if (char === '.' && value.includes('.')) {
        e.preventDefault();
    }
}

/**
 * Sanitize pasted numeric-only content
 */
function sanitizePasteNumericOnly(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const numericOnly = text.replace(/[^0-9]/g, '');
    e.target.value = numericOnly;
}

/**
 * Sanitize pasted decimal number content
 */
function sanitizePasteDecimal(e) {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const min = parseFloat(e.target.min) || -Infinity;
    const allowNegative = min < 0;
    
    const pattern = allowNegative ? /^([+-]?)([0-9]*\.?[0-9]+)/ : /^([+]?)([0-9]*\.?[0-9]+)/;
    const match = text.match(pattern);
    
    if (match) {
        const numericValue = match[1] + match[2];
        e.target.value = numericValue;
        e.target.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

/**
 * Validate grid coordinate format (3-4 digits)
 */
export function validateGridFormat(input) {
    const trimmed = input.value.trim();
    
    if (trimmed === '') {
        clearFieldHighlighting(input);
        return;
    }
    
    const isValid = CoordManager.isValidGrid(trimmed);
    
    if (!isValid) {
        highlightField(input, '3 or 4 digits (e.g., 058, 0584)', COLORS.errorText);
    } else {
        clearFieldHighlighting(input);
    }
}

/**
 * Validate coordinate range
 */
export function validateCoordinateRange(input) {
    const currentMode = CoordManager.getMode();
    
    const isGridInput = input.id.includes('Grid');
    
    if (!isGridInput) {
        const value = parseFloat(input.value);
        const min = parseFloat(input.getAttribute('min'));
        const max = parseFloat(input.getAttribute('max'));
        
        if (isNaN(value)) {
            clearFieldHighlighting(input);
            updateCalculateButtonState();
            return;
        }
        
        if (!CoordManager.isValidCoordinate(value, min, max)) {
            highlightField(input, `Must be between ${min} and ${max}`, COLORS.errorText);
            updateCalculateButtonState();
            return;
        } else {
            clearFieldHighlighting(input);
        }
    }
    
    if (!State.isBallisticDataLoaded() || window.isLoadingFromHistory) {
        updateCalculateButtonState();
        return;
    }
    
    try {
        const mortarPos = CoordManager.parsePosition('mortar', true);
        const targetPos = CoordManager.parsePosition('target', true);
        
        if (!mortarPos || !targetPos) {
            clearRangeValidation();
            updateCalculateButtonState();
            return;
        }
        
        const mortarId = getValue('mortarType');
        const shellType = getValue('shellType');
        
        const prepInput = MortarCalculator.prepareInput(mortarPos, targetPos, mortarId, shellType);
        const solutions = MortarCalculator.calculateAllTrajectories(prepInput);
        const distance = prepInput.distance;
        
        const inRange = solutions.length > 0 && solutions[0].inRange;
        
        clearOutput();
        
        const mode = CoordManager.getMode();
        const targetFields = mode === 'grid' 
            ? ['targetGridX', 'targetGridY']
            : ['targetX', 'targetY'];
        
        targetFields.forEach(id => {
            const el = getElement(id, false);
            if (el && el.value.trim()) {
                if (inRange) {
                    el.style.borderColor = COLORS.success;
                    el.style.boxShadow = `0 0 0 1px ${COLORS.successShadow}`;
                } else {
                    el.style.borderColor = COLORS.error;
                    el.style.boxShadow = `0 0 0 1px ${COLORS.errorShadow}`;
                }
            }
        });
        
        updateRangeIndicator(inRange, distance, solutions[0]);
        updateCalculateButtonState();
        
    } catch (error) {
        console.error('[validateCoordinateRange] Error:', error);
        // Don't show grid format errors here - validateGridFormat handles those
        // Only show if it's not a grid format error (e.g., calculation errors)
        if (input.id && input.id.includes('Grid')) {
            const errorMsg = error.message || String(error);
            // Skip showing the long grid format error - validateGridFormat already handles this
            if (!errorMsg.includes('Grid coordinates must be 3 or 4 digits')) {
                const cleanMsg = errorMsg.replace(/^Error:\s*/, '');
                highlightField(input, cleanMsg, COLORS.errorText);
            }
        }
        clearRangeValidation();
        updateCalculateButtonState();
    }
}

/**
 * Check if all required inputs are valid
 */
function isFormValid() {
    try {
        if (!State.isBallisticDataLoaded()) {
            return false;
        }
        
        const mortarPos = CoordManager.parsePosition('mortar', true);
        const targetPos = CoordManager.parsePosition('target', true);
        
        if (!mortarPos || !targetPos) {
            return false;
        }
        
        const mortarId = getValue('mortarType');
        const shellType = getValue('shellType');
        const prepInput = MortarCalculator.prepareInput(mortarPos, targetPos, mortarId, shellType);
        const solutions = MortarCalculator.calculateAllTrajectories(prepInput);
        
        return solutions.length > 0 && solutions[0].inRange;
    } catch (error) {
        return false;
    }
}

/**
 * Update calculate button enabled/disabled state
 */
function updateCalculateButtonState() {
    const calculateBtn = getElement('calculate', false);
    if (!calculateBtn) {
        return;
    }
    
    const valid = isFormValid();
    calculateBtn.disabled = !valid;
    calculateBtn.style.opacity = valid ? '1' : '0.5';
    calculateBtn.style.cursor = valid ? 'pointer' : 'not-allowed';
}

/**
 * Highlight input field with error
 */
export function highlightField(input, message, color = COLORS.errorText) {
    input.style.border = `2px solid ${color}`;
    input.style.boxShadow = `0 0 8px ${color}`;
    input.setAttribute('data-error', message);
    
    // Create or update error message element (use forceRefresh since it's dynamic)
    const errorId = `${input.id}-error`;
    let errorEl = getElement(errorId, false, true);
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = errorId;
        errorEl.style.cssText = 'color: #ff4444; font-size: 11px; margin-top: 2px; font-weight: 500;';
        input.parentElement.insertBefore(errorEl, input.nextSibling);
    }
    errorEl.textContent = message;
}

/**
 * Clear field highlighting
 */
export function clearFieldHighlighting(input) {
    input.style.border = '';
    input.style.boxShadow = '';
    input.removeAttribute('data-error');
    
    // Remove error message element (use forceRefresh since it's dynamic)
    const errorEl = getElement(`${input.id}-error`, false, true);
    if (errorEl) {
        errorEl.remove();
    }
}

/**
 * Update or create range indicator showing distance and in-range status
 */
function updateRangeIndicator(inRange, distance, solution) {
    let rangeIndicator = getElement('rangeIndicator', false, true);
    
    if (!rangeIndicator) {
        rangeIndicator = document.createElement('div');
        rangeIndicator.id = 'rangeIndicator';
        rangeIndicator.style.cssText = 'margin-top: 10px; padding: 8px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; transition: all 0.3s;';
        
        const targetZField = getElement('targetZ', false);
        if (targetZField && targetZField.parentElement) {
            targetZField.parentElement.insertAdjacentElement('afterend', rangeIndicator);
        } else {
            console.error('[updateRangeIndicator] Could not find targetZ field or parent!');
            return;
        }
    }
    
    if (inRange && solution) {
        rangeIndicator.style.background = COLORS.successBg;
        rangeIndicator.style.border = `1px solid ${COLORS.successBorder}`;
        rangeIndicator.style.color = COLORS.successText;
        rangeIndicator.innerHTML = `✓ In Range: ${distance.toFixed(0)}m (${solution.minRange}m - ${solution.maxRange}m)`;
    } else if (solution && solution.minRange && solution.maxRange) {
        const tooClose = distance < solution.minRange;
        rangeIndicator.style.background = COLORS.errorBg;
        rangeIndicator.style.border = `1px solid ${COLORS.errorBorder}`;
        rangeIndicator.style.color = COLORS.errorText;
        rangeIndicator.innerHTML = `⚠ Out of Range: ${distance.toFixed(0)}m (valid: ${solution.minRange}m - ${solution.maxRange}m) - Target is ${tooClose ? 'too close' : 'too far'}`;
    } else {
        rangeIndicator.style.background = COLORS.errorBg;
        rangeIndicator.style.border = `1px solid ${COLORS.errorBorder}`;
        rangeIndicator.style.color = COLORS.errorText;
        rangeIndicator.innerHTML = `⚠ Out of Range: ${distance.toFixed(0)}m`;
    }
}

/**
 * Clear range validation visual feedback
 */
function clearRangeValidation() {
    const mode = CoordManager.getMode();
    const targetFields = mode === 'grid' 
        ? ['targetGridX', 'targetGridY']
        : ['targetX', 'targetY'];
    
    targetFields.forEach(id => {
        const el = getElement(id, false);
        if (el) {
            el.style.borderColor = '';
            el.style.boxShadow = '';
        }
    });
    
    const rangeIndicator = getElement('rangeIndicator', false, true);
    if (rangeIndicator) {
        rangeIndicator.remove();
    }
}

/**
 * Highlight missing input fields for a position prefix
 * @param {'mortar'|'target'|'observer'} prefix
 */
export function highlightMissingFields(prefix) {
    const mode = CoordManager.getMode();
    
    if (mode === 'grid') {
        const gridX = getElement(`${prefix}GridX`, false);
        const gridY = getElement(`${prefix}GridY`, false);
        
        if (gridX && !gridX.value.trim()) {
            highlightField(gridX, 'Grid X required', COLORS.errorText);
        }
        if (gridY && !gridY.value.trim()) {
            highlightField(gridY, 'Grid Y required', COLORS.errorText);
        }
    } else {
        const meterX = getElement(`${prefix}X`, false);
        const meterY = getElement(`${prefix}Y`, false);
        
        if (meterX && !meterX.value.trim()) {
            highlightField(meterX, 'X coordinate required', COLORS.errorText);
        }
        if (meterY && !meterY.value.trim()) {
            highlightField(meterY, 'Y coordinate required', COLORS.errorText);
        }
    }
}

/**
 * Clear all field highlighting for a position prefix
 * @param {'mortar'|'target'|'observer'} prefix
 */
export function clearPositionHighlighting(prefix) {
    const mode = CoordManager.getMode();
    
    if (mode === 'grid') {
        const gridX = getElement(`${prefix}GridX`, false);
        const gridY = getElement(`${prefix}GridY`, false);
        if (gridX) clearFieldHighlighting(gridX);
        if (gridY) clearFieldHighlighting(gridY);
    } else {
        const meterX = getElement(`${prefix}X`, false);
        const meterY = getElement(`${prefix}Y`, false);
        if (meterX) clearFieldHighlighting(meterX);
        if (meterY) clearFieldHighlighting(meterY);
    }
}

/**
 * Clear correction state when target fields are edited
 */
function clearTargetCorrectionState(element, fieldId) {
    if (fieldId.startsWith('target')) {
        State.setCorrectionApplied(false);
        State.setOriginalTargetPos(null);
        State.setLastCorrectionLR(null);
        State.setLastCorrectionAD(null);
        element.style.color = '';
        clearFieldHighlighting(element);
    }
}

/**
 * Perform full reset of all inputs and state
 */
export function performReset() {
    INPUT_IDS.ALL_COORD_FIELDS.forEach(id => {
        const el = getElement(id, false);
        if (el) {
            el.value = '';
            el.style.color = '';
            clearFieldHighlighting(el);
        }
    });
    
    // Reset mortar type
    setValue('mortarType', 'US');
    if (dependencies.updateShellTypes) {
        dependencies.updateShellTypes();
    }
    
    // Uncheck and reset FO mode
    const foEnabledCheckbox = getElement('foEnabled', false);
    if (foEnabledCheckbox) {
        foEnabledCheckbox.checked = false;
        toggleFOControls(foEnabledCheckbox);
    }
    
    // Reset state
    State.resetAllState();
    
    // Reset history index to prevent overwriting
    if (window.resetHistoryIndex) {
        window.resetHistoryIndex();
    }
    
    // Clear range validation
    clearRangeValidation();
    
    // Reset output
    const output = getElement('output');
    output.className = 'result';
    output.innerHTML = '<p>Configure your mortar and target positions, then click Calculate.</p>';
    
    // Hide fire correction widget
    const widget = getElement('fireCorrectionWidget', false);
    if (widget) widget.style.display = 'none';
    
    // Hide and reset FFE widget
    const ffeWidget = getElement('ffeWidget', false);
    if (ffeWidget) ffeWidget.style.display = 'none';
    if (window.resetFFEWidget) {
        window.resetFFEWidget();
    }
    
    // Update button state (disable since all fields are now empty)
    updateCalculateButtonState();
}

/**
 * Set coordinate input mode (grid/meters) - delegates to coord-manager and resets
 */
export function setCoordMode(mode) {
    CoordManager.setMode(mode);
    performReset();
    
    // Re-attach meter validation listeners to ensure they work after mode switch
    if (mode === 'meters' && debouncedValidateCoordinateRange) {
        INPUT_IDS.METER_FIELDS.forEach(id => {
            const el = getElement(id, false);
            if (el && el.offsetParent !== null) {
                el.removeEventListener('input', el._validationHandler);
                el._validationHandler = (e) => {
                    clearTargetCorrectionState(el, id);
                    debouncedValidateCoordinateRange(el);
                };
                el.addEventListener('input', el._validationHandler);
            }
        });
    }
    
    updateCalculateButtonState();
}

/**
 * Set target input highlighting
 */
export function setTargetHighlight(color) {
    const gridX = getElement('targetGridX', false);
    const gridY = getElement('targetGridY', false);
    const meterX = getElement('targetX', false);
    const meterY = getElement('targetY', false);
    
    [gridX, gridY, meterX, meterY].forEach(el => {
        if (el) {
            if (color) {
                el.style.border = `2px solid ${color}`;
                el.style.boxShadow = `0 0 8px ${color}`;
            } else {
                el.style.border = '';
                el.style.boxShadow = '';
            }
        }
    });
}

/**
 * Set position inputs from position objects - delegates to coord-manager
 */
export function setPositionInputs(mortarPos, targetPos) {
    CoordManager.setPositions(mortarPos, targetPos);
}

/**
 * Toggle FO controls visibility
 */
export function toggleFOControls(checkbox) {
    const foControls = getElement('foControls', false, true);
    const isChecked = checkbox.checked;
    
    State.setFOModeEnabled(isChecked);
    setDisplay(foControls, isChecked);
    
    // Update header text based on mode
    const header = getElement('fireCorrectionHeader', false);
    if (header) {
        header.textContent = isChecked 
            ? '🔄 Adjust Fire: Observer-Target (OT) line'
            : '🔄 Adjust Fire: Gun-Target (GT) line';
    }
    
    if (isChecked) {
        if (State.getLastObserverPos()) {
            const obs = State.getLastObserverPos();
            const isGridMode = CoordManager.getMode() === 'grid';
            
            if (isGridMode) {
                const gridCoords = MortarCalculator.metersToGrid(obs.x, obs.y).split('/');
                setValue('observerGridX', gridCoords[0]);
                setValue('observerGridY', gridCoords[1]);
            } else {
                setValue('observerX', obs.x.toFixed(1));
                setValue('observerY', obs.y.toFixed(1));
            }
        }
        if (window.updateOTBearingDisplay) {
            setTimeout(() => window.updateOTBearingDisplay(), 50);
        }
    } else {
        INPUT_IDS.OBSERVER_FIELDS.forEach(id => {
            const el = getElement(id, false, true);
            if (el) el.value = '';
        });
        State.setLastObserverPos(null);
        const otBearingDisplay = getElement('otBearingDisplay', false, true);
        if (otBearingDisplay) {
            setDisplay(otBearingDisplay, false);
        }
    }
}

/**
 * Show output error message
 */
export function showOutputError(title, message) {
    const output = getElement('output');
    output.className = 'result active error';
    output.innerHTML = `
        <h2>❌ ${title}</h2>
        <p>${message}</p>
    `;
}

/**
 * Clear output area
 */
export function clearOutput() {
    const output = getElement('output');
    output.className = '';
    output.innerHTML = '';
}

/**
 * Toggle alternative missions visibility
 */
export function toggleAlternativeMissions() {
    const alternativesContainer = getElement('alternativeMissions', false, true);
    const toggleBtn = getElement('toggleAltBtn', false, true);
    
    if (!alternativesContainer) {
        console.error('[toggleAlternativeMissions] Container not found!');
        return;
    }
    
    const isHidden = alternativesContainer.style.display === 'none';
    
    if (isHidden) {
        alternativesContainer.style.display = 'block';
        
        const altCards = alternativesContainer.querySelectorAll('.alternativeMission');
        altCards.forEach((card) => {
            card.style.display = 'block';
        });
        
        if (toggleBtn) {
            toggleBtn.innerHTML = `▲ Hide ${altCards.length} Alternative Mission${altCards.length > 1 ? 's' : ''}`;
        }
    } else {
        alternativesContainer.style.display = 'none';
        
        const altCards = alternativesContainer.querySelectorAll('.alternativeMission');
        altCards.forEach((card) => {
            card.style.display = 'none';
        });
        
        if (toggleBtn) {
            toggleBtn.innerHTML = `▼ Show ${altCards.length} Alternative Mission${altCards.length > 1 ? 's' : ''}`;
        }
    }
}

/**
 * Initialize UI - set up all event listeners
 */
export function initUI() {
    const calculateBtn = getElement('calculate', false);
    const resetBtn = getElement('reset', false);
    const toggleGrid = getElement('toggleGrid', false);
    const toggleMeters = getElement('toggleMeters', false);
    
    if (calculateBtn) {
        calculateBtn.addEventListener('click', async () => {
            if (dependencies.calculateSolution) {
                dependencies.calculateSolution();
            } else {
                console.error('[UI] calculateSolution dependency not available!');
            }
        });
    } else {
        console.error('[UI] Calculate button not found!');
    }
    
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            performReset();
        });
    }
    
    if (toggleGrid) {
        toggleGrid.addEventListener('click', () => {
            setCoordMode('grid');
        });
    }
    if (toggleMeters) {
        toggleMeters.addEventListener('click', () => {
            setCoordMode('meters');
        });
    }
    
    const mortarTypeSelect = getElement('mortarType', false);
    if (mortarTypeSelect && dependencies.updateShellTypes) {
        mortarTypeSelect.addEventListener('change', () => {
            dependencies.updateShellTypes();
            updateCalculateButtonState();
        });
    }
    
    const shellTypeSelect = getElement('shellType', false);
    if (shellTypeSelect) {
        shellTypeSelect.addEventListener('change', updateCalculateButtonState);
    }
    
    debouncedValidateCoordinateRange = debounce(validateCoordinateRange, 300);
    debouncedValidateGridFormat = debounce(validateGridFormat, 300);
    
    ['mortarX', 'mortarY', 'mortarZ', 'targetX', 'targetY', 'targetZ'].forEach(id => {
        const el = getElement(id, false);
        if (el) {
            el.addEventListener('input', (e) => {
                clearTargetCorrectionState(el, id);
                debouncedValidateCoordinateRange(el);
            });
        }
    });
    
    ['mortarGridX', 'mortarGridY', 'targetGridX', 'targetGridY', 'observerGridX', 'observerGridY'].forEach(id => {
        const el = getElement(id, false);
        if (el) {
            el.addEventListener('keypress', (e) => {
                if (!/[0-9]/.test(e.key)) {
                    e.preventDefault();
                }
            });
            
            el.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData.getData('text');
                const numericOnly = text.replace(/[^0-9]/g, '');
                el.value = numericOnly;
            });
            
            el.addEventListener('input', () => {
                clearTargetCorrectionState(el, id);
                debouncedValidateGridFormat(el);
                
                if (id.startsWith('mortar') || id.startsWith('target')) {
                    debouncedValidateCoordinateRange(el);
                }
            });
        }
    });
    
    // Event delegation for keypress validation
    document.addEventListener('keypress', (e) => {
        if (e.target.id === 'observerGridX' || e.target.id === 'observerGridY') {
            validateNumericOnly(e);
        } else if (e.target.type === 'number') {
            validateDecimalInput(e);
        }
    });
    
    // Event delegation for paste sanitization
    document.addEventListener('paste', (e) => {
        if (e.target.id === 'observerGridX' || e.target.id === 'observerGridY') {
            sanitizePasteNumericOnly(e);
        } else if (e.target.type === 'number') {
            sanitizePasteDecimal(e);
        }
    });
    
    // Initialize calculate button state (disabled by default)
    updateCalculateButtonState();
}

/**
 * Expose functions to window for onclick compatibility
 */
export function exposeToWindow() {
    window.setCoordMode = setCoordMode;
    window.toggleFOControls = toggleFOControls;
    window.toggleAlternativeMissions = toggleAlternativeMissions;
    window.highlightMissingFields = highlightMissingFields;
    window.clearPositionHighlighting = clearPositionHighlighting;
}
