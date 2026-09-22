# odaiba-assets - Odaiba Plan building asset stage

- Owner: cc100053
- Status: IN_PROGRESS
- Branch: feat/odaiba-assets-progress-02
- Base commit: 9ca007c2bbe8423eb52317724133d66b6006f695
- Last verified commit: `27254776341914e7ce929820e4da17c3a25417d9`
- Remote availability: `origin/feat/odaiba-assets-progress-02`; resolve the latest pushed SHA from the Git ref. The branch starts from local `feat/odaiba-assets` commit `033631c8bf1881b18f164f684e320982a898af69`, preserving its three commits above `origin/main`.
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: clean local `feat/odaiba-assets` at `033631c8bf1881b18f164f684e320982a898af69`; `feat/odaiba-assets-progress-02` was created directly from that HEAD.
- Last fetched origin/main commit: `9ca007c2bbe8423eb52317724133d66b6006f695`, fetched 2026-09-23.
- Local changes present at session start: NONE.
- Upstream integration status: NOT INTEGRATED; local `main` and `origin/main` match, while this progress branch is three inherited commits plus the current asset progress ahead of `origin/main`. It is for team-lead review and is not declared ready to merge.
- Pending Git conflicts or synchronization blockers: NONE.

## Goal and acceptance criteria

Prepare the current Odaiba building source/export pairs for team-lead progress review. The branch retains the five previously reviewed buildings and adds DiverCity Tokyo Plaza, DiverCity Tokyo Office Tower and Telecom Center. These landmarks belong exclusively to the Odaiba Plan and must not be mixed into the Shibuya venue; likewise, Shibuya landmarks must not be placed in Odaiba. This branch does not modify the existing Shibuya runtime. The three new pairs require matching `.blend` and `.glb` files, while Telecom Center also carries top and oblique source-render previews as progress evidence. The formal Building Inspector now validates all eight buildings; this handoff remains `IN_PROGRESS` for team-lead review and runtime integration remains out of scope.

## In-scope files and dependencies

- `asset/models/fuji-tv/fuji-tv.blend`
- `asset/models/fuji-tv/fuji-tv.glb`
- `asset/models/grand-nikko-tokyo-daiba/grand-nikko-tokyo-daiba.blend`
- `asset/models/grand-nikko-tokyo-daiba/grand-nikko-tokyo-daiba.glb`
- `asset/models/hilton-tokyo-odaiba/hilton-tokyo-odaiba.blend`
- `asset/models/hilton-tokyo-odaiba/hilton-tokyo-odaiba.glb`
- `asset/models/aqua-city-odaiba/aqua-city-odaiba.blend`
- `asset/models/aqua-city-odaiba/aqua-city-odaiba.glb`
- `asset/models/decks-tokyo-beach/decks-tokyo-beach.blend`
- `asset/models/decks-tokyo-beach/decks-tokyo-beach.glb`
- `docs/handoffs/odaiba-assets-angle.png`
- `docs/handoffs/odaiba-assets-top.png`
- `asset/models/divercity-tokyo-plaza/divercity-tokyo-plaza.blend`
- `asset/models/divercity-tokyo-plaza/divercity-tokyo-plaza.glb`
- `asset/models/divercity-office-tower/divercity-office-tower.blend`
- `asset/models/divercity-office-tower/divercity-office-tower.glb`
- `asset/models/telecom-center/telecom-center.blend`
- `asset/models/telecom-center/telecom-center.glb`
- `docs/handoffs/telecom-center-top.png`
- `docs/handoffs/telecom-center-oblique.png`
- `.gitignore`
- This handoff.

The pairs were copied from the verified `C:\FutureCity` outputs. Source files were not moved, deleted, regenerated, or edited. Runtime integration files under `src/` are explicitly out of scope.

## Completed work

- Copied and consistently renamed five editable Blender sources and their production GLB exports.
- Copied the five-building perspective and true orthographic top-view evidence.
- Used Blender 5.2 verification results from the source work.
- Recorded the common contract: Blender Z-up, standard glTF Y-up, Blender front `-Y`, Three.js front `+Z`, and a 20 m review grid. Standard glTF conversion is already baked; consumers must not rotate these Y-up exports a second time.
- Formal Building Inspector validation passed with 8 / 8 assets loaded. All eight footprint frames are mutually non-overlapping, with building-only totals of 271 draw calls and 339,919 triangles.
- Added targeted ignore rules for Blender autosaves, backups, reference collections, browser profiles, and dependency folders without ignoring unrelated content under `asset/`.
- Added the verified Blender source and GLB export pairs for DiverCity Tokyo Plaza, DiverCity Tokyo Office Tower and Telecom Center without copying backups, references, generators, reports or temporary output.
- Added Telecom Center top and oblique source-render previews as progress evidence.
- Replaced the formal oblique and true orthographic top-view Building Inspector evidence with the verified eight-building captures.
- Verified Telecom Center at 46 draw calls and 48,156 triangles, grounded at 0.0000 m with Y-up, front +Z, scale `(1, 1, 1)` and no additional rotation.

### Asset inventory and known metrics

