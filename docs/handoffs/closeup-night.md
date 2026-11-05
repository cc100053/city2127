# closeup-night — 夜間重做 SW、NE、SE 旗艦 headline 近鏡

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — Phase B：SW park（20/30），SE park（20/38，R6）
- Branch: `feat/closeup-night`（site branch `feat/closeup-night-<site>`）
- Base commit: `5a56230`（origin/main）＋ merge `chore/long-polish-loop-v2` `6e60d04` → `dd1f5a9`
- Last verified commit: NONE
- Remote availability: `origin/feat/closeup-night`

## Session Git state

- Session starting branch and HEAD: owner checkout `feat/road-audit-fixes` `866cdbe`（冇郁）；night folder `../city2127-closeup-night` 由 `origin/main` 開
- Last fetched origin/main commit: `5a56230`（2026-11-04）
- Local changes present at session start: owner checkout 有未追蹤截圖（唔郁）
- Upstream integration status: NOT INTEGRATED（owner 朝早決定 merge main）
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 2026-11-04：用 [long-polish-loop](../../.agents/skills/long-polish-loop/SKILL.md)（每個 site 跟 [closeup-polish](../../.agents/skills/closeup-polish/SKILL.md)）用新 taste 重做 SW、NE、SE 旗艦 focal 近鏡（SE 連 focal-low），每個 −1/0/+1。NW 已收貨，只做回歸檢查。

- 收貨水平：`~/city2127-evidence/nw-closeup-polish/bay-r2/review-bay-r2.jpg`（NW bay R2，19/20）。
- Pass：總分 ≥ 90%、冇 0 分、2 分項目 pairwise 冇輸、gate 綠；第一輪 cap 4 round，未過就 park。**Owner 2026-11-05 03:20 改 cap 做 6 round（成個 task）**：SE 跑到 R6；SW 加 R5–R6。
- Site 次序：SW → NE → SE。Deadline 2026-11-05 10:00 JST；09:00 停開新 round。
- 冇嘢入 `main`；owner 朝早睇 board 決定。

## Site queue

| Site | Pose | Targets | Size decision | Rounds | Score | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SW | `sw:n` `[-95,30,-15]`→`[-105,10,60]` | [target](../../artifacts/closeup-night/sw/target/) | 放大到目標（填滿 lot，唔越橙邊；碟可以向上） | R1–R8（R6 drop） | 23/30 R8 | PARKED `feat/closeup-night-sw` `992f339`（R4 曾 merge `55a5d2b`；R5–R8 未 merge 入 integration） |
| NE | `ne:s2` | — | — | — | — | SKIPPED（owner 2026-11-04：Q3 改能源題後 NE 公園恆定 0，客人去唔到 ±1） |
| SE | L `[130,28,-95]`→`[182,24,-38]`（−1、0）；H `[360,45,-50]`→`[182,58,-38]`（0、+1） | [target](../../artifacts/closeup-night/se/target/)（`tower-mixed` = 0 喺 H） | 放大到目標（lot 內） | R1–R6（R2 drop） | 20/38（53 %）R6 | PARKED（merged `757dac2`，dispatcher 驗證綠） |

## Completed work

- Phase A step 1：night folder、integration branch、keep-awake。

## Actual validation results

- Verification status: NOT RUN

## Known issues and blockers

- NONE

## Important decisions

- SW（owner 2026-11-04）：三張 Gemini 目標全部接受；0 同 +1 嘅懸浮碟喺目標圖飄出／大過 lot，rubric 寫成碟喺 lot 範圍內。
- SE（owner 2026-11-04）：main 嘅 `se:focal` 已被巨構拱＋白框塔遮死；−1／0 用 L（取代 `se:focal-low`），0／+1 用 H。L 方向向上搖做唔到（42° fov 要 ≈165 m 視線，L 只有 80–120 m 通），owner 接受 H，鄰居同前景魚傘當背景。
- SE（owner 2026-11-04）：四張 Gemini 目標全部接受。
- Evidence folder：`~/city2127-evidence/closeup-night/<site>/`。

## SW R1

