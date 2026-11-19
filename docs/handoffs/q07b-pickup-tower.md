# q07b-pickup-tower — Q07-B 回る本棚のような受け取り塔 (Blender model, Dream Loop)

- Owner: repository owner (requester of this task)
- Status: IN_PROGRESS — local asset ready for owner review; not placed, not committed, not pushed
- Branch: `feat/q07b-pickup-tower` (created locally from `main`)
- Base commit: `df59a7defc14552fadd3f91920498c58707fe532`
- Last verified commit: NONE — checks ran on the uncommitted worktree on top of the base commit
- Remote availability: NOT PUSHED (owner asked to review the local asset before any city integration or push)

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

## Next expected step

The owner reviews the local asset (renders, `.blend`, `.glb`). After acceptance: commit and push `feat/q07b-pickup-tower`; then, as a separate task, choose a lot and integrate (`addCityModel`, budget, `?asset-preview`, browser checks).
