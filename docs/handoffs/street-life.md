# street-life — Pedestrian and street-traffic polish

- Owner: cc100053
- Status: IN PROGRESS (rounds 11–12 on the feature branch, not merged by user request; exhibition-machine FPS open)
- Branch: feat/pedestrian-traffic-life
- Base commit: 9476fd8b82da523d6f7acee6f1893e5028fb35a0
- Last verified commit: cdea651d85b2e2573be5658cd583b1894e9caa65 (integrated main: root tests/build/diff-check PASS; tree identical to browser-verified round 10)
- Remote availability: origin/feat/pedestrian-traffic-life contains 708b411; origin/main contains cdea651d85b2e2573be5658cd583b1894e9caa65

## Session Git state

- Latest session starting branch and HEAD: feat/pedestrian-traffic-life, 52b6445478752496abea879f9ff8ed116a50892c, clean
- Last fetched origin/main before integration: 52b6445478752496abea879f9ff8ed116a50892c (fetched 2026-10-06)
- Local changes present at session start: NONE
- Upstream integration status: round 9 merged with --no-ff as 0c734bf and pushed to main; no conflicts; exact main CI PASS
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

The user wants a lived-in, believable city: more pedestrians, less uniform behaviour, and people interacting with buildings. Acceptance:
more visible people at every automation level, varied pace/grouping/stops, people entering and leaving landmarks, and road traffic
on real road surfaces.

## In-scope files and dependencies

`src/mobility.ts` (walker model, doorway walkers, street cars), `src/layout.ts` (`streets`), `src/odaibaScene.ts` (publishes
doorways per landmark), `src/main.ts` (DEV `?review=street`), `tests/mobility.test.ts`, `tests/districtMeters.test.ts`,
`docs/PROJECT.md`, `docs/VALIDATION.md`. Plaza crowds (`plazaPose`) and interchange transfers are unchanged.

## Completed work

- Walker capacity 40/160 → 120 standalone, 400/260/120 at low/mixed/high automation. Lighter person mesh (segment counts lowered) to
  keep the triangle budget near the old one; trousers now vary per person.
- Walkers move as parties (alone, pair, trio with a child), each at its own pace (0.9–1.45 m/s, a third of lone walkers jog at
  2.3–2.8 m/s), on one-way trips that fade in/out at the route ends (DECKS, park, Hilton, deck landings), rest out of sight and pick a
  new direction; two in five non-joggers stop at a viewpoint. Previously everyone paced back and forth at 0.2–0.6 m/s.
- Doorway walkers (120 slots): `publishDoorways` raycasts each landmark's ground-floor facades and paved forecourt, and people step
  out of one door, cross 4–10 m out and go in at the next door on the same face.
- Street cars: two avenues traced from the environment GLB's road triangles (seaside avenue 5 m, guideway avenue 7 m), left-hand
  traffic, irregular non-closing gaps, vans, head/tail lights at night, density from `traffic`.

### Round 2 (user request 2026-10-06: items 2, 3, 4, 6, 7; no traffic signals — 2127 cars need none)

- 2 Paved promenades: 7.2 m boardwalk under the lit edges (`skyways.ts`).
- 3 Stationary people: benches every 24 m with two sitters, rail couples between, standing groups on up to 20 forecourts.
- 4 Day rhythm: `streetRhythm(hour)`; `hour` now flows main → cityRig → mobility.
- 6 Kerbside drop-offs (two cars, guideway avenue westbound, paved bays south of Aqua City; passengers walk to the nearest door) and
  14 delivery robots on doorway forecourts. Forecourt walks/groups now keep 4–5 m off carriageways (Aqua City's pad overlaps the
  seaside avenue).
- 7 Gait shader (leg/arm swing, seated legs), backpacks and shoulder bags.

### Round 3 (user report 2026-10-06: sitters embedded in benches)

- Cause: crowd share and day rhythm were multiplied into each person's scale, so at partial crowd (e.g. high automation) or a held
  hour some people were drawn shrunk about their feet and sank into the bench. Presence is now on/off per actor, easing over 1.5 s
  (also fixes the same latent shrink for walkers, doorway walkers, robots and street cars).
- Seated pose: knee bend in the gait shader (thigh level, shin hanging), bench seat lowered to 0.40 m to suit the figure's 0.58 m hip,
  sitters set at -0.10 m so thighs rest on the seat; items are hidden while seated (backpacks hit the backrest).
- Test: `districtMeters.test.ts` asserts every resting person is drawn at ~0 or full scale (fails on the old code at 0.05).

### Round 4 (user report 2026-10-06: sitters' legs still through the bench, bench too close to the lit edge)

