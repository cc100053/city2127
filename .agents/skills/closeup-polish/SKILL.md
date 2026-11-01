---
name: closeup-polish
description: Polish one city2127 change site's headline close-up (model, camera, change) to owner-approved target images. Use when asked to polish, redo or make readable a site's close-up or Meter change, or to apply the SE golden sample to SW, NW or NE.
---

# Close-up polish

Golden-sample workflow, proven on SE (2026-11-01; [handoff](../../../docs/handoffs/se-closeup-polish.md), [spec rounds](../../../artifacts/se-closeup-polish/spec.md)). The deliverable is the whole causal chain at one site: the guest's option words → before → change → after, read in two seconds from the close-up.

Roles: **Opus** (you) diagnoses, writes specs, judges screenshots. **Sonnet** subagent (`model: sonnet`, `effort: high`) implements and captures. **Owner** alone accepts. Keep one Sonnet agent for the whole task and resume it each round, so it keeps context.

## Steps

1. **Preflight.** AGENTS.md startup, task branch `feat/<site>-closeup-polish`, handoff from `docs/handoffs/TEMPLATE.md`. Done: branch pushed with a PLANNED handoff.
2. **Diagnose.** Read the site builder in `src/siteBuilders/`, its `changeSites` entry (local units × `scale` = metres), its `SHOTS` poses and the option text in `docs/RESIDENT_COPY.md`. Capture −1/0/+1 at 2–4 candidate poses. Pick one pose framing all three states with sky or sea behind the subject. Done: one diagnosis table (cause per symptom) and a chosen pose in the handoff.
3. **Target images.** Save `baseline/` captures at the chosen pose; write `prompts.md`: one shared block (same camera, light, neighbours, in-engine low-poly style, Meter colour as the only accent) plus one block per state that restates the option text as form. The owner runs them in an external image-edit tool. Done: owner's images saved in `target/`.
4. **Spec.** Write `spec.md` per state: parts with sizes in local units, materials (name each new one), Meter accent, life (people, furniture, planting), the transition read, camera, tests to update, screenshot list. Done: every part in the target has a line.
5. **Round.** Brief the Sonnet agent with only the files to read and the round's section; it implements, passes `npm test && npm run build && git diff --check`, captures into `rN/` with `vs-target.jpg` and night shots. Review against the targets; rerun the checks yourself; commit, push, add an `## RN` handoff entry. Send the owner `vs-target.jpg` plus the weakest state at full size with your verdict. Done: owner says accept, or names the next round.
6. **Finish.** Sample canvas `data-fps` per state (vsync, 1920×1080, discard the first sample); sync `PROJECT`, `EXHIBITION_SPEC`, `VALIDATION` and the handoff index; merge `--no-ff` to main per CONTRIBUTING and confirm main CI.

## Lessons from SE

- `glass` mirrors the sky blue, so a glazed building reads like its blue neighbours. Camera-facing floors use `cream` slabs, `trim` mullions and an emissive warm backing.
- `publicLight` × instance colour turns white at night. Give the Meter accent its own emissive material.
- A high oblique camera flattens height. Close-ups sit low (15–25° pitch), facades over roofs.
- All states share one camera through a change. When the low state is small, use `<socket>:focal-low` (`CarrierChange.low`, `headlineShot`) and keep the other state of that change in frame.
- Growing a lot can drop surveyed trees; `plantCanopy` keys crown rotation by filtered index, so every later crown shifts and far clearance tests in `tests/odaiba.test.ts` fail. Shift the lot centre to keep those trees, and leave `coastalCanopy.ts` as is.
- Capture with `playwright-cli -s=<name>`: `resize`, `goto`, sleep ~10 s, `screenshot --filename=<abs>`, retry on the 5 s timeout. The in-app browser pane cannot screenshot while hidden.
- A Sonnet round took 11–22 minutes and 200–350k tokens; a precise spec is what keeps rounds few.
