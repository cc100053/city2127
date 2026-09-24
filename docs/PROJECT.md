# Project contract and implementation map

Exhibition priorities and historical Plan 02 implementation status: [方向與紀錄](PLAN02.md). Art rules for the root scene: [ART.md](ART.md) (draft, pilot under user review).

## Current product direction — 2026-09-18

The goal is an exhibition in which guests collectively shape a futuristic Shibuya. Future identity, Shibuya recognition and visible consequences of choices take priority over producing an exceptionally beautiful model. Documentary-photograph realism is no longer a completion criterion.

Confirmed experience flow (a minimal version is implemented by the causal MVP below):

1. A guest answers one question by selecting an option.
2. The city changes from the accumulated result of previous guests, incorporating this choice.
3. When that guest's experience ends, they immediately see the resulting visual change.
4. The next guest continues with the next question and inherits the changed city. Changing guests does not reset it.

Building count/density and pedestrian activity are candidate dimensions, not a committed parameter list or mapping. The MVP fixes one working set of questions, effects, bounds, persistence and admin reset; the exhibition question catalogue, transition timing, the exact experience-end trigger, input hardware and exhibition-day reset/recovery rules remain undecided. Immediate visible feedback is an experience requirement; it does not yet specify an animation duration or a technical latency budget. Cross-guest accumulation does not by itself decide persistence across reloads or days.

The single Shibuya setting and desktop scope remain. Plan 02 and [Pic 2](../asset/pic2.png) provide reusable visual references; the root prototype's three-state model, unchanging buildings and 10-second / 4-second timing are implementation facts, not constraints on the exhibition design. The question sequence, cumulative choices and choice-driven lots live in the causal MVP (next section), outside the root prototype; the root `src/` city, its three presets and `WorldState` are unchanged by it.

**Next direction (user decision, 2026-09-24):** the exhibition city is the root Shibuya scene (`src/`). Build and extend that scene first — more areas and city objects, visibly changeable city, polished look — and add more questions to the causal MVP. Connecting the survey to the root scene comes after; module-swap's four-lot viewer proves the causal chain but is not the target city. Visual polish is in scope, but it serves readable change rather than replacing it.

## Causal choice → city MVP — 2026-09-24 (`survey/` + `module-swap/`)

Implemented on `feat/causal-city-mvp` and integrated into `main` at `6f6fbb2` (2026-09-24); handoff [causal-city-mvp](handoffs/causal-city-mvp.md). It proves one short causal history, not the exhibition question catalogue.

Dependency direction (never reversed; Three.js cannot change policy or question eligibility):

```text
question (scenario metadata + trigger) → guest choice → append-only answer_events → policy scores
  → deriveCityLayout() (survey/src/shared/cityView.ts) → CityView over WebSocket → module-swap ModuleManager
```

- **Policy axes** (`survey/src/shared/citySurveyState.ts`): `automation`, `publicSharing`, `environmentalPriority`, `urbanConcentration`; integers, start 0, clamped to −12..12. They replaced the placeholder environment/culture/technology/community/mobility axes and the three placeholder milestones (SQLite schema 2).
- **Questions** (`survey/src/survey/questions.mvp.json`, server default): each has optional `year`, `pressure`, `background` (scenario metadata, not a simulation) and an optional `trigger` `{ axis: { gte?, lte? } }`, all bounds inclusive. A guest gets the first question in JSON order that is neither answered nor reserved in the active run **and** whose trigger matches current scores. Consequence questions come first; two untriggered fallbacks (`heat-stress`, `social-isolation`) keep every first choice from dead-ending.
- **Decision history** is the run's `answer_events` (append-only, stored effects). `buildCityView()` (`survey/src/survey/decisionHistory.ts`) replays them to report each decision's actual policy change and the slots it changed; there is no separate history table.
- **Derived layout** — the only policy → geometry mapping, in `deriveCityLayout()`. Each lot is persistent evidence of one axis, so later answers add rather than erase:

  | Slot | Axis | Rule | Meaning shown to viewers |
  | --- | --- | --- | --- |
  | NW | automation | ≥2 medium, ≥4 tall building | 自動サービス拠点 / 大規模自動化インフラ |
  | NE | environmentalPriority | ≥2 park lot | 都市公園 |
  | SW | publicSharing | ≥2 plaza lot | 公共コモンズ広場 |
  | SE | urbanConcentration | ≥1 medium, ≥2 tall building | 中層複合ビル / 高層集約タワー |

  All-zero (or negative) scores give four empty lots with no buildings (the survey baseline). The standalone module-swap default layout is unchanged.
