# Street network stage 3 — designed water

Owner-approved 2026-11-04 before code; as-built deltas in §7. Owner decisions it follows: sketch v2 (`~/city2127-evidence/road-redesign/sketch-v2.png`:
"水景 A: Fuji frame 底中庭水池（舊大道位，地面而家空）", "水景 B: 舊大道帶改做線形水道公園", "假水池全部移除"). Metres, world x/z (+z south);
④ offsets are left of the route (north-west in the south-west reach). Measurements come from the stage 2 production raster
(`~/city2127-evidence/road-net-stage2/spec/raster-after.json`, 1 m, 4.5 m ray). Plan drawings: `~/city2127-evidence/road-net-stage3/spec/`
(`plan-all.png`, `plan-sw.png`; blue = proposal, light blue = the shader water that goes; scripts `plan3.mts`, `prop.mts`, `look.mjs`).

## 1. Remove the shader water

- `odaibaScene.ts` landscape shader: the swale ponds, the corridor channel and their white rims go (the lawn there turns to plain grass).
  The ivory gravel walks stay (they are not water). `CORRIDOR_GLSL` goes.
- The grove lattice stays as it is: `coastalCanopy` keeps its swale/corridor fields for placing groves and for the surveyed-tree filter,
  so no cluster, court or tower moves (the lattice is order dependent). The former pond sites read as lawn clearings between groves.
  Comments say the fields now only shape the groves.

## 2. Pool A — court pool under the Fuji frame

- Where: the frame's ground court between its two wings and south of the forum foyer, on the old band. Clear lawn there spans
  x −17 … 64, z 95 … 145 (wings at x ≤ −20 and ≥ 67, foyer glazing at z ≤ 93, rear foundations at the corners only).
- Shape: a stadium (long axis east–west, as sketched), centre (22, 118), 70 × 24 m: 10 m off each wing, 13 m off the foyer, 27 m north of ④'s
  terrace. Water surface 0.35 m below grade with a 1 m white stone coping flush with the lawn (the 2127 "engineered edge"), dark
  reflective water (the shader pond finish: roughness .06, metalness .35), a lit inner lip at night like ④'s terrace riser.
- Not seen from the hero pose (under the frame, behind the forum); seen in the B close and wide frames and from the forum ring.

## 3. Canal B — linear canal park on the old band

- Where: the old band strip between ④ and Grand Nikko (≈ 45 m of lawn from ④'s terrace at 13 m to Grand Nikko's kept forecourt), all
  `onFormerStreet`. The sketch draws a sliver on the south-east side; the old band lies mostly north-west of ④, so the canal goes there.
- Shape: water 8 m wide, centred 30 m left of ④ (offset 26 … 34 m), from ④ d 4 (the south-west district edge) to d 210 (≈ (−130, 178),
  22 m short of automation bay 3 and 45 m short of the sphere's feet); square ends. Same section as the pool (0.35 m down, 1 m coping,
  lit lip at night). The rest of the strip stays lawn: groves already keep off `onFormerStreet`, so the canal reads as a park line along ④.
- Crossing: ④'s light bridge at d 124 (Grand Nikko south ↔ south park) continues as a 4 m flush deck over the canal to Grand Nikko's side.
- Surveyed ground trees standing in the canal or pool are hidden in place (as on the street kit).

## 4. Code

One small module (e.g. `src/waterGarden.ts`): pool and canal from the outlines above (pool stadium, canal = ④ offset band from `routes()`),
water + coping + lip meshes, one batch per finish, added in `loadOdaiba` next to `streetNetwork`; an `inWater(x, z, margin)` test that
`plantCanopy` (surveyed ground trees) uses like `onStreetKit`. Shader lines removed in `odaibaScene.ts`; `CORRIDOR_GLSL` removed from
`coastalCanopy.ts`. `PUBLIC_LINK_BRIDGES` stay unchanged. No new dependency.

## 5. Review poses (day `hour=13`, night `hour=21`)

- Hero: default page (the removed ponds are the visible change).
- Pool: `review=street&cam=22,45,175&at=22,0,118` (from over ④, under the frame's south edge).
- Canal: `review=street&cam=-170,70,320&at=30,0,165` (stage 2 wide pose) and `review=street&cam=-260,30,330&at=-150,0,210`.

## 6. Checks

- `npm test`: pool and canal footprints (+2 m) clear of every solid (landmarks, Fuji chassis, piers, kit planters, Meter pieces) and of
  walker, doorway and street routes; no surveyed tree stands in water; ④ and the U unchanged; existing grove/court tests unchanged.
- `npm run build`, `git diff --check`; captures in `~/city2127-evidence/road-net-stage3/`; hero FPS with `fps.sh` vs stage 2.

## 7. As built (2026-11-04)

- `WATER` in layout.ts; `waterGarden` in streetKit.ts (added by `streetNetwork`): pool stadium 70 × 24 m outer at (22, 118); canal water 26 … 34 m
  left of ④ with 1 m copings, coping top y 0.05, water y −0.30, coping slabs 0.6 m deep; lit seams (`seamLight`) on the inner coping edges and
  the bridge edges. The water mesh receives no shadow (the lawn's shadow caster still stands over it; only its colour pass is cut).
- **Canal ends at ④ d 200, not 210**: automation bay 3's plinth is 48 × 36 m (scale 2), and at d 210 it came within 0.6 m of the water; at d 200
  it keeps 6.4 m. Length 196 m.
- Ground cut: `openBay` discards every ground finish (landscape, road, sidewalk, road marking, plaza, service area) over the water (`waterGLSL`,
  0.05 m past the water edge); only the first four still discard the seaward bay.
- Surveyed trees within 4 m of water or coping are hidden in place (`inWater` in `plantCanopy`, all trees). The grove lattice is unchanged;
  no grove terrace or trunk lands in the water (test).
- The odaiba test checks: nothing solid lower than 6 m over the water and coping +2 m; Meter pods, towers, courts, pavilions and sites, surveyed
  trunks and grove terraces, and guideway / sweep / promenade / deck / street routes all keep off it; the four water-garden meshes exist.
