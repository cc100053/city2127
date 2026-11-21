# Fuji Civic Core — 幕牆 R1

- Owner: Codex
- Branch: `codex/fuji-facade-pilot`
- Base: `2ab01ea77125fbd8c54e5c8dc9f1ec79a3d97ac8`
- Status: R1 視覺候選，待 owner 驗收
- 已驗證實作：`19432b6360eecbf58181ec69d6a3235a0bf82280`
- 遠端分支：`origin/codex/fuji-facade-pilot`

## 基準和改造範圍

啟動時 `main` 與已 fetch 的 `origin/main` 差異 0/0，保留主工作樹的未追蹤 `Dev_QA.md`。由該 commit 開獨立工作樹。台場場地、九題輪換以及 Fuji 既有用途的依據見 [PROJECT](../PROJECT.md) 和 [此前的 Fuji v3 交接](archive/fuji-tv-polish.md)。

本輪先重做 Fuji 兩翼面海與延伸到側面的前段幕牆。每個雙層棚室用退入式玻璃、分段陶瓷框、深色隔音板和窗頂燈槽建立深度。暖色剪接區與冷藍直播區由既有城市時鐘控制。幕牆以 civic-local metres 匯出，`civicAt` 放置、樓板、植栽露台、居民位置、扶梯和球頂泊位沿用現行坐標。原有 `fuji-tv` 歷史資產未改。

薄窄室內零件（深色、暖光和直播光材質，任一尺寸 ≤ 0.25 m）沿用原尺寸和中心，改用共用直角盒。新 GLB 成為同一組材質合批的一部分，載入失敗或材質角色不完整使用程序幕牆。修復了房間 shader 中被行內註解吞掉的 `roomNight` 綁定。

## 模型與驗證

- 重建：`blender -b --factory-startup --python asset/models/fuji-civic-facade/build_facade.py`，再用 Blender export skill 的 `gltf` preset、`--no-anim --out //fuji-civic-facade.glb`。同目錄保留 [.blend](../../asset/models/fuji-civic-facade/fuji-civic-facade.blend) 及 [GLB](../../asset/models/fuji-civic-facade/fuji-civic-facade.glb)。
- Blender 5.2.2 `game` QA 無幾何錯誤。唯一提示是幕牆最低點 Y=4.195 m，高於建築原點；它依附現有雙層樓板，屬預期。陶瓷／深灰／玻璃／暖光／直播光各 14,112／18,216／4,764／2,580／252 個三角面；GLB 共 39,924 個三角面、5 個材質、無紋理，約 2.67 MiB。多角度材質及線框圖已目視。
- Three.js 解析實際 GLB 後，整棟樓為 931,724 個三角面、10 個材質批次；程序回退為 950,120 個三角面，同為 10 批。原版 `2ab01ea7` 為 2,184,776 個三角面。新舊大樓世界包圍盒相同。

- 根 `npm test`、`npm run build`、`git diff --check` 通過。Odaiba 測試載入真 GLB 並驗證兩種幕牆的居民動線一致、樓板與泊位淨空、10 批上限及面數預算。
- Apple M6／Chrome 157.0.8103.79 headless／ANGLE Metal，1920×1080、DPR 1，`reviewTime=20` 固定日夜畫面。正常 GLB 四個畫面均回應 HTTP 200，零 page error；模擬 GLB 404 會顯示原幕牆，零 page error。主鏡一般渲染幀 23.09M → 20.59M 三角面，draw calls 日 1,411、夜 1,412。每個條件取一次 6 秒 rAF 短測，日 53.8 → 58.8 FPS，夜 56.2 → 58.9 FPS，接近 60 FPS 上限，未量展覽機或長跑。
- 近鏡可見窗框、隔音板細縫、燈槽和仍透出的工作室。成套截圖及 JSON 在 `~/city2127-evidence/fuji-civic-facade/r1`。紀錄：[原版近鏡夜景](../../artifacts/fuji-civic-facade/r1/before-wing-night.jpg)、[R1 近鏡夜景](../../artifacts/fuji-civic-facade/r1/after-wing-night.jpg)、[R1 近鏡日景](../../artifacts/fuji-civic-facade/r1/after-wing-day.jpg)、[R1 主鏡夜景](../../artifacts/fuji-civic-facade/r1/after-hero-night.jpg)。

## 下一輪

Owner 檢看日夜主鏡和翼樓近鏡後，再處理銀球承托與可見劇場，最後處理從前庭到斜扶梯的夜間辨識。展覽機尚待量度。
