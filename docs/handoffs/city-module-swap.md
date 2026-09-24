# city-module-swap — Modular ground, lot and building swap package

- Owner: noifex
- Status: DONE — merged into `main`
- Branch: `feat/city-module-swap`
- Base commit: `5577195751f20b3de568d289425f534e85b2c2a4`
- Last verified commit: `ac689526fca545f6cf421e61888a1be8df925611` — the last commit that touched source or assets. Everything after it on this branch is documentation only.
- Remote availability: `origin/feat/city-module-swap` at `ac689526fca545f6cf421e61888a1be8df925611` and later; the branch tip is pushed.
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: `main` at `5577195751f20b3de568d289425f534e85b2c2a4`
- Last fetched origin/main commit: `5577195751f20b3de568d289425f534e85b2c2a4`, fetched 2026-09-24. The first `git fetch --prune origin` failed with `Permission denied (publickey)`; an immediate retry with the same key succeeded, so the failure was transient. `origin/feat/odaiba-assets-progress-02` advanced `716a26e..40d696e` in that fetch.
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED — `main` and `origin/main` are at the same commit (0/0 divergence)
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Bring the self-contained module-swap prototype into this repository as a new top-level directory, without touching the existing procedural city in `src/`.

Acceptance criteria:

- `module-swap/` builds, type-checks and passes its own tests from inside this repository.
- The repository root `npm test` and `npm run build` keep passing unchanged.
- No existing file is modified by this branch.

## In-scope files and dependencies

New directory `module-swap/` only (47 files, 2.4 MB):

- `module-swap/app/` — Vite + vanilla TypeScript + Three.js 0.180.0 prototype, its own `package.json`, `tsconfig.json` and lockfile. Runtime GLBs live in `module-swap/app/public/assets/models/`.
- `module-swap/assets/` — the eight authoring pairs (`.blend` + `.glb`) for `ground-cross`, `lot-empty`, `lot-park`, `lot-plaza`, `prop-kit`, `building-basic-small`, `building-basic-medium`, `building-basic-tall`.
- `module-swap/verification/modular-ground-reassembly-test.blend` — reassembly check scene, not a production asset.
- `module-swap/scripts/sync-models.mjs` — copies the authoring GLBs to the runtime directory, or verifies them with `--check`. Node built-ins only, no dependency.
- `module-swap/README.md`, `module-swap/.gitignore`, `module-swap/package.json` — a thin package root whose scripts delegate to `app/` (`install:app`, `dev`, `test`, `build`, `preview`), so the package runs from `module-swap/` without `cd app`. It declares no dependencies and has no lockfile of its own.

Explicitly excluded: `src/`, `asset/`, `tests/`, root `package.json` and root `tsconfig.json` are untouched. `node_modules/`, `dist/`, `tsconfig.tsbuildinfo`, `.blend1` and `.DS_Store` were excluded from the copy.

Source of the copy: `/Users/jh/Documents/exhibition-city/module-swap-latest` (a non-Git production folder, which is kept as-is; this was a copy, not a move).

Dependency note: `module-swap/app` is a separate npm project. The root `tsconfig.json` uses `include: ["src"]`, so the new directory is outside the root type-check, and the root `package.json` test script does not run these tests. Wiring them into the root scripts is deliberately left for a later task.

## Completed work

- Copied the package into `module-swap/`.
- Rebuilt `building-basic-medium` at usable detail (2026-09-24). It was a 36-triangle blockout of three boxes; it is now 1,416 triangles in seven parts — podium with a recessed entrance, entrance frame and glazing, a four-storey body with slab bands and vertical fins, a two-storey upper tier and a flat roof deck. The silhouette is unchanged on purpose: 12 x 12 x 16 exactly, so the 16 m buildable area of `lot-empty` still contains it, `socket_roof_center` still sits at the top and the existing app behaviour is untouched. Detail is kept inside the declared footprint: fins land exactly on the 12 x 12 edge rather than crossing it. Materials went from 2 to 4; the two originals are unchanged and `Glass` and `Slab` were added. Glass is an opaque dark low-roughness material, not a transparent one. No Boolean operations were used; the layers stand off the core face by 0.015 / 0.18 / 0.20 so nothing is coplanar and nothing z-fights.
- Added `module-swap/package.json` so `npm run dev`, `npm test` and `npm run build` work from the package root; previously only `module-swap/app/` had a `package.json` and running from the package root failed with `Missing script: "dev"`. Its `name` is `module-swap`, matching the directory here rather than the production folder it was copied from.
- Settled the duplicate-GLB question: `module-swap/assets/<id>/<id>.glb` is the source of truth and `module-swap/app/public/assets/models/<id>.glb` is a generated runtime copy. `scripts/sync-models.mjs` refreshes the runtime copies (`npm run sync:models`) and verifies them (`npm run check:models`); `npm test` runs the check first, so a forgotten re-export fails before the unit tests run. The script reports a missing copy, a content mismatch and a runtime GLB with no authoring source, and never deletes anything on its own.
- Node names consumed by the app: `socket_lot_nw`, `socket_lot_ne`, `socket_lot_sw`, `socket_lot_se`, `socket_building_center`, `connector_road_north/east/south/west`. Buildings attach to `socket_building_center` inside `lot-empty`, not directly to the ground lot sockets.
- The placement state type is named `CityLayoutState` (`module-swap/app/src/state/cityLayoutState.ts`) so that it does not collide with the survey-side `CitySurveyState` on `feat/survey-state-mvp`. The localStorage key `threejs-module-swap-test.city-state.v1` was deliberately left unchanged so existing saved version 1 data stays readable.

