# Street network stage 2 — section B on the ④ boulevard

Owner-approved 2026-11-04 before code, with traffic option (b), pods drive B. As-built deltas are in §8.

Owner decisions 2026-11-04 (sketch v2 `~/city2127-evidence/road-redesign/sketch-v2.png`, B look accepted at R3, stage 1 accepted). Stage 3
(court pool, canal park, removing the landscape shader's sine ponds) stays out. Metres, world x/z (+z south); offsets are left of the route
(`n` = up × tangent; the route runs south-west → north-east, so left is the Fuji side). Measurements come from 1 m top-down rasters of the
live production scene (`~/city2127-evidence/road-net-stage2/spec/`: `raster.mjs` at 4.5 m and 12 m ray height, `prof4.ts`, `over4.ts`,
centreline `b4.json`). Plan drawing: `spec/map-b4.png` (blue: ④ centreline and its ±13 m edges, ticks every 50 m; grey dotted: the R3
preview; red: the glass sphere's mast and three feet).

## 1. ④ centreline (704 m, district edge to district edge)

| ④ d | Centreline | Why |
|---|---|---|
| 0 – 260 | straight on the old band's axis, 102 m south-east of its north-west edge line: (−281.7, 320.1) → (−80.1, 180) → (−64.9, 169.4) | follows the band out of the south-west district edge (z 320) onto the backdrop band; passes through the **glass sphere's tripod** (`skyways.ts` sphere at −80, 100, 180) |
| 260 – 440 | bends east south of the Fuji frame: (−40, 163), (−10, 166), (30, 174.5), (70, 181.5), (96, 181.5) | Fuji SW leg 5.5 m beyond the street edge; dips south to 181 m so the 7 m footbridge stub (`PUBLIC_LINK_BRIDGES`, ends at z 166) clears the north terrace by 1.8 m |
| 440 – 520 | out between Fuji and the DiverCity office tower: (122, 175), (145, 165), (162, 146) | Fuji SE leg 8.5 m and the office tower 13.5 m beyond the street edges |
| 520 – 704 | north-north-east, then north-east back onto the band: (175, 120), (185, 88), (207, 52), (230, 16), (248, −8), (262, −24) | grove terrace 1.2 m beyond the edge; joins the band's south-east carriageway at the east district edge (x 260), so the backdrop band carries on; SE TOWER's lot stays ≥ 50 m away |

The R3 close frame keeps its street: at (−24, 172) the new line runs 8 m north of the preview's (④ d 307).

**Sphere tripod.** The sphere's mast (≈3.5 m) and one strut foot stand on the median at ④ d 245 and 230; the line runs along that foot's
bearing, so the other two feet land at ±13.2–14 m (just outside the terraces) at d 253. Median planter, blades and planter bands keep gaps
there (d 226–250 median, d 248–258 both terrace bands). The struts rise 5 m per metre inward, so they are 17 m up over the footway.
No skyway deck, guideway or Meter lot is lower than 12 m over the street anywhere else. Surveyed trees on the footprint (± 13.5 m) are
hidden in place, as on the U.

## 2. Cross-section (B, `boulevardStreet`, unchanged from R3)

24 m street, 26 m with the terraces: median planter ±1.5 (slim cypresses), ceramic carriageways 1.5–8.5 each side with one guide
channel at 3.85–6.15, terraces 8.5–13 (0.45 m step, lit lip, planter band at 10.6–13), lamp blades every 20 m at 9.7 m. On the terrain
(raycast), as the preview. Light-bridge crossings (4 m, flush) at **④ d 120** (Grand Nikko south ↔ the south park), **d 307** (the R3 close
frame, Fuji court ↔ south park) and **d 470** (the gap between Fuji and the office tower).

## 3. GLB streets inside `DISTRICT`

All of them go, so `repairRoads` clips one zone, the `DISTRICT` rectangle: `ROAD_MAJOR` (the ~90 m band), `ROAD_SECONDARY` (its side
streets, the east ①–② connector, the six-way junction pieces), `MAJOR_ROAD_MARKINGS`, the street paving of `SIDEWALK_NETWORK`,
`PHASE03D_GUARDRAILS`, `STREETLIGHT_INSTANCES`, `PUBLIC_LIGHTING`. The U's per-10 m cuts, `ROAD_CUTS` and `ROAD_LINKS` become redundant
(all lie inside the district) and go. Ground there turns to the terrain's lawn. Beyond the district every backdrop road stays: the band
continues past both ends of ④ (which overlaps it by a few metres), and ① ② continue past the U as now.
In this raster window that is about 3.9 ha of band, 0.7 ha of side streets and 1.8 ha of street paving.

- Doorway forecourts check their walk on `sidewalk|plaza`: where a forecourt walk loses its paving with `SIDEWALK_NETWORK`, that piece by the
  building pad stays (the test tells which).
- `PUBLIC_LINK_BRIDGES` (7 m footbridges over the band and ②) are not streets: kept for stage 3, where the canal park takes the band.
- U planter gaps kept only for side-street mouths fill in: outside 474–490, inside 1092–1109.

## 4. Traffic

The street cars stay on the U (④ does not join it; the sketch has no link). **B: owner to choose**: (a) none, as now; (b) pods drive both
guide channels end to end (Japan keeps left; about 8 per direction, `streetPodFleet`, fading at the district edges like the street cars),
stopping for the light bridges. Recommended: (b), the B target shows pods and an empty 700 m boulevard reads unused from the hero pose.
The preview's four static demo pods go with `?roadKit`.

## 5. Code

`streets` gains ④ (or `layout.ts` `BOULEVARD` points, if B has no traffic), `STREET_KIT` gains B's crossings and gaps; `streetNetwork`
builds A on the U and B on ④ (ceramic and terraces join the environment); `?roadKit`, `ROAD_KIT_PREVIEW`, `streetKitPreview`,
`coolGlassGlow`'s DEV switch and `previewBoulevard` go; `plantLandscapeCanopy` gets ④ as a street.

## 6. Review poses (day `hour=13`, night `hour=21`)

- Hero: default page.
- B close (R3 pose): `review=street&cam=-45,24,212&at=0,0,168`.
- Wide ④: `review=street&cam=-170,70,320&at=30,0,165` (from the south-west: the boulevard under the sphere's tripod, bending south of the
  Fuji frame toward the office tower gap).

## 7. Checks

- `npm test`: ④ paved end to end (ceramic, both terraces); no `ROAD_*`, markings or street paving left inside `DISTRICT`; backdrop band and
  avenues still there past the edges; kit planters, blades and median clear of the sphere's mast and feet, piers and landmarks; kit flat
  finishes count as open ground; with (b), pods clear every solid by 0.3 m and the crossings sit on kit surfaces.
- `npm run build`, `git diff --check`. Live re-raster along ④ (nearest solid to the street edges and to a pod body); captures in
  `~/city2127-evidence/road-net-stage2/`, FPS from the closeup-polish skill's `fps.sh` (headed Chrome).

## 8. As built (2026-11-04)

- `streets[1]` in layout.ts is the centreline above, extended 4 m past both district edges (so ④ d values are +4 on the table: crossings
  124, 311, 474; median gaps 230–240 and 244–255, terrace gaps 252–262, `BOULEVARD`). B is flat at 0 like A (the terrain under it is −0.35…0);
  the terraces' sides reach 0.6 m below the carriageway so their outer face meets the lower lawn.
- `repairRoads(environment)` clips one zone, `DISTRICT`; `ROAD_CUTS`, `ROAD_LINKS` and `streetCuts` are gone. It records the removed street
  ground in 4 m cells (`onFormerStreet`); `plantLandscapeCanopy` treats those cells as not landscape, so groves stay where they were and the
  old streets read as open lawn (stage 3's canal park takes the band).
- Pods: `CARRIAGEWAY[1] = {centre 0, half 8.5, lane 5}`, `ROAD_HALF[1] = 13`, `STREET_GAP = [27, 81]` (9 slots per lane), drawn by their own
  fleet `boulevard-pods` (pods at every automation level; `street-pods` stays the U's automation swap). Crossings at the three light bridges
  every 113–149 s (they take 13 s to cross); crossers stand on the bridge or the 0.45 m terrace. The mobility test allows 400 m of slot lag on
  ④ (measured peaks 215 m evening, 303 m morning; it recovers) and ≥ 5 crossings per bridge in 15 min.
- Meter pieces the line crossed moved to the nearest site that passes their existing checks and stays 15 m (squares, plinths) or 25.5 m
  (pod discs) off the centreline: automation bay 3 (−130, 170) → (−124, 156); concentration pods (−33, 167) → (−79, 137) and (207, 37) →
  (182, 37); sharing courts 2 (−110, 230) → (−110, 250), 5 (−70, 180) → (−137, 286), 6 (−290, 290) → (−385, 290), 8 (220, 0) → (190, 0).
  Court 5 now shows about 450 px from the hero pose and joins `HERO_HIDDEN_COURTS` (owner rule: hero visibility never blocks a design). The
  odaiba test now checks every pod, tower, court and pavilion keeps 2 m off ④.
- Old street paving within 14 m of a built landmark's footprint stays as its forecourt (`repairRoads(environment, landmarks)`): without it
  Hilton's and Grand Nikko's doorway walks lost their paving and the forecourt visits fell from 2 to 1. §3's "street paving goes" holds elsewhere.
- ④'s bushes and leaf clumps cast no shadows (about 12 fps by day at the hero pose); cypresses, planters and blades still do.
- The test counts `BUILDING_PADS` as open ground (the removed street paving lay over these flat pads; a service pavilion corner stands on one).
