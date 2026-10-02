# resident-copy-p1 — Resident narrative and Japanese exhibition copy

- Owner: Codex
- Status: DONE — P1 copy and documentation checks complete; P2/P3 not implemented
- Branch: `codex/resident-copy-p1`
- Base commit: `ba055d88afc1d4123f2a7f5f826848e247fe9403`
- Last verified commit: integrated `2669de628907ef25d13b198c5a387c864b28548c` (tree identical to source `9273f88decbfa4ec8844585d439b8271179421ea`); final handoff-only closure checked separately
- Remote availability: source `9273f88decbfa4ec8844585d439b8271179421ea` on `origin/codex/resident-copy-p1`; validated main integration is published with this closure

## Session Git state

2026-10-02: repository confirmed as `/Users/fatboy/city2127`; clean `main` at base above, no working-tree diff. Origin fetch succeeded; HEAD/origin/main 0 ahead / 0 behind. Existing Meter and A/B handoffs are integrated in current main; no unfinished changes to restore. No overlapping modules or binary assets are edited. This task owns only the new copy document and its documentation references.

## Goal and scope

User assigned P1 after clarifying that the guest is a resident of Odaiba in 2127. Complete Japanese opening, four resident-oriented questions/12 choices, facility captions, honest result templates and short control messages. Input device is provisionally an iPad; viewing content belongs on the shared city screen. [RESIDENT_COPY](../RESIDENT_COPY.md) is the copy source; product decisions belong in [SPEC](../EXHIBITION_SPEC.md).

Documentation only. No runtime/JSON, score, API, asset, schema, camera or scheduling changes. Four question/option ids and effects retain their existing meaning. UI wiring and the suggested 10-second display schedule are subsequent stages, not implemented behavior.

## Completed work

Authored the P1 copy and conditions for no visual change, seeded redistribution, individual/aggregate disagreement and snapshot restoration. Traced question JSON, root feedback/layout contracts and district carriers. Current feedback does not provide all district/seed change evidence; the copy specifies a conservative fallback rather than asserting a false change.

Updated current guidance to record resident identity and screen responsibilities separately from the existing runtime. Historical stage records remain unchanged.

README startup instructions and ART need no change: this stage does not alter operation, geometry, materials or motion. SPEC/PROJECT/AGENTS record the new narrative boundary; the index and VALIDATION link this stage.

## Actual validation results

- Verification status: PASSED — documentation only
- Date/worktree: 2026-10-02, documentation delta against base above
- Python native assertions: all 230 local Markdown targets across seven task files exist; four question ids and all 12 ordered option ids/axes/effects match unchanged exhibition JSON. PASS.
- Facility/factual self-review against current layout/feedback/district source and visual authority: PASS; full tracked diff and both new files reviewed, `git diff --check` PASS. Text-only corrections to one Chinese word and the waiting sentence were reviewed after the initial checks.
- Local runtime tests/build/browser: NOT RUN; this stage changes documentation only
- Source CI [36994837646](https://github.com/cc100053/city2127/actions/runs/36994837646): PASS on exact source `9273f88` (Node24, root/survey/module-swap install/test/build and whitespace). This is not new visual/hardware acceptance.
- Integrated `2669de6`: no conflicts, tree identical to source; integrated local Markdown targets/question correspondence and committed whitespace checked again. Closure changes only this handoff and is reviewed separately. Main CI is verified after publication in the task completion report; this record does not claim an unrun check passed.

## Known limits and decisions

Japanese copy is authored and self-reviewed, not externally language-reviewed. No new UI, reading-time, real iPad/Safari, exhibition hardware or visitor-understanding acceptance. Conditional template selection belongs to P3; proposal.cityChanges alone is insufficient for district redistribution. Existing ≥3-second display spacing/result10s/handoff5s remains current behavior.

## Next expected step

P2 can wire the copy and simplify the screen presentation; P3 must coordinate truthful feedback, 10-second proposed viewing slots and A/B/session recovery. Owner: Codex upon assignment; no subsequent stage has been implemented. Task branch retained; no deployment.
