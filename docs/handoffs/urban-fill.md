# urban-fill — Fill bare lawn with city content

- Owner: rex
- Status: IN_PROGRESS (awaiting owner visual review)
- Branch: claude/project-thread-8fkqrt
- Base commit: 6239fa8 (origin/main, PR #9 merged)
- Last verified commit: 98aef7c
- Remote availability: origin/claude/project-thread-8fkqrt

## Session Git state

- Session starting branch and HEAD: new task branch from origin/main 6239fa8
- Last fetched origin/main commit: 6239fa8, 2026-11-21
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner (2026-11-21): too much bare lawn, the city does not read as real; fill it, balancing FPS and look. Owner chose all three layers (street grid,
low/mid-rise blocks, designed open blocks) and then a backdrop city fabric plus district-wide blocks. R3 owner feedback: buildings must not sprout
from lawn; pave the ground, every building reached by streets or plazas, keep only a realistic green share (~20–25%). The nine-question rotation is
the only product: district Meter elements stay frozen at tier 0, so their sites are only footprints to avoid, not reserved ground.
Acceptance is the owner's visual review plus an FPS check on the Mac (`scripts/fps.sh`).

## In-scope files and dependencies

- `src/urbanFill.ts` (new): `planUrbanFill` / `buildUrbanFill` (district blocks) and `backdropFabric` (beyond the district).
- `src/layout.ts` `URBAN_FILL` (grid origin/axis on the ④ boulevard, pitches, zones, backdrop radius).
- `src/districtMeters.ts` `METER_GROUND` (tower/court/pod sites the fill keeps off).
- `src/odaibaScene.ts` wiring (after the street kit, before planting); `glaze()` shares the landmark night-room glazing.
- `src/coastalCanopy.ts` `plantBackdropGrove(..., cleared)`; `plantLandscapeCanopy` returns its grove clusters.
- `src/groundMask.ts` (new, R3): district ground mask canvas (R lawn, G no street), `paintGroundMask`, `greenShare`, `cellHash`/`BACKDROP_PARK`
  and `groundGLSL()` (paving, painted block streets, park lawn) injected into the `landscape` shader. Dev: `window.groundMaskCanvas`.
- `src/odaibaScene.ts` `paintDistrictGround` decides where lawn stays.

## Completed work

- R1 (fb6f7d2): district blocks south of the guideway; only ~5 fit because most open lawn there is Meter reserved ground and the DiverCity office tower.
- R2 (0e4176f): district-wide zones (blocks within 400 m of the hero camera stay park/sports/farm; HERO_CLEAR, dwellings, rectenna rack kept);
  backdrop fabric on the parkland beyond the district (one block in six stays open for the groves).
- R3: ground shader paves by default. District: lawn only on park/farm blocks, court courtyards, sports fields, grove terraces, promenade and
  water belts, the NE park and a 20 m planted median on every third cross street; block streets painted on the fill grid, kept off lots,
  landmarks, plazas and element footprints. Land-only district lawn share 19.8% (was ~41%; logged as `[ground] district lawn share`). Backdrop:
  shader paves every block on the backdrop grid with 12 m streets; blocks with `cellHash < BACKDROP_PARK` (.18) stay parks and `backdropFabric`
  skips exactly those; lawn returns past `backdrop.radius`. Zero extra draw calls (one texture, a few ALU ops).
- Fixed in R3: mask pixels written by `where` into a transparent canvas were lost (premultiplied alpha); the canvas now starts opaque.
- District fill: 6 merged meshes, ~2.7k triangles; backdrop fabric: 3 merged unshadowed meshes, ~12.3k triangles. Surveyed trees on fill blocks
  stay in the canopy list at zero scale (crown poses are index-dependent).

## Actual validation results

- Verification status: PARTIAL
- Date and checked commit: 2026-11-21, 98aef7c (cloud container; R3 shots top/aerialS/midW/hero day)
- Root `npm test`, `npm run build`, `git diff --check`: PASS.
- Cloud headless Chromium (SwiftShader, `?meters&hour=12|21&reviewTime=40&quality=low`, 1600×900): hero day/night, aerials S/E/N, mid views W/NE;
  no page errors. Sheets in the project files `grass-fill/`.
- FPS, default quality render, Meter high states with the fill, exhibition machine: NOT RUN.

## Known gaps / next step

- The hero frame keeps its foreground lawn (promenade belt, HERO_CLEAR); owner to judge.
- Paving tone `PAVING.slab` may need a darker value on the exhibition display (reads bright at noon in SwiftShader).
- Backdrop blocks are plain boxes with roof greens; no night windows (they read dark at night).
- Owner runs `scripts/fps.sh` before/after on the Mac.
