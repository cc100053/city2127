# exhibition-s3 — remaining root site mappings

- Owner: Codex (Astra review; Luna Max implementation and testing)
- Status: IMPLEMENTED — local root checks passed; browser/CI verification is pending
- Branch: `codex/exhibition-s3`
- Base commit: `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`
- Last verified commit: `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68` — integrated S2 base; S3 checks apply to the current uncommitted worktree, not a commit
- Remote availability: NOT PUSHED; no `origin/codex/exhibition-s3` ref was present at preflight
- GitHub Issue: none

## Session Git state

- Task preflight branch and HEAD: `codex/exhibition-s4`, `20a3cbc1fc211aeaff4fd2ed1cb4ff276b7cc51e` (2026-09-29); tracked tree was clean and `.codegraph/` was untracked
- Last fetched origin/main commit: `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`, refreshed with `git fetch --prune origin` on 2026-09-29
- Local changes present at task preflight: the tracked tree on `codex/exhibition-s4` was clean; the pre-existing untracked `.codegraph/` was preserved. After fetch, the integrator switched to clean/up-to-date `main` at `eaf230e` and created `codex/exhibition-s3` from it.
- Documentation-lane preflight: branch `codex/exhibition-s3`, HEAD `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`; shared uncommitted S3 source/test changes were already present and preserved.
- Upstream integration status: S3 started from refreshed `origin/main` with no divergence. Remote `codex/exhibition-s4` contains partial work at `960d9b7` but is not integrated; S3 has no remote counterpart.
- Pending Git conflicts or synchronization blockers: NONE known; the feature branch has no remote counterpart yet

## Goal and acceptance criteria

Complete S3 from [EXHIBITION_MVP.md](../EXHIBITION_MVP.md): render the authoritative v2 automation, public-sharing and urban-concentration mappings in the root Shibuya scene while retaining the S2 Q3 Park mapping.

- Verify all 12 low/mixed/high configurations across the four sites, including the nine new configurations at the three S3 sites.
- Verify within-band count changes, mature futuristic low variants, and site/route clearance.
- Verify the root causal panel summarizes the validated proposal's actual `cityChanges`, including non-Park sites.
- Preserve server-authoritative values, the three-second live transition, immediate pulse-free snapshot/reset, and legacy v1/standalone behavior.
- Complete focused and root checks, relevant desktop browser checks, documentation/link review and feature CI before calling S3 shipped.

## In-scope files and dependencies

The implementation owner is working in `src/changeCatalog.ts`, `src/cityChangeManager.ts`, `src/siteBuilders/automationHub.ts`, `src/siteBuilders/commonsPlaza.ts`, `src/siteBuilders/concentrationTower.ts`, `src/siteBuilders/siteRuntime.ts` and focused root tests. The central integrator owns the v2 causal-panel copy/summary in `src/surveyAtmosphere.ts`. Documentation scope is this handoff plus the affected project summary, implementation map, Plan 02/S3 status, MVP stage status and validation record. Reuse S1's v2 contract and S2's root parser, Park runtime and site transition model; no survey server, module-swap, asset, dependency or deployment change is in this task.

## Completed work

The shared worktree routes server-provided NW/SW/SE bands and counts to the automation hub, commons plaza and concentration tower; NE remains the existing S2 Park. The root causal panel summarizes current proposal `cityChanges` by site and label and states explicitly when a proposal makes no city change. V2 scores remain separate from global atmosphere; S2's three-second live transition and immediate snapshot/reset behavior are retained.

## Actual validation results

- Verification status: PARTIAL — implementation and local root checks complete; browser/CI pending
- Date and checked commit/worktree: 2026-09-29, uncommitted S3 worktree based on `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`
- Commands/manual checks and results: on 2026-09-29, root `npm test`, `npm run build` and `git diff --check` passed on the shared uncommitted S3 worktree. The build completed with a chunk-size warning for a bundle over 500 kB. The final local Markdown-target check passed for 261 targets across the seven assigned documents.
- Evidence/environment: no S3 browser captures or CI run recorded yet
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: S3 implementation and the above checks remain uncommitted; final documentation diff/link checks are pending

## Known issues and blockers

Desktop browser behavior and feature CI are still unverified. Do not describe S3 as shipped until those gates finish. No FPS, exhibition-hardware or cross-platform results are claimed.

## Important decisions

All states remain in 2127. S3 maps server-supplied values and does not derive site policy from client scores or blend v2 scores into global atmosphere. Keep the Park as the Q3 site and preserve legacy v1 behavior. The S2 CI record is historical evidence and does not verify this S3 delta.

## Next expected step

The implementation owner runs desktop browser review for S3 states and feature CI, then records exact results. The documentation owner checks the final local Markdown links and documentation diff. No commit or push is part of this documentation assignment.
