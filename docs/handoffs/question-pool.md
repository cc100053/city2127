# question-pool — SURVEY_V2 question pool beside the exhibition survey

- Owner: noifex
- Status: DONE
- Branch: feat/question-pool
- Base commit: 84ef0ef8 (origin/main, 2026-11-18)
- Last verified commit: the feat/question-pool commit that adds this file (worktree checked before commit)
- Remote availability: origin/feat/question-pool

## Session Git state

- Session starting branch and HEAD: docs/q06-prompts, d0fb27632b066e63d2c0c76b6808e6d8868e2077 (the main clone; left untouched, work done in a separate worktree `../city2127-question-pool`)
- Last fetched origin/main commit: 84ef0ef, fetched 2026-11-18
- Local changes present at session start: in the main clone, 5 uncommitted planning docs (IMAGE_PROMPTS*, SURVEY_V2) and untracked resident-bedroom files; preserved. Only the SURVEY_V2.md edits of 2026-11-18 were copied into this branch.
- Upstream integration status: branched from current origin/main
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Record the planning team's nine SURVEY_V2 questions and their nine internal parameters in the system as a question pool, beside the exhibition survey, without changing the four-question flow, the Meter algorithm or the city. How many questions a guest answers (1 or 4) and how parameters move the city are the leader's decisions and out of scope.

## In-scope files and dependencies

- `docs/planning-team/SURVEY_V2.md` is the single source text. U02-A, U03-C, U04-B, U06, U07 city-change text aligned to the adopted images on 2026-11-18; the 【未修正】 notes on Q02/Q07 closed.
- `survey/src/pool/questionPool.ts` (types, `parseQuestionPool`), `survey/src/pool/surveyMarkdown.ts` (strict Markdown reader), `survey/scripts/buildQuestionPool.ts` (`npm run pool:build`, `--check`), generated `survey/src/pool/questionPool.v1.json`, `survey/tests/questionPool.test.ts` (`npm run test:pool`, appended to `npm test`).
- Not touched: survey server, guest UI, `questions.exhibition.json`, scoreEngine, root `src/`, module-swap.

## Completed work

- Pool schema: `parameters[] {id: paramNN, label, category}`, `questions[] {id: QNN, parameter, hypotheses[], variants {P, U}, notes[]}`; each variant has `title, text, situation, options A/B/C {label, reason, cityChange (U only)}, notes[]` (※ lines verbatim). Options carry no votes or effects.
- The reader throws on any unexpected line, a mismatched heading/内部パラメータ, or a P/U number under the wrong Q, so a layout change in SURVEY_V2 surfaces as an error instead of silent loss.
- The test fails when the committed JSON differs from SURVEY_V2.md (edit the Markdown → run `npm run pool:build --prefix survey`).

## Actual validation results

- Verification status: PASSED
- Date and checked commit/worktree: 2026-11-18, worktree on base 84ef0ef plus this change
- Commands/manual checks and results: `cd survey && npm test && npm run build` passed (includes `questionPool tests passed`); root `npm test && npm run build` passed; `git diff --check` clean. Generated JSON inspected: 9 questions, 9 parameters, U04-B carries the 2026-11-18 text.
- Evidence/environment: Node with `--experimental-strip-types`, macOS
- Integrated commit and checks: see the merge commit on main
- Changes since verification: NONE

## Known issues and blockers

- The planning team is still revising questions (team feedback pending as of 2026-11-18; new hypotheses/questions expected through the following week). Regenerate after every SURVEY_V2 edit.
- New questions Q10/Q11 are drafts in `.dream-loop/` (local, gitignored), not in SURVEY_V2 yet.

## Important decisions

- 2026-11-18 (user): implement the new question text and parameters as a separate pool next to the existing survey; do not change the parameter algorithm, the number of questions answered, or how the city moves — the leader decides selection (1 or 4 from the pool) and scoring.
- SURVEY_V2.md stays the only hand-edited source; the JSON is generated.

## Next expected step

Leader decides how questions are drawn from the pool and how the nine parameters are scored/shown; then a new task wires the pool into the proposal flow. Owner shares the team's feedback PDF for the next survey revision.
