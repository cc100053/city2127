# pod-frame-tower — 混凝土格架蛋艙塔（僅模型）

- Owner: cc100053
- Status: ACCEPTED，已放置（業主 2026-11-18 接受 R4 並指示合併 main；2026-11-19 於 `feat/question-rotation` 放於住宅 U 舊址，作抽題輪換 Q06-B，見 [question-rotation](question-rotation.md)）
- Branch: `feat/pod-frame-tower`（由 `origin/main` `5d66cfa8` 開出；R1 於 R2 session 開始時 commit）
- Base commit: `13f83e1566988a10e8798ec027c97ba10012654e`（R1 工作時的 HEAD，`codex/nw-focal-connections`）
- Last verified commit: 見 `## R4` 驗證（R4 commit 於 `c742193` 之上；R3 為 `c742193`，R2 為 `c713fc9`，R1 為 `9ed3e7f6`）
- Remote availability: `origin/feat/pod-frame-tower`（R4 已 push）；已合併入 `origin/main`（merge commit `d0701e3`）

## Session Git state

- Session starting branch and HEAD: `codex/nw-focal-connections` @ `c0034611`，其後另一 session 推進至 `13f83e15`。
- Last fetched origin/main commit: `5d66cfa84ec5df682ff0d922b8e25d6267a29011`（2026-11-17 fetch 成功）
- Local changes present at session start: 未追蹤 `Dev_QA.md`；另一 session 曾於同一 checkout 編輯 `src/`、docs（已由其 commit）。
- Upstream integration status: INTEGRATED（2026-11-18，`d0701e3`，見 `## R4` 合併）
- Pending Git conflicts or synchronization blockers: `asset/models/LIBRARY.md` 在 `codex/nw-focal-connections` 與 `origin/main` 之間有差異（drawer-housing 列），所以 R1 改動不能直接帶去以 main 為基礎的新分支。

## Goal and acceptance criteria

按業主目標圖（下稱「目標」）建造一座獨立的 Blender GLB 模型：開放式混凝土格架、插入及懸挑的粉彩蛋形艙、白色樹枝狀支撐、退縮的發光玻璃樓層連種植露台，以及天台農場。**只做模型**：不做周邊環境、道路、選址或 Meter 接線（業主 2026-11-17）。驗收方式：業主逐輪判定（place-building **Rounds**），業主的判斷是唯一的視覺驗收。

- 目標圖：`~/city2127-evidence/pod-frame-tower/r1/target.webp`（業主原圖副本）
- 體量（業主選定）：35 × 28 × 32 m，正面 5 跨、側面 4 跨，跨距 7 m；地面層加 6 層，層高 4.5 m，天台 31.5 m 再加棚架；蛋艙最多伸出 7 m。
- 範圍（業主選定）：只做模型，library 資產，status draft；選址及 Meter 角色日後另開任務。

## In-scope files and dependencies

- `asset/models/pod-frame-tower-2127/build_pod_tower.py` — 建模腳本（`PODS` 表、`facade`、`struts`、`build`），輸出 `.blend` 及 `.glb`。
- `asset/models/pod-frame-tower-2127/review_pod_tower.py` — 預覽算圖，`--view target|front|back|right|pod`，加 `--eevee` 用 EEVEE。
- `asset/models/city-kit-2127/modules.py` — 新增 module：`limb`、`branch_strut`、`egg_pod`、`grid_frame`、`roof_farm`；新增 `ROLES`：`concrete`、`pod_y`、`pod_p`、`pod_s`、`pod_in`、`soil`、`leaf_l`、`crop`。以上全部只係追加，原有 module 不受影響。
- `asset/models/LIBRARY.md` — 新增 5 個 module 列、一段 draft 說明及資料夾列 `pod-frame-tower-2127`。
- 不在範圍內：`src/`、選址、change sheet、Meter 接線。

指令（Blender 5.2）：

```sh
cd asset/models/pod-frame-tower-2127
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 -P build_pod_tower.py
/Applications/Blender.app/Contents/MacOS/Blender -b pod-frame-tower-2127.blend --factory-startup --python-exit-code 1 -P review_pod_tower.py -- <out.png> --view target --eevee
node --experimental-strip-types tests/assetLibrary.test.ts   # 於 repo 根目錄執行
```

## Completed work

### R1（2026-11-17）

- 格架：35 × 28 m，column 1.1 m，beam 0.85 m，每層 slab 0.45 m，鋪地基座。
- 樓層：地面層至第 6 層各一個 `glass_room`（退縮 2.5 m，有家具、住客、室內花槽）；露台有玻璃欄河、白色扶手、花槽 blob 及垂藤。
- 22 個 `egg_pod`：以窗為軸的極座標參數化，平滑橢圓窗（58° × 34°）、白色窗框及窗邊、+x 端圓窗、暖光內襯、地台、沙發、植物、燈及住客。其中 7 個為懸挑角艙（最長 13.5 m），12 個帶 `branch_strut`。
- 天台：`roof_farm`，包括菜畦、作物、邊緣花槽、3 列白色拱形藤架隧道及 5 名住客；正面有三個白色拱門。
- 約 209k 三角面，GLB 7.4 MB，48 個 role mesh。
- 曾做 3 輪比對（r1 → r4 算圖）：修正鏡頭及對比、把鋸齒窗改成平滑橢圓、加粗支撐、增加綠化、收窄窗及減少藤架。

## Actual validation results

- Verification status: PARTIAL
- Date and checked commit/worktree: 2026-11-17，於 `13f83e15` 上未 commit 的工作區。
- Commands/manual checks and results：建模腳本 OK（`@@BUILD@@ tris 208530`）；`tests/assetLibrary.test.ts` 通過（23 props、14 modules、26 folders）；`git diff --check -- asset/models` 乾淨。完整 `npm test` / `npm run build` NOT RUN（R1 未改 `src/`）。
- Evidence/environment：`~/city2127-evidence/pod-frame-tower/r1/`，包括 `target-vs-model.jpg`、`model-target-view.png`、`model-back.png`、`model-pod-closeup.png` 及 `target.webp`。全部為 Blender EEVEE 算圖，1600 × 1200 正交鏡頭；尚未放入城市，因此無瀏覽器擷圖，FPS 未量度。
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: 只有本 handoff。

