# SE 塔＋pod — district close-up polish

- Owner: cc100053（視覺驗收）；Codex 統籌，Terra 實作。
- Status: DONE for this task — owner said 「merge」 on 2026-11-13 after the twin-cylinder polish. Integrated into main (see Twin cylinders). Further SE rounds are separate tasks.
- Branch: `feat/se-stage-closeup-polish`
- Base commit: `056ce514a99587798756bcfcf2a74463e7b81cf5`
- Last verified commit: `9848a71` (R3 runtime and asset)
- Remote availability: `origin/feat/se-stage-closeup-polish`

## Session Git state

- 2026-11-12 由 `main` `056ce514a99587798756bcfcf2a74463e7b81cf5` 開始；fetch 成功，`main...origin/main` 為 0/0。
- 原 checkout 有修改中文件、Blender skills 同截圖。任務喺由該 commit 建立嘅獨立 clone 做。
- Integration: NOT INTEGRATED。
- 2026-11-13 從遠端 `0d61cd0` 重建任務副本。上次暫存副本及未提交 R3 檔案已消失，原有日間試拍保留。Fetch 後 `origin/main` 仍為 `056ce51`，base 無落後。Terra 按原 R3 修改重建，並先提交及推送檢查點 `7aa6edf`。

## Goal and acceptance criteria

[兩級打磨計劃](../RESIDENT_SCENE_PLAN.md)嘅 SE 塔＋pod 第一級。住民揀水邊分散、低高混合或集中塔生活後，近鏡應喺兩秒內讀到改變嘅位置、用途同方向。用相同鏡位比較每組實際轉變嘅前、中、後，日夜都要讀到。視覺由 owner 接受。

## In-scope files and dependencies

- `se:stage-east` 同 `se:stage-south` 嘅構圖，以及 [ConcentrationDistrict](../../src/districtMeters.ts) 嘅塔、pod 同共用轉場接點。
- 依照 [舞台交接](guest-agency.md)同[起樓／拆樓交接](build-transition.md)檢查 coverage、淨空、3 秒時段及即時路徑。Focal、resident scene、問卷同梯級分配屬獨立範圍。
- [已接受嘅 SE focal 樣板](archive/se-closeup-polish.md)同 [Blender 塔](se-high-blender.md)提供美術語言。舊 focal 目標圖係另一個地塊同鏡位。

## Diagnosis

| Stage | Baseline | Cause | Candidate review pose |
| --- | --- | --- | --- |
| East, seed 0, rung −2 → −1 | Pods 6, 7, 8 disappear and tower 2 appears. Original shot clips both tower tops. | Original aim at 5 m points down to the pod group. The three roofs and white walls have low contrast with the foreground in daylight. | `[400,68,20] → [220,54,20]`. All three changing pods and the stepped tower fit in the reviewed transition. The far left support still enters the frame. |
| South, seed 0, rung +1 → +2 | Tower 3 rises. The original shot hides part of its taller shaft behind a support and cuts the near twisted mid-rise at the bottom. | The high, downward west-side sightline intersects the Sky Ring pylon. | `[-180,70,375] → [80,56,283]`. Both sites are in frame in the reviewed transition and the twin shaft reads against the sky. |

The first alternate east camera `[420,66,80]` and first alternate south camera `[70,110,495]` encountered foreground supports. The chosen south position was sampled against the twelve authored pylon axes before its browser check. Camera candidates are DEV overrides and have not been wired into SHOTS. South also fits both towers at +3. The foreground focal tower partly masks east tower 2 at +3 in the first candidate. The production east pose `[440,65,-25] → [217,48,15]` shows both edge pods in the seed 0 +1 → +2 comparison and the seed 3 +2 → +3 changes to pods 8–10 and tower 2. Pod 10 is still partly cropped at the left edge. Some of tower 2 remains behind the right-hand context block in high state.

## Actual validation results

