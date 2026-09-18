# Blender asset standards — collaboration Stage 3

These are handoff standards for future assets, not an implemented import pipeline. At the Stage 3 baseline (`f196b2e`), the repository has no tracked `.blend`/`.glb` files; `main.ts` constructs `cityRig` procedurally and has no model loader. Follow [Git coordination](CONTRIBUTING.md) and the [project contract](PROJECT.md). Preserve the exhibition direction: futuristic Shibuya and readable guest-driven changes, not documentary realism as a gate.

## Ownership and files

Assign one named owner per asset task. Coordinate edits to the same binary before starting. Commit editable `.blend` source and corresponding production `.glb` together; use Git history instead of `final-final` filenames. Do not add LFS, export automation or decoder dependencies incidentally.

For new assets, use `asset/models/<asset-id>/<asset-id>.blend` and `<asset-id>.glb` in the same directory, with lowercase kebab-case IDs. Create directories only when a real asset exists. Keep existing references such as `asset/pic2.png` in place. This source/export location does not automatically make a model available to Vite: the first integration task must explicitly choose its runtime URL/import and test the production build.

Pack needed textures into the source or commit them under that asset directory with relative paths. Linked libraries must also be available from the clone, or made local for the deliverable. Exclude temporary backups and unused working exports from commits without deleting another contributor's files. Record provenance/licence for third-party material, if any; this stage does not authorize an external asset pack.

## Scene contract

- Author at a documented scale: default one Blender unit to one scene art unit. Existing scene units are meter-like, not a surveyed Shibuya reconstruction. Record expected exported X/Y/Z bounds and compare them with the target footprint in `src/layout.ts` before integration.
- For static buildings, put the local origin at the ground-contact centre. For moving objects, agree on the functional pivot and forward direction with the consumer. Record orientation explicitly; do not compensate for an unexplained rotation or scale in application code.
- Use Blender's normal Z-up workspace and glTF's +Y-up export conversion. Check an asymmetric feature on reimport to detect flipped facing; do not rotate the model again merely to repeat the exporter conversion.
- Keep a clearly named export root and stable child names for any nodes the app will address. Apply rotation/scale on a static export copy where needed, keeping editable source. Do not blindly apply transforms to rigs or shape keys. Animated assets require an explicit clip/pivot contract in their task.
- Preserve necessary openings and clearance at crossings, lifts and the cargo dock. Exported geometry does not automatically update layout-derived collision envelopes or routes.

## Export recipe

Record Blender version, exporter version if separate, export root/selection and settings in the task handoff. Use the built-in glTF 2.0 exporter, Binary `.glb`, +Y up, exporting only the intended asset hierarchy. Include normals, UVs and materials as needed. For static assets, disable animation, cameras and lights; do not export staging objects. Evaluate modifiers on the export copy and inspect the resulting mesh; retain editable modifiers in the source where useful.

Start with Principled BSDF metallic/roughness materials and embedded PNG/JPEG textures. Bake unsupported procedural material effects to textures when required; a Blender render alone does not establish export fidelity. Blender documents glTF material mappings, axis conversion and export settings in its [glTF manual](https://docs.blender.org/manual/id/5.0/addons/import_export/scene_gltf2.html). UI labels vary by version; the recorded settings and reimported result are the contract.

Default to opaque surfaces; use transparency or double-sided materials only where the asset requires them. Avoid baking scene illumination into base colour when the application will light it again. Verify emissive strength and material appearance under the application's daylight, tone mapping and environment rather than trying to match a separate studio render.

Leave Draco, Meshopt and KTX2 compression off until an integration task supplies and verifies the corresponding decoder. Three.js requires explicit decoder/loader setup for these formats; see [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). The installed Three.js version and actual consumer, not the newest online examples, determine supported extensions.

## Optimize what is visible

Remove duplicate/unused geometry and material slots from the export; reduce subdivisions and bevel segments that do not improve the intended desktop view. Share materials and repeated geometry where practical. Preserve independently animated or state-controlled parts instead of joining everything. Do not remove surfaces merely because the hero camera hides them: the current app allows orbiting.

Use the smallest texture resolution that survives the intended view. Record exported triangle count, mesh/material count, texture dimensions and GLB byte size before and after optimization. Mesh count is not a measured draw-call count. No universal polygon, texture or file-size budget has been measured yet; agree on per-asset limits with the integration owner, then compare actual scene loading/rendering against the baseline. Keep the existing 1080p performance measurement procedure in [VALIDATION.md](VALIDATION.md); never infer FPS from file size.

## Validate and hand off

1. Open the committed source from a fresh clone or isolated copy without access to the author's private texture/library paths. Confirm all dependencies resolve and the recorded export steps reproduce a usable GLB; byte-identical output is not required.
2. Import the GLB into an empty Blender scene. Check bounds, origin, facing, normals, materials, texture presence and any agreed animation clips. Inspect silhouette, openings and joins. Record actual results and a screenshot; do not mark an unperformed check as passed.
3. If a runtime consumer exists, load the replacement in that application and follow relevant desktop/state/motion checks in [VALIDATION.md](VALIDATION.md). Check console/network errors, actual materials, footprint/route clearance and the production build. Run `npm test` and `npm run build` for code integration. A Blender reimport cannot prove Three.js compatibility.
4. If there is no consumer yet, explicitly record `Application verification: NOT INTEGRATED`. A source/export pair may be handed off, but cannot be called application-ready. First loader integration and any coupled model replacement belong on a feature branch. Do not replace a used asset on main until its consumers pass.
5. In the existing [task handoff](handoffs/TEMPLATE.md), record source/export paths and commit, owner, versions/settings, units/bounds/pivot/facing, runtime consumer or NONE, dependencies/provenance, exported metrics, actual checks/evidence, limitations and next step. No separate asset registry is required.

This stage provides the manual standard only. No model has been authored, exported, optimized or visually verified by creating this document.
