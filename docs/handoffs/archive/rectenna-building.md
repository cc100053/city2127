# rectenna-building — Rectenna canopy farm as a building-only asset

- Owner: cc100053
- Status: DONE (source/export pair); application NOT INTEGRATED
- Branch: feat/rectenna-building-glb → main (asset-only)
- Base commit: b92296e0553cd27b535e329416a876c756c2206b
- Last verified commit: the commit that adds this file (asset files checked before commit)
- Remote availability: origin/main after merge (R1 `089c601`; R2 vegetable LOD on `feat/rectenna-veg-lod`)

## Session Git state

- Session starting branch and HEAD: `docs/q06-prompts` @ d0fb27632b066e63d2c0c76b6808e6d8868e2077 (1 ahead, 73 behind origin/main)
- Last fetched origin/main commit: b92296e0553cd27b535e329416a876c756c2206b (2026-11-13)
- Local changes present at session start: uncommitted planning-team prompt edits and resident-bedroom files on `docs/q06-prompts`; left untouched. Work was done in a separate worktree `../city2127-rectenna` from origin/main.
- Upstream integration status: built on origin/main b92296e
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

The owner asked to take the dream-loop draft `.dream-loop/rectenna.blend` (gitignored, unchanged) and keep only the building: no ground, sea, skyline, bridge, park, paths or people. Metal parts (canopy and others) get more gloss and a MacBook Pro "Space Gray" colour. The microwave-receiving membrane gets a slight soap-bubble iridescence. Export `asset/models/<id>/` source + GLB.

## In-scope files and dependencies

- `asset/models/rectenna-farm-canopy/rectenna-farm-canopy.blend` (source, compressed; contains Text `export_glb.py`)
- `asset/models/rectenna-farm-canopy/rectenna-farm-canopy.glb` (export)
- `asset/models/LIBRARY.md` (Folders row)
- No runtime consumer. `src/` is unchanged.

## Completed work

