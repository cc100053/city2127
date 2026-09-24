# root-causal-panel — Causal panel in the root Shibuya survey mode (step 3)

- Owner: cc100053
- Status: IN_PROGRESS
- Branch: feat/root-causal-panel
- Base commit: 2d49990867d883392abe8fbb2ab335a401d09119
- Last verified commit: uncommitted worktree on the base (checks below)
- Remote availability: see branch push
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: main 2d49990867d883392abe8fbb2ab335a401d09119
- Last fetched origin/main commit: 2d49990867d883392abe8fbb2ab335a401d09119 (2026-09-24)
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Step 3 of connecting the survey to the root scene (user decision 2026-09-24; steps 1–2 in [root-survey-atmosphere](root-survey-atmosphere.md)): viewers of `?survey` read why the city changed — the latest problem, choice, policy change and city effect with the Shibuya place — plus recent history, without the panel hiding a change site at the desktop viewport.

## In-scope files and dependencies

`src/surveyAtmosphere.ts` (panel, `policyText`, `cityText`), `src/layout.ts` (`changeSites[*].place`), `src/style.css`, `tests/surveyAtmosphere.test.ts`, docs. Uses the survey CityView history (`survey/src/shared/cityView.ts`); `survey/` and `module-swap/` unchanged.

## Completed work

See [PROJECT.md](../PROJECT.md#root-scene-survey-mode--2026-09-24-srcsurvey), step 3.

## Actual validation results

- Verification status: PASSED for local checks and browser flow; FPS not measured
- Date and checked commit/worktree: 2026-09-24, uncommitted worktree on 2d49990
- Commands/manual checks and results: see [VALIDATION.md](../VALIDATION.md#root-scene-causal-panel--2026-09-24)
- Evidence/environment: artifacts/causal-panel-*.png, headless Chromium 1280×720
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: documentation and handoff only

## Known issues and blockers

History shows only the latest three decisions; no labels in the 3D scene; performance with all sites up unmeasured.

## Important decisions

- Survey mode hides the preset intro copy (it describes the three presets); the header stays.
- Panel copy stays Japanese like module-swap's panel and the survey questions.

## Next expected step

Integrate into main after branch CI.
