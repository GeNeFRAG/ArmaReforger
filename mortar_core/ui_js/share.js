/**
 * Session Sharing Module
 * Enables sharing mortar fire missions between faction and clan members
 * Version: 1.1.0
 */

import { INPUT_IDS, SHARE_CONSTANTS } from './constants.js';
import { showOutputError, parsePositionFromUI } from './ui.js';
import { calculateSolution } from './calculator.js';
import * as State from './state.js';
import { setDisplay } from './utils.js';

// Modal state
let shareModalElement = null;

/**
 * Captures current session state for sharing (optimized, abbreviated format)
 * Reads from UI input fields and omits defaults/empty values
 */
export function captureSessionForShare() {
    // Get current positions from UI input fields
    let mortarPos, targetPos;
    
    try {
        mortarPos = parsePositionFromUI('mortar', false);
        targetPos = parsePositionFromUI('target', false);
    } catch (error) {
        throw new Error('Please enter valid mortar and target positions before sharing.');
    }
    
    if (!mortarPos || !targetPos) {
        throw new Error('Please enter mortar and target positions before sharing.');
    }
    
    const data = {
        v: SHARE_CONSTANTS.version,
        mp: roundPosition(mortarPos),
        tp: roundPosition(targetPos)
    };
    
    // Optional: Observer position (FO mode)
    if (State.isFoModeEnabled() && State.getLastObserverPos()) {
        data.op = roundPosition(State.getLastObserverPos());
    }
    
    // Optional: Fire corrections
    if (State.isCorrectionApplied()) {
        data.cor = {
            lr: State.getLastCorrectionLR() || 0,
            ad: State.getLastCorrectionAD() || 0
        };
        
        // Include original target before corrections
        if (State.getOriginalTargetPos()) {
            data.otp = roundPosition(State.getOriginalTargetPos());
        }
    }
    
    // Optional: Weapon system (only if not default)
    const weaponSelect = document.getElementById('mortarType');
    if (weaponSelect && weaponSelect.value !== SHARE_CONSTANTS.defaultWeapon) {
        data.ws = weaponSelect.value;
    }
    
    // Optional: Shell/Ammunition type
    const shellSelect = document.getElementById('shellType');
    if (shellSelect && shellSelect.value) {
        data.sh = shellSelect.value;
    }
    
    // Optional: Mission label
    const labelInput = document.getElementById('missionLabel');
    if (labelInput && labelInput.value.trim()) {
        data.lbl = labelInput.value.trim();
    }
    
    // Optional: FFE pattern (if active)
    // Note: Actual FFE data structure depends on implementation
    // Placeholder for future FFE integration
    if (window.ffePattern) {
        data.ffe = window.ffePattern;
    }
    
    return data;
}

/**
 * Encodes session data as base64 string for URL sharing
 */
export function encodeSession(sessionData) {
    try {
        const json = JSON.stringify(sessionData);
        return btoa(json);
    } catch (error) {
        throw new Error(`Failed to encode session: ${error.message}`);
    }
}

/**
 * Decodes base64 string to session data object
 * @throws {Error} If decode or parse fails
 */
export function decodeSession(encodedString) {
    try {
        const json = atob(encodedString);
        return JSON.parse(json);
    } catch (error) {
        if (error.name === 'InvalidCharacterError' || error.message.includes('atob')) {
            throw new Error('Invalid share link format. The link may be corrupted or incomplete.');
        }
        throw new Error('Unable to read share link data. The link may be from an incompatible version.');
    }
}

/**
 * Validates session data structure and field values
 * Returns {valid: boolean, errors: string[], warnings: string[], data: object|null}
 */
