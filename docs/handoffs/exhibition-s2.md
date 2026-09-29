# exhibition-s2 — Q3 climate vertical slice

- Owner: Codex (Astra review; Luna Max implementation and testing)
- Status: IN_PROGRESS — implementation and local verification complete; pending integration
- Branch: `codex/exhibition-s2`
- Base commit: `08cf113d9e9e15c9655187e369a9eb6401008bb9`
- Last verified commit: NONE — checks below cover base `08cf113d9e9e15c9655187e369a9eb6401008bb9` plus the current uncommitted S2 worktree
- Remote availability: NOT PUSHED
- GitHub Issue: none

## Session Git state

- Session starting branch and HEAD: `codex/exhibition-s2`, `08cf113d9e9e15c9655187e369a9eb6401008bb9`
- Last fetched origin/main commit: `08cf113d9e9e15c9655187e369a9eb6401008bb9`, refreshed 2026-09-29
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE. On 2026-09-29, `codex/exhibition-s2` HEAD still matched fetched `origin/main` with no divergence; S2 source changes are uncommitted. The original checkout remains on `main` at `f8fa07ab58610c19e5764be6bec325cf9ddd53f9`, three commits behind fetched `origin/main`; its untracked `.codegraph/` was preserved.

## Goal and acceptance criteria

Implement S2 from [EXHIBITION_MVP.md](../EXHIBITION_MVP.md): carry the existing four-question proposal flow through the root CityView v2 parser and make Q3 climate choices visibly control the mature 2127 Park site. Other three sites stay built at their mixed baseline and are identified as pending mappings. Verify low/mixed/high climate states, truthful before/after changes, snapshot/reset without a guest pulse, same-band changes and retargeting, stale/duplicate revisions, strict malformed-v2 rejection, and GLB fallback/late-load/retry against the latest authoritative tree count. Preserve explicit v1 and standalone behavior. Check desktop 1280×720 and 1920×1080 at hour 12, including site visibility and reduced motion. Do not claim S3/S4 completion, exhibition hardware performance, or FPS without a real-GPU measurement.

## In-scope files and dependencies

Root viewer: `src/surveyView.ts`, `src/changeCatalog.ts`, `src/cityChangeManager.ts`, the Park builder and focused tests. Survey changes are limited to the authoritative Q3 layout mapping if required. Reuse the existing survey API, site runtime, GLB cache/fallback and Three.js materials. No new dependency, guest UI, deployment, external assets, or unrelated site mapping.

## Completed work

The S2 implementation now carries the real four-question v2 proposal through the root survey parser. Q3 climate scores drive the NE Park's mature low, mixed and high alternatives; the other three sites remain built at their mixed baseline without new mappings. The existing diagnostics expose the current Park tree target and rendered population. V2 horizontal scaling keeps both the actual 12-tree GLB and the procedural fallback within the NE site's ±5 m footprint while preserving the v1 tree transforms and vertical height. The validator did not edit runtime source.

## Actual validation results

