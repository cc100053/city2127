# meter-scale-journey — Meter 刻度比較工具與「一票旅程」原型

- Owner: cc100053（實作：Claude Code）
- Status: DONE — 原型已合併 main（`3c78210`）；刻度 A 正式採用見 [meter-scale-a](meter-scale-a.md)，旅程接入 live 見 [vote-journey](vote-journey.md)；舊刻度比較已按 owner 要求移除
- Branch: `feat/meter-scale-journey`
- Base commit: `a88808221d79e08de784d3b02669bff274cbddf2`
- Last verified commit: `01c4fa53867800256f62be310ece513b3e3f2814`（驗證時係未提交 worktree，內容同呢個 commit 一樣；之後只改咗呢份 handoff）
- Remote availability: `origin/feat/meter-scale-journey` @ `01c4fa53867800256f62be310ece513b3e3f2814`（之後有 handoff-only commit）
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `main` @ `a88808221d79e08de784d3b02669bff274cbddf2`
- Last fetched origin/main commit: `a88808221d79e08de784d3b02669bff274cbddf2`（2026-10-13 fetch 成功，main 與 origin/main 無分歧）
- Local changes present at session start: 只有未追蹤嘅 `.playwright-cli/`（console logs，與本任務無關，保留不提交）
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

背景（2026-10-13 與 owner 討論）：用規格公式模擬，`M = 6(S/n + R)` 令城市大部分時間停留喺 mixed 附近（意見平均時約 84%），low/high 設計好少出現，每票通常只改一個 ±1 count。Owner 要求：

1. **刻度比較工具**：用同一組 seeded 模擬投票，喺城市入面即時切換「現行 ×1」與「刻度 A ×2.4」，用眼比較。
2. **一票旅程原型**：觀眾四票化成光點，由畫面右下（站台方向）飛去四個 focal site，著陸時有掃描環，之後留低成為城市上空嘅光點（夜晚更亮）。

完成條件：只喺 DEV `?scaleLab` 出現；server 權威算法、production build、survey／Guest 流程不變；有可重跑嘅 test。

## In-scope files and dependencies

- 新增：`src/scaleLab.ts`（純邏輯：seeded 投票、經 server reducer replay、刻度、統計）、`src/devScaleLab.ts`（DEV 面板及播放）、`src/voteJourney.ts`（旅程視覺）、`tests/scaleLab.test.ts`。
- 修改：`src/main.ts`（DEV-only 參數及每幀 hook）、`src/style.css`（面板／站號標籤）、`package.json`（test script）、`survey/src/survey/scoreEngine.ts` 新增純函數 `foldSlotSeeds`，`survey/src/server/runStore.ts` 改用它（行為不變，令 lab 與 server 用同一個 seed hash）。
- 重用：`applyProposalVotes`、`deriveExhibitionLayout`、`CityChangeManager.applyExhibitionLayout`、`METER_COLORS`、`changeSites`。冇新 dependency。
- 明確不做：自動 reset（owner 2026-10-13 決定不做）；回顧章節（需再討論）；改規格公式；接入 live survey。

## Completed work

- `?scaleLab` 參數：`&profile=balanced|leaning|strong|groups`、`&guests=`、`&seed=`、`&scale=a`、`&journey`。只喺 `import.meta.env.DEV` 生效，而且同 `?survey` 互斥；production bundle 冇 lab chunk（已核對 `dist/assets`）。
- 面板：刻度切換（同一位觀眾即時 snapshot，對比用）、觀眾傾向／人數／seed／每位秒數、播放／逐位／拖動、四條 Meter 曲線（虛線 = ±3 門檻，跟住目前刻度）、現行與 A 嘅形態讀數、整段序列形態佔比／切換次數／端口級數。快捷鍵：S 切刻度、Space 播放、←/→ 逐位。`window.scaleLab` 提供 `jump`／`setGain`／`journey` 方便截圖。
- 刻度 A 實作為分數 ×2.4 後 clamp，再交給原本 `deriveExhibitionLayout`：門檻相當於 ±1.25，±5 之外數量用盡。×1 與 server layout 完全相同（有 test）。
- 一票旅程：四粒 HDR 光點（Meter 色；中性票暖白）沿弧線飛 2.2 秒（每粒相隔 0.14 秒），著陸時掃描環由地面升起 1.4 秒；開啟旅程時，城市 layout 喺全部著陸（約 2.6 秒）後先套用，接住係原有 3 秒過渡同 pulse。每票留低一粒光點，浮喺 site 上空 42–64m（地面高度會被樹及建築遮住，已試過）；日間淡，夜間亮（bloom）。右下顯示「送信 · 暮らしの声 #n」標籤。
- 全部係 additive、unlit，唔改共用材質；三組 effect mesh 命名為 `meter-pulse`，所以 GTAO prepass 會略過。

