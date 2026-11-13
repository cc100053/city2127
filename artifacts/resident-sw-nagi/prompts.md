# Gemini prompts — Nagi (SW focal, Meter 0 / mixed)

Draft 2026-11-14 for owner selection; no target has been generated or accepted. Structure follows [Minato's prompts](../../.agents/skills/resident-scene/prompts-minato.md).

Baselines (this folder's `baseline/`) are `?meters=sw:<low|mixed|high>&shot=free&pose=-88,5.2,262,-88,3.4,285&fov=52&nopanel&hour=12&reviewTime=40`, 1600×900 (night: `hour=22`). Regenerate with `npm run capture` ([handoff](../../docs/handoffs/resident-sw-nagi.md#step-3-stage-survey)). One image per block: paste the shared block followed by the state block as one prompt, with the listed baseline uploaded. Only the two transitions that end in 0 are covered, so the states are: before (−1), before (+1), after (0, day and night).

## Shared block (prepend to every scene prompt)

Edit this image. It is a frame from a real-time 3D city model of Odaiba, Tokyo in the year 2127. Keep exactly the same camera position, angle and lens, the same lighting and time of day, and the same surrounding buildings, trees, sky and ground. Keep the in-engine look: clean stylised low-poly 3D with flat matte materials, soft shadows, white and pale grey architecture with low-saturation cool white-blue technology light. Not photoreal, no film grain, no lens effects, no text, no logos, no UI. Keep the background people at the size they have in the baseline. The heroine Nagi is the same size as them (an adult about 2.2 m in the scale of this model, with the module door about as tall as she is). People are simple stylised figures with a clear silhouette, a simple face (eyes and mouth only) and visible hands; no realistic skin detail.

The scene stands on the south shore, in front of a block that can be a private pod garden, an open stepped plaza, or a tall event module shelf. Do not change the large structures or the trees beside the frame. Redesign only the ground-level foreground and the resident, so the heroine reads as one clear figure about one quarter of the frame height, body and face turned three-quarters toward the camera.

The heroine is Nagi, 34, a delivery route editor who plans the daily routes of drones and cars for the whole district. She has no workroom of her own and calls a small room whenever she needs one. She wears a soft grey-green work jacket, dark trousers, white shoes, short dark hair; she carries a thin pale-blue glowing tablet and a small phone.

## State −1 — private pod garden, before (baseline `base-minus1.png`)

She sits on a bench in the small private garden with the tablet on her lap. The low garden wall has just drawn back a little. She raises her phone in one hand and looks toward the camera side where a module will come. No module in the frame yet. The mood is calm and a little wistful: the garden is getting smaller, but a room is on its way.

## State +1 — open plaza, before (baseline `base-plus1.png`)

She sits on a free seat of the stepped plaza with the tablet; the sky is turning dusky, and she is putting the tablet away and raising her phone. A few other people sit relaxed on the steps. No module in the frame yet. The mood is quiet: the free seats are fewer, but she can get a quiet room.

## State 0 — mixed, after (baseline `base-zero.png`)

A small white module with a wooden door and a rounded awning has just stopped at the ground track in front of the shelf and its four corner lock lights flash cyan. A slim side panel beside the door shows her name in a small warm glow; below it a line that says tomorrow's room will be a meeting room (no readable text, abstract glyphs only). Nagi holds the tablet against her chest and steps to the open door; through the window a desk is visible. The mood is warm and settled.

## State 0 night (baseline `base-zero-night.png`)

Same as State 0, at night: the module's warm window and the door panel are the only warm light; the lock lights glow cyan; Nagi's face is lit softly by the tablet. Everything else stays cool blue-white.

## Character sheet (no baseline upload; generate from text)

Character design sheet on a plain pale grey background, clean stylised low-poly 3D render with flat matte materials, matching a minimalist white futuristic city model. One character shown three times, full body: front, three-quarter and back. Nagi, 34, a delivery route editor in Odaiba in the year 2127: soft grey-green work jacket with a thin cool-blue trim line, dark trousers, white shoes, short dark hair, a thin pale-blue glowing tablet in one hand, a small phone in the other. Simple face with eyes and mouth only, visible simple hands, proportions slightly stylised (head a little large), built from clearly separate rigid parts — head, hair, torso, upper and lower arms, hands, upper and lower legs, feet — so it can be animated without skin deformation. Focused, relaxed, practical. No text, no logos.
