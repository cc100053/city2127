# P7 Night — spec r1 (coordinator, 2026-11-03)

Target: `artifacts/city-taste-v2/target/master-night.png` (coordinator pick, owner to confirm) at 1600×900, next to `target/master-day.png` for geometry. Taste colour: technology light cool white-blue, low saturation; warm amber occupied windows; Meter colours absent at hero night; glow only from systems. P1–P6 merged; this part changes lighting/emissive terms only — no geometry moves.

## Night target vs now (latest `P6/rN/hero-h21.png`, else `P5/r1/hero-h21.png`)

| Read | Target | Now | Fix |
|---|---|---|---|
| Overall | deep navy sky with a few stars; city reads **silver-grey and lit**, ground paths pale and visible | teal/green cast over everything, ground dark green-grey | `dayCycle.ts nightLighting` + scene ambient/hemisphere tint: night ambient towards neutral cool grey-blue (`#9fb4d0`-ish), slightly higher (ambient 1 − .45·night), environment .85·(1 − .6·night); remove the green/teal tint wherever it comes from (hemisphere/fog/env colours) — find and list |
| Warm windows | **dense** warm amber windows on the ring (most of its glass storeys), civic frame, hull, secondary towers | ring has scattered small lit dashes; hull and towers sparse | raise night occupancy share to ≈ 55–65% of glass cells on megastructures/civic/curtain walls (keep hash so it isn't a wash), warm `#ffc27a`, intensity so it reads like the target at 1600×900 |
| Seams | thin crisp cool white seams on ring edges, arch edges, civic frame verticals | ring/arch seams OK; civic frame has none | add `megaSeam` vertical lines on the civic frame's 4 corner columns + top beam edges (emissive only, can be thin boxes merged into existing batches) |
| Sky Ring | white/cool dotted lights + cool under-lamps (round lamp discs under the truss) | yellow dotted lights, orange band on the elevator disc | Sky Ring lamp colour → `#e6f2ff`; elevator station orange/amber bands → cool white-blue; under-truss lamp discs cool glow |
| Floater | bright double rings, emitter glow — | already good | keep |
| Streaks | none in the sky | many cyan streaks (P6 should have cut them — verify) | only if P6 left them |
| Plaza / ground | pale plaza, cool lamp pools, lit walkway edges | dark plaza | street/plaza lamp glow (existing lamp/light systems) cooler and a bit stronger; plaza paving slightly emissive-lit by lamp pools (decal/emissive disc under each lamp is fine) |
| Water | dark navy with reflections | blue with sparkle — OK | keep |

## Rules

- Day (h16) must stay visually unchanged — gate every change on the night factor; capture h16 too and compare with the integration tip.
- Hero ≥ 60 FPS at h21; no new lights casting shadows; prefer emissive/material terms.
- Tests: update night-term asserts that pin old values (list them).

## Captures

`artifacts/city-taste-v2/P7/rN/`: `hero-h21.png`, `hero-h16.png` (regression check), `hero-h19.png` (dusk), `vs-target.jpg` (integration-tip h21 | rN h21 | `master-night.png` scaled), `close-ring-night.png`, `close-plaza-night.png`. FPS day/night. `npm test && npm run build && git diff --check` (read the `fail` count); commit, push `feat/city-taste-v2-p7`, stop servers, report (commit + FPS first).
