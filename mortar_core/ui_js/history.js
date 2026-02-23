/**
 * History Management Module
 * Handles mission history storage, retrieval, and display
 * Version: 2.6.0
 * 
 * CRITICAL: Always deep copy position objects to prevent mutation
 * Architecture: Uses dependency injection to avoid circular dependencies
 * Security: Event delegation (no inline handlers), HTML sanitization
 */

import { INPUT_IDS, COLORS } from './constants.js';
import { formatPositionDisplay, setDisplay } from './utils.js';
import * as State from './state.js';
import * as CoordManager from './coord-manager.js';
import { getElement, getValue, setValue, isChecked, setChecked } from './dom-cache.js';

/**
 * Sanitize HTML to prevent XSS attacks
 * @param {string} str - Input string that may contain HTML
 * @returns {string} Sanitized string safe for innerHTML
 */
function sanitizeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Mission history storage
export const missionHistory = [];
export let currentHistoryIndex = -1;

// localStorage persistence
const STORAGE_KEY = 'mortar_app_history';

function saveHistoryToStorage() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(missionHistory));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn('localStorage full, history not saved');
        } else if (e.name === 'SecurityError') {
            console.warn('localStorage unavailable');
        } else {
            console.error('Failed to save history:', e);
        }
    }
}

function loadHistoryFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const entries = JSON.parse(stored);
        // Reconstruct Date objects from ISO strings
        return entries.map(entry => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
        }));
    } catch (e) {
        console.warn('History data corrupted, starting fresh:', e.message);
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }
}

function clearHistoryFromStorage() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
        console.warn('Failed to clear localStorage:', e.message);
    }
}

/**
 * Restore history from localStorage on app startup
 */
export async function restoreHistoryFromStorage() {
    const entries = loadHistoryFromStorage();
    if (entries.length > 0) {
        missionHistory.push(...entries);
        await updateHistoryDisplay();
    }
}

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
 * Uses State module for FO mode, checkbox is static element (no forceRefresh)
 */
export async function captureCurrentInputs() {
    const foCheckbox = getElement('foEnabled', false);
    const foEnabled = foCheckbox ? foCheckbox.checked : false;
    
    let observerPos = null;
    let observerGridValues = null;
    if (foEnabled && dependencies.parsePositionFromUI) {
        try {
            observerPos = dependencies.parsePositionFromUI('observer', true);
            // Capture raw grid values if in grid mode
            if (CoordManager.getMode() === 'grid') {
                const observerGridX = getValue('observerGridX');
                const observerGridY = getValue('observerGridY');
                if (observerGridX && observerGridY) {
                    observerGridValues = { x: observerGridX, y: observerGridY };
                }
            }
        } catch (e) {
            // Observer position parsing failed
        }
    }
    
    return {
        mortarType: getValue('mortarType'),
        shellType: getValue('shellType'),
        missionLabel: getValue('missionLabel').trim(),
        foModeEnabled: foEnabled,
        observerPos: observerPos,
        observerGridValues: observerGridValues
    };
}

/**
 * Add entry to mission history
 * Deep copies all position objects to prevent cross-contamination
 */
