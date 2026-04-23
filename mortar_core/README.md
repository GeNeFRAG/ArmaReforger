# ARMA REFORGER Ballistic Calculator

Ballistic calculation engine for Arma Reforger mortar and MLRS weapon systems.

## 🎯 Quick Reference

| Action | Input | Example |
|--------|-------|---------|
| Grid 3-digit | `047/069` | Center of 100m square (4750m, 6950m) |
| Grid 4-digit | `0475/0695` | Center of 10m square (4755m, 6955m) |
| Right correction | `+10` | Shift impact 10m right |
| Left correction | `-10` | Shift impact 10m left |
| Add range | `+20` | Increase range 20m (farther) |
| Drop range | `-20` | Decrease range 20m (closer) |

## Web Calculator

Visit **[armamortars.org](https://armamortars.org)** for the online calculator, or open [index.html](index.html) locally.

## 🚀 Features
- ✅ **Pure JavaScript** - No external dependencies
- ✅ **Framework-agnostic** - Works in Node.js and browsers
- ✅ **Multiple ballistic weapon systems** - Mortars (M252, 2B14), MLRS (SH BM-21, Integrity BM-21, Type-63) and Howitzers (D-30, M119)
- ✅ **Session sharing** - Share fire missions via URL with squad members
- ✅ **Persistent history** - Mission history survives browser refresh via localStorage
- ✅ **Real-time validation** - Instant format and range checking while typing
- ✅ **Dynamic range validation** - Updates when switching weapons or projectile types
- ✅ **Grid coordinates** - 3-digit (100m) and 4-digit (10m) precision
- ✅ **Coordinate-system independent** - Uses simple 3D positions or grid format
- ✅ **Height correction** - Automatic elevation adjustment with correction factors displayed (currently only for Mortars)
- ✅ **Fire correction** - Gun-Target or Observer-Target line adjustments
- ✅ **Fire for Effect** - Multiple pattern types for Mortars and Howitzers (Lateral/Linear sheaf, Circular saturation)
- ✅ **Automatic Mortar charge selection** - Or force specific charge
- ✅ **Optimal projectile suggestions for MLRS and Howitzers** - Optional user override

## 📸 Screenshots
### Entering Grid coordinates in 10m precision:
<img width="926" height="938" alt="image" src="https://github.com/user-attachments/assets/86e1daf1-492c-4faf-8605-6fed7b0afed6" />

### Mission Cards with the calculated fire missions:
<img width="911" height="876" alt="image" src="https://github.com/user-attachments/assets/ca09b9a0-b413-4a29-bb7c-0e1ea7f79335" />

### Entering Fire Corrections:
<img width="844" height="345" alt="image" src="https://github.com/user-attachments/assets/c76ab49b-cbba-4bbf-a72c-7910961ada90" />

### New Mission Card after correction:
<img width="899" height="626" alt="image" src="https://github.com/user-attachments/assets/ac0b0dc0-8c12-4304-9368-502649b29578" />

### Select Fire for effect pattern for the corrected coordinates:
<img width="841" height="394" alt="image" src="https://github.com/user-attachments/assets/c04cf6c3-8ea1-418f-825b-46ff2ca62cab" />

### Fire for Effect sorted mission cards:
<img width="907" height="890" alt="image" src="https://github.com/user-attachments/assets/d3175d83-b81c-42df-9559-dd08c4263b94" />

## 📚 Documentation

- **[BallisticCalculator-API.md](BallisticCalculator-API.md)** - Complete API documentation
- **[examples/](examples/)** - Usage examples for Node.js, browser, and map integration


## 📦 Files

### Web Application

- **[index.html](index.html)** - Interactive web calculator with trajectory visualization

### Core Module

- **[BallisticCalculator.js](BallisticCalculator.js)** - Framework-agnostic calculation engine

### Data

- **[ballistic-data.json](ballistic-data.json)** - Ballistics database for all mortars

### Examples

- **[examples/node-example.js](examples/node-example.js)** - Node.js usage
- **[examples/trajectory-visualization.js](examples/trajectory-visualization.js)** - Terminal ASCII trajectory visualization
- **[examples/integration-with-engine.js](examples/integration-with-engine.js)** - Map engine integration

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
const solution = BallisticCalculator.calculate(
    BallisticCalculator.prepareInput(
        { grid: "047/069", z: 15 },  // Mortar at 4750m/6950m, elevation 15m
        { grid: "085/105", z: 25 },  // Target at 8550m/10550m, elevation 25m
        "US",
        "HE"
    )
);

// Using 4-digit grid (1m precision)
const input = BallisticCalculator.prepareInput(
    "0475/0695",  // Simple string format
    { grid: "0850/1050", z: 30 },
    "RUS",
    "HE"
);

// Conversion functions
BallisticCalculator.parseGridToMeters("047/069");  // → {x: 475, y: 695}
BallisticCalculator.metersToGrid(475, 695, false); // → "047/069"
BallisticCalculator.metersToGrid(475, 695, true);  // → "0475/0695"
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
const correctedTarget = BallisticCalculator.applyFireCorrection(
    mortarPos,          // {x: 4750, y: 6950, z: 15}
    targetPos,          // {x: 8550, y: 10500, z: 25}
    10,                 // Left/Right: +10 = Right 10m, -10 = Left 10m
    -20                 // Add/Drop: -20 = Add 20m (farther), +20 = Drop 20m (closer)
);
// Returns corrected position perpendicular (L/R) and along bearing (A/D)

// Forward Observer mode: Corrections along Observer-Target line
const result = BallisticCalculator.applyFireCorrectionFromObserver(
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
const lateralTargets = BallisticCalculator.generateFireForEffectPattern(
    mortarPos,
    targetPos,
    5,                  // Number of rounds
    50,                 // Spread distance (meters)
    'lateral'           // Pattern type
);

// Sort FFE solutions by azimuth for easier gun traverse (single direction)
const solutions = lateralTargets.map(target => 
    BallisticCalculator.calculate(BallisticCalculator.prepareInput(
        mortarPos, target, 'mortar_82mm', 'mortar_he'
    ))
);
const sortedSolutions = BallisticCalculator.sortFFESolutionsByAzimuth(solutions);
    mortarPos,          // {x: 4750, y: 6950, z: 15}
    targetPos,          // {x: 8550, y: 10500, z: 25}
    'perpendicular',    // Pattern type
    5,                  // Number of rounds
    50                  // Spacing in meters
);

// Circular pattern - 8 rounds evenly distributed around target
const circularTargets = BallisticCalculator.generateCircularPattern(
    targetPos,          // {x: 8550, y: 10500, z: 25}
    100,                // Radius in meters
    8                   // Number of rounds
);

// Calculate firing solution for each round
lateralTargets.forEach((pos, index) => {
    const input = BallisticCalculator.prepareInput(mortarPos, pos, "US", "HE");
    const solution = BallisticCalculator.calculate(input);
    console.log(`Round ${index + 1}: Elevation ${solution.elevation} mils`);
});
```

See **[BallisticCalculator-API.md](BallisticCalculator-API.md)** for complete documentation.

## 🎮 Supported Weapons

All weapon data is dynamically loaded from `ballistic-data.json`:

- **Weapon systems** - Automatically populated from data
- **Ammunition types** - Available shells per mortar type
- **Mil systems** - Warsaw Pact (6000 mils) vs NATO (6400 mils)
- **Ballistic tables** - Pre-calculated firing solutions
**Current weapons in database:**

### Mortars

| Weapon ID | Name | Caliber | Mil System | Shell Types |
|-----------|------|---------|------------|-------------|
| `M252` | US M252 | 81mm | NATO (6400) | HE, SMOKE, ILLUM |
| `2B14` | Soviet 2B14 | 82mm | Warsaw Pact (6000) | HE, SMOKE, ILLUM |

### MLRS

| Weapon ID | Name | Caliber | Projectile Types | Range |
|-----------|------|---------|------------------|-------|
| `SH_BM21` | [SH BM-21 Grad](https://reforger.armaplatform.com/workshop/6854D8DBA436768F-SH-BM21) | 122mm | HE | 0.2km - 5.8km |
| `INTEGRITY_BM21` | [Integrity BM-21 Grad](https://reforger.armaplatform.com/workshop/68DA62B40A976334-Integrity-BM-21Grad) | 122mm | 9M22M HE, 9M43 Smoke, 3M16 AP | 0.4km - 8.0km |
| `TYPE63` | [Type-63](https://reforger.armaplatform.com/workshop/611ABE2F73802440-WZTurrets) | 107mm | HE | 0.5km - 2.25km |

### Howitzers

| Weapon ID | Name | Caliber | Shell Types | Range |
|-----------|------|---------|-------------|-------|
| `D30` | [D-30](https://reforger.armaplatform.com/workshop/611ABE2F73802440-WZTurrets) | 122mm | HE | 0.8km - 4.8km |
| `M119` | [M119](https://reforger.armaplatform.com/workshop/611ABE2F73802440-WZTurrets) | 105mm | HE | 0.8km - 4.8km |

## 🛠️ Development

### Local Installation

```bash
git clone https://github.com/GeNeFRAG/ArmaReforger.git
cd ArmaReforger/mortar_core
open index.html  # macOS
start index.html # Windows

python3 -m http.server 8000  # Python
# or
npx http-server .            # Node.js

# Visit http://localhost:8000
```

### Node.js

```javascript
const BallisticCalculator = require('./BallisticCalculator');

// Load ballistic data
await BallisticCalculator.loadBallisticData('./ballistic-data.json');

// Mortar calculation
const mortarSolution = BallisticCalculator.calculate({
    distance: 1250,
    heightDifference: -45,
    bearing: 67.5,
    weaponId: "M252",
    shellType: "HE"
});

console.log(`Mortar: Charge ${mortarSolution.charge}, Elevation ${mortarSolution.elevation} mils`);

// MLRS calculation (SH BM-21)
const mlrsSolution = BallisticCalculator.calculate({
    distance: 3000,
    heightDifference: 50,
    bearing: 180,
    weaponId: "SH_BM21",
    shellType: "sh_122mm_he"
});

console.log(`MLRS: Elevation ${mlrsSolution.elevation} mils, TOF ${mlrsSolution.timeOfFlight}s`);
```

### Project Structure
```
mortar_core/
├── index.html              # Web calculator UI
├── BallisticCalculator.js  # Core calculation engine
├── ballistic-data.json     # Weapon ballistics database
├── ui_js/                  # UI modules (ES6)
│   ├── main.js            # Application initialization
│   ├── calculator.js      # Calculation UI logic
│   ├── corrections.js     # Fire correction system
│   ├── coord-manager.js   # Coordinate handling
│   ├── history.js         # Mission history
│   ├── share.js           # Session sharing (v2.7.0)
│   ├── ui.js              # UI helpers and validation
│   ├── state.js           # Global state management
│   ├── dom-cache.js       # DOM element caching
│   ├── ffe.js             # Fire for Effect patterns
│   ├── utils.js           # Utility functions
│   └── constants.js       # UI constants
└── examples/              # Usage examples
```

## 🌐 Compatibility

- **Browser:** Chrome, Firefox, Safari 12+, Edge
- **Node.js:** 12+

## 📝 Changelog

### v2.11.0 - Dead-Click UX Fixes (April 2026)
**Improvements:**
- ✅ **Coord-mode toggle** - Converted from non-interactive divs to `<button>` elements with `aria-pressed`, `:active` press feedback, and `:focus-visible` keyboard ring
- ✅ **Data preservation on mode switch** - Switching Grid ↔ Meters no longer wipes entered coordinates; values are restored when switching back
- ✅ **Disabled-button hints** - Clicking a disabled Compute or Apply Correction button now surfaces an `aria-live` status message explaining the blocker, auto-clearing after 3 s
- ✅ **Unified panel visibility** - All coordinate panels (mortar, target, observer) now use class-based `.active` toggling; eliminates stale inline-style conflicts
- ✅ **Button row alignment** - Fixed Compute Fire Mission button height misalignment caused by wrapper div margin inconsistency
- ✅ **Focus-visible outlines** - Inputs and selects now show a 2 px accent outline for keyboard users without affecting mouse users

**Fixes:**
- Removed duplicate coord-mode toggle click listeners (double reset per tap)
- `pointer-events: none` on `button:disabled` so wrapper div correctly intercepts dead clicks

### v2.9.0 - BM-21 Mod Support Rework (April 2026)
**Breaking Changes:**
- Replaced single `BM21` weapon ID with two mod-specific weapon systems
- Old `BM21` weapon ID is no longer valid; use `SH_BM21` or `INTEGRITY_BM21`

**New Features:**
- ✅ **SH BM-21 Grad** - [SpearHead mod](https://reforger.armaplatform.com/workshop/6854D8DBA436768F-SH-BM21) support with 122mm HE (200-5800m)
- ✅ **Integrity BM-21 Grad** - [Integrity Gaming mod](https://reforger.armaplatform.com/workshop/68DA62B40A976334-Integrity-BM-21Grad) support with 3 rocket types: 9M22M HE, 9M43 Smoke, 3M16 Anti-Personnel
- ✅ **Weapon dropdown ordering** - Matches supported weapons list (Mortars, Howitzers, MLRS)

**Data Changes:**
- Removed old BM-21 ballistic data (no longer valid for any current mod)
- Removed unverified smoke/AP/AT mine projectile types
- Added verified ballistic tables from both workshop mods

**Fixes:**
- Closes [#7](https://github.com/GeNeFRAG/ArmaReforger/issues/7) - Add new ammunition for BM-21 mods

### v2.8.0 - Persistent Mission History (February 2026)
**New Features:**
- ✅ **localStorage persistence** - Mission history survives browser refresh
- ✅ **Auto-save on every change** - Add, delete, and clear operations persist automatically
- ✅ **Graceful error handling** - Quota exceeded or private browsing falls back to in-memory
- ✅ **Date reconstruction** - Timestamps preserved correctly across sessions
- ✅ **Core Web Vitals tests** - New e2e test suite for LCP, INP, and CLS metrics

**Module Updates:**
- `history.js` v2.6.0 - Added localStorage persistence functions
- `main.js` v1.9.0 - Calls `restoreHistoryFromStorage()` on init

### v2.7.0 - Session Sharing (February 2026)
**New Features:**
- ✅ **Share fire missions via URL** - Generate shareable links for squad coordination
- ✅ **Import from URL** - Paste shared links to load mission data instantly
- ✅ **FO-friendly workflow** - Share inputs before calculation for forward observer use case
- ✅ **Complete session capture** - Includes positions, weapon, shell type, corrections, FFE, and observer data
- ✅ **Compact URL format** - Base64-encoded JSON with abbreviated keys
- ✅ **Clipboard integration** - One-click copy with modern API and legacy fallback
- ✅ **Automatic validation** - Multi-layer checks for data integrity and range limits
- ✅ **Grid/meters mode support** - Preserves coordinate format across sharing

**Architecture Improvements:**
- ✅ Centralized state management - All state now in `state.js` (DRY refactor)
- ✅ Eliminated duplicate constants - Single source of truth in `constants.js`
- ✅ Consistent display utilities - Using `setDisplay()` throughout
- ✅ Fixed `isLoadingFromHistory` bug - Was checking wrong variable scope

**Module Updates:**
- `share.js` v1.1.0 - Session sharing implementation
- `state.js` v2.5.0 - Added FO mode and loading flags
- `history.js` v2.5.0 - Uses state management
- `ui.js` v2.6.0 - Integrated share feature
- `constants.js` v1.8.0 - Added SHARE_CONSTANTS

### v2.6.0 - WZ_Turrets Integration (January 2026)
**New Features:**
- ✅ DM-30 and M119 support with two ballistic curves for high or low angle shots
- ✅ Type-62 MLRS support with two ballistic curves for high or low angle shots

### v2.4.0 - MLRS Integration (January 2026)

**New Features:**
- ✅ BM-21 Grad MLRS support (replaced in v2.9.0 with mod-specific variants)
- ✅ Projectile dropdown grouped by rocket model
- ✅ Range display in projectile dropdown (e.g., "9M22 HE Medium (9800-13200m)")
- ✅ Dynamic range validation - updates when switching weapons or projectiles
- ✅ Custom weapon ordering - M252 first, then 2B14, then MLRS systems

**Architecture Improvements:**
- ✅ Generic variable naming - `weaponPos`/`weaponId` instead of `mortarPos`/`mortarId`
- ✅ System type detection - Automatic MLRS vs mortar feature toggling
- ✅ FFE disabled for MLRS - Fire for Effect only available for mortars
- ✅ Fire corrections disabled for MLRS - Tactical feature specific to mortars
- ✅ Mission history shows weapon and projectile names instead of IDs

**Bug Fixes:**
- ✅ Fixed range validation not updating on weapon/projectile change
- ✅ Fixed stale calculation data when switching weapons
- ✅ Fixed `mortarType` property references - updated to `weaponId`
- ✅ Fixed async race condition in weapon dropdown update

### v2.3.3 - Mobile Input Hotfix (January 2026)

**Bug Fixes:**
- Fixed fire correction inputs on mobile devices
- Issue: iOS/Android numeric keyboards didn't show minus sign
- Solution: Changed `inputmode="numeric"` to `inputmode="text"`
- Users can now enter negative values (Left/Drop corrections) on mobile
- Input validation still enforces numeric-only with optional +/- prefix

### v2.3.2 - Architectural Cleanup (January 2026)

**Phase 3: Remove State.foModeEnabled**
- Removed cached FO mode state - checkbox is single source of truth
- Eliminated circular sync between checkbox and State module
- Simplified state management across all modules

**Phase 2: Fix Grid Coordinate Precision**
- Enhanced `State.originalTargetPos` structure to preserve raw grid values
- Now stores: `{meters: {x,y,z}, mode: 'grid'|'meters', gridX: '060', gridY: '123'}`
- Fixes 3-digit vs 4-digit precision loss (060 stays 060 on correction undo)

**Phase 1: Remove State.lastObserverPos**
- Removed redundant observer position caching
- Observer coordinates now only in DOM and history snapshots
- Cleaner single-source-of-truth architecture

**UI Enhancements:**
- Added "Corrected Az/El" display to correction impact panel
- Shows before/after azimuth and elevation in mils and degrees

**Architecture Benefits:**
- ✅ DOM inputs: Source of truth for all user state
- ✅ State module: Only for calculation-specific state (corrections, charges)
- ✅ Grid precision: 3-digit and 4-digit formats preserved exactly
- ✅ No circular sync bugs between DOM and State
- ✅ Simplified mental model - read DOM when needed, don't cache
- ✅ Backward compatible with old history entries

### v1.6.0 - Forward Observer Mode (2024)
- Added FO mode with observer position inputs
- Corrections along Observer-Target line instead of Gun-Target line
- Visual OT/GT bearing comparison display

### v1.4.0 - Separate Grid Inputs & Validation (2024)
- Separate X/Y input fields for grid coordinates
- Real-time format and range validation
- Improved error messages with examples
- Clean DRY architecture with constants and helpers

## 📄 License

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Credits

- **Ballistic data** extracted from Arma Reforger game files
- **F.I.S.T Community** for testing and feedback

## 🔗 Links

- **Live:** [armamortars.org](https://armamortars.org)
- **Discord:** [F.I.S.T Community](http://discord.gg/Gb8Nt92J3m)
- **GitHub:** [GeNeFRAG/ArmaReforger](https://github.com/GeNeFRAG/ArmaReforger)
