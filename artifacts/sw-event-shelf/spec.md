# SW 活動モジュール棚 — spec（mixed 狀態旗艦）

目標（只作風格與機制主目標）：`~/city2127-evidence/sw-event-shelf/gen/tower10-b.jpg`；原始 owner 目標 `baseline/target-0-mixed.jpg`（2 層）。B 圖只有約 7–8 層，**建模以 10 層 × 4 m 為準**。視覺驗收由 owner 單獨決定，本 spec 不含 judge／rubric／評分。

## 範圍

- 只做 SW focal 的 **mixed（0）狀態**；low／high 保留 `commonsPlaza.ts` 的 −1 私密庭園、+1 開放廣場，**整個 SW focal 搬到新地**（COMMONS PLAZA 的舊位置退役，模型保留）。
- `changeSites.sw`：`x -100, z 312, w 12, d 10, h 10, scale 4`（1 單位 = 4 m；地塊 48 × 40 m，棚 36 × 24 m 置中，不貼地塊邊）。
- 動畫在 `commonsPlaza.ts` 的 mixed parts 內；low／high 的 parts 與 3 秒過渡機制不變。

## 尺寸（米；GLB 以米建模，載入時 × 0.25 轉為站點單位）

| 項 | 值 |
| --- | --- |
| 棚外形 | 36 (x) × 24 (z) × 40 (y)，中心 = 站點中心，正面 −z（攝影機側） |
| 格 | 3 × 2 × 10 = 60 格；每格 12 × 12 × 4（3 × 3 × 1 單位） |
| 柱 | 4 × 3 = 12 根，0.9 × 0.9，線在 x = −18, −6, 6, 18；z = −12, 0, 12 |
| 梁 | 每層 y = 4k（k = 1..10）沿格邊，0.7 寬 × 0.8 高；k = 10 為屋頂框 |
| 地台 | y 0–0.4 淺色鋪面 38 × 26 |
| 模組 | 10.4 × 10.4 × 3.2（單層），雙層大廳 10.4 × 10.4 × 7.2；放在其層梁頂面，格內側隙 0.8 m |
| 垂直導軌 | 前（z = −12.6）後（z = +12.6）立面各 4 條，x = −18, −6, 6, 18，0.25 × 0.25，y 0.4–41；每格寬兩側都有導軌可扣住（B 圖只畫 2 條，因為 3 個 bay 的模組都要能就近扣軌，故延伸為 4 條） |
| 屋頂軌道 | 沿 z 的兩條 runway 在 x = ±18、y 40.8–41.4，由 z = −19 伸至 +19（前後各伸出 7 m） |
| 吊桁 | 橫跨 x ±19 的 bridge（白色箱梁 + 青色端車），沿 runway 移動；trolley + 絞盤 + 4 條纜索沿 bridge 移動（**程式內建，非 GLB**） |
| 轉運層 | k = 9 層（y 36–40）常空，內有 z 向轉運軌；後排放入用 |
| 地軌 | 2 條軌道（各 2 根鋼軌，軌距 3 m）在 x = ±12，由 z = −20（地塊邊）穿過地面層至 z = +12 |
| 高度 | h = 10 單位；吊桁頂 ≈ 42 m，仍低於 hero 航道（regional 160 m 以上）；40 m 落在服務層（30–45 m），見風險 |

## Target inventory（tower10-b.jpg 逐項）

