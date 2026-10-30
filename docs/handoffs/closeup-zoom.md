# closeup-zoom — 近鏡「先推近、後變化」、推得更近、主體要好睇

- Owner: cc100053（產品／審美最終批准，**全部做完先一次過 review**）；實作：Codex（開工時喺「進度」記低 session／thread id）
- Review 模式（owner 2026-10-29）：長任務，T → F → A 中途**唔使停低等 owner 睇圖**。Codex 自己按下面嘅數字標準同 self-review 判斷，連續做落去；最後交一份總 review 包（見「最終交付」）。
- Status: IN PROGRESS（2026-10-29；T 實作中，F／A 未開始）
- Branch: `feat/closeup-zoom`（由 verified main 開；T、F、A 三個 checkpoint）
- Base commit: `2050883e93082af4f96da680c59a7de152fea853`（2026-10-29 fetch，main／origin/main 0/0）
- Last verified commit: `b05779fe669ab361bdc29c1889b74ab218fa10af`（T root test/build/diff；browser 部分驗證）
- Remote availability: `origin/feat/closeup-zoom` at `b05779fe669ab361bdc29c1889b74ab218fa10af`

## Session Git state

接手 agent 開工時自己填，唔好沿用寫計劃時嘅狀態。

- Session starting branch and HEAD: `main` `2050883e93082af4f96da680c59a7de152fea853`（主 checkout；獨立 clone）
- Last fetched origin/main commit: `2050883e93082af4f96da680c59a7de152fea853`（2026-10-29）
- Local changes present at session start:（主 checkout 有未追蹤 `.playwright-cli/`、`.task-relay/`，唔好郁）
- Upstream integration status: main / origin/main 0/0；由此建立 task branch
- Pending Git conflicts or synchronization blockers: NONE

## Owner 2026-10-29 反映嘅三個問題

1. **推得唔夠近**：訪客唔知要睇邊度。
2. **次序錯**：而家係一邊飛一邊變；應該係「先推近，到咗先變」。
3. **主體近睇唔好睇**：推到近鏡之後，target 本身唔靚。

呢份文件取代 [headline-camera](headline-camera.md) 同 [closeup-next](closeup-next.md) 入面「近鏡同 transition 重疊、唔准延遲 transition」嗰條規則（owner 2026-10-29 改：**先推近、後變化**）。其餘 headline 規則（揀 shot、中斷、cancel、catch-up、reduced motion）不變。

## Claude review（2026-10-29，main `00fc5c6`）

### 問題 2 — 時間線（根因清楚，code 改動細）

而家（[headlineCamera.ts](../../src/headlineCamera.ts) `shotTimeline`、[main.ts](../../src/main.ts) line 198、line 176）：

| 秒 | 鏡頭 | 場景 |
| --- | --- | --- |
| 0–2.62 | hero，vote journey | 未變 |
| 2.62–4.12 | **飛入**（`FLY_IN` 1.5 s） | **transition 同時開始**（`applyExhibitionLayout(..., now+ARRIVAL_SECONDS)`），飛到嗰陣已經變咗一半 |
| 4.12–5.62 | hold | transition 後半 |
| 3.0 | — | 原因文字出現（[surveyAtmosphere.ts](../../src/surveyAtmosphere.ts) line 291–293，`transitionMs` 由收到結果起計），鏡頭仲喺半空 |
| 13–15 | 飛返 hero | — |

結果：訪客冇機會喺近鏡睇到「變之前」，亦睇唔到完整變化；pulse／marker／light shaft 亦喺飛行中開始，近鏡到位時已經過咗高峰。

### 問題 1 — 距離同主體大小（實測）

Hero 距離 target ≈787 m。現行 shot 距離（position→target）：

| Shot | 距離 m | 主體 bbox 佔畫面（寬×高） | 備註 |
| --- | --- | --- | --- |
| ne:focal | 148 | 36% × 52% | 主體係圓形花槽，被藍色塔同 lollipop 樹搶眼 |
| sw:focal | 124 | 46% × 58% | 左邊三分一被前景圓柱塔擋住 |
| se:focal | **329** | **11% × 27%** | 根本認唔出邊棟係主體 |
| nw:focal | 225 | **11% × 25%** | 細藍箱夾喺高塔中間；+2 變化（後面多一棟玻璃塔）好難發現 |
| ne:district | 372 | 成個 district > 畫面 | 0 同 +8 並排幾乎一樣 |
| nw:district | 356 | 同上 | 同 ne:district 望住差唔多同一段岸 |
| se:district | 445 | 同上 | 細版 hero |
| sw:district | 440 | 同上 | 幾乎正俯視，畫面一半係海 |
| energy:* | 87–159 | 部件喺 `?shot=` 狀態未建，冇量 | 目測 OK；garden 有兩支前景白柱切過畫面 |

