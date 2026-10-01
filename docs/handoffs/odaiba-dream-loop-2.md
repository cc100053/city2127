# Odaiba Dream Loop r2 — 2026-10-01

- Owner: cc100053 (Claude Code session). Sequential Opus worker subagents implemented each pass; the orchestrator ran checks, captures and bug fixes.
- Branch: `feat/odaiba-dream-loop-2`, from `main` `6301794` (0/0 with `origin/main` after a successful fetch; clean tree).
- Scope: user asked to "create branch and use dream-loop to polish city". Dream Loop Plus, three passes, then stop for human review. Target: the existing locked `.dream-loop/target.png` (see [earlier Dream Loop](odaiba-dream-loop.md)); no new target generated. Fable was unavailable (usage credits), so workers ran on Opus.
- Capture: headless Chrome 1920×929, `?hour=16&reviewTime=20` (`.dream-loop/shot.sh`, ignored).
- Status: round 2 (three passes, target v1) and rounds 3–5 (three passes each, target v2) implemented and locally verified; target NOT reached; human art review pending. No main integration.

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
- Evidence: [baseline](../../artifacts/odaiba-dream2-baseline.jpg), [pass 1](../../artifacts/odaiba-dream2-pass1.jpg), [pass 2](../../artifacts/odaiba-dream2-pass2.jpg), [pass 3](../../artifacts/odaiba-dream2-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream2-pass3-night.jpg), [Ariake restored](../../artifacts/odaiba-dream2-ariake.jpg).
- Not verified: live `?survey` mode with a scratch server (sites/routes untouched and ponds exclude site footprints; covered only by the test pipeline), FPS/draw calls, exhibition hardware. `survey/` and `module-swap/` unchanged, not rerun.

## Decisions for the user

- Pass 1 removed the Ariake shore/viaduct and pass 2 cut back the north-east backdrop to open water. This reverses part of `deb634e` ("keep a connected Odaiba backdrop with bay bridges and shores"). Keep or revert is the user's call. **Resolved 2026-10-01:** user chose to restore Ariake; the Ariake shore, `ariakeLink` and its viaduct are back (pass 2's north-east `seaward` cut is unchanged).
- Remaining gaps vs target: district density (many small buildings, layered promenade), dense far Tokyo skyline, boat wakes, lit glass towers; sun glint sits bottom-right rather than toward the horizon (real 16:00 sun azimuth).
- Next step: user reviews the pass images; then either run another three-pass group or merge.

## Target v2 — future identity (2026-10-01)

User review: model detail improved but the 2127 future identity does not read; the v1 target itself is a contemporary waterfront. Decision: fix future identity first, then loop. The user supplied a new target (1804×872, same hero pose and UI), derived from pass 3 plus R01 DNA: district-wide megaframe links at height, suspended glass spheres, ring/looped guideways with light trails, circular floating terraces with small waterfalls stepping into the bay, water taxis, cherry groves and ponds.

- Locked: `.dream-loop/target.png` (ignored); committed copy [target v2](../../artifacts/odaiba-dream2-target-v2.jpg). The previous target is kept as `.dream-loop/target-v1.png`.
- Next session: resume on `feat/odaiba-dream-loop-2`, run Dream Loop Plus (three passes) against target v2 with `.dream-loop/r2-pass3.png` as the starting screenshot. Target v2 shows open water where Ariake is; Ariake stays by user decision (2026-10-01), so workers must not remove it to match the target.

## Round 3 — target v2 (2026-10-01)

Dream Loop Plus, three Opus worker passes against target v2, starting from a fresh HEAD capture (`d3911d2`, identical in content to `r2-pass3-ariake.png`). Branch was 0/0 with its remote and `main` 0/0 with `origin/main` after a successful fetch.

- Pass 1 (`aafbb50`): new `src/skyways.ts` — skyway rings/links with blue light trails, three glass spheres, round waterfall terraces off the north shore; 7 larger water taxis with wakes.
- Pass 2 (`776a613`): Ariake slab becomes green parkland (Ariake, `ariakeLink` and viaduct kept); `bayCruisers` (9 runs); silver, larger spheres; roof groves on tall towers.
- Pass 3: bluer, stronger `trail`; larger terraces; blue tidal-edge rim; 6 more foreground cruisers.

Orchestrator fixes:
- Pass 1: transparent wakes (no normals) entered GTAO's normal/depth prepass and rendered as black fans → hidden there with the sea (`src/main.ts`).
- Pass 2: the new parkland finish made `bay-context` five draws → test cap 4 → 5 (`tests/odaiba.test.ts`). The pale day accent word "tomorrow." lost contrast over green Ariake → darkened by day (`src/style.css`; copy unchanged).
- Pass 3: `amphibiousShore.ts` imported `trail` from `skyways.ts`, pulling the Vite-only JSON import into Node tests (`ERR_IMPORT_ATTRIBUTE_MISSING`) → `trail` moved to `cityRig.ts` with the other shared materials.

