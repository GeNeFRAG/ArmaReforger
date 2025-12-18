"""
Arma Reforger Server Deep Cloning Tool

This script provides advanced server replication capabilities for Arma Reforger custom servers,
allowing you to deep clone server configurations from multiple input sources including 
server.txt files and live BattleMetrics servers.

Features:
- Deep clone server configurations from server.txt mod lists to Arma Reforger JSON format
- Clone live server configurations directly from BattleMetrics servers using server IDs
- Compare server configurations between different sources with detailed diff reports
- Optional version field removal for cross-server compatibility
- Support for custom BattleMetrics API endpoints
- Real-time configuration synchronization and validation

Usage:
    # Clone from file
    python deep_clone_server.py server_mods.txt server_config.json
    
    # Clone from BattleMetrics
    python deep_clone_server.py --battlemetrics 32653210 server_config.json
    
    # Compare configurations
    python deep_clone_server.py --battlemetrics 32653210 diff.json --compare existing_config.json
"""

import json
import argparse
import sys
from pathlib import Path
from typing import Dict, List

import urllib3

# Import BattleMetrics integration from mod_manager
from mod_manager import BattleMetricsAPI, HTTPClient, ModInfo

# Disable SSL verification warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def transform_server_txt_to_json(input_file: str, output_file: str, remove_version: bool) -> None:
    """Transforms a server.txt file into an Arma Reforger JSON configuration file.
    
    Reads a tab-separated values file containing mod information and converts it
    to the JSON format expected by Arma Reforger servers. Each line should contain
    name, version, and mod ID separated by tabs.

    Args:
        input_file (str): Path to the input server.txt file with tab-separated mod data.
        output_file (str): Path to the output JSON file for Arma Reforger server config.
        remove_version (bool): If True, sets version field to empty string for compatibility.

    Raises:
        FileNotFoundError: If the input file does not exist.
        IOError: If there is an error reading the input file or writing the output file.
        
    Example:
        >>> transform_server_txt_to_json("mods.txt", "config.json", False)
        # Creates config.json with mod entries including version info
    """
    mods = []
    with open(input_file, 'r', encoding='utf-8') as file:
        for line in file:
            parts = line.strip().split('\t')
            if len(parts) == 3:  # Ensure we have name, version, and mod_id
                name, version, mod_id = parts
                mod_entry = {
                    "modId": mod_id,
                    "name": name,
                    "version": "" if remove_version else version
                }
                mods.append(mod_entry)
    
    # Write the mod list as JSON with proper formatting
    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(mods, file, indent=4, ensure_ascii=False)

def compare_mods(server_source: str, json_file: str, output_file: str, is_battlemetrics: bool = False, api_base_url: str = "https://api.battlemetrics.com") -> Dict[str, List[str]]:
    """Compares mod lists between a server source and an Arma Reforger JSON config.
    
    Analyzes differences between two mod configurations and generates a diff report
    showing which mods were added or removed. Supports both file-based and 
    BattleMetrics server input for flexible comparison workflows.

    Args:
        server_source (str): Path to server.txt file OR BattleMetrics server ID.
        json_file (str): Path to the JSON configuration file to compare against.
        output_file (str): Path where the diff report will be written as JSON.
        is_battlemetrics (bool, optional): If True, treat server_source as BattleMetrics ID.
            Defaults to False.
        api_base_url (str, optional): BattleMetrics API base URL. 
            Defaults to "https://api.battlemetrics.com".

    Returns:
        dict: A dictionary with 'added' and 'removed' keys containing lists of mod IDs.
        
    Raises:
        FileNotFoundError: If the server.txt file does not exist (file mode).
        requests.RequestException: If BattleMetrics API request fails (BattleMetrics mode).
        json.JSONDecodeError: If the JSON file is malformed.
        IOError: If there is an error reading input files or writing the output.
        
    Example:
        >>> # Compare server.txt with JSON config
        >>> diff = compare_mods("new_mods.txt", "old_config.json", "changes.json")
        >>> print(f"Added: {len(diff['added'])}, Removed: {len(diff['removed'])}")
        
        >>> # Compare BattleMetrics server with JSON config
        >>> diff = compare_mods("32653210", "old_config.json", "changes.json", 
        ...                     is_battlemetrics=True)
        >>> print(f"Server vs config differences found")
    """
    # Load mods from server source (file or BattleMetrics)
    if is_battlemetrics:
        # Fetch mods from BattleMetrics server
        mods_data = fetch_mods_from_battlemetrics(server_source, api_base_url)
        server_mods = {mod['modId'] for mod in mods_data}
    else:
        # Load mods from server.txt file
        server_mods = set()
        with open(server_source, 'r', encoding='utf-8') as file:
            for line in file:
                parts = line.strip().split('\t')
                if len(parts) == 3:  # name, version, mod_id
                    _, _, mod_id = parts
                    server_mods.add(mod_id)

    # Load mods from JSON configuration file
    with open(json_file, 'r', encoding='utf-8') as file:
        json_data = json.load(file)
        # Handle both direct mod arrays and nested game.mods structure
        if isinstance(json_data, list):
            json_mods = {mod['modId'] for mod in json_data}
        else:
            json_mods = {mod['modId'] for mod in json_data.get('game', {}).get('mods', [])}

    # Calculate differences between the two mod sets
    added_mods = json_mods - server_mods  # In JSON but not in server source
    removed_mods = server_mods - json_mods  # In server source but not in JSON

    diff = {
        "added": list(added_mods),
        "removed": list(removed_mods)
    }

    # Write the diff report as JSON
    with open(output_file, 'w', encoding='utf-8') as file:
        json.dump(diff, file, indent=4, ensure_ascii=False)

    return diff