量度方法：`npm run dev`，開 `?shot=ne:focal`，再喺 console 逐個 `cityShot(id)`＋`cityShotFrame(id)`（[devShotFrame.ts](../../src/devShotFrame.ts)），1600×900 viewport。District 嘅 subject 係成個 district group，所以 bbox 大過畫面——**呢個本身就係問題：district shot 冇一個可以讀嘅主體**。`hits`（9 點 raycast）只作診斷，[closeup-next](closeup-next.md) 已經講明 A3 ray 量度唔可靠。

並排圖（全部係現行 main pose；S0 baseline 用於未改嘅 shot，C1 final 用於已收嘅 4 個）：
- [focal + hero](../../artifacts/closeup-zoom/review/sheet-focal.jpg)
- [district（含 0 vs +8）](../../artifacts/closeup-zoom/review/sheet-district.jpg)
- [energy](../../artifacts/closeup-zoom/review/sheet-energy.jpg)

### 問題 3 — 主體唔好睇（逐個）

已知背景：[closeup-next](closeup-next.md) 決定入面已經寫低「focal 設施認唔出（se、nw V1）要改設施設計」同「全城 V3 植栽（棒棒糖樹、格仔盆景）要另開設計任務」。今次 owner 要求處理，所以 A 階段就係做呢個，但**只限四個 focal 主體同佢哋嘅近鏡範圍**，唔做全城植栽。

- **NE お台場海浜公園（environmentPark）**：橙框入面係一個圓花槽加一叢 lollipop 樹，似玩具；周圍平草地。要用形態（層級台地、岸邊 edge、厚身 canopy）表達「環境」，唔係加樹數量（見 memory／[CITY_MASTER_TASTE](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)：綠化要飽滿，未來感靠邊緣同台地，唔好疏格仔）。
- **SW アクアシティ南（commonsPlaza）**：主體係一個細涼亭，`COMMONS` 牌被切；廣場係一塊平草。近鏡應該見到「共享」活動：上蓋、座位、人群、攤位。前景圓柱塔要用 pose 避開，唔係搬建築。
- **SE フジテレビ東（concentrationTower）**：喺近鏡入面同旁邊幾棟塔混埋。要一個獨特天際線（塔頂／冠部、Meter 色帶、平台），令 2 秒內認得出「呢棟就係」。
- **NW デックス西（automationHub）**：鏡頭由上望落，見到嘅主要係屋頂；而家屋頂冇內容。屋頂要講「自動化」（物流甲板、drone pad、輸送線）。Tier 變化要喺近鏡一眼睇到。
- **橙色 marker 框**：線幼、平貼地面，近鏡入面唔夠突出；只有 focal 有，district 冇。

## 目標同驗收

### T — 時間線（先做；code 為主）

新時間線（由收到 live 結果起計，`DISPLAY_MS` 維持 13 s、lease 18 s，**唔改 survey**）：

| 階段 | 開始 s | 長度 s | 內容 |
| --- | --- | --- | --- |
| journey | 0 | 2.62 | hero，四粒票落 site（不變） |
| fly-in | 2.62 | `FLY_IN` = 2.0 | 由 1.5 加長，787 m→≈120 m 太急 |
| settle | 4.62 | `SETTLE` = 0.5 | 近鏡入面睇清「變之前」 |
| change | 5.12 | 3.0 | `SITE_TRANSITION_SECONDS`；pulse／marker／shaft 由呢刻開始 |
| hold | 8.12 | 至 13 | 睇「變之後」；原因文字喺 8.12 出現 |
| fly-out | 13 | 2.0 | 同 ambient 卡同步（不變） |
| done | 15 | — | < 18 s lease |

