# P6 Traffic — spec r1 (coordinator, 2026-11-03)

Target: `target/master-day.png` / `master-night.png` at 1600×900. Taste: daily life goes on, traffic flows; **organised and readable**; glow only from a system (mobility is one). P1–P5 are merged; don't move buildings. Code: `src/mobility.ts` (trains/pods/boats/shuttles/walkers/sky craft + streak light bands), `src/skyRing.ts`.

## What the target shows vs now (latest `P5/rN/hero-h16.png`)

Target sky is **clean**: the Sky Ring truss carries small pods, a few drones fly in small tidy groups at mid height, one or two cool light bands (maglev/guideway) sweep at ground-deck level through the city (e.g. the cyan band crossing the plaza at screen y≈0.65 and the curved one at right), a few small boats on the bay. Now: the upper sky is crossed by **many long thin cyan streak lines** (regional sky corridors, screen y 0.1–0.3 right half) — they read as scratches/noise and compete with the floater; the mid-level capsule pods on a straight cyan band at y≈0.62 are good but the band is a hard straight bar across the whole frame.

## 1. Clean the upper sky

- Regional sky craft (`skyCorridors`, `SKY_*`, `skyPose`): cut lanes visible from hero to at most 2, keep them BELOW the Sky Ring deck height or behind the skyline, and shorten trails (SKY_TRAIL streak length ≤ 0.35 × spacing, opacity −40% by day). No streak may cross the floater (P2, centre ≈ (-175, 205, 203), shell Ø 118) or the civic sphere in the hero frame. If a test pins lane counts, update it and list.
- Keep `heroTextZone` rules.

## 2. Guideway / maglev light bands

- The mid-level pod band (straight cyan bar at screen y≈0.62): make it follow a gently curving route (if it's a straight segment of `routes()`, bend it via existing curve helpers) and replace the hard bar with a **guideway**: thin white rail beam + a cool light band only under/near moving pods (the existing `guideStrength` short-streak logic — the band lights where craft are, ~7 of 96 strips), so it reads as a system, not a painted line.
- Ground maglev / train guideway (`guideway`, trains): ensure its light band reads cool white-blue (`#cfe8ff`) and continuous through the plaza area like the target's sweeping band.

## 3. Drones and boats

- Drones: small groups of 3–5 in formation at 40–90 m, 3–4 groups visible from hero, slow; white bodies with tiny cool nav lights (night). Reuse existing aircraft/platoon code (`aircraftSlot`, `PLATOON`) — tidy the formation rather than add a new system.
- Boats: keep counts; make sure 2–3 small craft are visible in the foreground bay strip at hero with a short wake.

## Budget, tests, captures

- No new draw calls beyond +3; fewer is welcome. Hero ≥ 60 FPS.
- Captures `artifacts/city-taste-v2/P6/rN/`: `hero-h16.png`, `hero-h21.png`, `vs-target.jpg` (integration-tip h16 | rN h16 | target), `close-guideway.png`, `close-drones.png`. FPS day/night as before.
- `npm test && npm run build && git diff --check` (read the `fail` count); commit, push `feat/city-taste-v2-p6`, stop servers, report (commit + FPS first; list test edits and lane/craft counts before/after).
