# SW focal pull-back — 2026-10-29

Owner「修完就 merge」之後嘅 A1 修正。`sw:focal` position 由 `[-164,61,147]` 沿視線拉遠約 6% 到 `[-168,64,152]`，target `[-105,10,60]` 不變；其他 source 同 C1 `16efd9e` 一樣。

- Capture：用未改過嘅 [S0 runner](../../../closeup-polish/capture.mjs)（`CITY_SHOT_ONLY=sw:focal`），6 態 12 張 JPEG，固定用第二 take。macOS 27／Chrome 156.0.8078.73／ANGLE Metal Apple M6，1920×1080／DPR1／default／reviewTime20。[capture.json](capture.json)
- A1 6/6 PASS（高度 −2：55.41%，0／+2：57.50%，上限 60%）；A2 6/6 PASS（中心 0.507／0.568，card overlap 0）；A6 6/6 PASS；repro 6/6 PASS；A3 照舊只做診斷（1/9）。
- A5（雙 uncapping flag，兩次獨立 navigation，[第一次](performance.json)、[重量](perf-repeat/performance.json)）：

| Run | Hour | FPS（兩窗） | 平均／S0 | Calls |
| --- | --- | --- | --- | --- |
| 1 | 12 | 108.19／108.21 | 108.20／114.94＝94.1% | 775 |
| 1 | 22 | 107.56／107.06 | 107.31／112.86＝95.1% | 775 |
| 2 | 12 | 109.35／105.83 | 107.59／114.94＝93.6% | 775 |
| 2 | 22 | 106.59／99.21 | 102.90／112.86＝91.2% | 775 |
| 2 hero | 12／22 | 86.29／88.71、85.60／90.42 | 87.50／86.33、88.01／89.42 | 950 |

  日景兩次都低過 95%，夜景一次過一次唔過；FAIL 照記，冇挑樣。同一部機 hero 喺 C1 量到 92.34，今次 86–90，run 之間波動約 5%。vsync 鎖 60。Shot calls 775 對 S0 606，按 owner 決定只做診斷；hero calls 950 對 948。
- 原圖已檢視：廣場、環頂同座位完整入鏡，冇 r3 支柱或 S0 高架遮擋；左邊藍塔佔大約四分一畫面但唔遮主體。
- Root `npm test`／`npm run build`／`git diff --check` PASS（logs 喺上一層 `sw-pullback-*.log`）。
