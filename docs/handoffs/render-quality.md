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
- 2026-11-24 同部機 LAN／iPad 模式（`feat/windows-start`，base `c7263d8d` + 本次 `-Local` 改動）：winget 裝 mkcert，`mkcert -install` 建立本機 CA 並加入 Windows 信任庫，`survey/data/tls/ipad.pem` SAN = `192.168.0.196`、`localhost`、`127.0.0.1`（有效至 2029-02-24，git 忽略，冇 commit）；`npm run fetch:hand-model` 下載 `hand_landmarker.task`（7,819,105 bytes）；管理員新增防火牆規則「city2127 survey (iPad LAN)」（TCP 8443、8787，LocalSubnet，Private＋Public）。Wi-Fi「newhome 2」DHCP IP `192.168.0.196`，未做 DHCP 預約。結果：8443／8787 聽 `0.0.0.0`，Vite 5173 保持 `127.0.0.1`；本機經 LAN IP `curl` HTTPS Guest 200（Windows 信任庫驗證通過，schannel 要 `--ssl-no-revoke`）、`/hand/hand_landmarker.task` 200、`/api/admin/current-run` 經 LAN 403／loopback 200；同一組環境變數用 scratch DB 起 server，log 印出 `HTTPS on port 8453 (all interfaces)` 同 `LAN Guest:` 網址（另有 Hyper-V `172.21.192.1`，script 自己列 iPad 網址時已排除 `vEthernet`）。城市 Chrome 經 loopback WebSocket 連線，畫面顯示「ライブ」。使用者用一部真 iPad 信任 rootCA 後開 `https://192.168.0.196:8443/guest?station=A&hand`：無憑證警告、頁面同手勢游標正常；再喺 scratch DB 由登錄到送出完成一份提案，server 見到 iPad `192.168.0.252` 經 8443 連線，run 變 1 位訪客／`awaiting_exit`，使用者確認大屏幕有反應。真 DB `survey/data/survey.sqlite` 目前 run 仍係舊四題版（2026-09-30 開始，5 位訪客），輪換題組下 iPad 顯示等待重設；冇重設，等 owner 決定。`-Low`（URL 加 `&quality=low`）、`-Kiosk -Low`（全螢幕冇瀏覽器 UI）、`-Local -NoBrowser`（只有 127.0.0.1:5173／8787，冇 8443，LAN IP 連唔到）全部 PASS。B 站、兩部 iPad 同時操作 NOT RUN。已知：城市 `index.html` 係 `lang="en"`，日文 UI 嘅 Chrome 連 kiosk 都會彈 Google 翻譯泡泡；試過 `--disable-features=Translate` 無效已移除，暫時喺展覽 profile 泡泡 ⋮ 揀「英語を翻訳しない」一次；Chrome 被強制結束後下次開會有「復元」泡泡，正常用 Alt+F4 關。
- 2026-11-24 使用者決定展覽用呢部 Windows 手提＋iPhone 熱點連 iPad：重新簽 `survey/data/tls/ipad.pem`，SAN = `172.20.10.2`–`172.20.10.14`（13 個）、`192.168.0.196`、`CHINAM.local`、`localhost`、`127.0.0.1`（同一個 mkcert CA，iPad 唔使重裝；有效至 2029-02-24，冇 commit）。用 scratch DB 喺 8453 起 server，經 `192.168.0.196` 同 `localhost` HTTPS 都 200。真正連 iPhone 熱點 NOT RUN（要 Windows 熱點網絡同樣係 Public／LocalSubnet，防火牆規則已涵蓋）。
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
