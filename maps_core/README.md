# Maps Core

Core map data and elevation information for all Arma Reforger maps.

Part of the [ArmaReforger](../README.md) project - tools and resources for Arma Reforger.

## Contents

### `all_arma_maps.json`
Master configuration file containing metadata for all 23 Arma Reforger maps:

**Structure:**
```json
{
  "max_zoom": 7,
  "name": "Everon",
  "namespace": "everon",
  "size": [12800, 12800],
  "resources": {
    "map_image": "https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/everon_sat_z7_full.png",
    "height_data": "https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/height_data/everon_height.json"
  }
}
```

**Fields:**
- `max_zoom`: Maximum zoom level for tile downloads (0-7)
- `name`: Display name of the map
- `namespace`: Unique identifier used in filenames and URLs
- `size`: Map dimensions in meters [width, height]
- `resources.map_image`: Public R2 CDN URL for full satellite image
- `resources.height_data`: R2 CDN URL for elevation JSON (if available)

### `height_data/`
Elevation data for maps (10m×10m grid resolution) hosted on Cloudflare R2.

**Available maps (10):**
- anizay, arland, everon, gogland, kolguev, kunar, saigon, takistan, zarichne, zimnitrita

**Access via CDN:**
```
https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/height_data/{namespace}_height.json
```

**Format:**
```json
[
  ["100.5", "101.2", "102.0", ...],
  ["99.8", "100.1", "100.5", ...],
  ...
]
```

Each JSON is a 2D array where:
- Rows represent north-south grid
- Columns represent east-west grid
- Values are elevation in meters (as strings)
- Grid resolution: 10m × 10m

## Map Statistics

**By Max Zoom:**
- Zoom 5: 2 maps (Kunar, Novka)
- Zoom 6: 8 maps (Arland, Bad Orb, Fallujah, Khanh Trung, Rooikat, Seitenbuch, Zarichne)
- Zoom 7: 13 maps (Everon, Kolguev, Anizay, Belleau, Gogland, Myccano, Nizla, Rostov, Ruha, Saigon, Serhiivka, Takistan, Udachne, Zimnitrita)

**Map Sizes:**
- Smallest: Novka (2900m × 2900m)
- Largest: Nizla Island, Saigon (17150m × 17150m)

## Usage

**Load map data:**
```python
import json
from pathlib import Path

with open('maps_core/all_arma_maps.json') as f:
    maps = json.load(f)

everon = next(m for m in maps if m['namespace'] == 'everon')
print(f"Map: {everon['name']}, Size: {everon['size']}")
```

**Load elevation data:**
```python
import requests

url = "https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/height_data/everon_height.json"
heights = requests.get(url).json()

elevation = float(heights[100][100])  # Get elevation at grid (100, 100)
```

## Public CDN

All map satellite images are hosted on Cloudflare R2:
```
https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/{namespace}_sat_z{zoom}_full.png
```

Example:
```
https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/everon_sat_z7_full.png
```
