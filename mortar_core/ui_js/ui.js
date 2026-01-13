/**
 * UI Management Module
 * Handles DOM interactions, event listeners, input validation
 * Version: 2.5.0
 * 
 * Architecture: Uses dependency injection for calculator functions
 */

import { INPUT_IDS, COLORS } from './constants.js';
import { debounce, setDisplay } from './utils.js';
import * as State from './state.js';
import * as CoordManager from './coord-manager.js';
import { getElement, getValue, setValue } from './dom-cache.js';
import { resetHistoryIndex } from './history.js';
import { resetFFEWidget } from './ffe.js';
import { updateOTBearingDisplay } from './corrections.js';

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
    
    // If called without input (e.g., from dropdown change), skip field validation
    if (input) {
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
        
        const prepInput = BallisticCalculator.prepareInput(mortarPos, targetPos, mortarId, shellType);
        const solutions = BallisticCalculator.calculateAllTrajectories(prepInput);
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
        updateMLRSSuggestion(mortarId, shellType, distance, inRange, solutions);
        updateCalculateButtonState();
        
    } catch (error) {
        console.error('[validateCoordinateRange] Error:', error);
        // Don't show grid format errors here - validateGridFormat handles those
        // Only show if it's not a grid format error (e.g., calculation errors)
        if (input && input.id && input.id.includes('Grid')) {
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
        
        const weaponPos = CoordManager.parsePosition('mortar', true);
        const targetPos = CoordManager.parsePosition('target', true);
        
        if (!weaponPos || !targetPos) {
            return false;
        }
        
        const mortarId = getValue('mortarType');
        const shellType = getValue('shellType');
        const prepInput = BallisticCalculator.prepareInput(weaponPos, targetPos, mortarId, shellType);
        const solutions = BallisticCalculator.calculateAllTrajectories(prepInput);
        
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
    
    // Create or update error message element (auto-detected as dynamic via pattern)
    const errorId = `${input.id}-error`;
    let errorEl = getElement(errorId, false);
    if (!errorEl) {
        errorEl = document.createElement('div');
        errorEl.id = errorId;
        errorEl.style.cssText = `color: ${COLORS.errorText}; font-size: 11px; margin-top: 2px; font-weight: 500;`;
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
    
    // Remove error message element (auto-detected as dynamic via pattern)
    const errorEl = getElement(`${input.id}-error`, false);
    if (errorEl) {
        errorEl.remove();
    }
}

/**
 * Update range indicator showing distance and in-range status
 * Element is now pre-rendered in HTML to prevent CLS
 */
function updateRangeIndicator(inRange, distance, solution) {
    const rangeIndicator = getElement('rangeIndicator', false);
    if (!rangeIndicator) return;
    
    if (inRange && solution) {
        setDisplay(rangeIndicator, true);
        rangeIndicator.style.background = COLORS.successBg;
        rangeIndicator.style.border = `1px solid ${COLORS.successBorder}`;
        rangeIndicator.style.color = COLORS.successText;
        rangeIndicator.innerHTML = `✓ In Range: ${distance.toFixed(0)}m (${solution.minRange}m - ${solution.maxRange}m)`;
    } else if (solution && solution.minRange && solution.maxRange) {
        const tooClose = distance < solution.minRange;
        setDisplay(rangeIndicator, true);
        rangeIndicator.style.background = COLORS.errorBg;
        rangeIndicator.style.border = `1px solid ${COLORS.errorBorder}`;
        rangeIndicator.style.color = COLORS.errorText;
        rangeIndicator.innerHTML = `⚠ Out of Range: ${distance.toFixed(0)}m (valid: ${solution.minRange}m - ${solution.maxRange}m) - Target is ${tooClose ? 'too close' : 'too far'}`;
    } else {
        setDisplay(rangeIndicator, true);
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
    
    const rangeIndicator = getElement('rangeIndicator', false);
    if (rangeIndicator) {
        setDisplay(rangeIndicator, false);
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
    setValue('mortarType', 'M252');
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
    resetHistoryIndex();
    
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
    resetFFEWidget();
    
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
    const gridZ = getElement('targetGridZ', false);
    const meterX = getElement('targetX', false);
    const meterY = getElement('targetY', false);
    const meterZ = getElement('targetZ', false);
    
    [gridX, gridY, gridZ, meterX, meterY, meterZ].forEach(el => {
        if (el) {
            if (color) {
                el.style.color = color;
                el.style.fontWeight = '600';
            } else {
                el.style.color = '';
                el.style.fontWeight = '';
            }
        }
    });
}

/**
 * Set position inputs from position objects - delegates to coord-manager
 */
export function setPositionInputs(weaponPos, targetPos) {
    CoordManager.setPositions(weaponPos, targetPos);
}

/**
 * Toggle FO controls visibility
 */
export function toggleFOControls(checkbox) {
    const foControls = getElement('foControls', false, true);
    const isChecked = checkbox.checked;
    
    setDisplay(foControls, isChecked);
    
    // Update header text based on mode
    const header = getElement('fireCorrectionHeader', false);
    if (header) {
        header.textContent = isChecked 
            ? '🔄 Adjust Fire: Observer-Target (OT) line'
            : '🔄 Adjust Fire: Gun-Target (GT) line';
    }
    
    if (isChecked) {
        // Don't restore observer coordinates - preserve user input
        // Only trigger bearing display update
        setTimeout(() => updateOTBearingDisplay(), 50);
    } else {
        INPUT_IDS.OBSERVER_FIELDS.forEach(id => {
            const el = getElement(id, false, true);
            if (el) el.value = '';
        });
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
        mortarTypeSelect.addEventListener('change', async () => {
            await dependencies.updateShellTypes();
            clearOutput();
            validateCoordinateRange();
        });
    }
    
    const shellTypeSelect = getElement('shellType', false);
    if (shellTypeSelect) {
        shellTypeSelect.addEventListener('change', () => {
            validateCoordinateRange();
        });
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
    
    // Setup event listeners for UI controls
    setupUIListeners();
}

/**
 * Setup event delegation for UI controls
 */
function setupUIListeners() {
    // Coordinate mode toggle
    const toggleButtons = document.querySelector('.toggle-buttons');
    if (toggleButtons) {
        toggleButtons.addEventListener('click', (e) => {
            const toggleOption = e.target.closest('.toggle-option');
            if (toggleOption) {
                const mode = toggleOption.dataset.mode;
                if (mode) {
                    setCoordMode(mode);
                }
            }
        });
    }
    
    // FO mode toggle
    const foEnabled = getElement('foEnabled', false);
    const foToggleLabel = getElement('foToggleLabel', false);
    
    if (foEnabled) {
        foEnabled.addEventListener('change', (e) => {
            toggleFOControls(e.target);
        });
    }
    
    if (foToggleLabel) {
        foToggleLabel.addEventListener('click', () => {
            if (foEnabled) {
                foEnabled.checked = !foEnabled.checked;
                toggleFOControls(foEnabled);
            }
        });
    }
    
    // Clear history button
    const clearHistoryBtn = getElement('clearHistoryBtn', false);
    if (clearHistoryBtn && dependencies.clearHistory) {
        clearHistoryBtn.addEventListener('click', dependencies.clearHistory);
    }
    
    // MLRS rocket suggestion handlers
    const acceptBtn = getElement('acceptSuggestion', false);
    const dismissBtn = getElement('dismissSuggestion', false);
    
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            const banner = getElement('rocketSuggestion', false);
            if (banner && banner.dataset.suggestedId) {
                const shellTypeSelect = getElement('shellType');
                shellTypeSelect.value = banner.dataset.suggestedId;
                hideRocketSuggestion();
                debouncedValidateCoordinateRange();
            }
        });
    }
    
    if (dismissBtn) {
        dismissBtn.addEventListener('click', () => {
            hideRocketSuggestion();
        });
    }
    
    // Retrigger suggestion check when user manually changes selection
    const shellTypeSelect = getElement('shellType');
    shellTypeSelect.addEventListener('change', () => {
        if (!window.isLoadingFromHistory) {
            validateCoordinateRange();
        }
    });
}

/**
 * Update MLRS rocket suggestion based on distance
 */
function updateMLRSSuggestion(weaponId, currentShellType, distance, inRange, solutions) {
    if (window.isLoadingFromHistory) {
        hideRocketSuggestion();
        return;
    }
    
    try {
        const config = BallisticCalculator.getWeaponConfig(weaponId, currentShellType);
        
        if (config.systemType !== 'mlrs' && config.systemType !== 'howitzer') {
            hideRocketSuggestion();
            return;
        }
        
        let preferredType = 'HE';
        if (config.ammunition) {
            preferredType = config.ammunition.type;
        }
        
        const optimal = selectOptimalMLRSProjectile(weaponId, distance, preferredType);
        
        if (optimal && optimal.id !== currentShellType) {
            showRocketSuggestion(optimal);
        } else {
            hideRocketSuggestion();
        }
        
    } catch (error) {
        console.error('[MLRS Suggestion] Error:', error);
        hideRocketSuggestion();
    }
}

/**
 * Selecsuggests variants within the same ammunition type (HE->HE, Smoke->Smoke)
 */
function selectOptimalMLRSProjectile(weaponId, distance, preferredType = 'HE') {
    try {
        const config = BallisticCalculator.getWeaponConfig(weaponId, 'HE');
        const weapon = config.weapon;
        const systemType = config.systemType;
        
        if (systemType !== 'mlrs' && systemType !== 'howitzer') return null;
        
        const candidates = weapon.projectileTypes.filter(proj => 
            proj.type === preferredType &&
            distance >= proj.minRange && 
            distance <= proj.maxRange
        );
        
        if (candidates.length === 0) return null;
        
        // Howitzer: Prefer high-angle trajectory (plunging fire)
        // MLRS: Prefer shortest range rocket (most efficient)
        if (systemType === 'howitzer') {
            const highAngle = candidates.find(c => c.variant === 'high_angle');
            if (highAngle) {
                return {
                    id: highAngle.id,
                    name: highAngle.name,
                    minRange: highAngle.minRange,
                    maxRange: highAngle.maxRange,
                    type: highAngle.type,
                    variant: highAngle.variant
                };
            }
        }
        
        // Default: Sort by range (shortest first)
        candidates.sort((a, b) => a.maxRange - b.maxRange);
        
        return {
            id: candidates[0].id,
            name: candidates[0].name,
            minRange: candidates[0].minRange,
            maxRange: candidates[0].maxRange,
            type: candidates[0].type,
            variant: candidates[0].variant
        };
    } catch (error) {
        return null;
    }
}

/**
 * Show rocket suggestion banner
 */
function showRocketSuggestion(optimalRocket) {
    const banner = getElement('rocketSuggestion', false);
    if (!banner) {
        console.warn('[MLRS] Rocket suggestion banner element not found');
        return;
    }
    
    // Get current weapon config to determine system type
    const weaponId = getValue('mortarType');
    let systemType = 'mlrs';
    try {
        const config = BallisticCalculator.getWeaponConfig(weaponId, getValue('shellType'));
        systemType = config.systemType;
    } catch (e) {
        // Default to mlrs
    }
    
    // Set context-aware title
    const suggestionTitle = document.getElementById('suggestionTitle');
    if (suggestionTitle) {
        if (systemType === 'howitzer') {
            suggestionTitle.textContent = '💡 Recommended Trajectory';
        } else {
            suggestionTitle.textContent = '💡 Recommended Rocket';
        }
    }
    
    const rangeKm = `${(optimalRocket.minRange / 1000).toFixed(1)}-${(optimalRocket.maxRange / 1000).toFixed(1)}km`;
    const suggestionText = getElement('suggestionText', false);
    
    if (suggestionText) {
        suggestionText.textContent = `${optimalRocket.name} (${rangeKm}) - Better match for this distance`;
    }
    
    banner.dataset.suggestedId = optimalRocket.id;
    
    // Use RAF to ensure DOM is ready and apply the show class
    window.requestAnimationFrame(() => {
        // Remove any hiding classes first
        banner.classList.remove('cls-hidden');
        // Add the show class for animation
        banner.classList.add('show');
        // Ensure inline styles are cleared to avoid conflicts
        banner.style.display = '';
        banner.style.visibility = '';
        banner.style.opacity = '';
        
        // Force layout recalculation (critical for mobile browsers)
        void banner.offsetHeight;
    });
}

/**
 * Hide rocket suggestion banner
 */
function hideRocketSuggestion() {
    const banner = getElement('rocketSuggestion', false);
    if (banner) {
        window.requestAnimationFrame(() => {
            banner.classList.remove('show');
            banner.classList.add('cls-hidden');
            // Clear inline styles
            banner.style.display = '';
            banner.style.visibility = '';
            banner.style.opacity = '';
        });
        delete banner.dataset.suggestedId;
    }
}

/**
 * Removed: exposeToWindow() - Functions now use event delegation
 */
