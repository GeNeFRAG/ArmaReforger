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

**Mod Management**:

Extract mod info from Steam Workshop (recursively includes dependencies):
```bash
python extract_mods_workshop.py <mod_id>
# Creates mods.json with mod details and all dependencies
```

Convert server mod list to JSON format:
```bash
python modlist_to_json.py input.txt output.json [--remove-version]
# --remove-version: Omits version field from JSON output
```

Compare mod lists between server.txt and JSON:
```bash
python modlist_to_json.py server.txt diff.json --compare existing.json
# Creates diff showing added/removed mods between files
```

**Comprehensive Mod List Management (`mod_manager.py`)**:

Compare BattleMetrics servers and analyze mod differences:
```bash
# Compare two BattleMetrics servers (using server IDs)
python mod_manager.py 32653210 12345678

# Compare servers with workshop enrichment (adds mod sizes):
python mod_manager.py --enrich 32653210 12345678

# Compare servers and save individual server files:
python mod_manager.py --save-files 32653210 12345678

# Compare with enrichment and save all output files:
python mod_manager.py --enrich --save-files --output-dir comparison_results 32653210 12345678
```

Advanced options:
```bash
# Verbose output for debugging
python mod_manager.py --verbose 32653210 12345678

# Use custom BattleMetrics URL
python mod_manager.py --base-url https://www.battlemetrics.com/servers/reforger 32653210 12345678
```

### Mod Manager Features

The `mod_manager.py` script provides comprehensive mod list management capabilities for Arma Reforger servers:

**BattleMetrics Integration**:
- Fetch mod lists directly from BattleMetrics server pages using server IDs
- Automatic server name detection and sanitization
- Support for custom BattleMetrics URLs

**Workshop Enrichment**:
- Optional enrichment with Steam Workshop data (mod sizes, dependencies)
- Caching system for efficient repeated operations
- Size information in human-readable format with byte conversion

**Server Comparison Features**:
- Compare mod lists between two BattleMetrics servers
- Categorize mods as: Identical, Version Differences, ID Differences, Unique to each server
- Generate detailed analysis reports with statistics
- Support for enriched comparisons with size information

**Output Files Generated**:
- `comp_common_{server1}_vs_{server2}_{timestamp}.csv`: All mods present in both servers with status indicators and version comparison
- `comp_unique_to_{servername}_{timestamp}.csv`: Mods exclusive to each server  
- `srv_{servername}_{serverid}_{timestamp}.csv`: Individual server mod lists (when using `--save-files`)
- All files include timestamps (YYYYMMDD_HHMMSS) for organization and avoiding conflicts
- Detailed console output with formatted comparison results and size totals

**Filename Convention**:
All output files use consistent timestamped naming:
- Server files: `srv_{name}_{id}_{timestamp}.csv`
- Common mods: `comp_common_{server1}_vs_{server2}_{timestamp}.csv`
- Unique mods: `comp_unique_to_{name}_{timestamp}.csv`

This ensures easy identification of comparison context and prevents file conflicts when running multiple comparisons.

**Use Cases**:
- Server mod synchronization and management
- Mod pack version comparison between servers
- Identifying missing or outdated mods between server configurations
- Generating reports for mod compatibility analysis
- Server migration planning and mod list auditing

**Google Apps Script**: Import `Arma Reforger Mortar Calc.ods` to Google Sheets, then copy `Fire_Solution_Mgmt.gs` to Google Apps Script and configure cell references

### Setting up Google Apps Script
1. Open your Google Sheets document
2. Go to **Extensions** → **Apps Script**
3. Delete any existing code and paste the contents of `Fire_Solution_Mgmt.gs`
4. Save the project and authorize permissions when prompted
5. Return to your spreadsheet to use the Fire Mission menu

