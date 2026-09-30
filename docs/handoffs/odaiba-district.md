# Odaiba hero district — 2026-09-30

- Owner: cc100053 (Claude Code session)
- Status: IN_PROGRESS — P1 and P2 implemented and locally verified; P3 planned.
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

## Next step

P3 focus polish: merge each landmark GLB's meshes by material (30–50 meshes each) for the main draw-call win, then art passes on tier 1 (Fuji core, Aqua City, DECKS, north waterfront).