- Verification status: PASSED LOCALLY; NOT INTEGRATED.
- Date and checked source: 2026-09-29, base `08cf113d9e9e15c9655187e369a9eb6401008bb9` plus current uncommitted S2 worktree. The remote refresh on this date found `origin/main` at the same base, with no divergence. No feature commit exists yet.
- Root checks: `npm test` passed all six scripts, including v1/v2 parsing, snapshot/reset pulse clearing, same-target and mid-transition retargeting, 3–12 Park tree counts, the real 12-tree GLB and fallback footprint bounds, preserved legacy transforms, retry, and late attachment. `npm run build` passed; Vite emitted only the existing >500 kB chunk-size advisory. `git diff --check` and the changed-document link check passed after these edits.
- Real API and parser: the read-only `node --experimental-strip-types /private/tmp/exhibition-s2-parser-live-check.mjs` accepted scratch run `a2fcdb1d-aab5-45ca-9f0c-aabec5fbd4e4` at revision 1 (Q3 score -7.5, NE low/treeCount 5), rejected five malformed v2 variants before renderer application, and ignored duplicate/stale revisions; one renderer application occurred. The real API helper `/private/tmp/exhibition-s2-api.mjs` submitted all four answers and verified idempotent replay without revision advance. Separate runs produced low `013f490c-172a-4419-aa06-07dc758098ec` (Q3 -7.5; 5 trees, planted 0.3125, five fins), mixed `5e76af0a-7cfa-4a71-94d1-a1d9e6aa59fd` (Q3 0; 8 trees, planted 0.5, three fins), and high `418437a9-979f-4be8-af59-a07cd24735b6` (Q3 +7.5; 10 trees, planted 0.6875, one fin). A same-run sequence also verified low same-band adjustment (5→6 trees while remaining low) and retarget to mixed (8 trees); Q1/Q2/Q4 remained neutral and the other sites stayed mixed.
- Browser and geometry: root Vite preview on 5173 and survey scratch server/SQLite on 8787; headless Chrome, hour 12, DPR 1. Final post-containment low/mixed/high full-frame and Park-crop captures are in [`artifacts/`](../../artifacts/): [low full](../../artifacts/future-s2-q3-low-verified-1280x720.png), [low Park](../../artifacts/future-s2-q3-low-park-verified-1280x720.png), [mixed full](../../artifacts/future-s2-q3-mixed-verified-1280x720.png), [mixed Park](../../artifacts/future-s2-q3-mixed-park-verified-1280x720.png), [high full](../../artifacts/future-s2-q3-high-verified-1280x720.png), [high Park](../../artifacts/future-s2-q3-high-park-verified-1280x720.png). Each final browser diagnostic's visible tree count and planted fraction matched that run's authoritative API layout; the city framing remained stable and every state remained mature 2127. The rendered high state was 10/10 trees with planted fraction 0.6875 and GLB ready. Final actual GLB 12-tree bounds are X −4.760…+4.936 m and Z −4.926…+4.883 m; fallback bounds are X −4.682…+4.954 m and Z −4.292…+4.408 m, both within the ±5 m site. The screenshots have no result labels; a test-only CSS rule hid the guest panel for scene comparison.
- Asset recovery and reload: with the scratch API held at run `418437a9-979f-4be8-af59-a07cd24735b6`, request 1 was allowed, request 2 intentionally aborted, and the automatic retry (request 3) was allowed. Diagnostics explicitly showed `fallback` with procedural representation, high band and 10/10 trees at planted fraction 0.6875, then `ready`/`glb` with the same latest count and fraction. A subsequent normal 1280×720 reload restored the API state and GLB population; its fresh response/console check had no page errors, failed requests or HTTP errors. Reduced-motion emulation was also exercised; `matchMedia('(prefers-reduced-motion: reduce)')` reported true, and the authoritative low snapshot restored on reload without changing the rendered count. The earlier delayed-GLB browser probe also retained the latest API tree count; the final root test suite rechecked late attachment against the current contained GLB.
- Panel and limitations: three-item history fit without page overflow at 1280×720 and 1920×1080; the Park and SW commons stayed visible. Panel-only captures are [1280](../../artifacts/future-s2-panel-3history-1280x720.png) and [1920](../../artifacts/future-s2-panel-3history-1920x1080.png); they were taken before the horizontal tree-fit correction and are evidence only for the unchanged panel layout. The first deliberate GLB abort produced expected network console errors; a separate clean reload had no such errors. No GPU FPS, physical exhibition hardware, 100-guest endurance, S3/S4 mappings, or full guest interaction flow was tested. API mutations used only the scratch database; display data was untouched.
- Integrated commit and checks: NOT INTEGRATED.

## Known issues and blockers

No active S2 implementation or local verification blocker remains. The Q1/Q2/Q4 visual mappings and exhibition-day operation remain later-stage work; the low/mixed/high claim is limited to NE climate in S2. Real-GPU performance and physical exhibition hardware remain unmeasured.

## Important decisions

S2 is one visible Q3 vertical slice, not completion of all four site mappings. The server's v2 CityView remains authoritative. All tested states remain in 2127; low does not mean missing technology or an undeveloped site. Browser/API mutations must use a scratch SQLite database and leave display data untouched.

## Next expected step

Parent review and integration remain. Stage the final six post-containment low/mixed/high captures, the two panel-only captures, this handoff, `docs/VALIDATION.md`, S2 source/tests, and the client-owned updates to `README.md`, `AGENTS.md`, `docs/PROJECT.md`, `docs/PLAN02.md`, and `docs/EXHIBITION_MVP.md`. Leave superseded pre-containment captures and `.playwright-cli/` cache unstaged. Run the documented branch CI/integration workflow and record the resulting feature and integrated commits here; preserve the tested viewport/scratch scope and do not claim GPU performance.
