# Project contract and implementation map — Odaiba 2127

Current source map, updated for resident P2 against base `a2271b5e8cd9fb9e86ecc5caea92e6ad9cd0a392` on 2026-10-02; exact verified/integrated commits are in the [P2 handoff](handoffs/resident-experience-p2.md). Product decisions belong in [EXHIBITION_SPEC](EXHIBITION_SPEC.md), startup in [README](../README.md), art implementation in [ART](ART.md), and dated checks in [VALIDATION](VALIDATION.md). Owner: cc100053; documentation consolidation: Codex.

## Product and package boundaries

The single exhibition venue is the **Odaiba waterfront in 2127**. Shibuya is a closed historical direction and will not be developed again (user decision, 2026-10-02). Historical unfinished tasks are not the current backlog. Legacy internal site IDs are compatibility identifiers, not a second venue.

| Package | Current responsibility |
| --- | --- |
| Root `src/` | Vite / TypeScript / Three.js WebGL 2 exhibition city; standalone and `?survey` |
| `survey/` | Four-question v2 proposal API, reducer, authoritative layout, SQLite schema 7, WebSocket, Guest / Monitor / loopback Admin |
| `module-swap/` | Preserved standalone / legacy v1 four-lot demonstrator; rejects v2 and is not the exhibition city |

Desktop-only presentation, with normal renderer resize. Do not add adaptive camera/mobile acceptance. Ambient people, vehicles, drones and aerial routes are allowed. Low/zero/high Meter values all depict mature 2127 alternatives. No deployment workflow is configured.

Resident [P1 copy](RESIDENT_COPY.md) is wired by [P2](handoffs/resident-experience-p2.md). Guest handles questions/background, choices, review, save/wait/retry, shared station/ordinal identity and the look-up prompt; results have no answer/score/facility tables. The existing single-revision conflict review still displays scores for recovery. Question-set version **3** is independent of algorithm/CityView v2 and SQLite schema7. Older reserved drafts are rejected by the existing version guard, then valid choices can be carried into a fresh reservation; A/B ends its own obsolete reservation through the existing endpoint first. Stored version2 proposals retain their original question/option copy and remain idempotently recoverable after upgrade.

Root reuses `surveyAtmosphere`'s panel for one fixed desktop reading card: title, at most two sentences and named location. Ambient background/facility cards rotate locally every12s; current-run proposals, never lifetime participation alone, allow the inherited-city card. Service/shared-seat counts, Park tree/cooling quantities and the tower's rendered band select focal facility descriptions. Even low Park retains trees, so trees+cooling uses the combined card; these are descriptions of current facilities, not district change inference. The opening identity body is shortened to its first two P1 sentences. Live updates show the shared identity and P1 recorded fallback, then return to ambient after10s; another A/B display may replace it after the existing ≥3s spacing. Snapshot/reset/Undo replaces the card immediately; reload does not replay an old result. Lighting-only snapshots do not restart cards or skip queued changes.

The [resident experience plan](RESIDENT_EXPERIENCE_PLAN.md) retains P3–P5: actual district causal evidence, coordinated reading slots and software/device acceptance. P2 local card timers are not a reserved10s server reading slot. Provisional iPad hardware/Safari/visitor understanding remains unverified; no generic responsive requirement. Geometry, camera, server schedule, transition and Guest timings remain unchanged.

## Root source ownership

