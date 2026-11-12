# resident-minato — 湊嘅人物情景（NW focal，DEV 演示）

[居民情景計劃](../RESIDENT_SCENE_PLAN.md)階段 2 嘅第一個單位，亦係 [resident-scene skill](../../.agents/skills/resident-scene/SKILL.md) 嘅樣板。冇 chat 歷史都可以由呢度接手。

- Owner: cc100053（產品／視覺驗收）；規格同審圖：Claude（顧問）；實作：Sonnet agent
- Status: IN_PROGRESS — DEV 演示完成並 merge 入 main（owner 2026-11-12 指示）；正式接入未開始
- Branch: `feat/resident-minato-proto`
- Base commit: `8773dab67ed36d70f486532f4822e930721a6fb5`
- Last verified commit: `4b117c16053d6a1a102d933dd127209ef23131f7`（原型最後一個 source commit）；之後只有文件同 skill
- Remote availability: `origin/feat/resident-minato-proto` 同 `origin/main`（2026-11-12 push）

## Session Git state

- Session starting branch and HEAD: 主 checkout `main` @ `8773dab`；工作喺 worktree `.claude/worktrees/agent-a0116132b953e9213`
- Last fetched origin/main commit: `8773dab`，2026-11-12 fetch 成功，main 對 origin/main 0/0
- Local changes present at session start: 主 checkout 有其他工作嘅未 commit 改動（`docs/BLENDER.md`、`docs/README.md`、三份 `artifacts/*` 文件、未追蹤嘅 `blender-*` skill 同 `Dev_QA.md`），全部保留冇改
- Upstream integration status: 見「整合」
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Guest 投票令デックス西 AUTO HUB 變咗之後，鏡頭喺建築變化完結後再推近去案內係「湊」，佢用行動演出呢個變化（+1 拉閘離開、0 交包裹俾機械臂、−1 向排隊嘅人鞠躬），之後返回 hero。

驗收：owner 睇成套演示收貨。Owner 2026-11-11／12 已接受作**演示**用；正式展出版本未驗收。

## In-scope files and dependencies

- [minatoTimeline.ts](../../src/minatoTimeline.ts)：`minatoPose(t)` 行動時間線、`residentBeat(u)` 鏡頭一拍（1.5 s 去、7.5 s 行動、1 s 返）。純函數。
- [devMinato.ts](../../src/devMinato.ts)：載入兩個 GLB，逐狀態擺佈景，`residentPose()` 計鏡頭位，除錯用 `window.cityMinatoT`／`cityMinatoFigure`／`cityMinatoFace`。
- [devResidentDemo.ts](../../src/devResidentDemo.ts)：鏡頭弧線、字幕、結果卡淡出、中斷。
- [main.ts](../../src/main.ts)：三個 DEV 分支（`?shot=nw:resident`、`?residentDemo`、`&kiosk=&cam=`）；survey handler 開頭 `residentDemo?.cancel()`。
- 模型：[resident-minato](../../asset/models/resident-minato/build_minato.py)（2,356 tris，8 個 `res_*` 材質角色，13 個剛體節點）、[resident-kiosk](../../asset/models/resident-kiosk/build_kiosk.py)（`ksk_*` 角色，閘、玻璃房、簷篷、機械臂節點）。
- 測試：`tests/minatoTimeline.test.ts`、`minatoGlb.test.ts`、`kioskGlb.test.ts`，已入 `npm test`。
- 目標圖：[artifacts/resident-minato/target](../../artifacts/resident-minato/target/)。Prompt：[skill 範例](../../.agents/skills/resident-scene/prompts-minato.md)。
- 冇改：`SHOTS`、`shotTimeline`、survey server、iPad UI、正式結果流程。

## Completed work

- 角色：Blender headless 剛體分件，R2 owner 收貨。
- 佈景：亭仔 GLB、地面石板同藍色嵌線、白色長櫈、導向柱、花槽；逐狀態換閘、玻璃房、簷篷、機械臂、路人。
- 三個狀態用同一個鏡頭關係（亭仔 stage 位 (1.2, 4.35) 附近）；佈景、湊同鏡頭距離跟 hub 路人比例放大（+1 ×1.0、0 ×1.6、−1 ×2.6）。
- `?residentDemo`：真投票流程入面，NW focal 結果喺建築變完（約 8.1 s）後探訪湊，約 18.2 s 返到 headline 鏡頭，約 20.2 s 返 hero。四種轉變各有字幕。
- Undo、第二個結果喺一拍中途到達：beat 取消，佈景跟 hub 嘅新狀態。

