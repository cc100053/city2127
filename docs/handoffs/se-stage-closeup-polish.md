# SE 塔＋pod — district close-up polish

- Owner: cc100053（視覺驗收）；Codex 統籌，Terra 實作。
- Status: PLANNED
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

## Actual validation results

- Verification status: NOT RUN。
- Integrated commit and checks: NOT INTEGRATED。

## Next expected step

Terra 量度 baseline 並拍兩個 stage 嘅實際轉變。用 baseline 提供 district 目標圖畀 owner 揀，之後寫 rubric 同實作規格。
