# odaiba-assets - Odaiba Plan building asset stage

- Owner: cc100053
- Status: IN_PROGRESS
- Branch: feat/odaiba-assets
- Base commit: 9ca007c2bbe8423eb52317724133d66b6006f695
- Last verified commit: b420e2b91003de3bf3f026aba45b2e2836880a34
- Remote availability: `origin/feat/odaiba-assets` is pushed and synchronized. The full asset review baseline is `b420e2b91003de3bf3f026aba45b2e2836880a34`; resolve the current branch head from the Git ref.
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `main` at `9ca007c2bbe8423eb52317724133d66b6006f695`; the clean checkout was then switched to the newly created `feat/odaiba-assets` branch.
- Last fetched origin/main commit: `9ca007c2bbe8423eb52317724133d66b6006f695`, fetched 2026-09-19.
- Local changes present at session start: NONE.
- Upstream integration status: NOT INTEGRATED; local `main` and `origin/main` matched at the latest review. This asset branch has completed the required checks and awaits owner-authorized integration.
- Pending Git conflicts or synchronization blockers: NONE.

## Goal and acceptance criteria

Prepare five completed Odaiba building source/export pairs for the building-asset stage of the Odaiba Plan. The Odaiba Plan is a venue proposal parallel to Shibuya Plan 02: it carries forward the same curatorial goals, interaction logic, future-city design method and technical principles, but uses Odaiba as its setting. These five landmarks belong exclusively to the Odaiba Plan and must not be mixed into the Shibuya venue; likewise, Shibuya landmarks must not be placed in Odaiba. This branch does not modify the existing Shibuya runtime. Acceptance requires both `.blend` and `.glb` files for every building, two Building Inspector screenshots, documented metrics and limitations, standard axis/facing notes, and a clean Git review limited to the intended files.

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
- `.gitignore`
- This handoff.

The pairs were copied from the verified `C:\FutureCity` outputs. Source files were not moved, deleted, regenerated, or edited. Runtime integration files under `src/` are explicitly out of scope.

## Completed work

- Copied and consistently renamed five editable Blender sources and their production GLB exports.
- Copied the five-building perspective and true orthographic top-view evidence.
- Used Blender 5.2 verification results from the source work.
- Recorded the common contract: Blender Z-up, standard glTF Y-up, Blender front `-Y`, Three.js front `+Z`, and a 20 m review grid. Standard glTF conversion is already baked; consumers must not rotate these Y-up exports a second time.
- Building Inspector loaded all 5 of 5 assets successfully with no overlap. The measured review scene reported 206 render calls and 234,791 rendered triangles.
- Added targeted ignore rules for Blender autosaves, backups, reference collections, browser profiles, and dependency folders without ignoring unrelated content under `asset/`.

### Asset inventory and known metrics

| Asset | Dimensions W x D x H (m) | Grid | Triangles | Materials | Meshes / primitives | Known limitations |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| Fuji TV | 162.00 x 81.43 x 123.45 | 9 x 5 | 127,928 | 7 | 8 / 8 | No separate inspection report accompanied this pair; metrics are from the verified Building Inspector load. Treat architectural detail and documentary accuracy as an asset-study approximation pending teammate review. |
| Grand Nikko Tokyo Daiba | 157.00 x 78.09 x 120.50 | 8 x 4 | 39,857 | 7 | 49 / 49 | Building-only export excludes the ambiguous exterior access decks/vehicle-platform bands. Entrance canopies, west hall and rotunda are photo-led simplifications rather than survey geometry. The source report describes its historical export as Z-up; the reviewed Three.js inspector applies the existing one-time legacy adapter, so integration must coordinate this asset's axis handling rather than adding arbitrary per-mesh rotations. |
| Hilton Tokyo Odaiba | 176.50 x 135.50 x 83.35 | 9 x 7 | 38,630 | 8 | 50 / 50 | Rear spine bearings and lengths, bay heights, glass chapel geometry, canopy and stair placement are photographic estimates. Roads, terrain, station bridges and neighbouring buildings are excluded. |
| Aqua City Odaiba | 226.19 x 110.49 x 44.16 | 12 x 6 | 13,080 | 8 | 30 / 30 | Dimensions, roof cores, facade slots and recess depths are photographic estimates. The concealed internal ramp is omitted; glazing has no interiors; tenant advertising and unconfirmed surrounding structures are excluded. |
| DECKS Tokyo Beach | 147.05 x 104.19 x 45.27 | 8 x 6 | 15,156 | 8 | 41 / 41 | Floor plans are diagrams rather than surveys. Center Deck bridge/stair positions and seaside massing are conservative approximations; detailed terrace treatment is limited to the supported 3F area. Unlocated sail canopies and night-sign facade, interiors and surrounding infrastructure are excluded. |

## Actual validation results

- Verification status: PASSED for asset handoff preparation; runtime integration remains NOT INTEGRATED.
- Date and checked commit/worktree: 2026-09-19; commit `e680f9da7aa63eb9bb3721dd9fd887d4cb07697e` on `feat/odaiba-assets`.
- Commands/manual checks and results: source paths and copied destinations checked; all requested files present; source/export pairs had previously been reopened/export-validated with Blender 5.2 where reports were available; Building Inspector loaded 5/5 assets; perspective and true orthographic top views were checked for overlap, scale, orientation and footprint frames.
- Evidence/environment: `docs/handoffs/odaiba-assets-angle.png` and `docs/handoffs/odaiba-assets-top.png`; Building Inspector result was 206 render calls and 234,791 rendered triangles on the review machine.
- Integrated commit and checks: NOT INTEGRATED. The application in `city2127` does not load these models yet.
- Changes since verification: handoff wording and `.gitignore` scope cleanup only; no model, screenshot or application code was regenerated or modified.

## Known issues and blockers

- Runtime integration status: NOT INTEGRATED.
- The current work is the building-asset stage of the Odaiba Plan, a venue proposal parallel to Shibuya Plan 02. It does not change or replace the existing Shibuya runtime.
- Odaiba and Shibuya are separate venue plans. Their landmark buildings must not be mixed across settings.
- The Grand Nikko source report records a legacy Z-up GLB workflow, unlike the newer standard Y-up pairs. The inspector's existing one-time adapter was used for review; a future application integration owner must confirm and document the consumer-side contract.
- No runtime URL/import, layout placement, collision envelope, route integration, material tuning, loading budget or production-build validation has been implemented in `city2127`.

## Important decisions

- Preserve each editable `.blend` beside its matching `.glb`; do not install Git LFS or add decoder/compression dependencies in this task.
- The shared review convention is a 20 m grid and front `+Z` in Three.js. Standard Y-up exports must not receive a second Blender-to-glTF rotation.
- Inspector draw calls are measured review-scene totals, not the sum of mesh counts and not a production application budget.
- These five landmark pairs are Odaiba-only assets. Existing application behavior and all Shibuya assets remain unchanged, and this branch must not place either venue's landmarks into the other venue.

## Next expected step

The owner integrates this reviewed asset-only branch into `main` using the repository workflow, records the integration checks, and only then changes this handoff to `DONE`. Odaiba runtime integration must proceed on a separate, independently scoped branch that defines loader URLs, Odaiba placement, axis handling (especially Grand Nikko), performance acceptance and venue-specific validation before modifying application code. It must not modify the Shibuya scene by inserting these landmarks.
