# Q10-A — Transparent sphere furnace model

- Owner: repository owner (asset author: this task's sessions)
- Status: IN_PROGRESS (model draft uploaded for owner review; not placed in the app)
- Branch: asset/q10a-solar-furnace, merged to main (asset-only)
- Base commit: 85507f200838239e9ab0452ec56da1ee591114f8
- Last verified commit: model files checked before commit (see validation); commit SHA recorded in Git history
- Remote availability: origin/main

## Session Git state

- Session starting branch and HEAD: main at 714b4ef35af6783fe3a8452ed15018fdbaf9357b, behind origin/main by 29
- Last fetched origin/main commit: 85507f200838239e9ab0452ec56da1ee591114f8 (2026-11-27)
- Local changes present at session start: untracked `asset/models/q10a-solar-furnace/` and an uncommitted Q10-A row in `asset/models/LIBRARY.md` in the main checkout (earlier session's draft); left in place there
- Upstream integration status: work committed from a worktree started at origin/main
- Pending Git conflicts or synchronization blockers: the main checkout still holds the untracked folder and LIBRARY edit; they must be moved aside before it fast-forwards

## Goal and acceptance criteria

Owner-judged rounds on the Q10-A sphere furnace (reference: Q10 sheet image A; stand reference: a photo of a ball on a tripod ring stand). Current acceptance target (round 4, crownless): a whole glass sphere that reads at thumbnail size, sitting in an open shallow bowl; glass -> pad -> rib -> column -> base traceable from below; column feet level on plates on plinths whose tops clear the water; all three bases outside the island bridge; the bridge passes between two bases.

## In-scope files and dependencies

`asset/models/q10a-solar-furnace/` (build, review and check scripts, both model versions, check/report JSON, previews) and its `asset/models/LIBRARY.md` row. Geometry primitives come from `asset/models/q04a-suspended-pod-tower/parts.py` (read only). No app code, no placement.

## Completed work

1. Round 1: legs fork under the sphere; equator band and X bracing over the glass removed (superseded).
2. Round 2: ring stand on three arched columns, crown on side frames — frozen as `q10a-solar-furnace.{blend,glb}`.
3. Round 3: crownless variant (sphere top meets the sky, 69.5 m).
4. Round 4 (current, `q10a-solar-furnace-nocrown.{blend,glb}`): plan-first layout (feet 210/330/112 deg, cradle groups 210/330/100 deg), arched box columns, plinths and plates, open bowl cradle with 15 pads, bridge handrail posts completed to the coping. The build script now builds only this version.

## Actual validation results

- Verification status: PASSED (model-level); app integration NOT RUN (not placed)
- Date and checked worktree: 2026-11-27, files identical to the committed ones
- Commands/manual checks and results: Blender 5.2 build; `check_glb.py -- q10a-solar-furnace-nocrown` on the reimported GLB: cradle nearest to the sphere centre 14.96 m (shell 15.00: pads bear on the glass), column feet z 0.74 = plate top, bases from the pool floor (-1.27) to 0.87, bases at least 7.87 m from the bridge axis (deck half-width 0.95), story nodes present, no people nodes, 237,008 tris, 5.89 MB; core seen through the shell 32/32 rays (main), chair through tube glass 38/39 rays (poolside; one ray sees a chair directly, not investigated). Previews rendered from the GLB imported once into an empty scene (`review_solar_furnace.py --blank`).
- Evidence/environment: `previews/` in the model folder; full rounds in `~/city2127-evidence/q10a-sphere-frame/`
- Integrated commit and checks: asset-only; no root/survey/module-swap code changed, so `npm test`/`build` were not required and NOT RUN
- Changes since verification: NONE

## Known issues and blockers

- Owner has not accepted the model; it is not wired into the app.
- The crowned ring-stand version can no longer be rebuilt by the current script (its script snapshot is in the evidence folder `r3-nocrown/scripts-snapshot/`).
- The underside preview shows the cradle small; the cradle close-up (`q10a-nocrown-cradle.png`) is clearer.

## Important decisions

- Rear column foot moved left of the island bridge (owner: the bridge must pass between two bases); its top turns back to 100 deg, so the rib groups sit at 120/130/110 deg.
- Front columns keep flanking the main view (owner, round 2).
- No figures anywhere.

## Next expected step

Owner reviews the round-4 previews; then the next owner-judged round, or placement as its own task.
