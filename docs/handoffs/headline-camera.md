# headline-camera — 近鏡跟住 headline 變化

- Owner: cc100053（產品決策）；實作 Codex worker `01a17b81-4af3-7bf3-9512-a451a5198d53`
- Status: REVIEW_READY — implementation and local software checks complete; main merge requires owner approval
- Branch: `feat/headline-camera`
- Base commit: `00c0273`（main：ladder 整合同 main CI 記錄之後）
- Last verified commit: `9335b6d627cd5d6175a13936cb45c0e34708ab33` (exact validated source / tests / original evidence)
- Remote availability: `origin/feat/headline-camera` @ `9335b6d627cd5d6175a13936cb45c0e34708ab33`; implementation pushed successfully, metadata follow-up carries this verification record

## Session Git state

接手 agent 開工時自己填，唔好沿用寫計劃時嘅狀態。

- Session starting branch and HEAD: `feat/headline-camera` / `bdb22465d34eb1aa7ebc0175ce067d581c7b7495` (independent clone `.task-relay/headline-camera/checkout`)
- Last fetched origin/main commit: `00c02737650008a450bd8f08e1a491ad023c77d2`; fetch succeeded (initial sandbox DNS failure recovered with approved network access)
- Local changes present at session start: none; source checkout and its unrelated untracked files untouched
- Upstream integration status: branch matches `origin/feat/headline-camera` (0/0), main baseline is its parent; no pull/merge/rebase needed
- Pending Git conflicts or synchronization blockers: none

## 背景（冇睇過之前對話都要讀）

- [分級階梯＋headline](meter-ladder.md) 已經 merge 入 main（`0b84a29`）：
  - 每份 v2 提案最多令一個 site 升或降一格。Tier 範圍係 −3..3：±1 只郁 focal，±2 郁半個 district，±3 郁完整 district。
  - `pickHeadline`（`survey/src/shared/cityView.ts`）揀出一個 headline 變化：只有佢有 pulse、marker 同結果卡，其他變化靜靜轉。
- `CityChangeManager.applyExhibitionLayout`（`src/cityChangeManager.ts`）會回傳 `CarrierChange[]`。Headline 排第一位，並且帶 `headline: true`。
  - 能源變化嘅形狀係 `{ socketId: 'ne', focal: false, district: true, energy: { before, after } }`。
  - 呢個 list 喺 vote journey 開始嗰刻（`main.ts` 嘅 survey 分支）已經計好，所以鏡頭可以同 journey 同步排程。
- 而家嘅鏡頭行為：
  - 鏡頭固定喺 hero pose（`src/heroCamera.ts`：`HERO_POSITION` (-520,300,-620)，`HERO_TARGET` (-40,25,-60)，FOV 42°）。
  - `docs/PROJECT.md` 嘅 Hero camera 段寫明「No automatic camera reframing」。今次任務係 owner 2026-10-27 決定改呢條規則：只限 live 結果嘅 headline 近鏡。
- 時間線（唔准改）：
  - Live 結果先播 ≈2.62 s vote journey（`ARRIVAL_SECONDS`，`src/voteJourney.ts`），然後係 3 s site transition（`SITE_TRANSITION_SECONDS`）。
  - 閱讀時段 `DISPLAY_MS` 係 10 s，之後 `HANDOFF_MS` 5 s；result lease 由 display start 起計 15 s（`survey/src/shared/displayTiming.ts`）。
  - 結果卡喺 result 後 3 s 換成原因文字，10 s 後轉返 ambient 卡（`src/surveyAtmosphere.ts`）。
- 參考做法（**唔好 merge，亦唔好依賴**）：`feat/energy-demo-camera` 嘅 `016f6d1:src/devEnergyDemo.ts`。
  - 佢有純函數 `demoTimeline`／`demoStage`、smoothstep 飛入飛出、`controls.enabled = false`、snapshot 即時 cut 返 hero。
  - 五個能源近鏡 pose：garden、garden2、ring、wing、island。可以用 `git show 016f6d1:src/devEnergyDemo.ts` 抄數值做起點。
  - 佢為咗飛入將 transition 延遲咗 3 s。**今次唔可以咁做。**
