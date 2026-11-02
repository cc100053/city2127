# P1 Megastructures — spec r2 (coordinator review of r1 e41bbdf, 2026-11-02)

Evidence: `P1/r1/vs-target.jpg`, `hero-h16|h21.png`, `close-hull.png`. Ring and arch are in the right screen spots and their seams work at night — keep positions. Three problems, in priority order.

## 1. Hull does not read as a megastructure (main fix)

r1 reads as shelves of trees on dark glass, small, behind the dome towers (close-hull: tree rows on thin lips). Target: a massive **white** stepped hull filling screen x 0.66→1.0, its front base at y≈0.70, rising **toward the right edge** to y≈0.32. Mass first, trees second.

- **Move it toward the camera**: front base line ≈ from (-160, 0, 20) to (-330, 0, 95) (projected: (0.68, 0.70) → (0.99, 0.74)). Keep ≥14 m clear of the sw site footprint (x -129…-81, z 40…80) and the civic core. Re-carve context there; if a retained landmark or a retrofit frame/dome tower stands inside the new footprint or directly in front of the hull's camera face within 60 m, drop/hide it and list it.
- **Asymmetric profile**: low end (left, near x -160) ≈ 45 m, stepping up to ≈ 120 m at the right/back end (x ≈ -320), 7–8 terraces. Each terrace recedes 8–10 m.
- **Terrace anatomy (front face of each step, bottom→top):** 1.2 m `megaSeam` lip line → 3 m thick solid white slab (`megaShell`) → 2 glass storeys (light blue-grey glass, see materials) with thin white mullions every 6 m → planter strip on the terrace deck behind the lip (lush but LOW: shrubs/hedges, a tree every ~12–15 m, not a continuous tree row on every lip).
- **Hull read:** the camera-facing flank bows outward (r1 had this — keep) and the two ends get large white **end bulkheads** with vertical rib fins every 8 m and one vertical `megaSeam` per end. One horizontal **service rail** along the 3rd terrace lip with 2 small pods (static).

## 2. Materials read as grey/blue metal, target is white

- `megaShell`: `#f3f2ec`, roughness .5, metalness .08 (the .45 metal mirrored the blue sky → grey-blue, and the arch reads as a chrome tube).
- `megaRib`: `#dde1e2`, roughness .5, metalness .2.
- `megaGlass`: `#8fa3ae`, roughness .15, metalness .3 (r1 glass was near black at hero; target glass is pale).
- Night: keep seams at 2.2; let shell darken naturally but add the existing warm room glow (reuse `nightRooms`-style hash or the curtain-wall glow already in `odaibaScene.ts`) on ~30% of the glass storeys so the ring and hull read as inhabited at night.

## 3. Ring and arch polish

- **Ring outer face:** remove the dark/light checker. Outer face = continuous white shell, ribs every 6° as fine raised lines (keep), plus **3–4 thin horizontal glass storey bands** running round the hoop (target shows storey lines across the face). Inner face keeps glass storeys; make the **planted ledges on the lower inner arc visible from hero** (bigger planters, at least 3 ledges between 7 and 5 o'clock as seen from hero).
- **Arch:** cross-section flatter and squarer — width ≈ 1.6× depth, rounded corners, matte white (new shell finish). Keep joints and edge seams. Apex height: target apex y≈0.40; keep 135 m unless your capture shows it off.

## Unchanged from r1

Placement of ring (95, -195) and arch feet; draw-call budget ≤ 12 new; tests (update hull numbers in `tests/megastructures.test.ts`); no hero-visibility asserts needed.

## Captures (`artifacts/city-taste-v2/P1/r2/`)

`hero-h16.png`, `hero-h21.png`, `vs-target.jpg` (**r1 h16 | r2 h16 | target**), `close-ring.png`, `close-hull.png` (re-aim the hull close-up at the new position, ~250 m out, so the hull fills the frame), FPS day/night as before. Run `npm test && npm run build && git diff --check`, commit, push `feat/city-taste-v2-p1`, stop servers, report as before.
