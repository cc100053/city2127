# q07b-pickup-tower — Q07-B 回る本棚のような受け取り塔 (Blender model, Dream Loop)

- Owner: repository owner (requester of this task)
- Status: IN_REVIEW — v4 (readable parcel route, 2026-11-22) pushed for owner review as a pull request to `main`; model only, not placed in the city
- Branch: `feat/q07b-pickup-tower` (created locally from `main`)
- Base commit: `df59a7defc14552fadd3f91920498c58707fe532`; `origin/main` `5087b7d8` merged in on 2026-11-22
- Last verified commit: `8b6470c9` (v4 model checks); the merge commit was re-checked with `assetLibrary.test.ts` and `git diff --check`
- Remote availability: PUSHED to `origin/feat/q07b-pickup-tower` (owner request, 2026-11-22). The `.blend` and `.glb` were downloaded from GitHub at the pushed commit; their sizes match the local files (1,978,764 and 4,530,228 bytes)
- Merge note: `asset/models/LIBRARY.md` conflicted with `main`, because both sides added a row at the end of the folder table. Resolved by keeping `main`'s `q08c-housing-tower-2127` row and adding the `q07b-pickup-tower` row after it. Against `origin/main` the file differs by that one added line.

## Session Git state

- Session starting branch and HEAD: `main` at `370a965f5d2a496f31122a71f452921851370fe6`, clean
- Last fetched origin/main commit: `df59a7defc14552fadd3f91920498c58707fe532` (fetched 2026-11-19); local `main` was 20 behind, not diverged, fast-forwarded
- Local changes present at session start: NONE. Pre-existing ignored leftovers in `asset/models/car-candidates-2127/` and `asset/models/ship-refs-2127/` (`__pycache__`, `*.blend1`) were left untouched.
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Build the Q07-B pickup tower from the owner's PDF (`2127_施設画像27枚_想像力優先版_一覧 (1).pdf`, p.8, middle column) in Blender, polished with at least two Dream Loop rounds against one fixed target. Deliver an editable `.blend`, a city2127-ready `.glb` and every round's renders. Requirements:

- The tower silhouette and shelf tiers of the image are kept, at residential-hub scale.
- From the street, the entrance and the pickup point can be read at once, and so can the parcel route.
- Shell, pickup port and rotating shelves are separate objects; each rotating part has its origin on its real axis.
- The GLB holds the facility only.

Acceptance is the owner's visual review.

## In-scope files and dependencies

- `asset/models/q07b-pickup-tower/build_pickup_tower.py`: the builder (reuses `asset/models/geo_helpers.py`: `Acc`, `B`, `obox`, `cyl`, `blob`, `material`).
- `review_pickup_tower.py`: renders the preview cameras.
- `check_glb.py`: the reimport check.
- `q07b-pickup-tower.blend`: the asset plus the `Q07B_Preview` staging collection, which holds ground, trees, people, sun, world and the cameras `CAM_MAIN`, `CAM_STREET` and `CAM_PORT`.
- `q07b-pickup-tower.glb`: the export of the `Q07B_Asset` collection only.
- `asset/models/LIBRARY.md`: a new folder row, status draft.
- Exclusions: no `src/` change, no placement, no change sheet, no kit or module entries.

## Completed work

**Massing.** The tower is a 11 m drum, R 5.5 m. Its arched legs flare to ≈ 12.6 m and it stands on a 13.8 m plinth. It is 14.26 m high to the mast caps.
- Arched base: 0.15–3.6 m, with a 3 m portal at the front.
- Rotating drums: six, 1.45 m each, two shelf tiers each (12 tiers), from 3.6 to 12.3 m.
- Roof: deck at 12.6 m, open arcade to 13.65 m.

The scale follows the Q07 brief in `docs/planning-team/IMAGE_PROMPTS.md`: the footprint stays close to the 12 m service-facility depth, and the tower stays below the 16 m housing block. The 8 m service-facility height limit was **deliberately exceeded** to keep the tower silhouette the owner asked for.

**Node structure.** Front is −Y in Blender (+z in three.js); the origin is the ground-contact centre.

