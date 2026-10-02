# night-lighting — Readable futuristic night city

> Historical scope — 2026-10-02: Shibuya development is closed and will not resume. Any unfinished Shibuya next steps below are cancelled as product work. Reused assets/legacy contracts do not imply a second venue. Current scope: [EXHIBITION_SPEC](../EXHIBITION_SPEC.md); retained source may still serve Odaiba or legacy tests.

- Owner: Codex
- Status: DONE — integrated into main 2026-09-30
- Branch: codex/night-lighting
- Base commit: b87a0b44488b8d71cb19e10dd4b0ad1fff104280
- Last verified commit: 3d6651329a8f546dccbd19053fccbecc1d31f490 (integrated code; root checks and main CI passed 2026-09-30)
- Remote availability: origin/main at integration 3d6651329a8f546dccbd19053fccbecc1d31f490; feature 1e662282aebba23aa5ec1b8073ac7c265a1a55e7 remains on origin/codex/night-lighting

## Session Git state

- Starting branch/HEAD: main, b87a0b44488b8d71cb19e10dd4b0ad1fff104280.
- Fetch succeeded 2026-09-30; origin/main is the same SHA. Divergence 0/0; clean tree.
- No overlapping edits observed; Codex owns root lighting and coupled site light accents.
- Historical art-direction work is integrated; current code retains its day-cycle lighting. No unfinished lighting task is being resumed.

## Goal and acceptance criteria

Implement the user-approved lighting plan: brighter readable night surfaces, integrated civic light strips, actual local street/site illumination, navy sky and restrained bloom. Keep all v2 alternatives readable and saffron reserved for guest feedback. Preserve camera, site contracts, actor counts and 180-second clock.

## In-scope files and dependencies

Root main/dayCycle/cityRig, site builders and existing state test; PROJECT/PLAN02/ART/VALIDATION. Existing Three.js only. No assets, backend or dependencies.

## Completed work

Implemented brighter night fill and restrained bloom/vignette, embedded cold-white/mint lighting and eight real local civic lights. Shared materials and existing bake batches are reused. All four site accents inherit existing layer transitions; actor counts, server contracts and camera are unchanged. PROJECT/PLAN02/ART/VALIDATION synchronized; README unchanged because launch and controls are unchanged.

## Actual validation results

PASSED locally on the implementation delta over the base SHA, 2026-09-30: root npm test/build, git diff --check; fixed-pose day/dawn/dusk/night, v2 low/mixed/high snapshots, resize, orbit and live sunset. Foreground Chrome on Apple M6 at 1920×1080/DPR1 observed 60.1 FPS standalone and v2-high after warm-up. See [VALIDATION](../history/VALIDATION_2026-10-02.md#readable-futuristic-night-lighting--2026-09-30) for exact fixtures, screenshots and limits. Feature [CI 36652867312](https://github.com/cc100053/city2127/actions/runs/36652867312) passed on 1e662282aebba23aa5ec1b8073ac7c265a1a55e7. Integrated with no conflicts as 3d6651329a8f546dccbd19053fccbecc1d31f490; root test/build and committed diff whitespace passed again, tree equals the browser-verified feature tree. Main [CI 36652968711](https://github.com/cc100053/city2127/actions/runs/36652968711) passed (root, survey and module-swap). This closure update changes documentation only.

## Known issues and blockers

Exhibition hardware remains unmeasured. Shadowless civic lights can leak through walls. Existing SE ground occlusion remains. One interrupted tree fetch during early HMR/reload is retained in the accumulated browser log; final matrix had no uncaught page errors and required site assets were ready.

## Important decisions

Use shared materials and baked light geometry; a small fixed pool of local lights. No extra post-processing pass.

## Next expected step

Shipped to main. User can review the local 22:00 preview and the saved before/after captures. Exhibition hardware performance remains a later installation check; no further implementation required in this task.