- Verification status: PARTIAL, baseline only. Terra captured original day/night pairs at 1600×900 for both stages using the DEV Meter harness and tested the alternate poses in daylight.
- Development Mac, headed Chrome, hero `se:high`, 1920×1080 DPR 1, warm samples only: day 45.6–47.8 FPS, night 46.5–47.8 FPS. Initial run overlapped screenshot work and was discarded.
- Review evidence: `se-stage/baseline/`, `se-stage/baseline-east-final/` and `se-stage/gen/` in the Codex session evidence directory (local). The chosen east camera was verified with the unchanged main geometry, including both seeded pairs. Target images are generated concepts and use aligned capture boxes for the final east pose.
- Root tests/build: NOT RUN for this documentation checkpoint. Integrated commit and checks: NOT INTEGRATED.

## Next expected step

Owner selected all three targets on 2026-11-12 and confirmed that the current asset dimensions govern. Reviewed all 15 baseline crop pairs. [Rubric](../../artifacts/se-stage-closeup-polish/rubric.md) · [R1 spec](../../artifacts/se-stage-closeup-polish/spec.md). Terra builds R1, including the seeded camera checks. Owner visual acceptance follows implementation and scored review.

## R1 — 2026-11-12

Terra built and integrated six Blender variants under `asset/models/se-district-2127/`, with a procedural fallback, instanced batches and current-state transforms applied on load. Final cameras are east `[440,65,-25] → [217,48,15]` and south `[-180,70,375] → [80,56,283]`.

- GLB `c53aa55c6f6ef0ad3b4fea718fcbecd449e1cc4c8e7c90057938edc53cb1e7b3`, 1,767 KB approximate. Blender game QA six PASS, 0 errors. Separate import into empty Blender 5.2.2 confirmed all six variants. UV overlap applies to untextured projection UVs. Remaining warnings include planar n-gons, interior back-to-back surfaces and enclosed foundation/rim parts. Full all-variant wire review remains open.
- Root `npm test`, `npm run build` and `git diff --check` passed independently and for Terra. Real GLB checks cover bounds, roles, transparency and late swap at settled and in-flight matrices. Headless Chrome, 3200×1800, day/night six shots, 0 page errors. Independent DEV browser instrumentation on `d80eb33` sampled five seeded district transitions, verified both stage selections, active builds at 6.5 s, settlement by 8.35 s and hero by 15.1 s, with 0 page errors. Straight flight showed a nearby facade during both approaches at 3.8 s. An isolated SE-only altitude-arc prototype cleared that point in both approaches. Real exhibition survey remains open.
- Headed Chrome hero `se:high`, 1920×1080 DPR 1, first sample removed: day 45.2–48.0 FPS, night 47.2–48.5 FPS. Baseline ranges overlap. Exhibition hardware NOT RUN.
- Three blind judges scored 12 / 12 / 13 day and night. Per-item median **12/30** both. [Scored crops](../../artifacts/se-stage-closeup-polish/r1/vs-target.jpg). Passed: distribution and edging of the three pods, and the open frame with three warm volumes. Below target: pod glazing, two-tier rooms, entries and furnishings; stepped tower rooms, lift, services and wayfinding; south twins, twist, lift, life and materials.
- Next: apply the [R2 spec](../../artifacts/se-stage-closeup-polish/spec-r2.md) in Terra, preserve R1 passes and rescore. Visual acceptance and main integration pending.

## R2 — 2026-11-12

Terra changed the opaque blocks into recessed service-room backs, added separate floor bands, figures, tables, doors, thresholds, planted decks and visible lift guides. The two SE camera paths now rise over the foreground during travel, with 140 m east and 100 m south midpoint offsets. Stop poses and timing stay at the R1 values.

