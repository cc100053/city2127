# P1 Megastructures — spec r1 (coordinator, 2026-11-02)

Target: `artifacts/city-taste-v2/target/master-day.png` (2752×1536; compare at 1600×900). Taste: `docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md` — review question: *would a guest believe this needs technology we do not have, and can they see the machine doing it?* Baseline: `artifacts/city-taste-v2/baseline/hero-h16.png`, `hero-h21.png`.

P1 builds the **three colossal megastructures** of the target. Nothing else: the civic core, floating sphere, self-assembling modules (P2), secondary building restyle (P3), ground (P4), greenery beyond the planted ledges on these structures (P5), traffic (P6) and night tuning beyond the seams (P7) are later parts. Leave them as they are.

## Placement (hero settled camera at 1600×900 → ground, metres)

Projected from the target's screen positions; tune by capture so the three read at the target's screen spots and sizes. Fixed anchors: civic core base (-18, 0, 23) projects to screen (0.52, 0.63), top y≈180 m to (0.52, 0.23). Meter sites (must not be built over; visibility from hero NOT required): nw (40, -300) 24×21 m, ne (-210, -135) 40×40 m, sw (-105, 60) 48×40 m, se (182, -38) 42×42 m — keep each footprint + 14 m margin clear of new ground contacts.

| Piece | Target screen | World (approx.) | Size |
|---|---|---|---|
| A. Ring-on-edge building | centre x≈0.15, spans y 0.15→0.76, left edge of frame | ring centre on ground ≈ (70, 0, -215); ring plane roughly faces the camera (normal ≈ toward (-358, 148, -437)), rotated ~20° so its depth shows as a thick band like the target | outer Ø ≈ 210 m, hoop depth (thickness along its axis) ≈ 45 m, hoop radial section ≈ 32 m; stands on a 60 × 50 m plinth so its base ~15 m sits below ground |
| B. Giant white arch | left foot screen (0.22, 0.80), apex (0.32, 0.40), right foot behind civic core's left at (0.43, 0.62) | feet ≈ (-9, 0, -237) and (58, 0, -5); span ≈ 240 m | apex ≈ 170 m; rib section tapers 14 m (feet) → 9 m (apex), slightly flattened (wider than deep); a walkway runs up its back is OPTIONAL (skip) |
| C. Stepped terraced mega-hull | right side x 0.66 → 1.0, ground line y≈0.62–0.70, rising to y≈0.30 at its back | long axis ≈ from (-90, 0, 130) to (-330, 0, 140), stepping back (away from camera, +x/+z side) | ~240 m long, ~90 m deep, 6–7 terraces each 9–10 m tall, top ≈ 65 m; the camera-facing (west/south) side is the stepped one |

Coordinates may shift ±40 m if a capture shows a better match or a collision with an existing landmark/site; record the final values in the report. Do not move the civic core, Sky Ring or space elevator.

## Form and machine signature (every piece)

The read must be "engineered by a civilisation ahead of us", not "big white blob".

