# Exhibition S4 — guest UI and root feedback

- Owner: Codex Luna Max (survey UI implementer)
- Status: SHIPPED — 2026-09-30 exit-gate browser checks passed; `5ae6e35` passed [feature CI 36631026705](https://github.com/cc100053/city2127/actions/runs/36631026705); integrated as `5e14078` and [main CI 36631134812](https://github.com/cc100053/city2127/actions/runs/36631134812) passed; deviations listed below
- Branch: `codex/exhibition-s4` (original, integrated via `4212b80`); acceptance pass on `codex/exhibition-s4-acceptance`
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

## 2026-09-30 acceptance pass (Claude)

- Branch `codex/exhibition-s4-acceptance` from `main` `8de107b` (S1–S4 and lifecycle integrated; S3 shipped). Owner for this pass: Claude.
- Code changes:
  - `survey/src/ui/guestDebugView.ts`: result (~10 s) → handoff (~5 s; `次の方へどうぞ`, proposal number) → welcome auto-advance, with buttons to skip; recovery storage is cleared on entering handoff. `lifecycle_blocked` shows a Japanese wait message without the server's English detail. `変更` on the review screen returns straight to review once all four answers exist.
  - `survey/src/ui/debug.css`: tighter vertical spacing so every question page and the review screen's submit button fit 1280×720.
  - `src/surveyAtmosphere.ts` / `src/style.css`: in v2 mode the `最近64人` count and band precede the latest proposal (v1 order unchanged); latest feedback lists city changes → note → Meters → compact `質問 N` answers (question text as `title`); the band uses 12 columns so 64 cells take six rows.
- Browser evidence (2026-09-30, isolated survey `127.0.0.1:8792` with a temp DB, root Vite `127.0.0.1:5184`, built-in browser):
  - Guest 1280×720: keyboard-only Tab/arrow/Enter through four questions with a visible focus ring and text `選択中`; reload mid-draft restored Q4 and earlier answers; back kept Q3's answer; review listed four answers; review `変更` on Q2 returned to review with the new answer.
  - A simulated lost response (server committed, client got a network error) locked edits and offered same-ID retry; reload replayed it as `#1`, `参加者 1 人` (counted once).
  - Result → handoff → welcome advanced automatically (handoff measured 5.0 s) and cleared storage. Starting before staff exit showed `前の方の体験がまだ終了していません。スタッフが確認するまで少しお待ちください。`; admin `guest-left` returned lifecycle to `ready` and the next start succeeded.
  - Idle: after 60 s the warning appeared with focus on `続ける`; 15 s later the draft ended (`草稿を終了しました`), storage was cleared and guest count stayed unchanged. A new session could start afterwards.
  - Layout: every question page measured exactly 720 px tall (next button bottom 668 px); review submit button bottom 717 px (the frame's lower edge still scrolls ~37 px). The result page is longer than 720 px and scrolls; its summary and city changes are at the top.
  - Reduced motion: the guest page animates only under `prefers-reduced-motion: no-preference`; the root panel has no animation.
  - Root panel: before the change, at 1280×720 the panel spanned 120–520 px and the band was at 854 px. After it, with 70 guests (64 cells; oldest shown `#7`), the band spans 261–386 px and the first two change rows (409, 450 px) and note (490 px) are visible without scrolling; 1920×1080 gives the same positions and the panel does not cover the sites.
  - No screenshots were archived; values above are DOM measurements plus visual review.
- Checks: root `npm test`, `npm run build`, `git diff --check`; `survey/` `npm test` and `npm run build` passed on the final worktree. No new unit test: the changes are DOM ordering, CSS and timers, covered by the browser run above.

## Remaining deviations (S4 exit gate otherwise met)

- The guest result and root panel show up to two changes together rather than sequencing two hints over 10 s.
- The welcome screen does not switch to the spec's inherited-city wording (`この街は、これまでの参加者がつくりました。`) when guests already exist.
- The root scene's 3 s site transitions do not honour `prefers-reduced-motion`.
- The result page scrolls at 1280×720; it is shown for ~10 s.
- S5 items (100 proposals/60 min endurance, exhibition hardware/FPS, five-person understanding test) remain open.

## Next step (2026-09-30)

S4 is complete. Next is S5 exhibition acceptance (100 proposals / 60 min endurance, exhibition-PC FPS, five-person understanding test, daily staff handoff) and, if the owner wants, the remaining S4 deviations above.
