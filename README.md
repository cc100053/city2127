# 2127 — Frozen Intersection

**語言 / Languages / 言語：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

## 展覽啟動（Mac / Windows）

需要 Git、Node.js **24 或以上**（連 npm），以及支援 WebGL 2 嘅桌面瀏覽器。喺 repo 根目錄執行；每個 terminal tab 要保持開住。首次安裝或 lockfile 更新先跑 `npm ci`。目前係本機展覽流程，未設公開部署。

### 問卷＋隨機建築 QR（整合啟動）

QR 流程用單一 `8787` server 同時供應問卷、共享城市、建築 QR 同每份提案保存嘅 3D 城市。首次先喺 repo 根目錄執行：

```powershell
npm ci
npm ci --prefix survey
npm ci --prefix qr-hud
node scripts/exhibition.mjs build
$env:SURVEY_PUBLIC_URL='http://<展覽電腦 LAN IP>:8787'
node scripts/exhibition.mjs start
```

主畫面開 `http://127.0.0.1:8787/display/?survey`，問卷開 `http://127.0.0.1:8787/guest`。提交後先保留原本城市閱讀時段，再顯示一棟由提案 ID 穩定隨機選出嘅台場建築；建築會轉成可掃描 QR，連去 `/city/<提案 ID>` 保存城市。現有池係富士電視台、Telecom Center、DiverCity Office Tower；同一提案重新整理唔會換建築。手機必須同展覽電腦喺同一可信 LAN，`SURVEY_PUBLIC_URL` 必須用實際 LAN IP，唔可以用手機自己嘅 `127.0.0.1`。

以下雙 terminal 方式仍可用作一般開發，但唔會供應整合 `/qr/` 同 `/city/` 頁面。

### Mac：Terminal 開兩個 tab

**Tab 1 — 問卷 server**（API、WebSocket、guest／monitor／admin 頁面，同 SQLite 資料）：

```sh
cd survey
npm ci
npm run build
npm run server
```

**Tab 2 — 3D 城市**（根目錄 Three.js 場景；另開一個 terminal tab，從 repo 根目錄執行）：

```sh
npm ci
npm run dev -- --port 5173
```

### Windows：PowerShell 開兩個 tab

**Tab 1 — 問卷 server**（由 repo 根目錄開始）：

```powershell
Set-Location survey
npm ci
npm run build
npm run server
```

**Tab 2 — 3D 城市**（另開一個 PowerShell tab，從 repo 根目錄執行）：

```powershell
npm ci
npm run dev -- --port 5173
```

`survey` server 預設喺 `127.0.0.1:8787`，root Vite 預設喺 `127.0.0.1:5173`。如果 Vite 顯示其他 port，城市網址請用 terminal 實際印出嚟嗰個；server port 如有更改，要喺城市網址指定完整 WebSocket URL。

### 瀏覽器要開嘅頁面

| 頁面 / tab | 網址（預設） | 用途 |
| --- | --- | --- |
| Guest（單站） | `http://127.0.0.1:8787/guest` | 觀眾完成四題、核對答案並提交一次提案。 |
| Guest A／B（雙站） | `http://<展覽電腦 LAN IP>:8787/guest?station=A` ／ `?station=B` | 各站獨立答四題，同時提交，共用累積城市。 |
| City | `http://127.0.0.1:5173/?survey` | 展示共同塑造嘅 2127 台場；經 `ws://127.0.0.1:8787/ws` 即時接收變化。展覽城市要用呢個 `?survey` 網址。 |
| Admin | `http://127.0.0.1:8787/admin` | 工作人員睇狀態、中止未完成體驗、要求／取消 reset；只可喺運行 server 嗰部電腦以 localhost 開啟。 |
| Monitor（可選） | `http://127.0.0.1:8787/monitor` | 文字方式檢查目前狀態同開頁後收到嘅提案／WebSocket 事件，唔係 3D 畫面。 |

