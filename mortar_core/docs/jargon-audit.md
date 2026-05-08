# Jargon Audit — armamortars.org vs Arma Reforger Canon

**Date:** 2026-05-07  
**Scope:** User-facing help text, weapon names, and projectile names across all four surfaces  
**Verdict: No clear terminology mistakes found.** Two nits proposed below.

---

## Methodology

1. Inventoried every user-facing string in `index.html`, `ui_js/*.js`, `ballistic-data.json`, and `README.md`.
2. Cross-checked against:
   - **BI Dev Report #22** (the only BI document that describes Reforger mortar mechanics in player-facing terms)
   - **Bohemia Interactive Script API** (`SCR_MortarShellGadgetComponent`, `SCR_AIShootStaticArtillery`)
   - **Armed Assault Fandom wiki** pages for M252 and 2B14
   - **Reforger Workshop** pages for all modded weapons (WZ Turrets, Integrity BM-21 Grad, SpearHead/SH mods)
3. Verified all mod-name prefixes against their Workshop entries and git history.

---

## Surface 1 — Core calculation terms

| Calculator term | BI / wiki source says… | Match? |
|---|---|---|
| **Elevation** | "elevation and azimuth" (Dev Report #22) | ✅ exact match |
| **Azimuth** | "elevation and azimuth" (Dev Report #22) | ✅ exact match |
| **Charge** | "charge rings" (Dev Report #22) | ✅ same concept; "charge" is correct real-world artillery term |
| **Time of Flight / TOF** | "time of flight" (BI Script API), "time-to-impact" (Dev Report #22) | ✅ matches Script API verbatim |
| **Mils — NATO 6400** | Not stated in any BI Reforger document | ✅ real-world correct; calculator is the only source surfacing this distinction |
| **Mils — Warsaw Pact 6000** | Not stated in any BI Reforger document | ✅ real-world correct |

**Finding:** The core calculation jargon is accurate. BI's Dev Report #22 uses the same terms ("elevation and azimuth", "time of flight"). The mil-system distinction (NATO 6400 / Warsaw Pact 6000) has no canonical Reforger source, but is correct real-world doctrine and is the only way to accurately document the per-faction mil difference the calculator implements.

---

## Surface 2 — Fire mission and observer terminology

The calculator uses real-world US/NATO field-artillery vocabulary that does **not** appear in any BI Reforger documentation:

| Term used | Present in BI/Fandom docs? | Accuracy |
|---|---|---|
| Fire for Effect (FFE) | ❌ BI uses "Artillery Fire Waypoint" (GM tool) | ✅ correct real-world term |
| OT line / GT line | ❌ absent from all BI Reforger docs | ✅ correct real-world term |
| Forward Observer / FO | ❌ absent from all BI Reforger docs | ✅ correct real-world term |
| Sheaf (lateral, linear) | ❌ absent from all BI Reforger docs | ✅ correct real-world term |
| High angle / Low angle | ❌ absent from all BI Reforger docs | ✅ correct real-world term |

**Finding:** These terms are real-world artillery vocabulary, not Reforger-specific. They are accurate and useful to the audience (players who want realistic fire-mission procedures). No changes needed.

---

## Surface 3 — Vanilla weapon names and descriptions

| Calculator name | Fandom / BI canon | Match? |
|---|---|---|
| M252 81mm (displayed as "US M252 81mm Mortar") | Fandom: "M252 Mortar", "81 mm", US faction | ✅ |
| 2B14 82mm (displayed as "Soviet 2B14 82mm Mortar") | Fandom: **"Podnos 2B14"**, "82 mm", USSR faction | ⚠️ see nit #2 |
| M252 projectile "M821 HE" | Real-world US designation; no BI page contradicts it | ✅ |
| 2B14 projectile "O-832 HE" | Real-world Soviet designation; no BI page contradicts it | ✅ |
| Onboarding: "Mortars (M252, 2B14) are base-game" | Fandom and Dev Report #22 confirm both are vanilla | ✅ |
| Onboarding: "Howitzers and MLRS require mod-added weapons" | Workshop research confirms M119/D-30/BM-21/Type-63 are mods | ✅ |

---

## Surface 4 — Workshop mod weapon names and prefixes

All mod-name prefixes were verified against Workshop pages and git history (commit `f93800c`, `4ddfd42`).

| Prefix | Mod / group | Workshop page | Name in calculator | Match? |
|---|---|---|---|---|
| **WZ** | West Zagoria Conflict — mod "WZ Turrets" | [WZ Turrets](https://reforger.armaplatform.com/workshop/611ABE2F73802440) | "WZ M119 105mm Howitzer", "WZ D-30 122mm Howitzer", "WZ Type-63 107mm" | ✅ |
| **Integrity** | Integrity Gaming Studios | [Integrity - BM-21 Grad](https://reforger.armaplatform.com/workshop/68DA62B40A976334) | "Integrity BM-21 Grad 122mm MLRS" | ✅ full name |
| **SH** | SpearHead Servers | [SH-MortarCam by SpearHead Servers](https://reforger.armaplatform.com/workshop/66EC2958B95168CB) | "SH BM-21 Grad 122mm MLRS" | ⚠️ see nit #1 |

**Note — WZ D-30 mil system:** The D-30 is a historically Warsaw Pact weapon (6000 mils real-world) but the WZ Turrets mod implements it with NATO 6400 mils. This matches the corrected data in commit `4ddfd42` and is presumed intentional for the WZ server context. No user-facing text claims the D-30 uses Warsaw Pact mils, so no text change is needed.

**Note — no canonical pages:** The Fandom wiki has no Reforger pages for M119, D-30, BM-21 Grad, or Type-63 (all are mods, not vanilla). The calculator's descriptions for these weapons can't be cross-checked against in-game text, and this is expected.

---

## Proposed Edits

### Nit #1 — Spell out "SH" in the BM-21 weapon name

**File:** `mortar_core/ballistic-data.json`, line 3800  
**Severity:** nit  
**Why:** "Integrity BM-21 Grad 122mm MLRS" and "WZ Turrets" spell out the full mod-group name. "SH" is an abbreviation that users in the dropdown cannot decode without prior knowledge. The SpearHead community prefix their Workshop mods with "SH-" (e.g., "SH-MortarCam"), so "SH" is the group's own prefix style — but the weapon name would be clearer spelled out.

```
Old: "name": "SH BM-21 Grad 122mm MLRS"
New: "name": "SpearHead BM-21 Grad 122mm MLRS"
```

### Nit #2 — Add "Podnos" to the 2B14 display name

**File:** `mortar_core/ballistic-data.json`, line 8  
**Severity:** optional  
**Why:** The Fandom wiki titles the weapon "Podnos 2B14" — "Podnos" (Russian: поднос, "tray") is its official Russian designation. Adding it makes the name more discoverable for players searching "Podnos". The prefix "Soviet" is accurate but does not appear in any Fandom or BI title.

```
Old: "name": "Soviet 2B14 82mm Mortar"
New: "name": "Soviet 2B14 Podnos 82mm Mortar"
```

*This is fully optional — the current name is not wrong.*

---

## Out of scope (per minimal-changes directive)

The following were evaluated and explicitly left unchanged:

- **"FFE" / "Fire for Effect"** — real-world correct; BI uses "Artillery Fire Waypoint" only for the GM tool, not for players
- **"Charge"** — real-world correct; Reforger says "charge rings" but they are the same concept
- **"TOF"** — matches BI Script API ("time of flight")
- **"Forward Observer / FO"** — real-world correct; not in Reforger docs but not contradicted by them
- **"High Angle / Low Angle"** — real-world correct; not in Reforger docs
- **NATO 6400 / Warsaw Pact 6000 mils** — real-world correct; Reforger never specifies this

---

## Sources

- [Dev Report #22 — Arma Reforger](https://reforger.armaplatform.com/news/dev-report-22)
- [SCR_MortarShellGadgetComponent — BI Script API](https://community.bistudio.com/wikidata/external-data/arma-reforger/ArmaReforgerScriptAPIPublic/interfaceSCR__MortarShellGadgetComponent.html)
- [Category: Arma Reforger — BI Community Wiki](https://community.bistudio.com/wiki/Category:Arma_Reforger) (only 3 pages exist; no artillery/mortar wiki pages)
- [M252 Mortar — Armed Assault Wiki](https://armedassault.fandom.com/wiki/M252_Mortar)
- [Podnos 2B14 — Armed Assault Wiki](https://armedassault.fandom.com/wiki/Podnos_2B14)
- [Category: Artillery (Reforger) — Armed Assault Wiki](https://armedassault.fandom.com/wiki/Category:Artillery_(Reforger)) (only M252 and 2B14; no howitzer or MLRS pages)
- [WZ Turrets — Reforger Workshop](https://reforger.armaplatform.com/workshop/611ABE2F73802440)
- [Integrity - BM-21 Grad — Reforger Workshop](https://reforger.armaplatform.com/workshop/68DA62B40A976334)
- [SH-MortarCam by SpearHead Servers — Reforger Workshop](https://reforger.armaplatform.com/workshop/66EC2958B95168CB)
- [BM-21 Grad (PhoenixofFate) — Reforger Workshop](https://reforger.armaplatform.com/workshop/5E6D3C90B7763032)
