# pod-frame-tower — 混凝土格架蛋艙塔（僅模型）

- Owner: cc100053
- Status: IN_PROGRESS（R2 已建，待業主判定）
- Branch: `feat/pod-frame-tower`（由 `origin/main` `5d66cfa8` 開出；R1 於 R2 session 開始時 commit）
- Base commit: `13f83e1566988a10e8798ec027c97ba10012654e`（R1 工作時的 HEAD，`codex/nw-focal-connections`）
- Last verified commit: 見 `## R2` 的 R2 commit（R1：`9ed3e7f6`）
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

## Next expected step

業主判定 R2。若有意見，新開 session 做 R3：preflight 後在 `feat/pod-frame-tower` 上工作（主 checkout 若仍被其他分支佔用，可沿用獨立 clone `/Users/fatboy/city2127-pod`），把業主原話寫入 `## R2 verdict`，並轉為 `## R3 brief`。業主接受後才合併 main。