- 分數 18/30（60 %）；pairwise 對 baseline 15 勝 0 負 → keep（commit `40ca5b1`）。
- 改咗乜：`commonsPlaza.ts` 由白色涼亭重寫成三個 band stage（−1 六個懸浮私人艙花園；0 半艙半開放下沉圓圈＋懸浮碟；+1 開放階梯劇場＋大懸浮碟），新材料 `sharePink`，`sw:focal` 改做 `sw:n` 鏡位；seat 計數 diagnostics 保留（`ponytail:` 註明）。地台 13.2×11.2，喺橙邊內圈 0.8 margin 之內（同 NW 測試做法）。
- 2 分：fm-deck、fh-amph、fh-people、fh-planting。0 分：fl-emitters（艙底冇發光環、冇空隙）。
- 主要問題：坐低嘅人企咗喺座位上面；艙內唔暖；屏風黐住艙；花園係一張波波草氈；0 嘅碟飄出水面；+1 碟底冇機械；後面兩間亭冇玻璃。
- Evidence：`~/city2127-evidence/closeup-night/sw/r1/`（`pair.md`、`review.jpg`）。

## SW R2

- 分數 19/30；pairwise 對 R1 9 勝 2 負（fl-screens、fm-ring 輸）→ keep（commit `c7aedd5`）。
- 改咗乜：艙暖光內部、粉紅座位、地面發光環、獨立屏風、S 形小路、0 嘅碟拉返入 lot 罩住圓圈、+1 碟橢圓放大加機械、後亭加玻璃頂。
- 2 分：fm-deck、fh-amph、fh-people、fh-planting（全部 pairwise `=`）。冇 0 分。
- 仍然弱：人坐唔落（艙入面人企喺座位後面、圓圈嘅人企住）；艙企喺深色柱上，唔似懸浮；屏風似清玻璃；花園似草地＋石板；+1 碟肋位唔夠；後亭唔似玻璃房。

## SW R3

- 分數 18/30；pairwise 對 R2 4 勝 3 負（輸 fl-emitters、fl-garden、fh-amph）→ keep（commit 見 branch）。
- 改咗乜：艙去咗深色柱真係懸浮、坐姿證實正常（由鏡位睇大腿好短）、白膜屏風、密植花園、0 碟下面環、+1 碟粉紅肋同機械、後亭玻璃。
- 2 分：fm-deck、fh-tables、fh-planting。fh-amph 由 2 跌 1（judge 話似直排看台）。
- 仍然弱：艙內人似深色樽；艙互相重疊；發光環偏白綠；+1 前面一大片空白廣場，階梯擠喺後半。

## SW R4（最後一輪，park）

- 分數 20/30（67 %）；pairwise 對 R3 8 勝 2 負（輸 fm-canopy、fh-disc）→ keep，commit `22109e3`。未過 90 % 門檻，round cap 4 用晒 → **park 喺 R4**。
- 改咗乜：+1 階梯劇場改做由前右角展開嘅扇形（6 級弧形看台＋長凳），艙散開唔重疊、艙內人轉 3/4 向鏡見到膝頭、發光環改冷藍 `#9fe8ff`、0 碟升到 y 3.6 環移去鏡頭面。
- 2 分（5）：fl-pods、fl-screens、fm-deck、fh-amph、fh-planting。冇 0 分。
- 1 分（10）：fl-people-in、fl-emitters、fl-garden、fm-pods、fm-ring、fm-divider、fm-canopy、fh-disc、fh-people、fh-tables。
- 低過 2 嘅原因（直講）：人仔似硬膠公仔，坐低都似企（fl-people-in、fm-ring、fh-people）；發光環似平面圓碟唔似發光（fl-emitters）；花園冇目標咁茂密、樹少；0 嘅 halo 大圓碟睇落飄出水面（fm-canopy）；+1 碟邊粉紅分段、穩定環似半透明板；後亭似暗帳篷、清楚見到嘅檯得 2 張。
- Gates：`npm test`／`npm run build`／`git diff --check` 綠；`sw:focal`（= `sw:n`）low／high 主體冇遮擋；舊英文招牌已拆，無新 UI 字；綠化保持茂密；懸浮艙／碟有發射器，唔係浮島。
- FPS（headed `fps.sh`，hero 1920×1080 DPR 1，branch `22109e3`）：`sw:high` 日 60.0 60.0 57.5 60.1 59.9 60.0／夜 60.0×6；`sw:low` 日 60.0 59.9 59.8 60.0 60.0 60.0／夜 60.0×6（第一個 sample 唔計）。
- Evidence：`~/city2127-evidence/closeup-night/sw/r4/`（`pair.md`、`review.jpg` = baseline | R4 | target 每項全尺寸 crop 連分數、`fps.txt`、日夜截圖）。

## SE R1

