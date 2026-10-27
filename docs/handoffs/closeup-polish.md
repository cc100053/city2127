# closeup-polish — Headline 近鏡逐個打磨

- Owner: cc100053（產品／審美最終批准）；實作由一個 long session 負責，開工時喺下面「進度」記低 session 名。
- Status: S0 RESUMED / IN PROGRESS（worker `01a17d74-5b40-7a30-a6eb-88447b33d6b2`；43/98，未改美術）
- Branch: `feat/closeup-polish`（一條長分支，每個 sector 一個 checkpoint）
- Base commit: `fdc4a0cbbbc352b41c15850f2a846845d7975de1`（fetch verified main，包含完整 S0 標準）
- Last verified commit: runtime `59c6ea9`；最終source root test/build、runner self-check及production DEV排除PASS，完整S0矩陣及效能未完成。
- Remote availability: source checkpoint `59c6ea9` 已push `origin/feat/closeup-polish`；部分原圖／logs另作evidence checkpoint，result record記錄最終SHA。未合併main。

## Session Git state

- Session starting branch and HEAD: 主 checkout `feat/energy-demo-camera` @ `016f6d1`，原 upstream 0/0、對 main 2/18；全部保留。獨立 clone `.task-relay/closeup-polish/checkout` 由 verified `origin/main` 開 `feat/closeup-polish`，clean start。
- Last fetched origin/main commit: `fdc4a0c`，2026-10-27 fetch 成功（clone 初次 sandbox DNS 失敗，獲准重跑成功）。計劃舊 base `6a20346` 至本基準僅完整標準文件及其 merge，runtime 未變。
- Local changes present at session start: 主 checkout 未追蹤 `.playwright-cli/`、`.task-relay/` 保留；獨立 clone NONE。
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## 點解係下一步

[headline-camera](headline-camera.md) 已經 merge 入 main，CI 亦通過。Owner 喺 2026-10-27 決定：鏡頭系統完成之後，就逐個打磨近鏡。近鏡將模型放大到佔畫面約三分一高度，hero 距離睇唔到嘅粗糙位而家會成為 headline 嘅主角。來回轉同 Scale A ramp 暫時唔調。

2026-10-27 owner 再決定：驗收標準同 baseline capture 方法由 Claude 定，即係下面兩節；成個打磨同驗收交畀一個 long session，按 sector 分段做。

## Sector 劃分

近鏡按地理位置分組。同一區嘅 shot 共用同一個 builder 或者 district 檔案，一個 sector 做晚先轉區，可以減少來回切換。Sector 次序跟 owner 定嘅 focal 次序（ne → sw → se → nw）。每個 sector 入面先做 focal，再做 district（包括 ±3 同配對設施），最後做附近嘅能源 shot。

| Sector | 範圍 | Shots | 主要檔案 |
| --- | --- | --- | --- |
| **S0 基準** | 全城 | 全部 13 個 shot 加 hero，**唔改美術** | 新 capture runner、DEV 量度 helper |
| **A 海浜公園（NE）** | お台場海浜公園同西岸水庭 | `ne:focal`、`ne:district`、`energy:garden` | [environmentPark.ts](../../src/siteBuilders/environmentPark.ts)、[districtMeters.ts](../../src/districtMeters.ts)、[energyPrototype.ts](../../src/energyPrototype.ts) |
| **B アクアシティ南（SW）** | Aqua City 南、共享水邊 | `sw:focal`、`sw:district` | [commonsPlaza.ts](../../src/siteBuilders/commonsPlaza.ts)、districtMeters.ts |
| **C フジテレビ東（SE）** | 富士電視台東面同前面 | `se:focal`、`se:district`、`energy:ring` | [concentrationTower.ts](../../src/siteBuilders/concentrationTower.ts)、districtMeters.ts、energyPrototype.ts |
| **D デックス西＋沖（NW）** | DECKS 西同北面海上 | `nw:focal`、`nw:district`、`energy:garden2`、`energy:wing`、`energy:island` | [automationHub.ts](../../src/siteBuilders/automationHub.ts)、districtMeters.ts、energyPrototype.ts |
| **Z 全城回歸** | 全城 | 全部重截，同 S0 比較，加 live 檢查 | 只做驗收，唔改美術（發現回歸就返去對應 sector 修） |

