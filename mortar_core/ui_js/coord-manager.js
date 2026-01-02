/**
 * Coordinate Manager Module
 * Consolidated position parsing, validation, and coordinate mode management
 * Version: 1.7.0
 * 
 * Eliminates 120+ lines of duplicated position parsing logic
 * Single source of truth for grid/meters conversions
 */

import { getElement, getValue, setValue } from './dom-cache.js';

/**
 * Coordinate input mode: 'grid' or 'meters'
 */
let currentMode = 'grid';

/**
 * Get current coordinate input mode
 * @returns {'grid'|'meters'}
 */
export function getMode() {
    const gridBtn = getElement('toggleGrid', false);
    if (gridBtn) {
        currentMode = gridBtn.classList.contains('active') ? 'grid' : 'meters';
    }
    return currentMode;
}

/**
 * Set coordinate input mode
 * @param {'grid'|'meters'} mode
 */
export function setMode(mode) {
    currentMode = mode;
    
    // Button elements (for styling active state)
    const gridBtn = getElement('toggleGrid', false);
    const metersBtn = getElement('toggleMeters', false);
    
    // Field container elements (for showing/hiding)
    const mortarGridMode = getElement('mortarGridMode', false);
    const mortarMetersMode = getElement('mortarMetersMode', false);
    const targetGridMode = getElement('targetGridMode', false);
    const targetMetersMode = getElement('targetMetersMode', false);
    const observerGridMode = getElement('observerGridMode', false);
    const observerMetersMode = getElement('observerMetersMode', false);
    
    // Hide fire correction widget when switching modes
    const widget = getElement('fireCorrectionWidget', false);
    if (widget) widget.style.display = 'none';
    
    if (mode === 'grid') {
        // Update button styling
        gridBtn?.classList.add('active');
        metersBtn?.classList.remove('active');
        
        // Show/hide field containers
        if (mortarGridMode) mortarGridMode.style.display = 'block';
        if (mortarMetersMode) mortarMetersMode.style.display = 'none';
        if (targetGridMode) targetGridMode.style.display = 'block';
        if (targetMetersMode) targetMetersMode.style.display = 'none';
        
        // Update observer field visibility
        observerGridMode?.classList.add('active');
        observerMetersMode?.classList.remove('active');
    } else {
        // Update button styling
        metersBtn?.classList.add('active');
        gridBtn?.classList.remove('active');
        
        // Show/hide field containers
        if (mortarMetersMode) mortarMetersMode.style.display = 'block';
        if (mortarGridMode) mortarGridMode.style.display = 'none';
        if (targetMetersMode) targetMetersMode.style.display = 'block';
        if (targetGridMode) targetGridMode.style.display = 'none';
        
        // Update observer field visibility
        observerMetersMode?.classList.add('active');
        observerGridMode?.classList.remove('active');
    }
}

/**
 * Parse position from UI inputs
 * Handles both grid and meters modes
 * 
 * @param {'mortar'|'target'|'observer'} prefix - Input field prefix
 * @param {boolean} allowUndefined - Return null if fields empty/missing
 * @returns {{x: number, y: number, z: number}|null}
 */
export function parsePosition(prefix, allowUndefined = false) {
    const mode = getMode();
    
    if (mode === 'grid') {
        return parseGridPosition(prefix, allowUndefined);
    } else {
        return parseMetersPosition(prefix, allowUndefined);
    }
}

/**
 * Parse grid coordinate position
 * @private
 */
function parseGridPosition(prefix, allowUndefined) {
    // For observer fields, force refresh since they're dynamically created
    const forceRefresh = prefix === 'observer';
    const gridXEl = getElement(`${prefix}GridX`, false, forceRefresh);
    const gridYEl = getElement(`${prefix}GridY`, false, forceRefresh);
    
    if (!gridXEl || !gridYEl) {
        if (allowUndefined) return null;
        throw new Error(`Grid elements for ${prefix} not found`);
    }
    
    const gridX = gridXEl.value.trim();
    const gridY = gridYEl.value.trim();
    
    if (!gridX || !gridY) {
        if (allowUndefined) return null;
        
        // Highlight missing fields before throwing error
        if (window.highlightMissingFields) {
            window.highlightMissingFields(prefix);
        }
        throw new Error(`Enter grid coordinates for ${prefix}`);
    }
    
    const gridCoord = `${gridX}/${gridY}`;
    const meters = MortarCalculator.parseGridToMeters(gridCoord);
    
    const z = parseFloat(getValue(`${prefix}Z`, '0')) || 0;
    
    return { x: meters.x, y: meters.y, z: z };
}

/**
 * Parse meters coordinate position
 * @private
 */
function parseMetersPosition(prefix, allowUndefined) {
    // For observer fields, force refresh since they're dynamically created
    const forceRefresh = prefix === 'observer';
    const xEl = getElement(`${prefix}X`, false, forceRefresh);
    const yEl = getElement(`${prefix}Y`, false, forceRefresh);
    
    if (!xEl || !yEl) {
        if (allowUndefined) return null;
        throw new Error(`Position elements for ${prefix} not found`);
    }
    
    const x = parseFloat(xEl.value);
    const y = parseFloat(yEl.value);
    
    if (isNaN(x) || isNaN(y)) {
        if (allowUndefined) return null;
        
        // Highlight missing fields before throwing error
        if (window.highlightMissingFields) {
            window.highlightMissingFields(prefix);
        }
        throw new Error(`Enter X/Y coordinates for ${prefix}`);
    }
    
    const z = parseFloat(getValue(`${prefix}Z`, '0')) || 0;
    
    return { x, y, z };
}

/**
 * Set position inputs from position object
 * Handles both grid and meters modes
 * 
 * @param {'mortar'|'target'|'observer'} prefix - Input field prefix
 * @param {{x: number, y: number, z?: number}} position - Position object
 */
export function setPosition(prefix, position) {
    const mode = getMode();
    
    if (mode === 'grid') {
        const grid = MortarCalculator.metersToGrid(position.x, position.y).split('/');
        setValue(`${prefix}GridX`, grid[0]);
        setValue(`${prefix}GridY`, grid[1]);
    } else {
        setValue(`${prefix}X`, position.x.toFixed(1));
        setValue(`${prefix}Y`, position.y.toFixed(1));
    }
    
    if (position.z !== undefined) {
        setValue(`${prefix}Z`, position.z.toFixed(1));
    }
}

/**
 * Set multiple positions at once
 * @param {{x: number, y: number, z?: number}} mortarPos
 * @param {{x: number, y: number, z?: number}} targetPos
 * @param {{x: number, y: number, z?: number}?} observerPos
 */
export function setPositions(mortarPos, targetPos, observerPos = null) {
    setPosition('mortar', mortarPos);
    setPosition('target', targetPos);
    
    if (observerPos) {
        setPosition('observer', observerPos);
    }
}

/**
 * Validate grid format (3-4 digits)
 * @param {string} value - Grid coordinate value
 * @returns {boolean}
 */
export function isValidGrid(value) {
    return /^\d{3,4}$/.test(value.trim());
}

/**
 * Validate coordinate is within range
 * @param {number} value - Coordinate value
 * @param {number} min - Minimum allowed
 * @param {number} max - Maximum allowed
 * @returns {boolean}
 */
export function isValidCoordinate(value, min = 0, max = 99999.9) {
    return !isNaN(value) && value >= min && value <= max;
}