## Known issues and blockers

R1 與目標的差距（依 `target-vs-model.jpg` 分析），已轉成下文 R2 brief：

1. **格架單薄、平板。** 目標的 column 粗壯（約 1.4–1.5 m），樑深（約 1.1–1.2 m），面上有清水模板接縫，色調為暖淺灰；R1 的 column 1.1 m、樑 0.85 m，顏色平灰（`concrete` .50），在 EEVEE 下偏冷而發白。
2. **蛋艙不夠飽和，亦欠光澤。** 目標的艙呈牛油黃、三文魚粉、薄荷綠，有強烈高光；R1 的 `pod_*` 被 AgX 洗淡，粗糙度 .25 仍偏啞。
3. **艙的位置。** 目標大部分中小型艙「坐」在格內（擱在 slab 上，被前方樑柱部分遮擋）；R1 正面的艙多數浮在樑柱前方 0.6–2 m，看起來像貼上去。
4. **支撐不足。** 目標差不多每個艙都有白色樹枝狀支撐，3–5 枝分叉，粗而彎，抓住樑底或 column 側面；R1 只有 12 / 22 個艙有支撐，每個只分兩叉，懸挑大艙的支撐在目標視角幾乎看不見。
5. **每格綠化及室內不夠豐富。** 目標每一格都有盆栽樹、從樑垂下的藤蔓及滿溢的花槽，室內暖光而多植物；R1 的玻璃房只見米色天花及地台，花槽 blob 稀疏而且多邊形感明顯（`sub=1`、平面著色）。
6. **天台。** 目標的菜畦以綠為主，滿佈紅、橙色作物，白色拱形藤架沿周邊排列；R1 的木邊菜畦以褐色為主，作物點太少，藤架 blob 呈多邊形。目標第 6 層亦有退台菜園。
7. **地面層。** 目標有大面積玻璃店面、白色拱形入口及基座四周的花槽；R1 的拱門在目標視角看不見，地面層亦被樓上的艙遮住。
8. **欄河。** 目標是細金屬直欄杆；R1 是玻璃板加白色扶手。
9. **三角面。** 約 209k，尚未定預算。R2 每項加細節後要記錄增量；若超過約 300k，可降低 blob 及 limb 的細分。

其他：R1 尚未 commit（見 Git 狀態）。

## Important decisions

- 2026-11-17 業主：「build only the model refer to this target photo, no need to build surrounding things and road.」
- 2026-11-17 業主選定體量 35 × 28 × 32 m，範圍「淨係模型」（library draft，暫不選址、不接 Meter）。
- 坐標：three.js 米制，正面 −z，底部中心在原點；每個 role 一個 mesh，材質命名為 `pft_<role>`。
- 新部件寫入 `modules.py` 並在 `LIBRARY.md` 登記（AGENTS.md 規則）；`branch_strut`、`egg_pod`、`grid_frame`、`roof_farm` 可供其他地點重用。
- 業主未就 R1 給予逐項意見；2026-11-17 只指示「analyze the different from target, hand over to new session do r2」，所以 R2 brief 以上述差距分析為準。

## R2 brief

量度以目標視角為準（`review_pod_tower.py --view target --eevee`；如需對齊城市證據規格，可另出 3200 × 1800 算圖）。

| # | 項目 | 量度目標 |
| --- | --- | --- |
| 1 | 格架 | column 1.45 m、樑深 1.15 m、樑寬 1.2 m；`concrete` 改為暖淺灰約 (.68, .66, .62)；每 1.5 m 一道淺模板接縫（凹 2 cm，或另一較深 role 的細條） |
| 2 | 蛋艙材質 | `pod_y` ≈ (.98, .84, .48)、`pod_p` ≈ (.96, .62, .56)、`pod_s` ≈ (.68, .84, .62)；粗糙度 ≤ .15，目標視角每個艙都要見到高光 |
| 3 | 艙的位置 | 正面中小型艙至少 8 個坐入格內：艙底距 slab 頂 ≤ 0.3 m，艙中心在格架面內 0–1.5 m，被樑或 column 遮擋 10–30 % |
| 4 | 支撐 | 22 / 22 個艙有支撐；`branch_strut` 增加 3–5 枝分叉及第二級小分叉；懸挑大艙根部半徑 ≥ 0.6 m，並抓住 column 側面及樑底兩處 |
| 5 | 每格綠化 | 每層每面每格最少：1 個滿溢花槽（`sub=2`、平滑）、60 % 的格有 1–3 m 垂藤；30 % 的格在玻璃後有盆栽樹（`tree_indoor` 或 `tree_round_s`） |
| 6 | 室內 | 目標視角下，玻璃房的米色天花可見面積減半（降低 `room` 亮度，或加入植物及家具）；每格見到暖光 |
| 7 | 天台 | 菜畦以綠為主，作物點數量 ×3；白色拱架沿周邊一圈加中央兩列；第 6 層正面加一個退台菜園（2 格寬） |
| 8 | 地面層 | 玻璃店面 4.5 m 高；三個白色拱門在目標視角可見（必要時把擋住的艙上移一層）；基座四周有花槽 |
| 9 | 欄河 | 細金屬直欄杆：扶手加間距 0.12 m 的欄杆柱，取代玻璃板 |
| 10 | 預算 | 記錄三角面數；> 300k 時降低 blob 及 limb 細分 |

## R2

### R1 verdict

業主原話（2026-11-17）：「analyze the different from target, hand over to new session do r2」。沒有逐項意見，因此以上文 `## R2 brief` 為本輪 brief。

### 工作環境

- R2 session 開始時，主 checkout 先開出 `feat/pod-frame-tower`（`origin/main` `5d66cfa8`）並 commit R1（`9ed3e7f6`）；其後另一 session 把主 checkout 切回 `codex/nw-focal-connections` 繼續 drawer-housing 工作。為免互相干擾，R2 改在獨立 clone `/Users/fatboy/city2127-pod` 進行（AGENTS.md 允許獨立 clone；並非 worktree）。主 checkout 仍留有本地分支 `feat/pod-frame-tower` @ `9ed3e7f6`，與 origin 相比只落後 R2 commit。
- 主 checkout 是 partial clone（`blob:none`），不能直接 `git clone` 它；clone 由 GitHub 取得，R1 commit 以 bundle 匯入。

