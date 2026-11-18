# bay-flower-placement — Q02-B 蓮花受電：選址與放置

- Owner: cc100053（owner 逐輪判定）；實作由 Claude
- Status: IN_PROGRESS（R1 完成，待 owner 判定）
- Branch: `feat/bay-flower-placement`（2026-11-18 由 `origin/main` 開出）
- Base commit: `6724989bbff0ff8a0f65a9ee6e2a23f778e7ede3`
- Last verified commit: NONE（本節只寫文件，未改程式）
- Remote availability: `origin/feat/bay-flower-placement`

## Session Git state

- Session starting branch and HEAD：`feat/question-rotation` `eff8c4de`，與 origin 同步；本 decide session 在同一節內接續，由 `origin/main` 開出本分支
- Last fetched origin/main commit：`6724989b`，2026-11-18（fetch exit 0）
- Local changes present at session start：未追蹤 `Dev_QA.md`（owner 本機檔），保留
- Upstream integration status：NOT INTEGRATED
- Pending Git conflicts or synchronization blockers：NONE。`feat/question-rotation` 未 merge；本分支不含輪換程式（見「與抽題輪換的關係」）

## Goal and acceptance criteria

把已 merge 的 [bay-flower-receiver](bay-flower-receiver.md) 模型（Q02-B「宇宙からの光の柱を受ける、湾の花」）以原尺寸放入城市：花浮於南部公園西岸外的海面，機房平台接公園西岸步道。每輪由 owner 判定，驗收以 owner 一人為準。

## In-scope files and dependencies

- 模型（只讀，除非 R 輪 brief 要求改 builder）：`asset/models/bay-flower-receiver/`（`bay-flower-receiver.glb` 有光柱、`bay-flower-receiver-nobeam.glb` 無光柱；節點 `Q02B_Root` > `Q02B_Receiver`、`Q02B_SubseaLink`、`Q02B_ShoreStation`、`Q02B_LightBeam`）。
- 預計改動：`src/layout.ts`（新常數 `BAY_FLOWER`；移動 `bayCruisers` 中 `[-700,250,1.4]` 一段）、新 `src/bayFlower.ts`（仿 [hydroTerrace](../../src/hydroTerrace.ts)）、`src/odaibaScene.ts`（載入）、`src/mobility.ts`（如遊船相位要重搜）、新 `tests/bayFlower.test.ts`。
- 目標清單：[artifacts/bay-flower-placement/spec.md](../../artifacts/bay-flower-placement/spec.md)。
- 不在範圍：Q02 投票接線（屬 `question-rotation`（handoff 在 `feat/question-rotation` 分支） 階段 2.2，該分支未 merge）、近鏡、結果卡及設施卡文案、空置態切換程式。

## Important decisions（owner 2026-11-18，本 decide session）

- 角色：Q02-B（抽題輪換的 Q02「技術受容性」選項 B）。Q02 三模型各有地塊（`QUESTION_ROTATION_PLAN.md` 第 2 節，在 `feat/question-rotation` 分支）。owner 原話：選「西南公園外海」、「淨海面，機房平台保留」、「原尺寸 1:1」、「接受 (−712, 300)」。
- 目標：模型本身（已經 owner 逐輪驗收並 merge，PR #4）；不另生成目標圖。
- 狀態：只有兩個——顯示（花＋海底管道＋機房平台）與空置（只留機房平台，`Q02B_Receiver`、`Q02B_SubseaLink`、`Q02B_LightBeam` 收起，海面為原本海面）。空置態不需新模型或目標圖。
- 尺寸：原尺寸 scale 1。花徑約 128 m（Blender bounds 不計光柱：X −105.2…61.3、Y −67.7…60.3、Z −15.9…41.8），頂高約 42 m，光柱至 900 m。
- 放置：見下表。

## 選址

