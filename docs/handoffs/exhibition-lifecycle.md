# exhibition-lifecycle — City lifecycle and admin reset workflow

> 2026-10-02 current behavior: this handoff preserves its dated implementation evidence. A/B concurrent stations now use independent sessions/results, ordered displays and reset draining; single `/guest` keeps automatic next-start handoff. Admin ends only a named unfinished station, and a newer cancelled draft never reopens an older Undo. See [dual-station handoff](two-guest-devices.md) and [current architecture](../PROJECT.md). Earlier staff-exit requirements are historical.

- Owner: cc100053 (implemented by Claude Code)
- Status: IN_PROGRESS (implemented and verified locally; not integrated)
- Branch: `feat/exhibition-lifecycle`
- Base commit: `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68` (origin/main on 2026-09-29)
- Last verified commit: `0586ed0` (local checks ran on the identical pre-commit tree; feature CI passed on the commit)
- Remote availability: `origin/feat/exhibition-lifecycle` at `0586ed0`

## Session Git state

- Session starting branch and HEAD: `codex/exhibition-s3` at `d51167b` in `/Users/fatboy/city2127`, with uncommitted S3 work (docs, `src/siteBuilders/*`, tests) and untracked `artifacts/future-s3-*.png`. That work was left untouched; this task uses a separate worktree `../city2127-lifecycle` created from `origin/main`.
- Last fetched origin/main commit: `eaf230e`, fetched 2026-09-29.
- Upstream integration status: NOT INTEGRATED. S3 (`d51167b`) is not on main; this branch does not touch root `src/`, so no overlap is expected.
- Pending Git conflicts: NONE known. `AGENTS.md`, `docs/PROJECT.md`, `docs/VALIDATION.md` and `docs/EXHIBITION_MVP.md` are also edited by the uncommitted S3 work; expect small documentation merges.

## Goal and acceptance criteria

A guest never sees the city reset. Completing the questionnaire is not the same as leaving: staff confirm the guest physically left before the installation is ready again, and any reset requested while a guest is present waits for that confirmation. Total guest count (exhibition-wide) and cycle guest count (current city) are separate; a city reset keeps the total, a full data reset clears both. State is server-authoritative for several admin clients.

## In-scope files

`survey/src/server/{migrations,adminService,proposalService,server}.ts`, `survey/src/shared/protocol.ts`, `survey/src/ui/{adminView.ts,debug.css}`, `survey/tests/*` (new `lifecycle.test.ts`), `survey/README.md`, docs listed above. Root `src/` and `module-swap/` are not changed.

## Completed work

- Schema 4: one-row `exhibition_lifecycle` (`revision`, `phase`, `pending_reset`, `total_since_sequence`, CHECK that `ready` has no pending reset).
- Phase transitions inside existing transactions: proposal-session creation (`ready → in_experience`; refused with `lifecycle_blocked` in `awaiting_exit`), proposal commit (`→ awaiting_exit`; submitting outside `in_experience` is refused), staff `guest-left` (expires unfinished sessions, runs a pending reset, `→ ready`).
- `POST /api/admin/lifecycle` replaces `POST /api/admin/reset`: commands `reset-city` (`RESET`), `full-reset` (`FULL RESET`), `cancel-reset`, `guest-left`, all with `expectedRevision` (stale → `lifecycle_conflict`). Full supersedes city.
- A run is a city cycle; `guestCount` = cycle count; total = proposal events after the watermark. Full reset moves the watermark; nothing is deleted. Admin events record `scope: city|full`.
- Executed resets broadcast the existing `run-reset` event; root and module-swap reuse their snapshot/reset path.
- Admin page: phase banner, pending-reset banner, total/cycle counts, run ID, four meters, Confirm Guest Has Left, Reset Current City (confirm dialog), Cancel Pending Reset, Full Data Reset (typed `FULL RESET` + confirm dialog). Updates via WebSocket events and 2-second polling.

## Actual validation results

See [VALIDATION](../VALIDATION.md#exhibition-lifecycle-and-admin-reset--2026-09-29). Survey `npm test`/`npm run build` and `git diff --check` passed; headless admin-page flow passed on a scratch DB. [Feature CI](https://github.com/cc100053/city2127/actions/runs/36587708136) passed on `0586ed0`.

## Known issues and blockers

- Admin remains loopback-only; a tablet on the LAN cannot open it until PIN/token access is added (`isLoopbackAddress`). Several admin tabs/browsers on the exhibition PC are supported.
- The S4 guest UI does not exist yet: it must show a "please wait" state on `lifecycle_blocked` and must not create a session until `ready`. No guest-facing cover screen was added; resets only execute after staff confirm nobody is watching.
- An abandoned questionnaire keeps the phase `in_experience` until staff confirm the exit (deliberate: no automatic inference of absence).
- Other admin clients learn about lifecycle-only changes by polling (≤2 s); stale commands are refused, never applied.

## Important decisions

- Reuse `runs` as city cycles rather than a new identifier; reuse `proposal_events` for the total rather than a second counter.
- One `pending_reset` enum instead of flags so precedence is unambiguous.
- A reset requested in `ready` runs immediately: `ready` is only reached through a staff exit confirmation.

## Next expected step

Owner reviews the pushed branch, then integrates per [CONTRIBUTING](../CONTRIBUTING.md). S4 wires the guest UI to `lifecycle_blocked`.
