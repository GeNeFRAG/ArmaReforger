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
- **`modlist_to_json.py`**: Creates ready-to-go Arma Reforger server configurations from mod lists  
- **`mod_manager.py`**: BattleMetrics server mod comparison tool with workshop enrichment

### Mortar Calculator (`Arma Reforger Mortar Calc.ods`)
OpenDocument Spreadsheet for artillery fire solution calculations (works with `Fire_Solution_Mgmt.gs`).

## File Structure

```
ArmaReforger/
├── Fire_Solution_Mgmt.gs           # Google Apps Script for fire solutions
├── extract_mods_workshop.py        # Steam Workshop mod extractor
├── modlist_to_json.py              # Arma Reforger server config generator
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

**Arma Reforger Server Configuration (`modlist_to_json.py`)**:

Generate ready-to-go server configurations for Arma Reforger custom servers:
```bash
# Create server config from mod list
python modlist_to_json.py server_mods.txt server_config.json

# Generate config without version dependencies for compatibility
python modlist_to_json.py server_mods.txt server_config.json --remove-version

# Compare current server config with new mod list
python modlist_to_json.py new_mods.txt updated_config.json --compare current_config.json

# Generate production-ready config with formatting
python modlist_to_json.py mods.txt production_config.json --pretty-print
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

### Arma Reforger Server Configuration Generator Features

The `modlist_to_json.py` script creates production-ready server configurations for Arma Reforger custom servers:

**Server Configuration Generation**:
- Direct conversion from mod lists to Arma Reforger server JSON format
- Automatic mod ID and version parsing for server compatibility
- Ready-to-deploy configuration files for custom servers
- Support for standard Arma Reforger server.txt input format

**Configuration Management**:
- Version-flexible configs (with/without version constraints)
- Production and development configuration profiles
- Automatic mod dependency ordering and validation
- Server-ready JSON structure generation

**Server Deployment Features**:
- One-click configuration deployment preparation
- Backup and rollback configuration management
- Configuration versioning and change tracking
- Integration with server management workflows

**Validation and Quality Assurance**:
- Server configuration syntax validation
- Mod ID format verification and standardization
- Duplicate mod detection and cleanup
- Invalid entry identification and error reporting

**Configuration Comparison and Updates**:
- Server configuration diff generation for updates
- Added/removed mod tracking between configurations
- Version change analysis for server migrations
- Rollback preparation and conflict resolution

**Production Ready Output**:
- Arma Reforger server-compatible JSON format
- Optimized configuration structure for game server parsing
- Multiple formatting options (compact/readable)
- Direct integration with Arma Reforger dedicated servers

**Advanced Server Management**:
- Multi-server configuration synchronization
- Template-based configuration generation
- Automated server update preparation
- Configuration validation against Arma Reforger requirements

**Use Cases**:
- Custom Arma Reforger server setup and deployment
- Server mod list management and updates
- Production server configuration maintenance
- Server migration and backup preparation
- Automated server deployment pipelines
- Multi-server farm configuration management

**Google Apps Script**: Import `Arma Reforger Mortar Calc.ods` to Google Sheets, then copy `Fire_Solution_Mgmt.gs` to Google Apps Script and configure cell references

### Setting up Google Apps Script
1. Open your Google Sheets document
2. Go to **Extensions** → **Apps Script**
3. Delete any existing code and paste the contents of `Fire_Solution_Mgmt.gs`
4. Save the project and authorize permissions when prompted
5. Return to your spreadsheet to use the Fire Mission menu

