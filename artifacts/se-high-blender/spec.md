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

---

# R2 — from the target, not from R6 (owner 2026-11-05)

Owner: "spec r2, do not lock the materials, except person. And if the parts made in this process can reuse on other scene too, such as tree." R1 judged 6/12 absolute (median of 3; pairwise vs R6 night 5–0, day 3–1), but it kept R6's rooms, greenery and terraces, so it looked like R6 (Dev_QA Q5). R2 is written line by line from [flagship-high.jpg](../closeup-night/se/target/flagship-high.jpg). **Judge absolute against the target first**; R6/R1 pairwise is only a regression check.

## Locked

Only the **person**: `standingGeometry`, `seatedGeometry`, `personMaterial`, `shirts`, `crowd()`. Where people stand is free. −1 and 0 *code* is out of scope, but shared materials (`white`, `amber`, `room`, `pane`, `lamp`, `light`, `leaf` …) may change. If you change a shared one, capture `flagship-low`, `flagship-mixed` and `tower-mixed` day and night and report what changed. Prefer a new +1-only material when only +1 needs the look.

## Target, item by item (pose H, three.js local units; camera faces +X, screen-right ≈ −Z)

| # | Target shows | R1 has | R2 spec |
| --- | --- | --- | --- |
| T1 | 13 office floors + an open top floor + double-height lobby; same slender proportion | 14 glazed floors + lobby | keep `HW 5.2`, `LOBBY 3.6`, `HF 2.4`; floors 0–12 glazed, **floor 13 open-air** (crown, T7) |
| T2 | **3 wide bays** per face: thick white corner piers + 2 slim mullions, clear glass | 5 bays, round corner columns, amber rails across the face | corner piers square .4 × .4 white (replace round columns); 2 mullions .06 per face; head/sill rail .06; clear `pane` |
| T3 | thick, proud **amber band only every ~3 floors**; other slab edges white | thin amber band on every slab | slab edge white .26 bullnose on all; amber band .2 tall, .08 proud on slabs at floors 0, 3, 6, 9, 12 and under the crown cap |
| T4 | bright **white ceilings with 2 linear lights** per floor; deep rooms; lower floors warm peach, upper floors cream-white | flat peach back wall, tiny furniture | ceiling: new `ceilingHigh` (white, mild emissive) + 2 `light` strips across x per floor; back walls: floors 0–5 warm peach (`room`), 6–12 a new cream-white emissive; floor finish pale; rooms read 4 m deep (no core box in the H sightline) |
| T5 | **readable furniture**: dark desks with monitors, black chairs, bookshelves, kitchen counters, sofas, lamps; 1–3 people per floor, some seated | R6 `furnishBase` strips at tiny scale | kit furniture (K below) at person scale; each floor its own programme: office ×4, library ×2, café/kitchen ×2, lounge ×2, gym ×1, studio ×1, plus garden floors (T6); 2–3 people per floor placed by the +X glass, ≥ 1 seated |
| T6 | **trees inside the floors** (round-crown small trees and potted shrubs behind the glass) on ~5 floors; no external balconies on the tower | external balcony slabs with bush pairs | delete the external terraces; garden floors 2, 5, 7, 9, 11: 2–3 kit indoor trees + potted shrubs + a long planter along the +X glass, 1–2 people |
| T7 | **open top floor**: no glazing, white water-tank drum inside, spotlights under the cap; thick white cap with a wide glowing amber edge; dense roof garden on top | glazed drum band, cap r 3.5 | floor 13 open: corner piers only, white drum r 1.1 h 1.9 at (−.6, ·, .6), 6 small `light` spots under the cap; cap r 3.4, .7 thick bullnose; `tower-meter-band` on its rim widened (tube .3); roof: planter rim, 5 kit trees + kit shrubs, dense |
| T8 | **separate glazed lift tube beside the tower** (screen-right), full height ground→cap, two amber rails on its front edges, white rings every ~4 floors, **large white cabin with a window** clearly visible mid-height | slim tube flush on the face, cabin unreadable | tube 1.6 × 1.6 centred (1.0, ·, −3.6) — gap .2 from the −Z face; rounded corners r .3; `pane` glazing; 2 amber rails r .05 on its +X edges, white rails on the back edges; white ring band every 4 floors; tie brackets at those rings; tube top tucked under the cap. Cabin = kit `lift_cabin` (1.3 w × 1.8 h × 1.3 d local, white, glazed front, warm-lit inside, 1–2 people); keep the animated cabin and the static mid-height one, both moved into the tube |
| T9 | **double-height warm lobby** with a central white-framed double door; **paved forecourt**, 2 benches flanking the path, 4–6 people, layered tree clusters both sides, hedge planters along the base | lawn at the foot, tree ring hides the lobby, no benches in view | lobby: peach warm room, door frame white with `light` lintel; forecourt: pale paving (new `paving`) x 2.6..6.6, z −3.2..3.2 with a path to the door; 2 kit benches at z ±1.2 facing +X; 5 people (2 seated); kit tree clusters (3 per side) at z ±(3.0..5.0), x 3..6; low hedge planters along x = 2.8 except the door; **no trees in front of the door** |
| T10 | white structure, warm rooms, amber only on bands, lift rails and crown ring | — | as T2–T8; no other amber |

