# question-rotation — SURVEY_V2 抽題輪換計劃

- Owner: cc100053
- Status: PLANNED（計劃文件已寫；階段 0 待 owner 決定，未改程式）
- Branch: `docs/question-rotation-plan`
- Base commit: `6724989bbff0ff8a0f65a9ee6e2a23f778e7ede3`（origin/main，2026-11-18）
- Last verified commit: 加入本檔的 commit（文件連結已核對）
- Remote availability: `origin/docs/question-rotation-plan`

## Session Git state

- Session starting branch and HEAD: main, `f40ffbc0e3e9b5a73da8f4a86fa75ff1190f2f09`；同日兩次 fast-forward 至 `100816b5`、`6724989b`
- Last fetched origin/main commit: `6724989b`，2026-11-18
- Local changes present at session start: 未追蹤 `Dev_QA.md`（owner 本機檔），保留
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

把 SURVEY_V2 的 9 題接入城市：每位訪客按城市狀態抽 4 題，每份提案直接換一個已打磨模型，結果卡顯示群眾比例。本任務第一步只交付計劃 [QUESTION_ROTATION_PLAN](../QUESTION_ROTATION_PLAN.md)（總表＋分階段步驟）；實作按該文件階段 0 決定後另行開展。

## In-scope files and dependencies

- `docs/QUESTION_ROTATION_PLAN.md`（新）、`docs/README.md`（索引一行）、本檔。
- 依賴：[question-pool](question-pool.md)（題庫）、[guest-agency](guest-agency.md)（G1／G2 現行規則）、各模型 handoff（bay-flower-receiver、pod-frame-tower、drawer-housing-placement、q02a-hydro-placement、rectenna-farm-placement、sw-event-shelf）。
- 未改：`src/`、`survey/`、題組 JSON、SPEC。

## Completed work

- 討論與 owner 決定（2026-11-18）：抽 4 題；一次換一個模型；直接換到所選模型；顯示群眾比例；不用「時間比例＝票數比例」。
- 玩具模擬 `~/city2127-evidence/question-rotation-sim/swap400.py`（400 次 × 120 位假訪客）：10 題時無變化約 1.5%，所有模型出場，最長等 15 位。非正式 ladder、非真人。
- 計劃文件：總表、退役資產、規則、六個階段的步驟及完成標準、風險。

## Actual validation results

- Verification status: PARTIAL（文件）
- Date and checked commit/worktree: 2026-11-18，本分支
- Commands/manual checks and results: 文件內相對連結及引用檔案路徑逐一核對存在；座標取自 `src/layout.ts`、`src/energyRuntime.ts`。未截圖核對位置。
- Evidence/environment: 模擬腳本見上

## Known issues and blockers

- 階段 0 的 owner 決定未做；SURVEY_V2_REVIEW R01–R03 仍空白。
- 蓮花受電仍為 draft，未選址。

## Next expected step

Owner 審閱計劃第 2 節總表及階段 0（0.1–0.4）。
