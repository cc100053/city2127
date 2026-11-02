# P3 Secondary buildings — spec r1 (coordinator, 2026-11-03)

Target: `target/master-day.png` + `target/master-night.png` (compare at 1600×900). Taste: `docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md` principle 6 (large clean forms + precise detail bands; no realistic window grids, no rooftop-tree filler). Owner direction (handoff Step 0): every non-megastructure building in **A-style — white metal megaframes with glowing cool white-blue seams, suspended glass volumes and thin translucent hologram panels on the facades**.

Already done, don't change: P1 megastructures (`src/megastructures.ts`, `src/megaFootprints.ts`), P2 civic core / floater / self-assembling building. Out of scope: ground/plaza (P4), trees and planting forms (P5 — keep every roof garden and its Meter publishing exactly as it is), traffic (P6). Reuse P1's exported materials (`megaShell`, `megaRib`, `megaSeam`, `megaGlass`) — one material family across the city.

Current hero (`P2` latest `hero-h16.png`, else `P1/r3/hero-h16.png`): beige/ivory window-grid boxes (Aqua City low block centre-front, DECKS left-front, the CTX box towers behind the ring at screen ≈(0.18, 0.40) and at right ≈(0.85, 0.37), DiverCity), the district Meter open-frame towers and skyway lattice towers with glass domes, and big colourful hologram billboards ("2127", "フジ").

## 1. Facade system → megaframe (largest visual win)

The shared facade systems in `src/odaibaScene.ts` (`curtainWall` shader on context massing + landmark panels, `roofRetrofit`, `curtainWalls`) and `src/contextFacades.ts` (instanced panels) produce the beige grid. Change the SYSTEM, not per-building:

- Base wall → `megaShell` white (`#f3f2ec`-ish), glass panes → pale blue-grey `megaGlass` tone, pane ratio lower (≈ 45% glass, wider white piers).
- **Megaframe read:** every ~4 storeys (16.8 m) a 1.4 m white slab band that projects 0.6 m (in the shader: brighter band + normal-based fake bevel is fine; in `contextFacades` instancing: one extra instanced band per 4 storeys) with a **thin `megaSeam` emissive line** (cool white-blue, ~.35 m) under it; vertical **corner ribs** at building corners if cheap (shader: brighten within 1.2 m of a face edge is NOT available — skip if it needs geometry per tower).
- Lit rooms: day = very faint; night = warm amber on ~30% of bays (keep the existing hash behaviour; target night has scattered warm windows, never a uniform wash).
- Meter facade features (`facadeClimate` green balconies / louvres) must keep working.

## 2. Hero holograms → thin cool light panels

`src/heroHolograms.ts` (13 panels, `layout.ts HOLOGRAMS`): restyle to the target's thin translucent hologram sheets — cool white-blue (`#cfe8ff`) edges and line-art at low opacity, no saturated purple/teal fills, no opaque backing. The live `voices` panel keeps its four Meter colours (they are the only saturated accents). Keep every text Japanese and every size rule in the file header. Big billboards ("2127", "フジ") may stay as content but become line-art light.

## 3. Tower families and skyway towers

- District Meter tower families (`districtMeters.ts` `ConcentrationDistrict`, open-frame family on hero slots): switch their finishes to the mega material family (white frame, `megaSeam` lines at each crown/floor band, pale glass). Do not change slot logic, counts, growth or tests' semantics.
- Skyway lattice towers with glass domes/spheres (`src/skyways.ts` `RINGS`/`SPHERES`): white members, a `megaSeam` ring at each deck, sphere glass pale with a seam equator — reads as engineered stations, not 2020s observation towers.

## Budget, tests, captures

- No new draw calls beyond +4 (material changes should be free). Hero ≥ 60 FPS.
- Tests: update colour/finish asserts that pin old beige values; never weaken structural/Meter asserts.
- Captures `artifacts/city-taste-v2/P3/rN/`: `hero-h16.png`, `hero-h21.png`, `vs-target.jpg` (integration-tip h16 | rN h16 | target), `close-facade.png` (a mid-rise at ~150 m, e.g. Aqua City), `close-holo.png` (2–3 holograms at ~120 m). FPS day/night (vsync 1920×1080 `data-fps`, discard first, median ≥5).
- `npm test && npm run build && git diff --check`; commit, push `feat/city-taste-v2-p3`, stop servers, report (commit hash + FPS first).
