# Sector A — 海浜公園／西岸水庭

Owner: worker `01a17e2a-4c38-7422-8d68-33782c0367f5`, dispatch `closeup-polish-A-1-r8`. Base: verified clean main `3d0f40ebd5d7350ecdcc05ab3420cacf926dfd9a`, 2026-10-28 fetch0/0. Explicitly switched the retained feature branch and fast-forwarded it to this main; remote feature then ahead2/behind0. Root legacy checkout untouched. No `.codegraph/` in this clone.

Status: r1 pose measurement in progress; no art acceptance or main merge. [Round state](round-state.json), [scope and gates](../../../docs/handoffs/closeup-polish.md), [immutable S0](../S0/README.md), [baseline references](baseline/reference.json).

順序：`ne:focal` → `ne:district` → `energy:garden`。沿用ART與CITY MASTER TASTE，原圖已能定位本次問題，無需額外dream-loop目標。第一輪只調SHOTS數值；第二輪預備patch保存於 [planned-r2.patch](planned-r2.patch)，在r1完成前不套用。每shot最多三輪。

每輪24狀態（focal6、district10、garden6、hero2），每狀態兩次fresh navigation，保存JPEG90原圖，採第二take。1920×1080／DPR1／default／Chrome156 headless／hour12,22／reviewTime20；Google Fonts明確改空CSS，系統字體。8組效能各兩輪，至少16秒後取5秒rAF，雙flag解除vsync與frame cap。S0原始檔不覆寫，A1–A6門檻不改。

追過的影響面：`changeCatalog.environmentParkTarget` → `cityChangeManager.applyExhibitionLayout/update/restoreLegacy` → Park runtime；GLB cache與晚到prepare；EnvironmentDistrict的target、hybrid、seed、roof publication與getConfiguration；energyPrototype → EnergyRuntime的獨立group fade。保留所有權威數量／footprint／三秒retarget／hero／42°及headline時間線。只在第一水庭clone完成後加本庭細節；其他sector不改。Capture runner只增加多shot篩選，令sector A的比較可以一次保留所有pair。

Live回歸見 [live.mjs](live.mjs)：真實scratch HTTP／WebSocket，v3歷史氣候題測NE Meter、現行v4題測水庭；涵蓋中間easing、hold／位置、reload、Undo、reduced motion。Diagnostics每120frame更新，因此browser只能證實中間狀態，精確三秒與retarget由既有root tests核對。Script保留assert，finally清理browser／server／SQLite。

未驗展示硬件、Safari／iPad／Windows、DPR2或真人兩秒辨識。幾何A3不模擬shader/alpha，仍照7/9原門檻報告。美術checkpoint必須owner review後才可merge。
