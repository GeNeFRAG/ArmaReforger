# Ballistic Calculator API Documentation

## Overview

`BallisticCalculator.js` is a framework-agnostic ballistic calculation engine for Arma Reforger mortars and MLRS systems. It provides pure calculation functionality without any UI dependencies, making it suitable for use in Node.js applications, browsers, or integration with existing mapping tools.

## Features

- ✅ Pure JavaScript - no external dependencies
- ✅ Framework-agnostic - works in Node.js and browsers
- ✅ **Multi-system support** - Mortars and MLRS with automatic feature detection
- ✅ Coordinate-system independent - uses simple 3D positions
- ✅ **Grid coordinate support** - 3-digit (100m) and 4-digit (10m) precision
- ✅ **Forward Observer mode** - Corrections along Observer-Target line (mortar only)
- ✅ **Fire correction system** - Gun-Target or Observer-Target line adjustments (mortar only)
- ✅ **Fire for Effect patterns** - Lateral/Linear sheaf, Circular saturation (mortar only)
- ✅ **FFE sorting** - Sort FFE solutions by azimuth for optimal gun traverse
- ✅ Comprehensive JSDoc type definitions
- ✅ Height correction support
- ✅ Automatic charge selection
- ✅ **Dynamic weapon data loading** - all ballistics from JSON
- ✅ **Extensible** - add new weapons without code changes
- ✅ **Multiple mil systems** - Warsaw Pact (6000) and NATO (6400)

## Installation

### Node.js

```bash
# Copy BallisticCalculator.js to your project
cp BallisticCalculator.js /path/to/your/project/
```

### Browser

```html
<script src="path/to/BallisticCalculator.js"></script>
```

## Quick Start

```javascript
const BallisticCalculator = require('./BallisticCalculator');

// 1. Load ballistic data
await BallisticCalculator.loadBallisticData('./ballistic-data.json');

// 2. Calculate firing solution
const solution = BallisticCalculator.calculate({
    distance: 1250,           // meters
    heightDifference: -45,    // meters (negative = target lower)
    bearing: 67.5,            // degrees (0 = North)
    weaponId: "2B14",         // Soviet 2B14 82mm mortar
    shellType: "HE"           // High Explosive
});

// 3. Use the solution
if (solution.inRange) {
    console.log(`Charge: ${solution.charge}`);
    console.log(`Elevation: ${solution.elevation} mils (${solution.elevationDegrees}°)`);
    console.log(`Azimuth: ${solution.azimuth}° (${solution.azimuthMils} mils)`);
    console.log(`Time of Flight: ${solution.timeOfFlight}s`);
}
```

## API Reference

### Main Functions

#### `loadBallisticData(dataSource)`

Load ballistic data from a JSON file or object.

**Parameters:**
- `dataSource` (string|Object) - Path to JSON file or data object

**Returns:**
- `Promise<Object>` - Loaded ballistic data

**Example:**
```javascript
// From file (Node.js)
await BallisticCalculator.loadBallisticData('./ballistic-data.json');

// From object
await BallisticCalculator.loadBallisticData({
    mortarTypes: [/* ... */]
});

// From URL (Browser)
await BallisticCalculator.loadBallisticData('/data/ballistic-data.json');
```

---

#### `calculate(input)`

Calculate firing solution for a target.

**Parameters:**
- `input` (CalculatorInput) - Calculation parameters

**CalculatorInput Type:**
```javascript
{
    distance: number,          // Horizontal distance in meters
    heightDifference: number,  // Target height - weapon height (meters)
    bearing: number,           // Azimuth angle in degrees (0-360)
    weaponId: string,          // Weapon ID (e.g., "2B14", "M252", "BM21_GRAD")
    shellType: string,         // Shell/projectile type (e.g., "HE", "SMOKE", "9M22_he_frag_medium_range")
    chargeLevel?: number       // Optional: Force specific charge (0-4 for mortars, 0 for MLRS)
}
```

**Returns:**
- `FiringSolution` - Complete firing solution

**FiringSolution Type:**
```javascript
{
    inRange: boolean,            // Can target be engaged
    charge: number,              // Selected charge level (0-4)
    elevation: number,           // Gun elevation in mils (rounded to integer)
    elevationPrecise: number,    // Gun elevation in mils (2 decimal places)
    elevationCorrection: number, // Height correction applied in mils (2 decimal places)
    dElev: number,               // Elevation correction factor per 100m height (integer)
    elevationDegrees: number,    // Gun elevation in degrees (1 decimal place)
    azimuth: number,             // Azimuth in degrees (1 decimal place)
    azimuthMils: number,         // Azimuth in mils (rounded to integer)
    timeOfFlight: number,        // Projectile flight time in seconds (1 decimal place)
    tofCorrection: number,       // Time of flight correction applied in seconds (2 decimal places)
    tofPer100m: number,          // TOF correction factor per 100m height (2 decimal places)
    minRange: number,            // Minimum range for this charge (meters)
    maxRange: number,            // Maximum range for this charge (meters)
    error?: string               // Error message if not in range
}
```

**Example:**
```javascript
const solution = BallisticCalculator.calculate({
    distance: 800,
    heightDifference: 25,
    bearing: 135,
    mortarId: "US",
    shellType: "SMOKE"
});

if (solution.inRange) {
    console.log(`Fire mission ready!`);
} else {
    console.log(`Error: ${solution.error}`);
}
```

---

#### `getAllMortarTypes()`

Get all available mortar types from loaded ballistic data.

**Returns:**
- `Array<Object>` - Array of mortar type objects with `id`, `name`, and `caliber`

