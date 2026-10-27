# Sector A — 海浜公園／西岸水庭

Owner: worker `01a17e2a-4c38-7422-8d68-33782c0367f5`, dispatch `closeup-polish-A-1-r8`. Base: verified clean main `3d0f40ebd5d7350ecdcc05ab3420cacf926dfd9a`, 2026-10-28 fetch0/0. Explicitly switched the retained feature branch and fast-forwarded it to this main; remote feature then ahead2/behind0. Root legacy checkout untouched. No `.codegraph/` in this clone.

Status: **REVIEW_READY**；三輪各24/24＋8組×2效能完成。最終runtime `b7d5861` root test/build PASS，24張正式原圖已逐張review；[S0／r3並排與逐項差距](REVIEW.md)、[機器可讀報告](report.json)、[驗證](checks.json)、[原圖hash](original-images.json)。No art acceptance or main merge. [Round state](round-state.json), [scope and gates](../../../docs/handoffs/closeup-polish.md), [immutable S0](../S0/README.md), [baseline references](baseline/reference.json).

順序：`ne:focal` → `ne:district` → `energy:garden`。沿用ART與CITY MASTER TASTE，原圖已能定位本次問題，無需額外dream-loop目標。第一輪只調SHOTS數值；第二輪在r1完成後套用，patch保存於 [planned-r2.patch](planned-r2.patch)（zero-context，重現用`git apply --unidiff-zero`）。每shot最多三輪。

每輪24狀態（focal6、district10、garden6、hero2），每狀態兩次fresh navigation，保存JPEG90原圖，採第二take。1920×1080／DPR1／default／Chrome156 headless／hour12,22／reviewTime20；Google Fonts明確改空CSS，系統字體。8組效能各兩輪，至少16秒後取5秒rAF，雙flag解除vsync與frame cap。S0原始檔不覆寫，A1–A6門檻不改。

追過的影響面：`changeCatalog.environmentParkTarget` → `cityChangeManager.applyExhibitionLayout/update/restoreLegacy` → Park runtime；GLB cache與晚到prepare；EnvironmentDistrict的target、hybrid、seed、roof publication與getConfiguration；energyPrototype → EnergyRuntime的獨立group fade。保留所有權威數量／footprint／三秒retarget／hero／42°及headline時間線。只在第一水庭clone完成後加本庭細節；其他sector不改。Capture runner只增加多shot篩選，令sector A的比較可以一次保留所有pair。

Live回歸見 [live.mjs](live.mjs)：真實scratch HTTP／WebSocket，v3歷史氣候題測NE Meter、現行v4題測水庭；涵蓋中間easing、hold／位置、reload、Undo、reduced motion。Diagnostics每120frame更新，因此browser只能證實中間狀態，精確三秒與retarget由既有root tests核對。Script保留assert，finally清理browser／server／SQLite。

未驗展示硬件、Safari／iPad／Windows、DPR2或真人兩秒辨識。幾何A3不模擬shader/alpha，仍照7/9原門檻報告。美術checkpoint必須owner review後才可merge。

最終結果：A1／A2各20 PASS、4 N/A；A3 20 FAIL、4 N/A（focal2/9、district0/9、水庭0/9，仍需7/9）；A4 1/22 PASS；A5／A6各24/24 PASS。重載repro14/24，10失敗保留兩take及使用第二take。V1有12 FAIL（低focal兩張與district十張）；V3有22 FAIL（背景單球樹／圓柱植栽保留），V5有8 FAIL（district部分夜間狀態）；精確理由及差距見REVIEW。三輪後按計劃停美術迭代，交owner決定，不繼續第四輪。

第三輪八組有效uncapped平均90.95–104.47FPS，全部≥各自S0的95%，mean及各狀態instant draw calls≤110%；vsync59.9–60.2FPS。Hero相機不變，其效能升幅不能當作優化成果。A3九點共12命中subject、92不穿world AABB、62穿完整bounds空隙、10前景阻擋、4 bounds內其他geometry（不明）；詳見[r3原因](r3/occlusion-causes.json)，保留FAIL。District全carrier投影超出viewport，A2通過不代表完整載體都看得到。

[實際live九項檢查](live/browser.json)全PASS、error0，三張原圖亦已檢視；v3/v4 fixture與精確時間限制見上文。共144張三輪靜態原圖＋3張live；S0原234張hash核對一致。所有自己啟動的runner／Chrome／Vite／scratch服務均已結束，5194 bind驗證free；[清理](cleanup.json)。B–D／Z與main整合不在本worker範圍。

重現（先啟動本機Vite；另選新目錄，不能覆寫本次原圖）：

```sh
CITY_SHOTS=ne:focal,ne:district,energy:garden,hero CITY2127_EVIDENCE_DIR=<fresh-path> node artifacts/closeup-polish/capture.mjs capture
CITY_SHOTS=ne:focal,ne:district,energy:garden,hero CITY2127_EVIDENCE_DIR=<same-fresh-path> node artifacts/closeup-polish/capture.mjs perf
CITY_SHOTS=ne:focal,ne:district,energy:garden,hero CITY2127_EVIDENCE_DIR=<same-fresh-path> node artifacts/closeup-polish/capture.mjs compare
node artifacts/closeup-polish/A/report.mjs --self-test
node artifacts/closeup-polish/A/report.mjs
```
