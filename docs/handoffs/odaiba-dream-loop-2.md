# Odaiba Dream Loop r2 — 2026-10-01

- Owner: cc100053 (Claude Code session). Sequential Opus worker subagents implemented each pass; the orchestrator ran checks, captures and bug fixes.
- Branch: `feat/odaiba-dream-loop-2`, from `main` `6301794` (0/0 with `origin/main` after a successful fetch; clean tree).
- Scope: user asked to "create branch and use dream-loop to polish city". Dream Loop Plus, three passes, then stop for human review. Target: the existing locked `.dream-loop/target.png` (see [earlier Dream Loop](odaiba-dream-loop.md)); no new target generated. Fable was unavailable (usage credits), so workers ran on Opus.
- Capture: headless Chrome 1920×929, `?hour=16&reviewTime=20` (`.dream-loop/shot.sh`, ignored).
- Status: three passes implemented and locally verified; target NOT reached; human art review pending. No main integration.

## Passes

- Pass 1 (`742df07`): far bay beyond the 1.6 km plate curves down in the vertex shader (`curveBeyondPlate`, `EARTH` in `src/bayContext.ts`) so the sea ends at a horizon with sky above; Ariake shore and viaduct removed so Odaiba reads as a peninsula in open water; deeper sea; display-space colour grade; curtain-wall facades on context massing; unshadowed backdrop grove.
- Pass 2 (`9e6cbb9`): north-east backdrop ground past `seaward` becomes open bay, with the tidal edge following the cut; Central breakwater reduced to a far-rim skyline; cumulus band just above the horizon; softened sky reflections; sun path further south; denser groves with occasional cherry crowns.
- Pass 3: sky sun bloom/halo, bluer zenith, lighter sea; shader-only reflecting ponds, stone rims and gravel walks in the district lawns (kept 14 m off survey sites; trees skip ponds); glass curtain-wall panes.

## Orchestrator fixes

- Pass 2: far Central-breakwater skyline (h 30–170) covered the top-right clock overlay → h 12–60. GTAO's override-material prepass ignored the curvature, so flat copies of the far bay "ghosted" above the horizon (present since pass 1) → the sea plane and `bay-context` are hidden during that prepass (`src/main.ts`).
- Pass 3: pond shader emitted `w.y--300.0` for negative site coordinates, a GLSL compile error that made all lawns vanish → literals parenthesised. Intro copy lost contrast over the new sea → soft pale day halo; moon glint washed out the night footer → dark night halo (`src/style.css`). Copy unchanged.

## Actual validation

- After every pass (and after each fix): root `npm test` PASS (includes Odaiba actual-mesh route/site/bridge checks and the 81-combination survey pipeline), `npm run build` PASS (existing >500 kB warning), `git diff --check` clean.
- Browser: built-in pane, no console errors after fixes (day 16:00, night 21:00). Earlier `Framebuffer incomplete: zero size` warnings came from the hidden pane, not the scene. One headless capture hung while tests/build ran concurrently; retried alone it completed in 4 s.
- Evidence: [baseline](../../artifacts/odaiba-dream2-baseline.jpg), [pass 1](../../artifacts/odaiba-dream2-pass1.jpg), [pass 2](../../artifacts/odaiba-dream2-pass2.jpg), [pass 3](../../artifacts/odaiba-dream2-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream2-pass3-night.jpg).
- Not verified: live `?survey` mode with a scratch server (sites/routes untouched and ponds exclude site footprints; covered only by the test pipeline), FPS/draw calls, exhibition hardware. `survey/` and `module-swap/` unchanged, not rerun.

## Decisions for the user

- Pass 1 removed the Ariake shore/viaduct and pass 2 cut back the north-east backdrop to open water. This reverses part of `deb634e` ("keep a connected Odaiba backdrop with bay bridges and shores"). Keep or revert is the user's call.
- Remaining gaps vs target: district density (many small buildings, layered promenade), dense far Tokyo skyline, boat wakes, lit glass towers; sun glint sits bottom-right rather than toward the horizon (real 16:00 sun azimuth).
- Next step: user reviews the pass images; then either run another three-pass group or merge.

## Target v2 — future identity (2026-10-01)

User review: model detail improved but the 2127 future identity does not read; the v1 target itself is a contemporary waterfront. Decision: fix future identity first, then loop. The user supplied a new target (1804×872, same hero pose and UI), derived from pass 3 plus R01 DNA: district-wide megaframe links at height, suspended glass spheres, ring/looped guideways with light trails, circular floating terraces with small waterfalls stepping into the bay, water taxis, cherry groves and ponds.

- Locked: `.dream-loop/target.png` (ignored); committed copy [target v2](../../artifacts/odaiba-dream2-target-v2.jpg). The previous target is kept as `.dream-loop/target-v1.png`.
- Next session: resume on `feat/odaiba-dream-loop-2`, run Dream Loop Plus (three passes) against target v2 with `.dream-loop/r2-pass3.png` as the starting screenshot. The Ariake/backdrop decision above is still open.
