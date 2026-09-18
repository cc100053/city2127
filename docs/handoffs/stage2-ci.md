# Stage 2 — Minimal CI

- Owner: Codex in the current city2127 task
- Status: IN_PROGRESS (local implementation complete; remote verification pending)
- Branch: main, uncommitted local changes
- Base commit: 3d670b505c3730e7615caa02b68e3f4b435aa6a2
- Last verified commit: no committed Stage 2 result; local checks cover the working tree based on the base SHA
- Remote availability: NOT PUSHED

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
- NOT RUN: GitHub runner, Node 24, actionlint and browser checks (no visual changes).
- Integration: NOT INTEGRATED; no commit, merge or push performed.
- Changes since runtime verification: documentation/handoff only; checked separately.

## Known issues and blockers

Remote behavior is unverified. The user subsequently explicitly authorized review, commit of Stage 1 + 2 and push to main; this supersedes the initial publication restriction. Local checks do not prove Node 24 runner success.

## Important decisions

PR remains optional. No new dependencies, CI framework, deployment or branch protection. CI cannot replace visual checks. Existing Stage 1 files were preserved and only the affected CI passages extended.

## Next expected step

Publish the reviewed combined changes directly to main as explicitly requested. Verify the exact pushed commit's CI run and update this handoff with actual SHA/run evidence. See [validation](../VALIDATION.md) and [Git workflow](../CONTRIBUTING.md).
