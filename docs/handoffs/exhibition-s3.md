# exhibition-s3 — remaining root site mappings

> Stage history — 2026-10-02: retain the original implementation/validation scope below. Current Odaiba behavior is in [EXHIBITION_SPEC](../EXHIBITION_SPEC.md); Shibuya will not be developed again. Historical resume/next-step instructions do not create a new assignment.

- Owner: Codex (Astra review; Luna Max implementation and testing)
- Status: SHIPPED — integrated into `main` as `63af1b6b4c3f2c9ba39faaf18dae68f276b5f972` on 2026-09-30; feature and main CI passed
- Branch: `codex/exhibition-s3`
- Base commit: `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`
- Last verified commit: `63af1b6b4c3f2c9ba39faaf18dae68f276b5f972` (main integration of branch head `17e305b39749f1b305a16c9d1d45b982275e96cd`)
- Remote availability: core commit pushed to `origin/codex/exhibition-s3` at `d51167bb1352c97e0b2135b3fb42852bd438699b`; post-CI visibility commit `36b5c18b4adde9dba8e762e130f3fe19dd213243` and this docs update pushed on 2026-09-30
- GitHub Issue: none

## Session Git state

- Task preflight branch and HEAD: `codex/exhibition-s4`, `20a3cbc1fc211aeaff4fd2ed1cb4ff276b7cc51e` (2026-09-29); tracked tree was clean and `.codegraph/` was untracked
- Last fetched origin/main commit: `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`, refreshed with `git fetch --prune origin` on 2026-09-29
- Local changes present at task preflight: the tracked tree on `codex/exhibition-s4` was clean; the pre-existing untracked `.codegraph/` was preserved. After fetch, the integrator switched to clean/up-to-date `main` at `eaf230e` and created `codex/exhibition-s3` from it.
- Documentation-lane preflight: branch `codex/exhibition-s3`, HEAD `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`; shared uncommitted S3 source/test changes were already present and preserved.
- 2026-09-30 follow-up preflight: branch `codex/exhibition-s3`, HEAD `d51167bb1352c97e0b2135b3fb42852bd438699b`; `git fetch --prune origin` succeeded, local/remote S3 divergence is 0/0, and `origin/main` remains `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`. Post-CI SW/SE builder/test changes and prior docs updates were present and preserved; the code delta is uncommitted and unpushed.
- Upstream integration status: S3 started from refreshed `origin/main` with no divergence; `origin/main` remains at the S2 base. Remote `codex/exhibition-s4` contains partial work at `960d9b7` but is not integrated. Core S3 `d51167b` is pushed; post-CI visibility changes remain local, uncommitted and unpushed.
- Current untracked artifacts: `.codegraph/` and the 12 current S3 screenshots under `artifacts/` are preserved; `.playwright-cli/` was cleaned after the final browser run. Browser captures are documented in [VALIDATION](../VALIDATION.md).
- Pending Git conflicts or synchronization blockers: NONE known; final S3 diff is not pushed or integrated

## Goal and acceptance criteria

Complete S3 from [original MVP plan](../history/EXHIBITION_MVP.md): render the authoritative v2 automation, public-sharing and urban-concentration mappings in the root Shibuya scene while retaining the S2 Q3 Park mapping.

- Verify all 12 low/mixed/high configurations across the four sites, including the nine new configurations at the three S3 sites.
- Verify within-band count changes, mature futuristic low variants, and site/route clearance.
- Verify the root causal panel summarizes the validated proposal's actual `cityChanges`, including non-Park sites.
- Preserve server-authoritative values, the three-second live transition, immediate pulse-free snapshot/reset, and legacy v1/standalone behavior.
- Complete focused and root checks, relevant desktop browser checks, documentation/link review and feature CI before calling S3 shipped.

## In-scope files and dependencies

The core implementation is in `src/changeCatalog.ts`, `src/cityChangeManager.ts`, `src/siteBuilders/` and root tests. The visibility commit `36b5c18` edits `src/siteBuilders/commonsPlaza.ts`, `src/siteBuilders/concentrationTower.ts`, `tests/commonsPlaza.test.ts` and `tests/concentrationTower.test.ts`; the central integrator owns the v2 causal-panel copy/summary in `src/surveyAtmosphere.ts`. Reuse S1's v2 contract and S2's root parser, Park runtime and site transition model; no survey server, module-swap, asset, dependency or deployment change is in this task.

## Completed work

The pushed core commit routes server-provided NW/SW/SE bands and counts to the automation hub, commons plaza and concentration tower; NE remains the existing S2 Park. The root causal panel summarizes current proposal `cityChanges` by site and label and states explicitly when a proposal makes no city change. The post-CI visibility pass adds 2.4 m dark electrochromic SW screens that fold flat as seats become shared, plus grounded SE low pavilions with twin glazed service heads above DOGENZAKA. The service heads are visible in the fixed hero view, while the ground pavilions remain occluded behind the foreground; the SW state distinction is subtle but discernible. V2 scores remain separate from global atmosphere, and S2's three-second live transition and immediate snapshot/reset behavior are retained.

## Actual validation results

