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
| Routes/actors | No actor passes through another: mobility tests check boat hulls over the whole water period, train spacing per track and walker lanes; for people, sample overlaps of the real fleets with doorways published. Sample repeated guideway, promenade/deck walker parties, joggers passing in the outer lane, promenade stool sitters and rail-spot parties veering out of the lane, doorway walkers emerging from the facade, bench sitters/rail couples/forecourt groups, delivery robots and their collector hand-offs, street cars on both avenues and the drop-off bays (indicators, brake lamp, nose dip), gait/items, day rhythm at `?hour=4/12/19/21`, boats, both aerial loops and berths, interchange boat/transfers, district crowd/drone cycles; no ground/landmark/site collisions, half-faded settled aircraft or stale visible batches. DEV `?meters=nw:high&reviewTime=<s>` (low/mixed/high) holds a review time; `?review=street` frames people and street cars up close (`&cam=x,y,z` moves that camera) |

Optional runnable browser checks use installed Playwright and local services: [surveyAuto.browser.mjs](../tests/surveyAuto.browser.mjs), [adminUndo.browser.mjs](../tests/adminUndo.browser.mjs), [twoStations.browser.mjs](../tests/twoStations.browser.mjs), [residentP2.browser.mjs](../tests/residentP2.browser.mjs), [residentP3.browser.mjs](../tests/residentP3.browser.mjs), [residentP4.browser.mjs](../tests/residentP4.browser.mjs). Read each script's environment/ports before execution. These are focused regressions, not proof of exhibition-day hardware acceptance.

Street-life interactions (2026-10-06): root `mobility.test.ts` checks conversational speaker/listener/quiet turns and continuous
outbound/stay/return/indoor timing. `odaiba.test.ts` publishes real landmark doorways after creating the actor fleets, checks the
visitor curves on actual paving and clear of buildings/sites, then samples each journey against actual people/robots for 240 s
at .25 s in low/mixed/high, hours 12/21. Every journey must actually be drawn in all six cases; seated matrices and folded legs
remain fixed. Repeat visual checks with companion gaze/hand gestures, visitor arrival/chat/turn/return, and held day/dusk/night.
The same loop asserts doorway people (0.62 m) and robots (0.85 m) never overlap and that no promenade walker, and at most 2 % of slow doorway frames (tight forecourt corners), strides in place; `districtMeters.test.ts` checks street cars → pods at low/mixed/high with unchanged traffic.
Dated results and any integration limits belong in the [street-life handoff](handoffs/street-life.md).

Building interactions (round 9, 2026-10-06): `mobility.test.ts` checks arrival/wait/exit/greeting/departure/indoor stages,
bounded continuous movement and stopped service feet. `odaiba.test.ts` samples the actual four entrance people against paving,
static city geometry and all existing person/robot fleets at low/mixed/high, hours 12/21. `automationHub.test.ts` checks actual
service actor size, platform support and counter/facade clearance, human/assisted/autonomous use, live handover, immediate
recovery and hidden frontage. Review entrance stages and service scenes in the browser, keeping the original hero day/dusk/night;
use explicit `nw:-12/0/12` for 0/3/6 automated ports (band shorthand `low/high` maps to scores −7.5/+7.5, not the endpoints).

## Performance evidence

Measure current Odaiba on the stated real GPU, ideally the exhibition machine at 1920×1080. State pixel ratio, actual viewport, camera/hour/mode, frame sampling interval, draw calls/triangles and console/network results. Mesh counts, source file size, headless/software FPS and old Shibuya 60 FPS are not equivalent to a current measurement. Do not claim Windows or another workstation was tested from Mac evidence.

Street traffic round 10 (2026-10-07, development Mac, not the exhibition machine): Apple M6, headed Chromium 151.0.7922.34 (Playwright,
ANGLE Metal), Vite DEV, 1920×1080 viewport, deviceScaleFactor 1 (renderer pixel ratio 1), authored hero camera, canvas `data-fps`
(mean over 120 frames) sampled 5× at 2.5 s after 8 s warm-up: standalone `?hour=16` 56 FPS / 946 draws; `meters=nw:low` 53 / 1585;
`nw:0` 53 / 1585; `nw:high` 53 / 1601; `nw:high` at hour 21 52 / 1607. Triangles not recorded; console shows only the missing `/favicon.ico` 404, no page errors.
[report](../artifacts/street-traffic-automation/browser.json). Exhibition-machine FPS remains unmeasured.

