# q02a-hydro-placement — Q02-A 水の棚田：選址與周邊環境

- Owner: cc100053
- Status: IN_PROGRESS（R1 已交付，待 owner 判定）
- Branch: `feat/q02a-hydro-placement`（主 checkout，由 origin/main 建立）
- Base commit: 2d9c28cdd7113f87b665e3e87d054324cc30266f
- Last verified commit: NONE
- Remote availability: `origin/feat/q02a-hydro-placement`（decide 文件提交後推送）
- GitHub Issue (optional): 無

## Session Git state

- Session starting branch and HEAD: `codex/nw-focal-connections` 3137296257ac98c407d8d9a72448cbed1a14848a（已推送，與遠端一致；較 main 多 3 個 commit，未合併，維持原狀）
- Last fetched origin/main commit: 2d9c28cdd7113f87b665e3e87d054324cc30266f（2026-11-17 fetch 成功）
- Local changes present at session start: 僅未追蹤的 `Dev_QA.md`（owner 本機記錄，已追加 Q16，不提交）
- Upstream integration status: NOT NEEDED（由最新 origin/main 建立）
- Pending Git conflicts or synchronization blockers: NONE

## 建築背景

- 出處：規劃組 Survey v2 的 U02（「お台場の電力設備を更新するなら、新技術をどこまで導入する？」）選項 A「既存の電力設備を中心に更新する」，即以實績為先，更新既有變電設備與地面電網（[SURVEY_V2](../planning-team/SURVEY_V2.md#q02技術受容性)）。畫像為 Q02-A「古い変電所をまたいで育った、空中の水の棚田」（`Q02-A_imag_v2.png`，存於 noifex 的工作機，本 repo 未收錄）。
- 素材：[q02a-hydro-terrace](q02a-hydro-terrace.md)。六支 Y 形腳柱跨越舊變電所，其上為四層錯開的圓形抽水蓄能水池、瀑布、四架 7.6 m 水車及發電機房，下沉蓄水池經堰出海。尺寸 64.8 × 65.1 m，地面以上 32.2 m（蓄水池及海面低至 −3.4 m）。原點為地面中心，正面為 three.js +z，海側為 +x。約 30 萬三角面、23 種材質、8.5 MB。GLB 為靜態，水流及水車轉動須另行製作（[q02a-water-threejs](q02a-water-threejs.md)）。
- 與現行城市的關係：Q3 能源題（`energy-2127`）的 `water-storage` 選項已有「水庭儲能」模型。水庭一號位於 (−310, −151)，直徑約 28 m；水庭二號位於 (30, −395)，0.72 倍。Q02-A 同屬抽水蓄能，概念上與水庭重疊。

## Important decisions（owner 2026-11-17）

- 角色：**待定**，日後會跟隨 Meter；本任務只處理位置及周邊環境配合，不改動投票、Meter 或能源門檻。
- 位置：西岸海面，水庭一號旁，**與水庭一號並存**（不取代）。
- 朝向：**正面朝向市區，瀑布朝南面海**。
- 預算：GLB 原樣放入，先量度 FPS，再決定是否減面。
- 目標：以現有 GLB 為目標，不另生成目標圖。

## 選址

| 項目 | 數值 |
| --- | --- |
| 中心 | (−375, 0, −170) m（y 待 R1 對齊海面或基座） |
| Footprint | 66 × 66 m，x −408…−342，z −203…−137 |
| 縮放 | 1（原尺寸） |
| Yaw | three.js `rotation.y = +π/2`：正面（+z）轉向 +x（東，即市區及水庭一號方向），海側（+x）轉向 −z（南面開闊海面） |
| 與水庭一號 | 水庭一號東西範圍約 x −324…−296，相距約 18 m |

驗證：

- `SCAN_LOT=66,66`：全城陸地空位 0 個；56 × 56 僅 (228, 238)（hero 0 px）；48 × 48 有三區。
- `SCAN_LOT=66,66,-375,-170`：除 `WATER_MAIN`／`tidal-edge`（海面，屬預期）外無其他阻擋原因，hero 3,059 px。對照：(−360, −205) 0 px，(−330, −215) 1,137 px；若置於水庭一號原位 (−310, −151)，會碰到一條 route（−273, −123）及水庭本身。
- `src/layout.ts` 的座標表中，footprint ±15 m 內只有 shore lane 一點 (−413, 100, −171)，高 100 m，遠高於建築頂部 32.2 m；城市層 80–100 m 及 regional 層均無衝突。
- 未驗證：服務層 drone（30–45 m）實際航跡、水上的士及船道（scan 不覆蓋海面）、水庭一號 canopy 及 spur 的實際外框、海面高度與 GLB 自帶 Ocean 海面的關係、hero 以外的鏡位、FPS。

## R1 brief

| Item | Acceptance for review |
| --- | --- |
| 放置 | 以 `addCityModel` 載入 `asset/models/q02a-hydro-terrace/q02a-hydro-terrace.glb`，中心 (−375, −170)，`rotation.y = π/2`，scale 1，常駐（不跟隨任何投票）。實測世界 bounds，確認正門朝東、出海瀑布朝南。 |
| 海面配合 | 隱藏或刪除 GLB 自帶 Ocean 海面（中心約為 local +26 m），以城市 bay 水面為準。腳柱及蓄水池須落於城市水面高度，不得浮空，亦不得出現雙層水面。出海瀑布須落至城市水面。 |
| 岸邊連接 | 由北面岸線（約 z −118 至 −100）建一條公共步橋或堤道，通往變電所正門或蓄水池平台；沿用 `energyPrototype` 水庭 spur 的步道做法（4 m 寬、欄杆、燈），不得碰撞水庭一號及其 spur。須在一張 3200 × 1800 細節圖中看見連續可行的路線。 |
| 鄰接 | 與水庭一號的水面間距不少於 15 m（以實際網格 bounds 量度）。檢查與水庭一號 canopy、配電門架 (−310, −105) 一帶、shore route 及岸邊樹木是否穿插，如有則記錄。 |
| 背景閱讀 | Hero 畫面中須能辨認為一座跨越舊變電所的水池建築（建築本身不少於 3,000 px）。日景及夜景均須截圖；夜景至少以路燈或欄杆燈讀出輪廓。 |
| 效能 | 載入前後以 `fps.sh` 量度 hero 日夜 FPS，記錄為 R1 基準。下降超過 10% 列為 short row，下一輪再討論減面。 |
| Evidence | `$CITY2127_EVIDENCE_ROOT/q02a-hydro-placement/r1/`：`focal-day`、`focal-night`、`overview`、`access`（岸邊連接）、`neighbour`（與水庭一號並列）、`hero`；另附與 GLB 單獨渲染的對比圖一張。 |

由 [PROJECT](../PROJECT.md)、[VALIDATION](../VALIDATION.md)、[asset library](../../asset/models/LIBRARY.md) 及 [target inventory](../../artifacts/q02a-hydro-placement/spec.md) 開始。沿用 `modelAssets.ts` 的載入路徑及現有步道材質，不改動能源 runtime、Meter 或問卷。按 place-building **Rounds** 完成 capture、commit、push 及 owner review。角色確定後，Meter 接線另開任務。

## R1（2026-11-17）

Owner 指示在 decide session 內直接完成 R1（「做埋 R1，喺呢度做」）。

### 改動

- `src/hydroTerrace.ts`（新）：以 `addCityModel` 載入 GLB，中心 (−375, −170)，`rotation.y = π/2`，scale 1，常駐；載入時移除 `q02a_sea`。GLB 地台頂（local y 0）置於 y = 1.2 m，即 bay 水面（實測 −0.80 m）以上 2 m；地台下加石砌護岸（至水面以下）及淺色壓頂。由 `loadOdaiba` 加入場景。
- 步道：4 m 寬、欄杆、柱燈、雙柱橋墩，由島北緣 (−380, −139) 至北岸護岸 (−344.4, −74.2)，長 74 m，終點與護岸 rim 頂（0.45 m）齊平。
- `src/layout.ts`：新增 `HYDRO_TERRACE`；**水上的士環線西端改道**——原外行段 (−330, −215)→(−430, −120) 正好穿過選址，改為 (−320, −232)→(−410, −228)→(−440, −246)→(−405, −262)，與島相距 ≥ 21 m，船隻在瀑布南面駛過。`src/mobility.ts`：環線長度由 955 m 變為約 870 m（週期仍為 140 s），故重新搜尋相位，`WATER_PHASES.loop` 13.5 → 11.25（11–11.5 s 視窗內全周期無船相碰）。
- `src/waterRooms.ts`：水房及 lane beacon 選位加入島嶼地塊避讓（水房 r + 12 m，beacon 12 m）。
- `tests/hydroTerrace.test.ts`（新，已加入 `npm test`）：全周期每艘船與地塊距離 > 10 m；水房、beacon 避開地塊且 beacon ≥ 4；步道起於島上、落在北岸線上，與潮間帶小島、亭、beacon、水房、水庭一號及其 spur 均 > 5 m；島及步道可在 Node 中建構。

### Brief 逐行

| Row | 結果 |
| --- | --- |
| 放置 | **達成。** 實測世界 bounds x −408.0…−342.9、y −2.2…33.4、z −200.9…−137.2，全在 66 m 地塊內；變電所飾邊伸向東（x −362.7），瀑布伸至南端 z −200。GLB 實載 275,076 三角面。 |
| 海面配合 | **達成。** `q02a_sea` 已移除，無雙層水面；腳柱、蓄水池及出海瀑布底部均在 bay 水面以下（focal-day／night）。 |
| 岸邊連接 | **部分達成（偏離）。** 原定由北岸接正門；但正門東面一帶有潮間帶小島及亭，水庭一號的 spur 亦落在 (−310, −104)。可行路線改為由島北緣（距變電所約 20 m）接北岸，`access.jpg` 可見連續路線。島上由步道至正門的鋪面沿用 GLB 原有地台，未另加。 |
| 鄰接 | **達成。** 水庭一號（`?energy=a`）與島相隔約 18 m 水面，兩者及步道互不穿插（`neighbour.jpg`、測試）。 |
| 背景閱讀 | **未達。** Hero 構圖內看不到本建築：decide session 所記的 3,059 px 為 lot scan 的地面可見度指標，並非 hero 鏡頭實際像素。近景日夜均可讀，夜景以池緣光帶讀出輪廓。 |
| 效能 | **達成。** 有頭 Chrome，1920 × 1080，DPR 1，hero `meters=nw:0`，捨棄首樣本：改動前 日 45.9–47.6／夜 46.7–47.6 FPS；改動後 日 47.8–48.9／夜 47.1–49.0 FPS，無可量度下降（hero 不見本建築）。近景鏡位 headless 約 55 FPS。 |
| Evidence | `~/city2127-evidence/q02a-hydro-placement/r1/`：`focal-day`、`focal-night`、`overview`、`access`、`neighbour`、`loop-top`、`hero`、`hero-night`，以及 `before-*` 與 `*-before-after.jpg` 對比；`fps-before.txt`／`fps-after.txt`。未有 GLB 單獨渲染對比（素材 handoff 的重匯入圖在 noifex 工作機）。 |

### 附帶影響（須 owner 知悉）

- 六座水房按「均勻分佈」演算法重新選位：(−173, −245)→(−142, −266)、(−249, −218)→(−220, −217)、(−380, −108)→(−412, −85)，其餘三座不變；hero 前景帶粉紅樹的水房向左移，並多見一支 lane beacon 柱（`hero-before-after.jpg`）。原六座位置在新佈局下仍全部合法，如需保持原狀，R2 可把六座位置固定。
- 水上的士環線西端改道及相位改變（見上）。

### 驗證

- `node --experimental-strip-types` 個別執行 `mobility`、`energyPrototype`、`energyPipeline`、`odaiba`、`hydroTerrace` 測試：全部通過。
- 完整 `npm test`（exit 0，含新 hydroTerrace 測試）、`npm run build`（成功，只有既有 chunk size 警告）、`git diff --check`（無輸出）：2026-11-17 於 R1 工作樹執行。survey／module-swap 未改動，未執行。

## Next expected step

Owner 判定 R1。下一輪（新 session）貼上：

> place-building round for `q02a-hydro-placement`: main checkout `/Users/fatboy/city2127` on `feat/q02a-hydro-placement`, read `docs/handoffs/q02a-hydro-placement.md`. Owner verdict on R1: «…».

待決問題：是否固定原六座水房位置；hero 看不到建築是否可接受（角色確定跟 Meter 後會有 headline 近景）；步道接北緣是否可接受，抑或要求改接正門。
