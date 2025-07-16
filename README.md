# ArmaReforger

Tools and scripts for Arma Reforger server management and artillery calculations.

## Tools

### Fire Solution Management (`Fire_Solution_Mgmt.gs`)
Google Apps Script for managing artillery fire mission parameters (requires `Arma Reforger Mortar Calc.ods`):
- Store and load fire solutions with timestamps
- Dropdown selection for quick mission access
- Menu-driven interface with validation

### Mod Management Tools
- **`extract_mods_workshop.py`**: Extracts mod metadata and dependencies from Steam Workshop
- **`modlist_to_json.py`**: Converts server.txt mod lists to JSON format  
- **`mod_manager.py`**: BattleMetrics server mod comparison tool with workshop enrichment

### Mortar Calculator (`Arma Reforger Mortar Calc.ods`)
OpenDocument Spreadsheet for artillery fire solution calculations (works with `Fire_Solution_Mgmt.gs`).

## File Structure

```
ArmaReforger/
├── Fire_Solution_Mgmt.gs           # Google Apps Script for fire solutions
├── extract_mods_workshop.py        # Steam Workshop mod extractor
├── modlist_to_json.py              # Mod list converter
├── mod_manager.py                  # BattleMetrics server comparison tool
├── Arma Reforger Mortar Calc.ods   # Mortar calculation spreadsheet
└── README.md                       # This documentation
```

## Usage

**Steam Workshop Mod Extraction (`extract_mods_workshop.py`)**:

Extract comprehensive mod information from Steam Workshop with dependency resolution:
```bash
# Extract single mod with all dependencies
python extract_mods_workshop.py 123456789

# Extract mod with custom output file
python extract_mods_workshop.py 123456789 --output custom_mods.json

# Verbose output for debugging
python extract_mods_workshop.py 123456789 --verbose
```

**Server Mod List Conversion (`modlist_to_json.py`)**:

Convert and compare server mod lists between different formats:
```bash
# Convert server.txt to JSON format
python modlist_to_json.py input.txt output.json

# Remove version field from JSON output
python modlist_to_json.py input.txt output.json --remove-version

# Compare server.txt against existing JSON and create diff
python modlist_to_json.py server.txt diff.json --compare existing.json

# Convert with custom formatting
python modlist_to_json.py input.txt output.json --pretty-print
```

**Comprehensive Mod List Management (`mod_manager.py`)**:

Compare BattleMetrics servers and analyze mod differences:
```bash
# Compare two BattleMetrics servers (using server IDs)
python mod_manager.py 32653210 12345678

# Compare servers with workshop enrichment (adds mod sizes):
python mod_manager.py --enrich 32653210 12345678

# Compare with enrichment and specify output directory:
python mod_manager.py --enrich --output-dir comparison_results 32653210 12345678

# Use custom API endpoints:
python mod_manager.py --bmetrics-base-url https://api.battlemetrics.com --workshop-base-url https://reforger.armaplatform.com/workshop 32653210 12345678
```

Advanced options:
```bash
# Verbose output for debugging
python mod_manager.py --verbose 32653210 12345678

# All files are automatically saved to output directory (default: out/)
python mod_manager.py --output-dir my_comparison_results 32653210 12345678
```

### Mod Manager Features

The `mod_manager.py` script provides comprehensive mod list management capabilities for Arma Reforger servers:

**BattleMetrics Integration**:
- Fetch mod lists directly from BattleMetrics servers using server IDs only
- Automatic server name detection and sanitization
- Efficient API-based data retrieval without URL construction overhead
- Support for custom BattleMetrics API endpoints

**Workshop Enrichment**:
- Optional enrichment with Steam Workshop data (mod sizes, dependencies)
- Intelligent caching system for efficient repeated operations
- Size information in human-readable format with byte conversion
- Support for custom workshop URLs

**Server Comparison Features**:
- Compare mod lists between two BattleMetrics servers
- Categorize mods as: Identical, Version Differences, Unique to each server
- Generate detailed analysis reports with statistics
- Support for enriched comparisons with size information
- Streamlined processing with single-pass file generation

**Output Files Generated** (Always Saved):
- `srv_{servername}_{serverid}_{timestamp}.csv`: Individual server mod lists with enrichment data
- `comp_common_{server1}_vs_{server2}_{timestamp}.csv`: All mods present in both servers with status indicators and version comparison
- `comp_unique_to_{servername}_{timestamp}.csv`: Mods exclusive to each server  
- All files include timestamps (YYYYMMDD_HHMMSS) for organization and avoiding conflicts
- Detailed console output with formatted comparison results and size totals