## Actual validation results

- Verification status: PASSED
- Date and checked commit/worktree: 2026-09-24, uncommitted worktree of `feat/city-module-swap` at base `5577195`
- Commands/manual checks and results:
  - `module-swap/app`: `npm ci`, then `npm test` — 8 passed, 0 failed.
  - `module-swap/app`: `npm run build` (`tsc -b && vite build`) — succeeded. The 500 kB chunk-size warning for the Three.js bundle is expected and documented in `module-swap/README.md`.
  - Browser check via headless Chrome and CDP (`module-swap/app/tests/browserSmoke.mjs` against `npm run dev`): `passed: true`, `restoredMatches: true`, `noDuplicates: true`, `exactFinalTransforms: true`, `cacheUsedOnce: true`, `uniqueNetworkEntries: true`, `resetMatches: true`, `runtimeErrors: []`. Renderer reported 97 draw calls and 11,296 triangles.
  - Repository root: `npm ci`, `npm test` — all existing suites passed; `npm run build` — succeeded; `git diff --check` — clean.
  - `git status --short` shows only `?? module-swap/`, confirming `node_modules/` and `dist/` are ignored inside the new directory.
  - Blender: the owner opened the assets and inspected them visually on 2026-09-24 and found no problems. This was an owner-run visual inspection, not a scripted run of every item in `docs/VALIDATION.md`.
  - `building-basic-medium` rebuild, in Blender 5.2.2 LTS over the MCP bridge: `mesh.validate()` reported nothing on all seven meshes, with zero zero-area faces, zero non-manifold edges and zero loose vertices. Exported with the standard glTF 2.0 binary settings (whole scene, +Y up, extras on, no camera/light/animation, no Draco or Meshopt) and re-imported into an empty scene: 11 objects, 1,416 triangles, bounds exactly (-6, -6, 0) to (6, 6, 16), `ROOT_BUILDING_BASIC_MEDIUM` custom properties intact, `connector_entrance` at (0, -6, 0), `socket_roof_center` at (0, 0, 16), four materials, no camera, light, action or negative scale. GLB grew from 4 KB to 81 KB.
  - `npm run check:models` caught the stale runtime copy before the tests ran, `npm run sync:models` refreshed it and the check then passed — the drift guard worked on its first real use.
  - Browser after the rebuild: the same smoke test passes with `runtimeErrors: []`; draw calls went 97 to 102 and triangles 11,296 to 12,676, which is exactly the 1,380-triangle difference between the old and new building.
  - Pre-integration check against `origin/main` on 2026-09-24, with nothing merged: `main` and `origin/main` agree at `5577195` with zero divergence; the branch tip matches its remote with nothing unpushed; CI is green on the tip; the task diff is 48 files and every one is an addition, so no existing file is touched; `git diff --check origin/main...HEAD` exits 0; `git merge-tree` reports no conflict against `main`, nor against `origin/feat/survey-state-mvp`, `origin/feat/odaiba-assets-progress-02` or `origin/codex/odaiba-preview`; repository root `npm test` and `npm run build` pass, and so do `module-swap`'s own `npm test` (8 of 8, with `check:models` passing) and `npm run build`.
  - CI (`.github/workflows/ci.yml`, run on every push): the first push failed on the whitespace step with `module-swap/.gitignore:6: new blank line at EOF`; `npm ci`, `npm test` and `npm run build` had passed. Fixed in this branch and re-checked locally with the same command form, `git diff --check main..HEAD`, which now exits 0.
