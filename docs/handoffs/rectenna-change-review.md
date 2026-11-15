# rectenna-change-review — 陸上農園變化總覽

- Owner：cc100053
- 分支：`codex/rectenna-change-review`
- 基準：`76ee28444628e0ee3eab146deabb922d395955ce`。從 `main` 開始，fetch 後與 `origin/main` 相差 0／0，保留本機 `Dev_QA.md`。
- 範圍：在[變化總覽](../../artifacts/change-review/index.html#rectenna-farm)的能源單位下展示已驗收的陸上農園，註明 Meter 觸發計法待調整。

採用[農園 R3](rectenna-farm-placement.md#r3--public-garden-entrance-2026-11-15) 的日景、夜景與西入口實景，由 `publish-evidence.mjs` 發布為 JPEG。三張圖均有圖說。生成器顯示獨立農園圖組，沿用原有 8 個單位與 14 組變化。沒有加入模擬佔比或把靜態實景標為正式投票前後對照。

本機 Chrome 以 `file:` 開啟總覽，三張圖均能解碼，三則圖說及待調整標示均存在。Root `npm test`（允許 scratch survey 使用 loopback）、`npm run build` 和 `git diff --check` 均通過。下一步另行修改觸發計法，屆時補上該規則的正式投票前後對照。
