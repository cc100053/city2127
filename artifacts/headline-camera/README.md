# Headline camera — 2026-10-27

Implementation worker: Codex `01a17b81-4af3-7bf3-9512-a451a5198d53`, independent clone on `feat/headline-camera`, base `bdb22465d34eb1aa7ebc0175ce067d581c7b7495`. Validated code checkpoint: `4c52d681a3715630e5eba52889831729355775fb` (correction1; original implementation `9335b6d627cd5d6175a13936cb45c0e34708ab33`). Implementation and software verification are separate from coordinator review / human merge approval. Main merge approved and locally integrated on2026-10-27; [integration checks](integration-1/README.md) track push/main CI. No deployment.

The thirteen authored poses and the pure timeline are in [headlineCamera.ts](../../src/headlineCamera.ts). Focal/district priority matches the result card; energy selection/removal order is shared. Live transitions retain 2.62 s journey + 3 s city transition, 1.5 s overlapping fly-in and return at the actual display deadline (normally 10–12 s). No protocol, server, ladder, model, material or dependency change.

## Reproduce

Use the existing installed Playwright and Chrome on the measured Mac. These artifact runners import `/opt/homebrew/lib/node_modules/@playwright/cli/node_modules/playwright/index.mjs` and launch `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`. Root Vite must already be running at 127.0.0.1:5184. They close their own browsers and ephemeral scratch servers; stop Vite yourself after the checks.

```sh
npm run dev -- --port 5184
# In another terminal, in this checkout:
node artifacts/headline-camera/capture.mjs
node artifacts/headline-camera/live.mjs
node artifacts/headline-camera/recovery.mjs
node artifacts/headline-camera/verify.mjs
```

The initial requested `SURVEY_PORT=8798 npm run dev:auto --prefix survey` used a fresh temporary SQLite, never the exhibition DB. The repeatable final live runner creates a separate fresh real HTTP/WebSocket server per case: preserved v3 questions cover the frozen climate site's camera; current v4 questions cover energy/no change/A-B. Recovery uses another real scratch server plus a clearly labeled shortened-slot wire fixture made from real validated views. No server clock, score or protocol changes are used.

## Software checks and original evidence

Root `npm test`, `npm run build` and whitespace checks are recorded in final logs; build has the existing >500kB chunk warning and inconsistent JSON import-attributes warning for odaiba-layout.json. Survey build was used for the dev:auto scratch UI; survey/module-swap source and separate suites were not changed/run. Production bundle excludes `cityShot`. [Pure tests](../../tests/headlineCamera.test.ts) cover thirteen shots, energy ordering/removals and card places, stages/deadline, controls, current-pose interruption, cancel and catch-up.

[Static diagnostics](final/shots.json), [live diagnostics](final/live.json), [recovery checks](final/recovery.json) and [source/original image hashes](final/manifest.json) are the evidence. `verify.mjs` verifies the saved manifest without rewriting it; `--update` is an explicit refresh after intentional changes. It also compares all unaffected files against the preserved prior manifest. It checks all thirteen live/static shot IDs and table poses, hero, measured positive diagnostics, browser errors, A/B boundary and original hashes. Every live screenshot is captured at 8.3 s: after the 5.62 s geometry completion, with the last 120-frame FPS window fully within the 4.12–10 s hold. Live images use the `live-` prefix.

Platform: development Mac macOS 27.0.1 (26A434), arm64, Chrome 156.0.8078.48 headless / WebGL2 / ANGLE Metal Apple M6; 1920×1080, DPR1, default quality, hour12. DEV screenshots hold actor time20; live checks use the actual running actor clock. Google Fonts CSS is fulfilled empty in the runners to exercise the documented system-font fallback without external font availability. These are short canvas `data-fps` cadence samples, not a sustained/isolated benchmark or exhibition hardware proof. Static site/hero uses all-high DEV meters; energy static shots use E3 mixed composition; real live readings retain each accumulated survey state, so draw calls differ.

## Static shot samples

| Shot | FPS | Draw calls | 原圖 |
| --- | ---: | ---: | --- |
| hero | 60.1 | 998 | [hero](final/hero.jpg) |
| nw:focal | 60.0 | 815 | [nw-focal](final/nw-focal.jpg) |
| ne:focal | 60.0 | 799 | [ne-focal](final/ne-focal.jpg) |
| sw:focal | 60.0 | 620 | [sw-focal](final/sw-focal.jpg) |
| se:focal | 60.1 | 720 | [se-focal](final/se-focal.jpg) |
| nw:district | 60.0 | 911 | [nw-district](final/nw-district.jpg) |
| ne:district | 60.0 | 950 | [ne-district](final/ne-district.jpg) |
| se:district | 60.1 | 757 | [se-district](final/se-district.jpg) |
| energy:garden | 60.1 | 496 | [energy-garden](final/energy-garden.jpg) |
| energy:garden2 | 60.0 | 455 | [energy-garden2](final/energy-garden2.jpg) |
| energy:ring | 59.9 | 669 | [energy-ring](final/energy-ring.jpg) |
| energy:wing | 59.9 | 604 | [energy-wing](final/energy-wing.jpg) |
| energy:island | 59.9 | 461 | [energy-island](final/energy-island.jpg) |
| sw:district | 60.0 | 958 | [sw-district](final/sw-district.jpg) |

