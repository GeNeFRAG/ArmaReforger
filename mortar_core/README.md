# Mortar Core

Mortar ballistics calculation data and tools for Arma Reforger artillery systems.

## Contents

### `ballistic-data.json`
Comprehensive ballistics database for all artillery weapons in Arma Reforger.

**Structure:**
```json
{
  "M252": {
    "charges": {
      "0": {
        "velocity": 70,
        "min_range": 75,
        "max_range": 1583,
        "angles": [...]
      },
      "1": { ... },
      ...
    }
  }
}
```

**Fields:**
- Weapon name (e.g., "M252", "2B14")
- Charge levels (0-4 depending on weapon)
- Velocity: Muzzle velocity in m/s
- Min/Max range: Effective range in meters
- Angles: Pre-calculated firing angles for each meter of range

**Supported Weapons:**
- M252 (US 81mm mortar)
- 2B14 (Soviet 82mm mortar)

### `Arma Reforger Mortar Calc.ods`
OpenDocument Spreadsheet for interactive fire solution calculations.

**Features:**
- Range and bearing calculations
- Charge selection optimization
- Elevation angle computation
- Time of flight estimation
- Multiple target tracking

## Usage

### Load Ballistics Data

```python
import json

with open('mortar_core/ballistic-data.json') as f:
    ballistics = json.load(f)

m252_charge2 = ballistics['M252']['charges']['2']
print(f"Velocity: {m252_charge2['velocity']} m/s")
print(f"Range: {m252_charge2['min_range']}-{m252_charge2['max_range']}m")
```

### Calculate Firing Angle

```python
target_range = 1500  # meters
charge = '2'

if target_range <= m252_charge2['max_range']:
    angle_index = target_range - m252_charge2['min_range']
    firing_angle = m252_charge2['angles'][angle_index]
    print(f"Fire at {firing_angle}° elevation")
```

## Ballistics Formula

The firing angles are calculated using projectile motion physics:

```
Range = (v² × sin(2θ)) / g
```

Where:
- v = muzzle velocity (m/s)
- θ = firing angle (degrees)
- g = gravity (9.81 m/s²)

For each charge level, angles are pre-computed for every meter from min to max range.

## Data Sources

- Official Arma Reforger game files
- Community testing and validation
- Real-world ballistics tables (M252/2B14)

## Contributing

To add new weapon systems:
1. Extract velocity data from game files
2. Calculate angle table using ballistics formula
3. Validate with in-game testing
4. Update `ballistic-data.json`