- 分數 16/38（42 %）；pairwise 對 baseline 17 勝 1 負（輸 fl-walkway、fm-tower、fh-floors 判 A/B 有矛盾，記低）→ keep，commit `02fb945`。
- 改咗乜：`concentrationTower.ts` 全部重寫做新 taste：−1 六個圓形玻璃亭＋懸浮碟＋S 形架空步道；0 六層玻璃塔＋玻璃升降機＋扶手電梯＋兩翼懸浮碟＋天橋；+1 14 層玻璃垂直街＋外置升降機＋圓頂；SE 自己嘅人仔（頭、身、手、腳，坐姿屈膝，per-instance 衫色）。拆咗木色拱頂、cream 塊、舊英文招牌。
- 鏡位：`se:focal` = H、`se:focal-low` = L（owner 2026-11-04）。`tests/headlineCamera.test.ts` 嘅「鏡頭要高過目標」只為 `se:focal` 放寬（owner 嘅 H 鏡位係向上望），其他 pose 照舊。
- 2 分：fh-floors。0 分：fl-garden、tm-tower、tm-base、fh-gardens。
- 主要問題：−1 亭擠埋一齊、似開放柱廊、碟下冇發光 collar、花園光禿；0 室內平塗桃色＋深啡傢俬；H 鏡位 0 塔細過目標（見 Blocked）；+1 頂被切、柱太粗、冇樹露台。

## SE R2（唔 keep）

- 分數 20/38；pairwise 對 R1 5 勝 9 負 → **唔 keep**，source 還原返 R1，diff 存咗 `~/city2127-evidence/closeup-night/se/r2/r2-not-kept.diff`。
- 試咗乜：−1 改五個亭＋長 S 步道（fl-walkway 2 分）＋水道＋梯級花槽；+1 降到 ≈ 38 等 H 見到成個頂；室內改淺白。
- 輸喺邊：室內由桃色變到冷白，judge 全部話「唔暖」；−1 亭似柱廊、碟冇 gap。R3 由 R1 出發，只搬 R2 結構改動，室內改暖桃色。

## SE R3

- 分數 18/38；pairwise 對 R1 14 勝 3 負 → keep。
- 改咗乜：由 R1 出發，搬返 R2 嘅結構（五亭＋S 步道＋水道、+1 降到 ≈ 38 見到成個頂、5 層露台）；室內改暖桃色（`#f7cfb0` emissive），亭牆加淡玻璃筒，人仔放大到 .75，halo 貼近屋頂花園。
- 2 分：fh-floors。0 分：fl-garden、tm-tower（H 鏡位 0 塔細，crop 見唔到頂）。
- 仍然弱：−1 喺 L 鏡位佔畫面細、似擠埋一角、碟 gap 細；花園光禿；人似方塊；+1 柱讀成方、升降機冇玻璃井。

## SE R4

- 分數 21/38；pairwise 對 R3 7 勝 1 負（輸 fm-crown）→ keep。
- 改咗乜：−1 五個亭移去 lot 後三分之二，前面變花園（梯級花槽、水道、長凳）；亭牆加高到 2.0、碟細啲高啲，L 鏡位見到暖色玻璃牆；0 前庭加長凳坐人、halo 加粗；+1 圓柱 r .3、−Z 面藍玻璃升降井、第二部固定升降機、露台樹放大。
- 2 分：fl-people-in、fm-wings、fh-frame。0 分：fh-lift（H 鏡位睇唔到升降井）。
- 仍然弱：−1 亭擠成一堆（14×14 lot 限制）、碟 collar 光唔夠；步道短；0 halo 太粗、前庭坐低嘅人睇唔到；+1 露台似灌木唔似樹。

## SE R5

- 分數 18/38（absolute judge 飄 ±1）；pairwise 對 R4 8 勝 5 負 → keep。
- 改咗乜：+1 升降井搬去 +X 面 −Z 邊（H 鏡位正面見到），藍玻璃＋兩部升降機；露台樹放大有樹幹；屋頂 7 棵樹；0 升降井加粗、halo 變幼；−1 碟下 collar 光環放大、步道兩個彎由前到後。
- 0 分：fm-ground（L 鏡位前庭喺畫面底以外，長凳睇唔到）。冇 2 分（R4 嘅 2 分項 pairwise 冇輸）。

## SE R6（最後一輪，park）

