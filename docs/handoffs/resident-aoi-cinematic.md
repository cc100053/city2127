# resident-aoi-cinematic — 葵播種 beat 鏡頭語言同動作打磨

- Owner：cc100053
- 狀態：IN PROGRESS（R1 第 0–5 步完成：分鏡、時間軸同鏡頭；等 owner 睇新舊並排片段，下一步係第 6–7 步光同景深）
- 分支：`feat/aoi-cinematic`，由 `714b4ef3`（當時嘅 `origin/main`）開出
- Base commit：`39725ef2d38efdfae8df74e03d2d57e1c42cba87`（計劃寫入前嘅 `origin/main`）
- Last verified commit：`04a9ad1a5536b5b5da00ceb4b942baf4f57671ad`（分鏡同時間軸；新版日景片段由呢個 commit 嘅乾淨樹錄製，夜景片段由之後只改文件嘅 `d22d33ec` 錄製）
- Remote availability：計劃同 skill 草稿已推上 `origin/main`；R1 進度喺 `origin/feat/aoi-cinematic`
- 製作指引：[resident-cinematic](../../.agents/skills/resident-cinematic/SKILL.md)（草稿，今次第一次用）

## Session Git state

- 寫計劃嘅 session（2026-11-26）：開始時喺 `main`，HEAD 係 `1c618231ce2056761a25296cd67930a46b809ff7`，落後 `origin/main` 5 個 commit（全部係模型）。用 `--ff-only` 快轉到 `39725ef2`，再開 `docs/resident-cinematic` 寫計劃，合併返 main 後推送。
- 開始時嘅本機改動：只有未追蹤嘅 `.sf/`，唔屬於呢個 task，保持原狀。
- R1 實作 session（2026-11-26）：開始時喺 `main`，HEAD 係 `714b4ef35af6783fe3a8452ed15018fdbaf9357b`，同 `origin/main` 一致，工作樹乾淨，冇其他 worktree。主 checkout 冇其他 session 嘅改動，所以直接喺度開 `feat/aoi-cinematic`，冇開 worktree。
- R1 第 3–5 步 session（2026-11-26）：開始時喺 `feat/aoi-cinematic`，HEAD 係 `b28ecc24`，同 `origin/feat/aoi-cinematic` 一致，工作樹乾淨；`origin/main` 冇新 commit（分支領先 3 個）。冇開 worktree。
- 之後每個 session 開始時，都要重新做 AGENTS.md preflight，然後記錄實際狀態。

## 目標同驗收

葵（アオイ，受電テラス農園／天氣圖書館，Q02 C）嘅 DEV 播種 beat 而家睇落粗糙。今次要將佢改成似遊戲過場：分鏡剪接、姿勢到姿勢嘅演技、用光講故事。**唔做動捕**，以「工夫少、效果大」為原則（owner，2026-11-26）。

驗收條件：
- Owner 睇完新舊並排嘅逐格片段後接受，或者指出要改乜。
- [resident-cinematic](../../.agents/skills/resident-cinematic/SKILL.md) 嘅自我檢查清單全部通過，或者列明邊幾項未過。
- 新 beat 嘅 FPS 喺下面「已作決定」記錄嘅預算之內。

## 現況診斷（2026-11-26，讀碼所得）

來源係 [devAoi.ts](../../src/devAoi.ts) 同 [aoiTimeline.ts](../../src/aoiTimeline.ts)：

| 時間 | 現況 |
| --- | --- |
| 0–2.8 s | 西入口固定鏡頭 `ENTRY`，完全唔郁 |
| 2.8–4.85 s | `MEDIUM` 推近 `CLOSE`，對準手勢 |
| 3.3–5.68 s | 托起（lift）、撒種（sow）、種子跌落；全部係 smoothstep，冇預備、冇定格；3.3 s 前角色完全靜止 |
| 5.68–7.25 s | 鏡頭位置同對準點各自直線 lerp 去 `BED_VIEW`，路徑唔一致，似飄走 |
| 7.25–8.4 s | 亮板、光束、暖光照菜畦；鏡頭已經拉遠，葵太細睇唔到，冇人物反應 |
| 3.5–9.4 s | 字幕 |

