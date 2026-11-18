# bay-flower-receiver — Q02-B bay flower space-solar receiver (draft model)

- Owner: repository owner (requester); implementation by Claude
- Status: IN_PROGRESS (shape delivered for owner review; not placed)
- Branch: `feat/bay-flower-receiver`
- Base commit: `f40ffbc0e3e9b5a73da8f4a86fa75ff1190f2f09`
- Last verified commit: the commit that adds this file (asset, scripts and checks below ran on its tree before commit)
- Remote availability: `origin/feat/bay-flower-receiver`

## Session Git state

- Session starting branch and HEAD: `feat/ship-refs-2127` `e0f282caaf099c40994d10f93b7d65b458a9e7b1`, clean, level with its remote, 5 ahead / 14 behind `origin/main`.
- Last fetched origin/main commit: `f40ffbc` (2026-11-18).
- Local changes present at session start: NONE.
- Upstream integration status: NOT INTEGRATED (branch starts at `origin/main`).
- Pending Git conflicts or synchronization blockers: NONE.

## Goal and acceptance criteria

Model Q02-B 「宇宙からの光の柱を受ける、湾の花」 from page 3 (middle image) of the owner's PDF `2127_施設画像27枚_想像力優先版_一覧.pdf`: a space-solar receiving facility in Odaiba bay. Deliver an editable `.blend`, a Three.js-ready `.glb`, the light beam as a separately removable node, previews with and without the beam, and a reference/model comparison from the reference camera. The owner judges the shape before any scene placement.

## In-scope files and dependencies

- `asset/models/bay-flower-receiver/`: `build_flower.py` (builder; uses `../geo_helpers.py`), `review_flower.py` (previews), `bay-flower-receiver.blend`, `bay-flower-receiver.glb`, `references/q02-b.jpg` (page 3 image extracted byte-for-byte from the PDF's embedded JPEG), `compare.jpg`.
- `asset/models/LIBRARY.md`: folder row.
- Excluded: scene placement, `src/` integration, change-review sheet.

## Completed work

- Reuse check: no bay platform or receiver model in the repo fits (`rectenna-farm-canopy` is a farm canopy, site-only); geometry reuses `geo_helpers` primitives.
- Model (three.js coords, metres, waterline y 0, origin at the flower centre): 46 petals in rings of 18/16/12 (hinge radius 23.3/19.5/15.8 m), silver panel inner face, white shell and edges, white rims and seams, hinge pedestals and struts with two ring beams; 52.5 m pontoon drum with dark window band and 48 cyan lights; pearl dome (R 12 m, top ≈ 34 m) with receiver aperture; glass sub-sea stem with three glowing rings, a sea-bed duct (y −13.5) to the shore station at (−95, 56); 18 × 10 m arched glass pavilion with terminal. Bounds without the beam (Blender X/Y/Z): −105.2…61.3 / −67.7…60.3 / −15.9…41.8.
- Nodes: `Q02B_Root` > `Q02B_Receiver`, `Q02B_SubseaLink`, `Q02B_ShoreStation`, `Q02B_LightBeam` (core + soft glow + flare, to 900 m).
- Metrics: 51,878 tris (beam 816; frame strips 28,788), 19 meshes, 14 materials, no textures, GLB 1,639,260 bytes. Export: Blender 5.2 glTF, GLB, +Y up, no animation/camera/light, no compression.
- Inferred (not readable in the image): petal count per ring, strut layout, pontoon below water, sub-sea depth, pavilion interior terminal, beam height, the overall scale (from people by the pavilion).

## Actual validation results

- Verification status: PARTIAL
- Date and checked worktree: 2026-11-18, branch tree before commit.
- Blender: build ran without errors; GLB re-imported into an empty scene: 51,878 tris, 19 meshes, the four group nodes present, `Q02B_LightBeam` has its two meshes. `blender-asset-qa` `qa_check`: no loose verts after compaction; remaining items are deliberate or minor: no UV maps (no textures), frame pipes intersecting each other, collar/pavilion purlin overlaps, the window band and glow rings standing 6–15 cm proud, lowest point −15.9 m (sub-sea duct).
- Previews: `~/city2127-evidence/bay-flower-receiver/final/` `beam.png`, `nobeam.png`, `clay.png`, `compare.jpg` (EEVEE, 64 samples, reference camera fitted by eye over 11 rounds in `r0`…`r11`).
- `npm run build`: passed. `git diff --cached --check`: clean.
- `npm test` (Windows 11, Node 24.19, checkout under `OneDrive\文件`): `assetLibrary.test.ts` passes with the new row. Two local leftovers, `asset/models/ship-refs-2127` and `car-candidates-2127`, hold only git-ignored caches from other branches and fail that test unless parked; they were parked for the run and restored. `surveyMeterPipeline.test.ts` and `energyPipeline.test.ts` FAIL on this machine before any of this task's code runs: `survey/tests/surveyFixture.ts` turns a `file://` URL path into `C:\C:\…\%E6%96%87%E4%BB%B6\…` (percent-encoded non-ASCII folder name), so the question JSON is not found. Not caused by this task, not fixed here. Every other test in the `npm test` list passed when run one at a time.
- Application verification: NOT INTEGRATED.

## Known issues and blockers

- The reference shows denser, more silvery petals with visible panel tessellation; the model reads smoother. The staging sea and sky are flat placeholders.
- Transparent materials (sub-sea glass, pavilion glass, beam glow) export as alpha blend; check sorting in Three.js before placement.

## Important decisions

- Origin at the flower centre so the receiver can be placed alone; pavilion and duct are separate nodes so they can follow the real shoreline.

## Next expected step

Owner reviews `compare.jpg`, `beam.png` and `nobeam.png`; then either another shape round or a placement task (site, shoreline, beam behaviour in the app).
