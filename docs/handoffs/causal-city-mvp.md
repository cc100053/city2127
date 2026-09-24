# causal-city-mvp — Causal choice → policy → city change MVP

- Owner: cc100053
- Status: DONE — integrated into `main` (`6f6fbb2`); task branch deleted
- Branch: `feat/causal-city-mvp`
- Base commit: `9400ccf7897e2b26def4e9c1377c7f9b5ff7f6aa` (`main`), plus merge of `origin/feat/survey-state-mvp` at `2d4d7d5`
- Last verified commit: `391e6fce9f35acf8f4f78e007c59224d50ddda46` (later commits are documentation and screenshots only)
- Remote availability: `origin/feat/causal-city-mvp` (pushed 2026-09-24; includes `f5334f4` and this update)
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: `main` at `9400ccf7897e2b26def4e9c1377c7f9b5ff7f6aa` after a fast-forward from `5577195`
- Last fetched origin/main commit: `9400ccf7897e2b26def4e9c1377c7f9b5ff7f6aa`, fetched 2026-09-24
- Local changes present at session start: NONE
- Upstream integration status: `feat/survey-state-mvp` was not on `main`; it only adds `survey/` and its handoff, so it was merged into this branch without conflicts (`d1585b1`)
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Prove one causal history end-to-end: a guest choice changes accumulated policy state → the state decides the next guest's question → the policy state deterministically derives a visibly changed four-lot city that keeps earlier evidence → reload/reconnect rebuilds it from the server → reset returns to baseline. Mandatory path: labour shortage → automate → street decline → public commons → land pressure → build upward.

## In-scope files and dependencies

- `survey/src/shared/` — policy axes (`citySurveyState.ts`), question trigger/metadata (`question.ts`), `CityView` contract and `deriveCityLayout` (`cityView.ts`), protocol `view` fields.
- `survey/src/survey/` — `questions.mvp.json` (new default), `decisionHistory.ts`, loader validation; `milestoneEngine.ts` removed.
- `survey/src/server/` — schema 2 migration, snapshot columns, eligibility-aware allocation, `/api/city-view`, view in every WebSocket event.
- `survey/src/ui/` — debug views follow the new state.
- `module-swap/app/` — `ModuleManager.transitionTo`, `state/surveyView.ts`, `surveyMode.ts`, `ui/causalPanel.ts`, `?survey` wiring in `main.ts`, styles.
- Tests in `survey/tests/` and `module-swap/app/tests/`; docs README, PROJECT, PLAN02, VALIDATION, both package READMEs.
- Excluded: root `src/` prototype and its `WorldState`, GLB assets, deployment.

## Completed work

See [PROJECT.md](../PROJECT.md#causal-choice--city-mvp--2026-09-24-survey--module-swap) for the architecture, axis table, trigger semantics, slot meanings, reconnect and reset behaviour and the exact demo.

## Actual validation results

- Verification status: PASSED
- Date and checked commit/worktree: 2026-09-24, `391e6fce9f35acf8f4f78e007c59224d50ddda46`
- Commands/manual checks and results: recorded in [VALIDATION.md](../VALIDATION.md#causal-choice--city-mvp--2026-09-24)
- Evidence/environment: `artifacts/causal-mvp-*.png`; headless Chrome 154, 1600×1000, Node v26.0.0
- Integrated commit and checks: `6f6fbb2` (2026-09-24, `--no-ff` merge of `7a26472`, whose branch CI passed); on the merge result root, `survey/` and `module-swap/` `npm test` + `npm run build` passed and `git diff --check origin/main..HEAD` was clean
- Changes since verification: this handoff, VALIDATION entry and screenshots, plus two low-severity review fixes (malformed session-id 404, `?survey=` URL fallback) re-checked with all three packages' `npm test` / `npm run build`

## Known issues and blockers

- Guests are assumed sequential: a guest who arrives while another holds a reservation is allocated from the current scores (often a fallback question).
- Decision text in the history comes from the current question JSON; stored effects remain authoritative for scores.
- Slot meanings are conveyed by labels on generic `building-basic-*` / lot GLBs; no bespoke automation or tower assets.
- The viewer is module-swap's separate Vite app, not the root Shibuya scene. Root CI covers neither `survey/` nor `module-swap/`.
- Only five MVP questions; the full exhibition catalogue, reset policy for exhibition days and LAN/phone checks remain undesigned or unverified.

## Important decisions

- Kept the existing names `CITY_AXES` / `CityScores` / `scores` and wire message types; only axis values changed, to avoid a parallel score system.
- Removed placeholder milestones instead of redefining them; visuals derive from scores alone and every MVP effect is non-negative, so earlier evidence persists.
- Layout derivation runs on the server (shared pure module) and ships in `CityView`; the viewer only validates and renders it.
- A schema 1 database is migrated by ending its active run like an admin reset; nothing is deleted.

## Next expected step

Decide whether the next step is exhibition question content or bringing the derived layout into the root Shibuya scene.
