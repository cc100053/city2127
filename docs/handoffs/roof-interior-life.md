# roof-interior-life — People on roofs and inside buildings

- Owner: cc100053
- Status: COMPLETE (merged to main 2026-10-08 as dc03930; exhibition-machine FPS open)
- Branch: feat/roof-interior-life
- Base commit: 051614fe6b5ea5d414b1208725061787a185962e
- Last verified commit: 1ae894224a07987d4dc3e58c933aa610849c6135 (identical to the checked worktree)
- Remote availability: origin/main contains dc03930; feature branch deleted locally and on origin

## Session Git state

- Session starting branch and HEAD: detached HEAD at 051614f (= origin/main); switched to main after removing a clean Codex worktree
  that held it, fast-forwarded main 6 commits to 051614f, branched from there
- Last fetched origin/main commit: 051614fe6b5ea5d414b1208725061787a185962e (fetched 2026-10-07/08)
- Local changes present at session start: untracked `.playwright-cli/` only (preserved)
- Upstream integration status: merged --no-ff into main as dc03930 (origin/main unchanged since base, no conflicts)
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

User request (2026-10-07): polish pedestrian movement on building roofs and inside buildings — P1 roof terraces ("a few people per
roof"), P2 Fuji TV forum/gallery, P3 interior life, and make the Fuji TV studio staff and theatre audience move. Acceptance: people
on roofs and in Fuji TV move or interact; nobody stands in geometry, floats or walks through anyone; existing tests/build pass.

## In-scope files and dependencies

New `src/occupants.ts`; `src/civicCore.ts` (people moved out of the baked chassis into an `occupants` list — this file's art passes
belong to the Fuji TV polish handoff, coordinate before further art edits), `src/odaibaScene.ts` (publishing), `src/cityRig.ts`
(frame update), `src/mobility.ts` (exports `crowdShare`, `yawTo`), `src/main.ts` (DEV `&at=` review aim), `tests/odaiba.test.ts`,
`docs/PROJECT.md`, `docs/VALIDATION.md`.

## Completed work

- `occupantFleet`: one `building-occupants` instanced pedestrian fleet (shared figures, gait/social shader, collar light), rebuilt as
  buildings publish; presence follows `streetRhythm(hour)` and the crowd share, wholly on/off per person.
- Fuji TV: seated desk staff (glance/type), standing staff/crew/presenters and public crowds in conversation groups (`talkGroups`),
  forum bench visitors now seated on the benches (they previously floated 2 m beside them), audience following the stage with a shared
  applause every 50 s, aisle strollers on every wing work floor and mezzanine, forum (5), ring (2) and beam-top (2) strollers, and
  escalator riders that actually climb.
- Existing geometry clashes found by the new checks and avoided: four forum figures stood inside the escalator incline (removed); the
  incline passes through the forum slab, under the upper incline's truss and through the transfer beam (riders hidden there); level-24
  aisles stop short of the forum's outer rail, which runs through the wing floors; the beam-top lanes start clear of the spine truss.
- Roofs: `publishRoofWalks` per roof-garden terrace — stroll line (single or abreast pair, resting facing the view or each other) plus a
  standing group, outside planter/meadow/sail-post envelopes on raycast roof with 1.5 m margin.
- P3 decision: landmark GLB facades are opaque shader glass with no interior, so "people seen through lobby glass" cannot be shown
  there without a facade/interior rebuild; interior life is implemented where real glazing exists (Fuji TV).

## Actual validation results

- Verification status: PARTIAL
- Date and checked commit/worktree: 2026-10-08, uncommitted worktree on 051614f
- Commands/manual checks and results: root `npm test` PASS, `npm run build` PASS (includes `tsc --noEmit`; existing >500 kB warning),
  `git diff --check` PASS. New `odaiba.test.ts` checks: every Fuji spot on floor/seat with headroom, every lane/ride sample (shown part)
  supported and ≥ 0.8 m (seated 1 m) from placed people, lanes ≥ 0.95 m apart; Aqua City/DECKS roof residents (32 strolls, 69
  standing) on open roof, out of planting/meadow/posts; runtime fleet of 1084 occupants at hours 12/21 and automation 0/1 over 150 s:
  full size or absent, no jumps, strollers never step in place.
- Evidence/environment: headless Chrome 154.0.8037.98, 1400×900, Metal requested, Vite DEV — `artifacts/roof-interior-life/`
  (Fuji wing dusk, theatre, forum day); Aqua City roof checked in the built-in pane. One 404 console message (resource not identified).
- Integrated commit and checks: dc03930 — root `npm test`, `npm run build`, `git diff --check` PASS; main CI run 37649905218 PASS
- Changes since verification: NONE (full suite, build and diff check rerun after the aisle-length fix: PASS).

## Known issues and blockers

- About 1100 extra instanced people (~1.2k triangles each, shadow-casting). Development Mac headless Chrome hero view (`?hour=18&meters=nw:low`,
  1400×900, two 6 s samples each, same session): main 35.3/34.7 fps vs branch 32.3/31.4 fps (~9 % slower; a later repeat overlapped
  `npm test` and is discarded). Not exhibition evidence; exhibition-machine FPS NOT RUN.
- Landmark (GLB) interiors: none — see P3 decision.
- Roof terraces on CTX towers / Nikko / DiverCity are published at runtime but not covered by the native test (Aqua/DECKS only).

## Important decisions

- Scope chosen by the user: P1–P3, a few people per roof, Fuji studio staff and audience must move.
- Fuji figures change from charcoal silhouettes to the shared clothed pedestrian figure (consistent with street crowds).

## Next expected step

Measure FPS on the exhibition machine (owner cc100053). Archive this handoff when no longer active.
