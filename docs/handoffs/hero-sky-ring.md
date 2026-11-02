# hero-sky-ring — 空の環（wow 方案 B：一個巨構）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — 已實作；高度 owner 已拍板 250 m（2026-11-02），整體目視驗收仍未做
- Branch: `feat/hero-sky-ring`（由 `feat/hero-atmosphere` `7d09859` 切出；worktree `.claude/worktrees/hero-sky-ring-92de81`）
- Base commit: `7d098593f8de61a40e6d1c3fa404c64143b41378`
- Last verified commit: 本 handoff 所在 commit（root test／build／diff-check PASS）
- Remote availability: NOT PUSHED

## Session Git state

- Session starting branch and HEAD: `claude/hero-sky-ring-92de81` `7d09859`（同 local `feat/hero-atmosphere` 一致）
- Last fetched origin/main commit: `git fetch --prune origin` 成功（2026-11-02）；`feat/hero-atmosphere` 未 push，所以呢條 branch 只喺本機
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED（依 `feat/hero-atmosphere`，兩條都未 merge；owner 驗收前唔 merge）
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 覺得 2127 未夠 wow；方案 A（霧／光）「有好啲但未 wow」。B = 一個固定嘅英雄巨構，要改變城市邏輯（唔係「整大啲」），屬於居民共享、逐步建成嘅基建。驗收：owner 目視 hero 日／夜；hero 1920×1080 vsync 日夜 60 FPS；四個 site 喺 hero 唔被遮；geometry 唔跟 Meter 變。

## In-scope files and dependencies

`src/skyRing.ts`（新）、`src/layout.ts`（`SKY_RING`，`airLoop` 跟環嘅平面）、`src/main.ts`（建環、`guestCount` → 燈點、每幀 `update(dark)`）、`tests/skyRing.test.ts`（新，已加入 `npm test`）。重用 `cityRig` 嘅 `bake`、`trim`／`stone`／`glass`／`futureLight`／`chrome`。冇碰 survey／module-swap、冇新 dependency、冇 UI 文案。

## Completed work

- 700 m 正圓桁架環（中心 −40, −40，同原區域環線一樣），甲板頂 250 m，截面 14 m 闊 × 12 m 深：四條弦桿、豎桿、橫桿、兩側同底面 Warren 斜撐、甲板，外緣一條 `futureLight` 泊靠邊線。全部 `bake` 成每材質一個 mesh（6 batches）。
- 六支 V 型斜柱（角度 `.25, 1.2, 2, 3.25, 4.45, 5.1`）：一個落腳點兩條斜腿上到底弦，三分點橫撐，石台基座。落腳點喺海面或空地；瀏覽器 raycast 確認腿唔撞 skyway、ゆりかもめ、context 建築同樹林；同時避開 hero 對四個 site 嘅視線。
- 十個泊位：外伸 18 m 平台、斜撐返底弦、泊靠邊燈、每個停一架 pod（車隊 pod 比例 ×5）。
- 居民聲音：240 粒燈點吊喺底弦下（內外交替），**只跟提案數量** `view.guestCount` 亮（第 k 位客人亮 `(k*97)%240`，散佈全環；240 位後全亮），從不跟投票方向或 Meter。Standalone／DEV meters 預設 120 粒。日間係淺灰配件、亮咗嘅微暖；夜晚亮燈 HDR（bloom），未亮嘅變暗。
- 區域環線 `airLoop` 由 330×250 m 橢圓改成同環一樣嘅 350 m 圓（高度仍 160–170 m，喺環下約 70 m 沿住飛）；sphere approach 冇改。

## Actual validation results

- Verification status: PARTIAL — 機械檢查同 browser 截圖 PASS；owner 目視 NOT RUN
- Root `npm test` exit 0（新 `skyRing` test：12 條 hero 視線〔四 site × 地面／¼ 高／頂〕、環線維持 160–177 m 並喺桁架下 ≥ 40 m、燈點數量 0／1／57／240／5000／−3）；`npm run build` ✓；`git diff --check` clean。survey／module-swap 冇改，冇跑。
- Development Mac headless Chrome（playwright-cli），1920×1080 DPR1，Vite DEV，載入 25 s 後每 2.5 s 讀 canvas：
  - hero `?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16`：vsync 60.0／60.1／60.0 FPS，draws 983（base 972，+11），triangles 16.35M（+0.08M）
  - 同上 `hour=21`：60.0 ×3，draws 984
  - civic `?review=civic&reviewTime=40&hour=16`：60.0 ×3，draws 456
  - 取樣偶然撞正 shadow 更新幀（1364 draws／21.2M），同之前 handoff 記錄一樣