## Actual validation results

- Verification status: PARTIAL
- Date and checked commit/worktree: 2026-11-12，worktree @ `4b117c16053d6a1a102d933dd127209ef23131f7` 加本次文件／skill 改動
- Commands/manual checks and results: root `npm test` PASS（包括 `minato.glb` 18 nodes／2,356 tris／8 materials／143,004 bytes、`kiosk.glb` 13 nodes／5,088 tris／8 materials／154,180 bytes）；`npm run build` PASS；`git diff --check` 乾淨；改過嘅 Markdown 本地連結 0 條斷。冇改 `survey/` 同 `module-swap/`，所以冇跑嗰兩個 package。Browser 檢查由 Sonnet agent 喺各輪做（錄影同截圖表），本次冇重跑。
- Evidence/environment: `~/city2127-evidence/resident-minato/`（`r5/` 六條演示錄影同截圖表，`r6/` −1 修正）；開發用 Mac，headless Chrome，1600×900。顧問只睇過部分截圖表，冇逐條睇錄影。
- Integrated commit and checks: 見「整合」
- Changes since verification: 文件同 skill

NOT RUN：FPS（加咗兩個 GLB、三盞燈、透明玻璃）；snapshot、reset、重連三種中斷；iPad 畫面同步；A/B 兩站喺 20 秒時長下嘅排程。

## Known issues and blockers

- 全部係 DEV-only。正式接入要改 13 秒閱讀時段、lease、A/B 排程同 iPad 畫面，屬於產品契約改動。
- GLB 載入失敗冇後備（早期膠囊人偶已刪）。
- −1 鞠躬時帽簷遮住塊面（約 11–13 s、17 s）；−1 嘅湊喺畫面偏細。
- +1 嘅「回望」站位錯（佢背住鏡頭行開），owner 話之後先執。
- 湊個口係固定微笑，未有按狀態換嘅口形。
- Hub 狀態 mesh 係 bake 咗嘅，DEV module 隱藏唔到個別道具，所以 −1 有棵樹同張櫈避唔開；藍色嵌線喺 +1 繞唔到亭仔。
- 導向柱同白色長櫈係 DEV 本地幾何，未入 `city-kit-2127`。
- 亭仔 GLB 嘅 `qa_check` 仲有共面三角形對。

## Important decisions

- 路線：Gemini 場景目標圖＋角色設定圖 → Blender 剛體分件（冇骨骼、冇蒙皮）→ 程式用純時間線函數郁有名嘅節點。冇加新依賴。
- 鏡頭位要三個狀態一齊揀：最初只睇 +1 揀嘅位，喺 0／−1 被樹、櫈同放大咗嘅路人擋住，要重做目標圖。
- −1 湊太暗嘅真正原因係補光加過頭再加 bloom 洗白，唔係唔夠光；修法係三個狀態用同一套補光。量度：塊面平均亮度 0／−1 = 197.8／209.3（12 時）、181.2／193.3（22 時）。
- 每個結果都要有人物一拍（owner）；district 結果點樣接居民未設計。

## Next expected step

Owner 揀：（a）執湊嘅演技同口形，或者（b）照 [resident-scene](../../.agents/skills/resident-scene/SKILL.md) 開時子（SE focal）。兩樣都唔等對方。正式接入（時間線、server、iPad）要另開任務同 owner 批。

## 整合

2026-11-12，owner 指示「merge main」。`git merge --no-ff` 入 `origin/main` `8773dab`，merge commit `c902d46b1f0a69ec1969a56b959d2705e0695425`。Merge 結果嘅 tree 同已驗證嘅分支 tip `0aa3317` 完全一樣（`git diff` 空），所以沿用上面嘅 root test／build 結果，冇重跑。之後呢個紀錄 commit 只改本文件。Push 同 main CI 結果見 commit 之後嘅 [handoffs README](README.md) 或 `git log origin/main`。
