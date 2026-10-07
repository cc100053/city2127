# Random building QR

- Owner: User with Codex
- Status: IMPLEMENTED; QR checks PASS; broad integration browser check PARTIAL
- Branch: `feat/random-building-qr`
- Base commit: `4eda49ebae30e6215e6f67f17e8fef197832b34e`
- Last verified commit: `35258f9d3caf4160807accd198fb3e9de48b40b1` (linked QR sculpture code snapshot; final metadata update is documentation-only)
- Remote availability: latest linked sculpture `35258f9` is LOCAL ONLY; earlier `414cc63` is available on `origin/feat/random-building-qr`. This session's push was blocked by permission review pending explicit authorization/verified destination ownership; not merged to main.

## Session Git state

- Session starting branch and HEAD: linked QR sculpture resumed `feat/random-building-qr` at `414cc63b81d6a92d24557f0db2c3739cd4856dea`, 2026-10-07
- Last fetched origin/main commit: `4ced0195c36b0c14fe488d5b223eebb04cbc13f7`, 2026-10-07
- Local changes present at session start: NONE; prior QR integration/framing/landmark corrections are local task commits
- Upstream integration status: at current preflight task branch was 10 commits ahead / 23 behind origin/main and matched `origin/feat/random-building-qr`. This is a resumed QR task; origin/main's independent civic/traffic updates are not automatically merged. Local exhibition build remains on the user's current checkout.
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Restore the questionnaire-to-building-QR flow on the current Odaiba city. Superseding user direction (2026-10-07): display one recognizable **2127 future building actually present in the saved island city**, not raw modern Odaiba landmarks or outer-district models. Latest approval accepts a QR-Bloom-like voxel/hollow sculpture that approximates the original tower/landmark as closely as possible. Retain major silhouette/palette/pairings from the actual source, but do not promise lossless surfaces/sub-module details. The original city model is unchanged. Side and top views must show the same upright geometry, not flatten/hide the building and swap a separate QR. Deterministically choose within the saved city's visible slots and retain that choice on reload; QR opens that proposal's archived city.

Latest refinement: prioritize recognizable mid/high-rise buildings and towers, still excluding small garden pavilions entirely. User now requests an original city landmark or transport when no tower qualifies. The implementation uses the always-present central Civic Core as the landmark fallback; it does not add a new transport preview or fabricate a high-density building. A plain QR is reserved for archive/WebGL failure.

## In-scope files and dependencies

QR presentation package, root concentration district read-only extraction methods and snapshot helper, documentation and focused tests. Earlier commits already implemented the survey/archive routes. This stage does not change questionnaire scoring, city accumulation, station lifecycle, landmark GLBs, shared-screen rendering or server data.

## Completed work

Earlier task commits ported the integrated QR/archive flow: embedded result QR after the existing reading slot, read-only `/city/:proposalId`, single port 8787 and standard-QR WebGL fallback. Modern-landmark pools from those iterations are now superseded.

Current stage reads `/api/archives/:id` before constructing the QR. `futureBuildingPool` is unchanged: actual visible twisted/terraced/twin towers from `ConcentrationDistrict`, or the existing central `civicCore({ preview: true })` when no tower qualifies. Owned source geometry/materials and actual snapshot transforms/pairings feed new `qrSculpture.js`. Vertical triangle crossings (half-open shared edges) sample closed source solids and suspended voids onto dark QR columns; white columns stay empty. One instanced cube sculpture plus permanent QR base is used in both views. Source palette/metalness and broadened roughness (.35 minimum) retain readable finishes. This is an approximate, explicitly documented sculpture, not lossless remeshing; no changes to city geometry or selection/scoring. QR-Bloom's projection concept is implemented independently, without its AI weights or restricted tree generator. Complete sculpture/base bounds fit with 18% margin. Tower yaw follows the actual instance rotation so the twin shafts do not overlap; Civic Core retains its bay-facing angle. Sky/sun/GTAO remain; bloom is omitted. Eight seconds of presentation then camera-only tilt over 1.4 s plus ink-colour blending, with no scale/visibility/geometry swap. Settled scan directly renders the same object; white base receives no shadows. Reduced motion settles immediately. Source/cube resources are owned and disposed; no per-frame geometry/material creation. Standard QR remains for archive/WebGL failure, and the final integrated output is rebuilt for the existing 8787 service.

## Actual validation results

### Linked tower / landmark QR sculpture — current stage, 2026-10-07