export function validateSession(sessionData) {
    const result = {
        valid: false,
        errors: [],
        warnings: [],
        data: null
    };
    
    // Type check
    if (!sessionData || typeof sessionData !== 'object') {
        result.errors.push('Invalid session data structure.');
        return result;
    }
    
    // Version check
    if (typeof sessionData.v !== 'number') {
        result.warnings.push('Missing version information. Attempting to load anyway.');
    } else if (sessionData.v > SHARE_CONSTANTS.version) {
        result.warnings.push('Loaded session from newer version. Some features may not work correctly.');
    }
    
    // Required fields check
    if (!sessionData.mp) {
        result.errors.push('Share link is missing required mortar position data.');
        return result;
    }
    
    if (!sessionData.tp) {
        result.errors.push('Share link is missing required target position data.');
        return result;
    }
    
    // Validate positions
    try {
        const mortarPos = validatePosition(sessionData.mp, 'mortar');
        const targetPos = validatePosition(sessionData.tp, 'target');
        
        result.data = {
            version: sessionData.v || 1,
            mortarPos,
            targetPos,
            observerPos: null,
            weaponSystem: SHARE_CONSTANTS.defaultWeapon,
            shellType: null,
            missionLabel: '',
            correction: null,
            originalTargetPos: null,
            ffePattern: null
        };
        
        // Validate optional fields
        if (sessionData.op) {
            try {
                result.data.observerPos = validatePosition(sessionData.op, 'observer');
            } catch (e) {
                result.warnings.push(`Invalid observer position: ${e.message}`);
            }
        }
        
        if (sessionData.otp) {
            try {
                result.data.originalTargetPos = validatePosition(sessionData.otp, 'original target');
            } catch (e) {
                result.warnings.push(`Invalid original target position: ${e.message}`);
            }
        }
        
        // Validate weapon system
        if (sessionData.ws) {
            // Basic validation - can be enhanced with actual weapon list
            if (typeof sessionData.ws === 'string' && sessionData.ws.length > 0) {
                result.data.weaponSystem = sessionData.ws;
            } else {
                result.warnings.push('Invalid weapon system. Using default (US M252 81mm).');
            }
        }
        
        // Validate shell type
        if (sessionData.sh) {
            if (typeof sessionData.sh === 'string' && sessionData.sh.length > 0) {
                result.data.shellType = sessionData.sh;
            } else {
                result.warnings.push('Invalid shell type. Using default for weapon system.');
            }
        }
        
        // Validate mission label
        if (sessionData.lbl && typeof sessionData.lbl === 'string') {
            result.data.missionLabel = sessionData.lbl.trim();
        }
        
        // Validate corrections
        if (sessionData.cor) {
            if (validateCorrection(sessionData.cor)) {
                result.data.correction = sessionData.cor;
            } else {
                result.warnings.push('Invalid correction data. Skipping corrections.');
            }
        }
        
        // FFE pattern (basic validation)
        if (sessionData.ffe) {
            result.data.ffePattern = sessionData.ffe;
        }
        
        result.valid = true;
        
    } catch (error) {
        result.errors.push(error.message);
    }
    
    return result;
}

/**
 * Validates a position object {x, y, z}
 * @throws {Error} If validation fails
 */
export function validatePosition(pos, label) {
    if (!pos || typeof pos !== 'object') {
        throw new Error(`Invalid ${label} position in share link.`);
    }
    
    const { x, y, z } = pos;
    
    if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
        throw new Error(`Invalid ${label} position coordinates.`);
    }
    
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        throw new Error(`Invalid ${label} position coordinates (not finite).`);
    }
    
    // Range validation (Arma Reforger map bounds)
    if (Math.abs(x) > SHARE_CONSTANTS.maxCoordinate || Math.abs(y) > SHARE_CONSTANTS.maxCoordinate) {
        throw new Error(`${label} position coordinates out of valid range.`);
    }
    
    if (z < SHARE_CONSTANTS.minElevation || z > SHARE_CONSTANTS.maxElevation) {
        throw new Error(`${label} elevation out of valid range.`);
    }
    
    return { x, y, z };
}

/**
 * Validates correction object {lr, ad}
 */
