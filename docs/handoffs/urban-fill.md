# urban-fill — Fill bare lawn with city content

- Owner: rex
- Status: IN_PROGRESS (awaiting owner visual review)
- Branch: claude/project-thread-8fkqrt
- Base commit: 6239fa8 (origin/main, PR #9 merged)
- Last verified commit: 0e4176f
- Remote availability: origin/claude/project-thread-8fkqrt

## Session Git state

- Session starting branch and HEAD: new task branch from origin/main 6239fa8
- Last fetched origin/main commit: 6239fa8, 2026-11-21
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner (2026-11-21): too much bare lawn, the city does not read as real; fill it, balancing FPS and look. Owner chose all three layers (street grid,
low/mid-rise blocks, designed open blocks) and then a backdrop city fabric plus district-wide blocks, Meter reserved ground untouched.
Acceptance is the owner's visual review plus an FPS check on the Mac (`scripts/fps.sh`).

## In-scope files and dependencies

- `src/urbanFill.ts` (new): `planUrbanFill` / `buildUrbanFill` (district blocks) and `backdropFabric` (beyond the district).
- `src/layout.ts` `URBAN_FILL` (grid origin/axis on the ④ boulevard, pitches, zones, backdrop radius).
- `src/districtMeters.ts` `METER_GROUND` (tower/court/pod sites the fill keeps off).
- `src/odaibaScene.ts` wiring (after the street kit, before planting); `glaze()` shares the landmark night-room glazing.
- `src/coastalCanopy.ts` `plantBackdropGrove(..., cleared)`.

## Completed work

- R1 (fb6f7d2): district blocks south of the guideway; only ~5 fit because most open lawn there is Meter reserved ground and the DiverCity office tower.
- R2 (0e4176f): district-wide zones (blocks within 400 m of the hero camera stay park/sports/farm; HERO_CLEAR, dwellings, rectenna rack kept);
  backdrop fabric on the parkland beyond the district (one block in six stays open for the groves).
- District fill: 6 merged meshes, ~2.7k triangles; backdrop fabric: 3 merged unshadowed meshes, ~12.3k triangles. Surveyed trees on fill blocks
  stay in the canopy list at zero scale (crown poses are index-dependent).

## Actual validation results

- Verification status: PARTIAL
- Date and checked commit: 2026-11-21, 0e4176f (cloud container)
- Root `npm test`, `npm run build`, `git diff --check`: PASS.
- Cloud headless Chromium (SwiftShader, `?meters&hour=12|21&reviewTime=40&quality=low`, 1600×900): hero day/night, aerials S/E/N, mid views W/NE;
  no page errors. Sheets in the project files `grass-fill/`.
- FPS, default quality render, Meter high states with the fill, exhibition machine: NOT RUN.

## Known gaps / next step

- The hero frame barely changes: its lawn pockets (owner zones 1–3) are HERO_CLEAR, Meter or lot ground. Needs its own owner decision.
- Backdrop blocks are plain boxes with roof greens; no night windows (they read dark at night).
- Owner runs `scripts/fps.sh` before/after on the Mac.
