# question-rotation — SURVEY_V2 抽題輪換計劃

- Owner: cc100053
- Status: IN_PROGRESS（階段 1 survey 端完成：9 題可選用接入；階段 2 城市端只接 Q01）
- Branch: `feat/question-rotation`（2026-11-18 由 `docs/question-rotation-plan` HEAD `95c494ff` 開出；計劃文件 commit 一併帶入）
- Base commit: `6724989bbff0ff8a0f65a9ee6e2a23f778e7ede3`（origin/main，2026-11-18）
- Last verified commit: 2.6 結果卡群眾比例 commit，見 Git log `feat(city): crowd share on the rotation result card`（之前 `c63a316a` 為投票旅程方案 A；之前 `0f80be71` 為 A→C 鏡頭修正；之前 `9c72c82a` 為階段 2 Q01；實時截圖在其未 commit 工作樹拍，sidecar 記 `e317b593` dirty；`?meters` 截圖在 `9c72c82a` 乾淨樹拍）
- Remote availability: `origin/docs/question-rotation-plan`（計劃）；`origin/feat/question-rotation`（實作）

## Session Git state

- Session starting branch and HEAD（2026-11-18 第四節，2.6 結果卡群眾比例）：`feat/question-rotation`，`c63a316a`，與 origin 同步；`origin/main` 仍為 `6724989b`（分支包含之）；未追蹤 `Dev_QA.md` 保留
- Session starting branch and HEAD（2026-11-18 第三節，階段 2 Q01）：`feat/question-rotation`，`e317b593`，與 origin 同步，`origin/main` 無新 commit（分支領先 7）；未追蹤 `Dev_QA.md` 保留
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
- 未改：現行 version4 題組、`ladderStep`、server、資料庫。
- 階段 2 Q01（2026-11-18）：`src/rotationLayout.ts`（新）、`src/main.ts`、`src/surveyAtmosphere.ts`、`tests/rotationLayout.test.ts`（新，接入 root `npm test`）、`tests/rotationPipeline.test.ts`、`tests/automationHub.test.ts`。

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
  - Admin 現況及 `/api/health` 在輪換 run 報告輪換題組版本及 9 題。
  - 城市實測：root `?survey=ws://127.0.0.1:8789/ws` 連 `survey-rotation`，送一份提案：無 console 錯誤，結果卡為通用句（「思いは記録され、見えている施設の構成は維持されました。」），沒有原始選項 ID；城市不變（含 Q01）。
  - 資料庫：開啟後升級為 schema 9；未 merge 前 `main` 的 server 會拒絕此 DB。
  - 未做：預約事件帶抽中題（預載用，待有模型）；dev-auto 自動作答面板未針對輪換題調整；guest 重新載入及 A／B 未在瀏覽器測（只有 service 測試）。