| 項目 | 數值 |
| --- | --- |
| 花中心 | (−712, 300) m；模型 waterline y 0 對城市海面 `WATER_MAIN` y −0.8 |
| Yaw | three.js `rotation.y = 2.6088`（149.47°）：模型 `SHORE` (−95, 56) 轉到 +x，即機房在花正東 110.3 m，(−601.7, 300) |
| 機房平台 | shore frame f −6…12、s −10…14：步道邊 f −6 落在 world x ≈ −596，平台伸出至 x ≈ −614 |
| 花的範圍 | 約 x −776…−648、z 236…364（半徑約 64 m） |
| 岸線（實測，raycast） | z 300：`COAST_REVETMENT` x −602…−597，`WATERFRONT_PROMENADE` x −595…−588（y −0.2）；z 240 與 360 相差 ≤ 2 m |
| Hero | 0 px（花在 hero 視軸約 64° 外）；owner 規則：hero 可見度不作 gate |

驗證（2026-11-18，DEV 頁面內 raycast `cityScene`，及截圖）：

- 範圍 x −960…−440、z −100…520，每 10 × 20 m 取樣：花範圍內只有海面（`WATER_MAIN`，x > −755）及遠灣平面（無名，y −1.2，x < −755）；唯一移動物件為遊船（`water-taxis`，即 `bayCruisers[-700,250,1.4]`，沿 x 由 −848 至 −552、z ≈ 250 往返）。
- 空の環：花中心距環中心 (−40, −40) 753 m，大於 rx 350 ＋ 花半徑 64；光柱不穿過環甲板（250 m）及 district 空中環線（170 m，同圓）。
- 其他航線：`bayCruisers[-650,-40,-1.7]` 在 z −59…−21，相距 > 290 m；`sweepway` 終點 (−580, 24, −10) 相距 310 m；shore lane、ferry、interchange 皆在島北／西北，遠離。
- `SCAN_LOT` 不適用（只掃陸地；海面地塊以本表 raycast 代替，計劃 3.5 所指 `SCAN_LOT` 只用於陸地新地塊）。
- 截圖：`~/city2127-evidence/bay-flower-lot/decide/`（`top-wide.png` 全島，`top-lot.png` 地塊正上方，`oblique-sea.png`、`oblique-shore.png`）。

未驗證：

- `WATER_MAIN` 西邊界 x ≈ −755 與遠灣平面（y −1.2，比 `WATER_MAIN` 低 0.4 m）的接縫正好在花西緣，`oblique-sea.png` 可見兩種水面紋理分界；花的花瓣會跨過接縫。
- 平台高度：模型平台頂 QY 1.5 m（模型 waterline 之上），放在海面 −0.8 時平台頂 y 0.7，比步道（y −0.2）高 0.9 m。
- 服務層 drone（30–45 m）實際航跡；公園西岸步道上的行人路線（`promenades`）是否經過平台接口；夜景；FPS。
- 移走遊船航段後，`mobility.ts` 的遊船相位（2.5 m 水面淨空搜尋）是否要重搜。

## 與抽題輪換的關係

- 輪換程式在 `feat/question-rotation`（未 merge）。本分支由 main 開出，不含 `rotationLayout`／`lotRuntime`。
- R1 以常駐方式放入（仿水の棚田先例），以便 owner 判定位置與外觀；顯示／空置切換留待輪換分支的 2.2 `lotRuntime`。
- **待 owner（R1 判定時答）：** version4 run 是否常駐顯示蓮花？選項：(a) 常駐顯示（同水の棚田），(b) version4 只顯示空置態（機房平台），蓮花只在輪換 run 出現。計劃 3.6 要求「version4 run 外觀不變」，傾向 (b)；R1 為方便判定可加 DEV 參數 `?bayFlower=0|1`。

## R1 brief

