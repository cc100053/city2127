---
name: place-building
description: Bring an owner-supplied building image into city2127 — choose its rotation question/option and lot, generate any missing state targets, then build it in owner-judged rounds, one fresh session per round. Use when the owner shares a building image or description and asks which question/option it fits, where it goes, to build it, or to run its next round.
---

# Place a building

Proven on the SW event shelf (2026-11-13; handoff `docs/handoffs/sw-event-shelf.md` on `feat/sw-event-shelf`, owner decisions in `Dev_QA.md` Q12–Q13). The owner brings a finished image; you turn it into a building placed on a rotation lot or in the fixed background. The **owner judges every round**: no judge subagents, no rubric scores.

Two kinds of session:

- **Decide session** (steps 1–5): discussion, siting, targets, set-up. No feature code.
- **Round sessions** (see **Rounds**): one fresh session per build round, started by the owner with the round prompt. The handoff is the only memory that carries between them.

## Decide

1. **Lock the massing first.** Before any scan or image generation, ask these questions together in one message:
   - Is the image the target, and which state does it show?
   - Should the building follow the vote, or stay as fixed background?
   - Which question and A/B/C option should it represent, and what occupies the lot in the other options?
   - What is the massing: footprint in metres, floors × floor height, overhangs?

   Done when the owner has answered all four.
2. **Fit table.** Compare missing A/B/C models in the [rotation matrix](../../../docs/QUESTION_ROTATION_PLAN.md) and fixed-background placement. Note duplicates and whether the options use one lot or several. Record the selected option and its vacant state when applicable.
   - Quote every site in metres. `changeSites` `w`/`d` are local units × `scale`: COMMONS PLAZA is 12 × 10 × 4 = 48 × 40 m. Misreading it as 12 × 10 m skewed the case for a new flagship over a court upgrade.

   Done when the owner has picked the role.
3. **Lot.** The **footprint** is the largest of: the building with all its overhangs (crane rails, canopies), the other replacement models on the same lot, and the forecourt.
   - Scan: `SCAN_LOT=<w>,<d> node --experimental-strip-types tests/odaiba.test.ts` (about 50 s). It lists clear areas, each with its best hero pixel count.
   - Probe: `SCAN_LOT=<w>,<d>,<x>,<z>` lists every reason that centre fails (change sites, courts, housing, towers, pods, bays, routes, the district edge, ground, blockers in the whole rectangle). Show a lot as a candidate only after its probe prints `CLEAR`.
   - Not covered by the scan: energy devices, the Sky Ring, the aerial layers in `src/layout.ts` (check the building height against them) and other sites' models that outgrow their `w × d`. List these as unverified.
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
   - Work on `feat/<task>` in the main checkout; if it holds another session's work, create a worktree `../city2127-<task>` from `origin/main` (AGENTS.md) and remove it when the task is done.
   - Write the handoff from `docs/handoffs/TEMPLATE.md` with every decision: role, lot, facing, massing, mechanism, states, target paths and the owner's own words.
   - Write `artifacts/<task>/spec.md` as a target inventory (closeup-polish step 5 format), including the `## Library` table.
   - Write `## R1 brief` in the handoff.

   Done when the handoff alone lets a fresh session build R1. Give the owner the round prompt, then stop.

## Rounds

The owner pastes this prompt into a new session:

> place-building round for `<task>`: worktree `<path>`, read `docs/handoffs/<task>.md`. Owner verdict on R(N−1): «owner's words».

1. **Start.** Run the AGENTS.md preflight in the worktree. Check that R(N−1) is committed and pushed, the tree is clean, and none of the earlier rounds' dev servers or `playwright-cli` sessions are still running (stop any you find).
2. **Brief.** Copy the verdict word for word under `## R(N−1) verdict`. Then turn each of the owner's words into a measured row of `## RN brief`: metres, counts, or on-screen pixels at 3200 × 1800. When a word reads two ways ("more space between the frame"), build the likelier reading and name the other one in the report.
3. **Build.** Follow the closeup-polish **Blender route**, with the library first. Allow at most three capture-compare passes. Rerun the building's own unit test while iterating, and the full suite once, at the end. In the round that first puts a rotation model on its lot, also do **Wire the result caption** below.
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

## Wire the result caption

Required for every rotation model (owner 2026-11-28), written in the same round as the model is placed. The big screen names the guest's own option in the result-card title from the moment the vote orbs land and in the floating tag from the camera fly-in, then shows only the effect line after the build. A model is not done until its caption follows this pattern.

1. **Result row.** Add or confirm `QXX_RESULTS[option] = [place, preference]` in `src/rotationLayout.ts`, marked as provisional owner copy (plan 5.2) like the existing rows.
2. **Effect copy.** Write the effect for the model entering, leaving, and the lot staying vacant, following `q03Result`/`q05Result`/`q06Result`/`q08Result`, and route the swap through `residentResult`, `visitPreference` (`src/surveyAtmosphere.ts`) and `conceptVisit`. Keep each effect line to about one sentence.
3. **Visit and shot.** Add the `ROTATION_VISITS` entry and its headline shot (`src/headlineCamera.ts`).
4. **Exact option.** Confirm `featuredAnswer` returns the guest's exact option label, without the closing 。, for swap, visit and concept results.
5. **Guard.** Run `node --experimental-strip-types tests/rotationCaptions.test.ts`. It fails for a `ROTATION_VISITS` entry without its copy.
6. **Change sheet.** Regenerate it with `node --experimental-strip-types scripts/changeSheet.ts` and commit it.
7. **Captures.** On the real vote pipeline (`survey` `npm run dev:auto`), capture the result at 3.5 s (option in the title and tag) and at 10.5 s (effect line after the build) for owner review.

Done when the guard passes and the owner has the two captures.

## Time sinks seen

- Never use sed (macOS in-place sed takes a different flag syntax, and the repo hook blocks it). Make edits with the Edit tool or Python.
- Check `git fetch`'s exit code before you record that it failed: a typo in the next command once wrote "fetch failed" into a handoff.
- The full `npm test` takes about 10 minutes. Run it once per round, in the background, and never for documentation-only changes.
- A long-lived coordinator that watches the rounds grows until it is compacted. With the handoff as the memory, no coordinator is needed.
