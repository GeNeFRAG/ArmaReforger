# Architecture

## Module graph

```
index.html
  └─ <script type="module" src="ui_js/main.js">
       │
       ├─ BallisticCalculator.js ──── ballistic-data.json
       │    (engine, framework-agnostic)
       │
       ├─ ui_js/calculator.js       (calculation UI + mission card rendering)
       ├─ ui_js/corrections.js      (Add/Drop, Left/Right, FO mode)
       ├─ ui_js/ffe.js              (Fire for Effect patterns)
       ├─ ui_js/history.js          (localStorage mission history)
       ├─ ui_js/share.js            (Base64 URL session sharing)
       │
       ├─ ui_js/coord-manager.js    (parse + validate grid/meter coords — single source)
       ├─ ui_js/state.js            (centralized cross-module state)
       ├─ ui_js/dom-cache.js        (getElementById cache)
       ├─ ui_js/onboarding.js       (first-visit overlay)
       │
       └─ ui_js/constants.js / utils.js   (shared constants + pure helpers)
```

`main.js` is the only wiring point. It calls `setDependencies(deps)` on every module that needs collaborators, which avoids circular imports. UI modules do not import each other directly.

## Data flow

```
User types coordinates
  → coord-manager.js: parsePosition() → { x, y, z }
  → BallisticCalculator.prepareInput(weaponPos, targetPos, weaponId, ammoType)
      → returns { distance, heightDifference, bearing, weaponId, ammoType }
  → BallisticCalculator.calculate(input)
      → charge selection → interpolation → elevation + azimuth
      → returns { inRange, charge, elevation, azimuth, timeOfFlight, … }
  → calculator.js: renders mission card in the DOM

Optional downstream:
  corrections.js: apply Add/Drop, Left/Right → recalculate → new card
  ffe.js: generate pattern (lateral/linear/circular) → N solution cards
  history.js: save to localStorage
  share.js: encode to Base64 URL param
```

## BallisticCalculator.js sections

The engine is organized into six numbered sections:

| Section | Contents |
|---------|---------|
| 1: Type Definitions | JSDoc `@typedef` for `Position3D`, `GridCoordinate`, `BallisticInput`, etc. |
| 2: Geometry | `calculateDistance`, `calculateBearing`, `calculateHeightDiff` |
| 3: Data Management | `loadBallisticData`, `normalizeBallisticData`, `getWeaponConfig`, `getAllWeaponSystems`, `getAmmunitionOptions` |
| 4: Solver | `interpolateFromTable`, `selectCharge`, `calculateMortarElevation`, `calculateHowAndMLRS`, fire correction math, FFE pattern generation |
| 5: API | `prepareInput`, `calculate`, `calculateWithCorrections`, `generateFFEPattern`, `sortFFESolutionsByAzimuth` |
| 6: Exports | `module.exports` (Node.js) + `window.BallisticCalculator` (browser) |

## ballistic-data.json schema

Top level: `{ version, source, lastUpdated, weaponSystems[] }`

Each `WeaponSystem` has `systemType: "mortar" | "howitzer" | "mlrs"` which controls:
- **mortar**: `shellTypes[]` → `charges[]` (level, minRange, maxRange) → `rangeTable[]` (range, elevation, tof, dElev, tofPer100m). Supports corrections and FFE.
- **howitzer / mlrs**: `projectileTypes[]` (id, name, type, variant, minRange, maxRange) → `ballisticTable[]` (range, elevation, tof, windDrift100m, angleOfFall; dElev/tofPer100m nullable).

See [ADDING_A_WEAPON.md](ADDING_A_WEAPON.md) for the full schema example and [../schemas/ballistic-data.schema.json](../schemas/ballistic-data.schema.json) for the machine-readable schema.

## Environment notes

- **No build step.** Files are served from disk via Nginx. Edit → refresh browser.
- **Docker is required for tests** (Playwright hits `localhost:3000`). The engine can be exercised standalone via `npm run engine:demo` without Docker.
- **Dual export.** `BallisticCalculator.js` exposes `module.exports` for Node.js and `window.BallisticCalculator` for browsers. The `examples/` scripts use the CommonJS path.
