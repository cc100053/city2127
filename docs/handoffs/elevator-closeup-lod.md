# elevator-closeup-lod — 軌道升降機中距離近景 LOD

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — owner accepted the near LOD after R3; R4 explore wiring done, visual acceptance pending
- Branch: `feat/elevator-closeup-lod`
- Base commit: 27899d543bbb5ae468875033e0616fdff9cd7906
- Last verified commit: R4 commit on `feat/elevator-closeup-lod` (checks below ran on the committed tree)
- Remote availability: origin/feat/elevator-closeup-lod

## Session Git state

- Session starting branch and HEAD: main @ 27899d543bbb5ae468875033e0616fdff9cd7906
- Last fetched origin/main commit: 27899d5 (2026-11-02), local main 0/0 with origin
- Local changes present at session start: untracked `.playwright-cli/`, `.task-relay/`, `artifacts/*` of other tasks (preserved, not committed)
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria (owner 2026-11-02, scope Q1–Q4 accepted)

- A mid-distance close-up LOD of the far space elevator ([far-landmark](far-landmark.md)), made with the [closeup-polish](../../.agents/skills/closeup-polish/SKILL.md) workflow (Gemini targets first).
- Q1: the near model is built lazily and swapped in only while the elevator explore look is active; hero keeps the accepted R6 silhouette and its FPS.
- Q2: one authored pose, day and night.
- Q3: life — climber pods move on the tether, craft dock at the station; a three-step Japanese caption in the Sky Ring explore format.
- Q4: in scope — the second iPad button (軌道エレベーターを見る) and an explore target `space-elevator` beside `sky-ring`.
- Owner alone accepts the look.

## In-scope files and dependencies

`src/spaceElevator.ts`, `src/guestExplore.ts`, `src/main.ts`, survey `exploreService.ts`, protocol, `guestDebugView.ts`, `tests/spaceElevator.test.ts`, explore tests. No new dependency.

## Completed work

