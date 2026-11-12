# SE 塔＋pod — district close-up polish

- Owner: cc100053（視覺驗收）；Codex 統籌，Terra 實作。
- Status: IN_PROGRESS — baseline and target candidates ready for owner selection
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

The first alternate east camera `[420,66,80]` and first alternate south camera `[70,110,495]` encountered foreground supports. The chosen south position was sampled against the twelve authored pylon axes before its browser check. Camera candidates are DEV overrides and haven't been wired into SHOTS.

## Actual validation results

- Verification status: PARTIAL, baseline only. Terra captured original day/night pairs at 1600×900 for both stages using the DEV Meter harness and tested the alternate poses in daylight.
- Development Mac, headed Chrome, hero `se:high`, 1920×1080 DPR 1, warm samples only: day 45.6–47.8 FPS, night 46.5–47.8 FPS. Initial run overlapped screenshot work and was discarded.
- Review evidence: `se-stage/baseline/` and `se-stage/gen/` in the Codex session evidence directory (local). Target candidates use the proposed review poses and are generated concepts.
- Root tests/build: NOT RUN for this documentation checkpoint. Integrated commit and checks: NOT INTEGRATED.

## Next expected step

Owner selects or revises the district target candidates and decides whether to hold the existing asset sizes. [Generation prompts](../../artifacts/se-stage-closeup-polish/prompts.md). Then record the chosen targets, align crops and write the rubric and spec for Terra. Owner visual acceptance follows implementation and scored review.
