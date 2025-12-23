# Mortar Core

**Live Calculator:** [https://armamortars.org](https://armamortars.org)

Mortar ballistics calculation engine for Arma Reforger artillery systems with grid coordinate support.

Part of the [ArmaReforger](../README.md) project.

## 🎯 Quick Start

### Web Calculator

Visit **[armamortars.org](https://armamortars.org)** for the online calculator, or open [index.html](index.html) locally.

**Features:**
- 🎯 Grid coordinate input (3-digit 10m & 4-digit 1m precision)
- 📏 Traditional meter coordinates
- 🔄 Toggle between input modes
- 📊 Trajectory visualization
- 🎨 Multiple firing solutions with comparison charts

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
- ✅ **Grid coordinates** - 3-digit (10m) and 4-digit (1m) precision
- ✅ **Coordinate-system independent** - Uses simple 3D positions or grid format
- ✅ **Height correction** - Automatic elevation adjustment
- ✅ **Automatic charge selection** - Or force specific charge
- ✅ **Trajectory visualization** - Generate trajectory points for SVG/Canvas rendering
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

// Convert positions to input (supports grid coordinates)
prepareInput(mortarPos, targetPos, mortarId, shellType)

// Grid coordinate utilities
parseGridToMeters(gridString) → {x, y}
metersToGrid(x, y, highPrecision) → gridString
parsePosition(position) → Position3D
```

### Grid Coordinate Examples

```javascript
// Using grid coordinates (3-digit = center of 10m square)
const solution = MortarCalculator.calculate(
    MortarCalculator.prepareInput(
        { grid: "047/069", z: 15 },  // Mortar at 475m/695m, elevation 15m
        { grid: "085/105", z: 25 },  // Target at 855m/1055m, elevation 25m
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