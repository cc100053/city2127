# nw-closeup-polish — NW 自動化旗艦＋district 載體，新 taste 重建

- Owner: cc100053（唯一驗收人）
- Status: BLOCKED — R4 旗艦 15/28，等 owner 揀 lot blocker 選項
- Branch: `feat/nw-closeup-polish`
- Base commit: `34f1fd35e7761e164e5dc51648709cefbbc0c145`（main = origin/main）
- Last verified commit: R3 commit（test／build／diff-check PASS）
- Remote availability: `origin/feat/nw-closeup-polish`

## Session Git state

- Session starting branch and HEAD: `main` `34f1fd3`
- Last fetched origin/main commit: `34f1fd3`（2026-11-03，0/0）
- Local changes present at session start: 未追蹤 `.playwright-cli/`、`artifacts/city-change-review/` 等舊截圖（唔郁）
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal

Owner 2026-11-03：「用新 taste 重建 NW 旗艦同佢嘅 district 載體」。用 [closeup-polish skill](../../.claude/skills/closeup-polish/SKILL.md)（SE 樣板流程）＋ [CITY MASTER TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)。對象：

- 旗艦 AUTO HUB：`src/siteBuilders/automationHub.ts`（`changeSites.nw`，中心 (40, −300)，scale 3）。
- District 載體：`AutomationDistrict`（`src/districtMeters.ts`）嘅 bay 設計——staffed 圓頂廳／雙層台、autonomous 無人機港／充電桅。

選項（Q1 `service-2127`）：−1 人に相談したい／0 普段は自動、困ったら人へ／+1 いつでも自動で。

## 診斷（baseline `~/city2127-evidence/nw-closeup-polish/baseline/sheet.jpg`）

| # | 問題 | 原因 |
| --- | --- | --- |
| D1 | 旗艦係細細藍綠色玻璃盒，舊 taste，同新白色巨構城市唔夾 | `teal`＋`glass` 格窗 box；冇機器 signature |
| D2 | −1 同 0 幾乎一樣 | 分別只係 6 個約 1 m 高 counter（site scale 3 下都細） |
| D3 | +1 只係加一支玻璃圓筒，似普通辦公樓 | `hubUpper` GLB 玻璃筒＋trim 環 |
| D4 | `nw:focal` 高角度由約 210 m 外望落，旗艦佔畫面約 8% 闊，背景係城市 | `SHOTS['nw:focal']` y=130 |
| D5 | Bay：staffed 雙層台讀成白色空架；autonomous 係深藍桅（`solar`），唔係新 taste 白金屬＋光縫 | `AutomationDistrict` constructor |
| D6 | `nw:bay10` 鏡頭被 hull 樹同柱擋 | 舊 pose 早過 P1 巨構 |

## 候選鏡頭

- 旗艦 `nw:e`：`[192,44,-338]` → `[40,54,-300]`（東面低角，背景海＋天；+1 全高入鏡）。棄用：西南 `[-70,45,-180]`（前景 Sky Ring 腳）、北 `[40,45,-450]`（背景巨構搶眼）、拉遠 `[225,58,-350]`（Sky Ring 腳入鏡）。
- Bay 10 `nw:bay-e`：`[-10,40,-90]` → `[75,32,-160]`（ring 環框住 bay）。

## Plan（2026-11-03 開工時）

1. Gemini 目標圖（6 張：旗艦 −1/0/+1、bay −1/0/+1），prompt 見 [prompts.md](../../artifacts/nw-closeup-polish/prompts.md)；candidate 放 evidence `gen/`。
2. Owner 揀 → `artifacts/nw-closeup-polish/target/` → spec.md → Sonnet rounds。

## 目標圖（owner 2026-11-03）

- 旗艦：揀咗 Gemini 第一輪上排 → `artifacts/nw-closeup-polish/target/flagship-{low,mixed,high}.jpg`。
- Bay：第一輪唔採用；第二輪跟旗艦語言（上傳旗艦目標做參考）→ `target/bay-{low,mixed,high}.jpg`。
- Spec：[spec.md](../../artifacts/nw-closeup-polish/spec.md)（R1 旗艦、R2 bay）。

## R1（e334311）旗艦

- `automationHub.ts` 重寫：−1 開放服務廳＋懸浮遮篷碟（藍邊、4 個發光器、bob ±.08）；0 細廳＋72 m 泊位柱（3 環）＋屋頂機械臂；+1 108 m 自律環塔（14 環 instanced、7 支服務臂、15 架無人機流、磁浮艙口、自助終端）。環由下而上逐層疊、拆時由上而下；換狀態時人先收埋。
- 新 emissive `automationBlue`（`METER_COLORS.automation`）；`hubUpper` 改 procedural（GLB 檔同 catalog 保留）。`nw:focal` → `[212,64,-342]`→`[40,62,-300]`（東面，背景海＋天；`p.y > target.y` test 要求鏡頭高過目標）。
- Site visible meshes low/mixed/high 20/24/21（之前 28/28/33）。
- [R1 對目標](../../artifacts/nw-closeup-polish/r1/vs-target.jpg)。Opus：外形對到目標，+1 最似；−1 只佔畫面約 13%。

