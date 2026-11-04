# SW COMMONS PLAZA — diagnosis (closeup-night prep, 2026-11-04)

Builder `src/siteBuilders/commonsPlaza.ts` (`buildCommonsPlaza`), `changeSites.sw` (−105, 60), w 12 × d 10 units, h 5, scale 4 → plaza disc r 5 units ≈ 20 m, roof ≈ 20 m. States come from `layout.sharedSeats` (8 instanced seats on a 3.1-unit ring): −1 all screened (dark curved screens), 0 half, +1 all shared (screens fold flat). Q2 `commons-2127`.

Evidence: `poses/focal-sheet.jpg` (current `sw:focal`), `poses/cand-sheet.jpg`, `poses/cand2-sheet.jpg`, `baseline/sheet.jpg` (day), `baseline/sheet-night.jpg`.

| # | Symptom | Cause |
| --- | --- | --- |
| D1 | −1/0/+1 nearly identical from any pose; only the dark seat screens change | The only Meter carrier is 8 small instanced seats (seat 1.35 × .34 units) inside a fixed white pavilion; the plaza, roof, columns and planting never change |
| D2 | −1 "private pods" read as dark navy blocks, not rooms | `commons-curved-screens` use `dark`; no interior, no light, no people |
| D3 | No residents at all in any state | Builder has no people (NW/SE added people in their polish) |
| D4 | Old taste: plain white gazebo with a glass skylight; no technology signature, no Meter pink except tiny `pink` arcs | Pre–city-taste-v2 design (`arc` + `trim` columns + `membrane` roof) |
| D5 | `sw:focal` looks down from ≈30° over 93 m; background is the plaza deck / city, subject ≈20% of frame | `SHOTS['sw:focal']` y 64 from the south-west-ish side looking north |
| D6 | Night: nothing inside lights up; screens vanish into dark | No emissive interior; `publicLight` ring only |

## Pose

- **Chosen `sw:n`** = position `[-95, 30, -15]` → target `[-105, 10, 60]` (≈78 m, pitch ≈15°, looking south). Sky and inlet water behind the pavilion, lot outline fully in frame, pavilion ≈35% of frame width, room above for a taller +1. All three states framed. Neighbour facades sit at both frame edges (fixed, acceptable).
- `sw:focal-low`: **not needed** — the −1 state has the same footprint as 0/+1.

Rejected:

- current `sw:focal` `[-120,64,152]` → `[-105,10,60]`: too high (≈30°), city deck behind, subject small.
- `e` `[-25,30,45]` and `se` `[-45,28,135]`: camera inside / behind the east neighbour buildings (frame is a wall).
- `nw` `[-150,30,-5]`: a guideway rail crosses the lower third of the frame.
- `n2` `[-100,26,5]`: subject ≈55% wide, lot outline cut; no room to grow. Keep as a possible push-in if the redesign stays the same size.

## Owner decisions needed

- Size: the lot is boxed in by neighbour buildings east and west (≈48×40 m); growing beyond the lot means moving neighbours. Expect "crops follow the city" unless the targets grow upward (canopy / membrane roof) rather than outward.
- The SW Meter today only changes seats; a target with pods vs. amphitheatre means a builder rewrite (like NW R1), not a tweak.