def fetch_mods_from_battlemetrics(server_id: str, api_base_url: str = "https://api.battlemetrics.com") -> List[Dict[str, str]]:
    """Fetch mod configuration from a BattleMetrics server.
    
    Connects to the BattleMetrics API to retrieve the current mod list from a live
    Arma Reforger server. This allows for real-time server configuration analysis
    and automated mod list synchronization.
    
    Args:
        server_id (str): BattleMetrics server ID (numeric string).
        api_base_url (str, optional): BattleMetrics API base URL. 
            Defaults to "https://api.battlemetrics.com".
        
    Returns:
        List[Dict[str, str]]: List of mod dictionaries, each containing:
            - modId (str): Unique mod identifier
            - name (str): Human-readable mod name
            - version (str): Mod version string
        
    Raises:
        requests.RequestException: If the BattleMetrics API request fails.
        ValueError: If the server data cannot be parsed or server not found.
        ConnectionError: If unable to connect to BattleMetrics API.
        
    Example:
        >>> mods = fetch_mods_from_battlemetrics("32653210")
        >>> print(f"Found {len(mods)} mods on server")
        >>> print(f"First mod: {mods[0]['name']} v{mods[0]['version']}")
        
    Note:
        Requires an active internet connection and valid BattleMetrics server ID.
        The server must be online and visible in BattleMetrics for data retrieval.
    """
    http_client = HTTPClient()
    api = BattleMetricsAPI(http_client, api_base_url)
    
    try:
        # Fetch mods using the BattleMetrics API
        mods_data, server_name = api.fetch_mods_by_id(server_id)
        
        print(f"Fetching mods from BattleMetrics server: {server_name} (ID: {server_id})")
        
        if not mods_data:
            print(f"Warning: No mods found for server {server_id}")
            return []
            
        # Convert ModInfo objects to dictionary format for JSON serialization
        mods = []
        for mod_info in mods_data:
            mods.append({
                "modId": mod_info.mod_id,
                "name": mod_info.name,
                "version": mod_info.version
            })
            
        print(f"Successfully fetched {len(mods)} mods from BattleMetrics")
        return mods
        
    except Exception as e:
        print(f"Error fetching mods from BattleMetrics: {e}")
        raise

if __name__ == "__main__":
    """Main entry point for the Arma Reforger Server Deep Cloning Tool.

    Provides a command-line interface for deep cloning server configurations from various sources
    into Arma Reforger server JSON configurations. Supports both file-based input
    (server.txt) and live BattleMetrics server data fetching for real-time server replication.

    Command-line Arguments:
        input_source (str): Either a path to server.txt file OR BattleMetrics server ID
            when used with --battlemetrics flag.
        output_file (str): Path where the cloned JSON configuration or diff will be written.
        
    Optional Flags:
        --battlemetrics: Treat input_source as BattleMetrics server ID instead of file path.
        --bmetrics-base-url (str): Custom BattleMetrics API endpoint 
            (default: https://api.battlemetrics.com).
        --remove-version: Remove version field from JSON output for compatibility.
        --compare (str): Compare input source against existing JSON config file.
        
    Examples:
        # Clone server.txt to JSON configuration
        python deep_clone_server.py mods.txt server_config.json
        
        # Deep clone from BattleMetrics server
        python deep_clone_server.py --battlemetrics 32653210 cloned_config.json
        
        # Compare BattleMetrics server with existing config
        python deep_clone_server.py --battlemetrics 32653210 diff.json --compare old_config.json
        
        # Create version-less config for compatibility
        python deep_clone_server.py --battlemetrics 32653210 config.json --remove-version
        
    Exit Codes:
        0: Success
        1: Error occurred (see stderr for details)
    """
    parser = argparse.ArgumentParser(description="Deep clone Arma Reforger server configurations from multiple sources or compare configurations.")
    parser.add_argument("input_source", help="Path to the input server.txt file OR BattleMetrics server ID (use --battlemetrics flag).")
    parser.add_argument("output_file", help="Path to the output JSON configuration file or diff file.")
    parser.add_argument("--battlemetrics", action="store_true", help="Treat input_source as BattleMetrics server ID instead of file path.")
    parser.add_argument("--bmetrics-base-url", default="https://api.battlemetrics.com", help="BattleMetrics API base URL (default: %(default)s).")
    parser.add_argument("--remove-version", action="store_true", help="Remove the version field from the JSON output for compatibility.")
    parser.add_argument("--compare", metavar="json_file", help="Compare input source against existing JSON configuration file.")
    args = parser.parse_args()

    try:
        if args.compare:
            json_file = args.compare
            # Use the updated compare_mods function that supports BattleMetrics directly
            diff = compare_mods(
                server_source=args.input_source,
                json_file=json_file,
                output_file=args.output_file,
                is_battlemetrics=args.battlemetrics,
                api_base_url=args.bmetrics_base_url
            )
            print(f"Config diff created at: {args.output_file}")
            print(f"Mods added: {len(diff['added'])}, Mods removed: {len(diff['removed'])}")
        else:
            if args.battlemetrics:
                # Fetch mods from BattleMetrics and create JSON
                mods = fetch_mods_from_battlemetrics(args.input_source, args.bmetrics_base_url)
                
                # Apply version removal if requested
                if args.remove_version:
                    for mod in mods:
                        mod['version'] = ""
                
                # Write JSON output
                with open(args.output_file, 'w') as file:
                    json.dump(mods, file, indent=4)
                    
                print(f"Server configuration cloned from BattleMetrics server {args.input_source} at: {args.output_file}")
            else:
                # Use original file-based transformation
                transform_server_txt_to_json(args.input_source, args.output_file, args.remove_version)
                print(f"Server configuration cloned from {args.input_source} at: {args.output_file}")
                
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
