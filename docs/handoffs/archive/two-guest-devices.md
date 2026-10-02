# two-guest-devices — Concurrent A/B Guest stations

- Owner: cc100053 (implemented by Codex in this task)
- Status: IMPLEMENTED, VERIFIED AND INTEGRATED
- Branch: `codex/two-guest-devices`
- Base commit: `5e901afe6cbf0b568e318450cd490263a1a3209a`
- Last verified commit: `689670a3b9f8badf658d195e1994228d71965e00` (integrated tree identical to source `b9dbad82fc5101a24266e069fb20762fa21c70ec`)
- Remote availability: source `b9dbad8` available on `origin/codex/two-guest-devices`; published main `45fcde7cdcfde1ed9031a1c10ff7749206b7faeb`

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
- Evidence: [A](../../../artifacts/two-stations-a.png), [B](../../../artifacts/two-stations-b.png), [City](../../../artifacts/two-stations-city.png), [Admin](../../../artifacts/two-stations-admin.png). Exhibition database untouched.

## Limits and next step

No physical two-device LAN, Windows, FPS or exhibition input-hardware acceptance. Background/disconnected stations use leases; reconnect restores the latest city rather than replaying every missed transition. Optional browser command is in [VALIDATION](../../VALIDATION.md). No new dependency, deployment or mobile adaptation. All affected architecture, behavior and validation documents are synced; screenshot assets are owned by this task.

Physical LAN/device and exhibition hardware acceptance are the next product step. Rebuild/restart survey and refresh Guest/City/Admin on an existing installation; schema 7 migrates automatically without deleting the DB.

## Git integration and verification

Source `b9dbad82fc5101a24266e069fb20762fa21c70ec` pushed; [feature CI 36975551689](https://github.com/cc100053/city2127/actions/runs/36975551689) PASS on Node24 (root, survey and module-swap install/test/build plus whitespace). Fresh origin fetch confirmed main unchanged at `5e901af`; no-conflict merge `689670a` has exactly the source tree. Integrated root/survey `npm test`, `npm run build`, committed whitespace and changed Markdown file targets PASS. Root retains the existing >500 kB bundle warning. The final browser acceptance above used the same source tree; no additional source changes followed it. Full new-file and staged/committed diff reviewed.

This closure updates only the handoff and validation record. Fetch/ancestry is checked before publishing main. Published main `45fcde7cdcfde1ed9031a1c10ff7749206b7faeb`; [main CI 36976457465](https://github.com/cc100053/city2127/actions/runs/36976457465) PASS (Node24 all three packages and whitespace), confirmed again during the documentation audit on 2026-10-02. Feature branch retained; no deployment performed.
