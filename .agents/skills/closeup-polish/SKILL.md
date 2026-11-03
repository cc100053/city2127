---
name: closeup-polish
description: Polish one city2127 change site's headline close-up (model, camera, change) to owner-approved target images. Use when asked to polish, redo or make readable a site's close-up or Meter change, or to apply the SE golden sample to SW, NW or NE.
---

# Close-up polish

Golden-sample workflow, proven on SE (2026-11-01; [handoff](../../../docs/handoffs/se-closeup-polish.md), [spec rounds](../../../artifacts/se-closeup-polish/spec.md)). The deliverable is the whole causal chain at one site: the guest's option words → before → change → after, read in two seconds from the close-up.

Roles: **Opus** (you) diagnoses, writes rubrics and specs, decides. **Sonnet** subagent (`model: sonnet`, `effort: high`) implements and captures. **Judge**: a fresh subagent every round, no history, scores rounds against the rubric. **Owner** alone accepts. Keep one Sonnet agent for the whole task and resume it each round, so it keeps context.

Lesson from NW (2026-11-03): R1–R3 went to the owner as "matches the target" while the bays had no visible people, no plaza, half the target's rings and glazing facing away from the camera. Opus judged silhouette and frame share only, graded Sonnet against its own spec (which already fell short of the target), sent known "weak" points as a pass, and reviewed 800×450 thumbnails. Steps 4–7 close each of those; [long-polish-loop](../long-polish-loop/SKILL.md) learned the same on 2026-11-02.

## Steps

1. **Preflight.** AGENTS.md startup, task branch `feat/<site>-closeup-polish`, handoff from `docs/handoffs/TEMPLATE.md`. Done: branch pushed with a PLANNED handoff.
2. **Diagnose.** Read the site builder in `src/siteBuilders/`, its `changeSites` entry (local units × `scale` = metres), its `SHOTS` poses and the option text in `docs/RESIDENT_COPY.md`. Capture −1/0/+1 at 2–4 candidate poses. Pick one pose framing all three states with sky or sea behind the subject. Done: one diagnosis table (cause per symptom) and a chosen pose in the handoff.
3. **Target images.** Save `baseline/` captures in the evidence folder `$CITY2127_EVIDENCE_ROOT/<site>-closeup-polish/` (default `~/city2127-evidence`) at the chosen pose; write `prompts.md`: one shared block (same camera, light, neighbours, in-engine low-poly style, Meter colour as the only accent) plus one block per state that restates the option text as form. A Sonnet agent generates them in Gemini through Claude in Chrome (see **Gemini target images**); the owner may instead run the prompts in any image-edit tool. Candidates go to `gen/`; the owner picks and winners are published into `artifacts/<site>-closeup-polish/target/` with `node scripts/publish-evidence.mjs`, never chosen by the agent. Done: owner's images saved in `target/`.
4. **Rubric.** Before any spec, write `artifacts/<site>-closeup-polish/rubric.md` per state (and per carrier, e.g. flagship and bay): 4–6 items, each an observable a judge can score from images alone, tied to a named crop rectangle (normalised x0,y0,x1,y1 of the review frame). Count what the target shows, e.g. "camera-facing side glazed, ≥ 6 people visible inside", "≥ 12 rings, spaced closer than ring thickness × 3", "paved forecourt with amber edge, benches and small trees". Size or frame share is at most one item. Done: every visible difference between baseline and target is an item.
5. **Spec.** Write `spec.md` per state: parts with sizes in local units, materials (name each new one), Meter accent, life (people, furniture, planting), the transition read, camera, tests to update, screenshot list. Check every rubric item against the spec: a spec line below the target (fewer rings, no forecourt, glazing facing away from the camera) is a **ceiling**, allowed only when listed in a `## Below target` section with the constraint that forces it (route clearance, budget, real metres) and approved by the owner. A constraint that blocks the target mid-round is the same: stop and ask the owner with options, never lower the design quietly. Done: every part in the target has a line, every rubric item is covered or owner-approved below target.
6. **Round.** Brief the Sonnet agent with only the files to read and the round's section; it implements, passes `npm test && npm run build && git diff --check`, captures at 3200×1800 day and night at the review pose, crops every rubric rectangle from the capture and the target into the evidence folder's `rN/crops/`, and builds `vs-target.jpg`; only `vs-target.jpg` is published to `artifacts/`. Rerun the checks yourself; commit, push. Done: crops complete.
7. **Judge and decide.** Spawn a new judge subagent with only `rubric.md` (items + owner bar) and, per item, the target crop and the round crop — no reports, specs or round numbers. It scores 0 (absent) / 1 (present, off target) / 2 (matches the bar) with one line of evidence into `rN/scores.md`. Any item below 2 → next round, spec aimed at the lowest items; a known weakness is a score below 2, never a note on a pass. Round 1 is calibration: show the owner the scores beside the crops, record their pass/fail words in `rubric.md` as the bar. After 3 rounds without all 2s, stop and report the score table. Add an `## RN` handoff entry with the score row. Send the owner full-size crops (target | round per item, scores printed) and every item below 2 stated plainly. Done: all items 2 and the owner says accept, or the owner names the next round.
8. **Finish.** Sample canvas `data-fps` per state (vsync, 1920×1080, discard the first sample); sync `PROJECT`, `EXHIBITION_SPEC`, `VALIDATION` and the handoff index; merge `--no-ff` to main per CONTRIBUTING and confirm main CI.

