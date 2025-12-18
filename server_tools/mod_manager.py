#!/usr/bin/env python3
"""
BattleMetrics Server Mod Comparison Tool for Arma Reforger
Fetches and compares mod lists between BattleMetrics servers
with workshop enrichment.

This script provides a complete toolkit for server mod management:
- Fetch mod lists directly from BattleMetrics servers using server IDs
- Compare two servers and identify common/unique mods with version analysis
- Enrich mod data with Steam Workshop information (sizes, dependencies)
- Generate detailed CSV reports and analysis with consistent timestamped filenames
- Support for caching to optimize repeated operations

Output Files:
- Individual server files: srv_{name}_{id}_{timestamp}.csv
- Common mods: comp_common_{server1}_vs_{server2}_{timestamp}.csv
- Unique mods: comp_unique_to_{name}_{timestamp}.csv
- All files include timestamp for organization and avoiding conflicts
"""

# =============================================================================
# IMPORTS AND CONFIGURATION
# =============================================================================

import argparse
import csv
import json
import re
import sys
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Set, Tuple, Union

import requests
import urllib3
from bs4 import BeautifulSoup

# Disable SSL verification warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


# =============================================================================
# DATA MODELS AND UTILITY FUNCTIONS
# =============================================================================

@dataclass
class ModInfo:
    """Data class to represent mod information."""
    name: str
    version: str
    mod_id: str
    source_file: str = ""
    size: str = ""  # Added size field for workshop mod information


@dataclass
class ComparisonData:
    """Data structure for mod comparison results."""
    identical_mods: List[ModInfo]
    version_diff_mods: List[Tuple[ModInfo, ModInfo]]
    unique_to_source1: List[ModInfo]
    unique_to_source2: List[ModInfo]


def size_to_bytes(size_str: str) -> int:
    """Convert size string (e.g., '285.68 KB') to bytes."""
    if not size_str:
        return 0

    # Parse size string (e.g., "285.68 KB", "2.49 MB", "5350 B")
    size_match = re.search(r'(\d+(?:\.\d+)?)\s*(KB|MB|GB|B)',
                           size_str, re.IGNORECASE)
    if size_match:
        value = float(size_match.group(1))
        unit = size_match.group(2).upper()

        if unit == 'B':
            return int(value)
        if unit == 'KB':
            return int(value * 1024)
        if unit == 'MB':
            return int(value * 1024 * 1024)
        if unit == 'GB':
            return int(value * 1024 * 1024 * 1024)

    return 0


# =============================================================================
# FILE OPERATIONS AND I/O HANDLERS
# =============================================================================

