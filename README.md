# Arma Reforger Tools & Resources

Comprehensive toolset for Arma Reforger server management, map resources, and artillery calculations.

## Project Structure

```
ArmaReforger/
├── maps_core/              # Map metadata and elevation data
│   ├── all_arma_maps.json  # 23 maps configuration
│   ├── height_data/        # Elevation data (R2-hosted)
│   └── README.md
├── mortar_core/            # Artillery ballistics
│   ├── ballistic-data.json # Weapon ballistics database
│   ├── Arma Reforger Mortar Calc.ods
│   └── README.md
├── server_tools/           # Server management utilities
│   ├── mod_manager.py
│   ├── extract_mods_workshop.py
│   └── README.md
└── helper_scripts/         # Build and utility scripts
    ├── download_and_stitch_map.py
    ├── upload_to_r2.py
    └── ...
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
Calculate artillery fire solutions:

```python
import json

with open('mortar_core/ballistic-data.json') as f:
    ballistics = json.load(f)

# Get firing angle for M252 mortar at 1500m
m252_charge2 = ballistics['M252']['charges']['2']
target_range = 1500

if target_range <= m252_charge2['max_range']:
    angle_index = target_range - m252_charge2['min_range']
    firing_angle = m252_charge2['angles'][angle_index]
    print(f"Fire at {firing_angle}° elevation")
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
Complete ballistics data for:
- **M252** (US 81mm mortar) - 5 charge levels
- **2B14** (Soviet 82mm mortar) - 5 charge levels

Pre-calculated firing angles for every meter from minimum to maximum range.

## Development

### Helper Scripts
Build tools for working with Arma Reforger resources:

```bash
# Download and stitch map tiles (auto-detects zoom from JSON)
python helper_scripts/download_and_stitch_map.py seitenbuch
python helper_scripts/download_and_stitch_map.py arland everon  # Multiple maps
python helper_scripts/download_and_stitch_map.py --all           # All maps

# Upload files to Cloudflare R2 (with overwrite protection)
python helper_scripts/upload_to_r2.py --file map.png
python helper_scripts/upload_to_r2.py --file map.png --force    # Prompts for overwrite

# Update map URLs
python helper_scripts/add_r2_urls.py

# Test CDN accessibility
python helper_scripts/test_r2_urls.py
```

### Requirements
```bash
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pip install requests pillow boto3 botocore
```

### Environment Variables
For R2 uploads:
```bash
export R2_ACCOUNT_ID="your_account_id"
export R2_ACCESS_KEY_ID="your_access_key"
export R2_SECRET_ACCESS_KEY="your_secret_key"
```

## Documentation

- [Maps Core](maps_core/README.md) - Map metadata and elevation data
- [Mortar Core](mortar_core/README.md) - Artillery ballistics and calculators
- [Server Tools](server_tools/README.md) - Mod management utilities

## License

Tools and scripts are provided as-is for Arma Reforger community use.

Map imagery and game data remain property of Bohemia Interactive.
