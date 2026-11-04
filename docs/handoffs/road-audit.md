# road-audit — Road network audit and fixes

- Owner: cc100053
- Status: IN_PROGRESS (implemented and checked; owner visual acceptance and decisions on the remaining items pending)
- Branch: feat/road-audit-fixes
- Base commit: 5a56230a9b2748344624197265406bcb3de39ef0
- Last verified commit: uncommitted delta on the base (see Actual validation results)
- Remote availability: NOT PUSHED

## Session Git state

- Session starting branch and HEAD: main, 5a56230a9b2748344624197265406bcb3de39ef0
- Last fetched origin/main commit: 5a56230a9b2748344624197265406bcb3de39ef0 (2026-11-04)
- Local changes present at session start: untracked `.playwright-cli/` and `artifacts/*` review folders, preserved
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

The owner reported disconnected roads and roads running through buildings. An audit of the live scene finds them; the owner then chose:
fix every case the close-ups show, and remove road nobody can see. Done when the re-audit shows no visible dead ends or isolated
pieces, and no building stands on a kept road except the items deferred below.

## In-scope files and dependencies

- `src/roadRepair.ts` (new): `ROAD_CUTS`, `ROAD_LINKS`, `repairRoads(environment)`.
- `src/odaibaScene.ts`: calls `repairRoads` after the junction fill, before materials are wrapped and anything samples the ground.
- `src/housingPrototype.ts`: `HOUSING_SITES.mobile` −265,−60 → −270,−67 (the U reservation stood on the north-west avenue).
- `src/layout.ts` `streets[1]` now ends at (−166.2, 27.8), d 512, 5 m short of the hull; `src/mobility.ts` `DROP_OFF.stops` 223/273 → 114.9/164.9
  (westbound lane metres from the avenue's west end; the bays stay at avenue d 397 and 347).
- `tests/odaiba.test.ts`: applies `repairRoads` like runtime and checks cuts, link, kept junctions and both street-car avenues paved end to end.
- The environment GLB is unchanged; the repair is a load-time clip, like `carveContext`.

## Completed work

Audit method (scripts in `~/city2127-evidence/road-audit/`): headless Chrome loads the standalone city and reads the live scene through the
three.js devtools hook. A 2.5 m grid of road samples casts rays upward; a hit within 4.3 m counts as an obstruction. A 1 m raster of
the paving gives the skeleton tips (dead ends) and the components (islands). `SIDEWALK_NETWORK` paving lies 10 cm over the road and draws in front of it, so
visible connectivity is road ∪ paving (`analyze2.ts`); road-only gaps under continuous paving (old items 12/17) are invisible and left.

Fixes, numbered by the first audit (`issues-before.json`):
- 2, 3, 7, 8, 19, 21, 23, 28, 30–34: the whole `ROAD_ACCESS` mesh is dropped: six isolated driveway stubs in the district plus one 1.1 km south in the receded backdrop (possibly touching a backdrop street; not checked visually).
- 4, 5: street 303 (under the membrane housing and the ring's plinth) clipped away, stopping 7.5 m short of the street-car junction.
- 9: the north-west avenue (348) stopped 17 m short of its junction; road and paving now continue its strip to the junction.
- 10: no change. Street cars drive under the plaza deck's east edge (3.8 m soffit), so a first-round cut there was reverted.
- 11: the U housing reservation moved 9 m off the avenue.
- Six-way junction (about 100, −138, owner 2026-11-04 "加補丁"): the source GLB carries the lawn medians under the guideway through the junction, leaving a
  lawn island (about x 91–106, z −139…−130) where they meet. A second `ROAD_LINKS` strip, (91, −133)→(106, −137.5) half 5 m, paves it up to the ring's foot.
  The vehicles over it are Yurikamome trains on the 14.2 m guideway; the street-car lanes pass 8.7 m away and never touched lawn (an earlier note said they did).
- 13, 14, 16: street 312 (under the floater assembly and the plaza deck's west wing) clipped away.

Reroutes (owner 2026-11-04, "改路線"). Contacts were classified by clearance:
- 20 (hull): about 87 % of contacts are under 1 m. The guideway avenue and street 269 under the hull are clipped. Street cars, which used to
  drive 100 m inside the hull (d 517–618, 0.25 m clearance), now end at d 512. West of the hull, traffic takes the north-west avenue.
- 6 (ring): 296's first 32 m and 264's first 6.5 m under the ring's foot are clipped; through traffic keeps the major lane beside it.
- 15, 18, 22 (Fuji frame): no change. About 90 % of contacts are its 2.5–3.5 m deck over the boulevard, which works as an underpass. The two leg cores
  (about −70…−50, 120…140 and 90…130, 0…30) stand on paving that reads as plaza. A full cut band was tried and reverted: the boulevard ended
  in a straight lawn edge, which looked worse (`~/city2127-evidence/road-audit/reroute-fuji-tried.png`).

## Actual validation results

- Verification status: PARTIAL (owner visual acceptance pending)
- Date and checked commit/worktree: 2026-11-04, base 5a56230 plus the uncommitted delta above
- Commands/manual checks and results: `npm test` PASS (exit 0); `npm run build` PASS; `git diff --check` PASS. Re-audit after round 1:
  road-only network one component (7 before), no islands; paving audit has no dead ends or islands. Round 2 (reroutes) checked by the new
  street-paving test, before/after captures and a live re-audit (hull and ring contacts gone; road ends at the hull and ring faces are by design).
- Evidence/environment: `~/city2127-evidence/road-audit/` (`road-audit.png` before, `road-audit-after.png`, `fix-before-after-*.png`),
  headless Chrome 960×600, standalone default state (no Meters).
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: this handoff and the PROJECT note

## Known issues and blockers

- Pre-existing, unrelated to roads: with loadOdaiba's own landmark set (no Aqua City or DiverCity Tokyo Plaza), the doorway fleet check reports
  delivery robots 7 and 13 meeting at 83.5 s, on main as well. The test fixture loads both landmarks, so it does not catch this.
  Fixed in the street network's stage 1 (road-redesign handoff): at most six walkers and one robot per doorway trip; the test now uses loadOdaiba's set.
- Out of scope: background grove plinths on roads beyond the district (1, 24, 25, 29, 35, 36). Cutting the road under them would expose
  lawn and move the grove's raycast placement. Also out of scope: 26 (skyway pier), 27 (grove terraces) and 37 (fixed kit, outside the district).

## Important decisions

- Owner (2026-11-04): fix every issue visible in the close-ups, and remove road that cannot be seen.
- Buildings win over the Phase 03D street layer. A street under a building goes; the building stays (the U housing reservation is the one exception, moved 9 m).
- Owner (2026-11-04): reroute rather than accept. A road counts as blocked only where clearance is under 1 m; 2.5–3.5 m decks are underpasses.

- Six-way junction patch (2026-11-04): `node tests/odaiba.test.ts` exit 0 (the `ROAD_LINKS` loop covers the new strip); `npm test` output all PASS;
  `npm run build` PASS; `git diff --check` PASS. Captures `~/city2127-evidence/road-audit/hub/{before,after}-{top,top-rail,low}.png` (`hub.mjs`).
  East of x ≈ 106 the 296/264 cut strip stays lawn by the earlier ring-foot decision.

## Next expected step

The owner reviews `fix-before-after.png`, `reroute-before-after.png` and `hub/after-top.png`, and decides whether the Fuji leg cores need lanes bent around them. After acceptance, commit and merge per CONTRIBUTING.