class FileIOHandler:
    """Handles all file input/output operations."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose

    def log(self, message: str) -> None:
        """Log message if verbose mode is enabled."""
        if self.verbose:
            print(message)

    def write_csv_file(self, output_file: Path, mods: List[ModInfo],
                      include_header: bool = True,
                      include_source: bool = False) -> None:
        """
        Write mods data to CSV file with proper escaping.

        Args:
            output_file: Path to output CSV file
            mods: List of ModInfo objects
            include_header: Whether to include header row
            include_source: Whether to include source file column
        """
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            if include_source:
                fieldnames = ['Mod Name', 'Version', 'Mod ID', 'Size',
                              'Size (Bytes)', 'Source File']
            else:
                fieldnames = ['Mod Name', 'Version', 'Mod ID', 'Size',
                              'Size (Bytes)']

            writer = csv.DictWriter(f, fieldnames=fieldnames)

            if include_header:
                writer.writeheader()

            for mod in mods:
                row = {
                    'Mod Name': mod.name,
                    'Version': mod.version,
                    'Mod ID': mod.mod_id,
                    'Size': mod.size,
                    'Size (Bytes)': size_to_bytes(mod.size)
                }
                if include_source:
                    row['Source File'] = mod.source_file
                writer.writerow(row)

# =============================================================================
# DATA FORMATTING AND UTILITY CLASSES
# =============================================================================

class DataFormatter:
    """Handles data formatting and normalization."""

    # Compiled regex patterns for better performance
    FILENAME_CHARS_PATTERN = re.compile(r'[^\w\s-]')
    WHITESPACE_PATTERN = re.compile(r'\s+')

    @staticmethod
    def normalize_size_format(size_str: str) -> str:
        """
        Normalize size format for Excel sorting compatibility.

        Examples:
        - '2b' -> '2 B'
        - '01b' -> '1 B'
        - '2.49 KB' -> '2.49 KB' (unchanged)
        - '6Mb' -> '6 MB'
        - '5350b' -> '5350 B'
        """
        if not size_str or not size_str.strip():
            return ""

        size_str = size_str.strip()

        size_match = re.match(r'^(\d+(?:\.\d+)?)\s*([KMGTkmgt]?[Bb]?)$', size_str)

        if size_match:
            value_str = size_match.group(1)
            unit = size_match.group(2).upper() if size_match.group(2) else 'B'

            value = float(value_str)

            if unit == 'B' or unit == '':
                unit = 'B'
            elif unit == 'KB' or unit == 'K':
                unit = 'KB'
            elif unit == 'MB' or unit == 'M':
                unit = 'MB'
            elif unit == 'GB' or unit == 'G':
                unit = 'GB'
            elif unit == 'TB' or unit == 'T':
                unit = 'TB'
            else:
                unit = 'B'  # Default fallback

            if value == int(value):
                return f"{int(value)} {unit}"

            return f"{value:.2f} {unit}".rstrip('0').rstrip('.')

        size_patterns = [
            r'(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB|B)',
            r'(\d+(?:\.\d+)?)\s*(kb|mb|gb|tb|b)',
        ]

        for pattern in size_patterns:
            match = re.search(pattern, size_str, re.IGNORECASE)
            if match:
                value = float(match.group(1))
                unit = match.group(2).upper()

                if value == int(value):
                    return f"{int(value)} {unit}"

                return f"{value:.2f} {unit}".rstrip('0').rstrip('.')

        return size_str

    @staticmethod
    def create_safe_filename(name: str) -> str:
        """Create a safe filename from a source name."""
        return "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()

    @staticmethod
    def generate_timestamped_filename(prefix: str, suffix: str = "", extension: str = "csv") -> str:
        """
        Generate a consistent timestamped filename.

        Args:
            prefix: Base name for the file
            suffix: Optional suffix to add before timestamp
            extension: File extension (default: csv)

        Returns:
            Filename in format: {prefix}_{suffix}_{timestamp}.{extension}
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Sanitize prefix
        safe_prefix = DataFormatter.create_safe_filename(prefix)
        if not safe_prefix:
            safe_prefix = "output"

        # Build filename parts
        parts = [safe_prefix]
        if suffix:
            safe_suffix = DataFormatter.create_safe_filename(suffix)
            if safe_suffix:
                parts.append(safe_suffix)
        parts.append(timestamp)

        return f"{'_'.join(parts)}.{extension}"

    @staticmethod
    def generate_server_filename(server_name: str, server_id: str) -> str:
        """Generate consistent filename for individual server mod lists."""
        return DataFormatter.generate_timestamped_filename(
            prefix="srv",
            suffix=f"{server_name}_{server_id}" if server_name else server_id
        )

    @staticmethod
    def generate_comparison_filename(file_type: str, source1_name: str = "", source2_name: str = "") -> str:
        """
        Generate consistent filename for comparison files.

        Args:
            file_type: Type of file ('common', 'unique_to', etc.)
            source1_name: Optional first source name
            source2_name: Optional second source name

        Returns:
            Timestamped filename
        """
        if file_type == "common":
            # Include both server names in common mods file
            if source1_name and source2_name:
                safe_name1 = DataFormatter.create_safe_filename(source1_name)
                safe_name2 = DataFormatter.create_safe_filename(source2_name)
                prefix = f"comp_common_{safe_name1}_vs_{safe_name2}"
            else:
                prefix = "comp_common_mods"
        elif file_type.startswith("unique_to") and source1_name:
            safe_name = DataFormatter.create_safe_filename(source1_name)
            prefix = f"comp_unique_to_{safe_name}"
        else:
            prefix = f"comp_{file_type}"

        return DataFormatter.generate_timestamped_filename(prefix)

    @staticmethod
    def calculate_total_size(mods: List[ModInfo]) -> str:
        """Calculate total size from a list of mods with size information."""
        total_bytes = sum(size_to_bytes(mod.size) for mod in mods if mod.size)

        if total_bytes == 0:
            return ""

        if total_bytes >= 1024 * 1024 * 1024:
            return f"{total_bytes / (1024 * 1024 * 1024):.2f} GB"
        if total_bytes >= 1024 * 1024:
            return f"{total_bytes / (1024 * 1024):.2f} MB"
        if total_bytes >= 1024:
            return f"{total_bytes / 1024:.2f} KB"
        else:
            return f"{total_bytes:.0f} B"


# =============================================================================
# HTTP CLIENT AND API HANDLERS
# =============================================================================

class HTTPClient:
    """Handles HTTP requests and API communications."""

    def __init__(self, verbose: bool = False):
        self.verbose = verbose

    def log(self, message: str) -> None:
        """Log message if verbose mode is enabled."""
        if self.verbose:
            print(message)

    def get_http_session(self) -> requests.Session:
        """Create a standardized HTTP session with consistent headers."""
        session = requests.Session()
        session.headers.update({
            'User-Agent': ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) '
                           'AppleWebKit/537.36 (KHTML, like Gecko) '
                           'Chrome/91.0.4472.124 Safari/537.36'),
            'Accept': ('text/html,application/xhtml+xml,application/xml;'
                       'q=0.9,*/*;q=0.8'),
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
        return session

    def make_http_request(self, url: str, expect_json: bool = False,
                         timeout: int = 15) -> Tuple[bool, Union[dict, str]]:
        """
        Make a standardized HTTP request.

        Args:
            url: URL to request
            expect_json: Whether to parse response as JSON
            timeout: Request timeout in seconds

        Returns:
            Tuple of (success: bool, data: dict|str)
        """
        self.log(f"Making HTTP request to: {url}")

        session = self.get_http_session()
        if expect_json:
            session.headers['Accept'] = 'application/json'

        try:
            response = session.get(url, timeout=timeout, verify=False)
            self.log(f"HTTP response status: {response.status_code}")
            self.log(f"HTTP response length: {len(response.text)}")

            if response.status_code != 200:
                self.log(f"HTTP request failed with status: {response.status_code}")
                if response.text:
                    self.log(f"Response preview: {response.text[:200]}")
                return False, {}

            if not response.text.strip():
                self.log("Empty response received")
                return False, {}

            if expect_json:
                try:
                    data = response.json()
                    self.log("Successfully parsed JSON response")
                    return True, data
                except (json.JSONDecodeError, requests.exceptions.JSONDecodeError, ValueError) as json_error:
                    self.log(f"JSON decode error: {json_error}")
                    self.log(f"Response preview: {response.text[:200]}")
                    try:
                        debug_filename = DataFormatter.generate_timestamped_filename(
                            prefix="http_debug",
                            suffix=url.split('/')[-1],
                            extension="txt"
                        )
                        debug_file = Path(debug_filename)
                        with open(debug_file, 'w', encoding='utf-8') as f:
                            f.write(response.text)
                        self.log(f"Raw response saved to {debug_file}")
                    except (OSError, IOError) as file_error:
                        self.log(f"Failed to save debug file: {file_error}")
                    return False, {}
            else:
                self.log("Successfully retrieved HTML response")
                return True, response.text

        except Exception as error:
            self.log(f"HTTP request failed: {error}")
            return False, {}


