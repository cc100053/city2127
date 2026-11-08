# skyring-closeup-polish — Blender Sky Ring target study

- Owner: Codex (implementation); visual acceptance: project owner
- Status: IN_PROGRESS
- Branch: `feat/skyring-closeup-polish` (isolated clone `/private/tmp/city2127-skyring-polish`)
- Base commit: `cbc58cca32d11f44b2e03e71fb2bf5c71d2949c8`
- Last verified commit: `3786a24` plus the R4 kept-composition delta; checks below.
- Remote availability: `origin/feat/skyring-closeup-polish` at `3786a24`; R4 push follows this handoff.

## Session Git state

- Starting checkout: `main` at `304084d58a9541a2dde5d63f2820d01b60d6654b`, 21 commits behind fetched `origin/main`; no local-only commits.
- Origin fetch succeeded 2026-11-06; `origin/main` was `cbc58cca32d11f44b2e03e71fb2bf5c71d2949c8`.
- Original checkout contains unrelated modified and untracked files; preserved. New clean isolated clone checked out at fetched origin/main.
- Existing work: `docs/handoffs/hero-sky-ring.md`, accepted R5, integrated; its target images remain in `~/city2127-evidence/hero-sky-ring/polish/target/`.

## Goal and decisions

Use Blender to improve the Sky Ring against the owner's existing target images, preserving the production explore pod and voice count behavior. On 2026-11-06 the owner chose to enlarge the berth toward the target and to prefer the thick segmented pylon in the truss target over the conflicting thin pylon target. Visual acceptance remains with the owner.

## In-scope files and dependencies

`src/skyRing.ts`, its consumers and tests, authored Blender source/export where needed, corresponding documentation. Existing ring is procedural; `berthPark` and `guestExplore` use the moving explore pod, and voices follow guest count. Maintain the ring location and clearances.

## Completed work

- Fetched remote references; created isolated task clone. Four historical owner-selected targets located outside Git.
- Blender 5.2.2 LTS starts successfully outside the sandbox; Metal GPU Apple M6. Its MCP server was not listening. Background Blender inside sandbox exited 139.
- Historical target and R5 captures compared; current baseline and R1–R3 captures made.

## Actual validation results

- Verification status: R1 and R2 passed; R3 validation below.
- Blender background environment report: PASS outside sandbox. R3 detailed checks below; FPS NOT RUN.
- Integrated commit and checks: NOT INTEGRATED.

## Known issues and next expected step

Review R3 scored crops with owner; do not treat historical R5 validation as validation of this task.

## R1 — 2026-11-06, awaiting owner calibration

- Owner decisions: enlarge the berth toward the target; use the truss image's segmented pylon rather than the conflicting thin-pylon reference. Targets and the exact item crops are committed under `artifacts/skyring-closeup-polish/`.
- Candidate: Blender-authored pylon shell and exterior staircase (`asset/models/sky-ring-architecture/sky-ring-architecture.blend` and `.glb`); widened apron/hall, lower deck, additional residents and varied planting in `src/skyRing.ts`. The dynamic pod and proposal-count lamps remain separate. Candidate is not accepted or integrated.
- Three fresh blind judges of the latest 3200×1800 captures each scored **13/22**. Item scores: berth hall 1, apron 2, walk 1, garden 1, people 1; lower truss 1, frame 1, berth connection 1; night lamps 2, night structure 1; pylon shell 1. Full target/candidate crops and item scores: `artifacts/skyring-closeup-polish/r1/vs-target.jpg`. Raw images and Blender contact sheets: `/private/tmp/skyring-evidence/r1/` on this workstation only.
- Owner calibration 2026-11-06: 「fix score 1 items」; retain the two 2-score items and fix all nine 1-score items. Do not claim visual acceptance.
- Blender 5.2.2 LTS background on this Mac (outside sandbox), metric; editable source reopened; GLB imported into an empty scene, 24 meshes, 672 triangles, 59,948 bytes. Pylon game-profile QA passed without warnings; stair QA passed with an explicitly accepted ground-z −0.25 m warning (the support enters its deck). Material and wireframe sheets reviewed. GLB is +Y up, no Meshopt or Draco.
- Implementer reports root `npm test`, `npm run build`, `git diff --check` passed; hero night browser console had zero errors and warnings. Independent `npm run build` and `git diff --check` passed. Independent full `npm test` also passed against the R1 implementation delta.
- Important unresolved checks: widened Blender pylon shells have not been measured against every road, building, site, and hero sightline; the Node sightline test excludes asynchronously loaded Blender geometry. Upper-floor residents may not be supported, and the stair foot may not meet the curved deck. The current R1 is not production-ready. No FPS measurements or exhibition hardware checks.
- Next: R2 fixes the contact/clearance issues and all nine 1-score rubric items; compare against R1 per item before considering integration.

