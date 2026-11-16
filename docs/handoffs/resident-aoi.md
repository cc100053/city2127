# resident-aoi — 天氣圖書館與西入口

- Owner：cc100053
- 狀態：R1 實作，待 owner 審閱
- 分支：`feat/resident-aoi`，沿用本機 checkout
- 遠端：尚未推送。自動審批阻擋推送，要求針對目的地 `github.com/cc100053/city2127` 確認這批原始碼與資產可上傳。
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

啟動 Vite 後開啟 `/?shot=energy:aoi&orbital=3&hour=12&nopanel`。重載重播，改 `hour=22` 看夜景。可定格 `&reviewTime=20&aoiTime=5.45` 檢視落種，或加 `aoiView=entry|hands|canopy` 選固定構圖、`aoiNoCaption` 隱藏字幕。相片及圖說見[變化總覽](../../artifacts/change-review/index.html#rectenna-farm)。

## 驗證

- Root `npm test`、`npm run build`、`git diff --check` 通過。測試涵蓋落種、亮板、起霧的次序及連續性、既有接駁路面、取苗架隨農園淡入淡出，以及 108 組四題選擇。Production bundle 無葵的模組或模型。
- Headless Chrome，1920 × 1080／DPR 1，六張實景各有圖片及擷取 sidecar，`pageErrors` 全為空。已檢查入口俯視、掌心、落種、中距天幕和夜景。原始證據位於 `~/city2127-evidence/resident-aoi/r1/`。生成總覽可重現，六個新增 JPEG 路徑均有效。
- 同一部開發 Mac 的有視窗 Chrome，1920 × 1080／DPR 1，核對完整 DEV 動作、農園停用時不顯示，以及入口／天幕原地對照。每個姿勢各兩段 3 秒 rAF 樣本。入口基準 59.3–60.0 FPS、加葵 55.7–58.0 FPS。天幕基準 50.7–51.4 FPS、加葵 51.7–54.0 FPS。樣本量小，只記錄觀察值。詳見同一證據資料夾的 `live-check.json`。
- 最後驗證為本交接所在的 R1 分支提交。展場硬件和正式投票中的葵段落尚無驗證，角色與場景待 owner 驗收。

## 下一步

由 owner 審閱西入口動線、葵的角色和落種，以及一格天幕與局部落霧。審閱後決定是否整合。
