# SE 樣板實作規格 R1（Opus，2026-11-01）

目標圖：`target/target-rung-1.jpg`、`target-rung0.jpg`、`target-rung+1.jpg`（owner 生成）。底圖：`baseline/se-d4-*.png`。
目標：喺新鏡頭 `se:d4` 下，三個狀態嘅**輪廓、主要材質、強調色、生活細節**接近目標圖。唔求像素一致。

## 單位同限制（先讀）

- Site root `scale:3`：本地 1 單位 = 3 m。地塊本地 `w=9, d=9, h=46`（`layout.ts` `changeSites.se`）；`tests/concentrationTower.test.ts` 檢查所有狀態嘅可見 bounds 唔出地塊。**唔改 `changeSites`**。
- 鏡頭由 −X／−Z 方向（西北）45° 望過嚟，所以 site 嘅「正面」係 −X／−Z 嗰個角。`faces()`：side 2 = −Z，side 3 = −X。
- 狀態控制：`ConcentrationTowerController`（parts：`base`＝mixed hall，`pavilions`＝low，low／mixed／high 各 6 個 function module）。Layer：`towerBase`（low／mixed／high 都見）、`towerUpper`（只 high，cityChangeManager 用 `scale.y` 由 1e-3 長到 1）、`towerNeutralProps`（只 mixed）。
- Meter 邏輯不變：`functionModules` 喺 low=2、mixed=4、high=6；module group 名（`tower-function-{low,mixed,high}-{1..6}`）、diagnostics 介面、`representation` 字串不變。
- 效能：每個 group 結尾照舊 `bake()`；**每多一種 material 喺每個 baked group 多一個 draw call**，所以新 material 最多加兩隻（見下），全部 site 加起嚟 visible mesh 數唔好超過 baseline +15%（baseline 數據：`artifacts/closeup-zoom/final/A-se-review/mesh-count-r3.jsonl`）。
- 唔加 dependency；重用 `cityRig.ts` 嘅 `box／arc／shrubs／faces／bake／leafyCrown` 同現有 material。

## 新 material（加喺 `concentrationTower.ts` 頂部，只此兩隻）

- `amber`：`MeshStandardMaterial({ color: METER_COLORS.urbanConcentration, emissive: METER_COLORS.urbanConcentration, emissiveIntensity: .9, roughness: .5 })`。用於所有光帶／色環。**日夜都要讀到琥珀色**（舊 `publicLight`＋instance colour 夜晚變白，係已知失敗）。`tower-meter-band` 兩個 InstancedMesh 改用呢隻 material（test 要跟住改：檢查 material 係 `amber`，color 仍等於 Meter 色）。
- `timber`：`paint('#c99258', .62)`。低亭屋頂、木色面。
- 暖色室內：用 `amber` 低 intensity 唔可以（共用 material），所以室內發光面用現有 `publicLight` 以外嘅做法：**室內背板用 `timber`，前面加 `glass`**；暖光感靠 `amber` 細光條。如果效果唔夠暖，喺 R2 再議，唔好自行加第三隻 material。

## −1 低亭群（`pavilions` group，全部高度 ≤ 4.2 單位）

- **刪除** `serviceSpines`（兩支 32 單位光桿、cap、連接橋）。
- 四座亭，平面喺 9×9 內散開，之間留通道（佈局建議，可微調）：
  1. 拱頂咖啡亭：中心 (−2.4, −2.2)，3.6×2.6，牆身 1.5 高（cream＋前面 glass），屋頂係**半圓柱拱**（`CylinderGeometry` 半個，橫放，`timber`），拱頂最高約 3.0。
  2. 綠屋頂亭：中心 (2.3, −2.4)，3.2×2.8，兩層共 2.6 高：地面一圈 glass＋`amber` 光條，屋頂 `leaf` 平台＋`shrubs`。
  3. 懸挑頂亭：中心 (−2.2, 2.5)，2.8×2.4，1.6 高，頂一塊 3.6×3.2、厚 .15 嘅 `trim` 懸挑板，板邊 `amber` 線。
  4. 小服務亭：中心 (2.5, 2.4)，2.2×2.2，拱頂同 1 號（細版）。