- **Viewer**: `module-swap/app` with `?survey` (default `ws://<host>:8787/ws`, or `?survey=<ws url>`; a value that is not a `ws://` / `wss://` URL, e.g. `?survey=1`, uses the default). Every WebSocket (re)connect starts with a full `city-state-snapshot` carrying the `CityView`, so reload/reconnect rebuilds the city from the server; `city-state-updated` / `run-reset` carry the next view. The viewer validates the layout with `validateCityLayout`, ignores older/repeated revisions of the same run (`supersedes`), and applies changes with `ModuleManager.transitionTo()`, which animates only changed slots. Survey mode never reads localStorage, hides the debug panel, uses a higher fixed camera `(-38,105,88)` so a tall SE tower does not hide NW, shows a CHOICE / POLICY / CITY EFFECT panel with the run history, and labels each occupied lot (CSS2DRenderer).
- **Reset**: admin `RESET` starts a new zero run → empty history → baseline layout; earlier runs' events stay in SQLite.

Exact demo: guest 1 `labour-shortage` → `automate-services` (automation +2, NW medium); guest 2 receives `automation-street-decline` (trigger automation ≥2) → `public-commons` (publicSharing +2, SW plaza); guest 3 receives `commons-land-pressure` (trigger publicSharing ≥2) → `build-upward` (urbanConcentration +2, SE tall). All three remain visible together.

Known limits: root CI runs `survey/` and `module-swap/` tests/builds since 2026-09-24, but not module-swap's browser smoke test; sequential guests are assumed — while a question is reserved, a parallel guest is given the next eligible (often fallback) question from the current scores; question text shown in history comes from the current question JSON; slot meanings reuse generic `building-basic-*` GLBs explained by labels; module-swap is a separate Vite app, not the root Shibuya scene.

## Root scene survey mode — 2026-09-24 (`src/?survey`)

User decisions 2026-09-24: connect the survey to the root Shibuya scene in three steps — atmosphere, Shibuya change points, causal panel (all implemented). Handoffs [root-survey-atmosphere](handoffs/root-survey-atmosphere.md) (steps 1–2) and [root-causal-panel](handoffs/root-causal-panel.md) (step 3).

