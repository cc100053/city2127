# hull-terraces — 階梯巨構公共退台 R1

- Owner: cc100053
- Status: IN_PROGRESS（首輪待視覺驗收）
- Branch: `codex/hull-terraces`
- Base commit: `2ab01ea77125fbd8c54e5c8dc9f1ec79a3d97ac8`
- Last verified code commit: `b229404f6458079266bd540b4bdaecbe3cf720ea`
- Remote availability: `origin/codex/hull-terraces` (`11306639`) 已合併至 `origin/main` (`b229404f`)。

## Session Git state

- 2026-11-22，`main` 與已 fetch 的 `origin/main` 同在 base commit，差距 0／0。
- 主工作區有未追蹤的 `Dev_QA.md`。本輪在獨立 worktree 由 `origin/main` 開始。

## 目標與實作

在 [hull](../../src/megastructures.ts) 做第一項外觀打磨。低層（15 m）對正廣場入口，中層（60 m）用短簷遮蔭，上層（105 m）用靠後的座牆保留開揚視線。鋪面嵌入現有退台，欄杆沿原弧線，兩側保留植栽。沿用 Three.js 的材質、靜態合批和植栽實例；船身輪廓、鐵路洞口及廣場步道沿用既有幾何。跨層接駁及夜景燈光屬後續設計。

## 驗證

- [megastructures.test.ts](../../tests/megastructures.test.ts) 用實際幾何測試三處鋪面暢通與兩側仍有植栽。既有測試覆蓋道路及鐵路的淨空。
- 合併提交上重跑 root `npm test`、`npm run build`、`git diff --check origin/main..HEAD`，均通過。完整測試在沙盒外執行，以便 survey 測試服務在 loopback listen。
- Chrome 2400 × 1350，固定 12:00 和 21:25，主鏡前後對照與日間近鏡存於 `~/city2127-evidence/hull-terraces/{before,final}/`。最終幾何的三張圖均無 page error。日／夜主鏡 draw calls 分別為 1411／1412，前後一致。首次重拍未取得畫布診斷，改用獨立 Vite 快取後完成。展覽機效能未測。
- [main CI](https://github.com/cc100053/city2127/actions/runs/44971710896) 通過 root、survey、module-swap 及差異檢查。

## 下一步

由 owner 目視驗收三處退台的比例、主鏡可讀性及中層遮蔭。
