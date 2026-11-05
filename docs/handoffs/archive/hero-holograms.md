# hero-holograms — Hero 全景 hologram 廣告／資訊

- Owner: cc100053
- Status: DONE（owner 2026-11-02 接受 R5）
- Branch: `feat/hero-holograms`（worktree `.claude/worktrees/feat+hero-holograms`）
- Base commit: c166ae585a0bae0ba5286ca41d724b39ae1662cb
- Last verified commit: 0982a4c532140462a50ba6a21c4143ff2e822c53（R5；之後只改文件）
- Remote availability: origin/feat/hero-holograms

## Session Git state

- Session starting branch and HEAD: `main` 5fb2428（本地 main 落後 origin 7；主 checkout 未提交嘅 skill／artifacts 改動冇郁）
- Last fetched origin/main commit: c166ae5（2026-11-02 fetch 成功）
- Local changes present at session start: 主 checkout 有無關改動；worktree 乾淨
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Hero 全景加入參考圖式浮空 hologram：大型資訊板同虛構 2127 品牌／文化廣告。文字全日文；大部分靜態，少數幾塊顯示 live Meter／提案數據。驗收：owner 目視 hero 日／夜；hero 1920×1080 vsync 60 FPS；四個 site 喺 hero 唔被遮。

## In-scope files and dependencies

Hero 層（`src/` hero 構件、`SHOTS` hero）；`docs/ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md` 加 owner amendment。唔郁 close-up、街道層、survey／module-swap。

## Completed work

- 開 worktree／branch。
- Gemini target 候選（2026-11-02，Sonnet agent 經 Claude in Chrome、`/u/3`，各 1 次）：`gen/hero-day.png`、`gen/hero-night.png`（2730×1536）；對照 `vs-gen.jpg`（左底圖｜右候選）。日：9 塊 panel，鏡頭同塔比例輕微走樣，左上 panel 標題亂碼。夜：11 塊 panel，鏡頭最貼底圖，日文清楚。兩張角落 UI 字都被改壞（實作唔郁 UI）。等 owner 揀圖入 `target/`。
- Owner 睇 R1：位置 OK，hologram「好膠」，要跟參考圖重做設計。R2（prompts.md「R2 重做風格」，R1 候選 + `reference.webp` 兩圖上傳）：`gen/r2-hero-{day,night}{,-2}.png`；對照 `vs-r1-r2.jpg`（左 R1｜右 R2 -2）。進步：地球、人像變 wireframe，邊線細咗、有 corner bracket。仍然膠：大部分 panel 仲有半透明 teal／紫色底、直幡同廣告似實色卡、柱未拆。Gemini 5 小時額度用晒。

- Owner 2026-11-02：**位置跟 R2（夜）、design 完全跟參考圖**。`target/hero-layout-night.png`（= `gen/r2-hero-night-2.png`，只管位置）、`target/hologram-style.webp`（= `reference.webp`，只管物料）。
- `artifacts/hero-holograms/spec.md` R1：13 塊 panel（畫面座標 + 落位方法）、三層物料（玻璃 pane／additive 發光內容／halo）、3D wireframe 地球、`voices` live panel（Meter tier 柱 + 提案數）、程式位置、測試、截圖同 FPS 要求。

## R1（2026-11-02，Sonnet 實作，Opus 審核）

- 新 `src/heroHolograms.ts`（13 塊 panel：玻璃 pane + additive canvas 內容 + halo；`district` 3D wireframe 地球；`tide` 捲動波形；浮動同閃爍；`voices` live：`setVoices`／`setTiers`）、`src/glowTexture.ts`（由 `voteJourney.ts` 抽出共用）、`HOLOGRAMS`（`layout.ts`）、`tests/heroHolograms.test.ts`；`main.ts` 喺 survey view 同 DEV `?meters` 兩條路都餵 count／tiers。Taste 文件加 2026-11-02 owner amendment；PROJECT source map 加一行。
- 同 spec 唔同：落位距離用 panel 覆蓋範圍內最近實體 ×0.82（只用中心點會插入較近建築後面）；`district` 移到 (.225,.35) 闊 .12、`transit` u .22、`daily` v .49，避開 SE 塔／site 橙框。日間 pane `#0f6a86` opacity .62（spec .22 喺 HDR 日景差唔多睇唔到），夜 `#0b4558` .16；線寬約 spec 兩倍。夜間地面反光（optional）未做。軸短詞 RESIDENT_COPY 冇，暫用 人と自律／私と共有／設備と植栽／分散と集中。
- Opus 審核（`r1/vs-target.jpg`、`hero-h16.png`、`hero-h21.png`）：方向啱，已經係「光」唔係膠板，位置貼 target。問題：①日文字 canvas glow 太矇，細 panel（住民の声標籤、空気清浄度、ゆりかもめ、水位）讀唔到；②「台場 2127」、「水位 安定」、「フジ 文化放送」文字同圖形／框重疊；③表演者線稿似樽，唔似人；④日間 pane 偏灰白，參考圖係較深嘅 teal 玻璃；⑤panel 比 target 細，空中 pod 會飛過遮住 `air`。

