# NW close-up polish — spec

Targets (owner-picked 2026-11-03): [flagship-low](target/flagship-low.jpg), [flagship-mixed](target/flagship-mixed.jpg), [flagship-high](target/flagship-high.jpg). Bay targets (owner-picked 2026-11-03): [bay-low](target/bay-low.jpg), [bay-mixed](target/bay-mixed.jpg), [bay-high](target/bay-high.jpg). Taste: [CITY MASTER TASTE](../../docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md). SE golden sample for patterns: `src/siteBuilders/concentrationTower.ts`, [SE handoff](../../docs/handoffs/se-closeup-polish.md).

Units: site-local units; `changeSites.nw` has `scale: 3` (1 unit = 3 m), lot 8×7 units centred (40, −300). Front = local +Z unless noted; the new camera looks from the east (+X world), so camera-facing faces are local **+X** (verify by capture and rotate the composition if needed — the glazed staffed face and counters must face the camera).

## R1 — flagship (AUTO HUB, `src/siteBuilders/automationHub.ts`)

### Shared

- **Material `automationBlue`** (new, in `automationHub.ts` or next to `amber` if shared): `MeshStandardMaterial({ color: METER_COLORS.automation, emissive: METER_COLORS.automation, emissiveIntensity: .9, roughness: .5 })` — the only saturated accent; never via `publicLight` × instance colour (goes white at night).
- Structure: `trim` (white metal) and `cream`; no `teal`, no `dark` panels, no glass grid boxes. Cool technology light: `futureLight` (emitters, terminals). Warm occupied rooms: emissive warm backing (reuse SE's `warm` if exported, else a local `warm` like SE's) behind `trim` mullions — not `glass` (glass mirrors the sky blue).
- Lot outline marker (`createGuestMarker`) unchanged.
- Old pieces retired: teal box, glass bands, roof arcs/solar stubs, `sign(...)` text (no letters in the target), the six old `hub-automated-port-*`/`hub-human-counter-*` slots in their current form (see Runtime), and the GLB/procedural glass `hubUpper` cylinder.

### State −1 `low` — open civic service hall (target flagship-low)

- Plinth `cream` 9.4 × .4 × 8.2 (may overhang the 8×7 lot by ≤ .7 per side; check `tests/odaiba.test.ts` clearances).
- Hall: `trim` slab box 9 × 3.6 × 7 on the plinth (≈ 11 m tall); roof slab `trim` 9.8 × .35 × 7.8 overhanging; a shallow dished roof disc (`cream` cylinder r 2.6, .05 high) on top.
- Camera-facing long face fully glazed: warm emissive backing panel + 6 `trim` mullions (.08 wide) + `trim` transom; the other three faces solid `trim` with one thin `futureLight` seam at 2/3 height.
- Inside, visible through the glazing: 6 counters (`cream` desk .9 × .4 × .4 + warm screen), staff behind each and one seated resident in front (use `pedestrians()` / `servicePose` / `conversationPose` from `mobility.ts` like the current runtime).
- Forecourt on the camera side (outside the hall, on the plinth): 3 benches (`trim`), 2 small trees (existing tree helper used by SE, e.g. the one `concentrationTower.ts` uses), 8–12 residents standing/talking in small groups.
- **Hovering canopy** (the technology signature): lens-shaped disc — `CylinderGeometry` r 5.2 bottom 4.6, h .45, `trim` — at y = roof + 1.6 (clear visible gap), rim seam torus r 5.2 `automationBlue`, 4 under-emitters (`futureLight` discs r .35, plus a soft additive cone or bright disc beneath each) at radius 3.2; 2 idle drones parked on its top edge (reuse the district `serviceDrones` mesh/geometry if simple, else a small low-poly drone of 4 rotor discs + body). Gentle bob ±.08 units, period 6 s; still under `prefersReducedMotion`.

### State 0 `mixed` — compact hall + automated service column (target flagship-mixed)

- Compact hall `trim` 5.5 × 3.6 × 5.5, glazed on the camera face; inside, left half: 3 staffed counters with staff + residents (warm), right half: 3 self-service terminals (`futureLight` screens on `trim` posts), 1–2 residents using them.
- Service column from the hall roof centre: `trim` core cylinder r .75 to y = 24 (≈ 72 m), with 2 vertical `futureLight` seams; at y 16.5, 19, 21.5 three docking rings (torus r 1.9 tube .28 `trim`) each with an inner `automationBlue` seam torus (r 1.9, tube .07) and 2 docked drones; a mid "joint" collar at y ≈ 9 with an `automationBlue` band.
- Robotic arm on the hall roof: base disc + 2 `trim` box segments (2.2 and 1.8 long) + small parcel box (`cream`), reaching from the column toward the roof edge above the counters. Slow cycle (lift/lower, 8 s), still under reduced motion.

### State +1 `high` — autonomous service spire (target flagship-high)