Baseline 觀察（2026-10-27，每個 shot 只睇咗一張 [live hold 原圖](../../artifacts/headline-camera/README.md#settled-live-hold-samples)，未經 owner review；S0 會用完整矩陣取代）：

- `ne:focal`：樹冠平台只佔畫面大約六分一；樹似棒棒糖；方形小屋好簡陋；橙色 marker 環比主體更搶眼。
- `sw:focal`：一條淺藍高架通道橫過畫面頂同底，所以要先修 pose。白色圓環頂好平；有一嚿粉紅色植物；共享座位睇唔出。
- `se:focal`：主塔太幼，俾左邊斑駁灰色大樓搶咗焦點；function modules 睇唔出。
- `nw:focal`：幾棟相似嘅藍塔企埋一齊，分唔到邊棟係 hub；自動服務端口認唔出。

## Capture 標準

S0、每輪打磨同 Z 全部用同一套設定，咁先可以直接比較。

**環境**
- 開發 Mac。Chrome 用 [capture.mjs](../../artifacts/headline-camera/capture.mjs) 嗰套 headless 設定（同一個 Playwright 同 Chrome 路徑，Google Fonts 用空 CSS 代替）。
- 1920×1080、DPR 1、default quality。Vite DEV 用一個空閒 port。
- 每次 capture 記錄 git SHA、Chrome 版本、GPU 字串同 URL。

**固定條件**
- URL 一定帶 `reviewTime=20`（固定 actor 時間）同 `hour=12` 或者 `hour=22`，再用 `shot=<id>` 鎖住鏡頭。
- 頁面出現 `canvas.dataset.fps` 之後再等 6 秒先截圖。
- S0 要將同一條 URL 截兩次，比較兩張圖：mean absolute difference 要細過 1/255，即係 capture 可以重現。做唔到就先記低原因，之後每輪每個狀態截兩次取第二張。

**狀態矩陣**

Meters 分數同 tier 嘅對應：ladder 邊界係 1.5、4、7，所以分數 −8／−5／−2／0／2／5／8 對應 tier −3 到 +3。2026-10-27 已經用 node 經 `deriveExhibitionLayout` 驗證過（`nw` 得出 −3、−2、−1、0、1、2、3）。S0 要將呢個 check 寫成 test，之後先開始截圖。

| 類別 | 狀態 | URL 參數 | 張數 |
| --- | --- | --- | --- |
| focal | tier −1、0、+1（focal 只睇正負號） | `meters=<site>:-2`、`<site>:0`、`<site>:2`，其他 site 留 0 | 3 狀態 × 2 hour = 6 |
| district | tier −3、−2、0、+2、+3 | `meters=<site>:-8`、`-5`、`0`、`5`、`8` | 5 × 2 = 10 |
| energy | 冇該部件嘅 `baseline`，加每個有該部件嘅 option | `energy=baseline`、`a`、`b`、`c`、`mixed` 入面相關嗰幾個（S0 由 [energyPrototype.ts](../../src/energyPrototype.ts) 列清楚） | 每個狀態 × 2 |
| hero | 中性 | `meters=nw:0,ne:0,sw:0,se:0`，唔加 `shot` | 2 |

**檔案**
- 路徑：`artifacts/closeup-polish/<sector>/<round>/<shot>__<state>__h<hour>.jpg`，JPEG quality 90。`<round>` 用 `baseline`、`r1`、`r2`、`r3`。
- 同一個目錄放一個 `capture.json`，記錄每張圖嘅 URL、pose、`data-fps`、`data-drawCalls`、量度結果同 errors。
- 每個 sector 一個 `REVIEW.md`，內容係 baseline 同最後一輪逐狀態並排嘅對比。

**效能量度（同截圖分開跑）**
- Chrome 加 `--disable-gpu-vsync`，載入後等 16 秒，用 5 秒 rAF 窗口量，量兩輪，取平均。方法同 [VALIDATION](../VALIDATION.md) 嘅 render-perf 段一樣。
- 量 hero，同每個 shot 嘅 tier +1（district 量 +3）。兩樣都要量 hour 12 同 hour 22。
- 另外喺開 vsync 嘅情況下讀 `data-fps`（120 frame 平均），作為可以頂到 60 FPS 嘅檢查。

## 驗收標準

每個 shot 要喺每個狀態都過晒自動項目，視覺項目亦要逐項寫低判斷同理由，先算 PASS。Owner 睇 `REVIEW.md` 之後嘅批准係最終決定。

**自動項目（runner 量度，結果寫入 `capture.json`）**

| # | 項目 | 標準 |
| --- | --- | --- |
| A1 | 主體大小 | focal 主體嘅投影 bounding box 高度佔畫面 25%–60%；district 變化範圍嘅 box 闊度 ≥ 35%；能源部件 box 高度或闊度 ≥ 20% |
| A2 | 主體位置 | box 中心喺 x 8%–72%、y 15%–85% 範圍內；box 同右上結果卡區（x > 78% 而且 y < 45%）重疊唔可以超過 box 面積 5% |
| A3 | 冇遮擋 | 由鏡頭向 box 內 9 個取樣點（中心、四角、四邊中點，向內縮 10%）raycast，最少 7 條第一個擊中主體 |
| A4 | 變化睇得出 | 相鄰狀態喺主體 box 範圍內，像素 mean absolute difference ≥ 6%；最低同最高狀態之間 ≥ 12% |
| A5 | 效能 | uncapped FPS ≥ S0 baseline 嘅 95%（hero 同 shot 都要）；draw calls ≤ baseline +10%；vsync `data-fps` ≥ 58 |
| A6 | 錯誤 | 0 個 page error；console error 只容許預期嘅 favicon 404 |
| A7 | 行為 | `npm test`、`npm run build`、`git diff --check` PASS；改咗嘅 target 映射有 test。每個 sector 最少做一次瀏覽器 live 檢查，確認 3 秒過渡、reload／Undo 即時還原同 reduced motion |

**視覺項目（session 逐項判斷，寫低理由）**

| # | 項目 | 標準 |
| --- | --- | --- |
| V1 | 認得出 | 只睇圖，2 秒內講得出係乜設施，同結果卡講嘅地點對得上 |
| V2 | 有定位 | 最少一個地標入鏡：海、富士電視台球體或者彩虹橋 |
| V3 | 綠化 | 樹冠飽滿、有層次；冇棒棒糖樹，冇稀疏格仔地 |
| V4 | 成熟 2127 | 每個狀態都係完整嘅未來方案；low 唔代表空或者舊（ART） |
| V5 | 夜晚 | hour 22 主體輪廓同變化仍然睇得清 |
| V6 | 近距離質素 | 冇 z-fighting、閃爍、浮空零件、穿模或者明顯低 poly 輪廓 |

**量度 helper（S0 交付）**

S0 加一個 DEV-only 嘅 `window.cityShotFrame(id)`，只喺 `import.meta.env.DEV` 存在。佢回傳主體嘅投影 box（A1、A2 用）同 A3 嘅 raycast 擊中數。主體定義如下：
- focal：該 socket 嘅 site root；
- district：該 district 嘅 carrier 物件；
- energy：對應部件嘅 group。

投影同取樣點嘅計算寫成 pure function，配一個 node test。A4 嘅像素差用 Playwright 喺頁面入面以 canvas 讀兩張圖計，唔加新 dependency。

## Long session 做法

1. **Preflight**：照 [AGENTS.md](../../AGENTS.md) 做。由已 fetch 嘅 main 開 `feat/closeup-polish`。讀：
   - 本文件、[headline-camera](headline-camera.md)、ART 同 CITY MASTER TASTE；
   - 每個 sector 開工前，讀嗰個 sector 嘅 builder、佢嘅 test，同埋對應嘅 target 映射（park 喺 `changeCatalog.ts`，其餘喺 builder 自己嘅 `*Target`）。
2. **S0**：
   - 做 tier 對應 check、capture runner、`cityShotFrame` 同佢嘅 test。
   - 跑完整矩陣同效能量度，所有 shot 嘅 A1–A6 結果寫入 `artifacts/closeup-polish/S0/`。
   - 根據結果更新上面嘅 baseline 觀察。
   - Commit 並 push checkpoint。S0 唔改美術，可以照 CONTRIBUTING 直接 merge 入 main。
3. **每個 sector（A → B → C → D）入面嘅每個 shot**：
   1. 未過 A1–A3：先調 [headlineCamera.ts](../../src/headlineCamera.ts) 入面嘅 `SHOTS` pose，要同時過到 `tests/headlineCamera.test.ts` 嘅限制。FOV 維持 42°。時間線同 `HeadlineCamera` 邏輯唔改。
   2. 未過 A4 或任何 V 項目：改該 shot 主體所屬嘅 builder。
      - 重用 `Kit`、共享材質、InstancedMesh 同 batch；唔可以每 frame 建 geometry；唔加 dependency。
      - 保留 target 語義、footprint、權威 layout 數量同 3 秒 retarget。
      - 細節按畫面投影大小分配，近鏡見到嘅位先加。
   3. 每個 shot 最多三輪（`r1`–`r3`），每輪重截嗰個 shot 嘅完整狀態矩陣，再量效能。
   4. 三輪之後仍然 FAIL：停低，喺 `REVIEW.md` 記低差距，轉去下一個 shot，留畀 owner 決定。
4. **Sector 收尾**：
   - 跑 A5–A7，寫好 `REVIEW.md`。
   - Commit 並 push sector checkpoint，喺下面進度表記低 SHA。
   - 通知 owner review，**唔使等批准就繼續下一個 sector**。
   - Owner 批准之後，照 CONTRIBUTING 將嗰個 checkpoint `--no-ff` merge 入 main，整合結果再跑一次檢查，push 之後確認 main CI。
   - Owner 要求修改：喺同一條分支修，重做嗰個 sector 嘅收尾。
5. **Z**：
   - 全部 13 個 shot 加 hero 用 S0 條件重截，同 S0 逐張比較。
   - 用 survey `dev:auto` scratch server，每個 sector 播一次 live 結果，確認近鏡同結果卡一致。
   - 寫最終報告，更新本文件、[handoffs README](README.md) 同 EXHIBITION_SPEC，停低所有自己開過嘅 server。

## In-scope files and dependencies

- 包括：
  - sector 表列出嘅 builder、`districtMeters.ts`、`energyPrototype.ts` 同佢哋嘅 test；
  - `src/headlineCamera.ts` 入面嘅 `SHOTS`（只改數值）；
  - DEV-only 量度 helper 同 capture runner；
  - `artifacts/closeup-polish/`；
  - [documentation sync](../CONTRIBUTING.md#documentation-sync) 要求更新嘅文件。
- 唔包括：
  - headline 時間線、中斷規則同 headline 選擇規則；
  - tier 同 ladder；
  - survey server 同協議；
  - module-swap；
  - 自動品質調整；
  - 回顧章節同變化說明卡；
  - 新 GLB 或外部素材包（屬於另一個 [BLENDER](../BLENDER.md) 資產任務）；
  - 部署。
- 依賴：headline camera（`5100289`），review-mode 修正（`3fec9c3`）。

## 進度

| Sector | 狀態 | Checkpoint | Owner review | Main merge |
| --- | --- | --- | --- | --- |
| S0 基準 | RESUMED；保留43/98基準，補全矩陣中，worker `01a17d74-5b40-7a30-a6eb-88447b33d6b2` | runtime `59c6ea9`；[部分報告](../../artifacts/closeup-polish/S0/README.md) | 唔需要（冇美術改動）；本批留 coordinator review，不 merge | — |
| A 海浜公園 | PLANNED | — | — | — |
| B アクアシティ南 | PLANNED | — | — | — |
| C フジテレビ東 | PLANNED | — | — | — |
| D デックス西＋沖 | PLANNED | — | — | — |
| Z 全城回歸 | PLANNED | — | — | — |

## Actual validation results

- Verification status: PARTIAL（43/98；不是S0完成）。[原圖／完整logs／量測報告](../../artifacts/closeup-polish/S0/README.md)及[JSON](../../artifacts/closeup-polish/S0/partial-report.json)。Root最終source npm test/build PASS，runner self-check、production排除及diff PASS；首次sandbox listen EPERM已獲准重跑。A1 32/43、A2 18/43、A3 0/43、A6 42/43；首次Vite optimizer504/abort保留待獨立重測。Repro7/43通過；其餘保留雙圖／採第二張，未調門檻。Vsync59.8–60.1不代表uncapped性能；A4／28組兩輪uncapped／其餘55狀態未跑。沒有新live／硬件驗收。
- 呢份計劃只做咗文件連結同事實核對。以下各項都對照過 `6a20346` 嘅 source：檔案路徑、shot pose、`?meters`／`?shot`／`?energy`／`hour`／`reviewTime` 參數、ladder 邊界（`LADDER_EDGES` 1.5／4／7）、`ENERGY_OPTIONS`，同 `data-fps` 嘅 120 frame 平均。

## Known issues and blockers

- A1–A5 嘅門檻係計劃階段定嘅數字。S0 量完如果發現某個門檻根本做唔到（例如 hero 本身已經唔夠 58 FPS），就喺本文件寫低實測數字同調整後嘅門檻，唔可以靜靜放寬。
- `?energy=` 係 DEV 能源 study 嘅 option，唔等同 production 每個能源配置。Production 一致性由 Z 嘅 live 檢查覆蓋。
- 「2 秒認得出」由 session 判斷，未做真人測試；效能只係開發 Mac 嘅數字，展示硬件未驗。

## Important decisions

- 2026-10-27 owner：headline camera 之後逐個打磨近鏡。
- 2026-10-27 owner：驗收標準同 capture 方法由 Claude 定；整個任務交一個 long session，按 sector 分段。
- 按地理分 sector，sector 次序跟 focal 次序（ne → sw → se → nw）。每個 sector 入面 focal → district → 能源。
- 美術屬於產品方向，每個 sector 要 owner 批准先 merge；S0 冇美術改動，唔使等批准。
- Session 唔使等 review，可以繼續做下一個 sector，所有改動都喺同一條分支上順序進行，避免 `districtMeters.ts` 衝突。

## Next expected step

配額低於15%已安全停止。Coordinator依watchdog復原後先重查實際limits，再在同一獨立clone續跑capture（已完成43行會跳過，不覆寫原圖）；完成餘下55狀態、在新目錄重測首組NW focal optimizer失敗、28組兩輪uncapped、compare A4/A5及完整review。最早報告weekly reset+3min為2026-11-02T06:25:04Z；不能把目前部分證據視為S0完成。Chrome／runner／Vite5194均已停止，未啟動survey服務；worker交接後不再寫入。

## S0 resume — 2026-10-27

人類message01a17d9e-e127-7d03-9bed-65a8eb3fdba1已取消百分比預停；上方15%暫停／未來復原時間只作歷史，現由實際provider limit決定quota recovery。相同worker由clean7fbfbfa／upstream0/0續作，fetch origin/main仍fdc4a0c（feature ahead3，無須整合）。43 rows及93原圖hash核對一致。剩餘矩陣、NW新目錄retry、28組兩輪uncapped及A4依序執行；root test/build再次PASS，survey只build作scratch fixture。A4無有效box的組合改為明確FAIL／原因，沒有跳過或放寬門檻；pixel runtime未改。完整原圖review逐組寫入visual-review.json；尚未宣稱S0完成或source接受。
