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

## R2 (R1 16/38; aim at the 0s and 1s)

Keep: `fh-floors` (2) — re-crop and compare with R1. Everything else below is a fix. Interior look for **all** glazed rooms: pale warm-white back walls (≈ `#fbeee0`, low emissive), a bright white ceiling light strip per room, white/pale furniture with only small accents (no big brown/timber blocks), people standing near the glass at the figure size, slab edges white (never green).

- **−1** (`fl-*`): 5 pavilions, not 6 — two big (r 2.4, wall 1.4) nearest the camera at screen-left and screen-right with ≥ 1.5 units of open ground between them; three small (r 1.5) behind. Continuous floor-to-ceiling glazing band all round with thin mullions; inside a counter, round tables, shelves, a sofa, 2–3 people each. Thin amber seam directly under every roof slab edge. Disc: .14 thick, radius r+.5, gap .35 on a collar whose light ring is bright emissive; no inset ring on top. Walkway: one long raised S-curve (y 1.0, thin round columns) running from the front lot edge to the back between the pavilions, 4 people on it, 2 benches under it with seated people. Garden: hedged grass beds on all non-paved ground, ≥ 12 trees, 3-step terraced bed at the back, a blue water channel visible in the front gap, ≥ 10 residents on paths, 4 benches with seated people. No pink umbrellas are ours (neighbour) — leave them.
- **0** (`fm-*`, `tm-*`): interiors per above; floors distinct (lounge, library shelves, café tables, plant room, studio, office). Planted balcony edge only on floors 2 and 4 (white planter with shrubs). Lift shaft: faint glazing + white frame, warm-lit cabin with a window, on the screen-right side at L. Halo ring just above the roof garden (gap ≈ .6), brighter emissive; roof garden 5 trees + shrubs. Wings: glazed all round (no open sides); the bridge joins the two wing roofs in front of the tower, never through its base. Forecourt ≥ 12 residents (5 seated on benches), planters.
- **+1** (`fh-*`): lower to crown top ≈ 38.5 (floors 2.4) so H shows the whole crown. Corner columns r .2. Crown: round white cap overhanging the shaft (radius ≈ 3.4) with a glowing amber edge ring, roof-garden trees visible above its parapet. Lift: glazed shaft with white frame and a visible white cabin (warm window, amber trim) on the screen-right (−Z) face. Sky terraces with 2–3 trees each on 5 floors on the +X face and the +X/−Z corner. Base: ≥ 10 trees and hedged beds round the foot, warm double-height lobby.

## R3 (R1 kept 16/38; R2 20/38 not kept — pairwise lost 5–9, mostly on warmth)

Start from R1 (source restored). Port from R2 (diff `~/city2127-evidence/closeup-night/se/r2/r2-not-kept.diff`) only its structural wins: −1 5-pavilion layout with the open front gap, the long S walkway (scored 2), the water channel, terraced beds; 0 balconies only on floors 2/4, white slab edges, lift cabin with windows, forecourt benches; +1 height (crown top ≈ 38.3 so H shows the crown), cap radius 3.4, CABIN_HIGH and its test number, terraces on 5 floors. Do **not** port R2's interior colour.

Warmth (the item every judge named): rooms must glow **warm peach**, not yellow (R1) and not white (R2). Back walls and ceilings emissive peach `#f7cfb0` (emissive ≈ .55) with a lighter ceiling strip `#fff0e0`; floors pale `#f3e6da`; furniture white/pale with a few soft accents. Night must glow. Keep it one shared material set.

- **−1**: drum walls read as **glass**, not colonnades: add a faint glazing cylinder (white, transparent ≈ .2, faint warm emissive) inside the mullions. All 5 pavilions visible at L. Disc gap .5 with a bright collar ring clearly visible in the gap. Hedges along paths, 4 benches with clearly seated people in the front half, ≥ 10 residents.
- **People**: figure height .75 (seated proportionally), shirts light; 3–4 people per room standing near the glass on the camera side.
- **0**: halo lower (gap ≈ .3 above the trees), tube thicker (≈ .12), brighter; wing discs with a visible gap and glowing collar; 3 benches with seated people on the forecourt, ≥ 12 residents.
- **+1**: corner columns real cylinders (r .25, 12 segments); each floor 2–3 people and 2–3 furniture pieces near the +X glass; terraces carry 2 small **trees** (crown ≥ .5) each, not shrubs; lift shaft with thin amber guide rails and faint glazing, cabin parked at mid height when reduced motion is off is fine — make the cabin larger (1.6 × 2.2) and warm-lit so it reads; crown roof garden 7 trees visible above the parapet.

## R4 (R3 kept 18/38)

Keep: `fh-floors` (2), the warm peach rooms, R3's +1 height. Re-crop and compare with R3.

