# odaiba-docs-consolidation — current Odaiba documents and closed Shibuya history

- Owner: Codex (documentation only; product decision owner cc100053)
- Status: IMPLEMENTED; local documentation checks PASS, feature/main CI and integration pending
- Branch: docs/odaiba-docs-consolidation
- Base commit: 94cad605b87ddc83b626c843b77f2255b379cd2f
- Last verified worktree: documentation delta on base `94cad605b87ddc83b626c843b77f2255b379cd2f` (2026-10-02); exact implementation commit recorded after publication
- Remote availability: NOT PUSHED

## Session Git state

2026-10-02: repository confirmed; clean main at base. `git fetch --prune origin` succeeded; main/origin-main 0/0. Created the task branch from verified main. No unrelated files, source or binary assets edited; sole documentation owner, no overlapping module/asset changes.

## Goal and decisions

Apply the 61-file audit and consolidate current docs. User explicitly confirms Shibuya is old and will not be developed again. Odaiba is the sole venue; archived incomplete Shibuya plans cannot seed new tasks. Preserve dated evidence, assets/screenshots, task ownership and distinct stage handoffs.

## Completed work

- Current specification, architecture, art, package guides and three-language startup separated by responsibility.
- PLAN02 archived as SHIBUYA_PLAN02; MVP moved to history and replaced by EXHIBITION_SPEC; ODAIBA_PLAN renamed to completed VENUE_TRANSITION.
- Full old architecture/art/validation snapshots preserve original dated text and deep links; current validation uses executable Odaiba/single/A-B checks.
- Document index, R01–R06 navigation, corrected handoff closure metadata and local path/anchor fixes.
- Four skill reference links corrected with approved access to the otherwise read-only `.agents` directory; Dream Loop workflow was not invoked.

## Actual validation results

- PASS: all 67 Markdown documents / 1,029 local links, including file existence, Markdown anchors and tracked/new-target checks (`python3 /private/tmp/check-city-docs.py`).
- PASS: renamed-path/reference search and diff whitespace. Old names remain only as explicit history paths/labels; no deleted-path target survives.
- PASS: source facts checked against main base: schema7/default questions, v2 reducer/mapping/API, hero camera/orbit, six landmark GLBs/civic core, connected backdrop, compositor/PMREM, district capacities and single/A-B timing.
- PASS: archived heading inventories and image targets preserved; all task changes are Markdown only. Archived Plan02 source links pinned to verified stage-5 commit `676f5ab`.
- PASS: exact current/new-file content and task diff self-reviewed. No runtime/asset changes; local npm tests/build/browser NOT RUN for this documentation task. CI still validates all three packages on publication.
- Pending: feature CI, integrated result checks and main CI.

## Limits and next step

S5, input hardware, exhibition reset/recovery policy and unmet visual targets remain unresolved; no new acceptance/FPS claims. Historical external Shibuya map returned 403 during audit; retained as restricted/unverified historical reference. Finish link/fact checks, review complete diff, push feature CI, integrate and verify main CI.
