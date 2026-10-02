# Stage 3 — Blender export and optimization standards

- Owner: Codex in the city2127 task
- Status: DONE (standards complete; see verification and publication checkpoint below)
- Branch: codex/stage3-blender-standards; integrated into main with --no-ff
- Base commit: f196b2ea2d232dce3ae75d61d40f204bb562d978
- Last verified commit: ea69b1ad5aa5a66c83c558838f2788739c37223e (local integration tests/build); no asset verification
- Remote availability: origin/codex/stage3-blender-standards at efe20cdd07ac4cecd941b3aba41a6ac73644f2a6; main publication follows this evidence update

## Goal and acceptance criteria

Provide usable manual Blender source/export, optimization and validation standards. Link them from collaboration/onboarding and distinguish future model integration from current procedural behavior. No asset pipeline, model edits, LFS, dependencies or product changes.

## In-scope files and dependencies

README.md; docs/BLENDER.md, CONTRIBUTING.md, PROJECT.md, VALIDATION.md; this handoff; `.github/workflows/ci.yml` for the new-branch comparison bug discovered during validation. Reuses the existing handoff template and Git workflow. No overlapping contributor changes found at startup.

## Completed work

Defined file pairing, ownership, portable source dependencies, coordinate/pivot conventions, GLB settings/materials, measured optimization and separate source/application validation. Updated documentation entry points. Kept historical Plan 02 records and exhibition constraints intact.

## Actual validation results

2026-09-18: local diff review, Markdown link checks and `git diff --check` passed. Checked source imports/startup and tracked model inventory against base f196b2e: procedural cityRig, no model loader or tracked blend/glb/gltf. No source/tests/assets/dependencies changed.

After the CI fix, local npm tests/build passed on merge ea69b1a (Node 26; existing >500 kB build warning). Blender, browser and performance checks: NOT RUN; no model or visual behavior changed. First branch CI: tests/build passed, whitespace failed on an unchanged skill file ([run](https://github.com/cc100053/city2127/actions/runs/35357676205)). Corrected the new-branch base selection; eight local Git cases passed, including unchanged legacy whitespace and empty-tree fallback. [Fresh Node 24 CI passed](https://github.com/cc100053/city2127/actions/runs/35357826479) on efe20cd. No merge conflicts; integration tree matches the checked branch.

## Known issues and blockers

No real model exists to exercise this recipe. No measured per-asset performance budget or first model consumer; those belong to the future asset/integration task. Export UI varies by Blender version, which each asset handoff must record.

## Important decisions

Stage 3 means the previously deferred manual standards. No export automation or arbitrary polygon limits. First branch CI exposed a Stage 2 comparison bug: whole-tree whitespace inspection flagged an unchanged skill file; fixed the shared workflow to compare new branches against the main merge base, without editing unrelated content. `.blend` and `.glb` remain in Git. Existing project scope-based autonomy covers branch publication, self-review, merge and main verification.

## Next expected step

Publication checkpoint: push main with this documentation-only evidence update and verify the resulting CI; final run result is reported in the task conversation to avoid a self-referencing commit loop. Future work: assign a real asset and its first application consumer, then exercise the manual recipe. No asset integration is included in Stage 3.

## Superseded — 2026-09-24

The future work named above happened: [future-tree-2127](future-tree-2127.md) is the first real asset and runtime consumer.
