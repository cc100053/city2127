# Odaiba hero district — 2026-09-30

- Owner: cc100053 (Claude Code session)
- Status: DONE (integrated into main) — earlier status: P1, P2 and the P3 draw-call merge implemented and locally verified; P3 tier-1 art pass awaiting art direction.
- Branch: `feat/odaiba-district`, stacked on `feat/art-direction` (not `main`): P1 edits `odaibaScene`, `coastalCanopy` and `contextFacades`, which exist only on the art branch pending human art review. Integrate after, or together with, `feat/art-direction`.
- Base commit: `55f9473e5b8ac63c9b9e441e5835432a914d717b` (`feat/art-direction`).
- Last verified commit: see Git log for the P1 commit; checks below were run on its exact working tree.
- Remote availability: `origin/feat/odaiba-district` once pushed.

## Session Git state

- Starting branch/HEAD: `feat/art-direction` `55f9473`, 0/0 with its upstream; 7 ahead / 3 behind `origin/main`.
- Last fetched `origin/main`: `0027eb1516e934754f05fb831d2a3b09bb39a69c` (2026-09-30).
- Local changes at start: untracked `.claude/launch.json` (preserved, not committed).
- Upstream integration: NOT INTEGRATED (the three `main` commits are survey auto-test work, no overlap).

## Goal

Shrink the rendered city to a compact hero district around the distinctive landmarks, so fewer unimportant models are drawn and art effort concentrates on one area. User decisions (2026-09-30): delete Telecom Center from the scene; option 2b — outside the district keep only ground/roads fading into haze (no island cut); district 720 × 680 m. Landmarks are not moved: roads, guideway, sites, routes and tests use surveyed metres.

## Plan

- **P1 (done): runtime crop.** `DISTRICT` x −460..260, z −360..320 in `src/layout.ts`. Landmarks outside skipped (only Telecom Center); `cropToDistrict` (`src/contextFacades.ts`) removes whole connected pieces of `CTX_*`, `PUBLIC_*`, `STREETLIGHT_*`, `LANDSCAPE_TREE*`, `STATIONS` outside; tree canopies only inside; non-water environment materials fade to fog colour over 300 m beyond the edge; orbit target clamped to the district, max distance 1400 → 1000 m. Telecom GLB and its `odaiba-layout.json` record are kept (test hashes; not bundled any more).
- **P2 (done): Blender crop of the environment.** See the P2 section below. Supersedes P1's runtime `cropToDistrict` (removed) and fog-colour haze (replaced by a hashed-alpha dissolve).
- **P3: focus polish and draw calls.** Tier 1: Fuji civic core, Aqua City, DECKS, north waterfront. Tier 2: Hilton, Nikko, DiverCity. Merge each landmark GLB's meshes by material (30–50 meshes each today) — likely the largest draw-call win.

## Actual validation (P1)

- Verification status: PASSED (local).
- `npm test`: PASS, including new district assertions in `tests/odaiba.test.ts` (only Telecom outside; all four sites inside; southern context blocks removed; no kept detail vertex more than 60 m beyond the edge; ground/roads kept; every planted tree inside).
- `npm run build`: PASS (existing >500 kB chunk warning); Telecom GLB no longer in `dist/assets`. `git diff --check`: clean.
- Browser (built-in pane, 800×600, existing dev server, hero pose, `?reviewTime=12`): before 1,310 WebGL draw calls / 1.89 M triangles per frame (all passes incl. shadow and GTAO); after 1,195 / 1.58 M (−9 % calls, −16 % triangles). Day and `hour=21` night render without console errors; far ground fades to haze. A synthetic shift-drag pan stopped at the district's south edge. FPS was not measured on exhibition hardware.
- Not verified: survey `?survey` live mode after the crop (sites and routes unchanged and covered by tests), human art review of the hazed backdrop — against the deep-blue sea the pale ground reads as a ghost plate; P2 should decide its final edge.

## P2 — Blender district environment (2026-09-30)

User review of P1 (top view) flagged: straight cut lines at the plate corners, the guideway/roads fading abruptly, and the fog-coloured ground reading as a pale "ghost plate" against the blue sea.

