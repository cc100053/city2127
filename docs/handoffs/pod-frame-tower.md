# pod-frame-tower — 混凝土格架蛋艙塔（僅模型）

- Owner: cc100053
- Status: IN_PROGRESS（R2 已建，待業主判定）
- Branch: `feat/pod-frame-tower`（由 `origin/main` `5d66cfa8` 開出；R1 於 R2 session 開始時 commit）
- Base commit: `13f83e1566988a10e8798ec027c97ba10012654e`（R1 工作時的 HEAD，`codex/nw-focal-connections`）
- Last verified commit: `c713fc9`（R2；R1 為 `9ed3e7f6`）
- Remote availability: `origin/feat/pod-frame-tower`（R2 已 push）

## Session Git state

- Session starting branch and HEAD: `codex/nw-focal-connections` @ `c0034611`，其後另一 session 推進至 `13f83e15`。
- Last fetched origin/main commit: `5d66cfa84ec5df682ff0d922b8e25d6267a29011`（2026-11-17 fetch 成功）
- Local changes present at session start: 未追蹤 `Dev_QA.md`；另一 session 曾於同一 checkout 編輯 `src/`、docs（已由其 commit）。
- Upstream integration status: NOT INTEGRATED
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

## Next expected step

業主判定 R2。若有意見，新開 session 做 R3：preflight 後在 `feat/pod-frame-tower` 上工作（主 checkout 若仍被其他分支佔用，可沿用獨立 clone `/Users/fatboy/city2127-pod`），把業主原話寫入 `## R2 verdict`，並與上文 `## R3 notes` 一併轉為最終的 R3 brief（業主意見優先）。業主接受後才合併 main。
