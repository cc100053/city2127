# Q11-C — 台場白渦發電所 (white-vortex power station) model

- Owner: repository owner (asset author: this task's sessions)
- Status: IN_PROGRESS (model draft for owner review; not placed in the app)
- Branch: asset/q11c-vortex-power-station, merged to main (asset-only)
- Base commit: 585f0e3290bbe0db75f6bbbdf742034d623fa6f3
- Last verified commit: model files checked before commit (see validation); commit SHA recorded in Git history
- Remote availability: origin/main (owner reviewed locally and asked to upload, 2026-11-27)

## Session Git state

- Session starting branch and HEAD: main at 28e7727e37d77d9d9c30592171c3f6bccdd35cc9, clean, 1 behind origin/main
- Last fetched origin/main commit: 585f0e3290bbe0db75f6bbbdf742034d623fa6f3 (2026-11-27); main fast-forwarded to it
- Local changes present at session start: NONE
- Upstream integration status: merged into origin/main 9ec71285 (asset files only, no conflict)
- Pending Git conflicts or synchronization blockers: NONE. Overlap: `q11c-storm-vortex` (R1 by another session, pushed an hour earlier) models the same option to different dimensions; it is left untouched, and the owner picks which one continues.

## Goal and acceptance criteria

Model Q11-C in Blender to the owner's design document `Q11-C_Design.md` (dimensions and details) with the outline, wall turning direction and main composition from the C image on p.7 of `2127_設問の作り直し_Q04・Q10・Q11_一覧.pdf` (1100 × 825; the C column of `Q11.png` is only ≈ 360 px wide). Iterate render → compare with that fixed image → fix. Show: from the ground, depth between the white walls with the turbines (hub, blades) behind their feet; from the roof, the walkway's exit, deck and rail looking along it to the throat; from afar, the white vortex rising from the 40 m opening, widening through three metal rings to a thin disc cloud, its spiral cloud pattern visible in the exported GLB. No figures. Deliver the GLB re-imported into an empty scene: main view, entrance turbine close-up, roof walkway close-up and a plan with the vortex off.

## In-scope files and dependencies

`asset/models/q11c-vortex-power-station/` (build, review and check scripts, `.blend`, `.glb`, `report.json`, `check.json`, `previews/`) and its `asset/models/LIBRARY.md` row. Primitives and kit props (`bench`, `leafy_tree`, `leaf_clump`) come from `asset/models/q04a-suspended-pod-tower/parts.py` and `city-kit-2127` (read only). No app code, no placement.

## Completed work

1. `build_vortex_power_station.py` builds everything (`blender -b --factory-startup --python-exit-code 1 -P build_vortex_power_station.py`). Origin = building centre on the ground, sea +y, main view from the land side (-y); bearings counter-clockwise from +x; wind, walls, roof ribs, vortex and cloud all turn counter-clockwise seen from above (the reference's wall tips and cloud streaks rise to the right on the land side).
   - Podium r 60, deck z 3; turbine gallery z 3–12 (blue-grey back wall r 48.5, blue light strips, soffit to r 51); drum face leans in to the rim r 47.4 at z 35.9.
   - 36 guide walls (one per 10°): cambered wing section, round outer leading edge, sharp trailing edge into the drum; foot r 58.5 (3.2 m deep, free in front of the gallery), tip r 48 at z 40, +5° turn; 3.5 m thick at the foot, 0.35 m at the tip; base shoe, panel joints, a service door on each foot. Linked mesh, `VANE_###`; the entrance wall (270) starts on the portal roof.
   - 34 ducted turbines (r 52, z 7, 6 m rotor, 11 blades; axis 12° into the channel): blue-grey duct, bell mouth, hood, nacelle, stator, shaft support, equipment base. Linked `TURBINE_HOUSING_###` / `TURBINE_ROTOR_###`.
   - Entrance (bearing 271, two bays): solid portal walls between the walk and the wind channels, canopy on two columns, door frame and glazed doors, a lit stair hall with a stair flight and lift doors; 12 m stair and a parallel 1:12.3 ramp to the same landing.
   - Roof: walkway r 34–41 at z 35 with paving joints and a glass rail on the centre side, outer band with planters and an outer rim rail, three stair/lift heads (271, 30, 150) whose exits open along the walkway; five spiral-ribbed rings step down to a nozzle collar, lip z 37, clear throat r 20 over a dark chamber with guide seams.
   - Vortex (`VORTEX_CORE/ROPES/BANDS/MIST/SKIRT`): r 20 at z 37, narrow low down and widening to r 29 at z 126; nine cloud ropes of unequal, swelling thickness round a bluish core, translucent bands and a faint mist shell; disc cloud `CLOUD_DISC` r 36 plus `CLOUD_WISP` fading out to r 57. Six generated, packed textures (UV-mapped strands; the cloud a counter-clockwise log spiral).
   - Rings `RING_LOW/MID/HIGH`: inner r 25 / 28 / 32 at z 57 / 83 / 109, 0.6 m tube, six sleeve joints each.
   - Plaza: planters, paved ring to r 76, lawn to r 140 with a ring path, six radial paths, benches and planters only beside the entrance, 34 trees.
2. `review_vortex_power_station.py` renders `main` (camera 30° up from the building centre, looking down ≈ 29°, 4:3), `entrance`, `roof`, `top`, `elev`, `aerial`, with `--glb`, `--blank` (GLB alone in an empty scene), `--clay`, `--novortex`. `check_glb.py` writes `check.json`.

## Actual validation results

- Verification status: PASSED (model level); app integration NOT RUN (not placed)
- Date and checked worktree: 2026-11-27, the uncommitted files on `asset/models/q11c-vortex-power-station` over base 585f0e32
- Commands/manual checks and results: Blender 5.2.2 LTS (Windows, `E:\Blender\blender.exe`), Cycles OPTIX (RTX 4060 Laptop). Build → `report.json`: 458,226 tris drawn (STATION 247,208 / ROTORS 30,736 / RINGS 18,072 / VORTEX 68,672 / CLOUD 17,280 / PLAZA 76,258), 225,404 unique, 195 objects, 24 unique meshes, 56 materials, 6 textures (1024², 1024×256, 3 × 512-class), GLB 8,149,648 bytes; layout: wall gap ≥ 4.08 m, turbine-to-wall clearance 0.65 m, ramp 1:12.3, stair foot r 66.4. `check_glb.py` on the reimported GLB: one root `Q11C_VortexPowerStation`, all named nodes, 36 walls, 3 rings at z 57 / 83 / 109 with clearance to every vortex vertex 2.56 / 3.84 / 4.78 m, 34 rotors with 0 offset / 0 axis error, every vortex and cloud material still textured (alpha from the texture where blended), entrance rays at 1.0 and 1.8 m from the stair head reach the door glass/frame at the door line, stair treads under the canopy, no people nodes; station bounds x/y ±60.1 (canopy to −63.8), z 0–40; whole asset z −0.3 to 130.9; vortex 10.2 % and cloud 7.6 % of the main view. `node tests/assetLibrary.test.ts` passed (40 folders).
- Evidence/environment: `previews/` in the model folder (four GLB empty-scene views and the staged main view); every round and the final set (staged and `-glb-blank`, plus `compare-target-vs-main.jpg`) in `~/city2127-evidence/q11c-vortex-power-station/` (`ref/target_C.jpg` is the fixed comparison image)
- Integrated commit and checks: merged on main over 9ec71285; asset files, LIBRARY row and handoff only, so root/survey/module-swap `npm test` / `build` NOT RUN; `node tests/assetLibrary.test.ts` and `git diff --check` rerun on the merge
- Changes since verification: NONE

## Known issues and blockers

- Owner has seen the local previews and asked for the upload; no visual verdict on the look yet.
- Differences from the C image: the design document's sizes keep the vortex at 40 → 58 m and the dense cloud at 72 m, so the vortex is fatter at the base and the cloud smaller than in the image (wisps to 114 m soften this). The 30° main view sees the cloud from above, the image from slightly below; the vortex reads as twisted ropes rather than the image's fine airbrushed strands; the gallery is darker and the planting sparser.
- Interpretation: the document puts the walkway at z 35 and the throat lip at z 37 while the roof "steps down to the throat"; the roof rings step down 1.8 m from the walkway and a slim nozzle collar rises to the lip, so from the walkway one sees the lip and the vortex foot, not into the throat.
- 458k tris drawn is above Q11-C R1 (284k); trees, rails and the ring tubes are the easiest cuts if a budget is set. Blended vortex layers are untested in three.js sorting.

## Important decisions

- Separate folder from `q11c-storm-vortex` so the other session's R1 stays intact; the owner decides which continues.
- Dream Loop used as render → compare with the fixed image → fix, in Blender as asked (the skill's own no-Blender and subagent rules were not followed).
- Wall and swirl direction from the image: counter-clockwise from above.

## Next expected step

Owner judges the look; then a further round, picking between this and `q11c-storm-vortex`, or placement as its own task.