- Console：0 error／0 warning
- 證據：`artifacts/hero-sky-ring/before-after.jpg`（左：A R2 `artifacts/hero-atmosphere/r1-*`；右：B）、`after-h16.jpg`、`after-h21.jpg`、`civic-h16.jpg`、`spec-height-152-h16.jpg`（160–170 m 版本對照）
- NOT RUN：展覽機 FPS、uncapped FPS、headline close-up 鏡頭（只做咗 civic）、Meter high／low、真 survey server 數量更新、dusk

## Known issues and blockers

- **高度偏離 spec**：hero 實際相機高度係 ~148 m，唔係 `HERO_POSITION` 嘅 120 m（OrbitControls `maxPolarAngle=1.42` 將 c2 鏡頭推高咗）。所以 160–170 m 嘅環剛好喺視平線，只會變成一條切過天際線嘅直橫樑（見 `spec-height-152-h16.jpg`）。250 m 先會喺頂部天空畫出弧線。航道層高度（owner 2026-10-06：160–170 m）冇改；環變成「航道上空嘅共用港」，泊位喺 250 m。
- `guestCount` 喺 live 結果一到就即刻更新燈點，未等 vote journey 到達（方案 C 可以將 journey 光引入環）。
- Civic close-up 見到環邊同斜腿喺天空做背景線，冇遮 Civic Core，但線條多咗。
- 斜柱 1.2／5.1 一帶腿旁邊有 backdrop 樹林（腳唔喺樹林入面，已用 raycast 避開）。

## Important decisions

- 高度：owner 2026-11-02 決定保留 250 m（甲板頂），航道層仍然 160–170 m，環係航道上空嘅共用港。
- 仍等 owner 確認（首次審閱）：② 主功能 = 空中港；③ 燈點按數量 = 有；④ 暫時唔加日文解說卡（任何文案要日文兼 owner 批）。
- 環 geometry 唔跟 Meter；冇能源光束／系纜，唔搶 Q3。

## Next expected step

Owner 目視 `artifacts/hero-sky-ring/before-after.jpg`，決定去留同其餘開放決定。如果接受：喺 `EXHIBITION_SPEC.md` 由「待驗收」改為已接受、跑 headline close-up 同 Meter high／low、量 uncapped FPS；然後先 merge `feat/hero-atmosphere` 再 merge 呢條。

## Close-up polish R1

- Owner/session: cc100053；`/closeup-polish` 改用喺環本身（唔係 Meter site），2026-11-02
- Branch: `feat/hero-sky-ring-polish`（由 `feat/hero-sky-ring` `975370b` 切出）；NOT PUSHED、NOT MERGED
- 固定冇郁：甲板頂 250 m、700 m 平面同 `SKY_RING`、六支斜柱角度 `PYLONS`、燈點只跟提案數量、冇 Meter 依賴、冇能源光束／系纜、冇 UI 文案、冇新材質（重用 `trim`／`stone`／`glass`／`futureLight`／`chrome` 同 `bake`）。
- Target images: NOT RUN — 冇用 Gemini 生成（skill 列為逐個 task opt-in）。今輪以下面嘅診斷做文字 target，owner 直接驗收 after 截圖；如果要圖像 target，下一輪先做。

審閱鏡頭（DEV `?review=ring&reviewTime=40&hour=16`，`hour=21` 睇夜晚；`review=ring` 沿用 street review 嘅 `cam`/`at`，但唔夾 district pan、可以向上望）：

| 鏡頭 | `cam` | `at` |
|---|---|---|
| truss（北面外側，泊位 + 截面） | `23,236,375` | `-57,244,310` |
| pylon（1.2 號斜柱，連 DiverCity） | `323,70,639` | `101,120,323` |
| berth（第 2 個泊位，俯望） | `244,282,276` | `174,250,254` |
| voices（環內由下望底弦） | `-97,200,229` | `-50,236,310` |

診斷 → 改動：

