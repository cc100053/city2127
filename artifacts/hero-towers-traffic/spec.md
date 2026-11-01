# Hero towers and traffic: spec (Opus, 2026-11-01)

Target: [R01](../../docs/ODAIBA_2127_REFERENCES/R01_MASTER_HERO.png). Before: [r2b-h16](../hero-futurism/r2/r2b-h16.png), [r2b-h21](../hero-futurism/r2/r2b-h21.png) (main `5fb2428`). Hero pose `src/heroCamera.ts` c2, 1920×1080.
Taste: [CITY_MASTER_TASTE §3](../../docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) (hero may be exaggerated, street calm, performance is taste). Greenery stays lush; futurism from edges and terraces, never sparse grids. All UI text Japanese (none planned here).

## Diagnosis

Raycast of the hero frame at `?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40` (temporary debug hook, not committed):

| Symptom | Cause |
| --- | --- |
| Blue-striped cylinders left (≈ x 260–340 px), far left (≈ 60 px), centre beside the Civic Core (≈ 700 px), right (≈ 1390 px) | SE Concentration Meter towers, `ConcentrationDistrict` in `src/districtMeters.ts`. Blue `facade` glass (`#6f9cbd`) cut by `trim` rings every .08 h = the "stripes". Family = slot `i % 3` (twisted / terraced / twin). |
| Which slots | `TOWER_SITES` index → distance from hero camera: **5** `[-221,-73]` 392 m (twin, right), **2** `[27,-249]` 431 m (twin, left cylinders), **3** `[83,-305]` 463 m (twisted, far left), **0** `[115,-25]` 631 m (twisted, centre beside Civic Core). Slots 0/2/3/5 are the four visible at SE mixed. |
| Aircraft too small / few / scattered | Meter-driven fleets only: `LOOP_AIRCRAFT` 30 slots, `automationActivity(share).aircraft = 2+28·level` (≈16 at mixed), `AIR_SCALE` 5 (22 m craft ≈ 15–25 px at hero range), split over two loops and two berth approaches. Nothing flies in the far sky behind the Civic Core, where R01's corridors are. |
| Light bands thin, one streak crosses the title | `guideStrength` width .035, strip width 3–10 × .36 m. Near-side strips of the district loop/shore lane project over the title block (top-left ≈ x < 560, y < 420 px). |
| Boats too small / scattered | `BOAT_SCALE` 1.7 (≈ 19 m), 25 `bayCruisers` spread one per 300 m run; wake is white-alpha only, no light. |

Meter semantics: aircraft count follows the NW automation Meter and the concentration towers follow the SE Meter. **Do not raise meter-driven counts.** Item 5 adds *ambient regional traffic* (always on, independent of Meters), which is what R01 shows beyond the island.

## Item 4 — open-frame towers (slots 0, 2, 3, 5)

`src/districtMeters.ts`, `ConcentrationDistrict`:

- Add a fourth family `openFrame`, used by `HERO_FRAME_SLOTS = [0, 2, 3, 5]` (exported const with a one-line why). Replace `i % 3` / `Math.floor(i / 3)` with one small helper giving `(family, instance)` per slot; use it in the constructor counts, `write()` and the crown/dock offsets. Other slots keep their family **and** their current instance order is irrelevant (instances are per family).
- Unit-height group (y 0..1 is scaled by `site.h`, x/z in metres, as the other families). Clearance from `tests/odaiba.test.ts towerProblem`: everything within radius **18.5 m below .05 h** and **22 m above** (test radius 24 at .4/.72/1 h). Existing podium disc (`family()` adds it) stays.
  1. **Exposed structural frame** (`trim`): 4 corner columns 2.6 × 2.6 m at (±12, ±12), full height 0.05 → 1.0; ring beams (box 26 × .012 × 1.6 on each side) at every .125 h; on the two faces facing −x and −z (towards the hero camera before the per-slot yaw; also fine if the yaw turns them) one X-brace per two-storey bay band in `chrome` (thin boxes 1.0 m, written as corner-to-corner geometry so the shear from y-scaling keeps them meeting the columns).
  2. **Stacked, offset terraces** (`cream` slabs .012 h thick with a `trim` fascia lip): 6 slabs at y ≈ .16, .3, .44, .58, .72, .86, each 20 × 20 m and shifted alternately ±5 m on x then z (cantilever out past the frame on one side, max reach 17 m from centre). Each slab carries a `leaf` planted top (.006 h) and 3 `leafyCrown` clumps on the cantilevered edge (lush, not a grid: vary scale 2.0–3.2 and x/z jitter by slab index). Under each slab a `lobby`-material warm band (.02 h) — this is the night read.
  3. **See-through massing** (`skyGlass`): three glass volumes inside the frame between terraces (e.g. y .05–.15, .45–.57, .73–.85), 16 × 16 m, so the sky reads through the gaps between them and between terraces. Plus a slim lit core (`lobby`, cylinder r 3.5) full height so the tower is not hollow at night.
  4. **Crown**: open `trim` halo ring (torus R 15, tube .9 m, in unit space flattened y) at 1.02 and a short `chrome` mast to 1.10 (stays under the 165 m air-loop check: max `h` is 128 → 141 m ✓).