### 改動

- `modules.py`：`grid_frame` 新增 `beam_w`、`joint`、`joint_step`（模板接縫：周邊 column 每 1.5 m 一圈、外樑面每 1.5 m 一道，4 cm 寬、凸出 2 cm，role `concrete_j`）；`branch_strut` 支援多個 base（column 側面加樑底）及第二級小分叉（`twigs`）；`egg_pod` 新增 `ni`（小艙用 32 段）；`roof_farm` 新增 `density`、`crops`、`ring`（周邊一圈白色拱架隧道）、`bed`、`soil`。新 role `concrete_j`；`concrete`、`pod_*` 改色。以上 module 只有本建築使用。
- `build_pod_tower.py`：column 1.45 m、樑 1.15 × 1.2 m；正面 9 個艙坐入格內；24 個艙全部有支撐；每格懸掛花槽、金屬直欄杆、垂藤、室內盆栽樹；第 6 層正面退台菜園；地面層 4.5 m 店面、三個白色拱門及基座花槽；建築本身的材質覆寫（較暗的暖色地台、艙殼粗糙度 .12 加 coat .6、樹葉及白色支撐平滑著色）。
- `review_pod_tower.py`：天空改為漸變（令光滑艙殼有反射），look 改為 `AgX - Punchy`、曝光 −0.6 EV。R1 的算圖過曝，混凝土發白；`r1-vs-r2.jpg` 中的 R1 已用 R2 燈光重新算圖，以便公平比較。

### 逐項自評（目標視角，`review_pod_tower.py --view target --eevee`）

| # | 項目 | 結果 | 量度 |
| --- | --- | --- | --- |
| 1 | 格架 | 達成 | column 1.45 m、樑 1.15 × 1.2 m、`concrete` (.68, .66, .62)；接縫每 1.5 m，用 `concrete_j` 細條。接縫在目標視角下只隱約可見。 |
| 2 | 蛋艙材質 | 部分達成 | 三色按 brief 設定，粗糙度 .12，coat .6。大艙及角艙有明顯高光；格內小艙高光較弱，未能確認每個艙都見到高光。AgX 下牛油黃仍偏米色。 |
| 3 | 艙的位置 | 達成 | 正面 9 個艙坐入格內：艙底距 slab 頂 0.15 m，艙中心在格架面內 0.1 m；從目標鏡頭以光線投射量度遮擋率為 21–31 %（9 個中有 1 個為 31 %，略高於上限）。 |
| 4 | 支撐 | 達成 | 24 / 24 個艙有支撐；每個 3–5 枝分叉，另加第二級小分叉；懸挑大艙根部半徑 0.62 m，同時抓住 column 側面及樑底。目標視角下，不少分叉位於艙底而被艙身遮住。 |
| 5 | 每格綠化 | 達成 | 108 / 108 格有懸掛花槽（`sub=2`、平滑著色；有艙的格只在兩端放植物）；65 / 108 格（60 %）有 1.2–3 m 垂藤；33 / 108 格（31 %）玻璃後有 `tree_indoor`。 |
| 6 | 室內 | 部分達成 | 目標視角中米色像素（色相 15–47°、飽和度 .2–.6、明度 > .45，400 × 300 取樣）由 7,948 減至 4,396，即減少 45 %，略少於一半；地台發光由 .8 降至 .45。暖光感仍不及目標。 |
| 7 | 天台 | 達成 | 菜畦以綠色 role 為主；作物點約為 R1 的 4–5 倍（密度 1.6 倍，作物 3 倍）；周邊一圈白色拱架隧道，中央兩列；第 6 層正面左側 2 格寬退台菜園（13 × 4.6 m）。 |
| 8 | 地面層 | 達成（有一點詮釋） | 地面層 4.5 m 高，玻璃由 0.25 m 至 slab 底 4.05 m；按「4.5 m」為樓層高度理解，另一種理解是玻璃本身 4.5 m 高。三個白色雙層拱門在目標視角可見；基座四周 15 格有花槽，入口三格留空。 |
| 9 | 欄河 | 達成 | 99 格（沒有艙的格）設扶手、底欄及 4,554 枝欄杆柱，間距 0.12 m，role `rail`，取代玻璃板。 |
| 10 | 預算 | 達成 | 289,846 三角面（R1 為 208,530），GLB 9.1 MB；以小艙 `ni=32` 及三角柱欄杆控制在 300k 以下。 |

### 驗證

- `@@BUILD@@ tris 289846, glb 9,067,592 bytes, 24 pods`；`blender-asset-qa` `qa_check.py`（concrete、concrete_j、white、pod_y、rail）：沒有 inside-out island，也沒有法線不一致；開放邊來自刻意的單面 strip、欄杆柱及窗框；`pft_white` 有 70 個退化面（limb 端蓋），影響不大。
- `node --experimental-strip-types tests/assetLibrary.test.ts` 通過（23 props、14 modules、26 folders）；`git diff --check` 乾淨。沒有改動 `src/`，因此未執行 `npm test` / `npm run build`。
- 證據：`~/city2127-evidence/pod-frame-tower/r2/`，包括 `model-target.png`、`model-back.png`、`model-pod.png`、`r1-vs-r2.jpg`、`target-vs-r2.jpg`、`target.webp`。全部為 Blender EEVEE 1600 × 1200 正交算圖；模型未放入城市，因此沒有瀏覽器擷圖，FPS 未量度。
- 共做了 3 輪擷圖比對，另做一次曝光測試。

### 尚待處理（供 R3 參考）

