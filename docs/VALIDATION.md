# Validation procedures and evidence index — Odaiba

Current procedures, 2026-10-02. Product acceptance comes from [EXHIBITION_SPEC](EXHIBITION_SPEC.md); implementation from [PROJECT](PROJECT.md). Shibuya is closed history, with no future work or acceptance backlog. Earlier screenshots/FPS do not establish current Odaiba results.

## Automated checks for the current prototype

Use Node 24+. Run from the root (install only when absent/lockfile changes):

```sh
npm ci
npm ci --prefix survey
npm test
npm run build
git diff --check
```

Root pipeline tests start the real survey HTTP/WebSocket server, so survey dependencies are required. Root does not run the separate package suites. When survey changes:

```sh
cd survey
npm test
npm run build
```

When module-swap changes, from its package directory:

```sh
npm run install:app
npm test
npm run build
```

CI uses Node 24, installs/tests/builds all three packages and checks committed whitespace. Local checks gate integration; main CI must pass after integration (branch CI need not be awaited, 2026-10-06). Documentation-only pushes skip CI; a newer push cancels an in-progress run on the same branch. The Odaiba route/clearance test raycasts through `three-mesh-bvh` (test-only devDependency) with the same hits as three's brute-force raycast. A configured workflow is not a passing run. [Git workflow](CONTRIBUTING.md) defines exact checks and race handling.

Documentation-only changes require local Markdown file/anchor checks, tracked-target checks, renamed-path/plain-text-reference checks, source fact checks and self-review of the complete diff. Check both working/staged diffs and `git diff --check origin/main...HEAD`. Rendering/tests/builds are not required for prose-only changes, and CI skips pushes that touch only `docs/**` or `*.md`. No source/asset change can be disguised as documentation-only.

## Browser regression checks for the current prototype

Start the services and use their printed ports as described in [README](../README.md). Use scratch SQLite for destructive reset/Undo checks; preserve the exhibition DB. Desktop only. Record actual viewport, browser/GPU/device, commit, hour/actor time and console/network results. Reuse project previews; do not kill unrelated processes.

| Check | Expected result |
| --- | --- |
| Standalone `/` | Odaiba landmarks/civic core, connected backdrop, bay, six waterfront islands and base mobility load without errors; no survey-dependent district layer |
| Day/dusk/night | Review `?hour=12`, `18.5`, `22`; structure, public paths, windows and four sites remain readable; automatic clock wraps in 180 s |
| Camera/resize | Initial authored desktop hero; orbit/zoom/pan limits and ordinary renderer resize work; no adaptive camera or mobile requirement |
| Four-question Guest | One complete proposal after review; partial answers do not change city; scheduled result10s / handoff5s; reload resumes remaining time without renewing leases; IDs survive unknown-result retry without a duplicate vote |
| Low/mixed/high | All four focal sites and district carriers are complete future alternatives; continuous quantities, hybrids, pairings and seed layout agree with authoritative view |
| Live transition | Changed targets retarget over 3 s with local pulses; duplicate/no-op events do not replay; late assets/roof publication use latest target |
| Immediate recovery | Snapshot/reset/Undo/reconnect/reduced motion settle immediately, clear pulses/queued display, restore latest state; lighting-only snapshots do not skip live queue |
| Single station | Next Start automatically ends completed experience; queued reset applies before new answers; no Admin exit confirmation; Admin can end unfinished questionnaire |
| A/B | Independent draft/result/recovery; both accumulate in commit order; displays ≥10 s apart with separate3s city motion; each Guest sees its own queued result; newer starts close old Undo |
| A/B reset/cancel/expiry | New starts stop during reset; both sessions drain; named unfinished cancellation affects one; questionnaire/result leases release abandoned stations |
| Undo | Latest completed proposal only, before next start; restore scores/counts/seeds; original event preserved; cancelled newer draft cannot reopen prior Undo |
| Admin display | Day 12:00 / Night 22:00 / Auto saved across reset/restart; explicit City `?hour` wins; LAN access to Admin denied |
| Persistence | Restart existing SQLite and reconnect pages; state/history/settings recover; do not delete DB to simulate recovery |
| Routes/actors | No actor passes through another: mobility tests check boat hulls over the whole water period, train spacing per track and walker lanes; for people, sample overlaps of the real fleets with doorways published. Sample repeated guideway, promenade/deck walker parties, joggers passing in the outer lane, promenade stool sitters and rail-spot parties veering out of the lane, doorway walkers emerging from the facade, bench sitters/rail couples/forecourt groups, delivery robots and their collector hand-offs, street cars on both avenues and the drop-off bays (indicators, brake lamp, nose dip), gait/items, day rhythm at `?hour=4/12/19/21`, boats, both aerial loops and berths, interchange boat/transfers, district crowd/drone cycles; no ground/landmark/site collisions, half-faded settled aircraft or stale visible batches. DEV `?meters=nw:high&reviewTime=<s>` (low/mixed/high) holds a review time; `?review=street` frames people and street cars up close (`&cam=x,y,z` moves that camera, `&at=x,y,z` aims it) |

Optional runnable browser checks use installed Playwright and local services: [surveyAuto.browser.mjs](../tests/surveyAuto.browser.mjs), [adminUndo.browser.mjs](../tests/adminUndo.browser.mjs), [twoStations.browser.mjs](../tests/twoStations.browser.mjs), [residentP2.browser.mjs](../tests/residentP2.browser.mjs), [residentP3.browser.mjs](../tests/residentP3.browser.mjs), [residentP4.browser.mjs](../tests/residentP4.browser.mjs). Read each script's environment/ports before execution. These are focused regressions, not proof of exhibition-day hardware acceptance.

Street-life interactions (2026-10-06): root `mobility.test.ts` checks conversational speaker/listener/quiet turns and continuous
outbound/stay/return/indoor timing. `odaiba.test.ts` publishes real landmark doorways after creating the actor fleets, checks the
visitor curves on actual paving and clear of buildings/sites, then samples each journey against actual people/robots for 240 s
at .25 s in low/mixed/high, hours 12/21. Every journey must actually be drawn in all six cases; seated matrices and folded legs
remain fixed. Repeat visual checks with companion gaze/hand gestures, visitor arrival/chat/turn/return, and held day/dusk/night.
The same loop asserts doorway people (0.62 m) and robots (0.85 m) never overlap and that no promenade walker, and at most 2 % of slow doorway frames (tight forecourt corners), strides in place; `districtMeters.test.ts` checks street cars → pods at low/mixed/high with unchanged traffic. `mobility.test.ts` runs the real traffic simulation 15 min (evening) with drawn bodies and 30 min (morning): lane bumper gaps > 1.5 m, ≤ 15 m/s, no car between stop line and far side while residents cross, crossers outside every drawn car footprint, real stops/queues/brake lamps, lag < 200 m, drop-off cars still parking; crossing bands on road and footways on paving, and both avenues' car edges on road or paving with the junction fill. `odaiba.test.ts` sweeps every lane's car body (as drawn, ends faded) along both avenues against the real landmarks, civic core and environment and requires 0.3 m clearance (fails with the old lane positions).
Dated results and any integration limits belong in the [street-life handoff](handoffs/archive/street-life.md).

Building interactions (round 9, 2026-10-06): `mobility.test.ts` checks arrival/wait/exit/greeting/departure/indoor stages,
bounded continuous movement and stopped service feet. `odaiba.test.ts` samples the actual four entrance people against paving,
static city geometry and all existing person/robot fleets at low/mixed/high, hours 12/21. `automationHub.test.ts` checks actual
service actor size, platform support and counter/facade clearance, human/assisted/autonomous use, live handover, immediate
recovery and hidden frontage. Review entrance stages and service scenes in the browser, keeping the original hero day/dusk/night;
use explicit `nw:-12/0/12` for 0/3/6 automated ports (band shorthand `low/high` maps to scores −7.5/+7.5, not the endpoints).

## Performance evidence

Measure current Odaiba on the stated real GPU, ideally the exhibition machine at 1920×1080. State pixel ratio, actual viewport, camera/hour/mode, frame sampling interval, draw calls/triangles and console/network results. Mesh counts, source file size, headless/software FPS and old Shibuya 60 FPS are not equivalent to a current measurement. Do not claim Windows or another workstation was tested from Mac evidence.

Opening origin card (2026-10-19, `feat/intro-origin-card` from `5e2fc3a`): ambient resident cards now open with `intro.origin` 「街は、誰が決めるのか。」 before `intro.identity`; READMEs gain an about-the-work section. Root `npm test`/`npm run build`, `git diff --check` PASS; scratch-DB headless Google Chrome 1280×720 `?survey=…&hour=16`: rotation origin → identity → lineage → participation → four facility cards → origin at 12 s each, both sentences fit the card ([screenshot](../artifacts/intro-origin/intro-origin.png), second cycle). The first card is in the DOM at ~8 s but is not painted while the scene is still loading (pre-existing, also true of identity before). Physical display NOT RUN; [handoff](handoffs/archive/intro-origin-card.md).

Guest handoff wait notice (2026-10-15, `feat/guest-handoff-wait-notice` from `db561a1`): pressing 「はじめる画面へ」 inside the protected reading slot now shows the `control.handoffWait` status notice instead of silently re-rendering. `survey/` `npm test`/`npm run build`, `git diff --check` PASS; scratch-DB headless Google Chrome 1280×720, single and station A: notice shown, still on handoff, auto welcome after ~9.7 s with notice cleared, no page errors ([screenshot](../artifacts/guest-handoff/handoff-wait-notice.png)). iPad NOT RUN; [handoff](handoffs/archive/guest-handoff-wait-notice.md).

