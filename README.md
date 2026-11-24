# Mind craft― 選択の積み重ねでつくる都市 ―

**語言 / Languages / 言語：** [繁體中文](README.md) · [English](README.en.md) · [日本語](README.ja.md)

以 2127 年台場為舞台的展覽作品。觀眾在 iPad 上從九題中回答四題，大屏幕上的城市隨之改變，下一位觀眾接手累積後的城市。本文件為展覽啟動指南；作品內容及規格見[文件索引](docs/README.md)。

## 事前準備

- 展覽電腦（Mac 或 Windows）：Git、Node.js **24 或以上**、支援 WebGL 2 的桌面瀏覽器。
- iPad：與展覽電腦連接同一個可信 LAN，並已安裝及信任 HTTPS 憑證（mkcert 的 `rootCA.pem`，須在 iPadOS「憑證信任設定」啟用完整信任）。
- 首次安裝或 lockfile 更新後，在 repo 根目錄執行 `npm ci`，並在 `survey/` 執行 `npm ci` 及 `npm run fetch:hand-model`。憑證及私鑰放在 `survey/data/tls/`，詳見 [survey 指引](survey/README.md#ipad住民の窓與手勢操作)。

## 1. 啟動兩個伺服器

兩個 terminal 視窗在展覽期間均須保持開啟。

**Terminal 1 — 問卷伺服器**（API、WebSocket、Guest／Admin 頁面及 SQLite 資料）

Mac：

```sh
cd survey
npm run build
SURVEY_HOST=0.0.0.0 \
  SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json \
  SURVEY_TLS_CERT=data/tls/ipad.pem \
  SURVEY_TLS_KEY=data/tls/ipad-key.pem \
  npm run server
```

Windows PowerShell：

```powershell
Set-Location survey
npm run build
$env:SURVEY_HOST='0.0.0.0'
$env:SURVEY_QUESTIONS='src/survey/questions.rotation.v1.json'
$env:SURVEY_TLS_CERT='data/tls/ipad.pem'
$env:SURVEY_TLS_KEY='data/tls/ipad-key.pem'
npm run server
```

`SURVEY_QUESTIONS` 必須指定九題輪換題組，因為伺服器預設仍為已退役的舊題組。啟動後 terminal 會列出 `LAN Guest:` 網址，可供 iPad 使用。

**Terminal 2 — 3D 城市**（在 repo 根目錄執行）

```sh
npm run dev -- --port 5173
```

## 2. 各裝置開啟的網址

| 裝置 | 網址 | 用途 |
| --- | --- | --- |
| 大屏幕（展覽電腦） | `http://127.0.0.1:5173/?survey` | 展示城市；GPU 較弱時加 `&quality=low` |
| iPad A | `https://<展覽電腦 LAN IP>:8443/guest?station=A&hand` | 觀眾答題（手勢及觸控） |
| iPad B | `https://<展覽電腦 LAN IP>:8443/guest?station=B&hand` | 第二個答題站 |
| 工作人員（展覽電腦） | `http://127.0.0.1:8787/admin` | 狀態、重設、撤銷、晝夜設定；只限本機開啟 |
| 監察（可選） | `http://127.0.0.1:8787/monitor` | 以文字檢查狀態及事件 |

只用一部 iPad 時，開啟 `https://<展覽電腦 LAN IP>:8443/guest?hand`。未完成的體驗期間，不可混用單站與 A／B 雙站；同一站亦不要同時開啟多個頁面。網址移除 `hand` 即為純觸控介面。

## 3. 現場操作

- **交接：** 觀眾提交後，iPad 顯示結果及交接頁；下一位按「はじめる」即自動交接，毋須工作人員確認。
- **Admin：** 「未完了の体験を終了」中止未完成的問卷；「直前の提案を取り消す」只可在下一位開始前撤銷最後一份提案；「昼／夜／自動」固定大屏幕時間或恢復晝夜循環。City reset 保留總人數，full reset 歸零但保留歷史。
- **資料：** SQLite 存於 `survey/data/survey.sqlite`，重新啟動會沿用累積的城市。由舊題組轉用輪換題組時，須先在 Admin 重設城市。
- **更新程式後：** 重新執行 Terminal 1 的 build 及啟動指令，然後重新整理大屏幕、iPad 及 Admin。
- **更改伺服器 port（例如 8790）：** 大屏幕網址改為 `http://127.0.0.1:5173/?survey=ws://127.0.0.1:8790/ws`。

## 本機試玩（不用 iPad）

Terminal 1 在 `survey/` 執行 `npm run build`，再執行 `SURVEY_QUESTIONS=src/survey/questions.rotation.v1.json npm run server`；Terminal 2 與上文相同。然後在同一部電腦開啟 `http://127.0.0.1:8787/guest` 答題，並開啟 `http://127.0.0.1:5173/?survey` 觀看城市。只開啟 `http://127.0.0.1:5173/` 則為不接收提案的城市原型。

## 延伸文件

- [展覽規格](docs/EXHIBITION_SPEC.md) · [驗收指引](docs/VALIDATION.md)（展覽機、雙 iPad、長時間運作）· [LAN 雙站設定](docs/handoffs/lan-guest-stations.md)
- 開發者及 AI agent：[AGENTS.md](AGENTS.md) · [程式結構](docs/PROJECT.md) · [文件索引](docs/README.md) · DEV 自動作答見 [survey 指引](survey/README.md)
- `module-swap/` 為保留的 v1 示範，並非展覽城市。
