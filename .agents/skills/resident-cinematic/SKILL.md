---
name: resident-cinematic
description: Make a city2127 resident beat read like a game cutscene (shots and cuts, pose-to-pose acting, light that tells the change, frame-exact review reels), without motion capture. Use when a resident scene looks stiff or rough, when asked to polish a resident's animation or camera, or for the Blender armature track. Draft (2026-11-26), first run on Aoi.
---

# Resident cinematic

Draft, 2026-11-26. Polishes rung 2 of the [polish ladder](../polish-ladder/SKILL.md): it takes a working [resident-scene](../resident-scene/SKILL.md) beat (steps 7–8) and makes it look directed. First run: Aoi, [handoff](../../../docs/handoffs/resident-aoi-cinematic.md). The owner alone accepts; this skill only decides what goes in front of them.

**Owner constraints (2026-11-26):** no motion capture. Low effort, big effect: change camera, timing and light before you touch the model.

## Why beats look rough

Measured on Minato and Aoi (2026-11-26):

- Every value is a smoothstep between hand-typed keys. Nothing anticipates, overshoots or holds, so motion floats.
- The parts are rigid, with no armature. Bends, walking and sitting read as a puppet.
- One continuous camera shows everything, including the motion the puppet does worst. A straight lerp of camera position and target pulls apart and drifts.
- The payoff happens in a wide shot where the resident is a few pixels tall. The viewer sees the effect but never the person it is for.

## Rules

Each rule has a date and a source. The self-improvement loop below edits this list.

1. **Shots, not one camera.** Split the action into 3–4 shots: establish (wide), action (medium, on the hands), payoff (close, on the face). *(2026-11-26, analysis)*
2. **Cut on action.** Cut at the moment something lands, closes or lights. A cut hides the travel between two poses. *(2026-11-26, analysis)*
3. **Weak motion happens off screen.** Walking, turning on the spot and sitting down happen between cuts. The next shot opens with the resident already there. *(2026-11-26, analysis)*
4. **End on the face.** The last shot is the resident reacting in the light or space the change gave them. The caption appears in this shot, not before. *(2026-11-26, analysis)*
5. **Pose to pose.** Each gesture has three parts: anticipation (a small move the other way, 0.15–0.3 s), a fast move into the pose with a slight overshoot, and a hold of at least 0.4 s. Head leads, shoulders follow, torso last (offset 0.05–0.1 s). Keep smoothstep for camera blends only. *(2026-11-26, analysis)*
6. **Never fully still.** Add breathing (torso about 1 % scale or 0.01 rad, 3.5–4.5 s period) and a slow, slight head drift whenever the resident is on screen. *(2026-11-26, analysis)*
7. **Moving cameras move a little.** Use a slow push-in or a small tilt (≤ 4 % of the distance per shot). If a long move is needed, ease in and out on an arc. Never lerp position and target separately in straight lines. *(2026-11-26, analysis)*
8. **Light tells the change.** Light the resident's face in the beat's colour change: a warm key on a cool fill, or the other way round. Add a rim light so the silhouette separates from the set. Keep one fill across all states (resident-scene lesson). *(2026-11-26, analysis)*
9. **Depth of field only in medium and close shots.** Use a Bokeh pass on the existing composer in `src/main.ts`, enabled only during the beat. Measure FPS with it on and off. If the cost is too high, drop the pass and use rule 8's rim light. *(2026-11-26, analysis)*
10. **Owner reviews reels, not live captures.** Reviews use frame-exact reels (below), never a screencast. *(2026-11-26, analysis)*

Timing values come from the [motion-design](../motion-design/SKILL.md) skill. Read its [timing and easing tables](../motion-design/reference/timing-easing-tables.md), [Disney principles](../motion-design/director/disney-principles.md) and [narrative structure](../motion-design/director/narrative-structure.md) before writing keys. Its durations are written for UI; for a character beat, use its ratios and easing families, and scale gestures to the dramatic-reveal and ambient rows. It is vendored from [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) (MIT, commit `d77a9fc`, licence in `motion-design/LICENSE-motion-design-skill`, vendored 2026-11-26 with owner approval). Its Creator MCP handoff (`reference/export-and-render.md`) is not used here: reels come from `scripts/beatReel.mjs`, and an external render service would be a separate owner decision.

## Steps