# =============================================================================
# BATTLEMETRICS API HANDLER
# =============================================================================

class BattleMetricsAPI:
    """Handles BattleMetrics API operations."""

    # Compiled regex patterns for better performance
    BRACKET_PATTERN = re.compile(r'^\[([^\]]+)\]\s*(.*)')
    SERVER_SUFFIX_PATTERN = re.compile(r'\s*[-/|]\s*.*$')
    SERVER_PREFIX_PATTERN = re.compile(r'^\[.*?\]\s*')

    def __init__(self, http_client: HTTPClient, api_base_url: str = "https://api.battlemetrics.com"):
        self.http_client = http_client
        self.api_base_url = api_base_url.rstrip('/')  # Remove trailing slash if present

    def make_api_request(self, server_id: str) -> dict:
        """Make API request to BattleMetrics and return JSON response."""
        api_url = f"{self.api_base_url}/servers/{server_id}"
        success, data = self.http_client.make_http_request(api_url, expect_json=True)
        return data if success else {}

    def extract_server_name_from_api_data(self, api_data: dict) -> str:
        """Extract and sanitize server name from BattleMetrics API response."""
        server_data = api_data.get('data', {})
        attributes = server_data.get('attributes', {})
        details = attributes.get('details', {})
        reforger_data = details.get('reforger', {})

        scenario_name_raw = reforger_data.get('scenarioName', '')

        if self.http_client.verbose:
            self.http_client.log(f"Found scenario: '{scenario_name_raw}'")

        if scenario_name_raw:
            server_name = self.sanitize_server_name(scenario_name_raw)
            if self.http_client.verbose:
                self.http_client.log(f"Using scenario: '{scenario_name_raw}' -> '{server_name}'")
            return server_name
        else:
            server_name_raw = attributes.get('name', '')
            server_name = self.sanitize_server_name(server_name_raw)
            if self.http_client.verbose:
                self.http_client.log(f"No scenario found, using server name: '{server_name_raw}' -> '{server_name}'")
            return server_name

    def extract_mods_from_api_data(self, api_data: dict, source_name: str) -> List[ModInfo]:
        """Extract mod list from BattleMetrics API response."""
        server_data = api_data.get('data', {})
        attributes = server_data.get('attributes', {})
        details = attributes.get('details', {})
        reforger_data = details.get('reforger', {})
        mod_list = reforger_data.get('mods', [])

        self.http_client.log(f"Found {len(mod_list)} mods in API response")

        mods = []
        for mod in mod_list:
            if isinstance(mod, dict):
                name = mod.get('name', '')
                version = mod.get('version', '')
                mod_id = mod.get('modId', '')

                if name and version and mod_id:
                    mods.append(ModInfo(name, version, mod_id, source_name, ""))  # Empty size for BattleMetrics data
                    self.http_client.log(f"Added mod: {name} v{version} | {mod_id}")

        return mods

    def sanitize_server_name(self, server_name: str) -> str:
        """
        Sanitize server/scenario name to create a clean, short filename.
        For scenario names, preserve meaningful prefixes like [TGH].

        Args:
            server_name: Raw server name or scenario name from BattleMetrics

        Returns:
            Sanitized name suitable for filenames
        """
        if not server_name:
            return ""

        name = server_name

        # For scenario names with brackets, preserve the content inside brackets
        bracket_match = self.BRACKET_PATTERN.match(name)
        if bracket_match:
            prefix = bracket_match.group(1)
            suffix = bracket_match.group(2)
            name = f"{prefix}_{suffix}" if suffix else prefix

        # Remove server-specific patterns only if it looks like a server name (not a scenario)
        if not bracket_match and any(indicator in name.lower() for indicator in ['discord', 'ts3', 'teamspeak', 'www.', 'http', '|']):
            name = self.SERVER_SUFFIX_PATTERN.sub('', name)
            name = self.SERVER_PREFIX_PATTERN.sub('', name)

        name = DataFormatter.FILENAME_CHARS_PATTERN.sub('', name)  # Keep only alphanumeric, spaces, hyphens
        name = DataFormatter.WHITESPACE_PATTERN.sub('_', name)      # Replace spaces with underscores
        name = name.strip('_')                # Remove leading/trailing underscores

        if len(name) > 50:  # Increased for scenario names with prefixes
            name = name[:50].rstrip('_')

        return name if name else "Unknown_Server"

    def fetch_mods_by_id(self, server_id: str) -> Tuple[List[ModInfo], str]:
        """Fetch mod data directly using server ID."""
        self.http_client.log(f"Fetching mod data for server ID: {server_id}")

        try:
            # Make API request
            api_data = self.make_api_request(server_id)
            if not api_data:
                return [], ""

            # Extract server name using consolidated method
            server_name = self.extract_server_name_from_api_data(api_data)

            # Extract mods using consolidated method
            mods = self.extract_mods_from_api_data(api_data, server_name or f"BattleMetrics:{server_id}")

            if not mods:
                print("Warning: No mod data found from BattleMetrics API.")
                print("Tip: Try copying the mod table manually to a TSV file.")
                return [], server_name

            self.http_client.log(f"Successfully extracted {len(mods)} mods from BattleMetrics")
            return mods, server_name

        except requests.RequestException as e:
            print(f"Error fetching data from BattleMetrics: {e}")
            print("Tip: Check your internet connection or try copying the mod table manually.")
            return [], ""
        except Exception as e:
            print(f"Error parsing BattleMetrics data: {e}")
            import traceback
            self.http_client.log(f"Full error: {traceback.format_exc()}")
            return [], ""


