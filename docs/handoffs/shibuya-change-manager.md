# shibuya-change-manager — Data-driven root-scene change sites, Stage 1

- Owner: Codex (implementation owner for this task)
- Status: PLANNED
- Branch: `codex/shibuya-change-manager`
- Base commit: `aea125eb15c50b67ed4f03b099aef7b9e8182929`
- Last verified commit: `aea125eb15c50b67ed4f03b099aef7b9e8182929` (clean baseline only; implementation NOT STARTED)
- Remote availability: NOT PUSHED
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: clean `main` at `aea125eb15c50b67ed4f03b099aef7b9e8182929` in the independent clone `/Users/jh/Documents/exhibition-city/city2127-change-manager`
- Last fetched origin/main commit: `aea125eb15c50b67ed4f03b099aef7b9e8182929` (fresh clone and remote check, 2026-09-27)
- Local changes present at session start: NONE. The older clone at `/Users/jh/Documents/city2127-main/city2127` remains untouched; it is behind main and contains an unrelated modified `module-swap/assets/building-basic-medium/building-basic-medium.blend`.
- Upstream integration status: NOT NEEDED; `main` and `origin/main` were identical when this branch was created
- Pending Git conflicts or synchronization blockers: NONE. `feat/art-direction` is integrated as merge `2126a2c` and deleted. The remaining Odaiba branches do not edit the planned change-manager files; `codex/odaiba-preview` also edits shared overlay/style files, which are outside this task.

## Goal and acceptance criteria

Refactor the root Shibuya `?survey` change sites from one hard-coded `surveySites.ts` implementation into a data-driven site catalogue, a runtime city-change manager and site builders, without changing the current four-site appearance or survey-server authority.

Acceptance criteria:

1. The survey server's `CityView` remains the sole authoritative state. Root code selects visual variants from the server-derived layout and does not add score triggers or priority conflict rules.
2. The catalogue names the four Shibuya sites separately from the wire socket IDs and maps their current baseline/medium/tall/park/plaza states to explicit variant IDs and part layers.
3. `CityChangeManager` distinguishes `city-state-snapshot`, `city-state-updated` and `run-reset`; snapshots restore without a fresh-change pulse, live updates transition changed sites only, and updates can retarget an in-progress transition from its current value.
4. Site builders preserve the integrated art-direction geometry, shared materials, per-material `bake()` calls, node names, positions, 3-second rise/sink motion and 10-second saffron marker semantics.
5. Existing non-survey mode, day/night cycle, atmosphere blend, causal panel and server protocol remain unchanged.
6. Pure catalogue/transition behavior has runnable root tests. Root `npm test`, `npm run build` and `git diff --check` pass under Node 24+. A desktop browser smoke check compares baseline and changed survey states and checks console errors and draw-call regression; no FPS claim is made unless measured on real GPU.

## In-scope files and dependencies

Planned source files:

- `src/changeCatalog.ts` — site IDs, variant IDs, socket-to-site mapping and pure layout-to-variant selection
- `src/cityChangeManager.ts` — desired/current variant diff, snapshot/update/reset semantics, retargetable transitions and marker freshness
- `src/siteBuilders/` — the four existing procedural site builders plus shared builder/runtime types; preserve current art and batching
- `src/surveySites.ts` — reduce to a compatibility/factory boundary or remove after all callers migrate
- `src/surveyAtmosphere.ts` — keep event kind through parsing/connection; retain atmosphere and causal-panel responsibilities
- `src/main.ts` — construct and update the manager in `?survey` mode
- root tests and `package.json` test script as needed
- `docs/PROJECT.md`, `docs/VALIDATION.md` and this handoff

Dependencies to reuse: Three.js 0.180, `cityRig` materials/builders/`bake()`, `layout.changeSites`, the existing future-tree GLB and current root survey contract. No new npm dependency.

Explicitly excluded from Stage 1: survey schema or `deriveCityLayout()` changes, new questions/sites/variants, GLB replacement of procedural sites, a generic asset catalogue/cache, socket placement, persistence, new labels/UI, visual redesign, module-swap changes and Blender edits.

## Completed work

- Verified that art-direction is integrated into `origin/main` as `2126a2c`; latest main is `aea125e`.
- Created a clean independent clone and this task branch from current main.
- Traced the current root survey flow, integrated site art/batching, module-swap event-kind parser and changed-only transition pattern.
- Confirmed no active remote branch overlaps the planned change-manager files.

## Actual validation results

- Verification status: PASSED for the clean pre-change root baseline; implementation validation NOT RUN
- Date and checked commit/worktree: 2026-09-27, clean `aea125eb15c50b67ed4f03b099aef7b9e8182929`
- Commands/manual checks and results: with Node `24.21.0` / npm `11.19.0`, `npm ci` completed, `npm test` produced 9 PASS lines, `npm run build` passed with the existing >500 kB chunk warning, and `git diff --check` passed. The shell default Node `20.16.0` is unsupported: its test command cannot use type stripping and Vite warns that it is below the required version; those first-run results are not counted as validation.
- Evidence/environment: command-line baseline only; browser checks NOT RUN
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: this planning handoff only

## Known issues and blockers

- No implementation blocker. Always activate Node 24 before running project commands on this machine.
- `surveySites.ts` currently uses one `first` boolean rather than the WebSocket event kind. A later reconnect snapshot that contains missed changes can therefore be treated as fresh; Stage 1 will make the documented snapshot/live distinction explicit.
- The park's future-tree GLB loading remains the existing one-off loader in Stage 1. Asset caching and stale asynchronous GLB load handling belong to the later hybrid-GLB stage.

## Important decisions

- Stage 1 is a behavior-preserving root refactor, not the full hybrid-GLB implementation.
- Do not implement client-side `trigger(scores)` plus `priority`; the server continues to decide layout and the root catalogue only decides how that layout is rendered.
- Keep `nw`/`ne`/`sw`/`se` as wire socket IDs for compatibility. Use Shibuya-specific internal site IDs such as `magnetEast`, `stationEastPark`, `dogenzakaSouth` and `centerGaiRear`.
- Represent a variant as one or more part layers so the current medium/tall additive geometry naturally extends to procedural, GLB, prop and effect layers later.
- Preserve art-direction batching and saffron semantics as acceptance requirements, not incidental implementation details.

## Next expected step

Codex: implement `changeCatalog.ts` first with exhaustive pure tests, then introduce the manager and migrate one site at a time into `siteBuilders/`, keeping `surveySites()` behavior available until all four sites and `main.ts` are migrated.
