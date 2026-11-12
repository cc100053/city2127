---
name: polish-ladder
description: Take one city2127 change unit up the two-rung polish ladder (building and change first, resident scene second) and keep the unit table current. Use when asked what to polish next, to continue the staged polish, or to run the whole resident-scene plan for a site.
---

# Polish ladder

Owner direction (2026-11-12): every change unit climbs two **rungs**, in order. The table of units, their rung and the suggested order is in [RESIDENT_SCENE_PLAN](../../../docs/RESIDENT_SCENE_PLAN.md); it is the single place progress is recorded.

| Rung | Deliverable | Skill | Leaves the rung when |
| --- | --- | --- | --- |
| 1 | Building, camera and change read in two seconds | [closeup-polish](../closeup-polish/SKILL.md) | the owner accepts it, or says the unit needs no polish |
| 2 | A named resident acts out the change at human scale | [resident-scene](../resident-scene/SKILL.md) | the owner accepts the full-sequence demo |

Roles on both rungs (owner 2026-11-11): **you advise** — diagnose, write specs, review images and diffs, report. A **Sonnet agent implements** and captures. The **owner alone accepts**.

## Steps

1. **Pick the unit.** Read the unit table. Take the unit the owner named; otherwise the first row of the suggested order whose next step is open. Done: one unit and its current rung stated to the owner in one line.
2. **Gate rung 1.** If the table says the unit is unpolished, show the owner its current close-up (−1/0/+1, day and night, from `~/city2127-evidence/closeup-frequency-sheet/` or a fresh capture) and ask one question: polish, or good enough. Done: the owner's answer is recorded in the table.
3. **Climb.** Run the rung's skill to its own finish. Work on one unit and one rung per task branch; a rung-2 scene starts only on a building the owner has accepted, because the set, the camera and the resident's scale all hang off the finished model.
4. **Record.** Update the unit's row (what was accepted, link to its handoff), the handoff, and the documents in the [sync table](../../../docs/CONTRIBUTING.md#documentation-sync). Done: a reader of the table alone knows the unit's rung and next step.
5. **Report and stop.** Send the owner the evidence and name the next unit. The owner picks whether to go on.

## Working with the Sonnet agent

- One agent per unit, resumed with `SendMessage` every round so it keeps context. Each brief names the files to read, the round's spec, the captures to return and "commit, never merge or push".
- A brief is a measured inventory, never an adjective. "Match the sheet" produced a thin mannequin with a tiny head; a 13-row table of proportions read off the sheet fixed it in one round.
- The agent may hit the usage limit mid-round. On resume, its first instruction is to inspect the worktree (`git status`, last commit, evidence folder) and continue from what exists.
- Its report is a claim. Before telling the owner a round is done, view the capture sheets yourself at full size and read the diff; say which captures you did not view.
- When a fix fails twice, ask the agent to find the cause by measurement before changing anything else. A dark figure was "fixed" with six times the fill light for a round; a luminance probe showed the fill plus bloom was washing him out.

## What the owner has already decided

- Path A: the city stays subtle; the drama is residents' lives. Every result gets a resident beat; about 20 s back to hero is acceptable.
- Gemini target images come before any modelling, and the owner picks them. Blender GLB beats procedural three.js.
- Voting and ladder rules may be reshaped to steer guests to polished showpieces.
- Formal wiring (the 13 s reading slot, leases, A/B scheduling, iPad screens) is a product-contract change and a separate task; both rungs end at an owner-accepted DEV result.
