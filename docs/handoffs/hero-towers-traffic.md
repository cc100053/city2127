# hero-towers-traffic — 前景塔樓換開放結構＋天空／水面交通光帶（hero 未來感第 4、5 項）

- Owner: cc100053（唯一驗收人）
- Status: IN_PROGRESS — R2 等 owner 目視
- Branch: `feat/hero-towers-traffic`
- Base commit: `5fb2428aa10f9da441239b1304b46a37b4be81e0`
- Last verified commit: `4a1966d`（root test／build／diff-check PASS）
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

## R1（`b2d61db`）

- 第四個塔 family `openFrame`（`HERO_FRAME_SLOTS` 0/2/3/5，`towerFamily(i)`）；三條常駐區域航道 `skyCorridors`（各兩線、加長光痕）；`bayChannels` 渡輪；guide strip 喺標題位置唔亮。
- Opus 判斷：日間光帶有黑色短橫；右上 HUD 被光帶穿過；塔似電塔棚架；水道喺 hero 睇唔到。未交 owner。

## R2（`4a1966d`）

- 黑短橫成因：GTAO normal／depth prepass 將 additive 透明光痕當實心畫，AO 疊黑。改為 prepass 一律略過透明 `MeshBasicMaterial`（`main.ts`，每 120 AO frame 重掃）。
- 實際 hero 鏡頭：OrbitControls `maxPolarAngle` 1.42 將鏡頭抬高約 28 m；新 `heroSettledCamera()`、`heroTextZone()`（標題＋右上 HUD）畀測試同 guide 遮罩共用。
- 塔：4 m 柱、每個面向 hero 嘅面一條 chrome 巨型斜撐、只喺板層有樑＋暖色燈帶、24×24 m 懸挑綠化退台、兩個 skyGlass 球＋暖核。
- 渡輪：兩條線放喺 hero 真正睇到嘅海面（raycast ≥80 % 可見），BOAT_SCALE×3、每線 6 艘、90 m 光尾。

## Actual validation results

- Verification status: PARTIAL — 機械檢查 PASS；owner 目視未接受
- `4a1966d`：root `npm test` exit 0、`npm run build`、`git diff --check` PASS（Opus 重跑）
- FPS（headless Chrome 1920×1080/DPR1，`?meters=nw:0,ne:0,sw:0,se:0&reviewTime=40`）：vsync 日／夜 60；uncapped 日 main 88.7 → R2 88.1，夜 R2 88–90（main 76.8，機器負載唔同，唔算改善）；draws 970 → 1000，triangles 16.27M → 16.49M。詳見 `artifacts/hero-towers-traffic/r2/fps.txt`
- 證據：`artifacts/hero-towers-traffic/r2/before-after-day-night.jpg`、`r2-h16.png`、`r2-h21.png`、`r2-sehigh-h16.png`、`r2-se-focal.png`
- 未做：展覽機 FPS

## Known issues and blockers

- Slot 0 新塔會出現喺 SE 近鏡右邊（`r2-se-focal.png`），唔遮 site；owner 要確認。
- 渡輪喺 2–3 km 外，只得 8–15 px；hero 前景水面已被水上房間、碼頭佔滿。
- 航道 B 右端貼近 HUD 下緣（y≈160）。
- 夜晚新塔框架偏灰，燈帶弱。

## Important decisions

- 只換 slot 0/2/3/5（新第四 family `openFrame`），其餘 slot 同 family 不變。
- 交通密度用新增、唔受 Meter 影響嘅區域航道同水道表達；Meter 驅動嘅 fleet 數量唔郁。

## Next expected step

owner 睇 R2 日／夜 before/after：接受就同步 PROJECT／VALIDATION／handoff index 再 merge `--no-ff` main；否則指定 R3。
