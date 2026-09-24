# art-direction — Art rules and a polished pilot area for the root Shibuya scene

- Owner: cc100053
- Status: IN_PROGRESS
- Branch: feat/art-direction
- Base commit: 5894f872be1e35d759178786bfe2a2949b190b17
- Last verified commit: see Actual validation results (pilot commit on feat/art-direction)
- Remote availability: origin/feat/art-direction (handoff commit)
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: feat/art-direction 81e1dfa5cde040f56511a76bd3b3db1055908a90 (pilot session, 2026-09-24; clean and in sync with origin/feat/art-direction)
- Last fetched origin/main commit: 5894f872be1e35d759178786bfe2a2949b190b17 (2026-09-24; main has not moved since the task base)
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

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

Task opened: this handoff and the dated decision note in [PLAN02.md](../PLAN02.md).

Pilot (2026-09-24):

- The [ART.md](../ART.md) draft covers palette and material roles, massing, detail by distance, greenery, glass and light, signage and ambient data, actors, and how a survey change reads. It is linked from PROJECT and PLAN02.
- `cityRig.ts`: `glass`/`leaf`/`stone` materials, `arc()` (rings, arcs, discs via `ExtrudeGeometry`), `shrubs()` (own hash, so the city seed sequence and distant skyline are unchanged) and `bake()` (the static material merge, now shared). QFRONT: a curved media drum replaces the flat 渋谷/2127 signs and the dark panel on the crossing face; the lobby and window bands are silvered glass; planted terraces sit on the crossing and east faces. Hachiko plaza: stone disc, mint ring, planter rings with shrubs (open NW to the crossing and E to the station), curved bench and round plinth; the square bench at `(8,20)` was removed.
- `surveySites.ts`: the SW commons is restyled (round plaza, planted ring open east, ringed canopy on six columns, curved benches). All four sites get the saffron guest outline, which pulses for 10 s after a live change but not on snapshot restore. Parts and park trees are baked per material.
- `main.ts`: 4× MSAA composer target and a GTAO pass.
- Site positions, footprints, rise/sink behaviour, camera and presets are unchanged.

## Actual validation results

- Verification status: PARTIAL — code checks and screenshots done; real-GPU FPS not measured; user art review pending
- Date and checked commit/worktree: 2026-09-24, pilot worktree on feat/art-direction (commit recorded in git log)
- Commands/manual checks and results: `npm test` PASS, `npm run build` PASS (existing chunk-size warning), `git diff --check` clean; Playwright 1280×720 before/after in preset and `?survey` modes, live-change outline check — see [VALIDATION](../VALIDATION.md#art-direction-pilot--2026-09-24)
- Evidence/environment: `artifacts/art-before-*.png`, `artifacts/art-pilot-*.png`; headless SwiftShader stats only
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: NONE

## Known issues and blockers

- Performance budget is unknown: the exhibition PC's GPU is not specified. Current baseline (2026-09-17, 1280×720) was ~60 FPS, ~120 draw calls; heavier materials and post-processing must be measured, not assumed.
- Chrome extension connected on 2026-09-24 (M1 Pro, ANGLE Metal), but the tab was `hidden`, so no frames rendered and window resize was ignored. FPS at 1280×720 and 1920×1080 still needs Chrome in the foreground; the measurement harness is an iframe of exact CSS size on a same-origin page. GTAO doubles draw calls (preset 170 → 337); drop it if the real-GPU numbers do not hold.
- Hachiko plaza is mostly hidden by the koban and station at the hero pose; only its NW half (planter, shrubs, plinth) reads. Moving it would change the landmark relationship, so it is left for user review.

## Important decisions

- Direction: Plan 02 / Pic 2, higher art quality; procedural first (user, 2026-09-24).
- Order: rules → pilot area → user review → roll out → then new areas and questions.
- The survey change sites (steps 1–3, `?survey`) keep their positions and behaviour; only their look is restyled.

## Next expected step

cc100053: measure FPS/draw calls in foreground desktop Chrome at 1280×720 and 1920×1080 (preset and `?survey` with all sites), then give the art review of the pilot screenshots. After approval, roll ART.md out to MAGNET, the other shops and the NW/NE/SE sites.
