# two-guest-devices-docs — Complete A/B documentation sync

- Owner: cc100053 (implemented by Codex)
- Status: DONE — documentation verified and integrated; main CI checked after push
- Branch: `docs/two-guest-devices-sync`
- Base commit: `45fcde7cdcfde1ed9031a1c10ff7749206b7faeb`
- Last verified commit: `98d2b2c649f10b61ee3b65610211cec6a2601308` (integrated documentation tree identical to feature `633dc5f3bb5bc08ffa41feee387c5869a2d77011`)
- Remote availability: `origin/docs/two-guest-devices-sync` at `633dc5f3bb5bc08ffa41feee387c5869a2d77011`; main published after this closure

## Session Git state — 2026-10-02

Started clean on main at the base above. Origin fetch successful, origin/main matches base, 0 ahead/behind; no unrelated work or conflicts. Implementation source `b9dbad8`, merge `689670a` and closure `45fcde7` are available remotely. Owner has no overlapping module/binary edits; this task changes Markdown only.

## Scope and completed edits

Audit all current dual-station instructions and related historical handoffs. Sync Chinese/English/Japanese root guides, survey API/reset/test reference, PROJECT, EXHIBITION_MVP acceptance matrix, PLAN02, ODAIBA_PLAN, AGENTS and VALIDATION. Qualify single-station reset/revision rules; include A/B admission, result/recovery, Admin targeting, Undo boundary, schema 7, display queue and LAN setup. Add dated supersession links to lifecycle/S4/Undo handoffs while preserving their historical evidence. Record verified implementation main CI directly in the original dual-station handoff and validation record.

Legacy v1 logs, older stage-specific evidence, unrelated art/model docs and CONTRIBUTING are reviewed but unchanged: they document their dated scopes and do not define current A/B operation. No source, dependency, screenshot, deployment or hardware change.

## Validation and limits

Implementation [main CI 36976457465](https://github.com/cc100053/city2127/actions/runs/36976457465) rechecked: PASS on base `45fcde7` for Node24 all three packages. This is existing implementation evidence, not a new browser/hardware run. Documentation verification: PASS for the edited worktree — exact diff/new-file review, all local Markdown targets/anchors in 16 changed documents and `git diff --check`. Fact checks against current `createProposalSession`, `endStationSession`, station lifecycle and wire contracts confirm the stated API, timing and revision behavior. Per AGENTS, documentation-only work does not rerun rendering/tests/build locally; branch/main CI still follows CONTRIBUTING.

Physical two-device LAN, Windows, exhibition PC/FPS and hardware/user acceptance remain untested. Next product step remains physical LAN/exhibition acceptance; no implementation work is pending in this documentation scope.

## Integration — 2026-10-02

Feature `633dc5f` pushed; [CI 36980046935](https://github.com/cc100053/city2127/actions/runs/36980046935) PASS on Node24 all three packages and whitespace. Fresh fetch confirmed origin/main unchanged at base. No-conflict merge `98d2b2c` exactly matches the feature tree. Integrated Markdown target/anchor checks across all16 task documents, Markdown-only scope and committed `git diff --check origin/main..HEAD` PASS. This handoff closure is the only post-verification delta; its links/diff are checked before publication. Main CI is checked after push, with the actual outcome reported in the task final response and [main CI history](https://github.com/cc100053/city2127/actions?query=branch%3Amain).
