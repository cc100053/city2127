# question-rotation — SURVEY_V2 抽題輪換計劃

- Owner: cc100053
- Status: IN_PROGRESS（階段 1 survey 端完成：9 題可選用接入；城市端顯示（階段 2）未做）
- Branch: `feat/question-rotation`（2026-11-18 由 `docs/question-rotation-plan` HEAD `95c494ff` 開出；計劃文件 commit 一併帶入）
- Base commit: `6724989bbff0ff8a0f65a9ee6e2a23f778e7ede3`（origin/main，2026-11-18）
- Last verified commit: 見 git log（2026-11-18 survey 接線 commit）
- Remote availability: `origin/docs/question-rotation-plan`（計劃）；`origin/feat/question-rotation`（實作）

## Session Git state

- Session starting branch and HEAD（2026-11-18 第二節）：`docs/question-rotation-plan`，`95c494ff`，與 origin 同步；開出 `feat/question-rotation`
- Last fetched origin/main commit: `6724989b`，2026-11-18（分支包含之）
- Local changes present at session start: 未追蹤 `Dev_QA.md`（owner 本機檔），保留
- Upstream integration status: NOT INTEGRATED（已 push 分支，未 merge main；分支 CI 未確認）
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

把 SURVEY_V2 的 9 題接入城市：每位訪客按城市狀態抽 4 題，每份提案直接換一個已打磨模型，結果卡顯示群眾比例。本任務第一步只交付計劃 [QUESTION_ROTATION_PLAN](../QUESTION_ROTATION_PLAN.md)（總表＋分階段步驟）；實作按該文件階段 0 決定後另行開展。

## In-scope files and dependencies

- `docs/QUESTION_ROTATION_PLAN.md`（新）、`docs/README.md`（索引一行）、本檔。
- 依賴：[question-pool](question-pool.md)（題庫）、[guest-agency](guest-agency.md)（G1／G2 現行規則）、各模型 handoff（bay-flower-receiver、pod-frame-tower、drawer-housing-placement、q02a-hydro-placement、rectenna-farm-placement、sw-event-shelf）。
- 已改文件：`docs/EXHIBITION_SPEC.md`（新「抽題輪換」一節）、`docs/planning-team/SURVEY_V2_REVIEW.md`（R01–R05）。
- 階段 1 切片一（2026-11-18）：`survey/src/shared/rotation.ts`（新）、`survey/src/survey/questionLoader.ts`（`parseRotationSet`／`loadRotationSetFile`）、`survey/src/survey/questions.rotation.v1.json`（新，draft）、`survey/tests/rotation.test.ts`（新）、`survey/scripts/rotationSim.ts`（新）、`survey/package.json`（`test:rotation` 接入 `npm test`）。
- 未改：root `src/`、現行 version4 題組、`ladderStep`、server、資料庫。

## Completed work

- 討論與 owner 決定（2026-11-18）：抽 4 題；一次換一個模型；直接換到所選模型；顯示群眾比例；不用「時間比例＝票數比例」。
- 玩具模擬 `~/city2127-evidence/question-rotation-sim/swap400.py`（400 次 × 120 位假訪客）：10 題時無變化約 1.5%，所有模型出場，最長等 15 位。非正式 ladder、非真人。
- 計劃文件：總表、退役資產、規則、六個階段的步驟及完成標準、風險。
- 2026-11-18 owner 批准階段 0 全部建議：SURVEY_V2_REVIEW R01–R05 決定記錄；EXHIBITION_SPEC 新增「抽題輪換」一節。
- 2026-11-18 advisor 審閱後（owner 同意寫入）：雙站重疊改在換模型時處理、平手按題目固定次序；無變化率對答案分佈敏感（`skew.py`：5 題時 1.6%／2.6%／6.1%／23.8%）；新舊系統按題組版本切換，第 2–3 階段完成標準加「version4 run 外觀不變」；每題 6 種有向過場；內容工作量補 Q02 空置態及 Q06 選址；敘事原則改變記錄並加 6.7 文件同步；群眾比例少人數門檻；R04 舊能源部件逐件未定。