- Kept collections: `RECTENNA_Canopy`, `RECTENNA_Structure`, `FARM_Terraces`, `FARM_OrangeTrees`. Also kept, excluded from the view layer and not exported: `_LIB_Instances/_LIB_OrangeTrees` (mesh sources of the orange-tree instances) and `_LIB_Veg` (the `VegScatter`/`VegScatterOuter` Geometry Nodes collection), plus `ENV_Lighting_Camera` and World for preview.
- Deleted 728 objects: `ENV_Ground_Water`, `ENV_Wetland`, `CITY_Skyline`, `CITY_Bridge`, `PARK_Paths_Plaza`, `PARK_Trees`, `PARK_Shrubs_Flowers`, `PARK_People_Props`, `_LIB_People/_Props/_ParkTrees/_Shrubs/_Reeds`; orphans purged.
- `SilverFrame` (all structural metal: canopy ring/columns/supports/hub, tower lattice, handrails, ramp rails/treads, pilotis): base linear (0.17, 0.167, 0.163), metallic 1.0, roughness 0.30, coat 0.35 / coat roughness 0.08 (was 0.86 silver, metallic 0.9, roughness 0.2). `ChromeSphere` is unchanged as the accent.
- `HexPanelGlass` membrane: transmission 1.0, IOR 1.45, roughness 0.05, base (0.92, 0.95, 0.97), Thin Film 450 nm / IOR 2.0, plus a `glTF Material Output` node with Iridescence Factor 1 (the exporter needs it to write `KHR_materials_iridescence`). The source keeps its procedural noise/Fresnel alpha.
- Export recipe (Text `export_glb.py` in the .blend): select the four kept collections, glTF Binary, +Y up, apply modifiers, `export_gn_mesh` + `export_gpu_instances` (vegetables → `EXT_mesh_gpu_instancing`), no animation/camera/light/Draco. Two procedural graphs are flattened for the export only and then restored: the membrane Alpha is set to 1 (transmission carries see-through; three.js scales a blended material's reflections by opacity, which hid the iridescence), and the `CitrusLeaf` ColorRamp+Translucent mix becomes a flat Principled base (0.10, 0.245, 0.045). Otherwise the leaves exported white.

## R2 — vegetable LOD (2026-11-13, owner chose A+B)

- A: the four `Veg_*` meshes (100–140 tris each) were replaced with flat-shaded, jittered low-poly hemispheres (21–24 tris) at the original sizes and materials. A Decimate collapse at about 26 tris was tried first and rejected: it produced spiky stars (`iterations/decimate-*.png`).
- B: `VegScatter` density 20 → 10 /m² and `VegScatterOuter` 18 → 9 /m²; the instance scale range 1.2–1.7 → 1.4–1.9 keeps the soil covered.
- Result (GLB JSON): vegetable instances 20,657 → 10,824; rendered triangles 2,911,892 → **557,105** (−81%), of which vegetables ≈ 0.24 M; GLB 5,275,108 → 4,839,868 bytes. The headless reimport keeps the same bounds and ramp centre (facing unchanged).
- Evidence: `~/city2127-evidence/rectenna-veg-lod/` (`before-*`, `after-*` with near terrace and hero views in the scratch three.js 0.180 viewer, `reimport.png`, `iterations/`). FPS has not been measured.

## Actual validation results (R1)

- Verification status: PASSED for source/export; application NOT RUN (no consumer)
- Date and checked worktree: 2026-11-13, worktree `city2127-rectenna` before commit, Blender 5.2.2 LTS, built-in glTF exporter
- GLB JSON: 5,275,108 bytes; 83 nodes, 30 meshes, 13 materials, 0 textures; extensions `KHR_materials_clearcoat`, `KHR_materials_transmission`, `KHR_materials_ior`, `KHR_materials_iridescence`, `EXT_mesh_gpu_instancing` (none required). Unique triangles 314,612; rendered triangles 2,911,892 (vegetable instances: 8 nodes, 20,657 instances ≈ 2.6 M).
- Headless Blender reimport (factory startup, empty scene): bounds X −32.24…32.24, Y −32.38…32.38, Z −0.23…33.60 m (Blender Z-up) = source. Origin is the ground-contact centre at world 0; pilotis feet go 0.23 m below 0. The ramp centre (3.49, −3.94) matches the source, so facing is not flipped. Materials match the values above.
- three.js 0.180 GLTFLoader (scratch page, RoomEnvironment, ACES, headless Chrome/SwiftShader): loads, 8 InstancedMesh, membrane `iridescence=1`; screenshots show Space Grey metal, green leaves and a faint pink/lilac/cyan membrane sheen. This is not the app's renderer or lighting.
- Evidence: `~/city2127-evidence/rectenna-building/` (00 before, 01 after camera, 02–03 metal in Blender, 04 GLB reimport, 05-three-{hero,close,low}, `iterations/` membrane and Space Grey variant grids). Not published.
- `node --experimental-strip-types tests/assetLibrary.test.ts`: PASS (23 props, 7 modules, 20 folders). `git diff --cached --check`: clean. Full `npm test`/`build` were not run locally (asset + docs only, no code change); main CI is the integrated check.
- Application verification: NOT INTEGRATED

## Known issues and blockers

- R1 rendered ~2.9 M triangles; R2 reduced this to 0.56 M (see above). FPS has not been measured.
- In three.js, transmission adds a transmission render pass while the membrane is visible; the cost was not measured.
- The membrane's procedural alpha variation and the leaf colour variation exist only in Blender; the GLB uses flat values.
- In Blender's own sky World the metal reflects blue sky and reads as steel-blue; the final colour must be judged in the app.

## Important decisions

- Owner 2026-11-13: "building" = canopy + tower + terrace farm including orange trees and vegetables; metal colour = MacBook Pro Space Gray with more gloss; membrane = 少し虹色 (slight iridescence); export to `asset/models/<id>/`.
- The Space Grey value was chosen from four three.js variants (0.25/0.26 read as silver; 0.17/0.40 too matte).

## Next expected step

Owner visual acceptance of the R2 vegetable screenshots. If placement is wanted: choose the site and footprint, then load via `addCityModel` on a feature branch and run VALIDATION browser/FPS checks.
