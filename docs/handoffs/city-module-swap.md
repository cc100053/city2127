# city-module-swap — Modular ground, lot and building swap package

- Owner: noifex
- Status: IN_PROGRESS — committed and pushed to its own branch; not integrated into `main`
- Branch: `feat/city-module-swap`
- Base commit: `5577195751f20b3de568d289425f534e85b2c2a4`
- Last verified commit: `d29b02d4abdef8bdba869702610d318d83d930a1` — the worktree that was verified is byte-identical to this commit; the only later change is this documentation update
- Remote availability: `origin/feat/city-module-swap` at `d29b02d4abdef8bdba869702610d318d83d930a1`
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

New directory `module-swap/` only (45 files, 2.4 MB):

- `module-swap/app/` — Vite + vanilla TypeScript + Three.js 0.180.0 prototype, its own `package.json`, `tsconfig.json` and lockfile. Runtime GLBs live in `module-swap/app/public/assets/models/`.
- `module-swap/assets/` — the eight authoring pairs (`.blend` + `.glb`) for `ground-cross`, `lot-empty`, `lot-park`, `lot-plaza`, `prop-kit`, `building-basic-small`, `building-basic-medium`, `building-basic-tall`.
- `module-swap/verification/modular-ground-reassembly-test.blend` — reassembly check scene, not a production asset.
- `module-swap/README.md`, `module-swap/.gitignore`.

Explicitly excluded: `src/`, `asset/`, `tests/`, root `package.json` and root `tsconfig.json` are untouched. `node_modules/`, `dist/`, `tsconfig.tsbuildinfo`, `.blend1` and `.DS_Store` were excluded from the copy.

Source of the copy: `/Users/jh/Documents/exhibition-city/module-swap-latest` (a non-Git production folder, which is kept as-is; this was a copy, not a move).

Dependency note: `module-swap/app` is a separate npm project. The root `tsconfig.json` uses `include: ["src"]`, so the new directory is outside the root type-check, and the root `package.json` test script does not run these tests. Wiring them into the root scripts is deliberately left for a later task.

## Completed work

- Copied the package into `module-swap/`.
- The GLBs under `module-swap/app/public/assets/models/` and `module-swap/assets/*/` are byte-identical duplicates: the former is what the app loads at runtime, the latter is the authoring pair next to its `.blend`. Which one is the source of truth is an open decision (see below).
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
- Evidence/environment: Node.js v24.21.0 from nvm (the shell default `node` is v20.16.0 and fails with `node: bad option: --experimental-strip-types`), npm 11, Chrome headless (new) on `http://127.0.0.1:5173`, macOS 24.6.0.
- Integrated commit and checks: NOT INTEGRATED into `main`. The work is committed on this branch as `d29b02d4abdef8bdba869702610d318d83d930a1` and pushed to `origin/feat/city-module-swap`; `main` is unchanged at `5577195751f20b3de568d289425f534e85b2c2a4`.
- Changes since verification: documentation only — this handoff was updated to record the commit SHA and remote availability. No source, asset or configuration file changed.

## Known issues and blockers

- Blender verification NOT RUN in this session. No `.blend` was opened and no GLB was re-imported here; the assets are unmodified copies that were validated in the source project. Re-run the Blender checks in `docs/VALIDATION.md` before treating them as verified in this repository.
- The eight GLBs exist twice (runtime copy and authoring copy). They are byte-identical today, but nothing enforces that, so they can drift silently on the next export.
- `module-swap/app` is not wired into the root `npm test` / `npm run build`, so CI at the root will not cover it.
- The 500 kB Vite chunk warning is present and unaddressed by design.

## Important decisions

- The package lands as an independent top-level directory rather than being merged into `src/`, so the existing procedural city keeps working and the diff stays reviewable as a pure addition.
- `CityState` was split into `CityLayoutState` (placement, this branch) and `CitySurveyState` (survey accumulation, `feat/survey-state-mvp`). A combined `CityState` that holds both is intentionally **not** created yet; it is to be introduced on `main` after both branches land.
- The production folder outside this repository is kept; this branch received a copy.

## Next expected step

Owner decides whether to open integration into `main`. The package is committed as `d29b02d4abdef8bdba869702610d318d83d930a1` and available on `origin/feat/city-module-swap`.

Before integration, run the Blender checks in `docs/VALIDATION.md` against `module-swap/assets/` and `module-swap/verification/`, which were not run in this repository, and decide which copy of the eight GLBs is the source of truth.

Note that `survey/` from the parallel branch `feat/survey-state-mvp` (`963949c1076b49cac9286c723116ee3ef4962576`) stays untracked in a shared worktree until both branches land; that is expected and must not be deleted. Both branches were created from the same base commit and do not conflict.
