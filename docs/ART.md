# Art rules — root Shibuya scene

Status: **in use** (2026-09-24, task [art-direction](handoffs/art-direction.md)). The user reviewed the pilot (QFRONT's crossing face, Hachiko plaza, SW commons) and asked for the buildings to be polished next. The rules now apply to every landmark, the upper links, the koban and the NW/SE change-site buildings. New areas follow them too. The rules can still change after the next review.

Reference: [Pic 2](../asset/pic2.png). Direction: Plan 02 daylight, a vertical city, and engineered nature, built procedurally in Three.js ([PLAN02](PLAN02.md) decision, 2026-09-24). What the city looks like serves how clearly its changes read. It is not a goal on its own.

## 1. Palette and material roles

Every surface uses one of the shared materials in `src/cityRig.ts`. Do not create a new material for a single object. Add a new role here first, then add its material.

| Role | Material | Use | Do not use for |
| --- | --- | --- | --- |
| Ceramic mass | `cream`, `teal`, `sage`, `pink` | Building bodies; about 70% of any view | Glazing, accents |
| Trim / structure | `trim` | Slab edges, columns, rims, frames, planter walls | Large flat walls |
| Silvered glass | `glass` (physical, clearcoat) | All building glazing: lobbies, window bands, shopfronts, the sky link, the corner drum; it picks up the sky | Opaque cores |
| Dark metal | `dark`, `solar` | PV fins, rails, lamp posts, the Hachiko figure | Glazing (use `glass`) |
| Stone paving | `stone` | Plazas, plinths, public floors | Roads |
| Living green | `leaf` | Planter tops, hedge strips, shrubs | Paint on walls; "green" facades without a planter |
| Membrane | `membrane` | Canopies, filtration fins, deck rails | Solid structure |
| Civic light | `futureLight` (mint) | Inlaid paving rings, deck edges, service lights | Signage text, guest changes |
| **Guest accent** | saffron `#ff9a2e` (`surveySites.ts`) | **Only** the outline of a guest-made change | Anything else |

Light values stay high and saturation stays low: white, silver, and pale teal. Colour comes from greenery, the sky reflected in glass, and the media screen. Keep the saturated hues for meaning, which is the mint civic light and the saffron guest accent.

## 2. Silhouette and massing

- Pic 2 uses curved and ringed forms, terraces, and slender cores. Each landmark gets **at least one curved element** at hero distance. The pilot uses QFRONT's curved media drum, the ringed plaza, and the ringed canopy. Use `arc()` for rings, arcs, and discs. Use cylinder segments for curved facades.
- Keep boxes as the base mass and add the curve at a readable spot: the crossing face, a canopy, or a crown. Do not round every edge.
- Stack masses in terraces. Each set-back slab carries planting (§4).
- Cores stay slender and vertical. Horizontal bands read as floors, and each band has a trim lip.

## 3. Detail density by distance (hero pose)

| Band | Examples | Detail |
| --- | --- | --- |
| Hero (< 45 units from camera) | Hachiko plaza, crossing, station front, visible change sites | Curves, planters with shrubs, inlaid light rings, seating, signage, and people |
| Mid (45–90) | QFRONT, MAGNET, Dogenzaka, Center-gai | Terraces with planting strips, glass bands, one curved feature, and one sign or screen per face |
| Distant (> 90) | Seeded skyline ring | Plain massing in the `distant` haze material only; no windows, green, or signs |

Everything static goes through the `bake()` material merge. Detail costs vertices, not draw calls, so spend it in the hero band.

## 4. Integrated greenery

- Plants grow **in** something: a planter ring (`arc` in trim with a `leaf` top), a terrace strip, or a park lot. No free-standing pots.
- Use `shrubs()` for soft, grown edges along a planter. Use the future-tree GLB for canopy height, baked per site.
- Greenery shelters and opens space. On Hachiko plaza it shelters the road side and leaves the crossing and station sides open.

## 5. Glass and light

- Daylight is the base state. Glass reflects the environment map instead of glowing.
- Light direction: a warm, fairly low sun (about 40°) casts long shadows across the crossing, and a weaker cool sky fill keeps shade blue-grey rather than black. Form comes from light/shadow contrast, not from darker paint. Neutral tone mapping keeps the pale palette from greying out. Expensive means soft: VSM penumbrae, broad corner AO, sunlit whites kept just below clipping, a faint highlight glow and a light vignette. AgX and a sky-colour environment map were tried and rejected, because both left the scene flat and grey.
- Emissive light carries information: civic mint marks public service paths, and saffron marks guest changes. Windows and signs follow the WorldState presets and come on after dark (day cycle, 2026-09-25): at night the city reads through lit windows, lamps and mint lines against a navy sky.
- The post chain is MSAA render target → GTAO contact shadows → bloom (low) → vignette → output. Contact shadows ground the objects where they meet the floor. Measure on a real GPU before adding more passes.

## 6. Signage and ambient data

- Each face carries one sign or screen at most. The large screen shows a place, not an advert: QFRONT's drum shows a daylight landscape with 渋谷 / SHIBUYA / 2127.
- Ambient data (air, temperature, and service status, as in Pic 2's side panels) belongs on small civic totems and screens. It should never be a floating HUD. The AIR / PICKUP terminals are the existing instances.
- English and Japanese are paired with ` / `, which is the existing copy style.

## 7. People and vehicles

- Actors are the only elements at human scale, so they are what gives the scene its scale. Keep them visible at the hero pose: people on crossings, decks, and lifts, and vehicles on the east–west road and in the air corridors.
- Actors do not wear the guest accent. Their counts vary with WorldState, not with art passes.

## 8. How a survey change reads

A guest-made change must be distinguishable from the base city at a glance and the same at every site:

1. **Saffron footprint outline**: a rounded rectangle just outside the site footprint, on the ground. It appears first, and the building rises out of it (`surveySites.ts`).
2. **Freshness**: a change made since the viewer connected pulses for 10 s, then holds a steady line. Restoring the city on reload or reconnect does not pulse.
3. **Same language as the base city**: the change itself follows §1–§7. The outline is the only extra colour.
4. The causal panel names the place and effect. The 3D scene carries no text labels for changes.

## Pilot checklist (for review)

- [x] Materials `glass`, `leaf` and `stone`, plus the `arc`, `shrubs` and `bake` helpers
- [x] QFRONT: curved media drum on the crossing face, silvered glass lobby and bands, planted terraces on the crossing and east faces
- [x] Hachiko plaza: stone disc, inlaid mint ring, planter rings with shrubs (open to the crossing and the station), curved bench, round Hachiko plinth
- [x] SW commons site: round plaza, planted ring open to the street, ringed canopy on six columns, curved benches
- [x] Guest outline on all four change sites
- [x] MSAA and GTAO in the composer
- [x] User art review of the pilot ("ok, polish building", 2026-09-24) ([before/after](VALIDATION.md#art-direction-pilot--2026-09-24))

## Building rollout (2026-09-24)

- [x] All glazing on landmarks, upper links, the koban and the NW/SE site buildings switched to `glass`
- [x] MAGNET: planted collar terraces (crossing and east faces) and a curved glass corner drum ringed by floor discs on the upper shaft
- [x] Shops (Center-gai, Dogenzaka, Station): east-face glazing and sunshades, planted slabs on alternate floors and above the public void; large roofs (Dogenzaka, Station) get a ringed roof garden on the crossing half, with PV moved to the back half
- [x] Commons floor: planters inside both rails
- [x] SE tower base: planted slabs on alternate floors
- [ ] User art review of the rollout ([evidence](VALIDATION.md#art-direction-building-rollout--2026-09-24))