## R1b＋R2（本 commit）

- 新 `nw:focal-low` `[88,16,-322]`→`[38,13,-300]`（約 55 m）；−1 廳＋遮篷佔畫面約 36%。[R1b 對目標](../../artifacts/nw-closeup-polish/r1b/vs-target.jpg)。
- `serviceDrones` 機身改白（全城服務無人機一齊變）。Legacy v1 `automation-tall` 顯示高塔。
- R2 `AutomationDistrict`：staffed = 地面 22×9×15 m 玻璃服務亭＋懸浮遮篷碟（圓／長兩款）；hybrid = 60% 亭＋40 m 三環柱（新 instanced `automation-hybrid-columns`）；autonomous = 45 m 白色環塔（8 環）／34 m 塔＋懸浮降落碟，塔腳藍光取件櫃。舊 `solar` 深藍桅、圓頂、glass 人取消；`PORT_DECK` 刪除（冇人 import）。西面 plaza bay (−200,80)→(−196,85) 避 guideway。Instanced children 23→22。
- `warm` 搬去 `cityRig.ts`；`automationBlue` 由 `districtMeters.ts` export。
- [R2 對目標](../../artifacts/nw-closeup-polish/r2/vs-target.jpg)。Opus：外形同語言對到目標；bay 係真實米數，喺 review pose（約 110 m）細過目標圖（約 15% vs 35%），district 鏡頭下人同機械臂好細。
- Test 改動：`automationHub.test.ts` 重寫（保留 plinth、retarget、snapshot、人有承托／唔穿模；新增環序、mesh budget、reduced motion）；`headlineCamera.test.ts`（NW 有 focal-low，NE／SW 冇；79 shots）；`changeCatalog`／`cityChangeManager`（hubUpper procedural）；`districtMeters.test.ts`（hybrid column）；`odaiba.test.ts`（pier → 24×18 m footprint 落喺空地）。冇刪除 route-blocking test。

## Actual validation results

- Verification status: PARTIAL
- 2026-11-03 Opus 重跑（R1b＋R2 工作樹）：`npm test` exit 0（fail 0）、`npm run build` ✓、`git diff --check` clean。survey／module-swap 冇改。
- 截圖：headless Chrome via `playwright-cli`，1600×900，12:00／22:00；原始證據 `~/city2127-evidence/nw-closeup-polish/r1|r1b|r2/`。
- 未做：FPS、owner 驗收、bay 喺 district headline 鏡頭下嘅可讀性、夜景室內暖光偏弱。

## R3（owner：「放大到目標圖咁大」）

- `BAY_SCALE = 2`（instance matrix 放大，幾何仍係 R2 米數；人保持 1×）。`nw:bay-e` 下服務廳佔畫面約 32%（目標約 35%）。
- 位置（world x,z）：bay1 (−340.5,−31.6)→(−321,−39)；bay2 (−383.8,−4) 不變但 1.6×（2× 搵唔到空位，下限 1.5×）；bay3 (−196,85)→(−184,92)；bay4 (−130,170) 不變；bay5 (75,−160)→(75,−166)；bay6 (−438,45)→(−440.5,41.9)。
- **舊 bug 修正**：P1／polish2 剔走巨構範圍同 hero apron 嘅 bay 之後，只剩 6 個 bay，但 `SHOTS`／`VIEWPOINT_COVERAGE` 仲用舊 11 個 bay 編號，所以 `nw:bay1` 等鏡頭對住空地。而家 NW bay shot 跟現存 bay index 重排（74 shots，59 個 district viewpoint）；bay1／bay2 兩個鏡頭都影到兩個 bay（已截圖確認），保留配對。`headlineCamera.test.ts` 改為由 `AutomationDistrict.bays.length` 計 bay 數，唔再寫死 11。
- Test：`odaiba.test.ts` 淨空抽樣擴大到 2× footprint（plinth 四角要落空地）；`districtMeters.test.ts` 按每個 bay 嘅 scale 驗，新增 scale 1.5–2× 範圍。
- [R3 對目標](../../artifacts/nw-closeup-polish/r3/vs-target.jpg)。Opus：大細同目標一致；hero 入面 bay 喺兩邊，冇搶中間。弱點：`nw:bay-e` 下 +1 塔頂出鏡（約 100 m）；bay3 鏡頭被酒店階梯樓擋；2× 廳入面啲人顯得好細；bay2 細過其他。
- 驗證（Opus 2026-11-03）：`npm test` exit 0、`npm run build` ✓、`git diff --check` clean。