- 目標視角與目標圖構圖不同：目標是轉角三分之四透視，兩個立面約各佔一半，每面約見 3 格；`--view target` 是近正面的正交鏡頭，可見 5 格。若業主同意，R3 可加一個透視的 `target3q` 鏡頭，原鏡頭則保留作逐輪比較。
- 目標的艙窗較大、較高，並有白色窗櫺及多個小圓窗，室內暖光明顯；R2 的窗仍是低而寬的單一橢圓窗，襯裡呈大片米色。
- 白色支撐在目標中是立面上最顯眼的元素之一；R2 的分叉多在艙底，目標視角下不夠搶眼。
- 牛油黃在 AgX 下偏米色，若要更接近目標，需要再提高飽和度或改用另一種 view transform。

## R3 notes（R2 與目標的詳細差距）

業主 2026-11-17 要求在 R2 判定前先寫好 R3 筆記並加入更多細節。以下根據目標圖局部放大（左上大艙、右面艙群、地面層、天台）及取色寫成，並把 R2 自評中「部分達成」的兩項一併列入。若業主對 R2 另有意見，以業主原話為準，本節只作輔助。

### 取色對照（sRGB，目標 1448 × 1086，R2 為 `model-target.png` 1600 × 1200）

| 位置 | 目標 | R2 | 差距 |
| --- | --- | --- | --- |
| 牛油色大艙頂部受光面 | (247, 228, 222) | (172, 165, 144) | R2 暗約 30 %，偏灰綠；目標接近象牙白帶暖粉 |
| 粉紅艙受光面 | (243, 203, 197) | (169, 159, 157) | R2 粉色幾乎消失 |
| 混凝土 column / 樑受光面 | 約 (180–205, 165–175, 150–165) | (115–135, 119–138, 108–129) | R2 暗且偏冷灰；目標為受陽光照射的暖淺灰 |

結論：R2 把 R1 的過曝修正得太多。主因是燈光及調色，而非材質本身。目標是晴天午後的暖陽：陽光偏暖，天空藍，陰影帶藍紫。

### R3 brief（量度以新的 `target3q` 鏡頭為準；舊 `target` 鏡頭保留作逐輪比較）

| # | 項目 | 量度目標 |
| --- | --- | --- |
| 0 | 鏡頭 | 在 `review_pod_tower.py` 新增 `--view target3q`：透視鏡頭，焦距約 35 mm（橫向視角約 54°），從正面右前方轉角望向建築（正面 −z 與右面 +x 各佔畫面約一半，轉角 column 位於畫面橫向 50 ± 5 %），俯角約 32°，建築約佔畫面寬度 65 %、高度 85 %，看得見天台。R2 的 `target` 實際上是看正面及右面的近正面正交鏡頭，與目標構圖不同。 |
| 1 | 燈光及調色 | 只改 review 算圖：太陽色溫約 5,000 K（約 (1, .93, .82)），強度約 4；天空漸變（地平線 (.85, .88, .92) 至天頂 (.45, .62, .92)）；曝光約 0 EV，look 用 `AgX - Base Contrast` 或 `Punchy`，以取色為準：艙頂受光面距目標值 ±15，混凝土受光面亮度 165–200。另外輸出一張同燈光的 R2 圖，供 `r2-vs-r3.jpg` 使用。 |
| 2 | 艙殼顏色 | 以受光面取色為準：牛油色 ≈ (245, 228, 205)，粉紅 ≈ (240, 200, 192)，鼠尾草綠 ≈ (205, 222, 190)。若燈光改後仍偏差，才調整 `pod_*` role；三色要清楚分得出。 |
| 3 | 主窗 | 窗寬為艙長的 55–60 %、窗高為艙高的 45–50 %；窗中心高於艙中心 0.05–0.1 H（R2 的窗偏低，又像一條橫縫）。玻璃以 4–6 條白色弧形直窗櫺分格（寬約 6 cm），窗框為細白邊（R2 的 0.13 m 圓管太粗，改為約 0.06 m）。窗由艙前方略向上包。 |
| 4 | 副窗 | 每個長度 ≥ 6 m 的艙，在尾端或頂部加 1–2 個小圓窗（直徑約 0.12 L，白框）；細艙最少 1 個。目標的大艙在主窗旁另有一個小橢圓窗。 |
| 5 | 艙內 | 主窗內可見暖光室內：淺木地台、梳化、2–3 盆植物、暖色燈光（`pod_in` 發光提高，令窗內亮度高於艙殼陰影面）；`pod_in` 大片米色襯裡在目標視角下要減少：可在窗後加一面暖光背牆或書架，擋住大部分襯裡。 |
| 6 | 支撐的形狀 | 目標的支撐不是幾條分開的圓管，而是白色有機「骨」形：粗主幹（根部約 0.9–1.0 m）在分叉處以圓滑蹼狀曲面連接，再分成 3 枝扁闊肢，貼住艙底兩側並伸到艙側。上方另有扁平的「骨板」臂（寬 0.8–1.2 m、厚 0.3 m，板上有 2–3 個橢圓穿孔，兩端為圓盤關節），由 column 頂伸出扣住艙頂。R3 為 `branch_strut` 加分叉處的蹼狀圓角（例如在分叉處加一個壓扁的 blob 連住各枝），並在 library 新增 `bone_arm` module（穿孔扁臂）；最少 4 個大艙及角艙有 `bone_arm`。 |
| 7 | 支撐的可見度 | 在 `target3q` 鏡頭下，每個懸挑艙最少見到 2 枝白色分叉；支撐的根落在樑頂、樑面或 column 側面，並以圓盤狀腳座連接（直徑約 1.5 r）。部分支撐由下一層 slab 邊向上長，像格內的白色小樹（目標正面中層有 3–4 棵）。 |
| 8 | 艙的分佈 | 對應 `target3q` 構圖：正面左上一個牛油色大艙懸挑（已有）；右面靠後位置（z ≈ +2 至 +8）放第二個大艙，現時 (22.8, 23.4, −5.0) 太近轉角；右面中下層加 2 個粉紅艙（一個懸挑、一個半入格），右面花槽平台（目標右面中層有一個白色圓形花盆平台，直徑約 3 m）。正面格內艙保持 9 個，但顏色混合：牛油 4、粉紅 3、鼠尾草綠 2。 |
| 9 | 格架細節 | 模板接縫要看得見：接縫 role `concrete_j` 加深至約 (.42, .40, .37)，寬度增至 6 cm；樑面及 column 面加對拉螺栓孔（每塊模板 2 × 2 個，直徑 4 cm，深色圓點，可用細小八角形片）；column 與樑交接處加一圈約凸出 3 cm 的節點帶。混凝土加輕微色差（兩個相近的 concrete role 隨機分配給不同構件，亮度差約 6 %）。 |
| 10 | 頂層農場 | 目標頂部兩層都是開放式菜園：第 6 層全層取消玻璃房，改為整層菜畦（約 6 行，種植密度同天台），四邊欄河；第 5 層正面及右面靠外 1 格寬亦為菜畦，玻璃房向內退一格。每層最少 2 名農夫。 |
| 11 | 天台 | 菜畦作物以淺綠為主（新增或改用約 (.55, .78, .30) 的葉色），夾雜紅橙番茄及紫、白花邊；拱架在目標中是幼身深綠或古銅色金屬拱（直徑約 5 cm、高約 3 m），被藤及番茄覆蓋，沿邊排成隧道；R2 用白色 0.09 m 圓管、葉團稀疏。R3 改為深綠細管，每個拱的葉團加至 8–10 個並沿拱身連續，拱與拱之間的葉團連成頂篷。天台邊緣植物向外垂出 0.5–1.5 m。 |
| 12 | 垂藤及花 | 目標的垂藤是由樑邊連續垂下的淺黃綠色藤簾，長 2–4 m，夾雜粉紅及白色小花；R2 是一串串圓球。R3 每條垂藤改為 2–3 條細長幼枝（扁長 blob 或 `limb` 加小葉片），葉色較淺，30 % 的垂藤帶花點（`pod_p` 或新增花色 role）。正面每層最少 3 段藤簾橫跨 2 格以上。 |
| 13 | 室內暖光 | 玻璃房從目標視角要像亮燈的室內：可見地台以暖白 / 淺木色為主，天花有暖光；每格最少見到 1 件家具或 1 盆植物。量度：`target3q` 中玻璃房範圍的平均亮度高於相鄰混凝土陰影面。地面層店面是全高玻璃，直櫺間距約 1.5 m，室內最亮。 |
| 14 | 地面層拱門 | 目標的入口不是細拱圈，而是白色光滑的半蛋形拱殼（殼厚約 0.4 m，跨度約一格 5.5 m、高約 4 m），由店面向前伸出約 2 m，內側有暖光。正面至少 2 個、右面 1 個。基座花槽改為圓滑的弧形花床（綠草加白、粉、紫小花及 1–2 棵小樹），但全部留在 plinth（frame 外 1.5 m）範圍內，不做周邊環境。 |
| 15 | 預算 | R2 為 289,846 三角面。R3 新增骨臂、窗櫺、藤簾等，上限暫定 350k；超出時先降低細艙 `ni`（32 → 24）、欄杆柱改為每 0.15 m 一枝、天台葉團用 `sub=1`。記錄每個 role 的三角面。 |