## Actual validation results

- Verification status: PASSED（軟件同 DEV 視覺截圖）；owner 視覺評審 NOT RUN
- Date and checked commit/worktree: 2026-10-13，`feat/meter-scale-journey` 基於 `a888082` 加上述未提交改動（即 task commit 內容）
- Commands/manual checks and results:
  - Root `npm test` PASS（包括新增 `tests/scaleLab.test.ts`）；`npm run build` PASS（只有原有 chunk size 警告）；`git diff --check` PASS。
  - `survey/` `npm test` PASS、`npm run build` PASS（因為改咗 `scoreEngine.ts`／`runStore.ts`）。
  - Production `dist/assets` 冇 `devScaleLab` chunk（改用 `import.meta.env.DEV&&scaleLab` 守住 import 之後）。
  - 開發 Mac 用 headless Chrome（playwright-core，1280×720，DPR1），`?scaleLab&reviewTime=100`，`hour=16`／`21`：旅程飛行 0.9 秒／1.8 秒、掃描 2.8 秒、#40 現行對 A、120 位觀眾夜景光點。唯一 console error 係已知 favicon 404。
- Evidence/environment: [飛行](../../artifacts/meter-scale-journey/journey-1-flight.jpg)、[接近](../../artifacts/meter-scale-journey/journey-2-approach.jpg)、[掃描](../../artifacts/meter-scale-journey/journey-3-scan.jpg)、[#40 現行](../../artifacts/meter-scale-journey/scale-current-40.jpg)、[#40 刻度 A](../../artifacts/meter-scale-journey/scale-a-40.jpg)、[夜景光點](../../artifacts/meter-scale-journey/lanterns-night-120.jpg)。平均傾向、seed 1、60 位觀眾：形態切換次數現行 42 對 A 94，端口級數 4/7 對 7/7（面板統計）。
- Integrated commit and checks: NOT INTEGRATED（原型等待評審，未合併 main）
- Changes since verification: 只有本 handoff 及文件更新

## Known issues and blockers

- 冇做 FPS 量度；冇喺展覽機或者 1920×1080 試過。
- 截圖用凍結時鐘；連續動作只喺 in-app browser 睇過，而且 pane 隱藏時唔會 render，所以冇錄片。
- 掃描環會被高樓遮住一部分；光點浮喺 site 上空，有啲似彩紙，係咪要改成貼住屋頂或者窗燈，待評審。
- 旅程只喺 lab 入面播；未接 live survey 事件（接入會令權威 layout 遲大約 2.6 秒先套用，要先決定可唔可以接受）。
- 刻度 A 只係 lab 對照；server、規格、Guest 結果文案全部未改。觀眾有傾向時，A 會令城市更容易黐住一邊（模擬：high 由 62% 升到約 85%）。

## Important decisions

- 2026-10-13 owner：開 branch 做刻度比較工具及一票旅程原型；**不做自動 reset**；回顧章節需要再討論。
- 刻度 A 用 gain ×2.4 重用 `deriveExhibitionLayout`，唔另寫一套 mapping，方便日後真係採用時只改一處。
- 原型保持 DEV-only，唔影響現行展覽行為；任何採用都要先改 EXHIBITION_SPEC。

## Next expected step

cc100053 喺本機開 `npm run dev -- --port 5173`，打開 `http://127.0.0.1:5173/?scaleLab&journey`，用 S 鍵比較刻度、播放旅程，然後決定：(1) 採唔採用刻度 A（或者其他 gain）；(2) 旅程視覺方向（光點大小、飛行路線、光點位置）；(3) 係咪接入 live survey。決定之後先改規格同 server。
