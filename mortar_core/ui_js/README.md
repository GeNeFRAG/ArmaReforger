# ui_js/

ES6 modules for the calculator UI. Each module has a single responsibility and exports a `setDependencies(deps)` function. **`main.js` is the only file that imports and wires these modules together** — modules never import each other directly.

| Module | Role |
|--------|------|
| `main.js` | App bootstrap: loads data, calls `setDependencies()`, populates weapon dropdown, wires initial events |
| `calculator.js` | Calculation trigger, mission card rendering, range validation |
| `corrections.js` | Add/Drop and Left/Right fire correction UI; Gun-Target and Observer-Target line modes |
| `ffe.js` | Fire for Effect widget: lateral/linear sheaf, circular saturation |
| `history.js` | localStorage-backed mission history (save, restore, delete, export) |
| `share.js` | Base64 URL encoding/decoding for session sharing |
| `coord-manager.js` | Single source of truth for coordinate parsing and validation (3-digit/4-digit grid, meters) |
| `state.js` | Centralized state replacing `window.*` globals |
| `dom-cache.js` | Memoised `getElementById` wrapper |
| `onboarding.js` | First-visit overlay |
| `constants.js` | `INPUT_IDS`, `COLORS`, `BTN_STYLES`, `SHARE_CONSTANTS`, `DYNAMIC_ELEMENTS` |
| `utils.js` | Pure helpers: `debounce`, `setDisplay`, `formatPositionDisplay` |

The DOM is the source of truth for UI state. Do not introduce a virtual DOM or state management library.
