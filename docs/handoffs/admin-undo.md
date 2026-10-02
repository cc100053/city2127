# admin-undo — Staff-only latest-proposal Undo

- Owner: cc100053 (implemented by Codex in this task)
- Status: IN_PROGRESS
- Branch: `codex/admin-undo`
- Base commit: `cfd62c92d6a672297f9ae3b2129fd1ff3a8f9519`
- Last verified commit: uncommitted task tree; local root/survey test/build PASS; browser PASS
- Remote availability: NOT PUSHED

## Session Git state

Started on clean main at the base above; origin fetched successfully 2026-10-02, 0 ahead / 0 behind. Main contained origin/main before branching. Prior lifecycle/S4/Meter handoffs describe already integrated code; no unfinished remote work needed restoration. No overlapping owner, binary asset edits or unrelated changes.

## Goal and scope

Admin alone can undo the latest completed four-question proposal before the next Guest starts. Restore the entire inherited city and participation counts; keep immutable proposal history. No Guest Undo, multi-step Undo or venue/rendering changes. Root snapshot acceptance, survey persistence/services/UI and focused tests are coupled parts of the task.

## Implementation

Schema 6 adds append-only `proposal_undos` and an `active_proposal_events` SQLite view. Existing replay, full-history slot seeds, latest-64 city history and total/cycle counts use active proposals. Admin history retains originals with `undoneAt` and records `proposal-undone`. The loopback/same-origin lifecycle endpoint accepts `undo-proposal`, lifecycle `expectedRevision` and explicit `proposalId`. Only `awaiting_exit` with an unrevoked last raw event is eligible; next start or staff ending a subsequent draft cannot expose an older proposal. Marker, replayed snapshot, lifecycle and audit commit atomically. Retry returns `proposal_undone`, never resurrecting a withdrawn result.

Undo broadcasts an authoritative snapshot including the undone ID and current lighting. Root accepts changed snapshots even at a lower/equal revision, without replaying unchanged lighting snapshots. Monitor uses its ordered socket snapshots (redundant racing HTTP fetch removed). Connected Guest clears its revoked result/recovery and returns to Start; revoked recovery after reload likewise returns to Start. Result/handoff timing and queued resets remain: reset applies at the next start, not during Undo. Re-answer starts a fresh four-question session and counts once.

## Validation

2026-10-02, Node26.0.0: root/survey `npm test` and `npm run build` PASS; root retains existing bundle-size warning. New `survey/tests/adminUndo.test.ts` covers >64 history restore, exact scores/EMA/seeds/layout/latest history, counters, timing, stale/duplicate/wrong-target requests, rollback, append-only marker, revoked retries, real SQLite restart, queued reset, lighting and real HTTP/WebSocket Admin authorization. Root tests cover lower/equal-revision authoritative snapshot and unchanged lighting. First new test failed comparing wire JSON with an undefined optional property; corrected the assertion to compare wire JSON, then full suite PASS.

Browser: `tests/adminUndo.browser.mjs` PASS on headless Chrome, 1280×720 DPR1 (running clock, hour16). Native Admin confirmation/Undo, disabled-before-submit/after-undo/after-next-start, exact API restore, visible site diagnostics, City reload, Guest cleared result/storage, Monitor and retained audit/revoked retry passed with no page exceptions. Test initially froze the animation clock and timed out on live transition, then corrected to a running clock; a subsequent selector matched repeated ordinals in retained history, corrected to select the latest row. Screenshots: [Admin](../../artifacts/admin-undo-admin.png), [city before](../../artifacts/admin-undo-city-before.png), [city restored](../../artifacts/admin-undo-city-restored.png). Scratch DB `/private/tmp/city2127-admin-undo-browser.sqlite`, survey8795 and Vite5173. Server/Chrome sandbox launch denials retried with approval. Exhibition DB untouched. Exact diff including new tests reviewed; whitespace/local Markdown targets PASS. CI/integration pending.

## Decisions and limits

No new dependency/endpoint or generalized history editor. Revision/ordinal remain equal to active guest count and can step back; immutable IDs and monotonically increasing lifecycle revision guard Admin commands. Re-answer may reuse an ordinal, never a submission ID. Undo recomputes active history using existing replay (O(guests)); existing full-history seed computation already has the same ceiling. No Windows, hardware/FPS or human art acceptance claim.

## Next step

Finish browser verification, documentation/link/diff review, feature commit/push and CI, then integrate and validate main per [workflow](../CONTRIBUTING.md).