| Item | Acceptance for review |
| --- | --- |
| 放置 | 以 `addCityModel` 載入 `bay-flower-receiver.glb`（含光柱），`position (−712, −0.8, 300)`、`rotation.y = 2.6088`、scale 1。實測世界 bounds：機房平台步道邊在 x −596 ± 1 m，花中心 (−712 ± 1, 300 ± 1)。 |
| 海面 | 花的浮台 waterline 對齊城市海面 −0.8；不得浮空或沒頂，無雙層水面。記錄跨過 `WATER_MAIN`／遠灣平面接縫的情況（3200 × 1800 近景一張），如接縫可見即列 short row。 |
| 平台接步道 | 平台頂與步道頂高差 ≤ 0.1 m。優先改 builder `QY`（1.5 → 0.6，平台頂＝步道 −0.2 減海面 −0.8），重新匯出兩個 GLB 並跑 `review_flower.py` 確認無其他變化；否則加一段無障礙斜道。步道須保持連續，行人可由步道走上平台至機房兩側門。 |
| 遊船 | 移走 `bayCruisers` `[-700,250,1.4]`：移至花範圍 ＋ 30 m 以外的開闊海面（例如 z ≥ 420 或 z ≤ 180 一帶，仍沿公園西岸外海），或刪除；按 `mobility.ts` 現行方法重搜相位，水面淨空測試通過。 |
| 光柱 | `Q02B_LightBeam` 直上 900 m，不穿過空の環或空中環線；日景淡、夜景可讀。如在其他鏡位（例如 hero）出現不當光線，記錄。 |
| 顯示／空置 | 加 DEV 參數 `?bayFlower=0` 只留 `Q02B_ShoreStation`（花、海底管道、光柱收起），`?bayFlower=1`（預設）全部顯示；兩態各截一張。 |
| 截圖 | `npm run capture -- --size=3200x1800` 一批：`focal-day`、`focal-night`（由海上望花及機房）、`overview`（公園西岸全段）、`platform`（平台接步道近景）、`seam`（花西緣水面）、`vacant`（`?bayFlower=0`）。 |
| 效能 | 載入前後 `fps.sh` 量 hero 日夜 FPS，作 R1 基準；下降超過 10% 列 short row。 |
| 測試 | 新 `tests/bayFlower.test.ts`：中心、yaw、平台步道邊位置；遊船所有時刻距花中心 > 64 ＋ 30 m。root `npm test`、`npm run build`、`git diff --check`。 |

## R0 verdict

> decide session 接受 (−712, 300)

## R1（2026-11-18）

改動：

- 模型：`build_flower.py` 加 `SHORE_DY = −0.88`（岸邊機房、平台、護岸石及海底管道由岸邊段起整組下降，花及花莖不動）及 `PLAT_APRON = 1.5`（平台陸地邊多鋪 1.5 m）。未改 `QY`／`FY`：兩者為絕對高度，只改 `QY` 會令機房地台高 1.2 m、側門踏級不到，護岸石凸出鋪面。重建前先以原 builder 在 scratch 重跑，GLB 與已提交版本逐 byte 相同，方才修改。重新匯出兩個 GLB：94,119／93,303 tris（+288，鋪面多一行）。
- `src/layout.ts`：`BAY_FLOWER = { x −712, z 300, yaw 2.6088, r 64 }`；`bayCruisers` 第六段 `[-700,250,1.4]` → `[-780,170,1.4]`（全程 x −928…−632、z 144…196，岸線 x −610；距花中心最近 108 m）。`WATER_PHASES` 不變，`mobility.test.ts`（2.5 m 淨空）通過。
- 新 `src/bayFlower.ts`：載入 GLB 於 (−712, −0.8, 300)；光柱不投影；DEV `?bayFlower=0` 收起 `Q02B_Receiver`、`Q02B_SubseaLink`、`Q02B_LightBeam`。`cutUnderPlatform`：平台平面範圍（內縮 0.1 m、y < 0.5）在 fragment shader 捨去 `COAST_REVETMENT`（y 0.12，`service_area` 共用材質，範圍內無其他使用者）。
- `src/odaibaScene.ts` 載入；新 `tests/bayFlower.test.ts`（加入 `npm test`）；PROJECT、LIBRARY 已同步。

頁面實測（DEV，`Box3.setFromObject(node, true)` 及 raycast）：

