# closeup-night — 夜間重做 SW、NE、SE 旗艦 headline 近鏡

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — Phase B：SW park（20/30），SE 進行中
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
- Pass：總分 ≥ 90%、冇 0 分、2 分項目 pairwise 冇輸、gate 綠；第一輪 cap 4 round，未過就 park。
- Site 次序：SW → NE → SE。Deadline 2026-11-05 10:00 JST；09:00 停開新 round。
- 冇嘢入 `main`；owner 朝早睇 board 決定。

## Site queue

| Site | Pose | Targets | Size decision | Rounds | Score | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SW | `sw:n` `[-95,30,-15]`→`[-105,10,60]` | [target](../../artifacts/closeup-night/sw/target/) | 放大到目標（填滿 lot，唔越橙邊；碟可以向上） | R1–R4 | 20/30（67 %）R4 | PARKED（merged `55a5d2b`，dispatcher 驗證 test/build/check 綠） |
| NE | `ne:s2` | — | — | — | — | SKIPPED（owner 2026-11-04：Q3 改能源題後 NE 公園恆定 0，客人去唔到 ±1） |
| SE | L `[130,28,-95]`→`[182,24,-38]`（−1、0）；H `[360,45,-50]`→`[182,58,-38]`（0、+1） | [target](../../artifacts/closeup-night/se/target/)（`tower-mixed` = 0 喺 H） | 放大到目標 | | | READY |

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

## Blocked

- **人仔可讀性**（fl-people-in、fm-ring、fh-people 卡喺 1）：全城共用 `pedestrians()` 人仔 mesh，冇 per-instance 衫色、坐姿由呢個 15° 鏡位睇大腿好短，似企。選項：(a) 只喺 SW 加一個更大、淺色衫、明顯屈膝嘅坐姿人仔變體（淨係 `commonsPlaza.ts`）；(b) 喺 `mobility.ts` 加 per-instance tint／坐姿誇張度（會影響其他 site，要 owner 批）；(c) 接受 1 分。今晚揀咗保持設計、唔郁共用 crowd，項目留喺 1。

- **SE 0 塔高度**（tm-tower、tm-base）：L 鏡位頂框約 18 local units，0 塔要入得 L，所以喺 H 只係目標約一半高（Gemini 放大咗）。選項：(a) 塔頂 ≈ 17，H 用 capture 框跟住城市實際位置（今晚揀咗，淨改 SE rubric）；(b) 塔加高到 ≈ 30，L 切頂；(c) 改 L 鏡位（owner 定嘅，唔郁）。

## Next expected step

Phase B：dispatcher 開 SW site session（`feat/closeup-night-sw`，port 5191，06:00 前停），完成後驗證、merge 入 `feat/closeup-night`，再開 SE（port 5192，09:00 停）；10:00 前交 night board。
