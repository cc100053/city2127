# rectenna-farm-placement — Q3 large receiver and terrace farm

- Owner: cc100053
- Status: R1 CANDIDATE. Implemented on the feature branch for owner review.
- Branch: `feat/rectenna-farm-placement` in the main checkout
- Base and last runtime geometry checked: `9d495ebcd21268be7c195eae93c7ee62c47a6424`
- Asset baseline: `cc73fd7` (vegetable LOD); original export `1372230`, both on origin/main.

## Session Git state

- Started on main at the base SHA above. Refreshed origin/main on 2026-11-15; divergence 0/0 before branching.
- Pre-existing untracked `Dev_QA.md` was preserved and Q15 appended locally. Keep that file out of R1 staging unless the owner asks to publish the entire notebook.
- R1 started from `405c23a`; fetch succeeded, 0 ahead / 0 behind the remote task branch and 1 ahead / 0 behind `origin/main`.

## Decisions and target

The owner confirmed the GLB is the target, it follows votes, other states use another building, and it keeps its original size. They approved the Q3 orbital-supply proposal and the land site with “近鏡跟去新址 is fine. go”. The target inventory is [spec.md](../../artifacts/rectenna-farm-placement/spec.md). The source/export and measured bounds are in the [asset handoff](rectenna-building.md).

| Q3 orbital votes | Receiver |
| --- | --- |
| Fewer than 2 votes or less than 20% | No receiver |
| At least 2 votes, 20% to less than 40% | Existing small offshore wing at (125, 0, −424) m |
| At least 2 votes and at least 40% | Rectenna terrace farm at (−117.75, 0, 82.4) m |

Percentages divide orbital votes by all Q3 energy votes plus four. Keep the existing rule in [energy.ts](../../survey/src/shared/energy.ts) and preserve independent energy facilities. Existing small wing and absent states need no new visual target.

Placement starts at unit scale and yaw π about +Y, an axis-aligned orientation intended to turn the GLB ramp side toward the Fuji-side approach (−Z). This is an R1 orientation choice, not an owner decision. Confirm the actual lower ramp landing in the scene before tying in access. Show the terrain-to-ramp connection in close-up. Story: orbital microwave reception on the membrane, conversion and distribution to the district, and an accessible terrace farm underneath.

## Actual validation results

- Node 26, existing lot tool at base SHA. `SCAN_LOT=64.5,64.8` found four centres in one area. `SCAN_LOT=64.5,64.8,-117.75,82.4 node --experimental-strip-types tests/odaiba.test.ts` reported `CLEAR`, approximately 2,820 hero pixels in its ground-visibility metric.
- Probe at the old wing centre failed district boundary and tidal-edge checks.
- Supplemental plan bounds against existing energy parts showed at least 70.8 m of plan clearance at the selected land site. No sampled overlap with the regular air, sphere approach, shore, interchange approach, sweep or guideway curves at 1,500 samples per curve and with 5 m of horizontal padding.
- The lot tool does not verify high geometry above its raycast sample heights, all state-specific overhangs, actual service drone sweeps, the final ramp connection, or renderer performance. Sky Ring deck is at 250 m. Confirm local overlaps with the placed model in R1.
- No application run, asset edits, tests or FPS measurement in the decide session.

## R1 brief

| Item | Acceptance for review |
| --- | --- |
| State and footprint | At existing Q3 thresholds show no receiver, the offshore wing, or the land farm. Keep the farm at unit scale and the surveyed centre. Check both directions across 40% and verify the steady state shows one receiver. |
| Target and access | Retain the single iridescent membrane, Space Gray frame, tower, planted terraces and ramp from the supplied GLB. Show the lower ramp landing and a continuous walkable connection in one 3200 × 1800 detail frame. Verify clearance at full 33.6 m height. |
| Live headline | When a large receiver is the result headline, frame the farm at the new location within existing result timing. A return to small uses the offshore pose. Show the transition at start, midpoint and end. Snapshot, Undo, reset and reconnect restore geometry immediately. |
| Explanation | Align the actual result and ambient card with the displayed location and state. Show the canopy and farm together in the day and night headline frames. |
| Evidence | Capture day, night, overview, access and mechanism keyframes at 3200 × 1800; compare against the GLB target and existing wing baseline. Record headed Chrome FPS and any short rows for the owner. |

Trace the energy runtime, state/activity targeting, headline camera, asset loading and result copy together. Start with [PROJECT](../PROJECT.md), [VALIDATION](../VALIDATION.md), [asset library](../../asset/models/LIBRARY.md) and the [target inventory](../../artifacts/rectenna-farm-placement/spec.md). Use existing loading and energy paths, keep other headline and survey behavior, and run focused energy checks then the required full checks. Follow place-building for capture, commit, push and owner review. Update the change sheet when the accepted work or changed result copy requires it.

## R1 (2026-11-15)

- Runtime loads the supplied GLB at (−117.75, 0, 82.4) m, yaw π and unit scale, and adds a 2.4 m wide paved approach at the north landing. The ramp edge is at y=0.02 m, near (−124.86, 0.02, 59.46) m in world coordinates. R1 uses a north camera from (−115, 36, −3) m to show the canopy and planted terraces in one frame.
- The offshore wing is fixed at its existing small size. An existing 3 s local fade on each receiver handles both directions. Only one receiver is visible after settling. The receiver relocation takes the energy headline when the other energy equipment only changes its service activity. Result and ambient copy use the actual site, and the farm's narration follows reception, conversion and distribution. The owner change sheet was regenerated.
- Root and survey `npm test` and `npm run build` passed on the R1 working tree. `git diff --check` passed. The focused tests cover exact 20%/40% boundaries, both fade directions and the receiver camera when the other energy equipment changes service activity.
- Live scratch SQLite, loopback survey and Chrome show the third orbital vote opening the farm, then a water-storage vote diluting the orbital share and returning to the small wing. Both results showed the correct location and effect. Undo, WebSocket reconnect and reload restored the farm, and the staff city reset cleared both receivers. Zero page errors in the scratch browser run.
- Bounds of the original asset in the rendered city are X −149.99…−85.51, Y −0.23…33.60, Z 50.02…114.78 m. Exact mesh intersections confirmed that the adjacent `megastructures` batch intersects the rim, supports and some hex panels. The original lot probe missed that geometry. **Short row: clearance.** Kept the approved centre and original asset for review. The overhead frame shows the intersection and the approach meeting the existing path. One canopy column foot touches the edge of the new paving, with walking space alongside. The existing offshore camera includes a foreground pylon that obscures part of the small wing. Service drone sweeps and exhibition hardware remain unverified.
- Headed Chrome on the development Mac, hero with the large receiver active, default quality at 1920 × 1080/DPR 1. After dropping the first sample at each hour as specified by `fps.sh`, day 39.4–40.1 FPS and night 39.5–39.8 FPS. See `fps.txt` for raw samples.
- Evidence lives outside Git under `~/city2127-evidence/rectenna-farm-placement/r1/`. Day, night, overview, access, overhead, wing baseline and switch frames use Chrome at 3200 × 1800. The two switch rows use the destination camera at 5.12, 6.62 and 8.12 s. Canvas diagnostics show receiver opacities 1/0 → .5/.5 → 0/1 in both directions. `target-comparison.jpg` compares with the isolated supplied GLB and the offshore wing. The live result frames use 1600 × 900.

## Next expected step

Owner reviews the R1 images and the intersection shown in the plan view. Visual acceptance is required before merge.
