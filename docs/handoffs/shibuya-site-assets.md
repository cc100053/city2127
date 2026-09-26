# shibuya-site-assets — Hybrid site asset boundary, Stage 2

- Owner: Codex
- Status: IMPLEMENTED — verified locally, awaiting stacked review
- Branch: `codex/shibuya-site-assets`
- Base branch/commit: `codex/shibuya-change-manager` at `2781dc9514be486d503a9ea966c857fc23e17d08`
- Last verified commit: uncommitted Stage 2 worktree (commit pending)
- Remote availability: NOT PUSHED
- GitHub Issue: none

## Goal and acceptance criteria

Add a reusable, validated and non-blocking GLB layer boundary to the Stage 1 manager. Keep CityView authoritative and preserve every current transition and visual. A missing optional asset must leave a readable procedural result rather than stop the exhibition.

## Implemented work

- Added layer kind, animation and optional asset ID to the data-driven catalogue; split PARK into `parkSurface` and `parkTrees`.
- Added a root-scene asset catalogue and injected GLTF loader/cache with root, transform, static-content, bounds and site/layer compatibility validation.
- Migrated the existing future-tree grove to lazy first-activation loading through the cache.
- Added runtime `idle/loading/ready/fallback` state, one-shot preparation and `CityChangeManager.getDiagnostics()`; exposed diagnostics in the existing canvas debug dataset.
- Kept the manager's public snapshot/incremental/update API and all 3 s / 10 s behavior unchanged.

## Validation

- Node `24.21.0`: root `npm test` 12 PASS; `npm run build` PASS with the existing chunk warning; `git diff --check` clean.
- Browser: 1280×720 headless Chrome, fresh scratch DB. Lazy tree request, all-sites state, reload and reset passed; no console exception or non-favicon HTTP error. All-sites remained 521 draw calls / 133 geometries.
- Real-GPU FPS: NOT RUN.

## Known limits and decisions

- Stage 2 does not add a new binary asset or generic socket placement.
- The existing Hachiko tree uses the same GLB outside the site manager, so the browser sees one base-city request plus one site-cache request when PARK activates.
- `preserve` is the only material policy exercised in Stage 2. Stage 3 adds and tests `city-roles` remapping for AUTO HUB.

## Next expected step

Create `codex/automation-hub-upper-glb` from this branch, produce the dedicated Blender/GLB pair through Blender MCP, and integrate it as the `hubUpper` GLB layer with the current procedural geometry retained as fallback.
