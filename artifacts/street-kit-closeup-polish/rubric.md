# Street kit close-up rubric

Subject: the 2127 street kit (`src/streetKit.ts`, DEV `?roadKit`). Targets (owner-chosen 2026-11-04): avenue = `road-design/gen/avenue-A.jpg`,
boulevard = `road-design/gen/boulevard-B.jpg`. There are no night targets (owner 2026-11-04: night is scored from this rubric alone); the night
crops show the day target for layout only.

Review poses: avenue `?roadKit&review=street&cam=-125,32,-5&at=-40,0,-55&hour=13|21` (the target's pose); boulevard close pose
`cam=-45,24,212&at=0,0,168` (owner 2026-11-04: Gemini enlarged the boulevard, so the crops follow the city and the street keeps its real 24 m).

Owner decisions that set the bar (2026-11-04): widen A's carriageway toward the plaza to ≈ 7 m (street-car lanes move with it); static demo
pods on B's channels in the preview; night scored by rubric only.

Scores: 0 absent, 1 present but off target, 2 matches the bar.

## Avenue A `day`

- `a-carriage` [0.38,0.38,0.62,1.0] capture [0.38,0.33,0.62,1.0] — Pale kerbless ceramic carriageway wide enough for two pods side by side (lane width ≥ pod width × 1.4); thin cool-blue lit lines at both edges and on the lane line, continuous; no grey asphalt, no painted markings.
- `a-planters` [0.18,0.27,0.44,1.0] capture [0.28,0.28,0.47,1.0] — Long stadium planters with a thick white rim sit directly at the carriageway edge (no paved strip between rim and road wider than the rim); each bed is filled edge to edge with dense, varied low leafy shrubs (not rows of spheres), with a few broadleaf trees rising from it.
- `a-rings` [0.18,0.27,0.44,1.0] capture [0.28,0.28,0.47,1.0] — White emitter rings hover low over the planters' road-side ends, ring diameter close to the planter width, a thin lit inner edge and a faint glow on the plants below; at least two rings visible.
- `a-crossing` [0.36,0.64,0.6,0.8] capture [0.36,0.6,0.62,0.82] — A light-panel crossing spans the full carriageway: a row of separate glowing white-blue square panels, flush, clearly brighter than the ceramic, with a person on or beside it.
- `a-footway` [0.1,0.55,0.42,1.0] capture [0.1,0.5,0.4,1.0] — Wide pale stone footway outside the planters with at least three people walking at human scale; the footway reads as one level with the carriageway (no kerb step).
- `a-far-verge` [0.56,0.46,0.82,1.0] capture [0.52,0.38,0.7,1.0] — The opposite verge repeats the pattern: rimmed planter with dense shrubs and trees directly at the carriageway edge, beside the elevated guideway.

## Avenue A `night`

- `an-seams` [0.38,0.38,0.62,1.0] capture [0.38,0.33,0.62,1.0] — Edge and lane lines glow as continuous cool white-blue lines brighter than anything else on the ground, with a soft bloom; the ceramic stays a mid-grey surface (not black, not washed out).
- `an-rings` [0.18,0.27,0.44,1.0] capture [0.28,0.28,0.47,1.0] — Ring inner edges glow white-blue and cast a visible soft pool of light on the shrubs below; the hoops read as lit objects against the dark.
- `an-crossing` [0.36,0.64,0.6,0.8] capture [0.36,0.6,0.62,0.82] — The crossing panels glow as distinct squares, the brightest ground element in the frame.
- `an-planting` [0.1,0.4,0.44,1.0] capture [0.1,0.35,0.47,1.0] — Shrubs and trees still read as green masses (not black silhouettes); the light is cool white-blue only, no warm or saturated street light.

## Boulevard B `day`

- `b-channels` [0.27,0.42,0.52,1.0] capture [0.0,0.5,0.45,1.0] — Each carriageway has one wide recessed guide channel (darker blue-grey, about a third of the carriageway width) along its middle with two lit lines inside and lit lines at the carriageway edges; the carriageway is pale ceramic and does not read as a multi-track railway.
- `b-median` [0.24,0.28,0.52,0.75] capture [0.12,0.35,0.62,0.85] — A raised white-rimmed median planter carries a row of slim columnar (cypress-like) trees, crown height ≥ 3 × crown width, spaced along it, over a bed of dense leafy shrubs.
- `b-terrace` [0.0,0.22,0.36,0.78] capture [0.0,0.28,0.5,0.72] — The outer footway sits one low step above the carriageway with a lit lip, and its planter strip is a continuous dense band of leafy shrubs in a white-rimmed bed.
- `b-blades` [0.2,0.15,0.62,0.5] capture [0.15,0.15,0.75,0.7] — Curved white lamp blades stand along the terraces at regular spacing, each clearly visible as a tapered crescent (thickness readable at the frame's scale) with a lit inner strip.
- `b-pods` [0.34,0.36,0.48,0.62] capture [0.05,0.45,0.55,0.95] — At least two rounded white pods ride the guide channels, centred on them, at the correct scale against the people and the lanes.
- `b-bridge` [0.0,0.7,0.52,0.84] capture [0.0,0.4,0.7,0.95] — A flush light-bridge crossing spans both carriageways: a pale band brighter than the ceramic, with light lines continuing across it, and footways meeting it on both sides.

## Boulevard B `night`

- `bn-rails` [0.27,0.42,0.52,1.0] capture [0.0,0.5,0.45,1.0] — Channel lines and carriageway edge lines glow as continuous cool white-blue lines with a soft bloom; the channel reads darker than the ceramic between them.
- `bn-blades` [0.2,0.15,0.62,0.5] capture [0.15,0.15,0.75,0.7] — Lamp blade strips glow and throw visible light onto the terrace and carriageway below.
- `bn-lip` [0.0,0.22,0.36,0.78] capture [0.0,0.28,0.5,0.72] — The terrace lip seam glows as a continuous line separating footway from carriageway.
- `bn-planting` [0.24,0.28,0.52,0.75] capture [0.12,0.35,0.62,0.85] — Median cypresses and shrubs read as green masses, not black; light is cool white-blue only.

## Calibration

R1 (2026-11-04): owner agreed with the R1 judge scores as the bar (「我同意R1嘅分數」): thin saturated blue lines, sphere-and-spike
planting, thin rings and blades, a flat channel and a dim bridge all score 1; the night glow, pods and night planting colour score 2.

R3 (2026-11-04): owner accepted R3 as is (「Accept as is」) at 32/40, with nine items still below 2 (handoff R3 entry).
