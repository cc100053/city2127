# Project contract and implementation map

## Current direction

One painted Shibuya intersection spatial prototype in 2127 asks: **May a perfect future erase an imperfect past?** Keep painted surfaces, selective soft bevels, readable silhouettes, a pale ground pad, printed zebra crossings and bowl planters. Contrast warm rounded civic objects with thin, precise infrastructure rather than rounding everything. Avoid photoreal glass districts, gritty cyberpunk, disaster water and a second city.

The user accepted version 1 as a starting point, then requested a more futuristic city with people, cars, flying drones and aerial routes. Version 2 adds curved tower ribs, cantilever gardens, a rooftop skyport, solar canopies, docking markers, capsule cars, walking pedestrians and two drone corridors. These ambient actors are authorized; they are not interactive NPCs or a character-led game. The original empty Still crossing and particle-only crowd are no longer strict requirements: Still now retains sparse activity.

Version 3 was explicitly approved to strengthen the futuristic silhouette and behavior: a true open station floor separates the main tower volumes; thin-wing carriers replace quadrotors; one courier enters the berth, unloads onto a transfer lift, and delivers cargo into a street receiver. Local navigation lights replace permanent aerial rings and the old transit ribbon.

The initial handoff proposed WebGPU references/fallbacks. The actual implementation uses **WebGL 2**, Three.js `WebGLRenderer`, Vite and TypeScript. Do not describe it as a WebGPU implementation or migrate renderers incidentally.

Plan 01 replaces the generic four blocks with a compressed Shibuya layout: QFRONT to the northwest, a future MAGNET / air station to the northeast, western commercial blocks, and Hachiko plaza beside a low station mass to the southeast. This is a reference-based blockout, not a surveyed reconstruction. See [SHIBUYA.md](SHIBUYA.md).

Desktop-only presentation: the user explicitly excludes responsive/mobile work (2026-09-17). Keep a fixed desktop composition and ordinary renderer resize handling; do not add adaptive framing or mobile layouts.

## Behavior to preserve

| Input/state | Presentation |
| --- | --- |
| `0` / neutral | Dusk, medium activity, two irregular 2026 props, no ground glyph |
| `1` / pulse | Cool permanent night, window waves, stronger signage, busy street/air traffic |
| `2` / still | Warm permanent morning, sparse steady windows, more greenery, fewer actors |

- Both keyboard and buttons select states. Selecting the current target is a no-op.
- A choice interpolates the ten WorldState values over **10 seconds**, with smoothstep easing and exact preset values at completion.
- At completion, immediately show `JUDGMENT: YOU CHOSE PULSE TOKYO` or `JUDGMENT: YOU CHOSE STILL TOKYO`. Neutral has no verdict.
- Hold state selection for another **4 seconds**. Movement and window animation continue throughout; “frozen” means the street structure and temporary state lock, not paused animation.
- Ignore selection during transition/hold. At 14 seconds another choice is allowed. The verdict remains until the next selection.
- Buildings, footprints, seed and camera remain identical between states. Preallocate geometry; vary material/light parameters and existing actor transforms instead of rebuilding.

`src/presets.ts` is the numeric source of truth; do not duplicate the preset table in another module. Its fields are `timeOfDay`, `neon`, `traffic`, `crowd`, `signage`, `greenery`, `haze`, `windowLife`, `glyph`, `warmth`. The dusk UI deliberately says `18:40` while the supplied numeric preset is `18.7`; do not silently “correct” one to match the other.

## Source ownership

| File | Responsibility / change here for |
| --- | --- |
| `src/main.ts` | Startup, renderer, lighting/fog, render loop, resize, GPU error message and diagnostics |
| `src/cityRig.ts` | Seeded street kit, tower/shop/kiosk/glyph factories, static material batching, windows and vegetation |
| `src/layout.ts` | Shared Shibuya roads, crossing endpoints, landmark footprints and relocated dock |
| `src/mobility.ts` | Actor geometry and instancing, street timing, pedestrian poses, aircraft curves, delivery choreography and local navigation |
| `src/presets.ts` | State names, WorldState type, numeric presets |
| `src/worldState.ts` | Selection gate, transition, hold and verdict state; independent of DOM/rendering |
| `src/heroCamera.ts` | Locked camera; currently `(34,52,88)`, target `(-6,7,0)`, FOV 38° |
| `src/overlay.ts` | Keyboard/buttons, state labels, progress and accessible judgment text |
| `src/style.css` | Overlay layout, typography and responsive rules |
| `tests/worldState.test.ts` | State timing, locking, repeated selection and neutral reset |
| `tests/mobility.test.ts` | Street phase separation, walking-cycle continuity and sampled wing/building clearance, delivery continuity and guide wraparound |

