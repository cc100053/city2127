# Project contract and implementation map

Plan 02 implementation status and next work: [進度與待辦](PLAN02.md).

## Current direction

Plan 02 supersedes the painted civic-model direction. The primary reference is [Pic 2](../asset/pic2.png): monumental integrated architecture, a vertical city, authored efficient movement, maintained ceramic/composite/metal surfaces, restrained glazing and daylight. Do not copy the image's UFOs, vegetation or literal geometry. Preserve one Shibuya intersection, landmark relationships, ground crossing endpoints, seeded construction, WebGL 2 and the state machine.

The first vertical slice adds QFRONT/MAGNET upper occupied links, open public floors, two elevated pedestrian routes with terminal lifts, roof-supported express infrastructure, a lower perimeter corridor, and environmental filtration membranes. Conventional trees and 2026 prop clutter are removed. Ground traffic and visible pedestrian counts are reduced. This is still a geometric prototype; the documentary-photograph acceptance criterion is not yet met.

The initial handoff proposed WebGPU references/fallbacks. The actual implementation uses **WebGL 2**, Three.js `WebGLRenderer`, Vite and TypeScript. Do not describe it as a WebGPU implementation or migrate renderers incidentally.

Plan 01 replaces the generic four blocks with a compressed Shibuya layout: QFRONT to the northwest, a future MAGNET / air station to the northeast, western commercial blocks, and Hachiko plaza beside a low station mass to the southeast. This is a reference-based blockout, not a surveyed reconstruction. See [SHIBUYA.md](SHIBUYA.md).

Desktop-only presentation: the user explicitly excludes responsive/mobile work (2026-09-17). Keep a fixed desktop composition and ordinary renderer resize handling; do not add adaptive framing or mobile layouts.

## Behavior to preserve

| Input/state | Presentation |
| --- | --- |
| `0` / neutral | Daylight, medium activity, no ground glyph |
| `1` / pulse | Cool daylight, window waves, stronger signage and relatively higher activity |
| `2` / still | Warm morning, sparse steady windows, stronger environmental membranes and fewer actors |

- Both keyboard and buttons select states. Selecting the current target is a no-op.
- A choice interpolates the ten WorldState values over **10 seconds**, with smoothstep easing and exact preset values at completion.
- At completion, immediately show `JUDGMENT: YOU CHOSE PULSE TOKYO` or `JUDGMENT: YOU CHOSE STILL TOKYO`. Neutral has no verdict.
- Hold state selection for another **4 seconds**. Movement and window animation continue throughout; “frozen” means the street structure and temporary state lock, not paused animation.
- Ignore selection during transition/hold. At 14 seconds another choice is allowed. The verdict remains until the next selection.
- Buildings, footprints, seed and camera remain identical between states. Preallocate geometry; vary material/light parameters and existing actor transforms instead of rebuilding.

`src/presets.ts` is the numeric source of truth; do not duplicate the preset table in another module. Its fields are `timeOfDay`, `neon`, `traffic`, `crowd`, `signage`, `greenery`, `haze`, `windowLife`, `glyph`, `warmth`. Legacy numeric presets remain unchanged to preserve interpolation and activity mapping. `timeOfDay` no longer drives the sun; UI labels explicitly present Daylight/Pulse at noon and Still at 09:00.

## Source ownership

