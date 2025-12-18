# Maps Core

Core map data and elevation information for all Arma Reforger maps.

Part of the [ArmaReforger](../README.md) project - tools and resources for Arma Reforger.

## Quick Start

**View maps in your browser:**
```bash
cd maps_core
python3 -m http.server 8000
# Open http://localhost:8000/map_viewer.html
```

**Generate tiles for offline/custom use:**
```bash
cd maps_core
python3 generate_tiles.py everon
```

## Tools

### `map_viewer.html`
Interactive web-based map viewer with Leaflet.js.

**Features:**
- 📍 Real-time North/East coordinate display
- 🗺️ Adaptive grid overlay (10m-1000m spacing)
- 🔍 Zoom-responsive grid (auto-scales with zoom level)
- 🎨 High-quality satellite imagery from CDN
- 🖱️ Smooth pan/zoom controls

**Grid Zoom Levels:**
- Zoom < -1: 1000m grid
- Zoom 0: 200m grid
- Zoom 1: 100m grid
- Zoom 2: 50m grid
- Zoom 3: 20m grid
- Zoom 4+: 10m grid

**Controls:**
- Select map from dropdown
- Toggle grid with "Show/Hide Grid" button
- Adjust grid spacing (10-1000m)
- Mouse position shows N/E coordinates

### `generate_tiles.py`
Generate tile pyramids from high-resolution map images.

**Usage:**
```bash
# Interactive mode (choose from list)
python3 generate_tiles.py

# By map namespace
python3 generate_tiles.py everon

# By index
python3 generate_tiles.py 0
```

**Output:**
```
tiles/
  └── everon/
      ├── 0/           # Zoom level 0 (most zoomed out)
      │   └── 0/
      │       └── 0.png
      ├── 1/           # Zoom level 1
      │   ├── 0/
      │   │   ├── 0.png
      │   │   └── 1.png
      │   └── 1/
      │       ├── 0.png
      │       └── 1.png
      └── ...
      └── 7/           # Zoom level 7 (max detail)
          └── ...      # 16,384 tiles (64×64 grid)
```

**Features:**
- Downloads from Cloudflare R2 CDN
- Progress tracking for large files (2.6GB+)
- Automatic power-of-2 padding for web compatibility
- Optimized 256×256 PNG tiles
- Complete zoom pyramid generation

**Requirements:**
- Python 3.7+
- Pillow: `pip install Pillow`
- requests: `pip install requests`

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

## Usage Examples

**View a specific map:**
1. Start local server: `python3 -m http.server 8000`
2. Open http://localhost:8000/map_viewer.html
3. Select map from dropdown
4. Enable grid for measurements
5. Hover mouse to see coordinates

**Programmatically load map data:**
```python
import json
from pathlib import Path

with open('maps_core/all_arma_maps.json') as f:
    maps = json.load(f)

everon = next(m for m in maps if m['namespace'] == 'everon')
print(f"Map: {everon['name']}, Size: {everon['size']}")
# Output: Map: Everon, Size: [12800, 12800]
```

**Work with elevation data:**
```python
import requests

url = "https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/height_data/everon_height.json"
heights = requests.get(url).json()

elevation = float(heights[100][100])  # Get elevation at grid (100, 100)
```

**Work with elevation data:**
```python
import requests

url = "https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/height_data/everon_height.json"
heights = requests.get(url).json()

# Get elevation at grid position (100, 100) - each grid = 10m
elevation = float(heights[100][100])
print(f"Elevation at 1000m N, 1000m E: {elevation}m")
```

## Technical Details

**Map Coordinate System:**
- 1 pixel = 1 meter (standard Arma Reforger scale)
- Origin (0,0) at top-left corner
- North increases downward (Y-axis)
- East increases rightward (X-axis)
- Coordinates displayed as North/East (e.g., "5000 / 3200")

**Tile Generation:**
- Source images up to 16384×16384 pixels (after padding)
- Padded to power-of-2 for web map compatibility
- 256×256 pixel tiles (standard web mapping)
- Zoom pyramid: Z0 (1 tile) to Z7 (4096 tiles)
- Output format: optimized PNG

**File Sizes:**
- Smallest map (Novka): ~50MB satellite image
- Largest map (Saigon): ~2.6GB satellite image
- Tile set: ~same size as source (distributed across files)

## Public CDN

All map satellite images are hosted on Cloudflare R2:
```
https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/{namespace}_sat_z{zoom}_full.png
```

Example:
```
https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/everon_sat_z7_full.png
```