# =============================================================================
# WORKSHOP ENRICHMENT HANDLER
# =============================================================================

class WorkshopEnrichment:
    """Handles Steam Workshop data enrichment."""

    def __init__(self, http_client: HTTPClient, workshop_base_url: str = "https://reforger.armaplatform.com/workshop"):
        self.http_client = http_client
        self.workshop_base_url = workshop_base_url.rstrip('/')  # Remove trailing slash if present
        self.workshop_cache = {}  # mod_id -> ModInfo
        self.workshop_fetch_attempts = set()  # mod_ids that we've attempted

    def extract_workshop_meta_content(self, html: str, meta_name: str) -> str:
        """Extract meta content from workshop HTML."""
        soup = BeautifulSoup(html, 'html.parser')
        meta_tag = soup.find("meta", {"property": f"og:{meta_name}"})
        return meta_tag["content"] if meta_tag else ""

    def extract_mod_size(self, html: str) -> str:
        """Extract mod size from workshop HTML and normalize format for Excel."""
        soup = BeautifulSoup(html, 'html.parser')

        size_patterns = [
            r'(\d+(?:\.\d+)?\s*(?:MB|GB|KB|B))',
            r'Size:\s*(\d+(?:\.\d+)?\s*(?:MB|GB|KB|B))',
            r'Download:\s*(\d+(?:\.\d+)?\s*(?:MB|GB|KB|B))',
        ]

        page_text = soup.get_text()
        for pattern in size_patterns:
            match = re.search(pattern, page_text, re.IGNORECASE)
            if match:
                raw_size = match.group(1)
                return DataFormatter.normalize_size_format(raw_size)

        size_elements = soup.find_all(text=re.compile(r'\d+(?:\.\d+)?\s*(?:MB|GB|KB|B)', re.IGNORECASE))
        if size_elements:
            for element in size_elements:
                match = re.search(r'\d+(?:\.\d+)?\s*(?:MB|GB|KB|B)', element, re.IGNORECASE)
                if match:
                    raw_size = match.group()
                    return DataFormatter.normalize_size_format(raw_size)

        return ""

    def fetch_workshop_mod_details(self, mod_id: str) -> List[ModInfo]:
        """Fetch mod details from Arma Reforger workshop with caching."""
        if mod_id in self.workshop_cache:
            self.http_client.log(f"Cache hit for mod {mod_id}: {self.workshop_cache[mod_id].name}")
            cached_mod = self.workshop_cache[mod_id]
            return [ModInfo(
                name=cached_mod.name,
                version=cached_mod.version,
                mod_id=cached_mod.mod_id,
                source_file=cached_mod.source_file,
                size=cached_mod.size
            )]

        if mod_id in self.workshop_fetch_attempts:
            self.http_client.log(f"Previously failed to fetch mod {mod_id}, skipping")
            return []

        url = f"{self.workshop_base_url}/{mod_id}"
        self.workshop_fetch_attempts.add(mod_id)

        success, html = self.http_client.make_http_request(url, expect_json=False, timeout=10)
        if not success:
            self.http_client.log(f"Failed to fetch workshop mod {mod_id}")
            return []

        try:
            mod_name = self.extract_workshop_meta_content(html, "title")
            mod_size = self.extract_mod_size(html)

            mod_data = ModInfo(
                name=mod_name or f"Workshop Mod {mod_id}",
                version="",  # Workshop doesn't easily provide version
                mod_id=mod_id,
                source_file="workshop",
                size=DataFormatter.normalize_size_format(mod_size) if mod_size else ""
            )

            self.workshop_cache[mod_id] = mod_data
            self.http_client.log(f"Cached workshop data for mod {mod_id}: {mod_data.name}")

            return [mod_data]

        except Exception as e:
            self.http_client.log(f"Error parsing workshop mod {mod_id}: {e}")
            return []

    def enrich_mods_with_workshop_data(self, mods: List[ModInfo]) -> List[ModInfo]:
        """Enrich existing mod list with workshop data (size, etc.) using caching for optimization."""
        enriched_mods = []
        cache_hits = 0
        new_fetches = 0
        failed_fetches = 0

        total_mods = len(mods)
        self.http_client.log(f"Starting enrichment for {total_mods} mods...")

        for i, mod in enumerate(mods, 1):
            if self.http_client.verbose:
                print(f"  [{i}/{total_mods}] Enriching {mod.name} (ID: {mod.mod_id})...")
            else:
                self.http_client.log(f"Enriching mod {mod.name} (ID: {mod.mod_id})...")

            was_cached = mod.mod_id in self.workshop_cache

            workshop_mods = self.fetch_workshop_mod_details(mod.mod_id)
            if workshop_mods:
                workshop_mod = workshop_mods[0]
                enriched_mod = ModInfo(
                    name=mod.name,
                    version=mod.version,
                    mod_id=mod.mod_id,
                    source_file=mod.source_file,
                    size=DataFormatter.normalize_size_format(workshop_mod.size) if workshop_mod.size else ""
                )
                enriched_mods.append(enriched_mod)

                if was_cached:
                    cache_hits += 1
                    self.http_client.log(f"✅ Cache hit - Enriched {mod.name} with size: {workshop_mod.size}")
                else:
                    new_fetches += 1
                    self.http_client.log(f"🌐 New fetch - Enriched {mod.name} with size: {workshop_mod.size}")
            else:
                enriched_mods.append(mod)
                failed_fetches += 1
                self.http_client.log(f"❌ Could not enrich {mod.name} - keeping original data")

        print(f"✅ Successfully enriched {len(enriched_mods) - failed_fetches}/{total_mods} mods")
        if cache_hits > 0 or new_fetches > 0:
            print("   📊 Cache performance:")
            print(f"      - Cache hits: {cache_hits} (saved {cache_hits} HTTP requests)")
            print(f"      - New fetches: {new_fetches}")
            print(f"      - Failed fetches: {failed_fetches}")
            efficiency = (cache_hits / (cache_hits + new_fetches) * 100) if (cache_hits + new_fetches) > 0 else 0
            print(f"      - Cache efficiency: {efficiency:.1f}%")

        return enriched_mods


