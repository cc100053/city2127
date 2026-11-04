# road-redesign — 2127 street network and street kit

- Owner: cc100053
- Status: IN_PROGRESS (kit polish R3 and network stage 1 owner-accepted 2026-11-04; stage 2 next, then stage 3)
- Branch: `claude/road-net-stage1-a14ae6` (from `claude/street-kit-polish-86d81f` at 1cf1a70, which continues the [road audit](road-audit.md) commit 866cdbe; not merged — the owner merges after all stages)
- Base commit: 5a56230a9b2748344624197265406bcb3de39ef0 (main)
- Remote availability: pushed (`origin/claude/road-net-stage1-a14ae6`)

## Decisions (owner, 2026-11-04)

- Replace the district's Phase 03D GLB streets (`ROAD_*`, `SIDEWALK_NETWORK`, markings, guardrails, street lights inside `DISTRICT`) with
  streets generated in three.js from centrelines; backdrop roads beyond the district stay GLB. `roadRepair` goes once the kit is applied.
- 2127 reduced network (sketch v2, `~/city2127-evidence/road-redesign/sketch-v2.png`): ① seaside avenue (route kept), ② guideway
  avenue (kept), ③ new link round the plaza deck's west end joining ① and ② (street cars run one U route), ④ the ~90 m major band
  narrowed to a 24 m boulevard that bends south of the Fuji frame and out between Fuji and the DiverCity office tower, clear of SE TOWER.
- Water: the landscape shader's sine ponds and corridor channel are removed; designed water instead (a court pool under the Fuji frame,
  a linear canal park on the old major band south-west).
- Street look (Gemini targets in `~/city2127-evidence/road-design/gen/`): avenues use **A, light-guided shared street**
  (`avenue-A.jpg`); the boulevard uses **B, maglev guide-channel street** (`boulevard-B.jpg`). Prompts: `road-design/prompts.md`.

## Completed work

- [streetKit.ts](../../src/streetKit.ts): `avenueStreet` (A) and `boulevardStreet` (B) build a street from a centreline and a cross-section
  in metres left of the route; `streetKitPreview` lays A on the guideway avenue (d 270 → junction, carriageway −5.1 … −0.5 m where its
  cars drive) and B on the planned boulevard (`ROAD_KIT_PREVIEW`), with the old major band cut (`repairRoads(environment, extra)`).
  DEV only: `?roadKit` (odaibaScene); `plantLandscapeCanopy` takes extra street curves to keep groves clear.
- Review poses (`?roadKit&review=street&cam=…&at=…&hour=13|21`): avenue `-125,32,-5` → `-40,0,-55`; boulevard close `-45,24,212` →
  `0,0,168`. Captures and board: `~/city2127-evidence/road-design/r4/` (`board.jpg`), script `capture-kit.mjs`.

## Known gaps after R4 (vs targets)

