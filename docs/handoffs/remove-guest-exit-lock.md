# remove-guest-exit-lock — Automatic next-guest handoff

- Owner: cc100053 (implemented by Codex in this task)
- Status: DONE (implementation and integrated local validation; main CI checked after push in this task)
- Branch: `codex/remove-guest-exit-lock`
- Base commit: `382aa342f794b5db5c4a279c274437d0eeb14a39`
- Last verified feature commit: `604f94c8f98e9b2580fbd668b1624ff6d7f51539` (local checks and feature CI PASS)
- Remote availability: `origin/codex/remove-guest-exit-lock` at `604f94c8f98e9b2580fbd668b1624ff6d7f51539`; integrated main contains `405088401e0e167f2ac88fbf7bceaa290f389cbb` plus this documentation-only followup

## Session Git state

- Started on clean `main` at `382aa342f794b5db5c4a279c274437d0eeb14a39`.
- Origin fetched successfully 2026-10-02; `main...origin/main` was 0 ahead / 0 behind.
- Original lifecycle handoff's `0586ed0` work is already integrated; actual base includes later S4 and auto-answer work. No unfinished lifecycle work needed to be restored.
- No unrelated changes, overlapping owners or binary asset edits. No conflicts.

## Goal and acceptance criteria

Remove the requirement to confirm the previous Guest's physical exit in Admin before starting the next questionnaire. Keep cumulative state, result/handoff timing, queued resets, retries and history.

## In-scope files and dependencies

Survey lifecycle/session service, HTTP publishing, Admin/Guest/auto-answer UI, their tests and the root pipeline test caller. Current README translations, architecture, validation, plan/spec and agent constraint note are synchronized. Root scene and module-swap behavior/assets unchanged.

## Completed work

- Next session automatically finishes `awaiting_exit` and starts `in_experience` in one SQLite transaction; shared `finishGuest` reuses the existing reset/expiration behavior.
- Queued city/full resets apply at that next start; HTTP publishes their existing `run-reset` event after commit. Reservation failure rolls back both reset and handoff.
- Admin exit-confirmation control is renamed **未完了の体験を終了** and enabled only during unfinished experiences. Existing `guest-left` API stays compatible; it is no longer required by normal or auto-answer guests.
- Guest result10s/handoff5s timers and accumulated city behavior retained. No new dependencies/schema/endpoint.
- User separately requested permanent approval for test port 8795: exact loopback/scratch-DB server command saved in local `~/.codex/rules/default.rules` and verified by `codex execpolicy check` (`allow`). This workstation setting is outside the repository.

## Actual validation results

- 2026-10-02, Node26.0.0: root and survey `npm test` / `npm run build` PASS. Initial sandbox port failures retried with approval. Root existing bundle-size warning only.
- Automated checks cover 100 no-Admin handoffs, accumulation, city/full reset, atomic rollback, restart, HTTP/WebSocket reset and existing retry/count/history protections.
- In-app browser1265×712 on scratch server8795: next Guest starts without Admin; two submitted proposals retain run/count/revision2. One intervening unused draft timed out normally. [Evidence](../../artifacts/guest-handoff-admin-2026-10-02.jpg); [validation](../VALIDATION.md#guest-handoff-without-admin-exit-lock--2026-10-02).
- Feature [CI run 36960169992](https://github.com/cc100053/city2127/actions/runs/36960169992) PASS on `604f94c` (root, survey, module-swap and whitespace).
- Integrated commit: `405088401e0e167f2ac88fbf7bceaa290f389cbb`, no conflicts and identical feature tree. Integrated root/survey tests and builds PASS (Node26.0.0), and committed-diff/Markdown target checks PASS. Changes since verification: this documentation-only record. Main CI is checked after push; this record does not pre-claim its outcome. See [main CI history](https://github.com/cc100053/city2127/actions?query=branch%3Amain) and the task final response.

## Known issues and blockers

No implementation blocker. Additional in-app-browser reset-confirmation smoke could not complete: CDP timed out on the unchanged confirm dialog, including cleanup attempts. The reset/session transaction and WebSocket path are covered by passing HTTP tests; no browser reset success is claimed. Existing result phase name `awaiting_exit` remains for stored/API compatibility but no longer blocks a new session. Auto-answer still stops for pending resets and other unfinished drafts; ordinary Guest start applies queued resets. No Windows/browser performance check; no rendering changes.

## Important decisions

Starting the next questionnaire is now the handoff trigger. Pending reset is deferred through the result screen, then applied before reserving the next Guest. Keep an optional Admin operation for abandoned unfinished questionnaires.

## Next expected step

Implementation integrated on main; use the normal survey build/server restart and refresh Guest/Admin to load it. The task verifies remote main and its CI after pushing this record per [CONTRIBUTING](../CONTRIBUTING.md).
