# Fuji Civic Core — 打磨驗收

- Owner: Codex
- Branch: `codex/fuji-facade-pilot`
- Base: `2ab01ea77125fbd8c54e5c8dc9f1ec79a3d97ac8`
- Status: 已選 R1 為外觀基準。R7 闊翼嘅兩組雙層窗及轉角樣板待 owner 驗收（2026-11-22）
- R1 已驗證實作：`19432b6360eecbf58181ec69d6a3235a0bf82280`
- 遠端分支：`origin/codex/fuji-facade-pilot`

## 基準和改造範圍

啟動時 `main` 與已 fetch 的 `origin/main` 差異 0/0，保留主工作樹的未追蹤 `Dev_QA.md`。由該 commit 開獨立工作樹。台場場地、九題輪換以及 Fuji 既有用途的依據見 [PROJECT](../PROJECT.md) 和 [此前的 Fuji v3 交接](archive/fuji-tv-polish.md)。

本輪先重做 Fuji 兩翼面海與延伸到側面的前段幕牆。每個雙層棚室用退入式玻璃、分段陶瓷框、深色隔音板和窗頂燈槽建立深度。暖色剪接區與冷藍直播區由既有城市時鐘控制。幕牆以 civic-local metres 匯出，`civicAt` 放置、樓板、植栽露台、居民位置、扶梯和球頂泊位沿用現行坐標。原有 `fuji-tv` 歷史資產未改。

薄窄室內零件（深色、暖光和直播光材質，任一尺寸 ≤ 0.25 m）沿用原尺寸和中心，改用共用直角盒。新 GLB 成為同一組材質合批的一部分，載入失敗或材質角色不完整使用程序幕牆。修復了房間 shader 中被行內註解吞掉的 `roomNight` 綁定。

## 模型與驗證

- 重建：`blender -b --factory-startup --python asset/models/fuji-civic-facade/build_facade.py`，再用 Blender export skill 的 `gltf` preset、`--no-anim --out //fuji-civic-facade.glb`。同目錄保留 [.blend](../../asset/models/fuji-civic-facade/fuji-civic-facade.blend) 及 [GLB](../../asset/models/fuji-civic-facade/fuji-civic-facade.glb)。
- Blender 5.2.2 `game` QA 無幾何錯誤。唯一提示是幕牆最低點 Y=4.195 m，高於建築原點；它依附現有雙層樓板，屬預期。陶瓷／深灰／玻璃／暖光／直播光各 14,112／18,216／4,764／2,580／252 個三角面；GLB 共 39,924 個三角面、5 個材質、無紋理，約 2.67 MiB。多角度材質及線框圖已目視。
- Three.js 解析實際 GLB 後，整棟樓為 931,724 個三角面、10 個材質批次；程序回退為 950,120 個三角面，同為 10 批。原版 `2ab01ea7` 為 2,184,776 個三角面。新舊大樓世界包圍盒相同。

- 根 `npm test`、`npm run build`、`git diff --check` 通過。Odaiba 測試載入真 GLB 並驗證兩種幕牆的居民動線一致、樓板與泊位淨空、10 批上限及面數預算。
- Apple M6／Chrome 157.0.8103.79 headless／ANGLE Metal，1920×1080、DPR 1，`reviewTime=20` 固定日夜畫面。正常 GLB 四個畫面均回應 HTTP 200，零 page error；模擬 GLB 404 會顯示原幕牆，零 page error。主鏡一般渲染幀 23.09M → 20.59M 三角面，draw calls 日 1,411、夜 1,412。每個條件取一次 6 秒 rAF 短測，日 53.8 → 58.8 FPS，夜 56.2 → 58.9 FPS，接近 60 FPS 上限，未量展覽機或長跑。
- 近鏡可見窗框、隔音板細縫、燈槽和仍透出的工作室。成套截圖及 JSON 在 `~/city2127-evidence/fuji-civic-facade/r1`。紀錄：[原版近鏡夜景](../../artifacts/fuji-civic-facade/r1/before-wing-night.jpg)、[R1 近鏡夜景](../../artifacts/fuji-civic-facade/r1/after-wing-night.jpg)、[R1 近鏡日景](../../artifacts/fuji-civic-facade/r1/after-wing-day.jpg)、[R1 主鏡夜景](../../artifacts/fuji-civic-facade/r1/after-hero-night.jpg)。

