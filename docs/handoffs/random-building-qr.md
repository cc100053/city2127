# Random building QR

- Owner: User with Codex
- Status: IMPLEMENTED; QR checks PASS; broad integration browser check PARTIAL
- Branch: `feat/random-building-qr`
- Base commit: `4eda49ebae30e6215e6f67f17e8fef197832b34e`
- Last verified commit: `f5106c8c575f75d040948d537a275f7b370e0fde` (tower-only code snapshot; final metadata update is documentation-only)
- Remote availability: PUSHED to `origin/feat/random-building-qr`; not merged to main

## Session Git state

- Session starting branch and HEAD: tower-only refinement resumed `feat/random-building-qr` at `3b5b468586ad89e4e3e5033c8bde91a4b11237db`, 2026-10-07
- Last fetched origin/main commit: `4ced0195c36b0c14fe488d5b223eebb04cbc13f7`, 2026-10-07
- Local changes present at session start: NONE; prior QR integration/framing/landmark corrections are local task commits
- Upstream integration status: at current preflight task branch was 6 commits ahead / 23 behind origin/main and matched `origin/feat/random-building-qr`. This is a resumed QR task; origin/main's independent civic/traffic updates are not automatically merged. Local exhibition build remains on the user's current checkout.
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Restore the questionnaire-to-building-QR flow on the current Odaiba city. Superseding user direction (2026-10-07): display one recognizable **2127 future building actually present in the saved island city**, not raw modern Odaiba landmarks or outer-district models. Preserve the building's settled shape/materials/height/pairings; show it upright and complete; deterministically choose within the saved city's visible slots and retain that choice on reload. The QR opens that proposal's archived city.

Latest refinement: only recognizable mid/high-rise buildings and towers qualify. Exclude small garden pavilions entirely, even when present in the saved city. If that snapshot has no eligible tower, display a standard QR; do not fabricate a high-density building.

## In-scope files and dependencies

QR presentation package, root concentration district read-only extraction methods and snapshot helper, documentation and focused tests. Earlier commits already implemented the survey/archive routes. This stage does not change questionnaire scoring, city accumulation, station lifecycle, landmark GLBs, shared-screen rendering or server data.

## Completed work

Earlier task commits ported the integrated QR/archive flow: embedded result QR after the existing reading slot, read-only `/city/:proposalId`, single port 8787 and standard-QR WebGL fallback. Modern-landmark pools from those iterations are now superseded.

Current stage reads `/api/archives/:id` before constructing the QR. `futureBuildingPool` uses the same `ConcentrationDistrict.setTarget(layout, ..., true, slotSeeds.urbanConcentration)` as the city, but now limits both selection and extraction to the actual visible tower slots. It extracts a single twisted/terraced/twin tower, cloning its actual instance matrices, materials, glass shader and crowns/dock; no duplicate building factory or GLB simplification. The source pool is released and cloned resources are owned by the QR. Upright camera framing fits all projected building corners with 18% margin. Sky reflections, sun/shadows, GTAO and Neutral tone mapping retain readable blue glass; whole-city bloom is intentionally omitted after actual screenshots showed a washed-out pale diorama. Eight seconds of presentation then collapse into a separately rendered high-contrast scan plate; both modes remain selectable. Standard QR is used if the archive cannot supply an eligible tower. Local integrated output has been rebuilt for the existing 8787 server.

## Actual validation results

### Tower-only refinement — current stage, 2026-10-07

- Starting source: `3b5b468`; code and tests changed only for QR eligibility, not city geometry, scoring or saved data.
- Root full `npm test` and `npm run build` PASS. Low cities produce an empty pool; visible pavilions cannot be extracted; mixed/high retain the exact existing mid/high-rise slots, heights, shaders and transforms.
- QR `npm test` 13/13 and `npm run build` PASS; integrated `node scripts/exhibition.mjs build` PASS. Existing bundle-size warnings remain.
- Focused `verify-building-qr.mjs` Chrome 750×620 PASS: three tower families, complete framing, readable blue glass, stable reload, repeat exact canvas decoding, empty-tower standard QR fallback and WebGL fallback. All three tower screenshots and the no-tower QR screenshot were visually inspected.
- Broad `verify-integration.mjs` fixture now selects a high-density proposal and changes the subsequent proposal in the opposite direction; the full script was NOT RERUN. Prior broad integration status remains PARTIAL below, not inferred from focused tests.
- Production database is untouched; no live proposals, resets or scoring changes. Existing 8787 service is left running.
- Read-only HTTP check: `/qr/` serves loader `index-BZwTQtlU.js`, which imports new `main-3NPAc0ld.js`; that bundle contains the tower-only guard. The initial check mistakenly looked for the main chunk directly in HTML; tracing the dynamic loader confirmed the new bundle is served without restarting the server.
- Affected local Markdown links and working diff whitespace PASS. Temporary 5198 QR preview was stopped after its process/command were verified; 8787 was not stopped.
- Scoped source commit: `f5106c8`; committed task diff whitespace against origin/main PASS. Saved/pushed on `origin/feat/random-building-qr`; main is unchanged and branch CI is not claimed as verified.

