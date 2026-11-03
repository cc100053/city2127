# nw-closeup-polish — NW 自動化旗艦＋district 載體，新 taste 重建

- Owner: cc100053（唯一驗收人）
- Status: PLANNED — 等 owner 揀 Gemini 目標圖
- Branch: `feat/nw-closeup-polish`
- Base commit: `34f1fd35e7761e164e5dc51648709cefbbc0c145`（main = origin/main）
- Last verified commit: 未有（未改 code）
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

## Next step

1. Gemini 目標圖（6 張：旗艦 −1/0/+1、bay −1/0/+1），prompt 見 [prompts.md](../../artifacts/nw-closeup-polish/prompts.md)；candidate 放 evidence `gen/`。
2. Owner 揀 → `artifacts/nw-closeup-polish/target/` → spec.md → Sonnet rounds。
