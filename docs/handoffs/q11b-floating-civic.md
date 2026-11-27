# Q11-B — 水に合わせて浮き上がる建物 (floating civic building) model

- Owner: repository owner (asset author: this task's sessions)
- Status: IN_PROGRESS (model draft for owner review; not placed in the app)
- Branch: asset/q11b-floating-civic, merged to main (asset-only)
- Base commit: 95af91a9f5aec2c9515e5282d15e6c145b3b197d
- Last verified commit: model files checked before commit (see validation); commit SHA recorded in Git history
- Remote availability: origin/main (owner reviewed locally and asked to upload, 2026-11-27)

## Session Git state

- Session starting branch and HEAD: main at 0bdf9c533ba394922f74a9cc0b144bdfb325db17, clean, 1 behind origin/main
- Last fetched origin/main commit: 95af91a9f5aec2c9515e5282d15e6c145b3b197d (2026-11-27); main fast-forwarded to it
- Local changes present at session start: NONE
- Upstream integration status: merged into origin/main 765a9431 (asset files and docs only)
- Pending Git conflicts or synchronization blockers: NONE (no earlier Q11-B folder)

## Goal and acceptance criteria

Model Q11-B (original floating-building scheme only) in Blender to `Q11-B_Design.md`, with the outline from image B on p.7 of `2127_設問の作り直し_Q04・Q10・Q11_一覧.pdf` (1100 × 825; the B column of `Q11.png` is only ≈ 360 px wide). First grey models of normal water and high tide from one camera: the four pillars fixed, the whole building lifting with the water, both bridge ends seated; then the five storeys, terraces, entrance and slide carriages. No figures. Export the high-tide GLB, reimport it into an empty scene; deliver the two same-camera images, bridge and carriage close-ups.

## In-scope files and dependencies

`asset/models/q11b-floating-civic/` (build, review and check scripts, `.blend`, `.glb`, `report.json`, `check.json`, `previews/`) and its `asset/models/LIBRARY.md` row. Primitives and kit props come through `asset/models/q04a-suspended-pod-tower/parts.py` and `city-kit-2127` (read only). No app code, no placement.

## Completed work

1. `build_floating_civic.py` builds everything (`blender -b --factory-startup --python-exit-code 1 -P build_floating_civic.py`). Normal water z 0, shore −y, sea +y, origin at the float centre.
   - Fixed: basin (quay r 65, floor −5, sea channel between bearings 55° and 125°), shore walk +4.5 with a row of trees and benches; stepped plaza on the bridge side (landings +0.5 / +1.5 / +2.5 / +3.5 / +4.5, 7-riser stairs between, steps on down under water); abutment deck +4 with the hinge at (0, −82, 4), side ramps 1:12 up to the walk, shore joint plate; four pillars r 42 on the diagonals (1.6 m, shaft top 38, cap and beacon to 39) with two T guide rails each, a 0.5 m scale (metre and 5 m bands) facing the main view, the normal-water stain band.
   - Floating (`FLOAT`, one parent): float r 40 (top +4, bottom −3, rounded edge, seams, light line), deck with planters and rail; storeys 1–5 (outer r 35 / 31 / 27 / 22.5 / 17, glass set back 1.2–3.2 m varying round the plan), floors, beams, columns, doors to the terraces, furniture (reception desk, lounge, reading/meeting tables, view lounge on the top storey), atrium with a spiral stair, terraces with walks, planters, partial rails, trees and two outdoor stairs per level, roof court with skylight dome, ring canopy and benches, land-side porch with glass doors; four sliders: deck arm with a pin joint, wall arm, open carriage (corner posts, straps) round the pillar with upper and lower roller sets on the rails; float-end bridge seat.
   - Bridge: three nested Warren-truss segments (15 m each, widths 6.0 / 5.6 / 5.2 m) with glass rails and glass roof, comb joint plates at the overlaps; posed by turning about the hinge and telescoping.
   - Water: one transparent annulus (r 40–115) moved to the water level.
   - States: frame 1 normal (water 0), frame 2 high tide (water +3); `FLOAT`, `WATER_SURFACE` and `BRIDGE_SEG_1..3` carry constant keys; markers `NORMAL_WATER` / `HIGH_TIDE`. The GLB is exported at frame 2 (`export_current_frame`).
2. `review_floating_civic.py`: views `main` (bearing 298°, ≈ 30° down, 4:3), `bridge` (orthographic side section along the bridge, near clip at x 3.6), `bridgeclose`, `slider`, `top`, `elev`, `aerial`; `--state normal|high`, `--blank`, `--glb`, `--clay`. `check_glb.py` writes `check.json`.

## Actual validation results

- Verification status: PASSED (model level); app integration NOT RUN (not placed)
- Date and checked worktree: 2026-11-27, the uncommitted files on `asset/q11b-floating-civic` over 95af91a9
- Commands/manual checks and results: Blender 5.2.2 LTS (Windows, `E:\Blender\blender.exe`), Cycles OPTIX (RTX 4060 Laptop). Build → `report.json`: 358,114 tris drawn (SITE 120,596 / PILLARS 11,264 / WATER 480 / FLOAT 223,242 / BRIDGE 2,532), 220,522 unique, 139 objects, 25 unique meshes, 64 materials, GLB 8,180,388 bytes. State check (both states): bridge ends 0 m from hinge and seat, length 42.000 / 42.107 m, pitch 0 / 4.09°, segment overlaps 1.50 / 1.45 m, freeboard 4 m in both, hinge 1 m above high water, plaza under water at high tide 0.5 / 1.5 / 2.5 and dry 3.5 / 4.5, pillar top 10 m above the high-tide roof. `check_glb.py` on the reimported high-tide GLB: one root `Q11B_FloatingCivic`, all named nodes, bridge shore end (0, −82, 4) and float end (0, −40, 7) with 0 m gaps, 42.107 m at 4.09°, float node +3, float top 7.0 / bottom 0.0, water z 3.0 (alpha 0.36, BLENDED, r 40.03–115), four pillars at r 41.95 (shaft to 38, beacon top 39) each wrapped by a carriage (z 0.2–7.9), storeys from z 7.0 up, roof court top 30.65, plaza rays: 0.5 / 1.5 / 2.5 under water, 3.5 / 4.5 dry; no people nodes; bounds ±115 × ±115, z −5.6 … 39. `node tests/assetLibrary.test.ts` passed (41 folders).
- Evidence/environment: `previews/` in the model folder (main normal/high from the .blend, both comparison sheets, and main, bridge section, bridge close-up and slider close-up from the GLB in an empty scene); all rounds in `~/city2127-evidence/q11b-floating-civic/` (`ref/target_B.jpg` is the fixed comparison image)
- Integrated commit and checks: merged on main over 765a9431; asset files and documentation only, so root/survey/module-swap `npm test` / `build` NOT RUN; `node tests/assetLibrary.test.ts` and `git diff --check` rerun on the merge
- Changes since verification: NONE

## Known issues and blockers

- Owner has seen the local previews and asked for the upload; no visual verdict on the look yet.
- Against image B: the design document's storey radii make a steeper stepped cone than the image's broad, flat tiers; the main view (design: ≈ 30° down) is higher than the image; the bridge lands on the float deck as the document specifies, not in a glazed opening in the float wall as in the image; the float wall has no entrance.
- The bridge section view clips the scene at x 3.6, so cut solids (basin, plaza, float) show black.
- The pillar caps and beacons rise 1 m above the 38 m shaft top.
- Blended water and glass are untested in three.js sorting; the slide geometry only reads from close by.

## Important decisions

- New folder `q11b-floating-civic` (no Q11-B model existed).
- Dream Loop used as render → compare with the fixed image → fix, in Blender as asked.
- Two states on frames 1 and 2 of one geometry instead of duplicated models; constant keys, so the city GLB is a fixed pose.
- The float-to-pillar gap is only 1.2 m, so the visible short arm comes off the deck edge into a pin lug on the carriage; a second arm stays on the wall.

## Next expected step

Owner judges the look; then a further round, or placement as its own task.