### 建議次序

1. 先做第 0–2 項（鏡頭、燈光、顏色），只算一張圖確認後再改模型，因為很多「不像」其實來自燈光。
2. 然後做第 3–8 項（艙窗、支撐、艙的分佈），這些是目標圖的主角。
3. 最後做第 9–14 項（格架細節、頂層農場、天台、垂藤、室內、地面）。
4. 第 15 項每輪都記錄。最多三輪擷圖比對；證據放在 `~/city2127-evidence/pod-frame-tower/r3/`：`target3q`、舊 `target`、背面、艙近景、`r2-vs-r3.jpg`（同燈光）、`target-vs-r3.jpg`。

### 不做

- 不做周邊環境、道路、遠景建築、海景及選址（業主 2026-11-17）。
- 不改 `src/`、不接 Meter、不放入城市。
- 不改已 accepted 的共用 `modules.ROLES` 配方；本建築的特殊外觀用 `build_pod_tower.py` 的 `OVERRIDE`，或新增 `pft` 專用 role。

## R3

### R2 verdict

業主原話（2026-11-17）：「write r3 notes, add more detail」，其後「start r3 in a new session」。沒有其他意見，因此以上文 `## R3 notes` 的 16 項及建議次序為本輪 brief。

### 工作環境

- 於獨立 clone `/Users/fatboy/city2127-pod`、分支 `feat/pod-frame-tower` 進行；開始時 HEAD `9c79fbc`，與 `origin/feat/pod-frame-tower` 一致（`git fetch --prune origin` 成功）。主 checkout 未有改動。

### 改動

- `review_pod_tower.py`：新增透視鏡頭 `--view target3q`（35 mm、方位 47°、俯角 32°、1448 × 1086，+x 面在畫面左、正面 −z 在畫面右）及艙近景 `--view pod3q`；R3 燈光為暖陽（(1, .93, .82)、強度 5、方位 25°、仰角 45°）、天空漸變 .35、`Khronos PBR Neutral`、−0.5 EV。AgX 會把粉彩洗成灰色，所以改用 PBR Neutral。`--r2light` 可還原 R2 燈光；`--pct` 放大輸出；`@@PROBE@@` 輸出取色點的像素位置。
- `modules.py`（全部為新增參數或新 module，預設值保持 R2 行為）：`limb` 加 `flat`；`branch_strut` 加 `web`（分叉處蹼狀曲面）、`pads`（圓盤腳座）、`limb_r`、`flat`；`egg_pod` 加 `win`、`tilt`、`rim`、`mullions`、`port`、`side_port`、`back_wall`；`grid_frame` 加 `joint_w`、`alt`、`ties`、`nodes`；`roof_farm` 加 `leaf`、`hoop`、`tufts`、`canopy`、`spill`、`flowers`、`hoop_step`、`edges`。新 module：`ell`、`disc`、`bone_arm`、`vine_curtain`、`arch_shell`、`flower_bed`，均已登記於 `LIBRARY.md`。共用 `ROLES` 未改。
- `build_pod_tower.py`：建築專用 role `PFT_ROLES`（`concrete_b`、`concrete_t`、`leaf_c`、`vine`、`arch`、`flower_v`）；`OVERRIDE` 改混凝土為暖粉灰、`pod_y` 改為奶油色、地台及天花改為暖白發光；艙重新佈局（26 個）；5 條 `bone_arm`；4 棵格內白色支撐樹；圓形花盆平台；第 5 層外圈及第 6 層全層菜園；正面藤簾；地面層白色半蛋形拱殼、店面直櫺及花床；每部分三角面記錄（`parts`）。

