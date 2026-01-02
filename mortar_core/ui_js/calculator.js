/**
 * Calculator Module
 * Main calculation logic, solution generation, and mission management
 * Version: 1.7.0
 * 
 * Architecture: Uses dependency injection to avoid circular dependencies
 * Dependencies are injected via init() function
 */

import { COLORS, BTN_STYLES, MISSION_CARD_STYLES } from './constants.js';
import { createInfoBanner } from './utils.js';
import * as State from './state.js';
import { getElement, getValue, isChecked } from './dom-cache.js';
import * as CoordManager from './coord-manager.js';

// Injected dependencies (set via init)
let dependencies = {
    parsePositionFromUI: null,
    showOutputError: null,
    setTargetHighlight: null,
    addToHistory: null,
    getCurrentHistoryIndex: null,
    setCurrentHistoryIndex: null
};

/**
 * Initialize calculator with dependencies
 * @param {Object} deps - Dependency injection container
 */
export function init(deps) {
    dependencies = { ...dependencies, ...deps };
}

/**
 * Get all available mortar types from ballistic data
 */
export function getAllMortarTypes() {
    try {
        return MortarCalculator.getAllMortarTypes();
    } catch (error) {
        console.warn('Could not get mortar types:', error);
        return [];
    }
}

/**
 * Get available shell types for a mortar
 */
export function getShellTypesForMortar(mortarId) {
    try {
        const config = MortarCalculator.getWeaponConfig(mortarId, 'HE');
        const mortar = config.mortar;
        
        return mortar.shellTypes.map(shell => ({
            value: shell.type,
            label: shell.name
        }));
    } catch (error) {
        console.warn('Could not get shell types:', error);
        return [];
    }
}

/**
 * Update shell type options based on selected mortar
 */
export async function updateShellTypes() {
    const mortarType = getValue('mortarType');
    const shellTypeSelect = getElement('shellType');
    const currentValue = shellTypeSelect.value;
    
    const availableShells = getShellTypesForMortar(mortarType);
    
    const { populateSelect } = await import('./utils.js');
    populateSelect(shellTypeSelect, availableShells, 'value', 'label');
    
    const optionExists = availableShells.some(s => s.value === currentValue);
    if (optionExists) {
        shellTypeSelect.value = currentValue;
    } else if (availableShells.length > 0) {
        shellTypeSelect.value = availableShells[0].value;
    }
}

/**
 * Generate solution grid HTML (elevation, azimuth, charge, TOF)
 */
export function generateSolutionGridHTML(solution, previousChargeForDisplay) {
    const correctionColor = State.isCorrectionApplied() ? COLORS.errorText : '';
    const normalColor = State.isCorrectionApplied() ? COLORS.errorText : COLORS.textMuted;
    const chargeChanged = typeof previousChargeForDisplay === 'number' && previousChargeForDisplay !== solution.charge;
    const input = State.getLastInput();
    
    return `
        <div class="solution-grid">
            <div class="solution-item">
                <strong>CHARGE</strong>
                <div class="value" ${chargeChanged ? `style="color: ${COLORS.errorText}"` : ''}>${solution.charge}</div>
                ${chargeChanged ? `<div style="color: ${COLORS.errorText}; font-size: 11px; margin-top: 2px;">was: ${previousChargeForDisplay}</div>` : ''}
            </div>
            <div class="solution-item">
                <strong>AZIMUTH</strong>
                <div class="value" ${correctionColor ? `style="color: ${correctionColor}"` : ''}>${solution.azimuthMils} mils</div>
                <div style="color: ${normalColor}; font-size: 12px;">(${solution.azimuth}°)</div>
            </div>
            <div class="solution-item">
                <strong>ELEVATION</strong>
                <div class="value" ${correctionColor ? `style="color: ${correctionColor}"` : ''}>${solution.elevation} mils</div>
                <div style="color: ${normalColor}; font-size: 12px;">(${solution.elevationDegrees}°)</div>
                ${solution.elevationCorrection && solution.elevationCorrection !== 0 ? `<div style="color: ${COLORS.textMuted}; font-size: 11px; margin-top: 2px;">dElev: ${solution.dElev} and Elevation Correction: ${solution.elevationCorrection > 0 ? '+' : ''}${solution.elevationCorrection.toFixed(1)} mils</div>` : ''}
            </div>
            <div class="solution-item">
                <strong>TIME OF FLIGHT</strong>
                <div class="value">${solution.timeOfFlight}s</div>
                ${solution.tofCorrection && solution.tofCorrection !== 0 ? `<div style="color: ${COLORS.textMuted}; font-size: 11px; margin-top: 2px;">Correction: ${solution.tofCorrection > 0 ? '+' : ''}${solution.tofCorrection.toFixed(1)}s (TOF/100m: ${solution.tofPer100m})</div>` : ''}
            </div>
        </div>
        <div style="margin-top: 10px; padding: 8px; background: ${COLORS.bgDark}; border-radius: 3px; font-size: 12px; color: ${COLORS.textSecondary};">
            <div style="margin-bottom: 8px;">
                <strong style="${State.isCorrectionApplied() ? 'color: ' + COLORS.errorText + ';' : ''}">📏 Range:</strong> <span style="${State.isCorrectionApplied() ? 'color: ' + COLORS.errorText + ';' : ''}">${input.distance.toFixed(1)}m</span> &nbsp;|&nbsp; 
                <strong>⛰️ Alt Diff:</strong> ${input.heightDifference > 0 ? '+' : ''}${input.heightDifference.toFixed(1)}m
            </div>
            <strong>Charge Range:</strong> ${solution.minRange}m - ${solution.maxRange}m
        </div>
    `;
}