- 2026-11-18 階段 2 城市端，只接 Q01：
  - 做法：輪換提案的四軸票為中性，server 的 Meter layout 不動。新 `rotationLayout(view)` 在有 `view.rotation` 時把 NW 設為 Q01 顯示選項的階（A −1、B 0、C +1；band 及端口取自 `ladderLayout`，與 version4 ±1 外觀相同）；無 `rotation`（version4）時回傳 server 的同一個 layout 物件。`main.ts` 展覽分支（實時、snapshot、重設、Undo、reduced motion）及環境卡改讀它，因此 Q01 換模型沿用現行 NW focal 流程：投票旅程 → `nw:focal`／`nw:focal-low` 近鏡 → 3 秒過場 → 結果卡。結果卡證據比對仍用 server 原 layout（兩邊皆中性），不受影響。
  - 結果卡：`residentResult` 遇 Q01 換時，NW 前後狀態取自 outcome（`from`／`to`），偏好句沿用 version4 服務三句（A `human-led`、B `human-machine`、C `autonomous`）；效果句沿用 NW 近鏡句（端口增加／窗口增加）。其他題換及保底照舊：結果卡為「思いは記録され、見えている施設の構成は維持されました。」，城市不變。
  - 直接跳：A↔C 不經 `buildTransition.ts`，而是 `siteBuilders/automationHub.ts` 的 `retarget`：舊 band 部件降、新 band 部件升，同一個 3 秒內完成，途中 mixed 部件全程為 0（新測試）。結果後 6.5 秒的截圖（A→C、C→A 皆然）：+1 塔身從低層大廳的圓形頂篷中穿出，兩者同時可見。是否接受屬 owner 視覺判斷。
  - 鏡頭：原本 A→C 與 C→A 都用 `nw:focal-low`（任何一端為 low 即用 low 鏡），A→C 落定時 +1 塔頂超出畫面上緣（`meters-A-to-C-10_5s.png`）。owner 同意修正（2026-11-18，`0f80be71`）：`cityChangeManager` 的 `low` 旗標改為「終點為 low，或由 low 轉 mixed」，所以 low→high 直接跳用 `nw:focal`。version4 每份提案只移一階，不會一步由 low 到 high，鏡頭選擇不變。修正後 A→C 塔身完整入鏡，C→A 仍用 low 鏡（`focal-*.png`、`focal-sheet.jpg`）。
  - 投票旅程（owner 2026-11-18 選方案 A，已做）：輪換 run 不再飛四軸光點。`VoteJourney.playRotation` 讓結果題（outcome 的題目）飛一個大光點（獨立 `Points`，尺寸 64，version4 為 38）到該題地塊，沿用掃描環落地；換模型用該地塊軸的 Meter 色（Q01 → NW，automation 藍），保底為中性色（`#fff1d6`），落地但城市不變。其餘三個答案為中性小光點，飛向「住民の声」看板方向，前半段全亮，到頂點時暗至零，不落地、不留燈籠，代表加入群眾比例。題目與地塊的對應為 `ROTATION_SITE_AXIS`（現只有 `Q01: 'automation'`），日後每接一題加一行；沒有地塊的題（現時其餘 8 題）四個光點都只淡出，沒有掃描環。起點、`ORB_STAGGER`、`FLIGHT_SECONDS`、`ARRIVAL_SECONDS` 及之後的近鏡時間軸不變（大光點仍於 2.2 秒落地）。
  - 燈籠：輪換 run 每份提案一盞，只放在結果題的地塊上（Q01 → NW 光環）；換模型為 Meter 色、原尺寸，保底為中性色、0.7 倍（與 version4 零票相同，屬本次自定，owner 可改）；無地塊的題不留燈籠。實時落地與 snapshot／Undo／重新連線的重建（`setRotationLanterns`）用同一個 `rotationLantern` 計算，結果相同；第 65 位訪客即使題目無地塊，也會清除第 1 位的燈籠位。`main.ts` 只在 `view.rotation` 時改用這兩個方法；version4 仍呼叫 `play`／`setLanterns`，輸出與改動前逐位元相同（測試以改動前 `93720bb5` 的緩衝區摘要核對）。

- 2026-11-18 第四節，2.6 城市結果卡群眾比例：
  - 判斷：Q02 城市接線（2.1／2.2）未做。蓮花受電模型雖已 merge 入 main（PR #4），其 handoff 仍寫「not placed」，城市內未選址；此時把 Q02 畫出會令起始選項 A 隱去已驗收的農園，換到 B 時又無模型出現，空置態亦未驗收。故改做不受阻擋的 2.6 結果卡部分。
  - 做法：群眾比例句移至 `survey/src/shared/rotation.ts`（`VOICES_GATHERING`、`crowdShareText`），guest「住民の声」面板與城市結果卡共用同一句。`residentResult` 在輪換提案回傳 `share`：取 outcome 題目（換模型或保底題）的比例；城市卡在原因句出現時同時加一行「住民の声：同じ暮らしを選んだ住民 N%（M人中）」，未達門檻為「住民の声：この問いへの声は、まだ集まり始めたところです」。version4 提案沒有 `rotation`，結果卡不變。
  - 未做：hologram「住民の声」看板改為題目比例（2.6 下半，屬視覺改動，待 owner 定樣式）；保底結果卡仍用通用句，未改為 3.4 的「あなたの選んだ暮らしは、すでにここにあります」（guest 端已用；城市端待 5.2 文案）。

