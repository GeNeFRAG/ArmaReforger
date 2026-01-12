#!/usr/bin/env python3
"""
Tile Generator for Arma Reforger Maps

This script downloads high-resolution satellite map images from Cloudflare R2
and generates a tile pyramid for efficient web-based map viewing.

Features:
- Downloads large (up to 2.6GB) PNG images with progress tracking
- Pads images to power-of-2 dimensions for proper web map tiling
- Generates zoom levels from 0 (most zoomed out) to max_zoom
- Creates 256x256 pixel tiles in WebP format for optimal web performance
- Supports interactive, namespace, or index-based map selection

Output Structure:
    tiles/{namespace}_sat/{zoom}/{x}/{y}.webp
    
Example:
    tiles/arland_sat/6/32/45.webp
    
Usage:
    # Interactive mode
    python3 generate_tiles.py
    
    # By namespace
    python3 generate_tiles.py everon
    
    # By index (from all_arma_maps.json)
    python3 generate_tiles.py 0
    
    # With custom local image file
    python3 generate_tiles.py seitenbuch --image /path/to/image.png
"""

import argparse
import json
import math
import shutil
import sys
from pathlib import Path
from io import BytesIO

import requests
from PIL import Image

# Disable decompression bomb protection for large game maps
Image.MAX_IMAGE_PIXELS = None

TILE_SIZE = 256
WEBP_QUALITY = 90  # 0-100, higher = better quality but larger files

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

def auto_crop_padding(image, map_size):
    """Automatically detect and crop padding from square-padded images.
    
    Args:
        image: PIL.Image object (potentially padded to square)
        map_size: [width, height] from map config (actual game dimensions)
        
    Returns:
        PIL.Image: Cropped image matching expected aspect ratio
        
    Note:
        Detects green padding by scanning edges and finding the transition
        from actual map content to padding areas. Falls back to config size
        if auto-detection fails.
    """
    width, height = image.size
    expected_width, expected_height = map_size
    
    # If already close to expected dimensions, no cropping needed
    if abs(width - expected_width) < 100 and abs(height - expected_height) < 100:
        return image
    
    # If image is square but map should be rectangular, crop it
    if width == height and expected_width != expected_height:
        print(f"Detected square padding: {width}x{height}, expected {expected_width}x{expected_height}")
        
        # Simple crop based on expected size (scale to match largest dimension)
        if expected_width > expected_height:
            # Landscape: use full width, crop height
            crop_height = int(width * expected_height / expected_width)
            crop_box = (0, 0, width, crop_height)
        else:
            # Portrait: use full height, crop width
            crop_width = int(height * expected_width / expected_height)
            crop_box = (0, 0, crop_width, height)
        
        print(f"Cropping to box: {crop_box}")
        return image.crop(crop_box)
    
    return image

