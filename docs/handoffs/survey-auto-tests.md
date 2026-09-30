# Survey tests and development auto-answer

- Owner: Codex
- Status: IMPLEMENTED; user authorized branch publication and main integration (2026-09-30)
- Branch: codex/survey-auto-tests
- Base commit: b97f859e0ddee679302f08d571f9e1187888d925
- Last verified commit: task commit on `codex/survey-auto-tests` (see Integration below)
- Remote availability: pushed to `origin/codex/survey-auto-tests` (see Integration below)

## Session Git state

- Starting branch/HEAD: clean main at b97f859e0ddee679302f08d571f9e1187888d925.
- HTTPS fetch succeeded 2026-09-30; origin/main is the same commit (0 ahead / 0 behind). SSH was unresponsive in the prior session; origin URL is preserved.
- No overlapping local changes or conflicts. This task owns questionnaire UI/server/test helpers and associated documentation; no binary assets are edited.

## Goal and acceptance

Reusable Meter-contract tests covering actual question definitions → votes → stored state → events → real city site runtimes. Opt-in localhost Guest auto-answer panel that drives the existing UI, completes successive proposals and confirms only its own guest exit, using a scratch database.

## Decisions

Keep the four-axis v2 product contract. Generic test helpers iterate descriptors; adding a product Meter still requires schema/UI/model changes. DEV-ONLY features must be removed or moved to Admin before exhibition deployment. Normal guests never receive option effects.

## Completed implementation

- Independent descriptor-driven Meter semantic/golden helpers; all 81 answer combinations through votes/state/SQLite/layout/events, plus root real-model and HTTP/WebSocket/retry/snapshot/reset checks.
- DEV-ONLY Guest panel, cancellable profiles/custom/seed runner and loopback/opt-in config route; reuses existing Guest controls/recovery, guards other reserved drafts and pending resets, confirms only its submitted guest exit after 10/5-second result/handoff.
- Scratch launcher (`npm run dev:auto`, default 8788), optional reproducible browser check and four task screenshots. No dependencies, migrations, binary model edits or accumulation/model changes.
- CI install order now installs survey before root tests (root HTTP/WebSocket pipeline needs `ws`). README languages, survey guide, architecture/design/Plan02/validation and command documentation synchronized.

- Review fix (2026-09-30): `start(signal)` now waits cancellably (≤10 s) for Guest result/handoff timers to reach welcome instead of relying only on the fixed 15.1 s wait; hidden-tab timer throttling could otherwise stop multi-proposal batches. Unit test asserts the runner passes its Stop signal. Documentation spacing/typo fixes. After this fix: survey + root `npm test`/`npm run build` and `git diff --check` PASSED; the browser script was NOT re-run.

- User browser test (2026-09-30): a manual draft left open kept the lifecycle `in_experience`, so every batch stopped at preflight with a misleading staff/reset message and recorded nothing (manual submission reflected correctly). The preflight message now names the cause (open draft / awaiting exit / pending reset) and the manual Admin step; unit test covers each reason.

## Actual validation — 2026-09-30

- Root `npm test` / `npm run build`, survey `npm test` / `npm run build` and `git diff --check`: PASSED on final code worktree. Node 24.21.0; existing root chunk warning only. `module-swap/` unchanged locally; CI still checks it.
- Browser script `tests/surveyAuto.browser.mjs`: PASSED on scratch 8790 + Vite 5173, headless installed Chrome, 1280×720 DPR 1, held noon, real GLBs. Eight automatic proposals (high 2/low 4/mixed 2) reached matching actual-model diagnostics and final exits; cancellation then manual #9; response lost after committing #10, stopped runner, reload/same-ID recovery counted once, batch idle; city reload restored models; no page exceptions. Four screenshots were inspected; links/results in [VALIDATION](../VALIDATION.md#survey-meter-tests-and-development-auto-answer--2026-09-30).
- Initial scratch 8788 six-proposal check also passed, superseded by full 8790 run. Retained DB paths: `/var/folders/wr/db1pm2v16jd73h5fn6sj6fh00000gn/T/city2127-auto-vSQzFt/survey.sqlite` (initial) and `city2127-auto-90d0Kp/survey.sqlite` (full run); no exhibition DB touched.
- No Windows, exhibition hardware, FPS or endurance verification. Generic tests do not by themselves extend the four-axis production protocol. Node mesh tests keep external detailed GLB loading pending and verify the real fallback runtime; browser uses actual models.
- Final diff/new files reviewed, `git diff --check` and 378 local Markdown link targets passed. HEAD remains the task base; index empty, all task changes uncommitted. Remote main comparison remains 0/0. No commit, push or merge was performed.

- User manual browser test (2026-09-30, headed Brave, scratch 8788 + Vite 5173): after clearing the open draft via Admin, automatic batches reached the city and the Guest panel/root feedback showed parameters; the user confirmed it works. Panel now also tells testers to use Admin (/admin) for guest exit and city reset (text only, no new controls, by user decision).

## Remaining verification and next step

User authorized branch → CI → `--no-ff` main integration on 2026-09-30 (not a direct main commit). Remove/move DEV-ONLY tooling before exhibition; keep reusable tests.

## Integration — 2026-09-30

- Task commit `03382c2` pushed to `origin/codex/survey-auto-tests`; branch CI run 36703009527 PASSED (root with survey install, survey, module-swap, diff whitespace).
- Merged into `main` with `--no-ff` as `fb83f87` on base `b97f859` (origin/main unchanged). Integrated result: root/survey/module-swap `npm test` and `npm run build`, and `git diff --check origin/main..HEAD` PASSED locally.
- Main CI for the pushed result: see `gh run list --branch main`; record any failure here.
