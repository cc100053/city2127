# meter-ladder — 分級階梯＋headline（每份提案最多一格）

- Owner: cc100053（產品決策）；實作 Claude（side session）
- Status: IN_PROGRESS（實作／驗證完成並 push；等 owner 批准先 merge main）
- Branch: `feat/meter-ladder`
- Base commit: `047cb2c62c5224e1628a418659685d489695a3b9`
- Last verified commit: `df730c0dae6f2d703721a4add8a1bbf515288534`（code 同驗證過嘅 working tree 一樣；之後只改咗呢份 handoff）
- Remote availability: `origin/feat/meter-ladder` @ `df730c0` 再加呢個 handoff commit

## Session Git state

- Session starting branch and HEAD: `claude/meter-ladder-114216` @ `047cb2c62c5224e1628a418659685d489695a3b9`（乾淨）
- Last fetched origin/main commit: `047cb2c62c5224e1628a418659685d489695a3b9`（2026-10-27 fetch）
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

2026-10-27 模擬顯示一份提案常常同時翻幾個 band，而每次翻轉會改晒成個 district，user 覺得浪費。目標係將每條 Meter 拆成有次序嘅格，每份提案最多推一格，再揀一個 headline 變化去展示。以下各項都已完成：
- user 批准格表：±3 格、門檻 |D| 1.5/4/7、遲滯 2、每份最多一格、slotSeed 第一次到 ±2 先固定、環境資產維持凍結。
- ladder 同 headline 都已實作並有測試。
- 模擬結果已記錄喺 [VALIDATION](../VALIDATION.md#分級階梯headline--2026-10-27)。
- 用 scratch `dev:auto` 做咗 browser check：每份提案只變一格。
- 分支已 push。

## In-scope files and dependencies

- Server（唯一權威）：
  - `survey/src/shared/cityView.ts`：`ladderGap`、`ladderStep`、`ladderLayout`、`exhibitionTiers`、`pickHeadline`，`ExhibitionLayout.tiers`；`exhibitionStateLayout` 已移除。
  - `survey/src/server/runStore.ts`：`runProposalLadder` fold、`proposalRecordOf`、`toProposalRecord(row, ladder)`。
  - `answerService.ts`、`proposalService.ts`、`decisionHistory.ts`。
  - 新增 `survey/scripts/ladderSim.ts`。
  - Monitor（`debugApi.ts`）加顯示段階。
- Root：
  - `src/districtMeters.ts`：district 讀 tier，加咗 `rungStep`、`ladderShare`、`ladderCut`、`ladderHybrid`，P10 `agree(tiers, …)`，`quiet` 參數。
  - `src/cityChangeManager.ts`：headline、quiet 處理，headline 排第一。
  - `src/surveyView.ts`：驗證 `tiers`。
  - 結果卡多咗「段階」標籤。
  - `src/scaleLab.ts` 同 `src/devScaleLab.ts` 改用 ladder。
- 測試：root 有 districtMeters、cityChangeManager、surveyMeterPipeline、surveyAtmosphere、odaiba、scaleLab；survey 有 exhibitionRules、meterContract。
- 刻意唔包括：
  - 環境軸資產（E4 後凍結）。
  - camera zoom 去 headline（下一步）。
  - `feat/energy-demo-camera`（冇 merge，亦冇依賴）。
  - module-swap（只收 v1）。

## Completed work

- **Ladder：** 每個 site 嘅 tier 由 active proposals fold 出嚟；同 slotSeeds 一樣，Undo、replay 同舊歷史都會重算，冇 schema 或資料遷移。
- **Focal 同 district 分工：** focal 由 ±1 起顯示完整 low／high。District 喺 0／±1 維持 mixed；±2 按 rank 次序轉一半（自動化 mixed 8 個 drone port → 10 → 11）；±3 係完整形態，fleets 亦喺呢格先郁。
- **配對：** 要兩個 site 同一邊都到 ±3。
- **Headline：** `pickHeadline` 純函數。只有 headline site 有 pulse／marker 同結果卡；其他 site 靜靜轉，舊結果遺留嘅 marker blink 保留。

## Actual validation results

- Verification status: PASSED（以下列出嘅範圍）
- Date and checked commit/worktree: 2026-10-27，`feat/meter-ladder` working tree，commit 做 `df730c0`（base `047cb2c`）。
- Commands/manual checks and results:
  - Root `npm test` PASS、`npm run build` PASS。
  - `survey/` `npm test` PASS、`npm run build` PASS。
  - `git diff --check` PASS。
  - module-swap 未改，所以未跑。
- 模擬：`node --experimental-strip-types survey/scripts/ladderSim.ts`。數字見 [VALIDATION](../VALIDATION.md#分級階梯headline--2026-10-27)：
  - 73.0% 投稿啱啱變一個 site、0% 變兩個或以上，連能源計有 10.8% 變兩項。
  - 第 1–3 位訪客平均變 0.99／1.41／1.46 項；改之前 main 係 2.38／2.38／2.81。
- Browser check：
  - 環境：scratch `SURVEY_PORT=8798 npm run dev:auto --prefix survey`，root Vite 5184，`?survey=ws://127.0.0.1:8798/ws`，City 分頁保持喺前面。
  - 九份提案經 guest HTTP API 送出，每份都只有一個 site 移一格。第 1–9 位依次係：sw+1、se+1、nw+1、nw+2、se+2、sw+2、nw+3、sw+3、se+3。
  - 結果卡每次只講一個地點。#2 同時有能源門檻，卡片照講フジテレビ東。
  - Console 冇 error。
  - 截圖：[#2 focal](../../artifacts/meter-ladder/guest2-se-focal.jpg)、[#9 district](../../artifacts/meter-ladder/guest9-se-rung3.jpg)。
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: 只有呢份 handoff、VALIDATION、SPEC、PROJECT 同 handoffs index 嘅文件改動。

## Known issues and blockers

- **限速會落後：** 三條軸合共平均落後目標約 1.2 步。
- **來回轉：** 約 38.7% 格變係將同一 site 上一步拉返轉頭，多數出現喺意見平分嘅人群。
- **Scale A 增益 ramp：** 首 12 位內，投反對票嘅訪客都可能見到該 site 升格（browser #7 投 human-led，nw 2→3），因為累積嘅 D 隨增益上升。呢個符合「一把聲之一」，但 owner 可能想再睇。
- **能源唔限速：** 約 10.8% 投稿嘅能源設備會同一格一齊變，靜靜轉，冇 pulse。
- **未測：** FPS、A/B station、iPad 實機、訪客理解程度。

## Important decisions

- User 2026-10-27 批准：±3 格、門檻 |D|≥1.5／4／7、遲滯 2、每份提案最多一格。
- Tie-break 次序：最大差距 → 訪客投票方向 → 按觀眾數輪替。
- slotSeed 第一次到 ±2 先固定；環境資產維持凍結。
- 舊 band 連續數值（例如 ports 5）唔再出現喺 live；DEV `?meters` 用同一門檻但唔限速。

## Next expected step

1. Owner（cc100053）批准先 merge `feat/meter-ladder` 入 main，然後跟 [CONTRIBUTING](../CONTRIBUTING.md) 做整合驗證同睇 main CI。
2. 之後另開任務：camera zoom 去 headline。
