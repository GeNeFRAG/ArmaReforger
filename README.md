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

### Mortar Calculator (`Arma Reforger Mortar Calc.ods`)
OpenDocument Spreadsheet for artillery fire solution calculations (works with `Fire_Solution_Mgmt.gs`).

## File Structure

```
ArmaReforger/
├── Fire_Solution_Mgmt.gs           # Google Apps Script for fire solutions
├── extract_mods_workshop.py        # Steam Workshop mod extractor
├── modlist_to_json.py              # Mod list converter
├── Arma Reforger Mortar Calc.ods   # Mortar calculation spreadsheet
└── README.md                       # This documentation
```

## Usage

**Mod Management**:
```bash
python modlist_to_json.py input.txt output.json --remove-version
python extract_mods_workshop.py [mod_id]
```

**Google Apps Script**: Import `Arma Reforger Mortar Calc.ods` to Google Sheets, then copy `Fire_Solution_Mgmt.gs` to Google Apps Script and configure cell references

### Setting up Google Apps Script
1. Open your Google Sheets document
2. Go to **Extensions** → **Apps Script**
3. Delete any existing code and paste the contents of `Fire_Solution_Mgmt.gs`
4. Save the project and authorize permissions when prompted
5. Return to your spreadsheet to use the Fire Mission menu

