# ring-glb-pilot — 直立環形巨構試作

- Owner — Codex。視覺驗收由 cc100053 決定。
- Status — 第一輪候選完成，待視覺驗收。
- Branch — `codex/ring-glb-pilot`。
- Remote — `origin/codex/ring-glb-pilot`，供審圖。
- Base — `6239fa813857e3a321c8f4a8189af2d4e5113159`。
- Implementation — `0bbb94da91a885a53f233afa3db760c3eefb504e`。

## Session Git state

2026-11-21 從 `main` 的 `aee2662a2355bf8c82ee6e223ca295afc50c0eee` 開始。Fetch 後確認本機 0 ahead／7 behind，快轉至 `6239fa81` 再開分支。未追蹤的 `Dev_QA.md` 暫存後原位還原。核對 [入口交接](entrance-polish.md) 的 `ae88154e` 已在新基準內。

## 試作範圍

先做道路 ① 及 Yurikamome 穿過的東南隧道，到廣場天橋接最低層花園的一段。原比例及軌道、道路、天橋接點沿用。淺色陶板以分節收邊，內凹深色框承托較大的玻璃片。隧道有冷白識別燈及側牆維修照明。花園簷篷後的最前層花槽與內壁讓出入口，斜面平台接原有天橋。

- [Blender 來源](../../asset/models/ring-gate-2127/ring-gate-2127.blend)、[GLB](../../asset/models/ring-gate-2127/ring-gate-2127.glb) 及 [生成器](../../asset/models/ring-gate-2127/build_ring_gate.py)。環形外殼及斜隧道係場地專用幾何，花園簷篷重用 `city-kit-2127` 的 `arch_shell`。
- 由 Blender 5.2.2 LTS 執行 `blender -b --factory-startup --python-exit-code 1 -P asset/models/ring-gate-2127/build_ring_gate.py`。米制，原點投影到環心下方地面，GLB +Y 向上、+Z 朝廣場。可重建，毋須外部紋理。
- [城市接入](../../src/megastructures.ts) 在 `loadOdaiba` 平行載入入口和地形，GLB 失敗會使用程序入口。日夜燈光沿用 `updateMegastructures`；外露入口的 GLB 不依賴原環身的隧道裁切 shader。

## 驗證與限制

- `0bbb94da` 的 root `npm test`、`npm run build`、`git diff --check` 通過。完整測試在沙盒外跑，供問卷測試用 HTTP/WebSocket 綁定本機端口。
- Blender game-profile QA 通過。五件合批網格有 4,480 個三角面（陶板 1,938、暖光 256、玻璃 300、深色結構 1,410、導光 576），五種材質，171,476 bytes。已檢視材質與線框並在空場景重匯。三軸尺寸約 87.39 m × 55.72 m × 56.26 m（寬／高／深）。QA 提示深色結構內有八對背靠背三角面，屬隱藏面。簷篷兩層各有開口邊界，供與現有環身銜接。
- [幾何測試](../../tests/megastructures.test.ts) 檢查 GLB 隧道淨空、6 m 闊花園入口、接入後的行人通道射線及斜面平台高度。原有交通線穿洞測試一併覆蓋。
- Apple M6、Chrome 157 headless、1920×1080、DPR 1。正式 build 載入 GLB 200，以及模擬 404 回到程序入口，兩者均完成渲染。晚上 21:00 的三次讀數均為 60.0 FPS。日景首次非定格比較的讀數波動（`production-perf.json`）。用 DEV hero、`hour=12&reviewTime=20` 定格覆核，跳過暖機後取三個 120 幀窗口，原入口 57.1–58.5 FPS，GLB 58.1–60.0 FPS，同一視角的 draw calls 由 1,315 到 1,323。原始數據見 `held-day-perf.json`。
- 原圖連瀏覽器側錄存於 `~/city2127-evidence/ring-glb-pilot/`。審圖用 [日景](../../artifacts/ring-glb-pilot/gate.jpg)、[夜景](../../artifacts/ring-glb-pilot/gate-night.jpg)、[花園入口](../../artifacts/ring-glb-pilot/garden.jpg)、[街面](../../artifacts/ring-glb-pilot/street.jpg) 同 [改造前](../../artifacts/ring-glb-pilot/before-gate.jpg)。
- 這一輪只建模固定入口及觀景平台。全環造型、室內運作、展覽硬件與業主驗收仍未完成。