| Node | Origin (Blender m) | Role |
| --- | --- | --- |
| `Q07B_PickupTower` | (0, 0, 0) | export root (empty) |
| `Q07B_Shell` | (0, 0, 0) | static: base arches, lit lobby glazing, rounded wavy floor bands with glow lines, columns, masts, lift rails, deck, arcade, planters, roof loader arms and pallets |
| `Q07B_PickupPort` | (0, 0, 0) | static: hall (lit parcel wall, big/small lockers, screen, retracted doors, threshold), lift dock counter with street hatch and landing pad, entrance sign |
| `Q07B_ShelfRing_01..06` | (0, 0, 3.60 + 1.45·k) | rotating drums; spin about local Z (three.js Y), the tower axis |
| `Q07B_LiftCarriage` | (3.34, −4.95, 7.00) | travels along Z from 1.84 m (dock pad) to 13.10 m (roof deck); parked at 7 m |

**Parcel route** (readable in the renders): drones land on the roof deck; the arms load the drums; a drum turns the parcel's cubby to the front-right lift; the carriage brings it down the facade to the dock counter beside the entrance. Residents (or staff) also collect from the hall's parcel wall and lockers. Manned or automatic operation is left open, per the brief.

**Materials.** 17 flat Principled PBR materials (`q07b_*`) with no textures:
- Base colours: warm white #EEE8DE, kraft #C89A64, wood #D9B27A, teal accents.
- Emissive: shelf backs, glow strips and screens. Emission above 1 exports through `KHR_materials_emissive_strength`.

**Export.** Blender 5.2.2 LTS built-in glTF exporter, GLB, `use_selection` on `Q07B_Asset`, `export_apply`, +Y up, extras on (rotation and travel notes), no animation, cameras or lights. Draco and Meshopt are off.

**Dream Loop.** The target was locked as `.dream-loop/q07b/target.png`: the PDF's embedded 1100 × 825 image, extracted with pypdfium2. Rounds R1–R4 and final all use the same `CAM_MAIN`. Two independent reviewer subagents compared the R1 and R3 renders against the target. Renders: `.dream-loop/q07b/{r1,r2,r3,r4,final}/{main,street,port}.png` and `rounds-vs-target.jpg`, copied to `~/city2127-evidence/q07b-pickup-tower/`.
- **R1:** baseline; washed-out lighting and a camera that looked down too steeply.
- **R2:** reframed; warm palette; four rounded wavy bands; roof arcade; denser parcels; lift down to the entrance.
- **R3:** pulled back; brighter hall.
- **R4:** six two-tier drums; thinner bands with a radial wobble; lower arcade; lift moved beside the right leg; bigger carriage; landing pad; roof with 4 arms and 6 pallets.
- **Final:** QA fixes. Coplanar faces were offset; floating parts were seated; the vertex weld was removed; the roof was re-laid as 3 arms and 6 non-overlapping pallets.

## Actual validation results

- Verification status: PARTIAL (asset checks passed; application NOT INTEGRATED)
- Date and checked worktree: 2026-11-19, uncommitted worktree on `df59a7d`
- `check_glb.py` (GLB reimported into an empty scene): **PASS**.
  - All 9 nodes are present and parented to the root.
  - Drum origins are on the axis.
  - The portal reaches Y −6.0 (front −Y).
  - Bounds are 13.80 × 13.80 × 14.26 m with z min 0.00.
  - 90,620 triangles, 17 materials, 9 meshes, GLB 3,020,720 bytes.
- `blender-asset-qa/qa_check.py` on the nine meshes (`--no-uv`): pass=false, with these residual items:
  - **z-fighting:** 7 same-facing coplanar pairs between shell and port (wall feet and rail feet on the plinth) and 4 inside the carriage, down from ≈ 3,000 before the fixes. The pairs that could be seen (dock hatch, sign pictogram, shelf posts) were fixed.
  - **Detached parts:** 4 exactly-touching parts: the dock landing pad, one roof parcel and two drum plant leaves.
  - **Warnings:** duplicate vertices at section seams and n-gon caps.
  - **Not checked:** UVs, because there are no textures.
