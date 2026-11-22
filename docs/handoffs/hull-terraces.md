# hull-terraces — 階梯巨構公共退台 R1

- Owner: cc100053
- Status: IN_PROGRESS（首輪待視覺驗收）
- Branch: `codex/hull-terraces`
- Base commit: `2ab01ea77125fbd8c54e5c8dc9f1ec79a3d97ac8`

## Session Git state

- 2026-11-22，`main` 與已 fetch 的 `origin/main` 同在 base commit，差距 0／0。
- 主工作區有未追蹤的 `Dev_QA.md`。本輪在獨立 worktree 由 `origin/main` 開始。

## 目標與實作

在 [hull](../../src/megastructures.ts) 做第一項外觀打磨。低層（15 m）對正廣場入口，中層（60 m）用短簷遮蔭，上層（105 m）用靠後的座牆保留開揚視線。鋪面嵌入現有退台，欄杆沿原弧線，兩側保留植栽。沿用 Three.js 的材質、靜態合批和植栽實例；船身輪廓、鐵路洞口及廣場步道沿用既有幾何。三層以外的動線和燈光屬後續設計。

## 驗證

- [megastructures.test.ts](../../tests/megastructures.test.ts) 用實際幾何測試三處鋪面暢通與兩側仍有植栽。既有測試覆蓋道路及鐵路的淨空。
- Root `npm test`、`npm run build`、`git diff --check` 通過。完整測試在沙盒外執行，以便 survey 測試服務在 loopback listen。
- 2400 × 1350 Chrome 主鏡日夜對照及日間近鏡存於 `~/city2127-evidence/hull-terraces/`。首次重拍未取得畫布診斷，改用獨立 Vite 快取後可拍。展覽機效能未測。

## 下一步

由 owner 目視驗收三處退台的比例、主鏡可讀性及中層遮蔭。
