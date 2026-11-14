---
name: place-building
description: Bring an owner-supplied building image into city2127 — choose its Meter role and lot, generate any missing state targets, then build it in owner-judged rounds, one fresh session per round. Use when the owner shares a building image or description and asks which Meter fits, where it goes, to build it, or to run its next round.
---

# Place a building

Proven on the SW event shelf (2026-11-13; handoff `docs/handoffs/sw-event-shelf.md` on `feat/sw-event-shelf`, owner decisions in `Dev_QA.md` Q12–Q13). The owner brings a finished image; you turn it into a placed, Meter-driven building. The **owner judges every round**: no judge subagents, no rubric scores.

Two kinds of session:

- **Decide session** (steps 1–5): discussion, siting, targets, set-up. No feature code.
- **Round sessions** (see **Rounds**): one fresh session per build round, started by the owner with the round prompt. The handoff is the only memory that carries between them.

## Decide

1. **Lock the massing first.** Before any scan or image generation, ask these questions together in one message:
   - Is the image the target, and which state does it show?
   - Should the building follow the vote, or stay as fixed background?
   - Does it need −1 and +1 forms, or does another building replace it at ±1?
   - What is the massing: footprint in metres, floors × floor height, overhangs?

   Done when the owner has answered all four. On the shelf, four ±1 images went to waste when the owner later asked for ten floors and dropped ±1.
2. **Fit table.** List the four Meters plus "fixed background", one line each, and name any existing landmark the building would duplicate (the shelf echoed housing U). Separate a **focal** role (headline on every ±1) from a **district slot** (changes only at ±2 or ±3 and shares its trigger rate with its siblings).
   - Quote every site in metres. `changeSites` `w`/`d` are local units × `scale`: COMMONS PLAZA is 12 × 10 × 4 = 48 × 40 m. Misreading it as 12 × 10 m skewed the case for a new flagship over a court upgrade.

   Done when the owner has picked the role.
3. **Lot.** The **footprint** is the largest of: the building with all its overhangs (crane rails, canopies), the ±1 replacement models, and the forecourt.
   - Scan: `SCAN_LOT=<w>,<d> node --experimental-strip-types tests/odaiba.test.ts` (about 50 s). It lists clear areas, each with its best hero pixel count.
   - Probe: `SCAN_LOT=<w>,<d>,<x>,<z>` lists every reason that centre fails (change sites, courts, housing, towers, pods, bays, routes, the district edge, ground, blockers in the whole rectangle). Show a lot as a candidate only after its probe prints `CLEAR`.
   - Not covered by the scan: energy devices, the Sky Ring, the aerial layers in `src/layout.ts` (check the building height against them) and other sites' ±1 models that outgrow their `w × d`. List these as unverified.
   - Hero visibility ranks the candidates but never gates them.
   - Lessons from the old court scan, which raycast only `city` with a circle:
     - It offered the NW AUTO HUB lot as "best" twice, because survey sites are not in `city`.
     - It missed the court 6 overlap and the `DISTRICT.maxZ` overshoot. R3 then paid for both with a 15 m move and a new camera.

   Done when the owner has picked a lot that probes `CLEAR`, and its facing is recorded.
4. **Targets for the missing states only.** Use the closeup-polish Gemini recipe, plus these rules:
   - Copy the base image into the session scratchpad before uploading it. Chrome upload cannot read the evidence folder.
   - Rewrite the shared block whenever the massing changes. A stale "3 × 2 × 2 frame" line produced 7–8 tiers instead of 10.
   - Ask for landscape, and say what reads as 2127. Roller shutters looked like today; smart privacy glass with teal lock lights did not.
   - View each image yourself at full size before you relay the agent's report.

   Done when the owner has picked a target for every needed state.
5. **Set up rounds.**
   - Work on `feat/<task>` in the main checkout. Create a worktree `.claude/worktrees/<task>` from `origin/main` only if the owner told you to (AGENTS.md); if the main checkout holds unrelated work, ask.
   - Write the handoff from `docs/handoffs/TEMPLATE.md` with every decision: role, lot, facing, massing, mechanism, states, target paths and the owner's own words. Add a `Dev_QA.md` entry.
   - Write `artifacts/<task>/spec.md` as a target inventory (closeup-polish step 5 format), including the `## Library` table.
   - Write `## R1 brief` in the handoff.

   Done when the handoff alone lets a fresh session build R1. Give the owner the round prompt, then stop.

## Rounds

The owner pastes this prompt into a new session:

> place-building round for `<task>`: worktree `<path>`, read `docs/handoffs/<task>.md`. Owner verdict on R(N−1): «owner's words».

1. **Start.** Run the AGENTS.md preflight in the worktree. Check that R(N−1) is committed and pushed, the tree is clean, and none of the earlier rounds' dev servers or `playwright-cli` sessions are still running (stop any you find).
2. **Brief.** Copy the verdict word for word under `## R(N−1) verdict`. Then turn each of the owner's words into a measured row of `## RN brief`: metres, counts, or on-screen pixels at 3200 × 1800. When a word reads two ways ("more space between the frame"), build the likelier reading and name the other one in the report.
3. **Build.** Follow the closeup-polish **Blender route**, with the library first. Allow at most three capture-compare passes. Rerun the building's own unit test while iterating, and the full suite once, at the end.
4. **Capture** into `$CITY2127_EVIDENCE_ROOT/<task>/rN/` with one `npm run capture -- --size=3200x1800 <url> <task>/rN/<name> ...` batch (the closeup-polish **Capture** note):
   - `focal-day` and `focal-night`;
   - `overview`;
   - one close-up per brief row;
   - a keyframe sheet of every moving mechanism;
   - `r(N−1)-vs-rN.jpg`, and a strip against the target.
   Run `fps.sh` once and compare with the R1 figure (R1 records the baseline).
5. **Self-review** every capture at full size against every brief row. Mark each row met or short, in plain words.
6. **Close the round in this turn.**
   - `npm test && npm run build && git diff --check`.
   - Commit with the short rows in the message, and push the branch.
   - Stop every server and browser session you started.
   - Add a `## RN` handoff entry: what changed, checks, short rows, FPS (or "not measured"), open questions.
   - Send the owner the captures with SendUserFile.

   Done when the branch is clean and pushed, nothing runs in the background, and the owner has the images. Merge only after the owner accepts. Then follow polish-ladder **Record** and regenerate the change sheet, and update any copy that still names the replaced building.

## Time sinks seen

- Never use sed (macOS in-place sed takes a different flag syntax, and the repo hook blocks it). Make edits with the Edit tool or Python.
- Check `git fetch`'s exit code before you record that it failed: a typo in the next command once wrote "fetch failed" into a handoff.
- The full `npm test` takes about 10 minutes. Run it once per round, in the background, and never for documentation-only changes.
- A long-lived coordinator that watches the rounds grows until it is compacted. With the handoff as the memory, no coordinator is needed.