| File / module | Responsibility |
| --- | --- |
| [main.ts](../src/main.ts) | Startup, WebGL renderer, lighting/sky/fog, composer, OrbitControls, loop/resize, survey hookup and diagnostics |
| [heroCamera.ts](../src/heroCamera.ts), [layout.ts](../src/layout.ts) | Authored Odaiba hero, district bounds, promenade/guideway/water/air routes, berth and four change-site footprints |
| [odaibaPlacement.ts](../src/odaibaPlacement.ts), [odaiba-layout.json](../src/odaiba-layout.json) | Surveyed placement and Blender → Three transform, including Grand Nikko legacy adapter |
| [odaibaScene.ts](../src/odaibaScene.ts) | District environment GLB, six landmark GLBs, material remap, context facades, roof publication and landmark night lighting |
| [civicCore.ts](../src/civicCore.ts) | Procedural civic chassis/chamber replacing the rendered Fuji TV model; source GLB remains in assets |
| [odaiba2127.ts](../src/odaiba2127.ts), [skyways.ts](../src/skyways.ts), [amphibiousShore.ts](../src/amphibiousShore.ts), [waterRooms.ts](../src/waterRooms.ts) | 2127 retrofit, skyways, tidal edge and six waterfront islands; shared island placements |
| [bayWater.ts](../src/bayWater.ts), [bayContext.ts](../src/bayContext.ts), [contextFacades.ts](../src/contextFacades.ts), [coastalCanopy.ts](../src/coastalCanopy.ts) | Curved sea/horizon, surrounding bay context, context building finishes and planted roof carriers |
| [cityRig.ts](../src/cityRig.ts) | Shared materials/factories, static batching, site lighting and mobility update; no Shibuya landmark runtime |
| [mobility.ts](../src/mobility.ts) | Instanced pods, walkers, boats, aircraft, sphere-berth choreography and reusable district crowd/drone geometry |
| [surveyView.ts](../src/surveyView.ts) | Strict wire validation, revision handling, reconnect and ordered A/B display queue; mirrors survey contract |
| [surveyAtmosphere.ts](../src/surveyAtmosphere.ts) | Legacy v1 atmosphere/feedback and v2 resident ambient/result panel; forwards authoritative views |
| [changeCatalog.ts](../src/changeCatalog.ts), [cityChangeManager.ts](../src/cityChangeManager.ts), [createCityChangeManager.ts](../src/createCityChangeManager.ts) | Compatible internal site registry, layout targets, site/district lifecycle, 3 s retargeting and live markers |
| [siteBuilders](../src/siteBuilders/index.ts), [siteRuntime.ts](../src/siteBuilders/siteRuntime.ts), [siteAssets](../src/siteAssets/assetCatalog.ts) | Four focal site builders, additive layers, GLB bounds/cache/fallback and late-load synchronization |
| [districtMeters.ts](../src/districtMeters.ts), [devMeters.ts](../src/devMeters.ts) | District carriers, hybrid/pairing/seeded slot selection, pulse/motion; DEV-only Meter review controls |
| [dayCycle.ts](../src/dayCycle.ts), [presets.ts](../src/presets.ts), [worldState.ts](../src/worldState.ts) | Clock/light curves, numeric atmosphere presets, legacy 10 s WorldState blend |
| [overlay.ts](../src/overlay.ts), [style.css](../src/style.css), [modelAssets.ts](../src/modelAssets.ts) | Desktop title/time UI, GLTFLoader and DEV-only local asset preview |

## Scene, geometry and rendering

Coordinates are **metres, Y-up**. `DISTRICT` covers the 720 × 680 m hero area. The derived `odaiba_district_v01_environment.glb` retains connected ground/roads and quieter background context outside the hero; the former 150 m dissolve-to-island is superseded. Telecom Center is not loaded as a separate landmark. [crop script](../scripts/crop-odaiba-district.py) produces the environment from the preserved masterplan source.

Six named models remain: Aqua City, DECKS, DiverCity Plaza, DiverCity Office Tower, Hilton and Grand Nikko. Fuji TV's runtime form is `civicCore`. Generated maritime sky/coastal grass textures are local assets. The future-tree GLB is used by the Park site; it is no longer placed at Hachiko.

Hero camera: position `(-520,300,-620)`, target `(-40,25,-60)`, FOV 42°, near 2, far 9000. Orbit distance 150–1000, polar angle .35–1.42; pan is bounded to the district. Comparisons use the untouched hero pose, stated viewport/hour and actor time. No automatic camera reframing.

Renderer: WebGL 2, Neutral tone mapping (.84 base exposure), sRGB output, pixel ratio capped at 1.5, VSM directional shadows. The sky dome follows the camera. A softened generated sky plus RoomEnvironment light cards feeds PMREM reflections. Composer: 4× MSAA HalfFloat target → RenderPass → GTAO → bloom → vignette → OutputPass → display-space colour grade. Curved sea/bay context, wakes and Meter pulses are excluded where required from GTAO's flat override prepass. Do not add another tone-map/output conversion.

Static groups are merged by material, windows/actors/carriers use InstancedMesh, and inactive district batches issue no draws. Shared resources are not disposed by a clone. Hidden transition transforms remain invertible. No geometry/material allocation per frame. Full teardown for repeated in-page scene recreation is not implemented; initialization is once per page.

## Frame and data flow

`main` determines clock/display hour → standalone `moodAt` or survey `world.state`, followed by `withNight`, supplies base atmosphere → lights/sky/fog update → `CityChangeManager.update(time,darkness)` advances focal sites, district carriers, pulses and local motion → `cityRig.update` forwards eased automation activity to mobility → `updateOdaiba` updates glazing → overlay and composer render. Time uses `performance.now()`; hidden tabs may advance motion on return.

A city day is 180 s from 12:00. Mood labels are Still / Daylight / Pulse; the old preset buttons and `0/1/2` controls were removed. `?hour=0..23.999` holds review time and overrides Admin Day/Night/Auto. Admin display setting persists independently of city reset. Separate Auto viewers have local clocks.

Standalone uses day-cycle activity and does not create the v2 district layer. `?survey` connects to `ws://<current-host>:8787/ws`, or the explicit ws/wss URL supplied as its value. Legacy v1 retains the 10 s atmosphere path. V2 uses the server layout and seeds directly, without blending scores into global atmosphere.

