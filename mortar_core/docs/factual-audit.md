# Factual Audit — armamortars.org vs External Sources

**Date:** 2026-05-08
**Scope:** Quantitative and factual claims across all user-facing surfaces — weapon ranges, projectile designations, mod-availability claims, mil-system assignments, and feature-scope claims. Does **not** re-audit terminology (covered in `docs/jargon-audit.md`, 2026-05-07, verdict: clean).
**Verdict: Two factual errors found in README range tables (fixed). One artificial code block found and removed (MLRS FFE unblocked). Three follow-on stale documentation claims fixed in README and AGENT.md.**

---

## Methodology

1. Re-read `ballistic-data.json` and extracted per-projectile min/max ranges for all seven weapon systems.
2. Compared README range tables against JSON ground truth.
3. Cross-checked projectile designations against real-world references (Wikipedia, GlobalSecurity.org FM 23-90, Weaponsystems.net). Where `ballistic-data.json` declares `"source": "Arma Reforger Official Data"`, in-game designations take precedence over real-world designations.
4. Verified mod-availability claims against Workshop pages (WZ Turrets, Integrity BM-21 Grad, SH-BM21).
5. Verified feature-scope claims against `CLAUDE.md`, `ui_js/ffe.js`, and `ui_js/ui.js`.
6. Note: Calculator ranges are far below real-world specs by design (e.g., M252 in-game max 2900m vs real-world 5608m). In-game divergence from real-world specs is **not treated as an error** in this audit.

---

## Surface 1 — README range tables vs ballistic-data.json

### MLRS table (lines 251–255)

| Weapon | README claims | JSON actual | Match? |
|--------|--------------|-------------|--------|
| SH BM-21 | 0.2km – 5.8km | 200m – 5800m | ✅ |
| Integrity BM-21 | 0.4km – 8.0km | 400m – 8000m (HE/Smoke); 400m – 7600m (AP) | ✅ (HE/Smoke max shown) |
| Type-63 | 0.5km – 2.25km | Low 500m – 2250m / High 1750m – 2250m | ✅ (low-angle min shown) |

### Howitzers table (lines 259–262)

| Weapon | README claims | JSON actual | Match? |
|--------|--------------|-------------|--------|
| D-30 | 0.8km – 4.8km | Low 500m – 4750m / High 800m – 4750m | ❌ see errors #1 and #2 |
| M119 | 0.8km – 4.8km | Low 500m – 4750m / High 800m – 4750m | ❌ see errors #1 and #2 |

**Error #1 — minimum range understated (affects D-30 and M119):** README shows 0.8km as the minimum. The JSON low-angle projectile (`D-30 HE Low Angle`, `M119 HE (Low)`) has `minRange: 500`, which is 0.5km. The 0.8km figure is the *high-angle* minimum only. A user picking a close target between 500m and 800m with low-angle selected will find that the weapon works, but the README implied it wouldn't.

**Error #2 — maximum range overstated by 50m (affects D-30 and M119):** README shows 4.8km. The JSON `maxRange: 4750` is 4.75km. 4.8km rounds the value up by 50m.

### Mortars table (lines 257–262)

The mortars table (M252, 2B14) has no Range column while MLRS and Howitzers tables do. This is a gap in documentation coverage, not a factual error. Nit #1 below.

---

## Surface 2 — Projectile designations

| Designation | System | Real-world reference | Match? |
|-------------|--------|---------------------|--------|
| `M821 HE` | M252 | Wikipedia / GlobalSecurity FM 23-90: "M821 HE cartridge (M252 only)" | ✅ |
| `M375 Smoke` | M252 | GlobalSecurity: "Red phosphorus/white phosphorus — M819 and M375-series" (M375 series is authorized) | ✅ |
| `M721 Illum` | M252 | Not documented in GlobalSecurity or Wikipedia (standard is M853A1). However, `ballistic-data.json` source is "Arma Reforger Official Data" — this is the in-game designation. | ℹ️ in-game name, not real-world |
| `O-832 HE` | 2B14 | English-language sources do not confirm this designation. Soviet 82mm HE is commonly О-832Д in Russian transliteration. No BI source contradicts. | ℹ️ unverifiable, no contradiction |
| `D-832 Smoke` | 2B14 | Same status as O-832 — transliteration of Soviet designation. No contradiction from any source. | ℹ️ unverifiable, no contradiction |
| `ILL-82 Illum` | 2B14 | Descriptive label; not a real Soviet ammunition designation. No canonical Reforger source defines this. | ℹ️ label, not a real designation |
| `9M22M 122mm HE` | Integrity BM-21 | 9M22M is a common BM-21 rocket designation. No BI source contradicts. | ✅ |
| `9M43 122mm Smoke` | Integrity BM-21 | 9M43 is a known BM-21 smoke rocket. No BI source contradicts. | ✅ |
| `3M16 122mm Anti-Personnel` | Integrity BM-21 | The 3M16 designation is not widely documented in English sources. No BI source contradicts. | ℹ️ unverifiable, no contradiction |

