#!/usr/bin/env python3
"""Generate map tiles from large satellite images for Leaflet.js"""

import json
import math
import sys
from pathlib import Path
from PIL import Image
#!/usr/bin/env python3
"""
Tile Generator for Arma Reforger Maps

This script downloads high-resolution satellite map images from Cloudflare R2
and generates a tile pyramid for efficient web-based map viewing.

Features:
- Downloads large (up to 2.6GB) PNG images with progress tracking
- Pads images to power-of-2 dimensions for proper web map tiling
- Generates zoom levels from 0 (most zoomed out) to max_zoom
- Creates 256x256 pixel tiles in standard {z}/{x}/{y}.png structure
- Supports interactive, namespace, or index-based map selection

Output Structure:
    tiles/{namespace}/{zoom}/{x}/{y}.png
    
Example:
    tiles/arland/6/32/45.png
    
Usage:
    # Interactive mode
    python3 generate_tiles.py
    
    # By namespace
    python3 generate_tiles.py everon
    
    # By index (from all_arma_maps.json)
    python3 generate_tiles.py 0
"""

import requests
from io import BytesIO

# Disable decompression bomb protection for large game maps
Image.MAX_IMAGE_PIXELS = None

TILE_SIZE = 256

def download_image(url):
    """Download image from URL with progress tracking.
    
    Args:
        url: CDN URL of the satellite map image
        
    Returns:
        PIL.Image: Loaded image object ready for processing
        
    Note:
        Displays download progress as percentage and file size in GB.
        Handles large files (2.6GB+) with streaming download.
    """
    print(f"Downloading {url}...")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    total_size = int(response.headers.get('content-length', 0))
    if total_size > 0:
        print(f"File size: {total_size / (1024**3):.2f} GB")
    
    content = BytesIO()
    downloaded = 0
    
    for chunk in response.iter_content(chunk_size=8192):
        if chunk:
            content.write(chunk)
            downloaded += len(chunk)
            if total_size > 0:
                percent = (downloaded / total_size) * 100
                print(f"\rProgress: {percent:.1f}%", end='', flush=True)
    
    print("\nDownload complete! Loading image...")
    content.seek(0)
    return Image.open(content)

def generate_tiles(image, map_name, max_zoom, output_dir):
    """Generate tile pyramid for all zoom levels.
    
    Args:
        image: PIL.Image object of the source map
        map_name: Namespace of the map (e.g., 'everon', 'arland')
        max_zoom: Maximum zoom level (highest detail)
        output_dir: Base directory for tile output (creates tiles/{map_name}/...)
        
    Process:
        1. Pads image to next power-of-2 dimensions
        2. For each zoom level (0 to max_zoom):
           - Scales image appropriately
           - Divides into 256x256 tiles
           - Saves tiles as PNG with optimization
        3. Creates directory structure: {z}/{x}/{y}.png
        
    Note:
        Zoom 0 = most zoomed out (entire map in few tiles)
        Max zoom = highest detail (original resolution)
    """
    width, height = image.size
    print(f"Original image size: {width}x{height}")
    
    # Pad image to next power of 2 if needed
    max_dim = max(width, height)
    next_power = 1 << (max_dim - 1).bit_length()  # Find next power of 2
    
    if max_dim != next_power:
        print(f"Padding image to {next_power}x{next_power} for proper tiling...")
        padded = Image.new('RGB', (next_power, next_power), (0, 0, 0))
        padded.paste(image, (0, 0))
        image = padded
        width, height = next_power, next_power
    
    print(f"Tiling with size: {width}x{height}")
    
    # Create output directory
    map_dir = output_dir / map_name
    map_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate tiles for each zoom level
    for zoom in range(max_zoom + 1):
        print(f"Generating zoom level {zoom}...")
        zoom_dir = map_dir / str(zoom)
        zoom_dir.mkdir(exist_ok=True)
        
        # Calculate scale for this zoom level
        scaled_width = width // (2 ** (max_zoom - zoom))
        scaled_height = height // (2 ** (max_zoom - zoom))
        
        # Resize image for this zoom level
        if zoom < max_zoom:
            scaled_img = image.resize((scaled_width, scaled_height), Image.Resampling.LANCZOS)
        else:
            scaled_img = image
        
        # Calculate number of tiles
        cols = math.ceil(scaled_width / TILE_SIZE)
        rows = math.ceil(scaled_height / TILE_SIZE)
        
        print(f"  Creating {cols}x{rows} = {cols*rows} tiles...")
        
        # Generate tiles
        tile_count = 0
        total_tiles = cols * rows
        
        for col in range(cols):
            col_dir = zoom_dir / str(col)
            col_dir.mkdir(exist_ok=True)
            
            for row in range(rows):
                # Calculate tile bounds
                x1 = col * TILE_SIZE
                y1 = row * TILE_SIZE
                x2 = min(x1 + TILE_SIZE, scaled_width)
                y2 = min(y1 + TILE_SIZE, scaled_height)
                
                # Extract tile
                tile = scaled_img.crop((x1, y1, x2, y2))
                
                # If tile is smaller than TILE_SIZE, pad it
                if tile.size != (TILE_SIZE, TILE_SIZE):
                    padded = Image.new('RGB', (TILE_SIZE, TILE_SIZE), (0, 0, 0))
                    padded.paste(tile, (0, 0))
                    tile = padded
                
                # Save tile
                tile_path = col_dir / f"{row}.png"
                tile.save(tile_path, 'PNG', optimize=True)
                
                tile_count += 1
                if tile_count % 100 == 0:
                    print(f"\r  Progress: {tile_count}/{total_tiles} tiles", end='', flush=True)
        
        print(f"\r  Completed: {tile_count}/{total_tiles} tiles")
        
        # Clean up scaled image
        if zoom < max_zoom:
            scaled_img.close()