- **有蓋步道**：一條 S 形路連四座亭：地面 `stone` 帶（寬 1.0，厚 .05），上蓋 `trim` 薄板（寬 1.2，厚 .08，高 2.0）用細柱（.08 方）每 1.6 一支；用 4–6 段直段組成 S 形即可。
- **行人**：12–16 個細人形（身 .14×.5×.1 box＋頭 .12 方塊，深色 `dark`），用**一個 InstancedMesh**（或 bake 後一個 mesh）擺喺步道同亭前，有幾個坐喺長凳（長凳 `timber` .8×.12×.25）。
- 低 function module（6 個，顯示 2）：改做步道旁嘅**小攤檔**（.9×.7×.7，`cream` 身＋`timber` 頂＋`amber` 前光條），位置沿步道。保持 group 名同 uniform scale 動畫。
- 兩個舊 `tower-meter-band`（pavilion 色環）改為 1 號、2 號亭屋頂上嘅細 `amber` 環（仍然一個 InstancedMesh，count 2）。

## 0 中高樓＋兩亭（`base` group＋`towerNeutralProps`）

- `base`（只 mixed 見，見下 high 改動）：cream 7×7 主體到 y≈15；**上面三層退台**（y 11、13、15 各縮 .8，每級邊緣 `leaf` 花槽＋`shrubs`）；−X、−Z 兩面各兩條**垂直 `amber` 光條**（寬 .12，由 y 1.5 到 14）；窗用現有 glass 帶，但改為較窄橫向窗（目標圖係 cream 為主、窗細）。頂部：`leaf` 屋頂花園＋3–5 個 `leafyCrown` 小樹＋現有 `tower-meter-band` 環（material 改 `amber`），環喺 y≈16.2。
- 兩座拱頂木亭（同 −1 的 1 號同款，細少少）放喺 +X／+Z 側前地（目標圖喺塔前），中間一條短有蓋步道接塔底。呢兩座亭同步道放入 `towerNeutralProps` layer（只 mixed 顯示）。
- mixed function module（6 個，顯示 4）：改做步道下嘅攤檔／座位組，保持名同動畫。

## +1 垂直街道塔（`towerUpper` layer）

- **`createSiteLayer(..., 'towerUpper', 18)` 改為 y = 0**，塔由地面起，layer 嘅 `scale.y` 動畫就變成「由地面長高」。
- **high 狀態唔再顯示 mixed hall**：`targetLevels` 第一項改為 `target.band === 'mixed' ? 1 : 0`。（test 有 base scale 斷言，跟住改。）
- 平台：8.4×8.4、高 1.4，cream，地面一圈 glass 店面＋頂邊 `amber` 線。
- 塔身：5.6×5.6，y 1.4 → 39，**四角倒角**（角柱 .5×.5 cream，貫通全高）。每層 1.3 高：樓板邊 `trim` 薄帶；樓層之間 `glass` 面；每三層一條 `amber` 細線（寬 .06）喺 −X、−Z 兩面。
- **升降機井**喺鏡頭面嗰個角（本地 (−2.8, −2.8)）：1.5×1.5 glass 柱貫通 y 1.4 → 39，邊框 `trim`；裏面一個**升降艙**（1.1×1.4×1.1，cream 框＋glass＋頂底 `amber` 線），獨立 group `tower-elevator-cabin`。
- **升降艙動畫**：`update(now)` 喺 early return **之前**按 `now` 計位置（週期 14 s：上 6 s、停 1 s、落 6 s、停 1 s，smoothstep），只喺 high 可見時郁。`immediate`／snapshot 唔需要特別處理（位置純粹係 `now` 嘅函數）。
- **功能層（垂直街道）**：6 個 high function module 改做 6 段功能區，每段 2 層高、喺塔身唔同高度（例如 y 4、9、15、21、27、33），每段 −X、−Z 面 glass 後面有 `timber` 背板＋2–3 個傢俬剪影（`cream` 細 box），頂底 `amber` 線；保持 group 名 `tower-function-high-N`、uniform scale 動畫、數目由 `functionModules` 控制。
- **空中花園**兩層：y≈12.5、y≈25，該層塔身縮入 .6，邊緣 `leaf` 花槽＋`shrubs`。
- **冠部**：y 39 → 41 退台屋頂花園（`leaf`＋`shrubs`＋4–6 個 `leafyCrown`），外圈一個大 `amber` 環（半徑 3.6–4.0，厚 .25），用現有 `tower-meter-band` 其中一個 InstancedMesh（或者新增但 test 要更新數目）。
- 刪除舊玻璃圓柱、疊環、太陽能板等全部舊 upper 幾何。

## 鏡頭

- `src/headlineCamera.ts`：`'se:focal'` 改為 `{ position: [5, 115, -215], target: [175, 72, -45] }`（即 d4）。`se:district` 唔郁。
- 跑 `tests/headlineCamera.test.ts` 確認距離／hero 側規則過。

