# Headline camera — 2026-10-27

Implementation worker: Codex `01a17b81-4af3-7bf3-9512-a451a5198d53`, independent clone on `feat/headline-camera`, base `bdb22465d34eb1aa7ebc0175ce067d581c7b7495`. Validated implementation commit: `9335b6d627cd5d6175a13936cb45c0e34708ab33`. Implementation and software verification are separate from coordinator review / human merge approval. No main merge or deployment.

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

Root `npm test`, `npm run build` and whitespace checks are recorded in final logs; build has only the existing >500kB chunk warning. Survey build was used for the dev:auto scratch UI; survey/module-swap source and separate suites were not changed/run. Production bundle excludes `cityShot`. [Pure tests](../../tests/headlineCamera.test.ts) cover thirteen shots, energy ordering/removals and card places, stages/deadline, controls, current-pose interruption, cancel and catch-up.

[Static diagnostics](final/shots.json), [live diagnostics](final/live.json), [recovery checks](final/recovery.json) and [source/original image hashes](final/manifest.json) are the evidence. `verify.mjs` checks all thirteen live/static shot IDs and table poses, hero, measured positive diagnostics, browser errors, A/B boundary and original hashes. Every live screenshot is captured at 8.3 s: after the 5.62 s geometry completion, with the last 120-frame FPS window fully within the 4.12–10 s hold. Live images use the `live-` prefix.

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
| sw:district | 60.0 | 938 | [sw-district](final/sw-district.jpg) |

## Settled live hold samples

| Shot | FPS | Draw calls | 原圖 |
| --- | ---: | ---: | --- |
| nw:focal | 60.0 | 777 | [live nw-focal](final/live-nw-focal.jpg) |
| nw:district | 60.0 | 871 | [live nw-district](final/live-nw-district.jpg) |
| ne:focal | 60.0 | 1186 | [live ne-focal](final/live-ne-focal.jpg) |
| ne:district | 60.0 | 910 | [live ne-district](final/live-ne-district.jpg) |
| sw:focal | 60.0 | 608 | [live sw-focal](final/live-sw-focal.jpg) |
| sw:district | 60.0 | 898 | [live sw-district](final/live-sw-district.jpg) |
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
