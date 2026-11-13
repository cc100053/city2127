# resident-sw-nagi — 凪的人物情景（SW focal，草案 v4）

[居民情景計劃](../RESIDENT_SCENE_PLAN.md)階段 2 的第三個單位（SW focal，mixed 狀態進出）。已完成 [resident-scene](../../.agents/skills/resident-scene/SKILL.md) 步驟 1–3 及步驟 4 的 prompts 草稿；尚無人物模型、佈景或 DEV 演示。

- Owner: cc100053
- Status: IN PROGRESS（步驟 3 舞台勘察完成，步驟 4 prompts 草稿待 owner 挑選；Bible 以 owner 繼續指示視為採用）
- Branch: `claude/resident-nagi-72c6f8`（由 `feat/resident-nagi-draft` 的 e1a3e02 接續）
- Base commit: `4575630` 的完整 SHA 見 `git log`（起點為 main `45756308c895ca9b424a1c7e0cccb7bc217171aa`）
- Last verified commit: 本輪提交前的 working tree（起點 e1a3e02；`npm test`、`npm run build`、`git diff --check` 通過）
- Remote availability: 見 Next expected step

## Session Git state

- Session starting branch and HEAD: main `45756308c895ca9b424a1c7e0cccb7bc217171aa`
- Last fetched origin/main commit: 同上，2026-11-14 fetch 成功，本地 main 與 origin/main 無分歧
- Local changes present at session start: 未追蹤的 `Dev_QA.md`（保留，不屬本任務）
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

為 SW focal（お台場南岸，活動モジュール棚）設計一位有名居民，在進入 mixed 的兩種轉變（−1 → 0、+1 → 0）中，與移動模組直接互動，，以地面層的行動演出變化。本輪完成準則：計劃文件內有居民表草案，owner 審閱後批准或修改。其後步驟見 skill。

## In-scope files and dependencies

- `docs/RESIDENT_SCENE_PLAN.md`：新增居民 5（凪）與 SW focal 列的階段 2 欄。
- `scripts/changeSheet.ts`：SW focal 單位加上 `resident: 'お台場南岸'`；`artifacts/change-review/index.html` 已重生成（0 frames refreshed，只更新文字）。
- 前提：[sw-event-shelf](sw-event-shelf.md)（棚的動畫已獲 owner 驗收；計劃表上階段 1 仍標「未打磨」，建模外觀未獲最終驗收）。
- 排除：模型、DEV 演示接入、RESIDENT_COPY 台詞（批准後才搬入）。步驟 3–4 的範圍見下。

## Completed work

- 居民草案：凪、34 歲、配送航路編集者（杜撰職業）（模組使用者）；兩種轉變（−1→0、+1→0；離開 mixed 不設居民，owner 2026-11-14）的台詞（v4：她是棚的使用者，用手機呼叫模組、鎖燈後走進去）（≤ 34 字）、行動、得失。
- 時序核對：SW 過場 5 s、headline 吊運約 7.0–10.1 s；居民一拍由約 10.1 s 起，hero 約 20–22 s。

## Actual validation results

- Verification status: PASSED（程式部分只有 DEV 小改動；截圖為目測，無 FPS）
- Commands/manual checks and results: 2026-11-14 根 `npm test` EXIT 0、`npm run build` EXIT 0、`git diff --check` 乾淨；`survey/`、`module-swap/` 未動；步驟 3 截圖見該節。階段 1 只執行 `node --experimental-strip-types scripts/changeSheet.ts`（成功，8 units、14 change rows）。`npm test`、`npm run build` 未跑；日文未經母語者校對。
- Integrated commit and checks: NOT INTEGRATED

## Step 3 stage survey

2026-11-14，起點 e1a3e02（working tree 含下述 DEV 小改動，截圖 sidecar 標 dirty）。Vite DEV、無頭 Chrome 1600×900、`hour=12`／`22`、`reviewTime=40`；證據在 `~/city2127-evidence/resident-sw-nagi/survey/`（候選）與 `step3/`（最終），不入 Git。已發布的記錄層：[artifacts/resident-sw-nagi/baseline](../../artifacts/resident-sw-nagi/baseline/)（含 [contact-sheet.jpg](../../artifacts/resident-sw-nagi/baseline/contact-sheet.jpg)：上排日、下排夜，左至右 −1／0／+1）。

**採用鏡位（e2）**（基準圖已於縮小群像、移除橙環後重截）：世界座標位置 `(-88, 5.2, 262)`，目標 `(-88, 3.4, 285)`，FOV 52°。即站在右側地軌（x = −88）軸線上、地軌南端之外約 17 m、高 5.2 m，沿軌道望向棚。

```
?meters=sw:<low|mixed|high>&shot=free&pose=-88,5.2,262,-88,3.4,285&fov=52&nopanel&hour=12&reviewTime=40
```

