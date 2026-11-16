# resident-aoi — 天氣圖書館與西入口

- Owner：cc100053
- 狀態：葵的 DEV 日照版與 R3 西坡道待 owner 審閱
- 分支：`feat/resident-aoi`，沿用本機 checkout
- 遠端：本分支留在本機。R1 的推送曾被自動審批阻擋，審批要求確認指定目的地的上傳範圍。
- 基準：`1811cdf90d59a857f6820fddef3ab616eab04914`

## 起點

2026-11-16 在 `main`、`d0ad443c32826c38f178b5c04442d262bc014290` 開始。刷新遠端後，本機 0 ahead／1 behind，快轉至車輛參考資產提交 `1811cdf` 再開分支。未追蹤的 `Dev_QA.md` 已保留。已驗收基準見[農園 R3](rectenna-farm-placement.md#r3--public-garden-entrance-2026-11-15)及[變化總覽交接](rectenna-change-review.md)。

## 實作

- 西入口沿用 R3 坐標、2× 農園、既有鐵路與步道。從步道平接約 5 m 寬的碎石支路及前地，到 (−200, 408) m 的坡道起點。天幕外的三畦、灌溉溝和外側三棵果樹改為草地與低矮收邊。通行線北側 (−226, 399.95) m 放一架三盤幼苗。
- 葵站在露台既有內側菜畦旁 (−185.35, 2.25, 398.96) m。開場看步道、鐵路和支路。切到露台內，再推近她攤手與落種，結尾回到可同時看天幕和露台的廣角。托起種子、落種、六角板轉青、菜畦薄霧依次由約 3.3、5.18、5.68、6.1 秒開始。青色層貼在該板下面，霧限於本畦上方。
- `src/devAoi.ts` 只由 Vite DEV 預覽載入，使用 `aoiTimeline.ts` 驅動剛體關節及天氣特效。農園未完全顯示時，葵與特效隱藏。場景光源跟隨原有日夜，角色用局部補光。天氣特效略過 GTAO 的深度預 pass。
- 視覺方向採用 Gemini 最新[修訂圖](https://gemini.google.com/u/3/app/9d24d8b1e7b7a9cd)的取苗架與局部落霧。角色的藍工作服、髮髻、短字幕和兩次剪接為 R1 審閱選擇。Meter、Q3、headline 及正式投票接入仍待另項任務。
- Blender 5.2.2 LTS headless。角色資產位於 [resident-aoi](../../asset/models/resident-aoi)，[外觀接觸表](../../artifacts/resident-aoi/character.jpg)供審閱。GLB 是 55,260 bytes，2,060 三角面，11 個剛體網格、7 個材質角色，約 1.71 m 高。匯出使用 Blender 內建 glTF Binary、預設 Y-up、無動畫或壓縮。Asset QA 的 render profile 通過，材質全部使用純色，接受無 UV 的警告。已檢視實色及線框接觸表。

## 審閱

啟動 Vite 後開啟 `/?shot=energy:aoi&orbital=3&hour=12&nopanel`。重載重播，改 `hour=22` 看夜景。可定格 `&reviewTime=20&aoiTime=5.45` 檢視落種，或以 `aoiTime=5.15` 與 `aoiTime=7` 配合 `aoiView=canopy` 比較同一鏡頭的日照前後。可加 `aoiView=entry|hands|canopy` 選固定構圖、`aoiNoCaption` 隱藏字幕。相片及圖說見[變化總覽](../../artifacts/change-review/index.html#rectenna-farm)。

## 驗證

- Root `npm test`、`npm run build`、`git diff --check` 通過。測試涵蓋落種、亮板、起霧的次序及連續性、既有接駁路面、取苗架隨農園淡入淡出，以及 108 組四題選擇。Production bundle 無葵的模組或模型。
- Headless Chrome，1920 × 1080／DPR 1，六張實景各有圖片及擷取 sidecar，`pageErrors` 全為空。已檢查入口俯視、掌心、落種、中距天幕和夜景。原始證據位於 `~/city2127-evidence/resident-aoi/r1/`。生成總覽可重現，六個新增 JPEG 路徑均有效。
- 同一部開發 Mac 的有視窗 Chrome，1920 × 1080／DPR 1，核對完整 DEV 動作、農園停用時不顯示，以及入口／天幕原地對照。每個姿勢各兩段 3 秒 rAF 樣本。入口基準 59.3–60.0 FPS、加葵 55.7–58.0 FPS。天幕基準 50.7–51.4 FPS、加葵 51.7–54.0 FPS。樣本量小，只記錄觀察值。詳見同一證據資料夾的 `live-check.json`。
- 最後驗證為本交接所在的 R1 分支提交。展場硬件和正式投票中的葵段落尚無驗證，角色與場景待 owner 驗收。

## 下一步

由 owner 審閱西入口動線、落種，以及單格天幕復現的暖斜陽。審閱後決定是否整合。


## R2 — 西入口（2026-11-16）

- 從本機 `d13ffae` 繼續。刷新 `origin` 成功，當時 `origin/main` 是 `1811cdf`，這個分支 0 behind／1 ahead，未有遠端同名分支。保留未追蹤的 `Dev_QA.md`，本輪交付留在本機。
- 按 Gemini 最新取苗架圖，把淺色前地和碎石支路合為單一連續面層，西端貼合步道斜邊，東端對準原有 4.8 m 西坡道門檻。草地上的兩段低植栽平行步道；2.38 × 0.62 m 薄木面、細金屬腳三盤架位於支路北側。DEV 開場降低鏡位，用真實鐵路、步道和天幕構圖。Gemini 把鐵路放左並畫出獨立露天坡道，本機構圖中鐵路在右，沿用既有 R3 農園和坡道。
- **坡道淨空受既有模型阻擋。** 實景及原始 GLB 射線顯示，外圈菜槽的底板和植栽跨過西坡道入口。自坡道口起約 12 m 的三條抽樣線均投影在外圈底板範圍；起點菜槽頂約 1.05 m、坡道頂約 −0.107 m。R2 接到坡道底端，從入口走上露台仍受阻。若要打通，須先決定是否可局部修整這段外圈菜槽、底板及植栽。
- Root `npm test`、`npm run build`、`git diff --check` 通過。實際 Chrome 場景的直行步道六個測點都有原有步道，步道接縫抽樣高差 6 mm，坡道口三點高差 0–2 mm，抽樣通行線無取苗架或收邊植栽。Production bundle 排除葵的模組和模型。
- 1920 × 1080／DPR 1 Chrome 實景和 sidecar 在 `~/city2127-evidence/resident-aoi/r2/`，同鏡頭前後、俯視、夜景與坡道口均無頁面錯誤。[同鏡頭及俯視對照](../../artifacts/resident-aoi/r2/entrance-comparison.jpg)、[目標圖比較](../../artifacts/resident-aoi/r2/entrance-target-comparison.jpg)、[夜景](../../artifacts/resident-aoi/r2/entrance-night.jpg)及[變化總覽](../../artifacts/change-review/index.html#rectenna-farm)已更新。驗證對應本段所在的 R2 本機提交；本輪未測展場硬件或 headed FPS。

## R3 — 西坡道開口（2026-11-16）

- 從本機 `feat/resident-aoi` 的 R2 `3f4eff3` 繼續。刷新成功，`origin/main` 為 `1811cdf`，本機 0 behind／2 ahead，遠端沒有同名分支。交付留在本機，保留未追蹤的 `Dev_QA.md`。
- 在 [Blender 源檔](../../asset/models/rectenna-farm-canopy/rectenna-farm-canopy.blend) 局部裁開外圈底板、矮牆、菜槽和底座。從原有散佈點局部剔除 356 株菜苗。匯出前後比對，餘下 10,468 株的模型、位置、旋轉及比例相同。另把一棵橙樹移離露台出口約 5.5 m（城市尺度）。原西坡道保留原有幾何尺寸、中央扶手與外欄，修正西段路面的反向面。上端加 3.3 × 5.8 m 水平平台及 L 形護欄，平台側邊穿過第一層菜床接上原露台走道。鐵路、直行步道、碎石前地與取苗架沿用 R2。葵的段落繼續限 DEV，Meter、Q3、headline 及正式投票接入留待另項工作。
- Blender 5.2.2 LTS，沿用內嵌 `export_glb.py`，輸出 Y-up、無壓縮的 [GLB](../../asset/models/rectenna-farm-canopy/rectenna-farm-canopy.glb)。最終 4,842,648 bytes、13 材質、10,468 個植栽實例，Three.js 計入實例後 549,148 三角面。原模型座標界限保持 X ±32.24、Y −0.23…33.60、Z ±32.38 m。空白 Blender 場景回讀成功，亦確認 Chrome 載入新版。
- [GLB 射線測試](../../tests/rectennaWestRamp.test.mjs)通過 43,710 點，覆蓋兩條行走帶、水平平台、內側出口，以及門檻前沿。原坡道在城市尺度長約 26.2 m、升 2.36 m，量得 9.01% 斜率。行走面高度與預期面相差小於 2 mm，抽樣的 2.25 m 垂直淨空沒有底板、菜槽、植栽或欄杆侵入。Chrome 量得碎石與坡道交界 24 點高差 2.8–2.9 mm，六個直行步道抽樣點皆有路面，取苗架及 DEV 葵正常載入。
- 新平台與護欄通過 Blender Asset QA 的 render profile，線框及實景也已查看。接受純色無 UV、欄杆接合處的隱藏貼面和架空平台的地面高度警告。全組檢查仍有 R2 已見的主露台板／矮牆共面報告，並保留其他坡段原有反向面，本輪範圍為西坡道。
- Root `npm test`、`npm run build`、`git diff --check` 通過。Production bundle 排除葵。靜態 Chrome 1920 × 1080／DPR 1 實景及 sidecar 位於 `~/city2127-evidence/resident-aoi/r3/`，見[變化總覽](../../artifacts/change-review/index.html#rectenna-farm)的同鏡頭前後、坡道視角、俯視與露台出口。驗證對應本段所在的 R3 本機提交。展場硬件、headed FPS 和正式投票流程未實測。

## 葵的日照版（2026-11-16）

- 從 R3 本機提交 `5f701b6` 繼續，保留未追蹤的 `Dev_QA.md`。刷新 `origin` 後，`origin/main` 為 `1811cdf`，起點為 0 behind／3 ahead，無遠端同名分支。交付留在本機。
- 葵向步道側微移，近鏡抬高，落種移到菜畦邊的低位。約 5.18 秒開始落種，5.68 秒落到菜畦並切至天幕與鄰樹同框。原位的單格六角板隨即亮起，約 5.83–6.65 秒把暖斜陽投在本畦。使用有陰影的聚光照亮既有菜葉與土面，鄰樹仍用城景的環境光。日文字幕為「あの日の陽ざしを借りて、この種をもう一度。」
- 1920 × 1080／DPR 1 Chrome 固定鏡頭在 12:00 比較 5.15／7 秒（隱藏字幕）。JPEG 中菜葉取樣 x990–1031／y933–967 的平均 RGB 由 (107.7, 156.2, 76.7) 變為 (160.3, 185.8, 79.9)，鄰樹 x823–865／y737–790 每個色道變化小於 1。另留掌心、落種、22:00 夜景及擷取 sidecar。無字幕連續播放錄得 378 張 CDP 畫面，零頁面錯誤；已核對入口、落種及亮板段落。原始證據在 `~/city2127-evidence/resident-aoi/sun-final/`。
- Root `npm test`、`npm run build`、`git diff --check` 通過；production bundle 排除葵的程式及模型。驗證對應本節所在的本機提交。交由 owner 審閱 [無字幕定格與同鏡頭對照](../../artifacts/change-review/index.html#rectenna-farm)。展場硬件及正式投票仍待獨立驗證。