## R1 恢復紀錄

Owner 比較 R1 與 R2 後選定 R1。驗收分支已回退 R2，恢復 `4423a9f2` 的程式碼與資產。R2 實作和對照圖保留在 Git 紀錄 `1469bbdf`／`1ed891f7`。

回退後比較 `4423a9f2`，差異全在文件。根 `npm test`、`npm run build` 及 `git diff --check` 通過。Chrome 157 在 1920×1080、`hour=21&reviewTime=20` 檢查主鏡及銀球近鏡，幕牆 GLB 回應 200、零 page error。截圖與 sidecar 在 `~/city2127-evidence/fuji-civic-facade/r1-restored/`。

第 3 步從恢復的 R1 接續，範圍為從前庭到斜扶梯的夜間導光。沿用 R1 銀球、承托、雙翼幕牆、球頂泊位、航線和現有通行動線。展覽機尚待量度。

## R3 夜間導光候選

2026-11-22 由專用工作樹 `/private/tmp/city2127-fuji-polish` 接續。Fetch 後 `311ee9cf` 與遠端驗收分支差異 0／0，`origin/main` 為 `2ab01ea7`，驗收分支超前 5 個提交。回退版與 `4423a9f2` 的程式碼和資產相同。

- 大道 ① 的步道沿原有前庭鋪面，以兩條冷白藍導線和三組朝向大堂的箭嘴標出入口。導線止於原有梯腳；三層梯級標出踏邊，雨篷底及門檻兩側照出入口深度。
- 公共平台以薄燈條及箭嘴標出斜扶梯穿出平台的位置，扶手沿既有斜度延續冷白藍光。導引使用現有街道及建築日夜調光。R1 幕牆、銀球、承托、泊位、航線及既有公眾與員工動線沿用。
- 整棟樓沿用十個材質批次。載入幕牆 GLB 時由 931,724 增至 932,264 個三角面，程序回退時由 950,120 增至 950,660 個三角面。兩種幕牆的世界包圍盒及住民位置、步行曲線、扶梯騎乘路徑與 R1 逐項相同。前庭另併為一個 108 三角面批次，不投影，沿用現有材質。全案合計增加 648 個三角面。

同鏡夜景中，R3 的大道導線和平台箭嘴分別指向入口及斜扶梯，級燈標出梯邊，斜扶手更清晰。高架軌道從總覽鏡位遮住部分梯級，另選入口斜角鏡位覆核雨篷、門檻及完整三層級燈。原圖及含 URL、commit、工作樹狀態的 sidecar 在 `~/city2127-evidence/fuji-civic-facade/r3-baseline/` 與 `r3-final/`。[夜景前後對照](../../artifacts/fuji-civic-facade/r3/night-comparison.jpg) · [同鏡日景](../../artifacts/fuji-civic-facade/r3/access-day.jpg) · [同鏡夜景](../../artifacts/fuji-civic-facade/r3/access-night.jpg) · [入口夜景](../../artifacts/fuji-civic-facade/r3/foyer-night.jpg) · [主鏡夜景](../../artifacts/fuji-civic-facade/r3/hero-night.jpg)。

已驗證實作為 `32bcdd8d8c821a5340c96737439c251613df47e3`。根目錄 `npm test`、`npm run build` 及 `git diff --check` 通過。Odaiba 測試以真場景射線核對 84 個前庭樣點和 13 個梯級／平台樣點，既有住民腳位及頭部、航線和球頂泊位的淨空檢查亦通過。Chrome 七張 R3 日夜圖零頁面錯誤，擷取期間的 runtime 程式碼與已驗證提交一致。

