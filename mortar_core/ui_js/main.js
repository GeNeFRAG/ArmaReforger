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
        await MortarCalculator.loadBallisticData('ballistic-data.json');
        ballisticDataLoaded = true;
        State.setBallisticDataLoaded(true);
        
        setDisplay(loading, false);
        setDisplay(app, true);
        
        updateMortarTypes();
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
 * Update mortar type options from ballistic data
 */
function updateMortarTypes() {
    const mortarTypeSelect = DOMCache.getElement('mortarType');
    const currentValue = mortarTypeSelect.value;
    
    const availableMortars = Calculator.getAllMortarTypes();
    
    availableMortars.sort((a, b) => {
        const aIsUS = a.id === 'US' || a.id.startsWith('US_');
        const bIsUS = b.id === 'US' || b.id.startsWith('US_');
        if (aIsUS && !bIsUS) return -1;
        if (!aIsUS && bIsUS) return 1;
        return a.name.localeCompare(b.name);
    });
    
    populateSelect(mortarTypeSelect, availableMortars, 'id', 'name');
    
    const optionExists = availableMortars.some(m => m.id === currentValue);
    if (optionExists) {
        mortarTypeSelect.value = currentValue;
    } else if (availableMortars.length > 0) {
        const usMortar = availableMortars.find(m => m.id === 'US' || m.id.startsWith('US_'));
        mortarTypeSelect.value = usMortar ? usMortar.id : availableMortars[0].id;
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
