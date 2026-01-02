/**
 * History Management Module
 * Handles mission history storage, retrieval, and display
 * Version: 1.7.0
 * 
 * CRITICAL: Always deep copy position objects to prevent mutation
 * Architecture: Uses dependency injection to avoid circular dependencies
 */

import { INPUT_IDS, COLORS } from './constants.js';
import { formatPositionDisplay, setDisplay } from './utils.js';
import * as State from './state.js';
import * as CoordManager from './coord-manager.js';
import { getElement, getValue, setValue, isChecked, setChecked } from './dom-cache.js';

// Mission history storage
export const missionHistory = [];
export let currentHistoryIndex = -1;
export let isLoadingFromHistory = false;

// Injected dependencies (set via init)
let dependencies = {
    parsePositionFromUI: null,
    setPositionInputs: null,
    setTargetHighlight: null,
    calculateSolution: null,
    selectMission: null,
    updateShellTypes: null,
    getAllMortarTypes: null
};

/**
 * Initialize history with dependencies
 * @param {Object} deps - Dependency injection container
 */
export function init(deps) {
    dependencies = { ...dependencies, ...deps };
}

/**
 * Capture current UI state for history entry
 * Prioritizes window state over DOM state per architecture guidelines
 */
export async function captureCurrentInputs() {
    const foCheckbox = getElement('foEnabled', false, true);
    const foEnabled = foCheckbox ? foCheckbox.checked : State.isFOModeEnabled();
    
    if (foCheckbox) {
        State.setFOModeEnabled(foCheckbox.checked);
    }
    
    let observerPos = null;
    if (foEnabled && dependencies.parsePositionFromUI) {
        try {
            observerPos = dependencies.parsePositionFromUI('observer', true);
        } catch (e) {
            // Observer position parsing failed
        }
    }
    
    return {
        mortarType: getValue('mortarType'),
        shellType: getValue('shellType'),
        ffeEnabled: isChecked('ffeEnabled'),
        ffePattern: getValue('ffePattern'),
        ffeRounds: parseInt(getValue('ffeRounds')),
        ffeSpacing: parseFloat(getValue('ffeSpacing')),
        ffeRadius: parseFloat(getValue('ffeRadius')),
        missionLabel: getValue('missionLabel').trim(),
        foModeEnabled: foEnabled,
        observerPos: observerPos
    };
}

/**
 * Add entry to mission history
 * Deep copies all position objects to prevent cross-contamination
 */
export async function addToHistory(mortarPos, targetPos, distance, solutions) {
    if (isLoadingFromHistory) return;
    
    const isGridMode = CoordManager.getMode() === 'grid';
    
    let correctionLR = 0;
    let correctionAD = 0;
    if (State.isCorrectionApplied()) {
        correctionLR = State.getLastCorrectionLR() || parseFloat(getValue('correctionLR')) || 0;
        correctionAD = State.getLastCorrectionAD() || parseFloat(getValue('correctionAD')) || 0;
    }
    
    const capturedInputs = await captureCurrentInputs();
    
    const entry = {
        id: Date.now(),
        timestamp: new Date(),
        ...capturedInputs,
        mortarPos: { ...mortarPos },
        targetPos: { ...targetPos },
        observerPos: capturedInputs.observerPos ? { ...capturedInputs.observerPos } : null,
        distance,
        inputMode: isGridMode ? 'grid' : 'meters',
        correctionApplied: State.isCorrectionApplied() || false,
        originalTargetPos: State.getOriginalTargetPos() ? { ...State.getOriginalTargetPos() } : null,
        correctionLR: correctionLR,
        correctionAD: correctionAD,
        selectedCharge: State.getSelectedCharge() || (solutions && solutions.length > 0 ? solutions[0].charge : null)
    };
    
    const isCorrection = State.isCorrectionApplied() && 
                         (State.getLastCorrectionLR() !== 0 || State.getLastCorrectionAD() !== 0);
    
    if (isCorrection) {
        missionHistory.unshift(entry);
        if (missionHistory.length > 20) missionHistory.pop();
        currentHistoryIndex = 0;
    } else if (currentHistoryIndex >= 0 && currentHistoryIndex < missionHistory.length) {
        const originalEntry = missionHistory[currentHistoryIndex];
        entry.id = originalEntry.id;
        entry.timestamp = originalEntry.timestamp;
        missionHistory[currentHistoryIndex] = entry;
    } else {
        missionHistory.unshift(entry);
        if (missionHistory.length > 20) missionHistory.pop();
        currentHistoryIndex = 0;
    }
    
    await updateHistoryDisplay();
}

