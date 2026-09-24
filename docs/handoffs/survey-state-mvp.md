# survey-state-mvp — Questionnaire state accumulation MVP

- Owner: noifex
- Status: IN_PROGRESS — committed and pushed to its own branch; not integrated into `main`
- Branch: `feat/survey-state-mvp`
- Base commit: `5577195751f20b3de568d289425f534e85b2c2a4`
- Last verified commit: `963949c1076b49cac9286c723116ee3ef4962576` — the worktree that was verified is byte-identical to this commit; the only later change is this documentation update
- Remote availability: `origin/feat/survey-state-mvp` at `963949c1076b49cac9286c723116ee3ef4962576`
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: `main` at `5577195751f20b3de568d289425f534e85b2c2a4`
- Last fetched origin/main commit: `5577195751f20b3de568d289425f534e85b2c2a4`, fetched 2026-09-24. The first `git fetch --prune origin` failed with `Permission denied (publickey)`; an immediate retry with the same key succeeded, so the failure was transient.
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED — `main` and `origin/main` are at the same commit (0/0 divergence)
- Pending Git conflicts or synchronization blockers: NONE. This branch was created from `main`, not stacked on `feat/city-module-swap`; both branches share the same base commit.

## Goal and acceptance criteria

Bring the standalone questionnaire state-accumulation MVP into this repository as a new top-level directory, without touching the existing procedural city in `src/`.

Acceptance criteria:

- `survey/` builds, type-checks and passes its own tests from inside this repository.
- The repository root `npm test` and `npm run build` keep passing unchanged.
- No existing file is modified by this branch.

## In-scope files and dependencies

New directory `survey/` only (44 files, 268 KB):

- `survey/src/shared/` — types shared by server, debug views and tests (`citySurveyState.ts`, `question.ts`, `protocol.ts`); no Node or DOM APIs.
- `survey/src/survey/` — question JSON validation, score engine, milestone engine (pure functions).
- `survey/src/server/` — HTTP and WebSocket server, SQLite via `node:sqlite`, migrations, run store, guest sessions, answers, admin/reset.
- `survey/src/ui/` — debug screens for guest, monitor and admin. They call the API only and never compute scores.
- `survey/tests/` — 10 Node test scripts using `node:assert/strict`, no test framework.
- `survey/README.md`, `survey/.gitignore`, `survey/package.json`, `survey/tsconfig.json`, `survey/vite.config.ts`, four HTML entry points.
- `survey/docs/log/survey-state-mvp.md` — the package's own development log, copied along with it. It was originally at `survey/docs/handoffs/survey-state-mvp.md`; the directory and role were renamed to `log` so that nothing inside a package mimics this repository's `docs/handoffs/` convention.

Explicitly excluded: `src/`, `asset/`, `tests/`, root `package.json` and root `tsconfig.json` are untouched. `node_modules/`, `dist/`, `data/`, `*.sqlite*`, `*.log` and `.DS_Store` were excluded from the copy; the live exhibition database was never copied.

Source of the copy: `/Users/jh/Documents/exhibition-questionnaire` (a non-Git production folder, which is kept as-is; this was a copy, not a move).

Dependency note: `survey/` is a separate npm project whose only runtime dependency is `ws`; SQLite comes from Node's built-in `node:sqlite`. The root `tsconfig.json` uses `include: ["src"]`, so the new directory is outside the root type-check, and the root `package.json` test script does not run these tests. Wiring them into the root scripts is deliberately left for a later task.

## Completed work

- Copied the package into `survey/`.
- Implemented scope (unchanged by this branch, carried over from the source project): question JSON validation at startup, five-axis scores clamped to -12..12, three irreversible milestones, append-only answer events in SQLite with snapshot restore on restart, guest sessions with a 2-minute question reservation, revision-based conflict detection and answer-ID idempotency, WebSocket monitor notifications, loopback-only admin with a Reset that starts a new run instead of deleting history.
- The survey state type is named `CitySurveyState` (`survey/src/shared/citySurveyState.ts`) so that it does not collide with the placement-side `CityLayoutState` on `feat/city-module-swap`. The wire contract was deliberately left unchanged by that rename: `/api/city-state`, the `city-state-snapshot` / `city-state-updated` / `run-reset` message types, all JSON field names and the SQLite schema are untouched.
- `toCityViewInput()` in `survey/src/shared/citySurveyState.ts` remains the single intended entry point toward a future Three.js consumer. It normalizes scores to -1..1 and lists unlocked milestones; the mapping to GLB lots and buildings is intentionally not implemented.

