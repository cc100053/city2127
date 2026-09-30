# Odaiba Dream Loop — 2026-09-30

- Owner: Codex; sequential Dream Loop workers share this task's runtime ownership.
- Branch: `feat/art-direction`; resume the existing Odaiba art work, no main integration before human art review.
- Base: `102b6bbc16bc2bf60375da1b79cd5990a77d7ef7`.
- Preflight: repository confirmed, origin fetched; HEAD/upstream divergence 0/0. `origin/main` is `b97f859`, an ancestor three commits behind this art branch. Unrelated untracked `.claude/launch.json` preserved.
- Prior handoff: [Odaiba art direction 01](odaiba-art-direction-01.md), verified implementation `274167e`, available remotely and contained in this base. This new user request authorizes continuation beyond its one-pass stopping point.
- Scope: polish the existing Odaiba model against a generated target using the Dream Loop Plus workflow: three sequential implementation passes, each followed by root checks and a new browser screenshot. Preserve venue, four-question contract, site/route clearances, desktop scope and UI copy. No source binary replacement, new dependencies, deployment or external asset packs.
- Working context: ignored `.dream-loop/`, including `baseline.png`, locked `target.png` and per-pass screenshots. Target generated with the built-in image tool from the current browser screenshot plus the approved [R01](../ODAIBA_2127_REFERENCES/R01_MASTER_HERO.png); [master taste](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) remains visual authority.
- Baseline: headed Chrome, 1920×929 screenshot, original hero camera, `?hour=16&reviewTime=20` (16:00 / actor time 20 s).
- Status: three passes implemented and locally verified; human art review pending.
- Last verified implementation: `3466168437d7ce8f9fda8a4c19bb7df2e3a71682`, pushed to `origin/feat/art-direction`. Validation above/below was performed on the identical executable working tree before commit. Closure changes are documentation/image filenames only.
- Feature CI: [run 36697005144](https://github.com/cc100053/city2127/actions/runs/36697005144), PASSED for all three packages on the implementation commit.

## Target prompt

Polish the existing realtime Three.js screenshot while retaining exact framing, coastline, civic core and landmark relationships, open sky/bay and UI. Clear warm afternoon light, material depth, engineered Fuji-derived civic structure, connected public terraces, ecological corridors, a thick amphibious shore and reflective rippled blue-grey water. Restrained palette, mature future identity, readable survey clearings; no cyberpunk, fantasy anti-gravity, photographic replacement or cinematic camera.

## Validation / next step

Orchestrator runs root `npm test`, `npm run build` and `git diff --check` after each pass, inspects screenshot and loading errors, and fixes regressions before the next worker. Final review requires daylight/night and relevant survey checks. Stop after three passes for human art review; target similarity is a visual judgment, not a measured completion claim.

## Pass 3 worker — implemented, verification pending

Preflight repeated on `102b6bbc16bc2bf60375da1b79cd5990a77d7ef7`; fetch succeeded, feature branch/upstream showed no divergence. Existing dirty files and `.claude/launch.json` preserved. Compared `.dream-loop/pass2.png` with the locked target. Added world-scaled generated coastal grass to existing landscape surfaces, a generated sky texture blended into the clock-driven gradient (fully removed at night), coarser dual-scale generated water normals and less mirror-like water response, and consistent retained-landmark glazing roughness/metalness. Raised maritime fog enough to soften the distant sea-plane boundary while retaining the original camera. No geometry, model binaries, routes or authoritative sites changed in this pass.

Changed runtime files: `src/main.ts`, `src/odaibaScene.ts`, `src/bayWater.ts`; new assets: `asset/textures/coastal-grass.png`, `asset/textures/maritime-sky.png`. Root checks and browser day/night/loading/shoreline/survey checks are explicitly deferred to the orchestrator; no worker test/build/commit was run.

Both new textures generated with the built-in imagegen tool on 2026-09-30, copied unchanged from `/Users/fatboy/.codex/generated_images/01a0f19b-fb9c-7c50-9c89-bdb02490aec3/`. Source files: `exec-e66d250e-0f9a-4bb7-a0aa-6edcb7de3549.png` (grass), `exec-13290723-cf68-4bfd-bd16-2e781f221fde.png` (sky). No external asset pack used.

Grass prompt:
> Create one seamless tileable photoreal PBR base-color texture, square 1024x1024, overhead orthographic flat scan of mature coastal park grass. Fine irregular olive-green and muted sage grass blades, tiny straw flecks, gentle natural variation, dense continuous grass coverage, no paths, no objects, no trees, no flowers, no visible soil holes, no painted mowing stripes. Even diffuse neutral lighting, absolutely no directional shadows, no vignette, no perspective. Subtle low contrast, realistic texture to tile across a large Tokyo waterfront park in an architectural realtime scene. No text or borders.

Sky prompt:
> Generate a seamless equirectangular 360-degree sky environment texture, 2:1 aspect ratio. Sky ONLY, absolutely no sea, land, buildings, horizon objects, text or sun disk. Clear Tokyo late-afternoon sky with sparse small stratocumulus clouds gathered mostly near the horizon in the middle horizontal band, upper hemisphere softly graduated maritime blue. White warm ivory sunlit cloud edges, subtle cool blue cloud undersides. Zenith clear blue, lower hemisphere uniform pale blue. The left and right edges must seamlessly wrap. Restrained realistic atmosphere, not dramatic, not sunset-orange. This is a usable spherical sky texture for a 3D architectural scene, not a finished scene or photo backdrop.

## Final implementation and actual validation

- Pass 1: shared world-space water normals, clearer warm daylight, surveyed instanced tree crowns.
- Pass 2: one instanced facade-panel batch on existing context walls; inset Aqua/DECKS roof planting; day fill/exposure balance.
- Pass 3: generated grass and sky, softer dual-scale water, consistent retained glazing. No new major building typology or shoreline geometry.
- Orchestrator verification: root `npm test` / `npm run build` passed after each pass; final `git diff --check` clean. Existing >500 kB build warning remains. Root Odaiba tests now include canopy, roof canopy and facade panels in the actual-mesh site/route/bridge raycasts and assert occupied facade rows. Source model hashes unchanged. `survey/` and `module-swap/` unchanged; their local suites were not rerun.
- Browser: headed Chrome, original hero pose, fixed actor time 20 s for standalone comparisons. Baseline/final/night images are 1920×929; survey images are 1920×873. Device DPR 2, renderer cap 1.5. Examined 12:00, 16:00, 06:18 (overlay rounds down to 06:17), 17:48 and 22:00. No localhost application errors or shader failures; existing wallet-extension errors were observed before the change and excluded. Clouds fade out at night; shoreline uses one water finish.
- Scratch server: 8794 / `/private/tmp/odaiba-dream-survey.sqlite`, never the exhibition DB. Twenty all-positive and twenty all-negative proposals verified all four high/low bands and actual visible counters; screenshots below. Reset restored mixed 3 ports / 8 trees / 4 shared seats / 4 modules. Reload restored that snapshot. A fresh live proposal converged to 5 ports / 10 trees / 7 shared seats / 5 modules with transition finished. This is a rendering regression smoke, not a complete guest/lifecycle acceptance rerun or timing measurement.
- Performance limitation: at 1920×929 with DPR cap 1.5, canvas rolling sample showed 26.6 FPS / 1,331 draws before and 23.7 FPS / 1,359 draws / 348 geometries after. These are observations from the current browser session, not a controlled 1080p DPR-1 benchmark or a 60 FPS claim. No GPU/device identification or exhibition-PC acceptance repeated.

| Evidence | File |
| --- | --- |
| Baseline / locked generated target / final | [Before](../../artifacts/odaiba-dream-before.jpg), [Target](../../artifacts/odaiba-dream-target.png), [After](../../artifacts/odaiba-dream-after.jpg) |
| Night | [22:00](../../artifacts/odaiba-dream-night.jpg) |
| Survey bands | [High](../../artifacts/odaiba-dream-high.jpg), [Low](../../artifacts/odaiba-dream-low.jpg) |

Target is 1802×872 (image tool output), compared proportionally to the 1920×929 browser frame. Pass 1/2 and additional light-condition captures are kept in ignored `.dream-loop/`.

## Remaining visual gaps and next step

Target NOT reached. The waterfront is still a thin linear promenade; broad flat lawns, road parcels and retained mall/hotel archetypes remain. Tree crowns are geometric proxies, with repeated roof rows. Water reflection is an environment/specular approximation, not screen-space reflection or dynamic waves. The far sea boundary remains visible, and the fixed hero shows very little of the cloud texture. Daylight overlay contrast over blue water remains weak. These need user art judgment before further work. Stop after three passes under Dream Loop Plus; review the paired images and choose whether to continue toward shoreline/civic organization or revise the target. No main merge/deployment.

## Water texture provenance

`asset/textures/bay-ripple-normal.png` was generated with the built-in imagegen tool on 2026-09-30, without an input image or transparency, copied unchanged from `/Users/fatboy/.codex/generated_images/01a0f193-6da8-79f1-b5ea-3b8f87dd266d/exec-bb081767-3811-4930-8770-d6aa40d44fc8.png`.

Exact prompt:
> Create a seamless tileable square tangent-space normal map texture for calm Tokyo Bay seawater viewed from aerial height. Dense natural small wind ripples, softly intersecting wavelets, no foam, no large waves. Technical OpenGL RGB normal map, dominant flat normal lavender blue RGB 128 128 255 with subtle red green directional wave normal detail, no lighting no shadows no perspective no border. Full square texture only.
