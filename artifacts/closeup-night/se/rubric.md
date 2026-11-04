# SE close-up (closeup-night) — rubric

Per [closeup-polish](../../../.agents/skills/closeup-polish/SKILL.md) step 4. Each item: `id` [x0,y0,x1,y1] target crop, optional `capture [x0,y0,x1,y1]` where the city places the same subject — observable. Scores 0 absent / 1 present, off target / 2 matches the bar.

Poses (owner 2026-11-04), 12:00, HUD hidden:

- **L** `se:focal-low` = `cityPose([130,28,-95],[182,24,-38])` — −1 [flagship-low](target/flagship-low.jpg) and 0 [flagship-mixed](target/flagship-mixed.jpg).
- **H** `se:focal` = `cityPose([360,45,-50],[182,58,-38])` — 0 [tower-mixed](target/tower-mixed.jpg) and +1 [flagship-high](target/flagship-high.jpg).

Size (owner): grow the model to the target's frame share within the 14×14 lot. The −1 target spreads pavilions past the lot (Gemini), so the −1 capture rectangle frames the lot. The 0 tower must also fit the L frame (top of frame ≈ 18 local units above the lot at L), so at H it stands lower than `tower-mixed` shows; the `tm-*` capture rectangles frame it where it stands (see `## Blocked` in the handoff).

Bar: NW bay R2 board (19/20, 「Accept R2 scores」) and the owner words in [NW rubric](../../nw-closeup-polish/rubric.md). People and emitters must read at crop size: people larger than a door's half-height, light clothes, seated figures bent at the knee; emitters glow, not flat discs.

## Flagship −1 `low`

- `fl-pavilions` [0.17,0.47,0.98,0.88] capture [0.15,0.45,0.88,1.00] — at least 5 separate round white single-storey pavilions (drums) spread over the lot, each with a wide camera-facing glazed wall warm-lit inside and a thin amber seam under the roof edge.
- `fl-discs` [0.20,0.47,0.92,0.72] capture [0.15,0.42,0.88,0.85] — every pavilion carries a thin white roof disc wider than its drum, hovering above it with a visible gap and a glowing collar between disc and roof.
- `fl-people-in` [0.20,0.58,0.92,0.86] capture [0.15,0.55,0.88,1.00] — inside at least 3 pavilions furnished rooms (tables, shelves, counters) with at least 2 readable people each.
- `fl-walkway` [0.30,0.56,0.70,0.92] capture [0.25,0.50,0.80,1.00] — a raised white walkway on thin columns winds through the lot with an amber centre line, people on or under it.
- `fl-garden` [0.10,0.50,0.98,0.98] capture [0.10,0.45,0.90,1.00] — lush planting between pavilions (trees, hedges, terraced planting beds, a water channel), pale paths with benches and at least 8 residents walking or sitting, the orange lot outline around it.
- `fl-material` [0.17,0.47,0.98,0.92] capture [0.15,0.45,0.88,1.00] — white structure with thin amber seams only; no orange or timber roofs, no beige/cream boxes, no barrel vaults.

## Flagship 0 `mixed`

- `fm-tower` [0.40,0.08,0.62,0.80] capture [0.36,0.00,0.66,0.85] — a slender white-framed tower of about 6 storeys, every floor fully glazed and warm-lit with furniture, plants and people inside, thin amber floor seams.
- `fm-lift` [0.36,0.10,0.62,0.92] capture [0.30,0.05,0.68,0.98] — a glazed lift shaft beside the tower and an escalator rising diagonally from the ground to a middle floor, with people on it.
- `fm-crown` [0.40,0.00,0.62,0.20] capture [0.36,0.00,0.66,0.25] — a planted roof garden on the tower top with a glowing amber halo ring hovering above it.
- `fm-wings` [0.20,0.55,0.76,0.95] capture [0.18,0.55,0.82,1.00] — two low glazed warm-lit wings at the tower's foot, each under a hovering white roof disc, joined by a white bridge with an amber line.
- `fm-ground` [0.15,0.70,0.80,0.98] capture [0.15,0.70,0.85,1.00] — residents on the forecourt (at least 8, some seated on benches), planters with shrubs, the orange lot outline.

## Tower 0 `mixed`

- `tm-tower` [0.38,0.08,0.58,0.75] capture [0.42,0.52,0.56,0.92] — from the east the same glazed white tower reads clearly against its neighbours: several warm glazed floors, the lift shaft, roof garden and amber halo.
- `tm-base` [0.36,0.62,0.62,0.98] capture [0.42,0.80,0.62,1.00] — two low glazed wings with hovering roof discs at the base and residents in the courtyard between them.

## Flagship +1 `high`

- `fh-floors` [0.44,0.10,0.56,0.86] — at least 12 stacked glazed floors, each warm-lit with distinct furnishings (desks, shelves, plants, tables) and people readable inside; thin amber floor bands.
- `fh-frame` [0.43,0.00,0.57,0.92] — a slender white frame tower with round corner columns and a round white crown; no orange grid, no flat orange facade.
- `fh-crown` [0.43,0.00,0.57,0.14] — round crown with a glowing amber ring and a roof garden of trees on top.
- `fh-lift` [0.50,0.08,0.58,0.80] — a glazed external lift shaft on the tower side with a visible cabin.
- `fh-gardens` [0.42,0.10,0.58,0.80] — planted sky terraces or balconies with trees on several floors up the tower.
- `fh-base` [0.40,0.80,0.62,1.00] — planted base: trees round the foot, a glazed warm lobby, benches and residents, the orange lot outline.
