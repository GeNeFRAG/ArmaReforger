# Mortar Calculator API Documentation

## Overview

`MortarCalculator.js` is a framework-agnostic ballistic calculation engine for Arma Reforger mortars. It provides pure calculation functionality without any UI dependencies, making it suitable for use in Node.js applications, browsers, or integration with existing mapping tools.

## Features

- ✅ Pure JavaScript - no external dependencies
- ✅ Framework-agnostic - works in Node.js and browsers
- ✅ Coordinate-system independent - uses simple 3D positions
- ✅ **Grid coordinate support** - 3-digit (10m) and 4-digit (1m) precision
- ✅ Comprehensive JSDoc type definitions
- ✅ Height correction support
- ✅ Automatic charge selection
- ✅ **Dynamic weapon data loading** - all ballistics from JSON
- ✅ **Extensible** - add new weapons without code changes
- ✅ **Multiple mil systems** - Warsaw Pact (6000) and NATO (6400)

## Installation

### Node.js

```bash
# Copy MortarCalculator.js to your project
cp MortarCalculator.js /path/to/your/project/
```

### Browser

```html
<script src="path/to/MortarCalculator.js"></script>
```

## Quick Start

```javascript
const MortarCalculator = require('./MortarCalculator');

// 1. Load ballistic data
await MortarCalculator.loadBallisticData('./ballistic-data.json');

// 2. Calculate firing solution
const solution = MortarCalculator.calculate({
    distance: 1250,           // meters
    heightDifference: -45,    // meters (negative = target lower)
    bearing: 67.5,            // degrees (0 = North)
    mortarId: "RUS",          // Russian 82mm
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
await MortarCalculator.loadBallisticData('./ballistic-data.json');

// From object
await MortarCalculator.loadBallisticData({
    mortarTypes: [/* ... */]
});

// From URL (Browser)
await MortarCalculator.loadBallisticData('/data/ballistic-data.json');
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
    heightDifference: number,  // Target height - mortar height (meters)
    bearing: number,           // Azimuth angle in degrees (0-360)
    mortarId: string,          // Weapon ID (e.g., "RUS", "US")
    shellType: string,         // Shell type (e.g., "HE", "SMOKE")
    chargeLevel?: number       // Optional: Force specific charge (0-4)
}
```

**Returns:**
- `FiringSolution` - Complete firing solution

**FiringSolution Type:**
```javascript
{
    inRange: boolean,          // Can target be engaged
    charge: number,            // Selected charge level (0-4)
    elevation: number,         // Gun elevation in mils
    elevationDegrees: number,  // Gun elevation in degrees
    azimuth: number,           // Azimuth in degrees
    azimuthMils: number,       // Azimuth in mils
    timeOfFlight: number,      // Projectile flight time in seconds
    minRange: number,          // Minimum range for this charge (meters)
    maxRange: number,          // Maximum range for this charge (meters)
    error?: string             // Error message if not in range
}
```

**Example:**
```javascript
const solution = MortarCalculator.calculate({
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
const mortars = MortarCalculator.getAllMortarTypes();
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
const milSystem = MortarCalculator.getMilSystemConfig("RUS");
console.log(milSystem.name);  // "Warsaw Pact"
console.log(milSystem.milsPerCircle);  // 6000
console.log(milSystem.milsPerDegree);  // 16.6667
```

---

#### `prepareInput(mortarPos, targetPos, mortarId, shellType)`

Convert 3D positions or grid coordinates into calculator input.

**Parameters:**
- `mortarPos` (Position3D|string) - Mortar position (object or grid string like "047/069")
- `targetPos` (Position3D|string) - Target position (object or grid string like "058/071")
- `mortarId` (string) - Weapon ID
- `shellType` (string) - Shell type

**Position3D Type:**
```javascript
{
    x: number,  // X coordinate in meters
    y: number,  // Y coordinate in meters
    z: number   // Elevation in meters
}
```

**Grid String Format:**
- 3-digit format: `"047/069"` - 10m precision (center of square)
- 4-digit format: `"0475/0695"` - 1m precision

**Returns:**
- `CalculatorInput` - Ready for `calculate()`

**Example with meter coordinates:**
```javascript
const mortarPos = { x: 6400, y: 6400, z: 125 };
const targetPos = { x: 7650, y: 6350, z: 80 };

const input = MortarCalculator.prepareInput(
    mortarPos, 
    targetPos, 
    "RUS", 
    "HE"
);

const solution = MortarCalculator.calculate(input);
```

**Example with grid coordinates:**
```javascript
const input = MortarCalculator.prepareInput(
    "047/069",    // Mortar at grid 047/069 (475m, 695m)
    "058/071",    // Target at grid 058/071 (585m, 715m)
    "US",
    "HE"
);

const solution = MortarCalculator.calculate(input);
```

**Example with high-precision grid:**
```javascript
const input = MortarCalculator.prepareInput(
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
const solutions = MortarCalculator.calculateAllTrajectories(input);
const trajectoryData = MortarCalculator.generateTrajectoryPoints(
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
const distance = MortarCalculator.calculateDistance(
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
const distance = MortarCalculator.calculateHorizontalDistance(
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
const bearing = MortarCalculator.calculateBearing(
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
- `gridString` (string) - Grid coordinate string (e.g., "047/069" or "0475/0695")

**Returns:**
- `Object` - `{ x, y }` coordinates in meters

**Grid Format:**
- **3-digit format:** `"047/069"` represents a 10m×10m grid square
  - Converts to the center of the square (475m, 695m)
- **4-digit format:** `"0475/0695"` represents exact 1m precision
  - Converts to exact position (475m, 695m)

**Example:**
```javascript
// 3-digit grid (10m precision) - returns center of square
const pos1 = MortarCalculator.parseGridToMeters("047/069");
// Returns: { x: 475, y: 695 }

