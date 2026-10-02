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

CI uses Node 24, installs/tests/builds all three packages and checks committed whitespace. Current push CI must pass before integration; main CI must pass after integration. A configured workflow is not a passing run. [Git workflow](CONTRIBUTING.md) defines exact checks and race handling.

Documentation-only changes require local Markdown file/anchor checks, tracked-target checks, renamed-path/plain-text-reference checks, source fact checks and self-review of the complete diff. Check both working/staged diffs and `git diff --check origin/main...HEAD`. Rendering/tests/builds are not required for prose-only changes; CI still runs package checks on push. No source/asset change can be disguised as documentation-only.

## Browser regression checks for the current prototype

Start the services and use their printed ports as described in [README](../README.md). Use scratch SQLite for destructive reset/Undo checks; preserve the exhibition DB. Desktop only. Record actual viewport, browser/GPU/device, commit, hour/actor time and console/network results. Reuse project previews; do not kill unrelated processes.

| Check | Expected result |
| --- | --- |
| Standalone `/` | Odaiba landmarks/civic core, connected backdrop, bay, six waterfront islands and base mobility load without errors; no survey-dependent district layer |
| Day/dusk/night | Review `?hour=12`, `18.5`, `22`; structure, public paths, windows and four sites remain readable; automatic clock wraps in 180 s |
| Camera/resize | Initial authored desktop hero; orbit/zoom/pan limits and ordinary renderer resize work; no adaptive camera or mobile requirement |
| Four-question Guest | One complete proposal after review; partial answers do not change city; result 10 s / handoff 5 s; IDs survive unknown-result retry without a duplicate vote |
| Low/mixed/high | All four focal sites and district carriers are complete future alternatives; continuous quantities, hybrids, pairings and seed layout agree with authoritative view |
| Live transition | Changed targets retarget over 3 s with local pulses; duplicate/no-op events do not replay; late assets/roof publication use latest target |
| Immediate recovery | Snapshot/reset/Undo/reconnect/reduced motion settle immediately, clear pulses/queued display, restore latest state; lighting-only snapshots do not skip live queue |
| Single station | Next Start automatically ends completed experience; queued reset applies before new answers; no Admin exit confirmation; Admin can end unfinished questionnaire |
| A/B | Independent draft/result/recovery; both accumulate in commit order; displays ≥3 s apart; each Guest sees its own queued result; newer starts close old Undo |
| A/B reset/cancel/expiry | New starts stop during reset; both sessions drain; named unfinished cancellation affects one; questionnaire/result leases release abandoned stations |
| Undo | Latest completed proposal only, before next start; restore scores/counts/seeds; original event preserved; cancelled newer draft cannot reopen prior Undo |
| Admin display | Day 12:00 / Night 22:00 / Auto saved across reset/restart; explicit City `?hour` wins; LAN access to Admin denied |
| Persistence | Restart existing SQLite and reconnect pages; state/history/settings recover; do not delete DB to simulate recovery |
| Routes/actors | Sample repeated guideway, promenade, boats, aerial loop/berth, district crowd/drone cycles; no ground/landmark/site collisions or stale visible batches |

Optional runnable browser checks use installed Playwright and local services: [surveyAuto.browser.mjs](../tests/surveyAuto.browser.mjs), [adminUndo.browser.mjs](../tests/adminUndo.browser.mjs), [twoStations.browser.mjs](../tests/twoStations.browser.mjs). Read each script's environment/ports before execution. These are focused regressions, not proof of exhibition-day hardware acceptance.

## Performance evidence

Measure current Odaiba on the stated real GPU, ideally the exhibition machine at 1920×1080. State pixel ratio, actual viewport, camera/hour/mode, frame sampling interval, draw calls/triangles and console/network results. Mesh counts, source file size, headless/software FPS and old Shibuya 60 FPS are not equivalent to a current measurement. Do not claim Windows or another workstation was tested from Mac evidence.

## Current evidence and open acceptance

| Stage | Evidence / known limits |
| --- | --- |
| S1–S4 | [S1](handoffs/exhibition-s1.md), [S2](handoffs/exhibition-s2.md), [S3](handoffs/exhibition-s3.md), [S4](handoffs/exhibition-s4.md); dated server/root/Guest acceptance, some visuals captured before Odaiba |
| Odaiba venue P0–P5 | [venue handoff](handoffs/odaiba-venue.md), [transition record](ODAIBA_VENUE_TRANSITION.md); integrated `e6c7966`; P6/S5 not completed |
| Odaiba art / Dream Loop | [first pass](handoffs/odaiba-art-direction-01.md), [loop](handoffs/odaiba-dream-loop.md), [later target/rounds](handoffs/odaiba-dream-loop-2.md); preserve unmet visual-target limitations |
| Hero district / connected backdrop | [district handoff](handoffs/odaiba-district.md); integration `f2826cc`; earlier dissolve-to-island superseded |
| Meter P0–P12 | [Meter handoff](handoffs/meter-variety.md); main integration `e7afbee`, published `68b669a`, main CI [36954967651](https://github.com/cc100053/city2127/actions/runs/36954967651); accepted weak sharing differences remain |
| Lifecycle / display / Admin | [lifecycle](handoffs/exhibition-lifecycle.md), [day/night](handoffs/admin-day-night.md), [Japanese UI](handoffs/admin-japanese.md) |
| Single automatic handoff / Undo | [next-start](handoffs/remove-guest-exit-lock.md), [Undo](handoffs/admin-undo.md); A/B supersession noted in each |
| Concurrent A/B | [two stations](handoffs/two-guest-devices.md); integration `45fcde7`, main CI [36976457465](https://github.com/cc100053/city2127/actions/runs/36976457465) |
| DEV-only runner / pipeline | [auto-tests](handoffs/survey-auto-tests.md); temporary exhibition removal still required |
| Documentation consolidation | [this task](handoffs/odaiba-docs-consolidation.md); prose/link verification, not new runtime acceptance |
| Resident narrative P1 (2026-10-02) | [copy](RESIDENT_COPY.md), [handoff](handoffs/resident-copy-p1.md); documentation only, new screen/copy wiring and reading-time/iPad acceptance remain untested |

**Still open:** S5 full exhibition acceptance, actual input hardware, exhibition-day reset/recovery policy, sustained runtime/device testing. Use current browser procedures above, record a named owner and a new task handoff; do not reopen old Shibuya tasks.

## Historical evidence (not exhibition acceptance)

All pre-consolidation dated entries and screenshots are retained in [validation snapshot through 2026-10-02](history/VALIDATION_2026-10-02.md), with original headings for old deep links. Its “current prototype” procedures and next steps describe historical stages and must not be executed as today's acceptance plan. The old [implementation snapshot](history/PROJECT_2026-10-02.md), [MVP plan](history/EXHIBITION_MVP.md), [Shibuya Plan 02](history/SHIBUYA_PLAN02.md) and [Plan 01](SHIBUYA.md) preserve decisions/evidence without creating future Shibuya work.

## Task handoff verification

Use one named owner and [handoff template](handoffs/TEMPLATE.md). Record preflight branch/HEAD, fresh remote refs/divergence, scope, checked commit/worktree, actual commands/evidence, unrun checks, integrated commit/CI and next step. Preserve each task separately; document integration completion independently from visual/hardware acceptance. Full handoff navigation: [document index](README.md).