## R2 route decision — 2026-11-06

A real `air-taxis` wing on the shore path at legal lateral −10 m intersects `PYLONS[3]`'s negative leg: the same collision was reproduced against the pre-existing main cylindrical leg and R1 shell as well as the R2 shell. The R2 shell made contact roughly 2.4 m earlier. Owner chose **locally adjust the shore route**, retaining the thick segmented pylon. R2 must verify the adjusted real aircraft against surrounding traffic, sites, structures and every leg; do not call the route clear based on a conservative-box test or one sampled pose alone.

## R2 — 2026-11-07, visual work continuing

- Actual GLB-based clearance test reproduces the original shore/pylon collision and exercises the owner-approved local shore control-point adjustment. R2 scans 2,425 shore positions at 0.5 m across valid formation offsets and roll samples, tests real wing/pod geometry against twelve GLB legs, and checks city geometry, actor envelopes and other routes. These are finite samples, not a continuous proof. Independent complete `npm test` passed on the R2 implementation delta, including the final clearance test.
- Hall residents use hall-local coordinates; actual foot-mesh minima and both staircase connections have targeted checks. Pylon and stair game-profile QA passed; stair support local ground-z −0.25 m is an intended deck insertion warning. Source reopened; GLB reimported. Final build passed independently; diff whitespace check passed. Six final browser captures at 3200×1800 were taken; raw images and contact sheets are in `/private/tmp/skyring-evidence/r2/` (workstation only).
- Three fresh absolute judges scored 15, 15, 14 of 22 (median **15/22**). Per-item medians: hall 2, apron 2, walk 1, garden 1, people 1; lower truss 1, frame 1, berth 1; lamps 2, structure 2; pylon 1. Pairwise blind comparison: R2 pylon wins, R1 truss-berth wins because the R2 lower stair is visually intrusive, all other items tie. [Target/candidate review](../../artifacts/skyring-closeup-polish/r2/vs-target.jpg).
- R2 has not been accepted. Keep individually winning/tied regions; the R2 lower stair loss is separable, so R3 restores that area to R1 and replaces the staircase with a better-supported, unobtrusive connection without regressing the R2 pylon or owner-approved shore adjustment. R3 instructions: [spec-r3](../../artifacts/skyring-closeup-polish/spec-r3.md). FPS and exhibition hardware: NOT RUN.

## R3 composed state — 2026-11-08

- R3 replaces the visually intrusive R2 lower staircase with a Blender-authored 52-step switchback and physically connected landings, thickens the pylon shell and adds planting and upper-deck residents. After blind pairwise review, R2 lower-deck resident placement, frame nodes and lower lattice were restored; the staircase, bridge and rail openings are inseparable from the berth access and retained. The composed state was independently re-judged.
- Three fresh absolute judges of the final composed crops scored **12, 14, 13/22** (median **13/22**). Item medians: hall 1, apron 1, walk 1, garden 1, people 1; lower walk 1, frame 1, berth 1; lamps 2, night structure 2; pylon 1. Fresh pairwise judge: composed state wins hall and people, nine ties, no losses versus R2. [Full target/candidate scored crops](../../artifacts/skyring-closeup-polish/r3/vs-target.jpg); raw 3200×1800 captures and contact sheets `/private/tmp/skyring-evidence/r3/` are workstation-only.
- Blender 5.2.2: source reopened, GLB reimported, 31 meshes, 2,308 triangles and 155,740 bytes; pylon QA passed without warnings; stair QA passed with the accepted −0.22 m local ground warning for support into the lower bridge. Material and wireframe contact sheets reviewed. Browser captures show no asset-loading errors; favicon 404 remains.
- Independent `npm test`, `npm run build` and `git diff --check` passed on the R3 composed delta. The clearance test checked 154 pylon/city candidate pairs and 2,425 shore positions; these are finite samples. FPS, exhibition hardware and final owner visual acceptance: NOT RUN. No integration.
- New session 2026-11-08: original checkout main `304084d58a9541a2dde5d63f2820d01b60d6654b`, unrelated modifications preserved; original checkout `git fetch --prune origin` succeeded and fetched main `2d7c25d7797bd2e436b3d0aec03e20cddc48de7d`, 27 commits ahead of local main. R2 task branch `23830f5` is 4 commits ahead / 6 behind latest main. Isolated clone fetch failed (`pack has 104 unresolved deltas`), but original checkout successfully refreshed the remote. No automatic merge performed.
- Three rounds completed without all 2s. In accordance with closeup-polish step 7, stop after reporting the score table and full-size crops; owner chooses acceptance or a further round. Any future merge must deliberately incorporate the latest main and validate the integrated result.

