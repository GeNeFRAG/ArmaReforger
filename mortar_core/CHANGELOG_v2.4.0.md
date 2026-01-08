# Version 2.4.0 - MLRS Integration

**Release Date:** January 2026

## 🚀 Major Features

### BM-21 Grad MLRS Support
- **13 rocket types** with realistic ballistic profiles
- Range coverage: 2.8km to 40km
- Rocket families:
  - **9M22** - HE fragmentation (3 range variants)
  - **9M43** - Smoke screening (3 range variants)
  - **3M16** - Cluster munitions (3 range variants)
  - **9M28K** - Incendiary cluster (4 range variants)

### Enhanced UI/UX
- **Weapon dropdown ordering**: M252 (US) first, then 2B14 (Soviet), then MLRS systems
- **Projectile grouping**: Rockets grouped by model designation (9M22, 9M43, 3M16, 9M28K)
- **Range display**: Each projectile shows effective range (e.g., "9M22 HE Medium (9800-13200m)")
- **Dynamic range validation**: Updates immediately when switching weapons or projectiles
- **Mission history**: Shows weapon and projectile names instead of IDs

## 🏗️ Architecture Improvements

### Generic Variable Naming
**Changed throughout codebase:**
- `mortarPos` → `weaponPos` (generic position parameter)
- `mortarId` → `weaponId` (generic weapon identifier)
- `mortarType` → `weaponId` (in CalculatorInput typedef)

**DOM element IDs unchanged** to maintain backward compatibility:
- `mortarX`, `mortarY`, `mortarZ` (still in HTML)
- `mortarType` (dropdown ID)

### System Type Detection
- Automatic detection of `mortar` vs `mlrs` system type
- Conditional feature enabling based on weapon system:
  - **Mortars**: Charge selection (0-4), FFE patterns, fire corrections
  - **MLRS**: Single charge (0), no FFE/corrections (tactical - rockets already provide area saturation)

### Updated Modules

#### BallisticCalculator.js
- `prepareInput(weaponPos, targetPos, weaponId, shellType)` - Generic parameters
- `applyFireCorrection(weaponPos, ...)` - Generic position parameter
- `applyFireCorrectionFromObserver(weaponPos, ...)` - Generic position parameter
- `generateFireForEffectPattern(weaponPos, ...)` - Generic position parameter
- `CalculatorInput` typedef: `weaponId` instead of `mortarId`

#### calculator.js
- `getShellTypesForMortar()`: Changed sorting from type to model designation
- `generateSolutionGridHTML()`: Detects systemType, hides charge field for MLRS
- `calculateSolution()`: Added systemType detection, disabled FFE/corrections for MLRS
- `generateMissionCardHTML()`: Fixed `lastInput.weaponId` references
- All function parameters: `weaponPos`, `weaponId`

#### ui.js
- `validateCoordinateRange()`: Immediate validation on weapon/projectile change
- Weapon dropdown handler: Async await for `updateShellTypes()`, clears output
- Shell type handler: Triggers range validation immediately
- Fixed input parameter check in error handler

#### history.js
- `addToHistory(weaponPos, ...)`: Generic parameter
- `updateHistoryDisplay()`: Shows weapon and projectile names from ballistic data
- Lookup logic: Finds projectile by ID and displays human-readable name

#### ffe.js
- MLRS detection: Throws error if FFE attempted with MLRS
- All parameters: `weaponPos`
- Backward compatibility: `lastInput.weaponId || lastInput.mortarType`

#### corrections.js
- All parameters: `weaponPos`
- Fire correction widget hidden for MLRS in UI

#### coord-manager.js
- `setPositions(weaponPos, targetPos)`: Generic parameter

#### main.js
- `updateWeaponSystems()`: Custom weapon ordering (M252 → 2B14 → MLRS)
- Optgroups: "🎯 Mortars" and "🚀 MLRS"

## 🐛 Bug Fixes

### Range Validation
- **Fixed**: Range validation not updating when switching weapons
- **Fixed**: Range validation not updating when switching projectile types
- **Solution**: Immediate `validateCoordinateRange()` call on dropdown change

### Weapon Switching
- **Fixed**: Stale calculation data when switching weapons
- **Solution**: `clearOutput()` before validation when weapon changes

### Property Naming
- **Fixed**: `lastInput.mortarType` references causing "undefined" errors
- **Solution**: Updated to `lastInput.weaponId` throughout codebase

