# sw-event-shelf — SW 新旗艦：活動モジュール棚

- Owner: cc100053
- Status: R2 IMPLEMENTED — 待 owner 視覺驗收（未 merge）
- Branch: `feat/sw-event-shelf`（worktree：`.claude/worktrees/sw-event-shelf`，由 origin/main e13689b 切出；主 checkout 的無關未提交變更原封不動）
- Base commit: e13689b3fd97eea312d421acac3fbe185b448ecc
- Last verified commit: R2 commit（見 git log；測試與 build 於提交前通過）
- Remote availability: `origin/feat/sw-event-shelf`（R1 94ec964；R2 見下）
- GitHub Issue (optional): 無

## Session Git state

- Session starting branch and HEAD: main e13689b3fd97eea312d421acac3fbe185b448ecc
- Last fetched origin/main commit: e13689b3fd97eea312d421acac3fbe185b448ecc（2026-11-13 fetch 成功，本地 main 與 origin/main 無分歧）
- Local changes present at session start: 保留 `artifacts/energy-city-polish/*`、`artifacts/nw-closeup-polish/spec.md`、`docs/BLENDER.md`、`docs/README.md` 的修改，以及 `.agents/skills/blender-*`、`Dev_QA.md`、多個 `artifacts/` 子目錄（未提交、與本任務無關）
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

以 owner 提供的目標圖（mixed 狀態）為依據，新增 SW 旗艦「活動モジュール棚」，作為 SW focal 的 **0（mixed）狀態**；−1／+1 觸發時，此棚由另一座建築取代（見「Important decisions」），不再做棚的三態。由 owner 以目標圖驗收。

- 設施（2026-11-13 owner 決定）：十層（10 層 × 4 m ≈ 40 m）、平面 3×2（約 36 × 24 m）的深灰立體框架，共 60 格，每格約 12 × 12 × 4 m；模組為獨立完整的小建築，少數可做雙層高（8 m）大廳；地面兩條軌道通往道路。
- 搬運（方案 A）：屋頂吊桁保留，屋頂軌道向前後各伸出 6–8 m；前後立面柱上設垂直導軌，模組四隅連結部扣住導軌，吊桁以纜索沿外牆升降；到目標層後，模組以自身驅動靴橫移 12 m 入格，四隅連結部閃青光鎖定。地面層直接由軌道入場。後排格由頂層「轉運層」（常空）越過屋頂，再沿後立面放下。
- mixed 狀態暫定入格約 35／60，具體分佈待目標圖。
- 完成準則：closeup-polish 流程的 rubric 全部達 2 並由 owner 接受；`npm test`、`npm run build`、`git diff --check` 通過。

## In-scope files and dependencies

- 預計動到：`src/layout.ts`（`changeSites.sw`）、`src/siteBuilders/commonsPlaza.ts`（退役或改寫）、`siteRuntime.ts`、`siteBuilders/index.ts`、`src/cityChangeManager.ts`、`src/districtMeters.ts`、`src/stages.ts`、`src/headlineCamera.ts` 的 SW 鏡頭、`src/surveyAtmosphere.ts` 的 SW 文案。
- 相關測試：`tests/commonsPlaza.test.ts`、`odaiba.test.ts`、`cityChangeManager.test.ts`、`surveyAtmosphere.test.ts`、`surveyMeterPipeline.test.ts`、`energyPipeline.test.ts`、`headlineCamera.test.ts`，以及數個 `tests/*.browser.mjs`。
- 文件：`docs/EXHIBITION_SPEC.md`、`PROJECT.md`、`RESIDENT_SCENE_PLAN.md`（SW focal 列）、`RESIDENT_COPY.md`、change sheet（`scripts/changeSheet.ts`）。
- 建模：Blender GLB，先讀 `asset/models/LIBRARY.md`；與住宅 U（固定骨架＋可交換生活艙）概念相近，須沿用其軌道／吊運部件並加入庫。
- 排除：四題、Meter、DB 契約、live 時序、其他三個 site。

## Completed work