- 2026-11-18 階段 1 切片一（純函數，未接 server）：
  - 1.1 題組格式：`kind: "rotation"`，每題三選項各帶 `modelId`／`lotId`（未建或未選址為 null），`online` 旗標（上線須全部非 null），`initial` 起始選項；模型 ID 全組唯一。`questions.rotation.v1.json` 9 題，題目文字暫用 SURVEY_V2 P 版（`draft: true`，待 5.1）；只有 Q01 `online`；起始選項為暫定（Q01 B、Q02 A、Q03 A、Q06 B、Q08 C、其餘 A），待 owner。地塊 ID 暫用 `nw`、`sw`、`drawer-housing`、`q02-west-sea`、`q02-farm-south`，第 2.1 步 `LOTS` 定案時對齊；Q01 模型 ID `automation-hub-low／mixed／high` 是邏輯名稱（對應現行 NW focal 三態，非 GLB 檔名），第 2.2 步對齊。
  - 1.2 `drawQuestions`：只抽 online 題，最久未變優先、平手按題組次序；少於 5 題 online 時拋 `RotationError`（現時真題組因此不能上線，屬預期）。
  - 1.3 `rotationStep`：直接換（包括 A↔C），每份只換一題；無候選回傳 `fallback` 並指出最久未變的抽中題。**發現：** 3.2 第 3 點「優先略過預約後已被另一站換過的題」由最久未變排序自動成立（預約後被換的題 stamp 必然新過所有未被換的題），所以不需要儲存預約標記；測試覆蓋兩站同時預約的情況。
  - 1.4（純函數部分）`foldRotation`：按 stamp（提案 sequence）依次重算；Undo＝去掉該提案再 fold，測試覆蓋。
  - 1.5（純函數部分）`crowdShare`：計入所有有效提案的四個答案（含本人）；總數未達 `CROWD_SHARE_MIN_VOTES`（暫定 10，待 owner）時不給百分比。
  - 1.7 模擬 gate：見下。

- 2026-11-18 owner 指示「把現有 9 題接入，模型完成後再補空位」，survey 端接線（階段 1.4–1.6、1.8）：
  - 決定：9 題全部 `online`（含 Q04），取代 5 題門檻及 Q04 暫不上台；已記入 SPEC 及計劃。題目文字仍是 SURVEY_V2 P 版 draft。
  - 選用：`SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json`；預設仍是 version4。`.claude/launch.json`（本機、git-ignore）加了 `survey-rotation`（scratch DB，port 8789）。
  - 資料：沿用 algorithm 2 提案管線；輪換提案存中性四軸票（Meter 不動），答案存 `answers_json`，抽中題存 `proposal_sessions.question_ids_json`；schema 9 只加 `question_kind`（'axes'／'rotation'）。一個 run 不混兩種；換題組要在 Admin 重設城市，否則 `lifecycle_blocked`。
  - 計算：`rotationRun.ts` 以 `sequence` 為 stamp fold 有效提案；`ProposalRecord.rotation`（outcome＋四個群眾比例）、`ExhibitionCityView.rotation`（每題顯示選項及最後變化）。
  - Root：`surveyView.ts` 接受並驗證上述欄位，城市暫不畫（結果卡回退為「回答を記録しました。」）。
  - Guest：交接頁以「住民の声」取代 Meter 傾向面板；結果晶片改用選項文字。文案（少人數句、保底句）為計劃 3.3／3.4 暫定句。
  - 未做：預約事件帶抽中題（預載用，待有模型）；dev-auto 自動作答面板未針對輪換題調整。

## Actual validation results