1. **Preflight.** Run the AGENTS.md startup. The beat already plays in DEV, and its handoff names the current timeline file (`<name>Timeline.ts`) and the DEV scene (`dev<Name>.ts`). Done: a PLANNED handoff that links this skill.
2. **Shot list.** Write a table in the handoff with one row per shot: seconds, framing (wide, medium or close), what is in frame, and the cut point. Add one row for the action and light inside each shot. Apply rules 1–4. Done: the table, plus a contact sheet of the current beat at 0.5 s steps for comparison.
3. **Timeline.** Add `<name>Shot(t)` to the timeline file. It is a pure function that returns `{ shot, u }`, where `u` is the time within the shot. Add easing helpers (anticipate, overshoot, hold, breathe) to the same file. Extract them to `src/residentEase.ts` once a second resident uses them. Add unit tests for shot order, cut times, continuity within each shot and the end pose. Done: `npm test` passes.
4. **Camera and acting.** Drive the shots and the poses from step 3, applying rules 5–7. Keep the existing `<name>Time` and `<name>View` URL parameters working, and add a view for each new shot. Done: a contact sheet at 0.5 s steps that reads as the story with the caption hidden.
5. **Light and lens.** Apply rules 8–9. Done: face luminance probes per shot, day and night, and FPS with and without depth of field against the scene's baseline.
6. **Reel.** Capture a frame-exact reel at 30 fps with `scripts/beatReel.mjs` (round 1 builds it, see below): the full beat by day and by night, plus a side-by-side of the old and new beat. Done: MP4s and contact sheets in `~/city2127-evidence/<task>/<round>/`.
7. **Self-critique, at most three passes.** Before the owner sees anything, score the reel against the checklist below. Fix every item that fails, then capture again. After three passes, send what you have and list the items that still fail. Done: the scored checklist in the handoff.
8. **Finish.** Run `npm test && npm run build && git diff --check`. Update the handoff, regenerate the change sheet (polish-ladder, **Change sheet**) and send the reels. Then run the **Self-improvement** step. Done: the owner accepts the beat or names what to change.

### Self-critique checklist

- [ ] With the caption hidden, a stranger can tell who, what action and what changed.
- [ ] Every cut lands on an action, and no cut jumps the axis.
- [ ] No walking, spinning or sitting is on screen with rigid parts, unless the armature track drives it.
- [ ] Each key gesture has anticipation, a hold of at least 0.4 s and a three-quarter view of the face.
- [ ] The resident is never fully still while on screen.
- [ ] The last shot shows the resident's face in the changed light or space, and the face is readable by day and night.
- [ ] No camera drift. Moves are ≤ 4 % per shot, or on an eased arc.
- [ ] FPS is within the beat budget recorded in the handoff.

## Frame-exact reel tool

The pattern comes from claude-motion and claude-motion-design's `seek(t)` render: the scene is a pure function of `t`, so step it frame by frame instead of screen-recording it.

- In DEV, the resident scene exposes `window.__residentSeek(t)`. It freezes the beat clock at `t`, as `<name>Time` does today, and renders one frame.
- `scripts/beatReel.mjs <vite url> <task>/<round>/<name> [--fps=30] [--from=0] [--to=<end>] [--size=1920x1080]` opens one headless Chrome. For each frame it calls the seek hook, waits for two `requestAnimationFrame`s, captures with CDP `Page.captureScreenshot`, then encodes the frames with the system `ffmpeg`. It also writes a contact sheet at 0.5 s steps and a `.json` sidecar like `npm run capture`.
- The output is evidence only. Publish to `artifacts/` with `scripts/publish-evidence.mjs`.

## Blender armature track

Use this track when rules 1–3 cannot hide a motion, for example a walk, a sit or a two-handed lift, or when the owner asks for more natural acting.

1. **Rigid bind first.** In the character's `build_<name>.py`, add an armature whose bones match the existing joint nodes (`torso`, `head`, `upperArm.L`, …). Bind each rigid part to its bone with weight 1.0. The mesh and the triangle count stay the same, and the animator gets Blender's IK, Graph Editor and NLA.
2. **Clip contract.** Name each action `<name>_<verb>` (for example `aoi_sow`). Use 30 fps and no root motion: the timeline still owns the resident's position. Keep the pivot at the ground centre. Export a GLB with animations and record clip names and lengths in LIBRARY.md.
3. **Playback stays deterministic.** Create the `AnimationMixer` once and call `mixer.setTime(clipSeconds)` from the beat clock each frame, never `update(dt)`. Undo, reset and the reel tool keep working. Keep the rigid-node pose function as a fallback when no clip loads.
4. **Full skinning later.** Joint edge loops and smooth weights are a separate owner decision. They change the triangle budget and the character sheet.
5. **Compare before switching.** Reel the TypeScript-keyed and Blender-keyed versions of the same shot side by side. The owner picks.

## Self-improvement

Run this at the end of every round, in the same commit as the round. It is how this skill gets better without anyone asking.

1. **Record the verdict.** Write the owner's feedback for each shot into the handoff, close to their own words.
2. **Update the rules.** For each piece of feedback:
   - If the owner rejected something a rule required, rewrite or remove that rule. Note the date and the reason, for example `(2026-12-02, owner on Aoi R1: …)`.
   - If the owner accepted a fix that no rule covers, add a rule with its date and source.
   - If the feedback changes a timing value, update the number in the rule itself; don't add a note beside it.
3. **Sharpen the checklist.** For every problem the owner caught that the self-critique passed, add or tighten a checklist item so the next run catches it.
4. **Lessons.** Add at most three lines under **Lessons**: what cost the most time and what to do first next time.
5. **Prune.** Keep this file under about 200 lines. Merge duplicate rules, and move superseded detail into the handoff.
6. **Promote.** When a rule has held on two residents, mention it in [resident-scene](../resident-scene/SKILL.md) step 7 or 8 so new scenes start from it.

Commit these changes with the round as `docs(skill): resident-cinematic — <what changed>`.

## Lessons

- (none yet; Aoi R1 is the first run)