- 決定（2026-11-13，owner）：跟投票變化，掛 publicSharing；作新 SW 旗艦（移動 SW focal socket，非新增第五個 site）；COMMONS PLAZA 退役；不須背海。
- 地點：(−100, 320)，建造中心暫定約 (−100, 312)。掃描方法、錯誤更正（首選 (40, −300) 為 NW AUTO HUB 用地）及候選見 `Dev_QA.md` Q12。
- 證據夾：`~/city2127-evidence/sw-event-shelf/`（`baseline/target-0-mixed.jpg`、`prompts.md`、`gen/`）。
- （已作廢，2 層版本）−1／+1 目標圖 v2（Gemini，2390×1792，owner 2026-11-13 要求「−1 不用捲閘、要未來感私密」「+1 加強開放」後重生成）：`gen/state-minus1-v2.jpg`（智能隱私玻璃、青色邊光、鎖燈、弧形霧面玻璃屏加植栽帶、無人；吊桁停放但仍有纜索垂下）、`gen/state-plus1-v2.jpg`（上層兩大格完全空框可望穿、吊桁吊起一個模組、地面層開放市集約 30 人、地面層只留一個模組；背後多一根直柱）。v1 保留作對照。待 owner 驗收。

## Actual validation results

- Verification status: 見下「2026-11-13 實作」；`npm test`／`npm run build`／`git diff --check` 結果以本節末為準
- 2026-11-13 實作（`feat/sw-event-shelf`）：
  - spec：[artifacts/sw-event-shelf/spec.md](../../artifacts/sw-event-shelf/spec.md)。模型 `asset/models/event-shelf-2127/`（`build_shelf.py` 無頭 Blender 5.2；SHELF_FRAME 3,284 tris、MOD_A..H 1.9k–3.6k tris、GLB 約 860 KB、20 個 `sw_*` role）；新庫部件 `event_module`、`lattice_frame`（modules.py，draft，已入 LIBRARY）。
  - 接入：`src/siteBuilders/eventShelf.ts`（60 格 → 39 候選、count = 31 + sharedSeats、實例化模組、屋頂吊桁程式內建、headline 單模組搬運路徑 3 s、`installGlb`）、`commonsPlaza.ts`（mixed parts 換成棚＋地台綠化與大堂人群；−1／+1 不變）、`changeSites.sw` 搬到 (−100,312) 且 h 10、`SITE_ASSET_CATALOG` 加 `event-shelf-2127`（plaza layer 帶 asset，程序化 fallback 保留）、SW focal／district shot 更新。
  - 影響面處理：`SW_LEGACY_LOT`（舊 SW 地塊維持無樹，避免 `coastalCanopy` 索引位移）；**共享庭園 court 6 由 (−137,286) 搬到 (−150,290)**（與新地塊重疊；已過同一組地面／遮擋檢查，`tests/odaiba.test.ts` 的 > 60 m 規則改為與地塊在一軸上相距 ≥ 6 m）；place 文案暫改為「お台場南岸」（owner 請確認）。
  - 截圖（`~/city2127-evidence/sw-event-shelf/r1/`，不入 Git）：`focal-day.png`、`focal-night.png`（3200×1800）、`hoist-sheet.jpg`（mixed→+1 過場 6 幀，含棚滑出）。吊桁完整搬運（seats 變動、mixed 內）只由 `tests/eventShelf.test.ts` 驗證，未截關鍵幀。
  - 已知問題：地軌只到地塊邊（z −20），未接 75 m 外街道；導軌 4 條（B 圖 2 條）；結果卡／設施文案（`surveyAtmosphere.ts`、RESIDENT_COPY、change sheet）仍寫 COMMONS，未改；change sheet 未重生成；−1／+1 北緣超出 `DISTRICT.maxZ` 約 12 m 未另處理；服務航道（30–45 m）與 40 m 棚的路線未查；FPS 未測；QA：`qa_check` 在 render profile 報 internal 重疊的 z-fighting（柱梁接合處、模組牆板，已錯開外露面，餘為內部）。
- Date and checked commit/worktree: 2026-11-13，只做臨時掃描探測，已刪除
- Commands/manual checks and results: 臨時測試檔檢查 `city` 內射線遮擋、地面類型、路線距離；核心 36 × 24 m 通過。60 m 四角未逐一驗證
- Evidence/environment: 同上證據夾
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: 無

