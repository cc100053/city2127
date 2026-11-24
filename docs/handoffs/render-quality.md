# render-quality — 描畫品質（手動 low／自動調整 TODO）

- Owner: cc100053（實作：Claude Code）
- Status: IN_PROGRESS — `?quality=low` 同預設效能調整（2026-10-27）已完成；展覽機實測同自動品質調整 TODO
- Branch: `feat/render-quality-low`（2026-10-15）；`feat/render-perf`（2026-10-27，由 `96369f9` 開）
- Base commit: `29d12db7629b8ffabdb75b53b2cec70d8c15ee9a`
- Last verified commit: 見 git log（本文件同一 commit）
- Remote availability: 合併後喺 `origin/main`
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: `main` @ `29d12db`（2026-10-15）
- Last fetched origin/main commit: `29d12db`（2026-10-15 fetch）
- Local changes present at session start: 未追蹤 `question_candidates.md`（企劃組，保留）；企劃書 `docs/PROPOSAL_JA.md` 改為 `.gitignore`
- Upstream integration status: NOT NEEDED
- Pending Git conflicts or synchronization blockers: NONE

## Goal and acceptance criteria

問題：M1 16 GB 接外置 4K（canvas 2131×1334）只有約 9 FPS，示範時卡。目標：唔改預設展覽畫面，提供手動輕量模式。

- `?quality=low`：pixel ratio 上限 1、無 MSAA、關 GTAO、關陰影；其他 URL 值同預設不變。
- production build 都可用（示範可能用 build）。

## In-scope files and dependencies

[renderQuality.ts](../../src/renderQuality.ts)、[main.ts](../../src/main.ts)、[test](../../tests/renderQuality.test.ts)；README／PROJECT／VALIDATION。

## Completed work

