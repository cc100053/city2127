# Stage 2 — Minimal CI

- Owner: Codex in the current city2127 task
- Status: DONE (implementation published and main CI passed)
- Branch: main (user explicitly requested direct publication)
- Base commit: 3d670b505c3730e7615caa02b68e3f4b435aa6a2
- Last verified commit: 2b0e8cc46a88f3c1f1382ce7d5efe3f2a285a4c3 (GitHub main CI passed)
- Remote availability: origin/main includes 2b0e8cc46a88f3c1f1382ce7d5efe3f2a285a4c3

## Goal and acceptance criteria

Configure branch-push and optional-PR CI on Node 24 for `npm ci`, `npm test`, `npm run build` and committed-diff whitespace. Distinguish configuration from remote verification. No branch protection or deployment.

## In-scope files and dependencies

`.github/workflows/ci.yml`, `AGENTS.md`, `README.md`, `docs/CONTRIBUTING.md`, `docs/VALIDATION.md` and this handoff. Depends on the existing tracked lockfile and Stage 1 collaboration documentation included in the same publication. Preserve Stage 1 edits including PLAN02 and the handoff template. No source, tests, assets or dependency changes.

## Completed work

Added the workflow and updated collaboration/validation instructions. Self-reviewed the Stage 2 delta separately from Stage 1. New-branch pushes check the full tracked tree; ordinary pushes/PRs use event base commits.

## Actual validation results

2026-09-18, local Node 26.0.0 / npm 11.12.1:

- PASSED: `npm ci --offline`, `npm test`, `npm run build` (existing >500 kB warning).
- PASSED: local YAML parsing, six temporary Git-repository cases executing the workflow shell (valid/invalid whitespace for normal, empty and zero bases), diff whitespace and local Markdown links.
- PASSED: GitHub runner / Node 24 install, tests, build and whitespace ([run](https://github.com/cc100053/city2127/actions/runs/35356530469)).
- NOT RUN: actionlint, optional PR/new-branch remote events and browser checks (no visual changes).
- Integration: 2b0e8cc committed directly to main and pushed as explicitly requested.
- Changes since runtime verification: documentation/handoff only; checked separately.

## Known issues and blockers

Main-push CI passed; optional PR/new-branch remote events remain untested. The user subsequently explicitly authorized review, commit of Stage 1 + 2 and push to main; this supersedes the initial publication restriction. The linked remote run establishes Node 24 runner success for the published commit.

## Important decisions

PR remains optional. No new dependencies, CI framework, deployment or branch protection. CI cannot replace visual checks. Existing Stage 1 files were preserved and only the affected CI passages extended.

## Next expected step

Publish this documentation-only evidence update and check its main CI run. Stage 3 Blender standards remain a separate, unassigned task. See [validation](../VALIDATION.md) and [Git workflow](../CONTRIBUTING.md).

## Superseded — 2026-09-24

The new-branch rule above (check the full tracked tree) was replaced in Stage 3 by a merge-base comparison, and the "next step" publication is long complete. On 2026-09-24 CI was extended to install/test/build `survey/` and `module-swap/` ([docs-sync-post-mvp](docs-sync-post-mvp.md)).
