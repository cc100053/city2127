# iPad「住民の窓」文件同步

- Owner: Codex（產品決策 cc100053）
- Branch: `codex/ipad-hand-docs`
- Base: `e335768900a78b546a451ac7def71953896f4be1`
- 原手勢實作：`4df3e09302ac7e19a1bf469691ff16c0cfd8325b` 已喺 main。實機 build 為 `2bec2f77`，詳細證據見[手勢交接](hand-guest.md)。

## 2026-11-24 工作狀態

開工時本機 `main` 同 fetch 後嘅 `origin/main` 同指 base，divergence 0/0。主工作區原有三份未追蹤草稿，文件修改喺獨立 worktree 完成。

已同步三語 README、[survey 啟動](../../survey/README.md#ipad住民の窓與手勢操作)、[展覽規格](../EXHIBITION_SPEC.md#ipad住民の窓)、[實作地圖](../PROJECT.md#ipad-resident-window)、輪換規則及文案。單站、A/B、比例、相機後備同上望／交接以 main 實作為準。

## 驗證與剩餘工作

本次範圍為 Markdown。2026-11-24 核對 base 原始碼、42 個新增本機連結及錨點、完整差異同 `git diff --check`，均通過。CI 設定略過純 Markdown push。實機及瀏覽器紀錄沿用 2026-11-23 來源，今次無重新量測。雙站真機、展覽閱讀距離同長時間穩定性繼續跟 [驗收紀錄](../VALIDATION.md#ipad住民の窓實測與回歸)。

## 整合

文件 commit `99c5cd7e` 已推到 `origin/codex/ipad-hand-docs`。整合 commit `914233b486b400a616a32916e25f19b032df35c1` 重跑 42 個本機連結及錨點、來源事實同 `git diff --check`，均通過。之後只補本段整合紀錄。
