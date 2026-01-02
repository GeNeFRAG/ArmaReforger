/**
 * Utility Functions
 * Pure helper functions with no side effects
 * Version: 1.7.0
 */

/**
 * Debounce utility for performance optimization (reduces INP)
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func.apply(this, args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Format position for display (grid or meters)
 * @param {Object} pos - Position object with x, y properties
 * @param {string} inputMode - 'grid' or 'meters'
 * @returns {string} Formatted position string
 */
export function formatPositionDisplay(pos, inputMode) {
    if (inputMode === 'grid') {
        return MortarCalculator.metersToGrid(pos.x, pos.y, true);
    } else {
        return `${Math.round(pos.x)}/${Math.round(pos.y)}`;
    }
}

/**
 * Generate info banner HTML
 * @param {string} message - Banner message content
 * @param {string} type - Banner type: 'info', 'warning', or 'error'
 * @returns {string} HTML string for banner
 */
export function createInfoBanner(message, type = 'info') {
    const styles = {
        info: { bg: 'rgba(60, 75, 50, 0.4)', border: '#6b8e23', color: '#d8e4b0' },
        warning: { bg: 'rgba(255, 165, 0, 0.15)', border: 'rgba(255, 165, 0, 0.4)', color: '#ffcc99' },
        error: { bg: 'rgba(255, 107, 107, 0.15)', border: 'rgba(255, 107, 107, 0.3)', color: '#ff9999' }
    };
    const style = styles[type] || styles.info;
    return `<div style="background: ${style.bg}; padding: 10px; border-radius: 4px; border: 1px solid ${style.border}; margin-bottom: 15px; color: ${style.color}; font-size: 13px;">${message}</div>`;
}

/**
 * Populate select dropdown with options
 * @param {HTMLSelectElement} select - Select element to populate
 * @param {Array} items - Array of items to add as options
 * @param {string} valueKey - Property name for option value
 * @param {string} textKey - Property name for option text
 */
export function populateSelect(select, items, valueKey, textKey) {
    select.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        select.appendChild(option);
    });
}

/**
 * Set element display style
 * @param {HTMLElement} element - Element to show/hide
 * @param {boolean} visible - True to show, false to hide
 */
export function setDisplay(element, visible) {
    if (element) {
        element.style.display = visible ? 'block' : 'none';
    }
}
