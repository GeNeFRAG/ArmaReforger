# Mortar Core

**Live Calculator:** [https://armamortars.org](https://armamortars.org)

Mortar ballistics calculation engine for Arma Reforger artillery systems with grid coordinate support.

Part of the [ArmaReforger](../README.md) project.

## 🎯 Quick Start

### Web Calculator

Visit **[armamortars.org](https://armamortars.org)** for the online calculator, or open [index.html](index.html) locally.

**Features:**
- 👁️ **Forward Observer (FO) Mode** - Apply corrections from observer's line of sight (v1.6.0)
  - Eliminates guesswork when FO and gun angles differ
  - Observer position inputs with auto mode synchronization
  - Visual OT/GT bearing comparison
  - State persistence across corrections
- 🎯 **Separate X/Y grid inputs** - Individual fields for grid X and Y coordinates (v1.4.0)
- ⚡ **Real-time validation** - Instant feedback while typing coordinates (v1.4.0+)
  - Format validation for grid inputs (3-4 digits)
  - Range validation with visual indicators
  - Distance display showing valid range
  - Observer fields optimized (no height field, no validation triggers)
- 🎯 Grid coordinate support (3-digit 100m & 4-digit 10m precision)
- 📏 Traditional meter coordinates
- 🔄 Toggle between input modes (auto-clears on switch)
- 🎯 Fire correction system (Gun-Target or Observer-Target line)
- 💥 Fire for Effect patterns (Lateral/Linear sheaf, Circular saturation)
- 📊 Trajectory visualization with comparison charts
- 🎨 Multiple firing solutions with charge options
- 📐 Height correction factors displayed (dElev, TOF per 100m)
- 🔴 Visual feedback for corrected values (red highlighting)
- 🔄 Auto-recalculation when toggling FFE on/off
- 📐 Sorted FFE rounds by azimuth for easier gun traverse
- 🎯 Unified fire mission display format
- 🔄 Reset button to clear all inputs and outputs
- 🧹 **Clean architecture** - DRY principles, helper functions, CSS classes (v1.4.0+)

### Node.js

```javascript
const MortarCalculator = require('./MortarCalculator');

// Load ballistic data
await MortarCalculator.loadBallisticData('./ballistic-data.json');

// Calculate firing solution
const solution = MortarCalculator.calculate({
    distance: 1250,
    heightDifference: -45,
    bearing: 67.5,
    mortarId: "RUS",
    shellType: "HE"
});

console.log(`Charge: ${solution.charge}, Elevation: ${solution.elevation} mils`);
```

## 📚 Documentation

- **[API.md](API.md)** - Complete API documentation
- **[examples/](examples/)** - Usage examples for Node.js, browser, and map integration


## 📦 Files

### Web Application

- **[index.html](index.html)** - Interactive web calculator with trajectory visualization

### Core Module

- **[MortarCalculator.js](MortarCalculator.js)** - Framework-agnostic calculation engine

### Data

- **`ballistic-data.json`** - Ballistics database for all mortars

### Examples

- **[examples/node-example.js](examples/node-example.js)** - Node.js usage
- **[examples/trajectory-visualization.js](examples/trajectory-visualization.js)** - Terminal ASCII trajectory visualization
- **[examples/integration-with-engine.js](examples/integration-with-engine.js)** - Map engine integration

## 🚀 Features

- ✅ **Pure JavaScript** - No external dependencies
- ✅ **Framework-agnostic** - Works in Node.js and browsers
- ✅ **Forward Observer Mode** - Corrections along Observer-Target line (v1.6.0)
- ✅ **Separate coordinate inputs** - Individual X/Y fields for grid coordinates (v1.4.0)
- ✅ **Real-time validation** - Instant format and range checking while typing (v1.4.0+)
- ✅ **Grid coordinates** - 3-digit (100m) and 4-digit (10m) precision
- ✅ **Coordinate-system independent** - Uses simple 3D positions or grid format
- ✅ **Height correction** - Automatic elevation adjustment with correction factors displayed
- ✅ **Transparent calculations** - Shows dElev and TOF per 100m correction factors
- ✅ **Fire correction** - Gun-Target or Observer-Target line adjustments
- ✅ **Fire for Effect** - Multiple pattern types (Lateral/Linear sheaf, Circular saturation)
- ✅ **Automatic charge selection** - Or force specific charge
- ✅ **Trajectory visualization** - Generate trajectory points for SVG/Canvas rendering
- ✅ **Military terminology** - NATO/US Army standard nomenclature (Azimuth, Range, Height)
- ✅ **Visual feedback** - Red highlighting for corrected fire solutions, colored borders for validation
- ✅ **State persistence** - FO mode and observer position saved across corrections (v1.6.0)
- ✅ **Clean architecture** - DRY principles, helper functions, CSS classes (v1.4.0+)
- ✅ **SEO optimized** - Fully discoverable on search engines

## 🔧 API Overview

### Main Functions

```javascript
// Load ballistic data
await loadBallisticData(dataSource)

// Calculate firing solution
calculate(input) → FiringSolution

// Calculate all trajectory options
calculateAllTrajectories(input) → Array<FiringSolution>

// Generate trajectory points for visualization
generateTrajectoryPoints(solutions, distance, mortarType) → TrajectoryData

// Apply fire correction (Gun-Target line)
applyFireCorrection(mortarPos, targetPos, leftRight, addDrop) → Position3D

// Apply fire correction from Forward Observer (Observer-Target line)
applyFireCorrectionFromObserver(mortarPos, observerPos, targetPos, leftRight, addDrop) → {correctedTarget, otBearing, gtBearing, angleDiff}

// Generate Fire for Effect patterns
generateFireForEffectPattern(mortarPos, targetPos, patternType, numRounds, spacing) → Array<Position3D>
generateCircularPattern(targetPos, radius, numRounds) → Array<Position3D>

// Convert positions to input (supports grid coordinates)
prepareInput(mortarPos, targetPos, mortarId, shellType)

// Grid coordinate utilities
parseGridToMeters(gridString) → {x, y}
metersToGrid(x, y, highPrecision) → gridString
parsePosition(position) → Position3D
```

### Grid Coordinate Examples

```javascript
// Using grid coordinates (3-digit = center of 100m square, 4-digit = center of 10m square)
const solution = MortarCalculator.calculate(
    MortarCalculator.prepareInput(
        { grid: "047/069", z: 15 },  // Mortar at 4750m/6950m, elevation 15m
        { grid: "085/105", z: 25 },  // Target at 8550m/10550m, elevation 25m
        "US",
        "HE"
    )
);

// Using 4-digit grid (1m precision)
const input = MortarCalculator.prepareInput(
    "0475/0695",  // Simple string format
    { grid: "0850/1050", z: 30 },
    "RUS",
    "HE"
);

// Conversion functions
MortarCalculator.parseGridToMeters("047/069");  // → {x: 475, y: 695}
MortarCalculator.metersToGrid(475, 695, false); // → "047/069"
MortarCalculator.metersToGrid(475, 695, true);  // → "0475/0695"
```

### Geometry Utilities

```javascript
calculateDistance(pos1, pos2)
calculateHorizontalDistance(pos1, pos2)
calculateBearing(pos1, pos2)

// FFE utilities
sortFFESolutionsByAzimuth(solutions)
```

### Fire Correction Examples

```javascript
// Standard mode: Corrections along Gun-Target line
const correctedTarget = MortarCalculator.applyFireCorrection(
    mortarPos,          // {x: 4750, y: 6950, z: 15}
    targetPos,          // {x: 8550, y: 10500, z: 25}
    10,                 // Left/Right: +10 = Right 10m, -10 = Left 10m
    -20                 // Add/Drop: -20 = Add 20m (farther), +20 = Drop 20m (closer)
);
// Returns corrected position perpendicular (L/R) and along bearing (A/D)

// Forward Observer mode: Corrections along Observer-Target line
const result = MortarCalculator.applyFireCorrectionFromObserver(
    mortarPos,          // {x: 4750, y: 6950, z: 15}
    observerPos,        // {x: 6000, y: 8000, z: 20}
    targetPos,          // {x: 8550, y: 10500, z: 25}
    10,                 // Right 10m (from observer's perspective)
    -20                 // Add 20m (farther from observer)
);
// Returns: {correctedTarget: {x, y, z}, otBearing: 45.0, gtBearing: 52.3, angleDiff: 7.3}
// FO mode eliminates guesswork when observer angle differs from gun angle
```

### Fire for Effect Example

```javascript
// Lateral sheaf - 5 rounds spread perpendicular to line of fire, 50m apart
const lateralTargets = MortarCalculator.generateFireForEffectPattern(
    mortarPos,
    targetPos,
    5,                  // Number of rounds
    50,                 // Spread distance (meters)
    'lateral'           // Pattern type
);

// Sort FFE solutions by azimuth for easier gun traverse (single direction)
const solutions = lateralTargets.map(target => 
    MortarCalculator.calculate(MortarCalculator.prepareInput(
        mortarPos, target, 'mortar_82mm', 'mortar_he'
    ))
);
const sortedSolutions = MortarCalculator.sortFFESolutionsByAzimuth(solutions);
    mortarPos,          // {x: 4750, y: 6950, z: 15}
    targetPos,          // {x: 8550, y: 10500, z: 25}
    'perpendicular',    // Pattern type
    5,                  // Number of rounds
    50                  // Spacing in meters
);

// Circular pattern - 8 rounds evenly distributed around target
const circularTargets = MortarCalculator.generateCircularPattern(
    targetPos,          // {x: 8550, y: 10500, z: 25}
    100,                // Radius in meters
    8                   // Number of rounds
);

// Calculate firing solution for each round
lateralTargets.forEach((pos, index) => {
    const input = MortarCalculator.prepareInput(mortarPos, pos, "US", "HE");
    const solution = MortarCalculator.calculate(input);
    console.log(`Round ${index + 1}: Elevation ${solution.elevation} mils`);
});
```

See **[API.md](API.md)** for complete documentation.

## 🎮 Supported Weapons

All weapon data is dynamically loaded from `ballistic-data.json`:

- **Mortar types** - Automatically populated from data
- **Shell types** - Available shells per mortar type
- **Mil systems** - Warsaw Pact (6000 mils) vs NATO (6400 mils)
- **Ballistic tables** - Pre-calculated firing solutions

**Current weapons in database:**

| Mortar ID | Name | Caliber | Mil System | Shell Types |
|-----------|------|---------|------------|-------------|
| `RUS` | Russian 82mm (2B14) | 82mm | Warsaw Pact (6000) | HE, SMOKE, ILLUM |
| `US` | US M252 | 81mm | NATO (6400) | HE, SMOKE, ILLUM |

To add new weapons, update `ballistic-data.json` - no code changes required.

## 🧪 Testing

```bash
npm install mocha
npx mocha tests/MortarCalculator.test.js
```

## 📊 Performance

- **Calculate:** ~0.1ms per calculation
- **Load Data:** ~10ms

## 🌐 Compatibility

- **Browser:** Chrome, Firefox, Safari 12+, Edge
- **Node.js:** 12+