### Previous future-building stage — historical evidence

- Verification status: QR-specific checks PASS; broad integration PARTIAL (headless city timeouts, not a QR decode failure)
- Date and checked commit/worktree: 2026-10-07, task worktree based on `f0df881`
- Root: full `npm test` PASS, including the new low/mixed/high + two-seed single-building checks; `npm run build` PASS. Initial sandbox run timed out at the existing WebSocket test; targeted rerun and full authorized rerun both passed.
- QR: `npm test` 13/13 PASS; `npm run build` PASS. Final `verify-building-qr.mjs` Chrome PASS for all three tower/two pavilion silhouettes, complete projected bounds, non-overexposed blue glass, snapshot-only candidates, stable reload, repeated actual-canvas decoding, integrated 750×620 view and WebGL fallback. Evidence in ignored `qr-hud/test-results/building-qr-*-family-*.png` and scan/city captures, generated this session; no FPS claim.
- Integrated build: `node scripts/exhibition.mjs build` PASS (root + survey + QR); no dependency/lockfile changes. Existing bundle-size warnings remain.
- Integration browser: isolated scratch SQLite on localhost:8789; correct future-building source/revision and actual QR `/city/:id` decode PASS; shared-display canvas/screenshot PASS with extended wait. One run also passed archived phone layout, zoom, touch rotation, zero live WebSockets, later-proposal isolation and reload, then timed out navigating to `/city/unknown`. The last rerun timed out at a default 30 s phone-canvas attribute query despite its longer initialization wait. The harness now waits for `canvas[data-archive-id]` before checking the loading label (which can otherwise be absent before initialization) and releases the already-checked display scene. Full end-to-end script is **not green** on this host; do not infer physical phone/performance acceptance. No production proposals/resets were submitted.
- Documentation: affected local Markdown links PASS; diff whitespace PASS before final commit.
- Scoped source commit: `eb8de23`; targeted root QR test and standalone QR build passed again after committing. Committed diff whitespace against origin/main PASS. Branch pushed successfully; remote main was not changed and branch CI is not claimed as verified.
- Integrated commit and checks: NOT INTEGRATED

## Known issues and blockers

Physical phone scanning and exhibition Wi-Fi require manual validation. Large shared-city startup is slow in this Windows headless environment; extended `INTEGRATION_CITY_TIMEOUT_MS` affects only the test harness, not the app, and does not establish performance acceptance. Remote civic/traffic commits are not integrated in this resumed checkout. QR builds now require the complete repository (root source factory/local sky), not a copied `qr-hud`-only directory; its preserved standalone Docker context was not updated or tested (deployment is out of scope). Earlier audit note: `qr-hud` reported one high-severity advisory in the preserved standalone backend dependency tree; no new audit/fix was performed here and the integrated survey server does not start that backend.

## Important decisions

Choice is deterministic from proposal ID **within the authoritative saved city's visible mid/high-rise tower pool**. Low concentration with no eligible tower uses standard QR, never a pavilion; mixed includes actual visible mid-rise/full tower hybrids, high uses towers. Seeds, height and pairing extras come from the archive, never current live state. Source GLB/legacy QR assets remain untouched but are no longer imported by the QR presentation.

## Next expected step

The local user can refresh `/guest` with Ctrl+F5 to use the rebuilt QR; existing 8787 service was read-only checked and serves the new QR bundle. Source is saved/pushed on the task branch. Recheck the broader city integration on a suitable browser host (or consistently extend its remaining default selector timeouts), then physical phone/venue acceptance. Deliberate integration with concurrent origin/main work is still separate; do not overwrite or auto-merge it on resume. Temporary 5198/8789 test services are stopped after validation; the user's 8787 server is left running.
