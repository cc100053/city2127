---
name: long-polish-loop
description: Run a long unattended city2127 visual polish (overnight or multi-hour) toward owner-locked target images, part by part, judged by a rubric and a blind judge. Use when asked for an overnight or goal task, or to polish the city or several parts toward a target while the owner is away.
---

# Long polish loop

Lessons from city-taste-v2 (2026-11-02 overnight, [handoff](../../../docs/handoffs/city-taste-v2.md)): every part "passed" by 03:52, 7 h of budget went unused, and the result still sat far from the target. Causes: pass meant *better than before* instead of *close to the target*; the coordinator judged its own specs; "Weak:" notes still passed; nobody judged the whole frame; thumbnails hid detail; close-ups were never captured, so a megastructure blocked the SE headline unnoticed. This loop closes each of those.

Roles: **coordinator** (Opus, its own session started from the owner's session — a session started by another session cannot `start_session`) writes rubrics and specs and decides. **Workers** (Sonnet subagents, `model: sonnet`) implement and capture. **Judge** (a fresh subagent every round, no history) scores. **Owner** alone accepts visuals and approves `main`.

## Steps

1. **Preflight and targets.** AGENTS.md startup; integration branch `feat/<task>` from `main`, part branches `feat/<task>-<part>`. Targets are owner-picked images in `artifacts/<task>/target/` (Gemini recipe: [closeup-polish](../closeup-polish/SKILL.md#gemini-target-images)). Done: targets locked by the owner, baseline captures saved.
2. **Rubric.** For every part write `artifacts/<task>/<part>/rubric.md`: 3–5 items, each tied to a named crop rectangle (normalised x0,y0,x1,y1 of the hero frame) and stated as an observable a judge can score from images alone ("frame tower spans ≈25 % of frame width, right of centre", "> half the ring faces show warm windows at night"). Add `whole.md` for the full hero day and night. Done: every visible difference between baseline and target in that part's crops is an item.
3. **Calibrate with the owner.** Before the owner leaves, run part 1 round 1 and show the judge's scores beside the crops. The owner marks each item pass or fail; record their words in `rubric.md` as the bar. Done: the owner has graded one round.
4. **Round.** Worker implements a `spec-rN.md`, passes `npm test && npm run build && git diff --check`, captures at 3200×1800 (same camera as the target) day and night, crops every rubric rectangle from capture and target into `rN/crops/`, captures the four headline close-ups high and low, samples hero `data-fps` day and night, commits, pushes. Done: the evidence folder is complete.
5. **Judge.** Spawn a new judge subagent with only: `rubric.md` (items + owner bar), the target crop, the round crop and the baseline crop per item. Withhold reports, round numbers and time left. It scores each item 0 (absent) / 1 (present, off target) / 2 (matches the bar) with one line of evidence. Done: `rN/scores.md` written by the judge.
6. **Decide.** **Pass** = every item 2 and every gate green; merge `--no-ff` into the integration branch. Any item below 2 → next round, spec aimed at the lowest items. After 3 rounds without a pass, **park** the part at its score and move on. **Revert** only when gates break unrecoverably. A known weakness is a score below 2, never a note on a pass. Done: decision and score row appended to the handoff.
7. **Whole frame.** After every two or three parts and at the end, judge `whole.md`; reopen the parts behind any item below 2. Done: whole scores recorded.
8. **Spend the budget.** While time remains before deadline minus 1 h, return to the lowest-scoring parked or reopened part. Stop early only when every part and `whole.md` item scores 2. Done: deadline reached or all 2s.
9. **Deliver.** `review.jpg` built from full-size rubric crops (baseline | final | target per item, scores printed), the score table with trends in the handoff, every item below 2 listed plainly, and what needs the owner. Send it with SendUserFile. Done: the owner can judge from the board alone.

## Gates (every round)

- Tests, build and whitespace check green; hero 60 FPS day and night (vsync, 1920×1080, discard the first sample).
- The four headline close-ups, high and low, still frame their site with nothing blocking it — compare with the previous round's captures.
- All UI text Japanese; greenery lush; no floating islands. Site visibility from hero is no gate ([taste](../../../docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)).
- Nothing reaches `main` without the owner.
