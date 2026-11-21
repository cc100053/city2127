# q08c-housing-tower — Q08-C 8C 重做：五款住宅隨機配置的摩天樓框架（Blender）

- Owner: repository owner (requester of this task)
- Status: IN_PROGRESS. Pushed for owner and team review in PR #11 (https://github.com/cc100053/city2127/pull/11, base `main`); not placed in the city.
- Branch: `feat/q08c-housing-tower`, from `main` `166ed7ff0ffc9fdc01b06416d49082c70974a20d`.
- Base commit: `166ed7ff0ffc9fdc01b06416d49082c70974a20d`
- Last verified commit: the local commit that adds this file (checks ran on its worktree, see below).
- Remote availability: `origin/feat/q08c-housing-tower` (pushed 2026-11-21; model commit `a148332f`), PR #11 to `main`.

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

- **Budget.** Resolved: owner set < 200k (2026-11-21); now 195,584 (see Reduction round).
- **Look.** The model is stylised and flat. The target's sweeping crown arches that merge into the rail are still five round loops. The target's dense greenery spilling from the pods and its pearlescent shells are not reached.
- **Programme.** The 8C boat and pier route from v1/v2 was dropped; owner confirmed 2026-11-21 not to add it back. The top rail delivers houses.
- **Hanging house.** It is always `ellipse_view`, chosen because the slings clear its shell; it is not part of the draw.
- **Local tests.** `npm test` cannot pass on this clone until the ignored leftover folders are removed (owner's call) and the Windows path bug is fixed. Both are outside this task.

## Important decisions

- **New asset folder.** The work went into a new folder and node prefix (`Q08H_`). The 8C v2 stays in its stash and evidence copy for comparison.
- **Seed.** Default seed 2127; `--seed N` changes it. The output file name carries the seed only when it differs from the default.
- **House contract.** All five houses enter from the corridor side (local −z); the clay `house_back` view shows the entrance. Side houses use the same meshes, turned ±90°.

## Reduction round (2026-11-21, owner: under 200k, seed 2127, same placement, no pier)

Counted as the sum over placed instances in the reimported final GLB (`check_glb.py`): 269,528 → **195,584** tris; GLB 4,519,720 → 3,574,024 bytes. The placement map and open bays are unchanged; frame clashes 0, house clashes 0, entrances 57/57, `check_glb.py` PASS.

| Part | Before | After | Main cuts |
| --- | --- | --- | --- |
| Houses (57 + 1 hanging) | 201,884 | 148,416 | ellipse 4,936 → 3,592 (back porthole pair hidden behind the column removed, 28-point shell, one shell joint, lighter brow and balcony rail, 12-segment portholes); rib vault 2,968 → 2,348 (one pendant, one diner, no corner pot); stepped 3,584 → 2,296 (hidden bookshelf and extra pot removed, one planter, wider rail posts); glass garden 3,536 → 2,936 (lighter curved ribs, no front pot); folded roof 2,276 → 1,688 (hidden bookshelf removed). All types: one block per lift lug and slab shoe, 5-sided brackets, entrance without vestibule floor strip, door slit and number plate |
| Commons | 36,920 | 21,036 | side terraces keep benches, with planters and café sets only on the two big levels (trees dropped); pocket gardens one planter plus a low shrub box instead of `tree_indoor`; no shrub clusters in the double-height garden; two trees instead of three on level 5; lighter roof trees |
| Frame | 23,756 | 20,364 | one-segment rounded corners on columns, node collars and slabs |
| Rail | 6,348 | 5,148 | 10-sided loops |

Kept: each type's roof outline, main window frames, entrances, balconies and the furniture seen through glass (sofa, floor lamp, dining table, café table, indoor tree, desk). The 270k version is kept at `~/city2127-evidence/q08c-housing/pre-reduce-270k/` (and in commit `4fd555b3`). Same-camera comparison: `compare-reduce-270k-vs-195k.jpg` (main day, front day, main night; left before, right after); close-up spot checks: `compare-reduce-closeups.jpg` and `after-195k/{ellipse_view,stepped_terrace,glass_garden}/`.

## Sculpt round (2026-11-21, owner: no people, three sculpted types, seed 2127, < 200k)

- **People removed.** The builders no longer create any (`seated_person`, `person`, the preview promenade crowd and the review scale figure are gone). The reimported GLB and the `.blend` use no `in_skin` / `in_cloth_*` material and hold no person or figure object; the pre-sculpt GLB, used as a control, still shows five such materials. Furniture and plants are kept.
- **Ellipse view house (`rnd=3`).**
  - The shell section drops its right shoulder (`E_SKEW` 0.55), so the crown leans left.
  - A pearl-pink lip band (`_shell_band`, material `h_pearl`) wraps from the left flank over the crown to the right flank. It thins from 0.34 to 0.12 m and has a slanted front edge: 0.45 m past the nose on the left, 0.35 m short of it on the right.
  - The band starts at z 7.1. Its first try started at 6.8 and covered the side porthole.
  - The elliptical window now sits at the back of a 0.55 m reveal.
- **Rib vault house.**
  - A leaning Bézier section, steep on the left with its crown near x −0.8, falling long to a low wall on the right.
  - Four white ribs fan from one knuckle at the front-left foot (`RV_PIVOT`). Glazing bars run between them, and the front glazing bars radiate from the same corner.
  - The portal sits at z 6.8–7.15, clear of the node collars.
- **Stepped terrace house.**
  - The living step's roof sweeps out as an upper curved terrace bulging left.
  - A thicker lower curved terrace bulges right on two brackets from the beam face, with a deep fascia past the slab edge.
  - Both curved edges are planter troughs with soil, leaves and a glass guard. Bench and café table on the lower terrace.
- **Unchanged.** Glass garden and folded roof, seed 2127 placement, frame, rail and hanging house; no pier.
- **Checks (2026-11-21, uncommitted worktree on `f71bb99c`).**
  - `build_housing_tower.py`: frame clashes 0, house clashes 0, entrances 57/57, placement map unchanged.
  - `check_glb.py`: PASS, 197,896 tris expanded per placed instance. Houses 152,268, commons 19,496, frame 20,364, rail 5,148, trolley + spreader 620. 39 materials, 3,470,272 bytes.
  - Per type: ellipse 3,486, rib vault 2,684, stepped 2,464, glass garden 2,796, folded roof 1,688.
- **Review method.** The same fallback for Dream Loop as before: Blender render → compare → fix → re-render, with fixed `house`, `main` and `front` cameras.
  - Round a1 showed a dark chassis strip under the stepped terrace (the chassis was cut back to 5.4 m), a chair outside the trough (moved) and a pale band on the ellipse (made pinker and thicker).
  - Final views confirmed the porthole and the far-view silhouettes.
- **Evidence** (`~/city2127-evidence/q08c-housing/`).
  - `pre-sculpt-195k/` holds the previous `.blend`, `.glb` and report.
  - `sculpt/before|a1|after/<type>/` (beauty, clay, clay_back), `sculpt/tower/`, `sculpt/tower-before/` (main clay), `sculpt/lineup/`.
  - `compare-sculpt-closeups.jpg`: rows ellipse, rib vault, stepped; columns before, after, before clay, after clay.
  - `compare-sculpt-tower.jpg`: left before, right after; main day, main clay, front day, main night.

## Side middle slots (2026-11-21, owner: the column of benches and rails at the centre of the side view)

- **Constraint check.**
  - The sides' middle bays (x ±18..24, z −3..3) hold no lift or core; the lifts are in the core lobby.
  - On every level, the front 2.6 m of the bay is the only corridor that reaches the front corner house's door (F_0 / F_7).
  - The columns leave 4.8 m, and a pod is 4.4 m wide, so a pod there cuts the corner house off.
  - The owner chose "one of the two per level".
- **Programme (`layout.SIDE_MIDDLE`, `TERRACE_LEVELS`).**
  - Public terraces stay on levels 1 and 4 only. On the other levels without a slot the bay is a plain corridor landing with a slab-edge rail.
  - Left middle: level 0 house, level 2 empty slot, level 3 house, level 5 empty slot.
  - Right middle: level 2 house, level 3 empty slot, level 5 house.
  - On those levels the corner front bay becomes a small garden: F0_0, F2_0, F3_0, F5_0, F2_7, F3_7, F5_7.
  - The middle-bay houses are drawn after the main draw with their own rng (`seed * 7 + 1`) and the same neighbour rule. Every other front bay keeps its seed-2127 result (`test_layout.py` checks this).
  - Seed 2127 result: L0_1 glass garden, L3_1 ellipse, R2_1 ellipse, R5_1 glass garden.
- **Empty slots** (L2_1, L5_1, R3_1 and the delivery bay F4_6) show:
  - steel guide rails, a yellow footprint and a slim yellow frame of the 4.4 × 3.8 × 6.4 m pod envelope;
  - a docking plate on the corridor side;
  - amber mouth lamps and a gate bar.
- **Hoisting.**
  - The front rail line moved to z 14.3, so the hanging back face sits at 11.6, clear of every front house (max reach 11.25).
  - Side rails at x ±29.4 on arched loops serve the side slots: hanging back face at 26.7; side houses reach 26.25 at most.
  - The build reports this as `hoist.clear = true`.
- **Checks.**
  - `build_housing_tower.py`: frame clashes 0, house clashes 0, entrances 55/55 (the middle-bay houses enter from the side corridor).
  - `check_glb.py`: PASS, 198,502 tris, 39 materials, 3,703,676 bytes.
  - No people in the GLB or the `.blend`.
  - `python test_layout.py`: OK.
- **Evidence.**
  - `~/city2127-evidence/q08c-housing/pre-slots-198k/`: the previous version.
  - `slots/before|after/` (side, main: day, clay; after also night).
  - `compare-side-slots.jpg`: left before, right after; side day, side clay, main day.

## True empty slots (2026-11-21, owner: every bay without a house is an empty slot; pods slide in from outside)

- **Scope.**
  - These bays became bare empty slots: the open bays (F0_3, F1_5, F4_0, F5_5, F6_6), the side middle empty slots (L2_1, L5_1, R3_1), the delivery bay (F4_6), and the corner bays paired with an empty middle slot (F2_0, F5_0, F3_7). Each pair shares one landing, so whichever is filled first takes it.
  - Each slot has no furniture, planters, gate, lamps, footprint paint, envelope frame or slab-edge rail. Only the frame and two guide rails set flush in the slab (1.2 cm) remain.
  - The pods' bearing shoes and brackets carry them on the slab edge and the beam face.
  - Kept as designated public space: the sky gardens, the level-3 void and the side terraces on levels 1 and 4.
  - Blocked: the corner bays beside a middle house (F0_0, F3_0, F2_7, F5_7) have no corridor. They are bare too, but keep their slab-edge safety rail.
  - Rails also stay on the corridors, the void and every occupied house's balcony.
- **Fixes found by the path check.**
  - The pod's lift lugs moved from |x| 2.28 to 2.24 m, inside the 2.25 m gap between the front node collars; the spreader slings followed.
  - The rib vault's fan knuckle moved from (−2.08, 0.3, 6.62) to (−1.9, 0.42, 6.4). It had reached |x| 2.38 m at collar height and cleared the collar only through its chamfer.
  - The hoist lines moved out because the pod's entrance hood and step sit 0.6 m behind its back face:
    - front rail `GZ` 14.65; the hanging back face moved from 11.6 to 11.95 m, against the front houses' 11.25 m reach;
    - side `SIDE_HANG_X` 27.0 against the side houses' 26.25 m reach.
- **Path check (`sweep_check`, in the build report `slide_in`).** For each of the 12 empty slots and each of the five pod types:
  - lower the pod at the hoist line from its highest hoisted position (under the trolley and spreader) to the slot's level in 0.75 m steps;
  - slide it horizontally, 3 cm above the slab, in 0.25 m steps to 1 cm short of home (at home the shoes and chassis touch the frame by design; placed houses use the same allowance);
  - BVH-test every position against the frame, commons, rails and every placed house. For F4_6 its own hanging pod, spreader and trolley are excluded.
  - Result: all clear (`slide_in_all_clear: true`).
- **Opening (`opening` in the report).**

  | Measure | Pod | Opening |
  | --- | --- | --- |
  | Width between column faces | 4.60 m | 4.8 m |
  | Width at the node collars' heights (y ≤ 0.3 or ≥ 3.75) | 4.48 m | 4.5 m |
  | Height | 3.82 m | 3.9 m (beam soffit) |

  Wider or taller parts (shell band, eaves, terraces) stop outside the frame line.
- **Checks.**
  - `build_housing_tower.py`: frame clashes 0, house clashes 0, entrances 55/55.
  - `check_glb.py`: PASS, 189,574 tris, 39 materials, 3,186,660 bytes.
  - No people in the GLB or the `.blend`.
  - `test_layout.py`: OK.
- **Review guides.** `Q08H_Guides` sits in the preview collection and is never exported: a cyan pod outline at each slot's hoist line and an arrow into the opening. `review_tower.py ... guide` shows it.
- **Evidence.**
  - `pre-empty-198k/`: the previous version.
  - `empty/{side,main}_{day,guide,clay}.png`.
  - `compare-empty-slots.jpg`: rows side day (before | after), side guide | main guide, side clay (before | after).

## Push (2026-11-21, owner: upload to cc100053/city2127)

- `origin` is https://github.com/cc100053/city2127.git.
- The branch pushed 5 task commits (`4fd555b3` .. `a148332f`) touching only `asset/models/q08c-housing-tower-2127/`, `asset/models/LIBRARY.md` and this handoff. Evidence renders and backups stay outside Git in `~/city2127-evidence/q08c-housing/`.
- The pushed `.glb` is the empty-slot, no-people version: 189,574 tris, 3,186,660 bytes, SHA256 `592CD4AA…C2CDEB`.
- PR #11 targets `main`, which was 4 docs/capture commits ahead with no overlapping files. The PR was opened through the GitHub API because the `gh` CLI is not installed.

## Next expected step

The owner reviews the sheets and renders. Then: agree the triangle budget, decide on the boat/pier route, and push `feat/q08c-housing-tower`. City placement (`addCityModel`, lot, browser checks, FPS) is a separate task.