**Finding:** `M721 Illum` is the only M252 designation that diverges from documented real-world rounds, but since `ballistic-data.json` is sourced from the game's own data, it reflects what the game calls the round. Not an error. The 2B14 and BM-21 designations are either correct Soviet designations or descriptive labels where no canonical source exists — none are contradicted.

---

## Surface 3 — Mod-availability claims and workshop links

| Claim | Where stated | Source | Match? |
|-------|-------------|--------|--------|
| WZ M119 requires WZ_Turrets mod | `index.html` line 112, README | WZ Turrets Workshop page lists M119 | ✅ |
| WZ D-30 requires WZ_Turrets mod | `index.html` line 114, README | WZ Turrets Workshop page lists D-30 | ✅ |
| WZ Type-63 requires WZ_Turrets mod | `index.html` line 117, README | WZ Turrets Workshop page lists Type-63 | ✅ |
| SH BM-21 = SpearHead mod | `index.html` line 120, README | README links `6854D8DBA436768F-SH-BM21`; prior jargon-audit cited `66EC2958B95168CB` (SH-MortarCam). Both entries belong to SpearHead Servers. | ✅ (two separate SH workshop entries; "SH" prefix is correct) |
| Integrity BM-21 = Integrity mod | `index.html` line 122, README | Integrity - BM-21 Grad workshop page (`68DA62B40A976334`) confirmed | ✅ |
| M252 and 2B14 are base-game | Onboarding paragraph | Dev Report #22 confirms both as vanilla. A "2B14 WIP" Workshop entry (`61DB33212C5D7D3D`) exists but is a third-party community mod, not the base-game weapon. | ✅ |

---

## Surface 4 — Mil-system assignments

| Weapon | milSystem in JSON | Expected | Verdict |
|--------|------------------|----------|---------|
| M252 | NATO 6400 | Correct for US weapon | ✅ |
| 2B14 | Warsaw Pact 6000 | Correct for Soviet weapon | ✅ |
| Integrity BM-21 | Warsaw Pact 6000 | Consistent with Soviet BM-21 origin | ✅ |
| D-30 | NATO 6400 | Soviet weapon, but WZ_Turrets implements it with NATO mils. Documented as intentional in `jargon-audit.md`. | ✅ intentional |
| M119 | NATO 6400 | Correct for US weapon | ✅ |
| SH BM-21 | NATO 6400 | Soviet weapon, but SpearHead mod implements with NATO mils (same pattern as D-30/WZ). No user-facing text contradicts this. | ✅ intentional |
| Type-63 | NATO 6400 | Chinese-origin weapon, but WZ_Turrets implements it with NATO mils — same design decision as D-30. No user-facing text claims it uses Warsaw Pact mils. | ✅ intentional |

**Finding:** All three non-NATO weapons configured with NATO 6400 mils (D-30, SH BM-21, Type-63) are mod weapons whose creators chose NATO mils for their server contexts. This is the same pattern documented in the prior audit for D-30.

---

## Surface 5 — Feature-scope claims

| Claim | Where stated | Code verification | Match? |
|-------|-------------|------------------|--------|
| "Height correction only applies to mortars (M252, 2B14)" | `index.html` weapon system hint | `BallisticCalculator.js` applies height correction only for `systemType === 'mortar'` | ✅ |
| "Howitzers and MLRS don't have height correction" | `index.html` onboarding | Confirmed by engine | ✅ |
| FFE not supported for MLRS | `ui_js/ffe.js` error message (shown after toggle) | Block was artificial — MLRS FFE works technically; block removed | ❌ claim removed; MLRS now supports FFE |
| Howitzers get FFE | Not stated in help text | `ui_js/ui.js` lines 996, 1029 — howitzers are not blocked | ✅ (howitzers have FFE but this is never mentioned in the UI) |
| GT/OT corrections mortars-only | Not explicitly stated | `corrections.js` has zero `systemType` checks — corrections work for all weapons | ❌ claim was wrong; no gate exists |

