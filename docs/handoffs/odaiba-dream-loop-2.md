# Odaiba Dream Loop r2 — 2026-10-01

> 現行接續核對 — 2026-10-03：實作已整合、原分支已退休；polish仍延後，target未達及原視覺限制保留。下面各輪「resume／another round／merge」屬歷史步驟；owner指定新polish任務後，從當時核對過的main及現行視覺authority開新分支，勿復用舊分支指示。

- Owner: cc100053 (Claude Code session). Sequential Opus worker subagents implemented each pass; the orchestrator ran checks, captures and bug fixes.
- Branch: `feat/odaiba-dream-loop-2`, from `main` `6301794` (0/0 with `origin/main` after a successful fetch; clean tree).
- Scope: user asked to "create branch and use dream-loop to polish city". Dream Loop Plus, three passes, then stop for human review. Target: the existing locked `.dream-loop/target.png` (see [earlier Dream Loop](archive/odaiba-dream-loop.md)); no new target generated. Fable was unavailable (usage credits), so workers ran on Opus.
- Capture: headless Chrome 1920×929, `?hour=16&reviewTime=20` (`.dream-loop/shot.sh`, ignored).
- Status: rounds 2–9 implemented and locally verified (round 7 reverted); target NOT reached. Integrated into `main` as `53790a2` on 2026-10-01 at the user's request ("merge 落 main, 遲下再polish"); feature CI passed on `e6fe03b`. Further polish deferred.

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

## Round 6 — target v2 (2026-10-01)

User asked for another round (typed 「再口山」, read as 「再跑」). Ariake lagoons still pending review and left unchanged. Start: `r5-pass3.png` (`a1f26a6`); branch 0/0 with its remote, `main` 0/0 with `origin/main` after fetch.

- Pass 1 (`581ab7c`): spheres read silver (cool `mirrorSky`, neutral `chrome`); Fuji–Hilton 40 m link; five far-bay cruisers.
- Pass 2 (`15772bf`): curtain-wall rework (glass storeys, lit floor runs, night base glow) extended to Hilton and Grand Nikko; ivory DECKS fins; greener lawns.
- Pass 3: warm champagne glass with soft per-bay lit rooms on curtain walls and context panels; two planted mid-level `GARDEN_LINKS` decks (raycast-checked, clear of site sightlines).

Orchestrator fixes: none needed this round.

Validation: after each pass, root `npm test` PASS (incl. 81-combination survey pipeline), `npm run build` PASS (existing >500 kB warning), `git diff --check` clean; built-in browser 16:00 console clean. Evidence: [pass 1](../../artifacts/odaiba-dream6-pass1.jpg), [pass 2](../../artifacts/odaiba-dream6-pass2.jpg), [pass 3](../../artifacts/odaiba-dream6-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream6-pass3-night.jpg). Not verified: live `?survey`, FPS/draw calls, exhibition hardware; Fuji–Hilton link ends placed from bounding boxes; garden-deck end on Aqua City clears roof trees by ~1.9 m only.

Art note: pass 3's champagne glass makes towers and hotels read beige/sandstone by day; pass 2's blue-grey glass read more like glass. User call.

Open decision (from round 4): keep or revert the Ariake lagoons.

Remaining gaps vs target v2: facade tone (see art note), dense far skyline, sun glint position, more terraced greenery on building edges.

Next step: user review; another round or merge.

## Round 7 — greenery as infrastructure (2026-10-01)

User review: the greenery read as a 2020s eco-render (generic round trees everywhere, saturated lawns, trees on every roof and tower ring). Per [CITY_MASTER_TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) (planter trees and rooftop gardens are 2027 vocabulary), the user approved this direction: cut first, then hard edges, then reorganise; ivory structure and paving lead and green sits in crisp engineered containers. This supersedes round 6's "more terraced greenery on building edges" gap. Start: `r6-pass3` (`119e25a`); branch 0/0 with its remote after fetch.

- Pass 1 (`6d0e8de`): roof groves cut (context towers, Grand Nikko, DiverCity); tower rings unplanted; garden links and shore terraces thinned; sage `leaf` and crowns; district landscape becomes ivory paving with curbed sage beds on the street grid and one straight white-rimmed climate corridor (old swale ponds removed); Ariake parkland reed-toned with stepped tidal terraces in each lagoon; shore tidal edge gains a lower reed shelf.
- Pass 2 (`bb7463e`): beds become long 32×8 m curbed strips on a 40×20 m grid; Aqua City/DECKS roofs ivory with ruled sage strips (`roofBeds`), no roof trees (`plantRoofCanopy` deleted); half the surveyed trees; columnar three-crown trees; backdrop grove becomes curbed sage blocks on the grid.
- Pass 3: backdrop beds thinned and flush in white curbs; landscape outside the district desaturated toward pale sage; shore terraces lose cherry crowns.

Orchestrator fix (pass 3): desaturating the dark grass texture to its own luminance turned the backdrop ground charcoal → lifted toward a pale sage base (`src/odaibaScene.ts`).

Validation: after each pass, root `npm test` PASS (incl. 81-combination survey pipeline), `npm run build` PASS (existing >500 kB warning), `git diff --check` clean; built-in browser 16:00 console clean after pass 2. Evidence: [baseline](../../artifacts/odaiba-dream7-baseline.jpg), [pass 1](../../artifacts/odaiba-dream7-pass1.jpg), [pass 2](../../artifacts/odaiba-dream7-pass2.jpg), [pass 3](../../artifacts/odaiba-dream7-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream7-pass3-night.jpg). Not verified: live `?survey`, FPS/draw calls, exhibition hardware.

Art note: the district now reads as a regular paved grid of strips — ordered and pale, but close to a car-park/solar-field pattern; the target's beds follow structure and terraces rather than a uniform grid. Stepped shore wetland terraces and a corridor that joins the ponds are only partly done.