## 計劃

一個 round 由一個新 session 做，做完要 commit、push 同發片，交接文件係 session 之間唯一嘅延續（AGENTS.md 嘅 owner-judged rounds）。

### R1 — 分鏡、演技、光同工具（下一個 session）

0. **Preflight 同開分支。** 確認 `main` 等於 `origin/main`，然後開 `feat/aoi-cinematic`。
1. **Vendor motion-design skill。** 將 [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill)（MIT，純 markdown）放入 `.agents/skills/motion-design/`。做法同 blender-skills 一樣：pin 住 commit、附上 LICENSE，再喺 [BLENDER.md](../BLENDER.md) 嗰類文件或 docs/README 記錄來源。**下載前先問 owner。**放好之後，將 resident-cinematic 裏面嘅純文字路徑改成連結。
2. **逐格片段工具 `scripts/beatReel.mjs`。** 規格見 skill 嘅 **Frame-exact reel tool**。`devAoi.ts` 而家用 `now - started` 計時，要加 DEV-only 嘅 `window.__residentSeek(t)`，做法同 `aoiTime` 定格一樣。工具開一個 headless Chrome 逐格截圖，用系統 ffmpeg 出 MP4，再砌 0.5 s 接觸表同 sidecar。改動之前，先用呢個工具錄一段**舊版**做基準。
3. **分鏡**（約 11 s）：

   | 鏡頭 | 時間 | 內容 |
   | --- | --- | --- |
   | S1 入口全景 | 0–2.4 s | 保留 `ENTRY` 構圖，加 ≤ 4 % 嘅慢推近 |
   | ✂ | 2.4 s | 剪接 |
   | S2 中景（手同面） | 2.4–5.7 s | 葵抬頭望一望天幕（伏筆），手掌托起；撒之前手先輕輕向下沉（預備），撒出後手掌攤開定格 ≥ 0.4 s；全程有呼吸；景深對焦喺手 |
   | ✂ | 約 5.7 s | 喺種子落地嗰刻剪接 |
   | S3 天幕全景 | 5.7–8.6 s | 用 `BED_VIEW` 一帶做固定鏡頭，加少少向上搖：亮板、光束落菜畦、照亮菜葉 |
   | ✂ | 8.6 s | 剪接 |
   | S4 結局近鏡（新增） | 8.6–11 s | 略低角度近鏡：暖光照到佢塊面，佢抬頭望光；字幕喺呢個鏡頭先出 |

4. **時間軸。** 喺 `aoiTimeline.ts` 加 `aoiShot(t)` 純函數，同埋預備、回彈、定格、呼吸嘅 easing。`aoiPose` 要配合新時間軸，跟 skill 規則 5–6 重寫 lift／sow、頭身錯開同呼吸。原本嘅 `push`、`pullback` 改用分鏡處理。
5. **鏡頭。** `devAoi.ts` 改用 S1–S4，刪除直線拉遠。保留 `aoiTime`、`aoiNoCaption`，`aoiView` 保留 `entry|hands|canopy`，新增 `payoff`。
6. **光。** 加一盞唔投影嘅暖色聚光燈照葵塊面，同 `sunlight` 同步亮起；再加一盞冷色輪廓光。`fill` 保持日夜共用嘅原則。字幕改喺 S4 先出。
7. **景深。** 喺 `src/main.ts` 嘅 composer 加 BokehPass，只喺 S2 同 S4 開。要量開同唔開嘅 FPS，對照 [resident-aoi 交接](resident-aoi.md)嘅基準（天幕 50.7–51.4、加葵 51.7–54.0）。跌得太多就剔除，靠輪廓光頂上。開關點樣由 DEV 場景控制，喺實作時決定，正式版唔可以有改變。
8. **測試。** 更新 `tests/aoiTimeline.test.ts`，覆蓋鏡頭次序、剪接點、鏡頭內連續性、終點姿勢，同種子落地喺 S2→S3 剪接之前完成。
9. **自我檢查。** 用 skill 嘅清單幫逐格片段評分，最多修三次。
10. **收尾。** 跑 root `npm test`、`npm run build`、`git diff --check`。錄日景夜景片段，加新舊並排。更新呢份交接、[RESIDENT_SCENE_PLAN](../RESIDENT_SCENE_PLAN.md) 葵嗰行，並重新生成變化總覽（polish-ladder **Change sheet**）。合併、推送 main，發片畀 owner。最後跑 skill 嘅 **Self-improvement**。

