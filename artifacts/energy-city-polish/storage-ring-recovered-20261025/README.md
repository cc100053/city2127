# Storage ring recovered batch — 2026-10-25

原生成 [target](target.png)／[prompt](target-prompt.txt)，沒有生成新目標。只續作富士環與原固定承托；水庭／能源島及所有外部source受protect.py逐byte保護。

| 輪次 | 狀態 | 實測 |
| --- | --- | --- |
| 1 | 恢復版驗收完成 | [review](pass1/review.md)、[DEV JSON](pass1/dev/browser.json)、[formal JSON](pass1/formal/browser.json)、原PNG／test/build logs／SHA256SUMS |
| 2 | 原候選驗收完成 | [review](pass2/review.md)、[DEV JSON](pass2/dev/browser.json)、[formal JSON](pass2/formal/browser.json)、原PNG／raw logs／SHA256SUMS |
| 3 | 未開始 | 第二輪通過且備份清理後才開fresh worker |

每輪source及當時runner均另存。DEV矩陣runner：`node artifacts/energy-city-polish/storage-ring-recovered-20261025/review.browser.mjs <新evidence目錄>`；正式runner沿用tests/energyE4.browser.mjs及VALIDATION的scratch設定。新舊失敗attempt分開保存。

每輪checksum只覆蓋其不再改動的證據。`checkpoints/`為本機持久backup（不加入Git避免bundle自我遞迴）；內有完整branch bundle、evidence tar.gz、commit及hash manifest。原recovery的base-only bundle不是本輪checkpoint。只本機，沒有push／部署／main整合。