## Current evidence and open acceptance

Fuji TV target v3 round6 (2026-10-07, `codex/fuji-tv-polish`, starting `8de6cf8` plus checked source SHA-256 `b8dd6961…049dc0`, not integrated): three Dream Loop Plus passes improve theatre screen/scenery, glazing ribs, live-studio sets and46 static forum/promenade visitors. Root `npm test`, `npm run build`, `git diff --check` PASS after each corrected pass; new actual-mesh support/headroom check caught and fixed promenade visitors below the Y=65 structural beam. Existing route/site/actor and81-answer real HTTP/WebSocket checks PASS. Development Mac headless Chrome154.0.8037.98, Apple M6 ANGLE Metal,1280×720/DPR1, actor40: all three civic16/22 comparisons, final hero16, all-low(−12)12, mixed(0)18.5, high(+12)22 and resize1440×900→1280×720 PASS. All10 capture records have no captured console/page/network errors; initial session favicon404 is recorded separately. [Final day](../artifacts/fuji-tv-polish/v3r6-pass3.jpg), [night](../artifacts/fuji-tv-polish/v3r6-pass3-night.jpg), [hero](../artifacts/fuji-tv-polish/v3r6-hero.jpg), [browser/geometry record](../artifacts/fuji-tv-polish/v3r6-browser.json), [handoff](handoffs/fuji-tv-polish.md). Nine batches/2,853,564 triangles with unchanged bounds; no sustained FPS or exhibition-hardware claim. Target fidelity remains PARTIAL; interior simulation/access control and live survey browser NOT RUN. Unchanged survey/module-swap package suites not rerun.

Fuji TV target v3 round7 (2026-10-07, `codex/fuji-tv-polish`, starting `1198b2f` plus checked source SHA-256 `b037643b…6de09f`, not integrated): three Dream Loop Plus passes (Claude Opus workers; Fable unavailable without usage credits) open the escalators and sphere crown, remove flank braces/pier light squares, add glazed side studio galleries and a continuous warm wing back wall. Root `npm test`, `npm run build`, `git diff --check` PASS after each pass with no source fix needed. Development Mac headless Chrome154 via playwright-cli,1280×720/DPR1, actor40: civic16/22 for all three passes, final hero16, all-low(−12)12, mixed(0)18.5, high(+12)22 and resize1440×900→1280×720 PASS; all10 captures report0 console errors/warnings. [Final day](../artifacts/fuji-tv-polish/v3r7-pass3.jpg), [night](../artifacts/fuji-tv-polish/v3r7-pass3-night.jpg), [browser/geometry record](../artifacts/fuji-tv-polish/v3r7-browser.json), [handoff](handoffs/fuji-tv-polish.md). Nine batches/3,143,944 triangles with unchanged bounds; no sustained FPS or exhibition-hardware claim. Target fidelity PARTIAL; survey/module-swap suites not rerun.

Fuji TV target v3 (2026-10-07, feature `codex/fuji-tv-polish`, implementation `f504484`, not integrated): three new Dream Loop Plus passes against the user's selected image. Final root `npm test`, `npm run build`, `git diff --check` PASS after removing pass1's obsolete garden fragment. Actual-mesh checks now also sample standing headroom/support on both work wings and support beneath all14 forum visitors; batch limit is9 for the added shared broadcast finish. Existing route/berth/bridge/site/person/robot and81-answer HTTP/WebSocket checks PASS. Development Mac in-app browser,1280×720, actor40: civic16/22, authored hero16, all-low(−12)12, all-mixed(0)18.5 and all-high(+12)22; no captured console warnings/errors, including shader compile. Ordinary desktop resize1440×900 updates canvas/backing dimensions. [Final civic](../artifacts/fuji-tv-polish/v3-pass3.jpg), [night](../artifacts/fuji-tv-polish/v3-pass3-night.jpg), [hero](../artifacts/fuji-tv-polish/v3-hero.jpg), [browser JSON](../artifacts/fuji-tv-polish/v3-browser.json), [handoff](handoffs/fuji-tv-polish.md). Geometry grows to1,711,564 triangles in9 batches with unchanged bounds; capture-time canvas diagnostics do not measure sustained FPS. Target fidelity remains partial; exhibition GPU/hardware, sustained performance, interior circulation/access control and live survey browser were not tested. Separate survey/module-swap suites not rerun because those packages are unchanged.