## Actual validation results

- Verification status: PASSED
- Date and checked commit/worktree: 2026-09-24, uncommitted worktree of `feat/survey-state-mvp` at base `5577195`
- Commands/manual checks and results:
  - `survey/`: `npm ci`, then `npm test` — all 10 suites passed, including 8 concurrent worker threads on separate SQLite connections (7 revision conflicts retried, no lost updates), restart/replay restore, schema-version enforcement, loopback-only admin returning 403 from a simulated LAN address, and the WebSocket snapshot/update/reset sequence.
  - `survey/`: `npm run build` (`tsc --noEmit && vite build`) — succeeded; four debug pages emitted.
  - Repository root: `npm test` — all existing suites passed; `npm run build` — succeeded; `git diff --check` — clean.
  - `git status --short` shows only the untracked new paths, confirming `node_modules/`, `dist/` and `data/` are ignored inside the new directory.
- Evidence/environment: Node.js v24.21.0 from nvm (the shell default `node` is v20.16.0 and fails with `node: bad option: --experimental-strip-types`), npm 11, macOS 24.6.0. No browser session was driven for this package.
- Integrated commit and checks: NOT INTEGRATED into `main`. The work is committed on this branch as `963949c1076b49cac9286c723116ee3ef4962576` and pushed to `origin/feat/survey-state-mvp`; `main` is unchanged at `5577195751f20b3de568d289425f534e85b2c2a4`.
- Changes since verification: documentation only — this handoff was updated to record the commit SHA and remote availability. No source, asset or configuration file changed.

## Known issues and blockers

- Not connected to the Three.js city in any way. `Application verification: NOT INTEGRATED` for the 3D side.
- Question text and effect values are placeholder data, not exhibition content.
- Out of scope and unimplemented: production question wording, the finished phone UI, QR onboarding, cloud DB, authentication, the `CityVisualState` mapping, GLB swap rules and deployment.
- `survey/` is not wired into the root `npm test` / `npm run build`, so CI at the root will not cover it.

## Important decisions

- The package lands as an independent top-level directory rather than being merged into `src/`, so the existing procedural city keeps working and the diff stays reviewable as a pure addition.
- `CityState` was split into `CitySurveyState` (survey accumulation, this branch) and `CityLayoutState` (placement, `feat/city-module-swap`). A combined `CityState` that holds both is intentionally **not** created yet; it is to be introduced on `main` after both branches land.
- The survey-side `WorldState` concern (light, traffic, haze and other atmosphere parameters already in `src/presets.ts`) stays separate from `CitySurveyState`; they are not to be merged.
- The production folder outside this repository is kept; this branch received a copy.
- The package's own record was moved from `survey/docs/handoffs/` to `survey/docs/log/` (2026-09-24). Only this repository's root `docs/handoffs/` carries task handoffs; a package's internal history is a log. The same rename was applied in the production folder so the next copy does not reintroduce the collision.

## Next expected step

Owner decides whether to open integration into `main`. The package is committed as `963949c1076b49cac9286c723116ee3ef4962576` and available on `origin/feat/survey-state-mvp`.

Before integration, note that `module-swap/` from the parallel branch `feat/city-module-swap` (`d29b02d4abdef8bdba869702610d318d83d930a1`) stays untracked in a shared worktree until both branches land; that is expected and must not be deleted. Both branches were created from the same base commit and do not conflict.

The combined `CityState` that unifies `CitySurveyState` and `CityLayoutState` is the first task to do on `main` after both branches land.