- Source/derivation: `scripts/crop-odaiba-district.py`, run as `/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python scripts/crop-odaiba-district.py`. Input `asset/models/odaiba-masterplan/odaiba_masterplan_v01_phase03d_environment.glb` is read only (its `.blend` and hashes are untouched, so `odaiba-layout.json` needs no re-extraction). Output `odaiba_district_v01_environment.glb` beside it. The script is the editable source for this derived GLB; no new `.blend` was created.
- Blender 5.2.2 LTS (Mac, headless CLI; Blender MCP not used), Khronos glTF Blender I/O v5.2.40. Import → apply transforms → per mesh: detail (`CTX_`, `PUBLIC_`, `STREETLIGHT_`, `LANDSCAPE_TREE`, `STATIONS`) deletes position-welded connected pieces whose bounds centre is outside `DISTRICT`; plate meshes are bisected (`clear_outer`) by 4 sides + 6 tangent facets per corner of the district grown by `APRON`; `WATER_*` kept whole; `ROADSIDE_TREE_INSTANCES` dropped. Export GLB, selection only, apply modifiers, no animation/cameras/lights, +Y up.
- Apron 150 m (not 250): the terrain's own west plate edge is at x −610 = district −460 − 150; with 250 m that straight edge sat inside the apron and stayed visible.
- Metrics: 37 → 30 meshes, 13 → 11 materials, 48,178 → 11,343 triangles, 2,635,512 → 612,112 bytes. No textures.
- Runtime: `environmentUrl` points at the district GLB; `fadeBeyondDistrict` sets `alphaHash` and multiplies alpha by `1 − smoothstep(0, 0.9·apron, distance beyond district)` on every non-water environment material. Hashed alpha stays in the opaque pass (no sorting); its dither is visible as grain in the last ~100 m, and faded pieces still cast shadows (flat ground, negligible).
- `tests/odaiba.test.ts` now loads the district GLB and asserts every non-water vertex lies within the apron (+3 m facet overhang), detail within 60 m of the edge, southern context and roadside blockout absent, ground/roads/sea present; all previous site, walker, pod, boat, bridge and deck checks run against it.

### Actual validation (P2)

- `npm test`: PASS. `npm run build`: PASS (district GLB 612 kB in `dist/assets`; Phase 03D environment and Telecom no longer bundled). `git diff --check`: clean.
- Browser (built-in pane, 800×600): hero pose, day and `hour=21`, no console errors. Top view (orbit + max zoom-out): no straight plate edges, no ghost plate; the district reads as a round-cornered island dissolving into the sea. Measurement at hero pose `?reviewTime=12&hour=21`: 1,185 draw calls / 1.47 M triangles per frame (P0 baseline 1,310 / 1.89 M, P1 1,195 / 1.58 M). A day re-measurement was not possible because the pane was hidden (rAF paused).
- Not verified: live `?survey` mode, human art review of the dithered edge, exhibition-hardware FPS.

## P3a — landmark draw-call merge (2026-09-30)

- `odaibaScene`: after the glazing/roof material retrofit, each of the six retained landmarks is baked with the existing `bake()` (`src/cityRig.ts`) into one mesh per material, the source geometries are disposed, and merged meshes carry the landmark id. No GLB binaries changed.
- `bake()` shared fix: merges only attributes present in every piece of a material. DiverCity Plaza's `Parking_Concrete` mixes primitives with and without `TEXCOORD_0`, which would make `mergeGeometries` fail. All existing site-builder callers still pass.
- Test: each landmark merges to exactly one mesh per material, keeps every triangle and keeps its precise placed bounds within 1 cm.

### Actual validation (P3a)

- `npm test`: PASS. `npm run build`: PASS. `git diff --check`: clean.
- Browser (built-in pane, 800×600, hero pose `?reviewTime=12`): 509 WebGL draw calls / 1.47 M triangles per frame (P2 1,185; P0 baseline 1,310 / 1.89 M). Day and `hour=21` screenshots show no visible change from P2; night glazing still glows; no console errors.
- Not verified: exhibition-hardware FPS, live `?survey` mode.

## P3b — tier-1 Dream Loop, three passes (2026-10-01)

User direction (2026-09-30): merge `feat/art-direction` into main (done: `e3185b3`, pushed with record `3a36797`), then Dream Loop option 1 — tier-1 polish (Fuji core, Aqua City, DECKS, north waterfront) following CITY_MASTER_TASTE and R01. `origin/main` merged into this branch first.

