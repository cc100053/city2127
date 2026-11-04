# closeup-night — 夜間重做 SW、NE、SE 旗艦 headline 近鏡

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — Phase A 完成（2026-11-04），Phase B 等 owner 一句開 SW
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
| SW | `sw:n` `[-95,30,-15]`→`[-105,10,60]` | [target](../../artifacts/closeup-night/sw/target/) | 放大到目標（填滿 lot，唔越橙邊；碟可以向上） | | | READY |
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

## Next expected step

Phase B：dispatcher 開 SW site session（`feat/closeup-night-sw`，port 5191，06:00 前停），完成後驗證、merge 入 `feat/closeup-night`，再開 SE（port 5192，09:00 停）；10:00 前交 night board。