/**
 * Generate mission card HTML for a solution
 */
export function generateMissionCardHTML(solution, index, previousChargeForDisplay, solutions) {
    let trajectoryLabel;
    if (index === 0) {
        trajectoryLabel = '🎯 Optimal Fire Mission';
    } else {
        trajectoryLabel = `🔄 Alternative Mission ${index}`;
    }
    
    let chargeDesc = '';
    if (index === 0) {
        chargeDesc = solutions.length > 1 
            ? `Fastest - ${solution.timeOfFlight}s flight time`
            : 'Optimal solution';
    } else {
        const timeDiff = solution.timeOfFlight - solutions[0].timeOfFlight;
        const elevDiff = solution.elevation - solutions[0].elevation;
        const lastInput = State.getLastInput();
        const elevDegDiff = MortarCalculator.milsToDegrees(solution.elevation, lastInput.mortarType) - MortarCalculator.milsToDegrees(solutions[0].elevation, lastInput.mortarType);
        const elevSign = elevDiff > 0 ? '+' : '';
        chargeDesc = `+${timeDiff.toFixed(1)}s slower, ${elevSign}${elevDiff} mils (${elevSign}${elevDegDiff.toFixed(1)}°) vs charge ${solutions[0].charge}`;
    }
    
    return `
        <div ${index > 0 ? 'id="altMission_' + index + '" class="alternativeMission"' : ''} style="background: ${index === 0 ? MISSION_CARD_STYLES.optimalBackground : MISSION_CARD_STYLES.alternativeBackground}; padding: 15px; border-radius: 4px; margin-bottom: 10px; border: ${index === 0 ? MISSION_CARD_STYLES.optimalBorder : MISSION_CARD_STYLES.alternativeBorder};">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h3 style="margin: 0; font-size: 16px; color: ${index === 0 ? COLORS.textPrimary : COLORS.textSecondary};">
                    ${trajectoryLabel}
                </h3>
                <span style="font-size: 12px; color: ${COLORS.textMuted}; font-style: italic;">
                    ${chargeDesc}
                </span>
            </div>
            ${generateSolutionGridHTML(solution, previousChargeForDisplay)}
            <button class="btn-press" onclick="selectMission(${solution.charge})" id="selectBtn_${solution.charge}" style="width: 100%; margin-top: 10px; padding: 8px; background: ${index === 0 ? BTN_STYLES.selected : BTN_STYLES.unselected}; border: 1px solid ${index === 0 ? BTN_STYLES.selectedBorder : BTN_STYLES.unselectedBorder}; border-radius: 4px; color: white; font-weight: 600; cursor: pointer; font-size: 13px;">
                ${index === 0 ? '✓ Selected Mission' : 'Use This Mission'}
            </button>
        </div>
    `;
}

/**
 * Select a specific mission charge
 */
