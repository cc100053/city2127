# resident-aoi-cinematic — 葵播種 beat 鏡頭語言同動作打磨

- Owner：cc100053
- 狀態：ACCEPTED（owner 2026-11-27 接受；分鏡、時間軸、鏡頭、光同景深、頸同膊頭、S4 胸口高度構圖；已 merge 落 main）
- 分支：`feat/aoi-cinematic`，由 `714b4ef3`（當時嘅 `origin/main`）開出
- Base commit：`39725ef2d38efdfae8df74e03d2d57e1c42cba87`（計劃寫入前嘅 `origin/main`）
- Last verified commit：`d1c29501`（S4 改胸口高度、廣角；`s4-level-day`／`s4-level-night` 片段由呢個 commit 嘅乾淨樹錄製）。之前：`6a2b7501`（膊頭降低）、`3694446a`（頸同膊頭第一版）。之前：`9abf0516`（光同景深）
- Remote availability：計劃同 skill 草稿已推上 `origin/main`；R1 進度喺 `origin/feat/aoi-cinematic`
- 製作指引：[resident-cinematic](../../.agents/skills/resident-cinematic/SKILL.md)（草稿，今次第一次用）

## Session Git state

- 寫計劃嘅 session（2026-11-26）：開始時喺 `main`，HEAD 係 `1c618231ce2056761a25296cd67930a46b809ff7`，落後 `origin/main` 5 個 commit（全部係模型）。用 `--ff-only` 快轉到 `39725ef2`，再開 `docs/resident-cinematic` 寫計劃，合併返 main 後推送。
- 開始時嘅本機改動：只有未追蹤嘅 `.sf/`，唔屬於呢個 task，保持原狀。
- R1 實作 session（2026-11-26）：開始時喺 `main`，HEAD 係 `714b4ef35af6783fe3a8452ed15018fdbaf9357b`，同 `origin/main` 一致，工作樹乾淨，冇其他 worktree。主 checkout 冇其他 session 嘅改動，所以直接喺度開 `feat/aoi-cinematic`，冇開 worktree。
- R1 第 3–5 步 session（2026-11-26）：開始時喺 `feat/aoi-cinematic`，HEAD 係 `b28ecc24`，同 `origin/feat/aoi-cinematic` 一致，工作樹乾淨；`origin/main` 冇新 commit（分支領先 3 個）。冇開 worktree。
- R1 第 6–7 步 session（2026-11-26）：開始時喺 `feat/aoi-cinematic`，HEAD 係 `3cae8549`，同 `origin/feat/aoi-cinematic` 一致，工作樹乾淨，冇其他 worktree。量 FPS 時臨時開咗 `../city2127-aoi-base`（`3cae8549` 嘅 detached worktree，port 5175）做同場基準，量完已經 `git worktree remove` 同 prune。
- 頸同膊頭修正 session（2026-11-26）：開始時喺 `feat/aoi-cinematic`，HEAD 係 `3dcf2427`，同 `origin/feat/aoi-cinematic` 一致，工作樹乾淨；fetch 成功。冇開 worktree。
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
1. 喺 [build_aoi.py](../../asset/models/resident-aoi/build_aoi.py) 加 armature，骨嘅名同現有關節節點一致（`torso`、`head`、`upperArm.L/R`、`lowerArm.L/R`、`hand.L/R`），每件剛體零件 100 % 綁落對應嘅骨。網格同 2,620 個三角面（R2 關節修正後）都唔變。
2. 喺 Blender 用 Graph Editor 同 IK 做 `aoi_sow`、`aoi_lookup` 兩個 action，30 fps，冇 root motion。匯出時帶動畫，然後喺 [LIBRARY.md](../../asset/models/LIBRARY.md) 記錄 clip 名同長度。
3. `devAoi.ts` 載到 clip 就用 `mixer.setTime()` 跟 beat 時鐘播，載唔到就退返用 `aoiPose`。
4. 用逐格片段並排比較 TS 版同 Blender 版，由 owner 揀。Blender 方面跟 [BLENDER.md](../BLENDER.md) 同 blender-core。

## 涉及檔案

`src/aoiTimeline.ts`、`src/devAoi.ts`、`src/main.ts`（只加景深）、`tests/aoiTimeline.test.ts`、新增 `scripts/beatReel.mjs`、`.agents/skills/motion-design/`（vendor）、`.agents/skills/resident-cinematic/SKILL.md`（每輪自我改進），R2 加 `asset/models/resident-aoi/*`。