| File | Responsibility / change here for |
| --- | --- |
| `src/main.ts` | Startup, renderer, lighting/fog, render loop, resize, GPU error message and diagnostics |
| `src/cityRig.ts` | Seeded street kit, tower/shop/kiosk/glyph factories, static material batching, windows, engineered ecology and upper infrastructure |
| `src/layout.ts` | Shared Shibuya roads, crossing endpoints, landmark footprints, public routes, upper links and relocated dock |
| `src/mobility.ts` | Actor geometry and instancing, street timing, pedestrian poses, aircraft curves, delivery choreography and local navigation |
| `src/presets.ts` | State names, WorldState type, numeric presets |
| `src/worldState.ts` | Selection gate, transition, hold and verdict state; independent of DOM/rendering |
| `src/heroCamera.ts` | Initial camera; `HERO_POSITION` `(34,34,76)`, `HERO_TARGET` `(-3,17,-1)`, FOV 46°, far 320, shared with the orbit target. `main.ts` attaches OrbitControls (commit 5ad7dd0, 2026-09-17) with distance 45–180 and polar limits; screenshots use the untouched initial pose |
| `src/overlay.ts` | Keyboard/buttons, state labels, progress and accessible judgment text |
| `src/style.css` | Fixed desktop overlay layout and typography; legacy responsive rules are not acceptance targets |
| `tests/worldState.test.ts` | State timing, locking, repeated selection and neutral reset |
| `tests/mobility.test.ts` | Street phase separation, walking-cycle continuity and sampled wing/building clearance, delivery continuity and guide wraparound |

Frame flow: `main` advances `worldState` → updates lighting → calls `cityRig.update(state,time)` → rig updates materials/windows/environmental membranes and calls mobility → overlay renders status → composer renders the scene. One clock drives all motion; the state lock does not stop that clock.

## Geometry and motion conventions

- The ground plate is 150×140 and the road arms run to ±70–75 so neither edge appears from the hero pose; fog closes the distance. Cars still use only the central ±24 of the east–west road.
- Coordinates are meter-like art units, Y-up, ground near Y=0. Street seed is `2127`. Since 2026-09-17 the camera has OrbitControls around the initial hero pose; comparison screenshots must be taken without moving it.
- Static architecture is transformed to world space and merged by material. Geometries must have compatible attributes/indexing; the static merge normalizes to non-indexed geometry. Source factory groups are removed after batching, so editing those groups afterwards will not move rendered buildings.
- Windows and moving actors use `InstancedMesh`; update instance matrices/colors and mark them dirty. Avoid constructing geometry or materials every frame.
- Pools: 6 cars, 24 pedestrians (12 ground / 12 public-route slots), 48 legs, 7 thin-wing aircraft, 7 cargo pods, one lift and two receiving doors, plus 12 authored public-transfer platforms. Six aircraft circulate; one courier performs the delivery cycle. Visibility varies smoothly with presets. Pool capacity is not the visible count.
- Street motion is an authored 30-second cycle, not a traffic simulation. Cars move in the early part; pedestrians cross in the later part and reverse direction on the next cycle. Check at least two cycles when changing it. Five shared painted crossing paths include the QFRONT–Hachiko diagonal; all waiting positions are off the road. Cars currently use only the east–west road; the other arms are deliberately unserved in this prototype.
- Circulation routes are a closed southern loop around 32 units high and an open express curve around 66–67, above the new landmark roofs. Open-route aircraft fade at endpoints. A 32-second delivery cycle approaches the station at Y=15, berths at X=15, Z=-15.2, transfers cargo out to Z=-12.5 during seconds 10–12, lowers it during 12–18, departs during 20–29 and returns the empty lift during 22–30. `DOCK` and `deliveryMotion` are shared by aircraft/cargo/lift/doors; do not give those objects independent clocks.
- Air guides are preallocated segments illuminated only near active aircraft. Street segments respond to car and pedestrian movement; neither system rebuilds geometry. Still keeps fewer circulating aircraft but retains the single delivery service.
- Building-clearance envelopes derive from `layout.ts` landmark dimensions plus conservative roof/awning allowances in `tests/mobility.test.ts`. Update these allowances when changing the factories; never shrink test envelopes merely to pass a collision failure.

## Rendering budget and limits

