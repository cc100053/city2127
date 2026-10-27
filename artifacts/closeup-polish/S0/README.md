# S0 baseline — IN PROGRESS

Owner: Codex worker `01a17d74-5b40-7a30-a6eb-88447b33d6b2`; baseline `fdc4a0cbbbc352b41c15850f2a846845d7975de1`, 2026-10-27. Only DEV measurement and tests changed; art, camera poses, ladder, timeline, survey and production behavior unchanged. S0 is **not complete** until all 98 states, A4 comparisons and 28 two-round uncapped performance cases are recorded.

## Reproduce

From this independent checkout, run a loopback Vite preview at an available port. The runner defaults to `http://127.0.0.1:5194/`; set `CITY2127_CITY_URL` to its printed URL. Node26, installed Playwright and Google Chrome paths match the headline baseline. No new dependency. Existing `three-mesh-bvh` is used only by DEV diagnostics, following the geometry tests.

```sh
node tests/devShotFrame.test.ts
node artifacts/closeup-polish/capture.mjs --self-test
node artifacts/closeup-polish/capture.mjs capture
node artifacts/closeup-polish/capture.mjs compare
node artifacts/closeup-polish/capture.mjs perf
```

`CITY2127_EVIDENCE_DIR` selects a fresh evidence folder (default `artifacts/closeup-polish/S0/baseline`). Capture/perf resume completed rows from their JSON. `CITY_SHOT_ONLY=ne:focal` restricts a run. Use a new folder for independent retries; preserve old originals. `compare` is run once after capture; it compares JPEG90 second takes, in the clipped union of the two measured subject boxes, in browser Canvas2D without another image dependency. Adjacent thresholds are 6%; extremes 12%. MAD is mean absolute RGB difference divided by 255. Alpha is excluded.

Each state is a fresh URL navigation for both takes, fixed `reviewTime=20`, hour12/22, 1920×1080/DPR1/default. Wait for `data-fps`, then six seconds. Both images are originals; use the second for comparisons because early reload reproducibility exceeded 1/255. Google Fonts CSS is replaced explicitly by empty CSS. `environment.json` contains source hashes and platform. Capture JSON includes exact URLs/poses/GPU/renderer datasets, errors, boxes, all nine first hits and both takes. No frame is manufactured to pass.

Framing uses the visible subject's world AABB projected through the current camera. No screen clipping improves A1/A2. Missing/hidden energy is N/A, never PASS; invalid near-plane bounds are reported. A3 is the specified 9-ray geometric first-hit test including the entire visible scene. A ray through a gap in the box also fails; this differs from an assertion that a solid part is obstructed. Geometry raycasts do not reproduce shader deformation or alpha texture masks. These limitations are retained for review.

Energy membership traced from `energyPrototype.select`: garden/garden2 baseline→a→mixed; ring baseline→b→mixed; wing baseline→a (small)→b (large)→mixed (large); island baseline→c→mixed. The latter same-component presets may have small A4 differences; report measured FAIL rather than assume all presets visibly differ.

## Evidence and current limitations

- `baseline/capture.json` and JPEGs: current measured state matrix; incomplete rows are not an accepted full baseline.
- `native-raycast-trial/`: first native-raycast samples retained before reusing BVH; `raycast-equivalence.json` checks the common samples' exact boxes/hits. No model changes between them.
- The first BVH take recorded a Vite optimizer `504 Outdated Optimize Dep` and aborted requests during its automatic reload. A6 remains FAIL for that take; retry separately after warmup, preserving it.
- Reload reproducibility has exceeded 1/255 for the first NW cases. GTAOPass constructs new SimplexNoise via default `Math.random()` for denoise texture on load; this is a potential contributor, not a quantified sole cause. No seeding or renderer changes were made. Both takes are retained.
- `timing.log`: a diagnostic load, not FPS evidence. It ran briefly beside capture; no uncapped baseline was measured during it. First FPS at19.676s, helper524.9ms.
- `npm-test.log`: initial sandbox `listen EPERM`; `npm-test-network.log`: approved full rerun PASS. `npm-test-final-source.log`: final-source rerun; consult exit result before claiming PASS.
- `npm-build.log`: build PASS with existing chunk-size and JSON import-attributes warnings. Production bundle does not contain cityShotFrame/devShotFrame/MeshBVH markers.

No uncapped performance or A4 completion claim yet. No new live survey check, exhibition hardware, Safari/iPad/Windows, visitor recognition or engineering acceptance. No merge/deployment. Stop owned Vite and browsers at the batch boundary.