## Tests

- `tests/concentrationTower.test.ts`：按上面改動更新斷言（band material、base 只 mixed、upper layer y、新增升降艙會隨 `update(now)` 改 y 嘅斷言）。地塊 bounds 斷言保持。
- `npm test && npm run build && git diff --check` 全過。

## 截圖（交 Opus 審）

- 開 dev server：`npm run dev -- --port 5173`（完咗要停）。
- 用 `playwright-cli -s=se`，`resize 1600 900`，每個 URL `goto` 後 **sleep 10**，`screenshot --filename=<abs path>`，失敗（5 s timeout）就隔 4 s 重試，最多 4 次。
- URL：`http://localhost:5173/?meters=se:{-2.5|0|2.5}&shot=se:focal&hour={12|22}&reviewTime=20`。
- 輸出到 `artifacts/se-closeup-polish/r1/`：`se-rung{-1,0,+1}-{day,night}.png`，再用 Python PIL 砌兩張三連圖 `triple-day.jpg`、`triple-night.jpg`（每張 2400 闊），同一張 `vs-target.jpg`（上排目標圖、下排 R1 日間）。
- 變化中途：`?meters=se:-2.5` 載入後喺 console 用 DEV 嘅 `playMeters` 或者等效方法播 −1 → +1，喺開始後 1.5 s 截 `se-transition-mid.png`；做唔到就記低原因，唔好花超過 15 分鐘。

# R2 審核同修正（Opus，2026-11-01，對照 `r1/vs-target.jpg`）

R1 判斷：+1 已經有獨立輪廓同升降井位置，方向啱；但三個狀態都**被藍色玻璃主導**，同目標嘅「米白框＋暖色室內」差好遠，−1 太細睇唔清。逐項修正：

1. **全部狀態：玻璃改為少用。** `glass` 會反射天空變藍，係「似鄰居」嘅主因。鏡頭面（−X、−Z）嘅樓層唔再用整片 glass：改為 `cream` 樓板邊（厚 .22）＋ `trim` 細直欞（每 .9 一條，寬 .06）＋後面暖色室內板。玻璃只留喺升降井同地面店面。
2. **新增第三隻 material `warm`**（owner 規則內嘅例外，R1 證明兩隻唔夠）：`MeshStandardMaterial({ color: '#f3cf98', emissive: '#ffb45a', emissiveIntensity: .35, roughness: .7 })`，做所有室內背板。夜晚要見到一層層暖光。`timber` 只留屋頂同木面。
3. **+1 塔**：
   - 角柱加粗到 .7，`cream`；樓板邊 `cream` 每層都有，令塔身讀成米白格框（對照目標圖）。
   - 室內：6 段功能區以外嘅樓層都用 `warm` 背板（較暗都得），功能區傢俬剪影保留。
   - 升降井：井框 `cream`（四支 .18 角柱＋每 3 層一條橫樑），井內冇 glass；升降艙放大到 1.3×1.8×1.3，外殼 `amber`（發光），令佢喺日間同夜晚都係塔身上最光嗰點。
   - 冠部 `amber` 環：torus 半徑 4.2、管粗 .35（仍喺 12×12 地塊內），喺 y≈40.5；冠部樹加到 6–8 棵。
4. **0 中高樓**：主體 `cream`，每層細窗（`warm` 背板＋`trim` 直欞），−X／−Z 面兩條 `amber` 光條加闊到 .3；退台改為**三級明顯退縮**（每級縮 1.0、每級頂有 `leaf` 花槽＋ `shrubs`）。
5. **−1 地塊擴大**：`layout.ts` `changeSites.se` 嘅 `w`、`d` 由 9 改為 **12**（36 m；owner 已批准擴大地塊）。四座亭按比例放大 1.3 倍並散開到新地塊，屋頂（拱頂、綠屋頂、懸挑板）加厚；每座亭加 `amber` 屋簷光線；步道上蓋加闊到 1.5。行人數目保持。
   - 改 `w／d` 之後跑全部 root test：`coastalCanopy`、`skyways`、`odaibaScene` 地面、`districtMeters`、`mobility`、`energyPrototype`、`housingCityCheck` 都會讀新尺寸。**有 test 失敗就試 11，再唔得就保持 9 並報告邊個 test 擋住**，唔好改其他 test 嘅淨空數字。
   - 0／+1 狀態唔使跟住放大（塔仍置中），只係 −1 同 0 嘅低亭可以用多咗嘅位。
