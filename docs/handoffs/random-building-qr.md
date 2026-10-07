# Random building QR

- Owner: User with Codex
- Status: IMPLEMENTED; QR checks PASS; broad integration browser check PARTIAL
- Branch: `feat/random-building-qr`
- Base commit: `4eda49ebae30e6215e6f67f17e8fef197832b34e`
- Last verified commit: `eb8de23df534fb1d319f25246471c0b0f21e67fd` (code snapshot; final metadata update is documentation-only)
- Remote availability: PUSHED to `origin/feat/random-building-qr`; not merged to main

## Session Git state

- Session starting branch and HEAD: resumed `feat/random-building-qr` at `f0df881bef504c5bb911abf3626187722eb91be6`, 2026-10-07
- Last fetched origin/main commit: `4ced0195c36b0c14fe488d5b223eebb04cbc13f7`, 2026-10-07
- Local changes present at session start: NONE; prior QR integration/framing/landmark corrections are local task commits
- Upstream integration status: at preflight task branch was 4 commits ahead / 23 behind origin/main, with no upstream task branch. This is a resumed local QR task; origin/main's independent civic/traffic updates were inspected, not automatically merged. Local exhibition build remains on the user's current checkout.
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Restore the questionnaire-to-building-QR flow on the current Odaiba city. Superseding user direction (2026-10-07): display one recognizable **2127 future building actually present in the saved island city**, not raw modern Odaiba landmarks or outer-district models. Preserve the building's settled shape/materials/height/pairings; show it upright and complete; deterministically choose within the saved city's visible slots and retain that choice on reload. The QR opens that proposal's archived city.

## In-scope files and dependencies

QR presentation package, root concentration district read-only extraction methods and snapshot helper, documentation and focused tests. Earlier commits already implemented the survey/archive routes. This stage does not change questionnaire scoring, city accumulation, station lifecycle, landmark GLBs, shared-screen rendering or server data.

## Completed work

Earlier task commits ported the integrated QR/archive flow: embedded result QR after the existing reading slot, read-only `/city/:proposalId`, single port 8787 and standard-QR WebGL fallback. Modern-landmark pools from those iterations are now superseded.

Current stage reads `/api/archives/:id` before constructing the QR. `futureBuildingPool` uses the same `ConcentrationDistrict.setTarget(layout, ..., true, slotSeeds.urbanConcentration)` as the city. It extracts a single visible twisted/terraced/twin tower or one of the two pavilion designs, cloning its actual instance matrices, materials, glass shader, crowns/dock/solar canopy; no duplicate building factory or GLB simplification. The source pool is released and cloned resources are owned by the QR. Upright camera framing fits all projected building corners with 18% margin. Sky reflections, sun/shadows, GTAO and Neutral tone mapping retain readable blue glass; whole-city bloom is intentionally omitted after actual screenshots showed a washed-out pale diorama. Eight seconds of presentation then collapse into a separately rendered high-contrast scan plate; both modes remain selectable. Standard QR is also used if the archive cannot supply a building. Local integrated output has been rebuilt for the existing 8787 server.

## Actual validation results

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

Choice is deterministic from proposal ID **within the authoritative saved city's visible pool**. Low concentration uses pavilions, mixed includes the actual visible hybrids, high uses towers; seeds, height and pairing extras come from the archive, never current live state. Source GLB/legacy QR assets remain untouched but are no longer imported by the QR presentation.

## Next expected step

The local user can refresh `/guest` with Ctrl+F5 to use the rebuilt QR; existing 8787 service was read-only checked and serves the new QR bundle. Source is saved/pushed on the task branch. Recheck the broader city integration on a suitable browser host (or consistently extend its remaining default selector timeouts), then physical phone/venue acceptance. Deliberate integration with concurrent origin/main work is still separate; do not overwrite or auto-merge it on resume. Temporary 5198/8789 test services are stopped after validation; the user's 8787 server is left running.