- **Material set** (new, shared by all three; name them in one module): `megaShell` white metal `#eef1f2`, roughness .32, metalness .45; `megaRib` pale grey structure `#c9d0d4`, roughness .4, metalness .55; `megaSeam` emissive cool white-blue `#cfe8ff`, emissiveIntensity ≈ .6 day, ≈ 2.2 night (drive from the existing night factor in `updateOdaiba` or the day-cycle hook the city already uses — find it, don't invent a second clock); `megaGlass` blue-grey glass reusing the look of the existing curtain-wall panes (roughness .14, metalness .4, colour ~`#6b7780`).
- **A. Ring building:** the hoop is an inhabited building — outer face clad in `megaShell` panels with **vertical structural ribs every ~6° (`megaRib`, 1.5 m proud)** and **two continuous `megaSeam` light bands** along the outer face edges; the inner face is stepped **terraces with glass storeys** (bands of `megaGlass` between `megaShell` slabs every 4.2 m) and **planted ledges** (reuse an existing canopy/planter instancer from `coastalCanopy.ts` — do not write a new tree system) on the lower inner arc. A **service rail** (thin box track + 2–3 small pods, static is fine) follows the inner rim. The base enters a plinth with a seam ring where it meets the ground.
- **B. Arch:** smooth white `megaShell` rib (swept along a parabola/catenary, ~32 segments), **one `megaSeam` line along each edge of its inner face**, **segment joints every ~20 m** (thin dark-grey 0.6 m recessed bands) to show assembly, and a **foot collar** (wider ring + emitter seam) at each foot. No cables.
- **C. Terraced hull:** each terrace is a long glass storey band (`megaGlass` with `megaShell` slab edges), **a `megaSeam` line at every terrace lip**, planted terrace edges (reuse existing canopy/planter instancing, lush per owner — never sparse), and **vertical rib fins every ~12 m** on the end faces. The flank toward the camera curves slightly (hull-like), not a box.
- **People scale:** ant-sized people at the plinths/terraces read the size — reuse `occupants.ts` publishing (e.g. `publishOccupants`/`publishRoofWalks` patterns) if cheap; skip if it costs >0.5 ms/frame.
- **Low poly, crisp:** large clean forms + precise bands. No window-grid textures, no rooftop-tree filler, no floating islands/rocks/waterfalls. Glow only on seams.

## What they replace

Megastructures replace ordinary towers where they stand. Find what currently fills each footprint at hero (baseline left tall tower ~screen (0.2, 0.4), right tower ~(0.85, 0.42), mid-rises in the hull footprint): CTX_ context massing in the district GLB (hide those meshes / exclude their facade panels and roof gardens), or a retained landmark GLB (if a retained landmark — e.g. a hotel or DiverCity tower — sits inside a footprint, drop it from the load list and say so). Keep doorways/entrances/mobility consistent: if a hidden building had published doorways or roof walks, make sure nothing now walks into a megastructure (run the tests; fix callers, not tests, unless it's a hero-visibility assertion).

## Code

- New module `src/megastructures.ts` exporting `megastructures(): T.Group` (+ a night update if needed); add it from `loadOdaiba` in `src/odaibaScene.ts` next to `civicCore()`.
- Read first: `src/odaibaScene.ts`, `src/contextFacades.ts`, `src/civicCore.ts` (how the civic chassis builds procedural geometry, materials, occupants), `src/cityRig.ts` (`bake` — merge per material to keep draw calls low), `src/coastalCanopy.ts` (planter/tree instancing to reuse), `src/layout.ts`, `src/heroCamera.ts`, `src/dayCycle.ts` (night factor), `tests/odaiba.test.ts`.
- **Draw calls:** merge each piece per material (`bake`) — target ≤ 12 new draw calls total. Shadows: cast on, receive on.
- **Tests:** add a small check in `tests/` that the three pieces exist, stand clear of the four Meter site footprints (+14 m) and of the civic core, and their heights are within the table ±25%. Hero-sightline assertions that now fail because a megastructure hides a site (`heroSightline`, `skyRing`, `spaceElevator`, `heroHolograms`, `energyPrototype`, `housingCityCheck` in `tests/odaiba.test.ts`) — **delete the assertion**, list each deletion in the report. Other failures: fix the code.

## Capture + report (protocol)

Branch `feat/city-taste-v2-p1` from `feat/city-taste-v2` tip. Captures into `artifacts/city-taste-v2/P1/r1/`:
1. `hero-h16.png`, `hero-h21.png` — `?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16` (and `21`), 1600×900, HUD hidden (same recipe as `baseline/`; see `docs/handoffs/city-taste-v2.md` Step 0 and `.agents/skills/closeup-polish/SKILL.md` capture lessons: `playwright-cli -s=<name>`, sleep ~10 s, retry on timeout).
2. `vs-target.jpg` — three panels side by side at equal height: baseline h16 | r1 h16 | target (scaled to 1600×900).
3. `close-ring.png`, `close-hull.png` — one 1600×900 orbit close-up of the ring building and the hull from ~250 m (any dev camera route that exists; say how you got it), to judge detail.
4. FPS: hero day and night, vsync 1920×1080, canvas `data-fps`, discard the first sample, report median of ≥5 samples each.

Run `npm test && npm run build && git diff --check`. Commit, push `feat/city-taste-v2-p1`, stop every server/browser you started. Report: final world coordinates and sizes, what was hidden/dropped, deleted assertions, draw-call delta, FPS day/night, any deviation from this spec and why.