| 項目 | 實測 |
| --- | --- |
| 根節點 | (−712, −0.8, 300)，`rotation.y` 2.6088 |
| `Q02B_Receiver` | x −774.0…−649.8、z 236.9…361.4、y −4.8…34.3；花瓣距中心最遠 63.07 m；浮台 y −4.8…2.8（跨過海面 −0.8） |
| `Q02B_ShoreStation` | x −618.8…−594.2、z 280.6…315.4；鋪面頂 y −0.18，步道 −0.19（z 288／300／308 raycast） |
| 平台陸地邊 | x −594.23（f −6 線在 −595.73）；步道邊實測 x −595.35…−594.90（z 284–316），重疊 ≥ 0.67 m |
| 海面接縫 | `WATER_MAIN` 西界 x ≈ −755；浮台半徑 26.25 m（x −738…−686）不跨接縫，只有外圈花瓣跨過 |

截圖（`~/city2127-evidence/bay-flower-placement/r1/`，3200 × 1800）：`focal-day`、`focal-night`、`overview`、`platform`、`seam`、`vacant`、`beam-night`、`hero-day`；`oblique-shore`（2400 × 1350，與 decide 同鏡位）及 `r0-vs-r1.jpg`；Blender `blender/platform`、`blender/shore`（review staging 的步道仍在舊高度 1.5 m，故平台看似下沉，屬預期）。

逐項自評：

| Brief 行 | 結果 |
| --- | --- |
| 放置 | met：中心、yaw 如上；步道邊由 −596 ± 1 改為鋪面壓上步道至 −594.2（apron，見平台行） |
| 海面 | met：浮台跨海面，無浮空或沒頂。short（既有）：`WATER_MAIN`／遠灣平面接縫是一條斜暗線，R0 已可見（`r0-vs-r1.jpg` 左），由花西側穿過；浮台不跨接縫 |
| 平台接步道 | met：高差 1 cm；步道連續（`platform.png`），護岸頂在平台內不再露出。方法與 brief 不同：整組下降而非只改 `QY` |
| 遊船 | met：最近 108 m（> 94 m）；相位不用重搜 |
| 光柱 | met：hero 不可見（`hero-day`）；夜景清楚（`focal-night`、`beam-night`），與空の環在透視上重疊但不穿過。short（待 owner 看）：日景光柱亮度不算淡（`focal-day`）；夜景光柱四周天空有一條較淺的寬光帶 |
| 顯示／空置 | met：`vacant.png` 只剩機房平台，海面為原本海面 |
| 截圖 | met（另加 `beam-night`、`hero-day`、`oblique-shore`） |
| 效能 | met：hero 1920 × 1080 headed Chrome，前 day 60.0／night 60.0，後 day 59.9／night 59.9（vsync 封頂，未能顯示真實餘量）；3200 × 1800 headless 截圖時 hero 43.4、`seam` 43.9 |
| 測試 | met：見 Actual validation results |

未驗證：行人路線（`promenades`）是否經過平台接口及有否人走上平台；服務層 drone 航跡；平台近景夜景。

待 owner（R1 判定時答）：

1. 位置、外觀及平台接駁是否接受？
2. 日景光柱亮度：保持，或日間調淡？
3. version4 run 是否常駐顯示蓮花：(a) 常駐，(b) 只顯示空置態（傾向 (b)，計劃 3.6「version4 外觀不變」）。

## Completed work

- Decide session（2026-11-18）：owner 選定海面區域、空置態、尺寸及地塊；raycast 實測岸線與障礙；四張截圖。

## Actual validation results

- Verification status: NOT RUN（只有文件；地塊驗證見「選址」）
- Date and checked commit/worktree: 2026-11-18，`origin/main` `6724989b` 上的 DEV 頁面（`feat/question-rotation` 工作樹，城市西岸部分與 main 相同）
- Integrated commit and checks: NOT INTEGRATED

## Known issues and blockers

- 見「未驗證」及「待 owner」。

## Next expected step

Owner 開新 session，貼上 round prompt 開始 R1：

> place-building round for `bay-flower-placement`: worktree `/Users/fatboy/city2127`（main checkout，branch `feat/bay-flower-placement`）, read `docs/handoffs/bay-flower-placement.md`. Owner verdict on R0: «decide session 接受 (−712, 300)».
