# explanation-frame-hud — 大屏幕右上說明卡換 HUD 外觀

- Owner: cc100053
- Status: IMPLEMENTED — 等 owner 視覺驗收
- Branch: `feat/explanation-frame-hud`（worktree `.claude/worktrees/explanation-frame-hud`）
- Base commit: `27899d543bbb5ae468875033e0616fdff9cd7906`（origin/main，2026-11-02 fetch，無分歧）
- Last verified commit: 見 git log（本分支第一個 commit）
- Remote availability: NOT PUSHED

## Goal

Owner 2026-11-02 揀咗一張 HUD 目標圖（深色煙燻玻璃、青色發光框、角標、側刻度、右上狀態、薄荷色大標題），要求將 `.resident-panel` 改成呢個風格。之前四個 mockup 方案（A–D）喺 main checkout 嘅 `artifacts/explanation-frame-options/`（未追蹤）。

## Completed work

- `src/style.css`：`.resident-panel` 全套 HUD 樣式；寬度、位置（360px 右上）不變，避免遮 focal site。標題用 `word-break:auto-phrase` 喺句讀斷行。
- `src/surveyAtmosphere.ts`：加一個 `aria-hidden` 嘅 `.resident-hud`（ライブ／状態：接続中／座標），legacy panel 由 CSS 隱藏。
- 文件：EXHIBITION_SPEC、RESIDENT_COPY。

## Not done (deliberate)

- 目標圖入面嘅「共有席 4 → 5」數值框、走勢線、箭咀：renderer 仲未有前後數值（[change-explanation](change-explanation.md) 仍係 PLANNED），唔虛構數字。嗰個任務做嘅時候再加同一風格嘅數值框。

## Actual validation results

見 [VALIDATION](../VALIDATION.md) 「Explanation frame HUD」一段。

## Next expected step

Owner 睇 `artifacts/explanation-frame-hud/` 截圖驗收；接受後 merge 入 main。
