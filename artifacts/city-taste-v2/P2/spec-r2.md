# P2 — spec r2 (coordinator review of r1 7ef6e2b, 2026-11-03)

Evidence `P2/r1/hero-h16|h21.png`. Placement of all three pieces is right; each needs to read at hero like the target. Keep positions unless noted.

## 1. Civic chrome sphere — bright silver, unobstructed

r1 reads as a dark blue mirror ball half hidden behind the inner diagonal escalator; at night it is black. Target: bright polished silver with a light sky reflection, clearly centred in the frame.

- Env gradient for that material: light warm-grey horizon → pale sky top (no saturated blue); roughness .14; colour `#f2f4f5`. Exempt it from the night `mirrors` dimming; instead at night give it the city's reflected light: faint emissive `#2a3440` plus its 13 seams glowing `megaSeam` (night 2.2) so it reads as a lit sphere, not a hole.
- The inner diagonal escalator/stair that crosses in front of the sphere from hero: remove the part between the sphere and the camera (or reroute it behind the sphere). Check `occupants`/tests that reference it; keep walkers off removed geometry.
- The dark blue window panels still visible on the frame's right tower: switch to `megaGlass` tone (r1 missed some).

## 2. Floater — machine, not balloon

r1 reads as a white balloon with thin hoops. Target: a metallic panelled sphere with strong glowing rings and visible emitters.

- Sphere finish: silver-grey metal `#c9ced2`, metalness .7, roughness .3, with panel seam grid (8 meridians × 4 latitudes as raised `megaRib` lines) and one dark window band around the upper third.
- Rings: tube 1.2 → 2.6 m, emissive cool white `#dff1ff` at intensity ≥ 1.2 by DAY (bloom must catch them like the target) and 3 at night; keep the dash pattern. Add a second thin parallel ring 3 m outside the equator ring (the target's double band).
- Under-emitters: 4 pods each with a bright emissive disc on its underside (day 1.5) and the cone below at opacity .25.
- Field shell: keep, fresnel rim a bit stronger (rim opacity .35).
- Size: sphere Ø 55 → 62; rings scale accordingly; recheck Sky Ring clearance (move up to +20 m or 40 m right if needed).

## 3. Self-assembling building — visible machine

r1 is a few faint glass cubes lost against the hull. Target: blue-glass modules with white frames hovering apart, bright beams to their sockets.

- Core: 5–6 storeys (≈ 36 m) so the action happens higher, against the hull's upper terraces/sky.
- Modules: 5–6 boxes 16–20 m, white `megaShell` frame edges + **clear blue glass** faces (`#7fb6e0`, opacity .55, transmissive look via emissive `#1f4a6e` .3) so they read blue against the white hull; hover 20–70 m above the core top.
- Beams: additive, `#cfe8ff`, opacity .45 day / .8 night, width 2.5 m at the module end tapering to 1 m at the socket, plus a short bright socket ring.
- Gantry arm: taller (reach the highest module), white with a `megaSeam` joint ring.

## Captures etc.

Same as r1 into `P2/r2/` (`vs-target.jpg` = r1 h16 | r2 h16 | target), refresh all three close-ups AFTER the final change. FPS, checks, commit, push `feat/city-taste-v2-p2`, stop servers, report (commit + FPS first).
