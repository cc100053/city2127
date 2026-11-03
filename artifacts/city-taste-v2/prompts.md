# City taste v2 — master target prompts (Step 0)

Baseline: `baseline/hero-h16.png` (day, 16:00) and `baseline/hero-h21.png` (night), hero camera, 1600×900, HUD hidden.
Taste: `docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md` (2026-11-02).

Round 1 = four DAY candidates from `hero-h16.png`, each a different intensity. The owner picks one (or mixes); the NIGHT version is generated afterwards from the picked day image plus `hero-h21.png`.

## Shared block (prefix of every prompt)

Edit this screenshot of a real-time 3D city (Odaiba waterfront, Tokyo Bay, year 2127). Keep EXACTLY the same camera position, lens, horizon line, time of day (clear late afternoon, warm sun from the left) and the overall layout: the bay in the foreground, the large framed Fuji-TV-like civic building in the centre, the giant ring truss across the sky, the tall space-elevator station behind. Output must look like an in-engine real-time 3D render screenshot — clean low-poly geometry, smooth shading, crisp edges, physically based materials, bloom on light sources — NOT a photograph, NOT a painting, NOT concept art. No text, no logos, no UI.

Goal: the viewer's first-second reaction must be "this city runs on technology we have not invented yet". Every impossible thing shows the machine doing it: floating masses have glowing stabiliser rings and emitters underneath with a faint field edge; megastructures have precise panel seams, structural ribs and service rails; held water or light membranes have a visible field frame. Technology light is cool white-blue, low saturation. Materials: glossy white metal, pale ceramic, clear glass, lush living green, blue water. Daily life continues normally: tiny people walking on decks and plazas, trees, small autonomous craft. Replace the ordinary box towers with window grids and rooftop trees; keep greenery lush (terraces, hovering garden beds), never sparse.

## Candidate A — "upgrade" (closest to the current layout)

Keep every building where it is but transform each into high-tech form: box towers become white metal megaframes with glowing seams and suspended glass volumes; the ring truss becomes a sleek glowing maglev orbital ring; add two floating garden platforms with emitter rings hovering above the bay. Same density as now.

## Candidate B — "megastructure skeleton"

Replace the scattered mid-rise towers with three or four colossal megastructures that each are a whole district: a giant white arch spanning the bay, a vast hollow ring-shaped building standing on edge, a stepped terraced mega-hull. People are ant-sized against them. The civic centre building stays recognisable as the frame-and-sphere landmark but at much larger scale. Open sky and water between them.

## Candidate C — "floating focus"

Keep the ground city lower and calmer, and put the drama in the air: three to four large anti-gravity structures hover above the city at different heights — a floating civic chamber sphere held in a field ring, a hovering forest island with waterfalls dissolving into mist, a building assembling itself with modules joining in mid-air guided by light beams. Each has visible emitters and stabiliser rings.

## Candidate D — "maximal 2127"

Combine B and C at full intensity: megastructure skeleton plus floating pieces, a wall of suspended water held by a translucent force-field frame at the bay edge, a vertical energy beam rising from the centre, drone swarms flying in formation, translucent hologram layers on buildings. Still clean and readable, not cluttered.

## Night block (after the owner picks)

Same image at night (21:00) from `hero-h21.png`: deep navy sky; technology light (cool white-blue) reveals the systems that exist by day — seams, field edges, emitters, beams, maglev ring; warm occupied windows; Meter colours absent. Same geometry as the picked day image.

## Round 2 — owner direction (2026-11-02)

Owner: use B, but the centre must stay LAND (no bay in the middle); the other buildings take A's style (white megaframes with glowing seams and hologram designs on the facades); C's building designs are good (floating civic sphere in a field ring, self-assembling building with modules joined by light beams) but NO floating sky islands.

Upload order: `gen/day-B.png` (base), `gen/day-A.png`, `gen/day-C.png`. Prompt = Shared block + blank line + this:

Use the FIRST image as the base composition: keep its three colossal megastructures exactly — the hollow ring-shaped building standing on edge at the left, the giant white arch, the stepped terraced mega-hull at the right — and the large frame-and-sphere civic building in the centre, the ring truss across the sky and the space-elevator station behind. Change one thing in the layout: the middle ground must be LAND, not a bay — a continuous city ground of plazas, decks, terraces and lush greenery between the megastructures, like the baseline city; keep only the foreground bay strip at the bottom edge. Restyle every other, smaller building in the style of the SECOND image: white metal megaframes with glowing cool white-blue seams, suspended glass volumes and thin translucent hologram panels on their facades. Add two pieces from the THIRD image: the floating civic sphere held inside a glowing field ring with emitters, and the building that assembles itself with modules joining in mid-air guided by light beams. Do NOT add any floating islands, rocks, waterfalls or sky gardens.

## Night master (owner locked `target/master-day.png` = gen/master-day-2.png, 2026-11-02)

Upload order: `target/master-day.png` (geometry), `baseline/hero-h21.png` (night mood/camera). Prompt = Shared block (ignore its "late afternoon" line) + blank line + this:

Turn the FIRST image into the same scene at night (21:00) — identical camera and identical geometry: the ring-on-edge building, the giant arch, the terraced hull with the self-assembling modules, the frame-and-sphere civic building, the floating sphere in its field ring, the ring truss and the space-elevator. Use the SECOND image only for night mood: deep navy sky, dark bay with reflections. Technology light (cool white-blue, low saturation) reveals the systems that exist by day: glowing seams on the megastructures, the field ring and emitters of the floating sphere, the light beams of the assembling modules, light bands along the ring truss and maglev routes. Warm amber occupied windows. Small hologram panels glow softly on facades. No new objects, no neon colours, no fog.
