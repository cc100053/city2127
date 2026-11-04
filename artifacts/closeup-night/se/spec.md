# SE close-up (closeup-night) — spec

Builder `src/siteBuilders/concentrationTower.ts` (the only model file this spec touches). Rubric: [rubric.md](rubric.md); targets in [target/](target/); diagnosis D1–D7 in [diagnosis.md](diagnosis.md). Poses already wired in `src/headlineCamera.ts`: `se:focal-low` = L (−1, 0), `se:focal` = H (0, +1).

Units: local units, `scale` 3 (1 unit = 3 m). Lot is 14×14 (x, z ∈ [−7, 7]); everything stays inside it (the tests check bounds). At **L** the camera looks from −X/−Z, so camera-facing faces are −X and −Z (`faces(..., [2,3])` today); screen-left ≈ +X/−Z, screen-right ≈ −X/+Z. At **H** the camera looks from +X (slightly −Z): camera-facing face is +X, screen-right ≈ −Z. Verify these with one capture before detailing.

Keep: the controller, `Part` levels, the layer split (`towerBase`, `towerUpper`, `towerNeutralProps`), group names (`tower-mid-rise-hall`, `tower-low-pavilion-pair`, `tower-elevator-cabin`, `tower-function-low-1..6`, `-mixed-1..6`, `-high-1..6`, `tower-meter-band`), the cabin animation and every assertion in `tests/concentrationTower.test.ts` (adapt only numeric bounds the new geometry legitimately moves, never weaken another site's test). Function modules stay scale-in groups; reuse them as the furniture/fit-out sets (e.g. −1: one pavilion interior per module; 0: wing/floor fit-outs; +1: one floor fit-out per module).

## Taste (all states)

- Structure **white** (`trim`/a white paint), precise thin seams; **amber** (`amber`, #ffb347 emissive) only on thin seams, floor bands, rings, walkway centre lines. Remove `timber`, `cream` masses, barrel `vault`s, orange roofs, the old `都市集約 / 2127` sign (no new UI text).
- **Glazed warm rooms**: camera-facing walls are see-through glazing into a warm-lit interior: emissive warm back wall / ceiling (`warm`), floor slab, furniture silhouettes (tables, shelves, counters, plants) and people inside, thin white mullions; the pane itself must not mirror the sky (no `glass` on camera faces — a faint, low-opacity clear pane at most). Read how NW does its glazed hall (`src/siteBuilders/automationHub.ts`) and reuse its helpers/materials where they fit.
- **People** (SW lesson tonight: stiff toy figures, seated read as standing): add a site-local figure in this file, not in `mobility.ts`: head sphere, torso, separate legs; per-instance light shirt colour via instance colour on a vertex-coloured geometry (shirt vertices white so the instance colour tints them; legs dark grey, head skin tone), standing height ≈ .62 units, **seated variant bent at the knee** (thighs horizontal forward, shins down) placed on a bench/chair so it reads seated from L. Two `InstancedMesh`es (standing, seated), added after `bake`.
- **Emitters glow**: hovering discs sit on a short collar with an emissive light ring (warm white `#fff4dc`, emissive), visible gap between roof and disc.
- **Lush planting**: trees (`tree`, `leafyCrown`), `shrubs`, hedged beds; never sparse.

## −1 `low` — "many low" (pose L)

- 6 round single-storey pavilions (drums), radius 1.6–2.3, wall height 1.6, spread over the lot with the biggest two nearest the camera (−X/−Z half) and smaller ones behind; no overlap. Each: white base ring + white roof slab (radius r+.1, .18 thick), thin amber seam ring just under the roof edge, glazed warm wall all round (warm interior cylinder + mullions every ~.5), interior furniture (a counter, 2 tables with chairs, a shelf) and 2–3 people inside (one seated).
- Hovering roof disc on each: radius r+.7, .2 thick, white, 0.45 gap above the roof on a collar (radius .5) with an emissive light ring; disc rim with a thin white lip.
- A raised white walkway (1.0 wide slab at y 1.1 on thin round columns every ~1.4, amber centre line) curving S-shaped through the lot from the −Z edge to the +Z edge between pavilions; 3 people on it, benches under it.
- Garden: hedged lawn beds, at least 10 trees, terraced planting bed (2–3 steps) in the back, a shallow blue water channel (reuse a water material if one exists in `cityRig.ts`, else a flat emissive-free light blue) crossing under the walkway; pale paved paths; 10+ residents outside, 4 seated on benches.
- Function modules low 1–6: the six pavilion interiors (furniture + inside people).

## 0 `mixed` — "low + mid" (poses L and H)

- One slender tower, footprint 4.6×4.6 centred near (0.5, 0.5), **6 storeys of 2.4** (top slab ≈ 14.6), roof garden (planter rim, shrubs, 4–5 trees) and an amber halo ring (radius 2.6, thin tube) hovering at ≈ 17.4. The top must stay below ≈ 18 so L frames it.
- Every floor glazed on all four faces (warm rooms per Taste), with white corner columns and a white slab edge per floor plus a thin amber band on alternate slabs; floors 2 and 4 carry a planted balcony edge. Furniture differs per floor (desks, shelves, sofas, plants); 2–3 people per floor visible from L (−X/−Z faces) and from H (+X face).
- A glazed lift shaft (1.4×1.4, white frame, faint glazing, cabin visible) on the tower's −X/+Z corner (screen-right at L).
- An escalator (white side walls, dark tread strip, faint glass balustrade) from the forecourt on the −Z side rising diagonally to the floor-2 slab, 3–4 people on it.
- Two low glazed wings at the foot: one on the +X/−Z side, one on the −X/+Z side (≈ 5×3.2, height 2.2), warm glazed rooms with people and furniture; each wing carries a hovering white roof disc (radius ≈ 2.2) on a glowing collar; a white bridge (amber line) at y ≈ 2.4 joins the two wing roofs in front of the tower (−Z/−X side).
- Forecourt: planters with shrubs, 3 benches, 10+ residents (4 seated), orange outline visible.
- Old cream stepped mid-rise and the timber court pavilions removed; the `court` (neutral props layer) now holds the wings, bridge and forecourt life; mixed function modules = wing interiors and per-floor fit-outs.

## +1 `high` — "one vertical street" (pose H)

- Keep the total height (crown top ≈ 41.6). Slender tower 5.2×5.2 with **4 round white corner columns** (cylinders r .35) and **14 glazed floors** of ≈ 2.6, each a warm room per Taste with a distinct fit-out (office desks, library shelves, café tables, plants/greenhouse, gym, kitchen) and 1–3 people, visible on the +X face; thin amber band on every floor slab edge (white slab, amber line under it).
- Planted sky terraces: on 4 floors a balcony slab (.8 deep) on the +X face and one corner with shrubs and 1–2 small trees.
- External glazed lift shaft on the −Z face (screen-right at H): white frame, faint glazing, the existing animated cabin (white with warm-lit inside, not an amber box).
- Round crown: white drum (radius 3, 2 high) with a glowing amber ring (`tower-meter-band`) round its rim, roof garden with 5+ trees on top.
- Base: glazed warm double-height lobby with a portal on +X, ring of trees and planters round the foot, 3 benches, 8+ residents, orange outline.
- High function modules 1–6: six floor fit-outs.

## Transition read

Unchanged mechanism (scale-in parts, 3 s). −1→0: pavilions shrink, tower + wings grow; 0→+1: wings/tower swap to the tall tower; keep the cabin animation at +1.

## Captures (Sonnet)

Vite on 5192. `~/city2127-evidence/closeup-night/se/capture.mjs` (copy of SW's, adapted) at 3200×1800, 12:00 and 22:00, HUD hidden:

- `flagship-low.png`, `flagship-mixed.png` at `shot=se:focal-low` with `meters=se:low` / `se:mixed`
- `tower-mixed.png`, `flagship-high.png` at `shot=se:focal` with `meters=se:mixed` / `se:high`
- night copies `*-night.png`; `vs-target.jpg` (capture | target per carrier-state).

Gates each round: `npm test && npm run build && git diff --check`; L and H frame the subject unblocked; no UI text added; greenery lush; nothing floats without an emitter.