## R4 owner instruction — 2026-11-08

Owner chose to continue another round and fix all nine R3 score-1 items. R4 scope and locked R3 features are in [spec-r4](../../artifacts/skyring-closeup-polish/spec-r4.md). Starting task commit `3786a245f05ed68ecdd4696b737f8c15ec979969`; remote main `2d7c25d7797bd2e436b3d0aec03e20cddc48de7d` after successful original-checkout fetch, 5 task-only / 6 main-only commits. No Sky Ring, layout, Sky Ring tests or its Blender assets changed on main since task base. Existing unrelated original-checkout modifications preserved; do not merge main automatically.

## R4 kept composition — 2026-11-08

- Owner explicitly requested a further round addressing the nine R3 score-1 items; user reaffirmed permission for in-scope work. `spec-r4.md` records the scope and locked voice items. Blender canopy, junction and thicker pylon were implemented; lower chord was opened into visible triangular members. After the first blind comparison the R4 garden lost to R3, so that isolated planting change was restored. A second blind comparison found the R4 apron won the apron item but lost the lower-angle berth item; these shared the same shell and tied one win/one loss, so the R3 shell was restored and unused R4 apron meshes removed from source/export. The discarded delta and binary copies are retained under `/private/tmp/skyring-evidence/r4/` on this workstation.
- Three fresh absolute judges on the final kept composition scored **16, 15, 17/22**, median **16/22**. Per-item medians: hall 2, apron 2, walk 1, garden 1, people 2; lower walk 1, frame 1, berth 1; lamps 2, night structure 2; pylon 1. Fresh blind pairwise versus R3: kept composition wins hall, lower walk, frame, night structure and pylon; six ties, zero losses. [Target/candidate scored crops](../../artifacts/skyring-closeup-polish/r4/vs-target.jpg). Raw captures, per-item crops and pairwise keys are at `/private/tmp/skyring-evidence/r4/kept/` (workstation-only, not a durable artifact store). Owner visual acceptance remains pending.
- Blender 5.2.2 source reopened and final GLB reimported into a clean scene: 33 mesh objects, 3,552 triangles, five scene materials, 213,664 bytes. Pylon+channels QA passed without warnings (1,548 triangles for `PylonShell`, 12 for each channel); canopy QA passed, 896 triangles, with ground-z −0.45 m warning because the roof mesh is positioned at its mounting origin; junction QA passed, 348 triangles, with ground-z −0.8 m warning because it is a joint mounted around its origin. Material/wireframe contact sheets for pylon, canopy, junction and the subsequently rejected apron were reviewed. Static GLB +Y up; no compression enabled.
- Independent geometry checks: loaded 12 pylon shells intersect their actual saddle meshes, using BVH triangle intersection; 4,320 radial 3 m walkway rays across 1,440 angles and three heights found no fixed-geometry collision (excludes moving people, finite samples only). Existing loaded-GLB city/shore clearance, 12 hero sightline, foot/support and guestExplore checks remain required. Final six 3200×1800 browser frames captured; browser reports favicon 404 as its sole console error, no model load error. Previews started for the task were closed.
- Independent `npm run build` and `git diff --check` passed. Independent complete `npm test` passed on the kept composition; targeted `skyRing.test.ts` also passed after adding assertions for the new GLB canopy and junction. No FPS/exhibition-machine measurement; sampled collision checks are not continuous proofs. The original checkout and unrelated changes remain untouched. Remote main has advanced beyond this task branch; no integration performed.
