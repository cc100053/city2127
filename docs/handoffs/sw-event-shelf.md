# sw-event-shelf — SW 新旗艦：活動モジュール棚

- Owner: cc100053
- Status: R3d（字幕與說明卡日文文案、文件、change sheet）完成 — 動畫已由 owner 驗收（未 merge）
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

- **R3（2026-11-13，owner 採納助手對 R2 的修改清單）**：詳見 [spec R3 節](../../artifacts/sw-event-shelf/spec.md)。
  - 改了什麼：(1) 窗：三種低飽和窗面 `sw_pane_w/a/c`（取代 `sw_glow*`），細框、窗台、窗內扁平剪影（人、桌椅、植栽，貼在窗面，非立體）。(2) 模組：七款各有入口（門、雨篷、兩級踏階）、窗雨篷／條紋雨篷、色塊側板、分板線、屋頂設備；平面圓角 1.4 → 1.1 m。(3) 框架疏朗：去掉內部沿 z 的樑、接頭塊隔層（120 → 40）、齒條 4 m 間距，框架 8,876 → 4,476 tris。(4) 吊桁台車縮小約一半，白灰＋青，後端軌道伸出 7.5 → 2 m。(5) 三姿態：地軌延伸 10 m 至 z −32、`track` 模組前加小台車、`slide` 模組四角常亮青色鎖燈；`sw:focal` 改為 [-84,50,211] → [-100,19,288]。(6) 北緣：地塊中心 z 312 → 297，見下數字。(7) 吊桁關鍵幀：DEV 鉤子 `globalThis.__eventShelf`（僅 DEV）＋凍結 `performance.now`。
  - 北緣實量（GLB 邊界，場地中心 z 0：z −22.17…+14.60；−1／+1 地板半深 22.4 m）：中心 297 → 棚身北立面 309.7、屋頂軌道北端 311.6、地台 311.0、−1／+1 地板北緣 319.4（≤ 320，餘 0.6 m）。R2 值：324.7／331.9／328／334.4。`tests/odaiba.test.ts` 通過、不動樹冠。
  - 驗證（2026-11-13，本 worktree）：根 `npm test` 通過、`npm run build` 通過、`git diff --check` 通過；`tests/commonsPlaza.test.ts` 的 z 範圍對 mixed 放寬 10 m（地軌延伸）；`tests/eventShelf.test.ts`：GLB 21.9k tris、約 974 KB、單層模組高度 < 4.25 m。`qa_check` 與重新匯入核對：未另行重跑（只用 `tests/eventShelf.test.ts` 的 GLB 重新載入核對 role／bounds／tris／bytes）。`survey/`、`module-swap/` 未動、未跑。
  - FPS（`fps.sh`，headed Chrome 1920 × 1080、dpr 1、`sw:mixed`，與 dev server 同機、dev 模式）：日 18.9–19.0、夜 19.0–19.1（首樣本 5.7 捨棄）；未與 R2 或 main 對照，無法判斷是否退步。reduced-motion 未手動看。
  - 截圖（`~/city2127-evidence/sw-event-shelf/r3/`，不入 Git，3200 × 1800）：`focal-day`、`focal-night`、`overview`、`gantry-closeup`、`rail-hang-closeup`、`window-module-closeup`、`track-tug-closeup`、`hoist-sheet.jpg`（6 幀）、`r2-vs-r3.jpg`。
  - 已知問題／未達：導軌仍 4 條；斜俯視中排與後排樑仍疊成密線，疏朗度不及 B 圖；窗內剪影偏粗；模組 8.6 m；右側地軌延伸與 court 6 的傘形頂在俯視重疊；半滑入格與地面入場模組在 `focal-day` 可辨但偏小；前景樹冠仍遮部分地軌；桁頂約 45 m，quadrotor 路線未查；結果卡／設施文案、change sheet 未更新；夜間 hoist 未看。
  - 需 owner 決定：窗內剪影讀法（先前「人、傢俱不進 GLB」與本輪要求牴觸）、導軌 4／2 條、模組 8.6／7.7、地塊南移 15 m 是否接受、地軌是否接街道。

