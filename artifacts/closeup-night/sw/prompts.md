# SW close-up polish — Gemini target prompts

Taste: CITY MASTER TASTE ("visibly very advanced technology", owner 2026-11-02). Option text: RESIDENT_COPY Q2 `commons-2127` / publicSharing. Finish bar: NW bay R2 (`~/city2127-evidence/nw-closeup-polish/bay-r2/review-bay-r2.jpg`).

Baselines (`baseline/`, 3200×1800, HUD hidden): COMMONS PLAZA (`changeSites.sw`, centre (−105, 60), scale 4, lot 48×40 m), pose `sw:n` = `cityPose([-95,30,-15],[-105,10,60])`, looking south (sky, inlet water behind) → `flagship-low|mixed|high-day.png` (+ `-night`).

Each Gemini run = the baseline image of that state (day) + **Shared block** + the matching **state block**, as one prompt.

## Shared block

Edit this screenshot of a real-time 3D city (Odaiba, Tokyo, year 2127). Keep exactly the same camera, framing, lens, daylight, sky, water, and every neighbouring building, tower, mast and tree outside the lot. Change ONLY the round seaside pavilion in the centre of the frame, standing on the grass lot with the thin orange outline; keep the orange outline and the lawn. Style: in-engine low-poly real-time render — large clean forms, flat-shaded white metal, clear pale glass, thin precise light seams; not photoreal, no texture noise, no realistic window grids. The city's taste is "visibly very advanced technology": every impossible part shows its machine signature (stabiliser rings and under-emitters on anything floating, a thin glowing frame on any light membrane, precise seams on structure). Technology light is cool white-blue and low saturation. The ONLY saturated accent colour is sharing pink #ff6f91, used sparingly on the site's own seams, seat edges and membrane frames so it reads as this site's Meter colour. Warm interior light in occupied rooms, glazing facing the camera. Lush planting: trees, planters, shrubs. Residents are small but clearly visible, resting, sitting, talking — at least a dozen people in the site. No text, no logos, no signage letters.

## State blocks

### −1 `private-pods` 「予約して、一人や親しい人と静かに過ごせる場所」

The pavilion becomes a calm seaside garden of private rest pods: six to eight small white capsule rooms, each about 4 m across, hovering half a metre above a planted terrace on glowing under-emitters, each with a curved glass front facing the camera and warm light inside, where one or two people sit reading or talking quietly. Translucent light-membrane screens (thin pink #ff6f91 frame) separate the pods; small reservation light-posts by each door glow. Low hedges and small trees between pods. Reads at a glance: separate quiet rooms for one or two, booked in advance.

### 0 `mixed-seating` 「静かな席と、自由に集まれる場所が半分ずつある海辺」

The same terrace split in half: on one half, three or four of the hovering private pods with warm glass fronts and membrane screens; on the other half, an open sunken ring of benches and a hovering canopy disc (white, on four glowing stabiliser emitters) shading a lively group of residents sitting together, a few children, a shared table. A clear line of planting divides quiet from open. Reads at a glance: half quiet booked pods, half open gathering place.

### +1 `open-commons` 「予約せず、誰でも一緒に使える開かれた海辺」

The pods are gone; the whole lot is one open commons: a wide stepped amphitheatre of white terraces and long curved benches facing the water, crowded with residents sitting together, talking, eating, children playing, under a large hovering canopy disc or light-membrane roof held by stabiliser rings (pink #ff6f91 frame seams). Shared tables, trees in raised beds on the terraces, an open forecourt with no doors or screens. Reads at a glance: one open seaside place anyone can walk into and share.
