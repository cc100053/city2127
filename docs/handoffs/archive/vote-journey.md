# vote-journey — 一票旅程接入 live 展示

- Owner: cc100053（實作：Claude Code）
- Status: DONE — 已合併 main `e83deaf`，main CI PASS
- Branch: `feat/vote-journey`
- Base commit: `8566c10`（main，已包含 [刻度 A](meter-scale-a.md)）
- Last verified commit: 驗證時係未提交 worktree，內容即本分支第一個 commit
- Remote availability: `origin/feat/vote-journey`（push 後）
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `main` @ `8566c10`
- Last fetched origin/main commit: `8566c10`（2026-10-13）
- Local changes present at session start: 只有未追蹤嘅 `.playwright-cli/`（與任務無關，保留）
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

2026-10-13 owner：「do 一票旅程」，「no need 比較舊刻度」。完成條件：真實 survey 結果喺大屏幕播旅程；結果卡證據、10 秒閱讀時段、A/B 排程不變；snapshot／reset／Undo／reconnect／reduced motion 即時恢復；DEV lab 移除舊刻度比較。

## In-scope files and dependencies

- `src/voteJourney.ts`：由原型改為正式模組。移除站號標籤（大屏幕結果卡已經顯示「暮らしの声 #n」）；光點改為「每位觀眾固定四格」，保留最近 64 位，同 `recentProposals` 一致。
- `src/main.ts`：v2 `city-state-updated` 有 `latestProposal` 而且冇 reduced motion 嗰陣，播旅程，然後用 `now + ARRIVAL_SECONDS` 呼叫 `applyExhibitionLayout`；其他情況就 `setLanterns(recentProposals)`，即時套用。
- `src/cityChangeManager.ts`：site marker 喺排定時間之前唔閃（age ≥ 0 guard）。
- `src/scaleLab.ts`、`src/devScaleLab.ts`、`tests/scaleLab.test.ts`：移除舊刻度比較；lab 用同 live 一樣嘅旅程時序。
- `tests/voteJourney.test.ts`（新）：旅程加過渡唔可以超過閱讀時段減 4 秒；光點位置固定、喺自己 site 上空。
- `src/style.css`：移除標籤及刻度按鈕 CSS。
- 文件：EXHIBITION_SPEC、PROJECT、AGENTS（live 時序規則）、VALIDATION、handoff index。

## Completed work

- 時序：0–2.6 秒光點飛行（四粒相隔 0.14 秒），著陸時掃描環 1.4 秒；2.6–5.6 秒原有 3 秒過渡加 pulse 光柱；理由句照舊喺第 3 秒顯示；10 秒閱讀時段、handoff、lease 全部唔改。
- 關鍵做法：layout 喺收到事件時已經套用（所以結果卡嘅 carrier 證據同位置即時正確），只係將 transition 開始時間設為將來。motion、district、pulse 本身已經會處理未開始嘅時間，只有 site marker 要加一個 guard。
- 光點：浮喺 focal site 上空 42–64m，日間淡、夜間亮；第 65 位觀眾會取代第 1 位嘅光點，所以 live 累積同 reload 之後一致。

## Actual validation results

- Verification status: PASSED（軟件及 live 瀏覽器截圖）
- Date and checked commit/worktree: 2026-10-13，`feat/vote-journey` 基於 `8566c10` 加本分支改動
- Commands/manual checks and results: root `npm test`（包括新嘅 `voteJourney.test.ts`、`scaleLab.test.ts` 同真實 Meter pipeline）PASS；`npm run build` PASS，production bundle 冇 lab chunk；`survey/` `npm test`、`npm run build` PASS；`git diff --check` PASS。
- Live 檢查：`survey` `npm run dev:auto`（scratch SQLite，port 8788）加 Vite 5173，headless Chrome 1280×720 DPR1，`?survey=ws://127.0.0.1:8788/ws&hour=16`；經 HTTP 提交一份真實提案（autonomous／private-pods／canopy-cooling／mixed-functions）。0.9 秒：光點由右下飛出，結果卡顯示「暮らしの声 #1」；2.0 秒：接近 site；3.6 秒：pulse 光柱及掃描環出現，城市開始過渡，結果句「…自律サービスの端口が増えました。」（carrier 證據正確）；之後 reload 去 `hour=21`，snapshot 重建咗光點。唯一 console error 係已知 favicon 404。
- Evidence/environment: [飛行](../../../artifacts/vote-journey/live-1-flight.jpg)、[著陸](../../../artifacts/vote-journey/live-2-landing.jpg)、[過渡](../../../artifacts/vote-journey/live-3-transition.jpg)、[理由](../../../artifacts/vote-journey/live-4-reason.jpg)、[reload 夜景](../../../artifacts/vote-journey/reload-night-lanterns.jpg)。
- Integrated commit and checks: main `e83deaf`；merge result root／survey test、root build、`git diff --check` PASS；[main CI 38332403031](https://github.com/cc100053/city2127/actions/runs/38332403031) success
- Changes since verification: 只有本 handoff

## Known issues and blockers

- 冇跑 A/B 雙站同 resident P2–P4 瀏覽器回歸；A/B 結果相隔最少 10 秒，而旅程加過渡大約 5.6 秒，理論上唔會重疊，但未實測。
- 冇量 FPS，冇喺展覽機或者 1920×1080 試過；日間光點喺明亮背景下偏細，實機距離要再睇。
- 晚到嘅結果（剩餘時段較短）都會播完整旅程；下一份結果會取消上一份未完成嘅飛行。
- 光點只保留最近 64 位觀眾。

## Important decisions

- 2026-10-13 owner：做一票旅程；唔再需要舊刻度比較。
- 唔顯示獨立站號標籤，避免同結果卡重複。
- 理由句維持第 3 秒顯示，冇為咗等過渡完成而縮短閱讀時間。

## Next expected step

已合併。下一步：喺展覽機睇光點大小同 FPS；回顧章節待討論。
