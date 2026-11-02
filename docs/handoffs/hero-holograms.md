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

## Actual validation results

- Verification status: NOT RUN

## Known issues and blockers

NONE

## Important decisions

- Owner 2026-11-02：**推翻** CITY_MASTER_TASTE §15「Media is architecture, not advertising」、§4 test「adding holograms」同 hero amendment 嘅 restraint，跟參考圖全面加 hologram 同廣告（只限 hero 全景）。實作時喺 taste 文件加日期 amendment。
- 內容：靜態為主 + 少數 live Meter 數據；語言：全日文；位置：只 hero 全景。
- Panel 數量、邊幾塊接 live 數據：等 target 圖揀定先決定。

## Next expected step

Sonnet agent 用 Gemini 由 `baseline/` 生成 `gen/` 候選；owner 揀圖抄入 `target/`；之後寫 `spec.md`。