- `shotTimeline` 加 `change`（= hold + SETTLE）同 `changeEnd`（= change + `SITE_TRANSITION_SECONDS`）。數值只喺 `headlineCamera.ts` 定義一次。
- **Chicken-and-egg**：`applyExhibitionLayout` 一次過計 changes 同排 transition 開始時間，但 shot 要由 changes[0] 揀。唔好計兩次 layout。做法：live 結果、motion 開、有 `headlineCamera`、`displayMs >= DISPLAY_MS - 100` 時，**一律**用 `now + shotTimeline(displayMs).change` 做開始時間；否則照舊 `now + ARRIVAL_SECONDS`。冇 headline 嘅結果只有 quiet 變化，喺 hero 遲 2.5 s 冇壞處。兩個 caller 都要改：survey 分支（`main.ts` line 198）同 DEV `playMeters`（line 176）。
- 原因文字：`surveyAtmosphere.ts` 而家用 `SITE_TRANSITION_SECONDS*1000`（3 s，由收到起計），改為新時間線嘅 `changeEnd`（8.12 s）。注意 `headlineCamera.ts` 已經 import `surveyAtmosphere.ts`（`energyChangedPart`），反方向 import 會循環——將時間線常數放喺唔 import surveyAtmosphere 嘅地方（例如 `voteJourney.ts` 旁邊或者一個細 `resultTimeline.ts`），兩邊都 import 佢。Catch-up（`displayMs < DISPLAY_MS-100`）照舊即時顯示原因。
- 能源講解 N1（[energyNarration.ts](../../src/energyNarration.ts)）用 `t.hold` 開始、`t.flyOut` 結束，會自動變成 4.62–13 s（8.38 s，每步 ≈2.8 s）。**保留**呢個 window：部件 fade-in（5.12–8.12）期間講第一步「充能」係合理。唔好縮到 changeEnd 之後（只剩 4.9 s，日文讀唔切）。
- 中斷：新結果喺 0–5.12 s 之間到（上一個 change 未開始），要確認 `CityChangeManager` 對「未來開始時間」嘅 supersede 行為正確（以前只係 2.62 s 未來，而家係 5.12 s）。加 test。
- 測試要改：`tests/headlineCamera.test.ts` line 42–45（`flyIn === ARRIVAL_SECONDS` 保留；`hold < ARRIVAL+TRANSITION` 改為 `change >= hold`、`changeEnd <= flyOut`；`shotStage(3)` 註解）、`tests/energyNarration.test.ts`（8.88 → 8.38）、surveyAtmosphere 原因時間嘅測試（如有）。新增：時間線常數唯一來源；live 開始時間 = change；catch-up／reduced motion 仍即時。
- 驗收：live browser 截三張／shot：4.9 s（到位、未變）、6.6 s（變緊）、9.5 s（變完＋原因文字）。三張要係同一個構圖，第一張睇到「之前」。

### F — 構圖（推近；改 `SHOTS` 為主）

- **Focal**：主體 bbox 佔畫面高度 **45–65%**、寬度 ≥ **25%**，中心喺 x 0.35–0.65、y 0.35–0.65。用 `cityShotFrame` 量，取變化**之後**嘅狀態，同埋 tier −2／0／+2 都要過（nw +2 會加高）。目標距離大約 90–160 m；se／nw 要大幅推近。
- **District**：唔再拍「成個 district」。改為 focal 稍為拉闊：focal 主體保持喺畫面中間三分一、高度 ≥ 25%，同時見到 ±2／±3 實際改咗嘅 carrier。距離 ≤ 260 m。先查 `CarrierChange`／`districtMeters.ts` 有冇改咗嘅 slot 位置可以用；如果冇，就用 authored pose，唔好為此改 protocol。ne:district 同 nw:district 要望唔同嘢。
- **Hold 慢推**（建議做，細改動）：hold 期間由 pose 沿 target 方向再推近 6–8%（smoothstep），令畫面有焦點感；fly-out 由當時位置開始，唔准跳。測試要覆蓋。
- 保持現有規則：FOV 42° 唔用嚟代替推近；鏡頭由 hero 那側望（`p.x<target.x||p.z<target.z` test 保留）；最少一個地標或海做定位；唔准跨 near plane。測試距離下限 40 m 保留。
- 前景遮擋：sw:focal 左邊圓柱塔、energy:garden 兩支白柱，用 pose 避開。
- 驗收：13 個 shot 嘅 `?shot=` 截圖 + live hold 截圖，同現行並排（用 `artifacts/closeup-zoom/review/` 嘅 sheet 做 before）。附 `cityShotFrame` 數字表。Codex 自己逐張睇圖 self-review，過咗就繼續 A。