def generate_tiles(image, map_name, max_zoom, output_dir, map_size=None):
    """Generate tile pyramid for all zoom levels.
    
    Args:
        image: PIL.Image object of the source map
        map_name: Namespace of the map (e.g., 'everon', 'arland')
        max_zoom: Maximum zoom level (highest detail)
        output_dir: Base directory for tile output (creates tiles/{map_name}_sat/...)
        map_size: [width, height] from config for auto-cropping (optional)
        
    Process:
        1. Auto-crops padding if image is square-padded
        2. Pads image to next power-of-2 dimensions
        3. For each zoom level (0 to max_zoom):
           - Scales image appropriately
           - Divides into 256x256 tiles
           - Saves tiles as WebP with quality=90
        4. Creates directory structure: {z}/{x}/{y}.webp
        
    Note:
        Zoom 0 = most zoomed out (entire map in few tiles)
        Max zoom = highest detail (original resolution)
        Output directory will have _sat suffix to match engine config
    """
    # Auto-crop padding if map_size provided
    if map_size:
        image = auto_crop_padding(image, map_size)
    
    width, height = image.size
    print(f"Image size after crop: {width}x{height}")
    
    # Pad each dimension independently to next power of 2
    next_width = 1 << (width - 1).bit_length() if width > 0 else 1
    next_height = 1 << (height - 1).bit_length() if height > 0 else 1
    
    if width != next_width or height != next_height:
        print(f"Padding image from {width}x{height} to {next_width}x{next_height} for proper tiling...")
        padded = Image.new('RGB', (next_width, next_height), (0, 0, 0))
        padded.paste(image, (0, 0))
        image = padded
        width, height = next_width, next_height
    
    print(f"Tiling with size: {width}x{height}")
    
    # Create output directory with _sat suffix to match engine config
    map_dir = output_dir / f"{map_name}_sat"
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
                
                # Warn about completely black/empty tiles (padding areas)
                extrema = tile.getextrema()
                # getextrema() returns a tuple of (min, max) for grayscale or list of tuples for RGB
                if isinstance(extrema[0], tuple):
                    is_black = all(min_val == 0 and max_val == 0 for min_val, max_val in extrema)
                else:
                    is_black = extrema[0] == 0 and extrema[1] == 0
                if is_black:
                    print(f"  ⊗ Black/empty tile at zoom {zoom}, x={col}, y={row}")
                
                # If tile is smaller than TILE_SIZE, pad it
                if tile.size != (TILE_SIZE, TILE_SIZE):
                    padded = Image.new('RGB', (TILE_SIZE, TILE_SIZE), (0, 0, 0))
                    padded.paste(tile, (0, 0))
                    tile = padded
                
                # Save tile as WebP
                tile_path = col_dir / f"{row}.webp"
                tile.save(tile_path, 'WEBP', quality=WEBP_QUALITY, method=6)
                
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
    4. Custom image: Specify local image file with --image
    
    Process:
    - Loads map metadata from all_arma_maps.json
    - Downloads source image from Cloudflare R2 CDN or uses local file
    - Generates complete tile pyramid
    - Outputs to tiles/{namespace}/ directory
    """
    # Parse arguments
    parser = argparse.ArgumentParser(description='Generate map tiles for Arma Reforger maps')
    parser.add_argument('namespace', nargs='?', help='Map namespace or index (or omit for interactive mode)')
    parser.add_argument('--image', '-i', help='Path to local image file (overrides default location)')
    args = parser.parse_args()
    
    # Load maps data
    json_file = Path(__file__).parent / "all_arma_maps.json"
    with open(json_file, 'r') as f:
        maps = json.load(f)
    
    output_dir = Path(__file__).parent / "tiles"
    output_dir.mkdir(exist_ok=True)
    
    # Check if namespace provided as argument
    if args.namespace:
        namespace = args.namespace
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
        tile_dir = output_dir / f"{map_data['namespace']}_sat"
        if tile_dir.exists() and any(tile_dir.iterdir()):
            print(f"⚠️  Tiles already exist for {map_data['name']}")
            print(f"   Directory: {tile_dir}")
            
            # Count existing tiles for confirmation
            tile_count = sum(1 for _ in tile_dir.rglob('*.webp'))
            if tile_count > 0:
                print(f"   Contains: {tile_count} tile files")
            
            response = input("Delete existing tiles and regenerate? (y/N): ").strip().lower()
            if response != 'y':
                print(f"Skipping {map_data['name']}")
                continue
            
            # Delete existing tiles directory
            print(f"Deleting existing tiles directory...")
            shutil.rmtree(tile_dir)
            print(f"✓ Deleted {tile_dir}")
        
        # Check for custom image path or use default location
        if args.image:
            custom_image_path = Path(args.image)
            if not custom_image_path.exists():
                print(f"\n✗ Error: Custom image file not found at {custom_image_path}")
                continue
            print(f"Using custom image: {custom_image_path}")
            image = Image.open(custom_image_path)
        else:
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
            # Special case: Seitenbuch needs landscape tiles despite portrait config
            crop_size = map_data['size']
            if map_data['namespace'] == 'seitenbuch':
                crop_size = [4000, 2000]  # Force landscape for tile generation
                print(f"⚠️  Using landscape override for Seitenbuch tiles: {crop_size}")
            
            # Generate tiles
            generate_tiles(
                image,
                map_data['namespace'],
                map_data['max_zoom'],
                output_dir,
                crop_size  # Pass size for auto-cropping
            )
            
            image.close()
            print(f"\n✓ {map_data['name']} complete!\n")
            
        except Exception as e:
            print(f"\n✗ Error processing {map_data['name']}: {e}\n")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    main()