Shared static materials are three finishes on one `MeshStandardMaterial` shader: matte ceramic composite (cream/trim/teal/sage/pink, roughness ≈.45–.58, metalness ≤.05), refined metal (`solar`, roughness .3, metalness .85) and reflective glass (`dark`, roughness .16, metalness .7). The pavement has its own matte `ground` material. Every window floor gets one sun-shade fin per face from `windows()`, the tower ribbons and QFRONT floors likewise, so facade depth comes from shadow rather than per-window geometry. Environment intensity is .6, exposure .9, sun 3.0 base, hemisphere 1.05 base. The sky is a 150-unit gradient dome (`ShaderMaterial`, back side, no fog) that follows the camera each frame; its horizon uniform is the state background colour that fog and the floor also use, and its zenith is a deeper per-state tone. A seeded ring of 60 hazed blocks at radius 125–165, outside the ground plate, forms a distant skyline; its one material is tinted per state and never receives shadows from the sun. Use architectural PBR, one precomputed RoomEnvironment reflection map, ACES tone mapping, mild bloom and one shadow-casting directional light. A small unshadowed berth light activates only near a docking courier. Current composer is RenderPass → UnrealBloomPass → OutputPass. Do not add another tone-map/output conversion or stack SSAO/SSR on top. Device pixel ratio is capped at 1.5; the target is roughly 60 FPS on a laptop at 1080p, subject to measurement.

No external models, backend, auth or persistence. Google Fonts is the only external runtime asset source; CSS has system-font fallbacks. Time is based on `performance.now()`, so hidden-tab pauses can advance motion/transition state when resumed. This is a presentation demo, without physics, pathfinding or user-controlled landing (delivery is authored choreography). Full GPU-resource teardown for repeated in-page scene recreation is not implemented; normal initialization happens once per page.

## References and handoff

See [README.md](../README.md) for the authorized visual and Three.js references. Plan 02 replaces the playroom visual family with precise architectural surfaces. Only the three named Linegel skills were used as references; do not install their whole catalog. Prior skills were read from temporary clones outside the repository, so do not assume those paths or installations survive another session.

`artifacts/neutral.png`, `pulse.png`, `still.png` document version 1. `artifacts/future-neutral.png`, `future-pulse.png`, `future-still.png` document version 2. Version-3 captures use `air-commons-*.png`. Screenshots establish appearance at capture time, not a deterministic animation frame or performance proof.

## Plan 02 public circulation

`publicRoutes` links QFRONT to the station at Y=8–10, and Dogenzaka to Center-gai at Y=6–9. Mesh decks and walkers share these centerlines. Corner plates close joins. `publicJourney` gives a 48-second one-way journey: 15% origin lift, 70% walk, 15% destination lift; the following journey reverses continuously. Ground actors retain the original five crossings and 30-second traffic phase. Public actors operate independently above cars. Small moving platforms accompany vertical travel; there is no capacity scheduling, cabin simulation or agent avoidance. Platforms are authored visual proxies, not a production lift system.

`upperLinks` in `layout.ts` lists every occupied volume above the landmark footprints: the solid QFRONT/MAGNET link at Y=39, an open colonnade commons floor at Y=24 spanning the same cores over the north road, the QFRONT crown and hung west wing that form one bracket off the twin cores, and the MAGNET east wing on two ground columns beside its mid-block collar. Each entry names the landmark cores it bears on (`on`) and any ground columns; `cityRig` builds them by `kind` (`link`, `floor`, `wing`). None has separately simulated walkers. Two paired sky rails follow the shared air curves 1.3 units below aircraft, with 2.8-unit lateral clearance. Express portals rise from the QFRONT and MAGNET roofs; perimeter supports land at the western and station blocks. Aircraft remain authored, with endpoint fades. The lower MAGNET station and cargo choreography retain their original Y=15 opening.

Tests sample public journey continuity, terminal coordinates, cargo separation and every upper volume against air routes, the courier column and public walkers, and require each volume to overlap its named cores by 1.5 units and stay under their roof height, with columns off the road polygons. Conservative landmark envelopes still check all circulating aircraft. Tests do not prove exact rail/pylon mesh collision, actor-to-actor avoidance, interior occupancy or photoreal appearance. No geometry/material is allocated per frame; route distances and reflection maps are prepared once.
