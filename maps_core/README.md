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

### `engine.js`
Core map rendering engine for Leaflet-based map viewer.

**Features:**
- Coordinate conversion between game coordinates and Leaflet lat/lng
- Dynamic namespace configuration builder
- Corner function variants for different map padding strategies
- Height map data integration
- Map bounds calculation

**Public API:**
```javascript
// Access map configurations
engine.namespace          // Current active map namespace
engine.namespace_default  // Default map (everon)
engine.namespaces        // Object containing all loaded maps

// Core functions
engine.loadMapConfigs()           // Load from all_arma_maps.json (async)
engine.convertCoordinates(lng, lat, namespace)  // Game ↔ Leaflet conversion
engine.getBounds(namespace)       // Calculate map boundaries
engine.get(x, y)                 // Query elevation at coordinates
```

**Corner Function Types:**
- `corners_medium_padding`: Standard 30px padding (most maps)
- `corners_small_padding`: Minimal 5px padding
- `corners_large_padding`: Extended 35px padding
- `corners_minimal_padding`: No padding (exact map bounds)
- `corners_xlarge_padding`: Very large 50px padding
- And 3 additional specialized variants for specific maps

### `map_viewer.html`
Interactive web-based map viewer with Leaflet.js.

**Features:**
- 📍 Real-time North/East coordinate display
- 🗺️ Adaptive grid overlay (10m-1000m spacing)
- 🔍 Zoom-responsive grid (auto-scales with zoom level)
- � Tile-based rendering for optimal performance
- 🖱️ Smooth pan/zoom controls
- ⚠️ Inline error messages (no popups)

**Grid Zoom Levels:**
- Zoom < 1.5: 1000m grid
- Zoom 1.5-2.5: 500m grid
- Zoom 2.5-3.5: 200m grid
- Zoom 3.5-4.5: 100m grid
- Zoom 4.5-5.5: 50m grid
- Zoom 5.5-6.5: 20m grid
- Zoom 6.5+: 10m grid

**Controls:**
- Select map from dropdown
- Toggle grid with "Show/Hide Grid" button
- Adjust grid spacing (10-1000m)
- Mouse position shows N/E coordinates
- Error messages appear inline (top-right corner)

**Notes:**
- Requires tiles to be generated first (see `generate_tiles.py`)
- Uses local tile files from `tiles/` directory
- Custom CRS with proper coordinate scaling for non-power-of-2 maps
- Auto-detects missing tiles and displays helpful error messages

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
  └── everon_sat/      # Directory name includes _sat suffix
      ├── 0/           # Zoom level 0 (most zoomed out)
      │   └── 0/
      │       └── 0.webp
      ├── 1/           # Zoom level 1
      │   ├── 0/
      │   │   ├── 0.webp
      │   │   └── 1.webp
      │   └── 1/
      │       ├── 0.webp
      │       └── 1.webp
      └── ...
      └── 7/           # Zoom level 7 (max detail)
          └── ...      # 16,384 WebP tiles (128×128 grid)
```

**Features:**
- Downloads from Cloudflare R2 CDN with progress tracking for large files (2.6GB+)
- **User confirmation before deleting existing tiles** with tile count display
- Automatic power-of-2 padding for web compatibility
- Optimized 256×256 WebP tiles (90% quality, method 6)
- Complete zoom pyramid generation (Z0 to max_zoom)
- Smart tile directory naming with `_sat` suffix
- Resume capability (skips maps when tiles exist and user declines regeneration)

**Requirements:**
- Python 3.7+
- Pillow: `pip install Pillow`
- requests: `pip install requests`

## Contents

### `all_arma_maps.json`
Master configuration file containing metadata for all 23 Arma Reforger maps.

**Recent Updates (Dec 20, 2025):**
- Migrated map metadata from `engine.js` to centralized JSON
- Added `coordinate_transform` field (lng/lat coefficients and offsets)
- Added `corner_type` field referencing predefined corner function variants
- Added `webp` flag for tile format detection
- Added `has_metadata` flag for resource availability
- Added `earth_correction` for maps with specific projection requirements

**Structure:**
```json
{
  "name": "Everon",
  "namespace": "everon",
  "dir": "everon_sat",
  "size": [12800, 12800],
  "max_zoom": 7,
  "webp": true,
  "coordinate_transform": {
    "lng": {
      "cof": 51.2,
      "offset": -1.875
    },
    "lat": {
      "cof": -51.2,
      "offset": -250
    }
  },
  "corner_type": "corners_medium_padding",
  "has_metadata": true,
  "resources": {
    "map_image": "https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/everon_sat_z7_full.png",
    "height_data": "https://pub-65310bd5bcd44d68b30addfbacb31e51.r2.dev/height_data/everon_height.json"
  }
}
```

**Fields:**
- `name`: Display name of the map
- `namespace`: Unique identifier used in filenames and URLs
- `dir`: Source directory name (e.g., "everon_sat")
- `size`: Map dimensions in meters [width, height]
- `max_zoom`: Maximum zoom level for tile downloads (0-7)
- `webp`: Boolean flag indicating WebP tile format support
- `coordinate_transform`: Leaflet coordinate transformation parameters
  - `lng.cof`: Longitude coefficient for coordinate conversion
  - `lng.offset`: Longitude offset in pixels
  - `lat.cof`: Latitude coefficient (typically negative)
  - `lat.offset`: Latitude offset in pixels
- `corner_type`: Reference to predefined corner function variant (e.g., "corners_medium_padding")
  - Available types: medium_padding, small_padding, large_padding, minimal_padding, xlarge_padding, etc.
- `has_metadata`: Boolean indicating if additional metadata is available
- `earth_correction`: Optional field for maps requiring specific projection adjustments
- `resources.map_image`: Public R2 CDN URL for full satellite image
- `resources.height_data`: R2 CDN URL for elevation JSON (if available)

### `corner_mapping.json`
Reference file documenting the mapping between map namespaces and their corner function types.

**Purpose:**
- Documents which corner function variant each map uses
- Generated during metadata migration from engine.js
- Useful for understanding corner function distribution across maps

**Structure:**
```json
{
  "corners_medium_padding": ["everon", "kolguev", "gogland", ...],
  "corners_small_padding": ["arland", "bad_orb", ...],
  "corners_minimal_padding": ["seitenbuch"],
  ...
}
```

**Corner Function Distribution:**
- Most maps (13): `corners_medium_padding` - Standard 30px padding
- Small padding (4): `corners_small_padding` - 5px padding  
- Large variants (3): Various large padding configurations
- Specialized (3): Unique configurations for specific maps

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
- Non-square maps: Seitenbuch (4000m × 2000m), Udachne (10240m × 5120m)

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

**Map Viewer Implementation:**
- Custom Leaflet CRS based on L.CRS.Simple
- Dynamic scale function: `2^zoom * 256 / paddedSize`
- Grid coordinates scaled to match padded dimensions
- Tile bounds prevent negative coordinate requests
- View calculation handles non-square maps correctly

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
- Zoom pyramid: Z0 (1 tile) to Z7 (16,384 tiles for max zoom)
- Output format: WebP (90% quality, optimized compression)
- Directory naming: `tiles/{namespace}_sat/{z}/{x}/{y}.webp`

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