Apple M6／Chrome 157.0.8103.79 headless（ANGLE Metal），主鏡 1920×1080／DPR 1，固定 12:00／21:00 與 `reviewTime=20`。R1 和 R3 各取三段 6 秒 rAF 樣本的中位數。日景 59.3 → 59.0 FPS，夜景 59.5 → 59.2 FPS。一般渲染幀日／夜各增加 2 次 draw call 及 1,296 個提交的三角面，R3 為 1,413／1,414 calls。包含陰影更新的夜間樣本由 1,895 增至 1,897 calls，三角面由 25,537,815 增至 25,539,651。幕牆 GLB 日夜均回應 HTTP 200，零頁面錯誤。原始樣本見兩個證據目錄的 `hero-perf.json`。展覽機與長時間運行待測。

下一步由 owner 比較 R1／R3 再決定是否接受第 3 步。

## R4 公共接駁體塊候選

2026-11-22 從 R3 驗收分支 `4a6ebe51` 接續。專用工作樹乾淨，重新 fetch 後與遠端分支差異 0／0，`origin/main` 為 `2ab01ea7`。Owner 選方案 A，先審入口、平台與斜扶梯在同一鏡位的關係。

- 前庭仍從大道 ① 入。原三層高踏面中間改為一段共 18 級的入口梯，兩側沿用弧形地台。打開主門中央玻璃，海側大堂沿用公共區的通高空間與現有雨篷。
- 從大堂出一條約 132 m 的架空步廊，向海繞過拱腳後折返，低位平台貼合扶梯的原踏面。步廊以現有樓板生成方式、陶板、玻璃欄同冷白藍導線搭出體塊，既有居民系統加入一對同走的居民。
- 扶梯按原方向穿過公共平台。兩層樓板的開口一併切出，乘客在此繼續可見。雙翼幕牆、銀球、主承托、球頂泊位與城市航線沿用 R1。

抽樣量得步廊由大堂到低位平台升約 3.14 m，最大縱坡約 5.2%。首輪射線及近鏡發現拱腳與鄰近既有大樓的範圍衝突，最終走線從海側避開拱腳，東端提早收回富士一側。新回歸檢查沿樓梯、門口、步廊、低位平台及扶梯取樣，亦檢查步廊同拱腳、高架軌道支柱嘅淨空。

三維實測中，大樓保持 10 個材質批次。幕牆 GLB 版本由 932,264 增至 939,936 個三角面，程序回退由 950,660 增至 958,332。兩種版本的大樓包圍盒、扶梯起訖點、速度及乘客間距與 R3 一致。

已驗證實作為 `83dffbfad29bfd0beefb26a45d9fefe18dbbc235`。根目錄 `npm test`、`npm run build`、`git diff --check` 通過。桌面開發 Mac Chrome headless，3200×1800、DPR 1，固定 `reviewTime=20`，四張最終擷取零頁面錯誤。夜間主鏡一般幀同 R3 都是 1,414 次 draw call，提交三角面由 20,587,780 增至 20,592,028。原圖及 sidecar 在 `~/city2127-evidence/fuji-civic-facade/r4-final/`，擷取時 runtime 程式碼與已驗證提交一致。

正面鏡可讀出入口、繞行弧線及扶梯兩端，拱橋柱遮住扶梯中段。西南鏡補看扶梯穿出平台及夜間前庭接駁。此輪驗收公共接駁的體塊和畫面，展覽機效能未測。[同鏡日景](../../artifacts/fuji-civic-facade/r4/south-day.jpg) · [同鏡夜景](../../artifacts/fuji-civic-facade/r4/south-night.jpg) · [R3／R4 夜景對照](../../artifacts/fuji-civic-facade/r4/r4-comparison.jpg) · [城市主鏡](../../artifacts/fuji-civic-facade/r4/hero-night.jpg)

## R5 上層扶梯出口與拱腳收邊