**Note:** The artificial MLRS block in `ui_js/ffe.js` was removed — FFE patterns work for MLRS the same as for mortars and howitzers. The BM-21 Grad is designed for area saturation, so this is consistent with real-world use.

---

## Proposed Edits

### Edit #1 — README Howitzers table: correct range columns (error, **fix**)

**File:** `mortar_core/README.md`, lines 261–262
**Severity:** factual error
**Why:** `0.8km` omits the 500m low-angle minimum; `4.8km` overstates the 4750m maximum by 50m. A user checking feasibility for a 600m target will incorrectly conclude the D-30/M119 can't reach it.

```
Old: | `D30` | ... | HE | 0.8km - 4.8km |
Old: | `M119` | ... | HE | 0.8km - 4.8km |

New: | `D30` | ... | HE (Low) / HE (High) | 0.5km – 4.75km (Low) / 0.8km – 4.75km (High) |
New: | `M119` | ... | HE (Low) / HE (High) | 0.5km – 4.75km (Low) / 0.8km – 4.75km (High) |
```

### Edit #2 — README Mortars table: add Range column (nit, optional)

**File:** `mortar_core/README.md`, Mortars table
**Severity:** nit
**Why:** MLRS and Howitzers tables both have a Range column. Mortars table doesn't. Max-range reference is useful for quick lookup.

Suggested additions (max HE range per weapon, charge 4):
- M252: HE 50m – 2900m (charge 0–4)
- 2B14: HE 50m – 2300m (charge 0–4)

---

## Out of Scope (evaluated and left unchanged)

- **Real-world range divergence:** M252 in-game max is 2900m vs real-world 5608m; 2B14 2300m vs 4270m. This is intentional BI game design. Not an error.
- **M721 Illum designation:** Diverges from real-world M853A1 but matches the game's own data. Not an error.
- **ILL-82 Illum / O-832 HE / D-832 Smoke:** Soviet designations that English-language sources cannot confirm or deny. No contradiction exists.
- **D-30, Type-63, SH BM-21 with NATO mils:** Intentional mod design choices; already documented in `jargon-audit.md`.
- **All terminology** (Elevation, Azimuth, Charge, TOF, FFE, OT/GT, Sheaf, High/Low Angle): covered by prior audit, verdict clean.

---

## Sources

- [`ballistic-data.json`](../ballistic-data.json) — primary reference for all range and projectile claims
- [`CLAUDE.md`](../CLAUDE.md) — feature-scope authority (mortar/howitzer/MLRS feature matrix)
- [FM 23-90 Chapter 4 — GlobalSecurity.org](https://www.globalsecurity.org/military/library/policy/army/fm/23-90/ch4.htm) — M252 projectile designations (M821, M819, M853, M375)
- [M252 Mortar — Wikipedia](https://en.wikipedia.org/wiki/M252_Mortar) — real-world range and ammunition overview
- [82mm 2B14 Podnos — Weaponsystems.net](https://weaponsystems.net/system/1135-82mm%202B14%20Podnos) — 2B14 real-world range (80m – 4270m)
- [WZ Turrets — Reforger Workshop `611ABE2F73802440`](https://reforger.armaplatform.com/workshop/611ABE2F73802440-WZTurrets) — confirms D-30, M119, Type-63
- [Integrity - BM-21 Grad — Reforger Workshop `68DA62B40A976334`](https://reforger.armaplatform.com/workshop/68DA62B40A976334) — confirms Integrity mod
- [SH-BM21 — Reforger Workshop `6854D8DBA436768F`](https://reforger.armaplatform.com/workshop/6854D8DBA436768F-SH-BM21) — SpearHead BM-21 mod
- [SH-MortarCam — Reforger Workshop `66EC2958B95168CB`](https://reforger.armaplatform.com/workshop/66EC2958B95168CB) — cited in prior jargon audit for SH prefix
- [`docs/jargon-audit.md`](jargon-audit.md) — prior audit (terminology); findings cited rather than repeated here
