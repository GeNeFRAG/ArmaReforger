/**
 * Main Bootstrap Module
 * Initializes all modules and wires dependencies using Dependency Injection
 * Version: 1.7.0
 * 
 * Architecture: Mediator Pattern
 * - This module acts as the central coordinator
 * - Eliminates circular dependencies by injecting functions as parameters
 * - Each module exports pure functions that receive dependencies via init()
 */

import * as State from './state.js';
import * as UI from './ui.js';
import * as FFE from './ffe.js';
import * as Calculator from './calculator.js';
import * as History from './history.js';
import * as Corrections from './corrections.js';
import { setDisplay, populateSelect } from './utils.js';
import * as DOMCache from './dom-cache.js';
import * as CoordManager from './coord-manager.js';

let ballisticDataLoaded = false;

/**
 * Wire dependencies using dependency injection
 * This is the mediator that connects all modules without creating circular dependencies
 */
function wireDependencies() {
    // Calculator dependencies
    Calculator.init({
        parsePositionFromUI: UI.parsePositionFromUI,
        showOutputError: UI.showOutputError,
        setTargetHighlight: UI.setTargetHighlight,
        addToHistory: History.addToHistory,
        getCurrentHistoryIndex: History.getCurrentHistoryIndex,
        setCurrentHistoryIndex: History.setCurrentHistoryIndex
    });
    
    // History dependencies
    History.init({
        parsePositionFromUI: UI.parsePositionFromUI,
        setPositionInputs: UI.setPositionInputs,
        setTargetHighlight: UI.setTargetHighlight,
        setCoordMode: UI.setCoordMode,
        calculateSolution: Calculator.calculateSolution,
        selectMission: Calculator.selectMission,
        updateShellTypes: Calculator.updateShellTypes,
        getAllMortarTypes: Calculator.getAllMortarTypes
    });
    
    // UI dependencies
    UI.init({
        calculateSolution: Calculator.calculateSolution,
        updateShellTypes: Calculator.updateShellTypes,
        clearHistory: History.clearHistory,
        updateCorrectionPreview: Corrections.updateCorrectionPreview
    });
    
    // Corrections dependencies
    Corrections.init({
        parsePositionFromUI: UI.parsePositionFromUI,
        setTargetHighlight: UI.setTargetHighlight,
        showOutputError: UI.showOutputError,
        setPositionInputs: UI.setPositionInputs,
        calculateSolution: Calculator.calculateSolution,
        setCurrentHistoryIndex: History.setCurrentHistoryIndex
    });
    
    // FFE dependencies
    FFE.init({
        calculateSolution: Calculator.calculateSolution,
        parsePositionFromUI: UI.parsePositionFromUI
    });
}

/**
 * Load ballistic data and initialize application
 */
async function init() {
    const loading = DOMCache.getElement('loading');
    const app = DOMCache.getElement('app');
    
    try {
        await BallisticCalculator.loadBallisticData('ballistic-data.json');
        ballisticDataLoaded = true;
        State.setBallisticDataLoaded(true);
        
        setDisplay(loading, false);
        setDisplay(app, true);
        
        updateWeaponSystems();
        await Calculator.updateShellTypes();
        
        UI.initUI();
        FFE.initFFE();
        History.setupHistoryListeners();
        Calculator.setupCalculatorListeners();
        Corrections.setupCorrectionListeners();
        Corrections.setupDynamicListeners(); // Setup correction input listeners
        
    } catch (error) {
        loading.innerHTML = `
            <div style="color: red;">
                ❌ Error loading ballistic data: ${error.message}
                <br>Make sure the HTTP server is running from the mortar_core directory.
            </div>
        `;
        console.error('Error loading ballistic data:', error);
    }
}

/**
 * Update weapon system options from ballistic data (mortars + MLRS)
 */
function updateWeaponSystems() {
    const weaponSelect = DOMCache.getElement('mortarType');
    const currentValue = weaponSelect.value;
    
    const allWeapons = Calculator.getAllWeaponSystems();
    
    // Group by system type with custom ordering
    // M252 first, then 2B14, then any other mortars alphabetically
    const weaponOrder = ['M252', '2B14'];
    const mortars = allWeapons.filter(w => w.systemType === 'mortar').sort((a, b) => {
        const aIndex = weaponOrder.indexOf(a.id);
        const bIndex = weaponOrder.indexOf(b.id);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.name.localeCompare(b.name);
    });
    const mlrs = allWeapons.filter(w => w.systemType === 'mlrs').sort((a, b) => a.name.localeCompare(b.name));
    
    // Clear existing options
    weaponSelect.innerHTML = '';
    
    // Add mortars group
    if (mortars.length > 0) {
        const mortarGroup = document.createElement('optgroup');
        mortarGroup.label = '🎯 Mortars';
        mortars.forEach(weapon => {
            const option = document.createElement('option');
            option.value = weapon.id;
            option.textContent = weapon.name;
            mortarGroup.appendChild(option);
        });
        weaponSelect.appendChild(mortarGroup);
    }
    
    // Add MLRS group
    if (mlrs.length > 0) {
        const mlrsGroup = document.createElement('optgroup');
        mlrsGroup.label = '🚀 MLRS';
        mlrs.forEach(weapon => {
            const option = document.createElement('option');
            option.value = weapon.id;
            option.textContent = weapon.name;
            mlrsGroup.appendChild(option);
        });
        weaponSelect.appendChild(mlrsGroup);
    }
    
    // Restore previous selection or select first mortar
    const optionExists = allWeapons.some(w => w.id === currentValue);
    if (optionExists) {
        weaponSelect.value = currentValue;
    } else if (mortars.length > 0) {
        weaponSelect.value = mortars[0].id;
    } else if (allWeapons.length > 0) {
        weaponSelect.value = allWeapons[0].id;
    }
}

/**
 * Expose utility modules for debugging/console access only
 * Event handlers now use event delegation (CSP compliant)
 */
function exposeUtilsForDebugging() {
    window.DOMCache = DOMCache;
    window.CoordManager = CoordManager;
    window.State = State;
}

/**
 * Application entry point
 */
document.addEventListener('DOMContentLoaded', () => {
    wireDependencies();
    exposeUtilsForDebugging();
    init();
});
