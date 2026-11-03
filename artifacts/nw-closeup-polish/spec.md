# NW close-up polish — spec

Targets (owner-picked 2026-11-03): [flagship-low](target/flagship-low.jpg), [flagship-mixed](target/flagship-mixed.jpg), [flagship-high](target/flagship-high.jpg). Bay targets: pending (Gemini r2). Taste: [CITY MASTER TASTE](../../docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md). SE golden sample for patterns: `src/siteBuilders/concentrationTower.ts`, [SE handoff](../../docs/handoffs/se-closeup-polish.md).

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

## R2 — district bays

Pending owner pick of `gen/bay2-*`.