- DEV `cityPose([x,y,z],[tx,ty,tz])` in `main.ts`: a free review camera held every frame (routed through the `devShot` pose, so OrbitControls' distance/district clamps no longer pull it back).
- Diagnosis captures `artifacts/elevator-closeup-lod/diagnose/` (1600×900, `?hour=14` / `21`).

## Diagnosis (2026-11-02)

| Pose | Distance to elevator | Finding |
| --- | --- | --- |
| A–D | 1.2–3 km | The station is 2.8 km across: the frame shows only its underside. Too close. |
| F, G, H | 4–4.5 km, camera r ≈ 2.3–3.5 km from origin | Camera outside the curvature plate (`EARTH.plate` 1600 m): the sea reads as a bright convex dome. Broken. |
| E, E1–E3 | ≈ 5.5 km, camera r ≈ 1.5 km (inside the plate) | Sea, horizon and the sinking base read as in hero. Usable. |

Constraint: **the camera stays inside r < 1600 m**, so the curvature needs no change; "mid-distance" means ≈ 5.5 km.

Chosen pose **E1**: position (676, 120, 1339), target (3130, 620, 6200) (rendered y, after the 476 m curvature drop). Station centred, bridge left, ferries in the foreground. Baseline `baseline/day.png`, `baseline/night.png`.

Symptoms at E1, cause:

| Symptom | Cause |
| --- | --- |
| Flat cardboard look | `MeshBasicMaterial` with one fixed fake key light (`shaded`) |
| Daytime ghost, melts into the sky | Body colour = fog colour × .86 every frame, no fog, no real light |
| No detail on deck sides, tether, pods | R6 geometry sized for a 7.5 km silhouette |
| Column ends in haze, no anchor | Base island sinks behind the horizon (correct, keep) |
| Bright horizontal streak across the column | City ambient light streaks at that height (check in spec) |

## Actual validation results

- Verification status: NOT RUN (diagnosis captures only)

## Known issues and blockers

- Gemini targets need Claude in Chrome connected and the owner signed in to Gemini.

## Important decisions

- 2026-11-02 owner accepts scope Q1–Q4 (above).
- 2026-11-02 Opus: pose E1, camera inside the curvature plate.
- 2026-11-02 owner: targets = Gemini day-1 / night-1 (`target/`); elevator position unchanged, the targets' column foot in the sea is not followed (base keeps sinking behind the horizon).
- Rounds: R1 near model + DEV toggle only; R2 explore wiring (spec after R1 is accepted). Spec: `artifacts/elevator-closeup-lod/spec.md`.

## Next expected step

R1: Sonnet implements `spaceElevatorNear` per spec, captures `r1/`; Opus reviews; owner judges `r1/vs-target.jpg`.

## R1 (2026-11-02)

- Sonnet implemented `spaceElevatorNear(scene, far)` in `src/spaceElevator.ts` (lazy build, 6 baked batches + 3 unbaked climbers, lit `MeshStandardMaterial`, own height haze, no fog/shadows/AO), DEV `cityElevatorNear(on)` / `?elevatorNear`, test asserts. Deviation from spec: window band sits 3 m proud between 6 m lips (−8 m buried it); undersides darkened up to 40% in the shader.
- Checks (Opus rerun): `npm test` exit 0, `npm run build` exit 0, `git diff --check` clean. Hero without the flag shows the R6 silhouette (`r1/hero-check.png`). FPS NOT RUN.
- Evidence `artifacts/elevator-closeup-lod/r1/` (`vs-target.jpg`).
- Opus review vs targets: silhouette, spokes, stepped decks, collars and amber night band match. Off: day too pale and hazed (underside, column channels low contrast); night underside too bright grey-blue (target dark navy); mint bay dashes weak; climbers read as amber blobs on the tether (target: slim pods beside it); no visible terrace green; a city light streak crosses the night frame behind the station.

## R2 (2026-11-02)

- Spec R2 (`spec.md`): less station haze, darker undersides, column slots + pilasters, night body ×(1 − .6·dark), 48 bigger mint dashes (×2.5 at night, offset half a step off the bays), slim climbers on the rails, terrace clumps at the deck edges. Only `src/spaceElevator.ts` changed.
- Checks (Opus rerun): `npm test` exit 0, `npm run build` exit 0, `git diff --check` clean. Hero unchanged (`r2/hero-check.png`). FPS NOT RUN.
- Opus review (`r2/vs-target.jpg`): day now reads as a solid lit volume with a green rim; night underside dark navy, mint dashes read. Still off: day underside slightly too blue-grey; green rim heavy and dark; night amber band thicker and flatter than the target; lower column vanishes in the night haze; climbers small.

## R3 (2026-11-02, owner: one more polish round)

- Spec R3: darkness-dependent underside darkening (.42 → .65) with desaturated undersides, lighter sparse tufts on three deck edges, thinner window bands with mullions (night emissive .75), night haze halved, longer climbers with six window rings. Only `src/spaceElevator.ts` changed.
- Checks (Opus rerun): `npm test` exit 0, `npm run build` exit 0, `git diff --check` clean. Hero unchanged (`r3/hero-check.png`). FPS NOT RUN.
- Opus review (`r3/vs-target.jpg`): day underside now neutral grey, window bands read as segmented glass; night column a dark navy shaft with mint collars, band segmented and thinner. Off: tufts now too sparse (overcorrected from R2); climbers still read as ring stacks, not long amber capsules; day bands pale blue-grey (target dark navy glass); bays still plain blocks.

## R4 (2026-11-02, explore wiring; owner accepted the R3 polish)

- Explore target `space-elevator` beside `sky-ring`: `EXPLORE_TARGETS` (protocol), `POST /api/explore` (unchanged rules: one guest at a time across both landmarks; the holder may switch landmark), guest handoff shows 軌道エレベーターを見る next to 空の環を見る (same 20 s window, buttons only), `surveyView.parseExplore`, `main.ts`.
- `GuestExplore` takes an `elevatorLook(on)` callback: on → `spaceElevatorNear.setActive(true)` and `regional-air-trails` hidden. The bright horizontal streak behind the station is an ambient sky-corridor lane seen edge-on at E1; the whole trails layer is hidden during the look (craft keep flying), restored afterwards. 戻る keeps the near LOD through the 2 s return and swaps at hero; a live result/snapshot interrupt swaps at once.
- Pose `EXPLORE_SHOTS.elevator` = E1. Fly 2 s, then hold while three 4 s steps loop; reduced motion holds E1 with all steps.
- Copy `ELEVATOR_COPY` (owner may edit): title 軌道エレベーター · 空への駅; steps 昇降機が宇宙へ向かう / 中継駅で乗り換え、街から軌道へ / 駅の灯りが、街と宇宙を結ぶ. Step 3 replaces the Sky Ring's voice-node line: the elevator has no voice nodes, so no new mechanic was invented. Alternatives for the owner: 宇宙で働く人も、この街の住民 / 軌道から、この街を見守る.
- DEV `cityExplore(ordinal, 'space-elevator')`, `?meters&explore=<n>&exploreTarget=space-elevator&exploreAt=<s>`.
- Checks: root `npm test`, `npm run build`; survey `npm test`, `npm run build`; `git diff --check` PASS. Browser evidence and FPS: [VALIDATION](../VALIDATION.md) entry "Elevator explore R4", `artifacts/elevator-closeup-lod/r4/`.
- NOT RUN: headed vsync FPS, iPad button end-to-end with `survey dev:auto`, live-result interruption in the browser, exhibition machine.

## Next expected step

Owner judges `r4/` (day/night step captures, hero check) and the step-3 copy. On acceptance: merge to main per CONTRIBUTING, confirm main CI.
