# Fuji TV polish — Dream Loop

- Owner: Codex
- Status: IN_PROGRESS
- Branch: codex/fuji-tv-polish
- Base commit: 4eda49ebae30e6215e6f67f17e8fef197832b34e
- Last verified commit: the round-5 implementation commit recorded below (source SHA-256 `f53fb31c…a969e1`); round 4 `ecdf66f`
- Remote availability: origin/codex/fuji-tv-polish; resolve this Git ref for latest implementation/evidence publication. Prior code 0076bad0 is integrated on main; v3 is a separate implementation.

## Session Git state

2026-10-07: clean detached HEAD at the base; fetch succeeded; HEAD, local main and origin/main match (0/0). New branch starts from origin/main. No task remote counterpart yet; no conflicts.

## Goal and scope

Polish the procedural Fuji TV civic core using [CITY MASTER TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md), R01/R02 and Dream Loop Plus (three worker passes). Preserve hero camera, district, four sites, routes and the original Blender/GLB assets owned by cc100053. Primary ownership: src/civicCore.ts; shared helpers only when necessary. Existing asset study remains separate; no binary edits overlap it. Previous Dream Loop work is integrated through 53790a2 and later main; use actual current source rather than its old next-step notes.

## Completed work

Target v3's three implementation passes and source/browser checks complete; visual review remains pending on the feature branch. Prior runtime polish is integrated on main. Historical stage evidence is preserved below.

## Actual validation results

V3 root source/build/whitespace and specified browser checks PASS at implementation `f504484`; target fidelity remains PARTIAL. Prior implementation is integrated through `f64af18`; v3 is not integrated.

## Known issues and blockers

No failing source checks. Target fidelity remains partial; performance/hardware and live survey browser limits are listed below.

## Next expected step

User reviews the v3 round-5 final screenshot ([v3r5-pass3](../../artifacts/fuji-tv-polish/v3r5-pass3.jpg)). Further passes or integration follow that review; keep this result on `codex/fuji-tv-polish` in the meantime.

## Target and pass 1 (2026-10-07)

Built-in imagegen edited the current civic review screenshot using R01/R02 as architectural references. Target prompt: preserve camera, UI, district, building footprint, sphere berth and height; polish only the Fuji chassis into an inhabited ivory megaframe with clear silver-blue chamber floors, visible load paths, planted diagonal civic streets, transparent vertical transfer infrastructure and restrained public edge light. [Target](../../artifacts/fuji-tv-polish/target.png); ignored working copy `.dream-loop/target.png`. Baseline/pass capture: 1280×720, in-app browser, hour16, review=civic, reviewTime40.

Pass 1 adds chamber gardens/clear skin/fine ribs, diagonal edge details, pier joints/transfer rails, front terraces and a lower forum loop. Initial root test FAILED: lower loop intercepted AQUA ↔ FUJI TV bridge after54m. Orchestrator opened the ring approach across angles1.7–2.2 and moved its planting onto supported floor. First sandbox retry reached loopback-server EPERM; rerun outside sandbox PASS. Final pass1 root npm test, npm run build and git diff --check PASS; build retains existing >500kB warning. Browser shows no console warning/error after fix. [Baseline](../../artifacts/fuji-tv-polish/baseline.jpg), [pass1](../../artifacts/fuji-tv-polish/pass1.jpg). Checks apply to base plus current uncommitted src/civicCore.ts; no checked implementation commit yet.

## Pass 2

Finer branched crown geometry, glass transfer capsules/rail details, blue-silver chamber mullions, ring inset, seats and terrace posts. Root npm test/build/diffcheck PASS. In-app browser civic day16/night22: no console warning/error; canvas1280×720, viewport1280×720. [Pass2](../../artifacts/fuji-tv-polish/pass2.jpg). Night screenshot retained in ignored working folder for final worker. UI panel resizing changed a preliminary capture to319×809; replaced pass1/pass2 captures using the explicit original1280×720 comparison viewport. No camera or responsive code change.

## Pass 3 and final verification