## Actual validation results

- 2.6 結果卡群眾比例（2026-11-18 第四節）：`tests/rotationLayout.test.ts` 新增：只取 outcome 題目的比例、保底題的比例、未達門檻句、無比例時不給。root 及 `survey/` `npm test`／`npm run build`、`git diff --check` 通過。內置瀏覽器 `root`＋`survey-rotation`（scratch DB），第 1 位訪客 Q01 B→C：結果卡為「…自律サービスの端口が増えました。」下一行「住民の声：この問いへの声は、まだ集まり始めたところです」，console 無錯誤；其後 4 位（Q02–Q05 換）的卡逐份重建，無殘留比例行。百分比行未在瀏覽器出現：每位只答 9 題中的 4 題，要約 25 位訪客才有一題達 10 票，由單元測試覆蓋。`scripts/changeSheet.ts` 重新生成只改日期（version4 文案不變），未 commit。

- 輪換投票旅程方案 A（2026-11-18）：`tests/voteJourney.test.ts` 以 headless three.js 實際跑旅程（canvas stub）：version4 四組旅程（混合票、能源、district 落點、全零）八個時刻的全部緩衝區摘要等於改動前 `93720bb5` 的錄得值；Q01 換模型為一個 automation 色大光點加三個中性淡出光點，淡出光點到頂點時亮度 < 0.05，大光點於 2.2 秒落地，一個掃描環，一盞 NW automation 燈籠；Q01 保底落地、中性 0.7 倍燈籠；無地塊題（Q05 換、Q03 保底）四個淡出光點，無大光點、掃描環及燈籠；實時燈籠與 `setRotationLanterns` 重建相同，只在 NW；第 65 位訪客取代第 1 位。root 及 `survey/` `npm test`／`npm run build`、`git diff --check` 結果見 VALIDATION。瀏覽器：`root`＋`survey-rotation`，以 capture 載入器（headless Chrome 1600 × 900）在頁面就緒後送出訪客，Q01 B→C 結果後 0.5／1／1.5／2／2.5／3／3.5 秒，及一份 Q02 換（無地塊）0.5／1／1.5／2／3 秒，12 張 sidecar 皆無 page error。原尺寸查看：0.5–1.5 秒可見藍色大光點及暖白淡出光點，2 秒淡出光點已暗，3 秒 NW 掃描環可見；Q02 換只有暖白淡出光點，沒有藍色。證據存 `~/city2127-evidence/question-rotation/journey/`（`sheet.jpg` 總覽，`liveCapture.mjs` 為驅動腳本副本，偏移以 `OFFSETS` 設定）。

- Verification status: PARTIAL（survey 端接線及城市端 Q01 完成並測試；其餘 8 題城市未畫；iPad／A/B 實機、FPS 未測）
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
  （以上為第一節 5 題 gate 時的紀錄。）**現行 gate（暫定，待 owner 確認）：** 上線配置 9 題、原設定，只卡無變化 ≤ 2%（1.5%，通過）；每 run 全部模型出場不再卡（9 題時 389/400），只報告。10 題時約 3% run 有一個模型全日未出場；答案越一致越多。交 owner 判斷保底份量及是否接受 10 題時的出場缺口。
- 階段 2 Q01（2026-11-18）：root 及 `survey/` `npm test`／`npm run build`、`git diff --check` 通過（新 `rotationLayout` 測試；`rotationPipeline` 以真 server 走 B→C，再經其他題 fold 至 Q01 再被抽中後直接 C→A；`automationHub` −1↔+1）。瀏覽器 `root`＋`survey-rotation`：內置瀏覽器實時看 B→C、C→A，console 無錯誤；headless Chrome 1600 × 900 以 capture 載入器在頁面就緒後送出訪客，結果後 2.5／6.5／10.5 秒截圖，page error 0，存 `~/city2127-evidence/question-rotation/q01-city/`（`sheet.jpg` 總覽，`guest.mjs`／`cycle.sh`／`liveCapture.mjs` 為驅動腳本副本）。`npm run capture` 固定 settle 對不準實時結果（載入時間浮動約 5 秒，三次中兩次拍到結果後 14–15 秒），只留 `live-C-to-A.png` 一張成功的及 `state-A-hero.png`。另以 `npm run capture`（`9c72c82a` 乾淨樹，只開 `root`）用 DEV `?meters=nw:∓2.5&metersTo=nw:±2.5&metersAge=6.5／10.5&reviewTime=30&nopanel` 確定性地拍 A→C、C→A（同一 NW ±1 路徑，`meters-*.png`，`meters-sheet.jpg`），page error 0。version4 不變由同一物件測試保證，未拍前後對照。分支 CI：`9c72c82a` push 時為 in_progress，上一個 `e317b593` 為 success。
- Evidence/environment: 玩具模擬 `~/city2127-evidence/question-rotation-sim/`；正式模擬見上，非真人答案。