Height check: cap top ≈ TOP + .7 + garden; must stay inside the H frame (R6 rubric `fh-crown` crop).

## Reusable prop kit `city-kit-2127` (Blender)

One GLB of named props, reusable by every site (owner: "such as tree").

- **Files**: `asset/models/city-kit-2127/build_kit.py`, `.blend`, `.glb`; same headless recipe and `gltf` export preset as R1.
- **Units**: **real metres for a 1.8 m person**, origin at ground contact (or pot base), front −Y in Blender (+Z three).
  - The site scales differ (SE ×3, NE/SW ×4), and the stylised people are larger than life. SE's standing figure is .74 local ≈ 2.2 m.
  - So the consumer passes `unitsPerMetre` (SE: .74 / 1.8 ≈ .41).
- **Root**: `ROOT_CITY_KIT_2127` with one child empty per prop, named `kit_<name>`. Each prop is ≤ 3 materials and has one mesh per material.
- **Props**:
  - Trees: `tree_round_s`, `tree_round_m`, `tree_round_l`. A trunk plus 3–6 clustered round lobes in two greens, matching the target's lumpy cluster crowns, not one sphere.
  - Indoor greenery: `tree_indoor` (white pot + small crown), `shrub_cluster`, `potted_plant`, `planter_1m` (white trough, soil and shrubs).
  - Furniture: `bench` (white frame, wood seat), `desk_monitor`, `chair_office`, `sofa`, `bookshelf`, `kitchen_counter`, `cafe_set` (round table + 2 chairs), `floor_lamp`, `treadmill`.
  - `lift_cabin`.
  - Budget ≤ 1.5k tris per tree and ≤ 600 per furniture piece.
- **Materials**: named `kit_*`: `kit_leaf_a`, `kit_leaf_b`, `kit_bark`, `kit_white`, `kit_wood`, `kit_dark`, `kit_fabric`, `kit_screen` (emissive), `kit_soil`, `kit_glass`. Policy `preserve`: the Principled colours come through glTF, so every scene gets the same look. `kit_screen` and the cabin interior are emissive, so they glow at night.
- **Runtime**: new `src/siteAssets/propKit.ts`.
  - `loadPropKit(assets)` loads once through `SiteAssetLoaderCache.load`. A `kit` catalog category is not tied to one site, so `compatibleSite`/`compatibleLayer` become optional for it.
  - `instanceProps(kit, placements: { name, position, yaw, scale }[], unitsPerMetre)` returns a `T.Group` with one `InstancedMesh` per (prop, material). Instances are placed by base, cast shadows and are named `kit-<name>`.
  - Unit test with a stub GLB: counts, transforms, unknown name throws.
