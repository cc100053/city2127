# exhibition-mvp-plan — 2127 baseline and agent implementation specification

- Owner: Codex
- Status: IN_PROGRESS — specification and documentation checks complete; Git integration pending
- Branch: `codex/exhibition-mvp-plan`
- Base commit: `535a3c059302ac6c1059d84aef663b06510ac04c`
- Last verified commit: base `535a3c059302ac6c1059d84aef663b06510ac04c` plus the seven-file documentation delta checked on 2026-09-28; commit verification follows below
- Remote availability: NOT PUSHED
- GitHub Issue: none

## Session Git state

- Started on clean `main` at `535a3c059302ac6c1059d84aef663b06510ac04c`.
- Successfully fetched origin on 2026-09-28; `origin/main` was the same commit, divergence 0/0.
- No pre-existing local changes or screenshots changed; `.codegraph/` absent.
- Stage 1/2/3 site/GLB handoffs are already integrated through `17be43c`, reachable from the base; no unfinished prerequisite branch is required.
- Upstream integration initially unnecessary; re-fetch before publishing/integration.
- Ownership limited to the new plan/handoff and documentation pointers; no overlapping module or binary edits.

## Goal and acceptance criteria

Write the prior design as a self-contained, detailed agent-oriented plan under `docs/`, incorporating the user's correction that every starting/low/neutral/high city is already futuristic 2127. Separate implemented baseline, latest user constraint, proposed runtime, staged work and unexecuted acceptance checks.

## In-scope files and dependencies

- `docs/EXHIBITION_MVP.md`, this handoff.
- `AGENTS.md`, `README.md`, `docs/PROJECT.md`, `docs/PLAN02.md`, `docs/VALIDATION.md`: dated direction/entry-point/status synchronization only.
- Excluded: runtime code, dependencies, questions JSON, database, GLB/.blend, assets, screenshots, deployment. No implementation stages executed.

## Completed work

- Recorded full four-question content, Meter meaning, accumulation formula/fixtures, 12 local configurations, nonempty 2127 baseline, future-looking negative variants, asset budgets and realistic scope.
- Defined agent source/caller map, atomic proposal/replay/version migration, existing UNIQUE constraint, root/module-swap compatibility, fallback/count behavior, explicit phases and observable acceptance gates.
- Preserved previous implementation/history statements; added dated next-version notes so a future agent cannot confuse this plan with running code.
- No duplicate current architecture document; PROJECT remains the implementation map.

## Actual validation results

- Verification status: PASSED for local documentation checks
- Source/fact inspection: base commit; current scoreEngine/cityView/changeCatalog/schema and prior Stage 1/3 handoffs checked.
- Local Markdown targets: 205 existing file targets checked. Numerical fixtures: 1/5/20/50 same-direction, reversal51, cohorts10/30/50 and 1,000 zero/alternating/cyclic votes passed in a Python assertion script. Exact documentation diff/new-file contents reviewed; `git diff --check` passed.
- Local package tests/builds, browser, GPU FPS, exhibition PC and user study: NOT RUN (documentation-only task; no new runtime).
- Integrated commit/checks: NOT INTEGRATED.

## Known issues and decisions

- New algorithm, four-question flow, populated neutral sites and negative variants are PLANNED, not shipped behavior.
- All-low/all-neutral/all-high must remain 2127; older one-question and empty-site records remain historical/current runtime until a separately assigned implementation migrates them.
- First visible implementation slice uses the complete four-question transaction but implements Q3's visuals first; it must not create a competing one-question v2 schema.
- Exhibit hardware and day-to-day run policy remain open; local desktop implementation can proceed under a future assignment without inventing LAN/deployment scope.

## Next expected step

Finish repository Git/CI integration; local documentation checks and self-review have passed. A later implementation task should start at S1 in [the plan](../EXHIBITION_MVP.md), naming its owner; this task does not initiate implementation.
