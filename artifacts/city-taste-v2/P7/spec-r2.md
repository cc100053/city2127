# P7 — spec r2 (coordinator review of r1 6c4d43c, 2026-11-03)

r1 is a big step: teal cast gone, ring densely lit, elevator and Sky Ring cool white, civic frame seams. Keep all of it. Fix:

1. **Amber, not cream.** Windows clip to cream under tonemapping. Use a more saturated, lower-energy amber for every night window term (megastructures, curtain walls, retained glazing, civic): colour ≈ `vec3(1., .58, .24)` at ≈ 0.7× the r1 intensity, so ACES keeps the hue; check the ring and civic frame at 1600×900 read amber like `master-night.png`. Day unchanged.
2. **Plaza and ground at night.** The plaza deck and central ground read dark green-grey; target is pale with cool lamp pools. Add soft lamp pools: an additive, depthWrite-off disc decal (radial gradient, `#dfeeff`, Ø 14–20 m, opacity ≈ .35·night) under each existing plaza/walkway lamp or on a 30 m grid over the plaza deck and walkways (instanced, 1 draw), plus raise the plaza paving's night emissive slightly (`#2a3340` × night). No shadow-casting lights.
3. **Night FPS evidence.** Sample `data-fps` properly: wait ≥ 2.5 s between reads (it updates once per 120 frames), discard the first, record ≥ 5 values day and night, report the list.

Captures to `P7/r2/`: `hero-h21.png`, `hero-h16.png`, `vs-target.jpg` (r1 h21 | r2 h21 | master-night), `close-plaza-night.png`. Checks, commit, push `feat/city-taste-v2-p7`, stop servers, report (commit + FPS lists first).
