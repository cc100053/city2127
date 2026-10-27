# closeup-polish — Headline 近鏡逐個打磨

- Owner: cc100053（產品／審美決定）；每個 stage 由接手嘅實作者喺自己嘅 task 分支記名。
- Status: PLANNED
- Branch: 每個 shot 一條 `feat/closeup-<shot>`，例如 `feat/closeup-ne-focal`；本計劃喺 `docs/closeup-polish-plan`。
- Base commit: `3fec9c3dc7d7d721dbfe9f0cafe27bf03264f812`（main，已包含 headline camera 同 review-mode 修正）
- Last verified commit: NONE（只有計劃）
- Remote availability: 計劃隨 main 發布；未有實作分支。

## Session Git state

- Session starting branch and HEAD: `main` @ `3fec9c3`（clone `.task-relay/headline-camera/checkout`）
- Last fetched origin/main commit: `3fec9c3`，2026-10-27 fetch 成功
- Local changes present at session start: NONE
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## 點解係下一步

[headline-camera](headline-camera.md) 已經 merge 入 main，CI 亦通過。Owner 喺 2026-10-27 決定：鏡頭系統完成之後，就逐個打磨近鏡。近鏡將模型放大到佔畫面約三分一高度，hero 距離睇唔到嘅粗糙位而家會成為 headline 嘅主角。來回轉同 Scale A ramp 暫時唔調。

## Goal and acceptance criteria

每個近鏡停留嘅 4.12–10 秒內，觀眾一眼認得到「呢度係乜設施、變咗啲乜」，而且畫面符合 [CITY MASTER TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) 同 [ART](../ART.md)。

每個 shot 要全部達到以下各項先算完成：

1. **主體清楚**：focal 主體佔畫面高度大約三分一，放喺左邊或者中間 75% 範圍，因為右上角結果卡會遮住 1920 寬畫面大約右邊 22%。冇前景建築、橋或者 canopy 橫過主體。
2. **有定位**：最少一個地標留喺畫面，例如海、富士電視台球體或者彩虹橋。鏡頭保持由 hero 方向望入去，唔可以繞去背面。
3. **變化睇得出**：同一個 shot 喺 low／mixed／high（district 再加 ±2、±3）幾個狀態下，差別一眼睇得出。每個狀態都要係成熟嘅 2127 方案，low 唔代表空或者舊。
4. **綠化飽滿**：綠化要茂盛，用 edge、terrace、樹冠層次去表達未來感，唔好整成稀疏格仔地或者棒棒糖樹。
5. **日夜都睇得清**：hour 12 同 hour 22 都要讀得出主體。
6. **行為冇變**：3 秒 retarget、snapshot／reset／Undo 即時還原、guest marker／pulse、fixed footprint、route clearance 同權威 layout 數量全部不變。
7. **效能冇倒退**：同一部機、同一組條件下量 hero 同該 shot 嘅 FPS 同 draw calls，同 baseline 比較，數字照實記低。
8. **Owner 批准**：owner 睇過前後對比圖批准，先可以 merge。

## Stage 次序

按出現頻率排次序（[meter-ladder](meter-ladder.md)：每份提案最多升一格，所以 ±1 focal 最常見）。每個 shot 一條分支、一次 owner review、一次 merge。前一個 merge 咗先開下一個，唔好幾條分支同時改同一個 builder。

