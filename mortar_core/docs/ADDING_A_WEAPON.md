# Adding a New Weapon System

The weapon dropdown is populated automatically from `ballistic-data.json` via `getAllWeaponSystems()` (`BallisticCalculator.js:596`) called in `ui_js/main.js:179`. In most cases, adding a weapon is a **JSON-only change** — no UI code edits required.

## Step 1 — Pick the weapon category

| `systemType` | Example | Features |
|---|---|---|
| `mortar` | M252, 2B14 | Fire corrections + FFE + charge selection |
| `howitzer` | M119, D30 | FFE only; HA/LA variants as separate `projectileTypes` |
| `mlrs` | TYPE63, SH_BM21, INTEGRITY_BM21 | Range-based auto projectile selection; no corrections or FFE |

## Step 2 — Add the entry to `ballistic-data.json`

Append to the `weaponSystems` array. Update `lastUpdated` (ISO 8601) after editing.

### Mortar template

```json
{
  "systemType": "mortar",
  "id": "YOUR_ID",
  "name": "Display Name (e.g. US M999 60mm Mortar)",
  "caliber": 60,
  "milSystem": {
    "name": "NATO",
    "milsPerCircle": 6400,
    "milsPerDegree": 17.7778
  },
  "shellTypes": [
    {
      "type": "HE",
      "name": "M888 HE",
      "charges": [
        {
          "level": 0,
          "minRange": 50,
          "maxRange": 400,
          "rangeTable": [
            { "range": 50,  "elevation": 1455, "tof": 14.0, "dElev": 44, "tofPer100m": 0.0 },
            { "range": 100, "elevation": 1411, "tof": 14.5, "dElev": 46, "tofPer100m": 0.1 }
          ]
        },
        {
          "level": 1,
          "minRange": 100,
          "maxRange": 800,
          "rangeTable": [
            { "range": 100, "elevation": 1446, "tof": 19.5, "dElev": 27, "tofPer100m": 0.1 }
          ]
        }
      ]
    }
  ]
}
```

**`milsPerDegree`**: NATO = `6400 / 360 ≈ 17.7778`; Warsaw Pact = `6000 / 360 ≈ 16.6667`

**`rangeTable` fields:**
- `range` — distance in meters (must be ascending)
- `elevation` — mils (firing elevation)
- `tof` — time of flight in seconds
- `dElev` — mils change per 100m range (used for height correction interpolation)
- `tofPer100m` — seconds per 100m (used for height correction interpolation)

### MLRS / Howitzer template

These use `projectileTypes[]` and `ballisticTable[]` (not `charges`/`rangeTable`):

```json
{
  "systemType": "mlrs",
  "id": "MY_MLRS",
  "name": "Display Name",
  "caliber": 122,
  "milSystem": {
    "name": "Warsaw Pact",
    "milsPerCircle": 6000,
    "milsPerDegree": 16.6667
  },
  "projectileTypes": [
    {
      "id": "my_mlrs_he",
      "name": "My MLRS HE",
      "type": "HE",
      "variant": "standard",
      "minRange": 500,
      "maxRange": 8000,
      "ballisticTable": [
        { "range": 500,  "elevation": 100, "tof": null, "windDrift100m": null, "angleOfFall": null },
        { "range": 1000, "elevation": 200, "tof": null, "windDrift100m": null, "angleOfFall": null }
      ]
    }
  ]
}
```

For howitzers, add `Low Angle` and `High Angle` as separate entries in `projectileTypes` using `"variant": "low_angle"` / `"variant": "high_angle"`. See the `D30` or `M119` entries in `ballistic-data.json` for a complete example.

**`ballisticTable` fields** — `tof`, `windDrift100m`, `angleOfFall`, `dElev`, `tofPer100m` may be `null` if data is unavailable.

## Step 3 — Verify without Docker

```bash
# Confirm the JSON still parses
npm run validate:data

# Confirm the engine loads and can use the new weapon
npm run engine:demo
```

Edit `examples/node-example.js` temporarily (change `"2B14"` to your weapon ID) to see a live solution. The app's dropdown will include your weapon on next page load — no code change needed.

## Step 4 — Add a Playwright check

**`tests/e2e/fixtures/test-data.js`** — add an entry to `WEAPONS`:

```js
'MY_NEW_WEAPON': {
  name: 'My new weapon display name',
  shellTypes: ['HE']   // or projectileTypes for MLRS/howitzer
}
```

**`tests/e2e/weapon-selection.spec.js`** — add a display-name assertion inside the existing `'should display all weapon systems in dropdown'` test, or copy an existing `selectOption` test.

**`tests/e2e/calculation.spec.js`** — add an entry to `EXPECTED_RESULTS` in `test-data.js` and a corresponding `test(…)` block to cover a known solution.

Run the new tests:
```bash
npm run test:e2e:chromium
```

## Step 5 — Update the README

Add the weapon to the "Multiple ballistic weapon systems" bullet in `mortar_core/README.md`.

## Step 6 — Bump versions

- `ballistic-data.json` → update `lastUpdated` to the current ISO timestamp
- `package.json` → bump `version` (if releasing a new build)
- `sw.js` → bump `CACHE_VERSION` to match the new version (e.g. `'v2.14.0'`) — forces deployed users to re-download updated assets
- `index.html` → update the `?v=` query strings on `styles.css` and `BallisticCalculator.js` if those files changed

## What NOT to do

- Do not hardcode the weapon ID in any `.js` or `.html` file. The only place a weapon ID should appear in non-test code is `ballistic-data.json` and the `weaponOrder`/`howitzerOrder` arrays in `ui_js/main.js` (which only control sort order for display).
- Do not add a manual `<option>` to the `#mortarType` `<select>` in `index.html`. The dropdown is built dynamically.
- Do not add an `id` that conflicts with an existing one — `getAllWeaponSystems()` does not deduplicate.
