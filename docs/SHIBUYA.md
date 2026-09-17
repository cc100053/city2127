# Shibuya spatial study — Plan 01

Implemented from the existing ChatGPT Plan 01 on 2026-09-17. This iteration establishes spatial identity, not finished facades or a geographically exact replica.

## References and translation

- [Google Maps: QFRONT and the crossing](https://maps.google.com/?cid=11448903079200287662): inspected the map and building photo. QFRONT sits northwest of the crossing, MAGNET to the northeast, the station and Hachiko plaza to the southeast; western streets branch rather than forming four identical blocks.
- [GO TOKYO: Qfront](https://www.gotokyo.org/en/spot/366/index.html): confirms the large screen facing the scramble crossing. The prototype uses an original canvas sign and simple mullions, not downloaded advertisements or facade textures.
- [Tokyo Pocket Guide map](https://www.tokyopocketguide.com/tokyo/pdf/shibuya.CROSSING.map.pdf): its March 2024 labels provide secondary orientation for Center-gai, Dogenzaka and Hachiko exit; it is not treated as a current construction survey.

`layout.ts` uses east as +X and south as +Z. Road angles, distances and heights are compressed for the fixed presentation camera. Five crossing paths include one QFRONT–Hachiko diagonal; the painted stripes, pedestrians and pedestrian guides share endpoints. The broad station frontage and low plaza keep the crossing visible. QFRONT is a plain screen block, while the earlier open air station is reused as an imagined future MAGNET volume.

## Preserved systems and scope limits

WorldState, UI copy, 10-second transitions and four-second selection locks are unchanged. Buildings are generated once. Existing factories, material batching and actor pools are reused without dependencies or external models.

The 24 pedestrians traverse five authored paths and reverse on alternate 30-second cycles. Their waiting positions are off the road. Cars continue on the east–west road only; north, southwest and northwest branches intentionally have no vehicle service. This avoids keeping obsolete paths through the new blocks. Individual pedestrian avoidance and real signal timing remain outside this prototype.

The courier, parcel, lift, doors and station geometry share the relocated dock. The lower circulation loop stays south of the tall blocks; the express curve runs above them. Tests sample landmark envelopes, crossing positions, waiting locations and delivery continuity. Envelopes include roof and awning allowances but do not prove exact mesh or aircraft-to-aircraft collision avoidance.

The simplified dog marker, station entrance and screen labels establish orientation; detailed sculpting, real commercial imagery, final futuristic facades and emotional lighting refinements belong to later iterations. The current northern air tower remains visually prominent by design; landmark recognition still merits user review.

## Evidence

Same fixed camera `(34,52,88)` looking at `(-6,7,0)`, FOV 38°, at 1280×720:

- [Dusk](../artifacts/shibuya-neutral.png)
- [Pulse](../artifacts/shibuya-pulse.png)
- [Still](../artifacts/shibuya-still.png)

Animation phases differ between screenshots. See [VALIDATION.md](VALIDATION.md) for checks and limits.
