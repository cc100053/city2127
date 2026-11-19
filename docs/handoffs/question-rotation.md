# question-rotation — SURVEY_V2 抽題輪換計劃

- Owner: cc100053
- Status: 階段 0 計劃已合入 main；後續實作在 `feat/question-rotation`
- Branch: `docs/question-rotation-plan`
- Base commit: `6724989bbff0ff8a0f65a9ee6e2a23f778e7ede3`（origin/main，2026-11-18）
- Last verified commit: `7077b46d`（階段 0 決定；本次審閱補充的 commit 見 git log）
- Remote availability: `origin/docs/question-rotation-plan`、`origin/feat/question-rotation`

## Session Git state

- Session starting branch and HEAD: main, `f40ffbc0e3e9b5a73da8f4a86fa75ff1190f2f09`；同日兩次 fast-forward 至 `100816b5`、`6724989b`
- Last fetched origin/main commit: `6724989b`，2026-11-18
- Local changes present at session start: 未追蹤 `Dev_QA.md`（owner 本機檔），保留
- Upstream integration status: 計劃於 2026-11-19 由 `6f8afee8` 合入 main。輪換實作繼續在功能分支進行。
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

把 SURVEY_V2 的 9 題接入城市：每位訪客按城市狀態抽 4 題，每份提案直接換一個已打磨模型，結果卡顯示群眾比例。本任務第一步只交付計劃 [QUESTION_ROTATION_PLAN](../QUESTION_ROTATION_PLAN.md)（總表＋分階段步驟）；實作按該文件階段 0 決定後另行開展。

## In-scope files and dependencies

- `docs/QUESTION_ROTATION_PLAN.md`（新）、`docs/README.md`（索引一行）、本檔。
- 依賴：[question-pool](question-pool.md)（題庫）、[guest-agency](guest-agency.md)（G1／G2 現行規則）、各模型 handoff（bay-flower-receiver、pod-frame-tower、drawer-housing-placement、q02a-hydro-placement、rectenna-farm-placement、sw-event-shelf）。
- 已改文件：`docs/EXHIBITION_SPEC.md`（新「抽題輪換」一節）、`docs/planning-team/SURVEY_V2_REVIEW.md`（R01–R05）。
- 未改：`src/`、`survey/`、題組 JSON。

## Completed work

- 討論與 owner 決定（2026-11-18）：抽 4 題；一次換一個模型；直接換到所選模型；顯示群眾比例；不用「時間比例＝票數比例」。
- 玩具模擬 `~/city2127-evidence/question-rotation-sim/swap400.py`（400 次 × 120 位假訪客）：10 題時無變化約 1.5%，所有模型出場，最長等 15 位。非正式 ladder、非真人。
- 計劃文件：總表、退役資產、規則、六個階段的步驟及完成標準、風險。
- 2026-11-18 owner 批准階段 0 全部建議：SURVEY_V2_REVIEW R01–R05 決定記錄；EXHIBITION_SPEC 新增「抽題輪換」一節。
- 2026-11-18 advisor 審閱後（owner 同意寫入）：雙站重疊改在換模型時處理、平手按題目固定次序；無變化率對答案分佈敏感（`skew.py`：5 題時 1.6%／2.6%／6.1%／23.8%）；新舊系統按題組版本切換，第 2–3 階段完成標準加「version4 run 外觀不變」；每題 6 種有向過場；內容工作量補 Q02 空置態及 Q06 選址；敘事原則改變記錄並加 6.7 文件同步；群眾比例少人數門檻；R04 舊能源部件逐件未定。

## Actual validation results

- Verification status: PARTIAL（文件）
- Date and checked commit/worktree: 2026-11-18，本分支
- Commands/manual checks and results: 文件內相對連結及引用檔案路徑逐一核對存在；座標取自 `src/layout.ts`、`src/energyRuntime.ts`。未截圖核對位置。
- Evidence/environment: 模擬腳本見上；分佈敏感度 `~/city2127-evidence/question-rotation-sim/skew.py`

## Known issues and blockers

- 新 run 各題起始模型未定。
- 蓮花受電 R2 已驗收並放置，見 [交接](bay-flower-placement.md)。輪換接線屬後續實作。
- 待 owner：舊能源部件逐件去留；群眾比例少人數門檻（建議 10 票）；Q02 離場模型的變化是否播出。
- 未核實：`buildTransition.ts` 是否處理過 −1↔+1 直接跳。
- 審閱第 G 點（城市端預載需收到每次預約抽中的題目，加入 protocol）未寫入計劃。

## Next expected step

接續 `feat/question-rotation` 上的實作及該分支的交接。
