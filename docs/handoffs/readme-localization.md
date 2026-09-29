# readme-localization — Three-language exhibition startup guide

- Owner: Codex
- Status: IN_PROGRESS
- Branch: `codex/readme-localization`
- Base commit: `f15801be9014d27f5c9c87374dea5a0f8fb8c51d`
- Last verified commit: NONE — documentation changes checked in the worktree
- Remote availability: NOT PUSHED

## Session Git state

- Session starting branch and HEAD: `main` at `f15801be9014d27f5c9c87374dea5a0f8fb8c51d`
- Last fetched origin/main commit: `f15801be9014d27f5c9c87374dea5a0f8fb8c51d` on 2026-09-30; local `main...origin/main` was `0 0`
- Local changes present at session start: untracked `.claude/settings.json` and `.codegraph/` in the original checkout; preserved there. This task uses a separate clean worktree.
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Provide Traditional Chinese, English and Japanese README entry points. Give runnable Mac Terminal and Windows PowerShell commands for the current v2 exhibition, explain each terminal/browser tab and what each service hosts, and describe localhost/LAN access without confusing the legacy viewer with the root city.

## In-scope files and dependencies

`README.md`, `README.en.md`, `README.ja.md`, `docs/VALIDATION.md` and this handoff. No runtime or binary asset edits. No overlapping README edits were present in the starting checkout. Source facts depend on the root and survey package scripts, survey server routes/host defaults, and root `?survey` WebSocket selection.

## Completed work

- Added language navigation and a current exhibition quick start to the Traditional Chinese README.
- Added English and Japanese startup guides, including platform commands, browser URLs, tab roles, staff handoff, persistence, LAN binding and legacy demo scope.

## Actual validation results

- Verification status: PARTIAL — local documentation/source checks passed; publication checks pending.
- Date and checked worktree: 2026-09-30, uncommitted `codex/readme-localization` worktree based on `f15801b`.
- Commands/manual checks and results: local Markdown links in all five changed Markdown files passed; command, host, route and lifecycle facts checked against source and package scripts. `git diff --check`, `git diff --cached --check` and staged diff review passed.
- Evidence/environment: macOS worktree; Windows PowerShell and cross-device LAN not executed.
- Integrated commit and checks: NOT INTEGRATED.
- Changes since verification: none.

## Known issues and blockers

Windows and physical exhibition LAN instructions are source-checked, not exercised on those platforms.

## Important decisions

Keep the existing Traditional Chinese historical record in `README.md`; localized pages focus on the current exhibition flow and link to shared architecture and validation records. The current v2 city is the root scene, not `module-swap/`.

## Next expected step

Review the complete documentation diff and local links, then commit/push the task branch, verify its CI, integrate into main and verify main CI. Codex owns this step.
