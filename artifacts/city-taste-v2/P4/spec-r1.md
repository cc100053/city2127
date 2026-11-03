# P4 Ground / open space — spec r1 (coordinator, 2026-11-03)

Target: `target/master-day.png` / `master-night.png` at 1600×900. Owner direction: **the centre is LAND** — a continuous city ground of plazas, decks, terraces and greenery between the megastructures; keep only the foreground bay strip. Taste principle 5: daily life goes on (people walking, small craft).

Done before you (don't change): P1 megastructures, P2 civic sphere/floater/self-assembling building, P3 facade/hologram restyle. Out of scope: tree forms (P5 — keep all planting systems and their Meter publishing), traffic lines/drones (P6).

## What the target shows vs now

Target screen (0.25–0.60, 0.58–0.82): a **big pale civic plaza** opening between the arch's left foot and the civic core — white/ivory paving with a soft radial pattern, many tiny people, round planters, and **curving elevated walkways** (white deck, thin cool light edge) sweeping across it from the ring building to the civic core and on to the right. Now: that area is filled by the Aqua City retained landmark (`odaiba-layout.json` `aqua-city-odaiba`, world ≈ (-64, 0, -115), screen ≈ (0.45, 0.73)) — a big low beige box with a roof garden.

## 1. Aqua City → civic plaza deck

- Drop `aqua-city-odaiba` from the load list (same mechanism P1 used for Grand Nikko/Hilton) and replace it with a **plaza deck**: a white podium 1 storey (≈ 5 m) covering roughly its old footprint, with broad ramps/steps down to ground on the camera side, its roof a public plaza: ivory paving (`#e9e5da`) with a subtle radial/ring inlay (thin `megaRib`-tone lines), 6–10 round planters (reuse existing planter/crown instancing from `coastalCanopy.ts`/`cityRig.ts` — lush, low), a central shallow round pool or light ring.
- People: publish the plaza to `occupants.ts` (walk lines + standing groups) so ~60–120 tiny people read on it at hero. Reuse the existing publishing API (`publishRoofWalks`/`publishOccupants` patterns).
- Aqua City's roof gardens fed the environment Meter (`publishRoofGardens`) and its doorways (`publishDoorways`): publish the plaza planters as roof gardens instead so the Meter still has terraces; keep doorway/entrance checks passing (fix code, not tests, unless a test pins Aqua City by name — then update it and list it).
- Keep the sw Meter site (-105, 60) and the sky bridge endpoints valid: `layout.ts skyBridges` 'AQUA ↔ FUJI TV' / 'AQUA ↔ DECKS' start at Aqua City facades — reroute their Aqua end onto the plaza deck edge at deck height, or remove them and list it (they must not end in mid-air).

## 2. Curving elevated walkways

- 2–3 sweeping elevated walkways (white deck 6 m wide, 0.8 m thick, thin `megaSeam` light edge both sides, slim columns every ~30 m) at 8–14 m height: ring-building plinth → plaza deck → civic core base; plaza deck → right toward the hull apron. Smooth curves (CatmullRom, ~40 segments, merged). Check `skyways.ts` first — if its existing sweepways already run there, restyle and reroute them instead of adding new ones.
- People on the walkways (a stroll line each).

## 3. Ground finish

- District ground between buildings: paving lighter/whiter (`plaza` / `sidewalk` finishes in `odaibaScene.ts` toward `#e8e4da`), so the centre reads as one continuous pale land like the target; lawns stay lush green.
- Foreground bay strip, domes and pavilions: keep.

## Budget, tests, captures

- ≤ +8 draw calls. Hero ≥ 60 FPS.
- Captures `artifacts/city-taste-v2/P4/rN/`: `hero-h16.png`, `hero-h21.png`, `vs-target.jpg` (integration-tip h16 | rN h16 | target), `close-plaza.png` (plaza from ~120 m, people visible), `close-walkway.png`. FPS day/night as before.
- `npm test && npm run build && git diff --check`; commit, push `feat/city-taste-v2-p4`, stop servers, report (commit + FPS first; list removed landmark, sky-bridge changes, test edits).