| # | target shows | we have | spec |
| --- | --- | --- | --- |
| 1 | 深灰立體框架：粗柱＋每層粗橫梁，柱梁角有淺色接合塊 | 無 | GLB `sw_frame`（深灰 #3a3f45）；柱梁；每個柱梁交點一個 1.3 × 0.4 × 1.3 淺灰接合塊（`sw_rail`） |
| 2 | 兩條全高垂直導軌（半透明鋼色，貼柱面） | 無 | GLB `sw_rail`，前後各 4 條（見上），貼柱面外 0.35 m |
| 3 | 屋頂吊桁：白色長箱梁、青色端車、中央絞盤、纜索垂下 | 無 | bridge／端車／trolley／絞盤／纜索在程式（`sw_white`、`sw_cyan`、深灰），runway 在 GLB |
| 4 | 模組：白色箱體＋青色側板，圓角，前面有大窗，暖光室內，有桌椅綠植 | 無 | 4 款單層（A 白＋青角板、B 青為主、C 白＋側窗、D 屋頂花園台）＋1 款雙層大廳 H；GLB 節點 `MOD_A..H`；暖光室內、`furnish` 家具人物（來自 library） |
| 5 | 模組四隅有小連結部（淺灰塊，帶青色鎖燈） | 無 | 每模組 4 個 0.5 m 連結部（`sw_rail`）＋青色鎖燈點（`sw_cyan`，閃光由程式改 emissive） |
| 6 | 各層模組分佈不規則：有整層近滿、有層近空，可望穿空框到水面 | 無 | 60 格依固定表：35 入格（見「佔位表」），k=9 恆空 |
| 7 | 中層一個模組半滑入格（正在橫移） | 無 | headline 模組動畫的橫移段（見時間表）；靜態畫面以「mid-slide」姿態不要求 |
| 8 | 地面層：開放大堂，人群、長凳、桌椅、植栽，模組沿雙軌入場 | 無 | 地面格 x = ±12 兩條軌道（GLB）；中央 x = 0 為大堂；人群（約 18 人，程式內建 `crowd`）、長凳、桌椅（kit props）、盆栽樹；一個模組停在軌上 |
| 9 | 地台：淺灰鋪面、道路連接、行道樹、低矮綠籬、路緣 | 無 | GLB 鋪面 `sw_paving`；樹與綠籬在程式（沿用既有樹冠，不移樹）；道路連接為 owner 決定項 |
| 10 | 後排模組透過前排空格可見 | 無 | 同上；後排 z = +6 格也用同款模組 |
| 11 | 背景海面 | 世界既有 | 不做；z 312 地點南面即海 |
| 12 | 旗幟 | 圖無 | 不做 |

## 佔位表（mixed，35／60）

層 k = 0..9（地面至頂）；每層 6 格（x 欄 c = 0..2，列 r = 0 前／1 後）；`1` = 有模組。第 9 層恆空；k = 0 僅 x 欄 0、2（軌道上），中央為大堂。雙層大廳 H 佔 (k, c, r) 與 (k+1, c, r) 兩格。

```
k9: 0 0 0 / 0 0 0
k8: 1 0 1 / 0 1 0   (4)... 以程式表為準：tests/eventShelf.test.ts 固定 35
```

程式表為權威（`src/siteBuilders/eventShelf.ts` 的 `SLOTS`，每格 `variant`、`order`）；`order` 決定 `sharedSeats` 增減時的先後（count = 31 + sharedSeats，clamp 到 0..54，seats 4 → 35）。分佈：有 2 層近滿（k = 2、5）、1 層近空（k = 7 僅 1 格）、前排 k = 4、6 在 c = 1 留空以望穿。

## 機構與動畫時間表

過場總長 3000 ms（`SITE_TRANSITION_SECONDS`）。只有 headline 模組（`order` 最大的新增／最小的移除）做完整搬運；其餘靜靜滑入／淡出。reduced-motion／snapshot／reset／Undo／reconnect 立即設為權威狀態（`immediate`）。

| 時間 (ms) | 事件（headline 進場） |
| --- | --- |
| 0–300 | 模組已在地軌末端；bridge 往前沿 runway 移到前伸段，trolley 到該格 x |
| 300–700 | 絞盤下放，4 條纜索扣住模組頂四隅；連結部扣住前立面導軌 |
| 700–1900 | 模組沿前立面升至目標層（高度 `y = 4k`），纜索收放；若目標在後排則升至轉運層（k = 9）後越頂 |
| 1900–2600 | 橫移 12 m 入格（z），驅動靴就位 |
| 2600–2800 | 四隅連結部青光閃爍鎖定 |
| 2800–3000 | 纜索收回、吊桁待機位 |
| 3–13 s（近鏡停留） | 吊桁慢速環境循環（bridge ±6 m、trolley ±10 m，週期 12 s） |

移除（出場）為其逆序（鎖燈 → 縮回 → 降下 → 離軌）。後排格：1900–2600 為越頂橫移＋沿後立面放下，壓縮為 1900–2800。其餘模組：`order` 次序錯開，各自沿 z 從棚前方 12 m 外滑至格位（持續 800–1200 ms、ease-out），出場則反向。Band 切換（mixed ↔ low／high）：框架 `scale.y` 沿用 `Part` 層級（0–60 %），模組在框架完成前先滑出，不重做搬運。

## 材質（新 role，GLB 材質名即 role；`remapCityMaterials` 映射）