function validateCorrection(cor) {
    if (!cor || typeof cor !== 'object') {
        return false;
    }
    
    const { lr, ad } = cor;
    
    if (typeof lr !== 'number' || typeof ad !== 'number') {
        return false;
    }
    
    if (!Number.isFinite(lr) || !Number.isFinite(ad)) {
        return false;
    }
    
    // Sanity check ranges
    if (Math.abs(lr) > SHARE_CONSTANTS.maxCorrection || Math.abs(ad) > SHARE_CONSTANTS.maxCorrection) {
        console.warn(`Correction values seem unrealistic. Magnitude exceeds ${SHARE_CONSTANTS.maxCorrection}m.`);
    }
    
    return true;
}

/**
 * Rounds position coordinates to 2 decimal places
 */
function roundPosition(pos) {
    return {
        x: Math.round(pos.x * 100) / 100,
        y: Math.round(pos.y * 100) / 100,
        z: Math.round(pos.z * 100) / 100
    };
}

/**
 * Generates complete shareable URL with encoded session
 * @throws {Error} If URL would exceed maximum length
 */
export function generateShareURL(sessionData) {
    const encoded = encodeSession(sessionData);
    const url = `${window.location.origin}${window.location.pathname}#share=${encoded}`;
    
    if (url.length > SHARE_CONSTANTS.maxURLLength) {
        throw new Error(`Share link exceeds maximum length (${url.length} > ${SHARE_CONSTANTS.maxURLLength}). Try removing mission label or FFE pattern.`);
    }
    
    if (url.length > 1800) {
        console.warn(`Share link is approaching maximum length (${url.length} chars). Consider simplifying session.`);
    }
    
    return url;
}

/**
 * Loads validated session data into calculator UI
 */
export function loadSharedSession(sessionData) {
    // Set flag to prevent MLRS suggestion popup during session load
    State.setLoadingFromSharedSession(true);
    
    // Set weapon system first (needed for shell type selection)
    const weaponSelect = document.getElementById('mortarType');
    if (weaponSelect && sessionData.weaponSystem) {
        weaponSelect.value = sessionData.weaponSystem;
        // Trigger change event to update shell types
        weaponSelect.dispatchEvent(new Event('change'));
        
        // Set shell type after weapon change (with delay to allow shell list to populate)
        if (sessionData.shellType) {
            setTimeout(() => {
                const shellSelect = document.getElementById('shellType');
                if (shellSelect) {
                    shellSelect.value = sessionData.shellType;
                }
            }, 50);
        }
    }
    
    // Populate input fields from positions
    populateInputFields(sessionData);
    
    // Set observer position and FO mode
    if (sessionData.observerPos) {
        State.setLastObserverPos({ ...sessionData.observerPos });
        State.setFoModeEnabled(true);
        
        const foCheckbox = document.getElementById('foEnabled');
        if (foCheckbox) {
            foCheckbox.checked = true;
        }
    } else {
        State.setLastObserverPos(null);
        State.setFoModeEnabled(false);
        
        const foCheckbox = document.getElementById('foEnabled');
        if (foCheckbox) {
            foCheckbox.checked = false;
        }
    }
    
    // Set corrections
    if (sessionData.correction) {
        State.setCorrectionApplied(true);
        State.setLastCorrectionLR(sessionData.correction.lr);
        State.setLastCorrectionAD(sessionData.correction.ad);
        State.setOriginalTargetPos(sessionData.originalTargetPos ? { ...sessionData.originalTargetPos } : null);
    } else {
        State.setCorrectionApplied(false);
        State.setLastCorrectionLR(null);
        State.setLastCorrectionAD(null);
        State.setOriginalTargetPos(null);
    }
    
    // Set mission label
    const labelInput = document.getElementById('missionLabel');
    if (labelInput) {
        labelInput.value = sessionData.missionLabel || '';
       }
    
    // Set FFE pattern (if present)
    if (sessionData.ffePattern) {
        window.ffePattern = sessionData.ffePattern;
    }
    
    // Trigger calculation automatically after a delay to ensure all fields are populated
    setTimeout(() => {
        calculateSolution();
        
        // Clear the loading flag after calculation completes (with extra delay to ensure UI updates)
        setTimeout(() => {
            State.setLoadingFromSharedSession(false);
        }, 100);
    }, 200);
}

