# Q11-C — Storm vortex power station model

- Owner: repository owner (asset author: this task's sessions)
- Status: IN_PROGRESS (R1 model draft for owner review; not placed in the app)
- Branch: asset/q11c-storm-vortex, merged to main (asset-only)
- Base commit: 28e7727e37d77d9d9c30592171c3f6bccdd35cc9
- Last verified commit: model files checked before commit (see validation); commit SHA recorded in Git history
- Remote availability: origin/main

## Session Git state

- Session starting branch and HEAD: docs/q06-prompts at d0fb27632b066e63d2c0c76b6808e6d8868e2077 (no upstream; 1 ahead / 466 behind origin/main) in the main checkout
- Last fetched origin/main commit: 28e7727e37d77d9d9c30592171c3f6bccdd35cc9 (2026-11-27)
- Local changes present at session start: uncommitted planning-team documents and untracked resident-bedroom work in the main checkout; left untouched there
- Upstream integration status: work done in a separate worktree (`city2127-q11c`) started at origin/main
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Model the U11 option C building (`docs/planning-team/SURVEY_V2.md` Q11; reference: Q11 sheet image C, `Q11-C_嵐の風を集め、人工の竜巻で発電する建物.png`, generated from `prompts/Q11_PROMPTS.md` 案2 plus the thick-funnel follow-up): a low round power station about 120 m across and 40 m high, a ring of tall white vanes leaning the same way that turn the sea wind round the building, large turbines at their roots, a round opening in the roof from which a white, orderly, funnel-shaped tornado about 40 m thick rises through three floating thin metal rings to a flat disc cloud, a viewing walkway on the roof edge, lawn park round it. No figures. Owner judges the look.

## In-scope files and dependencies

`asset/models/q11c-storm-vortex/` (build, review and check scripts, `.blend`, `.glb`, report/check JSON, previews) and its `asset/models/LIBRARY.md` row. Geometry primitives and kit props (`bench`, `leafy_tree`) come from `asset/models/q04a-suspended-pod-tower/parts.py` and `city-kit-2127` (read only). No app code, no placement.

## Completed work

1. R1 (`q11c-storm-vortex.{blend,glb}`), built only by `build_storm_vortex.py`. Origin = building centre on the ground, sea on +y, main view from the land side (-y).
   - Podium r 67, z 0–5, with a dark glass band, a promenade rail and terrace planters with hedges (r 67–73). A 14 m stair to the land side (-y) and a 10 m stair to the waterfront (+y); two 1:12 ramps outside the planters, landing across them.
   - Drum r 54, top z 31. 30 guide vanes, 45° off radial, outer edge trailing clockwise, +9° twist root→tip, tips z 39 curling in over the roof edge; 6.77 m minimum clear gap between neighbours.
   - 30 ducted turbines (duct r 5, centre z 11.25) between the vane roots: static housings (duct, cowl, nacelle, stator) plus 30 rotor nodes sharing one mesh.
   - Dish roof with 36 spiral ribs into a 43 m opening with a lit lip; shaft down to the vortex chamber floor at z 5. Roof viewing walkway r 41–50 at z 31 with glass rails both sides and four lift heads (45/135/225/315°).
   - Vortex: core and outer shell funnels (r 17 in the opening, flaring into the cap), 84 helical streak ribbons (three tones), disc cloud r ≈ 57 at z 114–125.4. Three rings r 27 / 30 / 34 at z 47 / 78 / 110, each with a pale inner light band and six collars.
   - Plaza: paved ring to r 84 with benches and low lights, lawn to r 130 with six radial paths, a loop path and 40 trees.
2. Nodes for later animation: `TURBINE_ROTOR_006`…`354` (spin about local +x = radial), `VORTEX_STREAKS` (turn about z), `RING_LOW/MID/HIGH` (origin on the axis).

## Actual validation results

- Verification status: PASSED (model-level); app integration NOT RUN (not placed)
- Date and checked worktree: 2026-11-27, files identical to the committed ones
- Commands/manual checks and results: Blender 5.2.2 LTS (`/Applications/Blender.app`), `blender -b --factory-startup -P build_storm_vortex.py` → `report.json` (284,006 tris: STRUCTURE 96,356 / TURBINES 46,680 / VORTEX 19,708 / RINGS 25,344 / DECK 15,978 / PLAZA 79,940; 90 objects, 41 materials, GLB 5,628,504 bytes). `check_glb.py` on the reimported GLB → `check.json`: one root `Q11C_StormVortex`, all named nodes present, 30 rotors with 0.0 m offset from their duct axes and 0 axis error, rings/streaks centred on the axis, no people nodes, seven transparent materials all BLENDED, bounds x/y ±130 m (trees to 131), z −0.3…125.7; from CAM_MAIN the vortex covers 11.0% of the frame, turbine blades/hubs 0.19%. `node tests/assetLibrary.test.ts` passed (39 folders).
- Evidence/environment: `previews/` in the model folder; full R1 set (staged views plus the GLB alone in an empty scene, `--blank`) in `~/city2127-evidence/q11c-storm-vortex/r1/`
- Integrated commit and checks: asset-only plus the LIBRARY row; no root/survey/module-swap code changed, so the full `npm test`/`build` were NOT RUN; `git diff --check` clean
- Changes since verification: NONE

## Known issues and blockers

- Owner has not reviewed R1; it is not wired into the app.
- The rings float with no visible support, as in the reference image.
- The vortex is static geometry with blended transparency; how it sorts and reads in three.js (and whether it should move) is untested.
- 284k tris is above Q10-A R4 (237k); PLAZA trees and the roof glow rings are the easiest cuts if a budget is set.

## Important decisions

- Follows the reference over the prompt where they differ: vanes are curved crescent blades rather than flat walls; the funnel fills the opening (r 17) and widens to the disc cloud.
- No figures; scale from stairs, rails, benches and lift heads.
- Q11 is a new question (11-21); the model is a standalone draft like Q10-A, with no site or rotation slot chosen.

## DEV showcase (2026-11-27)

Owner chose a DEV-only showcase over a rotation slot or fixed background: `?showcase` ([src/devShowcase.ts](../../src/devShowcase.ts)) loads this GLB as an island on the west bay at (−900, 420), yaw π/2 (land side east, toward the city), static opaque parts baked; the turbine rotors (local +x), vortex streaks and the three rings turn in the render loop (not under reduced motion). [tests/devShowcase.test.ts](../../tests/devShowcase.test.ts) keeps it west of the hero district, clear of the Q02 sea lots, the other draft and every boat by 15 m. Checked in the dev server (Windows, in-app browser): loads with no console error, sits on open water, does not show in production builds. `npm test` on Windows: the new test passes; assertGuard, surveyMeterPipeline, energyPipeline, rotationPipeline and rotationLayout fail the same way on clean main (a doubled drive prefix when the survey question files load on Windows, and the SIGKILL watchdog). `npm run build` and `git diff --check` passed.

## Next expected step

Owner reviews the R1 previews; then the next owner-judged round, or placement as its own task.
