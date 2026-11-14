---
name: long-polish-loop
description: Run a long unattended city2127 visual polish (overnight or multi-hour) over several sites or parts toward owner-picked target images, one fresh session per site, each run with the closeup-polish judge kit. Use when asked for an overnight or goal task, or to polish several close-ups or parts while the owner is away.
---

# Long polish loop

The unattended wrapper around [closeup-polish](../closeup-polish/SKILL.md): that skill is the per-site method (diagnose, target, rubric, spec, round, blind judge, pairwise judge); this one covers what changes when the owner is asleep and there are several sites.

Lessons from city-taste-v2 (2026-11-02 overnight, [handoff](../../../docs/handoffs/archive/city-taste-v2.md)): every part "passed" by 03:52, 7 h of budget went unused and the result sat far from the target — pass meant *better than before*, the coordinator judged its own specs, "Weak:" notes passed, nobody judged the whole frame, thumbnails hid detail, close-ups were never captured. NW (2026-11-03) added: Gemini enlarges the subject, so size must be decided before the rubric; a single absolute judge drifts ±1, so pairwise judging decides keep or drop. The accepted finish level is NW bay R2 (`$CITY2127_EVIDENCE_ROOT/nw-closeup-polish/bay-r2/review-bay-r2.jpg`, 19/20).

## Roles

- **Owner**: picks targets and decides sizes before leaving; alone accepts visuals and merges to `main` afterwards.
- **Dispatcher** (Opus, the session the owner starts): preflight, integration branch, prep, Gemini, then starts **one site session at a time** and verifies, merges and re-dispatches. Only an owner-started session can `start_session`, so the dispatcher never hands this role on.
- **Site session** (Opus, started by the dispatcher, fresh context, the dispatcher's folder): runs closeup-polish steps 4–7 for one site in a single turn without asking anyone.
- **Worker**: one Sonnet subagent (`model: sonnet`) per site session, resumed every round. **Judges**: fresh subagents every round (absolute + pairwise), shown only `rN/judge/` and `rN/pair/`.

## Phase A — owner awake (≈ 2 h before leaving)

1. **Preflight.** AGENTS.md startup. Create the night folder (a worktree, so only if the owner told you to use one; otherwise a `feat/<task>` branch in the main checkout): `git worktree add <repo>/../city2127-<task> -b feat/<task> origin/main`, symlink `node_modules` and `survey/node_modules`, push, write `docs/handoffs/<task>.md` (PLANNED, site queue, deadline). Call `request_keep_awake` for the whole night. Done: integration branch pushed.
2. **Prep, in parallel.** One read-only session per site (`cwd` = night folder, own Vite port, no commits) does closeup-polish step 2 (diagnosis table, chosen pose) and step 3 up to `prompts.md`, writing to the evidence folder `<task>/<site>/`. Done: per site a pose, `baseline/` captures and `prompts.md`.
3. **Targets.** One Sonnet agent generates every state in Gemini through Claude in Chrome ([recipe](../closeup-polish/SKILL.md#gemini-target-images)), sites in turn, into `<site>/gen/`. Show the owner a contact sheet per site; the owner picks, and for each subject answers the size question: *grow the model to the target's frame share* or *crops follow the city*. Publish picks to `artifacts/<task>/<site>/target/` with `node scripts/publish-evidence.mjs`; record the size answers in the handoff. Done: every state has an owner-picked target and a size decision.

The owner may leave after step 3. Nothing below waits for them.

## Phase B — unattended

4. **Dispatch.** Start the next site session (`start_session`, `initiation: "user_asked"`, `context: "fresh"`, `cwd` = night folder) with a brief naming: site, its targets and evidence folder, the size decision, the round cap, the time it must stop, and **Site rules** below. Wait for its report — never poll; the app wakes the dispatcher when it ends its turn.
5. **Verify.** Read the site's `rN/pair.md` and `rN/review.jpg` yourself (full size), rerun `npm test && npm run build && git diff --check`, check the gates, then merge the site branch `--no-ff` into `feat/<task>` and push — passed or parked alike (a parked site keeps its best kept round). Append the site's score row to the handoff. Done: integration branch holds the site.
6. **Spend the budget.** When every site has had a first pass and time remains before deadline − 1 h, start a new session on the lowest-scoring parked site, brief: continue from its handoff entry, spec aimed at its lowest items. Stop dispatching at deadline − 1 h, and message every running site session to stop new rounds then; Deliver starts at deadline − 1 h whether or not sessions report, from the last pushed kept rounds.
7. **Deliver** by the deadline: capture every headline close-up of every site in the queue *and* the already-accepted ones, low and high, day and night, at their live poses, and compare with the Phase A baseline (blocking or regression reopens nothing now — list it). Run [`fps.sh`](../closeup-polish/scripts/fps.sh) once on the integration branch at the heaviest meters. Build one night board (each site's `review.jpg` + score row), publish it, update the handoff (score table, every item below 2, each blocker with its options, branch refs, what needs the owner), send the board with SendUserFile (`proactive`). Done: the owner can decide from the board alone.

## Site rules (put in every site brief)

- Run closeup-polish steps 4–7 with its judge kit (`scripts/crops.py prep` / `decode`); skip step 7's owner calibration — the bar is the owner's words already in `artifacts/nw-closeup-polish/rubric.md` and the bay R2 board.
- Branch `feat/<task>-<site>` from `feat/<task>` in the night folder; own Vite port; stop every server you start.
- **Pass** = total ≥ 90 % of the maximum, no item 0, no 2-scored item losing its pairwise verdict, gates green. Round cap 4 on a first pass, then **park** at the best kept round.
- **Never wait for the owner.** A constraint that blocks the target (route clearance, lot limits, tests guarding other sites, budget) goes in the handoff under `## Blocked` with options; take the option that keeps the design and touches only this site's files, else leave the item below 2 and work the others. Never lower the design quietly, never delete or relax another site's test.
- A known weakness is a score below 2, never a note on a pass. Do not touch other sites' builders or poses beyond what the spec names.
- Stop new rounds at the time in the brief; leave the branch at the last kept round, pushed, with an `## RN` handoff entry per round.
- Per-item keep and locked regions (closeup-polish steps 5 and 7): a round never carries a lost item's regression forward when its code is separable.
- **One writer per folder.** Only one site session edits the night folder at a time. A session reopened while another works (by the owner or the dispatcher) moves to its own worktree first, only if the owner agrees (`git worktree add <repo>/../city2127-<task>-<site> feat/<task>-<site>`); never commit on another site's branch (2026-11-05: SE's dropped R7 tower edit landed on the SW branch).

## Gates (every round)

- `npm test`, `npm run build`, `git diff --check` green.
- The site's headline close-ups, low and high, frame their subject with nothing blocking it — compare with the previous round.
- All UI text Japanese; greenery lush; no floating islands. Site visibility from hero is no gate.
- FPS once per site at its finish with headed `fps.sh` (headless numbers settle nothing); record, do not block the night on it.
- Nothing reaches `main`.