- A: carriageway 4.6 m (target ≈ 7 m, limited by the street cars' `CARRIAGEWAY` and the Yurikamome piers); planters too far out and thin,
  target has them at the carriageway edge with denser low shrubs; crossing panels and footway people not in frame.
- B: no pods (the boulevard has no traffic yet); lamp blades thin; field edges faint; light bridge out of frame; median trees not slim cypress.
- Night: seams and rails lack glow.

## Street-kit close-up polish (branch `claude/street-kit-polish-86d81f`, from 866cdbe)

- Rubric and spec: [rubric](../../artifacts/street-kit-closeup-polish/rubric.md), [spec](../../artifacts/street-kit-closeup-polish/spec.md);
  rounds in `~/city2127-evidence/street-kit-closeup-polish/` (`r0` = R4 captures, `target/` = the chosen Gemini images).
- Owner decisions (2026-11-04): widen A toward the plaza to ≈ 7 m (DEV `?roadKit` override of the street cars' lanes; production
  unchanged until rollout); B reviewed at the close pose `-45,24,212` → `0,0,168` with crops following the city (street keeps 24 m);
  static demo pods on B's channels in the preview; night scored by rubric only (no Gemini night targets).
- R1 (e93ee88): absolute 27/40, pairwise 19–1 over R0, kept; owner agreed with the R1 scores as the bar (2026-11-04).
- R2: dense faceted bushes and broad-leaf clumps (5825 instances), A 5 m planters, thick rings with a light mist, one-row crossing,
  paved footway, cool plaza glass at night (`coolGlassGlow`, `?roadKit` only); B 0.18 m channel, continuous median, 0.45 m terrace with
  lit riser, 9 m crescent blades, bright bridge deck. Absolute 29/40, pairwise 11–6 over R1, kept. Passed: a-footway, an-planting,
  b-median, b-blades, bn-rails, bn-planting. Regressions vs R1: an-seams, an-crossing (2 but lost pairwise), bn-blades and b-pods 2 → 1.
  Main R3 cause: the ring mist cylinders read as round glass tubs, so A's planters, rings and far verge read wrong.
- R3: ring mist removed, ring seam on the top inner edge, brighter day lines and square crossing panels, R1 night line values restored;
  B channel lips removed, `riser` material, `bridgeLine` over the deck, 7 m blade pools, demo pods moved into the crop. Absolute 32/40,
  pairwise 5–3 over R2 (12 ties), kept. Passed: a-carriage, a-footway, a-far-verge, an-seams, an-crossing, an-planting, b-blades,
  b-bridge, bn-rails, bn-lip, bn-planting. Below 2 after three rounds (stop, owner decides): a-planters (thin grey rim, gem-like
  shrubs), a-rings (chrome tubes, lost pairwise), an-rings (2 but lost pairwise), a-crossing (day contrast), b-channels (faint inner
  lines), b-median (crown ratio ≈ 2.5, grey rim), b-terrace (day lip unlit), b-pods (no people for scale), bn-blades (no light pool).
- Owner accepted R3 as is (2026-11-04); the kit stays DEV `?roadKit` until it is applied to the network.

## Network stage 1 (branch `claude/road-net-stage1-a14ae6`)

- Spec, owner-approved 2026-11-04 before code: [network-stage1.md](../../artifacts/street-kit-closeup-polish/network-stage1.md) (as-built deltas
  noted there). Plan maps and measurement scripts: `~/city2127-evidence/road-net-stage1/` (`map-u.png`, `map-u-west.png`, `spec/`).
- Production (no `?roadKit`): `streets = [U]` in layout.ts (② → ③ → ①, 1108 m, the kit carriageway's centre) and `STREET_KIT` (reaches,
  planter gaps, crossings 398 and 545). `streetNetwork` builds A along it; its ceramic and footway join the environment; `streetCuts` clip
  the surveyed streets under it plus ②'s west stub and ①'s south-west extension through `repairRoads` (kept: it is the cut mechanism for the
  audit cuts too). `CARRIAGEWAY = [{0, 3.5, 1.75}]`, one road; mobility's carriageway inlays and crossing bands are gone (the kit draws
  seams and panels); drop-off bays on ①'s plaza frontage (U d 750, 700); `roadFill`, `useKitCarriageway` and audit 9's link removed.
  Surveyed ground trees on the kit footprint are hidden in place. `?roadKit` previews only B.
- Doorway fleet (found while making the test match loadOdaiba's landmark set): with about eight doorway trips, 116 walkers and 14 robots
  crowded each trip and grazed (on main too, see the road-audit known issue). Now at most six walkers and one robot per trip.
- Tests: mobility checks lanes, crossings and bays against `STREET_KIT`; odaiba applies `streetCuts` + `streetNetwork` like runtime, checks
  the U paved end to end (ceramic and both footways), the ④ band kept, cars clear of planters/plants/rings, uses runtime's landmark set for
  doorways and car clearance (Aqua City and DiverCity Tokyo Plaza are fixture-only), and counts the kit's flat finishes as open ground (as the
  surveyed paving slab over the avenues was).
- Known: ①'s carriageway clips the AUTO HUB lot's north corner by up to 2 m (the surveyed avenue's paving did too); ③'s inside verge has no
  planters (corners, stair); the kit's east start sits 4 m north of the surveyed ② that continues beyond the district (seam at the edge);
  footways stand up to 0.48 m over lawn where the terrain dips (−0.25 m) on ①'s seaward verge.

## Validation

- 2026-11-04, uncommitted delta on 5a56230 then committed: `npm test` exit 0, `npm run build` PASS, `git diff --check` PASS.
  Visual acceptance: owner only, pending.

- 2026-11-04, stage 1 on `claude/road-net-stage1-a14ae6` (tests, build and diff check on the committed tree; captures and FPS were taken before the last change, the doorway walker/robot cap in mobility.ts, which does not touch the street):
  `npm test` exit 0; `npm run build` PASS; `git diff --check` PASS. Live re-raster (1 m, production page): the nearest solid outside the kit
  to a car body edge is a Yurikamome pier at 1 m; kit planter rims 1.15 m by geometry. FPS (`fps.sh`, headed Chrome 1920×1080, DPR 1,
  `meters=nw:0`, hero): day 59.9–60.0, night 59.9–60.0 (vsync cap). Captures `~/city2127-evidence/road-net-stage1/r1/` (hero, avenue
  `cam=-125,32,-5&at=-40,0,-55`, link `cam=-150,30,45&at=-190,0,-40`; day 13, night 21; `capture.mjs`). Owner accepted stage 1 as captured (2026-11-04).

## Next expected step

Stage 2 (owner 2026-11-04: in a new session, from this branch): ④ boulevard B (cut the
old ~90 m band and its side streets, retire the remaining district GLB streets), then stage 3 (court pool, canal park); merge after all
stages are accepted.
