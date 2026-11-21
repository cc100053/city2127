# q08c-housing-tower — Q08-C 8C 重做：五款住宅隨機配置的摩天樓框架（Blender）

- Owner: repository owner (requester of this task)
- Status: IN_PROGRESS — the local model is ready for owner review; not placed, not pushed.
- Branch: `feat/q08c-housing-tower`, from `main` `166ed7ff0ffc9fdc01b06416d49082c70974a20d`.
- Base commit: `166ed7ff0ffc9fdc01b06416d49082c70974a20d`
- Last verified commit: the local commit that adds this file (checks ran on its worktree, see below).
- Remote availability: NOT PUSHED (owner: 「先在本機完成，等我看過再上傳 GitHub」).

## Session Git state

- Session start: `main` `96ab51a1`, clean, 67 commits behind `origin/main`; fetch on 2026-11-21 succeeded; `main` fast-forwarded to `166ed7ff`.
- `git` is not on PATH on this workstation; GitHub Desktop's bundled `git.exe` was used.
- The 8C v2 (boat-room skyscraper) was never committed. It exists only in `stash@{0}` (GitHub Desktop, `feat/q08c-boat-room-skyscraper`) and `.dream-loop/q08c/`. It was copied, unchanged, to `~/city2127-evidence/q08c-housing/original-v2/` for comparison; the stash was left untouched.
- Leftover ignored folders (`car-candidates-2127`, `q07b-pickup-tower`, `q08c-boat-room-skyscraper`, `ship-refs-2127`; only `__pycache__` / `.blend1`) were left alone.

## Goal and acceptance criteria

Redo 8C from the owner's reference (`.dream-loop/q08c/target.png`): first five stand-alone houses at one detail level, then a seeded random placement into the big frame, keeping the heavy column/beam frame, varied house pods, sky gardens and the top delivery rail. Polish the ellipse house in a baseline + two rounds with fixed camera and light. Deliver an editable `.blend`, the tower `.glb`, a five-house sheet, ellipse before/after close-ups and clay renders, tower day and night previews, and test two seeds. The owner's visual review decides acceptance.

## In-scope files

`asset/models/q08c-housing-tower-2127/` (new) and a row in `asset/models/LIBRARY.md`. No `src/` change.

| File | Role |
| --- | --- |
| `common.py` | loft / rounded-box / frame / ring helpers, Blender boolean helper, materials (`modules.ROLES` interiors) |
| `houses.py` | the five houses and the house contract (origin, entrance −z, \|x\| ≤ 2.2, height ≤ 3.8, projection ≤ 8.4) |
| `layout.py`, `test_layout.py` | slot grid, reserved programme, seeded placement, stats; plain-Python check |
| `build_housing_tower.py` | frame, commons, rail, houses, clash and entrance checks, `.blend` / `.glb` / `report-s<seed>.json` |
| `staging.py`, `review_houses.py`, `review_tower.py`, `sheet.py`, `check_glb.py` | preview light and cameras, renders, sheets, GLB reimport check |

## Method: Dream Loop availability

The `dream-loop` skill exists in `.agents/skills/dream-loop`, but it could not run as written. It needs an image-generation tool and `FAL_KEY` (neither was available), its Plus workflow delegates building to subagents, and it says not to model in Blender, which conflicts with this project's Blender asset pipeline. As the owner allowed, the same render → compare → fix → re-render loop was run with Blender scripts: fixed cameras (`staging.CAMERAS`), fixed sun and sky, the owner's reference as the target, and an EEVEE beauty render plus Workbench clay renders each round.

## Ellipse view house rounds (camera `house`, 32 mm; clay also from `house_back`)

| Round | Geometry changes | Tris |
| --- | --- | --- |
| r0 baseline | one closed shell sitting on the slab; the window is a glass disc with a thin ring stuck on the nose; portholes and the door are flat decals; the projecting part has no support | 1,620 |
| r1 (draft r1a, then r1) | hollow shell (outer skin, 0.3 m window lip, inner skin, back wall); portholes cut through the wall with ring tubes; recessed entrance (0.55 m reveal, portal, canopy, threshold step, lamp, plate); dark chassis with lift lugs, slab-edge shoes, underside fairing and brackets to the beam face; the nose moved 1.25 m past the frame line so the front porthole shows past the column; brow hugging the nose | 3,304 |
| r2 (drafts r2a, r2b) | deep champagne window frame (0.42 m) standing proud, glass set back, one mullion; sofa, floor lamp, rug, plant and a seated resident placed in the window's view; curved viewing balcony with a glass rail; two recessed shell joints and a seam where the shell meets the chassis; window lowered and the transom dropped so the sofa shows (r2b); porthole rings cut to 14 segments for the tower budget (final r2) | 6,832 → 4,936 |

Remaining gaps against the reference: the shells are clean flat-PBR white, not the target's soft, pearly, plant-covered pods; the glass is clear rather than tinted; seams only show at close range.

## Tower

