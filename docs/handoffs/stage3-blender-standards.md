# Stage 3 — Blender export and optimization standards

- Owner: Codex in the city2127 task
- Status: IN_PROGRESS (documentation complete; publication checks pending)
- Branch: codex/stage3-blender-standards
- Base commit: f196b2ea2d232dce3ae75d61d40f204bb562d978
- Last verified commit: base plus the Stage 3 documentation working-tree delta; no asset verification
- Remote availability: NOT PUSHED

## Goal and acceptance criteria

Provide usable manual Blender source/export, optimization and validation standards. Link them from collaboration/onboarding and distinguish future model integration from current procedural behavior. No asset pipeline, model edits, LFS, dependencies or product changes.

## In-scope files and dependencies

README.md; docs/BLENDER.md, CONTRIBUTING.md, PROJECT.md, VALIDATION.md; this handoff; `.github/workflows/ci.yml` for the new-branch comparison bug discovered during validation. Reuses the existing handoff template and Git workflow. No overlapping contributor changes found at startup.

## Completed work

Defined file pairing, ownership, portable source dependencies, coordinate/pivot conventions, GLB settings/materials, measured optimization and separate source/application validation. Updated documentation entry points. Kept historical Plan 02 records and exhibition constraints intact.

## Actual validation results

2026-09-18: local diff review, Markdown link checks and `git diff --check` passed. Checked source imports/startup and tracked model inventory against base f196b2e: procedural cityRig, no model loader or tracked blend/glb/gltf. No source/tests/assets/dependencies changed.

Local npm tests/build, Blender, browser and performance checks: NOT RUN for this documentation-only task. First branch CI: tests/build passed, whitespace failed on an unchanged skill file ([run](https://github.com/cc100053/city2127/actions/runs/35357676205)). Corrected the new-branch base selection; fresh CI pending.

## Known issues and blockers

No real model exists to exercise this recipe. No measured per-asset performance budget or first model consumer; those belong to the future asset/integration task. Export UI varies by Blender version, which each asset handoff must record.

## Important decisions

Stage 3 means the previously deferred manual standards. No export automation or arbitrary polygon limits. First branch CI exposed a Stage 2 comparison bug: whole-tree whitespace inspection flagged an unchanged skill file; fixed the shared workflow to compare new branches against the main merge base, without editing unrelated content. `.blend` and `.glb` remain in Git. Existing project scope-based autonomy covers branch publication, self-review, merge and main verification.

## Next expected step

Publish the task branch, verify its CI, merge with --no-ff after rechecking origin/main, then verify main CI. Record concrete commit/run evidence without claiming Blender validation.