| 症狀（before） | 原因 | 改動 |
|---|---|---|
| 桁架似棚架，冇主次 | 所有弦桿 1.4 m、斜撐 .7 m 同一粗幼 | 底弦 2.2 m（城市睇到嗰條線）、頂弦 1.5 m、豎桿 .9 m、斜撐 .55／.45 m |
| 甲板邊係一塊平板 | 只有板 + 頂面燈線 | 兩側 2.4 m 石面 fascia、1.5 m 玻璃欄河；泊靠燈線移到外側 fascia 面（由下面／外面都睇到） |
| 斜柱係兩條方棍 + 一條平橫樑 | 5 m 方形 member、兩條三分點橫撐、頂部一條 tie | 圓錐斜腿（腳 3.4 m → 頂 2 m 半徑）、腳下石墩（9.2 m 高）+ 鑄件節點、只留 .55 處一條 tie、頂部兩條橫跨兩條底弦嘅 saddle beam |
| 泊位係一塊板，pod 似一疊方盒 | box member 拼 pod | 泊位前緣 fascia + 燈線、兩側玻璃欄河、`futureLight` 泊靠圈、玻璃登機閘口；pod 改成車隊 pod 嘅圓角機身 ×5（圓角艙、玻璃罩、燈龍骨、四個 torus 導管旋翼、兩條 skid） |
| 燈點似浮喺空中嘅波；夜晚未亮嘅變黑波 | 1.3 m 球貼住底弦、未亮色 ×.1 | 每粒有吊桿 + 燈罩（baked 入 `trim`），球 1.0 m、吊低 2 m；未亮夜晚 ×.25（灰色配件，唔再係黑洞） |

Validation（development Mac headless Chrome，playwright-cli，1920×1080 DPR1，Vite DEV，載入 25 s 後每 2.5 s 讀 canvas）：

- hero `?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40&hour=16`：60.0 ×4 FPS vsync，draws 983（不變），triangles 16.43M（+0.08M）
- 同上 `hour=21`：60.1／60.0／59.9／60.0，draws 984（不變）
- civic `?review=civic&reviewTime=40&hour=16`：60.0–60.1，draws 456（不變）
- Root `npm test` exit 0（`skyRing` test：12 條 hero 視線仍然清；頂 254.7 m）、`npm run build` ✓、`git diff --check` clean；survey／module-swap 冇改，冇跑
- 證據：`artifacts/hero-sky-ring/polish/closeups-before-after.jpg`（truss／pylon／berth／voices 夜，左 before 右 after）、每個鏡頭嘅 `*-before-after.jpg`、`after/hero-h16.jpg`、`after/hero-h21.jpg`、`after/civic-h16.jpg`
- NOT RUN：Gemini target images、owner 目視、展覽機 FPS、uncapped FPS、dusk、Meter high／low

Known issues：civic close-up 仍然見到斜腿做背景線（腿而家係圓錐，冇加粗，但冇移位）；登機閘口企喺甲板外側行人道上（14 m 甲板仲有 ~9 m 通道）。

Next expected step：owner 睇 `closeups-before-after.jpg` 同 hero 日夜；接受就 merge 入 `feat/hero-sky-ring`，或者指出下一輪（例如要 Gemini target、加人／加夜間泊位燈）。

## Close-up polish R2（Gemini target）

- Owner 2026-11-02：close-up polish **預設要先用 Gemini 出 target 圖**（R1 跳過咗呢步）。`artifacts/hero-sky-ring/polish/prompts.md` 以 R1 截圖做底圖（`baseline/`，1600×900）；Sonnet agent 經 Claude in Chrome 喺 Gemini `/u/3/app` 生成（truss 試咗 2 次，其餘 1 次），owner 揀晒四張放入 `target/`。`gen/` 同 `target/` 檔案一樣，冇 commit `gen/`。
- 生成時 agent 誤撳過一次 Gemini「分享公開連結」對話框，即刻閂咗、冇複製連結；如果介意，可以喺 Gemini 刪除 "Odaiba Sky Ring Engine Screenshot Redesign" 嗰個 chat。

Target → 改動（`src/skyRing.ts`，重用 `cityRig` 材質，新增用到 `skyGlass`、`leaf`／`leafyCrown`，同 `mobility.ts` 嘅 `pedestrians`）：