**Throws:**
- Error if ballistic data not loaded

**Example:**
```javascript
const mortars = BallisticCalculator.getAllMortarTypes();
mortars.forEach(m => {
    console.log(`${m.id}: ${m.name} (${m.caliber}mm)`);
});
// RUS: Russian 82mm Mortar (82mm)
// US: US M252 81mm Mortar (81mm)
```

---

#### `getMilSystemConfig(mortarType)`

Get mil system configuration for a mortar type.

**Parameters:**
- `mortarType` (string) - Mortar type ID (e.g., "RUS", "US")

**Returns:**
- `Object` - Mil system config with `name`, `milsPerCircle`, and `milsPerDegree`

**Example:**
```javascript
const milSystem = BallisticCalculator.getMilSystemConfig("RUS");
console.log(milSystem.name);  // "Warsaw Pact"
console.log(milSystem.milsPerCircle);  // 6000
console.log(milSystem.milsPerDegree);  // 16.6667
```

---

#### `prepareInput(weaponPos, targetPos, weaponId, shellType)`

Convert 3D positions or grid coordinates into calculator input.

**Parameters:**
- `weaponPos` (Position3D|string) - Weapon position (object or grid string like "047/069")
- `targetPos` (Position3D|string) - Target position (object or grid string like "058/071")
- `weaponId` (string) - Weapon ID (e.g., "M252", "2B14", "BM21_GRAD")
- `shellType` (string) - Shell/projectile type

**Position3D Type:**
```javascript
{
    x: number,  // X coordinate in meters
    y: number,  // Y coordinate in meters
    z: number   // Elevation in meters
}
```

**Grid String Format:**
- 3-digit format: `"047/069"` - 100m precision (center of square)
- 4-digit format: `"0475/0695"` - 10m precision

**Returns:**
- `CalculatorInput` - Ready for `calculate()`

**Example with meter coordinates:**
```javascript
const mortarPos = { x: 6400, y: 6400, z: 125 };
const targetPos = { x: 7650, y: 6350, z: 80 };

const input = BallisticCalculator.prepareInput(
    mortarPos, 
    targetPos, 
    "RUS", 
    "HE"
);

const solution = BallisticCalculator.calculate(input);
```

**Example with grid coordinates:**
```javascript
const input = BallisticCalculator.prepareInput(
    "047/069",    // Mortar at grid 047/069 (4750m, 6950m)
    "058/071",    // Target at grid 058/071 (5850m, 7150m)
    "US",
    "HE"
);

const solution = BallisticCalculator.calculate(input);
```

**Example with high-precision grid:**
```javascript
const input = BallisticCalculator.prepareInput(
    "0475/0695",  // Mortar at exact position
    "0584/0713",  // Target at exact position
    "RUS",
    "SMOKE"
);
```

---

#### `generateTrajectoryPoints(solutions, distance, mortarType)`

Generate trajectory points for visualization of firing solutions.

**Parameters:**
- `solutions` (Array<FiringSolution>) - Array of firing solutions from `calculate()` or `calculateAllTrajectories()`
- `distance` (number) - Target distance in meters
- `mortarType` (string) - Mortar type (e.g., "RUS", "US")

**Returns:**
- `TrajectoryData` - Complete trajectory data for visualization

**TrajectoryData Type:**
```javascript
{
  series: Array<{
    charge: number,           // Charge level
    elevDeg: number,         // Elevation in degrees
    tof: number,             // Time of flight in seconds
    points: Array<{x, y}>,   // Trajectory points (x: horizontal, y: height in meters)
    color: string,           // Suggested color for visualization
    maxY: number             // Maximum height of this trajectory
  }>,
  globalMaxY: number,        // Maximum height across all trajectories
  globalRange: number        // Maximum range
}
```

**Example:**
```javascript
const solutions = BallisticCalculator.calculateAllTrajectories(input);
const trajectoryData = BallisticCalculator.generateTrajectoryPoints(
    solutions, 
    input.distance, 
    input.mortarType
);

// Use for SVG, Canvas, or ASCII visualization
trajectoryData.series.forEach(traj => {
    console.log(`Charge ${traj.charge}: ${traj.points.length} points`);
    console.log(`  Max height: ${traj.maxY.toFixed(1)}m`);
});
```

---

#### `applyFireCorrection(mortarPos, targetPos, leftRight, addDrop)`

Apply fire corrections along Gun-Target line (standard mode).

**Parameters:**
- `mortarPos` (Position3D) - Mortar position `{ x, y, z }`
- `targetPos` (Position3D) - Original target position `{ x, y, z }`
- `leftRight` (number) - Lateral correction in meters (positive = right, negative = left)
- `addDrop` (number) - Range correction in meters (negative = add/farther, positive = drop/closer)

**Returns:**
- `Position3D` - Corrected target position `{ x, y, z }`

**Example:**
```javascript
const mortarPos = { x: 4750, y: 6950, z: 15 };
const targetPos = { x: 8550, y: 10500, z: 25 };

// Observer reports: "Right 10, Drop 20"
const correctedTarget = BallisticCalculator.applyFireCorrection(
    mortarPos,
    targetPos,
    10,    // Right 10 meters
    20     // Drop 20 meters (closer)
);
```

---

#### `applyFireCorrectionFromObserver(mortarPos, observerPos, targetPos, leftRight, addDrop)`

**NEW in v1.6.0** - Apply fire corrections from Forward Observer perspective (Observer-Target line).

Eliminates guesswork by applying corrections from the FO's actual line of sight instead of estimating Gun-Target corrections.