- GLB SHA256 `8da47d36b780f9b00ae4b0779926f214e66c269803fd6ca13bc1fe6661a8e67e`, 2,136,028 bytes, 35,792 triangles. Blender QA all six PASS, zero errors. Separate Blender reimport verified six variant roots, 36 meshes, six material roles. Multi-angle random/wire checked by Terra. Retained warnings: untextured overlapping UVs, planar n-gons, hidden back-to-back faces and enclosed components.
- Root `npm test`, `npm run build`, `git diff --check` passed for Terra and independently. The camera test asserts both arc midpoints and unchanged endpoints. An independent 1600×900 DEV browser run repeated the five R1 transitions with the authored arc and checked stage, live builds, settlement and hero return. The travel clears the nearby facade at the sampled 3.8 s point. Headless Chrome 3200×1800, three day/night pairs, 0 page errors. Headed hero `se:high` 1920×1080 DPR 1, warm samples: day 45.6–47.1 FPS, night 46.2–48.3 FPS.
- Median against target **16/30 day and night** (day totals 16/16/16, night 16/17/16). Pairwise R2 vs R1: 11 wins, 3 losses, 1 tie both. [Scored crops](../../artifacts/se-stage-closeup-polish/r2/vs-target.jpg). Only pod separation/trim reaches 2. R1 wins ring warmth, twist and south material, which share changed rooms with the R2 wins for entries, furniture and south interior life. Keep R2 as a whole, then recover the warmth in R3 with the furnished geometry intact.
- Next: [R3 spec](../../artifacts/se-stage-closeup-polish/spec-r3.md). Owner visual acceptance and main integration pending.

## R3 — 2026-11-13

Terra restored room warmth, made props and occupants darker, added seated figures and shelving, and refined the lift cabins and foreground entry. The late swap now disposes the outgoing instancing buffers and owned geometry. Source, Blender and GLB are saved on the feature branch. A coplanar trim found in the restored checkpoint was corrected in `9848a71`.

- GLB SHA256 `bb585811c14bff80b9a91a21a4f53abcfbba26c395c9d0db964a60c0cff56bd5`, 2,608,868 bytes, 43,796 triangles. Six variants passed Blender game QA with zero errors. Separate Blender import verified 42 meshes and seven material roles. Remaining warnings concern untextured UVs, planar n-gons, hidden back-to-back surfaces and enclosed pieces. Multi-angle material and wire captures are in `r3/asset-qa`.
- Root `npm test`, `npm run build` and `git diff --check` passed. Chrome served the real GLB and captured six stills at 3200×1800, 0 page errors. An independent DEV browser run checked six district transitions at 1600×900 and 48 sampled times, including the seeded east high change and both south travel directions, 0 page errors. The seed-zero +1→+2 change chooses the east stage under existing coverage because the two east pod changes outnumber the one south tower change.
- Headed Chrome hero `se:high`, 1920×1080 DPR 1, first sample removed: day **46.0–48.7 FPS**, night **47.4–49.3 FPS**. Baseline ranges overlap. Exhibition hardware and an actual guest session remain unverified.
- Three blind judges scored day 20/20/20 and night 18/19/19. The median is **20/30 day, 19/30 night**. R3 vs R2: 14 wins, zero losses and one tie in both lighting conditions. Kept R3 in full. [Scored crops](../../artifacts/se-stage-closeup-polish/r3/vs-target.jpg).
- Day and night below 2: `ep-ring` (glazing and room warmth), `ep-services` (use and occupants), `et-setbacks` (room/terrace contrast), `et-lift` (glazed shaft and cabin definition), `et-services` (distinct room functions), `et-wayfinding` (podium entrance), `st-twins` (glazed crossings), `st-twist` (entrance and floors), `st-life` (furniture and occupants), `st-material` (warmth and amber). Night additionally misses `ep-entry` because the figure blends into the threshold. The shared twist mid-rise transform compresses residents and the lift cabin to 45% height along with the building.
- The [close-up skill](../../.agents/skills/closeup-polish/SKILL.md) ends the three-round cycle here when the scores are below full marks. Owner can accept this candidate or name another round. Main integration is pending that visual decision.

## Library adoption — 2026-11-13

On owner instruction, main (`fccd94b`, asset library) was merged into this branch. `build_district.py` now calls `asset/models/city-kit-2127/modules.py` (`glass_room`, `glass_lift`, `ring_doorways`, `furnish`, `Rect`/`Ring`, residents) in place of its inline closures; only `podium` stays local. The `package.json` test-list conflict was resolved by keeping `seDistrictGlb` and `assetLibrary`. `se-district-2127` has a row in `asset/models/LIBRARY.md`, and the two committed `__pycache__/*.pyc` files are untracked.

