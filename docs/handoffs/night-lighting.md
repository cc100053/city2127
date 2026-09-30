# night-lighting — Readable futuristic night city

- Owner: Codex
- Status: IN_PROGRESS
- Branch: codex/night-lighting
- Base commit: b87a0b44488b8d71cb19e10dd4b0ad1fff104280
- Last verified commit: implementation delta over b87a0b44488b8d71cb19e10dd4b0ad1fff104280, checked 2026-09-30
- Remote availability: NOT PUSHED

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

PASSED locally on the implementation delta over the base SHA, 2026-09-30: root npm test/build, git diff --check; fixed-pose day/dawn/dusk/night, v2 low/mixed/high snapshots, resize, orbit and live sunset. Foreground Chrome on Apple M6 at 1920×1080/DPR1 observed 60.1 FPS standalone and v2-high after warm-up. See [VALIDATION](../VALIDATION.md#readable-futuristic-night-lighting--2026-09-30) for exact fixtures, screenshots and limits. Feature/main CI and integration pending.

## Known issues and blockers

Exhibition hardware remains unmeasured. Shadowless civic lights can leak through walls. Existing SE ground occlusion remains. One interrupted tree fetch during early HMR/reload is retained in the accumulated browser log; final matrix had no uncaught page errors and required site assets were ready.

## Important decisions

Use shared materials and baked light geometry; a small fixed pool of local lights. No extra post-processing pass.

## Next expected step

Commit/push, require feature CI, then integrate following [CONTRIBUTING](../CONTRIBUTING.md).
