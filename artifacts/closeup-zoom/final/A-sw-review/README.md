# SW plaza — three trials, F design retained

2026-10-30 self-review: **FAIL**. R1 added counters and gathering figures under the existing canopy; R2 lowered the camera; R3 added more distinct figures near the entrance. The activity remains too small or obscured to read, the existing COMMONS sign is still clipped, and neighbouring tiers are not consistently identifiable within two seconds. The candidate did not meet the requested appearance, so its code and camera changes were removed and the F checkpoint design retained. [R3 patch](r3.patch.gz) and all original images are preserved for review.

- [Day tier comparison](tiers-12.jpg), [night tier comparison](tiers-22.jpg), [hero before/R3](hero.jpg).
- The sibling `A-sw-before`, `A-sw-r1`, `A-sw-r2`, `A-sw-r3` folders contain original hero, focal and district captures at −2/0/+2, 12:00/22:00, with browser and viewport metadata.
- Stable samples after two 120-frame updates: baseline hero day 60 FPS / 950 total calls and focal 60.1 / 676; hero night 60.1 / 950 and focal 60 / 676. R3 hero day 60.1 / 952 and focal 59.9 / 736; hero night 60 / 952 and focal 60 / 736. Total focal calls rose 8.9% with the different lower camera, but per-site draw calls were not isolated, so the ≤10% site gate is unverified. Records: `A-sw-perf-before` and `A-sw-perf-r3`.
- Single samples on current ARM64 macOS host, headless Chrome 156.0.8078.74, 1600×900 DPR1. They do not establish exhibition-hardware performance or real guest recognition. Owner acceptance remains outstanding.
