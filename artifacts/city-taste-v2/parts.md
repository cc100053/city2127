# City taste v2 — part breakdown (draft, Opus 2026-11-02)

Target: `target/master-day.png` (owner-locked) and `target/master-night.png` (pending). Taste: `docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md`. Baseline: `baseline/hero-h16.png`, `hero-h21.png`. Hero URL: `?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16|21`, 1600×900, HUD hidden.

Loop per part: a fresh session implements one round on branch `feat/city-taste-v2-<part>` from the integration branch `feat/city-taste-v2`, runs `npm test && npm run build && git diff --check`, captures `rN/hero-h16.png`, `rN/hero-h21.png`, `rN/vs-target.jpg` (baseline | round | target) and samples hero FPS (vsync, 1920×1080, `data-fps`). Opus reviews: **polish again** (max 3 rounds), **pass** (merge into `feat/city-taste-v2`, next part) or **revert**. Nothing merges to `main` without the owner.

Global gates every round: hero 60 FPS day and night; tests green; all UI Japanese; no floating islands / rocks / waterfalls. The four Meter sites do NOT have to be visible from hero (owner 2026-11-02): when a hero-sightline assertion blocks a design (`tests/odaiba.test.ts` `heroSightline`, `skyRing`, `spaceElevator`, `heroHolograms`, `energyPrototype`, `housingCityCheck`), delete that assertion and say so in the round report — never bend the design around it.

| # | Part | Target read | Likely code |
|---|---|---|---|
| P1 | Megastructures | Ring-on-edge building (left), giant white arch, stepped terraced hull (right) — ant-scale people, glowing seams, service rails | new module (e.g. `src/megastructures.ts`), hide/replace context blocks they cover (`contextFacades.ts`, `odaibaScene.ts` GLB placements) |
| P2 | Civic core + floaters | Fuji frame larger with chrome sphere; floating sphere in a glowing field ring with emitters (upper right); self-assembling modules with light beams on the hull | `civicCore.ts`, new floater module |
| P3 | Secondary buildings | A-style: white metal megaframes, cool white-blue seams, suspended glass, thin hologram panels; no window-grid box towers or rooftop-tree filler | `odaibaScene.ts` (GLB materials), `contextFacades.ts`, `districtMeters.ts` tower looks, `heroHolograms.ts` |
| P4 | Ground / open space | Central land plaza with people, white decks, curving elevated paths, foreground bay strip | `odaibaScene.ts` environment, `skyways.ts`, `occupants.ts` |
| P5 | Greenery | Lush terraces and edge planting, hovering bed rims; never sparse | `coastalCanopy.ts` |
| P6 | Traffic | Maglev light bands, drones, small boats; organised, readable | `mobility.ts`, `skyRing.ts` |
| P7 | Night | Match `master-night.png`: seams, field edges, beams, warm windows | per-part night terms, `dayCycle.ts` |
| P8 | Facility change impact | Owner problem 3 — scope to agree with the owner later | `siteBuilders/`, `cityChangeManager.ts` |

Order: P1 → P2 → P3 → P4 → P5 → P6 → P7; P8 after an owner discussion.