Pass 3 adds interior glazed civic rooms/light faces, thinner ivory chamber ribs, inset diagonal mobility glazing, capsule light panels, intermediate ring edge light and supported roof shade/energy fins. Code remains entirely in src/civicCore.ts; helpers/materials/batching are reused. Final core: 8 static material batches, 473,092 triangles, world bounds min(-77.49,-4.64,-46.99), max(73.49,142.46,79) metres. These are geometry counts, not performance measurements.

2026-10-07, base4eda49e plus final uncommitted core delta: npm test PASS, npm run build PASS (existing >500kB warning), git diff --check PASS. Odaiba checks cover actual new core geometry, berth/wing envelope, bridge approach, lots/sightlines, route clearances and actual people/robots; pipeline checks all81 answers with real HTTP/WebSocket. Existing runnable checks exercise the changed factory; no additional framework or duplicate geometry suite added. Survey and module-swap source unchanged; their separate suites not rerun.

In-app browser on development Mac,1280×720, reviewTime40: final civic day16/night22; standalone authored hero16; all-low(-12) day12, all-mixed(0) dusk18.5, all-high(+12) night22. Screenshots visually reviewed; checked console logs contain no warnings/errors. A browser-control call timed out between captures; rebound the tab and repeated the final night capture. No source change was needed. Evidence: [pass3](../../artifacts/fuji-tv-polish/pass3.jpg), [night](../../artifacts/fuji-tv-polish/pass3-night.jpg), [hero](../../artifacts/fuji-tv-polish/hero.jpg), [low](../../artifacts/fuji-tv-polish/hero-low-day.jpg), [mixed](../../artifacts/fuji-tv-polish/hero-mixed-dusk.jpg), [high](../../artifacts/fuji-tv-polish/hero-high-night.jpg), [browser JSON](../../artifacts/fuji-tv-polish/browser.json). Final documentation links and full diff reviewed before commit.

## Remaining limits and next step

Three-pass implementation/local validation complete; visual target PARTIAL. The generated target still has richer human activity, finer vegetation, fuller structural detail and layered interior light. Transfer capsules and internal rooms are static architectural details, not new simulated transport/services. FPS, exhibition GPU/hardware, long-run performance and live scratch-survey browser NOT RUN. No binary source changes or deployment. Main remains unchanged.

Dream Loop Plus instructs: “Initially, only perform this loop 3 times” and “stop after 3, ask the user to review the results.” Result therefore stays on codex/fuji-tv-polish for cc100053 visual review; another three-pass group or integration follows that review. This task does not finish the separate asset study or previous district target. Working target/screenshots remain ignored under .dream-loop; committed target was generated with the built-in imagegen tool, not the CLI.

## Feature-branch publication

Implementation commit: `0076bad0def237c4bb455fa4934a6afbfd6ece9a`. Final fetch succeeded; origin/main remains4eda49e and is the task base (no divergence). Source byte comparison confirms committed code equals the pass3 checked worktree. Follow-up edits only record verification/publication; no code delta since checks. Published feature branch remains separate from main; main CI is not an integration claim. Feature-push CI is not part of the recorded local PASS results.

## Working-headquarters target v2 (2026-10-07)

User requested grilling and target regeneration, saying Fuji TV must retain working space. Six consecutive A answers confirmed: media-production headquarters (news editing, studios, program production, post-production and office); approximately 70% work / 30% public emphasis; two occupied work wings with a central void; sphere as media theatre/live-broadcast space with scheduled public admission; substantial opaque acoustic studio/editing volumes mixed with glazed office/collaboration floors; independent public circulation to ground entrance, selected platforms and theatre, with separate staff entrances and controlled production zones. The percentage is a design emphasis, not measured floor area. These decisions supersede target v1's primarily public chamber program.