### 逐項自評（`target3q`，取色為 1448 × 1086 下 5 × 5 中位數）

| # | 項目 | 結果 | 量度 |
| --- | --- | --- | --- |
| 0 | 鏡頭 | 達成 | 35 mm 透視；轉角 column 位於畫面橫向約 47 %；建築約佔畫面寬度 63 %、高度 84 %；天台可見。構圖仍比目標更俯視，天台佔畫面較多。 |
| 1 | 燈光及調色 | 達成 | 混凝土受光面 (204, 187, 179)、樑面 (209, 193, 185)，亮度約 192；目標實際取色為 (208–229, 184–207, 178–202)。R2 已以同一燈光重算（`r2-vs-r3.jpg`）。曝光為 −0.5 EV，而非 brief 建議的 0 EV，因 0 EV 時過亮。 |
| 2 | 艙殼顏色 | 部分達成 | 奶油色頂部 (232, 219, 192)，與目標 (245, 228, 205) 相差 9–13，在 ±15 之內；粉紅 (235, 189, 177)，與 (240, 200, 192) 相差 5–15。鼠尾草綠沒有可靠的取色點，目視可分辨。 |
| 3 | 主窗 | 達成 | 半角 37° × 32°、上仰 14°：窗寬約 0.60 L，窗高約 0.50 H，窗中心高於艙中心約 0.1 H；4–5 條 3 cm 白色弧形直櫺；窗框管半徑 0.06 m。 |
| 4 | 副窗 | 達成 | 長度 ≥ 5 m 的艙在 +x 端有圓窗（半徑 0.06 L，上限 0.17 H，畫在殼面上）；長度 ≥ 6 m 的 12 個艙在主窗旁另有一個小橢圓窗。 |
| 5 | 艙內 | 達成 | 所有艙有暖光背牆（貼合艙內襯）；≥ 6 m 的艙加地氈、第二盆植物、吊燈，≥ 8 m 加書架；`pod_in` 發光 .5 → 1.1，內襯行數減半。窗內可見淺木地台、梳化、植物及住客。 |
| 6 | 支撐的形狀 | 部分達成 | 26 / 26 個支撐有分叉蹼狀曲面、扁肢（flat .7）及圓盤腳座；新增 `bone_arm` 並用於 5 個艙（兩個大艙、粉紅懸挑艙及 +x 面兩個艙），每條 2–3 個孔。大艙主幹根部半徑 0.62 m（直徑 1.24 m，至分叉處約 0.87 m）。骨臂在遠景仍略似鏈節。 |
| 7 | 支撐的可見度 | 未達成 | `target3q` 中懸挑艙下大多只見 1 條白色主幹，分叉多被艙身擋住；格內白色支撐樹 4 棵。目標中支撐是立面上最搶眼的白色元素，R3 仍不及。 |
| 8 | 艙的分佈 | 達成 | 兩個大奶油艙分別在兩個立面的遠端懸挑，窗朝鏡頭；+x 面中下層有 2 個粉紅艙（一懸挑、一半入格）；正面遠端有直徑 3 m 白色花盆平台；正面格內 9 個艙為奶油 4、粉紅 3、鼠尾草綠 2。 |
| 9 | 格架細節 | 達成 | 接縫 `concrete_j` (.42, .40, .37)、寬 6 cm；周邊 column 及外樑面每塊模板 2 × 2 個 4 cm 對拉螺栓孔；周邊 column 每道樑處有凸出 3 cm 的節點帶；`concrete_b` 比 `concrete` 暗約 6 %，隨機分配給約一半構件。 |
| 10 | 頂層農場 | 達成 | 第 6 層取消玻璃房，全層 7 行菜畦、2 名農夫；第 5 層正面及 +x 面外圈一格寬菜畦，玻璃房內退一格，2 名農夫。從 `target3q` 只能透過格口看到，不及目標明顯。 |
| 11 | 天台 | 部分達成 | 作物以淺綠 `leaf_c` 為主，夾雜番茄及紫、白、粉花；拱架改為深綠 4 cm 金屬管、高 3 m，每拱 8 個葉團並以頂篷連接；邊緣植物向外垂出 0.6–1.2 m。整體葉團仍偏「圓球」，且天台在畫面中過於搶眼。 |
| 12 | 垂藤及花 | 達成 | 正面每層（第 2 層至天台）3 段 7 m 藤簾，每段跨兩格，由 2–3 片扁長葉帶組成，長 1.5–3.5 m，約 30 % 帶粉紅或白花；遇艙時自動縮短。其他立面每 5 格 3 格有短藤。 |
| 13 | 室內暖光 | 部分達成 | 地台 (.86, .70, .50)、天花 (.95, .86, .72) 均為暖色發光；地面層店面每 1.5 m 一條直櫺，正面及 +x 面加暖光後牆。地面層在 `target3q` 中仍被 slab 及拱殼遮擋，未見得比樓上明亮；未量度玻璃房平均亮度。 |
| 14 | 地面層拱門 | 達成 | 3 個白色半蛋形拱殼（跨度 5.5 m、高 4 m、伸出 2 m、殼厚 0.4 m、內側暖光）：正面 2 個、+x 面 1 個；基座四周有圓滑花床（白、粉、紫花），9 棵小樹，全部在 plinth 1.5 m 範圍內。 |
| 15 | 預算 | 達成 | 349,808 三角面（上限 350k），GLB 10.9 MB。各部分：frame 10,984；rooms 及菜園 48,844；facade 95,086；ground 19,240；roof 34,676；pods 95,406；struts 34,004；bones 9,488；其他 2,080。主要 role：white 89,272、green 68,680、vine 24,444、leaf_c 15,860。為控制預算：小艙 `ni=24`、大艙 40；欄杆柱每 0.15 m 一枝且改為單面條；小艙不加小分叉；第 5、6 層菜園密度 1.25。 |

