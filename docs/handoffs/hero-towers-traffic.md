# hero-towers-traffic — 前景塔樓換開放結構＋天空／水面交通光帶（hero 未來感第 4、5 項）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS
- Branch: `feat/hero-towers-traffic`
- Base commit: `5fb2428aa10f9da441239b1304b46a37b4be81e0`
- Last verified commit: NONE
- Remote availability: `origin/feat/hero-towers-traffic`

## Session Git state

- Session starting branch and HEAD: `claude/hero-towers-traffic-74820d` worktree `5fb2428`（clean）
- Last fetched origin/main commit: `5fb2428`（2026-11-01）
- Local changes present at session start: NONE
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE；`feat/se-build-transition` 未合併、等 owner，唔郁

## Goal and acceptance criteria

Owner 2026-11-01：hero 要一眼睇得出係 2127（[hero-futurism](hero-futurism.md) 嘅第 4、5 項）。

4. 前景藍間條塔樓：只換離 hero 鏡頭最近／最顯眼嘅 3–4 座，做外露結構框、錯層退台、通透體量；綠化保持茂密。
5. 天空同水面交通：飛行器同船太細、太少、太散 → 收束成幾條清楚嘅連續光帶走廊（R01）；光痕唔可以穿過標題，唔可以變返虛線。

驗收：owner 睇過日／夜 before/after hero 對比後接受或指定下一輪；`npm test && npm run build && git diff --check` PASS；vsync 1920×1080 60 FPS，記錄 draws／triangles／uncapped FPS 對比 main。

## In-scope files and dependencies

`src/districtMeters.ts`（`ConcentrationDistrict` 新 family）、`src/layout.ts`（新航道／水道數據）、`src/mobility.ts`（新 fleet、guide 遮罩）、相關 tests、`artifacts/hero-towers-traffic/**`。唔做：Civic Core 放大（第 2 項）、水面倒影、Meter 驅動嘅數量曲線。

## Completed work

- 診斷（Opus，見 [spec](../../artifacts/hero-towers-traffic/spec.md)）：藍間條塔樓係 SE 集約 Meter 嘅 `ConcentrationDistrict` 塔（藍玻璃＋每 .08 h 一圈 `trim`），唔係 context facade。最近 hero 嘅可見 slot：5、2、3、0。飛行器數量跟 NW 自動化 Meter，所以第 5 項加「常駐區域交通」，唔改 Meter 曲線。

## Actual validation results

- Verification status: NOT RUN

## Known issues and blockers

- Slot 0 離 SE site 68 m，可能入 SE 近鏡（owner 已接受 SE R4）；R1 要截 SE 近鏡回歸。

## Important decisions

- 只換 slot 0/2/3/5（新第四 family `openFrame`），其餘 slot 同 family 不變。
- 交通密度用新增、唔受 Meter 影響嘅區域航道同水道表達；Meter 驅動嘅 fleet 數量唔郁。

## Next expected step

Sonnet 按 spec 實作 R1 並截圖；Opus 審，送 owner。
