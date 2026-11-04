# SE close-up redo — Gemini target prompts (closeup-night, 2026-11-04)

Taste: [CITY MASTER TASTE](/Users/fatboy/city2127-closeup-night/docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) ("visible high technology"). Finish level: NW bay R2 (`~/city2127-evidence/nw-closeup-polish/bay-r2/review-bay-r2.jpg`). Option text: RESIDENT_COPY Q4 `functions-2127`. Meter colour `urbanConcentration` #ffb347 (amber).

Baselines (`baseline/`, 3200×1800, HUD hidden, 12:00; `?meters=se:<band>&hour=12` then the pose):

- **L pose** (−1 and 0; live `se:focal-low` candidate) `cityPose([130,28,-95],[182,24,-38])` → `flagship-low-day.png`, `flagship-mixed-day.png`
- **H pose** (0 and +1; live `se:focal` candidate) `cityPose([360,45,-50],[182,58,-38])` → `flagship-high-day.png`, `tower-mixed-day.png`

Each Gemini run = that state's baseline image + **Shared block** + the state block, one prompt. If the NW flagship/bay targets help, upload `artifacts/nw-closeup-polish/target/bay-low.jpg` as a second image with: "The second image shows the finish level and design language of this city's civic buildings (white metal, warm glazed rooms, people, planting); match that finish, not its shapes."

## Shared block

Edit this screenshot of a real-time 3D city (Odaiba, Tokyo, year 2127). Keep exactly the same camera, framing, lens, daylight, sky, sea, and every neighbouring building, megastructure, ring, tower and tree. Change ONLY the building(s) standing on the lot with the thin orange outline in the centre of the frame (keep the outline). Remove everything currently on that lot: the orange barrel-roof pavilions, the beige stepped block and the orange-gridded tower must all be gone. Style: in-engine low-poly real-time render — large clean forms, flat-shaded white metal, clear pale glass, thin precise light seams; not photoreal, no texture noise, no realistic window grids. The city's taste is "visibly very advanced technology": every impossible part shows its machine signature (stabiliser rings and under-emitters on anything floating, precise seams and service rails on structure). Structure is pure white metal, not beige, not timber, no orange roofs. Rooms that face the camera are glazed and warm-lit inside (warm white, peach near the floor) with residents clearly visible inside — shops, cafés, a clinic, a library. Lush planting: trees and planted terraces, benches. Technology light is cool white-blue and low saturation. The ONLY saturated accent colour is amber #ffb347, used sparingly on this site's own seams, rings and edge lines so it reads as this site's Meter colour. Residents are small but visible everywhere, going about daily errands. No text, no logos, no signage letters.

## −1 `distributed-pavilions` 「少し歩いても、水辺に点在する低い建物をめぐりたい」 (L pose, `flagship-low-day.png`)

The lot becomes a cluster of four or five separate low pavilions, each one to two storeys (6–10 m) and 10–15 m across, spread across the lot with planted gaps and small water channels between them. Each is a white metal pavilion with a thin hovering roof disc on glowing stabiliser emitters and a fully glazed, warm-lit camera-facing side showing a café, a grocer, a clinic counter, a reading room, with residents inside. A continuous covered walkway with a thin white canopy and an amber #ffb347 centre line loops between all the pavilions, with many residents walking it, carrying bags, sitting on benches under trees. Silhouette: wide, low, porous and horizontal, with sky visible above and between the pavilions; nothing on the lot is taller than about 12 m. Reads at a glance: you walk around between many small buildings.

## 0 `mixed-functions` 「低い建物と高い建物が混ざる街で暮らしたい」 (L pose, `flagship-mixed-day.png`)

Two or three of the low glazed white pavilions (same language as −1: hovering roof discs, warm-lit glazed fronts with residents, covered walkway with amber line) remain on the front half of the lot. At the back, one medium tower about 50 m tall rises: a slender white metal frame with four or five stacked glazed, warm-lit floors of different heights (a market hall, a clinic floor, a planted terrace floor), a planted roof garden ringed by a thin amber #ffb347 light ring, and one glass lift running up its camera-facing side. A diagonal glazed ramp with people on it climbs from the walkway into the tower's second floor. Reads at a glance: low buildings and one taller building mixed together, both full of people.

## 0 at the H pose (`tower-mixed-day.png`)

Same design as the 0 block above, seen from this camera: the 50 m tower in the centre, the low pavilions at its foot. Keep the foreground white frame tower and neighbours unchanged.

## +1 `vertical-functions` 「上へ移動して、一つのタワーで用事を済ませたい」 (H pose, `flagship-high-day.png`)

One slender white metal tower about 125 m tall on a small planted public podium with residents. It is a "vertical street": a precise white structural frame holding a sequence of different glazed, warm-lit floors stacked up its height, each a different daily function you can see into — shops, a café terrace, a clinic, a library, a gym, a planted sky garden every few floors — with residents visible inside. Two glass lift shafts with capsules on the camera-facing side, one capsule mid-climb, with thin amber #ffb347 guide seams; thin amber rings mark every function floor. At the top, a planted sky garden disc with a glowing amber ring, edged by stabiliser emitters. It must be the clearest, most memorable vertical silhouette in the frame, sky visible around its upper half, white not beige, and not the blue-and-cream window pattern of the neighbouring towers. Reads at a glance: everything is in one tower and you move up it.

## Picking criteria

- Same camera and neighbours (else it cannot be cropped against the city).
- Two seconds: −1 wide/low/many, 0 low + one mid tower, +1 one tall vertical street.
- White metal + warm glazed rooms + people + planting at NW bay R2 finish; amber only on this site.
- Buildable in low-poly code: big clean forms, repetition, no organic surfaces.
