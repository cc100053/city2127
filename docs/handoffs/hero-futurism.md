# hero-futurism — 「一睇就知」嘅 2127 未來感（hero 鏡頭＋全域物料同光）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — R1 owner 接受（2026-11-01），R2 航道待目視
- Branch: `feat/hero-futurism`
- Base commit: `f35fe178a7eb8efae04efa59b1b0f4170b2e3241`
- Last verified commit: R2 commit（root test／build／diff-check PASS）
- Remote availability: `origin/feat/hero-futurism`

## Session Git state

- Session starting branch and HEAD: `feat/se-build-transition` `cdd9134`（未合併、等 owner 決定；唔郁）
- Last fetched origin/main commit: `f35fe17`（2026-11-01）
- Local changes present at session start: 未追蹤 `.playwright-cli/`、`.task-relay/`、`artifacts/city-change-review/`、`artifacts/se-build-transition/*.png`、`artifacts/se-closeup-polish/r1/*.png`（保留）
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 2026-11-01：幾輪打磨後城市合理但唔夠未來感；要誇張視覺令 hero 一睇就知係 2127。今輪試：

1. **鏡頭同尺度**：hero 降低拉近，Civic Core（Fuji TV）壓場、背後見天（R01）。
2. **全域物料同光**：白色金屬同玻璃反射天空、水面反射、交通光帶 emissive＋bloom。

同時記錄效能變化（vsync 1920×1080 目標 60 FPS）。驗收：owner 目視。

## In-scope files and dependencies

[CITY_MASTER_TASTE §3 amendment](../ODAIBA_2127_REFERENCES/CITY_MASTER_TASTE.md)、`src/heroCamera.ts`、`src/main.ts`（環境、bloom、光預設）、`src/cityRig.ts` 共用材質、`src/mobility.ts` 光帶。唔做：Civic Core 放大（第 2 項）、前景塔樓重做（第 4 項）。

## Completed work

- Taste §3 加 owner amendment：hero 尺度可以誇張，街道尺度保持克制，效能屬 taste 一部分。
- 基線（`artifacts/hero-futurism/baseline/`）：headless Chrome（playwright-cli）1920×1080，`?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40`，canvas `data-fps`：h16 51.5–53.3 FPS、h21 50.2–53.0，972 draws、16.27M triangles。
- 鏡頭候選（`artifacts/hero-futurism/camera/`）：c2 `[-360,120,-440]→[-20,65,-10]` fov42 Civic Core 壓場最明顯，但違反「hero 見齊四個 site」測試（Commons Plaza 被擋、energy wing 出 frame）；c4 `[-470,120,-600]→[-30,65,-50]` fov48 守得住約束，但城市變成一條線、Civic Core 反而細過現狀。

## R1（2026-11-01）

- 鏡頭：owner 揀 c2 `[-360,120,-440]→[-20,65,-10]` fov42。代價（已寫入測試同 PROJECT）：Commons Plaza 喺 hero 被 Aqua City 擋（`heroSightline` 只容許 Aqua City）；sharing courts 1/4/6/7 喺 hero 睇唔到（`HERO_HIDDEN_COURTS`）；energy 測試由「全部部件喺 frame」改為「energy vote 落點喺 frame」。四個 site 錨點仍喺 frame，vote journey 照飛。
- 物料同光（Sonnet 實作，Opus 審）：反射天空濾鏡 `saturate(.55) sepia(.12) brightness(1.04)` → `saturate(.8) sepia(.06) brightness(1.08)`；`nightLighting` environment `.6*(1-night*.65)` → `.85*(1-night*.75)`、bloom `.1+night*.14` → `.16+night*.08`；共用 `trim` roughness .48→.26、metalness 0→.28；`trail` ×3→×4；新 `skyGlass`（`chrome` clone，透明 .7）用喺 `skyways` 懸空球；空中航道 guide ×1.6→×3；`bayWater` roughness .16→.1、metalness .1→.15。
- Opus 判斷：鏡頭係主要進步；玻璃球變透明係物料方面最清楚嘅一項；水面同光帶未到 R01（線太幼、水只係更藍）。新問題：天空背景下，空中航道變成一行行青色虛線，比之前顯眼。

## R2（2026-11-01）：航道虛線

- Owner 接受 R1，指定下輪修空中航道虛線。
- 成因：`mobility.ts` 四條空中航道各 96 條 guide strip，loop 上一直以 `GUIDE_FLOOR` 尺寸顯示成固定虛線；c2 低鏡頭以天空做背景，變成橫過畫面嘅青色雜訊。
- 改法：刪除 `GUIDE_FLOOR`（冇飛行器嘅航道唔再亮）；亮起嘅 strip 沿切線拉長到接住相鄰 strip（`stripLength`），變成連續、逐漸收窄嘅光痕；`guideStrength` 寬度 .07 → .035，每架飛行器只拖約 7 條 strip。
- 證據：`artifacts/hero-futurism/r2/r2b-h16.png`、`r2b-h21.png`（`r2-*` 係未縮短前）。headless vsync FPS 51–55，draws 970 不變（同時段 main 未重量）。
- 剩餘：近側光痕仍然長（飛行器喺 frame 外）；左上光痕會短暫穿過標題字。

## Actual validation results

- Verification status: PARTIAL — 機械檢查 PASS；owner 目視 PENDING
- `d2696af`：root `npm test`（exit 0）、`npm run build`、`git diff --check` PASS
- FPS（headless，詳見 VALIDATION）：vsync 兩邊 60；uncapped main 87 → branch 89–90；draws 972→970
- 證據：`artifacts/hero-futurism/before-after.jpg`、`r1/c2r1-h16.png`、`r1/c2r1-h21.png`、`r1/` 中間 pass、`camera/`
- 未做：展覽機 FPS、street／civic 其他 review 鏡頭用新 trim 嘅效果、夜晚近距玻璃球

## Known issues and blockers

- 空中航道虛線喺天空背景太搶眼。
- SW 分享區有 4 個 court 喺 hero 睇唔到（可以用 `SCAN_COURTS` 重新揀位）。
- 前景藍間條塔樓（第 4 項）同 Civic Core 尺度（第 2 項）未做。

## Next expected step

Owner 目視 R1；決定下一輪做：航道虛線、前景塔樓、Civic Core 放大，或者 court 重新揀位。未 merge main。