- **Fallback**: each site keeps its procedural props until the kit arrives, using the same `setPreparation` swap as the tower shell. The +1 layer prepares the tower GLB and the kit together.
- **Reuse beyond SE (not this round)**: the handoff lists where the kit can replace procedural props: SE −1/0 trees and benches, SW plaza trees and benches, the NW bay furniture, district street trees. Each is a later task with its own capture check, so this round changes no other site.

## Tower GLB changes (`concentration-tower-high`)

Rebuild per T1–T3, T7–T9:
- Square corner piers; 3 bays.
- Amber bands on floors 0/3/6/9/12 and the cap.
- Open floor 13 with the tank drum and cap spots.
- Lift tube at (1.0, −3.6) with rings and brackets.
- Lobby door frame.
- Paving and the forecourt path. These may live in the tower GLB as `se_paving`, or as procedural paving; pick one and say which.
- No external terraces.

Keep the identity root, `city-roles` remap, preload-at-build and procedural fallback. The roles list may grow, e.g. `se_ceiling`, `se_paving`.

## Code (`concentrationTower.ts` +1 block)

- `furnish` / `furnishBase` / `fitout` for +1 are replaced by kit placements per T5/T6. The procedural versions remain the fallback.
- −1/0 keep their code.
- High function modules 1–6 become kit fit-outs: one floor programme each. They keep the scale-in groups, names and counts the tests assert.
- `lx`/`lz` move to the T8 tube; cabin animation constants unchanged unless the tube height needs it.
- Remove: external terrace greenery, base tree ring in front of the door, R6 bush balls on +1.

## Rubric additions (judge against target)

Same `fh-*` six items. Add two observables to the judge brief:
- "rooms have white ceilings with linear lights and readable furniture"
- "lift is a separate tube beside the tower with a visible cabin"

Bar: every `fh-*` item scores 2 on the median of three fresh absolute judges against the target, and no regression on −1/0 captures.

## Captures and checks

- **Captures**: `se:focal` `flagship-high` day and night at 3200 × 1800. The R2 output folder is `~/city2127-evidence/se-high-blender/r2/`.
- **Kit sheet**: a Blender review sheet of every kit prop, `kit-review.png`, plus one render of all props next to a 1.8 m figure.
- **Other states**: −1/0 captures, if a shared material changed.
- **Gates**: `npm test && npm run build && git diff --check`, plus one headed FPS run (`.agents/skills/closeup-polish/scripts/fps.sh`, `se:high`).
- **Metrics**: tris, materials and bytes for both GLBs.

---

# R3 — remaining gaps (owner 2026-11-05 "R3")

R2: day median 10/12 (10/10/10), night 9/12; pairwise vs R1 5–1 (lost `fh-crown`). Below 2: `fh-floors`, `fh-lift`; night `fh-gardens` 1. Close-ups `~/city2127-evidence/se-high-blender/r2/` (top-day/night crops show the causes). Judge R3 absolute against the target first, pairwise vs R2 as regression.

## Keep (locked — diff against `333678a` before capture, revert anything not named below)

- `fh-frame` (2, won): tower GLB piers, mullions, slabs, white edges, amber bands on floors 0/3/6/9/12 (`build_tower.py` structure).
- `fh-base` (2, won): `lobbyKit()`, `forecourtKit()`, lobby/door/paving in the GLB, `paving` material.
- Person code (owner).

## Diagnosis → fix