def find_map_by_namespace(maps, namespace):
    """Find map configuration by namespace identifier.
    
    Args:
        maps: List of map dictionaries from all_arma_maps.json
        namespace: Map identifier (e.g., 'everon', 'arland')
        
    Returns:
        dict: Map configuration if found, None otherwise
    """
    for map_data in maps:
        if map_data['namespace'] == namespace:
            return map_data
    return None

def main():
    """Main entry point - handles CLI arguments and map selection.
    
    Supports three input modes:
    1. Interactive: Displays numbered list of maps for selection
    2. Namespace: Direct map identifier (e.g., 'everon')
    3. Index: Numeric index from map list (e.g., '0' for first map)
    
    Process:
    - Loads map metadata from all_arma_maps.json
    - Downloads source image from Cloudflare R2 CDN
    - Generates complete tile pyramid
    - Outputs to tiles/{namespace}/ directory
    """
    # Load maps data
    json_file = Path(__file__).parent / "all_arma_maps.json"
    with open(json_file, 'r') as f:
        maps = json.load(f)
    
    output_dir = Path(__file__).parent / "tiles"
    output_dir.mkdir(exist_ok=True)
    
    # Check if namespace provided as argument
    if len(sys.argv) > 1:
        namespace = sys.argv[1]
        map_data = find_map_by_namespace(maps, namespace)
        
        if not map_data:
            print(f"Error: Map with namespace '{namespace}' not found")
            print("\nAvailable namespaces:")
            for m in maps:
                print(f"  - {m['namespace']} ({m['name']})")
            return
        
        maps_to_process = [map_data]
    else:
        # Interactive mode
        print("WARNING: This will download and process very large files!")
        print("For a 2.6GB image, this could take significant time and disk space.\n")
        print("Available maps:")
        for i, map_data in enumerate(maps):
            print(f"{i+1}. {map_data['namespace']:15} - {map_data['name']:15} (max_zoom: {map_data['max_zoom']})")
        
        choice = input("\nEnter namespace or number (or 'all' for all maps): ").strip()
        
        if choice.lower() == 'all':
            maps_to_process = maps
        elif choice.isdigit():
            idx = int(choice) - 1
            if 0 <= idx < len(maps):
                maps_to_process = [maps[idx]]
            else:
                print("Invalid number")
                return
        else:
            # Try as namespace
            map_data = find_map_by_namespace(maps, choice)
            if map_data:
                maps_to_process = [map_data]
            else:
                print(f"Invalid choice: {choice}")
                return
    
    # Process selected maps
    for map_data in maps_to_process:
        print(f"\n{'='*60}")
        print(f"Processing: {map_data['name']} ({map_data['namespace']})")
        print(f"Max zoom: {map_data['max_zoom']}")
        print(f"Size: {map_data['size'][0]}x{map_data['size'][1]}")
        print(f"{'='*60}")
        
        # Check if tiles already exist
        tile_dir = output_dir / map_data['namespace']
        if tile_dir.exists() and any(tile_dir.iterdir()):
            print(f"⚠️  Tiles already exist for {map_data['name']}")
            response = input("Regenerate tiles? (y/N): ").strip().lower()
            if response != 'y':
                print(f"Skipping {map_data['name']}")
                continue
        
        # Check if source image exists locally
        local_image_path = Path(__file__).parent / map_data['dir'] / "sat_full.png"
        
        if not local_image_path.exists():
            # Try to download from CDN if available
            if 'resources' in map_data and 'map_image' in map_data['resources']:
                cdn_url = map_data['resources']['map_image']
                print(f"Local image not found, downloading from CDN...")
                try:
                    image = download_image(cdn_url)
                except Exception as e:
                    print(f"\n✗ Error downloading from {cdn_url}: {e}")
                    print(f"Please ensure the satellite image exists locally at {local_image_path}")
                    continue
            else:
                print(f"\n✗ Error: Source image not found at {local_image_path}")
                print(f"Please ensure the satellite image exists in the {map_data['dir']} directory")
                continue
        else:
            # Load local image
            print(f"Loading image from {local_image_path}...")
            image = Image.open(local_image_path)
        
        try:
            # Generate tiles
            generate_tiles(
                image,
                map_data['namespace'],
                map_data['max_zoom'],
                output_dir
            )
            
            image.close()
            print(f"\n✓ {map_data['name']} complete!\n")
            
        except Exception as e:
            print(f"\n✗ Error processing {map_data['name']}: {e}\n")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    main()
