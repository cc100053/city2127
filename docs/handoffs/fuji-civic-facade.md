# Fuji Civic Core — 幕牆 R1 與銀球 R2

- Owner: Codex
- Branch: `codex/fuji-facade-pilot`
- Base: `2ab01ea77125fbd8c54e5c8dc9f1ec79a3d97ac8`
- Status: R1 幕牆已獲 owner 接受（2026-11-22）；R2 銀球候選待驗收
- 已驗證實作：R2 `1469bbdfd1f6487be74fd47d6539aaf587d1f0d9`，R1 `19432b6360eecbf58181ec69d6a3235a0bf82280`
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

## R2 銀球與承托

從 R1 `4423a9f22a426700f420bd684f2516e633ec848d` 接續於 `/private/tmp/city2127-fuji-polish`。啟動時乾淨，成功 fetch，與遠端分支 0/0，較 `origin/main`（`2ab01ea77125fbd8c54e5c8dc9f1ec79a3d97ac8`）領先兩個 commit。主工作樹有別的工作。這輪提交 feature branch 供 owner 驗收。

下承托由後樓板伸到球腹的兩個承座，上吊桿固定在後側屋頂橫梁。削角陶瓷臂接深色套筒、銀色階梯形扣座及淡藍定位燈。舊大環、外露纜線及早已斷開上層斜道的轉接板由新組件取代，面海視線可穿過外框與球殼之間。觀景帶以銀殼開口、約 2.6 m 的深色窗框及後置曲玻璃構成，可看見原有舞台螢幕與階梯觀眾席的一部分。球心 `(-18, 100, 23)`、半徑 28 m 均為放大 1.35 倍前的 civic-local 數值。R1 幕牆、現有通行資料及球頂泊位維持原有資產與坐標。

### 重建與幾何檢查

1. 在 repo 根目錄執行 `blender -b --factory-startup --python asset/models/fuji-civic-sphere/build_sphere.py`，產生[可編輯 Blender 檔](../../asset/models/fuji-civic-sphere/fuji-civic-sphere.blend)。
2. 用匯出技能的 `gltf` preset，參數 `--no-anim --set export_texcoords=false --out //fuji-civic-sphere.glb`。模型無貼圖，UV 保留在 Blender 檔。
3. Blender 5.2.2 `game` QA 零錯誤。提示只有平面機件封蓋的 n-gon、以及裝在空中的組件最低點為 58.587 m。材質與線框四角度已目視。原檔三角面數為球殼 10,024、銀扣座 496、陶瓷臂 360、深灰銜接件 824、玻璃 100、燈環和燈條 596。GLB 重匯共 12,400 面，六個網格、五個材質角色、無貼圖，約 260 KiB。
4. Odaiba 測試載入兩份真 GLB，核對球殼包圍範圍及半徑、泊位基準與球頂間距 4.05 m、面海空隙、透過玻璃的舞台射線、原居民動線和地板支承，以及航線 161 個位置的 22 m 機翼包絡。

### 同鏡位日夜對照

| 鏡位 | R1 12:00 | R2 12:00 | R1 21:00 | R2 21:00 |
| --- | --- | --- | --- | --- |
| 主遠景 | [日](../../artifacts/fuji-civic-facade/r2/before-hero-day.jpg) | [日](../../artifacts/fuji-civic-facade/r2/after-hero-day.jpg) | [夜](../../artifacts/fuji-civic-facade/r2/before-hero-night.jpg) | [夜](../../artifacts/fuji-civic-facade/r2/after-hero-night.jpg) |
| 海側銀球近鏡 | [日](../../artifacts/fuji-civic-facade/r2/before-sphere-day.jpg) | [日](../../artifacts/fuji-civic-facade/r2/after-sphere-day.jpg) | [夜](../../artifacts/fuji-civic-facade/r2/before-sphere-night.jpg) | [夜](../../artifacts/fuji-civic-facade/r2/after-sphere-night.jpg) |

[球腹承托接合特寫](../../artifacts/fuji-civic-facade/r2/after-bearings-day.jpg)。固定 `reviewTime=20`。近鏡用 `?review=ring&cam=-38,139,-84&at=14,135,59`。原圖、鏡位、診斷和回退紀錄在 `~/city2127-evidence/fuji-civic-facade/r2/`。

### 測試與渲染成本

- 根 `npm test`、最終 Odaiba 幾何測試、`npm run build` 與 `git diff --check` 通過。Vite 仍有原有的大區塊提示。
- 開發 Mac（Apple M6／ANGLE Metal，Chrome 157.0.8103.79 headless，1920×1080、DPR 1）五張 R2 畫面的兩份 GLB 均為 HTTP 200，零 page error。模擬銀球 GLB 404 可回退到 R1 球體，頁面仍正常渲染。
- 實際載入兩份 GLB 後，整棟 931,724 → 913,920 三角面，維持 10 批材質。主鏡日／夜一般幀的 draw calls 為 1,411／1,412，三角面由約 20.586M 降至 20.551M。日／夜銀球近鏡一般幀為 601／602 次 draw call、約 17.275M 三角面。陰影更新幀的計數另有波動。
- 測試程序結束後，在同一 Chrome 會話複測，每個條件取一次 6 秒 rAF。R1 用同一 build 的程序銀球回退，兩組都使用 R1 幕牆。日景 58.3 → 56.7 FPS，夜景 58.8 → 57.3 FPS。日景 p95 幀間距 16.8 → 33.3 ms，夜景兩組均為 16.8 ms。這次短測 R2 平均約低 1.5 FPS，未歸因，亦未驗證能穩定達到 60 FPS。原始量度見 evidence 檔案 `performance.json`。

### 下一步

待 owner 驗收 R2，再開始第 3 步前庭同斜扶梯導光。展覽機與長時間運行待測。
