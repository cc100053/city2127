# SW close-up (closeup-night) — rubric

Per [closeup-polish](../../../.agents/skills/closeup-polish/SKILL.md) step 4. Each item: `id` [x0,y0,x1,y1] crop (normalised, same in target and capture — the targets were edited from the `sw:n` baseline, same camera) — observable. Scores 0 absent / 1 present, off target / 2 matches the bar.

Pose `sw:n` = `cityPose([-95,30,-15],[-105,10,60])`, 12:00, HUD hidden; targets [flagship-low](target/flagship-low.jpg), [mixed](target/flagship-mixed.jpg), [high](target/flagship-high.jpg). Size (owner 2026-11-04): grow to the target's frame share, fill the lot but never cross the orange lot outline; the hovering disc may rise upward and must stay within the lot footprint (the 0 and +1 targets let it overhang — that part is not the goal).

Bar: NW bay R2 board (19/20, 「Accept R2 scores」) and the owner words in [NW rubric](../../nw-closeup-polish/rubric.md).

## Flagship −1 `low`

- `fl-pods` [0.27,0.40,0.76,0.73] — at least 6 rounded white capsule pods (≈ 4 m rooms) spread over the lot, each with a large curved glass front facing the camera and a thin pink seam framing that glass.
- `fl-people-in` [0.29,0.45,0.74,0.70] — warm-lit interiors with seats; in at least 4 pods one or two seated people are readable through the glass.
- `fl-emitters` [0.29,0.58,0.74,0.75] — every pod hovers on a glowing cool white-blue ring emitter with a visible gap between pod and terrace.
- `fl-screens` [0.33,0.40,0.68,0.66] — at least 4 tall translucent white membrane screens with a pink frame stand between pods, separating them.
- `fl-garden` [0.17,0.52,0.87,0.88] — a lush terrace garden filling the lot: border hedges, shrubs, small trees between pods, curving pale paths, at least 6 residents walking or sitting on pink-topped benches, and the orange lot outline visible around it.

## Flagship 0 `mixed`

- `fm-pods` [0.28,0.42,0.51,0.73] — 3 or 4 hovering white pods with warm-lit glass fronts and pink side panels on glowing ring emitters, at least 2 people in or beside them.
- `fm-ring` [0.52,0.50,0.75,0.73] — an open sunken circle of pink-topped curved benches around a central table, at least 12 residents seated together, children among them.
- `fm-divider` [0.45,0.42,0.60,0.77] — a raised planting bed with lush trees and shrubs clearly divides the quiet pod half from the open circle.
- `fm-canopy` [0.45,0.30,0.80,0.56] — a white hovering canopy disc with glowing stabiliser ring emitters under it and a clear gap below, above the open half, and within the lot footprint (not over the water or past the orange outline).
- `fm-deck` [0.26,0.46,0.87,0.83] — a round white deck on the lawn inside the orange outline, with pink steps leading in; the orange outline stays visible around it.

## Flagship +1 `high`

- `fh-disc` [0.20,0.16,0.64,0.38] — a large white hovering canopy disc with pink seams on its rim and radial ribs, a stabiliser ring and machinery under it, and a clear gap above the terraces; it covers the lot, not beyond it.
- `fh-amph` [0.25,0.40,0.76,0.83] — a wide stepped amphitheatre of white curved terraces with pink edge seams and long curved benches, stepping down toward the camera to an open forecourt.
- `fh-people` [0.29,0.44,0.73,0.76] — at least 16 residents sitting on the steps, at tables, talking, children playing on the forecourt.
- `fh-tables` [0.26,0.39,0.73,0.62] — at least 3 shared round tables with residents around them, and two small glazed warm-lit pavilions at the back corners.
- `fh-planting` [0.25,0.37,0.76,0.70] — at least 4 trees in raised beds on the terraces plus shrub beds; no private pods or screens anywhere.
