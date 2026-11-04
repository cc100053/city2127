# Street kit close-up spec

Rubric: [rubric.md](rubric.md). Units are metres (the kit works in metres; offsets are left of the route, `n` = up × tangent).
Everything stays behind DEV `?roadKit`; production (no `?roadKit`) must render exactly as before.

## R1

### A — light-guided shared avenue (`avenueStreet`, `streetKitPreview`)

- **Carriageway ≈ 7 m** (owner 2026-11-04). Preview carriage `[-7.6, -0.5]` (right edge unchanged, clear of the Yurikamome piers).
  Street cars must drive centred in the two new lanes: add a DEV override for road 1, e.g. `useKitCarriageway()` in `src/mobility.ts`
  that swaps `CARRIAGEWAY[1]` to `{centre:-4.05, half:3.55, lane:1.75}` before `mobility()` builds (called from `odaibaScene` only when
  `roadKit`). Production values and `tests/*` stay as they are. If cars, crossers or stop lines read the old constant elsewhere, route
  them through the same override. Check visually that car bodies keep ≥ 0.3 m from planter rims.
- **Lines** (`a-carriage`): keep the edge seams and the lane line; 0.14 m wide, continuous, cool blue-white. Remove the raised metal edge
  band's visual bulk: keep it ≤ 0.2 m wide, white `metal`, so the planter rim reads as the edge.
- **Planters at the edge** (`a-planters`, `a-far-verge`): stadium beds of width 4.2 m, rim 0.35 m thick, 0.5 m tall, inner rim face
  starting 0.35 m beyond each carriageway edge (no paving strip between road and rim). Length 20 m, gap 5 m, skip within 6 m of a
  crossing. Right verge: same beds between the guideway piers, ≥ 0.5 m clear of each pier (find the piers in the environment or the
  guideway data; do not guess). Footway (`footway`) runs from the outer rim to the existing reach (≥ 4 m on the plaza side).
- **Dense leafy shrubs**: replace the sphere rows. Each bed is filled edge to edge with ≥ 3 rows, sizes varied 0.6–1.3 m, overlapping,
  plus a second shape: a low-poly leafy/fern clump (e.g. 5–7 flattened, tilted cones or octahedra fanned from one point, one
  `InstancedMesh`, `leaf`-family greens, two or three tints). Mix ≈ 50/50 with the existing `plantShrubs` shrubs. 2 broadleaf trees
  per bed rising from it. One draw per shape for the whole kit.
- **Rings** (`a-rings`): one per bed over its road-side end, radius 2.0 m (≈ bed width), 2.6 m above the bed top, tube 0.16 m,
  lit inner seam (`seamLight`), halo plane 5 × 5 m just over the shrubs.
- **Crossing** (`a-crossing`): a light-panel crossing must be in the review frame at about screen y 0.65–0.8 (find `d` by projecting the
  avenue with the review camera). Under `?roadKit` move road 1's `CROSSINGS` entry there with the same override mechanism so real
  crossers use it and cars stop for it; panels 1.2 m square, 0.25 m gaps, two rows, spanning the full 7 m. The old d 286 crossing panels
  go if they are no longer a crossing.
- **People** (`a-footway`): if the walking crowd does not put ≥ 3 people on the visible footway at capture time, add 4–6 static demo
  people (reuse the existing pedestrian mesh/factory) on the plaza-side footway and 2 waiting at the crossing, DEV preview only.

### B — maglev guide-channel boulevard (`boulevardStreet`)

- **One channel per carriageway** (`b-channels`): each 7 m carriageway (1.5 … 8.5) gets a single recessed channel centred at 5.0,
  2.3 m wide, new material `channel` (MeshStandard, cool blue-grey `#9fb2c6`, roughness .35, metalness .3) so it reads darker than the
  ceramic; two lit lines inside at ±0.75 (`railLight`, 0.12 m), lit edge lines at 1.65 and 8.35 (`seamLight`, 0.1 m). Remove the second
  lane, the metal channel lips and the translucent field fins (they read as railway track).
- **Median** (`b-median`): continuous raised planter 3.0 m wide, rim 0.35 m, 0.55 m tall, beds 24 m with 3 m gaps; slim cypress trees
  every 6 m: new instanced crown (low-poly elongated shape, e.g. icosahedron detail 1 scaled (1, 3.4, 1), radius ≈ 0.9 m → ≈ 6 m tall
  crown on a 1 m trunk), two greens; dense leafy shrub mix as in A below them.
- **Terrace** (`b-terrace`): keep the 0.3 m step and lit lip. Outer planter: one continuous white-rimmed bed per side, 2.4 m wide,
  gaps only at crossings, dense leafy shrub mix.
- **Lamp blades** (`b-blades`): base 0.7 m wide, tip 0.3 m, depth 0.45 m, 8.5 m tall, every 20 m along both terraces at the carriageway
  side of the planter; inner lit strip tube 0.1 m.
- **Demo pods** (`b-pods`, owner 2026-11-04): 4 static pods, reuse the street-car / pod mesh from `mobility.ts`, centred on the channels,
  2 per direction, hovering 0.15 m, all inside the close review frame. Preview only.
- **Light bridge** (`b-bridge`): put one crossing inside the close review frame (screen y 0.5–0.9). Deck from −8.5 to 8.5, 4 m deep,
  pale `crossing` material at the carriageway level; channel lines and edge lines draw on top of it (continuous across); terraces
  ramp or step down to it, planters break for it.

### Night (`updateStreetKit`)

- Seams and rails: day as now; night multiply to ≈ 4× so they bloom. Add a soft additive glow band (halo material, 0.7 m wide,
  `glowTexture` across its width) under every lit line, opacity 0 by day → .5 at night.
- Rings: halo pool opacity .3 day → .85 night.
- Lamp blades: a downward light pool per blade (additive `halo` plane 6 × 6 m on the carriageway/terrace below the blade tip), 0 by day →
  .6 at night.
- Crossing panels: emissive .6 day → 2.4 night.
- Light stays cool white-blue only; nothing warm or saturated.

### Camera and captures

Avenue `?roadKit&review=street&cam=-125,32,-5&at=-40,0,-55`, boulevard `cam=-45,24,212&at=0,0,168`, `hour=13` and `hour=21`.
3200 × 1800, names `avenue-day.png`, `avenue-night.png`, `boulevard-day.png`, `boulevard-night.png` in the round folder.

### Tests

`npm test` (no production behaviour change, so existing tests stand); add one small check if the carriageway override has logic beyond a
swap (e.g. production `CARRIAGEWAY[1]` unchanged after import).