### 驗證

- `@@BUILD@@ tris 349808, glb 10,869,836 bytes, 26 pods`。
- `blender-asset-qa` `qa_check.py`（concrete、concrete_b、concrete_j、white、pod_y、pod_p、vine、rail）：沒有 UV（與 R2 相同，材質不用貼圖）；兩種混凝土之間的共面重疊由 182 對減至 68 對，餘下的位於 column 內部或節點帶之內，外面看不見；`pft_white` 262 對來自窗口內側雙面 reveal（R2 已有）；floating 為刻意分開的葉帶、花點及接縫條；最低點 −0.015 m（花床）。
- `node --experimental-strip-types tests/assetLibrary.test.ts` 通過（23 props、20 modules、26 folders）；`git diff --check` 乾淨。沒有改動 `src/`，因此未執行 `npm test` / `npm run build`。
- 證據：`~/city2127-evidence/pod-frame-tower/r3/`：`model-target3q.png`、`model-target.png`（舊鏡頭）、`model-back.png`、`model-pod3q.png`（均為 2 倍解像度 EEVEE）、`r2-vs-r3.jpg` 及 `r2-vs-r3-pod.jpg`（R2 `c713fc9` 以 R3 燈光重算）、`target-vs-r3.jpg`、`target.webp`；`passes/` 為燈光測試及三輪比對圖。模型未放入城市，沒有瀏覽器擷圖，FPS 未量度。
- 共做 3 輪擷圖比對，另有 10 張燈光測試圖。

### 尚待處理（供 R4 參考）

- 支撐的可見度（第 7 項）仍是最大差距：目標中白色骨形支撐在艙側及立面前方大面積可見；R4 可把分叉移到艙的鏡頭側，加粗肢體，並在艙前加露出的骨板。
- 天台在 `target3q` 中佔畫面太多：目標鏡頭的俯角可能較小（約 25°），而且頂兩層菜園從側面可見。可考慮把俯角調至 25–28°。
- 葉團仍為低細分圓球，與目標的細碎葉面相差較遠；如預算放寬，可改用葉片卡（quad cards）。
- 背面受陰影，`model-back.png` 偏暗，只供檢查幾何。

## R4

### R3 verdict

業主原話（2026-11-18）：「未達標加多一點，植物橢圓形，唔似。」

理解：前半句指 R3 未達成及部分達成的各項要明顯加強（第 7 項支撐可見度、骨臂遠看似鏈、天台佔畫面太多、地面層不比樓上亮、鼠尾草綠沒有取色）；後半句指所有植物（花槽葉團、天台葉團、樹及草叢）都是光滑橢圓球，與目標不像。另一種理解是「加多一點」指加多植物數量；本輪以前者為準，植物則改形而非單純加量。

### R4 brief（`target3q`，1448 × 1086；證據為 2 倍解像度）

| # | 項目 | 量度目標 |
| --- | --- | --- |
| 1 | 植物形態 | 所有葉團改為葉片卡（每片 2 個三角面）組成的不規則小簇，輪廓要破碎、下垂；樹要見到樹幹及分枝；不再出現光滑橢圓球 |
| 2 | 支撐可見度 | 每個艙的分叉點移到艙身鏡頭側之外（不被艙身遮住），`target3q` 中每個懸挑艙最少見到 3 枝白色分叉及蹼狀曲面 |
| 3 | 骨臂 | 遠看是一塊完整骨板，不再似鏈節 |
| 4 | 鏡頭 | `target3q` 俯角 32° → 25°，天台佔畫面減少；舊鏡頭保留為 `target3q32` 作逐輪比較 |
| 5 | 地面層 | 地面層店面平均亮度高於樓上玻璃房 |
| 6 | 鼠尾草綠 | 新增取色點，受光面距目標 (205, 222, 190) ±15 |
| 7 | 預算 | ≤ 350k 三角面 |

### 改動

- `modules.py`：新 module `leaf_card`（摺疊菱形葉片）、`leaf_clump`（1–3 個不規則小簇、細小深色核心、外伸葉片令輪廓破碎、下半部葉片下垂；`up=True` 為向上的菜苗）、`leafy_tree`（樹幹、3–4 枝分枝、葉簇樹冠）、`leaf_strand`（幼莖加左右交錯下垂葉片的垂藤）。`roof_farm`、`vine_curtain`、`flower_bed` 新增 `cards` 選項，改用以上葉片 module，果實及花點改為 24 面小橢球；`branch_strut` 新增 `fork`（指定分叉點）及 `web_k`（蹼狀曲面比例）；`bone_arm` 新增 `solid`（一塊放樣而成的狗骨形平板，孔改為兩面的深色橢圓凹位）。全部預設值保持 R3 行為，已登記於 `LIBRARY.md`。共用 `ROLES` 未改。
- `build_pod_tower.py`：每格花槽 3 個葉簇加 2 條垂藤；露台葉簇、藤簾、室內盆栽樹（改用 `leafy_tree` 加白色花盆）、圓形花盆平台、天台及第 5、6 層菜園、基座花床全部改用葉片；葉片 role（`green`、`leaf_l`、`leaf_c`、`vine`）材質為雙面。支撐：分叉點放在艙底鏡頭側、艙身橢球外 1.7 倍處，3–5 枝扁肢（`limb_r` .85）由下而上抓住艙的鏡頭側側面及艙底；主幹半徑：大艙 .7 m、中艙 .55 m、小艙 .42 m。5 條骨臂改為 `solid`，寬 1.0–1.3 m、厚 .36 m。新建築專用 role `shop`（暖色發光 4.0）用於地面層店面後牆及新增的發光天花。天台作物 3 → 2.4、樓層菜園 2.2 → 1.8（預算）。
- `review_pod_tower.py`：`target3q` 俯角 25°、距離 76 m、目標點高 15 m；`target3q32` 保留 R3 鏡頭；新增取色點 `pod_sage`、`pod_sage_front`、`shop`。

### 逐項自評