- Verification status: PASSED for the S3 scope — local root checks, API matrix, snapshot/reset, standalone smoke, V01/V02 visual review, merge-result checks, feature CI and main CI
- Date and checked commit/worktree: 2026-09-30; core commit `d51167bb1352c97e0b2135b3fb42852bd438699b` pushed to `origin/codex/exhibition-s3`; SW/SE visibility commit `36b5c18` re-passed root `npm test`, `npm run build` and `git diff --check` on 2026-09-30; integrated as `63af1b6`
- Commands/manual checks and results: the core commit `d51167b` passed root `npm test`, `npm run build`, `git diff --check` and [feature CI run 36577963207](https://github.com/cc100053/city2127/actions/runs/36577963207); that CI covers only the core commit. The combined post-visibility worktree passed root `npm test`, `npm run build` and `git diff --check` on 2026-09-30 JST; the build emitted only the existing >500 kB chunk warning. The isolated API matrix passed all 12 one-axis site/band combinations, same-band count updates, high→mixed→low, and composite all-low/mixed/all-high values (full numbers in [VALIDATION](../VALIDATION.md)). Snapshot/reconnect/reset checks passed: revision-1 all-high snapshot restored identically after forced reconnect with no update event; admin reset emitted one mixed revision-0 `run-reset`, rendered within 100 ms, with no visible pulse. Standalone `?hour=12` smoke at 1280×720 passed with zero new console/page errors and no survey request/socket. V01/V02 visual review accepted the current 12 captures at 1280×720 and 1920×1080. Root v1 was not browser-tested in the final pass; existing root unit tests are the only evidence here.
- Evidence/environment: 12 screenshots captured 2026-09-30 JST from isolated survey server `127.0.0.1:8790` and Vite `127.0.0.1:5181`; current files and exact links are in [VALIDATION](../VALIDATION.md). The fixed-hero limitation is that SE ground pavilions remain occluded although the two service heads read above DOGENZAKA; SW privacy/shared states remain subtle but visible. No FPS, physical hardware or cross-platform results.
- Integrated commit and checks: feature CI passed on `d51167b` ([36577963207](https://github.com/cc100053/city2127/actions/runs/36577963207)), `f36e392` incl. visibility commit `36b5c18` ([36598935005](https://github.com/cc100053/city2127/actions/runs/36598935005)) and main-merged head `17e305b` ([36599413799](https://github.com/cc100053/city2127/actions/runs/36599413799)). `63af1b6` (`--no-ff`, tree identical to `17e305b`) re-passed root `npm test`/`npm run build`, `survey/` `npm test`/`npm run build` and `git diff --check origin/main..HEAD`, was pushed to `origin/main`, and passed [main CI 36599599701](https://github.com/cc100053/city2127/actions/runs/36599599701).
- Changes since verification: only this documentation status update (no code).

## Known issues and blockers

No S3 blockers. The fixed hero view still occludes SE ground pavilions; SW's distinction is subtle. No FPS, exhibition-hardware or cross-platform results are claimed.

## Important decisions

All states remain in 2127. S3 maps server-supplied values and does not derive site policy from client scores or blend v2 scores into global atmosphere. Keep the Park as the Q3 site and preserve legacy v1 behavior. The S2 CI record is historical evidence and does not verify this S3 delta.

## Next expected step

Superseded by the 2026-09-30 “Next step” section at the end of this file.

## 2026-09-30 resume (Claude)

- Preflight: branch `codex/exhibition-s3`, HEAD `36b5c18` (1 ahead of origin S3, docs uncommitted); `git fetch --prune origin` succeeded. `origin/main` advanced to `4212b80` (lifecycle `963c090` and S4 guest UI `4212b80` integrated), so S3 is 2 ahead / 6 behind main.
- Root `npm test`, `npm run build`, `git diff --check` and `git diff --check origin/main...HEAD` passed on `36b5c18` plus docs.
- Merged `origin/main` `4212b80` into `codex/exhibition-s3` (after docs commit `f36e392`). Code conflicts: `src/surveyAtmosphere.ts` and `tests/surveyAtmosphere.test.ts`. Resolution: kept S4's `exhibitionFeedback` panel (per-site before→after, capped at two changes per S4's spec) and dropped S3's `exhibitionCityChangesText`, which it supersedes; kept S3's pending copy (all four sites render) instead of main's "準備中" text; added a non-Park (SW/SE) place assertion. Doc conflicts were status narratives, resolved as combined S3+S4+lifecycle status.
- Merge-result checks (2026-09-30): root `npm test`, `npm run build`, `git diff --check`; `survey/` `npm test` (including lifecycle/guestFlow) and `npm run build` all passed. `module-swap/` unchanged.
- Merge-result browser check: isolated survey server `127.0.0.1:8791` (temp DB) + Vite `127.0.0.1:5183`, 1280×720. One proposal (autonomous / open-commons / hybrid-cooling / vertical-functions) moved NW/SW/SE mixed→high. The root panel showed four answers, four Meter rows, `MAGNET東 · 自律サービス端口 3 → 5` and `道玄坂南 · 共有座位 共有席 4 → 7` (SE omitted by the two-change cap), the `最近64人` band and `累計 1 人`; the scene showed the high site states; zero console errors. No screenshot was archived; root v1 not browser-tested.
- Known gap carried from S4: the two-change cap means a three- or four-site proposal names only the first two sites in the panel; the scene still renders all of them.

- Integration: `codex/exhibition-s3` → `main` `--no-ff` as `63af1b6`; pushed and main CI passed (IDs above).

## Next step (2026-09-30)

S3 is complete. Next is S4 acceptance on the integrated main: browser-check the four-question guest flow, recovery and root panel with real S3 site changes (see [S4 handoff](exhibition-s4.md)); the lifecycle `lifecycle_blocked` wait screen and the 10-second result/handoff timing remain S4 gaps.
