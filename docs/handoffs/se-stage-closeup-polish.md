# SE 塔＋pod — district close-up polish

- Owner: cc100053（視覺驗收）；Codex 統籌，Terra 實作。
- Status: IN_PROGRESS — owner selected targets, Terra building R1
- Branch: `feat/se-stage-closeup-polish`
- Base commit: `056ce514a99587798756bcfcf2a74463e7b81cf5`
- Last verified commit: NONE
- Remote availability: `origin/feat/se-stage-closeup-polish`

## Session Git state

- 2026-11-12 由 `main` `056ce514a99587798756bcfcf2a74463e7b81cf5` 開始；fetch 成功，`main...origin/main` 為 0/0。
- 原 checkout 有修改中文件、Blender skills 同截圖。任務喺由該 commit 建立嘅獨立 clone 做。
- Integration: NOT INTEGRATED。

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
- Root `npm test`, `npm run build` and `git diff --check` passed for Terra. Real GLB checks cover bounds, roles, transparency and late swap at settled and in-flight matrices. Headless Chrome, 3200×1800, day/night six shots, 0 page errors. Real exhibition survey and complete fly-in/return samples remain open.
- Headed Chrome hero `se:high`, 1920×1080 DPR 1, first sample removed: day 45.2–48.0 FPS, night 47.2–48.5 FPS. Baseline ranges overlap. Exhibition hardware NOT RUN.
- Three blind judges scored 12 / 12 / 13 day and night. Per-item median **12/30** both. [Scored crops](../../artifacts/se-stage-closeup-polish/r1/vs-target.jpg). Passed: distribution and edging of the three pods, and the open frame with three warm volumes. Below target: pod glazing, two-tier rooms, entries and furnishings; stepped tower rooms, lift, services and wayfinding; south twins, twist, lift, life and materials.
- Next: apply the [R2 spec](../../artifacts/se-stage-closeup-polish/spec-r2.md) in Terra, preserve R1 passes and rescore. Visual acceptance and main integration pending.
