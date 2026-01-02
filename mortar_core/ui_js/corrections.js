/**
 * Corrections Module
 * Fire correction logic (Add/Drop, Left/Right, FO mode)
 * Version: 1.7.0
 * 
 * Architecture: Uses dependency injection to avoid circular dependencies
 */

import { COLORS, BTN_STYLES } from './constants.js';
import { setDisplay } from './utils.js';
import * as State from './state.js';
import * as CoordManager from './coord-manager.js';
import { getElement, getValue, setValue } from './dom-cache.js';

// Injected dependencies (set via init)
let dependencies = {
    parsePositionFromUI: null,
    setTargetHighlight: null,
    showOutputError: null,
    calculateSolution: null,
    setPositionInputs: null,
    setCurrentHistoryIndex: null
};

/**
 * Initialize corrections with dependencies
 * @param {Object} deps - Dependency injection container
 */
export function init(deps) {
    dependencies = { ...dependencies, ...deps };
}

/**
 * Set up event listeners for dynamically created correction and observer inputs
 */
export function setupDynamicListeners() {
    // Correction inputs - trigger preview updates
    const correctionLR = getElement('correctionLR', false, true);
    const correctionAD = getElement('correctionAD', false, true);
    
    if (correctionLR && correctionAD) {
        if (correctionLR._listenersAttached) {
            return;
        }
        
        const handleInput = () => updateCorrectionPreview();
        
        ['input', 'change'].forEach(eventType => {
            correctionLR.addEventListener(eventType, handleInput);
            correctionAD.addEventListener(eventType, handleInput);
        });
        
        correctionLR._listenersAttached = true;
        correctionAD._listenersAttached = true;
    }
    
    // Observer inputs - trigger bearing display updates
    const observerFields = ['observerGridX', 'observerGridY', 'observerX', 'observerY'];
    
    const handleObserverInput = () => updateOTBearingDisplay();
    
    observerFields.forEach(id => {
        const el = getElement(id, false, true);
        if (el && !el._listenersAttached) {
            ['input', 'change'].forEach(eventType => {
                el.addEventListener(eventType, handleObserverInput);
            });
            el._listenersAttached = true;
        }
    });
    
    // Trigger initial preview update WITHOUT recalculating
    const correctionLRInput = getElement('correctionLR', false, true);
    const correctionADInput = getElement('correctionAD', false, true);
    const applyBtn = getElement('applyCorrection', false, true);
    
    if (correctionLRInput && correctionADInput && applyBtn) {
        const lr = parseFloat(correctionLRInput.value) || 0;
        const ad = parseFloat(correctionADInput.value) || 0;
        const hasCorrection = lr !== 0 || ad !== 0;
        
        if (hasCorrection) {
            applyBtn.disabled = false;
            applyBtn.style.background = 'linear-gradient(180deg, #6b8e23 0%, #5a7a1c 100%)';
            applyBtn.style.cursor = 'pointer';
            applyBtn.style.opacity = '1';
        } else {
            applyBtn.disabled = true;
            applyBtn.style.background = 'linear-gradient(180deg, #555 0%, #444 100%)';
            applyBtn.style.cursor = 'not-allowed';
            applyBtn.style.opacity = '0.5';
        }
    }
}

/**
 * Update OT/GT bearing display when in FO mode
 */
export function updateOTBearingDisplay() {
    const foEnabled = getElement('foEnabled', false, true);
    const otBearingDisplay = getElement('otBearingDisplay', false, true);
    const observerWarning = getElement('observerWarning', false, true);
    
    if (!foEnabled || !foEnabled.checked || !otBearingDisplay) {
        if (otBearingDisplay) setDisplay(otBearingDisplay, false);
        if (observerWarning) setDisplay(observerWarning, false);
        return;
    }
    
    try {
        const mortarPos = dependencies.parsePositionFromUI('mortar', true);
        const observerPos = dependencies.parsePositionFromUI('observer', true);
        const targetPos = dependencies.parsePositionFromUI('target', true);
        
        if (!mortarPos || !observerPos || !targetPos) {
            setDisplay(otBearingDisplay, false);
            // Show warning if FO mode is on but observer coordinates are missing
            if (observerWarning && (!observerPos && targetPos && mortarPos)) {
                setDisplay(observerWarning, true);
            }
            return;
        }
        
        // Hide warning when observer coordinates are entered
        if (observerWarning) setDisplay(observerWarning, false);
        
        const otBearing = MortarCalculator.calculateBearing(observerPos, targetPos);
        const gtBearing = MortarCalculator.calculateBearing(mortarPos, targetPos);
        
        let angleDiff = gtBearing - otBearing;
        if (angleDiff > 180) angleDiff -= 360;
        if (angleDiff < -180) angleDiff += 360;
        
        getElement('otBearingValue', true, true).textContent = otBearing.toFixed(1);
        getElement('gtBearingValue', true, true).textContent = gtBearing.toFixed(1);
        getElement('angleDiffValue', true, true).textContent = angleDiff.toFixed(1);
        
        setDisplay(otBearingDisplay, true);
    } catch (error) {
        setDisplay(otBearingDisplay, false);
    }
}

/**
 * Update correction preview (enable/disable apply button)
 */