**When to use FO mode:**
- Observer position differs significantly from gun position
- Large angle between Observer-Target and Gun-Target lines
- More accurate than estimating GT corrections from OT perspective
- FO corrections are relative to their line of sight, not the gun's

**Parameters:**
- `mortarPos` (Position3D) - Mortar position (for final targeting)
- `observerPos` (Position3D) - Forward Observer position
- `targetPos` (Position3D) - Original target position
- `leftRight` (number) - Correction in meters from FO perspective (positive = right, negative = left)
- `addDrop` (number) - Range correction from FO perspective (negative = add/farther, positive = drop/closer)

**Returns:**
- `Object` - Result with corrected target and bearing information:
  ```javascript
  {
      correctedTarget: Position3D,  // New target position
      otBearing: number,            // Observer-Target bearing in degrees
      gtBearing: number,            // Gun-Target bearing in degrees  
      angleDiff: number             // Angle difference (GT - OT)
  }
  ```

**Example:**
```javascript
const mortarPos = { x: 475, y: 695, z: 10 };
const observerPos = { x: 600, y: 800, z: 15 };
const targetPos = { x: 855, y: 1055, z: 25 };

// FO reports: "Right 10, Add 20"
const result = BallisticCalculator.applyFireCorrectionFromObserver(
    mortarPos,
    observerPos,
    targetPos,
    10,    // Right 10m (from FO's perspective)
    -20    // Add 20m (farther from FO)
);

console.log(`OT Bearing: ${result.otBearing}°`);
console.log(`GT Bearing: ${result.gtBearing}°`);
console.log(`Angle Diff: ${result.angleDiff}°`);

// Use corrected target for fire mission
const input = BallisticCalculator.prepareInput(
    mortarPos,
    result.correctedTarget,
    "US",
    "HE"
);
const solution = BallisticCalculator.calculate(input);
```

**Why angle difference matters:**
- Small angle (<10°): Both methods produce similar results
- Medium angle (10-30°): FO mode recommended for better accuracy
- Large angle (>30°): FO mode essential - can differ by 40+ meters

**Typical FO Workflow:**
```javascript
// 1. Initial fire mission
const result1 = BallisticCalculator.applyFireCorrectionFromObserver(
    mortarPos, observerPos, targetPos, 0, 0
);
let solution = BallisticCalculator.calculate(
    BallisticCalculator.prepareInput(mortarPos, result1.correctedTarget, "M252", "HE")
);

// 2. FO reports: "Left 15, Add 30"
const result2 = BallisticCalculator.applyFireCorrectionFromObserver(
    mortarPos, observerPos, result1.correctedTarget, -15, -30
);
solution = BallisticCalculator.calculate(
    BallisticCalculator.prepareInput(mortarPos, result2.correctedTarget, "M252", "HE")
);

// 3. Continue iterative corrections from FO's perspective
```

---

#### `generateFireForEffectPattern(mortarPos, targetPos, patternType, numRounds, spacing)`

Generate linear Fire for Effect pattern positions for area saturation.

**Parameters:**
- `mortarPos` (Position3D) - Mortar position `{ x, y, z }`
- `targetPos` (Position3D) - Center target position `{ x, y, z }`
- `patternType` (string) - 'perpendicular' (lateral sheaf) or 'along-bearing' (linear sheaf)
- `numRounds` (number) - Number of rounds (3-10)
- `spacing` (number) - Spacing between rounds in meters

**Returns:**
- `Array<Position3D>` - Array of target positions for each round

**Pattern Types:**
- **'perpendicular' (Lateral Sheaf):** Rounds spread left-right perpendicular to line of fire
  - Best for: trenches, defensive lines, targets moving across your field of fire
- **'along-bearing' (Linear Sheaf):** Rounds spread in depth along line of fire
  - Best for: roads, convoys moving toward/away, area denial in depth

**Example:**
```javascript
const mortarPos = { x: 4750, y: 6950, z: 15 };
const targetPos = { x: 8550, y: 10500, z: 25 };

// Lateral sheaf: 5 rounds perpendicular to line of fire, 50m apart
const lateralTargets = BallisticCalculator.generateFireForEffectPattern(
    mortarPos,
    targetPos,
    'perpendicular',
    5,
    50
);

// Linear sheaf: 7 rounds along bearing, 40m apart
const linearTargets = BallisticCalculator.generateFireForEffectPattern(
    mortarPos,
    targetPos,
    'along-bearing',
    7,
    40
);

// Calculate firing solution for each round
lateralTargets.forEach((pos, index) => {
    const input = BallisticCalculator.prepareInput(mortarPos, pos, "M252", "HE");
    const solution = BallisticCalculator.calculate(input);
    console.log(`Round ${index + 1}: Az ${solution.azimuth}°, El ${solution.elevation} mils`);
});
```

---

#### `generateCircularPattern(targetPos, radius, numRounds)`

Generate circular pattern positions for area saturation around a point target.

**Parameters:**
- `targetPos` (Position3D) - Center target position `{ x, y, z }`
- `radius` (number) - Circle radius in meters (20-300m recommended)
- `numRounds` (number) - Number of rounds (3-12)

**Returns:**
- `Array<Position3D>` - Array of target positions evenly distributed around circle

**Pattern Distribution:**
- Rounds are evenly spaced around the circle
- 6 rounds = every 60° (recommended for balanced coverage)
- 8 rounds = every 45°
- 12 rounds = every 30° (dense saturation)