**Filename Convention**:
All output files use consistent timestamped naming:
- Server files: `srv_{name}_{id}_{timestamp}.csv`
- Common mods: `comp_common_{server1}_vs_{server2}_{timestamp}.csv`
- Unique mods: `comp_unique_to_{name}_{timestamp}.csv`

This ensures easy identification of comparison context and prevents file conflicts when running multiple comparisons.

**Recent Improvements**:
- Simplified command-line interface with automatic file saving
- Removed redundant URL construction (server IDs used directly)
- Enhanced efficiency with optimized comparison workflow
- Cleaner parameter naming (`--bmetrics-base-url` for API endpoints)
- Conditional enriched output display based on `--enrich` flag

**Use Cases**:
- Server mod synchronization and management
- Mod pack version comparison between servers
- Identifying missing or outdated mods between server configurations
- Generating reports for mod compatibility analysis
- Server migration planning and mod list auditing

### Steam Workshop Mod Extractor Features

The `extract_mods_workshop.py` script provides comprehensive Steam Workshop mod analysis with dependency tracking:

**Workshop Integration**:
- Direct Steam Workshop API integration for mod metadata retrieval
- Automatic parsing of mod pages for detailed information
- Support for both public and unlisted mods
- Real-time data fetching with error handling

**Dependency Resolution**:
- Recursive dependency discovery and analysis
- Complete dependency tree mapping
- Circular dependency detection and handling
- Hierarchical dependency structure preservation

**Mod Information Extracted**:
- Mod name, description, and author details
- File size and download statistics
- Creation and update timestamps
- Steam Workshop ratings and subscriber counts
- Dependency relationships and version requirements
- Tags and category classifications

**Output Features**:
- Structured JSON output with nested dependency information
- Human-readable formatting options
- Configurable output file naming
- Comprehensive error reporting and logging
- Progress tracking for large dependency trees

**Advanced Capabilities**:
- Batch processing support for multiple mod IDs
- Caching mechanism for improved performance on repeated queries
- Dependency conflict detection and reporting
- Mod compatibility analysis across different versions
- Integration-ready output format for automated tools

**Use Cases**:
- Mod pack creation and dependency management
- Server mod list validation and verification
- Dependency conflict resolution
- Mod compatibility analysis for server migrations
- Automated mod collection building

### Server Mod List Converter Features

The `modlist_to_json.py` script provides flexible server mod list management and format conversion:

**File Format Support**:
- Server.txt format parsing (standard Arma Reforger format)
- JSON output with structured data organization
- Configurable field inclusion/exclusion
- Multiple input encoding support (UTF-8, ASCII)

**Conversion Features**:
- Automatic mod ID and version extraction
- Optional version field removal for compatibility
- Pretty-print JSON formatting for readability
- Compact JSON output for production use
- Custom field mapping and transformation

**Comparison Capabilities**:
- Side-by-side mod list comparison
- Added/removed mod detection
- Version change tracking
- Detailed diff generation with change summaries
- Conflict identification and resolution suggestions

**Validation and Error Handling**:
- Input file format validation
- Malformed mod entry detection and reporting
- Duplicate mod ID identification
- Missing dependency warnings
- Comprehensive error logging with line numbers

**Output Options**:
- Multiple output format support (JSON, CSV, TXT)
- Configurable field ordering and naming
- Timestamped output files for version tracking
- Backup creation for destructive operations
- Integration with external tools and APIs

**Advanced Features**:
- Batch processing for multiple server files
- Template-based output generation
- Custom filtering and sorting options
- Mod metadata enrichment from external sources
- Integration with version control systems

**Use Cases**:
- Server configuration management and versioning
- Mod list standardization across multiple servers
- Configuration backup and restoration
- Server deployment automation
- Mod list auditing and compliance checking

**Google Apps Script**: Import `Arma Reforger Mortar Calc.ods` to Google Sheets, then copy `Fire_Solution_Mgmt.gs` to Google Apps Script and configure cell references

### Setting up Google Apps Script
1. Open your Google Sheets document
2. Go to **Extensions** → **Apps Script**
3. Delete any existing code and paste the contents of `Fire_Solution_Mgmt.gs`
4. Save the project and authorize permissions when prompted
5. Return to your spreadsheet to use the Fire Mission menu