- `?survey` (default `ws://<host>:8787/ws`) or `?survey=<ws url>` on the root app connects to the same survey WebSocket as module-swap. `src/surveyAtmosphere.ts` validates each `CityView`, drops older/repeated revisions of a run, and maps `scores` to a `WorldState` with `scoresToWorldState()`: offsets from `presets.neutral`, one answer (+2) = half effect, two answers on an axis = full (automation → traffic/glyph/neon; publicSharing → crowd/signage; environmentalPriority → greenery/warmth, less haze; urbanConcentration → windowLife/neon).
- `worldState.blendTo()` starts the existing 10 s transition toward any state with no hold lock; a newer view restarts from the current blend. Survey mode hides the preset buttons, `0/1/2` do nothing, and the causal panel (step 3) explains each change. Without `?survey` the preset prototype is unchanged.
- Step 1 finding: the atmosphere alone is subtle in daylight (greenery only changes membrane opacity; crowd/traffic add a few actors), so step 2 carries the readable change.
- **Step 2 — Shibuya change sites** (`src/surveySites.ts`, footprints in `layout.ts` `changeSites`): the CityView layout's four lots become four sites on open ground visible from the hero pose. `siteTargets()` (`surveyAtmosphere.ts`) maps the layout to six parts: NW automation → AUTO HUB east of MAGNET `(35,-11)`, base for any building, logistics shaft for `tall` (to 32); NE environment → PARK east of the station `(37,11)`, lawn, hedges and five clones of the future-tree GLB; SW public sharing → COMMONS PLAZA south of Dogenzaka `(-24,32)`, paving, membrane canopy, benches; SE concentration → TOWER behind Center-gai `(-40,-10)`, mid-rise base plus a tall residential tower (to 46). Every part is built once from `cityRig` materials/`box`/`sign` and stays outside the static batch; a changed target rises or sinks the part (Y scale, 3 s smoothstep, hidden at zero). `tests/mobility.test.ts` checks that the sites clear roads, landmarks and both air corridors.
- **Step 3 — causal panel** (`startSurveyAtmosphere()` in `surveyAtmosphere.ts`), ported from module-swap's `CausalPanel` in the root scene's light style: top-left card replacing the preset intro copy (hidden in survey mode, header kept) with the latest decision's year, pressure and question, then CHOICE / POLICY / CITY EFFECT rows, the latest three decisions (numbered in run order), the four scores and the server status. City effects name the Shibuya place where the change appears (`changeSites[*].place`: MAGNET東, 駅東, 道玄坂南, センター街奥) before the server's slot label. The history is capped at three and the card at 400 px so it ends above the SW plaza at 1280×720.
- Art-direction pilot (2026-09-24): the SW commons is restyled to the ringed-plaza language and every site shows a saffron footprint outline that pulses for 10 s after a live change (not on snapshot restore). Parts are baked per material, so all-sites-up draw calls fell from 946 to 462 with GTAO enabled; they were 576 before GTAO.
- Not yet: labels in the 3D scene, real-GPU performance with all sites up.

## Current implementation baseline (unchanged by the direction update)

Plan 02 superseded the painted civic-model direction. Its reference is [Pic 2](../asset/pic2.png): monumental integrated architecture, a vertical city, authored efficient movement, maintained ceramic/composite/metal surfaces, restrained glazing and daylight. The implemented baseline retains one Shibuya intersection, landmark relationships, ground crossing endpoints, seeded construction, WebGL 2 and the existing state machine.

The first vertical slice adds QFRONT/MAGNET upper occupied links, open public floors, two elevated pedestrian routes with terminal lifts, roof-supported express infrastructure, a lower perimeter corridor, and environmental filtration membranes. Conventional trees and 2026 prop clutter were removed in that stage; a later authored 2127 tree model now sits near Hachiko plaza. Ground traffic and visible pedestrian counts are reduced. This is a geometric prototype; its historical realism gaps are recorded in Plan 02, not current product blockers.

The initial handoff proposed WebGPU references/fallbacks. The actual implementation uses **WebGL 2**, Three.js `WebGLRenderer`, Vite and TypeScript. Do not describe it as a WebGPU implementation or migrate renderers incidentally.

Plan 01 replaces the generic four blocks with a compressed Shibuya layout: QFRONT to the northwest, a future MAGNET / air station to the northeast, western commercial blocks, and Hachiko plaza beside a low station mass to the southeast. This is a reference-based blockout, not a surveyed reconstruction. See [SHIBUYA.md](SHIBUYA.md).

Desktop-only presentation: the user explicitly excludes responsive/mobile work (2026-09-17). Keep a fixed desktop composition and ordinary renderer resize handling; do not add adaptive framing or mobile layouts.

## Current prototype behavior (not the exhibition specification)

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
- Preset selection does not change buildings, footprints, seed or camera; OrbitControls independently allow camera movement. Geometry is preallocated, while material/light parameters and existing actor transforms vary. Future building changes require a separately designed implementation rather than treating this baseline as a permanent prohibition.

`src/presets.ts` is the numeric source of truth; do not duplicate the preset table in another module. Its fields are `timeOfDay`, `neon`, `traffic`, `crowd`, `signage`, `greenery`, `haze`, `windowLife`, `glyph`, `warmth`. Legacy numeric presets remain unchanged to preserve interpolation and activity mapping. `timeOfDay` no longer drives the sun; UI labels explicitly present Daylight/Pulse at noon and Still at 09:00.

## Source ownership

