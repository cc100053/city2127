# rectenna-farm-placement — Q3 large receiver and terrace farm

- Owner: cc100053
- Status: Owner approved R3 integration on 2026-11-15.
- Branch: `feat/rectenna-farm-placement` in the main checkout
- Branch base: `9d495ebcd21268be7c195eae93c7ee62c47a6424`
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

## R1 verdict and relocation study (2026-11-15)

> 重新選址，應該放喺都市外圍，先比較符合菜園呢一個感覺

- Study base `e263eb1` on `feat/rectenna-farm-placement`. Remote refresh succeeded, 0 ahead / 0 behind the remote branch and 2 ahead / 0 behind `origin/main` at study start.
- Proposed centre **(X −152, Z 364) m**, on the grass beyond the south edge of the detailed district. The centre is 44 m beyond its Z=320 boundary. The original 64.5 × 64.8 m farm remains on grass in the foreground, with the city behind. The original hero ground-visibility metric yields 40 px. Use a dedicated result shot.
- The browser preview used origin Y=−0.15 m provisionally and yaw 3.3643 rad to face the nearest sampled paving. The trial camera was (−112, 39, 458), looking at (−152, 14, 364) m. The path sample at (−174.5, −0.19, 325.03) m is about 21 m from the lower ramp edge in plan. The grade under the sampled footprint spans −0.35 to +0.47 m. Final pilotis and ramp grounding, path alignment and night framing are R2 work.
- Point probe `CLEAR` at (−152, 364) for 64.5 × 64.8 m. The temporary probe extended the search boundary beyond the detailed district and added obstruction samples at 28 and 34 m. The real rendered scene also cleared the 66 × 66 m envelope up to 34 m in non-ground mesh and visible instance checks. No route samples entered the padded footprint below 39 m on the shared curves (1,500 samples per curve). Dynamic service sweeps and all state-specific meshes still need checking in R2.
- The western waterfront trials put backdrop grove crowns and plinths inside the farm. The first southern and eastern trials sat across broad existing paving. The south grass site passed 21/21 grass samples with no visible instance contacts and offers a continuous green foreground.
- Trial stills at 1600 × 900 are outside Git in `~/city2127-evidence/rectenna-farm-placement/reselection/`. `south-green.jpg` shows the proposed site with the original GLB. `south-green.json` records the provisional pose, contacts and paving sample. This study changes the handoff only. No full build, live transition or FPS run for this location.

## R2 — south-edge placement (2026-11-15)

- Owner accepted the 2× scale and the south-edge area, asked to give the farm clearance, and chose “保留南緣，挪開相交樹叢”. R2 starts from `943a0c2`, aligned with the task branch on origin and 3 ahead of `origin/main` at fetch.
- The 2× building is about 129 × 130 m and 67.2 m tall. Move it 44 m further south to (−152, −0.15, 408) m. The GLB turns 4.4115 rad to face its lower ramp west. The approach joins the existing footway with a 14.5 × 4.8 m connector across the intervening lawn. The result camera looks from (−108, 68, 586) at (−152, 26, 408) m, and the Japanese result names the south side of Odaiba.
- Move five backdrop groves to nearby grass, each carrying its own crowns, raised rim and bed. Their world-plan destinations are (−287, 516), (−110, 333), (−119, 486), (−206, 510) and (−71, 438) m. The grove meshes are still instanced.
- R2 evidence is under `~/city2127-evidence/rectenna-farm-placement/r2/`. The live scratch survey shows the correct camera and state both ways, plus Undo, reconnect, reload and reset with zero page errors. The focused scene probe in `mesh-clearance.json` confirms the GLB world scale (2, 2, 2), all five grove destinations, zero static mesh/crown intersections and zero grove plinth bounds inside the farm radius. Shared routes sampled at 1,500 points each stay outside the padded 69 m radius below 73 m. The west paving tie-in and ramp landing were sampled for height; the approach overlaps the ramp edge. Root tests, build and diff check passed. Independent dynamic service sweeps and exhibition hardware remain unverified.

- Headed Chrome, development Mac, 1920 × 1080, DPR 1 and default quality. Hero with the 2× farm active, discarding the first sample each hour: day 40.1–40.9 FPS and night 40.2–40.7 FPS. Raw samples are in `fps.txt`.

## R3 — public garden entrance (2026-11-15)

- Starting commit `67e961b`. Fetch succeeded: the local branch matched its remote (0/0) and was four commits ahead of `origin/main` (0 behind). The pre-existing untracked `Dev_QA.md` stays untouched.
- Owner feedback relayed for R3: surrounding roads and buildings did not fit the farm, and the lawn read as one uniform surface. Build the public garden around the west entrance while keeping the 2× shell at (−152, −0.15, 408) m, the Q3 logic and the railway.
- The existing through walk stays open. Taper the east edge of the old sidewalk and obsolete secondary surfacing over the farm frontage. Remove one legacy context block at X −211.68…−203.02, Z 384.01…394.94 m from the live entrance footprint, leaving the survey GLB intact. The local garden fades with the large receiver; the narrowed through walk remains in every configuration.
- Walk sequence: through walk near (−234, 405) → gravel branch roughly 5 m wide → forecourt flaring north → lower ramp at (−200, 408). The north flank has three 2.6 m wide beds, bare soil, a wet irrigation edge and three fruit trees. The south flank has low grasses and stays open from the access and focal views. Reuses the scene's box and planting helpers; no GLB changes.

- Chrome scene check (`clearance.json`): 8 mm difference at the sidewalk tie-in and under 1 mm between the forecourt and ramp at (−200, 408) m. Pavement probes are clear at the four west-side column feet and present at through-walk samples before, beside and after the entrance. Geometry checks found no contacts between the added garden meshes and tested context, column or grove meshes. The closest rail centreline sample was 11.67 m from the garden bounds (1,500 samples per route); no track geometry changed.
- Root `npm test`, `npm run build` and `git diff --check` passed for R3. The scratch survey and Chrome confirmed live switching in both directions, garden opacity 1/0 at the settled result, Undo, reconnect, reload and reset, with no page errors. The focused root test checks the apron cut, walk connection and midpoint garden opacity in both directions.
- Review evidence outside Git: `~/city2127-evidence/rectenna-farm-placement/r3/`. The 3200 × 1800 frames include the west entrance, plan, overview and day/night headline views, with no page errors. Companion images compare the same R2/R3 access pose and show both Q3 fades at 5.12, 6.62 and 8.12 s (garden opacity 0/.5/1 and 1/.5/0). The entrance is easiest to read in the ground-level and plan shots; the headline still frames the full receiver. Dynamic service sweeps and exhibition hardware remain unverified.

- Headed Chrome on the development Mac, default hero at 1920 × 1080/DPR 1. In one same-session daylight comparison (three 3 s rAF windows), R2 measured 38.8–39.0 FPS and R3 measured 38.3–38.7 FPS. The separate R3 `fps.sh` run varied more: day 34.9–37.3 FPS after the first sample, night 37.6–39.0 over the last four samples (first parse invalid and one early 46.9 reading). See `fps-ab-day.jsonl` and `fps.txt`.

## Integration (2026-11-15)

Owner instructed “merge main” on 2026-11-15. The merge commit is `210e31a`, integrating R3 `28666e5` onto the verified `origin/main` base `9d495eb` without conflicts. The owner change sheet was regenerated.

Root and survey tests and builds passed on the integrated code. The integrated browser smoke check exercised both Q3 receiver changes, Undo, reconnect, reload and reset with no page errors.
