# q02a-water-threejs — Q02-A 水の棚田：Three.js 水流

- Owner: noifex（開工時確認）
- Status: PLANNED（條件式：只喺 Q02-A GLB 被採用放入城市時先開工）
- Branch: 未建立（開工時由最新 main 開 `feat/q02a-water-threejs`）
- Base commit: 未定
- Last verified commit: NONE
- Remote availability: NOT PUSHED
- GitHub Issue (optional): 無

## Session Git state

開工時按 [AGENTS.md](../../AGENTS.md) preflight 填寫。

## Goal and acceptance criteria

`asset/models/q02a-hydro-terrace/q02a-hydro-terrace.glb` 係靜態素材：水面、瀑布、泡沫都係單色，水車唔會轉。水流同轉動只喺 `.blend` 入面（procedural shader＋frame driver），glTF 帶唔過去。見 [素材 handoff](q02a-hydro-terrace.md)。

如果 Q02-A 被採用，就喺 Three.js runtime 重現：

1. 池面、蓄水池、海面：慢慢移動嘅波紋與反光（參考 `.blend` 嘅 Water 材質：深綠藍→斜角淺色、wave＋noise bump、約 0.03 m/frame 漂移）。
2. 瀑布：沿水幕向下流動嘅白色條紋，透明度隨條紋變化（`.blend` Fall 材質：noise 拉長做直紋，向下捲動）；底部泡沫輕微翻動。
3. 水車：四架繞各自水平軸轉，相鄰轉向相反（`.blend` 為每 frame 0.06 rad）。
4. 驗收：hero 同 close-up 鏡位目視（owner 判斷）；`npm test`、`npm run build`、`git diff --check` 通過；按 [VALIDATION](../VALIDATION.md) 量度實際 FPS，唔可以由檔案大小推斷。

## In-scope files and dependencies

- 前置：Q02-A 放置任務（位置、比例、三角面預算、`addCityModel` 載入）先完成或同時進行。
- GLB 內可直接指定嘅名：材質 `Water`、`Fall`、`Foam`、`Mist`；水車 node `q02a_wheel0`–`q02a_wheel3`，各自掛喺 `q02a_wheel<N>_pivot` 下面（pivot 已對準水平軸；轉軸係 Blender 嘅 local Z，匯出 +Y-up 之後對應邊條 glTF 軸要喺載入後實測確認）。
- 先睇現有做法再決定重用定擴充：[`src/bayWater.ts`](../../src/bayWater.ts)（灣區水面）、[`src/skyways.ts`](../../src/skyways.ts)（現有靜態瀑布材質）。優先用 Three.js 內建功能（材質 `onBeforeCompile`、貼圖 offset 捲動），唔加新依賴。
- 排除：改 GLB 幾何、Meter／問卷、其他 site。

## Completed work

NONE

## Actual validation results

- Verification status: NOT RUN

## Known issues and blockers

- 等待：Q02-A 是否採用（owner 決定）。
- GLB 有約 30 萬三角面、8.5 MB；採用時可能要先減面，會影響水車／瀑布嘅 node 結構。

## Important decisions

- 2026-11-17 用戶：Q02-A GLB 若被採用，水流要用 Three.js 做。

## Next expected step

Owner 決定採用 Q02-A 之後，由最新 main 開 feature branch，先確認水車轉軸方向同材質名喺 runtime 入面嘅實際情況，再實作。
