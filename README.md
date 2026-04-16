# Arma Reforger Tools & Resources

**Live Arma Reforger Ballistic Mission Planner:** [https://armamortars.org](https://armamortars.org)

Comprehensive toolset for Arma Reforger server management, map resources, and ballistic calculations.

## Project Structure

```
ArmaReforger/
├── maps_core/              # Map metadata and elevation data
│   ├── all_arma_maps.json  # 23 maps configuration
│   └── height_data/        # Elevation data (R2-hosted)
├── mortar_core/               # Artillery ballistics
│   ├── BallisticCalculator.js # Core calculation engine
│   ├── ballistic-data.json    # Weapon ballistics database
│   ├── index.html             # Web calculator
│   └── ui_js/                 # UI modules
└── server_tools/           # Server management utilities
    ├── mod_manager.py
    ├── extract_mods_workshop.py
    └── deep_clone_server.py
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
Calculate ballistic fire missions:

**Arma Reforger Ballistic Mission Planner:** [armamortars.org](https://armamortars.org)

**Features:**
- 🎯 Supports Arma Reforger Mortars, Howitzers and MLRS weapon systems
- 🔗 Session sharing - Share fire missions via URL with squad members
- 👁️ Forward Observer (FO) Mode - corrections from observer's perspective
- 🎯 Separate X/Y grid inputs with real-time validation
- 🔥 Fire correction system (Gun-Target or Observer-Target line)
- 💥 Fire for Effect patterns (Lateral/Linear sheaf, Circular saturation)
- 📐 Input validation with range checking (-500 to +500m corrections)

```javascript
const BallisticCalculator = require('./BallisticCalculator');

// Load ballistic data from JSON
await BallisticCalculator.loadBallisticData('./ballistic-data.json');

// Get all available mortars
const mortars = BallisticCalculator.getAllMortarTypes();
// [{id: "2B14", name: "Soviet 2B14 82mm Mortar", caliber: 82}, ...]

// Using grid coordinates (3-digit or 4-digit)
const solution = BallisticCalculator.calculate(
    BallisticCalculator.prepareInput(
        { grid: "047/069", z: 15 },  // Mortar position
        { grid: "085/105", z: 25 },  // Target position
        "M252",
        "HE"
    )
);

// Or using traditional meters
const solution2 = BallisticCalculator.calculate({
    distance: 1500,
    heightDifference: 0,
    bearing: 45,
    weaponId: "2B14",
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

### Ballistic Weapon Systems
Comprehensive ballistics database with dynamic loading:

**Weapons:**

**Mortars**
- **2B14** (Soviet 82mm) - 5 charge levels, HE/SMOKE/ILLUM shells, Warsaw Pact (6000 mils)
- **M252** (US 81mm) - 5 charge levels, HE/ILLUM/SMOKE shells, NATO (6400 mils)

**Howitzers** (WarZone mod)
- **D-30** (122mm) - 2 ammo types: HE High Angle and HE Low Angle
- **M119** (105mm) - 2 ammo types: HE High Angle and HE Low Angle

**MLRS**
- **Integrity BM-21 Grad** (122mm) - 3 ammo types (HE with different braking ring configurations)
- **SH BM-21 Grad** (122mm) - 1 ammo type (HE)
- **Type-63** (WarZone mod, 107mm) - 2 ammo types: HE High Angle and HE Low Angle

## Documentation

- [BallisticCalculator API](BallisticCalculator-API.md) - Complete API reference for developers