| File | Responsibility / change here for |
| --- | --- |
| `src/main.ts` | Startup, renderer, lighting/fog, post chain (MSAA target → GTAO → bloom → output), render loop, resize, GPU error message and diagnostics |
| `src/cityRig.ts` | Seeded street kit, shared materials (incl. pilot `glass`/`leaf`/`stone`), `box`/`arc`/`shrubs` builders, `bake()` material merge, tower/shop/kiosk/glyph factories, QFRONT media drum, Hachiko plaza, windows, engineered ecology and upper infrastructure |
| `src/layout.ts` | Shared Shibuya roads, crossing endpoints, landmark footprints, public routes, upper links, relocated dock and survey change-site footprints |
| `src/mobility.ts` | Actor geometry and instancing, street timing, pedestrian poses, aircraft curves, delivery choreography and local navigation |
| `src/presets.ts` | State names, WorldState type, numeric presets |
| `src/surveyAtmosphere.ts` | `?survey` WebSocket client, CityView validation, scores → WorldState, layout → site targets, survey panel |
| `src/surveySites.ts` | The four survey change sites (each part baked by material), their rise/sink motion and the saffron guest-change outline ([ART.md §8](ART.md#8-how-a-survey-change-reads)) |
| `src/worldState.ts` | Selection gate, transition, hold and verdict state; independent of DOM/rendering |
| `src/heroCamera.ts` | Initial camera; `HERO_POSITION` `(34,34,76)`, `HERO_TARGET` `(-3,17,-1)`, FOV 46°, far 320, shared with the orbit target. `main.ts` attaches OrbitControls (commit 5ad7dd0, 2026-09-17) with distance 45–180 and polar limits; screenshots use the untouched initial pose |
| `src/overlay.ts` | Keyboard/buttons, state labels, progress and accessible judgment text |
| `src/modelAssets.ts` | Load a Blender GLB with Three.js GLTFLoader and place it in scene coordinates; used by `main.ts` for the future tree and the dev `?asset-preview` picker |
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

Shared static materials are three finishes on one `MeshStandardMaterial` shader: matte ceramic composite (cream/trim/teal/sage/pink, roughness ≈.45–.58, metalness ≤.05), refined metal (`solar`, roughness .3, metalness .85) and reflective glass (`dark`, roughness .16, metalness .7). The pavement has its own matte `ground` material. Every window floor gets one sun-shade fin per face from `windows()`, the tower ribbons and QFRONT floors likewise, so facade depth comes from shadow rather than per-window geometry. Environment intensity is .6. Since the lighting pass (2026-09-24): Neutral tone mapping at exposure .84, sun 2.55 base from a lower angle (position −48, 44, 34) for longer shadows, warm sun `#ffe7c4` over a cool hemisphere fill (`#e3ebee` sky, `#8a8274` ground) at .62 base, and Still adds only .05 sun. The sun uses VSM shadows (2048, radius 5, 12 blur samples) for soft penumbrae. The sky is a 150-unit gradient dome (`ShaderMaterial`, back side, no fog) that follows the camera each frame; its horizon uniform is the state background colour that fog and the floor also use, and its zenith is a deeper per-state tone. A seeded ring of 60 hazed blocks at radius 125–165, outside the ground plate, forms a distant skyline; its one material is tinted per state and never receives shadows from the sun. Use architectural PBR, one precomputed RoomEnvironment reflection map, Neutral tone mapping, mild bloom and one shadow-casting directional light. A small unshadowed berth light activates only near a docking courier. Composer since the art-direction pilot (2026-09-24): a 4× MSAA HalfFloat target (the default composer target had no samples, so edges were aliased) → RenderPass → GTAOPass (radius 3, 16 samples, blend 1) → UnrealBloomPass (threshold 1, strength .1) → vignette `ShaderPass` → OutputPass. GTAO was allowed by the [art-direction](handoffs/art-direction.md) scope. It renders a second G-buffer pass, which roughly doubles draw calls (preset 170 → 337), so keep it only if the real-GPU measurement holds. Do not add another tone-map/output conversion or stack SSAO/SSR on top. The pilot adds `glass` (`MeshPhysicalMaterial`, clearcoat, no transmission), `leaf` and `stone`. Since the building rollout, all glazing uses `glass`, and `dark` is left for metal details. Roles are in [ART.md](ART.md). Device pixel ratio is capped at 1.5; the target is roughly 60 FPS on a laptop at 1080p, subject to measurement.

The first production external model is `asset/models/future-tree-2127/future-tree-2127.glb`, loaded by `main.ts` through `addCityModel` at `(11,0,23)` near Hachiko plaza. It is static and does not change with presets. The root prototype has no backend, auth or persistence (the separate `survey/` server has SQLite persistence and a loopback-only admin). [Blender asset standards](BLENDER.md) define manual source/export handoff. `modelAssets.ts` provides the GLTFLoader entry point; `main.ts` also exposes a development-only `?asset-preview` file picker to load one local GLB at the scene origin. No procedural building is replaced or Odaiba asset added. Google Fonts is the only external network runtime asset source; CSS has system-font fallbacks. Time is based on `performance.now()`, so hidden-tab pauses can advance motion/transition state when resumed. This is a presentation demo, without physics, pathfinding or user-controlled landing (delivery is authored choreography). Full GPU-resource teardown for repeated in-page scene recreation is not implemented; normal initialization happens once per page.

## References and handoff

See [README.md](../README.md) for the authorized visual and Three.js references. Plan 02 replaces the playroom visual family with precise architectural surfaces. Only the three named Linegel skills were used as references; do not install their whole catalog. Prior skills were read from temporary clones outside the repository, so do not assume those paths or installations survive another session.

`artifacts/neutral.png`, `pulse.png`, `still.png` document version 1. `artifacts/future-neutral.png`, `future-pulse.png`, `future-still.png` document version 2. Version-3 captures use `air-commons-*.png`. Screenshots establish appearance at capture time, not a deterministic animation frame or performance proof.

## Plan 02 public circulation

`publicRoutes` links QFRONT to the station at Y=8–10, and Dogenzaka to Center-gai at Y=6–9. Mesh decks and walkers share these centerlines. Corner plates close joins. `publicJourney` gives a 48-second one-way journey: 15% origin lift, 70% walk, 15% destination lift; the following journey reverses continuously. Same-route walkers start 16 seconds apart, so a lift never carries two riders; each direction keeps its own side of the deck (`publicPoint` lane ±.5, mitred at corners) and drifts back to the shaft centreline during the ride. Ground actors retain the original five crossings and 30-second traffic phase. Public actors operate independently above cars. Small platforms on the shaft centreline accompany vertical travel through an open landing frame; decks stop 1.5 units short of each terminal. There is no capacity scheduling, cabin simulation or agent avoidance. Platforms are authored visual proxies, not a production lift system.

`upperLinks` in `layout.ts` lists every occupied volume above the landmark footprints: the solid QFRONT/MAGNET link at Y=39, an open colonnade commons floor at Y=24 spanning the same cores over the north road, the QFRONT crown and hung west wing that form one bracket off the twin cores, and the MAGNET east wing on two ground columns beside its mid-block collar. Each entry names the landmark cores it bears on (`on`) and any ground columns; `cityRig` builds them by `kind` (`link`, `floor`, `wing`). None has separately simulated walkers. Two paired sky rails follow the shared air curves 1.3 units below aircraft, with 2.8-unit lateral clearance. Express portals rise from the QFRONT and MAGNET roofs; perimeter supports land at the western and station blocks. Aircraft remain authored, with endpoint fades. The lower MAGNET station and cargo choreography retain their original Y=15 opening.

Tests sample public journey continuity, terminal coordinates, cargo separation and every upper volume against air routes, the courier column and public walkers, and require each volume to overlap its named cores by 1.5 units and stay under their roof height, with columns off the road polygons. Conservative landmark envelopes still check all circulating aircraft. Tests do not prove exact rail/pylon mesh collision, actor-to-actor avoidance, interior occupancy or photoreal appearance. No geometry/material is allocated per frame; route distances and reflection maps are prepared once.