- Rebuilt GLB SHA256 `cb433a32f232d4ed534328fbdc2fd4ff4abea8720ae13865d2492925fbc351e3`, byte-identical to R5. The R5 `.blend` is kept, because the geometry is identical and only file metadata would differ.
- Root `npm test` (including `assetLibrary` and `seDistrictGlb`), `npm run build` and `git diff --check` PASS. No browser capture was needed, since the GLB is unchanged.
- Next: polished library modules will change this GLB when `build_district.py` is re-run. Re-capture and judge after that.

## Module polish 1 — 2026-11-13

Library modules were polished against this task's targets (asset-library handoff). Here, `build_district.py` takes its `district_*` materials from `modules.ROLES` (same names and order), and the twist floors furnish 6 vignettes and 4 residents instead of 3 and 2.

- GLB SHA256 `0d3f339e6f7b17ed8321b227b15d5670c3f333376cf322cc53268f771884d4a1`, 10880556 bytes, 172,252 triangles (R5: 102,596). The `seDistrictGlb` budget was raised from 110k to 180k, with the FPS evidence below.
- Same-URL captures before and after (`?meters=se:-5|5` with `shot=se:stage-east`, and `se:8` with `shot=se:stage-south`, at hour 12 and 22, 1920×1080 headless Chrome, 0 page errors). Published crops: [south day](../../artifacts/se-stage-closeup-polish/module-polish/cmp-south-towers-day-r0-r3.jpg), [south night](../../artifacts/se-stage-closeup-polish/module-polish/cmp-south-towers-night-r0-r3.jpg), [pods day](../../artifacts/se-stage-closeup-polish/module-polish/cmp-east-pods-day-r0-r3.jpg), [pods night](../../artifacts/se-stage-closeup-polish/module-polish/cmp-east-pods-night-r0-r3.jpg). Raw rounds r0–r3 are in `~/city2127-evidence/module-polish/`.
- Read (Opus, not judged blind): the south twist reads clearly better at night, with warm gold floors and visible furniture and residents on every floor. By day it has more residents and clearer glass, but floors still read pale against the target's warm lit interiors. The pods are nearly unchanged at this distance, because their doorways face ±x, away from the east camera.
- Headed Chrome hero `se:high` 1920×1080 DPR 1, first sample dropped, same machine and session: day 48.2–48.7 FPS, night 47.1–48.5 FPS. With the R5 GLB swapped in: day 47.6–49.1, night 46.9–48.2. The ranges overlap.
- Root `npm test`, `npm run build`, `git diff --check` and `check-artifacts.sh` PASS.
- Open: owner visual acceptance. Blind judging was not run this round. Twist day warmth remains a gap. The east stage still shows the focal SE +1 tower, which does not use modules.

## Twin cylinders — 2026-11-13

On owner instruction, the two cylinder towers behind the twist tower (`twin` variant) were polished. They had read as one solid orange cylinder (`disc(r, …, 3.2)`) with sparse furniture and floors every 8 m.

- `build_district.py` `twin`: the orange core is now a slim white service core (r 1.6). Full-plate glass floors every 7 m, 16 thin glass mullions per floor, and per floor `furnish(Ring(x,0,2.4,7.4), …, 5.0, 6, 4)` (6 vignettes, 4 residents). Three green blobs on each roof. A tint trial with a pale orange core (r 2.4) read as an orange pillar again and was reverted.
- GLB SHA256 `ee9ea5eb86128ed0c33e2c7089c86bb32439965e97a050d99908583ba990d448`, 222,724 triangles (was 172,252). `seDistrictGlb` budget raised 180k → 240k.
- Captures at 1920×1080 (`?meters=se:8`, `shot=se:stage-south`, hour 12 and 22) in `~/city2127-evidence/se-twin/r1..r3` (local). Owner judged visually and accepted the merge.
- Root `npm test`, `npm run build`, `git diff --check` PASS. FPS, the east stage and blind judging were NOT re-run for this change.
- Known gap: day interiors still read pale against the target's warm lit rooms; no warm back wall; no amber lift capsule on the twins.