**Example:**
```javascript
const targetPos = { x: 8550, y: 10500, z: 25 };
const mortarPos = { x: 4750, y: 6950, z: 15 };

// 8 rounds in a circle, 100m radius
const circularTargets = BallisticCalculator.generateCircularPattern(
    targetPos,
    100,
    8
);

// Calculate firing solutions
const fireMission = circularTargets.map((pos, index) => {
    const input = BallisticCalculator.prepareInput(mortarPos, pos, "2B14", "HE");
    const solution = BallisticCalculator.calculate(input);
    return {
        roundNumber: index + 1,
        azimuth: solution.azimuth,
        elevation: solution.elevation,
        charge: solution.charge,
        timeOfFlight: solution.timeOfFlight
    };
});

console.log(`Fire for Effect: ${fireMission.length} rounds on target`);
fireMission.forEach(round => {
    console.log(`Round ${round.roundNumber}: Az ${round.azimuth}°, El ${round.elevation} mils, Charge ${round.charge}`);
});
```

---

#### `sortFFESolutionsByAzimuth(solutions)`

Sort Fire for Effect firing solutions by azimuth for easier gun traverse (single direction).

**Parameters:**
- `solutions` (Array<FiringSolution>) - Array of firing solutions to sort

**Returns:**
- `Array<FiringSolution>` - New array sorted by azimuth (ascending), with round numbers renumbered sequentially

**Use Case:**
When conducting Fire for Effect, gunners must traverse the gun between rounds. Sorting by azimuth allows the gunner to adjust in a single direction (clockwise) rather than swinging back and forth, improving speed and accuracy.

**Example:**
```javascript
const mortarPos = { x: 4750, y: 6950, z: 15 };
const targetPos = { x: 8550, y: 10500, z: 25 };

// Generate lateral sheaf pattern
const targets = BallisticCalculator.generateFireForEffectPattern(
    mortarPos, targetPos, 'perpendicular', 5, 50
);

// Calculate solutions for each target
const solutions = targets.map(target => 
    BallisticCalculator.calculate(
        BallisticCalculator.prepareInput(mortarPos, target, "US", "HE")
    )
);

// Sort by azimuth for optimal gun traverse
const sortedSolutions = BallisticCalculator.sortFFESolutionsByAzimuth(solutions);

// Display fire commands in optimal order
sortedSolutions.forEach((sol, idx) => {
    console.log(`Round ${idx + 1}: Az ${sol.azimuth}°, El ${sol.elevation} mils, Charge ${sol.charge}`);
});
// Output:
// Round 1: Az 52.3°, El 1245 mils, Charge 3
// Round 2: Az 54.1°, El 1238 mils, Charge 3
// Round 3: Az 56.8°, El 1229 mils, Charge 3
// Round 4: Az 58.4°, El 1224 mils, Charge 3
// Round 5: Az 60.2°, El 1218 mils, Charge 3
```

---

### Geometry Utilities

#### `calculateDistance(pos1, pos2)`

Calculate 3D distance between two positions.

**Parameters:**
- `pos1` (Position3D) - First position
- `pos2` (Position3D) - Second position

**Returns:**
- `number` - Distance in meters

**Example:**
```javascript
const distance = BallisticCalculator.calculateDistance(
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 100, z: 50 }
);
// Returns: 150
```

---

#### `calculateHorizontalDistance(pos1, pos2)`

Calculate horizontal distance (ignoring elevation).

**Parameters:**
- `pos1` (Position3D) - First position
- `pos2` (Position3D) - Second position

**Returns:**
- `number` - Horizontal distance in meters

**Example:**
```javascript
const distance = BallisticCalculator.calculateHorizontalDistance(
    { x: 0, y: 0, z: 0 },
    { x: 300, y: 400, z: 100 }
);
// Returns: 500 (ignores z difference)
```

---

#### `calculateBearing(pos1, pos2)`

Calculate bearing from pos1 to pos2.

**Parameters:**
- `pos1` (Position3D) - Origin position
- `pos2` (Position3D) - Target position

**Returns:**
- `number` - Bearing in degrees (0-360, where 0° = North)

**Example:**
```javascript
const bearing = BallisticCalculator.calculateBearing(
    { x: 0, y: 0, z: 0 },
    { x: 100, y: 0, z: 0 }
);
// Returns: 90 (East)
```

---

### Grid Coordinate Functions

#### `parseGridToMeters(gridString)`

Convert Arma Reforger grid coordinates to meter coordinates.

**Parameters:**
- `gridString` (string) - Grid coordinate string (e.g., "047/069", "047,069", "0475/0695", or "0475,0695")

**Returns:**
- `Object` - `{ x, y }` coordinates in meters

**Grid Format:**
- **3-digit format:** `"047/069"` or `"047,069"` represents a 100m×100m grid square
  - Converts to the center of the square (4750m, 6950m)
- **4-digit format:** `"0475/0695"` or `"0475,0695"` represents exact 10m precision
  - Converts to exact position (4750m, 6950m)
- **Delimiters:** Accepts both `/` (slash) and `,` (comma) as separators

**Example:**
```javascript
// 3-digit grid (100m precision) - returns center of square
const pos1 = BallisticCalculator.parseGridToMeters("047/069");
// Returns: { x: 4750, y: 6950 }

// Comma delimiter also supported
const pos1b = BallisticCalculator.parseGridToMeters("047,069");
// Returns: { x: 4750, y: 6950 }

// 4-digit grid (10m precision) - exact position
const pos2 = BallisticCalculator.parseGridToMeters("0584/0713");
// Returns: { x: 5840, y: 7130 }

// 4-digit with comma delimiter
const pos2b = BallisticCalculator.parseGridToMeters("0584,0713");
// Returns: { x: 5840, y: 7130 }

// Mixed precision
const pos3 = BallisticCalculator.parseGridToMeters("004/128");
// Returns: { x: 450, y: 12850 }
```

