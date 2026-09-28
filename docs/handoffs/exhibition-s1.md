# exhibition-s1 — four-question server and compatibility gate

- Owner: Codex (Astra coordination/review; Luna Max implementation/testing)
- Status: IN_PROGRESS — implementation and local checks are complete; integration and final review remain
- Branch: `codex/exhibition-s1`
- Base commit: `f8fa07ab58610c19e5764be6bec325cf9ddd53f9`
- Last verified commit: NONE; uncommitted worktree checked
- Remote availability: NOT PUSHED
- GitHub Issue: none

## Session Git state

- Session starting branch and HEAD: `codex/exhibition-s1`, `f8fa07ab58610c19e5764be6bec325cf9ddd53f9`
- Last fetched origin/main commit: `f8fa07ab58610c19e5764be6bec325cf9ddd53f9`, fetched 2026-09-28; local and origin/main matched
- Local changes present at session start: none in the managed worktree; original checkout and its `.codegraph/` index were preserved
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: none known; branch has not been committed or pushed

## Goal and acceptance criteria

Implement S1 of [the exhibition plan](../EXHIBITION_MVP.md): a versioned four-question proposal flow, deterministic four-axis accumulation, durable v2 runs/events/snapshots and explicit rejection by v1 viewers. A v2 frame must never be silently applied as v1. Preserve legacy history and standalone/demo behavior. This stage does not render the new layout in the city or add the final guest UI.

## In-scope files and dependencies

- Survey server and shared rules: `survey/src/server/`, `survey/src/shared/`, `survey/src/survey/`, `survey/src/ui/`; question set `survey/src/survey/questions.exhibition.json`; tests under `survey/tests/` and the `survey/package.json` test script.
- Viewer compatibility: `src/surveyView.ts`, `tests/surveyAtmosphere.test.ts`, `module-swap/app/src/state/surveyView.ts`, and `module-swap/app/tests/surveyView.test.ts`.
- Documentation sync: `AGENTS.md`, `README.md`, `docs/EXHIBITION_MVP.md`, `docs/PLAN02.md`, `docs/PROJECT.md`, `docs/VALIDATION.md`, this handoff and the superseding note in [the planning handoff](exhibition-mvp-plan.md).
- Excluded: root v2 site rendering (S2/S3), the four-question guest UI (S4), deployment, real exhibition hardware and performance tuning. No dependency was added.

## Completed work

- Added the reusable four-question v2 set, strict set validation, four-axis reducer and server-authoritative four-site layout values.
- Added schema 3 proposal sessions/events and floating-point snapshots. Applying the migration ends the active v1 run, expires its outstanding reservations and starts a zeroed v2 run while retaining legacy runs, answer events, snapshots and append-only history. Legacy scores are not converted into v2 votes.
- Added the v2 proposal-session and proposal HTTP routes, atomic event/snapshot/session completion, replay validation, idempotent retry behavior, conflict handling, recent-64 view and admin/debug visibility. The original one-question endpoints reject requests against v2.
- Kept existing WebSocket event envelopes and added `view.version: 2`. Root and module-swap v1 clients display `Unsupported exhibition view version` before applying scene state. Their v1 and standalone/demo paths remain available. The `/guest` UI is retained as legacy v1 and cannot submit against the active v2 run; there is no historical-run selector.
- Updated the project docs to separate the implemented S1 server contract from pending rendering and guest experience work.

## Actual validation results

- Verification status: PARTIAL — S1 local implementation checks passed; integration/CI and full exhibition acceptance remain open.
- Date and checked commit/worktree: 2026-09-28, managed worktree on `codex/exhibition-s1`, based on `f8fa07ab58610c19e5764be6bec325cf9ddd53f9`; all changes are uncommitted.
- Commands/results: root `npm test` and `npm run build` PASS; `cd survey && npm test` (13 scripts) and `npm run build` PASS; `cd module-swap && npm test` and `npm run build` PASS; `git diff --check` PASS after documentation sync. The focused `survey/tests/exhibitionRules.test.ts` check also passed before it was added to the full test command.
- Independent scratch probes PASS: reducer fixtures and 1,000-vote bounds; all-axis mapping thresholds; malformed/canonical request parsing; schema-2 to schema-3 migration preserving v1 records; proposal atomicity, rollback, idempotency, expiry, latest-64 history and two-worker revision race. The actual HTTP/WS/restart probe verified migration, v2 endpoints, one update event after commit, replay without duplicate event, v1 endpoint rejection, reset and recovery after reopen. Temporary `/private/tmp/s1-*.ts` probes are not committed artifacts.
- Browser checks PASS: root and module-swap mock-v2 frames show the unsupported-version status without applying v2 scene state; explicit v1 frames still connect and module-swap standalone mode loads. The built survey `/admin` and `/monitor` pages show v2 revision 0, then update live after one four-answer proposal. A versionless v1 browser frame was not tested.
- Integrated commit and checks: NOT INTEGRATED; no CI run. The parent reviewer reports no unresolved runtime/test findings; final verdict remains with Astra.
- Changes since verification: documentation sync only; re-run `git diff --check` and Markdown link/anchor checks before integration.

## Known issues and blockers

- Repository CI and validation of the integrated result remain pending.
- The root city does not render the v2 layout; root S2/S3 work is pending. The guest `/guest` page is still the legacy one-question UI; S4 is pending.
- No real-GPU FPS, exhibition-PC/Windows, 100-proposal/60-minute endurance or visitor-understanding test was run. Browser v1 compatibility covered explicit v1 frames only.
- Exhibition-day run/reset policy and final input hardware remain open decisions.

## Important decisions

- A v2 complete proposal contains exactly four answers, one per axis. Successful retries with the same canonical submission are idempotent; a reused ID with a different payload conflicts.
- Migration preserves v1 history and starts a fresh v2 run; it never reinterprets old answer values under the new algorithm.
- S1 viewers reject unsupported versions before scene mutation. S2/S3 may add v2 rendering; they must not treat it as v1.
- User requested Astra plan/review only and Luna Max implementation/testing. No commit or push was made by this contributor.

## Next expected step

Astra completes independent review and assigns SHIP, FIX-FIRST or RETHINK. If accepted, integrate this branch using the repository workflow, run/check CI on the integrated result, then update this handoff with the integration commit and final checks. S2/S3 and S4 remain separate stages.