| Asset | Dimensions W x D x H (m) | Grid | Triangles | Materials | Meshes / primitives | Known limitations |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Fuji TV | 162.00 x 81.43 x 123.45 | 9 x 5 | 127,928 | 7 | 8 / 8 | No separate inspection report accompanied this pair; metrics are from the verified Building Inspector load. Treat architectural detail and documentary accuracy as an asset-study approximation pending teammate review. |
| Grand Nikko Tokyo Daiba | 157.00 x 78.09 x 120.50 | 8 x 4 | 39,857 | 7 | 49 / 49 | Building-only export excludes the ambiguous exterior access decks/vehicle-platform bands. Entrance canopies, west hall and rotunda are photo-led simplifications rather than survey geometry. The source report describes its historical export as Z-up; the reviewed Three.js inspector applies the existing one-time legacy adapter, so integration must coordinate this asset's axis handling rather than adding arbitrary per-mesh rotations. |
| Hilton Tokyo Odaiba | 176.50 x 135.50 x 83.35 | 9 x 7 | 38,630 | 8 | 50 / 50 | Rear spine bearings and lengths, bay heights, glass chapel geometry, canopy and stair placement are photographic estimates. Roads, terrain, station bridges and neighbouring buildings are excluded. |
| Aqua City Odaiba | 226.19 x 110.49 x 44.16 | 12 x 6 | 13,080 | 8 | 30 / 30 | Dimensions, roof cores, facade slots and recess depths are photographic estimates. The concealed internal ramp is omitted; glazing has no interiors; tenant advertising and unconfirmed surrounding structures are excluded. |
| DECKS Tokyo Beach | 147.05 x 104.19 x 45.27 | 8 x 6 | 15,156 | 8 | 41 / 41 | Floor plans are diagrams rather than surveys. Center Deck bridge/stair positions and seaside massing are conservative approximations; detailed terrace treatment is limited to the supported 3F area. Unlocated sail canopies and night-sign facade, interiors and surrounding infrastructure are excluded. |
| DiverCity Tokyo Plaza | 230.50 x 135.75 x 39.70 | 12 x 7 | 35,700 | 10 | 24 / 29 | Mall and connected parking only. Dimensions, facade bays, ramp geometry and roof plant are photo-led estimates; the office tower, Gundam/Unicorn statue, public ground and surrounding infrastructure are excluded. |
| DiverCity Tokyo Office Tower | 67.86 x 42.10 x 106.09 | 4 x 3 | 21,412 | 7 | 18 / 18 | Dimensions, roof equipment, service elevation and former connection position are photographic estimates. The mall, connection volumes, public plaza and surrounding infrastructure are excluded. |
| Telecom Center | 184.34 x 83.96 x 103.00 | 10 x 5 | 48,156 | 9 | 42 / 46 | Overall dimensions and detailed setbacks are photographic/satellite estimates; the 103 m maximum includes a representative antenna above the stated 99 m building height. The station, guideway, public bridge and surrounding infrastructure are excluded. Formal Building Inspector validation passed. |

## Actual validation results

- Asset review validation: PASSED for the eight-building progress branch; runtime integration remains NOT INTEGRATED.
- Date and checked commit/worktree: 2026-09-23; `feat/odaiba-assets-progress-02` worktree based on `033631c8bf1881b18f164f684e320982a898af69` before the progress commit.
- Commands/manual checks and results: the three source paths and eight copied destinations were checked; only the requested formal pairs and Telecom previews were copied. Their source inspection reports record Blender 5.2.2 reopen, GLB reparse and triangle-match validation. The formal Building Inspector loaded 8 / 8, confirmed all footprint frames are mutually non-overlapping and measured building-only totals of 271 draw calls and 339,919 triangles. Telecom Center contributed 46 draw calls and 48,156 triangles and was verified grounded, Y-up, front +Z, scale `(1, 1, 1)` with no additional rotation.
- Evidence/environment: current formal eight-building evidence is `docs/handoffs/odaiba-assets-angle.png` and `docs/handoffs/odaiba-assets-top.png`; Telecom source-render evidence remains `docs/handoffs/telecom-center-top.png` and `docs/handoffs/telecom-center-oblique.png`.
- Integrated commit and checks: NOT INTEGRATED. The application in `city2127` does not load these models yet.
- Changes since verification: three new source/export pairs, two Telecom Center source-render previews and this handoff update; no application code was modified.

## Known issues and blockers

- Runtime integration status: NOT INTEGRATED.
- The current work is the building-asset stage of the Odaiba Plan, a venue proposal parallel to Shibuya Plan 02. It does not change or replace the existing Shibuya runtime.
- Odaiba and Shibuya are separate venue plans. Their landmark buildings must not be mixed across settings.
- The Grand Nikko source report records a legacy Z-up GLB workflow, unlike the newer standard Y-up pairs. The inspector's existing one-time adapter was used for review; a future application integration owner must confirm and document the consumer-side contract.
- No runtime URL/import, layout placement, collision envelope, route integration, material tuning, loading budget or production-build validation has been implemented in `city2127`.
- Formal eight-building asset review is complete; runtime URL/import, placement and production integration remain unimplemented.

## Important decisions

- Preserve each editable `.blend` beside its matching `.glb`; do not install Git LFS or add decoder/compression dependencies in this task.
- The shared review convention is a 20 m grid and front `+Z` in Three.js. Standard Y-up exports must not receive a second Blender-to-glTF rotation.
- Inspector draw calls are measured review-scene totals, not the sum of mesh counts and not a production application budget.
- These five landmark pairs are Odaiba-only assets. Existing application behavior and all Shibuya assets remain unchanged, and this branch must not place either venue's landmarks into the other venue.

## Next expected step

The team lead reviews `feat/odaiba-assets-progress-02`, the three added asset pairs and the passed eight-building Inspector evidence. Keep this handoff `IN_PROGRESS` until that review is complete. Odaiba runtime integration remains a separate scope and must not modify the Shibuya scene by inserting these landmarks.