- **R3b（2026-11-13，起點 8163d3a，只動動畫／時序碼與測試，建模外觀未動）**：
  - 方法：`survey dev:auto`（新 scratch DB）＋ Vite DEV ＋ 無頭 Chrome 1920×1080 dpr1；城市頁以虛擬 `performance.now`（凍結後每 0.25 s 手動推進）接真實 WebSocket，真實 guest UI 作答（第 2 題 publicSharing：首／末選項；`?dev-auto` 面板在此 repo 狀態下回報「質問画面が変わりました」，未深究，改用真實 UI 點選）。證據 `~/city2127-evidence/sw-event-shelf/r3b/`（不入 Git）：`e1..e4` 逐 0.25 s 全幀（0–15.5 s）、`contact-*.jpg`、`band-switch-before-after.jpg`、`before/`（改前同流程）、`hoist-*`、`flow-summary.json`、`immediate-restore.json`。
  - **時間軸（實測）**：投票旅程至拉近約 4.6 s → 過場由 ≈5.12 s 起（frame scale 於 5.25 s 起動，3 s 內完成）→ 鏡頭 13.25–15.0 s 飛回 hero（與 pre 幀逐像素差：15.0 s 起 ≈4/255，之前 ≈50）。四個事件（mixed→low、low→mixed、mixed→high、high→mixed）一致。
  - **重大發現**：live 階梯下 mixed 的座位恆 4（low 0／high 8），所以「mixed 內增減 meter（共有 ±1）」不會令 hoist 在 live 觸發；live 只走 band 切換路徑。hoist 只能由 DEV 鉤子、單元測試驗證與錄影。若 owner 想在 live 看到吊運，須另決定（例如 low／high→mixed 時 headline 模組吊入、或改 mixed 座位隨 tier 內變化），會牽涉 spec「band 切換不重做搬運」與投票階梯，本輪未動。
  - **發現並修正**：(1) band 切換時模組與框架一同垂直壓扁、同時滑動 → 模組 part 改為 `at 1, span .4`（先框架後模組／先模組後框架，`commonsPlaza.ts`）；(2) 地軌 `track` 的拖車與 `slide` 鎖燈在切換一開始即消失、吊掛模組纜索即消失 → 現隨模組同步滑動（`slideShift`）；(3) hoist 結束時纜索在 u=.66 突然消失 → 吊具回收（升回絞盤）；(4) 中欄 headline（`k4/6/8 c1`，DEV 計數 34／35／37）升降時與半滑入模組（k3c1）重疊約 0.1 m → 改在左導軌升降、頂端才橫移；(5) 地面入場無端出現 → 由地軌末端外（z −36.8）駛入（動畫起點外移，不新建道路、不動其他地塊），移除則反向駛出。
  - **逐項檢查**：模組穿柱／梁——`tests/eventShelf.test.ts` 對 DEV 可達的 30–37 計數、加／減兩向、每 0.05 s 檢查 headline 模組與其他模組及框架包絡（柱、層梁；fallback 框架＝GLB 外包絡）無重疊、單步位移 < 3 m、起點 z < −33、終點在格；通過（改前 6 組有重疊）。GLB 的導軌、齒條等細部未入檢查（只靠錄影目測）。纜索：每幀由絞盤到吊環／吊環到屋頂吊耳為連續線段，長度必隨台車與模組位置；台車 x 隨 `anchor.x`；纜索穿過吊桁大梁內部（鼓在梁上、纜下穿兩梁之間再外斜）只在梁內，鏡頭看不到。橫移段：模組底緊貼層梁頂（零間隙、無穿入），滑入前緣經前樑平面時柱均離 ≥ 1.05 m。鎖燈：u .88–.96，滑入結束（.88）後才閃。其他模組滑入：全體剛性前移 12 m，與框架無重疊；上升時框架先完成再滑入，無壓扁（見 before/after）。上述 band 順序由 `tests/commonsPlaza.test.ts` 新增斷言。
  - **立即恢復（`immediate-restore.json`、`reconnect.mjs`）**：Undo（admin API `undo-proposal`）、`reset-city`、頁面重載（snapshot）、reduced-motion 下的提案、重連（用 Playwright `routeWebSocket` 斷線期間提案，重連後）皆在虛擬 +0 s 即恢復權威狀態（scale／模組數正確）；斷線期間畫面維持舊狀態。第一版重連測試（`setOffline`）無效（連線未斷，只是 live 更新），已棄用。
  - **仍不足／未解**：(a) 模組滑出／入時整批剛性移動，spec 的「`order` 次序錯開」未實作；滑出至 12 m 外才消失（instancing 無淡出）。(b) 地面入場在 `sw:focal` 被前景 court-6 傘形頂遮住，只見由傘後駛出；入場起點 z −36.8 的地面物件（樹、其他地塊）未逐項查，只目測錄影無穿插。(c) 吊掛模組在 band 切換時纜索隨之外斜，並非真實吊運。(d) 夜景錄影、FPS 未測（不引用數字）；錄影為虛擬時鐘逐幀，非即時流暢度。(e) 中欄 DEV 吊運須有 headline 在 c=1，live 無此情況。
  - 驗證：根 `npm test`、`npm run build`、`git diff --check` 通過；`survey/`、`module-swap/` 未動（survey 只 `npm ci` 後跑 dev:auto）。

