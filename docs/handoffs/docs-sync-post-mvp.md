# docs-sync-post-mvp — Post-MVP documentation sync and package CI

- Owner: cc100053
- Status: DONE — merged into `main` with `--no-ff`
- Branch: `docs/sync-post-mvp`
- Base commit: `c2d6ebc139ada1122b393848153cd6a791dbcc62`
- Last verified commit: `398477e` (branch CI passed); later commits are documentation only
- Remote availability: `origin/docs/sync-post-mvp`
- GitHub Issue (optional): none

## Session Git state

- Session starting branch and HEAD: `main` at `c2d6ebc139ada1122b393848153cd6a791dbcc62`
- Last fetched origin/main commit: `c2d6ebc`, fetched 2026-09-24; 0/0 divergence
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Fix documentation that still said the question flow, accumulation, persistence and production models were unimplemented, after the causal MVP (2026-09-24) and future tree (2026-09-23) landed. Record the user's 2026-09-24 decisions, and make CI cover `survey/` and `module-swap/`. Historical records keep their text and get dated superseding notes.

## In-scope files and dependencies

`AGENTS.md`, `README.md`, `docs/PROJECT.md`, `docs/PLAN02.md`, `docs/VALIDATION.md`, `docs/BLENDER.md`, `docs/CONTRIBUTING.md`, `survey/README.md`, handoffs (blender-shibuya-pipeline, stage2-ci, stage3-blender-standards, survey-state-mvp, city-module-swap, causal-city-mvp), `.github/workflows/ci.yml`. No source, test, asset or dependency changes.

## Completed work

- Replaced "not implemented / documentation-only stage" statements with the MVP's actual state; scoped "no backend or persistence" to the root prototype; corrected the `modelAssets.ts`, BLENDER and CONTRIBUTING claims that no loader or production model exists; fixed the default question file in `survey/README.md`.
- Reworded AGENTS' authorization sentence: MVP mechanisms are implemented; exhibition questions, exhibition-day reset/recovery, input hardware and root preset changes still need an assigned task.
- Recorded the user's decisions (2026-09-24): next direction is to extend the causal MVP (more questions, more scenes/areas and objects, visible city change, polished look); clarified afterwards: the exhibition city is the root Shibuya scene, which is built and extended first (see [root-scene-direction note in PROJECT.md](../PROJECT.md#current-product-direction--2026-09-18)). The combined `CityState` plan was deleted.
- VALIDATION: split the exhibition acceptance list into MVP-checked / partly / not checked; moved the 09-23 Blender import subsection out from under the 09-18 Stage 3 heading; moved the misplaced future-tree note in PLAN02 into the current-direction section.
- CI: added `survey` and `module-swap` install/test/build steps, npm cache keyed on all three lockfiles, timeout 10 → 15 minutes. Root `npm test` itself is unchanged.

## Actual validation results

- Verification status: PASSED
- Date and checked commit/worktree: 2026-09-24, uncommitted worktree on `c2d6ebc`, Node v26.0.0, macOS
- Commands/manual checks and results: the new CI steps run locally: `survey` `npm ci && npm test && npm run build` passed; `module-swap` `npm ci --prefix app && npm test && npm run build` passed (existing >500 kB warning). Root `npm test` (7 PASS lines) and `npm run build` passed. `git diff --check` clean. 150 local Markdown links across root, docs, handoffs and package READMEs resolve (once this handoff exists).
- Evidence/environment: none beyond command output
- Integrated commit and checks: NOT INTEGRATED
- Remote: [branch CI](https://github.com/cc100053/city2127/actions/runs/35998133060) passed on `398477e` (Node 24; root, survey, module-swap and whitespace steps all green).
- Changes since verification: this handoff and the VALIDATION CI entry (documentation only)

## Known issues and blockers

- CI does not run module-swap's browser smoke test (`tests/browserSmoke.mjs`); it needs Chrome and a dev server.

## Important decisions

- Handoffs and dated VALIDATION entries are history: added "Superseded — 2026-09-24" notes rather than rewriting them, except where the user asked to delete the combined `CityState` plan.
- CI covers the sub-packages with workflow steps rather than chaining them into root `npm test`, so root scripts stay owned by the root prototype.

## Next expected step

Merged; main CI result is reported in the task conversation to avoid a self-referencing commit. Next: open a task handoff for extending the causal MVP with a named owner.
