# guest-explore — Guest looks at the Sky Ring (空の環を見る)

- Owner: cc100053
- Status: IN_PROGRESS — implemented and checked; owner camera pick and visual acceptance pending
- Branch: feat/guest-explore
- Base commit: 8d89ca4ed66b3a795c7696d8ca5e24f8a527054f
- Last verified commit: see `git log feat/guest-explore` (checks below ran on the committed tree)
- Remote availability: origin/feat/guest-explore

## Session Git state

- Session starting branch and HEAD: main @ 8d89ca4ed66b3a795c7696d8ca5e24f8a527054f
- Last fetched origin/main commit: 8d89ca4 (2026-11-02), local main 0/0 with origin
- Local changes present at session start: untracked `.playwright-cli/`, `.task-relay/`, `artifacts/*` evidence of other tasks (preserved, not committed)
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria (owner decisions 2026-11-02)

- After their own result, the guest's iPad handoff screen shows 空の環を見る; the shared screen zooms to the Sky Ring, explains it in a three-step Japanese caption (energy-narration format) and shows it working: a pod arrives from the regional loop and docks, residents transfer, residents' voice nodes light with the guest's own node glowing.
- iPad shows buttons only (no text). Manual return with 戻る; no timeout (staff handle a forgotten one); unlimited repeats.
- One guest at a time (A/B: first come; the other station's button is disabled); a queued live result blocks the button and a live result, reset, Undo or that station's next Start ends the look. Ephemeral: never stored; reconnects return to hero.
- Reduced motion: camera cuts, caption static.
- Far space elevator: later, after a mid-distance close-up LOD via closeup-polish (Gemini target first); its button appears only then.

## Completed work

- survey: `exploreService.ts` (`POST /api/explore`, in-memory holder, `explore_busy`), `ExploreEvent` in the protocol, broadcast ordering in `server.ts`, guest handoff buttons and WebSocket sync in `guestDebugView.ts`, monitor ignores explore.
- root: `surveyView.parseExplore` → `startSurveyAtmosphere(onExplore)` → `main`; `guestExplore.ts` camera/caption/pod/highlight; `skyRing.ts` exports `EXPLORE_BERTH`, `berthPark`, `voicePosition`, the unbaked explore pod and `highlight(k, glow)` (halo sprite drawn over structure); caption shares the energy-narration CSS.
- Copy (owner may edit, `EXPLORE_COPY`): title 空の環 · 空の港; steps 航路のポッドが空の港へ入る / ここで乗り換え、街の各地へ / 灯る点は住民の声、あなたの声も; note 住民の声 N件 · iPadの「戻る」で街の全景へ.
- Design addition beyond the grill: step 3 widens to a whole-ring pose (from below the hero-side rim) because the guest's node is usually not near the berth.

## Actual validation results

- Verification status: PARTIAL (software PASSED; visual acceptance pending)
- Commands: root `npm test`, `npm run build`; survey `npm test`, `npm run build`; `git diff --check` — PASS.
- Browser: see [VALIDATION](../VALIDATION.md) entry "Guest explore"; evidence [artifacts/guest-explore/r1](../../artifacts/guest-explore/r1/).
- NOT RUN: live-result interruption in the browser, two physical iPads, FPS during the look, exhibition machine.

## Unresolved issues and next step

1. Owner picks the berth camera: `side` (default), `low` (looks up, pod against sky) or `high` (noon glare blows out the pad). Whole-ring pose for step 3 also needs approval.
2. The handoff screen auto-advances after 5 s (`HANDOFF_MS`), so a guest has 5 s after their reading slot to press 空の環を見る; owner to decide whether that window is enough.
3. The hero title block stays over the close-up (as in headline shots).
4. Space elevator LOD + button: separate closeup-polish task.