export async function selectMission(charge) {
    const solutions = State.getLastSolutions();
    if (!solutions || solutions.length === 0) return;
    
    State.setSelectedCharge(charge);
    
    // Store the original optimal charge if not already stored
    if (State.getOriginalOptimalCharge() === undefined) {
        State.setOriginalOptimalCharge(solutions[0].charge);
    }
    
    // Find the correction widget and all mission elements (no cache for fresh references)
    const correctionWidget = getElement('fireCorrectionWidget', false);
    const selectedBtn = getElement(`selectBtn_${charge}`, false);
    
    if (correctionWidget && selectedBtn) {
        // Find the selected mission card
        const selectedCard = selectedBtn.closest('div[style*="background"]');
        
        if (selectedCard && selectedCard.parentNode) {
            // Get all solution cards
            const allCards = [];
            
            solutions.forEach(sol => {
                const btn = getElement(`selectBtn_${sol.charge}`, false);
                if (btn) {
                    const card = btn.closest('div[style*="background"]');
                    if (card) {
                        allCards.push({ charge: sol.charge, card: card });
                    }
                }
            });
            
            // Find the parent container using DOM cache
            const container = getElement('output', false);
            
            if (!container) return;
            
            // Store the toggle button
            const toggleBtn = getElement('toggleAltBtn', false, true); // Dynamic button
            
            // Remove ALL existing mission cards, alternatives container, and related elements
            // This clears both initial calculation results and history-loaded content
            const existingAltContainer = getElement('alternativeMissions', false);
            if (existingAltContainer && existingAltContainer.parentNode) {
                existingAltContainer.remove();
            }
            
            // Remove ALL child divs from output container that look like mission cards
            // Exclude the fire correction widget from removal
            Array.from(container.children).forEach(child => {
                if (child.tagName === 'DIV' && 
                    child.id !== 'fireCorrectionWidget' &&
                    (child.style.background || child.classList.contains('alternativeMission'))) {
                    child.remove();
                }
            });
            
            // Remove toggle button temporarily (widget stays in original position)
            if (toggleBtn && toggleBtn.parentNode) toggleBtn.remove();
            
            // Find the selected card object
            const selectedCardObj = allCards.find(item => item.charge === charge);
            const otherCards = allCards.filter(item => item.charge !== charge);
            
            // Check if correction is applied to maintain proper styling
            const hasCorrectionApplied = State.isCorrectionApplied();
            
            // Re-insert in new order
            if (selectedCardObj) {
                // Regenerate the selected mission card HTML to ensure correct colors
                const selectedSolution = solutions.find(s => s.charge === charge);
                if (selectedSolution) {
                    const previousChargeForDisplay = State.getPreviousCharge();
                    const isOriginalOptimal = charge === State.getOriginalOptimalCharge();
                    const selectedIndex = solutions.findIndex(s => s.charge === charge);
                    const titleText = isOriginalOptimal 
                        ? '🎯 Optimal Fire Mission'
                        : `🔄 Alternative Mission ${selectedIndex}`;
                    
                    selectedCardObj.card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h3 style="margin: 0; font-size: 16px; color: ${COLORS.textPrimary};">
                                ${titleText}
                            </h3>
                            <span style="font-size: 12px; color: ${COLORS.textMuted}; font-style: italic;">
                                Fastest - ${selectedSolution.timeOfFlight}s flight time
                            </span>
                        </div>
                        ${generateSolutionGridHTML(selectedSolution, previousChargeForDisplay)}
                        <button class="btn-press" onclick="selectMission(${selectedSolution.charge})" id="selectBtn_${selectedSolution.charge}" style="width: 100%; margin-top: 10px; padding: 8px; background: ${BTN_STYLES.selected}; border: 1px solid ${BTN_STYLES.selectedBorder}; border-radius: 4px; color: white; font-weight: 600; cursor: pointer; font-size: 13px;">
                            ✓ Selected Mission
                        </button>
                    `;
                }
                
                // Insert selected mission first (make it optimal)
                container.appendChild(selectedCardObj.card);
                selectedCardObj.card.style.display = 'block';
                selectedCardObj.card.removeAttribute('id');
                selectedCardObj.card.classList.remove('alternativeMission');
                
                // Always use green styling for mission card (red values inside indicate correction)
                selectedCardObj.card.style.background = MISSION_CARD_STYLES.optimalBackground;
                selectedCardObj.card.style.border = MISSION_CARD_STYLES.optimalBorder;
                
                // Insert widget below selected mission
                if (correctionWidget) {
                    container.appendChild(correctionWidget);
                    correctionWidget.style.display = 'block';
                }
                await updateFireCorrectionWidget(solutions);
                
                // Insert FFE container below correction widget
                const ffeContainer = getElement('ffeContainer', false);
                if (ffeContainer) {
                    container.appendChild(ffeContainer);
                }
                
                // Insert toggle button and create new alternatives container if there are alternatives
                if (otherCards.length > 0) {
                    if (toggleBtn) {
                        container.appendChild(toggleBtn);
                        toggleBtn.textContent = `▼ Show ${otherCards.length} Alternative Mission${otherCards.length > 1 ? 's' : ''}`;
                    }
                    
                    // Create new alternativeMissions container or reuse existing
                    let altContainer = getElement('alternativeMissions', false);
                    if (!altContainer) {
                        altContainer = document.createElement('div');
                        altContainer.id = 'alternativeMissions';
                    } else {
                        // Remove from current position
                        if (altContainer.parentNode) {
                            altContainer.remove();
                        }
                    }
                    
                    // Clear and configure
                    altContainer.innerHTML = '';
                    altContainer.style.display = 'none';
                    
                    // Insert other missions as alternatives (hidden) into the alternatives container
                    otherCards.forEach((item, index) => {
                        // Regenerate alternative mission HTML without correction colors
                        const altSolution = solutions.find(s => s.charge === item.charge);
                        if (altSolution) {
                            const timeDiff = altSolution.timeOfFlight - solutions.find(s => s.charge === charge).timeOfFlight;
                            const elevDiff = altSolution.elevation - solutions.find(s => s.charge === charge).elevation;
                            const lastInput = State.getLastInput();
                            const elevDegDiff = MortarCalculator.milsToDegrees(altSolution.elevation, lastInput.mortarType) - MortarCalculator.milsToDegrees(solutions.find(s => s.charge === charge).elevation, lastInput.mortarType);
                            const elevSign = elevDiff > 0 ? '+' : '';
                            
                            const isOriginalOptimal = item.charge === State.getOriginalOptimalCharge();
                            const altIndex = solutions.findIndex(s => s.charge === item.charge);
                            const titleText = isOriginalOptimal 
                                ? `⭐ Original Optimal`
                                : `🔄 Alternative Mission ${altIndex}`;
                            
                            item.card.innerHTML = `
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <h3 style="margin: 0; font-size: 16px; color: ${COLORS.textSecondary};">
                                        ${titleText}
                                    </h3>
                                    <span style="font-size: 12px; color: ${COLORS.textMuted}; font-style: italic;">
                                        +${timeDiff.toFixed(1)}s slower, ${elevSign}${elevDiff} mils (${elevSign}${elevDegDiff.toFixed(1)}°) vs charge ${charge}
                                    </span>
                                </div>
                                ${generateSolutionGridHTML(altSolution, null)}
                                <button class="btn-press" onclick="selectMission(${altSolution.charge})" id="selectBtn_${altSolution.charge}" style="width: 100%; margin-top: 10px; padding: 8px; background: ${BTN_STYLES.unselected}; border: 1px solid ${BTN_STYLES.unselectedBorder}; border-radius: 4px; color: white; font-weight: 600; cursor: pointer; font-size: 13px;">
                                    Use This Mission
                                </button>
                            `;
                        }
                        
                        item.card.id = `altMission_${index + 1}`;
                        item.card.classList.add('alternativeMission');
                        item.card.style.display = 'none';
                        
                        // Reset styling for alternatives - remove correction styling
                        item.card.style.background = MISSION_CARD_STYLES.alternativeBackground;
                        item.card.style.border = MISSION_CARD_STYLES.alternativeBorder;
                        
                        altContainer.appendChild(item.card);
                    });
                    
                    // Append alternatives container AFTER toggle button
                    container.appendChild(altContainer);
                }
            }
        }
    }
    
    // Update all buttons - use forceRefresh since we regenerated HTML
    solutions.forEach(sol => {
        const btn = getElement(`selectBtn_${sol.charge}`, false, true); // Dynamic button
        if (btn) {
            if (sol.charge === charge) {
                btn.style.background = BTN_STYLES.selected;
                btn.style.borderColor = BTN_STYLES.selectedBorder;
                btn.textContent = '✓ Selected Mission';
            } else {
                btn.style.background = BTN_STYLES.unselected;
                btn.style.borderColor = BTN_STYLES.unselectedBorder;
                btn.textContent = 'Use This Mission';
            }
        }
    });
    
    // Update correction widget header
    const chargeDisplay = getElement('selectedChargeDisplay', false);
    if (chargeDisplay) {
        chargeDisplay.textContent = `(Charge ${charge})`;
    }
    
    // Update history with selected charge
    dependencies.setCurrentHistoryIndex(dependencies.getCurrentHistoryIndex());
}

/**
 * Main calculation function
 */
export async function calculateSolution() {
    try {
        // Reset original optimal charge for new calculation
        State.setOriginalOptimalCharge(null);
        
        // Clear previous field highlighting
        if (window.clearPositionHighlighting) {
            window.clearPositionHighlighting('mortar');
            window.clearPositionHighlighting('target');
        }
        
        // Clear range indicator (dynamic element, force refresh)
        const rangeIndicator = getElement('rangeIndicator', false, true);
        if (rangeIndicator) {
            rangeIndicator.remove();
        }
        
        const mortarPos = dependencies.parsePositionFromUI('mortar');
        const targetPos = dependencies.parsePositionFromUI('target');
        const mortarId = getValue('mortarType');
        const shellType = getValue('shellType');
        const ffeEnabled = isChecked('ffeEnabled');
        const output = getElement('output');
        
        if (ffeEnabled) {
            // Fire for Effect mode - calculate pattern
            const ffePattern = getValue('ffePattern');
            const ffeRounds = parseInt(getValue('ffeRounds'));
            
            const mortarParsed = MortarCalculator.parsePosition(mortarPos);
            const targetParsed = MortarCalculator.parsePosition(targetPos);
            
            let targetPositions;
            let patternParam;
            
            if (ffePattern === 'circular') {
                const ffeRadius = parseFloat(getValue('ffeRadius')) || 100;
                targetPositions = MortarCalculator.generateCircularPattern(targetParsed, ffeRadius, ffeRounds);
                patternParam = ffeRadius;
            } else {
                const ffeSpacing = parseFloat(getValue('ffeSpacing')) || 50;
                targetPositions = MortarCalculator.generateFireForEffectPattern(mortarParsed, targetParsed, ffePattern, ffeRounds, ffeSpacing);
                patternParam = ffeSpacing;
            }
            
            const ffeSolutions = [];
            const centerInput = MortarCalculator.prepareInput(mortarPos, targetParsed, mortarId, shellType);
            const centerSolutions = MortarCalculator.calculateAllTrajectories(centerInput);
            
            if (centerSolutions.length === 0 || !centerSolutions[0].inRange) {
                throw new Error('Center target out of range - cannot calculate FFE pattern');
            }
            
            const ffeCharge = centerSolutions[0].charge;
            
            targetPositions.forEach((pos, index) => {
                const input = MortarCalculator.prepareInput(mortarPos, pos, mortarId, shellType);
                input.chargeLevel = ffeCharge;
                const solutions = MortarCalculator.calculateAllTrajectories(input);
                if (solutions.length > 0 && solutions[0].inRange) {
                    ffeSolutions.push({
                        roundNumber: index + 1,
                        targetPos: pos,
                        input: input,
                        solution: solutions[0]
                    });
                }
            });
            
            const sortedFFE = MortarCalculator.sortFFESolutionsByAzimuth(ffeSolutions);
            
            if (sortedFFE.length > 0) {
                output.className = 'result active success';
                
                let patternDesc, patternParamDesc;
                if (ffePattern === 'perpendicular') {
                    patternDesc = 'Lateral Sheaf (Width Coverage)';
                    patternParamDesc = `Round Interval: ${patternParam}m`;
                } else if (ffePattern === 'along-bearing') {
                    patternDesc = 'Linear Sheaf (Depth Penetration)';
                    patternParamDesc = `Round Interval: ${patternParam}m`;
                } else {
                    patternDesc = 'Circular Pattern (Area Saturation)';
                    patternParamDesc = `Circle Radius: ${patternParam}m`;
                }
                
                let ffeHTML = `
                    <h2>💥 Fire for Effect Mission</h2>
                    
                    ${State.isCorrectionApplied() ? createInfoBanner('🔴 <strong>Fire correction applied:</strong> Red values include observer correction', 'error') : ''}
                    
                    ${createInfoBanner(`
                        <strong>📊 Sheaf Type:</strong> ${patternDesc}<br>
                        <strong>🎯 Salvo Size:</strong> ${sortedFFE.length} of ${ffeRounds} rounds (in range)<br>
                        <strong>📏 ${patternParamDesc}</strong>
                    `)}
                    
                    <h3 style="font-size: 16px; margin-bottom: 10px;">Fire Mission Commands</h3>
                `;
                
                const previousChargeForDisplay = State.getPreviousCharge();
                
                sortedFFE.forEach(({ roundNumber, targetPos, input, solution }) => {
                    ffeHTML += `
                        <div style="background: rgba(35, 45, 42, 0.85); padding: 15px; border-radius: 4px; margin-bottom: 10px; border: 1px solid ${COLORS.borderDark};">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <h3 style="margin: 0; font-size: 16px; color: ${COLORS.textPrimary};">
                                    Round ${roundNumber} of ${ffeRounds} - Charge ${solution.charge}
                                </h3>
                                <span style="font-size: 12px; color: ${COLORS.textMuted}; font-style: italic;">
                                    Range: ${input.distance.toFixed(1)}m | Alt Diff: ${input.heightDifference > 0 ? '+' : ''}${input.heightDifference.toFixed(1)}m
                                </span>
                            </div>
                            ${generateSolutionGridHTML(solution, previousChargeForDisplay)}
                        </div>
                    `;
                });
                
                output.innerHTML = ffeHTML;
                State.setPreviousCharge(null);
            } else {
                throw new Error('No rounds in range for Fire for Effect pattern');
            }
            
            return;
        }
        
        // Normal calculation mode
        const input = MortarCalculator.prepareInput(mortarPos, targetPos, mortarId, shellType);
        let solutions = MortarCalculator.calculateAllTrajectories(input);
        
        if (State.isCorrectionApplied() && State.getSelectedCharge() !== undefined && solutions.length > 0) {
            const selectedChargeIdx = solutions.findIndex(s => s.charge === State.getSelectedCharge());
            if (selectedChargeIdx > 0) {
                const selectedSolution = solutions.splice(selectedChargeIdx, 1)[0];
                solutions.unshift(selectedSolution);
            }
        }
        
        State.setLastSolutions(solutions);
        State.setLastInput(input);
        
        if (solutions.length > 0 && solutions[0].inRange) {
            State.setLastSolution(solutions[0]);
            await dependencies.addToHistory(mortarPos, targetPos, input.distance, solutions);
        }
        
        output.className = 'result active';
        
        if (solutions.length > 0 && solutions[0].inRange) {
            output.classList.add('success');
            
            let solutionsHTML = '';
            
            if (State.isCorrectionApplied()) {
                solutionsHTML += createInfoBanner('🔴 <strong>Fire correction applied:</strong> Red values include observer correction', 'error');
            }
            
            const previousCharge = State.getPreviousCharge();
            if (typeof previousCharge === 'number' && previousCharge !== solutions[0].charge) {
                solutionsHTML += createInfoBanner(`⚠️ <strong>Charge changed:</strong> Correction moved target from Charge ${previousCharge} to Charge ${solutions[0].charge} (different ballistic trajectory)`, 'warning');
            }
            
            const previousChargeForDisplay = previousCharge;
            
            let optimalMissionHTML = '';
            let alternativeMissionsHTML = '';
            
            solutions.forEach((solution, index) => {
                const missionHTML = generateMissionCardHTML(solution, index, previousChargeForDisplay, solutions);
                
                if (index === 0) {
                    optimalMissionHTML = missionHTML;
                } else {
                    alternativeMissionsHTML += missionHTML;
                }
            });
            
            const widget = getElement('fireCorrectionWidget', false);
            
            const alternativeSection = solutions.length > 1 ? `
                <button class="btn-press" onclick="toggleAlternativeMissions()" id="toggleAltBtn" style="width: 100%; padding: 10px; margin-top: 20px; background: ${COLORS.gradientGray}; border: 1px solid ${COLORS.borderGray}; border-radius: 4px; color: ${COLORS.textPrimary}; font-weight: 600; cursor: pointer; font-size: 13px;">
                    ▼ Show ${solutions.length - 1} Alternative Mission${solutions.length > 2 ? 's' : ''}
                </button>
                <div id="alternativeMissions" style="display: none;">
                    ${alternativeMissionsHTML}
                </div>
                ` : '';
            
            output.innerHTML = `
                <h2>✅ ${solutions.length} Firing Mission${solutions.length > 1 ? 's' : ''} Found</h2>
                
                ${optimalMissionHTML}
                
                <div id="widgetPlaceholder"></div>
                
                <div id="ffePlaceholder"></div>
                
                ${alternativeSection}
            `;
            
            // Cache base solution HTML BEFORE moving widgets (so placeholders remain)
            const { showFFEWidget, cacheBaseSolution } = await import('./ffe.js');
            cacheBaseSolution(output.innerHTML);
            
            const placeholder = getElement('widgetPlaceholder', false, true); // Dynamic element
            if (widget && placeholder) {
                placeholder.parentNode.insertBefore(widget, placeholder);
                placeholder.remove();
            }
            await updateFireCorrectionWidget(solutions);
            
            // Move FFE container into ffePlaceholder
            const ffeContainer = getElement('ffeContainer', false);
            const ffePlaceholder = getElement('ffePlaceholder', false, true); // Dynamic element
            if (ffeContainer && ffePlaceholder) {
                ffePlaceholder.parentNode.insertBefore(ffeContainer, ffePlaceholder);
                ffePlaceholder.remove();
            }
            
            // Show FFE widget after successful calculation
            showFFEWidget();
            
            State.setPreviousCharge(null);
            if (!State.isCorrectionApplied()) {
                State.setOriginalTargetPos(null);
            }
            
            State.setOriginalOptimalCharge(solutions[0].charge);
            State.setSelectedCharge(solutions[0].charge);
            
            // Restore observer position if FO mode was active
            if (State.isFOModeEnabled() && State.getLastObserverPos()) {
                const isGridMode = CoordManager.getMode() === 'grid';
                const lastObs = State.getLastObserverPos();
                
                if (isGridMode) {
                    const gridCoords = MortarCalculator.metersToGrid(lastObs.x, lastObs.y).split('/');
                    const gridXEl = getElement('observerGridX', false);
                    const gridYEl = getElement('observerGridY', false);
                    if (gridXEl) gridXEl.value = gridCoords[0];
                    if (gridYEl) gridYEl.value = gridCoords[1];
                } else {
                    const xEl = getElement('observerX', false);
                    const yEl = getElement('observerY', false);
                    if (xEl) xEl.value = lastObs.x.toFixed(1);
                    if (yEl) yEl.value = lastObs.y.toFixed(1);
                }
            }
            
            // Set up event listeners for dynamically created correction/observer inputs
            if (window.setupDynamicListeners) {
                setTimeout(() => {
                    window.setupDynamicListeners();
                }, 50);
            }
        } else {
            const solution = solutions[0];
            output.classList.add('error');
            output.innerHTML = `
                <h2>❌ Target Out of Range</h2>
                <p><strong>Error:</strong> ${solution.error}</p>
                ${solution.minRange && solution.maxRange ? `
                    <p>
                        <strong>Valid range for this configuration:</strong><br>
                        ${solution.minRange}m - ${solution.maxRange}m
                    </p>
                ` : ''}
                <p style="margin-top: 15px;">
                    <strong>Suggestions:</strong>
                </p>
                <ul>
                    <li>Try a different mortar type or shell type</li>
                    <li>Move mortar or target positions closer/further</li>
                </ul>
            `;
            
            // Hide FFE widget on error
            const { hideFFEWidget } = await import('./ffe.js');
            hideFFEWidget();
        }
    } catch (error) {
        dependencies.showOutputError('Calculation Error', error.message + '<br>Check your input values and try again.');
        console.error('Calculation error:', error);
        
        // Hide FFE widget on error
        const { hideFFEWidget } = await import('./ffe.js');
        hideFFEWidget();
    }
}

/**
 * Update static fire correction widget
 */
async function updateFireCorrectionWidget(solutions) {
    const widget = getElement('fireCorrectionWidget', false);
    if (!widget) return;
    
    if (!solutions || solutions.length === 0) {
        widget.style.display = 'none';
        return;
    }
    
    widget.style.display = 'block';
    
    // Update charge display
    const chargeDisplay = getElement('selectedChargeDisplay', false, true);
    if (chargeDisplay) chargeDisplay.textContent = `(Charge ${solutions[0].charge})`;
    
    // Update FO mode checkbox
    const foCheckbox = DOMCache.getElement('foEnabled', false, true);
    if (foCheckbox) foCheckbox.checked = State.isFOModeEnabled();
    
    // Update FO controls visibility
    const foControls = getElement('foControls', false, true);
    if (foControls) foControls.style.display = State.isFOModeEnabled() ? 'block' : 'none';
    
    // Update observer position inputs based on mode
    const lastObserver = State.getLastObserverPos();
    const gridModeActive = CoordManager.getMode() === 'grid';
    
    const observerGridMode = getElement('observerGridMode', false, true);
    const observerMetersMode = getElement('observerMetersMode', false, true);
    
    if (observerGridMode && observerMetersMode) {
        if (gridModeActive) {
            observerGridMode.classList.add('active');
            observerMetersMode.classList.remove('active');
            
            if (lastObserver) {
                const gridCoords = MortarCalculator.metersToGrid(lastObserver.x, lastObserver.y).split('/');
                const gridXInput = getElement('observerGridX', false);
                const gridYInput = getElement('observerGridY', false);
                if (gridXInput) gridXInput.value = gridCoords[0];
                if (gridYInput) gridYInput.value = gridCoords[1];
            }
        } else {
            observerGridMode.classList.remove('active');
            observerMetersMode.classList.add('active');
            
            if (lastObserver) {
                const xInput = getElement('observerX', false);
                const yInput = getElement('observerY', false);
                if (xInput) xInput.value = lastObserver.x.toFixed(1);
                if (yInput) yInput.value = lastObserver.y.toFixed(1);
            }
        }
    }
    
    // Update bearing display visibility
    const bearingDisplay = getElement('otBearingDisplay', false, true);
    if (bearingDisplay) {
        bearingDisplay.style.display = State.isFOModeEnabled() ? 'block' : 'none';
    }
    
    // Update correction input values
    const lrInput = getElement('correctionLR', false, true);
    const adInput = getElement('correctionAD', false, true);
    if (State.isCorrectionApplied()) {
        const correctionLR = State.getLastCorrectionLR() || 0;
        const correctionAD = State.getLastCorrectionAD() || 0;
        if (lrInput) lrInput.value = correctionLR;
        if (adInput) adInput.value = correctionAD;
    } else {
        // Leave fields empty when no correction is applied
        if (lrInput) lrInput.value = '';
        if (adInput) adInput.value = '';
    }
    
    // Update undo button visibility
    const undoBtn = getElement('undoCorrection', false);
    if (undoBtn) {
        undoBtn.style.display = State.isCorrectionApplied() ? 'block' : 'none';
    }
}

/**
 * Generate FFE display HTML for widget
 * @param {Array} sortedFFE - Sorted FFE solutions
 * @param {string} ffePattern - Pattern type
 * @param {number} patternParam - Pattern parameter (spacing or radius)
 * @param {number} ffeRounds - Total rounds requested
 * @returns {string} HTML string for FFE display
 */
export function generateFFEDisplayHTML(sortedFFE, ffePattern, patternParam, ffeRounds) {
    let patternDesc, patternParamDesc;
    if (ffePattern === 'perpendicular') {
        patternDesc = 'Lateral Sheaf (Width Coverage)';
        patternParamDesc = `Round Interval: ${patternParam}m`;
    } else if (ffePattern === 'along-bearing') {
        patternDesc = 'Linear Sheaf (Depth Penetration)';
        patternParamDesc = `Round Interval: ${patternParam}m`;
    } else {
        patternDesc = 'Circular Pattern (Area Saturation)';
        patternParamDesc = `Circle Radius: ${patternParam}m`;
    }
    
    let ffeHTML = `
        <h2>💥 Fire for Effect Mission</h2>
        
        ${State.isCorrectionApplied() ? createInfoBanner('🔴 <strong>Fire correction applied:</strong> Red values include observer correction', 'error') : ''}
        
        ${createInfoBanner(`
            <strong>📊 Sheaf Type:</strong> ${patternDesc}<br>
            <strong>🎯 Salvo Size:</strong> ${sortedFFE.length} of ${ffeRounds} rounds (in range)<br>
            <strong>📏 ${patternParamDesc}</strong>
        `)}
        
        <h3 style="font-size: 16px; margin-bottom: 10px;">Fire Mission Commands</h3>
    `;
    
    const previousChargeForDisplay = State.getPreviousCharge();
    
    sortedFFE.forEach(({ roundNumber, targetPos, input, solution }) => {
        ffeHTML += `
            <div style="background: linear-gradient(135deg, rgba(55, 45, 70, 0.95) 0%, rgba(45, 35, 60, 0.95) 100%); padding: 15px; border-radius: 4px; margin-bottom: 10px; border: 1px solid rgba(143, 105, 188, 0.3);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 16px; color: #d4c8e0;">
                        Round ${roundNumber} of ${ffeRounds} - Charge ${solution.charge}
                    </h3>
                    <span style="font-size: 12px; color: ${COLORS.textMuted}; font-style: italic;">
                        Range: ${input.distance.toFixed(1)}m | Alt Diff: ${input.heightDifference > 0 ? '+' : ''}${input.heightDifference.toFixed(1)}m
                    </span>
                </div>
                ${generateSolutionGridHTML(solution, previousChargeForDisplay)}
            </div>
        `;
    });
    
    return ffeHTML;
}

/**
 * Expose functions to window for onclick compatibility
 */
export function exposeToWindow() {
    window.selectMission = selectMission;
    window.calculateSolution = calculateSolution;
    window.updateShellTypes = updateShellTypes;
    window.getAllMortarTypes = getAllMortarTypes;
}
