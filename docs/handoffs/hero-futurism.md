# hero-futurism — 「一睇就知」嘅 2127 未來感（hero 鏡頭＋全域物料同光）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS
- Branch: `feat/hero-futurism`
- Base commit: `f35fe178a7eb8efae04efa59b1b0f4170b2e3241`
- Last verified commit: NONE
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

## Actual validation results

- Verification status: NOT RUN

## Known issues and blockers

- 鏡頭方向要 owner 決定：hero 係咪仍然要見齊四個 site（`tests/odaiba.test.ts`、`tests/energyPrototype.test.ts`、`tests/housingCityCheck.ts` 鎖住）。

## Next expected step

Round 1（物料同光）由 Sonnet 實作，Opus 審圖、量 FPS。