建議將 City 放展示屏、Guest 放輸入屏、Admin 留喺工作人員電腦。以下交接規則適用於單站 `/guest`；雙站按下方 A/B 說明操作。提案提交後 Guest 照常顯示結果同交接畫面；下一位撳 **はじめる** 就會自動交接，毋須 Admin 確認上一位離開。冇 reset 時會沿用累積城市；如有待執行 reset，會喺下一位開始時套用。Admin 嘅 **未完了の体験を終了** 只用作中止未完成問卷，並執行保留 reset。City 頁面唔需要獨立 host 或 build；Tab 2 嘅 Vite 已供應。Guest／Admin／Monitor 由 Tab 1 嘅 server 同一個 origin 供應，所以 `npm run build` 必須先完成。Admin 嘅 **昼／夜／自動** 可將已連接嘅 City 固定喺 12:00／22:00，或恢復日夜循環；設定會保存，唔影響提案同分數。城市網址若有 `?hour`，該固定時間會優先。更新呢項功能後要重開 survey server（保留原本 SQLite），再刷新 Admin。SQLite 預設寫入 `survey/data/survey.sqlite`；重開 server 會沿用已有城市狀態。

要畀同一個可信 LAN 嘅另一部裝置開 Guest／City：server 用 `SURVEY_HOST=0.0.0.0 npm run server`（PowerShell：`$env:SURVEY_HOST='0.0.0.0'; npm run server`），root 用 `npm run dev -- --host 0.0.0.0 --port 5173`；以 host 電腦嘅 LAN IP 取代網址中嘅 `127.0.0.1`。兩個 port 都要可達；Admin 仍然只限 host 電腦嘅 localhost。預設 loopback 設定只供本機使用，LAN 並無 guest 身分驗證。若 server 改用其他 port，例如 `8790`，City 用 `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8790/ws`。

Admin 新增 **直前の提案を取り消す**：只可撤銷最後一份已完成提案，而且必須喺下一位開始前使用。會還原提交前城市同人數，原提案保留並標記撤銷；Guest 可重新開始四題。A/B 新草稿一旦開始，即使稍後中止亦唔會重新開放舊提案 Undo。更新後重新 build／啟動 survey server，再刷新 City／Guest／Admin；Undo 在 schema 6 引入；目前既有 SQLite 自動升至 schema 7，毋須刪除資料。

### 兩部裝置同時作答（2026-10-02）

兩部答題裝置用同一個 LAN／同一個 survey server，各開 `http://<展覽電腦 LAN IP>:8787/guest?station=A` 同 `/guest?station=B`。展覽電腦按上方 LAN 指示啟動 server；如果 City 留喺展覽電腦，root Vite 可維持 loopback。每站有獨立草稿、四題、結果同交接，一站完成唔會清掉另一站；server 按收到提交嘅順序累積，重試只計一次。每站同時只接受一個體驗；同一站唔好重複開多個頁面。Server 用 `SURVEY_HOST=0.0.0.0` 啟動時會喺 terminal 印出 `LAN Guest:` A／B 完整網址，照抄去 iPad 即可；iPad／router 現場設定見 [LAN 雙站交接](docs/handoffs/lan-guest-stations.md)。原本 `/guest` 單站流程保留，但未完成體驗期間唔可混用單站／A/B。

城市live結果依記錄順序保留至少10秒觀看時段，動畫仍3秒，標示提案編號同 A/B；排隊嘅 Guest 顯示已保存、等待展示，再顯示自己嘅結果10秒／交接5秒。City 重新連接會直接復原最新完整狀態。A/B reset 會暫停新開始，等兩站問卷及結果／交接完成先執行；Admin 可單獨中止 **A／B の未完了の体験を終了**。離線站會喺問卷5分鐘期限，或已提交結果租期（展示開始後15秒）結束後釋放；Admin 無須確認離場。City reset 保留總人數，full reset 清零但保留歷史。

更新後重新 build／啟動 survey server，同時刷新 Guest／City／Admin；SQLite 自動升至 schema 7，保留既有城市及歷史。實作及驗證見 [雙裝置交接](docs/handoffs/archive/two-guest-devices.md)。

想單獨睇城市原型，開 `http://127.0.0.1:5173/` 即可，無須 Tab 1；呢個模式唔會接收觀眾提案。`module-swap/` 係保留嘅 v1 因果示範，唔係展覽城市，亦唔接受 v2 CityView。

文件入口：[文件索引](docs/README.md) · [現行展覽規格](docs/EXHIBITION_SPEC.md)。

AI agent 接手入口：[AGENTS.md](AGENTS.md) · [規格與程式結構](docs/PROJECT.md) · [驗收與交接流程](docs/VALIDATION.md) · [現行展覽規格](docs/EXHIBITION_SPEC.md)。

### 開發用自動答題（DEV-ONLY，2026-09-30）

