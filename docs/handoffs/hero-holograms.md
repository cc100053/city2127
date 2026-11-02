# hero-holograms — Hero 全景 hologram 廣告／資訊

- Owner: cc100053
- Status: PLANNED
- Branch: `feat/hero-holograms`（worktree `.claude/worktrees/feat+hero-holograms`）
- Base commit: c166ae585a0bae0ba5286ca41d724b39ae1662cb
- Last verified commit: NONE
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

## Actual validation results

- Verification status: PARTIAL（owner 目視未做）
- Date and checked commit/worktree: 2026-11-02，R1 worktree 改動（commit 見 git log）
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

Owner 確認 `spec.md` 後，Sonnet agent 按 spec 做 R1 實作同截圖（`r1/`），Opus 審核後交 owner。