- Workflow: Dream Loop Plus. Target: the existing locked `.dream-loop/target.png` from the earlier Odaiba Dream Loop (same hero pose, generated from R01; no image-generation tool in this session, so no new target). Workers: fresh Opus subagents (Fable was unavailable: usage credits), one per pass, implementing only; the orchestrator ran checks and captures.
- Capture: headless Chrome 1920×929 against the local dev server, `?hour=16&reviewTime=20` (`.dream-loop/shot.sh`, ignored). Evidence: [baseline](../../artifacts/odaiba-district-baseline.jpg), [pass 3](../../artifacts/odaiba-district-pass3.jpg), [pass 3 night](../../artifacts/odaiba-district-pass3-night.jpg).
- Pass 1: apron fade tinted toward sea colour; faint daytime landmark window glow; glass regex no longer catches Hilton/Nikko frames and mullions; warm horizon glow spans higher sun.
- Pass 2: hashed-alpha dissolve replaced by an irregular discarded coastline across the apron with a pale rim; warmer paving and DiverCity cladding; late-afternoon sun/ambient grade; groves every 17 m.
- Pass 3: `tidalEdge()` stepped tidal shore with pavilions and islets (baked to five meshes, included in the Odaiba test city); `curtainWall` facade shader on Aqua City/DECKS; stronger golden hour and warm sky tint; warm-ivory shared `trim`/`cream`.
- Decision needed: pass 2 turns the district edge into a visible island coastline. The user chose option 2b (fade, not an island cut) on 2026-09-30; keep or revert is the user's call.

### Actual validation (P3b)

- After each pass: root `npm test` PASS, `npm run build` PASS, `git diff --check` clean; pass screenshots inspected, no loading or orientation bugs found, no orchestrator fixes needed.
- Built-in pane, 800×600, `?hour=16&reviewTime=20`: 529 draw calls / 1.84 M triangles per frame (P3a 509 / 1.47 M at `reviewTime=12`); the increase is the denser groves and tidal edge. No console errors. Night (`hour=21`) capture renders lit facades and shore.
- Not verified: live `?survey` mode, exhibition-hardware FPS, human art acceptance. Target similarity is a visual judgment, not a measured completion claim.

## P4 — connected Odaiba backdrop and bay context (2026-10-01)

User review of P3b: the far edge must keep Odaiba's surroundings — Odaiba is linked by bridges to other districts, not an island in open sea. User accepted the Rainbow Bridge sitting behind the hero camera and block silhouettes for far shores.

- `scripts/crop-odaiba-district.py`: no more apron bisect; only street detail (`PUBLIC_`, `STREETLIGHT_`, `LANDSCAPE_TREE`, `STATIONS`) outside the district is removed and the roadside blockout dropped. Ground, roads, guideway, `CTX_*` massing and sea stay whole. Blender 5.2.2 headless; 36 meshes, 13 materials, 25,510 triangles, 1,437,924 bytes.
- Runtime: the island coastline/discard edge is replaced by `recedeBeyondDistrict` (desaturate + fog mix, 60 % over 400 m); context facade panels only inside the district; backdrop context finishes darkened.
- `src/bayContext.ts` + `layout.ts` `bayShores`, `rainbowBridge`, `gateBridge`, `ariakeLink`: positions from latitude/longitude relative to the Fuji TV control point (Fuji TV 35.62715 N 139.77485 E, Rainbow Bridge centre 35.63639 N 139.76361 E from Wikipedia; other shores approximate). Four baked/instanced draws, 16,144 triangles, no shadows, 82 % recede.
- Route change: the ferry lane previously ran along the new bridge axis into the Daiba anchorage; it now heads west (`(-760,-560)` → `(-1250,-520)`).
- Tests: street detail within 60 m of the district, backdrop ground/roads/massing extend past it, facade panels inside, bay context ≤ 4 children, boats never under or on bay context, air routes ≥ 20 m above it.

### Actual validation (P4)

- Root `npm test` PASS, `npm run build` PASS, `tsc --noEmit` clean, `git diff --check` clean.
- Headless Chrome 1920×929 `?hour=16&reviewTime=20`: [day](../../artifacts/odaiba-district-bay-hero3.jpg), [night](../../artifacts/odaiba-district-bay-night.jpg). Built-in pane orbit toward the north showed the Shibaura skyline and the Rainbow Bridge towers, cables and deck; no console errors.
- Not measured: whole-frame draw calls (pane hidden, rAF paused); by construction +4 draws over P3b. Not verified: live `?survey`, exhibition FPS, human art review. Night backdrop has no lights.

## Next step

User review of the connected backdrop. Possible follow-ups: night lights on far shores, more Odaiba-specific backdrop landmarks (Big Sight, Telecom silhouette), further Dream Loop passes.

## Main integration — 2026-10-01

User instructed merging `feat/odaiba-district` and `feat/art-direction` into main and deleting both branches. `feat/art-direction` was already contained in main (`e3185b3`). `feat/odaiba-district` `deb634e` (feature CI PASSED) merged with `--no-ff` as `f2826cc` on `origin/main` `3a36797`, no conflicts. Integrated checks: root `npm test`, `npm run build` PASS; `survey` `npm test` PASS; `git diff --check origin/main..HEAD` clean. module-swap unchanged, not rerun. Both branches deleted locally and on origin after the push; their history remains in main.