# =============================================================================
# MOD COMPARISON ENGINE
# =============================================================================

class ModComparison:
    """Handles mod comparison logic and analysis."""

    def __init__(self, file_io: FileIOHandler):
        self.file_io = file_io

    def analyze_mod_differences(self, mods1_dict: Dict[str, ModInfo], mods2_dict: Dict[str, ModInfo]) -> Tuple[
            List[ModInfo], List[Tuple[ModInfo, ModInfo]], Set[str], Set[str]]:
        """
        Analyze differences between two mod dictionaries.

        Returns:
            Tuple of (identical_mods, version_diff_mods, unique_to_source1, unique_to_source2)
        """
        # Find different categories of mods
        common_mod_names = set(mods1_dict.keys()) & set(mods2_dict.keys())
        unique_to_source1 = set(mods1_dict.keys()) - set(mods2_dict.keys())
        unique_to_source2 = set(mods2_dict.keys()) - set(mods1_dict.keys())

        # Analyze common mods
        identical_mods = []
        version_diff_mods = []

        for mod_name in sorted(common_mod_names):
            mod1 = mods1_dict[mod_name]
            mod2 = mods2_dict[mod_name]

            version_match = mod1.version == mod2.version
            id_match = mod1.mod_id == mod2.mod_id

            if version_match and id_match:
                identical_mods.append(mod1)
            else:
                # Any difference (version or ID) goes into version_diff_mods
                version_diff_mods.append((mod1, mod2))

        return identical_mods, version_diff_mods, unique_to_source1, unique_to_source2

    def build_common_mods_data(self, source1_name: str, source2_name: str,
                               comparison_data: ComparisonData,
                               include_size_columns: bool = False) -> Tuple[List[Dict], List[str]]:
        """
        Build common mods data for CSV output.

        Returns:
            Tuple of (common_mods_data, fieldnames)
        """
        common_mods_data = []

        # Create column names using actual scenario names
        source1_column = f"{source1_name} Version"
        source2_column = f"{source2_name} Version"

        # Base fieldnames
        fieldnames = ['Mod Name', 'Status', 'Version', 'Mod ID', 'Size', 'Size (Bytes)', source1_column, source2_column]

        if include_size_columns:
            source1_size_column = f"{source1_name} Size"
            source2_size_column = f"{source2_name} Size"
            fieldnames.extend([source1_size_column, source2_size_column])
        else:
            source1_size_column = source2_size_column = None

        # Add identical mods
        for mod in comparison_data.identical_mods:
            row = {
                'Mod Name': mod.name,
                'Status': 'Identical',
                'Version': mod.version,
                'Mod ID': mod.mod_id,
                'Size': mod.size,
                source1_column: mod.version,
                source2_column: mod.version
            }
            if include_size_columns:
                row[source1_size_column] = mod.size
                row[source2_size_column] = mod.size
            common_mods_data.append(row)

        # Add version diff mods
        for mod1, mod2 in comparison_data.version_diff_mods:
            row = {
                'Mod Name': mod1.name,
                'Status': 'Version Diff',
                'Version': f"{mod1.version} → {mod2.version}",
                'Mod ID': mod1.mod_id,
                'Size': mod1.size or mod2.size,
                source1_column: mod1.version,
                source2_column: mod2.version
            }
            if include_size_columns:
                row[source1_size_column] = mod1.size
                row[source2_size_column] = mod2.size
            common_mods_data.append(row)

        return common_mods_data, fieldnames