Validation: after each pass and fix, root `npm test` PASS (incl. 81-combination survey pipeline), `npm run build` PASS (existing >500 kB warning), `git diff --check` clean; built-in browser 16:00 no console errors. Evidence: [baseline](../../artifacts/odaiba-dream3-baseline.jpg), [pass 1](../../artifacts/odaiba-dream3-pass1.jpg), [pass 2](../../artifacts/odaiba-dream3-pass2.jpg), [pass 3](../../artifacts/odaiba-dream3-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream3-pass3-night.jpg). Not verified: live `?survey` with a scratch server, FPS/draw calls (skyways, 30 boats + wakes, tower roof raycast load time), exhibition hardware. No test covers skyway/terrace/cruiser collisions (placed by hand).

Remaining gaps vs target v2: long front-left skyway and right-side monorail sweep, district density and layered promenade, spheres read as blue domes rather than clear glass, dense far skyline, sun glint position.

Next step: user reviews the round 3 images; then another three-pass round or merge.

## Round 4 — target v2 (2026-10-01)

User asked to run another round. Start: `r3-pass3.png` (`699d85c`); branch 0/0 with its remote, `main` 0/0 with `origin/main` after fetch.

- Pass 1 (`e4ce8ea`): silver spheres (narrow lit walk instead of the dome-hiding deck), Fuji sphere in `chrome`, front-left skyway, right-side `sweepway` with a white 4-car shuttle, white Yurikamome pods, four more cruisers.
- Pass 2 (`8e1afe3`): terraces raised to 2.8 m with three wide waterfalls; white yacht hulls (bow orientation checked against wakes); thicker trails; amber-lit context glazing.
- Pass 3: Ariake parkland gets eight lagoons (slab, buildings, `ariakeLink` and viaduct kept); larger sky-blue facade panels with lit runs; warmer landmark glazing by day.

Orchestrator fix: pass 3's lagoons put open water behind the intro question line, which became unreadable by day → denser pale halo (`src/style.css`; copy unchanged). No other bugs found in captures.

Validation: after each pass and fix, root `npm test` PASS (incl. 81-combination survey pipeline), `npm run build` PASS (existing >500 kB warning), `git diff --check` clean; built-in browser 16:00 no console errors. Evidence: [pass 1](../../artifacts/odaiba-dream4-pass1.jpg), [pass 2](../../artifacts/odaiba-dream4-pass2.jpg), [pass 3](../../artifacts/odaiba-dream4-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream4-pass3-night.jpg). Not verified: live `?survey`, FPS/draw calls, exhibition hardware; no test covers hand-placed skyway/sweep/cruiser collisions.

Decision for the user: the Ariake lagoons move Ariake toward the target's open water while keeping the shore — confirm this fits the 2026-10-01 "keep Ariake" decision, or revert that part of pass 3 (`src/bayContext.ts`).

Remaining gaps vs target v2: district density and layered promenade, spheres still read partly as domes, dense far skyline, sun glint position, sweep pods barely visible at hero distance.

Next step: user review; another round or merge.

## Round 5 — target v2 (2026-10-01)

User asked to run another round without answering the Ariake-lagoon question, so the lagoons stay and workers were told not to change Ariake further. Start: `r4-pass3.png` (`0db607f`); branch 0/0 with its remote, `main` 0/0 with `origin/main` after fetch.

- Pass 1 (`77daacb`): near-mirror `chrome`; sphere decks become open rings; blue light lines along both seaside promenades; thicker Yurikamome edge lines; ivory Aqua City/DECKS spandrels and context finishes; paler tower glass.
- Pass 2 (`6ae6cc0`): even blue-grey glass grid with lit eight-bay runs on context buildings; pale ceramic hotel roofs; warmer landmark glazing (.42); sweep shuttle at 1.7×; one more foreground cruiser; palms on terraces (checked upright).
- Pass 3: `mirrorSky` warm equirect for `chrome` with night dimming via `mirrors`; hairline sphere ribs; planted tower rings; 30 m Aqua City–Hilton link.

Orchestrator fixes: none needed this round.

Validation: after each pass, root `npm test` PASS (incl. 81-combination survey pipeline), `npm run build` PASS (existing >500 kB warning), `git diff --check` clean; built-in browser 16:00 console clean. Evidence: [pass 1](../../artifacts/odaiba-dream5-pass1.jpg), [pass 2](../../artifacts/odaiba-dream5-pass2.jpg), [pass 3](../../artifacts/odaiba-dream5-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream5-pass3-night.jpg). Not verified: live `?survey`, FPS/draw calls, exhibition hardware; hand-placed links/cruisers have no collision test; the Aqua City–Hilton link ends were placed from bounding boxes.

Open decision (from round 4): keep or revert the Ariake lagoons.

Remaining gaps vs target v2: spheres now read gold rather than silver-glass; district density and mid-level walkway network; dense far skyline; sun glint position.

Next step: user review; another round or merge.
