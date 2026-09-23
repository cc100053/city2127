# city-module-swap — Modular ground, lot and building swap package

- Owner: noifex
- Status: IN_PROGRESS — committed and pushed to its own branch; not integrated into `main`
- Branch: `feat/city-module-swap`
- Base commit: `5577195751f20b3de568d289425f534e85b2c2a4`
- Last verified commit: `8051fda955dfd6afab4ce698e60af6a0c95e7f7a` — the worktree that was verified is byte-identical to this commit; the only later change is this documentation update
- Remote availability: `origin/feat/city-module-swap` at `8051fda955dfd6afab4ce698e60af6a0c95e7f7a`
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
  - CI (`.github/workflows/ci.yml`, run on every push): the first push failed on the whitespace step with `module-swap/.gitignore:6: new blank line at EOF`; `npm ci`, `npm test` and `npm run build` had passed. Fixed in this branch and re-checked locally with the same command form, `git diff --check main..HEAD`, which now exits 0.
- Evidence/environment: Node.js v24.21.0 from nvm (the shell default `node` is v20.16.0 and fails with `node: bad option: --experimental-strip-types`), npm 11, Chrome headless (new) on `http://127.0.0.1:5173`, macOS 24.6.0.
- Integrated commit and checks: NOT INTEGRATED into `main`. The work is committed on this branch through `8051fda955dfd6afab4ce698e60af6a0c95e7f7a` and pushed to `origin/feat/city-module-swap`; `main` is unchanged at `5577195751f20b3de568d289425f534e85b2c2a4`.
- Changes since verification: documentation only — this handoff was updated to record the commit SHAs, the Blender inspection, the CI outcome and remote availability. No source, asset or configuration file changed after the checks above.

## Known issues and blockers

- `module-swap/` is not wired into the root `npm test` / `npm run build`, so repository CI covers neither its unit tests nor `check:models`. The GLB drift check only runs when someone runs `npm test` inside `module-swap/`. Wiring it into the root scripts is a separate decision.
- The 500 kB Vite chunk warning is present and unaddressed by design.

## Important decisions

- The package lands as an independent top-level directory rather than being merged into `src/`, so the existing procedural city keeps working and the diff stays reviewable as a pure addition.
- `CityState` was split into `CityLayoutState` (placement, this branch) and `CitySurveyState` (survey accumulation, `feat/survey-state-mvp`). A combined `CityState` that holds both is intentionally **not** created yet; it is to be introduced on `main` after both branches land.
- The production folder outside this repository is kept; this branch received a copy.
- `assets/` is the source of truth for the eight GLBs because it is where a person edits, next to the matching `.blend`; `app/public/assets/models/` only exists so Vite can serve them (owner decision, 2026-09-24). Serving `assets/` directly from Vite was rejected: the directory shapes differ (`assets/<id>/<id>.glb` versus `models/<id>.glb`), so it would need extra Vite configuration or a symlink and another round of production-build and offline verification for no gain at this stage.

## Next expected step

Owner decides whether to open integration into `main`. The package is committed on this branch and available on `origin/feat/city-module-swap`; see the header for the exact SHA.

Note that `survey/` from the parallel branch `feat/survey-state-mvp` (`2d4d7d5681ef1bd4e0d5e71ec7a3ad8aff4c9643`) stays untracked in a shared worktree until both branches land; that is expected and must not be deleted. Both branches were created from the same base commit and do not conflict.