6. **Mesh 數**：low／mixed 超出 +15% 預算可以接受（佔全場約 950 calls 嘅 1–2%），但 R2 唔好再加 group；新 `warm` material 盡量放喺已有 bake group 入面。報告實際數字。
7. **截圖**：同 R1 一樣（`r2/` 目錄），另加 `vs-r1.jpg`（上排 R1、下排 R2，日間）。今次要試埋變化中途截圖：`?meters=se:-2.5&shot=se:focal&hour=12` 載入後，喺 console 搵 DEV 嘅 meters 播放 hook（`main.ts` 入面 `playMeters`）改到 `se:2.5`，開始後 1.5 s 截圖；仍然做唔到就寫明卡喺邊。

# R3（Opus，2026-11-01；owner：−1 要做到目標圖咁大、推近鏡頭）

**已改好（Opus，喺工作樹）**：`layout.ts` `changeSites.se` = `x:182, z:-38, w:14, d:14`（42 m；中心向東北移 7 m，避開兩棵 surveyed 樹 k2／k5——佢哋一被剔走，`plantCanopy` 後面所有樹冠嘅 index-based 旋轉都會移位，令遠處 district 塔／pod 嘅淨空 test 失敗）。全部 root test 已過。**唔好改 `coastalCanopy.ts`。**

1. **鏡頭跟新中心**：`se:focal` → `{ position: [12, 115, -208], target: [182, 72, -38] }`；`se:district` → `{ position: [27, 150, -188], target: [182, 40, -38] }`。
2. **−1 推近 shot**：
   - `cityChangeManager.ts` 嘅 `CarrierChange` 加 optional `low?: true`：focal 變化前或後嘅 band 係 `low` 時設定（喺 `applyExhibitionLayout` 建 change 嗰度，按 site 前後 band 判斷；四個 site 通用）。
   - `headlineCamera.ts` `headlineShot`：focal shot 時，如果 `change.low` 而且 `SHOTS` 有 `${socket}:focal-low`，就用佢；否則照舊。只為 SE 加 `'se:focal-low'`，起始值 `{ position: [96, 85, -124], target: [182, 18, -38] }`（約 140 m）。用截圖微調：**−1 低亭群闊度要佔畫面約 35–45%（對照 target-rung-1.jpg 嘅比例再大少少都得），同時 0 狀態中高樓（約 55 m）唔可以出界**，因為 −1↔0 變化前後用同一個鏡頭。保持 hero 側規則同 `tests/headlineCamera.test.ts` 距離限制。
   - `tests/headlineCamera.test.ts` 加斷言：`low` focal change → `se:focal-low`；冇 `low` → `se:focal`；其他 site 有 `low` 但冇對應 shot → `:focal`。
3. **−1 重做（14×14 地塊，target-rung-1.jpg 為準）**：
   - 四座亭佔滿地塊，留步道空間：兩座要明顯係**兩層**（約 3.2–3.6 單位高，≈10 m），一座拱頂木亭要做到目標圖咁大（約 5×4 平面），一座綠屋頂亭有一層屋頂花園。
   - 地面店面要大片暖色（`warm` 背板＋`glass`）——目標圖嘅亭係「發光」嘅，唔係實心盒。
   - S 形有蓋步道貫穿地塊，上蓋闊 1.5、離地 2.4，兩邊有矮花槽同 `leafyCrown` 細樹（6–10 棵）。
   - 行人 20–28 個，分佈喺步道同店前，部分坐喺長凳；人仍然係一個 InstancedMesh。
   - 低攤檔（function modules）沿步道。
4. **0／+1 用多咗嘅位**：0 嘅兩座木亭同步道按比例放大填地塊前方；+1 嘅平台改為 10×10 有樹嘅廣場平台（塔身尺寸唔變）。
5. **升降艙**：喺新鏡頭仍然要睇到——如果唔明顯，加大到 1.6×2.2×1.6，或者喺井框加 `amber` 導軌線。
6. **測試**：`npm test && npm run build && git diff --check`。
7. **截圖**（`r3/`）：同 R2，另外 −1 同 0 都要喺 `se:focal-low` 影（`?shot=se:focal-low`），+1 喺 `se:focal`。`vs-target.jpg`（目標 vs R3：−1 用 focal-low、0 用 focal-low、+1 用 focal）、`triple-night.jpg`、`vs-r2.jpg`、變化中途（−1→0，用 focal-low）。