## Four sites and district behavior

| Wire socket / axis | Odaiba position (x,z), scale | Runtime |
| --- | --- | --- |
| nw / automation | (40,−300), ×3, デックス西 | Automation hub + AutomationDistrict |
| ne / environment | (−210,−135), ×4, お台場海浜公園 | Environment park + EnvironmentDistrict |
| sw / sharing | (−105,60), ×4, アクアシティ南 | Commons plaza + SharingDistrict |
| se / concentration | (175,−45), ×3, フジテレビ東 | Concentration tower + ConcentrationDistrict |

The district layer uses bounded preallocated slots: 17 climate bays, 11 service bays, six water rooms, ten courts, ten towers and 26 low pods, plus published roof carriers. Complementary covers preserve complete future identities; mixed composes hybrids. Cross-Meter agreement enables extra facilities. Four uint32 `slotSeeds` hash the full ordered active run history; neutral votes do not shuffle direction, and Undo excludes revoked proposals. Full-history hashing is O(guests) per view; optimize only if measured cost warrants it. Site/design footprints stay fixed while selected slot distribution can differ by history.

Automation changes walkers 160/100/40, pods 12/18/24 and circulating aircraft 2/16/30 at low/mixed/high; capacities exceed visible counts. Base water fleets, sweep cars and berth shuttle are independent. P12 adds up to 120 crowd slots for eligible courts (seed-zero 0/24/96), 11 service quadrotors with staggered 48 s docking cycles, and slow night accent rhythms. These are authored motion, not physics/pathfinding/occupancy simulation. Route/bounds checks are in [mobility tests](../tests/mobility.test.ts) and [Odaiba tests](../tests/odaiba.test.ts); detailed accepted limits in [Meter handoff](handoffs/meter-variety.md).

Live targets ease over 3 s; changed slots emit Meter-colour rings/shafts (two waves, about 4.2 s). Snapshot/reset/Undo/reconnect/reduced motion settle immediately and clear pulses/queued displays. No-op events do not replay. Late roof/asset publication must adopt the latest target and seed.

## Survey ownership and persistence

| Area | Responsibility |
| --- | --- |
| [shared](../survey/src/shared/cityView.ts) | v1/v2 state/view/protocol contracts; authoritative policy → layout |
| [questionLoader](../survey/src/survey/questionLoader.ts), [scoreEngine](../survey/src/survey/scoreEngine.ts), [decisionHistory](../survey/src/survey/decisionHistory.ts) | Versioned four-axis question copy (currently3), shared reducer/replay, immutable view history |
| [server](../survey/src/server/server.ts), [realtime](../survey/src/server/realtime.ts) | HTTP/static pages, loopback/same-origin Admin guard, snapshots/updates/reset broadcasts |
| [database](../survey/src/server/database.ts), [migrations](../survey/src/server/migrations.ts), [runStore](../survey/src/server/runStore.ts) | SQLite schema 7, transaction/restoration, active proposal replay, seeds/counts |
| [proposalService](../survey/src/server/proposalService.ts), [adminService](../survey/src/server/adminService.ts) | Atomic submission/idempotency, single/A/B sessions, leases/reset drain, Undo, display mode |
| [Guest](../survey/src/ui/guestDebugView.ts), [guestFlow](../survey/src/ui/guestFlow.ts), [Admin](../survey/src/ui/adminView.ts), [Monitor](../survey/src/ui/monitorDebugView.ts) | Presentation/API adapters, recovery and local draft; no independent score calculation |

Start → four answers → review → one proposal → result 10 s / handoff 5 s. Canonical request IDs and session uniqueness prevent double counting; transactions accumulate against latest state. A/B permits stale but not future city revision; single mode requires exact revision. Server schedules displays ≥3 s apart and root preserves ordering. Reconnect restores latest snapshot immediately.

Single mode automatically hands off at next Start and applies a queued reset. A/B stops new admissions during reset and drains both; questionnaire expiry is 5 min, result lease display start +15 s, server sweep every 1 s. Admin cancellation must identify one reserved session. Undo is available only for the latest completed proposal before a newer start; cancelling that newer draft does not reopen Undo. City/full reset and Undo retain original audit history; full reset changes the total-count watermark. Actual API/defaults are in [survey README](../survey/README.md).

## Verification and historical references

Root tests/build cover root only; install survey dependencies for the real HTTP/WebSocket pipeline tests. Survey and module-swap have separate checks. Browser/performance evidence is tied to the captured commit/device, never inferred from geometry counts or earlier Shibuya FPS. S5, input hardware and exhibition-day recovery policy remain unresolved. See [current validation](VALIDATION.md) and [document index](README.md).

The [previous implementation map](history/PROJECT_2026-10-02.md) is an archived mixed-stage snapshot for old deep links. It is not an architecture authority or a list of future work.