Frame flow: `main` advances `worldState` → updates lighting → calls `cityRig.update(state,time)` → rig updates materials/windows/foliage and calls mobility → overlay renders status → composer renders the scene. One clock drives all motion; the state lock does not stop that clock.

## Geometry and motion conventions

- Coordinates are meter-like art units, Y-up, ground near Y=0. Street seed is `2127`. Camera has no orbit controls.
- Static architecture is transformed to world space and merged by material. Geometries must have compatible attributes/indexing; the static merge normalizes to non-indexed geometry. Source factory groups are removed after batching, so editing those groups afterwards will not move rendered buildings.
- Windows and moving actors use `InstancedMesh`; update instance matrices/colors and mark them dirty. Avoid constructing geometry or materials every frame.
- Pools: 6 cars, 24 pedestrians, 48 legs, 7 thin-wing aircraft, 7 cargo pods, one lift and two receiving doors. Six aircraft circulate; one courier performs the delivery cycle. Visibility varies smoothly with presets. Pool capacity is not the visible count.
- Street motion is an authored 30-second cycle, not a traffic simulation. Cars move in the early part; pedestrians cross in the later part and reverse direction on the next cycle. Check at least two cycles when changing it. Five shared painted crossing paths include the QFRONT–Hachiko diagonal; all waiting positions are off the road. Cars currently use only the east–west road; the other arms are deliberately unserved in this prototype.
- Circulation routes are a closed southern loop around 14–15 units high and an open express curve around 34–35, above the new landmark roofs. Open-route aircraft fade at endpoints. A 32-second delivery cycle approaches the station at Y=15, berths at X=15, Z=-15.2, transfers cargo out to Z=-12.5 during seconds 10–12, lowers it during 12–18, departs during 20–29 and returns the empty lift during 22–30. `DOCK` and `deliveryMotion` are shared by aircraft/cargo/lift/doors; do not give those objects independent clocks.
- Air guides are preallocated segments illuminated only near active aircraft. Street segments respond to car and pedestrian movement; neither system rebuilds geometry. Still keeps fewer circulating aircraft but retains the single delivery service.
- Building-clearance envelopes derive from `layout.ts` landmark dimensions plus conservative roof/awning allowances in `tests/mobility.test.ts`. Update these allowances when changing the factories; never shrink test envelopes merely to pass a collision failure.

## Rendering budget and limits

Use painted PBR, ACES tone mapping, mild bloom and one shadow-casting directional light. A small unshadowed berth light activates only near a docking courier. Current composer is RenderPass → UnrealBloomPass → OutputPass. Do not add another tone-map/output conversion or stack SSAO/SSR on top. Device pixel ratio is capped at 1.5; the target is roughly 60 FPS on a laptop at 1080p, subject to measurement.

No external models, backend, auth or persistence. Google Fonts is the only external runtime asset source; CSS has system-font fallbacks. Time is based on `performance.now()`, so hidden-tab pauses can advance motion/transition state when resumed. This is a presentation demo, without physics, pathfinding or user-controlled landing (delivery is authored choreography). Full GPU-resource teardown for repeated in-page scene recreation is not implemented; normal initialization happens once per page.

## References and handoff

See [README.md](../README.md) for the authorized visual and Three.js references. Keep the playroom reference's rounded visual family, not its child or toys-as-toys. Only the three named Linegel skills were used as references; do not install their whole catalog. Prior skills were read from temporary clones outside the repository, so do not assume those paths or installations survive another session.

`artifacts/neutral.png`, `pulse.png`, `still.png` document version 1. `artifacts/future-neutral.png`, `future-pulse.png`, `future-still.png` document version 2. Version-3 captures use `air-commons-*.png`. Screenshots establish appearance at capture time, not a deterministic animation frame or performance proof.
