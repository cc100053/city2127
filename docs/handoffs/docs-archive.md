# docs-archive — 展覽文件整理

- Owner: Codex；產品決策 owner：cc100053
- Branch: `codex/docs-archive`
- Base commit: `eba73c60e53f0d9cae88d87e1c5d1c6c009b2518`
- Status: 整理完成，PR 待 review

## 起始狀態

2026-11-24 核對時本機 main 為 `e3357689`，落後 fetched origin/main 3 個 commit。從已 fetch 嘅 `eba73c60` 開獨立 worktree，開始時同 origin/main 無 divergence。原本三份未追蹤本機草稿留喺原工作區。原工作區草稿內容未加入公開 PR。

## 整理範圍

現行入口集中講九題輪換、iPad／A/B、現場驗收同製作進度。舊四題、場地同計劃快照見 [歷史文件](../history/README.md)，已完成或被取代嘅任務見 [交接歸檔](archive/README.md)。輪換同人物情景保留生成器所需嘅章節及表格。展覽運行設定與表單行為沿用原本實作。城市分頁使用正式作品名稱。

## 已驗證

驗證日期 2026-11-24，共用 root 依賴及 survey lockfile 安裝依賴，Node 26。本 PR 提交前嘅工作樹通過 root／survey `npm test` 同 `npm run build`，以及 `git diff --check`。由生成器重建變化總覽，核對 27 個選項、41 個超連結及 48 個圖像路徑，沿用既有截圖。核對修改過嘅 Markdown 嘅本機連結及錨點。正式 build 嘅 HTML 顯示新分頁標題。本輪未重新驗證 iPad、展場實機或瀏覽器互動。

## PR 審閱跟進（2026-11-24）

- 變化總覽導言及「其他資產」說明改回書面語（owner 2026-11-13 規則），由生成器重建。
- QUESTION_ROTATION_PLAN 加註：程式註解所引的舊章節編號以 2026-11-24 快照為準。
- 交接歸檔索引為六份狀態未標完成的交接註明取代來源。
- 驗證：root `npm test`、`npm run build`、`git diff --check`，以及全 repo Markdown 連結與錨點檢查。

## 接續

由 PR 審閱本次整理。展場技術驗收仍見 [VALIDATION](../VALIDATION.md#ipad住民の窓實測與回歸)。
