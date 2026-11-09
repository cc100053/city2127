# admin-staff-console — Exhibition staff console

- Owner: Codex
- Status: IN_PROGRESS
- Branch: feat/admin-staff-console
- Base commit: cc18b9f09641950a20f8d25bafc73e5fa12452f8
- Last verified commit: NONE. Checks run on the implementation delta from the base above.
- Remote availability: NOT PUSHED

## Session Git state

- The original checkout was on `feat/guest-ui-graphite` at `f45250ea6f5e41d119a325ab427fc2cdb8cc5fe6` and matched its remote after fetch on 2026-11-09.
- An independent clone started from verified `origin/main` at the base above. Untracked `dist-exhibition/` and `qr-hud/` in the original checkout were preserved.

## Scope and decisions

- Apply the approved Japanese Admin layout to the existing Admin page. Station cards use the current-run API, and the mode strip illustrates the saved lighting setting.
- Keep the existing browser confirmations, revision checks, lifecycle commands, loopback access, and full-reset phrase. Put diagnostics and full reset behind a disclosure. Event history remains visible.
- Publish the review branch separately from main, following the prior UI delivery scope.

## Actual validation results

- On 2026-11-09, root and survey builds passed on Windows with Node 24.19.0. The root build emitted existing JSON-import and chunk-size warnings.
- Survey tests passed using an external Windows file-URL path adapter for the existing test fixtures. The adapter is outside Git.
- Chrome 157.0.8103.38 at 1280×900 passed the focused browser check on the real Admin and Guest pages using in-memory SQLite. Verified A/B guidance, all three lighting settings, reset confirmation dismissal, deferred reset, cancellation, blocked B starts, targeted A termination, deferred reset execution, proposal Undo and the full-reset phrase gate. The A/B screenshot was visually inspected outside Git.
- Root tests are running with the same adapter.
- No exhibition hardware or actual shared-screen lighting was tested.
