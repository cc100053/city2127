# street-life — Pedestrian and street-traffic polish

- Owner: cc100053
- Status: IN_PROGRESS
- Branch: feat/pedestrian-traffic-life
- Base commit: 9476fd8b82da523d6f7acee6f1893e5028fb35a0
- Last verified commit: d899a9b831d0978d2039cc60e4d8959e971131ec (round 4: tests/build/diff-check; headless bench captures at 6 m on the same tree before commit)
- Remote availability: origin/feat/pedestrian-traffic-life @ d899a9b831d0978d2039cc60e4d8959e971131ec

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

## Actual validation results

- Verification status: PARTIAL
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