2026-11-22 從專用工作樹 `/private/tmp/city2127-fuji-polish` 接續。Fetch 後乾淨的本機分支與遠端驗收分支都在 `58b626e8e57ceeca89d3f0cd936f8348245b67d4`，差異 0／0。當時 `origin/main` 是 `2ab01ea7`，驗收分支超前 9 個提交。發布前再 fetch，`origin/main` 已升至船體露台整合 `b229404f`，R5 沿用原 R4 驗收分支作比較基準。Owner 的標記在 [R4 南面夜景](../../artifacts/fuji-civic-facade/r4/south-night.jpg)。

- 原斜扶梯由 R4 底端出發，穿過原有公共平台開口，喺主橫樑底先接世界 Y=74.925 m 的平轉乘台。第二段由海側向上，64 級踏面接到 Y=87.75 m 的平落地台，再經約 5.94 m 闊嘅欄邊開口行入原有上層公共步道。乘客由公共平台到上層出口一直可見，行過兩個平面時有步態。
- 富士地台沿拱腳基座留出約 1.5 m 的設計退讓，鄰近外圍級邊及大堂展板局部收短。拱橋仍用原柱位及原基座。R4 入口梯、海側步廊及低位接駁，R1 幕牆、橫樑、球體和球頂泊位照原位。
- 真 GLB 及程序回退的大樓分別為 936,952／955,348 個三角面，各 10 個材質批次，較 R4 各少 2,984 個三角面。兩版本用同一乘客路線及世界包圍盒。

實作與擷取基準為 `e63c34338c535835245e773cc0c8130345596a60`。Odaiba 測試以實際三角網格檢查上段路線中央及左右各 0.55 m，沿路每最多 0.18 m 取樣，核對踏面與 2.3 m 頭頂空間。雙向射線確認轉乘台、扶梯同出口冇薄欄板或樑擋路。拱腳自基座中心以 0.5 m 網格抽查至半徑 13.55 m，範圍內冇富士大堂地台；原柱腳仍落地。既有入口、低位平台、公共平台、步廊及泊位航線的測試通過。

根目錄 `npm test`、`npm run build`、`git diff --check` 通過。完整測試用桌面環境重跑，讓 survey pipeline 開本機 HTTP／WebSocket。

桌面 Mac（macOS 27.2.1、Chrome 157.0.8103.79 headless）以 3200×1800、DPR 1、`reviewTime=20` 擷取五張圖，零頁面錯誤。南面兩張沿用 R4 日夜的完整 URL 與構圖。原圖及 sidecar 在 `~/city2127-evidence/fuji-civic-facade/r5-final/`，均從乾淨嘅實作提交擷取。展覽機效能未測。

[扶梯頂日景](../../artifacts/fuji-civic-facade/r5/upper-day.jpg) · [扶梯頂夜景](../../artifacts/fuji-civic-facade/r5/upper-night.jpg) · [拱腳近鏡](../../artifacts/fuji-civic-facade/r5/arch-foot-day.jpg) · [南面同鏡日景](../../artifacts/fuji-civic-facade/r5/south-day.jpg) · [南面同鏡夜景](../../artifacts/fuji-civic-facade/r5/south-night.jpg)。

