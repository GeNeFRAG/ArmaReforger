/**
 * Arma Reforger Mortar Ballistic Calculator
 * Framework-agnostic calculation engine
 * Version: 1.6.1
 * 
 * Features:
 * - Precision ballistic calculations for mortar fire missions
 * - Support for multiple mortar types (RUS/US) and shell types
 * - Height correction for elevation differences
 * - Fire for Effect (FFE) pattern generation:
 *   - Lateral sheaf (perpendicular): Width coverage for area targets
 *   - Linear sheaf (along-bearing): Depth penetration for linear targets
 *   - Circular pattern: 360° area saturation
 * - Fire correction support:
 *   - Gun-Target line corrections (standard mode)
 *   - Observer-Target line corrections (FO mode - eliminates guesswork)
 * - Works with corrected target coordinates
 * 
 * @module MortarCalculator
 */

// ============================================================================
// SECTION 1: Type Definitions (JSDoc)
// ============================================================================

/**
 * @typedef {Object} Position3D
 * @property {number} x - X coordinate in meters
 * @property {number} y - Y coordinate in meters  
 * @property {number} z - Elevation in meters
 */

/**
 * @typedef {Object} GridCoordinate
 * @property {string} grid - Grid coordinate string (e.g., "058/071" or "0584/0713")
 * @property {number} z - Elevation in meters
 */

/**
 * @typedef {Object} CalculatorInput
 * @property {number} distance - Horizontal distance in meters
 * @property {number} heightDifference - Target height - mortar height (meters)
 * @property {number} bearing - Azimuth angle in degrees (0-360)
 * @property {string} mortarId - Weapon ID (e.g., "RUS", "US")
 * @property {string} shellType - Shell type (e.g., "HE", "SMOKE")
 * @property {number} [chargeLevel] - Optional: Force specific charge (0-4)
 */

/**
 * @typedef {Object} FiringSolution
 * @property {boolean} inRange - Can target be engaged
 * @property {number} charge - Selected charge level (0-4)
 * @property {number} elevation - Gun elevation in mils (rounded for display)
 * @property {number} elevationPrecise - Gun elevation in mils (fractional precision)
 * @property {number} elevationCorrection - Elevation correction applied for height difference (mils)
 * @property {number} elevationDegrees - Gun elevation in degrees
 * @property {number} azimuth - Azimuth in degrees
 * @property {number} azimuthMils - Azimuth in mils
 * @property {number} timeOfFlight - Projectile flight time in seconds (corrected for height)
 * @property {number} tofCorrection - TOF correction applied for height difference (seconds)
 * @property {number} minRange - Minimum range for this charge (meters)
 * @property {number} maxRange - Maximum range for this charge (meters)
 * @property {string} [error] - Error message if not in range
 */

// ============================================================================
// SECTION 2: Geometry Utilities
// ============================================================================

/**
 * Calculate 3D distance between two positions
 * @param {Position3D} pos1 
 * @param {Position3D} pos2 
 * @returns {number} Distance in meters
 */
function calculateDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    const dz = pos2.z - pos1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Calculate horizontal distance (ignoring elevation)
 * @param {Position3D} pos1 
 * @param {Position3D} pos2 
 * @returns {number} Horizontal distance in meters
 */