## Settled live hold samples

| Shot | FPS | Draw calls | 原圖 |
| --- | ---: | ---: | --- |
| nw:focal | 60.0 | 777 | [live nw-focal](final/live-nw-focal.jpg) |
| nw:district | 60.0 | 871 | [live nw-district](final/live-nw-district.jpg) |
| ne:focal | 60.0 | 1186 | [live ne-focal](final/live-ne-focal.jpg) |
| ne:district | 60.0 | 910 | [live ne-district](final/live-ne-district.jpg) |
| sw:focal | 60.0 | 608 | [live sw-focal](final/live-sw-focal.jpg) |
| sw:district | 60.0 | 936 | [live sw-district](final/live-sw-district.jpg) |
| se:focal | 60.1 | 708 | [live se-focal](final/live-se-focal.jpg) |
| se:district | 60.0 | 745 | [live se-district](final/live-se-district.jpg) |
| energy:garden | 60.1 | 859 | [live energy-garden](final/live-energy-garden.jpg) |
| energy:garden (after Undo) | 60.0 | 863 | [live garden-after-undo](final/live-garden-after-undo.jpg) |
| energy:garden2 | 60.0 | 711 | [live energy-garden2](final/live-energy-garden2.jpg) |
| energy:ring | 60.0 | 709 | [live energy-ring](final/live-energy-ring.jpg) |
| energy:wing | 59.9 | 599 | [live energy-wing](final/live-energy-wing.jpg) |
| energy:island | 60.1 | 701 | [live energy-island](final/live-energy-island.jpg) |

## Scope and limits

The original close focal hints cropped the scaled 96 m nw / 138 m se towers; final authored poses retreat/raise to retain the whole body. SW focal looks beneath the existing sky bridge; district SW points toward the water rooms. Existing columns/routes and the commons' own roof remain visible; no full-scene occlusion sweep or camera-flight collision avoidance is claimed. Model/material close-up polish is a separate task.

No exhibition hardware, 4K/HDMI, Safari/iPad/Windows, visitor reading/understanding, long-duration FPS, engineering validation or main CI was tested. Initial sandbox listen/Chrome failures were retried with scoped approval; an initial DEV media-event-only cancel failed and was replaced by the final per-frame reduced-motion guard. Early 4.9 s live captures and pose trials remain locally under `drafts/` as rejected evidence, excluded from publication; the final images above supersede them.


## Coordinator correction 1 — 2026-10-27

Fixed `play([])` during hold or fly-out: it now captures the current pose and returns over FLY_OUT=2 s during the next journey, then remains hero with controls enabled and no fly-in. Fresh no-headline stays hero; nonlive, reduced motion and catch-up still cancel immediately. Regression tests cover both interrupted stages and the first frame.

[Targeted real v4 A/B + v3 SW runner](correction-1/browser.mjs) and [results](correction-1/browser.json): A +1 service then B −1 service preserves the tier through hysteresis; energy choices also remain below equipment thresholds. The runner asserts identical before/after layout for B before accepting the test. Submissions1018 ms apart, B boundary step0.1001 m, maximum frame step6.1096 m, 65 sampled hero frames after the return, and OrbitControls responds again. [Original B result at hero](correction-1/ab-no-headline-hero.jpg) / [raw frames](correction-1/ab-frames.json). An initial neutral-B fixture would have advanced nw to tier2; its precondition correctly rejected it ([record](correction-1/fixture-precondition.txt)), before the proper no-headline case ran.

SW district is now `[-365,135,-420] → [-180,8,-235]`, aimed at the actual SharingDistrict waterfront rather than the climate park. Three genuinely changed rooms (indices2/3/4) are safely within the frame and visibly readable in the new original: `(-53.88,-332.66)` domed garden on the right, `(-172.60,-244.71)` halo garden in the centre, and `(-248.99,-217.71)` stepped seating on the left. Nearby shoreline common spaces stay in view; the climate park is a right-background reference. The source configuration projection is recorded separately from visual inspection; it does not claim all ten dispersed inland courts are unobstructed. Static/live60.0 FPS and958/936 calls at the same viewport/quality; no model or material edits. Only these two final SW images were replaced; all other originals were compared with the saved prior hashes.

[Prior integrity check](correction-1/prior-integrity.json), [prior saved manifest](correction-1/prior-manifest.json), [manifest rejection check](correction-1/manifest-rejection.txt): default `verify.mjs` now compares persisted hashes and never rewrites the manifest. Intentional refresh uses `--update`; a second independent invocation verifies it. An altered saved source hash was rejected and the original restored byte-for-byte. Root test/build/whitespace passed again; build retains both the existing chunk-size and inconsistent JSON import-attributes warnings. [New test log](correction-1/test.txt) / [build log](correction-1/build.txt). Reused earlier visual/recovery evidence remains applicable; no unnecessary thirteen-shot recapture.