---

#### `metersToGrid(x, y, highPrecision = false)`

Convert meter coordinates to Arma Reforger grid format.

**Parameters:**
- `x` (number) - X coordinate in meters
- `y` (number) - Y coordinate in meters
- `highPrecision` (boolean) - Use 4-digit format (default: false for 3-digit)

**Returns:**
- `string` - Grid coordinate string

**Example:**
```javascript
// Convert to 3-digit grid (100m precision)
const grid1 = BallisticCalculator.metersToGrid(4750, 6950);
// Returns: "047/069"

// Convert to 4-digit grid (10m precision)
const grid2 = BallisticCalculator.metersToGrid(5840, 7130, true);
// Returns: "0584/0713"

// With decimals (rounds down)
const grid3 = BallisticCalculator.metersToGrid(478.6, 692.3, true);
// Returns: "0478/0692"
```

---

#### `parsePosition(position)`

Universal position parser - accepts grid strings, grid objects, or meter coordinates.

**Parameters:**
- `position` (string|Object) - Position in any format

**Accepted Formats:**
1. Grid string: `"047/069"` or `"0475/0695"`
2. Grid object: `{ grid: "047/069" }` or `{ grid: "047/069", z: 100 }`
3. Meter object: `{ x: 475, y: 695, z: 100 }`

**Returns:**
- `Object` - `{ x, y, z }` coordinates in meters (z defaults to 0)

**Example:**
```javascript
// All these produce the same result:
const pos1 = BallisticCalculator.parsePosition("047/069");
const pos2 = BallisticCalculator.parsePosition({ grid: "047/069" });
const pos3 = BallisticCalculator.parsePosition({ x: 475, y: 695 });
// All return: { x: 475, y: 695, z: 0 }

// With elevation
const pos4 = BallisticCalculator.parsePosition({ grid: "047/069", z: 125 });
// Returns: { x: 475, y: 695, z: 125 }

// High precision grid
const pos5 = BallisticCalculator.parsePosition("0584/0713");
// Returns: { x: 584, y: 713, z: 0 }
```

---

### Angle Conversion Utilities

#### `degreesToMils(degrees, weaponType)`

Convert degrees to mils using the weapon's specific mil system.

**Parameters:**
- `degrees` (number) - Angle in degrees
- `weaponType` (string) - Weapon type ID (e.g., "2B14", "M252", "BM21_GRAD")

**Returns:**
- `number` - Angle in mils (rounded to integer)

**Example:**
```javascript
// Warsaw Pact system (2B14): 6000 mils/circle
const mils2B14 = BallisticCalculator.degreesToMils(45, "2B14");
// Returns: 750 (45° × 16.6667 ≈ 750 mils)

// NATO system (M252): 6400 mils/circle
const milsM252 = BallisticCalculator.degreesToMils(45, "M252");
// Returns: 800 (45° × 17.7778 ≈ 800 mils)
```

---

#### `milsToDegrees(mils, weaponType)`

Convert mils to degrees using the weapon's specific mil system.

**Parameters:**
- `mils` (number) - Angle in mils
- `weaponType` (string) - Weapon type ID (e.g., "2B14", "M252", "BM21_GRAD")

**Returns:**
- `number` - Angle in degrees (2 decimal places)

**Example:**
```javascript
// Warsaw Pact system (2B14)
const degrees2B14 = BallisticCalculator.milsToDegrees(750, "2B14");
// Returns: 45.00

// NATO system (M252)
const degreesM252 = BallisticCalculator.milsToDegrees(800, "M252");
// Returns: 45.00
```

---

#### `getMilSystemName(weaponType)`

Get the mil system name and configuration for display purposes.

**Parameters:**
- `weaponType` (string) - Weapon type ID (e.g., "2B14", "M252", "BM21_GRAD")

**Returns:**
- `string` - Formatted mil system name with mils per circle

**Example:**
```javascript
const system2B14 = BallisticCalculator.getMilSystemName("2B14");
// Returns: "Warsaw Pact (6000 mils)"

const systemM252 = BallisticCalculator.getMilSystemName("M252");
// Returns: "NATO (6400 mils)"
```

---

#### `formatForField(solution)`

Format firing solution for field use with all angles in mils (gunner-friendly format).

**Parameters:**
- `solution` (FiringSolution) - Standard firing solution from `calculate()`

**Returns:**
- `Object` - Field-formatted solution:
  ```javascript
  {
      inRange: boolean,
      charge: number,
      elevation: number,        // In mils (rounded)
      azimuth: number,          // In mils (rounded)
      timeOfFlight: number,     // In seconds
      minRange: number,
      maxRange: number,
      elevationDegrees: number, // Reference only
      azimuthDegrees: number    // Reference only
  }
  ```

**Use Case:**
Gunners work exclusively in mils. This format removes the need to look at multiple angle formats.

**Example:**
```javascript
const solution = BallisticCalculator.calculate({
    distance: 800,
    heightDifference: 0,
    bearing: 45,
    mortarId: "US",
    shellType: "HE"
});

const fieldFormat = BallisticCalculator.formatForField(solution);
console.log(`Charge ${fieldFormat.charge}`);
console.log(`Elevation: ${fieldFormat.elevation} mils`);
console.log(`Azimuth: ${fieldFormat.azimuth} mils`);
console.log(`TOF: ${fieldFormat.timeOfFlight}s`);
// Output:
// Charge 2
// Elevation: 1245 mils
// Azimuth: 800 mils
// TOF: 12.5s
```

