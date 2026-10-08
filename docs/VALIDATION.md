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

When the integrated building QR changes:

```sh
npm ci --prefix qr-hud
npm --prefix qr-hud run build
npm --prefix qr-hud test
node scripts/exhibition.mjs build
```

Use an isolated SQLite and `qr-hud/scripts/verify-integration.mjs` for the destructive browser flow. It must verify the QR's future-building source/archive revision, decode the rendered QR to the submitted proposal's `/city/:id`, load the archived layout without a live WebSocket, and verify touch/zoom controls. Slow headless hosts may set `INTEGRATION_CITY_TIMEOUT_MS` (default 45000); this is a test timeout, not a performance acceptance or runtime change. `verify-building-qr.mjs` checks all three future tower silhouettes, excludes pavilions, verifies the no-tower original Civic Core fallback and archived low/high availability, stable reload selection, projected whole-building bounds, readable blue glass, repeated real canvas decoding, embedded sizing and standard-QR fallback. Run it from `qr-hud/` against a QR Vite preview at 5198, or set `QR_TEST_URL`. Root `qrFutureBuildings.test.ts` checks low/mixed/high seeded slots against the actual district configuration and preserves tower height/shader transforms, exact civic landmark geometry, owned preview resources and an unchanged live mirror registry. Physical phone camera scanning and exhibition Wi-Fi remain manual acceptance.

CI uses Node 24, installs/tests/builds all three packages and checks committed whitespace. Local checks gate integration; main CI must pass after integration (branch CI need not be awaited, 2026-10-06). Documentation-only pushes skip CI; a newer push cancels an in-progress run on the same branch. The Odaiba route/clearance test raycasts through `three-mesh-bvh` (test-only devDependency) with the same hits as three's brute-force raycast. A configured workflow is not a passing run. [Git workflow](CONTRIBUTING.md) defines exact checks and race handling.

2026-10-07 future-building QR evidence: root tests/build, QR 13 tests/build, integrated build and five-silhouette Chrome framing/actual QR decoding PASS against source commit `eb8de23`. The broader integration browser run remains PARTIAL due slow headless city initialization/selector/navigation timeouts; physical phone/venue acceptance is unverified. Exact steps, screenshots and limits are in [random-building-qr handoff](handoffs/random-building-qr.md); this is not main integration or S5 acceptance.

2026-10-07 tower-only refinement (supersedes pavilion selection above): root full tests/build, QR 13 tests/build and integrated build PASS. Focused Chrome 750×620 checks PASS for all three actual tower families, full-building framing, stable archived selection, repeated QR decoding and no-tower standard QR fallback. Root checks also reject extraction of visible pavilions and preserve the actual mixed mid-rise heights. Broad integration is not rerun at this stage; its previous PARTIAL status remains. Exact checked source commit belongs in the handoff.

2026-10-07 original-landmark fallback (supersedes the empty-tower standard QR policy above): root full tests/build, QR 13 tests/build and integrated build PASS. Chrome 750×620 PASS for the three prioritized tower families plus the original central Civic Core in low cities, complete framing, stable reload, repeated actual-canvas decoding and WebGL fallback. Civic Core's bay-facing view was visually inspected so the rear gallery does not obscure the sphere. Node tests compare its exact baked positions/material colours against the original city factory and verify detached ownership and no live mirror registration. Read-only HTTP checks confirm the existing 8787 service serves the new bundle. Broad integration and physical phone acceptance are not rerun; previous limits remain in the handoff.

Documentation-only changes require local Markdown file/anchor checks, tracked-target checks, renamed-path/plain-text-reference checks, source fact checks and self-review of the complete diff. Check both working/staged diffs and `git diff --check origin/main...HEAD`. Rendering/tests/builds are not required for prose-only changes, and CI skips pushes that touch only `docs/**` or `*.md`. No source/asset change can be disguised as documentation-only.

2026-10-07 linked QR sculpture (supersedes the separate scan plate/model collapse): root full tests/build, QR 18 tests/build and integrated build PASS. Final Chrome 750×620 checks PASS for three tower families and original Civic Core, complete framing, stable reload, repeated canvas decoding, unchanged geometry identity/height/visibility between side and top views, reduced motion and standard-QR WebGL fallback. Five new native tests check actual source transforms/colours, dark-column-only occupancy, suspended voids/overlapping baked members, no geometry flatten/swap and resource disposal. Final side screenshots were visually inspected; tower yaw now follows slot orientation so the twin shafts read separately. Intermediate contrast checks failed after restoring smooth-glass finishes; cube roughness now has a .35 minimum, and final captures wait for both local sky loading and the existing opacity fade to finish. Final full rerun PASS; the earlier contrast failure is not proof that roughness alone caused it. The existing 8787 serves `index-Dom_62bx.js` → `main-DuOz6kjT.js` containing the linked sculpture. No live proposal/reset/database writes. Broad integration NOT RERUN (previous PARTIAL retained); physical phone/Wi-Fi remains unverified. This approximate voxel sculpture is not a lossless city-model replacement or a QR-Bloom AI-model integration; exact source commit and Git state are in the [task handoff](handoffs/random-building-qr.md).

## Browser regression checks for the current prototype

Archive-only mobile checks (explicit user request, 2026-10-08): run `node --experimental-strip-types tests/personalCityQuality.browser.mjs` after the integrated build, with the existing `qr-hud` Playwright dependency installed. It creates its own temporary SQLite and ephemeral loopback server, never the exhibition database. Check automatic phone lite, actual drawing-buffer bounds/no canvas antialiasing, no three large PNG requests, same archive layout/no live WebSockets, touch rotation/zoom/reset, idle rendering, landscape resize/reload, quality controls/context-loss retry, desktop archive full and unknown-archive errors. `CITY2127_EVIDENCE_DIR` selects the screenshots/report folder. Native `personalCityQuality.test.ts` is part of root `npm test`, covering quality scope/overrides, tablet detection, pixel/frame/hidden bounds, omitted fleets and simple water. Emulated iPhone UA/touch on Windows Chrome is not iPhone Safari, real GPU FPS, memory/thermal or long-run acceptance.

2026-10-08 result: root tests/build and integrated build PASS; final focused mobile browser PASS on Windows Chrome154.0.8037.98. iPhone-emulated390×844/DPR3 uses273×590 drawing pixels, no canvas antialiasing or large sky/grass/ripple requests; idle3 renders/3.2s, original archive layout/no WebSockets, touch/zoom/reset, landscape resize/reload, context-loss retry, desktop-full/forced-lite and missing archive PASS. Screenshots [phone lite](../artifacts/mobile-lite/phone-lite.png) / [desktop full](../artifacts/mobile-lite/desktop-full.png) visually inspected; [report](../artifacts/mobile-lite/browser.json). Initial idle assertion failed due residual camera damping (8 renders/3.2s); lite damping disabled, rerun PASS. Physical iOS browser crash report is not resolved by emulation evidence; phone model/WebKit/GPU/thermal/long-run/Wi-Fi acceptance remains open. Detailed source/Git state and initial OneDrive sandbox build failure are in the [task handoff](handoffs/random-building-qr.md).

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