- 寫計劃時嘅模擬（main 階梯，200 輪 × 40 位訪客）：
  - 73% 提案啱啱一個 site 郁一格，27% 冇格變。
  - 格變入面 39% 係 focal、61% 係 district。
  - 一場入面最先出現嘅通常係 ne → sw → se → nw。
  - 約 38.7% 格變係將同一 site 上一步拉返轉頭；owner 決定暫時唔調。

## Goal and acceptance criteria

Live 結果（`city-state-updated` 加上 `latestProposal`）有 headline 變化時：
1. vote journey 照舊喺 hero pose 播完，觀眾睇得到四粒票落四個 site；
2. 鏡頭推近 headline 嘅位置；
3. 閱讀時段內停喺近鏡；
4. 之後返去 hero pose。

冇 headline 嘅結果（冇格變、冇能源變化）唔推近；如果接續仍 active 嘅近鏡，先用2秒平滑返回，再留喺 hero。

完成條件：
- [x] 一張鏡頭清單（shot list）。每個 site 有 focal 同 district 兩個 pose，每個能源部件一個 pose。清單係常數表，DEV 可以逐個跳去睇。
- [x] 揀 shot、計時間線嘅都係純函數，並有測試（見「測試」）。
- [x] 以下情況全部即時 cut 返 hero，唔播近鏡：snapshot、reset、Undo、reconnect、`prefers-reduced-motion`、legacy v1、standalone 同各 DEV review 模式。
- [x] 鏡頭到嘅地方同結果卡「街の画面：…」講嘅地點一致。
- [x] Root `npm test`、`npm run build`、`git diff --check` 通過；survey 冇改就唔使跑。
- [x] 用 scratch `survey dev:auto` 做 browser check，每個 shot 至少一張截圖，並記錄 hero 同近鏡嘅 `data-fps`。
- [x] 文件同步及 feature push 完成；**merge main 之前問 owner**。

## 預設設計（owner 未另外講就照做）

### 時間線（秒，由收到 live 結果起計）

| 階段 | 開始 | 長度 | 備註 |
| --- | --- | --- | --- |
| journey | 0 | `ARRIVAL_SECONDS` ≈2.62 | 留喺 hero，同現在一樣 |
| fly-in | `ARRIVAL_SECONDS` | `FLY_IN` = 1.5 | smoothstep。Transition 喺同一刻開始（唔延遲），所以 3 s transition 嘅後半一定喺近鏡入面睇到 |
| hold | ≈4.12 | 到 `DISPLAY_MS/1000` = 10 | 原因文字喺 3 s 出現，到時已經喺近鏡 |
| fly-out | 10 | `FLY_OUT` = 2 | 同結果卡轉 ambient 同步 |
| done | 12 | — | 一定要喺 15 s lease 之前返到 hero，下一位訪客由 hero 開始 |

- `FLY_IN`／`FLY_OUT` 係常數，喺 `headlineCamera.ts` 調。改咗要寫入 handoff。
- 如果 server 傳嚟嘅 `displayMs` 少過 `DISPLAY_MS - 100`（surveyAtmosphere 用嚟判斷「即時顯示原因」嘅條件），代表呢個係追趕中嘅結果：唔播近鏡，留喺 hero。

### 中斷規則

- 近鏡途中再嚟一個 live 結果（A/B 雙站有可能）：由**當前鏡頭位置**開始播新嘅時間線。新 journey 期間先飛返 hero（用 `FLY_OUT`，可以同 journey 重疊），再飛去新 headline。唔准瞬移。
- 近鏡途中收到 snapshot、reset、Undo 或 reconnect：即時 cut 返 hero（同 energy demo 嘅 `finish(true)` 一樣）。
- 結果卡喺 10 s 轉 ambient 嘅時候，鏡頭一定要已經開始 fly-out，兩樣唔可以唔同步。

