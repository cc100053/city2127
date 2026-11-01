# se-closeup-polish — SE 集約 focal 近鏡樣板

- Owner: cc100053（唯一驗收人；owner 一人同意即合格）
- Status: PLANNED — 等 owner 提供目標圖
- Branch: `feat/se-closeup-polish`
- Base commit: `4248e8a23f45b9af9a471678cc7d68dcf5245dd2`
- Last verified commit: NONE
- Remote availability: NOT PUSHED

## Session Git state

- Session starting branch and HEAD: `main` `4248e8a23f45b9af9a471678cc7d68dcf5245dd2`
- Last fetched origin/main commit: `4248e8a`（2026-11-01；main／origin/main 0/0）
- Local changes present at session start: 未追蹤 `.playwright-cli/`、`.task-relay/`、`artifacts/city-change-review/`（唔郁）
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## 點解有呢個任務

Owner 2026-11-01：觀眾睇唔出城市變化。做法係揀一個場景打磨到最高質素做樣板（vertical slice），owner 接受後先套用到 SW／NW，並將流程寫成 Skill。揀 SE（Q4 `functions-2127`）原因：選項文字本身就係畫面（「水辺に点在する低い建物」對「一つのタワー」），輪廓差距最大。

打磨對象係**成條因果鏈**，唔只係 model：選項 → 票 → 近鏡「之前」→ 變化 → 「之後」＋原因字幕。

工作模式（AGENTS.md 2026-11-01）：Opus 定規格同審圖；Sonnet agent 按規格實作同截圖；Opus 審；owner 最終一人驗收。

## 現況診斷（baseline：`artifacts/city-change-review/closeups/se-focal-rung±1.jpg`，2026-10-30，SE 相關 code 其後無影響外形嘅改動）

| # | 問題 | 證據 |
| --- | --- | --- |
| D1 | **鏡頭太高太遠**：site root `scale:3`，地塊實際約 27×27 m、+1 塔頂約 130 m，尺度唔細；但 `se:focal` 由約 295 m 外高角度望落，壓扁咗高度，主體只佔畫面寬約 11–14%（2026-11-01 更正：之前誤當地塊 9 m） | `layout.ts` `changeSites.se`；[A-se-review](../../artifacts/closeup-zoom/final/A-se-review/README.md) |
| D2 | **+1 塔同鄰居同一套語言**（藍／米色疊環），融入背景，唔似「新起」 | se-focal-rung+1 |
| D3 | **−1 太簡陋**：兩個 3 m 盒＋兩支 32 m 光桿（service spines），讀成兩支電線桿 | se-focal-rung-1 |
| D4 | **變化方式係成組由中心點縮放**（`group.scale.setScalar`），係「彈出／縮走」，唔係「起樓／拆走」 | `ConcentrationTowerController.write` |
| D5 | **冇生活／動態**：睇唔到「めぐる」（行來行去）對「上へ移動」（垂直移動） | 全部狀態 |

## 目標規格（草案，待 owner 確認）

每個狀態要喺兩秒內、只睇輪廓就分得出，而且同選項字眼對得上：

- **−1「点在する低い建物をめぐる」**：3–4 座 1–2 層嘅低矮水邊亭，屋頂各有特色（弧形／綠化屋頂），由一條有蓋步道環迴連接，步道上有行人行走。輪廓：闊、低、水平。刪除兩支光桿。
- **0「低い建物と高い建物が混ざる」**：一座中高樓（現有 hall 約 18 m）＋兩座低亭＋部分步道。
- **+1「上へ移動して一つのタワー」**：一座修長高塔，係畫面入面最高或最突出嘅建築；面向鏡頭一側有玻璃升降井，升降艙上落移動；各層功能（商店／診所／圖書館等）用唔同暖色燈分層，似一條「垂直街道」；頂部空中花園＋SE Meter 色環。輪廓：垂直。
- **共通識別**：三個狀態都用 SE Meter 色（`METER_COLORS.urbanConcentration`）做唯一強調色，同鄰居嘅藍／米色分開。
- **變化動畫**（3 s，`SITE_TRANSITION_SECONDS` 不變）：塔由地面逐層疊起（每層順序升起），封頂後升降艙先開始郁；拆走時由上而下逐層落；低亭以沉降／升起代替縮放。
- **鏡頭**：重定 `se:focal` pose，距離約 120–160 m，三個狀態主體高度佔畫面 45–65%（沿用 closeup-zoom F 標準），背景盡量係天或海。
- **不變**：tier／ladder／headline 規則、survey 協議、`DISPLAY_MS`、時間線、結果卡文字（文字另議）。

## Owner 決定（2026-11-01）

1. **地塊／高度可以改**（跟建議）。更正 D1 後，現有 27 m 地塊同約 130 m 塔高已足夠；先用新鏡頭解決，真係唔夠先擴，擴之前查周邊步道／路線淨空。
2. **目標圖由 owner 用外部圖像模型生成**：底圖同 prompt 見 [prompts.md](../../artifacts/se-closeup-polish/prompts.md)，結果放 `artifacts/se-closeup-polish/target/`。
3. **先用 code（現有 `cityRig` kit）起模**，到上限先轉 Blender GLB。

## 候選鏡頭 `se:d4`

`position [5, 115, -215]`、`target [175, 72, -45]`（距離約 245 m，hero 一側）。三個狀態主體全入鏡，+1 塔頂對天，背景見海：[baseline 三連圖](../../artifacts/se-closeup-polish/baseline/se-d4-triple.jpg)。已試但棄用：d1 `[40,60,-175]`（太低，塔頂出界）、d2 `[20,100,-185]`（塔頂出界）、d3 `[95,35,-210]`（鏡頭入咗建築）。目標圖確定後再微調；未寫入 `SHOTS`。

## In-scope files

`src/siteBuilders/concentrationTower.ts`、`src/headlineCamera.ts`（只改 `se:focal` pose）、相關 tests、`artifacts/se-closeup-polish/**` 證據。唔包括：survey、district carrier 美術（`districtMeters.ts`）、SW／NW、時間線。

## Completed work

- `AGENTS.md`：加 visual polish delegation 授權（owner 2026-11-01）。
- 本 handoff：診斷同目標規格草案。
- Baseline 截圖（`se:d4`，−1／0／+1，12:00，headless Chrome 1600×900 via `playwright-cli`）同目標圖 prompt。截圖要 `reviewTime` 後等約 10 s，否則 `page.screenshot` 5 s timeout。

## Actual validation results

- Verification status: NOT RUN（只有文件改動）

## Next step

Owner 提供目標圖 → Opus 寫逐部件規格（尺寸／材質／動畫）→ Sonnet agent 實作＋固定鏡頭截圖 −1／0／+1、日／夜、變化中途 → Opus 審 → owner 睇對照頁。