---

### Advanced Functions

#### `getWeaponConfig(mortarId, shellType)`

Get weapon configuration from ballistic data.

**Parameters:**
- `mortarId` (string) - Weapon ID
- `shellType` (string) - Shell type

**Returns:**
- `Object` - `{ mortar, shell }` configuration

**Throws:**
- Error if ballistic data not loaded
- Error if mortar ID or shell type not found

**Example:**
```javascript
const { mortar, shell } = BallisticCalculator.getWeaponConfig("RUS", "HE");
console.log(mortar.name);  // "Russian 82mm"
console.log(shell.charges.length);  // 5
```

---

#### `findOptimalCharge(charges, distance)`

Find smallest charge that can reach target distance.

**Parameters:**
- `charges` (Array) - Array of charge configurations
- `distance` (number) - Target distance in meters

**Returns:**
- `Object|null` - Selected charge or null if out of range

**Example:**
```javascript
const { shell } = BallisticCalculator.getWeaponConfig("RUS", "HE");
const charge = BallisticCalculator.findOptimalCharge(shell.charges, 800);
console.log(charge.level);  // 0, 1, 2, 3, or 4
```

---

#### `interpolateFromTable(rangeTable, distance)`

Interpolate elevation from ballistic range table.

**Parameters:**
- `rangeTable` (Array) - Ballistic table entries
- `distance` (number) - Target distance in meters

**Returns:**
- `Object|null` - `{ elevation, tof, dElev }` or null if out of range

---

#### `applyHeightCorrection(baseElevation, heightDifference, dElev)`

Apply height correction to base elevation.

**Parameters:**
- `baseElevation` (number) - Base elevation in mils
- `heightDifference` (number) - Height difference in meters (positive = target higher)
- `dElev` (number) - Change in elevation per unit

**Returns:**
- `number` - Corrected elevation in mils

---

## Supported Weapons

### Mortar Types

| ID | Name | Caliber | Nationality | System Type |
|----|------|---------|-------------|-------------|
| `2B14` | Soviet 2B14 | 82mm | Soviet | mortar |
| `M252` | US M252 | 81mm | United States | mortar |

### MLRS Types

| ID | Name | Caliber | Nationality | System Type |
|----|------|---------|-------------|-------------|
| `BM21_GRAD` | BM-21 Grad | 122mm | Soviet | mlrs |

**BM-21 Grad Projectile Types:**

| Projectile ID | Name | Type | Range (m) |
|---------------|------|------|----------|
| `9M22_he_frag_full_range` | 9M22 122mm HE | HE | 4600-16800 |
| `9M22_he_frag_short_range` | 9M22 122mm HE Large brake ring | HE | 1600-5200 |
| `9M22_he_frag_medium_range` | 9M22 122mm HE Small brake ring | HE | 2400-8000 |
| `9M43_smoke_full_range` | 9M43 122mm Smoke | Smoke | 4600-16800 |
| `9M43_smoke_short_range` | 9M43 122m Smoke Large brake ring | Smoke | 1600-5200 |
| `9M43_smoke_medium_range` | 9M43 122mm Smoke Small brake ring | Smoke | 2400-8000 |
| `3M16_ap_long_range` | 3M16 AP Remote Mines | AP | 3800-13400 |
| `3M16_ap_medium_range` | 3M16 AP Remote Mines Small brake ring | AP | 2000-7000 |
| `3M16_ap_short_range` | 3M16 AP Remote Mines Large brake ring | AP | 1400-4600 |
| `9M28K_at_standard` | 9M28K AT Remote Mines | AT | 3800-13200 |
| `9M28K_at_short_range` | 9M28K AT Remote Mines Large brake ring | AT | 1400-4600 |
| `9M28K_at_medium_range` | 9M28K AT Remote Mines Short brake ring | AT | 2000-7000 |

### Mil Systems

Each mortar type uses a specific mil system for angular measurements:

| Mortar | Mil System | Mils/Circle | Mils/Degree |
|--------|------------|-------------|-------------|
| `RUS` | Warsaw Pact | 6000 | 16.6667 |
| `US` | NATO | 6400 | 17.7778 |

Mil system configuration is loaded from `ballistic-data.json` and automatically used in all conversions.

### Shell Types

Shell type availability depends on weapon type and system:

**Mortar Shell Types:**

| Type | Description | 2B14 | M252 |
|------|-------------|------|------|
| `HE` | High Explosive | ✅ | ✅ |
| `SMOKE` | Smoke Round | ✅ | ✅ |
| `ILLUM` | Illumination | ✅ | ✅ |

**MLRS Projectile Types:**

See BM-21 Grad projectile table above. MLRS projectiles use specific IDs (e.g., `9M22_he_frag_medium_range`).

**System Type Detection:**

The calculator automatically detects weapon system type (`mortar` or `mlrs`) from the weapon configuration:
- **Mortars**: Support charge selection (0-4), FFE patterns, and fire corrections
- **MLRS**: Single charge (0), no FFE or fire corrections (tactical - rockets already provide area saturation)

Shell types are dynamically loaded from `ballistic-data.json` using `getWeaponConfig()`.
| `HE` | High Explosive | ✅ | ✅ |
| `SMOKE` | Smoke Round | ✅ | ✅ |
| `ILLUM` | Illumination | ✅ | ✅ |