- 實測每個 pass 嘅成本（數字見 [VALIDATION](../VALIDATION.md#performance-evidence)）：GTAO（−38 ms）、陰影（−30 ms）、MSAA（−28 ms）係主因；GTAO sample 數、bloom、陰影解像度影響細。三樣全關 33.3 FPS。
- 加 `?quality=low`，採用全關三樣嘅組合。
- 2026-10-27 `feat/render-perf`：預設 preset 改為 GTAO 半解像度（`aoScale`）、MSAA 2×、陰影每秒重畫 4 次（`shadowHz`，按 wall-clock，`reviewTime` 定格都會更新）；`mobility.ts` 嘅 `fleet()`（行人、車、無人機、船、長凳、guide）唔再投影，移除咗冇人用嘅 `shadow` 參數。樹、建築、Meter 結構保留陰影。探索時量到人同樹單獨收起幫助好細（+0–5%），樽頸係後處理 pass 同陰影 pass 重畫成個城市。

## Actual validation results

- Verification status: PASSED（手動模式；2026-10-27 預設調整喺開發 Mac M6 1080p uncapped 40 → 80 FPS，vsync 下全部 view 60）；展覽機 NOT RUN
- 2026-10-27 整合：feature `a08d3dd`，`--no-ff` merge `3591af7` 推上 `origin/main`；merge 結果 root `npm test`/`npm run build`、`git diff --check origin/main..HEAD` PASS；main CI run 40427511885 success。
- 2026-10-27 owner 喺自己 Chrome（開發 Mac，Vite DEV `?meters=nw:0,ne:0,sw:0,se:0`，即時時鐘）目視檢查後接受；嗰次冇記錄 FPS。
- 2026-11-24 Windows workstation attempt, Chrome 157.0.8103.80, `?survey&quality=low`: system adapters list Intel UHD Graphics and NVIDIA GeForce RTX 4050 Laptop GPU, but WebGL reports ANGLE/Intel UHD. Browser viewport 1194×676, DPR 1. The page did not publish its 120-frame `data-fps` or `data-draw-calls` diagnostics during a 90 s foreground run. A separate 10 s headless requestAnimationFrame probe returned 0.075 callbacks/s and is not a representative FPS result. FPS and draw calls therefore remain NOT MEASURED; this is not verified exhibition hardware.
- 2026-11-24 Windows 手提電腦第二次量度（base `1cea0d1e`，Vite DEV + `survey` `dev:auto` 臨時 SQLite，URL `?survey=ws://127.0.0.1:8788/ws`，即時時鐘 hour≈20–24 夜景，插電，Chrome 前景、Claude in Chrome 控制）：已寫入 `HKCU\Software\Microsoft\DirectX\UserGpuPreferences`（`chrome.exe` → `GpuPreference=2;`）並喺寫入後重開 Chrome，但 WebGL（包括 `powerPreference:'high-performance'`）仍回報 `ANGLE (Intel, Intel(R) UHD Graphics (0x0000A7A8) Direct3D11)`；RTX 4050 Laptop（driver 32.0.16.1664）冇用到。Viewport 1536×674，DPR 1.25。FULL：canvas 1920×842，穩定 120-frame 窗口 5.3 / 5.5 FPS，2241–2247 draw calls，24.0M triangles，53 textures（首個窗口含載入 1.4 FPS / 3040 draws / 30.3M）。`?quality=low`：canvas 1536×674，13.6 / 14.1 / 13.9 FPS，1207–1212 draw calls，12.0–12.1M triangles，45 textures。結論：Intel UHD 上兩個 preset 都唔夠流暢；NVIDIA 嘅數 NOT MEASURED，下一步係令 Chrome 真正用到 RTX 4050 再量。
- 2026-11-24 同部機第三次量度，同一個 base、server 同 URL：用獨立 `--user-data-dir` 開 Chrome 157.0.8103.80，加 `--force_high_performance_gpu --remote-debugging-port=9333 --window-size=1600,900`，經 CDP 讀 canvas dataset，插電。WebGL 回報 `ANGLE (NVIDIA, NVIDIA GeForce RTX 4050 Laptop GPU (0x000028A1) Direct3D11)`，所以 Chrome 參數有效，registry 值本身唔夠。Viewport 1540×788，DPR 1.25。FULL：canvas 1925×985，穩定窗口 43.8 / 48.5 / 44.2 FPS，2214–2252 draw calls，23.6–24.1M triangles，53 textures。`?quality=low`：canvas 1540×788，54.4（仲喺熱身）/ 73.8 / 73.0 FPS，約 1218 draw calls，12.2M triangles，45 textures。兩個 preset 喺 Vite DEV 由開頁到第一個 120-frame 窗口都要約 50 s，主要係載入時間。夜景 hour 19.6–20.9，冇量日景同 1920×1080 全螢幕；呢部唔係展覽機。
- 2026-11-24 Windows 一鍵啟動：`start-windows.cmd` → `scripts/start-windows.ps1`，同部機實測。PATH 上係 Node 22，script 改用 nvm 嘅 v24.22.2；依賴已經最新，所以冇跑 `npm ci`；兩個 server 喺獨立視窗 9 s 內 ready；已經起咗嘅 server 會沿用。Chrome 用 `%LOCALAPPDATA%\city2127\chrome-exhibition` profile 加 `--force_high_performance_gpu` 開，`nvidia-smi` 見到佢嘅 `--type=gpu-process` 行喺 RTX 4050。冇 TLS 憑證，所以只測咗本機模式；LAN/HTTPS 模式、`-Kiosk` 同 `-Low` NOT RUN。
- 詳情：[VALIDATION](../VALIDATION.md#performance-evidence)

## Known issues and blockers

- Low 模式冇陰影同接觸陰影，畫面較平；冇 MSAA 邊緣有鋸齒。
- 展覽機性能未知；手機未測（手機睇 3D 城市未係已批准方向）。
- 2026-10-27 調整：40 m DEV 街景見到長凳同行人冇影（展覽 orbit ≥150 m 睇唔到）；黃昏陰影每 0.25 s 跳一步，截圖量到好細，但未有人眼喺動態下確認；AO 邊緣稍軟。DPR 2 螢幕（pixel ratio 1.5）未量。
- 長遠方案（未做）：Fuji TV 加 LOD／decimate（220 萬三角形）、靜態城市 bake AO、shader 預編譯、效能預算寫入 VALIDATION。

## TODO：自動品質調整（未實作）

載入後量幾秒實際 FPS，低過門檻就逐級降：MSAA 4→0（或換便宜 AA）→ 陰影隔幾 frame 先更新 → 關 GTAO；快嘅機保持現狀。要先決定：門檻 FPS、會唔會喺展覽期間升返級、降級時畫面跳動點處理、手機係咪用最低級。陰影間隔更新同 MSAA 2× 已於 2026-10-27 成為預設。

## Next expected step

喺展覽主機（記錄 GPU、解像度、DPR）用 `?meters=…&hour=16` 量 FPS；如果仲未夠 60，先考慮 pixel ratio 上限同上面長遠方案，再決定自動調整嘅門檻同範圍。