- Verification status: PARTIAL（survey 端接線完成並測試；城市端未畫、iPad／A/B 實機未測）
- Date and checked commit/worktree: 2026-11-18，`feat/question-rotation`
- Commands/manual checks and results: 文件內相對連結及引用檔案路徑逐一核對存在；座標取自 `src/layout.ts`、`src/energyRuntime.ts`。未截圖核對位置。VALIDATION 已加階段 1 一條記錄。
- `survey/`：`npm test`（含 `test:rotation`：rotation、rotationFlow、模擬）通過、`npm run build` 通過；root `npm test`（含新 `rotationPipeline`）、`npm run build` 通過；`git diff --check` 通過。內置瀏覽器走一次 guest 輪換流程，console 無錯誤。
- 模擬 9 題（上線配置，gate ≤ 2%）：原設定 1.5%，389/400 run 全部模型出場；70/20/10＋傾向 2.7%；70/20/10 無傾向 6.0%；85/10/5 23.5%（202/400 全出場）。
- 正式模擬 `survey/scripts/rotationSim.ts`（正式函數，400 run × 120 假訪客，A／B 兩站同城預約後先後提交，起始選項每 run 隨機）：

  | 分佈 | 5 題無變化 | 5 題模型出場（全出場 run） | 10 題無變化 | 10 題模型出場（全出場 run） |
  | --- | --- | --- | --- | --- |
  | 原設定＋四成個人傾向 | 1.6% | 100.0%（400/400） | 1.5% | 99.9%（388/400） |
  | 70/20/10＋四成傾向 | 2.6% | 100.0%（400/400） | 2.7% | 99.8%（380/400） |
  | 70/20/10，無傾向 | 5.9% | 99.9%（392/400） | 5.9% | 98.9%（282/400） |
  | 85/10/5，無傾向 | 23.4% | 99.5%（367/400） | 23.1% | 96.8%（137/400） |

  另以 seed 1、7、424242 各跑一次（不入 CI）：5 題原設定無變化 1.4%–1.6%，三次都 400/400 全出場；10 題 385–391/400。
  Gate 只卡上線配置（5 題、原設定）：無變化 ≤ 2% 且每 run 每個模型都出場，通過。**此 gate 範圍屬暫定**（計劃原文未分題數），待 owner 確認。10 題時約 3% run 有一個模型全日未出場；答案越一致越多。交 owner 判斷保底份量及是否接受 10 題時的出場缺口。
- Evidence/environment: 玩具模擬 `~/city2127-evidence/question-rotation-sim/`；正式模擬見上，非真人答案。

## Known issues and blockers

- 新 run 各題起始模型未定（題組現填暫定值）。
- 模擬：10 題時少數 run 有模型全日未出場（見上表），gate 未卡此配置。
- 1.7 未以 version4 真人答案分佈重跑（未檢查本機 SQLite 是否有真人資料）。
- 蓮花受電仍為 draft，未選址。
- 待 owner：舊能源部件逐件去留；群眾比例少人數門檻（建議 10 票）；Q02 離場模型的變化是否播出。
- 未核實：`buildTransition.ts` 是否處理過 −1↔+1 直接跳。
- 審閱第 G 點（城市端預載需收到每次預約抽中的題目，加入 protocol）已列入下一步第 3 點。

## Next expected step

**現時：** 階段 2 城市端（`lotRuntime` 按 `view.rotation.shown` 顯示模型，Q01 先接 AUTO HUB 三態）；或 owner 決定把輪換設為預設並開新 run（要同步 AGENTS.md／SPEC 敘事原則，計劃 6.7）。階段 4 內容製作可並行。


（已完成，保留作紀錄）階段 1 切片二：server 接線。先讀 `survey/src/server/runStore.ts`（`runProposalLadder` fold 位置）、`context.ts`、`sessionService.ts`、`answerService.ts`、`migrations.ts`、`protocol.ts`、`twoStations.test.ts`，然後：
1. 1.6 schema 9：草稿保存抽中題目 ID（預約時 `drawQuestions`）；提案保存 drawn 題目及答案；新增可空欄位，保留 schema 8 歷史。提交時驗證答題 ID 等於草稿的抽中題（`rotationStep` 已檢查）。
2. 1.4 run 按題組 `kind` 分流：rotation run 用 `foldRotation`，version4 run 照舊 `ladderStep`；新增 `CityView` 變體而非擴闊 `ExhibitionCityView`（root `src/` 亦 import），改後要跑 root `npm test`／build。
3. 1.5 protocol：結果事件帶 `RotationOutcome` 與 `crowdShare`；預約事件帶抽中題目 ID，供城市端預載（審閱第 G 點）。
4. 之後才做 1.8 guest 介面。rotation 題組不可成為 server 預設，直至 5 題 online。
可與階段 4 內容製作（蓮花受電驗收及選址、Q08／Q06／Q03 新模型）並行。
