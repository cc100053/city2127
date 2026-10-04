# lan-guest-stations — 兩部 iPad 經 LAN 開 Guest A／B

- Owner: cc100053（軟件細修：Claude Code session）
- Status: IN_PROGRESS — 軟件細修已驗證；router／iPad 現場設定及實機 NOT RUN
- Branch: `feat/lan-guest-stations`
- Base commit: `4edf90a97fde8ce0396cf1a637503ebb708aa3a0`
- Last verified commit: `a96b61c59bf4dfbb2da9504ab7a7044214b2d904`（本機 checks＋branch CI PASS）；之後只有本交接 metadata
- Remote availability: `origin/feat/lan-guest-stations`；以 `--no-ff` 整合入 `main`
- GitHub Issue (optional): NONE

## Session Git state

- Session starting branch and HEAD: 乾淨 `main` `4edf90a97fde8ce0396cf1a637503ebb708aa3a0`。
- Last fetched origin/main commit: 同上，2026-10-04 fetch 成功，divergence 0/0。
- Local changes present at session start: NONE。
- Upstream integration status: NOT NEEDED。
- Pending Git conflicts or synchronization blockers: NONE。

## Goal and acceptance criteria

使用者 2026-10-04 決定：兩部 iPad 用 Safari 經專用 LAN 開 `/guest?station=A`／`B`，City 留喺 Mac mini 經 HDMI 出 65 吋屏，取代 [P5](resident-experience-p5.md) 早前「主機直接輸出畫面到 iPad」方案。LAN A/B 模式早已實作及測試（[雙站](archive/two-guest-devices.md)）；本任務只做現場需要嘅細修同設定步驟。完成條件：P5 D0 喺真 router／iPad 通過並留證。

## Architecture

```
專用 Wi-Fi router（WPA2，唔接場館公共網）
 ├─ 網線 ─ Mac mini（固定 IP）
 │          ├─ survey server  0.0.0.0:8787   ← iPad A／B
 │          ├─ Vite City      127.0.0.1:5173 ← 本機，HDMI 主屏
 │          └─ Admin          localhost only（server 已限 loopback）
 ├─ Wi-Fi ─ iPad A  /guest?station=A
 └─ Wi-Fi ─ iPad B  /guest?station=B
```

LAN 冇 guest 身分驗證，所以只用自己控制嘅 router；場館 Wi-Fi 常有 client isolation，iPad 會連唔到主機。

## In-scope files and dependencies

- `survey/src/server/server.ts`：`lanGuestUrls()`；server 綁 `0.0.0.0` 時印出每個外部 IPv4 嘅 A／B 網址，loopback 時唔印。
- `survey/guest.html`：標題由舊「2127 渋谷」改為「2127 お台場の暮らし」；加 `apple-mobile-web-app-capable`／`apple-mobile-web-app-title`，加入主畫面後全螢幕開。
- `survey/src/ui/debug.css`：`touch-action: manipulation`（防雙擊放大）及 `-webkit-text-size-adjust`。Guest／Admin／Monitor 共用，對桌面冇影響。
- `survey/tests/twoStations.test.ts`：`lanGuestUrls` 檢查。
- 文件：README 三語、本交接、[handoff 索引](README.md)、[P5](resident-experience-p5.md) D0 及步驟1。
- 不做：LAN 認證（專用 router 隔離）、開機自動啟動、新依賴／服務、Vite 對外。

## 現場設定步驟（未執行）

### L0 router 及固定 IP（cc100053）
1. 準備專用旅行 router（唔需要上網），5GHz、固定 channel、WPA2 密碼。
2. Mac mini 用網線接 router；router 設 DHCP reservation 固定 IP（例：`192.168.8.10`）。
3. 記錄 router 型號、兩部 iPad 型號／尺寸／iPadOS 版本入 P5 裝置表。