## Gemini target images

Proven 2026-11-01 (SE −1, ~3 min per image; owner-accepted as a pipeline). Needs Claude in Chrome connected (`list_connected_browsers` non-empty) and the owner signed in to Gemini; the agent never types credentials and stops on sign-in, CAPTCHA, consent or quota walls.

- Use `https://gemini.google.com/u/3/app` (owner's account index 3), new chat, tool **Create image**. `/app` is a different account.
- Brief a Sonnet agent (`model: sonnet`) with: the baseline PNG path, the shared block + the state block from `prompts.md` as one prompt, and the output path `gen/<state>.jpg` in the evidence folder. One image per state; resume the same agent.
- Upload: press `+` first so the hidden `input[type=file]` appears, `find` it, then `file_upload`. Paste the prompt with `javascript_tool` `document.execCommand('insertText')` into the editor.
- Download: hover the image, press the download button (full size, lands in `~/Downloads` as JPEG); keep the JPEG. The in-chat blob is only 1024 px.
- Output size is Gemini's choice (2752×1536 vs 1600×900 baseline): scale before side-by-side. Gemini garbles HUD/UI text in the corners; crop or ignore it, targets are for the site only.
- Judge each image: same camera and neighbours, in-engine low-poly look (not photoreal), orange lot outline kept, Meter accent only. Regenerate with a tightened prompt rather than editing the image.
- Fragile: UI changes break the clicks; automating the web UI may breach the provider's terms, so it stays opt-in per task.

## Lessons from SE

- `glass` mirrors the sky blue, so a glazed building reads like its blue neighbours. Camera-facing floors use `cream` slabs, `trim` mullions and an emissive warm backing.
- `publicLight` × instance colour turns white at night. Give the Meter accent its own emissive material.
- A high oblique camera flattens height. Close-ups sit low (15–25° pitch), facades over roofs.
- All states share one camera through a change. When the low state is small, use `<socket>:focal-low` (`CarrierChange.low`, `headlineShot`) and keep the other state of that change in frame.
- Growing a lot can drop surveyed trees; `plantCanopy` keys crown rotation by filtered index, so every later crown shifts and far clearance tests in `tests/odaiba.test.ts` fail. Shift the lot centre to keep those trees, and leave `coastalCanopy.ts` as is.
- Capture with `playwright-cli -s=<name>`: `resize`, `goto`, sleep ~10 s, `screenshot --filename=<abs>`, retry on the 5 s timeout. The in-app browser pane cannot screenshot while hidden.
- A Sonnet round took 11–22 minutes and 200–350k tokens; a precise spec is what keeps rounds few.