### Async Race Condition
- **Fixed**: Validation running before `updateShellTypes()` completes
- **Solution**: `await dependencies.updateShellTypes()` in weapon dropdown handler

### Error Handler
- **Fixed**: `input.id` accessed without null check
- **Solution**: Added `input &&` check before property access

## 📚 Documentation Updates

### README.md
- Updated title: "Ballistic Calculator" (not just "Mortar")
- Added MLRS to features list
- Updated supported weapons table with M252, 2B14, BM21_GRAD
- Added BM-21 Grad projectile types table
- New v2.4.0 changelog section
- Updated Node.js examples with both mortar and MLRS

### BallisticCalculator-API.md
- Updated overview to include MLRS
- Added MLRS to features list
- Updated `CalculatorInput` typedef with `weaponId`
- Updated all function parameters: `weaponPos`, `weaponId`
- New "MLRS-Specific Usage" section
- Rocket selection guide table
- MLRS limitations and tactical usage notes
- Added Example 6: MLRS calculation with automatic rocket selection
- Updated all code examples to use new weapon IDs (M252, 2B14, BM21_GRAD)
- Updated error messages table

## 🔄 Backward Compatibility

### History Entries
- Old history entries with `mortarType` still load correctly
- Fallback: `lastInput.weaponId || lastInput.mortarType`

### DOM Elements
- Element IDs unchanged: `mortarX`, `mortarY`, `mortarZ`, `mortarType`
- Only internal variable names changed to generic equivalents

### API Compatibility
- All public API functions maintain same signatures
- New generic parameter names are backward compatible
- Old code using `mortarPos`/`mortarId` still works (JavaScript flexibility)

## 📊 Testing

### Integration Tests
- ✅ All 10 integration tests passing
- Test coverage includes:
  - Mortar calculations (M252, 2B14)
  - MLRS calculations (BM-21 Grad)
  - FFE patterns (mortar only)
  - Fire corrections (mortar only)
  - Grid coordinate conversion
  - Position-based calculations

## 🎯 Tactical Notes

### MLRS vs Mortars
**When to use MLRS:**
- Long-range targets (10km+)
- Area saturation required
- Rapid fire mission (40 rockets in 20 seconds)
- Smoke screening of large areas

**When to use Mortars:**
- Precision fires
- Adjustable fire missions (corrections)
- Fire for Effect patterns
- Close support (< 5km)

### Projectile Selection
The calculator requires manual rocket selection based on range:
- **3-10km**: Short range rockets (9M22 Short, 9M28K Short)
- **10-13km**: Medium range rockets (9M22 Medium)
- **13-20km**: Long range rockets (9M22 Long, 3M16 Medium/Long)
- **20-40km**: Extra long range (3M16 XL, 9M28K XL)

This mimics real-world MLRS operation where crew selects appropriate rocket type for mission.

## 🚀 Migration Guide

### For Developers

**Update function calls:**
```javascript
// Old (still works, but deprecated)
BallisticCalculator.prepareInput(mortarPos, targetPos, mortarId, shellType);

// New (recommended)
BallisticCalculator.prepareInput(weaponPos, targetPos, weaponId, shellType);
```

**Update weapon IDs:**
```javascript
// Old IDs (deprecated)
weaponId: "RUS"  // ❌ Old
weaponId: "US"   // ❌ Old

// New IDs
weaponId: "2B14"      // ✅ Soviet 82mm mortar
weaponId: "M252"      // ✅ US 81mm mortar
weaponId: "BM21_GRAD" // ✅ BM-21 Grad MLRS
```

**Check system type:**
```javascript
const config = BallisticCalculator.getWeaponConfig(weaponId, shellType);
if (config.systemType === 'mlrs') {
    // MLRS-specific logic
    console.log('Fire for Effect not available for MLRS');
} else {
    // Mortar-specific logic
    generateFFEPattern();
}
```

### For Users

**No action required** - All changes are backward compatible. Old bookmarks, saved missions, and history entries will continue to work.

## 🔗 Links

- **Live Calculator**: [armamortars.org](https://armamortars.org)
- **Discord**: [F.I.S.T Community](http://discord.gg/Gb8Nt92J3m)
- **GitHub**: [GeNeFRAG/ArmaReforger](https://github.com/GeNeFRAG/ArmaReforger)

---

**Contributors**: GeNeFRAG  
**Testing**: F.I.S.T Community  
**License**: MIT