Fuji TV target v1 historical evidence (2026-10-07, integrated through `f64af18`): three Dream Loop Plus passes; root `npm test`, `npm run build` and `git diff --check` PASS after each pass's fixes. Existing actual-mesh checks cover sphere aerial/wing clearance, Aqua City bridge approach, four site sightlines, route and person/robot geometry; no new test framework. Development Mac in-app browser, 1280×720, actor time40: civic day16/night22, standalone hero16, all-low day12, all-mixed dusk18.5 and all-high night22; no console warning/error in checked views. [Final civic](../artifacts/fuji-tv-polish/pass3.jpg), [night](../artifacts/fuji-tv-polish/pass3-night.jpg), [hero](../artifacts/fuji-tv-polish/hero.jpg), [browser record](../artifacts/fuji-tv-polish/browser.json), [handoff](handoffs/fuji-tv-polish.md). Generated target fidelity remains partial; FPS, exhibition hardware and live scratch-survey browser were not tested in this task. Root tests cover the real survey HTTP/WebSocket pipeline; survey/module-swap source unchanged and their separate suites not rerun.

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

City readability (2026-10-04, branch `fix/city-readability`): resident card moved top-right, site-only pulse shafts, night intro halo. Root `npm test`／`npm run build`／`git diff --check` PASS; P3 browser PASS (Chrome1280×720, hour16, ordered reading 10,017ms) with new evidence in [artifacts/readability](../artifacts/readability/) — [A reason](../artifacts/readability/resident-p3-city-A-reason.png), [pulse before](../artifacts/readability/pulse-before-1920.png)／[after](../artifacts/readability/pulse-site-focus-1920.png) (Chrome1920×1080 `?meters`, 0→5 all axes, 0.7s), [night intro](../artifacts/readability/night-intro-1920.png). Focal-site screen positions computed from `heroCamera` at 1280×720／1920×1080／3840×2160 all fall left of x = viewport − 404. No FPS／hardware claim.

**Still open:** S5 full exhibition acceptance, actual input hardware, exhibition-day reset/recovery policy, sustained runtime/device testing. Use current browser procedures and the P5 handoff above; do not reopen old Shibuya tasks.

## Historical evidence (not exhibition acceptance)

All pre-consolidation dated entries and screenshots are retained in [validation snapshot through 2026-10-02](history/VALIDATION_2026-10-02.md), with original headings for old deep links. Its “current prototype” procedures and next steps describe historical stages and must not be executed as today's acceptance plan. The old [implementation snapshot](history/PROJECT_2026-10-02.md), [MVP plan](history/EXHIBITION_MVP.md), [Shibuya Plan 02](history/SHIBUYA_PLAN02.md) and [Plan 01](SHIBUYA.md) preserve decisions/evidence without creating future Shibuya work.

## Task handoff verification

Use one named owner and [handoff template](handoffs/TEMPLATE.md). Record preflight branch/HEAD, fresh remote refs/divergence, scope, checked commit/worktree, actual commands/evidence, unrun checks, integrated commit/CI and next step. Preserve each task separately; document integration completion independently from visual/hardware acceptance. Full handoff navigation: [open tasks](handoffs/README.md) / [archived task evidence](handoffs/archive/README.md). Archiving completed/superseded handoffs preserves their dates, commits and unverified limits; it does not complete visual or hardware acceptance.
