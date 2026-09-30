# Odaiba hero district — 2026-09-30

- Owner: cc100053 (Claude Code session)
- Status: IN_PROGRESS — P1 implemented and locally verified; P2/P3 planned.
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
- **P2 (next): Blender crop of the environment.** Roads, sidewalks, guardrails, terrain and guideway are plate-wide merged meshes, so P1 hazes rather than removes them. Cut them in the `.blend` to the district plus a short hazed apron and re-export; then drop the hazed-ground shader if the apron edge reads cleanly. Check Blender MCP on the working machine first ([BLENDER.md](../BLENDER.md)); rerun `scripts/read-odaiba-layout.py` and update test hashes.
- **P3: focus polish and draw calls.** Tier 1: Fuji civic core, Aqua City, DECKS, north waterfront. Tier 2: Hilton, Nikko, DiverCity. Merge each landmark GLB's meshes by material (30–50 meshes each today) — likely the largest draw-call win.

## Actual validation (P1)

- Verification status: PASSED (local).
- `npm test`: PASS, including new district assertions in `tests/odaiba.test.ts` (only Telecom outside; all four sites inside; southern context blocks removed; no kept detail vertex more than 60 m beyond the edge; ground/roads kept; every planted tree inside).
- `npm run build`: PASS (existing >500 kB chunk warning); Telecom GLB no longer in `dist/assets`. `git diff --check`: clean.
- Browser (built-in pane, 800×600, existing dev server, hero pose, `?reviewTime=12`): before 1,310 WebGL draw calls / 1.89 M triangles per frame (all passes incl. shadow and GTAO); after 1,195 / 1.58 M (−9 % calls, −16 % triangles). Day and `hour=21` night render without console errors; far ground fades to haze. A synthetic shift-drag pan stopped at the district's south edge. FPS was not measured on exhibition hardware.
- Not verified: survey `?survey` live mode after the crop (sites and routes unchanged and covered by tests), human art review of the hazed backdrop — against the deep-blue sea the pale ground reads as a ghost plate; P2 should decide its final edge.
