# hero-sky-ring — 空の環（wow 方案 B：一個巨構）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — 已實作，等 owner 目視同埋拍板高度（見 Important decisions）
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

- 等 owner 拍板（首次審閱）：① 高度 250 m（建議，靚但離開 160–170 m 航道層）定 160–170 m（spec 原意，hero 變橫樑）；② 主功能 = 空中港；③ 燈點按數量 = 有；④ 暫時唔加日文解說卡（任何文案要日文兼 owner 批）。
- 環 geometry 唔跟 Meter；冇能源光束／系纜，唔搶 Q3。

## Next expected step

Owner 睇 `artifacts/hero-sky-ring/before-after.jpg` 同 `spec-height-152-h16.jpg`，決定高度同去留。如果接受：更新 `EXHIBITION_SPEC.md`（巨構同空中港高度）、跑 headline close-up 同 Meter high／low、量 uncapped FPS；然後先 merge `feat/hero-atmosphere` 再 merge 呢條。
