# se-build-transition — SE 起樓／拆樓轉換測試

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — 原型完成，待 owner 睇效果決定去留／套用範圍
- Branch: `feat/se-build-transition`
- Base commit: `f35fe178a7eb8efae04efa59b1b0f4170b2e3241`
- Last verified commit: 本 commit（root test／build／diff-check PASS）
- Remote availability: `origin/feat/se-build-transition`

## Session Git state

- Session starting branch and HEAD: `main` `f35fe17`
- Last fetched origin/main commit: `f35fe17`（2026-11-01；main／origin/main 0/0）
- Local changes present at session start: 未追蹤 `.playwright-cli/`、`.task-relay/`、`artifacts/city-change-review/`、`artifacts/se-closeup-polish/r1/*.png`（唔郁）
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 2026-11-01：城市變化時建築唔應該只係縮細放大彈出嚟。喺 SE（`se:focal`／`se:focal-low`）試兩樣：

- **A 分段次序**：舊建築喺轉換頭 70% 落、新建築喺尾 70% 起，中段重疊；功能 module 跟住建築逐個出現（由下而上），拆走時由上而下。
- **B 打印線**：建築唔再縮放，而係一條高度 cut 由地面掃上去（拆走時由頂掃落嚟），cut 邊有琥珀＋白熱光帶。

驗收：owner 睇截圖／實機覺得「起樓／拆樓」讀得出。

## In-scope files

- `src/siteBuilders/buildCut.ts`（新）：`BuildCut`，每棟建築 clone 材質＋`onBeforeCompile` 加 discard／光帶，陰影用同一 cut 嘅 depth material；高度喺 group 自己嘅座標量（祖先 layer 可能仲係 1e-3）。
- `src/siteBuilders/concentrationTower.ts`：hall、低亭、塔、mixed 前庭用 `BuildCut`；`Part.window` 分段。
- `src/siteBuilders/siteRuntime.ts`：`SiteLayerRuntime.cut?`。
- `src/cityChangeManager.ts`：layer 有 `cut` 就用 cut 代替 `scale.y`（`showLayer`／`layerLevel`）。
- `src/main.ts`：GTAO normal prepass 跳過 `BuildCut.building`（override material 唔識 discard，會喺天空留灰色鬼影）。
- `tests/concentrationTower.test.ts`：ring 材質改為比較顏色（每棟有自己 clone）；改為驗證逐個出現同「唔縮放」。

唔包括：SW／NW／NE、district carrier、時間線長度（`SITE_TRANSITION_SECONDS` 仍係 3 s）。

## Actual validation results

- Verification status: PARTIAL
- 2026-11-01 工作樹：`npm test` exit 0、`npm run build` ✓、`git diff --check` clean。survey／module-swap 未改。
- 截圖（headless Chrome via Playwright，1600×900，12:00；夜景 22:00；`?meters=se:A&metersTo=se:B&metersAge=5.12+t&reviewTime=20`）：`artifacts/se-build-transition/`（commit 咗 `*-sheet.jpg`；原始 PNG 只留本機） 係 t = 0.5／1.0／1.5／2.0／2.5／3.2 s 連續圖（0→+1、+1→0、−1→0）。
- 未做：FPS／draw call、展覽機、reduced-motion 實機（轉換本身已經係即時）。

## Known issues

- 日間光帶偏淡（白天背景亮），夜晚明顯。
- Cut 頂係空心（back face cull），近鏡俯角大時會望入建築入面；試過嘅補救（back face 填光）未做，因為改 `side` 要重新 compile shader。
- 第一次轉換會 compile 新 shader program（每種材質一個，所有 cut 共用）；load 時已經用緊，所以應該喺 load 時已 compile，未量。
- 每棟 cut 建築材質變成獨立 clone：draw call 不變，但材質數增加。

## Next expected step

Owner 睇 `artifacts/se-build-transition/*-sheet.jpg`（或者實機 `cityMeters('se:2.5')`）→ 決定：保留／調光帶強度／套用到 SW／NW／NE。接受後量 FPS，再按 CONTRIBUTING merge。
