# change-explanation — 大屏幕右上卡片直接說明「乜嘢變成乜嘢」

- Owner: cc100053
- Status: PLANNED — TODO，未開始實作
- Branch: 未建立（建議 `feat/change-explanation`，由最新 main 開）
- Base commit: 未開始；記錄時 main 係 `b3334b21b73730f0666682d2d9316a5e5dfe10d9`
- Last verified commit: NONE
- Remote availability: NOT PUSHED（只有本文件）
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `main` @ `b3334b21b73730f0666682d2d9316a5e5dfe10d9`
- Last fetched origin/main commit: `b3334b21b73730f0666682d2d9316a5e5dfe10d9`（2026-10-19）
- Local changes present at session start: 只有未追蹤嘅 `question_candidates.md`（企劃組資料，保留）
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

問題（2026-10-19 owner 提出）：觀眾唔容易知道城市變咗啲乜。而家有特效（一票旅程、掃描環、pulse 光柱、site marker）指出**邊度**變咗，但係**由乜嘢變成乜嘢**冇明確說明。

做法（owner 決定）：用主畫面右上嘅文字卡片（[EXHIBITION_SPEC](../EXHIBITION_SPEC.md) 嘅 360px 右上卡）直接說明變化前後。

- **暫行版（未來城市選擇未定之前）**：用參數變動做說明內容，例如某地點嘅數量、形態由前到後點樣變（「自律サービス端口 2 → 3」「水辺の共有席 4 → 5」「形態：中間 → 高」之類）。
- **正式版**：等未來城市嘅變化（每個選擇對應嘅具體設施／形態）訂立之後，再重新修改卡片內容，換成生活化嘅說明。

建議驗收條件（未經 owner 確認）：
- 每份 live 結果嘅卡片都會顯示至少一項實際發生嘅「前 → 後」，數值取自 renderer 嘅實際前後 targets（`beforeLayout`／`afterLayout` 同 `CarrierChange`），唔用答案正負票推測。
- 冇可見變化（只有方向變／完全維持）嘅情況，照現行分開說明，唔虛構前後數字。
- 10 秒閱讀時段、一票旅程時序、handoff、lease、A/B 排程不變；snapshot／reset／Undo／reconnect 即時替換。
- 新文案要記入 [RESIDENT_COPY](../RESIDENT_COPY.md)。

## In-scope files and dependencies

- `src/surveyAtmosphere.ts`：`residentResult()` 而家只用第一個 `CarrierChange`，focal site 寫「〜が増えました」，district-only 寫「配置が調整されました」，都冇前後數值。
- `src/cityChangeManager.ts`：`applyExhibitionLayout()` 回傳 `CarrierChange[]`（只有 socket／focal／district，冇數值），可能要加前後數值。
- 卡片排版：`src/style.css`（360px 寬，最多一個標題加兩句；加前後行要確認放得落、唔遮 focal site）。
- 文件：RESIDENT_COPY（大屏幕「変化の理由」章節）、EXHIBITION_SPEC、PROJECT、VALIDATION。
- 依賴：正式版要等未來城市變化定案；同 [回顧章節](day-replay.md) 嘅字幕／時間軸用詞要一致。

## Completed work

NONE（只記錄 TODO）。

## Actual validation results

- Verification status: NOT RUN
- Date and checked commit/worktree: NONE
- Commands/manual checks and results: NOT RUN
- Evidence/environment: NONE
- Integrated commit and checks: NOT INTEGRATED
- Changes since verification: NONE

## Known issues and blockers

- 未來城市各選擇嘅具體變化未定，所以正式文案暫時寫唔到。
- 參數式說明（數字、形態名）對一般觀眾可能太技術化，係暫行取捨；用詞要再同 owner 確認。

## Important decisions

- 2026-10-19 owner：用主畫面右邊嘅文字卡片直接說明變化；未來城市變化訂立後再改內容；未明確之前先用參數變動做說明。

## Next expected step

cc100053 確認暫行版顯示邊啲參數及用詞（數量、形態、Meter 值），之後由最新 main 開 `feat/change-explanation`，先改 `residentResult()` 同測試，再做瀏覽器檢查。
