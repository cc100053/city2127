# road-polish — 2127 shared-surface avenues

- Owner: cc100053
- Status: DONE
- Branch: feat/road-polish
- Base commit: 4ced0195c36b0c14fe488d5b223eebb04cbc13f7
- Last verified commit: implementation commit on `feat/road-polish` (see `git log`); checks ran on its exact worktree
- Remote availability: origin/feat/road-polish, merged to main

## Session Git state

- Session starting branch and HEAD: detached HEAD at 4ced0195c36b0c14fe488d5b223eebb04cbc13f7
- Last fetched origin/main commit: 4ced0195c36b0c14fe488d5b223eebb04cbc13f7 (fetched 2026-10-07)
- Local changes present at session start: untracked `.playwright-cli/` logs only (preserved)
- Upstream integration status: merged to main after checks
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

The user chose brainstorm options C + A (lite), day hero first: avenues should read as 2127 post-road shared surface
(CITY_MASTER_TASTE §5, §12.4), not asphalt with painted lines; day hero unchanged or calmer; no actor/route behaviour change.

## In-scope files and dependencies

`src/mobility.ts` (inlay meshes beside the crossing bands), `tests/mobility.test.ts`, docs. Uses existing `routes().streets`,
`CARRIAGEWAY`, `laneOffset`, the `mint` finish. Excluded: environment GLB, road material colours, Meter coupling (option E), night lighting (option D).

## Completed work

- Colour probe showed C and "remove markings" already hold: inside the district the surveyed `road` and `road_marking` meshes are covered
  by the pale `sidewalk` paving slab, so nothing to recolour or remove.
- Added `carriageway-seams` (0.3 m darker stone `#bdb5a4` at each carriageway edge) and `carriageway-guides` (0.1 m mint under each
  lane centre), flush at y 0.225 on the slab with polygon offset; crossing bands (y 0.23) lie over them. +2 draws.

## Actual validation results

- Verification status: PASSED (day only)
- Date and checked commit/worktree: 2026-10-07, feat/road-polish implementation worktree
- Commands/manual checks and results: root `npm test` PASS (incl. new inlay face-up/height check), `npm run build` PASS, `git diff --check` PASS
- Evidence/environment: headless Chrome via playwright-cli, 1280×720, `?hour=12`; [artifacts/road-polish](../../artifacts/road-polish/)
- Integrated commit and checks: main merge; same root checks rerun on the merge
- Changes since verification: NONE in source

## Known issues and blockers

- Inlays are below hero-frame resolution: the day hero is visually unchanged (the avenues were already pale). Visible in street/close views.
- Night look, Meter states, FPS and a guideway-avenue close-up (hidden under the guideway) NOT RUN.

## Important decisions

- No asphalt/markings recolour: the probe proved they are not visible in the hero, so editing them would be dead work.
- The mint guide is a polygon-offset clone of the mint finish; its glow follows the shared mint intensity (day .65, rising with night neon). Night look unchecked; revisit in a night pass (option D).

## Next expected step

Optional follow-ups if the user wants them: B (ecological road edges), D (night guide lighting), E (Meter-driven carriageway width, separate task).
