/**
 * Global State Management
 * Centralizes window.* state properties to prevent cross-module bugs
 * CRITICAL: Always prioritize this state over DOM state
 * Version: 2.3.2
 */

// State object - single source of truth
const state = {
    ballisticDataLoaded: false,
    correctionApplied: false,
    lastCorrectionLR: null,
    lastCorrectionAD: null,
    originalTargetPos: null,
    selectedCharge: null,
    previousCharge: null,
    originalOptimalCharge: null,
    lastInput: null,
    lastSolutions: null,
    lastSolution: null,
    isClearingCorrectionFields: false
};

// Getters
export function isBallisticDataLoaded() {
    return state.ballisticDataLoaded;
}

export function isCorrectionApplied() {
    return state.correctionApplied;
}

export function getLastCorrectionLR() {
    return state.lastCorrectionLR;
}

export function getLastCorrectionAD() {
    return state.lastCorrectionAD;
}

export function getOriginalTargetPos() {
    return state.originalTargetPos;
}

export function getSelectedCharge() {
    return state.selectedCharge;
}

export function getPreviousCharge() {
    return state.previousCharge;
}

export function getOriginalOptimalCharge() {
    return state.originalOptimalCharge;
}

export function getLastInput() {
    return state.lastInput;
}

export function getLastSolutions() {
    return state.lastSolutions;
}

export function getLastSolution() {
    return state.lastSolution;
}

export function isClearingCorrectionFields() {
    return state.isClearingCorrectionFields;
}

// Setters

// Setters
export function setBallisticDataLoaded(value) {
    state.ballisticDataLoaded = value;
}

export function setCorrectionApplied(value) {
    state.correctionApplied = value;
}

export function setLastCorrectionLR(value) {
    state.lastCorrectionLR = value;
}

export function setLastCorrectionAD(value) {
    state.lastCorrectionAD = value;
}

export function setOriginalTargetPos(value) {
    state.originalTargetPos = value;
}

export function setSelectedCharge(value) {
    state.selectedCharge = value;
}

export function setPreviousCharge(value) {
    state.previousCharge = value;
}

export function setOriginalOptimalCharge(value) {
    state.originalOptimalCharge = value;
}

export function setLastInput(value) {
    state.lastInput = value;
}

export function setLastSolutions(value) {
    state.lastSolutions = value;
}

export function setLastSolution(value) {
    state.lastSolution = value;
}

export function setIsClearingCorrectionFields(value) {
    state.isClearingCorrectionFields = value;
}

// Backward compatibility - expose state on window object
export function syncToWindow() {
    // Don't sync ballisticDataLoaded - it's managed by main.js and should persist
    // window.ballisticDataLoaded = state.ballisticDataLoaded;
    window.correctionApplied = state.correctionApplied;
    window.lastCorrectionLR = state.lastCorrectionLR;
    window.lastCorrectionAD = state.lastCorrectionAD;
    window.originalTargetPos = state.originalTargetPos;
    window.selectedCharge = state.selectedCharge;
    window.previousCharge = state.previousCharge;
    window.originalOptimalCharge = state.originalOptimalCharge;
    window.lastInput = state.lastInput;
}

// Reset correction state
export function resetCorrectionState() {
    state.correctionApplied = false;
    state.originalTargetPos = null;
    state.lastCorrectionLR = null;
    state.lastCorrectionAD = null;
    syncToWindow();
}

// Reset all state
export function resetAllState() {
    // Reset FO mode checkbox directly (DOM is source of truth)
    const foCheckbox = document.getElementById('foEnabled');
    if (foCheckbox) foCheckbox.checked = false;
    
    state.correctionApplied = false;
    state.lastCorrectionLR = null;
    state.lastCorrectionAD = null;
    state.originalTargetPos = null;
    state.selectedCharge = null;
    state.previousCharge = null;
    state.originalOptimalCharge = null;
    state.lastSolution = null;
    state.lastSolutions = null;
    state.lastInput = null;
    state.isClearingCorrectionFields = false;
    syncToWindow();
}

/**
 * Expose to window (no-op for state module)
 */
export function exposeToWindow() {
    // State is already synchronized to window via syncToWindow()
}
