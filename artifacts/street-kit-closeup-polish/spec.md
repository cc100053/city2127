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

## R2

Aimed at the R1 items below 2 (judge evidence in `r1/judge/scores.md`). Owner's 7 m carriageway for A stands; the judge's "narrower than
the target" is Gemini's enlargement, not a spec item.

### Keep (scored 2 in R1; re-crop and compare with R1)

`an-seams`, `an-rings`, `an-crossing`, `b-pods`, `bn-rails`, `bn-blades`, `bn-planting`. Night line, ring and blade glow levels stay as R1
(the day changes below must not lower them).

### Shared planting (`a-planters`, `a-far-verge`, `b-median`, `b-terrace`)

R1 read as "sparse spheres and spiky tufts". Replace both shapes in `plantBeds` (stop calling `plantShrubs`; keep `plantCanopy` trees):

- **Leafy bush**: 3 lobes of `IcosahedronGeometry(.5, 0)` merged (offsets ≈ ±.3 m, one raised), vertices jittered ±12 % by `hash`, scaled
  y .75 — a faceted lumpy mound, never a sphere. One `InstancedMesh` `street-bushes`.
- **Broad-leaf clump**: 6–7 broad flat leaves fanned from one point (each an `OctahedronGeometry(.35)` scaled (1, .18, .5), pushed out .3 m,
  tilted up 25–45°), merged. One `InstancedMesh` `street-leaves`. Delete the cone fern geometry.
- **Density**: spacing .65 m along, rows = max(2, round(bed w / .85)), jitter ±.2 m both ways; 60 % bushes / 40 % clumps; size .7–1.5 m,
  mounded: scale × (1 + .45 × (1 − |q| / (w/2))) so the middle of each bed is higher. Greens: 4 tints, HSL h .22–.32, s .4–.55, l .24–.42
  (dark and light leaves side by side as in the target). Soil hidden: no bed patch wider than .4 m showing.
- Budget: report the total instance count; keep ≤ 10 000 across the kit.

### A avenue

- **`a-carriage` day lines**: lines must read as lit white-blue seams, not blue paint. Day colour pale (`#cfe8ff` family, brighter than the
  ceramic, low saturation) and `lineGlow` opacity ≈ .25 by day (night stays as R1). Edge seams move to `a + .2` / `b − .2` so they read as
  the carriageway's edges.
- **Planters** (`a-planters`, `a-far-verge`): bed width W 5.0 m (was 4.2), rim .45 m thick, .6 m tall. Inner rim face still starts .35 m
  beyond the carriageway edge. Keep piers clear (≥ .5 m). Right verge beds get the same fill and 2 broadleaf trees each.
- **Rings** (`a-rings`): radius 2.4 m, tube .28 m (white `metal`), lit inner seam tube .1 m; halo pool 6 × 6 m, day opacity .5. Add a light
  mist under each ring: open `CylinderGeometry(2.2, 2.2, 2.4, 32, 1, true)` between ring and shrubs, additive (`glows`), uv remapped so the
  glow texture fades at top and bottom (as `glowLine`), opacity .2 day → .55 night. One merged mesh for all mists.
- **Crossing** (`a-crossing`): one row of panels spanning the carriageway edge to edge: panels 1.0 m across × 2.8 m along, .3 m gaps, the
  outer panels .1 m from the edges. Material pale blue-white, emissive `#cfe8ff`, day intensity 1.1 (clearly brighter than the ceramic in
  sunlight), night as R1 or brighter.
- **Footway** (`a-footway`): large pale paving: give `footway` its own canvas texture (as `panelTexture`, base `#e8e3d8`, joints `#d2ccbf`
  2 px) tiled at 2.4 m squares. Make the metal edge flush (no 0.05 m raise), .15 m wide, so footway and carriageway read as one level.
- **`an-planting` warm light**: find the warm orange night bands on the Yurikamome guideway barrier in the avenue frame (grep the guideway /
  `yurikamome` builders and night materials) and under `?roadKit` only make them cool white-blue (`#cfe6ff`). Production unchanged.

### B boulevard

- **`b-channels`**: recess .18 m deep (was .06): floor `channel` at y − .18, walls 0.18 m tall in a new darker `channelWall`
  (`#6f8296`, roughness .5) so the camera-side wall is visible, a flush white `metal` lip .06 m wide along both top edges. Rails sit on
  the floor (y − .16), glow under them. Day lines as A (pale white-blue + day glow).
- **`b-median`**: one continuous raised run (`run`, 3.0 m wide, .55 m tall, rim .45) from d0 to d1, cut only at the bridges (±1.5 m),
  rounded/capped ends; cypresses every 6 m as R1; dense fill above.
- **`b-terrace` / `bn-lip`**: step .45 m (was .3; one constant, everything standing on the terrace follows). Lit lip: keep the top seam
  (widen to .14 m) and add a lit vertical strip .08 m tall on the riser face just under its top edge (`band` with `h`, `seamLight`), same
  runs; glow band in front of the riser on the carriageway. Riser face reads as a distinct step in the day capture.
- **`b-blades`**: a real tapered crescent: 9 m tall, base 1.1 m wide, tip .25 m, extrusion depth .7 m, curving to lean 2.6 m over the
  carriageway at the tip (strong curve in the top third), lit strip tube .12 m along the inner edge. Pools stay under the new tip.
- **`b-bridge`**: deck day emissive ≈ 1.0 (pale `#e8f4ff`), clearly brighter than the ceramic by day; lit seams along both deck edges
  across the whole street; lines over the deck stay continuous.

### Captures and checks

As R1, into `r2/`; `npm test && npm run build && git diff --check`. Production (no `?roadKit`) unchanged.