### Shot 選擇

純函數 `headlineShot(change: CarrierChange | undefined): ShotId | null`：
- `undefined` → `null`（留喺 hero）。
- 有 `socketId` 而冇 `energy`：
  - `change.focal && !change.district` → `${socketId}:focal`（±1 格）。
  - 其他 → `${socketId}:district`（±2／±3 格）。
  - 如果 focal 同 district 同時變，用 district。
- 有 `energy` → 用同結果卡完全一樣嘅次序揀部件：waterGardens → receiver → flywheel → island（`residentResult` 嘅 energy 分支）。
  - 將呢個次序抽成一個共用純函數，例如 `energyChangedPart(before, after)`，放喺 `src/surveyAtmosphere.ts` 或者 `survey/src/shared/energy.ts`。`residentResult` 同鏡頭都用佢，保證卡片地點同鏡頭一致。
  - waterGardens 由 1 變 2 → `energy:garden2`，其餘 waterGardens 變化 → `energy:garden`；receiver → `energy:wing`；flywheel → `energy:ring`；island → `energy:island`。
- 部件被移除都照樣推近，影嗰個位置變空。卡片亦會講「配置から外れました」。

### Shot list（起點值，之後逐個打磨）

常數表 `SHOTS: Record<ShotId, { position: [x,y,z]; target: [x,y,z]; fov?: number }>`：
- **四個 focal**：對準 `changeSites`（`src/layout.ts`），由 hero 嗰邊（西南偏南，-X/-Z 方向）望過去，距離大約 80–160 m，高度 40–90 m。
  - nw デックス西 (40,-300)
  - ne お台場海浜公園 (-210,-135)
  - sw アクアシティ南 (-105,60)
  - se フジテレビ東 (175,-45)
  - Focal 單體要佔畫面大約三分一高度。
- **四個 district**：同一方向但退後，連埋 district 範圍一齊入鏡。距離大約 250–400 m。範圍參考 `districtMeters.ts` 各 district 嘅 slot／bay 座標，或者喺瀏覽器用變化物件嘅 `Box3` 估算，然後手調。
- **五個能源**：先抄 `016f6d1` 嘅 POSES：
  - garden [-372,62,-232]→[-306,12,-150]
  - garden2 [-16,48,-452]→[32,8,-392]
  - ring [-118,148,-138]→[-18,96,-24]
  - wing [56,64,-496]→[125,22,-424]
  - island [-142,66,-556]→[-60,4,-470]
- FOV 預設沿用 42°。唔好用 FOV 代替推近。
- 鏡頭由 hero 方向推近，唔好繞去背面，等觀眾保持方向感。
- 檢查每個 pose：focal 主體冇被前景建築、樹或者 canopy 擋住；海、富士電視台、彩虹橋等地標最少有一個留喺畫面做定位。
- 視覺標準跟 [CITY MASTER TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md) 同 [ART](../ART.md)；綠化要飽滿，唔好將近鏡框成空曠嘅格仔地。

## 實作步驟

1. **Preflight**：照 [AGENTS.md](../../AGENTS.md) 做。`git fetch --prune origin`，然後 `git switch feat/headline-camera`。
   - 如果 `origin/main` 喺 `00c0273` 之後有新 commit：呢個分支只有計劃，可以直接 rebase 上最新 main，再 `push --force-with-lease`（只限呢個 task 分支）；或者照 CONTRIBUTING merge 入嚟。
   - 讀：本文件、[meter-ladder handoff](meter-ladder.md)、`docs/PROJECT.md` 嘅 Hero camera 同 survey timing 段、`docs/EXHIBITION_SPEC.md` 嘅 headline 段。