export async function updateCorrectionPreview() {
    const correctionLRInput = getElement('correctionLR', false, true);
    const correctionADInput = getElement('correctionAD', false, true);
    const applyBtn = getElement('applyCorrection', false, true);
    
    if (!correctionLRInput || !correctionADInput) {
        return;
    }
    
    const lr = parseFloat(correctionLRInput.value) || 0;
    const ad = parseFloat(correctionADInput.value) || 0;
    const hasCorrection = lr !== 0 || ad !== 0;
    
    if (applyBtn) {
        if (hasCorrection) {
            applyBtn.disabled = false;
            applyBtn.style.background = BTN_STYLES.selected;
            applyBtn.style.cursor = 'pointer';
            applyBtn.style.opacity = '1';
        } else {
            applyBtn.disabled = true;
            applyBtn.style.background = BTN_STYLES.unselected;
            applyBtn.style.cursor = 'not-allowed';
            applyBtn.style.opacity = '0.5';
        }
    }
    
    const hasStoredCorrection = State.getLastCorrectionLR() !== null && State.getLastCorrectionAD() !== null;
    const valuesChanged = hasStoredCorrection && 
        (lr !== State.getLastCorrectionLR() || ad !== State.getLastCorrectionAD());
    
    if (State.isCorrectionApplied() && valuesChanged && dependencies.calculateSolution) {
        await dependencies.calculateSolution();
    }
}

/**
 * Apply fire correction to target position
 */
export async function applyFireCorrectionUI() {
    const correctionLR = parseFloat(getValue('correctionLR')) || 0;
    const correctionAD = parseFloat(getValue('correctionAD')) || 0;
    
    if (correctionLR === 0 && correctionAD === 0) {
        return;
    }
    
    State.setLastCorrectionLR(correctionLR);
    State.setLastCorrectionAD(correctionAD);
    
    try {
        const mortarPos = dependencies.parsePositionFromUI('mortar');
        const targetPos = dependencies.parsePositionFromUI('target');
        
        if (!State.getOriginalTargetPos()) {
            State.setOriginalTargetPos({...targetPos});
        }
        
        // Use forceRefresh to find dynamically created checkbox
        const foCheckbox = getElement('foEnabled', false, true);
        const foEnabled = foCheckbox ? foCheckbox.checked : State.isFOModeEnabled();
        
        let corrected;
        
        if (foEnabled) {
            State.setFOModeEnabled(true);
            const observerPos = dependencies.parsePositionFromUI('observer', true);
            if (observerPos) {
                State.setLastObserverPos({x: observerPos.x, y: observerPos.y});
            }
        } else {
            State.setFOModeEnabled(false);
        }
        
        if (foEnabled) {
            const observerPos = dependencies.parsePositionFromUI('observer', true);
            if (!observerPos) {
                const warning = getElement('observerWarning', false, true);
                if (warning) setDisplay(warning, true);
                console.error('FO mode enabled but observer coordinates not entered');
                return;
            } else {
                const warning = getElement('observerWarning', false, true);
                if (warning) setDisplay(warning, false);
            }
            const result = MortarCalculator.applyFireCorrectionFromObserver(
                mortarPos, observerPos, targetPos, correctionLR, correctionAD
            );
            corrected = result.correctedTarget;
            
            setValue('otBearingValue', result.otBearing);
            setValue('gtBearingValue', result.gtBearing);
            setValue('angleDiffValue', result.angleDiff);
            setDisplay(getElement('otBearingDisplay', true, true), true);
        } else {
            corrected = MortarCalculator.applyFireCorrection(mortarPos, targetPos, correctionLR, correctionAD);
        }
        
        const isGridMode = CoordManager.getMode() === 'grid';
        
        if (isGridMode) {
            const gridCoords = MortarCalculator.metersToGrid(corrected.x, corrected.y, true);
            const gridParts = gridCoords.split('/');
            setValue('targetGridX', gridParts[0]);
            setValue('targetGridY', gridParts[1]);
        } else {
            setValue('targetX', corrected.x.toFixed(1));
            setValue('targetY', corrected.y.toFixed(1));
        }
        
        const targetZValue = getValue('targetZ');
        if (targetZValue.trim() !== '') {
            setValue('targetZ', corrected.z.toFixed(1));
        }
        
        dependencies.setTargetHighlight(COLORS.errorText);
        
        State.setPreviousCharge(State.getSelectedCharge() || (State.getLastSolution() ? State.getLastSolution().charge : null));
        
        // Set flag BEFORE calling calculateSolution to prevent duplicate history entry
        State.setCorrectionApplied(true);
        
        // Recalculate to show updated azimuth/elevation with corrected target
        if (dependencies.calculateSolution) {
            await dependencies.calculateSolution();
        }
        
    } catch (error) {
        console.error('Correction error:', error);
        dependencies.showOutputError('Correction Error', error.message);
    }
}

/**
 * Undo fire correction and restore original target position
 */
export async function undoCorrection() {
    if (!State.getOriginalTargetPos()) {
        console.error('No original target position stored');
        return;
    }
    
    try {
        const mortarPos = dependencies.parsePositionFromUI('mortar');
        
        dependencies.setPositionInputs(mortarPos, State.getOriginalTargetPos());
        
        State.resetCorrectionState();
        
        dependencies.setTargetHighlight();
        
        setValue('correctionLR', '0');
        setValue('correctionAD', '0');
        
        dependencies.setCurrentHistoryIndex(-1);
        
        await dependencies.calculateSolution();
        
        // Update button state after widget is regenerated
        if (dependencies.updateCorrectionPreview) {
            setTimeout(() => dependencies.updateCorrectionPreview(), 50);
        }
    } catch (error) {
        console.error('Undo correction error:', error);
        dependencies.showOutputError('Undo Error', error.message);
    }
}

/**
 * Expose functions to window for onclick compatibility
 */
export function exposeToWindow() {
    window.applyFireCorrectionUI = applyFireCorrectionUI;
    window.undoCorrection = undoCorrection;
    window.updateCorrectionPreview = updateCorrectionPreview;
    window.updateOTBearingDisplay = updateOTBearingDisplay;
    window.setupDynamicListeners = setupDynamicListeners;
}
