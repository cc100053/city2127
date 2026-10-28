# closeup-polish — Headline 近鏡逐個打磨

- Owner: cc100053（產品／審美最終批准）；實作由一個 long session 負責，開工時喺下面「進度」記低 session 名。
- Status: S0 INTEGRATED（98/98，量度基準已接受）；A REVIEW_READY（三輪完成但gate仍FAIL）；B REVIEW_READY（worker `01a17e8c-3c8c-77f3-afbb-6f7d62abad14`；三輪完成，FAIL保留）；C REVIEW_READY（worker `01a17f7d-839f-74d0-8660-22e9c1ec1435`，dispatch `closeup-polish-C-1-r13`／recovery r16；focal/district三輪、ring兩輪，FAIL保留）；D REVIEW_READY（worker `01a18154-a9bd-7ca2-a776-9a2834a519da`，NW/wing三輪、garden2/island兩輪，FAIL保留）；Z RUNNING（worker `01a183af-1ca0-7190-a25c-b31a6db4fd98`，dispatch `closeup-polish-Z-1-r21`；全當前累積source驗證中）。
- Branch: `feat/closeup-polish`（一條長分支，每個 sector 一個 checkpoint）
- Base commit: `fdc4a0cbbbc352b41c15850f2a846845d7975de1`（fetch verified main，包含完整 S0 標準）
- Last verified commit: D runtime `44521a0d63aae904c306a19c4baac52a44b62a87`，root npm test/build/diff及23項D live PASS；art gate FAIL保留。最終feature evidence SHA／remote／release見`result-D-1.json`；A/B/C pending和S0接受main `3d0f40e`保持。
- Remote availability: A `def2f28`、B `ca22a92`、C各輪至runtime `b5ce8fe`已push長feature；C最終證據SHA／remote確認／writer release／callback delivery見checkout外`.task-relay/closeup-polish/result-C-1.json`。A/B/C未整合main／未部署。

## Session Git state

- Session starting branch and HEAD: 主 checkout `feat/energy-demo-camera` @ `016f6d1`，原 upstream 0/0、對 main 2/18；全部保留。獨立 clone `.task-relay/closeup-polish/checkout` 由 verified `origin/main` 開 `feat/closeup-polish`，clean start。
- Last fetched origin/main commit: `3d0f40ebd5d7350ecdcc05ab3420cacf926dfd9a`，2026-10-28 C final fetch成功；runtime `b5ce8fe` upstream0/0、vs main17/0，未pull/merge。最終evidence commit divergence見result-C-1.json。起始S0基準為`fdc4a0c`，原sandbox DNS retry及整合歷史保留。
- Local changes present at session start: 主 checkout 未追蹤 `.playwright-cli/`、`.task-relay/` 保留；獨立 clone NONE。
- Upstream integration status: S0按revision7授權整合；fresh origin/main `fdc4a0c`，feature5/0，clean start；main新建追蹤origin/main，no-ff merge無衝突。
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

S0 觀察（2026-10-28，98張完整原始第二take已逐張檢視；[逐狀態報告](../../artifacts/closeup-polish/S0/REVIEW.md)，屬session判斷，未經owner美術批准）：

