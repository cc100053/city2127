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
