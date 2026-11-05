# SE +1 `high` tower — Blender rebuild spec (R1)

Owner 2026-11-05: rebuild one SE focal version in Blender; owner picked **+1 high** (`se:focal`, pose H) and headless Blender via the vendored `blender-*` skills. Base: closeup-night SE R6 (20/38; +1 items fh-floors, fh-crown, fh-lift, fh-gardens, fh-base at 1, fh-frame at 2). Rubric: [closeup-night/se/rubric.md](../closeup-night/se/rubric.md) `## Flagship +1 high`; target [flagship-high.jpg](../closeup-night/se/target/flagship-high.jpg).

## Diagnosis (target | R6 day | R6 night, `se:focal`)

| Symptom at R6 | Cause | Fix in this spec |
| --- | --- | --- |
| Right half of the +X face reads as one blue pane; floors behind it cold, worst at night | `shaft(..., paneBlue)` 0.95 half-width at `lx = HW/2+.95`, `lz = -HW/2+.95`: the shaft is ~1.9 wide and overlaps the face | slim 1.2 × 1.2 glazed tube with amber rails, set off the face at its −Z edge, faint `se_pane`, never `paneBlue` |
| Terraces read as bush balls stacked up the left | trees/bushes on a flat 1.2 slab, no planter form | rounded balcony slab with a real planter trough and amber lip, greenery sits *in* it |
| Square box floors, thin seams, flat cap crown | `glazed()` boxes, 0.09 amber strip, `arc` cap | bullnose rounded-rect slabs, 0.12 amber band proud of every slab, drum crown with overhanging cap and inner core |
| Rooms look shallow (flat peach wall right behind the glass) | warm wall plane 0.1 behind each face | inward-facing warm walls on all four faces (backface-culled, so H sees *through* to the far wall), warm core and ceiling lamp panels per floor |
| Lobby same height read as floors, portal thin | `glazed(..., LOBBY)` + strips | double-height glazed lobby with a white portal frame and lit lintel |

## Asset `concentration-tower-high`

Files: `asset/models/concentration-tower-high/concentration-tower-high.blend`, `.glb`, and the generator `build_tower.py` (headless, re-runnable: `blender -b --factory-startup --python-exit-code 1 -P build_tower.py`). Blender 5.2 at `/Applications/Blender.app/Contents/MacOS/Blender`. Skills (main checkout, untracked there): `/Users/fatboy/city2127/.agents/skills/blender-core`, `-hardsurface-modeling`, `-export-pipelines`, `-asset-qa`. Export with the **`gltf` preset, Meshopt/Draco off** (docs/BLENDER.md).