- **Slots.** 56 front bays (8 × 7 levels) plus 14 side back bays. The sides' middle bays carry the front corridor out to the end houses, so they hold public terraces on every level instead of houses (larger ones on levels 1 and 4).
- **Reserved slots.** Delivery bay F4_6 with rails and lights, where an ellipse house hangs from the trolley and spreader at its level. A double-height sky garden on level 2 under a level-3 slab opening in bays 3–4, with rails round the opening. A level-5 sky garden in bays 1–2. Glass lifts in a lobby cut into the core. Roof garden.
- **Placement rule.** Pocket gardens are about 10 %: front only, at most one per level, never next to another open or reserved bay. Types are then drawn in seeded random order, never equal to an already-placed neighbour above, below, left or right, and weighted toward the least-used types.
  - The rule changed after the first renders: seed 2127 had stacked ground-level openings and side openings, which read as missing houses.
- **Results.** Both seeds have no same-type neighbours, no periodic rows and all five types present.

| Seed | ellipse | rib vault | stepped | glass garden | folded | houses | open | tris | GLB bytes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2127 (default, asset folder) | 11 | 12 | 14 | 9 | 11 | 57 + 1 hanging | 6 | 269,528 | 4,519,720 |
| 8 (evidence only) | 13 | 11 | 9 | 11 | 13 | 57 + 1 hanging | 6 | 270,276 | 4,528,532 |

Per-type triangles: ellipse 4,936, rib vault 2,968, stepped 3,584, glass garden 3,536, folded roof 2,276. Seed 2127 parts: houses 201,884, commons 36,920, frame 23,756, rail 6,348, trolley + spreader 620. 43 materials in the GLB, no textures. Bounds 58.71 × 32.26 × 49.17 m (Blender x, y, z).

## Actual validation results

- Verification status: PARTIAL.
- Date and checked worktree: 2026-11-21, `feat/q08c-housing-tower` worktree on `166ed7ff` with this task's files. Blender 5.2.2 LTS, Windows 11, built-in glTF exporter (GLB, +Y up, selection = `Q08H_Asset`, extras, no animation, cameras or lights).
- `build_housing_tower.py`, seeds 2127 and 8, BVH checks:
  - **Frame clashes (houses vs columns, beams, slabs, core): 0.** Each house is nudged 4 mm off its slab and beam contacts for this check.
    - The first pass found 10 folded-roof houses whose ridge plate touched the beam soffit. The ridge was lowered 0.12 m.
  - **House–house clashes: 0.**
  - **Entrances: 57 / 57.** Every door threshold is over the corridor floor (gap 0), and its path 1.6 m into the corridor is clear.
- `check_glb.py` reimport, both seeds: PASS.
  - All nodes are present and every house has `house_type`.
  - The 5 types share 5 meshes.
  - All glass is BLENDED.
- `python test_layout.py`: OK. It checks seeds 2127, 8, 1 and 99 for:
  - reproducibility;
  - no same-type neighbours and no periodic rows;
  - the reserved slots and the open-bay rules.
- Root `npm test`: FAILED locally, as on the 8C v2 session.
  - `assetLibrary` lists only the four leftover ignored folders; the new folder's row is accepted.
  - The 45 tests after it in the chain were run one by one. 41 pass. 4 fail with a Windows path bug in the survey question loader (`C:\C:\…questions.*.json`): `surveyMeterPipeline`, `energyPipeline`, `rotationPipeline` and `rotationLayout`. None of them read this task's files.
- `npm run build`: passed. `git diff --check`: passed.
- Not run: three.js integration, `?asset-preview`, FPS, `survey/` and `module-swap/` (unchanged).
- Evidence: `~/city2127-evidence/q08c-housing/`.
  - `ellipse/r0, r1a, r1, r2a, r2b, r2` (`beauty`, `clay`, `clay_back`) and `compare-ellipse-rounds.jpg`: beauty, clay and back-clay rows; columns r0, r1, r2.
  - `lineup/final` and `compare-five-houses.jpg`.
  - `final-s2127/{main,front,side}_{day,night,clay}.png` and `final-s8/{main,front}_{day,night}.png`.
  - `compare-tower-vs-target.jpg`: target | 8C v2, then seed 2127 | seed 8 by day, then by night.
  - `original-v2/` (the untouched 8C v2).

## Known issues and gaps

- **Budget.** 269.5k triangles, against 8C v2's self-set ≈ 150k that was never agreed. Needs the owner's decision. Possible cuts if needed: fewer commons props and people (37k), lighter rails, lower-poly furniture.
- **Look.** The model is stylised and flat. The target's sweeping crown arches that merge into the rail are still five round loops. The target's dense greenery spilling from the pods and its pearlescent shells are not reached.
- **Programme.** The 8C boat and pier route from v1/v2 was dropped. The rail delivers a house straight to the delivery bay. Say if the waterside unloading should come back.
- **Hanging house.** It is always `ellipse_view`, chosen because the slings clear its shell; it is not part of the draw.
- **Local tests.** `npm test` cannot pass on this clone until the ignored leftover folders are removed (owner's call) and the Windows path bug is fixed. Both are outside this task.

## Important decisions

- **New asset folder.** The work went into a new folder and node prefix (`Q08H_`). The 8C v2 stays in its stash and evidence copy for comparison.
- **Seed.** Default seed 2127; `--seed N` changes it. The output file name carries the seed only when it differs from the default.
- **House contract.** All five houses enter from the corridor side (local −z); the clay `house_back` view shows the entrance. Side houses use the same meshes, turned ±90°.

## Next expected step

The owner reviews the sheets and renders. Then: agree the triangle budget, decide on the boat/pier route, and push `feat/q08c-housing-tower`. City placement (`addCityModel`, lot, browser checks, FPS) is a separate task.
