# resident-experience-p4 — Software and two-screen acceptance

- Owner: Codex
- Status: DONE — software acceptance and integrated local verification PASS
- Branch: `codex/resident-experience-p4`
- Base commit: `ab9dbba094dcce78b7afed17f0b2b5b39d79f320`
- Source commit: `7b36dd65da03289e224c31bc825b9cbef4fed19b`
- Last verified integrated commit: `9f7741921805551724d2608c9ac249e0e194dc21`
- Remote availability: source on `origin/codex/resident-experience-p4`; verified main integration published together with this focused documentation closure

## Session Git state

2026-10-02 (Asia/Tokyo): confirmed `/Users/fatboy/city2127`, clean `main` at base above. Fetch succeeded; HEAD/origin/main divergence 0/0. P3 source `fba729277cd8a9c5d45367cfbb565b3f700695fa` and verified integration `44feae903b5664189834995215fe6ea9064d0db3` are on remote main; base main CI [37008691409](https://github.com/cc100053/city2127/actions/runs/37008691409) PASS. No unfinished task commits, dirty screenshots, overlapping local owners or binary edits found. Codex owns P4 root tests/browser evidence and affected acceptance documents. No upstream integration needed at startup; new task branch created from verified current main. Existing project Vite at127.0.0.1:5173 reused (PID7800 cwd verified).

## Goal and scope

Complete [resident plan P4](../RESIDENT_EXPERIENCE_PLAN.md): comprehensive software acceptance using scratch SQLite and simultaneous Guest/City/Admin. Reuse existing native/browser checks, add the missing desktop input/recovery/expiry cases, and trace resident reasons through real carrier evidence. No runtime behavior, geometry/camera, dependencies, exhibition database, survey schema/algorithm, module-swap, deployment or P5 hardware changes.

## Completed work

- Extended [real Meter pipeline](../../tests/surveyMeterPipeline.test.ts): restore each actual new-run baseline, 81 answer combinations → carrier evidence → resident result, direction-only with real accumulated history, mixed/opposing personal preference with high collective result, and same-score/different-distribution reasons across four actual districts. Existing pairing/matrix assertions remain.
- Corrected [A/B browser](../../tests/twoStations.browser.mjs) to follow whichever station commits first. Recover identities before the first reading slot expires; next-start/peer/cancellation checks follow actual station attribution.
- Added [P4 browser](../../tests/residentP4.browser.mjs) for desktop keyboard/touch/review, failed save/same-ID retry, maintained result, next-guest inheritance, actual TCP disconnect/reconnect, and offline submitted/reserved station expiry with reset drain/admission. Explicit server-clock jumps test leases, not reading speed. Preserve exact browser/console/network diagnostics in new evidence.

## Acceptance matrix

| P4 case | Runnable evidence |
| --- | --- |
| Single four questions, review/edit, one vote, shared identity, next guest inherits | P4 browser; P2 browser; Admin Undo browser |
| Near-simultaneous A/B, independent save, ordered non-overlapping reading | A/B browser; P3 browser; survey twoStations native HTTP/WebSocket |
| Lost reply, same-ID retry/reload, own waiting/result | A/B/P3 browser (post-commit); P2/P4 browser (pre-commit); survey persistence/guestFlow |
| New run, maintained, direction-only | P4 browser maintained/new-run; real Meter pipeline direction-only; residentCards current-run assertions |
| Equal score/different distribution, pairings/mixed, opposing preference | Real Meter pipeline and districtMeters/surveyAtmosphere native checks |
| Reset waiting/playback, Undo, reload/reconnect | A/B/P3/P4/Admin Undo browser; native queue/expired-message recovery |
| Lighting and reduced motion | P3 browser and native surveyAtmosphere queue checks |
| Early handoff, offline expiry, named cancellation | P3/P4/A-B browser; native twoStations lifecycle/remaining lease |
| Keyboard/touch/return/review/failure feedback | P2/P4 browser; touch is Chromium desktop emulation, not an iPad acceptance claim |

## Actual validation results

- Date/checked tree: 2026-10-02 (Asia/Tokyo), base above plus P4 tests/docs/evidence. Runtime source is identical to base; no source/package dependency delta.
- Node26 root `npm test` and `npm run build`: PASS, including final real Meter pipeline and all existing geometry/motion checks. Existing bundle-size warning remains.
- Node26 survey `npm test --prefix survey` and `npm run build --prefix survey`: PASS. Survey runtime/test files were not changed; this separately verifies the shared server contract.
- Scratch Chrome154.0.8037.93, viewport1280×720/deviceScaleFactor1, fixed hero/hour16: P2 browser PASS; P3 browser PASS (10,007ms); A/B browser PASS twice (10,011ms, repeat10,004ms A then B); Admin Undo browser PASS three times. Each has a separate fresh scratch SQLite; regression screenshots remain in `/private/tmp/city2127-p4-regressions` instead of overwriting earlier committed screenshots. Final explicit B-first regression and subsequent Admin Undo PASS10,011ms: both submit buttons fire together, A request has150ms injected network delay; actual display order B then A.
- New P4 browser PASS twice, including final narrower console/network assertions. Initial repository evidence and final repeat in `/private/tmp/city2127-p4-final` agree. Browser reports no page exceptions, no unexpected resource/API errors; original missing favicon404 at survey/root and deliberately failed POST/offline WebSocket are explicitly preserved in [diagnostics](../../artifacts/resident-p4-browser.json).
- New screenshots visually reviewed: [A/B city](../../artifacts/resident-p4-two-stations-city.png), [B waiting](../../artifacts/resident-p4-guest-B-waiting.png), [single review](../../artifacts/resident-p4-single-review.png), [save/retry](../../artifacts/resident-p4-save-retry.png), [maintained](../../artifacts/resident-p4-maintained-city.png), [reconnect](../../artifacts/resident-p4-reconnected-city.png), [expiry/reset](../../artifacts/resident-p4-expired-reset-city.png). Save/retry capture is full-page1280×852; viewport stays1280×720. Retry is reachable by normal scrolling/native controls. A/B City is the B-first run; B waiting is the separate fresh-DB P3 rerun, not a pair from one run.
- Offline lease checks explicitly advance server clock16,000ms (submitted B ends, reserved A preserved), then300,000ms (A expiry, city reset, total participation3 preserved, admission usable). Browser result/read timers use real wall time. These jumps do not prove a real five-minute wait or exhibition-day stability.
- Local Markdown target/anchor check:267 links PASS before publication; `git diff --check` PASS. Exact diff/new-file review completed; final staged/committed checks and CI recorded at publication.
- Initial failures are not passing evidence: loopback sandbox denial rerun with authorized escalation; new fixture incorrectly used state.layout, corrected to proposal.afterLayout; Start/save assertions raced async completion, corrected explicit screen waits; Chrome offline emulation retained an existing socket, so test destroys the real City TCP transport; async browser polling replaced by direct server-state polling; existing A/B assumed A-first, corrected attribution and response waiting; favicon404 classified by exact URL, not silently ignored.

- Source [CI37011691429](https://github.com/cc100053/city2127/actions/runs/37011691429): PASS on exact `7b36dd65da03289e224c31bc825b9cbef4fed19b`; Node24 root/survey/module-swap install/test/build and committed whitespace.
- Integrated `9f7741921805551724d2608c9ac249e0e194dc21`: fresh fetch, clean tree, no concurrent main changes; no-ff merge without conflicts; integration tree equals validated source tree. Node26 root/survey full tests/builds rerun PASS; P4 scratch browser rerun PASS with no unexpected console/network errors. Temporary evidence in `/private/tmp/city2127-p4-integrated` preserves committed screenshots. The caller-supplied commit label was corrected to actual `git rev-parse HEAD`; this did not change the tested integration tree. `git diff --check origin/main..HEAD` PASS.
- Changes since integrated verification: this documentation-only handoff closure records source/integrated commits and actual checks; runtime/tests/evidence are unchanged. Local links/staged/committed whitespace checked again at closure. Final main publication/CI is checked after push and its actual run reported in the task’s final response; no future CI pass is claimed here.

README/AGENTS/ART/survey guide need no updates: setup/product controls/agent policy/art/API are unchanged. PROJECT/SPEC/plan/index/VALIDATION/handoff update only the completed software acceptance and runnable test/evidence entry points. module-swap has no changed files or incidental checks.

## Known limits and next expected step

P4 software acceptance and main local integration are complete. Before ending publication, verify pushed main and its actual CI. P5 is the next separately assignable stage; do not automatically start it. P5 device/LAN/Safari/reading comprehension, sustained operation, FPS, Windows and S5 remain unverified. Scheduling metadata remains no viewer playback acknowledgement; no new recovery service or exhibition-day policy added.
