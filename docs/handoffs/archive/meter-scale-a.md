# meter-scale-a — 正式採用刻度 A（溫和開場、逐步加強）

- Owner: cc100053（實作：Claude Code）
- Status: DONE — 已合併 main `8340f46`，main CI PASS
- Branch: `feat/meter-scale-a`
- Base commit: `3c78210`（main，已包含 [刻度比較原型](meter-scale-journey.md)）
- Last verified commit: 見 Git log；驗證時係未提交 worktree，內容即本分支第一個 commit
- Remote availability: `origin/feat/meter-scale-a`（push 後）
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `main` @ `3c78210`（剛合併並 push 原型）
- Last fetched origin/main commit: `3c78210`（2026-10-13）
- Local changes present at session start: 只有未追蹤嘅 `.playwright-cli/`（與任務無關，保留）
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

2026-10-13 owner 決定：(1) 用刻度 A；(2) **頭幾位觀眾溫和，之後漸強**；(3) **完全換成新刻度**。完成條件：server 權威 layout、紀錄歷史、root 城市同 Guest 結果全部用新刻度；計分 reducer 唔變；測試覆蓋開場倍數、漸強同上限。

## In-scope files and dependencies

- `survey/src/shared/cityView.ts`：新增 `exhibitionScaleGain`、`exhibitionDisplayScores`、`exhibitionStateLayout`；`deriveExhibitionLayout` 保留為「展示分數 → layout」嘅 site mapping。
- `survey/src/server/runStore.ts`、`survey/src/survey/decisionHistory.ts`：改用 `exhibitionStateLayout(scores, guestCount)`。
- 測試：`survey/tests/exhibitionRules.test.ts`（新增刻度測試）、`survey/tests/meterContract.ts`（第一票 golden）、`tests/surveyMeterPipeline.test.ts`（P4 歷史改成未頂到上限）、`tests/scaleLab.test.ts`。
- DEV：`src/scaleLab.ts`、`src/devScaleLab.ts`（比較改為「舊刻度 ×1」對「刻度 A」）、`src/devMeters.ts` 註解（`?meters` 數值即展示分數）。
- 文件：EXHIBITION_SPEC、PROJECT、VALIDATION、handoff index。

## Completed work

- 展示分數 `D = clamp(M × g(n), −12, 12)`，`g(n) = 0.85 + 1.55 × min(1, (n−1)/11)`：第一位 ×0.85，第 12 位起 ×2.4。Band 及數量公式照舊，但改為讀 D。
- **開場倍數點解係 0.85**：原本想用 0.6，但 P10 配對設施要求兩條軸都去到 ≥ .7 或者 ≤ .3，而 automation 讀嘅係整數端口數（`ports/6`）。試過 0.6、0.7 都會令第一票觸發唔到配對設施，`tests/surveyMeterPipeline.test.ts` 亦會 fail。0.85 係保住配對設施嘅最低值（第一票 D = ±6.375，舊刻度係 ±7.5，直接用 ×2.4 就會係 12）。
- 模擬（平均傾向，每種 4000 次）：第一位觀眾平均變化約 3（直接 ×2.4 係 8），頭幾位唔會去到極端，到大約第 12 位升到約 3，之後保持。
- 紀錄嘅 layout 一直都係讀取時由分數重新計算，所以舊歷史自動轉用新刻度，**唔使遷移資料**。
- P4 測試原本用 23 個連續 +1，會頂到刻度 A 上限，令之後一票反對冇可見變化；改成每三位一個 +1，保留測試原意（反對票之後城市仍然 high，但真實窗口數量增加）。

## Actual validation results

- Verification status: PASSED（軟件及 DEV 截圖）
- Date and checked commit/worktree: 2026-10-13，`feat/meter-scale-a` 基於 `3c78210` 加上本分支改動
- Commands/manual checks and results: `survey/` `npm test`（exit 0，包括 81 種答案組合、HTTP/WebSocket、Undo、A/B）、`npm run build` PASS；root `npm test`（包括真實 server 嘅 Meter pipeline P4／P10／P11）、`npm run build` PASS；`git diff --check` PASS。
- Evidence/environment: 開發 Mac headless Chrome（playwright-core，1280×720，DPR1，`?scaleLab&reviewTime=100&hour=16`，平均傾向、seed 1）：[#1 舊](../../../artifacts/meter-scale-a/guest1-old.jpg)／[A](../../../artifacts/meter-scale-a/guest1-a.jpg)、[#3 舊](../../../artifacts/meter-scale-a/guest3-old.jpg)／[A](../../../artifacts/meter-scale-a/guest3-a.jpg)、[#40 舊](../../../artifacts/meter-scale-a/guest40-old.jpg)／[A](../../../artifacts/meter-scale-a/guest40-a.jpg)。60 位觀眾：形態切換 42 對 98 次，端口級數 4/7 對 7/7。唯一 console error 係已知 favicon 404。
- Integrated commit and checks: main `8340f46`；merge result root／survey `npm test`、`npm run build`、`git diff --check` PASS；[main CI 38328541533](https://github.com/cc100053/city2127/actions/runs/38328541533) success
- Changes since verification: 只有本 handoff

## Known issues and blockers

- 冇跑 resident P2–P4 瀏覽器回歸（`tests/resident*.browser.mjs`），冇量 FPS；Guest、居民結果卡同計時邏輯冇改，root pipeline 測試已覆蓋結果句同 carrier 證據。
- 觀眾有明顯傾向嘅時候，刻度 A 會更易頂到一邊；呢個係採用時已知嘅取捨。
- 展場切換：因為歷史係重新計算，進行中嘅 run 一換版本就會即刻用新刻度顯示，唔需要 reset。

## Important decisions

- 2026-10-13 owner：用刻度 A；頭幾位溫和、之後漸強；完全換成新刻度。開場倍數由 0.6 調到 0.85，以保住 P10「第一票觸發配對設施」嘅行為（見上）。

## Next expected step

已完成合併。下一步：一票旅程（視覺方向／是否接入 live）同回顧章節（待討論）。
