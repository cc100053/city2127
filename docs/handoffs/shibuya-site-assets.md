# shibuya-site-assets — Hybrid site asset boundary, Stage 2

> Historical scope — 2026-10-02: Shibuya development is closed and will not resume. Any unfinished Shibuya next steps below are cancelled as product work. Reused assets/legacy contracts do not imply a second venue. Current scope: [EXHIBITION_SPEC](../EXHIBITION_SPEC.md); retained source may still serve Odaiba or legacy tests.

- Owner: Codex
- Status: DONE — integrated into `main`
- Branch: `codex/shibuya-site-assets`
- Base branch/commit: `codex/shibuya-change-manager` at `2781dc9514be486d503a9ea966c857fc23e17d08`
- Last verified commit: `4ad839eb45dd2a2eb0227cab7eb2cad529d61268`
- Remote availability: `origin/main` at `17be43c9e00c9b9013684ea762ff7d83973b2852`
- GitHub Issue: none

## Goal and acceptance criteria

Add a reusable, validated and non-blocking GLB layer boundary to the Stage 1 manager. Keep CityView authoritative and preserve every current transition and visual. A missing optional asset must leave a readable procedural result rather than stop the exhibition.

## Implemented work

- Added layer kind, animation and optional asset ID to the data-driven catalogue; split PARK into `parkSurface` and `parkTrees`.
- Added a root-scene asset catalogue and injected GLTF loader/cache with root, transform, static-content, bounds and site/layer compatibility validation.
- Migrated the existing future-tree grove to lazy first-activation loading through the cache, with a lightweight procedural grove visible until the GLB is ready.
- Added runtime `idle/loading/ready/fallback` state, de-duplicated preparation, retry after failure and `CityChangeManager.getDiagnostics()`; exposed diagnostics in the existing canvas debug dataset.
- Active fallback layers retry after 5 seconds; deactivation stops retries and a later activation retries immediately. Successful replacement attaches the GLB grove before disposing only the independently baked fallback geometry.
- Kept the manager's public snapshot/incremental/update API and all 3 s / 10 s behavior unchanged.

## Validation

- Node `24.21.0`: root `npm test` 12 PASS, including runtime failure → retry success and manager retry cooldown; `npm run build` PASS with the existing chunk warning; `git diff --check` clean.
- Browser: 1280×720 headless Chrome, fresh scratch DB. Lazy tree request, all-sites state, reload and reset passed; no console exception or non-favicon HTTP error. All-sites remained 521 draw calls / 133 geometries.
- Real-GPU FPS: NOT RUN.

## Known limits and decisions

- Stage 2 does not add a new binary asset or generic socket placement.
- The existing Hachiko tree uses the same GLB outside the site manager, so the browser sees one base-city request plus one site-cache request when PARK activates.
- `preserve` is the only material policy exercised in Stage 2. Stage 3 adds and tests `city-roles` remapping for AUTO HUB.
- A slow load can replace the procedural grove with the detailed GLB after the 3-second rise has completed. The swap may be visible, but the PARK is no longer empty while waiting or after a failed request.

## Next expected step

Integrated with the Stage 3 `hubUpper` GLB layer in `main` at `17be43c9e00c9b9013684ea762ff7d83973b2852` (2026-09-27).
