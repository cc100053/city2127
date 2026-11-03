# NW close-up polish — Gemini target prompts

Taste: [CITY MASTER TASTE](../../docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) ("visible high technology", owner 2026-11-02). Option text: [RESIDENT_COPY Q1](../../docs/RESIDENT_COPY.md) `service-2127`.

Baselines (evidence folder `~/city2127-evidence/nw-closeup-polish/baseline/`, 1600×900, 12:00, HUD hidden):

- Flagship (AUTO HUB, `changeSites.nw`, site centre (40, −300)): candidate pose `nw:e` = `cityPose([192,44,-338],[40,54,-300])` → `nw-e-low|mixed|high.png`, night `nw-e-high-night.png`.
- District carrier (automation bay 10, (75, −160)): candidate pose `nw:bay-e` = `cityPose([-10,40,-90],[75,32,-160])` → `nw-bay-low|mixed|high.png`.

Each Gemini run = the baseline image of that state + **Shared block** + the matching **state block**, as one prompt.

## Shared block (flagship and bay)

Edit this screenshot of a real-time 3D city (Odaiba, Tokyo, year 2127). Keep exactly the same camera, framing, lens, daylight, sky, sea, and every neighbouring building, megastructure arch, ring and tree. Change ONLY the building in the centre of the frame (standing on the lot with the thin orange outline; keep the outline). Style: in-engine low-poly real-time render — large clean forms, flat-shaded white metal, clear pale glass, thin precise light seams; not photoreal, no texture noise, no realistic window grids. The city's taste is "visibly very advanced technology": every impossible part shows its machine signature (stabiliser rings and under-emitters on anything floating, precise seams and service rails on structure). Technology light is cool white-blue and low saturation. The ONLY saturated accent colour is automation blue #3fa9ff, used sparingly on the building's own seams/rings so it reads as this site's Meter colour. Residents are small but visible, going about daily life. No text, no logos, no signage letters.

## Flagship — state blocks

### Flagship −1 `human-led` 「待ち時間があっても、人に相談したい。技術はその人を支えてほしい」

The centre building becomes a low, wide, open civic service hall about the same footprint, roughly 30 m tall: a white megaframe pavilion whose whole camera-facing ground floor is glazed and open, showing a row of warm-lit counters with staff and residents sitting face to face, small groups talking. A large thin white canopy disc hovers above the roof on four glowing stabiliser emitters, shading a forecourt with benches and trees where people queue and chat. A few service drones rest on the canopy edge, idle. Reads at a glance: wide, low, full of people helping people.

### Flagship 0 `human-machine` 「普段は自動で、困ったときは人に相談したい」

The same open service hall at the bottom (warm counters, staff, residents), now with one slender white automated service column rising from its centre to about 70 m: a column of stacked docking rings with blue #3fa9ff seams, a few drones docking at the upper rings, a short robotic arm handing a parcel down to a pickup niche next to the counters. Half the frontage is staffed counters, half is self-service light terminals. Reads at a glance: people below, machines above, working together.

### Flagship +1 `autonomous` 「人に相談する機会は少なくても、いつでも自動で利用したい」

The hall is gone; a tall white autonomous service spire rises about 110 m: a precise white core wrapped by many stacked docking rings that glow blue #3fa9ff at their seams, with a steady drone swarm flying in formation into and out of the rings, giant service arms sorting parcels, and maglev delivery pods gliding into ports at its base. At ground level residents use self-service light terminals on their own, no staff counters. Reads at a glance: one vertical machine that serves the city by itself, day and night.

## District bay — state blocks (r2, owner 2026-11-03: same language as the flagship targets)

Round 1 bay images were not chosen; the owner picked the flagship row and asked for the bay in the flagship's language. Each bay prompt also uploads the matching chosen flagship target as a second image with: "The second image shows the flagship of this service network; make the centre building a smaller neighbourhood version in exactly the same design language (same white frame, glazing, hovering canopy disc, docking rings, drone and light style)."

### Bay −1 staffed service pavilion

Replace the bare white stacked platforms in the centre with a small version of the flagship's low hall: a low, wide glazed white pavilion about 12 m tall whose camera-facing side is open, warm-lit counters with staff and residents sitting face to face, and a thin white canopy disc hovering above the roof on four glowing stabiliser emitters. Benches and planters at the front. No mast.

### Bay 0 hybrid

The same small glazed pavilion with warm counters and staff, plus one slender white service column rising from its centre to about 40 m: three stacked docking rings with #3fa9ff seams, one drone docking, a short robotic arm handing a parcel down next to the counter. Flat roof, no pool or water.

### Bay +1 autonomous

The pavilion is gone; a slim white autonomous service tower about 45 m tall in the flagship spire's language: white core wrapped by stacked docking rings with #3fa9ff seams, a small drone formation flying into the rings, a light locker at the foot where residents collect parcels themselves. No staff.
