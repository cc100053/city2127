# elevator-closeup-lod — 軌道升降機中距離近景 LOD

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — diagnosis done, Gemini targets next
- Branch: `feat/elevator-closeup-lod`
- Base commit: 27899d543bbb5ae468875033e0616fdff9cd7906
- Last verified commit: NONE
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

## Next expected step

Write `artifacts/elevator-closeup-lod/prompts.md`, generate day/night Gemini candidates into `gen/`; owner picks winners into `target/`.
