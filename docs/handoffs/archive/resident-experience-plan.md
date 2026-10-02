# resident-experience-plan — Two-screen resident experience planning

- Owner: Codex
- Status: DONE — planning/handoff recorded and verified. P2–P5 remain PLANNED; no runtime implementation in this task.
- Branch: `codex/resident-experience-plan`
- Base commit: `6ed44dfcd6e9fdf08943bcc5e509bd46e9fda83a`
- Last verified commit: integrated `41c1dc1d40580a1f4938bec0f9815fbefa253724` (tree identical to source `08f6f4dcea283e9312c383df798c897ada1ebcc9`); final handoff-only closure checked separately
- Remote availability: source `08f6f4dcea283e9312c383df798c897ada1ebcc9` on `origin/codex/resident-experience-plan`; validated main integration is published with this closure

## Session Git state

2026-10-02 (Asia/Tokyo): confirmed `/Users/fatboy/city2127`, clean main at base above, no diff/screenshots to preserve. Origin fetch succeeded; HEAD/origin/main 0/0. Created task branch from this verified main. Owner Codex edits documentation only; no overlapping source modules or binary assets.

P1 base `ba055d88afc1d4123f2a7f5f826848e247fe9403`, source `9273f88decbfa4ec8844585d439b8271179421ea` and integration `2669de628907ef25d13b198c5a387c864b28548c` are ancestors of current remote main. Rechecked [main CI 36995697291](https://github.com/cc100053/city2127/actions/runs/36995697291): SUCCESS on exact base `6ed44df`. No missing P1 commits or unfinished runtime changes to restore.

## Goal and acceptance criteria

User requested repository planning and handoff for the resident-story/two-screen experience. [RESIDENT_EXPERIENCE_PLAN](../../RESIDENT_EXPERIENCE_PLAN.md) preserves P1–P5 scope, screen roles, proposed timing, causal truth requirements, validation and next step. [RESIDENT_COPY](../../RESIDENT_COPY.md) remains the sole copy source; [P1 handoff](resident-copy-p1.md) remains its dated implementation record.

Accept this documentation task when local links/anchors/tracked paths, current-runtime facts, full diff and whitespace pass, and the task is published through [Git workflow](../../CONTRIBUTING.md). Plan completeness is not P2/P3 implementation or S5/hardware acceptance.

## In-scope files and dependencies

New plan and this handoff, with discoverability/status links in SPEC, PROJECT, document index and VALIDATION. Existing P1 copy/source history is retained. No runtime, question JSON, tests, assets, schema, dependencies or infrastructure change; no new design/UI build, deployment or external messaging.

## Completed work

Recorded resident identity, provisional iPad inputs and shared-screen viewing, four-question concentrated viewing plus ambient city explanation, P2–P5 outputs and acceptance gates. Distinguished existing 3-second transition/display spacing from the proposed 10-second reading slot. Identified P3's linked scheduling/lease/guard/drain work and insufficient focal-only change evidence; specified actual-carrier checking or conservative fallback.

Confirmed current Guest result still contains answers/scores/city changes and root has numeric feedback. Read source/call paths through CodeGraph before locating implementation targets; documented caller tracing before future edits. Hardware/Safari/LAN/FPS/recovery policy remains unverified.

## Actual validation results

- Verification status: PASSED — documentation only
- Checked worktree: documentation against base above, 2026-10-02
- Native Python assertions PASS: 223 local Markdown targets across six task files resolve to tracked or task-new files; no local anchor links occur. P1/P2–P5 status and current/proposed timing boundaries checked. No files renamed or deleted.
- Source/state facts reviewed against CodeGraph, P1 history and verified current main; full tracked diff and both new files reviewed. Working-tree, staged and committed whitespace PASS.
- Local runtime test/build/browser: NOT RUN; documentation only
- Current-task source CI [36997529549](https://github.com/cc100053/city2127/actions/runs/36997529549): SUCCESS on exact `08f6f4d` (Node24, root/survey/module-swap install/test/build and committed whitespace).
- Integration `41c1dc1d40580a1f4938bec0f9815fbefa253724`: no conflicts, identical source tree, 223 links/status/timing assertions and committed whitespace PASS again. This final closure changes only the handoff, separately reviewed/checked. Main CI will be checked after publication; its final result is reported in the task completion message.
- Previous P1 CI is verified historical evidence only; it does not validate this new plan or future UI

## Decisions and known limits

P1 DONE means authored Japanese copy with matched ids/effects, not wired UI. P2 PLANNED means copy/screen wiring; P3 PLANNED means truthful district explanations and coordinated reading schedule; P4 PLANNED means software regressions; P5 PLANNED means actual device/exhibition acceptance. Ten seconds is a plan to test, not a measured reading duration or a runtime default. Question-set version compatibility must be traced when text is wired; saved history is not rewritten.

README operation instructions, AGENTS narrative constraints and ART need no new change: this task records the existing direction without changing operation, geometry, motion or workflow. PROJECT/SPEC link the plan and retain current-runtime boundaries; VALIDATION records documentation evidence separately.

## Next expected step

Following a P2 assignment, Codex should perform preflight, read the plan/P1/current source, confirm overlap ownership, create a P2 handoff and implement copy/screen separation. Do not silently start P2 or change timing as part of this documentation task. Input hardware and venue recovery decisions are needed for P5, not as a prerequisite to write P2. Plan/handoff are published via the main integration above; task branch retained, no deployment.