- **R2（2026-11-13，owner 對 R1 的意見）**：詳見 [spec R2 節](../../artifacts/sw-event-shelf/spec.md)。改了什麼：
  - 框架：柱 1.3 m、樑 0.9 × 0.8 m、120 個 2.0 倒角連結塊、中性深灰；導軌前後各 4 條（0.5 寬淺軌 + 底座 + 齒條 + 青燈）；屋頂軌道白箱梁，前後各伸出 7.5 m；吊桁雙大梁 + 青端台車 + 兩部台車各一大絞盤鼓。
  - 模組：8.6 × 8.6 × 3.2 m 大圓角膠囊（`event_module` 重寫，新 variant E／F，新 role `joint` `grey` `oak` `glow_y` `glow_w` `glow_c`），窗縮為 R1 的約 40–45 %，GLB 內不再有家具與人物，滑軌隨模組。
  - 佔位：默認 33／60（`SHELF_BASE_SEATS` 29，最大 37）；三個靜態示範姿態（`track` 地軌入場、`slide` 第 3 層半滑入、`hang` 右立面約 22 m 高吊掛，緩慢升降）；headline 恆走前立面左／中柱列，雙台車（A 持 `hang`、B 跑 headline）。
  - 檔案：`modules.py`、`build_shelf.py`、`review_shelf.py`、`eventShelf.ts`、`assetCatalog.ts`（role、footprint 72.4 × 76.4、maxHeight 41.5）、`commonsPlaza.ts`（一個 walker 避開右軌）、`tests/eventShelf.test.ts`、`LIBRARY.md`、`EXHIBITION_SPEC.md`。
  - 截圖（`~/city2127-evidence/sw-event-shelf/r2/`，不入 Git，3200 × 1800，playwright-cli 無頭，DEV `?reviewTime=20&meters=sw:mixed&hour=12|22&shot=sw:focal|sw:district`，特寫用 `window.cityPose`）：`focal-day.png`、`focal-night.png`、`overview.png`、`gantry-closeup.png`、`rail-hang-closeup.png`、`window-module-closeup.png`、`r1-vs-r2.jpg`。
  - **R2 驗證（2026-11-13，本 worktree，R2 提交前）**：根 `npm test` 通過（`tests/commonsPlaza.test.ts` 的 35→33、31→29 期望已更新）、`npm run build` 通過、`git diff --check` 通過。`survey/`、`module-swap/` 未動、未跑。FPS **未量測**（不要引用任何 FPS 數字）。截圖為無頭 Chrome。
  - **對 brief 仍未達標或未驗證（如實）**：(1) 半滑入格模組在 `focal-day` 遠景只略凸出，須特寫才清楚；(2) 地面入場模組被前景樹冠部分遮住；(3) 模組 8.6 m，非建議的約 10 m（空隙 1.05 m，低於「≥ 1–1.5 m」的上端）；(4) 導軌 4 條非 2 條；(5) hoist 過場未截關鍵幀；(6) FPS、reduced-motion 手動檢查未做；(7) 北緣超出 `DISTRICT.maxZ` 未處理；(8) owner 已看過 R2 並要求 R3，具體意見由該 session 處理。
  - 驗證：`tests/eventShelf.test.ts` 通過（GLB 22,068 tris、約 995 KB、角色與 bounds、槽位表、headline 候選皆前排、GLB 置換與單模組 hoist）；其餘結果見下「R2 驗證」。
  - 未驗證：吊桁搬運過場（hoist）未截關鍵幀（僅單元測試）；夜景 hoist 未看；reduced-motion 未手動看；−1／+1 未重截（只改了一個 walker 位置，不影響它們）。
  - 已知問題（R2）：模組 8.6 比 owner 建議的 10 小（見 spec）；導軌 4 條；半滑入格的模組在遠景只略凸出，須近鏡才清楚；地面入場模組被前景樹冠部分遮蔽；桁頂約 45 m（服務層上緣），quadrotor 路線未查；結果卡／設施文案（`surveyAtmosphere.ts`、RESIDENT_COPY、change sheet）仍寫 COMMONS，未改；change sheet 未重生成。
  - **北緣與 `DISTRICT.maxZ`（320）**（計算值，非截圖測量；site 中心 z 312）：棚身北立面 z ≈ 324.7（超出 4.7 m）、後導軌 ≈ 325.5、地台 ≈ 328（以 `lattice_frame` 的 paving 計）、屋頂軌道北端 ≈ 331.5（超出 11.5 m）；−1／+1 模型地板 13.2 × 11.2 單位（scale 4）→ 北緣 ≈ 334.4（超出約 14.4 m），綠籬 ≈ 332.8。概覽截圖未見可見的接縫或 recede 異常，但 `bayContext`／`odaibaScene` 的 district mask 在 z > 320 的行為未逐一驗證。**未處理**：搬位或縮小會違反既定地點；選項見 spec 與回報。