Resumed clean at `012b5afe9d95e3b602436c5d47916e7f60450fd1`; fetch succeeded, feature counterpart 0/0, branch 2 commits ahead of origin/main, no divergence. Built-in imagegen edited pass3.jpg using R01/R02 architectural references, followed by one refinement for opaque studio volumes and central openness. Selected [target v2](../../artifacts/fuji-tv-polish/target-v2.png), [full prompts](../../artifacts/fuji-tv-polish/target-v2-prompt.md); ignored `.dream-loop/target.png` now matches v2. Original committed target.png remains available.

Visual review confirms two inhabited wings, substantial solid studio blocks, glazed office floors and the sphere's stage/audience. Independent access is an approved implementation requirement; an exterior generated image does not validate access control or circulation. Generated detail and diagonal connections are guidance; existing route clearances, berth, footprint and supported geometry still require source/browser checks during implementation. No TypeScript or runtime asset changed in this target-only stage. Local Markdown link/fact checks, target-file identity and git diff --check PASS; source tests/build/browser not rerun for this reference/documentation stage. Last verified runtime code remains 0076bad0.

## User-selected target v3 (2026-10-07)

Owner: Codex. Scope: save the user's supplied Fuji TV target and update the active reference; no runtime implementation in this stage. User explicitly requested “use this as Fuji TV 目標圖”. [Target v3](../../artifacts/fuji-tv-polish/target-v3.png) is copied byte-for-byte from the attachment; no new generation or image editing was applied to the selected target. Original v1/v2 files and prompts remain preserved. Ignored `.dream-loop/target.png` now matches v3. The image's glazed occupied work/production wings, central broadcast theatre, open void and diagonal connections supersede v2's exterior reference. Existing headquarters program and independent public/staff circulation requirements remain; generated UI lettering is not a localization instruction.

Preflight: workspace `/Users/fatboy/city2127`, initially clean on `feat/pedestrian-traffic-life` at `a540480e98b6fcb1b3cc1cd641292b160d4f2cc0`; fetch succeeded. Resumed the explicitly named `codex/fuji-tv-polish` at `ad8bc75`; local/remote feature refs match (0/0). `origin/main` is `f3b7d73`, three integration/documentation commits ahead of this branch with no branch-only commits. Prior runtime polish is already integrated through `f64af18`; this corrects the earlier “not integrated” stage status above. No automatic main merge. `src/civicCore.ts` matches the last verified implementation `0076bad0`; no unfinished implementation missing remotely.

Fresh baseline capture: development Mac, in-app browser, viewport1280×720, local feature preview `http://127.0.0.1:5174/?hour=16&review=civic&reviewTime=40`; no captured console warnings/errors. Baseline saved in ignored `.dream-loop/fuji-tv-v3-baseline.jpg`; it is a reference capture, not new runtime validation. A separate image-generation request was started before the attachment arrived, then terminated after the user selected their own image; it is not the target.

Validation PASS: supplied attachment, tracked v3 and ignored active target are byte-identical, SHA-256 `5cd1ea14cf90bc5b39c1320b2cc340a81f8de181ac883aa6bb8f40b0de939737`; PNG1672×941. Local Markdown targets in all three changed documents exist; complete diff self-reviewed; `git diff --check` PASS. Source remains unchanged from resumed `ad8bc75` (last verified runtime `0076bad0`). Runtime tests/build, FPS, hardware and circulation validation are not rerun for target selection. Next step: implement v3 in a new Dream Loop implementation round when requested; do not claim target fidelity from the existing model. Publish this reference-only stage to `origin/codex/fuji-tv-polish`; keep the pending implementation separate from main.

## Target v3 implementation loop (2026-10-07)

Owner: Codex. User requested “do the loop”; Dream Loop Plus authorizes three sequential implementation worker passes, with orchestrator validation and screenshots between them. Target remains the exact supplied v3 image. Startup: clean `codex/fuji-tv-polish` at `782bac75973cfe5ce683fe9fa76940c7588051cf`; fetch succeeded, feature counterpart0/0. Versus `origin/main` (`f3b7d73`), one target-selection commit on the feature and three prior integration/documentation commits on main. No automatic main merge; no missing remote implementation. Reuse this checkout's preview on127.0.0.1:5174 and the same1280×720 civic/hour16/actor40 comparison. Implementation and validation results follow as completed.