三態結果（目測，contact sheet）：
- **0（mixed）**：右軌上的 showpiece 模組置於畫面中央偏下，兩旁各有一叢庭樹作框，軌道由前景引向模組，背後是棚骨架；沒有傘形頂入鏡。
- **−1（low）**：私人小庭的 pod 與庭樹、矮牆在中景，一棵樹遮住中間 pod 的下緣；模組要出現的前景（軌道位置）是空地，未被遮擋。
- **+1（high）**：階梯廣場的台階與座位者在右半，左半是廣場基座的白牆；前景空。基座牆約 4 m 高，鏡位 3 m 時會把平台全部遮住，故鏡位須高於約 5 m。
- court 6 的傘形頂：三態均不入鏡。前景樹與矮牆：不擋住模組位置，但 mixed 的兩叢庭樹與 −1 的一棵樹在畫面內，屬佈景的一部分（見下，Set 時須避開人物）。

**未採用的候選**（皆在 `survey/`）：
- c1／c2／c4／c5／d1–d4（由東南、西南、側面及離軌軸的斜角）：+1 的廣場基座牆（約 4 m）在 3 m 鏡高下遮住整個平台，或 mixed 被前景庭樹或另一組傘形頂切走一半。
- c3（高 9 m、後退 30 m）：court 6 傘形頂入鏡，+1 被遮一半。
- c6：mixed 被一棵大樹遮住；+1 為整面白牆。
- c8（左軌軸線 x = −112）：−1 時鏡頭落進樹叢，畫面被樹冠糊掉。
- e3／e4（同軸後退或前移）：e4 在 3 m 高下 +1 仍是整面牆；e3 離太遠。e2（5.2 m）是 +1 能看到平台的最低一檔。

**人物尺度係數**（瀏覽器量度，世界米；2026-11-14 owner 指示把群像縮至約 2–2.3 m）：SW 的居民群像**三態一樣大**，不像 NW hub 的 ×1.0／×1.6／×2.6。

| 狀態 | 站立成人 | 座位者 |
| --- | --- | --- |
| 改前（`FIG` 1.15，量度值） | 2.95 m | 0／+1 為 3.09 m；−1 pod 座位 3.71 m（另乘 `big` 1.2） |
| 改後（`FIG` .86，由比例計算，未重量） | 約 2.2 m（−1／0／+1 同） | 0／+1 約 2.3 m；−1 pod 座位約 2.8 m |

**為什麼原本是約 2.9 m**：刻意放大。`commonsPlaza.ts` 的 `FIG` 曾為 1.15，註解寫「larger than life」：英雄鏡頭離場址約 80 m，1.7 m 的真人比例會小得看不見。但棚的模組是真實米制（8.6 m 寬、3.2 m 高，門約 1.9–2.2 m，由畫面目測，未量 GLB），2.95 m 的人幾乎與模組等高，進不了門。**改動**：`FIG` 改為 .86（站立約 2.2 m），縮 25%；`sw:focal` 的 −1／+1 英雄鏡頭目測人群仍可辨（contact sheet 下排）。三態共用 `FIG`，故一併縮小；未重跑其他 site。凪建議取約 2.0–2.2 m（與群像同大，剛好進得了門）；門高須在步驟 5 前以 GLB 量實，必要時凪再取小一點。

**未處理／風險**：
- **橙色粗線已移除**：它是 `guest-marker-sw`（`createGuestMarker`，貼地 y 0.47 m 的圓角框環）。owner 2026-11-14 指示不需要，故 `cityChangeManager.ts` 改為 `mesh.visible = false`（對所有 site；材質與新變化脈衝仍照算，日後可恢復），[ART.md](../ART.md) 的 Saffron guest marker 列同步。測試只檢查材質 `emissiveIntensity`，不受影響。
- **樹可以移動**（owner 2026-11-14）：mixed 前院的兩叢庭樹與 −1 的庭樹都由 `commonsPlaza.ts` 的 `tree()`／`bush()` 程式生成，並非烘焙網格，位置可改。故上文「樹入畫」不再是淘汰條件；Set 時把它們移出凪與模組的路線，並確保移動後三態的前景仍清楚。+1 的階梯基座牆（約 4 m）仍是鏡位須高於 5 m 的原因，沒有因此放寬。
- 白色小拖車（tug）可以退場（owner 2026-11-14）：步驟 6 讓它在居民拍子開始前駛離或隱藏，換凪的模組駛入。
- 鏡位在右軌軸線，故凪的模組須是右軌（x = −88）的 showpiece（`SHOW` 的 `track`），**不是**進入時走完整吊運的 headline 模組（它由左軌 x = −112 駛入，該軸線在 −1 被樹遮住——樹既可移動，這條軸線其實也可重評）。居民拍子要的是「模組駛向她」，須在 Set 另設動畫。
- 模組朝向：軌道沿 z 軸，模組端面朝南（朝鏡頭），門在端面左側；凪由棚側（北）走近還是由鏡頭側（南）走近，須在步驟 6 決定，後者她會背向鏡頭。
- 只量過日景 12 時與夜景 22 時的靜止畫面，沒有量過過場中的遮擋；沒有取樣 FPS。