### R2 — Blender 骨架試點（R1 驗收之後）

根據 skill 嘅 **Blender armature track**：
1. 喺 [build_aoi.py](../../asset/models/resident-aoi/build_aoi.py) 加 armature，骨嘅名同現有關節節點一致（`torso`、`head`、`upperArm.L/R`、`lowerArm.L/R`、`hand.L/R`），每件剛體零件 100 % 綁落對應嘅骨。網格同 2,060 個三角面都唔變。
2. 喺 Blender 用 Graph Editor 同 IK 做 `aoi_sow`、`aoi_lookup` 兩個 action，30 fps，冇 root motion。匯出時帶動畫，然後喺 [LIBRARY.md](../../asset/models/LIBRARY.md) 記錄 clip 名同長度。
3. `devAoi.ts` 載到 clip 就用 `mixer.setTime()` 跟 beat 時鐘播，載唔到就退返用 `aoiPose`。
4. 用逐格片段並排比較 TS 版同 Blender 版，由 owner 揀。Blender 方面跟 [BLENDER.md](../BLENDER.md) 同 blender-core。

## 涉及檔案

`src/aoiTimeline.ts`、`src/devAoi.ts`、`src/main.ts`（只加景深）、`tests/aoiTimeline.test.ts`、新增 `scripts/beatReel.mjs`、`.agents/skills/motion-design/`（vendor）、`.agents/skills/resident-cinematic/SKILL.md`（每輪自我改進），R2 加 `asset/models/resident-aoi/*`。

唔包括：正式投票接入、iPad、13 s 閱讀時段、Meter、角色重新建模、面部表情、音效。

## Completed work

- 2026-11-26（R1 第 3–5 步，即任務嘅「第 3–4 步」：分鏡、時間軸、鏡頭）：
  - `aoiTimeline.ts`：新增純函數 `aoiShot(t)`，回傳 `{ shot: 'S1'|'S2'|'S3'|'S4', u }`，`u` 係鏡頭內 0–1 進度；剪接點 `AOI_CUTS = [2.4, 5.7, 8.6]`，`AOI_DURATION = 11`。新增 easing：`anticipate`（ease-in-back）、`overshoot`（ease-out-back）、`swing`（兩者接成一筆，數值同速度連續）、`hold`、`breathe`，同埋常數 `AOI_SEED_RELEASE = 4.86`、`AOI_SEED_LAND = 5.55`、`AOI_CAPTION_FROM = 9`、`AOI_HEAD_LEAD = AOI_TORSO_LAG = .08`。
  - `aoiPose` 改成回傳 `head`／`arms`／`torso` 三組 `{ lift, sow, look }`（頭早 0.08 s、身遲 0.08 s）同 `breath`、`drift`（4 s 同 7.3 s 正弦）、`seeds`、`pane`、`beam`、`sunlight`。S2：2.55–3.6 s 抬頭望天幕；3.55–4.15 s 托手（回彈約 5 %）；4.45–5.1 s 撒種，先向後收約 12 % 再衝過頭約 12 %；5.1 s 起手掌攤開定格到 7.3 s（S2 內 0.6 s）；種子 4.86 s 離手、5.55 s 落地。S3：亮板 6–6.45 s、光束 6.25–6.9 s、暖光 6.7–7.2 s，7.3–8.3 s 收手。S4：8.85–9.65 s 抬頭望光並定住。`push`、`pullback` 已刪除。
  - `devAoi.ts`：四個固定鏡頭（`SHOTS`），每個只沿視線推近（S1 3.5 %、S2 4 %、S4 3 %）或者向上搖（S3 0.9 m，約 3.3 %），用一個 smoothstep 帶動；S2 視角 40°、S4 35°，其餘 53°。S4 係新嘅低角度近鏡（相機 `(-183.53, 3.24, 399.55)` 對住塊面）。`aoiView=entry|hands|canopy|payoff` 對應 S1–S4，時間夾喺該鏡頭範圍內。字幕只喺 S4 且 t ≥ 9 s 先出。原本寫死嘅 5.18、3.9、3.5／9.4、2.8 全部改用時間軸常數或者姿勢數值。
  - `tests/aoiTimeline.test.ts` 重寫：easing 端點、鏡頭次序同剪接點、鏡頭內 `u` 連續、所有通道冇跳變（剪接只郁鏡頭）、起點同終點姿勢、呼吸、S2 抬頭／預備／回彈、定格 ≥ 0.4 s 而且一直到剪接、種子喺剪接前落地、頭身錯開 0.05–0.1 s、天氣通道單調喺 [0, 1]。
  - `resident-aoi.md` 嘅定格時間同 `aoiView` 已同步。