| Target 讀到 | 改動 |
|---|---|
| 深而順嘅甲板封邊 + 明顯 mint 線（由下面都睇到） | 封邊 2.4 → 3.2 m；兩側封邊都有 0.55 m `futureLight` 線 |
| 桁架節點係鑄件，唔係交叉方棍 | 每格四個弦桿節點加圓角節點塊（底 3 m、頂 2.2 m） |
| 甲板內側係花園步道 | 每格石花槽 + 連續綠籬 + 三個大小唔同嘅樹冠（`leafyCrown`） |
| 圓角泊位平台、邊緣 mint 帶 | 泊位改成 24 × 19 m 圓角平台 + 一圈 `futureLight` 邊帶；外側欄河喺泊位位開口 |
| 玻璃登機大堂 | 細閘口改成 24 × 5.4 m `skyGlass` 大堂、28 m 白色屋頂、兩條柱 |
| 甲板有人 | 200 個居民（靜止企位；80 個喺各大堂／泊位，其餘喺花園步道），用現有 `pedestrians` |
| Pylon target | R1 嘅圓錐斜腿同 target 已經好接近，冇再改 |

冇跟 target 做：truss target 嘅桁架內下層步道同粗身分節斜柱（同 pylon target 矛盾，亦超出截面）；berth target 嘅人群密度（只放咗 200 人）；夜晚甲板底面嘅城市反光。

Validation（同 R1 方法）：

- hero `hour=16`：60.0／60.1 FPS vsync，draws 983 → **1001**，triangles 16.43M → **17.17M**（+0.73M）；`hour=21`：60.0 ×4，draws 984 → 1002；civic：59.9–60.2，draws 456 → 474。陰影更新幀偶然 1384／22.1M。Console 0 error。
- Root `npm test` exit 0（12 條 hero 視線仍然清，環頂 256.3 m）、`npm run build` ✓、`git diff --check` clean。
- 證據：`polish/r2/vs-target.jpg`（每行：R1 底圖｜target｜R2）、`r2/<shot>.jpg`、`r2/hero-h16.jpg`、`r2/hero-h21.jpg`
- NOT RUN：uncapped FPS（+18 draws／+0.73M 三角形未量裕度）、展覽機、dusk

Next expected step：owner 2026-11-02 揀咗做 R3（見下）。

## Close-up polish R3

Owner 2026-11-02「做 R3」，冇指定方向；Opus 對住同一套 `target/` 揀 R2 最弱嘅三點：

| R2 問題 | R3 改動（`src/skyRing.ts`） |
|---|---|
| 花園樹冠又大又圓、等距排，好似一行波板糖 | 綠籬降低至 0.5 m；每格四團矮灌木（`leafyCrown`，0.75–1.15 倍）加一棵細樹（位置每格交替），整體貼近甲板 |
| `skyGlass` 大堂似實心白盒，睇唔到入面 | 改成通透候機亭：兩面 0.12 m 玻璃牆（新材質 `hallGlass` = `skyGlass` 複製、opacity .3）、每 3 m 一條 `trim` 直框 + 頂框，屋頂同柱不變 |
| 泊位平台由側面睇係平板 | 平台底加 19 × 14 m 圓角 `trim` 腹板，側面讀到係有形狀嘅懸臂 |
| 人太少 | 居民 200 → 320；140 個喺泊位（大堂內、大堂後、平台上各三分一），其餘喺花園步道 |

仍然冇跟：truss target 嘅下層步道同粗身斜柱、夜晚底面城市反光（唔加新光源）；人群仍未及 berth target 咁密。

Validation（同 R1 方法）：

- hero `hour=16`：60.0 ×4 FPS vsync，draws **1001**（同 R2），triangles 17.17M → **17.53M**（+0.36M）；`hour=21`：59.9–60.0，draws 1002。Console 0 error。
- Root `npm test` exit 0（sky ring 視線測試照過）、`npm run build` ✓、`git diff --check` clean。
- 證據：`polish/r3/vs-target.jpg`（每行：R2｜target｜R3）、`r3/<shot>.jpg`、`r3/hero-h16.jpg`、`r3/hero-h21.jpg`
- NOT RUN：uncapped FPS、civic 鏡頭、展覽機、dusk

Next expected step：owner 睇 `r3/vs-target.jpg`，接受就 merge 入 `feat/hero-sky-ring`，或者指出 R4。
