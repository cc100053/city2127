# ring-glb-pilot — 直立環形巨構

- Owner — Codex。視覺驗收由 cc100053 決定。
- Status — R2 候選待業主審圖，整合由業主決定。
- Branch — `codex/ring-glb-pilot`。
- Remote — `origin/codex/ring-glb-pilot`，供審圖。
- Base — `6239fa813857e3a321c8f4a8189af2d4e5113159`。
- Implementation — R2 `5d80004d5a04d9427e276213016b85adde98ae3d`，R1 `0bbb94da91a885a53f233afa3db760c3eefb504e`.

## Round 2

2026-11-21 由已推送的 R1 審圖提交 `84e9267941328cab4ff62de7c3ed46c466b79eac` 接手。Fetch 後任務分支與遠端為 0 / 0，與 `origin/main` 相差兩個任務提交，基準仍為 `6239fa81`。沿用主 checkout 及原候選分支。未追蹤的 `Dev_QA.md` 保留原位。

**審圖** · [日間主遠景](../../artifacts/ring-glb-pilot/r2/hero-day.jpg) · [夜間主遠景](../../artifacts/ring-glb-pilot/r2/hero-night.jpg) · [日間斜側近鏡](../../artifacts/ring-glb-pilot/r2/oblique.jpg) · [夜間斜側近鏡](../../artifacts/ring-glb-pilot/r2/oblique-night.jpg)。Chrome 以 3200 × 1800、DPR 1、`reviewTime=20` 拍攝，四張皆無 page error。遠景沿用原展覽主鏡；近鏡用 `?review=ring&cam=-31,58,-100&at=93,40,-155`。原圖、sidecar、Blender 材質／物件／線框圖在 `~/city2127-evidence/ring-glb-pilot/r2/`；原圖於實作提交前拍攝，sidecar 如實標為 dirty。

### 模型與接入

[Blender 來源](../../asset/models/ring-gate-2127/ring-body-2127.blend) 有三個環身 collection。重建指令：`blender -b --factory-startup --python-exit-code 1 -P asset/models/ring-gate-2127/build_ring_body.py`。同一弧段函式生成下環（較密玻璃分格、露台腰線、轉乘處加厚肋）、兩肩和冠部（較長玻璃帶、較細肋）。三段在共用原點合攏。最高點 195 m、直徑約 210 m；下段深 45 m、冠頂深約 26 m。陶板包住外緣，前後兩面玻璃退入窗框。夜景沿用 R1 冷白交通識別及暖色玻璃／燈槽，部分玻璃保持暗色。玻璃以實心窗片及後退窗框表現深度，室內留待下一輪。

| GLB | 三角面 | 大小 |
| --- | ---: | ---: |
| [下環](../../asset/models/ring-gate-2127/ring-lower-2127.glb) | 12,026 | 402,488 bytes |
| [雙肩](../../asset/models/ring-gate-2127/ring-shoulders-2127.glb) | 9,352 | 360,836 bytes |
| [冠部](../../asset/models/ring-gate-2127/ring-crown-2127.glb) | 8,466 | 320,552 bytes |

每份 Blender 5.2.2 GLB 以 +Y 向上匯出，四種材質各合一個網格，無外部紋理或壓縮解碼器。R1 入口獨立保留，斜隧道在 Blender 用 Exact Boolean 切出，四道程序花園露台與基座沿用。[`loadMegastructures`](../../src/megastructures.ts) 只有在 R1 和三份環身 GLB 齊全時才接入 R2。單一環身資源失敗會回到完整 R1，入口資源失敗會回到程序外殼與入口。

### 驗證

- Blender game-profile QA 通過，零相交共面或脫離部件，唯一提示為環底深入地面約 15 m，符合原基座標高。已檢視材質、分件及線框，並在空場景重匯三段環身及 R1 入口。三段共 29,844 三角面、12 個網格。
- [淨空測試](../../tests/megastructures.test.ts) 用四份匯出 GLB 的實際三角面以 0.5 m 間距取樣隧道；原有道路 ①、Yurikamome 包絡仍穿過 R1 孔徑。核對 6 m 花園入口、接入後步行淨空、橋端斜面高度、冠部收薄及 12 個角度的外殼覆蓋。保留原有道路、軌道及居民路線資料。
- `5d80004d` 的根目錄 `npm test`、`npm run build`、`git diff --check` 均通過。Vite 仍提示既有的 JSON import attributes 不一致和大型 chunk。

### 1080p 主遠景

Apple M6、Chrome 157 headless（ANGLE Metal）、1920 × 1080／DPR 1，預設畫質。DEV 展覽主鏡以 `reviewTime=20` 凍結模擬，首次 FPS 診斷後等 5 秒，再用三個 120 幀窗口取樣。R1 基準在同一 build 模擬冠部 GLB 404，觸發完整 R1 回退。

