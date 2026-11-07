# car-closeup-polish — 街道車輛家族（Blender）

- Owner: cc100053
- Status: DONE — owner 2026-11-07 接受 R2 並 merge；已知差距見 R2
- Branch: `feat/car-closeup-polish`（worktree `../city2127-car`）
- Base commit: `cbc58cc`（origin/main）
- Last verified commit: 見 branch tip；`npm test`／`npm run build`／`git diff --check` 通過
- Remote availability: origin/feat/car-closeup-polish

## Session Git state

- Session starting branch and HEAD: `main` `304084d`（落後 origin/main 21 commits，有 owner 未提交改動，全部保留，未 pull）
- Last fetched origin/main commit: `cbc58cc`（2026-11-07）
- Local changes present at session start: docs／artifacts 改動及 `.agents/skills/blender-*` 等；與本任務無關，保留
- Upstream integration status: NOT INTEGRATED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

Owner 提供概念車圖。判斷：方向啱，但橙／高飽和青撞色規則、細碎 vent 喺城市距離變噪點、暗色展台與日常無關，所以先改圖再建模。Owner 揀兩種都換、同一家族。目標圖 [target/](../../artifacts/car-closeup-polish/target/)，prompt [prompts.md](../../artifacts/car-closeup-polish/prompts.md)，owner 2026-11-07 通過 pod、car 日景；pod 夜景係其後生成，owner 未單獨揀。

## 交付

- 模型：`asset/models/car-family-2127/`（`build_car.py` 重建，`review_car.py` 出 Blender 審查圖）。`car_pod` 3,704 tris、`car_human` 3,776 tris（舊 5 個 rounded box 約 3,000），GLB 275 KB，Blender 5.2.2，glTF 無 Meshopt／Draco。
- Runtime：`mobility.ts` `fleet.rebuild()` + `carFamilyParts()`，GLB 載入後換走 `street-cars`、`street-pods`、`boulevard-pods`，方盒車留做 fallback（已驗：validation 失敗時保持方盒車）。Node 測試唔載入。
- 物料角色：`car_body`、`car_interior`（colour attribute）、`car_glass`、`car_seam`、`car_head`、`car_tail`、`car_shadow`、`car_pool`。Draw calls 由 15 增至 23。
- 煞車燈改成環繞車尾圓盤，方向燈移到新車身側。Van 高度改同長度一齊 ×1.55，令車輪保持圓形。
- DEV：`?review=street` 開放 `window.cityReview`，供跟車截圖。

## R1

對比圖 [r1/vs-target.jpg](../../artifacts/car-closeup-polish/r1/vs-target.jpg)。未跑 skill 嘅三個 absolute judges＋pairwise judge，亦未寫 rubric；由 owner 直接判斷。

已知低於目標：

- 日間 pod 向陽面仍然過白（白車身 × bloom）。
- 目標嘅窗框、座椅曲面、圓盤同心環未做；座椅仍係方塊。
- 車底地面有深色顆粒（疑似 AO pass，actors 冇 shadow）；未比較舊車。
- Pod 無上下浮動；懸浮環喺 boulevard 導槽內部分被遮。
- 車尾圓盤喺車尾扁平，唔似目標咁係球形圓頭。

FPS（`fps.sh`，headed Chrome，hero `se:high`，1920×1080，同一機況）：家族 日 25.3–25.6／夜 25.7–25.8；方盒 fallback 日 25.8–26.0／夜 25.5–26.1。兩者差距細，但絕對值遠低於過往 60，今次機況疑有問題，未有 60 FPS 結論。

## R2

對比圖 [vs-target.jpg](../../artifacts/car-closeup-polish/vs-target.jpg)，[rubric](../../artifacts/car-closeup-polish/rubric.md)。

改動：圓鼓車尾、車頂最高點移到中後段（全高 1.91 m）、窗框凸邊、軟身座椅、nose slot、車身 metalness .5（解決白色過曝）、較實玻璃、柔和接地陰影 `car_shadow`、pod 3 cm 浮動、細啲嘅懸浮環同車輪、車尾環日間淺色夜間發紅。

一個獨立 Sonnet judge（skill 要求三個 absolute 加 pairwise，今輪冇做足）：最終版 **8/18**，全部 1 分，`tail` 0 分；中途版亦係 8/18，所以呢個分數未顯示進步。下一輪應先解決 judge 反覆指出嘅項目：

- `tail`：圓盤朝正後方，呢個鏡頭睇唔到。目標圖嘅圓盤同時見到車頭，係 AI 圖嘅透視，要將圓盤向側面轉或者改鏡頭。
- `egg`：車長 4.6 m 下比例仍然偏長。
- `finish`：截圖日光偏暖、人手車用咗深色 tint。
- `glass`：foot window 喺引擎入面唔夠明顯。
- `night`：車頭暖白燈帶、車尾紅環、室內暖光都偏弱。

GTAO 喺近距離有地面顆粒，係全城設定，冇改。

FPS（同條件 hero `se:high`）：中途版 家族 25.8–26.2；方盒 22.1–22.9。兩者次序同 R1 相反，即機況波動大於差異。最終版單獨一次：day: 26.5 26.3 26.5 26.4 26.6 26.6；night: 6.3 26.7 27.2 27.2 26.9 26.9（第一個 sample 剔除）。

## Next

Owner 接受現狀。如果再開：先將車尾圓盤向兩側轉，再做強夜間燈帶、紅環同室內暖光。