**程式改動**：`commonsPlaza.ts` `FIG` 1.15→.86、`cityChangeManager.ts` 隱藏站點標示環（兩者非 DEV 專屬，影響正式畫面）。**DEV 專屬**（只在 `import.meta.env.DEV` 內）：`src/main.ts` 的 `cityPose` 加可選 `fov`；新增 `?shot=free&pose=px,py,pz,tx,ty,tz[&fov=]`（讓 `npm run capture` 可取任意世界座標的鏡位）；`?nopanel` 隱藏 DEV 面板；`window.cityScene`／`cityCamera` 供瀏覽器內量度。參數名不可用 `cam`，它已被 review 鏡頭佔用。

## Step 4 targets

[artifacts/resident-sw-nagi/prompts.md](../../artifacts/resident-sw-nagi/prompts.md)：共用段、−1 前、+1 前、0 日、0 夜、角色設定圖，各附基準圖。**尚未生成任何 Gemini 圖，也未挑選**；目標圖與角色須由 owner 挑選。

**2026-11-14 嘗試（未完成）**：經 Claude in Chrome 驅動 Gemini（`/u/3/app`，帳號已登入）可上傳基準圖、選 Create image、貼 prompt 並成功生成 −1 前一張（對話標題「Nagi Awaits Her Room」，對話網址 `gemini.google.com/u/3/app/ef6c4b410fa104aa`，構圖保留鏡位與周邊，人物、長椅與花園可讀）。但按「Download full size」後 Gemini 顯示已下載，`~/Downloads` 與家目錄均找不到檔案，頁面內只有 1024×576 預覽 blob，故**沒有任何候選圖存入 `~/city2127-evidence/resident-sw-nagi/`，其餘三張場景與角色設定圖也未生成**。須先解決下載落點（或由 owner 直接以 prompts.md 在 Gemini 生成）才能繼續。Owner 其後提供該檔（`~/Downloads/Gemini_Generated_Image_yhg0yiyhg0yiyhg0.jpeg`，2730×1536），已複製為候選 `~/city2127-evidence/resident-sw-nagi/gen/minus1-before-c1.jpg`；未挑選，未發布。可見：鏡位與周邊保留，花園矮牆、樹與長椅在，凪坐長椅舉手機、平板放膝上；背景人群尺寸與基準相近。尚待 owner 判斷。

### 模組門實測（供步驟 5 定凪的尺寸）

量度來源為 `asset/models/city-kit-2127/modules.py` 的 `_door`／`event_module`（GLB 以角色合併網格，節點無法逐件量；單位為公尺，場景以 `UNITS_PER_METRE` .25 縮放）：

| 部件 | 尺寸 |
|------|------|
| 門扇 | 寬 1.05 m × 高 2.0 m |
| 門框 | 寬 1.25 m × 高 2.1 m |
| 雨篷 | 離門底 2.3 m，寬 1.9 m，出挑 .85 m |
| 門前階 | 兩級，下級高 .22 m |
| 模組整體 | 8.6 × 8.6 × 3.2 m（H 型廳 h = 7.4 m） |

**建議凪身高 2.0 m**（場景比例；人群已縮至約 2.2 m）：門扇淨高 2.0 m，凪須略低於門框頂 2.1 m 方可站姿通過；若要與背景人群同高（≈ 2.2 m）則須放大門（高 2.3 m 以上）或讓她低頭進門。取 2.0 m 時頭頂離雨篷約 .3 m，肩寬 .45 m 可通過 1.05 m 門。兩者取捨交 owner 決定。

## Known issues and blockers

- 階段 1（Meter 0／mixed 的棚）已由 owner 驗收（2026-11-14）；−1／+1 沿用 COMMONS，不在居民範圍。
- 地面入場模組在 `sw:focal` 被前景 court 6 傘形頂遮住（見 sw-event-shelf R3c）；舞台勘察須三態同時找鏡位。
- live 下 mixed 座位恆 4，故居民只接 band 切換，不接 mixed 內增減。
- 現有模組 GLB 只有靜態門與雨篷，可動門與雨篷節點須在 Set 步驟另建。
- 名字、年齡、職業為提議，未檢查與現有設定有否衝突。

## Important decisions

- 2026-11-14 owner：職業須是杜撰的 2127 職業（編為配送航路編集者）；場景要暗示「明日は別の部屋」（門側面板預約顯示）。

- 角色選「按日需要換場所的使用者」（owner 2026-11-14 指示：非店主），因為 mixed 的敘事是「場所可以按需要換」；與湊（52 歲、男）、時子（81 歲、女）在年齡與職業上拉開。
- 只做結果為 0 的兩種轉變；互動為手機呼叫、模組停靠鎖定、走進使用。
- 行動限於地面層，不要求人物鏡頭拍十層高處吊運。

## Next expected step

由 owner 以 prompts.md 在 Gemini 生成並挑選四張場景目標（−1 前、+1 前、0 日、0 夜）與一張角色設定圖，之後才進入步驟 5（角色）；進入前先量模組 GLB 的門高並決定凪的尺寸。台詞搬入 RESIDENT_COPY 前仍須 owner 批准。