/**
 * Load mission from history
 */
export async function loadFromHistory(index) {
    if (index < 0 || index >= missionHistory.length) return;
    
    const entry = missionHistory[index];
    currentHistoryIndex = index;
    isLoadingFromHistory = true;
    
    const targetMode = entry.inputMode || 'grid';
    const currentMode = CoordManager.getMode();
    if (currentMode !== targetMode && dependencies.setCoordMode) {
        dependencies.setCoordMode(targetMode);
    }
    
    await setInputsFromData(entry);
    dependencies.setPositionInputs(entry.mortarPos, entry.targetPos);
    
    if (entry.correctionApplied) {
        State.setCorrectionApplied(true);
        State.setOriginalTargetPos(entry.originalTargetPos ? { ...entry.originalTargetPos } : null);
        State.setLastCorrectionLR(entry.correctionLR || 0);
        State.setLastCorrectionAD(entry.correctionAD || 0);
        dependencies.setTargetHighlight(COLORS.errorText);
    } else {
        State.resetCorrectionState();
        dependencies.setTargetHighlight();
    }
    
    await dependencies.calculateSolution();
    
    setTimeout(() => {
        if (entry.selectedCharge !== undefined && entry.selectedCharge !== null) {
            dependencies.selectMission(entry.selectedCharge);
        }
        
        if (entry.correctionApplied) {
            setValue('correctionLR', (entry.correctionLR || 0).toString());
            setValue('correctionAD', (entry.correctionAD || 0).toString());
            
            // Update button state after setting correction values
            if (dependencies.updateCorrectionPreview) {
                setTimeout(() => dependencies.updateCorrectionPreview(), 50);
            }
        }
    }, 60);
    
    await updateHistoryDisplay();
    
    setTimeout(() => {
        isLoadingFromHistory = false;
    }, 100);
}

/**
 * Set inputs from history data
 */
export async function setInputsFromData(data) {
    if (dependencies.updateShellTypes) {
        setValue('mortarType', data.mortarType);
        await dependencies.updateShellTypes();
        setValue('shellType', data.shellType);
    }
    setValue('missionLabel', data.missionLabel || '');
    
    setChecked('ffeEnabled', data.ffeEnabled);
    setDisplay(getElement('ffeControls'), data.ffeEnabled);
    
    if (data.ffeEnabled) {
        setValue('ffePattern', data.ffePattern);
        setValue('ffeRounds', data.ffeRounds.toString());
        setValue('ffeSpacing', data.ffeSpacing.toString());
        setValue('ffeRadius', data.ffeRadius.toString());
        
        const isCircular = data.ffePattern === 'circular';
        setDisplay(getElement('ffeSpacingGroup'), !isCircular);
        setDisplay(getElement('ffeRadiusGroup'), isCircular);
    }
    
    const foModeValue = data.foModeEnabled || false;
    State.setFOModeEnabled(foModeValue);
    
    setChecked('foEnabled', foModeValue);
    
    if (data.observerPos) {
        State.setLastObserverPos({ ...data.observerPos });
        
        const isGridMode = CoordManager.getMode() === 'grid';
        
        if (isGridMode) {
            const observerGrid = MortarCalculator.metersToGrid(data.observerPos.x, data.observerPos.y).split('/');
            setValue('observerGridX', observerGrid[0]);
            setValue('observerGridY', observerGrid[1]);
        } else {
            setValue('observerX', data.observerPos.x.toFixed(1));
            setValue('observerY', data.observerPos.y.toFixed(1));
        }
    } else {
        State.setLastObserverPos(null);
        INPUT_IDS.OBSERVER_FIELDS.forEach(id => {
            setValue(id, '');
        });
    }
}