Render performance defaults (2026-10-27, `feat/render-perf` from `96369f9`): default preset now half-size GTAO, 2× MSAA, 4 Hz shadow-map redraw and no shadows from `mobility.ts` fleets. Development Mac (Apple M6, headless Google Chrome via playwright-core, ANGLE Metal), 1920×1080/DPR1, Vite DEV `?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40`, 5 s rAF windows after 16 s load: uncapped (`--disable-gpu-vsync`) main vs branch, two rounds each, day `hour=16` 40.4/40.3 → 81.7/79.6 FPS, night `hour=21` 35.8/39.6 → 79.1/76.9. With vsync, hero day/dusk/night, `review=street` and `review=civic` all go from 38–44 to 60 FPS (the cap); a shadow-update frame drops from 1840 draws/32.2M triangles to ~950/16.1M. Before/after captures: hero mean per-pixel difference 2.6–3.3/255 ([hero day](../artifacts/render-perf/compare-hero-day.jpg), [dusk](../artifacts/render-perf/compare-hero-dusk.jpg), [night](../artifacts/render-perf/compare-hero-night.jpg), [civic](../artifacts/render-perf/compare-civic-day.jpg), [1:1 crop](../artifacts/render-perf/crop-hero-day.jpg)); at the 40 m DEV street review, benches and walkers lose their shadows ([crop](../artifacts/render-perf/crop-street-day.jpg)), which the exhibition orbit (≥150 m) never reaches. Live-clock burst near hour 16.6: each 4 Hz shadow step changes ~0.3% more pixels than actor motion alone ([sheet](../artifacts/render-perf/dusk-shadow-step.jpg)). Root `npm test`/`npm run build`, `git diff --check` PASS; only the known favicon 404. Integrated as `3591af7`; main CI success. The owner then viewed the live-clock city in their own Chrome on the development Mac and accepted the look (no FPS recorded there). Exhibition machine and user-display DPR 2 FPS NOT RUN; [handoff](handoffs/render-quality.md).

Render quality low (2026-10-15, `feat/render-quality-low` from `29d12db`): user-run Brave on the owner's M1 16 GB, external 4K monitor, canvas 2131×1334 (DPR 1), Vite DEV `?survey&hour=15`, rAF frames counted over 3×4 s after load. Temporary uncommitted pass switches gave base 9.4 FPS; no MSAA 12.9, no GTAO 14.6, GTAO 8 samples 9.6, no bloom 10.0, 2048 shadow 10.3, no shadows 13.1, no MSAA+GTAO+shadows 33.3. `?quality=low` ships that last set. `tests/renderQuality.test.ts`, root `npm test`/`npm run build`, `git diff --check` PASS. Development Mac headless Chromium (Playwright, ANGLE Metal) 1280×720/DPR1, same URL: default 15.5 FPS, low 52.5 FPS, no console errors ([default](../artifacts/render-quality/quality-default.png), [low](../artifacts/render-quality/quality-low.png)). Exhibition machine, phones and automatic quality stepping NOT RUN; [handoff](handoffs/render-quality.md).

Street traffic round 10 (2026-10-07, development Mac, not the exhibition machine): Apple M6, headed Chromium 151.0.7922.34 (Playwright,
ANGLE Metal), Vite DEV, 1920×1080 viewport, deviceScaleFactor 1 (renderer pixel ratio 1), authored hero camera, canvas `data-fps`
(mean over 120 frames) sampled 5× at 2.5 s after 8 s warm-up: standalone `?hour=16` 56 FPS / 946 draws; `meters=nw:low` 53 / 1585;
`nw:0` 53 / 1585; `nw:high` 53 / 1601; `nw:high` at hour 21 52 / 1607. Triangles not recorded; console shows only the missing `/favicon.ico` 404, no page errors.
[report](../artifacts/street-traffic-automation/browser.json). Exhibition-machine FPS remains unmeasured.

## Current evidence and open acceptance

Road polish (2026-10-07, `feat/road-polish` from `4ced019`): a colour probe (road magenta, paving cyan, markings red) shows the hero frame already has no visible asphalt or painted markings — the avenues read as the pale paving slab — so the change adds only shared-surface inlays: stone seams at both carriageway edges and a mint guide per lane (two merged meshes, +2 draws). Root `npm test` (new inlay face-up/height check in [mobility tests](../tests/mobility.test.ts)), `npm run build`, `git diff --check` PASS. Development Mac headless Chrome via playwright-cli, 1280×720, `?hour=12`: [hero before](../artifacts/road-polish/before-hero.jpg)/[after](../artifacts/road-polish/after-hero.jpg) (inlays below hero resolution, as intended), [seaside avenue before](../artifacts/road-polish/before-sea.jpg)/[after](../artifacts/road-polish/after-sea.jpg) (`review=street&cam=40,22,-195`), [probe](../artifacts/road-polish/probe-hero.jpg); no console errors. Night, Meter states, FPS and the guideway avenue close-up (hidden under the guideway) NOT RUN; [handoff](handoffs/archive/road-polish.md).

Roof and interior life (2026-10-08, `feat/roof-interior-life` from `051614f`, uncommitted worktree): `odaiba.test.ts` checks every Fuji TV occupant on real floor or seat with headroom, every stroll/ride sample (shown part) supported, ≥ 0.8 m from standing and 1 m from seated people, lanes ≥ 0.95 m apart; Aqua City/DECKS roof residents on open roof, out of planting, meadow mounds and sail posts; and the drawn `building-occupants` fleet (1084 people) at hours 12/21, automation 0/1, over 150 s: full size or absent, no jumps, no stepping in place. Root `npm test`, `npm run build`, `git diff --check` PASS. Headless Chrome 154, 1400×900: [Fuji wing at dusk](../artifacts/roof-interior-life/fuji-wing-dusk.png), [theatre](../artifacts/roof-interior-life/fuji-theatre.png), [forum by day](../artifacts/roof-interior-life/fuji-forum-day.png); exhibition FPS NOT RUN; [handoff](handoffs/archive/roof-interior-life.md).

