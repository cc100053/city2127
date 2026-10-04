# city-readability — 結果卡位置、site 光柱、夜間標語

- Owner: cc100053（實作：Claude Code session）
- Status: DONE
- Branch: `fix/city-readability`
- Base commit: `b6ce499` (main, 2026-10-04, fetch 0/0, clean)
- Last verified commit: 本分支 commit 前工作樹；CI／整合結果見 Git 歷史及發布回覆
- Remote availability: `origin/fix/city-readability`，`--no-ff` 整合入 `main`

## Goal

項目檢討 A 組 1–3：觀眾睇到嘅三個可讀性問題，唔使硬件。

1. 夜間開場標語喺城市上冇對比（只影響 standalone，`?survey` 隱藏 intro）→ 夜間沿用 footer 嘅深色 halo。
2. 360px 結果卡喺左邊，1280×720 時遮住デックス西（投影約 (336,436)，卡範圍 x 44–404）→ 移去右上。以 `heroCamera` 投影四個 site：1280×720、1920×1080、3840×2160 全部喺 `viewport − 404` 左邊。
3. 一次 live 變化喺所有 changed slots 出光柱，0→5 四軸時有幾十條 → 只有 `sitePulse`（`focus`）出光柱同亮光圈，district slots 只留淡光圈（0.8 vs 2.2）。Pulse 數量／時間／snapshot 規則不變。

## Validation

- Root `npm test` PASS（含 P5 pulses）、`npm run build` PASS（既有 >500 kB warning）、`git diff --check` PASS。
- `tests/residentP3.browser.mjs` PASS（Chrome 1280×720，hour16，ordered reading 10,017 ms），證據喺 `artifacts/readability/`；另有 1920×1080 pulse 前後及夜間 intro 截圖，已目視檢查。
- 冇 FPS／iPad／4 米閱讀聲稱；site 光柱日間係咪夠顯眼要喺 P5 真屏幕再睇。

## Next

冇。光柱亮度（`p.focus ? .5`）及卡位置喺 P5 現場可再調。