## Known issues and blockers

- 輪換投票旅程：大光點落在 NW 時，於 hero 鏡頭中部分被左側建築遮擋（與 version4 NW 光點相同，深度測試）；保底燈籠的顏色及尺寸為自定，待 owner 看。

- 新 run 各題起始模型未定（題組現填暫定值）。
- 模擬：10 題時少數 run 有模型全日未出場（見上表），gate 未卡此配置。
- 1.7 未以 version4 真人答案分佈重跑（未檢查本機 SQLite 是否有真人資料）。
- 蓮花受電仍為 draft，未選址。
- 待 owner：舊能源部件逐件去留；群眾比例少人數門檻（建議 10 票）；Q02 離場模型的變化是否播出。
- 已核實（2026-11-18）：Q01 −1↔+1 直接跳由 AUTO HUB `retarget` 處理（見上），不經 `buildTransition.ts`；其他題的直接跳待各自模型接入時核實。
- 已決（owner 2026-11-18）：Q01 換模型的效果句去掉「ほかの住民の声と重なり、」前綴（計劃 3.7）；version4 照舊。
- 已決（owner 2026-11-18）：A↔C 過場中段塔身穿出低層大廳頂篷，owner 接受，不改。
- 審閱第 G 點（城市端預載需收到每次預約抽中的題目，加入 protocol）已列入下一步第 3 點。

## Next expected step

**現時：** 階段 2 Q01 已接（`rotationLayout.ts`），輪換投票旅程方案 A 已做（`voteJourney.ts`），2.6 結果卡群眾比例已做（hologram 看板未做）。Q02 城市接線待蓮花受電在城市選址（`place-building`）及三個地塊空置態。下一步：owner 看 Q01 B→C／C→A 實拍及上列兩個待決事項；其餘題按模型完成次序接入（Q02 起需 2.1 地塊目錄及 2.2 `lotRuntime`，因三個模型各有地塊）；或 owner 決定把輪換設為預設並開新 run（要同步 AGENTS.md／SPEC 敘事原則，計劃 6.7）。階段 4 內容製作可並行。


（已完成，保留作紀錄）階段 1 切片二：server 接線。先讀 `survey/src/server/runStore.ts`（`runProposalLadder` fold 位置）、`context.ts`、`sessionService.ts`、`answerService.ts`、`migrations.ts`、`protocol.ts`、`twoStations.test.ts`，然後：
1. 1.6 schema 9：草稿保存抽中題目 ID（預約時 `drawQuestions`）；提案保存 drawn 題目及答案；新增可空欄位，保留 schema 8 歷史。提交時驗證答題 ID 等於草稿的抽中題（`rotationStep` 已檢查）。
2. 1.4 run 按題組 `kind` 分流：rotation run 用 `foldRotation`，version4 run 照舊 `ladderStep`；新增 `CityView` 變體而非擴闊 `ExhibitionCityView`（root `src/` 亦 import），改後要跑 root `npm test`／build。
3. 1.5 protocol：結果事件帶 `RotationOutcome` 與 `crowdShare`；預約事件帶抽中題目 ID，供城市端預載（審閱第 G 點）。
4. 之後才做 1.8 guest 介面。rotation 題組不可成為 server 預設，直至 5 題 online。
可與階段 4 內容製作（蓮花受電驗收及選址、Q08／Q06／Q03 新模型）並行。