- Starting source: `414cc63`; source selection remains three recognizable tower families with original Civic Core fallback, no pavilions or fabricated towers. No server, scoring, station lifecycle, archived-city or live database changes.
- Root full `npm test` / `npm run build` PASS. QR `npm test` 18/18 and standalone build PASS; final integrated `node scripts/exhibition.mjs build` PASS. Existing bundle-size warnings remain, no dependency/lockfile changes.
- Five new native checks cover original instance/source transforms and colour, QR dark-column-only occupancy, suspended voids, overlapping baked members, unchanged upright matrices across scan blending, disposal and explicit empty-source fallback.
- Final Chrome 750×620 `verify-building-qr.mjs` PASS for all three tower families, low-city Civic Core, complete framing, blue glass, stable reload, repeated exact canvas URL decoding, same geometry ID/height/visibility in side and scan, reduced motion and WebGL fallback. Screenshots in ignored `qr-hud/test-results/building-qr-*.png` were visually inspected; final twin shafts are distinct. No FPS or hardware acceptance claim.
- Intermediate browser check failed the glass contrast threshold after restoring smooth-glass finishes; cube roughness now has a .35 floor. Final screenshot checks wait for local sky texture and the existing .4 s CSS opacity fade to finish before evaluating colour. Rerun PASS; do not attribute the earlier contrast failure solely to roughness. Half-open triangle coverage additionally prevents counting shared quad diagonals twice without removing real overlapping-solid crossings; overlapping-member native test and final browser rerun PASS.
- Read-only HTTP: existing 8787 returns 200 for `/qr/`, serving `index-Dom_62bx.js` → `main-DuOz6kjT.js` containing `linked-building-qr`. No server restart or live proposals/resets.
- Broad integration NOT RERUN; previous PARTIAL status and physical phone/Wi-Fi acceptance remain open. Feature branch only; no automatic merge with origin/main or verified branch CI claim.
- Scoped source commit: `35258f9`; affected Markdown links, working/staged/committed whitespace and complete task diff review PASS. Temporary 5198 Vite preview was stopped after confirming its exact process command; the user's existing 8787 was left running. Source and this metadata are saved on the task branch, not merged to main.
- Remote push NOT PERFORMED: permission review rejected the combined metadata-commit/push command because destination ownership and explicit user authorization to upload source were not established. Local metadata commit is completed separately as unaffected work; do not retry/bypass the upload without resolving that permission. Local 8787 output is already updated, so this does not block local use.

### Original landmark fallback — previous stage, 2026-10-07

- Starting source: `bdc5c92`; high-rise selection remains prioritized, and small garden pavilions remain excluded. No new transport preview is added because the original landmark satisfies the requested fallback.
- Root full `npm test` and `npm run build` PASS. The focused test compares the fallback's exact baked vertex positions/material colours with `civicCore()` and checks independent geometry/material ownership and no live mirror registry additions. Default city factory behaviour is preserved.
- QR `npm test` 13/13 and `npm run build` PASS; final integrated `node scripts/exhibition.mjs build` PASS. Existing bundle-size warnings remain.
- Final `verify-building-qr.mjs` Chrome 750×620 PASS: three tower families and low-city Civic Core fallback, whole-building bounds, readable glass, stable reload, repeated exact canvas decoding and WebGL fallback. The final landmark screenshot was visually inspected from the bay-facing side, showing the original central sphere and frame together.
- Read-only HTTP: existing 8787 serves loader `index-CCWhxj0Y.js`, imports new `main-ZNQU8Z8e.js`, and the bundle contains the Civic Core fallback. No server restart or production database writes.
- Broad integration was NOT RERUN; its previous PARTIAL status and physical phone/Wi-Fi acceptance remain open. No live proposals or resets submitted.
- Scoped source commit: `6328771`; affected Markdown links, staged/committed whitespace and complete scoped diff review PASS. Pushed on `origin/feat/random-building-qr`, not merged into main; branch CI not claimed verified. Temporary 5198 preview was stopped after verifying its process command; existing 8787 was left running.

### Tower-only refinement — previous stage, 2026-10-07

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

Choice is deterministic from proposal ID **within the authoritative saved city's visible mid/high-rise tower pool**. Low concentration with no eligible tower uses the original central Civic Core, never a pavilion; mixed includes actual visible mid-rise/full tower hybrids, high uses towers. Seeds, height and pairing extras come from the archive, never current live state. The fixed Civic Core exists at every concentration level. Source GLB/legacy QR assets remain untouched but are no longer imported by the QR presentation.

## Next expected step

The local user can refresh `/guest` with Ctrl+F5 to use the rebuilt linked QR; existing 8787 was read-only checked and serves the final bundle. Latest source is saved locally on the task branch; obtain explicit authorization/verified ownership before uploading it to origin (current permission-review block). Recheck broad city integration on a suitable browser host, then physical phone/venue acceptance. Deliberate origin/main integration is separate; do not overwrite or auto-merge it on resume. Temporary 5198/8789 test services are stopped; the user's 8787 is left running.