- No hall, no staff. Base drum `trim` r 2.4 h 3 with one arched portal on the camera side (a maglev pod stub: `trim` capsule 1.4 × .8 × .8 half inside the portal, `futureLight` nose strip). 4 self-service terminals (`futureLight` screen on a `trim` post) around the foot, 4–6 residents using/walking.
- Core `trim` cylinder r 1.3 from y 3 to y 36 (≈ 108 m); cap: stepped `trim` cylinders r 1.1 → .7 to y 38.5, 2 thin antennas to y 40.5, two small `futureLight` windows.
- 14 docking rings from y 5 to y 34.5 (pitch ≈ 2.25): each a `trim` torus/flat ring r 2.1, thickness .45, plus an `automationBlue` seam (thin torus r 2.12 tube .06) on its outer edge. Every 2nd ring carries 1 service arm (2 `trim` segments + parcel, angle varied per ring) and 2 docked drones.
- Drone formation: 12–16 drones in 3 V/arc streams spiralling into the upper rings (radius 4–7 units, period 20 s), reduced motion = parked on rings.
- Night: ring seams + windows glow; no extra lights.

### Transition (3 s, `SITE_TRANSITION_SECONDS` unchanged)

- Spire rings stack up floor by floor from the drum (per-ring staggered rise, like SE's tower); removal top-down.
- Column rises from the hall roof; rings slide up it after the core.
- Low hall ↔ compact hall: hall sinks into the plinth / rises; the canopy disc descends onto / lifts off the roof (it's hovering — make that the read).
- Keep the `rise`/`sink` layer semantics working; band changes driven by `AutomationHubRuntime.setTarget` (it receives `target.band`). The three state groups may live in `hubBase` and be shown by the runtime per band (as SE's `concentrationTower.ts` does); `hubNeutralProps` keeps people/props; `hubUpper` becomes procedural (`kind: 'procedural'`, no `assetId`) and may hold the spire or stay empty. Leave the GLB file and its `assetCatalog.ts` entry in place; remove only the load from this site. Update `tests/changeCatalog.test.ts`, `tests/cityChangeManager.test.ts` (`hubUpperPreparations`), `tests/automationHub.test.ts` to the new structure — no assertion deleted without a replacement that checks the same intent (podium support for people, no clipping, diagnostics port counts → map `targetAutomatedPorts` to the state honestly or replace with band-level diagnostics).

### Camera

- `SHOTS['nw:focal']` → `{ position: [192, 44, -338], target: [40, 54, -300] }` (Opus pick, east pose: sea + sky behind). Tune ±10 so −1 hall fills ≈ 30–40 % of frame width and +1 spire top stays in frame; report final values. `nw:district` unchanged.

### Budget and checks

- Site visible meshes ≤ current + 20 % per state (report low/mixed/high counts like SE). Use `bake()` / instancing for repeated rings, drones, people.
- `npm test && npm run build && git diff --check` must pass.

### Screenshots (playwright-cli, 1600×900, HUD hidden — hide every non-canvas element)

Evidence folder `~/city2127-evidence/nw-closeup-polish/r1/`: `nw-focal-{low,mixed,high}-day.png` (`?meters=nw:<band>&shot=nw:focal&hour=12`), same at `hour=22` (`-night`), one mid-transition (`?meters=nw:low&metersTo=nw:high&metersAge=…` at ≈ 1.5 s into the change; see `main.ts`), and `vs-target.jpg` (3 rows low/mixed/high × [r1 day | target], 800×450 cells). Publish only `vs-target.jpg` with `node scripts/publish-evidence.mjs nw-closeup-polish/r1 <path>`.

## R2 — district bays (`AutomationDistrict`, `src/districtMeters.ts`)

Units here are **metres** (district carriers are unscaled). Bays sit 22 m off the promenades; their yaw faces along the route. Review pose `nw:bay-e` = `cityPose([-10,40,-90],[75,32,-160])` (bay 10 at (75, −160)); captures use `?meters=nw:<band>&hour=12` then that `cityPose`.

Language: the bays are small siblings of the R1 flagship — same materials (`trim`/`cream` white, warm emissive backing behind `trim` mullions, `futureLight` emitters, the shared **`automationBlue`** Meter accent: if R1 defined it locally in `automationHub.ts`, move it to one export both files import). No `solar` slate/navy, no `glass` capsule people, no sphere-dome roof.

### Staffed pavilion (replaces domed hall and stacked-deck hall; target bay-low)

- Ground-level hall `trim` 22 × 9 × 15 (L × H × D) on a 24 × .5 × 18 `cream` plinth; roof slab 24 × .5 × 17 overhang. Route-facing long side fully glazed (warm backing + `trim` mullions every 2.7 m); the other faces solid with one `futureLight` seam.
- Inside: 4 warm counters with staff and seated residents (instanced low-poly people that suit an InstancedMesh; e.g. capsule torso + sphere head in `cream`/`trim` with instance-free materials — no `glass` people).
- Front: 3 benches, 2 planters with small shrubs.
- Hovering canopy disc: lens cylinder r 13 → 11.5, h 1.2, `trim`, at roof + 3.5 m gap; `automationBlue` rim torus; 4 `futureLight` under-emitters. Two design families stay (`staffedDesign` 0/1) for variety: 0 = round canopy disc, 1 = elongated (scale x 1.35, z .8) canopy — no other differences.
- Ground footprint must stay clear of guideway/promenade/sweep routes (run the route-blocking and clearance checks in `tests/odaiba.test.ts` / `tests/districtMeters.test.ts`; if a bay fails, shrink or rotate that design, do not delete the test).

### Hybrid (bay at mixed; target bay-mixed)

- Staffed pavilion at 60 % (as now) **plus** a service column from its roof centre to 40 m: `trim` core r 1.2, three docking rings (r 3.2, tube .45 `trim` + `automationBlue` inner seam) at 28, 32.5, 37 m, one docked drone, a short 2-segment robot arm with parcel on the roof. This replaces showing the full autonomous design on hybrid bays; keep `SlotLevels` logic, add one instanced set for the column and update `write()`, `writeDrones()` dock positions and `getConfiguration()` (its ponytail comment says it mirrors `write()`).

### Autonomous tower (replaces drone port and charging mast; target bay-high)

- Slim white ring tower ≈ 45 m: base drum `trim` r 3.2 h 4; core r 1.4 to 42 m; cap to 45 m with antenna; 8 docking rings r 3, tube .5 `trim` + `automationBlue` seam, from 10 m to 40 m; service arm every 2nd ring. Two design families (`autonomousDesign` 0/1): 0 = as described; 1 = 6 rings and a floating landing disc (r 6, `trim`, `automationBlue` rim) hovering 1.5 m above a 34 m core top.
- Foot: light locker (`trim` box 3 × 2.4 × 1.2 with `automationBlue` emissive face) where residents collect parcels. No staff.
- Service drones (`serviceDrones`, `pavilionFlight`) dock at the new ring/disc positions (update `writeDrones` x/y).

### Transition and runtime

- Keep the existing 3 s clocks, `SlotLevels`, ladder/hybrid/changedPoints/pulses logic and diagnostics names (`automation-staffed-pavilions`, `automation-drone-ports` instanced names stay — tests look them up). Rise from the foot as now; rings may stay part of the same instanced scale (no per-ring stagger needed in R2).
- Keep `PORT_DECK` export if anything imports it; otherwise update its users.

### Checks and captures

- `npm test && npm run build && git diff --check`. Draw calls: report the instanced mesh count before/after (`AutomationDistrict.root` children); keep it within +4.
- Evidence `~/city2127-evidence/nw-closeup-polish/r2/`: `nw-bay-{low,mixed,high}-day.png`, `-night` (hour 22), one `nw:district` capture per band, the existing `nw:bay1` headline shot at high, and `vs-target.jpg` (3 rows × [r2 | bay target], 800×450). Publish only `vs-target.jpg` to `nw-closeup-polish/r2`.

## R3 — bays at target size (owner 2026-11-03: 「放大到目標圖咁大」)

R2 bays are metre-true (hall 22 m) and fill ≈ 15 % of the `nw:bay-e` review frame; the targets show ≈ 35 %. Scale every bay design (staffed pavilion + canopy, hybrid column, both autonomous towers, docked drones) **uniformly by 2×** about its foot: one constant (e.g. `BAY_SCALE = 2`) applied in `write()` / `writeDrones()` instance matrices, so geometry code stays in R2 metres. People inside keep reading as people at 2× (they are part of the batch — acceptable; if they look giant against promenade walkers in captures, keep the people batch at 1× and only scale the architecture).

Placement: the 2× plinth (48 × 36 m) and 90 m tower must still pass every clearance/route test in `tests/odaiba.test.ts` and `tests/districtMeters.test.ts`. Fix failures in this order: (1) push the bay further from its promenade (the constructor's 22 m offset → whatever clears, per bay if needed), (2) rotate the bay, (3) shrink that one bay's scale to the largest that clears (not below 1.5×). Do not drop bays: `SHOTS['nw:bayN']` and the coverage table in `src/headlineCamera.ts` are keyed by bay index. If a bay moves, update its `nw:bayN` shot so the bay is in frame (check one capture per moved bay). Never delete a clearance assertion; widen sample grids to the new footprint instead.

Captures `~/city2127-evidence/nw-closeup-polish/r3/`: `nw-bay-{low,mixed,high}-day.png` at `nw:bay-e`, `nw-district-{low,high}-day.png`, the hero view `?meters=nw:high&hour=12` and `?meters=nw:low&hour=12` (no shot param) to check the bays don't dominate the hero, one `nw:bayN` per moved bay, `vs-target.jpg` (3 rows × [r3 | bay target]) → publish to `nw-closeup-polish/r3`. Report per-bay final position/scale, the frame share at `nw:bay-e`, and checks.

## R4 — flagship at target size, rubric items (owner 2026-11-03: 「放大到目標」)

Judged against [rubric.md](rubric.md) items `fl-*`, `fm-*`, `fh-*` (judge 1: 13 × 1, `fh-base` 2; [scores](judge1/scores.md)). Review pose is the target's: `cityPose([192,44,-338],[40,54,-300])`, 12:00. Sizes below are **frame fractions at that pose** (x left→right, y top→bottom, measured on 1600×900 from the targets vs judge-1 captures); local units are the means, the frame numbers are the acceptance.

### Size (owner decision: match the target)

| State | Part | Judge 1 | Target | Change |
| --- | --- | --- | --- | --- |
| low | hall camera face | x .44–.56, roof y .82, floor y .96 | x .37–.77, roof y .65, floor y .93 | whole low group uniform ×2 about the plinth centre (people, benches, trees and canopy included, so people read like the target's); then lengthen the hall along the camera-facing axis until the face spans ≈ .37–.77 |
| low | canopy | x .46–.56, y ≈ .76 | x .40–.71, y .56–.62 | follows the ×2 group; radius to match the target span |
| mixed | hall | x .45–.57, top y .75 | x .43–.56, top y .71 | hall ×1.2 |
| mixed | column | core ≈ 2.3 % wide, top y .32 | core ≈ 4 % wide, top beyond frame, three rings at y .05–.20 | core radius ×1.7; top ≈ `SPIRE_TOP`; the three docking rings move up with it |
| high | rings | ≈ 7.6 % wide | ≈ 9.3 % wide, top at y 0 | ring radius ×1.2; height unchanged |

Lot and neighbours: the ×2 low plinth outgrows the 8×7 lot. Grow it toward open ground; the amber outline (`createGuestMarker`) follows the new plinth. Fix clearance failures in this order: shift the low group's centre, rotate, then reduce the extra lengthening (never the ×2). If the target size still collides with a neighbour, a route or a clearance test, stop and report the blocker with options; do not shrink quietly, do not delete a test.

### Rubric fixes

- `fl-material`: no `cream` masses and no teal seam on the low hall; `trim` white, seams `futureLight` thin or `automationBlue`.
- `fl-glazing`: roof slab overhangs the glazing clearly on the camera side (≥ 8 % of hall depth).
- `fl-people-in`: staff stand behind counters, residents sit across, ≥ 6 readable through the glass.
- `fl-canopy`: lens profile (thicker centre, ≥ 2× the current height), blue rim, 4 bright under-emitters with a visible glow disc each.
- `fm-arm`: articulated arm — base, shoulder joint (sphere), two segments, wrist, gripper holding a `cream` parcel; spans ≥ ¼ of the hall width.
- `fm-column`: panel joints (thin dark-trim rings every ≈ 2 units), two vertical `automationBlue` seams, a mid collar band with blue seam.
- `fm-rings`: three rings with blue seams and ≥ 2 docked drones each.
- `fh-rings`: gaps between rings ≤ ring thickness (thicker rings or more rings — up to 18 in the same height); core gets panel joints like `fm-column`.
- `fh-arms`: ≥ 4 arms readable from the pose, each with a parcel.
- `fh-drones`: drones read as quad-rotor bodies, not puffs (check material/size at this distance; the white district drone mesh is fine if it reads).
- `fh-cap`: 2 antennas and small lit windows on the cap, visible at the pose.

### Checks and captures

`npm test && npm run build && git diff --check`. Report site visible meshes per state and the final low plinth footprint. Evidence `~/city2127-evidence/nw-closeup-polish/r4/`: `flagship-{low,mixed,high}.png` at 3200×1800 at the review pose (HUD hidden, same method as judge 1), plus `nw:focal`/`nw:focal-low` day captures per state to check the live headline shots still frame the site, and `vs-target.jpg` (3 rows × [r4 | target], 800×450). Publish only `vs-target.jpg` to `nw-closeup-polish/r4`. Do not judge; Opus runs the blind judge.

## R5 — flagship detail to the rubric (owner 2026-11-03: 「開 R5」)

Base: R4b (e368748). Same review pose and capture method as R4; lot stays 16×24 (no geometry growth). Aim at every flagship item below 2 in [r4/scores](r4/scores.md); `fm-column` and `fh-arms` (2) must not regress. Compare against the target crops in your captures, not against this text alone.

### Low hall (`fl-*`)

- **Interior depth** (`fl-glazing`, `fl-material`): the warm field is a flat opaque panel at the glass line. Replace with a room: glass plane (thin, slightly transparent or simply open between mullions) at the face, warm emissive **back wall set ≥ 3 units behind it**, warm ceiling strip, floor; counters stand inside between them so the room reads deep. The back wall is less saturated than now (warm white-peach, not orange) and partly covered by counters/screens so it is not one flat field.
- **Overhang** (`fl-glazing`): roof slab projects ≥ 1.2 pre-scale units past the glazing on the camera side, with a visible shadow band under it.
- **People inside** (`fl-people-in`): ≥ 6 readable — staff standing behind counters facing out, residents seated across facing in; counters are low desks with cool screens, set back from the glass.
- **Forecourt** (`fl-forecourt`): 2–3 small trees and 3 benches inside the forecourt (not only at its edges); residents in 3–4 tight groups (2–4 people each, facing each other); the amber outline stays visible along the forecourt edge.
- **Canopy** (`fl-canopy`): blue rim seam thin (≈ ⅓ current tube), 4 under-emitter **pads** (bright flat discs with a soft glow disc) instead of light cones.

### Mixed (`fm-*`)

- `fm-hall`: same room treatment as low; one side a staffed counter with ≥ 3 people (staff + residents), other side ≥ 2 glowing kiosks with a resident each.
- `fm-arm`: parcel larger (≈ 2× now) in an amber/orange-cream colour that reads against white; gripper visible.
- `fm-rings`: rings get docking detail — a flat deck on top, small bay notches/pads, drones sitting in them (≥ 2 per ring visible from the pose).

### High (`fh-*`)

- `fh-rings`: blue seams thin (≈ ⅓ current), panelled core between rings (vertical panel lines + small windows), like `fm-column`.
- `fh-drones`: ≥ 10 small quad-rotor drones readable in streams near the upper tower at the review pose (scale them so a drone is ≈ 0.4–0.6 % of frame width); no glowing blobs.
- `fh-base`: the pod sits on a visible maglev track (two rails or a guide beam) running out of the portal across the plaza; keep terminals, residents, outline.
- `fh-cap`: antennas and 3–4 lit windows inside the frame at the review pose (cap windows at y ≈ .05–.12); trim the core top slightly if needed, keeping ring widths.

### Checks and captures

`npm test && npm run build && git diff --check`; mesh budgets hold. Evidence `~/city2127-evidence/nw-closeup-polish/r5/`: `flagship-{low,mixed,high}.png` at 3200×1800 at the review pose, `nw:focal`/`nw:focal-low` 1600×900 per band, one night capture (hour 22) of low and high at the review pose, `vs-target.jpg` → publish to `nw-closeup-polish/r5`. Do not judge.

## R6 — warm rooms, emitters, drones, arms (owner 2026-11-03: 「開 R6」)

Base: R5 (55a808e). Same pose, captures and lot. Aim at the 1-score items in [r5/scores](r5/scores.md); every 2-score item must stay 2 (`fl-people-in`, `fl-forecourt`, `fm-arm`, `fm-column`, `fh-rings`, `fh-base`, `fh-cap`).

- **Warm rooms** (`fl-glazing`, `fm-hall`, `fl-material`): the interior must glow like the target — warm amber-orange light (`warm`-family emissive, intensity high enough to read brighter than the white shell in daylight), not a matte peach/beige wall. Light the back wall, ceiling strip and floor emissively with a gradient (brighter ceiling, deeper back); keep the screens but make them small cool accents on the counters, not a row of teal stripes across the wall. **Night (hour 22): the rooms glow** — today the low hall interior goes dark; fix the material/lighting path so both halls read lit at night (check how SE's `warm` stays lit at night).
- **Canopy emitters** (`fl-canopy`): 4 emitters that read as light sources from the review pose: a bright white-blue core disc on the canopy underside plus a short soft beam/glow below each (like the target's four bright spots). They must be visible from the pose — check they are not hidden behind the roof or seen edge-on.
- **Docked drones** (`fm-rings`): drones on the mixed rings read as drones — a body plus 4 rotor discs, seen from below/side; place them on the ring rim where the pose sees them, ≥ 2 per ring. Add 2–3 arriving in the air near the rings.
- **Flying drones** (`fh-drones`): ≥ 10 individually readable quad drones near the upper tower, crisp (not blurred blobs): enough size/contrast against sky (white body with a dark rotor ring or blue light), spaced so they don't merge. Hub drones only; city traffic doesn't count.
- **Arms with parcels** (`fh-arms`): ≥ 6 arms with amber parcels visible from the pose (camera side or silhouetted at the tower edges), parcels large enough to read.

Checks/captures as R5 into `~/city2127-evidence/nw-closeup-polish/r6/` (including night low/mixed/high), publish `vs-target.jpg` to `nw-closeup-polish/r6`. Do not judge.

## R7 — last four flagship items (owner 2026-11-03: 「開 R7」)

Base: R6 (3681080). Same pose, captures and lot. Targets: `fl-glazing`, `fl-material`, `fl-canopy`, `fm-rings` from [r6/scores](r6/scores.md); the other 10 items must stay 2 (re-crop them and compare against `~/city2127-evidence/nw-closeup-polish/r6/crops/` before reporting).

- **Soft warm room, not an orange wall** (`fl-glazing`, `fl-material`; apply the same tone to the mixed hall without losing `fm-hall`): look at the target crop — a pale warm-white room lit from above, warm only near the lights, the glass reading as glass. Lower the interior's saturation and emissive (cream-white walls with a warm ceiling glow and warm pools on the floor; the deepest tone peach, never saturated orange). Add a faint cool glass plane across the glazing (slight sky reflection / low-opacity tint) so the room reads behind glass. Night must still glow warm (check night captures).
- **Roof overhang reads** (`fl-glazing`): the low roof slab is a thin white plate (not a box) projecting clearly past the glazing on the camera side and both ends, with a dark shadow line under its edge, like the target's cantilever. Thin the box-like parapet.
- **Emitters as discrete pads** (`fl-canopy`): remove the large translucent cyan cones and glow spheres. Four small bright white-blue pads/bulbs on the canopy underside, each with at most a small soft halo; the gap between canopy and roof stays clear and readable.
- **Hollow docking rings** (`fm-rings`): the mixed rings become open rings like the target — a torus/annulus with a visible hole around the column (a gap between ring and core bridged by 3–4 thin spokes), an inner track/rail ring, blue seam on the outer edge, docked drones on the rim.

Checks/captures as R6 into `~/city2127-evidence/nw-closeup-polish/r7/` (day ×3, night ×3, focal shots); publish `vs-target.jpg` to `nw-closeup-polish/r7`. Do not judge.

## R8 — night warmth, room contrast, outline, emitters (owner 2026-11-03: 「再開 R8」)

Base: R7 (c0bc45e). Same pose, captures and lot. Judged by absolute scores **and** blind pairwise R7 vs R8 (skill step 7); R8 must win more items than it loses.

- **Night warmth back** (`fl-glazing`, `fm-hall` at hour 22): R7 night rooms read grey-white. Restore R6-level warm glow at night (amber ceiling cove and back wall clearly lit) while keeping R7's soft day tone — e.g. drive the room emissive from the site's day/night signal (see how other lit windows/`warm` respond to the night rig) rather than one fixed value. Night low and mixed must read warm-lit at a glance.
- **Day room contrast** (`fl-glazing`, `fl-material`): R7's day interior nearly matches the white shell. Target: a warm-white room clearly warmer and slightly brighter than the shell, peach near the floor, no saturated orange. Middle ground between R6 and R7: raise warmth/emissive moderately, keep the gradient.
- **Amber outline in frame** (`fl-forecourt`): R7's hall trim moved the outline out of the crop's front edge; make the amber edge visible along the forecourt's front at the review pose (the plinth inlay strip or outline marker), without moving the hall.
- **Canopy emitters** (`fl-canopy`): judges split between R6 cones and R7 bulbs. Target: four discrete bright spots flush under the lens with a short soft glow beneath (not hanging spheres, not large cones). Make the bulbs flush/flattened pads with a small downward glow cone (short, low opacity).

Do not touch the high state or the mixed column/arm/rings. Captures into `~/city2127-evidence/nw-closeup-polish/r8/` (day ×3, night ×3, focal shots); publish `vs-target.jpg` to `nw-closeup-polish/r8`. Do not judge.

## R9 — last four flagship items (owner 2026-11-03: 「開 R9」)

Base: R8 (ab7f8bc). Same pose, captures, lot and judging (absolute + blind pairwise R8 vs R9). Targets from [r8/scores](r8/scores.md); keep every other item and the R8 night warmth.

- **Deep cantilever, recessed glass** (`fl-glazing`): the target's roof is a thin white slab projecting well past a glass line set back under it. Set the low hall's glazing (mullions + glass + room front) back ≥ 1.2 pre-scale units from the slab's front edge so a deep shaded soffit shows between slab edge and glass; slab edge stays thin. Lighter mullions (thinner, fewer — ≈ 4–5 bays across) so the room reads as a hall interior, not a lit panel. Keep the people readable.
- **Clean up under the canopy and at the right** (`fl-material`): remove or hide the dark blue striped column visible in the canopy gap at the review pose (find what it is — canopy mast/stalk or a neighbour — and make it white/thin or drop it if the canopy is meant to hover free), and find the beige box at the hall's right side in the crop (likely an existing neighbour or a hub prop); if it belongs to the hub make it white, if it is a neighbour leave it and report.
- **Parcels to scale** (`fh-arms`): parcels on the +1 arms ≈ ⅓ of their current size (target-sized), still amber; keep ≥ 6 arms visible.
- **Drone streams in the air** (`fh-drones`): ≥ 12 small hub drones airborne in 2–3 visible streams near the upper tower against the sky at the review pose (not docked, not behind the tower); the oversized teal city flyers are not ours — if a hub drone class is oversized, shrink it to the stream size.

Captures into `~/city2127-evidence/nw-closeup-polish/r9/` (day ×3, night ×3, focal shots); publish `vs-target.jpg` to `nw-closeup-polish/r9`. Do not judge.

## Bay R1 — district bays to the rubric (task 2026-11-03, after the owner accepted the flagship at R9)

Base: 8f352d1. Code: `AutomationDistrict` in `src/districtMeters.ts` (bay frame: +X along the route, **+Z towards the route**; built in R2 metres, scaled by `BAY_SCALE` 2 about the foot). Judged on rubric items `bl-*`, `bm-*`, `bh-*` ([rubric](rubric.md); judge 1 scored 7/20, [scores](judge1/scores.md), [board](judge1/review-bay.jpg)) by an absolute blind judge **and** a blind pairwise vs judge 1's captures. Review pose `nw:bay-e`: `?meters=nw:<band>&hour=12`, then `window.cityPose([-10,40,-90],[75,32,-160])`, hide every non-canvas body child, 3200×1800. The review bay is the plaza bay at (75, −166), yaw 0: the camera sees its **+Z long face and its −X end**, from above (camera y 40 m ≈ canopy height).

Language = the owner-accepted flagship (`src/siteBuilders/automationHub.ts` R9): its `white` structure, warm night-lit room (`roomLight`/`nightLit()` pattern, `glassPane`, `shade` soffit), `amberInlay` lot edge, amber `parcel`, `quadFleet` drones, articulated arm. Move what the bays reuse into one export both files import (e.g. export from `automationHub.ts` or move to `cityRig.ts`; do not duplicate materials). No `cream` masses, no `futureLight` teal stripes, no `pink` people torsos on the bay.

### Shared

- **Material**: every `cream`/`trim` structural part of the bays → `white`; seams only thin `automationBlue`. Remove the three `futureLight` stripes on the hall (`FLOOR + 6.4` boxes).
- **People at architecture scale**: build bay residents at 1 (drop `k = 1 / BAY_SCALE`), so they scale ×2 with the bay like the flagship's 2.6× people (≈ 3.4 m tall against an 11 m glazed storey, the target's proportion). Bodies in muted mixed colours (reuse what the flagship people use, or 3–4 instance-free materials), heads skin/cream.
- **Amber lot edge**: an `amberInlay` strip (≈ .35 wide, flush on the plinth top) along every plinth edge, as the targets show around each bay.

### −1 staffed pavilion (`bl-*`; target bay-low)

- `bl-glazing`: the camera sees the +Z face foreshortened and the −X end square-on. Glaze **the +Z long face and both end faces** (corner piers only, back −Z wall solid). Glazing runs floor to just under a **thin roof slab** that overhangs ≈ 1.5 m on the glazed sides with a dark `shade` soffit line; remove the 3.4 m solid fascia above the glass. Behind the glass a warm room like the flagship low hall: warm back wall, ceiling glow, floor pool (`nightLit` so it glows at night), faint `glassPane`, 4–5 thin `white` mullions per face. Inside, ≥ 8 readable people: staff standing behind 3–4 counters, residents seated/standing across, plus 1–2 visible through the −X end.
- `bl-forecourt`: shrink the hall's depth (e.g. ZB −8 → ZF 2) so a ≥ 6 m (pre-scale) forecourt opens on the +Z side inside the existing 24 × 18 plinth (the plinth must not grow: clearance). On it: 3 benches, 2–3 small trees (the flagship forecourt trees), **≥ 8 residents standing in 3 groups** facing each other, the amber edge visible along its front.
- `bl-canopy`: thicker lens (centre ≥ 2.4 thick, rim tapered) hovering **≈ 1.5–2 m** (pre-scale) above the roof slab (lower `CANOPY_Y` and the dock heights with it). The camera is above the canopy, so under-emitters are invisible today: hang **4–6 emitter pods at the rim** (r ≈ 11–12), each a bright white-blue flattened pad/bulb protruding below the rim with a small soft glow, readable from above. Thin `automationBlue` rim seam.
- `bl-material`: pure white, thin seams, no beige, no teal.

### 0 hybrid (`bm-*`; target bay-mixed)

- `bm-hall`: the 60 % hall gets the same glazed, warm, peopled room (glazing on +Z and both ends), ≥ 4 readable people at a staffed counter **and ≥ 2 glowing self-service terminals** (cool screens on white posts) with a resident at one. Amber edge on its plinth.
- `bm-arm`: replace the two-bar arm with the flagship-style articulated arm — dark base disc, sphere joints (`rotorMat`-like dark), two white segments, wrist and gripper holding an amber `parcel`; place it on the roof on the **camera side** of the column (local −X/+Z quadrant), ≥ ¼ of the hall width.
- `bm-column`: panel joints (thin dark rings every ≈ 2.5 m), two vertical `automationBlue` seams, a collar band with blue seam where it leaves the roof; three docking rings with blue seams, a stepped cap and a **spire/antenna on top**. At the review pose the spire tip must be **inside the frame (y ≈ .03–.08)** and the rings between y ≈ .15–.40 — today the column leaves the top of the frame; shorten the column/rings to fit (measure from the capture).

### +1 autonomous tower (`bh-*`; target bay-high)

- `bh-rings`: design 0 → **12 rings** from ≈ 12 m to 40 m, gap ≤ ring thickness (thickness ≈ 1.2, pitch ≈ 2.4), each with a thin blue seam; core with panel joints/vertical seams between rings; stepped cap + antennas. Design 1 → **10 rings** at the same pitch under its landing disc. Top in frame at the review pose.
- `bh-drones`: per bay **≥ 8 quad drones** (`quadFleet`, sized like the flagship stream drones) circling/hovering around the upper tower at ring radius + 3–8 m, in 2 loose streams, visible only with the tower (scale by tower level like `writeDrones`); still under `prefersReducedMotion` (parked on rings). Keep the existing per-bay service drone.
- `bh-base`: replace the plain drum with a **glazed lobby box** (≈ 10 × 5 × 8 m pre-scale) lit cool blue inside (`automationBlue`-tinted room, `nightLit`), 3–4 glowing terminals at the front, the parcel locker, ≥ 4 residents on foot outside, amber edge. A palm tree stands in front of the review bay's base today: find its source; if it is a city tree inside this bay's plinth, shrink it in place to 0 the way `HUB_LEGACY_LOT` does for the hub (never re-filter the list — later crowns would shift); if moving or hiding it needs a test change or touches a neighbour, stop and report.

### Constraints and checks

- Plinth footprints, bay positions and scales stay as R3 (route/clearance tests in `tests/odaiba.test.ts`, `tests/districtMeters.test.ts`). Never delete or loosen an assertion; if a target item needs more room, stop and report with options.
- Keep diagnostics names (`automation-staffed-pavilions`, `automation-hybrid-columns`, `automation-drone-ports`), `SlotLevels`/ladder logic, `dock()`/`writeDrones()` and `getConfiguration()` consistent with the new heights.
- Report `AutomationDistrict.root` child count before/after (now 22 instanced + drones + pulses); stay within +8.
- `npm test && npm run build && git diff --check`.

### Captures (`~/city2127-evidence/nw-closeup-polish/bay-r1/`)

`bay-{low,mixed,high}.png` (day, review pose, 3200×1800), `bay-{low,mixed,high}-night.png` (hour 22), `district-{low,high}.png` (`?meters=nw:<band>&shot=nw:district&hour=12`, 1600×900) and one hero `?meters=nw:high&hour=12` 1600×900 to check the bays don't dominate. `vs-target.jpg`: 3 rows × [bay-r1 day | target], 1200×675 cells. Do not crop or judge — Opus does.

## Bay R2 — warmth, floating canopy, column (owner 2026-11-03: 「Align crops, keep size」)

Base: Bay R1 (58d023b). Bay size, positions and camera stay. Judging now crops the capture at the `capture [...]` rectangles in [rubric.md](rubric.md) (the target keeps its own rectangle): **every subject must stay inside its capture rectangle** at `nw:bay-e` — check by cropping your captures with those rectangles. Bay R1 re-judged on those crops: **16 / 20** ([bay-r1/scores-aligned.md](bay-r1/scores-aligned.md)); below 2 are `bl-glazing`, `bm-hall` (interior not warm), `bl-canopy` (emitters do not glow), `bm-column` (plain tube, blunt top). Judging: absolute + blind pairwise vs Bay R1; R2 must win more items than it loses.

**Do not change** the forecourt, materials, robot arm, ring tower, drones or lobby (all scored 2); re-crop them from your captures and compare with `~/city2127-evidence/nw-closeup-polish/bay-r1/` before reporting. Look at the targets (`artifacts/nw-closeup-polish/target/bay-*.jpg`) beside your captures.

### Warm halls (`bl-glazing`, `bm-hall`)

- The target's interior is a clearly amber-orange glowing room, warmer and brighter than the white shell; ours reads pale peach/white by day. Use the flagship low hall's day values (`automationHub.ts` R8/R9 room materials: back wall, ceiling cove, floor pool) or stronger; keep the `nightLit` warmth at night. Floor, back wall and ceiling must read warm across the whole glazed width, in both the −1 hall and the hybrid's 60 % hall.
- Staff **seated** behind the counters (the target shows seated staff facing residents), residents across; ≥ 10 readable people in the −1 hall, ≥ 5 in the hybrid hall, not hidden behind mullions/terminals.

### Floating canopy with glowing emitters (`bl-canopy`)

- Today it sits almost on the roof and overhangs past the hall front, reading as a thin tilted plate. Target: a lens about **¾ of the roof's width**, centred over the roof, a **clear gap ≈ 3 m pre-scale** (roof visible under it from the camera), thicker centre, thin blue rim.
- Emitters: 4 bright white-blue pads under the lens near the rim, each with a small **additive glow halo** (sprite or emissive disc) that reads as a light source from above at the review pose — at least 3 visibly glowing in the capture. Update `CANOPY_Y` and the dock heights; the canopy must stay inside `bl-canopy` capture [.25,.57,.63,.72].

### Column (`bm-column`)

- Core radius ≈ 1.4× today; panel joints and 2 blue seams kept; 2 small window/hatch **modules** between the rings (target: panelled modules with small windows).
- **Thicker docking rings** (tube ≥ .8 pre-scale, flat deck on top, bright blue seam on the outer edge); 4 rings if they fit, else 3.
- A **long needle spire** (≥ ¼ of the column height) above a stepped cap, tip at y ≈ .07–.10 of the frame (inside capture [.38,.05,.52,.78]). Keep the arm's position and look relative to the column.

### Checks

`npm test && npm run build && git diff --check`; root children ≤ 32 (R1: 30). Evidence `~/city2127-evidence/nw-closeup-polish/bay-r2/`: `bay-{low,mixed,high}.png` day 3200×1800 at the review pose, `-night` (hour 22), `district-{low,high}.png`, `vs-target.jpg` (3 rows × [bay-r2 | target], 1200×675 cells). Do not judge.

## Bay R3 — lit room, crisp lens (last round before the 3-round report)

Base: Bay R2 (4092b62). Same pose, captures, capture rectangles and judging (absolute + blind pairwise R2 vs R3). R2: 19/20 ([scores](bay-r2/scores.md), [pair](bay-r2/pair.md)). Not passed: `bl-canopy` (1) and `bl-glazing` (2, but the blind pairwise preferred R1's softer interior). Judges also called the R2 interiors "flat paint" and the column's blue window squares "toy-like". Change only the items below; every other item must stay as R2 (re-crop and compare with `bay-r2/`).

- **Lit room, not paint** (`bl-glazing`, also the hybrid hall for `bm-hall`): the target room is lit — bright warm-white ceiling cove/strip lights, warm light pools on a paler floor, back wall graded from peach-amber low to warm cream high, counters and people reading as darker shapes against it. Replace the uniform orange with that gradient (vertex colour or 2–3 materials), between R1's peach and R2's orange in saturation; add the visible ceiling light strips. Night stays warm (`nightLit`).
- **Crisp lens** (`bl-canopy`): the lens must read thick from the review camera — a visible white side band (rim thickness ≥ .8 pre-scale, centre ≥ 2.6) with the thin blue seam on that band, a slightly domed top. Emitters: 3–4 **crisp** pods: a small bright white-blue disc (pod body visible as a white housing) with a tight halo no wider than ~1.5× the pod, below the rim where the camera sees them; no wide soft bloom blobs. Stay inside capture [.25,.57,.63,.72].
- **Column windows** (`bm-column`, low risk): replace the blue squares with white panel modules carrying small dark-glass windows with a thin blue edge; keep the spire, rings and seams.

Checks/captures as R2 into `~/city2127-evidence/nw-closeup-polish/bay-r3/` (day ×3, night ×3, district low/high, `vs-target.jpg`). Do not judge.