## R2（2026-11-02，內容打磨）

- Owner：唔要表演者，打磨內容。Spec R2 A–E（`spec.md` 尾段）。
- `culture` 改為 Fuji TV 球體展望室線稿 + 廣播弧 +「フジ」「文化放送」「今夜 20:00」「湾岸フェス」；`performer()` 刪除。文字兩次畫（淡 glow + 實色）、最細 12 px／標題 18 px（test 用 `glyphs()` 檢查）、大 panel 2048 canvas、max anisotropy（`main.ts` 傳入）、每塊固定分區。
- 同 spec 唔同：日間 pane `#083f50` opacity .95 + alpha map（中間 .55、邊 .35、字底 1.0），因為 .45 喺 HDR 日景字會洗白；`district` u .215、`transit` u .19 w .12（避 SE 塔）；`release`、tags、`smartlife` 加大放得落 12 px 字；`air` 0.82·d（計埋 pod）約 155 m，喺 pod 航道前面。
- Opus 審核（`r2/hero-h16.png`、`hero-h21.png`、`vs-target.jpg`、`panels-crop.jpg`）：大進步，大字（台場 2127、スマートライフ、未来の日常、フジ 文化放送、水位 安定、新世代 登場）清楚，版面冇重疊，球體 + 廣播弧好睇。仍弱：細字（空気清浄度、ゆりかもめ 台場駅、住民の声四個標籤、提案 N件、湾岸フェス）原尺寸仲有啲矇；日間字底深色片比參考圖實；線稿密度比參考圖疏；一條 mobility 光帶穿過 `air` 嘅「98.7%」。

## R3（2026-11-02，一個大字 + 科幻細節線條）

- Owner：質感問題係內容；參考圖每塊係一個大字加科幻細節線。Spec R3 A–E。
- 每塊最多兩段字（主 ≥ 30 px、副 ≥ 20 px），細字全刪，用共用細節 kit（circuit、arcGauge、ticks、dotGrid、dataBlocks、crosshair、bracketLines，約 1 px）補位；tags 冇字；`voices` = 「住民の声」+ live「N件」+ 四條冇標籤 Meter 柱。日間 pane `#083f50` .8。
- 位置改動：`release` .075、`smartlife` .04（v .33）、`daily` .035（.675,.44）放得落 30 px 主字；`air` 移到 (.40,.53) 避 pod。
- Opus 審核（`r3/vs-target.jpg` 中間欄係參考圖 panel 裁片）：主字清楚有力，比 R2 更似參考圖。仍差：參考圖玻璃係飽和藍青、有內發光，我哋較淡較灰；細節密度比參考圖「2127」疏；「住民の声」同「120件」貼得太近；日間主字下面深色片似字幕底。

## R4（2026-11-02，減至 8 塊、居民尺度）

- Owner：先刪 `newgen`、`release`、`smartlife`，再刪 `daily`、`tide`；hologram 係俾城入面居民睇，改為貼建築／廣場、面向街道（spec「R4」同「R4 追加」F–I）。
- 剩 8 塊，全部錨定實際位置、真實尺寸、面向居民眼高（`HOLOGRAMS` 有 `face`）：`district` 28×21 m、`culture` 22×16.5 m（Fuji TV 框架北牆，60 m 梁上／下）；`transit` 10×5 m（Fuji podium，ゆりかもめ deck 站前）；`air` 10×5 m、`voices` 16×12 m（Aqua City 海邊立面）；3 個 tag 4×1.35 m（天橋上）。主字高 ≥ 觀看距離 / 40（測試以米計）。
- 玻璃：中心 `#0a4a66` alpha .3 睇得穿、邊緣 `#2fb8e0` 發光、內框、頂部反光、只喺字下面有羽化暗暈；日 opacity .85、夜 .7。細節加密（hex 網、海岸線）；`voices` 主字同件數分兩行（測試 99,999件）。
- 街景截圖用 `?review=ring&cam=…&at=…`（`review=street` 會限制 polar angle，相機升高）。
- Opus 審核（`r4/hero-h16.png`、`r4/panels-crop.jpg` 街景）：街景好睇，`voices`、`air`、`culture`、`transit` 似真實城市屏幕。代價：hero 全景入面 panel 差唔多睇唔到（細，`district`／`culture` 喺 Civic Core 梁後面）；`district` 街景底邊被 60 m 梁切；tag 太細太平淡，`tag-c` 街景被樹遮。