| # | 項目 | 結果 | 量度 |
| --- | --- | --- | --- |
| 1 | 植物形態 | 達成（待業主判定） | 葉簇、垂藤、樹及菜苗全部由葉片卡組成，輪廓破碎並下垂；樹可見樹幹及分枝。部分葉簇的深色核心在近景仍隱約可見；天台拱架的葉片較疏，似一串串小枝。 |
| 2 | 支撐可見度 | 部分達成 | `target3q` 中 26 個艙的分叉全部在艙身前方可見，每個見到 3–5 枝白色扁肢及蹼狀曲面（R3 大多只見 1 條主幹）。但分叉處的圓球節點仍大，由 column 橫伸出的主幹似水管，未及目標的骨形樹狀。 |
| 3 | 骨臂 | 達成 | 放樣平板，中段收窄至 0.75 w，兩面有深色橢圓凹位；遠看為一塊骨板，不再見鏈節。 |
| 4 | 鏡頭 | 部分達成 | 俯角改為 25°，距離 84 → 76 m（建築佔畫面比例未量度）。目測天台仍佔建築畫面約上方四分之一，與目標相比仍偏多。 |
| 5 | 地面層 | 部分達成 | 正面圖（`model-front.png`）暖色像素平均亮度：地面層 211，第 1–3 層 183–188。`target3q` 中地面層大部分被花床、拱殼及艙遮住，仍不見得明顯較亮。 |
| 6 | 鼠尾草綠 | 達成 | `pod_sage` (212, 230, 195)、`pod_sage_front` (216, 233, 192)，與目標 (205, 222, 190) 相差 2–11。奶油色 (225, 212, 187)、粉紅 (235, 189, 177)、混凝土 (204, 188, 179)，與 R3 相若。 |
| 7 | 預算 | 達成 | 347,136 三角面，GLB 13.2 MB（R3 10.9 MB；葉片頂點不共用，所以檔案較大）。各部分：frame 10,984；rooms 48,672；facade 約 79k；ground 18,402；roof 53,618；pods 95,966；struts 34,004；bones 5,552；other 2,390。 |

### 驗證

- `@@BUILD@@ tris 347136, glb 13,210,248 bytes, 26 pods`。
- `blender-asset-qa` `qa_check.py`（white、green、leaf_l、vine、concrete_t、shop）：沒有 UV（與前輪相同）；沒有法線反轉報告；`pft_white` 共面重疊 253 對（R3 為 262，來自窗口內側 reveal）；`pft_green` 21 對、`pft_leaf_l` 11 對為葉片卡偶然重疊；floating 為刻意分開的葉片、核心、花點及螺栓孔。
- `node --experimental-strip-types tests/assetLibrary.test.ts` 通過（23 props、24 modules、26 folders）；`git diff --check` 乾淨。沒有改動 `src/`，因此未執行 `npm test` / `npm run build`。
- 證據：`~/city2127-evidence/pod-frame-tower/r4/`：`model-target3q.png`（25°）、`model-target3q32.png`（R3 鏡頭）、`model-pod3q.png`、`model-back.png`、`model-front.png`（均為 2 倍解像度 EEVEE）、`r3-vs-r4.jpg`（同一 32° 鏡頭）、`r3-vs-r4-pod.jpg`、`target-vs-r4.jpg`（目標圖對照）、`target.webp`；`passes/` 為三輪比對圖。模型未放入城市，沒有瀏覽器擷圖，FPS 未量度。
- 共做 3 輪擷圖比對。

### 尚待處理（供 R5 參考）

- 支撐：縮小分叉圓球節點，把由 column 橫伸的主幹改為由樑頂或下一層 slab 向上彎的骨形主幹，令整體更似白色樹。
- 天台拱架葉片可再加密，令拱架像目標中被藤覆蓋的綠色隧道。
- 地面層在 `target3q` 中仍被遮擋；可考慮減少地面層前方的花床樹或把店面玻璃向外移。
- 天台佔畫面仍多；可再把俯角降至約 20°，或請業主確認目標鏡頭。

### 合併

- 業主原話（2026-11-18）：「OK merge main and push」。
- 於獨立 clone `/Users/fatboy/city2127-pod`：`git fetch --prune origin` 成功，`main` 快進至 `origin/main` `f40ffbc`，再 `git merge --no-ff feat/pod-frame-tower` 得 `d0701e3`，沒有衝突。主 checkout 未有改動。
- 合併結果的檢查：`npm ci`、`npm ci --prefix survey`、`npm test`、`npm run build` 全部通過（exit 0）；`git diff --check origin/main..HEAD` 乾淨。`survey/`、`module-swap/` 沒有改動，因此沒有執行該兩個 package 的檢查。
- polish-ladder **Record** 及 change sheet：本建築未選址，亦未接入任何 change unit，因此不適用。

## 放置（2026-11-19，`feat/question-rotation`）

- 選址：hero 區內 58 × 46 m（含蛋艙包絡及前場）只有東南角一處 CLEAR，hero 看不見。業主問「應否先處理舊建築，清出空間或重排？」；查住宅 M／P／U 後，撤走住宅 U，舊址 `POD_TOWER` (−258, −75) 只剩一條步行路在西南艙尖旁，hero 約 10,000 px。業主原話：「好，拆住宅 U」。
- 做法：`main.ts` 隱藏 `housing-background` 的 `housing-mobile`，以 `addCityModel` 載入 GLB（yaw 0，正面朝北），不透明網格合批，載入完成後才命名 `pod-frame-tower-2127`。所有 run 中為固定背景；抽題輪換 run 由 Q06 控制（B 顯示，A／C 淡出留草地）。
- 業主判定（2026-11-19）：位置、朝向及東北近鏡「接受」。近鏡 `q06:tower` (−208, 50, −158) → (−258, 16, −75)。未加前場道路或接駁。
- 證據：`~/city2127-evidence/question-rotation/q06-pod/lots/`（選址）、`r1/`（近鏡日／夜、hero、俯視；3200 × 1800 page error 0）。FPS 未量度（同時跑其他工作的截圖機報 hero 約 28 fps，不作基準）。

## Next expected step

已放置並接入 Q06-B。業主如要前場道路、改材質或其他修改，按上文「尚待處理」另開一輪。