- 分數 20/38（53 %）；pairwise 對 R5 3 勝 2 負（輸 fm-wings、fm-ground）→ keep。未過 90 % 門檻，round cap 6 用晒 → **park 喺 R6**。
- 改咗乜：0 成組（塔、升降井、扶手電梯、兩翼、天橋）向 +X/+Z 移 1.6，等 L 鏡位見到前庭（花槽、3 張長凳坐 6 人、10 個企住嘅人）；兩翼加實心白端牆＋amber 簷線、室內改咖啡店／書店／lounge；−1 長凳同人移去畫面中段；+1 頂部光環加粗（tube .25）。
- 2 分（1）：fh-frame。冇 0 分。
- 1 分（18）：fl-pavilions、fl-discs、fl-people-in、fl-walkway、fl-garden、fl-material、fm-tower、fm-lift、fm-crown、fm-wings、fm-ground、tm-tower、tm-base、fh-floors、fh-crown、fh-lift、fh-gardens、fh-base。
- 低過 2 嘅原因（直講）：−1 喺 L 鏡位 lot 前三分之一喺畫面底以外，五個亭只能擠喺後面，佔畫面遠細過目標（Gemini 將亭散到 lot 外）；人仔似方塊；碟 collar 光唔夠搶眼；0 喺 H 只得目標一半高（見 Blocked）；+1 傢俬重複、露台似灌木、升降井貼住立面唔夠突出；absolute judge 每輪同一張圖都會 ±1 飄（R4 21 → R5 18 → R6 20，pairwise 全部 keep）。
- Gates：`npm test`／`npm run build`／`git diff --check` 綠；L（−1、0）同 H（0、+1）主體冇遮擋；冇新 UI 字（舊 `都市集約 / 2127` 招牌已拆）；綠化保持茂密；懸浮碟全部有 collar 發光環，唔係浮島。
- FPS（headed `fps.sh`，hero 1920×1080 DPR 1，`se:high`，branch R6）：日 60.0 60.0 60.2 60.0 60.0 60.0／夜 60.0×6（第一個 sample 唔計）。
- Evidence：`~/city2127-evidence/closeup-night/se/r6/`（`pair.md`、`review.jpg` = baseline | R6 | target 每項 crop 連分數、`fps.txt`、日夜截圖、`vs-target.jpg`）。

## Blocked

- **人仔可讀性**（fl-people-in、fm-ring、fh-people 卡喺 1）：全城共用 `pedestrians()` 人仔 mesh，冇 per-instance 衫色、坐姿由呢個 15° 鏡位睇大腿好短，似企。選項：(a) 只喺 SW 加一個更大、淺色衫、明顯屈膝嘅坐姿人仔變體（淨係 `commonsPlaza.ts`）；(b) 喺 `mobility.ts` 加 per-instance tint／坐姿誇張度（會影響其他 site，要 owner 批）；(c) 接受 1 分。今晚揀咗保持設計、唔郁共用 crowd，項目留喺 1。
- **更新（R5，dispatcher 05:20）**：做咗選項 (a)，SW 自己嘅人仔（跟 SE 做法），只改 `commonsPlaza.ts`。fm-ring、fh-people 升到 2；fl-people-in 仍然 1（艙內人仔方塊感、左右對稱、穿模）。呢個 blocker 已經解除，剩低係 polish。

- **SE −1 構圖**（fl-pavilions、fl-garden）：L 鏡位 lot 前三分之一喺畫面底以外，Gemini 目標將亭散到 lot 外。選項：(a) 守 14×14 lot、亭擠喺後三分之二（今晚揀咗）；(b) 擴大 SE lot（改其他檔案、要 owner 批）；(c) L 鏡位向後拉高（owner 定嘅鏡位，唔郁）。
- **SE `se:focal` 向上望**：owner 嘅 H 鏡位鏡頭低過目標，`tests/headlineCamera.test.ts` 只為 `se:focal` 放寬「鏡頭高過目標」規則（其他 73 個 pose 照舊）。
- **SE 0 塔高度**（tm-tower、tm-base）：L 鏡位頂框約 18 local units，0 塔要入得 L，所以喺 H 只係目標約一半高（Gemini 放大咗）。選項：(a) 塔頂 ≈ 17，H 用 capture 框跟住城市實際位置（今晚揀咗，淨改 SE rubric）；(b) 塔加高到 ≈ 30，L 切頂；(c) 改 L 鏡位（owner 定嘅，唔郁）。

## SW R5（cap 升到 6，owner）

- 05:20 dispatcher 重開 SW；先 merge `feat/closeup-night`（`24341f8`，fast-forward）入 SW branch。
- 分數 22/30（73 %）；pairwise 對 R4 6 勝 4 負（輸 fl-emitters、fl-garden、fm-pods、fh-disc）→ keep，commit `09c9273`。
- 改咗乜：Blocked 選項 (a)——SW 自己嘅人仔（跟 SE `concentrationTower.ts` 做法：頭／身／手／腳、屈膝坐姿、per-instance 淺色衫、小朋友 ×.65），取代共用 `pedestrians()`，淨係郁 `commonsPlaza.ts`；艙底發光領圈；花園加蕨同 12 棵有樹幹嘅樹；0 碟去 halo；+1 碟粉紅邊連續、深灰機械；後亭更暖。
- 2 分（7）：fl-pods、fl-screens、fm-ring、fm-deck、fh-amph、fh-people、fh-planting。冇 0 分。
- 1 分（8）：fl-people-in、fl-emitters、fl-garden、fm-pods、fm-divider、fm-canopy、fh-disc、fh-tables。

