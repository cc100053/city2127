# art-direction — Art rules and a polished pilot area for the root Shibuya scene

- Owner: cc100053
- Status: IN_PROGRESS
- Branch: feat/art-direction
- Base commit: 5894f872be1e35d759178786bfe2a2949b190b17
- Last verified commit: NONE (task opened; no code changed)
- Remote availability: origin/feat/art-direction (handoff commit)
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: main 5894f872be1e35d759178786bfe2a2949b190b17
- Last fetched origin/main commit: 5894f872be1e35d759178786bfe2a2949b190b17 (2026-09-24)
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

Task opened: this handoff and the dated decision note in [PLAN02.md](../PLAN02.md). No code changed.

## Actual validation results

- Verification status: NOT RUN
- Date and checked commit/worktree: NONE
- Commands/manual checks and results: NOT RUN
- Evidence/environment: NONE
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: NONE

## Known issues and blockers

- Performance budget is unknown: the exhibition PC's GPU is not specified. Current baseline (2026-09-17, 1280×720) was ~60 FPS, ~120 draw calls; heavier materials and post-processing must be measured, not assumed.
- Chrome extension browser automation was unavailable on 2026-09-24; headless checks use Playwright CLI (SwiftShader), which is fine for screenshots but not for FPS.

## Important decisions

- Direction: Plan 02 / Pic 2, higher art quality; procedural first (user, 2026-09-24).
- Order: rules → pilot area → user review → roll out → then new areas and questions.
- The survey change sites (steps 1–3, `?survey`) keep their positions and behaviour; only their look is restyled.

## Next expected step

cc100053 / agent: draft `docs/ART.md` from Pic 2 and the Plan 02 open gaps (PLAN02 "視覺驗收：哪些還未過"), take the "before" screenshots, then build the pilot area.
