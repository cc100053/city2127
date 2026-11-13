---
name: resident-scene
description: Build a city2127 resident scene, where a named character acts out a site's change at human scale after the building close-up. Use when asked for a resident beat, a character story for a building, or the next resident after Minato.
---

# Resident scene

Rung 2 of the [polish ladder](../polish-ladder/SKILL.md). Proven on Minato at the NW AUTO HUB (2026-11-11/12; [handoff](../../../docs/handoffs/resident-minato.md)). The deliverable is one **beat**: vote → building change → the camera moves on to one resident, who acts out what the change did to their day, with one caption line → back to hero.

The resident, their lines and actions come from [RESIDENT_SCENE_PLAN](../../../docs/RESIDENT_SCENE_PLAN.md). Roles and Sonnet briefing: polish-ladder. Gemini mechanics, Blender route, capture and FPS tools: [closeup-polish](../closeup-polish/SKILL.md).

## Steps

1. **Preflight.** AGENTS.md startup, branch `feat/resident-<name>`, handoff from the template. The building's rung 1 is owner-accepted. Done: PLANNED handoff naming the site, the resident and the states.
2. **Bible.** One resident per site: name, age, job, why this axis touches their day. Per direction of change, one Japanese line (gain and loss in one sentence, ≤ 34 characters) and one action a viewer understands with the caption hidden. Done: the owner has approved the table in the plan.
3. **Stage survey.** Find where the scene stands, **in every state at once**. Capture 6–8 candidate spots at −1, 0 and +1 with a human-height camera. Measure the site's crowd scale per state (the hub draws people ×1.0, ×1.6 and ×2.6). Choose one spot and one camera relation that is clear of trees, benches and enlarged figures in all three. Done: a three-state contact sheet of the chosen spot, and the scale factors, in the handoff.
4. **Targets.** At that camera, capture baselines and write `prompts.md`: one shared block plus one block per state, and a character-sheet prompt ([Minato's prompts](prompts-minato.md) are the template). Generate in Gemini; the owner picks. Publish winners to `artifacts/resident-<name>/target/`. Done: owner-picked scene targets for every state (plus one night) and one character sheet.
5. **Character.** Spec a measured inventory from the sheet: each part's height as a fraction of total height, widths, colours, what the hands hold. Build with a headless Blender script as rigid parts on named nodes with a pivot at each joint; no armature. Budget ≈ 2,500 tris, materials as roles (`res_*`). Capture front, three-quarter and back beside the sheet. Done: owner accepts the model beside the sheet.
6. **Set.** One GLB for the resident's workplace with named nodes for everything that moves or swaps per state; dressing and extras from [asset/models/LIBRARY.md](../../../asset/models/LIBRARY.md) props and modules; a new prop or reusable character part enters the library first. The set, the resident and the camera offset multiply by the state's crowd factor. Done: each state captured beside its target, resident's face readable day and night.
7. **Action.** Write the action as a pure function of time (`minatoPose` is the pattern) driving the named nodes, with a unit test for continuity and end pose. The resident faces three-quarters to camera through the key gesture. Done: a contact sheet at 1 s steps reads as the action with the caption hidden.
8. **Beat.** Hook the live result: after the building change ends, curve the camera to the resident, play the action once, return to the headline shot, then hero (`residentBeat`, `devResidentDemo.ts`). Fade the result card out during the beat; cancel on any new result, snapshot, reset, Undo or reconnect. Done: recordings of every transition on the real vote pipeline (`survey` `npm run dev:auto`), day and night, plus Undo and a second result arriving mid-beat.
9. **Finish.** `npm test && npm run build && git diff --check`, FPS against the building's baseline, GLB facts (tris, bytes, roles) in the handoff, the unit's row in the plan, and the regenerated change sheet (polish-ladder, **Change sheet**). Send the owner the recordings. Done: owner accepts, or names what to change.

## Lessons from Minato

- **Three states, one decision.** The first camera was chosen on +1 alone; in 0 and −1 it faced a tree, a bench and giant passers-by, and the targets had to be regenerated.
- **Baked neighbours stay.** A site's state meshes are baked, so a scene added beside them can hide none of their props. Move the scene; the props will not move.
- **Too much light looks like too little.** A figure that reads as a dark blob may be washed out by fill light and bloom. Measure face luminance per state with a probe and keep one fill for all states (within 15 % of each other).
- **The gesture decides the staging.** Walking away from camera hid the look-back; a deep bow hid the face under the cap brim. Stage the key gesture toward the lens, and prefer a nod to a bow under a brim.
- **Expression is a part.** A mouth modelled as a fixed smile contradicts a wistful line; give the face swappable mouth nodes.
- **Keep a fallback.** With the capsule puppet removed, a failed GLB load leaves an empty set. Keep the simplest stand-in until formal wiring.
- **Time budget.** Move 1.5 s, action 7.5 s, back 1 s after the 8.1 s building change puts hero at about 20 s. The server's 13 s reading slot, leases, A/B scheduling and iPad screens still assume 15 s.
- **Recording.** Playwright `recordVideo` is unavailable in this setup; use a CDP screencast piped to system `ffmpeg`, and build contact sheets from the frames.
- **Cost.** Minato took eleven commits: character two rounds, set two rounds, pose survey once, beat once, one fix round.