## SW R6（drop）

- 15/30——Opus 用量撞咗上限，所以改用 Sonnet 評分，同之前嘅 Opus 分唔可以比；pairwise 對 R5 3 勝 4 負 → **唔 keep**，source 還原返 R5 `09c9273`，diff 存喺 `~/city2127-evidence/closeup-night/sw/r6/dropped.diff`。
- 贏：fm-pods（艙散開、粉紅側板闊啲）、fm-divider（淺色有樹幹嘅樹）、fh-disc（淺灰機械）。輸：fm-canopy（碟拉近鏡頭遮咗圓圈，fm-ring 跟住輸）、fh-planting（為咗擺檯拆咗花槽）、fl-emitters。
- Owner 話唔理時限 → 開 R7，以 R5 做底，只拎 R6 贏咗嘅部分。

## SW R7（keep，最新）

- Owner 話唔理時限。以 R5 做底，加返 R6 贏咗嘅部分（0 艙散開＋粉紅側板、分隔花槽淺色有樹幹嘅樹、+1 碟淺灰機械＋平啲嘅碟身、艙內細檯、花園曲線小路）；0 碟留喺圓圈中心上面，降到 y 2.5、r 2.0；艙底加 bloom 發光環；+1 加第 5 張檯，冇拆花槽。
- 分數 21/30（Opus 評分）；pairwise 對 R5 6 勝 1 負（輸 fl-screens）→ keep，commit `d156db5`。
- 2 分（6）：fm-ring、fm-deck、fh-amph、fh-people、fh-tables、fh-planting。冇 0 分。
- 1 分（9）：fl-pods、fl-people-in、fl-emitters、fl-screens、fl-garden、fm-pods、fm-divider、fm-canopy、fh-disc。fl-pods、fl-screens R5 係 2，今輪絕對分跌咗做 1（pairwise 一個 `=`、一個輸，屏風前面有樹叢穿出嚟）。
- FPS（headed `fps.sh`，hero 1920×1080 DPR 1，`d156db5`，`sw:high`）：日 60.0×6／夜 60.0×6。
- Evidence：`~/city2127-evidence/closeup-night/sw/r7/`（`pair.md`、`review.jpg` = baseline | R7 | target 全尺寸 crop 連分數、`fps.txt`）。

## SW R8（keep，最新）

- 以 R7 做底，改 1 分項目：膠囊形艙＋玻璃反光帶、艙內一對人姿勢唔同、灰色底板＋飽和青色環（唔再用 bloom）、屏風改近乎不透明＋周圍 .8 冇植物、花槽密植唔見草地、0 艙 ×.85 錯開、兩級分隔花槽、0 碟 r 2.4 y 2.9 向鏡頭移 .6、+1 碟底去咗多餘白色橢圓。
- 分數 **23/30（77 %）**（Opus 評分）；pairwise 對 R7 9 勝 3 負（輸 fl-emitters、fm-canopy、fh-tables）→ keep，commit `992f339`。
- 2 分（8）：fl-pods、fl-screens、fm-ring、fm-deck、fh-disc、fh-amph、fh-people、fh-planting。冇 0 分。
- 1 分（7）：fl-people-in（人仔方塊、穿模）、fl-emitters（環太飽和、空隙唔夠明顯）、fl-garden（小路仍似硬 Y 字、長凳得 1 張有人）、fm-pods（艙仍然擠）、fm-divider（似一條波波柱）、fm-canopy（碟後半仍然似喺水面上）、fh-tables（後亭似骨架＋平面桃色板，唔似玻璃房）。
- FPS（headed `fps.sh`，hero 1920×1080 DPR 1，`992f339`）：`sw:high` 日 60.0 59.9 60.0 60.0 60.0 60.0／夜 60.0×6；`sw:low` 日夜 60.0×6。
- Evidence：`~/city2127-evidence/closeup-night/sw/r8/`（`pair.md`、`review.jpg` = baseline | R8 | target、`fps.txt`）。

## Next expected step

Phase B：dispatcher 開 SW site session（`feat/closeup-night-sw`，port 5191，06:00 前停），完成後驗證、merge 入 `feat/closeup-night`，再開 SE（port 5192，09:00 停）；10:00 前交 night board。