export async function addToHistory(weaponPos, targetPos, distance, solutions) {
    if (State.isLoadingFromHistory()) {
        return;
    }
    
    if (State.isClearingCorrectionFields()) {
        return;
    }
    
    const isGridMode = CoordManager.getMode() === 'grid';
    
    let correctionLR = 0;
    let correctionAD = 0;
    if (State.isCorrectionApplied()) {
        correctionLR = State.getLastCorrectionLR() || parseFloat(getValue('correctionLR')) || 0;
        correctionAD = State.getLastCorrectionAD() || parseFloat(getValue('correctionAD')) || 0;
    }
    
    const capturedInputs = await captureCurrentInputs();
    
    // Capture raw grid coordinate values to preserve 3-4 digit format
    let mortarGridValues = null;
    let targetGridValues = null;
    let originalTargetGridValues = null;
    
    if (isGridMode) {
        const mortarGridX = getValue('mortarGridX');
        const mortarGridY = getValue('mortarGridY');
        const targetGridX = getValue('targetGridX');
        const targetGridY = getValue('targetGridY');
        
        if (mortarGridX && mortarGridY) {
            mortarGridValues = { x: mortarGridX, y: mortarGridY };
        }
        if (targetGridX && targetGridY) {
            targetGridValues = { x: targetGridX, y: targetGridY };
        }
        
        // Capture original target grid values if correction was applied
        if (State.isCorrectionApplied() && State.getOriginalTargetPos()) {
            const origPos = State.getOriginalTargetPos();
            const originalMeters = origPos.meters || origPos;
            // Use raw grid values if available (preserves 3-4 digit format)
            if (origPos.mode === 'grid' && origPos.gridX && origPos.gridY) {
                originalTargetGridValues = { x: origPos.gridX, y: origPos.gridY };
            } else {
                // Fallback: convert from meters (legacy or meters mode)
                const origGrid = BallisticCalculator.metersToGrid(originalMeters.x, originalMeters.y, true).split('/');
                originalTargetGridValues = { x: origGrid[0], y: origGrid[1] };
            }
        }
    }
    
    const entry = {
        id: Date.now(),
        timestamp: new Date(),
        ...capturedInputs,
        mortarPos: { ...weaponPos },
        targetPos: { ...targetPos },
        observerPos: capturedInputs.observerPos ? { ...capturedInputs.observerPos } : null,
        distance,
        inputMode: isGridMode ? 'grid' : 'meters',
        mortarGridValues: mortarGridValues,
        targetGridValues: targetGridValues,
        originalTargetGridValues: originalTargetGridValues,
        correctionApplied: State.isCorrectionApplied() || false,
        originalTargetPos: State.getOriginalTargetPos() ? { ...State.getOriginalTargetPos() } : null,
        correctionLR: correctionLR,
        correctionAD: correctionAD,
        selectedCharge: State.getSelectedCharge() || (solutions && solutions.length > 0 ? solutions[0].charge : null),
        azimuth: solutions && solutions.length > 0 ? solutions[0].azimuth : null,
        elevation: solutions && solutions.length > 0 ? solutions[0].elevation : null
    };
    
    const isCorrection = State.isCorrectionApplied() && 
                         (State.getLastCorrectionLR() !== 0 || State.getLastCorrectionAD() !== 0);
    
    // Check if weapon system or target changed from current history entry
    let shouldReplaceEntry = false;
    if (currentHistoryIndex >= 0 && currentHistoryIndex < missionHistory.length) {
        const originalEntry = missionHistory[currentHistoryIndex];
        const weaponSystemChanged = originalEntry.mortarType !== entry.mortarType || 
                                   originalEntry.shellType !== entry.shellType;
        const targetChanged = Math.abs(originalEntry.targetPos.x - entry.targetPos.x) > 0.1 ||
                            Math.abs(originalEntry.targetPos.y - entry.targetPos.y) > 0.1 ||
                            Math.abs(originalEntry.targetPos.z - entry.targetPos.z) > 0.1;
        const weaponPosChanged = Math.abs(originalEntry.mortarPos.x - entry.mortarPos.x) > 0.1 ||
                                Math.abs(originalEntry.mortarPos.y - entry.mortarPos.y) > 0.1 ||
                                Math.abs(originalEntry.mortarPos.z - entry.mortarPos.z) > 0.1;
        
        shouldReplaceEntry = !weaponSystemChanged && !targetChanged && !weaponPosChanged;
    }
    
    if (isCorrection) {
        missionHistory.unshift(entry);
        if (missionHistory.length > 20) missionHistory.pop();
        currentHistoryIndex = 0;
    } else if (shouldReplaceEntry) {
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
    saveHistoryToStorage();
}

/**
 * Load mission from history
 */
export async function loadFromHistory(index) {
    if (index < 0 || index >= missionHistory.length) return;
    
    const entry = missionHistory[index];
    currentHistoryIndex = index;
    State.setLoadingFromHistory(true);
    
    const targetMode = entry.inputMode || 'grid';
    const currentMode = CoordManager.getMode();
    if (currentMode !== targetMode && dependencies.setCoordMode) {
        dependencies.setCoordMode(targetMode);
    }
    
    await setInputsFromData(entry);
    
    // Restore positions with raw grid values if available
    if (targetMode === 'grid' && entry.mortarGridValues && entry.targetGridValues) {
        // Use stored grid values (preserves 3-4 digit format)
        setValue('mortarGridX', entry.mortarGridValues.x);
        setValue('mortarGridY', entry.mortarGridValues.y);
        setValue('mortarZ', entry.mortarPos.z.toFixed(1));
        setValue('targetGridX', entry.targetGridValues.x);
        setValue('targetGridY', entry.targetGridValues.y);
        setValue('targetZ', entry.targetPos.z.toFixed(1));
    } else {
        // Fallback or meters mode
        dependencies.setPositionInputs(entry.mortarPos, entry.targetPos);
    }
    
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
        State.setLoadingFromHistory(false);
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
    
    // Always disable FFE when loading from history (history only stores base solutions)
    setChecked('ffeEnabled', false);
    const ffeWidget = getElement('ffeWidget', false);
    if (ffeWidget) ffeWidget.style.display = 'none';
    
    const foModeValue = data.foModeEnabled || false;
    
    setChecked('foEnabled', foModeValue);
    
    if (data.observerPos) {
        const isGridMode = CoordManager.getMode() === 'grid';
        
        if (isGridMode) {
            // Use stored grid values if available (preserves 3-4 digit format)
            if (data.observerGridValues) {
                setValue('observerGridX', data.observerGridValues.x);
                setValue('observerGridY', data.observerGridValues.y);
            } else {
                // Fallback: convert from meters (legacy entries)
                const observerGrid = BallisticCalculator.metersToGrid(data.observerPos.x, data.observerPos.y, true).split('/');
                setValue('observerGridX', observerGrid[0]);
                setValue('observerGridY', observerGrid[1]);
            }
        } else {
            setValue('observerX', data.observerPos.x.toFixed(1));
            setValue('observerY', data.observerPos.y.toFixed(1));
        }
    } else {
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
    
    const weaponSystems = dependencies.getAllMortarTypes ? dependencies.getAllMortarTypes() : [];
    
    historyList.innerHTML = missionHistory.map((entry, index) => {
        const time = entry.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        const mortarDisplay = formatPositionDisplay(entry.mortarPos, entry.inputMode);
        const targetDisplay = formatPositionDisplay(entry.targetPos, entry.inputMode);
        
        // Support both old (mortarType) and new (weaponId) field names
        const weaponId = entry.weaponId || entry.mortarType;
        const weaponName = weaponSystems.find(w => w.id === weaponId)?.name || weaponId;
        
        // Get ammo/projectile name
        const ammoId = entry.ammoType || entry.shellType;
        let ammoName = ammoId;
        try {
            const weaponConfig = BallisticCalculator.getWeaponConfig(weaponId, ammoId);
            // For all system types (mortar, mlrs, howitzer), ammunition.name contains the display name
            ammoName = weaponConfig.ammunition.name || ammoId;
        } catch (e) {
            // Fallback to ID if lookup fails
            ammoName = ammoId;
        }
        
        const foInfo = entry.foModeEnabled ? ` | 👁️ FO` : '';
        const modeInfo = entry.inputMode === 'grid' ? ' | 🎯 Grid' : ' | 📏 Meters';
        // Sanitize user-provided mission label to prevent XSS
        const labelDisplay = entry.missionLabel 
            ? `<strong style="color: #8fbc1e;">${sanitizeHTML(entry.missionLabel)}</strong> - ` 
            : '';
        const correctionInfo = entry.correctionApplied 
            ? `<span style="color: ${COLORS.errorText}; font-weight: 600;"> | 🔴 CORRECTED (L/R: ${entry.correctionLR > 0 ? '+' : ''}${entry.correctionLR}m, A/D: ${entry.correctionAD > 0 ? '+' : ''}${entry.correctionAD}m)</span>` 
            : '';
        
        // Show original target and difference if correction was applied
        let correctionDetails = '';
        if (entry.correctionApplied && entry.originalTargetPos) {
            const origPos = entry.originalTargetPos;
            const originalMeters = origPos.meters || origPos;
            
            // Use raw grid values if available, otherwise convert from meters
            let originalDisplay;
            if (entry.inputMode === 'grid' && entry.originalTargetGridValues) {
                originalDisplay = `${entry.originalTargetGridValues.x}/${entry.originalTargetGridValues.y}`;
            } else {
                originalDisplay = formatPositionDisplay(originalMeters, entry.inputMode);
            }
            
            // Calculate differences
            const deltaX = entry.targetPos.x - originalMeters.x;
            const deltaY = entry.targetPos.y - originalMeters.y;
            const deltaZ = entry.targetPos.z - originalMeters.z;
            
            // Calculate original azimuth/elevation if we have solution data
            let originalSolutionInfo = '';
            if (entry.azimuth !== null && entry.elevation !== null) {
                // Need to recalculate original solution
                const weaponId = entry.weaponId || entry.mortarType;
                const ammoType = entry.ammoType || entry.shellType;
                const origPos = entry.originalTargetPos;
                const originalMeters = origPos.meters || origPos;
                const originalInput = BallisticCalculator.prepareInput(entry.mortarPos, originalMeters, weaponId, ammoType);
                originalInput.chargeLevel = entry.selectedCharge;
                const originalSolutions = BallisticCalculator.calculateAllTrajectories(originalInput);
                
                if (originalSolutions.length > 0 && originalSolutions[0].inRange) {
                    const origSol = originalSolutions[0];
                    const deltaAz = entry.azimuth - origSol.azimuth;
                    const deltaEl = entry.elevation - origSol.elevation;
                    
                    originalSolutionInfo = `
                        <div style="margin-top: 2px; font-size: 0.85em;">
                            <span style="color: #666;">Original Az/El:</span> ${origSol.azimuth.toFixed(1)}° / ${origSol.elevation.toFixed(1)}°
                            <span style="color: #666; margin-left: 8px;">Δ:</span> <span style="color: ${COLORS.errorText};">Az: ${deltaAz > 0 ? '+' : ''}${deltaAz.toFixed(1)}°, El: ${deltaEl > 0 ? '+' : ''}${deltaEl.toFixed(1)}°</span>
                        </div>`;
                }
            }
            
            correctionDetails = `
                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.9em; color: #999;">
                    <div><span style="color: #666;">Original Target:</span> 🎯 ${originalDisplay}</div>
                    <div style="margin-top: 2px;">
                        <span style="color: #666;">Δ Position:</span> <span style="color: ${COLORS.errorText};">X: ${deltaX > 0 ? '+' : ''}${deltaX.toFixed(1)}m, Y: ${deltaY > 0 ? '+' : ''}${deltaY.toFixed(1)}m${deltaZ !== 0 ? `, Z: ${deltaZ > 0 ? '+' : ''}${deltaZ.toFixed(1)}m` : ''}</span>
                    </div>
                    ${originalSolutionInfo}
                </div>`;
        }
        
        // Add current azimuth/elevation for corrected entries
        let currentSolutionInfo = '';
        if (entry.correctionApplied && entry.azimuth !== null && entry.elevation !== null) {
            currentSolutionInfo = `
                <div style="margin-top: 2px; font-size: 0.85em; color: ${COLORS.errorText}; font-weight: 600;">
                    Corrected Az/El: ${entry.azimuth.toFixed(1)}° / ${entry.elevation.toFixed(1)}°
                </div>`;
        }
        
        return `
            <div class="history-item ${index === currentHistoryIndex ? 'active' : ''}" data-index="${index}">
                <div class="history-header">
                    <div>
                        <span class="history-time">${time}</span>
                        <span class="history-title">${labelDisplay}${weaponName} ${ammoName}</span>
                    </div>
                    <button class="history-delete" data-index="${index}" title="Delete mission">🗑️</button>
                </div>
                <div class="history-details">
                    📍 ${mortarDisplay} → 🎯 ${targetDisplay} | ${entry.distance.toFixed(0)}m${modeInfo}${foInfo}${correctionInfo}
                    ${currentSolutionInfo}
                    ${correctionDetails}
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
    clearHistoryFromStorage();
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
    saveHistoryToStorage();
}

/**
 * Setup event delegation for history list
 * Replaces inline onclick handlers for CSP compliance
 */
export function setupHistoryListeners() {
    const historyList = getElement('historyList', true);
    
    historyList.addEventListener('click', (e) => {
        const historyItem = e.target.closest('.history-item');
        const deleteBtn = e.target.closest('.history-delete');
        
        if (deleteBtn) {
            e.stopPropagation();
            const index = parseInt(deleteBtn.dataset.index);
            if (!isNaN(index)) {
                deleteFromHistory(index, e);
            }
        } else if (historyItem) {
            const index = parseInt(historyItem.dataset.index);
            if (!isNaN(index)) {
                loadFromHistory(index);
            }
        }
    });
}

/**
 * Reset history index (used by calculator)
 */
export function resetHistoryIndex() {
    currentHistoryIndex = -1;
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