# =============================================================================
# REPORT GENERATION AND OUTPUT
# =============================================================================

class ReportGenerator:
    """Handles report generation and console output."""

    def __init__(self, file_io: FileIOHandler):
        self.file_io = file_io

    def print_comparison_results(self, source1_name: str, source2_name: str,
                                comparison_data: ComparisonData,
                                mods1_dict: Dict[str, ModInfo],
                                mods2_dict: Dict[str, ModInfo]) -> None:
        """Print detailed comparison results."""

        print("MODS WITH IDENTICAL VERSIONS AND IDs:")
        print("-" * 50)
        if comparison_data.identical_mods:
            for mod in comparison_data.identical_mods:
                print(f"  {mod.name:<40} | v{mod.version:<12} | {mod.mod_id}")
        else:
            print("  None")
        print()

        print("MODS WITH DIFFERENT VERSIONS:")
        print("-" * 50)
        if comparison_data.version_diff_mods:
            for mod1, mod2 in comparison_data.version_diff_mods:
                print(f"  {mod1.name:<40}")
                print(f"    {source1_name:<30}: v{mod1.version:<12} | {mod1.mod_id}")
                print(f"    {source2_name:<30}: v{mod2.version:<12} | {mod2.mod_id}")
                if mod1.mod_id != mod2.mod_id:
                    print("    ⚠️  Different Mod IDs!")
                print()
        else:
            print("  None")
        print()

        # Summary statistics
        print("SUMMARY:")
        print("-" * 20)
        print(f"Total mods in {source1_name}: {len(mods1_dict)}")
        print(f"Total mods in {source2_name}: {len(mods2_dict)}")
        print(f"Common mods: {len(comparison_data.identical_mods) + len(comparison_data.version_diff_mods)}")
        print(f"  - Identical (same version & ID): {len(comparison_data.identical_mods)}")
        print(f"  - Different versions: {len(comparison_data.version_diff_mods)}")
        print(f"Unique to {source1_name}: {len(comparison_data.unique_to_source1)}")
        print(f"Unique to {source2_name}: {len(comparison_data.unique_to_source2)}")
        print()

    def print_enriched_comparison_results(self, source1_name: str, source2_name: str, identical_mods: List[ModInfo],
                                         version_diff_mods: List[Tuple[ModInfo, ModInfo]],
                                         unique_to_source1: Set[str], unique_to_source2: Set[str],
                                         mods1_dict: Dict[str, ModInfo], mods2_dict: Dict[str, ModInfo]) -> None:
        """Print detailed comparison results with size information."""

        print("MODS WITH IDENTICAL VERSIONS AND IDs:")
        print("-" * 50)
        if identical_mods:
            for mod in identical_mods:
                size_info = f" | {mod.size}" if mod.size else ""
                print(f"  {mod.name:<40} | v{mod.version:<12} | {mod.mod_id}{size_info}")
        else:
            print("  None")
        print()

        print("MODS WITH DIFFERENT VERSIONS:")
        print("-" * 50)
        if version_diff_mods:
            for mod1, mod2 in version_diff_mods:
                print(f"  {mod1.name:<40}")
                size1_info = f" | {mod1.size}" if mod1.size else ""
                size2_info = f" | {mod2.size}" if mod2.size else ""
                print(f"    {source1_name:<30}: v{mod1.version:<12} | {mod1.mod_id}{size1_info}")
                print(f"    {source2_name:<30}: v{mod2.version:<12} | {mod2.mod_id}{size2_info}")
                if mod1.mod_id != mod2.mod_id:
                    print("    ⚠️  Different Mod IDs!")
                print()
        else:
            print("  None")
        print()

        print("SUMMARY:")
        print("-" * 20)
        print(f"Total mods in {source1_name}: {len(mods1_dict)}")
        print(f"Total mods in {source2_name}: {len(mods2_dict)}")
        print(f"Common mods: {len(identical_mods) + len(version_diff_mods)}")
        print(f"  - Identical (same version & ID): {len(identical_mods)}")
        print(f"  - Different versions: {len(version_diff_mods)}")
        print(f"Unique to {source1_name}: {len(unique_to_source1)}")
        print(f"Unique to {source2_name}: {len(unique_to_source2)}")

        if any(mod.size for mod in mods1_dict.values()):
            total_size1 = DataFormatter.calculate_total_size([mod for mod in mods1_dict.values() if mod.size])
            if total_size1:
                print(f"Total size for {source1_name}: {total_size1}")

        if any(mod.size for mod in mods2_dict.values()):
            total_size2 = DataFormatter.calculate_total_size([mod for mod in mods2_dict.values() if mod.size])
            if total_size2:
                print(f"Total size for {source2_name}: {total_size2}")
        print()

    def write_unique_files(self, output_dir: Path, source1_name: str, source2_name: str,
                           unique_to_source1: Set[str], unique_to_source2: Set[str],
                           mods1_dict: Dict[str, ModInfo], mods2_dict: Dict[str, ModInfo]) -> None:
        """Write unique mod files for both sources."""
        if unique_to_source1:
            unique_filename1 = DataFormatter.generate_comparison_filename("unique_to", source1_name)
            unique_file1 = output_dir / unique_filename1
            unique_mods1 = [mods1_dict[name] for name in unique_to_source1]
            self.file_io.write_csv_file(unique_file1, unique_mods1, include_source=True)
            print(f"✅ Unique mods from {source1_name} saved to: {unique_file1.name}")

        if unique_to_source2:
            unique_filename2 = DataFormatter.generate_comparison_filename("unique_to", source2_name)
            unique_file2 = output_dir / unique_filename2
            unique_mods2 = [mods2_dict[name] for name in unique_to_source2]
            self.file_io.write_csv_file(unique_file2, unique_mods2, include_source=True)
            print(f"✅ Unique mods from {source2_name} saved to: {unique_file2.name}")

    def generate_comparison_files(self, source1_name: str, source2_name: str, output_dir: Path,
                                 comparison: ModComparison,
                                 identical_mods: List[ModInfo],
                                 version_diff_mods: List[Tuple[ModInfo, ModInfo]],
                                 unique_to_source1: Set[str], unique_to_source2: Set[str],
                                 mods1_dict: Dict[str, ModInfo], mods2_dict: Dict[str, ModInfo],
                                 include_size_columns: bool = False) -> None:
        """Generate CSV output files for comparison results."""

        # Common mods file with timestamped filename including both server names
        common_filename = DataFormatter.generate_comparison_filename("common", source1_name, source2_name)
        common_mods_file = output_dir / common_filename
        comparison_data = ComparisonData(identical_mods, version_diff_mods,
                                       unique_to_source1, unique_to_source2)
        common_mods_data, fieldnames = comparison.build_common_mods_data(
            source1_name, source2_name, comparison_data,
            include_size_columns=include_size_columns)

        # Write common mods file
        with open(common_mods_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for row in sorted(common_mods_data, key=lambda x: x['Mod Name']):
                # Add Size (Bytes) column
                row['Size (Bytes)'] = size_to_bytes(row.get('Size', ''))
                writer.writerow(row)

        # Write unique files
        self.write_unique_files(output_dir, source1_name, source2_name, unique_to_source1, unique_to_source2, mods1_dict, mods2_dict)

        print(f"✅ Common mods saved to: {common_mods_file.name}")


# =============================================================================
# MAIN APPLICATION ORCHESTRATOR
# =============================================================================

class ModListManager:
    """Main orchestrator class that coordinates all components."""

    def __init__(self, verbose: bool = False, api_base_url: str = "https://api.battlemetrics.com", 
                 workshop_base_url: str = "https://reforger.armaplatform.com/workshop"):
        self.verbose = verbose
        self.file_io = FileIOHandler(verbose)
        self.http_client = HTTPClient(verbose)
        self.battlemetrics_api = BattleMetricsAPI(self.http_client, api_base_url)
        self.workshop_enrichment = WorkshopEnrichment(self.http_client, workshop_base_url)
        self.mod_comparison = ModComparison(self.file_io)
        self.report_generator = ReportGenerator(self.file_io)

    def unified_comparison(self, mods1: List[ModInfo], mods2: List[ModInfo],
                           source1_name: str, source2_name: str, output_dir: Path = None,
                           show_enriched_output: bool = False) -> Dict:
        """
        Unified comparison method that handles both basic and enriched comparisons.

        Args:
            mods1: First mod list
            mods2: Second mod list
            source1_name: Name of first source
            source2_name: Name of second source
            output_dir: Optional directory for output files
            show_enriched_output: Whether to show enriched output with size info

        Returns:
            Dictionary with comparison results
        """
        # Convert to dictionaries for easier comparison
        mods1_dict = {mod.name: mod for mod in mods1}
        mods2_dict = {mod.name: mod for mod in mods2}

        print(f"Source 1 ({source1_name}) contains {len(mods1_dict)} mods")
        print(f"Source 2 ({source2_name}) contains {len(mods2_dict)} mods")
        print()

        # Analyze differences
        identical_mods, version_diff_mods, unique_to_source1, unique_to_source2 = \
            self.mod_comparison.analyze_mod_differences(mods1_dict, mods2_dict)

        comparison_data = ComparisonData(identical_mods, version_diff_mods,
                                       unique_to_source1, unique_to_source2)

        print(f"Common mods found: {len(identical_mods) + len(version_diff_mods)}")
        print()

        # Display results based on enrichment level
        if show_enriched_output:
            self.report_generator.print_enriched_comparison_results(source1_name, source2_name, identical_mods, version_diff_mods,
                                                  unique_to_source1, unique_to_source2,
                                                  mods1_dict, mods2_dict)
        else:
            self.report_generator.print_comparison_results(source1_name, source2_name,
                                         comparison_data, mods1_dict, mods2_dict)

        # Generate output files
        if output_dir:
            output_dir = Path(output_dir)
            output_dir.mkdir(exist_ok=True)

            # Generate comparison files with appropriate level of detail
            self.report_generator.generate_comparison_files(source1_name, source2_name, output_dir,
                                           self.mod_comparison, identical_mods,
                                           version_diff_mods,
                                           unique_to_source1, unique_to_source2,
                                           mods1_dict, mods2_dict,
                                           include_size_columns=show_enriched_output)

        return {
            'common_identical': identical_mods,
            'common_version_diff': version_diff_mods,
            'unique_to_source1': unique_to_source1,
            'unique_to_source2': unique_to_source2,
            'mods1_dict': mods1_dict,
            'mods2_dict': mods2_dict,
            'source1_name': source1_name,
            'source2_name': source2_name
        }


# =============================================================================
# COMMAND LINE INTERFACE
# =============================================================================

def main():
    """Main function with command line interface."""
    parser = argparse.ArgumentParser(
        description="BattleMetrics Server Mod Comparison Tool for Arma Reforger",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Compare two BattleMetrics servers:
  python mod_manager.py 32653210 12345678

  # Compare servers with workshop enrichment (adds mod sizes):
  python mod_manager.py --enrich 32653210 12345678

  # Compare with enrichment and specify output directory:
  python mod_manager.py --enrich --output-dir comparison_results 32653210 12345678

  # Use custom API endpoints:
  python mod_manager.py --bmetrics-base-url https://api.battlemetrics.com --workshop-base-url https://reforger.armaplatform.com/workshop 32653210 12345678

Output files include timestamps for organization:
- srv_{name}_{id}_{timestamp}.csv (individual server mod lists)
- comp_common_{server1}_vs_{server2}_{timestamp}.csv (shared mods)
- comp_unique_to_{name}_{timestamp}.csv (unique mods per server)
        """
    )

    # Main positional arguments
    parser.add_argument('server1_id', help='First server ID (e.g., 32653210)')
    parser.add_argument('server2_id', help='Second server ID (e.g., 12345678)')

    # Options
    parser.add_argument('--enrich', action='store_true',
                       help='Enrich mod data with workshop information (size, etc.)')
    parser.add_argument('--output-dir', type=Path, default=Path('out'),
                       help='Directory for output CSV files (default: out/)')
    parser.add_argument('--bmetrics-base-url', default='https://api.battlemetrics.com',
                       help='Base URL for BattleMetrics API (default: https://api.battlemetrics.com)')
    parser.add_argument('--workshop-base-url', default='https://reforger.armaplatform.com/workshop',
                       help='Base URL for workshop (default: https://reforger.armaplatform.com/workshop)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output')

    args = parser.parse_args()

    manager = ModListManager(verbose=args.verbose, 
                           api_base_url=args.bmetrics_base_url,
                           workshop_base_url=args.workshop_base_url)

    try:
        print("🔍 Comparing BattleMetrics servers:")
        print(f"   Server 1: {args.server1_id}")
        print(f"   Server 2: {args.server2_id}")
        if args.enrich:
            print("   🌐 Workshop enrichment: ENABLED")
        print("=" * 80)

        # Fetch mod data from both servers using server IDs directly
        mods1, server1_name = manager.battlemetrics_api.fetch_mods_by_id(args.server1_id)
        mods2, server2_name = manager.battlemetrics_api.fetch_mods_by_id(args.server2_id)

        if not mods1:
            print(f"❌ Failed to fetch mod data from server {args.server1_id}")
            sys.exit(1)
        if not mods2:
            print(f"❌ Failed to fetch mod data from server {args.server2_id}")
            sys.exit(1)

        # Enrich with workshop data if requested
        if args.enrich:
            print("🌐 Enriching server mod lists with workshop data...")
            print(f"   Enriching {server1_name} mods...")
            mods1 = manager.workshop_enrichment.enrich_mods_with_workshop_data(mods1)
            print(f"   Enriching {server2_name} mods...")
            mods2 = manager.workshop_enrichment.enrich_mods_with_workshop_data(mods2)
            print()

        # Perform the comparison and generate all output files
        print("� Performing mod comparison and generating output files...")
        
        # Use the output directory (now has a default of 'out/')
        output_dir_for_files = args.output_dir
        output_dir_for_files.mkdir(exist_ok=True)

        # Save individual server mod lists
        server1_filename = DataFormatter.generate_server_filename(server1_name, args.server1_id)
        server1_file = output_dir_for_files / server1_filename
        manager.file_io.write_csv_file(server1_file, mods1, include_source=True)
        print(f"✅ Server {args.server1_id} ({server1_name}) mods saved to: {server1_file.name}")

        server2_filename = DataFormatter.generate_server_filename(server2_name, args.server2_id)
        server2_file = output_dir_for_files / server2_filename
        manager.file_io.write_csv_file(server2_file, mods2, include_source=True)
        print(f"✅ Server {args.server2_id} ({server2_name}) mods saved to: {server2_file.name}")
        print()

        # Perform comparison and generate comparison files
        manager.unified_comparison(mods1, mods2, server1_name, server2_name, args.output_dir, 
                                 show_enriched_output=args.enrich)

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