- `ne:focal`：AABB包含桿件／marker，不等於植物本體填滿畫面；冷卻環／橙框比公園植栽搶眼，樹冠仍有棒幹／稜角。
- `sw:focal`：一條淺藍高架通道橫過畫面頂同底，所以要先修 pose。白色圓環頂好平；有一嚿粉紅色植物；共享座位睇唔出。
- `se:focal`：low箱體／桿件與neutral office box未表達完整集中功能；high塔較完整但鄰樓搶眼。桿件令low box高度43.7%大於neutral26.7%，不能把A1通過當作功能可讀。
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
- Chrome 加 `--disable-gpu-vsync` **及 `--disable-frame-rate-limit`**，載入後至少等16秒，用5秒rAF窗口量兩輪取平均。2026-10-28 S0查證目前Chrome156單靠前者仍被鎖60；雙flag的hero86.33/89.42才解除上限。原始28組flag-only數據完整保留，修正只關乎量測，不改scene／quality或門檻；[證據](../../artifacts/closeup-polish/S0/README.md#chrome-frame-cap-correction)。
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
| S0 基準 | INTEGRATED；量度基準接受，非美術接受 | `19e9ae2`；[完整基準](../../artifacts/closeup-polish/S0/README.md) | coordinator已審查；冇美術改動 | `c802bba` |
| A 海浜公園 | REVIEW_READY：worker `01a17e2a-4c38-7422-8d68-33782c0367f5`，dispatch `closeup-polish-A-1-r8`；三輪各24狀態完成 | runtime `b7d5861`；[完整review](../../artifacts/closeup-polish/A/REVIEW.md)，最終SHA見result-A-1.json | pending；A3/A4/V失敗保留 | — |
| B アクアシティ南 | REVIEW_READY：worker `01a17e8c`，三輪各18狀態；A3/A4、focal A5/V及V3仍FAIL | runtime `74d6c2b`；[完整review](../../artifacts/closeup-polish/B/REVIEW.md)，final SHA見result-B-1.json | pending；建議暫不接受r3 focal退步候選 | — |
| C フジテレビ東 | REVIEW_READY：focal/district各三輪、ring兩輪完成；A3全FAIL、A4 4/28，A5 18FAIL＋6UNVERIFIED；root/live11項PASS；未接受art | baseline `ca22a92` → runtime `b5ce8fe`；[逐圖／完整量度](../../artifacts/closeup-polish/C/REVIEW.md) | owner pending，建議暫不接受C美術 | — |
| D デックス西＋沖 | REVIEW_READY：134狀態／275原圖、final50；root/live23PASS，A3/A4/A5及V失敗保留 | runtime `44521a0`；[完整report](../../artifacts/closeup-polish/D/REVIEW.md)，final SHA見result-D-1.json | pending，建議暫不接受D美術 | — |
| Z 全城回歸 | RUNNING：原98態／28效能／四區scratch live，僅量度文件 | base `4a3ad9f`／runtime `44521a0`；[工作紀錄](../../artifacts/closeup-polish/Z/README.md) | A–D與A3/A4政策仍待owner | — |

## Actual validation results

- S0 measurement status: 98/98、196張baseline JPEG，所有98張正式第二take原圖逐張檢視；[原圖／logs／方法](../../artifacts/closeup-polish/S0/README.md)、[逐狀態review](../../artifacts/closeup-polish/S0/REVIEW.md)、[JSON](../../artifacts/closeup-polish/S0/report.json)。不是全shot美術驗收PASS。A1 60 PASS／6 FAIL／20無法量測FAIL／12 N/A；A2 42／24／20／12；A3 0／66／20／12。A4 7/96通過，20組無有效投影仍FAIL。A6原始97/98，首次optimizer504原圖保留；獨立NW retry6/6無錯。Repro41/98，57失敗採第二take，不改門檻。Vsync58.5–60.1，全部>=58。效能reference28組兩輪，以雙flag解除Chrome60fps cap；精確數字見report。
- A3原因：66個可投影狀態的594條射線，66命中subject、266不穿過world AABB、182穿完整bounds空隙、80命中bounds內其他geometry（原因不明）；不能把所有miss當成前景遮擋。SW／SE district整個carrier跨near plane，20狀態未能量測；下一輪先調pose，不能偷換成較小主體。
- Root suite/build、runner自檢、production靜態排除及live/recovery結果以[checks.json](../../artifacts/closeup-polish/S0/checks.json)為準。Runtime source自59c6ea9未變；既有chunk-size／JSON import warning保留。只測開發Mac Chrome1920×1080/DPR1；無展示硬件／其他平台／真人辨識驗收。
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

Coordinator核對唯一result-D-1.json、feature final SHA、[D逐圖review](../../artifacts/closeup-polish/D/REVIEW.md)、原始樣本及writer/services release後接手。D是有界實驗完成，未作美術接受；A/B/C/D owner pending只阻相應art merge，下一步Z全城當前source矩陣與scratch live由coordinator另派。D worker不做Z、第四輪或main merge。百分比預停已取消，只在真正provider limit時recovery。

## S0 resume — 2026-10-27

人類message01a17d9e-e127-7d03-9bed-65a8eb3fdba1已取消百分比預停；上方15%暫停／未來復原時間只作歷史，現由實際provider limit決定quota recovery。相同worker由clean7fbfbfa／upstream0/0續作，fetch origin/main仍fdc4a0c（feature ahead3，無須整合）。43 rows及93原圖hash核對一致。剩餘矩陣、NW新目錄retry、28組兩輪uncapped及A4依序執行；root test/build再次PASS，survey只build作scratch fixture。A4無有效box的組合改為明確FAIL／原因，沒有跳過或放寬門檻；pixel runtime未改。完整原圖review逐組寫入visual-review.json；尚未宣稱S0完成或source接受。

## S0 recovery — 2026-10-28

實際五小時limit中斷後，背景runner完成98 capture／28 flag-only perf／96比較；recovery-r6續用同一owner、0ddd039及所有dirty原圖。Fetch main仍fdc4a0c，upstream0/0，未pull或merge。全98原圖檢視完成，報告腳本核對舊hash、展開每狀態V理由，保留43狀態partial歷史與所有失敗。查明Chrome只用disable-gpu-vsync被60fps cap，額外disable-frame-rate-limit後補齊有效效能reference；舊數據及診斷runner均保留。終版驗證／cleanup／checkpoint由checks.json和本批result記錄；不改美術／pose／時間線／梯級／survey協定。

## S0 final verification — 2026-10-28

已完成98狀態、96比較、28組×2有效uncapped reference；平均79.51–133.60FPS，vsync58.5–60.1。Root npm test/build PASS且runtime對59c6ea9 diff為空，runner／report／ray原因自檢、原93張hash及所有98雙take URL/pose核對PASS。DEV／production smoke PASS；原E4因固定能源句斷言不合現行ladder headline優先次序而失敗，保留formal.log及3張partial原圖。S0副本只調整兩個結果等待斷言，其餘能源數量／實際模型／legacy／同ID retry／Undo／mixed／TCP reconnect／reduced motion／resize／reset均PASS、page exception0；tests/energyE4.browser.mjs與runtime不改。完整234張原圖hash在manifest。Vite5194／preview5195已停止、ports free，owned Chrome／runner無剩餘；scratch server／SQLite均finally關閉。最終evidence SHA、push／CI狀態由本批唯一result record供coordinator review。

## S0 main integration — 2026-10-28

Coordinator revision7接受19e9ae2作完整量度基準，明確保留A1–A4/V failures並授權整合。Preflight clean，fresh mainfdc4a0c／feature5:0，no-ff merge成c802bba，無衝突；整合後root npm test、npm run build及git diff --check全部PASS。Source/tests/package/lock與接受checkpoint完全一致，既有browser evidence適用，沒有虛報新browser/FPS。詳細[整合紀錄](../../artifacts/closeup-polish/S0/integration.json)及logs；此後文件／evidence更新不改runtime。Push前再fetch並確認ancestor；最終main SHA、實際main CI、cleanup及writer release由本批result-S0-integration.json記錄。原root舊feature checkout與所有原圖不動；長feature分支保留，未部署或開A–D。

## Sector A preflight — 2026-10-28

指定唯一clone `.task-relay/closeup-polish/checkout` 開始於clean main `3d0f40e`；fetch成功、main/upstream0/0，無.codegraph。原S0 owner明確release；切回既有`feat/closeup-polish`並按dispatch明確ff-only至驗證main，feature對remote ahead2/behind0（S0整合與文件）。主checkout未改。只做ne:focal → ne:district → energy:garden，ART／既有原圖足以定義本次目標，未需dream-loop。r1只改SHOTS數值；保留全主體量度及所有原門檻，進度／source patch見`artifacts/closeup-polish/A/round-state.json`。

### A r1 checkpoint／r2 implementation

r1 `2c39678` 保存24狀態48原圖、22比較及8組×2效能；A6 24/24 PASS，A3全部20可用主體仍FAIL，district A2 FAIL。r1是pose試驗，hero runtime未變而FPS上升，因此不把升幅當優化成果。r2才打磨Park原GLB五片葉簇（保持原frond envelope／cached GLB不變）、fallback樹冠、較窄透明環與支承；EnvironmentDistrict細化既有植栽screen／pergola，第一水庭加支承邊光（在garden2 clone之後，第二庭未改）。SHOTS修正district瞄準點及第一庭側視角；target映射、數量、footprint、hero/FOV42、三秒與時間線保持。實作／完整矩陣／效能／live／最終限制集中在[本批證據](../../artifacts/closeup-polish/A/README.md)，未接受美術。


### A final verification — 2026-10-28

Owner worker `01a17e2a-4c38-7422-8d68-33782c0367f5`，runtime `b7d5861`；三輪各24/24、48原圖、22比較、8組×2有效uncapped完成。Final24張原圖逐張review，144靜態＋3 live hash保存，S0原234張hash不變。A1/A2各20 PASS、4 N/A；A3 20 FAIL（focal2/9、district0/9、第一庭0/9）、4 N/A；A4僅1/22。A5/A6各24/24 PASS，repro14/24、失敗10保留。V1 FAIL12、V3 FAIL22、V5 FAIL8；未經owner美術或真人辨識接受，三輪後停止本批美術迭代。

Final平均90.95–104.47FPS，vsync59.9–60.2，各shot達S0的95%及mean／instant draw≤110%。Root test/build PASS，實際scratch live九項PASS、error0（v3 NE＋v4第一庭）；精確三秒靠root測試，不把每120frame browser診斷當精密計時。R2首次batch測試失敗及合批修正保存；最終49 batches、第二庭原幾何、所有權威target/counts／hero/FOV42／timeline不改。Final focal恢復S0 pose，district／第一庭採新pose。

詳細[checks](../../artifacts/closeup-polish/A/checks.json)、[source hashes](../../artifacts/closeup-polish/A/r3/source-hashes.json)、[review](../../artifacts/closeup-polish/A/REVIEW.md)與[cleanup](../../artifacts/closeup-polish/A/cleanup.json)。僅開發Mac Chrome1920×1080/DPR1/default；未測展示硬件／其他平台／Z／真人，A未重跑production smoke。Vite5194／Chrome／runner／scratch全停、port free。最後文件／證據checkpoint、remote可取性、writer release和callback delivery記於checkout外`.task-relay/closeup-polish/result-A-1.json`；shared state只由coordinator更新。


## Sector B final — 2026-10-28

B由clean `def2f28`續同一長branch；fresh fetch upstream0/0，未pull/merge main。r1完整量度後實際provider limit中斷checkpoint，r10同owner復原，r1 source／原圖hash核對一致，沒有重跑或覆寫。Sandbox DNS/listen拒絕的原log及成功retry保存；r1/r2/runtime三個checkpoint均push。

r3完整18狀態、16 A4、6組×2效能窗，三輪合計54狀態／108 JPEG，18 final及2 live原圖已檢視。[報告](../../artifacts/closeup-polish/B/REVIEW.md)：A1/A2 16 PASS＋2 N/A；A3 16 FAIL（0/9）；A4 0/16；A5 focal6 FAIL、其餘12 PASS；A6 18 PASS。V3全部FAIL，focal V1/V2/V5各6 FAIL且較r2退步。Root test/build/diff、物理／入口／oculus checks及八項scratch live PASS；精確3s是node證據，browser只證實中間easing及恢復。全部實際FPS、版本差異、原圖及limits見report；所有owned服務結束、5194/52505 free。未改A park/energy及非SharingDistrict source；無新依賴／素材／部署。README啟動及AGENTS產品／工作流沒有改變，按sync表不改其文案。

## C preflight / focal r1 — 2026-10-28

Worker `01a17f7d-839f-74d0-8660-22e9c1ec1435`在指定clone接手；HEAD ca22a92769e596b3c168ae0579aadef4b5420d9d，clean、fetch PASS、upstream0/0、vs origin/main10/0；沒有.codegraph。A/B writer已釋放，pending art及全部S0/A/B source/evidence保留，不merge main。以ART/mastertaste和實際原圖作局部目標，沒有使用dream-loop。r1只調SE focal pose，完整6狀態加hero雙take；前景大樓遮住主體，比S0退步，A1/A2不作美術接受依據。原圖與raw量度保存於C/r1/se-focal；未完成C最終驗證。

C r2：完整8狀態／16原圖、4組雙窗口效能與6比較完成，A4 3/6；root npm test/build/diff PASS，只有既有JSON import及chunk-size warnings。Provider-limit recovery r16以同owner／dirty source恢復，fresh fetch upstream0/0；r2證據未覆寫。Low以<10 local units的服務廊取代空高桿、mixed中央void、高塔轉接肋，權威counts及footprint不變；r3 pose／最終驗證仍待做。

C district r1：完整18狀態（10普通tier、2hero、6配對）／36原圖，4組雙flag效能、16像素比較保存；A1/A2全部16主體狀態PASS、A3全部FAIL、A4 0/16。完整carrier已避開near plane，box仍超出viewport；原圖偏俯視，不作美術接受。Focal r3 pose及低層升降核心已authored且target tests PASS，最終matrix按C累積source策略延後。

C district r2：18狀態／36原圖、4組雙窗口效能、16比較完成；A4 0/16、low-solar A2因卡區重疊6.2%FAIL，其餘普通tier A1/A2通過而A3仍FAIL。連廊改為有地板／頂蓋／側框的可通行空間，solar canopy支架落在既有pod-family屋面內，綠冠沿用leafyCrown、權威counts/slot/footprint不變。Central-passage ray及屋面落點測試PASS，root test/build/diff PASS；完整能源清場324 cases PASS。R2圖仍偏岸邊，r3只重新對準central/SE，保留full carrier量度與未過gates。

C district r3：三輪用完，完整18狀態／36原圖、4組雙窗口效能、16比較完成；最後18張原始第二take逐張以original detail檢視並記V1–V6。A1全部16主體狀態PASS，A2/A3全部FAIL，A4 0/16。+3 uncapped89.4979/88.6143FPS、925calls，S0 94.1664/93.1634FPS、743calls；FPS平均剛達95%而calls約124.5%明確超110%。Low／solar夜間辨識、forest夜間配對、綠化及dock看似懸空的載荷路徑缺口均保留；不做第四輪。Hero raw有一次1318calls影格，保留不挑走。下一步ring，focal r3完整矩陣仍按C累積source策略待拍；全C最終root/live驗證尚未完成。

C ring r1：pose-only完整8狀態／16原圖、4組雙flag效能與6比較完成；A4 0/6，present ring A1/A2 PASS、A3 FAIL，absent baseline如實N/A。Mixed uncapped97.5202/97.9364FPS、447calls，S0 98.1494/99.8312FPS、443calls。Chrome於首個mixed載入意外關閉，原因未知，四個完整row／八張原圖及failure log保存；auto-review先拒絕combined retry的潛在覆寫，經skip-complete、防覆寫assert、缺失狀態及原圖hash核對後，capture-only續拍獲准並完成。原八張hash及原四row不變、source/helper/Chrome156.0.8078.73一致；效能／比較分開建立新檔。下一輪只以既有batch補轉子季度操作標記。


## C final verification — 2026-10-28

Runtime `b5ce8fe`，focal／district各三輪、ring兩輪後停止；final focal r3延後至全部C runtime完成才拍，沒有混用未量測pose/builder。共94狀態、188靜態＋3live原圖，34張final及3張live以original detail逐張檢視。[完整比較](../../artifacts/closeup-polish/C/REVIEW.md)／[checks](../../artifacts/closeup-polish/C/checks.json)／[source hashes](../../artifacts/closeup-polish/C/final-source-hashes.json)。A1 24 PASS／2 FAIL／8 N/A；A2 10／16／8；A3 26 FAIL／8 N/A；A4 4/28；A5 10 PASS／18 FAIL／6配對UNVERIFIED；A6 34 PASS，repro10 PASS／24 FAIL全部保留。V1九項FAIL、V3全34 FAIL、V5五項FAIL、dock V6兩項FAIL；其餘靜態V6不證明完整動態無閃爍。

Final平均84.77–98.99FPS、vsync59.8–60.2；focal日景91.86FPS＝S0 93.0% FAIL，ring夜景93.68FPS＝93.8%、其hero84.77FPS＝94.8% FAIL，district925/743calls＝124.5%超限。Raw陰影call樣本1090／1318／1320保持，不過濾或用重跑取代失敗；六個pairings無同狀態S0 draw基準，A5保持UNVERIFIED。版本Chrome156.0.8078.73與S0 .48不同，數字含累積A/B/C source，不能當隔離C優化。

Low服務廊保持occupied、<10local units且在原lot；mixed rails／高塔轉接肋、可通行district連廊、既有leafyCrown細化、落屋面solar支架及四個稀疏ring操作標記均使用既有材料／instancing。未改權威counts／target／slot／footprint／hero／FOV42／timeline，未新增依賴／素材／protocol。Ring停於2≤3係局部視覺修正完成；不填中空或捏造b/mixed差異去追A3/A4，也不靠無實作變更的重測換走A5失敗。背景球冠與整圖綠化、C低／中狀態辨識、district裁切／配對載荷路徑缺口照報，建議owner暫不接受C美術；如需超出round上限另授權。

Root test/build/diff、capture/report邊界自檢、[scope assertions](../../artifacts/closeup-polish/C/scope-check.json)、324能源清場cases／177219 exact checks PASS；既有JSON import／chunk-size warnings保留。[Scratch current-v4 live](../../artifacts/closeup-polish/C/live/browser.json)11項PASS、error0，證實中間easing、reload／Undo即時hero及counts、reduced motion無pulse、ring局部fade；精確三秒靠node suite而非120frame browser診斷。S0 234／A147／B110張原圖hash重驗不變；C191張manifest保存。Ring r1意外Chrome關閉、auto-review初次拒絕combined retry與最後安全capture-only續拍的原log／partial／hash證據均保留。

[Cleanup](../../artifacts/closeup-polish/C/cleanup.json)：本輪Vite PID46877核對clone後SIGINT關閉，5194／50033 bind確認free；所有owned Chrome／runner／scratch服務關閉。僅開發Mac Chrome1920×1080/DPR1/default，未測production／展示機／Safari/iPad／Windows／真人／Z。README啟動／AGENTS產品或工作流未改，按sync表不改其文案。完成文件／diff review及feature push後以唯一result-C-1.json回調現任coordinator；worker不自行開D/Z或merge main。A/B pending只阻其art merge，coordinator可繼續獨立D，然後Z全城比較。


## D preflight — 2026-10-28

Worker `01a18154-a9bd-7ca2-a776-9a2834a519da`，dispatch `closeup-polish-D-1-r18`在唯一clone接手：clean `3bb99ce2485aeb4b816e2ef21f8b74fb42328b08`、fetch成功、upstream0/0、vs origin/main18/0；main `3d0f40e`，無.codegraph。C writer/services已明確release；A/B/C source、原圖及pending美術全部保留，不merge main。已核人類原execution message及取消百分比門檻，沿task-relay／ponytail；ART/mastertaste與原圖足以定局部目標，未使用dream-loop。NW→第二水庭→機翼→島逐shot；四個NW／SE dock跨軸額外rows獨立標記，原98矩陣不變，欠同狀態S0的A5維持UNVERIFIED。首個sandbox Chrome launch失敗（無圖/row）與原log保留，fresh目錄retry獲准。進度與原證據見[D工作目錄](../../artifacts/closeup-polish/D/README.md)。

D focal r1：8狀態／16原圖、4組雙窗效能及6比較完成，A4 2/6。Low/mixed A1高度24.8199%未過25%，high55.1096%通過；A2六個subject PASS、A3全FAIL。Shot82.3214/84.9667、hero82.3630/82.2273FPS，累積A/B/C/D與Chrome patch差異保留，raw calls/outliers不剔除。Root checks及checkpoint保存後才改r2，無美術接受。

D focal r3：三輪已用完，8狀態／16原圖、6比較及4組雙窗口完整，8張final第二take均以original detail檢視。A1/A2六個subject皆PASS、A3 hits [3, 3, 3, 3, 3, 3]仍全FAIL；A4 2/6。確切FPS／calls及原窗口見[D focal summary](../../artifacts/closeup-polish/D/focal-summary.json)。服務身份、low/mixed夜間差異及背景綠化FAIL保留；未接受美術、不開第四輪，下一步NW district。

D district r1：完整16狀態（含4獨立dock配對）、32原圖、14比較及4組雙窗量度保存，A4 0/14；14個subject A1/A2 PASS，A3全FAIL。完整box仍超出viewport，構圖太俯視令low服務館只讀成白屋頂，不因數字通過當美術接受。下一輪降低視角及細化原露台欄邊；NW選位／targets／配對語義保持。

D district r2：16狀態／32原圖、14比較及4組雙窗完成，A4 0/14；A2只4個subject通過，其他卡區重疊5.12–5.33%FAIL，A3全部FAIL。Root完整suite/build/diff及324清場cases已在此source PASS；正常calls／raw陰影樣本保留。R3保持已量斜角，只降低本AutomationDistrict材質clone自發光，修正實際圖中白屋面缺層次問題，不改global light或body。


## D final verification — 2026-10-28

Runtime `44521a0d63aae904c306a19c4baac52a44b62a87`，實際base `3bb99ce`；NW／wing各三輪、garden2／island兩輪，134 measured states／268靜態＋7 live originals，50 final與7 live原圖逐張original detail審閱。[完整S0／final](../../artifacts/closeup-polish/D/REVIEW.md)、[checks](../../artifacts/closeup-polish/D/checks.json)、[source hashes](../../artifacts/closeup-polish/D/final-source-hashes.json)。A1 34PASS／16N/A；A2 24PASS／10FAIL／16N/A；A3 34FAIL／16N/A；A4 4/40；A5 36PASS／10FAIL／4配對UNVERIFIED；A6 50PASS；repro21PASS／29FAIL。V1 22FAIL、V3全50FAIL、V5四項FAIL、V6八項FAIL；靜態PASS不證明完整動態無閃爍。

Hub六個recessed service faces、窗框及上層操作接點，district原露台／停機盤支承細節與局部ceramic emission，第二水庭clone獨立rebatch既有支架燈、受電翼局部solar粗糙度與板框邊燈、島甲板操作邊皆沿既有材料／batch。49能源batches、第一水庭／C環／distribution、target/count/slot/footprint與三秒／60秒cycle、hero／FOV42／timeline保持；scope及原模型tests已驗。沒有新資產／依賴、survey protocol、module-swap、部署或main merge。

Focal r3 A3 3/9比r2 4/9退步，day79.776比83.838FPS低，raw1335保持，不建議接受。Wing r2的98.14/99.70FPS／505calls新pose退步保留；r3用同builder實拍S0 pose後131.552/130.393FPS，但day raw378/604使平均491仍超S0 378×110%，A4 0/8，不做第四輪。District90.680/90.371FPS、875calls，10個subject卡區重疊5.12–5.33%FAIL。Garden2 103.248/102.531FPS、483calls；island104.985/103.747FPS、465calls、卡區3.3429%PASS。後兩者局部修正完成停2≤3；不填中空或捏造共用本體差異，也不做無改動重跑換掉失敗。建議owner暫不接受D美術，留Z後評審。

Root npm test/build/diff、capture/report/round self-check與scope PASS：108權威/wire/model組合、324 district/history/receiver cases／177867 exact checks，既有warnings保留。[Scratch current-v4 live](../../artifacts/closeup-polish/D/live-retry1/browser.json) complete、23PASS／errors0；五shot hold與正式卡片相符，中間geometry/fade、reload／Undo counts及hero、reduced motion通過。精確三秒靠node suite，120frame browser診斷不作3.000秒精度宣稱。首輪live等待未變targetAutomation讀舊counts而FAIL，原2圖/log/browser/hash保留，只修fixture wait並保留完整deep equality，在fresh目錄完整重跑。首個sandbox Chrome launch、root listen EPERM、service-face ray首測邊界log與所有被否決的離線pose prediction均保存。

[原圖保留核對](../../artifacts/closeup-polish/D/original-preservation.json)：S0 234／A147／B110／C191 hash不變，268張tracked D圖對c63f2f2不變，D275張manifest完整。每shot final為其最後local-round source snapshot，後續細節可改背景，Z另驗全當前累積source；四個NW-view配對缺S0同狀態image/draw，A5 UNVERIFIED。Chrome156.0.8078.73對S0 .48，不能當隔離D提速。Garden2 r2初段capped capture與root test重疊，uncapped前suite已結束，原rows不修改。

[Cleanup](../../artifacts/closeup-polish/D/cleanup.json)：owned Vite PID2325/cwd核對後SIGINT；5194／52149／52371／52592／52689／52760 bind確認free，owned Chrome／runner／scratch SQLite全關。只驗開發Mac Chrome1920×1080/DPR1/default；未測展示硬件、production、Safari/iPad、Windows、真人兩秒或Z。README啟動及AGENTS產品／工作流無改，依sync表不改其文案。最終docs/link/diff review及feature push結果見result-D-1.json；writer/services release後由coordinator接D review，再分派Z，A/B/C pending不變。


## Z preflight — 2026-10-29

唯一writer `01a183af-1ca0-7190-a25c-b31a6db4fd98`，dispatch `closeup-polish-Z-1-r21`。指定clone clean `feat/closeup-polish` @ `4a3ad9fab51cd471a0cfa08a81a6b9ab4a722aca`，runtime `44521a0`；sandbox DNS fetch失敗後授權retry成功，upstream0/0、vs origin/main34/2，main `545bff2`。主root與原圖保留，clone無.codegraph；D writer/services明確release後接手。已核原人類execution／standing契約與取消百分比門檻，sharedstate只coordinator寫。

`origin/main:docs/handoffs/closeup-next.md` C1已核：續D review→Z→owner review；F1/F2/N1獨立，本批不實作或自動merge main新文件。S0/A/B/C/D共957原圖hash全部一致，完整src/tests/package起始hash保存於[preflight](../../artifacts/closeup-polish/Z/preflight.json)。Z不改runtime／pose／美術或門檻，重用capture.mjs完整98雙take、獨立28組雙窗效能及96A4；Chrome實際仍156.0.8078.73，S0 .48差異明列。

Root test首次sandbox listen EPERM log保留，授權重跑完整suite及build PASS；survey只build供scratch Guest/Admin fixture，不宣稱獨立package suite。新report/live量度腳本自檢PASS。當前仍RUNNING，進度與服務ownership見[progress](../../artifacts/closeup-polish/Z/progress.json)；未完成98原圖審閱／live／final report前不宣稱Z完成，A–D及A3/A4政策pending保持。