Remaining gaps vs target v2: beds should follow buildings/megaframe rather than a uniform grid; terraced/inclined gardens on structure; shore wetland terraces; facade tone; dense far skyline; sun glint.

Next step: user review; another round or merge.

## Round 8 — lush green, engineered form (2026-10-01)

User review of round 7: over-corrected — "純粹變到路面咁樣更加冇生氣". Decision: green volume stays at target-v2 level; future identity comes from form (clusters following structure, white rims, stepped terraces, connected water), not from cutting. Round 7's code was reverted (`6950738`, restores `119e25a` src/tests); its docs and evidence stay as history.

- Pass 1 (`a9aa39c`): `plantClusters` — two-tier oval terraces with white rims, a crown ring and a raised inner tier, placed only near pads, guideway, promenades, ponds and the corridor; roof terraces of the same kind on Aqua City/DECKS and tall roofs; one connected pond/swale `corridor` channel with near-white edges; tower rings keep a bed but no trees (`garden(…, trees)`); the tidal edge steps down through white weirs to a lower reed shelf; lawn `#b6c6a2`, `leaf` `#7f9b6d`.
- Pass 2 (`e2f4916`): `waterfront` surveyed trees become palms; ground trees stand in white planter rings (`plantCanopy(…, pits)`); cherry centres in every other cluster; backdrop grove becomes oval groves on white-rimmed plinths.
- Pass 3: denser cluster sampling (21 m, no overlaps) and fuller rim tiers; tree-lined promenades (palms seaward, broadleaf/cherry landward) in planter rings; denser backdrop groves (44 m); lawn `#c6d0ae`; ivory walks.

Orchestrator fix (pass 3): promenade trees at 7 m crowded the walker lanes (`walker lane 2.8 meets surveyed-coastal-canopy at 5,-312`) → offset 9 m and skipped within 8.5 m of any promenade/guideway (`src/coastalCanopy.ts`).

Validation: after each pass, root `npm test` PASS (incl. 81-combination survey pipeline), `npm run build` PASS (existing >500 kB warning), `git diff --check` clean; built-in browser 16:00 console clean after pass 1. Evidence: [baseline](../../artifacts/odaiba-dream8-baseline.jpg), [pass 1](../../artifacts/odaiba-dream8-pass1.jpg), [pass 2](../../artifacts/odaiba-dream8-pass2.jpg), [pass 3](../../artifacts/odaiba-dream8-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream8-pass3-night.jpg). Not verified: live `?survey`, FPS/draw calls, load time from the extra raycasts, exhibition hardware.

Known issue (pre-existing, also at `119e25a`): at 22:00 a bright blue bloom flares at the central pond/shore below DECKS in the headless capture; not investigated.

Remaining gaps vs target v2: groves still read as round-crown blobs at hero distance; inclined gardens on the megaframe; facade tone; dense far skyline; sun glint.

Next step: user review; another round or merge.

## Round 9 — continue round 8 (2026-10-01)

User approved round 8's direction ("方向ok 再跑"). Start: `r8-pass3` (`e2411d6`); branch 0/0 with its remote after fetch.

- Pass 1 (`6e4a5e4`): `leafyCrown` (`cityRig.ts`, lumpy crown with flattened underside via three's `mergeVertices`) replaces the smooth crown in groves, roof terraces, allées, civic-core and skyway planting; deeper, cooler broadleaf green; curtain-wall panes blue-grey with one-in-three whole lit bays and paler ivory bases; context panels blue-grey glass.
- Pass 2 (`b5dc511`): district clusters may stand further from structure, so groves fill most open lawn (site, pad, path, pond and corridor clearances unchanged); backdrop groves at 36 m cells; context lit runs become two-pane golden flecks on ~18% of bays.
- Pass 3: context panels narrower with ivory piers, per-storey glass tone, lighter sky-grey glass and ~10% three-pane lit runs; curtain-wall panes `vec3(.42,.45,.48)`; shore waterfall terraces carry nine trees and wider, brighter falls with larger foam rings.

Orchestrator fixes: none needed.

Validation: after each pass, root `npm test` PASS (incl. 81-combination survey pipeline), `npm run build` PASS (existing >500 kB warning), `git diff --check` clean; built-in browser 16:00 console clean after pass 1. Evidence: [pass 1](../../artifacts/odaiba-dream9-pass1.jpg), [pass 2](../../artifacts/odaiba-dream9-pass2.jpg), [pass 3](../../artifacts/odaiba-dream9-pass3.jpg), [pass 3 night](../../artifacts/odaiba-dream9-pass3-night.jpg). Not verified: live `?survey`, FPS/draw calls, load time, exhibition hardware. The pre-existing 22:00 pond bloom remains.

Art note: facades moved from round 6's champagne to blue-grey/sky-grey glass with ivory piers — user call. Groves now cover most lawns; check the balance between canopy and open ground.

Remaining gaps vs target v2: inclined gardens on the megaframe, dense far skyline, sun glint, more skyway density.

Next step: user review; another round or merge.

## Integration (2026-10-01)

Merged `feat/odaiba-dream-loop-2` (`e6fe03b`, feature CI [run 36831176021](https://github.com/cc100053/city2127/actions/runs/36831176021) passed) into `main` with `--no-ff` as `53790a2`; `origin/main` had not advanced. On the merge result: root `npm test` PASS, `npm run build` PASS, `git diff --check origin/main..HEAD` clean; `survey/` and `module-swap/` unchanged, their suites not rerun locally. Open for a later polish round: facade tone and grove/lawn balance (user art calls), megaframe inclined gardens, far skyline, sun glint, the pre-existing 22:00 pond bloom.