- **R3c（2026-11-13，起點 fcc03f2，只動動畫／時序碼與測試，建模外觀未動）**：owner 版本：進 mixed＝框架出現後 headline 模組走完整吊運；出 mixed＝headline 先吊出再收框架。時間表與節奏對齊見 [spec R3c](../../artifacts/sw-event-shelf/spec.md#r3c)。
  - 改了什麼：新 `src/siteBuilders/shelfTimeline.ts`（5 s、各段窗口、`headlineTransitionSeconds`）；`commonsPlaza.ts` 進／出 mixed 時 mixed 各 part 用秒窗口，相反 band 的 part 用 2.1 s 窗口；`eventShelf.ts` `setCount(…, band)` 的 `{dir, delay, seconds}` 吊運計劃（hoist 加 `seconds`，`visibleModules` 只計實際可見的 hoist 模組）；`resultTimeline.ts` `shotTimeline`／`reasonDelayMs` 加 `transition` 參數；`surveyAtmosphere.ts` 對 SW 焦點變化用 5 s 顯示原因文字。其他 site 與 `SITE_TRANSITION_SECONDS`、`DISPLAY_MS`、投票階梯、四題、DB 契約均未動。
  - 測試：`tests/eventShelf.test.ts` 新增 band 進／出（座位 4／3／2，兩向）每 0.05 s 檢查 headline 與其他模組、框架無重疊、單步 < 3 m、距目標格單調、出現／消失在自己的窗口、結束狀態＝立即狀態；`commonsPlaza.test.ts` 按 5 s 重排；`headlineCamera.test.ts` 加 SW 5 s、其他 site 3 s、閱讀 ≥ 2.85 s、回 hero 13–15 s；`surveyMeterPipeline.test.ts` 事件間隔 12 s、等 5.1 s。
  - 真實投票流程（`survey dev:auto` ＋ Vite DEV ＋ 無頭 Chrome 1920×1080 ＋ 虛擬時鐘，每 0.25 s 一幀，0–17 s，真實 guest UI 作答；腳本同 R3b，輸出 `~/city2127-evidence/sw-event-shelf/r3c/`：`e1-mixed-to-low`、`e2-low-to-mixed`、`e3-mixed-to-high`、`e4-high-to-mixed`、各 `contact-*-transition.jpg`（4.5–10.5 s）與 `contact-*-return.jpg`（10.5–16 s））。四組皆見到一次 `setCount`（帶 band 計劃）、5.12 s 起吊運，約 10.1 s 完成。
  - **逐項（如實，僅依 contact sheet 目測，只細看了 e1／e2／e4 的過場與 e2 的回 hero，e3 只當與 e1 對稱而未逐幀細看）**：(1) 吊運在 close-up 鏡頭內可見：鏡頭 4.62 s 到位，吊運 7.0–10.1 s 在畫面右下前立面上升、橫移入格，全程在框內。(2) 框架出現與吊運：框架 5.1–6.4 s 先起，模組 6.4–7.2 s 滑入，之後吊運，彼此不重疊；進入時 5.12–6.5 s 才見框架，約 1.4 s 內畫面主要是框架生長。(3) 模組穿框：單元測試通過；錄影目測無穿柱。(4) 纜索與吊桁：目測跟隨，未逐幀量測。(5) **地面入場被前景傘形樹冠遮住**（同 R3b）：入場只見由傘後駛出，未解。(6) **e4（high→mixed）：+1 的圓頂傘與階梯座席在框架生長時仍可見，到約 6.5 s 才被框架蓋過／退場**（舊 high 狀態用舊 at/span 在 2.1 s 窗口內退場），框架生長期間有明顯重疊；e2（low）重疊較少但小亭仍在框架底部可見至約 6 s。未處理。(7) 結束後閱讀：10.12–13 s ≈ 2.9 s 棚靜止（模組 hang 姿態仍緩慢升降），13.25 s 起拉回 hero，15.0 s 前完成。(8) 原因文字 SW 焦點變化於 10.12 s 出現（單元測試覆蓋 `reasonDelayMs`；真實卡片未截圖逐幀）。
  - 未驗證／未解：reduced-motion 只靠既有立即路徑與單元測試（未手動看）；snapshot／reset／Undo／reconnect 本輪未重跑 R3b 的 `immediate`／`reconnect` 腳本（只改了 `setTarget` 的非立即分支，`settle` 路徑未變）；夜景、FPS 未測（不引用數字）；headline 模組吊運速度較 R3b 慢（3.1 s 對 3.0 s，但整體 5 s 內其餘動作較快）；`low↔high` 直接切換與其他 site 仍 3 s。
  - 驗證（commit 前）：根 `npm test`、`npm run build`、`git diff --check` 全部通過（另修正 `energyPipeline.test.ts` 的等待時間 5→7 s）。`survey/`、`module-swap/` 未動（survey 只用 dev:auto）。

- **R3d（2026-11-13，起點 320c13f，只動文案、文件、測試、change sheet；動畫與建模未動）**：
  - 命名方案：SW 不設單一總名，按狀態各說各的（−1 私人小庭、+1 開放廣場沿用 COMMONS 文案，只有 mixed 為活動モジュール棚）；`changeSites.sw.name` 早已是 `EVENT SHELF`，地點標示「お台場南岸」不變。理由與文案見 [spec R3d 節](../../artifacts/sw-event-shelf/spec.md)。不牽涉 survey 契約或其他 site，所以不需停下。
  - 盤點結果：真正仍把 SW mixed 稱作 COMMONS／共有席的使用者可見出口只有兩處——設施卡 `commons.hybrid`（原「静けさと出会いのあいだ」）與結果卡第二句（原 mixed 一律走「共有席が増えました／囲われた席が増えました」）；兩者均已改。`LABELS.sharedSeats`（「共有席」，iPad 回饋計數，來自伺服器契約）、Q2 選項、`DISTRICT_RESULTS.sw`、`effect.commons*` 屬 −1／+1 或其他水辺設施，未動。程式註解中的 COMMONS（layout.ts、districtMeters.ts）是舊地塊的歷史說明，保留。
  - 改動：`src/surveyAtmosphere.ts`（`commons.hybrid`、`residentResult` 的 SW 分支按 `bands.sw` 前後選句）、`scripts/changeSheet.ts`（傳入 SW 前後 band 與座位，使 mixed 列顯示棚文案）、`tests/surveyAtmosphere.test.ts`（八種變化的 SW 文案斷言、全日文、不含 COMMONS／コモンズ、字數 ≤ 80）、`docs/RESIDENT_COPY.md`、`RESIDENT_SCENE_PLAN.md`（SW focal 列）、`EXHIBITION_SPEC.md`、`PROJECT.md`、spec。
  - change sheet：`scripts/closeupSheet.mjs` 重截 `sw:focal` 六幀（舊幀仍是 COMMONS 模型，已移到 `~/city2127-evidence/stage-closeups/sheet-old-sw/`），`changeSheet.ts` 重生成 `artifacts/change-review/`（6 張 960 px jpg ＋ index.html，共約 9.4 MB 目錄，無新 PNG）。
  - 驗證（2026-11-13）：根 `npm test`、`npm run build`、`git diff --check` 通過；`survey/`、`module-swap/` 未動。真實流程（`survey dev:auto` ＋ Vite ＋ 無頭 Chrome 1920×1080 **實時**、真實 guest UI，四票：mixed→low、low→mixed、mixed→high、high→mixed）截圖與 `flow-log.json` 在 `~/city2127-evidence/sw-event-shelf/r3d/`（不入 Git）。四個事件的結果卡原因文字皆於約 9–10.6 s 之間出現，內容與預期句一致；ambient 設施卡（−1／mixed／+1）各出現一次且標題與狀態相符；面板在畫面右側，文字不被截斷（4–5 行），不遮住棚。e2（進 mixed）10.6 s 時 headline 模組已入格，與文字出現吻合。
  - 驗證不足：截圖是實時無頭 Chrome（低幀率），文字出現時點只取 9.0／10.6 s 兩個取樣，未精確到 10.12 s；−1／+1 的 ambient 卡畫面為全景（非 SW 近鏡）；夜景、FPS 未測；e3／e4 只靠 flow-log 文字與少量畫面核對。
  - 已知未解：iPad 回饋 `exhibitionFeedback` 在 mixed 內仍顯示「共有席 4 → 5」（伺服器標籤契約，未動）；live 下 mixed 座位恆 4，所以 mixed 內「運び入れ／運び出し」句只在 DEV 出現（live 只出現 band 切換句）；low↔high 直接切換句仍講共有席（沒有棚）。

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
