# Exhibition S4 — guest UI and root feedback

- Owner: Codex Luna Max (survey UI implementer)
- Status: IN_PROGRESS
- Branch: `codex/exhibition-s4`
- Base commit: `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`
- Last verified commit: `960d9b7c520af7f845bb6c0a2df47d17ad222f9f`; local code checks below ran on the tracked source tree immediately before it was committed
- Remote availability: feature branch is pushed to `origin/codex/exhibition-s4`; implementation commit `960d9b7c520af7f845bb6c0a2df47d17ad222f9f` is available remotely, and a documentation follow-up may advance branch HEAD; feature CI status is unverified (no run ID, status, or conclusion evidence)

## Session Git state

- Session starting branch and HEAD: `main`, `f8fa07ab58610c19e5764be6bec325cf9ddd53f9`
- Last fetched origin/main commit: `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`, fetched during parent preflight on 2026-09-29
- Local changes present at session start: `.codegraph/` was untracked; no S4 code changes were present. The local `main` was six commits behind `origin/main`, was fast-forwarded to the fetched `eaf230e...`, and `codex/exhibition-s4` was created from that commit before implementation began.
- Upstream integration status: NOT INTEGRATED; `origin/main` remains at `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`
- Pending Git conflicts or synchronization blockers: NONE observed

## Goal and acceptance criteria

Provide one four-question guest proposal flow with draft review/edit, result, next-guest handoff and recoverable submission; show honest root feedback from the latest server proposal and up to 64 recent proposal cells. Preserve the existing v1 path. S4 depends on S3's three remaining site mappings and is not accepted until that integration and browser checks confirm readable feedback and recovery; S5 exhibition acceptance follows S4.

## In-scope files and dependencies

Survey UI: `survey/guest.html`, `survey/src/ui/guestDebugView.ts`, `survey/src/ui/guestFlow.ts`, `survey/src/ui/debug.css`, and the associated package/test files. Root feedback: `src/surveyAtmosphere.ts`, `src/style.css`, and `tests/surveyAtmosphere.test.ts`. The server's v2 proposal/session API remains the source of question sessions, accumulated state and proposal records. S3 site mapping is absent and was not implemented here.

## Completed work

- Added a four-question guest flow that reviews all answers before one proposal submission, supports editing and displays the recorded result.
- Stores the draft and pending request in `localStorage`; on reload, revalidates the server session, restores valid choices, detects revision changes and retries the same request idempotently.
- Root v2 feedback shows all four answers, four Meter before→after rows, at most two actual city parameter changes (including a band-only transition), and truthful no-change wording. The legacy v1 three-decision list remains available.
- Added the `最近64人` recent-proposal band, rendering up to 64 cells from `recentProposals`, with four vote symbols per cell and a separate cumulative guest count.
- Implementation and focused tests are committed and pushed on the feature branch. No integration to `main` is recorded here.

## Actual validation results

- Verification status: PARTIAL
- Date and checked commit/worktree: 2026-09-29; local checks ran on the tracked source tree immediately before it was committed as `960d9b7c520af7f845bb6c0a2df47d17ad222f9f`.
- Commands/manual checks and results: Root `npm test` and `npm run build` exited 0; build reported the existing >500 kB chunk warning. Survey `npm run build` and the focused `survey/tests/guestFlow.test.ts` check exited 0. Full `cd survey && npm test` failed in the sandbox when a server test attempted to listen and received `EPERM`; an escalated retry was attempted, but its outcome is unknown for this record, so the full suite is not marked passed. No feature CI run ID, status, or conclusion was verified. Local root and survey endpoints returned HTTP 200 only. `git diff --check` and local Markdown link checks for the docs-only update passed.
- Evidence/environment: No screenshots. CUA reported the Mac was locked. Playwright was unavailable because its Chromium revision was missing and installed Chrome exited with SIGABRT. No browser rendering or interaction was verified.
- Integrated commit and checks: NOT INTEGRATED; `origin/main` remains at `eaf230e80babb66cc04f0e99e7da4ec5ee4ebd68`. Feature CI status unverified; no run ID, status, or conclusion was verified.
- Changes since verification: This handoff and the README/validation updates are documentation-only; their final diff and link checks are recorded after running them.

## Known issues and blockers

- S3's other three site mappings remain absent; the display uses their fixed mixed baseline. S3 is an S4 dependency, so S4 cannot be accepted before that integration.
- The up-to-64-cell band follows the long latest-feedback content inside a 400px scroll panel. Its visibility while idle at 1280×720 is unverified and may require scrolling. No screenshot evidence is available.
- The result screen requires manual `次の方へ`; it does not enforce the spec's approximate 10-second result and 5-second handoff timing. The root panel does not sequence two change hints over 10 seconds. S4 exit gates remain open.
- No browser, accessibility, physical exhibition display, endurance, user-understanding or full S4 acceptance was completed. Do not mark S4 or the exhibition SHIPPED.

## Important decisions

- Keep the legacy v1 route and its three-item list supported.
- Show actual server-recorded parameter deltas, including band-only transitions; state plainly when no city configuration changed.
- The current S4 patch does not implement S3; the three site mappings remain a prerequisite to S4 acceptance.

## Next expected step

Complete S3's three site mappings, then run the full survey package tests via CI. Obtain browser evidence for the four-question flow, reload/retry recovery, honest result text, visual/keyboard/reduced-motion behavior and recent-band visibility at 1280×720. Address the result/handoff and 10-second hint timing gaps against the spec; S4 remains IN_PROGRESS until its acceptance checks are complete.