- Evidence/environment: Node.js v24.21.0 from nvm (the shell default `node` is v20.16.0 and fails with `node: bad option: --experimental-strip-types`), npm 11, Chrome headless (new) on `http://127.0.0.1:5173`, macOS 24.6.0.
- Integrated commit and checks: merged into `main` as `9a627988247362d5dd9f7e7a17c73a9c24185320` with `git merge --no-ff` on 2026-09-24, from base `5577195751f20b3de568d289425f534e85b2c2a4`. `main` was fast-forwarded to `origin/main` first and the two already agreed, so the merge introduced no upstream catch-up. Checks rerun on the merge result: repository root `npm test` and `npm run build` pass, `module-swap` `npm test` passes 8 of 8 with `check:models` green and `npm run build` succeeds, `git diff --check origin/main..HEAD` exits 0, the integrated diff is 48 files and every one is an addition, and the working tree is clean.
- Changes since verification: documentation only. No source, asset or configuration file changed after the checks above. `building-basic-medium.blend` was re-saved by an interactive Blender session after it was committed; the re-saved file was proven equivalent (a fresh export from it is byte-identical to the committed GLB, and geometry, bounds, custom properties, sockets and materials all match) and the working tree was restored to the committed file rather than committing the session-state churn into a binary asset's history.

## Known issues and blockers

- `module-swap/` is not wired into the root `npm test` / `npm run build`, so repository CI covers neither its unit tests nor `check:models`. The GLB drift check only runs when someone runs `npm test` inside `module-swap/`. Wiring it into the root scripts is a separate decision.
- The 500 kB Vite chunk warning is present and unaddressed by design.
- `building-basic-small` (36 triangles) and `building-basic-tall` (48 triangles) are still blockouts. Only the medium building was rebuilt, deliberately, to test the approach on one asset before committing to the rest.

## Important decisions

- The package lands as an independent top-level directory rather than being merged into `src/`, so the existing procedural city keeps working and the diff stays reviewable as a pure addition.
- `CityState` was split into `CityLayoutState` (placement, this branch) and `CitySurveyState` (survey accumulation, `feat/survey-state-mvp`). A combined `CityState` that holds both is intentionally **not** created yet; it is to be introduced on `main` after both branches land.
- The production folder outside this repository is kept; this branch received a copy.
- Detail and swappability are treated as separate axes rather than a trade-off (owner decision, 2026-09-24). Measured against this package, one Odaiba landmark on `feat/odaiba-assets-progress-02` spans 8 to 16 of these 20 x 20 lots (`fuji-tv` is 162 x 123 x 81 and 127,928 triangles), so those models belong to the fixed layer as landmarks rather than to a lot socket. Detail inside the variable layer comes from splitting a building into parts on the existing sockets, not from one high-polygon mesh. The working budget for a swappable building is roughly 2,000 to 8,000 triangles and 2 to 4 materials, against `lot-park` at 1,404 and `ground-cross` at 3,780.
- `assets/` is the source of truth for the eight GLBs because it is where a person edits, next to the matching `.blend`; `app/public/assets/models/` only exists so Vite can serve them (owner decision, 2026-09-24). Serving `assets/` directly from Vite was rejected: the directory shapes differ (`assets/<id>/<id>.glb` versus `models/<id>.glb`), so it would need extra Vite configuration or a symlink and another round of production-build and offline verification for no gain at this stage.

## Next expected step

Integrated. `module-swap/` now lives on `main` as of merge commit `9a627988247362d5dd9f7e7a17c73a9c24185320`; the task branch `feat/city-module-swap` can be deleted once the merge is published.

Update 2026-09-24 (causal-city-mvp owner): item 1 is done — `feat/survey-state-mvp` reached `main` through `feat/causal-city-mvp` (merge `6f6fbb2`); both branches and `feat/city-module-swap` are deleted on origin. Items 2–4 remain open.

What is left, in the order it makes sense:

1. Integrate `feat/survey-state-mvp` (`2d4d7d5681ef1bd4e0d5e71ec7a3ad8aff4c9643`), which was cut from the same base and which `git merge-tree` reports as conflict-free against this work.
2. Wire `module-swap/` (and then `survey/`) into the repository root `npm test` so CI covers their tests and the `check:models` drift guard. The root scripts and `.github/workflows/ci.yml` are shared with the existing city, so this belongs on `main` and needs the root's owner to agree; the workflow also runs a single `npm ci` at the root, which does not install either package's dependencies.
3. Introduce the combined `CityState` that unifies `CityLayoutState` here with `CitySurveyState` from the survey package, once both are on `main`.
4. Decide whether to rebuild `building-basic-small` and `building-basic-tall` at the same density as the medium building.