### V3 pass 1

Worker implemented two occupied production wings with editing mezzanines, rear sealed studio rooms, workstation/technical fixtures and selective glazing. Sphere's former garden floors become stage, tiered seats and technical grid; forum gains glazed foyer and separate rear staff entrances. Source change stays in `src/civicCore.ts`, sharing the existing eight finishes. Initial build and test FAILED on an obsolete garden fragment left after the theatre replacement (undefined old floor variables/extra closing brace); orchestrator removed that stale fragment. Added a small actual-mesh floor-support/headroom check for both wings in existing `tests/odaiba.test.ts`.

Corrected pass1 worktree: root `npm test`, `npm run build`, `git diff --check` PASS; build retains existing >500kB warning. Development Mac in-app browser1280×720, civic review actor40, day16/night22: no console warnings/errors. [Pass1](../../artifacts/fuji-tv-polish/v3-pass1.jpg); night comparison is ignored `.dream-loop/fuji-v3-pass1-night.jpg`. Workspace/interior light and activity remain visually below target; pass2 receives actual day/night screenshots. No committed implementation yet.

### V3 pass 2

First worker attempt stopped at a usage limit without a code change; after the usage tool reported available allowance, a fresh worker completed pass2. Lower-opacity glazing, ceramic mezzanine fascias, warm interior baffles, corner planting, seated editing staff/theatre audience and a brighter stage backdrop improve occupied depth. A single building light finish follows existing `cityLight.emissiveIntensity` through its shader uniform; total remains eight material batches. Upper-floor desks atz23 were outside the mezzanine and are now limited to supportedz4/12 rows. Static people are architectural occupancy, not new district actor simulation.

Pass2 root `npm test`, `npm run build`, `git diff --check` PASS, including actual work-floor/route/site clearances and all81 real survey-pipeline combinations; existing build-size warning remains. Development Mac in-app browser1280×720, civic actor40, day16/night22: no console warnings/errors or shader errors. Existing preview had stopped; orchestrator restarted it on the same127.0.0.1:5174. App panel clipped preliminary viewport screenshots despite a1280px canvas; replaced these with full-page captures verified at1280×720. [Pass2](../../artifacts/fuji-tv-polish/v3-pass2.jpg); ignored night/source snapshots retained for pass3. No committed implementation yet; target fidelity remains partial.

### V3 pass 3 and final verification

Added a shared cool broadcast finish for workstation/studio/theatre screens, finer backdrop seams, presenter desk/two presenters/two cameras, ceramic studio flank reveals and seven bench/two-person forum groups. Static batching rises8→9 for the distinct screen finish; the existing draw-limit assertion now allows that one shared finish. Existing test also checks actual floor support beneath all14 forum visitors. Source changes stay in `src/civicCore.ts`; no new dependencies, binary production assets, actor simulation or renderer/camera changes.

Final worktree against base782bac7: root `npm test`, `npm run build`, `git diff --check` PASS. Build retains the existing >500kB warning. Actual geometry:9 material batches,1,711,564 triangles; min(-77.49,-4.64,-46.99), max(73.49,142.46,79)m, unchanged from the prior frame. Triangle count is higher than the earlier473,092 and is not a performance measurement. Tested source SHA-256 `0d89991533d80c162b426e1472360b4af59e96ca3602c9f0f477d781ee39d99f`; committed implementation `f504484be71e306aa1fbd1b43286439fcb4cd038` is identical to the checked source.