Meter scale lab and vote journey (2026-10-13, `feat/meter-scale-journey` from `a888082`, DEV-only prototype, not integrated): `tests/scaleLab.test.ts` checks seeded replay, the server reducer (#1 +1 → 7.5), seed folding, ×1 = server layout and Scale A band spread. Root and `survey/` `npm test`/`npm run build`, `git diff --check` PASS; production bundle has no lab chunk. Development Mac headless Chrome via playwright-core, 1280×720/DPR1, frozen `reviewTime`: [flight](../artifacts/meter-scale-journey/journey-1-flight.jpg), [scan](../artifacts/meter-scale-journey/journey-3-scan.jpg), [#40 current](../artifacts/meter-scale-journey/scale-current-40.jpg)/[Scale A](../artifacts/meter-scale-journey/scale-a-40.jpg), [night lanterns](../artifacts/meter-scale-journey/lanterns-night-120.jpg); only the known favicon 404. FPS, live survey and owner visual review NOT RUN; [handoff](handoffs/archive/meter-scale-journey.md).

Scale A adopted (2026-10-13, `feat/meter-scale-a` from `3c78210`): authoritative layout reads `clamp(M × g(n))`, g = 0.85 → 2.4 by guest #12 ([spec](EXHIBITION_SPEC.md)). New ramp/clamp tests in `exhibitionRules`, first-vote goldens in `meterContract`, P4 pipeline history kept below the cap. `survey/` and root `npm test`/`npm run build`, `git diff --check` PASS. Headless Chrome 1280×720 lab captures old vs Scale A at guests #1/#3/#40 ([#40 Scale A](../artifacts/meter-scale-a/guest40-a.jpg)); only the known favicon 404. Resident browser regressions and FPS NOT RUN; [handoff](handoffs/archive/meter-scale-a.md).

Vote journey live (2026-10-13, `feat/vote-journey` from `8566c10`): `tests/voteJourney.test.ts` checks journey + transition fit the reading slot with 4 s to spare and lantern placement; root/`survey/` tests and builds, `git diff --check` PASS. Scratch `dev:auto` server + headless Chrome 1280×720/DPR1: one real HTTP proposal shows orbs (0.9 s), pulses/scan and transition (3.6 s) with correct carrier evidence in the result card, then a `hour=21` reload rebuilds lanterns ([transition](../artifacts/vote-journey/live-3-transition.jpg)); only the known favicon 404. A/B and resident browser regressions, FPS and exhibition hardware NOT RUN; [handoff](handoffs/archive/vote-journey.md).

Fuji TV target v3 round6 (2026-10-07, `codex/fuji-tv-polish`, starting `8de6cf8` plus checked source SHA-256 `b8dd6961…049dc0`, not integrated): three Dream Loop Plus passes improve theatre screen/scenery, glazing ribs, live-studio sets and46 static forum/promenade visitors. Root `npm test`, `npm run build`, `git diff --check` PASS after each corrected pass; new actual-mesh support/headroom check caught and fixed promenade visitors below the Y=65 structural beam. Existing route/site/actor and81-answer real HTTP/WebSocket checks PASS. Development Mac headless Chrome154.0.8037.98, Apple M6 ANGLE Metal,1280×720/DPR1, actor40: all three civic16/22 comparisons, final hero16, all-low(−12)12, mixed(0)18.5, high(+12)22 and resize1440×900→1280×720 PASS. All10 capture records have no captured console/page/network errors; initial session favicon404 is recorded separately. [Final day](../artifacts/fuji-tv-polish/v3r6-pass3.jpg), [night](../artifacts/fuji-tv-polish/v3r6-pass3-night.jpg), [hero](../artifacts/fuji-tv-polish/v3r6-hero.jpg), [browser/geometry record](../artifacts/fuji-tv-polish/v3r6-browser.json), [handoff](handoffs/archive/fuji-tv-polish.md). Nine batches/2,853,564 triangles with unchanged bounds; no sustained FPS or exhibition-hardware claim. Target fidelity remains PARTIAL; interior simulation/access control and live survey browser NOT RUN. Unchanged survey/module-swap package suites not rerun.

Fuji TV target v3 round7 (2026-10-07, `codex/fuji-tv-polish`, starting `1198b2f` plus checked source SHA-256 `b037643b…6de09f`, not integrated): three Dream Loop Plus passes (Claude Opus workers; Fable unavailable without usage credits) open the escalators and sphere crown, remove flank braces/pier light squares, add glazed side studio galleries and a continuous warm wing back wall. Root `npm test`, `npm run build`, `git diff --check` PASS after each pass with no source fix needed. Development Mac headless Chrome154 via playwright-cli,1280×720/DPR1, actor40: civic16/22 for all three passes, final hero16, all-low(−12)12, mixed(0)18.5, high(+12)22 and resize1440×900→1280×720 PASS; all10 captures report0 console errors/warnings. [Final day](../artifacts/fuji-tv-polish/v3r7-pass3.jpg), [night](../artifacts/fuji-tv-polish/v3r7-pass3-night.jpg), [browser/geometry record](../artifacts/fuji-tv-polish/v3r7-browser.json), [handoff](handoffs/archive/fuji-tv-polish.md). Nine batches/3,143,944 triangles with unchanged bounds; no sustained FPS or exhibition-hardware claim. Target fidelity PARTIAL; survey/module-swap suites not rerun.

Fuji TV target v3 round8 (2026-10-07, `codex/fuji-tv-polish`, starting `7d263ce` plus checked source SHA-256 `9dbae83b…c69109`, not integrated): three Dream Loop Plus passes (Claude Opus workers) clear the glazing, rebalance warm/blue room light and dark umber depth, add a third studio level, a violet-to-navy theatre shell and blue glass escalator balustrades/fascias. Root `npm test`, `npm run build`, `git diff --check` PASS after each pass with no source fix needed. Development Mac headless Chrome154 via playwright-cli,1280×720/DPR1, actor40: civic16/22 for all three passes, final hero16, all-low(−12)12, mixed(0)18.5, high(+12)22 and resize1440×900→1280×720 PASS; all10 captures report0 console errors/warnings. [Final day](../artifacts/fuji-tv-polish/v3r8-pass3.jpg), [night](../artifacts/fuji-tv-polish/v3r8-pass3-night.jpg), [browser/geometry record](../artifacts/fuji-tv-polish/v3r8-browser.json), [handoff](handoffs/archive/fuji-tv-polish.md). Nine batches/3,166,444 triangles with unchanged bounds; no sustained FPS or exhibition-hardware claim. Target fidelity PARTIAL; survey/module-swap suites not rerun.

Fuji TV target v3 round9 (2026-10-07, `codex/fuji-tv-polish`, starting `7b37d43` plus checked source SHA-256 `9857573a…1f09a5`, not integrated): three Dream Loop Plus passes (Claude Opus workers) return the escalators to silver with navy trim, give the sphere navy ribs, a darker navy dome, extra can lights, violet seats and a full blue screen, and lower/desaturate room light with dark floors and deeper blue screens. Root `npm test`, `npm run build`, `git diff --check` PASS after each pass with no source fix needed. Development Mac headless Chrome154 via playwright-cli,1280×720/DPR1, actor40: civic16/22 for all three passes, final hero16, all-low(−12)12, mixed(0)18.5, high(+12)22 and resize1440×900→1280×720 PASS; all10 captures report0 console errors/warnings (final night retaken after a stale file). [Final day](../artifacts/fuji-tv-polish/v3r9-pass3.jpg), [night](../artifacts/fuji-tv-polish/v3r9-pass3-night.jpg), [browser/geometry record](../artifacts/fuji-tv-polish/v3r9-browser.json), [handoff](handoffs/archive/fuji-tv-polish.md). Nine batches/3,182,944 triangles with unchanged bounds; no sustained FPS or exhibition-hardware claim. Target fidelity PARTIAL; survey/module-swap suites not rerun.

Fuji TV target v3 (2026-10-07, feature `codex/fuji-tv-polish`, implementation `f504484`, not integrated): three new Dream Loop Plus passes against the user's selected image. Final root `npm test`, `npm run build`, `git diff --check` PASS after removing pass1's obsolete garden fragment. Actual-mesh checks now also sample standing headroom/support on both work wings and support beneath all14 forum visitors; batch limit is9 for the added shared broadcast finish. Existing route/berth/bridge/site/person/robot and81-answer HTTP/WebSocket checks PASS. Development Mac in-app browser,1280×720, actor40: civic16/22, authored hero16, all-low(−12)12, all-mixed(0)18.5 and all-high(+12)22; no captured console warnings/errors, including shader compile. Ordinary desktop resize1440×900 updates canvas/backing dimensions. [Final civic](../artifacts/fuji-tv-polish/v3-pass3.jpg), [night](../artifacts/fuji-tv-polish/v3-pass3-night.jpg), [hero](../artifacts/fuji-tv-polish/v3-hero.jpg), [browser JSON](../artifacts/fuji-tv-polish/v3-browser.json), [handoff](handoffs/archive/fuji-tv-polish.md). Geometry grows to1,711,564 triangles in9 batches with unchanged bounds; capture-time canvas diagnostics do not measure sustained FPS. Target fidelity remains partial; exhibition GPU/hardware, sustained performance, interior circulation/access control and live survey browser were not tested. Separate survey/module-swap suites not rerun because those packages are unchanged.

Fuji TV target v1 historical evidence (2026-10-07, integrated through `f64af18`): three Dream Loop Plus passes; root `npm test`, `npm run build` and `git diff --check` PASS after each pass's fixes. Existing actual-mesh checks cover sphere aerial/wing clearance, Aqua City bridge approach, four site sightlines, route and person/robot geometry; no new test framework. Development Mac in-app browser, 1280×720, actor time40: civic day16/night22, standalone hero16, all-low day12, all-mixed dusk18.5 and all-high night22; no console warning/error in checked views. [Final civic](../artifacts/fuji-tv-polish/pass3.jpg), [night](../artifacts/fuji-tv-polish/pass3-night.jpg), [hero](../artifacts/fuji-tv-polish/hero.jpg), [browser record](../artifacts/fuji-tv-polish/browser.json), [handoff](handoffs/archive/fuji-tv-polish.md). Generated target fidelity remains partial; FPS, exhibition hardware and live scratch-survey browser were not tested in this task. Root tests cover the real survey HTTP/WebSocket pipeline; survey/module-swap source unchanged and their separate suites not rerun.

Fuji TV integration (2026-10-07): merge `f64af182c0001335da941144fa80fb84b492cbe0` has identical source to the feature branch. Root tests/build and committed whitespace checks rerun PASS; build retains the existing >500kB warning. In-app browser on development Mac,1280×720, civic reviewTime40, day16/night22: visually checked, no console warnings/errors. A reload-control timeout was recovered by rebinding the tab. Working-headquarters target v2 remains a reference awaiting implementation; main publication/CI status is recorded in the [handoff](handoffs/archive/fuji-tv-polish.md).

| Stage | Evidence / known limits |
| --- | --- |
| S1–S4 | [S1](handoffs/archive/exhibition-s1.md), [S2](handoffs/archive/exhibition-s2.md), [S3](handoffs/archive/exhibition-s3.md), [S4](handoffs/archive/exhibition-s4.md); dated server/root/Guest acceptance, some visuals captured before Odaiba |
| Odaiba venue P0–P5 | [venue handoff](handoffs/odaiba-venue.md), [transition record](ODAIBA_VENUE_TRANSITION.md); integrated `e6c7966`; P6/S5 not completed |
| Odaiba art / Dream Loop | [first pass](handoffs/archive/odaiba-art-direction-01.md), [loop](handoffs/archive/odaiba-dream-loop.md), [later target/rounds](handoffs/odaiba-dream-loop-2.md); preserve unmet visual-target limitations |
| Hero district / connected backdrop | [district handoff](handoffs/archive/odaiba-district.md); integration `f2826cc`; earlier dissolve-to-island superseded |
| Meter P0–P12 | [Meter handoff](handoffs/archive/meter-variety.md); main integration `e7afbee`, published `68b669a`, main CI [36954967651](https://github.com/cc100053/city2127/actions/runs/36954967651); accepted weak sharing differences remain |
| Lifecycle / display / Admin | [lifecycle](handoffs/archive/exhibition-lifecycle.md), [day/night](handoffs/archive/admin-day-night.md), [Japanese UI](handoffs/archive/admin-japanese.md) |
| Single automatic handoff / Undo | [next-start](handoffs/archive/remove-guest-exit-lock.md), [Undo](handoffs/archive/admin-undo.md); A/B supersession noted in each |
| Concurrent A/B | [two stations](handoffs/archive/two-guest-devices.md); integration `45fcde7`, main CI [36976457465](https://github.com/cc100053/city2127/actions/runs/36976457465) |
| DEV-only runner / pipeline | [auto-tests](handoffs/archive/survey-auto-tests.md); temporary exhibition removal still required |
| Documentation consolidation | [this task](handoffs/archive/odaiba-docs-consolidation.md); prose/link verification, not new runtime acceptance |
| Resident narrative P1 (2026-10-02) | [copy](RESIDENT_COPY.md), [handoff](handoffs/archive/resident-copy-p1.md); documentation only, new screen/copy wiring and reading-time/iPad acceptance remain untested |
| Resident experience plan (2026-10-02) | [P1–P5 plan](RESIDENT_EXPERIENCE_PLAN.md), [handoff](handoffs/archive/resident-experience-plan.md); documentation evidence only; proposed P2–P5 acceptance is not a passing runtime/device check |
| Resident P2 (2026-10-02) | [P2 handoff](handoffs/archive/resident-experience-p2.md); root/survey tests/build, real SQLite question2→3 history/retry, Chrome1280×720 old A/B draft/keyboard/review, single Undo and A/B reset/cancel/lost-response regressions; new screen evidence below. P3/P4/P5 remain open |

P2 current checks: question-set version3 keeps ids/effects and original history; Guest result has no viewing table and shares `ステーション A/B · 暮らしの声 #n` with City. Native radio selection/focus/review edit and pre/post-commit network loss retain the request ID. City background/focal facility cards use actual quantities, lifetime count alone never enables inherited-run copy, and reload/reset/Undo replaces an old result. That P2 local-card timeout did not reserve10s between results; the P3 record below supersedes its scheduling/lease/causal limits.

New 2026-10-02 desktop evidence (Chrome1280×720, root `?hour=16`, scratch SQLite; exact checked commit in P2 handoff): [question](../artifacts/resident-p2-question-A.png), [review](../artifacts/resident-p2-review.png), [look up](../artifacts/resident-p2-look-up.png), [ambient city](../artifacts/resident-p2-city-ambient.png), [facility](../artifacts/resident-p2-city-facility.png), [result](../artifacts/resident-p2-city-result.png). Panel coverage checked below16% at1280×720; screenshots visually reviewed. This does not measure real viewing distance, FPS, touch hardware, Safari or reading comprehension. Browser scripts report page exceptions; deliberate aborted submission requests are test inputs.

P3 (2026-10-02): [handoff](handoffs/archive/resident-experience-p3.md) records coordinated single/A-B reading10s, separate city motion3s, result lease fixed15s, remaining-time retry/reload and early-handoff protection. Renderer evidence compares effective visible carrier configurations, not scores/seed alone; same-score distribution, direction-only and maintained results are checked. Root/survey native tests/build and scratch Chrome1280×720 checks cover A/B lost reply/reload, ordered reading (10,024ms initial /10,006ms repeat; existing A/B regression10,001ms), reset drain, lighting, immediate reduced-motion/reload/Undo, plus P2 old-copy/keyboard and single Admin Undo regressions. Exact final verification/integration/CI and any later changes are in the handoff; initial failures are recorded separately, not claimed as passes.

New P3 screenshots: [A reason](../artifacts/resident-p3-city-A-reason.png), [B waiting](../artifacts/resident-p3-guest-B-waiting.png), [B reason](../artifacts/resident-p3-city-B-reason.png), [B look up](../artifacts/resident-p3-guest-B-look-up.png). Visually reviewed at Chrome1280×720, deviceScaleFactor1, root `?hour=16`; no geometry/camera changes. The browser check uses its own temporary real SQLite/server, installed Playwright via `CITY2127_PLAYWRIGHT_PATH` and the running root preview; use `CITY2127_EVIDENCE_DIR` to preserve previous evidence. These checks do not complete P4's comprehensive matrix or P5 hardware/reading/understanding; no FPS/Safari/iPad/Windows claim.

P4 (2026-10-02): [handoff](handoffs/archive/resident-experience-p4.md) maps every resident-plan case to new native/browser evidence. Root/survey tests/build plus P2/P3/A-B/Admin Undo/P4 scratch-browser checks PASS; P3 ordered reading10,007ms, A/B10,011ms initial,10,004ms A-first and10,011ms explicit B-first. The real Meter pipeline now connects 81 answers, maintained/new-run baselines, accumulated direction-only, mixed/opposing preference/high collective city and equal-score/different-distribution to resident reasons and actual carrier targets. A/B checks follow whichever station commits first. New P4 browser covers keyboard/desktop-emulated touch/review, failed save/same-ID retry, next-guest inheritance, real City TCP disconnect/reconnect, offline B result expiry retaining A draft, then A questionnaire expiry/reset/admission. Lease jumps16,000/300,000ms test server recovery; they do not measure visitor time. Exact final checked commits, CI and repeated timing belong in the handoff.

New P4 evidence (Chrome154.0.8037.93, viewport1280×720, deviceScaleFactor1, fixed hero/hour16): [A/B city](../artifacts/resident-p4-two-stations-city.png), [B waiting](../artifacts/resident-p4-guest-B-waiting.png), [review](../artifacts/resident-p4-single-review.png), [save/retry](../artifacts/resident-p4-save-retry.png), [maintained result](../artifacts/resident-p4-maintained-city.png), [reconnected city](../artifacts/resident-p4-reconnected-city.png), [expiry/reset city](../artifacts/resident-p4-expired-reset-city.png), [console/network JSON](../artifacts/resident-p4-browser.json). Save/retry is a full-page capture; viewport remains1280×720. No page exceptions or unexpected resource/API errors; existing missing `/favicon.ico`404 and deliberately aborted POST/offline WebSocket are explicitly recorded. Hardware/Safari/LAN/visitor understanding/long-run/FPS/Windows remain unverified.

P4 browser starts its own temporary real SQLite/server and uses the existing project City preview. Set `CITY2127_PLAYWRIGHT_PATH` to an already installed Playwright `index.mjs`; optional `CITY2127_CITY_URL` selects the preview, `CITY2127_EVIDENCE_DIR` preserves previous screenshots and `CITY2127_CHECKED_COMMIT` records the checked baseline/commit. Run `node tests/residentP4.browser.mjs` after building survey. Do not use the exhibition database for destructive checks.

P5（2026-10-02）：[實機驗收表／交接](handoffs/resident-experience-p5.md) 記錄預計65吋HDMI／約4米／兩部iPad／Mac mini M6配置；使用者指定兩部iPad接收主機輸出，D0先驗雙路獨立畫面／觸控，再驗睡眠／復原、閱讀／理解、長跑及政策。全部實機項目仍為 NOT RUN；P4模擬觸控、clock jumps或CI不替代實機證據。

City readability (2026-10-04, branch `fix/city-readability`): resident card moved top-right, site-only pulse shafts, night intro halo. Root `npm test`／`npm run build`／`git diff --check` PASS; P3 browser PASS (Chrome1280×720, hour16, ordered reading 10,017ms) with new evidence in [artifacts/readability](../artifacts/readability) — [A reason](../artifacts/readability/resident-p3-city-A-reason.png), [pulse before](../artifacts/readability/pulse-before-1920.png)／[after](../artifacts/readability/pulse-site-focus-1920.png) (Chrome1920×1080 `?meters`, 0→5 all axes, 0.7s), [night intro](../artifacts/readability/night-intro-1920.png). Focal-site screen positions computed from `heroCamera` at 1280×720／1920×1080／3840×2160 all fall left of x = viewport − 404. No FPS／hardware claim.

**Still open:** S5 full exhibition acceptance, actual input hardware, exhibition-day reset/recovery policy, sustained runtime/device testing. Use current browser procedures and the P5 handoff above; do not reopen old Shibuya tasks.

## Historical evidence (not exhibition acceptance)

All pre-consolidation dated entries and screenshots are retained in [validation snapshot through 2026-10-02](history/VALIDATION_2026-10-02.md), with original headings for old deep links. Its “current prototype” procedures and next steps describe historical stages and must not be executed as today's acceptance plan. The old [implementation snapshot](history/PROJECT_2026-10-02.md), [MVP plan](history/EXHIBITION_MVP.md), [Shibuya Plan 02](history/SHIBUYA_PLAN02.md) and [Plan 01](SHIBUYA.md) preserve decisions/evidence without creating future Shibuya work.

## Task handoff verification

Use one named owner and [handoff template](handoffs/TEMPLATE.md). Record preflight branch/HEAD, fresh remote refs/divergence, scope, checked commit/worktree, actual commands/evidence, unrun checks, integrated commit/CI and next step. Preserve each task separately; document integration completion independently from visual/hardware acceptance. Full handoff navigation: [open tasks](handoffs/README.md) / [archived task evidence](handoffs/archive/README.md). Archiving completed/superseded handoffs preserves their dates, commits and unverified limits; it does not complete visual or hardware acceptance.

## Energy E2 static study — 2026-10-24

DEV `?energy=baseline|a|b|c|mixed&hour=12&reviewTime=20`：在原hero固定五配置，與survey／meters／scaleLab隔離；production build移除工具。實作／實際commit及整合結果見[energy-city交接](handoffs/energy-city.md)，[截圖與環境](../artifacts/energy-city-e2/README.md)。

- Root `npm test`包含[energyPrototype.test.ts](../tests/energyPrototype.test.ts)：五配置／物件重用、19個共享材質batch、rotor獨立且不碰實際civicCore、320秒每0.5秒全部可見船體保守包圍盒（21,595個）、22 m飛行走廊／sphere及水面泊位、公共路／deck、六座water rooms與連岸路、beacons、新水庭步道對真實tidal-edge淨空、四站hero視線及原畫框。
- Desktop 1920×1080：五種日景、混合18.5／22及水庭近景；選單切換及URL保存正常，console沒有error／warn。日景輪廓可分辨；管線／渦輪需近景，夜間細節仍為量體階段。一般standalone／Meter優先隔離檢查依交接記錄。
- 不聲稱連續碰撞、完整旋轉掃掠、工程容量／可行性、硬件FPS、Safari／iPad或E3／E4完成。E2沒有新動態；原城市actor保持原有路線。測試／瀏覽器結果只證明本輪靜態幾何及所列桌面情境。

## Energy E3 composition and motion — 2026-10-24

沿用隔離DEV五配置與原hero，`reviewTime=10|30|50`固定充能／暫存／釋能；面板「靜態閱讀」與系統reduced motion使用同一固定分支。新證據見[截圖／情境紀錄](../artifacts/energy-city-e3/README.md)，實際驗證commit、整合／CI見[交接](handoffs/energy-city.md)。

- Root test涵蓋五配置／共享mesh、絕對時間重播、水位方向／範圍、環角度跨20／40／60秒連續、釋能向岸配電／C獨立供電、全部能源transform及flow instances靜止不變。
- 富士環用內半徑29／外33 m、厚3 m保守全周掃掠檢查真實civicCore及固定軸承；兩庭渦輪用半徑2.3 m／厚0.9 m圓盤檢查固定室／支承。掃掠同樣檢查既有船體／公共／航空通道與泊位；兩條新步道對真實tidal-edge檢查，全部mesh頂點留在原hero畫框。保持六座rooms與連岸路、beacons及四站hero視線。
- 本機Codex in-app Chromium／WebGL2、1920×1080、預設quality：五日景、M1 18.5／22、近景充能10／暫存30／釋能50與靜態閱讀；console error／warn、實時階段、模式隔離及一般desktop resize記錄在artifact／handoff。OS全域reduced-motion設定未改，瀏覽器用原生核取框測相同靜態更新分支。
- 流向是標記、水位是視覺位移；未模擬完整電網／流體、連續全城碰撞、容量／損耗／可靠度或海岸工程。沒有測展覽硬件、FPS、Safari／iPad；小機械需近景。正式問卷／Meter與後端維持現況，E4／E5不在本輪交付。

## Energy E4 model preparation — 2026-10-24（未完成E4）

Root `npm test`／`npm run build`／`git diff --check` PASS。新增36種獨立配置的實際visibility、翼比例、配電條件、目標副本隔離及mesh UUID重用檢查；沿用完整E3幾何／動態檢查。macOS Codex in-app Chromium／WebGL2、1280×720、原hero、hour12／reviewTime50：五DEV預設與靜態閱讀回歸通過，captured console warn／error為空。[證據](../artifacts/energy-city-e4/README.md)只證明模型接口準備；正式問題／權威資料鏈、scratch歷史／migration與正式瀏覽器驗收尚未接入，E5硬件／FPS未測。產品取捨及分支狀態見[能源交接](handoffs/energy-city.md)。


## Energy E4 formal authority — 2026-10-24

正式question-set4只替換Q3，CityView／algorithm2及SQLite8；能源獨立累計，保留舊氣候分數／EMA與刻度人數。Root舊81組加新108組、survey完整native tests與兩package build需要在最終及整合tree通過；實際verified commit／命令結果見[交接](handoffs/energy-city.md)。新增energy.test驗真實schema7→8／原文／舊ID／replay／氣候凍結／超過64筆counts／Undo／reset；energyPipeline用實際模型驗四題→權威→parser→模型→前後證據，並驗資源重用、固定橋高、延遲／淡入及reduced motion。

正式[瀏覽器矩陣與圖像](../artifacts/energy-city-e4/formal/README.md)：macOS已安裝Chrome156.0.8078.47 headless／WebGL2，City1920×1080預設quality／原hero、Guest1280×900，hour12／18.5／22，實時actor clock（未固定或另記每張actor秒數）。真實scratch schema7→8舊草稿／原文／已保存ID，新Q3四個native radios／核對、pre/post-commit同ID重試、首票無設備差異／第二票一庭及結果、能源Undo、16份有效能源提案四類各4的混合snapshot、TCP重連、browser reduced-motion、普通resize1440×900、reset及舊ID恢復全部PASS。Exceptions為0；預期obsolete-session409、favicon404及兩次注入abort明列，沒有未預期console／network失敗。不用DEV圖證明正式接入。

P3在現行v4回歸PASS：Chrome1280×720、hour16，實測A/B閱讀間隔10,002ms；排序、lost reply／reload、提前交接、reset drain、照明與立即恢復。P4／P2亦在目前v4回歸PASS，涵蓋舊A/B草稿、native鍵盤／桌面模擬觸控、核對、未知提交重試、離線站結果／問卷到期及reset；新證據分別保存於energy-city-e4/p4及p2，未覆寫歷史截圖。新增energyDistrict檢查兩種翼尺寸、seed0／4242、四軸三band共324情境，164,088次實際幾何檢查，能源最大組合與完整轉子掃掠對程序district／fallback focal無交集；不宣稱所有late roofs／GLB、任意seed或全城連續碰撞。最終commit及source hashes見handoff。GPU／FPS、實際展覽硬件、Safari／iPad／Windows、OS全域motion偏好及訪客理解未驗；E5維持開放。

重跑：先build survey，開root本機預覽，使用既有Playwright安裝；設定`CITY2127_PLAYWRIGHT_PATH`指向其index.mjs，可用`CITY2127_CITY_URL`選預覽、`CITY2127_EVIDENCE_DIR`選新證據資料夾、`CITY2127_CHECKED_COMMIT`記基準，然後`node tests/energyE4.browser.mjs`。該script建立並清理自己的scratch DB／server／browser，不使用展覽SQLite；本機需允許localhost listen及已安裝Chrome。P2亦支援證據資料夾，避免覆寫舊截圖。


## Energy E5 Mac mini baseline — 2026-10-24

使用者限定先測目前Mac。Mac mini Mac18,5／Apple M6（12 GPU cores）／24GB／macOS27.0.1、Chrome156.0.8078.47 **headed**、ANGLE Metal／WebGL2，Vite DEV、City1920×1080／DPR1／Guest A/B1280×900。原hero起始但OrbitControls未鎖定，截圖顯示視角有變，故不是完全固定鏡頭benchmark；不推算能源額外成本或其他視角效能。三個Meter中間答案，四類能源正式共存。60秒零提案／混合default31.10／32.36 FPS，low均59.94 FPS。low自動日夜1801.94秒／108,008frames，平均59.94，p95／p99 17.9／18.6ms，max66.7ms，每5秒讀取的120幀renderer FPS樣本59.8–60.1；90份原生UI A/B＋16份真實HTTP種子，count106，server各對展示排程差10,000ms。每5秒renderer counts425 geometries／24 textures不變，JS heap19.2–51.8MiB，沒有page crash／exception／context loss；只有3個favicon404 console訊息。[方法、完整資料及鏡頭／記憶體限制](../artifacts/energy-city-e5/README.md)，[交接](handoffs/energy-city.md)。獨立1分鐘runner補驗：真實City TCP切斷＋offline3秒後新connection5→6，count20與能源target／reload恢復，只有預期favicon404及offline錯誤。最終runner另驗pointer input保護／繼續render及拒絕覆寫舊證據；raw舊row.fps為每120幀renderer均值，新runner將rendererFps與rAF fps分開。Root完整npm test（含E5統計self-check）／build通過，僅既有>500kB chunk warning；Git整合紀錄見交接。

可重跑`node tests/energyE5.browser.mjs --self-test`；完整headed browser runner的Playwright path、scratch／Vite及證據目錄設定見artifact README。30分鐘不代表整日穩定性，4K／所有Meter與能源極值、65吋HDMI／iPad Safari／專用LAN／真人閱讀理解仍未驗。E5／P5／S5不因此完成。

## 儲能環 polish 恢復續作 — 2026-10-25

首輪恢復source5255520已在獨立clone重跑root test/build/diff PASS；108正式權威模型及324 district／170424 exact checks、r29–33／depth±1.5全周與固定承托、船／航空／泊位／公共／四站視線均未放寬。Chrome156 headless／WebGL2、1920×1080 DPR1 default：新DEV27原圖及正式scratch runner PASS，包含native static、live兩時點、固定三phase、日暮夜及正式歷史／retry／Undo／reconnect／reduced-motion／reset。首次並行formal reduced-page30秒timeout及DEV未完成static讀取均保留；未修改原正式runner門檻，單獨重跑通過。固定時間static兩張PNG hash一致；其他live城市actor仍會動。

逐輪source hash、完整PNG／raw log／JSON、實際checkpoint／清理與總指揮review狀態見 [儲能環交接](handoffs/storage-ring-polish.md) 及 [新證據](../artifacts/energy-city-polish/storage-ring-recovered-20261025/README.md)。沒有新FPS／展覽硬件／Safari／iPad／Windows／工程或target達成宣稱；survey build僅作scratch fixture，source未改。

第二輪原候選47cf4d5亦完成同一完整root／DEV27圖／正式gate PASS（47 batches，108／324／170424）；環外source未變。原正式runner的reduced新頁30秒timeout可再次出現：現只在該段先釋放舊City renderer，再恢復hour22及額外核對同一model(view)。原assertions／quality／30與45秒門檻保留，沒有放寬tests；失敗原runner、圖及新排程成功證據同存pass2。詳細限制沿用上段與handoff。

第三輪source27c1e4f（真正same-chat fresh gpt-6-astra/low worker、owner驗收）完整root test/build/base-diff、DEV27原PNG及正式scratch gate PASS；48 batches、theatre gap30.50m、108／324／170424。環外source與原target逐byte保持；static兩圖相同，live29.15→35.10秒。延續上段renderer排程，原assertions／quality／timeout未改；所測平台／原圖、source commit／bundle／hash／服務清理與未驗項目均在儲能環handoff。三輪後停止，target審美review／硬件／工程／新FPS未完成，沒有push／main整合。

## 軌道接收翼準備 — 2026-10-25（未實作）

只新增[baseline／imagegen target及保存紀錄](../artifacts/energy-city-polish/receiver-wing-batch-01/README.md)，[owner交接](handoffs/receiver-wing-polish.md)。source維持5db4e6e／SHA27c1e4f，runtime/tests未變；Chrome156 headless／ANGLE Metal Apple M6／WebGL2、1920×1080 DPR1 default，原hero mixed日景及接收翼大小版日景／大型夜景。第一組detail觸發既有相機district clamp，保留失效構圖後以合法aim重拍；沒有改相機source。無page exception／failed request／非預期console，僅favicon404。這是準備baseline，不是新實作回歸或目標達成；本輪未重跑test/build／正式pipeline／FPS／硬件。等待另授權重型Plus三輪。

接收翼第一輪（source0f1941bd）：root test/build/diff、原大小版AABB／翼外hash、33 DEV原圖與原正式scratch gate PASS；49 batches、108／324／170775，固定static PNG一致，live21.20→26.22秒。原tests／timeouts未改，只有預期404／obsolete409／注入abort。實測平台／清理／未驗限制及逐輪commit／備份見接收翼handoff，並非新FPS或工程驗收。

接收翼第二輪（sourcede556764）：相同完整root／包絡／scope hash／DEV33／原正式gate PASS，49 batches／108／324／170775；static PNG一致、live21.39→28.88秒，僅預期browser錯誤，原assertions／quality／timeout不變。逐輪原圖、限制、清理及本機backup見接收翼handoff。

接收翼第三輪（source01987a48）：完整root test/build/diff／原大小版AABB／protected hashes、DEV33原圖及原正式scratch gate全部PASS，49 batches／108／324／170775；static PNG一致、live21.45→26.50秒。三輪合共99張DEV新原圖，原tests／quality／timeout不變，沒有新增global光源或用途。三輪後停止等coordinator review，逐輪source commit／final metadata commit／bundle／archive與未驗限制見接收翼handoff。


## 儲能環夜間可讀性一次試驗 — 2026-10-25（未採用）

Trial source29168309的root test/build/diff、exact環外source／全energy幾何／環外與shared材質保護、原DEV27圖及原正式scratch gate PASS；49 batches、108／324／170775。Before／trial各27張1920×1080 DPR1 default原圖、21組固定URL／time配對及全部54個PNG hash核實，兩輪固定static均一致；Chrome156.0.8078.47 headless／ANGLE Metal Apple M6／WebGL2，沒有未預期DEV錯誤，formal exceptions0，只有既有favicon404／obsolete409／注入abort。Owner原尺寸hero/day/night review判定夜間改善不足、日景銀邊減弱，因此不採用候選並逐byte還原01987a48 baseline。初版artifact checker的JSON undefined比對失敗及修正完整保留，原runtime tests未改；還原狀態的額外實測、所有raw logs／原圖／diff／target及備份verify見[handoff](handoffs/ring-night-readability.md)與[證據入口](../artifacts/energy-city-polish/ring-night-readability-20261025/README.md)。軟件gate不等於視覺接受，夜間缺口仍開放；沒有新FPS／工程／硬件／Safari／iPad／Windows／真人理解或main CI宣稱。


2026-10-25 發布更新：使用者已明確要求推送能源polish及整合main，先前本機-only狀態由[本次整合交接](handoffs/energy-polish-integration.md)取代。既有runtime未再修改；root test/build／正式scratch browser已重跑PASS，整合後驗證、main CI與安全刪分支的實際結果統一記在該交接，原target／夜間可讀性／硬件限制保留。


## 住宅城市 H0 候選與基準 — 2026-10-26（已簽收）

住宅runtime未改。[H0原圖與詳細方法](../artifacts/housing-city-h0/README.md)以615ad98既有城市、四軸0／seed0、四類能源共存、鎖定原hero、hour12／reviewTime20，檢查三處24×18m／最高28m候選框。最終Chrome156 headless／ANGLE Metal Apple M6／WebGL2、1920×1080 DPR1 low：10秒rAF平均60.08 FPS、431 geometries／24 textures／486 calls／8,699,769 triangles；page errors／console warnings均0。12項四站中心視線及候選表面、九點承托／上方淨空、離散mobility走廊篩選PASS。這不是連續全掃掠、整個focal輪廓、live soak或H1模型驗收。

H0設計矩陣、Q4區隔、夜間方案與新增資源／最低50 FPS預算已由cc100053於2026-10-26簽收；H1–H3尚未實作。使用者已選90秒多年更新壓縮循環。Node runner語法檢查PASS；root build PASS（既有>500kB chunk warning）。首次root test在sandbox localhost listen遇EPERM；獲准重跑完整root npm test PASS；diff／本地連結／原圖manifest PASS，Vite5188與browser均已清理。checkpoint及恢復狀態由[交接](handoffs/housing-city.md)記錄。survey／module-swap source未改。未測default FPS、展覽硬件、Safari／iPad／Windows或結構工程。


## 住宅城市 H1 靜態比較 — 2026-10-26（已簽收）

[H1原圖／環境／完整logs](../artifacts/housing-city-h1/README.md)：root npm test／build PASS，final source hashes closure核對一致；五配置、三處24×18m／28m實際頂點、共享資源、實際Odaiba／district／全能源BVH碰撞、mobility曲線≤0.5m採樣包絡及20項focal視線PASS。Chrome156 headless／ANGLE Metal Apple M6／WebGL2、1920×1080 DPR1 default日12／暮17／夜21及三類近景，原hero鎖定；模式隔離、普通resize、reduced-motion及切換資源重用PASS。全新low baseline對mixed各30秒，住宅增量20 geometries／0 textures／21 calls／131940 triangles，mixed約60.03 FPS，無未預期browser錯誤。cc100053已明確簽收H1並指示繼續H1b／H2。

H1b完整小屋／藻類／橫向骨架及H2全掃掠尚未驗；靜態actor位姿不代表全部時間。正式問卷及其他package未改，未重跑其獨立suite；展覽硬件／Safari／iPad／Windows、工程及訪客理解未測。


## 住宅城市 H1b 次設計 — 2026-10-26（coordinator review通過）

[H1b原圖／方法／完整logs](../artifacts/housing-city-h1b/README.md)：保留已簽收H1主設計，加一組橫向共享骨架、藻類循環設備、完整小屋／雙底座及專用更新軌。Root npm test／build PASS；三區所有頂點與兩停泊端點、資源重用、非自發光、實際Odaiba／district／全能源BVH碰撞、既有交通包絡及20條focal視線通過。另驗y≥3.35m的小屋本體預留通道25個位姿；軌／底鞋／接駁接口及H2完整動作掃掠未驗。

Chrome156 headless／ANGLE Metal Apple M6／WebGL2、1920×1080 DPR1 default：五配置hour12／17／21、六處近景及藻類夜景、locked原hero／drag、普通resize、reduced-motion、互斥模式及資源重用PASS。實際runtime含skyways／已發布入口及reviewTime20靜態actor：7086項精確比較、475項本體通道近測，hits0；25原圖／6份source hash一致，無exception／warning／failed request。全新low baseline對mixed各30秒，60.0143／60.0163 FPS；全住宅renderer增量36 geometries／0 textures／38 calls／133416 triangles，在H0整體上限內，geometry額度已滿。Node幾何133344 triangles與renderer因透光面重畫相差72；default FPS未量。

Coordinator已核對diff、source hashes與mixed日夜及三個次設計近景，接受軟件批次；未冒稱人類視覺簽收。部分近景保留原樹／高架遮擋。H2動畫／全掃掠、展覽硬件／Safari／iPad／Windows、工程及訪客理解未驗，沒有正式接入或main CI宣稱。

### Housing H2（2026-10-27，DEV動態；coordinator review通過）

[本批方法／原圖／logs](../artifacts/housing-city-h2/README.md)：90秒明示「多年更新壓縮示意」，U生活艙透過前側吊運門架／下承叉架在兩socket之間實際交換，完整小屋沿專用更新軌搬遷；水電先斷開後移動，停泊後接通。原主體、公共廊、M／P與靜態植物／藻類保留。靜態閱讀／reduced motion／重設都回A停泊，重播重置相對時間；固定`reviewTime`沿用既有慣例。

Root `npm test`／`npm run build`與diff check PASS（只有既有chunk warning）；Node全住宅50 meshes／30 geometries／128580 triangles，資源identity全程不變。兩移動組件之間以分段線性相對時間不等式連續檢查，只容許量化的吊索端點固定接觸。對原城／固定住宅完整680個掃掠盒涵蓋底鞋、叉架、吊車、吊索與plug，不再只驗上半部；Node真實GLB／civic／district／全能源／四站／完整skyways做7544項精確檢查、10923項掃掠近測、20條hero focal視線PASS。全部交通曲線≤0.5m弧長採樣＋保守包絡涵蓋中間位置；實際fleet另按90秒每0.5秒、日12／夜21取5204836個mesh／instance邊界，沒有隱藏actor。後者屬離散補充檢查，不宣稱所有actor的任意時間連續幾何證明。

Chrome156 headless／ANGLE Metal Apple M6／WebGL2，1920×1080 DPR1：default原hero日12／暮17／夜21、交換艙及小屋A／途中／B近景；low實城7964項精確檢查及11265項掃掠近測、hits0。靜態／reduced motion／重設重播／一般resize及模式優先序另驗；survey入口互斥用隔離mock WebSocket，不代表重跑正式survey流程。production bundle沒有住宅DEV source markers。全新low baseline 30.0013秒平均60.0307 FPS，動態91.0013秒平均60.0101 FPS、覆蓋全部11狀態；[原始intervals](../artifacts/housing-city-h2/final/performance.json)。全新baseline同幀配對在8個停泊／搬運時間均為住宅增量30 geometries／0 textures／51 calls／128652 rendered triangles，符合H0上限；Node與renderer差72為透光面額外繪製。完整renderer配對量測、source hashes及錯誤記錄由[獨立結果](../artifacts/housing-city-h2/result.json)連入。

未測default sustained FPS、展覽硬件、Safari／iPad／Windows、訪客理解或工程／生態／無障礙法規；survey／module-swap source未改，未另跑其獨立suite。H2實作／軟件檢查不代替人類視覺簽收，H3正式背景／偏好／累積歸屬仍待人類決定；本批不整合main或部署。

2026-10-27 coordinator核對H2原碼／測試diff、18原PNG及source hashes、mobile搬運／停泊、小屋途中與hero夜景，接受此軟件批次；所有writer／services已釋放，H3交由fresh coordinator評估。未冒稱人類視覺或展覽實機簽收。

## 住宅城市 H3 收斂評估 — 2026-10-27（coordinator已接受）

[H3報告／正式選項](../artifacts/housing-city-h3/README.md)：直接查看H1／H1b／H2各8張原PNG及R01／R06，分別評估三類與mixed的數量、位置、輪廓、日暮夜及原城共存；沒有驗收必需的小修，source／asset未改。主鏡頭可定位低層新增量體，藻類循環、水電接駁及多年更新機理仍依賴近景／說明，藻類近景原樹局部遮擋亦保留；未作訪客理解測試。建議A固定背景／U停泊A、循環留DEV，另列B保留DEV待居住偏好設計及C四題替換／權威累積；正式方案未選定，production住宅仍排除。

[本批證據核對](../artifacts/housing-city-h3/evidence-check.json)確認H2現檔9份source及18原PNG hashes一致；H1／H1b所有原圖與各自browser記錄相符、source hashes與歷史commit相符，M／P及共享骨架／藻類構造區段自H1b未改。舊圖只作設計沿革比較，U現況與資源／性能以上方H2為準；本批未重跑tests／build／browser、未重拍／覆寫原圖。文件本地targets／anchors／tracked targets、來源事實及diff檢查由[獨立結果](../artifacts/housing-city-h3/result.json)記錄。固定中值／seed0與全能源的H2通過結果，不證明正式所有狀態／轉場共存；default sustained FPS、展覽硬件、其他平台、訪客理解及工程限制保持。


## 住宅 DEV-only 整合 — 2026-10-27

[整合紀錄](../artifacts/housing-city-integration/README.md)記錄feature／整合root checks及main CI實際結果。Feature root `npm test`／`npm run build` PASS；首次sandbox因localhost listen EPERM中斷，取得權限後完整重跑成功。Production住宅source markers仍排除。H2後runtime／tests／package完全相同，9份source與18原PNG hashes核對一致，保留H2有效browser／性能證據，未作新FPS量測或重拍；固定中值／seed0及平台限制不變。H3已coordinator接受；正式A／B／C仍待人類選定，沒有正式render／資料鏈／問卷或部署變更。

整合結果 `1aa3d7f` 已push並fetch核對；[main CI 40368091018](https://github.com/cc100053/city2127/actions/runs/40368091018)實際completed／success，root／survey／module-swap及whitespace全部通過。後續交付紀錄不改runtime；詳細SHA、logs及release見整合result。


## Housing A 正式固定背景 — 2026-10-27

人類選A後，新增共存檢查發現原M `(-135,-175)`穿過低automation服務館樓板；依人類後續指示保留服務館，把同一M構造移至`(-165,-165)`。正式mixed三區、U停泊A；問卷／權威／投票結果不讀或改住宅，90秒循環留DEV。

Root `npm test`／`npm run build`／production有固定住宅且DEV控制排除／`git diff --check` PASS。新增324個四軸band × 4 seeds snapshot及28個hybrid過渡樣本，共352狀態；7482精確幾何檢查、交通包絡12近測、20條focal視線及原H2全掃掠／日夜actor補驗通過。原H0–H3證據不冒充新位置驗證；有限seed／過渡樣本不是所有任意狀態證明。

[本批原圖／logs／方法](../artifacts/housing-background/README.md)及[最終browser結果](../artifacts/housing-background/release/browser.json)：production preview＋獨立scratch真實survey，live／Undo／city reset／full reset／TCP斷線重連／reload／reduced motion／普通resize保持固定住宅及資源；結果沒有住宅變化聲稱。DEV另驗24秒搬運及靜態／重播／重設／reduced motion，沒有重複背景。查看新hero日12／暮17／夜21及同鏡頭M搬前／搬後近景，服務館／P/U保留。Chrome156 headless／ANGLE Metal Apple M6、1920×1080 DPR1，各30秒短測low60.0197 FPS、default35.7305 FPS；low達H0≥50，default未達50，長時間展覽硬件性能仍未驗。非預期console/page/network errors0；既有favicon404及人為離線WebSocket診斷分別記錄。

Survey／module-swap source未改，未另跑本機獨立suite；整合與main CI結果見本批報告／交接。沒有部署；未測HDMI、Safari／iPad／Windows、訪客理解、結構／生態／消防／無障礙工程及新增居民實際路徑。

2026-10-27 A整合完成：feature `d83ee62`、無衝突merge `ba54961` tree相同；整合後root test/build/committed whitespace PASS。Main `7ea9ec0100bebd24a1e9144dde1b9006bc23995a`的[CI 40421964460](https://github.com/cc100053/city2127/actions/runs/40421964460)實際completed／success，root／survey／module-swap及whitespace全部通過。後續僅Markdown紀錄，依paths規則skip；runtime及最終browser source hashes不變。所有owned services停止。

## 分級階梯＋headline — 2026-10-27

`feat/meter-ladder`（base `047cb2c`），[handoff](handoffs/meter-ladder.md)。User 批准咗：±3 格、|D| 1.5／4／7、遲滯 2、每份提案最多一格。

**分佈模擬：** 用 [ladderSim](../survey/scripts/ladderSim.ts) 跑真 reducer、seed fold、`ladderStep` 同 `ladderLayout`，200 輪 × 40 位有偏向嘅訪客（E4 能源題組）。

| | 改之前 main（`047cb2c`，band＋連續數值） | 階梯 |
| --- | --- | --- |
| 一次改 ≥2 個載體（連能源） | 53.3% | 10.8%（只係 site：0%） |
| 啱啱一個 site 移一格 | — | 73.0%（26.9% 冇格變） |
| 第 1／2／3 位訪客平均變幾多項 | 2.38 / 2.38 / 2.81 | 0.99 / 1.41 / 1.46 |

- 格變分佈：focal（±1）佔 39%，district（±2／±3）佔 61%。
- 38.7% 格變係將同一 site 上一步拉返轉頭，主要出現喺意見平分嘅人群。
- 「改之前」嗰欄係 base 上嘅模擬，用同一個訪客模型。腳本入面嘅 old 行係唔限速嘅新格，唔係舊 band。

**自動測試（全部 PASS）：** root `npm test`／`npm run build`、`survey/` `npm test`／`npm run build`、`git diff --check`。新增或改咗嘅覆蓋範圍：
- `ladderGap` 門檻同遲滯。
- `ladderStep`：每份最多一格、第一位訪客只郁一個 focal、seed 喺 ±2 固定、tie-break。
- `pickHeadline`。
- 81 組首份提案嘅 golden，每組只郁一個 site。
- District 各格：rung 1 唔郁 district、rung 2 槽位互相包含、fleets 只喺 rung 3 郁、quiet 唔出 pulse。
- Manager headline 排第一，非 headline site 嘅 marker 唔閃。
- 低邊人群跑完整個 ladder，觸發 solar pods。
- P4 反對票：自動化由第 3 格退到第 2 格，卡片講 district。
- P11 seed 由早期次序決定。

**Browser：**
- 環境：scratch `SURVEY_PORT=8798 npm run dev:auto --prefix survey`，root Vite 5184，City 分頁保持喺前面。
- 九份 guest HTTP 提案，每份只有一個 site 移一格。結果卡每次講一個地點；有能源同時變化嘅一次，卡片照講 tier 嘅 site。Console 冇 error。
- 截圖：[focal 第 1 格](../artifacts/meter-ladder/guest2-se-focal.jpg)、[district 第 3 格](../artifacts/meter-ladder/guest9-se-rung3.jpg)。
- 未測：FPS、A/B station、iPad 實機、訪客理解程度、整合後嘅 main CI。


## Headline 近鏡 — 2026-10-27

[原圖、方法及逐鏡數據](../artifacts/headline-camera/README.md)／[manifest](../artifacts/headline-camera/final/manifest.json)。Root `npm test`、`npm run build`、`git diff --check` PASS；build 有既有 >500kB chunk warning 及 `odaiba-layout.json` import attributes 不一致 warning。新增純函數／controller 測試涵蓋 13 shots、focal/district 及能源優先次序／移除／結果卡位置、2.62 s journey／1.5 s fly-in／10–12 s fly-out、實際 displayMs 同步、current-pose 中斷、cancel、catch-up。Production bundle 沒有 `cityShot`；survey／module-swap source 未改，未另跑其 suite（survey build 只供 scratch UI）。

macOS 27.0.1 arm64、Chrome 156.0.8078.48 headless／WebGL2／ANGLE Metal Apple M6，1920×1080 DPR1 default、hour12；DEV actor time20，live 使用實時 actor clock。Hero 與每個 authored shot 均有新原圖和 canvas 診斷：hero 60.1 FPS／998 calls；13 靜態近鏡 59.9–60.1 FPS／455–958 calls。另以真實 scratch HTTP/WebSocket 提案在第 8.3 s hold 拍齊 13 個 live shot（另有 Undo 後水庭），59.9–60.1 FPS／599–1186 calls；這些狀態與靜態比較配置不同，不能把 calls 差異當回歸。120-frame cadence 是短段取樣，不是 sustained／isolated benchmark。原圖已逐鏡查看；沒有改模型／材質，既有柱／路線及 commons 自身屋頂仍可見，不宣稱全場遮擋或飛行碰撞掃掠。

初次使用指定 Vite5184／dev:auto8798 與獨立暫存 SQLite；最終可重跑 runner 另建 fresh v3（舊氣候四站）／v4（現行能源）真實 server，不改展覽 DB／協議／時鐘。無 headline、reload、Undo、A/B（提交相隔 1006 ms；維持原10秒展示次序、第二份停在自己的 headline）與 reduced motion PASS。另驗真實 TCP 斷線重連、reset、縮短 displayMs 的 real-view wire fixture、DEV meters／中斷／reduced-motion、裸 `?shot=` 的中性載體、legacy v1 snapshot 及 standalone，八項 PASS。Page exception／console error 為0；外部 Google Fonts CSS 以空 CSS 明確使用系統 fallback。全部 owned servers／browsers 已停止，5184／8798 已釋放。

初版 DEV 僅靠 media change 事件的中斷未通過，已改成 render loop 在 camera update 前讀取保留的 MediaQueryList；早期4.9秒半透明過渡圖由最終8.3秒原圖取代。Sandbox listen／Chrome 初次失敗後以範圍授權重跑成功。完整 logs／限制與 checkpoint 見 [handoff](handoffs/headline-camera.md)；展示機／4K HDMI、Safari／iPad／Windows、長時間效能、真人閱讀理解／工程及 main CI 未驗，模型近鏡打磨另作任務；merge main 仍待 owner 批准。

Headline correction1（2026-10-27）：[獨立結果與原圖](../artifacts/headline-camera/README.md#coordinator-correction-1--2026-10-27)。補齊任意新 live 結果（包括無 headline）由當前近鏡平滑回 hero；hold／fly-out 第一幀、2秒返回／操作恢復及無新fly-in unit tests PASS。真實v4 A/B第二份 layout不變，提交1018ms相隔、邊界0.1001m／最大逐幀6.1096m、返回後65個hero樣本及操作恢復PASS。SW district改看實際共享岸邊三房間2/3/4，重拍靜態／live兩圖並實測60.0FPS、958／936 calls；其餘原圖以保存的舊hash逐一核對。Root test/build/whitespace再次PASS；build保留既有chunk-size及JSON import-attributes兩項warning。Manifest預設只比對、不重建；刻意錯hash拒絕／原檔還原／獨立verify PASS。沒有模型／材質／server／協議改動；仍未測展示硬件／長測或main CI。

Correction1 verified code `4c52d681a3715630e5eba52889831729355775fb` 已推送；後續僅交付文件，runtime及原圖 hashes不變。


## Headline camera main integration — 2026-10-27

Owner明確批准後，accepted `cf0fe82`以no-ff merge成 `51002890371ef3aa7bc7d16791cc34b23d98cffc`，無衝突且整個tree相同。整合後root npm test／build、committed及working whitespace、保存manifest比對PASS；保留chunk-size及JSON import-attributes兩項既有warning。Survey／module-swap source未改，未另跑本地suite。

[本次整合logs／原圖](../artifacts/headline-camera/integration-1/README.md)：production preview＋真實scratch v4，live nw結果近鏡／原因及reload snapshot ambient hero，DEV `cityShot`排除，Chrome156.0.8078.48 headless、1920×1080 DPR1 default/hour12，原圖已查看、page／console errors0，系統字體fallback明確。Runtime及原圖hash不變支持保留先前完整鏡頭／中斷證據；沒有新FPS／硬件／全矩陣重跑宣稱。Owned服務已停止；無部署。

Main `ad60a8912a62c5ad24bdbf965c5dc31527771562`推送及fetch核對成功、HEAD=origin/main，實際[main CI40490237501](https://github.com/cc100053/city2127/actions/runs/40490237501) SUCCESS：root／survey／module-swap測試與build、committed whitespace全部通過；[run及各步驟原始證據](handoffs/evidence/headline-camera-main-ci.json)。本段取代上方feature階段待批准／main CI未驗狀態。最後CI紀錄提交只有Markdown及docs內證據，按workflow跳過CI，程式碼與成功run一致；連結／fact／diff檢查通過。既有硬件／長測／模型打磨限制保留。

## Closeup polish S0 — 2026-10-27（部分／配額暫停）

[方法／原圖／完整logs](../artifacts/closeup-polish/S0/README.md)：新增DEV `cityShotFrame`及四站tier對應、投影／九點／可見性／InstancedMesh／raycast還原測試，runner self-check定義98個日夜狀態；完整矩陣與兩輪uncapped效能仍在執行，不能視為S0完成。主體／原門檻不變，初步NW A1/A2通過但A3及重載reproducibility失敗，所有原圖與失敗保留。首次sandbox root test的localhost EPERM已獲准重跑完整PASS；最終source結果及精確checkpoint見本批handoff。Build PASS，僅既有兩項warning；production排除DEV helper。沒有美術／相機pose／survey／梯級／時間線改動，未合併main；其他平台／展示硬件／新live／真人辨識未驗。

S0安全checkpoint：weekly剩14%時停止；final flush共43/98狀態／86張baseline JPEG，另保留native試跑。A1通過32/43、A2 18/43、A3 0/43、A6 42/43；repro7/43通過，所有雙圖及失敗保留。data-fps59.8–60.1僅vsync參考；A4、完整矩陣及兩輪uncapped仍未驗。Runtime59c6ea9已push feature，未merge；所有owned Chrome／runner／Vite5194已釋放。最終source root checks及來源hash見上方報告，沒有新live或其他平台宣稱。


## Closeup polish S0 recovery — 2026-10-28

本節取代上方43/98暫停狀態；[完整方法／證據](../artifacts/closeup-polish/S0/README.md)、[逐狀態review](../artifacts/closeup-polish/S0/REVIEW.md)、[測試與cleanup](../artifacts/closeup-polish/S0/checks.json)。98狀態／196原圖、96 A4比較；98張正式第二take已逐張檢視。A1 60 PASS／6 FAIL／20無法量測FAIL／12 N/A，A2 42／24／20／12，A3 0／66／20／12；A4 7/96，A6原始97/98（獨立NW6/6重測無錯），repro41/98。12 N/A僅hero與absent-energy，不以null投影虛報通過。Vsync58.5–60.1。A3 misses分類與幾何／shader限制保留。當前Chrome156用`--disable-gpu-vsync`仍cap60，原28組完整保留；加入`--disable-frame-rate-limit`後補量28組×2有效reference，raw FPS、draw calls及5秒intervals見report／performance.json。相對95%FPS／+10%draw門檻留待後續輪次，不放寬。

DEV／production smoke及S0的headline-aware E4副本驗證結果見checks.json；scratch SQLite／HTTP／WebSocket採現有fixture，沒有部署或survey source變更。Root suite/build PASS的實際logs保留，production bundle排除cityShotFrame；helper在live headline不改pose或GPU資源數。原始43狀態與93張原圖hash驗證一致，過往quota與optimizer失敗仍留歷史。僅開發Mac Chrome1920×1080/DPR1；真人辨識、展示硬件、其他平台、完整時序閃爍驗收未做。無美術／pose／timeline／ladder變動，未merge main，本批後釋放服務及writer交coordinator review。

S0終版：有效uncapped平均79.51–133.60FPS。原E4在現行ladder headline顯示其他site時仍等固定能源句，故保留失敗；S0測試副本僅更新兩個結果等待斷言後完成全流程，page exception0，runtime及原E4不改。234張原圖hash核對、98組雙take URL/pose一致、DEV／production smoke PASS。所有owned Vite／Chrome／scratch server已停止，5194／5195 free。


## Closeup S0 main integration — 2026-10-28

Coordinator接受19e9ae2為完整量度基準，保留全部視覺失敗。Fresh mainfdc4a0c以no-ff整合為c802bba，無衝突；在整合結果重新跑root npm test、npm run build及git diff --check全部PASS，僅既有build warnings。[整合JSON／logs](../artifacts/closeup-polish/S0/integration.json)。Runtime/tests/package/lock與接受checkpoint完全相同，因此原DEV／production／headline-aware recovery evidence仍適用，沒有重複宣稱新browser或FPS量度。Survey／module-swap未改，local不另跑。Main最終SHA／實際CI與服務、writer釋放由result-S0-integration.json記錄；長feature保留，原root舊feature checkout不動。A–D未開始、未部署；S0整合不代表art gates獲通過。
