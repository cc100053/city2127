# far-landmark — 遠景軌道升降機（hero 背景剪影）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — R2 已實作；Gemini 目標圖（closeup-polish 流程，只做 hero 遠景）進行中
- Branch: `feat/far-landmark`（worktree `.claude/worktrees/far-landmark`）
- Base commit: `c166ae5d…`（origin/main，2026-11-02）
- Last verified commit: NONE（`tsc --noEmit` clean；`npm test`／`build` NOT RUN）
- Remote availability: `origin/feat/far-landmark`

## Session Git state

- Session starting branch and HEAD: `main` `5fb2428`（本機 main 落後 origin 19 commits，有無關未 commit 改動，冇郁）
- Last fetched origin/main commit: `c166ae5`（2026-11-02 fetch 成功）
- Local changes present at session start: 主 checkout 有 `.agents/skills/closeup-polish/SKILL.md`、`artifacts/se-closeup-polish/prompts.md` 等，未碰
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 要喺遠景加一座巨構：軌道升降機，放好遠，客人只見輪廓，唔做近鏡細節 polish。驗收：owner 目視 hero 日／夜；唔遮四個 site；geometry 唔跟 Meter；hero 1920×1080 FPS 唔跌。

## In-scope files and dependencies

`src/spaceElevator.ts`（新）、`src/layout.ts`（`SPACE_ELEVATOR`）、`src/main.ts`（建立、GTAO prepass 略過）。重用 `bake`、`curveBeyondPlate`。冇新 dependency、冇 UI 文案。

## Completed work

- 位置 (3130, 6200)：settled hero 鏡頭約 7.5 km，畫面 x≈1220/1920（Civic Core 右後方），開放海面；地球曲率令底座沉約 480 m，只見尖塔（900 m）、中轉站（1150 m）、纜線（到 6000 m，出畫面頂）同三個爬升艙。
- `MeshBasicMaterial` 無 fog（exp² 霧喺呢個距離會完全抹走佢），每幀取霧色 ×.86 做剪影；夜晚（霧色亮度低）纜線、艙燈同中轉站環亮薄荷 HDR。
- 證據：`artifacts/far-landmark/r1-*`、`r2-h16.png`、`r2-h21.png`。

## Actual validation results

- Verification status: PARTIAL — headless Chrome 截圖 hero 16:00／21:00（1920×1080）；test／build／FPS NOT RUN

## Known issues and blockers

- 日間中轉站撞正 Sky Ring 斜柱交叉位，睇唔清。
- 夜晚纜線好光，可能同 Sky Ring 爭焦點（等 owner 決定）。
- 爬升艙靜止。

## Important decisions

- 2026-11-02 owner：概念 = 軌道升降機；好遠、只見輪廓；唔做 detail polish。
- 預設（owner 未反對）：Civic Core 右後方；唔跟 Meter。
- Owner 叫用 closeup-polish 流程，只用喺 hero 遠景：Gemini 目標圖定輪廓／位置／夜光。

## Next expected step

Gemini 生成日／夜目標圖到 `artifacts/far-landmark/gen/`；owner 揀圖抄去 `target/`；之後寫 `spec.md` 做 R3。

## R3–R5（2026-11-02）

- R3：owner 要「大 10 倍」→ 揀「粗 10 倍、高度不變」。
- R4（`c48f5aa`）：固定左前 key light＋下半淡入霧色（`shaded()`），夜燈改幼、亮度約 R4 前三分一。
- R5：closeup-polish 流程。Gemini 細節目標圖 `artifacts/far-landmark/target/`（owner 揀兩張都用），`spec.md`，Sonnet 實作：尖塔 8 肋＋3 環帶＋紅燈、三層中轉站＋窗帶＋24 泊位＋12 輻射骨架、粗纜線＋接駁環＋導軌＋4 爬升艙；4 batches。新 `tests/spaceElevator.test.ts`。
- 驗證：`npm test` exit 0、`npm run build` exit 0、`git diff --check` clean（Opus 重跑）。截圖 `artifacts/far-landmark/r5/`。FPS NOT RUN。
- Opus 審：日間中轉站喺眼平線上 ~500 m，鏡頭只見底面（骨架、泊位齒），甲板側面同窗帶太薄；目標圖見到側面。夜間紅燈浮喺黑色、窗帶斷續，比目標零碎。