- `tests/assetLibrary.test.ts`: the new row is accepted. Locally the test still fails on `car-candidates-2127` and `ship-refs-2127`, which hold only ignored leftovers that pre-date this task; a clean clone does not have these folders.
- Root `npm test`: FAILED, on `assetLibrary.test.ts` for the two pre-existing leftover folders above. The test chain stops at that failure, so the later root tests were NOT RUN in this session.
- `npm run build`: NOT RUN; no `src/` or package file changed.
- `git diff --check`: passed (exit 0). New untracked text files: no trailing whitespace (grep).
- Application verification: NOT INTEGRATED (no runtime consumer; `?asset-preview` not run).

## Known issues and blockers

Gaps that remain against the target:
- **Interior and materials.** The target's photographic richness is missing: dense mullions, warm light spill, textured boxes. Materials are flat with no texture maps.
- **Portal.** The target's portal is about two tiers tall and opens onto a large lit parcel counter. Ours is a 3 m arch, with the hall behind it.
- **Bands.** The target's bands bulge irregularly. Ours follow a regular sine wave.
- **Roof deck.** The target's deck is a broad flat disc with large arms. Ours keeps a planter ring inside the arcade.

Other limitations:
- **Not budgeted.** At 90,620 triangles the model is heavy for a district slot: the shell has ≈ 49k and each drum ≈ 6.5k. It is not optimized and not measured in the app.
- **Static drums.** Every drum carries the same parcel distribution style. They stay static until an animation contract exists.
- **Not in the library.** The parcel, arm, drum and pallet parts are not yet library entries (site-only for now).

## Important decisions

- Following the owner's explicit request, the model was built in Blender by this session, not delegated as in Dream Loop Plus mode, and Blender was used for modelling despite the Dream Loop asset note. Only the visual review was delegated, to fresh reviewer subagents.
- Scale: residential hub, ≤ 12 m drum footprint, ≈ 14 m height; the 8 m guideline was exceeded on purpose to keep the tower silhouette.
- Facing: the portal is on +z in three.js. The lift is on the front-right, 34° from the portal axis.

## v2 round (2026-11-19, owner request: facade, pickup window, materials)

Owner brief: thinner bands, glass, metal frames and depth in front of the shelves; full-height glass and vertical guide rails on the main view; a pedestrian pickup window with a warm frame, a hand-over tray and a clear operation panel; distinct shell, metal, glass and cardboard, a little warm light, varied parcels, close-up detail through materials, textures and small bevels, within budget. Same target and main camera.

**Preserved v1 for comparison.** `.dream-loop/q07b/v1/` holds the v1 `.blend`, `.glb` (SHA256 `931F1771…B0ECB7`, 3,020,720 bytes, 90,620 tris) and its scripts. This is outside Git; v1 was never committed. The asset path now holds v2.

**Changes.**