唔包括：正式投票接入、iPad、13 s 閱讀時段、Meter、角色重新建模、面部表情、音效。

## Completed work

- 2026-11-27（收尾）：**Owner 接受**，並表示呢次證明咗呢套流程可以將居民情景打磨得更好；指示保留或改進 skill，然後 push main。
  - [resident-cinematic](../../.agents/skills/resident-cinematic/SKILL.md) Self-improvement：由草稿改為已驗證；光同景深（規則 8–9、第 5 步）改為 owner 要求先做；新增規則 11（剛體關節喺任何角度都要重疊：衣領、下沉頸部、圓肩低過肩線）同規則 12（中近景相機喺胸口高度 ±10°、手臂入鏡、先檢查前景佈景）；規則 4 改為收結鏡頭由頭影到手；自我檢查清單加兩項（關節、收結構圖），FPS 一項改為同上一版交替 A/B；Lessons 三條。規則只喺葵用過一次，未推廣到 resident-scene（skill 要求兩個居民都成立先推廣）。
  - [變化總覽](../../artifacts/change-review/index.html#Q02-C)葵段落改用四個鏡頭嘅定格（`artifacts/resident-aoi/cinematic/`，`hour=12`，隱藏字幕，`d1c29501` 嘅程式），舊 `pullback/` 圖檔保留但總覽唔再引用。
  - [RESIDENT_SCENE_PLAN](../RESIDENT_SCENE_PLAN.md) 葵一行改為已接受，下一步係正式接入（另項任務）。

- 2026-11-27（owner：「向上望嗰下都係有透視，睇唔到人物手臂」，`d1c29501`）：
  - **成因**：S4 相機（`FACE`）比塊面低 66 cm、距離 2.2 m，仰角約 16°，視角 35°，對準塊面；畫面下緣只到心口，兩隻手臂都喺畫面外或者被軀幹擋住。
  - **試過嘅構圖**（`r2/s4frame-{a,b,c,d}-day.png`）：(a) 拉後 20 %、對準心口：手臂入鏡，但前景菜畦遮住近側半身；(b) 再升到胸口高度：菜畦照遮；(c) 向佢正面轉約 20°：更差，菜畦擋喺佢前面。菜畦就喺 `FACE` 外面，鏡頭再遠或者再正面都會隔住菜畦。
  - **採用 (d)**：`devAoi.ts` 新增 `PAYOFF`（`FACE` 原位，高度改為 3.55 m，即胸口高度）同 `PAYOFF_TARGET`（`(-185.58, 3.5, 398.76)`，心口），S4 視角 35° → 46°；推近 3 % 不變。仰角由約 16° 變成接近水平，頭到手都入鏡，菜畦只喺左下角，光束仍然喺佢身後。燈光（仍然對 `FACE_TARGET`）、景深（仍然對焦塊面）同時間軸都冇改。
  - 10.5 s 近側手臂垂喺身前，遮住胸前板邊；`aoiNoDof` 對照確認係真實遮擋，唔係景深。

- 2026-11-26（owner：「fix 透視問題」，`6a2b7501`）：
  - **成因**：S4 相機喺葵左前方、比膊頭低約 35 cm；凸起嗰舊係**遠側（右）膊頭**。量度後發現唔係透視放大：圓肩頂喺 1.34 m，但軀幹膊角經過斜肩同倒角，喺嗰個位只有約 1.30–1.33 m，圓肩高過肩線 3–4 cm，所以喺遠側輪廓凸出。
  - **修正**：圓肩中心降 3 cm、向內移 6 mm，改扁（0.07 × 0.072 × 0.042），頂部約 1.31 m，低過斜肩線；上臂頂一齊降到樞軸下 3 cm，保持被圓肩遮住。節點同三角面（2,620）不變，GLB 67,348 bytes。Asset QA 通過，0 錯誤。
  - 檢查：S4 遠側膊頭唔再凸出肩線（`r2/cmp3-S4.png`：左改前、中第一版、右今次）；S2 舉手最高（4.8 s，`cmp-nod-v3.png`）上臂同軀幹仍然連住，近側膊頭收喺膊角下面。

- 2026-11-26（owner 意見：「條頸同埋隻手唔連貫」，S4；`3694446a`）：
  - **Owner 決定**：光同景深嘅分別唔大，唔再做光／景深。今次只改模型。
  - **診斷**（`~/city2127-evidence/aoi-cinematic/r2/before-*`，對照 [build_aoi.py](../../asset/models/resident-aoi/build_aoi.py)）：
    - 頸：一條 8 邊、半徑約 5 cm 嘅皮膚色柱，底部平面喺 1.34 m，只插入平頂嘅軀幹 3 mm；頭嘅樞軸喺 1.36 m。S4 抬頭（約 −0.36 rad）會令頸底一邊翹起約 1.5 cm，低角度見到一塊淺色底面，頸就似一枝獨立嘅柱。軀幹頂冇衣領。
    - 膊頭：上臂樞軸喺 x ±0.194，喺軀幹半闊（約 0.183）之外；上臂頂係一塊半徑 0.066 嘅平面八角形，而旁邊軀幹嘅膊角被 0.048 倒角同斜肩削低。S4 由下向上望，遠側上臂頂就似一舊方塊，同軀幹之間有一條暗縫。Aoi 冇 Nagi 嗰種圓肩球。
    - 唔係姿勢、鏡頭或者權重問題（剛體零件，冇 skin）。
  - **修正**（只改 `build_aoi.py`，共用嘅 `build_nagi.py` 冇郁；節點名、樞軸同 11 個節點不變，所以 `devAoi.ts`、掌心同種子位置照舊）：
    - 軀幹加一圈矮衣領（12 邊，外徑 0.082→0.074，高 5 cm，加捲邊），做法參考 Nagi。
    - 頸底下沉到頭樞軸下 8 cm，半徑 0.054–0.056、12 邊；頭點頭或者抬頭 ±0.42 rad 都唔會露出頸底。
    - 上臂頂降到樞軸，加一粒外套色圓肩（0.072 × 0.072 × 0.05），頂部同軀幹頂齊（約 1.34 m）；第一版圓肩高 1.36 m，S4 遠側膊頭會凸起一舊，已降低。
    - 用 Blender 5.2.2 headless 重建：GLB 55,260 → 67,352 bytes，三角面 2,060 → 2,620。Asset QA（render profile，torso／head／upperArm.L／R）通過，0 錯誤；只有已接受嘅冇 UV 警告。
  - 冇改 `aoiTimeline.ts`、燈光、景深或鏡頭。

- 2026-11-26（R1 第 6–7 步：光同景深，`503d8d50`、`9abf0516`）：
  - **夜景熱斑嘅成因**：逐盞燈關掉再比較（`light/diag-night-S2-fill-vs-sun.jpg`、`diag-night-S4-fill-vs-sun.jpg`，每張 2×2：左上全開、右上關 fill、左下關 `aoi-archived-sunlight`、右下全關）。S2 同 S4 背後嘅大片暖光**全部來自 `fill` PointLight**：佢擺喺葵同身後 0.93 m 嘅玻璃欄之間（x −186.39），夜晚強度 5.2、範圍 4 m，所以打爆咗玻璃欄同矮牆。`aoi-archived-sunlight` 冇影響，而且佢喺 S4 根本照唔到塊面。
  - `devAoi.ts`：`fill` 改成一盞窄角 SpotLight（`aoi-fill`），由鏡頭嗰邊（+x）好陡咁照落頭同膊頭，穿過佢嘅光落喺地面、到唔到矮牆；仍然係日夜共用嘅一盞，強度 1.5 → 22（隨 `darkness`）。新增暖色主光 `aoi-face-key`（#ffc27a，由前上方照塊面，強度日 5／夜 8 × `pose.sunlight`）同冷色輪廓光 `aoi-rim`（#9fc6ff，喺玻璃欄後面、頭嘅高度，沿兩個面部鏡頭嘅視線反打，日 60／夜 16）。三盞都唔投影，只改 intensity，唔切 `visible`，所以 beat 中途唔會重新編譯 shader。
  - 景深：`main.ts` 喺 DEV `energy:aoi` 分支動態 import `BokehPass`，插喺 bloom 前面，預設關。`devAoi.ts` 跟**畫面上嘅鏡頭**（`aoiView` 之後）開關：S2 對焦喺撒種嗰隻手（aperture .004），S4 對焦喺塊面（aperture .005），`maxblur` 都係 .008；焦距每格按相機前向投影計。BokehPass 嘅深度預渲染會將透明物當實心，S2 成個背景都係隔住玻璃欄睇，所以預渲染時暫時隱藏所有透明網格（每 120 格重新掃描）。新增 `aoiNoDof` 關閉景深。
  - 自我檢查第 1 輪（`9abf0516`）：第一版片段夜景 S2 葵頭後矮牆有一團暖光暈（fill 穿過佢）、矮牆頂有 rim 擦出嘅高光；fill 改由更陡角度、rim 降到頭嘅高度兼減弱之後消失。
  - `resident-aoi.md` 已同步燈光、景深同 `aoiNoDof`。

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

- S4 改構圖（`d1c29501`）：Root 測試 54／55 通過（只有原有嘅 `assetLibrary.test.ts` 失敗）；`npm run build`、`git diff --check` 通過，`dist/` 冇 `__residentSeek`。定格 `r2/s4frame-d-{day,night}.png`、`s4frame-d-caption-day.png`（10.5 s，有字幕，字幕冇遮人）；總覽 `s4-level-before-after.jpg`（上日下夜，左舊構圖、右新構圖）。片段 `s4-level-day.*`、`s4-level-night.*`（`d1c29501`，乾淨樹）。
  - FPS（有視窗 Chrome，日景，`light/fpsProbe.mjs`）：同場另開 `c3f12fa3` worktree（port 5175）交替量兩輪。第一輪基準受干擾（Spotlight 索引新片段格、瀏覽器面板分頁仍然喺度渲染），作廢；第二輪：定格 S4 基準 55.1／55.0 → 新 52.6／52.5，S1–S3 兩版相同（50.5–54.9）；實時 S4 52.0 → 52.9。新構圖睇到更多場景，定格約 −2.5 FPS，仍然 ≥ 50。夜景單獨量過一次（定格 S4 47.2–49.5，但同一輪 S1 都跌到 45–48，屬機器干擾），冇做夜景 A/B。worktree 已移除。

- 膊頭降低（`6a2b7501`）：Root 測試 54／55 通過（只有原有嘅 `assetLibrary.test.ts` 失敗）；`npm run build`、`git diff --check` 通過，`dist/` 冇 `__residentSeek`。定格 `r2/v3-S4-{day,night}.png`、`v3-S2-{day,night}.png`（commit 前拍，模型同 `6a2b7501` 一樣），總覽 `before-after-S4-v3.jpg`、`before-after-S2-v3.jpg`（上日下夜，左改前右今次）。片段 `joints-v3-day.*`、`joints-v3-night.*`（`6a2b7501`，乾淨樹，0–11 s、30 fps、331 格）。有視窗 Chrome 日景 FPS：定格 S1 50.8／50.9、S2 54.5、S3 53.9、S4 55.0／54.9；實時 S1 47.0、S2–S4 52.2–52.4，同之前一樣。

- 頸同膊頭修正（`3694446a`）：
  - Root 測試 55 條指令逐條跑，54 條通過；唯一失敗仍然係 `tests/assetLibrary.test.ts`（`q04b-sky-village` 冇 LIBRARY.md 行），與今次無關。`npm run build`、`git diff --check` 通過；`dist/` 冇 `__residentSeek`。
  - 前後定格（1920 × 1080，`npm run capture`，`aoiNoCaption`，`aoiView` 固定鏡頭）：S4 `aoiTime=9.8`、S2 `aoiTime=4.0`，日（`hour=12`）夜（`hour=22`）各一張，喺 `~/city2127-evidence/aoi-cinematic/r2/before-*`、`after-*`；總覽 `before-after-S4.jpg`、`before-after-S2.jpg`（每張 2 × 2：上日下夜，左改前右改後）；放大 `crop-S4-day.png`、`crop-S4-night.png`、`crop-S2-day.png`。另外 `after-S2-nod-day.png`／`crop-S2-nod.png`（4.8 s，頭向前點最深）確認下巴冇插穿衣領。`after-*` 喺 commit 前拍（sidecar 標 dirty），模型同 `3694446a` 一樣。
  - 片段：`joints-day.*`（`hour=12`，`3694446a`，`dirty: false`）同 `joints-night.*`（`hour=22`；sidecar 標 dirty，因為錄製時呢份交接文件未 commit，程式同模型同 `3694446a` 一樣），0–11 s、30 fps、331 格。
  - FPS（有視窗 Chrome，1920 × 1080／DPR 1，日景，R1 嘅 `light/fpsProbe.mjs`，原始結果喺 `r2/` 之外嘅終端輸出，數字如下）：定格 S1 50.9／50.7、S2 54.9／54.7、S3 54.3／53.8、S4 55.2／54.9；實時 S1 46.3、S2–S4 52.1–52.5。同 R1 加燈加景深嘅數字一樣（S1 實時 46 仍然係原有載入卡頓）。夜景冇重新量。

- R1 第 6–7 步（`503d8d50`，第 1 輪修正 `9abf0516`）：
  - Root 測試 55 條指令逐條跑，54 條通過；唯一失敗仍然係 `tests/assetLibrary.test.ts`（`q04b-sky-village` 冇 LIBRARY.md 行），同之前一樣，與今次無關。`npm run build`、`git diff --check` 通過；`dist/` 冇 `__residentSeek`，亦冇 `BokehShader`／`maxblur`（景深冇入正式版）。
  - 塊面亮度（1920 × 1080 定格，`npm run capture`，`aoiTime` S2 = 3.5 s、S4 = 9.5 s，隱藏字幕；Rec.709 平均 0–255，括號係 ≥ 250 嘅爆白比例；方框同探針腳本喺 `light/`）：

    | 鏡頭 | 改前 塊面／背後牆 | 改後 塊面／背後牆 |
    | --- | --- | --- |
    | S2 日 | 108.0／159.5 | 111.4／150.3 |
    | S2 夜 | 137.5／211.5（牆 45 % 爆白） | 96.5／85.9（0 %） |
    | S4 日 | 146.5（10 %）／185.4 | 151.9（19 %）／169.3 |
    | S4 夜 | 86.5／234.8（牆 94 % 爆白） | 130.4／71.8（0 %） |

    「改前」取自 `new-day`／`new-night` MP4 嘅同一時間格。S1 同 S3 係全景，葵得幾個像素高（S3 根本唔喺畫面），冇量塊面；定格 `light/still-S1..S4-{day,night}.png` 同總覽 `light/stills.jpg`。
  - FPS（有視窗 Chrome，1920 × 1080／DPR 1，`reviewTime=20`；每個鏡頭用 `__residentSeek` 定格，各取兩段 3 s rAF 樣本；另外重載一次實時播完全段，按鏡頭平均）。基準係同場另開嘅 `3cae8549` worktree，三個版本交替量，日夜各兩輪（原始數據 `light/fps-ab.jsonl`，腳本 `light/fpsProbe.mjs`）：

    | 定格 FPS（日／夜，各 4 個樣本範圍） | S1 | S2 | S3 | S4 |
    | --- | --- | --- | --- | --- |
    | 基準 `3cae8549` | 49.3–53.2 | 58.6–60.3 | 51.2–55.9 | 60.1–60.3 |
    | 加燈（`aoiNoDof`） | 50.0–51.0 | 59.9–60.3 | 53.1–54.2 | 60.1 |
    | 加燈 + 景深 | 49.5–51.1 | 54.1–54.9 | 53.2–54.9 | 54.4–55.5 |

    加燈：廣角 S1、S3 約 −2 FPS，S2、S4 冇變。景深：S2、S4 約 −5.5 FPS，仍然有 54 以上，所以保留。實時播放按鏡頭平均：S2–S4 51.1–52.7（基準 54.1–54.9）；S1 46.0–46.3，但基準 S1 實時都只有 45.7–48.4，因為 beat 喺農園淡入完就即刻開始，頭 2.4 s 包住載入嘅卡頓（最長一格約 265–300 ms，基準一樣）。第 1 輪修正只郁燈位同強度、燈數唔變，冇重新量。
  - 片段：`~/city2127-evidence/aoi-cinematic/r1/light-day.*`（`hour=12`）同 `light-night.*`（`hour=22`），commit `9abf0516`，0–11 s、30 fps、331 格，`dirty: false`，`pageErrors` 空。並排：`sbs-light-day.mp4`、`sbs-light-night.mp4`（左 = `new-*` 改光前，右 = 今次；各 960 寬，冇文字標籤）。
  - 自我檢查清單（skill **Self-critique checklist**，評今次片段）：
    - [x] 唔睇字幕都知邊個、做緊乜、乜嘢改變咗。
    - [ ] 每個剪接都落喺動作上、冇跳軸：S2→S3（種子落地）、S3→S4（光照好之後）過；**S1→S2 係反打**（S1 由西入口向東望，S2 由葵 +x 嗰邊向西望），算跳軸，未改（屬分鏡，唔喺今次光／景深範圍，交 owner 決定）。
    - [x] 冇剛體行路、轉身或者坐低喺畫面上。
    - [ ] 主要手勢有預備、≥ 0.4 s 定格同四分三側面：預備同定格有；S2 塊面接近側面偏後，唔算四分三。
    - [x] 喺畫面上嘅時候從來唔會完全靜止（呼吸、頭部漂移）。
    - [x] 最後一個鏡頭見到塊面喺改變咗嘅光入面，日夜都讀到（夜 130 vs 背景 72）。不過暖光喺 S3 已經亮起，S4 一開始就係亮嘅，鏡頭內冇「亮起」嗰下。
    - [x] 鏡頭冇漂移，每個鏡頭郁 ≤ 4 %。
    - [ ] FPS 喺預算內：所有定格樣本 49.5–60.3（只有 S1 夜一個樣本 49.5），S2–S4 實時 ≥ 51；S1 實時 46，同基準一樣低過 50，係原有嘅載入卡頓。
    - 修咗一輪（夜景光暈同 rim 高光）；剩低三項都唔係光／景深可以解決，所以冇再修。

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

- [角色外觀接觸表](../../artifacts/resident-aoi/character.jpg)仍然係舊模型（冇衣領、平頂上臂），未重新生成。

- 動畫只喺 DEV 播；正式接入係另一個 task。
- 景深已實測（見上），S2／S4 約 −5.5 FPS，保留。
- S1 實時播放 46 FPS（基準一樣），係 beat 喺農園淡入後即刻開始、包住載入卡頓；正式接入或者重新計時間預算時要處理。
- 夜景 S2 約 3.0 s，葵頭右邊矮牆頂仲有一點細嘅藍白高光（rim 擦到）。
- 日景 S4 塊面約 19 % 像素爆白（改前 10 %），主要係原本嘅日光；key 日間只有 5。
- 片段入面城市時鐘定咗喺 `reviewTime=20`，所以車、水同天空都唔郁。逐格片段只用嚟審動作同鏡頭；sidecar 嘅 canvas FPS 係錄製速度，唔係播放 FPS。第 7 步嘅 FPS 要用實時播放量度。
- 角色冇表情節點，S4 只能靠抬頭同光去演。
- 成段長咗約 1.5 s，將來正式接入時要重新計 beat 嘅時間預算。

## Important decisions

- Owner，2026-11-26：唔做動捕；以「工夫少、效果大」為原則。可以用嘅工具：LottieFiles motion-design skill、claude-motion 式嘅 `seek(t)` 逐格片段、Blender 骨架（先做剛性綁定）。Remotion、HyperFrames、Animate、GSAP、Chatterbox 等暫時唔用，評估記錄喺 2026-11-26 對話。
- 用剪接取代 11-16 加入嘅連續拉遠。Owner 未明確表態，R1 交片時並排比較；如果要保留拉遠，就改成弧線加慢入慢出。
- FPS 預算：beat 期間唔可以低過葵現有基準下限 50 FPS（開發 Mac 上量度；展場機另行驗證）。
- skill 每輪結束都要按 owner 意見改寫自己嘅規則同清單（**Self-improvement**）。

## Next expected step

已完成。下一步係另項任務：將葵段落正式接入投票流程（見 [resident-aoi](resident-aoi.md) 「合併與正式觸發待辦」），屆時要重新計 beat 時間預算同處理 S1 實時載入卡頓；角色接觸表 `artifacts/resident-aoi/character.jpg` 仍係舊模型，可以順手重新生成。以下係接受前嘅記錄：


等 owner 睇 `r2/s4-level-before-after.jpg` 同 `s4-level-day.mp4`／`s4-level-night.mp4`：S4 而家係胸口高度嘅中近景，兩隻手臂都見到；同時確認頸同膊頭連貫（`before-after-S4-v3.jpg`、`before-after-S2-v3.jpg`）。之前未回覆嘅問題仍然有效：S1→S2 反打要唔要改、S2 塊面唔係四分三側面。光同景深唔再做（owner，2026-11-26）。之後按意見做下一輪（新 session），再做 R1 第 10 步收尾（RESIDENT_SCENE_PLAN、變化總覽、重新生成角色接觸表、merge main）同 skill **Self-improvement**。未 merge 落 main。