### A — 主體美術（四個 focal；每個 site 一個細 checkpoint）

- 範圍：上面「問題 3」四個 focal builder（`src/siteBuilders/environmentPark.ts`、`commonsPlaza.ts`、`concentrationTower.ts`、`automationHub.ts`）同 marker（`createGuestMarker`，`siteRuntime.ts`）。次序 ne → sw → se → nw（headline 出現頻率）。
- 規則：
  - 重用現有材質／instancing／baked batches；唔加 dependency，唔加外部素材包。
  - 唔改 footprint、socket 位置、tier 數目、Meter 邏輯。
  - 綠化重形態唔重數量；唔好加直身樹幹或 lollipop 樹（A sector 曾經因為咁被棄用）。
  - 每個 site draw calls 比 main 增加 ≤ 10%（C sector 去到 124% 被棄用）；hero 同近鏡 FPS 實測記錄。
  - 相鄰 tier 並排，要兩秒內講得出邊張變咗：Codex 先自己判斷並記錄；最終由 owner 喺總 review 確認（沿用 closeup-next 嘅 hard gate）。
  - Hero 距離嘅樣子唔可以變差：每個 site 交 hero 前後對比。
- Marker：只喺近鏡期間（change 開始到 hold 完）加粗／微微浮起，令訪客知道「睇呢度」；hero 樣子不變。如果做唔到唔影響其他，就留低唔做並記錄。
- 每個 site：`?shot=<site>:focal` 同 `:district`、tier −2／0／+2、日（12:00）夜（22:00）原圖，放入總 review 包。

## In-scope files

- 修改：`src/headlineCamera.ts`、`src/main.ts`（兩個 apply caller）、`src/surveyAtmosphere.ts`（原因時間）、`src/energyNarration.ts`（只限跟新時間線，唔改講解內容）、四個 focal builder、`src/siteBuilders/siteRuntime.ts`（marker）、相關 tests、root `package.json`（如新增 test）。
- 可能新增：時間線常數小檔、`artifacts/closeup-zoom/**` 證據。
- 唔包括：survey server／shared 協議／`DISPLAY_MS`；tier／ladder／headline 揀選規則；全城植栽語言；district 其他 carrier 美術；能源部件模型；hero pose；module-swap；部署。

## 文件同步

- `AGENTS.md` 工作約定「headline close-up overlapping that transition」改為「zoom in first, then the change」及新秒數。
- `docs/PROJECT.md` line 61（Hero camera 段）、63（N1：4.12 → 4.62、8.88 → 8.38）、96（transition 開始時間）。
- `docs/EXHIBITION_SPEC.md` line 81／83（近鏡時間線、原因文字時間）。
- `docs/RESIDENT_COPY.md`「大屏幕：変化の理由」段如有寫時間要更新。
- `docs/VALIDATION.md`：實際指令結果、截圖路徑、實測 FPS。
- `docs/handoffs/README.md` 同本文件狀態。

## 驗證

- 每個 checkpoint：root `npm test && npm run build && git diff --check`。Survey 冇改就唔使跑。
- Browser（scratch，唔好郁 5173／8788）：
  - `SURVEY_PORT=8798 npm run dev:auto --prefix survey`
  - `npm run dev -- --port 5184`，開 `http://127.0.0.1:5184/?survey=ws://127.0.0.1:8798/ws`，City 分頁保持喺前面（背景分頁停 rAF）。
  - 送提案觸發四個 focal、最少兩個 district、兩個能源、一個冇變化；可以用現有 runner（`artifacts/closeup-next/C1/live.mjs`、`run-captures.sh`）改時間點。
  - 中斷：hold 中 reload、admin Undo、A/B 3 s 內兩份（**特別測第二份喺 2.62–5.12 s 之間到**）、reduced motion → 全部即時 hero、冇瞬移、冇殘留 pending transition。
  - Console error 0；記錄 hero 同近鏡 `data-fps`／`data-draw-calls`（只寫實測數字同機器）。
- 完成後停晒自己開嘅 server。

## Important decisions