| Area | v2 |
| --- | --- |
| Floor slabs | thin wavy slabs, 8 cm, flat soffit, small nose; were 30 cm round tubes |
| Facade | full-height glass at R 5.15, alpha 0.08 BLEND, single-sided; dark-metal (#7F8790) mullions every 10°, every third a 13 cm-deep vertical guide rail |
| Drums | moved in to R 4.55, so 0.6 m of depth behind the glass; under-shelf amber glow strips; fewer empty cubbies; flat, tall and stacked parcels with random gaps, depth and ±6° yaw |
| Lift | moved to the front centre: glass chute with four guide rails and slab brackets. The carriage is parked at 2.75 m, carries a parcel and travels to the window at 1.27 m. |
| Pickup kiosk | sits at the chute foot. It has bevelled corners, a warm-lit window frame, an aluminium hand-over tray with a teal lip and a parcel on it, an operation panel on the right pillar at 1.0–1.5 m (UI texture screen, scan pad) and a header sign with a down arrow |
| Storefront | glazed, with a sliding entrance door on the left; the hall behind it is kept |
| Signage | a split teal sign over the arch; the old sign and the right-leg dock counter are gone |
| Materials | warm-white shell #F2EFE8 |
| Textures | 512 px parcel atlas (four box styles with tape, labels, barcodes and shaded edges) and a 512 px UI atlas, generated and packed, then embedded in the GLB |

**New scripts.**
- `staging.py`: the shared sun, sky, cameras, ground and figures.
- `render_glb.py`: renders a GLB in a clean scene.
- `check_glb.py`: now also checks glass blending, emission, textures, drum clearance when turned, and carriage rails.

**Rounds.** R5 → R8 → final. One independent reviewer judged R7 against the target and v1; its points were applied in R8. Renders: `.dream-loop/q07b/{r5,r6,r7,r8,v2-final,v1-glb}/` and `v1-vs-v2.jpg`, copied to `~/city2127-evidence/q07b-pickup-tower/`. Before and after both use one GLB-in-clean-scene setup with the same cameras and light.

**Validation, uncommitted worktree on `df59a7d`.**
- `check_glb.py`: **PASS**.
  - 74,616 tris, 21 materials, 9 meshes, GLB 3,675,128 bytes.
  - Images: `q07b_parcel_atlas` and `q07b_ui_atlas`, 512 × 512 each.
  - Glass: alpha 0.08, BLENDED after reimport.
  - Emission after reimport: warm 6.0, glow 4.5, shelf back 2.2, teal 2.7, UI 1.4 (textured).
  - Drums: all six origins on the axis. Turned 37°, each spans r 1.40–4.55 between the core (1.25) and the slab edge (4.60).
  - Carriage: inside its rails (x ±0.32 against rails at ±0.38).
  - Bounds: 13.80 × 13.85 × 14.26 m.
- `qa_check.py`: pass=false. Residual items:
  - 27 same-facing coplanar pairs. Per the diagnosis, all are hidden: bottoms on the plinth, door tops inside the transom, the niche side panels behind the pillars.
  - 3 exactly-touching parcels: one on the roof pallet, two jittered stacks in the drums.
- Not run: three.js integration, `npm test`, `npm run build`.

**v2 gaps against the target.**
- **Materials and lighting.** It is flat-colour, stylised staging: the target's photographic warmth and detail are not reached.
- **Parcels behind the glass.** They are still paler than in v1, though readable.
- **Pickup.** The kiosk is small at main-view scale. The target's wide lit bay with the hand-over in front is shown as kiosk plus storefront instead.
- **Budget.** It is self-set (≤ 90k) and not yet agreed with the owner.

## v3 round (2026-11-22, owner request: roof arms only)

Owner brief: polish only the roof arms. Keep their roof sites and scale; follow the target for use, proportion, pose and end tool; make the fixed and rotating base layers, the joints and the end tool readable (grey model first), and keep the 7B palette. Two Dream Loop rounds with a fixed camera and light, no intersection with the roof, local only until the owner reviews.

**Session Git state.** Main checkout `main` at `a0df0603`, clean and equal to `origin/main` (fetched 2026-11-22). The branch `feat/q07b-pickup-tower` (`8b12ab44`, local only, on `df59a7d`) was resumed in the worktree `../city2127-q07b`, not merged with `main`.

**Reference reading.** The target's roof shows white palletising robots on dark square base plates. Each has a short turret, a big round shoulder, an upper arm leaning back, an elbow, and a forearm reaching over the deck. The wrist points the tool down to pick parcels. No drive rods or harness can be made out at the target's resolution. v3 therefore adds a harness only as the brief's material layer and routes it round the joints. It has no drive rods.

**What changed** (`build_arm`, one call per arm; v2 sites and reach are unchanged):
- Bases stay on r 3.2 at FRONT + 20°, 140° and 260°.
- The wrist is over r 2.2, +0.38 rad.
- The elbow is 1.5 m above the deck, as in v2.

| Part | v3 |
| --- | --- |
| Fixed | 0.8 m chamfered dark mount plate with four washer + hex anchor bolts; dark-metal flanged pedestal with 8 flange bolts; junction box with a cable gland |
| Rotating | dark recessed bearing gap, then a white chamfered turntable with a teal index mark, and the turret |
| Joints | shoulder (r 0.21, side motor on −S, hub), elbow (r 0.16, rear motor along the forearm), wrist roll ring (J4), wrist pitch (J5); each housing steps down to a metal ring and a dark cap |
| Links | tapered rounded-rect upper arm and forearm, a dark recessed seam ring near each end |
| Harness | dark rubber (`q07b_cable`, new material): turret → loop round the shoulder → back of the upper arm → loop over the elbow → top of the forearm → wrist, held by four metal clamps |
| Tool | J6 rotary and dark tool flange, white gripper body with a teal status strip, dark rail, two finger carriages, metal fingers with lips under the parcel, teal grip pads; one parcel held ≈ 0.73 m above the deck |

The arms stay merged into `Q07B_Shell`; v2 had no arm nodes, pivots or animation, so nothing was preserved or re-checked for motion. The build keeps `rng` consumption identical (one parcel per arm), and the other eight nodes are byte-identical in their vertices to v2 (hash check below).

**Dream Loop.**
- Fixed setup:
  - New cameras in `staging.py`: `arm`, `armbase` and `armtool` on the right arm (FRONT + 260°), from its front-right on the harness side, plus `oblique` for the whole tower.
  - The light is the shared sun.
  - `render_glb.py --clay` renders the grey model.
- **R1 (silhouette, proportion, joint positions):**
  - The joints read in order.
  - The first camera cut the elbow; it was re-aimed once, and before and after were re-rendered with the final cameras.
  - The elbow harness loop was too wide and one clamp floated.
  - The fingers were broad slabs that hid the pads.
  - At 5,840 tris per arm the arms were too heavy.
- **R2 (seams, end tool, roof junction):**
  - The plate sits flat on the deck, and the bolts and flange read.
  - The bearing gap separates the fixed and rotating layers.
  - Seam rings and caps read in grey.
  - Fingers were narrowed so the pad edges show, and finger carriages were added on the rail.
- **Final:**
  - The elbow was lowered from 1.6 m back to v2's 1.5 m, to keep the scale.
  - Lips and the junction box were moved off coplanar faces.

Renders are in `~/city2127-evidence/q07b-arm-polish/`, outside Git:
- Folders: `{before,r1,r2,final}/`.
- Sheets: `compare-closeup.jpg`, `compare-clay.jpg`, `rounds-arm.jpg`, `compare-oblique.jpg`.

**Files.**
- The asset path holds v3.
- v2 is preserved outside Git in `.dream-loop/q07b/v2/`: `.blend`, `.glb` (SHA256 `C3F52F0B…60AD76`) and scripts.
- v3 is copied to `.dream-loop/q07b/v3-arm/q07b-pickup-tower-v3-arm.{blend,glb}` (GLB SHA256 `D911B9ED…2CA8358`).
- The R1 GLB is in `.dream-loop/q07b/v3-r1/`.

**Validation, uncommitted worktree on `8b12ab44`.**

Arm triangles (fan count, n-gon = n − 2):

| | Per arm | Three arms |
| --- | --- | --- |
| v2 | 256 | 768 |
| v3 | 4,568 | 13,704 |

The v3 per-arm count splits into 816 fixed (mount) and 3,752 above the bearing.

- **Build checks:**
  - `ARM_CLEARANCE`: 0 overlapping triangle pairs between the parts above the bearing and the deck, arcade, planters and pallets.
- **`check_glb.py`:** PASS.
  - 87,552 tris (v2 74,616), 22 materials, 9 meshes.
  - GLB 4,287,436 bytes.
  - Bounds 13.80 × 13.85 × 14.35 m. It is 14.26 m in v2: the harness loop over the elbow is now the highest point, about 9 cm above the mast caps.
- **Node comparison with v2:** the carriage, the port and all six drums are identical (triangles and vertex hash). Only `Q07B_Shell` differs: 36,172 → 49,108, which is −768 + 13,704.
- **`qa_check.py` on `Q07B_Shell`:**
  - z-fighting 0 (the first build had 47, from the gripper lips and the junction box; fixed).
  - The only error is the floating roof parcel at (0.22, 2.80, 13.51), also present in v2.
- **`assetLibrary.test.ts`:** PASS.
- **Root `npm test`:** FAILED at `surveyMeterPipeline.test.ts`, which stops the chain.
  - The tests after it were run one by one: all PASS except `energyPipeline.test.ts`.
  - Both failures have one cause. `survey/tests/surveyFixture.ts` turns `new URL(...).pathname` into a file path, which breaks on Windows under this non-ASCII path (`C:\C:\…%E6…`).
  - The cause is outside this change: `survey/` is untouched.
- **`npm run build`:** PASS.
- **`git diff --check`:** PASS.

**v3 gaps and limits.**
- The arms are static and site-only. They could become a kit entry once accepted.
- 4.6k tris per arm is heavy for a part seen mostly from afar. An LOD or a lighter far version is the lever if the budget tightens.

## v4 round (2026-11-22, owner request: a readable parcel route)

Owner brief: keep the round tower and the roof arms, follow the original 7B design, and make the parcel route readable from outside.
- **Roof:** an explicit unload point and fixed buffer positions, and an arm that reaches both.
- **Lift:** a level hand-over into the car at the roof and at the ground.
- **Ground:** a resident entrance, a rain shelter and a pickup counter on the sidewalk side, reached through a back-of-house area.
- **Checks:** one parcel through the whole route, three Dream Loop angles, and a flow preview with arrows.

**Session Git state.**
- `origin/main` was fetched at `e4bc592b`. The main checkout's `main` is 3 behind it and was left alone.
- The branch `feat/q07b-pickup-tower` at `cc2b561b` was resumed in `../city2127-q07b`, not merged with `main`.

**What the original design says.**
- **Central round platform:** in v1–v3 it was only the cap of the static service core (`R_CORE` 1.25 m, 0.55 m above the deck), with a white ring to r 1.7 and a teal "drone pad ring" at r 2.35–2.55.
  - The only story was "drones land on the roof deck".
  - The target image shows the roof centre as plain deck.
  - So it had no assigned use. v4 makes it the unload table.
- **Freight lift:** the side vertical member is v2's front glass chute, with `Q07B_LiftCarriage` inside it.
  - Its tower side (−z) is open, so the roof and ground doors both go on that side, one above the other.
  - The older drum route (a drum turns a cubby to the lift) stays possible as a storage branch.

**Changes.** Levels: roof hand-over 12.95 m, ground hand-over 1.05 m, car floor 0.26 m below the car centre.

| Area | v4 |
| --- | --- |
| Unload table | r 1.85 m on the core, top 13.08 m, dark inlay, teal landing ring and rim light. One unload bay per arm on r 1.45, with end stops (the fingers pass on the sides) and teal side marks |
| Arms | `build_arm(…, pc, tool_s)` places them with a 2-link IK on the v3 link lengths. The mount stays on v3's home direction; the turntable mark turns with the arm; J6 aligns the gripper to the parcel. The front arm sets a parcel on the roller table, the left arm lifts one off its bay, the right arm stacks one on a buffer pallet. The grip pads bite 2 mm; the lips sit just under the parcel |
| Buffer | four fixed pallets with teal corner marks, two beside each rear arm (±28°, r 3.25), replacing v3's six scattered pallets |
| Roof roller table | z 3.75–5.60 at x 0, end stop at the arm end, legs on the deck. The planter ring opens ±7° there, with no leaves within 11°. The two front arcade arches become three 20° arches, so one opens over the table; the other nine are unchanged. Lift door: sill flush with the car floor, lit header, the rails as jambs |
| Lift foot | replaces the kiosk: hollow shaft base, pit at 0.90 m, rails down to it, a cap ring round the car hole. The door on the tower side is level with the car floor. The street face has a small light service hatch and the lift light |
| Passage | glazed roller passage from the lift-foot door to a hatch in the storefront's service wall |
| Storefront | left: the residents' sliding door with lit jambs. Middle: the service wall with the roller hatch. Right: the pickup counter (lit frame, hand-over tray, operation panel, header sign, standing mark) |
| Back-of-house | room behind the counter (staff door from the lobby, ceiling light), roller runs with two ball-transfer corners, and the kit prop `upper_cabinet` from `city-kit-2127` |
| Canopy | over the forecourt on two posts, open round the chute, with underside lights, a teal fascia and the residents' entrance sign hung under it |
| Fixes | the hall paving ends at the storefront; the storefront mullion feet sit 5 mm up (fewer coplanar faces than v3) |

**Unchanged.** The rng consumption is kept: `burn_v3_roof_draws`, and the counter parcel is still the first port draw. So the six drums are byte-identical to v3 (vertex hash).

**New scripts and checks.**
- `render_flow.py` draws arrows, numbered badges and a legend from `q07b-flow.json` over four views. The arrow layer is laid over the model, so the back-of-house leg stays visible.
- `staging.py` has the cameras `rooftop`, `liftside` and `entrance`. `liftside` was raised once after R1 so the roof hand-over shows; every set was re-rendered with it.
- **`route_check`** (in the build) moves one 0.34 × 0.26 × 0.28 m parcel, shrunk 4 mm, through every stage, checks the arm reach, and rides the empty car through the shaft.
  - It has a self-test: known collisions must be detected.
  - It also measures each hand-over level on the geometry.
- `CANOPY_CLEARANCE` checks the canopy against the shell.
- `check_glb.py`: the drums' inner-clearance window now stops at the deck (12.3 m). The unload table sits above every drum and was a false hit.

**Dream Loop.** Angles: roof from above, lift side, ground entrance, plus the whole tower.
- **R1:** the roof route reads well. Problems found:
  - The lift foot's dark street door read as the main entrance.
  - The residents' door had no sign.
  - The lift-side camera could not see the roof hand-over.
- **R2:**
  - A light service hatch replaces the dark door.
  - The residents' door got lit jambs and a hung sign.
  - The camera was raised.
- **Final:** QA fixes only. The rollers run into the rails; the conveyor bodies sit under their pans; the room walls stand on the paving; the corner marks no longer overlap; the canopy caps are wound correctly; the stop laps the rails.

Renders are in `~/city2127-evidence/q07b-flow/`:
- Folders: `{before,r1,r2,final}/`.
- `rounds-{rooftop,liftside,entrance,oblique}.jpg`.
- `flow-final/*_flow.png` and `flow-preview.jpg` (arrow sheet).

**Files.**
- The asset path holds v4.
- The previous version is `.dream-loop/q07b/v3-arm/`.
- v4 is copied to `.dream-loop/q07b/v4-flow/q07b-pickup-tower-v4-flow.{blend,glb}` (GLB SHA256 `645A5CA2…996278DC`).
- The R1 GLB is in `.dream-loop/q07b/v4-r1/`.

**Validation, uncommitted worktree on `cc2b561b`.**
- **Build checks:**
  - `ARM_CLEARANCE` 0 and `CANOPY_CLEARANCE` 0.
  - `ROUTE`: unload bay, arm lift, swing, set-down, rollers into the car, lift down, out to the back-of-house, across, onto the tray: 0 hits in every stage (297 positions).
  - Arm reach 1.469–1.851 m of 1.933.
  - The empty car rides 1.31–13.21 m with 0 hits.
  - Measured levels: roof rollers, roof sill and car floor 12.950; car floor, ground sill, back-of-house rollers and counter tray 1.050.
  - Car fit: the parcel fits a 0.49 × 0.49 m car with 0.52 m clear height.
- **`check_glb.py`:** PASS.
  - 91,496 tris (v3 87,552), 22 materials, 9 meshes, GLB 4,530,228 bytes.
  - Bounds 13.80 × 14.21 × 14.28 m.
- **Node comparison with v3:** the six drums are identical. The shell (49,108 → 51,428), the port (2,436 → 4,060) and the carriage (parcel and size) differ.
- **`qa_check.py`** on shell, port and carriage:
  - z-fighting: the port has 9 pairs (v3: 22), the door leaves from v2. Shell↔port has 5 pairs, the hall side walls against the lobby glass band, as in v3.
  - No floating parts. The v3 roof parcel and the kiosk part are gone.
- **`assetLibrary.test.ts`:** PASS.
- **Root tests,** each of the 46 run separately: 44 PASS.
  - `surveyMeterPipeline` and `energyPipeline` fail on the known Windows path issue in `survey/tests/surveyFixture.ts`.
- **`npm run build`:** PASS.
- **`git diff --check`:** PASS.

**v4 gaps and limits.**
- **Budget:** 91,496 tris is over the self-set ≤ 90k.
- **Street-view legibility:** from the street the counter is less prominent than v3's lit kiosk. It sits to the right of the lift and a staging figure stands in front of it. The lift foot reads as a plain white box.
- **Static model:** the arms, the car and the parcels show one frozen moment. There is no animation.
- **Plan cut:** the plan cut shows no wall fill, because EEVEE does not cap the cut.

## Next expected step

The owner reviews v4:
- `flow-preview.jpg`
- the `rounds-*.jpg` sheets
- the `v3-arm` / `v4-flow` copies

After acceptance: push `feat/q07b-pickup-tower` (v3 and v4 are local commits only). Then, as a separate task, choose a lot and integrate it (`addCityModel`, budget, `?asset-preview`, browser checks).