function calculateHorizontalDistance(pos1, pos2) {
    const dx = pos2.x - pos1.x;
    const dy = pos2.y - pos1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate bearing from pos1 to pos2
 * Matches original spreadsheet calculation where X/Y are swapped
 * @param {Position3D} pos1 - Origin position (mortar)
 * @param {Position3D} pos2 - Target position
 * @returns {number} Bearing in degrees (0-360)
 */
function calculateBearing(pos1, pos2) {
    // In the game coordinate system, X and Y are swapped compared to standard math
    // Use Y as horizontal and X as vertical for correct bearing
    const dy = pos2.x - pos1.x;
    const dx = pos2.y - pos1.y;
    
    let angle = Math.atan2(dy, dx);
    angle *= 180 / Math.PI;
    
    if (angle < 0) {
        angle = 360 + angle;
    }
    
    return parseFloat(angle.toFixed(1));
}

/**
 * Parse grid coordinate string to meters
 * Supports both 3-digit (10m precision) and 4-digit (1m precision) formats
 * @param {string} gridString - Grid coordinate (e.g., "058/071", "058,071", "0584/0713", or "0584,0713")
 * @returns {Object} Object with x and y in meters
 * @throws {Error} If format is invalid
 */
function parseGridToMeters(gridString) {
    const cleaned = gridString.replace(/\s/g, '');
    
    // Support both / and , as delimiters
    let parts;
    if (cleaned.includes('/')) {
        parts = cleaned.split('/');
    } else if (cleaned.includes(',')) {
        parts = cleaned.split(',');
    } else {
        throw new Error('Invalid grid format. Use: 058/071, 058,071, 0584/0713, or 0584,0713');
    }
    
    if (parts.length !== 2) {
        throw new Error('Invalid grid format. Use: 058/071, 058,071, 0584/0713, or 0584,0713');
    }
    
    const gridX = parts[0];
    const gridY = parts[1];
    
    if (gridX.length === 3 && gridY.length === 3) {
        return {
            x: parseInt(gridX, 10) * 100 + 50,
            y: parseInt(gridY, 10) * 100 + 50
        };
    } else if (gridX.length === 4 && gridY.length === 4) {
        return {
            x: parseInt(gridX, 10) * 10,
            y: parseInt(gridY, 10) * 10
        };
    } else {
        throw new Error('Grid coordinates must be 3 or 4 digits each (e.g., 058/071, 058,071, 0584/0713, or 0584,0713)');
    }
}

/**
 * Convert meters to grid coordinate string
 * @param {number} x - X coordinate in meters
 * @param {number} y - Y coordinate in meters
 * @param {boolean} highPrecision - Use 4-digit format (1m) instead of 3-digit (10m)
 * @returns {string} Grid coordinate string
 */
function metersToGrid(x, y, highPrecision = false) {
    if (highPrecision) {
        const gridX = Math.floor(x / 10).toString().padStart(4, '0');
        const gridY = Math.floor(y / 10).toString().padStart(4, '0');
        return `${gridX}/${gridY}`;
    } else {
        const gridX = Math.floor(x / 100).toString().padStart(3, '0');
        const gridY = Math.floor(y / 100).toString().padStart(3, '0');
        return `${gridX}/${gridY}`;
    }
}

/**
 * Parse position input - supports both meter coordinates and grid format
 * @param {Position3D|GridCoordinate|string} position - Position as meters or grid string
 * @returns {Position3D} Position in meters
 */
function parsePosition(position) {
    if (typeof position === 'string') {
        const coords = parseGridToMeters(position);
        return { x: coords.x, y: coords.y, z: 0 };
    }
    
    if (position.grid !== undefined) {
        const coords = parseGridToMeters(position.grid);
        return { x: coords.x, y: coords.y, z: position.z || 0 };
    }
    
    return position;
}

/**
 * Apply corrections to a target position based on a reference bearing
 * Core correction logic used by both gun-based and observer-based corrections
 * 
 * @private
 * @param {Position3D} targetPos - Original target position
 * @param {number} bearing - Reference bearing in degrees (GT or OT line)
 * @param {number} leftRight - Left/Right correction in meters (+ = Right, - = Left)
 * @param {number} addDrop - Add/Drop correction in meters (- = Add/farther, + = Drop/closer)
 * @returns {Position3D} Corrected target position
 */
function applyCorrectionAlongBearing(targetPos, bearing, leftRight, addDrop) {
    const bearingRad = (bearing * Math.PI) / 180;
    
    // Apply corrections in swapped coordinate system
    // Bearing vector in X,Y coords is: (sin(bearing), cos(bearing))
    // Add/Drop along bearing: negative = away (Add/farther), positive = towards (Drop/closer)
    // Left/Right perpendicular: negative = left, positive = right
    const correctedX = targetPos.x + addDrop * Math.sin(bearingRad) + leftRight * Math.cos(bearingRad);
    const correctedY = targetPos.y + addDrop * Math.cos(bearingRad) - leftRight * Math.sin(bearingRad);
    
    return {
        x: correctedX,
        y: correctedY,
        z: targetPos.z
    };
}

/**
 * Apply fire correction to a target position based on Gun-Target line
 * Uses military standard terminology:
 * - Left/Right: Deflection correction perpendicular to line of fire
 * - Add/Drop: Range correction along line of fire
 * 
 * @param {Position3D} mortarPos - Mortar position
 * @param {Position3D} targetPos - Original target position
 * @param {number} leftRight - Left/Right correction in meters (+ = Right, - = Left)
 * @param {number} addDrop - Add/Drop correction in meters (- = Add/raise elevation, + = Drop/lower elevation)
 * @returns {Position3D} Corrected target position
 * 
 * @example
 * const mortar = {x: 475, y: 695, z: 10};
 * const target = {x: 855, y: 1055, z: 25};
 * const corrected = applyFireCorrection(mortar, target, -10, -20); // Left 10m, Add 20m (raise elevation)
 */
function applyFireCorrection(mortarPos, targetPos, leftRight, addDrop) {
    const bearing = calculateBearing(mortarPos, targetPos);
    return applyCorrectionAlongBearing(targetPos, bearing, leftRight, addDrop);
}

/**
 * Apply fire correction from Forward Observer perspective (Observer-Target line)
 * Eliminates guesswork by applying corrections from FO's actual line of sight
 * 
 * Military use case:
 * - FO observes from their position, not the gun position
 * - FO corrections are relative to their OT line, not GT line
 * - More accurate than estimating GT corrections from OT perspective
 * 
 * @param {Position3D} mortarPos - Mortar position (for final targeting)
 * @param {Position3D} observerPos - Forward Observer position
 * @param {Position3D} targetPos - Original target position
 * @param {number} leftRight - Left/Right correction in meters (+ = Right, - = Left from FO perspective)
 * @param {number} addDrop - Add/Drop correction in meters (- = Add/farther, + = Drop/closer from FO perspective)
 * @returns {Object} {correctedTarget: Position3D, otBearing: number, gtBearing: number, angleDiff: number}
 * 
 * @example
 * const mortar = {x: 475, y: 695, z: 10};
 * const observer = {x: 600, y: 800, z: 15};
 * const target = {x: 855, y: 1055, z: 25};
 * const result = applyFireCorrectionFromObserver(mortar, observer, target, 10, -20);
 * // result.correctedTarget = new position
 * // result.otBearing = FO's bearing to target
 * // result.gtBearing = Gun's bearing to corrected target
 * // result.angleDiff = Angle between OT and GT lines
 */
function applyFireCorrectionFromObserver(mortarPos, observerPos, targetPos, leftRight, addDrop) {
    const otBearing = calculateBearing(observerPos, targetPos);
    const correctedTarget = applyCorrectionAlongBearing(targetPos, otBearing, leftRight, addDrop);
    const gtBearing = calculateBearing(mortarPos, correctedTarget);
    
    let angleDiff = gtBearing - otBearing;
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;
    
    return {
        correctedTarget,
        otBearing: parseFloat(otBearing.toFixed(1)),
        gtBearing: parseFloat(gtBearing.toFixed(1)),
        angleDiff: parseFloat(angleDiff.toFixed(1))
    };
}

/**
 * Generate Fire for Effect pattern positions
 * 
 * Engage area targets with multiple rounds using military fire patterns:
 * - Lateral sheaf (perpendicular): Provides width coverage across the target area
 * - Linear sheaf (along-bearing): Provides depth penetration through linear targets
 * 
 * Works with corrected target coordinates from observer adjustments.
 * Pattern is symmetric around the center target position.
 * 
 * @param {Position3D} mortarPos - Mortar position {x, y, z}
 * @param {Position3D} targetPos - Center target position {x, y, z} (can be corrected coordinates)
 * @param {string} patternType - 'perpendicular' (lateral sheaf) or 'along-bearing' (linear sheaf)
 * @param {number} numRounds - Number of rounds (3-10)
 * @param {number} spacing - Spacing between impacts in meters
 * @returns {Array<Position3D>} Array of target positions for each round
 * @example
 * // 5 rounds perpendicular to line of fire (lateral sheaf), 50m apart
 * const positions = generateFireForEffectPattern(mortar, target, 'perpendicular', 5, 50);
 * // positions[0] = 100m left, positions[2] = center, positions[4] = 100m right
 */
function generateFireForEffectPattern(mortarPos, targetPos, patternType, numRounds, spacing) {
    const bearing = calculateBearing(mortarPos, targetPos);
    
    // Determine direction angle based on pattern type
    const directionAngle = patternType === 'perpendicular' 
        ? bearing + 90  // Perpendicular to line of fire (left-right spread)
        : bearing;       // Along line of fire (depth spread)
    
    const directionRad = (directionAngle * Math.PI) / 180;
    
    // Calculate center offset to make pattern symmetric around target
    const centerOffset = ((numRounds - 1) / 2) * spacing;
    
    // Generate positions
    const positions = [];
    for (let i = 0; i < numRounds; i++) {
        const offset = (i * spacing) - centerOffset;
        positions.push({
            x: targetPos.x + offset * Math.cos(directionRad),
            y: targetPos.y + offset * Math.sin(directionRad),
            z: targetPos.z
        });
    }
    
    return positions;
}

/**
 * Generate circular pattern positions using concentric rings
 * 
 * Engage area targets with multi-ring coverage pattern.
 * Uses center point + outer ring(s) for better area saturation.
 * Works with corrected target coordinates from observer adjustments.
 * 
 * @param {Position3D} targetPos - Center target position {x, y, z} (can be corrected coordinates)
 * @param {number} radius - Maximum radius in meters
 * @param {number} numRounds - Number of rounds (3-12)
 * @returns {Array<Position3D>} Array of target positions for each round
 * @example
 * // 6 rounds: 1 center + 5 outer ring, max radius 100m
 * const positions = generateCircularPattern(target, 100, 6);
 */
function generateCircularPattern(targetPos, radius, numRounds) {
    const positions = [];
    
    if (numRounds === 1) {
        // Single round at center
        positions.push({ x: targetPos.x, y: targetPos.y, z: targetPos.z });
    } else if (numRounds === 3) {
        // 3 rounds: center + 2 on outer ring (180° apart)
        positions.push({ x: targetPos.x, y: targetPos.y, z: targetPos.z });
        for (let i = 0; i < 2; i++) {
            const angle = i * Math.PI;
            positions.push({
                x: targetPos.x + radius * Math.cos(angle),
                y: targetPos.y + radius * Math.sin(angle),
                z: targetPos.z
            });
        }
    } else if (numRounds <= 6) {
        // 4-6 rounds: center + outer ring
        positions.push({ x: targetPos.x, y: targetPos.y, z: targetPos.z });
        const outerRounds = numRounds - 1;
        const angleStep = (2 * Math.PI) / outerRounds;
        for (let i = 0; i < outerRounds; i++) {
            const angle = i * angleStep;
            positions.push({
                x: targetPos.x + radius * Math.cos(angle),
                y: targetPos.y + radius * Math.sin(angle),
                z: targetPos.z
            });
        }
    } else {
        // 7-12 rounds: center + inner ring + outer ring
        positions.push({ x: targetPos.x, y: targetPos.y, z: targetPos.z });
        
        const remainingRounds = numRounds - 1;
        const innerRounds = Math.floor(remainingRounds / 2);
        const outerRounds = remainingRounds - innerRounds;
        
        const innerRadius = radius * 0.5;
        const innerAngleStep = (2 * Math.PI) / innerRounds;
        for (let i = 0; i < innerRounds; i++) {
            const angle = i * innerAngleStep;
            positions.push({
                x: targetPos.x + innerRadius * Math.cos(angle),
                y: targetPos.y + innerRadius * Math.sin(angle),
                z: targetPos.z
            });
        }
        
        const outerAngleStep = (2 * Math.PI) / outerRounds;
        const angleOffset = Math.PI / outerRounds;
        for (let i = 0; i < outerRounds; i++) {
            const angle = i * outerAngleStep + angleOffset;
            positions.push({
                x: targetPos.x + radius * Math.cos(angle),
                y: targetPos.y + radius * Math.sin(angle),
                z: targetPos.z
            });
        }
    }
    
    return positions;
}

/**
 * Sort FFE solutions by azimuth for easier gun traverse
 * Gunner only needs to turn in one direction through the fire mission
 * @param {Array<Object>} ffeSolutions - Array of FFE solution objects with solution.azimuthMils
 * @returns {Array<Object>} Sorted and renumbered solutions
 * @example
 * const sorted = sortFFESolutionsByAzimuth(ffeSolutions);
 */
function sortFFESolutionsByAzimuth(ffeSolutions) {
    // Sort by azimuth (ascending order)
    const sorted = [...ffeSolutions].sort((a, b) => a.solution.azimuthMils - b.solution.azimuthMils);
    
    // Renumber rounds after sorting
    sorted.forEach((sol, index) => {
        sol.roundNumber = index + 1;
    });
    
    return sorted;
}

/**
 * Prepare calculator input from two 3D positions
 * @param {Position3D|GridCoordinate|string} mortarPos - Mortar position
 * @param {Position3D|GridCoordinate|string} targetPos - Target position
 * @param {string} mortarId - Weapon ID
 * @param {string} shellType - Shell type
 * @returns {CalculatorInput}
 */
function prepareInput(mortarPos, targetPos, mortarId, shellType) {
    const mortar = parsePosition(mortarPos);
    const target = parsePosition(targetPos);
    
    return {
        distance: calculateHorizontalDistance(mortar, target),
        heightDifference: target.z - mortar.z,
        bearing: calculateBearing(mortar, target),
        mortarId,
        mortarType: mortarId.startsWith('RUS') ? 'RUS' : 'US',
        shellType
    };
}

// ============================================================================
// SECTION 3: Ballistic Data Management
// ============================================================================

let ballisticData = null;

/**
 * Load ballistic data from JSON file
 * @param {string|Object} dataSource - Path to JSON or data object
 * @returns {Promise<Object>} Loaded ballistic data
 */
async function loadBallisticData(dataSource) {
    if (typeof dataSource === 'object') {
        ballisticData = dataSource;
        return ballisticData;
    }
    
    // Node.js environment
    if (typeof require !== 'undefined') {
        const fs = require('fs').promises;
        const data = await fs.readFile(dataSource, 'utf8');
        ballisticData = JSON.parse(data);
        return ballisticData;
    }
    
    // Browser environment
    if (typeof fetch !== 'undefined') {
        const response = await fetch(dataSource);
        ballisticData = await response.json();
        return ballisticData;
    }
    
    throw new Error('No method available to load ballistic data');
}

/**
 * Get weapon configuration
 * @param {string} mortarId - Weapon ID
 * @param {string} shellType - Shell type
 * @returns {Object} Weapon configuration
 */
function getWeaponConfig(mortarId, shellType) {
    if (!ballisticData) {
        throw new Error('Ballistic data not loaded. Call loadBallisticData() first.');
    }
    
    const mortar = ballisticData.mortarTypes.find(m => m.id === mortarId);
    if (!mortar) {
        throw new Error(`Unknown mortar ID: ${mortarId}`);
    }
    
    const shell = mortar.shellTypes.find(s => s.type === shellType);
    if (!shell) {
        throw new Error(`Unknown shell type: ${shellType} for ${mortarId}`);
    }
    
    return { mortar, shell };
}

/**
 * Get all available mortar types
 * @returns {Array} Array of mortar type objects
 */
function getAllMortarTypes() {
    if (!ballisticData) {
        throw new Error('Ballistic data not loaded. Call loadBallisticData() first.');
    }
    
    return ballisticData.mortarTypes.map(m => ({
        id: m.id,
        name: m.name,
        caliber: m.caliber
    }));
}

// ============================================================================
// SECTION 4: Ballistic Solver
// ============================================================================

// Ballistic correction constants
const HEIGHT_CORRECTION_FACTOR = 0.6;

/**
 * Linear interpolation between two values
 * @param {number} x - Input value
 * @param {number} x0 - Lower bound x
 * @param {number} x1 - Upper bound x
 * @param {number} y0 - Value at x0
 * @param {number} y1 - Value at x1
 * @returns {number} Interpolated value
 */
function lerp(x, x0, x1, y0, y1) {
    if (x1 === x0) return y0;
    return y0 + (y1 - y0) * ((x - x0) / (x1 - x0));
}

/**
 * Find optimal charge for given distance
 * @param {Array} charges - Array of charge configurations
 * @param {number} distance - Target distance in meters
 * @returns {Object|null} Selected charge or null if out of range
 */
function findOptimalCharge(charges, distance) {
    for (const charge of charges) {
        if (distance >= charge.minRange && distance <= charge.maxRange) {
            return charge;
        }
    }
    return null;
}

/**
 * Interpolate elevation from range table
 * @param {Array} rangeTable - Ballistic table entries
 * @param {number} distance - Target distance in meters
 * @returns {Object|null} {elevation: number, tof: number, dElev: number} or null if out of range
 */
function interpolateFromTable(rangeTable, distance) {
    let lower = null;
    let upper = null;
    
    for (let i = 0; i < rangeTable.length; i++) {
        const entry = rangeTable[i];
        
        if (entry.range === distance) {
            return {
                elevation: entry.elevation,
                tof: entry.tof,
                dElev: entry.dElev,
                tofPer100m: entry.tofPer100m || 0
            };
        }
        
        if (entry.range < distance) {
            lower = entry;
        } else {
            upper = entry;
            break;
        }
    }
    
    if (!lower || !upper) {
        return null;
    }
    
    const elevation = lerp(distance, lower.range, upper.range, lower.elevation, upper.elevation);
    const tof = lerp(distance, lower.range, upper.range, lower.tof, upper.tof);
    const dElev = lerp(distance, lower.range, upper.range, lower.dElev, upper.dElev);
    const tofPer100m = lerp(distance, lower.range, upper.range, lower.tofPer100m || 0, upper.tofPer100m || 0);
    
    return {
        elevation: elevation,
        tof: tof,
        dElev: dElev,
        tofPer100m: parseFloat(tofPer100m.toFixed(2))
    };
}

/**
 * Apply height correction to elevation
 * @param {number} baseElevation - Base elevation in mils
 * @param {number} heightDifference - Height difference in meters (positive = target higher)
 * @param {number} dElev - Change in elevation per unit
 * @returns {number} Corrected elevation in mils
 */
function applyHeightCorrection(baseElevation, heightDifference, dElev) {
    if (heightDifference === 0) return baseElevation;
    
    let correction = (heightDifference / 100) * dElev;
    
    if (heightDifference < -100) {
        correction *= HEIGHT_CORRECTION_FACTOR;
    }
    
    // Original engine SUBTRACTS the correction (which adds for negative heightDiff)
    return baseElevation - correction;
}

/**
 * Apply height correction to time of flight
 * @param {number} baseTOF - Base time of flight in seconds
 * @param {number} heightDifference - Height difference in meters (positive = target higher)
 * @param {number} tofPer100m - TOF change per 100m height difference
 * @returns {number} Corrected time of flight in seconds
 */
function applyTOFCorrection(baseTOF, heightDifference, tofPer100m) {
    if (heightDifference === 0) return baseTOF;
    
    const correction = (heightDifference / 100) * tofPer100m;
    
    return baseTOF + correction;
}

/**
 * Calculate azimuth in mils
 * @param {number} bearingDegrees - Bearing in degrees
 * @param {string} mortarType - Mortar type ID
 * @returns {number} Azimuth in mils
 */
function calculateAzimuthMils(bearingDegrees, mortarType) {
    const milSystem = getMilSystemConfig(mortarType);
    return Math.round(bearingDegrees * milSystem.milsPerDegree);
}

/**
 * Get mil system configuration for a mortar type
 * @param {string} mortarType - Mortar type ID
 * @returns {Object} Mil system configuration
 */
function getMilSystemConfig(mortarType) {
    if (!ballisticData) {
        throw new Error('Ballistic data not loaded. Call loadBallisticData() first.');
    }
    
    const mortar = ballisticData.mortarTypes.find(m => m.id === mortarType);
    if (!mortar || !mortar.milSystem) {
        // Fallback to hardcoded values if not in data
        return mortarType === 'RUS' 
            ? { name: 'Warsaw Pact', milsPerCircle: 6000, milsPerDegree: 16.6667 }
            : { name: 'NATO', milsPerCircle: 6400, milsPerDegree: 17.7778 };
    }
    
    return mortar.milSystem;
}

/**
 * Convert degrees to mils
 * @param {number} degrees - Angle in degrees
 * @param {string} mortarType - Mortar type ID
 * @returns {number} Angle in mils
 */
function degreesToMils(degrees, mortarType) {
    const milSystem = getMilSystemConfig(mortarType);
    return Math.round(degrees * milSystem.milsPerDegree);
}

/**
 * Convert mils to degrees
 * @param {number} mils - Angle in mils
 * @param {string} mortarType - Mortar type ID
 * @returns {number} Angle in degrees
 */
function milsToDegrees(mils, mortarType) {
    const milSystem = getMilSystemConfig(mortarType);
    return parseFloat((mils / milSystem.milsPerDegree).toFixed(2));
}

/**
 * Get the mil system name for display
 * @param {string} mortarType - Mortar type ID
 * @returns {string} Mil system name
 */
function getMilSystemName(mortarType) {
    const milSystem = getMilSystemConfig(mortarType);
    return `${milSystem.name} (${milSystem.milsPerCircle} mils)`;
}

/**
 * Format firing solution for field use (all values in mils)
 * @param {FiringSolution} solution - Standard firing solution
 * @returns {Object} Field-formatted solution with mils values
 */
function formatForField(solution) {
    if (!solution.inRange) {
        return solution;
    }
    
    return {
        inRange: true,
        charge: solution.charge,
        elevation: solution.elevation,
        azimuth: solution.azimuthMils,
        timeOfFlight: solution.timeOfFlight,
        minRange: solution.minRange,
        maxRange: solution.maxRange,
        
        // Original degree values for reference
        elevationDegrees: solution.elevationDegrees,
        azimuthDegrees: solution.azimuth
    };
}

// ============================================================================
// SECTION 5: Main Calculator API
// ============================================================================

/**
 * Validate calculator input
 * @param {CalculatorInput} input 
 * @throws {Error} If input is invalid
 */
function validateInput(input) {
    if (!input.distance || input.distance < 0) {
        throw new Error('Invalid distance');
    }
    if (!input.mortarId || !input.shellType) {
        throw new Error('Mortar ID and shell type are required');
    }
    if (input.bearing < 0 || input.bearing > 360) {
        throw new Error('Bearing must be between 0 and 360 degrees');
    }
}

/**
 * Calculate all possible firing solutions (all charges that can reach target)
 * @param {CalculatorInput} input - Calculation parameters
 * @returns {Array<FiringSolution>} Array of all possible firing solutions
 */
function calculateAllTrajectories(input) {
    validateInput(input);
    
    const { mortar, shell } = getWeaponConfig(input.mortarId, input.shellType);
    const solutions = [];
    
    // If charge is manually specified, only calculate for that charge
    if (input.chargeLevel !== undefined) {
        const charge = shell.charges.find(c => c.level === input.chargeLevel);
        if (!charge) {
            return [{
                inRange: false,
                error: `Charge ${input.chargeLevel} not available for this weapon`,
                minRange: Math.min(...shell.charges.map(c => c.minRange)),
                maxRange: Math.max(...shell.charges.map(c => c.maxRange))
            }];
        }
        
        const solution = calculateForCharge(charge, input);
        return [solution];
    }
    
    // Find all charges that can reach the target
    for (const charge of shell.charges) {
        if (input.distance >= charge.minRange && input.distance <= charge.maxRange) {
            const solution = calculateForCharge(charge, input);
            if (solution.inRange) {
                solutions.push(solution);
            }
        }
    }
    
    // If no charges can reach the target, return error
    if (solutions.length === 0) {
        return [{
            inRange: false,
            error: 'Target distance out of range for all charges',
            minRange: Math.min(...shell.charges.map(c => c.minRange)),
            maxRange: Math.max(...shell.charges.map(c => c.maxRange))
        }];
    }
    
    // Sort by charge level (lowest first - preferred for accuracy)
    solutions.sort((a, b) => a.charge - b.charge);
    
    return solutions;
}

/**
 * Calculate firing solution for a specific charge
 * @private
 * @param {Object} charge - Charge configuration
 * @param {CalculatorInput} input - Calculation parameters
 * @returns {FiringSolution} Firing solution
 */
function calculateForCharge(charge, input) {
    const ballistics = interpolateFromTable(charge.rangeTable, input.distance, false);
    
    if (!ballistics) {
        return {
            inRange: false,
            error: 'Distance outside ballistic table range',
            charge: charge.level,
            minRange: charge.minRange,
            maxRange: charge.maxRange
        };
    }
    
    const correctedElevation = applyHeightCorrection(
        ballistics.elevation,
        input.heightDifference,
        ballistics.dElev
    );
    
    const correctedTOF = applyTOFCorrection(
        ballistics.tof,
        input.heightDifference,
        ballistics.tofPer100m || 0
    );
    
    const elevationCorrection = input.heightDifference !== 0 
        ? ballistics.elevation - correctedElevation 
        : 0;
    
    const tofCorrection = input.heightDifference !== 0 && ballistics.tofPer100m
        ? correctedTOF - ballistics.tof
        : 0;
    
    const mortarType = input.mortarType || (input.mortarId.startsWith('RUS') ? 'RUS' : 'US');
    const elevationDegrees = milsToDegrees(correctedElevation, mortarType);
    const azimuthMils = calculateAzimuthMils(input.bearing, mortarType);
    
    return {
        inRange: true,
        charge: charge.level,
        elevation: Math.round(correctedElevation),
        elevationPrecise: parseFloat(correctedElevation.toFixed(2)),
        elevationCorrection: parseFloat(elevationCorrection.toFixed(2)),
        dElev: Math.round(ballistics.dElev || 0),
        elevationDegrees: parseFloat(elevationDegrees.toFixed(1)),
        azimuth: parseFloat(input.bearing.toFixed(1)),
        azimuthMils: Math.round(azimuthMils),
        timeOfFlight: parseFloat(correctedTOF.toFixed(1)),
        tofCorrection: parseFloat(tofCorrection.toFixed(1)),
        tofPer100m: ballistics.tofPer100m || 0,
        minRange: charge.minRange,
        maxRange: charge.maxRange,
        trajectoryType: correctedElevation > 800 ? 'high' : 'low'
    };
}

/**
 * Calculate firing solution
 * 
 * @param {CalculatorInput} input - Calculation parameters
 * @returns {FiringSolution} Complete firing solution
 * 
 * @example
 * const solution = calculate({
 *   distance: 1250,
 *   heightDifference: -45,
 *   bearing: 67.5,
 *   mortarId: "RUS",
 *   shellType: "HE"
 * });
 */
function calculate(input) {
    validateInput(input);
    
    const { mortar, shell } = getWeaponConfig(input.mortarId, input.shellType);
    
    const charge = input.chargeLevel !== undefined
        ? shell.charges.find(c => c.level === input.chargeLevel)
        : findOptimalCharge(shell.charges, input.distance);
    
    if (!charge) {
        return {
            inRange: false,
            error: 'Target distance out of range for all charges',
            minRange: Math.min(...shell.charges.map(c => c.minRange)),
            maxRange: Math.max(...shell.charges.map(c => c.maxRange))
        };
    }
    
    const ballistics = interpolateFromTable(charge.rangeTable, input.distance);
    
    if (!ballistics) {
        return {
            inRange: false,
            error: 'Distance outside ballistic table range',
            charge: charge.level,
            minRange: charge.minRange,
            maxRange: charge.maxRange
        };
    }
    
    const correctedElevation = applyHeightCorrection(
        ballistics.elevation,
        input.heightDifference,
        ballistics.dElev
    );
    
    const correctedTOF = applyTOFCorrection(
        ballistics.tof,
        input.heightDifference,
        ballistics.tofPer100m || 0
    );
    
    const elevationCorrection = input.heightDifference !== 0 
        ? ballistics.elevation - correctedElevation 
        : 0;
    
    const tofCorrection = input.heightDifference !== 0 && ballistics.tofPer100m
        ? correctedTOF - ballistics.tof
        : 0;
    
    const elevationDegrees = milsToDegrees(correctedElevation, input.mortarType);
    const azimuthMils = calculateAzimuthMils(input.bearing, input.mortarType);
    
    const solution = {
        inRange: true,
        charge: charge.level,
        elevation: Math.round(correctedElevation),
        elevationPrecise: parseFloat(correctedElevation.toFixed(2)),
        elevationCorrection: parseFloat(elevationCorrection.toFixed(2)),
        dElev: Math.round(ballistics.dElev || 0),
        elevationDegrees: parseFloat(elevationDegrees.toFixed(1)),
        azimuth: parseFloat(input.bearing.toFixed(1)),
        azimuthMils: Math.round(azimuthMils),
        timeOfFlight: parseFloat(correctedTOF.toFixed(1)),
        tofCorrection: parseFloat(tofCorrection.toFixed(1)),
        tofPer100m: ballistics.tofPer100m || 0,
        minRange: charge.minRange,
        maxRange: charge.maxRange
    };
    
    return solution;
}

/**
 * Generate trajectory points for visualization
 * @param {Array<FiringSolution>} solutions - Array of firing solutions
 * @param {number} distance - Horizontal distance in meters
 * @param {string} mortarType - 'RUS' or 'US' for mil conversion
 * @returns {Array<Object>} Array of trajectory series with {charge, elevDeg, tof, points: [{x, y}], color}
 */
function generateTrajectoryPoints(solutions, distance, mortarType) {
    if (!solutions || solutions.length < 2) {
        return [];
    }
    
    const colors = ['#4CAF50', '#FF9800', '#2196F3', '#F44336', '#9C27B0'];
    let allSeries = [];
    let globalMaxY = 0;
    const globalRange = distance;
    const g = 9.81;
    
    solutions.forEach((sol, i) => {
        if (!sol.inRange) return;
        
        const elevDeg = milsToDegrees(sol.elevation, mortarType);
        const elevRad = elevDeg * Math.PI / 180;
        
        // Solve v0 for level ground comparison
        const heightDiff = 0;
        const tanA = Math.tan(elevRad);
        const cosA = Math.cos(elevRad);
        const v0sq = (g * globalRange * globalRange) /
                    (2 * cosA * cosA * (globalRange * tanA - heightDiff));
        
        if (v0sq <= 0) return;
        const v0 = Math.sqrt(v0sq);
        
        const totalTime = sol.timeOfFlight;
        const numPoints = 120;
        let pts = [];
        
        for (let j = 0; j <= numPoints; j++) {
            const t = (j / numPoints) * totalTime;
            const x = v0 * Math.cos(elevRad) * t;
            const y = v0 * Math.sin(elevRad) * t - 0.5 * g * t * t;
            if (x > globalRange) break;
            
            pts.push({ x, y });
            if (y > globalMaxY) globalMaxY = y;
        }
        
        if (pts.length) {
            allSeries.push({
                charge: sol.charge,
                elevDeg: parseFloat(elevDeg.toFixed(1)),
                tof: sol.timeOfFlight,
                points: pts,
                color: colors[i % colors.length],
                maxY: Math.max(...pts.map(p => p.y))
            });
        }
    });
    
    return {
        series: allSeries,
        globalMaxY,
        globalRange
    };
}

// ============================================================================
// SECTION 6: Exports
// ============================================================================

// CommonJS (Node.js)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculate,
        calculateAllTrajectories,
        loadBallisticData,
        prepareInput,
        calculateDistance,
        calculateHorizontalDistance,
        calculateBearing,
        getWeaponConfig,
        getAllMortarTypes,
        getMilSystemConfig,
        findOptimalCharge,
        interpolateFromTable,
        applyHeightCorrection,
        applyTOFCorrection,
        degreesToMils,
        milsToDegrees,
        getMilSystemName,
        formatForField,
        generateTrajectoryPoints,
        parseGridToMeters,
        metersToGrid,
        parsePosition,
        applyFireCorrection,
        applyFireCorrectionFromObserver,
        generateFireForEffectPattern,
        generateCircularPattern,
        sortFFESolutionsByAzimuth
    };
}

// Browser global
if (typeof window !== 'undefined') {
    window.MortarCalculator = {
        calculate,
        calculateAllTrajectories,
        loadBallisticData,
        prepareInput,
        calculateDistance,
        calculateHorizontalDistance,
        calculateBearing,
        getWeaponConfig,
        getAllMortarTypes,
        getMilSystemConfig,
        findOptimalCharge,
        interpolateFromTable,
        applyHeightCorrection,
        applyTOFCorrection,
        degreesToMils,
        milsToDegrees,
        getMilSystemName,
        formatForField,
        generateTrajectoryPoints,
        parseGridToMeters,
        metersToGrid,
        parsePosition,
        applyFireCorrection,
        applyFireCorrectionFromObserver,
        generateFireForEffectPattern,
        generateCircularPattern,
        sortFFESolutionsByAzimuth
    };
}