- 2026-10-29 owner：近鏡次序改為「先推近、後變化」；推唔夠近；主體近睇唔好睇。要求 review 後交 Codex 打磨。
- 2026-10-29 Claude（寫計劃，owner 可推翻）：
  - `DISPLAY_MS` 唔改，13 s 夠放 2.0 s 飛入＋0.5 s settle＋3 s 變化＋4.9 s 睇結果。
  - 能源講解 window 跟 `t.hold`（4.62–13 s），唔縮到變化之後。
  - 冇 headline 嘅 live 結果都用同一個延遲開始時間，避免為揀 shot 計兩次 layout。
  - District shot 重新定義為「拉闊嘅 focal」，唔再拍成個 district。

## Known issues and blockers

- 未知：`CityChangeManager` 對 5.12 s 未來開始時間嘅 supersede 有冇邊界問題（T 階段要測）。
- A 階段係美術工作，最終要 owner 睇圖。每個 site 最多三輪；三輪都達唔到自己嘅標準，就揀最好嗰輪（或者保留 main 原樣），記低原因，繼續下一個 site，唔好卡住成個任務。
- 展示機 FPS、真人辨認、A/B 實機仍未測（沿用 F3）。

## Next expected step

1. Preflight（AGENTS.md），由 `00fc5c6` 或之後嘅 verified main 開 `feat/closeup-zoom`。
2. 做 T：時間線＋測試＋live 截圖 → checkpoint commit，push feature。
3. 做 F：pose＋hold 慢推＋量度表 → checkpoint commit，push。
4. 做 A：ne → sw → se → nw，每個 site 一個 checkpoint commit，push。
5. 全部做完：整合驗證，交「最終交付」嘅 review 包，**停低等 owner 一次過 review**。Owner 批准之後先照 [CONTRIBUTING](../CONTRIBUTING.md) merge main 同確認 main CI；owner 可以只收部分 checkpoint（例如只收 T＋F），所以每個 checkpoint 要可以獨立 revert。

## 最終交付（owner 一次過 review 用）

放喺 `artifacts/closeup-zoom/final/`，加一個 `README.md` 做入口：
- T：每個 live shot 三張一組（4.9／6.6／9.5 s），同現行 main 嘅同一時間點並排。
- F：13 個 shot before／after 並排 sheet，加 `cityShotFrame` 數字表（主體寬、高、中心）。
- A：每個 site hero 前後、近鏡前後、tier −2／0／+2 並排，日夜各一。
- 每個 checkpoint 嘅 commit SHA、改咗乜、自評（過／唔過同原因）、draw calls 同 FPS 實測。
- 未做到嘅項目同建議（例如邊個 site 三輪都唔滿意）。

## 進度

2026-10-29：由協調 session `01a187f8-f4b4-7d01-9817-76ed476e890a` 派 subagent 在獨立 clone 實作；T 程式及 targeted tests 完成，五組 scratch live 20/20、errors 0；root test/build PASS，F / A 未開始。餘下 live shot、A/B 早到及 no-op 未驗。新 8.38 s 能源講解中最長文字約 5.4 字／秒，待真人閱讀測試。補修無 `displayAt` 的 reduced-motion 理由即時性；正常 server 的 reduced-motion ambient UI 補測 4/4、errors 0。

2026-10-30 續作：遠端 fetch 等待約 1 分鐘無回應而中止；遠端新鮮度未能重新核實。保留現有 feature checkout／F 未提交工作；整合或推送前必須重試。

F 候選自評：NE／SW focal 達數字範圍；SE／NW focal 未達、SW 等 district carrier 不可讀；整體 FAIL，詳見 [量度及原圖](../../artifacts/closeup-zoom/final/F-review.md)。保留未通過項目供 A 與後續驗證，不視作 owner 接受。
2026-10-30 限時重試 fetch 成功：`origin/main` 前進至 `f91236b`（新增 guest-agency 計劃，明確依賴本任務先完成）；本 feature 與其 remote 0/0。按流程未自動 merge；整合前須再核對。

A NE（2026-10-30）：三輪均未達自評，保留既有公園程式；原因、數字、原圖及 R3 patch 見 [NE review](../../artifacts/closeup-zoom/final/A-ne-review/README.md)。不視為美術完成或 owner 接受；繼續 SW。

A SW（2026-10-30）：三輪活動仍難辨、牌字仍裁切，保留 F checkpoint 原設計；[SW review](../../artifacts/closeup-zoom/final/A-sw-review/README.md) 保存圖、patch 及效能。Per-site draw calls 未獨立測，未驗收；繼續 SE。