| Stage | Shot | 主要檔案 | Baseline 觀察（2026-10-27，[live hold 原圖](../../artifacts/headline-camera/README.md#settled-live-hold-samples)，未經 owner review） |
| --- | --- | --- | --- |
| S1a | `ne:focal` お台場海浜公園 | [environmentPark.ts](../../src/siteBuilders/environmentPark.ts) | 樹冠平台只佔畫面大約六分一；樹似棒棒糖；旁邊方形小屋好簡陋；橙色 marker 環比主體更搶眼 |
| S1b | `sw:focal` アクアシティ南 | [commonsPlaza.ts](../../src/siteBuilders/commonsPlaza.ts) | **先修 pose**：一條淺藍高架通道橫過畫面頂同底。白色圓環頂好平；粉紅色一嚿嘅植物；共享座位睇唔出 |
| S1c | `se:focal` フジテレビ東 | [concentrationTower.ts](../../src/siteBuilders/concentrationTower.ts) | 主塔太幼，俾左邊斑駁灰色大樓搶咗焦點；function modules 睇唔出；marker 喺塔底 |
| S1d | `nw:focal` デックス西 | [automationHub.ts](../../src/siteBuilders/automationHub.ts) | 幾棟相似嘅藍塔企埋一齊，分唔到邊棟係 hub；自動服務端口認唔出 |
| S2 | `ne／sw／se／nw:district`（±2） | [districtMeters.ts](../../src/districtMeters.ts) | 開工時用同一方法先截 baseline、記觀察，之後先改 |
| S3 | ±3 同配對設施 | `districtMeters.ts` 及相關 builder | 同上 |
| S4 | `energy:*` 五個 | `energyPrototype` 等 | 儲能環同接收翼已經做過 [energy polish](energy-polish-integration.md)；只處理近鏡實際見到嘅問題 |

## 每個 shot 嘅做法

1. **Preflight**：照 [AGENTS.md](../../AGENTS.md) 做。由已 fetch 嘅 `main` 開 `feat/closeup-<shot>`，然後讀：
   - 本文件、[headline-camera](headline-camera.md)；
   - 目標 builder、佢嘅 test（例如 `tests/commonsPlaza.test.ts`）、對應嘅 target 映射（park 喺 `changeCatalog.ts`，其餘喺 builder 自己嘅 `*Target`）；
   - ART 同 CITY MASTER TASTE。
2. **Baseline 截圖**（改任何嘢之前）：
   - 開 `npm run dev -- --port <空閒 port>`，再開 `?meters=<site>:<值>&shot=<shot>&hour=12&reviewTime=20`。值用 `low`、`mixed`、`high`；district shot 另外加 ladder 嘅 ±2、±3 分數。`?meters` 同 `?shot` 可以一齊用：`cityShot` 會鎖住鏡頭，`reviewTime` 會固定 actor 時間。
   - 每個狀態再用 `hour=22` 截一次。另外截一張同條件嘅 hero，用嚟對比效能。
   - 截圖方法同 [capture.mjs](../../artifacts/headline-camera/capture.mjs) 一樣（1920×1080、DPR1、Chrome headless）。Runner 抄去 `artifacts/closeup-polish/<shot>/` 再改參數，唔好改原檔。記錄 FPS、draw calls 同 errors。
3. **先修構圖，後修模型**：
   - 主體被遮或者太細，先調 [headlineCamera.ts](../../src/headlineCamera.ts) 入面嘅 `SHOTS` pose。`tests/headlineCamera.test.ts` 嘅高度、距離同方向限制要照樣通過。
   - FOV 維持 42°，唔好用 FOV 代替推近。
   - 時間線、`HeadlineCamera` 邏輯同 headline 規則全部唔改。
4. **模型打磨**：只改該 shot 主體所屬嘅 builder。
   - 重用現有 `Kit`、共享材質、InstancedMesh 同 batch。唔可以每 frame 建 geometry 或者 material，亦唔加新 dependency。
   - 保留 target 語義（例如 `sharedSeats`、`automatedPorts`、`treeCount`）同 footprint。
   - 細節按畫面上嘅投影大小分配：近鏡睇得見嘅位先加，hero 距離睇唔到嘅唔使加。
   - 新 GLB 或者外部素材屬於另一個資產任務（[BLENDER](../BLENDER.md)），唔喺呢度做。
5. **輪次**：每個 shot 最多三輪。每輪重截第 2 步同一組圖，放入 `artifacts/closeup-polish/<shot>/round-<n>/`，並喺 README 寫低改咗乜同前後對比。三輪之後未達標，就停低記錄差距，交 owner 決定。
6. **檢查**：`npm test`、`npm run build`、`git diff --check`；改咗嘅 builder 嘅 test 要覆蓋新加嘅 target 映射。另外照 [VALIDATION](../VALIDATION.md) 喺瀏覽器確認三樣嘢：live 結果嘅 3 秒過渡、reload 或 Undo 後即時還原、reduced motion。
7. **Owner review**：俾 owner 睇 baseline 同最後一輪嘅對比圖，等 owner 批准。冇批准就唔 merge。
8. **整合**：照 [CONTRIBUTING](../CONTRIBUTING.md) 用 `--no-ff` merge 入 main，喺整合結果再跑一次檢查，push 之後確認 main CI。然後更新本文件下面嘅進度表同 [handoffs README](README.md)，最後停低所有自己開過嘅 server。

## In-scope files and dependencies

- 包括：上面 stage 表列出嘅 builder 同佢哋嘅 test、`src/headlineCamera.ts` 入面嘅 `SHOTS`（只改數值）、`artifacts/closeup-polish/`，以及 [documentation sync](../CONTRIBUTING.md#documentation-sync) 要求更新嘅文件。
- 唔包括：
  - headline 時間線同中斷規則；
  - tier、ladder 同 headline 選擇規則；
  - survey server 同協議；
  - module-swap；
  - 自動品質調整；
  - 回顧章節同變化說明卡；
  - 新 GLB 或外部素材包；
  - 部署。
- 依賴：headline camera（`5100289`），review-mode 修正（`3fec9c3`）。

## 進度

| Shot | 分支 | 狀態 | 證據 | Merge |
| --- | --- | --- | --- | --- |
| ne:focal | — | PLANNED | — | — |
| sw:focal | — | PLANNED | — | — |
| se:focal | — | PLANNED | — | — |
| nw:focal | — | PLANNED | — | — |

## Actual validation results

- Verification status: NOT RUN（只有計劃）
- 呢份計劃只做咗文件連結同事實核對：shot pose、檔案路徑、`?meters`／`?shot`／`hour`／`reviewTime` 參數都對照過 `3fec9c3` 嘅 source。

## Known issues and blockers

- 上面 baseline 觀察係根據每個 shot 一張 live 截圖寫嘅，未經 owner review，亦未覆蓋 low／mixed 狀態同夜晚。
- 「一眼認得」未做真人測試；效能只係開發 Mac 嘅數字，展示硬件未驗。

## Important decisions

- 2026-10-27 owner：headline camera 之後逐個打磨近鏡，次序係 focal ±1 → district ±2 → ±3／配對 → 能源。
- 每個 shot 一個細任務：截圖做前後比較，並量 FPS。
- 美術屬於產品方向，merge 之前要 owner 睇圖批准。

## Next expected step

S1a `ne:focal`：開 `feat/closeup-ne-focal`，做第 2 步 baseline 截圖（low／mixed／high × hour 12／22，加 hero）。
