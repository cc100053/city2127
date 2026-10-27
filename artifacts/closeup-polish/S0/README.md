# S0 measured baseline — review checkpoint

Owner: Codex worker `01a17d74-5b40-7a30-a6eb-88447b33d6b2`. Base `fdc4a0cbbbc352b41c15850f2a846845d7975de1`, measured2026-10-27–28 JST. **98 states / 196 original baseline JPEGs**, 96 A4 comparisons and 28 two-round performance cases (mean79.51–133.60FPS). [Per-state review](REVIEW.md), [structured report](report.json), [visual reasons](visual-review.json). This records the starting failures; it is not visual acceptance. No art, camera poses, ladder, timeline, survey or production behavior changed. Coordinator review precedes integration and sectors A–D.

## Reproduce

Use Node26, installed dependencies, loopback Vite DEV and the URL actually printed. The runner defaults to `http://127.0.0.1:5194/`; set `CITY2127_CITY_URL` if different. Playwright is loaded from `/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs`, Chrome from `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. No new dependency; diagnostics reuse installed `three-mesh-bvh` in DEV.

```sh
node tests/devShotFrame.test.ts
node artifacts/closeup-polish/capture.mjs --self-test
node artifacts/closeup-polish/capture.mjs capture
node artifacts/closeup-polish/capture.mjs perf
node artifacts/closeup-polish/capture.mjs compare
node artifacts/closeup-polish/occlusion.mjs
node artifacts/closeup-polish/report.mjs
```

`CITY2127_EVIDENCE_DIR` selects a fresh folder (capture/perf default `S0/baseline`); `CITY_SHOT_ONLY` filters one shot. Capture/perf resume complete rows and refuse to overwrite existing images. Use fresh folders for retries. `report.mjs` deliberately requires the full S0 matrix and the recorded visual review; later sectors use the capture runner with their own evidence folders. It verifies every previous original hash before extending [original-images.json](original-images.json).

Each state uses two fresh navigations to its exact saved URL, `reviewTime=20`, hour12/22, 1920×1080/DPR1/default, Google Fonts CSS explicitly replaced by empty CSS. Wait for `canvas.dataset.fps`, then six seconds; JPEG90. All first takes remain for reproducibility, while all98 full original second takes were opened directly with view_image and judged in this session. No contact sheet replaces the original review. [environment.json](environment.json) records platform, runtime hashes and split capture provenance. Runtime source is unchanged since59c6ea9; runner reporting changes cannot change the preserved scene pixels.

## Measured gates

- A1:60 PASS,6 FAIL,20 unmeasurable FAIL,12 N/A. A2:42 PASS,24 FAIL,20 unmeasurable FAIL,12 N/A. A3:0 PASS,66 measured FAIL,20 unmeasurable FAIL,12 N/A. The12 N/A are hero2 plus absent-energy10; missing/invalid projections never become PASS.
- A4:7/96 pairs PASS;20 pairs cannot project the complete subject and remain explicit FAIL. Adjacent threshold6%, extremes12%, mean absolute RGB difference/255 in the clipped union of measured subject boxes. The clips only select pixel comparison regions; A1/A2 use unmodified, unclipped bounds. a/mixed garden and garden2, b/mixed ring and wing, c/mixed island reuse the same component, so their low differences are retained.
- A5: [performance.json](baseline/performance.json) is the corrected28-case/56-window reference; raw intervals, per-round draw calls, URLs, poses, GPU and errors are retained. Relative95%FPS/+10%draw limits apply to later rounds. All98 vsync data-fps readings were58.5–60.1 (>=58). This development-Mac result does not establish exhibition-machine performance.
- A6:97/98 original cases PASS. The first NW low/day take contains a Vite optimizer504 plus aborted requests during automatic reload. It remains FAIL. A fresh isolated [six-state NW retry](retry-nw-focal/capture.json) passes6/6; it does not replace original evidence.
- Reproducibility:41/98 pairs below1/255;57 FAIL. Both originals remain and second takes are used consistently. GTAOPass's default SimplexNoise(Math.random) is a potential reload-noise contributor, not a quantified sole cause; no random seed or renderer changes were made.
- V1–V6: explicit judgments and reasons are expanded per state in report.json. These are session judgments, not visitor recognition testing. V6 STATIC PASS cannot exclude temporal flicker. No shot is declared fully accepted while the recorded gates fail.

A1/A2 use the visible subject's world AABB projected through the authored camera: socket site root, entire district carrier or corresponding energy group. SW/SE district carrier bounds cross the near plane; all20 states are unmeasurable and require later pose work. A3 is the specified nine-point first geometric hit test across the visible scene, including rays through box gaps. [occlusion-causes.json](occlusion-causes.json) classifies saved rays against world-AABB entry/exit, without changing the gate or pretending ambiguous interior geometry proves occlusion. CPU raycasts do not model shader displacement or texture alpha masks. Indirect BVH preserves indices; the synchronous prototype override is restored in finally. Node fixtures and [native/BVH equivalence](raycast-equivalence.json) cover the supported geometry path.

## Chrome frame-cap correction

The prescribed `--disable-gpu-vsync` alone yielded60.001–60.003 FPS for all28 cases in current Chrome156.0.8078.48. [Original flag-only measurements](baseline/performance-vsync-flag-only.json) and [log](performance.log) are preserved, but **are not the uncapped reference**. An isolated [hero diagnostic](perf-cap-trial/performance.json) adding `--disable-frame-rate-limit` gave86.33 day /89.42 night FPS. The runner now records both flags and completes the same28 cases with the cap removed. The diagnostic's two hero cases seed that reference; remaining26 cases use the identical corrected launch and sampling method. The exact diagnostic [runner](perf-cap-trial/runner.mjs) is retained. Waiting remains at least16s after navigation, then five-second rAF windows, two navigations per case. No scene, quality preset or acceptance threshold changed.

## A7 — behavior and checks

[DEV smoke](dev-smoke/smoke.json) uses a real scratch v4 HTTP/WebSocket server. It checks the live headline/reason and reload-to-ambient hero; a synchronous `cityShotFrame` call during the active headline leaves pose and GPU geometry/texture counts unchanged. [Production smoke](production-smoke/smoke.json) uses the built bundle and checks both cityShot/cityShotFrame are absent, live result and reload hero. [Static bundle exclusion](production-check.json) also finds no helper/BVH markers.

[Formal browser evidence](formal-headline/browser.json) reuses E4 fixtures and recovery checks with two headline-aware result assertions: actual proposal/UI/server/SQLite, legacy history, same-ID retry, maintained/actual results, Undo, mixed portfolio, day/dusk/night, actual TCP reconnect, reduced motion, normal desktop resize and reset. The original E4 failed on its fixed energy-copy wait after the ladder changed headline priority; [failed log](formal.log) and partial originals in formal/ remain. The S0 copy changes the two result waits to check the current headline preference/kind, retains all energy/model assertions and leaves tests/energyE4.browser.mjs unchanged. Its fixture clock jumps skip visitor waits and do not measure exhibition queue timing. Root node tests check the existing3s retarget behavior; no claim of a separately measured3.000s browser duration.

Final check outcomes and cleanup are recorded in [checks.json](checks.json) and the task handoff. Logs include the original sandbox listen EPERM and optimizer startup failure; approved reruns are distinguished. Resume root suite/build and survey fixture build passed; survey source did not change, so no independent survey-package test claim. Build retains the existing chunk-size/JSON import-attributes warnings. Other platforms, displayDPR2, exhibition hardware, visitor recognition and full temporal-artifact acceptance remain unverified. No main merge, deployment or sectors A–D in this worker batch.

## Preserved checkpoint history

The first checkpoint stopped at43/98 under the then-active15% reserve, with86 baseline JPEGs and7 native trial images; [partial-report.json](partial-report.json) is historical. Commit7fbfbfa normalized filenames to hyphens without changing any of those93 image bytes. Human message01a17d9e-e127-7d03-9bed-65a8eb3fdba1 removed the percentage reserve; that earlier resume date is superseded. Work resumed, later hit an actual provider limit, and the background runner finished98/28/96 while sampling was unavailable. Recovery dispatch closeup-polish-S0-recover-r6 reconciled those results and completed the remaining review/checks. Original93 hashes were verified before and after continuation. Shared coordinator state remains the authority for relay ownership; only this worker's result record is written here.

## Integration status — 2026-10-28

Coordinator accepted19e9ae2 as the measured baseline. No-ff main mergec802bba passed fresh root test/build/diff checks; [integration evidence](integration.json) records the actual merge and logs. Runtime/tests/package/lock exactly match the accepted checkpoint, so existing browser evidence remains applicable; no new FPS or browser claim. Final published SHA and actual main CI live in this batch's external result-S0-integration.json. All original failures remain; sectors A–D have not started.
