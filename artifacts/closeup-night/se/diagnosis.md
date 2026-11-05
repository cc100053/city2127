# SE prep — diagnosis (closeup-night, 2026-11-04, main 5a56230 + skill)

Site: `changeSites.se` TOWER フジテレビ東, centre (182, −38), lot 14×14 units, scale 3 (42 m), +1 ≈ 41.6 units ≈ 125 m. Builder `src/siteBuilders/concentrationTower.ts` (2026-11-01 R4, old taste). Option text Q4 `functions-2127`. Accent `METER_COLORS.urbanConcentration` #ffb347.

## Symptoms → cause

| # | Symptom (captures `poses/sheet-current.jpg`, `baseline/sheet.jpg`) | Cause |
| --- | --- | --- |
| D1 | `se:focal` `[12,115,-208]→[182,72,-38]` shows **no site at all**: a curved megastructure arch and a white frame tower fill the frame | city-taste-v2 P1 megastructures (2026-11-02) were built after the SE pose (11-01); nothing re-checked it |
| D2 | `se:focal-low` `[100,34,-120]→[182,26,-38]` frames the lot, but two thick horizontal beams cross the upper half and the 0/+1 tops leave the frame | a structure just in front of the camera (beams ≈ y 35–55 around x 100–115); pose is from before P1 |
| D3 | −1: orange barrel-roof timber pavilions, beige/orange boxes — read as 2026 shops / toy, not 2127 | old taste (`timber`, `cream`, orange `amber` roofs); no white metal, no machine signature |
| D4 | 0: beige stepped block with orange stripes, two barrel pavilions in front | same; no glazed warm rooms facing the camera, no people readable |
| D5 | +1: orange-gridded square box tower, reads as a generic office block; blue/cream neighbours look similar in mass | old taste; flat orange grid instead of white frame + distinct function floors |
| D6 | People barely readable at any pose; pink umbrella plaza behind the lot steals the eye | crowd too small for the distance; neighbouring plaza in the sightline |
| D7 | The dense SE cluster (Fuji TV frame, tall blue/cream and white neighbours, megastructure arch) leaves no clear sightline from > 150 m except from the east | the site is boxed in on N/W/S; only the east side and the near NW side are open |

## Chosen poses (split stays: L for changes touching −1, H for 0↔+1)

- **L** `[130,28,-95] → [182,24,-38]` (≈ 78 m, near-level): just past the D2 beams, sky and far horizon behind, lot ≈ 55 % of frame width. Frames −1 and 0 (0's 50 m stepped block top just in frame). Cannot frame a 125 m +1 (vertical fov 42° → ~60 m tall frame at this range).
- **H** `[360,45,-50] → [182,58,-38]` (≈ 180 m, from the east): the only pose found that frames the full +1 with sky at top. Heavy neighbours left (Fuji TV frame + holo sign) and right (big white tower) take ≈ half the frame; pink umbrellas in the foreground; at 0 the white frame tower in front hides much of the mixed block.

## Rejected candidates (`poses/cand1–6.jpg`)

- `se:focal` as is (D1). `[96,40,-124]` with any target: beams across the subject (D2).
- NW/N at 150–200 m (`[40,45,-180]`, `[150,30,-200]`, `[250,30,-190]`, `[60,60,-160]`, `[70,90,-150]`, `[100,75,-125]`): inside or behind megastructure arch, planted ramps and blue/cream towers.
- South `[200,45,170]`: camera inside a building. SE `[290,40,70]`, `[330,50,110]`: +1 visible but low state hidden behind clutter, frame tower + arch dominate. East `[380,45,-60]`: like H but farther, smaller subject.

## Old taste vs the new taste (what the redo must change)

Structure must be white metal with precise seams, not cream/timber/orange; rooms facing the camera glazed and warm-lit with people inside (NW bay R2 language); amber #ffb347 only on thin seams/rings/edge lines, not on whole roofs or facades; every state needs a machine signature (hovering roof discs on emitters, lift capsules, light rings); lush planting woven in; silhouettes stay the option text (−1 many low, 0 low + mid, +1 one vertical street).

## Owner decisions needed

1. **+1 framing**: accept H (east, busy neighbours, full 125 m tower) — or lower +1 to ≈ 60–70 m so one L-direction pose (pulled back to just in front of the beams) can frame all three states with sky behind, or allow removing/moving the beam structure in front of L (outside the site's files).
2. **Size**: grow the model to the targets' frame share, or crops follow the city (decide per pose once targets exist).

## L-up attempt (owner 2026-11-04: +1 along the L line, pulled back/up)

Not possible at fov 42°: a 125 m tower needs ≥ ~165 m clear sightline, but the L direction is clear only ≈ 80–120 m from the lot (beams at x ≈ 96–115, then megastructure arch, planted ramps, frame tower, blue/cream tower). Tried (`poses/cand-lup.jpg`, `cand-lup2.jpg`, +1 at 1600×900): `[80,95,-150]`, `[54,120,-178]`, `[70,140,-160]` (on the line) and `[113,90,-205]`, `[22,90,-121]`, `[55,170,-178]` (±20°, high) — every one is filled by the arch/neighbours; the tower is not visible. Baseline `flagship-high-*` left as the H pose (not renamed). Options: H (east), lower +1 to ≈ 60–70 m so L frames it, or clear/move the beam + arch obstruction (other files).
