# Odaiba Phase 03D web preview

- Owner: Codex
- Status: IN_PROGRESS
- Branch: codex/odaiba-preview
- Base commit: 5577195 (verified origin/main, 2026-09-24)
- Last verified commit: NONE for runtime integration
- Remote availability: NOT PUSHED

## Session Git state

Started clean on `feat/odaiba-assets-progress-02` at `40d696e09f5d119a3ba6aff72c19d935c8838333`, matching its remote (0 ahead / 0 behind). Fetch succeeded on 2026-09-24. Main was `5577195`, with 11 main-only and 8 asset-branch-only commits. Created this task from current main and deliberately merged the asset branch, preserving both histories. Asset handoff base `9ca007c` and verified `b25f479` are available in remote history; `40d696e` only updates the asset handoff after that verification.

## Scope and ownership

Codex owns the independent Odaiba HTML/runtime, placement metadata extraction, tests and documentation. Existing Shibuya entry and behavior remain available. All nine GLBs and Blender sources remain unmodified; there are no overlapping binary edits. This user assignment supersedes the earlier asset-stage exclusion of runtime integration. No exhibition interactions, deployment or new dependencies.

## Acceptance and next step

Load Phase 03D environment and eight buildings at source transforms and scale; confirm the legacy Nikko adapter; support orbit, zoom and top view; verify development and production pages plus Shibuya regression. Next: implement and validate source-derived placement, then browser checks and Git integration according to [workflow](../CONTRIBUTING.md).