- Keep the vertical-forest crowns/dock rings working for family 3 (roof y = 1.0 h; lower crowns at radius 16).
- `bake()` per family as now; expected +5–6 draws (trim, chrome, skyGlass, cream, leaf, lobby). Do not change `TOWER_SITES`, heights or the other three families.
- Tests: update `tests/districtMeters.test.ts` (mid-rise instance index via the new helper; "3 silhouette families" message → 4). `tests/odaiba.test.ts` tower clearance must pass unchanged.

## Item 5 — sky and water traffic corridors

`src/layout.ts` (route data) + `src/mobility.ts` (fleets). One function, one place: build inside `mobility()` beside the existing fleets.

### Sky: three regional light corridors (ambient, Meter-independent)

- `skyCorridors` in `layout.ts`: 3 corridors, each a smooth open polyline 2–4 km long passing **beyond** the district in the hero view's sky (beyond the Civic Core, toward +x+z of the camera), altitudes 190–320 m, i.e. above every structure (towers ≤ 148 m, air loop 170 m). Each corridor has **2 parallel lanes** 18–30 m apart (opposite directions), so a corridor reads as one bundled band, not scattered craft.
- Tune with the hero camera projection (`heroCamera(1920,1080)` + `HERO_POSITION/TARGET`): every corridor sample that is in front of the camera must project **outside the title rect x < 600 px ∧ y < 440 px** and inside y 120–460 px (upper sky band above the skyline, below the top HUD). Aim for one corridor crossing behind the Civic Core, one diagonal from upper-right toward centre, one lower and farther along the bay horizon.
- Fleet `regional-air`: reuse the winged craft parts (`wing(airShell)` + body/glass/mint) at **AIR_SCALE × 1.8** (≈ 40 m wingspan), **10–12 craft per lane** (≈ 60–70 craft), even spacing with small hash jitter, speed ≈ 35 m/s. Instanced, `frustumCulled=false` as other fleets.
- **Light trails**: each craft carries a tapered streak behind it as part of the same fleet (extra part with an additive `MeshBasicMaterial`, colour `#88d6d3`×3 like the guides, `depthWrite:false`, `blending: AdditiveBlending`), **two crossed quads** (horizontal + vertical) so the streak is visible edge-on at grazing angles; length ≈ 0.8 × craft spacing so consecutive trails almost join into a continuous flowing band, width ≈ 2.5 m at the craft tapering to 0. Must read as **continuous light bands, not dotted lines**: no static strips, no gaps shorter than a trail.
- Night: trails keep the same emissive (bloom does the rest); craft `airShell` emissive already glows.

### Existing streaks

- Hide any `air-corridor-guides` strip whose sample projects into the title rect from the hero pose (mask computed once at build with `heroCamera(1920,1080)`; comment why). Thicken lit guide strips ≈ 1.6× (`width` factor) so they match the new bands.

### Water: two lit boat channels (ambient)

- `bayChannels` in `layout.ts`: 2 water lanes in the open bay visible from the hero (foreground water bottom-left and the far bay band), each a smooth polyline on open water, ≥ 40 m from shore, piers and existing `bayCruisers` runs. Tests must prove clearance the same way existing water routes are checked (find the cruiser/water checks in `tests/` and extend them).
- Fleet `bay-shuttles`: the existing yacht parts at **BOAT_SCALE × 1.5**, 8–10 boats per lane, plus a **light wake**: a mint additive streak on the water (y −.05, length ≈ 45 m, width 3 → 0) per boat in addition to the white wake. Night reads as moving light lines on water (R01).
- Leave `BOATS`, `bayCruisers`, `WATER_PHASES`, `AIR_SCALE`, `LOOP_AIRCRAFT` and the automation curve unchanged.

### Tests to add (small, in existing files)

- `tests/mobility.test.ts`: (a) every sky-corridor sample in front of the hero camera projects outside the title rect and inside y 120–460 px; (b) sky corridor min altitude > 185 m; (c) lit trails: in one frame, adjacent craft trails on a lane leave gaps < trail length (no dotted line); (d) water channel samples clear (as above).

## Perf budget

Uncapped FPS must not drop more than 5 % vs main (R1: 86–90 uncapped). Expected draw delta ≈ +15 (6 tower, ~5 air, ~4 water). Triangles +< 0.3 M. If a budget is missed, cut craft count first, never the frame/terraces.

## Captures (Sonnet, round r1/)

playwright-cli, 1920×1080/DPR1, `npm run dev -- --port 5174 --strictPort`, sleep ≈ 12 s after `goto`, `screenshot --filename=<abs>`:

1. `r1-h16.png` — `/?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16`
2. `r1-h21.png` — same, `hour=21`
3. `r1-sehigh-h16.png` — `se:12` (all ten towers incl. slot 1/4 old families next to the new ones)
4. `r1-se-focal.png` — SE close-up regression (`?shot=se:focal` or the shot-preview param `src/main.ts` uses; compare with `artifacts/se-closeup-polish/r4/`). Slot 0 is 68 m from the SE site: if the open-frame tower appears in the SE close-up, say so.
5. `before-after-h16.jpg`, `before-after-h21.jpg` — left main (`../hero-futurism/r2/r2b-h16.png` / `r2b-h21.png`), right branch, side by side (ImageMagick `magick … +append -resize 50%` or ffmpeg).
6. `fps.txt` — canvas `data-fps` 6×2.5 s after 14 s load, vsync and uncapped (`--disable-gpu-vsync`), day and night, branch then main (`git stash`-free: run main from a second clone/worktree or compare with the R1 numbers and say which), plus draws/triangles from the same attribute.