/**
 * Populates DOM input fields from session data
 */
function populateInputFields(sessionData) {
    // Detect active coordinate mode
    const gridModeActive = document.getElementById('toggleGrid')?.classList.contains('active');
    
    if (gridModeActive) {
        // Convert meters to grid format and populate grid fields
        const mortarGrid = window.BallisticCalculator.metersToGrid(sessionData.mortarPos.x, sessionData.mortarPos.y, true).split('/');
        const targetGrid = window.BallisticCalculator.metersToGrid(sessionData.targetPos.x, sessionData.targetPos.y, true).split('/');
        
        setFieldValue('mortarGridX', mortarGrid[0]);
        setFieldValue('mortarGridY', mortarGrid[1]);
        setFieldValue('mortarZ', sessionData.mortarPos.z);
        
        setFieldValue('targetGridX', targetGrid[0]);
        setFieldValue('targetGridY', targetGrid[1]);
        setFieldValue('targetZ', sessionData.targetPos.z);
        
        // Observer position (if present)
        if (sessionData.observerPos) {
            const observerGrid = window.BallisticCalculator.metersToGrid(sessionData.observerPos.x, sessionData.observerPos.y, true).split('/');
            setFieldValue('observerGridX', observerGrid[0]);
            setFieldValue('observerGridY', observerGrid[1]);
        }
    } else {
        // Populate meters mode fields
        setFieldValue('mortarX', sessionData.mortarPos.x);
        setFieldValue('mortarY', sessionData.mortarPos.y);
        setFieldValue('mortarZ', sessionData.mortarPos.z);
        
        setFieldValue('targetX', sessionData.targetPos.x);
        setFieldValue('targetY', sessionData.targetPos.y);
        setFieldValue('targetZ', sessionData.targetPos.z);
        
        // Observer position (if present)
        if (sessionData.observerPos) {
            setFieldValue('observerX', sessionData.observerPos.x);
            setFieldValue('observerY', sessionData.observerPos.y);
        }
    }
    
    // Show observer fields if present
    if (sessionData.observerPos) {
        const foControls = document.getElementById('foControls');
        if (foControls) {
            setDisplay(foControls, true);
        }
    }
}

/**
 * Helper to set field value safely
 */
function setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.value = value;
    }
}

/**
 * Copies text to clipboard with modern API and legacy fallback
 * Returns Promise<boolean> indicating success
 */
export async function copyToClipboard(text) {
    try {
        // Modern Clipboard API (preferred)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
        
        // Legacy fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.pointerEvents = 'none';
        document.body.appendChild(textarea);
        textarea.select();
        
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        
        return success;
    } catch (error) {
        console.error('Copy to clipboard failed:', error);
        return false;
    }
}

/**
 * Checks URL hash on page load for shared session data
 * Auto-loads session if valid share link detected
 */
export function checkURLForSharedSession() {
    const hash = window.location.hash;
    
    if (!hash.startsWith('#share=')) {
        return;
    }
    
    try {
        const encoded = hash.slice(7); // Remove '#share='
        const sessionData = decodeSession(encoded);
        const validated = validateSession(sessionData);
        
        if (validated.valid) {
            loadSharedSession(validated.data);
            showNotification('✓ Shared session loaded from URL', 'success');
            
            // Display warnings if any
            if (validated.warnings.length > 0) {
                validated.warnings.forEach(warning => {
                    console.warn('Share load warning:', warning);
                });
            }
            
            // Clean URL (remove hash)
            history.replaceState(null, '', window.location.pathname);
        } else {
            showError(validated.errors.join(', '));
        }
    } catch (error) {
        showError(`Failed to load shared session: ${error.message}`);
    }
}

/**
 * Shows share modal with session URL (or just load section if no session)
 */