2026-11-22，owner 確認保存白拱背景 [〈白拱下嘅路〉](../BUILDING_STORIES.md#white-arch)。故事將原通勤吊橋、保留嘅白拱同今日公共步廊連起來，收錄於建築故事集。

下一步由 owner 驗收上層出口、拱腳收邊同南面日夜對照。

## R6 轉乘台與上層出口導向

2026-11-22 由專用工作樹 `/private/tmp/city2127-fuji-polish` 接續。Fetch 後乾淨嘅本機同遠端驗收分支都係 `31f935a85bc1dd2189593b808cf03677ff1761d6`，差異 0／0。`origin/main` 當時係 `a0df060333ecded0f368f62af5e2bb2e360f77db`，對比驗收分支各有 3／13 個獨有提交。本輪以 R5 原鏡位同乘客路線為對照。白拱故事見 [〈白拱下嘅路〉](../BUILDING_STORIES.md#white-arch)。

- 同鏡夜景逐項隔離點光、月光同環境貼圖。停用環境貼圖時高光消失，定位為轉乘台淺色陶板嘅環境反射。轉乘台、上層落地台同上層步道入口短段改用現有啞面鋪石。夜景原圖以同一個轉乘台表面區塊抽樣，平均 8-bit sRGB 由 `247/249/245` 降至 `165/172/181`。
- 三組短地面箭嘴分別指示離開第一段後轉向、踏上第二段、穿過欄邊開口。箭嘴沿用扶手嘅 `megaSeam` 與日夜調光。所有新增部分都係富士路線上嘅短鋪面和導線，沿用城市鋪石、發光材料和盒形工廠。
- 由 R5 逐項比較，真 GLB 同程序回退嘅住民、步行及扶梯路線、整棟世界包圍盒完全一致。兩個版本各加 144 個三角面及 1 個鋪石批次，分別為 937,096／955,492 個三角面，各 11 批。

實作提交係 `2e7da19461f55af49af7da415d316fb0bcacba28`。Odaiba 幾何回歸為兩種幕牆逐點確認導線貼住啞面鋪地，突出幅度少於 3 cm。沿用 R5 扶梯踏面、2.3 m 頭頂淨空、欄邊開口、拱腳退讓，及 R1 主結構和泊位淨空檢查。

根目錄 `npm test`、`npm run build` 同 `git diff --check` 通過。桌面開發 Mac（macOS 27.2.1／Chrome 157.0.8103.79 headless）從乾淨嘅實作提交用 R5 相同鏡位、12:00／21:00、3200×1800、DPR 1 同 `reviewTime=20` 擷取，兩張圖零頁面錯誤。剪裁對照沿用相同範圍。[日景同鏡](../../artifacts/fuji-civic-facade/r6/comparison-day.jpg) · [夜景同鏡](../../artifacts/fuji-civic-facade/r6/comparison-night.jpg)

行人視角以 1.64 m 眼高、沿同一條乘客路線側移 0.55 m，由第一段末端行到上層步道。日夜各約 23 秒，1440×810、DPR 1，固定住民時間 `reviewTime=28`，第二段上行加快供看片。逐段以 2 秒畫面核對 1.1–3.1 s 嘅落梯轉彎、7.1–9.1 s 嘅第二段入口、16.6–18.6 s 嘅上層落地台及欄邊開口。最後一段可跟住地面導線穿過開口，片中途人短暫遮住出口箭頭尖。[日景行人幀](../../artifacts/fuji-civic-facade/r6/walker-day.jpg) · [夜景行人幀](../../artifacts/fuji-civic-facade/r6/walker-night.jpg)

兩段錄影嘅 Fuji GLB 回應 200，零頁面錯誤。原圖與 sidecar 在 `~/city2127-evidence/fuji-civic-facade/r6-final/`，短片、sidecar 與錄製腳本在 `~/city2127-evidence/fuji-civic-facade/r6-route/`。短片擷取時工作樹有交接和證據更新，runtime 與實作提交一致。兩秒檢查為開發畫面覆核，owner 驗收和展覽機測試待做。下一步由 owner 審閱驗收分支嘅 R6 日夜對照和短片。

## R7 兩翼外牆樣板

2026-11-22 由專用工作樹 `/private/tmp/city2127-fuji-polish` 接續。Fetch 後乾淨嘅本機同遠端驗收分支都係 `a97f386b124bd52d03b702ceccf25e787033bc81`，差異 0／0。`origin/main` 係 `5759a37c35d0d213df2be7c44cc65b814f81e720`，同驗收分支分別有 7／15 個獨有提交。以 R6 作同鏡比較，R1 仍係整體外觀基準。

Owner 覺得第一張目標圖嘅改動難以辨認，之後選定開放構思版嘅斜肋、深框同轉角玻璃。[已選 Gemini 目標日景](../../artifacts/fuji-civic-facade/r7/gemini-target.jpg)。目標圖畫多嘅扶梯同改動嘅球面反光沿用 R6 實景處理。原始 Gemini JPEG、R6 原圖及提示詞在 `~/city2127-evidence/fuji-civic-facade/r7/`。

- 只做主鏡中銀球左側闊翼 civic-local Y=83 嘅雙層窗帶。海側六個原窗格收成兩組開口，內側頭三格接到同一套窗框。兩組窗由斜向陶板肋分隔，斜切窗套露出實體側面。其中一組以兩片垂直玻璃接過轉角，中間用窄深色接縫。另一組加一塊退入嘅實心陶板。窗框最前面同玻璃外面相距 2.61 civic-local m，放置後約 3.52 m。
- 沿用 `fuji_ceramic`、`fuji_graphite`、`fuji_clear`、`fuji_warm` 同 `fuji_studio` 五個角色。海側底邊保留原托板，局部收短裝飾花槽嘅種植範圍。內側裝飾花槽止於新窗框，室內夾層及主樓板繼續用原幾何。兩翼其餘窗牆、主柱樑、銀球及泊位、扶梯、白拱同公共路線沿用 R6。呢組幕牆按富士嘅樓層、玻璃轉角同投影方向塑形，屬大樓專用外殼。
- Blender 5.2.2 以原生成腳本重建，用 `gltf` preset、`--no-anim` 匯出。Game QA 無幾何錯誤。唯一提示係幕牆最低點 4.195 m，符合依附樓板嘅外殼。多角度材質同線框已目視。重匯入共 39,428 個三角面，陶板／深灰／玻璃／暖光／直播光分別為 13,856／17,952／4,800／2,556／264。GLB 約 2.64 MiB，五種材質，無紋理，物件縮放 1，Three.js 本地包圍盒約 X=−67.04–59.04、Y=4.20–120.51、Z=−4.96–32.74 m。
- 載入 GLB 時，Three.js 全棟由 R6 嘅 937,096 降至 933,900 個三角面，維持 11 個材質批次。程序回退仍係 955,492 面、11 批。兩者世界包圍盒同住民／扶梯路線一致。Odaiba 測試用真 GLB 射線核對斜肋、前後層次、陶板同兩層轉角玻璃，並覆核原樓層、扶梯淨空同泊位接近路徑。

實作提交係 `c9792c7ba2e19d51f69027f47ab791346b59b90b`。根目錄 `npm test`、`npm run build`、`git diff --check` 同 Odaiba 幾何回歸通過。桌面開發 Mac（macOS 27.2.1／Chrome 157.0.8103.79 headless）以 R6 同鏡、固定 12:00／21:00、`reviewTime=20`、3200×1800 同 DPR 1 擷取日夜近鏡及城市主鏡，共四張零頁面錯誤。擷取時 sidecar 記錄工作樹有改動，擷取前樣板資產、程式及回歸測試嘅 binary diff 雜湊同實作提交一致。另用 1600×900 夜景確認 GLB 回應 200，模擬 404 時原程序幕牆回退，兩次都冇頁面錯誤。原圖、sidecar、材質／線框檢查圖同檢查紀錄喺 `~/city2127-evidence/fuji-civic-facade/r7/`。

日景近鏡可辨斜肋、深窗套同退入玻璃，夜景由原有室內光分出兩個大開口。城市主鏡嘅橫樑遮住部分窗框上沿，窗套深度主要由近鏡交代。呢次係開發畫面覆核，展覽機效能同 owner 樣板驗收待做。下一步由 owner 審閱同鏡對照，再決定兩翼其餘樓層嘅延伸。

[日景同鏡](../../artifacts/fuji-civic-facade/r7/comparison-day.jpg) · [夜景同鏡](../../artifacts/fuji-civic-facade/r7/comparison-night.jpg) · [城市主鏡日景](../../artifacts/fuji-civic-facade/r7/hero-day.jpg) · [城市主鏡夜景](../../artifacts/fuji-civic-facade/r7/hero-night.jpg)。