### L2 Mac mini
1. `cd survey && npm ci && npm run build`。
2. 展覽：`SURVEY_HOST=0.0.0.0 SURVEY_DB_PATH=<展覽DB> npm run server`；彩排一律用另一個 scratch `SURVEY_DB_PATH`。
3. 第一次啟動 macOS 防火牆問「允許 node 接收連線」→ 允許。
4. Terminal 會印 `LAN Guest: http://<IP>:8787/guest?station=A`／`B`；IP 要等於 L0 固定 IP。
5. Root：`npm run dev -- --port 5173`（保持 loopback），City 開 `http://127.0.0.1:5173/?survey` 全螢幕放 HDMI 屏。Admin 開 `http://127.0.0.1:8787/admin`。
6. 系統設定：唔瞓機、唔鎖屏、暫停自動更新。

### L3 每部 iPad
1. 只連展覽 router，忘記其他 Wi-Fi。
2. Safari 開 terminal 印出嘅網址（A 機用 `station=A`，B 機用 `station=B`），確認頁頂顯示正確「ステーション A／B」。
3. 分享 →「加入主畫面」，由主畫面圖示開（全螢幕）。主畫面 app 同 Safari 分開儲存草稿，之後只用主畫面圖示。
4. 自動鎖定：永不；固定亮度；開專注模式擋通知。
5. 開 Guided Access（輔助使用 → 引導使用模式），鎖喺 Guest app，停用硬件按鈕。
6. 機身及支架貼「A」「B」標籤。

### L4 驗收
按 [P5](resident-experience-p5.md) D0–D9 執行；呢次係第一次喺真 iPad Safari 測（P2–P4 證據全部係 Chrome）。重點：兩站同時提交、iPad 瞓機／熄 Wi-Fi／router 斷電後草稿保留及同 ID 重試、server 重啟後自動恢復。

## Completed work

上列三個 survey 細修、測試及文件同步。PROJECT／EXHIBITION_SPEC 無需改：模組責任、資料流及產品契約不變，只係 server 多印 log、Guest 頁 meta／CSS。

## Actual validation results

- Verification status: PARTIAL — 軟件 PASS；router／iPad NOT RUN。
- Date and checked tree: 2026-10-04，`feat/lan-guest-stations` commit 前工作樹（base 上述 + 本任務差異）。
- `survey`：`npm test` PASS（含新 `PASS: LAN Guest A/B URLs.`）、`npm run build` PASS、`git diff --check` PASS。Root 冇改動，未重跑。
- 本機 LAN smoke（scratch SQLite，port 8791，`SURVEY_HOST=0.0.0.0`）：terminal 印出 `LAN Guest: http://192.168.0.215:8791/guest?station=A／B`；經 LAN IP 取 Guest 頁標題「2127 お台場の暮らし」及 apple meta 正確；經 LAN IP 取 `/api/admin/current-run` 403，經 loopback 200。
- 內置 browser（Chromium）以 LAN IP 開 `station=A`，viewport 1180×820：頁面渲染「ステーション A」，computed `touch-action: manipulation`。唔代表 iPad Safari／觸控已測。
- Branch CI [37172173768](https://github.com/cc100053/city2127/actions/runs/37172173768) PASS on `a96b61c`。整合後 main CI 結果喺發布回覆提供，唔預先宣稱。
- Hardware／Safari／Wi-Fi 中斷／長跑：NOT RUN。

## Known issues and blockers

- 需要 router 及兩部 iPad 先可以做 L0–L4。
- Wi-Fi 干擾：5GHz 固定 channel；最壞情況 iPad 用 USB-C Ethernet 轉接。
- iPad Safari 背景／瞓機後 WebSocket 及 HTTP 重試只喺 Chrome 驗過。

## Important decisions

- 2026-10-04 使用者選 LAN 方案（取代主機直接輸出畫面到 iPad）。
- City 及 Vite 保持 loopback；只有 survey server 對 LAN 開放。

## Next expected step

cc100053 準備 router 及固定 IP（L0），之後現場操作人按 L2／L3 設定，再做 P5 D0。軟件部分已整合入 main。
