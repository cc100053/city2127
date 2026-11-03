# NW close-up polish — rubric

Per [closeup-polish](../../.agents/skills/closeup-polish/SKILL.md) step 4. Each item: `id` [x0,y0,x1,y1] crop (normalised, same in target and capture) — observable. Scores 0 absent / 1 present, off target / 2 matches the bar.

Poses (the targets were generated from these, so captures use them too, 12:00, HUD hidden):

- Flagship: `cityPose([192,44,-338],[40,54,-300])` (`nw:e`) — targets [flagship-low](target/flagship-low.jpg), [mixed](target/flagship-mixed.jpg), [high](target/flagship-high.jpg).
- Bay 10: `cityPose([-10,40,-90],[75,32,-160])` (`nw:bay-e`) — targets [bay-low](target/bay-low.jpg), [mixed](target/bay-mixed.jpg), [high](target/bay-high.jpg).

Owner bar: flagship accepted at R9 25/28 (「分數OK」, 2026-11-03); bays accepted at Bay R2 19/20 (「Accept R2 scores」, 2026-11-04).

## Flagship −1 `low`

- `fl-glazing` [0.36,0.62,0.78,0.98] — the hall's camera-facing ground floor is one wide glazed frontage, warm-lit inside across at least two thirds of its width, under an overhanging white roof slab.
- `fl-people-in` [0.45,0.74,0.68,0.92] — at least 6 people readable inside at counters: staff behind, residents seated across.
- `fl-forecourt` [0.40,0.80,0.62,0.99] — a paved forecourt in front with benches, small trees, at least 8 residents standing in groups and the amber lot outline.
- `fl-canopy` [0.39,0.53,0.72,0.65] — a thick lens-shaped disc hovers above the roof with a clear gap, blue rim seam and at least 3 glowing under-emitters.
- `fl-material` [0.35,0.50,0.80,1.00] — pure white structure with thin precise seams; no beige or cream masses, no teal stripes.

## Flagship 0 `mixed`

- `fm-hall` [0.41,0.72,0.58,0.99] — a compact glazed hall, warm inside: staffed counter with at least 3 people on one side, at least 2 glowing self-service terminals on the other.
- `fm-arm` [0.44,0.62,0.56,0.82] — an articulated robot arm (at least 2 segments) on the hall roof holding a parcel, at least a quarter of the hall's width.
- `fm-rings` [0.46,0.05,0.59,0.30] — three docking rings near the top, each with a blue seam, drones docked or arriving.
- `fm-column` [0.47,0.25,0.57,0.75] — slender column with panel joints, vertical blue seams and a mid collar band; not a plain smooth cylinder.

## Flagship +1 `high`

- `fh-rings` [0.44,0.10,0.57,0.85] — at least 12 stacked rings, gaps between rings no larger than a ring's thickness, every ring with a blue seam, panelled core behind.
- `fh-arms` [0.44,0.20,0.58,0.75] — at least 4 service arms with parcels on the rings.
- `fh-drones` [0.42,0.10,0.75,0.55] — at least 10 drones in the air near the upper tower, in streams.
- `fh-base` [0.42,0.80,0.60,1.00] — base drum with a portal and a maglev pod, at least 2 glowing terminals, residents on foot, amber lot outline.
- `fh-cap` [0.45,0.00,0.55,0.13] — stepped cap with antennas and small lit windows.

## Bay crops (owner 2026-11-03, after Bay R1: 「Align crops, keep size」)

The bay targets show the bay ≈ 1.35× larger and further right/up than the city can place it (bay size is clearance-bound, R3). Owner decision: keep the bay size and camera; crop the **target** at the first rectangle and the **capture** at the `capture [...]` rectangle, which frames the same subject where the bay actually stands at `nw:bay-e`. Rounds must keep their subject inside the capture rectangle.

## Bay −1 `low`

- `bl-glazing` [0.36,0.60,0.78,0.97] capture [.27,.66,.62,.99] — the hall's camera-facing frontage is glazed and warm-lit, with counters and at least 6 readable people inside.
- `bl-forecourt` [0.40,0.82,0.60,0.98] capture [.38,.80,.60,.99] — a paved forecourt with benches, small trees and at least 6 residents standing.
- `bl-canopy` [0.38,0.48,0.78,0.61] capture [.25,.57,.63,.72] — a thick lens disc with blue rim and at least 3 glowing under-emitters, hovering close above the roof.
- `bl-material` [0.34,0.45,0.82,0.98] capture [.25,.56,.64,.99] — pure white with thin seams; no beige mass, no teal stripe.

## Bay 0 `mixed`

- `bm-hall` [0.40,0.70,0.64,0.98] capture [.34,.72,.58,.96] — a glazed hall, warm inside, staffed counter and terminals, at least 4 readable people.
- `bm-arm` [0.42,0.52,0.58,0.76] capture [.38,.60,.52,.80] — a readable robot arm with parcel on the roof.
- `bm-column` [0.42,0.00,0.56,0.70] capture [.38,.05,.52,.78] — column with panel joints and rings with blue seams, a spire or antenna on top.

## Bay +1 `high`

- `bh-rings` [0.40,0.00,0.60,0.80] capture [.38,.08,.56,.72] — at least 10 closely stacked rings with blue seams around a panelled core.
- `bh-drones` [0.36,0.00,0.70,0.70] capture [.32,.08,.66,.70] — at least 6 drones around the tower.
- `bh-base` [0.40,0.75,0.62,0.99] capture [.32,.68,.60,.97] — base lobby with blue-lit glazing, terminals and residents; no palm tree.