2. **新增 `src/headlineCamera.ts`**：
   - `ShotId` 同 `SHOTS`。
   - `headlineShot(change)`。
   - `shotTimeline()`：回傳 `{ flyIn, hold, flyOut, done }`，由 `ARRIVAL_SECONDS`、`DISPLAY_MS`、`FLY_IN`、`FLY_OUT` 推導。
   - `shotStage(elapsed)`。
   - `class HeadlineCamera(camera, controls)`，有 `play(changes, now, displayMs)`、`cancel()`、`update(now)`、`active`。
   - 寫法跟 `devEnergyDemo.ts`：用 Vector3 lerp 加 `MathUtils.smoothstep`；active 時 `controls.enabled = false`；結束時將 `controls.target` 同 position 設返 `HERO_*`，然後 `controls.update()`。
3. **共用能源部件次序**：抽出 `energyChangedPart`，`residentResult` 改用佢，現有 surveyAtmosphere 測試要照樣通過。
4. **接入 `src/main.ts`**：
   - 只喺 `surveyUrl` 分支 `new HeadlineCamera(camera, controls)`。
   - Live 結果分支（`journey!.play(...)` 嗰度）：攞 `applyExhibitionLayout` 回傳嘅 changes，再 `headlineCamera.play(changes, now, displayMs)`。
     - `displayMs` 而家喺 `startSurveyAtmosphere` 入面，冇傳畀 `apply` callback。要喺 `apply` 加第三個參數，例如 `(kind, view, displayMs)`。改嘅時候要追晒所有 caller。
   - 非 live 分支（snapshot、reduced motion）同 legacy 分支：`headlineCamera.cancel()`。
   - Render loop：`headlineCamera.update(now)` 一定要放喺 `controls.update()` 同 district pan clamp（`panBack`）**之後**。因為 island、wing 嘅 target 喺 `DISTRICT.minZ` -360 之外，如果放喺前面會被 clamp 拉走。Active 時每 frame 由 headline camera 決定 pose，同埋要 `camera.lookAt(target)`。
   - `controls.minDistance` 150 會限制近鏡。Active 時 controls 已經 disabled，加上 pose 喺 clamp 之後直接設定，所以唔使改 OrbitControls 嘅限制。
5. **DEV 工具**（俾之後逐個打磨用，只喺 `import.meta.env.DEV`）：
   - `?shot=nw:focal`：直接停喺嗰個 shot，方便截圖同調 pose。
   - `window.cityShot(id?)`：冇參數就印出當前 camera position 同 target（方便手調之後抄入 `SHOTS`）；有參數就跳去嗰個 shot。
   - `?meters=…&metersTo=se:high`：現有 DEV live 變化路徑都應該播近鏡。喺 `devMeters` 嗰段用同一個 `HeadlineCamera`，冇 survey server 都可以預覽。
6. **測試** `tests/headlineCamera.test.ts`，並加入 root `npm test` script：
   - `headlineShot`：
     - `undefined` → `null`。
     - 每個 socket 嘅 focal-only → `:focal`；district → `:district`。
     - 每種能源變化 → 對應部件，包括移除，同埋 garden 由 1 變 2 → `garden2`。
   - 一致性：對每個能源 case，`energyChangedPart` 揀到嘅部件同 `residentResult(...).place` 對應嘅部件一致。
   - 時間線：
     - stage 次序正確。
     - `flyIn === ARRIVAL_SECONDS`，即係 transition 冇延遲。
     - hold 覆蓋 `ARRIVAL_SECONDS + SITE_TRANSITION_SECONDS` 同原因文字出現嘅 3 s。
     - `flyOut === DISPLAY_MS/1000`。
     - `done < RESULT_LEASE_MS/1000`。
   - `SHOTS` 完整：每個 `ShotId` 都有 pose；`position.y > target.y`；距離喺 40–450 m；pose 喺 hero 嗰側（camera 喺 target 嘅 -Z 或 -X 方向）。
   - `HeadlineCamera` 行為：用 `PerspectiveCamera` 同一個 stub controls（只要 `target: Vector3`、`enabled`、`update()`），喺 node 入面測。
     - play → update 到 hold，camera 喺 shot pose。
     - `cancel()` 即刻返 hero。
     - hold 途中再 play，第一 frame 位置等於中斷時嘅位置（冇瞬移）。
