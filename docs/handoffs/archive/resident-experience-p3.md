# resident-experience-p3 — Causal results and reading slots

- Owner: Codex
- Status: DONE — implementation and integrated local verification PASS
- Branch: `codex/resident-experience-p3`
- Base commit: `e82b8f57ccfb36d6106f6cdf7954d76a5efba4d5`
- Source commit: `fba729277cd8a9c5d45367cfbb565b3f700695fa`
- Last verified integrated commit: `44feae903b5664189834995215fe6ea9064d0db3`
- Remote availability: source on `origin/codex/resident-experience-p3`; integrated main published with this focused handoff closure

## Session Git state

2026-10-02 (Asia/Tokyo): confirmed `/Users/fatboy/city2127`, clean main at base above. Fetch succeeded; main/origin/main 0/0; remote main at base. P2 source/integration and closure are available on remote main. No unfinished commits, dirty screenshots, concurrent local module owners or binary edits. Codex owns P3 server scheduling/lifecycle, Guest recovery, root carrier evidence/presentation and related checks/docs. Upstream integration not needed at startup.

## Goal and scope

Implement [P3](../../RESIDENT_EXPERIENCE_PLAN.md): ten-second reading slots independent of three-second city motion; actual before/after carrier evidence; own Guest identity/wait/recovery; immediate authoritative recovery. Preserve question3/algorithm2/CityView2/schema7, independent A/B answers, score algorithm, renderer resources and hero camera. No viewer acknowledgement, hardware/deployment/dependencies or module-swap changes.

## Completed work

- Shared `DISPLAY_MS=10000`, `HANDOFF_MS=5000`, result lease15000; single/A-B server scheduling, root queue, Guest wait/remaining-time recovery, early-handoff guard and reset drain agree. Existing renderer transition stays3s; retries never extend the stored lease.
- Root compares focal targets and four districts’ effective settled carrier configurations (hybrids, visible pairings, roof/facade, fleet counts and seeded distribution). Seed-only or hidden-pairing changes are not evidence. Result separates one personal preference from one collective effect; focal claims name their site, district-only claims describe configuration, missing predecessors use recorded fallback.
- Live identity/location precedes reason at3s; ambient cards pause during the reading slot. Authoritative snapshot/reset/Undo/disconnect/reconnect/reduced motion/expired events settle immediately and clear old presentation; lighting preserves valid queue/card.
- Expanded existing native/browser checks and added one self-contained scratch-DB P3 browser script; four new screenshots visually reviewed. No geometry, camera, dependencies, schema or algorithm changes.
- README translations, survey API README, AGENTS, PROJECT, SPEC, resident plan/copy/index and VALIDATION reflect the implemented contract. ART/module-swap need no change because geometry/materials/resources and legacy behavior are untouched.

## Actual validation results

- Verification status: source worktree and integrated commit PASS
- Date/worktree: 2026-10-02, uncommitted P3 on base above
- Final root `npm test` and `npm run build`: PASS, including full-history and81 real answer combinations through HTTP/WebSocket/client parser/four-site models. Existing bundle-size warning remains.
- Final survey `npm test --prefix survey` and `npm run build --prefix survey`: PASS, including persistence/lifecycle/leases/idempotent remaining-time recovery and81 answer combinations.
- Scratch Chrome1280×720, deviceScaleFactor1, root `?hour=16`: new [P3 browser](../../../tests/residentP3.browser.mjs) PASS twice (10024ms /10006ms result identity interval), server displayAt difference10000ms; lost commit reply/reload counted once, own wait/result identity, early handoff/reset drain, lighting preservation, immediate reduced-motion/reload/Undo; no page exceptions. Repeat evidence in temporary directory preserves committed screenshots.
- Existing A/B browser PASS (10001ms), residentP2 browser PASS (old copy/draft, keyboard, review, retry/reload), final Admin Undo browser PASS (exact restoration, Guest storage cleanup, replacement, disabled timing, audit and Monitor). Each uses separate fresh scratch SQLite; historical screenshots preserved by temporary output directories.
- `git diff --check`: PASS. Final local Markdown target/anchor check:358 links PASS. Exact task diff and new source files self-reviewed.
- Initial failures: sandbox denied loopback listening, rerun with authorized escalation; stale3s tests updated to new10s contract; disconnect-test mock caused post-test reconnect, corrected cleanup and full root suite rerun PASS; new browser identity assertion raced City WebSocket, corrected explicit City wait; early-handoff guard initially blocked authoritative Admin Undo Guest cleanup, fixed the shared deadline reset and native/single Undo browser rerun PASS. No initial failure is used as acceptance evidence.
- Source [CI37007345027](https://github.com/cc100053/city2127/actions/runs/37007345027): PASS on exact `fba729277cd8a9c5d45367cfbb565b3f700695fa`, Node24, root/survey/module-swap install/test/build and committed diff whitespace.
- 2026-10-02 integrated `44feae903b5664189834995215fe6ea9064d0db3`: fresh fetch confirms main/origin/main0/0, clean tree, no-ff merge without conflicts; integration tree equals source tree. Node26 root/survey full tests and builds rerun PASS; P3 scratch browser rerun PASS10012ms, no page exceptions. Evidence saved outside repository at `/private/tmp/city2127-resident-p3-integrated` to preserve source screenshots. `git diff --check origin/main..HEAD` PASS.
- Publication: focused documentation closure records the verified integration above. Final pushed main HEAD/CI must be checked after publication; its actual run is reported in this task’s final response (no future CI pass is claimed here).

## Known issues and next expected step

P3 implementation is complete. Next separately assignable stage is P4 comprehensive software/two-screen validation from the [resident plan](../../RESIDENT_EXPERIENCE_PLAN.md); do not automatically start it. Before ending this publication task, verify remote main and its actual CI after push per [CONTRIBUTING](../../CONTRIBUTING.md).

The `getConfiguration()` projections mirror settled renderer transforms; update them when adding carrier geometry (`ponytail:` comments document this maintenance limit). Scheduling metadata is not a viewer acknowledgement. Hardware, Safari/iPad/Windows, real reading time/comprehension, FPS and sustained exhibition operation are unverified; P4 comprehensive software cases, P5 and S5 remain separate. No automatic P4/P5 work is authorized by this handoff.