## R5（2026-11-02，放大兩塊地標屏）

- Owner：放大 `district`、`culture`，令 hero 睇到；其餘 6 塊同 R4 一樣。
- 量 Fuji TV 框架北面：樓層梁 y 58–67、頂梁 y 130–135、柱 x ≈ −72／0／60；喺開口入面（z −6.5）會被中柱擋住 hero，所以兩塊貼框架外側 z −19（梁外 1.8 m），冇梁切、唔離建築。
- `district` 48×34 m，中心 (30, 88, −19)，face (30, 62, −110)；`culture` 44×31 m，中心 (31, 48, −19)，face (31, 26, −85)；兩塊相距 7.5 m，`culture` 底邊高過 podium 頂 2.5 m。內容按新比例重排（`observatory` 加 scale 參數）。
- Hero（1600×900）：`district` 86×72 px、「2127」約 26 px，100% 可見；`culture` 80×66 px、「フジ」約 29 px，100% 可見。
- Opus 審核（`r5/hero-h16.png`、`r5/street-culture-h16.png`）：hero 而家一眼見到兩塊地標屏，讀得出「2127」「フジ」，仍然係真實尺寸；街景氣勢好。兩塊上下貼得近，似一組媒體塔；夜景比 R4 暗少少，要喺真螢幕睇。

## Actual validation results

- Verification status: PARTIAL（owner 目視未做）
- Date and checked commit/worktree: 2026-11-02，R1 同 R2 worktree 改動（commit 見 git log）；R2：Opus 重跑 root `npm test` exit 0、`npm run build` exit 0、`git diff --check` clean；Sonnet 量 FPS hour 16 60.0（draws 1081）、hour 21 60.0–60.1（draws 1082），textures 47 → 59；R3：Opus 重跑 `npm test`／`npm run build` exit 0、`git diff --check` clean；Sonnet 量 hour 16／21 60.0 FPS（draws 1081／1082）；R4：Opus 重跑 `npm test`／`npm run build` exit 0、`git diff --check` clean；FPS **未確認**：Sonnet 量到 hour 16 約 40–41（hologram 隱藏都係 40.2）、hour 21 約 40.5–40.8，當時機器 load average 約 3（Opus 16:04 再睇仍然 2.98），所以係機器繁忙，唔係 hologram（只加 26 draws、48 triangles）；要喺空閒機器重量 60 FPS；R5：Opus 重跑 `npm test`／`npm run build` exit 0、`git diff --check` clean；Sonnet 量 hour 16 38.3–39.1（hologram 隱藏 38.3）、hour 21 37.5–38.9，load average 3.2–6.1，同樣係機器繁忙，60 FPS 未確認
- Commands/manual checks and results: Opus 重跑 root `npm test` exit 0（含新 heroHolograms test：13 panel、冇拉丁字母、四 site／Civic Core／畫面中心視線清、tier clamp、「提案 1,284件」）、`npm run build` ✓、`git diff --check` clean。survey／module-swap 冇改，冇跑。
- FPS（Sonnet 量，development Mac headless Chrome，1920×1080，vsync，load 25 s 後讀 canvas `data-fps`）：hour 16 60.0（draws 1081，hologram 隱藏 1039），hour 21 60.0（draws 1082）；triangles +80。
- Evidence: `artifacts/hero-holograms/r1/`（`hero-h16.png`、`hero-h21.png`、`vs-target.jpg`、`style-crop.jpg`）
- 未檢查：headline close-up／orbit 角度下 panel 會唔會入鏡、survey server live 路徑、iPad 流程。

## Known issues and blockers

NONE

## Important decisions

- Owner 2026-11-02：**推翻** CITY_MASTER_TASTE §15「Media is architecture, not advertising」、§4 test「adding holograms」同 hero amendment 嘅 restraint，跟參考圖全面加 hologram 同廣告（只限 hero 全景）。實作時喺 taste 文件加日期 amendment。
- 內容：靜態為主 + 少數 live Meter 數據；語言：全日文；位置：只 hero 全景。
- Panel 數量、邊幾塊接 live 數據：等 target 圖揀定先決定。

## Next expected step

Owner 2026-11-02 接受 R5；`--no-ff` merge 入 main（integration 結果見 git log／main CI）。仍要做：喺空閒機器（load average < 1）量 hero 1920×1080 vsync `hour=16`／`21` 60 FPS；headline close-up、survey live 件數、iPad 流程未跑。
