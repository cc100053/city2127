# rectenna-farm-placement — Q3 large receiver and terrace farm

- Owner: cc100053
- Status: PLANNED. Site and state approved, R1 ready.
- Branch: `feat/rectenna-farm-placement` in the main checkout
- Base and last runtime geometry checked: `9d495ebcd21268be7c195eae93c7ee62c47a6424`
- Asset baseline: `cc73fd7` (vegetable LOD); original export `1372230`, both on origin/main.

## Session Git state

- Started on main at the base SHA above. Refreshed origin/main on 2026-11-15; divergence 0/0 before branching.
- Pre-existing untracked `Dev_QA.md` was preserved and Q15 appended locally. Keep that file out of R1 staging unless the owner asks to publish the entire notebook.
- Runtime integration has not started.

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

## Next expected step

Owner starts R1 in a fresh session on this branch in `/Users/fatboy/city2127`. Owner visual acceptance is required before merge.
