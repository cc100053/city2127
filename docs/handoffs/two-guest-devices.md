# two-guest-devices — Concurrent A/B Guest stations

- Owner: cc100053 (implemented by Codex in this task)
- Status: IMPLEMENTED AND LOCALLY VERIFIED; Git/CI integration pending
- Branch: `codex/two-guest-devices`
- Base commit: `5e901afe6cbf0b568e318450cd490263a1a3209a`
- Last verified commit: working tree based on `5e901af`; source commit recorded after staging
- Remote availability: NOT PUSHED

## Session Git state

2026-10-02: clean main at the base above, successful origin fetch, 0 ahead / 0 behind. Prior lifecycle/S4/Undo tasks are already integrated; no unfinished remote work to restore. No overlapping owner, binary assets or unrelated changes.

## Goal and scope

Two independent `/guest?station=A` and `/guest?station=B` clients answer concurrently and contribute once each to one accumulated city. Serialize live display changes, preserve per-client results/recovery, drain both stations before reset, and let Admin cancel only the named unfinished station. Preserve the existing single-station and legacy paths. Survey server/UI/persistence, root event parsing/display, focused tests and affected docs are owned by this task. No new dependencies, deployment, mobile layout or assets.

## Implementation

Schema 7 adds optional station identity, end/lease timestamps and proposal display timestamps while preserving history. A/B sessions independently reserve, recover, submit and finish; SQLite transactions accumulate each proposal on the latest state, permitting stale station revisions but rejecting future ones. Existing unlabelled Guest keeps its revision check and next-start lifecycle. Active modes cannot mix. Per-station DB uniqueness prevents two experiences on one station.

Root queues station updates at least 3 s apart, labels their station/proposal and clears queued changes on authoritative reset/Undo snapshots. Matching lighting snapshots preserve the queue. Each Guest has its own local recovery key, waits for its scheduled display, then uses the existing 10 s result and 5 s handoff. A/B reset pauses new starts and drains both experiences; five-minute draft expiry and 15 s result leases release disconnected clients. Admin cancellation names only a reserved session. A newer cancelled draft never reopens Undo for an older proposal. Session queries are limited to the active run so the timer cannot restore an old result phase after reset.

## Validation — 2026-10-02

- Root `npm test` and `npm run build`: PASS; existing bundle-size warning. Final survey `npm test` and `npm run build`: PASS, including the active-run reset regression.
- `survey/tests/twoStations.test.ts`: native assertions for parallel latest-state accumulation, mode/capacity guards, retries, future revisions, display ordering/end guard, rollback, SQLite restart, targeted/stale cancellation, reset draining/expiry/counts/precedence, result lease recovery and real HTTP/WebSocket submissions.
- Root display checks: paired station metadata, delayed burst with 3 s spacing, lighting preservation, immediate queued Undo/reset cancellation and malformed metadata rejection.
- Desktop Chrome browser run: PASS, two isolated 1280×720 DPR1 Guest contexts plus City/Admin, scratch SQLite at survey8795 and Vite5173. B loses its response after commit then reloads/retries once; count stays2. Own result ordinals, 3016 ms live spacing (final rerun; earlier pass 3023 ms), A next Guest while B is active, A draft reload, Admin queued city reset/admission pause/drain/count3, targeted A cancellation with B submission, actual four-site diagnostics and City reload pass. No page exceptions. The final rerun also passes the new-run ready phase assertion after a timer tick.
- Initial browser run timed out at blocked Start because the harness did not verify Admin's reset response. The harness now reloads Admin and asserts the lifecycle response/pending state; the full rerun passed. Sandbox port/Chrome denials were rerun with approval.
- Evidence: [A](../../artifacts/two-stations-a.png), [B](../../artifacts/two-stations-b.png), [City](../../artifacts/two-stations-city.png), [Admin](../../artifacts/two-stations-admin.png). Exhibition database untouched.

## Limits and next step

No physical two-device LAN, Windows, FPS or exhibition input-hardware acceptance. Background/disconnected stations use leases; reconnect restores the latest city rather than replaying every missed transition. Optional browser command is in [VALIDATION](../VALIDATION.md). No new dependency, deployment or mobile adaptation. All affected architecture, behavior and validation documents are synced; screenshot assets are owned by this task.

Finish Markdown targets, exact diff review and whitespace checks; push feature, require feature CI, integrate and validate main per [workflow](../CONTRIBUTING.md). Record source/merge commits and actual CI outcomes here.
