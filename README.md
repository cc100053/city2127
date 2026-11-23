# Mind craft― 選択の積み重ねでつくる都市 ―

**語言 / Languages / 言語：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

> **2026-11-21：展覽唯一現行版本係九題抽題輪換（9 題 × 3 模型）。** 開新 run 時 survey server 要用 `SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json`（預設仍係舊檔）。

## 作品概念

《Mind craft》以 2127 年嘅台場為舞台。觀眾化身當地居民，每人從九題入面答四題，揀自己想點生活。四個答案都會按題計入「住民の声」。大屏幕聚焦其中一個選擇，有可見變化時就會切換一處設施。同一題累積足夠回答後，觀眾可以喺 iPad 交接頁揭開聲音卡，睇同題揀同一選項嘅居民比例。下一位觀眾會接手當刻嘅城市。大屏幕開場由「街は、誰が決めるのか。」引入住民身份（見 [RESIDENT_COPY](docs/RESIDENT_COPY.md)）。

## 展覽啟動（Mac / Windows）

需要 Git、Node.js **24 或以上**（連 npm），以及支援 WebGL 2 嘅桌面瀏覽器。喺 repo 根目錄執行；每個 terminal tab 要保持開住。首次安裝或 lockfile 更新先跑 `npm ci`。目前係本機展覽流程，未設公開部署。

### Mac：Terminal 開兩個 tab

**Tab 1 — 問卷 server**（API、WebSocket、guest／monitor／admin 頁面，同 SQLite 資料）：

```sh
cd survey
npm ci
npm run build
SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json npm run server
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
$env:SURVEY_QUESTIONS='src/survey/questions.rotation.v1.json'
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

Admin 新增 **直前の提案を取り消す**：只可撤銷最後一份已完成提案，而且必須喺下一位開始前使用。會還原提交前城市同人數，原提案保留並標記撤銷；Guest 可重新開始四題。A/B 新草稿一旦開始，即使稍後中止亦唔會重新開放舊提案 Undo。更新後重新 build／啟動 survey server，再刷新 City／Guest／Admin；Undo 在 schema 6 引入；目前既有 SQLite 自動升至 schema 9，毋須刪除資料。

### iPad「住民の窓」與手勢操作

展覽 iPad 用 Safari 開 `https://<展覽電腦 LAN IP>:8443/guest?hand`。雙站分別用 `/guest?station=A&hand` 同 `/guest?station=B&hand`。前鏡頭需要 iPad 信任嘅 HTTPS 憑證同相機權限。首次設定先喺 `survey/` 執行 `npm run fetch:hand-model`，再 build。完整憑證、輪換題組及啟動設定見 [survey 啟動指引](survey/README.md#ipad住民の窓與手勢操作)。

張開手掌移動游標、預覽卡片，用拇指同食指捏合揀選。送出、開啟地標導覽或返回開始畫面時捏住約 0.8 秒。放低手或握拳可以休止，成個流程亦可用觸控。送出後 iPad 提示抬頭睇大屏幕，交接頁停留喺聲音卡上或用手指按住卡片，即可揭示該題比例。普通 `/guest` 繼續提供原有觸控介面。

### 兩部裝置同時作答

兩部答題裝置用同一個 LAN／同一個 survey server，各開 `http://<展覽電腦 LAN IP>:8787/guest?station=A` 同 `/guest?station=B`。展覽電腦按上方 LAN 指示啟動 server；如果 City 留喺展覽電腦，root Vite 可維持 loopback。每站有獨立草稿、四題、結果同交接，一站完成唔會清掉另一站；server 按收到提交嘅順序累積，重試只計一次。每站同時只接受一個體驗；同一站唔好重複開多個頁面。Server 用 `SURVEY_HOST=0.0.0.0` 啟動時會喺 terminal 印出 `LAN Guest:` A／B 完整網址，照抄去 iPad 即可；iPad／router 現場設定見 [LAN 雙站交接](docs/handoffs/lan-guest-stations.md)。原本 `/guest` 單站流程保留，但未完成體驗期間唔可混用單站／A/B。

城市live結果依記錄順序保留至少13秒觀看時段，動畫仍3秒，標示提案編號同 A/B；排隊嘅 Guest 顯示已保存、等待展示，再顯示自己嘅結果 13 秒。交接頁可選地標導覽。普通 Guest 提供 20 秒，住民の窓按手勢或觸控採用相應倒數。City 重新連接會直接復原最新完整狀態。A/B reset 會暫停新開始，等兩站問卷及結果／交接完成先執行；Admin 可單獨中止 **A／B の未完了の体験を終了**。離線站會喺問卷5分鐘期限，或已提交結果租期（展示開始後 18 秒）結束後釋放；Admin 無須確認離場。City reset 保留總人數，full reset 清零但保留歷史。

更新後重新 build／啟動 survey server，同時刷新 Guest／City／Admin；SQLite 自動升至 schema 9，保留既有城市及歷史。實作及驗證見 [雙裝置交接](docs/handoffs/archive/two-guest-devices.md)。

想單獨睇城市原型，開 `http://127.0.0.1:5173/` 即可，無須 Tab 1；呢個模式唔會接收觀眾提案。`module-swap/` 係保留嘅 v1 因果示範，唔係展覽城市，亦唔接受 v2 CityView。

文件入口：[文件索引](docs/README.md) · [現行展覽規格](docs/EXHIBITION_SPEC.md)。

AI agent 接手入口：[AGENTS.md](AGENTS.md) · [規格與程式結構](docs/PROJECT.md) · [驗收與交接流程](docs/VALIDATION.md) · [現行展覽規格](docs/EXHIBITION_SPEC.md)。

## 現行城市與範圍

展覽唯一城市係 **2127 年台場海濱**。Shibuya 已係舊決策，未來不再開發，亦無場地切換；舊 Plan 01／02 及截圖只作歷史，未完成項目不再當 backlog。

Root `src/` 用 Three.js / WebGL 2 呈現台場地形、地標同 2127 年城市。日夜循環一日 180 秒。展覽城市用 `?survey`，較弱嘅 GPU 可以加 `&quality=low`。展覽配置、地塊同更新時序見 [展覽規格](docs/EXHIBITION_SPEC.md) 同 [輪換模型及地塊](docs/QUESTION_ROTATION_PLAN.md)。

展覽機、雙 iPad、現場閱讀距離同長時間運作見 [驗收指引](docs/VALIDATION.md)。開發入口、原型同已退役版本見 [文件索引](docs/README.md)。
