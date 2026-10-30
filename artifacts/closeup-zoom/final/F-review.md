# F candidate review — 2026-10-30

Status: **FAIL / incomplete**. These are self-review observations, not owner acceptance. All captures use 1600×900 DPR1 headless Chrome and reduced-motion snapshots for settled tiers. The screenshot runner and raw `frames.json` retain the exact pose, bounds and ray diagnostics; rays are diagnostics only. Screenshots are not a substitute for live hold and human recognition.

| Shot | Tier | Focal bbox width × height | Centre | Result |
| --- | --- | --- | --- | --- |
| NE focal | −2/0/+2 | 35.8% × 52.3% | .491/.524 | Numeric pass; art still pending |
| SW focal | −2/0/+2 | 51.1% × 58.2–60.3% | .523/.548–.558 | Numeric pass; left tower remains at frame edge |
| SE focal | −2 / 0 / +2 | 13.0×48.8% / 11.8×29.7% / 13.9×62.8% | .500/.541 / .500/.632 / .500/.467 | FAIL width all tiers and height at 0 |
| NW focal | −2 / 0 / +2 | 10.7×25.3% / 10.7×25.3% / 11.9×58.1% | .500/.624 / .500/.624 / .500/.460 | FAIL width all tiers and height −2/0 |
| NE/SW/SE/NW district | 0 | focal height 33.5 / 42.5 / 36.9 / 34.3% | middle third | Numeric pass at 0; carrier legibility still FAIL |

SE first close trial cropped the +2 tier (145.7% high); NW first close trial cropped +2 (123.0%). Both are retained in `F-trial-se/` and `F-trial-nw/`; the conservative poses keep the taller state inside frame but do not reach the requested focal size. The first SW district candidate put the camera inside a building (`F-candidate-rest/sw-district-0.jpg`); the second candidate was entirely blocked by Fuji (`F-district-sw-second/`). The current pose is the less obstructed first correction (`F-district-tiers/`), but its three tiers do not show a legible district carrier, so it is not accepted.

Raw focal and district captures: `F-candidate/`, `F-candidate-rest/`, `F-district-tiers/` and `F-district-nw/`. District −2/0/+2 screen images were inspected in a comparison sheet: differences in SW and NW carriers are difficult to identify; they do not satisfy the stated readability gate. Four district poses are 172–242 m from target; no focal subject crosses the near plane in tested cases. Energy models are absent in `?shot=` snapshots: five static energy images are **not** evidence of model framing; live energy garden and remaining required scenarios still need checks. Measured diagnostic FPS for selected focal captures was 4.4–7.4 FPS on this shared macOS/Chrome session under competing workload, not exhibition hardware; do not infer a performance acceptance from it.

The 7% hold push has a unit assertion that fly-out starts without a jump. Real live hold, interruption tests, complete image comparison, marker adjustment, final art and owner acceptance remain outstanding.