/**
 * Update history display panel
 */
export async function updateHistoryDisplay() {
    const historyList = getElement('historyList', false);
    const historyPanel = getElement('historyPanel', false);
    
    if (missionHistory.length === 0) {
        setDisplay(historyPanel, false);
        return;
    }
    
    setDisplay(historyPanel, true);
    
    const mortarTypes = dependencies.getAllMortarTypes ? dependencies.getAllMortarTypes() : [];
    
    historyList.innerHTML = missionHistory.map((entry, index) => {
        const time = entry.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const mortarDisplay = formatPositionDisplay(entry.mortarPos, entry.inputMode);
        const targetDisplay = formatPositionDisplay(entry.targetPos, entry.inputMode);
        
        const mortarName = mortarTypes.find(m => m.id === entry.mortarType)?.name || entry.mortarType;
        const ffeInfo = entry.ffeEnabled ? ` | FFE: ${entry.ffeRounds} rds` : '';
        const foInfo = entry.foModeEnabled ? ` | 👁️ FO` : '';
        const modeInfo = entry.inputMode === 'grid' ? ' | 🎯 Grid' : ' | 📏 Meters';
        const labelDisplay = entry.missionLabel ? `<strong style="color: #8fbc1e;">${entry.missionLabel}</strong> - ` : '';
        const correctionInfo = entry.correctionApplied 
            ? `<span style="color: ${COLORS.errorText}; font-weight: 600;"> | 🔴 CORRECTED (L/R: ${entry.correctionLR > 0 ? '+' : ''}${entry.correctionLR}m, A/D: ${entry.correctionAD > 0 ? '+' : ''}${entry.correctionAD}m)</span>` 
            : '';
        
        return `
            <div class="history-item ${index === currentHistoryIndex ? 'active' : ''}" onclick="loadFromHistory(${index})">
                <div class="history-header">
                    <div>
                        <span class="history-time">${time}</span>
                        <span class="history-title">${labelDisplay}${mortarName} ${entry.shellType}</span>
                    </div>
                    <button class="history-delete" onclick="deleteFromHistory(${index}, event)" title="Delete mission">🗑️</button>
                </div>
                <div class="history-details">
                    📍 ${mortarDisplay} → 🎯 ${targetDisplay} | ${entry.distance.toFixed(0)}m${modeInfo}${ffeInfo}${foInfo}${correctionInfo}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Clear all history
 */
export async function clearHistory() {
    missionHistory.length = 0;
    currentHistoryIndex = -1;
    await updateHistoryDisplay();
}

/**
 * Delete single history entry
 */
export async function deleteFromHistory(index, event) {
    event.stopPropagation();
    
    missionHistory.splice(index, 1);
    
    if (currentHistoryIndex === index) {
        currentHistoryIndex = -1;
    } else if (currentHistoryIndex > index) {
        currentHistoryIndex--;
    }
    
    await updateHistoryDisplay();
}

/**
 * Expose to window for onclick compatibility
 */
export function exposeToWindow() {
    window.loadFromHistory = loadFromHistory;
    window.clearHistory = clearHistory;
    window.deleteFromHistory = deleteFromHistory;
    window.resetHistoryIndex = () => { currentHistoryIndex = -1; };
}

/**
 * Set current history index (used by calculator)
 */
export function setCurrentHistoryIndex(index) {
    currentHistoryIndex = index;
}

/**
 * Get current history index
 */
export function getCurrentHistoryIndex() {
    return currentHistoryIndex;
}