Shell types are dynamically loaded from `ballistic-data.json` using `getWeaponConfig()`.

#### `calculateAllTrajectories(input)`

Calculate all possible trajectory solutions for different charge levels.

**Parameters:**
- `input` (CalculatorInput) - Calculation parameters

**Returns:**
- `Array<FiringSolution>` - Array of firing solutions for all valid charges

**Example (Mortar):**
```javascript
const solutions = BallisticCalculator.calculateAllTrajectories({
    distance: 800,
    heightDifference: 0,
    bearing: 45,
    weaponId: "2B14",
    shellType: "HE"
});

// Returns solutions for all charges that can reach the target
solutions.forEach(s => {
    console.log(`Charge ${s.charge}: ${s.elevation} mils, TOF ${s.timeOfFlight}s`);
});
```

**Example (MLRS):**
```javascript
// MLRS always returns single solution (charge 0)
const solutions = BallisticCalculator.calculateAllTrajectories({
    distance: 12000,
    heightDifference: 50,
    bearing: 180,
    weaponId: "BM21_GRAD",
    shellType: "9M22_he_frag_medium_range"
});

// Returns: [{ charge: 0, elevation: ..., ... }]
console.log(`Elevation: ${solutions[0].elevation} mils`);
console.log(`Range: ${solutions[0].minRange}m - ${solutions[0].maxRange}m`);
```

---

## MLRS-Specific Usage

### BM-21 Grad Rocket Selection

The BM-21 Grad has 13 different rocket types optimized for different ranges and effects. Choose the appropriate rocket based on target distance:

```javascript
// Short range target (3-10km)
const shortRange = BallisticCalculator.calculate({
    distance: 5000,
    heightDifference: 0,
    bearing: 90,
    weaponId: "BM21_GRAD",
    shellType: "9M22_he_frag_short_range"  // 2800-9800m
});

// Medium range target (10-13km)
const mediumRange = BallisticCalculator.calculate({
    distance: 11000,
    heightDifference: 0,
    bearing: 90,
    weaponId: "BM21_GRAD",
    shellType: "9M22_he_frag_medium_range"  // 9800-13200m
});

// Long range target (13-20km)
const longRange = BallisticCalculator.calculate({
    distance: 15000,
    heightDifference: 0,
    bearing: 90,
    weaponId: "BM21_GRAD",
    shellType: "9M22_he_frag_long_range"  // 13200-20380m
});

// Extra long range (20-40km) - cluster/incendiary only
const extraLong = BallisticCalculator.calculate({
    distance: 35000,
    heightDifference: 0,
    bearing: 90,
    weaponId: "BM21_GRAD",
    shellType: "9M28K_incendiary_extra_long_range"  // 30000-40000m
});
```

### MLRS Limitations

MLRS systems have different characteristics than mortars:

```javascript
// ❌ Fire corrections NOT supported for MLRS
// Rockets cannot be adjusted mid-flight like mortar rounds
try {
    BallisticCalculator.applyFireCorrection(
        weaponPos, targetPos, 10, -20
    );
    const input = BallisticCalculator.prepareInput(
        weaponPos, correctedTarget, "BM21_GRAD", "9M22_he_frag_medium_range"
    );
    // Will calculate, but tactically inappropriate - rockets are not precision weapons
} catch (error) {
    // Fire corrections designed for mortars
}

// ❌ Fire for Effect patterns NOT needed for MLRS
// BM-21 fires 40 rockets in 20 seconds - already provides area saturation
// generateFireForEffectPattern() is mortar-only

// ✅ Use MLRS for what it's designed for: rapid area saturation
const mlrsSolution = BallisticCalculator.calculate({
    distance: 12000,
    heightDifference: 0,
    bearing: 45,
    weaponId: "BM21_GRAD",
    shellType: "9M22_he_frag_medium_range"
});

console.log(`MLRS Fire Mission:`);
console.log(`Azimuth: ${mlrsSolution.azimuth}°`);
console.log(`Elevation: ${mlrsSolution.elevation} mils`);
console.log(`Time to target: ${mlrsSolution.timeOfFlight}s`);
console.log(`Note: Full salvo provides 40 rockets on target area`);
```

### Rocket Type Selection Guide

| Range | HE | Smoke | Cluster | Incendiary |
|-------|----|----|---------|------------|
| 3-10km | 9M22 Short | 9M43 Short | - | 9M28K Short |
| 10-13km | 9M22 Medium | 9M43 Medium | - | - |
| 13-20km | 9M22 Long | 9M43 Long | 3M16 Medium | 9M28K Medium |
| 20-30km | - | - | 3M16 Long/XL | 9M28K Long |
| 30-40km | - | - | 3M16 XL | 9M28K XL |

---

## Usage Examples

### Example 1: Simple Mortar Calculation

```javascript
const BallisticCalculator = require('./BallisticCalculator');

async function quickCalculation() {
    await BallisticCalculator.loadBallisticData('./ballistic-data.json');
    
    const solution = BallisticCalculator.calculate({
        distance: 950,
        heightDifference: -15,
        bearing: 220,
        weaponId: "2B14",
        shellType: "HE"
    });
    
    return solution;
}
```

### Example 2: Position-Based Calculation

```javascript
async function calculateFromPositions() {
    await BallisticCalculator.loadBallisticData('./ballistic-data.json');
    
    const mortar = { x: 5000, y: 5000, z: 100 };
    const target = { x: 5800, y: 5600, z: 85 };
    
    const input = BallisticCalculator.prepareInput(mortar, target, "M252", "SMOKE");
    const solution = BallisticCalculator.calculate(input);
    
    return solution;
}
```

