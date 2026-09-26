# automation-hub-upper — Stage 3 GLB site layer

- Owner: Codex
- Status: IMPLEMENTED — Blender, application and fallback paths verified locally
- Branch: `codex/automation-hub-upper-glb`
- Base branch/commit: `codex/shibuya-site-assets` at `66d93debc4e4a1303a60c32705df6e3cbdcd1b9e`
- Implementation commit: `7ba868f749fe4a824f53ab7c723d4a78678b1025`
- Remote availability: NOT PUSHED
- GitHub Issue: none

## Asset contract

- Editable source: `asset/models/automation-hub-upper/automation-hub-upper.blend`
- Production export: `asset/models/automation-hub-upper/automation-hub-upper.glb`
- Consumer: root Shibuya `magnetEast` / `hubUpper`, activated only by `automation-tall`
- Blender: 5.2.2 LTS, built-in glTF 2.0 exporter, Binary GLB, selected hierarchy, standard +Y-up conversion, no compression, animation, camera, light or external texture
- Units/origin/facing: 1 Blender unit = 1 art unit; ground-contact centre origin; root identity; Blender local `-Y` front, recorded by `front_marker`
- Root: `ROOT_AUTOMATION_HUB_UPPER`
- Required extras: `asset_id`, `category`, `compatible_site`, `compatible_layer`, `footprint_x`, `footprint_y`, `height`, `forward_axis`
- Blender XYZ bounds: `(-2.9, -2.9, 0)` to `(2.9, 2.9, 20.3)`
- Export metrics: 12 meshes, 4 materials, 1,796 triangles, 75,428 bytes
- Material roles: `city_glass`, `city_trim`, `city_future_light`, `city_solar`; Three.js remaps these to the shared art-directed runtime materials
- Dependencies/provenance: authored procedurally for this repository from the existing AUTO HUB upper-layer dimensions; no third-party model, texture or linked library

## Runtime integration

`changeCatalog.ts` declares `hubUpper` as the `automation-hub-upper` GLB layer. The shared loader validates the stable root, identity transform, static contents, footprint/height, metadata, front marker and complete material-role set before cloning. The medium hub remains procedural and does not request this asset. First activation of the tall layer lazily loads and batches the GLB. Replacement is atomic: the validated/remapped GLB is attached before the matching procedural upper is removed. A fetch or contract failure records `fallback` diagnostics and leaves that procedural upper visible.

The survey server, questions, score thresholds and `CityView` schema are unchanged. Snapshot restore, incremental changed-only transitions, reset and the existing 3 s rise/sink animation still run through `CityChangeManager`.

## Validation performed

- Source scene inspected in Blender and saved at the path above.
- GLB reimported and inspected: root identity, front marker and all extras present; exact recorded bounds; 12 meshes, 4 expected materials, 1,796 triangles; no camera, light or animation.
- Node `24.21.0`: root `npm test` PASS (12 PASS lines); `npm run build` PASS with the existing chunk warning. Production output includes the 75.43 kB GLB.
- Unit coverage includes catalogue selection, lazy preparation once, metadata/front-marker/material-role rejection, runtime material remapping, cache/retry/compatibility and fallback diagnostics.
- Headless Google Chrome, 1280×720, DPR 1, held noon, scratch survey database: baseline and `automation-medium` made zero asset requests; `automation-tall` made one and reported `ready`; reload restored tall and requested once in the new page; reset restored all variants to baseline. No console exception or non-favicon HTTP error.
- The all-sites frame was visually inspected for placement, scale and materials. It reported 521 draw calls / 133 geometries, matching the Stage 2 all-sites frame.
- An intercepted failed GLB request reported `hubUpper = fallback` while retaining the procedural tall hub at 521 draw calls / 133 geometries.

## Not performed / known limits

- Real-GPU FPS and exhibition-PC performance were not measured.
- The asset is symmetric around its vertical axis; `front_marker` validates the facing contract but the current silhouette does not make facing visually obvious.
- Loaded geometry stays cached after reset, as intended; reset hides the layer but does not reclaim its GPU geometry.
- No generic socket-placement system or additional GLB site variants were added.

## Next expected step

Review the three stacked branches independently, then push them if the team wants remote review: Stage 1 `codex/shibuya-change-manager`, Stage 1+2 `codex/shibuya-site-assets`, and Stage 1+2+3 `codex/automation-hub-upper-glb`.