Final browser: development Mac, Codex in-app browser1280×720, actor40; civic day16/night22, standalone authored hero16, all-low(−12) day12, all-mixed(0) dusk18.5, all-high(+12) night22. All captured console warning/error lists empty; no shader error or failed load shown. Ordinary desktop resize1440×900 updates canvas/backing dimensions to1440×900, then returns to1280×720. [Final civic](../../artifacts/fuji-tv-polish/v3-pass3.jpg), [night](../../artifacts/fuji-tv-polish/v3-pass3-night.jpg), [hero](../../artifacts/fuji-tv-polish/v3-hero.jpg), [low](../../artifacts/fuji-tv-polish/v3-hero-low-day.jpg), [mixed](../../artifacts/fuji-tv-polish/v3-hero-mixed-dusk.jpg), [high](../../artifacts/fuji-tv-polish/v3-hero-high-night.jpg), [browser JSON](../../artifacts/fuji-tv-polish/v3-browser.json). JSON records capture-time canvas dimensions and engine, without a sustained FPS benchmark. GPU, exhibition hardware, sustained FPS, long-run and live survey browser NOT RUN; source pipeline tests exercised the real survey HTTP/WebSocket server. Unchanged survey/module-swap package suites not rerun.

Target fidelity PARTIAL: the selected target still has more prominent theatre/audience, richer indoor/public activity and finer facade/planting detail. Staff, presenters, audience and forum people are static geometry; entrances/cores express separate public/staff access but do not simulate interior circulation, acoustic performance or access control. Source GLB/Blender assets remain unchanged. Fal credentials were absent, and external asset packs were not authorized; no generated 3D asset requested. Worker FETCH_HEAD write was sandbox-blocked in pass3; orchestrator refreshed remote refs successfully and confirmed origin/main remainsf3b7d73. No main merge/deployment.

Dream Loop Plus says “Initially, only perform this loop 3 times” and “stop after 3, ask the user to review the results.” Three passes are complete; feature publication preserves a reviewable result. Do not start a fourth pass or integrate this v3 stage automatically. Next step: user visual review, then requested refinement or integration. Final evidence check PASS:221 local Markdown targets exist, all8 tracked v3 screenshots are1280×720, all7 browser records have empty captured warning/error lists, and committed source bytes match the tested SHA-256. Complete source/test/docs and new-file diff self-reviewed; committed task whitespace check PASS before publication.

## Target v3 implementation round 2 (2026-10-07)

Owner: Claude (orchestrator) with Opus worker subagents. User requested “do 3 loops” on `codex/fuji-tv-polish`. Startup: clean at `f78d93c`, fetch succeeded, feature counterpart 0/0; origin/main still `f3b7d73`; no merge. Target unchanged: `.dream-loop/target.png` SHA-256 matches target v3. Fable workers were unavailable (usage credits), so all three passes used Opus. In-app browser pane was hidden, so captures used headless `playwright-cli` (Chromium) at 1280×720 against the same 127.0.0.1:5174 preview, `?hour=16|22&review=civic&reviewTime=40`; headless WebGL output may differ slightly from the earlier in-app captures.

- Pass 1: brighter daytime room light (`.8+cityLight*.5`), warm floor skins and mezzanine ceilings, clearer silver glass, slimmer ivory mullions at wider spacing, sphere stage light towers/rig/step lights/balconies/ribs, ~46 forum and ~21 ring-floor standing visitors.
- Pass 2: per-room light variation and dimmer up-facing floors in the shared room-light shader; saturated broadcast blue; planted front ledges with lit soffits on each work floor.
- Pass 3: cream room-light tone, glass opacity .12; dark rear walls with warm panels and every third bay a blue video wall; standing staff along wing glazing; 9-row steeper theatre seating with risers and a warm stage back wall; lit lobby shopfront ring with visitors (skips wing interiors and the AQUA bridge gap).

Validation after every pass: root `npm test` (fail 0, includes actual floor/route/site clearances and 81 real survey-pipeline combinations), `npm run build` (existing >500kB warning), `git diff --check` PASS; captured console has no warnings/errors besides a favicon 404. Final also checked standalone hero16 (canvas 1280×720). Batches remain ≤9 per the existing test; triangle count rises (not re-measured). All changes stay in `src/civicCore.ts`; no new dependencies, GLB/Blender assets or renderer/camera changes. Evidence: [pass1](../../artifacts/fuji-tv-polish/v3r2-pass1.jpg), [pass2](../../artifacts/fuji-tv-polish/v3r2-pass2.jpg), [final day](../../artifacts/fuji-tv-polish/v3r2-pass3.jpg), [final night](../../artifacts/fuji-tv-polish/v3r2-pass3-night.jpg), [hero](../../artifacts/fuji-tv-polish/v3r2-hero.jpg). Meter low/mixed/high states, FPS, GPU/exhibition hardware and live survey browser NOT RUN this round.