**−1 is the priority (6 items, all ≤ 1).** At L the lot's front third is below the frame and the camera looks down on the roofs, so the discs hide the glazing and the pavilions crowd the bottom edge (see `r3/flagship-low.png`).
- Move the 5 pavilions into the **back two thirds** of the lot (x, z ≥ −3.5 for centres; screen-up = +X/+Z), so they sit mid-frame, not on the bottom edge; front third becomes garden (hedged lawn beds, water channel, benches, walkway start).
- Pavilion walls **2.0 high**; discs radius r+.35 (barely wider than the roof) at gap .7, so the warm glazed wall reads below the disc from L; collar light ring clearly lit inside the gap (emissive ≈ 2, two rings).
- Drum walls: wider glazing panes (mullions every ~.8, not slats), so rooms read through; inside a counter, a round table with chairs, a shelf, 3 people standing at the glass.
- Garden (currently 0): every non-building patch inside the outline is lawn with hedge borders (`leaf` boxes .3 high), ≥ 14 trees spread across the lot (not only edges), a 3-step terraced planting bed beside the walkway in the visible middle, 4 white benches with seated people in the front third, ≥ 10 residents walking on the paths, the water channel along the walkway.
- Walkway: keep R2/R3 S-curve but lengthen it from the front edge to the back edge, columns 1.1 tall so it reads raised.
- **0**: forecourt — 3 white benches placed in the camera-facing front, each with 2 seated people; halo emissive brighter and thicker (tube .15) so it reads glowing at day.
- **+1**: corner columns r .3 with 16 segments, white, so they read round; lift shaft: light-blue faint glazing panels (opacity ≈ .3) on the −Z face with white frame and thin amber rails; park the cabin animation's capture-time position irrelevant — add a second static cabin at mid height (y ≈ 18) so one cabin is always visible; sky terraces: trees crown .7 (2 per terrace) protruding past the +X face.

## R5 (R4 kept 21/38)

Keep (2): `fl-people-in`, `fm-wings`, `fh-frame` — re-crop and compare with R4. H looks from +X (only slightly −Z), so the −Z face is edge-on there: anything meant for H goes on the **+X face**.

- **fh-lift (0)**: move the +1 lift shaft to the **+X face at its −Z edge**, protruding +1.2 from the face, full height: white frame (4 posts, ring beams every floor), light-blue glazing panels opacity ≈ .45, thin amber rails, and the static warm-lit cabin (1.6 × 2.2, white, peach window, amber trim) at y ≈ 18 plus the animated one. Same idea for **fm-lift**: a bolder glazed shaft on the 0 tower where both L (−X face, right end) and H can see it.
- **fh-gardens / fh-crown**: terrace trees with visible trunks and crown scale ≥ 1.0 on balconies projecting 1.2 off the +X face; crown roof garden 7 trees of crown ≥ .9 standing clearly above the parapet.
- **fm-crown**: halo thinner (tube .09), .5 above the trees, bright emissive (it lost pairwise for being thick).
- **fm-ground / fl-garden**: benches must be seen: put 3 benches on the camera-side (−X/−Z) edge of the forecourt/front garden, white seat .5 high, each with 2 clearly seated people facing the camera; ≥ 10 standing residents spread over the paths.
- **fl-discs**: collar light ring larger (radius ≈ .6 r) and brighter, gap .8, so a glowing band reads under every disc.
- **fl-walkway**: lengthen the S-curve so it spans front edge to back edge with two bends, 5 people on it, columns every 1.2.
- **fh-base**: 2 benches with seated people and ≥ 6 trees of crown ≥ .9 round the +X foot.

## R6 (R5 kept; last round)

At L the front third of the lot is below the frame for **both** −1 and 0, so life placed there is never seen (`r5/flagship-mixed.png`, `r5/flagship-low.png`).

- **0 at L**: shift the whole 0 composition (tower, lift, escalator, wings, bridge) by (+1.6, +1.6) toward +X/+Z (stay inside the lot; keep the escalator on the camera side) so a paved forecourt in the **visible** band in front of the wings appears: 2 planter beds with shrubs, 3 white benches with 2 seated people each, ≥ 8 standing residents. Wings: solid white end walls and roof fascia with a thin amber line, closed warm glazing on camera faces, 3–4 people each with a counter/shelf (not desk rows).
- **−1**: put benches with seated people and ≥ 8 residents along the walkway and between pavilions in the **visible middle band**, not the front third. No blue-tinted surfaces on our planters.
- **+1 at H**: crown rim ring thicker (tube ≈ .25) and bright so it reads as a glowing halo; lobby closed warm peach glazing on +X with 2 benches and 6 residents in front.
Keep everything else as R5.

## R7 (owner 2026-11-05: option b + R7; R6 parked 20/38)

New L pose `se:focal-low` = `[118,38,-107]→[182,18,-38]`: the **whole lot is now in frame** (see `~/city2127-evidence/closeup-night/se/r6L/flagship-low.png`, `flagship-mixed.png` — R6 code at the new pose, the pairwise baseline for R7). The front third is no longer cut, so use it.

Keep: `fh-frame` (2), warm peach rooms, H as is.

- **−1 grow to fill the lot**: spread the pavilions over the whole 14×14 (front third included): 5 drums, the two nearest the camera (−X/−Z half) big (r 2.6), three r 1.8 behind, ≥ 1.2 units between drums for garden/walkway; S-walkway from the −Z edge to the +Z edge between them; water channel along it; terraced bed and benches with seated people in the gaps; ≥ 12 residents outside. Discs: thin white lip with a thin amber edge line, a thick bright warm-white collar band (emissive ≈ 2) in the gap.
- **People** (`fl-people-in`, `fm-ground`, `tm-base`, `fh-floors` — every judge says "blocky"): rebuild the site figure: sphere head, tapered torso (cylinder/capsule), separate arms and legs (thin cylinders), seated variant with bent knees; height .75; fewer but bigger figures per room (2–3), placed at the glass facing the camera.
- **0**: move the composition back to centre now that the front is visible (undo R6's +1.6 shift if it helps framing); forecourt with 3 benches and seated people stays in front, in frame; halo a thin (tube .07) bright ring .4 above the roof trees; roof garden taller trees (crown ≥ .8).
- **+1**: terrace trees with trunks (crown ≥ 1.0) on 5 balconies; lift shaft protruding 2 units off the +X face with a white frame; furniture varies floor to floor (shelves, dining table, plants, sofa, desks in rotation, never the same two floors in a row).