## FPS（2026-11-03，headless Chrome via playwright-cli，1920×1080，Vite DEV，`data-fps` 每 2.6 s，第一個 sample 唔計）

- 本分支（727cedd）：hero nw:high 12:00 47.1–48.1；22:00 46.4–47.3；`nw:focal` high 50.2–54.0；`nw:focal-low` low 60.0 ×4；`nw:bay1` high 22:00 60.0 ×4。
- 同機同條件、main 34f1fd3（臨時 worktree，port 5185）同本分支交替量 hero nw:high 兩輪：main 37.2–40.2，本分支 35.0–39.8 → **冇退步**；部機當時有負載（其他 session），所以 60 FPS 未能喺呢部機證實。展覽機未量。

## Judge 1（2026-11-03，新 closeup-polish 規則重判 R3 HEAD 727cedd）

- Owner：「上個 session 點解覺得收得貨」→ skill 加 rubric／盲評／0-1-2 門檻（f10d6aa）→ 用佢重判。
- [rubric.md](../../artifacts/nw-closeup-polish/rubric.md)：24 項（旗艦 5/4/5、bay 4/3/3），crop 對住目標圖嘅生成鏡頭 `nw:e`／`nw:bay-e`。截圖 3200×1800 12:00，證據 `~/city2127-evidence/nw-closeup-polish/judge1/`。
- 盲評（新 subagent，只有 rubric＋crop）：**22 / 48**，只有 `fh-base` 2 分；`bl-material`、`bh-drones`、`bh-base` 0 分。[scores](../../artifacts/nw-closeup-polish/judge1/scores.md)、[旗艦 board](../../artifacts/nw-closeup-polish/judge1/review-flagship.jpg)、[bay board](../../artifacts/nw-closeup-polish/judge1/review-bay.jpg)。
- 主要差距：bay 仍係米黃＋青色光條、玻璃唔向鏡頭、冇人；旗艦喺 `nw:e` 只有目標約 1/3 大（Gemini 放大咗），人細到讀唔到；機械臂冇關節冇包裹；柱同塔身冇板縫；+1 環距約 2× 環厚。
- Rubric 缺陷：`fl-canopy`、`fm-rings` 嘅 crop 跟目標位置，現況主體細啲所以出咗 crop（judge 照睇全圖畀 1）；下一版要先決定旗艦大細跟目標定跟真實米數（owner 決定），再調 crop。
- 未做：owner 校準（skill step 7 第一輪），夜景。

## R4（owner：旗艦「放大到目標」）

- [Spec R4](../../artifacts/nw-closeup-polish/spec.md#r4--flagship-at-target-size-rubric-items-owner-2026-11-03-放大到目標)。Sonnet 實作：−1 成組 ×2（人 2.6×）＋廳拉長，0 廳 ×1.2、柱 r 1.6 去到 y 37，+1 環 ×1.2、18 環；新 `white` 材質代替 hub 嘅 `trim`；`nw:focal-low` → `[140,28,-332]`→`[40,26,-300]`（舊 pose 喺 ×2 廳入面）。
- 畫面大細已經對到目標（−1 廳面 x .35–.73 vs .37–.77）。[R4 對目標](../../artifacts/nw-closeup-polish/r4/vs-target.jpg)。
- 盲評旗艦 **15 / 28**（judge 1 都係 15）：`fm-column`、`fh-arms` 升到 2，`fh-base` 跌到 1；其餘 1。[scores](../../artifacts/nw-closeup-polish/r4/scores.md)。最低：廳內係平面橙牆冇深度、冇職員、藍 seam 太粗、無人機讀唔到、磁浮艙冇軌、cap 天線喺 crop 外。
- **Blocker（等 owner）**：×2 低 plinth（≈92×53 m）跨咗北面共享 court (50,−340) 同 tidal edge；`changeSites.nw` 擴闊會令 `districtMeters`／`megastructures`／`odaiba` 三個 test fail（coastalCanopy 連鎖令 (−20,210) court 入樹）。而家 lot 保持 8×7，plinth 嘅越界冇 test 覆蓋（`ponytail:` 註）。選項：1）搬 court＋修 canopy 連鎖再擴 lot；2）保持 ×2 取消拉長（仍要修連鎖）；3）全 site 南移（同目標構圖相反）。
- Opus 重跑：`npm test` exit 0、`npm run build` ✓、`git diff --check` clean。

## Next step

Owner 揀 blocker 選項；之後 R5 針對廳內深度／職員、細 seam、無人機、磁浮軌。Bay（judge 1 7/20）未開工。
