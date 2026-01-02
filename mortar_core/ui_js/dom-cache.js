/**
 * DOM Cache Module
 * Centralized DOM element retrieval with caching
 * Version: 2.0.0
 * 
 * Eliminates 140+ repeated document.getElementById() calls across codebase
 * Performance: O(1) cached retrieval vs O(n) DOM traversal
 * Auto-detects dynamic elements using DYNAMIC_ELEMENTS registry
 */

import { DYNAMIC_ELEMENTS } from './constants.js';

const elementCache = new Map();

/**
 * Check if element ID matches dynamic element patterns
 * @param {string} id - Element ID to check
 * @returns {boolean} True if element is dynamically created
 */
function isDynamicElement(id) {
    return DYNAMIC_ELEMENTS.some(pattern => 
        pattern instanceof RegExp ? pattern.test(id) : pattern === id
    );
}

/**
 * Get DOM element with caching
 * @param {string} id - Element ID
 * @param {boolean} required - Throw error if not found (default: true)
 * @param {boolean} forceRefresh - Skip cache (auto-detected for dynamic elements if undefined)
 * @returns {HTMLElement|null}
 */
export function getElement(id, required = true, forceRefresh) {
    // Auto-detect dynamic elements if forceRefresh not explicitly set
    const shouldRefresh = forceRefresh !== undefined ? forceRefresh : isDynamicElement(id);
    
    if (shouldRefresh || !elementCache.has(id)) {
        const element = document.getElementById(id);
        
        if (required && !element) {
            throw new Error(`Required DOM element not found: ${id}`);
        }
        
        elementCache.set(id, element);
    }
    
    return elementCache.get(id);
}

/**
 * Get multiple elements at once
 * @param {string[]} ids - Array of element IDs
 * @param {boolean} required - Throw error if any not found
 * @returns {Object} Map of id -> HTMLElement
 */
export function getElements(ids, required = true) {
    const elements = {};
    ids.forEach(id => {
        elements[id] = getElement(id, required);
    });
    return elements;
}

/**
 * Check if element exists without caching
 * @param {string} id - Element ID
 * @returns {boolean}
 */
export function elementExists(id) {
    return document.getElementById(id) !== null;
}

/**
 * Clear cache (useful for testing or dynamic content changes)
 */
export function clearCache() {
    elementCache.clear();
}

/**
 * Remove specific element from cache
 * @param {string} id - Element ID to invalidate
 */
export function invalidate(id) {
    elementCache.delete(id);
}

/**
 * Get element value (common pattern: getElement + .value)
 * @param {string} id - Element ID
 * @param {*} defaultValue - Default if element not found or empty
 * @returns {string}
 */
export function getValue(id, defaultValue = '') {
    const el = getElement(id, false);
    return el ? (el.value || defaultValue) : defaultValue;
}

/**
 * Set element value (common pattern: getElement + .value = x)
 * @param {string} id - Element ID
 * @param {*} value - Value to set
 */
export function setValue(id, value) {
    const el = getElement(id, false);
    if (el) {
        el.value = value;
    }
}

/**
 * Get checkbox state
 * @param {string} id - Checkbox element ID
 * @returns {boolean}
 */
export function isChecked(id) {
    const el = getElement(id, false);
    return el ? el.checked : false;
}

/**
 * Set checkbox state
 * @param {string} id - Checkbox element ID
 * @param {boolean} checked - Checked state
 */
export function setChecked(id, checked) {
    const el = getElement(id, false);
    if (el) {
        el.checked = checked;
    }
}