export function showShareModal() {
    // Get or create modal
    if (!shareModalElement) {
        shareModalElement = document.getElementById('shareModal');
    }
    
    if (!shareModalElement) {
        showError('Share modal not found. Please refresh the page.');
        return;
    }
    
    const shareLinkSection = document.getElementById('shareLinkSection');
    const shareDivider = document.getElementById('shareDivider');
    const urlField = document.getElementById('shareURLField');
    
    // Try to capture session data
    try {
        const sessionData = captureSessionForShare();
        const shareURL = generateShareURL(sessionData);
        
        // Show share link section
        if (shareLinkSection) setDisplay(shareLinkSection, true);
        if (shareDivider) setDisplay(shareDivider, true);
        
        // Populate URL field
        if (urlField) {
            urlField.value = shareURL;
        }
        
    } catch (error) {
        // No valid session - hide share link section, show only load section
        if (shareLinkSection) setDisplay(shareLinkSection, false);
        if (shareDivider) setDisplay(shareDivider, false);
        
        console.log('No session to share:', error.message);
    }
    
    // Clear error messages
    const errorContainer = document.getElementById('shareErrorMessage');
    if (errorContainer) {
        errorContainer.textContent = '';
        setDisplay(errorContainer, false);
    }
    
    // Show modal
    shareModalElement.style.display = 'flex';
}

/**
 * Hides share modal
 */
export function hideShareModal() {
    if (shareModalElement) {
        shareModalElement.style.display = 'none';
    }
}

/**
 * Handles copy URL button click
 */
export async function handleCopyURL() {
    const urlField = document.getElementById('shareURLField');
    if (!urlField) {
        return;
    }
    
    const button = document.getElementById('copyURLBtn');
    const success = await copyToClipboard(urlField.value);
    
    if (success && button) {
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        button.style.backgroundColor = '#6b8e23';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
        }, 2000);
    } else if (button) {
        const originalText = button.textContent;
        button.textContent = '✗ Copy Failed';
        button.style.backgroundColor = '#c85050';
        
        setTimeout(() => {
            button.textContent = originalText;
            button.style.backgroundColor = '';
        }, 2000);
    }
}

/**
 * Handles load session from paste button click
 */
export function handleLoadFromPaste() {
    const pasteField = document.getElementById('sharePasteField');
    if (!pasteField) {
        return;
    }
    
    const input = pasteField.value.trim();
    if (!input) {
        showShareError('Please paste a share link or session data.');
        return;
    }
    
    try {
        let sessionData;
        
        // Check if input is a URL
        if (input.startsWith('http') && input.includes('#share=')) {
            const hashIndex = input.indexOf('#share=');
            const encoded = input.slice(hashIndex + 7);
            sessionData = decodeSession(encoded);
        } else if (input.startsWith('{')) {
            // Direct JSON input
            sessionData = JSON.parse(input);
        } else {
            // Assume base64 encoded
            sessionData = decodeSession(input);
        }
        
        const validated = validateSession(sessionData);
        
        if (validated.valid) {
            loadSharedSession(validated.data);
            hideShareModal();
            showNotification('✓ Session loaded successfully', 'success');
            
            // Display warnings if any
            if (validated.warnings.length > 0) {
                validated.warnings.forEach(warning => {
                    console.warn('Share load warning:', warning);
                });
            }
        } else {
            showShareError(validated.errors.join(', '));
        }
    } catch (error) {
        showError(`Failed to load shared session: ${error.message}`);
    }
}

/**
 * Shows error message in share modal
 */
function showShareError(message) {
    const errorContainer = document.getElementById('shareErrorMessage');
    if (errorContainer) {
        errorContainer.textContent = message;
        setDisplay(errorContainer, true);
    }
}

/**
 * Shows notification message (uses existing notification system if available)
 */
function showNotification(message, type = 'info') {
    // Placeholder - integrate with existing notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // If existing notification function exists, use it
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    }
}

/**
 * Shows error message using the calculator's error display system
 */
function showError(message) {
    console.error('Share error:', message);
    showOutputError('Share Error', message);
}