在 `survey/` 執行 `npm run dev:auto`，再開 `http://127.0.0.1:8788/guest?dev-auto`；城市 Vite 保持開住，連到 `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8788/ws`（Vite port 如不同請替換）。每次啟動建立新的獨立暫存 SQLite，terminal 會印出位置；不改動展覽的 `survey/data/survey.sqlite`，暫存資料保留供檢查。

面板可選全 −1／0／+1、輪替混合、逐 Meter 指定或 seed 隨機，設定提案數並按 **自動回答を開始**。預設 10 份、seed 2127；沿用 Guest 草稿／確認／提交，每題 0.3 秒、結果 10 秒、交接 5 秒後返開始畫面；下一份開始時自動交接。停止或錯誤不再建立下一份；已送出的請求仍會完成，未知結果沿用原本同 ID 重試。一般 `/guest` 不顯示面板。功能只限 localhost，server 必須開 `SURVEY_DEV_AUTO=1`（launcher 已設定）；遇到其他 guest、衝突或待 reset 會停止，不會自動 reset。

**展覽前須移除 DEV-ONLY 控制面板／endpoint／launcher，或另行安排移到 Admin；單站仍沿用已接受的自動交接，毋須恢復舊的離場鎖。** 程式入口與[設計書](docs/EXHIBITION_SPEC.md#開發工具與待完成驗收)已有 `DEV-ONLY` 移除／遷移註記。單獨跑 Meter 測試：`cd survey && npm run test:meters`；完整串接亦已加入 root／survey 的 `npm test`。

## 現行城市與範圍

展覽唯一城市係 **2127 年台場海濱**。Shibuya 已係舊決策，未來不再開發，亦無場地切換；舊 Plan 01／02 及截圖只作歷史，未完成項目不再當 backlog。

Root `src/` 以 Three.js / WebGL 2 載入 Odaiba district 地形、六棟地標 GLB、程序 civic core，以及連接周邊的安靜 backdrop。2127 skyways、潮汐邊緣及六座 waterfront islands 已在現行城市；不再使用早期 150 m 淡出成孤島的版本。四個 Meter 同時改變 focal site 及 district，保留成熟未來的 low／mixed／high，並支援 hybrid、跨軸設施與歷史種子布局。

城市自動日夜循環一日 180 秒；`?hour=22` 可固定時間。鏡頭、共享材質／InstancedMesh、3 秒變化與立即 reset/reconnect 的實作見 [PROJECT](docs/PROJECT.md)。後製包括 MSAA、GTAO、bloom、vignette、output 及 colour grade。

開發時可用 `?meters=nw:high,ne:low`（band 或 −12..12）直接 review v2 layout，console `cityMeters('ne:high')` 睇 live 過渡；`&metersTo=ne:high&metersAge=0.7` 配合 `reviewTime` 截圖。這些工具不提交提案、不改展覽資料。`?asset-preview` 可載入本機 GLB 於原點，重新整理後換另一件；production 沒有 picker。素材標準見 [BLENDER](docs/BLENDER.md)。

S1–S4、Odaiba 換場及 Meter P0–P12 已整合；**S5／展覽硬件、輸入裝置、展覽日 reset／recovery 政策仍待驗收**。各 stage 實測、CI、限制及歷史來源統一由 [VALIDATION](docs/VALIDATION.md) 和 [文件索引](docs/README.md) 連入，不以舊 Shibuya FPS 證明現行效能。

Google Fonts 無法連線時用系統字體；其他 runtime 資源由本機供應。

2026-10-02居民P2：更新後重新build／啟動survey server並刷新Guest／City。四題改用居民日常文案；核對仍在提交前，結果只顯示保存／等待、站號／暮らしの声編號及抬頭提示。City顯示背景／當前設施與保守保存確認。Question-set升至3，既有SQLite及已保存原文保留；舊草稿選「新しい予約で草稿を続ける」接續有效答案，A/B會先結束自己的舊預約。3秒過渡／A-B間隔、result10秒／handoff5秒維持；完整閱讀時段及原因屬P3。見 [P2交接](docs/handoffs/archive/resident-experience-p2.md)。

2026-10-02居民P3：重新build／啟動survey並刷新Guest／City。每份回答保留10秒閱讀（0–3秒身份／位置／城市過渡，3–10秒偏好＋實際結果）；A/B順序展示，等待／提前交接／reset及重試接續原slot。結果比較實際carrier配置，某地點增加不推論全城或人口增加。重連／Undo／reduced motion立即恢復，照明保留有效展示。詳見 [P3交接](docs/handoffs/archive/resident-experience-p3.md)；P4／P5仍待驗收。
