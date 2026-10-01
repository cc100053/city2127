# Validation and handoff

## Meter variety P4 — 2026-10-01 (`feat/meter-variety`, not integrated)

Root `npm test`, `npm run build` and `git diff --check` passed; survey/module-swap sources unchanged. `tests/districtMeters.test.ts` covers low/mixed/high counts, the 3 s rise, unchanged targets, invertible hidden matrices and legacy hide; `tests/odaiba.test.ts` checks every tower podium/lobby/crown, sky bridge and pod against actual ground, landmarks, context, civic core and guideway/sweep/promenade routes, and keeps all four sites visible from the hero pose at 2 / 4 / 6 modules; `surveyMeterPipeline` asserts the district on all 81 real server-answer combinations and its legacy hide. Skyway clearance was checked once in the built-in browser against the live skyway triangles (0 conflicts for towers, lobbies, bridges and pods), since `skyways.ts` cannot load in Node. Headless Chrome, 1920×929, DPR 1, original hero, `reviewTime=20`, only Q4 changed via `?meters=se:<band>`: low ↔ high **4.47%** at 16:00 (before P4 at `73d3dda`: 0.38%), **3.81%** at 21:00 (before 0.29%); day low ↔ mixed 2.69%, mixed ↔ high 2.39%. Same-condition full-pipeline draws: day 1175→1211 (low) / 1195→1231 (high), night 1181→1217 / 1201→1237 (+36, nine instanced batches); no FPS claim. Live `cityMeters('se:high')` from low converged to 10 towers / 0 pods with no console errors. Not run: real HTTP/WebSocket browser smoke for P4 (the 81-combination pipeline test covers the server → client → model path), human art review, Windows, hardware/endurance. Details: [P4 handoff](handoffs/meter-variety.md#p4--concentration-2026-10-01).

## Meter variety P3 — 2026-10-01 (`feat/meter-variety`, not integrated)

Root `npm test` and `npm run build` passed on P3 source `30db204` (based on `6f2bd35`); the complete committed-diff whitespace check passed after correction `357b917`; survey/module-swap sources unchanged. Checks cover actual canopy transforms (including invertible hidden matrices), live interruption/unchanged targets, immediate snapshots, all 81 real server-answer combinations, v2→legacy→v2 restore, boat beams / walker lanes / landward entrances in all three sharing identities. Browser capture found a zero-height curved-normal rendering failure; nonzero hidden scales fixed it, with a regression and fresh clean captures.

Headless Chrome 154.0.8037.58, 1920×929, DPR 1, original hero, `reviewTime=20`, only Q2 changed via `?meters=sw:<band>`: low ↔ high **3.51%** at 16:00 (before P3 0.07%), **3.32%** at 21:00 (before 0.03%). Day low ↔ mixed 1.06%, mixed ↔ high 2.64%. Full-pipeline draws: day 1131→1155, night 1137→1161 (+24, six instanced batches); no controlled FPS claim. Final console: existing favicon 404 only. Real scratch HTTP/WebSocket browser smoke passed snapshot, observed live transition, same-ID retry, reload, reset, low/night, reduced motion and standalone. Lossless captures, scratch DB and Git/CI closure: [P3 handoff](handoffs/meter-variety.md#p3--sharing-2026-10-01). Human art review, Windows, hardware/endurance and main integration remain pending. [Feature CI 36845024909](https://github.com/cc100053/city2127/actions/runs/36845024909) passed on `357b917` for all three packages and committed whitespace. An independent source comparison against `6f2bd35` also confirmed unchanged standalone skyway geometry attributes, material properties and shadow flags.

## Meter variety P2 — 2026-10-01 (`feat/meter-variety`, not integrated)

Root `npm test`, `npm run build` and `git diff --check` passed on P2 implementation `d03efa7` (based on `8b21ae2`); survey/module-swap code unchanged. New checks cover actual instanced actor counts, 160 walker/four-train continuity, unchanged fractional targets during a transition, interruption, reset/legacy restore, all 81 server-answer combinations and actual GLB service-pavilion placement/route clearance. Existing bundle-size warning remains.

Headless Chrome 154.0.8037.58, 1920×929, DPR 1, original hero, fixed actor time 20 s and only Q1 changed: low ↔ high **3.98 %** at 16:00 (before 0.35 %), **3.17 %** at 21:00 (before 0.17 %), both above the 3 % gate. Day low ↔ mixed 2.35 %, mixed ↔ high 1.85 %. Full-pipeline draws increase by 16: day low/mixed 1115→1131, high 1131→1147; night low/mixed 1121→1137, high 1137→1153. Console contains only the existing favicon 404. No controlled FPS or hardware claim. Lossless captures and real WebSocket smoke/CI closure: [handoff](handoffs/meter-variety.md#p2--automation-2026-10-01). Human art review and main integration remain pending under the existing handoff condition. Feature [CI 36840452458](https://github.com/cc100053/city2127/actions/runs/36840452458) passed for `d03efa7`, including all three packages and committed-diff whitespace.

## Meter variety P0 + P1 — 2026-10-01 (`feat/meter-variety`)

Root `npm test` (new `tests/districtMeters.test.ts`; district assertions on all 81 combinations in `surveyMeterPipeline`), `npm run build` and `git diff --check` passed; `survey/` and `module-swap/` unchanged. Readability gate (`scripts/meter-diff.py`, headless Chrome 1920×929, `?hour=16&reviewTime=20&meters=ne:<band>`): environment low ↔ high changed 4.33 % of the frame (0.16 % before), low ↔ mixed 2.05 %, mixed ↔ high 2.60 %, night 4.34 %. A built-in browser `window.cityMeters()` change eased over 3 s. Live `?survey` against the real server, real-GPU FPS, exhibition hardware and human art review not verified. Details and captures: [handoff](handoffs/meter-variety.md).

## Odaiba Dream Loop r6 (target v2) — 2026-10-01

Three more passes on `feat/odaiba-dream-loop-2` (`581ab7c`, `15772bf`, pass 3): root `npm test`/`npm run build`/`git diff --check` passed after each pass; headless day/night captures; built-in browser 16:00 console clean. Live `?survey`, FPS/draw calls and exhibition hardware not verified. Details: [handoff](handoffs/odaiba-dream-loop-2.md#round-6--target-v2-2026-10-01).

## Odaiba Dream Loop r5 (target v2) — 2026-10-01

Three more passes on `feat/odaiba-dream-loop-2` (`77daacb`, `6ae6cc0`, pass 3): root `npm test`/`npm run build`/`git diff --check` passed after each pass; headless day/night captures; built-in browser 16:00 without console errors or warnings. Live `?survey`, FPS/draw calls and exhibition hardware not verified. Details: [handoff](handoffs/odaiba-dream-loop-2.md#round-5--target-v2-2026-10-01).

## Odaiba Dream Loop r4 (target v2) — 2026-10-01

Three more passes on `feat/odaiba-dream-loop-2` (`e4ce8ea`, `8e1afe3`, pass 3): root `npm test`/`npm run build`/`git diff --check` passed after each pass and fix; headless day/night captures; built-in browser 16:00 without console errors. Live `?survey`, FPS/draw calls and exhibition hardware not verified. Details: [handoff](handoffs/odaiba-dream-loop-2.md#round-4--target-v2-2026-10-01).

## Odaiba Dream Loop r3 (target v2) — 2026-10-01

Three more passes on `feat/odaiba-dream-loop-2` (`aafbb50`, `776a613`, pass 3): root `npm test`/`npm run build`/`git diff --check` passed after each pass and fix; headless day/night captures and built-in browser (16:00) without console errors. The bay-context draw cap in `tests/odaiba.test.ts` rose from 4 to 5 for Ariake parkland. Live `?survey`, FPS/draw calls and exhibition hardware not verified. Details: [handoff](handoffs/odaiba-dream-loop-2.md#round-3--target-v2-2026-10-01).

## Odaiba Dream Loop r2 — 2026-10-01

Three Dream Loop passes on `feat/odaiba-dream-loop-2`: root `npm test`/`npm run build`/`git diff --check` passed after each pass and fix; built-in browser day/night without console errors. Live `?survey`, FPS and exhibition hardware not verified. Details, evidence and open decisions: [handoff](handoffs/odaiba-dream-loop-2.md).

## Odaiba art direction pass 1 — 2026-09-30

`feat/art-direction`, base `e587b54`, verified implementation `274167e`. Scope: replace the rendered Fuji office/podium/observation GLB with a civic chassis; retain original assets, hero, lighting, actor routes, seven other landmarks and survey contracts. Human art acceptance pending; no main integration. [Full audit / self-review](handoffs/odaiba-art-direction-01.md).

Root `npm test` (all ten scripts, including actual new-core aerial/bridge/site/actor raycasts), `npm run build` (strict TypeScript + Vite), and `git diff --check` passed. Existing >500 kB bundle warning remains. New core: six static material batches, 50,876 triangles, no per-frame geometry. Eight original source assets still match their hashes/bounds; runtime now uses seven GLBs plus the new core. Survey and module-swap sources unchanged; their package checks were not rerun for this root-only change.

Comparable evidence: headed Chrome / ANGLE Metal Apple M6, CSS 1920×1080, DPR 1, standalone, `?hour=16&reviewTime=20`, original untouched hero camera. Second pair adds the same `&review=civic` camera on both versions. Exact baseline loader from `e587b54` was served through a temporary development module/browser route; review harness identical on both, temporary source removed after evidence. Lighting, exposure, post chain, weather/state and actor time identical. [Hero before](../artifacts/odaiba-art1-before-hero.png) / [after](../artifacts/odaiba-art1-after-hero.png); [civic before](../artifacts/odaiba-art1-before-civic.png) / [after](../artifacts/odaiba-art1-after-civic.png).

| Fixed view | Before FPS / draws / geometries | After FPS / draws / geometries |
| --- | --- | --- |
| Hero | 21.5 / 1,338 / 343 | 21.3 / 1,331 / 341 |
| Civic | 23.2 / 1,067 / 343 | 23.2 / 1,060 / 341 |

FPS is the existing canvas's last 120-frame wall-clock sample after 12 s warm-up, not an isolated GPU benchmark. Both versions are well below 60 FPS in this session; **performance acceptance remains open**. This evidence supports reduced draw submissions, not a 60 FPS claim or equivalence to earlier M6 measurements. No renderer-quality reduction was used to improve the after frame.

Runtime smoke uses a separate loopback survey server at 8793 and `/private/tmp/odaiba-art1-survey.sqlite`: mixed baseline → one four-answer all-high proposal (ports 5, seats 7, trees 10, modules 5), staff `guest-left` → city reset → mixed (3/4/8/4), then one all-low proposal (1/2/5/3). The high diagnostics matched targets; reset UI returned to zero guests and the renderer's baseline port target was checked. Low's four final visible counts and non-transitioning concentration representation were checked at 16:00 and 22:00. No changes to exhibition data. Browser page errors/scene error UI absent; the existing `/favicon.ico` 404 is unrelated and remains. No 100-guest endurance, Windows, full guest UI acceptance, exact mesh-to-actor collision proof or structural engineering approval claimed.

Visual self-review: primary office slabs/window repetition are replaced by suspension, major void, diagonal circulation and a ring chamber. Original documentary Fuji silhouette and mint sphere beacon are intentionally gone. Core remains schematic, underoccupied and below R02 envelope quality; road/mall parcels, secondary buildings, thin coast, water and overall atmospheric treatment remain large gaps. The next single art priority is core-to-waterfront civic organization; this task stops for human review before another pass.

## README language and startup guide — 2026-09-30

Documentation-only change: the main README now has a Traditional Chinese Mac/Windows exhibition quick start, with separate English and Japanese guides. The guides identify the survey server and root city terminal tabs, the guest/city/admin/optional monitor browser tabs, default ports, SQLite persistence, staff exit confirmation, LAN binding and the legacy module-swap boundary. Startup commands and routes were checked against `package.json`, `survey/package.json`, `survey/src/server/server.ts`, `survey/vite.config.ts`, `src/main.ts` and the admin/monitor UI source. Local Markdown links in the three READMEs passed; Windows commands and a live cross-device LAN setup were not run. See the [README handoff](handoffs/readme-localization.md) for commit and integration status.

## Exhibition S3 — visibility refinement and validation — 2026-09-30

**Status: SHIPPED — integrated into main as `63af1b6b4c3f2c9ba39faaf18dae68f276b5f972`; [feature CI run 36599413799](https://github.com/cc100053/city2127/actions/runs/36599413799) passed on merge commit `17e305b` and [main CI run 36599599701](https://github.com/cc100053/city2127/actions/runs/36599599701) passed.** Core commit [`d51167bb1352c97e0b2135b3fb42852bd438699b`](https://github.com/cc100053/city2127/commit/d51167bb1352c97e0b2135b3fb42852bd438699b) is pushed to `origin/codex/exhibition-s3`; [feature CI run 36577963207](https://github.com/cc100053/city2127/actions/runs/36577963207) passed for that commit only. The post-CI SW/SE visibility changes and focused tests are commit `36b5c18`, which that historical CI run does not cover. Local root checks and final browser/API verification passed on them. `origin/main` (lifecycle + S4) was then merged into the S3 branch; see the S3 handoff for merge checks. The integrated result passed root/survey checks and CI as recorded above.

### Current implementation and API evidence

The post-CI visibility pass raises SW's dark electrochromic curved private screens to 2.4 m; as seats become shared, the screens fold flat. SE low uses two ground-level pavilions and twin glazed service heads above DOGENZAKA so the low configuration reads in the fixed hero view. Focused tests check screen material/height and projected SE cap separation/clearance at 1280×720 and 1920×1080. The heads are visible, but the SE ground pavilions remain occluded behind the foreground in the fixed hero view; the SW difference is subtle but discernible.

A fresh isolated API matrix passed 12 one-axis low/mixed/high cases, with each proposal changing only its target site, plus same-band count updates and high→mixed→low transitions. Confirmed target values:

| Site axis | Low | Mixed | High |
| --- | ---: | ---: | ---: |
| NW `automatedPorts` | 1 | 3 | 5 |
| SW `sharedSeats` | 2 | 4 | 7 |
| NE `treeCount` / planted fraction / cooling fins | 5 / .3125 / 5 | 8 / .5 / 3 | 10 / .6875 / 1 |
| SE `functionModules` | 3 | 4 | 5 |

Composite all-low reached −7.5 on each axis and `(ports=1, seats=2, trees=5, planted=.3125, fins=5, modules=3)`. Composite all-high reached +7.5 on each axis and `(ports=5, seats=7, trees=10, planted=.6875, fins=1, modules=5)`. Mixed returned `(ports=3, seats=4, trees=8, planted=.5, fins=3, modules=4)`. Scratch matrix output: `/private/tmp/city2127-s3.2AlzH7/api-matrix-final.json`.

### Browser capture set — 2026-09-30 JST

The 12 captures below were made from the isolated survey server on port 8790 and root Vite on port 5181. Final V01/V02 review accepted the low/mixed/high SW and SE distinctions at both viewports. Each screenshot is a current 2026-09-30 capture; earlier scratch candidates are not linked here.

| State | 1280×720 | 1920×1080 |
| --- | --- | --- |
| Low | [low](../artifacts/future-s3-low-1280x720.png) · [all-low](../artifacts/future-s3-all-low-1280x720.png) | [low](../artifacts/future-s3-low-1920x1080.png) · [all-low](../artifacts/future-s3-all-low-1920x1080.png) |
| Mixed | [mixed](../artifacts/future-s3-mixed-1280x720.png) · [all-mixed](../artifacts/future-s3-all-mixed-1280x720.png) | [mixed](../artifacts/future-s3-mixed-1920x1080.png) · [all-mixed](../artifacts/future-s3-all-mixed-1920x1080.png) |
| High | [high](../artifacts/future-s3-high-1280x720.png) · [all-high](../artifacts/future-s3-all-high-1280x720.png) | [high](../artifacts/future-s3-high-1920x1080.png) · [all-high](../artifacts/future-s3-all-high-1920x1080.png) |

Final local verification on the combined post-visibility worktree (2026-09-30 JST): root `npm test`, `npm run build` and `git diff --check` passed; build emitted only the existing warning for a bundle over 500 kB. The API matrix passed all 12 isolated one-axis low/mixed/high cases, each changing only its target site; same-band count updates and high→mixed→low passed. The site values are NW `automatedPorts` 1/3/5, SW `sharedSeats` 2/4/7, NE `treeCount` 5/8/10 with planted fractions .3125/.5/.6875 and fins 5/3/1, and SE `functionModules` 3/4/5. Composite all-low reached −7.5 on all axes with `(ports=1, seats=2, trees=5, planted=.3125, fins=5, modules=3)`; all-high reached +7.5 with `(5,7,10,.6875,1,5)`; mixed returned `(3,4,8,.5,3,4)`. API scratch output: `/private/tmp/city2127-s3.2AlzH7/api-matrix-final.json`.

Snapshot and reconnect checks passed: reload restored an all-high v2 `city-state-snapshot` at revision 1; forced WebSocket reconnect returned the identical snapshot without `city-state-updated`. Admin reset from high emitted exactly `run-reset` with mixed revision 0, rendered within 100 ms and showed no visible flash/pulse. Frame comparison found mean absolute RGB difference .063 between 100 ms and 3 s, with 0.081% of pixels above 30 max-channel difference, attributable to moving actors; reconnect difference was below 0.16%. A standalone smoke at `http://127.0.0.1:5181/?hour=12`, 1280×720, showed scene/title/canvas with zero new console/page errors and no survey-server requests or socket (only Vite HMR WebSocket). Root v1 was not browser-tested in this final pass; existing root unit tests cover its code paths, but module-swap tests are not evidence for root v1. Scratch frame paths and API details are recorded in the S3 handoff. No FPS, physical exhibition-PC, hardware or cross-platform result is claimed.

The earlier feature CI run validates only `d51167b`; the visibility commit `36b5c18` passed feature CI via docs commit `f36e392` (run 36598935005), and the main-merged branch passed [feature CI run 36599413799](https://github.com/cc100053/city2127/actions/runs/36599413799) before integration.

## Exhibition S4 acceptance pass — 2026-09-30

**Status: SHIPPED — [feature CI 36631026705](https://github.com/cc100053/city2127/actions/runs/36631026705) passed on `5ae6e35`; integrated as `5e140788d29608ac15513f7f9ba6576100e3d524` (tree identical; root/survey checks re-passed) and [main CI 36631134812](https://github.com/cc100053/city2127/actions/runs/36631134812) passed.** Branch `codex/exhibition-s4-acceptance` from `main` `8de107b`. Changes: guest result (~10 s) → handoff (~5 s) → welcome auto-advance; Japanese `lifecycle_blocked` wait message; review `変更` returns to review; tighter guest spacing for 1280×720; root v2 panel shows the `最近64人` count and 12-column band before the latest proposal, with city changes first and compact answers.

Evidence (isolated survey server `127.0.0.1:8792` with a temp DB, root Vite `127.0.0.1:5184`, built-in browser, DOM measurements plus visual review; no screenshots archived): keyboard-only four-question flow with visible focus and text selection state; reload mid-draft restore; back/edit; simulated lost response replayed once on reload (`#1`, one guest); result → handoff (5.0 s measured) → welcome with storage cleared; `lifecycle_blocked` wait message until admin `guest-left`; 60 s idle warning focused `続ける`, 15 s later the draft ended with guest count unchanged; question pages 720 px tall at 1280×720 and review submit bottom 717 px. Root panel at 1280×720 went from band at 854 px (panel 120–520 px) to band 261–386 px with 64 cells (70 guests, oldest `#7`) and the first two change rows at 409/450 px; 1920×1080 matched and the panel does not cover sites. Root `npm test`/`npm run build`, `survey/` `npm test`/`npm run build` and `git diff --check` passed. Remaining deviations: no 10 s two-hint sequencing, no inherited-city welcome wording, root 3 s transitions ignore reduced motion, result page scrolls at 720 px. S5 (endurance, hardware/FPS, user understanding) is open. Details: [S4 handoff](handoffs/exhibition-s4.md).

## Exhibition S4 feature-branch implementation — 2026-09-29

**Integration — 2026-09-30:** `feat/exhibition-lifecycle` then `codex/exhibition-s4` were merged `--no-ff` into `main` (both feature heads had passing CI: runs 36587814266 and 36561969500). Conflicts in `survey/package.json`, `survey/src/ui/debug.css`, `docs/PROJECT.md` and this file were resolved by keeping both sides. On the merge result, root `npm test`/`npm run build` and `survey/` `npm test` (including `lifecycle` and `guestFlow`)/`npm run build` passed. No browser check was run. Known combined gap: the S4 guest UI has no dedicated `lifecycle_blocked` wait screen; starting a new session before staff confirm the exit shows the generic `通信エラー（lifecycle_blocked）` notice. S4 remains PARTIAL/not accepted and S3 is still not integrated.

**Status: PARTIAL; feature commit pushed, CI status unverified; not accepted.** Commit `960d9b7c520af7f845bb6c0a2df47d17ad222f9f` on `origin/codex/exhibition-s4` adds a four-question guest UI with localStorage draft/session recovery and proposal retry, plus root latest-proposal feedback and a vote band that renders up to 64 recent proposals. The feature branch is not integrated; `origin/main` remains at `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`. S3's other three site mappings are absent and S4 depends on S3; full S4 acceptance and exhibition acceptance remain open. The owner and exact Git state are recorded in the [S4 handoff](handoffs/exhibition-s4.md).

Local checks ran on the tracked source tree immediately before it became feature commit `960d9b7c520af7f845bb6c0a2df47d17ad222f9f`: root `npm test` and `npm run build` exited 0; build printed the existing >500 kB chunk warning. Survey `npm run build` and the focused `survey/tests/guestFlow.test.ts` check exited 0. Full `cd survey && npm test` failed in the sandbox when a server test attempted to listen and received `EPERM`; an escalated retry was attempted, but its outcome is unknown for this record, so the full suite is not marked passed. No feature CI run ID, status, or conclusion was verified. `git diff --check` and local Markdown link targets passed for this documentation-only update. These results do not establish browser or integrated acceptance.

Timing gap against the spec: the result screen requires a manual `次の方へ` action and does not implement the approximate 10-second result / 5-second handoff; the root panel does not sequence two change hints over 10 seconds. These are open S4 exit-gate items.

Browser status: the root and survey local endpoints returned HTTP 200 only. CUA could not inspect the UI because the Mac was locked. Playwright browser launch was unavailable because its Chromium revision was missing and the installed Chrome exited with SIGABRT. No screenshots were captured. The `最近64人` band displays up to 64 cells from `recentProposals` and follows the long latest-feedback rows in a 400px scroll panel; visibility at idle at 1280×720 is unverified and may require scrolling. No browser, visual, accessibility, physical-display or S3 checks are claimed.

## Exhibition lifecycle and admin reset — 2026-09-29

**Status: IMPLEMENTED on `feat/exhibition-lifecycle`, not integrated.** Checked on the branch working tree (base `eaf230e`). `survey/`: `npm test` (14 suites, including the new `tests/lifecycle.test.ts`) and `npm run build` passed; `git diff --check` passed. Root and `module-swap/` sources are unchanged. The lifecycle test covers cumulative inheritance, a reset queued during an experience that survives submission and runs only on `guest-left`, an immediate reset in `ready`, full-reset precedence/cancel/total clearing, stale `expectedRevision` and double exit confirmation, replayed submissions counted once, an abandoned session, the ready/pending CHECK and restart persistence. Headless Chromium (playwright-cli) against a scratch DB showed the admin page's phase, both counters and four meters; a city reset queued from one admin session appeared in a second session, the next guest session was refused, and confirming the exit from the second session executed the reset (new run, 0 guests). No root-scene browser capture was taken for this change: the scene uses the existing `run-reset` path unchanged. Remote LAN admin access is still not available (loopback only).

## Exhibition S2 — Q3 climate vertical slice — 2026-09-29

**Status: SHIPPED.** Feature commit `2357f09526d17adbe1c52f4bb79c4fa025fe0d0d` passed [feature CI](https://github.com/cc100053/city2127/actions/runs/36516892136). It was merged with an identical tree as `3417760be33884c5d6a7697f0a8c1655a9ca4a10` and pushed to `origin/main`; integrated root `npm test`, `npm run build` and `git diff --check` passed. [Main CI](https://github.com/cc100053/city2127/actions/runs/36517115203) also passed. S2 covers only the Q3 NE Park slice; other site mappings remain S3, the guest UI remains S4, and full exhibition acceptance remains open. See the [S2 handoff](handoffs/exhibition-s2.md) for exact run IDs and the API/parser matrix.

Real four-question proposals on the scratch survey DB produced distinct mature NE low/mixed/high Park states; same-band accumulation and retargeting changed the tree count as expected. The other three sites stayed on their populated mixed baseline. The v2 root path applies the server layout without blending Q3 scores into global atmosphere; sampled clear-sky pixels matched across the fixed-hour low/mixed/high screenshots. The read-only parser probe rejected five malformed v2 payloads before renderer application and ignored duplicate/stale revisions.

Headless Chrome at 1280×720/DPR 1 and hour 12 matched rendered Park counts to the API. The actual 12-tree GLB and fallback fit the NE ±5 m site. An intentional GLB failure rendered the procedural grove and the automatic retry restored the same authoritative count; clean reload and reduced-motion checks passed. Three-item history fit at 1280×720 and 1920×1080; those panel-only frames predate the tree-fit correction and are not geometry evidence.

Final post-containment scene evidence: [low](../artifacts/future-s2-q3-low-verified-1280x720.png) ([Park crop](../artifacts/future-s2-q3-low-park-verified-1280x720.png)), [mixed](../artifacts/future-s2-q3-mixed-verified-1280x720.png) ([Park crop](../artifacts/future-s2-q3-mixed-park-verified-1280x720.png)), and [high](../artifacts/future-s2-q3-high-verified-1280x720.png) ([Park crop](../artifacts/future-s2-q3-high-park-verified-1280x720.png)). Three-item panel frames: [1280×720](../artifacts/future-s2-panel-3history-1280x720.png), [1920×1080](../artifacts/future-s2-panel-3history-1920x1080.png). Captures were taken 2026-09-29 from the feature tree; the merged commit has the same tree. No real-GPU FPS, physical exhibition hardware, S3/S4 mapping, or 100-guest endurance claim is made. Scratch API writes did not touch display data.

## Exhibition S1 2026-09-28

S1 was implemented on `codex/exhibition-s1` from base `f8fa07ab58610c19e5764be6bec325cf9ddd53f9`. Feature commit `c52bfda444ac4e4bd764c8133e02a59fab35f94d` was pushed and its feature CI passed. Integrated commit `7beff5e238eb680ef4bc66997f6281ac0bf50282` is pushed to `origin/main`, with the same tree and no conflicts; all local integrated package checks passed. [Main CI run 36382621824](https://github.com/cc100053/city2127/actions/runs/36382621824) passed. The complete ownership and publish record is in the [S1 handoff](handoffs/exhibition-s1.md).

**Verification status: PASSED for S1.** On integrated HEAD, root `npm test` (6 scripts), survey `npm test` (13 scripts), and module-swap `npm test` (15 tests) passed; `npm run build` passed in all three packages, as did `git diff --check`. Builds emitted only existing bundle-size warnings. The focused rules check `cd survey && node --experimental-strip-types tests/exhibitionRules.test.ts` also passed before it was wired into the full suite. Feature CI passed at [run 36382294265](https://github.com/cc100053/city2127/actions/runs/36382294265), and main CI passed at [run 36382621824](https://github.com/cc100053/city2127/actions/runs/36382621824). Wider exhibition acceptance remains open; see the [S1 handoff](handoffs/exhibition-s1.md).

Independent scratch probes passed for same-direction and reversal reducer fixtures, zero/alternating 1,000-proposal and axis-isolation cases, score-state validation, layout boundary mapping, request parsing, migration DDL/replay preservation and proposal transaction/idempotency/concurrency/rollback. These probes used temporary `/private/tmp/s1-*.ts` scripts and are not committed tests or artifacts.

Browser compatibility was checked with mock WebSockets in headless browser sessions. Both root and module-swap displayed `Unsupported exhibition view version` for explicit v2 and left v2 scene content unapplied. Explicit v1 frames still connected in both viewers, and module-swap standalone mode still loaded its GLBs. A separate browser run against the built v2 survey app showed `/admin` and `/monitor` connected at revision 0; after one four-answer proposal, the monitor live-updated to revision 1 with all four bands high and the latest proposal, and admin showed one proposal. The mock viewer harness used `http://127.0.0.1:5173/?survey=ws://127.0.0.1:18787/ws` and module-swap on port 5174. This did not test a versionless legacy v1 frame, physical exhibition hardware or GPU performance.

The 100-proposal/60-minute exhibition endurance, real-GPU FPS, exhibition-PC, Windows and user-understanding checks remain open. The guest UI still uses the legacy one-question flow and cannot submit against the active v2 run; S2/S3 rendering and S4 guest UI remain future work.

## Exhibition MVP planning — 2026-09-28 (documentation only)

[EXHIBITION_MVP.md](EXHIBITION_MVP.md) defines next-version requirements and an explicitly **unexecuted** acceptance matrix, including populated neutral sites and futuristic low-value variants. Its numerical fixtures are specification checks, not evidence that the new runtime exists. The planning task changes no executable code or assets; it requires local Markdown link checks, source/fact comparison, numerical fixture verification and diff review, not new rendering or local package builds. Actual task results and Git integration are recorded in [the planning handoff](handoffs/exhibition-mvp-plan.md). Earlier screenshots and FPS records below must not be reused as proof of the proposed version.

## AUTO HUB upper GLB Stage 3 — 2026-09-27

Stacked branch `codex/automation-hub-upper-glb` contains Stages 1+2+3; compare it to `codex/shibuya-site-assets` for the Stage 3-only delta. Blender 5.2.2 produced the editable `automation-hub-upper.blend` and uncompressed 75,428-byte GLB. Empty-scene reimport verified root identity, stable root/front-marker names, metadata, four material roles, 12 meshes, 1,796 triangles, exact Blender bounds `(-2.9,-2.9,0)` to `(2.9,2.9,20.3)`, and no camera/light/animation.

Node `24.21.0`: root `npm test` passed with 12 PASS lines; `npm run build` passed with the existing >500 kB chunk warning and emitted the 75.43 kB GLB; `git diff --check` passed. The tall AUTO HUB lazily validates and remaps the GLB to shared city materials, while medium makes no request. A failed load keeps the procedural upper and publishes fallback diagnostics.

Browser smoke: headless Google Chrome, 1280×720, DPR 1, held noon, root Vite on 5173 and scratch survey DB/server on 8787. Baseline and medium made zero hub-asset requests; tall made one and reached `ready`; reload restored tall with one new-page request; reset returned every site to baseline. All-sites was 521 draw calls / 133 geometries with no console exception or non-favicon HTTP error. The saved all-sites frame was inspected for placement, scale and material continuity. A second run intercepted the GLB request: status became `fallback` and the procedural tall hub remained rendered at 521 / 133. Real-GPU FPS was NOT RUN. Full asset contract and limitations: [handoff](handoffs/automation-hub-upper-glb.md).

Reliability follow-up `2a781c7`: a failed runtime preparation can be retried; `CityChangeManager` retries active fallback layers after 5 seconds and a new activation retries immediately. PARK has a baked procedural five-tree grove until the GLB grove is attached, then disposes only that independent fallback geometry. Unit tests cover failure → retry success and the manager cooldown. In headless Chrome the first PARK-site request and first HUB request were intentionally aborted: retry requests occurred after 5,039 ms and 5,049 ms, both recovered to `ready`, the failure frames retained their procedural grove/upper, and the page error list remained empty. The final recovered frame was 521 draw calls / 133 geometries. A slow load can still make the detailed GLB replace its fallback after the rise completes, but no current GLB layer is visually empty while waiting.

## Shibuya hybrid site assets Stage 2 — 2026-09-27

Stacked branch `codex/shibuya-site-assets` contains Stage 1 plus Stage 2; compare it to `codex/shibuya-change-manager` for the Stage 2-only delta. The change catalogue now records layer kind/animation/asset ID, PARK is split into procedural surface and lazy GLB trees, and the future-tree GLB goes through a validating one-request-per-page cache. `CityChangeManager` starts optional asset preparation on activation, exposes layer readiness/fallback diagnostics without blocking snapshot/live/reset transitions, and retries an active fallback after 5 seconds. PARK displays a baked procedural grove until its GLB grove is attached atomically.

Node `24.21.0`: root `npm test` passed with 12 PASS lines, including cache reuse, retry after invalid load, runtime failure → retry success, manager cooldown, root/bounds/Camera/Light/animation validation, compatibility and fallback diagnostics. `npm run build` passed with the existing >500 kB chunk warning and emitted the existing 79.70 kB tree GLB. `git diff --check` passed. No dependency, survey server, module-swap or binary asset changed.

Browser smoke: headless Google Chrome, 1280×720, DPR 1, held noon, root Vite on 5173 and scratch survey DB/server on 8787. At the empty snapshot `parkTrees` was `idle`; only the base city's existing Hachiko tree was requested. The first three answers caused no site-tree request. `cooling-park` changed the layer to `ready` and made exactly one additional GLB request; all four sites/tall layers were 521 draw calls / 133 geometries. Reload restored the same state and reset returned to 356 draw calls with every variant at baseline. No console exception or non-favicon HTTP error occurred. These headless values are regression evidence, not a real-GPU FPS measurement.

## Shibuya change manager Stage 1 — 2026-09-27

Branch `codex/shibuya-change-manager`, based on `aea125e` after the art-direction merge. The former monolithic `src/surveySites.ts` is split into the typed survey event boundary (`surveyView.ts`), data-driven Shibuya registry (`changeCatalog.ts`), renderer adapter (`cityChangeManager.ts`) and four procedural builders (`siteBuilders/`). The survey server remains authoritative: the client selects variants only from `CityView.layout`; no score trigger, priority resolver, schema, question or server change was added. Existing geometry, materials, per-layer `bake()`, 3 s rise/sink and 10 s saffron live-change semantics are preserved. Snapshots/reconnects/reset do not pulse, live updates animate changed layers only, and an in-flight transition can be retargeted from its current scale.

Node `24.21.0` / npm `11.19.0`: root `npm test` passed with 11 PASS lines, including exhaustive current layout-to-variant selection and manager tests for snapshot restore, live medium→tall addition without restarting the base, unchanged updates, mid-motion retargeting, reconnect restore, reset and runtime validation. `npm run build` passed with the existing >500 kB chunk warning; `git diff --check` passed. `survey/` and `module-swap/` source are unchanged.

Browser smoke: headless Google Chrome at 1280×720, device pixel ratio 1, held noon, root Vite on port 5173 and a fresh scratch survey SQLite DB/server on port 8787. The five API answers were `automate-services`, `public-commons`, `build-upward`, `cooling-park`, `care-robots`, producing all four sites and both upper layers. Baseline survey state was 356 draw calls / 90 geometries; changed state and reload restore were 521 / 133; reset returned to 356 draw calls (geometry memory remains allocated at 133). The causal panel showed the latest choice and three-item history throughout. There were no console exceptions or non-favicon HTTP errors. Non-survey `?hour=12` created no causal panel and rendered at 356 / 90 with no such errors. A separate checkout of unchanged `aea125e` rendered the exact same five-answer state at 521 / 133, confirming no draw-call or geometry regression. Headless FPS samples are intentionally not reported as performance evidence; real-GPU all-sites FPS remains unmeasured.

## Art-direction integration — 2026-09-25

`feat/art-direction` merged into main with `--no-ff` as `2126a2c` (origin/main was still the task base `5894f87`). Branch CI passed on `3ec57fd`. On the merge result: `npm test` 9 PASS, `npm run build` PASS (existing chunk-size warning), `git diff --check` clean. `survey/` and `module-swap/` are unchanged. Headless smoke at 1280×720 in city and `?survey` modes: no console errors except the favicon 404; draw calls city 356, survey 505.

## Road flicker fix — 2026-09-25

User report during review: the east–west road flickers, but only when the camera is zoomed out and moving. Held-clock frame diffs on the real GPU showed no change on the road with a still camera, so the moving sun was ruled out. Headed Chrome (ANGLE Metal, Apple M6) at 1280×720, zoomed fully out and dragged to a steep view with real mouse input: with the camera near plane at .1, large parts of the road z-fought with the ground plate (hatched and missing bands); with near = 1 the same view is clean ([comparison, top .1 / bottom 1](../artifacts/road-zfight-near-compare.png)). Fix: near plane 1 in `heroCamera.ts`. The lane dashes were also changed from 0.13-wide boxes to a mipmapped strip texture, because they fell below a pixel at a distance; at the hero pose they still read as crisp dashes. `npm test` 9 PASS, `npm run build` PASS, `git diff --check` clean. The user has not yet confirmed the fix in the review window.

## Art-direction actor pass — 2026-09-25

Only `src/mobility.ts` changed (people and pod geometry, per-instance colours; counts, routes and timing unchanged). `npm test` 9 PASS, `npm run build` PASS (existing chunk-size warning), `git diff --check` clean. Headless 1280×720 capture at `?hour=12`, 6 s after load so pods are on the road: [actors](../artifacts/art-actors-preset.png). Headless draw calls: city 352 (was 344; the new body, tyre, hair and trousers materials). Real-GPU FPS for this pass was not measured.

## Art-direction polish pass 3 — 2026-09-25

Branch `feat/art-direction`, uncommitted pass on top of `adfa33d`; only `src/cityRig.ts` and `src/surveySites.ts` changed ([ART.md checklist](ART.md#polish-pass-3-2026-09-25)). `npm test` passed with 9 PASS lines, including upper-volume and site clearance. `npm run build` passed, with the existing chunk-size warning. `git diff --check` is clean. `survey/` and `module-swap/` are unchanged.

Captures: Playwright CLI (headless SwiftShader) at 1280×720 on the untouched hero pose, with the scratch survey server on port 8788 (the same five guests: all four sites up, SE tall): [preset 12:00](../artifacts/art-polish-preset.png), [survey 12:00](../artifacts/art-polish-survey.png), [survey 22:00](../artifacts/art-polish-survey-2200.png). Compare with [step 4 survey](../artifacts/art-step4-survey.png). The only console entry is the existing favicon 404. Changing the window count of the wings changed the number of `kit.random()` calls, so the seeded skyline was reshuffled again (still 60 blocks).

Real GPU: headed Google Chrome via `playwright-cli -s=gpu open --browser=chrome --headed`, ANGLE Metal on an Apple M6, pixel ratio 1. Samples were taken after 14 s and 17 s, each averaging 120 frames:

| Viewport | Clock | Mode | FPS | Draw calls |
| --- | --- | --- | --- | --- |
| 1280×720 | `?hour=12` | city | 60.0 | 344 |
| 1280×720 | `?hour=12` | survey | 60.0 / 59.9 | 493 |
| 1280×720 | `?hour=22` | survey | 60.0 | 493 |
| 1920×1080 | `?hour=12` | city | 60.0 | 344 |
| 1920×1080 | `?hour=12` | survey | 60.0 / 60.1 | 493 |
| 1920×1080 | `?hour=22` | survey | 60.0 / 60.1 | 493 |

City draw calls are unchanged because everything is baked per material. Survey went from 489 to 493 because the SE tall part now also uses `leaf`. User art review is pending.

## Art-direction status and real-GPU recheck — 2026-09-25

Checked commit `6e74eec` on `feat/art-direction`, which includes the lighting passes and the day/night cycle. `npm test` passed with 9 PASS lines. `npm run build` passed, with the existing chunk-size warning. `survey/` and `module-swap/` are unchanged.

Real GPU: headed Google Chrome 154 via `playwright-cli -s=gpu open --browser=chrome --headed`, ANGLE Metal on an Apple M6, pixel ratio 1, tab visible, no other browser session running. Survey mode used the scratch DB on port 8788 with five guests (自動化 +2 · 公共共有 +4 · 環境優先 +2 · 都市集約 +2, all four sites up). Two samples were taken after 12 s of warm-up, each averaging 120 frames:

| Viewport | Clock | Mode | FPS | Draw calls | Geometries |
| --- | --- | --- | --- | --- | --- |
| 1280×720 | `?hour=12` | city | 59.9 | 344 | 87 |
| 1280×720 | `?hour=22` | city | 59.9–60.0 | 344 | 87 |
| 1280×720 | `?hour=12` | survey | 60.0 | 489 | 125 |
| 1280×720 | `?hour=22` | survey | 60.0 | 489 | 125 |
| 1920×1080 | `?hour=12` | city | 60.0 | 344 | 87 |
| 1920×1080 | `?hour=22` | city | 60.0 | 344 | 87 |
| 1920×1080 | `?hour=12` | survey | 60.0 | 489 | 125 |
| 1920×1080 | `?hour=22` | survey | 60.0 | 489 | 125 |

The display is capped at 60 Hz. The ~56 FPS reading at 1080p survey on 2026-09-25 (step 4) did not recur here. The exhibition PC is still unmeasured. Remaining work and review status are listed in the [art-direction handoff](handoffs/art-direction.md#remaining-work).

## Day/night cycle replaces the preset buttons — 2026-09-25

Branch `feat/art-lighting`. New `src/dayCycle.ts`; `main.ts`, `overlay.ts`, `worldState.ts`, `style.css` and `tests/worldState.test.ts` changed. `npm test` PASS (with new day-cycle assertions), `npm run build` PASS, `git diff --check` clean. Playwright CLI (headless SwiftShader) captures at 1280×720 on the hero pose, held with `?hour=`: [12:00](../artifacts/daycycle-1200.png), [06:18 dawn](../artifacts/daycycle-0618-dawn.png), [17:48 dusk](../artifacts/daycycle-1748-dusk.png), [22:00 night](../artifacts/daycycle-2200-night.png) and [survey at 22:00](../artifacts/daycycle-survey-2200.png) (reading the main worktree's survey server). Live clock without `?hour`: 12:25 at about 3 s and 17:54 at about 45 s, when the text had switched to night colours. [18:03 frame](../artifacts/daycycle-live-1803.png). No console errors. Draw calls are unchanged (preset 344, survey 400). Real-GPU FPS was not measured. The headless run reported 60 FPS, which is not evidence.

## Art-direction lighting, "expensive" pass — 2026-09-25

Branch `feat/art-lighting`, following the pass below; `src/main.ts` only. VSM soft shadows replace PCFSoft, with radius 5 and 12 blur samples. GTAO is broader (radius 3, 16 samples, blend 1), exposure is .84, and bloom uses threshold 1 and strength .1. A new `VignetteShader` pass (offset .9, darkness .9) sits before output. AgX (exposure 1.15) was tried and rejected as flat and grey. Playwright CLI (headless SwiftShader) captures at 1280×720 on the hero pose: [preset](../artifacts/light-expensive-preset.png), [Pulse](../artifacts/light-expensive-pulse.png), [Still](../artifacts/light-expensive-still.png) and [survey, two guests](../artifacts/light-expensive-survey.png). The comparison baseline is [light-after-preset](../artifacts/light-after-preset.png). Headless draw calls: preset 337 → 344 and survey 393 → 400; the extra calls are VSM blur and the vignette. `npm test` PASS, `npm run build` PASS, `git diff --check` clean. Real-GPU FPS was not measured. VSM blur and the heavier GTAO cost more GPU time, so measure them first if FPS drops.

## Art-direction lighting pass — 2026-09-24

Branch `feat/art-lighting` (separate worktree, based on b549785; the uncommitted second building rollout was not included). Change is `src/main.ts` lighting only: Neutral tone mapping (exposure .92), a lower, warmer sun (2.55), a cooler and weaker hemisphere fill (.62), and the Still sun boost cut from .4 to .05. A sky-gradient PMREM environment was also tried and rejected: it lit diffuse surfaces too blue and muddy, and did not visibly improve the glass at the hero distance. `RoomEnvironment` stays.

Playwright CLI (headless SwiftShader) captures at 1280×720 on the untouched hero pose: [before, preset](../artifacts/light-before-preset.png); after: [preset](../artifacts/light-after-preset.png), [Pulse](../artifacts/light-after-pulse.png), [Still](../artifacts/light-after-still.png) and [survey, two guests](../artifacts/light-after-survey.png) (the survey server from the main worktree was running and was only read). Headless draw calls are unchanged: 337 for preset and 393 for survey with two guests. `npm test` PASS, `npm run build` PASS (existing chunk-size warning), `git diff --check` clean. Pulse and Still have no before capture from this session. Real-GPU FPS was not measured, but the pass adds no lights, passes or geometry.

## Art-direction step 4: sites and ground — 2026-09-25

Branch `feat/art-direction`; see [ART.md step 4](ART.md#step-4-sites-and-ground-2026-09-25). `npm test`, `npm run build` and `git diff --check` all passed. Headless Playwright took [preset](../artifacts/art-step4-preset.png) and [survey, five guests](../artifacts/art-step4-survey.png) at 1280×720 on the untouched hero pose. Console output was only the existing favicon 404. Draw calls are 337 (preset, unchanged) and 482 (survey, up from 466; the new water material and pad pieces account for it).

Real GPU: headed Chrome 154 via `playwright-cli -s=gpu open --browser=chrome --headed`, on ANGLE Metal Apple M6, pixel ratio 1, tab visible.

| Viewport | Mode | FPS | Draw calls |
| --- | --- | --- | --- |
| 1280×720 | preset | 60.0 | 337 |
| 1280×720 | survey, all sites | 59.9 | 482 |
| 1920×1080 | preset | 59.9 | 337 |
| 1920×1080 | survey, all sites | 56.1–56.7 | 482 |

The first run had a headless SwiftShader session rendering in the background. With CPU contention it read 38–41 FPS at 1080p and 55 at 720p survey. Close every other browser session before measuring. The 1080p survey figure (~56) is the first below vsync on this Mac, so recheck GTAO first if the exhibition PC is weaker.

## Art-direction building pass 2 — 2026-09-24

The user reviewed the rollout and said "only the front has windows" and "all buildings look identical". The fixes are on `feat/art-direction` ([ART.md pass 2](ART.md#building-pass-2-2026-09-24)). `npm test` passed. `tests/mobility.test.ts` roof allowances were raised, not shrunk, for Center-gai (3.8, ring crown and mast) and the station (4.2, glass vault). `npm run build` passed and `git diff --check` was clean.

- Screenshots from Playwright (headless) at 1280×720: [preset hero](../artifacts/art-buildings2-preset.png) and [survey hero](../artifacts/art-buildings2-survey.png), both on the untouched pose. Orbit views [north](../artifacts/art-buildings2-orbit-north.png) and [west](../artifacts/art-buildings2-orbit-west.png) were taken after a mouse drag, so they are not comparison poses; they show glazing on the back and side faces. Console output was only the existing favicon 404.
- Known side effect: `windows()` now makes a different number of `kit.random()` calls, so the seeded distant skyline ring changed shape. It is still 60 hazed blocks.
- **Real-GPU performance.** Playwright launched headed Google Chrome 154 (`--browser=chrome --headed`) with renderer "ANGLE (Apple, ANGLE Metal Renderer: Apple M6)", pixel ratio 1 and the tab visible. After warm-up, each sample averaged 120 frames:

  | Viewport | Mode | FPS | Draw calls | Geometries |
  | --- | --- | --- | --- | --- |
  | 1280×720 | preset (Daylight) | 60.0 | 337 | 86 |
  | 1280×720 | `?survey`, all four sites up | 60.0 | 466 | 120 |
  | 1920×1080 | preset (Daylight) | 60.0 | 337 | 86 |
  | 1920×1080 | `?survey`, all four sites up | 56.0 → 60.0 | 466 | 120 |

  The same numbers were measured before pass 2, on `b549785`. The display is capped at 60 Hz, so this shows headroom only up to vsync on this Mac. It says nothing about the exhibition PC. The Claude-in-Chrome extension tab stayed `hidden` and was not used.

## Art-direction building rollout — 2026-09-24

After the user said "ok, polish building", [ART.md](ART.md) was rolled out to the buildings on `feat/art-direction`. `npm test` and `npm run build` passed, with the existing chunk-size warning only. `git diff --check` was clean. `survey/` and `module-swap/` are unchanged.

Playwright CLI (headless SwiftShader) took captures at 1280×720 on the untouched hero pose. [Preset](../artifacts/art-buildings-preset.png) compares directly with [pilot preset](../artifacts/art-pilot-preset.png). [Survey, five guests](../artifacts/art-buildings-survey.png) compares with [pilot survey](../artifacts/art-pilot-survey.png) and uses the same scratch DB. Still (key `2`) was also checked at the same pose: the judgment was shown and nothing broke. Console output was only the existing favicon 404. Headless stats (not performance evidence): preset 337 draw calls / 86 geometries, and survey 466 / 120. Both are unchanged or +4, because the new detail goes through `bake()`. **Real-GPU FPS is still not measured**: the Chrome tab stayed `hidden`.

## Art-direction pilot — 2026-09-24

Branch `feat/art-direction` (handoff [art-direction](handoffs/art-direction.md)), rules [ART.md](ART.md). `npm test` and `npm run build` passed, with the existing bundle-size warning only. `git diff --check` was clean. `survey/` and `module-swap/` are unchanged.

Browser: Playwright CLI (headless Chromium, SwiftShader) at exactly 1280×720 on the untouched hero pose, root dev server on port 5180, and a scratch survey server/DB on port 8788. The five guests went through the HTTP API: `automate-services`, `public-commons`, `build-upward`, `cooling-park`, `open-plaza`. That gives scores 自動化 +2 · 公共共有 +4 · 環境優先 +2 · 都市集約 +2, with all four sites up and the SE tower at base height.

- Before: [preset](../artifacts/art-before-preset.png) and [survey, five guests](../artifacts/art-before-survey.png). After: [preset](../artifacts/art-pilot-preset.png) and [survey, five guests, reloaded](../artifacts/art-pilot-survey.png). The after capture was reloaded from the snapshot, so its outlines are steady.
- Live change: after an admin reset and one new guest (automation → AUTO HUB), the [guest 1](../artifacts/art-pilot-survey-guest1.png) frame was taken about 4 s later, during the pulse. Sequential frames showed the saffron outline at full opacity while the hub was still rising, a visible brightness pulse, and a steady saffron line after 10 s.
- The Pulse preset (key `1`) was checked at the same pose: the drum screen and the terraces stay readable, and nothing else changed. Console output was only the existing favicon 404.
- Headless stats (SwiftShader; **not** performance evidence): preset draw calls 170 → 337 and geometries 84 → 86. Survey with all sites went from 576 → 462 draw calls and 141 → 119 geometries. Before the parts and park trees were baked, it was 946.
- **Real-GPU FPS: NOT MEASURED.** Claude in Chrome connected to desktop Chrome on an Apple M1 Pro (ANGLE Metal), but the tab reported `document.visibilityState = hidden`, so no frames rendered. Window resize was also ignored. The 1280×720 and 1920×1080 measurements need Chrome in the foreground.
- Not verified: user art review, other Chrome sizes, and a full 32 s delivery cycle with the new passes.

## Root scene causal panel — 2026-09-24

Step 3 on `feat/root-causal-panel` (handoff [root-causal-panel](handoffs/root-causal-panel.md)). `npm test` (`policyText`/`cityText` added to `tests/surveyAtmosphere.test.ts`) and `npm run build` passed; `survey/` and `module-swap/` unchanged. Browser: Playwright CLI (headless Chromium) at 1280×720, fresh scratch survey DB on port 8788, the same five guests through the HTTP API. The empty run showed the waiting message ([empty](../artifacts/causal-panel-empty.png)). After five guests the uncapped card reached y≈605 and covered the SW plaza; after capping the history at three (numbered 3–5) and the card at 400 px, a reload showed the latest decision, CHOICE / POLICY / CITY EFFECT with place names, and all four sites unobstructed ([five guests](../artifacts/causal-panel-five-guests.png)). Admin reset returned the panel to the waiting message with no history. Without `?survey` no panel was created and the intro was visible. Console: only the pre-existing favicon 404.

## Root scene survey change sites — 2026-09-24

Step 2 on `feat/root-survey-atmosphere` (handoff [root-survey-atmosphere](handoffs/root-survey-atmosphere.md)). `npm test` (site clearance in `tests/mobility.test.ts`; layout parsing and `siteTargets` in `tests/surveyAtmosphere.test.ts`) and `npm run build` passed; `survey/` and `module-swap/` unchanged. Browser: Playwright CLI (headless Chromium) at 1280×720, root dev server `?survey=ws://127.0.0.1:8788/ws`, fresh scratch survey DB on port 8788, guests through the HTTP API: `automate-services`, `public-commons`, `build-upward`, `cooling-park`, `care-robots` (automation reaches +4 → tall hub). After moving the tower off the intro text and the park inside the frame, a reload rebuilt all four sites from the snapshot ([five guests](../artifacts/survey-sites-five-guests.png)); admin reset sank every site ([baseline](../artifacts/survey-sites-baseline.png)); one new guest raised only the hub, caught mid-rise at 1.5 s and complete at 11.5 s ([guest 1](../artifacts/survey-sites-guest1.png)); the panel showed choice, CITY label and scores. Without `?survey`, no panel was created and key `1` still selected Pulse. Console: only the pre-existing favicon 404. No FPS or draw-call measurement with the sites up.

## Root scene survey atmosphere — 2026-09-24

Branch `feat/root-survey-atmosphere`, handoff [root-survey-atmosphere](handoffs/root-survey-atmosphere.md). `npm test` (new `tests/surveyAtmosphere.test.ts`: mapping, parsing, revision order, `blendTo`) and `npm run build` passed; `survey/` and `module-swap/` unchanged. Browser: Playwright CLI (headless Chromium) at 1280×720, root dev server `?survey=ws://127.0.0.1:8788/ws`, scratch survey server/DB on port 8788, three guests submitted through the HTTP API: `automate-services`, `public-commons`, `shared-green`. The panel connected and showed each choice and the scores (自動化 +2 · 公共共有 +2 · 環境優先 +2 · 都市集約 0); console had only the pre-existing favicon 404. Screenshots [baseline](../artifacts/survey-atmosphere-baseline.png) and [after three guests](../artifacts/survey-atmosphere-three-guests.png), taken 11 s after each answer at the hero pose, differ only slightly (a few more actors and window/membrane tone). The wiring works; visual readability is **not** accepted. No FPS measured.

## CI covers survey/ and module-swap/ — 2026-09-24

[Workflow](../.github/workflows/ci.yml) now also runs `npm ci && npm test && npm run build` in `survey/` and `npm ci --prefix app && npm test && npm run build` in `module-swap/` (test includes `check:models`). The npm cache is keyed on all three lockfiles and the timeout is 15 minutes. Local Node 26 runs of both steps passed; [branch CI](https://github.com/cc100053/city2127/actions/runs/35998133060) passed on `398477e` with Node 24, every step green. Not covered: module-swap's `tests/browserSmoke.mjs` (needs Chrome and a dev server). Handoff: [docs-sync-post-mvp](handoffs/docs-sync-post-mvp.md).

## Causal choice → city MVP — 2026-09-24

Checked commit `391e6fce9f35acf8f4f78e007c59224d50ddda46` on `feat/causal-city-mvp` (Node v26.0.0, macOS). Scope and design: [PROJECT.md](PROJECT.md#causal-choice--city-mvp--2026-09-24-survey--module-swap), handoff [causal-city-mvp](handoffs/causal-city-mvp.md).

- `survey/`: `npm ci`; `npm test` — 10 suites passed (question/trigger validation, score clamping, derived layout thresholds and accumulation, answer service, sessions, 8-thread concurrency, persistence incl. schema 1 → 2 migration, HTTP reset, WebSocket view payloads, three-guest causal flow with branching, restart and reset); `npm run build` succeeded.
- `module-swap/`: `npm run install:app`; `npm test` — `check:models` plus 13 node tests passed (incl. survey view parsing, stale-revision guard, lot labels); `npm run build` succeeded with the existing >500 kB chunk warning.
- Root: `npm test` (7 suites) and `npm run build` passed; `git diff --check` clean. Root CI did not run `survey/` or `module-swap/` at that time (added to CI on 2026-09-24, see below).
- Browser: headless Chrome 154 (SwiftShader WebGL), 1600×1000, survey server on a scratch SQLite DB, viewer `http://127.0.0.1:5173/?survey`, driven over CDP. The three guests were submitted through the same HTTP API the guest page uses (`/guest` was not clicked). Baseline showed four empty lots; guest 1 `automate-services` → NW medium; guest 2 was assigned `automation-street-decline` → SW plaza, NW kept; guest 3 was assigned `commons-land-pressure` → SE tall, NW and SW kept. Page reload rebuilt the identical layout, panel and labels; admin reset returned to the baseline with an empty history. Every slot had exactly one lot and ≤1 building attachment with exact final transforms, each GLB was requested once, and the console had no errors or exceptions. The standalone `tests/browserSmoke.mjs` self-test (no `?survey`) also passed with no runtime errors.
- Visual finding fixed before the checked commit: at module-swap's default camera the SE tall tower hid the NW hub; survey mode now uses a higher fixed camera `(-38,105,88)`.
- Evidence: `artifacts/causal-mvp-0-baseline.png`, `-1-automation.png`, `-2-commons.png`, `-3-vertical.png`, `-4-reset.png`.
- Not checked: a real GPU browser, 1080p FPS, clicking the `/guest` debug page, phones on the LAN, concurrent guests in the browser.
- Review fixes, 2026-09-24: a malformed `/api/guest-sessions/%E0/question` now returns 404 instead of 500 (session ids are UUIDs, so the path segment is no longer URL-decoded; new assert in `survey/tests/reset.test.ts`), and a non-`ws://`/`wss://` `?survey=` value (e.g. `?survey=1`) uses the default server URL instead of throwing in `new WebSocket`. Root, `survey/` and `module-swap/` `npm test` + `npm run build` and `git diff --check` passed. The `?survey=1` fallback was not rechecked in a browser.

## Future tree integration — 2026-09-23

Blender 5.2.2 via MCP exported `asset/models/future-tree-2127/future-tree-2127.blend` and `.glb`. Empty-scene reimport found 25 meshes, 4 materials, 2,384 triangles and Blender XYZ bounds `[-2.748,2.755] × [-2.555,2.703] × [0.005,6.33]`; the GLB is 79,700 bytes. The initial export accidentally included Blender's default cube; it was removed and the reimport check repeated. The production Vite build emitted the GLB asset. `npm test`, `npm run build` and `git diff --check` passed; the existing bundle size warning remains. At 1280×720 in the in-app browser, the tree was visible near Hachiko plaza in Daylight, Pulse transition and Still transition; the browser error log was empty. Full motion cycles and 1080p FPS were not measured for this change.

## Exhibition acceptance direction — 2026-09-18, updated 2026-09-24

The current product goal is collective guest-driven change in a futuristic Shibuya. Documentary-photograph realism is no longer a completion gate. Status of each experience requirement:

- Each guest answers one question; the next guest receives the next question. **MVP-checked** (survey allocation tests and the three-guest browser run above; the next question depends on accumulated scores).
- Each choice acts on the accumulated city; a guest handoff keeps earlier contributions. **MVP-checked** (`causalFlow` test and browser run: NW, SW and SE all remain).
- At the end of their experience, the guest immediately sees a discernible visual consequence. **Partly checked**: the viewer animates the changed lot and labels it; the experience-end trigger and timing are not designed.
- Reload recovery and reset. **MVP-checked** for server restart, viewer reload and admin reset; exhibition-day reset policy and end-of-questions handling have no acceptance rule yet.
- The shared city remains recognizably futuristic Shibuya as it changes. **Not checked**: the MVP viewer is a generic four-lot module-swap scene, not the Shibuya scene.

The root-prototype tests and captures below verify the three-preset Shibuya scene only. Its invariant that buildings never change applies to preset regression checks, not to choice-driven geometry. Extending the MVP (more questions, scenes and objects, visual polish; 2026-09-24 direction) needs new checks for each added mapping and a browser check that each change is readable.

## Documentation alignment — 2026-09-18

Scope: README, AGENTS, PROJECT, PLAN02, VALIDATION and SHIBUYA only. Align the exhibition goal, one-question-per-guest sequence, cumulative city and undecided reset rules; preserve historical evidence. No executable changes, new screenshots or new runtime/performance claims. Verification covers local Markdown links, consistency of the new direction, and source checks of the unchanged preset behavior. No rendering or build rerun is needed for this stage.

Results: all 86 local Markdown link targets across the six documents exist; `git diff --check` passed. Reviewed the diff for consistent scope and separation of current goals, prototype behavior and historical evidence. Checked `presets.ts`, `worldState.ts` and startup in `main.ts`: three presets, 10-second transition / 4-second hold and one-time rig initialization remain the baseline. `npm test`, `npm run build` and browser checks were not run for this documentation-only change.

## Task handoff verification — collaboration Stage 1, 2026-09-18

Use a task-specific file under `docs/handoffs/` based on the [template](handoffs/TEMPLATE.md), not a shared central status file. Follow the [collaboration workflow](CONTRIBUTING.md). A new contributor compares the recorded branch, base and last verified commit with the actual checkout and diff, then reads affected source and architecture before resuming. If commits are missing locally, check the recorded remote availability; never infer completion from a handoff alone.

Record implementation status separately from verification: exact commands or manual checks, date, commit checked, results and unresolved limitations. Mark unexecuted checks as NOT RUN. For partial work, record whether commits were pushed and identify the remote branch. A check of an earlier commit is historical evidence, not proof of later changes. Record the integrated commit and checks before pushing main; if only the handoff changed after verification, explicitly record that documentation-only delta rather than inventing a self-referencing commit hash.

Documentation-only tasks require complete diff review, local Markdown link checks, `git diff --check`, scope/preservation checks and consistency with current Git state. Code tasks additionally require `npm test` and `npm run build`; visual/motion tasks require the relevant browser checks below. Stage 1 originally deferred CI to Stage 2. Stage 2 remote execution subsequently passed on `2b0e8cc`; require successful branch checks before merging and verify main checks after pushing.

## CI configuration — collaboration Stage 2, 2026-09-18

[Workflow](../.github/workflows/ci.yml): branch pushes and optional PRs run on `ubuntu-latest`, Node 24, with read-only repository permissions, a ten-minute timeout and npm cache. Steps install the existing lockfile with `npm ci`, run tests/build and check committed diff whitespace. Pushes compare the event's previous SHA with HEAD; PRs compare the base SHA with the checked-out merge result. A new branch's zero/missing previous SHA compares against its merge base with origin/main; only a repository without origin/main falls back to the empty tree. Stage 3 corrected the original whole-tree fallback after it flagged unrelated historical skill whitespace. Full checkout history supplies comparison commits; a missing nonzero base fails rather than silently skipping the check.

Actual local results (Node 26.0.0, npm 11.12.1, working tree based on `3d670b5`): `npm ci --offline`, `npm test` and `npm run build` passed. The existing >500 kB bundle warning remains. YAML parsed locally; the workflow's exact shell block passed six temporary-repository checks (clean/rejected whitespace for normal, empty and zero-SHA bases). Diff whitespace and local documentation links were checked. No application source, tests, assets, package manifest or lockfile changed; no browser check was needed.

At initial local handoff, remote GitHub Actions execution, Node 24 execution and actionlint validation were NOT RUN. Configuration is not proof of a green remote run. The user subsequently authorized reviewing, committing Stage 1 + 2 and pushing main. The combined diff was reviewed against synchronized origin/main; publication proceeds directly on main for this explicit request. Next: verify the pushed main commit on GitHub Actions. No branch protection, deployment or Blender pipeline was added. [Task handoff](handoffs/stage2-ci.md).

## Blender standards — collaboration Stage 3, 2026-09-18

[BLENDER.md](BLENDER.md) defines source/export reproducibility, coordinate/material contracts, optimization evidence and asset-consumer checks. Asset authors record these in the existing task handoff. Source/export validation and application validation are separate; use NOT INTEGRATED when no consumer exists. Current CI runs code tests/build and whitespace only; it does not open Blender, inspect GLBs or verify asset appearance.

This stage changes documentation only. At base `f196b2e`, no tracked Blender/glTF model or application model-loader reference was found. Local verification covers the complete diff, local Markdown links, consistency with `main.ts` → `cityRig`, and preservation of source/tests/assets/dependencies. Blender export/reimport, browser checks and performance measurements are NOT RUN because no asset or runtime behavior changed. [Stage 3 handoff](handoffs/stage3-blender-standards.md) records publication and verification status.

Stage 3 integration evidence: branch `efe20cd` passed [Node 24 CI](https://github.com/cc100053/city2127/actions/runs/35357826479). The first branch run exposed unrelated historical whitespace because Stage 2 compared new branches with an empty tree; the corrected workflow uses the main merge base, with eight local Git cases passing. Local `npm test` and `npm run build` passed on merge `ea69b1a` (Node 26, existing >500 kB bundle warning). This is code/CI evidence, not model validation.

## Blender import channel — 2026-09-23

On branch `codex/blender-shibuya-pipeline`, Codex registered the official Blender Lab MCP server from revision `ff54e4d8f6b09502f2f466189cca0e52b4a91643` and installed/enabled its add-on in Blender 5.2.2. A temporary background Blender process with `--online-mode` answered a read-only MCP scene-summary call; the server exposed 26 tools. After the user explicitly approved the persistent setting, a fresh Blender process without `--online-mode` reported Online Access saved and the add-on enabled; a second read-only scene-summary call succeeded through that process. This does not verify the interactive Blender GUI or any Windows workstation. Codex desktop may need a new task or restart to discover the newly registered server. Each collaborator must perform the [per-machine setup and live call check](BLENDER.md) locally; keep the add-on socket on localhost. The earlier automatic review rejection occurred before the user's explicit approval and did not change the setting.

The development-only `?asset-preview` route loaded a cube GLB exported by Blender 5.2.2 into the running Shibuya scene; the file input reported it loaded and the browser console showed no error. The cube and export script were temporary, not committed. `npm test`, `npm run build` and `git diff --check` passed after the loader change; the existing bundle-size warning remains. No production Shibuya model or placement has been chosen, so production asset integration and its visual/performance checks remain NOT RUN. (Superseded later on 2026-09-23: the future tree is the first production model; see its section above.)

## Automated checks for the current prototype

For executable changes, run from the project root:

```sh
npm test
npm run build
```

For `survey/` or `module-swap/` changes, run `npm test` and `npm run build` in that package too (`module-swap` test first runs `check:models`). CI runs all three packages.

Tests use `node:assert/strict` and Node's TypeScript stripping; keep new checks small and focused. `tsc` currently checks `src/`, while Node executes the test files. There is no separate lint/format command.

The state test covers the survey blend, the day clock wrap, the daylight curve, the mood keyframes (including midnight continuity) and the night lights. The mobility test samples three traffic cycles, one walking-cycle boundary and 501 positions per circulation route against layout-derived landmark envelopes, plus delivery transfer/lift continuity and closed-route guide wraparound. The Shibuya checks also sample all five painted walking paths, off-road waiting endpoints and landmark ground footprints against the road polygons. These checks do **not** prove visual correctness, exact mesh collision, every pedestrian pose or drone-to-drone avoidance. Inspect the actual scene after geometry/motion changes.

A Vite warning about the single bundle exceeding 500 kB has been observed; it is not a build failure. Do not hide it or add code splitting solely to silence it. Measure loading needs before changing packaging.

## Browser regression checks for the current prototype

1. Start or reuse `npm run dev -- --port 5173`. Open the actual localhost URL. Reload after relevant changes if HMR has not applied them. Confirm the canvas renders and console has no new errors.
2. Check all three states at the **same viewport and camera**. Confirm the tower, shops, kiosk, crossings and island retain their layout; transitions must not add/remove building meshes or produce a hybrid skyline.
3. Select Pulse. During the first 10 seconds, try another key: it must be ignored. At completion the verdict must appear immediately while controls stay locked for four more seconds. Aircraft, deliveries and window beats must keep moving. After the hold, select Still; then return to neutral and verify the verdict clears.
4. Observe at least 60 seconds of motion. Check car headings, edge fades, walking legs, waiting/queue positions and the cycle boundary. People should cross on the intended zebra paths rather than walk through the tower or props. Inspect aircraft bodies and the 4.4-unit wing span against roofs, gardens and corridor turns. Watch a complete 32-second delivery cycle: berth, horizontal cargo transfer, descent, receiver doors, departure and empty-lift return. Cargo must clear the facade before descending, and the courier must enter the real station opening.
5. Confirm Pulse is visibly busier than Still. All states must retain daylight, readable architectural surfaces and restrained bloom. Check both elevated walking routes, corner landings and terminal lift travel as well as the ground crossing.
6. Check the day cycle with `?hour=` at 12, dawn (~6.3), dusk (~17.8) and night (22), and let the live clock run past sunset if the overlay/camera/lighting changed. Responsive/mobile acceptance is explicitly out of scope (user decision, 2026-09-17). Check that resize updates both camera projection and composer size. OrbitControls were added in commit 5ad7dd0 (2026-09-17); do not change the initial hero pose to solve framing problems, and take comparison screenshots before touching the camera.

Use the available browser tool and its documented APIs. Browser handles, tab IDs, localhost processes and previous tool sessions can expire; rediscover an existing matching tab rather than assume a previous ID still works. Restore temporary viewport overrides after testing.

## Performance evidence

The canvas publishes:

| Attribute | Meaning |
| --- | --- |
| `data-time` | Last sampled elapsed animation time in seconds; use modulo 32 to identify the delivery phase |
| `data-fps` | Average over the latest **120 rendered frames**, not a fixed two-second interval |
| `data-draw-calls` | Last sampled frame's calls across the composer passes |
| `data-geometries` | Renderer-tracked GPU geometry count; not a scene mesh count |

For a performance claim, use a foreground 1920×1080 viewport, allow shader warm-up and at least 120 frames, and record state, browser/device, viewport, pixel ratio and sampled stats. This FPS includes frame scheduling and is not a GPU timer. Hidden tabs and display refresh rates affect it. Compare geometry counts after warm-up across repeated transitions; stable counts alone do not prove that no objects were regenerated.

Version 1 had a local observation near 60 FPS at a 1080p canvas. Version 2 had an observation near 120 FPS at the normal preview size; its later 1080p diagnostic read did not complete because the browser handle became stale. **Do not reuse either observation as a current, cross-device performance guarantee.** Remeasure when reporting performance after changes.

## Screenshots and completion

- Save meaningful changed-state screenshots in `artifacts/`; preserve the original version-1 evidence. Version-2 files use the `future-` prefix; version-3 files use `air-commons-`.
- Use the same dimensions and camera for comparisons. Animation time is not pinned: note that aircraft/people can occupy different positions.
- Open saved files to inspect them, not just the live tab. In a previous in-app session, a lower-level screenshot API cropped oversized viewports and its full-page capture stitched incorrectly. The unified `getScreenshot` capture at the default 1280×720 viewport worked. Recheck dimensions and edges with the current tools rather than assume that workaround is still needed.
- Leave a working preview when possible. Keep commands and behavior docs current. Final handoff should briefly name the change, checks actually completed, artifact/preview links, and any unresolved issue. Never report a proposed or timed-out check as passed.

For documentation-only work, verify statements against current source and resolve local Markdown links. Do not rerun rendering or builds merely because prose changed.

## Historical evidence (not exhibition acceptance)

The dated records below retain their original criteria and observations. References to documentary realism or unfinished art describe the former Plan 02 goals; they do not override the 2026-09-18 direction.

## Plan 01 local acceptance — 2026-09-17

- `npm test` and `npm run build` passed with Node 26. The existing >500 kB bundle warning remains.
- In-app browser desktop checks at 1280×720 covered Dusk, Pulse, Still, button and keyboard selection, ignored input during transition, visible verdicts, re-selection and clearing the verdict on returning to Dusk. Exact 10-second / four-second boundaries are verified by the state tests; a browser wait for the brief hold message timed out and is not counted as a timing assertion.
- Sampled motion over multiple street/delivery cycles showed the shared diagonal crossing, waiting groups, circulating aircraft and courier berth. Full delivery phase continuity and conservative building clearance are checked numerically; this is not a frame-by-frame collision recording. Browser error/warning log was empty at the final check. Warmed GPU geometry count remained 94 in the final layout samples. No 1080p performance claim was measured.
- Final `shibuya-neutral.png`, `shibuya-pulse.png` and `shibuya-still.png` use the same 1280×720 camera. The screen and ground remain simplified blockout geometry; recognition and final art direction still need user judgment.
- Responsive adaptation is excluded by the user. Newly attempted mobile adaptations were removed. The user chose local acceptance only; no ChatGPT review was submitted after the automatic approval rejection.

## Plan 02 first vertical slice — 2026-09-17

- Reference: [Pic 2](../asset/pic2.png). Architecture, materials, two authored public decks and lifts, upper occupied link, sky infrastructure and engineered filtration membranes replace the former civic-model direction. All three states now use daylight. Old screenshots and the pre-existing Plan 01 acceptance notes are preserved.
- `npm test` covers the existing state/street/delivery checks plus public-journey continuity, deck endpoints, cargo separation and air clearance of the new upper link. `npm run build` passes; the existing >500 kB warning remains.
- Visual acceptance is deliberately limited to this first spatial slice: the result has stronger vertical connections and fewer actors, but remains visibly procedural. Documentary realism, dense integrated city-scale massing and unmistakable Shibuya recognition remain art-direction gaps; these are not marked as passed.
- Public lifts use small authored platforms, without capacity dispatch or avoidance. Upper occupied links are architectural proxies without interior simulation. Rail/pylon collision is visually sampled rather than exhaustively checked. No 1080p FPS or cross-device performance claim is made.
- Final in-app browser checks at 1280×720 covered Daylight → Pulse → Still → Daylight, keyboard and button selection, ignored `2` during the Pulse transition, visible verdict during the hold with disabled controls, re-selection after hold, and clearing the verdict on neutral selection. Screenshots and diagnostics sampled motion from startup through more than 60 seconds; elevated walkers, terminal platforms, aircraft and delivery changed position. Delivery/collision continuity is principally verified numerically, not by exhaustive video inspection.
- The warmed geometry count was 56 in both Pulse and Still samples, with 115 composer draw calls. Error/warning logs were empty. These are local observations, not a 1080p performance benchmark or proof of exact mesh collision.
- Saved and reopened [Daylight](../artifacts/plan02-neutral.jpg), [Pulse](../artifacts/plan02-pulse.jpg) and [Still](../artifacts/plan02-still.jpg). All are 1280×720 with the same locked camera. The express corridor intentionally exits the upper frame; the screenshot is a complete viewport, not a stitched capture. Browser viewport override is reset after validation.

## Plan 02 stage 1 — vertical block massing, 2026-09-17

- Change: QFRONT crown and hung west wing, MAGNET mid-block collar and east wing on two ground columns, and an open commons floor at Y=24 between the cores. All new volumes are entries in `upperLinks`; landmark footprints, crossings, routes, dock and camera pose are unchanged.
- `npm test` and `npm run build` passed with Node 26; the >500 kB bundle warning remains. New checks: every upper volume bears on its named cores by ≥1.5 units and stays under their roof, columns are inside the volume and off the road polygons, and the courier column and public journeys clear every volume.
- Playwright (Chromium) at exactly 1280×720 captured `artifacts/plan02-block-neutral.png`, `-pulse.png`, `-still.png` with the initial camera; `artifacts/plan02-*.jpg` remain the pre-stage baseline at the same pose. Console had only the pre-existing favicon 404. Stats after warm-up in Daylight: 60.1 FPS, 115 draw calls, 56 GPU geometries at 1280×720. **This is not a 1080p measurement.**
- A separate Chrome extension session confirmed the page loads and renders without errors at 1920×825; that window could not be resized, so it was not used for comparison captures.
- Not verified: full mesh collision of the new wings against rails and pylons, interior readability of the commons floor (partly hidden behind the loop rail from the hero pose), and final art acceptance. The three captures are evidence of massing, not documentary-photograph acceptance.

## Plan 02 stage 2 — hero pose and ground edge, 2026-09-17

- Change: initial camera moved to `(34,34,76)` looking at `(-3,17,-1)` with FOV 46°; the orbit target now imports the same constant. Ground plate enlarged to 150×140 and the five road arms extended to ±70–75 so no plate edge is visible from the pose. Car travel range, crossings, waiting positions and landmark footprints are unchanged.
- `npm test` and `npm run build` passed; road-polygon tests (waiting positions, landmark footprints, column positions) still pass against the extended arms.
- Playwright (Chromium) at 1280×720 captured `artifacts/plan02-frame-neutral.png`, `-pulse.png`, `-still.png`. These are a **new pose** and are not a same-camera comparison with `plan02-block-*` or `plan02-*.jpg`. Console showed no errors after reload. Warm Daylight stats: 60.1 FPS, 115 draw calls, 56 geometries at 1280×720; not a 1080p measurement.
- Not verified: the pose at other aspect ratios (desktop-only remains the contract), and art acceptance of the framing.

## Plan 02 stage 3 — materials, facade depth and light, 2026-09-17

- Change: shared materials split into matte composite, refined metal and reflective glass; pavement gets its own matte material; one sun-shade fin per window floor per face on all buildings; shop slabs thickened; environment intensity .6, sun 3.0, hemisphere 1.05, exposure .9. No new textures, passes or assets.
- `npm test` and `npm run build` passed. Playwright (Chromium) at 1280×720 captured `artifacts/plan02-surface-neutral.png`, `-pulse.png`, `-still.png` at the stage 2 pose, so they compare directly with `plan02-frame-*`. No console errors. Warm Daylight stats: 60.1 FPS, 117 draw calls, 57 geometries at 1280×720; not a 1080p measurement.
- Not verified: art acceptance. Implementer's read: floors and glass now have depth, but the flat single-colour sky and the absence of a distant city still read as a model. That is outside this stage.

## Plan 02 stage 4 — sky gradient and distant skyline, 2026-09-17

- Change: camera-following gradient sky dome with per-state zenith colours; seeded ring of 60 hazed blocks at radius 125–165 with a per-state tint; camera far plane 240→320. No new assets or passes.
- `npm test` and `npm run build` passed. Playwright (Chromium) at 1280×720 captured `artifacts/plan02-sky-neutral.png`, `-pulse.png`, `-still.png` at the stage 2 pose. No console errors. Warm Daylight stats: 59.8 FPS, 120 draw calls, 59 geometries at 1280×720; not a 1080p measurement.
- Not verified: art acceptance of skyline density and height, and appearance when the user orbits toward the ring edge, where the plate edge and the ring gap can become visible.

## Plan 02 stage 5 — public lift and deck junctions, 2026-09-17

- Change: same-route walkers start 16 s apart so a lift carries one rider at a time; each direction walks on its own side (lane ±.5, mitred at corners, returning to the shaft centreline during the lift ride); platforms stay on the shaft centreline and turn with the deck; terminals are deck-aligned landing frames with a 1.6-unit opening, decks stop 1.5 units short of each terminal, and deck rails are mitred at interior corners (outer rail extended, inner rail shortened by the signed mitre length). Routes, endpoints, timing split (15/70/15) and the hero pose are unchanged.
- `npm test` and `npm run build` passed with Node 26; the >500 kB bundle warning remains. New checks: rider within .5 of the platform centre while riding, no two same-route walkers riding within 3 units of each other, and a >.9 horizontal gap between any two same-route walkers at every .1 s over 96 s.
- Playwright (Chromium) at 1280×720 captured `artifacts/plan02-lift-neutral.png`, `-pulse.png`, `-still.png` at the stage 2 pose, so they compare directly with `plan02-sky-*`. Console had only the pre-existing favicon 404. Warm Daylight stats: 60.0 FPS, 120 draw calls, 59 geometries at 1280×720; not a 1080p measurement.
- Orbited diagnostic frames (not saved as artifacts) showed walkers keeping to one side of the decks and decks meeting the terminal frames without gaps; a close frame of a platform mid-ride through the opening was not captured, so that is verified by geometry (1.35 platform in a 1.6 opening) rather than by screenshot.
- After the corner-rail mitre the three captures were retaken (same pose, same stats: 60.0 FPS, 120 draw calls, 59 geometries); an orbited diagnostic frame showed both route corners closed on the outer side. Not verified: art acceptance.

## CI publication verification — 2026-09-18

User-authorized Stage 1 + 2 publication: `2b0e8cc46a88f3c1f1382ce7d5efe3f2a285a4c3` pushed directly to `origin/main`. [GitHub Actions run](https://github.com/cc100053/city2127/actions/runs/35356530469) passed: checkout, Node 24 setup, `npm ci`, `npm test`, `npm run build` and committed-diff whitespace. This verifies the main-push path on the hosted runner; optional PR/new-branch events were not exercised remotely. Actionlint remains NOT RUN. Subsequent changes only update documentation with this evidence; their own CI result must be checked after push.

## Readable futuristic night lighting — 2026-09-30

Owner Codex; branch `codex/night-lighting`, base `b87a0b44488b8d71cb19e10dd4b0ad1fff104280`, checked implementation delta on that base. Root `npm test`, `npm run build` and `git diff --check` passed (Node 26; existing >500 kB warning). Added runnable night-fill floor, unchanged day settings and dusk-continuity assertions to `tests/worldState.test.ts`. Survey/module-swap code is unchanged.

Same untouched hero pose at 1280×720: [before 22:00](../artifacts/night-light-before-2200.png), [after 22:00](../artifacts/night-light-after-2200.png), [12:00](../artifacts/night-light-after-12.png), [02:00](../artifacts/night-light-after-2.png), [06:18](../artifacts/night-light-after-6_3.png), [17:48](../artifacts/night-light-after-17_8.png). Reopened captures show readable facade/ground detail, navy sky, distinct embedded mint/cold-white accents and no broad bloom wash. Additional geometry changes daytime appearance, but the daytime global light settings are unchanged.

V2 layout-only visual fixtures were sent through an intercepted `ws://127.0.0.1:8799/ws`, with no real server/database writes. The fixture snapshots have zero guests/scores and explicitly supplied low/mixed/high layouts: they exercise renderer alternatives, not server score derivation. [Low](../artifacts/night-light-survey-low-2200.png), [mixed](../artifacts/night-light-survey-mixed-2200.png), [high](../artifacts/night-light-survey-high-2200.png). Runtime diagnostics matched ports 1/3/5, shared seats 2/4/7, trees 5/8/10, planted fraction .3125/.5/.6875, fins 5/3/1 and modules 3/4/5; high AUTO HUB and all Park assets were ready. Saffron outlines remained distinct. Existing SE ground occlusion at the hero pose remains; the low twin heads and high tower read above DOGENZAKA.

Foreground headed Google Chrome, ANGLE Metal Apple M6, DPR 1, waited 4–8 seconds after navigation (at least 120 frames), sampled renderer dataset:

| Viewport | Mode/time | FPS observed | Draw calls | Geometries |
| --- | --- | --- | --- | --- |
| 1280×720 | standalone, 12/02/dawn/dusk | 59.9–60.0 | 356 | 90 |
| 1280×720 | v2 low/mixed/high, 22:00 | 59.9–60.1 | 658/638/694 | 167/162/176 |
| 1920×1080 | standalone, 22:00 | 60.1 | 356 | 90 |
| 1920×1080 | v2 high, 22:00 | 60.1 | 694 | 176 |

1080p canvas dimensions and `document.visibilityState=visible` were verified: [city](../artifacts/night-light-1080-city.png), [v2 high](../artifacts/night-light-1080-survey-high.png). These are local vsync-limited observations, not a performance guarantee on exhibition hardware. Ordinary resize and orbit were exercised; [orbit sample](../artifacts/night-light-orbit.png) is not a hero-pose comparison. Live clock reached 18:40 around 50 seconds, switched body to night colours and retained 90 geometries: [sunset](../artifacts/night-light-live-sunset.png). No uncaught page errors in the matrix; the accumulated session log retained one tree-load fetch interrupted during earlier reload/HMR, which did not recur as a final matrix runtime failure. Final asset readiness was checked independently in diagnostics.

Limits: eight local point lights intentionally have no shadows and can illuminate through walls. They provide entrance/ground fill; upper structures use global fill plus emissive strips. No extra render pass, dependency or asset was added. Exhibition PC, live guest submissions and full motion-cycle collision were not revalidated in this lighting task. Integration/CI evidence is recorded in the [handoff](handoffs/night-lighting.md).

Integration: feature `1e662282aebba23aa5ec1b8073ac7c265a1a55e7` passed [CI 36652867312](https://github.com/cc100053/city2127/actions/runs/36652867312). Main merge `3d6651329a8f546dccbd19053fccbecc1d31f490` has an identical tree, re-passed root test/build and committed diff whitespace locally, was pushed, and passed [main CI 36652968711](https://github.com/cc100053/city2127/actions/runs/36652968711) including all three packages. The subsequent closure update is documentation only.

## Admin day/night control — 2026-09-30

Owner Codex; branch `codex/admin-day-night`, base `f094dee39f79c9a6eb42655c85e3b8f6101ab2ca`. Root and survey `npm test` / `npm run build` passed; `git diff --check` passed. Existing root bundle warning remains. Added checks for fixed 12:00/22:00, Auto cycle, metadata validation and unchanged-revision filtering; server checks cover invalid bodies, cross-origin and LAN refusal, two-client broadcasts, restart and reset persistence. Module-swap is unchanged.

Headed Chrome used an isolated SQLite/server on 8791 and the existing root preview on 5173. Actual Admin buttons synchronized two connected root survey viewers; Night survived page reload, Day changed both to 12:00, Auto resumed the local cycle, and explicit `?hour=22` retained priority. Before/after `/api/city-view` was identical. No uncaught page errors (favicon 404 only). [Controls](../artifacts/admin-day-night-controls.png), [Night](../artifacts/admin-day-night-city-night.png), [Day](../artifacts/admin-day-night-city-day.png). These checks do not establish exhibition-hardware FPS or guest acceptance.

The existing 8787 server was awaiting guest exit and was preserved without restart or lifecycle mutation. Restart it with the original SQLite and refresh Admin after the active guest is handled. Schema 5 adds the independent display setting without resetting city/lifecycle state. Integration evidence follows in the [handoff](handoffs/admin-day-night.md).

Integration: feature `c5f5c5af27b42732a4c6ec1b8a60166bf1f2da65` passed [CI 36654085450](https://github.com/cc100053/city2127/actions/runs/36654085450). Main merge `8a1e07b596ea3bdfe604d090e013c5b8524e25f5` has an identical tree, re-passed root/survey test/build and committed-diff whitespace locally, and passed [main CI 36654194714](https://github.com/cc100053/city2127/actions/runs/36654194714), including module-swap. Closure update is documentation only.

## Admin Japanese UI — 2026-09-30

At base `957b5bc` plus the localization delta, root and survey tests/builds passed (survey loopback tests required an elevated retry after sandbox EPERM). Admin title, controls, accessible confirmation label, lifecycle/lighting/score labels, dialogs, success/history and network errors use Japanese. In-app browser checked Night feedback and full-reset enablement; its native dialog stalled automation, so headed Chrome completed the confirmation via native UI and verified a new run plus Japanese full-reset success/history. Isolated server 8793/temp SQLite only; existing 8787 data/process were preserved. No layout or motion change. [Screenshot](../artifacts/admin-japanese.jpg); [handoff](handoffs/admin-japanese.md). Full-reset UI phrase is `全データ初期化`; API token remains `FULL RESET`.

Integration: feature `d4fef13` passed [CI 36655653034](https://github.com/cc100053/city2127/actions/runs/36655653034); main `1fc8c1f` re-passed root/survey local checks and passed [CI 36655782933](https://github.com/cc100053/city2127/actions/runs/36655782933) for all three packages. Existing 8787 current-run supports displayMode; refresh Admin to load the new build. Closure update is documentation only.

## Odaiba venue P0 — 2026-09-30

Branch `codex/odaiba-venue`, base `4bc1646`. Odaiba assets imported path-wise from `codex/odaiba-preview` `3a8a5f2`; root `npm test` (now including `tests/odaiba.test.ts`) and `npm run build` passed, `git diff --check` clean. Reverted spike with environment + 8 buildings over the Shibuya root and full post chain: headed Chrome 154, ANGLE Metal Apple M6, 1920×1080, pixel ratio 1 → 60.0 FPS, 1,223 draw calls (12:00) / 1,311 (22:00); Shibuya alone 60.0 FPS, 356. The user confirmed the Apple M6 is the exhibition machine. See [ODAIBA_PLAN.md](ODAIBA_PLAN.md).

## Odaiba venue P1 — 2026-09-30

Branch `codex/odaiba-venue`. Root `npm test` and `npm run build` passed (existing chunk warning); `git diff --check` clean; `survey/` and `module-swap/` unchanged. Headed Chrome 154, ANGLE Metal Apple M6 (exhibition machine), 1920×1080, pixel ratio 1, 14 s warm-up then 3 s rAF sample: 60.0 FPS and 1,243 / 1,245 / 1,245 draw calls at `?hour=12` / `18.5` / `22`; no console errors. Captures: [12:00](../artifacts/odaiba-p1-1200.png), [18:30](../artifacts/odaiba-p1-1830.png), [22:00](../artifacts/odaiba-p1-2200.png). Not checked: `?survey` (sites still at Shibuya coordinates until P2), mobility (unwired until P3), art acceptance.

## Odaiba venue P2 — 2026-09-30

Branch `codex/odaiba-venue`. Root `npm test` and `npm run build` passed; `git diff --check` clean; `survey/` and `module-swap/` unchanged. `tests/odaiba.test.ts` passes the new lot-ground and hero-visibility checks for all four sites. Scratch survey server (port 8791, scratch SQLite) with root `?survey=ws://127.0.0.1:8791/ws` on the exhibition machine (headed Chrome 154, ANGLE Metal Apple M6, 1920×1080): baseline 59.6 FPS / 1,525 draws; all-high (31 guests) 59.1 / 1,581; all-low (17 guests) 59.5 / 1,545 at 12:00 and 59.2 / 1,547 at 22:00; no page errors. Captures: [baseline](../artifacts/odaiba-p2-baseline.png), [high](../artifacts/odaiba-p2-high.png), [low](../artifacts/odaiba-p2-low.png), [low 22:00](../artifacts/odaiba-p2-low-2200.png). Not checked: 1280×720, transition timing re-measure, art acceptance.

## Odaiba venue P3 — 2026-09-30

Branch `codex/odaiba-venue`. Root `npm test` (new Odaiba mobility suite plus raycast route checks in `tests/odaiba.test.ts`) and `npm run build` passed; `git diff --check` clean; `survey/` and `module-swap/` unchanged. Exhibition machine (headed Chrome 154, ANGLE Metal Apple M6, 1920×1080): 60.3 FPS / 1,307 draws at 12:00 and 60.2 / 1,309 at 22:00, no page errors. Captures: [12:00](../artifacts/odaiba-p3-1200.png), [22:00](../artifacts/odaiba-p3-2200.png), [zoomed](../artifacts/odaiba-p3-close.png). Not checked: `?survey` with actors (site/route separation is covered by tests), art acceptance.

## Odaiba venue P4 — 2026-09-30

Branch `codex/odaiba-venue`. Root `npm test` (new sky-bridge and floating-deck raycast checks) and `npm run build` passed; `git diff --check` clean. Exhibition machine (headed Chrome 154, ANGLE Metal Apple M6, 1920×1080): 60.0 FPS / 1,340 draws at 12:00, 60.1 / 1,342 at 22:00; no page errors. Captures: [12:00](../artifacts/odaiba-p4-1200.png), [22:00](../artifacts/odaiba-p4-2200.png), [zoomed 12:00](../artifacts/odaiba-p4-close-1200.png), [zoomed 22:00](../artifacts/odaiba-p4-close-2200.png). Not checked: `?survey` with the 2127 layer, art acceptance.

## Odaiba venue P5 — 2026-09-30

Branch `codex/odaiba-venue`. Waterfront question text (ids, option ids, effects and question-set version unchanged), guest masthead/welcome, root overlay, page title and remaining Shibuya strings in code. `survey/` `npm test` (15 suites) and `npm run build` passed; root `npm test` and `npm run build` passed; `git diff --check` clean. Headed Chrome on the exhibition machine with a scratch survey server (8791): `/guest` welcome reads 次のお台場を一緒に選ぶ / 2127 · ODAIBA, the first question shows the Odaiba service text and its three options, and the root overlay reads "ONE WATERFRONT. TWO FUTURES." / 35°37′ N 139°46′ E / "The same shore."; no console errors. Captures: [guest](../artifacts/odaiba-p5-guest.png), [question 1](../artifacts/odaiba-p5-question.png), [city](../artifacts/odaiba-p5-city.png). Not checked: a full four-question submission (P6), module-swap (unchanged; still rejects v2).

## Survey Meter tests and development auto-answer — 2026-09-30

Stage: `codex/survey-auto-tests`, based on `b97f859`; task [handoff](handoffs/survey-auto-tests.md). Root and survey full `npm test` / `npm run build` and `git diff --check` passed on the final code worktree (Node 24.21.0). Root retains its existing >500 kB bundle warning. No `module-swap/` code changes. CI installs survey dependencies before root tests because the new root pipeline starts the real survey HTTP/WebSocket server.

New checks: `survey/tests/meterContract.test.ts` covers all 81 actual question answer combinations against independent expectations (semantic IDs/votes, first-proposal Meter/recent/history state, SQLite, layout/event, retry). Generic descriptor-based helpers are covered for future axes and reject missing registry coverage or structurally valid reversed effects. Root `tests/surveyMeterPipeline.test.ts` covers all 81 through the client parser and real four-site Three.js runtime diagnostics after transitions, then HTTP/WebSocket, same-ID retry, snapshot and reset. Node model tests substitute canvas text drawing and external GLB loading; they check the real procedural fallback geometry/controllers, not actual GLB rendering. Auto-answer tests cover profiles/custom/seed/order independence, lifecycle/own-session guards, final exits, cancellation during submission/waits, network failure, another reserved guest, pending reset and disabled/non-loopback config routes.

Browser acceptance is separately recorded below. The optional reproducible script is `tests/surveyAuto.browser.mjs` (`npm run test:survey-browser` from root), using an existing Playwright installation selected by `CITY2127_PLAYWRIGHT_PATH` (absolute `index.mjs`), with optional `CITY2127_CHROME_PATH`, `CITY2127_SURVEY_URL` and `CITY2127_CITY_URL`. No browser library/dependency was added to the repo. Start a **fresh** scratch `npm run dev:auto` server and root Vite before running it; it refuses a nonzero city and never resets or deletes the database. Screenshots overwrite only this task's four `artifacts/survey-auto-*` evidence files.

Browser environment: installed headless Chrome, 1280×720, DPR 1, fixed noon, actual GLBs, Vite 5173 and scratch survey 8790. Initial pass on scratch 8788 completed six automatic proposals, cancellation/manual completion and city reload without page exceptions; that pass was superseded by the fuller 8790 run. No real-GPU FPS, exhibition hardware, Windows or endurance result is claimed.

Final browser script passed: normal Guest has no panel; two high, four low, two rotating mixed proposals (8 total) used the real Guest radio/form/review submission flow and ended with lifecycle `ready`. Each screenshot's visible diagnostics matched the HTTP CityView (ports/seats/modules/trees/fins/planted fraction and all bands). The four low proposals after two high correctly reached all-low bands, retaining history. Stop during Q1 left the draft unsubmitted and phase `in_experience`; manual completion recorded #9 and left `awaiting_exit`. After explicit staff exit, an intercepted response was aborted **after** server commit of #10; auto-answer stopped without exit, reload recovered the same submission ID/result, count stayed 10, and the batch remained idle. City reload restored matching models. Zero page exceptions; the injected network abort is expected. Screenshots were visually inspected for panel placement and low/high city differences:

- [Guest development panel](../artifacts/survey-auto-guest.png)
- [High-profile city after 2 proposals](../artifacts/survey-auto-high-city.png)
- [Low-profile city after 6 cumulative proposals](../artifacts/survey-auto-low-city.png)
- [Mixed-profile city after 8 cumulative proposals](../artifacts/survey-auto-mixed-city.png)

## Odaiba Dream Loop — 2026-09-30

`feat/art-direction`, base `102b6bb` plus three sequential passes. Root tests/build passed per pass; final whitespace check clean, existing bundle-size warning remains. Actual-mesh Odaiba checks now include surveyed canopy, mall roof planting and context facade panels. No source GLB/blend, route or survey contract changes. Survey/module-swap local suites not rerun (packages unchanged).

Headed Chrome screenshots: original hero, 16:00 / actor 20 s, 1920×929, device DPR 2 (renderer cap 1.5): [before](../artifacts/odaiba-dream-before.jpg), [generated target](../artifacts/odaiba-dream-target.png), [after](../artifacts/odaiba-dream-after.jpg). Browser also checked 12:00, 6.3, 17.8 and [22:00](../artifacts/odaiba-dream-night.jpg), with no localhost application or shader errors. Existing browser-wallet extension errors excluded. Scratch server 8794/temp SQLite rendered [all-high](../artifacts/odaiba-dream-high.jpg) and [all-low](../artifacts/odaiba-dream-low.jpg) at 1920×873; actual visible counts matched server layouts. Reset/reloaded snapshot restored mixed baseline; one live proposal converged to 5 ports, 10 trees, 7 shared seats and 5 modules. No guest-flow acceptance/timing rerun.

Rolling canvas observations at 1920×929/DPR cap 1.5: baseline 26.6 FPS/1,331 draws; final 23.7 FPS/1,359 draws/348 geometries. Not a controlled 1080p DPR-1 benchmark, GPU identity check or 60 FPS guarantee. Target not reached: broad lawns, contemporary secondary archetypes, thin shore, sea horizon edge and weak daylight overlay contrast remain. Three-pass Plus stopping point; human art review pending, no main integration. Full [handoff](handoffs/odaiba-dream-loop.md) records asset prompts and limits.

## Odaiba Dream Loop continuation 4–6 — 2026-09-30

Resume `45277d3` on `feat/art-direction`; root test/build/whitespace passed per final pass version. Added actual-mesh terrace/grove/core coverage to existing site, hero, train, walker, boat and bridge checks. Initial walker collision and LDR reflection darkening were fixed and rechecked before capture. No model binary, dependency, route or survey-contract change; root bundle warning remains. Survey/module-swap local suites not rerun (unchanged).

Headed Chrome: original hero, fixed 16:00 / actor20 s; [day](../artifacts/odaiba-dream-pass6.jpg) and [night](../artifacts/odaiba-dream-pass6-night.jpg) at 1920×929/DPR1, plus inspected 6.3 and 17.8. Scratch server 8794/temp continuation SQLite rendered [high](../artifacts/odaiba-dream-pass6-high.jpg)/[low](../artifacts/odaiba-dream-pass6-low.jpg) at 1920×873/DPR1. Twenty positive/negative proposals, actual diagnostics match all four site layouts and finished live transitions; reset/reload restores mixed baseline. No localhost/shader errors; existing wallet-extension errors excluded. No full guest/lifecycle or transition-timing rerun.

Standalone rolling observation: 32.8 FPS / 1388 draws / 356 geometries at 1920×929/DPR1. Not comparable to the prior DPR1.5 session, not controlled 1080p/exhibition hardware/60FPS acceptance. Target still not reached: isolated shore platforms, contemporary mall/hotel/context typologies, geometric trees, background and detail density remain. Six passes implemented, human art review pending; no main merge. See [continuation handoff](handoffs/odaiba-dream-loop.md#continuation-passes-46--2026-09-30-locally-verified-human-art-review-pending).

## Odaiba hero district P1 — 2026-09-30

`feat/odaiba-district` (stacked on `feat/art-direction` `55f9473`): root `npm test` PASS with new district assertions, `npm run build` PASS, `git diff --check` clean. Browser hero pose at 800×600: 1,310 → 1,195 draw calls and 1.89 M → 1.58 M triangles per frame; day/night without console errors. Details and unverified items: [district handoff](handoffs/odaiba-district.md).

## Odaiba hero district P2 — 2026-09-30

`feat/odaiba-district`: environment replaced by the headless-Blender-derived `odaiba_district_v01_environment.glb` (48,178 → 11,343 triangles, 2.6 → 0.6 MB) with a hashed-alpha apron dissolve. Root `npm test` and `npm run build` PASS, `git diff --check` clean. Browser hero pose (`hour=21`, 800×600): 1,185 draw calls / 1.47 M triangles per frame; day, night and top view without console errors or visible plate edges. Details: [district handoff](handoffs/odaiba-district.md).

## Odaiba hero district P3a — 2026-09-30

`feat/odaiba-district`: retained landmarks merged per material at load with the shared `bake()` (now attribute-safe). Root `npm test` and `npm run build` PASS, `git diff --check` clean. Browser hero pose (800×600): 1,185 → 509 draw calls, 1.47 M triangles unchanged; day/night visually unchanged, no console errors. Details: [district handoff](handoffs/odaiba-district.md).

## Odaiba hero district Dream Loop P3b — 2026-10-01

`feat/odaiba-district`: three Dream Loop Plus passes on the tier-1 district (Fuji core, Aqua City, DECKS, north waterfront). Root `npm test`, `npm run build` and `git diff --check` PASS after each pass. 1920×929 headless captures: [baseline](../artifacts/odaiba-district-baseline.jpg), [pass 3](../artifacts/odaiba-district-pass3.jpg), [night](../artifacts/odaiba-district-pass3-night.jpg). Built-in pane 800×600 at `?hour=16&reviewTime=20`: 529 draw calls / 1.84 M triangles, no console errors. Human art review pending. Details: [district handoff](handoffs/odaiba-district.md).

## Odaiba connected backdrop P4 — 2026-10-01

`feat/odaiba-district`: island edge replaced by a receding Odaiba backdrop plus `bayContext()` (Rainbow Bridge, Tokyo Gate Bridge, Ariake link, nine shore skylines; 4 draws, 16,144 triangles). Root `npm test`, `npm run build`, `git diff --check` PASS. Captures: [day](../artifacts/odaiba-district-bay-hero3.jpg), [night](../artifacts/odaiba-district-bay-night.jpg); orbit view shows the Rainbow Bridge; no console errors. Details: [district handoff](handoffs/odaiba-district.md).
