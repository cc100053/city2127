# P1 Megastructures — spec r3, final round (coordinator review of r2 5aa5d34, 2026-11-02)

r2 is a big step: ring and arch are white and read as megastructures; the hull now reads as a stepped white hull. Keep everything; fix only these.

1. **Nothing may pierce a megastructure.** `close-hull.png` shows a blue district Meter tower (`districtMeters.ts`) standing inside the hull's left part. Find every building/instance (district Meter towers, roof gardens, context facade panels, retrofit towers from `odaiba2127.ts`, skyway pylons) whose footprint intersects any of the three megastructure footprints (ring plinth, arch feet collars, hull) and remove it from that build (filter at construction, don't just hide a mesh), keeping the Meter logic working for the remaining towers. Export the three footprints from `megastructures.ts` as one shared list so the filters use the same data. Add an assert to `tests/megastructures.test.ts` that no district tower centre lies inside a footprint. List what was removed.
2. **Hull whiter at hero:** slab 3 m → 5 m and the terrace deck edge facing the camera white (not hedge-green) for the first 1.5 m, so each step reads as a white line. Keep trees every ~13 m, but drop the hedge band to half height.
3. Night: check the hull/ring warm rooms aren't a uniform wash (keep ~30% hash).

Captures to `P1/r3/`: `hero-h16.png`, `hero-h21.png`, `vs-target.jpg` (**r2 h16 | r3 h16 | target**), `close-hull.png` (same pose as r2). FPS day/night. Checks, commit, push `feat/city-taste-v2-p1`, stop servers, report (commit hash first).
