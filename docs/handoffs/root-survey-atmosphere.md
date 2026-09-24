# root-survey-atmosphere — Survey drives the root Shibuya scene (steps 1–2)

- Owner: cc100053
- Status: DONE
- Branch: feat/root-survey-atmosphere
- Base commit: 47b36c93715000ee798a591f10eee399c9b0e7bb
- Last verified commit: 43c6d246d4b459c985b2b0ee1d8a6111a9035bbe (step 2); integrated as 691bd2b5705a9cfc18b6a3755bb482c88dc84c8b
- Remote availability: origin/feat/root-survey-atmosphere and origin/main at 691bd2b
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: main 47b36c93715000ee798a591f10eee399c9b0e7bb
- Last fetched origin/main commit: 47b36c93715000ee798a591f10eee399c9b0e7bb (2026-09-24)
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Steps 1–2 of connecting the survey to the root scene (user decisions 2026-09-24): `?survey` on the root app follows the survey server; scores change the atmosphere (step 1) and the layout raises four visible Shibuya change sites (step 2); each accepted answer starts a visible change; reconnect/reload rebuilds from the server snapshot; reset returns to the empty baseline; the preset prototype is unchanged without `?survey`.

## In-scope files and dependencies

`src/surveyAtmosphere.ts`, `src/surveySites.ts` (new), `src/layout.ts` (`changeSites`), `src/cityRig.ts` (exports only), `src/worldState.ts` (`blendTo`), `src/main.ts`, `src/style.css`, `tests/surveyAtmosphere.test.ts`, `tests/mobility.test.ts`, `package.json` test script, docs. Depends on the survey server's CityView WebSocket (`survey/src/shared/cityView.ts`); `survey/` and `module-swap/` are not changed. Excluded: causal history panel (step 3), presets.

## Completed work

See [PROJECT.md](../PROJECT.md#root-scene-survey-mode--2026-09-24-srcsurvey-steps-12-of-connecting-the-survey).

## Actual validation results

- Verification status: PASSED for local checks and browser flow; FPS not measured
- Date and checked commit/worktree: 2026-09-24, step 2 uncommitted worktree on e04f396
- Commands/manual checks and results: see [VALIDATION.md](../VALIDATION.md#root-scene-survey-change-sites--2026-09-24) and the step 1 entry below it
- Evidence/environment: artifacts/survey-sites-*.png, artifacts/survey-atmosphere-*.png, headless Chromium 1280×720
- Integrated commit and checks: 691bd2b on main; local `npm test`, `npm run build`, `git diff --check origin/main...HEAD` passed; branch CI run 36006962113 (43c6d24) and main CI run 36007086577 (691bd2b) succeeded
- Changes since verification: this handoff update only

## Known issues and blockers

Atmosphere alone is subtle (step 1 finding); the change sites carry the readable change. Sites have no in-scene labels. Performance with all sites up is unmeasured.

## Important decisions

- Scores drive the atmosphere; the four layout lots map to fixed Shibuya sites (NW hub, NE park, SW plaza, SE tower). `deriveCityLayout()` on the server is unchanged.
- Site parts are prebuilt and rise/sink by Y scale; no geometry is created on answers.
- The client contract is a small copy of module-swap's `surveyView.ts` (scores instead of layout), not a shared package.

## Next expected step

Integrated. Next, step 3 (owner cc100053): port the full causal history panel (CHOICE / POLICY / CITY EFFECT) and optionally label sites in the scene.