| 時段 | R1（FPS） | R2（FPS） | 一般幀 draw calls（R1 → R2） |
| --- | ---: | ---: | ---: |
| 12:00 | 60.0 | 58.5–60.0 | 1,323 → 1,345 |
| 21:00 | 55.4–58.1 | 60.0 | 1,324 → 1,346 |

一般幀增加 45,024 個渲染三角面，陰影更新幀另外計入。夜間基準有波動，呢組短窗口只反映開發機實測。

正式 build 於 21:00 驗證四份 GLB 皆回應 HTTP 200。分別模擬冠部及入口 404，均顯示相應回退並繼續渲染。三個測試頁面各取一個 120 幀窗口，均為 60.0 FPS、零 page error。模擬 404 各錄得一次預期的資源錯誤與回退提示。原始資料見本機 `r2/performance.json`。

下一步由業主看日夜與接縫近鏡後決定整合。室內、新動線及展覽機實測留待後續。

## Round 1

### Session Git state

2026-11-21 從 `main` 的 `aee2662a2355bf8c82ee6e223ca295afc50c0eee` 開始。Fetch 後確認本機 0 ahead／7 behind，快轉至 `6239fa81` 再開分支。未追蹤的 `Dev_QA.md` 暫存後原位還原。核對 [入口交接](entrance-polish.md) 的 `ae88154e` 已在新基準內。

### 試作範圍

先做道路 ① 及 Yurikamome 穿過的東南隧道，到廣場天橋接最低層花園的一段。原比例及軌道、道路、天橋接點沿用。淺色陶板以分節收邊，內凹深色框承托較大的玻璃片。隧道有冷白識別燈及側牆維修照明。花園簷篷後的最前層花槽與內壁讓出入口，斜面平台接原有天橋。

- [Blender 來源](../../asset/models/ring-gate-2127/ring-gate-2127.blend)、[GLB](../../asset/models/ring-gate-2127/ring-gate-2127.glb) 及 [生成器](../../asset/models/ring-gate-2127/build_ring_gate.py)。環形外殼及斜隧道係場地專用幾何，花園簷篷重用 `city-kit-2127` 的 `arch_shell`。
- 由 Blender 5.2.2 LTS 執行 `blender -b --factory-startup --python-exit-code 1 -P asset/models/ring-gate-2127/build_ring_gate.py`。米制，原點投影到環心下方地面，GLB +Y 向上、+Z 朝廣場。可重建，毋須外部紋理。
- [城市接入](../../src/megastructures.ts) 在 `loadOdaiba` 平行載入入口和地形，GLB 失敗會使用程序入口。日夜燈光沿用 `updateMegastructures`；外露入口的 GLB 不依賴原環身的隧道裁切 shader。

### 驗證與限制

- `0bbb94da` 的 root `npm test`、`npm run build`、`git diff --check` 通過。完整測試在沙盒外跑，供問卷測試用 HTTP/WebSocket 綁定本機端口。
- Blender game-profile QA 通過。五件合批網格有 4,480 個三角面（陶板 1,938、暖光 256、玻璃 300、深色結構 1,410、導光 576），五種材質，171,476 bytes。已檢視材質與線框並在空場景重匯。三軸尺寸約 87.39 m × 55.72 m × 56.26 m（寬／高／深）。QA 提示深色結構內有八對背靠背三角面，屬隱藏面。簷篷兩層各有開口邊界，供與現有環身銜接。
- [幾何測試](../../tests/megastructures.test.ts) 檢查 GLB 隧道淨空、6 m 闊花園入口、接入後的行人通道射線及斜面平台高度。原有交通線穿洞測試一併覆蓋。
- Apple M6、Chrome 157 headless、1920×1080、DPR 1。正式 build 載入 GLB 200，以及模擬 404 回到程序入口，兩者均完成渲染。晚上 21:00 的三次讀數均為 60.0 FPS。日景首次非定格比較的讀數波動（`production-perf.json`）。用 DEV hero、`hour=12&reviewTime=20` 定格覆核，跳過暖機後取三個 120 幀窗口，原入口 57.1–58.5 FPS，GLB 58.1–60.0 FPS，同一視角的 draw calls 由 1,315 到 1,323。原始數據見 `held-day-perf.json`。
- 原圖連瀏覽器側錄存於 `~/city2127-evidence/ring-glb-pilot/`。審圖用 [日景](../../artifacts/ring-glb-pilot/gate.jpg)、[夜景](../../artifacts/ring-glb-pilot/gate-night.jpg)、[花園入口](../../artifacts/ring-glb-pilot/garden.jpg)、[街面](../../artifacts/ring-glb-pilot/street.jpg) 同 [改造前](../../artifacts/ring-glb-pilot/before-gate.jpg)。
- 這一輪只建模固定入口及觀景平台。全環造型、室內運作、展覽硬件與業主驗收仍未完成。