7. **Browser check**：
   - 用 scratch server，唔好郁主 checkout 嘅 5173／8788：
     - `SURVEY_PORT=8798 npm run dev:auto --prefix survey`
     - `npm run dev -- --port 5184`
     - 開 `http://127.0.0.1:5184/?survey=ws://127.0.0.1:8798/ws`，City 分頁要保持喺前面，因為背景分頁會停 rAF。
   - 經 guest API 送提案（`survey/README.md`：`POST /api/proposal-sessions`，然後 `POST /api/proposals`），或者用 `/guest?dev-auto`。依次觸發：
     - 四個 focal。用有偏向嘅投票；第一格通常係 focal。
     - 四個 district。
     - 最少兩個能源部件。
     - 一份冇變化嘅提案。
   - 每個 shot 喺 hold 中段截圖，存去 `artifacts/headline-camera/<shot>.jpg`。
   - 量度：hero 同各近鏡 hold 期間嘅 `data-fps`、`data-draw-calls`（renderer canvas 嘅 dataset，每 120 frame 更新）。
   - Console 唔可以有 error。
   - 中斷：
     - hold 途中 reload 頁面（snapshot）→ 即時 hero。
     - 經 admin 做 Undo（`POST /api/admin/lifecycle`，command `undo-proposal`）→ 即時 hero。
     - A/B 兩站 3 s 內各送一份 → 冇瞬移，最後停喺第二份嘅 headline。
   - Reduced motion：用 DevTools emulate 或 `matchMedia` override → 全程 hero。
   - 完成之後停晒自己開嘅 server。
