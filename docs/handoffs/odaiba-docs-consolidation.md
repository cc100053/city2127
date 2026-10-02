# odaiba-docs-consolidation — current Odaiba documents and closed Shibuya history

- Owner: Codex (documentation only; product decision owner cc100053)
- Status: DONE — documentation integrated on main; post-push main CI is checked and reported in the task final response
- Branch: docs/odaiba-docs-consolidation
- Base commit: 94cad605b87ddc83b626c843b77f2255b379cd2f
- Last verified commit: `f97b5ffab56aa1c20f8924d1e8f2bdbcabdd0098` (feature CI PASS); integrated as `ccb7de7a1e331654e0a27a880bfc972fd5deb211`, identical tree, local documentation checks PASS. This closure is prose only.
- Remote availability: `origin/docs/odaiba-docs-consolidation` at `f97b5ff`; main publication includes the integrated work and this closure.

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
- PASS: feature [CI 36986924378](https://github.com/cc100053/city2127/actions/runs/36986924378) on exact `f97b5ff`, all three packages test/build and whitespace.
- PASS: integrated `ccb7de7` has the feature tree; local all-file link/anchor/tracked-target check and `git diff --check origin/main..HEAD` passed after the conflict-free merge. Source and binary trees are unchanged from base.
- Main CI is verified after pushing this closure; its exact run/result is reported in the task final response to avoid a self-referencing verification commit. [Main CI history](https://github.com/cc100053/city2127/actions?query=branch%3Amain).

## Limits and next step

S5, input hardware, exhibition reset/recovery policy and unmet visual targets remain unresolved; no new acceptance/FPS claims. Historical external Shibuya map returned 403 during audit; retained as restricted/unverified historical reference. No documentation implementation work remains. After publication, verify the current main CI run; subsequent product work must use the Odaiba specification, not archived Shibuya plans.