### Example 3: Force Specific Charge

```javascript
const solution = BallisticCalculator.calculate({
    distance: 600,
    heightDifference: 0,
    bearing: 45,
    weaponId: "2B14",
    shellType: "HE",
    chargeLevel: 2  // Force charge 2
});
```

### Example 4: Trajectory Visualization

```javascript
const solutions = BallisticCalculator.calculateAllTrajectories(input);
const trajectoryData = BallisticCalculator.generateTrajectoryPoints(
    solutions,
    input.distance,
    input.weaponId
);

// Render to canvas
const canvas = document.getElementById('trajectory');
const ctx = canvas.getContext('2d');

trajectoryData.series.forEach(traj => {
    ctx.strokeStyle = traj.color;
    ctx.beginPath();
    
    traj.points.forEach((p, i) => {
        const x = (p.x / trajectoryData.globalRange) * canvas.width;
        const y = canvas.height - (p.y / trajectoryData.globalMaxY) * canvas.height;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    
    ctx.stroke();
});
```

### Example 5: Error Handling

```javascript
async function safeCalculation(input) {
    try {
        const solution = BallisticCalculator.calculate(input);
        
        if (!solution.inRange) {
            console.error(`Target out of range: ${solution.error}`);
            console.log(`Valid range: ${solution.minRange}m - ${solution.maxRange}m`);
            return null;
        }
        
        return solution;
    } catch (error) {
        console.error(`Calculation error: ${error.message}`);
        return null;
    }
}
```

### Example 6: MLRS Calculation

```javascript
async function mlrsFireMission() {
    await BallisticCalculator.loadBallisticData('./ballistic-data.json');
    
    const weaponPos = { x: 5000, y: 5000, z: 100 };
    const targetPos = { x: 17000, y: 15000, z: 120 };
    
    // Calculate distance to select appropriate rocket
    const distance = BallisticCalculator.calculateHorizontalDistance(weaponPos, targetPos);
    console.log(`Target distance: ${distance.toFixed(0)}m`);
    
    // Select rocket type based on distance
    let rocketType;
    if (distance < 9800) rocketType = "9M22_he_frag_short_range";
    else if (distance < 13200) rocketType = "9M22_he_frag_medium_range";
    else if (distance < 20380) rocketType = "9M22_he_frag_long_range";
    else {
        console.error("Target beyond HE rocket range - use cluster or incendiary");
        return;
    }
    
    const input = BallisticCalculator.prepareInput(
        weaponPos, 
        targetPos, 
        "BM21_GRAD", 
        rocketType
    );
    
    const solution = BallisticCalculator.calculate(input);
    
    if (solution.inRange) {
        console.log(`\nBM-21 Grad Fire Mission:`);
        console.log(`Rocket: ${rocketType}`);
        console.log(`Azimuth: ${solution.azimuth}° (${solution.azimuthMils} mils)`);
        console.log(`Elevation: ${solution.elevation} mils (${solution.elevationDegrees}°)`);
        console.log(`Time of Flight: ${solution.timeOfFlight}s`);
        console.log(`\nNote: Full salvo = 40 rockets covering ${solution.minRange}-${solution.maxRange}m`);
    }
    
    return solution;
}
```

## Integration with Map Systems

### Leaflet Integration

```javascript
// Convert Leaflet LatLng to game coordinates, then calculate
function calculateFromMap(map, mortarMarker, targetMarker) {
    const mortarLatLng = mortarMarker.getLatLng();
    const targetLatLng = targetMarker.getLatLng();
    
    // Convert to game coordinates (your conversion function)
    const mortarGame = convertToGameCoords(mortarLatLng);
    const targetGame = convertToGameCoords(targetLatLng);
    
    // Get heights from height map
    const mortarHeight = getHeightAt(mortarGame.x, mortarGame.y);
    const targetHeight = getHeightAt(targetGame.x, targetGame.y);
    
    const input = BallisticCalculator.prepareInput(
        { x: mortarGame.x, y: mortarGame.y, z: mortarHeight },
        { x: targetGame.x, y: targetGame.y, z: targetHeight },
        "M252",
        "HE"
    );
    
    return BallisticCalculator.calculate(input);
}
```

## Error Messages

### Calculation Errors

| Error | Meaning | Solution |
|-------|---------|----------|
| `Ballistic data not loaded` | `loadBallisticData()` not called | Call `loadBallisticData()` first |
| `Unknown weapon ID` | Invalid weapon ID | Use valid ID: "M252", "2B14", "BM21_GRAD" |
| `Unknown shell type` | Invalid shell/projectile type | Use valid type for weapon system |
| `Invalid distance` | Distance < 0 or undefined | Provide valid distance > 0 |
| `Bearing must be between 0 and 360` | Invalid bearing | Provide bearing 0-360 |
| `Target distance out of range` | Target too far/close | Check min/max range in solution |

### UI Validation Messages (Web Calculator)

| Field | Validation | Error Message |
|-------|------------|---------------|
| Grid X/Y | Format | "3 or 4 digits (e.g., 058, 0584)" |
| Grid coordinates | Parsing | "Grid coordinates must be 3 or 4 digits each (e.g., 058/071, 0584/0713)" |
| Meters X/Y | Range | "Value must be between 0 and 99999.9" |
| Left/Right correction | Range | Valid range: -500 to +500 meters |
| Add/Drop correction | Range | Valid range: -500 to +500 meters |
| Distance | Out of range | Shows min/max range for selected weapon |