Units: **local site units** (the `towerUpper` group's space; the site root scales ×3 to metres). Origin at the ground-contact centre of the tower. Coordinates below are **three.js** (x, y up, z); Blender = (x, −z, y). Camera H looks at the +X face; screen-right at H ≈ −Z.

Root empty `ROOT_CONCENTRATION_TOWER_HIGH`, identity transform, no animations/cameras/lights. Materials are **name-only roles** (remapped at runtime to the SE materials; give them a plausible preview colour, nothing else matters):

| role | runtime material | use |
| --- | --- | --- |
| `se_white` | `white` | slabs, columns, crown, portal, mullions, rails, brackets, planters |
| `se_amber` | `amber` | slab bands, lift rails, planter lips |
| `se_room` | `room` (FrontSide) | inward-facing warm walls, core |
| `se_lamp` | `lamp` | ceiling panels |
| `se_light` | `light` | lintel strip, ceiling light lines |
| `se_pane` | `pane` (transparent) | glazing, lift tube |

Constants (keep in sync with `concentrationTower.ts`): `HW = 5.2`, `LOBBY = 3.6`, `HF = 2.4`, 14 floors, `TOP = 37.2`.

1. **Plinth**: rounded-rect 6.4 × 6.4, corner radius .9, .12 thick, y 0..0.12, `se_white`.
2. **Slabs** at y = 0 (lobby floor, on the plinth), `LOBBY + i·HF` (i = 0..13) and `TOP`: rounded-rect 5.6 × 5.6, corner radius .7, .26 thick (top at the listed y + .26), bullnose edge (bevel .08, 3 segments) — `se_white`.
3. **Amber band** on every slab: a rounded-rect ring following the slab outline, .12 tall, .05 proud, centred .1 below the slab top — `se_amber`.
4. **Corner columns**: 4 cylinders r .32, 16 segments, at (±2.45, ±2.45), y 0..TOP — `se_white`.
5. **Glazing per floor** (lobby and floors 0..13), on all four faces, inset .15 from the slab edge: vertical mullions .06 × .06 every ≈ 1.04 (5 bays per face) and a head rail .07; one `se_pane` plane per face. Inward-facing `se_room` wall per face set .25 inside the glazing (normals point to the tower centre — one-sided). Ceiling: one `se_lamp` panel 4.4 × 4.4 just under the next slab, normals down, plus two `se_light` lines .03 × 3.0 × .12.
6. **Core**: `se_room` box 1.2 × 1.2 centred at (−.9, ·, .9), every floor, height `HF − .3`, so H sees a warm back plane through the rooms (keep clear of `furnish()`'s spread — check with one capture).
7. **Lobby**: glazing as 5 with height `LOBBY`; on +X a portal: two white piers .18 × 3.0 at z ±.9 standing .1 proud, lintel .18 × 2.0 at y 3.0, `se_light` strip .05 under the lintel.
8. **Lift tube** at (3.3, ·, −1.8): rounded-rect tube 1.2 × 1.2, radius .25, y .12..TOP+.4, `se_pane` (open ends); 4 white corner rails r .06; the two rails on the +X side `se_amber` r .05 instead; a white ring band .1 tall at every slab level; white brackets .5 long tying it to the tower at every third slab; a white cap .2 thick at the top.
9. **Sky terraces** on floors i ∈ {1, 4, 7, 10, 12} (slab y = LOBBY + i·HF): a balcony slab off the +X face, x 2.6..3.8, z −.4..2.6, .14 thick, rounded outer corners r .4, bullnose; on its outer edge a planter trough .3 wide × .3 tall along z −.3..2.5 (`se_white`, open top, soil at .22), an `se_amber` lip .03 on its top outer edge. Greenery stays procedural (it already sits at x ≈ HW/2+.55..1.1, z −.2..2.2).
10. **Crown**: drum r 3.0 y TOP+.26..TOP+1.4 (`se_white`, 48 segments) with a glazed ring band set into it (`se_pane` + 24 mullions, warm `se_room` inner cylinder behind); overhanging cap r 3.5, .35 thick, bullnose, at y TOP+1.4..TOP+1.75, its rim where the procedural `tower-meter-band` ring will sit (move that ring to y TOP+1.5, r 3.5 in code); inner core cylinder r 1.0 from TOP−2.0 to TOP+.26 (`se_white`) visible through the top floor; planter rim on top r 3.2 × .25 tall (open, soil disc stays procedural).

Budget: ≤ 60k triangles, ≤ 6 materials, one mesh per material (join by material before export). Record tris, materials, bounds, byte size.

Expected bounds (three): x −2.8..3.9, z −2.8..2.8 (lift and terrace stay in the 14 × 14 lot), y 0..≈39.

## Code (`src/`)

- `changeCatalog.ts`: `SiteAssetId` += `'concentration-tower-high'`; `towerUpper: layer('towerUpper', 'procedural', 'concentration-tower-high')` (kind stays procedural — the fallback is procedural, like `hubUpper` was).
- `siteAssets/assetCatalog.ts`: entry with `rootName`, `compatibleSite: 'centerGaiRear'`, `compatibleLayer: 'towerUpper'`, footprint and `maxHeight` from the measured bounds, `materialPolicy: 'city-roles'`, `materialRoles` the six `se_*` roles; widen `CityMaterialRole` with them and make `remapCityMaterials`'s map a `Partial<Record<…>>` (it already throws on a missing role).
- `concentrationTower.ts` (+1 block only): move every R6 *shell* part (all `glazed()` calls, slab/column/portal/crown white and leaf parts, the `shaft`, terrace slab strips) into a `highShell` group baked on its own — this is the **procedural fallback**. Furniture, people, greenery (terrace trees/bushes, base, roof garden), cabins, the meter ring and the high modules stay in `towerUpper` as today. Lift position `lx = 3.3`, `lz = −1.8`, cabins `cabinParts(…, 1.0, 2.0)`. `buildConcentrationTower(scene, kit, assets?: SiteAssetLoaderCache)`; when `assets` is given, `towerUpperLayer.setPreparation(async () => { const glb = await assets.cloneRoot(…); remapCityMaterials(glb, {...}); towerUpper.remove(highShell); towerUpper.add(glb); })` and start it once at build (`void towerUpperLayer.prepare()`) so the 3 s rise shows the GLB, not a pop. `index.ts` passes `assets`.
- Tests: `tests/siteAssets.test.ts` — validate the real GLB file (load with `GLTFLoader.parse` from `readFile`, like the existing real-asset checks if any; else add one): root, footprint, roles. `tests/concentrationTower.test.ts` — keep every assertion; add one that with a stub asset loader the `towerUpper` layer swaps `highShell` for the asset root. `tests/changeCatalog.test.ts` / `cityChangeManager.test.ts` — update only the expectations the new `assetId` changes.

## Keep (locked)

−1 and 0 code, `room`/`white`/`amber`/`pane` material definitions, `furnish()`, `crowd()`, people geometry, controller levels, cabin animation constants. Diff these against `main` before capture.

## Captures

`node ~/city2127-evidence/closeup-night/se/capture.mjs <out> 12,22 flagship-high` (Vite on 5192), 3200 × 1800, into `~/city2127-evidence/se-high-blender/r1/`; also run `tower-mixed` and `flagship-mixed` once to confirm 0 is unchanged. Blender review sheet (`blender-asset-qa/scripts/review_shots.py`) into the same folder.
