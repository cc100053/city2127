# artifacts-evidence-split — Keep raw screenshots out of Git

- Owner: cc100053
- Status: DONE
- Branch: `chore/artifacts-evidence-split`
- Base commit: dc7a67e (origin/main, 2026-11-03)
- Last verified commit: branch tip before the merge (checks below)
- Remote availability: merged to `origin/main`

## Session Git state

- Session starting branch and HEAD: `main` dc7a67e; the local `.git` had just been replaced by a `blob:none` partial clone of origin (every local branch was on the remote first; 40 local-only Codex snapshot refs were dropped)
- Last fetched origin/main commit: dc7a67e, fetched 2026-11-03
- Local changes present at session start: untracked `artifacts/city-change-review/`, `artifacts/explanation-frame-options/`, `artifacts/gemini-target-test/`, `artifacts/se-build-transition/`, four `artifacts/se-closeup-polish/r1/se-rung*.png` and `.playwright-cli/`, left untouched
- Upstream integration status: merged to main
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 2026-11-03: the project used 22 GB locally, mostly committed screenshots (`artifacts/` 2.8 GB in the tree, 2,333 image commits since October, 3.5 GB remote history). Stop the growth without rewriting history: raw evidence outside Git, compressed records in Git, a CI guard, and a one-time move of unreferenced captures.

## In-scope files and dependencies

`scripts/evidence.mjs`, `scripts/publish-evidence.mjs`, `scripts/check-artifacts.sh`, `.github/workflows/ci.yml`, the twelve `tests/*.browser.mjs` runners that wrote captures into `artifacts/`, `.agents/skills/closeup-polish` and `long-polish-loop`, `AGENTS.md`, [VALIDATION § Evidence storage](../../VALIDATION.md#evidence-storage), this handoff and the index. Excluded: history rewrite (`filter-repo`, force push), Git LFS, cloud storage.

## Completed work

- Evidence root `~/city2127-evidence` (`$CITY2127_EVIDENCE_ROOT`) via `scripts/evidence.mjs`; browser runners default there, `CITY2127_EVIDENCE_DIR` still overrides.
- `scripts/publish-evidence.mjs <task> <image>...` writes JPEG q85, ≤ 2400 px wide, to `artifacts/<task>/` and warns above 4 MB (macOS `sips`).
- CI step "Check new artifacts are published records" runs `scripts/check-artifacts.sh "$BASE"`; the diff base is resolved once and shared with the whitespace check.
- 968 tracked captures (1.19 GB) linked from no `docs/`, `.agents/`, README, AGENTS, `src/`, `tests/`, `scripts/` file or artifact page moved to `~/city2127-evidence/<path without artifacts/>` and were untracked. A directory link keeps only the images directly inside that directory.

## Actual validation results

- Verification status: PASSED for the checks listed; browser runners NOT RUN
- Date and checked commit/worktree: 2026-11-03, `chore/artifacts-evidence-split` working tree before commit
- Commands/manual checks and results: root `npm test` exit 0, `npm run build` exit 0, `git diff --cached --check` clean; `node --check` on all twelve runners clean. `check-artifacts.sh` in a scratch repo: no additions → 0, a JPEG whose name has a space → 0, a PNG plus a 5 MB JPEG → 1 with both errors. `publish-evidence.mjs` on real files: 6.9 MB PNG target → 1.0 MB JPEG, 1.7 MB hero PNG → 684 KB, 2400×3663 review board → 3.2 MB; no arguments → usage, exit 1. All 968 moved files exist in the evidence folder.
- Evidence/environment: development Mac, Node 26
- Integrated commit and checks: merge on `main`; main CI result recorded in the commit's CI run
- Changes since verification: this handoff

## Known issues and blockers

- Evidence lives only on the owner's Mac and its Time Machine backup.
- The link scan matched `artifacts/…` paths and relative Markdown/HTML links; a link written as a bare filename elsewhere would not be found and now 404s on GitHub, though the file exists in the evidence folder.
- Open branches that add PNGs to `artifacts/` (for example `feat/se-build-transition`) fail the new CI step when merged; publish JPEG records instead.
- Survey and module-swap untouched.

## Important decisions

- 2026-11-03 owner: two layers (evidence outside Git, published JPEG records in Git), CI guard, one-time move; no LFS, no cloud storage, no history rewrite.
- Record limit 4 MB because dense review boards publish at about 3.2 MB.

## Next expected step

None. Next tasks write evidence to `~/city2127-evidence/<task>/` and publish boards and targets with the script.