Target fidelity PARTIAL: interior light now reads as warm rooms with blue screens and visible occupancy, but the target's glowing glass sphere theatre, denser crowds and glazed diagonal tubes remain stronger than the build. Static people are architectural occupancy, not simulation. Three passes done; stop for user review per Dream Loop Plus.

## Target v3 implementation round 3 (2026-10-07)

Owner: Claude (orchestrator) with Opus worker subagents. User requested “do 3 more loops”. Startup: clean at `951bb27`, fetch succeeded, feature counterpart 0/0, origin/main `f3b7d73`; no merge. Same target, preview and headless `playwright-cli` 1280×720 capture method as round 2.

- Pass 1: more amber room light with darker timber floors; dark desk tops; cleaner bay-facing mid band (y62/71 beam/diagonals removed on the front frame); diagonal streets now use a level basis (previously banked across their width) with ribbed glass escalator tubes, blue edge strips, steps and static riders; inward-facing sphere shell and lit crown rig.
- Pass 2: sphere shell split into warm dome / blue lower band; glass opacity .2; softer room tone; pier slots blue, larger pier panels glass. Orchestrator fix: the worker used `silverGlass` before its declaration (TDZ crash; build/test/browser all failed), so the declaration moved up beside the light finishes.
- Pass 3: fresnel `silverGlass` (clear face-on, silvered at grazing angles); saturated amber rooms; theatre wall dimmed to 0.3× so rig/stage/audience read; blue step lights; finer sphere grid (18 vertical, 6 horizontal ribs).

Validation after each pass (pass 2 after the fix), recorded by exit code: root `npm test` 0, `npm run build` 0 (existing >500kB warning), `git diff --check` 0; civic day16/night22 captured console has no warnings/errors besides favicon 404. Standalone hero16 visually checked; its console log was not captured. Earlier round-2 notes grepped test output rather than exit codes; their builds succeeded and pages rendered, and round-3 pass 1 re-ran on top of that source with exit-code checks. Batches remain ≤9 per test; triangle count not re-measured. Evidence: [pass1](../../artifacts/fuji-tv-polish/v3r3-pass1.jpg), [pass2](../../artifacts/fuji-tv-polish/v3r3-pass2.jpg), [final day](../../artifacts/fuji-tv-polish/v3r3-pass3.jpg), [final night](../../artifacts/fuji-tv-polish/v3r3-pass3-night.jpg), [hero](../../artifacts/fuji-tv-polish/v3r3-hero.jpg). Meter low/mixed/high, FPS, GPU/exhibition hardware and live survey browser NOT RUN.

Target fidelity PARTIAL: sphere now reads as a lit theatre and the wings as amber occupied rooms with blue screens; target still has a brighter golden stage/audience, denser visible crowds and warmer cream daytime facade. Stop for user review per Dream Loop Plus.

## Target v3 implementation round 4 (2026-10-07)

Owner: Claude (orchestrator) with Opus worker subagents. User requested “do 3 more loops”. Startup: clean at `d570f83`, fetch succeeded, feature counterpart 0/0, origin/main `f3b7d73`; no merge. Same target, preview and headless `playwright-cli` 1280×720 capture method.

- Pass 1: Fuji-local clones of `trim`/`stone` (warmer cream) and `solar` (charcoal for desks/people/seats) so shared city finishes are untouched (no runtime mutation of these finishes exists elsewhere); warm-white room light with pale-oak floors; warm theatre shell with a dark stage surround; slim 4 m wing mullions.
- Pass 2: cream street trusses/sphere hangers; blue-glass bay-side escalator pane; brighter amber rooms (day ≈1.3, night ≈2.2) with darker oak floors; cream fine mullions; dim blue upper theatre dome over a warm band; blue ring inset and pier slots.
- Pass 3: open stepped theatre seating on sloping supports; violet seat backs/step lights via a world-space region in the shared room-light shader (stage screen stays blue); warm stage deck; lit far-side wall panels (every third blue) inside the wing glazing; narrow warm control-room bands on the sealed studio blocks.