## Code findings (2026-11-13, read-only)

- `changeSites.sw` 為 w12 × d10 單位、scale 4，即實際約 **48 × 40 m**（前文與文件稱「12×10 米」係單位，不是米）；故現有 −1／+1 模型本來就近 60 m 地塊大小，搬位幾乎不用縮放。以 scale 4 計，4 m 一層 = 1 單位，模組 3×3×1 單位，棚 9×6×10 單位，`h` 須由 5 改為 10。
- `src/siteBuilders/commonsPlaza.ts` 已按 `band`（low／mixed／high）切換 `Part`，由 `createCommonsPlazaRuntime` 做 3 秒過渡。做法：保留 low／high parts，把 mixed parts 換成棚。
- `changeSites` 有 30 個 caller（`voteJourney`、`skyways`、`devScaleLab`、`environmentPark` 等），改 x／z 會自動帶動旅程著陸與標記；SW 近鏡 shot 與 `tests/odaiba.test.ts` 的遠距清空測試須逐一更新。
- 48 × 40 m 的 −1／+1 在 (−100, 312) 的北緣約 z 332，超出 `DISTRICT.maxZ` 320 約 12 m，須在放置後檢查。

## Known issues and blockers

- 掃描只射線檢查 `city`，不含 survey change sites、住宅 M／P／U、能源設備及 Sky Ring；本地點已手動對照四個 change site，其餘須在放置後以 DEV 渲染確認。
- 高 40 m 落在服務層（30–45 m）：已讀 `src/layout.ts` 的航道定義，shore lane（80–100 m）全部在北岸 z ≤ −28，距 (−100, 312) 超過 340 m；regional 航道在 160 m 以上。服務層屬 NW 服務灣的 quadrotors，另需確認其路線不穿過此地（未查）。
- 目標圖為 2 層，十層版須重生成。
- 地塊北半跨出 `DISTRICT.maxZ`（320）；地塊邊緣有 surveyed-coastal-canopy 樹列，`plantCanopy` 按索引排序，移動或刪樹會令後續樹冠位移並令 odaiba 遠距測試失敗，樹列只當邊界植栽保留。
- 最近街道在 75 m 外，正面朝向未定。
- COMMONS PLAZA 退役會影響 SW shot 表、headline 鏡頭測試、結果卡文案與居民表，須逐項更新。

## Important decisions

- 2026-11-13 owner：高度 40 m（十層）；搬運用方案 A（外壁導軌＋屋頂吊桁）；棚只做 mixed 狀態，−1／+1 觸發時由另一座建築取代。取代用建築：owner 確認沿用現有 COMMONS PLAZA 的 −1 私密庭園與 +1 開放廣場模型（`src/siteBuilders/commonsPlaza.ts`、`COMMONS_VARIANTS` in `src/changeCatalog.ts`），搬到新地並按地塊縮放；即 COMMONS PLAZA 的位置退役，模型保留。
- 投票過場只有 3 秒：只讓 headline 模組做壓縮的完整搬運動作（吊升、橫移、鎖定），其餘模組靜靜滑入或淡出；近鏡停留的 13 秒內吊桁可做慢速環境循環。

- 保持「四個 site」契約，用搬 socket 而不是新增第五個。
- 目標圖只作建築依據；三個 Meter 狀態均為成熟 2127。
- 視覺驗收由 owner 單獨決定。

## Next expected step

1. 重生成十層版 mixed 目標圖（現有目標圖為 2 層）；查 40 m 與服務航道的關係；再讀 `commonsPlaza.ts`／`changeCatalog.ts` 確認搬位與縮放方法。
2. 建立 `feat/sw-event-shelf`（工作樹有無關未提交變更，須先協調）。
3. 以 closeup-polish 流程寫 rubric 與 spec（含 Library 表），再進入 Blender 建模。
