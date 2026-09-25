# art-direction — Art rules and a polished pilot area for the root Shibuya scene

- Owner: cc100053
- Status: IN_PROGRESS — pilot, building rollout, sites/ground, lighting/day cycle and polish pass 3 implemented; waiting for user art review of the combined scene, then merge to main
- Branch: feat/art-direction
- Base commit: 5894f872be1e35d759178786bfe2a2949b190b17
- Last verified commit: the polish pass 3 commit on `feat/art-direction` (parent `adfa33d`), checked 2026-09-25
- Remote availability: origin/feat/art-direction (all work pushed); origin/feat/art-lighting (merged branch, kept for history)
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: feat/art-direction adfa33d903581c968a64784385daa274750d7701 (polish pass 3 session, 2026-09-25; clean and in sync with origin/feat/art-direction after `git fetch --prune origin`)
- Last fetched origin/main commit: 5894f872be1e35d759178786bfe2a2949b190b17 (2026-09-25; main has not moved since the task base, so the merge will be conflict-free on main's side)
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED — waiting for art review
- Pending Git conflicts or synchronization blockers: NONE. The `../city2127-lighting` worktree has been removed.

## Goal and acceptance criteria

User decision 2026-09-24: polish the city model before extending it, so later areas, change sites and questions follow one art taste. Keep the Plan 02 direction ([Pic 2](../../asset/pic2.png)) with noticeably more expensive art; stay procedural (Three.js) for now.

Done when:

1. **Art rules** are written down (one new `docs/ART.md`, linked from PROJECT/PLAN02) and cover: palette and material roles; silhouette and massing language (Pic 2 uses curved/ringed forms, terraces and slender cores, not only boxes); detail density per distance (hero / mid / distant); integrated greenery; glass and light; signage and ambient data; people and vehicles; and **how a survey change reads** (a consistent visual marker for guest-made changes).
2. **A pilot area** is polished to that standard at the hero pose: the crossing and Hachiko plaza, one landmark (MAGNET / AIR COMMONS or QFRONT) and one survey change site (the SW commons plaza). The rest of the scene stays as is and must not look broken beside it.
3. **Evidence**: before/after screenshots at the untouched hero pose, 1280×720, preset and `?survey` modes; FPS / draw calls / geometries measured in real desktop Chrome with GPU at 1280×720 and 1920×1080 (headless SwiftShader numbers do not count).
4. **User art review** approves the pilot before the rules are rolled out to the other landmarks, sites and new areas.

## In-scope files and dependencies

`src/cityRig.ts` (materials, factories), `src/surveySites.ts`, `src/main.ts` (lighting, environment, post-processing), possibly new procedural factories in `src/`; `docs/ART.md` (new), PROJECT / PLAN02 / VALIDATION. Three.js addons only (e.g. `LatheGeometry`, `ExtrudeGeometry`, `MeshPhysicalMaterial`, GTAO/SAO passes, `RoomEnvironment`/PMREM); no new dependencies, no external asset packs. Excluded: new areas, new questions, survey server changes, Blender assets (later option), camera pose changes without comparison screenshots first.

## Completed work

In commit order on `feat/art-direction`:

1. `81e1dfa`: task opened. This handoff plus the dated decision note in [PLAN02.md](../PLAN02.md).
2. `2122d13`, pilot (2026-09-24):
   - [ART.md](../ART.md) rules: palette and material roles, massing, detail by distance, greenery, glass and light, signage and ambient data, actors, and how a survey change reads.
   - `cityRig.ts` gained the `glass`/`leaf`/`stone` materials and the `arc()`, `shrubs()` and `bake()` helpers.
   - QFRONT: curved media drum, silvered glass, planted terraces.
   - Hachiko plaza: now round, with planter rings, a mint ring and a curved bench.
   - SW commons: now a ringed plaza.
   - Saffron guest outline on all four sites. It pulses for 10 s after a live change, but not on snapshot restore.
   - Site parts and park trees are baked per material. The survey scene went from 946 to 462 draw calls.
   - 4× MSAA composer target and GTAO.
3. `b549785`, building rollout ("ok, polish building"):
   - All glazing uses `glass`.
   - MAGNET: planted collar terraces and a curved glass corner drum.
   - Shops: planted slabs and ringed roof gardens.
   - Commons floor: planters. SE tower: planted slabs.
4. `eb704ef`, building pass 2 (the user said "only the front has windows" and "all buildings look identical"):
   - `faces()`, `bands()` and `windows()` glaze all four faces. `windows()` had also sized the east face with the front width.
   - MAGNET's ribbons moved outside the side frames that hid them.
   - Shops split into `slender` (Center-gai), `terrace` (Dogenzaka) and `hall` (Station). Wing tones vary.
   - Test roof allowances were raised for the new crowns and vault.
5. `374d84a`, lighting pass, and `e016911`, "expensive" lighting pass, both on `feat/art-lighting` in a second worktree:
   - Neutral tone mapping, a lower warm sun and a cool fill.
   - VSM soft shadows, broader GTAO, gentle bloom and a vignette.
6. `7d879dc`, step 4, sites and ground:
   - NE park: ringed, with a pool.
   - NW hub: round drone pad and a cylindrical shaft.
   - Stone-slab and asphalt maps on the ground and roads.
   - Mint kerb strips at every crossing waiting edge.
7. `7218a2a`, day/night cycle (user, 2026-09-25): `src/dayCycle.ts` replaces the three buttons and the `0/1/2` keys. One day lasts 180 s; dawn is Still, day is Daylight, night is Pulse. It adds a moonlit night with lit windows and `?hour=` for captures.
8. `6e74eec`: merge of `feat/art-lighting`. The only conflicts were in docs.
9. Polish pass 3 (user: "continue the polish", 2026-09-25), see [ART.md](../ART.md#polish-pass-3-2026-09-25):
   - Upper wings end in a curved glass bay with trim floor discs.
   - The SE tall variant is a round terraced tower.
   - The AIR / 02 terminals are civic data totems.
   - The distant skyline has ringed and stepped silhouettes.
10. Actor pass (user: "做埋人&車", 2026-09-25): capsule people with per-person clothes/skin/hair colours, pods with canopy, wheels and mint side line ([ART.md](../ART.md#actor-pass-2026-09-25)).

Unchanged throughout: site positions, footprints and rise/sink behaviour, the hero camera pose, landmark positions, the survey server and module-swap.

## Actual validation results

- Verification status: PASS for code checks and real-GPU performance on the M6 Mac. **User art review of the combined scene is pending.**
- Date and checked commit/worktree: 2026-09-25, polish pass 3 working tree on `adfa33d` (committed right after the checks)
- Commands/manual checks and results:
  - `npm test`: 9 PASS lines.
  - `npm run build`: PASS, with the existing chunk-size warning.
  - `survey/` and `module-swap/` are unchanged, so their checks were not rerun.
  - Headed Chrome, real GPU: 60 FPS at 1280×720 and 1920×1080, at 12:00 and 22:00, with and without `?survey` (five guests, all four sites up). See [VALIDATION](../VALIDATION.md#art-direction-status-and-real-gpu-recheck--2026-09-25).
  - Pass 3: `npm test` 9 PASS, `npm run build` PASS, `git diff --check` clean; headed Chrome on the M6 still 60 FPS at both sizes (city 344, survey 493 draw calls). See [VALIDATION](../VALIDATION.md#art-direction-polish-pass-3--2026-09-25).
- Evidence/environment:
  - Headed Google Chrome 154 via `playwright-cli -s=gpu open --browser=chrome --headed`, ANGLE Metal on an Apple M6, pixel ratio 1. No other browser session was running.
  - Screenshots in `artifacts/`: `art-before-*`, `art-pilot-*`, `art-buildings-*`, `art-buildings2-*`, `light-*`, `art-step4-*`, `daycycle-*` and `art-polish-*`. All are 1280×720 headless captures; the two `art-buildings2-orbit-*` views are not on the hero pose.
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: none (docs were updated in the same commit)

## Known issues and blockers

- The exhibition PC's GPU is not specified. Real-GPU numbers come from one Apple M6 Mac with a 60 Hz display, so they show headroom only up to vsync. If a weaker PC drops frames, cut in this order: VSM blur samples, then the GTAO radius/samples, then GTAO entirely (it roughly doubles draw calls).
- The Claude-in-Chrome extension tab stayed `hidden` (no frames), even with Chrome in front, so it cannot measure FPS on this machine. Use headed Playwright Chrome, and close every other browser session first: a background SwiftShader session cut 1080p to about 38 FPS on 2026-09-24.
- Hachiko plaza is mostly hidden by the koban and station at the hero pose. Moving it would change the landmark relationship, so this is a user decision.
- Pass 2 and pass 3 changed the number of `kit.random()` calls, which reshuffled the seeded distant skyline ring (still 60 blocks).
- Existing Vite chunk-size warning; not caused by this task.

## Important decisions

- Direction: Plan 02 / Pic 2, higher art quality; procedural first (user, 2026-09-24).
- Order: rules → pilot area → user review → roll out → then new areas and questions.
- The survey change sites (steps 1–3, `?survey`) keep their positions and behaviour; only their look is restyled.
- The user approved the pilot by moving on ("ok, polish building", 2026-09-24) and asked for further polish (2026-09-24 and 25).
- Saffron is reserved for guest-made changes ([ART.md §8](../ART.md#8-how-a-survey-change-reads)).
- The day/night cycle replaces the preset buttons (user, 2026-09-25). WorldState presets remain, as the cycle's keyframes and as the survey target.

## Remaining work

Close this task (in order):

1. **User art review of the combined scene** at the hero pose, day and night: `art-polish-*` (latest), `art-step4-*`, `daycycle-*` and `light-expensive-*`. The saffron outline was checked at 22:00 in `art-polish-survey-2200` and still reads beside lit windows; the user has not reviewed it.
2. **Merge `feat/art-direction` into `main`** following [CONTRIBUTING](../CONTRIBUTING.md). After the merge, rerun `npm test` and `npm run build`, run a headless smoke check, and record the integrated commit here and in VALIDATION.

Art polish not yet done (to take up after the review, or as a follow-up task):

- Drones and cargo pods are unchanged by the actor pass; only pedestrians and road pods were restyled.
- Actor pass real-GPU FPS not measured (headless only).
- Public decks, lift terminals, air-corridor rails and pylons, and the membrane fin clusters are unchanged since Plan 02.
- SE tower base (the medium variant) is still a square block with planted slabs; only the tall variant is round.
- The totem data is static text; it does not follow WorldState or the clock.
- Hachiko plaza visibility: waiting for the user's decision (see Known issues).

Outside this task (the PLAN02 order, after art):

- New areas and city objects, and more survey questions.
- Exhibition operations: question content, reset and recovery policy, input hardware, and a performance check on the exhibition PC.

## Next expected step

cc100053: art review of the combined scene (Remaining work 1). The agent then merges to main (Remaining work 2), or takes the next art item the user picks.
