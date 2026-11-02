# explanation-frame-hud — 大屏幕右上說明卡換 HUD 外觀

- Owner: cc100053
- Status: DONE — owner 2026-11-02 要求 merge 入 main
- Branch: `feat/explanation-frame-hud`（worktree `.claude/worktrees/explanation-frame-hud`）
- Base commit: `27899d543bbb5ae468875033e0616fdff9cd7906`（origin/main，2026-11-02 fetch，無分歧）
- Last verified commit: 見 git log（本分支第一個 commit）
- Remote availability: NOT PUSHED

## Goal

Owner 2026-11-02 揀咗一張 HUD 目標圖（深色煙燻玻璃、青色發光框、角標、側刻度、右上狀態、薄荷色大標題），要求將 `.resident-panel` 改成呢個風格。之前四個 mockup 方案（A–D）喺 main checkout 嘅 `artifacts/explanation-frame-options/`（未追蹤）。

## Completed work

- `src/style.css`：`.resident-panel` 全套 HUD 樣式；寬度、位置（360px 右上）不變，避免遮 focal site。標題用 `word-break:auto-phrase` 喺句讀斷行。
- `src/surveyAtmosphere.ts`：加一個 `aria-hidden` 嘅 `.resident-hud`（ライブ／状態：接続中／座標），legacy panel 由 CSS 隱藏。
- 細節第二輪（owner「add more detail」）：TL／BR 切角（`corner-shape:bevel`，舊瀏覽器退回圓角）、外層第二框線、琥珀角標、頂部短條、左側圓點節點同刻度尺、右側直條、左下旋轉環、卡底微型文字、卡內掃描線＋網格、Wi-Fi 圖示、裝飾性「都市応答 ❯❯❯ ▮▮▮」條（冇數值）。
- 第三輪（owner「搭通埋其他文字說明框」）：HUD chrome 抽出做 `src/hudFrame.ts`（`addHudChrome`），結果卡、能源旁白 `.energy-narration`（包括沖の受電翼／軌道エレベーター受電）、空の環 `.explore-narration` 共用；CSS 用 `:is(.resident-panel,.energy-narration,.explore-narration)`。旁白框標題薄荷發光、現步驟薄荷、狀態只顯示ライブ＋状態兩行（長標題唔使斷行）。軌道エレベーター本身冇獨立文字框。`tests/energyNarration.test.ts` 嘅假 DOM 加 `setAttribute`／`append`。
- 文件：EXHIBITION_SPEC、RESIDENT_COPY。

## Not done (deliberate)

- 目標圖入面嘅「共有席 4 → 5」數值框、走勢線、箭咀：renderer 仲未有前後數值（[change-explanation](change-explanation.md) 仍係 PLANNED），唔虛構數字。嗰個任務做嘅時候再加同一風格嘅數值框。

## Actual validation results

見 [VALIDATION](../VALIDATION.md) 「Explanation frame HUD」一段。

## Next expected step

NONE。已 merge 入 main（基於 `97d3d22`，太空電梯 iPad look 嘅 `ELEVATOR_COPY` 框亦自動用 HUD 外觀）；worktree 同分支已刪除。後續：change-explanation 加前後數值時沿用「都市応答」條位置。
