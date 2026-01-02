# Arma Reforger Tools & Resources

**Live Mortar Calculator:** [https://armamortars.org](https://armamortars.org) **v1.6.0**

Comprehensive toolset for Arma Reforger server management, map resources, and artillery calculations with grid coordinate support, real-time validation, and Forward Observer mode.

## Project Structure

```
ArmaReforger/
├── maps_core/              # Map metadata and elevation data
│   ├── all_arma_maps.json  # 23 maps configuration
│   ├── height_data/        # Elevation data (R2-hosted)
│   └── README.md
├── mortar_core/            # Artillery ballistics
│   ├── MortarCalculator.js # Core calculation engine
│   ├── ballistic-data.json # Weapon ballistics database
│   ├── index.html          # Web calculator
│   ├── ui_js/              # UI modules
│   └── README.md
└── server_tools/           # Server management utilities
    ├── mod_manager.py
    ├── extract_mods_workshop.py
    └── README.md
```

## Quick Start

### Maps Core
Access satellite imagery and elevation data for all 23 Arma Reforger maps:

```python
import json
import requests

# Load map metadata
with open('maps_core/all_arma_maps.json') as f:
    maps = json.load(f)

everon = next(m for m in maps if m['namespace'] == 'everon')

# Map image URL (public CDN)
print(everon['resources']['map_image'])
# https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/everon_sat_z7_full.png

# Height data URL (if available)
if 'height_data' in everon['resources']:
    heights = requests.get(everon['resources']['height_data']).json()
    elevation = float(heights[100][100])
```

### Mortar Core
Calculate artillery fire solutions with grid coordinates, Forward Observer mode, and fire corrections:

**Web Calculator:** [armamortars.org](https://armamortars.org)

**Features:**
- 👁️ Forward Observer (FO) Mode - corrections from observer's perspective
- 🎯 Separate X/Y grid inputs with real-time validation
- 🔥 Fire correction system (Gun-Target or Observer-Target line)
- 💥 Fire for Effect patterns (Lateral/Linear sheaf, Circular saturation)
- 📐 Input validation with range checking (-500 to +500m corrections)

```javascript
const MortarCalculator = require('./MortarCalculator');

// Load ballistic data from JSON
await MortarCalculator.loadBallisticData('./ballistic-data.json');

// Get all available mortars
const mortars = MortarCalculator.getAllMortarTypes();
// [{id: "RUS", name: "Russian 82mm Mortar", caliber: 82}, ...]

// Using grid coordinates (3-digit or 4-digit)
const solution = MortarCalculator.calculate(
    MortarCalculator.prepareInput(
        { grid: "047/069", z: 15 },  // Mortar position
        { grid: "085/105", z: 25 },  // Target position
        "US",
        "HE"
    )
);

// Or using traditional meters
const solution2 = MortarCalculator.calculate({
    distance: 1500,
    heightDifference: 0,
    bearing: 45,
    mortarId: "RUS",
    shellType: "HE"
});

if (solution.inRange) {
    console.log(`Charge: ${solution.charge}`);
    console.log(`Elevation: ${solution.elevation} mils (${solution.elevationDegrees}°)`);
    console.log(`Azimuth: ${solution.azimuthMils} mils`);
}
```

### Server Tools
Extract and compare mod configurations:

```bash
# Extract Steam Workshop mod metadata
python server_tools/extract_mods_workshop.py 123456789 --verbose

# Compare mods between two BattleMetrics servers
python server_tools/mod_manager.py <server_id_1> <server_id_2>
```

## Resources

### Maps (23 total)
All map satellite images and metadata are publicly accessible via Cloudflare R2 CDN:
- **Base URL:** `https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/`
- **Map images:** `{namespace}_sat_z{zoom}_full.png`
- **Height data:** `height_data/{namespace}_height.json` (10 maps available)

**Available maps:**
Everon, Arland, Kolguev, Anizay, Bad Orb, Belleau Wood, Fallujah, Gogland, Khanh Trung, Kunar, Myccano, Nizla Island, Novka, Rooikat 89, Rostov, Ruha, Saigon, Seitenbuch, Serhiivka, Takistan, Udachne, Zarichne, Zimnitrita

### Map Features
- **High-resolution satellite imagery** (zoom levels 5-7)
- **Elevation data** (10m × 10m grid, JSON format)
- **Dimensions:** From 2,900m × 2,900m (Novka) to 17,150m × 17,150m (Nizla, Saigon)
- **CDN-hosted:** Fast global access via Cloudflare R2

### Artillery Systems
Comprehensive ballistics database with dynamic loading:

**Mortars:**
- **2B14** (Russian 82mm) - 5 charge levels, HE/SMOKE/ILLUM shells, Warsaw Pact (6000 mils)
- **M252** (US 81mm) - 5 charge levels, HE shells, NATO (6400 mils)

**Features:**
- Pre-calculated firing tables for every 50m increment
- Height correction for elevated/depressed targets
- Automatic charge selection for optimal accuracy
- Multiple trajectory solutions per target
- Dynamic mil system conversion (6000 vs 6400)

**Extensible:** Add new weapons by updating `ballistic-data.json` - no code changes required.

## Documentation

- [Maps Core](maps_core/README.md) - Map metadata and elevation data
- [Mortar Core](mortar_core/README.md) - Artillery ballistics and web calculator
- [MortarCalculator API](mortar_core/MortarCalculator-API.md) - Complete API reference for developers
- [Server Tools](server_tools/README.md) - Mod management utilities