`sw_frame`（深灰 #3a3f45）、`sw_rail`（鋼灰 #8d96a0）、`sw_white`、`sw_teal`（#1f9a9a）、`sw_cyan`（emissive #38c8ff，鎖燈、端車）、`sw_paving`、`sw_glass`（opacity .12）、`sw_room`／`sw_floor`／`sw_glow`（暖光，`nightLit`）、`sw_amber`、`sw_green`、`sw_wood`、`sw_slate`、`sw_fabric`、`sw_dark`、`sw_skin`、`sw_skin_b`、`sw_cloth_a/b/c`（後列來自 `modules.ROLES`，供 `furnish` 使用）。Meter 色（publicSharing 粉）只用於程式內光環／標記，不進 GLB。

## 攝影機建議（SW `focal` shot）

- 現有：`sw:focal`（position [-95,30,-15] → target [-105,10,60]），`sw:district`（[-108,80,180] → 同 target）。
- 新：`sw:focal` = position [-84, 44, 232]、target [-100, 20, 312]（距離約 82 m，朝 +z 看，海在背後；俯角約 16°，立面主導）；`sw:district` = [-40, 90, 190] → target [-100, 14, 312]。位置為初值，截圖後微調；低多邊形 40 m 棚需拉遠至全高入鏡（垂直 FOV 與 40 m 高度驗證）。
- **正面朝向建議（待 owner 確認）**：正面朝 −z（北，面向城市與攝影機），兩條地軌向北伸至地塊邊（z −20），再接往最近街道 (-175,246)（西南偏西 75 m）。理由：攝影機與道路都在這側，棚背後是海，後立面轉運動作不被看到。替代：正面朝西（朝街道），但 hero 與近鏡看到的是側面。

## 要更新的測試與截圖

- `tests/commonsPlaza.test.ts`：mixed 由「pods／canopy／seats」改為棚（frame、60 格、35 佔位、sharedSeats → 模組數），lot 內檢查改用新尺寸（含地軌至 z −20）。
- 新 `tests/eventShelf.test.ts`：解析真 GLB（節點、材質 role、tris／bytes／bounds）、佔位表（35／60、k=9 空、H 不撞）。
- `tests/odaiba.test.ts`、`tests/headlineCamera.test.ts`、`tests/cityChangeManager.test.ts`、`tests/surveyAtmosphere.test.ts`：隨位置與 shot 更新。
- 截圖（`~/city2127-evidence/sw-event-shelf/`，3200 × 1800）：mixed 近鏡日／夜、全貌、吊桁搬運關鍵幀（0／700／1900／2600 ms）。

## Library

| element | route | entry |
| --- | --- | --- |
| 模組室內（家具＋人物） | reuse | `city-kit-2127/modules.py` `furnish` + kit props（`desk_monitor`、`meeting_table`、`sofa`、`potted_plant` …） |
| 室內暖光／玻璃 role | reuse | `modules.ROLES`（映射為 `sw_*`） |
| 活動模組殼（單層 4 款＋雙層大廳） | new entry | `event_module`（`modules.py`，參數 variant、width、depth、height、seed；draft） |
| 結構框架格（柱梁、導軌、軌道、連結部） | new entry | `lattice_frame`（`modules.py`，參數 bays_x、bays_z、levels、cell、rails、runway；draft） |
| 地面鋪面／道路連接 | site-only | 只服務此地台尺寸；理由：由 `lattice_frame` 外框決定，其他地點無需 |
| 吊桁（bridge／trolley／纜索） | site-only | 動畫部件在程式，屬此棚專有機構；若他處需要再升庫 |
| 人群（地面層） | reuse | `commonsPlaza.ts` 既有 site-local 站立／交談／坐姿 figures |
| 樹、綠籬、長凳 | reuse | `tree`（concentrationTower）、kit `bench`／`planter_1m`／`tree_round_*` |

## Below target

- B 圖約 7–8 層 → 本設計 10 層（owner 指定，非降規）。
- 導軌 2 條 → 4 條（見尺寸表；功能性決定，已列為待 owner 確認，若要嚴格 2 條，兩側 bay 的模組須先橫移至中柱再入格，會增加動畫段）。
- 道路連接：地軌只到地塊邊（z −20），未連至 75 m 外的街道（需 owner 決定是否加一段鋪面與路緣）。
- 人物數：B 圖地面約 18 人，模組內每格 1–2 人（`furnish`），不另加屋頂人群。

## 待 owner 決定

1. 正面朝向（上述建議：−z）。
2. 導軌 4 條 vs 2 條。
3. 地軌是否延伸並接到街道。
4. SW 的 −1／+1 與棚共用 12 × 10 單位地塊；−1／+1 北緣約 z 332 超出 `DISTRICT.maxZ`（320）約 12 m，是否接受。