Validation after each pass by exit code: root `npm test` 0, `npm run build` 0 (existing >500kB warning), `git diff --check` 0; civic day16/night22 captured console has no warnings/errors besides favicon 404. Standalone hero16 visually checked (console query returned no entries). Batches remain ≤9 per test; triangle count not re-measured. The theatre violet region and the earlier theatre-wall dimming use world-space coordinates in the shader, so they assume the civic core stays at its current placement. Evidence: [pass1](../../artifacts/fuji-tv-polish/v3r4-pass1.jpg), [pass2](../../artifacts/fuji-tv-polish/v3r4-pass2.jpg), [final day](../../artifacts/fuji-tv-polish/v3r4-pass3.jpg), [final night](../../artifacts/fuji-tv-polish/v3r4-pass3-night.jpg), [hero](../../artifacts/fuji-tv-polish/v3r4-hero.jpg). Meter low/mixed/high, FPS, GPU/exhibition hardware and live survey browser NOT RUN.

Target fidelity PARTIAL: theatre now shows violet tiered audience under a blue dome, wings read as lit occupied rooms with far walls; target still has denser crowds, a warmer golden daylight grade and spotlights in a darker dome. Stop for user review per Dream Loop Plus.

## Target v3 implementation round 5 (2026-10-07)

Owner: Claude (orchestrator) with Opus worker subagents. User requested “do 3 more loops”. Startup: clean at `ecdf66f`, fetch succeeded, feature counterpart 0/0, origin/main `f3b7d73`; no merge. Same target, preview and headless `playwright-cli` 1280×720 capture method.

- Pass 1: whiter cream frame/slabs; golden-cream room light; violet-blue seat tint; smaller desk screens; live studio sets (video wall, lit stage, presenters, pedestal cameras, spot rigs) behind the glass on the y43/y83 wing levels; projecting cream mezzanine bands with lit undersides and planters on wing side faces; second forum visitor ring and denser foyer visitors.
- Pass 2: flank light panels moved to each room's far wall with ceiling strips and standing staff; theatre can-light rings; ~6/7 seat occupancy; denser bay-side roof groves.
- Pass 3: dark theatre dome with taller lit can-light lenses and four rows of house lights; dark mezzanine/upper soffits with lit strips and spot rigs behind the bay glazing; flank glass less silvered (fresnel `mix(1.3,.35)`); studio control-room bands split into windows; blue edge strips on escalator tubes.

Validation after each pass by exit code: root `npm test` 0 (includes aerial-approach, route/site and wing floor-support checks), `npm run build` 0 (existing >500kB warning), `git diff --check` 0; civic day16/night22 captured console has no warnings/errors besides favicon 404. Standalone hero16 visually checked (console query returned no entries). Batches remain ≤9 per test; triangle count not re-measured. No orchestrator fixes needed. Evidence: [pass1](../../artifacts/fuji-tv-polish/v3r5-pass1.jpg), [pass2](../../artifacts/fuji-tv-polish/v3r5-pass2.jpg), [final day](../../artifacts/fuji-tv-polish/v3r5-pass3.jpg), [final night](../../artifacts/fuji-tv-polish/v3r5-pass3-night.jpg), [hero](../../artifacts/fuji-tv-polish/v3r5-hero.jpg). Meter low/mixed/high, FPS, GPU/exhibition hardware and live survey browser NOT RUN.

Target fidelity PARTIAL: dark spotlit theatre dome, blue-violet audience and room-depth wings now approach the target; remaining gaps are stage light beams (would need a new transparent finish beyond the 9-batch limit), the warmer golden global daylight grade (out of civic-core scope) and denser crowds. Stop for user review per Dream Loop Plus.
