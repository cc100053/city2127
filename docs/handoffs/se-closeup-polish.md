# se-closeup-polish — SE 集約 focal 近鏡樣板

- Owner: cc100053（唯一驗收人；owner 一人同意即合格）
- Status: IN_PROGRESS — R4 等 owner review
- Branch: `feat/se-closeup-polish`
- Base commit: `4248e8a23f45b9af9a471678cc7d68dcf5245dd2`
- Last verified commit: 本 commit（R4；root test／build／diff-check PASS）
- Remote availability: `origin/feat/se-closeup-polish`

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

- R1／R2（Sonnet 實作，Opus 規格同審核；規格同審核意見：[spec.md](../../artifacts/se-closeup-polish/spec.md)）：`concentrationTower.ts` 重寫為 −1 四座低亭＋有蓋步道＋行人、0 米白退台中高樓＋兩座木亭、+1 地面起嘅米白框垂直街道塔（暖色室內、升降艙按時鐘上落 14 s 週期、琥珀冠環）；新 material `amber`（Meter 色、自發光，日夜都係琥珀）、`timber`、`warm`；`towerUpper` layer 改由 y=0 起（變化＝由地面長高）；high 唔再顯示 mixed hall；`se:focal` 改為 d4 pose；`changeSites.se` w／d 9→10（11／12 被 `tests/odaiba.test.ts` 嘅 surveyed-coastal-canopy 淨空擋住）。

## Actual validation results

- Verification status: PARTIAL
- 2026-11-01，R2 工作樹：`npm test` exit 0（`concentrationTower: PASS`；bounds low x −5.00..4.90、mixed y 0..18.53、high y 0..41.58）、`npm run build` ✓、`git diff --check` clean。survey／module-swap 未改。
- 截圖（headless Chrome via `playwright-cli`，1600×900，12:00／22:00）：[R2 對目標](../../artifacts/se-closeup-polish/r2/vs-target.jpg)、[R2 夜景](../../artifacts/se-closeup-polish/r2/triple-night.jpg)、[變化中途](../../artifacts/se-closeup-polish/r2/se-transition-mid.png)、[R1 對目標](../../artifacts/se-closeup-polish/r1/vs-target.jpg)。
- Site visible meshes（Node 量，非 GPU draw call）：low 34／mixed 42／high 28，baseline 20／25／40；low／mixed 超出 +15% 預算（約佔全場 950 calls 嘅 1–2%）。瀏覽器 FPS 同 draw call 未量。
- Opus R2 判斷：+1、0 輪廓同色調接近目標，夜景 +1 讀到一層層暖光；**−1 喺 245 m 鏡頭仍然太細**（10×10 地塊）；+1 升降艙喺呢個距離唔明顯；變化中途係成棟塔垂直壓扁再長高，唔係逐層起。
- 未做：owner review、FPS、reduced-motion 下升降艙仍會郁（未處理）。

## Next step

Owner review R2 → 決定 −1 細嘅處理（見對話：鏡頭按狀態微調、或接受）→ R3 → FPS 實測 → owner 接受後 merge，再寫 Skill 同套用 SW／NW。

## R3（2026-11-01）

- Owner：−1 要做到目標圖咁大、推近鏡頭、問可否刪海岸樹林。結論：唔使刪——地塊 ≥11 會剔走 surveyed 樹 k2／k5，`plantCanopy` 用剔走後嘅 index 決定樹冠旋轉，所以全城樹冠移位，撞到遠處 district 塔／pod 淨空 test。改為 `changeSites.se` = `x:182, z:-38, w:14, d:14`（42 m，中心東北移 7 m 避開兩棵樹），全城其他物件不變。
- 新 `CarrierChange.low`（focal 前或後 band 係 low）＋ `headlineShot` 揀 `${socket}:focal-low`（如有）；只有 SE 有 `se:focal-low` `{ position: [104, 80, -116], target: [182, 17, -38] }`。`se:focal`／`se:district` 跟新中心。
- −1 重做（兩座兩層亭、大拱頂木亭、綠屋頂亭、S 形有蓋步道、27 人）；0 前庭放大；+1 10×10 植樹平台、升降艙 1.6×2.2×1.6 加琥珀導軌。
- 驗證：`npm test` exit 0、build ✓、diff-check clean。Site visible meshes low 34／mixed 42／high 29。截圖：[R3 對目標](../../artifacts/se-closeup-polish/r3/vs-target.jpg)、[−1 日間](../../artifacts/se-closeup-polish/r3/se-rung-1-day.png)、[夜景](../../artifacts/se-closeup-polish/r3/triple-night.jpg)、[−1→0 中途](../../artifacts/se-closeup-polish/r3/se-transition-mid.png)。
- Opus R3 判斷：−1 大細已達目標（約佔畫面闊 35%）；但鏡頭偏俯視，亭身黃橙色＋藍窗似玩具，步道同行人唔明顯，後面粉紅傘廣場搶眼。FPS、reduced-motion 升降艙未處理。

## R4（2026-11-01，owner 批准）

- `se:focal-low` 降低：`{ position: [100, 34, -120], target: [182, 26, -38] }`（約 117 m，俯角約 16°）；棄用 y=62（屋頂主導、似模型）、y=42（粉紅傘廣場露出多）。
- −1 亭身：`cream` 柱＋`timber` 簷篷＋大片 `warm` 落地店面加 `trim` 直欞，鏡頭面冇 glass；28 人（淺色衫 instance colour，6 坐）、4 組咖啡座、12 棵樹（6 棵 s ≥ .5）、步道 `cream` 上蓋＋`amber` 中線。0 前庭亭共用新外觀。
- `prefersReducedMotion` 搬去 `siteRuntime.ts` export（避免 circular import）；減少動態時升降艙停 y=19，有 test。
- 驗證：`npm test` exit 0、build ✓、diff-check clean；meshes low 34／mixed 42／high 29。截圖：[R4 對目標](../../artifacts/se-closeup-polish/r4/vs-target.jpg)、[−1 日](../../artifacts/se-closeup-polish/r4/se-rung-1-day.png)、[−1 夜](../../artifacts/se-closeup-polish/r4/se-rung-1-night.png)、[R3 vs R4](../../artifacts/se-closeup-polish/r4/vs-r3.jpg)。
- Opus R4 判斷：唔再似玩具，店面暖光、咖啡座、樹、夜景都讀到；餘下：拱頂木色偏橙、行人喺呢個距離仍然細、左邊大格仔樓佔畫面約四分一、後面粉紅傘仍然露少少。FPS 未量。
