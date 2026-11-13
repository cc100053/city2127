# capture-command — Fixed evidence capture command

- Owner: cc100053
- Status: DONE
- Branch: feat/capture-command
- Base commit: 38a58053476062e212f15187211b18fc06ec703a
- Last verified commit: see the branch tip of `feat/capture-command` (working tree checked before commit)
- Remote availability: origin/feat/capture-command

## Session Git state

- Session starting branch and HEAD: main, 38a58053476062e212f15187211b18fc06ec703a
- Last fetched origin/main commit: 38a58053476062e212f15187211b18fc06ec703a, fetched 2026-11-13
- Local changes present at session start: untracked `Dev_QA.md` (owner's, preserved, not committed)
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

One repeatable command for evidence captures, so rounds stop hand-writing Playwright scripts: `npm run capture -- <url> <task/round/name> ...` writes each image into `~/city2127-evidence/` with a JSON sidecar (URL, commit, branch, dirty flag, viewport, DPR, settle time, page errors, canvas diagnostics), reusing one browser for the batch.

## In-scope files and dependencies

`scripts/capture.mjs` (new; loader shared with `scripts/closeupSheet.mjs`), `scripts/closeupSheet.mjs`, `package.json` (`capture` script, self-test in `npm test`), `docs/VALIDATION.md`, `.agents/skills/closeup-polish/SKILL.md`. Uses the globally installed `@playwright/cli` Playwright and Google Chrome, as closeupSheet already did.

## Completed work

- `capture.mjs` exports `launchBrowser`, `newCityPage`, `captureCity` (wait for `canvas.dataset.fps`, optionally hide UI, settle, screenshot) and `parseArgs`; options `--size`, `--settle`; the command keeps the UI (owner 2026-11-14), closeupSheet hides it; names without `.jpg` save PNG.
- closeupSheet now calls the shared loader; behaviour unchanged (1600×900, 7 s settle, JPEG).

## Actual validation results

- Verification status: PASSED
- Date and checked commit/worktree: 2026-11-14, `feat/capture-command` working tree on base 38a5805
- Commands/manual checks and results: `node scripts/capture.mjs --self-test` PASS; root `npm test`, `npm run build`, `git diff --check` — see commit; smoke run of two pairs (`nw:focal`, `meters=nw:2`, hour 12 PNG and hour 22 JPEG) against Vite DEV 5173: 47 s total, both images and sidecars written, zero page errors, night image inspected (UI hidden, scene settled).
- Evidence/environment: `~/city2127-evidence/capture-command/smoke/`, headless Google Chrome 1600×900 DPR 1, development Mac
- Integrated commit and checks: recorded in the merge commit
- Changes since verification: none

## Known issues and blockers

- The settle wait is fixed (default 7 s); heavier scenes may need `--settle=10`. closeupSheet was not re-run end to end (only its loader moved).

## Important decisions

- Default viewport stays 1600×900 to match closeupSheet; polish rounds pass `--size=3200x1800`.

## Next expected step

None; use the command in the next polish round.
