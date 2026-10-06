# street-life — Pedestrian and street-traffic polish

- Owner: cc100053
- Status: IN_PROGRESS
- Branch: feat/pedestrian-traffic-life
- Base commit: 9476fd8b82da523d6f7acee6f1893e5028fb35a0
- Last verified commit: 50ac74a (round 7: tests/build/diff-check; clash census and headless hero on the same tree before commit)
- Remote availability: origin/feat/pedestrian-traffic-life @ 50ac74a

## Session Git state

- Session starting branch and HEAD: main, 9476fd8b82da523d6f7acee6f1893e5028fb35a0, clean
- Last fetched origin/main commit: 9476fd8b82da523d6f7acee6f1893e5028fb35a0 (fetched 2026-10-06)
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED (branched from current origin/main)
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
