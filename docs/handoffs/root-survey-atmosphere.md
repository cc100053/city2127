# root-survey-atmosphere — Survey scores drive the root Shibuya atmosphere

- Owner: cc100053
- Status: IN_PROGRESS
- Branch: feat/root-survey-atmosphere
- Base commit: 47b36c93715000ee798a591f10eee399c9b0e7bb
- Last verified commit: uncommitted worktree on the base (checks below)
- Remote availability: see branch push
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: main 47b36c93715000ee798a591f10eee399c9b0e7bb
- Last fetched origin/main commit: 47b36c93715000ee798a591f10eee399c9b0e7bb (2026-09-24)
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Step 1 of connecting the survey to the root scene (user decision 2026-09-24): `?survey` on the root app follows the survey server's policy scores and changes the scene atmosphere; each accepted answer starts a visible transition; reconnect/reload rebuilds from the server snapshot; the preset prototype is unchanged without `?survey`.

## In-scope files and dependencies

`src/surveyAtmosphere.ts` (new), `src/worldState.ts` (`blendTo`), `src/main.ts`, `src/style.css`, `tests/surveyAtmosphere.test.ts`, `package.json` test script, docs. Depends on the survey server's CityView WebSocket (`survey/src/shared/cityView.ts`); `survey/` and `module-swap/` are not changed. Excluded: Shibuya change points (step 2), causal panel port (step 3), presets.

## Completed work

See [PROJECT.md](../PROJECT.md#root-scene-survey-atmosphere--2026-09-24-srcsurvey-step-1-of-connecting-the-survey).

## Actual validation results

- Verification status: PARTIAL (wiring passed; visual readability not accepted)
- Date and checked commit/worktree: 2026-09-24, uncommitted worktree on 47b36c9
- Commands/manual checks and results: see [VALIDATION.md](../VALIDATION.md#root-scene-survey-atmosphere--2026-09-24)
- Evidence/environment: artifacts/survey-atmosphere-*.png, headless Chromium 1280×720
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: documentation and handoff only

## Known issues and blockers

The existing WorldState visuals are subtle in daylight; three guests produce only a small visible change. Not merged to main pending the user's decision.

## Important decisions

- Only `scores` drive the root scene; the four-lot layout is ignored until step 2 defines Shibuya change points.
- The client contract is a small copy of module-swap's `surveyView.ts` (scores instead of layout), not a shared package.

## Next expected step

User (cc100053) decides: merge step 1 as is, or first strengthen state-driven visuals / go to step 2 (visible Shibuya change points).
