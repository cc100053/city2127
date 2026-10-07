# Fuji TV polish — Dream Loop

- Owner: Codex
- Status: IN_PROGRESS
- Branch: codex/fuji-tv-polish
- Base commit: 4eda49ebae30e6215e6f67f17e8fef197832b34e
- Last verified commit: base 4eda49ebae30e6215e6f67f17e8fef197832b34e plus final uncommitted src/civicCore.ts delta; source checks PASS
- Remote availability: NOT PUSHED

## Session Git state

2026-10-07: clean detached HEAD at the base; fetch succeeded; HEAD, local main and origin/main match (0/0). New branch starts from origin/main. No task remote counterpart yet; no conflicts.

## Goal and scope

Polish the procedural Fuji TV civic core using [CITY MASTER TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md), R01/R02 and Dream Loop Plus (three worker passes). Preserve hero camera, district, four sites, routes and the original Blender/GLB assets owned by cc100053. Primary ownership: src/civicCore.ts; shared helpers only when necessary. Existing asset study remains separate; no binary edits overlap it. Previous Dream Loop work is integrated through 53790a2 and later main; use actual current source rather than its old next-step notes.

## Completed work

Three implementation passes and source/browser checks complete. Core/public layers, references and evidence are documented below; visual review and integration remain pending.

## Actual validation results

PASSED for local source and specified browser checks below. NOT INTEGRATED; generated-target fidelity remains PARTIAL.

## Known issues and blockers

No failing source checks. Target fidelity remains partial; performance/hardware and live survey browser limits are listed below.

## Next expected step

Three passes complete. Publish the checked feature branch and ask cc100053 to review the actual screenshots; further passes/integration follow review per Dream Loop Plus.

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