8. **文件**（跟 [CONTRIBUTING 文件同步表](../CONTRIBUTING.md#documentation-sync)，camera、motion 同 timing 都屬於呢次範圍）：
   - `docs/PROJECT.md`：
     - Hero camera 段刪走「No automatic camera reframing」，改寫成 headline 近鏡規則、時間線，同埋邊啲情況唔播。
     - survey timing 段「Geometry/camera/resources remain unchanged」要更新。
     - 模組表加入 `headlineCamera.ts`。
   - `docs/EXHIBITION_SPEC.md`：headline 段加入近鏡呈現同 shot list 原則。
   - `docs/VALIDATION.md`：新增一段，記錄指令結果、截圖路徑同實測 FPS（只寫真係量到嘅數）。
   - `AGENTS.md` 工作約定入面「live results play ≈2.6 s vote journey and then a 3 s transition」一句，補充之後會推近 headline。
   - 本文件同 `docs/handoffs/README.md` 嘅狀態。
9. **Finish**：
   - Self-review diff。
   - Commit（commit message 結尾加 owner 規定嘅 attribution）並 push `feat/headline-camera`。
   - 喺本文件記錄 verified commit。
   - 問 owner 批准先 merge main。

## In-scope files and dependencies

- 新增：`src/headlineCamera.ts`、`tests/headlineCamera.test.ts`、`artifacts/headline-camera/*.jpg`。
- 修改：
  - `src/main.ts`：survey 分支接線同 render loop 次序。
  - `src/surveyAtmosphere.ts`：`apply` 加 `displayMs`；`residentResult` 改用 `energyChangedPart`。
  - `src/devMeters.ts` 或 `main.ts` 嘅 DEV meters 段。
  - root `package.json` 嘅 test script。
  - 上面列出嘅文件。
- 唔包括：
  - Survey server 同 shared 協議。如果 `energyChangedPart` 放喺 `survey/src/shared/energy.ts`，就要連 survey 都跑 test 同 build。
  - 改 tier、ladder 或 headline 規則。
  - 逐個近鏡嘅美術打磨，即係改模型、材質或者加細節。
  - 自動品質調整。
  - `feat/energy-demo-camera`（只參考，唔 merge）。
  - 回顧章節、變化說明卡。
  - module-swap。

## Actual validation results

- Verification status: PASS (local software); coordinator review / owner merge approval pending.
- Root `npm test`, `npm run build`, production DEV exclusion, `git diff --check`: PASS. Source/new-file exact-diff self-review complete; no survey/module-swap source change.
- [Evidence / reproducible commands / FPS table](../../artifacts/headline-camera/README.md), [manifest](../../artifacts/headline-camera/final/manifest.json), [live](../../artifacts/headline-camera/final/live.json), [recovery](../../artifacts/headline-camera/final/recovery.json).
- 14 static images (hero +13 shots), 14 settled live hold images (13 shots +water garden after Undo), original hashes verified. Development Mac macOS27.0.1 arm64, Chrome156.0.8078.48 headless/ANGLE Metal Apple M6, 1920×1080 DPR1 default/hour12. Hero60.1FPS/998 calls; static59.9–60.1FPS/455–958 calls; actual live59.9–60.1FPS/599–1186 calls. Short canvas cadence only, no sustained/hardware claim.
- Live no-change/reload/Undo/reduced motion/A-B PASS; submissions1006ms apart, ordered display, second own headline. Eight extra real TCP/reset/DEV/legacy/standalone/catch-up checks PASS; shortened-slot uses real-view wire fixture, clearly separated from real server checks.
- Page errors/console errors0. System font fallback explicit. All owned browsers/services closed; Vite5184 and dev:auto8798 confirmed free.
- Main unchanged at `00c02737650008a450bd8f08e1a491ad023c77d2`; feature `9335b6d627cd5d6175a13936cb45c0e34708ab33` pushed successfully. Committed task whitespace and source/image manifest PASS. No main CI claim.
- Integrated commit and checks: NOT INTEGRATED

## Known issues and blockers

- 時間線預設值未經過觀眾測試，例如 1.5 s 飛入係咪太急、10 s 夠唔夠睇清楚。
- 近鏡會放大模型同材質嘅粗糙位，呢啲留畀之後嘅打磨任務。發現嘅問題列喺本文件，唔好喺呢個任務修。
- 未測：展示機 FPS、A/B 實機、iPad。

## Important decisions

- 2026-10-27 owner：系統完成之後下一步做 headline camera，再逐個近鏡打磨；來回轉同 Scale A ramp 暫時唔調。
- 唔可以延遲 journey 同 transition；近鏡同 transition 重疊，唔係排喺佢後面。
- 冇 headline 就留喺 hero；部件被移除都照樣推近。

## Next expected step

1. Coordinator 檢查 pushed branch、exact diff 與原圖／manifest；通過後向 owner 取得 merge main 批准。Worker 已釋放 source ownership，等待具體修正要求。
2. 之後另開打磨任務，以 shot list 做基準，按出現頻率排次序：
   - 先打磨各 site 第一格嘅 focal 近鏡（ne → sw → se → nw）。
   - 再打磨 district（±2）。
   - 然後係 ±3 加配對設施。
   - 最後係能源部件。
   - 每個近鏡一個細任務；每個都要用 `?shot=` 截圖做前後比較，並量 FPS。

## Implementation decisions — 2026-10-27

- Pure helper `energyChangedPart` remains root-side in surveyAtmosphere, avoiding shared protocol/server changes. Result card now uses district place/effect when both flags change, matching the specified shot priority.
- Exact authored timing wins over contradictory prose: reason at 3 s occurs during fly-in; hold starts at 4.12 s and covers transition completion at 5.62 s.
- Current E4 freezes the climate axis. Four site live checks use the preserved v3 question set in a separate fresh scratch server; current v4 scratch checks cover energy and recovery. This does not change exhibition questions.
- New class tests cover selection/removal/location agreement, stage boundaries, controls, current-pose interruption, cancellation and catch-up. No new dependencies/model/material changes.

- Tall focal sites are actually scaled to about 96 m (nw) / 138 m (se), so the initial 80–160 m distance / 40–90 m height hints cropped their upper bodies. Authored focal poses retreat/raise to retain the full tower; the 40–450 m invariant remains. SW uses a lower view beneath the existing sky bridge. District SW aims at the shore rather than the obstructed inland focal. No geometry moved.
- Fly-out uses the actual callback `displayMs` (including the allowed <100 ms delivery jitter), so ambient-card switch and return start share the same deadline. The default pure timeline remains 10–12 s.

- Browser recovery found that the initial DEV media-change listener did not reliably clear a held review camera. The final render loop reads one retained MediaQueryList before camera update and cancels an active shot in the next frame; actual reduced-motion toggle now passes. Live survey also retains its existing queue/model recovery handling.
- First live images were taken at 4.9 s (early hold, before the 5.62 s geometry completion). They are retained locally in `artifacts/headline-camera/drafts/early-hold/`; final live captures move to 8.3 s so geometry is settled and the latest 120-frame FPS window lies fully inside hold.

- Bare `?shot=nw:focal` now initializes neutral exhibition carriers through the existing DEV Meter snapshot helper; explicit energy/housing/scale/street/civic review priority is preserved. `?energy=mixed&shot=energy:ring` remains the explicit energy-composition preview. The final added recovery check covers the bare shot query.

## Delivery checkpoint

- Implementation / validated code commit: `9335b6d627cd5d6175a13936cb45c0e34708ab33` (`feat(camera): follow live headlines with authored close-ups`).
- Feature push succeeded; this documentation follow-up changes no runtime, tests or original evidence.
- Worker report: `.task-relay/headline-camera/result-implementation-1.json` in the source project (outside this independent clone). Writers and owned services released for coordinator review. Main merge remains blocked on explicit owner approval by the agreed plan.

## Coordinator correction 1 — 2026-10-27

- Baseline `5e896846de712a615fff1120e5f8c74a37848d2f`; clean / branch upstream0/0; fresh fetch confirms origin/main still `00c02737650008a450bd8f08e1a491ad023c77d2`. Same owner/clone, no replacement writer.
- `play([])` interrupted hold/fly-out formerly cut to hero. It now uses the shared current-pose return for2s, then stays hero with controls enabled. Fresh no-headline stays hero; nonlive/reduced/catch-up retain immediate cut. Tests cover first-frame continuity, halfway interpolation, final target/position, controls and no new fly-in.
- Real A/B second proposal has identical before/after layout:1018ms commit gap,0.1001m boundary step,6.1096m maximum sampled frame step,65 hero frames after return and controls work. No server/protocol/clock changes.
- SW pose corrected to `[-365,135,-420] → [-180,8,-235]`: changed sharing rooms2/3/4 are central/readable; park is in the right background. Static/live60.0FPS,958/936 calls. New SW original pair plus B-at-hero proof; unchanged original hashes preserved. Full inland court occlusion sweep is not claimed.
- Root tests/build/whitespace PASS again. Build includes existing chunk-size AND odaiba-layout JSON import-attributes warnings (prior report wording corrected). New manifest verifier compares saved hashes; explicit update followed by independent verify PASS, deliberate mismatched hash rejected.
- [Correction evidence/report](../../artifacts/headline-camera/README.md#coordinator-correction-1--2026-10-27), [actual results](../../artifacts/headline-camera/correction-1/browser.json). Final corrective code checkpoint is recorded in the delivery follow-up; main still requires human approval.
