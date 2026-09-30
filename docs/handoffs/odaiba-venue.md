# odaiba-venue — Odaiba replaces Shibuya as the exhibition city

- Owner: cc100053 (runtime work by Claude Code sessions)
- Status: IN_PROGRESS
- Branch: codex/odaiba-venue
- Base commit: 4bc16463a34879083d64debb4587a0d036297d4d
- Last verified commit: this branch's P0 commit (assets import + plan); verified as the uncommitted delta on the base
- Remote availability: origin/codex/odaiba-venue
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: clean `main` at `4bc16463a34879083d64debb4587a0d036297d4d`.
- Last fetched origin/main commit: `4bc16463a34879083d64debb4587a0d036297d4d`, fetched 2026-09-30.
- Local changes present at session start: NONE.
- Upstream integration status: NOT INTEGRATED.
- Pending Git conflicts or synchronization blockers: NONE. `origin/codex/odaiba-preview` (base `5577195`) was not merged; files were checked out path-wise.

## Goal and acceptance criteria

Execute [ODAIBA_PLAN.md](../ODAIBA_PLAN.md) P0–P6: the root exhibition scene becomes the Fuji TV / Daiba waterfront in 2127 with the same four-question v2 contract, four change sites, lifecycle and day/night.

## In-scope files and dependencies

P0: Odaiba GLB/blend pairs and masterplan outputs under `asset/models/`, `src/odaibaPlacement.ts`, `src/odaiba-layout.json`, `scripts/read-odaiba-layout.py`, `tests/odaiba.test.ts`, asset handoff + evidence PNGs (unchanged copies from `3a8a5f2`), `package.json` test script, `.gitignore` Blender autosave rules, plan, AGENTS decision line. Later phases: see the plan's replacement table. Binary assets are owned by the Odaiba asset owner; coordinate before editing any `.blend`/`.glb`.

## Completed work

- P0: path-wise import of 8 building pairs + Phase 03D masterplan; placement test added to root `npm test`; plan approved with the user's decisions (replace Shibuya, recommended sites, waterfront question rewrite, no sea-level-rise emphasis, provisional ownership).
- P1: root scene is Odaiba (`src/odaibaScene.ts`, trimmed `src/cityRig.ts`, `heroCamera`, `main.ts` scale/fog/shadow/sea). Shibuya hero-visibility test block removed.
- P2: four sites on Odaiba open ground with per-site scale; place names デックス西 / お台場海浜公園 / アクアシティ南 / フジテレビ東; Odaiba ground + hero-visibility test; lot-bound tests in site-local units; Shibuya site clearance tests removed.
- P3: Odaiba-only `layout.ts` routes; rewritten `mobility.ts` (trains, walkers, water taxis/ferry, air taxis, sphere berth) wired back through `cityRig`; new pure and raycast actor tests.

## Actual validation results

- Verification status: PASSED (P0 scope)
- Date and checked commit/worktree: 2026-09-30, base `4bc1646` + P0 delta.
- Commands/manual checks and results: root `npm test` passed including the Odaiba bounds/hash test; `npm run build` passed (existing chunk-size warning); `git diff --check` clean. `survey/` and `module-swap/` unchanged.
- P1 (2026-09-30): root `npm test`/`npm run build` passed, `git diff --check` clean; exhibition machine 60.0 FPS, 1,243–1,245 draw calls at 12:00/18:30/22:00, no console errors; captures `artifacts/odaiba-p1-{1200,1830,2200}.png`.
- P2 (2026-09-30): root `npm test` (15 PASS lines plus Odaiba site checks) and `npm run build` passed; scratch survey server on 8791 (scratch SQLite, not the exhibition DB): 59–60 FPS, 1,525–1,581 draw calls, no page errors; captures `artifacts/odaiba-p2-{baseline,high,low,low-2200}.png`.
- P3 (2026-09-30): root `npm test`/`npm run build` passed; exhibition machine 60.2–60.3 FPS, 1,307–1,309 draw calls, no page errors; captures `artifacts/odaiba-p3-{1200,2200,close}.png`.
- Evidence/environment: temporary spike (reverted) measured 60.0 FPS at 1920×1080, 1,223–1,311 draw calls, headed Chrome 154 / ANGLE Metal Apple M6, pixel ratio 1. See the plan's P0 result.
- Integrated commit and checks: NOT INTEGRATED.
- Changes since verification: NONE.

## Known issues and blockers

- HUD/overlay copy is still Shibuya until P5. Walkers are specks at the hero distance; road traffic not modelled.
- Grand Nikko keeps the legacy Z-up adapter (handled by `placeOdaibaModel`).
- The Phase 03D generator references original `C:\FutureCity` paths; edit the committed `.blend` directly.

## Important decisions

See the plan's "Decisions (user, 2026-09-30)". Real metres are kept; the camera and per-site scale adapt instead. Questions keep ids/effects.

## Next expected step

P4 on this branch: the 2127 layer — waterfront promenade edge, sphere berth/media globe, retrofit kit (PV skins, green roofs, sky bridges Fuji TV ↔ Aqua City ↔ DECKS), guideway light lines; then art review and FPS re-measure.
