/**
 * Application Constants
 * Centralized configuration values for UI, styling, and data structures
 * Version: 1.7.0
 */

// Input field ID mappings
export const INPUT_IDS = {
    MORTAR_FIELDS: ['mortarGridX', 'mortarGridY', 'mortarX', 'mortarY', 'mortarZ'],
    TARGET_FIELDS: ['targetGridX', 'targetGridY', 'targetX', 'targetY', 'targetZ'],
    OBSERVER_FIELDS: ['observerGridX', 'observerGridY', 'observerX', 'observerY'],
    METER_FIELDS: ['mortarX', 'mortarY', 'mortarZ', 'targetX', 'targetY', 'targetZ', 'observerX', 'observerY'],
    GRID_FIELDS: ['mortarGridX', 'mortarGridY', 'targetGridX', 'targetGridY', 'observerGridX', 'observerGridY']
};

// Compose ALL_COORD_FIELDS from existing constants (DRY principle)
INPUT_IDS.ALL_COORD_FIELDS = [
    ...INPUT_IDS.MORTAR_FIELDS,
    ...INPUT_IDS.TARGET_FIELDS,
    ...INPUT_IDS.OBSERVER_FIELDS,
    'missionLabel'
];

// Color scheme constants
export const COLORS = {
    success: '#6b8e23',
    successBg: 'rgba(107, 142, 35, 0.15)',
    successBorder: 'rgba(107, 142, 35, 0.4)',
    successShadow: 'rgba(107, 142, 35, 0.3)',
    successText: '#8fbc1e',
    error: '#c85050',
    errorBg: 'rgba(200, 80, 80, 0.15)',
    errorBorder: 'rgba(200, 80, 80, 0.4)',
    errorShadow: 'rgba(200, 80, 80, 0.3)',
    errorText: '#ff6b6b',
    // Text colors
    textPrimary: '#c8d4a0',
    textSecondary: '#a8b898',
    textMuted: '#95a585',
    textDim: '#7a8a7a',
    textWhite: '#ffffff',
    textGold: '#ffd700',
    // UI backgrounds
    bgDark: 'rgba(20, 25, 22, 0.6)',
    bgDarker: 'rgba(20, 25, 22, 0.8)',
    // Borders
    borderDark: '#4a5a52',
    borderGray: '#666',
    // Gradients
    gradientGray: 'linear-gradient(180deg, #555 0%, #444 100%)',
    gradientRed: 'linear-gradient(180deg, #a85050 0%, #984040 100%)',
    gradientGreen: 'linear-gradient(180deg, #8fbc1e 0%, #7aaa18 100%)'
};

// Button style constants
export const BTN_STYLES = {
    selected: 'linear-gradient(180deg, #6b8e23 0%, #5a7a1c 100%)',
    unselected: 'linear-gradient(180deg, #555 0%, #444 100%)',
    selectedBorder: '#8fbc1e',
    unselectedBorder: '#666'
};

// Mission card style constants
export const MISSION_CARD_STYLES = {
    optimalBackground: 'rgba(40, 55, 45, 0.9)',
    optimalBorder: '2px solid #6b8e23',
    alternativeBackground: 'rgba(35, 45, 42, 0.7)',
    alternativeBorder: '1px solid #4a5a52',
    widgetBackground: 'rgba(40, 55, 45, 0.9)',
    widgetBorder: '2px solid #6b8e23'
};