// 4-digit grid (1m precision) - exact position
const pos2 = MortarCalculator.parseGridToMeters("0584/0713");
// Returns: { x: 584, y: 713 }

// Mixed precision
const pos3 = MortarCalculator.parseGridToMeters("004/128");
// Returns: { x: 45, y: 1285 }
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
// Convert to 3-digit grid (10m precision)
const grid1 = MortarCalculator.metersToGrid(475, 695);
// Returns: "047/069"

// Convert to 4-digit grid (1m precision)
const grid2 = MortarCalculator.metersToGrid(584, 713, true);
// Returns: "0584/0713"

// With decimals (rounds down)
const grid3 = MortarCalculator.metersToGrid(478.6, 692.3, true);
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
const pos1 = MortarCalculator.parsePosition("047/069");
const pos2 = MortarCalculator.parsePosition({ grid: "047/069" });
const pos3 = MortarCalculator.parsePosition({ x: 475, y: 695 });
// All return: { x: 475, y: 695, z: 0 }

// With elevation
const pos4 = MortarCalculator.parsePosition({ grid: "047/069", z: 125 });
// Returns: { x: 475, y: 695, z: 125 }

// High precision grid
const pos5 = MortarCalculator.parsePosition("0584/0713");
// Returns: { x: 584, y: 713, z: 0 }
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
const { mortar, shell } = MortarCalculator.getWeaponConfig("RUS", "HE");
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
const { shell } = MortarCalculator.getWeaponConfig("RUS", "HE");
const charge = MortarCalculator.findOptimalCharge(shell.charges, 800);
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

| ID | Name | Caliber | Nationality |
|----|------|---------|-------------|
| `RUS` | Russian 82mm | 82mm | Soviet/Russian |
| `US` | US M252 | 81mm | United States |

### Mil Systems

Each mortar type uses a specific mil system for angular measurements:

| Mortar | Mil System | Mils/Circle | Mils/Degree |
|--------|------------|-------------|-------------|
| `RUS` | Warsaw Pact | 6000 | 16.6667 |
| `US` | NATO | 6400 | 17.7778 |

Mil system configuration is loaded from `ballistic-data.json` and automatically used in all conversions.

### Shell Types

Shell type availability depends on mortar type:

| Type | Description | RUS | US |
|------|-------------|-----|----|
| `HE` | High Explosive | ✅ | ✅ |
| `SMOKE` | Smoke Round | ✅ | ❌ |
| `ILLUM` | Illumination | ✅ | ❌ |

Shell types are dynamically loaded from `ballistic-data.json` using `getWeaponConfig()`.

#### `calculateAllTrajectories(input)`

Calculate all possible trajectory solutions for different charge levels.

**Parameters:**
- `input` (CalculatorInput) - Calculation parameters

**Returns:**
- `Array<FiringSolution>` - Array of firing solutions for all valid charges

**Example:**
```javascript
const solutions = MortarCalculator.calculateAllTrajectories({
    distance: 800,
    heightDifference: 0,
    bearing: 45,
    mortarId: "RUS",
    shellType: "HE"
});

// Returns solutions for all charges that can reach the target
solutions.forEach(s => {
    console.log(`Charge ${s.charge}: ${s.elevation} mils, TOF ${s.timeOfFlight}s`);
});
```

---

## Usage Examples

### Example 1: Simple Calculation

```javascript
const MortarCalculator = require('./MortarCalculator');

async function quickCalculation() {
    await MortarCalculator.loadBallisticData('./ballistic-data.json');
    
    const solution = MortarCalculator.calculate({
        distance: 950,
        heightDifference: -15,
        bearing: 220,
        mortarId: "RUS",
        shellType: "HE"
    });
    
    return solution;
}
```

### Example 2: Position-Based Calculation

```javascript
async function calculateFromPositions() {
    await MortarCalculator.loadBallisticData('./ballistic-data.json');
    
    const mortar = { x: 5000, y: 5000, z: 100 };
    const target = { x: 5800, y: 5600, z: 85 };
    
    const input = MortarCalculator.prepareInput(mortar, target, "US", "SMOKE");
    const solution = MortarCalculator.calculate(input);
    
    return solution;
}
```

### Example 3: Force Specific Charge

```javascript
const solution = MortarCalculator.calculate({
    distance: 600,
    heightDifference: 0,
    bearing: 45,
    mortarId: "RUS",
    shellType: "HE",
    chargeLevel: 2  // Force charge 2
});
```

### Example 4: Trajectory Visualization

```javascript
const solutions = MortarCalculator.calculateAllTrajectories(input);
const trajectoryData = MortarCalculator.generateTrajectoryPoints(
    solutions,
    input.distance,
    input.mortarType
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
        const solution = MortarCalculator.calculate(input);
        
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
    
    const input = MortarCalculator.prepareInput(
        { x: mortarGame.x, y: mortarGame.y, z: mortarHeight },
        { x: targetGame.x, y: targetGame.y, z: targetHeight },
        "RUS",
        "HE"
    );
    
    return MortarCalculator.calculate(input);
}
```

## Error Messages

| Error | Meaning | Solution |
|-------|---------|----------|
| `Ballistic data not loaded` | `loadBallisticData()` not called | Call `loadBallisticData()` first |
| `Unknown mortar ID` | Invalid mortar ID | Use valid ID: "RUS", "US" |
| `Unknown shell type` | Invalid shell type | Use valid type: "HE", "SMOKE", "ILLUM" |
| `Invalid distance` | Distance < 0 or undefined | Provide valid distance > 0 |
| `Bearing must be between 0 and 360` | Invalid bearing | Provide bearing 0-360 |
| `Target distance out of range` | Target too far/close | Check min/max range in solution |