| Item | Cause seen in R2 | R3 fix |
| --- | --- | --- |
| `fh-floors` warmth | Upper floors (6–12) use `cream` and a pale `ceilingHigh`; at night they read grey-white, by day sky-blue because `pane` mirrors the sky over the room | All floors warm like the target: floors 0–5 stay `room` peach; floors 6–12 a warm cream `#f7e2c8` with emissive `#ffd9b0` ≈ .5; `ceilingHigh` warm white `#fff6ea` emissive ≈ .6 so the ceiling glows at night; light strips stay. New +1-only `paneHigh` (opacity ≈ .08, no sky tint) on the tower glazing via a new role `se_glass` so rooms read through it; `pane` itself untouched |
| `fh-floors` repetition | every floor reads as "desk row" or "planter row" (gardens use 3 identical `planter_1m` along the glass; offices 3 identical desks) | Each floor gets one **back-wall feature** facing +X and one **mid-room cluster**, all different. Back wall (x ≈ −2.1): bookshelves with coloured books (library), kitchen counter + upper cabinets + 3 `pendant_lamp` (café), long sofa + rug + art panel (lounge), mirror wall + equipment (gym), pin-board + big table (studio), office: 2 desk pairs facing each other + one meeting table + whiteboard. Gardens: drop the `planter_1m` row; 2–3 trees of **different** kit sizes + 2 potted plants + a bench with a seated person, placed at different z per garden floor. Furniture large enough to read at crop size (desk top ≥ .45 local wide). No two adjacent floors share a programme silhouette |
| `fh-lift` | glazing `pane` at .18 opacity is invisible against sky/night; cabins sit outside the H crop band; only the two amber rails read | Tube glazing new `liftGlass` (white-blue `#dceefa`, opacity ≈ .35, mild emissive ≈ .15 at night) via role `se_lift_glass`; white ring band at **every** floor slab level (.12 tall) plus the brackets every 4; keep the two amber front rails, white back rails. Cabins: kit `lift_cabin` scaled to ≈ 1.2 w × 1.9 h local (≈ 75 % of tube width, ≈ 0.8 floor), white body, glazed front with warm-lit interior and one person, thin amber trim at the floor line. Static cabin at y ≈ 17 (mid-crop); animated cabin unchanged. The cabin must read at the `fh-lift` crop |
| `fh-crown` (lost to R1) | two amber rings stacked (GLB cap band + procedural meter ring) → "doubled jagged edge"; roof trees are lollipops (trunk ≈ 60 % of height), roof sparse | Remove the GLB `se_amber` band under the cap; the procedural `tower-meter-band` is the only ring, one clean torus (tube .3, ≥ 64 radial segments) centred on the cap rim. Roof: a dense mound — 4 low cluster trees + 14 shrub clusters + low planter rim, crowns overlapping, nothing taller than ≈ 2.2 above the cap |
| kit trees (all sites) | `tree_round_*` trunk ≈ 60 % of height, 4 lobes | Rebuild in `build_kit.py`: trunk ≤ 30 % of height (visible but short), 5–7 overlapping lobes, crown wider than tall, lowest lobe close to the trunk top; two greens. Same names, so every consumer gets the fix. `tree_indoor`: shorter stem, fuller crown |
| `fh-gardens` night 1 | indoor trees read as small pots in a planter row | handled by the garden-floor redesign above; trees ≥ .9 local tall, crowns touching the ceiling light so they read at night |

New kit props allowed: `pendant_lamp` (emissive shade), `rug`, `whiteboard`, `upper_cabinet`, `art_panel`, `meeting_table` (budget ≤ 600 tris each, `kit_*` materials).

## Checks

- **Gates:** `npm test && npm run build && git diff --check`.
- **Captures:** `flagship-high` day and night into `~/city2127-evidence/se-high-blender/r3/`.
- **Close-up crops:** add top-half crops like R2's top-day/top-night.
- **Kit:** a new `kit-lineup.png`.
- **Other states:** this round touches no shared material, so −1/0 are not re-captured. If you do touch one, capture them.
- **Iterations:** at most three capture-fix iterations.
- **FPS:** run `fps.sh se:high` once, if time allows.