- 2026-11-26（R1 第 2 步）：`devAoi.ts` 加咗 DEV-only 嘅 `window.__residentSeek(t?)`。佢會將 beat 定喺 `t`，直到下一次 seek；回傳 `{ ready, duration }`，`ready` 表示上一格有冇畫到葵（農園淡入期間係 false）。`aoiTime` 同 `aoiView` 照舊可用。`aoiTimeline.ts` 新增 `AOI_DURATION = 9.6`。新增 [scripts/beatReel.mjs](../../scripts/beatReel.mjs)，用法記錄喺 [VALIDATION](../VALIDATION.md#evidence-storage)；self-test 已加入 `npm test`。`capture.mjs` 改成只有直接執行時先跑自己嘅 self-test，咁 import 佢就唔會觸發。
  - 實測發現：喺呢部 Mac 嘅 headless Chrome，另外開 raw CDP session 會令 viewport 由 1920 × 1080 縮到 1920 × 993，所以改用 Playwright 嘅 `page.screenshot`。
  - 舊版基準片段已錄（見下面驗證）。
- 2026-11-26（R1 第 1 步）：Owner 批准之後，將 LottieFiles/motion-design-skill 嘅 commit `d77a9fc8cb371cab1ba5420df5bfd232cd14c9bb` 放入 `.agents/skills/motion-design/`，原文冇改，授權書係 `LICENSE-motion-design-skill`。來源同埋「唔用 Creator MCP」嘅說明記錄喺 resident-cinematic，docs/README 加咗連結。本機 `.claude/skills/motion-design` symlink 已經建立；`.claude/` 唔入 Git，其他工作站要自己建立。
- 2026-11-26：寫咗呢份計劃同 [resident-cinematic](../../.agents/skills/resident-cinematic/SKILL.md) skill 草稿，並喺 resident-scene、AGENTS.md、docs/README 同 handoffs/README 加連結。

## Actual validation results

- R1 第 3–5 步（`04a9ad1a`）：
  - Root 測試 55 條指令，54 條通過；唯一失敗仍然係 `tests/assetLibrary.test.ts`（`q04b-sky-village` 冇 LIBRARY.md 行），同之前一樣，與今次無關。`npm run build`、`git diff --check` 通過，`dist/` 冇 `__residentSeek`。
  - 新版片段：`~/city2127-evidence/aoi-cinematic/r1/new-day.*`（`hour=12`，commit `04a9ad1a`）同 `new-night.*`（`hour=22`，commit `d22d33ec`），0–11 s、30 fps、331 格，`dirty: false`，`pageErrors` 空。新舊並排：`sbs-day.mp4`、`sbs-night.mp4`（左舊右新，各 960 寬，ffmpeg `hstack`；本機 ffmpeg 冇 `drawtext`，所以冇文字標籤）。定格探針喺 `probe/`。
  - 自己睇接觸表：S1 全景好穩陣；S2 見到抬頭、托手、撒種同攤開手掌；S3 天幕全景亮板、光束、照菜畦都讀到，但葵喺呢個鏡頭睇唔到；S4 低角度近鏡見到葵抬頭望光，塊面冇被遮，字幕冇蓋臉。夜景 S2 同 S4 背後牆身都有大片過曝暖光（同舊版一樣），塊面偏暗：留畀第 6 步。
  - 未做：skill 自我檢查清單逐項評分（第 9 步）、實時 FPS（第 7 步）。
- R1 第 2 步（`f098db5d`）：
  - Root 測試：除咗 `tests/assetLibrary.test.ts`，其餘全部通過。佢失敗係因為 `q04b-sky-village` 冇喺 LIBRARY.md 登記；呢個問題喺 `origin/main` `714b4ef3` 已經存在，同今次改動無關，未修。
  - `npm run build` 同 `git diff --check` 通過，`dist/` 入面冇 `__residentSeek`。
  - Frame-exact 檢查（1920 × 1080／DPR 1 headless Chrome）：同一次載入入面，seek 5.45 s、seek 去其他時間、再 seek 返 5.45 s，同埋 1.5 s 後再截，三張 PNG 嘅 hash 完全相同。用 URL `aoiTime=5.45` 另外載入，或者重新載入一次，畫面就唔再 bit-identical，不過 PSNR 有 48.4 dB，差異放大 8 倍對比度都睇唔到。
  - 舊版基準：`~/city2127-evidence/aoi-cinematic/r1/old-day.*`（`hour=12`）同 `old-night.*`（`hour=22`），URL 係 `?shot=energy:aoi&orbital=3&nopanel&reviewTime=20`。範圍 0–11 s，30 fps，每段 331 格；有 MP4、0.5 s 接觸表同 sidecar；`dirty: false`，`pageErrors` 係空嘅；每段錄製約 95 s。
  - 接觸表同上面嘅現況診斷一致。另外睇到：夜景 3–6 s，葵頭頂面牆有一大片過曝白光，第 6 步改光時要處理。
- 之前：Verification status：NOT RUN（R1 第 1 步只改文件）
- 文件改動：6 個檔案嘅本機 Markdown 連結檢查，0 條斷鏈；`git diff --check origin/main..HEAD` 通過。以 `bb0248e4` 合併入 main 並推送；純文件推送唔會觸發 CI。

## Known issues and blockers

- 動畫只喺 DEV 播；正式接入係另一個 task。
- 景深可能超出 FPS 預算，要實測。
- 片段入面城市時鐘定咗喺 `reviewTime=20`，所以車、水同天空都唔郁。逐格片段只用嚟審動作同鏡頭；sidecar 嘅 canvas FPS 係錄製速度，唔係播放 FPS。第 7 步嘅 FPS 要用實時播放量度。
- 角色冇表情節點，S4 只能靠抬頭同光去演。
- 成段長咗約 1.5 s，將來正式接入時要重新計 beat 嘅時間預算。

## Important decisions

- Owner，2026-11-26：唔做動捕；以「工夫少、效果大」為原則。可以用嘅工具：LottieFiles motion-design skill、claude-motion 式嘅 `seek(t)` 逐格片段、Blender 骨架（先做剛性綁定）。Remotion、HyperFrames、Animate、GSAP、Chatterbox 等暫時唔用，評估記錄喺 2026-11-26 對話。
- 用剪接取代 11-16 加入嘅連續拉遠。Owner 未明確表態，R1 交片時並排比較；如果要保留拉遠，就改成弧線加慢入慢出。
- FPS 預算：beat 期間唔可以低過葵現有基準下限 50 FPS（開發 Mac 上量度；展場機另行驗證）。
- skill 每輪結束都要按 owner 意見改寫自己嘅規則同清單（**Self-improvement**）。

## Next expected step

先等 owner 睇 `sbs-day.mp4`／`sbs-night.mp4` 同新接觸表，記低意見（未 merge 落 main）。之後做 R1 第 6–7 步（光同景深）：葵塊面暖色聚光燈同冷色輪廓光，處理夜景牆身過曝；再試 S2／S4 嘅 BokehPass，量 FPS。