- Cause 1: the knee blend used `smoothstep(.29,.23,…)` (edge0 > edge1, undefined in GLSL; garbage on Metal/ANGLE), so legs did not
  fold reliably. Now `1 - smoothstep(.23,.29,…)`.
- Cause 2: the knee sat at the seat's front edge and the bench 3.1 m out put feet against the 3.3 m edge tube. Knee pivot moved to .26
  (knee .31 m forward of the hip, past the seat's .18 m front), hip/knee fold 1.5 rad, seat .40 deep, sitters −.08 m; benches 2.75 m
  out; walker lanes narrowed to ≤ 2.35 m so the backrest still clears them. Test asserts both clearances.
- Close-up captures must stay > 2 m from people: the hero camera's near plane is 2 m, which slices nearby figures.

### Round 5 (user request 2026-10-06: polish A1–A5, B6, B7)

- A1/B6 Promenade stops: `promenadeStops` gives each stopping promenade party its own spot between benches (bench 12, stool 18,
  rail couple 24, free rail spot 30 m per 24 m step). Lone walkers veer out of the lane over 6–1 m to the front of a backless one-seat
  stool, turn to the sea and sit 70 s (gait `w` = `dwell`), then stand and veer back; parties line up along a free rail spot for 40 s.
  Leftover stoppers walk on; deck walkers keep the old in-lane stop. The body turns along the diagonal (`slope`).
- A2 Joggers keep a fixed outer lane (2.1 m); other lanes .8–1.1 m, so joggers pass every party (test checks the arm clearance).
- A3 Doorway trips run from .6 m inside one facade to .6 m inside the next, fading over .5 m inside the wall; drop-off passengers walk to
  just inside the door.
- A4 Doorway trips are centripetal Catmull-Rom curves (corners rounded, heading continuous); robots share them.
- A5 Party followers keep a per-person ±.3 m offset ahead/behind, and everyone sways ±.04 m across the lane.
- B7 Robots roll at .7 m/s, halt 2.4 m short of the far door end for 8 s while a collector (`doorway-walkers` slots after the
  passengers) steps 1.5 m out, faces the robot, turns back and goes in; then the robot rolls in.
- DEV `&cam=x,y,z` moves the `?review=street` camera (the default one now looks down on the canopy over the bench).

### Round 6 (user request 2026-10-06: B8)

- Drop-off cars cue their moves: `dropOffPose` returns `signal` (+1 kerb from 30 m before easing in until stopped, -1 road from 3 s
  before pulling away until back in lane), `brake` and `pitch` (≤ .7° nose dip braking, .5° lift pulling away). Two small fleets
  (`drop-off-indicators`, 1.5 Hz amber pair on the signalled side; `drop-off-brakes`, bright lamp over the tail light) hide when off.
- Also fixed a round-5 type error in `main.ts` (`&cam` spread; `vite build` does not type-check, `tsc --noEmit` caught it).

## Actual validation results

- Verification status: PARTIAL
- Round 6 (2026-10-06, worktree before commit): root `npm test` PASS, `npm run build` PASS, `git diff --check` PASS, `tsc --noEmit`
  PASS. Headless Chromium 1400×900 behind drop-off car 0 at `?hour=18&meters=nw:low&reviewTime=27.42/34.08/113.42`: kerb indicators
  approaching, brake lamp stopping, road indicator pulling away. FPS NOT RUN.
- Round 5 (2026-10-06, worktree before commit, base fabc3a6): root `npm test` PASS, `npm run build` PASS, `git diff --check` PASS.
  Vite DEV on :5174 (another session held :5173), built-in pane: no console errors. Headless Chromium 1400×900 with the camera set
  through the three.js devtools hook: walker slot 84 at `?hour=17&meters=nw:low&reviewTime=66/72` approaches and sits on the stool at
  (-25.0, -267.2) facing the sea, legs clear of the edge; live `?hour=13&meters=nw:low` robot 5 halts with its collector stepping out
  and standing facing it. FPS NOT RUN.
- Date and checked commit/worktree: 2026-10-06, 04c9333b6d2af95b1c89e224c05ea5e0a741d9b6
- Round 2 (2026-10-06, worktree before commit): root `npm test` PASS, `npm run build` PASS, `git diff --check` PASS. Headless
  Chromium (installed Playwright, 1400×900): promenade at 17:00 with parties, items, gait, bench sitters; drop-off bay at reviewTime 39
  with a passenger stepping out; hero 12/19/4 h and bench view at 21 h. Headless FPS is not exhibition evidence; user reported FPS OK
  after round 1.
- Round 1: root `npm test` PASS; `npm run build` PASS; `git diff --check` PASS. Browser (Vite DEV,
  1400×900 emulated, built-in pane): `?hour=12&review=street` and `&meters=nw:low` show parties on the promenade and cars on the
  seaside avenue; DECKS forecourt shows doorway walkers and cars under the guideway; `?hour=21&meters=nw:low` shows collar lights and
  car lights. FPS NOT RUN (pane hidden; rAF throttled).
- Evidence/environment: screenshots taken in-session only, not saved.

## Unresolved issues and next step

- Re-measure FPS after round 2 on the exhibition machine (adds ~150 resting people, benches, robots, gait shader).
- One ~10 m junction mouth on the guideway avenue has no road triangle; cars cross it on terrain.
- No cross streets or signals, by decision (2127 cars need none).
- Shadows and GTAO use the rest pose (no custom depth material for the gait shader): a sitter's shadow is a standing figure's.

### Round 7 (user request 2026-10-06: nothing passes through anything)

- Census (scratch node harness running the real `mobility()` with published doorways, 640 s at .25 s, automation shares 0/.5/1):
  people 4199 → 6/4/3 brief grazes (0.30–0.39 m, 1–2 frames, a collector beside an oncoming doorway walker); boats 15 → 0; trains
  18–216 → 0; aircraft and street cars 0 before and after.
- People: opposite-direction walkers had shared one physical lane (lane sign flipped with the reversed tangent). Lanes are now metres
  right of travel; parties walk in a ≤ 0.6 m formation (deck parties single file); `passingLanes` sidesteps and, in jams, queues
  (≤ 2.5 m) movers on one path; promenade stops happen only on trips with the sea on the right; deck walkers no longer stop. Doorways:
  each door on one trip, trips 3 m apart, one robot per trip, forecourt groups 2.6 m clear of the rounded walk.
- Trains: two one-way tracks traced from the GLB's two beams (`guidewayTracks`), fading beyond the district; no reversing.
- Boats: loop return leg moved ~19 m further seaward (legs 28 m apart; water rooms and beacons unchanged); `boatPoses` with
  commensurate periods (loop gap 20 s, cruisers 7.5 m/s = 40 s per run, interchange 40 s, ferry 320 s) and searched `WATER_PHASES`
  (2.5 m water around every hull); cruiser at (-500,-500) moved to (-478,-556), it ran head-on along the ferry lane 9 m off.
- Validation: root `npm test` PASS (new boat-period and train-spacing checks; the boat check fails with the old loop phase), `npm run
  build` PASS, `git diff --check` PASS; headless Chromium hero `?hour=15&meters=nw:low&reviewTime=40` renders, no page errors.
  FPS NOT RUN (passingLanes adds a per-frame sort and pair pass over ~200 parties and the doorway movers).

### Interaction proposal (2026-10-06; proposed, NOT IMPLEMENTED)

- Inspection: Codex, for owner cc100053. Started on `feat/pedestrian-traffic-life` at
  `f255a5118444b8fe36b7c9a25a293b5157c6ac9f`, clean. Fetch succeeded; branch/upstream divergence 0/0;
  branch is 15 commits ahead of `origin/main` (`9476fd8b82da523d6f7acee6f1893e5028fb35a0`), 0 behind.
  Round-7 verified implementation `50ac74a` is available remotely; subsequent `f255a51` changes only this handoff.
- Scope: user requested proposals for improving pedestrian interaction. Source/caller inspection only; existing behavior and
  implementation verification above remain unchanged. No new browser, runtime or FPS evidence.

Recommended order:

1. **Credible yielding.** Clear the remaining collector/doorway grazes first. Then make walking swing and body heading follow the
   corrected movement from `passingLanes`: queued people should pause their feet, and a sidestep should turn smoothly rather than
   slide sideways. Keep the existing shared lane solver and authored paths. Check actual drawn shoulder/robot clearance through
   collector arrival, waiting and departure, plus low/mixed/high fleets; review continuous motion, not just held poses.
2. **Companions acknowledge one another.** Pairs occasionally glance at each other; at existing rail stops, one adult points toward
   the bay and the other follows the gesture. Family members react at staggered times rather than all turning together. Keep the
   existing party leader, formation and stop allocation; gestures must stay within the tested clearance envelope. Use small,
   deterministic per-party timing and extend the shared instanced person shader only for the required head/arm poses.
3. **Complete the robot encounter.** Keep the current approach/wait/return sequence, adding a readable reach to the lid and a brief
   acknowledgement before returning indoors. Preserve separation while arms extend. A parcel, if added, must visibly transfer once
   between robot and collector rather than appear independently. Reuse `robotPose`/`collectorPose` timing and geometry.
4. **Give resting groups conversational rhythm.** Bench pairs and forecourt groups alternate facing a companion and the view, with
   occasional restrained gestures and pauses. Current whole-body sine rotation alone does not depict an exchange. Drive timing
   from each group rather than independent actor oscillations; seated hips and folded legs must remain fixed to the seat.
5. **Later: connected daily-life journeys.** Link a small number of validated doorway routes to a promenade destination or existing
   forecourt group, so a resident emerges, visits and returns. Current doorway trips join doors on the same facade; passengers use
   a straight kerb-to-door segment. Cross-route movement needs ground/building and actor clearance checks before expansion.

Next expected step: select the implementation scope from this proposal, starting with item 1; implement and verify on this branch.
Acceptance should include existing hero and street cameras, day/night, low/mixed/high automation, continuous interaction cycles,
root tests/build/type check and a repeatable real-fleet clearance check. Exhibition-machine FPS remains open. No new dependency,
pathfinding framework, guest controls or Meter-to-population inference is proposed.

### Round 8 — conversations and daily-life visits (2026-10-06)

- User selected proposal items **4 and 5**. Implementation: Codex, for owner cc100053. Preflight:
  `feat/pedestrian-traffic-life`, `dbf5d1533cf4fa340bf691ca3a8dc1356fa015a8`, clean; fetch succeeded;
  branch/upstream 0/0, 16 ahead / 0 behind `origin/main` at `9476fd8`. No upstream merge was needed.
- Bench/rail pairs and forecourt groups share deterministic speaking/listening/quiet turns. The existing instanced person shader
  receives head-yaw/hand-gesture values; a small nose makes gaze visible without adding a draw. Seated hips/legs and body matrices
  stay fixed; a lone sitter does not acknowledge an absent partner.
- Selected forecourts reserve a validated curve from an existing door to the group's third slot. The resident walks out, chats
  30–50 s, turns and walks back into the same doorway, then rests indoors. Ordinary walkers/robots use the other trips. Later
  publication keeps clear of the visitor corridor too; failed candidates preserve ordinary traffic. Visiting groups use lower
  presence thresholds to retain inhabited journeys at high automation. No extra fleet/dependency or road crossing is introduced.
- Native checks: root `npm test` PASS, `npm run build` PASS (includes `tsc --noEmit`), `git diff --check` PASS, on the round-8
  worktree based on `dbf5d15`. Actual GLBs publish two journeys in the sequential test load; curves clear paving/buildings/sites,
  and actual visitors clear every drawn person/robot over 240 s at .25 s in automation 0/.5/1, hours 12/21. All six cases must
  draw every journey. Conversation turns, timing continuity and stationary seated matrices/legs also pass.
- Initial geometry-check height was corrected to test pavement below the body rather than an overhead canopy. A later sandboxed
  full-suite attempt reached the HTTP test but failed to bind localhost (`EPERM`); rerunning with local-server access passed.
  Early browser harness attempts used a duplicate HMR module or occluded cameras; the final check uses actual loaded modules,
  requires drawn moving visitors, and replaces those captures.
- Browser evidence: [captures/report](../../artifacts/street-life-interactions/) — Chromium 151.0.7922.34 headless,
  1400×900, deviceScaleFactor 1, Metal requested; controlled actor clock, **FPS NOT MEASURED**. Existing hero day12/low,
  dusk18.5/mixed and night22/high, bench exchange, visitor outbound/chat/return and hour21/high checks; no console/page errors or
  unexpected failed resources. Journey count/location follows asynchronous landmark publication (native two, browser two/three).
  Continuous drawn-visitor movement is checked over 140 s in .25 s steps, including stopped feet during conversation.
- Scope limits: no promenade connector/pathfinding, no robot interaction upgrade, no general yielding/gait repair. Earlier
  collector grazes and rest-pose shadows/GTAO remain recorded limitations. Exhibition-machine FPS/Safari/hardware NOT RUN.
- Implementation commit: `77e44d7cabc869648f99792f0619b3389af6d055`, pushed to the assigned feature branch. Integrated as
  `a055e4faed7a364601ee87455752b0bbe67cc1d8`; root `npm test`, `npm run build` and committed diff whitespace checks PASS again
  on the merge result. Its tree is identical to the browser-verified feature tree. Main was pushed without rewriting history.
- [Main CI](https://github.com/cc100053/city2127/actions/runs/37460807614) PASS on that exact integration commit: Node 24,
  root/survey/module-swap install, tests, builds and diff whitespace. Handoff metadata is a documentation-only follow-up;
  local Markdown targets and diff whitespace checks PASS. The requested feature branch is fast-forwarded to the recorded result.
- Next: exhibition-machine FPS or a separately assigned interaction round; proposal items 1–3 remain unimplemented.

### Building interaction proposal (2026-10-06; proposed, NOT IMPLEMENTED)

- User requested further building-interaction proposals. Inspection on `feat/pedestrian-traffic-life` at
  `519fa6d19840ff82dca20dc8b1454588739f15f1`, clean; fetch succeeded, branch/upstream and branch/main both 0/0.
  Round-8 implementation and verified main integration are available remotely. This update changes documentation only;
  it adds no runtime, browser or performance evidence.
- Current limit: `publishDoorways` infers ground-floor entry points from facade raycasts, rather than authored door metadata.
  Existing visitors, delivery collectors and kerb passengers use those points; journeys do not model building interiors.

1. **Recognizable entrance zones.** Select one or two validated entries per pilot landmark, with a restrained door frame,
   canopy/threshold light and clear waiting space. People slow, orient to the entrance and yield to an exiting person.
   Retain inside-facade fading; do not imply a cut-through opening or model interior that does not exist.
2. **Meet at the door.** One resident waits beside the entry, a companion emerges, both acknowledge, then walk together
   to the existing forecourt group or enter together. Reserve the approach and waiting spot; keep the through lane clear.
3. **Use the actual service frontage.** At a visible service carrier, a resident approaches, pauses for a staff exchange,
   human/machine collaboration or autonomous pickup, then leaves. Select behaviour from the rendered configuration,
   keeping all alternatives active and mature. A disappearing carrier must release its actors during live changes/reset.
4. **Readable collection.** Extend the existing robot/collector encounter with a reach and one small parcel transferring
   once to the person, who carries it through the entry. No parcel duplication or unrelated delivery route; first resolve
   the recorded collector grazes and verify the extended arm/prop envelope.
5. **Different frontage rhythms.** Pilot an office entry with staggered arrivals/departures, a waterfront frontage with
   short social visits, and a hotel entry with greeting/waiting/drop-off. Use the existing hour and group clocks;
   stagger the scenes, keep night activity, and avoid treating the choreography as occupancy or population simulation.
6. **Use terraces and climate amenities.** Where a rendered ground-level shared seat, canopy or climate garden actually
   exists, residents arrive, sit/rest, acknowledge others and leave. Bind to the published position and available seat;
   preserve body/seat clearance and handle changing geometry. Do not claim measured cooling effects.
7. **Later: building-to-building journeys.** Author two or three short connections on verified continuous paving;
   leave one entry, visit another frontage, and return. Validate the full corridor and simultaneous actors. Rooftop visits
   require an actual authored lift/stair/deck connection and are a separate route/asset scope, never a teleport.

Recommended first slice: **1 + 2 + 3**, on a small number of visible frontages, reusing the current person instances,
conversation timing and reserved curves. Next expected step: select the proposal scope. Acceptance should cover a continuous
arrival/use/departure cycle, existing hero/street cameras, low/mixed/high day/night, doorway/actor/prop clearance, actual
carrier changes and immediate reset/Undo/reconnect. No new dependency, interior simulation or guest controls are proposed.

### Round 9 — building interaction items 1–3 (2026-10-06)

- User selected recognizable entries, doorway meetings and actual service use. Codex implements for owner cc100053.
  Preflight: `feat/pedestrian-traffic-life` at `52b6445478752496abea879f9ff8ed116a50892c`, clean; fetch succeeded;
  branch/upstream and branch/main both 0/0. Prior implementation/verification and proposals are available remotely.
- In scope: `src/mobility.ts`, `src/odaibaScene.ts`, focal `src/siteBuilders/automationHub.ts`, related native checks and current documentation.
  No upstream merge needed at startup; no shared assets or other packages changed.
- Implemented four facade entry overlays and two reserved meeting routes, reusing the last four doorway-person slots.
  Selection happens after every landmark and landscape is present; paving and body-height solid checks reject unsafe lanes.
  Bounding-box culling avoids ray-testing distant/overhead geometry and the dense curved sea. Friends wait, emerge,
  acknowledge and leave together, with eased facing and stopped feet. Selection follows asynchronous landmark publication.
- Added two service pilots on opposite AUTO HUB frontages using the existing person factory/runtime: approach, 12 s service,
  return and wait. Staff serve human counters, assist at ports when a human counter remains, and disappear at six automated
  ports. Actors cancel site scale and hide with invertible small matrices during slot handover; immediate recovery writes
  the current configuration. Counters now sit on the existing podium, with flat pilot footing and a lower reachable panel.
- Native verification PASS: `npm test`, `npm run build`, `git diff --check`. Actual entrance matrices sampled at .25 s for
  240 s across low/mixed/high, hours 12/21, clear static geometry/paving and every existing person/robot fleet. Service matrices
  cover 0/3/6 ports, full human size, podium support, counter/body clearance, live handover and immediate/hidden-layer recovery.
- Browser evidence: [screenshots/report](../../artifacts/building-interactions/browser.json), Chromium 151.0.7922.34,
  headless 1400×900, DPR 1, Metal requested, controlled actor clock. A 180 s actual entrance cycle covered all six stages:
  maximum drawn displacement 0.307803 m per .25 s, minimum companion spacing 1.399983 m, waiting feet stopped and greetings
  drawn. Explicit scores −12/0/+12 showed 4/4/2 service actors; live handover hides all four and settles to two customers.
  Reviewed entrance wait/exit/greet/leave, night greeting, service low/day–mixed/dusk–high/night and the authored hero camera
  at all three settings plus standalone/day. Earlier close-up captures labelled hero were replaced by explicit authored-pose views.
  Console/network errors: none. Initial checks caught float/pose tolerances, a foreign facade on an early candidate, and
  excess speed around a curved offset lane; complete-scene selection and slower entrance timing resolved those findings.
- Limits: inferred door overlays, no wall cuts/interiors, queue or transaction simulation; proposal items 4–7 remain proposals.
  Prior collector/body-shadow limitations remain. FPS, Safari/Windows and exhibition hardware are unverified.
  Implementation is complete. Feature `1267833` pushed; integrated as `0c734bf25c8d3d359ecda83ce0a727275d126e43`, identical tree,
  root tests/build and committed whitespace check PASS again. Fresh fetch before merge/push confirmed main ancestry; fetch
  after push confirmed local/remote main 0/0. All 170 local Markdown targets across four changed documents exist.
  Exact main [CI run 37469282004](https://github.com/cc100053/city2127/actions/runs/37469282004) PASS: root, survey,
  module-swap and whitespace. The remaining update only records this evidence; the feature branch fast-forwards to the same
  main metadata commit. No further implementation is pending for items 1–3; exhibition-machine FPS and unselected proposals
  require a separate scope.

### Traffic and pedestrian proposal (2026-10-07; items 1, 4, 6 selected)

- Inspection by Claude for owner cc100053 on `feat/pedestrian-traffic-life` at `cddc016a366393834506b5bea4ef7f63f15305a5`,
  clean; fetch succeeded; branch/upstream and branch/`origin/main` both 0/0.
- Finding: street cars ignore the automation Meter (density reads only `state.traffic`, which v2 leaves alone, and the commute
  rhythm), every lane runs one speed with fixed phase gaps, one body plus a van, and people never meet the carriageway.

1. **Street fleet follows automation** (selected): each car slot swaps from a human-driven car to a rounded autonomous street pod by
   `podShare`, as the aircraft do; 0 / mixed / high all remain complete, mature traffic.
2. Shared-space crossings without signals: cars ease for people at two or three paved crossings (later).
3. Car-following: cars behind a stopping drop-off car slow instead of relying on phase gaps (later).
4. **Credible yielding** (selected): clear the collector/doorway grazes; feet follow actual ground travel so queued people stop
   stepping; a sidestep turns the body along its actual path.
5. Fill the ~10 m guideway-avenue junction mouth without a road triangle (later).
6. **Measure FPS** (selected) before adding more actors, using the canvas `data-fps` sample on a real GPU.

Not proposed: signals, pathfinding, new dependencies, interiors, population inference.

### Round 10 — street pods, credible yielding, FPS (2026-10-07)

- Claude implements for owner cc100053 on `feat/pedestrian-traffic-life` from `cddc016`; no upstream merge needed.
- 1 Street fleet: new `street-pods` fleet (rounded pale cabin, wraparound glass, thin mint roof line, head/tail lamps; van slots
  become cargo pods). Each car slot draws car or pod by `podShare(activity.level, slot)`, so low 65 cars / 0 pods, mixed 33 / 32,
  high 0 / 65 in the browser at reviewTime 60, hour 17; standalone keeps cars. Density and drop-off cues are unchanged.
- 4 Yielding. Cause of the recorded grazes (0.30–0.42 m): a walker between a halted robot and its collector, both `fixed`, was
  pushed toward its narrow inner side (zero lane gap picks the walker's own right), then queued along into the collector.
  `passingLanes` now sends a mover passing a fixed one round the side with room for the full clearance. Feet: walker/doorway gait
  phase now comes from ground covered (trip distance + solver along offset, clamped to the trip) and swing scales by actual pace
  (smoothed ~.3 s between frames; jumps/snapshots start still); stoppers settle their legs within 1 s; sidesteps turn walkers,
  doorway walkers and moving robots by up to .6 rad toward the actual path.
- Checks: `odaiba.test.ts` now asserts doorway people > .62 m and robots > .85 m over 240 s × low/mixed/high × hours 12/21 (fails on
  the old code at `doorway-walkers#111/#124`, 1.5 s), and strides in place: promenade 0 of 10011 slow frames (old 1300), doorway
  14 of 999 (old 1083; the remainder pivots on the inside of a tight forecourt corner). `districtMeters.test.ts` checks the street
  fleet at low/mixed/high and the standalone restore. Two same-direction doorway walkers on a curved bend still come within
  0.636 m (solver spacing 0.65 m on the path's straight-line metric).
- 6 FPS (development Mac, Apple M6, headed Chromium 151, 1920×1080, DPR 1, hero, `data-fps`): standalone 56, low/mixed/high 53,
  high night 52; see [VALIDATION](../VALIDATION.md#performance-evidence) and
  [report](../../artifacts/street-traffic-automation/browser.json). Avenue captures behind the drop-off car (camera set through
  the three.js devtools hook): [low](../../artifacts/street-traffic-automation/avenue-low.png),
  [mixed](../../artifacts/street-traffic-automation/avenue-mixed.png), [high](../../artifacts/street-traffic-automation/avenue-high.png),
  [high night](../../artifacts/street-traffic-automation/avenue-high-night.png). The built-in pane was hidden, so it was not used.
- Limits: exhibition-machine FPS, Safari/Windows unverified; proposal items 2, 3, 5 not implemented; rest-pose shadows remain.
- Next: measure on the exhibition machine; then select from items 2 (crossings), 3 (car-following), 5 (junction mouth).
- Integration: feature `708b411` pushed; merged `--no-ff` as `cdea651` (tree identical; root `npm test`, `npm run build`, committed
  `git diff --check` PASS again); fetch before push showed main 2/0 ahead of origin. Exact main
  [CI run 37497799060](https://github.com/cc100053/city2127/actions/runs/37497799060) PASS. New Markdown links checked.

### Round 11 — crossings, car-following, junction fill (2026-10-07; feature branch only, not merged)

- User selected proposal items 2, 3, 5 and asked not to merge yet. Claude implements for owner cc100053 on
  `feat/pedestrian-traffic-life` from `4eda49e` (branch/upstream and branch/main 0/0 after fetch).
- 3 Car-following: every lane slot is simulated frame to frame (`carT`, never ahead of its free `laneTravel` slot): 2 m + 0.5 s
  gap to the car ahead by loop position (measured modulo the loop, as a leader may wrap within the frame), ≤ 3 m/s² braking
  profile for a requested crossing it can still stop for, +2.5 m/s² acceleration, catch-up ≤ +30 % and ≤ 14 m/s. Brake lamps
  (now one per vehicle, `brake-lamps`) light while slowing or queued. A drop-off car wholly in its bay is no obstacle and its slot
  keeps free pace (passenger timing); from 12 m before pulling out it keeps traffic pace and waits, indicating, until no car is
  12 m behind to 20 m ahead and no slow car stands in the pull-out stretch. Reset/jump/snapshot puts cars back on their slots.
  `mobility()` now returns the update function with `traffic()` diagnostics.
- 2 Crossings (`CROSSINGS`): guideway avenue d 282 and d 480. Residents (1–2, every 70/83 s, gated by `rhythm.people`) walk 8 m
  along the footway, wait at the kerb, cross at 1.4 m/s once no car is between stop line and far side and every approaching car
  can stop at ≤ 4 m/s², then walk 8 m along the far footway. Pale band just above the paving slab, mint edge lines while
  requested. Placement evidence: the seaside avenue has no north footway (Aqua City's "Warm Ivory Structure" stands 2.3 m from its
  centre line, raycast); d 284–288 and d 640–670 have piers/overhangs; d 487 footways end at the mouth.
- 5 Junction mouth: `roadFill()` strip (d 486–507, ±3.7 m) of the environment's paving finish, added to the environment in
  `loadOdaiba`. The visible avenue surface everywhere is the sidewalk slab laid above the road layer, so the fill uses that finish.
- Defects found and fixed while testing: drop-off slot overtaking a crossing queue (lane order now by loop position), merge into a
  queue, merge beside a passing car, a car stopping every lap at the lane end (wrap within the frame), crosser pair meeting mid-turn,
  catch-up above 15 m/s, unbounded queues with crossings every 37–43 s.
- Checks: `mobility.test.ts` adds the traffic run (15 min evening with drawn crossers vs drawn car footprints; 30 min morning
  lanes/crossings/lag), crossing surfaces, and zero off-road car-edge samples with the fill (fails without it: 24/1456). A scratch
  2 h stress run (four start/hour/automation mixes) after the fixes: minimum bumper gap 2.00 m, 0 crossing conflicts, max lag 137 m.
  Root `npm test` PASS, `npm run build` PASS, `git diff --check` PASS.
- Browser (headed Chromium 151, 1400×900, Vite DEV :5174, camera set through the three.js devtools hook, live clock):
  [day crossing](../../artifacts/street-crossings/crossing-day.png), [night crossing](../../artifacts/street-crossings/crossing-night.png),
  [junction crossing](../../artifacts/street-crossings/junction-crossing.png); residents wait and cross while cars queue with brake
  lamps; junction mouth reads as continuous paving. Console: only the missing `/favicon.ico` 404. FPS NOT re-measured this round
  (the run was interrupted at the user's request); the simulation adds a per-frame sort of ≤ 28 cars per lane.
- Pre-existing, not fixed (out of scope): guideway piers stand inside lane 0 about every 50 m (d 3–5, 64–67, 192–195, 237–240,
  284–287, 358, 499, 559–628, 695–697) and solids sit in both lanes at d 639–670 (Hilton), so cars pass through them; Aqua City's
  wall is 0.1 m from seaside-avenue lane 1 car edges. Crossings are not in the hero view (geometry allows none there).
- Next: user review, then merge with validation; re-measure FPS; consider re-routing lane offsets around the guideway piers.

### Round 12 — lanes moved clear of piers and Hilton (2026-10-07; feature branch only, not merged)

- User chose widening the guideway avenue's carriageway (asked "可唔可以擴闊車道？", then approved the plan). Start `f06dc7b`, clean,
  0/0 with upstream, 1 ahead of `origin/main`.
- Evidence (Node, real GLBs, BVH probes): the Yurikamome piers stand in the right half of the 7 m surveyed road about every 50 m,
  reaching up to 0.5 m left of the centre line (0.36 m where cars are full size); Hilton's curved podium/chapel cross the whole road
  at d 627–662; the strip left of the road is paving slab (except the junction mouth); beyond the piers is lawn.
- `CARRIAGEWAY`/`laneOffset`: guideway avenue lanes at −1.65/−3.95 m (carriageway −5.1 … −0.5, widened 1.6 m onto paving), seaside
  avenue lanes 0.25 m off centre (Aqua City's wall 2.3 m right of its centre line). Guideway avenue ends at d 620 (layout point
  (−255.6, 88.6)); drop-off stops 223/273 (same road positions), bay 2.3 m beyond the lane; crossing d 282 → 286 so both
  footways stay on paving; kerbs 0.5 m beyond the carriageway; junction fill −5.2 … +3.7 m; forecourt walks keep 1.5 m off both
  the carriageway and the surveyed road.
- Checks: new `odaiba.test.ts` sweep (every lane, car body ±0.95 m at 0.5/1.2 m scaled by the end fade, 0.3 m probes in four
  directions, faces both sides) — 0 hits; fails on the old offsets. Mobility tests now require car edges on road or paving, the
  crossing surfaces and the bays at the new offsets. Scratch 2 h traffic stress: min gap 2.00 m, 0 crossing conflicts, max lag
  123 m, 147 crossings. Root `npm test` PASS, `npm run build` PASS, `git diff --check` PASS.
- Browser (headed Chromium 151, 1400×900, Vite DEV :5174 started from `.claude/launch.json` `root-5174`, devtools-hook camera):
  [pier clearance](../../artifacts/street-crossings/pier-clearance.png), [day crossing](../../artifacts/street-crossings/crossing-day.png),
  [night crossing](../../artifacts/street-crossings/crossing-night.png), [junction](../../artifacts/street-crossings/junction-crossing.png)
  (replacing round 11's captures). Console: the missing `/favicon.ico` 404, and once `TypeError: Failed to fetch` in the three.js
  loader chunk (also seen once in round 10; not traced). FPS NOT re-measured.
- Next: user review, then merge with validation and FPS on the exhibition machine.
