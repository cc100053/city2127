# 軌道升降機中距離近景 LOD — spec

Targets: `target/target-day.png` (Gemini day-1), `target/target-night.png` (night-1), owner pick 2026-11-02.
Owner: **position unchanged** — the base keeps sinking behind the horizon by the existing curvature; the targets' column foot standing in the sea is a Gemini error, not followed.

Pose E1: camera (676, 120, 1339), target (3130, 620, 6200), fov 42, 1600×900. Frame top at the tether ≈ world y 3280; bottom of the visible column ≈ horizon.
Units: world metres, same frame as `spaceElevator.ts` (root at `SPACE_ELEVATOR`, y = height before curvature drop of ≈ 476 m).

## R1 — near model only (no explore wiring yet)

### Architecture (Q1)

- New export in `src/spaceElevator.ts`: `spaceElevatorNear(scene)` returns `{ root, setActive(on: boolean), update(now: number, dark: number) }`. It builds nothing until the first `setActive(true)` (lazy). While active, the far R6 root is hidden and the near root shown; inactive restores R6 exactly (hero unchanged).
- Easiest wiring: `spaceElevator(scene)` keeps returning the far root; `spaceElevatorNear(scene, far)` takes the far root to toggle its `visible`.
- DEV only, in `main.ts` beside `cityPose`: `cityElevatorNear(on: boolean)` and URL `?elevatorNear` (applies on load). Calls `update(now, dark)` from the frame loop while active.

### Materials (name each; all `fog: false`, all through `curveBeyondPlate`)

Exp² fog would erase anything at 5.5 km, so the near model does its own haze like R6, but with real light:

- `nearBody`: `MeshStandardMaterial` colour `#e8e4dc`, roughness .7, metalness .1. Lit by the scene sun/ambient/environment (receives no shadows, casts none).
- `nearDark`: same, colour `#6f7882` (recessed channels, spoke undersides, window band backing).
- `nearGlass`: `MeshStandardMaterial` `#8fa3b4`, roughness .3 (day window bands); emissive `#ffcf8a` × night (continuous warm bands at night).
- `nearMint`: `MeshBasicMaterial` `#8ce5d8` — collar bands and bay dashes; day: blended toward `nearBody` 60% (pale mint, visible as in target-day); night: full × 1.6 (HDR for bloom).
- `nearBeacon`: `MeshBasicMaterial` `#ff4a3a`, only at night (day = body colour).
- `nearGreen`: `MeshStandardMaterial` `#4f6b45` terrace planting.
- Haze: one `onBeforeCompile` like R6 `shaded()`, mixing the final colour toward the scene fog colour by height: `mix(c, fog, .15 + .7*(1 - smoothstep(150, 900, vHeight)))` so the lower column dissolves into the horizon haze (targets) and the station keeps contrast. Uniform shared, updated in `update()` from `scene.fog.color`.

### Parts (keep R6 sizes and positions)

1. **Column** `cyl(300, 360, 1080)`, 32 segments, `nearBody`. 12 vertical recessed channels: boxes 40 × 900 × 16, `nearDark`, at r = 330 (rotated to the surface), y 80–980.
2. **Collars** at y 400, 700, 950: `cyl(385, 385, 50)` `nearBody` + a mint band `cyl(388, 388, 12, open)` at the collar's mid height.
3. **Hub** under D1: flared `cyl(560, 380, 160)` at y 990 `nearBody`; mint band at y 960.
4. **Radial spokes** under D1: 20 deep box beams 940 × 60 × 40 from r 380 to r 1320, top flush with D1's underside (y 1060), angled 6° down toward the hub; `nearDark` undersides read through lighting, so `nearBody` is fine.
5. **Decks** (R6 radii): D1 `cyl(1400, 1320, 180)` y 1150; D2 `cyl(1080, 1040, 160)` y 1320; D3 `cyl(740, 700, 140)` y 1470; cap `cyl(440, 500, 70)` y 1575. 48 segments.
   - Each of D1–D3: a continuous recessed window band = an inset `nearGlass` cylinder (radius − 8) 45% of the deck height, plus a thin `nearBody` lip above and below (`cyl(r+6, r+6, 10)`), so the band reads recessed.
   - Terraces: on D1's top ring (r 1100–1380) and D2's top ring (r 800–1060), ~40 instanced planting clumps (`IcosahedronGeometry(28, 0)`, scaled y .6, `nearGreen`) in an uneven ring.
6. **Docking bays**: 16 around D1's lower edge (R6 count): bay box 100 × 40 × 70 at r 1420 y 1060 (under the rim, `nearDark`), a parked craft (slim box 90 × 18 × 34 + a `nearGlass` canopy 40 × 10 × 24 on top) sticking out to r 1495. One mint dash 30 × 6 × 6 per bay under the rim lip, plus 32 more evenly between (48 dashes total, night read in target-night).
7. **Cap**: 6 masts `cyl(4, 4, 90)` at r 300 on the cap top, a red `nearBeacon` box 12 × 12 × 12 on each tip.
8. **Tether**: sleeve `cyl(140, 150, tether − 1080)` `nearBody`; joint rings every 300 m from 1500: `cyl(178, 178, 30)` `nearBody` + `cyl(181, 181, 8, open)` `nearMint`. Two guide rails 40 × length × 40 at ±90° from the camera line (R6 `toCam`), `nearDark`.
9. **Climbers** (3, animated): slender capsule `CapsuleGeometry(60, 260, 4, 12)` `nearBody`, a `nearGlass` window band `cyl(62, 62, 180, 12, open)`, a mint clamp ring `cyl(70, 70, 14, 12, open)` at each end, mounted on the camera-side rail line at r 230. Heights loop: each climbs 1650 → 3400 in 40 s, phase-offset by a third; hidden above 3400 (out of frame) and below 1650 (inside the station). `update(now)` moves them. Separate small group (not baked).

Batch everything static with `bake` (≤ 8 batches). `frustumCulled = false`, no shadows.

### Day / night

`update(now, dark)`: `dark` is main.ts's darkness (0 day … 1 night).
- Day: glass emissive 0; mint = lerp(body, mint, .4); beacons = body colour.
- Night: glass emissive `#ffcf8a` × .9 × dark; mint × 1.6 HDR; beacons on; body stays lit by the scene's night ambient (dark navy, target-night).

### Tests (`tests/spaceElevator.test.ts`)

- Near model not built before `setActive(true)`; after it, the far root is hidden; `setActive(false)` restores it.
- Near batches ≤ 8, none cast shadows.
- Climber heights stay within 1650–3400 for sampled `now`.
- Existing far tests unchanged.

### Screenshots `r1/`

`?hour=14&elevatorNear` and `?hour=21&elevatorNear` at E1 via `cityPose`, 1600×900 → `r1/day.png`, `r1/night.png`, plus `r1/vs-target.jpg` (2×2: target-day, r1 day, target-night, r1 night, each 800×450). Hero `?hour=14` without the flag → `r1/hero-check.png` (must equal the R6 look).

## R2 (later) — explore wiring

Explore target `space-elevator` (survey protocol, `exploreService`, guest buttons 空の環を見る / 軌道エレベーターを見る), pose E1 as `EXPLORE_SHOTS.elevator`, three caption steps, one craft flying into a bay. Spec written after R1 is accepted.
